/* Extracted from Little Neural Guide modellab.js [589106:616909] — section: NETWORK PAGE */
/* ======================= NETWORK PAGE ======================= */
function renderNetworkFlow() {
  document.title = 'Signal flow through the hippocampus · Real biology';
  $('lesson').innerHTML = bioHead('Signal flow through the hippocampus', 'REAL BIOLOGY · NETWORK · LIVE SPIKING MODEL', 'Send a burst of entorhinal input and follow it through the trisynaptic loop: dentate gyrus, CA3 and CA1, with the interneurons that shape it. Every dot is a model neuron placed on a transverse slice; every travelling spark is a spike moving along a real pathway with a realistic delay.')
    + `<nav class="page-jumps"><a href="#nf-path">Pathways</a><a href="#experiment">Live network</a><a href="#nf-model">The model</a><a href="#nf-data">Connectivity data</a><a href="/biology/cell-atlas/">← Cell atlas</a></nav>
    <section class="lesson-section" id="nf-path"><p class="eyebrow">01 · The circuit</p><h2>Two routes from cortex to CA1</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Pathway</th><th>From → to</th><th>Lands on</th><th>What it does</th></tr></thead><tbody>
      <tr><td>Perforant path</td><td>EC layer II → DG granule cells (and CA3)</td><td>Granule-cell dendrites in the molecular layer</td><td>Main cortical input; granule cells turn it into a sparse code (pattern separation)</td></tr>
      <tr><td>Mossy fibres</td><td>Granule cells → CA3</td><td>Thorny excrescences on proximal CA3 apical dendrites</td><td>Few but very strong, facilitating synapses: “detonators” that can make CA3 cells fire</td></tr>
      <tr><td>Recurrent collaterals</td><td>CA3 → CA3</td><td>CA3 dendrites</td><td>Dense recurrent excitation; proposed substrate for pattern completion and sharp-wave ripples</td></tr>
      <tr><td>Schaffer collaterals</td><td>CA3 → CA1 (and CA1 interneurons)</td><td>Apical oblique and basal dendrites (radiatum, oriens)</td><td>Classic site of LTP; drives CA1 together with feedforward inhibition</td></tr>
      <tr><td>Temporoammonic path</td><td>EC layer III → CA1</td><td>Distal tuft in lacunosum-moleculare</td><td>Direct cortical input to CA1, gated by O-LM inhibition</td></tr>
      </tbody></table></div></section>
    <section class="lesson-section lab" id="experiment"><p class="eyebrow">02 · Live</p><h2>Watch a signal propagate</h2>
      <div class="ml-tour" id="ml-tour"></div>
      <div class="lab-layout ml-layout"><div class="lab-controls"><h3>Input</h3>
        <div class="lab-actions ml-seg"><button class="secondary" data-nfs="pulse" aria-pressed="true">Single burst</button><button class="secondary" data-nfs="theta" aria-pressed="false">Theta (8 Hz)</button><button class="secondary" data-nfs="none" aria-pressed="false">Background</button></div>
        <div class="lab-actions"><button class="primary" id="nfFire">Send an entorhinal burst</button><button class="secondary" id="nfPause">Pause</button></div>
        ${ctl2('nfAmp', 'Input strength', 0.2, 2, 0.05, 1, '× entorhinal firing')}
        ${ctl2('nfSpeed', 'Slow motion', 2, 80, 1, 12, 'ms of network time per second')}
        <h3>Circuit</h3>
        ${ctl2('nfMF', 'Mossy-fibre strength', 0, 2, 0.05, 1, '× granule → CA3 weight')}
        ${ctl2('nfInh', 'Inhibition', 0, 2, 0.05, 1, '× all inhibitory synapses')}
        <label class="compare-label"><input type="checkbox" id="nfPV" checked> PV basket cells active</label>
        <label class="compare-label"><input type="checkbox" id="nfAAC" checked> Axo-axonic cells active</label>
        <label class="compare-label"><input type="checkbox" id="nfOLM" checked> O-LM cells active</label>
        ${ctl2('nfAD', 'AD-like change', 0, 1, 0.05, 0, 'weaker PV-type interneurons, more excitable principal cells (illustrative)')}
        <button class="secondary" id="nfReset">Reset network</button></div>
      <div class="ml-figs">
        <figure class="live-chart ml-fig ml-wide"><canvas id="nfMap" class="nf-map"></canvas><figcaption><b>Transverse slice: cells, pathways and travelling spikes</b>${legendNF()}</figcaption><p class="ml-fignote"><b>How to read it:</b> each dot is a neuron and lights up when it fires; sparks travel along the pathway from a firing projection cell to its targets, arriving after the conduction delay. Click a population to see a real reconstruction of that cell type.</p></figure>
        <figure class="live-chart ml-fig ml-wide"><canvas id="nfRaster" class="ml-h240"></canvas><figcaption><b>Raster (last 250 ms), grouped by population</b></figcaption><p class="ml-fignote"><b>How to read it:</b> every tick is a spike. After a burst, activity sweeps down the rows: EC, then DG, CA3 and CA1, with interneurons firing alongside their targets.</p></figure>
      </div></div>
      <div class="lab-result" id="nfResult" role="status" aria-live="polite"></div>
      <div class="box pink ml-explain"><p class="eyebrow">What’s happening now</p><div id="nfExplain"></div></div>
      <div class="box tan" id="nfCellBox" hidden></div>
      <details class="uth"><summary><span>Under the hood</span> every neuron parameter and connection rule in the simulation</summary><div class="uth-grid">
        <section><h4>Neuron models (Izhikevich 2003)</h4><div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Population</th><th>n</th><th>a</th><th>b</th><th>c (mV)</th><th>d</th><th>bias</th></tr></thead><tbody>${HN_POPS.map(p => { const z = HN_IZH[p[3]]; return `<tr><td>${p[1]}</td><td>${p[2]}</td>${z ? z.map(v => `<td>${v}</td>`).join('') : '<td colspan="5">Poisson input: 1 Hz background; burst adds 160 Hz × strength for 4 ms; theta: 3 + 40·cos²(8 Hz phase) Hz</td>'}</tr>`; }).join('')}</tbody></table></div>
        <p>Integration: forward Euler, Δt = 0.1 ms. Synaptic currents decay with τ = 3 ms (excitatory) and 7 ms (inhibitory); O-LM input to CA1 decays with τ = 20 ms and divides entorhinal drive: I<sub>EC</sub>/(1 + 0.8 g<sub>OLM</sub>). Noise: Gaussian current, σ = 0.9.</p></section>
        <section><h4>Connections</h4><div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>From → to</th><th>In-degree</th><th>Weight</th><th>Speed (mm/ms)</th><th>Pathway</th></tr></thead><tbody>${HN_CONN.map(c => `<tr><td>${c[0]} → ${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td><td>${c[4] / 1000}</td><td>${c[5]}</td></tr>`).join('')}</tbody></table></div>
        <p>Delay = 0.8 ms + distance on the map (1 unit ≈ 4 µm) ÷ speed. Presynaptic cells are drawn at random for each postsynaptic cell (fixed seed 3), so a reset gives the same network.</p></section></div></details></section>
    <section class="lesson-section" id="nf-model"><p class="eyebrow">03 · The model</p><h2>What is simulated, and what is simplified</h2>
      <div class="math-scroll ml-math">\\[\\dot v=0.04v^2+5v+140-u+I_{syn}+I_{bias},\\quad \\dot u=a(bv-u),\\quad v\\ge 30\\ \\text{mV}\\Rightarrow v\\leftarrow c,\\ u\\leftarrow u+d\\]\\[I_{syn}=\\sum_{exc}w\\,e^{-(t-t_k-\\delta)/3\\,\\mathrm{ms}}-\\sum_{inh}w\\,e^{-(t-t_k-\\delta)/7\\,\\mathrm{ms}},\\qquad \\delta=0.8\\ \\mathrm{ms}+\\frac{\\text{distance}}{v_{axon}}\\]</div>
      <ul class="skill-tips"><li><b>Neurons:</b> ${HN_POPS.filter(p => p[3] !== 'input').reduce((s, p) => s + p[2], 0)} Izhikevich point neurons (regular-spiking pyramidal and granule cells, bursting CA3 cells, fast-spiking interneurons, slower O-LM cells) plus 60 entorhinal Poisson inputs.</li>
      <li><b>Delays:</b> each connection’s delay is the distance on the slice map (1 unit ≈ 4 µm) divided by an axonal speed of 0.3–0.4 mm/ms, plus 0.8 ms synaptic delay.</li>
      <li><b>Where inhibition lands:</b> point neurons have no dendrites, so location is approximated: axo-axonic inhibition is the strongest (it acts at the spike initiation site), and O-LM inhibition divides the entorhinal input to CA1 rather than subtracting, mimicking shunting in the distal tuft.</li>
      <li><b>Scaled down:</b> rat CA1 alone has about 311,500 pyramidal cells in the Bezaire model; here there are 80. Convergences are scaled down from the data below while keeping their proportions roughly; DG and CA3 parameters are illustrative.</li>
      <li><b>For real multiscale work:</b> the full-scale CA1 network (Bezaire et al., 2016, ModelDB 187604) and detailed cells from the atlas can be run in NEURON; NetPyNE and the Blue Brain hippocampus models build networks from reconstructed morphologies.</li></ul></section>
    <section class="lesson-section" id="nf-data"><p class="eyebrow">04 · Real numbers</p><h2>CA1 connectivity in the full-scale model</h2><p>Connections onto <b>one</b> postsynaptic cell in Bezaire et al. (2016) (dataset conndata_430, ModelDB 187604), next to the scaled in-degree used here.</p>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Connection</th><th>Bezaire et al. 2016 (per cell)</th><th>This page (per cell)</th></tr></thead><tbody>${HN_BEZAIRE.map(([k, v]) => `<tr><td>${k}</td><td>${v.toLocaleString()}</td><td>${nfScaled(k)}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted">Rat CA1 cell numbers in the same model (cellnumbers_101): pyramidal 311,500; PV basket 5,530; axo-axonic 1,470; bistratified 2,210; O-LM 1,640; CCK 3,600; ivy 8,810; neurogliaform 3,580; Schaffer-associated 400.</p></section>
    <section class="lesson-section" id="code"><p class="eyebrow">06 · Do it in Python</p><h2>The same idea in NumPy: a feedforward chain with delays</h2><div class="code-toolbar"><span>Python 3 · numpy, matplotlib</span></div><pre><code>import numpy as np
import matplotlib.pyplot as plt
rng = np.random.default_rng(3)
dt, T = 0.1, 120.0                                  # ms
pops = {"EC": 30, "DG": 120, "CA3": 60, "CA1": 80}
names = list(pops); start = np.cumsum([0] + list(pops.values()))
N = start[-1]
a = np.full(N, 0.02); b = np.full(N, 0.2); c = np.full(N, -65.0); d = np.full(N, 8.0)
v = np.full(N, -65.0); u = b * v
# feedforward connections: (pre, post, in-degree, weight, delay ms)
conns = [("EC", "DG", 10, 5.2, 6.0), ("DG", "CA3", 4, 16.0, 4.0), ("CA3", "CA3", 6, 2.2, 1.5), ("CA3", "CA1", 12, 2.6, 4.0), ("EC", "CA1", 8, 2.0, 6.0)]
D = 120; buf = np.zeros((D, N)); edges = []
for pre, post, K, w, dly in conns:
    for j in range(start[names.index(post)], start[names.index(post) + 1]):
        for i in rng.integers(start[names.index(pre)], start[names.index(pre) + 1], K):
            edges.append((i, j, w, int(round(dly / dt))))
out = [[] for _ in range(N)]
for i, j, w, k in edges: out[i].append((j, w, k))
e = np.zeros(N); spikes = []
for step in range(int(T / dt)):
    t = step * dt
    e += buf[step % D]; buf[step % D] = 0
    I = e.copy()
    ec = slice(0, pops["EC"])
    fired_ec = (rng.random(pops["EC"]) < (0.04 if 20 <= t < 24 else 0.0001))   # entorhinal burst at 20 ms
    v += dt * (0.04 * v**2 + 5 * v + 140 - u + I); u += dt * a * (b * v - u)
    fired = v >= 30; fired[ec] = fired_ec
    for i in np.flatnonzero(fired):
        spikes.append((t, i)); v[i] = c[i]; u[i] += d[i]
        for j, w, k in out[i]: buf[(step + k) % D, j] += w
    e -= dt * e / 3.0

t, i = np.array(spikes).T
plt.figure(figsize=(7, 3)); plt.scatter(t, i, s=2, c="k")
for k, n in enumerate(names): plt.axhline(start[k], lw=0.5, c="grey"); plt.text(1, start[k] + 3, n)
plt.xlabel("time (ms)"); plt.ylabel("neuron"); plt.title("A burst travels EC → DG → CA3 → CA1")
for n in names:
    s = t[(i >= start[names.index(n)]) & (i < start[names.index(n) + 1]) & (t > 20)]
    print(f"{n}: first spike at {s.min() - 20:.1f} ms after the burst" if s.size else f"{n}: silent")</code></pre></section>
    <footer><a class="secondary" href="/biology/cell-atlas/">← Hippocampal cell atlas</a><a class="primary" href="/experiments/ca1-circuit/">The CA1 circuit in detail →</a></footer>${smallPrint()}`;
  nfInit();
}
function legendNF() { return HN_POPS.map(p => `<span><i style="background:${p[4]}"></i>${p[1]}</span>`).join(''); }
function nfScaled(k) { const m = { 'CA3 → CA1 pyramidal': 12, 'EC → CA1 pyramidal': 8, 'CA1 pyr → CA1 pyramidal': 0, 'PV basket → CA1 pyramidal': 3, 'Axo-axonic → CA1 pyramidal': 2, 'Bistratified → CA1 pyramidal': 3, 'O-LM → CA1 pyramidal': 2, 'CA1 pyramidal → O-LM': 15, 'CA1 pyramidal → PV basket': 8, 'CA3 → PV basket': 10, 'CA3 → axo-axonic': 8, 'EC → axo-axonic': 3 }; return m[k] === 0 ? 'not modelled (CA1 recurrence is sparse)' : m[k]; }
const NF_ATLAS = { gc: 'gc-3319201', ca3: 'ca3-cell1zr', ca1: 'ca1-a', pvb: 'pvb-1', ca3b: 'pvb-4', dgb: 'pvb-1', olm: 'olm-starfish', aac: 'aac-schematic', bis: 'ca1-i1' };

function nfInit() {
  let net = hnBuild(3), running = true, acc = 0, last = performance.now(), stim = 'pulse', pulses = [], particles = [], seenT = -1, latT = -1, lat = null, lastPulse = null;
  const o = () => ({ stim, amp: +$('nfAmp').value, inh: +$('nfInh').value, mf: +$('nfMF').value, pvb: $('nfPV').checked, aac: $('nfAAC').checked, olm: $('nfOLM').checked, ad: +$('nfAD').value, noise: 0.3, pulseAt: pulses });
  const proj = new Set(['ec2', 'ec3', 'gc', 'ca3', 'ca1']);
  const fire = () => { pulses.push(net.t + 1); pulses = pulses.filter(t => t > net.t - 50); lastPulse = net.t + 1; lat = {}; };
  // pathway guide curves for drawing
  const PATHS = [
    { name: 'perforant path', pts: [[800, 470], [620, 520], [380, 470], [260, 360]], col: '#6f4c27' },
    { name: 'mossy fibres', pts: [[250, 410], [330, 420], [420, 400], [465, 300]], col: '#3f6f6a' },
    { name: 'Schaffer collaterals', pts: [[470, 260], [520, 180], [650, 130], [820, 150]], col: '#4f2a3a' },
    { name: 'temporoammonic path', pts: [[800, 540], [900, 360], [880, 200], [760, 120]], col: '#8c7664' },
  ];
  const draw = () => {
    const cv = $('nfMap'), { ctx, w, h } = prepNF(cv), sx = w / 1000, sy = h / 620, S = Math.min(sx, sy), ox = (w - 1000 * S) / 2, oy = (h - 620 * S) / 2, X = x => ox + x * S, Y = y => oy + y * S;
    ctx.fillStyle = '#fffaf4'; ctx.fillRect(0, 0, w, h);
    // region shading and labels
    ctx.lineCap = 'round';
    const band = (pts, col, wid) => { ctx.strokeStyle = col; ctx.lineWidth = wid * S; ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke(); };
    const arcPts = (cx, cy, rx, ry, a0, a1) => Array.from({ length: 40 }, (_, k) => { const a = a0 + (a1 - a0) * k / 39; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
    const qPts = (p0, p1, p2) => Array.from({ length: 30 }, (_, k) => { const t = k / 29; return [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]; });
    band(arcPts(250, 410, 150, 110, 0.55, 2 * Math.PI - 0.55), 'rgba(63,111,106,.08)', 50);
    band(qPts([320, 420], [470, 400], [470, 210]), 'rgba(79,42,58,.07)', 60); band(qPts([470, 190], [600, 120], [850, 150]), 'rgba(166,41,98,.07)', 70);
    ctx.fillStyle = 'rgba(111,76,39,.07)'; ctx.fillRect(X(745), Y(465), 200 * S, 125 * S);
    ctx.fillStyle = '#6f4c27'; ctx.font = `700 ${Math.max(10, 13 * S)}px system-ui`;
    [['DG', 160, 420], ['CA3', 500, 330], ['CA1', 660, 95], ['EC', 950, 470], ['hilus', 245, 415]].forEach(([t, x, y]) => ctx.fillText(t, X(x), Y(y)));
    PATHS.forEach(p => { ctx.setLineDash([5, 5]); ctx.strokeStyle = p.col + '88'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X(p.pts[0][0]), Y(p.pts[0][1])); ctx.bezierCurveTo(X(p.pts[1][0]), Y(p.pts[1][1]), X(p.pts[2][0]), Y(p.pts[2][1]), X(p.pts[3][0]), Y(p.pts[3][1])); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = p.col; ctx.font = `${Math.max(9, 11 * S)}px system-ui`; const m = p.pts[1]; ctx.fillText(p.name, X(m[0]) + 4, Y(m[1]) - 4); });
    // particles: spikes travelling to targets
    const t = net.t; particles = particles.filter(pp => t < pp.t1);
    particles.forEach(pp => { const f = Math.max(0, Math.min(1, (t - pp.t0) / (pp.t1 - pp.t0))), x = pp.x0 + (pp.x1 - pp.x0) * f, y = pp.y0 + (pp.y1 - pp.y0) * f - Math.sin(Math.PI * f) * pp.arc; ctx.fillStyle = pp.col; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(X(x), Y(y), 2.2, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    // cells
    net.cells.forEach(cl => { const P = net.P[cl.pop], age = t - cl.last, on = age < 4, col = HN_POPS.find(p => p[0] === cl.pop)[4];
      const r = (cl.model === 'input' ? 3 : cl.pop === 'gc' ? 2.4 : proj.has(cl.pop) ? 3.2 : 4) * Math.max(0.8, S);
      ctx.fillStyle = on ? '#ed83b0' : col; ctx.globalAlpha = on ? 1 : 0.55; ctx.beginPath();
      if (cl.pop === 'ca3' || cl.pop === 'ca1') { ctx.moveTo(X(cl.x), Y(cl.y) - r * 1.3); ctx.lineTo(X(cl.x) + r, Y(cl.y) + r); ctx.lineTo(X(cl.x) - r, Y(cl.y) + r); ctx.closePath(); }
      else if (!proj.has(cl.pop)) { for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, rr = k % 2 ? r * 0.5 : r * 1.2; ctx.lineTo(X(cl.x) + rr * Math.cos(a), Y(cl.y) + rr * Math.sin(a)); } ctx.closePath(); }
      else ctx.arc(X(cl.x), Y(cl.y), r, 0, 7);
      ctx.fill(); if (on) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(X(cl.x), Y(cl.y), r * 2.6, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; });
    ctx.fillStyle = '#141111'; ctx.font = '600 12px system-ui'; ctx.fillText(`t = ${t.toFixed(1)} ms`, 10, 18);
    nfDraw.view = { X, Y, S };
    // raster
    const rc = $('nfRaster'), R = prepNF(rc), order = HN_POPS.map(p => p[0]), T0 = t - 250, L = 104, Rr = R.w - 8, Hh = R.h - 22;
    const minH = 13, tot = order.reduce((s, p) => s + net.P[p].n, 0), small = order.filter(p => net.P[p].n * Hh / tot < minH), freeH = Hh - small.length * minH, bigN = order.filter(p => !small.includes(p)).reduce((s, p) => s + net.P[p].n, 0);
    const rowH = {}, rowY = {}; let yy = 4; order.forEach(p => { rowH[p] = small.includes(p) ? minH : net.P[p].n * freeH / bigN; rowY[p] = yy; yy += rowH[p]; });
    R.ctx.fillStyle = '#fffaf4'; R.ctx.fillRect(0, 0, R.w, R.h);
    order.forEach((p, k) => { const P = net.P[p]; R.ctx.fillStyle = HN_POPS.find(q => q[0] === p)[4]; R.ctx.globalAlpha = k % 2 ? 0.05 : 0.12; R.ctx.fillRect(L, rowY[p], Rr - L, rowH[p]); R.ctx.globalAlpha = 1; R.ctx.font = '10px system-ui'; R.ctx.textAlign = 'right'; R.ctx.fillText(P.label, L - 4, rowY[p] + rowH[p] / 2 + 3); });
    pulses.forEach(p0 => { if (p0 > T0) { R.ctx.strokeStyle = '#ed83b0'; R.ctx.setLineDash([4, 3]); R.ctx.beginPath(); R.ctx.moveTo(L + (p0 - T0) / 250 * (Rr - L), 4); R.ctx.lineTo(L + (p0 - T0) / 250 * (Rr - L), 4 + Hh); R.ctx.stroke(); R.ctx.setLineDash([]); } });
    net.spikes.forEach(([ts, i]) => { if (ts < T0) return; const cl = net.cells[i], P = net.P[cl.pop]; R.ctx.fillStyle = HN_POPS.find(q => q[0] === cl.pop)[4]; const hh = rowH[cl.pop] / P.n; R.ctx.fillRect(L + (ts - T0) / 250 * (Rr - L), rowY[cl.pop] + (i - P.start) * hh, 1.6, Math.max(1, hh)); });
    R.ctx.fillStyle = '#8c7664'; R.ctx.textAlign = 'center'; R.ctx.fillText('−250 ms', L + 20, R.h - 6); R.ctx.fillText('now', Rr - 12, R.h - 6); R.ctx.textAlign = 'left';
  };
  const report = () => {
    const P = net.P; if (lat && lastPulse != null) {
      for (const [ts, i] of net.spikes) { if (ts <= latT) continue; const p = net.cells[i].pop; if (ts >= lastPulse && ts < lastPulse + 60 && lat[p] === undefined && !['ec2', 'ec3'].includes(p)) lat[p] = ts - lastPulse; }
    }
    latT = net.t;
    const rate = p => { const n = net.spikes.filter(([ts, i]) => ts > net.t - 200 && net.cells[i].pop === p).length; return n / P[p].n / 0.2; };
    el2('nfResult').innerHTML = `Rates (last 200 ms): GC <b>${rate('gc').toFixed(1)}</b> · CA3 <b>${rate('ca3').toFixed(1)}</b> · CA1 <b>${rate('ca1').toFixed(1)}</b> · PV <b>${rate('pvb').toFixed(1)}</b> · O-LM <b>${rate('olm').toFixed(1)}</b> Hz` + (lat ? ` · first response after the burst: ${['gc', 'ca3', 'ca1', 'pvb', 'olm'].map(p => `${P[p].label.replace('CA1 ', '').replace(' cells', '')} ${lat[p] !== undefined ? '<b>' + lat[p].toFixed(1) + ' ms</b>' : '—'}`).join(' · ')}` : '');
    const ad = +$('nfAD').value, parts = [];
    if (stim === 'pulse') parts.push(`<p><b>Single burst.</b> Entorhinal cells fire together for 4 ms. ${lat && lat.gc !== undefined ? `Granule cells respond after ≈ ${lat.gc.toFixed(1)} ms (perforant-path delay), ` : ''}${lat && lat.ca3 !== undefined ? `CA3 after ≈ ${lat.ca3.toFixed(1)} ms (mossy fibres), ` : ''}${lat && lat.ca1 !== undefined ? `and the first CA1 spikes after ≈ ${lat.ca1.toFixed(1)} ms. ` : ''}CA1 can be hit twice: a small early wave straight from EC layer III onto the distal tuft (often too weak to make CA1 cells fire on its own), then the main wave through DG and CA3.</p>`);
    if (stim === 'theta') parts.push('<p><b>Theta input.</b> EC layers II and III fire on opposite phases of an 8 Hz rhythm, so CA1 receives its direct and indirect inputs at different times in each cycle, as proposed for real theta (Hasselmo, Bodelón & Wyble, 2002).</p>');
    if (+$('nfMF').value < 0.4) parts.push('<p><b>Weak mossy fibres:</b> granule cells still fire but CA3 barely follows, so the indirect route to CA1 fails. Mossy fibres are few per CA3 cell but must be strong.</p>');
    if (!$('nfPV').checked || !$('nfAAC').checked || +$('nfInh').value < 0.5) parts.push('<p><b>Less perisomatic inhibition:</b> responses get larger and longer, and CA3’s recurrent loop can keep firing after the input stops.</p>');
    if (!$('nfOLM').checked) parts.push('<p><b>O-LM cells off:</b> the direct entorhinal input to CA1 is no longer divided down, so the early CA1 wave grows.</p>');
    if (ad > 0.05) parts.push(`<p><b>AD-like change ${Math.round(ad * 100)}%:</b> PV-type interneurons are weakened and principal cells made more excitable, a caricature of the hyperexcitability reported in AD mouse models (Palop et al., 2007; Verret et al., 2012). Watch for larger, longer bursts and background firing.</p>`);
    $('nfExplain').innerHTML = parts.join('') || '<p>Press <b>Send an entorhinal burst</b>.</p>';
  };
  const spawn = () => {                                            // turn new spikes of projection cells into travelling sparks
    for (const [ts, i] of net.spikes) {
      if (ts <= seenT) continue; const cl = net.cells[i]; if (!proj.has(cl.pop) || particles.length > 500) continue;
      const outs = cl.out.filter(e => e.w !== 0 || e.olmGate); const pick = outs.slice(0, cl.pop === 'gc' ? 2 : 1);
      pick.forEach(e => { const tg = net.cells[e.to]; particles.push({ x0: cl.x, y0: cl.y, x1: tg.x, y1: tg.y, t0: ts, t1: ts + e.d * 0.1, arc: 20 + 30 * Math.random(), col: HN_POPS.find(q => q[0] === cl.pop)[4] }); });
    }
    seenT = net.t;
  };
  const loop = now => {
    if (!document.body.contains($('nfMap'))) return;
    const wall = Math.min(60, now - last); last = now;
    if (running) { acc += wall / 1000 * +$('nfSpeed').value / 0.1; const steps = Math.floor(acc); acc -= steps; if (steps) { hnStep(net, steps, o()); spawn(); } }
    draw(); if (!loop.n || ++loop.n % 6 === 0) { loop.n = loop.n || 1; report(); } requestAnimationFrame(loop);
  };
  const nfDraw = {};
  const el2 = id => document.getElementById(id);
  document.querySelectorAll('[data-nfs]').forEach(b => b.onclick = () => { stim = b.dataset.nfs; document.querySelectorAll('[data-nfs]').forEach(x => x.setAttribute('aria-pressed', x === b)); if (stim === 'pulse') fire(); });
  el2('nfFire').onclick = () => { stim = 'pulse'; document.querySelectorAll('[data-nfs]').forEach(x => x.setAttribute('aria-pressed', x.dataset.nfs === 'pulse')); fire(); };
  el2('nfPause').onclick = () => { running = !running; el2('nfPause').textContent = running ? 'Pause' : 'Resume'; };
  el2('nfReset').onclick = () => { net = hnBuild(3); particles = []; pulses = []; lat = null; seenT = -1; latT = -1; };
  [['nfAmp', v => v + '×'], ['nfSpeed', v => v + ' ms/s'], ['nfMF', v => v + '×'], ['nfInh', v => v + '×'], ['nfAD', v => Math.round(v * 100) + '%']].forEach(([id, f]) => { const e = el2(id), out = el2(id + '-o'), u = () => out.textContent = f(e.value); e.addEventListener('input', u); u(); });
  // click a population → show its reconstruction
  el2('nfMap').addEventListener('click', ev => {
    const r = el2('nfMap').getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, V = nfDraw.view; if (!V) return;
    let best = 18, hit = null; net.cells.forEach(cl => { const d = Math.hypot(V.X(cl.x) - mx, V.Y(cl.y) - my); if (d < best) { best = d; hit = cl; } });
    const box = el2('nfCellBox'); if (!hit) { box.hidden = true; return; }
    const P = net.P[hit.pop], aid = NF_ATLAS[hit.pop], m = aid && ATLAS.find(a => a.id === aid);
    box.hidden = false;
    box.innerHTML = `<div class="nf-cell"><canvas id="nfCellCv"></canvas><div><p class="eyebrow">${P.region} · ${P.label}</p><h3>${m ? m.name + ' <small>' + m.code + '</small>' : P.label}</h3><p>${m ? m.role : 'Entorhinal cortex inputs are modelled as Poisson spike trains.'}</p>${m ? `<p class="muted">${m.schematic ? 'Schematic drawing.' : `Real reconstruction (${m.species}); model: ${m.model[0]}.`} ${['dgb', 'ca3b'].includes(hit.pop) ? 'Shown as a hippocampal PV basket cell (the reconstruction is from CA3).' : hit.pop === 'bis' ? 'No bistratified reconstruction is included; shown as a CA1 interneuron from the same dataset.' : ''}</p><a class="secondary" href="/biology/cell-atlas/">Open in the cell atlas →</a>` : ''}</div></div>`;
    if (m) { const cc = atlasCell(m); atDraw(el2('nfCellCv'), cc, cellGeometry(cc), { axon: true, pad: 8 }); }
  });
  mountTour([
    { title: 'One burst, three relays', apply: () => { el2('nfReset').click(); setSl('nfSpeed', 8); el2('nfFire').click(); }, text: 'A 4 ms entorhinal burst. Watch the sparks: perforant path to the dentate gyrus, mossy fibres to CA3, Schaffer collaterals to CA1. The raster shows the same sweep from top to bottom rows.', look: 'the latencies in the readout: granule cells, then CA3, then CA1.' },
    { title: 'Two waves into CA1', apply: () => { setSl('nfSpeed', 5); el2('nfFire').click(); }, text: 'CA1 receives the burst twice: first directly from EC layer III (temporoammonic path, onto the distal tuft), then through the trisynaptic loop several milliseconds later. The direct input is distal and divided down by O-LM inhibition, so it is weaker; turn O-LM cells off to see it grow.', look: 'early CA1 ticks (if any) before the main CA1 response.' },
    { title: 'Mossy fibres as detonators', apply: () => { setSl('nfMF', 0.3); el2('nfFire').click(); }, text: 'Weaken the mossy fibres and CA3 stops following the dentate gyrus, even though granule cells still fire. The indirect route to CA1 disappears.', look: 'CA3 rows going quiet.' },
    { title: 'Inhibition shapes the response', apply: () => { setSl('nfMF', 1); el2('nfPV').checked = false; el2('nfAAC').checked = false; el2('nfFire').click(); }, text: 'Turn off PV basket and axo-axonic cells. Their feedforward inhibition normally arrives just after the excitation and cuts responses short; without it CA1 fires more and for longer.', look: 'CA1 rate and the duration of the response.' },
    { title: 'An AD-like circuit', apply: () => { el2('nfPV').checked = true; el2('nfAAC').checked = true; setSl('nfAD', 0.9); el2('nfFire').click(); }, text: 'Weaker PV-type interneurons plus more excitable pyramidal cells: responses balloon and CA3’s recurrent loop can keep firing. This is a cartoon of network hyperexcitability in AD models, not a fit to data.', look: 'background firing between bursts and longer bursts.' },
  ]);
  function setSl(id, v) { el2(id).value = v; el2(id).dispatchEvent(new Event('input')); }
  fire(); requestAnimationFrame(loop);
}
function prepNF(cv) { const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); } const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); return { ctx, w, h }; }
window.renderCellAtlas = renderCellAtlas; window.renderNetworkFlow = renderNetworkFlow;

