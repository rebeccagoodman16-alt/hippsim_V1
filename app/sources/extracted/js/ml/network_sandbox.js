/* Extracted from Little Neural Guide modellab.js [451299:482553] — section: network sandbox */
/* ===================== ML FOR NEUROSCIENCE: network sandbox =====================
   /ml/network-sandbox/  Draw a network (nodes = E or I neurons, edges = synapses), run it as a rate network or as leaky
   integrate-and-fire neurons, and read off the weight matrix, its eigenvalues and the stability of the activity.
   Presets include a Wilson–Cowan E–I oscillator, mutual inhibition (winner-take-all), a ring, a chain, a Dale's-law
   random network and the C. elegans touch sub-circuit with real synapse counts (Cook et al. 2019). */

/** Eigenvalues of a real square matrix (row-major array of arrays): Hessenberg reduction + shifted QR (Numerical Recipes hqr). Returns [[re, im], …]. */
function sbEig(M) {
  const n = M.length, a = M.map(r => r.slice()); if (!n) return [];
  for (let m = 1; m < n - 1; m++) { let x = 0, i = m; for (let j = m; j < n; j++) if (Math.abs(a[j][m - 1]) > Math.abs(x)) { x = a[j][m - 1]; i = j; }
    if (i !== m) { for (let j = m - 1; j < n; j++) [a[i][j], a[m][j]] = [a[m][j], a[i][j]]; for (let j = 0; j < n; j++) [a[j][i], a[j][m]] = [a[j][m], a[j][i]]; }
    if (x) for (i = m + 1; i < n; i++) { let y = a[i][m - 1]; if (y) { y /= x; a[i][m - 1] = y; for (let j = m; j < n; j++) a[i][j] -= y * a[m][j]; for (let j = 0; j < n; j++) a[j][m] += y * a[j][i]; } } }
  for (let i = 2; i < n; i++) for (let j = 0; j < i - 1; j++) a[i][j] = 0;
  const wr = new Array(n).fill(0), wi = new Array(n).fill(0); let nn = n - 1, t = 0, anorm = 0;
  for (let i = 0; i < n; i++) for (let j = Math.max(i - 1, 0); j < n; j++) anorm += Math.abs(a[i][j]);
  while (nn >= 0) { let its = 0, l;
    do { for (l = nn; l >= 1; l--) { const s = Math.abs(a[l - 1][l - 1]) + Math.abs(a[l][l]) || anorm; if (Math.abs(a[l][l - 1]) + s === s) { a[l][l - 1] = 0; break; } }
      let x = a[nn][nn];
      if (l === nn) { wr[nn] = x + t; wi[nn--] = 0; }
      else { let y = a[nn - 1][nn - 1], w = a[nn][nn - 1] * a[nn - 1][nn];
        if (l === nn - 1) { const p = 0.5 * (y - x), q = p * p + w, z = Math.sqrt(Math.abs(q)); x += t;
          if (q >= 0) { const zz = p + (p >= 0 ? z : -z); wr[nn - 1] = wr[nn] = x + zz; if (zz) wr[nn] = x - w / zz; wi[nn - 1] = wi[nn] = 0; } else { wr[nn - 1] = wr[nn] = x + p; wi[nn - 1] = -(wi[nn] = z); } nn -= 2; }
        else { if (its === 60) return wr.map((r, i) => [r, wi[i]]);
          if (its === 10 || its === 20) { t += x; for (let i = 0; i <= nn; i++) a[i][i] -= x; const s = Math.abs(a[nn][nn - 1]) + Math.abs(a[nn - 1][nn - 2]); y = x = 0.75 * s; w = -0.4375 * s * s; }
          ++its; let m, p, q, r, z;
          for (m = nn - 2; m >= l; m--) { z = a[m][m]; r = x - z; const s0 = y - z; p = (r * s0 - w) / a[m + 1][m] + a[m][m + 1]; q = a[m + 1][m + 1] - z - r - s0; r = a[m + 2][m + 1]; const s = Math.abs(p) + Math.abs(q) + Math.abs(r); p /= s; q /= s; r /= s; if (m === l) break; const u = Math.abs(a[m][m - 1]) * (Math.abs(q) + Math.abs(r)), v = Math.abs(p) * (Math.abs(a[m - 1][m - 1]) + Math.abs(z) + Math.abs(a[m + 1][m + 1])); if (u + v === v) break; }
          for (let i = m; i < nn - 1; i++) { a[i + 2][i] = 0; if (i !== m) a[i + 2][i - 1] = 0; }
          for (let k = m; k < nn; k++) { if (k !== m) { p = a[k][k - 1]; q = a[k + 1][k - 1]; r = 0; if (k + 1 !== nn) r = a[k + 2][k - 1]; if ((x = Math.abs(p) + Math.abs(q) + Math.abs(r)) !== 0) { p /= x; q /= x; r /= x; } }
            const s = (p >= 0 ? 1 : -1) * Math.sqrt(p * p + q * q + r * r);
            if (s) { if (k === m) { if (l !== m) a[k][k - 1] = -a[k][k - 1]; } else a[k][k - 1] = -s * x; p += s; x = p / s; y = q / s; z = r / s; q /= p; r /= p;
              for (let j = k; j <= nn; j++) { p = a[k][j] + q * a[k + 1][j]; if (k + 1 !== nn) { p += r * a[k + 2][j]; a[k + 2][j] -= p * z; } a[k + 1][j] -= p * y; a[k][j] -= p * x; }
              const mmin = nn < k + 3 ? nn : k + 3;
              for (let i = l; i <= mmin; i++) { p = x * a[i][k] + y * a[i][k + 1]; if (k + 1 !== nn) { p += z * a[i][k + 2]; a[i][k + 2] -= p * r; } a[i][k + 1] -= p * q; a[i][k] -= p; } } } } }
    } while (l < nn - 1);
  }
  return wr.map((r, i) => [r, wi[i]]);
}

const SB_PRE = {
  wc: { label: 'Wilson–Cowan E–I oscillator', nodes: [[0.35, 0.5, 'E', 'E'], [0.65, 0.5, 'I', 'I']], edges: [[0, 0, 2.4], [0, 1, 2.0], [1, 0, -3.0], [1, 1, -0.4]], drive: [1.2, 0], note: 'Strong recurrent excitation with delayed, slower inhibition: activity overshoots, inhibition catches up, and the pair oscillates (a gamma-like E–I loop, PING).' },
  wta: { label: 'Mutual inhibition (winner-take-all)', nodes: [[0.25, 0.35, 'E', 'E1'], [0.75, 0.35, 'E', 'E2'], [0.5, 0.75, 'I', 'I']], edges: [[0, 2, 1.5], [1, 2, 1.5], [2, 0, -2.2], [2, 1, -2.2], [0, 0, 1.0], [1, 1, 1.0]], drive: [1.05, 1.0, 0], note: 'Two excitatory units share one inhibitory partner. The slightly stronger input wins and silences the other: a decision.' },
  chain: { label: 'Feed-forward chain', nodes: [0, 1, 2, 3, 4].map(k => [0.1 + 0.2 * k, 0.5, 'E', 'E' + (k + 1)]), edges: [[0, 1, 1.4], [1, 2, 1.4], [2, 3, 1.4], [3, 4, 1.4]], drive: [1.5, 0, 0, 0, 0], note: 'A synfire-like chain: each node only drives the next. No loops, so all eigenvalues of W are zero and activity just flows through.' },
  ring: { label: 'Excitatory ring with global inhibition (bump)', nodes: [...Array(8).keys()].map(k => [0.5 + 0.32 * Math.cos(k * Math.PI / 4), 0.5 + 0.38 * Math.sin(k * Math.PI / 4), 'E', 'E' + (k + 1)]).concat([[0.5, 0.5, 'I', 'I']]), edges: [...Array(8).keys()].flatMap(k => [[k, (k + 1) % 8, 0.9], [(k + 1) % 8, k, 0.9], [k, 8, 0.5], [8, k, -0.9]]), drive: [1.2, 0.2, 0, 0, 0, 0, 0, 0.2, 0], note: 'Neighbours excite, a shared interneuron inhibits everyone: a localised bump of activity forms and persists (the idea behind head-direction and place-cell attractor models).' },
  dale: { label: 'Random E/I network obeying Dale’s law (12 units)', random: true, note: 'Each unit is E or I, and all its outgoing weights share that sign. Raise the gain until an eigenvalue crosses Re λ = 1: activity runs away or becomes chaotic.' },
  worm: { label: 'C. elegans touch circuit (real synapse counts)', worm: ['ALML', 'AVM', 'PLML', 'AVDL', 'AVAL', 'PVCL', 'AVBL', 'DA5', 'VA5', 'DB5', 'VB5'], note: 'Real chemical synapses (weight ∝ count, scaled) and gap junctions (Cook et al. 2019) among touch receptors, command interneurons and motor neurons. In the animal, head touch drives AVA → VA/DA (backward) and tail touch PVC → AVB → VB/DB (forward). Try it: drive ALML + AVM, then only PLML. With every synapse treated as excitatory, both stimuli drive AVA hardest: the unsigned wiring diagram alone does not choose the direction. The real choice depends on synapse signs (glutamate acting on inhibitory glutamate-gated Cl⁻ receptors) and neuromodulation (Bargmann 2012, “Beyond the connectome”). Most C. elegans neurons signal with graded potentials rather than Na⁺ spikes (Goodman et al. 1998), so rate mode is the realistic choice for this preset.' }
};

const sbMLPage = {
  slug: 'network-sandbox', title: 'Network sandbox: draw it, run it, read its eigenvalues', level: 'Build your own',
  blurb: 'Click to add excitatory or inhibitory neurons, drag to connect them, and run the network as rates or spikes. See the weight matrix, the eigenvalues and why some networks oscillate, decide or explode.',
  lead: 'Any network is a graph with a weight matrix. Draw one, then watch what it does. The eigenvalues of the weight matrix predict much of it: whether activity dies out, settles, oscillates or runs away. Switch to spiking neurons to see the same circuit with real membrane potentials.',
  jumps: [['experiment', 'Sandbox'], ['sb-math', 'Why eigenvalues'], ['sb-code', 'Python']],
  html: () => `<section class="lesson-section lab" id="experiment"><p class="eyebrow">Interactive</p><h2>Draw a network</h2>
      <p><b>Click</b> empty space to add a neuron (type chosen below). <b>Drag</b> from one neuron to another to connect them (self-connections: drag onto itself). <b>Click</b> a neuron or edge to select it and change it. Excitatory neurons are triangles (pyramidal), inhibitory are circles.</p>
      <div class="nv-wrap"><div class="at-stage"><canvas id="sbCv" class="nv-canvas" style="height:380px;touch-action:none" aria-label="Network editor"></canvas>
        <div class="nl-bar"><button id="sbRun">▶ Run</button><button class="secondary" id="sbStop">⏸</button><button class="secondary" id="sbKick">Kick selected</button><button class="secondary" id="sbDel">Delete selected</button><button class="secondary" id="sbClear">Clear</button><span class="muted" id="sbSt"></span></div>
        <canvas id="sbTr" class="uth-plot" style="height:220px" aria-label="Activity traces"></canvas>
        <div class="ml-figs" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px"><figure><canvas id="sbW" class="uth-plot" style="height:240px"></canvas><figcaption>Weight matrix W (row = target, column = source)</figcaption></figure><figure><canvas id="sbE" class="uth-plot" style="height:240px"></canvas><figcaption>Eigenvalues of the effective connectivity</figcaption></figure></div>
        <div id="sbOut" class="ml-fp"></div></div>
      <div class="lab-controls nv-controls nl-ctl">
        <details open><summary>Presets</summary><div class="control-row"><select id="sbPre">${Object.entries(SB_PRE).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}</select></div><p class="muted" id="sbNote"></p></details>
        <details open><summary>New neuron</summary><div class="nl-chips"><label><input type="radio" name="sbT" value="E" checked> excitatory</label><label><input type="radio" name="sbT" value="I"> inhibitory</label></div><div class="nl-chips"><label><input type="checkbox" id="sbDale" checked> Dale’s law (sign set by the presynaptic neuron)</label></div></details>
        <details open><summary>Selected</summary><div id="sbSel" class="muted">nothing selected</div><div class="nl-ch"><label for="sbWv">Weight / drive</label><input type="range" id="sbWv" min="-4" max="4" step="0.05" value="1"><output id="sbWvo">1</output></div></details>
        <details open><summary>Dynamics</summary><div class="control-row"><select id="sbMode"><option value="rate">rate neurons</option><option value="lif">leaky integrate-and-fire (spiking)</option></select></div>
          <div class="nl-ch"><label for="sbG">Global gain g</label><input type="range" id="sbG" min="0" max="3" step="0.05" value="1"><output id="sbGo">1</output></div>
          <div class="nl-ch"><label for="sbTauE">τ_E (ms)</label><input type="range" id="sbTauE" min="2" max="40" step="1" value="10"><output id="sbTauEo">10</output></div>
          <div class="nl-ch"><label for="sbTauI">τ_I (ms)</label><input type="range" id="sbTauI" min="2" max="40" step="1" value="20"><output id="sbTauIo">20</output></div>
          <div class="nl-ch"><label for="sbNoise">Noise</label><input type="range" id="sbNoise" min="0" max="0.5" step="0.01" value="0.02"><output id="sbNoiseo">0.02</output></div></details></div></div></section>
    <section class="lesson-section" id="sb-math"><p class="eyebrow">Why eigenvalues</p><h2>Reading a network from its matrix</h2>
      <p>The rate network is $\\tau_i \\dot r_i = -r_i + \\phi\\big(g\\sum_j W_{ij} r_j + I_i\\big)$ with $\\phi$ a rectified, saturating gain ($\\phi(x) = \\tanh(\\max(x,0))$). Near a steady state $r^*$ small deviations obey $\\dot{\\delta r} = J\\,\\delta r$ with Jacobian $J = T^{-1}\\big(-\\mathbb{1} + g\\,D\\,W\\big)$, where $D = \\mathrm{diag}(\\phi'(\\cdot))$ and $T = \\mathrm{diag}(\\tau_i)$.</p>
      <ul class="skill-tips"><li>All Re λ(J) &lt; 0: perturbations decay, the state is stable.</li><li>A complex pair crosses Re λ = 0: a Hopf bifurcation, oscillations are born (E–I loops). The oscillation frequency is about Im λ / 2π.</li><li>A real eigenvalue crosses 0: runaway excitation or a switch to another state (winner-take-all, memory).</li><li>For a random matrix with variance g²/N, eigenvalues fill a disc of radius g (Girko’s circle law); at g ≈ 1 a rate network becomes chaotic (Sompolinsky, Crisanti & Sommers 1988). Dale’s law adds an outlier set by the E–I balance (Rajan & Abbott 2006).</li></ul>
      <p>The plot shows the eigenvalues of $J$ (scaled by τ<sub>E</sub>) at the current state, and the stability line Re λ = 0.</p></section>
    <section class="lesson-section" id="sb-code"><p class="eyebrow">Do it in Python</p><h2>Simulate and analyse a small network</h2><pre><code>import numpy as np
W = np.array([[2.4, -3.0],    # E ← E, E ← I   (row = target)
              [2.0, -0.4]])   # I ← E, I ← I
tau = np.array([10.0, 20.0]); I = np.array([1.2, 0.0]); g = 1.0; dt = 0.1
phi = lambda x: np.tanh(np.maximum(x, 0)); dphi = lambda x: (x > 0) / np.cosh(x) ** 2
r = np.zeros(2); R = []
for t in np.arange(0, 500, dt):
    r += dt / tau * (-r + phi(g * W @ r + I)); R.append(r.copy())
x = g * W @ r + I; J = (-np.eye(2) + g * np.diag(dphi(x)) @ W) / tau[:, None]
lam = np.linalg.eigvals(J); print("eigenvalues of J (1/ms):", lam)
print("oscillation if a complex pair has Re > 0; frequency ≈", abs(lam.imag).max() / (2 * np.pi) * 1000, "Hz")</code></pre></section>`,
  pit: ['Confusing W<sub>ij</sub> conventions: here the row is the target, as in r = W r.', 'Reading eigenvalues of W instead of the Jacobian: saturation (φ′) and time constants change stability.', 'Forgetting Dale’s law when building “biological” networks: a real neuron’s synapses share one sign.'],
  quiz: [{ q: 'An E–I network oscillates when the Jacobian has…', o: ['a real eigenvalue above zero', 'a complex pair with positive real part', 'all eigenvalues equal to zero'], a: 1, why: 'A complex pair crossing Re λ = 0 is a Hopf bifurcation; Im λ sets the frequency.' },
    { q: 'A purely feed-forward chain has eigenvalues of W equal to…', o: ['zero (W is nilpotent)', 'one', 'the synaptic weights'], a: 0, why: 'With no loops W is strictly triangular after ordering; all its eigenvalues are 0.' },
    { q: 'Dale’s principle says…', o: ['every synapse is excitatory', 'a neuron releases the same fast transmitter at all its synapses, so its outgoing weights share one sign', 'inhibition must balance excitation'], a: 1, why: 'Columns of W (outgoing weights of a neuron) all have the same sign.' }],
  init() {
    let nodes = [], edges = [], drive = [], sel = null, drag = null, running = false, R = [], hist = [], t = 0, V = [], sp = [], syn = [], lastSp = [];
    const rnd = (() => { let s = 7; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
    const load = k => { const p = SB_PRE[k]; $('sbNote').textContent = p.note;
      if (p.random) { nodes = []; edges = []; for (let i = 0; i < 12; i++) { const E = i < 9; nodes.push([0.5 + 0.38 * Math.cos(i * Math.PI / 6), 0.5 + 0.4 * Math.sin(i * Math.PI / 6), E ? 'E' : 'I', (E ? 'E' : 'I') + (i + 1)]); }
        for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) if (i !== j && rnd() < 0.35) edges.push([j, i, (nodes[j][2] === 'E' ? 1 : -3) * (0.4 + 0.6 * rnd())]); drive = nodes.map(() => 0.3); }
      else if (p.worm) { const g = ceBuild(), ids = p.worm.map(n => g.idx[n]); nodes = p.worm.map((n, k) => { const c = g.D.nodes[ids[k]][1], y = c === 'S' ? 0.12 : c === 'I' ? 0.48 : 0.86, row = p.worm.filter((m, q) => g.D.nodes[ids[q]][1] === c), col = row.indexOf(n); return [0.1 + 0.8 * (col + 0.5) / row.length, y, g.D.nodes[ids[k]][2] === 'GABA' ? 'I' : 'E', n]; });
        edges = []; ids.forEach((a, ka) => g.out[a].forEach(([b, w]) => { const kb = ids.indexOf(b); if (kb >= 0) edges.push([ka, kb, Math.min(4, w / 30)]); })); ids.forEach((a, ka) => g.gap[a].forEach(([b, w]) => { const kb = ids.indexOf(b); if (kb > ka) edges.push([ka, kb, Math.min(3, w / 30), 'gap']); }));
        drive = nodes.map((n, k) => k === 0 || k === 1 ? 1.5 : 0); $('sbMode').value = 'rate'; }
      else { nodes = p.nodes.map(n => n.slice()); edges = p.edges.map(e => e.slice()); drive = p.drive.slice(); }
      sel = null; reset(); drawAll(); };
    const reset = () => { R = nodes.map(() => 0); V = nodes.map(() => -65); syn = nodes.map(() => 0); lastSp = nodes.map(() => -1e9); hist = []; sp = []; t = 0; };
    const Wmat = () => { const n = nodes.length, W = Array.from({ length: n }, () => new Array(n).fill(0)); edges.forEach(([a, b, w, ty]) => { if (ty === 'gap') { W[b][a] += Math.abs(w); W[a][b] += Math.abs(w); } else W[b][a] += $('sbDale').checked ? (nodes[a][2] === 'E' ? Math.abs(w) : -Math.abs(w)) : w; }); return W; };
    const tau = i => nodes[i][2] === 'E' ? +$('sbTauE').value : +$('sbTauI').value, phi = x => Math.tanh(Math.max(0, x)), dphi = x => x > 0 ? 1 / Math.cosh(x) ** 2 : 0;
    const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * Math.random()); };
    const step = dt => { const W = Wmat(), g = +$('sbG').value, n = nodes.length, nz = +$('sbNoise').value;
      if ($('sbMode').value === 'rate') { const x = W.map((row, i) => g * row.reduce((a, w, j) => a + w * R[j], 0) + drive[i] + kick(i)); R = R.map((r, i) => Math.max(0, r + dt / tau(i) * (-r + phi(x[i])) + nz * Math.sqrt(dt / tau(i)) * gauss())); }
      else { // LIF: τm dV/dt = −(V − EL) + Rm I; current-based exponential synapses (τ = 5 ms E, 10 ms I); weight 1 ≈ 4 mV kick
        const Wc = Array.from({ length: n }, () => new Array(n).fill(0)), Gg = Array.from({ length: n }, () => new Array(n).fill(0));
        edges.forEach(([a, b, w, ty]) => { if (ty === 'gap') { Gg[a][b] += Math.abs(w); Gg[b][a] += Math.abs(w); } else Wc[b][a] += $('sbDale').checked ? (nodes[a][2] === 'E' ? Math.abs(w) : -Math.abs(w)) : w; });
        const Vold = V.slice();
        for (let i = 0; i < n; i++) { const inSyn = syn[i], Igap = Gg[i].reduce((a, gg, j) => a + 0.6 * gg * (Vold[j] - Vold[i]), 0); let I = 18 * drive[i] + 18 * kick(i) + inSyn + Igap + 6 * nz * gauss() / Math.sqrt(dt);
          if (t - lastSp[i] < 2) { V[i] = -65; continue; } V[i] += dt / 20 * (-(V[i] + 65) + I); if (V[i] >= -50) { V[i] = -65; lastSp[i] = t; sp.push([t, i]); for (let k = 0; k < n; k++) if (Wc[k][i]) syn[k] += g * Wc[k][i] * 15; } }
        syn = syn.map((s, i) => s - dt * s / (nodes[i][2] === 'E' ? 5 : 10)); R = nodes.map((_, i) => sp.filter(([ts, j]) => j === i && ts > t - 50).length / 0.05 / 100); }
      t += dt; if (Math.round(t / dt) % 5 === 0) hist.push([t, R.slice(), V.slice()]); while (hist.length && hist[0][0] < t - 400) hist.shift(); while (sp.length && sp[0][0] < t - 400) sp.shift(); };
    let kickUntil = -1, kickNode = -1; const kick = i => i === kickNode && t < kickUntil ? 1.5 : 0;
    const P = (n, W, H) => [20 + (W - 40) * n[0], 20 + (H - 40) * n[1]];
    const drawNet = () => { const [x, W, H] = gfCanvas('sbCv');
      edges.forEach((e, k) => { const [a, b, w, ty] = e, A = P(nodes[a], W, H), B = P(nodes[b], W, H), sgn = ty === 'gap' ? 0 : $('sbDale').checked ? (nodes[a][2] === 'E' ? 1 : -1) : Math.sign(w), col = k === sel?.e ? '#e8495f' : ty === 'gap' ? '#2f7d5b' : sgn > 0 ? '#a62962' : '#3d6a8c';
        x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 1 + 1.5 * Math.min(3, Math.abs(w)); if (ty === 'gap') x.setLineDash([4, 3]);
        if (a === b) { x.beginPath(); x.arc(A[0], A[1] - 22, 12, 0, 7); x.stroke(); x.setLineDash([]); return; }
        const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, off = edges.some(f => f[0] === b && f[1] === a) ? 6 : 0, ox = -uy * off, oy = ux * off, ex = B[0] - ux * 18 + ox, ey = B[1] - uy * 18 + oy;
        x.beginPath(); x.moveTo(A[0] + ux * 16 + ox, A[1] + uy * 16 + oy); x.lineTo(ex, ey); x.stroke(); x.setLineDash([]);
        if (ty !== 'gap') { if (sgn > 0) { x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex - ux * 9 - uy * 5, ey - uy * 9 + ux * 5); x.lineTo(ex - ux * 9 + uy * 5, ey - uy * 9 - ux * 5); x.fill(); } else { x.beginPath(); x.arc(ex, ey, 4, 0, 7); x.fill(); } } });
      if (drag && drag.to) { const A = P(nodes[drag.from], W, H); x.strokeStyle = '#999'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(drag.to[0], drag.to[1]); x.stroke(); x.setLineDash([]); }
      nodes.forEach((n, i) => { const [px, py] = P(n, W, H), act = Math.min(1, R[i] || 0), c = n[2] === 'E' ? `rgb(${Math.round(240 - 74 * act)},${Math.round(220 - 160 * act)},${Math.round(225 - 130 * act)})` : `rgb(${Math.round(225 - 164 * act)},${Math.round(232 - 126 * act)},${Math.round(245 - 105 * act)})`;
        x.fillStyle = c; x.strokeStyle = i === sel?.n ? '#e8495f' : '#141111'; x.lineWidth = i === sel?.n ? 3 : 1.5; x.beginPath(); if (n[2] === 'E') { x.moveTo(px, py - 16); x.lineTo(px + 14, py + 10); x.lineTo(px - 14, py + 10); x.closePath(); } else x.arc(px, py, 13, 0, 7); x.fill(); x.stroke();
        x.fillStyle = '#141111'; x.font = '11px system-ui'; x.fillText(n[3], px - x.measureText(n[3]).width / 2, py + 26); if (drive[i]) { x.fillStyle = '#d08a2e'; x.fillText('▸' + drive[i].toFixed(1), px - 30, py - 12); }
        if ($('sbMode').value === 'lif' && t - lastSp[i] < 6) { x.strokeStyle = '#ffd400'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 20, 0, 7); x.stroke(); } }); };
    const drawTr = () => { const [x, W, H] = gfCanvas('sbTr'); if (!hist.length) { x.fillStyle = '#6f4c27'; x.fillText('Press Run.', 10, 20); return; } const n = nodes.length, t1 = hist[hist.length - 1][0], t0 = t1 - 400, Lm = 40, X = tt => Lm + (W - Lm - 6) * (tt - t0) / 400;
      if ($('sbMode').value === 'lif') { const rh = (H - 16) / Math.max(1, n); nodes.forEach((nd, i) => { x.fillStyle = nd[2] === 'E' ? '#a62962' : '#3d6a8c'; x.font = '10px system-ui'; x.fillText(nd[3], 2, 4 + rh * (i + 0.6)); x.strokeStyle = x.fillStyle; x.lineWidth = 1; x.beginPath(); hist.forEach((h, k) => { const yv = 2 + rh * i + rh * (1 - (h[2][i] + 70) / 25); k ? x.lineTo(X(h[0]), yv) : x.moveTo(X(h[0]), yv); }); x.stroke(); });
        sp.forEach(([ts, i]) => { x.fillStyle = nodes[i] && nodes[i][2] === 'E' ? '#a62962' : '#3d6a8c'; x.fillRect(X(ts), 2 + rh * i, 1.5, rh * 0.35); }); }
      else { const mx = Math.max(0.2, ...hist.flatMap(h => h[1])); nodes.forEach((nd, i) => { x.strokeStyle = `hsl(${(i * 47) % 360},55%,${nd[2] === 'E' ? 40 : 35}%)`; x.lineWidth = 1.5; x.beginPath(); hist.forEach((h, k) => { const yv = H - 16 - (H - 26) * (h[1][i] || 0) / mx; k ? x.lineTo(X(h[0]), yv) : x.moveTo(X(h[0]), yv); }); x.stroke(); x.fillStyle = x.strokeStyle; x.fillText(nd[3], W - 60 - 0, 12 + 11 * i); });
        x.fillStyle = '#6f4c27'; x.fillText('rate', 4, 14); }
      x.fillStyle = '#6f4c27'; x.fillText('last 400 ms', Lm, H - 3); };
    const drawW = () => { const [x, W, H] = gfCanvas('sbW'), M = Wmat(), n = M.length; if (!n) return; const S = Math.min(W, H) - 30, c = S / n, o = 22, mx = Math.max(0.01, ...M.flat().map(Math.abs));
      M.forEach((row, i) => row.forEach((w, j) => { const f = Math.abs(w) / mx; x.fillStyle = w > 0 ? `rgba(166,41,98,${f})` : w < 0 ? `rgba(61,106,140,${f})` : '#fbf6ef'; x.fillRect(o + j * c, o + i * c, c - 1, c - 1); if (c > 22 && w) { x.fillStyle = f > 0.6 ? '#fff' : '#141111'; x.font = '10px system-ui'; x.fillText(w.toFixed(1), o + j * c + 2, o + i * c + c / 2 + 3); } }));
      x.fillStyle = '#6f4c27'; x.font = '10px system-ui'; nodes.forEach((nd, k) => { if (c > 10) { x.fillText(nd[3].slice(0, 4), o + k * c + 1, o - 4); x.fillText(nd[3].slice(0, 4), 0, o + k * c + c / 2 + 3); } }); };
    const drawE = () => { const [x, W, H] = gfCanvas('sbE'), n = nodes.length; if (!n) return; const Wm = Wmat(), g = +$('sbG').value, tE = +$('sbTauE').value;
      // fixed point r* = φ(g W r* + I) by Newton's method from the current state; linearise there (the right place to judge stability)
      let r = R.map(v => v || 0), ok = false;
      for (let it = 0; it < 60; it++) { const x0 = Wm.map((row, i) => g * row.reduce((a, w, j) => a + w * r[j], 0) + drive[i]), F = r.map((v, i) => -v + phi(x0[i]));
        if (Math.max(...F.map(Math.abs)) < 1e-9) { ok = true; break; }
        const A = Wm.map((row, i) => row.map((w, j) => (i === j ? -1 : 0) + dphi(x0[i]) * g * w)), b = F.map(v => -v);
        for (let c = 0; c < n; c++) { let p = c; for (let q = c + 1; q < n; q++) if (Math.abs(A[q][c]) > Math.abs(A[p][c])) p = q; [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]]; if (Math.abs(A[c][c]) < 1e-12) break; for (let q = c + 1; q < n; q++) { const f = A[q][c] / A[c][c]; for (let k2 = c; k2 < n; k2++) A[q][k2] -= f * A[c][k2]; b[q] -= f * b[c]; } }
        const d = new Array(n).fill(0); for (let c = n - 1; c >= 0; c--) { let sm = b[c]; for (let k2 = c + 1; k2 < n; k2++) sm -= A[c][k2] * d[k2]; d[c] = Math.abs(A[c][c]) > 1e-12 ? sm / A[c][c] : 0; }
        r = r.map((v, i) => Math.max(0, v + d[i])); }
      const xin = Wm.map((row, i) => g * row.reduce((a, w, j) => a + w * r[j], 0) + drive[i]), lin = $('sbMode').value === 'lif' ? nodes.map(() => 1) : xin.map(dphi);
      const J = Wm.map((row, i) => row.map((w, j) => (tE / tau(i)) * ((i === j ? -1 : 0) + g * lin[i] * w))), ev = sbEig(J);
      const lim = Math.max(2, ...ev.map(e => Math.max(Math.abs(e[0]), Math.abs(e[1])))) * 1.15, cx = W / 2, cy = H / 2, sc = Math.min(W, H) / 2 / lim;
      x.strokeStyle = '#ded1c5'; x.beginPath(); x.moveTo(0, cy); x.lineTo(W, cy); x.moveTo(cx, 0); x.lineTo(cx, H); x.stroke(); x.strokeStyle = '#e8495f'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx, H); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#6f4c27'; x.font = '10px system-ui'; x.fillText('Re λ·τ_E', W - 52, cy - 4); x.fillText('Im', cx + 4, 10); x.fillStyle = '#e8495f'; x.fillText('stability edge', cx + 4, H - 6);
      ev.forEach(([re, im]) => { x.fillStyle = re > 0 ? '#e8495f' : '#141111'; x.beginPath(); x.arc(cx + re * sc, cy - im * sc, 4, 0, 7); x.fill(); });
      const mr = Math.max(...ev.map(e => e[0])), osc = ev.filter(e => Math.abs(e[1]) > 1e-6 && e[0] > -0.05).map(e => Math.abs(e[1]) / tE / (2 * Math.PI) * 1000);
      $('sbOut').innerHTML = `<div><b>${nodes.length}</b> neurons · <b>${edges.length}</b> connections</div><div><b>max Re λ</b> ${(mr / tE).toFixed(3)} /ms → ${mr > 0.01 ? '<span style="color:#b3261e">unstable here: activity grows / switches / oscillates</span>' : 'stable here'}</div>${osc.length ? `<div><b>oscillation</b> ≈ ${osc[0].toFixed(0)} Hz predicted from Im λ</div>` : ''}<div class="muted">${$('sbMode').value === 'rate' ? (ok ? `Linearised at the fixed point r* = [${r.map(v => v.toFixed(2)).join(', ')}] (includes φ′). If it is unstable, the network cannot sit there: it oscillates or switches.` : 'No fixed point found from here; linearised near the current state.') : 'Spiking mode: eigenvalues of the connectivity with unit gain (a guide only).'}</div>`; };
    const drawAll = () => { drawNet(); drawTr(); drawW(); drawE(); selUI(); };
    const selUI = () => { if (!sel) { $('sbSel').textContent = 'nothing selected'; return; } if (sel.n != null) { $('sbSel').innerHTML = `neuron <b>${nodes[sel.n][3]}</b> (${nodes[sel.n][2]}) · slider sets its external drive`; $('sbWv').value = drive[sel.n]; $('sbWvo').textContent = drive[sel.n].toFixed(2); } else { const e = edges[sel.e]; $('sbSel').innerHTML = `${e[3] === 'gap' ? 'gap junction' : 'synapse'} <b>${nodes[e[0]][3]} → ${nodes[e[1]][3]}</b> · slider sets the weight`; $('sbWv').value = e[2]; $('sbWvo').textContent = (+e[2]).toFixed(2); } };
    const cv = $('sbCv'), loc = ev => { const r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }, hitN = (p, W, H) => nodes.findIndex(n => { const q = P(n, W, H); return Math.hypot(q[0] - p[0], q[1] - p[1]) < 18; });
    const hitE = (p, W, H) => edges.findIndex(([a, b]) => { const A = P(nodes[a], W, H), B = P(nodes[b], W, H); if (a === b) return Math.hypot(p[0] - A[0], p[1] - (A[1] - 22)) < 14; const L2 = (B[0] - A[0]) ** 2 + (B[1] - A[1]) ** 2, u = Math.max(0, Math.min(1, ((p[0] - A[0]) * (B[0] - A[0]) + (p[1] - A[1]) * (B[1] - A[1])) / L2)); return Math.hypot(p[0] - (A[0] + u * (B[0] - A[0])), p[1] - (A[1] + u * (B[1] - A[1]))) < 7; });
    cv.onpointerdown = ev => { const p = loc(ev), W = cv.clientWidth, H = cv.clientHeight, i = hitN(p, W, H); if (i >= 0) { drag = { from: i, start: p }; cv.setPointerCapture(ev.pointerId); } else drag = { empty: p }; };
    cv.onpointermove = ev => { if (drag && drag.from != null) { drag.to = loc(ev); drawNet(); } };
    cv.onpointerup = ev => { const p = loc(ev), W = cv.clientWidth, H = cv.clientHeight; if (!drag) return;
      if (drag.from != null) { const j = hitN(p, W, H), moved = Math.hypot(p[0] - drag.start[0], p[1] - drag.start[1]) > 8;
        if (j >= 0 && (moved || j !== drag.from)) { if (!edges.some(e => e[0] === drag.from && e[1] === j)) edges.push([drag.from, j, nodes[drag.from][2] === 'E' ? 1 : -1.5]); sel = { e: edges.findIndex(e => e[0] === drag.from && e[1] === j) }; }
        else if (j === drag.from && !moved) sel = { n: j };
        else if (j < 0 && moved) { nodes[drag.from][0] = Math.max(0, Math.min(1, (p[0] - 20) / (W - 40))); nodes[drag.from][1] = Math.max(0, Math.min(1, (p[1] - 20) / (H - 40))); } }
      else { const e = hitE(p, W, H); if (e >= 0) sel = { e }; else { const ty = document.querySelector('input[name=sbT]:checked').value, k = nodes.filter(n => n[2] === ty).length + 1; nodes.push([(p[0] - 20) / (W - 40), (p[1] - 20) / (H - 40), ty, ty + k]); drive.push(0); R.push(0); V.push(-65); syn.push(0); lastSp.push(-1e9); sel = { n: nodes.length - 1 }; } }
      drag = null; drawAll(); };
    $('sbWv').oninput = () => { const v = +$('sbWv').value; $('sbWvo').textContent = v.toFixed(2); if (!sel) return; if (sel.n != null) drive[sel.n] = v; else edges[sel.e][2] = v; drawAll(); };
    $('sbDel').onclick = () => { if (!sel) return; if (sel.e != null) edges.splice(sel.e, 1); else { const k = sel.n; nodes.splice(k, 1); drive.splice(k, 1); edges = edges.filter(e => e[0] !== k && e[1] !== k).map(e => [e[0] > k ? e[0] - 1 : e[0], e[1] > k ? e[1] - 1 : e[1], e[2], e[3]]); reset(); } sel = null; drawAll(); };
    $('sbClear').onclick = () => { nodes = []; edges = []; drive = []; sel = null; reset(); drawAll(); };
    $('sbPre').onchange = e => load(e.target.value); $('sbDale').onchange = drawAll; $('sbMode').onchange = () => { reset(); drawAll(); };
    ['sbG', 'sbTauE', 'sbTauI', 'sbNoise'].forEach(id => $(id).oninput = () => { $(id + 'o').textContent = $(id).value; drawE(); });
    $('sbKick').onclick = () => { if (sel && sel.n != null) { kickNode = sel.n; kickUntil = t + 20; if (!running) $('sbRun').click(); } };
    const myTok = window.__sbTok = (window.__sbTok || 0) + 1; let last = performance.now(), fr = 0;
    const loop = now => { if (myTok !== window.__sbTok || !document.getElementById('sbCv')) return; const el = Math.min(50, now - last); last = now;
      if (running) { const simMs = el * 0.5, dt = $('sbMode').value === 'lif' ? 0.1 : 0.2; for (let k = 0; k < simMs / dt; k++) step(dt); drawNet(); drawTr(); if (++fr % 10 === 0) drawE(); }
      requestAnimationFrame(loop); };
    $('sbRun').onclick = () => { running = true; $('sbSt').textContent = 'running (½ real time)'; requestAnimationFrame(t2 => last = t2); };
    $('sbStop').onclick = () => { running = false; $('sbSt').textContent = 'paused'; };
    requestAnimationFrame(loop); load('wc');
  }
};
mlpages.splice(2, 0, sbMLPage);
