# Release notes

## 0.14 · 5 Nov 2026
- **Start from a question**: eight biological questions (excitability, Iₕ, resonance, back-propagation, distal input,
  Aβ-like A-type loss, bursting, feedforward inhibition). Each picks the neuron and the model, says why, gives the
  wet-lab equivalent and what to expect (with its sources), runs it, explains the result in plain terms, and applies
  the drug in one click to compare. On the Neurons page, in Simulate, and as a Docs page.
- **App menu inside a neuron**: a Menu handle on the bottom bar pulls up Neurons · Runs · Tools · Models · Docs
  (or hover the bottom edge, or press M).
- **How hippsim works**: an intro page, shown once on the first visit and linked from the Neurons page and footer.
- **Docs ↔ app links**: every model and test in the docs opens in the app; the app links back to the model's docs.
- Repository files (YAML, JSON, Markdown, CSV) open inside the app with Back; the installed app offers a Reload when
  a new version is ready (Display → Check for updates).

## 0.13 · 5 Nov 2026
- **Where this comes from**: five rows under every simulation separate what is measured from what is modelled:
  experimental morphology (identity, archive, reconstruction ID, papers, how it was traced, and what hippsim
  estimated or changed), the published model (each mechanism with its original reference, passive values with
  sources, channel distribution across soma, AIS, axon, basal, trunk, obliques and tuft), what was adapted for
  this cell, what is being tested (every value and assumption) and what has been validated. Unknown sources
  are labelled *unspecified*.
- The Migliore option is now **Migliore-derived CA1 channel model**; on any cell other than a CA1 pyramidal
  cell it is flagged as a CA1-derived parameterization that is not validated for that cell type.
- **Show explanations on hover** (Display): models, tests, channels, sliders, branch tools and cell parts
  explain themselves on hover or tap. Cards are short either way; Details holds the full text.
- **hippsim vs NEURON, in detail**: for every cell, the same Hodgkin–Huxley model in both simulators with
  traces at the soma, AIS and two dendritic sites, rest / peak / spikes / latency / threshold / max dV/dt,
  Na⁺ and K⁺ currents, set-up equivalence, membrane area and compartments, passive R_in and τ, where the
  traces diverge, and one-change-at-a-time diagnostics (`tools/compare_engines.py`). Nothing is tuned.
  Finding for CA3 l24b (hippsim 0 spikes, NEURON 1): the soma–dendrite junction convention, not the
  channel equations; documented on the Validation page. hippsim's default is unchanged.

## 0.12 · 5 Nov 2026
- **Tests**: choose the experiment before running. Current step, F–I curve, Iₕ sag and input resistance,
  back-propagating spike (peak vs distance, cell coloured by peak voltage), clustered tuft input, scattered input,
  theta-burst, resonance (ZAP impedance), and θ + γ drive for the research model. Each has its own baseline,
  plot and readout table; manipulated runs are shown next to the baseline values.
- **Everything is manipulable again**, grouped: every channel, where channels are (soma, basal, apical, axon),
  distance gradients, passive properties (R_m, R_a, C_m, rest, spines), temperature, and the test's stimulus.
  All the Neuron lab's presets are back (incl. Aβ-like A-type × 0.5, uniform densities, Na⁺ + K_dr only).
- **Branch tools**: electrode, probe, synapse, local TTX, block A-type, block Iₕ, make passive, cut, applied by
  tapping the cell; listed and removable.
- Saved runs keep the test and the branch marks, and reopen with them.

## 0.11 · 5 Nov 2026
- **Docs** in the menu and the tab bar: overview, quick start, the Simulate panel, models, equations and numerics,
  validation, cells and data, saved runs and scripts, tools, sharing and accounts, developers, citing, limitations,
  release notes. Searchable; equations render offline in the installed app.
- The Models page of the docs is generated from the code the Simulate panel runs (`site/hs-models.js`): every
  parameter's baseline and range, every manipulation and its source.
- Simulate panel: *How this model works* links to that model's documentation.

## 0.10 · 5 Nov 2026
- **Simulate is one panel**, beside the 3D cell: choose the scale, the model and the simulator, run the baseline, then
  manipulate it. Nothing opens another page.
  - *Single cell*: Hodgkin–Huxley (runs in hippsim, NEURON or Brian2), Migliore 2005 CA1 channels (the Neuron lab's
    model), and your research model (Golomb I_M + I_NaP on the Migliore dendrites, θ + γ input; CA1 pyramidal cells).
  - *Circuit*: this cell with θ-modulated excitatory synapses on its dendrites and feedforward inhibition at the soma.
  - *Population*: Brunel (2000) E–I network of 5 000 integrate-and-fire neurons, with its four parameter sets.
  - Every model shows its baseline values and sources, offers drug and model manipulations, and draws each run over
    its baseline. The 3D cell shows the voltage of every compartment.
- NEURON and Brian2: every neuron's HH baseline was run in both (`tools/engine_check.py`); choosing NEURON or Brian2
  shows that trace next to hippsim's. Scripts carry your settings (current, channels, electrode site; g and ν for the
  network). NEURON and Brian2 scripts drop zero-length points and 0-diameter radii, so every cell runs.
- The Migliore and research models run on the Little Neural Guide engine (`site/hs-ngc.js`, copied at build time).

## 0.9.1 · 5 Nov 2026
- **Simulate starts with the baseline.** Simulate runs the cell's baseline at once and lists its values and sources
  (stimulus, electrode, channel densities, passive properties, references). **Manipulate the baseline** opens the
  controls: TTX, TEA, passive or active dendrites, current, electrode site, channel sliders. Changed values turn red,
  and each run is drawn over the baseline trace with the baseline spike count beside it.
- Everything from the 3D view still works while simulating: compartment toggles, colour by compartment, distance or
  **voltage** (with a scale), hover for the voltage at any branch, Details alongside on large screens, screenshot,
  and Video (it records the run playing while the cell turns).

## 0.9 · 5 Nov 2026
- **Neurons is the home page.** Pick a cell and it opens full screen in 3D.
- **Simulate in place**: press Simulate and a panel opens beside the cell. Set the current, press Run, and the voltage
  trace appears while the voltage plays across the dendrites. Tap a branch to move the electrode there. Channels,
  Save run and NEURON / Brian2 scripts are in the same panel. The in-browser engine is new (`hs-cable.js`); it gives
  the same spike counts as NEURON on the test cells.
- Saved atlas runs reopen from Runs into the same cell, current and electrode.
- Less on screen: the menu is now Neurons · Runs · Tools · Models; guided steps and step locks are removed;
  Web / Phone moved into Display.

## 0.8 · 5 Nov 2026
- **Guided steps** (on by default; Display → Guided steps). Every tool walks you through Baseline → Run → Change →
  Save with one specific instruction at a time, docked at the bottom of the screen. Later steps stay locked: the
  simulation is locked until you confirm the baseline, controls until you have run it once, Save until you have
  changed one thing and run again. The tool's own run button is named and highlighted. After saving: open Runs,
  reset and try another change, or go to the next tool.
- **Atlas** follows the same pattern: 1 choose a neuron → 2 look at it (rotate, name a branch, open Details) →
  3 what to simulate → 4 how to run it (browser, NEURON or Brian2). Each step unlocks the next.

## 0.7 · 5 Nov 2026
- **Neuron atlas** (`atlas.html`): only neurons, grouped by region, with type-ahead search. Pick one and it opens
  full screen in 3D: rotate, zoom, hover or tap a branch for its compartment, path distance, diameter and
  approximate layer; turn soma, basal, apical trunk, obliques, tuft and axon on and off; colour by distance.
- Details sidebar: lengths and diameters per compartment, branch density, Sholl profile, passive NEURON check.
- Screenshot (PNG, 1920×1080) and an 8-second rotation video, both labelled with the cell and its source.
- **Simulate my neuron**: single cell, dendritic signals, circuit or population, in the browser or as a ready
  NEURON / Brian2 script with the cell's SWC (scripts tested: NEURON and Brian2 agree, 16–23 spikes per 0.5 nA step).

## 0.6 · 5 Nov 2026
- **Cells & data** rebuilt as a cell explorer: tag filters with counts, a page per cell (measurements,
  passive NEURON check, citation, simulate / 3D / SWC), similar cells.
- Colour palettes: Rose, Slate, Sage and High contrast (colour-blind-safe cell colours); each works light or dark.
- Citations: all 80 DOIs checked against Crossref / OpenAlex. Fixed a wrong DOI (Eyal et al. 2016 cell) and three
  preprints now published (Winnubst 2019, Peng 2021, Takemura 2024); added DOIs for Hu 2002 and Wang 2020.
- Six Amaral-archive CA3 cells re-imported without the layer contour lines drawn in their files.
- About page (how to use, legend, citing, data sources); footer with version and how to cite on every page.
- Storage adapter so the app can run with Google sign-in on its own host (`docs/ACCOUNTS.md`).

## 0.5 · 4 Nov 2026
- 27 published hippocampal reconstructions from ModelDB (4 CA1, 16 CA3, 7 dentate granule cells), each with a
  passive NEURON check.
- Browser engine: distal apical K_dr now applied; spike counts match NEURON below depolarization block.
- Tool tabs have real addresses; equations render offline; one full-screen button per cell.
- New tests: end-to-end flows and a page audit at web and phone widths.

## Earlier
- Runs saved online with folders, move and delete; Web / Phone switch; installable phone app (offline);
  validation and provenance for every model and cell; RO-Crate run export; literature perturbation presets.
