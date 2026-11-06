---
title: Cells and data
---
hippsim holds 87 published reconstructions, each with its source paper, archive record and a passive NEURON check.

| Archive | Cells |
| --- | --- |
| ModelDB (traced model geometry) | 49 |
| NeuroMorpho.Org | 23 |
| Janelia MouseLight | 6 |
| Allen Cell Types | 3 |
| FANC (fly nerve cord) | 3 |
| Janelia hemibrain | 2 |
| MANC (fly nerve cord) | 1 |

- Most are hippocampal (CA1 22, CA3 21, dentate gyrus 15, plus entorhinal cortex, subiculum and septum); the rest cover neocortex, cerebellum, spinal cord, thalamus, retina and the fly escape circuit.
- Every cell has a DOI or PubMed Central record: `morphologies/provenance.csv`, `morphologies/references.bib`.
- ModelDB geometry is parsed as text from hoc files; no downloaded code is run.
- Edits: six Amaral-archive CA3 cells re-imported without layer contour lines; n130 excluded (its file sets every diameter to 0.2 µm). Scripts drop zero-length points and raise radii below 0.05 µm before building.
- [Cells & data](library.html) lists every cell with measurements, citation and SWC download.
