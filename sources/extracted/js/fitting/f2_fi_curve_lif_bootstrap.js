/* Extracted from Little Neural Guide modellab.js [244033:257487] — section: F2. FIT AN f–I CURVE */
/* ======================================================================
   F2. FIT AN f–I CURVE — LIF, bootstrap, misspecification
   ====================================================================== */
const lifF = (I, p) => { const x = p.R * I / 1000; if (x <= p.th) return 0; return 1000 / (p.tref + p.tau * Math.log(x / (x - p.th))); }; // I pA, R MΩ → mV; Hz
const FI_TRUE = { tau: 20, R: 100, th: 15, tref: 3 }, FI_I = Array.from({ length: 17 }, (_, k) => k * 25);
fpages[1].lead = 'An f–I curve summarizes how a neuron turns input current into firing rate. Fitting a leaky integrate-and-fire (LIF) model to it is a classic first fit, and it teaches three things at once: parameter trade-offs, uncertainty, and how to tell when the model itself is wrong.';
fpages[1].jumps = [['f-idea', 'The model'], ['experiment', 'Interactive'], ['f-boot', 'Bootstrap'], ['code', 'Python']];
fpages[1].pit = ['Fitting R and θ separately from f–I data alone. Only their ratio (the rheobase) is identifiable.', 'Ignoring that rate measurements are noisier at high rates; use weights or a likelihood.', 'Accepting a low error while residuals show a systematic curve. That pattern means the model is missing a mechanism.'];
fpages[1].quiz = [
  { q: 'In this LIF f–I curve, R and θ only appear as…', o: ['Their sum', 'The rheobase θ/R', 'Their product'], a: 1, why: 'The rate depends on R·I/θ = I/(θ/R), so only θ/R can be estimated from f–I data.' },
  { q: 'What does the bootstrap estimate?', o: ['The true parameters', 'How much fitted parameters would vary across repeated experiments', 'The best model'], a: 1, why: 'Refitting resampled data approximates the spread of estimates you would get from new datasets.' },
  { q: 'Residuals curve systematically for the adapting cell. Best response?', o: ['Accept the fit', 'Add an adaptation mechanism to the model', 'Remove the high-current points'], a: 1, why: 'Systematic residuals mean the model structure is wrong; adding adaptation addresses the cause.' }];
fpages[1].html = () => sec('f-idea', 'The model', 'LIF firing rate in closed form',
  `<div class="math-scroll ml-math">\\[f(I)=\\begin{cases}0, & RI\\le\\theta\\\\[2pt] \\dfrac{1}{t_{ref}+\\tau\\ln\\!\\dfrac{RI}{RI-\\theta}}, & RI>\\theta\\end{cases}\\]</div>
  <p>A leaky integrate-and-fire neuron charges toward R·I with time constant τ, fires at threshold θ, resets and stays silent for t<sub>ref</sub>. The firing rate has an exact formula, so fitting is fast. Notice that R and θ only appear as the ratio θ/R, the <b>rheobase</b> current. The data can pin down the rheobase but not R and θ separately, and the bootstrap below shows this as a line of equally good estimates.</p>`)
  + labBlock(
    `<div class="control-row"><label>Recorded cell</label><div class="lab-actions ml-seg"><button class="secondary" data-cell="plain" aria-pressed="true">Non-adapting</button><button class="secondary" data-cell="adapt" aria-pressed="false">Adapting</button></div></div>`
    + ctl('fiTau', 'Membrane time constant τ', 5, 60, 0.5, 35, 'ms') + ctl('fiR', 'Input resistance R', 30, 300, 1, 150, 'MΩ') + ctl('fiTh', 'Threshold θ (above rest)', 5, 40, 0.5, 25, 'mV') + ctl('fiRef', 'Refractory period t<sub>ref</sub>', 0.5, 10, 0.1, 5, 'ms')
    + `<div class="lab-actions"><button class="primary" id="fiFit">Auto-fit</button><button class="secondary" id="fiBoot">Bootstrap ×40</button><button class="secondary" id="fiReset">Reset guess</button></div>`,
    fig('fiPlot', 'ml-h260 wide', 'Firing rate vs current', key([C.muted, 'data ± SD'], [C.plum, 'LIF model']), 'each grey point is the mean rate from repeated current steps, with its spread. The plum curve is the model with your parameters.')
    + fig('fiRes', 'ml-h200', 'Residuals (data − model)', key([C.ink, 'Hz']), 'random scatter around zero means the model shape is right. A smooth arc means it is not.')
    + fig('fiBootP', 'ml-h200', 'Bootstrap estimates of R and θ', key([C.plum, 'one refit'], [C.muted, 'constant rheobase', 1]), 'each dot is a fit to a resampled dataset. Dots spread along a line: R and θ trade off, while their ratio is stable.'))
  + sec('f-boot', 'Bootstrap', 'Uncertainty without formulas',
    `<p>The <b>bootstrap</b> estimates how much your fitted parameters would change if you repeated the experiment. Here, residuals from the best fit are resampled and added back to the fitted curve to create 40 synthetic datasets, each of which is refitted. The spread of those refits is an uncertainty estimate. Its shape shows correlations: a straight band means two parameters compensate for each other.</p>`)
  + codeBlock('Fit and bootstrap an LIF f–I curve with SciPy', 'numpy, scipy') + related([['/lab/hh/', 'HH f–I curve (type II)'], ['/topics/mean-field/gain-function/', 'The gain function'], ['/topics/validation/parameter-sensitivity/', 'Parameter sensitivity']]);
fpages[1].tour = [
  { title: 'Fit the non-adapting cell', apply: () => { fiCtl && fiCtl.cell('plain'); fiCtl && fiCtl.fit(); }, text: 'Auto-fit adjusts all four parameters to minimise weighted squared error. The curve lands on the data, and the residuals scatter randomly around zero.', look: 'the residual plot: no pattern means the model shape matches.' },
  { title: 'Bootstrap the uncertainty', apply: () => { fiCtl && fiCtl.boot(); }, text: 'Forty refits on resampled data. The R–θ estimates fall along a straight line through the origin, because only their ratio, the rheobase, affects the f–I curve.', look: 'the dots lying along the dashed constant-rheobase line.' },
  { title: 'An adapting cell', apply: () => { fiCtl && fiCtl.cell('adapt'); fiCtl && fiCtl.fit(); }, text: 'Real CA1 pyramidal cells adapt: their rate drops during a sustained step, especially at high rates. The LIF has no adaptation, so the best fit misses in a systematic arc. A small error number would hide this; the residuals reveal it.', look: 'the arc-shaped residuals.' },
];
let fiCtl = null;
fpages[1].init = () => {
  const ids = ['fiTau', 'fiR', 'fiTh', 'fiRef'], keys = ['tau', 'R', 'th', 'tref'], guess = [35, 150, 25, 5];
  const st = { cell: 'plain', boot: [], fitting: false };
  const truthRate = I => { const f = lifF(I, FI_TRUE); return st.cell === 'adapt' ? f / (1 + 0.012 * f) : f; };
  const makeData = () => { const r = mulberry(st.cell === 'adapt' ? 8 : 4); st.data = FI_I.map(I => { const f = truthRate(I), sd = 1 + 0.08 * f; return { I, f: Math.max(0, f + sd * gauss(r)), sd }; }); };
  const params = () => Object.fromEntries(keys.map((k, i) => [k, +el(ids[i]).value]));
  const wsse = (p, data = st.data) => data.reduce((s, d) => s + ((d.f - lifF(d.I, p)) / d.sd) ** 2, 0);
  const toX = p => [Math.log(p.tau), Math.log(p.R), Math.log(p.th), Math.log(p.tref)], toP = x => ({ tau: Math.exp(x[0]), R: Math.exp(x[1]), th: Math.exp(x[2]), tref: Math.exp(x[3]) });
  const fitTo = (data, p0, iters = 400) => { const nm = makeNM(x => wsse(toP(x), data), toX(p0), 0.3); let r; for (let k = 0; k < iters; k++) { r = nm.step(); if (k > 60 && r.spread < 1e-8) break; } return toP(r.x); };
  const setP = p => keys.forEach((k, i) => { el(ids[i]).value = p[k]; el(ids[i] + '-o').textContent = fmtFI(i, p[k]); });
  const fmtFI = (i, v) => i === 1 ? v.toFixed(0) : v.toFixed(1);
  const draw = () => {
    const p = params();
    let a = axes(el('fiPlot'), { xlim: [0, 410], ylim: [0, 160], xlabel: 'injected current (pA)', ylabel: 'rate (Hz)' });
    st.data.forEach(d => { a.ctx.strokeStyle = C.muted; a.ctx.lineWidth = 1.2; a.ctx.beginPath(); a.ctx.moveTo(a.X(d.I), a.Y(d.f - d.sd)); a.ctx.lineTo(a.X(d.I), a.Y(d.f + d.sd)); a.ctx.stroke(); a.ctx.fillStyle = C.muted; a.ctx.beginPath(); a.ctx.arc(a.X(d.I), a.Y(d.f), 3.5, 0, 7); a.ctx.fill(); });
    const xs = Array.from({ length: 300 }, (_, k) => k * 410 / 299); line(a, xs, xs.map(I => lifF(I, p)), C.plum, 2.4); a.done();
    const res = st.data.map(d => d.f - lifF(d.I, p)), m = Math.max(10, ...res.map(Math.abs));
    a = axes(el('fiRes'), { xlim: [0, 410], ylim: [-m * 1.1, m * 1.1], xlabel: 'current (pA)', ylabel: 'Hz' });
    line(a, [0, 410], [0, 0], C.muted, 1); a.ctx.fillStyle = C.ink; st.data.forEach((d, k) => { a.ctx.beginPath(); a.ctx.arc(a.X(d.I), a.Y(res[k]), 3.2, 0, 7); a.ctx.fill(); }); a.done();
    a = axes(el('fiBootP'), { xlim: [0, 300], ylim: [0, 45], xlabel: 'R (MΩ)', ylabel: 'θ (mV)' });
    const rb = p.th / p.R; line(a, [0, 300], [0, 300 * rb], C.muted, 1.2, [4, 3]);
    a.ctx.fillStyle = C.plum; st.boot.forEach(b => { a.ctx.beginPath(); a.ctx.arc(a.X(b.R), a.Y(b.th), 3, 0, 7); a.ctx.fill(); });
    a.ctx.strokeStyle = C.ink; a.ctx.lineWidth = 2; a.ctx.beginPath(); a.ctx.arc(a.X(p.R), a.Y(p.th), 5, 0, 7); a.ctx.stroke(); a.done();
    const chi = wsse(p), dof = st.data.length - 4, rheo = p.th / p.R * 1000;
    el('ml-result').innerHTML = `Weighted error χ² = <b>${chi.toFixed(1)}</b> for ${dof} degrees of freedom (≈ ${dof} expected for a good fit) · rheobase θ/R = <b>${rheo.toFixed(0)} pA</b>${st.boot.length ? ` · bootstrap: rheobase ${pct(st.boot.map(b => b.th / b.R * 1000))} pA, R ${pct(st.boot.map(b => b.R))} MΩ` : ''}`;
    // systematic residual detection: runs test-like count of sign changes among suprathreshold points
    const sup = res.filter((_, k) => st.data[k].f > 2), runs = sup.slice(1).filter((v, k) => Math.sign(v) !== Math.sign(sup[k])).length;
    let msg = chi < 2 * dof ? `<p><b>Good fit.</b> The weighted error is close to the number of data points minus parameters, which is what pure measurement noise would give.</p>` : chi < 6 * dof ? `<p><b>Partial fit.</b> The error is larger than noise alone explains. Try Auto-fit, or check the residuals for a pattern.</p>` : `<p><b>Poor fit.</b> Start with rheobase: shift R or θ until the curve leaves zero at the right current, then use τ for the curvature and t<sub>ref</sub> for the high-current ceiling.</p>`;
    if (chi > 2 * dof && runs < sup.length / 3) msg += `<p><b>The residuals form runs</b> (only ${runs} sign changes across ${sup.length} points). That means the model shape is wrong, not just its numbers. ${st.cell === 'adapt' ? 'This cell adapts, which the LIF cannot represent. An adaptive model (e.g. AdEx) would fix it.' : ''}</p>`;
    if (st.boot.length) msg += `<p>Across ${st.boot.length} bootstrap refits, R varies by a factor of ${(Math.max(...st.boot.map(b => b.R)) / Math.min(...st.boot.map(b => b.R))).toFixed(1)}, but the rheobase varies by only ${(Math.max(...st.boot.map(b => b.th / b.R)) / Math.min(...st.boot.map(b => b.th / b.R))).toFixed(2)}×. The data identify the ratio, not the parts.</p>`;
    explain(msg);
  };
  const pct = v => { const s = [...v].sort((a, b) => a - b); return `${s[Math.floor(s.length * .05)].toFixed(0)}–${s[Math.floor(s.length * .95)].toFixed(0)}`; };
  const fit = () => { const p = fitTo(st.data, params(), 500); setP(p); st.boot = []; draw(); };
  const boot = () => {
    const p0 = params(), fitted = st.data.map(d => lifF(d.I, p0)), res = st.data.map((d, k) => (d.f - fitted[k]) / d.sd), r = mulberry(99); st.boot = [];
    let k = 0; const btn = el('fiBoot'); btn.disabled = true;
    const step = () => { for (let j = 0; j < 4 && k < 40; j++, k++) { const data = st.data.map((d, i) => ({ I: d.I, sd: d.sd, f: Math.max(0, fitted[i] + d.sd * res[Math.floor(r() * res.length)]) })); const q = fitTo(data, { ...p0, R: p0.R * (0.6 + 0.8 * r()), th: p0.th * (0.6 + 0.8 * r()) }, 300); st.boot.push(q); } draw(); if (k < 40) requestAnimationFrame(step); else btn.disabled = false; };
    requestAnimationFrame(step);
  };
  const cell = c => { st.cell = c; document.querySelectorAll('[data-cell]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cell === c)); makeData(); st.boot = []; draw(); };
  fiCtl = { fit, boot, cell };
  ids.forEach((id, i) => bind(id, v => fmtFI(i, v), () => { st.boot = []; draw(); }));
  document.querySelectorAll('[data-cell]').forEach(b => b.addEventListener('click', () => cell(b.dataset.cell)));
  el('fiFit').addEventListener('click', fit); el('fiBoot').addEventListener('click', boot);
  el('fiReset').addEventListener('click', () => { ids.forEach((id, i) => setSlider(id, guess[i])); st.boot = []; draw(); });
  makeData(); draw(); redraw.fn = draw;
  attachCode(`import numpy as np
from scipy.optimize import least_squares

def lif_rate(I, tau, R, theta, tref):
    """LIF steady firing rate (Hz). I in pA, R in MΩ, theta in mV, tau/tref in ms."""
    x = R * I / 1000.0
    out = np.zeros_like(I, dtype=float)
    ok = x > theta
    out[ok] = 1000.0 / (tref + tau * np.log(x[ok] / (x[ok] - theta)))
    return out

I = np.arange(0, 425, 25.0)
rng = np.random.default_rng(4)
f_true = lif_rate(I, 20, 100, 15, 3)
sd = 1 + 0.08 * f_true
f_obs = np.clip(f_true + sd * rng.standard_normal(I.size), 0, None)

def resid(logp):
    return (f_obs - lif_rate(I, *np.exp(logp))) / sd      # weighted residuals

fit = least_squares(resid, np.log([35, 150, 25, 5]))
p_hat = np.exp(fit.x)
print("tau, R, theta, tref =", p_hat, " rheobase (pA) =", p_hat[2] / p_hat[1] * 1000)

# Residual bootstrap
fitted = lif_rate(I, *p_hat); r = (f_obs - fitted) / sd
boot = []
for b in range(200):
    f_b = np.clip(fitted + sd * rng.choice(r, r.size), 0, None)
    fb = least_squares(lambda lp: (f_b - lif_rate(I, *np.exp(lp))) / sd, fit.x)
    boot.append(np.exp(fb.x))
boot = np.array(boot)
print("R 90% interval:", np.percentile(boot[:, 1], [5, 95]))
print("rheobase 90% interval:", np.percentile(boot[:, 2] / boot[:, 1] * 1000, [5, 95]))`);
};

