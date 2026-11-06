# ir_ladder: interleaved single-spike / burst resonance, from LIF to biophysics

Reproduction toolkit for Ceballos, Chadly, Lowet & Pena (2025) *PLoS Comput Biol* 21:e1013126.

| Module | Contents |
|---|---|
| `params.py` | Paper Table 1, lab-code and "hybrid" gating readings; `AMBIGUITIES` lists every open question |
| `fast.py` | numba kernels (N neurons in parallel): two-point LIF, GLIF 1–5 (Teeter 2018), AdEx, biophysical 2-compartment HH |
| `run.py` | `run(model, P, N, T, Iapp, A1, f1, A2, f2, site, D, ...)` |
| `analysis.py` | paper analysis: events split at ISI < 14 ms, first spike counted; SS/BS resonance, Δf, ΔA |
| `reduce.py` | full linearisation (Jacobian → impedance), derivative conductances (Pena et al. 2018), 2-D reduction |
| `models.py` | plain-numpy reference versions (slow; used to cross-check the kernels) |

Checks (`python validate.py`):
- soma equations reproduce Golomb 2006 Fig 6Da spike times exactly (67 spikes);
- single-compartment g_NaP sweep reproduces the paper's Fig 1 trend (bursts from g_NaP ≈ 0.35);
- full linear impedance matches small-signal simulation;
- the Iₕ kinetics, reversal (−32.9 mV) and the 2-compartment structure follow the lab's `HHca2` class
  (github.com/HanLabBU/Lowet-Cell-Reports-2023, `ca1.ipynb`), which the 2025 paper cites as its model basis.

Default reading `gating='hybrid'`: θp = −35 (Table 1; needed with g_NaP 0.9), all other gates from the lab code.
Requires numpy, scipy, numba.

## Scripts
- `scripts/paper_fig3_sweep.py`: f_SS / f_BS against g_NaP, g_Kdr, g_h (hybrid reading). Results in `sweep2_results.json`.
- `scripts/fit_reduced_models.py`: fits AdEx and GLIF to the HH model (`fit.py`). Results in `fit1_results.json`.

## Reproduction status (hybrid reading)
- Reproduced: interleaving (bursts 8–20 Hz, single spikes in gamma), f_SS > f_BS for all g_h, bursting onset at g_NaP ≈ 0.35 (Fig 1).
- Not reproduced: the Δf sign reversals with g_NaP and g_Kdr, and ΔA < 0. Likely depends on θp, input site and DC level (see AMBIGUITIES).
- `scripts/settings_sensitivity.py`: Fig 3 trends under other readings (dendrite-only input; HHca2 Iₕ settings; θp −47 with g_NaP ≈ 0.3).
- `scripts/network_ablation.py` + `ir_ladder/network.py`: toy CA1 circuit (PYR / PV / OLM, EC theta, CA3 gamma) and ablations.
- `scripts/silence_before_burst.py` + `analysis.silence_burst_probability`: Figs 6–7 (P(burst | preceding silence), θ only / γ only / θ+γ).

Findings: dendrite-only input nearly abolishes bursts; θp −47 with g_NaP ≈ 0.3 restores the g_NaP dependence and ΔA < 0 at low g_Kdr;
γ alone → single spikes after < 50 ms silences, θ alone → bursts only after ≥ 50–100 ms, θ+γ ≈ θ alone (paper Fig 7, qualitatively).
