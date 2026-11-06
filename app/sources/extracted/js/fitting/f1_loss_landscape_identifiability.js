/* Extracted from Little Neural Guide modellab.js [230100:244033] — section: F1. LOSS LANDSCAPES */
/* ======================================================================
   F1. LOSS LANDSCAPES & IDENTIFIABILITY — passive RC charging curve
   ====================================================================== */
fpages[0].lead = 'Every fit is a search over a landscape of error values. When the data cannot tell parameters apart, that landscape has a long flat valley instead of a single pit. Seeing the landscape is the fastest way to understand identifiability.';
fpages[0].jumps = [['f-idea', 'The idea'], ['experiment', 'Interactive'], ['f-ci', 'Confidence regions'], ['code', 'Python']];
fpages[0].pit = ['Reporting a best-fit value without checking whether nearby values fit equally well.', 'Concluding a parameter is “zero” or “large” when it is simply unconstrained by the data.', 'Fixing identifiability by adding priors without saying so. Priors are fine; hiding them is not.'];
fpages[0].quiz = [
  { q: 'The recording is 3 ms long and τ = 18 ms. Which parameter is poorly constrained?', o: ['C', 'R', 'Both equally'], a: 1, why: 'Early on, V ≈ I·t/C, which depends only on C. R only matters once the voltage starts to level off.' },
  { q: 'A long diagonal valley in the (R, C) landscape means…', o: ['The data constrain a combination of R and C, but not each one', 'The fit failed', 'R and C are both well known'], a: 0, why: 'Along the valley the error barely changes, so many (R, C) pairs fit equally well; only their combination is pinned down.' },
  { q: 'Which change would best improve identifiability here?', o: ['Fit faster', 'Record longer than several τ', 'Use more decimal places'], a: 1, why: 'Recording until the voltage plateaus reveals the steady state I·R, which pins down R independently of C.' }];
fpages[0].html = () => sec('f-idea', 'The idea', 'One model, one landscape',
  `<div class="math-scroll ml-math">\\[V(t)=I\\,R\\left(1-e^{-t/RC}\\right),\\qquad \\mathrm{RMSE}(R,C)=\\sqrt{\\tfrac1n\\textstyle\\sum_k\\big(V_k^{data}-V(t_k;R,C)\\big)^2}\\]</div>
  <p>A passive membrane charged by a current step rises toward I·R with time constant τ = RC. Early on, before it bends over, the curve is almost a straight line with slope I/C, so it carries information about C but almost none about R. The heat map shows the RMSE for every (R, C) pair: dark means a good fit. The outlined region contains every pair that fits about as well as the best one, given the noise.</p>`)
  + labBlock(
    ctl('flT', 'Recording length', 2, 150, 1, 40, 'ms after the current step. τ of the hidden cell is about 18 ms.')
    + ctl('flN', 'Recording noise σ', 0.05, 1.5, 0.05, 0.5, 'mV.')
    + `<div class="lab-actions"><button class="secondary" id="flNew">New noise sample</button><label class="compare-label"><input type="checkbox" id="flTruth"> Show the hidden true values</label></div><p class="muted">Click anywhere on the landscape to try that (R, C) pair.</p>`,
    fig('flHeat', 'ml-sq', 'Error landscape over R and C', key([C.ink, 'low error'], [C.hot, 'plausible region'], [C.plum, 'your pick']), 'each pixel is one (R, C) pair; darker is a better fit. The pink outline marks pairs statistically indistinguishable from the best fit.')
    + fig('flFit', 'ml-sq', 'Data and the curve for your pick', key([C.muted, 'data'], [C.plum, 'model']), 'grey dots are the noisy recording; the plum curve is the model with the (R, C) you clicked.'))
  + sec('f-ci', 'Confidence regions', 'Turning a landscape into error bars',
    `<p>With Gaussian noise of known σ, the sum of squared errors divided by σ² is a χ² statistic. Pairs with \\(\\Delta\\chi^2=\\mathrm{SSE}/\\sigma^2-\\min\\mathrm{SSE}/\\sigma^2<5.99\\) form an approximate 95% joint confidence region for two parameters. Projecting that region onto each axis gives a conservative range for R and for C. This is the idea behind <b>profile likelihood</b>, a standard identifiability check in systems biology and neuroscience.</p>`)
  + codeBlock('Map a loss landscape with NumPy', 'numpy, matplotlib') + related([['/topics/validation/identifiability/', 'Identifiability'], ['/topics/validation/fit-a-transient/', 'Fit a passive transient'], ['/experiments/ephys/', 'Patch clamp to model']]);
fpages[0].tour = [
  { title: 'A long recording', apply: () => setSliders({ flT: 120, flN: 0.5 }), text: 'With 120 ms of data (more than six time constants), the voltage clearly levels off at I·R. The plausible region is a small, round island: both R and C are well determined.', look: 'the compact pink outline and the narrow ranges in the readout.' },
  { title: 'Shorten the recording', apply: () => setSliders({ flT: 25 }), text: 'At 25 ms the curve has not fully plateaued. The island stretches into a diagonal valley: larger R can be compensated by smaller C. The data constrain τ = RC better than either parameter.', look: 'the outline elongating along a diagonal.' },
  { title: 'Very short recording', apply: () => setSliders({ flT: 4 }), text: 'With only 4 ms, the trace is nearly a straight line of slope I/C. C is still determined, but R is almost unconstrained: the valley runs off the edge of the map along the R axis. A fitting algorithm would return an arbitrary R.', look: 'the outline spanning nearly all R values at one C.' },
  { title: 'Noise widens everything', apply: () => setSliders({ flT: 40, flN: 1.4 }), text: 'Quadrupling the noise enlarges the plausible region in every direction. Better recordings, more repeats (averaging) and longer protocols all shrink it.', look: 'the size of the pink region compared with step 1.' },
];
fpages[0].init = () => {
  const I = 50, Rt = 120, Ct = 150, nx = 70, ny = 70, Rlim = [40, 400], Clim = [40, 400];  // pA, MΩ, pF
  let seedNoise = [];
  const newNoise = seed => { const r = mulberry(seed); seedNoise = Array.from({ length: 400 }, () => gauss(r)); };
  newNoise(3);
  const st = { pick: [200, 300] };
  const Vf = (t, R, Cc) => I * R / 1000 * (1 - Math.exp(-t / (R * Cc / 1000)));   // mV; R·C in MΩ·pF = µs → /1000 ms
  const compute = () => {
    const T = +el('flT').value, sig = +el('flN').value, n = 80, ts = Array.from({ length: n }, (_, k) => (k + 1) * T / n);
    const data = ts.map((t, k) => Vf(t, Rt, Ct) + sig * seedNoise[k]);
    const sse = (R, Cc) => ts.reduce((s, t, k) => s + (data[k] - Vf(t, R, Cc)) ** 2, 0);
    const vals = new Float64Array(nx * ny); let best = Infinity, bi = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const R = Rlim[0] * (Rlim[1] / Rlim[0]) ** ((i + .5) / nx), Cc = Clim[0] * (Clim[1] / Clim[0]) ** ((j + .5) / ny), v = sse(R, Cc);
      vals[j * nx + i] = v; if (v < best) { best = v; bi = j * nx + i; }
    }
    Object.assign(st, { T, sig, ts, data, sse, vals, best, bi });
  };
  const gridR = i => Rlim[0] * (Rlim[1] / Rlim[0]) ** ((i + .5) / nx), gridC = j => Clim[0] * (Clim[1] / Clim[0]) ** ((j + .5) / ny);
  const draw = () => {
    const { ctx, w, h } = prep(el('flHeat'));                   // log-spaced axes, drawn directly
    const L = 46, Rr = 10, T = 10, B = 30, X = R => L + Math.log(R / Rlim[0]) / Math.log(Rlim[1] / Rlim[0]) * (w - L - Rr), Y = Cc => T + (1 - Math.log(Cc / Clim[0]) / Math.log(Clim[1] / Clim[0])) * (h - T - B);
    const lo = Math.log(st.best + 1e-9), hi = Math.log(Math.max(...st.vals) + 1e-9), thr = st.best + 5.99 * st.sig ** 2;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = st.vals[j * nx + i]; ctx.fillStyle = cmap(1 - (Math.log(v + 1e-9) - lo) / (hi - lo)); const x0 = X(Rlim[0] * (Rlim[1] / Rlim[0]) ** (i / nx)), x1 = X(Rlim[0] * (Rlim[1] / Rlim[0]) ** ((i + 1) / nx)), y0 = Y(Clim[0] * (Clim[1] / Clim[0]) ** (j / ny)), y1 = Y(Clim[0] * (Clim[1] / Clim[0]) ** ((j + 1) / ny)); ctx.fillRect(x0, y1, x1 - x0 + .6, y0 - y1 + .6); }
    ctx.strokeStyle = C.hot; ctx.lineWidth = 2;                               // outline the plausible region
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const inside = st.vals[j * nx + i] < thr; if (!inside) continue;
      const x0 = X(Rlim[0] * (Rlim[1] / Rlim[0]) ** (i / nx)), x1 = X(Rlim[0] * (Rlim[1] / Rlim[0]) ** ((i + 1) / nx)), y0 = Y(Clim[0] * (Clim[1] / Clim[0]) ** (j / ny)), y1 = Y(Clim[0] * (Clim[1] / Clim[0]) ** ((j + 1) / ny));
      const nb = (di, dj) => { const ii = i + di, jj = j + dj; return ii >= 0 && ii < nx && jj >= 0 && jj < ny && st.vals[jj * nx + ii] < thr; };
      ctx.beginPath(); if (!nb(-1, 0)) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); } if (!nb(1, 0)) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); } if (!nb(0, -1)) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); } if (!nb(0, 1)) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); } ctx.stroke();
    }
    ctx.fillStyle = C.muted; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; [50, 100, 200, 400].forEach(v => { ctx.fillText(v, X(v), h - B + 14); }); ctx.textAlign = 'right'; [50, 100, 200, 400].forEach(v => ctx.fillText(v, L - 6, Y(v) + 4));
    ctx.fillStyle = C.ink; ctx.fillText('R (MΩ)', w - Rr, h - 2); ctx.save(); ctx.translate(11, T); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'right'; ctx.fillText('C (pF)', 0, 0); ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(L + .5, T + .5, w - L - Rr - 1, h - T - B - 1);
    ctx.fillStyle = C.plum; ctx.beginPath(); ctx.arc(X(st.pick[0]), Y(st.pick[1]), 6, 0, 7); ctx.fill(); ctx.strokeStyle = C.paper; ctx.lineWidth = 2; ctx.stroke();
    if (el('flTruth').checked) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; const tx = X(Rt), ty = Y(Ct); ctx.beginPath(); ctx.moveTo(tx - 7, ty - 7); ctx.lineTo(tx + 7, ty + 7); ctx.moveTo(tx + 7, ty - 7); ctx.lineTo(tx - 7, ty + 7); ctx.stroke(); }
    st.map = { X, Y, L, Rr, T, B, w, h };
    const b = axes(el('flFit'), { xlim: [0, st.T], ylim: [0, 8], xlabel: 'time (ms)', ylabel: 'mV' });
    b.ctx.fillStyle = C.muted; st.ts.forEach((t, k) => { b.ctx.beginPath(); b.ctx.arc(b.X(t), b.Y(st.data[k]), 1.8, 0, 7); b.ctx.fill(); });
    const tt = Array.from({ length: 200 }, (_, k) => k * st.T / 199); line(b, tt, tt.map(t => Vf(t, st.pick[0], st.pick[1])), C.plum, 2.4); b.done();
  };
  const report = () => {
    const thr = st.best + 5.99 * st.sig ** 2; let rmin = Infinity, rmax = 0, cmin = Infinity, cmax = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (st.vals[j * nx + i] < thr) { rmin = Math.min(rmin, gridR(i)); rmax = Math.max(rmax, gridR(i)); cmin = Math.min(cmin, gridC(j)); cmax = Math.max(cmax, gridC(j)); }
    const bR = gridR(st.bi % nx), bC = gridC(st.bi / nx | 0), pr = Math.sqrt(st.sse(...st.pick) / st.ts.length);
    const edgeR = rmax >= gridR(nx - 1) * 0.97 || rmin <= gridR(0) * 1.03;
    el('ml-result').innerHTML = `Best grid fit R ≈ <b>${bR.toFixed(0)} MΩ</b>, C ≈ <b>${bC.toFixed(0)} pF</b> · plausible ranges: R <b>${rmax / rmin < 1.05 ? '≈ ' + bR.toFixed(0) + ' (narrower than the grid)' : rmin.toFixed(0) + '–' + rmax.toFixed(0) + (edgeR ? '+' : '')}</b> MΩ, C <b>${cmax / cmin < 1.05 ? '≈ ' + bC.toFixed(0) : cmin.toFixed(0) + '–' + cmax.toFixed(0)}</b> pF · your pick RMSE ${pr.toFixed(2)} mV`;
    const tau = Rt * Ct / 1000, ratio = st.T / tau, wR = rmax / rmin, wC = cmax / cmin;
    let msg = `<p>The recording covers <b>${ratio.toFixed(1)} time constants</b>. `;
    msg += ratio > 4 ? 'The voltage has clearly levelled off, so the steady state pins down R and the rise time then pins down C.</p>' : ratio > 1 ? 'The voltage is still rising, so a larger R with a smaller C can produce nearly the same curve. The parameters are correlated.</p>' : 'The trace is almost a straight line with slope I/C. C is determined, but R barely affects the curve: it is <b>practically unidentifiable</b>.</p>';
    msg += `<p>The plausible R range spans a factor of <b>${wR.toFixed(1)}</b>${edgeR ? ' (and runs off the map)' : ''}; C spans a factor of <b>${wC.toFixed(1)}</b>. ${wR > 3 * wC ? 'R is far less certain than C.' : wC > 3 * wR ? 'C is far less certain than R.' : 'Both are similarly constrained.'}</p>`;
    explain(msg);
  };
  const update = () => { compute(); if (!st.picked) st.pick = [gridR(st.bi % nx), gridC(st.bi / nx | 0)]; draw(); report(); };
  el('flHeat').addEventListener('click', e => {
    const r = e.target.getBoundingClientRect(), m = st.map, x = e.clientX - r.left, y = e.clientY - r.top;
    const fx = (x - m.L) / (m.w - m.L - m.Rr), fy = 1 - (y - m.T) / (m.h - m.T - m.B); if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
    st.pick = [Rlim[0] * (Rlim[1] / Rlim[0]) ** fx, Clim[0] * (Clim[1] / Clim[0]) ** fy]; st.picked = true; draw(); report();
  });
  bind('flT', v => v + ' ms', () => { st.picked = false; update(); }); bind('flN', v => v.toFixed(2) + ' mV', () => { st.picked = false; update(); });
  el('flNew').addEventListener('click', () => { newNoise(Math.floor(Math.random() * 1e6)); st.picked = false; update(); });
  el('flTruth').addEventListener('change', draw);
  update(); redraw.fn = draw;
  attachCode(`import numpy as np
import matplotlib.pyplot as plt

I, R_true, C_true, sigma = 50e-12, 120e6, 150e-12, 0.5e-3      # A, Ω, F, V
def V(t, R, C):
    return I * R * (1 - np.exp(-t / (R * C)))

T = 0.025                                         # try 0.004, 0.025, 0.12 s
t = np.linspace(T / 80, T, 80)
rng = np.random.default_rng(3)
data = V(t, R_true, C_true) + rng.normal(0, sigma, t.size)

R = np.geomspace(30e6, 600e6, 120)
C = np.geomspace(30e-12, 600e-12, 120)
RR, CC = np.meshgrid(R, C)
sse = ((data[None, None, :] - V(t[None, None, :], RR[..., None], CC[..., None]))**2).sum(-1)

chi2 = sse / sigma**2
region = chi2 < chi2.min() + 5.99                # ~95% joint region for 2 parameters
print("R range (MΩ):", RR[region].min() / 1e6, "-", RR[region].max() / 1e6)
print("C range (pF):", CC[region].min() * 1e12, "-", CC[region].max() * 1e12)

plt.pcolormesh(R / 1e6, C * 1e12, np.log(sse), shading='auto')
plt.contour(R / 1e6, C * 1e12, region, levels=[0.5], colors='w')
plt.xscale('log'); plt.yscale('log'); plt.xlabel('R (MΩ)'); plt.ylabel('C (pF)')
plt.show()`);
};

