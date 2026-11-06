/* Extracted from Little Neural Guide modellab.js [628091:658260] — section: REAL CELLS, CONNECTED */
/* ======================= REAL CELLS, CONNECTED ======================= */
/* Reconstructed cells placed in one scene (true scale, schematic placement). A spike in a presynaptic cell runs down
   a drawn axon pathway to synapses on the next cell; each synapse's EPSP spreads passively to the soma (attenuated by
   e^(−d/λ), delayed and broadened with distance); EPSPs sum and the cell fires if the somatic voltage crosses threshold.
   Optional PV basket cell: same Schaffer input, fires slightly later and inhibits the CA1 soma (feedforward inhibition). */
const RC_CELLS = {
  gc: { atlas: 'gc-3319201', at: [-1150, -520], label: 'Dentate granule cell', col: '#3f6f6a' },
  ca3: { atlas: 'ca3-cell1zr', at: [-420, -260], label: 'CA3 pyramidal cell', col: '#4f2a3a' },
  ca1: { atlas: 'ca1-a', at: [520, 150], label: 'CA1 pyramidal cell', col: '#a62962' },
  pv: { atlas: 'pvb-1', at: [1000, 120], label: 'PV basket cell', col: '#5b6b8c' },
};
const RC_MODES = {
  ca3ca1: { label: 'CA3 → CA1', cells: ['ca3', 'ca1', 'pv'] },
  tri: { label: 'DG → CA3 → CA1', cells: ['gc', 'ca3', 'ca1', 'pv'] },
  ec: { label: 'EC → CA1 (direct)', cells: ['ca1', 'pv'] },
};
function renderRealCircuit() {
  if (typeof NRN_CHECK === 'undefined') { $('lesson').innerHTML = '<div class="hero"><h1>Real cells, connected</h1><p>Loading NEURON kernels…</p></div>'; return ngLoadVerify(() => { if (/real-circuit/.test(ngPath())) renderRealCircuit(); }); }
  document.title = 'Real cells, connected · Real biology';
  $('lesson').innerHTML = bioHead('Real cells, connected', 'REAL BIOLOGY · RECONSTRUCTED NEURONS WIRED TOGETHER', 'The same reconstructed granule, CA3, CA1 and basket cells from the atlas, now connected by their pathways. Fire the presynaptic cell and follow the spike down its axon, across synapses, through the next cell’s dendrites to its soma, and see whether that cell fires in turn.')
    + `<nav class="page-jumps"><a href="#experiment">Circuit</a><a href="#rc-how">How it is computed</a><a href="#rc-numbers">Numbers</a><a href="/biology/cell-atlas/">← Cell atlas</a><a href="/biology/network/">Network view →</a></nav>
    <section class="lesson-section lab" id="experiment"><p class="eyebrow">01 · Live</p><h2>Send a spike through real cells</h2>
      <div class="ml-tour" id="ml-tour"></div>
      <div class="lab-layout ml-layout"><div class="lab-controls"><h3>Circuit</h3>
        <div class="lab-actions ml-seg rc-modes">${Object.entries(RC_MODES).map(([k, v], i) => `<button class="secondary" data-rcm="${k}" aria-pressed="${i === 0}">${v.label}</button>`).join('')}</div>
        <button class="primary" id="rcFire">Fire</button>
        ${ctl2('rcN', 'Presynaptic cells firing together', 1, 200, 1, 60, 'each adds one synapse onto the target')}
        ${ctl2('rcGC', 'Granule cells firing together', 1, 12, 1, 4, 'mossy-fibre synapses onto CA3 (DG → CA3 → CA1 mode)')}
        <label class="compare-label"><input type="checkbox" id="rcFFI" checked> Feedforward inhibition (PV basket cell)</label>
        ${ctl2('rcLam', 'Dendritic length constant λ', 150, 900, 10, 350, 'µm')}
        ${ctl2('rcSpeed', 'Slow motion', 1, 20, 0.5, 5, 'ms of neuron time per second')}
        <label class="compare-label"><input type="checkbox" id="rcLabels" checked> Labels</label>
        <label class="compare-label"><input type="checkbox" id="rcShortcut"> Use the e<sup>−d/λ</sup> shortcut instead of NEURON kernels</label>
        <p class="muted">Drag the scene to rotate it.</p></div>
      <div class="ml-figs">
        <figure class="live-chart ml-fig ml-wide"><canvas id="rcScene" class="rc-scene"></canvas><figcaption><b>Reconstructed cells at true scale, schematic placement</b><span><i style="background:#ed83b0"></i>signal now</span><span><i style="background:#141111"></i>synapse</span></figcaption><p class="ml-fignote"><b>How to read it:</b> pink shows where the signal is: a full-size spike in axons, a fading wave in dendrites. Dots on the dendrites are synapses. The long axon pathways are drawn (the reconstructions do not include them).</p></figure>
        <figure class="live-chart ml-fig ml-wide"><canvas id="rcTrace" class="ml-h220"></canvas><figcaption><b>Somatic voltage of each cell</b>${Object.values(RC_CELLS).map(c => `<span><i style="background:${c.col}"></i>${c.label}</span>`).join('')}<span><i style="border-bottom:2px dashed #8c7664;height:0;background:none"></i>threshold</span></figcaption><p class="ml-fignote"><b>How to read it:</b> each synaptic input adds a small bump at the soma; they sum. Crossing the dashed threshold fires a spike. The grey cursor is the current time in the animation.</p></figure>
      </div></div>
      <div class="lab-result" id="rcResult" role="status" aria-live="polite"></div>
      <div class="box pink ml-explain"><p class="eyebrow">What’s happening now</p><div id="rcExplain"></div></div>
      <details class="uth" id="rcUth"><summary><span>Under the hood</span> every synapse, its NEURON kernel, and the parameters used</summary><div id="rcUthBody"></div></details></section>
    <section class="lesson-section" id="rc-how"><p class="eyebrow">02 · The calculation</p><h2>How each step is computed</h2>
      <div class="math-scroll ml-math">\\[V_{soma}(t)=V_{rest}+\\sum_i \\frac{I_i}{50\\,\\mathrm{pA}}\\,K_{s(i)}\\,\\alpha(t-t_i)-\\mathrm{IPSP}(t),\\qquad \\alpha(u)=\\frac{u}{\\tau_{s(i)}}e^{1-u/\\tau_{s(i)}}\\]<p class="muted">K<sub>s</sub> and τ<sub>s</sub>: somatic EPSP peak (per 50 pA) and time-to-peak for a synapse on section s, from NEURON.</p></div>
      <ol class="ml-how">
        <li><b>Spike in the presynaptic cell.</b> It travels along the drawn axon at 0.35 mm/ms (unmyelinated hippocampal axons conduct at roughly 0.2–0.5 mm/ms) and reaches each synapse after a 0.8 ms synaptic delay. Spikes from the group of presynaptic cells are jittered by ±0.5 ms.</li>
        <li><b>Synapses</b> are placed on real dendritic segments in the layer each pathway targets: Schaffer collaterals on CA1 trunk and obliques in radiatum, mossy fibres on proximal CA3 apical dendrite (stratum lucidum), entorhinal input on the CA1 tuft.</li>
        <li><b>Passive spread to the soma.</b> For each synapse the somatic EPSP amplitude and time-to-peak are taken from a passive NEURON model of the reconstruction (precomputed for every dendritic section). The pink wave you see uses the simpler e<sup>−d/λ</sup> picture for display.</li>
        <li><b>Summation and threshold.</b> Rest −65 mV, threshold −52 mV. Each synapse’s somatic EPSP comes from a NEURON simulation of that exact reconstruction (see Under the hood): synaptic currents of 15 pA (Schaffer, entorhinal) give somatic EPSPs of roughly 0.1–0.3 mV; mossy-fibre terminals (400 pA) give several mV.</li>
        <li><b>Feedforward inhibition.</b> The basket cell gets the same Schaffer input but fires earlier in its integration (fast, low threshold), then inhibits the CA1 soma about 1 ms later. It narrows the window in which inputs can sum (Pouille &amp; Scanziani, 2001).</li>
      </ol>
      <p class="muted">This is a teaching calculation, not a compartmental simulation: no active dendritic channels, dendritic spikes or plateau potentials (which can make distal input much more effective; Takahashi &amp; Magee, 2009). To run the real thing, load these reconstructions into NEURON with the ModelDB models linked in the atlas.</p></section>
    <section class="lesson-section" id="rc-numbers"><p class="eyebrow">03 · Numbers to check against</p><h2>How many inputs does it take?</h2>
      <ul class="skill-tips"><li><b>CA3 → CA1:</b> single Schaffer synapses give somatic EPSPs of a fraction of a millivolt, so dozens of CA3 cells must fire together. In the full-scale CA1 model each pyramidal cell receives about 5,985 CA3 connections (Bezaire et al., 2016).</li>
      <li><b>DG → CA3:</b> each CA3 cell receives only a few dozen mossy-fibre inputs, but each is strong and facilitating, so a handful of granule cells firing in a burst can make a CA3 cell fire.</li>
      <li><b>EC → CA1:</b> tuft synapses are far from the soma. On their own they barely move it in a passive cell; real tufts use dendritic spikes, and timing with Schaffer input matters.</li></ul></section>
    <footer><a class="secondary" href="/biology/cell-atlas/">← Cell atlas</a><a class="primary" href="/biology/network/">Network of 300 model neurons →</a></footer>${smallPrint()}`;
  rcInit();
}
function rcInit() {
  let rnd = mulberry(5); let mode = 'ca3ca1', yaw = 0, pitch = 0, anim = null, res = null;
  // place cells in the scene once
  const C = {}; Object.entries(RC_CELLS).forEach(([k, d]) => { const m = ATLAS.find(a => a.id === d.atlas), c = atlasCell(m), G = cellGeometry(c); C[k] = { ...d, m, c, G, regs: cellRegions(m, c, G), somaPath: pathFrom(G, G.roots) }; });
  const W = (k, x, y, z) => [x + C[k].at[0], y + C[k].at[1], z];                       // cell → scene coordinates
  const pick = (k, keys, n) => { const segs = C[k].G.segs.map((s, i) => i).filter(i => keys.includes(C[k].regs.list[C[k].regs.seg[i]].key) && C[k].G.segs[i].t !== 2); return Array.from({ length: n }, () => segs[Math.floor(rnd() * segs.length)]); };
  const segMid = (k, i) => { const s = C[k].G.segs[i]; return W(k, (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, (s.z1 + s.z2) / 2); };
  const polyLen = pts => pts.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  /** Compute the whole event sequence for the current settings. */
  const simulate = () => {
    rnd = mulberry(5); const useNRN = !$('rcShortcut').checked;      // same synapse layout every time for a given setting
    const N = +$('rcN').value, NG = +$('rcGC').value, lam = +$('rcLam').value, ffi = $('rcFFI').checked, cells = RC_MODES[mode].cells, out = { spikes: {}, syn: [], paths: [], V: {}, events: [] };
    const V = {}; cells.forEach(k => { V[k] = new Float64Array(601).fill(-65); }); const dt = 0.1;
    /* Somatic EPSP for a synapse on section `sec`: NEURON kernel (passive cable, this reconstruction) scaled to the synaptic
       current I (pA); shape = alpha function peaking at NEURON's time-to-peak. Falls back to the e^(−d/λ) shortcut if no kernel. */
    const addEPSP = (k, t0, d, I, secIdx) => {
      const m = C[k].m, Vs = useNRN ? nrnSec(m, secIdx, 'Vsoma50') : null, tp = useNRN ? nrnSec(m, secIdx, 'tpk') : null;
      const amp = Vs != null ? Vs * I / 50 : (I / 50) * 0.9 * Math.exp(-d / lam), tau = tp != null ? Math.max(0.8, tp) : 2 + d / 150, ts = tp != null ? t0 : t0 + d / 100;
      for (let j = Math.max(0, Math.floor(ts / dt)); j < 601; j++) { const sdt = j * dt - ts; if (sdt > 0) V[k][j] += amp * (sdt / tau) * Math.exp(1 - sdt / tau); } return amp; };
    const addIPSP = (k, t0, amp) => { const tau = 6; for (let j = Math.max(0, Math.floor(t0 / dt)); j < 601; j++) { const sdt = j * dt - t0; if (sdt > 0) V[k][j] -= amp * (sdt / tau) * Math.exp(1 - sdt / tau); } };
    const fireTime = (k, from = 0) => { for (let j = Math.floor(from / dt); j < 601; j++) if (V[k][j] >= -52) return j * dt; return null; };
    const spikeMark = (k, t) => { const j = Math.round(t / dt); for (let q = j; q < Math.min(601, j + 8); q++) V[k][q] = q === j || q === j + 1 ? 20 : -68 + (q - j) * 0.5; for (let q = j + 8; q < 601; q++) V[k][q] = Math.min(V[k][q], -62); };
    // pathway geometry (drawn axons): returns polyline from presynaptic soma to the target zone
    const route = (from, to, zone) => { const z = zone; if (from === 'ec') return [[1400, 900], [1150, 820], [800, 760], z]; const a = C[from].at; if (from === 'gc') return [[a[0], a[1] - 10], [a[0] + 20, a[1] - 160], [-760, -610], [-480, -330], z];
      if (from === 'ca3') return [[a[0], a[1] - 10], [a[0] + 10, a[1] - 160], [-60, -260], [300, 120], z];
      return [[1400, 900], [1150, 820], [800, 760], z]; };
    const project = (from, to, keys, nSyn, a0, tSpike, jitter) => {
      const syn = pick(to, keys, nSyn), zone = (() => { const m = syn.map(i => segMid(to, i)); return [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length]; })();
      const r = route(from, to, zone), L = polyLen(r), tArr = tSpike + 0.3 + L / 350 + 0.8;
      out.paths.push({ from, to, pts: r, t0: tSpike + 0.3, t1: tSpike + 0.3 + L / 350, L, syn: syn.slice(0, 40).map(i => ({ i, p: segMid(to, i) })) });
      let sumAmp = 0; syn.forEach(i => { const t = tArr + jitter * (rnd() - 0.5) * 2, sg = C[to].G.segs[i], d = (sg.d0 + sg.d1) / 2, a = addEPSP(to, t, d, a0, sg.sec); sumAmp += a; out.syn.push({ k: to, i, t, d, amp: a, sec: sg.sec }); });
      return { tArr, L, sumAmp, n: syn.length };
    };
    const info = {};
    let tCA3 = null, tCA1 = null, tPV = null, tGC = null;
    if (mode === 'tri') { tGC = 1; out.spikes.gc = tGC; spikeMark('gc', tGC); info.mf = project('gc', 'ca3', ['lucidum'], NG, 400, tGC, 0.4); tCA3 = fireTime('ca3'); if (tCA3 != null) { out.spikes.ca3 = tCA3; spikeMark('ca3', tCA3); } }
    if (mode === 'ca3ca1') { tCA3 = 1; out.spikes.ca3 = tCA3; spikeMark('ca3', tCA3); }
    if ((mode === 'ca3ca1' || mode === 'tri') && tCA3 != null) {
      info.sc = project('ca3', 'ca1', ['rad', 'basal'], N, 15, tCA3, 0.5);
      if (ffi) { const tIn = info.sc.tArr, need = 25; if (N >= need) { tPV = tIn + 0.8 + 2 / Math.sqrt(N / need); out.spikes.pv = tPV; addIPSP('ca1', tPV + 1.0, Math.min(7, 2 + N / 40)); } }
    }
    if (mode === 'ec') { info.ec = project('ec', 'ca1', ['tuft'], N, 15, 1, 0.5); if (ffi && N >= 40) { tPV = info.ec.tArr + 2.5; out.spikes.pv = tPV; addIPSP('ca1', tPV + 1, Math.min(5, 1 + N / 60)); } }
    if (cells.includes('ca1')) { tCA1 = fireTime('ca1'); if (tCA1 != null) { out.spikes.ca1 = tCA1; spikeMark('ca1', tCA1); } }
    if (cells.includes('pv') && tPV != null) spikeMark('pv', tPV);
    out.V = V; out.info = info; out.peak = cells.includes('ca1') ? Math.max(...V.ca1.filter(v => v < 0)) : null;
    return out;
  };
  /** Per-cell glow: spike from the soma (axon full size, dendrites fading) and passive EPSP waves from synapses. */
  const glowFns = r => {
    const lam = +$('rcLam').value, g = {};
    Object.keys(C).forEach(k => {
      const G = C[k].G, ts = r.spikes[k], P = C[k].somaPath.dist, syn = r.syn.filter(s => s.k === k);
      let ep = null; if (syn.length) { const srcs = [...new Set(syn.slice(0, 60).map(s => s.i))], PD = pathFrom(G, srcs); ep = { d: PD.dist, t: Math.min(...syn.map(s => s.t)) }; }
      g[k] = (i, s, t) => {
        let v = 0;
        if (ts != null) { const arr = ts + (s.t === 2 ? P[i] / 400 : P[i] / 200), amp = s.t === 2 ? 1 : Math.exp(-P[i] / (0.9 * lam)); if (t >= arr) v = Math.max(v, amp * Math.exp(-(t - arr) / 0.8)); }
        if (ep && s.t !== 2) { const arr = ep.t + ep.d[i] / 100; if (t >= arr) v = Math.max(v, 0.85 * Math.exp(-ep.d[i] / lam) * Math.exp(-(t - arr) / 3)); }
        return v;
      };
    });
    return g;
  };
  let glow = null;
  const draw = () => {
    const cv = $('rcScene'), dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#fffaf4'; ctx.fillRect(0, 0, w, h);
    const t = anim ? anim.t : -1, cells = RC_MODES[mode].cells, P = atProj(yaw, pitch);
    // fit: fixed scene box
    const box = (() => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const inc = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
      cells.forEach(k => C[k].G.segs.forEach(s => { if (s.t === 2 && (k === 'pv' || k === 'gc')) return; const p = W(k, s.x2, s.y2, 0); inc(p[0], p[1]); }));
      if (res) res.paths.forEach(p => p.pts.forEach(q => { if (q[0] < 1300) inc(q[0], q[1]); })); const px = (x1 - x0) * 0.1 + 260, py = (y1 - y0) * 0.06 + 60; return [x0 - px, x1 + px, y0 - py, y1 + py]; })();
    const sc = Math.min(w / (box[1] - box[0]), h / (box[3] - box[2])) * 0.98, ox = w / 2 - sc * (box[0] + box[1]) / 2, oy = h / 2 + sc * (box[2] + box[3]) / 2, X = v => ox + v * sc, Y = v => oy - v * sc;
    const pr = (x, y, z) => { const a = P(x - (box[0] + box[1]) / 2, y - (box[2] + box[3]) / 2, z); return [X(a[0] + (box[0] + box[1]) / 2), Y(a[1] + (box[2] + box[3]) / 2)]; };
    // pathways
    if (res) res.paths.forEach(p => {
      ctx.strokeStyle = 'rgba(20,17,17,.35)'; ctx.lineWidth = 1.4; ctx.setLineDash([6, 4]); ctx.beginPath(); p.pts.forEach((q, k) => { const a = pr(q[0], q[1], 0); k ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); }); ctx.stroke(); ctx.setLineDash([]);
      const end = p.pts[p.pts.length - 1]; ctx.strokeStyle = 'rgba(20,17,17,.18)'; ctx.lineWidth = 0.8; p.syn.forEach(s => { const a = pr(end[0], end[1], 0), b = pr(s.p[0], s.p[1], s.p[2]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      if (t >= p.t0 && t <= p.t1 + 1) { const f = Math.min(1, (t - p.t0) / (p.t1 - p.t0)); let acc = 0, target = f * p.L; for (let k = 1; k < p.pts.length; k++) { const a = p.pts[k - 1], b = p.pts[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc + l >= target) { const u = (target - acc) / l, q = pr(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0); ctx.fillStyle = '#ed83b0'; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill(); ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(q[0], q[1], 14, 0, 7); ctx.fill(); ctx.globalAlpha = 1; break; } acc += l; } }
      if ($('rcLabels').checked) { const mid = p.pts[Math.min(2, p.pts.length - 2)], a = pr(mid[0], mid[1], 0); ctx.fillStyle = '#6f4c27'; ctx.font = '600 12px system-ui'; ctx.fillText(p.from === 'gc' ? 'mossy fibre (drawn)' : p.from === 'ca3' ? 'Schaffer collateral (drawn)' : 'temporoammonic path from EC layer III', a[0] + 6, a[1] - 6); }
    });
    // cells
    const segsAll = [];
    cells.forEach(k => { const cc = C[k]; cc.G.segs.forEach((s, i) => { if (s.t === 2 && (k === 'pv' || k === 'gc')) return; const a = pr(...W(k, s.x1, s.y1, s.z1)), b = pr(...W(k, s.x2, s.y2, s.z2)); segsAll.push({ k, s, i, a, b }); }); });
    ctx.lineCap = 'round';
    segsAll.forEach(({ k, s, i, a, b }) => { let col = s.t === 2 ? 'rgba(20,17,17,.3)' : C[k].col + 'aa', lw = Math.max(s.t === 2 ? .5 : .8, s.r * 2 * sc);
      if (glow && t >= 0) { const g = glow[k](i, s, t); if (g > 0.03) { col = `rgba(237,131,176,${Math.min(1, 0.3 + g)})`; lw = Math.max(lw, 1.4 + 3 * g); } }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
    cells.forEach(k => { const so = C[k].c.soma, fired = res && res.spikes[k] != null && t >= res.spikes[k] && t < res.spikes[k] + 2; ctx.fillStyle = fired ? '#ed83b0' : '#141111'; ctx.beginPath(); for (let q = 0; q < so.length; q += 2) { const a = pr(...W(k, so[q], so[q + 1], 0)); q ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]); } ctx.closePath(); ctx.fill();
      if ($('rcLabels').checked) { const a = pr(...W(k, 0, 0, 0)), L = k === 'gc' || k === 'ca1'; ctx.textAlign = L ? 'right' : 'left'; const x = a[0] + (L ? -16 : 16); ctx.fillStyle = C[k].col; ctx.font = '700 13px system-ui'; ctx.fillText(C[k].label, x, a[1] + 4); ctx.font = '11px system-ui'; ctx.fillStyle = '#6f4c27'; ctx.fillText(C[k].m.code + ' · ' + C[k].m.species.toLowerCase(), x, a[1] + 18); ctx.textAlign = 'left'; } });
    // synapses
    if (res) res.paths.forEach(p => p.syn.forEach(s => { const a = pr(s.p[0], s.p[1], s.p[2]), on = t >= 0 && res.syn.find(q => q.i === s.i && q.k === p.to && t >= q.t && t < q.t + 2); ctx.fillStyle = on ? '#ed83b0' : 'rgba(20,17,17,.7)'; ctx.beginPath(); ctx.arc(a[0], a[1], on ? 3.5 : 1.8, 0, 7); ctx.fill(); }));
    if (cells.includes('pv') && res && res.spikes.pv != null && t >= res.spikes.pv) { const a = pr(...W('pv', 0, 0, 0)), b = pr(...W('ca1', 0, 0, 0)), f = Math.min(1, (t - res.spikes.pv) / 1); ctx.strokeStyle = '#5b6b8c'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); ctx.stroke(); ctx.setLineDash([]); if ($('rcLabels').checked) { ctx.fillStyle = '#5b6b8c'; ctx.font = '600 12px system-ui'; ctx.fillText('perisomatic inhibition', (a[0] + b[0]) / 2 - 20, (a[1] + b[1]) / 2 + 50); } }
    if (t >= 0) { ctx.fillStyle = '#141111'; ctx.font = '600 13px system-ui'; ctx.fillText(`t = ${t.toFixed(1)} ms`, 12, 20); }
    rcView = { pr };
    drawTrace(t);
  };
  let rcView = null;
  const drawTrace = t => {
    if (!res) return; const a = axes($('rcTrace'), { xlim: [0, 40], ylim: [-75, 25], xlabel: 'time (ms)', ylabel: 'mV' });
    vlineTrace(a, -52); const ts = Array.from({ length: 401 }, (_, j) => j * 0.1);
    RC_MODES[mode].cells.forEach(k => { if (!res.V[k]) return; lineTrace(a, ts, Array.from(res.V[k].slice(0, 401)), C[k].col); });
    if (t >= 0) { a.ctx.strokeStyle = 'rgba(20,17,17,.35)'; a.ctx.lineWidth = 1; a.ctx.beginPath(); a.ctx.moveTo(a.X(Math.min(40, t)), a.T); a.ctx.lineTo(a.X(Math.min(40, t)), a.h - a.B); a.ctx.stroke(); }
    a.done();
  };
  const lineTrace = (a, xs, ys, col) => { a.ctx.strokeStyle = col; a.ctx.lineWidth = 2; a.ctx.beginPath(); xs.forEach((x, k) => k ? a.ctx.lineTo(a.X(x), a.Y(ys[k])) : a.ctx.moveTo(a.X(x), a.Y(ys[k]))); a.ctx.stroke(); };
  const vlineTrace = (a, y) => { a.ctx.strokeStyle = '#8c7664'; a.ctx.setLineDash([5, 4]); a.ctx.beginPath(); a.ctx.moveTo(a.L, a.Y(y)); a.ctx.lineTo(a.w - a.R, a.Y(y)); a.ctx.stroke(); a.ctx.setLineDash([]); };
  const report = () => {
    const r = res, N = +$('rcN').value, NG = +$('rcGC').value, lam = +$('rcLam').value, parts = [];
    const s = k => r.spikes[k] != null ? `<b>fires at ${r.spikes[k].toFixed(1)} ms</b>` : '<b>does not fire</b>';
    $('rcResult').innerHTML = RC_MODES[mode].cells.map(k => `${C[k].label}: ${s(k)}`).join(' · ') + (r.peak != null && r.spikes.ca1 == null ? ` · CA1 peak ${r.peak.toFixed(1)} mV` : '');
    if (r.info.mf) parts.push(`<p><b>Mossy fibres.</b> ${NG} granule cell${NG > 1 ? 's' : ''} fire. Each mossy-fibre synapse sits on the proximal apical dendrite (≈ ${Math.round(r.syn.filter(x => x.k === 'ca3').reduce((t, x) => t + x.d, 0) / Math.max(1, r.info.mf.n))} µm from the soma) and is large, so the CA3 cell ${r.spikes.ca3 != null ? 'reaches threshold: a few granule cells are enough (“detonator” synapses).' : 'stays below threshold: add granule cells.'}</p>`);
    if (r.info.sc) { const meanD = r.syn.filter(x => x.k === 'ca1').reduce((t, x) => t + x.d, 0) / Math.max(1, r.info.sc.n), uni = 0.3 * Math.exp(-meanD / lam);
      parts.push(`<p><b>Schaffer collaterals.</b> The spike travels ${(r.info.sc.L / 1000).toFixed(2)} mm along the drawn axon (≈ ${(r.info.sc.L / 350).toFixed(1)} ms). ${N} synapses land on CA1 trunk, obliques and basal dendrites, on average ${Math.round(meanD)} µm from the soma, so each adds only ≈ ${uni.toFixed(2)} mV at the soma. ${r.spikes.ca1 != null ? `Together they cross threshold and CA1 fires; its spike then runs out along its own axon and back into its dendrites.` : `Together they reach ${r.peak.toFixed(1)} mV, below the −52 mV threshold. Increase the number of CA3 cells firing together${$('rcFFI').checked ? ' or turn off feedforward inhibition' : ''}.`}</p>`); }
    if (r.info.ec) parts.push(`<p><b>Direct entorhinal input.</b> Synapses sit on the tuft, ${Math.round(r.syn.filter(x => x.k === 'ca1').reduce((t, x) => t + x.d, 0) / Math.max(1, r.info.ec.n))} µm out on average, so in this passive calculation each contributes only ≈ ${(0.3 * Math.exp(-r.syn.filter(x => x.k === 'ca1').reduce((t, x) => t + x.d, 0) / Math.max(1, r.info.ec.n) / lam)).toFixed(3)} mV at the soma. ${r.spikes.ca1 != null ? 'With this many inputs CA1 still fires.' : 'CA1 does not fire.'} Real CA1 tufts can generate dendritic spikes, and pairing tuft input with Schaffer input drives plateau potentials and plasticity (Takahashi &amp; Magee, 2009).</p>`);
    if (r.spikes.pv != null) parts.push(`<p><b>Feedforward inhibition.</b> The basket cell fires at ${r.spikes.pv.toFixed(1)} ms and inhibits the CA1 soma ≈ 1 ms later. Excitation that has not summed to threshold by then is cut short: a narrow window for coincidence detection.</p>`);
    $('rcExplain').innerHTML = parts.join('') || '<p>Press <b>Fire</b>.</p>';
    const useNRN = !$('rcShortcut').checked, rows = r.syn.slice(0, 30).map((x, k) => `<tr><td>${k + 1}</td><td>${C[x.k].label}</td><td>${Math.round(x.d)} µm</td><td>${x.t.toFixed(2)} ms</td><td><b>${x.amp.toFixed(3)} mV</b></td><td>${useNRN && nrnSec(C[x.k].m, x.sec, 'tpk') != null ? nrnSec(C[x.k].m, x.sec, 'tpk').toFixed(1) + ' ms' : '—'}</td></tr>`).join('');
    const byK = {}; r.syn.forEach(x => { (byK[x.k] = byK[x.k] || []).push(x.amp); });
    $('rcUthBody').innerHTML = `<div class="uth-grid"><section><h4>Method</h4><p>${useNRN ? '<b>NEURON kernels.</b> For every dendritic section of each reconstruction, a 50 pA synaptic current (rise 0.3 ms, decay 3 ms) was injected in a passive NEURON model of that exact cell, and the somatic EPSP peak and time-to-peak were stored. Here each synapse contributes that EPSP scaled to its synaptic current.' : '<b>Shortcut.</b> Somatic EPSP = (I/50 pA) × 0.9 mV × e<sup>−d/λ</sup>, delayed by d/(0.1 mm/ms).'} EPSPs add linearly (a passive approximation: real synapses sum sublinearly near each other and supralinearly with dendritic spikes).</p>
      <ul class="skill-tips"><li>Synaptic currents: Schaffer and entorhinal 15 pA, mossy fibre 400 pA (large, facilitating terminals).</li><li>Axon conduction 0.35 mm/ms; synaptic delay 0.8 ms; presynaptic jitter ±0.5 ms.</li><li>Rest −65 mV, threshold −52 mV. Basket-cell IPSP: amplitude min(7, 2 + N/40) mV, τ 6 ms, 1 ms after the basket cell fires.</li></ul>
      <p>Sum of synaptic peaks: ${Object.entries(byK).map(([k, v]) => `${C[k].label} ${v.reduce((a, b) => a + b, 0).toFixed(1)} mV from ${v.length} synapses (mean ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3)} mV)`).join('; ')}. The peak of the summed trace is smaller than this sum, because EPSPs arrive spread in time.</p></section>
      <section><h4>First ${Math.min(30, r.syn.length)} synapses</h4><div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>#</th><th>Target</th><th>Path distance</th><th>Arrival</th><th>Somatic EPSP</th><th>Time-to-peak</th></tr></thead><tbody>${rows}</tbody></table></div></section></div>`;
  };
  const loop = now => { if (!document.body.contains($('rcScene'))) return; if (anim) { anim.t = (now - anim.t0) / 1000 * +$('rcSpeed').value; if (anim.t > 42) anim.t = 42; } draw(); if (anim && anim.t < 42) requestAnimationFrame(loop); };
  const fire = () => { res = simulate(); glow = glowFns(res); anim = { t0: performance.now(), t: 0 }; report(); requestAnimationFrame(loop); };
  const recompute = () => { res = simulate(); glow = glowFns(res); report(); draw(); };
  document.querySelectorAll('[data-rcm]').forEach(b => b.onclick = () => { mode = b.dataset.rcm; document.querySelectorAll('[data-rcm]').forEach(x => x.setAttribute('aria-pressed', x === b)); yaw = 0; pitch = 0; fire(); });
  $('rcFire').onclick = fire; $('rcLabels').onchange = draw;
  [['rcN', v => v], ['rcGC', v => v], ['rcLam', v => v + ' µm'], ['rcSpeed', v => v + ' ms/s']].forEach(([id, f]) => { const e = $(id), o = $(id + '-o'), u = () => o.textContent = f(e.value); e.addEventListener('input', () => { u(); if (id !== 'rcSpeed') recompute(); }); u(); });
  $('rcFFI').onchange = recompute; $('rcShortcut').onchange = recompute;
  const cv = $('rcScene'); let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; yaw = drag.yaw + (e.clientX - drag.x) * 0.006; pitch = Math.max(-1, Math.min(1, drag.pitch + (e.clientY - drag.y) * 0.006)); if (!anim || anim.t >= 42) draw(); });
  cv.addEventListener('pointerup', () => { drag = null; });
  mountTour([
    { title: 'One CA3 spike is not enough', apply: () => { document.querySelector('[data-rcm="ca3ca1"]').click(); setRc('rcN', 5); fire(); }, text: 'With only 5 CA3 cells firing together, five Schaffer synapses land on CA1. Each adds about 0.2 mV at the soma: far from threshold.', look: 'the small bump on the CA1 voltage trace.' },
    { title: 'Synchrony fires CA1', apply: () => { $('rcFFI').checked = false; setRc('rcN', 90); fire(); }, text: 'With ~90 CA3 cells firing within a millisecond and no inhibition, the EPSPs sum past threshold and CA1 fires. Watch its spike run out along its axon and back into its dendrites.', look: 'the CA1 trace crossing the dashed line and the pink spike spreading through the CA1 cell.' },
    { title: 'Feedforward inhibition', apply: () => { $('rcFFI').checked = true; setRc('rcN', 90); fire(); }, text: 'Turn the basket cell back on. It receives the same input, fires early and inhibits the CA1 soma, so CA1 needs more synchronous input to fire, and only in a narrow time window.', look: 'the dip in the CA1 trace after the basket cell fires.' },
    { title: 'The trisynaptic chain', apply: () => { document.querySelector('[data-rcm="tri"]').click(); setRc('rcGC', 4); setRc('rcN', 120); fire(); }, text: 'Now start in the dentate gyrus. A few granule cells fire; their mossy fibres hit the proximal CA3 dendrite with large synapses, CA3 fires, and its Schaffer collaterals drive CA1.', look: 'three cells firing in sequence, each a few milliseconds after the last.' },
    { title: 'Distal input is weak at the soma', apply: () => { document.querySelector('[data-rcm="ec"]').click(); setRc('rcN', 150); fire(); }, text: 'Entorhinal synapses land on the CA1 tuft, 400+ µm away. In a passive cell even 150 of them move the soma by only a few millivolts. Real tufts rely on dendritic spikes and timing with CA3 input.', look: 'the tiny CA1 response and the fading pink wave in the tuft.' },
  ]);
  function setRc(id, v) { $(id).value = v; $(id).dispatchEvent(new Event('input')); }
  fire();
  window.addEventListener('resize', () => { if (document.body.contains(cv)) draw(); });
}
window.renderRealCircuit = renderRealCircuit;

