/* Extracted from Little Neural Guide modellab.js [182593:213241] — section: C. THE CA1 CIRCUIT */
/* ======================================================================
   C. THE CA1 CIRCUIT: layers, generated morphologies, pathways
   ====================================================================== */
/* Depth coordinates (µm from alveus). Approximate rat dorsal CA1 proportions. */
const LAY = [
  { k: 'alv', name: 'Alveus', y0: 0, y1: 30, fill: '#efe6dc', info: 'White matter carrying CA1 pyramidal axons out of the hippocampus toward the subiculum and entorhinal cortex.' },
  { k: 'so', name: 'Stratum oriens (SO)', y0: 30, y1: 177, fill: '#f6eee6', info: 'Basal dendrites of pyramidal cells, somata of OLM interneurons, and some CA3 Schaffer collateral input.' },
  { k: 'sp', name: 'Stratum pyramidale (SP)', y0: 177, y1: 238, fill: '#f3e1e6', info: 'Densely packed pyramidal cell bodies (roughly 300,000 per hemisphere in rat; Bezaire & Soltesz, 2013) and PV basket cells, which inhibit somata and drive gamma rhythms.' },
  { k: 'sr', name: 'Stratum radiatum (SR)', y0: 238, y1: 465, fill: '#fbf5ef', info: 'Apical trunk and oblique dendrites. Main target of CA3 Schaffer collaterals: the trisynaptic pathway’s final step.' },
  { k: 'slm', name: 'Stratum lacunosum-moleculare (SLM)', y0: 465, y1: 669, fill: '#f6eee6', info: 'Distal apical tuft. Receives direct entorhinal cortex layer III input (temporoammonic path) and OLM inhibition. h-channel density is highest out here (Magee, 1998).' },
];
/** Seeded generator of a pyramidal neuron: segments with path distance from the soma. */
function genPyramidal(x0, seed) {
  const r = mulberry(seed), segs = [];
  const add = (x1, y1, x2, y2, w, kind, d0) => { const L = Math.hypot(x2 - x1, y2 - y1); segs.push({ x1, y1, x2, y2, w, kind, d0, d1: d0 + L }); return d0 + L; };
  function branch(x, y, ang, len, w, depth, kind, d, ymin, ymax) {   // wiggly branch, maybe bifurcating
    let px = x, py = y, dd = d; const n = Math.max(2, Math.round(len / 12));
    for (let i = 0; i < n; i++) {
      ang += (r() - .5) * 0.35; const nx = px + Math.sin(ang) * len / n, ny = Math.max(ymin, Math.min(ymax, py + Math.cos(ang) * len / n));
      dd = add(px, py, nx, ny, w * (1 - 0.35 * i / n), kind, dd); px = nx; py = ny;
    }
    if (depth > 0) { const sp = 0.35 + r() * 0.4; branch(px, py, ang - sp, len * (0.6 + r() * .3), w * .7, depth - 1, kind, dd, ymin, ymax); branch(px, py, ang + sp, len * (0.6 + r() * .3), w * .7, depth - 1, kind, dd, ymin, ymax); }
  }
  const sy = 200 + r() * 18;
  // apical trunk through SR with obliques
  let x = x0, y = sy + 8, d = 0, ang = (r() - .5) * 0.1;
  while (y < 545) {
    const step = 14, nx = x + Math.sin(ang) * step, ny = y + step; ang = ang * 0.8 + (r() - .5) * 0.12;
    d = add(x, y, nx, ny, 3.4 - 1.8 * (y - sy) / 360, 'apical', d); x = nx; y = ny;
    if (y < 470 && r() < 0.32) branch(x, y, (r() < .5 ? -1 : 1) * (0.7 + r() * .6), 60 + r() * 90, 1.1, r() < .4 ? 1 : 0, 'oblique', d, 235, 528);
  }
  for (let k = 0; k < 3; k++) branch(x, y, (k - 1) * 0.75 + (r() - .5) * .3, 45 + r() * 30, 1.4, 2, 'tuft', d, 535, 675);       // tuft in SLM
  for (let k = 0; k < 5; k++) branch(x0 + (r() - .5) * 6, sy - 6, Math.PI + (k - 2) * 0.55 + (r() - .5) * .3, 60 + r() * 50, 1.3, 1 + (r() < .5 ? 1 : 0), 'basal', 0, 35, 200); // basal in SO
  // axon: down from soma base, then into the alveus
  let ax = x0, ay = sy - 4; const axon = [];
  for (let i = 0; i < 14; i++) { const nx = ax + (r() - .5) * 4, ny = ay - 14; axon.push({ x1: ax, y1: ay, x2: nx, y2: Math.max(15, ny) }); ax = nx; ay = Math.max(15, ny); }
  axon.push({ x1: ax, y1: ay, x2: ax + 260, y2: 12 + r() * 6 });
  return { x: x0, y: sy, segs, axon, tuftY: y };
}
/** A real reconstructed pyramidal cell (CA1_MORPH, Migliore et al. 2018), mapped layer-by-layer from its
    own traced boundaries onto the common layer depths used here. Path distances stay in true µm. */
function realPyramidal(ci, x0, mirror) {
  const c = CA1_MORPH[ci], own = c.depth.own, com = c.depth.common, sx = mirror ? -1 : 1;
  const mapY = y => { if (y <= own[0]) return com[0] + (y - own[0]); for (let k = 0; k < 4; k++) if (y <= own[k + 1]) return com[k] + (y - own[k]) / (own[k + 1] - own[k]) * (com[k + 1] - com[k]); return com[4] + (y - own[4]); };
  const segs = [], axon = [], ends = [];
  c.sections.forEach((sec, i) => {
    const [t, par, xyz, r] = sec, n = xyz.length / 3; let d = par >= 0 ? ends[par] : 0, px, py, pz;
    if (par >= 0) { const pp = c.sections[par][2], m = pp.length; px = pp[m - 3]; py = pp[m - 2]; pz = pp[m - 1]; } else { px = xyz[0]; py = xyz[1]; pz = xyz[2]; }
    for (let k = 0; k < n; k++) {
      const x = xyz[3 * k], y = xyz[3 * k + 1], z = xyz[3 * k + 2];
      if (k || par >= 0) {
        const L = Math.hypot(x - px, y - py, z - pz), X1 = x0 + sx * px, Y1 = mapY(py), X2 = x0 + sx * x, Y2 = mapY(y);
        if (t === 2) axon.push({ x1: X1, y1: Y1, x2: X2, y2: Y2 });
        else segs.push({ x1: X1, y1: Y1, x2: X2, y2: Y2, w: Math.max(0.5, r[k] * 2), kind: t === 3 ? 'basal' : (Y2 >= 465 ? 'tuft' : 'apical'), d0: d, d1: d + L });
        d += L;
      }
      px = x; py = y; pz = z;
    }
    ends[i] = d;
  });
  const soma = []; for (let i = 0; i < c.soma.length; i += 2) soma.push([x0 + sx * c.soma[i], mapY(c.soma[i + 1])]);
  return { x: x0, y: mapY(0), segs, axon, soma };
}
function genInterneuron(type, x0, seed) {
  const r = mulberry(seed), dend = [], axon = [];
  const rad = (cx, cy, n, len, ymin, ymax, out) => { for (let k = 0; k < n; k++) { let a = (k / n) * 2 * Math.PI + r() * .4, px = cx, py = cy; for (let i = 0; i < 6; i++) { a += (r() - .5) * .3; const nx = px + Math.cos(a) * len / 6, ny = Math.max(ymin, Math.min(ymax, py + Math.sin(a) * len / 6)); out.push({ x1: px, y1: py, x2: nx, y2: ny }); px = nx; py = ny; } } };
  if (type === 'pv') {
    const cy = 225; rad(x0, cy, 6, 110, 40, 640, dend);
    for (let k = 0; k < 70; k++) { const cx = x0 + (r() - .5) * 320, yy = 185 + r() * 40; let px = cx, py = yy; for (let i = 0; i < 3; i++) { const nx = px + (r() - .5) * 18, ny = py + (r() - .5) * 12; axon.push({ x1: px, y1: py, x2: nx, y2: ny }); px = nx; py = ny; } }
    return { type, x: x0, y: cy, dend, axon };
  }
  const cy = 110; for (let k = 0; k < 4; k++) { let px = x0, py = cy, a = k < 2 ? Math.PI + (r() - .5) * .3 : (r() - .5) * .3; for (let i = 0; i < 7; i++) { a += (r() - .5) * .2; const nx = px + Math.cos(a) * 18, ny = Math.max(40, Math.min(175, py + Math.sin(a) * 10)); dend.push({ x1: px, y1: py, x2: nx, y2: ny }); px = nx; py = ny; } }
  let px = x0, py = cy; for (let i = 0; i < 30; i++) { const nx = px + (r() - .5) * 8, ny = py + 13; axon.push({ x1: px, y1: py, x2: nx, y2: ny }); px = nx; py = ny; }   // ascending axon to SLM
  for (let k = 0; k < 16; k++) { let qx = px, qy = py + (r() - .5) * 30, a = r() < .5 ? 0 : Math.PI; for (let i = 0; i < 6; i++) { a += (r() - .5) * .4; const nx = qx + Math.cos(a) * 22, ny = Math.max(470, Math.min(665, qy + Math.sin(a) * 8)); axon.push({ x1: qx, y1: qy, x2: nx, y2: ny }); qx = nx; qy = ny; } }
  return { type, x: x0, y: cy, dend, axon };
}

xpages[2].lead = 'CA1 is a layered structure: pyramidal cell bodies sit in one thin band, and their dendrites reach into layers that each receive a different input. Where a synapse lands decides how much it influences the cell’s output.';
xpages[2].jumps = [['xp-anat', 'Anatomy'], ['experiment', 'Explore the circuit'], ['xp-cable', 'Why location matters'], ['code', 'Python']];
xpages[2].html = () => sec('xp-anat', '01 · Anatomy', 'Layers, cells and inputs',
  table(['Element', 'Where', 'What it does', 'AD relevance'], [
    ['Pyramidal cells', 'Somata in SP; basal dendrites in SO; apical dendrites through SR to the SLM tuft', 'Principal output neurons; place cells', 'Hyperexcitability and synapse loss reported in AD models'],
    ['PV basket cells', 'Somata near SP; axons wrap pyramidal somata', 'Fast perisomatic inhibition; pace gamma (30–80 Hz)', 'PV-cell dysfunction linked to altered gamma in AD models'],
    ['OLM cells', 'Somata and dendrites in SO; axon to SLM', 'Inhibit distal tufts, gating entorhinal input; theta-related', 'Shape how cortical input reaches CA1'],
    ['Schaffer collaterals (CA3 → CA1)', 'SR and SO', 'Main excitatory input, carrying recalled patterns from CA3', 'Classic site for LTP studies; Aβ impairs LTP here'],
    ['Temporoammonic path (EC III → CA1)', 'SLM', 'Direct cortical input about current sensory context', 'Entorhinal cortex is among the first regions with tau pathology (Braak stages I–II)'],
  ]) + '<p class="muted">Depths in the explorer are approximate rat dorsal CA1 proportions. Pyramidal cells are <b>real reconstructions</b> of rat CA1 neurons (Migliore et al., 2018; ModelDB 244688), each mapped from its own traced layer boundaries onto common layer depths, then repeated or mirrored. Interneurons are schematic. Explore the reconstructions in 3D on the <a href="/biology/cell-atlas/">Real CA1 neurons</a> page.</p>')
  + `<section class="lesson-section lab" id="experiment"><p class="eyebrow">02 · Explore the circuit</p><h2>Stimulate a pathway and follow the signal</h2>
    <div class="ml-tour" id="ml-tour"></div>
    <div class="ca1-wrap"><canvas id="caCanvas" class="ca1-canvas"></canvas>
      <div class="lab-controls ca1-controls"><h3>Stimulate</h3>
        <div class="lab-actions"><button class="primary" data-path="sc">CA3 Schaffer collaterals</button><button class="primary" data-path="ta">Entorhinal (temporoammonic)</button></div>
        ${ctl('caAmp', 'Stimulus strength', 1, 10, 0.5, 5, 'Number of co-active input fibers (scaled).')}
        ${ctl('caLam', 'Dendritic length constant λ', 150, 800, 10, 350, 'µm. Larger λ = less attenuation along dendrites.')}
        <label class="compare-label"><input type="checkbox" id="caPV"> PV basket cells active (perisomatic inhibition)</label>
        <label class="compare-label"><input type="checkbox" id="caOLM"> OLM cells active (distal inhibition)</label>
        <label class="compare-label"><input type="checkbox" id="caIh"> Show h-channel density gradient</label>
        <label class="compare-label"><input type="checkbox" id="caInt" checked> Show interneurons</label>
        <div id="caInfo" class="ml-fp"><b>Click anything</b><p class="muted">Click a layer, a pyramidal soma or an interneuron to learn what it is.</p></div>
      </div></div>
    <div class="ml-figs ca1-traces">${fig('caTr', 'ml-h200 wide', 'Voltage at the synapse vs at the soma (schematic passive estimate)', key([C.plum, 'dendrite, at the synapse'], [C.ink, 'soma']), 'the local EPSP is large and fast; by the time it reaches the soma it is smaller, delayed and broader. Dashed line: a nominal firing threshold.')}</div>
    <div class="lab-result" id="ml-result" role="status" aria-live="polite"></div>
    <div class="box pink ml-explain"><p class="eyebrow">What’s happening now</p><div id="ml-explain-body"></div></div></section>`
  + sec('xp-cable', '03 · Why location matters', 'Dendritic filtering in one equation',
    `<div class="math-scroll ml-math">\\[\\lambda=\\sqrt{\\frac{d\\,R_m}{4R_i}},\\qquad V_{soma}\\approx V_{syn}\\,e^{-x/\\lambda}\\ \\text{(steady state, infinite cable)}\\]</div>
    <p>A dendrite leaks current through its membrane as the signal travels, so voltage falls roughly exponentially with distance x. The length constant λ grows with dendrite diameter d and membrane resistance R<sub>m</sub>, and shrinks with axial resistance R<sub>i</sub>. Brief synaptic events attenuate even more than this steady-state formula suggests, because the membrane capacitance also filters fast signals. CA1 pyramidal cells partly compensate: distal synapses are stronger (synaptic scaling with distance), and active dendritic channels can boost or generate dendritic spikes. See the <a href="/morphology/propagation/">propagation</a> and <a href="/topics/morphology/electrotonic-distance/">electrotonic distance</a> lessons.</p>`)
  + `<section class="lesson-section" id="code"><p class="eyebrow">04 · Do it in Python</p><h2>Attenuation along a compartmental dendrite (NumPy)</h2><div class="code-toolbar"><span>Python 3 · numpy</span><button class="secondary" id="ml-copy">Copy Python</button></div><p id="ml-copy-status" class="muted" role="status"></p><pre><code id="ml-code"></code></pre></section>
  <section class="lesson-section" id="ml-related"><p class="eyebrow">05 · Connect to the guide</p><h2>Related lessons</h2><div class="button-cloud"><a class="secondary" href="/morphology/branching-lab/">Branching morphology lab</a><a class="secondary" href="/topics/morphology/local-versus-soma/">Local response vs soma</a><a class="secondary" href="/topics/synapses/timing-location/">Timing & location</a><a class="secondary" href="/practice/ca1-workspace/">CA1 workspace</a></div></section>`;
let caCtl = null;
xpages[2].tour = [
  { title: 'The layers', apply: () => caCtl && caCtl.info('layers'), text: 'These are real traced CA1 pyramidal neurons. CA1 is stacked in bands. Pyramidal cell bodies form the thin stratum pyramidale. Their basal dendrites reach up into stratum oriens, and the long apical dendrite runs down through stratum radiatum to the tuft in stratum lacunosum-moleculare.', look: 'the labelled bands on the left of the circuit.' },
  { title: 'CA3 input arrives mid-dendrite', apply: () => caCtl && caCtl.fire('sc', { pv: false, olm: false }), text: 'Schaffer collaterals from CA3 run through stratum radiatum and contact the oblique dendrites about 100–300 µm from the soma. The signal spreads toward the soma and shrinks on the way.', look: 'the pulse travelling along the fibers, the dendrites lighting up, then the two voltage traces.' },
  { title: 'Entorhinal input is far away', apply: () => caCtl && caCtl.fire('ta', { pv: false, olm: false }), text: 'The temporoammonic path from entorhinal cortex contacts the distal tuft, 400–500 µm from the soma. With the same strength, far less voltage reaches the soma. Distal input alone rarely fires CA1 cells; it mostly shapes how they respond to CA3 input.', look: 'the soma trace, much smaller than for CA3 input.' },
  { title: 'Perisomatic inhibition vetoes output', apply: () => caCtl && caCtl.fire('sc', { pv: true, olm: false, amp: 8 }), text: 'Activate PV basket cells and repeat a strong CA3 stimulus. Inhibition right at the soma shunts the depolarization where the spike would start, so the cell stays silent. PV cells control when pyramidal cells can fire, which is how they pace gamma.', look: 'the dendrite still depolarizing while the soma response is cut.' },
  { title: 'OLM cells gate cortical input', apply: () => caCtl && caCtl.fire('ta', { pv: false, olm: true }), text: 'OLM interneurons send their axons to the distal tuft. When active, they suppress the entorhinal input there while leaving CA3 input mostly untouched. Interneuron types can therefore choose which input stream dominates.', look: 'the tuft response shrinking compared with the earlier entorhinal stimulus.' },
];
xpages[2].init = () => {
  const W = 1150, H = 700, pyrs = [[0, 170, false], [1, 420, false], [0, 640, true], [1, 900, true], [0, 1060, false]].map(([ci, x, m]) => realPyramidal(ci, x, m));
  const ints = [genInterneuron('pv', 430, 91), genInterneuron('pv', 930, 92), genInterneuron('olm', 240, 93), genInterneuron('olm', 790, 94)];
  const fibers = { sc: [], ta: [] }, fr = mulberry(5);
  for (let k = 0; k < 10; k++) { const y = 258 + k * 20 + fr() * 8, pts = []; for (let x = -20; x <= W + 20; x += 25) pts.push([x, y + Math.sin(x / 70 + k) * 6]); fibers.sc.push(pts); }
  for (let k = 0; k < 7; k++) { const y = 490 + k * 22 + fr() * 6, pts = []; for (let x = W + 20; x >= -20; x -= 25) pts.push([x, y + Math.sin(x / 60 + k) * 5]); fibers.ta.push(pts); }
  const st = { anim: null, last: null };
  const cv = el('caCanvas');
  const view = () => { const { ctx, w, h } = prep(cv), s = Math.min(w / (W + 170), h / (H + 20)), ox = 160 * s; return { ctx, w, h, s, X: x => ox + x * s, Y: y => 10 + y * s }; };
  const opts = () => ({ amp: +el('caAmp').value, lam: +el('caLam').value, pv: el('caPV').checked, olm: el('caOLM').checked, ih: el('caIh').checked, ints: el('caInt').checked });
  /** Passive estimate of local and somatic peak depolarization (mV) for a pathway. */
  const response = (path, o) => {
    const dist = path === 'sc' ? 200 : 450, local = o.amp * (path === 'sc' ? 2.2 : 2.8) * (path === 'ta' && o.olm ? 0.35 : 1);
    const lamEff = o.lam * (o.ih && path === 'ta' ? 0.85 : 1), soma = local * Math.exp(-dist / lamEff) * (o.pv ? 0.3 : 1);
    return { dist, local, soma, delay: dist / 250, tauS: 2 + dist / 120 };
  };
  const draw = (t = null) => {
    const o = opts(), { ctx, s, X, Y } = view();
    LAY.forEach(L => { ctx.fillStyle = L.fill; ctx.fillRect(X(-160 / 1), Y(L.y0), X(W) - X(-160), Y(L.y1) - Y(L.y0)); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(X(-160), Y(L.y1)); ctx.lineTo(X(W), Y(L.y1)); ctx.stroke(); });
    ctx.fillStyle = C.ink; ctx.font = `600 ${Math.max(9, 12 * s * 1.4)}px system-ui`; ctx.textAlign = 'left';
    LAY.forEach(L => { const nm = L.name.match(/\((\w+)\)/)?.[1] || L.name; ctx.fillText(nm, X(-150), Y((L.y0 + L.y1) / 2) + 4); });
    ctx.font = `${Math.max(9, 10 * s * 1.4)}px system-ui`; ctx.fillStyle = C.muted; ctx.textAlign = 'right'; [0, 200, 400, 600].forEach(d => { ctx.fillText(d + ' µm', X(-12), Y(d) + 4); ctx.fillRect(X(-8), Y(d), 6, 1); }); ctx.textAlign = 'left';
    const act = st.anim, prog = act ? Math.min(1, (t - act.t0) / 900) : 0, r = act ? response(act.path, o) : null;
    // fibers
    ['sc', 'ta'].forEach(p => fibers[p].forEach(pts => { ctx.strokeStyle = p === 'sc' ? 'rgba(111,76,39,.28)' : 'rgba(166,41,98,.3)'; ctx.lineWidth = 1; ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke();
      if (act && act.path === p && prog < 0.55) { const f = prog / 0.55, idx = Math.min(pts.length - 1, Math.floor(f * pts.length)); for (let back = 0; back < 3; back++) { const q = pts[Math.max(0, idx - back * 2)]; ctx.fillStyle = p === 'sc' ? C.brown : C.plum; ctx.globalAlpha = 1 - back * .3; ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), 3.2, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; } }));
    // interneurons
    if (o.ints) ints.forEach(n => {
      const on = (n.type === 'pv' && o.pv) || (n.type === 'olm' && o.olm), col = n.type === 'pv' ? '#2f6f8f' : '#3f7f5f';
      ctx.strokeStyle = col; ctx.globalAlpha = on ? .9 : .45; ctx.lineWidth = .8; ctx.beginPath(); n.axon.forEach(sg => { ctx.moveTo(X(sg.x1), Y(sg.y1)); ctx.lineTo(X(sg.x2), Y(sg.y2)); }); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); n.dend.forEach(sg => { ctx.moveTo(X(sg.x1), Y(sg.y1)); ctx.lineTo(X(sg.x2), Y(sg.y2)); }); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(X(n.x), Y(n.y), 9 * s * 1.3, 6 * s * 1.3, 0, 0, 7); ctx.fill();
      if (on) {                                                  // inhibition field: around somata (PV) or across the tuft layer (OLM)
        ctx.fillStyle = col; ctx.globalAlpha = act && prog > 0.4 ? .22 : .1;
        if (n.type === 'pv') pyrs.forEach(p => { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 26 * s * 1.3, 0, 7); ctx.fill(); });
        else ctx.fillRect(X(n.x - 260), Y(470), (520) * s, (195) * s);
        ctx.globalAlpha = 1; }
    });
    // pyramidal cells
    pyrs.forEach(p => {
      ctx.lineCap = 'round';
      p.axon.forEach(sg => { ctx.strokeStyle = 'rgba(20,17,17,.35)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(X(sg.x1), Y(sg.y1)); ctx.lineTo(X(sg.x2), Y(sg.y2)); ctx.stroke(); });
      p.segs.forEach(sg => {
        let col = C.ink, alpha = 1;
        if (o.ih) { const g = Math.min(1, Math.max(0, (sg.d1 - 50) / 450)); col = `rgb(${20 + 146 * g},${17 + 24 * g},${17 + 81 * g})`; }
        if (act && prog > 0.5) {                              // depolarization spreading from the synapse layer
          const target = act.path === 'sc' ? ['oblique', 'apical'] : ['tuft'], inLayer = act.path === 'sc' ? (sg.y1 > 238 && sg.y1 < 465) : sg.y1 > 465;
          const src = inLayer && target.includes(sg.kind) ? 1 : 0, dFrom = Math.abs(sg.d1 - r.dist), spread = Math.min(1, (prog - .5) / .3);
          const v = src ? 1 : Math.exp(-dFrom / o.lam) * (dFrom < spread * 600 ? 1 : 0);
          const fade = 1 - Math.max(0, (prog - .85) / .15) * .6;
          if (v * fade > 0.08) { col = act.path === 'sc' ? C.brown : C.plum; alpha = Math.min(1, 0.25 + v * fade); }
        }
        ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = Math.max(0.6, sg.w * s * 1.5); ctx.beginPath(); ctx.moveTo(X(sg.x1), Y(sg.y1)); ctx.lineTo(X(sg.x2), Y(sg.y2)); ctx.stroke(); ctx.globalAlpha = 1;
      });
      // soma: teardrop pointing toward the apical dendrite
      const fire = act && prog > .7 && prog < .95 && r.soma > 6;
      ctx.fillStyle = fire ? C.hot : C.ink; ctx.beginPath(); if (p.soma && p.soma.length > 2) { p.soma.forEach(([sx, sy], k) => k ? ctx.lineTo(X(sx), Y(sy)) : ctx.moveTo(X(sx), Y(sy))); ctx.closePath(); } else { ctx.moveTo(X(p.x), Y(p.y + 16)); ctx.quadraticCurveTo(X(p.x + 13), Y(p.y - 4), X(p.x), Y(p.y - 10)); ctx.quadraticCurveTo(X(p.x - 13), Y(p.y - 4), X(p.x), Y(p.y + 16)); } ctx.fill();
      if (fire) { ctx.strokeStyle = C.hot; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 22 * s * 1.3, 0, 7); ctx.stroke(); }
    });
    st.v = { X, Y, s };
  };
  const traces = () => {
    const o = opts(), r = st.last ? response(st.last, o) : null;
    const a = axes(el('caTr'), { xlim: [0, 40], ylim: [0, 30], xlabel: 'time after stimulus (ms)', ylabel: 'mV' });
    line(a, [0, 40], [6, 6], C.muted, 1, [5, 4]);
    if (r) {
      const ts = [], loc = [], som = [];
      const alpha = (t, tau) => t <= 0 ? 0 : (t / tau) * Math.exp(1 - t / tau);
      for (let t = 0; t <= 40; t += .2) { ts.push(t); loc.push(r.local * alpha(t - 1, 1.5)); som.push(r.soma * alpha(t - 1 - r.delay, r.tauS)); }
      line(a, ts, loc, C.plum, 2.2); line(a, ts, som, C.ink, 2.4);
    }
    a.done();
    if (!r) { el('ml-result').textContent = 'Press a stimulate button to send a volley down one input pathway.'; explain('<p>Nothing stimulated yet. Choose a pathway above. The animation shows spikes travelling along input fibers, the contacted dendrites depolarizing, the signal spreading toward the soma, and whether the soma reaches threshold.</p>'); return; }
    const ratio = r.soma / r.local, fires = r.soma > 6;
    el('ml-result').innerHTML = `${st.last === 'sc' ? 'CA3 Schaffer collaterals' : 'Entorhinal temporoammonic path'} · synapses ≈ <b>${r.dist} µm</b> from soma · local EPSP <b>${r.local.toFixed(1)} mV</b> → soma <b>${r.soma.toFixed(1)} mV</b> (${(ratio * 100).toFixed(0)}% survives) · ${fires ? '<b>soma reaches threshold</b>' : 'below threshold'}`;
    const parts = [`<p>The input contacts dendrites about ${r.dist} µm from the soma. With a length constant λ = ${o.lam} µm, only about e<sup>−${r.dist}/${o.lam}</sup> ≈ ${(Math.exp(-r.dist / o.lam) * 100).toFixed(0)}% of the local depolarization would survive even at steady state. The somatic response also arrives ~${r.delay.toFixed(1)} ms later and is broader, because the membrane capacitance smooths it on the way.</p>`];
    if (o.pv) parts.push('<p><b>PV basket cells are active.</b> Their synapses sit on the soma itself, so they cut the depolarization exactly where action potentials start. The dendrite still depolarizes, but the output is vetoed.</p>');
    if (o.olm && st.last === 'ta') parts.push('<p><b>OLM cells are active.</b> They inhibit the distal tuft, so the entorhinal input is suppressed before it even starts spreading.</p>');
    if (o.olm && st.last === 'sc') parts.push('<p>OLM inhibition targets the distal tuft, so it barely affects this CA3 input in stratum radiatum. Try the entorhinal pathway to see the difference.</p>');
    parts.push(fires ? '<p>Enough depolarization reaches the soma to cross the nominal threshold, so the pyramidal cells fire (pink flash).</p>' : `<p>The somatic depolarization stays below threshold. ${st.last === 'ta' ? 'Distal input usually needs coincident CA3 input or dendritic spikes to drive output.' : 'Increase the stimulus strength to recruit more fibers.'}</p>`);
    explain(parts.join('') + '<p class="muted">These numbers come from a simplified passive estimate for teaching. Real CA1 dendrites have active channels and distance-dependent synaptic strength.</p>');
  };
  const fire = (path, o = {}) => {
    if (o.pv !== undefined) el('caPV').checked = o.pv; if (o.olm !== undefined) el('caOLM').checked = o.olm; if (o.amp !== undefined) setSlider('caAmp', o.amp);
    st.anim = { path, t0: performance.now() }; st.last = path; traces();
    const tick = now => { if (!st.anim || !document.body.contains(cv)) return; draw(now); if (now - st.anim.t0 < 1300) requestAnimationFrame(tick); else { st.anim = null; draw(); } };
    requestAnimationFrame(tick);
  };
  const infoFor = k => {
    const box = el('caInfo'), L = LAY.find(l => l.k === k);
    const cellInfo = { pyr: ['Pyramidal neuron', 'Soma in stratum pyramidale; basal dendrites in oriens; apical dendrite through radiatum to the tuft in lacunosum-moleculare. Total dendritic length ≈ 10–15 mm with roughly 30,000 excitatory synapses (Megías et al., 2001). The axon exits through the alveus.'],
      pv: ['PV basket cell', 'Fast-spiking interneuron. Its axon forms baskets around pyramidal somata, delivering strong, fast inhibition at the site where spikes start. Synchronizes pyramidal firing at gamma frequencies.'],
      olm: ['OLM interneuron', 'Oriens–lacunosum-moleculare cell. Soma and horizontal dendrites in oriens; axon climbs to lacunosum-moleculare and inhibits distal tufts. Fires in relation to theta and regulates entorhinal input.'],
      layers: ['CA1 layers', LAY.map(l => `<b>${l.name}</b>: ${l.info}`).join('<br>')] };
    const c = L ? [L.name, L.info] : cellInfo[k];
    if (c) box.innerHTML = `<b>${c[0]}</b><p>${c[1]}</p>`;
  };
  cv.addEventListener('click', e => {
    const rect = cv.getBoundingClientRect(), { s } = st.v, ox = 160 * s, x = (e.clientX - rect.left - ox) / s, y = (e.clientY - rect.top - 10) / s;
    const near = (a, b) => Math.hypot(a.x - x, a.y - y) < 30;
    if (el('caInt').checked) { const n = ints.find(near); if (n) return infoFor(n.type); }
    if (pyrs.find(near)) return infoFor('pyr');
    const L = LAY.find(l => y >= l.y0 && y < l.y1); if (L) infoFor(L.k);
  });
  caCtl = { fire, info: infoFor };
  document.querySelectorAll('[data-path]').forEach(b => b.addEventListener('click', () => fire(b.dataset.path)));
  bind('caAmp', v => v.toFixed(1), () => traces()); bind('caLam', v => v + ' µm', () => { draw(); traces(); });
  ['caPV', 'caOLM', 'caIh', 'caInt'].forEach(id => el(id).addEventListener('change', () => { draw(); traces(); }));
  draw(); traces(); redraw.fn = () => { draw(); traces(); };
  attachCode(`import numpy as np

# Passive dendrite as a chain of compartments; soma at index 0.
# Inject a brief synaptic current at a chosen distance; compare local vs somatic voltage.
L_um, n = 500.0, 100                       # dendrite length (µm), compartments
dx = L_um / n * 1e-4                       # cm
d = 2e-4                                   # diameter (cm) = 2 µm
Rm, Ri, Cm = 20000.0, 150.0, 1.0           # Ω·cm², Ω·cm, µF/cm²
area = np.pi * d * dx                      # cm² per compartment
g_leak = area / Rm                         # S
g_ax = (np.pi * d**2 / 4) / (Ri * dx)      # S between neighbours
C = Cm * 1e-6 * area                       # F
soma_area = 4 * np.pi * (10e-4)**2         # 20 µm soma
g_soma, C_soma = soma_area / Rm, Cm * 1e-6 * soma_area

lam = np.sqrt((d * Rm) / (4 * Ri)) * 1e4   # length constant in µm
print(f"lambda = {lam:.0f} µm")

def run(syn_um, dt=1e-5, T=0.04):
    k = int(syn_um / L_um * (n - 1))
    V = np.zeros(n)                        # deviation from rest (V)
    g = np.full(n, g_leak); g[0] += g_soma
    c = np.full(n, C); c[0] += C_soma
    out_local, out_soma = [], []
    for step in range(int(T / dt)):
        t = step * dt
        I = np.zeros(n)
        I[k] = 50e-12 * (t / 1e-3) * np.exp(1 - t / 1e-3)   # alpha-shaped 50 pA peak
        lap = np.zeros(n)
        lap[1:] += V[:-1] - V[1:]; lap[:-1] += V[1:] - V[:-1]
        V += dt * (I - g * V + g_ax * lap) / c
        out_local.append(V[k] * 1e3); out_soma.append(V[0] * 1e3)
    return np.array(out_local), np.array(out_soma)

for syn in (150, 450):                     # stratum radiatum vs lacunosum-moleculare
    loc, som = run(syn)
    print(f"synapse at {syn} µm: local peak {loc.max():.2f} mV, soma peak {som.max():.3f} mV,"
          f" ratio {som.max()/loc.max():.2%}")`);
};

/* ---------- overview + router entry ---------- */
function xOverviewHTML() {
  return `<a class="breadcrumb" href="/">Home</a><div class="hero"><span class="pill">EXPERIMENT → MODEL · 3 INTERACTIVE PAGES</span><h1>From the bench<br>to the model.</h1><p class="lead">Every model parameter should trace back to a measurement. These pages show what is recorded in the lab, how it is analysed, and how a model is fitted to it and tested.</p></div>
  <div class="box pink"><h2>The workflow you will practise</h2><ol class="ml-how"><li><b>Measure:</b> run a protocol (current steps, behavior with recordings) and extract features.</li><li><b>Fit:</b> choose a model and adjust its parameters until it reproduces those features.</li><li><b>Validate:</b> predict a measurement the model never saw, and check it.</li><li><b>Interpret:</b> ask what the fitted parameters mean biologically, and which ones the data could not pin down.</li></ol><p class="muted">All recordings on these pages are synthetic, generated from hidden models with noise, so you can check your fits against the truth.</p></div>
  <div class="overview-cards">${xpages.map((m, i) => `<a class="topic-card" href="/experiments/${m.slug}/"><span class="eyebrow">0${i + 1} · ${m.level.toUpperCase()}</span><h2>${m.title}</h2><p>${m.blurb}</p><span class="card-link">Open →</span></a>`).join('')}</div>
  <footer><a class="secondary" href="/">← Home</a><a class="primary" href="/experiments/ephys/">Start with patch clamp →</a></footer>${smallPrint()}`;
}
window.renderExperiments = function (slug) {
  const i = xpages.findIndex(m => m.slug === slug);
  if (i < 0) { document.title = 'Experiment to model · Little Neural Guide'; el('lesson').innerHTML = xOverviewHTML(); return; }
  const m = xpages[i]; document.title = m.title + ' · Experiment to model';
  el('lesson').innerHTML = xShell(i, m, m.html());
  requestAnimationFrame(() => { m.init(); if (m.tour) mountTour(m.tour); typeset(); });
};
