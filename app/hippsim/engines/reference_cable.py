"""Independent numpy/scipy cable engine (reference implementation).

Purpose: cross-check the NEURON backend. Same equations as the Guide's CA1
Morphology Lab (ca1_morph.py): passive membrane + I_h gradient (+ optional
somatic M-current), linearized around rest for impedance.

Units: t ms · V mV · µm · C nF · g µS · I nA · Z MΩ.
g(µS) = gbar(mS/cm²) · area(µm²) · 1e-5.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from .. import kinetics as K
from ..morphology.compartments import Compartments, axial_conductance
from ..morphology.io import APICAL, SOMA


@dataclass
class Densities:
    C: np.ndarray     # nF
    gL: np.ndarray    # µS
    gh: np.ndarray    # µS (max)
    gm: np.ndarray    # µS (max)
    gh_density: np.ndarray  # mS/cm²


def densities(c: Compartments, p: dict) -> Densities:
    A = c.area * 1e-5
    frac = np.clip(c.dist / p["gh_dist"], 0, 1)
    gh = np.where(c.kind == APICAL, p["gh_soma"] * (1 + (p["gh_fold"] - 1) * frac), p["gh_soma"])
    gm = np.where(c.kind == SOMA, p.get("g_m_soma", 0.0), 0.0)
    return Densities(p["Cm"] * A, A / p["Rm"] * 1e3, gh * A, gm * A, gh)


def _laplacian(c: Compartments, gax: np.ndarray) -> sp.csc_matrix:
    """Axial coupling matrix L (µS): (L V)_i = Σ_j gax_ij (V_i − V_j)."""
    i = np.arange(1, c.n)
    j = c.parent[i]
    g = gax[i]
    rows = np.concatenate([i, j, i, j])
    cols = np.concatenate([i, j, j, i])
    vals = np.concatenate([g, g, -g, -g])
    return sp.csc_matrix((vals, (rows, cols)), shape=(c.n, c.n))


class ReferenceCell:
    def __init__(self, comps: Compartments, params: dict):
        self.c, self.p = comps, params
        self.D = densities(comps, params)
        self.Lax = _laplacian(comps, axial_conductance(comps, params["Ra"]))
        self._V0 = None

    def _hkw(self):
        p = self.p
        return dict(kin=p["h_kin"], tau_peak=p["h_tau_peak"], vtau=p["h_vtau"], scale=p["h_tau_scale"])

    # ---------------------------------------------------------- rest
    def rest(self, tol: float = 1e-9, maxit: int = 200) -> np.ndarray:
        """Exact resting potential: fixed point of the steady-state current balance."""
        if self._V0 is not None:
            return self._V0
        p, D = self.p, self.D
        V = np.full(self.c.n, p["E_L"], float)
        for _ in range(maxit):
            hi = K.h_inf(V, p["h_vhalf"], p["h_k"])
            gm = D.gm * K.m_inf(V)
            G = D.gL + D.gh * hi + gm
            b = D.gL * p["E_L"] + D.gh * hi * p["E_h"] + gm * p["E_K"]
            Vn = spla.spsolve((self.Lax + sp.diags(G)).tocsc(), b)
            err = np.abs(Vn - V).max()
            V = 0.5 * V + 0.5 * Vn
            if err < tol:
                break
        self._V0 = V
        return V

    # ---------------------------------------------------- impedance
    def admittance_diag(self, f: float) -> np.ndarray:
        """Quasi-active membrane admittance per compartment (µS), complex."""
        p, D, V = self.p, self.D, self.rest()
        w = 2 * np.pi * f / 1000.0                         # rad/ms
        hi = K.h_inf(V, p["h_vhalf"], p["h_k"])
        dhi = -hi * (1 - hi) / p["h_k"]
        th = K.h_tau(V, **self._hkw())
        y = D.gL + D.gh * hi + 1j * w * D.C + D.gh * (V - p["E_h"]) * dhi / (1 + 1j * w * th)
        if D.gm.any():
            zi = K.m_inf(V)
            dzi = zi * (1 - zi) / 10
            tm = K.m_tau(V, p.get("m_taumax", 1000.0))
            y = y + D.gm * zi + D.gm * (V - p["E_K"]) * dzi / (1 + 1j * w * tm)
        return y

    def impedance(self, freqs, inject: int = 0) -> np.ndarray:
        """Z (MΩ, complex) from current at `inject` to every compartment: shape (n_f, n)."""
        out = np.empty((len(freqs), self.c.n), complex)
        for k, f in enumerate(freqs):
            Y = (self.Lax.astype(complex) + sp.diags(self.admittance_diag(f))).tocsc()
            b = np.zeros(self.c.n, complex)
            b[inject] = 1.0
            out[k] = spla.spsolve(Y, b)
        return out

    def input_impedance_all(self, freqs) -> np.ndarray:
        """Local input impedance |Z_ii| (MΩ) at every compartment: shape (n_f, n)."""
        out = np.empty((len(freqs), self.c.n))
        for k, f in enumerate(freqs):
            Y = (self.Lax.astype(complex) + sp.diags(self.admittance_diag(f))).tocsc()
            lu = spla.splu(Y)
            # diagonal of inverse via solves (n solves, factorized once)
            I = np.eye(self.c.n, dtype=complex)
            out[k] = np.abs(np.diag(lu.solve(I)))
        return out

    def input_resistance(self, site: int = 0) -> float:
        """DC input resistance (MΩ)."""
        return float(abs(self.impedance([1e-6], site)[0, site]))
