"""Add published hippocampal reconstructions from ModelDB packages (GitHub mirrors) to hippsim.

    python tools/import_modeldb_morphologies.py <folder with the cloned ModelDB repos>

The repos are cloned beforehand (git clone --depth 1 https://github.com/ModelDBRepository/<id>); the .hoc geometry
is read as text by tools/hoc_geometry.py (nothing in the packages is executed).

For every cell it writes
  morphologies/hippocampal_formation/<region>/<id>.swc      SWC with provenance header
  morphologies/catalog.yaml                                 entry with morphometrics (provenance: modeldb-import)
  site/hs-morph-extra.js                                    the cells for every simulator tool (atlas, studio, circuits)
and a NEURON passive check per cell (same protocol as the Guide's verify.js: Rm 20 kΩ·cm², Ra 150 Ω·cm, Cm 1 µF/cm²,
d_lambda 0.1 at 100 Hz; attenuation, transfer and input impedance at 0 and 100 Hz; 50 pA EPSPs), so the studio's
"Under the hood" panel works for the new cells too.

Conversion: soma sections -> equal-area outline at the origin; tree re-rooted at the soma; apical (pyramidal) or
dendritic (granule cell) centroid rotated to +y, widest spread to x; points thinned to >= 3 µm apart (branch
points, tips and diameter changes > 30 % kept).
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "tools"))
from hoc_geometry import read_hoc                            # noqa: E402
from hippsim.morphology.io import from_guide, write_swc     # noqa: E402

# ------------------------------------------------------------------ sources (DOIs checked Nov 2026)
GOMEZ = dict(modeldb=144450, cite="Gómez González, Mel & Poirazi (2011) Front Comput Neurosci 5:44", doi="10.3389/fncom.2011.00044", pmcid="PMC3214726",
             orig="Pyapali, Sik, Penttonen, Buzsáki & Turner (1998) J Comp Neurol 391:335–352", orig_pmid="9492204",
             note="Tests whether CA1 radial oblique dendrites sum inputs linearly or non-linearly; the answer depends on input timing")
BAKER = dict(modeldb=137259, cite="Baker, Perez-Rosello, Migliore, Barrionuevo & Ascoli (2011) J Comput Neurosci 31:137–158", doi="10.1007/s10827-010-0304-x",
             note="Unitary responses of associational/commissural and perforant-path synapses across many real CA3 pyramidal cells")
SH = dict(modeldb=95960, cite="Schmidt-Hieber, Jonas & Bischofberger (2007) J Neurosci 27:8430–8441", pmid="17670990", pmcid="PMC6673070",
          note="Passive cable models fitted to dual soma–dendrite recordings: strong dendritic attenuation, coincidence detection in the soma")

CA1_LAYER = "Soma in stratum pyramidale; basal dendrites in oriens; apical trunk, obliques and tuft through radiatum to lacunosum-moleculare"
CA3_LAYER = "Soma in stratum pyramidale; proximal apical dendrite in stratum lucidum (mossy-fibre input), then radiatum and lacunosum-moleculare"
GC_LAYER = "Soma in the granule cell layer; dendrites fan out through the molecular layer"

CELLS = []
for n in ["n123", "n125", "n128", "n129"]:          # n130 left out: 64 % of its dendrites are set to 0.2 µm in this package
    CELLS.append(dict(id=f"ca1-{n}", file=f"ModelDBRepository_144450/morphology/nXXX/youngcell/{n}.hoc", src=GOMEZ, kind="pyr", region="CA1",
                      name="CA1 pyramidal cell", code=f"{n} (Pyapali 1998)", layer=CA1_LAYER, species="Rat",
                      how=f"Intracellularly stained and reconstructed by Pyapali et al. (1998), Duke–Southampton archive; this is the copy in the "
                          f"Gómez González et al. (2011) model package, whose authors adjusted some diameters. The short axon in the package is a model "
                          f"initial segment and is hidden here.{' The classic Poirazi et al. (2003) two-layer-model cell.' if n == 'n123' else ''}",
                      role="One of five classic CA1 cells from the same archive: compare oblique branching and tuft size across cells of one type.",
                      dropAxon=True))
CA3 = [("bar-cell2zr", "cell2zr", "Barrionuevo"), ("bar-cell3zr", "cell3zr", "Barrionuevo"), ("bar-cell4zr", "cell4zr", "Barrionuevo"),
       ("bar-cell5zr", "cell5zr", "Barrionuevo"), ("bar-cell6zr", "cell6zr", "Barrionuevo"), ("bar-cell7zr", "cell7zr", "Barrionuevo"),
       ("bar-cell8zr", "cell8zr", "Barrionuevo"), ("tur-l24b", "l24b", "Turner"), ("tur-l51", "l51", "Turner"), ("tur-l56a", "l56a", "Turner"),
       ("ama-c30573", "c30573", "Amaral"), ("ama-c31162", "c31162", "Amaral"), ("ama-c60361", "c60361", "Amaral"),
       ("ama-c62563", "c62563", "Amaral"), ("ama-c73164", "c73164", "Amaral"), ("ama-c81463", "c81463", "Amaral")]
for f, code, lab in CA3:
    CELLS.append(dict(id=f"ca3-{code}", file=f"ModelDBRepository_137259/{f}.CNG.hoc", orient=f"ModelDBRepository_137259/synresp-{f.split('-', 1)[1]}.hoc", src=BAKER, kind="pyr", region="CA3",
                      name="CA3 pyramidal cell", code=f"{code} ({lab} archive)", layer=CA3_LAYER, species="Rat",
                      how=f"Filled and reconstructed in the {lab} lab and standardised by NeuroMorpho.Org (CNG version); this is the copy used by "
                          f"Baker et al. (2011), oriented with the apical axis given in the package. Each dendritic tree is labelled apical or basal by "
                          f"which side of the soma it grows (above or below stratum pyramidale); the traced axon is kept and contour lines drawn in the file are left out.",
                      role="CA3 cells receive mossy fibres from granule cells and recurrent input from other CA3 cells, and send Schaffer collaterals "
                           "to CA1. Sixteen cells from three labs show how much one cell type varies.", archive=lab))
for c in [2, 3, 4, 5, 7, 8, 9]:                               # cell 10 is a duplicate of cell 7; cells 1 and 6 are already in the Guide
    CELLS.append(dict(id=f"gc-sh{c}", file=f"ModelDBRepository_95960/cell_{c}/morpho.hoc", src=SH, kind="gc", region="DG",
                      name="Dentate granule cell", code=f"cell {c} (Schmidt-Hieber)", layer=GC_LAYER, species="Rat",
                      how="Filled with biocytin during whole-cell recording in hippocampal slices, imaged with two-photon / confocal stacks and "
                          "reconstructed in Imaris (Schmidt-Hieber, Jonas & Bischofberger 2007). Section 0 is the soma; any traced axon is the start of the mossy fibre.",
                      role="Measured diameters and a fitted passive cable: compare how strongly perforant-path EPSPs attenuate across granule cells."))

REG_DIR = {"CA1": "ca1", "CA3": "ca3", "DG": "dentate_gyrus"}
REG_NAME = {"CA1": "CA1", "CA3": "CA3", "DG": "Dentate gyrus"}


# ------------------------------------------------------------------ geometry
def section_type(name: str, parent_type: int | None) -> int:
    b = name.split("[")[0].lower()
    if b.startswith("soma"):
        return 1
    if b.startswith("axon"):
        return 2
    if b.startswith(("apic", "trunk", "user5")):
        return 4
    if b.startswith(("dend", "basal")) or b == "section":
        return 3
    return parent_type if parent_type not in (None, 1) else 3


def read_orient(path: Path) -> np.ndarray | None:
    """Apical direction from a Baker et al. synresp-<cell>.hoc parameter file (orientX/Y/Z), read as text."""
    import re
    t = path.read_text(errors="ignore")
    v = [re.search(rf"orient{a}\s*=\s*([-+0-9.eE]+)", t) for a in "XYZ"]
    return np.array([float(m.group(1)) for m in v]) if all(v) else None


def to_guide(secs: list[dict], kind: str, orient: np.ndarray | None = None) -> dict:
    if secs[0]["name"].startswith("section"):                # Schmidt-Hieber: section[0] is the soma
        secs[0]["name"] = "soma[0]"
    types = [0] * len(secs)
    for i, s in enumerate(secs):                             # parents come before children in these files
        pt = types[s["parent"]] if s["parent"] >= 0 else None
        types[i] = section_type(s["name"], pt)
    soma = [i for i, t in enumerate(types) if t == 1]
    sp = np.array([p for i in soma for p in secs[i]["pts"]])
    center = sp[:, :3].mean(0)
    area = 0.0
    for i in soma:
        P = np.array(secs[i]["pts"])
        for a, b in zip(P[:-1], P[1:]):
            r1, r2, L = a[3] / 2, b[3] / 2, np.linalg.norm(b[:3] - a[:3])
            area += math.pi * (r1 + r2) * math.hypot(L, r1 - r2)
    d_eq = math.sqrt(area / math.pi) if area > 0 else 0.0
    dmax = float(sp[:, 3].max())
    if d_eq < 0.5 * dmax:                                    # point-like soma (NeuroMorpho CNG): sphere of the traced diameter
        d_eq = dmax
    # tree without the soma sections, children of any soma section become roots
    kids: dict[int, list[int]] = {}
    for i, s in enumerate(secs):
        kids.setdefault(s["parent"], []).append(i)
    order, newi, out = [], {}, []
    skip = lambda k: types[k] == 1 or secs[k]["name"].startswith("user10")   # user10: layer contour lines drawn in the CNG files, not neurites
    stack = [k for i in soma for k in kids.get(i, []) if not skip(k)][::-1]
    while stack:
        i = stack.pop(); order.append(i)
        stack += [k for k in kids.get(i, []) if not skip(k)][::-1]
    for i in order:
        p = secs[i]["parent"]
        newi[i] = len(out)
        P = np.array(secs[i]["pts"], float)
        if len(P) == 0:
            continue
        out.append([types[i], newi.get(p, -1) if p >= 0 and types[p] != 1 else -1, P[:, :3] - center, P[:, 3] / 2])
    # orientation: apical (or dendritic) centroid to +y, widest spread to x
    want = 4 if kind == "pyr" and any(s[0] == 4 for s in out) else 3
    pts = np.vstack([s[2] for s in out if s[0] == want])
    v = orient if orient is not None else pts.mean(0); v = v / np.linalg.norm(v)
    if orient is not None:                                   # label each dendritic tree by the side of the soma it grows on
        root = []
        for i, sec in enumerate(out):
            root.append(i if sec[1] < 0 else root[sec[1]])
        side = {}
        for i, sec in enumerate(out):
            if sec[0] in (3, 4):
                side.setdefault(root[i], []).append(sec[2] @ v)
        for i, sec in enumerate(out):
            if sec[0] in (3, 4) and root[i] in side:
                sec[0] = 4 if float(np.mean(np.concatenate(side[root[i]]))) > 0 else 3
    y = np.array([0.0, 1.0, 0.0]); ax = np.cross(v, y); s_, c_ = np.linalg.norm(ax), float(v @ y)
    if s_ < 1e-9:
        R = np.eye(3) if c_ > 0 else np.diag([1.0, -1.0, -1.0])
    else:
        k = ax / s_; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        R = np.eye(3) + s_ * K + (1 - c_) * K @ K
    allp = np.vstack([s[2] for s in out]) @ R.T
    xz = allp[:, [0, 2]] - allp[:, [0, 2]].mean(0)
    w, V = np.linalg.eigh(xz.T @ xz); e = V[:, -1]; th = math.atan2(e[1], e[0])
    Ry = np.array([[math.cos(th), 0, math.sin(th)], [0, 1, 0], [-math.sin(th), 0, math.cos(th)]])
    R = Ry @ R
    sections = []
    for t, p, P, r in out:
        P = P @ R.T
        keep = [0]
        for k in range(1, len(P) - 1):
            j = keep[-1]
            if np.linalg.norm(P[k] - P[j]) >= 3.0 or abs(r[k] - r[j]) > 0.3 * max(r[j], 1e-6):
                keep.append(k)
        if len(P) > 1:
            keep.append(len(P) - 1)
        sections.append([t, p, [round(float(x), 1) for x in P[keep].ravel()], [round(max(float(x), 0.05), 2) for x in r[keep]]])
    n, R0 = 16, d_eq / 2
    Rp = R0 * math.sqrt(2 * math.pi / (n * math.sin(2 * math.pi / n)))   # polygon area = π R0²
    outline = [round(v, 1) for a in range(n) for v in (Rp * math.cos(2 * math.pi * a / n), Rp * math.sin(2 * math.pi * a / n))]
    return {"soma": outline, "sections": sections, "soma_diam": d_eq}


def morphometrics(g: dict) -> dict:
    S = g["sections"]; ends = []; L = {2: 0.0, 3: 0.0, 4: 0.0}; area = 0.0; dist = []
    kids = [0] * len(S)
    for t, p, _, _ in S:
        if p >= 0: kids[p] += 1
    allp = []
    for i, (t, p, xyz, r) in enumerate(S):
        P = np.array(xyz).reshape(-1, 3); r = np.array(r)
        prev = np.array(S[p][2][-3:]) if p >= 0 else P[0]
        seg = np.linalg.norm(np.diff(np.vstack([prev, P]), axis=0), axis=1)
        rr = np.concatenate([[r[0]], r])
        L[t] += seg.sum(); area += float((2 * math.pi * (rr[:-1] + rr[1:]) / 2 * seg).sum()) if t != 2 else 0
        d0 = dist[p] if p >= 0 else float(np.linalg.norm(P[0]))
        dist.append(d0 + seg.sum()); allp.append(P)
    dend = [i for i, s in enumerate(S) if s[0] in (3, 4)]
    A = np.vstack(allp)
    return {"dendrite_um": round(L[3] + L[4]), "dend_area_um2": round(area), "branch": sum(1 for i in dend if kids[i] >= 2),
            "tips": sum(1 for i in dend if kids[i] == 0), "maxpath_um": round(max(dist[i] for i in dend)), "apical_um": round(L[4]),
            "basal_um": round(L[3]), "axon_um": round(L[2]), "axon_branch": sum(1 for i, s in enumerate(S) if s[0] == 2 and kids[i] >= 2),
            "extent_um": [round(float(v)) * 1.0 for v in np.ptp(A, axis=0)]}


# ------------------------------------------------------------------ NEURON passive check (verify.js protocol)
def neuron_check(g: dict, drop_axon: bool) -> dict:
    from neuron import h
    h.load_file("stdrun.hoc")
    for s in list(h.allsec()):
        h.delete_section(sec=s)
    S = g["sections"]
    soma = h.Section(name="soma"); soma.L = soma.diam = max(8.0, g["soma_diam"])
    secs = []
    for i, (t, p, xyz, r) in enumerate(S):
        if drop_axon and t == 2:                               # model axon, hidden in the atlas: not simulated either
            secs.append(None); continue
        s = h.Section(name=f"sec{i}"); P = np.array(xyz).reshape(-1, 3); rr = list(r)
        if p >= 0:
            P = np.vstack([np.array(S[p][2][-3:]), P]); rr = [rr[0]] + rr
        if len(P) < 2:
            P = np.vstack([P, P + [0, 0.05, 0]]); rr = rr + rr
        for (x, y, z), ri in zip(P, rr):
            h.pt3dadd(float(x), float(y), float(z), max(0.2, 2 * ri), sec=s)
        s.connect(secs[p](1) if p >= 0 and secs[p] is not None else soma(0.5))   # as the atlas does when it hides an axon
        secs.append(s)
    for s in [soma] + [x for x in secs if x is not None]:
        s.insert("pas"); s.g_pas = 1 / 20000.0; s.e_pas = -65; s.cm = 1; s.Ra = 150
        s.nseg = int((s.L / (0.1 * h.lambda_f(100, sec=s)) + 0.9) / 2) * 2 + 1 if s.L > 1e-3 else 1
    h.distance(0, 0.5, sec=soma)
    imp = {}
    for f in (0, 100):
        z = h.Impedance(); z.loc(0.5, sec=soma); z.compute(f, 1); imp[f] = z
    rin = imp[0].input(0.5, sec=soma)
    sec = {k: [] for k in ["A0", "A100", "Zt0", "Zt100", "Zin0", "Vsoma50", "Vloc50", "tpk"]}
    dpath = []
    tv = h.Vector(np.arange(0, 40.025, 0.025)); tt = tv.as_numpy()
    a = (np.exp(-tt / 3) - np.exp(-tt / 0.3)); a = np.where(tt >= 1, np.concatenate([np.zeros(int(1 / 0.025)), a[: len(tt) - int(1 / 0.025)]]), 0)
    amp = h.Vector(0.05 * a / a.max())                         # 50 pA peak, starts at 1 ms
    h.dt = 0.025; h.tstop = 40; h.celsius = 35
    vs = h.Vector().record(soma(0.5)._ref_v)
    for s in secs:
        x = 0.5
        if s is None:
            for k in sec: sec[k].append(None)
            dpath.append(0.0); continue
        sec["A0"].append(round(imp[0].ratio(x, sec=s), 4)); sec["A100"].append(round(imp[100].ratio(x, sec=s), 4))
        sec["Zt0"].append(round(imp[0].transfer(x, sec=s), 1)); sec["Zt100"].append(round(imp[100].transfer(x, sec=s), 1))
        sec["Zin0"].append(round(imp[0].input(x, sec=s), 1)); dpath.append(h.distance(x, sec=s))
        ic = h.IClamp(s(x)); ic.dur = 1e9; ic.delay = 0; amp.play(ic._ref_amp, tv, 1)
        vl = h.Vector().record(s(x)._ref_v)
        h.finitialize(-65); h.continuerun(40)
        v, w = vs.as_numpy() + 65, vl.as_numpy() + 65
        sec["Vsoma50"].append(round(float(v.max()), 3)); sec["Vloc50"].append(round(float(w.max()), 3))
        sec["tpk"].append(round(float(tt[int(v.argmax())] - 1), 2))
        amp.play_remove(); del ic
    dend = [i for i, s in enumerate(S) if s[0] in (3, 4)]
    d = np.array([dpath[i] for i in dend]); A0 = np.array([sec["A0"][i] for i in dend]); A100 = np.array([sec["A100"][i] for i in dend])
    pick = np.argsort(d)[np.linspace(0, len(d) - 1, min(40, len(d))).astype(int)]
    ds, S0, S100 = d[pick], A0[pick], A100[pick]
    fit = lambda A: float(-np.sum(ds * ds) / np.sum(ds * np.log(np.clip(A, 1e-6, None))))   # log-linear through the origin, as verify.js
    rmse = lambda A, l: round(float(np.sqrt(np.mean((A - np.exp(-ds / l)) ** 2))), 3)
    l0, l100 = fit(S0), fit(S100)
    P = [p for s in S for p in np.array(s[2]).reshape(-1, 3)]
    gaps = sum(1 for t, p, xyz, _ in S if p >= 0 and np.linalg.norm(np.array(xyz[:3]) - np.array(S[p][2][-3:])) > 1)
    diam = np.array([2 * r for s in S if not (drop_axon and s[0] == 2) for r in s[3]])
    L = morphometrics(g)
    return {"lam0": round(l0, 1), "lam100": round(l100, 1), "rmse350": rmse(S0, 350), "rmseFit": rmse(S0, l0), "rmse350_100": rmse(S100, 350),
            "rin": round(rin, 1), "qc": {"sections": len(S), "roots": sum(1 for s in S if s[1] < 0), "points": len(P), "gaps_gt_1um": gaps,
                                         "min_diam": round(float(diam.min()), 2), "n_diam_lt_0_2": int((diam < 0.2).sum()),
                                         "len_axon": L["axon_um"], "len_basal_dend": L["basal_um"], "len_apical": L["apical_um"]},
            "trimmed_at_um": None, "sample": {"d": [round(float(x), 1) for x in d[pick]], "A0": [float(x) for x in A0[pick]], "A100": [float(x) for x in A100[pick]]},
            "sec": sec}


# ------------------------------------------------------------------ main
def main(src: Path) -> None:
    cat_path = ROOT / "morphologies/catalog.yaml"
    cat = yaml.safe_load(cat_path.read_text())
    atlas, morph, nrn, report = [], [], {}, []
    for c in CELLS:
        secs = read_hoc(src / c["file"])
        g = to_guide(secs, c["kind"], read_orient(src / c["orient"]) if c.get("orient") else None)
        mm = morphometrics(g)
        n = neuron_check(g, c.get("dropAxon", False))
        s = c["src"]
        model = [s["cite"], s["modeldb"], s["note"]]
        a = {k: c[k] for k in ["id", "name", "code", "region", "layer", "species", "how", "role"]}
        a.update(group="Pyramidal & principal cells", system="hpf", soma="gc" if c["kind"] == "gc" else "pyr", model=model, added=True)
        if c.get("dropAxon"): a["dropAxon"] = True
        dd = np.array([2 * r for t, _, _, rr in g["sections"] if t in (3, 4) for r in rr])
        a["diamQC"] = {"unique_radii": int(len(np.unique(np.round(dd / 2, 3)))), "measured": bool(len(np.unique(np.round(dd, 2))) >= 8 and (dd <= 0.21).mean() < 0.3),
                       "typical_diam_um": round(float(np.median(dd)), 2)}
        atlas.append(a)
        morph.append({"id": c["id"], "soma": g["soma"], "sections": g["sections"]})
        nrn[c["id"]] = n
        rel = Path("hippocampal_formation") / REG_DIR[c["region"]] / f"{c['id']}.swc"
        m = from_guide({"soma": g["soma"], "sections": g["sections"]}, c["id"])
        write_swc(m, ROOT / "morphologies" / rel, [f"{c['name']} ({c['code']})", f"Species: {c['species']}", f"Source: {s['cite']} · ModelDB {s['modeldb']}",
                                                     f"Original: ModelDB {s['modeldb']} file {c['file'].split('/', 1)[1]} (converted by tools/import_modeldb_morphologies.py)",
                                                     "Units: um. Soma: equal-area 3-point cylinder. Orientation: main dendrite along +y."])
        links = [{"label": "ModelDB", "url": f"https://modeldb.science/{s['modeldb']}"}]
        if s.get("doi"): links.append({"label": "Paper", "url": f"https://doi.org/{s['doi']}"})
        cat["cells"][c["id"]] = {"file": str(rel), "name": c["name"], "code": c["code"], "region": REG_NAME[c["region"]], "system": "Hippocampal formation",
                                 "group": "Pyramidal & principal cells", "layer": c["layer"], "species": c["species"], "how": c["how"], "role": c["role"],
                                 "cite": f"{s['cite']} · ModelDB {s['modeldb']}" + (f" · doi:{s['doi']}" if s.get("doi") else ""), "note": s["note"],
                                 "links": links, "morphometrics": mm, "n_samples": int(m.n), "provenance": "modeldb-import",
                                 "neuron_check": {"rin_MOhm": n["rin"], "lambda0_um": n["lam0"], "lambda100_um": n["lam100"]}}
        if c.get("dropAxon"):
            cat["cells"][c["id"]]["axon_hidden"] = True       # axon in the file was added by the modellers
        if s is GOMEZ:
            cat["cells"][c["id"]]["original"] = f"{s['orig']} · PMID {s['orig_pmid']}"
        report.append((c["id"], mm["dendrite_um"], mm["apical_um"], mm["basal_um"], mm["axon_um"], len(g["sections"]), n["rin"], n["lam0"]))
        print(f"{c['id']:14s} dend {mm['dendrite_um']:6d} µm (apical {mm['apical_um']:5d}, basal {mm['basal_um']:5d}), axon {mm['axon_um']:5d}, "
              f"{len(g['sections']):3d} sections, Rin {n['rin']:6.1f} MΩ, λ0 {n['lam0']:6.1f} µm", flush=True)
    cat["n_cells"] = len(cat["cells"])
    cat_path.write_text(yaml.safe_dump(cat, sort_keys=False, allow_unicode=True, width=140))
    js = ("/* hippsim: more published hippocampal reconstructions (tools/import_modeldb_morphologies.py). Geometry from ModelDB packages,\n"
          "   NEURON passive checks with the same protocol as verify.js. Adds the cells to the atlas and every cell picker. */\n"
          "(function () {\n  const X = " + json.dumps({"atlas": atlas, "morph": morph, "nrn": nrn}, separators=(",", ":"), ensure_ascii=False) + ";\n"
          "  if (typeof HIPPO_MORPH !== 'undefined') HIPPO_MORPH.push(...X.morph);\n"
          "  const A = typeof window.ngAtlasAll === 'function' ? window.ngAtlasAll() : null;   // the atlas list inside modellab.js\n"
          "  if (A && !A.some(m => m.id === X.atlas[0].id)) X.atlas.forEach(m => {   // next to the cells of the same region and kind\n"
          "    let k = -1; A.forEach((a, i) => { if (a.region === m.region && a.soma === m.soma && !a.nmo) k = i; });\n"
          "    A.splice(k < 0 ? A.length : k + 1, 0, m); });\n"
          "  const merge = () => { try { if (typeof NRN_CHECK !== 'undefined') Object.assign(NRN_CHECK, X.nrn); } catch (e) {} };\n"
          "  const add = document.head.appendChild.bind(document.head);   // NEURON checks: merged as soon as verify.js loads, before the page uses it\n"
          "  document.head.appendChild = node => { if (node && node.tagName === 'SCRIPT' && /(^|\\/)verify\\.js$/.test(node.getAttribute('src') || '')) {\n"
          "    const ok = node.onload, bad = node.onerror; node.onload = e => { merge(); if (ok) ok.call(node, e); }; node.onerror = e => { if (bad) bad.call(node, e); }; }\n"
          "    return add(node); };\n"
          "  const FIX = " + json.dumps({k: v["doi"] for k, v in json.loads((ROOT / "tools/doi_corrections.json").read_text()).items() if not k.startswith("_")}) + ";   // tools/doi_corrections.json\n"
          "  const atlasData = window.ngAtlasData;   // corrected DOIs for the Guide's atlas cells, applied as atlasdata.js loads\n"
          "  if (typeof atlasData === 'function') window.ngAtlasData = (atlas, morph) => { (atlas || []).forEach(m => { if (m.ref && FIX[m.ref.doi]) m.ref.doi = FIX[m.ref.doi]; }); return atlasData(atlas, morph); };\n"
          "  merge();\n})();\n")
    (ROOT / "site/hs-morph-extra.js").write_text(js)
    print(f"{len(CELLS)} cells · catalog now {cat['n_cells']} · site/hs-morph-extra.js {len(js) / 1e6:.2f} MB")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
