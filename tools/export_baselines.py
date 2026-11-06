"""Export every simulator tool's baseline as a versioned file.

For each tool (one Guide route) this writes
    models/<origin>/<tool>/baseline.yaml          all parameters at their default (value, range, step, unit)
    models/<origin>/<tool>/perturbations/*.yaml   one file per literature preset (ops + references)
and, for the whole set,
    models/registry.json                          machine-readable index (used by the site and by `hippsim run`)
    models/INDEX.md                               human-readable index
    site/hs-registry.js                           the same index for the browser (window.HS_REG)

origin = literature        published models re-implemented from the paper / ModelDB entry
       = lab/rebecca       models Rebecca implemented and tested (research-* tools, Ceballos 2025 ladder)
Sources: tools/tool_harvest.json (controls as rendered at load), site/hs-cards.js (model cards + presets).
"""
from __future__ import annotations

import ast
import json
import re
import subprocess
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "hippsim.baseline/1.0"

# tools Rebecca implemented and tested herself; everything else re-implements published work
REBECCA = {"interleaved-resonance", "research-resonance", "research-spiking", "research-reduction",
           "research-reproduction", "research-morphology", "research-circuit", "research-place-fields"}
DATA_VIEWS = {"cell-atlas", "neuron-viewer", "whole-brain", "mechanisms"}
# browser tool -> Python model in models/ that reproduces its cell (subset of controls)
PYTHON_PORT = {"research-morphology": "ca1_morph_ih_gradient", "dendritic-resonance": "ca1_morph_ih_gradient",
               "workbench-morphology": "ca1_morph_ih_gradient"}

UNIT_RE = re.compile(r"\s\(?(mV|ms|s|Hz|kHz|µA/cm²|mA/cm²|mS/cm²|µS/cm²|S/cm²|nA|pA|µm|mm|°C|%|nS|mM|µM|MΩ|Ω·cm|µF/cm²|mV/ms|cells|laps|×)\)?$")


def tool_id(route: str) -> str:
    parts = [p for p in route.split("/") if p]
    return parts[-1] if parts[0] == "biology" else "-".join(parts)


def num(x):
    if x is None or x == "":
        return None
    try:
        f = float(x)
        return int(f) if f.is_integer() and "." not in str(x) else f
    except ValueError:
        return x


def load_cards() -> dict:
    js = (ROOT / "site/hs-cards.js").read_text()
    out = subprocess.run(["node", "-e", "global.window={};" + js + ";process.stdout.write(JSON.stringify(window.HS_CARDS))"],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def parameters(ctrls: list[dict]) -> list[dict]:
    """One entry per control as the page shell records it (same keys as saved runs). A number box that mirrors a
    slider is folded into the slider: its exact value becomes the baseline value."""
    exact = {c["mirrors"]: c for c in ctrls if c.get("mirror") and c.get("mirrors")}
    params = []
    for c in ctrls:
        if c.get("mirror"):
            continue
        key = c["key"]
        box = exact.get(key.lstrip("#"))
        label = c["label"]
        m = UNIT_RE.search(label) or (box and UNIT_RE.search(" " + box["label"].split(", ")[-1].rstrip(")")))
        p = {"key": key, "id": key.lstrip("#"), "label": UNIT_RE.sub("", label).strip(),
             "type": {"range": "slider", "number": "number", "menu": "menu", "checkbox": "switch", "radio": "choice"}.get(c["type"], c["type"])}
        if c["type"] in ("checkbox", "radio"):
            p["value"] = bool(c["baseline"])
        elif c.get("options"):
            p["value"] = c["baseline"]
            p["options"] = {v: t for v, t in c["options"]}
        else:
            p["value"] = num(box["baseline"] if box else c["baseline"])
            if box:
                p["exact_key"] = box["key"]
            for k in ("min", "max", "step"):
                if c.get(k) not in (None, ""):
                    p[k] = num(c[k])
        if m and p["type"] not in ("switch", "choice"):
            p["unit"] = m.group(1)
        params.append(p)
    return params


def provenance(links: list) -> dict:
    urls = [u for _, u in links]
    md = sorted({int(m.group(1)) for u in urls for m in [re.search(r"modeldb\.(?:science|yale\.edu)[^0-9]*(\d{4,7})", u)] if m})
    md += sorted({int(m.group(1)) for u in urls for m in [re.search(r"ModelDBRepository/(\d+)", u)] if m} - set(md))
    return {"modeldb": md,
            "doi": sorted({u.split("doi.org/")[1] for u in urls if "doi.org/" in u}),
            "code": sorted({u for u in urls if "github.com" in u}),
            "neuromorpho": sorted({u for u in urls if "neuromorpho.org" in u})}


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("⁺", "").replace("²", "2")).strip("-")[:48]


def main() -> None:
    harvest = json.loads((ROOT / "tools/tool_harvest.json").read_text())
    live_ctrls = json.loads((ROOT / "tools/baseline_harvest.json").read_text())   # tools/harvest_baselines.py
    C = load_cards()
    cards, refs = C["cards"], C["refs"]
    page = json.loads(re.search(r"HS_PAGE = (\{.*?\});", (ROOT / "site/sim-studio.html").read_text()).group(1))
    live = {a[0]: (a[1], a[2]) for a in page["all"]}          # route -> (tool name, page slug): tools in the simulator
    registry = {"schema": "hippsim.registry/1.0", "tools": {}}
    for route, card in cards.items():
        if route not in live:
            continue
        h = harvest.get(route, {})
        ctrls = live_ctrls.get(route) or []
        links = h.get("links", [])
        links = ast.literal_eval(links) if isinstance(links, str) else links
        tid = tool_id(route)
        origin = "lab/rebecca" if tid in REBECCA else "literature"
        kind = "data_view" if tid in DATA_VIEWS else "simulation"
        folder = ROOT / "models" / origin / tid
        prov = provenance(links)
        doc = {
            "schema": SCHEMA, "id": tid, "title": " ".join((h.get("h1") or tid).split()), "route": route,
            "tool": live[route][0], "page": f"sim-{live[route][1]}.html",
            "origin": origin, "kind": kind, "level": card["level"],
            "question": card["question"], "model": card["model"], "biology": card["biology"],
            "units": card.get("units", ""),
            "provenance": prov,
            "references": card["refs"],
            "validation": card["validation"],
            "python_port": PYTHON_PORT.get(tid),
            "baseline_table": [{"parameter": b[0], "value": b[1], "unit": b[2], "note": b[3]} for b in card["baseline"]],
            "parameters": parameters(ctrls),
            "perturbations": [f"perturbations/{slug(p['name'])}.yaml" for p in card.get("presets", [])],
        }
        folder.mkdir(parents=True, exist_ok=True)
        hdr = (f"# {doc['title']}\n# Baseline for the hippsim tool '{tid}' ({route}). Generated by tools/export_baselines.py\n"
               f"# from the rendered tool; do not edit by hand. Origin: {origin}.\n")
        (folder / "baseline.yaml").write_text(hdr + yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, width=110))
        pd = folder / "perturbations"
        for p in card.get("presets", []):
            pd.mkdir(exist_ok=True)
            pdoc = {"schema": "hippsim.perturbation/1.0", "name": p["name"], "tool": tid, "kind": p["kind"],
                    "what": p["what"], "expected_size": p["size"], "references": p["refs"],
                    "ops": [{"control": sel, "set": v} for sel, v in p["ops"]]}
            (pd / f"{slug(p['name'])}.yaml").write_text(yaml.safe_dump(pdoc, sort_keys=False, allow_unicode=True, width=110))
        registry["tools"][route] = {"id": tid, "origin": origin, "kind": kind, "level": card["level"],
                                    "title": doc["title"], "tool": doc["tool"], "page": doc["page"], "baseline": f"models/{origin}/{tid}/baseline.yaml",
                                    "n_parameters": len(doc["parameters"]), "n_perturbations": len(doc["perturbations"]),
                                    "python_port": doc["python_port"], **prov}
    import hashlib, datetime
    blob = json.dumps(registry["tools"], sort_keys=True) + (ROOT / "site/hs-cards.js").read_text()
    registry["build"] = {"sha": hashlib.sha256(blob.encode()).hexdigest()[:12], "date": datetime.date.today().isoformat()}
    (ROOT / "models/registry.json").write_text(json.dumps(registry, indent=1, ensure_ascii=False))
    (ROOT / "site/hs-registry.js").write_text("window.HS_REG = " + json.dumps(registry, ensure_ascii=False) + ";\n")

    rows = sorted(registry["tools"].values(), key=lambda t: (t["origin"], t["level"], t["id"]))
    md = ["# Model registry", "", "Every simulator tool, its baseline file and its provenance. Generated by `tools/export_baselines.py`.", "",
          "| Origin | Level | Tool | Baseline | Params | Perturbations | ModelDB | Python |", "|---|---|---|---|---|---|---|---|"]
    for t in rows:
        md.append(f"| {t['origin']} | {t['level']} | {t['title']} | [{t['id']}]({t['baseline'].removeprefix('models/')}) | {t['n_parameters']} | "
                  f"{t['n_perturbations']} | {', '.join(map(str, t['modeldb'])) or '–'} | {t['python_port'] or '–'} |")
    (ROOT / "models/INDEX.md").write_text("\n".join(md) + "\n")
    n_p = sum(t["n_perturbations"] for t in rows)
    print(f"{len(rows)} tools, {sum(t['n_parameters'] for t in rows)} parameters, {n_p} perturbation files")


if __name__ == "__main__":
    main()
