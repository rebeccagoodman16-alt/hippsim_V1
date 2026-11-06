"""MorphCell: one object, two engines.

* time domain  → NEURON (lab standard)
* impedance    → reference cable engine (validated against the Guide; NEURON's
                 extended Impedance mis-handles the I_h term, see tests)

Sites are addressed by 3-D position (µm) or the helpers `soma` / `apical(d)`.
"""
from __future__ import annotations

import numpy as np

from ..config import ModelConfig
from ..engines import neuron_cell as nc
from ..engines.reference_cable import ReferenceCell
from ..morphology.compartments import compartmentalize
from ..morphology.io import APICAL, read_swc
from ..paths import MORPH_DIR


class MorphCell:
    def __init__(self, cfg: ModelConfig):
        self.cfg, p = cfg, cfg.params
        self.swc = MORPH_DIR / cfg.meta["morphology"]
        self.morph = read_swc(self.swc)
        self.comps = compartmentalize(self.morph, p["max_seg"], p["soma_diam"], p["spine_factor"], p["spine_start"])
        self._ref = None
        self._nrn = None

    # ------------------------------------------------------------ engines
    @property
    def ref(self) -> ReferenceCell:
        if self._ref is None:
            self._ref = ReferenceCell(self.comps, self.cfg.params)
        return self._ref

    @property
    def nrn(self) -> nc.NeuronCell:
        if self._nrn is None:
            self._nrn = nc.build_cell(self.swc, self.cfg.params)
        return self._nrn

    # -------------------------------------------------------------- sites
    soma = np.zeros(3)

    def apical(self, distance_um: float) -> np.ndarray:
        """xyz of the apical compartment on the main trunk/tuft closest to a path distance."""
        c = self.comps
        idx = np.flatnonzero(c.kind == APICAL)
        k = idx[np.argmin(np.abs(c.dist[idx] - distance_um) - 1e-3 * c.diam[idx])]   # prefer thick (trunk)
        return c.xyz[k]

    def comp_at(self, xyz) -> int:
        return int(np.argmin(np.sum((self.comps.xyz - np.asarray(xyz)) ** 2, axis=1)))

    # ------------------------------------------------------- time domain
    def clamp(self, t, I, site=None, record=None, hold: float = 0.0, dt: float | None = None) -> dict:
        """Inject waveform I (nA) at `site` (xyz), record V at soma + `record` sites."""
        from neuron import h
        cell, p = self.nrn, self.cfg.params
        site = self.soma if site is None else site
        seg = cell.soma(0.5) if np.allclose(site, 0) else cell.seg_near(site)
        stim = h.IClamp(seg)
        stim.delay, stim.dur = 0, 1e9
        tv, iv = h.Vector(np.asarray(t)), h.Vector(np.asarray(I))
        iv.play(stim._ref_amp, tv, True)
        hold_cl = None
        if hold:
            hold_cl = h.IClamp(cell.soma(0.5)); hold_cl.delay, hold_cl.dur, hold_cl.amp = 0, 1e9, hold
        recs = {"soma": cell.soma(0.5), "site": seg}
        for k, xyz in (record or {}).items():
            recs[k] = cell.seg_near(xyz)
        vecs = {k: h.Vector().record(s._ref_v) for k, s in recs.items()}
        tr = h.Vector().record(h._ref_t)
        spk = h.Vector()
        nc_ = h.NetCon(cell.soma(0.5)._ref_v, None, sec=cell.soma)
        nc_.threshold = 0
        nc_.record(spk)
        h.dt = dt or p["dt"]
        nc.steady_state_init(p["E_L"])
        h.continuerun(float(t[-1]))
        out = {"t": np.array(tr), "spikes": np.array(spk)}
        out.update({f"V_{k}": np.array(v) for k, v in vecs.items()})
        del stim, hold_cl, nc_
        return out

    # ------------------------------------------------------ frequency domain
    def impedance(self, freqs, site=None) -> dict:
        """Input Z at site and transfer Z site→soma (MΩ, complex)."""
        k = 0 if site is None else self.comp_at(site)
        Z = self.ref.impedance(np.asarray(freqs, float), inject=k)
        return {"f": np.asarray(freqs, float), "Z_in": Z[:, k], "Z_transfer": Z[:, 0], "comp": k}

    def resonance_map(self, freqs) -> dict:
        """Local resonance frequency and Q = |Z(f_res)|/|Z(f_min)| at every compartment."""
        f = np.asarray(freqs, float)
        Z = self.ref.input_impedance_all(f)
        k = Z.argmax(axis=0)
        return {"f": f, "absZ": Z, "f_res": f[k], "Q": Z[k, np.arange(Z.shape[1])] / Z[0],
                "dist": self.comps.dist, "kind": self.comps.kind, "xyz": self.comps.xyz}
