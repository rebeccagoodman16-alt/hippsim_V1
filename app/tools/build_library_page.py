"""Build site/index.html: the hippsim library page (published as a claude.ai artifact).

Embeds the morphology catalog, source manifest and file index; every listed file is published next to the
page so the viewer can open it.   python tools/build_library_page.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import sys
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"

PUBLISH_DIRS = ["hippsim", "mechanisms", "models", "tools", "morphologies", "sources/extracted"]
PUBLISH_FILES = ["README.md", "CHANGELOG.md", "docs/ACCOUNTS.md", "VALIDATION.md", "CITATION.cff", "references.bib", "sources/README.md", "sources/MANIFEST.csv", "sources/artifacts.json"]

DESC = {
    "README.md": "Repository overview, quick start, validation table",
    "CHANGELOG.md": "Release notes",
    "docs/ACCOUNTS.md": "How to open hippsim to Google accounts (Firebase)",
    "VALIDATION.md": "Validation record: engine checks, browser tests, NEURON vs JS spiking",
    "CITATION.cff": "How to cite hippsim (GitHub 'Cite this repository')",
    "references.bib": "BibTeX for every paper the simulator cites (46)",
    "morphologies/provenance.csv": "Per cell: archive, NeuroMorpho id, ModelDB, DOI, PubMed / PMC",
    "morphologies/references.bib": "BibTeX (DOI) for the source of every reconstruction",
    "morphologies/provenance.json": "Same as provenance.csv, for code",
    "hippsim/config.py": "Baseline → perturbation overlays → overrides; model/perturbation discovery",
    "hippsim/paths.py": "Repository paths; HIPPSIM_RESULTS points results at a shared folder",
    "hippsim/kinetics.py": "Gating kinetics (I_h, Traub Na/Kdr, M-current), mirrored in mechanisms/*.mod",
    "hippsim/stimuli.py": "Step, ramp, sine, ZAP, EPSC train, theta–gamma, OU noise",
    "hippsim/morphology/io.py": "SWC read/write, Guide section format → SWC",
    "hippsim/morphology/compartments.py": "Sections, d-λ style compartmentalization, axial conductance, λ",
    "hippsim/engines/reference_cable.py": "numpy/scipy cable engine: exact rest, quasi-active impedance",
    "hippsim/engines/neuron_cell.py": "NEURON backend: SWC import, channel layout, steady-state init",
    "hippsim/cells/morph_cell.py": "MorphCell: NEURON time domain + reference impedance, site helpers",
    "hippsim/io/results.py": "Run folders with config, data, summary, provenance",
    "mechanisms/hd.mod": "I_h (HCN), bell or Lowet 2023 τ(V)",
    "mechanisms/natm.mod": "Traub–Miles transient Na⁺ (Pospischil 2008)",
    "mechanisms/kdrtm.mod": "Traub–Miles delayed-rectifier K⁺",
    "mechanisms/kmp.mod": "M-current (Pospischil 2008)",
    "models/lab/rebecca/ca1_morph_ih_gradient/baseline.yaml": "Rebecca · CA1 full morphology with I_h gradient · validated",
    "tools/organize_sources.py": "Builds sources/extracted + MANIFEST from artifact snapshots",
    "tools/export_guide_morphologies.py": "Exports the 59-cell atlas (+ lab Jarsky copy) to SWC + catalog",
    "tools/build_library_page.py": "Builds this page",
    "sources/README.md": "Source inventory: what was extracted, where it goes, gaps",
    "sources/MANIFEST.csv": "Every raw file: artifact, sha256, status, destination",
    "sources/artifacts.json": "Artifact titles, URLs and versions pulled",
    "morphologies/catalog.yaml": "Every cell: source, species, layer, morphometrics, NEURON check",
}

ROADMAP = [
    ("0", "Pull and organize all artifact sources", "done", "168 files, 8 artifacts → extracted code/data, manifest"),
    ("1a", "Real-biology simulator (Guide engines, 22 tools on 8 pages)", "done", "4 levels; model card, live baseline, reset, Lab/Learn mode, Explain tooltips; 46 verified references"),
    ("1b", "Perturbation presets", "done", "45 literature manipulations (drugs, AD, genotype), each a tracked change from baseline"),
    ("1d", "Phone app + validation & provenance", "done", "installable offline app (PWA); NEURON vs JS spike mismatch explained; DOI / NeuroMorpho / ModelDB for every cell; CITATION.cff"),
    ("1c", "Baselines as files + runs", "done", "models/<origin>/<tool>/baseline.yaml + perturbations/*.yaml; Save run (RO-Crate zip), Load run, shared lab run log"),
    ("1", "Morphology library + multicompartment engine", "in progress",
     "60 SWCs + catalog done; NEURON + reference engines validated; protocols (bAP, resonance maps) next"),
    ("2", "Cell models", "next", "HH, LIF, AdEx, Izhikevich, 10-channel library, Ceballos 2025 two-compartment"),
    ("3", "Networks, perturbations, protocols", "planned", "Brunel, Wilson–Cowan, CA1 circuit, STDP, AD overlays, NWB"),
    ("4", "Everything else + delivery", "planned",
     "Giant fiber, C. elegans, NMJ/muscle, ML; CLI, templates, Colab, GitHub push"),
]

def validation_rows() -> list:
    """From tools/validation_results.json + tools/site_test_results.json (see validation.html)."""
    V = json.loads((ROOT / "tools/validation_results.json").read_text())["checks"]
    T = json.loads((ROOT / "tools/site_test_results.json").read_text())
    rows = [(c["name"], c["target"], c["result"], c["status"]) for c in V]
    rows += [("Simulator: presets change the tool, Reset restores baseline", f"{T['presets']['total']} / {T['presets']['total']}", f"{T['presets']['passed']} / {T['presets']['total']}", "pass" if T['presets']['passed'] == T['presets']['total'] else "fail"),
             ("Simulator: Save run → Load run on every tool", f"{T['runs']['total']} / {T['runs']['total']}", f"{T['runs']['passed']} / {T['runs']['total']}", "pass" if T['runs']['passed'] == T['runs']['total'] else "fail")]
    return rows




def neuron_checks(cat: dict) -> dict:
    """Passive NEURON check per cell (Rin, λ at 0 and 100 Hz): verify.js for the Guide's cells, catalog for imported ones."""
    import subprocess
    js = ("global.window={};" + (ROOT / "sources/raw/little_neural_guide/verify.js").read_text() +
          ";process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(NRN_CHECK).filter(([k])=>k[0]!=='_')"
          ".map(([k,v])=>[k,{rin:v.rin,lam0:v.lam0,lam100:v.lam100}]))))")
    out = json.loads(subprocess.run(["node", "-"], input=js, capture_output=True, text=True, check=True).stdout)
    for k, v in cat.items():
        n = v.get("neuron_check")
        if n:
            out[k] = {"rin": n["rin_MOhm"], "lam0": n["lambda0_um"], "lam100": n["lambda100_um"]}
    if "ca1-jarsky" in out and "ca1-jarsky-lab" not in out:
        out["ca1-jarsky-lab"] = out["ca1-jarsky"]
    return out


def thumb(path: Path, size: int = 100) -> dict:
    """x–y projection as SVG path data per compartment (a apical, b basal/dendrite, x axon) in a 0..size box."""
    rows = [l.split() for l in path.read_text().splitlines() if l.strip() and not l.startswith("#")]
    P = {int(r[0]): (int(r[1]), float(r[2]), float(r[3]), int(float(r[6]))) for r in rows}
    xs = [v[1] for v in P.values()]; ys = [v[2] for v in P.values()]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    s = (size - 6) / max(x1 - x0, y1 - y0, 1)
    ox, oy = (size - (x1 - x0) * s) / 2, (size - (y1 - y0) * s) / 2
    X = lambda x: round(ox + (x - x0) * s); Y = lambda y: round(size - oy - (y - y0) * s)
    kids = {}
    for i, (t, x, y, par) in P.items():
        kids.setdefault(par, []).append(i)
    out = {"a": [], "b": [], "x": []}
    key = {4: "a", 3: "b", 2: "x"}
    for i, (t, x, y, par) in P.items():          # a path starts at each branch start and follows single children
        if t not in key or (par in P and P[par][0] == t and len(kids.get(par, [])) == 1):
            continue
        q = P.get(par, (t, x, y, -1)); seg = [(X(q[1]), Y(q[2]))]; j = i
        while True:
            pt = (X(P[j][1]), Y(P[j][2]))
            if abs(pt[0] - seg[-1][0]) + abs(pt[1] - seg[-1][1]) >= 2: seg.append(pt)
            ch = [c for c in kids.get(j, []) if P[c][0] == t]
            if len(ch) != 1 or len(kids.get(j, [])) != 1: break
            j = ch[0]
        if len(seg) == 1: seg.append((X(P[j][1]), Y(P[j][2])))
        out[key[t]].append("M" + " ".join(f"{a} {b}" for a, b in seg))
    so = [v for v in P.values() if v[0] == 1]
    res = {k: "".join(v) for k, v in out.items() if v}
    if so: res["s"] = [X(sum(v[1] for v in so) / len(so)), Y(sum(v[2] for v in so) / len(so))]
    return res


def published() -> list[str]:
    out = list(PUBLISH_FILES)
    for d in PUBLISH_DIRS:
        out += [str(p.relative_to(ROOT)) for p in sorted((ROOT / d).rglob("*"))
                if p.is_file() and "__pycache__" not in p.parts]
    return out


def main() -> None:
    files = published()
    manifest = list(csv.DictReader(open(ROOT / "sources/MANIFEST.csv")))
    dest_note = {}
    for r in manifest:
        for d in r["destination"].split("; "):
            if d:
                dest_note["sources/extracted/" + d] = f"{r['note']} (from {r['artifact']})"
    cat = yaml.safe_load(open(ROOT / "morphologies/catalog.yaml"))["cells"]
    prov = {r["id"]: r for r in json.loads((ROOT / "morphologies/provenance.json").read_text())}
    index = []
    for f in files:
        p = ROOT / f
        desc = DESC.get(f) or dest_note.get(f, "")
        if f.startswith("morphologies/") and f.endswith(".swc"):
            cid = Path(f).stem
            desc = f"{cat.get(cid, {}).get('name', '')} · {cat.get(cid, {}).get('species', '')}"
        if f.startswith("sources/extracted/python/") and not desc:
            desc = "Ceballos 2025 reproduction toolkit (ir_ladder)"
        index.append({"path": f, "bytes": p.stat().st_size, "desc": desc})
    nrn = neuron_checks(cat)
    cells = [{"id": k, "file": "morphologies/" + v["file"], **{x: v.get(x, "") for x in
              ["name", "code", "region", "system", "group", "species", "cite", "note", "layer", "how", "role"]},
              "m": v.get("morphometrics", {}), "prov": prov.get(k, {}), "nrn": nrn.get(k), "thumb": thumb(ROOT / "morphologies" / v["file"])}
             for k, v in cat.items()]
    man = [{k: r[k] for k in ["artifact", "file", "bytes", "status", "category", "destination", "note"]} for r in manifest]
    data = {"files": index, "cells": cells, "manifest": man, "roadmap": ROADMAP, "validation": validation_rows()}
    html = (ROOT / "tools/library_template.html").read_text().replace(
        "/*__DATA__*/null", json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    SITE.mkdir(exist_ok=True)
    head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>')
    from build_simulator import APP_HEAD, APP_TAIL
    head = head.replace("</head>", APP_HEAD + "<title>hippsim Library</title></head>") if "<title>" not in html else head.replace("</head>", APP_HEAD + "</head>")
    html = html.replace('<div class="wrap">', '<header></header>\n<div class="wrap">', 1)
    shell = ('<link rel="stylesheet" href="hs-sim.css"><style>body > header{background:var(--pink,#f8cddd);border-bottom:1px solid #171313;'
             'margin:0 calc(-1 * max(16px,env(safe-area-inset-left,0px))) 0;font:15px/1.5 system-ui,sans-serif}'
             'body > header .brand{font-weight:800}.mast{position:static !important}#msys,#mspe{display:none}@media (max-width:640px){#mreg{flex:1 1 100%;width:100%}}</style>')
    head = head.replace("</head>", shell + "</head>")
    (SITE / "library.html").write_text(head + html + APP_TAIL + "</body></html>")
    # NGC (Migliore 2005 channels + Golomb I_M / I_NaP), lifted verbatim from the Little Neural Guide engine so the
    # Neurons viewer runs the same compartmental model as the Neuron lab and the research model
    ml = (ROOT / "sources/raw/little_neural_guide/modellab.js").read_text()
    a = ml.index("const NGC = (() => {"); z = ml.index("\n})();", a) + len("\n})();")
    (SITE / "hs-ngc.js").write_text("/* NGC compartmental engine, copied by tools/build_library_page.py from sources/raw/little_neural_guide/modellab.js. Do not edit. */\n"
                                    + ml[a:z] + "\nwindow.NGC = NGC;\n")
    # Neuron atlas: neurons only; click one for the full-screen 3D view (tools/atlas_template.html)
    scripts = {p.stem: p.read_text() for p in (ROOT / "tools/script_templates").glob("*.py")}
    # baseline spike counts in hippsim's engine, NEURON and Brian2 (tools/engine_check.py)
    ef = ROOT / "tools/engine_baselines.json"
    eng = {k: {e: {f: x[f] for f in ("spikes", "first_ms") if f in x} for e, x in v.items() if isinstance(x, dict) and "spikes" in x} | {"date": v.get("date", "")}
           for k, v in (json.loads(ef.read_text()) if ef.exists() else {}).items()}
    acells = [{k: c[k] for k in ["id", "file", "name", "code", "region", "system", "group", "species", "layer", "cite", "nrn", "thumb"]}
              | {"prov": {k: c["prov"].get(k, "") for k in ("archive", "neuromorpho_id", "neuromorpho_url", "modeldb", "doi", "pmid")},
                 "axonHidden": bool(cat[c["id"]].get("axon_hidden")), "how": c["how"],
                 "links": cat[c["id"]].get("links", []), "original": cat[c["id"]].get("original", ""), "src": cat[c["id"]].get("provenance", "")} for c in cells]
    atlas = (ROOT / "tools/atlas_template.html").read_text().replace("/*__DATA__*/null", json.dumps({"cells": acells, "scripts": scripts, "eng": eng}, ensure_ascii=False, separators=(",", ":")))
    atlas = atlas.replace('<div class="wrap">', '<header></header>\n<div class="wrap">', 1)
    # the atlas is the home page: index.html is the artifact's main page (a fragment the host wraps in a document)
    (SITE / "index.html").write_text('<meta name="claude:viewport-fit-sides" content="cover">\n' + APP_HEAD + shell + atlas + APP_TAIL)
    from build_simulator import redirect_html
    (SITE / "atlas.html").write_text(redirect_html("index.html"))
    (SITE / "files.json").write_text(json.dumps(files))
    print(f"page {len(html)/1e3:.0f} kB · {len(files)} files · {sum(i['bytes'] for i in index)/1e6:.1f} MB")


if __name__ == "__main__":
    main()
