---
title: How to cite
---
Cite hippsim and the models and cells you used; every saved run's zip carries the references for its model and cell.

- **hippsim**: [CITATION.cff](CITATION.cff) (version {VERSION}). A Zenodo release will add a DOI once the repository is public.
- **Models**: Hodgkin & Huxley 1952, J Physiol 117:500 · Migliore, Ferrante & Ascoli 2005, J Neurophysiol 94:4145 (ModelDB 55035) · Golomb, Yue & Yaari 2006, J Neurophysiol 96:1912 · Brunel 2000, J Comput Neurosci 8:183 · each tool's sources on [Models](models.html).
- **Cells**: the paper on each cell's page (`morphologies/references.bib`); for NeuroMorpho.Org cells also Ascoli et al. 2007, J Neurosci 27:9247.
- **Simulators used for cross-checks**: NEURON (Hines & Carnevale 1997, Neural Comput 9:1179); Brian2 (Stimberg, Brette & Goodman 2019, eLife 8:e47314).

**Methods text you can adapt:**

> Simulations were run in hippsim (v{VERSION}), a browser-based platform that solves the compartmental cable equation on reconstructed morphologies (backward Euler with Hines elimination, dt 0.025 ms). Its spike counts were cross-checked against NEURON 9.0.2 and Brian2 2.11 on 87 cells.
