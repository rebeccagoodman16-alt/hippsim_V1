/* hs-models.js: everything the Simulate panel can run, in the browser.

   ENGINES (uniform API: make(P, cache, p, marks) → E; E.run(protocol, progress) → raw result)
     hh   site/hs-cable.js: Hodgkin–Huxley on the reconstruction (same model as the NEURON / Brian2 scripts)
     ngc  site/hs-ngc.js:   the Little Neural Guide engine (Migliore 2005 CA1 channels; Golomb 2006 I_M + I_NaP)
   protocol = {tstop, dt, inj: [{pt, I: t => nA}], syn: [{pt, type, w (nS), times: [ms]}], rec: [pt], frameDt}
   raw = {t, vSoma, rec: {pt: [mV]}, frames, frameDt, vmax (per node), spikes, nodeOf (point → node, −1 = cut)}
   marks (branch tools, applied to the branch from that point outward):
     ttx (Na⁺ off) · noka (A-type off) · noh (Iₕ off) · passive (all voltage-gated off) · cut (branch removed)
     electrode (current injection site) · probe (recording site) · syn (AMPA + NMDA synapse, fires at 10 ms)

   MODELS: what each model is, its parameters (grouped, each with a baseline and range), presets (published
   manipulations with sources), the tests (EXPERIMENTS) it supports, and the baseline rows shown in the panel.
   EXPERIMENTS: a protocol + its analysis → R = {plot: 'v' | 'xy' | 'pop', series, readout: [[label, value]], summary,
   frames / nodeOf / vmax for the 3D cell}.
   Points: the viewer's SWC points [x, y, z, r, type, parentIndex], soma-centred, parents first. */
(function (root) {
  'use strict';
  const tick = () => new Promise(r => setTimeout(r, 0));
  const n2 = x => (+x).toFixed(2).replace(/\.?0+$/, '');
  const crossings = (t, v, t0 = -1, t1 = 1e9) => { const s = []; for (let k = 1; k < v.length; k++) if (v[k - 1] < 0 && v[k] >= 0 && t[k] >= t0 && t[k] < t1) s.push(t[k]); return s; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- geometry helpers ---------- */
  function kidsOf(P) { const k = Array.from({length: P.length}, () => []); P.forEach((p, i) => { if (p[5] >= 0) k[p[5]].push(i); }); return k; }
  function subtree(P, kids, i) { const out = [], st = [i]; while (st.length) { const j = st.pop(); out.push(j); kids[j].forEach(c => st.push(c)); } return out; }
  function pathDist(P) { const d = new Float64Array(P.length); for (let i = 0; i < P.length; i++) { const q = P[i][5]; d[i] = q >= 0 ? d[q] + (P[i][4] === 1 ? 0 : Math.hypot(P[i][0] - P[q][0], P[i][1] - P[q][1], P[i][2] - P[q][2])) : 0; } return d; }
  /** P without the cut branches; map[old] = new index or −1 */
  function applyCuts(P, cuts) {
    if (!cuts.length) return {P, map: Int32Array.from(P.keys())};
    const kids = kidsOf(P), gone = new Uint8Array(P.length);
    cuts.forEach(i => { if (P[i][4] !== 1) subtree(P, kids, i).forEach(j => gone[j] = 1); });
    const map = new Int32Array(P.length).fill(-1), Q = [];
    P.forEach((p, i) => { if (!gone[i]) { map[i] = Q.length; Q.push([p[0], p[1], p[2], p[3], p[4], p[5] >= 0 ? map[p[5]] : -1]); } });
    return {P: Q, map};
  }

  /* ---------- SWC points → the NGC section format, with a point → compartment map ---------- */
  function toSections(P) {
    const n = P.length, kids = kidsOf(P), isSoma = i => P[i][4] === 1;
    let rs = 0; P.forEach(p => { if (p[4] === 1) rs = Math.max(rs, p[3]); }); if (!rs) rs = 5;
    const soma = []; for (let k = 0; k < 16; k++) { const a = k / 16 * 2 * Math.PI; soma.push(rs * Math.cos(a), rs * Math.sin(a)); }
    const secOf = new Int32Array(n).fill(-1), sections = [], members = [];
    for (let i = 0; i < n; i++) {
      if (isSoma(i) || secOf[i] >= 0) continue;
      const q = P[i][5], starts = q < 0 || isSoma(q) || kids[q].length !== 1 || P[q][4] !== P[i][4];
      if (!starts) continue;
      const pts = [i]; let j = i;
      while (kids[j].length === 1 && P[kids[j][0]][4] === P[j][4]) { j = kids[j][0]; pts.push(j); }
      const s = sections.length; pts.forEach(k => secOf[k] = s);
      const ps = q < 0 || isSoma(q) ? -1 : secOf[q];
      sections.push([P[i][4] === 3 || P[i][4] === 4 ? P[i][4] : P[i][4] === 2 ? 2 : 3, ps, pts.flatMap(k => [P[k][0], P[k][1], P[k][2]]), pts.map(k => P[k][3])]);
      members.push(pts);
    }
    return {soma, sections, members, secOf, hasAxon: sections.some(s => s[0] === 2)};
  }
  function ngcCell(P, maxL) {
    const T = toSections(P), secs = T.sections.slice();
    if (!T.hasAxon) secs.push([2, -1, [0, 0, 0, 0, -200, 0], [0.5, 0.5]]);         // 200 µm axon stub, as in the Neuron lab
    const comp = NGC.buildCell({soma: T.soma, sections: secs}, {maxL});
    const nodeOf = new Int32Array(P.length).fill(0); let first = 1;                // replay buildCell's split: ceil(length / maxL) per section
    T.sections.forEach((s, si) => {
      const pts = T.members[si], xyz = [];
      if (s[1] >= 0) { const q = secs[s[1]][2], m = q.length; xyz.push([q[m - 3], q[m - 2], q[m - 1]]); }
      pts.forEach(k => xyz.push([P[k][0], P[k][1], P[k][2]]));
      const cum = [0]; for (let k = 1; k < xyz.length; k++) cum.push(cum[k - 1] + Math.hypot(xyz[k][0] - xyz[k - 1][0], xyz[k][1] - xyz[k - 1][1], xyz[k][2] - xyz[k - 1][2]));
      const tot = xyz.length < 2 ? 0.05 : cum[cum.length - 1], nc = Math.max(1, Math.ceil(tot / maxL)), Lc = tot / nc, off = s[1] >= 0 ? 1 : 0;
      pts.forEach((k, j) => { nodeOf[k] = first + Math.min(nc - 1, Math.floor((cum[j + off] || 0) / Math.max(Lc, 1e-9))); });
      first += nc;
    });
    return {comp, nodeOf};
  }

  /* ---------- synapses for the HH engine (same kinetics as NGC.SYN_LIB) ---------- */
  const SYN = {ampa: {t1: 0.2, t2: 2, E: 0}, nmda: {t1: 2, t2: 50, E: 0, mg: true}, gaba: {t1: 0.5, t2: 8, E: -75}};
  function synG(type, w, times) {
    const L = SYN[type], tp = L.t1 * L.t2 / (L.t2 - L.t1) * Math.log(L.t2 / L.t1), norm = 1 / (Math.exp(-tp / L.t2) - Math.exp(-tp / L.t1));
    return {E: L.E, g: (t, v) => { let g = 0; for (const e of times) { const d = t - e; if (d < 0 || d > 8 * L.t2) continue; g += norm * (Math.exp(-d / L.t2) - Math.exp(-d / L.t1)); }
      g *= w * 1e-3; if (L.mg) g /= 1 + Math.exp(-0.062 * v) / 3.57; return g; }};
  }

  /* marks → per-point flags; cut list */
  function markSets(P, marks) {
    const kids = kidsOf(P), sets = {ttx: new Set(), noka: new Set(), noh: new Set(), passive: new Set()};
    marks.filter(m => sets[m.kind]).forEach(m => subtree(P, kids, m.pt).forEach(j => sets[m.kind].add(j)));
    return {sets, cuts: marks.filter(m => m.kind === 'cut').map(m => m.pt)};
  }

  /* NEURON's reading of an SWC (its scripts' cleaning + Import3d): points that repeat their parent's position are dropped
     (their children attach to the parent), radii are at least 0.05 µm. Returns the cleaned points and old -> new indices. */
  function neuronClean(P) {
    const keep = new Int32Array(P.length), out = [];
    P.forEach((p, i) => {
      const q = p[5], dup = q >= 0 && p[4] !== 1 && p[0] === P[q][0] && p[1] === P[q][1] && p[2] === P[q][2];
      if (dup) { keep[i] = keep[q]; return; }
      keep[i] = out.length; out.push([p[0], p[1], p[2], Math.max(p[3], 0.05), p[4], q >= 0 ? keep[q] : -1]);
    });
    return {P: out, map: keep};
  }
  const ENGINES = {
    hh: {
      make(P0, cache, p, marks) {
        const {sets, cuts} = markSets(P0, marks), cut = applyCuts(P0, cuts), nrn = p.geom === 'neuron';
        const cl = nrn ? neuronClean(cut.P) : null, P = nrn ? cl.P : cut.P, map = nrn ? Int32Array.from(cut.map, j => j < 0 ? -1 : cl.map[j]) : cut.map;
        const key = `hh|${p.geom || 'hippsim'}|${p.Rm}|${p.Ra}|${p.Cm}|${cuts.join(',')}`, M = cache[key] || (cache[key] = HSCable.build(P, {Rm: p.Rm, Ra: p.Ra, Cm: p.Cm, somaJoin: nrn ? 'neuron' : 'centre'}));
        const nodeOf = Int32Array.from(map, j => j < 0 ? -1 : M.nodeOf[j]);
        const naMask = new Float32Array(M.N).fill(1), kMask = new Float32Array(M.N).fill(1);
        P0.forEach((_, i) => { const nd = nodeOf[i]; if (nd < 0) return; if (sets.ttx.has(i) || sets.passive.has(i)) naMask[nd] = 0; if (sets.passive.has(i)) kMask[nd] = 0; });
        return {nodeOf, N: M.N, dist: M.dist, async run(pr, progress) {
          if (progress) progress(0); await tick();
          const node = pt => pt >= 0 && nodeOf[pt] >= 0 ? nodeOf[pt] : 0;
          const syn = []; (pr.syn || []).forEach(s => { const nd = node(s.pt); (s.type === 'ampanmda' ? [['ampa', s.w], ['nmda', s.w * 0.8]] : [[s.type, s.w]]).forEach(([ty, w]) => { const q = synG(ty, w, s.times); syn.push({site: nd, g: q.g, E: q.E}); }); });
          const recPts = pr.rec || [], recN = recPts.map(node);
          const r = M.run({tstop: pr.tstop, dt: pr.dt || 0.025, na: p.na, k: p.k, dend: p.dend / 100, celsius: p.celsius, naMask, kMask,
            inj: (pr.inj || []).map(q => ({site: node(q.pt), I: q.I})), syn, rec: recN, frameDt: pr.frameDt || 1});
          const rec = {}; recPts.forEach((pt, k) => rec[pt] = r.rec[recN[k]]);
          return {t: r.t, vSoma: r.vSoma, rec, frames: r.frames, frameDt: r.frameDt, vmax: r.vmax, nodeOf, dist: M.dist, kind: M.type, ncomp: M.N};
        }};
      }
    },
    ngc: {
      make(P0, cache, p, marks, model) {
        const {sets, cuts} = markSets(P0, marks), {P, map} = applyCuts(P0, cuts), maxL = model.maxL || 20;
        const key = `ngc|${maxL}|${cuts.join(',')}`, C = cache[key] || (cache[key] = ngcCell(P, maxL));
        const nodeOf = Int32Array.from(map, j => j < 0 ? -1 : C.nodeOf[j]);
        return {nodeOf, N: C.comp.n, dist: C.comp.dist, async run(pr, progress) {
          const sim = NGC.makeSim(C.comp, model.bio(p)), comp = C.comp;
          P0.forEach((_, i) => { const nd = nodeOf[i]; if (nd <= 0) return;
            if (sets.ttx.has(i) || sets.passive.has(i)) { sim.gNa3[nd] = 0; sim.gNax[nd] = 0; sim.gNP[nd] = 0; }
            if (sets.noka.has(i) || sets.passive.has(i)) { sim.gKap[nd] = 0; sim.gKad[nd] = 0; }
            if (sets.noh.has(i) || sets.passive.has(i)) sim.gH[nd] = 0;
            if (sets.passive.has(i)) { sim.gKdr[nd] = 0; sim.gMk[nd] = 0; } });
          if (p.spines) for (let i = 1; i < comp.n; i++) if ((comp.kind[i] === 3 || comp.kind[i] === 4) && comp.dist[i] > 100) { sim.C[i] *= 2; sim.gL[i] *= 2; }   // spine area correction (F = 2)
          const node = pt => pt >= 0 && nodeOf[pt] >= 0 ? nodeOf[pt] : 0;
          (pr.syn || []).forEach(s => { const nd = node(s.pt); (s.type === 'ampanmda' ? [['ampa', s.w], ['nmda', s.w * 0.8]] : [[s.type, s.w]]).forEach(([ty, w]) => { const q = NGC.addSyn(sim, nd, ty, w); s.times.forEach(t => q.fire(t)); }); });
          sim.init();
          const dt = pr.dt || model.dt || 0.025, steps = Math.round(pr.tstop / dt), recEvery = Math.max(1, Math.round(0.1 / dt)), every = Math.max(1, Math.round((pr.frameDt || 1) / dt));
          const inj = (pr.inj || []).map(q => ({nd: node(q.pt), I: q.I})), recPts = pr.rec || [], recN = recPts.map(node);
          const t = [], vSoma = [], rec = {}, frames = []; recPts.forEach(pt => rec[pt] = []);
          const ext = (dg, rhs, V, tt) => { for (const q of inj) rhs[q.nd] += q.I(tt); };
          for (let s = 0; s <= steps; s++) {
            if (s % recEvery === 0) { t.push(sim.t); vSoma.push(sim.st.V[0]); recPts.forEach((pt, k) => rec[pt].push(sim.st.V[recN[k]])); }
            if (s % every === 0) frames.push(Float32Array.from(sim.st.V));
            if (s < steps) sim.step(dt, ext);
            if (s % 2000 === 1999) { if (progress) progress(s / steps); await tick(); }
          }
          return {t, vSoma, rec, frames, frameDt: every * dt, vmax: Float32Array.from(sim.vmax), nodeOf, dist: comp.dist, kind: comp.kind, ncomp: comp.n};
        }};
      }
    }
  };

  /* ---------- tests ---------- */
  const STEP_T = p => [p.delay, p.delay + p.dur];
  const stimSite = ctx => ctx.marks.filter(m => m.kind === 'electrode').map(m => m.pt).pop() ?? -1;
  const probes = ctx => ctx.marks.filter(m => m.kind === 'probe').map(m => m.pt);
  const userSyn = (ctx, t0 = 10) => ctx.marks.filter(m => m.kind === 'syn').map(m => ({pt: m.pt, type: 'ampanmda', w: ctx.p.wSyn ?? 2, times: [t0]}));
  function vSeries(raw, ctx, extra) {
    const s = [{name: 'soma', v: raw.vSoma, role: 'soma'}];
    const es = stimSite(ctx); if (es >= 0 && raw.rec[es]) s.push({name: 'electrode', v: raw.rec[es], role: 'site'});
    probes(ctx).forEach((pt, k) => raw.rec[pt] && s.push({name: `probe ${k + 1}`, v: raw.rec[pt], role: 'probe', k}));
    return s.concat(extra || []);
  }
  const recList = ctx => [stimSite(ctx), ...probes(ctx)].filter(x => x >= 0);
  const vr = (raw, t) => raw.vSoma[Math.max(0, raw.t.findIndex(x => x >= t))];

  const EXPERIMENTS = {
    step: {
      name: 'Current step', short: 'Firing pattern, latency, rate', desc: 'A square current pulse at the soma (or the electrode site): firing pattern, latency and rate.',
      params: [
        {k: 'amp', g: 'Stimulus', label: 'Current', min: -1, max: 3, step: 0.05, base: 0.5, f: v => n2(v) + ' nA'},
        {k: 'delay', g: 'Stimulus', label: 'Start', min: 0, max: 200, step: 5, base: 50, f: v => v + ' ms'},
        {k: 'dur', g: 'Stimulus', label: 'Duration', min: 10, max: 1000, step: 10, base: 300, f: v => v + ' ms'}],
      base: p => [['Test', `${n2(p.amp)} nA step for ${p.dur} ms at ${p.delay} ms`, p.amp !== 0.5 || p.dur !== 300 || p.delay !== 50]],
      async run(E, ctx, progress) {
        const p = ctx.p, [a, b] = STEP_T(p), tstop = b + 50;
        const raw = await E.run({tstop, inj: [{pt: stimSite(ctx), I: t => (t >= a && t < b ? p.amp : 0)}], syn: userSyn(ctx), rec: recList(ctx)}, progress);
        const sp = crossings(raw.t, raw.vSoma, a, b), isi = sp.length > 1 ? (sp[sp.length - 1] - sp[0]) / (sp.length - 1) : 0;
        const rd = [['Spikes', sp.length], ['First spike', sp.length ? n2(sp[0] - a) + ' ms' : '–'], ['Rate', sp.length > 1 ? Math.round(1000 / isi) + ' Hz' : '–'],
          ['Adaptation', sp.length > 3 ? n2((sp[sp.length - 1] - sp[sp.length - 2]) / (sp[1] - sp[0])) + ' (last / first ISI)' : '–'], ['Soma before', n2(vr(raw, a - 1)) + ' mV']];
        return {...raw, plot: 'v', tstop, stim: [a, b], series: vSeries(raw, ctx), readout: rd, key: sp.length,
          summary: sp.length ? `<b>${sp.length} spike${sp.length > 1 ? 's' : ''}</b> · first ${n2(sp[0] - a)} ms after the step${isi ? ` · ${Math.round(1000 / isi)} Hz` : ''}`
            : `<b>No spikes during the step.</b> Soma ${n2(vr(raw, a - 1))} mV before it, ${n2(vr(raw, b - 1))} mV at its end.`, spikes: crossings(raw.t, raw.vSoma)};
      }
    },
    fi: {
      name: 'F–I curve', short: 'Rate vs current: rheobase, gain', desc: 'Firing rate for a series of current steps: rheobase and gain. Each step 200 ms.',
      params: [
        {k: 'imax', g: 'Stimulus', label: 'Largest current', min: 0.2, max: 3, step: 0.1, base: 1, f: v => n2(v) + ' nA'},
        {k: 'nsteps', g: 'Stimulus', label: 'Number of steps', min: 3, max: 12, step: 1, base: 6, f: v => v + ''}],
      base: p => [['Test', `${p.nsteps} steps from 0 to ${n2(p.imax)} nA, 200 ms each`, p.imax !== 1 || p.nsteps !== 6]],
      async run(E, ctx, progress) {
        const p = ctx.p, amps = Array.from({length: p.nsteps}, (_, k) => +(p.imax * k / (p.nsteps - 1)).toFixed(3)), rate = []; let raw;
        for (const [k, a] of amps.entries()) {
          raw = await E.run({tstop: 250, inj: [{pt: stimSite(ctx), I: t => (t >= 25 && t < 225 ? a : 0)}], syn: userSyn(ctx), rec: recList(ctx)}, f => progress && progress((k + f) / amps.length));
          rate.push(crossings(raw.t, raw.vSoma, 25, 225).length / 0.2);
        }
        const rh = amps.find((a, k) => rate[k] > 0), k1 = rate.findIndex(r => r > 0), slope = k1 >= 0 && k1 < amps.length - 1 ? (rate[amps.length - 1] - rate[k1]) / (amps[amps.length - 1] - amps[k1]) : NaN;
        return {...raw, plot: 'xy', x: amps, y: rate, xl: 'current (nA)', yl: 'rate (Hz)', tstop: 250, stim: [25, 225],
          readout: [['Rheobase', rh != null ? `≤ ${n2(rh)} nA` : `> ${n2(p.imax)} nA`], ['Gain', isNaN(slope) ? '–' : Math.round(slope) + ' Hz/nA'], ['Max rate', Math.round(Math.max(...rate)) + ' Hz']],
          key: Math.round(Math.max(...rate)), summary: rh != null ? `Fires from <b>${n2(rh)} nA</b> · up to <b>${Math.round(Math.max(...rate))} Hz</b> at ${n2(p.imax)} nA` : `<b>No firing</b> up to ${n2(p.imax)} nA`};
      }
    },
    sag: {
      name: 'Iₕ sag and input resistance', short: 'Input resistance, Iₕ sag, rebound', desc: 'A hyperpolarizing step: input resistance, the slow sag as Iₕ opens, and the rebound when it ends.',
      params: [{k: 'hamp', g: 'Stimulus', label: 'Current', min: -1, max: -0.05, step: 0.05, base: -0.3, f: v => n2(v) + ' nA'}],
      base: p => [['Test', `${n2(p.hamp)} nA for 120 ms at 20 ms`, p.hamp !== -0.3]],
      async run(E, ctx, progress) {
        const p = ctx.p, raw = await E.run({tstop: 200, inj: [{pt: stimSite(ctx), I: t => (t >= 20 && t < 140 ? p.hamp : 0)}], rec: recList(ctx)}, progress);
        const v0 = vr(raw, 19), win = raw.t.map((t, k) => [t, raw.vSoma[k]]), dur = win.filter(([t]) => t >= 20 && t < 140), vmin = Math.min(...dur.map(x => x[1])), vss = vr(raw, 138);
        const after = win.filter(([t]) => t >= 140), vreb = Math.max(...after.map(x => x[1]));
        const Rin = (vss - v0) / p.hamp, sag = (vss - vmin) / Math.max(1e-9, v0 - vmin);
        return {...raw, plot: 'v', tstop: 200, stim: [20, 140], series: vSeries(raw, ctx),
          readout: [['Input resistance', Math.round(Rin) + ' MΩ'], ['Sag ratio', n2(sag) + ' (0 = none)'], ['Peak / steady', `${n2(vmin)} / ${n2(vss)} mV`], ['Rebound', (vreb - v0 >= 0 ? '+' : '') + n2(vreb - v0) + ' mV'], ['Rest', n2(v0) + ' mV']],
          key: Math.round(Rin), summary: `R<sub>in</sub> <b>${Math.round(Rin)} MΩ</b> · sag ratio ${n2(sag)} · rebound ${vreb - v0 >= 0 ? '+' : ''}${n2(vreb - v0)} mV`};
      }
    },
    bap: {
      name: 'Back-propagating spike', short: 'How far a spike invades the dendrites', desc: 'A brief 2.5 nA, 1.5 ms pulse at the soma: how far the spike invades the dendrites. The cell is coloured by each branch\'s peak voltage.',
      params: [], base: () => [['Test', '2.5 nA for 1.5 ms at the soma (the Neuron lab\'s validation protocol)']],
      async run(E, ctx, progress) {
        const raw = await E.run({tstop: 25, inj: [{pt: -1, I: t => (t >= 1 && t < 2.5 ? 2.5 : 0)}], syn: userSyn(ctx, 1), rec: probes(ctx), frameDt: 0.1}, progress);
        const v0 = raw.vSoma[0], x = [], y = []; for (let i = 1; i < raw.vmax.length; i++) { if (raw.kind[i] === 3 || raw.kind[i] === 4) { x.push(raw.dist[i]); y.push(raw.vmax[i] - v0); } }
        const at = (lo, hi) => { const s = y.filter((_, k) => x[k] >= lo && x[k] < hi); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : NaN; };
        const a0 = raw.vmax[0] - v0, a300 = at(250, 350), half = (() => { const o = x.map((d, k) => [d, y[k]]).sort((a, b) => a[0] - b[0]); const f = o.find(([, v]) => v < a0 / 2); return f ? f[0] : NaN; })();
        return {...raw, plot: 'xy', scatter: true, x, y, xl: 'path distance from soma (µm)', yl: 'peak depolarization (mV)', tstop: 25, peakColour: true,
          readout: [['At soma', n2(a0) + ' mV'], ['At 250–350 µm', isNaN(a300) ? '–' : n2(a300) + ' mV'], ['Falls to half by', isNaN(half) ? 'not within the tree' : Math.round(half) + ' µm']],
          key: isNaN(a300) ? 0 : Math.round(a300), summary: `Spike ${n2(a0)} mV at the soma${isNaN(a300) ? '' : `, <b>${n2(a300)} mV</b> at 250–350 µm`}${isNaN(half) ? '' : ` · half by ${Math.round(half)} µm`}`};
      }
    },
    tuft: {
      name: 'Clustered tuft input', short: 'Distal synapses: dendritic spikes', desc: 'AMPA + NMDA synapses on the distal apical tree (beyond 60 % of the longest path), all at 10 ms: dendritic spikes vs what reaches the soma.',
      params: [{k: 'nsyn', g: 'Stimulus', label: 'Synapses', min: 5, max: 120, step: 5, base: 40, f: v => v + ''}, {k: 'wsyn', g: 'Stimulus', label: 'AMPA per synapse (NMDA 0.8×)', min: 0.2, max: 6, step: 0.1, base: 2, f: v => n2(v) + ' nS'}],
      base: p => [['Test', `${p.nsyn} AMPA + NMDA synapses, ${n2(p.wsyn)} nS each, distal apical, at 10 ms`, p.nsyn !== 40 || p.wsyn !== 2]],
      async run(E, ctx, progress) { return synTest(E, ctx, progress, 'distal'); }
    },
    scatter: {
      name: 'Scattered dendritic input', short: 'Synapses spread over the tree', desc: 'AMPA synapses spread over all dendrites with 5 ms timing jitter: summation without clustering.',
      params: [{k: 'nsyn', g: 'Stimulus', label: 'Synapses', min: 5, max: 200, step: 5, base: 40, f: v => v + ''}, {k: 'wsyn', g: 'Stimulus', label: 'AMPA per synapse', min: 0.2, max: 6, step: 0.1, base: 1, f: v => n2(v) + ' nS'}],
      base: p => [['Test', `${p.nsyn} AMPA synapses, ${n2(p.wsyn)} nS each, all dendrites, 10 ms ± 5 ms`, p.nsyn !== 40 || p.wsyn !== 1]],
      async run(E, ctx, progress) { return synTest(E, ctx, progress, 'all'); }
    },
    tbs: {
      name: 'Theta-burst', short: '4 × 4 pulses: plasticity pattern', desc: '4 bursts at 5 Hz, each 4 pulses at 100 Hz (2 nA, 2 ms) at the soma: the plasticity-inducing pattern.',
      params: [{k: 'tamp', g: 'Stimulus', label: 'Pulse current', min: 0.2, max: 5, step: 0.1, base: 2, f: v => n2(v) + ' nA'}],
      base: p => [['Test', `4 × 4 pulses (100 Hz within, 5 Hz between), ${n2(p.tamp)} nA, 2 ms`, p.tamp !== 2]],
      async run(E, ctx, progress) {
        const p = ctx.p, on = t => { for (let b = 0; b < 4; b++) for (let k = 0; k < 4; k++) { const s = 10 + b * 200 + k * 10; if (t >= s && t < s + 2) return true; } return false; };
        const raw = await E.run({tstop: 700, inj: [{pt: stimSite(ctx), I: t => (on(t) ? p.tamp : 0)}], rec: recList(ctx)}, progress);
        const sp = crossings(raw.t, raw.vSoma);
        return {...raw, plot: 'v', tstop: 700, stim: [10, 642], series: vSeries(raw, ctx), readout: [['Spikes', sp.length + ' of 16 pulses']], key: sp.length,
          summary: `<b>${sp.length} of 16</b> pulses fired a spike`};
      }
    },
    zap: {
      name: 'Resonance (ZAP)', short: 'Impedance vs frequency', desc: 'A small chirp current sweeping 1 → 20 Hz (exponentially) over 3 s: the impedance profile and resonance frequency. In CA1 cells Iₕ produces resonance in the θ range (Hu et al. 2002, J Physiol 545:783).',
      params: [{k: 'zamp', g: 'Stimulus', label: 'Chirp amplitude', min: 0.01, max: 0.2, step: 0.01, base: 0.05, f: v => n2(v) + ' nA'}],
      base: p => [['Test', `${n2(p.zamp)} nA chirp, 1 → 20 Hz over 3 s, at the soma`, p.zamp !== 0.05]],
      async run(E, ctx, progress) {
        const p = ctx.p, T = 3000, f0 = 1, f1 = 20, t0 = 300, K = Math.log(f1 / f0), fr = t => f0 * Math.exp(K * t / T), ph = t => 2 * Math.PI * f0 * (T / K) * (Math.exp(K * t / T) - 1) * 1e-3;
        const raw = await E.run({tstop: t0 + T, dt: 0.05, frameDt: 10, inj: [{pt: stimSite(ctx), I: t => (t >= t0 ? p.zamp * Math.sin(ph(t - t0)) : 0)}], rec: recList(ctx)}, progress);
        // impedance Z(f) = |V̂(f)| / |Î(f)| over the chirp (discrete Fourier transform at 1–20 Hz, 0.25 Hz steps)
        const k0 = raw.t.findIndex(t => t >= t0), tt = raw.t.slice(k0), vv = raw.vSoma.slice(k0), mv = vv.reduce((a, b) => a + b, 0) / vv.length, ii = tt.map(t => p.zamp * Math.sin(ph(t - t0)));
        const x = [], y = [];
        for (let f = f0; f <= f1 + 1e-9; f += 0.25) { let vr = 0, vi = 0, ir = 0, iI = 0; const w = 2 * Math.PI * f * 1e-3;
          for (let k = 0; k < tt.length; k++) { const c = Math.cos(w * tt[k]), s2 = Math.sin(w * tt[k]); vr += (vv[k] - mv) * c; vi -= (vv[k] - mv) * s2; ir += ii[k] * c; iI -= ii[k] * s2; }
          x.push(f); y.push(Math.hypot(vr, vi) / Math.max(1e-12, Math.hypot(ir, iI))); }
        const im = y.indexOf(Math.max(...y)), fR = x[im], Q = y[im] / y[0];
        return {...raw, plot: 'xy', x, y, xl: 'frequency (Hz)', yl: 'impedance (MΩ)', tstop: t0 + T,
          readout: [['Resonance frequency', Q < 1.05 ? 'none (low-pass)' : (im === x.length - 1 ? '≥ ' : '') + n2(fR) + ' Hz'], ['Peak impedance', Math.round(y[im]) + ' MΩ'], ['Q (peak / at 1 Hz)', n2(Q)]], key: Q < 1.05 ? 0 : +n2(fR),
          summary: Q < 1.05 ? `<b>No resonance</b> (low-pass) · ${Math.round(y[0])} MΩ at 1 Hz` : `Resonates at <b>${im === x.length - 1 ? '≥ ' : ''}${n2(fR)} Hz</b> · Q ${n2(Q)} · ${Math.round(y[im])} MΩ peak`};
      }
    },
    thetagamma: {
      name: 'θ + γ drive', short: 'Single spikes vs bursts', desc: 'DC plus θ and γ sinusoidal current for 1 s (the research model\'s protocol): single spikes vs bursts.',
      params: [
        {k: 'Iapp', g: 'Stimulus', label: 'DC current', min: -0.4, max: 1.2, step: 0.01, base: 0.3, f: v => n2(v) + ' nA'},
        {k: 'Ath', g: 'Stimulus', label: 'θ amplitude', min: 0, max: 1, step: 0.01, base: 0.2, f: v => n2(v) + ' nA'},
        {k: 'fth', g: 'Stimulus', label: 'θ frequency', min: 2, max: 14, step: 0.5, base: 8, f: v => n2(v) + ' Hz'},
        {k: 'Aga', g: 'Stimulus', label: 'γ amplitude', min: 0, max: 1, step: 0.01, base: 0.15, f: v => n2(v) + ' nA'},
        {k: 'fga', g: 'Stimulus', label: 'γ frequency', min: 20, max: 100, step: 1, base: 40, f: v => n2(v) + ' Hz'},
        {k: 'where', g: 'Stimulus', label: 'θ + γ delivered to', type: 'choice', options: [['soma', 'soma'], ['rad', 'radiatum (100–300 µm)'], ['tuft', 'tuft (> 350 µm)']], base: 'soma', f: v => ({soma: 'soma', rad: 'radiatum', tuft: 'tuft'})[v]}],
      base: p => [['Test', `DC ${n2(p.Iapp)} nA at the soma + θ ${n2(p.Ath)} nA at ${n2(p.fth)} Hz + γ ${n2(p.Aga)} nA at ${n2(p.fga)} Hz to the ${({soma: 'soma', rad: 'radiatum', tuft: 'tuft'})[p.where]}, 1 s`,
        p.Iapp !== 0.3 || p.Ath !== 0.2 || p.fth !== 8 || p.Aga !== 0.15 || p.fga !== 40 || p.where !== 'soma']],
      async run(E, ctx, progress) {
        const p = ctx.p, drive = t => p.Ath * Math.sin(2 * Math.PI * p.fth * 1e-3 * t) + p.Aga * Math.sin(2 * Math.PI * p.fga * 1e-3 * t);
        let inj = [{pt: -1, I: t => p.Iapp + (p.where === 'soma' ? drive(t) : 0)}];
        if (p.where !== 'soma') {
          const d = ctx.dist, pts = []; ctx.P.forEach((q, i) => { if (q[4] === 4 && (p.where === 'rad' ? d[i] >= 100 && d[i] < 300 : d[i] >= 350)) pts.push(i); });
          const pick = pts.filter((_, k) => k % Math.max(1, Math.floor(pts.length / 40)) === 0);
          pick.forEach(pt => inj.push({pt, I: t => drive(t) / pick.length}));
        }
        const raw = await E.run({tstop: 1000, dt: 0.05, inj, rec: recList(ctx)}, progress);
        const sp = crossings(raw.t, raw.vSoma, 100), ev = []; sp.forEach((x, i) => (i && x - sp[i - 1] < 14) ? ev[ev.length - 1].push(x) : ev.push([x]));
        const single = ev.filter(e => e.length === 1).length, burst = ev.filter(e => e.length > 1).length;
        return {...raw, plot: 'v', tstop: 1000, stim: [0, 1000], series: vSeries(raw, ctx), key: sp.length,
          readout: [['Spikes (0.1–1 s)', sp.length], ['Single spikes', single], ['Bursts', burst + (burst ? ` (${n2(ev.filter(e => e.length > 1).reduce((a, e) => a + e.length, 0) / burst)} spikes each)` : '')]],
          summary: sp.length ? `<b>${sp.length} spikes</b> in 0.9 s · ${single} single · ${burst} burst${burst === 1 ? '' : 's'} (ISI &lt; 14 ms)` : '<b>No spikes.</b>'};
      }
    }
  };
  async function synTest(E, ctx, progress, where) {
    const p = ctx.p, d = ctx.dist, r = rng(7), dmax = Math.max(...ctx.P.map((q, i) => q[4] === 4 || q[4] === 3 ? d[i] : 0));
    const cand = []; ctx.P.forEach((q, i) => { if (where === 'distal' ? q[4] === 4 && d[i] > 0.6 * dmax : (q[4] === 3 || q[4] === 4)) cand.push(i); });
    if (!cand.length) ctx.P.forEach((q, i) => { if (q[4] === 3 || q[4] === 4) cand.push(i); });
    const syn = Array.from({length: p.nsyn}, () => ({pt: cand[Math.floor(r() * cand.length)], type: where === 'distal' ? 'ampanmda' : 'ampa', w: p.wsyn, times: [where === 'distal' ? 10 : 10 + (r() * 2 - 1) * 5]}));
    const site = syn.length ? syn[0].pt : -1;
    const raw = await E.run({tstop: 80, syn: syn.concat(userSyn(ctx)), rec: [site, ...recList(ctx)].filter(x => x >= 0)}, progress);
    const v0 = raw.vSoma[0], sp = crossings(raw.t, raw.vSoma), peakS = Math.max(...raw.vSoma) - v0, peakD = site >= 0 ? Math.max(...raw.rec[site]) - v0 : NaN;
    return {...raw, plot: 'v', tstop: 80, stim: [10, 15], series: vSeries(raw, ctx, site >= 0 ? [{name: 'at a synapse', v: raw.rec[site], role: 'site'}] : []), peakColour: true,
      readout: [['Soma peak', '+' + n2(peakS) + ' mV'], ['Dendrite peak (first synapse)', isNaN(peakD) ? '–' : '+' + n2(peakD) + ' mV'], ['Soma spikes', sp.length]], key: sp.length,
      summary: `Soma <b>+${n2(peakS)} mV</b>${isNaN(peakD) ? '' : ` · dendrite +${n2(peakD)} mV`}${sp.length ? ` · ${sp.length} spike${sp.length > 1 ? 's' : ''}` : ' · no spike'}`};
  }

  /* ---------- models ---------- */
  const CELL_TESTS = ['step', 'fi', 'sag', 'bap', 'tuft', 'scatter', 'tbs', 'zap'];
  const TOOLS_ALL = ['electrode', 'probe', 'syn', 'ttx', 'noka', 'noh', 'passive', 'cut'];
  const tog = (k, g, label, base) => ({k, g, label, type: 'toggle', base, f: v => v ? 'on' : 'off'});
  const MODELS = {
    hh: {
      scale: 'cell', name: 'Hodgkin–Huxley', tag: 'HH', engine: 'hh', sims: ['hippsim', 'NEURON', 'Brian2'], tests: CELL_TESTS, tools: ['electrode', 'probe', 'syn', 'ttx', 'passive', 'cut'],
      desc: 'Classic Na⁺ and K⁺ channels on the reconstruction. Simple, fast, and the same model runs in NEURON and Brian2.',
      params: [
        {k: 'na', g: 'Channels', label: 'Na⁺ (soma, axon)', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'k', g: 'Channels', label: 'K⁺ (soma, axon)', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'dend', g: 'Where channels are', label: 'Dendrite channels', min: 0, max: 100, step: 1, base: 2, f: v => v + ' % of soma'},
        {k: 'Rm', g: 'Passive', label: 'Membrane resistance R_m', min: 2000, max: 100000, step: 1000, base: 20000, f: v => n2(v / 1000) + ' kΩ·cm²'},
        {k: 'Ra', g: 'Passive', label: 'Axial resistance R_a', min: 30, max: 400, step: 5, base: 150, f: v => v + ' Ω·cm'},
        {k: 'Cm', g: 'Passive', label: 'Capacitance C_m', min: 0.5, max: 2, step: 0.05, base: 1, f: v => n2(v) + ' µF/cm²'},
        {k: 'celsius', g: 'Temperature', label: 'Temperature', min: 6.3, max: 37, step: 0.1, base: 6.3, f: v => n2(v) + ' °C'},
        {k: 'geom', g: 'Geometry', label: 'Reading the reconstruction', type: 'choice', options: [['hippsim', 'hippsim (dendrites from the soma centre)'], ['neuron', 'as NEURON does (Import3d)']], base: 'hippsim', f: v => v === 'neuron' ? 'as NEURON' : 'hippsim',
          ex: 'hippsim starts each soma-attached dendrite at the soma centre and keeps every point in the file. NEURON drops points that repeat their parent and starts a dendrite at its first point. Choose NEURON to line up with NEURON scripts (see Validation).'},
        {k: 'wSyn', g: 'Branch tools', label: 'Synapse strength (tapped synapses)', min: 0.2, max: 10, step: 0.1, base: 2, f: v => n2(v) + ' nS'}],
      presets: [
        {id: 'ttx', label: 'TTX: block Na⁺', set: {na: 0}, title: 'Tetrodotoxin blocks voltage-gated Na⁺ channels (Narahashi et al. 1964)'},
        {id: 'nrn', label: 'NEURON geometry', set: {geom: 'neuron'}, title: 'Read the reconstruction as NEURON does: drop repeated points, start dendrites at their first point (Validation page)'},
        {id: 'tea', label: 'TEA: block K⁺ 90 %', set: {k: 0.1}, title: 'Tetraethylammonium blocks delayed-rectifier K⁺ channels; 90 % block (Armstrong 1971)'},
        {id: 'pas', label: 'Passive dendrites', set: {dend: 0}, title: 'Model choice: no voltage-gated channels in dendrites'},
        {id: 'act', label: 'Active dendrites', set: {dend: 20}, title: 'Model choice: dendrites at 20 % of somatic density'},
        {id: 'cable', label: 'Passive cable', set: {na: 0, k: 0}, title: 'All voltage-gated channels off'},
        {id: 'warm', label: 'Warm (22 °C)', set: {celsius: 22}, title: 'HH rates × Q10 3 per 10 °C (Hodgkin & Huxley 1952)'}],
      base: p => [
        ['Na⁺, K⁺', `${n2(0.5 * p.na)}, ${n2(0.1 * p.k)} S/cm² in soma and axon; ${p.dend} % of that in dendrites`, p.na !== 1 || p.k !== 1 || p.dend !== 2],
        ['Passive', `R<sub>m</sub> ${n2(p.Rm / 1000)} kΩ·cm², R<sub>a</sub> ${p.Ra} Ω·cm, C<sub>m</sub> ${n2(p.Cm)} µF/cm², rest −65 mV`, p.Rm !== 20000 || p.Ra !== 150 || p.Cm !== 1],
        ['Temperature', `${n2(p.celsius)} °C`, p.celsius !== 6.3],
        ['Geometry', p.geom === 'neuron' ? 'read as NEURON does: repeated points dropped, dendrites start at their first point' : 'hippsim: every point kept, soma-attached dendrites start at the soma centre', p.geom === 'neuron'],
        ['Source', '<span title="Hodgkin AL, Huxley AF (1952) J Physiol 117:500–544">Hodgkin &amp; Huxley 1952</span>']]
    },
    migliore: {
      scale: 'cell', name: 'Migliore-derived CA1 channel model', tag: 'Migliore-derived', engine: 'ngc', maxL: 20, dt: 0.025, sims: ['hippsim'], original: 'NEURON (ModelDB 55035)', tests: CELL_TESTS, tools: TOOLS_ALL,
      desc: 'CA1 pyramidal-cell channel parameterization (Migliore et al. 2005): Na⁺, K_dr, A-type K⁺ and Iₕ rising with distance, 35 °C. The Neuron lab’s model. On other cell types it is a CA1-derived what-if.',
      params: [
        {k: 'na', g: 'Channels', label: 'Na⁺ (na3 / nax)', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'kdr', g: 'Channels', label: 'K⁺ delayed rectifier (kdr)', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'ka', g: 'Channels', label: 'A-type K⁺ (kap / kad)', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'h', g: 'Channels', label: 'Iₕ (hd)', min: 0, max: 3, step: 0.05, base: 1, f: v => '×' + n2(v)},
        tog('soma', 'Where channels are', 'Soma', true), tog('basal', 'Where channels are', 'Basal dendrites', true), tog('apical', 'Where channels are', 'Apical dendrites', true), tog('axon', 'Where channels are', 'Axon', true),
        tog('gka', 'Gradients', 'A-type rises with distance (1 + d/100 µm)', true), tog('gh', 'Gradients', 'Iₕ rises with distance (1 + 3d/100 µm)', true),
        {k: 'Rm', g: 'Passive', label: 'Membrane resistance R_m', min: 5000, max: 100000, step: 1000, base: 28000, f: v => n2(v / 1000) + ' kΩ·cm²'},
        {k: 'Ra', g: 'Passive', label: 'Axial resistance R_a', min: 30, max: 400, step: 5, base: 150, f: v => v + ' Ω·cm'},
        {k: 'Cm', g: 'Passive', label: 'Capacitance C_m', min: 0.5, max: 2, step: 0.05, base: 1, f: v => n2(v) + ' µF/cm²'},
        {k: 'Vrest', g: 'Passive', label: 'Resting potential', min: -80, max: -55, step: 0.5, base: -65, f: v => n2(v) + ' mV'},
        tog('spines', 'Passive', 'Spine area correction (× 2 beyond 100 µm)', false),
        {k: 'celsius', g: 'Temperature', label: 'Temperature', min: 20, max: 40, step: 0.5, base: 35, f: v => n2(v) + ' °C'},
        {k: 'wSyn', g: 'Branch tools', label: 'Synapse strength (tapped synapses)', min: 0.2, max: 10, step: 0.1, base: 2, f: v => n2(v) + ' nS'}],
      presets: [
        {id: 'ttx', label: 'TTX', set: {na: 0}, title: 'Blocks Na⁺ channels (Narahashi et al. 1964)'},
        {id: 'tea', label: 'TEA: K_dr 90 %', set: {kdr: 0.1}, title: 'Blocks delayed-rectifier K⁺ channels (Armstrong 1971)'},
        {id: 'ap4', label: '4-AP: block A-type', set: {ka: 0}, title: '4-aminopyridine blocks A-type K⁺ channels (Hoffman et al. 1997)'},
        {id: 'zd', label: 'ZD7288: block Iₕ', set: {h: 0}, title: 'ZD7288 blocks HCN channels (Magee 1998)'},
        {id: 'abeta', label: 'Aβ-like: A-type × 0.5', set: {ka: 0.5}, title: 'Aβ reduces dendritic A-type K⁺ current (Chen 2005, Neurobiol Dis 18:671)'},
        {id: 'hh', label: 'Na⁺ + K_dr only', set: {ka: 0, h: 0}, title: 'Remove A-type and Iₕ'},
        {id: 'pdend', label: 'Passive dendrites', set: {basal: false, apical: false}, title: 'Active soma and axon only'},
        {id: 'flat', label: 'Uniform densities', set: {gka: false, gh: false}, title: 'No distance gradients'},
        {id: 'cable', label: 'Passive cable', set: {na: 0, kdr: 0, ka: 0, h: 0}, title: 'All voltage-gated channels off'},
        {id: 'cool', label: '25 °C', set: {celsius: 25}, title: 'Room temperature (slice recordings)'}],
      bio: p => ({Rm: p.Rm, Ra: p.Ra, Cm: p.Cm, Vrest: p.Vrest, celsius: p.celsius, scale: {na: p.na, kdr: p.kdr, ka: p.ka, h: p.h}, on: {na: p.na > 0, kdr: p.kdr > 0, ka: p.ka > 0, h: p.h > 0},
        regions: {soma: p.soma, basal: p.basal, apical: p.apical, axon: p.axon}, gradients: {ka: p.gka, h: p.gh}}),
      base: p => [
        ['Channels', `Na⁺ ${n2(25 * p.na)} mS/cm² (axon ×5) · K_dr ${n2(10 * p.kdr)} · A-type ${n2(30 * p.ka)}${p.gka ? ' × (1 + d/100)' : ''} · Iₕ ${n2(0.05 * p.h)}${p.gh ? ' × (1 + 3d/100)' : ''}`,
          p.na !== 1 || p.kdr !== 1 || p.ka !== 1 || p.h !== 1 || !p.gka || !p.gh],
        ['Where', ['soma', 'basal', 'apical', 'axon'].filter(k => p[k]).join(', ') || 'nowhere (passive)', !(p.soma && p.basal && p.apical && p.axon)],
        ['Passive', `R<sub>m</sub> ${n2(p.Rm / 1000)} kΩ·cm², R<sub>a</sub> ${p.Ra} Ω·cm (axon 50), C<sub>m</sub> ${n2(p.Cm)} µF/cm², rest ${n2(p.Vrest)} mV${p.spines ? ', spines ×2' : ''}, ${n2(p.celsius)} °C`,
          p.Rm !== 28000 || p.Ra !== 150 || p.Cm !== 1 || p.Vrest !== -65 || p.spines || p.celsius !== 35],
        ['Source', '<span title="Migliore M, Ferrante M, Ascoli GA (2005) J Neurophysiol 94:4145–4155">Migliore, Ferrante &amp; Ascoli 2005</span>, ModelDB 55035']]
    },
    research: {
      scale: 'cell', name: 'Your research model', tag: 'Research', engine: 'ngc', maxL: 25, dt: 0.05, sims: ['hippsim'], tests: ['thetagamma', 'step', 'fi', 'sag', 'zap', 'bap'], tools: TOOLS_ALL,
      desc: 'Lab model: Golomb 2006 I_M and I_NaP at soma and axon on the Migliore-derived CA1 dendrites; single spikes vs bursts under θ + γ drive.',
      when: c => /CA1/.test(c.region) && /Pyramidal|principal/.test(c.group),
      params: [
        {k: 'gM', g: 'Channels', label: 'I_M (soma, axon; Golomb kinetics)', min: 0, max: 5, step: 0.05, base: 1, f: v => n2(v) + ' mS/cm²'},
        {k: 'gNaP', g: 'Channels', label: 'I_NaP (soma, axon)', min: 0, max: 0.6, step: 0.01, base: 0.2, f: v => n2(v) + ' mS/cm²'},
        {k: 'thp', g: 'Channels', label: 'I_NaP half-activation θ_p', min: -55, max: -35, step: 0.5, base: -47, f: v => n2(v) + ' mV'},
        {k: 'naS', g: 'Channels', label: 'Na⁺ density', min: 0.3, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'kaS', g: 'Channels', label: 'A-type K⁺ density', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'hS', g: 'Channels', label: 'Iₕ density (Migliore gradient)', min: 0, max: 3, step: 0.05, base: 1, f: v => '×' + n2(v)},
        tog('gh', 'Gradients', 'Iₕ rises with distance (Magee 1998)', true),
        {k: 'celsius', g: 'Temperature', label: 'Temperature', min: 20, max: 40, step: 0.5, base: 35, f: v => n2(v) + ' °C'},
        {k: 'wSyn', g: 'Branch tools', label: 'Synapse strength (tapped synapses)', min: 0.2, max: 10, step: 0.1, base: 2, f: v => n2(v) + ' nS'}],
      presets: [
        {id: 'nom', label: 'XE991: no I_M', set: {gM: 0}, title: 'XE991 blocks Kv7 / M channels (Yue & Yaari 2004)'},
        {id: 'nonap', label: 'No I_NaP', set: {gNaP: 0}, title: 'Remove the persistent Na⁺ current (riluzole-like)'},
        {id: 'noh', label: 'ZD7288: no Iₕ', set: {hS: 0}, title: 'Blocks HCN channels'},
        {id: 'abeta', label: 'Aβ-like: A-type × 0.5', set: {kaS: 0.5}, title: 'Aβ reduces dendritic A-type K⁺ current (Chen 2005)'},
        {id: 'mig', label: 'Migliore 2005 only', set: {gM: 0, gNaP: 0}, title: 'Remove the Golomb currents'}],
      bio: p => ({gM: p.gM * 1e-3, gNaP: p.gNaP * 1e-3, thp: p.thp, celsius: p.celsius, scale: {na: p.naS, kdr: 1, ka: p.kaS, h: p.hS}, gradients: {h: p.gh, ka: true}, on: {h: p.hS > 0, ka: p.kaS > 0}}),
      base: p => [
        ['Soma, axon', `I_M ${n2(p.gM)} mS/cm², I_NaP ${n2(p.gNaP)} mS/cm² (θ<sub>p</sub> ${n2(p.thp)} mV)`, p.gM !== 1 || p.gNaP !== 0.2 || p.thp !== -47],
        ['Dendrites', `Migliore 2005 Na⁺ ×${n2(p.naS)}, K_dr, A-type ×${n2(p.kaS)}, Iₕ ×${n2(p.hS)}${p.gh ? ' with distance gradient' : ', uniform'}`, p.naS !== 1 || p.kaS !== 1 || p.hS !== 1 || !p.gh],
        ['Temperature', `${n2(p.celsius)} °C`, p.celsius !== 35],
        ['Sources', '<span title="Golomb D, Yue C, Yaari Y (2006) J Neurophysiol 96:1912–1926">Golomb, Yue &amp; Yaari 2006</span>; Migliore et al. 2005; lab model (Rebecca)']]
    }
  };

  /* ---------- circuit: this reconstruction receiving excitatory input with feedforward inhibition ---------- */
  function poissonTheta(r, rate, depth, phase, T) {          // inhomogeneous Poisson by thinning; rate in Hz, θ = 8 Hz
    const out = [], rmax = rate * (1 + depth); if (rmax <= 0) return out; let t = 0;
    while (true) { t += -Math.log(1 - r()) / rmax * 1000; if (t >= T) break;
      if (r() < (1 + depth * Math.sin(2 * Math.PI * 8e-3 * t + phase)) / (1 + depth)) out.push(t); }
    return out;
  }
  EXPERIMENTS.circuit = {
    name: 'θ-modulated input', short: 'Excitation + inhibition, 1 s', desc: 'Poisson spike trains onto the dendrites (excitation) and near the soma (inhibition, half a θ cycle later), 1 s.',
    params: [], base: () => [],
    async run(E, ctx, progress) {
      const p = ctx.p, r = rng(12345), d = ctx.dist, apical = [], dend = [], peri = [-1];
      ctx.P.forEach((q, i) => { if ((q[4] === 3 || q[4] === 4) && d[i] >= 50 && d[i] <= 350) { dend.push(i); if (q[4] === 4) apical.push(i); } if ((q[4] === 3 || q[4] === 4) && d[i] < 50) peri.push(i); });
      const tE = apical.length > 5 ? apical : dend.length ? dend : [-1], syn = [];
      for (let j = 0; j < p.nE; j++) { const pt = tE[Math.floor(r() * tE.length)], tr = poissonTheta(r, p.rE, p.depth, 0, 1000);
        if (p.wE > 0) syn.push({pt, type: 'ampa', w: p.wE, times: tr}); if (p.wE * p.nmda > 0) syn.push({pt, type: 'nmda', w: p.wE * p.nmda, times: tr}); }
      for (let j = 0; j < p.nI; j++) { const pt = peri[Math.floor(r() * peri.length)], tr = poissonTheta(r, p.rI, p.depth, Math.PI, 1000); if (p.wI > 0) syn.push({pt, type: 'gaba', w: p.wI, times: tr}); }
      const raw = await E.run({tstop: 1000, dt: 0.05, syn, rec: recList(ctx)}, progress);
      const sp = crossings(raw.t, raw.vSoma, 100);
      let html = '<b>No spikes.</b> The inputs do not bring this cell to threshold.', rd = [['Spikes (0.1–1 s)', 0]];
      if (sp.length) { const ph = sp.map(t => ((t * 8e-3) % 1) * 360), cx = ph.reduce((a, x) => a + Math.cos(x * Math.PI / 180), 0) / ph.length, sy = ph.reduce((a, x) => a + Math.sin(x * Math.PI / 180), 0) / ph.length;
        const mean = ((Math.atan2(sy, cx) * 180 / Math.PI) - 90 + 360) % 360, lock = Math.hypot(cx, sy);
        rd = [['Spikes (0.1–1 s)', sp.length], ['Rate', n2(sp.length / 0.9) + ' Hz'], ['θ phase (after excitation peak)', Math.round(mean) + '°'], ['Phase locking', n2(lock) + ' (0–1)']];
        html = `<b>${sp.length} spikes</b> in 0.9 s (${n2(sp.length / 0.9)} Hz) · ${Math.round(mean)}° after the excitation peak · locking ${n2(lock)}`; }
      return {...raw, plot: 'v', tstop: 1000, stim: [0, 1000], series: vSeries(raw, ctx), readout: rd, key: sp.length, summary: html};
    }
  };
  MODELS.circuit = {
    scale: 'circuit', name: 'Excitatory input + feedforward inhibition', tag: 'Circuit', engine: 'ngc', maxL: 25, dt: 0.05, sims: ['hippsim'], tests: ['circuit'], tools: ['probe', 'ttx', 'noka', 'noh', 'passive', 'cut'],
    desc: 'This cell with Migliore 2005 channels, driven by θ-modulated excitatory synapses on its dendrites and inhibitory synapses near the soma (as CA3 → CA1 with basket cells).',
    params: [
      {k: 'nE', g: 'Excitation', label: 'Excitatory inputs', min: 0, max: 400, step: 10, base: 200, f: v => v + ''},
      {k: 'rE', g: 'Excitation', label: 'Excitatory rate', min: 0, max: 30, step: 0.5, base: 5, f: v => n2(v) + ' Hz'},
      {k: 'wE', g: 'Excitation', label: 'AMPA per synapse', min: 0, max: 3, step: 0.05, base: 1, f: v => n2(v) + ' nS'},
      {k: 'nmda', g: 'Excitation', label: 'NMDA / AMPA', min: 0, max: 2, step: 0.05, base: 0.8, f: v => n2(v)},
      {k: 'nI', g: 'Inhibition', label: 'Inhibitory inputs', min: 0, max: 100, step: 5, base: 30, f: v => v + ''},
      {k: 'rI', g: 'Inhibition', label: 'Inhibitory rate', min: 0, max: 60, step: 1, base: 15, f: v => n2(v) + ' Hz'},
      {k: 'wI', g: 'Inhibition', label: 'GABA-A per synapse', min: 0, max: 5, step: 0.1, base: 1.5, f: v => n2(v) + ' nS'},
      {k: 'depth', g: 'Rhythm', label: 'θ modulation', min: 0, max: 1, step: 0.05, base: 0.5, f: v => Math.round(v * 100) + ' %'},
      {k: 'ka', g: 'Cell', label: 'A-type K⁺', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
      {k: 'h', g: 'Cell', label: 'Iₕ', min: 0, max: 3, step: 0.05, base: 1, f: v => '×' + n2(v)}],
    presets: [
      {id: 'bic', label: 'Bicuculline: block GABA-A', set: {wI: 0}, title: 'Bicuculline blocks GABA-A receptors (Curtis et al. 1970)'},
      {id: 'apv', label: 'APV: block NMDA', set: {nmda: 0}, title: 'D-APV blocks NMDA receptors (Davies & Watkins 1982)'},
      {id: 'nbqx', label: 'NBQX: block AMPA', set: {wE: 0}, title: 'NBQX blocks AMPA receptors (Sheardown et al. 1990)'},
      {id: 'flat', label: 'No θ', set: {depth: 0}, title: 'Inputs at a constant rate'},
      {id: 'abeta', label: 'Aβ-like: A-type × 0.5', set: {ka: 0.5}, title: 'Aβ reduces dendritic A-type K⁺ current (Chen 2005)'}],
    bio: p => ({scale: {na: 1, kdr: 1, ka: p.ka, h: p.h}, on: {ka: p.ka > 0, h: p.h > 0}}),
    base: p => [
      ['Excitation', `${p.nE} synapses on dendrites 50–350 µm from the soma (apical if traced), ${n2(p.rE)} Hz Poisson each, AMPA ${n2(p.wE)} nS + NMDA ${n2(p.wE * p.nmda)} nS`, p.nE !== 200 || p.rE !== 5 || p.wE !== 1 || p.nmda !== 0.8],
      ['Inhibition', `${p.nI} GABA-A synapses within 50 µm of the soma, ${n2(p.rI)} Hz each, ${n2(p.wI)} nS, E<sub>GABA</sub> −75 mV`, p.nI !== 30 || p.rI !== 15 || p.wI !== 1.5],
      ['Rhythm', `θ 8 Hz, ${Math.round(p.depth * 100)} % rate modulation; inhibition half a cycle after excitation`, p.depth !== 0.5],
      ['Cell', `Migliore 2005 channels, A-type ×${n2(p.ka)}, Iₕ ×${n2(p.h)}, 35 °C`, p.ka !== 1 || p.h !== 1],
      ['Sources', 'Synaptic kinetics and NMDA Mg²⁺ block <span title="Jahr CE, Stevens CF (1990) J Neurosci 10:3178">Jahr &amp; Stevens 1990</span>; input numbers and rates are model choices']]
  };

  /* ---------- population: Brunel (2000) sparse E–I network of integrate-and-fire neurons ---------- */
  EXPERIMENTS.network = {
    name: 'Network activity', short: 'Raster and population rate', desc: '0.5 s of activity: raster of 200 neurons and the population rate.', params: [], base: () => [],
    async run(E, ctx, progress) {
      const p = ctx.p, NE = 4000, NI = 1000, N = NE + NI, eps = 0.1, CE = Math.round(eps * NE), dt = 0.1, T = 500, tau = 20, th = 20, Vr = 10, ref = 2;
      const r = rng(2000), cache = ctx.cache;
      if (!cache.net) { const tg = new Array(N); for (let i = 0; i < N; i++) { const a = []; for (let j = 0; j < N; j++) if (r() < eps) a.push(j); tg[i] = Int32Array.from(a); } cache.net = tg; await tick(); }
      const tg = cache.net, V = new Float64Array(N), refr = new Float64Array(N), dl = Math.max(1, Math.round(p.D / dt)), ring = Array.from({length: dl + 1}, () => new Float64Array(N));
      for (let i = 0; i < N; i++) V[i] = Vr + r() * (th - Vr);
      const nuThr = th / (p.J * CE * tau) * 1000, lam = CE * p.nu * nuThr * dt * 1e-3, steps = Math.round(T / dt), decay = Math.exp(-dt / tau);
      const pois = () => { let k = 0; const L = Math.exp(-lam); let q = 1; do { k++; q *= r(); } while (q > L); return k - 1; };
      const raster = [], rate = [], show = 200; let cnt = 0;
      for (let s = 0; s < steps; s++) {
        const t = s * dt, inb = ring[s % (dl + 1)];
        for (let i = 0; i < N; i++) {
          if (refr[i] > 0) { refr[i] -= dt; inb[i] = 0; continue; }
          V[i] = V[i] * decay + inb[i] + p.J * pois(); inb[i] = 0;
          if (V[i] > th) { V[i] = Vr; refr[i] = ref; cnt++; if (i < show * 0.8 || (i >= NE && i < NE + show * 0.2)) raster.push([t, i < NE ? i : i - NE + show * 0.8]);
            const w = i < NE ? p.J : -p.g * p.J, out = ring[(s + dl) % (dl + 1)], T2 = tg[i]; for (let k = 0; k < T2.length; k++) out[T2[k]] += w; }
        }
        if ((s + 1) % 10 === 0) { rate.push([t, cnt / N / 1e-3]); cnt = 0; }
        if (s % 500 === 499) { if (progress) progress(s / steps); await tick(); }
      }
      const rs = rate.filter(x => x[0] >= 100).map(x => x[1]), m = rs.reduce((a, b) => a + b, 0) / rs.length, sd = Math.sqrt(rs.reduce((a, b) => a + (b - m) * (b - m), 0) / rs.length);
      const by = {}; raster.forEach(([t, i]) => { if (t >= 100) (by[i] = by[i] || []).push(t); });
      const cvs = Object.values(by).filter(a => a.length > 3).map(a => { const d = a.slice(1).map((t, k) => t - a[k]), mu = d.reduce((x, y) => x + y, 0) / d.length; return Math.sqrt(d.reduce((x, y) => x + (y - mu) * (y - mu), 0) / d.length) / mu; });
      const cv = cvs.length ? cvs.reduce((a, b) => a + b, 0) / cvs.length : NaN;
      return {plot: 'pop', raster, rate, tstop: T, show, key: +n2(m),
        readout: [['Mean rate', n2(m) + ' Hz'], ['ISI CV', isNaN(cv) ? '–' : n2(cv) + ' (≈ 1 irregular, ≈ 0 regular)'], ['Synchrony', n2(sd / Math.max(m, 1e-9)) + ' (std / mean of the population rate)']],
        summary: `Mean rate <b>${n2(m)} Hz</b> · ISI CV ${isNaN(cv) ? '–' : n2(cv)} · synchrony ${n2(sd / Math.max(m, 1e-9))}`};
    }
  };
  MODELS.population = {
    scale: 'population', name: 'Brunel 2000 E–I network', tag: 'Population', engine: null, sims: ['hippsim'], original: 'Brian2 (script, 10 000 neurons)', tests: ['network'], tools: [], pop: true,
    desc: '5 000 leaky integrate-and-fire neurons (80 % excitatory), 10 % random connections, external Poisson drive. Point neurons: the reconstruction is not used.',
    params: [
      {k: 'g', g: 'Synapses', label: 'Inhibition / excitation (g)', min: 2, max: 8, step: 0.1, base: 5, f: v => n2(v)},
      {k: 'J', g: 'Synapses', label: 'Synaptic weight J', min: 0.05, max: 0.5, step: 0.01, base: 0.2, f: v => n2(v) + ' mV'},
      {k: 'D', g: 'Synapses', label: 'Delay', min: 0.5, max: 5, step: 0.1, base: 1.5, f: v => n2(v) + ' ms'},
      {k: 'nu', g: 'Drive', label: 'External drive (ν_ext / ν_thr)', min: 0.5, max: 4, step: 0.05, base: 2, f: v => n2(v)}],
    presets: [
      {id: 'sr', label: 'SR (g 3, ν 2)', set: {g: 3, nu: 2}, title: 'Synchronous regular (Brunel 2000, Fig. 8A)'},
      {id: 'sif', label: 'SI fast (g 6, ν 4)', set: {g: 6, nu: 4}, title: 'Synchronous irregular, fast oscillation (Fig. 8B)'},
      {id: 'ai', label: 'AI (g 5, ν 2)', set: {g: 5, nu: 2}, title: 'Asynchronous irregular (Fig. 8C)'},
      {id: 'sis', label: 'SI slow (g 4.5, ν 0.9)', set: {g: 4.5, nu: 0.9}, title: 'Synchronous irregular, slow oscillation (Fig. 8D)'}],
    base: p => [
      ['Network', '4 000 excitatory + 1 000 inhibitory LIF neurons, connection probability 0.1'],
      ['Neurons', 'τ 20 ms, threshold 20 mV, reset 10 mV, refractory 2 ms'],
      ['Synapses', `J ${n2(p.J)} mV (inhibitory −g·J, g ${n2(p.g)}), delay ${n2(p.D)} ms`, p.J !== 0.2 || p.g !== 5 || p.D !== 1.5],
      ['Drive', `external Poisson input at ν_ext = ${n2(p.nu)} × ν_thr`, p.nu !== 2],
      ['Source', '<span title="Brunel N (2000) J Comput Neurosci 8:183–208">Brunel 2000</span> (scaled to 5 000 neurons, C_E·J kept at 80 mV; regime boundaries shift with network size)']]
  };


  /* ---------- model cards: where every part of a simulation comes from (no invented provenance: unknown = unspecified) ---------- */
  const U = 'unspecified';
  const isCA1pyr = c => /CA1/.test(c.region) && /Pyramidal|principal/.test(c.group);
  const CARDS = {
    hh: c => ({
      short: 'Hodgkin–Huxley 1952', meta: 'Na⁺ · K⁺ · leak · 6.3 °C', channels: [['Na⁺ (fast, m³h)', 'Hodgkin & Huxley 1952 squid-axon kinetics', 'Hodgkin AL, Huxley AF (1952) J Physiol 117:500–544', 'na'],
        ['K⁺ delayed rectifier (n⁴)', 'Hodgkin & Huxley 1952 squid-axon kinetics', 'Hodgkin AL, Huxley AF (1952) J Physiol 117:500–544', 'k'],
        ['Leak', 'linear, E_L −65 mV', U, 'leak']],
      passive: [['R_m', '20 kΩ·cm²', 'hippsim default (also used for the passive NEURON check); no published source: ' + U],
        ['R_a', '150 Ω·cm', 'hippsim default; ' + U], ['C_m', '1 µF/cm²', 'conventional value; ' + U],
        ['E_Na, E_K', '50, −77 mV', 'NEURON hh.mod defaults'], ['E_L', '−65 mV', 'hippsim choice (sets rest near −65 mV)']],
      dist: {cols: ['g_Na (S/cm²)', 'g_K (S/cm²)'], rows: [['Soma', '0.5', '0.1'], ['AIS', 'not modelled separately (= axon)', ''], ['Axon', '0.5', '0.1'],
        ['Basal dendrites', '0.01 (2 %)', '0.002 (2 %)'], ['Apical trunk', '0.01 (2 %)', '0.002 (2 %)'], ['Obliques', '0.01 (2 %)', '0.002 (2 %)'], ['Tuft', '0.01 (2 %)', '0.002 (2 %)']],
        source: 'hippsim choice so that typical reconstructions fire repetitively; not taken from a publication'},
      assumptions: [['Temperature', '6.3 °C (rates × 3^((T − 6.3)/10))'], ['Time step', '0.025 ms, backward Euler (voltage), exponential Euler (gates)'],
        ['Discretization', 'compartments ≤ 20 µm along unbranched paths; soma = one compartment with the area of a sphere of the largest traced soma radius'],
        ['Soma–dendrite junction', 'each attached branch starts at the soma centre and every point in the file is kept (default); Geometry → “as NEURON does” drops repeated points and starts branches at their first point, matching NEURON (see Validation)'],
        ['Initial state', 'V −65 mV, gates at steady state'], ['Missing', 'no Iₕ, A-type, Ca²⁺ or other channels; uniform densities']],
      adapted: ['Densities and the 2 % dendritic fraction are hippsim choices, applied identically to every cell type.', `Applied to a ${c.name} (${c.species}) morphology.`],
      validated: ['Same model in NEURON 9 and Brian2 for every cell (spike counts, Validation page).', 'Not fitted to or validated against recordings from this cell type.']
    }),
    migliore: c => ({
      short: 'Migliore 2005 · CA1', meta: 'Na⁺ · K_dr · A-type · Iₕ · 35 °C', channels: [['na3: Na⁺ with slow inactivation (soma, dendrites)', 'Migliore et al. 2005 (ModelDB 55035)', 'Migliore M, Ferrante M, Ascoli GA (2005) J Neurophysiol 94:4145–4155', 'na'],
        ['nax: axonal Na⁺', 'Migliore et al. 2005 (ModelDB 55035)', 'as above', 'na'], ['kdr: K⁺ delayed rectifier', 'Migliore et al. 2005 (ModelDB 55035)', 'as above', 'kdr'],
        ['kap / kad: A-type K⁺ (proximal / distal)', 'Migliore et al. 2005 (ModelDB 55035)', 'as above', 'ka'], ['hd: Iₕ (HCN)', 'Migliore et al. 2005 (ModelDB 55035)', 'as above', 'h'],
        ['Original sources of each mechanism', 'cited in Migliore et al. 2005', 'not listed in hippsim: ' + U]],
      passive: [['R_m', '28 kΩ·cm²', 'NGC implementation, labelled Migliore et al. 2005; not re-checked against the ModelDB 55035 files'],
        ['R_a', '150 Ω·cm (axon 50)', 'NGC implementation, as above'], ['C_m', '1 µF/cm²', 'NGC implementation, as above'],
        ['Rest', '−65 mV (leak reversal set per compartment so −65 mV is a steady state)', 'NGC implementation'], ['E_Na, E_K, E_h', '55, −90, −30 mV', 'NGC implementation']],
      dist: {cols: ['Na⁺', 'K_dr', 'A-type', 'Iₕ'], rows: [['Soma', 'na3 25 mS/cm²', '10', 'kap 30', '0.05'], ['AIS', 'not modelled separately (= axon)', '', '', ''],
        ['Axon', 'nax 125 (×5)', '10', 'kap 30', 'none'], ['Basal dendrites', 'na3 25', '10', '30 × (1 + d/100 µm); kap ≤ 100 µm, kad beyond', '0.05 × (1 + 3d/100 µm)'],
        ['Apical trunk', 'na3 25', '10', 'as basal', 'as basal; V½ −81 mV beyond 100 µm (−73 proximal)'], ['Obliques', 'na3 25', '10', 'as basal', 'as trunk'], ['Tuft', 'na3 25', '10', 'as basal', 'as trunk']],
        source: 'as implemented in NGC (Little Neural Guide), d = path distance from the soma. Whether the original model applies the gradients to basal dendrites: ' + U + '. If no axon is traced, a 200 µm axon stub is added.'},
      assumptions: [['Temperature', '35 °C; Q10 Na 2, A-type 5, Iₕ 4.5 (NGC)'], ['Time step', '0.025 ms (0.05 ms for long tests), backward Euler + exponential Euler'],
        ['Discretization', 'compartments ≤ 20 µm per section; soma diameter from its traced radius (min 8 µm)'], ['Initial state', 'V −65 mV, gates at steady state']],
      adapted: isCA1pyr(c) ? ['Parameter set written for CA1 pyramidal cells; this is a CA1 pyramidal cell.', 'Distances are path distances on this reconstruction.']
        : [`CA1-derived parameterization applied to a ${c.name} morphology. Not an experimentally validated ${c.region} channel model.`, 'Distances are path distances on this reconstruction.'],
      validated: ['NGC runs the same code as the Neuron lab, whose results were compared with the NEURON model on the four Migliore 2018 / Jarsky / Golding cells (Neuron lab validation table).',
        isCA1pyr(c) ? 'Not validated on this particular reconstruction.' : `Not validated for ${c.region} cells.`]
    }),
    research: c => ({
      short: 'Golomb 2006 + Migliore 2005', meta: 'I_M · I_NaP · CA1 dendrites · 35 °C', channels: [['I_M (Kv7, Golomb kinetics), soma + axon', 'Golomb, Yue & Yaari 2006', 'Golomb D, Yue C, Yaari Y (2006) J Neurophysiol 96:1912–1926', 'gM'],
        ['I_NaP, soma + axon', 'Golomb, Yue & Yaari 2006', 'as above', 'gNaP'], ['Dendrites: na3, kdr, kap/kad, hd', 'Migliore et al. 2005 (via NGC)', 'Migliore M, Ferrante M, Ascoli GA (2005) J Neurophysiol 94:4145–4155']],
      passive: [['R_m, R_a, C_m, rest', 'as the Migliore-derived model', 'NGC implementation']],
      dist: {cols: ['I_M', 'I_NaP', 'Dendritic channels'], rows: [['Soma', '1 mS/cm²', '0.2 mS/cm² (θ_p −47 mV)', 'Migliore-derived'], ['AIS', 'not modelled separately (= axon)', '', ''], ['Axon', '1 mS/cm²', '0.2 mS/cm²', 'Migliore-derived'],
        ['Basal / trunk / obliques / tuft', 'none', 'none', 'Migliore-derived, Iₕ gradient (Magee 1998)']], source: 'lab model (Rebecca)'},
      assumptions: [['Temperature', '35 °C'], ['Time step', '0.05 ms'], ['Discretization', 'compartments ≤ 25 µm']],
      adapted: ['Combination of Golomb 2006 somatic currents with Migliore-derived dendrites is a lab model.', isCA1pyr(c) ? 'CA1 pyramidal morphology.' : 'Applied to a non-CA1 morphology.'],
      validated: ['Not validated against recordings in hippsim.']
    }),
    circuit: c => ({
      short: 'Migliore 2005 cell + synapses', meta: 'AMPA · NMDA · GABA-A · θ input', channels: [['Cell', 'Migliore-derived CA1 channel model', 'Migliore et al. 2005'], ['AMPA, NMDA (Mg²⁺ block), GABA-A', 'double-exponential conductances', 'NMDA block: Jahr CE, Stevens CF (1990) J Neurosci 10:3178; kinetics: NGC library']],
      passive: [['As the Migliore-derived model', '', 'NGC implementation']], dist: null,
      assumptions: [['Inputs', 'Poisson spike trains, θ-modulated (8 Hz)'], ['Placement', 'excitation 50–350 µm, inhibition < 50 µm, random with a fixed seed'], ['Time step', '0.05 ms']],
      adapted: ['Input numbers, rates and weights are model choices, not taken from a publication.'], validated: ['Not validated.']
    }),
    population: c => ({
      short: 'Brunel 2000', meta: '4 000 E + 1 000 I · LIF', channels: [['Leaky integrate-and-fire', 'Brunel 2000', 'Brunel N (2000) J Comput Neurosci 8:183–208']], passive: [['τ, threshold, reset, refractory', '20 ms, 20 mV, 10 mV, 2 ms', 'Brunel 2000']], dist: null,
      assumptions: [['Network', '4 000 E + 1 000 I, p = 0.1, scaled from Brunel’s 12 500 with C_E·J kept'], ['Time step', '0.1 ms']],
      adapted: ['Scaled-down network; the reconstruction is not used.'], validated: ['Not validated in hippsim.']
    })
  };
  /* hover explanations */
  const EX = {
    na: 'Voltage-gated Na⁺ channels: open fast on depolarization and carry the rising phase of the action potential.',
    k: 'Delayed-rectifier K⁺ channels: open slowly and repolarize the spike.', kdr: 'Delayed-rectifier K⁺ channels: open slowly and repolarize the spike.',
    ka: 'A-type K⁺ channels: fast transient K⁺ current, denser in distal dendrites; damps back-propagating spikes and dendritic excitability.',
    kaS: 'A-type K⁺ channels: fast transient K⁺ current, denser in distal dendrites; damps back-propagating spikes and dendritic excitability.',
    h: 'Iₕ (HCN channels): opens on hyperpolarization, sets resting conductance, produces sag, rebound and θ-range resonance.', hS: 'Iₕ (HCN channels): opens on hyperpolarization, sets resting conductance, produces sag, rebound and θ-range resonance.',
    naS: 'Na⁺ channel density relative to the published value.', gM: 'M-current (Kv7/KCNQ): slow K⁺ current active near threshold; limits repetitive firing and bursting. Blocked by XE991.',
    leak: 'Leak: voltage-independent conductance that sets the resting potential and input resistance with R_m.',
    gNaP: 'Persistent Na⁺ current: non-inactivating, boosts depolarization near threshold and promotes bursting.', thp: 'Voltage of half-activation of the persistent Na⁺ current.',
    dend: 'Channel density in dendrites as a percentage of the soma density.', Rm: 'Specific membrane resistance: higher = less leaky membrane, longer time constant, larger input resistance.',
    Ra: 'Axial (cytoplasmic) resistivity: higher = signals attenuate more along dendrites.', Cm: 'Specific membrane capacitance; spines effectively increase it.',
    Vrest: 'Resting membrane potential imposed by the leak reversal.', celsius: 'Temperature: channel kinetics speed up with temperature (Q10).',
    spines: 'Doubles membrane area beyond 100 µm to account for spines.', soma: 'Voltage-gated channels in the soma on/off.', basal: 'Voltage-gated channels in the basal dendrites on/off.',
    apical: 'Voltage-gated channels in the apical dendrites on/off.', axon: 'Voltage-gated channels in the axon on/off.', gka: 'A-type density rises with distance from the soma.', gh: 'Iₕ density rises with distance from the soma.'
  };
  Object.entries(MODELS).forEach(([id, m]) => { m.card = CARDS[id]; m.params.forEach(q => { if (!q.ex && EX[q.k]) q.ex = EX[q.k]; }); });
  Object.values(MODELS).forEach(m => { if (!m.when) m.when = () => true; });
  const TOOLS = {electrode: ['Electrode', 'current injection site'], probe: ['Probe', 'record voltage here'], syn: ['Synapse', 'AMPA + NMDA, fires at 10 ms'],
    ttx: ['Local TTX', 'Na⁺ off on this branch'], noka: ['Block A-type', 'on this branch'], noh: ['Block Iₕ', 'on this branch'], passive: ['Make passive', 'all channels off on this branch'], cut: ['Cut', 'remove this branch']};

  /** run one test: model + test + parameter values + branch marks → result */
  async function runTest(P, cache, modelId, testId, p, marks, progress) {
    const m = MODELS[modelId], X = EXPERIMENTS[testId], dist = cache.dist || (cache.dist = pathDist(P));
    const E = m.engine ? ENGINES[m.engine].make(P, cache, p, marks, m) : null;
    const R = await X.run(E, {p, marks, P, dist, cache}, progress);
    if (E) R.nodeOf = E.nodeOf;
    return R;
  }
  root.HSModels = {MODELS, EXPERIMENTS, TOOLS, ENGINES, runTest, toSections, pathDist, isCA1pyr, EX};
})(window);
