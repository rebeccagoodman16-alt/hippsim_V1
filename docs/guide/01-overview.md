---
title: What hippsim is
---
hippsim is a browser platform for simulating neurons, from one reconstructed cell to a network, with every baseline value, manipulation and source on record. It runs published models with its own in-browser solver and cross-checks that solver against NEURON and Brian2.

| Layer | What it is | New? |
| --- | --- | --- |
| Equations | Cable equation + published channel and network models (Hodgkin–Huxley 1952, Migliore 2005, Golomb 2006, Brunel 2000) | No: all from the literature |
| Solver | `hs-cable.js` and the NGC engine: implicit compartmental solvers that run in the browser | New implementation of standard methods |
| Platform | 87 real cells in 3D, any model on any cell, baselines with sources, drug manipulations, saved runs, NEURON / Brian2 scripts, cross-engine checks | Yes |
| Research model | Golomb I_M + I_NaP on Migliore 2005 dendrites, θ + γ drive | Lab model built from published parts |

**In one sentence:** a browser-based platform for simulating hippocampal neurons on reconstructed morphologies, with an in-browser compartmental solver checked against NEURON and Brian2. It is not a replacement for NEURON, which is far more general; it makes published models on real cells quick to run, compare and record.

## Where things are

| Menu | What it holds |
| --- | --- |
| **Neurons** (home) | Every cell by region; pick one for the 3D view and the Simulate panel |
| **Runs** | Your saved runs, in folders |
| **Tools** | The model library: 21 tools in five workspaces, 45 literature manipulations |
| **Models** | Every model with its validation and sources |
| **Docs** | This documentation |
