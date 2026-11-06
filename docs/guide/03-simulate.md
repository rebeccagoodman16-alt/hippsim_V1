---
title: The Simulate panel
---
Simulate opens beside the 3D cell and runs in four steps: choose, baseline, manipulate, save. Nothing opens another page.

## 1. Choose
- **Scale**: *Single cell* (this reconstruction), *Circuit* (this cell receiving synaptic input), *Population* (a network of point neurons).
- **Model**: the models available for this cell at that scale ([Models](#models)). The research model is offered on CA1 pyramidal cells only.
- **Run in**: for Hodgkin–Huxley, *hippsim*, *NEURON* or *Brian2*. Other models run in hippsim; the panel names the original simulator.

## 2. Baseline
**Run baseline** runs the model with its published or documented values. You get:
- the **trace** (soma voltage; the electrode site too, when moved; a raster and population rate for networks);
- a **result line** (spikes, first-spike latency, rate; bursts for the research model; θ phase for the circuit; rate, ISI CV and synchrony for networks);
- the **baseline values and sources**;
- the **voltage on the 3D cell**, played back over the run. Click the trace to scrub; hover a branch for its voltage.

Choosing NEURON or Brian2 shows that engine's baseline trace (computed with the same model, see [Validation](#validation)) beside hippsim's.

## 3. Manipulate
**Manipulate the baseline** opens the controls:
- **Drug buttons** set a published manipulation (hover for the source); press again to undo.
- **Sliders** for current, channel densities, synapses or network parameters.
- **Electrode** (step models): tap *tap a branch to move it*, then a branch on the cell.
- Changed values turn red in the baseline list; *back to baseline* resets them.

Each **Run** is drawn over the baseline trace, with the baseline result beside the new one. With NEURON or Brian2 chosen, manipulations run in hippsim and a script with your settings reruns them in that simulator.

## 4. Save
**Save run** stores the cell, model, simulator, every parameter, the changes from baseline, the result and the plot. See [Saved runs and scripts](#runs).

## The 3D view while simulating
Compartment toggles, colour by compartment, distance or **voltage**, Details (beside the panel on large screens), screenshot and video all stay available. With voltage colouring on, **Video** records the run playing while the cell turns.
