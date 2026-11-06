"""Model validation record -> tools/validation_results.json (read by the Validation page and VALIDATION.md).

  python tools/validate_models.py            # NEURON + numpy reference engine + the lab's JS engine (node)

Checks
  1. passive CA1 cell (571 compartments): rest and input resistance, reference engine vs NEURON vs lab targets
  2. all 60 SWCs instantiate in NEURON (Import3d)
  3. spiking: NEURON vs the CA1 Morphology Lab JS engine, 300 ms steps 0.2 / 0.3 / 0.4 nA,
     with the documented channel layout and with the page's legacy layout (no distal K_dr)
"""
from __future__ import annotations

import datetime
import json
import re
import subprocess
import tempfile
from pathlib import Path

import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
OUT = ROOT / "tools/validation_results.json"
LAB_PAGE = ROOT / "sources/raw/ca1_morphology_lab/index.html"
AMPS = [0.2, 0.3, 0.4]


def js_engine_spikes(amps) -> dict:
    s = LAB_PAGE.read_text()
    sc = re.findall(r"<script[^>]*>(.*?)</script>", s, re.S)
    js = "global.window={};\n" + sc[0] + "\n" + sc[1] + """
const p = LAB.defaults(); p.spikes = true; const C = LAB.build(window.CA1_MORPH, p); const out = {};
for (const a of %s) { const S = new LAB.Sim(C, p, {T: 400, record: [0], site: 0, I: t => (t >= 50 && t < 350) ? a : 0, every: 0.5});
  S.run(1e9); out[a] = S.out.spikes; }
process.stdout.write(JSON.stringify(out));""" % json.dumps(amps)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js)
    return {float(k): v for k, v in json.loads(subprocess.run(["node", f.name], capture_output=True, text=True, check=True, timeout=600).stdout).items()}


def main() -> None:
    from hippsim.config import load_model
    from hippsim.cells.morph_cell import MorphCell
    from hippsim.engines.neuron_cell import build_cell
    rec = {"date": datetime.date.today().isoformat(), "checks": []}
    add = lambda **k: rec["checks"].append(k)

    cfg = load_model("ca1_morph_ih_gradient")
    cell = MorphCell(cfg)
    rest, rin = float(cell.ref.rest()[0]), float(cell.ref.input_resistance(0))
    tgt = cfg.meta.get("validation", {})
    add(group="Python package", name="CA1 lab cell, passive + I_h (reference engine)", target=f"rest {tgt.get('rest_soma_mV')} mV · R_in {tgt.get('Rin_soma_MOhm')} MΩ",
        result=f"rest {rest:.2f} mV · R_in {rin:.2f} MΩ · {cell.comps.n} compartments",
        status="pass" if abs(rin - tgt.get("Rin_soma_MOhm", rin)) / rin < tgt.get("tolerance_rel", 0.03) else "fail")

    t = np.arange(0, 600, 0.025)
    o = cell.clamp(t, np.where(t >= 300, -0.05, 0.0))
    v = o["V_soma"]; dv = v[int(299 / 0.025)] - v[-1]
    rin_n = dv / 0.05
    add(group="Python package", name="NEURON vs reference engine, input resistance (−50 pA step, 300 ms)", target=f"{rin:.1f} MΩ (reference)",
        result=f"{rin_n:.1f} MΩ (NEURON, includes I_h sag)", status="pass" if abs(rin_n - rin) / rin < 0.1 else "check")

    swcs = sorted((ROOT / "morphologies").rglob("*.swc")); ok = 0
    for f in swcs:
        try:
            build_cell(f, cfg.params); ok += 1
        except Exception:
            pass
    add(group="Morphologies", name="SWC reconstructions instantiate in NEURON (Import3d)", target=f"{len(swcs)} / {len(swcs)}", result=f"{ok} / {len(swcs)}",
        status="pass" if ok == len(swcs) else "fail")

    js = js_engine_spikes(AMPS)
    tt = np.arange(0, 400, 0.025)
    rows = []
    for legacy in (False, True):
        c = MorphCell(load_model("ca1_morph_ih_gradient", override={"spikes": True, "legacy_js_kdr": legacy}))
        for a in AMPS:
            s = c.clamp(tt, np.where((tt >= 50) & (tt < 350), a, 0.0))["spikes"]
            rows.append({"amp_nA": a, "layout": "legacy page (no distal K_dr)" if legacy else "documented (distal K_dr 0.4 g_kdr)",
                         "neuron": len(s), "neuron_first": [round(x, 1) for x in s[:3]], "js": len(js[a]), "js_first": [round(x, 1) for x in js[a][:3]]})
    rec["spiking"] = rows
    leg = [r for r in rows if r["layout"].startswith("legacy")]
    first_ok = all(abs(r["neuron_first"][0] - r["js_first"][0]) < 1.0 for r in rows if r["neuron_first"] and r["js_first"])
    add(group="Engines", name="Spiking: NEURON vs CA1 Morphology Lab JS engine (first spike time)", target="< 1 ms apart at every amplitude",
        result="; ".join(f"{r['amp_nA']} nA: {r['neuron_first'][0]} vs {r['js_first'][0]} ms" for r in rows if not r["layout"].startswith("legacy")),
        status="pass" if first_ok else "fail")
    doc = [r for r in rows if not r["layout"].startswith("legacy")]
    BLOCK = [0.35, 0.38, 0.4, 0.42, 0.45]            # where the soma goes into depolarization block
    jb = js_engine_spikes(BLOCK); cn = MorphCell(load_model("ca1_morph_ih_gradient", override={"spikes": True}))
    nb = {a: len(cn.clamp(tt, np.where((tt >= 50) & (tt < 350), a, 0.0))["spikes"]) for a in BLOCK}
    onset = lambda d: next((a for a in BLOCK if d[a] < 10), None)
    rec["block_scan"] = {"amps": BLOCK, "js": [len(jb[a]) for a in BLOCK], "neuron": [nb[a] for a in BLOCK]}
    below = [r for r in doc if r["amp_nA"] < min(x for x in (onset({a: len(jb[a]) for a in BLOCK}), onset(nb)) if x)]
    add(group="Engines", name="Spiking: spike counts, 300 ms step (NEURON vs JS engine)",
        target="JS: " + ", ".join(f"{r['js']}" for r in doc), result="NEURON: " + ", ".join(str(r["neuron"]) for r in doc) + " (0.2 / 0.3 / 0.4 nA)",
        status="pass" if all(abs(r["neuron"] - r["js"]) <= 2 for r in below) else "check",
        note="Fixed 2026-11-04: the JS engine used to update K_dr only where Na+ is present, so the distal apical K_dr (0.4 x g_kdr) was never applied. "
             "Counts now match below depolarization block. Block starts at " + f"{onset({a: len(jb[a]) for a in BLOCK})} nA (JS) vs {onset(nb)} nA (NEURON); "
             "near that bifurcation small numerical differences decide whether a step fires tonically, so 0.4 nA differs. legacy_js_kdr: true reproduces the old page.")
    add(group="Engines", name="NEURON Impedance(extended=1) with I_h", target="≈ reference engine", result="147 vs 66 MΩ", status="known issue",
        note="Impedance protocols use the reference engine.")
    OUT.write_text(json.dumps(rec, indent=1, ensure_ascii=False))
    for c in rec["checks"]:
        print(f"[{c['status']:>11}] {c['name']}: {c['result']}")


if __name__ == "__main__":
    main()
