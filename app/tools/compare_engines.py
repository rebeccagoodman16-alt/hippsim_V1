"""hippsim vs NEURON: the same Hodgkin–Huxley model on the same reconstruction, compared in detail.

    python tools/compare_engines.py ca3-l24b [more ids | --all]

For each cell both engines run the baseline (0.5 nA, 300 ms step at the soma from 50 ms, 400 ms, dt 0.025 ms,
6.3 °C, start at −65 mV) with recordings at the soma, the axon initial segment (axon point nearest 30 µm path
distance, when an axon is traced) and two dendritic sites (apical, else basal, nearest 100 and 300 µm).
Nothing is tuned: both use the published-default parameter set of tools/script_templates (gNa 0.5, gK 0.1 S/cm²
in soma and axon, 2 % in dendrites, Rm 20 kΩ·cm², Ra 150 Ω·cm, Cm 1 µF/cm², ENa 50, EK −77, EL −65 mV).

Reported: setup equivalence (equations, parameters, units, stimulus, temperature, reversal potentials, initial
conditions, time step, integration), morphology and discretization (areas per compartment type, compartments,
soma representation), passive properties (input resistance, membrane time constant), spiking (rest, peak, count,
latency, threshold, max dV/dt), soma Na⁺ / K⁺ currents, the time at which the soma voltages first differ by more
than 1 mV, and diagnostic runs that change one numerical or geometric choice at a time (never a conductance).
Writes site/compare/<shard>.json (traces) and site/compare/index.json (metrics); the Simulate panel shows them.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site/compare"
CAT = yaml.safe_load((ROOT / "morphologies/catalog.yaml").read_text())["cells"]
DT, TSTOP, AMP, T0, T1 = 0.025, 400.0, 0.5, 50.0, 350.0
NSHARD = 8

NEURON_CODE = r'''
import json, sys
from neuron import h
swc, sites, dlam, passive, amp = sys.argv[1], json.loads(sys.argv[2]), float(sys.argv[3]), sys.argv[4] == "1", float(sys.argv[5])
def clean_swc(src, dst):
    rows = {}
    for line in open(src):
        if line.strip() and not line.startswith("#"):
            i, t, x, y, z, rad, p = line.split()[:7]; rows[int(i)] = [int(t), float(x), float(y), float(z), max(float(rad), 0.05), int(p)]
    alias = {}
    for i, (t, x, y, z, rad, p) in rows.items():
        p = alias.get(p, p)
        if p in rows and t != 1 and (x, y, z) == tuple(rows[p][1:4]): alias[i] = p
        rows[i][5] = p
    with open(dst, "w") as f:
        for i, (t, x, y, z, rad, p) in rows.items():
            if i not in alias: f.write(f"{i} {t} {x} {y} {z} {rad} {p}\n")
    return dst
h.load_file("stdrun.hoc"); h.load_file("import3d.hoc")
r = h.Import3d_SWC_read(); r.input(clean_swc(swc, "clean.swc")); h.Import3d_GUI(r, False).instantiate(None)
soma = h.soma[0]
for s in h.allsec():
    s.cm = 1; s.Ra = 150
    s.nseg = 1 if s.L < 1e-3 else int((s.L / (dlam * h.lambda_f(100, sec=s)) + 0.9) / 2) * 2 + 1
    s.insert("hh")
    f = 1.0 if s.name().startswith(("soma", "axon")) else 0.02
    for seg in s:
        seg.hh.gnabar, seg.hh.gkbar, seg.hh.gl, seg.hh.el = (0 if passive else 0.5 * f), (0 if passive else 0.1 * f), 1 / 20000, -65
def nearest(xyz):
    best = (1e18, soma, 0.5)
    for s in h.allsec():
        for i in range(s.n3d()):
            d = (s.x3d(i) - xyz[0]) ** 2 + (s.y3d(i) - xyz[1]) ** 2 + (s.z3d(i) - xyz[2]) ** 2
            if d < best[0]: best = (d, s, s.arc3d(i) / s.L if s.L else 0.5)
    return best[1](min(max(best[2], 0), 1)), best[0] ** 0.5
segs = {k: (soma(0.5), 0.0) if v is None else nearest(v) for k, v in sites.items()}
stim = h.IClamp(soma(0.5)); stim.delay, stim.dur, stim.amp = 50, 300, amp
t = h.Vector().record(h._ref_t)
rec = {k: h.Vector().record(sg._ref_v) for k, (sg, _) in segs.items()}
ina = h.Vector().record(soma(0.5)._ref_ina); ik = h.Vector().record(soma(0.5)._ref_ik)
h.celsius = 6.3; h.dt = 0.025; h.steps_per_ms = 40; h.finitialize(-65); h.continuerun(400)
area = {"soma": 0, "axon": 0, "dend": 0, "apic": 0}; nseg = 0; L = dict(area)
for s in h.allsec():
    k = s.name().split("[")[0]; k = k if k in area else "dend"
    L[k] += s.L; nseg += s.nseg
    for seg in s: area[k] += seg.area()
sa = soma(0.5).area()
# NEURON's own geometry after Import3d, written back as SWC (soma as 3 points, each section's 3-D points chained to its parent)
geo, idmap, nid = [], {}, 0
def tcode(s): k = s.name().split("[")[0]; return {"soma": 1, "axon": 2, "dend": 3, "apic": 4}.get(k, 3)
rs = (soma.diam / 2)
geo += [[1, 1, soma.x3d(0) if soma.n3d() else 0, 0, 0, rs, -1]]
cx = sum(soma.x3d(i) for i in range(soma.n3d())) / max(1, soma.n3d()); cy = sum(soma.y3d(i) for i in range(soma.n3d())) / max(1, soma.n3d()); cz = sum(soma.z3d(i) for i in range(soma.n3d())) / max(1, soma.n3d())
geo = [[1, 1, cx, cy, cz, rs, -1], [2, 1, cx, cy - rs, cz, rs, 1], [3, 1, cx, cy + rs, cz, rs, 1]]; nid = 3
order = []
def walk(s0):
    for c in s0.children(): order.append(c); walk(c)
walk(soma)
for s in order:
    ps = s.parentseg().sec; par = 1 if ps == soma else idmap[ps.name()]
    for i in range(s.n3d()):
        nid += 1; geo.append([nid, tcode(s), s.x3d(i), s.y3d(i), s.z3d(i), s.diam3d(i) / 2, par]); par = nid
    idmap[s.name()] = par
open("neuron_geom.swc", "w").write("".join(f"{a} {b} {c:.4f} {d:.4f} {e:.4f} {f:.4f} {g}\n" for a, b, c, d, e, f, g in geo))
out = {"t": list(t), "v": {k: list(v) for k, v in rec.items()}, "ina": [x * sa * 1e-2 for x in ina], "ik": [x * sa * 1e-2 for x in ik],
       "area": area, "length": L, "ncomp": nseg, "nsec": len(list(h.allsec())),
       "soma": {"L": soma.L, "diam": soma.diam, "area_seg": sa, "n3d": soma.n3d(), "nseg": soma.nseg},
       "site_err": {k: d for k, (_, d) in segs.items()}, "sites": {k: str(sg) for k, (sg, _) in segs.items()},
       "method": {"secondorder": int(h.secondorder), "cvode": int(h.CVode().active()), "dt": h.dt}, "geom_swc": open("neuron_geom.swc").read()}
print("JSON" + json.dumps(out))
'''

HIPPSIM_CODE = r'''
require(process.argv[2]); const fs = require('fs');
const swc = process.argv[3], sites = JSON.parse(process.argv[4]), opt = JSON.parse(process.argv[5]), passive = process.argv[6] === '1', amp = +process.argv[7];
const P = [], idx = {};
fs.readFileSync(swc, 'utf8').split('\n').forEach(l => { if (!l.trim() || l[0] === '#') return; const a = l.trim().split(/\s+/).map(Number); if (a.length < 7) return; idx[a[0]] = P.length; P.push([a[2], a[3], a[4], a[5], a[1], a[6]]); });
P.forEach(p => p[5] = p[5] in idx ? idx[p[5]] : -1);
const M = HSCable.build(P, opt), site = {};
for (const [k, pt] of Object.entries(sites)) site[k] = pt == null ? 0 : M.nodeOf[pt];
const r = M.run({amp, delay: 50, dur: 300, tstop: 400, dt: 0.025, recDt: 0.025, currents: true, na: passive ? 0 : 1, k: passive ? 0 : 1, rec: Object.values(site)});
const area = {soma: 0, axon: 0, dend: 0, apic: 0}, L = {soma: 0, axon: 0, dend: 0, apic: 0}, key = t => t === 1 ? 'soma' : t === 2 ? 'axon' : t === 4 ? 'apic' : 'dend';
for (let i = 0; i < M.N; i++) area[key(M.type[i])] += M.area[i] * 1e8;
const v = {}; for (const [k, nd] of Object.entries(site)) v[k] = r.rec[nd];
console.log('JSON' + JSON.stringify({t: r.t, v, ina: r.iNa, ik: r.iK, area, ncomp: M.N, soma: {area_seg: M.area[0] * 1e8}, sites: site}));
'''


def load_swc(path):
    rows, idx = [], {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.startswith("#"): continue
        a = line.split()
        if len(a) < 7: continue
        idx[int(a[0])] = len(rows); rows.append([float(a[2]), float(a[3]), float(a[4]), float(a[5]), int(a[1]), int(a[6])])
    for r in rows: r[5] = idx.get(r[5], -1)
    return rows


def pick_sites(P):
    d = [0.0] * len(P)
    for i, p in enumerate(P):
        q = p[5]
        if q >= 0: d[i] = d[q] + (0 if p[4] == 1 else float(np.linalg.norm(np.subtract(p[:3], P[q][:3]))))
    def near(types, target):
        c = [i for i, p in enumerate(P) if p[4] in types]
        return min(c, key=lambda i: abs(d[i] - target)) if c else None
    apical = any(p[4] == 4 for p in P)
    s = {"soma": None, "ais": near((2,), 30), "dend100": near((4,) if apical else (3,), 100), "dend300": near((4,) if apical else (3,), 300)}
    meta = {k: (None if i is None else {"point": i, "path_um": round(d[i], 1), "type": P[i][4]}) for k, i in s.items()}
    return {k: v for k, v in s.items() if k == "soma" or v is not None}, meta, d


def run_neuron(swc, sites_xyz, dlam=0.1, passive=False, amp=AMP):
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp) / "n.py").write_text(NEURON_CODE)
        p = subprocess.run([sys.executable, "n.py", str(swc), json.dumps(sites_xyz), str(dlam), "1" if passive else "0", str(amp)], cwd=tmp, capture_output=True, text=True, timeout=1800)
    line = next((l for l in p.stdout.splitlines() if l.startswith("JSON")), None)
    if not line: raise RuntimeError(p.stderr[-500:])
    return json.loads(line[4:])


def run_hippsim(swc, sites_pts, opt=None, passive=False, amp=AMP):
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp) / "h.js").write_text(HIPPSIM_CODE)
        p = subprocess.run(["node", "h.js", str(ROOT / "site/hs-cable.js"), str(swc), json.dumps(sites_pts), json.dumps(opt or {}), "1" if passive else "0", str(amp)], cwd=tmp, capture_output=True, text=True, timeout=1800)
    line = next((l for l in p.stdout.splitlines() if l.startswith("JSON")), None)
    if not line: raise RuntimeError(p.stderr[-500:])
    return json.loads(line[4:])


def spike_metrics(t, v):
    t, v = np.asarray(t), np.asarray(v)
    dv = np.gradient(v, t)
    win = (t >= T0) & (t < T1)
    up = np.where((v[:-1] < 0) & (v[1:] >= 0))[0] + 1
    sp = [float(t[i]) for i in up if T0 <= t[i] < T1]
    thr = None
    if sp:
        k0 = int(np.searchsorted(t, T0)); k1 = int(np.searchsorted(t, sp[0]))
        k = k1                                                      # threshold: walk back from the first 0 mV crossing to where dV/dt last
        while k > k0 and dv[k - 1] > 10: k -= 1                     # rose above 10 mV/ms (avoids the charging jump at stimulus onset)
        thr = float(v[k])
    return {"rest_mV": float(v[int(np.searchsorted(t, T0 - 1))]), "peak_mV": float(v[win].max()), "spikes": len(sp),
            "latency_ms": (sp[0] - T0) if sp else None, "threshold_mV": thr, "max_dVdt": float(dv[win & (t >= T0 + 0.5)].max()),   # skip the 0.5 ms charging jump at onset
            "v_end_mV": float(v[int(np.searchsorted(t, T1 - 1))])}


def passive_props(t, v, amp):
    t, v = np.asarray(t), np.asarray(v)
    v0, vss = v[int(np.searchsorted(t, T0 - 1))], v[int(np.searchsorted(t, T1 - 1))]
    rin = (vss - v0) / amp                                           # MΩ (mV / nA)
    k0 = int(np.searchsorted(t, T0)); target = v0 + 0.632 * (vss - v0)
    k = k0 + int(np.argmax((v[k0:] - target) * np.sign(vss - v0) >= 0))
    return {"rin_MOhm": float(rin), "tau_ms": float(t[k] - T0), "v0": float(v0)}


def compare(cid):
    c = CAT[cid]; swc = ROOT / "morphologies" / c["file"]; P = load_swc(swc)
    sites, meta, _ = pick_sites(P)
    xyz = {k: (None if i is None else P[i][:3]) for k, i in sites.items()}
    N = run_neuron(swc, xyz); Hs = run_hippsim(swc, sites)
    tN, tH = np.asarray(N["t"]), np.asarray(Hs["t"])
    n = min(len(tN), len(tH)); t = tN[:n]
    res = {"id": cid, "name": c.get("name"), "code": c.get("code"), "sites": meta, "site_match_um": N["site_err"]}
    res["metrics"] = {eng: {k: spike_metrics(t, np.asarray(R["v"][k])[:n]) for k in sites} for eng, R in (("neuron", N), ("hippsim", Hs))}
    res["currents"] = {eng: {"ina_min_nA": float(np.min(R["ina"][:n])), "ik_max_nA": float(np.max(R["ik"][:n]))} for eng, R in (("neuron", N), ("hippsim", Hs))}
    dv = np.abs(np.asarray(N["v"]["soma"])[:n] - np.asarray(Hs["v"]["soma"])[:n])
    k = int(np.argmax(dv > 1.0)) if (dv > 1.0).any() else None
    res["diverge"] = {"t_ms": float(t[k]) if k is not None else None, "max_abs_dV_mV": float(dv.max()), "t_max_ms": float(t[int(np.argmax(dv))]),
                      "v_neuron_at": float(N["v"]["soma"][k]) if k is not None else None, "v_hippsim_at": float(Hs["v"]["soma"][k]) if k is not None else None,
                      "before_stim": bool(k is not None and t[k] < T0)}
    # soma–dendrite junction: membrane hippsim's default places between the soma centre and each attached branch's first point
    soma_pts = [i for i, p in enumerate(P) if p[4] == 1]; cen = np.mean([P[i][:3] for i in soma_pts], axis=0) if soma_pts else np.zeros(3)
    kids = [p for p in P if p[5] >= 0 and P[p[5]][4] == 1 and p[4] != 1]
    res["junction"] = {"branches": len(kids), "area_um2": float(sum(2 * np.pi * p[3] * np.linalg.norm(np.subtract(p[:3], P[p[5]][:3])) for p in kids)),
                       "first_radius_um": [round(p[3], 2) for p in kids], "inside_soma": sum(1 for p in kids if np.linalg.norm(np.subtract(p[:3], cen)) < max((P[i][3] for i in soma_pts), default=0))}
    res["morphology"] = {
        "neuron": {"area_um2": N["area"], "length_um": N["length"], "compartments": N["ncomp"], "sections": N["nsec"], "soma": N["soma"]},
        "hippsim": {"area_um2": Hs["area"], "compartments": Hs["ncomp"], "soma": Hs["soma"]}}
    # passive properties (channels off: leak only), −0.05 nA
    pN, pH = run_neuron(swc, xyz, passive=True, amp=-0.05), run_hippsim(swc, sites, passive=True, amp=-0.05)
    res["passive"] = {"neuron": passive_props(pN["t"], pN["v"]["soma"], -0.05), "hippsim": passive_props(pH["t"], pH["v"]["soma"], -0.05)}
    # diagnostics: one numerical / geometric choice changed at a time, conductances untouched
    diag = []
    def count(R): return spike_metrics(np.asarray(R["t"]), np.asarray(R["v"]["soma"]))
    diag.append({"run": "hippsim, compartments ≤ 5 µm (finer)", **count(run_hippsim(swc, sites, {"Lmax": 5}))})
    diag.append({"run": "hippsim, soma area = NEURON's soma area", **count(run_hippsim(swc, sites, {"somaArea": N["soma"]["area_seg"]}))})
    diag.append({"run": "hippsim, both", **count(run_hippsim(swc, sites, {"Lmax": 5, "somaArea": N["soma"]["area_seg"]}))})
    diag.append({"run": "NEURON, d_lambda 0.02 (finer)", **count(run_neuron(swc, xyz, dlam=0.02))})
    R = run_hippsim(swc, {"soma": None}, {"somaJoin": "neuron"})
    diag.append({"run": "hippsim, dendrites joined at the soma as in NEURON (no membrane from the soma centre to the first point)", **count(R), "area_um2": {k: round(v) for k, v in R["area"].items()}})
    with tempfile.TemporaryDirectory() as tmp:
        cs = Path(tmp) / "clean.swc"; clean_swc(swc, cs)
        ng = Path(tmp) / "ngeom.swc"; ng.write_text(N["geom_swc"])
        for label, f in (("hippsim on the cleaned SWC (zero-length points dropped, as NEURON's script does)", cs), ("hippsim on NEURON's geometry after Import3d", ng)):
            R = run_hippsim(f, {"soma": None}); diag.append({"run": label, **count(R), "area_um2": {k: round(v) for k, v in R["area"].items()}})
    res["diagnostics"] = diag
    res["setup"] = [
        ["Equations", "Cable equation + Hodgkin–Huxley Na⁺/K⁺ + leak", "Cable equation + hh.mod (Hodgkin–Huxley Na⁺/K⁺ + leak)", True],
        ["gNa, gK (soma, axon)", "0.5, 0.1 S/cm²", "0.5, 0.1 S/cm²", True],
        ["Dendrites", "2 % of soma density", "2 % of soma density", True],
        ["Leak", "1/20 000 S/cm², E_L −65 mV", "gl 1/20 000 S/cm², el −65 mV", True],
        ["Reversal potentials", "E_Na 50, E_K −77 mV", "ena 50, ek −77 mV (hh.mod defaults)", True],
        ["Passive", "R_a 150 Ω·cm, C_m 1 µF/cm²", "Ra 150 Ω·cm, cm 1 µF/cm²", True],
        ["Temperature", "6.3 °C (rates × 3^((T−6.3)/10))", "celsius 6.3", True],
        ["Stimulus", "0.5 nA, 50–350 ms, soma", "IClamp 0.5 nA, delay 50, dur 300, soma(0.5)", True],
        ["Initial conditions", "V −65 mV, gates at steady state", "finitialize(−65): gates at steady state", True],
        ["Time step", "0.025 ms fixed", f"{N['method']['dt']} ms fixed (CVode {'on' if N['method']['cvode'] else 'off'})", not N["method"]["cvode"]],
        ["Integration", "Backward Euler (voltage, Hines); exponential Euler (gates, at the old voltage)",
         f"Backward Euler (secondorder={N['method']['secondorder']}); hh.mod gates by cnexp, staggered half a step", False],
        ["Soma", f"one compartment, area of a sphere with the largest traced radius ({Hs['soma']['area_seg']:.0f} µm²)",
         f"Import3d soma section L {N['soma']['L']:.1f} µm, diam {N['soma']['diam']:.1f} µm, {N['soma']['nseg']} segment(s), soma(0.5) area {N['soma']['area_seg']:.0f} µm²",
         abs(Hs['soma']['area_seg'] - N['soma']['area_seg']) / max(1, N['soma']['area_seg']) < 0.05],
        ["Discretization", f"{Hs['ncomp']} compartments, ≤ 20 µm along unbranched paths", f"{N['ncomp']} segments, d_lambda 0.1 at 100 Hz, odd nseg", False],
        ["Zero-length points", "kept (zero-area compartments merged)", "dropped before Import3d (clean_swc)", False],
    ]
    traces = {"t": [round(x, 3) for x in t[::8]], "neuron": {k: [round(x, 2) for x in N["v"][k][:n:8]] for k in sites},
              "hippsim": {k: [round(x, 2) for x in Hs["v"][k][:n:8]] for k in sites},
              "ina": {"neuron": [round(x, 3) for x in N["ina"][:n:8]], "hippsim": [round(x, 3) for x in Hs["ina"][:n:8]]},
              "ik": {"neuron": [round(x, 3) for x in N["ik"][:n:8]], "hippsim": [round(x, 3) for x in Hs["ik"][:n:8]]}}
    return res, traces


def clean_swc(src, dst):
    """The NEURON / Brian2 scripts' cleaning: drop points that sit exactly on their parent, radii ≥ 0.05 µm."""
    rows = {}
    for line in Path(src).read_text().splitlines():
        if line.strip() and not line.startswith("#"):
            i, t, x, y, z, rad, p = line.split()[:7]; rows[int(i)] = [int(t), float(x), float(y), float(z), max(float(rad), 0.05), int(p)]
    alias = {}
    for i, (t, x, y, z, rad, p) in rows.items():
        p = alias.get(p, p)
        if p in rows and t != 1 and (x, y, z) == tuple(rows[p][1:4]): alias[i] = p
        rows[i][5] = p
    Path(dst).write_text("".join(f"{i} {t} {x} {y} {z} {rad} {p}\n" for i, (t, x, y, z, rad, p) in rows.items() if i not in alias))


def shard(cid): return zlib.crc32(cid.encode()) % NSHARD


def main():
    ids = list(CAT) if "--all" in sys.argv else [a for a in sys.argv[1:] if not a.startswith("--")]
    OUT.mkdir(exist_ok=True)
    idx_f = OUT / "index.json"; index = json.loads(idx_f.read_text()) if idx_f.exists() else {}
    shards = {}
    for cid in ids:
        res, tr = compare(cid)
        index[cid] = res; res["shard"] = shard(cid)
        s = shard(cid); f = OUT / f"traces-{s}.json"
        if s not in shards: shards[s] = json.loads(f.read_text()) if f.exists() else {}
        shards[s][cid] = tr
        m = res["metrics"]
        print(cid, "spikes N/H", m["neuron"]["soma"]["spikes"], m["hippsim"]["soma"]["spikes"], "| diverge", res["diverge"]["t_ms"], "| Rin N/H",
              round(res["passive"]["neuron"]["rin_MOhm"], 1), round(res["passive"]["hippsim"]["rin_MOhm"], 1), "| diag", [d["spikes"] for d in res["diagnostics"]], [d.get("area_um2") for d in res["diagnostics"][-3:]], flush=True)
        idx_f.write_text(json.dumps(index, separators=(",", ":")))
        for s2, data in shards.items(): (OUT / f"traces-{s2}.json").write_text(json.dumps(data, separators=(",", ":")))


if __name__ == "__main__":
    main()
