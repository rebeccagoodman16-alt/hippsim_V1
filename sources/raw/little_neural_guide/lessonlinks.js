/* lessonlinks.js: every lesson links to the workbench setup (preset + tab) or lab that shows the same idea with the full model.
   Added inside the lesson's "Use this idea" box, so a lesson → tool step is always one click. */
(function () {
  'use strict';
  const N = '/workbench/neuron/?preset=', S = '/workbench/synapse/?preset=', P = '/workbench/phase-plane/?sys=';
  const MORPH = [['/workbench/morphology/', 'Morphology workbench: the same idea on real CA1 reconstructions'], ['/morphology/branching-lab/', 'Branching lab: a teaching tree you can stimulate anywhere']];
  const L = {
    '/topics/channels/membrane-circuit/': [[N + 'lif', 'Neuron workbench (LIF): watch V charge toward I/g_L with τ = C/g_L below threshold']],
    '/topics/channels/driving-force/': [[N + 'hh-vclamp&tab=iv', 'Neuron workbench: HH voltage clamp and I–V curves (find the reversal)']],
    '/topics/channels/hh-gates/': [[N + 'hh-squid', 'Neuron workbench: HH squid axon (tick “Gating variables”)'], ['/lab/hh/', 'HH model lab: a guided tour']],
    '/topics/channels/hh-to-ca1/': [[N + 'ca1', 'Neuron workbench: CA1-like soma with Iₕ, M, A-type and Ca²⁺ currents']],
    '/topics/ca1-resonance/ih-and-m-current/': [[N + 'ca1-res&tab=z', 'Neuron workbench: measure the Iₕ resonance, then untick Iₕ']],
    '/topics/ca1-resonance/impedance-phase/': [[N + 'ca1-res&tab=z', 'Neuron workbench: impedance amplitude and phase from a chirp']],
    '/topics/ca1-resonance/chirp-input/': [[N + 'ca1-res', 'Neuron workbench: a ZAP chirp and the voltage envelope it produces']],
    '/topics/ca1-resonance/impedance-units/': [[N + 'adex-res&tab=z', 'Neuron workbench: |Z| in MΩ from a chirp in nA']],
    '/topics/morphology/electrotonic-distance/': MORPH,
    '/topics/morphology/coupled-compartments/': [[N + 'ca1-2c', 'Neuron workbench: soma + dendrite coupled by g_c'], ...MORPH],
    '/topics/morphology/area-and-density/': MORPH,
    '/topics/morphology/local-versus-soma/': [[N + 'ca1-2c&tab=z', 'Neuron workbench: local versus transfer impedance in two compartments'], ...MORPH],
    '/topics/dynamics/states-trajectories/': [[P + 'fhn', 'Phase-plane workbench: FitzHugh–Nagumo trajectories']],
    '/topics/dynamics/nullclines/': [[P + 'morris-lecar', 'Phase-plane workbench: nullclines and fixed points (Morris–Lecar)']],
    '/topics/dynamics/stability-bifurcations/': [[P + 'morris-lecar-snic&tab=bif', 'Bifurcation diagram: onset through a SNIC (class I)'], [P + 'morris-lecar&tab=bif', 'Bifurcation diagram: onset through a Hopf (class II)']],
    '/topics/dynamics/resonance-measurement/': [[N + 'adex-res&tab=z', 'Neuron workbench: resonance from a slow restoring current']],
    '/topics/dynamics-toolkit/phase-portraits/': [[P + 'linear', 'Phase-plane workbench: classify fixed points of a linear system']],
    '/topics/dynamics-toolkit/saddle-node/': [[P + 'saddle-node&tab=bif', 'Phase-plane workbench: saddle-node normal form']],
    '/topics/dynamics-toolkit/hopf-normal-form/': [[P + 'hopf&tab=bif', 'Phase-plane workbench: Hopf normal form']],
    '/topics/dynamics-toolkit/numerical-time-step/': [[N + 'hh-squid&method=euler&dt=0.1', 'Neuron workbench: forward Euler at Δt = 0.1 ms gives 34 spikes instead of 11; switch Numerics to exponential Euler']],
    '/topics/synapses/chemical-electrical/': [[S + 'ampa-psp', 'Synapse workbench: one AMPA synapse onto a passive cell']],
    '/topics/synapses/synaptic-conductance/': [[S + 'shunt', 'Synapse workbench: shunting inhibition, conductance versus current']],
    '/topics/synapses/timing-location/': [[S + 'ffi', 'Synapse workbench: the CA1 feedforward-inhibition window']],
    '/topics/synapses/ei-feedback/': [[S + 'ffi', 'Synapse workbench: excitation, then inhibition 2 ms later'], ['/lab/wilson-cowan/', 'Wilson–Cowan lab: the E–I loop as populations']],
    '/topics/networks/spiking-neurons/': [[N + 'lif', 'Neuron workbench: a single LIF neuron'], ['/lab/brunel/', 'Brunel lab: 1,000 of them']],
    '/topics/networks/wiring-delays/': [['/lab/brunel/', 'Brunel lab: a network with a 1.5 ms synaptic delay']],
    '/topics/networks/rates-wilson-cowan/': [[P + 'wilson-cowan', 'Phase-plane workbench: Wilson–Cowan'], ['/lab/wilson-cowan/', 'Wilson–Cowan lab: guided tour']],
    '/topics/networks/collective-states/': [['/lab/brunel/', 'Brunel lab: regular, asynchronous and synchronous states']],
    '/topics/mean-field/population-activity/': [['/lab/brunel/', 'Brunel lab: population rate from a raster']],
    '/topics/mean-field/gain-function/': [[N + 'lif&tab=fi', 'Neuron workbench: measure an f–I curve']],
    '/topics/mean-field/self-consistency/': [['/ml/mean-field-bridge/', 'Mean-field bridge: rate prediction against a spiking network']],
    '/topics/mean-field/heterogeneity/': [['/ml/mean-field-bridge/', 'Mean-field bridge: heterogeneous cells']],
    '/topics/learning/computation-task/': [['/ml/rnn-dynamics/', 'Recurrent networks as dynamical systems']],
    '/topics/learning/recurrence-attractors/': [['/ml/hippocampal-memory/', 'Hippocampal memory: attractor recall']],
    '/topics/learning/plasticity-rules/': [[S + 'stdp-pair&tab=stdp', 'Synapse workbench: the STDP window'], [S + 'stdp-triplet&tab=stdp', 'Synapse workbench: triplet rule and pairing frequency'], ['/lab/stdp/', 'STDP lab: competition among inputs']],
    '/topics/learning/readouts-evaluation/': [['/ml/rnn-dynamics/', 'Recurrent networks: train a readout']],
    '/topics/validation/fit-a-transient/': [['/fitting/landscape/', 'Fitting studio: loss landscapes']],
    '/topics/validation/parameter-sensitivity/': [['/fitting/landscape/', 'Fitting studio: sensitivity and identifiability']],
    '/topics/validation/identifiability/': [['/fitting/landscape/', 'Fitting studio: find parameter pairs that fit equally well']],
    '/topics/validation/uncertainty-in-predictions/': [['/fitting/fi-curve/', 'Fitting studio: bootstrap uncertainty on an f–I fit']],
  };
  window.NG_LESSON_LINKS = L;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function apply() {
    const Lsn = document.getElementById('lesson'); if (!Lsn || !window.ngPath) return;
    const links = L[ngPath()]; if (!links || Lsn.querySelector('.ng-wb-links')) return;
    const html = `<div class="ng-wb-links"><p class="eyebrow">Run it with the full model</p><div class="button-cloud">${links.map(([h, t]) => `<a class="secondary" href="${esc(h)}">${esc(t)} →</a>`).join('')}</div></div>`;
    const box = [...Lsn.querySelectorAll('section.box, .box')].find(b => { const h = b.querySelector('h2'); return h && /use this idea/i.test(h.textContent); });
    if (box) box.insertAdjacentHTML('beforeend', html);
    else { const f = Lsn.querySelector(':scope > .complete-row, :scope > footer'); if (f) f.insertAdjacentHTML('beforebegin', `<section class="box pink">${html}</section>`); else Lsn.insertAdjacentHTML('beforeend', `<section class="box pink">${html}</section>`); }
  }
  let q = 0; const later = () => { clearTimeout(q); q = setTimeout(apply, 50); };
  const prev = window.ngAfterRender; window.ngAfterRender = function (...a) { if (typeof prev === 'function') prev.apply(this, a); later(); };
  const L0 = document.getElementById('lesson'); if (L0 && 'MutationObserver' in window) new MutationObserver(later).observe(L0, { childList: true });
  later();
})();
