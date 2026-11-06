"""Section tree + compartmentalization of an SWC morphology.

A *section* is an unbranched chain of samples between branch points (NEURON's
definition). Each section is cut into `nseg` equal compartments with
nseg = ceil(L / max_seg); diameter = mean of 5 interpolated diameters.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .io import SOMA, Morphology


@dataclass
class Section:
    rows: list[int]          # sample rows, first row = attachment point (parent's end, or soma)
    parent: int              # parent section index (−1 = soma)
    swc_type: int


def sections(m: Morphology) -> list[Section]:
    """Split the non-soma part of the tree into unbranched sections (parent before child)."""
    prow = m.parent_rows()
    children: dict[int, list[int]] = {}
    for k, p in enumerate(prow):
        children.setdefault(int(p), []).append(k)
    soma_rows = set(np.flatnonzero(m.types == SOMA).tolist())
    out: list[Section] = []

    stack = []                                    # (first row, attach row, parent section)
    for s in sorted(soma_rows):
        for c in children.get(s, []):
            if c not in soma_rows:
                stack.append((c, s, -1))
    stack.reverse()
    while stack:
        first, attach, psec = stack.pop()
        rows = [attach, first]
        cur = first
        while len(children.get(cur, [])) == 1:
            cur = children[cur][0]
            rows.append(cur)
        out.append(Section(rows, psec, int(m.types[first])))
        me = len(out) - 1
        for c in reversed(children.get(cur, [])):
            stack.append((c, cur, me))
    return out


@dataclass
class Compartments:
    """Flat compartment tree; parent index < child index; compartment 0 = soma."""
    parent: np.ndarray       # int
    length: np.ndarray       # µm
    diam: np.ndarray         # µm
    area: np.ndarray         # µm², incl. spine factor
    dist: np.ndarray         # path distance of midpoint from soma, µm
    kind: np.ndarray         # SWC type
    xyz: np.ndarray          # midpoint, µm
    sec_index: np.ndarray    # owning section (−1 = soma)

    @property
    def n(self) -> int:
        return len(self.parent)


def compartmentalize(m: Morphology, max_seg: float = 20.0, soma_diam: float | None = 20.0,
                     spine_factor: float = 2.0, spine_start: float = 100.0) -> Compartments:
    rs = soma_diam / 2 if soma_diam else m.soma_radius()
    par, L, d, A, dist, kind, xyz, own = [-1], [2 * rs], [2 * rs], [4 * np.pi * rs * rs], [0.0], [SOMA], [[0, 0, 0]], [-1]
    secs = sections(m)
    sec_last, sec_end = [], []
    for si, s in enumerate(secs):
        # Drop the attachment sample when the section's own geometry starts elsewhere:
        # root sections start at their first traced point (not the soma centre), and child
        # sections that repeat the branch point carry their own start radius.
        a, f = s.rows[0], s.rows[1]
        drop = len(s.rows) > 2 and (s.parent < 0 or np.allclose(m.xyz[a], m.xyz[f]))
        rows = s.rows[1:] if drop else s.rows
        P = m.xyz[rows]
        R = m.r[rows].copy()
        if s.parent < 0 and not drop:
            R[0] = R[1]                            # never borrow the soma radius
        cum = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        Ls = max(cum[-1], 1e-3)
        nseg = max(1, int(np.ceil(Ls / max_seg)))
        prev = 0 if s.parent < 0 else sec_last[s.parent]
        d0 = 0.0 if s.parent < 0 else sec_end[s.parent]
        for q in range(nseg):
            a, b = Ls * q / nseg, Ls * (q + 1) / nseg
            dk = 2 * np.interp(np.linspace(a, b, 5), cum, R).mean()
            mid = 0.5 * (a + b)
            dd = d0 + mid
            sf = spine_factor if dd > spine_start else 1.0
            par.append(prev); L.append(b - a); d.append(dk); A.append(np.pi * dk * (b - a) * sf)
            dist.append(dd); kind.append(s.swc_type); own.append(si)
            xyz.append([np.interp(mid, cum, P[:, c]) for c in range(3)])
            prev = len(par) - 1
        sec_last.append(prev); sec_end.append(d0 + Ls)
    return Compartments(np.array(par), np.array(L), np.array(d), np.array(A), np.array(dist),
                        np.array(kind), np.array(xyz), np.array(own))


def axial_conductance(c: Compartments, Ra: float) -> np.ndarray:
    """gax[i] (µS) between compartment i and its parent; half-compartment resistances in series."""
    half = np.where(np.arange(c.n) == 0, 0.0,
                    Ra * (c.length * 1e-4 / 2) / (np.pi * (c.diam * 1e-4 / 2) ** 2))   # Ω
    g = np.zeros(c.n)
    i = np.arange(1, c.n)
    g[1:] = 1e6 / (half[i] + half[c.parent[i]])
    return g


def electrotonic_length_constant(diam_um: float, Rm: float, Ra: float) -> float:
    """DC space constant λ (µm) = sqrt(d·Rm / 4Ra)."""
    return float(np.sqrt(diam_um * 1e-4 * Rm / (4 * Ra)) * 1e4)


def lambda_f(diam_um: float, Ra: float, Cm: float, f: float = 100.0) -> float:
    """AC length constant λ_f (µm) used by NEURON's d_lambda rule."""
    return float(1e5 * np.sqrt(diam_um / (4 * np.pi * f * Ra * Cm)))
