/* hs-cable.js: a compartmental Hodgkin–Huxley simulator for any SWC reconstruction, in the browser.
   Same model as the NEURON / Brian2 scripts hippsim hands out (tools/script_templates):
     leak Rm (default 20 kΩ·cm², E −65 mV), Ra (150 Ω·cm), Cm (1 µF/cm²); Hodgkin–Huxley Na/K (ENa 50, EK −77 mV,
     rates at 6.3 °C × 3^((T − 6.3)/10)) at gNa 0.5, gK 0.1 S/cm² in soma and axon and a fraction (default 2 %) in dendrites.
   Numerics: compartments of ≤ 20 µm along unbranched paths, backward Euler for voltage solved exactly on the tree
   (Hines), exponential Euler for the gates, dt 0.025 ms.

   HSCable.build(points, {Rm, Ra, Cm, Lmax (µm, default 20), somaArea (µm², default sphere of the largest soma radius),
                          somaJoin ('centre' default: a dendrite's first segment runs from the soma centre; 'neuron': it starts at its own first point)}) where points = [[x, y, z, r, swcType, parentIndex], ...] (parents first)
   model.run({
     tstop, dt, na, k, dend, celsius,
     inj: [{site, I: t => nA}],                 // current injections (or legacy amp/site/delay/dur: a step)
     syn: [{site, g: (t, v) => µS, E}],         // conductance synapses
     naMask, kMask: Float32Array(N),            // per-compartment multipliers (branch blocks)
     rec: [site, ...], frameDt, recDt (ms, default 0.1), currents (true: soma I_Na, I_K in nA) })
   -> {t, vSoma, vSite, rec: {site: [...]}, frames, frameDt, spikes, vmax, iNa, iK}
   Units inside: mV, ms, nA, µS, nF. */
(function (root) {
  'use strict';
  const EL = -65, ENA = 50, EK = -77, GNA = 0.5, GK = 0.1;
  const exprel = x => Math.abs(x) < 1e-6 ? 1 - x / 2 : x / (Math.exp(x) - 1);
  const am = v => 1.0 * exprel(-(v + 40) / 10), bm = v => 4 * Math.exp(-(v + 65) / 18);
  const ah = v => 0.07 * Math.exp(-(v + 65) / 20), bh = v => 1 / (1 + Math.exp(-(v + 35) / 10));
  const an = v => 0.1 * exprel(-(v + 55) / 10), bn = v => 0.125 * Math.exp(-(v + 65) / 80);

  function build(P, opt) {
    const RM = (opt && opt.Rm) || 20000, RA = (opt && opt.Ra) || 150, CM = (opt && opt.Cm) || 1, LMAX = ((opt && opt.Lmax) || 20) * 1e-4;   // cm
    const n0 = P.length, kids = new Int32Array(n0);
    P.forEach(p => { if (p[5] >= 0) kids[p[5]]++; });
    const um = 1e-4;                                       // µm -> cm
    // soma: one node, area of a sphere with the largest traced soma radius (= NEURON's 3-point soma cylinder)
    let rs = 0; P.forEach(p => { if (p[4] === 1) rs = Math.max(rs, p[3]); }); if (!rs) rs = 5;
    const node = {par: [-1], area: [opt && opt.somaArea ? opt.somaArea * um * um : 4 * Math.PI * (rs * um) ** 2], R: [0], len: [0], type: [1], last: [-1], kids: [0], dist: [0]};
    const nodeOf = new Int32Array(n0).fill(0);
    for (let i = 0; i < n0; i++) {
      const p = P[i], q = p[5];
      if (p[4] === 1 || q < 0) { nodeOf[i] = 0; continue; }
      const Q = P[q], join = Q[4] === 1 && opt && opt.somaJoin === 'neuron';   // NEURON convention: a dendrite joins the soma at soma(0.5) with no membrane between the soma centre and its first point
      const L = join ? 0 : Math.hypot(p[0] - Q[0], p[1] - Q[1], p[2] - Q[2]) * um;
      const r1 = (Q[4] === 1 ? p[3] : Q[3]) * um, r2 = p[3] * um, rm = Math.max((r1 + r2) / 2, 0.05 * um);
      const A = Math.PI * (r1 + r2) * Math.hypot(L, r1 - r2), Rax = RA * L / (Math.PI * rm * rm);
      const np = nodeOf[q];
      const extend = np > 0 && node.last[np] === q && kids[q] === 1 && node.type[np] === p[4] && node.len[np] + L <= LMAX;
      if (extend) { node.area[np] += A; node.R[np] += Rax; node.len[np] += L; node.last[np] = i; nodeOf[i] = np; }
      else { const k = node.par.length; node.par.push(np); node.area.push(A || 1e-9); node.R.push(Rax); node.len.push(L); node.type.push(p[4]); node.last.push(i); node.kids.push(0); node.kids[np]++; node.dist.push(node.dist[np] + node.len[np] / 2 / um + L / 2 / um); nodeOf[i] = k; }
    }
    const N = node.par.length, par = Int32Array.from(node.par), type = Uint8Array.from(node.type);
    const area = Float64Array.from(node.area), C = new Float64Array(N), gL = new Float64Array(N), gAx = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      C[i] = CM * area[i] * 1e3;                           // nF
      gL[i] = area[i] / RM * 1e6;                          // µS
      if (i > 0) gAx[i] = 1e6 / Math.max(1e-3, (node.R[i] + node.R[par[i]]) / 2);   // µS between node and parent centres
    }
    const M = {N, par, type, area, C, gL, gAx, nodeOf, dist: Float64Array.from(node.dist)};
    M.run = o => run(M, o);
    return M;
  }

  const tabCache = {};
  function tables(dt, celsius) {
    const key = dt + '@' + celsius; if (tabCache[key]) return tabCache[key];
    const phi = Math.pow(3, (celsius - 6.3) / 10), V0 = -120, DV = 0.05, NT = 4001, TB = new Float64Array(NT * 6);
    for (let k = 0; k < NT; k++) { const v = V0 + k * DV;
      [[am, bm], [ah, bh], [an, bn]].forEach(([fa, fb], g) => { const al = fa(v), be = fb(v), tau = 1 / ((al + be) * phi); TB[k * 6 + 2 * g] = al / (al + be); TB[k * 6 + 2 * g + 1] = Math.exp(-dt / tau); }); }
    return (tabCache[key] = {TB, V0, DV, NT});
  }

  function run(M, o) {
    const {N, par, type, area, C, gL, gAx} = M;
    const tstop = o.tstop ?? 400, dt = o.dt ?? 0.025, celsius = o.celsius ?? 6.3;
    const fNa = o.na ?? 1, fK = o.k ?? 1, fD = o.dend ?? 0.02, every = Math.max(1, Math.round((o.frameDt ?? 1) / dt));
    const inj = o.inj || [{site: o.site ?? 0, I: (d => t => (t >= d.delay && t < d.delay + d.dur ? d.amp : 0))({amp: o.amp ?? 0.5, delay: o.delay ?? 50, dur: o.dur ?? 300})}];
    const syn = o.syn || [], rec = o.rec || [], site0 = inj.length ? inj[0].site : 0;
    const gNa = new Float64Array(N), gK = new Float64Array(N);
    for (let i = 0; i < N; i++) { const f = (type[i] === 1 || type[i] === 2) ? 1 : fD;
      gNa[i] = GNA * fNa * f * area[i] * 1e6 * (o.naMask ? o.naMask[i] : 1); gK[i] = GK * fK * f * area[i] * 1e6 * (o.kMask ? o.kMask[i] : 1); }
    const {TB, V0, DV, NT} = tables(dt, celsius);
    const V = new Float64Array(N).fill(EL), m = new Float64Array(N), h = new Float64Array(N), n = new Float64Array(N), vmax = new Float32Array(N).fill(EL);
    { const x = (EL - V0) / DV | 0; for (let i = 0; i < N; i++) { m[i] = TB[x * 6]; h[i] = TB[x * 6 + 2]; n[i] = TB[x * 6 + 4]; } }
    const d = new Float64Array(N), b = new Float64Array(N), a = new Float64Array(N);
    for (let i = 1; i < N; i++) a[i] = -gAx[i];
    const steps = Math.round(tstop / dt), recEvery = Math.max(1, Math.round((o.recDt ?? 0.1) / dt));
    const t = [], vSoma = [], vSite = [], frames = [], spikes = [], R = {}, iNa = [], iK = []; rec.forEach(s => R[s] = []);
    let above = false;
    for (let s = 0; s <= steps; s++) {
      const tt = s * dt;
      if (s % recEvery === 0) { t.push(tt); vSoma.push(V[0]); vSite.push(V[site0]); rec.forEach(k => R[k].push(V[k]));
        if (o.currents) { iNa.push(gNa[0] * m[0] ** 3 * h[0] * (V[0] - ENA)); iK.push(gK[0] * n[0] ** 4 * (V[0] - EK)); } }
      if (s % every === 0) frames.push(Float32Array.from(V));
      if (V[0] > 0 && !above) { spikes.push(tt); above = true; } else if (V[0] < -20) above = false;
      if (s === steps) break;
      for (let i = 0; i < N; i++) {                        // gates: exponential Euler at the old voltage
        if (!gNa[i] && !gK[i]) continue;
        let x = (V[i] - V0) / DV; if (x < 0) x = 0; else if (x > NT - 1.001) x = NT - 1.001;
        const k = x | 0, f = x - k, o0 = k * 6, o1 = o0 + 6, lerp = j => TB[o0 + j] + f * (TB[o1 + j] - TB[o0 + j]);
        let inf = lerp(0), e = lerp(1); m[i] = inf + (m[i] - inf) * e;
        inf = lerp(2); e = lerp(3); h[i] = inf + (h[i] - inf) * e;
        inf = lerp(4); e = lerp(5); n[i] = inf + (n[i] - inf) * e;
      }
      for (let i = 0; i < N; i++) {
        const mi = m[i], ni = n[i], gna = gNa[i] * mi * mi * mi * h[i], gk = gK[i] * ni * ni * ni * ni, cdt = C[i] / dt;
        d[i] = cdt + gna + gk + gL[i]; b[i] = cdt * V[i] + gna * ENA + gk * EK + gL[i] * EL;
      }
      for (const q of inj) b[q.site] += q.I(tt);
      for (const q of syn) { const g = q.g(tt, V[q.site]); if (g) { d[q.site] += g; b[q.site] += g * q.E; } }
      for (let i = 1; i < N; i++) { d[i] += gAx[i]; d[par[i]] += gAx[i]; }
      for (let i = N - 1; i >= 1; i--) { const p = par[i], f = a[i] / d[i]; d[p] -= f * a[i]; b[p] -= f * b[i]; }   // Hines elimination
      V[0] = b[0] / d[0];
      for (let i = 1; i < N; i++) V[i] = (b[i] - a[i] * V[par[i]]) / d[i];
      for (let i = 0; i < N; i++) if (V[i] > vmax[i]) vmax[i] = V[i];
    }
    return {t, vSoma, vSite, rec: R, frames, frameDt: every * dt, spikes, vmax, iNa, iK};
  }
  root.HSCable = {build};
})(typeof window !== 'undefined' ? window : globalThis);
