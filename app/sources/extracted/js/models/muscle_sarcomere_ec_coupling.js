/* Extracted from Little Neural Guide modellab.js [1279019:1283311] — section: Shared muscle model */
/* ===== Shared muscle model for the mechanism figures (sarcomere, EC coupling, summation) =====
   Skeletal fibre, fast twitch, normalised units. Time in ms, [Ca²⁺] in µM, SR content normalised (1 = full).
   Muscle AP (template) → DHPR charge movement Q (voltage sensor) → RyR1 open probability P (mechanically coupled)
   → Ca²⁺ release J_rel = k_rel·P·Ca_SR, SERCA uptake J_up = V_up·Ca²/(Ca²+K²), small leak
   → troponin C occupancy A (Hill n = 2.5, K = 1 µM) → attached cross-bridges X (attach f·A·overlap, detach g·[ATP])
   → force F (first-order lag) → sarcomere length under a light load. Overlap from the Gordon–Huxley–Julian (1966) length–tension curve. */
function mxOverlap(L) {   // fraction of maximal overlap for sarcomere length L (µm), frog-like filament lengths (thick 1.6, thin 2×0.95, bare zone 0.2)
  if (L >= 3.65) return 0; if (L >= 2.25) return (3.65 - L) / 1.4; if (L >= 2.0) return 1; if (L >= 1.65) return 1 - (2.0 - L) / 0.35 * 0.15; if (L >= 1.27) return 0.85 * (L - 1.27) / 0.38; return 0;
}
const MX_DEF = { stims: [5], dantro: false, mh: false, serca: 1, atp: 1, Lrest: 2.2, tEnd: 400 };
function mxMuscle(o0) {
  const o = { ...MX_DEF, ...o0 }, dt = 0.01, rec = 0.1, nRec = Math.round(rec / dt), slow = o.fib === 'slow';
  // Calibrated (random search against published targets) to a fast mouse fibre at 37 °C: twitch time-to-peak ≈ 14 ms,
  // half-relaxation ≈ 22 ms, peak free [Ca²⁺] ≈ 15 µM, twitch:tetanus ≈ 0.29, ≈ 57 % of maximum at 50 Hz (Baylor & Hollingworth 2003; Close 1972).
  const kRel = 25.3, Vup = 6.0 * o.serca * o.atp * (slow ? 0.35 : 1), Kup = 2.08, Ktn = 3.0, fAtt = 1.16 * (slow ? 0.5 : 1), gDet = 0.2 * (slow ? 0.3 : 1), tSE = 24 * (slow ? 1.6 : 1), aOff = 1.15;
  const leak = 6.0 * (slow ? 0.35 : 1) * 0.0025 / (0.0025 + Kup * Kup);
  let V = -90, Q = 0, P = 0, Ca = 0.05, sr = 1, A = 0, X = 0, F = 0, L = o.Lrest, heat = 0, mhOn = false;
  const tr = { t: [], V: [], Q: [], P: [], Ca: [], sr: [], A: [], X: [], F: [], L: [] };
  for (let step = 0, t = 0; t <= o.tEnd; step++, t = step * dt) {
    // muscle action potential at 37 °C: ≈ 1-ms spike from −90 mV (template; the reflex and action-potential pages solve it with HH)
    V = -90; for (const ts of o.stims) { const u = t - ts; if (u >= 0 && u < 4) V = Math.max(V, -90 + 125 * (u < 0.3 ? u / 0.3 : Math.exp(-(u - 0.3) / 0.5))); }
    Q += dt * ((V > -50 ? 1 : 0) - Q) / 0.3;                                    // DHPR voltage-sensor charge movement
    if (o.mh && Ca > 2 && t > 2) mhOn = true;                                    // malignant hyperthermia: mutant RyR1 + volatile anaesthetic stays open once triggered
    const Pinf = Math.min(1, Q * (o.dantro ? 0.3 : 1) + (mhOn ? 0.06 : 0));
    P += dt * (Pinf - P) / (Pinf > P ? 0.3 : 0.8);                               // RyR1 open probability (mechanically coupled to DHPR)
    const Jrel = kRel * P * sr + leak * sr, Jup = Vup * Ca * Ca / (Ca * Ca + Kup * Kup);
    Ca += dt * (Jrel - Jup); sr += dt * -(Jrel - Jup) / 250; if (sr < 0) sr = 0;   // free Ca²⁺ in µM; SR content normalised (≈ 10 % released per twitch)
    const Ainf = Ca ** 3 / (Ca ** 3 + Ktn ** 3); A += dt * (Ainf - A) / (Ainf > A ? 0.5 : aOff);   // troponin C regulatory sites, Hill n = 3
    const ov = mxOverlap(L);
    X += dt * (fAtt * A * (1 - X) - gDet * o.atp * X);                          // attached fraction of heads that can reach actin; detachment needs ATP
    F += dt * (X * ov - F) / tSE;                                                // series elasticity (tendon, Z disc, cross-bridge compliance)
    L += dt * ((o.Lrest - 0.5 * F) - L) / 8;                                     // shortening against a light spring load
    if (mhOn) heat += dt * 0.004 * (P + X);
    if (step % nRec === 0) { tr.t.push(t); tr.V.push(V); tr.Q.push(Q); tr.P.push(P); tr.Ca.push(Ca); tr.sr.push(sr); tr.A.push(A); tr.X.push(X); tr.F.push(F); tr.L.push(L); }
  }
  const Fmax = Math.max(...tr.F), iPk = tr.F.indexOf(Fmax), Camax = Math.max(...tr.Ca);
  let tHalf = null; for (let i = iPk; i < tr.F.length; i++) if (tr.F[i] < Fmax / 2) { tHalf = tr.t[i] - tr.t[iPk]; break; }
  let fd = 0; tr.Ca.forEach(c => { if (c > Camax / 2) fd += rec; });
  return { tr, o, Fmax, tPk: tr.t[iPk], Camax, fdhm: fd, tHalf, Lmin: Math.min(...tr.L), heat, rec };
}
