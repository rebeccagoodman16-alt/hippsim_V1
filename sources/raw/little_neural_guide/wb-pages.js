/* ===================== WORKBENCH ROUTES + OVERVIEW =====================
   /workbench/            overview: the four unified models and what each replaces
   /workbench/<slug>/     a workbench (query string = preset + any changed parameter)
   Also tags the body (wb-wide) so workbench pages may use the full width. */
(function () {
  'use strict';
  const WBS = [
    { slug: 'neuron', title: 'Neuron', render: () => window.renderNeuronWorkbench && renderNeuronWorkbench(),
      blurb: 'One cell, any level of detail: LIF → AdEx → Izhikevich → explicit channels (HH, Traub Na⁺/K⁺, M, A-type, Ih, L/T-type Ca²⁺, K(Ca)), one or two compartments, channel noise and temperature.',
      does: ['Traces, currents, gates and [Ca²⁺]', 'f–I curves and rheobase', 'Impedance & resonance (ZAP)', 'Voltage-clamp I–V', 'Full ephys battery (Rin, τ, sag, AP shape)', 'Python export that matches the page'],
      levels: ['LIF', 'AdEx', 'Izhikevich', 'HH', 'CA1-like', '2 compartments'] },
    { slug: 'morphology', title: 'Morphology', render: () => window.renderMorphologyWorkbench && renderMorphologyWorkbench(),
      blurb: 'Any of the guide\'s real reconstructions with one shared set of membrane and channel parameters: measure it, see how passive signals spread, map synaptic efficacy, run back-propagating spikes and compute impedance and resonance across the tree.',
      does: ['Morphometrics, Sholl, compare two cells', 'DC / AC spread, λ and electrotonic distance', 'EPSP map: local vs somatic, by location', 'bAP map and the strong/weak switch', 'Quasi-active |Z|(f) and a resonance-frequency map', 'SWC, JSON and per-compartment CSV export'],
      levels: ['geometry only', 'passive cable', 'Ih quasi-active', 'full active channels'] },
    { slug: 'phase-plane', title: 'Phase plane', render: () => window.renderPhaseWorkbench && renderPhaseWorkbench(),
      blurb: 'Any two-variable system, including your own equations: vector field, nullclines, fixed points with eigenvalues, click-to-launch trajectories and a one-parameter bifurcation diagram.',
      does: ['FitzHugh–Nagumo, Morris–Lecar, reduced HH', 'Izhikevich, AdEx, Wilson–Cowan', 'Saddle-node and Hopf normal forms', 'Type your own dx/dt, dy/dt', 'Euler vs RK4 accuracy', 'Python (SciPy) export'],
      levels: ['normal forms', '2-D neuron models', 'populations', 'custom'] },
    { slug: 'synapse', title: 'Synapse & plasticity', render: () => window.renderSynapseWorkbench && renderSynapseWorkbench(),
      blurb: 'From a fixed current to receptor kinetics: AMPA, NMDA with Mg²⁺ block, GABA_A, GABA_B through its G-protein; short-term depression and facilitation; pair, triplet and calcium-based STDP.',
      does: ['PSPs, clamp currents and conductances', 'NMDA I–V and the NMDA/AMPA ratio', 'Tsodyks–Markram PPR and train responses', 'STDP window and frequency dependence', 'Feedforward inhibition and shunting', 'Python export'],
      levels: ['current-based', 'exponential', 'rise + decay', 'receptor kinetics', 'STP', 'STDP rules'] },
    { slug: 'network', soon: true, title: 'Network', render: () => window.renderNetworkWorkbench && renderNetworkWorkbench(),
      blurb: 'E/I circuits at the zoom you need: Wilson–Cowan rates or spiking LIF networks (current- or conductance-based synapses, delays, heterogeneity, adaptation), with the mean-field prediction drawn on top.',
      does: ['Raster, population rate and spectrum', 'Rate, CV and synchrony χ', 'Brunel regimes (SR, SI, AI)', 'Siegert mean-field prediction', 'Rate ↔ spiking side by side', 'Python export'],
      levels: ['rate model', 'LIF current-based', 'LIF conductance-based', 'heterogeneous', 'adapting'] },
  ];
  window.NG_WORKBENCHES = WBS;
  window.workbenchNavPages = () => [['/workbench/', 'All workbenches'], ...WBS.map(w => ['/workbench/' + w.slug + '/', w.title + ' workbench'])];

  function overview() {
    document.title = 'Workbenches · Little Neural Guide';
    document.getElementById('lesson').innerHTML = `<nav class="breadcrumbs"><a href="/">Home</a> › <span>Workbenches</span></nav>
    <div class="hero wb-hero"><span class="pill">WORKBENCHES · ${WBS.filter(w => !w.soon).length} LIVE${WBS.some(w => w.soon) ? `, ${WBS.filter(w => w.soon).length} COMING NEXT` : ''}</span><h1>One model per idea.<br>Every option in one place.</h1>
    <p class="lead">The guide used to explain the same models on several pages. Each workbench now holds one family of models with every parameter exposed. You choose how much biology to include, measure it the way a lab would, pin runs to compare them, and export Python that reproduces exactly what you see. The lessons still teach each idea step by step and link here when you want the full model.</p></div>
    <div class="wb-cards">${WBS.map(w => `<a class="wb-card" ${w.soon ? 'aria-disabled="true" style="opacity:.6"' : `href="/workbench/${w.slug}/"`}><span class="eyebrow">${w.soon ? 'Coming next' : 'Workbench'}</span><h2>${w.title}</h2><p>${w.blurb}</p><ul>${w.does.map(d => `<li>${d}</li>`).join('')}</ul><div class="wb-levels">${w.levels.map(l => `<span>${l}</span>`).join('')}</div></a>`).join('')}</div>
    <div class="box tan"><h2>How to use a workbench like a lab notebook</h2><ol><li><b>Start from a preset</b> close to your question; its note says what it shows and where its numbers come from.</li><li><b>Change one thing.</b> Every control has a number box for exact values, and the biology of each parameter is written under it.</li><li><b>Pin</b> the run, change the next thing, and compare against the grey ghost.</li><li><b>Measure</b> with the analysis tabs (f–I, impedance, I–V, battery, bifurcation, spectrum) instead of judging traces by eye.</li><li><b>Copy the link</b> to keep or share the exact setup, and <b>export Python</b> to continue in a notebook.</li></ol></div>`;
  }
  const prev = window.renderGuide;
  window.renderGuide = function () {
    const parts = ngPath().split('/').filter(Boolean);
    document.body.classList.toggle('wb-wide', parts[0] === 'workbench' && !!parts[1]);
    if (parts[0] !== 'workbench') return prev.apply(this, arguments);
    sidebar(true);
    const w = WBS.find(x => x.slug === parts[1] && !x.soon);
    if (w) w.render(); else overview();
  };
  // guide.js already rendered the first page with the original router: redo it if we landed on a workbench.
  if (ngPath().startsWith('/workbench/')) { window.renderGuide(); if (window.ngAfterRender) ngAfterRender(); }
})();
