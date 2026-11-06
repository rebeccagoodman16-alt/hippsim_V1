/* Site-wide search: Ctrl/⌘-K, "/" or the 🔍 button. Searches page titles, section headings and page text (GUIDE_CORPUS),
   jumps to the page and scrolls to the matching section. Empty query shows recently visited pages and scale shortcuts. */
(() => {
  const C = typeof GUIDE_CORPUS !== 'undefined' ? GUIDE_CORPUS : null; if (!C) return;
  const pages = (window.ngAllPages ? ngAllPages() : []).reduce((m, p) => { if (!m.some(q => q.href === p.href)) m.push(p); return m; }, []);
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u207a\u207b\u00b2\u00b3]/g, c => ({ '\u207a': '+', '\u207b': '-', '\u00b2': '2', '\u00b3': '3' })[c]);
  const docs = [];
  pages.forEach(p => docs.push({ kind: 'page', route: p.href, page: p.label, heading: '', text: '', t: norm(p.label) }));
  C.chunks.forEach(c => docs.push({ kind: 'sec', route: c.route, page: c.page, heading: c.heading, text: c.text, t: norm(c.page), h: norm(c.heading), x: norm(c.text) }));
  const SCALES = [['Ion channels', ['/biology/action-potential/', '/lab/hh/', '/topics/channels/']], ['Single neurons', ['/biology/neuron-lab/', '/workbench/neuron/', '/workbench/morphology/']], ['Synapses & muscle', ['/workbench/synapse/', '/biology/mechanisms/', '/biology/reflex/', '/lab/stdp/']], ['Circuits', ['/biology/circuit-builder/', '/biology/network/', '/biology/giant-fiber/']], ['Behaviour', ['/biology/reflex/', '/biology/giant-fiber/#gf-esc', '/biology/spatial/']], ['Networks & ML', ['/ml/connectome-graph/', '/ml/network-sandbox/', '/ml/']]];
  const recent = () => { try { return JSON.parse(localStorage.getItem('ng-recent') || '[]'); } catch (e) { return []; } };
  const pushRecent = r => { try { const a = recent().filter(x => x !== r); a.unshift(r); localStorage.setItem('ng-recent', JSON.stringify(a.slice(0, 8))); } catch (e) {} };
  const title = r => (pages.find(p => p.href === r) || {}).label || (C.pages.find(p => p.route === r) || {}).title || r;
  const box = document.createElement('div'); box.id = 'ngs'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Search the guide');
  box.innerHTML = '<div class="ngs-panel"><input id="ngsQ" type="search" placeholder="Search pages, sections and ideas… (e.g. sarcomere, NMDA, place cells, eigenvalue)" aria-label="Search" autocomplete="off"><div id="ngsR" role="listbox"></div><p class="ngs-hint">↑↓ to move · Enter to open · Esc to close</p></div>';
  document.body.appendChild(box);
  const Q = box.querySelector('#ngsQ'), Rr = box.querySelector('#ngsR'); let res = [], sel = 0;
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const snippet = (text, terms) => { const t = norm(text); let k = -1; terms.forEach(w => { const j = t.indexOf(w); if (j >= 0 && (k < 0 || j < k)) k = j; }); if (k < 0) return esc(text.slice(0, 110)) + (text.length > 110 ? '…' : '');
    const a = Math.max(0, k - 50), s = (a ? '…' : '') + text.slice(a, a + 150) + (text.length > a + 150 ? '…' : ''); let out = esc(s); terms.forEach(w => { if (w.length < 2) return; out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }); return out; };
  const search = q => { const terms = norm(q).split(/\s+/).filter(w => w.length > 1); if (!terms.length) return [];
    const scored = docs.map(d => { let s = 0; for (const w of terms) { const inT = d.t.includes(w), inH = d.h && d.h.includes(w), inX = d.x && d.x.includes(w); if (!inT && !inH && !inX) return null; s += (inT ? (d.kind === 'page' ? 8 : 2) : 0) + (inH ? 5 : 0) + (inX ? 1 + Math.min(3, (d.x.split(w).length - 1) * 0.5) : 0); if (d.t.startsWith(w)) s += 2; } return { d, s }; }).filter(Boolean);
    scored.sort((a, b) => b.s - a.s); const seen = new Set(), out = []; for (const r of scored) { const k = r.d.route + '|' + r.d.heading; if (seen.has(k)) continue; seen.add(k); out.push(r.d); if (out.length >= 14) break; } return out; };
  const render = () => { const q = Q.value.trim();
    if (!q) { const rc = recent(); res = rc.map(r => ({ kind: 'page', route: r, page: title(r), heading: '' }));
      Rr.innerHTML = (rc.length ? '<p class="ngs-g">Recently visited</p>' + res.map((d, i) => `<button class="ngs-i${i === sel ? ' on' : ''}" data-i="${i}"><b>${esc(d.page)}</b></button>`).join('') : '') + '<p class="ngs-g">Jump by scale: channel → behaviour</p><div class="ngs-scales">' + SCALES.map(([l, rs]) => `<span><b>${l}</b> ${rs.map(r => `<a href="${r}">${esc(title(r.split('#')[0]))}</a>`).join(' · ')}</span>`).join('') + '</div>'; return; }
    res = search(q); const terms = norm(q).split(/\s+/).filter(w => w.length > 1);
    Rr.innerHTML = res.length ? res.map((d, i) => `<button class="ngs-i${i === sel ? ' on' : ''}" data-i="${i}" role="option"><b>${esc(d.page)}</b>${d.heading ? ` <span class="ngs-h">› ${esc(d.heading)}</span>` : ''}${d.text ? `<small>${snippet(d.text, terms)}</small>` : ''}</button>`).join('') : '<p class="ngs-g">No matches. Try a shorter word.</p>'; };
  const open = () => { box.hidden = false; sel = 0; Q.value = ''; render(); setTimeout(() => Q.focus(), 10); };
  const close = () => { box.hidden = true; };
  const go = d => { close(); if (!d) return; const target = norm(d.heading.replace(/ \(cont\.\)$/, ''));
    const after = () => { if (!target) return; const hs = [...document.querySelectorAll('#lesson h2, #lesson h3')], h = hs.find(e => norm(e.innerText) === target) || hs.find(e => norm(e.innerText).includes(target.slice(0, 24)));
      if (h) { h.scrollIntoView({ behavior: 'smooth', block: 'start' }); h.classList.add('ngs-flash'); setTimeout(() => h.classList.remove('ngs-flash'), 2200); } };
    if (location.hash.replace('#', '') === d.route.split('/').filter(Boolean).join('.') || (window.ngPath && ngPath() === d.route)) after(); else { (window.ngGo || (r => location.href = r))(d.route); setTimeout(after, 700); } };
  Q.addEventListener('input', () => { sel = 0; render(); });
  Q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(res.length - 1, sel + 1); render(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); } else if (e.key === 'Enter') { go(res[sel]); } else if (e.key === 'Escape') close(); });
  Rr.addEventListener('click', e => { const b = e.target.closest('.ngs-i'); if (b) go(res[+b.dataset.i]); if (e.target.closest('a')) close(); });
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => { const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || (document.activeElement || {}).isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); box.hidden ? open() : close(); } else if (e.key === '/' && !typing && box.hidden) { e.preventDefault(); open(); } });
  const addBtn = () => { const left = document.querySelector('.ng-tool-left'); if (left && !document.getElementById('ngsBtn')) { const b = document.createElement('button'); b.type = 'button'; b.id = 'ngsBtn'; b.innerHTML = 'Search <kbd>' + (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K') + '</kbd>'; b.onclick = open; left.insertBefore(b, left.children[1] || null); } };
  addBtn();
  const prev = window.ngAfterRender; window.ngAfterRender = function (...a) { if (typeof prev === 'function') prev.apply(this, a); addBtn(); const r = window.ngPath ? ngPath() : location.pathname; if (r) pushRecent(r); };
  /* ---------- zoom ladder: where this page sits from ion channel to behaviour ---------- */
  const LADDER = [['Ion channels', ['/biology/action-potential/', '/lab/hh/', '/workbench/neuron/', '/workbench/phase-plane/']],
    ['One neuron', ['/biology/neuron-lab/', '/workbench/morphology/', '/biology/active-dendrites/', '/biology/dendritic-resonance/', '/biology/axo-axonic/', '/biology/cell-atlas/']],
    ['Synapse & muscle', ['/workbench/synapse/', '/biology/mechanisms/', '/lab/stdp/']],
    ['Circuit', ['/biology/circuit-builder/', '/biology/real-circuit/', '/biology/network/', '/experiments/ca1-circuit/']],
    ['Behaviour', ['/biology/reflex/', '/biology/giant-fiber/', '/biology/spatial/', '/experiments/place-cells/', '/biology/spatial/place-cells/', '/biology/spatial/spatial-cells/', '/biology/spatial/theta/', '/biology/spatial/navigation/']],
    ['Networks & learning', ['/ml/connectome-graph/', '/ml/network-sandbox/', '/ml/hippocampal-memory/', '/lab/brunel/', '/lab/wilson-cowan/', '/ml/rnn-dynamics/']]];
  const ladder = () => { const r = window.ngPath ? ngPath() : '', k = LADDER.findIndex(([, rs]) => rs.includes(r)), L = document.getElementById('lesson'); if (k < 0 || !L || L.querySelector('.ng-ladder')) return;
    const hero = L.querySelector('.hero'); if (!hero) return; const nav = document.createElement('nav'); nav.className = 'ng-ladder'; nav.setAttribute('aria-label', 'Scale: from ion channels to behaviour');
    nav.innerHTML = '<span class="ng-lad-t">Scale</span>' + LADDER.map(([l, rs], j) => j === k ? `<span class="ng-lad on" aria-current="true">${l}</span>` : `<a class="ng-lad" href="${rs[0]}">${l}</a>`).join('<span class="ng-lad-s">›</span>')
      + (LADDER[k][1].length > 1 ? `<span class="ng-lad-more">Same scale: ${LADDER[k][1].filter(x => x !== r).slice(0, 4).map(x => `<a href="${x}">${esc(title(x))}</a>`).join(' · ')}</span>` : '');
    hero.after(nav); };
  const prev2 = window.ngAfterRender; window.ngAfterRender = function (...a) { if (typeof prev2 === 'function') prev2.apply(this, a); ladder(); };
  window.ngSearchOpen = open;
})();
