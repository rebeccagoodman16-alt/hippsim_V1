/* Extracted from Little Neural Guide modellab.js [328915:350044] — section: M2. BACKPROPAGATION */
/* ======================================================================
   M2. BACKPROPAGATION, STEP BY STEP
   ====================================================================== */
mlpages[1].lead = 'Backpropagation answers one question for every weight: if I nudge this weight, how much does the error change? It does it with the chain rule, reusing each intermediate result, in a single backward sweep. Click through it on a network small enough to see every number.';
mlpages[1].jumps = [['m2-idea', 'The idea'], ['m2-chain', 'Chain rule'], ['experiment', 'Step through it'], ['m2-check', 'Gradient check'], ['m2-xor', 'Train on XOR'], ['m2-bio', 'Is it biological?'], ['code', 'Python']];
const BP_STEPS = [
  ['Inputs', 'f'], ['Hidden unit 1', 'f'], ['Hidden unit 2', 'f'], ['Output', 'f'], ['Loss', 'f'],
  ['Start the backward pass', 'b'], ['Through the output non-linearity', 'b'], ['Output weights', 'b'], ['Back to hidden unit 1', 'b'], ['Back to hidden unit 2', 'b'], ['Input weights', 'b'], ['Update every weight', 'u'],
];
mlpages[1].html = () => sec('m2-idea', '01 · The idea', 'Blame flows backwards',
  '<p>Training needs the gradient: the derivative of the loss with respect to every weight. Computing each derivative separately would repeat the same work many times. Backprop runs the network forward once, storing every intermediate value, then sweeps backward from the loss. At each node it multiplies the incoming “blame” by a local derivative and passes it on. Each weight’s gradient is then <b>(blame arriving at its target node) × (activity at its source node)</b>.</p>'
  + table(['Phase', 'Direction', 'Each node computes', 'Stores'], [
    ['Forward pass', 'inputs → output', 'z = Σ w·a<sub>in</sub> + b, then a = φ(z)', 'z and a'],
    ['Loss', 'at the output', 'L = ½(y − t)²', 'L'],
    ['Backward pass', 'output → inputs', 'δ = (Σ w·δ<sub>next</sub>) × φ′(z)', 'δ, “how much this node’s drive matters”'],
    ['Weight gradient', 'each edge', '∂L/∂w = δ<sub>target</sub> × a<sub>source</sub>', '—'],
    ['Update', 'every weight', 'w ← w − η ∂L/∂w', 'new weights'],
  ]))
  + sec('m2-chain', '02 · The chain rule on a graph', 'The equations behind every step',
    eqBox('\\[\\frac{\\partial L}{\\partial v_i}=\\underbrace{(y-t)}_{\\partial L/\\partial y}\\;\\underbrace{y(1-y)}_{\\partial y/\\partial z_3}\\;\\underbrace{a_i}_{\\partial z_3/\\partial v_i}=\\delta_{out}\\,a_i\\]\\[\\frac{\\partial L}{\\partial w_{ij}}=\\underbrace{\\delta_{out}\\,v_i}_{\\partial L/\\partial a_i}\\;\\underbrace{a_i(1-a_i)}_{\\partial a_i/\\partial z_i}\\;\\underbrace{x_j}_{\\partial z_i/\\partial w_{ij}}=\\delta_i\\,x_j\\]',
      'The network: inputs x₁, x₂ → two sigmoid hidden units (a₁, a₂) → one sigmoid output y, with squared-error loss L = ½(y − t)². Each derivative is a product of local pieces along the path from the weight to the loss. Note how δ<sub>out</sub> is reused for both hidden units: that sharing is what makes backprop efficient.'))
  + mlBlock('Step through one forward and backward pass', `${ctl('bpX1', 'Input x₁', -1, 1, 0.05, 0.6)}${ctl('bpX2', 'Input x₂', -1, 1, 0.05, -0.4)}${ctl('bpT', 'Target t', 0, 1, 0.05, 1)}${ctl('bpLr', 'Learning rate η', 0.1, 5, 0.1, 1)}
      <div class="lab-actions"><button class="secondary" id="bpBack">← Back</button><button class="primary" id="bpNext">Next step →</button></div>
      <div class="lab-actions"><button class="secondary" id="bpAll">Show everything</button><button class="secondary" id="bpReset">New random weights</button></div>`,
    fig('bpG', 'ml-h300 wide', 'The network, live', key([C.ink, 'forward value'], [C.plum, 'gradient (pink tags)'], [C.hot, 'active this step']), 'node labels show z (drive) and a (activity). Pink tags below nodes are δ, the blame arriving at that node. Pink tags on edges are ∂L/∂w.')
    + `<div class="box tan ml-wide ml-bpstep" id="bpStep"></div>`
    + fig('bpL', 'ml-h200 wide', 'Loss after each update', key([C.plum, 'L on this example']), 'each point is one full forward–backward–update cycle. The loss should fall every time while η is small enough.'))
  + sec('m2-check', '03 · Gradient check', 'Never trust a gradient you have not checked',
    '<p>The derivative is the slope: nudge one weight by a tiny ε both ways and measure how L changes, ∂L/∂w ≈ [L(w + ε) − L(w − ε)] / 2ε. This is slow (two forward passes per weight) but independent of backprop, so it catches bugs. Every deep-learning framework is tested this way.</p><button class="primary" id="bpCheck">Run the gradient check</button><div id="bpCheckOut"></div>')
  + sec('m2-xor', '04 · Train it on XOR', 'Two hidden units, two lines',
    `<p>Now train the same 2-2-1 network on all four XOR examples (full-batch gradient descent, η = 2). Each hidden unit learns one line; the output combines them. Some random starts get stuck in a poor local minimum: try several.</p>
    <div class="lab-actions"><button class="primary" id="xGo">Train</button><button class="secondary" id="xNew">New random start</button></div>
    <div class="ml-figs ml-two">${fig('xMap', 'ml-sq', 'Network output over the input plane', key([C.plum, 'output near 1'], [C.ink, 'hidden-unit lines', 1]), 'colour is the network’s output. The two dashed lines are where each hidden unit’s drive is zero. Filled corners should be on, hollow ones off.')}${fig('xLoss', 'ml-sq', 'XOR training loss', key([C.plum, 'mean loss']), 'a long flat stretch followed by a sudden drop is typical: the network sits near a saddle, then finds the solution.')}</div><p class="lab-result" id="xRes"></p>`)
  + sec('m2-bio', '05 · Is backprop biological?', 'What a brain would need to do it',
    table(['Backprop needs…', 'Why it is a problem for neurons', 'Proposed solutions'], [
      ['The same weights forwards and backwards (weight transport)', 'Synapses are one-way; the backward pathway would need an exact copy of every forward weight', 'Feedback alignment: random feedback weights still work (Lillicrap et al., 2016)'],
      ['A separate error signal at every neuron', 'Neurons send one kind of spike; how would error be kept apart from activity?', 'Dendritic compartments: apical tufts carry feedback, somata carry activity (Guerguiev et al., 2017; Sacramento et al., 2018). CA1’s tuft vs basal inputs fit this layout'],
      ['Separate forward and backward phases', 'The brain runs continuously', 'Equilibrium propagation, predictive coding (Whittington & Bogacz, 2017, 2019)'],
      ['Exact derivatives φ′', 'Real neurons are noisy and spiking', 'Surrogate gradients for spiking networks; perturbation methods'],
    ]) + '<p>The <a href="/ml/learning-rules/">learning rules page</a> lets you compare backprop with two of these alternatives on the same task. Reviews: Lillicrap et al. (2020), “Backpropagation and the brain”; Richards et al. (2019).</p>')
  + codeBlock('Backprop by hand, then with autograd', 'numpy, torch')
  + related([['/ml/nodes-edges/', 'Nodes, edges & weights'], ['/ml/gradient-descent/', 'Gradient descent'], ['/lab/neural-network/', 'Train an MLP'], ['/ml/learning-rules/', 'Backprop vs biology'], ['/lab/stdp/', 'STDP']]);
mlpages[1].pit = ['Forgetting to store forward values. The backward pass needs every z and a from the forward pass.', 'Updating weights in the middle of the backward pass. Compute all gradients with the old weights, then update.', 'Using sigmoid units that saturate. When φ′ ≈ 0, almost no gradient gets through (the vanishing-gradient problem).', 'Skipping the gradient check after writing your own backward pass.'];
mlpages[1].quiz = [
  { q: 'The gradient of a weight from node j to node i is…', o: ['δ<sub>i</sub> × a<sub>j</sub>', 'a<sub>i</sub> × a<sub>j</sub>', 'δ<sub>j</sub> × w<sub>ij</sub>'], a: 0, why: 'Blame at the target times activity at the source. Note its similarity to a Hebbian product of pre- and postsynaptic terms.' },
  { q: 'Why is backprop efficient?', o: ['It skips the forward pass', 'Each δ is computed once and reused by every weight that depends on it', 'It uses random numbers'], a: 1, why: 'The backward sweep shares intermediate results, so the full gradient costs about as much as one extra forward pass.' },
  { q: 'Your analytic gradient and the finite-difference gradient differ by 30%. Most likely…', o: ['ε is too small', 'There is a bug in the backward pass', 'That is normal'], a: 1, why: 'Correct backprop agrees to about 6+ significant digits with central differences.' },
];
mlpages[1].tour = [
  { title: 'Forward: inputs to hidden units', apply: () => window.__bp && __bp.go(1), text: 'Each hidden unit computes its drive z = w·x + b and its activity a = σ(z). The highlighted edges are the ones being used.', look: 'the step panel: every number in the sum.' },
  { title: 'Forward: output and loss', apply: () => window.__bp && __bp.go(4), text: 'The output combines both hidden units. The loss measures how far y is from the target t.', look: 'L in the step panel.' },
  { title: 'Backward: blame at the output', apply: () => window.__bp && __bp.go(6), text: 'Start at the loss and move backward. ∂L/∂y = y − t, then multiply by the sigmoid’s slope y(1 − y) to get δ<sub>out</sub>, the blame on the output’s drive.', look: 'the pink δ tag under the output node.' },
  { title: 'Backward: blame at hidden units', apply: () => window.__bp && __bp.go(9), text: 'Each hidden unit receives δ<sub>out</sub> × (its outgoing weight), times its own slope. A unit with a big outgoing weight gets more blame.', look: 'δ tags under the hidden units.' },
  { title: 'Gradients and the update', apply: () => window.__bp && __bp.go(11), text: 'Every weight’s gradient is δ(target) × a(source). Press Next to apply w ← w − η ∂L/∂w, and watch the loss fall in the plot below.', look: 'the pink tags on edges, then the loss curve after you press Next.' },
];
mlpages[1].init = () => {
  let net = tinyNet(3), k = 0, hist = [];
  const prm = () => ({ x: [+el('bpX1').value, +el('bpX2').value], t: +el('bpT').value, lr: +el('bpLr').value });
  const draw = () => {
    const p = prm(), g = tinyPass(net, p.x, p.t), ph = BP_STEPS[k][1];
    let { ctx, w: W, h: H } = prep(el('bpG'));
    const fShow = s => k >= s, bShow = s => k >= s;
    const X = f => W * f, Y = f => H * f;
    const nodes = [
      { x: X(0.1), y: Y(0.3), r: 24, label: 'x₁', sub: nf(p.x[0], 2), fill: C.tan, ring: k === 0 },
      { x: X(0.1), y: Y(0.72), r: 24, label: 'x₂', sub: nf(p.x[1], 2), fill: C.tan, ring: k === 0 },
      { x: X(0.45), y: Y(0.3), r: 30, label: 'h₁', sub: fShow(1) ? `a=${nf(g.a[0], 3)}` : '', top: fShow(1) ? `z=${nf(g.z[0], 3)}` : '', fill: C.pink, ring: k === 1 || k === 8, grad: bShow(8) ? `δ₁=${nf(g.dh[0], 4)}` : '' },
      { x: X(0.45), y: Y(0.72), r: 30, label: 'h₂', sub: fShow(2) ? `a=${nf(g.a[1], 3)}` : '', top: fShow(2) ? `z=${nf(g.z[1], 3)}` : '', fill: C.pink, ring: k === 2 || k === 9, grad: bShow(9) ? `δ₂=${nf(g.dh[1], 4)}` : '' },
      { x: X(0.74), y: Y(0.5), r: 30, label: 'y', sub: fShow(3) ? nf(g.y, 3) : '', top: fShow(3) ? `z₃=${nf(g.z3, 3)}` : '', fill: C.hot, ring: k === 3 || k === 6, grad: bShow(6) ? `δout=${nf(g.d3, 4)}` : '' },
      { x: X(0.93), y: Y(0.5), r: 26, label: 'L', sub: fShow(4) ? nf(g.L, 4) : '', fill: C.paper, ring: k === 4 || k === 5, grad: bShow(5) ? `∂L/∂y=${nf(g.dy, 3)}` : '', top: `t = ${nf(p.t, 2)}` },
    ];
    const E = [];
    [0, 1].forEach(i => [0, 1].forEach(j => E.push({ a: j, b: 2 + i, w: net.w[i][j], label: `w${i + 1}${j + 1}=${nf(net.w[i][j], 2)}`, hl: k === 1 + i || k === 10, glabel: bShow(10) ? nf(g.dw[i][j], 4) : '', lt: i === j ? 0.5 : 0.25 })));
    [0, 1].forEach(i => E.push({ a: 2 + i, b: 4, w: net.v[i], label: `v${i + 1}=${nf(net.v[i], 2)}`, hl: k === 3 || k === 7 || k === 8 + i, glabel: bShow(7) ? nf(g.dv[i], 4) : '' }));
    E.push({ a: 4, b: 5, w: 1, hl: k === 4 || k === 5 });
    drawGraph(ctx, nodes, E, { maxW: 3 });
    ctx.font = '700 11px system-ui'; ctx.fillStyle = ph === 'b' ? C.plum : C.ink; ctx.textAlign = 'left'; ctx.fillText(ph === 'f' ? 'FORWARD PASS →' : ph === 'b' ? '← BACKWARD PASS' : 'UPDATE', 8, 14);
    // step panel
    const s = BP_STEPS[k], x = p.x;
    const txt = [
      `Put the inputs on the input nodes: x₁ = ${nf(x[0], 2)}, x₂ = ${nf(x[1], 2)}. The target output is t = ${nf(p.t, 2)}.`,
      `z₁ = w₁₁x₁ + w₁₂x₂ + b₁ = (${nf(net.w[0][0], 2)})(${nf(x[0], 2)}) + (${nf(net.w[0][1], 2)})(${nf(x[1], 2)}) + (${nf(net.b[0], 2)}) = <b>${nf(g.z[0])}</b><br>a₁ = σ(z₁) = <b>${nf(g.a[0])}</b>`,
      `z₂ = w₂₁x₁ + w₂₂x₂ + b₂ = (${nf(net.w[1][0], 2)})(${nf(x[0], 2)}) + (${nf(net.w[1][1], 2)})(${nf(x[1], 2)}) + (${nf(net.b[1], 2)}) = <b>${nf(g.z[1])}</b><br>a₂ = σ(z₂) = <b>${nf(g.a[1])}</b>`,
      `z₃ = v₁a₁ + v₂a₂ + c = (${nf(net.v[0], 2)})(${nf(g.a[0])}) + (${nf(net.v[1], 2)})(${nf(g.a[1])}) + (${nf(net.c, 2)}) = <b>${nf(g.z3)}</b><br>y = σ(z₃) = <b>${nf(g.y)}</b>`,
      `L = ½(y − t)² = ½(${nf(g.y)} − ${nf(p.t, 2)})² = <b>${nf(g.L, 5)}</b>. The forward pass is done, with every z and a stored.`,
      `How does L change if y changes? ∂L/∂y = y − t = <b>${nf(g.dy, 4)}</b>. ${g.dy > 0 ? 'Positive: y is too high, so anything that raises y should be turned down.' : 'Negative: y is too low, so anything that raises y should be turned up.'}`,
      `Chain rule through the sigmoid: σ′(z₃) = y(1 − y) = ${nf(g.y * (1 - g.y), 4)}.<br>δ<sub>out</sub> = ∂L/∂z₃ = (y − t) · y(1 − y) = <b>${nf(g.d3, 5)}</b>`,
      `z₃ = v₁a₁ + v₂a₂ + c, so ∂z₃/∂v<sub>i</sub> = a<sub>i</sub>.<br>∂L/∂v₁ = δ<sub>out</sub>·a₁ = <b>${nf(g.dv[0], 5)}</b>, ∂L/∂v₂ = δ<sub>out</sub>·a₂ = <b>${nf(g.dv[1], 5)}</b>, ∂L/∂c = δ<sub>out</sub> = <b>${nf(g.dc, 5)}</b><br><span class="muted">Blame at the target × activity at the source: a Hebbian-looking product.</span>`,
      `Blame reaches h₁ through v₁: ∂L/∂a₁ = δ<sub>out</sub>·v₁ = ${nf(g.da[0], 5)}.<br>Through h₁’s sigmoid: δ₁ = ∂L/∂a₁ · a₁(1 − a₁) = <b>${nf(g.dh[0], 5)}</b>`,
      `Same for h₂, reusing δ<sub>out</sub>: ∂L/∂a₂ = δ<sub>out</sub>·v₂ = ${nf(g.da[1], 5)}.<br>δ₂ = ∂L/∂a₂ · a₂(1 − a₂) = <b>${nf(g.dh[1], 5)}</b>`,
      `∂L/∂w<sub>ij</sub> = δ<sub>i</sub>·x<sub>j</sub>: ∂L/∂w₁₁ = <b>${nf(g.dw[0][0], 5)}</b>, ∂L/∂w₁₂ = <b>${nf(g.dw[0][1], 5)}</b>, ∂L/∂w₂₁ = <b>${nf(g.dw[1][0], 5)}</b>, ∂L/∂w₂₂ = <b>${nf(g.dw[1][1], 5)}</b>; ∂L/∂b<sub>i</sub> = δ<sub>i</sub>. The full gradient took one backward sweep.`,
      `Gradient descent: every parameter moves against its gradient, w ← w − η·∂L/∂w with η = ${nf(p.lr, 1)}. For example v₁: ${nf(net.v[0], 3)} − ${nf(p.lr, 1)}×(${nf(g.dv[0], 4)}) = ${nf(net.v[0] - p.lr * g.dv[0], 3)}. <b>Press Next to apply the update</b> and start a new forward pass.`,
    ][k];
    el('bpStep').innerHTML = `<p class="eyebrow">Step ${k + 1} of ${BP_STEPS.length} · ${s[1] === 'f' ? 'forward' : s[1] === 'b' ? 'backward' : 'update'}</p><h3>${s[0]}</h3><p>${txt}</p>`;
    el('bpBack').disabled = k === 0;
    el('bpNext').textContent = k === BP_STEPS.length - 1 ? 'Apply update →' : 'Next step →';
    const ax = axes(el('bpL'), { xlim: [0, Math.max(10, hist.length)], ylim: [0, Math.max(0.05, ...hist, g.L) * 1.1], xlabel: 'update', ylabel: 'L' });
    line(ax, hist.map((_, i) => i), hist, C.plum, 2.2); ax.ctx.fillStyle = C.plum; hist.forEach((v, i) => { ax.ctx.beginPath(); ax.ctx.arc(ax.X(i), ax.Y(v), 3, 0, 7); ax.ctx.fill(); }); ax.done();
    el('ml-result').innerHTML = `y = <b>${nf(g.y)}</b> · target <b>${nf(p.t, 2)}</b> · loss <b>${nf(g.L, 5)}</b> · updates so far <b>${hist.length ? hist.length - 1 : 0}</b>`;
    explain(ph === 'f' ? '<p><b>Forward pass.</b> Information flows left to right. Each node stores its z and a, because the backward pass will need them.</p>'
      : ph === 'b' ? `<p><b>Backward pass.</b> Blame flows right to left. Each δ answers: if this node’s drive went up a little, how much would the loss change? ${Math.abs(g.d3) < 1e-3 ? 'Here δ<sub>out</sub> is tiny, either because the output is already right or because the sigmoid is saturated (y near 0 or 1).' : ''}</p>`
      : `<p><b>Update.</b> A larger η takes bigger steps. Too large and the loss can bounce up instead of down; try η = 5 with a few updates.</p>`);
  };
  const go = s => { k = Math.max(0, Math.min(BP_STEPS.length - 1, s)); draw(); };
  window.__bp = { go };
  el('bpNext').addEventListener('click', () => {
    if (k === BP_STEPS.length - 1) { const p = prm(), g = tinyPass(net, p.x, p.t); if (!hist.length) hist.push(g.L); tinyStep(net, g, p.lr); hist.push(tinyPass(net, p.x, p.t).L); k = 0; draw(); }
    else go(k + 1);
  });
  el('bpBack').addEventListener('click', () => go(k - 1));
  el('bpAll').addEventListener('click', () => go(BP_STEPS.length - 1));
  el('bpReset').addEventListener('click', () => { net = tinyNet(Math.floor(Math.random() * 1e6)); hist = []; go(0); });
  ['bpX1', 'bpX2', 'bpT'].forEach(id => bind(id, v => nf(v, 2), () => { hist = []; draw(); })); bind('bpLr', v => nf(v, 1));
  el('bpCheck').addEventListener('click', () => {
    const p = prm(), an = tinyGrads(tinyPass(net, p.x, p.t)), nu = tinyNumGrad(net, p.x, p.t), names = ['w₁₁', 'w₁₂', 'w₂₁', 'w₂₂', 'b₁', 'b₂', 'v₁', 'v₂', 'c'];
    const rel = an.map((a, i) => Math.abs(a - nu[i]) / (Math.abs(a) + Math.abs(nu[i]) + 1e-12));
    el('bpCheckOut').innerHTML = table(['Parameter', 'Backprop ∂L/∂θ', 'Finite difference', 'Relative error'], names.map((n, i) => [n, nf(an[i], 7), nf(nu[i], 7), rel[i].toExponential(1)]))
      + `<p class="lab-result">Largest relative error: <b>${Math.max(...rel).toExponential(1)}</b>. ${Math.max(...rel) < 1e-6 ? 'Backprop agrees with the slope measured directly. ✓' : 'Check the backward pass.'}</p>`;
  });
  // XOR training
  let xnet = tinyNet(3), xh = [], xrun = false;
  const xdraw = () => {
    const ax = axes(el('xMap'), { xlim: [-0.5, 1.5], ylim: [-0.5, 1.5], xlabel: 'x₁', ylabel: 'x₂' }), n = 50, d = 2 / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const y = tinyPass(xnet, [-0.5 + (i + .5) * d, -0.5 + (j + .5) * d], 0).y; ax.ctx.fillStyle = `rgba(166,41,98,${0.06 + 0.8 * y})`; ax.ctx.fillRect(ax.X(-0.5 + i * d), ax.Y(-0.5 + (j + 1) * d), ax.X(d) - ax.X(0) + .6, ax.Y(0) - ax.Y(d) + .6); }
    [0, 1].forEach(i => { const [w1, w2] = xnet.w[i], b = xnet.b[i]; if (Math.abs(w2) > 1e-6) line(ax, [-0.5, 1.5], [-0.5, 1.5].map(x => -(w1 * x + b) / w2), C.ink, 1.8, [6, 4]); });
    XOR.forEach(([x, t]) => { const y = tinyPass(xnet, x, t).y; ax.ctx.beginPath(); ax.ctx.arc(ax.X(x[0]), ax.Y(x[1]), 9, 0, 7); ax.ctx.fillStyle = t ? C.ink : C.paper; ax.ctx.fill(); ax.ctx.lineWidth = 2.5; ax.ctx.strokeStyle = (y > 0.5) === !!t ? C.ink : C.hot; ax.ctx.stroke(); });
    ax.done();
    const a2 = axes(el('xLoss'), { xlim: [0, Math.max(100, xh.length)], ylim: [1e-4, 0.3], logy: true, xlabel: 'epoch', ylabel: 'loss' }); line(a2, xh.map((_, i) => i), xh.map(v => Math.max(v, 1e-4)), C.plum, 2); a2.done();
    const L = xh.length ? xh[xh.length - 1] : NaN, ok = XOR.every(([x, t]) => (tinyPass(xnet, x, t).y > 0.5) === !!t);
    el('xRes').innerHTML = `Epoch <b>${xh.length}</b> · loss <b>${isNaN(L) ? '—' : nf(L, 4)}</b> · ${ok ? '<b>all four corners correct</b>' : 'not solved yet'}${xh.length > 3000 && !ok ? ' · <b>stuck in a local minimum</b>: press New random start' : ''}`;
  };
  const xloop = () => { if (!xrun || !document.body.contains(el('xMap'))) return; for (let e = 0; e < 25; e++) xh.push(tinyXorEpoch(xnet, 2)); xdraw(); if (xh.length >= 6000) { xrun = false; el('xGo').textContent = 'Train'; return; } requestAnimationFrame(xloop); };
  el('xGo').addEventListener('click', () => { xrun = !xrun; el('xGo').textContent = xrun ? 'Pause' : 'Train'; if (xrun) requestAnimationFrame(xloop); });
  el('xNew').addEventListener('click', () => { xnet = tinyNet(Math.floor(Math.random() * 1e6)); xh = []; xdraw(); });
  draw(); xdraw(); redraw.fn = () => { draw(); xdraw(); };
  attachCode(`import numpy as np
sig = lambda z: 1 / (1 + np.exp(-z))

# 2-2-1 network, one example, squared-error loss
rng = np.random.default_rng(3)
W, b = rng.uniform(-1.2, 1.2, (2, 2)), rng.uniform(-0.6, 0.6, 2)
v, c = rng.uniform(-1.2, 1.2, 2), 0.0
x, t, lr = np.array([0.6, -0.4]), 1.0, 1.0

for step in range(20):
    # forward pass: store everything
    z = W @ x + b;  a = sig(z)
    z3 = v @ a + c; y = sig(z3)
    L = 0.5 * (y - t) ** 2
    # backward pass: chain rule, output to input
    d_out = (y - t) * y * (1 - y)          # dL/dz3
    dv, dc = d_out * a, d_out              # blame at target x activity at source
    d_hid = d_out * v * a * (1 - a)        # dL/dz for each hidden unit
    dW, db = np.outer(d_hid, x), d_hid
    # update
    W -= lr * dW; b -= lr * db; v -= lr * dv; c -= lr * dc
    print(f"step {step:2d}  loss {L:.5f}")

# The same gradient with autograd (needs PyTorch: runs in Colab or VS Code, skipped in the browser)
try:
    import torch
    Wt = torch.tensor(W, requires_grad=True); vt = torch.tensor(v, requires_grad=True)
    yt = torch.sigmoid(vt @ torch.sigmoid(Wt @ torch.tensor(x) + torch.tensor(b)) + c)
    (0.5 * (yt - t) ** 2).backward()
    print("autograd dL/dv:", vt.grad.numpy())
except ImportError:
    print("PyTorch not installed here; run in Colab to compare with autograd.")`);
};

