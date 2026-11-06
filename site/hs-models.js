/* hs-models.js: the single-cell models the Neurons viewer can run on any reconstruction, all in the browser.
   Each model: what it is, its baseline (values + sources), the manipulations it offers, and run() → a result the
   viewer plots (trace) and paints on the 3D cell (voltage per point).
     hh        Hodgkin–Huxley on the reconstruction       engine: site/hs-cable.js (same model as the NEURON / Brian2 scripts)
     migliore  Migliore et al. 2005 CA1 channels           engine: NGC (site/hs-ngc.js, from the lab's Little Neural Guide)
     research  Rebecca's research model (Golomb 2006 I_M + I_NaP at soma/axon, Migliore 2005 dendrites, θ + γ drive)
   Points are the viewer's SWC points: [x, y, z, r, type, parentIndex], soma-centred, parents first.
   Result: {t, vSoma, vSite, frames: Float32Array per frameDt ms, frameDt, nodeOf: point → frame index, siteIdx,
            spikes (soma crossing 0 mV, ms), tstop, win: [t0, t1] counting window, stim: [t0, t1] shaded on the trace} */
(function (root) {
  'use strict';
  const tick = () => new Promise(r => setTimeout(r, 0));
  const crossings = (t, v) => { const s = []; for (let k = 1; k < v.length; k++) if (v[k - 1] < 0 && v[k] >= 0) s.push(t[k]); return s; };

  /* ---------- SWC points → the NGC section format, with a point → compartment map ---------- */
  function toSections(P) {
    const n = P.length, kids = Array.from({length: n}, () => []);
    P.forEach((p, i) => { if (p[5] >= 0) kids[p[5]].push(i); });
    const isSoma = i => P[i][4] === 1;
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
    const hasAxon = sections.some(s => s[0] === 2);
    return {soma, sections, members, secOf, hasAxon};
  }
  function ngcCell(P, maxL, cache) {
    const key = 'ngc' + maxL; if (cache[key]) return cache[key];
    const T = toSections(P), secs = T.sections.slice();
    if (!T.hasAxon) secs.push([2, -1, [0, 0, 0, 0, -200, 0], [0.5, 0.5]]);         // 200 µm axon stub, as in the Neuron lab
    const comp = NGC.buildCell({soma: T.soma, sections: secs}, {maxL});
    // point → compartment, replaying buildCell's split of each section into ceil(length / maxL) compartments
    const nodeOf = new Int32Array(P.length).fill(0); let first = 1;
    T.sections.forEach((s, si) => {
      const pts = T.members[si], xyz = [];
      if (s[1] >= 0) { const q = secs[s[1]][2], m = q.length; xyz.push([q[m - 3], q[m - 2], q[m - 1]]); }
      pts.forEach(k => xyz.push([P[k][0], P[k][1], P[k][2]]));
      const cum = [0]; for (let k = 1; k < xyz.length; k++) cum.push(cum[k - 1] + Math.hypot(xyz[k][0] - xyz[k - 1][0], xyz[k][1] - xyz[k - 1][1], xyz[k][2] - xyz[k - 1][2]));
      const tot = xyz.length < 2 ? 0.05 : cum[cum.length - 1], nc = Math.max(1, Math.ceil(tot / maxL)), Lc = tot / nc, off = s[1] >= 0 ? 1 : 0;
      pts.forEach((k, j) => { nodeOf[k] = first + Math.min(nc - 1, Math.floor((cum[j + off] || 0) / Math.max(Lc, 1e-9))); });
      first += nc;
    });
    return (cache[key] = {comp, nodeOf});
  }
  async function ngcRun(P, cache, bio, o, progress) {
    const {comp, nodeOf} = ngcCell(P, o.maxL, cache), sim = NGC.makeSim(comp, bio); if (o.setup) o.setup(sim); sim.init();
    const site = o.sitePt >= 0 ? nodeOf[o.sitePt] : 0, dt = o.dt, steps = Math.round(o.tstop / dt), rec = Math.max(1, Math.round(0.1 / dt)), every = Math.round(1 / dt);
    const t = [], vSoma = [], vSite = [], frames = [];
    const ext = (dg, rhs, V, tt) => { rhs[site] += o.I(tt); };
    for (let s = 0; s <= steps; s++) {
      if (s % rec === 0) { t.push(sim.t); vSoma.push(sim.st.V[0]); vSite.push(sim.st.V[site]); }
      if (s % every === 0) frames.push(Float32Array.from(sim.st.V));
      if (s < steps) sim.step(dt, ext);
      if (s % 2000 === 1999) { if (progress) progress(s / steps); await tick(); }
    }
    return {t, vSoma, vSite, frames, frameDt: every * dt, nodeOf, siteIdx: site, spikes: crossings(t, vSoma), tstop: o.tstop, ncomp: comp.n};
  }

  const STEP = {tstop: 400, win: [50, 350], stim: [50, 350]};
  const stepI = p => tt => (tt >= 50 && tt < 350 ? p.amp : 0);
  const n2 = x => (+x).toFixed(2).replace(/\.?0+$/, '');
  const stepSummary = (R, w) => {
    const sp = R.spikes.filter(x => x >= w[0] && x < w[1]), isi = sp.length > 1 ? (sp[sp.length - 1] - sp[0]) / (sp.length - 1) : 0;
    if (sp.length) return {n: sp.length, html: `<b>${sp.length} spike${sp.length > 1 ? 's' : ''}</b> · first ${n2(sp[0] - w[0])} ms after the step${isi ? ` · ${Math.round(1000 / isi)} Hz` : ''}`};
    const k0 = R.t.findIndex(x => x >= w[0] - 1), k1 = R.t.findIndex(x => x >= w[1] - 1);
    return {n: 0, html: `<b>No spikes during the step.</b> Soma ${n2(R.vSoma[k0])} mV before it, ${n2(R.vSoma[k1])} mV at its end.`};
  };

  const MODELS = {
    hh: {
      scale: 'cell', name: 'Hodgkin–Huxley', tag: 'HH', desc: 'Classic Na⁺ and K⁺ channels on the reconstruction. Simple, fast, and the same model runs in NEURON and Brian2.',
      sims: ['hippsim', 'NEURON', 'Brian2'], electrode: true, ...STEP,
      params: [
        {k: 'amp', label: 'Current', unit: 'nA', min: 0, max: 3, step: 0.05, base: 0.5, f: v => n2(v) + ' nA'},
        {k: 'na', label: 'Na⁺ (soma, axon)', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'k', label: 'K⁺ (soma, axon)', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'dend', label: 'Dendrite channels', min: 0, max: 20, step: 1, base: 2, f: v => v + ' %'}],
      presets: [
        {id: 'ttx', label: 'TTX: block Na⁺', set: {na: 0}, title: 'Tetrodotoxin blocks voltage-gated Na⁺ channels (Narahashi et al. 1964)'},
        {id: 'tea', label: 'TEA: block K⁺ 90 %', set: {k: 0.1}, title: 'Tetraethylammonium blocks delayed-rectifier K⁺ channels; 90 % block (Armstrong 1971)'},
        {id: 'pas', label: 'Passive dendrites', set: {dend: 0}, title: 'Model choice: no voltage-gated channels in dendrites'},
        {id: 'act', label: 'Active dendrites', set: {dend: 20}, title: 'Model choice: dendrites at 20 % of somatic density'}],
      base: p => [
        ['Stimulus', `${n2(p.amp)} nA step, 300 ms`, p.amp !== 0.5],
        ['Na⁺, K⁺', `${n2(0.5 * p.na)}, ${n2(0.1 * p.k)} S/cm² in soma and axon; ${p.dend} % of that in dendrites`, p.na !== 1 || p.k !== 1 || p.dend !== 2],
        ['Passive', 'R<sub>m</sub> 20 kΩ·cm², R<sub>a</sub> 150 Ω·cm, C<sub>m</sub> 1 µF/cm², rest −65 mV, 6.3 °C'],
        ['Source', '<span title="Hodgkin AL, Huxley AF (1952) J Physiol 117:500–544">Hodgkin &amp; Huxley 1952</span>']],
      async run(P, cache, p, sitePt) {
        const M = cache.hh || (cache.hh = HSCable.build(P)), site = sitePt >= 0 ? M.nodeOf[sitePt] : 0;
        const R = M.run({amp: p.amp, na: p.na, k: p.k, dend: p.dend / 100, site});
        return Object.assign(R, {nodeOf: M.nodeOf, siteIdx: site, tstop: 400, ncomp: M.N});
      },
      summary: R => stepSummary(R, STEP.win)
    },
    migliore: {
      scale: 'cell', name: 'Migliore 2005 CA1 channels', tag: 'Migliore', desc: 'Na⁺, K_dr, A-type K⁺ rising with distance and Iₕ rising with distance, at 35 °C. The Neuron lab’s model.',
      sims: ['hippsim'], original: 'NEURON (ModelDB 55035)', electrode: true, ...STEP,
      params: [
        {k: 'amp', label: 'Current', unit: 'nA', min: 0, max: 3, step: 0.05, base: 0.5, f: v => n2(v) + ' nA'},
        {k: 'na', label: 'Na⁺', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'kdr', label: 'K⁺ delayed rectifier', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'ka', label: 'A-type K⁺', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'h', label: 'Iₕ (HCN)', min: 0, max: 3, step: 0.05, base: 1, f: v => '×' + n2(v)}],
      presets: [
        {id: 'ttx', label: 'TTX', set: {na: 0}, title: 'Blocks Na⁺ channels (Narahashi et al. 1964)'},
        {id: 'tea', label: 'TEA: K_dr 90 %', set: {kdr: 0.1}, title: 'Blocks delayed-rectifier K⁺ channels (Armstrong 1971)'},
        {id: 'ap4', label: '4-AP: block A-type', set: {ka: 0}, title: '4-aminopyridine blocks A-type K⁺ channels (Hoffman et al. 1997)'},
        {id: 'zd', label: 'ZD7288: block Iₕ', set: {h: 0}, title: 'ZD7288 blocks HCN channels (Magee 1998)'}],
      base: p => [
        ['Stimulus', `${n2(p.amp)} nA step, 300 ms`, p.amp !== 0.5],
        ['Channels', `Na⁺ ${n2(25 * p.na)} mS/cm² (axon ×5) · K_dr ${n2(10 * p.kdr)} · A-type ${n2(30 * p.ka)} × (1 + d/100 µm) · Iₕ ${n2(0.05 * p.h)} × (1 + 3d/100 µm)`, p.na !== 1 || p.kdr !== 1 || p.ka !== 1 || p.h !== 1],
        ['Passive', 'R<sub>m</sub> 28 kΩ·cm², R<sub>a</sub> 150 Ω·cm (axon 50), C<sub>m</sub> 1 µF/cm², rest −65 mV, 35 °C'],
        ['Source', '<span title="Migliore M, Ferrante M, Ascoli GA (2005) J Neurophysiol 94:4145–4155">Migliore, Ferrante &amp; Ascoli 2005</span>, ModelDB 55035']],
      run(P, cache, p, sitePt, progress) {
        const bio = {scale: {na: p.na, kdr: p.kdr, ka: p.ka, h: p.h}, on: {na: p.na > 0, kdr: p.kdr > 0, ka: p.ka > 0, h: p.h > 0}};
        return ngcRun(P, cache, bio, {maxL: 20, dt: 0.025, tstop: 400, sitePt, I: stepI(p)}, progress);
      },
      summary: R => stepSummary(R, STEP.win)
    },
    research: {
      scale: 'cell', name: 'Your research model', tag: 'Research', desc: 'Golomb 2006 I_M and I_NaP at soma and axon on the Migliore 2005 dendrites, driven by θ + γ current: single spikes vs bursts.',
      sims: ['hippsim'], electrode: false, tstop: 1000, win: [100, 1000], stim: [0, 1000],
      when: c => /CA1/.test(c.region) && /Pyramidal|principal/.test(c.group),
      params: [
        {k: 'Iapp', label: 'DC current', min: -0.4, max: 1.2, step: 0.01, base: 0.3, f: v => n2(v) + ' nA'},
        {k: 'Ath', label: 'θ amplitude (8 Hz)', min: 0, max: 1, step: 0.01, base: 0.2, f: v => n2(v) + ' nA'},
        {k: 'Aga', label: 'γ amplitude (40 Hz)', min: 0, max: 1, step: 0.01, base: 0.15, f: v => n2(v) + ' nA'},
        {k: 'gM', label: 'I_M (soma, axon)', min: 0, max: 5, step: 0.05, base: 1, f: v => n2(v) + ' mS/cm²'},
        {k: 'gNaP', label: 'I_NaP (soma, axon)', min: 0, max: 0.6, step: 0.01, base: 0.2, f: v => n2(v) + ' mS/cm²'},
        {k: 'hS', label: 'Iₕ', min: 0, max: 3, step: 0.05, base: 1, f: v => '×' + n2(v)},
        {k: 'kaS', label: 'A-type K⁺', min: 0, max: 2, step: 0.05, base: 1, f: v => '×' + n2(v)}],
      presets: [
        {id: 'nom', label: 'XE991: no I_M', set: {gM: 0}, title: 'XE991 blocks Kv7 / M channels (Yue & Yaari 2004)'},
        {id: 'noh', label: 'ZD7288: no Iₕ', set: {hS: 0}, title: 'Blocks HCN channels'},
        {id: 'mig', label: 'Migliore 2005 only', set: {gM: 0, gNaP: 0}, title: 'Remove the Golomb currents'}],
      base: p => [
        ['Input', `DC ${n2(p.Iapp)} nA + θ ${n2(p.Ath)} nA at 8 Hz + γ ${n2(p.Aga)} nA at 40 Hz, at the soma, 1 s`, p.Iapp !== 0.3 || p.Ath !== 0.2 || p.Aga !== 0.15],
        ['Soma, axon', `I_M ${n2(p.gM)} mS/cm², I_NaP ${n2(p.gNaP)} mS/cm² (θ<sub>p</sub> −47 mV)`, p.gM !== 1 || p.gNaP !== 0.2],
        ['Dendrites', `Migliore 2005 Na⁺, K_dr, A-type ×${n2(p.kaS)}, Iₕ ×${n2(p.hS)} with distance gradients`, p.kaS !== 1 || p.hS !== 1],
        ['Sources', '<span title="Golomb D, Yue C, Yaari Y (2006) J Neurophysiol 96:1912–1926">Golomb, Yue &amp; Yaari 2006</span>; Migliore et al. 2005; lab model (Rebecca)']],
      run(P, cache, p, sitePt, progress) {
        const bio = {gM: p.gM * 1e-3, gNaP: p.gNaP * 1e-3, thp: -47, scale: {na: 1, kdr: 1, ka: p.kaS, h: p.hS}, gradients: {h: true, ka: true}, on: {h: p.hS > 0, ka: p.kaS > 0}};
        const I = tt => p.Iapp + p.Ath * Math.sin(2 * Math.PI * 8e-3 * tt) + p.Aga * Math.sin(2 * Math.PI * 40e-3 * tt);
        return ngcRun(P, cache, bio, {maxL: 25, dt: 0.05, tstop: 1000, sitePt: -1, I}, progress);
      },
      summary(R) {
        const sp = R.spikes.filter(x => x >= 100), ev = []; sp.forEach((x, i) => (i && x - sp[i - 1] < 14) ? ev[ev.length - 1].push(x) : ev.push([x]));
        const single = ev.filter(e => e.length === 1).length, burst = ev.filter(e => e.length > 1).length;
        return {n: sp.length, html: sp.length ? `<b>${sp.length} spikes</b> in 0.9 s · ${single} single · ${burst} burst${burst === 1 ? '' : 's'} (ISI &lt; 14 ms)` : '<b>No spikes.</b>'};
      }
    }
  };

  /* ---------- circuit: this reconstruction receiving excitatory input with feedforward inhibition ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function poissonTheta(r, rate, depth, phase, T) {          // inhomogeneous Poisson by thinning; rate in Hz, θ = 8 Hz
    const out = [], rmax = rate * (1 + depth); if (rmax <= 0) return out; let t = 0;
    while (true) { t += -Math.log(1 - r()) / rmax * 1000; if (t >= T) break;
      if (r() < (1 + depth * Math.sin(2 * Math.PI * 8e-3 * t + phase)) / (1 + depth)) out.push(t); }
    return out;
  }
  MODELS.circuit = {
    scale: 'circuit', name: 'Excitatory input + feedforward inhibition', tag: 'Circuit', sims: ['hippsim'], electrode: false, tstop: 1000, win: [100, 1000], stim: [0, 1000],
    desc: 'This cell with Migliore 2005 channels, driven by θ-modulated excitatory synapses on its dendrites and inhibitory synapses near the soma (as CA3 → CA1 with basket cells).',
    when: c => true,
    params: [
      {k: 'nE', label: 'Excitatory inputs', min: 0, max: 400, step: 10, base: 200, f: v => v + ''},
      {k: 'rE', label: 'Excitatory rate', min: 0, max: 30, step: 0.5, base: 5, f: v => n2(v) + ' Hz'},
      {k: 'wE', label: 'AMPA per synapse', min: 0, max: 3, step: 0.05, base: 1, f: v => n2(v) + ' nS'},
      {k: 'nmda', label: 'NMDA / AMPA', min: 0, max: 2, step: 0.05, base: 0.8, f: v => n2(v)},
      {k: 'nI', label: 'Inhibitory inputs', min: 0, max: 100, step: 5, base: 30, f: v => v + ''},
      {k: 'rI', label: 'Inhibitory rate', min: 0, max: 60, step: 1, base: 15, f: v => n2(v) + ' Hz'},
      {k: 'wI', label: 'GABA-A per synapse', min: 0, max: 5, step: 0.1, base: 1.5, f: v => n2(v) + ' nS'},
      {k: 'depth', label: 'θ modulation', min: 0, max: 1, step: 0.05, base: 0.5, f: v => Math.round(v * 100) + ' %'}],
    presets: [
      {id: 'bic', label: 'Bicuculline: block GABA-A', set: {wI: 0}, title: 'Bicuculline blocks GABA-A receptors (Curtis et al. 1970)'},
      {id: 'apv', label: 'APV: block NMDA', set: {nmda: 0}, title: 'D-APV blocks NMDA receptors (Davies & Watkins 1982)'},
      {id: 'nbqx', label: 'NBQX: block AMPA', set: {wE: 0}, title: 'NBQX blocks AMPA receptors (Sheardown et al. 1990)'},
      {id: 'flat', label: 'No θ', set: {depth: 0}, title: 'Inputs at a constant rate'}],
    base: p => [
      ['Excitation', `${p.nE} synapses on dendrites 50–350 µm from the soma (apical if traced), ${n2(p.rE)} Hz Poisson each, AMPA ${n2(p.wE)} nS + NMDA ${n2(p.wE * p.nmda)} nS`, p.nE !== 200 || p.rE !== 5 || p.wE !== 1 || p.nmda !== 0.8],
      ['Inhibition', `${p.nI} GABA-A synapses within 50 µm of the soma, ${n2(p.rI)} Hz each, ${n2(p.wI)} nS, E<sub>GABA</sub> −75 mV`, p.nI !== 30 || p.rI !== 15 || p.wI !== 1.5],
      ['Rhythm', `θ 8 Hz, ${Math.round(p.depth * 100)} % rate modulation; inhibition half a cycle after excitation`, p.depth !== 0.5],
      ['Cell', 'Migliore 2005 channels (as the single-cell model), 35 °C'],
      ['Sources', 'Synaptic kinetics and NMDA Mg²⁺ block <span title="Jahr CE, Stevens CF (1990) J Neurosci 10:3178">Jahr &amp; Stevens 1990</span>; input numbers and rates are model choices']],
    run(P, cache, p, sitePt, progress) {
      const {comp} = ngcCell(P, 25, cache), r = rng(12345), apical = [], dend = [], peri = [0];
      for (let i = 1; i < comp.n; i++) { const k = comp.kind[i], d = comp.dist[i];
        if ((k === 3 || k === 4) && d >= 50 && d <= 350) { dend.push(i); if (k === 4) apical.push(i); }
        if ((k === 3 || k === 4) && d < 50) peri.push(i); }
      const targetsE = apical.length > 5 ? apical : dend.length ? dend : [0];
      const bio = {};
      return ngcRun(P, cache, bio, {maxL: 25, dt: 0.05, tstop: 1000, sitePt: -1, I: () => 0, setup(sim) {
        for (let j = 0; j < p.nE; j++) { const i = targetsE[Math.floor(r() * targetsE.length)], tr = poissonTheta(r, p.rE, p.depth, 0, 1000);
          if (p.wE > 0) { const a = NGC.addSyn(sim, i, 'ampa', p.wE); tr.forEach(t => a.fire(t)); }
          if (p.wE * p.nmda > 0) { const b = NGC.addSyn(sim, i, 'nmda', p.wE * p.nmda); tr.forEach(t => b.fire(t)); } }
        for (let j = 0; j < p.nI; j++) { const i = peri[Math.floor(r() * peri.length)], tr = poissonTheta(r, p.rI, p.depth, Math.PI, 1000);
          if (p.wI > 0) { const g = NGC.addSyn(sim, i, 'gaba', p.wI); tr.forEach(t => g.fire(t)); } }
      }}, progress);
    },
    summary(R) {
      const sp = R.spikes.filter(x => x >= 100);
      if (!sp.length) return {n: 0, html: '<b>No spikes.</b> The inputs do not bring this cell to threshold.'};
      const ph = sp.map(t => ((t * 8e-3) % 1) * 360), cx = ph.reduce((a, d) => a + Math.cos(d * Math.PI / 180), 0) / ph.length, sy = ph.reduce((a, d) => a + Math.sin(d * Math.PI / 180), 0) / ph.length;
      const mean = ((Math.atan2(sy, cx) * 180 / Math.PI) - 90 + 360) % 360, lock = Math.hypot(cx, sy);   // input rates peak at 90° of sin(2π·8 Hz·t)
      return {n: sp.length, html: `<b>${sp.length} spikes</b> in 0.9 s (${n2(sp.length / 0.9)} Hz) · ${Math.round(mean)}° after the excitation peak of each θ cycle · phase locking ${n2(lock)} (0–1)`};
    }
  };

  /* ---------- population: Brunel (2000) sparse E–I network of integrate-and-fire neurons ---------- */
  MODELS.population = {
    scale: 'population', name: 'Brunel 2000 E–I network', tag: 'Population', sims: ['hippsim'], original: 'Brian2 (script, 10 000 neurons)', electrode: false, tstop: 500, win: [100, 500], stim: [0, 500], pop: true,
    desc: '5 000 leaky integrate-and-fire neurons (80 % excitatory), 10 % random connections, external Poisson drive. Point neurons: the reconstruction is not used.',
    when: c => true,
    params: [
      {k: 'g', label: 'Inhibition / excitation (g)', min: 2, max: 8, step: 0.1, base: 5, f: v => n2(v)},
      {k: 'nu', label: 'External drive (ν_ext / ν_thr)', min: 0.5, max: 4, step: 0.05, base: 2, f: v => n2(v)},
      {k: 'J', label: 'Synaptic weight J', min: 0.05, max: 0.5, step: 0.01, base: 0.2, f: v => n2(v) + ' mV'},
      {k: 'D', label: 'Delay', min: 0.5, max: 5, step: 0.1, base: 1.5, f: v => n2(v) + ' ms'}],
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
      ['Source', '<span title="Brunel N (2000) J Comput Neurosci 8:183–208">Brunel 2000</span> (scaled to 5 000 neurons, C_E·J kept at 80 mV; regime boundaries shift with network size)']],
    async run(P, cache, p, sitePt, progress) {
      const NE = 4000, NI = 1000, N = NE + NI, eps = 0.1, CE = Math.round(eps * NE), dt = 0.1, T = 500, tau = 20, th = 20, Vr = 10, ref = 2;
      const r = rng(2000), key = 'net';
      if (!cache[key]) {                                         // targets of each neuron (fixed seed, built once)
        const tg = new Array(N); for (let i = 0; i < N; i++) { const a = []; for (let j = 0; j < N; j++) if (r() < eps) a.push(j); tg[i] = Int32Array.from(a); }
        cache[key] = tg; await tick();
      }
      const tg = cache[key], V = new Float64Array(N), refr = new Float64Array(N), dl = Math.max(1, Math.round(p.D / dt)), ring = Array.from({length: dl + 1}, () => new Float64Array(N));
      for (let i = 0; i < N; i++) V[i] = Vr + r() * (th - Vr);
      const nuThr = th / (p.J * CE * tau) * 1000, lam = CE * p.nu * nuThr * dt * 1e-3, steps = Math.round(T / dt), decay = Math.exp(-dt / tau);
      const pois = () => { let k = 0, L = Math.exp(-lam), q = 1; do { k++; q *= r(); } while (q > L); return k - 1; };
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
      return {pop: true, raster, rate, tstop: T, show, NE, NI};
    },
    summary(R) {
      const rs = R.rate.filter(x => x[0] >= 100).map(x => x[1]), m = rs.reduce((a, b) => a + b, 0) / rs.length, sd = Math.sqrt(rs.reduce((a, b) => a + (b - m) * (b - m), 0) / rs.length);
      const by = {}; R.raster.forEach(([t, i]) => { if (t >= 100) (by[i] = by[i] || []).push(t); });
      const cvs = Object.values(by).filter(a => a.length > 3).map(a => { const d = a.slice(1).map((t, k) => t - a[k]), mu = d.reduce((x, y) => x + y, 0) / d.length; return Math.sqrt(d.reduce((x, y) => x + (y - mu) * (y - mu), 0) / d.length) / mu; });
      const cv = cvs.length ? cvs.reduce((a, b) => a + b, 0) / cvs.length : NaN;
      return {n: m, html: `Mean rate <b>${n2(m)} Hz</b> · ISI CV ${isNaN(cv) ? '–' : n2(cv)} (≈ 1 irregular, ≈ 0 regular) · synchrony ${n2(sd / Math.max(m, 1e-9))} (std / mean of the population rate)`};
    }
  };
  Object.values(MODELS).forEach(m => { if (!m.when) m.when = () => true; });
  root.HSModels = {MODELS, toSections};
})(window);
