---
title: Validation
---
hippsim's Hodgkin–Huxley solver gives NEURON's spike count exactly on {NEURON_SAME} of {N_CELLS} cells and within one spike on {NEURON_1}; Brian2 matches on {BRIAN_SAME} and {BRIAN_1}. Every cell was run in all three engines with the same model (0.5 nA, 300 ms step at the soma) by `tools/engine_check.py`.

| Comparison (spike counts) | Same count | Within ±1 spike |
| --- | --- | --- |
| hippsim vs NEURON 9.0.2 | {NEURON_SAME} / {N_CELLS} | {NEURON_1} / {N_CELLS} |
| hippsim vs Brian2 2.11 | {BRIAN_SAME} / {N_CELLS} | {BRIAN_1} / {N_CELLS} |

The gaps come from discretization: hippsim ≤ 20 µm compartments, NEURON d_lambda 0.1, Brian2 one compartment per traced segment. They are largest in cells near depolarization block, where a small difference in input resistance decides between repetitive firing and a single spike.

| Other checks | Result |
| --- | --- |
| Model checks (`tools/validate_models.py`) | Passive and spiking checks against NEURON and the numpy reference engine; one known issue (NEURON's extended impedance with Iₕ) |
| All SWC files build in NEURON (Import3d) | 87 / 87, each with a passive input-resistance check |
| Browser tests | Presets, saved runs, user flows, accounts and the Neurons viewer, at web and phone widths |
| Page audit | Links, layout and accessibility basics on every page |
| Citations | DOIs checked against Crossref / OpenAlex |

Full record, per-cell table and per-tool checks: [Validation & provenance](validation.html) and `VALIDATION.md`.
