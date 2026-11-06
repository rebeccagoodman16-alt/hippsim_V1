# sources/ — everything pulled from the artifacts, organized

Pulled 2026-11-02 from 8 artifacts (168 files, ~25 MB). Rebuild with `python tools/organize_sources.py`.

| Folder | What it is | Edit? |
|---|---|---|
| `raw/<artifact>/` | Untouched snapshots, byte-identical (sha256 in `MANIFEST.csv`) | Never |
| `extracted/` | Model code, data, references pulled out of the snapshots | No — port into `hippsim/`, don't edit here |
| `MANIFEST.csv` | One row per raw file: artifact, sha256, status, category, destination | Generated |
| `artifacts.json` | Artifact titles, URLs, versions pulled | Generated |

**Status counts:** 48 extracted · 9 reference (project notes/results to consult) · 111 excluded (lesson prose, site UI, study tools, teaching images — kept in `raw/`).

## Source artifacts

| Artifact | Files | Role |
|---|---|---|
| Little Neural Guide | 149 | Main source: models, morphologies, connectomes, fitting, ML, bibliography |
| CA1 Morphology Lab | 1 | Hines engine + I_h gradient + impedance (your validated morphology model) |
| CA1 Resonance · Home | 12 | Project hub: two-compartment quasi-active port, guided experiments, notes, 6 figures |
| CA1 Resonance Lab | 1 | Earlier lab: g_h sweep results (minimal vs as-printed readings) |
| Neurodynamics Lab | 1 | HH, Brunel, Wilson–Cowan, STDP, MLP core |
| Neuron Morphology Atlas | 2 | 59 reconstructions with morphometrics (superset of the Guide's CA1 set) |
| Giant Fiber Axon Inputs | 1 | GF compartments + axonal input data |
| CA1 Graphical Abstract | 1 | Design only (excluded) |

## extracted/ — inventory and port target

### Python (`extracted/python/`)
| File | Content | → hippsim |
|---|---|---|
| `ir_ladder/` (package, 9 modules) | Ceballos et al. 2025 toolkit: 2-pt LIF, GLIF1–5, AdEx, 2-comp HH CA1, linearization, reduction, fitting, PYR/PV/OLM network | `models/lab/rebecca/ceballos2025_ladder/` |
| `ir_ladder/scripts/` (5) | Fig 3 sweep, reduced-model fits, network ablation, settings sensitivity, silence-before-burst | `experiments/` recipes |
| `ir_ladder/validate.py` | Golomb 2006 Fig 6Da (67 spikes), Fig 1 trend, linear-impedance check | `tests/validation/` |

### Model code, JS (`extracted/js/models/`) — to be ported to Python/NEURON/Brian2
| File | Content | → hippsim |
|---|---|---|
| `ca1_morphology_lab_engine.js` | Hines solver, I_h gradient, Traub Na/K, M-current, quasi-active impedance | **ported** (`engines/reference_cable.py`, `engines/neuron_cell.py`) |
| `ca1_twocomp_quasiactive_impedance.js` | Two-compartment CA1 impedance (port of `ca1_reduced`) | `cells/` + tests |
| `core_hh_brunel_wilsoncowan_stdp_mlp.js`, `neurodynamics_lab_core.js` | HH, Brunel E–I, Wilson–Cowan, STDP, MLP | `models/literature/` (Brian2) |
| `workbench_neuron_engine.js` | 10-channel library, LIF/AdEx/Izhikevich/conductance cell, 21 presets | `mechanisms/` + baselines |
| `workbench_synapse_engine.js` | AMPA, NMDA (Mg block), GABA_A, GABA_B, STP, plasticity | `mechanisms/` synapses |
| `workbench_phase_plane.js` | Morris–Lecar, FitzHugh–Nagumo, normal forms, nullclines | `analysis/phase_plane` |
| `hippocampal_loop_reduced_spiking.js` | Reduced EC→DG→CA3→CA1 spiking loop | `models/` network |
| `atlas_signal_flow.js`, `atlas_network_page.js`, `real_cells_connected.js` | Signal flow through networks of real reconstructions | `networks/` |
| `swc_loader.js`, `verification_helpers.js` | SWC parsing; NEURON cross-check helpers | done in `morphology/io.py`; tests |
| `ap_stochastic_patch_and_cable.js` | Stochastic HH patch, myelinated/unmyelinated cable | `models/literature/` |
| `muscle_sarcomere_ec_coupling.js`, `nmj_*.js` | Sarcomere/EC coupling; mammalian NMJ, repetitive stimulation | `models/literature/nmj_muscle/` |
| `giant_fiber_axon_inputs.js` | Drosophila GF compartments + inputs | `models/lab/rebecca/giant_fiber/` |

### Experiments, fitting, ML (`extracted/js/experiments|fitting|ml/`)
| Group | Files | → hippsim |
|---|---|---|
| Experiments | patch clamp → fit → validate; place cells during navigation; CA1 circuit layers & pathways; CA1 morphology guided experiments | `protocols/` + `experiments/` |
| Fitting (F1–F5) | loss landscape/identifiability; f–I (LIF, bootstrap); model comparison; place field (Poisson ML); Wilson–Cowan rhythm features | `analysis/fitting` |
| ML (M1–M6 + 3) | nodes/edges, backprop, gradient descent, RNN dynamics, mean-field bridge, learning rules, connectome graph, network sandbox, hippocampal memory decoding | `models/literature/ml/` |

### Data (`extracted/data/`)
| File | Content |
|---|---|
| `morphologies/atlas_59_cells.json` | **59 reconstructions** + metadata: CA1 (17), DG (8), CA3 (5), CA2, subiculum, EC (4), septum, neocortex (6), thalamus, cerebellum, striatum, OB, retina, spinal/cat motor neurons, *Drosophila* (6 incl. GF from MANC) |
| `morphologies/guide_*.json`, `ca1_jarsky_lab.json` | The Guide's CA1/hippocampal subsets; Jarsky cell used by the Morphology Lab |
| `morphologies/guide_neuromorpho_atlas.json` | 40 NeuroMorpho/Allen/MouseLight/SEU cells + atlas table |
| `connectomes/giant_fiber_manc_synapses.json` | GF (DNp01, MANC v1.2.1) synapses + partners — your gf_axo-axonic pipeline |
| `connectomes/celegans_cook2019.js` | *C. elegans* chemical + electrical connectome (JS literal) |
| `atlas/allen_ccf_v3_meshes_mouselight.json` | Allen CCFv3 meshes + MouseLight whole-brain neurons |
| `results/bap_neuron_migliore2005.json` | NEURON bAP results on 5 real CA1 cells + validation vs original hoc |
| `results/neuron_passive_check_atlas.json` | NEURON passive cross-check for 51 atlas cells (attenuation, transfer Z) |

### References and figures
- `references/bibliography.json` — 118 verified references (Crossref/PubMed checked).
- `references/notebook_index.json` — Guide page → Colab notebook map (repo `neural-guide-notebooks`; not reachable from here).
- `figures/ca1_resonance/` — 6 project figures.

## Reference-only (in `raw/`, consult, not code)
CA1 Resonance Home `index/paper/reproduce/log.html` (aims, findings, parameter tables, reproduction status, research log); CA1 Resonance Lab (g_h sweep results); Guide `spatial.js`, `realbio.js`, `textbook-data.js`, `lab-equations.js`.

## Gaps (not in any artifact)
- `ca1_morph.py`, `ca1_reduced.py`, `hd.mod`, `ca1_jarsky.swc`, `CA1_morphology_lab.ipynb` — sent as chat files, never published. Rebuilt from the JS engine (numbers match: R_in 66.0 MΩ, rest −63.4 mV).
- `neural-guide-notebooks` repo — private/unpublished; not reachable.
- Brian2 sweep notebooks (Brunel g–η) — live in your Brunel project, not in artifacts.
