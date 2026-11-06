---
title: The Simulate panel
---
Simulate opens beside the 3D cell: choose the scale, the model and the test, run the baseline, then manipulate anything. Nothing opens another page.

## 1. Choose
- **Scale**: *Single cell* (this reconstruction), *Circuit* (this cell receiving synaptic input), *Population* (a network of point neurons).
- **Model**: the models available for this cell ([Models](#models)). The research model is offered on CA1 pyramidal cells only.
- **Test**: the experiment to run. Single-cell models offer up to eight:

| Test | What it measures |
| --- | --- |
| Current step | Firing pattern, first-spike latency, rate, adaptation |
| F–I curve | Rate vs current: rheobase and gain |
| Iₕ sag and input resistance | Input resistance, sag ratio, rebound |
| Back-propagating spike | Peak depolarization vs distance from the soma; the cell coloured by peak voltage |
| Clustered tuft input | Distal AMPA + NMDA synapses: dendritic vs somatic response |
| Scattered dendritic input | Synapses over the whole tree |
| Theta-burst | 4 × 4 pulses: how many fire a spike |
| Resonance (ZAP) | Impedance vs frequency, resonance frequency, Q |
| θ + γ drive (research model) | Single spikes vs bursts, with the drive at the soma, radiatum or tuft |

- **Run in**: for the Hodgkin–Huxley current step, *hippsim*, *NEURON* or *Brian2*. Everything else runs in hippsim; the panel names the original simulator.

## 2. Baseline
**Run baseline** runs the model and test with their documented values. You get the plot (voltage traces, an x–y curve, or a raster), a one-line result, a **readout** table and, folded below, the **baseline values and sources**. The voltage (or peak voltage) plays across the 3D cell.

## 3. Manipulate
**Manipulate the baseline** opens everything, grouped:
- **Published manipulations**: drug and model presets (TTX, TEA, 4-AP, ZD7288, XE991, Aβ-like A-type reduction, passive dendrites, uniform densities, room temperature, …). Hover for the source; press again to undo.
- **Branch tools**: pick one, then tap a branch: *Electrode* (where current goes), *Probe* (record there), *Synapse* (AMPA + NMDA at 10 ms), *Local TTX*, *Block A-type*, *Block Iₕ*, *Make passive*, *Cut*. Blocks apply from that point outward. Each mark is listed and can be removed.
- **Grouped sliders**: *Stimulus* (the test's own settings), *Channels*, *Where channels are* (soma, basal, apical, axon), *Gradients*, *Passive* (R_m, R_a, C_m, rest, spines), *Temperature*. Each group shows how many values changed.

**Run** draws the new result over the baseline; the readout shows both columns, with changed values highlighted. *back to baseline* resets everything.

## 4. Save
**Save run** stores the cell, model, test, simulator, every value, every branch mark, the changes from baseline, the readout and the plot. See [Saved runs and scripts](#runs).

## The 3D view while simulating
Compartment toggles, colour by compartment, distance, **voltage** (played over time) or **peak V**, Details (beside the panel on large screens), screenshot and video all stay available. Cut branches turn grey.
