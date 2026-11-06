/* ngstudio.js: the Neuron studio, one live workspace.
   Browse (atlas), Measure & signals (morphology workbench), Channels & simulation (neuron lab) and Circuits (circuit builder)
   are panels of ONE page: switching panels never reloads anything, every panel keeps its state (runs, probes, circuits),
   and one current cell is shared by all of them. The old addresses of the four tools open the studio on that panel. */
(function () {
  'use strict';
  const PANES = [
    ['browse', '/biology/cell-atlas/', 'Browse & compare', 'Every reconstruction in 3D: regions and layers, branch orders, provenance, side-by-side comparison and a NEURON check of the cable shortcut.', () => renderCellAtlas()],
    ['measure', '/workbench/morphology/', 'Measure & signals', 'Morphometrics and Sholl, passive spread and electrotonic distance, EPSP maps, back-propagating spikes and impedance across the tree.', () => renderMorphologyWorkbench()],
    ['sim', '/biology/neuron-lab/', 'Channels & simulation', 'Switch channels by type, region or single branch, cut branches, place synapses and probes, run protocols; validated against NEURON.', () => renderNeuronLab()],
    ['circuit', '/biology/circuit-builder/', 'Circuits', 'Wire real cells together with synapses on their real dendrites and gap junctions; measure single-spike PSPs.', () => renderCircuitBuilder()]
  ];
  const MORE = [['/biology/whole-brain/', 'Whole-brain axons'], ['/biology/active-dendrites/', 'NEURON: active dendrites'], ['/biology/axo-axonic/', 'NEURON: axo-axonic'], ['/biology/dendritic-resonance/', 'NEURON: dendritic resonance']];
  const BY_ROUTE = Object.fromEntries(PANES.map(p => [p[1], p]));
  window.NG_STUDIO_TABS = PANES.map(p => [p[1], p[2], p[3], true]).concat([['/biology/whole-brain/', 'Whole-brain axons', 'Single neurons whose whole axon was traced across the mouse brain, placed in the Allen atlas.', false], ['/biology/active-dendrites/', 'Verified in NEURON', 'Full NEURON simulations of real cells: active dendrites, axo-axonic synapses and dendritic theta resonance.', false]]);
  const KEY = 'ng-studio-cell';
  const qCell = () => new URLSearchParams(location.hash.split('?')[1] || '').get('cell');
  const stored = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const store = id => { try { localStorage.setItem(KEY, id); } catch (e) {} };
  const S = { cell: null, active: null, right: null, split: false, mounted: {}, cellOf: {} };
  try { S.split = localStorage.getItem('ng-studio-split') === '1'; } catch (e) {}
  const wide = () => matchMedia('(min-width: 1100px)').matches;
  const shell = () => document.getElementById('nstShell');
  const setURL = route => { try { history.replaceState(null, '', ngHash(route + '?cell=' + encodeURIComponent(S.cell))); } catch (e) {} };

  /** Render a tool into a pane: the tool writes into #lesson, so the pane briefly takes that id. */
  function mount(key) {
    const P = PANES.find(p => p[0] === key), pane = document.getElementById('nstp-' + key), L = document.getElementById('lesson'); if (!P || !pane || !L) return;
    setURL(P[1]);
    L.id = 'lesson-shell'; pane.id = 'lesson';
    try { P[4](); } catch (e) { console.error(e); pane.innerHTML = `<p class="ux-empty">This panel could not start: ${e.message}</p>`; }
    finally { pane.id = 'nstp-' + key; L.id = 'lesson'; }
    S.mounted[key] = true; S.cellOf[key] = S.cell;
  }
  /** Bring a mounted pane to the current cell. */
  function sync(key) {
    if (!S.mounted[key] || S.cellOf[key] === S.cell || key === 'circuit') return;
    const id = S.cell;
    if (key === 'browse') { let b = document.querySelector(`#nstp-browse [data-at="${ngAtlasIndex(id)}"]`); if (!b) { const all = document.querySelector('#nstp-browse [data-reg="All"]'); if (all) all.click(); b = document.querySelector(`#nstp-browse [data-at="${ngAtlasIndex(id)}"]`); } if (b) b.click(); }
    if (key === 'measure') { const s = document.getElementById('mw-cell'); if (s && [...s.options].some(o => o.value === id)) { s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); } }
    if (key === 'sim') { const s = document.getElementById('nlCell'); if (s && [...s.options].some(o => o.value === id)) { s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); } }
    S.cellOf[key] = id;
  }
  function show(key) {
    const P = PANES.find(p => p[0] === key); if (!P) return; const prev = S.active; S.active = key;
    const split = S.split && wide();
    if (split) { if (!S.right || S.right === key) S.right = prev && prev !== key ? prev : (key === 'sim' ? 'browse' : 'sim'); }
    const box = document.querySelector('.nst-panes'); if (box) box.classList.toggle('nst-split', split);
    document.querySelectorAll('.nst-pane').forEach(p => { const k = p.id.slice(5); p.hidden = !(k === key || (split && k === S.right)); p.style.order = k === key ? 1 : 2; });
    const rs = document.getElementById('nstRight'); if (rs) { rs.value = S.right || ''; rs.closest('label').hidden = !split; [...rs.options].forEach(o => o.disabled = o.value === key); }
    const sb = document.getElementById('nstSplit'); if (sb) sb.setAttribute('aria-pressed', split);
    if (split && S.right && !S.mounted[S.right]) { mount(S.right); } else if (split && S.right) sync(S.right);
    document.querySelectorAll('.nst-tabs [data-nst]').forEach(b => b.setAttribute('aria-selected', b.dataset.nst === key));
    { const t = document.querySelector('.nst-tabs'), b = t && t.querySelector(`[data-nst="${key}"]`); if (b) t.scrollLeft = Math.max(0, b.offsetLeft - 24); }
    const d = document.getElementById('nstDesc'); if (d) d.textContent = P[3];
    if (!S.mounted[key]) mount(key); else sync(key); setURL(P[1]);
    document.title = `${P[2]} · Neuron studio`;
    { const h = document.querySelector('.nst-h'); if (h) h.innerHTML = `Neuron studio<span class="nst-pane">: ${P[2]}</span>`; }   // each panel has its own title in search and history
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    facts(); try { if (window.ngFixCrumbs) ngFixCrumbs(); if (window.ngSectionFoot) ngSectionFoot(); } catch (e) {}
  }
  function facts() {
    const m = window.ngAtlasMeta && ngAtlasMeta(S.cell), f = document.getElementById('nstFacts'); if (!f || !m) return;
    const mo = m.morpho || {}; f.innerHTML = `<span><b>${m.species || ''}</b> · ${m.regionName || m.region || ''}</span>${mo.length ? `<span>${Math.round(mo.length).toLocaleString()} µm of neurite</span>` : ''}${m.archive ? `<span>${m.archive}</span>` : ''}`;
  }
  function setCell(id, from) {
    if (!id || id === S.cell) return; S.cell = id; store(id); if (from) S.cellOf[from] = id;
    const sel = document.getElementById('nstCell'); if (sel && sel.value !== id) sel.value = id;
    if (S.active && S.active !== from) sync(S.active); if (S.split && wide() && S.right && S.right !== from) sync(S.right);
    const P = PANES.find(p => p[0] === S.active); if (P) setURL(P[1]); facts();
  }
  function render(route) {
    const P = BY_ROUTE[route]; const go = () => {
      const cells = (window.nlCellList ? nlCellList() : []), groups = {};
      S.cell = qCell() || stored() || 'ca1-a'; if (!cells.some(m => m.id === S.cell)) S.cell = 'ca1-a'; store(S.cell); S.mounted = {}; S.cellOf = {};
      cells.forEach(m => { const g = m.group === 'Fly escape circuit' || m.group === 'Motor neurons' ? m.group : (m.regionName || m.region || 'Other'); (groups[g] = groups[g] || []).push(m); });
      document.body.classList.add('studio', 'wb-wide');
      $('lesson').innerHTML = `<nav class="breadcrumbs"><a href="/">Home</a></nav>
        <div class="nst-bar" id="nstShell"><div class="nst-top"><div><span class="eyebrow">Neurons &amp; morphology</span><h1 class="nst-h">Neuron studio</h1><p class="nst-facts" id="nstFacts"></p></div>
          <div class="nst-right"><label class="nst-cellpick"><span>Current cell (shared by every panel)</span><select id="nstCell">${Object.entries(groups).map(([g, ms]) => `<optgroup label="${g}">${ms.map(m => `<option value="${m.id}" ${m.id === S.cell ? 'selected' : ''}>${m.name} · ${m.code}</option>`).join('')}</optgroup>`).join('')}</select></label>
          <button class="secondary" id="nstAdd" title="Add the current cell to the circuit in the Circuits panel">+ Add to circuit</button><button class="secondary nst-splitbtn" id="nstSplit" aria-pressed="false" title="Show two panels side by side">Split view</button><label class="nst-rightpick" hidden><span>Right panel</span><select id="nstRight">${PANES.map(([k, , l]) => `<option value="${k}">${l}</option>`).join('')}</select></label></div></div>
          <div class="nst-tabs" role="tablist">${PANES.map(([k, , l]) => `<button role="tab" data-nst="${k}" aria-selected="false">${l}</button>`).join('')}<span class="nst-more">${MORE.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</span></div>
          <p class="nst-desc" id="nstDesc"></p></div>
        <div class="nst-panes">${PANES.map(([k]) => `<div class="nst-pane" id="nstp-${k}" hidden></div>`).join('')}</div>` + (window.smallPrint ? smallPrint() : '');
      document.getElementById('nstCell').onchange = e => setCell(e.target.value, null);
      document.querySelectorAll('.nst-tabs [data-nst]').forEach(b => b.onclick = () => show(b.dataset.nst));
      document.getElementById('nstSplit').onclick = () => { S.split = !S.split; try { localStorage.setItem('ng-studio-split', S.split ? '1' : '0'); } catch (e) {} show(S.active); if (S.split) document.querySelector('.nst-panes').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      document.getElementById('nstRight').onchange = e => { S.right = e.target.value; show(S.active); };
      document.getElementById('nstAdd').onclick = () => { show('circuit'); const t = () => { const a = document.getElementById('cbAdd'), b = document.getElementById('cbAddB'); if (a && b) { a.value = S.cell; b.click(); const tab = document.querySelector('#nstp-circuit [data-tab="cells"]'); if (tab) tab.click(); } else setTimeout(t, 150); }; t(); };
      show(P[0]);
    };
    if (window.ngStudioReady && ngStudioReady()) go(); else { $('lesson').innerHTML = '<div class="hero"><h1>Neuron studio</h1><p class="lead">Loading reconstructions and NEURON checks…</p></div>'; ngLoadAtlasData(() => ngLoadVerify(() => { if (BY_ROUTE[ngPath()]) go(); })); }
  }
  document.addEventListener('ng-cell', e => { if (!shell() || !e.detail) return; const from = S.active; setCell(e.detail, from); });
  const prevR = window.renderGuide;
  window.renderGuide = function () {
    const p = ngPath(), P = BY_ROUTE[p];
    if (P) { if (window.sidebar) try { sidebar(true); } catch (e) {} if (shell()) { const c = qCell(); if (c && c !== S.cell) setCell(c, null); show(P[0]); return; } return render(p); }
    document.body.classList.remove('studio');
    return prevR.apply(this, arguments);
  };
  if (BY_ROUTE[ngPath()]) { window.renderGuide(); if (window.ngAfterRender) ngAfterRender(); }
})();
