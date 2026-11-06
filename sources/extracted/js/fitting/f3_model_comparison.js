/* Extracted from Little Neural Guide modellab.js [257487:272604] — section: F3. MODEL COMPARISON */
/* ======================================================================
   F3. MODEL COMPARISON — passive vs h-current vs over-flexible
   ====================================================================== */
fpages[2].lead = 'A model with more parameters always fits the training data at least as well. The real question is whether it predicts new data better. This page fits three models of increasing complexity to the same recording and scores them three ways.';
fpages[2].jumps = [['f-idea', 'Scoring models'], ['experiment', 'Interactive'], ['code', 'Python']];
fpages[2].pit = ['Choosing the model with the lowest training error. It will always be the most complex one.', 'Comparing AIC across different datasets. AIC only compares models fitted to the same data.', 'Treating a better score as proof a mechanism exists. It means the data favour it, given the candidates you tried.'];
fpages[2].quiz = [
  { q: 'Model C has the lowest training error but higher test error than B. This is…', o: ['Underfitting', 'Overfitting', 'Identifiability'], a: 1, why: 'Extra flexibility let C fit noise in the training data, which does not transfer to new data.' },
  { q: 'AIC = 2k − 2 ln L. What does the 2k term do?', o: ['Rewards more parameters', 'Penalizes more parameters', 'Measures noise'], a: 1, why: 'Each parameter adds 2 to AIC, so extra parameters must improve the likelihood enough to pay for themselves.' },
  { q: 'BIC penalizes parameters more than AIC when…', o: ['There are many data points (ln n > 2)', 'There are few parameters', 'Noise is low'], a: 0, why: 'BIC uses k·ln n; once n exceeds about 7, ln n > 2 and the penalty per parameter exceeds AIC’s.' }];
fpages[2].html = () => sec('f-idea', 'Scoring models', 'Three ways to judge a fit',
  `<div class="math-scroll ml-math">\\[\\ln L=-\\frac n2\\Big[\\ln(2\\pi\\hat\\sigma^2)+1\\Big],\\qquad \\mathrm{AIC}=2k-2\\ln L,\\qquad \\mathrm{BIC}=k\\ln n-2\\ln L\\]</div>
  <ul class="ml-list"><li><b>Training error</b>: how well the model matches the data it was fitted to. Always improves with more parameters.</li><li><b>Held-out (test) error</b>: how well it predicts current steps it never saw. The most direct test of generalization.</li><li><b>AIC and BIC</b>: training likelihood with a penalty per parameter (k). Lower is better; differences above ~2 (AIC) or ~6 (BIC) are usually taken as meaningful.</li></ul>
  <table class="ml-table"><thead><tr><th>Model</th><th>Parameters</th><th>k</th></tr></thead><tbody><tr><td>A · Passive</td><td>C, g<sub>L</sub>, E<sub>L</sub></td><td>3</td></tr><tr><td>B · Passive + I<sub>h</sub></td><td>+ g<sub>h</sub>, τ<sub>h</sub></td><td>5</td></tr><tr><td>C · I<sub>h</sub>, free kinetics</td><td>+ E<sub>h</sub>, V<sub>½</sub>, slope</td><td>8</td></tr></tbody></table>`)
  + labBlock(
    ctl('mcN', 'Recording noise σ', 0.1, 2, 0.05, 0.4, 'mV.')
    + `<div class="control-row"><label>Training data</label><div class="lab-actions ml-seg"><button class="secondary" data-train="1" aria-pressed="false">1 step (−50 pA)</button><button class="secondary" data-train="2" aria-pressed="true">2 steps (−150, −50)</button></div><small>The other steps (−100, +50 pA) are held out for testing.</small></div>
    <div class="lab-actions"><button class="primary" id="mcFit">Fit all three models</button></div>
    <div class="control-row"><label>Show predictions of</label><div class="lab-actions ml-seg"><button class="secondary" data-show="0">A</button><button class="secondary" data-show="1" aria-pressed="true">B</button><button class="secondary" data-show="2">C</button></div></div>`,
    fig('mcTrain', 'ml-h220', 'Training steps', key([C.muted, 'data'], [C.plum, 'model fit']), 'the data each model was fitted to.')
    + fig('mcTest', 'ml-h220', 'Held-out steps', key([C.muted, 'data'], [C.plum, 'model prediction']), 'data the models never saw. Good prediction here is the real test.')
    + `<div class="ml-wide" id="mcTable"></div>`)
  + codeBlock('Compare models with AIC, BIC and held-out error', 'numpy, scipy') + related([['/experiments/ephys/', 'Patch clamp to model'], ['/topics/validation/uncertainty-in-predictions/', 'Uncertainty in predictions'], ['/topics/learning/readouts-evaluation/', 'Readouts & evaluation']]);
fpages[2].tour = [
  { title: 'Fit all three', apply: () => mcCtl && mcCtl.run(2, 0.4), text: 'Each model is fitted to two current steps. Model A cannot make a sag, so it misses the dip. B and C both capture it.', look: 'the table: training error for A, B and C.' },
  { title: 'Judge on held-out data', apply: () => mcCtl && mcCtl.show(2), text: 'Now look at the held-out steps. C has the lowest training error, but its extra kinetic parameters were tuned partly to noise, so it predicts the unseen steps no better than B, and AIC/BIC penalize it.', look: 'test error and ΔAIC in the table.' },
  { title: 'Less data, more overfitting', apply: () => mcCtl && mcCtl.run(1, 0.4), text: 'With only one training step, there is much less information to constrain eight parameters. Complex models fit the single step well but can predict the others poorly.', look: 'the gap between training and test error for model C.' },
];
let mcCtl = null;
fpages[2].init = () => {
  const st = { train: 2, show: 1, fits: null };
  const simG = (p, amps) => {                                    // ephSim generalized: free Eh, V½, slope
    const V0 = (() => { let a = -110, b = -30; const f = V => p.gL * (V - p.EL) + p.gh * (1 / (1 + Math.exp((V - p.vh) / p.k))) * (V - p.Eh); for (let i = 0; i < 60; i++) { const m = (a + b) / 2; (f(m) > 0) ? b = m : a = m; } return (a + b) / 2; })();
    const ri = V => 1 / (1 + Math.exp((V - p.vh) / p.k)), n = Math.round(EPH.T / EPH.dt);
    return amps.map(I => { let V = V0, r = ri(V0); const tr = new Float64Array(Math.floor(n / EPH.every) + 1); for (let k = 0; k <= n; k++) { if (k % EPH.every === 0) tr[k / EPH.every] = V; const t = k * EPH.dt, Ia = t >= EPH.on && t < EPH.off ? I : 0; const dV = (Ia - p.gL * (V - p.EL) - p.gh * r * (V - p.Eh)) / p.C; r += EPH.dt * (ri(V) - r) / p.tauh; V += EPH.dt * dV; } return tr; });
  };
  const allAmps = [-150, -100, -50, 50], trainIdx = () => st.train === 2 ? [0, 2] : [2], testIdx = () => st.train === 2 ? [1, 3] : [0, 1, 3];
  const truth = { C: 150, gL: 7, EL: -70, gh: 4, tauh: 45, Eh: -30, vh: -82, k: 9 };
  const makeData = () => { const r = mulberry(21), sig = +el('mcN').value; st.data = simG(truth, allAmps).map(tr => Array.from(tr, v => v + sig * gauss(r))); };
  const models = [
    { name: 'A · Passive', k: 3, toP: x => ({ C: Math.exp(x[0]), gL: Math.exp(x[1]), EL: x[2] * 10, gh: 0, tauh: 50, Eh: -30, vh: -82, k: 9 }), x0: [Math.log(100), Math.log(10), -6.5] },
    { name: 'B · Passive + I_h', k: 5, toP: x => ({ C: Math.exp(x[0]), gL: Math.exp(x[1]), EL: x[2] * 10, gh: Math.exp(x[3]), tauh: Math.exp(x[4]), Eh: -30, vh: -82, k: 9 }), x0: [Math.log(100), Math.log(10), -6.5, Math.log(2), Math.log(60)] },
    { name: 'C · I_h, free kinetics', k: 8, toP: x => ({ C: Math.exp(x[0]), gL: Math.exp(x[1]), EL: x[2] * 10, gh: Math.exp(x[3]), tauh: Math.exp(x[4]), Eh: x[5] * 10, vh: x[6] * 10, k: Math.exp(x[7]) }), x0: [Math.log(100), Math.log(10), -6.5, Math.log(2), Math.log(60), -3, -8.2, Math.log(9)] },
  ];
  const sse = (p, idx) => { const sim = simG(p, idx.map(i => allAmps[i])); let s = 0, n = 0; sim.forEach((tr, j) => { const d = st.data[idx[j]]; for (let i = 0; i < tr.length; i += 2) { s += (tr[i] - d[i]) ** 2; n++; } }); return { s, n }; };
  const run = (train, noise) => {
    if (train) { st.train = train; document.querySelectorAll('[data-train]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.train === train)); }
    if (noise !== undefined) setSlider('mcN', noise);
    makeData(); st.fits = []; el('mcFit').disabled = true; let m = 0, nm = null, it = 0; const fits = st.fits;
    const step = () => {
      if (st.fits !== fits || !document.getElementById('mcFit')) { if (document.getElementById('mcFit')) el('mcFit').disabled = false; return; }   // settings changed mid-fit: abandon this run
      if (!nm) nm = makeNM(x => { const r = sse(models[m].toP(x), trainIdx()); return r.s / r.n; }, models[m].x0, 0.3);
      let r; for (let j = 0; j < 6; j++) { r = nm.step(); it++; }
      if (it > 350 || (it > 80 && r.spread < 1e-7)) { const p = models[m].toP(r.x), tr = sse(p, trainIdx()), te = sse(p, testIdx()); st.fits[m] = { p, tr: Math.sqrt(tr.s / tr.n), te: Math.sqrt(te.s / te.n), n: tr.n, k: models[m].k }; m++; nm = null; it = 0; }
      el('ml-result').innerHTML = m < 3 ? `Fitting model ${'ABC'[m]}…` : 'All three models fitted.';
      draw(); if (m < 3) requestAnimationFrame(step); else { el('mcFit').disabled = false; report(); }
    };
    requestAnimationFrame(step);
  };
  const draw = () => {
    const f = st.fits && st.fits[st.show], sims = f ? simG(f.p, allAmps) : null, t = Array.from({ length: st.data[0].length }, (_, k) => k * EPH.dt * EPH.every);
    [['mcTrain', trainIdx()], ['mcTest', testIdx()]].forEach(([id, idx]) => {
      const a = axes(el(id), { xlim: [0, 700], ylim: [-95, -55], xlabel: 'time (ms)', ylabel: 'mV' });
      idx.forEach(i => { line(a, t, st.data[i], C.muted, 1); if (sims) line(a, t, sims[i], C.plum, 2); }); a.done();
    });
  };
  const report = () => {
    const F = st.fits.filter(Boolean); if (F.length < 3) return;
    const scores = F.map(f => { const s2 = f.tr ** 2, lnL = -f.n / 2 * (Math.log(2 * Math.PI * s2) + 1); return { ...f, aic: 2 * f.k - 2 * lnL, bic: f.k * Math.log(f.n) - 2 * lnL }; });
    const minA = Math.min(...scores.map(s => s.aic)), minB = Math.min(...scores.map(s => s.bic)), minT = Math.min(...scores.map(s => s.te));
    el('mcTable').innerHTML = `<div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Model</th><th>k</th><th>Train RMSE (mV)</th><th>Test RMSE (mV)</th><th>ΔAIC</th><th>ΔBIC</th></tr></thead><tbody>${scores.map((s, i) => `<tr><td><b>${models[i].name}</b></td><td>${s.k}</td><td>${s.tr.toFixed(3)}</td><td${s.te === minT ? ' class="ml-best"' : ''}>${s.te.toFixed(3)}</td><td${s.aic === minA ? ' class="ml-best"' : ''}>${(s.aic - minA).toFixed(1)}</td><td${s.bic === minB ? ' class="ml-best"' : ''}>${(s.bic - minB).toFixed(1)}</td></tr>`).join('')}</tbody></table></div>`;
    const [A, B, Cc] = scores, sig = +el('mcN').value;
    let msg = `<p><b>Training error</b> falls as parameters are added (A ${A.tr.toFixed(2)}, B ${B.tr.toFixed(2)}, C ${Cc.tr.toFixed(2)} mV), as it always must. The noise level is ${sig} mV, so anything near that is fitting about as well as possible.</p>`;
    msg += `<p><b>Model A</b> ${A.te > 1.5 * B.te ? 'fails badly on held-out steps: without I<sub>h</sub> it cannot produce the sag at other current levels.' : 'is not far behind; with this little data the sag is hard to detect.'} `;
    msg += `<b>Model C</b> ${Cc.te > B.te * 1.02 ? `predicts held-out steps slightly worse than B (${Cc.te.toFixed(3)} vs ${B.te.toFixed(3)} mV) despite fitting training data better: a sign of overfitting.` : `predicts about as well as B, so its three extra parameters add little.`} AIC and BIC ${minA === B.aic || minB === B.bic ? 'favour <b>B</b>, the model that matches how the data were generated.' : 'favour ' + models[scores.findIndex(s => s.aic === minA)].name + ' here; try more training data or lower noise.'}</p>`;
    explain(msg); el('ml-result').innerHTML = `Best held-out prediction: <b>${models[scores.findIndex(s => s.te === minT)].name}</b> · lowest AIC: <b>${models[scores.findIndex(s => s.aic === minA)].name}</b> · lowest BIC: <b>${models[scores.findIndex(s => s.bic === minB)].name}</b>`;
  };
  mcCtl = { run, show: i => { st.show = i; document.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.show === i)); draw(); } };
  bind('mcN', v => v.toFixed(2) + ' mV', () => { makeData(); st.fits = null; el('mcTable').innerHTML = ''; draw(); el('ml-result').textContent = 'Noise changed. Fit the models again.'; });
  document.querySelectorAll('[data-train]').forEach(b => b.addEventListener('click', () => { st.train = +b.dataset.train; document.querySelectorAll('[data-train]').forEach(x => x.setAttribute('aria-pressed', x === b)); st.fits = null; el('mcTable').innerHTML = ''; draw(); }));
  document.querySelectorAll('[data-show]').forEach(b => b.addEventListener('click', () => mcCtl.show(+b.dataset.show)));
  el('mcFit').addEventListener('click', () => run());
  makeData(); draw(); el('ml-result').textContent = 'Press “Fit all three models”. Each fit takes a few seconds.';
  explain('<p>Three candidate models, one recording. Press <b>Fit all three models</b> to fit each to the training steps, then compare how they predict the held-out steps.</p>');
  redraw.fn = draw;
  attachCode(`import numpy as np
from scipy.optimize import least_squares

# Same single-compartment leak + h-current model as the "Patch clamp to model" page (pF, nS, mV, pA, ms)
Eh = -30.0
r_inf = lambda V: 1 / (1 + np.exp((V + 82) / 9))
def simulate(p, amps, T=700, on=100, off=600, dt=0.2):
    C, gL, EL, gh, tauh = p["C"], p["gL"], p["EL"], p["gh"], p["tauh"]
    Vs = np.linspace(-110, -30, 4001)
    V0 = Vs[np.argmin(np.abs(gL*(Vs-EL) + gh*r_inf(Vs)*(Vs-Eh)))]      # rest: leak balances Ih
    t = np.arange(0, T, dt); out = []
    for I in amps:
        V, r, tr = V0, r_inf(V0), np.empty_like(t)
        for k, tk in enumerate(t):
            tr[k] = V
            dV = ((I if on <= tk < off else 0.0) - gL*(V-EL) - gh*r*(V-Eh)) / C
            V, r = V + dt*dV, r + dt*(r_inf(V) - r) / tauh
        out.append(tr[::5])                                              # 1 ms sampling
    return np.array(out)

# 'Recorded' data: synthetic cell WITH an h-current plus noise (replace with your traces: amp -> mV array)
rng = np.random.default_rng(42)
truth = dict(C=150, gL=7, EL=-70, gh=4, tauh=45)
data = {a: simulate(truth, [a])[0] + rng.normal(0, 0.4, 700) for a in (-150, -100, -50, 50)}
train_amps, test_amps = [-150, -50], [-100, 50]

def fit_model(make_params, x0):
    def resid(x):
        p = make_params(x)
        return np.concatenate([simulate(p, [a])[0] - data[a] for a in train_amps])
    r = least_squares(resid, x0)
    return make_params(r.x), r

def scores(p, k):
    tr = np.concatenate([simulate(p, [a])[0] - data[a] for a in train_amps])
    te = np.concatenate([simulate(p, [a])[0] - data[a] for a in test_amps])
    n, s2 = tr.size, np.mean(tr**2)
    lnL = -n / 2 * (np.log(2 * np.pi * s2) + 1)
    return dict(train_rmse=np.sqrt(s2), test_rmse=np.sqrt(np.mean(te**2)),
                AIC=2 * k - 2 * lnL, BIC=k * np.log(n) - 2 * lnL)

# Example parameterizations (log-transform positive parameters)
passive = lambda x: dict(C=np.exp(x[0]), gL=np.exp(x[1]), EL=x[2], gh=0.0, tauh=50.0)
with_h  = lambda x: dict(C=np.exp(x[0]), gL=np.exp(x[1]), EL=x[2], gh=np.exp(x[3]), tauh=np.exp(x[4]))

for name, make, x0, k in [("passive", passive, [np.log(100), np.log(10), -65], 3),
                          ("passive + Ih", with_h, [np.log(100), np.log(10), -65, np.log(2), np.log(60)], 5)]:
    p, _ = fit_model(make, x0)
    print(name, scores(p, k))`);
};

