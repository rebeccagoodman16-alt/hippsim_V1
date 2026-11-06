/* Extracted from Little Neural Guide modellab.js [272604:285176] — section: F4. FIT A PLACE FIELD */
/* ======================================================================
   F4. FIT A PLACE FIELD — Poisson ML vs least squares; error vs laps
   ====================================================================== */
fpages[3].lead = 'Spike counts are not Gaussian numbers: they are small integers, often zero, with variance that grows with the mean. Fitting a place field properly means using a Poisson likelihood, and the amount of data you have sets how precisely you can locate the field.';
fpages[3].jumps = [['f-idea', 'The likelihood'], ['experiment', 'Interactive'], ['code', 'Python']];
fpages[3].pit = ['Fitting smoothed rate maps with least squares as if bins were independent Gaussian measurements.', 'Ignoring occupancy: bins visited briefly carry little information and should count less.', 'Reporting a field width from a few laps without an uncertainty estimate.'];
fpages[3].quiz = [
  { q: 'Why use a Poisson likelihood for spike counts?', o: ['Counts are non-negative integers whose variance scales with their mean', 'It is faster', 'It always gives narrower fields'], a: 0, why: 'For Poisson counts, variance equals the mean, so low-count bins are not as reliable as least squares assumes.' },
  { q: 'Doubling the number of laps should shrink the spread of estimates by about…', o: ['Half', '1/√2 (≈ 30%)', 'Nothing'], a: 1, why: 'For well-behaved estimators, standard error scales as 1/√(amount of data).' },
  { q: 'Which term in the Poisson log-likelihood accounts for occupancy?', o: ['n·log λ', '−λ·t (expected count = rate × time)', 'log n!'], a: 1, why: 'The expected count in a bin is the rate times the time spent there, so occupancy enters through λ·t.' }];
fpages[3].html = () => sec('f-idea', 'The likelihood', 'Spike counts as Poisson observations',
  `<div class="math-scroll ml-math">\\[\\lambda(x)=b+A\\,e^{-(x-\\mu)^2/2s^2},\\qquad \\ln L=\\sum_{\\text{bins }j}\\Big[n_j\\ln\\big(\\lambda(x_j)\\,t_j\\big)-\\lambda(x_j)\\,t_j-\\ln n_j!\\Big]\\]</div>
  <p>Each 2 cm bin j on a 200 cm track has a spike count n<sub>j</sub> and an occupancy t<sub>j</sub> (seconds spent there). The model rate λ has four parameters: baseline b, peak A, centre μ and width s. Maximising ln L (equivalently minimising −ln L) is maximum likelihood estimation. Least squares on the rate map is shown for comparison; it treats every bin as equally reliable, which spike counts are not.</p>`)
  + labBlock(
    ctl('pfLaps', 'Number of laps recorded', 1, 40, 1, 6, 'Each lap is one run in each direction at about 25 cm/s.')
    + ctl('pfMu', 'Centre μ', 0, 200, 1, 80, 'cm') + ctl('pfS', 'Width s', 3, 50, 0.5, 25, 'cm') + ctl('pfA', 'Peak A', 1, 30, 0.5, 6, 'Hz') + ctl('pfB', 'Baseline b', 0, 3, 0.05, 1, 'Hz')
    + `<div class="lab-actions"><button class="primary" id="pfML">Fit by Poisson ML</button><button class="secondary" id="pfLS">Fit by least squares</button><button class="secondary" id="pfRep">Repeat 60 sessions</button><button class="secondary" id="pfNew">New session</button></div>`,
    fig('pfPlot', 'ml-h260 wide', 'Rate along the track', key([C.muted, 'observed rate (counts ÷ time)'], [C.plum, 'your model'], [C.brown, 'least-squares fit', 1]), 'grey bars are spike counts divided by time spent in each bin. With few laps they are very noisy.')
    + fig('pfHistMu', 'ml-h200', 'Estimated centre across sessions', key([C.plum, 'Poisson ML'], [C.brown, 'least squares']), 'each bar counts sessions whose estimated centre fell in that range. Narrower = more precise. The hidden true centre is 120 cm.')
    + fig('pfHistS', 'ml-h200', 'Estimated width across sessions', key([C.plum, 'Poisson ML'], [C.brown, 'least squares']), 'the same for the width. The hidden true width is 15 cm.'))
  + codeBlock('Poisson maximum likelihood for a place field', 'numpy, scipy') + related([['/experiments/place-cells/', 'Place cells & behavior'], ['/topics/mean-field/population-activity/', 'From spikes to a population']]);
fpages[3].tour = [
  { title: 'Few laps, noisy data', apply: () => { pfCtl && pfCtl.laps(3); pfCtl && pfCtl.fit('ml'); }, text: 'With three laps the rate map is mostly zeros and a few spikes. Poisson ML still finds a sensible field, because it knows that zero counts in briefly visited bins are expected.', look: 'how ragged the grey bars are, and the fitted centre in the readout.' },
  { title: 'How precise is that?', apply: () => { pfCtl && pfCtl.repeat(); }, text: 'Sixty independent sessions of three laps each, each fitted both ways. The histograms show how much estimates scatter from session to session. Least squares (brown) is usually wider and more often biased.', look: 'the widths of the plum and brown histograms.' },
  { title: 'More data, sharper estimates', apply: () => { pfCtl && pfCtl.laps(24); pfCtl && pfCtl.repeat(); }, text: 'With 24 laps (8× more data) the spread shrinks by roughly √8 ≈ 2.8×. Data quantity, not cleverness, ultimately sets precision.', look: 'the histograms narrowing around 120 cm and 15 cm.' },
];
let pfCtl = null;
fpages[3].init = () => {
  const NB = 100, bw = 2, xs = Array.from({ length: NB }, (_, j) => (j + .5) * bw), TRUE = { mu: 120, s: 15, A: 12, b: 0.3 }, speed = 25;
  const st = { seed: 1, rep: null, ls: null };
  const lam = (x, p) => p.b + p.A * Math.exp(-((x - p.mu) ** 2) / (2 * p.s * p.s));
  const session = (laps, seed) => { const r = mulberry(seed), occ = xs.map(() => laps * 2 * bw / speed * (0.85 + 0.3 * r())), n = xs.map((x, j) => poisson(lam(x, TRUE) * occ[j], r)); return { occ, n }; };
  const poisson = (m, r) => { if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * gauss(r))); let L = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
  const nll = (p, d) => { let s = 0; for (let j = 0; j < NB; j++) { const mu = lam(xs[j], p) * d.occ[j]; s += mu - d.n[j] * Math.log(mu + 1e-12); } return s; };
  const lsq = (p, d) => { let s = 0; for (let j = 0; j < NB; j++) s += (d.n[j] / d.occ[j] - lam(xs[j], p)) ** 2; return s; };
  const toP = x => ({ mu: x[0] * 10, s: Math.exp(x[1]), A: Math.exp(x[2]), b: Math.exp(x[3]) }), toX = p => [p.mu / 10, Math.log(p.s), Math.log(p.A), Math.log(Math.max(p.b, 0.01))];
  const init0 = d => { const rate = d.n.map((c, j) => c / d.occ[j]); let bi = 0; rate.forEach((v, j) => { if (v > rate[bi]) bi = j; }); return { mu: xs[bi], s: 20, A: Math.max(1, rate[bi]), b: 0.5 }; };
  const fitD = (d, f, p0) => { const nm = makeNM(x => f(toP(x), d), toX(p0 || init0(d)), 0.3); let r; for (let k = 0; k < 400; k++) { r = nm.step(); if (k > 60 && r.spread < 1e-9) break; } return toP(r.x); };
  const params = () => ({ mu: +el('pfMu').value, s: +el('pfS').value, A: +el('pfA').value, b: +el('pfB').value });
  const setP = p => [['pfMu', p.mu], ['pfS', p.s], ['pfA', p.A], ['pfB', p.b]].forEach(([id, v]) => { el(id).value = v; el(id + '-o').textContent = fmtPF(id, v); });
  const fmtPF = (id, v) => id === 'pfMu' ? v.toFixed(0) + ' cm' : id === 'pfS' ? v.toFixed(1) + ' cm' : id === 'pfA' ? v.toFixed(1) + ' Hz' : v.toFixed(2) + ' Hz';
  const newSession = () => { st.data = session(+el('pfLaps').value, st.seed); st.ls = null; };
  const hist = (id, ml, ls, lo, hi, truth, label) => {
    const nb = 24, h1 = new Array(nb).fill(0), h2 = new Array(nb).fill(0), bwid = (hi - lo) / nb;
    ml.forEach(v => { const k = Math.floor((v - lo) / bwid); if (k >= 0 && k < nb) h1[k]++; }); ls.forEach(v => { const k = Math.floor((v - lo) / bwid); if (k >= 0 && k < nb) h2[k]++; });
    const a = axes(el(id), { xlim: [lo, hi], ylim: [0, Math.max(5, ...h1, ...h2) + 1], xlabel: label, ylabel: 'sessions' });
    for (let k = 0; k < nb; k++) { const x0 = lo + k * bwid; a.ctx.fillStyle = 'rgba(166,41,98,.75)'; a.ctx.fillRect(a.X(x0) + 1, a.Y(h1[k]), (a.X(x0 + bwid) - a.X(x0)) / 2 - 1, a.Y(0) - a.Y(h1[k])); a.ctx.fillStyle = 'rgba(111,76,39,.75)'; a.ctx.fillRect(a.X(x0 + bwid / 2), a.Y(h2[k]), (a.X(x0 + bwid) - a.X(x0)) / 2 - 1, a.Y(0) - a.Y(h2[k])); }
    vline(a, truth, C.ink); a.done();
  };
  const draw = () => {
    const d = st.data, p = params(), rate = d.n.map((c, j) => c / d.occ[j]), top = Math.max(20, ...rate) * 1.05;
    const a = axes(el('pfPlot'), { xlim: [0, 200], ylim: [0, top], xlabel: 'position on track (cm)', ylabel: 'Hz' });
    a.ctx.fillStyle = 'rgba(140,118,100,.45)'; rate.forEach((v, j) => a.ctx.fillRect(a.X(j * bw) + .5, a.Y(v), a.X(bw) - a.X(0) - 1, a.Y(0) - a.Y(v)));
    const fx = Array.from({ length: 300 }, (_, k) => k * 200 / 299); line(a, fx, fx.map(x => lam(x, p)), C.plum, 2.6);
    if (st.ls) line(a, fx, fx.map(x => lam(x, st.ls)), C.brown, 2, [6, 4]); a.done();
    const R = st.rep || { mlMu: [], lsMu: [], mlS: [], lsS: [] };
    hist('pfHistMu', R.mlMu, R.lsMu, 90, 150, 120, 'centre μ (cm)'); hist('pfHistS', R.mlS, R.lsS, 0, 40, 15, 'width s (cm)');
    const spikes = d.n.reduce((x, y) => x + y, 0), sd = v => { const m = v.reduce((x, y) => x + y, 0) / v.length; return Math.sqrt(v.reduce((s, y) => s + (y - m) ** 2, 0) / v.length); };
    el('ml-result').innerHTML = `${+el('pfLaps').value} laps · <b>${spikes}</b> spikes · −ln L of your model <b>${nll(p, d).toFixed(1)}</b>${st.rep ? ` · across 60 sessions, centre SD: ML <b>${sd(R.mlMu).toFixed(1)}</b> cm vs LS <b>${sd(R.lsMu).toFixed(1)}</b> cm; width SD: ML <b>${sd(R.mlS).toFixed(1)}</b> vs LS <b>${sd(R.lsS).toFixed(1)}</b> cm` : ''}`;
    let msg = `<p>This session contains ${spikes} spikes. ${spikes < 40 ? 'That is very little information: most bins have zero or one spike, so the observed rate jumps between 0 and large values.' : 'That is enough for a reasonably stable field estimate.'}</p>`;
    msg += `<p>Your model sits at μ = ${p.mu.toFixed(0)} cm with width ${p.s.toFixed(1)} cm. ${Math.abs(p.mu - 120) < 5 && Math.abs(p.s - 15) < 4 ? 'That is close to the hidden field (μ = 120 cm, s = 15 cm).' : 'Press <b>Fit by Poisson ML</b> to find the most likely parameters.'}</p>`;
    if (st.rep) { const r1 = sd(R.mlMu), r2 = sd(R.lsMu); msg += `<p>Over 60 repeated sessions, Poisson ML locates the centre with a spread of ${r1.toFixed(1)} cm${r2 > r1 * 1.1 ? `, tighter than least squares (${r2.toFixed(1)} cm)` : ''}. More laps shrink this spread roughly as 1/√laps.</p>`; }
    explain(msg);
  };
  const fit = which => { const d = st.data; if (which === 'ml') { setP(fitD(d, nll)); } else { st.ls = fitD(d, lsq); } draw(); };
  const repeat = () => {
    const laps = +el('pfLaps').value, R = { mlMu: [], lsMu: [], mlS: [], lsS: [] }; let k = 0; el('pfRep').disabled = true;
    const step = () => { for (let j = 0; j < 6 && k < 60; j++, k++) { const d = session(laps, 1000 + k * 17); const a = fitD(d, nll), b = fitD(d, lsq); R.mlMu.push(a.mu); R.mlS.push(a.s); R.lsMu.push(b.mu); R.lsS.push(b.s); } st.rep = R; draw(); if (k < 60) requestAnimationFrame(step); else el('pfRep').disabled = false; };
    requestAnimationFrame(step);
  };
  pfCtl = { laps: n => { setSlider('pfLaps', n); }, fit, repeat };
  bind('pfLaps', v => v + (v === 1 ? ' lap' : ' laps'), () => { newSession(); st.rep = null; draw(); });
  ['pfMu', 'pfS', 'pfA', 'pfB'].forEach(id => bind(id, v => fmtPF(id, v), draw));
  el('pfML').addEventListener('click', () => fit('ml')); el('pfLS').addEventListener('click', () => fit('ls')); el('pfRep').addEventListener('click', repeat);
  el('pfNew').addEventListener('click', () => { st.seed++; newSession(); draw(); });
  newSession(); draw(); redraw.fn = draw;
  attachCode(`import numpy as np
from scipy.optimize import minimize
from scipy.special import gammaln

x = np.arange(1, 200, 2.0)                       # bin centres (cm), 2 cm bins
rng = np.random.default_rng(1)
laps, speed = 6, 25.0
occ = laps * 2 * 2.0 / speed * rng.uniform(0.85, 1.15, x.size)   # seconds per bin
rate = lambda x, mu, s, A, b: b + A * np.exp(-(x - mu)**2 / (2 * s**2))
counts = rng.poisson(rate(x, 120, 15, 12, 0.3) * occ)

def nll(theta):
    mu, log_s, log_A, log_b = theta
    lam = rate(x, mu, np.exp(log_s), np.exp(log_A), np.exp(log_b)) * occ
    return np.sum(lam - counts * np.log(lam) + gammaln(counts + 1))

x0 = [x[np.argmax(counts / occ)], np.log(20), np.log(5), np.log(0.5)]
fit = minimize(nll, x0, method="Nelder-Mead", options=dict(maxiter=4000, xatol=1e-6, fatol=1e-8))
mu, s, A, b = fit.x[0], *np.exp(fit.x[1:])
print(f"centre {mu:.1f} cm, width {s:.1f} cm, peak {A:.1f} Hz, baseline {b:.2f} Hz")

# Approximate standard errors from the numerical Hessian of the NLL
import numdifftools as nd                        # pip install numdifftools
H = nd.Hessian(nll)(fit.x)
print("SEs (mu, log s, log A, log b):", np.sqrt(np.diag(np.linalg.inv(H))))`);
};

