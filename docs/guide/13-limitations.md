---
title: Limitations
---
hippsim is for exploring, teaching and comparing published models on real cells; its results are model predictions, not fits to recordings.

- The Hodgkin–Huxley model uses one channel density for every cell, chosen so typical cells fire; it is not cell-type specific.
- NEURON and Brian2 results in the app are precomputed baselines; manipulations run in hippsim, with a script to rerun them elsewhere.
- The Migliore and research models were written for CA1 pyramidal cells; on other cell types they are a what-if.
- Circuit input numbers and rates are model choices. The population is a scaled Brunel network, so the boundaries between his regimes shift.
- NEURON's extended impedance with Iₕ disagrees with the reference engine (known issue, see Validation).
