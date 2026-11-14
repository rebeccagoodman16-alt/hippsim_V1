/* tools/placefield_compare.js: the Place fields session (renderResearchPlace in sources/raw/little_neural_guide/modellab.js)
   run headless on every cell with the same deterministic behaviour (constant 25 cm/s, 1.5 s reward pause, plateau on lap 3
   at 110 cm, 8 laps), so the cells can be compared in one table. Same BTSP rule, inputs and burst criterion (ISI < 14 ms).
   Writes site/placefields-compare.json.   usage: node tools/placefield_compare.js            (all cells)
                                                   node tools/placefield_compare.js <cell> '<cfg json>' [laps] */
const fs = require('fs');
const L = fs.readFileSync(require('path').join(__dirname, '../sources/raw/little_neural_guide/modellab.js'), 'utf8').split('\n');
{ const raw = L.join('\n'), a = raw.indexOf('const IR_GATE ='), b = raw.indexOf('/* ---------- reduction: steady state'); require('vm').runInThisContext(raw.slice(a, b)); }
const CELLS = {
  lowet: [() => Object.assign({}, IR_LW, {Ibias: 5, Ibd: -0.2}), {site: 'dend', I0: 0, gain: 4.2, Ath: 0.3}, 'lowet'],
  adex: [() => Object.assign({}, IR_ADEX_FIT), {site: 'soma', I0: 0, gain: 3.2, Ath: 0.6}, 'adex'],
  hh: [() => Object.assign({}, IR_HH, IR_GATE.hybrid[1]), {site: 'soma', I0: -1.5, gain: 5.5, Ath: 0.3}, 'hh'],
  hhsoma: [() => Object.assign({}, IR_HH, IR_GATE.hybrid[1], {dend: 0}), {site: 'soma', I0: -1.5, gain: 5.5, Ath: 0.3}, 'hh'],
  golomb: [() => Object.assign({}, IR_HH, IR_GATE.code[1], {dend: 0, gL: 0.05, gNaP: 0.3, gKdr: 6.0, gKA: 1.4, gM: 1.0, gHCa: 0, gfKCa: 0, gsKCa: 0, EL: -70}), {site: 'soma', I0: 0, gain: 1.5, Ath: 0.3}, 'hh'] };
function session(key, cfgOver, laps = 8, opt = {}) {
  const PF = {L: 180, nIn: 60, sig: 9, tauB: 1300, tauA: 700, wmax: 1, w0: 0.05}, S = Object.assign({v0: 25, thetaOn: true, eta: 0.9, plAmp: 3.5, plDur: 300, auto: 3, plX: 110, fth: 8}, opt);
  const [mk, cfg0, model] = CELLS[key], cfg = Object.assign({}, cfg0, cfgOver), P = mk(), C = PF.nIn;
  const cen = Float64Array.from({length: C}, (_, j) => (j + 0.5) * PF.L / C);
  const phi = (j, x) => { let d = Math.abs(x - cen[j]); d = Math.min(d, PF.L - d); return Math.exp(-d * d / (2 * PF.sig * PF.sig)); };
  let phiSum = 0; for (let j = 0; j < C; j++) phiSum += phi(j, 0);
  const SS = {Iapp: cfg.I0, Ath: cfg.Ath, fth: S.fth, Aga: 0, fga: 40, site: cfg.site, D: 0, seed: 1}, M = irMake(model, P, SS);
  const w = new Float64Array(C).fill(PF.w0); let x = 5, lap = 1, t = 0, pause = 0, plOn = 0, nextPl = {lap: S.auto, x: S.plX}, firstPl = Infinity, k = 0;
  const hist = [], post = [], ev = [], occ = new Float64Array(PF.L / 5);
  const drive = () => { let s = 0; for (let j = 0; j < C; j++) s += w[j] * phi(j, x); return s / phiSum; };
  const dt = 0.5;
  while (lap <= laps) {
    let v; if (pause > 0) { pause -= dt; v = 0; } else v = S.v0;
    const xo = x; x += v * dt / 1000; if (x >= PF.L) { x -= PF.L; lap++; pause = 1500; }
    const moving = v > 2; if (moving) occ[Math.min(occ.length - 1, x / 5 | 0)] += dt / 1000;
    if (nextPl && lap >= nextPl.lap && xo < nextPl.x && x >= nextPl.x) {
      const tp = t; plOn = S.plDur; if (firstPl === Infinity) firstPl = tp;
      const raw = new Float64Array(C); hist.forEach(([th, xh]) => { if (tp - th > 4000) return; const kk = Math.exp(-(tp - th) / PF.tauB) * 10; for (let j = 0; j < C; j++) raw[j] += phi(j, xh) * kk; });
      post.push({tp, raw, until: tp + 3000}); nextPl = null; }
    const run = moving ? Math.min(1, v / 20) : 0.3, sp = drive(), pl = plOn > 0 ? S.plAmp : 0; plOn = Math.max(0, plOn - dt);
    if (key === 'lowet') { P.Ibd = -0.2 + cfg.gain * sp * (moving ? 1 : 0.5) + pl; SS.Iapp = 0; } else SS.Iapp = cfg.I0 + cfg.gain * sp * (moving ? 1 : 0.5) + pl;
    SS.Ath = S.thetaOn ? cfg.Ath * run : 0;
    const before = M.spikes.length; M.step(dt, null); t += dt;
    for (let q = before; q < M.spikes.length; q++) { const ts = M.spikes[q]; ev.push({t: ts, x, lap, moving, ph: (((2 * Math.PI * S.fth * 1e-3 * ts + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)}); }
    if (++k % 20 === 0) hist.push([t, x]); while (hist.length && hist[0][0] < t - 4200) hist.shift();
    for (const p of post) if (t <= p.until) { const kk = Math.exp(-(t - p.tp) / PF.tauA) * dt / 50; for (let j = 0; j < C; j++) p.raw[j] += phi(j, x) * kk; }
    for (let i = post.length - 1; i >= 0; i--) if (t >= post[i].until) { const p = post[i], mx = Math.max(...p.raw) || 1; for (let j = 0; j < C; j++) w[j] += S.eta * (PF.wmax - w[j]) * p.raw[j] / mx; post.splice(i, 1); }
  }
  // classify (ISI < 14 ms): ss single, bs burst onset, bm burst member
  ev.forEach((e, i) => { const p = ev[i - 1], n = ev[i + 1], inB = (p && e.t - p.t < 14) || (n && n.t - e.t < 14); e.kind = inB ? ((p && e.t - p.t < 14) ? 'bm' : 'bs') : 'ss'; });
  const pre = ev.filter(e => e.lap < S.auto && e.moving), postE = ev.filter(e => e.t > firstPl + 3000 && e.kind !== 'bm' && e.moving);
  const lapsPre = S.auto - 1, lapsPost = laps - S.auto, lapT = PF.L / S.v0;
  const inF = e => { let d = Math.abs(e.x - S.plX); d = Math.min(d, PF.L - d); return d < 30; };
  const field = postE.filter(inF), out = postE.filter(e => !inF(e));
  const nb = occ.length, mapOf = list => { const a = new Float64Array(nb); list.forEach(e => a[Math.min(nb - 1, e.x / 5 | 0)]++); return a; };
  const occPost = occ.map(o => o * lapsPost / laps), T = occPost.reduce((a, b) => a + b, 0);
  const info = a => { const mean = a.reduce((p, q) => p + q, 0) / T; if (!mean) return NaN; let I = 0; a.forEach((c, i) => { const r = occPost[i] > 0.05 ? c / occPost[i] : 0; if (r > 0) I += (occPost[i] / T) * (r / mean) * Math.log2(r / mean); }); return I; };
  const ss = postE.filter(e => e.kind === 'ss'), bs = postE.filter(e => e.kind === 'bs');
  const rel = e => { let d = e.x - S.plX; if (d > PF.L / 2) d -= PF.L; if (d < -PF.L / 2) d += PF.L; return d; };
  const com = list => { const f = list.filter(inF); return f.length ? +(f.reduce((a, e) => a + rel(e), 0) / f.length).toFixed(1) : null; };
  // phase precession: circular-linear fit of phase vs position inside the field (slope in deg/cm), events after the plateau
  const fe = field.map(e => [e.x - S.plX, e.ph]); let best = {r: 0, a: 0};
  for (let a = -20; a <= 20; a += 0.25) { const s = a * Math.PI / 180; let C1 = 0, S1 = 0; fe.forEach(([d, p]) => { C1 += Math.cos(p - s * d); S1 += Math.sin(p - s * d); }); const R = Math.hypot(C1, S1) / (fe.length || 1); if (R > best.r) best = {r: R, a}; }
  const pm = ev.filter(e => e.t > firstPl + 3000 && e.kind !== 'bm');
  const rate = (n, fracLap) => n / (lapsPost * lapT * fracLap);
  return {cell: key, cfg, eventsBeforePlateau: pre.length, ratePre: +(pre.length / (lapsPre * lapT)).toFixed(2),
    fieldRate_Hz: +rate(field.length, 60 / PF.L).toFixed(1), outRate_Hz: +rate(out.length, 120 / PF.L).toFixed(2),
    singles: ss.length, bursts: bs.length, burstFrac: +(bs.length / ((ss.length + bs.length) || 1)).toFixed(2),
    SI_single: +info(mapOf(ss)).toFixed(2), SI_burst: +info(mapOf(bs)).toFixed(2), precession_deg_per_cm: best.a, precessionR: +best.r.toFixed(2),
    comSingle_cm: com(ss), comBurst_cm: com(bs), spikesPerBurst: +((ev.filter(e => e.kind === 'bm').length + bs.length) / (bs.length || 1)).toFixed(1)};
}
module.exports = {session, CELLS};
if (require.main === module) {
  const [key, cfg, laps] = process.argv.slice(2);
  if (key) console.log(JSON.stringify(session(key, JSON.parse(cfg || '{}'), +(laps || 8))));
  else { const out = {protocol: 'speed 25 cm/s, 1.5 s pause at the reward, plateau on lap 3 at 110 cm (3.5 µA/cm², 300 ms), BTSP η 0.9, θ 8 Hz, 8 laps; field = within 30 cm of the plateau site; events after the BTSP window closed', cells: {}};
    for (const k of Object.keys(CELLS)) { out.cells[k] = session(k, {}, 8); console.error(k, JSON.stringify(out.cells[k])); }
    fs.writeFileSync(require('path').join(__dirname, '../site/placefields-compare.json'), JSON.stringify(out, null, 1)); } }
