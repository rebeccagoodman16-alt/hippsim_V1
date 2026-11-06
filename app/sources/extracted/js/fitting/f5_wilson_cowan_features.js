/* Extracted from Little Neural Guide modellab.js [285176:299864] — section: F5. FIT A POPULATION RHYTHM */
/* ======================================================================
   F5. FIT A POPULATION RHYTHM — feature-based fitting of Wilson–Cowan
   ====================================================================== */
fpages[4].lead = 'Sometimes you cannot match a model to raw traces: phases drift, noise dominates, and only summary features are reliable. Then you fit the features. Here, an observed rhythm’s frequency and amplitude are matched by searching two Wilson–Cowan parameters.';
fpages[4].jumps = [['f-idea', 'Feature-based fitting'], ['experiment', 'Interactive'], ['code', 'Python']];
fpages[4].pit = ['Fitting raw oscillation traces point by point. A small phase shift creates a huge error even when the rhythm is right.', 'Using a single feature for two parameters. One equation cannot pin down two unknowns.', 'Ignoring regions where the model does not oscillate at all; the loss there must be handled explicitly.'];
fpages[4].quiz = [
  { q: 'Why fit features instead of the raw trace?', o: ['Features are faster to compute', 'Phase differences make trace error huge even for the right rhythm', 'Raw traces cannot be simulated'], a: 1, why: 'Two identical rhythms offset by half a cycle have a large point-by-point error, so features like frequency and amplitude are more robust.' },
  { q: 'Using frequency alone produces…', o: ['A single best point', 'A ridge of equally good parameter pairs', 'No solution'], a: 1, why: 'One feature gives one constraint, so a whole curve of (P, τ_I) pairs matches it.' },
  { q: 'Simulation-based inference (SBI) extends this idea by…', o: ['Learning the full posterior over parameters from many simulations', 'Removing the need for a model', 'Fitting only one parameter'], a: 0, why: 'SBI trains on simulated feature–parameter pairs to estimate which parameters are consistent with observed features, including their uncertainty.' }];
fpages[4].html = () => sec('f-idea', 'Feature-based fitting', 'Match what you can measure reliably',
  `<div class="math-scroll ml-math">\\[\\mathcal L(P,\\tau_I)=\\Big(\\frac{f_{model}-f_{obs}}{\\sigma_f}\\Big)^2+\\Big(\\frac{A_{model}-A_{obs}}{\\sigma_A}\\Big)^2\\]</div>
  <p>The observed signal is a noisy E-population trace from a Wilson–Cowan network with hidden drive P and inhibitory time constant τ<sub>I</sub>. Two features are measured from it: the oscillation frequency f and peak-to-trough amplitude A. For every (P, τ<sub>I</sub>) on a grid, the model is simulated and its features compared. Parameter pairs that produce no oscillation get a fixed high loss. This is the core of methods like <b>simulation-based inference</b>, which extend it to full uncertainty estimates.</p>`)
  + labBlock(
    `<div class="control-row"><label>Features used in the loss</label><label class="compare-label"><input type="checkbox" id="foF" checked> Frequency</label><label class="compare-label"><input type="checkbox" id="foA" checked> Amplitude</label></div>
     <label class="compare-label"><input type="checkbox" id="foTruth"> Show hidden true values</label><p class="muted">Click the landscape to simulate that (P, τ<sub>I</sub>) pair.</p>`,
    fig('foHeat', 'ml-sq', 'Feature loss over P and τ_I', key([C.ink, 'low loss'], [C.plum, 'your pick'], ['#ddd', 'no oscillation']), 'each pixel is one simulated network. Dark regions reproduce the observed features. Grey means the model did not oscillate.')
    + fig('foTrace', 'ml-sq', 'Observed rhythm vs your pick', key([C.muted, 'observed (noisy)'], [C.plum, 'model']), 'compare frequency and amplitude, not exact phase; the two traces are aligned at their first peak.'))
  + codeBlock('Feature-based grid fit with NumPy and SciPy', 'numpy, scipy') + related([['/lab/wilson-cowan/', 'Wilson–Cowan model'], ['/topics/dynamics-toolkit/hopf-normal-form/', 'Hopf & emerging oscillations'], ['/topics/validation/identifiability/', 'Identifiability']]);
fpages[4].tour = [
  { title: 'Both features', apply: () => foCtl && foCtl.feats(true, true), text: 'With frequency and amplitude, the low-loss region is small: only a narrow set of (P, τ<sub>I</sub>) pairs reproduce both. Click inside the dark spot to compare traces.', look: 'the size of the dark region.' },
  { title: 'Frequency only', apply: () => foCtl && foCtl.feats(true, false), text: 'Drop amplitude. Now a whole band of parameters matches the frequency: faster drive can be traded for slower inhibition. One feature cannot pin down two parameters.', look: 'the dark band stretching across the map.' },
  { title: 'Amplitude only', apply: () => foCtl && foCtl.feats(false, true), text: 'Amplitude alone gives a different band, crossing the frequency band. Where the two bands intersect is where both features match: that is why combining features identifies the parameters.', look: 'the orientation of this band compared with the previous step.' },
];
let foCtl = null;
fpages[4].init = () => {
  const nx = 26, ny = 26, Plim = [0.8, 2.6], Tlim = [0.6, 2.6], TRUE = { P: 1.4, tauI: 1.2 };
  const feats = (P, tauI) => { const r = wcRun({ ...WCdef, P, tauI }, 0.1, 0.05, 90, 0.05), E = r.E.slice(r.E.length * 0.45 | 0), amp = Math.max(...E) - Math.min(...E); if (amp < 0.02) return null;
    const m = E.reduce((a, b) => a + b) / E.length, ups = []; for (let i = 1; i < E.length; i++) if (E[i - 1] < m && E[i] >= m) ups.push(i); if (ups.length < 2) return null; return { f: (ups.length - 1) / ((ups.at(-1) - ups[0]) * 0.05), amp, r }; };
  const obsF = feats(TRUE.P, TRUE.tauI), rn = mulberry(13), obs = { f: obsF.f * (1 + 0.02 * gauss(rn)), amp: obsF.amp * (1 + 0.03 * gauss(rn)) };
  const obsTrace = obsF.r.E.map(v => v + 0.03 * gauss(rn)), sf = 0.03 * obs.f, sA = 0.04 * obs.amp;
  const st = { grid: new Array(nx * ny).fill(undefined), k: 0, pick: null };
  const Pv = i => Plim[0] + (Plim[1] - Plim[0]) * (i + .5) / nx, Tv = j => Tlim[0] + (Tlim[1] - Tlim[0]) * (j + .5) / ny;
  const loss = g => { if (g === undefined) return NaN; if (g === null) return Infinity; const uf = el('foF').checked, ua = el('foA').checked; return 0.05 + (uf ? ((g.f - obs.f) / sf) ** 2 : 0) + (ua ? ((g.amp - obs.amp) / sA) ** 2 : 0); };
  const draw = () => {
    const vals = st.grid.map(loss), fin = vals.filter(v => isFinite(v)); if (!fin.length) return;
    const a = axes(el('foHeat'), { xlim: Plim, ylim: Tlim, xlabel: 'drive P', ylabel: 'τ_I' }), lo = Math.log(Math.min(...fin)), hi = Math.log(Math.max(...fin, Math.min(...fin) * 10));
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = vals[j * nx + i]; if (isNaN(v)) continue; a.ctx.fillStyle = isFinite(v) ? cmap(1 - (Math.log(v) - lo) / (hi - lo)) : '#ddd';
      const x0 = a.X(Plim[0] + (Plim[1] - Plim[0]) * i / nx), x1 = a.X(Plim[0] + (Plim[1] - Plim[0]) * (i + 1) / nx), y0 = a.Y(Tlim[0] + (Tlim[1] - Tlim[0]) * j / ny), y1 = a.Y(Tlim[0] + (Tlim[1] - Tlim[0]) * (j + 1) / ny); a.ctx.fillRect(x0, y1, x1 - x0 + .6, y0 - y1 + .6); }
    if (st.pick) { a.ctx.fillStyle = C.plum; a.ctx.strokeStyle = C.paper; a.ctx.lineWidth = 2; a.ctx.beginPath(); a.ctx.arc(a.X(st.pick.P), a.Y(st.pick.tauI), 6, 0, 7); a.ctx.fill(); a.ctx.stroke(); }
    if (el('foTruth').checked) { a.ctx.strokeStyle = C.hot; a.ctx.lineWidth = 3; const x = a.X(TRUE.P), y = a.Y(TRUE.tauI); a.ctx.beginPath(); a.ctx.moveTo(x - 7, y - 7); a.ctx.lineTo(x + 7, y + 7); a.ctx.moveTo(x + 7, y - 7); a.ctx.lineTo(x - 7, y + 7); a.ctx.stroke(); }
    st.ax = a; a.done();
    const b = axes(el('foTrace'), { xlim: [0, 40], ylim: [0, 1], xlabel: 'time (τ_E)', ylabel: 'E' });
    const align = E => { const s = E.length * 0.45 | 0, seg = E.slice(s); let pk = 0; for (let i = 1; i < Math.min(seg.length - 1, 400); i++) if (seg[i] > seg[i - 1] && seg[i] >= seg[i + 1] && seg[i] > seg[pk]) pk = i; return seg.slice(pk, pk + 800); };
    const o = align(obsTrace); line(b, o.map((_, k) => k * 0.05), o, C.muted, 1.4);
    if (st.pick && st.pick.g) { const m = align(st.pick.g.r.E); line(b, m.map((_, k) => k * 0.05), m, C.plum, 2.2); } b.done();
    const done = st.grid.filter(g => g !== undefined).length;
    let best = Infinity, bi = -1; vals.forEach((v, i) => { if (v < best) { best = v; bi = i; } });
    el('ml-result').innerHTML = `Observed: frequency <b>${obs.f.toFixed(3)}</b> cycles/τ<sub>E</sub>, amplitude <b>${obs.amp.toFixed(2)}</b> · simulated ${done}/${nx * ny} networks${bi >= 0 ? ` · best grid point P = <b>${Pv(bi % nx).toFixed(2)}</b>, τ<sub>I</sub> = <b>${Tv(bi / nx | 0).toFixed(2)}</b>` : ''}`;
    const good = vals.filter(v => isFinite(v) && v < 6.05).length, uf = el('foF').checked, ua = el('foA').checked;
    let msg = done < nx * ny ? `<p>Simulating the grid (${done} of ${nx * ny} networks)…</p>` : '';
    msg += `<p><b>${good}</b> grid points match the ${uf && ua ? 'two features' : uf ? 'frequency' : ua ? 'amplitude' : 'chosen features'} within noise. ${uf && ua ? 'Combining two independent features narrows the answer to a small patch.' : uf || ua ? 'With a single feature, the matches form a band: many parameter pairs explain the same measurement.' : 'Select at least one feature.'}</p>`;
    if (st.pick && st.pick.g) msg += `<p>Your pick (P = ${st.pick.P.toFixed(2)}, τ<sub>I</sub> = ${st.pick.tauI.toFixed(2)}) gives frequency ${st.pick.g.f.toFixed(3)} and amplitude ${st.pick.g.amp.toFixed(2)}, versus ${obs.f.toFixed(3)} and ${obs.amp.toFixed(2)} observed. If τ<sub>E</sub> were 10 ms, the observed rhythm would be ${(obs.f * 100).toFixed(0)} Hz.</p>`;
    else if (st.pick) msg += '<p>Your pick does not oscillate: the fixed point is stable there.</p>';
    explain(msg);
  };
  const order = [...Array(nx * ny).keys()].sort(() => 0.5 - Math.random());
  const compute = () => { if (!document.body.contains(el('foHeat'))) return; const t0 = performance.now(); while (st.k < order.length && performance.now() - t0 < 30) { const i = order[st.k++]; st.grid[i] = feats(Pv(i % nx), Tv(i / nx | 0)); } draw(); if (st.k < order.length) requestAnimationFrame(compute); };
  el('foHeat').addEventListener('click', e => { const r = e.target.getBoundingClientRect(), a = st.ax, fx = (e.clientX - r.left - a.L) / (a.w - a.L - a.R), fy = 1 - (e.clientY - r.top - a.T) / (a.h - a.T - a.B); if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
    const P = Plim[0] + fx * (Plim[1] - Plim[0]), tauI = Tlim[0] + fy * (Tlim[1] - Tlim[0]); st.pick = { P, tauI, g: feats(P, tauI) }; draw(); });
  ['foF', 'foA', 'foTruth'].forEach(id => el(id).addEventListener('change', draw));
  foCtl = { feats: (f, a) => { el('foF').checked = f; el('foA').checked = a; draw(); } };
  requestAnimationFrame(compute); redraw.fn = draw;
  attachCode(`import numpy as np
from scipy.integrate import solve_ivp

def S(x, a, th): return 1/(1+np.exp(-a*(x-th))) - 1/(1+np.exp(a*th))
base = dict(wEE=16, wEI=12, wIE=15, wII=3, aE=1.3, thE=4, aI=2, thI=3.7, Q=0.0, tauE=1.0)

def features(P, tauI, T=90):
    p = dict(base, P=P, tauI=tauI)
    rhs = lambda t, z: [(-z[0] + S(p['wEE']*z[0] - p['wEI']*z[1] + P, p['aE'], p['thE']))/p['tauE'],
                        (-z[1] + S(p['wIE']*z[0] - p['wII']*z[1] + p['Q'], p['aI'], p['thI']))/tauI]
    sol = solve_ivp(rhs, (0, T), [0.1, 0.05], max_step=0.05, t_eval=np.arange(0, T, 0.05))
    E = sol.y[0][int(0.45 * sol.t.size):]
    amp = E.max() - E.min()
    if amp < 0.02: return None                       # no oscillation
    ups = np.where((E[:-1] < E.mean()) & (E[1:] >= E.mean()))[0]
    if ups.size < 2: return None
    return (ups.size - 1) / ((ups[-1] - ups[0]) * 0.05), amp

obs_f, obs_A = features(1.4, 1.2)                    # 'observed' features
P_grid, T_grid = np.linspace(0.8, 2.6, 30), np.linspace(0.6, 2.6, 30)
loss = np.full((T_grid.size, P_grid.size), np.inf)
for j, tI in enumerate(T_grid):
    for i, P in enumerate(P_grid):
        ft = features(P, tI)
        if ft: loss[j, i] = ((ft[0]-obs_f)/(0.03*obs_f))**2 + ((ft[1]-obs_A)/(0.04*obs_A))**2
j, i = np.unravel_index(np.argmin(loss), loss.shape)
print("best P =", P_grid[i], " tau_I =", T_grid[j])
# Next step: simulation-based inference, e.g. the 'sbi' package, to get a full posterior.`);
};

/* ---------- studio overview + router ---------- */
function fOverviewHTML() {
  return `<a class="breadcrumb" href="/">Home</a><div class="hero"><span class="pill">MODEL FITTING STUDIO · ${fpages.length} INTERACTIVE PAGES</span><h1>Fit models<br>to data.</h1><p class="lead">Fitting turns a model with unknown numbers into a quantitative hypothesis. These pages teach the full workflow with interactive fits you can run, break and repeat.</p></div>
  <div class="box pink"><h2>The fitting workflow</h2><ol class="ml-how">
    <li><b>Choose the model</b> and decide which parameters are free and which are fixed from other measurements.</li>
    <li><b>Choose what to compare.</b> Raw traces, summary features (rate, frequency, sag), or likelihoods of discrete events like spikes.</li>
    <li><b>Choose a loss.</b> Squared error assumes Gaussian noise; Poisson likelihood suits spike counts; weights account for unequal reliability.</li>
    <li><b>Search.</b> Grid search for 1–2 parameters, Nelder–Mead or gradient methods for more, evolutionary or Bayesian methods for rugged problems.</li>
    <li><b>Quantify uncertainty.</b> Loss landscapes, profile likelihood, bootstrap, or Hessian-based standard errors.</li>
    <li><b>Validate.</b> Predict data you did not fit, and compare against simpler and richer models.</li></ol></div>
  <div class="box tan"><h2>Key formulas</h2><div class="math-scroll ml-math">\\[\\mathrm{SSE}=\\sum_k (y_k-\\hat y_k)^2\\qquad -\\ln L_{\\text{Gauss}}=\\frac n2\\ln(2\\pi\\sigma^2)+\\frac{\\mathrm{SSE}}{2\\sigma^2}\\qquad -\\ln L_{\\text{Poisson}}=\\sum_j\\big(\\lambda_j-n_j\\ln\\lambda_j+\\ln n_j!\\big)\\]\\[\\mathrm{AIC}=2k-2\\ln L\\qquad\\mathrm{BIC}=k\\ln n-2\\ln L\\]</div></div>
  <div class="overview-cards">${fpages.map((m, i) => `<a class="topic-card" href="/fitting/${m.slug}/"><span class="eyebrow">0${i + 1} · ${m.level.toUpperCase()}</span><h2>${m.title}</h2><p>${m.blurb}</p><span class="card-link">Open →</span></a>`).join('')}</div>
  <footer><a class="secondary" href="/experiments/ephys/">← Patch clamp to model</a><a class="primary" href="/fitting/landscape/">Start with loss landscapes →</a></footer>${smallPrint()}`;
}
window.renderFitting = function (slug) {
  const i = fpages.findIndex(m => m.slug === slug);
  if (i < 0) { document.title = 'Model fitting studio · Little Neural Guide'; el('lesson').innerHTML = fOverviewHTML(); typeset(); return; }
  const m = fpages[i]; document.title = m.title + ' · Model fitting studio';
  el('lesson').innerHTML = fShell(i, m, m.html());
  requestAnimationFrame(() => { m.init(); if (m.tour) mountTour(m.tour); typeset(); });
};
