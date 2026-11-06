"""Export all Neuron Morphology Atlas reconstructions (59 cells) to SWC + catalog.yaml.

Run from the repo root:  python tools/export_guide_morphologies.py
Input : sources/extracted/data/morphologies/atlas_59_cells.json (from tools/organize_sources.py)
Output: morphologies/<system>/<region>/<id>.swc and morphologies/catalog.yaml
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from hippsim.morphology.io import from_guide, write_swc  # noqa: E402

SRC = ROOT / "sources/extracted/data/morphologies/atlas_59_cells.json"
OUT = ROOT / "morphologies"
FIELDS = ["name", "code", "region", "system", "group", "layer", "species", "how", "role", "cite", "note"]


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (s or "other").lower()).strip("_")


def main() -> None:
    cells = json.loads(SRC.read_text())["data"]
    # cells added by tools/import_modeldb_morphologies.py are kept (files and catalog entries)
    old = yaml.safe_load((OUT / "catalog.yaml").read_text()).get("cells", {}) if (OUT / "catalog.yaml").exists() else {}
    added = {k: v for k, v in old.items() if v.get("provenance") == "modeldb-import"}
    keep = {(OUT / v["file"]).resolve() for v in added.values()}
    for f in OUT.rglob("*.swc") if OUT.exists() else []:
        if f.resolve() not in keep and f.parent != OUT:
            f.unlink()
    catalog = {}
    fix = {k: v["doi"] for k, v in json.loads((ROOT / "tools/doi_corrections.json").read_text()).items() if not k.startswith("_")}
    for c in cells:
        for old, new in fix.items():
            if old in (c.get("cite") or ""):
                c["cite"] = c["cite"].replace(old, new)
            c["links"] = [[a, b.replace(old, new)] for a, b in c.get("links", [])]
        rel = Path(slug(c.get("system"))) / slug(c.get("region")) / f"{c['id']}.swc"
        m = from_guide(c, c["id"])
        write_swc(m, OUT / rel, [f"{c.get('name', '')} ({c.get('code', '')})", f"Species: {c.get('species', '')}",
                                 f"Source: {c.get('cite', '')}",
                                 "Exported from the Neuron Morphology Atlas (soma-centred, um)"])
        entry = {"file": str(rel)}
        entry.update({k: c[k] for k in FIELDS if c.get(k)})
        entry["links"] = [{"label": a, "url": b} for a, b in c.get("links", [])]
        entry["morphometrics"] = c.get("stats", {})
        entry["n_samples"] = int(m.n)
        entry["provenance"] = "literature"
        catalog[c["id"]] = entry
    # Exact (unthinned) Jarsky cell used by the CA1 Morphology Lab — the validated model's morphology
    lab = json.loads((ROOT / "sources/extracted/data/morphologies/ca1_jarsky_lab.json").read_text())
    rel = Path("hippocampal_formation/ca1/ca1-jarsky-lab.swc")
    m = from_guide(lab, "ca1-jarsky-lab")
    write_swc(m, OUT / rel, ["CA1 pyramidal cell (Jarsky 2005), CA1 Morphology Lab copy",
                             "Source: Jarsky, Roxin, Kath & Spruston (2005) Nat Neurosci 8:1667 · ModelDB 116084"])
    catalog["ca1-jarsky-lab"] = {**catalog["ca1-jarsky"], "file": str(rel), "n_samples": int(m.n),
                                 "note": "Unthinned copy used by the CA1 Morphology Lab; use this for ca1_morph_ih_gradient"}
    catalog.update(added)
    with open(OUT / "catalog.yaml", "w") as fh:
        yaml.safe_dump({"units": "um", "swc_types": {1: "soma", 2: "axon", 3: "basal/dendrite", 4: "apical"},
                        "n_cells": len(catalog), "cells": catalog}, fh, sort_keys=False, allow_unicode=True, width=120)
    print(f"wrote {len(catalog)} morphologies → {OUT}")


if __name__ == "__main__":
    main()
