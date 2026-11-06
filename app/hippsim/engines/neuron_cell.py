"""NEURON backend for morphologically detailed cells.

build_cell(swc, params) → NeuronCell with the same channel layout as the
reference engine. Mechanisms: mechanisms/*.mod (compiled once by
`ensure_mechanisms`).

Units follow NEURON: mV, ms, µm, nA, S/cm² (params are given in mS/cm²).
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from ..paths import MECH_DIR, ROOT

_loaded = False


def ensure_mechanisms() -> None:
    """Compile (if needed) and load mechanisms/*.mod into NEURON."""
    global _loaded
    from neuron import h
    if _loaded or hasattr(h, "hd"):
        _loaded = True
        return
    lib = next(ROOT.glob("*/.libs/libnrnmech.so"), None) or next(ROOT.glob("*/libnrnmech.so"), None)
    if lib is None:
        subprocess.run(["nrnivmodl", str(MECH_DIR)], cwd=ROOT, check=True, capture_output=True)
        lib = next(ROOT.glob("*/.libs/libnrnmech.so"), None) or next(ROOT.glob("*/libnrnmech.so"))
    h.nrn_load_dll(str(lib))
    _loaded = True


@dataclass
class NeuronCell:
    soma: object
    secs: list
    segs: list = field(default_factory=list)        # [(seg, swc_type, path_distance_um)]
    params: dict = field(default_factory=dict)
    _keep: list = field(default_factory=list)

    def seg_near(self, xyz) -> object:
        """Segment whose 3-D midpoint is nearest to xyz (µm)."""
        best, arg = np.inf, None
        for sec in self.secs:
            n3 = int(sec.n3d())
            if n3 == 0:
                continue
            P = np.array([[sec.x3d(k), sec.y3d(k), sec.z3d(k)] for k in range(n3)])
            arc = np.array([sec.arc3d(k) for k in range(n3)])
            for seg in sec:
                s = seg.x * sec.L
                q = np.array([np.interp(s, arc, P[:, c]) for c in range(3)])
                d = np.sum((q - np.asarray(xyz)) ** 2)
                if d < best:
                    best, arg = d, seg
        return arg

    def segs_where(self, swc_type=None, dmin=0.0, dmax=np.inf):
        return [s for s, t, d in self.segs if (swc_type is None or t == swc_type) and dmin <= d <= dmax]


def build_cell(swc: str | Path, p: dict) -> NeuronCell:
    """Instantiate an SWC in NEURON and insert the hippsim channel layout."""
    from neuron import h
    ensure_mechanisms()
    h.load_file("stdrun.hoc")
    h.load_file("import3d.hoc")

    class _Holder:  # Import3d_GUI.instantiate needs an object to attach sections to
        pass
    holder = _Holder()
    r = h.Import3d_SWC_read()
    r.quiet = 1
    r.input(str(swc))
    h.Import3d_GUI(r, False).instantiate(holder)
    soma = holder.soma[0]
    secs = [s for s in (list(getattr(holder, "soma", [])) + list(getattr(holder, "axon", []))
                        + list(getattr(holder, "dend", [])) + list(getattr(holder, "apic", [])))]
    types = {}
    for name, t in (("soma", 1), ("axon", 2), ("dend", 3), ("apic", 4)):
        for s in getattr(holder, name, []):
            types[s.hname()] = t

    if p.get("soma_diam"):
        soma.pt3dclear()
        r0 = p["soma_diam"] / 2
        soma.pt3dadd(0, -r0, 0, p["soma_diam"])
        soma.pt3dadd(0, r0, 0, p["soma_diam"])

    for sec in secs:
        sec.Ra = p["Ra"]
        sec.nseg = 1 if sec == soma else max(1, int(np.ceil(sec.L / p["max_seg"])))
        sec.insert("pas")
        sec.insert("hd")

    # path distance measured from each root section's first point (soma = 0)
    h.distance(0, 0.5, sec=soma)
    def root_offset(sec):
        s = sec
        while True:
            ps = s.trueparentseg()
            if ps is None or ps.sec == soma:
                return h.distance(s(0)) if s != soma else 0.0
            s = ps.sec

    cell = NeuronCell(soma=soma, secs=secs, params=dict(p), _keep=[holder, r])
    for sec in secs:
        t = types.get(sec.hname(), 3)
        off = root_offset(sec)
        if t == 4:
            sec.insert("natm"); sec.insert("kdrtm")
        if sec == soma:
            sec.insert("natm"); sec.insert("kdrtm"); sec.insert("kmp")
            sec.ena, sec.ek = p["E_Na"], p["E_K"]
        if t == 4:
            sec.ena, sec.ek = p["E_Na"], p["E_K"]
        for seg in sec:
            d = 0.0 if sec == soma else max(h.distance(seg) - off, 0.0)
            sf = p["spine_factor"] if d > p["spine_start"] else 1.0
            seg.cm = p["Cm"] * sf
            seg.g_pas = sf / p["Rm"]
            seg.e_pas = p["E_L"]
            frac = min(max(d / p["gh_dist"], 0.0), 1.0)
            gh = p["gh_soma"] * (1 + (p["gh_fold"] - 1) * frac) if t == 4 else p["gh_soma"]
            hd = seg.hd
            hd.ghdbar = gh * 1e-3 * sf
            hd.ehd, hd.vhalfl, hd.kl = p["E_h"], p["h_vhalf"], p["h_k"]
            hd.taupeak, hd.vtau, hd.h_scale = p["h_tau_peak"], p["h_vtau"], p["h_tau_scale"]
            hd.kin = 1 if p["h_kin"] == "lowet2023" else 0
            if hasattr(seg, "natm"):
                near = sec == soma or d < 50
                on = 1.0 if p.get("spikes") else 0.0
                seg.natm.gbar = on * (p["g_na"] if near else p["g_na_dend"]) * 1e-3 * sf
                seg.kdrtm.gbar = on * (p["g_kdr"] if near else 0.4 * p["g_kdr"]) * 1e-3 * sf
                if p.get("legacy_js_kdr") and seg.natm.gbar == 0:
                    # CA1 Morphology Lab JS engine (2026) only updated K_dr where Na⁺ was present, so distal
                    # apical K_dr (0.4 g_kdr) was never applied. True reproduces those older page results.
                    seg.kdrtm.gbar = 0.0
                seg.natm.VT = seg.kdrtm.VT = p["VT"]
            if hasattr(seg, "kmp"):
                seg.kmp.gbar = p.get("g_m_soma", 0.0) * 1e-3
                seg.kmp.taumax = p.get("m_taumax", 1000.0)
            cell.segs.append((seg, 1 if sec == soma else t, d))
    return cell


def steady_state_init(v_init: float, settle_ms: float = 1e10) -> None:
    """finitialize, then jump to steady state with large implicit steps (NEURON custom-init idiom)."""
    from neuron import h
    h.finitialize(v_init)
    h.t = -settle_ms
    dt0 = h.dt
    h.dt = settle_ms / 100
    for _ in range(100):
        h.fadvance()
    h.dt = dt0
    h.t = 0
    h.fcurrent()
    h.frecord_init()
