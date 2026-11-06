---
title: For developers
---
The site is generated: edit the sources, rebuild, run the tests, then publish.

| Folder | Contents |
| --- | --- |
| `site/` | The web app: `hs-cable.js` (HH solver), `hs-ngc.js` (NGC engine, generated), `hs-models.js` (Simulate-panel models), `hs-run.js` (saved runs), `hs-app.js` (menu, Display) |
| `docs/guide/` | This documentation (Markdown); the Models page is generated from `site/hs-models.js` |
| `tools/` | Builders, importers, engine checks and browser tests; `atlas_template.html` = the Neurons page; `script_templates/` = NEURON / Brian2 scripts |
| `morphologies/` | SWC files, `catalog.yaml`, `provenance.csv`, `references.bib` |
| `models/` | `baseline.yaml` + `perturbations/*.yaml` per tool (generated) |
| `hippsim/`, `mechanisms/` | Python package (NEURON and numpy engines), NMODL channels |
| `app/` | Installable build for any static host |

Build and test, in order:

```bash
python tools/build_simulator.py      # tool pages, Tools hub, About, Validation
python tools/build_library_page.py   # Neurons (home), Cells & data, hs-ngc.js
python tools/build_docs.py           # Docs (this page)
python tools/build_app.py            # app/ (installable, offline)
python tools/test_atlas.py mock.js && python tools/test_site.py && python tools/test_flows.py mock.js
python tools/test_accounts.py && python tools/audit_site.py
python tools/engine_check.py         # NEURON + Brian2 baselines for every cell (~25 min)
```

**Add a model** to the Simulate panel: an entry in `site/hs-models.js` with `scale`, `name`, `desc`, `params` (each with its baseline and range), `presets` (each with its source), `base(p)` (the baseline rows), `run()` and `summary()`. It appears in the panel and on the [Models](#models) page after a rebuild.
**Add a cell**: its SWC in `morphologies/` and an entry in `catalog.yaml`, then rebuild.
