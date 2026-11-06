/* neuronviewer.js: a full-screen viewer for any reconstructed neuron in the guide, with rotation videos.
   - ngOpenNeuronViewer(id?)  opens the viewer (all ATLAS cells with loaded morphology; more after "Load more cells").
   - Only the neuron fills the screen. Drag to rotate, wheel/pinch to zoom, shift-drag (or two fingers) to pan.
   - Options: colour by type or path distance, labels on/off, title = neuron name / custom / none, light/dark background.
   - The source citation is always drawn in the bottom-right corner, so it is part of every snapshot and video.
   - Record: one full turn at a chosen size and duration; saved as MP4 where the browser can encode it, otherwise WebM.
     Files are offered through the artifact `downloads` capability (falls back to a normal download outside claude.ai).
   Entry points: ⛶ buttons on textbook morphology figures and on the guide's neuron canvases, and /biology/neuron-viewer/. */
(function () {
  'use strict';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PREF = 'ng-nv-prefs-v1';
  const prefs = (() => { try { return Object.assign({ color: 'type', labels: true, title: 'name', custom: '', bg: 'light', size: '1920x1080', dur: 8, tilt: 10, axon: true, list: [] }, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch (e) { return { color: 'type', labels: true, title: 'name', custom: '', bg: 'light', size: '1920x1080', dur: 8, tilt: 10, axon: true }; } })();
  const savePrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) {} };
  const THEME = { light: { bg: '#fff9f2', ink: '#171313', mute: '#7d6f6a', apical: '#a62961', basal: '#3d5a8a', axon: '#a99c96', soma: '#171313' },
                  dark: { bg: '#141012', ink: '#f6ecef', mute: '#a8999d', apical: '#ff8dbd', basal: '#8fb3ff', axon: '#6f6468', soma: '#f6ecef' } };

  /* ---------- the cell catalogue ---------- */
  function catalogue() {
    if (typeof window.ngAtlasAll !== 'function') return [];
    const out = [];
    window.ngAtlasAll().forEach(e => {
      if (e.schematic) return;
      let m = null; try { m = window.ngAtlasCell(e); } catch (err) {}
      if (!m || !m.sections || !m.sections.length) return;
      const ref = e.ref ? (e.ref.doi ? ' · doi:' + e.ref.doi : e.ref.pmid ? ' · PMID ' + e.ref.pmid : '') : '';
      const cite = e.model ? `${e.model[0]}${e.model[1] ? ' · ModelDB ' + e.model[1] : ''}` : e.nmo || e.archive ? `${e.archive ? e.archive + ' archive, ' : ''}NeuroMorpho.Org${e.nmo ? ' NMO_' + e.nmo : ''}${ref}` : '';
      out.push({ id: e.id, name: e.name, code: e.code || '', region: e.regionName || e.region || '', species: e.species || '', cite, m });
    });
    return out;
  }
  const atlasLoaded = () => typeof window.ngAtlasLoaded === 'function' && window.ngAtlasLoaded();

  /* ---------- geometry: flatten to segments once per cell ---------- */
  function build(cell) {
    const secs = cell.m.sections, n = secs.length, seg = [], endP = new Float64Array(n), done = new Uint8Array(n);
    const sy = 1;   // atlasCell already applied crop, dropAxon and flip
    const visit = i => {
      if (done[i]) return; const s = secs[i]; if (s[1] >= 0 && !done[s[1]]) visit(s[1]);
      const p = s[2], r = s[3]; let px, py, pz, pd, pr;
      if (s[1] >= 0) { const q = secs[s[1]][2], L = q.length; px = q[L - 3]; py = q[L - 2] * sy; pz = q[L - 1]; pd = endP[s[1]]; pr = secs[s[1]][3][secs[s[1]][3].length - 1]; }
      else { px = p[0]; py = p[1] * sy; pz = p[2]; pd = Math.hypot(px, py, pz); pr = r[0]; }
      for (let k = 0; k < p.length; k += 3) {
        const x = p[k], y = p[k + 1] * sy, z = p[k + 2], rr = r[k / 3] ?? pr, L = Math.hypot(x - px, y - py, z - pz);
        if (L > 0) seg.push([px, py, pz, x, y, z, pr + rr, s[0], pd + L / 2]);
        px = x; py = y; pz = z; pd += L; pr = rr;
      }
      endP[i] = pd; done[i] = 1;
    };
    for (let i = 0; i < n; i++) visit(i);
    let R = 1, maxd = 1, rH = 1, y0 = Infinity, y1 = -Infinity, rHd = 1, y0d = Infinity, y1d = -Infinity;
    seg.forEach(s => { R = Math.max(R, Math.hypot(s[0], s[1], s[2]), Math.hypot(s[3], s[4], s[5])); maxd = Math.max(maxd, s[8]);
      const h = Math.max(Math.hypot(s[0], s[2]), Math.hypot(s[3], s[5])); rH = Math.max(rH, h); y0 = Math.min(y0, s[1], s[4]); y1 = Math.max(y1, s[1], s[4]);
      if (s[7] !== 2) { rHd = Math.max(rHd, h); y0d = Math.min(y0d, s[1], s[4]); y1d = Math.max(y1d, s[1], s[4]); } });
    if (!isFinite(y0d)) { rHd = rH; y0d = y0; y1d = y1; }
    const soma = cell.m.soma || []; const sxy = []; if (soma.length >= 6) for (let k = 0; k + 1 < soma.length; k += 2) sxy.push([soma[k], soma[k + 1] * sy]);
    return { seg, R, maxd, rH, y0, y1, rHd, y0d, y1d, soma: sxy, hasAxon: seg.some(s => s[7] === 2), types: new Set(seg.map(s => s[7])) };
  }

  /* ---------- drawing ---------- */
  const DCOL = ['#3d5a8a', '#8a6fb0', '#ed83b0', '#a62961', '#5a1430'];
  const lerpCol = t => { const c = DCOL.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))); const x = Math.max(0, Math.min(0.9999, t)) * (c.length - 1), i = Math.floor(x), f = x - i; return `rgb(${c[i].map((v, k) => Math.round(v + (c[i + 1][k] - v) * f)).join(',')})`; };
  function draw(ctx, W, H, st, G, cell, opt) {
    const T = THEME[opt.bg]; ctx.save(); ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
    const u = Math.min(W, H) / 1000;                              // UI unit: 1 per px at 1000 px
    const off = opt.screenTop || 0, top = off + (opt.labels || opt.title !== 'none' ? 110 * u : 30 * u), bot = 70 * u;
    // fit the turning neuron: its horizontal radius and vertical extent stay fixed while it rotates about the vertical axis
    const ax = opt.axon && G.hasAxon, rh = ax ? G.rH : G.rHd, ya = ax ? G.y0 : G.y0d, yb = ax ? G.y1 : G.y1d, tilt = Math.abs(Math.sin(st.pitch));
    const fitH = (yb - ya) * Math.cos(st.pitch) + 2 * rh * tilt, avail = H - top - bot;
    const scale = st.zoom * Math.min(0.94 * W / (2 * rh), 0.94 * avail / Math.max(fitH, 1)), cx = W / 2 + st.panX, cy = top + avail / 2 + st.panY + (ya + yb) / 2 * Math.cos(st.pitch) * scale;
    const cy_ = Math.cos(st.yaw), sy_ = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const proj = (x, y, z) => { const X = cy_ * x + sy_ * z, Z = -sy_ * x + cy_ * z, Y = cp * y - sp * Z; return [cx + X * scale, cy - Y * scale]; };
    const wpx = d => Math.max(0.6 * u * (W > 1400 ? 1.2 : 1), d * scale * 0.95);
    const bins = new Map();
    for (const s of G.seg) {
      if (s[7] === 2 && !opt.axon) continue;
      const col = opt.color === 'dist' && s[7] !== 2 ? lerpCol(s[8] / G.maxd) : s[7] === 4 ? T.apical : s[7] === 2 ? T.axon : T.basal;
      const w = s[7] === 2 ? Math.min(wpx(s[6]), 1.2 * u) : wpx(s[6]); const key = col + '|' + (Math.round(w * 4) / 4);
      let b = bins.get(key); if (!b) bins.set(key, b = []); b.push(s);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const keys = [...bins.keys()].sort((a, b) => (a.startsWith(T.axon) ? -1 : 0) - (b.startsWith(T.axon) ? -1 : 0));
    for (const k of keys) { const [col, w] = k.split('|'); ctx.strokeStyle = col; ctx.lineWidth = +w; ctx.beginPath(); for (const s of bins.get(k)) { const a = proj(s[0], s[1], s[2]), b = proj(s[3], s[4], s[5]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke(); }
    // soma: traced contour rotated about the vertical axis as a flat outline, else a disc
    ctx.fillStyle = T.soma; ctx.beginPath();
    if (G.soma.length >= 3) G.soma.forEach(([x, y], i) => { const p = proj(x, y, 0); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    else { const p = proj(0, 0, 0); ctx.arc(p[0], p[1], Math.max(3 * u, 6 * scale), 0, 7); }
    ctx.fill();
    // title
    const serif = 'Georgia, "Times New Roman", serif', sans = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'alphabetic';
    if (opt.title !== 'none') {
      const t = opt.title === 'custom' ? (opt.custom || '') : `${cell.name}${cell.code ? ' · ' + cell.code : ''}`;
      if (t) { ctx.fillStyle = T.ink; ctx.font = `${Math.round(42 * u)}px ${serif}`; ctx.fillText(t, 40 * u, off + 62 * u, W - 80 * u); }
      if (opt.labels && opt.title === 'name') { ctx.fillStyle = T.mute; ctx.font = `${Math.round(18 * u)}px ${sans}`; ctx.fillText([cell.region, cell.species].filter(Boolean).join(' · '), 40 * u, off + 92 * u); }
    }
    if (opt.labels) {
      // legend (top right)
      const items = opt.color === 'dist' ? [] : [[T.apical, 'apical dendrite', G.types.has(4)], [T.basal, G.types.has(4) ? 'basal dendrite' : 'dendrite', G.types.has(3)], [T.axon, 'axon', G.hasAxon && opt.axon]].filter(x => x[2]);
      ctx.font = `${Math.round(17 * u)}px ${sans}`; const ly = off; let y = 44 * u + ly;
      items.forEach(([c, l]) => { const tw = ctx.measureText(l).width; ctx.fillStyle = c; ctx.fillRect(W - 40 * u - tw - 30 * u, y - 7 * u, 22 * u, 5 * u); ctx.fillStyle = T.ink; ctx.fillText(l, W - 40 * u - tw, y); y += 26 * u; });
      if (opt.color === 'dist') { const gw = 200 * u, gx = W - 40 * u - gw; for (let i = 0; i < 100; i++) { ctx.fillStyle = lerpCol(i / 99); ctx.fillRect(gx + i * gw / 100, 34 * u + ly, gw / 100 + 1, 10 * u); } ctx.fillStyle = T.ink; ctx.textAlign = 'right'; ctx.fillText(`path distance from soma: 0 → ${Math.round(G.maxd)} µm`, W - 40 * u, 66 * u + ly); ctx.textAlign = 'left'; }
      // scale bar (bottom left), adapted to zoom
      const target = 160 * u / scale, nice = [10, 20, 50, 100, 200, 500, 1000].find(v => v >= target * 0.6) || 1000, bl = nice * scale;
      ctx.strokeStyle = T.ink; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(40 * u, H - 34 * u); ctx.lineTo(40 * u + bl, H - 34 * u); ctx.stroke();
      ctx.fillStyle = T.ink; ctx.font = `${Math.round(16 * u)}px ${sans}`; ctx.fillText(`${nice} µm`, 40 * u, H - 44 * u);
    }
    // citation: always, bottom right
    ctx.fillStyle = T.mute; ctx.font = `${Math.round(14 * u)}px ${sans}`; ctx.textAlign = 'right';
    const cite = cell.cite ? `Source: ${cell.cite}` : 'Source: reconstruction as listed in the Neuron studio';
    ctx.fillText(cite, W - 24 * u, H - 20 * u, W * 0.62); ctx.textAlign = 'left';
    ctx.restore();
  }

  /* ---------- the overlay ---------- */
  let ov = null, st = null, cells = [], cur = null, G = null, cv = null, raf = 0, spin = false, recording = null;
  function render() {
    if (!ov || !cv) return; const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const bar = ov.querySelector('.nv-bar'); draw(ctx, W, H, st, G, cur, Object.assign({}, prefs, { screenTop: bar ? bar.offsetTop + bar.offsetHeight + 4 : 52 }));
  }
  function loop() { if (!ov) return; if (spin && !recording) { st.yaw += 0.006; render(); } raf = requestAnimationFrame(loop); }
  function choose(id) { cur = cells.find(c => c.id === id) || cells[0]; G = build(cur); st = { yaw: 0, pitch: (prefs.tilt || 0) * Math.PI / 180, zoom: 1, panX: 0, panY: 0 }; const sel = ov && ov.querySelector('#nv-cell'); if (sel) sel.value = cur.id; const ax = ov && ov.querySelector('#nv-axon'); if (ax) ax.disabled = !G.hasAxon; syncStar(); render(); }

  function open(id) {
    cells = catalogue(); if (!cells.length) return;
    if (ov) { choose(id || cur.id); return; }
    ov = document.createElement('div'); ov.className = 'nv-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Full-screen neuron viewer');
    const regions = [...new Set(cells.map(c => c.region || 'Other'))];
    ov.innerHTML = `<canvas class="nv-full" aria-label="Neuron. Drag to rotate, scroll to zoom, shift-drag to pan."></canvas>
      <div class="nv-bar" role="toolbar" aria-label="Viewer controls">
        <select id="nv-cell" aria-label="Neuron">${regions.map(r => `<optgroup label="${esc(r)}">${cells.filter(c => (c.region || 'Other') === r).map(c => `<option value="${esc(c.id)}">${esc(c.name)}${c.code ? ' · ' + esc(c.code) : ''}</option>`).join('')}</optgroup>`).join('')}</select>
        ${!atlasLoaded() && typeof ngLoadAtlasData === 'function' ? '<button type="button" id="nv-more" title="Load the NeuroMorpho.Org cells of the Neuron studio">+ more cells</button>' : ''}
        <button type="button" id="nv-star" aria-pressed="false" title="Add to / remove from your presentation list (P). ← → step through the list.">☆ List</button>
        <button type="button" id="nv-spin" aria-pressed="false" title="Rotate continuously (space)">⟳ Rotate</button>
        <details class="nv-menu"><summary>Look</summary><div class="nv-pop">
          <label>Colour <select id="nv-color"><option value="type">by compartment</option><option value="dist">by path distance</option></select></label>
          <label><input type="checkbox" id="nv-labels"> Labels (legend, scale bar, region)</label>
          <label>Title <select id="nv-title"><option value="name">neuron name</option><option value="custom">custom text</option><option value="none">no title</option></select></label>
          <input type="text" id="nv-custom" placeholder="Custom title" maxlength="90">
          <label><input type="checkbox" id="nv-axon"> Show axon</label>
          <label>Background <select id="nv-bg"><option value="light">light</option><option value="dark">dark</option></select></label>
          <label>Tilt <input type="range" id="nv-tilt" min="-30" max="45" step="1"></label>
          <p class="nv-note">The source citation is always shown in the bottom-right corner.</p></div></details>
        <details class="nv-menu"><summary>● Video</summary><div class="nv-pop">
          <label>Size <select id="nv-size"><option value="1920x1080">1920 × 1080 (landscape)</option><option value="1080x1080">1080 × 1080 (square)</option><option value="1080x1920">1080 × 1920 (vertical)</option><option value="1280x720">1280 × 720</option><option value="3840x2160">3840 × 2160 (4K)</option></select></label>
          <label>One full turn in <select id="nv-dur"><option value="5">5 s</option><option value="8">8 s</option><option value="12">12 s</option><option value="20">20 s</option></select></label>
          <p class="nv-note">Uses the look settings above: title, labels, colour, background. Format: <span id="nv-fmt"></span>.</p>
          <button type="button" class="primary" id="nv-rec">Record one turn</button>
          <button type="button" id="nv-png">Save snapshot (PNG)</button></div></details>
        <button type="button" id="nv-reset" title="Reset view">Reset</button>
        <button type="button" id="nv-keys" title="Keyboard shortcuts (?)">?</button>
        <button type="button" id="nv-close" aria-label="Close full screen">✕</button>
      </div>
      <div class="nv-hint">Drag to rotate · scroll or pinch to zoom · shift-drag to pan · ? for presenting keys · Esc to close</div>
      <div class="nv-keyhelp" id="nv-keyhelp" hidden><b>Presenting keys</b><span>space rotate / stop</span><span>← → previous / next cell (your list if it has cells, else all)</span><span>P add / remove this cell from the list</span><span>L labels · T title (name → custom → none) · C colour · B background</span><span>+ / − zoom · 0 reset · F full screen · H hide toolbar</span><span>R record one turn · S snapshot · Esc close</span><small>The toolbar hides itself while you present; move the mouse to bring it back.</small></div>
      <div class="nv-status" id="nv-status" role="status" hidden></div>`;
    document.body.appendChild(ov); document.documentElement.classList.add('nv-open');
    cv = ov.querySelector('canvas');
    const $ = s => ov.querySelector(s);
    $('#nv-color').value = prefs.color; $('#nv-labels').checked = prefs.labels; $('#nv-title').value = prefs.title; $('#nv-custom').value = prefs.custom; $('#nv-custom').hidden = prefs.title !== 'custom';
    $('#nv-axon').checked = prefs.axon; $('#nv-bg').value = prefs.bg; $('#nv-tilt').value = prefs.tilt; $('#nv-size').value = prefs.size; $('#nv-dur').value = String(prefs.dur);
    $('#nv-fmt').textContent = pickType() ? (pickType().includes('mp4') ? 'MP4 (H.264)' : 'WebM') : 'not supported in this browser';
    ov.dataset.bg = prefs.bg;
    const upd = () => { prefs.color = $('#nv-color').value; prefs.labels = $('#nv-labels').checked; prefs.title = $('#nv-title').value; prefs.custom = $('#nv-custom').value; prefs.axon = $('#nv-axon').checked; prefs.bg = $('#nv-bg').value; prefs.size = $('#nv-size').value; prefs.dur = +$('#nv-dur').value;
      const nt = +$('#nv-tilt').value; if (nt !== prefs.tilt) { st.pitch = nt * Math.PI / 180; prefs.tilt = nt; } $('#nv-custom').hidden = prefs.title !== 'custom'; ov.dataset.bg = prefs.bg; savePrefs(); render(); };
    ov.querySelectorAll('.nv-pop select, .nv-pop input').forEach(el => el.addEventListener('input', upd));
    $('#nv-cell').addEventListener('change', e => choose(e.target.value));
    $('#nv-spin').addEventListener('click', () => toggleSpin());
    $('#nv-star').addEventListener('click', () => toggleList());
    $('#nv-keys').addEventListener('click', () => { const k = $('#nv-keyhelp'); k.hidden = !k.hidden; });
    let idleT = 0; const wake = () => { ov.classList.remove('nv-idle'); clearTimeout(idleT); idleT = setTimeout(() => { if (ov && !ov.querySelector('details[open]') && ov.querySelector('#nv-keyhelp').hidden) ov.classList.add('nv-idle'); }, 2800); };
    ov.addEventListener('pointermove', wake); ov.addEventListener('pointerdown', wake); wake();
    $('#nv-reset').addEventListener('click', () => choose(cur.id));
    $('#nv-close').addEventListener('click', close);
    $('#nv-png').addEventListener('click', snapshot);
    $('#nv-rec').addEventListener('click', record);
    const more = $('#nv-more'); if (more) more.addEventListener('click', () => { more.disabled = true; more.textContent = 'Loading…'; ngLoadAtlasData(() => { const keep = cur.id; ov.remove(); ov = null; open(keep); }); });
    // pointer: rotate / pan / pinch
    const pts = new Map(); let pinch0 = 0, zoom0 = 1;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY, e.shiftKey]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = st.zoom; } ov.querySelectorAll('details[open]').forEach(d => d.open = false); });
    cv.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 2) { pts.set(e.pointerId, [e.clientX, e.clientY, p[2]]); const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) st.zoom = Math.max(0.3, Math.min(12, zoom0 * d / pinch0)); st.panX += (e.clientX - p[0]) / 2; st.panY += (e.clientY - p[1]) / 2; }
      else if (p[2] || e.shiftKey) { st.panX += e.clientX - p[0]; st.panY += e.clientY - p[1]; }
      else { st.yaw += (e.clientX - p[0]) * 0.01; st.pitch = Math.max(-1.5, Math.min(1.5, st.pitch + (e.clientY - p[1]) * 0.01)); }
      pts.set(e.pointerId, [e.clientX, e.clientY, p[2]]); render(); });
    const up = e => { pts.delete(e.pointerId); pinch0 = 0; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.max(0.3, Math.min(12, st.zoom * (e.deltaY < 0 ? 1.1 : 0.91))); render(); }, { passive: false });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', render);
    try { if (ov.requestFullscreen && !document.fullscreenElement) ov.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) {}
    choose(id); raf = requestAnimationFrame(loop);
    setTimeout(() => { const h = ov && ov.querySelector('.nv-hint'); if (h) h.classList.add('nv-fade'); }, 3500);
  }
  function toggleSpin(v) { spin = v === undefined ? !spin : v; const b = ov && ov.querySelector('#nv-spin'); if (b) b.setAttribute('aria-pressed', spin); }
  function listIds() { return (prefs.list || []).filter(id => cells.some(c => c.id === id)); }
  function syncStar() { const b = ov && ov.querySelector('#nv-star'); if (!b || !cur) return; const on = listIds().includes(cur.id), n = listIds().length; b.setAttribute('aria-pressed', on); b.textContent = (on ? '★' : '☆') + ' List' + (n ? ` (${n})` : ''); }
  function toggleList() { const l = listIds(), i = l.indexOf(cur.id); if (i >= 0) l.splice(i, 1); else l.push(cur.id); prefs.list = l; savePrefs(); syncStar(); }
  function step(d) { const ids = listIds().length ? listIds() : cells.map(c => c.id); let i = ids.indexOf(cur.id); i = i < 0 ? 0 : (i + d + ids.length) % ids.length; const keep = { pitch: st.pitch }; choose(ids[i]); st.pitch = keep.pitch; render(); }
  function onKey(e) {
    if (!ov) return; const tag = (e.target || {}).tagName || ''; if (/INPUT|SELECT|TEXTAREA/.test(tag) && e.key !== 'Escape') return;
    if (recording) return; const k = e.key, $ = q => ov.querySelector(q);
    const setSel = (id, v) => { const el = $(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
    if (k === 'Escape') { const openMenu = ov.querySelector('details[open]'); if (openMenu) openMenu.open = false; else if (!$('#nv-keyhelp').hidden) $('#nv-keyhelp').hidden = true; else close(); return; }
    if (k === ' ') { e.preventDefault(); toggleSpin(); }
    else if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); step(1); } else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); step(-1); }
    else if (k === 'p' || k === 'P') toggleList();
    else if (k === 'l' || k === 'L') { const c = $('#nv-labels'); c.checked = !c.checked; c.dispatchEvent(new Event('input', { bubbles: true })); }
    else if (k === 't' || k === 'T') setSel('#nv-title', { name: prefs.custom ? 'custom' : 'none', custom: 'none', none: 'name' }[prefs.title]);
    else if (k === 'c' || k === 'C') setSel('#nv-color', prefs.color === 'type' ? 'dist' : 'type');
    else if (k === 'b' || k === 'B') setSel('#nv-bg', prefs.bg === 'light' ? 'dark' : 'light');
    else if (k === '+' || k === '=') { st.zoom = Math.min(12, st.zoom * 1.15); render(); } else if (k === '-' || k === '_') { st.zoom = Math.max(0.3, st.zoom / 1.15); render(); }
    else if (k === '0') { const p0 = st.pitch; choose(cur.id); st.pitch = p0; render(); }
    else if (k === 'f' || k === 'F') { try { if (document.fullscreenElement) document.exitFullscreen(); else ov.requestFullscreen().catch(() => {}); } catch (err) {} }
    else if (k === 'h' || k === 'H') ov.classList.toggle('nv-hidebar');
    else if (k === 'r' || k === 'R') record(); else if (k === 's' || k === 'S') snapshot();
    else if (k === '?') { const h = $('#nv-keyhelp'); h.hidden = !h.hidden; }
  }
  function close() {
    if (!ov || recording) return; cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); window.removeEventListener('resize', render);
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
    ov.remove(); ov = null; cv = null; spin = false; document.documentElement.classList.remove('nv-open');
  }
  const status = (t, html) => { const s = ov && ov.querySelector('#nv-status'); if (!s) return; s.hidden = !t; if (html) s.innerHTML = t; else s.textContent = t; };

  /* ---------- saving files ---------- */
  let dlns; const getDl = () => dlns !== undefined ? Promise.resolve(dlns) : (window.claude && claude.use ? claude.use('downloads').then(d => (dlns = d)).catch(() => (dlns = null)) : Promise.resolve(dlns = null));
  async function offer(filename, blob) {
    const d = await getDl();
    if (d) { try { await d.save({ filename, data: blob }); return 'saved'; } catch (e) { return e && e.code === 'declined' ? 'declined' : 'failed:' + ((e && e.code) || ''); } }
    try { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); return 'saved'; } catch (e) { return 'failed'; }
  }
  const slug = () => (cur.code || cur.id).replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'neuron';
  function offscreen() { const [W, H] = prefs.size.split('x').map(Number); const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
  async function snapshot() {
    const c = offscreen(); draw(c.getContext('2d'), c.width, c.height, st, G, cur, prefs);
    c.toBlob(async b => { if (!b) return; const r = await offer(`${slug()}.png`, b); status(r === 'saved' ? 'Snapshot offered for saving.' : r === 'declined' ? 'Not saved.' : 'Could not save the snapshot here.'); setTimeout(() => status(''), 3000); }, 'image/png');
  }
  function pickType() {
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return '';
    return ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || '';
  }
  async function record() {
    const type = pickType(); if (!type) { status('This browser cannot record video. Try Chrome, Edge, Firefox or Safari 14.1+.'); return; }
    ov.querySelectorAll('details[open]').forEach(d => d.open = false);
    const c = offscreen(), ctx = c.getContext('2d'), stream = c.captureStream(30), [W, H] = [c.width, c.height];
    const bps = Math.round(Math.min(40e6, W * H * 30 * 0.12));
    let rec; try { rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: bps }); } catch (e) { rec = new MediaRecorder(stream); }
    const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const s0 = { ...st }, dur = prefs.dur * 1000, ext = type.includes('mp4') ? 'mp4' : 'webm';
    recording = { rec }; ov.classList.add('nv-recording');
    const stopped = new Promise(res => rec.onstop = res);
    draw(ctx, W, H, { ...s0 }, G, cur, prefs); rec.start(250);
    const t0 = performance.now();
    await new Promise(res => { const step = now => { const f = Math.min(1, (now - t0) / dur); const sv = { ...s0, yaw: s0.yaw + f * 2 * Math.PI }; draw(ctx, W, H, sv, G, cur, prefs); st.yaw = sv.yaw; render(); status(`● Recording ${Math.round(f * 100)}%`); if (f < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
    await new Promise(r => setTimeout(r, 120)); rec.stop(); await stopped; stream.getTracks().forEach(t => t.stop());
    recording = null; ov.classList.remove('nv-recording'); st.yaw = s0.yaw; render();
    const blob = new Blob(chunks, { type: type.split(';')[0] }), name = `${slug()}-rotation.${ext}`, mb = (blob.size / 1048576).toFixed(1);
    status(`<b>Video ready</b> · ${W}×${H} · ${prefs.dur} s · ${mb} MB · ${ext.toUpperCase()} <button type="button" class="primary" id="nv-save">Save video</button> <button type="button" id="nv-discard">Discard</button>`, true);
    ov.querySelector('#nv-save').onclick = async () => { const r = await offer(name, blob); status(r === 'saved' ? `Saved ${name}.` : r === 'declined' ? 'Not saved. Record again any time.' : 'Saving is not available here.'); setTimeout(() => status(''), 4000); };
    ov.querySelector('#nv-discard').onclick = () => status('');
  }

  window.ngOpenNeuronViewer = open;

  /* ---------- entry points ---------- */
  const FIG_CELL = { 'morph-ca1-layers': 'ca1-a', 'morph-electrotonic': 'ca1-a', 'morph-rall': 'ca1-a', 'morph-dlambda': 'ca1-a', 'morph-sholl': 'ca1-a', 'morph-bap': 'ca1-a', 'morph-cell-types': 'ca1-jarsky', 'ca1-gradients': 'ca1-a' };
  const CANVAS_IDS = ['atCanvas', 'nvCanvas', 'mw-cv', 'nlCv', 'bapCv', 'rmTree'];
  function guessCell() {
    const L = document.getElementById('lesson'), ids = new Set(catalogue().map(c => c.id)); if (!L) return null;
    for (const s of L.querySelectorAll('select')) if (ids.has(s.value)) return s.value;
    const q = new URLSearchParams((location.hash.split('?')[1] || '')).get('cell'); if (q && ids.has(q)) return q;
    const pressed = L.querySelector('[aria-pressed="true"][data-cell], [data-cell].on, [data-cell][aria-selected="true"]'); if (pressed && ids.has(pressed.dataset.cell)) return pressed.dataset.cell;
    return null;
  }
  function decorate() {
    const L = document.getElementById('lesson'); if (!L) return;
    L.querySelectorAll('figure.tb-fig').forEach(fg => {
      const img = fg.querySelector('img'); if (!img || fg.querySelector('.nv-launch')) return;
      const key = (img.getAttribute('src') || '').split('/').pop().replace('.svg', ''); if (!FIG_CELL[key]) return;
      fg.classList.add('nv-has'); fg.insertAdjacentHTML('afterbegin', `<button type="button" class="nv-launch" data-nv="${FIG_CELL[key]}">⛶ Neuron full screen · video</button>`);
    });
    CANVAS_IDS.forEach(id => { const c = document.getElementById(id); if (!c || c.dataset.nv) return; c.dataset.nv = 1; const host = c.parentElement; if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; host.insertAdjacentHTML('beforeend', '<button type="button" class="nv-launch nv-on-canvas" data-nv="">⛶ Full screen · video</button>'); });
  }
  document.addEventListener('click', e => { const b = e.target.closest('.nv-launch'); if (!b) return; e.preventDefault(); open(b.dataset.nv || guessCell() || 'ca1-a'); });
  let q = 0; const later = () => { clearTimeout(q); q = setTimeout(decorate, 120); };
  const prev = window.ngAfterRender; window.ngAfterRender = function (...a) { if (typeof prev === 'function') prev.apply(this, a); if (ov && !recording) close(); later(); setTimeout(decorate, 1200); };
  const L0 = document.getElementById('lesson'); if (L0 && 'MutationObserver' in window) new MutationObserver(later).observe(L0, { childList: true, subtree: true });

  /* ---------- /biology/neuron-viewer/: a launcher page ---------- */
  const origBio = window.renderBiology;
  if (typeof origBio === 'function') window.renderBiology = function (slug) {
    if (slug !== 'neuron-viewer') return origBio.apply(this, arguments);
    document.title = 'Full-screen neurons & rotation videos · Little Neural Guide';
    const cs = catalogue(), regions = [...new Set(cs.map(c => c.region || 'Other'))];
    document.getElementById('lesson').innerHTML = `<div class="breadcrumbs"><a href="/">Home</a><span>›</span><a href="/biology/cell-atlas/">Neuron studio</a><span>›</span><span>Full screen & videos</span></div>
      <div class="hero"><span class="pill">NEURON STUDIO · ${cs.length} RECONSTRUCTIONS</span><h1>Full-screen neurons<br>and rotation videos</h1><p class="lead">Open any reconstructed cell so that only the neuron fills the screen. Rotate it, zoom in on a branch, and record one full turn as a video for a talk, a poster or a lab meeting.</p></div>
      <section class="box tan"><h2>How it works</h2><ol><li><b>Pick a cell</b> below, or press <b>⛶</b> on any neuron view in the guide.</li><li><b>Look</b>: colour by compartment or path distance; turn labels (legend, scale bar, region) on or off; choose whether the title is the neuron’s name, your own text, or nothing.</li><li><b>Video</b>: choose size (landscape, square, vertical or 4K) and how long one turn takes, then <b>Record one turn</b> and <b>Save video</b>. Chrome, Edge and Safari save MP4; Firefox saves WebM.</li></ol><p class="muted">The source of each reconstruction is always written in the bottom-right corner of the view, snapshots and videos, so credit travels with the file.</p></section>
      ${regions.map(r => `<section class="lesson-section"><p class="eyebrow">${esc(r)}</p><div class="nv-grid">${cs.filter(c => (c.region || 'Other') === r).map(c => `<button type="button" class="nv-card nv-launch" data-nv="${esc(c.id)}"><b>${esc(c.name)}</b><span>${esc(c.code)}${c.species ? ' · ' + esc(c.species) : ''}</span><small>${esc(c.cite)}</small></button>`).join('')}</div></section>`).join('')}
      ${!atlasLoaded() && typeof ngLoadAtlasData === 'function' ? '<p><button type="button" class="secondary" id="nv-load-all">Load the NeuroMorpho.Org cells too</button></p>' : ''}`;
    const b = document.getElementById('nv-load-all'); if (b) b.onclick = () => { b.disabled = true; b.textContent = 'Loading…'; ngLoadAtlasData(() => window.renderGuide()); };
  };
  if (window.ngPath && ngPath() === '/biology/neuron-viewer/') { try { window.renderGuide(); } catch (e) {} }
  later();
})();
