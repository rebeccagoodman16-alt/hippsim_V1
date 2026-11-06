/* Extracted from Little Neural Guide modellab.js [350044:364943] — section: M3. GRADIENT DESCENT */
/* ======================================================================
   M3. GRADIENT DESCENT & LOSS LANDSCAPES
   ====================================================================== */
mlpages[2].lead = 'Backprop gives the direction of steepest increase. Gradient descent takes a step the other way, again and again. Whether that works depends on the shape of the loss surface and on the step size. The same ideas govern fitting a neuron model and training a deep network.';
mlpages[2].jumps = [['m3-eq', 'The update'], ['experiment', 'Drop a ball'], ['m3-curv', 'Curvature'], ['m3-neuro', 'Neuroscience links'], ['code', 'Python']];
mlpages[2].html = () => sec('m3-eq', '01 · The update rule', 'Downhill, with or without momentum',
  eqBox('\\[\\theta_{k+1}=\\theta_k-\\eta\\,\\nabla L(\\theta_k)\\qquad\\text{momentum: } \\mathbf v_{k+1}=\\beta\\mathbf v_k-\\eta\\nabla L,\\ \\ \\theta_{k+1}=\\theta_k+\\mathbf v_{k+1}\\]', 'η is the learning rate. Momentum β keeps a running velocity, so consistent gradients add up and zig-zags cancel. Stochastic gradient descent (SGD) uses a noisy gradient from a random subset of data each step.'))
  + mlBlock('Drop a ball on a loss surface', `<div class="control-row"><label>Landscape</label>${btns('data-land', Object.entries(LANDS).map(([k, L]) => [k, L.name]))}</div>
      ${ctl('gdLr', 'Learning rate η', -3, 0, 0.05, -1.3, 'log scale.')}${ctl('gdB', 'Momentum β', 0, 0.95, 0.05, 0)}${ctl('gdN', 'Gradient noise (SGD)', 0, 3, 0.1, 0, 'standard deviation added to each gradient component.')}
      <div class="lab-actions"><button class="primary" id="gdGo">Run</button><button class="secondary" id="gdReset">Reset start</button></div><p class="muted">Click the surface to choose a new starting point.</p>`,
    fig('gdMap', 'ml-sq', 'Loss surface and path', key([C.plum, 'low loss'], [C.ink, 'path'], [C.hot, 'start / now']), 'darker colour is lower loss; bands are contour levels. The black line is the optimizer’s path; the star marks the global minimum.')
    + fig('gdLoss', 'ml-sq', 'Loss above the minimum', key([C.plum, 'L − L*']), 'log scale. A straight downward line means steady (linear) convergence; a flat stretch means a plateau or saddle.'))
  + sec('m3-curv', '02 · Why the learning rate must match the curvature', 'The one inequality worth remembering',
    eqBox('\\[\\eta<\\frac{2}{\\lambda_{max}}\\qquad\\kappa=\\frac{\\lambda_{max}}{\\lambda_{min}}\\]', 'Near a minimum the loss is a bowl whose steepness in each direction is a Hessian eigenvalue λ. A step larger than 2/λ<sub>max</sub> overshoots the steepest direction and diverges. But the shallowest direction, at rate ∝ ηλ<sub>min</sub>, sets how long convergence takes. The condition number κ measures that conflict.')
    + steps([
      ['Ill-conditioning.', 'In the elongated bowl, λ = 1 and 10 (κ = 10). Pick η near 0.2: the path zig-zags across the steep direction while creeping along the shallow one. Momentum fixes much of this.'],
      ['Local minima.', 'In the two-minima landscape, where you start decides where you end. Noise (SGD) can kick the ball over the barrier.'],
      ['Saddles.', 'At a saddle the gradient vanishes but it is not a minimum. Started almost exactly on the ridge, the ball stalls for a long time before falling off. In high dimensions, saddles are far more common than bad local minima (Dauphin et al., 2014).'],
      ['Valleys.', 'In the curved valley the floor bends, so a fixed step either crawls or bounces off the walls. This shape appears whenever two parameters trade off, like g<sub>L</sub> and C in the fitting studio.'],
    ]))
  + sec('m3-neuro', '03 · Links to neuroscience', 'Where you will meet this again',
    table(['Situation', 'Parameters', 'What the landscape tells you'], [
      ['Fitting a neuron model to recordings', 'Conductances, time constants', 'Long flat valleys = unidentifiable combinations (see the fitting studio)'],
      ['Training a network model of a task', 'Thousands of synaptic weights', 'η and conditioning decide whether training works'],
      ['Synaptic plasticity as optimization', 'Real synapses', 'Some plasticity rules approximate gradient descent on an objective; others (like STDP) do not follow any obvious gradient'],
      ['Development and learning speed', 'Learning-rate-like neuromodulation', 'Dopamine and acetylcholine are proposed to change effective learning rates'],
    ]))
  + codeBlock('Gradient descent with momentum in NumPy', 'numpy')
  + related([['/fitting/landscape/', 'Loss landscapes in fitting'], ['/ml/backprop/', 'Backprop step by step'], ['/lab/neural-network/', 'Train an MLP'], ['/lab/wilson-cowan/', 'Fixed points & stability']]);
mlpages[2].pit = ['Choosing η once and never checking. If the loss goes up or oscillates, η is too large for the current curvature.', 'Reading a plateau as convergence. Check the gradient norm, and compare several starts.', 'Comparing optimizers at one learning rate each. Each needs its own tuning.'];
mlpages[2].quiz = [
  { q: 'Near a minimum the largest Hessian eigenvalue is 50. Plain gradient descent is stable for η below…', o: ['0.04', '0.4', '50'], a: 0, why: 'η < 2/λ<sub>max</sub> = 2/50 = 0.04.' },
  { q: 'Momentum mainly helps by…', o: ['Making the loss smaller', 'Averaging out zig-zags and accelerating along consistent directions', 'Adding noise'], a: 1, why: 'Velocity accumulates consistent gradient components; oscillating components cancel.' },
  { q: 'A long flat stretch in the loss curve, then a sudden drop, often means…', o: ['A bug', 'The optimizer was near a saddle point or plateau', 'The learning rate is too large'], a: 1, why: 'Small gradients near saddles slow progress until the path finds the descending direction.' },
];
mlpages[2].tour = [
  { title: 'Plain descent in a bowl', apply: () => window.__gd && __gd.set('bowl', { gdLr: Math.log10(0.05), gdB: 0, gdN: 0 }), text: 'With a small step the path heads downhill, quickly in the steep y direction and slowly in the shallow x direction.', look: 'the path curving toward the long axis, and the straight-line loss decay.' },
  { title: 'Too big a step', apply: () => window.__gd && __gd.set('bowl', { gdLr: Math.log10(0.21), gdB: 0, gdN: 0 }), text: 'Just above η = 2/λ<sub>max</sub> = 0.2 the steep direction overshoots more each step and the run diverges.', look: 'the path bouncing outward and the loss climbing.' },
  { title: 'Momentum to the rescue', apply: () => window.__gd && __gd.set('bowl', { gdLr: Math.log10(0.05), gdB: 0.8, gdN: 0 }), text: 'Same small η, now with momentum 0.8. Velocity builds along the shallow axis, so convergence is much faster.', look: 'the loss curve dropping far more steeply than in step 1.' },
  { title: 'Which valley?', apply: () => window.__gd && __gd.set('twomin', { gdLr: Math.log10(0.05), gdB: 0, gdN: 0 }), text: 'Starting on the right, descent settles in the shallower local minimum and never finds the deeper one on the left. Click a start point on the left to compare.', look: 'where the path stops relative to the star.' },
  { title: 'Noise can help', apply: () => window.__gd && __gd.set('twomin', { gdLr: Math.log10(0.05), gdB: 0, gdN: 2.5 }), text: 'Noisy gradients, like SGD on small batches, jitter the path. Sometimes the jitter carries it over the barrier into the better minimum. Rerun a few times.', look: 'whether the path crosses to the left basin.' },
  { title: 'Stuck at a saddle', apply: () => window.__gd && __gd.set('saddle', { gdLr: Math.log10(0.05), gdB: 0, gdN: 0 }), text: 'Starting almost exactly on the ridge (y = 0.001), the ball rolls to the saddle and sits there while the gradient is nearly zero, then eventually falls off to one side.', look: 'the long plateau in the loss curve before the drop.' },
];
mlpages[2].init = () => {
  let land = 'bowl', start = LANDS.bowl.start.slice(), run = null, k = 0, playing = false;
  const prm = () => ({ lr: 10 ** +el('gdLr').value, beta: +el('gdB').value, noise: +el('gdN').value });
  let cache = null;
  const surface = () => {
    const L = LANDS[land]; if (cache && cache.land === land) return cache;
    const n = 110, vals = new Float64Array(n * n), fmin = L.f(...L.min);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) vals[j * n + i] = Math.log10(L.f(L.xl[0] + (i + .5) / n * (L.xl[1] - L.xl[0]), L.yl[0] + (j + .5) / n * (L.yl[1] - L.yl[0])) - fmin + 1e-3);
    let lo = Infinity, hi = -Infinity; vals.forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    return cache = { land, n, vals, lo, hi };
  };
  const compute = () => { run = gdRun(LANDS[land], start, { ...prm(), steps: 600, seed: Math.floor(Math.random() * 1e6) }); k = 0; };
  const draw = () => {
    const L = LANDS[land], S = surface(), p = prm();
    const ax = axes(el('gdMap'), { xlim: L.xl, ylim: L.yl, xlabel: 'θ₁', ylabel: 'θ₂' }), n = S.n, dx = (L.xl[1] - L.xl[0]) / n, dy = (L.yl[1] - L.yl[0]) / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const t = (S.vals[j * n + i] - S.lo) / (S.hi - S.lo), band = Math.floor(t * 14) / 14; ax.ctx.fillStyle = cmap(1 - band); ax.ctx.fillRect(ax.X(L.xl[0] + i * dx), ax.Y(L.yl[0] + (j + 1) * dy), ax.X(L.xl[0] + dx) - ax.X(L.xl[0]) + .7, ax.Y(L.yl[0]) - ax.Y(L.yl[0] + dy) + .7); }
    ax.ctx.fillStyle = C.ink; ax.ctx.font = '16px system-ui'; ax.ctx.textAlign = 'center'; ax.ctx.textBaseline = 'middle'; ax.ctx.fillText('★', ax.X(L.min[0]), ax.Y(L.min[1]));
    const P = run.path.slice(0, k + 1);
    ax.ctx.strokeStyle = C.ink; ax.ctx.lineWidth = 1.8; ax.ctx.beginPath(); P.forEach(([x, y], i) => i ? ax.ctx.lineTo(ax.X(x), ax.Y(y)) : ax.ctx.moveTo(ax.X(x), ax.Y(y))); ax.ctx.stroke();
    ax.ctx.fillStyle = C.ink; P.forEach(([x, y]) => { ax.ctx.beginPath(); ax.ctx.arc(ax.X(x), ax.Y(y), 1.8, 0, 7); ax.ctx.fill(); });
    ax.ctx.fillStyle = C.hot; [P[0], P[P.length - 1]].forEach(([x, y]) => { ax.ctx.beginPath(); ax.ctx.arc(ax.X(x), ax.Y(y), 6, 0, 7); ax.ctx.fill(); ax.ctx.strokeStyle = C.ink; ax.ctx.lineWidth = 1.5; ax.ctx.stroke(); });
    ax.done();
    const ls = run.loss.slice(0, k + 1).map(v => Math.max(v, 1e-12));
    const a2 = axes(el('gdLoss'), { xlim: [0, Math.max(50, run.loss.length - 1)], ylim: [1e-8, Math.max(10, ...ls.filter(isFinite).slice(0, 5)) * 2], logy: true, xlabel: 'step', ylabel: 'L − L*' });
    line(a2, ls.map((_, i) => i), ls, C.plum, 2); a2.done();
    const [x, y] = P[P.length - 1], ev = hessEig(L, x, y), evm = hessEig(L, ...L.min), lmax = evm[1], diverged = !isFinite(ls[ls.length - 1]) || ls[ls.length - 1] > 1e6;
    el('ml-result').innerHTML = `Step <b>${k}</b> · loss above minimum <b>${nf(run.loss[k], 4)}</b> · η = <b>${nf(p.lr, 3)}</b> · at the minimum λ = ${nf(evm[0], 2)}, ${nf(evm[1], 2)} → stable for η < <b>${nf(2 / lmax, 3)}</b>${p.beta ? ` (momentum stretches this to 2(1 + β)/λ<sub>max</sub> = ${nf(2 * (1 + p.beta) / lmax, 3)})` : ''}`;
    let ex = `<p><b>${L.name}.</b> `;
    if (diverged) ex += `The run <b>diverged</b>: η = ${nf(p.lr, 3)} exceeds the stability limit in the steepest direction. Lower η.</p>`;
    else if (p.lr * (1 + p.beta) > 1.6 / lmax && land === 'bowl') ex += 'η is close to the stability limit, so the path zig-zags across the steep direction.</p>';
    else ex += `Local curvature where the ball is now: λ = ${nf(ev[0], 2)}, ${nf(ev[1], 2)}. ${ev[0] < 0 ? 'One eigenvalue is negative: the ball is near a ridge or saddle, where the surface curves down in one direction.' : 'Both positive: locally a bowl.'}</p>`;
    if (land === 'twomin') { const right = x > 0; ex += `<p>${right ? 'The path ended in the <b>right-hand, shallower minimum</b>, a local minimum. Its loss is about 0.6 higher than the global one.' : 'The path found the <b>deeper, left-hand minimum</b>.'}</p>`; }
    if (land === 'saddle') ex += '<p>The origin is a saddle: curving up along θ₁ but down along θ₂. The gradient there is zero, so descent stalls until a tiny displacement grows and the ball slides off.</p>';
    if (land === 'valley') ex += '<p>The valley floor curves. The steep walls (λ up to ≈ 50) force a small η, but then progress along the floor is slow: the classic Rosenbrock problem.</p>';
    if (p.noise > 0) ex += `<p>Gradient noise (σ = ${nf(p.noise, 1)}) makes the path jitter and stops it settling exactly at the minimum. In practice the learning rate is decayed over training to reduce that jitter.</p>`;
    explain(ex);
  };
  const loop = () => { if (!playing || !document.body.contains(el('gdMap'))) return; k = Math.min(run.path.length - 1, k + 3); draw(); if (k >= run.path.length - 1) { playing = false; el('gdGo').textContent = 'Run again'; return; } requestAnimationFrame(loop); };
  const play = () => { compute(); playing = true; el('gdGo').textContent = 'Running…'; requestAnimationFrame(loop); };
  const setLand = l => { land = l; start = LANDS[l].start.slice(); document.querySelectorAll('[data-land]').forEach(b => b.setAttribute('aria-pressed', b.dataset.land === l)); };
  window.__gd = { set: (l, s) => { setLand(l); setSliders(s); play(); } };
  document.querySelectorAll('[data-land]').forEach(b => b.addEventListener('click', () => { setLand(b.dataset.land); play(); }));
  bind('gdLr', v => nf(10 ** v, 3), debounce(play, 150)); bind('gdB', v => nf(v, 2), debounce(play, 150)); bind('gdN', v => nf(v, 1), debounce(play, 150));
  el('gdGo').addEventListener('click', play);
  el('gdReset').addEventListener('click', () => { start = LANDS[land].start.slice(); play(); });
  el('gdMap').addEventListener('click', e => {
    const r = el('gdMap').getBoundingClientRect(), L = LANDS[land], ax = { L: 46, R: 10, T: 10, B: 30 }, w = r.width, h = r.height;
    const fx = (e.clientX - r.left - ax.L) / (w - ax.L - ax.R), fy = 1 - (e.clientY - r.top - ax.T) / (h - ax.T - ax.B);
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
    start = [L.xl[0] + fx * (L.xl[1] - L.xl[0]), L.yl[0] + fy * (L.yl[1] - L.yl[0])]; play();
  });
  setLand('bowl'); play(); redraw.fn = draw;
  attachCode(`import numpy as np

def f(p):                      # elongated bowl: Hessian eigenvalues 1 and 10
    x, y = p; return 0.5 * (x**2 + 10 * y**2)
def grad(p):
    x, y = p; return np.array([x, 10 * y])

def descend(p0, lr, beta=0.0, noise=0.0, steps=300, seed=0):
    rng = np.random.default_rng(seed)
    p, v, path = np.array(p0, float), np.zeros(2), [np.array(p0, float)]
    for _ in range(steps):
        g = grad(p) + noise * rng.standard_normal(2)
        v = beta * v - lr * g          # momentum (beta = 0 gives plain GD)
        p = p + v
        path.append(p.copy())
    return np.array(path)

for lr, beta in [(0.05, 0.0), (0.21, 0.0), (0.05, 0.8)]:
    path = descend([-1.9, 1.2], lr, beta)
    print(f"lr={lr:<5} beta={beta:<4} final loss {f(path[-1]):.2e}")

# Stability limit from the Hessian
H = np.array([[1, 0], [0, 10]]); lam = np.linalg.eigvalsh(H)
print("stable for lr <", 2 / lam.max(), " condition number", lam.max() / lam.min())`);
};

