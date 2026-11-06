/* Extracted from Little Neural Guide modellab.js [117198:137515] — section: A. PATCH CLAMP */
/* ======================================================================
   A. PATCH CLAMP → FIT A MODEL → VALIDATE
   ====================================================================== */
/* Single-compartment CA1-like cell: leak + h-current (activated by hyperpolarization).
   Units: C pF, g nS, V mV, I pA, t ms  (nS·mV = pA; pA/pF = mV/ms). */
const EPH = { Eh: -30, amps: [-150, -100, -50, 50], T: 700, on: 100, off: 600, dt: 0.1, every: 10 };
const rInf = V => 1 / (1 + Math.exp((V + 82) / 9));
const drInf = V => { const e = Math.exp((V + 82) / 9); return -e / (9 * (1 + e) ** 2); };
const EPH_TRUE = { C: 150, gL: 7, EL: -70, gh: 4, tauh: 45 };
function ephRest(p) {                               // resting V: leak current balances h-current
  let a = -110, b = -30; const f = V => p.gL * (V - p.EL) + p.gh * rInf(V) * (V - EPH.Eh);
  for (let k = 0; k < 60; k++) { const m = (a + b) / 2; (f(m) > 0) ? b = m : a = m; } return (a + b) / 2;
}
/** Simulate the step protocol; returns one downsampled trace per current amplitude. */
function ephSim(p) {
  const V0 = ephRest(p), n = Math.round(EPH.T / EPH.dt), out = [];
  for (const I of EPH.amps) {
    let V = V0, r = rInf(V0); const tr = new Float64Array(Math.floor(n / EPH.every) + 1);
    for (let k = 0; k <= n; k++) {
      if (k % EPH.every === 0) tr[k / EPH.every] = V;
      const t = k * EPH.dt, Iapp = t >= EPH.on && t < EPH.off ? I : 0;
      const dV = (Iapp - p.gL * (V - p.EL) - p.gh * r * (V - EPH.Eh)) / p.C, dr = (rInf(V) - r) / p.tauh;
      V += EPH.dt * dV; r += EPH.dt * dr;
    }
    out.push(tr);
  }
  return { V0, traces: out, t: [...out[0].keys()].map(k => k * EPH.dt * EPH.every) };
}
/** Small-signal impedance |Z(f)| in MΩ around rest (linearized leak + h-current). */
function ephZ(p, freqs) {
  const V0 = ephRest(p), gtot = p.gL + p.gh * rInf(V0), gslow = p.gh * (V0 - EPH.Eh) * drInf(V0);
  return freqs.map(f => { const w = 2 * Math.PI * f / 1000, d = 1 + (w * p.tauh) ** 2;
    const re = gtot + gslow / d, im = w * p.C - gslow * w * p.tauh / d; return 1000 / Math.hypot(re, im); });
}
/** Standard electrophysiology features measured from step responses. */
function ephFeatures(traces, t) {
  const idx = tt => Math.round(tt / (EPH.dt * EPH.every)), mean = (a, s, e) => { let z = 0; for (let i = s; i < e; i++) z += a[i]; return z / (e - s); };
  const rest = mean(traces[2], 0, idx(95)), ss50 = mean(traces[2], idx(550), idx(598));
  const Rin = (ss50 - rest) / -50 * 1000;                       // MΩ
  const tr = traces[2], target = rest + 0.632 * (Math.min(...tr.slice(idx(100), idx(250))) - rest);
  let tau = NaN; for (let i = idx(100); i < idx(300); i++) if (tr[i] <= target) { tau = t[i] - 100; break; }
  const big = traces[0], vmin = Math.min(...big.slice(idx(100), idx(400))), vss = mean(big, idx(550), idx(598));
  const sag = (vss - rest) / (vmin - rest);
  return { rest, Rin, tau, sag };
}
/** Nelder–Mead on log-parameters, stepped so the page can animate it. */
function makeNM(f, x0, scale = 0.25) {
  const n = x0.length; let S = [x0.slice()]; for (let i = 0; i < n; i++) { const x = x0.slice(); x[i] += scale; S.push(x); }
  let F = S.map(f), it = 0;
  return { step() {
    const o = [...S.keys()].sort((a, b) => F[a] - F[b]); S = o.map(i => S[i]); F = o.map(i => F[i]); it++;
    const c = Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += S[i][j] / n;
    const pt = a => c.map((v, j) => v + a * (S[n][j] - v)), xr = pt(-1), fr = f(xr);
    if (fr < F[0]) { const xe = pt(-2), fe = f(xe); [S[n], F[n]] = fe < fr ? [xe, fe] : [xr, fr]; }
    else if (fr < F[n - 1]) { S[n] = xr; F[n] = fr; }
    else { const xc = pt(0.5), fc = f(xc); if (fc < F[n]) { S[n] = xc; F[n] = fc; } else { for (let i = 1; i <= n; i++) { S[i] = S[i].map((v, j) => S[0][j] + 0.5 * (v - S[0][j])); F[i] = f(S[i]); } } }
    const fmin = Math.min(...F), best = F.indexOf(fmin);
    return { x: S[best], f: fmin, it, spread: Math.max(...F) - fmin };
  } };
}

xpages[0].lead = 'Electrophysiology is where most neuron models get their numbers. Here you record standard current-clamp protocols from a CA1-like cell, fit a model to them, and then check it against a measurement it was never fitted to.';
xpages[0].jumps = [['xp-exp', 'The experiment'], ['xp-measure', 'What is measured'], ['xp-fit', 'Fit it'], ['xp-validate', 'Fit vs prediction'], ['code', 'Python']];
xpages[0].html = () => sec('xp-exp', '01 · The experiment', 'Whole-cell patch clamp in a hippocampal slice',
  steps([
    ['Prepare the tissue.', 'A rodent brain is cut into 300–400 µm slices that keep CA1 intact and are kept alive in oxygenated artificial cerebrospinal fluid.'],
    ['Make a seal.', 'A glass pipette (tip ≈ 1 µm, filled with an intracellular-like solution) is pressed onto a pyramidal cell soma under a microscope. Gentle suction forms a gigaohm seal, then ruptures the membrane patch so the pipette and cytoplasm connect (“whole-cell”).'],
    ['Choose the mode.', '<b>Current clamp</b> injects a known current and records voltage, which is what this page shows. <b>Voltage clamp</b> holds voltage and records the current needed, used to measure channel kinetics directly.'],
    ['Run protocols.', 'Hyperpolarizing and depolarizing current steps (e.g. −150 to +50 pA for 500 ms) reveal passive properties and the h-current “sag”. Larger steps give rheobase and f–I curves. A chirp (ZAP) current sweeping 0.5–20 Hz measures impedance and resonance.'],
    ['Watch the caveats.', 'Series resistance, liquid-junction potential (often ~10 mV), temperature, animal age and the internal solution all shift the numbers. Report them, because a model fitted to one condition inherits its biases.'],
  ]))
  + sec('xp-measure', '02 · What is measured', 'Features you can read off the traces',
    table(['Feature', 'How it is measured', 'Typical rat CA1 pyramidal', 'What it constrains in a model'], [
      ['Resting potential', 'Mean V with no current', '≈ −60 to −70 mV', 'Reversal potentials and the balance of resting conductances'],
      ['Input resistance R<sub>in</sub>', 'ΔV at steady state ÷ injected current (small step)', '≈ 50–150 MΩ', 'Total membrane conductance (leak + active at rest)'],
      ['Membrane time constant τ<sub>m</sub>', 'Time to reach 63% of the voltage deflection', '≈ 15–30 ms', 'C<sub>m</sub> relative to conductance (τ = C/g)'],
      ['Sag ratio', '(steady − rest) ÷ (peak − rest) for a large negative step; 1 = no sag', '≈ 0.75–0.9 at the soma', 'h-current density and kinetics'],
      ['Resonance frequency f<sub>R</sub>', 'Peak of |Z(f)| from a chirp', '≈ 2–7 Hz, voltage-dependent', 'h- and M-current kinetics (see Hu et al., 2002)'],
    ]) + '<p class="muted">Ranges are approximate and depend on preparation, temperature, age and recording conditions.</p>')
  + `<section class="lesson-section lab" id="xp-fit"><p class="eyebrow">03 · Fit it</p><h2>Match the model to the recording</h2>
    <div class="lab-prediction"><b>The task</b><p>The grey traces are a <b>synthetic recording</b>: four current steps generated from a hidden cell model plus 0.4 mV recording noise. Move the sliders until the plum model traces overlay the grey ones, or press <b>Auto-fit</b> to watch an optimizer do it. Aim for an error near the noise level.</p></div>
    <div class="lab-layout ml-layout"><div class="lab-controls"><h3>Model parameters</h3>
      ${ctl('epC', 'Capacitance C', 50, 400, 1, 100, 'pF · sets how fast V changes (τ = C/g).')}
      ${ctl('epgL', 'Leak conductance g<sub>L</sub>', 2, 20, 0.1, 10, 'nS · sets input resistance.')}
      ${ctl('epEL', 'Leak reversal E<sub>L</sub>', -85, -55, 0.5, -65, 'mV · sets resting potential.')}
      ${ctl('epgh', 'h conductance g<sub>h</sub>', 0, 12, 0.1, 1, 'nS · sets sag size.')}
      ${ctl('eptau', 'h time constant τ<sub>h</sub>', 10, 150, 1, 80, 'ms · sets how fast the sag develops.')}
      <div class="lab-actions"><button class="primary" id="epFit">Auto-fit</button><button class="secondary" id="epReset">Reset guess</button><button class="secondary" id="epTruth">Reveal hidden values</button></div>
      <div id="epTable" class="ml-fp"></div></div>
      <div class="ml-figs">
        ${fig('epV', 'ml-h260 wide', 'Current-clamp steps: recording vs model', key([C.muted, 'recording (synthetic)'], [C.plum, 'model']), 'four steps of −150, −100, −50 and +50 pA from 100 to 600 ms. The dip then partial recovery on negative steps is the h-current sag.')}
        ${fig('epR', 'ml-h200', 'Residuals (recording − model)', key([C.ink, 'error, mV']), 'a good fit leaves only flat noise. Systematic bumps show what the model is missing.')}
        ${fig('epErr', 'ml-h200', 'Fitting error over iterations', key([C.ink, 'RMSE (mV)'], [C.muted, 'noise level', 1]), 'the optimizer’s progress. It cannot go below the noise floor.')}
      </div></div>
    <div class="lab-result" id="ml-result" role="status" aria-live="polite"></div>
    <div class="box pink ml-explain"><p class="eyebrow">What’s happening now · updates as you fit</p><div id="ml-explain-body"></div></div></section>`
  + sec('xp-validate', '04 · Fit vs prediction', 'Test the fitted model on held-out data',
    `<p>The model was fitted only to step responses. The same (synthetic) cell was also probed with a chirp current, giving its impedance profile. That measurement was <b>never used in fitting</b>, so agreement here is genuine evidence, not flexibility.</p>
    <div class="ml-figs">${fig('epZ', 'ml-h240 wide', 'Impedance: held-out measurement vs model prediction', key([C.muted, 'chirp measurement (synthetic)'], [C.plum, 'model prediction']), 'impedance magnitude at each input frequency. A peak above the low-frequency value is resonance, generated here by the h-current.')}</div>
    <div class="lab-result" id="epZres"></div>
    <details class="box"><summary>Why parameters can fit well and still be wrong</summary><p>Different parameter combinations can produce almost the same traces. Here, C and g<sub>L</sub> trade off through τ = C/g, and g<sub>h</sub> trades off with τ<sub>h</sub> for the sag. This is <b>identifiability</b>: the data may pin down a combination of parameters but not each one. Remedies are more protocols (a chirp, voltage clamp of I<sub>h</sub>), pharmacology (blocking I<sub>h</sub> with ZD7288 isolates the leak), and reporting parameter ranges rather than single values. See the <a href="/topics/validation/identifiability/">Identifiability</a> lesson.</p></details>`)
  + `<section class="lesson-section" id="code"><p class="eyebrow">05 · Do it in Python</p><h2>Fit a model to recorded steps with SciPy</h2><div class="code-toolbar"><span>Python 3 · numpy, scipy</span><button class="secondary" id="ml-copy">Copy Python</button></div><p id="ml-copy-status" class="muted" role="status"></p><pre><code id="ml-code"></code></pre></section>
  <section class="lesson-section" id="ml-related"><p class="eyebrow">06 · Connect to the guide</p><h2>Related lessons</h2><div class="button-cloud"><a class="secondary" href="/topics/validation/fit-a-transient/">Fit a passive transient</a><a class="secondary" href="/topics/validation/identifiability/">Identifiability</a><a class="secondary" href="/topics/ca1-resonance/ih-and-m-current/">I<sub>h</sub> and M-current</a><a class="secondary" href="/topics/ca1-resonance/chirp-input/">Chirp inputs</a></div></section>`;
xpages[0].init = () => {
  const rnd = mulberry(42), data = ephSim(EPH_TRUE), noise = 0.4;
  data.traces = data.traces.map(tr => tr.map(v => v + noise * gauss(rnd)));
  const freqs = []; for (let f = 0.5; f <= 20; f += 0.5) freqs.push(f);
  const Zdata = ephZ(EPH_TRUE, freqs).map(z => z * (1 + 0.03 * gauss(rnd)));
  const feat0 = ephFeatures(data.traces, data.t);
  const ids = ['epC', 'epgL', 'epEL', 'epgh', 'eptau'], keys = ['C', 'gL', 'EL', 'gh', 'tauh'], guess = [100, 10, -65, 1, 80];
  const st = { errs: [], fitting: false, truth: false };
  const params = () => Object.fromEntries(keys.map((k, i) => [k, +el(ids[i]).value]));
  const rmse = p => { const m = ephSim(p); let s = 0, n = 0; m.traces.forEach((tr, j) => { for (let i = 0; i < tr.length; i += 2) { const d = tr[i] - data.traces[j][i]; s += d * d; n++; } }); return Math.sqrt(s / n); };
  const update = () => {
    const p = params(); st.m = ephSim(p); st.err = rmse(p); if (!st.fitting) st.errs = [st.err];
    st.feat = ephFeatures(st.m.traces, st.m.t); st.Z = ephZ(p, freqs); draw();
    const f = st.feat, d = feat0, row = (n, a, b, u, dp = 1) => `<tr><td>${n}</td><td>${a.toFixed(dp)}</td><td>${b.toFixed(dp)}</td><td>${u}</td></tr>`;
    el('epTable').innerHTML = `<b>Features: recording vs model</b><div class="ml-tablewrap"><table class="ml-table ml-small"><thead><tr><th></th><th>Rec.</th><th>Model</th><th></th></tr></thead><tbody>${row('Rest', d.rest, f.rest, 'mV')}${row('R<sub>in</sub>', d.Rin, f.Rin, 'MΩ', 0)}${row('τ<sub>m</sub>', d.tau, f.tau, 'ms')}${row('Sag', d.sag, f.sag, 'ratio', 2)}</tbody></table></div>`
      + (st.truth ? `<p class="ml-truth"><b>Hidden values:</b> C ${EPH_TRUE.C} pF, g<sub>L</sub> ${EPH_TRUE.gL} nS, E<sub>L</sub> ${EPH_TRUE.EL} mV, g<sub>h</sub> ${EPH_TRUE.gh} nS, τ<sub>h</sub> ${EPH_TRUE.tauh} ms</p>` : '');
    el('ml-result').innerHTML = `Fit error (RMSE) <b>${st.err.toFixed(2)} mV</b> · recording noise ${noise} mV`;
    // explanation: what to change, from feature mismatch
    const tips = [];
    if (Math.abs(f.rest - d.rest) > 1.5) tips.push(`Resting potential is ${f.rest > d.rest ? 'too depolarized' : 'too hyperpolarized'} by ${Math.abs(f.rest - d.rest).toFixed(1)} mV: move <b>E<sub>L</sub></b> ${f.rest > d.rest ? 'down' : 'up'}.`);
    if (Math.abs(f.Rin - d.Rin) / d.Rin > 0.08) tips.push(`Input resistance is ${f.Rin > d.Rin ? 'too high' : 'too low'} (${f.Rin.toFixed(0)} vs ${d.Rin.toFixed(0)} MΩ): ${f.Rin > d.Rin ? 'increase' : 'decrease'} <b>g<sub>L</sub></b>, because R<sub>in</sub> ≈ 1/g.`);
    if (isFinite(f.tau) && Math.abs(f.tau - d.tau) / d.tau > 0.12) tips.push(`The response is ${f.tau > d.tau ? 'too slow' : 'too fast'} (τ ${f.tau.toFixed(1)} vs ${d.tau.toFixed(1)} ms): ${f.tau > d.tau ? 'lower' : 'raise'} <b>C</b>, because τ = C/g.`);
    if (Math.abs(f.sag - d.sag) > 0.03) tips.push(`There is ${f.sag > d.sag ? 'too little' : 'too much'} sag (${f.sag.toFixed(2)} vs ${d.sag.toFixed(2)}): ${f.sag > d.sag ? 'increase' : 'decrease'} <b>g<sub>h</sub></b>; adjust <b>τ<sub>h</sub></b> if the sag develops too fast or slow.`);
    const quality = st.err < noise * 1.15 ? `<p><b>Excellent fit.</b> The remaining error (${st.err.toFixed(2)} mV) is at the recording-noise level, so the model explains everything the data can show. Now check the held-out impedance below.</p>` : st.err < 1.5 ? `<p><b>Close.</b> Error ${st.err.toFixed(2)} mV. The residuals show where the mismatch is.</p>` : `<p><b>Not fitted yet.</b> Error ${st.err.toFixed(2)} mV. Fit the features in order: resting potential, then input resistance, then time constant, then sag. Each depends mostly on one parameter.</p>`;
    explain(quality + (tips.length ? `<ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>` : ''));
    const iPk = st.Z.indexOf(Math.max(...st.Z)), iPkD = Zdata.indexOf(Math.max(...Zdata));
    const zErr = Math.sqrt(st.Z.reduce((s, z, i) => s + ((z - Zdata[i]) / Zdata[i]) ** 2, 0) / freqs.length) * 100;
    el('epZres').innerHTML = `Measured resonance ≈ <b>${freqs[iPkD]} Hz</b>; model predicts <b>${freqs[iPk]} Hz</b>. Average impedance error <b>${zErr.toFixed(0)}%</b>. ${zErr < 8 ? 'The fitted model predicts data it never saw: good evidence it captured the right mechanism.' : 'The prediction misses. Either the fit is not finished, or a model can match the steps for the wrong reasons.'}`;
  };
  const draw = () => {
    let a = axes(el('epV'), { xlim: [0, 700], ylim: [-95, -55], xlabel: 'time (ms)', ylabel: 'mV' });
    data.traces.forEach(tr => line(a, data.t, tr, C.muted, 1));
    if (st.m) st.m.traces.forEach(tr => line(a, st.m.t, tr, C.plum, 2)); a.done();
    a = axes(el('epR'), { xlim: [0, 700], ylim: [-4, 4], xlabel: 'time (ms)', ylabel: 'mV' });
    if (st.m) [0, 2].forEach((j, k) => line(a, data.t, data.traces[j].map((v, i) => v - st.m.traces[j][i]), k ? C.ink : C.brown, 1)); a.done();
    const n = Math.max(20, st.errs.length);
    a = axes(el('epErr'), { xlim: [0, n], ylim: [0.1, 20], logy: true, xlabel: 'iteration', ylabel: 'RMSE' });
    line(a, [0, n], [noise, noise], C.muted, 1.2, [4, 3]); line(a, st.errs.map((_, i) => i), st.errs, C.ink, 2); a.done();
    a = axes(el('epZ'), { xlim: [0, 20], ylim: [0, Math.ceil(Math.max(...Zdata, ...(st.Z || [0])) / 20) * 20 + 10], xlabel: 'frequency (Hz)', ylabel: 'MΩ' });
    a.ctx.fillStyle = C.muted; freqs.forEach((f, i) => { a.ctx.beginPath(); a.ctx.arc(a.X(f), a.Y(Zdata[i]), 3, 0, 7); a.ctx.fill(); });
    if (st.Z) line(a, freqs, st.Z, C.plum, 2.4); a.done();
  };
  const fit = () => {
    if (st.fitting) { st.fitting = false; el('epFit').textContent = 'Auto-fit'; return; }
    st.fitting = true; el('epFit').textContent = 'Stop'; st.errs = [st.err];
    const toX = p => [Math.log(p.C), Math.log(p.gL), p.EL / 10, Math.log(p.gh + 0.05), Math.log(p.tauh)];
    const toP = x => ({ C: Math.exp(x[0]), gL: Math.exp(x[1]), EL: x[2] * 10, gh: Math.max(0, Math.exp(x[3]) - 0.05), tauh: Math.exp(x[4]) });
    const nm = makeNM(x => rmse(toP(x)), toX(params()), 0.3);
    const frame = () => {
      if (!st.fitting) return; let r;
      for (let k = 0; k < 4; k++) r = nm.step();
      const p = toP(r.x); keys.forEach((kk, i) => { el(ids[i]).value = p[kk]; el(ids[i] + '-o').textContent = fmtP(i, p[kk]); });
      st.errs.push(r.f); update();
      if (r.it > 500 || (r.it > 60 && r.spread < 1e-6)) { st.fitting = false; el('epFit').textContent = 'Auto-fit'; return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  const fmtP = (i, v) => i === 2 ? v.toFixed(1) : i === 3 ? v.toFixed(2) : v.toFixed(i === 1 ? 2 : 0);
  ids.forEach((id, i) => bind(id, v => fmtP(i, v), () => { if (!st.fitting) update(); }));
  el('epFit').addEventListener('click', fit);
  el('epReset').addEventListener('click', () => { st.fitting = false; el('epFit').textContent = 'Auto-fit'; ids.forEach((id, i) => setSlider(id, guess[i])); });
  el('epTruth').addEventListener('click', () => { st.truth = !st.truth; el('epTruth').textContent = st.truth ? 'Hide hidden values' : 'Reveal hidden values'; update(); });
  update(); redraw.fn = draw;
  attachCode(`import numpy as np
from scipy.optimize import least_squares

# --- the model: leak + h-current, single compartment (pF, nS, mV, pA, ms) ---
Eh = -30.0
r_inf = lambda V: 1 / (1 + np.exp((V + 82) / 9))

def simulate(p, amps=(-150, -100, -50, 50), T=700, on=100, off=600, dt=0.1):
    C, gL, EL, gh, tauh = p
    # resting potential: leak balances the h-current
    Vs = np.linspace(-110, -30, 8001)
    V0 = Vs[np.argmin(np.abs(gL*(Vs-EL) + gh*r_inf(Vs)*(Vs-Eh)))]
    t = np.arange(0, T, dt)
    traces = []
    for I in amps:
        V, r, out = V0, r_inf(V0), np.empty_like(t)
        for k, tk in enumerate(t):
            out[k] = V
            Iapp = I if on <= tk < off else 0.0
            dV = (Iapp - gL*(V-EL) - gh*r*(V-Eh)) / C
            dr = (r_inf(V) - r) / tauh
            V, r = V + dt*dV, r + dt*dr
        traces.append(out[::10])                   # 1 ms sampling
    return np.array(traces)

# --- 'recorded' data: replace with your own traces (n_steps x n_samples, mV) ---
rng = np.random.default_rng(42)
data = simulate([150, 7, -70, 4, 45]) + rng.normal(0, 0.4, size=(4, 700))

# --- fit: minimize the difference between model and recording ---
def residuals(logp):
    p = [np.exp(logp[0]), np.exp(logp[1]), logp[2], np.exp(logp[3]), np.exp(logp[4])]
    return (simulate(p) - data).ravel()

x0 = [np.log(100), np.log(10), -65, np.log(1), np.log(80)]
fit = least_squares(residuals, x0)
C, gL, EL, gh, tauh = np.exp(fit.x[0]), np.exp(fit.x[1]), fit.x[2], np.exp(fit.x[3]), np.exp(fit.x[4])
print(f"C={C:.0f} pF  gL={gL:.2f} nS  EL={EL:.1f} mV  gh={gh:.2f} nS  tauh={tauh:.0f} ms")
print("RMSE:", np.sqrt(np.mean(fit.fun**2)), "mV")

# Parameter uncertainty from the Jacobian (approximate, assumes Gaussian noise)
J = fit.jac
cov = np.linalg.inv(J.T @ J) * np.mean(fit.fun**2)
print("log-parameter SDs:", np.sqrt(np.diag(cov)))`);
};

