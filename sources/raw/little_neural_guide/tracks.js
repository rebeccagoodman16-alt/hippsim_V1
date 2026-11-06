/* tracks.js: the guide teaches some ideas on several pages, each with a different job. On those pages a strip under the
   title shows the whole track (learn → explore → real cells → measure → research) and marks where you are, so overlapping
   pages read as steps rather than duplicates. Workbench pages are steps in many tracks and show their own related links instead. */
(function () {
  'use strict';
  const TRACKS = [
    { name: 'Resonance', steps: [['Learn', '/topics/dynamics/resonance-measurement/', 'Resonance & measurement'], ['Learn', '/topics/ca1-resonance/ih-and-m-current/', 'Iₕ and M-current'], ['Real cells', '/biology/dendritic-resonance/', 'Resonance in real dendrites (NEURON)'], ['Measure', '/workbench/neuron/?preset=ca1-res&tab=z', 'Neuron workbench: impedance'], ['Research', '/biology/research-resonance/', 'Resonance experiment: seven models']] },
    { name: 'Dendrites', steps: [['Learn', '/topics/morphology/local-versus-soma/', 'Local versus soma'], ['Learn', '/morphology/active-dendrites/', 'Active dendrites: concepts'], ['Explore', '/morphology/branching-lab/', 'Branching lab'], ['Real cells', '/biology/active-dendrites/', 'Active dendrites in real cells (NEURON)'], ['Measure', '/workbench/morphology/', 'Morphology workbench']] },
    { name: 'Spike-timing plasticity', steps: [['Learn', '/topics/learning/plasticity-rules/', 'Plasticity rules'], ['Measure', '/workbench/synapse/?preset=stdp-pair&tab=stdp', 'Synapse workbench: STDP rules'], ['Explore', '/lab/stdp/', 'STDP lab: competition among inputs'], ['Research', '/biology/research-place-fields/', 'BTSP: a field from one plateau']] },
    { name: 'E–I populations', steps: [['Learn', '/topics/networks/rates-wilson-cowan/', 'Rates & Wilson–Cowan'], ['Explore', '/lab/wilson-cowan/', 'Wilson–Cowan lab'], ['Measure', '/workbench/phase-plane/?sys=wilson-cowan', 'Phase-plane workbench'], ['Bridge', '/ml/mean-field-bridge/', 'From networks to mean field']] },
    { name: 'Spiking networks', steps: [['Learn', '/topics/networks/collective-states/', 'Collective states'], ['Explore', '/lab/brunel/', 'Brunel network lab'], ['Bridge', '/ml/mean-field-bridge/', 'From networks to mean field']] },
    { name: 'Action potential', steps: [['Learn', '/topics/channels/hh-gates/', 'HH gates'], ['Real cells', '/biology/action-potential/', 'Action potential up close'], ['Explore', '/lab/hh/', 'HH model lab'], ['Measure', '/workbench/neuron/?preset=hh-squid', 'Neuron workbench: HH']] },
    { name: 'Place cells', steps: [['Biology', '/biology/spatial/place-cells/', 'Place cells'], ['Experiment', '/experiments/place-cells/', 'Place cells & behaviour'], ['Fit', '/fitting/place-field/', 'Fit a place field'], ['Research', '/biology/research-place-fields/', 'Place-field formation (BTSP)']] },
    { name: 'CA1 circuit', steps: [['Biology', '/experiments/ca1-circuit/', 'The CA1 circuit'], ['Network', '/biology/network/', 'Signal flow through the hippocampus'], ['Research', '/biology/research-circuit/', 'CA1 circuit: theta, gamma and two output modes']] },
  ];
  window.NG_TRACKS = TRACKS;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pathOf = h => h.split('?')[0];
  function apply() {
    const L = document.getElementById('lesson'); if (!L || !window.ngPath) return;
    const r = ngPath(); if (r.startsWith('/workbench/') || L.querySelector('.ng-track')) return;
    const mine = TRACKS.filter(t => t.steps.some(s => pathOf(s[1]) === r)); if (!mine.length) return;
    const html = mine.map(t => `<nav class="ng-track" aria-label="${esc(t.name)} across the guide"><span class="ng-track-t">${esc(t.name)} across the guide</span>${t.steps.map(([role, h, label]) => pathOf(h) === r
      ? `<span class="ng-track-s on" aria-current="page"><small>${esc(role)}</small>${esc(label)}</span>` : `<a class="ng-track-s" href="${esc(h)}"><small>${esc(role)}</small>${esc(label)}</a>`).join('<span class="ng-track-a" aria-hidden="true">→</span>')}</nav>`).join('');
    const after = L.querySelector('.ng-ladder') || L.querySelector('.hero');
    if (after) after.insertAdjacentHTML('afterend', html); else L.insertAdjacentHTML('afterbegin', html);
  }
  let q = 0; const later = () => { clearTimeout(q); q = setTimeout(apply, 40); };
  const prev = window.ngAfterRender; window.ngAfterRender = function (...a) { if (typeof prev === 'function') prev.apply(this, a); later(); };
  const L0 = document.getElementById('lesson'); if (L0 && 'MutationObserver' in window) new MutationObserver(later).observe(L0, { childList: true });   // pages that fill in after loading data
  later();
})();
