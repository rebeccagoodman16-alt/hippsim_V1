/* Extracted from Little Neural Guide modellab.js [504586:530491] — section: Reduced spiking model of the hippocampal loop */
/* ===================== Reduced spiking model of the hippocampal loop =====================
   EC → DG → CA3 → CA1 with interneurons. Izhikevich point neurons, current-based exponential synapses,
   axonal conduction delays from the distance between cells on the slice map.
   CA1 convergences are scaled from Bezaire et al. (2016) conndata_430 (ModelDB 187604); DG/CA3 values are illustrative. */

const HN_POPS = [
  // id, label, n, model, colour, region
  ['ec2', 'EC layer II', 30, 'input', '#6f4c27', 'EC'], ['ec3', 'EC layer III', 30, 'input', '#8c7664', 'EC'],
  ['gc', 'Granule cells', 120, 'gc', '#3f6f6a', 'DG'], ['dgb', 'DG basket cells', 8, 'fs', '#7a9a6a', 'DG'],
  ['ca3', 'CA3 pyramidal', 60, 'ca3', '#4f2a3a', 'CA3'], ['ca3b', 'CA3 basket cells', 8, 'fs', '#9a7fb0', 'CA3'],
  ['ca1', 'CA1 pyramidal', 80, 'pyr', '#a62962', 'CA1'], ['pvb', 'CA1 PV basket', 8, 'fs', '#5b6b8c', 'CA1'],
  ['aac', 'CA1 axo-axonic', 4, 'fs', '#d4a017', 'CA1'], ['bis', 'CA1 bistratified', 5, 'fs', '#c98b5e', 'CA1'],
  ['olm', 'CA1 O-LM', 6, 'olm', '#b25a3c', 'CA1'],
];
const HN_IZH = { gc: [0.02, 0.2, -65, 8, -1.0], ca3: [0.02, 0.2, -55, 4, -1.5], pyr: [0.02, 0.2, -65, 8, 0], fs: [0.1, 0.2, -65, 2, 0], olm: [0.02, 0.25, -65, 2, 0.5] };
/* pre, post, in-degree K, weight (+ excitatory, − inhibitory), conduction speed µm/ms, kind */
const HN_CONN = [
  ['ec2', 'gc', 10, 5.2, 400, 'perforant path'], ['ec2', 'dgb', 8, 5, 400, 'perforant path'], ['ec2', 'ca3', 6, 2.2, 400, 'perforant path'],
  ['gc', 'ca3', 4, 16, 300, 'mossy fibre'], ['gc', 'ca3b', 5, 6, 300, 'mossy fibre'], ['gc', 'dgb', 6, 4, 300, 'feedback'],
  ['dgb', 'gc', 4, -9, 300, 'perisomatic inhibition'],
  ['ca3', 'ca3', 6, 2.2, 400, 'recurrent collateral'], ['ca3', 'ca3b', 8, 4, 400, 'recurrent collateral'], ['ca3b', 'ca3', 4, -8, 300, 'perisomatic inhibition'],
  ['ca3', 'ca1', 12, 2.6, 400, 'Schaffer collateral'], ['ca3', 'pvb', 10, 3.5, 400, 'Schaffer collateral'], ['ca3', 'aac', 8, 3.5, 400, 'Schaffer collateral'], ['ca3', 'bis', 10, 3.5, 400, 'Schaffer collateral'],
  ['ec3', 'ca1', 8, 2.0, 400, 'temporoammonic path'], ['ec3', 'aac', 3, 3, 400, 'temporoammonic path'],
  ['ca1', 'olm', 15, 2.2, 400, 'CA1 axon collateral'], ['ca1', 'pvb', 8, 2.5, 400, 'CA1 axon collateral'], ['ca1', 'bis', 8, 2.5, 400, 'CA1 axon collateral'], ['ca1', 'aac', 3, 2.5, 400, 'CA1 axon collateral'],
  ['pvb', 'ca1', 3, -6, 300, 'soma'], ['aac', 'ca1', 2, -12, 300, 'axon initial segment'], ['bis', 'ca1', 3, -5, 300, 'SR/SO dendrites'], ['olm', 'ca1', 2, 0, 300, 'distal tuft (gates EC input)'],
  ['pvb', 'pvb', 2, -3, 300, 'mutual inhibition'],
];
/** CA1 convergence per postsynaptic cell in Bezaire et al. (2016), conndata_430: connections onto ONE cell. */
const HN_BEZAIRE = [['CA3 → CA1 pyramidal', 5985], ['EC → CA1 pyramidal', 1299], ['CA1 pyr → CA1 pyramidal', 197], ['PV basket → CA1 pyramidal', 17], ['Axo-axonic → CA1 pyramidal', 6], ['Bistratified → CA1 pyramidal', 10], ['O-LM → CA1 pyramidal', 8], ['CA1 pyramidal → O-LM', 2379], ['CA1 pyramidal → PV basket', 424], ['CA3 → PV basket', 6047], ['CA3 → axo-axonic', 4170], ['EC → axo-axonic', 485]];

/** Positions on a stylised transverse slice (map units; 1 unit ≈ 4 µm). */
function hnLayout(rnd) {
  const pos = {};
  const arc = (cx, cy, rx, ry, a0, a1, n, jitter) => Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * (i + .5) / n; return [cx + rx * Math.cos(a) + jitter * (rnd() - .5), cy + ry * Math.sin(a) + jitter * (rnd() - .5)]; });
  const curve = (p0, p1, p2, n, off, jitter) => Array.from({ length: n }, (_, i) => { const t = (i + .5) / n, x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]; return [x + jitter * (rnd() - .5), y + off + jitter * (rnd() - .5)]; });
  pos.gc = arc(250, 410, 120, 85, 0.55, 2 * Math.PI - 0.55, 120, 10);
  pos.dgb = arc(250, 410, 100, 68, 0.8, 2 * Math.PI - 0.8, 8, 4);
  pos.ca3 = curve([320, 420], [470, 400], [470, 210], 60, 0, 12);
  pos.ca3b = curve([330, 435], [490, 410], [490, 215], 8, 0, 4);
  pos.ca1 = curve([470, 190], [600, 120], [850, 150], 80, 0, 12);
  pos.pvb = curve([480, 205], [610, 140], [850, 168], 8, 0, 3);
  pos.aac = curve([500, 182], [620, 118], [840, 140], 4, 0, 3);
  pos.bis = curve([490, 170], [610, 100], [840, 128], 5, 0, 3);
  pos.olm = curve([500, 160], [615, 82], [840, 112], 6, 0, 3);
  pos.ec2 = Array.from({ length: 30 }, (_, i) => [760 + (i % 10) * 18 + 6 * (rnd() - .5), 480 + Math.floor(i / 10) * 16 + 6 * (rnd() - .5)]);
  pos.ec3 = Array.from({ length: 30 }, (_, i) => [760 + (i % 10) * 18 + 6 * (rnd() - .5), 540 + Math.floor(i / 10) * 16 + 6 * (rnd() - .5)]);
  return pos;
}

/** Build the network. Returns an object with step(dt) and state for drawing. */
function hnBuild(seed = 3) {
  const rnd = mulberry(seed), pos = hnLayout(rnd), P = {}, cells = [];
  HN_POPS.forEach(([id, label, n, model, col, region]) => { P[id] = { id, label, n, model, col, region, start: cells.length }; for (let i = 0; i < n; i++) cells.push({ pop: id, model, x: pos[id][i][0], y: pos[id][i][1], v: -65 - 5 * rnd(), u: 0, e: 0, g: 0, olm: 0, last: -1e9, out: [] }); });
  const D = 200, N = cells.length;                                 // delay ring buffer: up to 20 ms at dt 0.1
  HN_CONN.forEach(([pre, post, K, w, vel, kind]) => {
    const A = P[pre], B = P[post];
    for (let j = 0; j < B.n; j++) for (let k = 0; k < K; k++) {
      let i = A.start + Math.floor(rnd() * A.n); if (pre === post && i === B.start + j) continue;
      const a = cells[i], b = cells[B.start + j], dist = Math.hypot(a.x - b.x, a.y - b.y) * 4;          // µm
      const delay = Math.min(D - 1, Math.round((0.8 + dist / vel) / 0.1));
      a.out.push({ to: B.start + j, w, d: delay, olmGate: post === 'ca1' && pre === 'olm', ec3: pre === 'ec3' && post === 'ca1' });
    }
  });
  return { P, cells, N, D, bufE: Array.from({ length: D }, () => new Float32Array(N)), bufI: Array.from({ length: D }, () => new Float32Array(N)), bufO: Array.from({ length: D }, () => new Float32Array(N)), bufEC3: Array.from({ length: D }, () => new Float32Array(N)), t: 0, k: 0, spikes: [], rnd };
}
/** Advance by `steps` × 0.1 ms. opts: {stim:'pulse'|'theta'|'none', amp, inh, mf, aac, pvb, olm, ad, noise, pulseAt[]} */
function hnStep(net, steps, o) {
  const dt = 0.1, { cells, N, D, rnd } = net, gs = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const tauE = 3, tauI = 7, tauO = 20;
  for (let s = 0; s < steps; s++) {
    const slot = net.k % D, E = net.bufE[slot], I = net.bufI[slot], O = net.bufO[slot], EC3 = net.bufEC3[slot];
    for (let i = 0; i < N; i++) {
      const c = cells[i]; c.e += E[i]; c.g += I[i]; c.olm += O[i];
      c.e += EC3[i] / (1 + 0.8 * c.olm);                          // O-LM inhibition of the distal tuft divides entorhinal drive
      E[i] = 0; I[i] = 0; O[i] = 0; EC3[i] = 0;
    }
    for (let i = 0; i < N; i++) {
      const c = cells[i]; let fired = false;
      if (c.model === 'input') {                                   // entorhinal input: Poisson, rate set by the stimulus
        let rate = o.bg ?? 1;                                       // Hz background
        if (o.stim === 'theta') rate = 3 + o.amp * 40 * Math.max(0, Math.cos(2 * Math.PI * 8 * net.t / 1000 - (c.pop === 'ec3' ? Math.PI : 0))) ** 2;
        if (o.stim === 'pulse' && o.pulseAt.some(t0 => net.t >= t0 && net.t < t0 + 4)) rate += o.amp * 160;
        if (rnd() < rate * dt / 1000 && net.t - c.last > 3) fired = true;
      } else {
        const [a, b, cr, d, bias0] = HN_IZH[c.model];
        let bias = bias0, inhScale = o.inh;
        const isPV = c.pop === 'pvb' || c.pop === 'dgb' || c.pop === 'ca3b' || c.pop === 'aac' || c.pop === 'bis';
        if (o.ad > 0) { if (isPV) bias -= 4 * o.ad; if (c.model === 'pyr' || c.model === 'ca3') bias += 2.2 * o.ad; }
        const Iin = c.e - inhScale * c.g + bias + o.noise * gs() * 3;
        c.v += dt * (0.04 * c.v * c.v + 5 * c.v + 140 - c.u + Iin); c.u += dt * a * (b * c.v - c.u);
        if (c.v >= 30) { c.v = cr; c.u += d; fired = true; }
      }
      c.e -= dt * c.e / tauE; c.g -= dt * c.g / tauI; c.olm -= dt * c.olm / tauO;
      if (fired) {
        c.last = net.t; net.spikes.push([net.t, i]);
        const silenced = (c.pop === 'aac' && !o.aac) || (c.pop === 'pvb' && !o.pvb) || (c.pop === 'olm' && !o.olm);
        if (!silenced) for (const e of c.out) {
          const sl = (net.k + e.d) % D;
          let w = e.w; if (c.pop === 'gc' && cells[e.to].pop === 'ca3') w *= o.mf;
          if (e.olmGate) net.bufO[sl][e.to] += 1;
          else if (e.ec3) net.bufEC3[sl][e.to] += w;
          else if (w > 0) net.bufE[sl][e.to] += w; else net.bufI[sl][e.to] += -w;
        }
      }
    }
    net.t += dt; net.k++;
  }
  while (net.spikes.length && net.spikes[0][0] < net.t - 600) net.spikes.shift();
}
// ============================================================================
// ngCable: an in-browser compartmental simulator for real reconstructions (Hines tree solver, backward Euler).
// Channels are direct ports of Migliore et al. 2005 (ModelDB 55035) mod files: na3 (soma/dendrite Na), nax (axonal Na),
// kdr, kap (proximal A-type), kad (distal A-type), hd (Ih), plus passive leak. Rate functions are tabulated (0.1 mV steps).
// Units: mV, ms, µm (geometry); capacitance nF, conductance µS, current nA.
// Validated against NEURON on the same morphology (lab/engine/validate_engine.js).
// ============================================================================
const NGC = (() => {
  const F = 9.648e4, R = 8.315;
  const trap0 = (v, th, a, q) => Math.abs(v - th) > 1e-6 ? a * (v - th) / (1 - Math.exp(-(v - th) / q)) : a * q;
  /** Rate tables for one temperature. Each entry: [inf, tau] per state, v from VMIN in DV steps. */
  const VMIN = -120, DV = 0.1, NV = 2001;
  const tabCache = {};
  function tables(celsius) {
    if (tabCache[celsius]) return tabCache[celsius];
    const T = 273.16 + celsius, K = 1e-3 * F / (R * T);
    const mk = () => new Float64Array(NV);
    const t = { na_minf: mk(), na_mtau: mk(), na_hinf: mk(), na_htau: mk(), na_sinf: mk(), na_stau: mk(), kdr_ninf: mk(), kdr_ntau: mk(),
      kap_ninf: mk(), kap_ntau: mk(), kad_ninf: mk(), kad_ntau: mk(), ka_linf: mk(), ka_ltau: mk(), h_linf73: mk(), h_linf81: mk(), h_ltau: mk() };
    const qtNa = Math.pow(2, (celsius - 24) / 10), qtKA = Math.pow(5, (celsius - 24) / 10), qtH = Math.pow(4.5, (celsius - 33) / 10);
    for (let i = 0; i < NV; i++) {
      const v = VMIN + i * DV;
      // na3 / nax (same m,h kinetics; na3 adds slow inactivation s, ar = 1 → s = 1 at rest; we keep s for completeness)
      let a = trap0(v, -30, 0.4, 7.2), b = trap0(-v, 30, 0.124, 7.2);
      t.na_mtau[i] = Math.max(0.02, 1 / (a + b) / qtNa); t.na_minf[i] = a / (a + b);
      a = trap0(v, -45, 0.03, 1.5); b = trap0(-v, 45, 0.01, 1.5);
      t.na_htau[i] = Math.max(0.5, 1 / (a + b) / qtNa); t.na_hinf[i] = 1 / (1 + Math.exp((v + 50) / 4));
      const c = 1 / (1 + Math.exp((v + 58) / 2)); t.na_sinf[i] = c + 1 * (1 - c);
      const alps = Math.exp(12 * K * (v + 60)), bets = Math.exp(12 * 0.2 * K * (v + 60)); t.na_stau[i] = Math.max(10, bets / (0.0003 * (1 + alps)));
      // kdr
      a = Math.exp(-3 * K * (v - 13)); t.kdr_ninf[i] = 1 / (1 + a); t.kdr_ntau[i] = Math.max(2, Math.exp(-3 * 0.7 * K * (v - 13)) / (0.02 * (1 + a)));
      // kap
      let z = -1.5 + -1 / (1 + Math.exp((v + 40) / 5)); a = Math.exp(z * K * (v - 11));
      t.kap_ninf[i] = 1 / (1 + a); t.kap_ntau[i] = Math.max(0.1, Math.exp(z * 0.55 * K * (v - 11)) / (qtKA * 0.05 * (1 + a)));
      // kad
      z = -1.8 + -1 / (1 + Math.exp((v + 40) / 5)); a = Math.exp(z * K * (v + 1));
      t.kad_ninf[i] = 1 / (1 + a); t.kad_ntau[i] = Math.max(0.2, Math.exp(z * 0.39 * K * (v + 1)) / (qtKA * 0.1 * (1 + a)));
      // shared inactivation l (kap and kad use identical l kinetics)
      a = Math.exp(3 * K * (v + 56)); t.ka_linf[i] = 1 / (1 + a); t.ka_ltau[i] = Math.max(2, 0.26 * (v + 50));
      // hd (Ih): two half-activation variants used by the model (−73 proximal, −81 distal)
      t.h_linf73[i] = 1 / (1 + Math.exp(-(v + 73) / -8)); t.h_linf81[i] = 1 / (1 + Math.exp(-(v + 81) / -8));
      a = Math.exp(0.0378 * 2.2 * (v + 75)); t.h_ltau[i] = Math.exp(0.0378 * 2.2 * 0.4 * (v + 75)) / (qtH * 0.011 * (1 + a));
    }
    return (tabCache[celsius] = t);
  }
  const look = (tab, v) => { let x = (v - VMIN) / DV; if (x < 0) x = 0; else if (x > NV - 1.001) x = NV - 1.001; const i = x | 0, f = x - i; return tab[i] + f * (tab[i + 1] - tab[i]); };

  /** Build compartments for one cell from the guide's section format. opts.maxL: max compartment length (µm). */
  function buildCell(cell, opts = {}) {
    const maxL = opts.maxL || 20, secs = cell.sections, nS = secs.length;
    const poly = cell.soma || []; let area = 0; for (let i = 0, n = poly.length / 2; i < n; i++) { const j = (i + 1) % n; area += poly[2 * i] * poly[2 * j + 1] - poly[2 * j] * poly[2 * i + 1]; }
    area = Math.abs(area) / 2; const dS = Math.max(8, 2 * Math.sqrt((area || 100) / Math.PI));
    const comp = { par: [-1], L: [dS], d: [dS], area: [Math.PI * dS * dS], dist: [0], kind: [1], sec: [-1], x: [0], y: [0], z: [0] };
    const lastOf = new Int32Array(nS).fill(0), endDist = new Float64Array(nS);
    for (let s = 0; s < nS; s++) {
      const [t, p, xyz, r] = secs[s]; const pts = []; const rad = [];
      if (p >= 0) { const q = secs[p][2], m = q.length; pts.push([q[m - 3], q[m - 2], q[m - 1]]); rad.push(isFinite(r[0]) && r[0] > 0 ? r[0] : 0.5); }
      for (let k = 0; k < xyz.length / 3; k++) { pts.push([xyz[3 * k], xyz[3 * k + 1], xyz[3 * k + 2]]); const rr = r[k] ?? r[r.length - 1] ?? 0.5; rad.push(isFinite(rr) && rr > 0 ? rr : 0.5); }
      if (pts.length < 2) { pts.push([pts[0][0], pts[0][1] + 0.05, pts[0][2]]); rad.push(rad[0]); }
      const seg = []; let tot = 0; for (let k = 1; k < pts.length; k++) { const L = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1], pts[k][2] - pts[k - 1][2]); seg.push(L); tot += L; }
      const n = Math.max(1, Math.ceil(tot / maxL)), Lc = tot / n; let parent = p >= 0 ? lastOf[p] : 0, d0 = p >= 0 ? endDist[p] : 0;
      // walk along the polyline accumulating area and mean diameter per compartment
      let k = 1, used = 0;
      for (let c = 0; c < n; c++) {
        let need = Lc, A = 0, Lsum = 0, Dsum = 0, cx = 0, cy = 0, cz = 0;
        while (need > 1e-9 && k < pts.length) {
          const L = seg[k - 1]; if (L < 1e-9) { k++; used = 0; continue; }
          const rem = L - used, take = Math.min(rem, need), f0 = used / L, f1 = (used + take) / L;
          const ra = Math.max(0.1, rad[k - 1] + (rad[k] - rad[k - 1]) * f0), rb = Math.max(0.1, rad[k - 1] + (rad[k] - rad[k - 1]) * f1);
          A += Math.PI * (ra + rb) * Math.sqrt(take * take + (ra - rb) * (ra - rb)); Dsum += (ra + rb) * take; Lsum += take;
          const fm = (f0 + f1) / 2; cx += (pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * fm) * take; cy += (pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * fm) * take; cz += (pts[k - 1][2] + (pts[k][2] - pts[k - 1][2]) * fm) * take;
          used += take; need -= take; if (used >= L - 1e-9) { k++; used = 0; }
        }
        const id = comp.par.length; comp.par.push(parent); comp.L.push(Math.max(Lsum, 0.05)); comp.d.push(Math.max(0.2, Dsum / Math.max(Lsum, 1e-9))); comp.area.push(Math.max(A, 1e-3));
        comp.dist.push(d0 + (c + 0.5) * Lc); comp.kind.push(t); comp.sec.push(s); comp.x.push(cx / Math.max(Lsum, 1e-9)); comp.y.push(cy / Math.max(Lsum, 1e-9)); comp.z.push(cz / Math.max(Lsum, 1e-9));
        parent = id;
      }
      lastOf[s] = comp.par.length - 1; endDist[s] = d0 + tot;
    }
    comp.n = comp.par.length; comp.lastOf = lastOf;
    return comp;
  }
  /** Default biophysics: Migliore et al. 2005 (values in S/cm²). bio.on = {na, kdr, ka, h} toggles; scales per channel; per-region toggles. */
  const DEFAULT_BIO = { Rm: 28000, Cm: 1, Ra: 150, RaAx: 50, celsius: 35, gna: 0.025, axonm: 5, gkdr: 0.01, gka: 0.03, ghd: 0.00005, Ena: 55, Ek: -90, Eh: -30, Vrest: -65,
    on: { na: true, kdr: true, ka: true, h: true }, scale: { na: 1, kdr: 1, ka: 1, h: 1 }, regions: { soma: true, basal: true, apical: true, axon: true }, gradients: { ka: true, h: true },
    gM: 0, gMdend: 0, gNaP: 0, thp: -47, sgp: 3, thz: -39, sgz: 5, tauz: 75 };   // optional Golomb et al. 2006 I_M and I_NaP (S/cm²; soma + axon, I_M optionally in dendrites); 0 = off (Migliore 2005 model unchanged)
  function makeSim(comp, bio0 = {}) {
    const bio = JSON.parse(JSON.stringify(Object.assign({}, DEFAULT_BIO, bio0)));
    bio.on = Object.assign({}, DEFAULT_BIO.on, bio0.on); bio.scale = Object.assign({}, DEFAULT_BIO.scale, bio0.scale); bio.regions = Object.assign({}, DEFAULT_BIO.regions, bio0.regions); bio.gradients = Object.assign({}, DEFAULT_BIO.gradients, bio0.gradients);
    const n = comp.n, A = Float64Array.from(comp.area, a => a * 1e-8);      // µm² → cm²
    const C = new Float64Array(n), gL = new Float64Array(n), eL = new Float64Array(n), gAx = new Float64Array(n);
    const gMk = new Float64Array(n), gNP = new Float64Array(n), gNa3 = new Float64Array(n), gNax = new Float64Array(n), gKdr = new Float64Array(n), gKap = new Float64Array(n), gKad = new Float64Array(n), gH = new Float64Array(n), hDist = new Uint8Array(n);
    const regionOf = i => comp.kind[i] === 1 ? 'soma' : comp.kind[i] === 2 ? 'axon' : comp.kind[i] === 4 ? 'apical' : 'basal';
    for (let i = 0; i < n; i++) {
      const reg = regionOf(i), on = bio.regions[reg], d = comp.dist[i];
      C[i] = bio.Cm * A[i] * 1e3; gL[i] = A[i] * 1e6 / bio.Rm; eL[i] = bio.Vrest;
      if (reg === 'soma' || reg === 'axon') { gMk[i] = (bio.gM || 0) * A[i] * 1e6; gNP[i] = (bio.gNaP || 0) * A[i] * 1e6; } else gMk[i] = (bio.gMdend || 0) * A[i] * 1e6;
      if (!on) continue;
      if (reg === 'axon') { if (bio.on.na) gNax[i] = bio.gna * bio.axonm * bio.scale.na * A[i] * 1e6; if (bio.on.kdr) gKdr[i] = bio.gkdr * bio.scale.kdr * A[i] * 1e6; if (bio.on.ka) gKap[i] = bio.gka * bio.scale.ka * A[i] * 1e6; continue; }
      if (bio.on.na) gNa3[i] = bio.gna * bio.scale.na * A[i] * 1e6;
      if (bio.on.kdr) gKdr[i] = bio.gkdr * bio.scale.kdr * A[i] * 1e6;
      const gr = reg === 'soma' ? 1 : (bio.gradients.ka ? 1 + d / 100 : 1);
      if (bio.on.ka) { const g = bio.gka * bio.scale.ka * gr * A[i] * 1e6; if (reg !== 'soma' && d > 100) gKad[i] = g; else gKap[i] = g; }
      if (bio.on.h) { const hg = reg === 'soma' ? 1 : (bio.gradients.h ? 1 + 3 * d / 100 : 1); gH[i] = bio.ghd * bio.scale.h * hg * A[i] * 1e6; hDist[i] = reg !== 'soma' && d > 100 ? 1 : 0; }
    }
    for (let i = 1; i < n; i++) {   // axial conductance to parent (µS): half-compartment resistances in series
      const p = comp.par[i], ra = comp.kind[i] === 2 ? bio.RaAx : bio.Ra, rp = comp.kind[p] === 2 ? bio.RaAx : bio.Ra;
      const Ri = ra * (comp.L[i] / 2) * 1e-4 / (Math.PI * Math.pow(comp.d[i] / 2 * 1e-4, 2)), Rp = p === 0 ? 0 : rp * (comp.L[p] / 2) * 1e-4 / (Math.PI * Math.pow(comp.d[p] / 2 * 1e-4, 2));
      gAx[i] = 1e6 / (Ri + Rp);
    }
    const st = { V: new Float64Array(n).fill(bio.Vrest), m: new Float64Array(n), h: new Float64Array(n), s: new Float64Array(n), nk: new Float64Array(n), na: new Float64Array(n), nd: new Float64Array(n), l: new Float64Array(n), lh: new Float64Array(n), z: new Float64Array(n) };
    const T = tables(bio.celsius);
    const zinf = v => 1 / (1 + Math.exp(-(v - bio.thz) / bio.sgz)), pinf = v => 1 / (1 + Math.exp(-(v - bio.thp) / bio.sgp));
    const sim = { comp, bio, A, C, gL, eL, gAx, gMk, gNP, zinf, pinf, gNa3, gNax, gKdr, gKap, gKad, gH, hDist, st, t: 0, inputs: [], syns: [], vmax: new Float64Array(n).fill(bio.Vrest), T };
    sim.init = () => {
      const V = bio.Vrest; sim.t = 0;
      for (let i = 0; i < n; i++) {
        st.V[i] = V; st.m[i] = look(T.na_minf, V); st.h[i] = look(T.na_hinf, V); st.s[i] = look(T.na_sinf, V); st.nk[i] = look(T.kdr_ninf, V);
        st.na[i] = look(T.kap_ninf, V); st.nd[i] = look(T.kad_ninf, V); st.l[i] = look(T.ka_linf, V); st.lh[i] = look(hDist[i] ? T.h_linf81 : T.h_linf73, V);
        // leak reversal chosen so that V = Vrest is a steady state (as in the original model code)
        st.z[i] = zinf(V);
        const iIon = gMk[i] * st.z[i] * (V - bio.Ek) + gNP[i] * pinf(V) * (V - bio.Ena) + (gNa3[i] + gNax[i]) * Math.pow(st.m[i], 3) * st.h[i] * (gNa3[i] ? st.s[i] : 1) * (V - bio.Ena) + gKdr[i] * st.nk[i] * (V - bio.Ek) + gKap[i] * st.na[i] * st.l[i] * (V - bio.Ek) + gKad[i] * st.nd[i] * st.l[i] * (V - bio.Ek) + gH[i] * st.lh[i] * (V - bio.Eh);
        sim.eL[i] = V + iIon / gL[i]; sim.vmax[i] = V;
      }
      sim.syns.forEach(s => { s.A = 0; s.B = 0; s.queue = []; });
    };
    // tridiagonal-on-tree workspace
    const dg = new Float64Array(n), rhs = new Float64Array(n), off = new Float64Array(n);
    sim.step = (dt, extI) => {
      const V = st.V, E = bio;
      // 1) gates by exponential Euler at current V
      for (let i = 0; i < n; i++) {
        const v = V[i];
        if (gNa3[i] || gNax[i]) { st.m[i] = look(T.na_minf, v) + (st.m[i] - look(T.na_minf, v)) * Math.exp(-dt / look(T.na_mtau, v)); st.h[i] = look(T.na_hinf, v) + (st.h[i] - look(T.na_hinf, v)) * Math.exp(-dt / look(T.na_htau, v)); if (gNa3[i]) st.s[i] = look(T.na_sinf, v) + (st.s[i] - look(T.na_sinf, v)) * Math.exp(-dt / look(T.na_stau, v)); }
        if (gKdr[i]) st.nk[i] = look(T.kdr_ninf, v) + (st.nk[i] - look(T.kdr_ninf, v)) * Math.exp(-dt / look(T.kdr_ntau, v));
        if (gKap[i]) st.na[i] = look(T.kap_ninf, v) + (st.na[i] - look(T.kap_ninf, v)) * Math.exp(-dt / look(T.kap_ntau, v));
        if (gKad[i]) st.nd[i] = look(T.kad_ninf, v) + (st.nd[i] - look(T.kad_ninf, v)) * Math.exp(-dt / look(T.kad_ntau, v));
        if (gKap[i] || gKad[i]) st.l[i] = look(T.ka_linf, v) + (st.l[i] - look(T.ka_linf, v)) * Math.exp(-dt / look(T.ka_ltau, v));
        if (gH[i]) { const li = look(hDist[i] ? T.h_linf81 : T.h_linf73, v); st.lh[i] = li + (st.lh[i] - li) * Math.exp(-dt / look(T.h_ltau, v)); }
        if (gMk[i]) { const zi = zinf(v); st.z[i] = zi + (st.z[i] - zi) * Math.exp(-dt / bio.tauz); }
      }
      // 2) linear system: (C/dt + Σg) V_new − Σ gAx V_nb = C/dt V + Σ g E + I
      for (let i = 0; i < n; i++) {
        const gna = (gNa3[i] + gNax[i]) * Math.pow(st.m[i], 3) * st.h[i] * (gNa3[i] ? st.s[i] : 1), gk = gKdr[i] * st.nk[i] + gKap[i] * st.na[i] * st.l[i] + gKad[i] * st.nd[i] * st.l[i], gh = gH[i] * st.lh[i], gm = gMk[i] ? gMk[i] * st.z[i] : 0, gp = gNP[i] ? gNP[i] * pinf(V[i]) : 0;
        dg[i] = C[i] / dt + gL[i] + gna + gk + gh + gm + gp; rhs[i] = C[i] / dt * V[i] + gL[i] * sim.eL[i] + (gna + gp) * E.Ena + (gk + gm) * E.Ek + gh * E.Eh;
      }
      for (let i = 1; i < n; i++) { const p = comp.par[i]; dg[i] += gAx[i]; dg[p] += gAx[i]; off[i] = -gAx[i]; }
      if (extI) extI(dg, rhs, V, sim.t);
      for (const s of sim.syns) { // conductance synapses: g in µS, implicit
        const g = s.g(sim.t, V[s.i]); if (g !== 0) { dg[s.i] += g; rhs[s.i] += g * s.E; }
      }
      // Hines elimination (children have larger indices than parents)
      for (let i = n - 1; i >= 1; i--) { const p = comp.par[i], f = off[i] / dg[i]; dg[p] -= f * off[i]; rhs[p] -= f * rhs[i]; }
      V[0] = rhs[0] / dg[0];
      for (let i = 1; i < n; i++) V[i] = (rhs[i] - off[i] * V[comp.par[i]]) / dg[i];
      for (let i = 0; i < n; i++) if (V[i] > sim.vmax[i]) sim.vmax[i] = V[i];
      sim.t += dt;
    };
    return sim;
  }
  /** Receptor library: transmitter, rise/decay (ms, ~physiological temperature), reversal (mV) and charge carrier.
   *  sign −1 = the transmitter CLOSES a conductance (muscarinic suppression of K⁺ M-current), so the current is depolarising. */
  const SYN_LIB = {
    ampa: { tx: 'glutamate', name: 'AMPA', t1: 0.2, t2: 2, E: 0, ion: 'cation (Na⁺/K⁺)' },
    nmda: { tx: 'glutamate', name: 'NMDA', t1: 2, t2: 50, E: 0, mg: true, ion: 'cation incl. Ca²⁺; Mg²⁺ block' },
    kainate: { tx: 'glutamate', name: 'Kainate', t1: 1, t2: 30, E: 0, ion: 'cation (Na⁺/K⁺)' },
    gaba: { tx: 'GABA', name: 'GABA-A', t1: 0.5, t2: 8, E: -75, ion: 'Cl⁻ (+ HCO₃⁻)', cl: true },
    gabab: { tx: 'GABA', name: 'GABA-B (GIRK)', t1: 30, t2: 150, E: -90, ion: 'K⁺ via G protein', k: true },
    nachr: { tx: 'acetylcholine', name: 'Nicotinic', t1: 0.2, t2: 3, E: 0, ion: 'cation (Na⁺/K⁺/Ca²⁺)' },
    machr: { tx: 'acetylcholine', name: 'Muscarinic (M-current closure)', t1: 50, t2: 400, E: -90, sign: -1, ion: 'K⁺ conductance closed', k: true },
    glycine: { tx: 'glycine', name: 'Glycine', t1: 0.5, t2: 5, E: -75, ion: 'Cl⁻', cl: true }
  };
  /** Double-exponential synaptic conductance triggered by event times (ms). gmax in nS. NMDA: Mg²⁺ block (Jahr & Stevens 1990).
   *  opts: { E, tauScale (temperature), q, N, p, stochastic, rng } — with N/p/q each event releases k ~ Binomial(N, p) quanta of q nS. */
  function addSyn(sim, i, type, gmax_nS, E, opts = {}) {
    const L = SYN_LIB[type] || SYN_LIB.ampa, ts = opts.tauScale || 1, t1 = L.t1 * ts, t2 = L.t2 * ts, sign = L.sign || 1;
    const tp = t1 * t2 / (t2 - t1) * Math.log(t2 / t1), norm = 1 / (Math.exp(-tp / t2) - Math.exp(-tp / t1));
    const s = { i, type, lib: L, E: E ?? L.E, events: [], g: (t, v) => { let g = 0; for (const e of s.events) { const dt = t - e.t; if (dt < 0 || dt > 8 * t2) continue; g += e.w * norm * (Math.exp(-dt / t2) - Math.exp(-dt / t1)); } g *= gmax_nS * 1e-3; if (L.mg) g /= 1 + Math.exp(-0.062 * v) * (1 / 3.57); return sign * g; },
      fire: (t, w = 1) => { if (opts.stochastic && opts.N) { let k = 0; for (let j = 0; j < opts.N; j++) if ((opts.rng || Math.random)() < opts.p) k++; w *= k / (opts.N * opts.p); s.quanta = (s.quanta || []).concat([k]); } s.events.push({ t, w }); } };
    sim.syns.push(s); return s;
  }
  return { tables, buildCell, makeSim, addSyn, DEFAULT_BIO, look, SYN_LIB };
})();
