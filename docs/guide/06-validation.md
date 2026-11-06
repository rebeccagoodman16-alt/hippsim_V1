---
title: Validation
---
hippsim's Hodgkin–Huxley solver gives NEURON's spike count exactly on {NEURON_SAME} of {N_CELLS} cells and within one spike on {NEURON_1}; Brian2 matches on {BRIAN_SAME} and {BRIAN_1}. Every cell was run in all three engines with the same model (0.5 nA, 300 ms step at the soma) by `tools/engine_check.py`.

| Comparison (spike counts) | Same count | Within ±1 spike |
| --- | --- | --- |
| hippsim vs NEURON 9.0.2 | {NEURON_SAME} / {N_CELLS} | {NEURON_1} / {N_CELLS} |
| hippsim vs Brian2 2.11 | {BRIAN_SAME} / {N_CELLS} | {BRIAN_1} / {N_CELLS} |

The gaps come from discretization: hippsim ≤ 20 µm compartments, NEURON d_lambda 0.1, Brian2 one compartment per traced segment. They are largest in cells near depolarization block, where a small difference in input resistance decides between repetitive firing and a single spike.

## Detailed comparison: hippsim vs NEURON

Spike counts alone hide *why* two simulators differ. `tools/compare_engines.py` runs the same Hodgkin–Huxley model on every cell in NEURON 9 and in hippsim's engine and records, for each:

- voltage at the soma, the axon initial segment (axon point nearest 30 µm) and apical (or basal) dendrites at ~100 and ~300 µm;
- resting potential, peak, spike count, first-spike latency, threshold (where dV/dt rises above 10 mV/ms before the first spike) and maximum dV/dt;
- soma Na⁺ and K⁺ currents;
- membrane area per compartment type, number of compartments, passive input resistance and time constant (−0.05 nA, channels off);
- the set-up: equations, conductance densities, units, reversal potentials, temperature, stimulus, initial conditions, time step and integration method, each marked same or different;
- the first time the soma traces are more than 1 mV apart.

Then it changes **one thing at a time** in either simulator (finer compartments, NEURON's soma area, NEURON's soma–dendrite junction, the cleaned SWC, NEURON's own geometry after Import3d) and reports the spike count of each. Nothing is tuned: the published / default parameters are kept and the differences are documented. Open any cell, **Simulate → Validated → Compare hippsim and NEURON in detail** to see the traces overlaid.

| Result over {CMP_N} cells | |
| --- | --- |
| Same soma spike count | {CMP_SAME} / {CMP_N} |
| Different count | {CMP_DIFF} |
| … of which NEURON's count is reproduced by joining dendrites to the soma as NEURON does | {CMP_JOIN} |
| … by running hippsim on NEURON's geometry | {CMP_GEOM} |
| … by finer compartments (≤ 5 µm) alone | {CMP_FINE} |
| … by none of the single changes | {CMP_NONE} |
| Within ±1 spike | {CMP_W1} / {CMP_N} |
| Passive input resistance, hippsim vs NEURON: median / largest difference | {CMP_RIN_MED} % / {CMP_RIN_MAX} % |
| hippsim's input resistance lower than NEURON's (by > 1 %) | {CMP_RLOW} / {CMP_N} |

What this shows: finer compartments almost never change either simulator's count (both are close to converged) and giving hippsim NEURON's soma area changes none, so the differences come from how the reconstruction's geometry is turned into compartments, chiefly where dendrites join the soma, zero-length points, and how NEURON's Import3d repositions soma-attached branches. hippsim usually has slightly more membrane and a lower input resistance, so near-threshold cells fire a little less. In {CMP_NONE} cells ({CMP_NONE_IDS}) no single change restores NEURON's count; most are CA3 reconstructions where hippsim's input resistance is 10–30 % lower. Combinations of the changes, and how each simulator represents multi-point somata, have not been tested yet. Each cell's own comparison is in the app.

### Worked example: CA3 pyramidal cell l24b

[Open this comparison in the app →](index.html#ca3-l24b?model=hh&test=step&pv=valid&cmp=1)

hippsim fires no spike for the 0.5 nA step; NEURON fires one (10.6 ms after onset). Equations, densities, reversal potentials, temperature, stimulus, initial state and time step are the same, and the soma area is identical (2 030.6 µm²). The difference is geometric:

- the reconstruction has 7 branches attached to the soma, and one of them starts inside the soma;
- hippsim's cable model starts each soma-attached branch at the soma centre, so it adds membrane between the centre and the branch's first point and keeps the part of a dendrite that lies inside the soma; NEURON's Import3d starts the branch at its first point and trims it;
- hippsim's basal membrane is 35 208 µm² against NEURON's 31 072 µm², and its passive input resistance is 31.4 MΩ against 34.1 MΩ (8 % lower);
- this cell sits just at threshold, so 8 % less input resistance is enough to stop the spike.

| Diagnostic run | Soma spikes |
| --- | --- |
| NEURON (default) | 1 |
| hippsim (default) | 0 |
| hippsim, compartments ≤ 5 µm | 0 |
| hippsim, NEURON's soma area | 0 |
| NEURON, d_lambda 0.02 | 1 |
| hippsim, dendrites joined at the soma as in NEURON | 1 |
| hippsim on the cleaned SWC | 1 |
| hippsim on NEURON's geometry | 1 |

So the discrepancy comes from the soma–dendrite junction convention, not from the channel equations or the integrator. hippsim's default is unchanged; the NEURON convention is available as an option of the engine (`somaJoin: 'neuron'`). A remaining ~2 500 µm² of basal area is not fully explained and comes from how Import3d repositions the first points of soma-attached dendrites.

| Other checks | Result |
| --- | --- |
| Model checks (`tools/validate_models.py`) | Passive and spiking checks against NEURON and the numpy reference engine; one known issue (NEURON's extended impedance with Iₕ) |
| All SWC files build in NEURON (Import3d) | 87 / 87, each with a passive input-resistance check |
| Browser tests | Presets, saved runs, user flows, accounts and the Neurons viewer, at web and phone widths |
| Page audit | Links, layout and accessibility basics on every page |
| Citations | DOIs checked against Crossref / OpenAlex |

Full record, per-cell table and per-tool checks: [Validation & provenance](validation.html) and `VALIDATION.md`.
