"""Structured provenance for every morphology -> morphologies/provenance.csv, provenance.json, references.bib.

From morphologies/catalog.yaml (cite + links) it extracts, per cell: NeuroMorpho.Org id, ModelDB accession,
DOI, PubMed id, archive (NeuroMorpho / ModelDB / MouseLight / hemibrain / FANC / MANC / Allen) and the
citation line. NeuroMorpho.Org asks users to cite the original paper and NeuroMorpho.Org (Ascoli et al. 2007).
  python tools/morph_provenance.py
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
M = ROOT / "morphologies"
ARCHIVES = [("MANC", "MANC"), ("FANC", "FANC"), ("hemibrain", "Janelia hemibrain"), ("FlyEM", "Janelia hemibrain"),
            ("MouseLight", "Janelia MouseLight"), ("Allen Cell Types", "Allen Cell Types"), ("NeuroMorpho", "NeuroMorpho.Org"), ("ModelDB", "ModelDB")]


# Papers behind the ModelDB morphologies (DOI / PMC checked against the publisher, PubMed or PMC, Nov 2026)
MODELDB_PAPER = {
    "244688": {"doi": "10.1371/journal.pcbi.1006423"},                     # Migliore et al. 2018
    "101629": {"doi": "10.1002/hipo.20404"},                               # Hemond et al. 2008
    "231862": {"doi": "10.7554/eLife.26517"},                              # Beining et al. 2017
    "116084": {"doi": "10.1038/nn1599"},                                   # Jarsky et al. 2005
    "55035": {"doi": "10.1152/jn.00521.2005"},                             # Migliore, Ferrante & Ascoli 2005
    "182797": {"doi": "10.3389/fnsyn.2015.00002"},                         # Sekulic et al. 2015
    "95960": {"pmid": "17670990", "pmcid": "PMC6673070"},                  # Schmidt-Hieber et al. 2007
    "140789": {"pmcid": "PMC2818894"},                                     # Nörenberg et al. 2010
    "237595": {"pmcid": "PMC6694133"},                                     # Tzilivaki et al. 2019
    "144450": {"doi": "10.3389/fncom.2011.00044", "pmcid": "PMC3214726"},  # Gómez González, Mel & Poirazi 2011 (cells: Pyapali et al. 1998, PMID 9492204)
    "137259": {"doi": "10.1007/s10827-010-0304-x"},                        # Baker et al. 2011
}


def main() -> None:
    cells = yaml.safe_load((M / "catalog.yaml").read_text())["cells"]
    rows, bib, seen = [], [], set()
    for cid, c in cells.items():
        cite, urls = c.get("cite", ""), [l["url"] for l in c.get("links", [])]
        text = cite + " " + " ".join(urls)
        nmo = re.search(r"NMO_(\d+)", cite) or re.search(r"neuromorpho\.org/neuron_info\.jsp\?neuron_id=(\d+)", text)
        mdb = sorted(set(re.findall(r"ModelDB (\d{4,7})", cite) + re.findall(r"modeldb\.science/(\d+)", text)))
        doi = sorted({d.rstrip(".,;") for d in re.findall(r"(?:doi:|doi\.org/)(10\.[^\s·,;]+)", text)})
        pmid = re.search(r"pubmed\.ncbi\.nlm\.nih\.gov/(\d+)", text)
        paper = next((MODELDB_PAPER[m] for m in mdb if m in MODELDB_PAPER), {})
        if not doi and paper.get("doi"):
            doi = [paper["doi"]]
        pmid = pmid.group(1) if pmid else paper.get("pmid", "")
        archive = next((name for key, name in ARCHIVES if key in cite), "ModelDB" if mdb else "publication")
        r = {"id": cid, "file": "morphologies/" + c["file"], "name": c.get("name", ""), "region": c.get("region", ""),
             "species": c.get("species", ""), "source_code": c.get("code", ""), "archive": archive,
             "neuromorpho_id": f"NMO_{nmo.group(1)}" if nmo else "",
             "neuromorpho_url": f"https://neuromorpho.org/neuron_info.jsp?neuron_id={nmo.group(1)}" if nmo else "",
             "modeldb": ";".join(mdb), "doi": ";".join(doi), "pmid": pmid, "pmcid": paper.get("pmcid", ""), "citation": cite}
        rows.append(r)
        for d in doi:
            if d in seen:
                continue
            seen.add(d)
            key = re.sub(r"[^a-z0-9]+", "", (cite.split("·")[0].split("(")[0].split(",")[0].strip().split(" ")[0] or "ref").lower())
            yr = re.search(r"\((\d{4})\)", cite) or re.search(r"\b(19|20)\d{2}\b", d)
            key = f"{key or 'morph'}{yr.group(1) if yr and len(yr.group(1)) == 4 else ''}_{len(bib) + 1}"
            bib.append(f"@misc{{{key},\n  note = {{Morphology source: {cite.replace('{', '').replace('}', '')}}},\n  doi = {{{d}}}\n}}")
    bib.insert(0, "@article{ascoli2007,\n  author = {Ascoli, Giorgio A. and Donohue, Duncan E. and Halavi, Maryam},\n"
                  "  title = {{NeuroMorpho.Org: a central resource for neuronal morphologies}},\n  journal = {J Neurosci},\n"
                  "  year = {2007}, volume = {27}, pages = {9247--9251},\n  doi = {10.1523/JNEUROSCI.2055-07.2007}\n}")
    with open(M / "provenance.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    (M / "provenance.json").write_text(json.dumps(rows, indent=1, ensure_ascii=False))
    (M / "references.bib").write_text(
        f"% Sources of the {len(rows)} morphologies. Generated by tools/morph_provenance.py.\n"
        "% Entries carry the DOI; import into Zotero / a citation manager to fill in full metadata.\n"
        "% NeuroMorpho.Org cells: cite the original paper and NeuroMorpho.Org (ascoli2007).\n\n" + "\n\n".join(bib) + "\n")
    by = {}
    for r in rows:
        by[r["archive"]] = by.get(r["archive"], 0) + 1
    print(f"{len(rows)} cells · {sum(1 for r in rows if r['neuromorpho_id'])} NeuroMorpho ids · "
          f"{sum(1 for r in rows if r['modeldb'])} ModelDB · {sum(1 for r in rows if r['doi'])} with DOI · {len(bib)} BibTeX entries · {by}")


if __name__ == "__main__":
    main()
