/* Extracted from Little Neural Guide modellab.js [1237432:1279019] — section: Action potential up close */
/* ===== Action potential up close: HH patch with stochastic channels + HH cable (unmyelinated / myelinated) ===== */
// Hodgkin & Huxley 1952 rate functions (V in mV, modern sign convention, rest ≈ −65 mV), ms⁻¹ at 6.3 °C
const AP_RATE = {
  am: V => { const u = V + 40; return Math.abs(u) < 1e-6 ? 1 : 0.1 * u / (1 - Math.exp(-u / 10)); },
  bm: V => 4 * Math.exp(-(V + 65) / 18),
  ah: V => 0.07 * Math.exp(-(V + 65) / 20),
  bh: V => 1 / (1 + Math.exp(-(V + 35) / 10)),
  an: V => { const u = V + 55; return Math.abs(u) < 1e-6 ? 0.1 : 0.01 * u / (1 - Math.exp(-u / 10)); },
  bn: V => 0.125 * Math.exp(-(V + 65) / 80)
};
// Chiu, Ritchie, Rogart, Stagg & Sweeney 1979 (rabbit node, 37 °C), as used by Sweeney et al. 1987. u = V − Vrest (mV), Vrest = −80 mV. No fast K⁺ at mammalian nodes.
const AP_CRRSS = {
  am: u => (97 + 0.363 * u) / (1 + Math.exp((31 - u) / 5.3)),
  bm: u => AP_CRRSS.am(u) / Math.exp((u - 23.8) / 4.17),
  bh: u => 15.6 / (1 + Math.exp((24 - u) / 10)),
  ah: u => AP_CRRSS.bh(u) / Math.exp((u - 5.5) / 5)
};
const apNernst = (z, co, ci, T) => 8.314 * (273.15 + T) / (z * 96485) * Math.log(co / ci) * 1000;   // mV
// GHK voltage equation, permeability ratios at rest PK:PNa:PCl = 1 : 0.04 : 0.45
const apGHK = (c, T, P = { K: 1, Na: 0.04, Cl: 0.45 }) => 8.314 * (273.15 + T) / 96485 * 1000 * Math.log((P.K * c.Ko + P.Na * c.Nao + P.Cl * c.Cli) / (P.K * c.Ki + P.Na * c.Nai + P.Cl * c.Clo));
const AP_ION0 = { Ko: 4, Ki: 140, Nao: 145, Nai: 12, Clo: 110, Cli: 10 };   // mM, mammalian (Hille 2001)
/* Cable: o = { d (µm), myelin (bool), T (°C), gNa, gK scale, stimA (nA), stimDur (ms), tEnd, Ek, Ena, len (cm) }
   Unmyelinated: uniform HH (gNa 120, gK 36, gL 0.3 mS/cm², Cm 1 µF/cm²).
   Myelinated: nodes (1 µm, HH with 10× channel density, Cm 1) every 100·d µm; internodes Cm 0.01 µF/cm², gL 0.003 mS/cm² (≈ 100 wraps). */
function apCable(o) {
  const mam = o.model === 'mammal', d = o.d * 1e-4, Ri = o.Ri || (mam ? 54.7 : 35.4), q10 = mam ? Math.pow(3, (o.T - 37) / 10) : Math.pow(3, (o.T - 6.3) / 10), Ek = o.Ek, Ena = o.Ena, Vr = mam ? -80 : -65, El = mam ? Vr - 0.01 : (o.El ?? -54.4);
  const seg = [];   // {L cm, act bool, cm, gl, gna, gk, x cm}
  const L = o.len || 2;
  const NA = mam ? 1445 : 120, KK = mam ? 0 : 36, GL = mam ? 128 : 0.3, CM = mam ? 2.5 : 1, uni = mam ? 0.1 : 1;   // unmyelinated mammalian membrane: 10 % of nodal density (Waxman & Ritchie 1985: Na⁺ channels cluster at nodes)
  if (!o.myelin) { const nS = 200, dx = L / nS; for (let i = 0; i < nS; i++) seg.push({ L: dx, act: true, cm: mam ? 1 : CM, gl: GL * uni, gna: NA * uni * o.gNa, gk: KK * o.gK, x: (i + 0.5) * dx }); }
  else {
    const Lint = (o.Lint || 100 * o.d) * 1e-4, Ln = 1e-4, nInt = 6; let x = 0;
    while (x < L) { seg.push({ L: Ln, act: true, cm: CM, gl: mam ? GL : 3, gna: (mam ? NA : 1200) * o.gNa, gk: (mam ? 0 : 360) * o.gK, x: x + Ln / 2, node: true }); x += Ln;
      for (let k = 0; k < nInt && x < L; k++) { const dx = Lint / nInt; seg.push({ L: dx, act: false, cm: 0.014 / o.d * (1 + 9 * (o.demy || 0)), gl: 0.007 / o.d * (1 + 9 * (o.demy || 0)), gna: 0, gk: 0, x: x + dx / 2 }); /* myelin: capacitance per unit length is constant at fixed g-ratio, so per axon area ∝ 1/d */ x += dx; } }
  }
  const n = seg.length, A = seg.map(s => Math.PI * d * s.L), C = seg.map((s, i) => s.cm * A[i]);   // cm², µF
  const G = []; for (let i = 0; i < n - 1; i++) { const r = Ri * (seg[i].L / 2) / (Math.PI * d * d / 4) + Ri * (seg[i + 1].L / 2) / (Math.PI * d * d / 4); G.push(1 / r * 1e6); }   // Ω → µS
  const V = new Float64Array(n).fill(Vr), m = new Float64Array(n), h = new Float64Array(n), nn = new Float64Array(n);
  const RT = mam ? { am: v => AP_CRRSS.am(v - Vr), bm: v => AP_CRRSS.bm(v - Vr), ah: v => AP_CRRSS.ah(v - Vr), bh: v => AP_CRRSS.bh(v - Vr), an: () => 0, bn: () => 1 } : AP_RATE;
  const inf = (a, b) => a / (a + b); for (let i = 0; i < n; i++) { m[i] = inf(RT.am(Vr), RT.bm(Vr)); h[i] = inf(RT.ah(Vr), RT.bh(Vr)); nn[i] = inf(RT.an(Vr), RT.bn(Vr)); }
  const dt = o.dt || (mam ? 0.002 : 0.01), tEnd = o.tEnd || 20, rec = o.rec || 0.05, nRec = Math.round(rec / dt);
  const a = new Float64Array(n), b = new Float64Array(n), c = new Float64Array(n), r = new Float64Array(n), cp = new Float64Array(n), dp = new Float64Array(n);
  /* stimulus at the left end: strength 1 ≈ the charge that would depolarise the membrane within one length constant (or 1.5 internodes) by 25 mV (o.stimA overrides, in nA) */
  const lam = o.myelin ? 1.5 * (o.Lint || 100 * o.d) * 1e-4 : Math.min(0.3, Math.sqrt(1000 / seg[0].gl * d / (4 * Ri))); let Cnear = 0; seg.forEach((sg, i) => { if (sg.x < lam) Cnear += C[i]; }); const Istim = o.stimA != null ? o.stimA : (o.stim ?? 1) * 25 * Cnear / o.stimDur * 1000;   // µF·mV/ms = µA → ×1000 nA
  const frames = [], ts = [], cross = new Float64Array(n).fill(NaN), gate = x => 1 - Math.exp(-x);
  const nodeIdx = seg.map((s, i) => s.act ? i : -1).filter(i => i >= 0);
  for (let step = 0, t = 0; t < tEnd; step++, t = step * dt) {
    for (let i = 0; i < n; i++) if (seg[i].act) { const v = V[i];
      let al = RT.am(v) * q10, be = RT.bm(v) * q10; m[i] += (al / (al + be) - m[i]) * gate((al + be) * dt);
      al = RT.ah(v) * q10; be = RT.bh(v) * q10; h[i] += (al / (al + be) - h[i]) * gate((al + be) * dt);
      al = RT.an(v) * q10; be = RT.bn(v) * q10; nn[i] += (al / (al + be) - nn[i]) * gate((al + be) * dt); }
    // backward Euler: (C/dt + g) V' − Σ G V'_j = C/dt V + g E + Istim     (units: µF/ms = mS·1e-3… use µS & nA: C µF/ms = 1000 µS)
    for (let i = 0; i < n; i++) { const s = seg[i], gna = s.gna * m[i] ** 3 * h[i] * A[i] * 1000, gk = s.gk * nn[i] ** 4 * A[i] * 1000, gl = s.gl * A[i] * 1000;   // mS/cm² · cm² = mS → ×1000 µS
      const cdt = C[i] / dt * 1000; b[i] = cdt + gna + gk + gl; r[i] = cdt * V[i] + gna * Ena + gk * Ek + gl * El; a[i] = 0; c[i] = 0;
      if (i > 0) { b[i] += G[i - 1]; a[i] = -G[i - 1]; } if (i < n - 1) { b[i] += G[i]; c[i] = -G[i]; } }
    if (t < o.stimDur) r[0] += Istim;
    cp[0] = c[0] / b[0]; dp[0] = r[0] / b[0]; for (let i = 1; i < n; i++) { const den = b[i] - a[i] * cp[i - 1]; cp[i] = c[i] / den; dp[i] = (r[i] - a[i] * dp[i - 1]) / den; }
    V[n - 1] = dp[n - 1]; for (let i = n - 2; i >= 0; i--) V[i] = dp[i] - cp[i] * V[i + 1];
    for (let i = 0; i < n; i++) if (isNaN(cross[i]) && V[i] > -20) cross[i] = t;
    if (step % nRec === 0) { ts.push(t); frames.push(Float32Array.from(V)); }
  }
  // conduction velocity from the 25 % → 75 % points of the axon
  const xi = f => { let best = 0; seg.forEach((s, i) => { if (Math.abs(s.x - f * L) < Math.abs(seg[best].x - f * L)) best = i; }); return best; };
  const i1 = xi(0.25), i2 = xi(0.75), cv = (!isNaN(cross[i1]) && !isNaN(cross[i2]) && cross[i2] > cross[i1]) ? (seg[i2].x - seg[i1].x) / 100 / ((cross[i2] - cross[i1]) / 1000) : null;   // m/s
  return { seg, frames, ts, cross, cv, L, nodeIdx, dt };
}
// ============================================================================
// Action potential up close (/biology/action-potential/): a teaching module.
// Part 1 (live): one patch of squid-axon membrane (Hodgkin & Huxley 1952). Individual Na⁺ and K⁺ channels open and
//   close stochastically (each gate is a two-state Markov process with the HH rates), ions cross open channels, and the
//   voltage, gates and currents scroll like an oscilloscope. Ion concentrations set E_Na, E_K and the resting leak.
// Part 2: the same spike travelling along a whole axon (apCable in apcore.js): squid giant axon, a human myelinated
//   motor axon (CRRSS nodal channels, saltatory) or a human unmyelinated C-fibre, with conduction velocity measured.
// ============================================================================
const AP_SQ = { Ko: 20, Ki: 400, Nao: 440, Nai: 50 };   // squid axoplasm/sea water, mM (Hille 2001, table 1.1)
const AP_PATCH = { gNa: 120, gK: 36, gL: 0.3, gamma: 20 };   // mS/cm², single-channel conductance 20 pS → 60 Na⁺ and 18 K⁺ channels per µm²
const AP_PRE = {
  squid: { label: 'Squid giant axon (476 µm, 18.5 °C)', model: 'hh', D: 476, myelin: false, T: 18.5, len: 2, k: 0.7, dRange: [50, 1000, 10] },
  motor: { label: 'Human motor axon, myelinated (fibre 10 µm, 37 °C)', model: 'mammal', D: 10, myelin: true, T: 37, len: 2, k: 2.8, dRange: [2, 20, 1] },
  cfib: { label: 'Human C-fibre, unmyelinated (1 µm, 37 °C)', model: 'mammal', D: 1, myelin: false, T: 37, len: 1, k: 2.0, dRange: [1, 4, 0.25] }
};
const AP_QS = [
  ['TTX', 'Tetrodotoxin (pufferfish poison) blocks Na⁺ channels. With 90 % blocked, a strong pulse gives…', ['a normal spike', 'a smaller, slower spike', 'no spike, only a passive bump'], 2, { ttx: 0.9 }, 'The Na⁺ channels left cannot out-pull the K⁺ and leak currents, so the membrane never runs away: no regenerative upstroke.'],
  ['High K⁺ outside', 'Raise [K⁺]ₒ from 20 to 80 mM. The resting potential will…', ['hyperpolarise', 'depolarise', 'stay the same'], 1, { Ko: 80 }, 'E_K moves toward zero (Nernst), and the resting membrane is mostly K⁺-permeable, so it depolarises. Hold it there and Na⁺ channels inactivate (h falls): the cell can stop firing (depolarisation block).'],
  ['Refractory period', 'Give two pulses 3 ms apart (pair button). The second pulse…', ['gives an equal spike', 'gives a smaller spike or none', 'gives a bigger spike'], 1, { pair: 3 }, 'h (Na⁺ inactivation) is still low and n (K⁺ activation) still high after the first spike, so fewer Na⁺ channels are available: the relative/absolute refractory period.'],
  ['Temperature', 'Warm the membrane from 6.3 °C (Hodgkin & Huxley’s squid) to 20 °C. The spike becomes…', ['faster and narrower', 'slower and wider', 'unchanged'], 0, { T: 20 }, 'Every gate rate scales by Q10 = 3 per 10 °C, so at 20 °C the gates move ≈ 4.5× faster: a narrower, quicker spike (and a little smaller, because K⁺ activation catches up with Na⁺ sooner). Warm it past ≈ 30 °C and the spike fails: heat block.'],
  ['Myelin', 'In the human motor axon, remove most myelin (demyelination 90 %). Conduction will…', ['speed up', 'slow down or fail', 'not change'], 1, { axon: 'motor', demy: 0.9 }, 'Without myelin the internodes leak and need much more charge, so each node takes longer to reach threshold, or never does: conduction block, as in multiple sclerosis.'],
  ['Diameter', 'Double an unmyelinated axon’s diameter. Its conduction velocity…', ['doubles', 'rises by about √2 (≈ 1.4×)', 'stays the same'], 1, { axon: 'squid', dMul: 2 }, 'In an unmyelinated axon the axial resistance falls as d² while membrane area rises as d, so velocity grows as √d. In myelinated axons it grows about linearly with d (Hursh 1939: ≈ 6 m/s per µm).']
];

/** Live membrane patch. Deterministic HH drives V; 60 Na⁺ and 18 K⁺ channel icons are simulated gate by gate.
 *  In noise mode the conductance itself comes from stochastic channel counts (patch area A µm²). */
function apPatch() {
  const P = { V: -65, m: 0.053, h: 0.596, n: 0.318, t: 0, iNa: 0, iK: 0, iL: 0, qNa: 0, qK: 0 };
  const NNa = 60, NK = 18, chNa = [], chK = [];
  for (let i = 0; i < NNa; i++) chNa.push({ m: Math.random() < 0.15 ? 1 : 0, h: Math.random() < 0.6 ? 1 : 0, x: Math.random() });
  for (let i = 0; i < NK; i++) chK.push({ n: Math.round(4 * 0.318 + (Math.random() - 0.5)), x: Math.random() });
  // population counts for noise mode: Na[m*2+h], m = open m gates (0–3), h = 0/1; K[n], n = open n gates (0–4)
  let popNa = null, popK = null, popA = 0;
  const binom = (n, p) => { if (n <= 0 || p <= 0) return 0; if (p >= 1) return n; if (n < 25) { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k; } const mu = n * p, sd = Math.sqrt(mu * (1 - p)); let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.max(0, Math.min(n, Math.round(mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v)))); };
  const initPop = A => { popA = A; const nNa = Math.round(60 * A), nK = Math.round(18 * A); popNa = new Array(8).fill(0); popK = new Array(5).fill(0);
    const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
    for (let mm = 0; mm < 4; mm++) for (let hh = 0; hh < 2; hh++) popNa[mm * 2 + hh] = Math.round(nNa * C(3, mm) * P.m ** mm * (1 - P.m) ** (3 - mm) * (hh ? P.h : 1 - P.h));
    for (let nn = 0; nn < 5; nn++) popK[nn] = Math.round(nK * C(4, nn) * P.n ** nn * (1 - P.n) ** (4 - nn)); };
  P.step = (dt, o, Iext) => {
    const v = P.V, phi = Math.pow(3, (o.T - 6.3) / 10), R = AP_RATE;
    const am = R.am(v) * phi, bm = R.bm(v) * phi, ah = R.ah(v) * phi, bh = R.bh(v) * phi, an = R.an(v) * phi, bn = R.bn(v) * phi;
    const Ena = apNernst(1, o.Nao, o.Nai, o.T), Ek = apNernst(1, o.Ko, o.Ki, o.T), El = o.fK * Ek + (1 - o.fK) * Ena;
    let fNa, fK;
    if (o.noise) { if (!popNa || popA !== o.area) initPop(o.area);
      const nNa = popNa.reduce((a, b) => a + b, 0), nK = popK.reduce((a, b) => a + b, 0), nx = popNa.slice(), kx = popK.slice();
      for (let mm = 0; mm < 4; mm++) for (let hh = 0; hh < 2; hh++) { const s = mm * 2 + hh, N = popNa[s]; if (!N) continue;
        const up = mm < 3 ? binom(N, (3 - mm) * am * dt) : 0, dn = mm > 0 ? binom(N - up, mm * bm * dt) : 0, hf = binom(N - up - dn, (hh ? bh : ah) * dt);
        nx[s] -= up + dn + hf; if (up) nx[s + 2] += up; if (dn) nx[s - 2] += dn; if (hf) nx[mm * 2 + (1 - hh)] += hf; }
      for (let nn = 0; nn < 5; nn++) { const N = popK[nn]; if (!N) continue; const up = nn < 4 ? binom(N, (4 - nn) * an * dt) : 0, dn = nn > 0 ? binom(N - up, nn * bn * dt) : 0; kx[nn] -= up + dn; if (up) kx[nn + 1] += up; if (dn) kx[nn - 1] += dn; }
      popNa = nx; popK = kx; fNa = nNa ? popNa[7] / nNa : 0; fK = nK ? popK[4] / nK : 0;
      P.m += dt * (am * (1 - P.m) - bm * P.m); P.h += dt * (ah * (1 - P.h) - bh * P.h); P.n += dt * (an * (1 - P.n) - bn * P.n);
    } else {
      P.m += (am / (am + bm) - P.m) * (1 - Math.exp(-(am + bm) * dt)); P.h += (ah / (ah + bh) - P.h) * (1 - Math.exp(-(ah + bh) * dt)); P.n += (an / (an + bn) - P.n) * (1 - Math.exp(-(an + bn) * dt));
      fNa = P.m ** 3 * P.h; fK = P.n ** 4; popNa = null; }
    const gNa = AP_PATCH.gNa * (1 - o.ttx) * fNa, gK = AP_PATCH.gK * (1 - o.tea) * fK;
    P.iNa = gNa * (P.V - Ena); P.iK = gK * (P.V - Ek); P.iL = AP_PATCH.gL * (P.V - El);
    // implicit update of V for stability: C dV/dt = I − Σ g (V − E)
    const gT = gNa + gK + AP_PATCH.gL; P.V = (P.V + dt * (Iext + gNa * Ena + gK * Ek + AP_PATCH.gL * El)) / (1 + dt * gT);
    P.qNa += -Math.min(0, P.iNa) * dt; P.qK += Math.max(0, P.iK) * dt;   // µA/cm² · ms = nC/cm²
    if (!P.inSp && P.V > -50) { P.inSp = true; P.spNa = 0; P.spK = 0; P.nSp = (P.nSp || 0) + 1; }
    if (P.inSp) { P.spNa += -Math.min(0, P.iNa) * dt; P.spK += Math.max(0, P.iK) * dt; if (P.V < -62) { P.inSp = false; P.lastNa = P.spNa; P.lastK = P.spK; } }
    // the 78 displayed channels (1 µm²): each gate flips with probability rate·dt
    chNa.forEach(c => { let k = 0; for (let g = 0; g < 3; g++) { const open = g < c.m; if (open ? Math.random() < bm * dt : Math.random() < am * dt) k += open ? -1 : 1; } c.m = Math.max(0, Math.min(3, c.m + k)); if (c.h ? Math.random() < bh * dt : Math.random() < ah * dt) c.h = 1 - c.h; });
    chK.forEach(c => { let k = 0; for (let g = 0; g < 4; g++) { const open = g < c.n; if (open ? Math.random() < bn * dt : Math.random() < an * dt) k += open ? -1 : 1; } c.n = Math.max(0, Math.min(4, c.n + k)); });
    P.t += dt; P.Ena = Ena; P.Ek = Ek; P.El = El; P.fNa = fNa; P.fK = fK;
  };
  P.chNa = chNa; P.chK = chK; P.reset = () => { P.V = -65; P.m = 0.053; P.h = 0.596; P.n = 0.318; P.qNa = 0; P.qK = 0; P.nSp = 0; P.lastNa = null; P.inSp = false; popNa = null; };
  return P;
}

function renderAP() {
  document.title = 'Action potential up close · Real biology';
  const sl = (id, l, a, b, st, v, u = '') => `<div class="nl-ch"><label for="${id}">${l}</label><input type="range" id="${id}" min="${a}" max="${b}" step="${st}" value="${v}"><output id="${id}o">${v}${u}</output></div>`;
  $('lesson').innerHTML = bioHead('Action potential up close', 'REAL BIOLOGY · TEACHING MODULE · ION CHANNELS · NERNST · HODGKIN–HUXLEY · CONDUCTION',
    'Zoom into one square micrometre of axon membrane. Watch individual Na⁺ and K⁺ channels flicker open, ions cross, and the voltage swing. Then follow the same spike as it travels along a squid axon, a myelinated human motor axon and a thin pain fibre. Everything is the Hodgkin–Huxley model running live, with real concentrations, channel densities and temperatures.')
    + `<nav class="page-jumps"><a href="#ap-patch">Membrane patch (live)</a><a href="#ap-axon">Along the axon</a><a href="#ap-try">Predict & test</a><a href="#ap-uth">The math</a><a href="/biology/reflex/">Next: the whole reflex →</a></nav>
    <section class="lesson-section lab" id="ap-patch"><p class="eyebrow">01 · Live</p><h2>One square micrometre of membrane</h2>
      <p>The patch keeps running. Press <b>Pulse</b> to inject current, or raise the <b>holding current</b> to make it fire repeatedly. Each icon is one real channel (60 Na⁺, 18 K⁺: the density in squid axon). A channel conducts only when all its gates are open.</p>
      <div class="nv-wrap"><div class="at-stage">
        <canvas id="apMem" class="nv-canvas" style="height:300px" aria-label="Membrane patch with Na⁺ and K⁺ channels and ions"></canvas>
        <div class="nl-bar"><button id="apPulse">Pulse</button><button class="secondary" id="apPair">Pair of pulses</button><button class="secondary" id="apPause">⏸ Pause</button><button class="secondary" id="apReset">↺ Reset</button><button class="secondary" id="apSnap">Snapshot</button><label class="nl-inl">speed <select id="apSpd"><option value="0.01">1/100×</option><option value="0.02" selected>1/50×</option><option value="0.05">1/20×</option><option value="0.2">1/5×</option></select></label></div>
        <canvas id="apTr" class="uth-plot" style="height:330px" aria-label="Scrolling traces: voltage, gates, currents"></canvas>
        <div id="apOut" class="ml-fp"></div><div id="apSnaps" class="ng-snaps"></div></div>
      <div class="lab-controls nv-controls nl-ctl">
        <details open><summary>Stimulus</summary>${sl('apAmp', 'Pulse (µA/cm²)', 0, 60, 1, 20)}${sl('apDur', 'Pulse length (ms)', 0.1, 5, 0.1, 0.5)}${sl('apGap', 'Pair interval (ms)', 1, 30, 0.5, 8)}${sl('apHold', 'Holding current (µA/cm²)', 0, 30, 0.5, 0)}</details>
        <details open><summary>Ions (mM) & temperature</summary>${sl('apKo', '[K⁺] outside', 5, 150, 1, AP_SQ.Ko)}${sl('apKi', '[K⁺] inside', 100, 500, 10, AP_SQ.Ki)}${sl('apNao', '[Na⁺] outside', 50, 600, 10, AP_SQ.Nao)}${sl('apNai', '[Na⁺] inside', 5, 150, 1, AP_SQ.Nai)}${sl('apT', 'Temperature (°C)', 0, 30, 0.5, 6.3)}</details>
        <details open><summary>Drugs</summary>${sl('apTTX', 'TTX: Na⁺ channels blocked (%)', 0, 100, 5, 0)}${sl('apTEA', 'TEA: K⁺ channels blocked (%)', 0, 100, 5, 0)}</details>
        <details><summary>Channel noise</summary><div class="nl-chips"><label><input type="checkbox" id="apNoise"> Use the stochastic channels for the current</label></div><div class="control-row"><select id="apArea"><option value="1">1 µm² (60 Na⁺ channels)</option><option value="10" selected>10 µm²</option><option value="100">100 µm²</option></select></div><p class="muted">Small patches are noisy: a few channels opening by chance can fire a spike with no stimulus (White, Rubinstein & Kay 2000).</p></details>
      </div></div></section>
    <section class="lesson-section lab" id="ap-axon"><p class="eyebrow">02 · Travel</p><h2>Along the axon</h2>
      <p>The same channels, now in a cable of membrane. Current from the active region spreads inside the axon and depolarises the next patch. Myelin insulates the internodes, so only the nodes of Ranvier need to fire: the spike jumps (saltatory conduction).</p>
      <div class="nv-wrap"><div class="at-stage">
        <canvas id="apAx" class="nv-canvas" style="height:170px" aria-label="Axon with voltage along its length"></canvas>
        <div class="nl-bar"><button id="apGo">▶ Stimulate the left end</button><button class="secondary" id="apReplay" disabled>↻ Replay</button><span class="muted" id="apSt"></span></div>
        <div class="nl-scrub"><input type="range" id="apAt" min="0" max="1" value="0" disabled aria-label="Time"><span id="apAtl">t = 0 ms</span></div>
        <canvas id="apWf" class="uth-plot" style="height:220px" aria-label="Space–time plot of voltage"></canvas>
        <canvas id="apEl" class="uth-plot" style="height:170px" aria-label="Voltage at three electrodes"></canvas>
        <div id="apAxOut" class="ml-fp"></div></div>
      <div class="lab-controls nv-controls nl-ctl">
        <details open><summary>Axon</summary><div class="control-row"><select id="apPre">${Object.entries(AP_PRE).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}</select></div>${sl('apD', 'Diameter (µm)', 50, 1000, 10, 476)}<div class="nl-chips"><label><input type="checkbox" id="apMy"> Myelinated</label></div>${sl('apDemy', 'Demyelination (%)', 0, 100, 5, 0)}${sl('apAT', 'Temperature (°C)', 0, 40, 0.5, 18.5)}</details>
        <details open><summary>Stimulus & drugs</summary>${sl('apAS', 'Stimulus (≈ × threshold)', 0, 4, 0.1, 1.5)}${sl('apATTX', 'TTX: Na⁺ channels blocked (%)', 0, 100, 5, 0)}</details>
      </div></div></section>
    <section class="lesson-section" id="ap-try"><p class="eyebrow">03 · Predict, then test</p><h2>Six questions</h2><div class="rx-qs">${AP_QS.map((q, j) => `<div class="rx-q"><b>${q[0]}.</b> ${q[1]}<div class="nl-chips">${q[2].map((c, m) => `<button class="secondary" data-apq="${j}:${m}">${c}</button>`).join('')}</div><p class="muted" id="apqa${j}"></p></div>`).join('')}</div></section>
    <section class="lesson-section"><details class="uth" id="ap-uth"><summary><span>Under the hood</span> equations, numbers and sources</summary><div class="uth-grid">
      <section><h4>Membrane patch</h4><ul class="skill-tips"><li>$C\\,\\dfrac{dV}{dt} = I - \\bar g_{Na} m^3 h (V-E_{Na}) - \\bar g_K n^4 (V-E_K) - g_L (V-E_L)$, $C = 1\\ \\mu F/cm^2$, $\\bar g_{Na}=120$, $\\bar g_K=36$, $g_L=0.3$ mS/cm² (Hodgkin & Huxley 1952).</li>
        <li>Each gate: $\\dfrac{dx}{dt} = \\alpha_x(V)(1-x) - \\beta_x(V)x$, rates × $3^{(T-6.3)/10}$ (Q10 = 3).</li>
        <li>Nernst: $E_X = \\dfrac{RT}{zF}\\ln\\dfrac{[X]_o}{[X]_i}$. The leak is a fixed mix of K⁺ and Na⁺ permeability chosen so $E_L = -54.4$ mV at the squid concentrations; changing [K⁺]ₒ moves it.</li>
        <li>Channels: single-channel conductance ≈ 20 pS, so 120 mS/cm² ↔ 60 Na⁺ channels per µm² and 36 mS/cm² ↔ 18 K⁺ channels per µm². Each icon simulates its 3 m + 1 h (Na⁺) or 4 n (K⁺) gates as independent two-state Markov switches with the same α, β.</li>
        <li>Charge: one spike needs $C\\,\\Delta V \\approx 1\\,\\mu F/cm^2 \\times 100\\,mV = 0.1\\,\\mu C/cm^2$ ≈ 6,000 monovalent ions per µm²; real Na⁺ entry is a few times larger because Na⁺ and K⁺ currents overlap.</li></ul></section>
      <section><h4>Axon</h4><ul class="skill-tips"><li>Cable: compartments coupled by axial resistance $r_a = 4R_i/(\\pi d^2)$, solved implicitly (backward Euler, tridiagonal). Squid: $R_i = 35.4\\ \\Omega\\,cm$ (HH 1952: computed 18.8 m/s at 18.5 °C; this page gives the same).</li>
        <li>Human nodes: Chiu, Ritchie, Rogart, Stagg & Sweeney (1979) Na⁺ kinetics with leak and no fast K⁺, $\\bar g_{Na} = 1445$ mS/cm², $C = 2.5\\ \\mu F/cm^2$, 37 °C, $R_i = 54.7\\ \\Omega\\,cm$ (Sweeney et al. 1987). Axon d = 0.7 × fibre D, internode = 100 × D, node 1 µm.</li>
        <li>Myelin: capacitance per unit length is constant at a fixed g-ratio, so per unit axon area it falls as 1/d (0.014/d µF/cm²). Demyelination thins the sheath: internode capacitance and leak rise up to 10× (as if 90 % of the wraps were lost).</li>
        <li>C-fibre: the same Na⁺ kinetics at 10 % of nodal density over bare membrane (Na⁺ channels cluster at nodes in myelinated fibres; Waxman & Ritchie 1985).</li>
        <li>Velocity is measured between 25 % and 75 % of the axon from the −20 mV crossing times. Expected: myelinated ≈ 4.5–6 m/s per µm of fibre diameter (Hursh 1939); C-fibres 0.5–2 m/s (Gasser 1950).</li></ul></section>
      <section><h4>References</h4><ul class="skill-tips"><li>Hodgkin AL, Huxley AF (1952) <i>J Physiol</i> 117:500–544.</li><li>Hille B (2001) <i>Ion Channels of Excitable Membranes</i>, 3rd ed. Sinauer.</li><li>Chiu SY, Ritchie JM, Rogart RB, Stagg D (1979) <i>J Physiol</i> 292:149–166.</li><li>Sweeney JD, Mortimer JT, Durand D (1987) <i>IEEE EMBS Proc</i> 9:1577–1578.</li><li>Hursh JB (1939) <i>Am J Physiol</i> 127:131–139.</li><li>White JA, Rubinstein JT, Kay AR (2000) Channel noise in neurons. <i>Trends Neurosci</i> 23:131–137.</li><li>Waxman SG, Ritchie JM (1985) <i>Science</i> 228:1502–1507.</li></ul></section>
    </div></details></section>` + smallPrint();
  if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([$('lesson')]).catch(() => {});

  /* ---------------- part 1: live patch ---------------- */
  const P = apPatch(), o = { T: 6.3, Ko: AP_SQ.Ko, Ki: AP_SQ.Ki, Nao: AP_SQ.Nao, Nai: AP_SQ.Nai, ttx: 0, tea: 0, noise: false, area: 10 };
  const E0 = { Na: apNernst(1, AP_SQ.Nao, AP_SQ.Nai, 6.3), K: apNernst(1, AP_SQ.Ko, AP_SQ.Ki, 6.3) }; o.fK = (E0.Na + 54.4) / (E0.Na - E0.K);
  const settle = () => { P.reset(); for (let i = 0; i < 20000; i++) P.step(0.01, o, 0); P.nSp = 0; P.lastNa = null; P.inSp = false; P.t = 0; };   // 200 ms with no input so the patch starts at its true resting state
  settle();
  let pulses = [], paused = false, live = true, hist = [], parts = [], tok = 0;
  const HW = 40, dtP = 0.01;   // ms in the scrolling window; integration step
  const bindS = (id, f) => { const el = $(id); el.oninput = () => { $(id + 'o').textContent = el.value; f(+el.value); }; };
  bindS('apKo', v => o.Ko = v); bindS('apKi', v => o.Ki = v); bindS('apNao', v => o.Nao = v); bindS('apNai', v => o.Nai = v); bindS('apT', v => o.T = v);
  bindS('apTTX', v => o.ttx = v / 100); bindS('apTEA', v => o.tea = v / 100); ['apAmp', 'apDur', 'apGap', 'apHold'].forEach(id => bindS(id, () => {}));
  $('apNoise').onchange = e => o.noise = e.target.checked; $('apArea').onchange = e => o.area = +e.target.value;
  const pulse = (t0 = P.t + 0.5) => pulses.push([t0, +$('apDur').value, +$('apAmp').value]);
  $('apPulse').onclick = () => pulse(); $('apPair').onclick = () => { pulse(); pulse(P.t + 0.5 + +$('apGap').value); };
  $('apPause').onclick = () => { paused = !paused; $('apPause').textContent = paused ? '▶ Resume' : '⏸ Pause'; };
  $('apReset').onclick = () => { settle(); hist = []; pulses = []; };
  $('apSnap').onclick = () => ngSnap(['apMem', 'apTr'], 'Membrane patch', 'apSnaps');
  const Iext = t => +$('apHold').value + pulses.reduce((a, [t0, d, A]) => a + (t >= t0 && t < t0 + d ? A : 0), 0);
  const drawMem = () => { const [x, W, H] = gfCanvas('apMem'), y0 = H * 0.42, y1 = H * 0.62;
    x.fillStyle = '#eaf2f7'; x.fillRect(0, 0, W, y0); x.fillStyle = '#fbefe6'; x.fillRect(0, y1, W, H - y1);
    x.fillStyle = '#e9d9b8'; x.fillRect(0, y0, W, y1 - y0); x.fillStyle = '#d8c39a'; for (let k = 0; k < W; k += 9) { x.beginPath(); x.arc(k + 4, y0 + 3, 3, 0, 7); x.arc(k + 4, y1 - 3, 3, 0, 7); x.fill(); }
    x.fillStyle = '#3d6a8c'; x.font = '12px system-ui'; x.fillText(`OUTSIDE  ·  [Na⁺] ${o.Nao} mM  ·  [K⁺] ${o.Ko} mM`, 8, 16); x.fillStyle = '#8a4b1f'; x.fillText(`INSIDE  ·  [Na⁺] ${o.Nai} mM  ·  [K⁺] ${o.Ki} mM`, 8, H - 8);
    // channels: Na⁺ (orange) and K⁺ (purple) placed along the membrane
    const all = [...P.chNa.map(c => ['Na', c]), ...P.chK.map(c => ['K', c])].sort((a, b) => a[1].x - b[1].x), sp = (W - 30) / all.length;
    let openNa = 0, openK = 0;
    all.forEach(([ty, c], j) => { const cx = 15 + j * sp + sp / 2, open = ty === 'Na' ? (c.m === 3 && c.h === 1) : c.n === 4; if (open) ty === 'Na' ? openNa++ : openK++;
      const col = ty === 'Na' ? '#e07b28' : '#7a3fa6', w = Math.max(3, sp * 0.62);
      x.fillStyle = open ? col : col + '55'; x.fillRect(cx - w / 2, y0 - 4, w, y1 - y0 + 8); x.fillStyle = '#fff'; if (open) x.fillRect(cx - w * 0.16, y0 - 4, w * 0.32, y1 - y0 + 8);
      if (ty === 'Na' && c.h === 0) { x.fillStyle = '#5b3a1a'; x.beginPath(); x.arc(cx, y1 + 6, Math.max(2, w * 0.35), 0, 7); x.fill(); }   // inactivation ball
      if (open && Math.random() < Math.min(0.9, Math.abs(ty === 'Na' ? P.V - P.Ena : P.V - P.Ek) / 120)) parts.push({ x: cx + (Math.random() - 0.5) * w * 0.3, y: ty === 'Na' ? y0 - 6 : y1 + 6, vy: ty === 'Na' ? 1 : -1, ty, life: 1 }); });
    parts = parts.filter(p => (p.life -= 0.03) > 0).slice(-500); parts.forEach(p => { p.y += p.vy * 2.4; p.x += (Math.random() - 0.5) * 1.2; x.fillStyle = p.ty === 'Na' ? '#e07b28' : '#7a3fa6'; x.globalAlpha = Math.min(1, p.life * 1.5); x.beginPath(); x.arc(p.x, p.y, 2.6, 0, 7); x.fill(); }); x.globalAlpha = 1;
    // voltage badge
    x.fillStyle = nlVcol(P.V); x.fillRect(W - 128, 26, 118, 30); x.fillStyle = P.V > -20 ? '#141111' : '#fff'; x.font = 'bold 16px system-ui'; x.fillText(`${P.V.toFixed(1)} mV`, W - 118, 47);
    x.font = '12px system-ui'; x.fillStyle = '#e07b28'; x.fillText(`Na⁺ open ${openNa}/60`, W - 128, y1 + 34); x.fillStyle = '#7a3fa6'; x.fillText(`K⁺ open ${openK}/18`, W - 128, y1 + 50);
    x.fillStyle = '#6f4c27'; x.fillText('● = inactivation gate (h) closed', 8, y1 + 34); x.fillText('each dot ≈ 1,000 ions', 8, y1 + 50); };
  const drawTr = () => { const [x, W, H] = gfCanvas('apTr'); if (!hist.length) { x.fillStyle = '#6f4c27'; x.font = '12px system-ui'; x.fillText(paused ? 'Paused. Press ▶ Resume, then Pulse.' : 'Starting…', 12, 22); return; } const Lm = 112, Rr = W - 10, t1 = hist[hist.length - 1][0], t0 = t1 - HW, X = t => Lm + (Rr - Lm) * (t - t0) / HW;
    const rows = [['V (mV)', 1, -90, 50, '#141111', 2.2], ['m, h, n', [2, 3, 4], 0, 1, ['#e07b28', '#5b3a1a', '#7a3fa6'], 1.3], ['I_Na, I_K (inward ↑)', [5, 6], -900, 900, ['#e07b28', '#7a3fa6'], 1], ['stimulus', 7, 0, 60, '#a62962', 0.8]];
    const hs = rows.map(r => r[5]), tot = hs.reduce((a, b) => a + b, 0); let y = 2;
    rows.forEach(([lab, k, lo, hi, col, hf]) => { const rh = (H - 20) * hf / tot, Y = v => y + rh - 3 - (rh - 6) * (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo); x.fillStyle = Array.isArray(col) ? col[0] : col; x.font = '11px system-ui'; x.fillText(lab, 4, y + rh / 2 + 4);
      x.strokeStyle = '#efe4d8'; x.beginPath(); x.moveTo(Lm, y + rh - 1); x.lineTo(Rr, y + rh - 1); x.stroke();
      if (k === 1) { [[P.Ena, '#e07b28', 'E_Na'], [P.Ek, '#7a3fa6', 'E_K'], [0, '#c9b6a2', '0']].forEach(([e, c, l]) => { x.strokeStyle = c; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(Lm, Y(e)); x.lineTo(Rr, Y(e)); x.stroke(); x.setLineDash([]); x.fillStyle = c; x.fillText(`${l} ${e.toFixed(0)}`, Lm + 2, Math.max(y + 10, Y(e) - 2)); }); }
      (Array.isArray(k) ? k : [k]).forEach((kk, q) => { x.strokeStyle = Array.isArray(col) ? col[q] : col; x.lineWidth = 1.4; x.beginPath(); hist.forEach((s, j) => { const v = s[kk]; j ? x.lineTo(X(s[0]), Y(v)) : x.moveTo(X(s[0]), Y(v)); }); x.stroke(); });
      y += rh; });
    x.fillStyle = '#6f4c27'; x.fillText(`last ${HW} ms · t = ${t1.toFixed(1)} ms`, Lm, H - 4); };
  const ions = q => q * 1e-9 / 1.602e-19 / 1e8, dC = (q, dum) => q * 1e-9 / 96485 * 4 / (dum * 1e-4) * 1e6;   // nC/cm² → ions per µm²; Δ[ion] in mM for an axon of diameter d µm
  const out = () => { const q = P.lastNa;
    $('apOut').innerHTML = `<div><b>E<sub>Na</sub></b> ${P.Ena.toFixed(1)} mV</div><div><b>E<sub>K</sub></b> ${P.Ek.toFixed(1)} mV</div><div><b>E<sub>leak</sub></b> ${P.El.toFixed(1)} mV</div><div><b>Spikes</b> ${P.nSp || 0}</div>`
      + (q != null ? `<div><b>Last spike</b>: ${Math.round(ions(q)).toLocaleString()} Na⁺ in and ${Math.round(ions(P.lastK)).toLocaleString()} K⁺ out per µm² · [Na⁺]ᵢ rises ${dC(q, 476).toExponential(1)} mM in the squid axon but ${dC(q, 0.2).toFixed(2)} mM in a 0.2 µm axon: thin axons depend on the Na⁺/K⁺ pump. (Hodgkin measured ≈ 20,000 Na⁺/µm² per spike near room temperature; the cold 6.3 °C model lets Na⁺ and K⁺ currents overlap more, so it uses more. Warm it and compare.)</div>` : '<div class="muted">Fire a spike to count the ions that cross.</div>'); };
  let last = performance.now(), frameN = 0; const myTok = window.__apTok = (window.__apTok || 0) + 1;
  const loop = now => { if (!live || myTok !== window.__apTok || !document.getElementById('apMem')) return; const el = Math.min(50, now - last); last = now;
    if (!paused) { const simMs = el * +$('apSpd').value, nS = Math.max(1, Math.round(simMs / dtP)); for (let s = 0; s < nS; s++) { const I = Iext(P.t); P.step(dtP, o, I); if (s % 5 === 0) hist.push([P.t, P.V, P.m, P.h, P.n, -P.iNa, -P.iK, I]); }
      while (hist.length && hist[0][0] < P.t - HW) hist.shift(); pulses = pulses.filter(([t0, d]) => t0 + d > P.t - 1); }
    drawMem(); drawTr(); if (++frameN % 6 === 0) out(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const stopLive = () => { live = false; window.removeEventListener('hashchange', stopLive); window.removeEventListener('popstate', stopLive); };
  window.addEventListener('hashchange', stopLive); window.addEventListener('popstate', stopLive);

  /* ---------------- part 2: axon ---------------- */
  const a = { pre: 'squid', D: 476, myelin: false, demy: 0, T: 18.5, stim: 1.5, ttx: 0 }; let RA = null, Rprev = null, k = 0, anim = 0;
  const setPre = key => { const p = AP_PRE[key]; a.pre = key; a.D = p.D; a.myelin = p.myelin; a.T = p.T; const d = $('apD'); d.min = p.dRange[0]; d.max = p.dRange[1]; d.step = p.dRange[2]; d.value = p.D; $('apDo').textContent = p.D; $('apMy').checked = p.myelin; $('apAT').value = p.T; $('apATo').textContent = p.T; };
  $('apPre').onchange = e => { setPre(e.target.value); runAx(); };
  bindS('apD', v => a.D = v); bindS('apDemy', v => a.demy = v / 100); bindS('apAT', v => a.T = v); bindS('apAS', v => a.stim = v); bindS('apATTX', v => a.ttx = v / 100);
  $('apMy').onchange = e => a.myelin = e.target.checked;
  const runAx = () => { $('apSt').textContent = 'computing…'; setTimeout(() => {
    const p = AP_PRE[a.pre], d = p.model === 'mammal' && a.myelin ? 0.7 * a.D : a.D, cvEst = a.myelin ? 5 * a.D : p.model === 'hh' ? 19 * Math.sqrt(a.D / 476) * Math.pow(1.8, (a.T - 18.5) / 10) : 0.9 * Math.sqrt(a.D);
    const tEnd = Math.min(40, 1000 * p.len / 100 / Math.max(0.2, cvEst) * 1.6 + 2), o2 = { model: p.model, d, Lint: 100 * a.D, myelin: a.myelin, T: a.T, len: p.len, gNa: 1 - a.ttx, gK: 1, Ek: -77, Ena: 50, stim: a.stim * p.k * (a.myelin && p.model === 'hh' ? 1.6 / 0.7 : 1), stimDur: 0.1, tEnd, rec: tEnd / 300, demy: a.demy };
    if (RA) Rprev = RA; RA = apCable(o2); RA.o = o2; RA.p = p; $('apSt').textContent = ''; const s2 = $('apAt'); s2.max = RA.frames.length - 1; s2.disabled = false; $('apReplay').disabled = false; axOut(); play(); }, 20); };
  const drawAx = i => { const [x, W, H] = gfCanvas('apAx'); if (!RA) { x.fillStyle = '#6f4c27'; x.fillText('Press “Stimulate the left end”.', 12, 24); return; }
    const f = RA.frames[i], L = RA.L, X = xc => 20 + (W - 40) * xc / L, yc = H * 0.45, th = Math.min(46, Math.max(12, H * 0.22));
    RA.seg.forEach((s, j) => { const x0 = X(s.x - s.L / 2), x1 = X(s.x + s.L / 2); if (!s.act) { x.fillStyle = '#efe6d6'; x.fillRect(x0, yc - th / 2 - 8, x1 - x0 + 0.5, th + 16); x.fillStyle = nlVcol(f[j]); x.globalAlpha = 0.55; x.fillRect(x0, yc - th / 4, x1 - x0 + 0.5, th / 2); x.globalAlpha = 1; } else { x.fillStyle = nlVcol(f[j]); x.fillRect(Math.min(x0, X(s.x) - 1.5), yc - th / 2, Math.max(3, x1 - x0 + 0.5), th); } });
    if (RA.o.myelin) RA.nodeIdx.forEach(j => { x.strokeStyle = '#141111'; x.lineWidth = 1; x.beginPath(); x.moveTo(X(RA.seg[j].x), yc - th / 2 - 10); x.lineTo(X(RA.seg[j].x), yc - th / 2 - 4); x.stroke(); });
    x.fillStyle = '#141111'; x.font = '12px system-ui'; x.fillText(`t = ${RA.ts[i].toFixed(2)} ms`, 20, 16); x.fillText(`${(L * 10).toFixed(0)} mm`, W - 64, 16);
    x.fillStyle = '#a62962'; x.beginPath(); x.moveTo(8, yc - 8); x.lineTo(18, yc); x.lineTo(8, yc + 8); x.fill();
    x.fillStyle = '#6f4c27'; x.fillText(RA.o.myelin ? 'myelin (tan) · ticks = nodes of Ranvier' : 'bare membrane', 20, H - 12);
    [0.25, 0.5, 0.75].forEach((q, n2) => { x.strokeStyle = ['#3d6a8c', '#7a3fa6', '#c43c3c'][n2]; x.lineWidth = 2; x.beginPath(); x.moveTo(X(q * L), yc + th / 2 + 4); x.lineTo(X(q * L), yc + th / 2 + 16); x.stroke(); }); };
  const drawWf = i => { const [x, W, H] = gfCanvas('apWf'); if (!RA) return; const n = RA.frames.length, Lm = 50, Rr = W - 10, T = H - 22;
    const segs = RA.o.myelin ? RA.nodeIdx : RA.seg.map((s, j) => j);
    for (let r = 0; r <= i; r++) { const f = RA.frames[r], y = 4 + (T - 4) * r / (n - 1), hgt = Math.max(1, (T - 4) / (n - 1) + 0.5); segs.forEach((j, q) => { const s = RA.seg[j], xa = Lm + (Rr - Lm) * (RA.o.myelin ? q / segs.length : (s.x - s.L / 2) / RA.L), xb = Lm + (Rr - Lm) * (RA.o.myelin ? (q + 1) / segs.length : (s.x + s.L / 2) / RA.L); x.fillStyle = nlVcol(f[j]); x.fillRect(xa, y, xb - xa + 0.5, hgt); }); }
    x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; x.fillText('time ↓', 4, 14); x.fillText(`${RA.ts[n - 1].toFixed(1)} ms`, 4, T); x.fillText(RA.o.myelin ? 'node number →' : 'position along the axon →', Lm, H - 6);
    if (RA.cv) { x.fillStyle = '#141111'; x.fillText(`slope = conduction velocity ≈ ${RA.cv.toFixed(RA.cv < 5 ? 2 : 1)} m/s`, Rr - 250, H - 6); } };
  const drawEl = i => { const [x, W, H] = gfCanvas('apEl'); if (!RA) return; const Lm = 50, Rr = W - 10, tE = RA.ts[RA.ts.length - 1], X = t => Lm + (Rr - Lm) * t / tE, Y = v => 10 + (H - 30) * (1 - (v + 95) / 145);
    const near = q => { let b = 0; RA.seg.forEach((s, j) => { if (s.act && Math.abs(s.x - q * RA.L) < Math.abs(RA.seg[b].x - q * RA.L)) b = j; }); return b; };
    const draw = (R2, alpha, upto) => [0.25, 0.5, 0.75].forEach((q, n2) => { const j = near.call(null, q); x.strokeStyle = ['#3d6a8c', '#7a3fa6', '#c43c3c'][n2]; x.globalAlpha = alpha; x.lineWidth = 1.5; x.beginPath(); R2.frames.forEach((f, r) => { if (r > upto) return; const xx = Lm + (Rr - Lm) * R2.ts[r] / tE; r ? x.lineTo(xx, Y(f[j])) : x.moveTo(xx, Y(f[j])); }); x.stroke(); x.globalAlpha = 1; });
    draw(RA, 1, i);
    x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; [-80, -40, 0, 40].forEach(v => x.fillText(v, 18, Y(v) + 4)); x.fillText('mV', 4, 12); x.fillText('electrodes at 25 %, 50 %, 75 % of the axon', Lm + 4, 12); x.fillText(`${tE.toFixed(1)} ms`, Rr - 40, H - 4); };
  const axOut = () => { const p = RA.p, hursh = 6 * a.D, line = a.myelin ? `Hursh (1939): ≈ 4.5–6 m/s per µm of fibre → ${(4.5 * a.D).toFixed(0)}–${hursh.toFixed(0)} m/s` : p.model === 'hh' ? `HH (1952), 476 µm at 18.5 °C: 18.8 m/s computed, 21.2 m/s measured` : 'C-fibres: 0.5–2 m/s (Gasser 1950)';
    const prev = Rprev && Rprev.cv && RA.cv ? ` · previous run ${Rprev.cv.toFixed(Rprev.cv < 5 ? 2 : 1)} m/s (${(RA.cv / Rprev.cv).toFixed(2)}×)` : '';
    $('apAxOut').innerHTML = `<div><b>Conduction velocity</b> ${RA.cv ? RA.cv.toFixed(RA.cv < 5 ? 2 : 1) + ' m/s' : '<span style="color:#b3261e">no propagation (block or below threshold)</span>'}${prev}</div><div><b>Expected</b> ${line}</div>${RA.cv ? `<div><b>Toe → spinal cord (1 m)</b> ${(1000 / RA.cv).toFixed(RA.cv > 10 ? 0 : 0)} ms</div>` : ''}<div><b>Model</b> ${p.model === 'hh' ? 'Hodgkin–Huxley squid channels' : 'CRRSS mammalian nodal Na⁺ channels'} · ${RA.seg.length} compartments · dt ${RA.dt} ms</div>`; };
  const frameA = i => { k = i; drawAx(i); drawWf(i); drawEl(i); $('apAt').value = i; $('apAtl').textContent = `t = ${RA.ts[i].toFixed(2)} ms`; };
  const play = () => { const my = ++anim; let i = 0; const st = () => { if (my !== anim || !document.getElementById('apAx')) return; frameA(i); i += 2; if (i < RA.frames.length) requestAnimationFrame(st); else frameA(RA.frames.length - 1); }; st(); };
  $('apGo').onclick = runAx; $('apReplay').onclick = () => RA && play(); $('apAt').oninput = e => { anim++; if (RA) frameA(+e.target.value); };
  drawAx(0);

  /* ---------------- predict & test ---------------- */
  document.querySelectorAll('[data-apq]').forEach(b => b.onclick = () => { const [j, m] = b.dataset.apq.split(':').map(Number), q = AP_QS[j], set = q[4];
    const ok = m === q[3]; $('apqa' + j).innerHTML = `<b>${ok ? 'Yes.' : 'Not quite: the answer is “' + q[2][q[3]] + '”.'}</b> ${q[5]} <i>Now watch it happen above.</i>`;
    if (set.axon) { $('apPre').value = set.axon; setPre(set.axon); if (set.demy != null) { a.demy = set.demy; $('apDemy').value = set.demy * 100; $('apDemyo').textContent = set.demy * 100; } if (set.dMul) { const run1 = () => { a.D = AP_PRE[set.axon].D; $('apD').value = a.D; $('apDo').textContent = a.D; }; run1(); runAx(); setTimeout(() => { a.D *= set.dMul; $('apD').value = a.D; $('apDo').textContent = a.D; runAx(); }, 900); } else runAx(); document.getElementById('ap-axon').scrollIntoView({ behavior: 'smooth' }); return; }
    document.getElementById('ap-patch').scrollIntoView({ behavior: 'smooth' });
    if (set.ttx != null) { o.ttx = set.ttx; $('apTTX').value = set.ttx * 100; $('apTTXo').textContent = set.ttx * 100; $('apAmp').value = 40; $('apAmpo').textContent = 40; setTimeout(() => pulse(), 400); }
    if (set.Ko != null) { o.Ko = set.Ko; $('apKo').value = set.Ko; $('apKoo').textContent = set.Ko; setTimeout(() => pulse(), 1500); }
    if (set.pair) { $('apGap').value = set.pair; $('apGapo').textContent = set.pair; pulse(); pulse(P.t + 0.5 + set.pair); }
    if (set.T != null) { o.T = set.T; $('apT').value = set.T; $('apTo').textContent = set.T; setTimeout(() => pulse(), 300); } });
}
window.renderAP = renderAP;
