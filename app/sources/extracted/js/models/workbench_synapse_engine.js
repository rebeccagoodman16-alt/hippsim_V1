/* Extracted from Little Neural Guide wb-synapse.js */
/* ===================== SYNAPSE WORKBENCH · MODEL ENGINE =====================
   window.SW: one presynaptic spike pattern → receptor conductances → one postsynaptic compartment.
     receptors   AMPA, NMDA (Mg²⁺ block, Jahr & Stevens 1990), GABA_A, GABA_B
     levels      'cur'  current-based (fixed driving force at rest: no saturation, no shunting)
                 'exp'  single-exponential conductance
                 'dual' difference of exponentials (rise + decay)
                 'kin'  receptor kinetics with a transmitter pulse (Destexhe, Mainen & Sejnowski 1994/1998);
                        GABA_B uses the G-protein cascade, so it needs bursts to open
     STP         Tsodyks–Markram depression/facilitation on excitatory release (Markram, Wang & Tsodyks 1998)
     STDP        pair-based (Bi & Poo 1998; Song, Miller & Abbott 2000), triplet (Pfister & Gerstner 2006),
                 calcium-based (Graupner & Brunel 2012), computed event by event
   Units: time ms, voltage mV, conductance nS, capacitance pF, current pA (nS·mV = pA). Outward current positive. */
(function () {
  'use strict';

  /* ---------- receptors ---------- */
  const REC = {
    ampa: { label: 'AMPA', exc: true, E: 0, g: 1, tr: 0.2, td: 2, ka: 1.1, kb: 0.19,
      bio: 'Fast glutamate receptor; carries most of the EPSC at rest. CA1 AMPA EPSCs decay in ~2–5 ms near body temperature.',
      ref: 'Kinetic rates: Destexhe, Mainen & Sejnowski (1998)' },
    nmda: { label: 'NMDA', exc: true, E: 0, g: 1, tr: 2, td: 80, ka: 0.072, kb: 0.0066, mg: true,
      bio: 'Slow glutamate receptor, blocked by Mg²⁺ near rest. Opens only when glutamate is bound <i>and</i> the membrane is depolarized: a coincidence detector, and the main Ca²⁺ source for LTP at Schaffer collateral synapses.',
      ref: 'Mg²⁺ block: Jahr & Stevens (1990); kinetics: Destexhe et al. (1998)' },
    gabaa: { label: 'GABA_A', exc: false, E: -70, g: 2, tr: 0.5, td: 8, ka: 5, kb: 0.18,
      bio: 'Fast Cl⁻ channel. E_GABA sits near rest in adult CA1, so much of its effect is shunting (a conductance) rather than hyperpolarizing.',
      ref: 'Kinetic rates: Destexhe et al. (1998)' },
    gabab: { label: 'GABA_B', exc: false, E: -95, g: 1, tr: 40, td: 200, gprot: true,
      bio: 'Metabotropic: GABA activates a G-protein that opens GIRK K⁺ channels. Slow (peak ~100 ms) and strongly nonlinear: single spikes barely activate it, bursts do.',
      ref: 'G-protein model: Destexhe & Sejnowski (1995); Destexhe et al. (1998)' },
  };
  const R_ORDER = ['ampa', 'nmda', 'gabaa', 'gabab'];
  /** Mg²⁺ unblock of NMDA receptors (Jahr & Stevens 1990): fraction of conductance available at V (mV), [Mg]ₒ (mM). */
  const mgB = (V, mg) => 1 / (1 + Math.exp(-0.062 * V) * mg / 3.57);

  /* ---------- default state: every key is a control or a URL parameter ---------- */
  const DEF = {
    level: 'dual', mode: 'cc',
    C: 200, gL: 10, EL: -65, idc: 0, Vth: -50, Vr: -60, tref: 2, vhold: -70, mg: 1,
    Tmax: 1, Tdur: 1, K1: 0.09, K2: 0.0012, K3: 0.18, K4: 0.034, Kd: 100, nB: 4,
    proto: 'single', delay: 50, isi: 50, nsp: 10, freq: 20, nb: 5, bsz: 4, bf: 100, bif: 5, rate: 10, pdur: 1000, seed: 7, inh_on: true, inh_lag: 2, tstop: 300,
    stp: false, U: 0.5, tauD: 800, tauF: 0,
    rule: 'pair', nn: 'all', Ap: 1, Am: 1.05, taup: 16.8, taum: 33.7,
    a2p: 5e-8, a3p: 0.62, a2m: 0.7, a3m: 0.023, taux: 101, tauy: 125,
    tauca: 22.6936, cpre: 0.5617539, cpost: 1.23964, thd: 1, thp: 1.3, gamd: 331.909, gamp: 725.085, taurho: 346361, rhostar: 0.5, Dca: 4.6098, rho0: 0.5,
    npair: 60, fpair: 1, dtca: 10,
    dt: 0.025,
  };
  R_ORDER.forEach(k => { const r = REC[k]; Object.assign(DEF, { ['on_' + k]: k === 'ampa', ['g_' + k]: r.g, ['E_' + k]: r.E, ['tr_' + k]: r.tr, ['td_' + k]: r.td }); if (r.ka) Object.assign(DEF, { ['ka_' + k]: r.ka, ['kb_' + k]: r.kb }); });

  /* ---------- presets: documented starting points, not fitted synapses ---------- */
  const OFF = { on_ampa: false, on_nmda: false, on_gabaa: false, on_gabab: false };
  const PRESETS = {
    'ampa-psp': { group: 'Single synapse', label: 'AMPA EPSP at rest', note: 'One spike, one fast glutamatergic conductance (1 nS peak) onto a passive CA1-sized compartment (200 pF, 10 nS → τ = 20 ms, 100 MΩ). The EPSP lasts ~10× longer than the conductance: the membrane, not the receptor, sets its decay.',
      s: { ...OFF, on_ampa: true } },
    'ampa-nmda-vc': { group: 'Single synapse', label: 'AMPA + NMDA in voltage clamp', note: 'Clamped at −70 mV only the fast AMPA current is visible: Mg²⁺ blocks NMDA. Set the holding voltage to +40 mV and a slow outward NMDA current appears. The NMDA & Mg²⁺ tab measures the NMDA/AMPA ratio the way slice papers do.',
      s: { ...OFF, on_ampa: true, on_nmda: true, mode: 'vc', vhold: -70, tstop: 400 } },
    'nmda-unblock': { group: 'Single synapse', label: 'NMDA: depolarization unblocks', note: 'Five spikes at 50 Hz onto AMPA + NMDA. Inject +100 pA of holding current (or set [Mg²⁺] to 0) and the late, slow NMDA component grows: the coincidence detector at work.',
      s: { ...OFF, on_ampa: true, on_nmda: true, g_ampa: 2, g_nmda: 1.5, proto: 'train', nsp: 5, freq: 50, tstop: 400 } },
    'shunt': { group: 'Inhibition', label: 'Shunting inhibition', note: 'Three EPSPs at 50 Hz with GABA_A whose reversal equals rest (E_GABA = E_leak = −65 mV). The inhibition alone produces no IPSP, yet the summed EPSP shrinks by about a third: the open Cl⁻ conductance short-circuits the membrane and shortens each EPSP, so they sum less. The first peak shrinks least because the fast AMPA charge arrives before it can leak away. Switch <b>Synapse model</b> to <i>Current</i>: with a fixed driving force of zero, the inhibition vanishes.',
      s: { ...OFF, on_ampa: true, on_gabaa: true, g_ampa: 2, g_gabaa: 20, E_gabaa: -65, inh_lag: -1, proto: 'train', nsp: 3, freq: 50 } },
    'ffi': { group: 'Inhibition', label: 'CA1 feedforward inhibition window', note: 'A Schaffer volley excites the pyramidal cell and, ~2 ms later, inhibits it through local interneurons (Pouille & Scanziani 2001). A holding current brings rest to −57 mV. With 2 ms of delay inhibition vetoes almost every spike; move the inhibitory delay to 3 ms and all five volleys fire. Untick GABA_A to see the cell without inhibition. The delay sets a millisecond-wide window for coincident input.',
      s: { ...OFF, mode: 'lif', on_ampa: true, on_gabaa: true, g_ampa: 20, g_gabaa: 30, E_gabaa: -72, idc: 80, inh_lag: 2, proto: 'train', nsp: 5, freq: 20, tstop: 350 } },
    'gabab-burst': { group: 'Inhibition', label: 'GABA_B needs bursts', note: 'Receptor-kinetics level. GABA_B is driven through a G-protein with fourth-order cooperativity, so ten spikes at 100 Hz evoke a large slow IPSP while one spike (choose Single spike) does almost nothing (Destexhe & Sejnowski 1995). GABA_A is included for contrast.',
      s: { ...OFF, level: 'kin', on_gabaa: true, on_gabab: true, g_gabaa: 1, g_gabab: 4, proto: 'train', nsp: 10, freq: 100, tstop: 900 } },
    'stp-dep': { group: 'Short-term plasticity', label: 'Depressing synapse', note: 'Tsodyks–Markram depression: U = 0.5, τ_D = 800 ms, no facilitation (cortical pyramid → pyramid; Tsodyks & Markram 1997). Each spike uses half the available resources, so a 20 Hz train fades. Voltage clamp shows the release directly.',
      s: { ...OFF, on_ampa: true, mode: 'vc', stp: true, U: 0.5, tauD: 800, tauF: 0, proto: 'train', nsp: 10, freq: 20, tstop: 600 } },
    'stp-fac': { group: 'Short-term plasticity', label: 'Facilitating synapse', note: 'U = 0.03, τ_D = 130 ms, τ_F = 530 ms: the facilitating pyramid → interneuron synapses of Markram, Wang & Tsodyks (1998). Low initial release grows spike by spike.',
      s: { ...OFF, on_ampa: true, mode: 'vc', stp: true, U: 0.03, tauD: 130, tauF: 530, proto: 'train', nsp: 10, freq: 20, tstop: 600 } },
    'sc-ppf': { group: 'Short-term plasticity', label: 'Schaffer collateral paired-pulse facilitation', note: 'Illustrative CA3 → CA1 settings (U = 0.2, τ_F = 300 ms, τ_D = 200 ms; not fitted) giving a paired-pulse ratio near 1.4 at 50 ms, the low-release-probability facilitation typical of this pathway. Vary the interval, or open the STP tab for the whole PPR curve.',
      s: { ...OFF, on_ampa: true, on_nmda: true, mode: 'vc', stp: true, U: 0.2, tauD: 200, tauF: 300, proto: 'pair', isi: 50, tstop: 250 } },
    'tbs': { group: 'Short-term plasticity', label: 'Theta-burst stimulation', note: 'Five bursts of four spikes at 100 Hz, repeated at 5 Hz: the classic LTP induction pattern at CA1 synapses (Larson, Wong & Lynch 1986). Within each burst the NMDA conductance summates and depolarization relieves its Mg²⁺ block.',
      s: { ...OFF, on_ampa: true, on_nmda: true, g_ampa: 2, g_nmda: 1.5, proto: 'tbs', tstop: 1000 } },
    'stdp-pair': { group: 'Long-term plasticity', label: 'STDP: pair-based window', note: 'Pre before post strengthens, post before pre weakens, each with its own time constant (τ₊ = 16.8, τ₋ = 33.7 ms, fitted by Bi & Poo 2001 to hippocampal cultures). Open the STDP tab, then try 20–50 Hz pairing.',
      s: { ...OFF, on_ampa: true, rule: 'pair' }, tab: 'stdp' },
    'stdp-triplet': { group: 'Long-term plasticity', label: 'STDP: triplet rule and frequency', note: 'Pfister & Gerstner (2006) triplet rule, visual-cortex fit (all-to-all). At 1 Hz pre-before-post gives almost no LTP; at 40–50 Hz both orders give LTP, as Sjöström et al. (2001) found. A pair rule cannot produce that.',
      s: { ...OFF, on_ampa: true, rule: 'triplet', fpair: 1 }, tab: 'stdp' },
    'stdp-ca': { group: 'Long-term plasticity', label: 'STDP from calcium thresholds', note: 'Graupner & Brunel (2012), cortical-slice fit. Each pre and post spike adds calcium; time spent above θ_d depresses, above θ_p potentiates. The window follows from how the two calcium transients add up at each Δt.',
      s: { ...OFF, on_ampa: true, rule: 'ca' }, tab: 'stdp' },
  };

  /* ---------- presynaptic spike patterns ---------- */
  function trainOf(S) {
    const d = S.delay, out = [];
    if (S.proto === 'single') out.push(d);
    else if (S.proto === 'pair') out.push(d, d + S.isi);
    else if (S.proto === 'train') for (let i = 0; i < S.nsp; i++) out.push(d + i * 1000 / S.freq);
    else if (S.proto === 'tbs') for (let b = 0; b < S.nb; b++) for (let i = 0; i < S.bsz; i++) out.push(d + b * 1000 / S.bif + i * 1000 / S.bf);
    else if (S.proto === 'poisson') { const u = WB.rng(S.seed); let t = d; for (;;) { t += -Math.log(1 - u()) * 1000 / Math.max(S.rate, 1e-6); if (t >= d + S.pdur) break; out.push(t); } }
    return out.filter(t => t >= 0 && t < S.tstop).sort((a, b) => a - b);
  }

  /* ---------- Tsodyks–Markram short-term plasticity ----------
     u: utilization (release probability-like), R: available resources. Before spike n+1, after an interval Δ:
       u ← U + u(1 − U)e^{−Δ/τF},   R ← 1 + (R(1 − u_prev) − 1)e^{−Δ/τD}.   Efficacy of spike n = u_n R_n / U (spike 1 = 1). */
  function tmEff(times, U, tauD, tauF) {
    const out = []; let u = U, R = 1, prev = null;
    times.forEach(t => {
      if (prev !== null) { const D = t - prev, eF = tauF > 0 ? Math.exp(-D / tauF) : 0, eD = Math.exp(-D / tauD); R = 1 + (R * (1 - u) - 1) * eD; u = U + u * (1 - U) * eF; }
      out.push(u * R / U); prev = t;
    });
    return out;
  }
  /** Paired-pulse ratio of release (A₂/A₁) at interval D. */
  const ppr = (U, tauD, tauF, D) => { const eF = tauF > 0 ? Math.exp(-D / tauF) : 0; return (U + U * (1 - U) * eF) / U * (1 - U * Math.exp(-D / tauD)); };
  /** Steady-state efficacy u·R/U for a regular train at f Hz. */
  const tmSteady = (U, tauD, tauF, f) => { const D = 1000 / f, eF = tauF > 0 ? Math.exp(-D / tauF) : 0, eD = Math.exp(-D / tauD), u = U / (1 - (1 - U) * eF), R = (1 - eD) / (1 - (1 - u) * eD); return u * R / U; };

  /* ---------- receptor setup for one run ---------- */
  function receptorsOf(S) {
    return R_ORDER.filter(k => S['on_' + k]).map(k => {
      const r = REC[k], o = { k, exc: r.exc, E: S['E_' + k], g: S['g_' + k], mg: !!r.mg, gprot: !!r.gprot };
      let tr = Math.max(1e-3, S['tr_' + k]), td = Math.max(tr * 1.001, S['td_' + k]);
      o.tr = tr; o.td = td;
      const tpk = tr * td / (td - tr) * Math.log(td / tr); o.norm = 1 / (Math.exp(-tpk / td) - Math.exp(-tpk / tr));
      if (S.level === 'kin') {
        if (r.gprot) o.kin = 'gprot';
        else { o.kin = 'two'; o.a = S['ka_' + k]; o.b = S['kb_' + k]; const rinf = o.a * S.Tmax / (o.a * S.Tmax + o.b); o.rpk = rinf * (1 - Math.exp(-(o.a * S.Tmax + o.b) * S.Tdur)); }
      }
      return o;
    });
  }

  /* ---------- the simulation ---------- */
  function simulate(S) {
    const dt = S.dt, n = Math.round(S.tstop / dt) + 1;
    const exc = trainOf(S), inh = S.inh_on ? exc.map(t => t + S.inh_lag).filter(t => t >= 0 && t < S.tstop) : [];
    const eff = S.stp ? tmEff(exc, S.U, S.tauD, S.tauF) : exc.map(() => 1);
    const effInh = inh.map(() => 1);                                  // STP acts on excitatory release only
    const recs = receptorsOf(S), vc = S.mode === 'vc', lif = S.mode === 'lif';
    const V0 = vc ? S.vhold : S.EL + S.idc / S.gL, Vref = V0;            // current-based synapses use the driving force at rest
    const t = new Float64Array(n), V = new Float64Array(n), I = new Float64Array(n), g = {}, cur = {};
    recs.forEach(r => { g[r.k] = new Float64Array(n); cur[r.k] = new Float64Array(n); r.x = 0; r.y = 0; r.r = 0; r.s = 0; r.pend = -1; r.pamp = 0; });
    const evE = exc.map((tt, i) => [Math.round(tt / dt), eff[i]]), evI = inh.map((tt, i) => [Math.round(tt / dt), effInh[i]]);
    let ie = 0, ii = 0, v = V0, refUntil = -1; const spikes = [];
    for (let s = 0; s < n; s++) {
      const time = s * dt; t[s] = time;
      // presynaptic events arriving at this step
      while (ie < evE.length && evE[ie][0] <= s) { const a = evE[ie][1]; recs.forEach(r => r.exc && hit(r, a, s)); ie++; }
      while (ii < evI.length && evI[ii][0] <= s) { const a = evI[ii][1]; recs.forEach(r => !r.exc && hit(r, a, s)); ii++; }
      // conductances at this step
      let G = S.gL, GE = S.gL * S.EL, Icur = 0, Itot = 0;
      recs.forEach(r => {
        let gg;
        if (r.kin === 'two') gg = r.g * r.r / r.rpk;
        else if (r.kin === 'gprot') { const sn = Math.pow(Math.max(r.s, 0), S.nB); gg = r.g * sn / (sn + S.Kd); }
        else if (S.level === 'exp') gg = r.g * r.y;
        else gg = r.g * r.norm * (r.y - r.x);
        g[r.k][s] = gg;
        const Vb = S.level === 'cur' ? Vref : (vc ? S.vhold : v), B = r.mg ? mgB(Vb, S.mg) : 1, ic = gg * B * (Vb - r.E);
        cur[r.k][s] = ic; Itot += ic;
        if (S.level === 'cur') Icur += ic; else { G += gg * B; GE += gg * B * r.E; }
      });
      I[s] = Itot;
      // membrane: exact exponential step with conductances frozen over dt (V[s] stores the state after the step)
      let spiked = false;
      if (vc) v = S.vhold;
      else if (lif && time < refUntil) v = S.Vr;
      else {
        const Vinf = (GE - Icur + S.idc) / G, tau = S.C / G;
        v = Vinf + (v - Vinf) * Math.exp(-dt / tau);
        if (lif && v >= S.Vth) { spikes.push(time); v = S.Vr; refUntil = time + S.tref; spiked = true; }
      }
      V[s] = spiked ? 20 : v;                        // spikes drawn to +20 mV for visibility
      advance(recs, S, dt, s);
    }
    V[0] = V0;
    return { t, V, I, g, cur, exc, inh, eff, spikes, V0, vc, recs: recs.map(r => r.k) };

    function hit(r, a, s) {
      if (r.kin) { r.pend = s + Math.max(1, Math.round(S.Tdur / dt)); r.pamp = S.Tmax * a; }
      else { r.x += a; r.y += a; }
    }
  }
  /** Advance every receptor's state by one step (exact for frozen transmitter). */
  function advance(recs, S, dt, s) {
    recs.forEach(r => {
      if (r.kin === 'two') {
        const T = s < r.pend ? r.pamp : 0, k = r.a * T + r.b, rinf = r.a * T / k;
        r.r = rinf + (r.r - rinf) * Math.exp(-k * dt);
      } else if (r.kin === 'gprot') {
        const T = s < r.pend ? r.pamp : 0, k = S.K1 * T + S.K2, rinf = S.K1 * T / k;
        r.r = rinf + (r.r - rinf) * Math.exp(-k * dt);
        r.s += dt * (S.K3 * r.r - S.K4 * r.s);
      } else { r.x *= Math.exp(-dt / r.tr); r.y *= Math.exp(-dt / r.td); }
    });
  }

  /** Response to each excitatory spike, measured as the extremum from the pre-stimulus baseline until the next spike (max 150 ms). */
  function eventAmps(res) {
    const y = res.vc ? res.I : res.V, base = res.vc ? 0 : res.V0, dt = res.t[1] - res.t[0], n = y.length, ev = res.exc.length ? res.exc : res.inh;
    return ev.map((t0, k) => {
      const a = Math.round(t0 / dt), b = Math.min(n, Math.round(Math.min(ev[k + 1] ?? Infinity, t0 + 150) / dt) + 1);
      let best = 0; for (let i = a; i < b; i++) { const d = y[i] - base; if (Math.abs(d) > Math.abs(best) && y[i] !== 20) best = d; }
      return best;
    });
  }

  /* ---------- NMDA/AMPA ratio, as measured in slices ----------
     AMPA: peak EPSC at −70 mV. NMDA: current at +40 mV, 50 ms after the stimulus (AMPA has decayed by then). */
  function nmdaAmpaRatio(S) {
    const B = { ...S, mode: 'vc', proto: 'single', delay: 20, tstop: 250, stp: false, on_ampa: true, on_nmda: true, on_gabaa: false, on_gabab: false };
    const lo = simulate({ ...B, vhold: -70 }), hi = simulate({ ...B, vhold: 40 }), dt = S.dt;
    let pk = 0; lo.I.forEach(v => { if (v < pk) pk = v; });
    const i50 = Math.round(70 / dt), late = hi.I[i50];
    return { lo, hi, ampa: pk, nmda: late, ratio: Math.abs(late / pk) };
  }

  /* ---------- long-term plasticity rules ---------- */
  /** Pairing protocol: n pairs at f Hz; post spike at pre + Δt (Δt = t_post − t_pre). */
  function pairing(n, f, dtp) { const T = 1000 / f, t0 = 100 + Math.max(0, -dtp), pre = [], post = []; for (let k = 0; k < n; k++) { pre.push(t0 + k * T); post.push(t0 + k * T + dtp); } return { pre, post }; }
  function mergeEv(pre, post) { return pre.map(t => [t, 0]).concat(post.map(t => [t, 1])).sort((a, b) => a[0] - b[0] || a[1] - b[1]); }
  /** Pair-based additive STDP with exponential traces. Returns the total change in % of the initial weight. */
  function pairRule(S, pre, post) {
    let x = 0, y = 0, w = 0, last = 0; const all = S.nn === 'all';
    mergeEv(pre, post).forEach(([tt, who]) => {
      const d = tt - last; x *= Math.exp(-d / S.taup); y *= Math.exp(-d / S.taum); last = tt;
      if (who === 0) { w -= S.Am * y; x = all ? x + 1 : 1; } else { w += S.Ap * x; y = all ? y + 1 : 1; }
    });
    return w;
  }
  /** Triplet rule (Pfister & Gerstner 2006). r1, r2 presynaptic traces; o1, o2 postsynaptic traces. Amplitudes in %. */
  function tripletRule(S, pre, post) {
    let r1 = 0, r2 = 0, o1 = 0, o2 = 0, w = 0, last = 0; const all = S.nn === 'all';
    mergeEv(pre, post).forEach(([tt, who]) => {
      const d = tt - last; r1 *= Math.exp(-d / S.taup); r2 *= Math.exp(-d / S.taux); o1 *= Math.exp(-d / S.taum); o2 *= Math.exp(-d / S.tauy); last = tt;
      if (who === 0) { w -= o1 * (S.a2m + S.a3m * r2); r1 = all ? r1 + 1 : 1; r2 = all ? r2 + 1 : 1; }
      else { w += r1 * (S.a2p + S.a3p * o2); o1 = all ? o1 + 1 : 1; o2 = all ? o2 + 1 : 1; }
    });
    return w;
  }
  /** Calcium-based rule (Graupner & Brunel 2012), deterministic (noise σ = 0), computed exactly between spikes:
       c jumps by C_pre (after delay D) or C_post and decays with τ_Ca;
       τ dρ/dt = −ρ(1−ρ)(ρ*−ρ) + γ_p(1−ρ)Θ[c−θ_p] − γ_d ρ Θ[c−θ_d].
     Returns Δρ and the total time calcium spent above each threshold. */
  function caRule(S, pre, post) {
    const ev = pre.map(t => [t + S.Dca, S.cpre]).concat(post.map(t => [t, S.cpost])).sort((a, b) => a[0] - b[0]);
    let c = 0, last = ev.length ? ev[0][0] : 0, rho = S.rho0, ap = 0, ad = 0;
    const f = (r, P, D) => (-r * (1 - r) * (S.rhostar - r) + S.gamp * (1 - r) * P - S.gamd * r * D) / S.taurho;
    const integ = (dur, P, D) => { let left = dur; while (left > 1e-9) { const h = Math.min(20, left), k1 = f(rho, P, D), k2 = f(rho + h / 2 * k1, P, D), k3 = f(rho + h / 2 * k2, P, D), k4 = f(rho + h * k3, P, D); rho += h / 6 * (k1 + 2 * k2 + 2 * k3 + k4); left -= h; } };
    for (let i = 0; i < ev.length; i++) {
      const [tt, amp] = ev[i]; c = c * Math.exp(-(tt - last) / S.tauca) + amp; last = tt;
      const gap = i + 1 < ev.length ? ev[i + 1][0] - tt : Infinity;
      const above = th => c > th ? Math.min(gap, S.tauca * Math.log(c / th)) : 0;
      const tp = above(S.thp), td = above(S.thd); ap += tp; ad += td;
      integ(tp, 1, 1); integ(td - tp, 0, 1); if (isFinite(gap)) integ(gap - td, 0, 0);
    }
    return { drho: rho - S.rho0, rho, ap, ad };
  }
  function ruleValue(S, pre, post) { return S.rule === 'pair' ? pairRule(S, pre, post) : S.rule === 'triplet' ? tripletRule(S, pre, post) : caRule(S, pre, post).drho; }
  const DT_GRID = Array.from({ length: 50 }, (_, i) => -98 + 4 * i);
  function stdpWindow(S, dts = DT_GRID) { return dts.map(d => { const p = pairing(S.npair, S.fpair, d); return { dt: d, dw: ruleValue(S, p.pre, p.post) }; }); }
  const F_GRID = [0.1, 0.5, 1, 2, 5, 10, 15, 20, 30, 40, 50];
  function stdpFreq(S, d = 10) { return F_GRID.map(f => { const P = pairing(S.npair, f, d), M = pairing(S.npair, f, -d); return { f, plus: ruleValue(S, P.pre, P.post), minus: ruleValue(S, M.pre, M.post) }; }); }
  /** Calcium transient for one pairing at Δt, for display. */
  function caTrace(S, dtp) {
    const pre = 60 + Math.max(0, -dtp), post = pre + dtp, t = [], c = [];
    for (let x = 0; x <= 260; x += 0.1) { let v = 0; if (x >= pre + S.Dca) v += S.cpre * Math.exp(-(x - pre - S.Dca) / S.tauca); if (x >= post) v += S.cpost * Math.exp(-(x - post) / S.tauca); t.push(+x.toFixed(1)); c.push(v); }
    return { t, c, pre, post, one: caRule({ ...S }, [pre], [post]) };
  }

  /* ---------- Python export ---------- */
  const pyNum = v => typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(+v.toPrecision(8))) : JSON.stringify(v);
  const pyB = b => b ? 'True' : 'False';
  function pythonCode(S) {
    const on = R_ORDER.filter(k => S['on_' + k]);
    const rec = on.map(k => `    ('${k}', ${pyB(REC[k].exc)}, ${pyNum(S['g_' + k])}, ${pyNum(S['E_' + k])}, ${pyNum(S['tr_' + k])}, ${pyNum(S['td_' + k])}, ${REC[k].ka ? pyNum(S['ka_' + k]) : 'None'}, ${REC[k].kb ? pyNum(S['kb_' + k]) : 'None'}),`).join('\n');
    const train = { single: `[DELAY]`, pair: `[DELAY, DELAY + ${pyNum(S.isi)}]`, train: `[DELAY + i * 1000 / ${pyNum(S.freq)} for i in range(${S.nsp})]`,
      tbs: `[DELAY + b * 1000 / ${pyNum(S.bif)} + i * 1000 / ${pyNum(S.bf)} for b in range(${S.nb}) for i in range(${S.bsz})]`,
      poisson: `list(DELAY + np.cumsum(rng.exponential(1000 / ${pyNum(S.rate)}, size=int(${pyNum(S.rate)} * ${pyNum(S.pdur)} / 1000 * 3 + 20))))` }[S.proto];
    const rule = S.rule;
    return `"""Exported from the Little Neural Guide · Synapse & plasticity workbench.
Presynaptic spikes -> receptor conductances -> one postsynaptic compartment, with the same
update scheme as the page (exact exponential steps, dt = ${pyNum(S.dt)} ms). Units: ms, mV, nS, pF, pA.
Then the ${rule === 'pair' ? 'pair-based' : rule === 'triplet' ? 'triplet' : 'calcium-based'} STDP window for the plasticity settings.${S.proto === 'poisson' ? '\nPoisson spike times come from NumPy, so they differ in detail from the page.' : ''}"""
import math
import numpy as np
import matplotlib.pyplot as plt

# ---------- postsynaptic compartment ----------
LEVEL = '${S.level}'          # 'cur' current-based, 'exp' single exponential, 'dual' rise+decay, 'kin' receptor kinetics
MODE = '${S.mode}'             # 'cc' passive current clamp, 'lif' with threshold, 'vc' voltage clamp
C, G_L, E_L, I_DC = ${pyNum(S.C)}, ${pyNum(S.gL)}, ${pyNum(S.EL)}, ${pyNum(S.idc)}      # pF, nS, mV, pA
V_TH, V_RESET, T_REF, V_HOLD = ${pyNum(S.Vth)}, ${pyNum(S.Vr)}, ${pyNum(S.tref)}, ${pyNum(S.vhold)}
MG = ${pyNum(S.mg)}                          # extracellular [Mg2+], mM
T_MAX, T_DUR = ${pyNum(S.Tmax)}, ${pyNum(S.Tdur)}         # transmitter pulse (mM, ms) for the kinetic level
K1, K2, K3, K4, KD, N_B = ${pyNum(S.K1)}, ${pyNum(S.K2)}, ${pyNum(S.K3)}, ${pyNum(S.K4)}, ${pyNum(S.Kd)}, ${pyNum(S.nB)}   # GABA_B G-protein cascade

# (name, excitatory?, peak conductance nS, reversal mV, tau_rise ms, tau_decay ms, alpha /mM/ms, beta /ms)
RECEPTORS = [
${rec || "    # no receptor switched on"}
]

# ---------- presynaptic spikes and short-term plasticity ----------
DT, T_STOP, DELAY = ${pyNum(S.dt)}, ${pyNum(S.tstop)}, ${pyNum(S.delay)}
rng = np.random.default_rng(${S.seed})
exc = sorted(t for t in ${train} if 0 <= t < T_STOP${S.proto === 'poisson' ? ` and t < DELAY + ${pyNum(S.pdur)}` : ''})
INH_LAG = ${S.inh_on ? pyNum(S.inh_lag) : 'None'}   # inhibitory spikes follow excitatory ones by this delay (ms)
inh = [t + INH_LAG for t in exc if 0 <= t + INH_LAG < T_STOP] if INH_LAG is not None else []
STP, U, TAU_D, TAU_F = ${pyB(S.stp)}, ${pyNum(S.U)}, ${pyNum(S.tauD)}, ${pyNum(S.tauF)}

def tsodyks_markram(times, U, tau_d, tau_f):
    """Efficacy u*R/U of each spike (first spike = 1)."""
    out, u, R, prev = [], U, 1.0, None
    for t in times:
        if prev is not None:
            D = t - prev
            R = 1 + (R * (1 - u) - 1) * math.exp(-D / tau_d)
            u = U + u * (1 - U) * (math.exp(-D / tau_f) if tau_f > 0 else 0.0)
        out.append(u * R / U)
        prev = t
    return out

eff = tsodyks_markram(exc, U, TAU_D, TAU_F) if STP else [1.0] * len(exc)

def mg_block(V):
    """Jahr & Stevens (1990)."""
    return 1.0 / (1.0 + math.exp(-0.062 * V) * MG / 3.57)

# ---------- simulate ----------
def simulate():
    n = int(round(T_STOP / DT)) + 1
    V0 = V_HOLD if MODE == 'vc' else E_L + I_DC / G_L
    st = []
    for name, is_exc, g, E, tr, td, a, b in RECEPTORS:
        td = max(td, tr * 1.001)
        tpk = tr * td / (td - tr) * math.log(td / tr)
        r = dict(name=name, exc=is_exc, g=g, E=E, tr=tr, td=td, a=a, b=b, x=0.0, y=0.0, r=0.0, s=0.0, pend=-1, pamp=0.0,
                 norm=1 / (math.exp(-tpk / td) - math.exp(-tpk / tr)))
        if LEVEL == 'kin' and name != 'gabab':
            rinf = a * T_MAX / (a * T_MAX + b)
            r['rpk'] = rinf * (1 - math.exp(-(a * T_MAX + b) * T_DUR))
        st.append(r)
    ev_e = [(int(round(t / DT)), e) for t, e in zip(exc, eff)]
    ev_i = [(int(round(t / DT)), 1.0) for t in inh]
    t_rec, v_rec, i_rec, spikes = np.arange(n) * DT, np.empty(n), np.empty(n), []
    v, ref_until, ie, ii = V0, -1.0, 0, 0
    for s in range(n):
        time = s * DT
        for queue, excit in ((ev_e, True), (ev_i, False)):
            k = ie if excit else ii
            while k < len(queue) and queue[k][0] <= s:
                amp = queue[k][1]
                for r in st:
                    if r['exc'] != excit:
                        continue
                    if LEVEL == 'kin':
                        r['pend'], r['pamp'] = s + max(1, int(round(T_DUR / DT))), T_MAX * amp
                    else:
                        r['x'] += amp; r['y'] += amp
                k += 1
            if excit: ie = k
            else: ii = k
        G, GE, I_cur, I_tot = G_L, G_L * E_L, 0.0, 0.0
        for r in st:
            if LEVEL == 'kin' and r['name'] == 'gabab':
                sn = max(r['s'], 0.0) ** N_B; g = r['g'] * sn / (sn + KD)
            elif LEVEL == 'kin':
                g = r['g'] * r['r'] / r['rpk']
            elif LEVEL == 'exp':
                g = r['g'] * r['y']
            else:
                g = r['g'] * r['norm'] * (r['y'] - r['x'])
            Vb = V0 if LEVEL == 'cur' else (V_HOLD if MODE == 'vc' else v)
            B = mg_block(Vb) if r['name'] == 'nmda' else 1.0
            I_tot += g * B * (Vb - r['E'])
            if LEVEL == 'cur':
                I_cur += g * B * (Vb - r['E'])
            else:
                G += g * B; GE += g * B * r['E']
        i_rec[s] = I_tot
        spiked = False
        if MODE == 'vc':
            v = V_HOLD
        elif MODE == 'lif' and time < ref_until:
            v = V_RESET
        else:
            v_inf, tau = (GE - I_cur + I_DC) / G, C / G
            v = v_inf + (v - v_inf) * math.exp(-DT / tau)
            if MODE == 'lif' and v >= V_TH:
                spikes.append(time); v, ref_until, spiked = V_RESET, time + T_REF, True
        v_rec[s] = 20.0 if spiked else v          # spikes drawn to +20 mV for visibility
        for r in st:                               # advance receptor states one step
            T = r['pamp'] if s < r['pend'] else 0.0
            if LEVEL == 'kin' and r['name'] == 'gabab':
                k = K1 * T + K2; rinf = K1 * T / k
                r['r'] = rinf + (r['r'] - rinf) * math.exp(-k * DT)
                r['s'] += DT * (K3 * r['r'] - K4 * r['s'])
            elif LEVEL == 'kin':
                k = r['a'] * T + r['b']; rinf = r['a'] * T / k
                r['r'] = rinf + (r['r'] - rinf) * math.exp(-k * DT)
            else:
                r['x'] *= math.exp(-DT / r['tr']); r['y'] *= math.exp(-DT / r['td'])
    v_rec[0] = V0
    return t_rec, v_rec, i_rec, spikes

# ---------- long-term plasticity: STDP window ----------
RULE, NEAREST = '${rule}', ${pyB(S.nn === 'near')}
N_PAIR, F_PAIR = ${S.npair}, ${pyNum(S.fpair)}
A_P, A_M, TAU_P, TAU_M = ${pyNum(S.Ap)}, ${pyNum(S.Am)}, ${pyNum(S.taup)}, ${pyNum(S.taum)}            # pair rule, % per pair
A2P, A3P, A2M, A3M, TAU_X, TAU_Y = ${pyNum(S.a2p)}, ${pyNum(S.a3p)}, ${pyNum(S.a2m)}, ${pyNum(S.a3m)}, ${pyNum(S.taux)}, ${pyNum(S.tauy)}   # triplet, %
CA = dict(tau=${pyNum(S.tauca)}, c_pre=${pyNum(S.cpre)}, c_post=${pyNum(S.cpost)}, th_d=${pyNum(S.thd)}, th_p=${pyNum(S.thp)},
          g_d=${pyNum(S.gamd)}, g_p=${pyNum(S.gamp)}, tau_rho=${pyNum(S.taurho)}, rho_star=${pyNum(S.rhostar)}, D=${pyNum(S.Dca)}, rho0=${pyNum(S.rho0)})

def pairing(n, f, dt_pp):
    T, t0 = 1000 / f, 100 + max(0, -dt_pp)
    pre = [t0 + k * T for k in range(n)]
    return pre, [p + dt_pp for p in pre]

def events(pre, post):
    return sorted([(t, 0) for t in pre] + [(t, 1) for t in post])

def pair_rule(pre, post):
    x = y = w = last = 0.0
    for t, who in events(pre, post):
        x *= math.exp(-(t - last) / TAU_P); y *= math.exp(-(t - last) / TAU_M); last = t
        if who == 0:
            w -= A_M * y; x = 1.0 if NEAREST else x + 1
        else:
            w += A_P * x; y = 1.0 if NEAREST else y + 1
    return w

def triplet_rule(pre, post):
    r1 = r2 = o1 = o2 = w = last = 0.0
    for t, who in events(pre, post):
        d = t - last; last = t
        r1 *= math.exp(-d / TAU_P); r2 *= math.exp(-d / TAU_X); o1 *= math.exp(-d / TAU_M); o2 *= math.exp(-d / TAU_Y)
        if who == 0:
            w -= o1 * (A2M + A3M * r2); r1, r2 = (1.0, 1.0) if NEAREST else (r1 + 1, r2 + 1)
        else:
            w += r1 * (A2P + A3P * o2); o1, o2 = (1.0, 1.0) if NEAREST else (o1 + 1, o2 + 1)
    return w

def calcium_rule(pre, post, p=CA):
    """Graupner & Brunel (2012), deterministic, exact between spikes. Returns delta rho."""
    ev = sorted([(t + p['D'], p['c_pre']) for t in pre] + [(t, p['c_post']) for t in post])
    rho, c, last = p['rho0'], 0.0, ev[0][0]
    def f(r, P, D):
        return (-r * (1 - r) * (p['rho_star'] - r) + p['g_p'] * (1 - r) * P - p['g_d'] * r * D) / p['tau_rho']
    def integrate(r, dur, P, D):
        while dur > 1e-9:
            h = min(20.0, dur); k1 = f(r, P, D); k2 = f(r + h / 2 * k1, P, D); k3 = f(r + h / 2 * k2, P, D); k4 = f(r + h * k3, P, D)
            r += h / 6 * (k1 + 2 * k2 + 2 * k3 + k4); dur -= h
        return r
    for i, (t, amp) in enumerate(ev):
        c = c * math.exp(-(t - last) / p['tau']) + amp; last = t
        gap = ev[i + 1][0] - t if i + 1 < len(ev) else math.inf
        above = lambda th: min(gap, p['tau'] * math.log(c / th)) if c > th else 0.0
        tp, td = above(p['th_p']), above(p['th_d'])
        rho = integrate(rho, tp, 1, 1); rho = integrate(rho, td - tp, 0, 1)
        if math.isfinite(gap):
            rho = integrate(rho, gap - td, 0, 0)
    return rho - p['rho0']

rule = {'pair': pair_rule, 'triplet': triplet_rule, 'ca': calcium_rule}[RULE]

if __name__ == '__main__':
    t, v, i_syn, spikes = simulate()
    dts = np.arange(-98, 99, 4)
    dw = [rule(*pairing(N_PAIR, F_PAIR, d)) for d in dts]
    fig, ax = plt.subplots(1, 2, figsize=(11, 3.6))
    if MODE == 'vc':
        ax[0].plot(t, i_syn); ax[0].set_ylabel('synaptic current (pA, inward < 0)')
    else:
        ax[0].plot(t, v); ax[0].set_ylabel('V (mV)')
    ax[0].plot(exc, [ax[0].get_ylim()[1]] * len(exc), '|', ms=12, color='k')
    ax[0].set_xlabel('time (ms)'); ax[0].set_title(f'{len(exc)} presynaptic spikes' + (f', {len(spikes)} postsynaptic' if MODE == 'lif' else ''))
    ax[1].axhline(0, color='0.6', lw=0.8); ax[1].axvline(0, color='0.6', lw=0.8)
    ax[1].plot(dts, dw, 'o-', ms=3)
    ax[1].set_xlabel('Δt = t_post − t_pre (ms)'); ax[1].set_ylabel('Δρ' if RULE == 'ca' else 'Δw (% of initial)')
    ax[1].set_title(f'{RULE} rule, {N_PAIR} pairings at {F_PAIR} Hz')
    fig.tight_layout(); plt.show()
`;
  }

  window.SW = { REC, R_ORDER, DEF, PRESETS, mgB, trainOf, tmEff, ppr, tmSteady, simulate, eventAmps, nmdaAmpaRatio, pairing, pairRule, tripletRule, caRule, ruleValue, stdpWindow, stdpFreq, caTrace, F_GRID, DT_GRID, pythonCode };
})();
