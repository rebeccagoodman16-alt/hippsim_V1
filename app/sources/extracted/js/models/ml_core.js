/* Extracted from Little Neural Guide modellab.js [19183:31327] — section: ML FOR NEUROSCIENCE: pure simulation code */
/* ===================== ML FOR NEUROSCIENCE: pure simulation code (no DOM) =====================
   tiny 2-2-1 network with explicit backprop · 2-D loss landscapes · random rate RNN ·
   E/I rate network vs its mean-field (Wilson–Cowan) reduction · backprop vs bio-plausible learning rules. */

const sigm = z => 1 / (1 + Math.exp(-z));

/* ---------- 1. tiny 2-2-1 network, every intermediate quantity exposed ---------- */
function tinyNet(seed = 3) {
  const r = mulberry(seed), u = () => (r() * 2 - 1) * 1.2;
  return { w: [[u(), u()], [u(), u()]], b: [u() * 0.5, u() * 0.5], v: [u(), u()], c: u() * 0.5 };
}
const tinyClone = n => ({ w: n.w.map(r => r.slice()), b: n.b.slice(), v: n.v.slice(), c: n.c });
/** Forward + backward pass for one example. L = ½(y − t)². Returns all values and gradients. */
function tinyPass(n, x, t) {
  const z = [0, 1].map(i => n.w[i][0] * x[0] + n.w[i][1] * x[1] + n.b[i]), a = z.map(sigm);
  const z3 = n.v[0] * a[0] + n.v[1] * a[1] + n.c, y = sigm(z3), L = 0.5 * (y - t) ** 2;
  const dy = y - t, d3 = dy * y * (1 - y);                         // δ at the output
  const dv = [d3 * a[0], d3 * a[1]], dc = d3;
  const da = [d3 * n.v[0], d3 * n.v[1]], dh = [0, 1].map(i => da[i] * a[i] * (1 - a[i]));   // δ at hidden units
  const dw = [0, 1].map(i => [dh[i] * x[0], dh[i] * x[1]]), db = dh.slice();
  return { x, t, z, a, z3, y, L, dy, d3, dv, dc, da, dh, dw, db };
}
const tinyParams = n => [n.w[0][0], n.w[0][1], n.w[1][0], n.w[1][1], n.b[0], n.b[1], n.v[0], n.v[1], n.c];
function tinySetParams(n, p) { [n.w[0][0], n.w[0][1], n.w[1][0], n.w[1][1], n.b[0], n.b[1], n.v[0], n.v[1], n.c] = p; }
const tinyGrads = g => [g.dw[0][0], g.dw[0][1], g.dw[1][0], g.dw[1][1], g.db[0], g.db[1], g.dv[0], g.dv[1], g.dc];
/** Central finite differences of L for each parameter. */
function tinyNumGrad(n, x, t, eps = 1e-5) {
  const p = tinyParams(n), out = [];
  for (let k = 0; k < p.length; k++) {
    const m = tinyClone(n), q = p.slice(); q[k] += eps; tinySetParams(m, q); const Lp = tinyPass(m, x, t).L;
    q[k] -= 2 * eps; tinySetParams(m, q); const Lm = tinyPass(m, x, t).L; out.push((Lp - Lm) / (2 * eps));
  }
  return out;
}
function tinyStep(n, g, lr) { tinySetParams(n, tinyParams(n).map((p, k) => p - lr * tinyGrads(g)[k])); }
const XOR = [[[0, 0], 0], [[0, 1], 1], [[1, 0], 1], [[1, 1], 0]];
/** One full-batch gradient step on XOR; returns mean loss before the step. */
function tinyXorEpoch(n, lr) {
  const acc = new Array(9).fill(0); let L = 0;
  XOR.forEach(([x, t]) => { const g = tinyPass(n, x, t); L += g.L; tinyGrads(g).forEach((v, k) => acc[k] += v / 4); });
  tinySetParams(n, tinyParams(n).map((p, k) => p - lr * acc[k])); return L / 4;
}

/* ---------- 2. two-parameter loss landscapes ---------- */
const LANDS = {
  bowl: { name: 'Elongated bowl', xl: [-2.2, 2.2], yl: [-1.6, 1.6], f: (x, y) => 0.5 * (x * x + 10 * y * y), g: (x, y) => [x, 10 * y], min: [0, 0], start: [-1.9, 1.2] },
  valley: { name: 'Curved valley', xl: [-2, 2], yl: [-1, 3], f: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)], min: [1, 1], start: [-1.5, 2.5] },
  twomin: { name: 'Two minima', xl: [-2, 2], yl: [-1.5, 1.5], f: (x, y) => (x * x - 1) ** 2 + y * y + 0.3 * x, g: (x, y) => [4 * x * (x * x - 1) + 0.3, 2 * y], min: [-1.036, 0], start: [1.8, 1.2] },
  saddle: { name: 'Saddle point', xl: [-2, 2], yl: [-1.8, 1.8], f: (x, y) => 0.5 * x * x + 0.25 * y ** 4 - 0.5 * y * y, g: (x, y) => [x, y ** 3 - y], min: [0, 1], start: [1.8, 0.001] },
};
function gdRun(L, p0, { lr, beta, noise, steps, seed = 1 }) {
  const r = mulberry(seed), gs = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const path = [p0.slice()]; let [x, y] = p0, vx = 0, vy = 0; const fmin = L.f(...L.min);
  const loss = [L.f(x, y) - fmin];
  for (let k = 0; k < steps; k++) {
    let [gx, gy] = L.g(x, y); gx += noise * gs(); gy += noise * gs();
    vx = beta * vx - lr * gx; vy = beta * vy - lr * gy; x += vx; y += vy;
    path.push([x, y]); loss.push(L.f(x, y) - fmin);
    if (!isFinite(x) || Math.abs(x) > 1e3 || Math.abs(y) > 1e3) break;
  }
  return { path, loss };
}
/** Hessian eigenvalues by finite differences of the gradient (symmetric 2×2). */
function hessEig(L, x, y, h = 1e-4) {
  const gx1 = L.g(x + h, y), gx0 = L.g(x - h, y), gy1 = L.g(x, y + h), gy0 = L.g(x, y - h);
  const a = (gx1[0] - gx0[0]) / (2 * h), b = ((gx1[1] - gx0[1]) + (gy1[0] - gy0[0])) / (4 * h), d = (gy1[1] - gy0[1]) / (2 * h);
  const m = (a + d) / 2, s = Math.sqrt(((a - d) / 2) ** 2 + b * b); return [m - s, m + s];
}

/* ---------- 3. random rate RNN: τ dx/dt = −x + J tanh(x) ---------- */
function makeRNN(N, g, seed) {
  const r = mulberry(seed), gs = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const J = new Float64Array(N * N).map(() => gs() * g / Math.sqrt(N)), x = new Float64Array(N).map(() => 0.5 * gs());
  return { N, g, J, x, t: 0, r, gs };
}
function rnnStep(R, dt, kick) {
  const { N, J, x } = R, phi = x.map(Math.tanh), dx = new Float64Array(N);
  for (let i = 0; i < N; i++) { let s = 0; const o = i * N; for (let j = 0; j < N; j++) s += J[o + j] * phi[j]; dx[i] = -x[i] + s + (kick ? kick[i] : 0); }
  for (let i = 0; i < N; i++) x[i] += dt * dx[i]; R.t += dt;
}

/* ---------- 4. E/I rate network vs mean-field (Wilson–Cowan) ---------- */
/** Sparse random E/I network with Wilson–Cowan gains. Weight J_ab/(p·N_b) on each existing edge. */
function makeEINet({ N = 400, p = 0.2, sigma = 0, P = WCdef.P, Q = WCdef.Q, seed = 4 }) {
  const r = mulberry(seed), gs = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const NE = Math.round(0.8 * N), NI = N - NE, W = WCdef, rows = [];
  for (let i = 0; i < N; i++) {
    const isE = i < NE, pre = [], w = [];
    for (let j = 0; j < N; j++) if (r() < p) {
      const fromE = j < NE, J = isE ? (fromE ? W.wEE : -W.wEI) : (fromE ? W.wIE : -W.wII);
      pre.push(j); w.push(J / (p * (fromE ? NE : NI)));
    }
    rows.push({ pre: Int32Array.from(pre), w: Float64Array.from(w) });
  }
  const ext = Float64Array.from({ length: N }, (_, i) => (i < NE ? P : Q) + sigma * gs());
  return { N, NE, NI, p, sigma, rows, ext };
}
function runEINet(net, { T = 40, dt = 0.05, E0 = 0.1, I0 = 0.05, keep = 6 } = {}) {
  const { N, NE, rows, ext } = net, W = WCdef; let r = Float64Array.from({ length: N }, (_, i) => i < NE ? E0 : I0);
  const t = [], mE = [], mI = [], units = Array.from({ length: keep }, () => []);
  for (let k = 0; k <= T / dt; k++) {
    if (k % 4 === 0) {
      let se = 0, si = 0; for (let i = 0; i < N; i++) i < NE ? se += r[i] : si += r[i];
      t.push(k * dt); mE.push(se / NE); mI.push(si / (N - NE)); for (let u = 0; u < keep; u++) units[u].push(r[u]);
    }
    const nr = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const { pre, w } = rows[i]; let h = ext[i]; for (let m = 0; m < pre.length; m++) h += w[m] * r[pre[m]];
      const S = i < NE ? sig(h, W.aE, W.thE) : sig(h, W.aI, W.thI);
      nr[i] = r[i] + dt * (-r[i] + S) / (i < NE ? W.tauE : W.tauI);
    }
    r = nr;
  }
  return { t, mE, mI, units };
}
/* Gauss–Hermite (probabilists') nodes/weights, 9 points: E[f(z)], z ~ N(0,1). */
const GH9 = { z: [-4.5127, -3.2054, -2.0768, -1.0233, 0, 1.0233, 2.0768, 3.2054, 4.5127], w: [2.2345e-5, 2.7891e-3, 4.9916e-2, 2.4410e-1, 4.0635e-1, 2.4410e-1, 4.9916e-2, 2.7891e-3, 2.2345e-5] };
/** Mean-field reduction. corrected=true averages the gain over the Gaussian spread of inputs across units. */
function runMF({ N = 400, p = 0.2, sigma = 0, P = WCdef.P, Q = WCdef.Q, corrected = false, T = 40, dt = 0.05, E0 = 0.1, I0 = 0.05 }) {
  const W = WCdef, NE = 0.8 * N, NI = 0.2 * N; let E = E0, I = I0; const t = [], Es = [], Is = [];
  const G = (mu, s2, a, th) => { if (!corrected || s2 < 1e-12) return sig(mu, a, th); const s = Math.sqrt(s2); let v = 0; for (let k = 0; k < 9; k++) v += GH9.w[k] * sig(mu + s * GH9.z[k], a, th); return v; };
  for (let k = 0; k <= T / dt; k++) {
    if (k % 4 === 0) { t.push(k * dt); Es.push(E); Is.push(I); }
    const muE = W.wEE * E - W.wEI * I + P, muI = W.wIE * E - W.wII * I + Q;
    const vc = (J, R, Nb) => J * J * (1 - p) * R * R / (p * Nb);                  // variance from random connectivity
    const s2E = sigma * sigma + vc(W.wEE, E, NE) + vc(W.wEI, I, NI), s2I = sigma * sigma + vc(W.wIE, E, NE) + vc(W.wII, I, NI);
    const dE = (-E + G(muE, s2E, W.aE, W.thE)) / W.tauE, dI = (-I + G(muI, s2I, W.aI, W.thI)) / W.tauI;
    E += dt * dE; I += dt * dI;
  }
  return { t, E: Es, I: Is };
}

/* ---------- 5. backprop vs biologically motivated learning rules ---------- */
/** 2-H-1 network (tanh hidden, sigmoid output, BCE). Rules: 'bp', 'fa', 'np' (node perturbation), 'readout'. */
function makeLearner(H, seed, rule) {
  const r = mulberry(seed), gs = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const W1 = new Float64Array(H * 2).map(() => gs() * 1.2), b1 = new Float64Array(H).map(() => gs() * 0.5), W2 = new Float64Array(H).map(() => gs() / Math.sqrt(H));
  const rb = mulberry(seed + 99), B = new Float64Array(H).map(() => (Math.sqrt(-2 * Math.log(rb() + 1e-12)) * Math.cos(2 * Math.PI * rb())) / Math.sqrt(H));
  return { H, W1, b1, W2, b2: 0, B, rule, r, gs, hist: [], acc: 0, align: [] };
}
function learnerPredict(m, x) { let s = m.b2; for (let h = 0; h < m.H; h++) s += m.W2[h] * Math.tanh(m.W1[2 * h] * x[0] + m.W1[2 * h + 1] * x[1] + m.b1[h]); return sigm(s); }
/** One full-batch epoch. Returns {loss, acc}. Also records the FA/BP alignment angle for 'fa'. */
function learnerEpoch(m, data, lr) {
  const { X, y } = data, n = X.length, H = m.H, gW1 = new Float64Array(2 * H), gb1 = new Float64Array(H), gW2 = new Float64Array(H), bpW1 = new Float64Array(2 * H);
  let gb2 = 0, loss = 0, acc = 0; const sNP = 0.1;
  for (let k = 0; k < n; k++) {
    const x = X[k], z = new Float64Array(H), a = new Float64Array(H);
    let s = m.b2; for (let h = 0; h < H; h++) { z[h] = m.W1[2 * h] * x[0] + m.W1[2 * h + 1] * x[1] + m.b1[h]; a[h] = Math.tanh(z[h]); s += m.W2[h] * a[h]; }
    const yh = Math.min(Math.max(sigm(s), 1e-7), 1 - 1e-7), L0 = -(y[k] * Math.log(yh) + (1 - y[k]) * Math.log(1 - yh));
    loss += L0; acc += (yh > 0.5) === (y[k] === 1);
    const d = yh - y[k];                                              // dL/ds, a local quantity at the output
    for (let h = 0; h < H; h++) gW2[h] += d * a[h]; gb2 += d;
    if (m.rule === 'readout') continue;
    for (let h = 0; h < H; h++) {
      const dpBP = d * m.W2[h] * (1 - a[h] * a[h]); bpW1[2 * h] += dpBP * x[0]; bpW1[2 * h + 1] += dpBP * x[1];
    }
    if (m.rule === 'np') {                                            // perturb hidden pre-activations; correlate noise with loss change
      const xi = new Float64Array(H).map(() => sNP * m.gs()); let s1 = m.b2;
      for (let h = 0; h < H; h++) s1 += m.W2[h] * Math.tanh(z[h] + xi[h]);
      const y1 = Math.min(Math.max(sigm(s1), 1e-7), 1 - 1e-7), L1 = -(y[k] * Math.log(y1) + (1 - y[k]) * Math.log(1 - y1));
      for (let h = 0; h < H; h++) { const dp = (L1 - L0) * xi[h] / (sNP * sNP); gW1[2 * h] += dp * x[0]; gW1[2 * h + 1] += dp * x[1]; gb1[h] += dp; }
    } else {
      for (let h = 0; h < H; h++) {
        const back = m.rule === 'fa' ? m.B[h] : m.W2[h], dp = d * back * (1 - a[h] * a[h]);
        gW1[2 * h] += dp * x[0]; gW1[2 * h + 1] += dp * x[1]; gb1[h] += dp;
      }
    }
  }
  if (m.rule === 'fa' || m.rule === 'np') {                           // angle between the rule's update and the true gradient
    let dot = 0, n1 = 0, n2 = 0; for (let j = 0; j < 2 * H; j++) { dot += gW1[j] * bpW1[j]; n1 += gW1[j] ** 2; n2 += bpW1[j] ** 2; }
    m.align.push(Math.acos(Math.max(-1, Math.min(1, dot / Math.sqrt(n1 * n2 + 1e-30)))) * 180 / Math.PI);
  }
  for (let h = 0; h < H; h++) { m.W2[h] -= lr * gW2[h] / n; if (m.rule !== 'readout') { m.W1[2 * h] -= lr * gW1[2 * h] / n; m.W1[2 * h + 1] -= lr * gW1[2 * h + 1] / n; m.b1[h] -= lr * gb1[h] / n; } }
  m.b2 -= lr * gb2 / n; m.hist.push(loss / n); m.acc = acc / n;
  return { loss: loss / n, acc: acc / n };
}
