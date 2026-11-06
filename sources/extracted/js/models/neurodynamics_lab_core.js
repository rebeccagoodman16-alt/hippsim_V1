
/* ===================== SIMULATION CORE (pure functions) ===================== */

/* ---------- 1. Hodgkin–Huxley (squid axon, V rest ≈ -65 mV) ---------- */
const HH = {
  C: 1, gNa: 120, gK: 36, gL: 0.3, ENa: 50, EK: -77, EL: -54.387,
  am: V => { const x = V + 40; return Math.abs(x) < 1e-6 ? 1 : 0.1 * x / (1 - Math.exp(-x / 10)); },
  bm: V => 4 * Math.exp(-(V + 65) / 18),
  ah: V => 0.07 * Math.exp(-(V + 65) / 20),
  bh: V => 1 / (1 + Math.exp(-(V + 35) / 10)),
  an: V => { const x = V + 55; return Math.abs(x) < 1e-6 ? 0.1 : 0.01 * x / (1 - Math.exp(-x / 10)); },
  bn: V => 0.125 * Math.exp(-(V + 65) / 80),
};

/** Simulate HH with a current step. Returns downsampled traces + spike times. */
function simHH({ I = 10, gNaS = 1, gKS = 1, T = 100, dt = 0.01, on = 10, off = 90, every = 10 } = {}) {
  let V = -65, m = 0.0529, h = 0.5961, n = 0.3177;
  const steps = Math.round(T / dt), out = { t: [], V: [], m: [], h: [], n: [], spikes: [] };
  const gNa = HH.gNa * gNaS, gK = HH.gK * gKS;
  for (let k = 0; k <= steps; k++) {
    const t = k * dt, Iext = (t >= on && t < off) ? I : 0;
    if (k % every === 0) { out.t.push(t); out.V.push(V); out.m.push(m); out.h.push(h); out.n.push(n); }
    const INa = gNa * m * m * m * h * (V - HH.ENa), IK = gK * n * n * n * n * (V - HH.EK), IL = HH.gL * (V - HH.EL);
    const Vn = V + dt * (Iext - INa - IK - IL) / HH.C;
    m += dt * (HH.am(V) * (1 - m) - HH.bm(V) * m);
    h += dt * (HH.ah(V) * (1 - h) - HH.bh(V) * h);
    n += dt * (HH.an(V) * (1 - n) - HH.bn(V) * n);
    if (V < 0 && Vn >= 0) out.spikes.push(t);
    V = Vn;
  }
  return out;
}

/** f–I curve: steady firing rate (Hz) vs constant current. */
function fiCurve({ gNaS = 1, gKS = 1, Imax = 30, dI = 1 } = {}) {
  const I = [], f = [];
  for (let i = 0; i <= Imax + 1e-9; i += dI) {
    const r = simHH({ I: i, gNaS, gKS, T: 300, dt: 0.02, on: 0, off: 1e9, every: 1e9 });
    const n = r.spikes.filter(s => s >= 50).length;
    I.push(i); f.push(n / 0.25);
  }
  return { I, f };
}

/* ---------- 2. Brunel (2000) sparse E–I network of LIF neurons ---------- */
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function simBrunel({ g = 5, eta = 2, NE = 800, NI = 200, eps = 0.25, J = 0.5, D = 1.5, T = 400, dt = 0.1, seed = 7 } = {}) {
  const rnd = mulberry(seed), N = NE + NI, CE = Math.round(eps * NE), CI = Math.round(eps * NI);
  const tau = 20, theta = 20, Vr = 10, tref = 2;
  const nuThr = theta / (J * CE * tau);                // per ms
  const lam = eta * nuThr * CE * dt, L = Math.exp(-lam); // Poisson mean per step (external)
  // fixed in-degree connectivity → outgoing adjacency (CSR)
  const pre = new Int32Array(N * (CE + CI));
  for (let i = 0; i < N; i++) {
    for (let c = 0; c < CE; c++) pre[i * (CE + CI) + c] = Math.floor(rnd() * NE);
    for (let c = 0; c < CI; c++) pre[i * (CE + CI) + CE + c] = NE + Math.floor(rnd() * NI);
  }
  const deg = new Int32Array(N + 1);
  for (let k = 0; k < pre.length; k++) deg[pre[k] + 1]++;
  for (let j = 0; j < N; j++) deg[j + 1] += deg[j];
  const post = new Int32Array(pre.length), fill = deg.slice(0, N);
  for (let i = 0; i < N; i++) for (let c = 0; c < CE + CI; c++) { const j = pre[i * (CE + CI) + c]; post[fill[j]++] = i; }

  const dly = Math.round(D / dt), R = dly + 1, buf = new Float32Array(R * N);
  const V = new Float32Array(N), ref = new Float32Array(N), decay = Math.exp(-dt / tau);
  for (let i = 0; i < N; i++) V[i] = rnd() * theta;
  const st = [], sid = [], steps = Math.round(T / dt), t0 = 100;
  let sPop = 0, sPop2 = 0, nS = 0; const sI = new Float64Array(N), sI2 = new Float64Array(N);
  for (let k = 0; k < steps; k++) {
    const slot = k % R, t = k * dt; let vbar = 0;
    for (let i = 0; i < N; i++) {
      const syn = buf[slot * N + i]; buf[slot * N + i] = 0;
      if (ref[i] > 0) { ref[i] -= dt; }
      else {
        let p = 1, c = -1; do { c++; p *= rnd(); } while (p > L);   // Poisson external spikes
        V[i] = V[i] * decay + syn + c * J;
        if (V[i] >= theta) {
          V[i] = Vr; ref[i] = tref; st.push(t); sid.push(i);
          const w = i < NE ? J : -g * J, tgt = ((k + dly) % R) * N;
          for (let q = deg[i]; q < deg[i + 1]; q++) buf[tgt + post[q]] += w;
        }
      }
      if (t >= t0) { sI[i] += V[i]; sI2[i] += V[i] * V[i]; vbar += V[i]; }
    }
    if (t >= t0) { vbar /= N; sPop += vbar; sPop2 += vbar * vbar; nS++; }
  }
  // metrics: rate, CV(ISI), synchrony χ (Golomb 2007)
  let varI = 0; for (let i = 0; i < N; i++) { const m = sI[i] / nS; varI += sI2[i] / nS - m * m; } varI /= N;
  const mp = sPop / nS, varP = sPop2 / nS - mp * mp, chi = Math.sqrt(Math.max(0, varP) / varI);
  const last = new Float64Array(N).fill(-1), isiS = new Float64Array(N), isiS2 = new Float64Array(N), isiN = new Int32Array(N);
  let nAfter = 0;
  for (let s = 0; s < st.length; s++) {
    if (st[s] < t0) continue; nAfter++;
    const i = sid[s]; if (last[i] >= 0) { const d = st[s] - last[i]; isiS[i] += d; isiS2[i] += d * d; isiN[i]++; } last[i] = st[s];
  }
  let cv = 0, cvN = 0;
  for (let i = 0; i < N; i++) if (isiN[i] >= 2) { const m = isiS[i] / isiN[i], v = isiS2[i] / isiN[i] - m * m; cv += Math.sqrt(Math.max(v, 0)) / m; cvN++; }
  return { st, sid, NE, NI, T, rate: nAfter / N / ((T - t0) / 1000), cv: cvN ? cv / cvN : NaN, chi };
}

/* ---------- 3. Wilson–Cowan (1972) E–I population model ---------- */
const WCdef = { wEE: 16, wEI: 12, wIE: 15, wII: 3, aE: 1.3, thE: 4, aI: 2, thI: 3.7, P: 1.25, Q: 0, tauE: 1, tauI: 1 };
const sig = (x, a, th) => 1 / (1 + Math.exp(-a * (x - th))) - 1 / (1 + Math.exp(a * th));
const sigInv = (y, a, th) => { const c = 1 / (1 + Math.exp(a * th)), z = y + c; return th - Math.log(1 / z - 1) / a; };
function wcRHS(E, I, p) {
  return [(-E + sig(p.wEE * E - p.wEI * I + p.P, p.aE, p.thE)) / p.tauE,
          (-I + sig(p.wIE * E - p.wII * I + p.Q, p.aI, p.thI)) / p.tauI];
}
function wcRun(p, E0, I0, T = 60, dt = 0.05) {
  const t = [0], E = [E0], I = [I0]; let e = E0, i = I0;
  for (let k = 1; k <= T / dt; k++) {
    const k1 = wcRHS(e, i, p), k2 = wcRHS(e + dt / 2 * k1[0], i + dt / 2 * k1[1], p);
    const k3 = wcRHS(e + dt / 2 * k2[0], i + dt / 2 * k2[1], p), k4 = wcRHS(e + dt * k3[0], i + dt * k3[1], p);
    e += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); i += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    t.push(k * dt); E.push(e); I.push(i);
  }
  return { t, E, I };
}
/** Nullclines as parametric curves. */
function wcNullclines(p) {
  const cE = 1 / (1 + Math.exp(p.aE * p.thE)), cI = 1 / (1 + Math.exp(p.aI * p.thI)), eN = [], iN = [];
  const eMax = 1 - cE, iMax = 1 - cI;
  for (let k = 1; k < 600; k++) { const E = k / 600 * eMax; eN.push([E, (p.wEE * E + p.P - sigInv(E, p.aE, p.thE)) / p.wEI]); }
  for (let k = 1; k < 600; k++) { const I = k / 600 * iMax; iN.push([(sigInv(I, p.aI, p.thI) + p.wII * I - p.Q) / p.wIE, I]); }
  return { eN, iN };
}
/** Fixed points (intersections) + linear stability. */
function wcFixed(p) {
  const cE = 1 / (1 + Math.exp(p.aE * p.thE)), eMax = 1 - cE, fps = [];
  const Ifrom = E => (p.wEE * E + p.P - sigInv(E, p.aE, p.thE)) / p.wEI;
  const res = E => wcRHS(E, Ifrom(E), p)[1];             // on E-nullcline, zero of dI/dt
  const M = 4000; let prevE = eMax / M, prev = res(prevE);
  for (let k = 2; k < M; k++) {
    const E = k / M * eMax, r = res(E);
    if (isFinite(r) && isFinite(prev) && Math.sign(r) !== Math.sign(prev)) {
      let a = prevE, b = E, fa = prev;
      for (let it = 0; it < 60; it++) { const m = (a + b) / 2, fm = res(m); if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m; }
      const e = (a + b) / 2, i = Ifrom(e), h = 1e-6;
      const fx1 = wcRHS(e + h, i, p), fx0 = wcRHS(e - h, i, p), fy1 = wcRHS(e, i + h, p), fy0 = wcRHS(e, i - h, p);
      const J = [[(fx1[0] - fx0[0]) / 2 / h, (fy1[0] - fy0[0]) / 2 / h], [(fx1[1] - fx0[1]) / 2 / h, (fy1[1] - fy0[1]) / 2 / h]];
      const tr = J[0][0] + J[1][1], det = J[0][0] * J[1][1] - J[0][1] * J[1][0], disc = tr * tr - 4 * det;
      let type;
      if (det < 0) type = 'saddle';
      else if (disc < 0) type = tr < 0 ? 'stable focus' : 'unstable focus';
      else type = tr < 0 ? 'stable node' : 'unstable node';
      const lam = disc < 0 ? [`${(tr / 2).toFixed(2)} ± ${(Math.sqrt(-disc) / 2).toFixed(2)}i`] : [((tr + Math.sqrt(disc)) / 2).toFixed(2), ((tr - Math.sqrt(disc)) / 2).toFixed(2)];
      fps.push({ E: e, I: i, tr, det, type, lam });
    }
    prevE = E; prev = r;
  }
  return fps;
}
/** Bifurcation sweep over P: min/max of E after transient. */
function wcBif(p, P0 = -0.5, P1 = 3, n = 90) {
  const P = [], lo = [], hi = [];
  for (let k = 0; k < n; k++) {
    const q = { ...p, P: P0 + (P1 - P0) * k / (n - 1) }, r = wcRun(q, 0.1, 0.05, 150, 0.05);
    const tail = r.E.slice(r.E.length * 0.5 | 0);
    P.push(q.P); lo.push(Math.min(...tail)); hi.push(Math.max(...tail));
  }
  return { P, lo, hi };
}

/* ---------- 4. STDP: competitive Hebbian learning (Song, Miller & Abbott 2000) ---------- */
function makeSTDP({ N = 100, rate = 10, c = 0.2, ratio = 1.2, tau = 20, Ap = 0.005, wmax = 0.06, seed = 3 } = {}) {
  const rnd = mulberry(seed), w = new Float64Array(N);
  for (let i = 0; i < N; i++) w[i] = wmax * (0.4 + 0.2 * rnd());
  return { N, rate, c, ratio, tau, Ap, wmax, rnd, w, x: new Float64Array(N), y: 0, V: 0, t: 0, nPost: 0, hist: { t: [0], wA: [mean(w, 0, N / 2)], wB: [mean(w, N / 2, N)], r: [0] } };
}
function mean(a, s, e) { let z = 0; for (let i = s; i < e; i++) z += a[i]; return z / (e - s); }
/** Advance the STDP model by `secs` seconds (dt = 1 ms). */
function stepSTDP(S, secs) {
  const dt = 1, p = S.rate * dt / 1000, half = S.N / 2, dec = Math.exp(-dt / S.tau), vdec = Math.exp(-dt / 20), Am = S.Ap * S.ratio;
  const steps = Math.round(secs * 1000);
  for (let k = 0; k < steps; k++) {
    S.y *= dec; const ref = S.rnd() < p; let input = 0;
    for (let i = 0; i < S.N; i++) {
      S.x[i] *= dec;
      const spk = i < half ? ((ref && S.rnd() < S.c) || S.rnd() < p * (1 - S.c)) : S.rnd() < p;
      if (spk) {
        input += S.w[i]; S.x[i] += 1;
        S.w[i] = Math.max(0, S.w[i] - Am * S.y * S.wmax);       // pre after post → depress
      }
    }
    S.V = S.V * vdec + input;
    if (S.V >= 1) {
      S.V = 0; S.y += 1; S.nPost++;
      for (let i = 0; i < S.N; i++) S.w[i] = Math.min(S.wmax, S.w[i] + S.Ap * S.x[i] * S.wmax); // pre before post → potentiate
    }
    S.t += dt;
    if (S.t % 1000 === 0) {
      S.hist.t.push(S.t / 1000); S.hist.wA.push(mean(S.w, 0, half)); S.hist.wB.push(mean(S.w, half, S.N)); S.hist.r.push(S.nPost); S.nPost = 0;
    }
  }
}

/* ---------- 5. Multilayer perceptron with backprop + Adam ---------- */
function makeData(kind, n = 300, noise = 0.1, seed = 11) {
  const rnd = mulberry(seed), gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const X = [], y = [];
  for (let k = 0; k < n; k++) {
    let a, b, c;
    if (kind === 'spiral') {
      c = k % 2; const r = (k >> 1) / (n / 2), th = 1.75 * r * 2 * Math.PI + c * Math.PI;
      a = 0.9 * r * Math.sin(th); b = 0.9 * r * Math.cos(th);
    } else if (kind === 'circles') {
      c = k % 2; const r = c ? 0.35 * Math.sqrt(rnd()) : 0.6 + 0.3 * rnd(), th = 2 * Math.PI * rnd();
      a = r * Math.cos(th); b = r * Math.sin(th);
    } else if (kind === 'moons') {
      c = k % 2; const th = Math.PI * rnd();
      a = c ? 1 - Math.cos(th) : Math.cos(th); b = c ? 0.5 - Math.sin(th) : Math.sin(th);
      a = (a - 0.5) * 0.75; b = (b - 0.25) * 0.75;
    } else { // xor
      a = rnd() * 2 - 1; b = rnd() * 2 - 1; c = a * b > 0 ? 1 : 0;
    }
    X.push([a + noise * gauss(), b + noise * gauss()]); y.push(c);
  }
  return { X, y };
}
function makeMLP(sizes, act = 'tanh', seed = 5) {
  const rnd = mulberry(seed), gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const L = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const fi = sizes[l], fo = sizes[l + 1], sc = act === 'relu' && l < sizes.length - 2 ? Math.sqrt(2 / fi) : Math.sqrt(1 / fi);
    const W = new Float64Array(fo * fi).map(() => gauss() * sc), b = new Float64Array(fo);
    L.push({ fi, fo, W, b, gW: new Float64Array(fo * fi), gb: new Float64Array(fo), mW: new Float64Array(fo * fi), vW: new Float64Array(fo * fi), mb: new Float64Array(fo), vb: new Float64Array(fo) });
  }
  return { L, act, step: 0 };
}
const actF = { tanh: x => Math.tanh(x), relu: x => x > 0 ? x : 0 };
const actD = { tanh: (x, a) => 1 - a * a, relu: x => x > 0 ? 1 : 0 };
function forward(net, x, keep) {
  let a = x; const zs = [], as = [x];
  net.L.forEach((ly, l) => {
    const z = new Float64Array(ly.fo);
    for (let o = 0; o < ly.fo; o++) { let s = ly.b[o]; for (let i = 0; i < ly.fi; i++) s += ly.W[o * ly.fi + i] * a[i]; z[o] = s; }
    a = l === net.L.length - 1 ? z.map(v => 1 / (1 + Math.exp(-v))) : z.map(actF[net.act]);
    if (keep) { zs.push(z); as.push(a); }
  });
  return keep ? { zs, as } : a[0];
}
/** One full-batch epoch of BCE + Adam. Returns {loss, acc}. */
function trainEpoch(net, data, lr = 0.03) {
  const { X, y } = data, n = X.length; let loss = 0, acc = 0;
  net.L.forEach(ly => { ly.gW.fill(0); ly.gb.fill(0); });
  for (let k = 0; k < n; k++) {
    const { zs, as } = forward(net, X[k], true), yh = Math.min(Math.max(as[as.length - 1][0], 1e-7), 1 - 1e-7);
    loss += -(y[k] * Math.log(yh) + (1 - y[k]) * Math.log(1 - yh)); acc += (yh > 0.5) === (y[k] === 1);
    let d = new Float64Array([yh - y[k]]);                       // dL/dz for sigmoid+BCE
    for (let l = net.L.length - 1; l >= 0; l--) {
      const ly = net.L[l], ain = as[l];
      for (let o = 0; o < ly.fo; o++) { ly.gb[o] += d[o]; for (let i = 0; i < ly.fi; i++) ly.gW[o * ly.fi + i] += d[o] * ain[i]; }
      if (l > 0) {
        const nd = new Float64Array(ly.fi);
        for (let i = 0; i < ly.fi; i++) { let s = 0; for (let o = 0; o < ly.fo; o++) s += ly.W[o * ly.fi + i] * d[o]; nd[i] = s * actD[net.act](zs[l - 1][i], ain[i]); }
        d = nd;
      }
    }
  }
  net.step++; const b1 = 0.9, b2 = 0.999, c1 = 1 - b1 ** net.step, c2 = 1 - b2 ** net.step;
  const upd = (P, G, M, Vv) => { for (let j = 0; j < P.length; j++) { const g = G[j] / n; M[j] = b1 * M[j] + (1 - b1) * g; Vv[j] = b2 * Vv[j] + (1 - b2) * g * g; P[j] -= lr * (M[j] / c1) / (Math.sqrt(Vv[j] / c2) + 1e-8); } };
  net.L.forEach(ly => { upd(ly.W, ly.gW, ly.mW, ly.vW); upd(ly.b, ly.gb, ly.mb, ly.vb); });
  return { loss: loss / n, acc: acc / n };
}

if (typeof module !== 'undefined') module.exports = { simHH, fiCurve, simBrunel, WCdef, wcRun, wcFixed, wcBif, wcNullclines, makeSTDP, stepSTDP, makeData, makeMLP, trainEpoch };

