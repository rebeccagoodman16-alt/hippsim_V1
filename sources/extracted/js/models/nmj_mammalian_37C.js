/* Extracted from Little Neural Guide modellab.js [1283311:1321785] — section: Neuromuscular junction model */
/* ===== Neuromuscular junction model (mammalian, 37 °C) for the mechanism figures =====
   Presynaptic AP (template) → Caᵥ2.1 gating m² (τ 0.25 ms) → Ca²⁺ influx ∝ P·(V − E_Ca)·Ca_o/(1 + Ca_o/K₁ + Mg_o/K₂) (Dodge & Rahamimoff 1967);
   the influx peaks during repolarisation (tail current) → active-zone [Ca²⁺] (nanodomain, ≈ 20–40 µM) + residual Ca²⁺ (τ 50 ms: facilitation)
   → release rate per docked vesicle k·Ca⁴/(Ca⁴ + K⁴) (cooperativity ≈ 4; Schneggenburger & Neher 2000) from a readily releasable pool of 400
   vesicles, refilled with τ ≈ 0.6 s, faster when residual Ca²⁺ is high (Dittman & Regehr 1998) → quanta (Poisson)
   → cleft ACh cleared by AChE (τ 0.25 ms; ×12 with neostigmine) → nAChR open fraction (open/close τ 0.15 / 1.1 ms) → end-plate current
   → end-plate potential (passive τ_m 3 ms) → muscle AP when the EPP depolarises the end plate by ≈ 14 mV.
   Calibrated: 70 quanta per impulse at 2 mM Ca²⁺, mEPP 0.9 mV, EPP (no AP) 37 mV → safety factor ≈ 2.7 (rodent 3–5, human ≈ 2; Wood & Slater 2001);
   EPC decay τ ≈ 1 ms; 3 Hz trains: quantal content falls ≈ 17 % and plateaus; 50 Hz: ≈ 55 % of the first response. */
const NMJ_DEF = { ca: 2, mg: 1, curare: 0, neo: false, botox: false, lems: false, mg_dis: false, train: 0, nAP: 1, tEnd: 20, apOn: true, seed: 3 };
function nmjRun(o0) {
  const o = { ...NMJ_DEF, ...o0 }, dt = o0.fast ? 0.01 : 0.005, rec = Math.max(0.02, o0.tEnd ? o0.tEnd / 4000 : 0.02), nRec = Math.round(rec / dt);
  let s = o.seed * 7919 + 13; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pois = lam => { if (lam < 30) { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; } let u = 0; while (!u) u = rnd(); return Math.max(0, Math.round(lam + Math.sqrt(lam) * Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * rnd()))); };
  const stims = o.train ? Array.from({ length: o.nAP }, (_, k) => 1 + k * 1000 / o.train) : [1];
  const dr = c => c / (1 + c / 3 + o.mg / 1.5), drive = dr(o.ca) / dr(2) * (o.lems ? 0.55 : 1);   // Lambert–Eaton: autoantibodies remove ≈ 35 % of Caᵥ2.1 channels
  const Kaz = 30, kRel = (o.kRel || 1.5) * (o.botox ? 0.02 : 1) * (o.kMul || 1), tauClr = o.neo ? 3 : 0.25, rFrac = (o.mg_dis ? 0.34 : 1) / (1 + o.curare / 0.3);
  const RRP0 = o.rrp0 || 400, TREF = o.tref || 600, KREF = o.kref ?? 0.0005; let Vp = -75, m = 0, caz = 0, cres = 0, rrp = RRP0, ach = 0, O = 0, Vm = -90, ref = 0, musAP = -1, nQ = 0, qPer = [], q0 = 0;
  const tr = { t: [], Vp: [], P: [], caz: [], rel: [], ach: [], O: [], epc: [], Vm: [], rrp: [] }, events = [], musSp = [];
  const win = o.fast ? 18 : Infinity; let skipTo = null;
  for (let st = 0, t = 0; t <= o.tEnd; st++, t = st * dt) {
    if (o.fast) { const last = stims.filter(ts => ts <= t + 1e-9).pop(), next = stims.find(ts => ts > t + 1e-9);
      if (last != null && t > last + win && next != null && t < next - 1) { const jump = next - 1 - t; rrp = RRP0 - (RRP0 - rrp) * Math.exp(-(jump / TREF + KREF * cres * 50 * (1 - Math.exp(-jump / 50)))); cres *= Math.exp(-jump / 50); ach = 0; O = 0; Vm = -90; ref = 0; st += Math.floor(jump / dt); continue; } }
    Vp = -75; for (const ts of stims) { const u = t - ts; if (u >= 0 && u < 3) Vp = Math.max(Vp, -75 + 110 * (u < 0.25 ? u / 0.25 : Math.exp(-(u - 0.25) / 0.35))); }
    const mInf = 1 / (1 + Math.exp(-(Vp + 20) / 7)); m += dt * (mInf - m) / 0.25; const P = m * m;
    const ICa = P * Math.max(0, 60 - Vp) / 135 * drive;                      // normalised Ca²⁺ influx; driving force grows as V repolarises (tail current)
    caz = 120 * ICa + cres; cres += dt * (40 * ICa - cres / 50);               // µM at the release site; residual Ca²⁺ for facilitation
    const lam = kRel * rrp * Math.pow(caz, 4) / (Math.pow(caz, 4) + Math.pow(Kaz, 4)) * dt;   // expected releases in this step
    let k = o.forceQ != null ? 0 : Math.min(Math.round(rrp), pois(lam)); if (o.forceQ != null && Math.abs(t - 2) < dt / 2) k = o.forceQ; if (k) { rrp -= k; nQ += k; for (let q = 0; q < k; q++) events.push(t + rnd() * dt); }
    rrp += dt * (RRP0 - rrp) * (1 / TREF + KREF * cres);                // refilling: slow at rest (τ ≈ 0.6 s), accelerated by residual Ca²⁺ during trains (Dittman & Regehr 1998)
    ach += k * 1 - dt * ach / tauClr;                                            // ACh in the cleft, in quanta-equivalents
    const Oinf = ach / (ach + 300); O += dt * (Oinf - O) / (Oinf > O ? 0.15 : 1.1);
    const gE = (o.G || 8) * (o.gMul || 1) * O * rFrac, epc = gE * (Vm - 0);                          // µS-scale end-plate conductance × driving force
    if (ref > 0) { ref -= dt; } else { Vm += dt * (-(Vm + 90) / 3 - epc * 1.0); if (o.apOn && Vm > -76) { musAP = t; musSp.push(t); ref = 3; } }
    let VmShow = Vm; if (musAP >= 0 && t - musAP < 3) { const u = t - musAP; VmShow = -76 + 106 * (u < 0.4 ? u / 0.4 : Math.exp(-(u - 0.4) / 0.6)); Vm = -90 + 35 * Math.exp(-u / 2); }
    if (st % nRec === 0) { tr.t.push(t); tr.Vp.push(Vp); tr.P.push(P); tr.caz.push(caz); tr.rel.push(lam / dt); tr.ach.push(ach); tr.O.push(O); tr.epc.push(-epc); tr.Vm.push(VmShow); tr.rrp.push(rrp); }
    if (stims.some(ts => Math.abs(t - ts) < dt / 2)) { qPer.push(nQ - q0); }
    q0 = stims.some(ts => Math.abs(t - ts) < dt / 2) ? nQ : q0;
  }
  // per-impulse quantal content: count events between stimuli
  const perAP = stims.map((ts, i) => events.filter(e => e >= ts && e < (stims[i + 1] ?? 1e9)).length);
  const eppPk = stims.map((ts, k) => { let m = -90; tr.t.forEach((tt, j) => { if (tt >= ts && tt < Math.min(ts + 15, stims[k + 1] ?? 1e9)) m = Math.max(m, tr.Vm[j]); }); return m; });
  const fired = stims.map((ts, k) => musSp.some(tt => tt >= ts && tt < (stims[k + 1] ?? 1e9)));
  return { tr, o, events, perAP, nQ, musSp, rec, stims, eppPk, fired, Vmin: Math.max(...tr.Vm) };
}
/** Repetitive nerve stimulation over a population of end plates (fibre-to-fibre variation in end-plate size and quantal content, ≈ 15 % each).
 *  Returns, per stimulus, the fraction of fibres that fire (∝ compound muscle action potential, CMAP), mean quanta and one example fibre. */
function nmjRNS(o, nFib = 24) {
  let s = 99; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296, g = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * rnd()); };
  const fibs = []; for (let k = 0; k < nFib; k++) fibs.push(nmjRun({ ...o, fast: true, seed: 11 + k * 7, gMul: Math.max(0.5, 1 + 0.15 * g()), kMul: Math.max(0.5, 1 + 0.15 * g()) }));
  const n = fibs[0].stims.length, frac = [...Array(n)].map((_, j) => fibs.filter(f => f.fired[j]).length / nFib), q = [...Array(n)].map((_, j) => fibs.reduce((a, f) => a + f.perAP[j], 0) / nFib);
  return { frac, q, ex: fibs[0], fibs, stims: fibs[0].stims };
}
// ============================================================================
// Mechanism atlas (/biology/mechanisms/): textbook-page figures that animate, loop and respond to "what if" toggles.
// Each figure: numbered steps (each mapped to a window of model time, played at a readable pace), a caption,
// play / pause / step / speed / loop, toggles that rerun the underlying model, and a live graph from the same model.
// The muscle figures share mxMuscle (mxmodel.js); other figures plug in their own run()/draw().
// ============================================================================
const MX_FIGS = [];
const mxReg = f => MX_FIGS.push(f);
const mxTrains = f => f <= 0 ? [5] : Array.from({ length: Math.max(1, Math.floor(330 * f / 1000)) }, (_, k) => 5 + k * 1000 / f);

/* ---------- shared drawing: one sarcomere ---------- */
// box = [x0, y0, w, h]; L sarcomere length (µm); A troponin activation; X attached fraction; Ca µM; t ms (for head animation)
function mxDrawSarc(x, box, L, A, X, Ca, t, o = {}) {
  const [bx, by, bw, bh] = box, s = bw / (o.span || 3.8), cx = bx + bw / 2, cy = by + bh / 2, gap = Math.min(44, bh * 0.17);
  const zL = cx - L / 2 * s, zR = cx + L / 2 * s, thin = 0.95 * s, thick = 1.6 * s, bare = 0.1 * s;
  // cytosolic Ca²⁺ (green dots, density ∝ [Ca²⁺])
  const nCa = Math.min(70, Math.round(Ca * 14)); x.fillStyle = '#2f9e5b';
  for (let k = 0; k < nCa; k++) { const h1 = Math.sin(k * 12.9898 + 78.233) * 43758.5453, h2 = Math.sin(k * 39.346 + 11.135) * 24634.6345; const px = bx + (h1 - Math.floor(h1)) * bw, py = by + (h2 - Math.floor(h2)) * bh; x.beginPath(); x.arc(px + Math.sin(t / 7 + k) * 2, py + Math.cos(t / 9 + k) * 2, 2.2, 0, 7); x.fill(); }
  // Z discs
  [zL, zR].forEach(z => { x.strokeStyle = '#141111'; x.lineWidth = 3; x.beginPath(); for (let k = 0; k <= 8; k++) { const yy = cy - gap * 1.9 + k * gap * 3.8 / 8; k ? x.lineTo(z + (k % 2 ? 4 : -4), yy) : x.moveTo(z, yy); } x.stroke(); });
  // titin (elastic spring) from Z to the thick filament end
  x.strokeStyle = '#b89a7c'; x.lineWidth = 1; [[zL, cx - thick / 2, 1], [zR, cx + thick / 2, -1]].forEach(([z, e]) => { x.beginPath(); const n = 10; for (let k = 0; k <= n; k++) { const xx = z + (e - z) * k / n; k ? x.lineTo(xx, cy + (k % 2 ? 4 : -4)) : x.moveTo(xx, cy); } x.stroke(); });
  // thick filament (myosin) with heads
  x.strokeStyle = '#7a3fa6'; x.lineWidth = 6; x.beginPath(); x.moveTo(cx - thick / 2, cy); x.lineTo(cx + thick / 2, cy); x.stroke();
  x.strokeStyle = '#141111'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx, cy - 10); x.lineTo(cx, cy + 10); x.stroke();   // M line
  // thin filaments (actin) from each Z, above and below
  const tipL = zL + thin, tipR = zR - thin;
  [cy - gap, cy + gap].forEach((yy, row) => [[zL, tipL], [zR, tipR]].forEach(([z, tip]) => {
    const n = Math.max(4, Math.round(Math.abs(tip - z) / 5.5)); for (let k = 0; k <= n; k++) { const xx = z + (tip - z) * k / n, ph = k * Math.PI / 13; [0, Math.PI].forEach((p0, q) => { const yo = 2.6 * Math.sin(ph + p0); x.fillStyle = q ? '#c9651c' : '#e98a3c'; x.beginPath(); x.arc(xx + (q ? 2.7 : 0), yy + yo, 2.6, 0, 7); x.fill(); });
      if (k % 7 === 3) { x.fillStyle = A > 0.3 ? '#2f9e5b' : '#5b3a1a'; x.fillRect(xx - 3, yy - 7, 6, 4); }   // troponin (green = Ca²⁺ bound)
      if (A > 0.25 && k % 2 === 0) { x.fillStyle = `rgba(255,214,0,${Math.min(1, A * 1.4)})`; x.beginPath(); x.arc(xx, yy + (row ? -4 : 4), 1.6, 0, 7); x.fill(); } }   // exposed myosin-binding sites
    x.strokeStyle = '#3b2a1a'; x.lineWidth = 1.6; const off = A * 3.5 * (row ? -1 : 1); x.beginPath(); x.moveTo(z, yy + off); x.lineTo(tip, yy + off); x.stroke();   // tropomyosin (slides off the sites when Ca²⁺ binds troponin)
  }));
  // myosin heads: attach only where thin filament overlaps; fraction attached = X; attached heads alternate pre/post power stroke
  const nH = 14, rate = o.atp === 0 ? 0 : 1;
  [-1, 1].forEach(side => { for (let k = 0; k < nH; k++) { const hx = cx + side * (bare + (thick / 2 - bare) * (k + 0.5) / nH);
    [-1, 1].forEach(up => { const tipX = side < 0 ? tipL : tipR, overl = side < 0 ? hx <= tipX + 1 && hx >= zL : hx >= tipX - 1 && hx <= zR, key = (Math.sin((k + 1) * (up + 3) * (side + 5) * 7.13) + 1) / 2;
      const att = overl && key < X * 1.15, ph = ((t * 0.02 * rate + key * 3) % 1), angle = att ? (o.atp === 0 ? 0.75 : (ph < 0.5 ? 1.5 : 0.75)) : 1.0;
      const dx = Math.cos(angle) * 14 * -side, dy = Math.sin(angle) * (gap - 6) * up; x.strokeStyle = att ? '#7a3fa6' : '#b89ac9'; x.lineWidth = 2; x.beginPath(); x.moveTo(hx, cy + up * 3); x.lineTo(hx + dx, cy + up * 3 + dy); x.stroke();
      x.fillStyle = att ? '#7a3fa6' : '#c9b2da'; x.beginPath(); x.ellipse(hx + dx, cy + up * 3 + dy, 4, 2.6, 0, 0, 7); x.fill(); }); } });
  // scale bar (0.5 µm) and titin label
  x.fillStyle = '#141111'; x.fillRect(bx + 6, by + 8, 0.5 * s, 2); x.font = '10px system-ui'; x.fillText('0.5 µm', bx + 6, by + 22); x.fillStyle = '#8a7058'; x.fillText('titin', (zL + cx - thick / 2) / 2 - 10, cy + 14);
  if (o.xsec !== false && bw > 420) { // cross-section where filaments overlap: hexagonal lattice, 6 thin around each thick, 2 thin : 1 thick
    const ix = bx + bw - 64, iy = by + 50, rr = 11; x.strokeStyle = '#c9b6a2'; x.strokeRect(ix - 52, iy - 30, 104, 64); x.fillStyle = '#6f4c27'; x.fillText('cross-section (overlap)', ix - 52, iy - 34);
    const pts = []; for (let a2 = -1; a2 <= 1; a2++) for (let b2 = -1; b2 <= 1; b2++) { const px = ix + (a2 + b2 * 0.5) * rr * 2.2, py = iy + b2 * rr * 1.9; if (Math.abs(px - ix) < 50 && Math.abs(py - iy) < 30) pts.push([px, py]); }
    pts.forEach(([px, py]) => { for (let k = 0; k < 6; k++) { const a3 = k * Math.PI / 3 + Math.PI / 6, qx = px + rr * 1.27 * Math.cos(a3), qy = py + rr * 1.27 * Math.sin(a3); if (Math.abs(qx - ix) < 50 && Math.abs(qy - iy) < 30) { x.fillStyle = '#e07b28'; x.beginPath(); x.arc(qx, qy, 2.2, 0, 7); x.fill(); } } });
    pts.forEach(([px, py]) => { x.fillStyle = '#7a3fa6'; x.beginPath(); x.arc(px, py, 4.2, 0, 7); x.fill(); }); }
  // band labels
  if (o.labels !== false) { const yb = cy + gap * 2.3, br = (a, b, lab, col) => { if (b - a < 4) return; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 1; x.beginPath(); x.moveTo(a, yb - 3); x.lineTo(a, yb); x.lineTo(b, yb); x.lineTo(b, yb - 3); x.stroke(); x.font = '11px system-ui'; const w = x.measureText(lab).width; x.fillText(lab, (a + b) / 2 - w / 2, yb + 13); };
    br(cx - thick / 2, cx + thick / 2, 'A band (constant)', '#7a3fa6'); const yb2 = yb + 26; x.save(); x.translate(0, 26); br(zL, cx - thick / 2, 'I', '#e07b28'); br(cx + thick / 2, zR, 'I', '#e07b28'); if (tipR > tipL) br(tipL, tipR, 'H', '#3d6a8c'); x.restore();
    x.fillStyle = '#141111'; x.font = '11px system-ui'; x.fillText('Z', zL - 4, cy - gap * 1.9 - 6); x.fillText('Z', zR - 4, cy - gap * 1.9 - 6); x.fillText('M', cx - 4, cy - 14); }
  return { zL, zR };
}

/* ---------- figure 1: sarcomere ---------- */
mxReg({
  id: 'sarcomere', group: 'Muscle', title: 'The sarcomere: sliding filaments and the cross-bridge cycle',
  sub: 'One twitch of a fast skeletal muscle fibre. Thin filaments (actin, orange) slide past thick filaments (myosin, purple); neither filament changes length.',
  steps: [[0, 5, 'Rest', 'Tropomyosin (dark strand) lies over the myosin-binding sites on actin. Myosin heads are already “cocked”: they hydrolysed ATP and hold ADP + Pi. Cytosolic [Ca²⁺] ≈ 0.05 µM. (Mouse fast-twitch fibre at 37 °C.)'],
    [5, 7, 'Ca²⁺ arrives', 'The muscle action potential triggers Ca²⁺ release from the sarcoplasmic reticulum (green dots). Ca²⁺ binds troponin C (blocks turn green).'],
    [7, 9.5, 'Binding sites exposed', 'Troponin pulls tropomyosin off the binding sites (yellow). Now heads can attach to actin.'],
    [9.5, 18, 'Cross-bridge cycling', 'Each head: attach → power stroke (Pi leaves, ~10 nm pull toward the M line) → ATP binds → detach → hydrolyse ATP → re-cock. Millions of asynchronous cycles slide actin inward.'],
    [18, 30, 'Shortening', 'Z discs move together. The I band and H zone shrink; the A band (the length of myosin) stays the same: proof that filaments slide rather than shorten (Huxley & Niedergerke; Huxley & Hanson 1954).'],
    [30, 110, 'Relaxation', 'SERCA pumps (using ATP) return Ca²⁺ to the SR. Ca²⁺ leaves troponin, tropomyosin re-covers the sites, heads detach, and titin plus the load return the sarcomere to rest length.']],
  toggles: [['atp', 'No ATP (rigor mortis)', 0], ['dantro', 'Dantrolene (less Ca²⁺ release)', true], ['serca', 'SERCA blocked (slow relaxation)', 0.1], ['Lrest', 'Over-stretched (3.6 µm)', 3.6], ['Lrest2', 'Short start (1.8 µm)', 1.8]],
  run: o => mxMuscle({ ...o, Lrest: o.Lrest2 || o.Lrest || 2.2 }),
  draw(x, W, H, R, i, o) { const tr = R.tr, t = tr.t[i];
    mxDrawSarc(x, [20, 4, W - 40, H * 0.7], tr.L[i], tr.A[i], tr.X[i], tr.Ca[i], t, { atp: o.atp });
    // cross-bridge cycle inset
    if (W < 560) { const cyc = o.atp === 0 ? 'stuck in rigor (no ATP)' : tr.X[i] > 0.02 ? ['ATP binds → detach', 'ATP → ADP·Pi: re-cock', 'bind actin', 'power stroke'][Math.floor((t * 0.06) % 4)] : 'heads cocked, waiting'; x.fillStyle = '#7a3fa6'; x.font = '12px system-ui'; x.fillText('cross-bridge: ' + cyc, 12, H - 28); x.fillStyle = '#141111'; x.fillText(`${tr.L[i].toFixed(2)} µm · force ${(100 * tr.F[i]).toFixed(0)} % · Ca²⁺ ${tr.Ca[i].toFixed(1)} µM`, 12, H - 10); return; }
    const cxI = W - 150, cyI = H - 62, r = 30, st = ['ATP binds:\ndetach', 'ATP → ADP·Pi:\nre-cock', 'bind actin', 'power stroke\n(Pi leaves)'];
    const cyc = o.atp === 0 ? 3 : tr.X[i] > 0.02 ? Math.floor((t * 0.06) % 4) : 1;
    x.strokeStyle = '#c9b6a2'; x.lineWidth = 1.5; x.beginPath(); x.arc(cxI, cyI, r, 0, 7); x.stroke(); x.font = '10px system-ui';
    st.forEach((s2, k) => { const a = -Math.PI / 2 + k * Math.PI / 2, px = cxI + r * Math.cos(a), py = cyI + r * Math.sin(a); x.fillStyle = k === cyc ? '#7a3fa6' : '#e9dff1'; x.beginPath(); x.arc(px, py, 6, 0, 7); x.fill();
      x.fillStyle = k === cyc ? '#141111' : '#8a7d70'; s2.split('\n').forEach((ln, q) => { const w = x.measureText(ln).width, lx = k === 1 ? px + 9 : k === 3 ? px - w - 9 : px - w / 2, ly = k === 0 ? py - 12 - (1 - q) * 11 : k === 2 ? py + 18 + q * 11 : py + 3 + (q - 0.5) * 11; x.fillText(ln, lx, ly); }); });
    x.fillStyle = '#6f4c27'; x.font = 'bold 11px system-ui'; x.fillText(o.atp === 0 ? 'stuck in rigor: no ATP' : 'cross-bridge cycle', cxI - r - 150, cyI - r);
    x.fillStyle = '#141111'; x.font = '12px system-ui'; x.fillText(`sarcomere ${tr.L[i].toFixed(2)} µm · force ${(100 * tr.F[i]).toFixed(0)} % · [Ca²⁺] ${tr.Ca[i].toFixed(2)} µM`, 20, H - 10); },
  graph: [['[Ca²⁺] µM', 'Ca', 0, null, '#2f9e5b'], ['troponin bound', 'A', 0, 1, '#5b3a1a'], ['cross-bridges', 'X', 0, 1, '#7a3fa6'], ['force', 'F', 0, 1, '#141111'], ['length µm', 'L', null, null, '#e07b28']],
  note: (o, R) => o.atp === 0 ? 'Without ATP, heads cannot detach and SERCA cannot pump: the sarcomere locks shortened. This is rigor mortis.' : o.Lrest === 3.6 ? `At 3.6 µm the thin and thick filaments barely overlap, so almost no heads can attach: peak force ${(100 * R.Fmax).toFixed(0)} %.` : o.serca === 0.1 ? `With slow Ca²⁺ re-uptake, relaxation takes ${R.tHalf ? R.tHalf.toFixed(0) : '—'} ms to half-relax and force rises to ${(100 * R.Fmax).toFixed(0)} %.` : o.dantro ? `Dantrolene blocks RyR1: peak [Ca²⁺] ${R.Camax.toFixed(2)} µM, force ${(100 * R.Fmax).toFixed(0)} %. The action potential is unchanged.` : `Peak force ${(100 * R.Fmax).toFixed(0)} % of the fully activated maximum at ${R.tPk.toFixed(0)} ms, half-relaxed ${R.tHalf ? R.tHalf.toFixed(0) : '—'} ms later. Shortest length ${R.Lmin.toFixed(2)} µm.`,
  keys: [['Sarcomere rest length', '2.0–2.5 µm (optimum overlap)', 'Gordon, Huxley & Julian 1966'], ['Thick / thin filament', '1.6 µm / ≈ 1.0 µm each', 'Huxley 1957'], ['Power stroke', '≈ 5–10 nm, ≈ 2–6 pN per head', 'Finer, Simmons & Spudich 1994'], ['Ca²⁺ for half activation', '≈ 1 µM (troponin C, Hill n ≈ 2–4)', 'Bers 2001'], ['ATP per cycle', '1 ATP per head per cycle', 'Lymn & Taylor 1971']],
  miscon: 'Filaments do not shorten: the A band keeps its length. Also, ATP is needed to <i>release</i> myosin from actin (and to pump Ca²⁺), not only to make the power stroke.',
  link: ['/biology/reflex/#rx-zoom', 'See it inside the knee-jerk']
});

/* ---------- figure 2: excitation–contraction coupling ---------- */
mxReg({
  id: 'ecc', group: 'Muscle', h: 440, title: 'Excitation–contraction coupling: from voltage to calcium',
  sub: 'A triad: a T-tubule (an inward fold of the surface membrane) flanked by two terminal cisternae of the sarcoplasmic reticulum (SR), the Ca²⁺ store.',
  steps: [[0, 5, 'Rest', 'The SR holds Ca²⁺ at ≈ 1 mM (much of it bound to calsequestrin); the cytosol is at ≈ 0.05 µM. That 20,000-fold gradient is maintained by SERCA pumps using ATP.'],
    [5, 6, 'Action potential', 'The end-plate potential fires a muscle action potential that spreads over the surface and dives down the T-tubules into the fibre.'],
    [6, 6.8, 'Voltage sensor moves', 'Dihydropyridine receptors (DHPR, Caᵥ1.1) in the T-tubule membrane sense depolarisation: their charged S4 segments move (charge movement).'],
    [6.8, 9, 'RyR1 opens', 'In skeletal muscle each DHPR is mechanically linked to a ryanodine receptor (RyR1) on the SR. The movement pulls RyR1 open and Ca²⁺ floods into the cytosol. No Ca²⁺ entry from outside is needed.'],
    [9, 25, 'Ca²⁺ → troponin → force', 'Free cytosolic Ca²⁺ rises ≈ 300-fold, to ≈ 15 µM, within 2 ms, binds troponin C and lets cross-bridges cycle (see the sarcomere figure).'],
    [25, 110, 'SERCA restores', 'SERCA pumps 2 Ca²⁺ per ATP back into the SR. As cytosolic Ca²⁺ falls, force relaxes.']],
  toggles: [['dantro', 'Dantrolene (RyR1 block)', true], ['mh', 'Malignant hyperthermia (leaky RyR1 + anaesthetic)', true], ['serca', 'Thapsigargin (SERCA block)', 0.1]],
  run: o => mxMuscle(o),
  draw(x, W, H, R, i, o) { const tr = R.tr, t = tr.t[i], V = tr.V[i], Q = tr.Q[i], P = tr.P[i], Ca = tr.Ca[i], sr = tr.sr[i];
    const top = 46, tx = W / 2, tw = 34, tdep = H * 0.46, cisW = Math.min(190, W * 0.28), cisH = 86, cy = top + tdep * 0.55;
    x.fillStyle = '#eaf2f7'; x.fillRect(0, 0, W, top); x.fillStyle = '#3d6a8c'; x.font = '12px system-ui'; x.fillText('extracellular fluid', 10, 16);
    // AP glow: travels across the surface, then down the T-tubule
    const ts = R.o.stims.find(s => t >= s && t < s + 4), ph = ts != null ? (t - ts) / 1.4 : -1;
    x.fillStyle = '#e9d9b8'; x.fillRect(0, top, tx - tw / 2, 10); x.fillRect(tx + tw / 2, top, W - tx - tw / 2, 10); x.fillRect(tx - tw / 2 - 10, top, 10, tdep); x.fillRect(tx + tw / 2, top, 10, tdep); x.fillStyle = '#eaf2f7'; x.fillRect(tx - tw / 2, top, tw, tdep);
    x.fillStyle = '#e9d9b8'; x.fillRect(tx - tw / 2 - 10, top + tdep, tw + 20, 10);
    if (ph >= 0 && ph < 1.6) { x.fillStyle = 'rgba(232,73,95,.55)'; const sx = Math.min(1, ph) * (tx - tw / 2); x.fillRect(tx - tw / 2 - sx, top - 3, 26, 16); x.fillRect(tx + tw / 2 + sx - 26, top - 3, 26, 16); if (ph > 0.6) { const dy = Math.min(1, (ph - 0.6)) * tdep; x.fillRect(tx - tw / 2 - 12, top + dy - 14, 14, 26); x.fillRect(tx + tw / 2 - 2, top + dy - 14, 14, 26); } }
    x.fillStyle = '#141111'; x.fillText(`membrane ${V.toFixed(0)} mV`, 10, W < 560 ? H - 22 : top + 26); x.fillText('T-tubule', tx - 24, top + tdep + 26);
    // terminal cisternae (SR) both sides, Ca²⁺ inside ∝ SR content
    [-1, 1].forEach(sd => { const x0 = sd < 0 ? tx - tw / 2 - 10 - 14 - cisW : tx + tw / 2 + 10 + 14; x.fillStyle = '#dfeee4'; x.strokeStyle = '#2f7d5b'; x.lineWidth = 1.5; x.beginPath(); x.roundRect ? x.roundRect(x0, cy - cisH / 2, cisW, cisH, 14) : x.rect(x0, cy - cisH / 2, cisW, cisH); x.fill(); x.stroke();
      x.fillStyle = '#2f9e5b'; const n = Math.round(40 * sr); for (let k = 0; k < n; k++) { const h1 = Math.sin(k * 3.17 + sd) * 9999, h2 = Math.sin(k * 7.91 + sd * 3) * 9999; x.beginPath(); x.arc(x0 + 8 + (h1 - Math.floor(h1)) * (cisW - 16), cy - cisH / 2 + 8 + (h2 - Math.floor(h2)) * (cisH - 16), 2, 0, 7); x.fill(); }
      // DHPR (in T-tubule wall) and RyR1 (SR face) coupled by a foot
      for (let k = 0; k < 3; k++) { const yy = cy - 18 + k * 18, dxW = sd < 0 ? tx - tw / 2 - 10 : tx + tw / 2 + 10, rx = sd < 0 ? x0 + cisW : x0;
        x.fillStyle = '#a62962'; x.save(); x.translate(dxW + (sd < 0 ? 5 : -5), yy); x.rotate(sd * Q * 0.6); x.fillRect(-4, -5, 8, 10); x.restore();
        x.strokeStyle = '#555'; x.lineWidth = 1; x.beginPath(); x.moveTo(dxW, yy); x.lineTo(rx, yy); x.stroke();
        const open = P * (o.dantro ? 1 : 1); x.fillStyle = '#3d6a8c'; x.fillRect(rx + (sd < 0 ? -7 : 0), yy - 6, 7, 4); x.fillRect(rx + (sd < 0 ? -7 : 0), yy + 2 + 3 * open, 7, 4);
        if (o.dantro) { x.strokeStyle = '#b3261e'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(rx - 6, yy - 6); x.lineTo(rx + 6, yy + 6); x.stroke(); }
        if (P > 0.15 && Math.random() < P) { x.fillStyle = '#2f9e5b'; for (let q = 0; q < 3; q++) { const d = ((t * 3 + q * 13 + k * 7) % 40); x.beginPath(); x.arc(rx + (sd < 0 ? -10 - d * 0.3 : 10 + d * 0.3) * 1, yy + 12 + d, 2, 0, 7); x.fill(); } } }
      // SERCA pumps on the far side
      const jUp = Ca * Ca / (Ca * Ca + 0.25) * (o.serca || 1), px = sd < 0 ? x0 + 20 : x0 + cisW - 20; x.save(); x.translate(px, cy + cisH / 2); x.rotate(t * 0.4 * jUp); x.fillStyle = '#d08a2e'; x.fillRect(-5, -5, 10, 10); x.restore(); x.fillStyle = '#8a5a1f'; x.font = '10px system-ui'; x.fillText('SERCA', px - 14, cy + cisH / 2 + 18); });
    x.fillStyle = '#2f7d5b'; x.font = '11px system-ui'; if (W >= 560) x.fillText('SR (terminal cisterna)', 12, cy - cisH / 2 - 6); const nar = W < 560; x.fillStyle = '#a62962'; x.fillText(nar ? 'DHPR' : 'DHPR (voltage sensor, in T-tubule)', tx - tw / 2 - (nar ? 46 : 210), cy - cisH / 2 - (nar ? 6 : 22)); x.fillStyle = '#3d6a8c'; x.fillText(nar ? 'RyR1' : 'RyR1 (SR Ca²⁺ channel)', tx + tw / 2 + (nar ? 16 : 30), cy - cisH / 2 - (nar ? 6 : 22)); x.fillStyle = '#2f9e5b'; x.fillText('● Ca²⁺', W - 60, 16);
    // cytosol Ca²⁺ and a myofibril strip below
    const my = top + tdep + 34; x.fillStyle = '#2f9e5b'; const nC = Math.min(80, Math.round(Ca * 16)); for (let k = 0; k < nC; k++) { const h1 = Math.sin(k * 12.9 + 7) * 4375, h2 = Math.sin(k * 3.3 + 1) * 2463; x.beginPath(); x.arc((h1 - Math.floor(h1)) * W, top + 14 + (h2 - Math.floor(h2)) * (my - top - 20), 2, 0, 7); x.fill(); }
    mxDrawSarc(x, [W * 0.18, my, W * 0.64, Math.max(60, H - my - 24)], tr.L[i], tr.A[i], tr.X[i], 0, t, { labels: false });
    x.fillStyle = '#141111'; x.font = '12px system-ui'; x.fillText(`cytosolic [Ca²⁺] ${Ca.toFixed(2)} µM · SR ${(100 * sr).toFixed(0)} % full · force ${(100 * tr.F[i]).toFixed(0)} %`, 10, H - 6);
    if (o.mh) { x.fillStyle = '#b3261e'; x.fillText('RyR1 stays open → Ca²⁺ stays high → muscles rigid, ATP burned → heat', W - 430, top + 26); } },
  graph: [['membrane mV', 'V', -95, 40, '#a62962'], ['DHPR charge', 'Q', 0, 1, '#a62962'], ['RyR1 open', 'P', 0, 1, '#3d6a8c'], ['[Ca²⁺] µM', 'Ca', 0, null, '#2f9e5b'], ['SR content', 'sr', 0, 1, '#2f7d5b'], ['force', 'F', 0, 1, '#141111']],
  note: (o, R) => o.mh ? 'Malignant hyperthermia: a mutant RyR1 (exposed to volatile anaesthetics) keeps leaking Ca²⁺. Sustained contraction and SERCA pumping burn ATP and generate heat. Treatment: dantrolene, which blocks RyR1.' : o.dantro ? `Dantrolene: the action potential and DHPR movement are normal, but RyR1 releases little Ca²⁺ (peak ${R.Camax.toFixed(2)} µM): force ${(100 * R.Fmax).toFixed(0)} %.` : o.serca ? `Thapsigargin: Ca²⁺ is released normally but cleared slowly, so force is bigger and relaxation slow (half-relaxation ${R.tHalf ? R.tHalf.toFixed(0) : '—'} ms).` : `Ca²⁺ peaks at ${R.Camax.toFixed(2)} µM about ${(R.tr.t[R.tr.Ca.indexOf(R.Camax)] - 5).toFixed(1)} ms after the action potential; force peaks at ${R.tPk.toFixed(0)} ms.`,
  keys: [['SR free [Ca²⁺]', '≈ 0.5–1 mM', 'Bers 2001'], ['Resting cytosolic [Ca²⁺]', '≈ 50–100 nM', 'Baylor & Hollingworth 2003'], ['Peak cytosolic [Ca²⁺], fast twitch', '≈ 10–20 µM (spatially averaged)', 'Baylor & Hollingworth 2003'], ['Delay AP → Ca²⁺ release', '≈ 1–2 ms', 'Schneider & Chandler 1973'], ['SERCA stoichiometry', '2 Ca²⁺ per ATP', 'MacLennan 1985'], ['This model', 'free [Ca²⁺] peak ≈ 14 µM, width ≈ 3 ms; twitch peak at ≈ 14 ms, half-relaxed ≈ 22 ms later (fast mouse fibre, 37 °C)', 'calibrated to the rows above']],
  miscon: 'In skeletal muscle the trigger is mechanical (DHPR physically opens RyR1); extracellular Ca²⁺ is not required. Heart muscle is different: Ca²⁺ entering through DHPR triggers RyR2 (Ca²⁺-induced Ca²⁺ release).',
  link: ['/biology/reflex/', 'Watch the whole reflex']
});

/* ---------- figure 3: summation, tetanus and length–tension ---------- */
mxReg({
  id: 'tetanus', group: 'Muscle', title: 'Twitch, summation, tetanus and the length–tension curve',
  sub: 'Same fibre, different firing rates. Each step reruns the model at a new frequency. Toggle the starting length to move along the length–tension curve.',
  steps: [[0, 400, 'Single twitch', 'One action potential: one brief Ca²⁺ transient (≈ 3 ms wide) and a small twitch (≈ 30 % of the fused tetanus).', { f: 0 }], [0, 400, '10 Hz', 'At 10 Hz each twitch has relaxed before the next: separate twitches.', { f: 10 }],
    [0, 400, '30 Hz: summation', 'At 30 Hz the next Ca²⁺ pulse arrives before relaxation is complete: twitches add up (summation).', { f: 30 }], [0, 400, '100 Hz: fused tetanus', 'At 100 Hz Ca²⁺ stays high and cross-bridges stay engaged: a smooth, maximal contraction (fused tetanus).', { f: 100 }]],
  stepDur: 5,
  toggles: [['Lrest', 'Long sarcomere (3.0 µm)', 3.0], ['Lrest2', 'Short sarcomere (1.7 µm)', 1.7], ['fib', 'Slow-twitch fibre (type I)', 'slow']],
  run: (o, so) => mxMuscle({ stims: mxTrains(so.f), Lrest: o.Lrest2 || o.Lrest || 2.2, fib: o.fib, tEnd: 400 }),
  draw(x, W, H, R, i, o) { const tr = R.tr, t = tr.t[i];
    mxDrawSarc(x, [10, 10, W * 0.58, H * 0.6], tr.L[i], tr.A[i], tr.X[i], tr.Ca[i], t, { labels: false });
    // length–tension curve
    const gx = W * 0.64, gy = 22, gw = W * 0.33, gh = H * 0.45, Xl = L => gx + gw * (L - 1.2) / 2.6, Yl = f => gy + gh - gh * f;
    x.strokeStyle = '#c9b6a2'; x.strokeRect(gx, gy, gw, gh); x.strokeStyle = '#141111'; x.lineWidth = 1.5; x.beginPath(); for (let L = 1.2; L <= 3.8; L += 0.02) { L === 1.2 ? x.moveTo(Xl(L), Yl(mxOverlap(L))) : x.lineTo(Xl(L), Yl(mxOverlap(L))); } x.stroke();
    const L0 = R.o.Lrest; x.fillStyle = '#c43c3c'; x.beginPath(); x.arc(Xl(L0), Yl(mxOverlap(L0)), 5, 0, 7); x.fill();
    x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; x.fillText('length–tension (isometric)', gx, gy - 6); x.fillText('1.2', gx - 4, gy + gh + 12); x.fillText('3.8 µm', gx + gw - 30, gy + gh + 12); x.fillText(`start ${L0.toFixed(1)} µm → max force ${(100 * mxOverlap(L0)).toFixed(0)} %`, gx, gy + gh + 26);
    // stimulus ticks + force trace so far
    const fx = 10, fy = H * 0.7, fw = W - 20, fh = H * 0.26, Xt = tt => fx + fw * tt / 400; x.strokeStyle = '#efe4d8'; x.strokeRect(fx, fy, fw, fh);
    R.o.stims.forEach(s2 => { x.fillStyle = s2 <= t ? '#a62962' : '#e8d0dc'; x.fillRect(Xt(s2), fy - 8, 1.5, 6); });
    x.strokeStyle = '#141111'; x.lineWidth = 2; x.beginPath(); for (let j = 0; j <= i; j++) { j ? x.lineTo(Xt(tr.t[j]), fy + fh - fh * tr.F[j]) : x.moveTo(Xt(tr.t[j]), fy + fh - fh * tr.F[j]); } x.stroke();
    x.fillStyle = '#141111'; x.fillText(`force ${(100 * tr.F[i]).toFixed(0)} %`, fx + 4, fy + 12); x.fillStyle = '#a62962'; x.fillText('action potentials', fx + fw - 100, fy - 10); },
  graph: [['[Ca²⁺] µM', 'Ca', 0, null, '#2f9e5b'], ['cross-bridges', 'X', 0, 1, '#7a3fa6'], ['force', 'F', 0, 1, '#141111']],
  note: (o, R, so) => `${so.f ? so.f + ' Hz' : 'Single twitch'}: peak force ${(100 * R.Fmax).toFixed(0)} % of the fully activated maximum at sarcomere length ${R.o.Lrest.toFixed(1)} µm${o.fib ? ' (slow fibre: twitches last longer, so they fuse at lower rates)' : ''}.`,
  keys: [['Twitch : tetanus ratio', '≈ 0.2–0.4', 'Close 1972'], ['Fusion frequency', 'fast ≈ 60–100 Hz, slow ≈ 20–30 Hz', 'Burke 1981'], ['Optimal sarcomere length', '2.0–2.25 µm (frog)', 'Gordon, Huxley & Julian 1966'], ['Zero overlap', '≈ 3.65 µm', 'Gordon, Huxley & Julian 1966']],
  miscon: 'A stronger contraction does not come from a bigger action potential (it is all-or-none). The nervous system grades force by firing rate (summation) and by recruiting more motor units.',
  link: ['/biology/reflex/', 'Try nerve stimulation in the reflex lab']
});

/* ---------- framework: one figure card ---------- */
function mxCard(host, fig) {
  const id = fig.id, el = document.createElement('section'); el.className = 'lesson-section lab mx-card'; el.id = 'mx-' + id;
  el.innerHTML = `<p class="eyebrow">${fig.group}</p><h2>${fig.title}</h2><p>${fig.sub}</p>
    <div class="mx-fig"><canvas id="mxc-${id}" class="nv-canvas" style="height:${fig.h || 360}px" aria-label="${fig.title}"></canvas>
    <div class="mx-steps" id="mxs-${id}">${fig.steps.map((s, k) => `<button class="mx-step" data-k="${k}"><b>${k + 1}</b> ${s[2]}</button>`).join('')}</div>
    <div class="mx-cap" id="mxcap-${id}" aria-live="polite"></div>
    <div class="nl-bar"><button id="mxp-${id}">⏸ Pause</button><button class="secondary" id="mxb-${id}">⏮</button><button class="secondary" id="mxf-${id}">⏭</button><label class="nl-inl">speed <select id="mxv-${id}"><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><label class="nl-inl"><input type="checkbox" id="mxl-${id}" checked> repeat</label><button class="secondary" id="mxsn-${id}">Snapshot</button></div>
    <div class="nl-chips mx-tog">${fig.toggles.map(([k, l], j) => `<label><input type="checkbox" data-j="${j}"> ${l}</label>`).join('')}</div>
    <canvas id="mxg-${id}" class="uth-plot" style="height:${28 * fig.graph.length + 24}px;${fig.graph.length ? '' : 'display:none'}" aria-label="Model traces"></canvas>
    <p class="mx-note" id="mxn-${id}"></p>
    <details class="mx-more"><summary>Key numbers, misconception & sources</summary><div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Quantity</th><th>Value</th><th>Source</th></tr></thead><tbody>${fig.keys.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div><p><b>Common misconception.</b> ${fig.miscon}</p></details>
    <p><a href="${fig.link[0]}">${fig.link[1]} →</a></p><div id="mxsnaps-${id}" class="ng-snaps"></div></div>`;
  host.appendChild(el);
  const o = {}, cache = {}, S = { k: 0, f: 0, playing: true, vis: false };
  const run = k => { const key = JSON.stringify([o, fig.steps[k][4] || null]); if (!cache[key]) cache[key] = fig.run(o, fig.steps[k][4] || {}); return cache[key]; };
  let R = run(0);
  const idxAt = (k, f) => { const [m0, m1] = fig.steps[k], t = m0 + (m1 - m0) * f; return Math.min(R.tr.t.length - 1, Math.max(0, Math.round(t / R.rec))); };
  const render = () => { R = run(S.k); const i = idxAt(S.k, S.f), [x, W, H] = gfCanvas('mxc-' + id); x.font = '12px system-ui'; fig.draw(x, W, H, R, i, o, S.k);
    if (!fig.graph.length) { el.querySelectorAll('.mx-step').forEach((b, k) => b.classList.toggle('on', k === S.k)); $('mxcap-' + id).innerHTML = `<b>${S.k + 1} · ${fig.steps[S.k][2]}.</b> ${fig.steps[S.k][3]}`; $('mxn-' + id).innerHTML = fig.note(o, R, fig.steps[S.k][4] || {}); return; }
    const [g, GW, GH] = gfCanvas('mxg-' + id), Lm = 104, Rr = GW - 8, rh = (GH - 18) / fig.graph.length, tr = R.tr, tEnd = fig.steps[S.k][4] ? tr.t[tr.t.length - 1] : Math.max(...fig.steps.map(s => s[1])), Xg = t => Lm + (Rr - Lm) * t / tEnd;
    fig.graph.forEach(([lab, key, lo0, hi0, col], r) => { const a = tr[key], lo = lo0 ?? Math.min(...a), hi = hi0 ?? Math.max(1e-9, ...a) * 1.05, y0 = 2 + r * rh, Y = v => y0 + rh - 3 - (rh - 6) * (v - lo) / ((hi - lo) || 1);
      g.fillStyle = col; g.font = '11px system-ui'; g.fillText(lab, 4, y0 + rh / 2 + 4); g.strokeStyle = '#efe4d8'; g.beginPath(); g.moveTo(Lm, y0 + rh - 1); g.lineTo(Rr, y0 + rh - 1); g.stroke();
      g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); let started = false; for (let j = 0; j < a.length; j++) { if (tr.t[j] > tEnd) break; const px = Xg(tr.t[j]), py = Y(a[j]); started ? g.lineTo(px, py) : (g.moveTo(px, py), started = true); } g.stroke(); });
    fig.steps.forEach((s, k) => { if (fig.steps[k][4]) return; g.fillStyle = k === S.k ? 'rgba(232,73,95,.10)' : 'transparent'; g.fillRect(Xg(s[0]), 0, Xg(s[1]) - Xg(s[0]), GH - 16); });
    g.strokeStyle = '#e8495f'; g.beginPath(); g.moveTo(Xg(tr.t[i]), 0); g.lineTo(Xg(tr.t[i]), GH - 16); g.stroke(); g.fillStyle = '#6f4c27'; g.fillText(`t = ${tr.t[i].toFixed(1)} ms (model time)`, Lm, GH - 3); g.fillText(`${tEnd} ms`, Rr - 40, GH - 3);
    el.querySelectorAll('.mx-step').forEach((b, k) => b.classList.toggle('on', k === S.k));
    $('mxcap-' + id).innerHTML = `<b>${S.k + 1} · ${fig.steps[S.k][2]}.</b> ${fig.steps[S.k][3]}`; $('mxn-' + id).innerHTML = fig.note(o, R, fig.steps[S.k][4] || {}); };
  const go = k => { S.k = (k + fig.steps.length) % fig.steps.length; S.f = 0; render(); };
  el.querySelectorAll('.mx-step').forEach(b => b.onclick = () => go(+b.dataset.k));
  $('mxp-' + id).onclick = () => { S.playing = !S.playing; $('mxp-' + id).textContent = S.playing ? '⏸ Pause' : '▶ Play'; };
  $('mxb-' + id).onclick = () => go(S.k - 1); $('mxf-' + id).onclick = () => go(S.k + 1);
  $('mxsn-' + id).onclick = () => ngSnap(['mxc-' + id, 'mxg-' + id], fig.title, 'mxsnaps-' + id);
  el.querySelectorAll('.mx-tog input').forEach(cb => cb.onchange = () => { const [k, , v] = fig.toggles[+cb.dataset.j]; if (cb.checked) o[k] = v; else delete o[k]; render(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => S.vis = e.isIntersecting), { threshold: 0.05 }).observe(el); else S.vis = true;
  let last = performance.now();
  const loop = now => { if (!el.isConnected) return; const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S.playing && S.vis) { S.f += dt * +$('mxv-' + id).value / (fig.stepDur || 3); if (S.f >= 1) { if (S.k === fig.steps.length - 1 && !$('mxl-' + id).checked) { S.f = 1; S.playing = false; $('mxp-' + id).textContent = '▶ Play'; } else go(S.k + 1); } render(); }
    requestAnimationFrame(loop); };
  render(); requestAnimationFrame(loop);
}

function renderMechanisms() {
  document.title = 'Mechanism atlas · Real biology';
  const groups = [...new Set(MX_FIGS.map(f => f.group))];
  $('lesson').innerHTML = bioHead('Mechanism atlas', 'REAL BIOLOGY · TEXTBOOK FIGURES THAT MOVE · ' + MX_FIGS.length + ' MECHANISMS',
    'Each figure is a textbook page that plays itself: numbered steps, a caption for each, and a live graph from the model that drives the drawing. Pause on any step, change one thing with the “what if” toggles, and watch the mechanism (and the numbers) respond. Figures loop, so they work on a projector.')
    + `<nav class="page-jumps mx-jumps">${groups.map(g => `<span class="mx-jg"><b>${g}</b> ${MX_FIGS.filter(f => f.group === g).map(f => `<a href="#mx-${f.id}">${f.title.split(':')[0]}</a>`).join('')}</span>`).join('')}<button class="mx-big-btn" id="mxBig" title="Hide the sidebar and enlarge the figures">⤢ Projector view</button></nav><div id="mxHost"></div>` + smallPrint();
  const host = $('mxHost'); MX_FIGS.forEach(f => mxCard(host, f));
  $('mxBig').onclick = () => document.body.classList.toggle('mx-big');
  const h = (location.hash.match(/mx-[a-z0-9-]+/) || [])[0]; if (h && document.getElementById(h)) setTimeout(() => document.getElementById(h).scrollIntoView(), 50);
}
window.renderMechanisms = renderMechanisms;
