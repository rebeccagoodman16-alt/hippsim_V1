# hippsim

A lab simulator for hippocampal and cellular neuroscience. It runs real reconstructed neurons and published
models in the browser, keeps every baseline and literature manipulation as a file, and saves runs with full
provenance. The same models run in Python (NEURON, numpy) for analysis.

## Use it

1. **Neurons** (home): pick or type a cell. It opens in 3D: rotate, hover a branch, toggle compartments,
   screenshot or video, Details for measurements.
2. **Simulate** (beside the cell): choose single cell, circuit or population; the model (Hodgkin–Huxley, Migliore 2005,
   the research model, …); and the simulator (hippsim, NEURON, Brian2). Run the baseline, then manipulate it: drugs,
   channels, current, electrode site. The trace, spike count and voltage on the 3D cell update; save the run.
3. **Runs**: saved runs, in folders. Open one to get back exactly where you were.
4. **Tools**: model tools (channels, synapses, circuits, plasticity) with literature baselines and manipulations.
   **Models** lists every model with its validation and sources.

**Docs** (menu): the full documentation, also in `docs/guide/` (Markdown; built by `tools/build_docs.py`).

Display (top right): text size, colours (incl. high contrast, colour-blind-safe), light or dark, Web or Phone view.

## Repository

| Folder | Contents |
|---|---|
| `morphologies/` | 87 SWC reconstructions, `catalog.yaml` (source, measurements, NEURON check), `provenance.csv` |
| `models/literature/<tool>/`, `models/lab/<author>/<tool>/` | `baseline.yaml` + `perturbations/*.yaml` per tool (generated; do not edit by hand) |
| `mechanisms/` | NMODL channels (I_h, Traub Na/K_dr, M-current) |
| `hippsim/` | Python package: config, engines (NEURON, numpy reference), cells, stimuli, results I/O |
| `site/` | The web app (`hs-cable.js`: in-browser compartmental engine) (built by `tools/build_simulator.py`, `tools/build_library_page.py`) |
| `tools/` | Builders, importers, validation and browser tests |
| `sources/` | Snapshots of the source artifacts and what was extracted from them |

## Python

```python
from hippsim.config import load_model
from hippsim.cells.morph_cell import MorphCell
from hippsim import stimuli

cfg  = load_model("ca1_morph_ih_gradient", override={"gh_fold": 1})   # baseline → overrides
cell = MorphCell(cfg)
t, I = stimuli.zap(0.05, f0=0.5, f1=20, dur=10000)
trace = cell.clamp(t, I, site=cell.apical(300))                        # NEURON
Z = cell.impedance([1, 2, 4, 8, 16], site=cell.apical(300))            # numpy reference engine
```
`hippsim.io.results.RunDir` writes `<HIPPSIM_RESULTS>/<model>/<condition>/<date>_<protocol>_<hash>/`
(`config.yaml`, `data.npz`, `summary.json`, `provenance.json`).

## Saved runs

Save run stores the run online (every control at baseline and as run, perturbations, plots). Download gives a zip:
`run.json` (schema `hippsim.run/1.0`), `parameters.csv`, `references.bib`, `figures/`, `reproduce.py` and
`ro-crate-metadata.json` (RO-Crate 1.1).

## Validation

`VALIDATION.md` and the Models page list every check. Current status:

| Check | Result |
|---|---|
| CA1 morphology model (571 compartments): R_in, rest | 66.02 MΩ, −63.40 mV (target 66.0, −63.4) |
| NEURON vs numpy reference, input resistance | within 4 % (63.5 vs 66.0 MΩ; NEURON includes I_h sag) |
| NEURON vs browser engine, spikes (300 ms step) | first spikes within 0.6 ms; counts equal below depolarization block |
| All SWCs load in NEURON | 87 / 87 |
| Browser tests: presets, save/load, flows, page audit | `tools/test_site.py`, `test_flows.py`, `audit_site.py` |

Known issue: NEURON `Impedance(extended=1)` gets the sign of the I_h contribution wrong with `hd.mod`
(147 vs 66 MΩ), so impedance protocols use the reference engine.

## Cite

- hippsim: `CITATION.cff`. Models: `references.bib` (46 papers, DOIs checked). Cells: `morphologies/references.bib`
  and `provenance.csv`; NeuroMorpho.Org cells also cite Ascoli et al. (2007).
- DOI corrections to inherited data are listed in `tools/doi_corrections.json`.

## Add cells from ModelDB

`git clone --depth 1 https://github.com/ModelDBRepository/<id>`, add the cell to `CELLS` in
`tools/import_modeldb_morphologies.py`, run it. The .hoc geometry is read as text (nothing in the package runs),
converted to SWC, checked in NEURON and added to every tool.

## Build and host

```
python tools/build_simulator.py && python tools/build_library_page.py && python tools/build_app.py   # -> app/
```
`app/` is a static site and an installable phone app (works offline). GitHub Pages: `.github/workflows/pages.yml`.
Opening it to Google accounts: `docs/ACCOUNTS.md`. Changes: `CHANGELOG.md`.

`legacy_js_kdr` (CA1 morphology model): `true` reproduces the browser engine before the 2026-11-04 fix
(distal apical K_dr never applied).
