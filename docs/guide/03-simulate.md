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

- Cards show a short title and the essentials (source, channels, temperature). A model whose parameters come from CA1 pyramidal cells carries a warning on any other cell, e.g. *CA1-derived parameters on a CA3 pyramidal cell: not validated for CA3*. **Details** under the tests holds the full description.
- **Run in**: for the Hodgkin–Huxley current step, *hippsim*, *NEURON* or *Brian2*. Everything else runs in hippsim; the panel names the original simulator.

## 2. Baseline
**Run baseline** runs the model and test with their documented values. You get the plot (voltage traces, an x–y curve, or a raster), a one-line result, a **readout** table and **Where this comes from** (below). The voltage (or peak voltage) plays across the 3D cell.

## Where this comes from
Five rows, each opening a panel, keep apart what is measured and what is modelled:

| Row | What it shows |
| --- | --- |
| Experimental morphology | Cell identity, source archive, reconstruction ID, original and source papers, how it was traced; then what hippsim estimated or changed (trunk / obliques / tuft, soma as a sphere, soma–dendrite junction, zero-length points, axon stub) |
| Published model | Each mechanism with its model source and original reference, passive values with their sources, and the channel distribution across soma, AIS, axon, basal dendrites, apical trunk, obliques and tuft. Anything without a known source says *unspecified* |
| Adapted here | How the model was applied to this cell (e.g. a CA1-derived parameterization on a CA3 morphology) and your manipulations |
| Tested computationally | The test, the simulator, every value in this run, and the assumptions (temperature, Q10, time step, discretization, initial state) |
| Validated | What has been checked (same model in NEURON and Brian2, Neuron-lab checks) and what has not (recordings). For any cell: **Compare hippsim and NEURON in detail** overlays the two simulators' traces at the soma, AIS and dendrites with the full metric, set-up and morphology tables ([Validation](#validation)) |

## Explanations on hover
**Display → Show explanations on hover** (on by default). When on, pointing at (or tapping) a model, test, channel, slider, branch tool or part of the cell shows what it is: biological function for channels, anatomical and electrophysiological role for compartments, what is measured for tests. When off, nothing pops up; cards stay short either way, and Details and the rows above keep the full information.

## 3. Manipulate
**Manipulate the baseline** opens everything, grouped:
- **Published manipulations**: drug and model presets (TTX, TEA, 4-AP, ZD7288, XE991, Aβ-like A-type reduction, passive dendrites, uniform densities, room temperature, …). Hover for the source (with explanations on); press again to undo.
- **Branch tools**: pick one, then tap a branch: *Electrode* (where current goes), *Probe* (record there), *Synapse* (AMPA + NMDA at 10 ms), *Local TTX*, *Block A-type*, *Block Iₕ*, *Make passive*, *Cut*. Blocks apply from that point outward. Each mark is listed and can be removed.
- **Grouped sliders**: *Stimulus* (the test's own settings), *Channels*, *Where channels are* (soma, basal, apical, axon), *Gradients*, *Passive* (R_m, R_a, C_m, rest, spines), *Temperature*. Each group shows how many values changed.

**Run** draws the new result over the baseline; the readout shows both columns, with changed values highlighted. *back to baseline* resets everything.

## 4. Save
**Save run** stores the cell, model, test, simulator, every value, every branch mark, the changes from baseline, the readout and the plot. See [Saved runs and scripts](#runs).

## The 3D view while simulating
Compartment toggles, colour by compartment, distance, **voltage** (played over time) or **peak V**, Details (beside the panel on large screens), screenshot and video all stay available. Cut branches turn grey.
