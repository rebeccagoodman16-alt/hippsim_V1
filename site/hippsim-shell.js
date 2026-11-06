/* hippsim simulator shell.
   Runs the Little Neural Guide's own engines and interactive pages unchanged, shows only the
   simulation tools and experiments, and replaces the learning-path navigation with a tool index.
   Loaded last, after every Guide script. */
(function () {
  'use strict';

  /* Tool index: [group, [[route, name, what it does], ...]] — every route is a live Guide page. */
  const TOOLS = [
    ['Neuron studio', [
      ['/biology/cell-atlas/', 'Cell atlas (3D)', 'Rotate, compare and inspect every reconstruction'],
      ['/workbench/morphology/', 'Measure & signals', 'Morphometrics, Sholl, EPSP maps, bAPs, impedance across the tree'],
      ['/biology/neuron-lab/', 'Channels & simulation', 'Place channels, synapses and probes; inject current; run protocols'],
      ['/biology/circuit-builder/', 'Circuit builder', 'Wire real cells into circuits and stimulate them'],
      ['/biology/neuron-viewer/', 'Neuron viewer', 'Full-screen 3D viewer with rotation videos'],
    ]],
    ['Workbenches', [
      ['/workbench/neuron/', 'Neuron', 'LIF, AdEx, Izhikevich, conductance-based; 10 channels, 21 presets'],
      ['/workbench/synapse/', 'Synapse & plasticity', 'AMPA, NMDA, GABA_A/B, short-term plasticity, STDP'],
      ['/workbench/phase-plane/', 'Phase plane', 'Any 2-D system: nullclines, fixed points, bifurcations'],
    ]],
    ['CA1 research', [
      ['/biology/interleaved-resonance/', 'Interleaved resonance', 'Ceballos et al. 2025 ladder: LIF → GLIF → AdEx → HH'],
      ['/biology/dendritic-resonance/', 'Dendritic resonance', 'I_h gradient and resonance in real CA1 cells'],
      ['/biology/active-dendrites/', 'Active dendrites', 'Back-propagating APs on real reconstructions'],
      ['/biology/ca1-bursting/', 'CA1 bursting', 'Burst firing mechanisms'],
      ['/biology/axo-axonic/', 'Axo-axonic inhibition', 'Chandelier cell control of the AIS'],
      ['/biology/research-ca1-cell/', 'CA1 cell model', 'Research: the biophysical CA1 cell'],
      ['/biology/research-resonance/', 'Resonance', 'Research: resonance measurements'],
      ['/biology/research-spiking/', 'Spiking', 'Research: spiking and bursting'],
      ['/biology/research-reduction/', 'Reduction', 'Research: linearization and reduced models'],
      ['/biology/research-reproduction/', 'Reproduction', 'Research: paper reproduction status'],
      ['/biology/research-morphology/', 'Morphology', 'Research: full-morphology extension'],
      ['/biology/research-circuit/', 'Circuit', 'Research: PYR / PV / OLM circuit'],
      ['/biology/research-place-fields/', 'Place fields', 'Research: spatial coding'],
      ['/biology/research-lowet-2023/', 'Lowet 2023', 'Research: HHca2 model basis'],
      ['/biology/research-code/', 'Code', 'Research: code and files'],
    ]],
    ['Experiments', [
      ['/experiments/ephys/', 'Patch clamp → fit → validate', 'Record a CA1-like cell, fit a model, test it'],
      ['/experiments/place-cells/', 'Place cells', 'Navigation, place fields, phase precession'],
      ['/experiments/ca1-circuit/', 'CA1 circuit', 'Layers, generated morphologies, pathways'],
      ['/biology/network/', 'Hippocampal network', 'Signal flow EC → DG → CA3 → CA1'],
      ['/biology/real-circuit/', 'Real cells, connected', 'Networks built from reconstructions'],
      ['/biology/whole-brain/', 'Whole brain', 'Allen CCF and MouseLight neurons'],
      ['/practice/ca1-workspace/', 'CA1 workspace', 'Input location, axial current and soma together'],
    ]],
    ['Model lab', [
      ['/lab/hh/', 'Hodgkin–Huxley', 'Biophysical neuron, f–I, blockers'],
      ['/lab/brunel/', 'Brunel network', 'Sparse E–I network, g–η regimes'],
      ['/lab/wilson-cowan/', 'Wilson–Cowan', 'Population rates and oscillations'],
      ['/lab/stdp/', 'STDP', 'Spike-timing-dependent plasticity'],
      ['/lab/neural-network/', 'Neural network', 'Multilayer perceptron'],
    ]],
    ['Morphology labs', [
      ['/morphology/branching-lab/', 'Branching lab', 'Tapered tree, obliques, attenuation'],
      ['/morphology/branch-points/', 'Branch points', 'Impedance mismatch at branches'],
      ['/morphology/compartment-balance/', 'Compartment balance', 'Current balance per compartment'],
      ['/morphology/discretization/', 'Discretization', 'd-λ rule and convergence'],
      ['/morphology/propagation/', 'Propagation', 'Signals along the cable'],
      ['/morphology/active-dendrites/', 'Active dendrites', 'Active conductances in the tree'],
      ['/morphology/reconstructions/', 'Reconstructions', 'Real traced cells'],
    ]],
    ['Other systems', [
      ['/biology/giant-fiber/', 'Drosophila giant fiber', 'MANC connectome inputs and escape circuit'],
      ['/biology/reflex/', 'Knee-jerk reflex', 'Tap to kick: spindle → motor neuron → muscle'],
      ['/biology/action-potential/', 'Action potential up close', 'Stochastic channels, myelinated vs unmyelinated cable'],
      ['/biology/mechanisms/', 'NMJ & muscle', 'Neuromuscular junction, repetitive stimulation, sarcomere'],
      ['/biology/alzheimers/', 'Alzheimer’s disease', 'AD circuit changes'],
    ]],
    ['Fitting', [
      ['/fitting/landscape/', 'Loss landscape', 'Identifiability on a passive transient'],
      ['/fitting/fi-curve/', 'f–I curve', 'LIF fit, bootstrap, misspecification'],
      ['/fitting/model-comparison/', 'Model comparison', 'Passive vs I_h vs over-flexible'],
      ['/fitting/place-field/', 'Place field', 'Poisson ML vs least squares'],
      ['/fitting/oscillation/', 'Population rhythm', 'Feature-based Wilson–Cowan fit'],
    ]],
    ['Machine learning', [
      ['/ml/nodes-edges/', 'Nodes, edges, weights', ''],
      ['/ml/backprop/', 'Backpropagation', ''],
      ['/ml/gradient-descent/', 'Gradient descent', ''],
      ['/ml/rnn-dynamics/', 'RNN dynamics', ''],
      ['/ml/mean-field-bridge/', 'Mean-field bridge', ''],
      ['/ml/learning-rules/', 'Learning rules', ''],
      ['/ml/connectome-graph/', 'Connectome graph', 'C. elegans and fly connectomes'],
      ['/ml/network-sandbox/', 'Network sandbox', ''],
      ['/ml/hippocampal-memory/', 'Hippocampal memory', 'Memory and decoding'],
    ]],
    ['Dynamics tools', [
      ['/practice/phase-studio/', 'Phase studio', 'Animated trajectories'],
      ['/practice/equation-explorer/', 'Equation explorer', ''],
    ]],
  ];
  const ROUTES = new Map();
  TOOLS.forEach(([g, items]) => items.forEach(([r, n, d]) => ROUTES.set(r, {g, n, d})));
  const allowed = p => ROUTES.has(p);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  /* ---------- tool rail ---------- */
  const main = document.querySelector('main');
  const rail = document.createElement('nav');
  rail.id = 'hs-rail';
  rail.setAttribute('aria-label', 'Simulator tools');
  rail.innerHTML = `<a class="hs-home" href="#">All tools</a>` + TOOLS.map(([g, items]) =>
    `<details open><summary>${esc(g)}</summary>${items.map(([r, n]) => `<a href="${r}" data-r="${r}">${esc(n)}</a>`).join('')}</details>`).join('');
  main.insertBefore(rail, main.firstChild);

  const header = document.querySelector('body > header');
  if (header) {                     // keep the Guide's own header controls (nav.js drives #ng-menu); restyle the brand
    const brand = header.querySelector('.brand');
    if (brand) { brand.textContent = 'hippsim simulator'; brand.setAttribute('href', '#'); }
    header.querySelectorAll(':scope > span').forEach(s => s.hidden = true);
    const links = document.createElement('span'); links.className = 'hs-links';
    links.innerHTML = '<a href="index.html">Library ↗</a>';
    header.appendChild(links);
  }

  function markRail() {
    const p = ngPath();
    rail.querySelectorAll('a[data-r]').forEach(a => a.toggleAttribute('aria-current', a.dataset.r === p));
  }

  /* ---------- hub ---------- */
  function renderHub() {
    document.title = 'hippsim simulator';
    const L = document.getElementById('lesson');
    L.innerHTML = `<div class="hs-hub"><h1>Simulator</h1>
      <p class="hs-sub">${ROUTES.size} live tools running the lab's validated engines. Pick one.</p>
      ${TOOLS.map(([g, items]) => `<section><h2>${esc(g)}</h2><div class="hs-grid">${items.map(([r, n, d]) =>
        `<a class="hs-card" href="${r}"><b>${esc(n)}</b>${d ? `<span>${esc(d)}</span>` : ''}</a>`).join('')}</div></section>`).join('')}</div>`;
  }

  /* ---------- route guard ---------- */
  const inner = window.renderGuide;
  window.renderGuide = function () {
    const p = ngPath();
    if (p === '/' || !allowed(p)) {
      if (p !== '/') { history.replaceState(null, '', '#'); }
      renderHub();
    } else {
      inner.apply(this, arguments);
    }
    markRail();
  };
  try { window.renderGuide(); if (window.ngAfterRender) window.ngAfterRender(); } catch (e) { console.error(e); }
})();
