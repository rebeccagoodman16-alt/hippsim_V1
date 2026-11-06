/* Extracted from Little Neural Guide modellab.js [482553:504586] — section: memory and decoding in the hippocampus */
/* ===================== ML FOR NEUROSCIENCE: memory and decoding in the hippocampus =====================
   /ml/hippocampal-memory/  (1) CA3 as an autoassociative attractor network: sparse patterns stored with a covariance Hebbian rule on
   diluted recurrent collaterals, recall from partial cues with feedback inhibition (k-winners-take-all); capacity measured live.
   (2) Reading out position from CA1 place cells: Poisson spikes from Gaussian place fields, Bayesian (maximum a posteriori)
   decoding, error vs number of cells and time-bin length. */
function hpRng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
/** CA3 network: N cells, coding level a (fraction active), connection probability c. */
function hpBuild(N, a, c, P, seed) {
  const r = hpRng(seed), K = Math.max(1, Math.round(a * N)), pats = [];
  for (let p = 0; p < P; p++) { const idx = new Set(); while (idx.size < K) idx.add(Math.floor(r() * N)); const v = new Uint8Array(N); idx.forEach(i => v[i] = 1); pats.push(v); }
  const conn = new Uint8Array(N * N), W = new Float32Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j && r() < c) conn[i * N + j] = 1;
  pats.forEach(v => { for (let i = 0; i < N; i++) { const di = v[i] - a; if (!di) continue; for (let j = 0; j < N; j++) if (conn[i * N + j]) W[i * N + j] += di * (v[j] - a); } });   // covariance rule (Tsodyks & Feigel'man 1988)
  return { N, a, c, K, pats, W, conn };
}
/** Synchronous recall with k-winners-take-all inhibition (keeps activity at the coding level, as feedback interneurons do). */
function hpRecall(net, cue, steps = 8) { const { N, W, K } = net; let s = Uint8Array.from(cue); const hist = [s.slice()];
  for (let t = 0; t < steps; t++) { const h = new Float32Array(N); for (let i = 0; i < N; i++) { let sum = 0; for (let j = 0; j < N; j++) if (s[j]) sum += W[i * N + j]; h[i] = sum; }
    const order = [...h.keys()].sort((x, y) => h[y] - h[x]), ns = new Uint8Array(N); for (let k = 0; k < K; k++) ns[order[k]] = 1; s = ns; hist.push(s.slice()); }
  return hist; }
const hpOverlap = (s, v) => { let both = 0, nv = 0, ns = 0; for (let i = 0; i < s.length; i++) { both += s[i] & v[i]; nv += v[i]; ns += s[i]; } return both / Math.max(1, Math.sqrt(nv * ns)); };
function hpCue(v, keep, noise, r) { const N = v.length, on = [...v.keys()].filter(i => v[i]), K = on.length, cue = new Uint8Array(N);
  on.forEach(i => { if (r() < keep) cue[i] = 1; }); let add = Math.round(noise * K); while (add > 0) { const i = Math.floor(r() * N); if (!v[i] && !cue[i]) { cue[i] = 1; add--; } } return cue; }

/** Place cells on a linear track. */
function hpPlace(nCells, seed, L = 150, width = 15, peak = 15, base = 0.5) { const r = hpRng(seed); return [...Array(nCells)].map(() => ({ mu: r() * L, sd: width * (0.7 + 0.6 * r()), pk: peak * (0.6 + 0.8 * r()), base })); }
const hpRate = (c, x) => c.base + c.pk * Math.exp(-((x - c.mu) ** 2) / (2 * c.sd * c.sd));
function hpDecode(cells, counts, dt, L = 150, nb = 150) { const post = new Float64Array(nb); let mx = -Infinity;
  for (let b = 0; b < nb; b++) { const x = (b + 0.5) * L / nb; let lp = 0; cells.forEach((c, i) => { const lam = hpRate(c, x) * dt; lp += counts[i] * Math.log(lam) - lam; }); post[b] = lp; if (lp > mx) mx = lp; }
  let z = 0; for (let b = 0; b < nb; b++) { post[b] = Math.exp(post[b] - mx); z += post[b]; } let best = 0; for (let b = 0; b < nb; b++) { post[b] /= z; if (post[b] > post[best]) best = b; } return { post, xhat: (best + 0.5) * L / nb }; }
function hpPois(lam, r) { if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(6.2832 * r()))); const Lm = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > Lm); return k - 1; }

const hpMLPage = {
  slug: 'hippocampal-memory', title: 'Memory and decoding in the hippocampus', level: 'Memory & readout',
  blurb: 'Store memories in a CA3-like attractor network and recall them from fragments; then read an animal’s position from CA1 place-cell spikes with a Bayesian decoder.',
  lead: 'Two classic computations, built from real numbers. CA3’s recurrent collaterals let a few cues re-create a whole stored pattern (pattern completion). CA1 place cells carry enough information that a simple Bayesian decoder can track where the animal is from a fraction of a second of spikes.',
  jumps: [['hp-ca3', 'CA3 attractor'], ['hp-cap', 'Capacity'], ['hp-dec', 'Place-cell decoder'], ['hp-code', 'Python']],
  html: () => `<section class="lesson-section lab" id="hp-ca3"><p class="eyebrow">01 · Pattern completion</p><h2>A CA3-like network remembers from fragments</h2>
      <p>200 cells, each memory activates 5 % of them (sparse, like CA3), recurrent connections exist with probability c. Rat CA3 has roughly 250,000–330,000 pyramidal cells per side, and each receives about 12,000 recurrent-collateral synapses, a connection probability of a few percent (Amaral, Ishizuka & Claiborne 1990); a 200-cell model needs a much higher c to give each cell enough inputs. Weights follow a covariance Hebbian rule; feedback inhibition keeps exactly 5 % of cells active. Give the network part of a memory plus some wrong cells, and watch it settle.</p>
      <div class="nv-wrap"><div class="at-stage"><canvas id="hpGrid" class="nv-canvas" style="height:300px" aria-label="Network state as a grid of cells"></canvas><canvas id="hpOv" class="uth-plot" style="height:150px" aria-label="Overlap with each stored memory"></canvas><div id="hpOut" class="ml-fp"></div></div>
      <div class="lab-controls nv-controls nl-ctl"><details open><summary>Network</summary>
          <div class="nl-ch"><label for="hpP">Memories stored</label><input type="range" id="hpP" min="1" max="120" step="1" value="20"><output id="hpPo">20</output></div>
          <div class="nl-ch"><label for="hpC">Connection probability c</label><input type="range" id="hpC" min="0.05" max="1" step="0.05" value="0.6"><output id="hpCo">0.6</output></div>
          <div class="nl-ch"><label for="hpA">Coding level a (fraction active)</label><input type="range" id="hpA" min="0.02" max="0.5" step="0.01" value="0.05"><output id="hpAo">0.05</output></div></details>
        <details open><summary>Cue</summary><div class="nl-ch"><label for="hpK">Part of memory 1 given</label><input type="range" id="hpK" min="0.05" max="1" step="0.05" value="0.4"><output id="hpKo">0.4</output></div>
          <div class="nl-ch"><label for="hpN">Wrong cells added (× memory size)</label><input type="range" id="hpN" min="0" max="1" step="0.05" value="0.3"><output id="hpNo">0.3</output></div>
          <div class="nl-bar"><button id="hpGo">Recall</button><button class="secondary" id="hpNew">New memories</button></div></details></div></div></section>
    <section class="lesson-section lab" id="hp-cap"><p class="eyebrow">02 · Capacity</p><h2>How many memories fit?</h2>
      <p>Store more and more patterns and test recall of each from a 40 % cue. Dense ±1 Hopfield networks fail near P ≈ 0.14 N (Amit, Gutfreund & Sompolinsky 1985); sparse coding raises capacity roughly as $P_{max} \\propto \\dfrac{cN}{a\\ln(1/a)}$ (Treves & Rolls 1991), one reason the dentate gyrus makes CA3 codes sparse.</p>
      <div class="nl-bar"><button id="hpCapGo">Measure capacity curve</button><span class="muted" id="hpCapSt"></span></div><canvas id="hpCap" class="uth-plot" style="height:240px" aria-label="Recall quality vs number of stored memories"></canvas><div id="hpCapOut" class="ml-fp"></div></section>
    <section class="lesson-section lab" id="hp-dec"><p class="eyebrow">03 · Reading out position</p><h2>Decode where the animal is from place-cell spikes</h2>
      <p>A rat runs back and forth on a 150 cm track. Each simulated CA1 place cell has a Gaussian field (≈ 15 cm wide, 9–21 Hz peak, 0.5 Hz background) and fires Poisson spikes. In every time bin the decoder computes $P(x \\mid n) \\propto \\prod_i \\text{Poisson}(n_i;\\, f_i(x)\\,\\Delta t)$ and reports the most likely position (Zhang et al. 1998).</p>
      <div class="nv-wrap"><div class="at-stage"><canvas id="hpDec" class="nv-canvas" style="height:320px" aria-label="True and decoded position over time with posterior"></canvas><div id="hpDecOut" class="ml-fp"></div><canvas id="hpErr" class="uth-plot" style="height:200px" aria-label="Decoding error vs number of cells"></canvas></div>
      <div class="lab-controls nv-controls nl-ctl"><details open><summary>Recording</summary>
          <div class="nl-ch"><label for="hpNc">Place cells recorded</label><input type="range" id="hpNc" min="2" max="200" step="1" value="40"><output id="hpNco">40</output></div>
          <div class="nl-ch"><label for="hpDt">Time bin (ms)</label><input type="range" id="hpDt" min="20" max="1000" step="10" value="250"><output id="hpDto">250</output></div>
          <div class="nl-ch"><label for="hpW">Field width (cm)</label><input type="range" id="hpW" min="5" max="50" step="1" value="15"><output id="hpWo">15</output></div>
          <div class="nl-chips"><label><input type="checkbox" id="hpOD" checked> Overdispersed firing (like real place cells)</label></div><div class="nl-bar"><button id="hpDecGo">Run 60 s</button><button class="secondary" id="hpErrGo">Error vs cell count</button></div></details></div></div></section>
    <section class="lesson-section" id="hp-code"><p class="eyebrow">Do it in Python</p><h2>Both models in NumPy</h2><pre><code>import numpy as np
rng = np.random.default_rng(1)
# --- CA3 pattern completion (sparse, covariance rule, k-WTA) ---
N, a, c, P = 200, 0.05, 0.3, 20; K = int(a * N)
pats = np.zeros((P, N)); [pats[p].__setitem__(rng.choice(N, K, replace=False), 1) for p in range(P)]
C = (rng.random((N, N)) < c) & ~np.eye(N, dtype=bool)
W = C * ((pats - a).T @ (pats - a))
cue = pats[0] * (rng.random(N) < 0.4); cue[rng.choice(np.where(pats[0] == 0)[0], int(0.3 * K), replace=False)] = 1
s = cue.copy()
for _ in range(8):
    h = W @ s; s = np.zeros(N); s[np.argsort(h)[-K:]] = 1
print("overlap with memory 1:", s @ pats[0] / K)
# --- Bayesian place-cell decoder ---
L, n, dt = 150, 40, 0.25
mu, sd, pk = rng.uniform(0, L, n), 15 * rng.uniform(.7, 1.3, n), 15 * rng.uniform(.6, 1.4, n)
f = lambda x: 0.5 + pk * np.exp(-(x - mu) ** 2 / (2 * sd ** 2))
xs = np.linspace(0, L, 150); F = np.array([f(x) for x in xs])          # (positions, cells)
x_true = 60.0; counts = rng.poisson(f(x_true) * dt)
logp = counts @ np.log(F.T * dt) - (F * dt).sum(1)
print("decoded", xs[np.argmax(logp)], "cm; true", x_true)</code></pre></section>
    <section class="lesson-section reading"><p class="eyebrow">Sources</p><h2>Papers</h2><ol class="gf-refs"><li>Hopfield JJ (1982). Neural networks and physical systems with emergent collective computational abilities. <i>PNAS</i> 79:2554–2558.</li><li>Amit DJ, Gutfreund H, Sompolinsky H (1985). Storing infinite numbers of patterns in a spin-glass model of neural networks. <i>Phys Rev Lett</i> 55:1530.</li><li>Tsodyks MV, Feigel’man MV (1988). The enhanced storage capacity in neural networks with low activity level. <i>Europhys Lett</i> 6:101.</li><li>Treves A, Rolls ET (1991). What determines the capacity of autoassociative memories in the brain? <i>Network</i> 2:371–397.</li><li>Nakazawa K et al. (2002). Requirement for hippocampal CA3 NMDA receptors in associative memory recall. <i>Science</i> 297:211–218.</li><li>Zhang K, Ginzburg I, McNaughton BL, Sejnowski TJ (1998). Interpreting neuronal population activity by reconstruction. <i>J Neurophysiol</i> 79:1017–1044.</li><li>Wilson MA, McNaughton BL (1993). Dynamics of the hippocampal ensemble code for space. <i>Science</i> 261:1055–1058.</li></ol></section>`,
  pit: ['Treating the model as CA3 itself: real CA3 has roughly 250,000–330,000 pyramidal cells per side in rats, about 12,000 recurrent synapses per cell (a few percent connectivity), and many cell-type details omitted here.', 'Confusing decoding accuracy with what the brain uses: a decoder shows information is present, not that downstream areas read it this way.', 'Assuming Poisson spiking: real place cells are far more variable from pass to pass (overdispersion), which roughly doubles decoding error.', 'Ignoring time-bin length: longer bins lower noise but blur fast movements and theta-timescale sequences.'],
  quiz: [{ q: 'Pattern completion means…', o: ['recalling a whole stored pattern from a partial cue', 'making similar inputs more different', 'deleting old memories'], a: 0, why: 'That is CA3’s proposed role; pattern separation (making inputs distinct) is attributed to the dentate gyrus.' }, { q: 'Sparse coding (few active cells per memory) mostly…', o: ['raises storage capacity', 'lowers capacity', 'has no effect'], a: 0, why: 'Capacity grows roughly as 1/(a ln(1/a)) for low coding level a.' }, { q: 'Decoding error from place cells falls as you add cells roughly as…', o: ['1/√N', '1/N²', 'it does not fall'], a: 0, why: 'Independent Poisson noise averages out roughly with the square root of the number of cells (until fields stop covering the track uniformly).' }],
  init() {
    let net = null, seed = 7, hist = null;
    const sliders = ['hpP', 'hpC', 'hpA', 'hpK', 'hpN', 'hpNc', 'hpDt', 'hpW'];
    sliders.forEach(id => $(id).oninput = () => { $(id + 'o').textContent = $(id).value; if (['hpP', 'hpC', 'hpA'].includes(id)) net = null; });
    const build = () => { net = hpBuild(200, +$('hpA').value, +$('hpC').value, +$('hpP').value, seed); };
    const drawGrid = k => { const [x, W, H] = gfCanvas('hpGrid'); if (!hist) { x.fillStyle = '#6f4c27'; x.fillText('Press Recall.', 12, 22); return; } const s = hist[k], v = net.pats[0], cols = 20, rows = 10, cw = Math.min((W - 20) / cols, (H - 40) / rows), ox = (W - cw * cols) / 2;
      for (let i = 0; i < 200; i++) { const cx = ox + (i % cols) * cw, cy = 26 + Math.floor(i / cols) * cw; x.fillStyle = s[i] && v[i] ? '#2f7d5b' : s[i] ? '#c43c3c' : v[i] ? '#cfe3d6' : '#f3ebe1'; x.fillRect(cx + 1, cy + 1, cw - 2, cw - 2); }
      x.fillStyle = '#141111'; x.font = '12px system-ui'; x.fillText(`step ${k} · overlap with memory 1 = ${hpOverlap(s, v).toFixed(2)}`, ox, 16); x.fillStyle = '#6f4c27'; x.fillText('green = correct active · red = wrong active · pale green = should be active', ox, H - 6); };
    const drawOv = () => { const [x, W, H] = gfCanvas('hpOv'); if (!hist) return; const Lm = 40, Rr = W - 10, T = hist.length - 1, X = t => Lm + (Rr - Lm) * t / T, Y = v => H - 18 - (H - 30) * v;
      net.pats.forEach((v, p) => { x.strokeStyle = p === 0 ? '#2f7d5b' : 'rgba(150,130,110,.35)'; x.lineWidth = p === 0 ? 2.5 : 1; x.beginPath(); hist.forEach((s, t) => { const o = hpOverlap(s, v); t ? x.lineTo(X(t), Y(o)) : x.moveTo(X(t), Y(o)); }); x.stroke(); });
      x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; x.fillText('overlap', 2, 14); x.fillText('1', 26, Y(1) + 4); x.fillText('0', 26, Y(0) + 4); x.fillText('recall step →', Rr - 80, H - 4); x.fillStyle = '#2f7d5b'; x.fillText('memory 1', Lm + 60, 12); x.fillStyle = '#8a7058'; x.fillText('other memories', Lm + 130, 12); };
    $('hpGo').onclick = () => { if (!net) build(); const r = hpRng(seed + 101), cue = hpCue(net.pats[0], +$('hpK').value, +$('hpN').value, r); hist = hpRecall(net, cue, 8);
      let k = 0; const step = () => { if (!document.getElementById('hpGrid')) return; drawGrid(k); if (k < hist.length - 1) { k++; setTimeout(step, 350); } }; step(); drawOv();
      const o0 = hpOverlap(hist[0], net.pats[0]), o1 = hpOverlap(hist[hist.length - 1], net.pats[0]), aN = +$('hpA').value, est = 0.1 * (+$('hpC').value) * 200 / (aN * Math.log(1 / aN));
      $('hpOut').innerHTML = `<div><b>Cue overlap</b> ${o0.toFixed(2)} → <b>after recall</b> ${o1.toFixed(2)} ${o1 > 0.9 ? '(completed)' : o1 > 0.6 ? '(partly)' : '(failed)'}</div><div><b>Memories stored</b> ${net.pats.length} · rough capacity estimate ≈ ${est.toFixed(0)} (∝ cN / (a ln 1/a))</div>`; };
    $('hpNew').onclick = () => { seed += 13; net = null; $('hpGo').click(); };
    $('hpCapGo').onclick = () => { $('hpCapSt').textContent = 'computing…'; setTimeout(() => { if (!document.getElementById('hpCap')) return; const Ps = [5, 10, 20, 30, 40, 60, 80, 100, 130, 160], res = [];
      [[0.05, '#2f7d5b', 'sparse a = 0.05'], [0.5, '#a62962', 'dense a = 0.5']].forEach(([aa, col, lab]) => { const pts = Ps.map(P => { const nt = hpBuild(200, aa, +$('hpC').value, P, seed + P), r = hpRng(P * 31), tests = Math.min(P, 16); let s = 0; for (let t = 0; t < tests; t++) { const h = hpRecall(nt, hpCue(nt.pats[t], 0.4, 0.3, r), 8); s += hpOverlap(h[h.length - 1], nt.pats[t]); } return s / tests; }); res.push([lab, col, pts]); });
      const [x, W, H] = gfCanvas('hpCap'), Lm = 46, Rr = W - 12, X = P => Lm + (Rr - Lm) * P / 160, Y = v => H - 22 - (H - 34) * v; x.strokeStyle = '#efe4d8'; [0, 0.5, 1].forEach(v => { x.beginPath(); x.moveTo(Lm, Y(v)); x.lineTo(Rr, Y(v)); x.stroke(); });
      res.forEach(([lab, col, pts], q) => { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2; x.beginPath(); pts.forEach((v, k) => { k ? x.lineTo(X(Ps[k]), Y(v)) : x.moveTo(X(Ps[k]), Y(v)); }); x.stroke(); pts.forEach((v, k) => { x.beginPath(); x.arc(X(Ps[k]), Y(v), 3, 0, 7); x.fill(); }); x.font = '12px system-ui'; x.fillText(lab, Rr - 120, 16 + q * 16); });
      x.strokeStyle = '#8a7058'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(X(0.14 * 200), Y(0)); x.lineTo(X(0.14 * 200), Y(1)); x.stroke(); x.setLineDash([]); x.fillStyle = '#8a7058'; x.font = '11px system-ui'; x.fillText('0.14 N (dense, full connectivity)', X(28) + 4, Y(0.05));
      x.fillText('memories stored →', Rr - 100, H - 6); x.fillText('recall overlap', 2, 12);
      const cap = ([, , pts]) => { let k = pts.findIndex((v, j) => v < 0.8 && (j === pts.length - 1 || pts[j + 1] < 0.8)); return k < 0 ? '> 160' : Ps[k]; };
      $('hpCapOut').innerHTML = `<div><b>Recall drops below 0.8</b> at ≈ ${cap(res[0])} memories (sparse) vs ${cap(res[1])} (dense), with c = ${$('hpC').value}.</div>`; $('hpCapSt').textContent = ''; }, 30); };
    /* decoder */
    const gain = r => { if (!$('hpOD').checked) return 1; let u = 0; while (!u) u = r(); const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * r()); return Math.exp(0.85 * z - 0.36); };   // lognormal rate fluctuation, CV ≈ 1 (Fenton & Muller 1998: place-cell firing is overdispersed)
    const runDec = () => { const cells = hpPlace(+$('hpNc').value, 5, 150, +$('hpW').value), dt = +$('hpDt').value / 1000, T = 60, r = hpRng(9), out = [];
      for (let t = 0; t < T; t += dt) { const x = 75 - 70 * Math.cos(2 * Math.PI * t / 12), counts = cells.map(c => hpPois(hpRate(c, x) * dt * gain(r), r)), d = hpDecode(cells, counts, dt); out.push({ t, x, xh: d.xhat, post: d.post }); }
      return { cells, out, dt }; };
    const drawDec = D => { const [x, W, H] = gfCanvas('hpDec'), Lm = 46, Rr = W - 10, T = 60, X = t => Lm + (Rr - Lm) * t / T, Y = p => 10 + (H - 40) * (1 - p / 150), bw = Math.max(1, (Rr - Lm) * D.dt / T);
      D.out.forEach(o => { const mx = Math.max(...o.post); for (let b = 0; b < 150; b += 2) { const v = o.post[b] / mx; if (v < 0.05) continue; x.fillStyle = `rgba(166,41,98,${0.6 * v})`; x.fillRect(X(o.t), Y((b + 2) * 1), bw, Y(0) - Y(2)); } });
      x.strokeStyle = '#141111'; x.lineWidth = 2; x.beginPath(); D.out.forEach((o, k) => { k ? x.lineTo(X(o.t), Y(o.x)) : x.moveTo(X(o.t), Y(o.x)); }); x.stroke();
      x.fillStyle = '#2f7d5b'; D.out.forEach(o => { x.beginPath(); x.arc(X(o.t) + bw / 2, Y(o.xh), 2, 0, 7); x.fill(); });
      x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; x.fillText('150 cm', 4, Y(150) + 10); x.fillText('0', 30, Y(0)); x.fillText('time (s) →', Rr - 60, H - 6); x.fillStyle = '#141111'; x.fillText('black = true position', Lm, H - 6); x.fillStyle = '#2f7d5b'; x.fillText('green = decoded', Lm + 130, H - 6); x.fillStyle = '#a62962'; x.fillText('shading = posterior', Lm + 230, H - 6);
      const errs = D.out.map(o => Math.abs(o.x - o.xh)).sort((a, b) => a - b), med = errs[Math.floor(errs.length / 2)];
      $('hpDecOut').innerHTML = `<div><b>Median decoding error</b> ${med.toFixed(1)} cm with ${D.cells.length} cells and ${(D.dt * 1000).toFixed(0)} ms bins</div><div class="muted">Published decoders on real recordings: ≈ 5–10 cm with tens to ~100 cells (Zhang et al. 1998; Wilson & McNaughton 1993). Untick “overdispersed” to see how much easier ideal Poisson cells are.</div>`; return med; };
    $('hpDecGo').onclick = () => drawDec(runDec());
    $('hpErrGo').onclick = () => { const ns = [2, 5, 10, 20, 40, 80, 160], meds = ns.map(n => { const cells = hpPlace(n, 5, 150, +$('hpW').value), dt = +$('hpDt').value / 1000, r = hpRng(11), e = []; for (let t = 0; t < 30; t += dt) { const x = 75 - 70 * Math.cos(2 * Math.PI * t / 12), c = cells.map(cc => hpPois(hpRate(cc, x) * dt * gain(r), r)); e.push(Math.abs(x - hpDecode(cells, c, dt).xhat)); } e.sort((a, b) => a - b); return e[Math.floor(e.length / 2)]; });
      const [x, W, H] = gfCanvas('hpErr'), Lm = 46, Rr = W - 12, lx = n => Math.log(n), X = n => Lm + (Rr - Lm) * (lx(n) - lx(2)) / (lx(160) - lx(2)), mxE = Math.max(...meds) * 1.1, Y = v => H - 22 - (H - 34) * v / mxE;
      x.strokeStyle = '#a62962'; x.lineWidth = 2; x.beginPath(); meds.forEach((v, k) => { k ? x.lineTo(X(ns[k]), Y(v)) : x.moveTo(X(ns[k]), Y(v)); }); x.stroke(); x.fillStyle = '#a62962'; meds.forEach((v, k) => { x.beginPath(); x.arc(X(ns[k]), Y(v), 3, 0, 7); x.fill(); x.fillText(v.toFixed(0), X(ns[k]) - 6, Y(v) - 6); });
      const ref = meds[3] * Math.sqrt(20); x.strokeStyle = '#8a7058'; x.setLineDash([4, 3]); x.beginPath(); ns.forEach((n, k) => { const v = Math.min(mxE, ref / Math.sqrt(n)); k ? x.lineTo(X(n), Y(v)) : x.moveTo(X(n), Y(v)); }); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; ns.forEach(n => x.fillText(n, X(n) - 4, H - 6)); x.fillText('median error (cm)', 2, 12); x.fillStyle = '#8a7058'; x.fillText('dashed: ∝ 1/√N', Rr - 100, 14); };
    $('hpGo').click(); $('hpDecGo').click();
  }
};
mlpages.splice(3, 0, hpMLPage);
