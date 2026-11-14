/* hs-placefields.js: additions to the Place fields page (renderResearchPlace in modellab.js).
   - the two extra cells (Golomb 2006 one-compartment, Ceballos 2025 soma only) are added to the built copy of
     modellab.js by tools/guide_patches.py; sources/raw stays untouched;
   - "Three papers, five cells": the same session run on every cell (tools/placefield_compare.js ->
     placefields-compare.json), with the Lowet 2023 observations checked on each. */
(function () {
  'use strict';
  if (typeof renderResearchPlace !== 'function') return;   // the two extra cells are added to the built modellab.js by tools/guide_patches.py

  const INFO = {
    golomb: {paper: 'Golomb 2006', comp: '1', url: 'compartments.html#p-golomb'},
    lowet: {paper: 'Lowet 2023', comp: '2', url: 'compartments.html#p-lowet'},
    hh: {paper: 'Ceballos 2025', comp: '2', url: 'compartments.html#p-ceballos'},
    hhsoma: {paper: 'Ceballos 2025, soma only', comp: '1', url: 'compartments.html#p-ceballos'},
    adex: {paper: 'AdEx fitted to Ceballos', comp: '1 (reduced)', url: 'sim-lab-models.html#biology.interleaved-resonance'}
  };
  const f = (v, d = 1) => v == null || Number.isNaN(v) ? '–' : (+v).toFixed(d);
  const yn = v => v == null ? '<span class="pf-na">–</span>' : v ? '<span class="pf-yes">yes</span>' : '<span class="pf-no">no</span>';
  async function section() {
    const bio = document.getElementById('pf-bio'); if (!bio || document.getElementById('pf-papers')) return;
    const sec = document.createElement('section'); sec.className = 'lesson-section'; sec.id = 'pf-papers';
    sec.innerHTML = `<p class="eyebrow">04 · Three papers, five cells</p><h2>Same session, every cell</h2>
      <p>The cell menu now follows the three papers: <b>Golomb 2006</b> (1 compartment: somatic I_NaP and I_M make bursts), <b>Lowet 2023</b> (2 compartments: dendritic NaP + slow K⁺; bursts at θ, single spikes at γ; bursts enter the field first), <b>Ceballos 2025</b> (Golomb-type soma + Iₕ dendrite; interleaved burst / single-spike resonance), the same Ceballos soma without its dendrite, and the AdEx reduced from it. None of them is a reconstructed neuron: <a href="compartments.html">what 1 or 2 compartments mean, and how they differ from the Neurons page</a>.</p>
      <p class="ux-note" id="pfcmp-p">Loading the comparison…</p><div id="pfcmp" style="overflow-x:auto"></div><div id="pfcmp-read"></div>`;
    bio.after(sec);
    let D;
    try { D = await (await fetch('placefields-compare.json')).json(); } catch (e) { document.getElementById('pfcmp-p').textContent = 'The comparison file could not be loaded.'; return; }
    const C = D.cells, keys = ['golomb', 'lowet', 'hh', 'hhsoma', 'adex'].filter(k => C[k]);
    const moreInfo = c => c.SI_burst == null || c.SI_single == null || !c.bursts || !c.singles ? null : c.SI_burst > c.SI_single;
    const earlier = c => c.comBurst_cm == null || c.comSingle_cm == null ? null : c.comBurst_cm < c.comSingle_cm;
    document.getElementById('pfcmp-p').innerHTML = `<b>Protocol</b> (identical for every cell, run with <code>tools/placefield_compare.js</code>): ${D.protocol}. Drive is calibrated per cell (as on this page) so each is near-silent before the plateau.`;
    document.getElementById('pfcmp').innerHTML = `<table class="pf-cmp"><thead><tr><th>Cell</th><th>Compartments</th><th>Before plateau<br><small>events/s</small></th><th>In field<br><small>events/s</small></th><th>Out of field<br><small>events/s</small></th>
      <th>Bursts<br><small>% of events</small></th><th>Spikes per burst</th><th>Spatial info<br><small>singles · bursts, bits/event</small></th><th>Bursts carry more information? <small>(Lowet 2023: yes)</small></th><th>Bursts earlier in the field? <small>(Lowet 2023: yes)</small></th><th></th></tr></thead><tbody>
      ${keys.map(k => { const c = C[k], i = INFO[k] || {paper: k, comp: '?'}; return `<tr><td><a href="${i.url || '#'}">${i.paper}</a></td><td>${i.comp}</td><td>${f(c.ratePre, 2)}</td><td>${f(c.fieldRate_Hz)}</td><td>${f(c.outRate_Hz)}</td>
        <td>${f(c.burstFrac * 100, 0)} %</td><td>${c.bursts ? f(c.spikesPerBurst) : '–'}</td><td>${f(c.SI_single, 2)} · ${f(c.SI_burst, 2)}</td><td>${yn(moreInfo(c))}</td><td>${yn(earlier(c))}</td>
        <td><button class="secondary pf-use" data-cell="${k}">Use this cell</button></td></tr>`; }).join('')}</tbody></table>`;
    const mixed = keys.filter(k => C[k].bursts && C[k].singles && C[k].burstFrac > 0.1 && C[k].burstFrac < 0.9), onlyB = keys.filter(k => C[k].burstFrac >= 0.9), onlyS = keys.filter(k => C[k].burstFrac <= 0.1), nm = k => (INFO[k] || {}).paper || k;
    document.getElementById('pfcmp-read').innerHTML = `<h3 style="margin-top:14px">How to read it</h3><ul>
      <li><b>Both codes in one field:</b> ${mixed.length ? mixed.map(nm).join(', ') : 'none of the cells'}${mixed.length ? ' fires a mix of bursts and single spikes in the field, as Lowet et al. (2023) recorded in CA1.' : '.'}</li>
      ${onlyB.length ? `<li><b>Only bursts:</b> ${onlyB.map(nm).join(', ')}: somatic I_NaP and I_M alone turn every crossing of threshold into a burst here.</li>` : ''}
      ${onlyS.length ? `<li><b>Only single spikes:</b> ${onlyS.map(nm).join(', ')}: with this drive (slow ramp + weak θ, 8 Hz) these cells stay in their single-spike regime. Ceballos 2025 used larger sinusoidal inputs (θ 1, γ 2 µA/cm²) to find its burst resonance; the place-field drive here is gentler.</li>` : ''}
      <li><b>With vs without the Iₕ dendrite</b> (Ceballos vs its soma only): the dendrite changes the in-field rate (${f(C.hh && C.hh.fieldRate_Hz)} vs ${f(C.hhsoma && C.hhsoma.fieldRate_Hz)} events/s) and the out-of-field firing (${f(C.hh && C.hh.outRate_Hz)} vs ${f(C.hhsoma && C.hhsoma.outRate_Hz)}), with the same drive.</li>
      <li>These are model predictions for one protocol and one calibration, not data. Change the plateau, θ or speed above and the balance shifts; “Use this cell” loads a cell into the live session.</li></ul>`;
    sec.addEventListener('click', e => { const b = e.target.closest('.pf-use'); if (!b) return; const s = document.getElementById('pfCell'); if (!s) return; s.value = b.dataset.cell; s.dispatchEvent(new Event('change')); document.getElementById('pf-sim').scrollIntoView({behavior: 'smooth'}); });
    const st = document.createElement('style');
    st.textContent = '.pf-cmp{border-collapse:collapse;width:100%;font-size:13.5px;min-width:860px}.pf-cmp th,.pf-cmp td{padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.1);text-align:left;vertical-align:top}.pf-cmp th small{font-weight:400;opacity:.75}.pf-yes{color:#2f7d5b;font-weight:600}.pf-no{color:#a62962;font-weight:600}.pf-na{opacity:.6}';
    sec.appendChild(st);
    const nav = document.querySelector('.page-jumps'); if (nav && !nav.querySelector('[href="#pf-papers"]')) nav.insertAdjacentHTML('beforeend', '<a href="#pf-papers">Three papers, five cells</a>');
  }
  const orig = renderResearchPlace;
  window.renderResearchPlace = function () { const r = orig.apply(this, arguments); section(); return r; };
})();
