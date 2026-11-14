/* hs-compartments.js: compartments.html. Draws one CA1 pyramidal reconstruction (ca1-n123) three ways:
   1 compartment (Golomb 2006), 2 compartments (Lowet 2023 / Ceballos 2025) and the full compartmental model that
   hippsim's Neurons page simulates (HSCable, compartments of at most 20 µm). Counts come from the actual file. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const FILE = 'morphologies/hippocampal_formation/ca1/ca1-n123.swc';
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let P = null, M = null, view = 'full';
  async function load() {
    const txt = await (await fetch(FILE)).text(), idx = {}; P = [];
    txt.split('\n').forEach(l => { if (!l.trim() || l[0] === '#') return; const a = l.trim().split(/\s+/).map(Number); if (a.length < 7) return; idx[a[0]] = P.length; P.push([a[2], a[3], a[4], a[5], a[1], a[6]]); });
    P.forEach(p => p[5] = p[5] in idx ? idx[p[5]] : -1);
    const so = P.filter(p => p[4] === 1), c = [0, 1, 2].map(j => so.reduce((s, p) => s + p[j], 0) / so.length);
    P.forEach(p => { for (let j = 0; j < 3; j++) p[j] -= c[j]; });
    const ap = P.filter(p => p[4] === 4), my = ap.reduce((s, p) => s + p[1], 0) / (ap.length || 1);
    if (my < 0) P.forEach(p => { p[1] = -p[1]; });          // apical tree up
    M = window.HSCable ? HSCable.build(P, {Lmax: 20}) : null;
    const nAx = M ? [...M.type].filter(t => t === 2).length : 0;
    document.querySelectorAll('[data-ncomp]').forEach(e => e.textContent = M ? M.N.toLocaleString() : '≈ 1 500');
    document.querySelectorAll('[data-npts]').forEach(e => e.textContent = P.length.toLocaleString());
    draw(); runAll();
  }
  function draw() {
    const cv = $('cmpcv'); if (!cv || !P) return;
    const d = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * d; cv.height = H * d;
    const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    P.forEach(p => { if (p[4] === 2) return; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    const s = Math.min((W - 30) / (x1 - x0), (H - 30) / (y1 - y0)), X = x => W / 2 + (x - (x0 + x1) / 2) * s, Y = y => H / 2 - (y - (y0 + y1) / 2) * s;
    const ink = css('--hs-ink') || '#1d140d', muted = css('--hs-muted') || '#8a7a70', acc = css('--hs-accent') || '#a62962';
    const PAL = ['#2f6f9f', '#a62962', '#2f7d5b', '#b9771e', '#6b4fa0', '#c0504d'];
    const line = (i, col, w) => { const p = P[i], q = P[p[5]]; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(X(q[0]), Y(q[1])); g.lineTo(X(p[0]), Y(p[1])); g.stroke(); };
    const somaR = Math.max(...P.filter(p => p[4] === 1).map(p => p[3]));
    for (let i = 0; i < P.length; i++) {
      const p = P[i]; if (p[5] < 0 || p[4] === 2 || p[4] === 1) continue;
      if (view === 'one') line(i, 'rgba(140,120,110,.25)', 1);
      else if (view === 'two') line(i, p[4] === 4 || p[4] === 3 ? 'rgba(166,41,98,.35)' : 'rgba(140,120,110,.25)', 1);
      else { const nd = M ? M.nodeOf[i] : i; line(i, PAL[nd % PAL.length], 1.6); }
    }
    g.fillStyle = view === 'one' ? acc : '#2f6f9f';
    if (view === 'one') { g.globalAlpha = .9; g.beginPath(); g.arc(X(0), Y(0), Math.max(18, somaR * s * 3), 0, 7); g.fill(); g.globalAlpha = 1;
      g.fillStyle = ink; g.font = '600 13px system-ui'; g.textAlign = 'center'; g.fillText('one compartment: the whole cell is one voltage', X(0), Y(0) + Math.max(18, somaR * s * 3) + 18); }
    else if (view === 'two') {
      const r = Math.max(14, somaR * s * 2.2), top = Y((y1) * 0.55);
      g.strokeStyle = ink; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(0), Y(0) - r); g.lineTo(X(0), top + 26); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#2f6f9f'; g.beginPath(); g.arc(X(0), Y(0), r, 0, 7); g.fill();
      g.fillStyle = acc; g.beginPath(); g.roundRect ? g.roundRect(X(0) - 30, top - 26, 60, 52, 10) : g.rect(X(0) - 30, top - 26, 60, 52); g.fill();
      g.fillStyle = ink; g.font = '600 12.5px system-ui'; g.textAlign = 'left';
      g.fillText('soma: Na⁺, K⁺, (NaP, M, Ca²⁺…)', X(0) + r + 8, Y(0) + 4);
      g.fillText('“dendrite”: one box (NaP + slow K, or Iₕ)', X(0) + 38, top + 4);
      g.fillStyle = muted; g.font = '12px system-ui'; g.fillText('coupling conductance g_c', X(0) + 8, (Y(0) - r + top + 26) / 2);
    } else { g.beginPath(); g.arc(X(0), Y(0), Math.max(4, somaR * s), 0, 7); g.fill();
      g.fillStyle = ink; g.font = '600 13px system-ui'; g.textAlign = 'left'; g.fillText(`${M ? M.N.toLocaleString() : '≈ 1 500'} compartments (each colour change = a new one)`, 12, H - 12); }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (!b) return; view = b.dataset.view;
    document.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-checked', String(x === b))); draw(); });

  /* ---------- same rhythm into 1, 2 and ~1 000 compartments ---------- */
  let site = 'soma', busy = false;
  const TT = 1000;
  function trace(id, t, v, sp) {
    const cv = $(id); if (!cv) return; const d = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * d; cv.height = H * d;
    const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    if (!t) { g.fillStyle = css('--hs-muted') || '#888'; g.font = '13px system-ui'; g.fillText(v, 8, H / 2); return; }
    const X = x => 4 + x / TT * (W - 8), Y = y => 10 + (40 - y) / 130 * (H - 20);
    g.strokeStyle = css('--hs-ink') || '#222'; g.lineWidth = 1; g.beginPath(); t.forEach((x, i) => i ? g.lineTo(X(x), Y(v[i])) : g.moveTo(X(x), Y(v[i]))); g.stroke();
    const ev = []; sp.forEach((x, i) => (i && x - sp[i - 1] < 14) ? ev[ev.length - 1].push(x) : ev.push([x]));
    ev.forEach(e => { g.fillStyle = e.length > 1 ? '#a62962' : '#2f6f9f'; g.beginPath(); g.arc(X(e[0]), 6, 3.2, 0, 7); g.fill(); });
    return {ss: ev.filter(e => e.length === 1).length, bs: ev.filter(e => e.length > 1).length};
  }
  const say = (n, r, extra) => { const el = $('tx' + n); if (el) el.innerHTML = r ? `<b style="color:#2f6f9f">${r.ss} single</b> · <b style="color:#a62962">${r.bs} bursts</b> in 1 s${extra ? ' · ' + extra : ''}` : extra; };
  async function runAll() {
    if (busy || !P || !window.irMake) return; busy = true; $('trun').disabled = true;
    try {
      const S = {Iapp: 1, Ath: 1, fth: 10, Aga: 2, fga: 40, site, D: 0, seed: 1};
      // 1 compartment: the Ceballos soma alone
      if (site === 'dend') { trace('tr1', null, 'No dendrite: there is nowhere else to put the input.'); say(1, null, 'A 1-compartment cell cannot tell soma input from dendritic input.'); }
      else { const P1 = Object.assign({}, IR_HH, IR_GATE.hybrid[1], {dend: 0}), r = irRun('hh', P1, Object.assign({}, S), TT); say(1, trace('tr1', r.t, r.Vs, r.spikes)); }
      await new Promise(r => setTimeout(r, 0));
      // 2 compartments: Ceballos 2025 (soma + Iₕ dendrite)
      const P2 = Object.assign({}, IR_HH, IR_GATE.hybrid[1]), r2 = irRun('hh', P2, Object.assign({}, S), TT);
      say(2, trace('tr2', r2.t, r2.Vs, r2.spikes), site === 'dend' ? 'all input into the one dendrite box: one step away from the soma, whatever the distance' : '');
      await new Promise(r => setTimeout(r, 0));
      // reconstruction: research model, θ + γ to the soma or the apical tuft
      $('tx3').textContent = 'Simulating ~1 000 compartments…';
      const T = HSModels.EXPERIMENTS.thetagamma, Mo = HSModels.MODELS.research;
      const p = Object.fromEntries([...T.params, ...Mo.params].map(q => [q.k, q.base])); p.where = site === 'dend' ? 'tuft' : 'soma';
      const R = await HSModels.runTest(P, cacheR, 'research', 'thetagamma', p, [], () => {});
      say(3, trace('tr3', R.t, R.vSoma, spikesOf(R.t, R.vSoma)), site === 'dend' ? 'DC still at the soma; θ + γ spread over the apical tuft (> 350 µm). Compare how much of the rhythm still shapes the spikes.' : '');
    } catch (e) { console.error(e); $('tnote').textContent = 'Could not run: ' + e.message; }
    busy = false; $('trun').disabled = false;
  }
  const cacheR = {};
  const spikesOf = (t, v) => { const s = []; let up = false; v.forEach((x, i) => { if (x > -20 && !up) { s.push(t[i]); up = true; } else if (x < -40) up = false; }); return s; };
  document.addEventListener('click', e => { const b = e.target.closest('[data-site]'); if (b) { site = b.dataset.site; document.querySelectorAll('[data-site]').forEach(x => x.setAttribute('aria-checked', String(x === b))); runAll(); }
    if (e.target.id === 'trun') runAll(); });
  addEventListener('resize', draw);
  load().catch(() => { const c = $('cmpcv'); if (c) c.replaceWith(Object.assign(document.createElement('p'), {textContent: 'Could not load the reconstruction.'})); });
})();
