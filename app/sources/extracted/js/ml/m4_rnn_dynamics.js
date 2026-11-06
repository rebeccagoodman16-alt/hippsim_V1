/* Extracted from Little Neural Guide modellab.js [364943:378517] — section: M4. RECURRENT NETWORKS */
/* ======================================================================
   M4. RECURRENT NETWORKS AS DYNAMICAL SYSTEMS
   ====================================================================== */
mlpages[3].lead = 'Feed a layer back onto itself and the network gains memory and dynamics. A recurrent network of rate units obeys the same kind of equation as Wilson–Cowan, just with many more nodes. Here 200 units with random connections show the classic transition from silence to chaos.';
mlpages[3].jumps = [['m4-eq', 'The model'], ['experiment', 'Silence to chaos'], ['m4-eig', 'Reading eigenvalues'], ['m4-bptt', 'Training an RNN'], ['m4-neuro', 'In neuroscience'], ['code', 'Python']];
mlpages[3].html = () => sec('m4-eq', '01 · The model', 'A rate network is an RNN in continuous time',
  eqBox('\\[\\tau\\frac{d\\mathbf x}{dt}=-\\mathbf x+J\\,\\varphi(\\mathbf x)+\\mathbf I(t),\\qquad J_{ij}\\sim\\mathcal N\\!\\Big(0,\\frac{g^2}{N}\\Big),\\quad\\varphi=\\tanh\\]', 'x<sub>i</sub> is unit i’s input current (its “drive”), φ(x<sub>i</sub>) its rate. Each unit leaks back toward 0 with time constant τ and is pushed by the weighted rates of all the others. The gain g sets the typical connection strength. With Euler steps of Δt, this is exactly an RNN: x<sub>t+1</sub> = (1 − Δt/τ)x<sub>t</sub> + (Δt/τ)(Jφ(x<sub>t</sub>) + I<sub>t</sub>).')
  + table(['Network', 'Nodes', 'Edges', 'Update rule'], [
    ['Wilson–Cowan', '2 (E and I populations)', '4 couplings w<sub>EE</sub>, w<sub>EI</sub>, w<sub>IE</sub>, w<sub>II</sub>', 'τ dE/dt = −E + S(w<sub>EE</sub>E − w<sub>EI</sub>I + P)'],
    ['This page', '200 units', '40,000 random weights', 'τ dx/dt = −x + Jφ(x)'],
    ['Trained RNN for a task', 'tens to thousands', 'learned with BPTT', 'same form, plus input and readout weights'],
  ]))
  + mlBlock('From silence to chaos', `${ctl('rnG', 'Coupling gain g', 0.2, 3, 0.05, 1.5, 'typical connection strength × √N.')}
      <div class="lab-actions"><button class="primary" id="rnKick">Kick the network</button><button class="secondary" id="rnNew">New random network</button><button class="secondary" id="rnPause">Pause</button></div>`,
    fig('rnTr', 'ml-h220 wide', 'Activity of 8 units', key([C.ink, 'x(t) for 8 of 200 units']), 'each line is one unit’s drive over the last 40 τ. Below g = 1 a kick dies away; above it, activity fluctuates irregularly forever.')
    + fig('rnEig', 'ml-sq', 'Eigenvalues of J', key([C.plum, 'λ'], [C.muted, 'circle of radius g', 1], [C.hot, 'stability line Re λ = 1', 1]), 'random matrices fill a disk of radius g (the circular law). The silent state is stable while every eigenvalue lies left of the pink line.')
    + fig('rnNorm', 'ml-sq', 'Population activity size', key([C.plum, 'rms of x across units']), 'one number per moment: how active the network is. It decays to 0 for g < 1 and settles at a fluctuating level for g > 1.'))
  + sec('m4-eig', '02 · Reading the eigenvalues', 'Linearize, then look at the spectrum',
    eqBox('\\[\\tau\\frac{d\\,\\delta\\mathbf x}{dt}=\\big(-\\mathbb 1+J\\,\\varphi\\,\'(0)\\big)\\,\\delta\\mathbf x\\quad\\Rightarrow\\quad\\text{stable iff } \\operatorname{Re}\\lambda_i(J)<1\\ \\ \\forall i\\]', 'This is the same recipe as the Wilson–Cowan page: find the fixed point (here x = 0), compute the Jacobian, check its eigenvalues. Since φ′(0) = 1 for tanh and J’s eigenvalues fill a disk of radius g, the silent state loses stability at g = 1.')
    + steps([
      ['g < 1: a stable fixed point.', 'Every perturbation decays. The network forgets inputs within a few τ.'],
      ['g ≈ 1: the edge of chaos.', 'Decay is slow, so inputs linger: the network has long memory. Many argue computation is richest here.'],
      ['g > 1: chaos.', 'The fixed point is unstable but tanh saturation stops runaway growth. Activity fluctuates irregularly, and tiny differences grow exponentially (Sompolinsky, Crisanti & Sommers, 1988).'],
      ['A mean-field description.', 'For large N, each unit sees the sum of many independent random inputs: a Gaussian process whose statistics must match the activity they create. Solving that self-consistency is dynamic mean-field theory, the large-N bridge from network to a few statistics.'],
    ]))
  + sec('m4-bptt', '03 · Training an RNN', 'Backpropagation through time',
    '<p>To train a recurrent network on a task (remember a cue, produce a rhythm, integrate evidence), unroll it in time: copy the network once per time step, with the same weights in every copy. The result is a deep feedforward graph, and ordinary backprop runs through it. Gradients for the shared weights add up across copies (Werbos, 1990).</p>'
    + fig('rnUnroll', 'ml-h200 wide', 'Unrolling a recurrent network in time', key([C.ink, 'forward (shared J)'], [C.hot, 'gradient flowing back']), 'the same J is used at every step. Backward, the gradient is multiplied by the Jacobian at each step, so it shrinks (vanishing) or grows (exploding) depending on those eigenvalues, the same spectrum as above.')
    + steps([['Vanishing and exploding gradients.', 'Over T steps the gradient is multiplied by roughly T Jacobians. Eigenvalues below 1 shrink it exponentially; above 1 they blow it up. That is why gated units (LSTM, GRU) and careful initialization near g ≈ 1 matter.'],
      ['Reverse-engineering the result.', 'After training, find the network’s fixed points and linearize around them, just as for Wilson–Cowan. This reveals line attractors, oscillators and switches (Sussillo & Barak, 2013).']]))
  + sec('m4-neuro', '04 · In neuroscience', 'Why theorists care',
    table(['Idea', 'Example', 'Reference'], [
      ['Balanced, irregular cortical activity', 'Chaotic rate and spiking networks reproduce irregular firing', 'van Vreeswijk & Sompolinsky 1996; Brunel 2000 (see the Brunel lab)'],
      ['Training rate networks to match neural data', 'FORCE learning tames chaos to produce target outputs', 'Sussillo & Abbott 2009'],
      ['Task-trained RNNs as models of cortex', 'Context-dependent integration in prefrontal cortex', 'Mante et al. 2013'],
      ['Attractors for memory', 'Continuous attractors for head direction and place; discrete attractors in CA3', 'see Recurrence & attractors'],
    ]))
  + codeBlock('A random rate network and its spectrum in NumPy', 'numpy')
  + related([['/lab/wilson-cowan/', 'Wilson–Cowan'], ['/ml/mean-field-bridge/', 'From networks to mean field'], ['/topics/learning/recurrence-attractors/', 'Recurrence & attractors'], ['/lab/brunel/', 'Brunel network'], ['/topics/dynamics/stability-bifurcations/', 'Stability & bifurcations']]);
mlpages[3].pit = ['Confusing the eigenvalues of J with those of the Jacobian. For this model the Jacobian at 0 is (−1 + J)/τ, so the threshold is Re λ(J) = 1, not 0.', 'Assuming chaos means noise. The dynamics are deterministic; rerun with the same network and initial state and you get the same trajectory.', 'Training an RNN without clipping or a sensible initial gain, then blaming the task.'];
mlpages[3].quiz = [
  { q: 'For τ dx/dt = −x + J tanh(x), the silent state x = 0 is stable when…', o: ['All eigenvalues of J have real part below 1', 'All eigenvalues of J are negative', 'g > 1'], a: 0, why: 'The Jacobian is (−1 + J)/τ, so stability needs Re λ(J) < 1.' },
  { q: 'Random J with entries of variance g²/N has eigenvalues…', o: ['All equal to g', 'Spread uniformly over a disk of radius g', 'All real'], a: 1, why: 'The circular law: for large N, eigenvalues fill the disk |λ| ≤ g.' },
  { q: 'Backpropagation through time treats an RNN as…', o: ['A single layer', 'A deep feedforward network with the same weights copied at every time step', 'A Hebbian network'], a: 1, why: 'Unrolling copies the network once per step, with shared weights.' },
];
mlpages[3].tour = [
  { title: 'Below the edge: silence', apply: () => { setSlider('rnG', 0.8); el('rnKick').click(); }, text: 'With g = 0.8 every eigenvalue is left of the stability line. Kick the network and activity decays back to zero within a few τ.', look: 'the traces flattening and the rms dropping to 0.' },
  { title: 'Near the edge: long memory', apply: () => { setSlider('rnG', 1.0); el('rnKick').click(); }, text: 'At g ≈ 1 the disk just touches the line. Decay becomes very slow: the network holds onto a kick for a long time.', look: 'how much longer the traces take to settle.' },
  { title: 'Above the edge: chaos', apply: () => { setSlider('rnG', 1.8); el('rnKick').click(); }, text: 'At g = 1.8 many eigenvalues cross the line. Activity never settles: each unit fluctuates irregularly, slower than τ, with no external noise at all.', look: 'irregular traces and a steady non-zero rms.' },
  { title: 'Stronger coupling, bigger fluctuations', apply: () => setSlider('rnG', 2.8), text: 'Higher g means larger and faster fluctuations. Units spend more time near saturation (tanh = ±1).', look: 'larger swings in the traces.' },
];
mlpages[3].init = () => {
  let R = null, seed = 5, hist = [], paused = false, eig = null;
  const build = () => { const g = +el('rnG').value; R = makeRNN(200, g, seed); eig = eigReal(R.J, 200); hist = []; };
  const rescale = gNew => { const f = gNew / R.g; for (let i = 0; i < R.J.length; i++) R.J[i] *= f; R.g = gNew; eig = { re: eig.re.map(v => v * f), im: eig.im.map(v => v * f) }; };
  const draw = () => {
    const T = 40, t1 = R.t, sel = [0, 1, 2, 3, 4, 5, 6, 7];
    let a = axes(el('rnTr'), { xlim: [t1 - T, t1], ylim: [-3.5, 3.5], xlabel: 'time (τ)', ylabel: 'x' });
    const tt = hist.map(h => h.t);
    sel.forEach((u, k) => line(a, tt, hist.map(h => h.xs[k]), k === 0 ? C.plum : `rgba(20,17,17,${0.35 + 0.08 * k})`, 1.5)); a.done();
    const lim = Math.max(1.6, R.g * 1.2);
    a = axes(el('rnEig'), { xlim: [-lim, lim], ylim: [-lim, lim], xlabel: 'Re λ', ylabel: 'Im λ' });
    const th = Array.from({ length: 121 }, (_, k) => k * Math.PI / 60); line(a, th.map(v => R.g * Math.cos(v)), th.map(v => R.g * Math.sin(v)), C.muted, 1.4, [5, 4]); vline(a, 1, C.hot, [6, 4]);
    a.ctx.fillStyle = C.plum; eig.re.forEach((r, k) => { a.ctx.beginPath(); a.ctx.arc(a.X(r), a.Y(eig.im[k]), 2.6, 0, 7); a.ctx.fill(); }); a.done();
    a = axes(el('rnNorm'), { xlim: [t1 - T, t1], ylim: [0, 2], xlabel: 'time (τ)', ylabel: 'rms x' }); line(a, tt, hist.map(h => h.rms), C.plum, 2); a.done();
    const nUn = eig.re.filter(v => v > 1).length, maxRe = Math.max(...eig.re), rms = hist.length ? hist[hist.length - 1].rms : 0;
    el('ml-result').innerHTML = `g = <b>${nf(R.g, 2)}</b> · largest Re λ = <b>${nf(maxRe, 2)}</b> · <b>${nUn}</b> unstable eigenvalue${nUn === 1 ? '' : 's'} · current rms activity <b>${nf(rms, 3)}</b>`;
    explain(maxRe < 1 ? `<p><b>Stable silence.</b> Every eigenvalue has real part below 1, so the fixed point x = 0 attracts all activity. ${maxRe > 0.9 ? 'The largest is close to 1, so the slowest decay takes many τ: long memory of the last kick.' : 'Kicks die out within a few τ.'}</p>`
      : `<p><b>Chaotic activity.</b> ${nUn} of 200 eigenvalues lie right of the line, so x = 0 is unstable. Saturation of tanh caps growth, and the network settles into self-sustained irregular fluctuations with rms ≈ ${nf(rms, 2)}. No noise is being added: this irregularity is generated by the connections alone.</p>`);
  };
  const loop = () => {
    if (!document.body.contains(el('rnTr'))) return;
    if (!paused) { for (let s = 0; s < 6; s++) { rnnStep(R, 0.05); } const xs = [0, 1, 2, 3, 4, 5, 6, 7].map(i => R.x[i]); hist.push({ t: R.t, xs, rms: Math.sqrt(R.x.reduce((s, v) => s + v * v, 0) / R.N) }); while (hist.length && hist[0].t < R.t - 40) hist.shift(); draw(); }
    requestAnimationFrame(loop);
  };
  bind('rnG', v => nf(v, 2), v => { if (R) { rescale(v); draw(); } });
  el('rnKick').addEventListener('click', () => { for (let i = 0; i < R.N; i++) R.x[i] += 1.2 * R.gs(); });
  el('rnNew').addEventListener('click', () => { seed++; build(); });
  el('rnPause').addEventListener('click', () => { paused = !paused; el('rnPause').textContent = paused ? 'Resume' : 'Pause'; });
  build();
  // static unrolled diagram
  const drawUnroll = () => {
    const { ctx, w, h } = prep(el('rnUnroll')), T = 4, nodes = [], edges = [];
    for (let t = 0; t < T; t++) { const x = w * (0.12 + 0.25 * t); nodes.push({ x, y: h * 0.5, r: 24, label: `x${['ₜ₋₁', 'ₜ', 'ₜ₊₁', 'ₜ₊₂'][t]}`, fill: C.pink }, { x, y: h * 0.88, r: 14, label: 'I', fill: C.tan }, { x, y: h * 0.13, r: 14, label: 'ŷ', fill: C.paper }); }
    for (let t = 0; t < T; t++) { edges.push({ a: 3 * t + 1, b: 3 * t, w: 1 }, { a: 3 * t, b: 3 * t + 2, w: 1 }); if (t < T - 1) edges.push({ a: 3 * t, b: 3 * t + 3, w: 2, label: 'J', curve: -10 }, { a: 3 * t + 3, b: 3 * t, w: 2, hl: true, curve: -10 }); }
    drawGraph(ctx, nodes, edges);
  };
  drawUnroll(); requestAnimationFrame(loop); redraw.fn = () => { draw(); drawUnroll(); };
  attachCode(`import numpy as np

def simulate(N=200, g=1.5, T=60.0, dt=0.05, seed=5):
    """tau dx/dt = -x + J tanh(x), time in units of tau."""
    rng = np.random.default_rng(seed)
    J = rng.normal(0, g / np.sqrt(N), (N, N))
    x = 0.5 * rng.standard_normal(N)
    xs = []
    for _ in range(int(T / dt)):
        x = x + dt * (-x + J @ np.tanh(x))
        xs.append(x[:8].copy())
    return J, np.array(xs), np.sqrt(np.mean(x**2))

for g in [0.8, 1.0, 1.5, 2.5]:
    J, xs, rms = simulate(g=g)
    lam = np.linalg.eigvals(J)
    print(f"g={g}: max Re(lambda)={lam.real.max():.2f}, spectral radius={abs(lam).max():.2f}, final rms={rms:.3f}")

# matplotlib: plt.scatter(lam.real, lam.imag); plt.axvline(1)  -> the circular law and the stability line`);
};

