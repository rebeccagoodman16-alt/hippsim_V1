---
title: Saved runs and scripts
---
A saved run stores everything needed to reproduce it: cell, model, simulator, every parameter, the changes from baseline, the result and the plot.

| Where | What you get |
| --- | --- |
| [Runs](runs.html) | Every saved run, in folders. **Open** restores the cell, model, settings and electrode; move, rename, delete |
| Download (.zip) | `run.json` (all values, baseline vs changed), plots, `references.bib` for the models and cells used |
| NEURON script | Python file + the cell's SWC: the same Hodgkin–Huxley model with your settings (current, Na⁺, K⁺, dendrite density, electrode site) |
| Brian2 script | The same model as a Brian2 SpatialNeuron; or the Brunel network with your g and ν |

Run a script next to its SWC:

```bash
pip install neuron matplotlib        # or: pip install brian2 matplotlib
python ca1-n123_neuron_single.py
```

Each script prints its spike count, so you can compare it with the run in hippsim. Scripts are starting points to edit, not fitted models.
