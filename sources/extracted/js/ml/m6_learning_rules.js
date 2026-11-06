/* Extracted from Little Neural Guide modellab.js [394744:416102] — section: M6. BACKPROP VS BIOLOGICAL */
/* ======================================================================
   M6. BACKPROP VS BIOLOGICAL LEARNING
   ====================================================================== */
mlpages[5].lead = 'Backprop is the most efficient way we know to train networks, but brains probably cannot run it exactly. Here the same network learns the same task four ways, from exact gradients to rules that use only locally available signals.';
mlpages[5].jumps = [['m6-rules', 'Four rules'], ['experiment', 'Race them'], ['m6-align', 'Why feedback alignment works'], ['m6-bio', 'Biological candidates'], ['code', 'Python']];
mlpages[5].html = () => sec('m6-rules', '01 · Four learning rules', 'What each hidden neuron is told',
  eqBox('\\[\\Delta W_1\\propto-\\,\\delta_h\\,\\mathbf x^\\top,\\qquad\\delta_h=\\begin{cases}(W_2^\\top\\delta_{out})\\odot\\varphi\'(\\mathbf z)&\\text{backprop}\\\\(B\\,\\delta_{out})\\odot\\varphi\'(\\mathbf z)&\\text{feedback alignment}\\\\ \\frac{(L(\\mathbf z+\\xi)-L(\\mathbf z))}{\\sigma^2}\\,\\xi&\\text{node perturbation}\\\\ 0&\\text{readout only}\\end{cases}\\]', 'All four train the output weights the same way (a local delta rule). They differ in the error signal δ<sub>h</sub> sent to hidden units. B is a fixed random matrix; ξ is random noise added to hidden activity.')
  + table(['Rule', 'Hidden neurons need', 'Weight transport?', 'Biological reading'], [
    ['Backprop', 'Exact downstream weights and errors', 'Yes', 'Unlikely as is; approximations proposed via dendrites'],
    ['Feedback alignment', 'A fixed random feedback pathway', 'No', 'Any random top-down projection could carry error (Lillicrap et al., 2016)'],
    ['Node perturbation', 'Their own noise and a global scalar reward/error', 'No', 'Like neuromodulator-gated (e.g. dopamine) three-factor plasticity'],
    ['Readout only', 'Nothing: hidden weights stay random', 'No', 'Reservoir computing; only output synapses learn'],
  ]))
  + mlBlock('Race four learning rules on one task', `<div class="control-row"><label>Task</label>${btns('data-lrds', [['circles', 'Circles'], ['moons', 'Moons'], ['xor', 'XOR']])}</div>
      ${ctl('lrH', 'Hidden units', 4, 32, 1, 16)}${ctl('lrEta', 'Learning rate η', 0.05, 2, 0.05, 0.5)}
      <div class="control-row"><label for="lrShow">Decision map shows</label><select id="lrShow" class="ml-select"><option value="bp">Backprop</option><option value="fa">Feedback alignment</option><option value="np">Node perturbation</option><option value="readout">Readout only</option></select></div>
      <div class="lab-actions"><button class="primary" id="lrGo">Train</button><button class="secondary" id="lrReset">Reset</button></div>`,
    fig('lrCurve', 'ml-h220 wide', 'Training loss for each rule', key([C.ink, 'backprop'], [C.plum, 'feedback alignment'], [C.hot, 'node perturbation'], [C.muted, 'readout only']), 'same network, same initial weights, same data. Lower is better; steeper is faster.')
    + fig('lrMap', 'ml-sq', 'Decision map', key([C.plum, 'class 1'], [C.tan, 'class 0']), 'background is the chosen network’s output; dots are training points.')
    + fig('lrAlign', 'ml-sq', 'Angle to the true gradient', key([C.plum, 'feedback alignment'], [C.hot, 'node perturbation']), '0° means the rule’s hidden-layer update points exactly along backprop’s; 90° means unrelated. Below 90° the update still goes downhill.'))
  + sec('m6-align', '02 · Why feedback alignment works', 'The forward weights learn to agree with the feedback',
    '<p>With random feedback B, the first hidden updates are almost unrelated to the true gradient (angle near 90°). But they are consistently related to B. The output weights W<sub>2</sub> then change in a way that makes W<sub>2</sub><sup>⊤</sup> drift toward B, so the feedback becomes useful: the angle falls well below 90° and learning proceeds. The network <b>learns to learn</b> from its feedback (Lillicrap et al., 2016).</p><p>Node perturbation is unbiased: on average its update equals the gradient. But each single estimate is very noisy, so the per-epoch angle stays near 90° and learning is slow, and it gets slower as networks grow. That is the cost of using only a global scalar signal.</p>')
  + sec('m6-bio', '03 · Biological candidates, and CA1', 'How real synapses might get an error signal',
    steps([
      ['Three-factor rules.', 'Plasticity depends on pre- and postsynaptic activity plus a third, modulatory signal (dopamine, acetylcholine, noradrenaline) that says “that was good” or “bad”. Node perturbation is a three-factor rule.'],
      ['Dendritic error signals.', 'In pyramidal cells, apical tufts receive top-down input separate from basal inputs. Models use tuft activity as a local error or target (Guerguiev et al., 2017; Sacramento et al., 2018).'],
      ['Behavioral timescale plasticity in CA1.', 'A single dendritic plateau potential in a CA1 pyramidal cell can create a new place field in one trial, potentiating inputs active seconds before or after (Bittner et al., 2017). Entorhinal input to the tuft acts like an instructive signal: a striking candidate for target-driven learning.'],
      ['STDP.', 'Purely local timing-based learning (see the STDP lab). It finds correlations without any error signal at all, like an unsupervised rule.'],
    ]))
  + codeBlock('Backprop vs feedback alignment in NumPy', 'numpy')
  + related([['/ml/backprop/', 'Backprop step by step'], ['/lab/stdp/', 'STDP lab'], ['/lab/neural-network/', 'Train an MLP'], ['/experiments/ca1-circuit/', 'The CA1 circuit']]);
mlpages[5].pit = ['Concluding a rule is biologically plausible because it works on a toy task. Check how it scales with network size and depth.', 'Comparing rules at a single learning rate. Each has its own best η.', 'Assuming “local” means plausible. The signals still have to exist and be routed in real tissue.'];
mlpages[5].quiz = [
  { q: 'Feedback alignment replaces Wᵀ in the backward pass with…', o: ['A fixed random matrix B', 'The identity', 'Nothing'], a: 0, why: 'Error is sent back through fixed random weights; the forward weights come to align with them.' },
  { q: 'Node perturbation needs, at each hidden neuron, …', o: ['Exact downstream weights', 'Its own random perturbation and a single global change in loss', 'The full gradient'], a: 1, why: 'It correlates its own noise with a broadcast scalar, like a neuromodulator.' },
  { q: 'Behavioral timescale plasticity in CA1 is notable because…', o: ['It needs hundreds of laps', 'A single dendritic plateau can create a new place field in one trial', 'It only works in culture'], a: 1, why: 'Bittner et al. (2017) showed one-shot place-field formation driven by plateau potentials.' },
];
mlpages[5].tour = [
  { title: 'Start the race', apply: () => window.__lr && __lr.reset('circles', true), text: 'All four networks start from the same weights. Backprop (black) usually falls fastest; readout-only (grey) plateaus because its hidden layer never improves.', look: 'the four loss curves separating.' },
  { title: 'Feedback alignment catches up', apply: () => { el('lrShow').value = 'fa'; el('lrShow').dispatchEvent(new Event('change')); }, text: 'Feedback alignment starts slowly, then follows backprop. Its angle to the true gradient starts near 90° and falls as the forward weights align with the random feedback.', look: 'the plum curve in the angle plot dropping.' },
  { title: 'Noisy but unbiased', apply: () => { el('lrShow').value = 'np'; el('lrShow').dispatchEvent(new Event('change')); }, text: 'Node perturbation estimates the gradient from random wiggles and a single global error. Each estimate is noisy (angle near 90°), but on average it goes downhill.', look: 'the pink loss curve, and its noisy angle.' },
  { title: 'A harder task', apply: () => window.__lr && __lr.reset('moons', true), text: 'On the moons task the hidden layer must bend the boundary more. Readout-only, with random fixed features, falls further behind.', look: 'the gap between grey and the others.' },
];
mlpages[5].init = () => {
  let ds = 'circles', data = makeData(ds, 200, 0.08, 11), L = {}, epoch = 0, running = false;
  const rules = ['bp', 'fa', 'np', 'readout'], col = { bp: C.ink, fa: C.plum, np: C.hot, readout: C.muted }, nm = { bp: 'Backprop', fa: 'Feedback alignment', np: 'Node perturbation', readout: 'Readout only' };
  const reset = () => { const H = +el('lrH').value; rules.forEach(r => L[r] = makeLearner(H, 4, r)); epoch = 0; draw(); };
  const draw = () => {
    const maxE = Math.max(100, epoch);
    let a = axes(el('lrCurve'), { xlim: [0, maxE], ylim: [0.01, 1], logy: true, xlabel: 'epoch', ylabel: 'loss' });
    rules.forEach(r => line(a, L[r].hist.map((_, i) => i), L[r].hist, col[r], r === 'bp' ? 2.4 : 2)); a.done();
    const m = L[el('lrShow').value], n = 50;
    a = axes(el('lrMap'), { xlim: [-1.2, 1.2], ylim: [-1.2, 1.2], xlabel: 'x₁', ylabel: 'x₂' }); const d = 2.4 / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const p = learnerPredict(m, [-1.2 + (i + .5) * d, -1.2 + (j + .5) * d]); a.ctx.fillStyle = p > 0.5 ? `rgba(166,41,98,${0.12 + 0.5 * (p - 0.5)})` : `rgba(231,213,190,${0.3 + 0.9 * (0.5 - p)})`; a.ctx.fillRect(a.X(-1.2 + i * d), a.Y(-1.2 + (j + 1) * d), a.X(d) - a.X(0) + .6, a.Y(0) - a.Y(d) + .6); }
    data.X.forEach((x, k) => { a.ctx.beginPath(); a.ctx.arc(a.X(x[0]), a.Y(x[1]), 2.6, 0, 7); a.ctx.fillStyle = data.y[k] ? C.plum : C.brown; a.ctx.fill(); }); a.done();
    a = axes(el('lrAlign'), { xlim: [0, maxE], ylim: [0, 120], xlabel: 'epoch', ylabel: 'angle (°)', yticks: [0, 30, 60, 90, 120] });
    a.ctx.strokeStyle = C.muted; a.ctx.setLineDash([5, 4]); a.ctx.beginPath(); a.ctx.moveTo(a.X(0), a.Y(90)); a.ctx.lineTo(a.X(maxE), a.Y(90)); a.ctx.stroke(); a.ctx.setLineDash([]);
    const smooth = (arr, w = 15) => arr.map((_, i) => { const s = arr.slice(Math.max(0, i - w), i + 1); return s.reduce((x, y) => x + y, 0) / s.length; });
    line(a, L.fa.align.map((_, i) => i), smooth(L.fa.align), C.plum, 2.2); line(a, L.np.align.map((_, i) => i), smooth(L.np.align), C.hot, 1.8); a.done();
    el('ml-result').innerHTML = `Epoch <b>${epoch}</b> · ` + rules.map(r => `${nm[r]} <b>${L[r].hist.length ? (L[r].acc * 100).toFixed(0) + '%' : '—'}</b>`).join(' · ');
    if (!epoch) { explain('<p>Press <b>Train</b>. All four networks start from identical weights and see identical data each epoch.</p>'); return; }
    const best = rules.reduce((b, r) => L[r].hist[L[r].hist.length - 1] < L[b].hist[L[b].hist.length - 1] ? r : b, 'bp'), fa = L.fa.align.length ? smooth(L.fa.align).at(-1) : NaN;
    explain(`<p>Lowest loss right now: <b>${nm[best]}</b>. ${epoch < 80 ? 'Early on, differences mostly reflect how quickly each rule gets a useful signal to the hidden layer.' : ''}</p>
      <p>Feedback alignment’s update is now <b>${nf(fa, 0)}°</b> from the true gradient${L.fa.align.length > 20 ? ` (it started near ${nf(L.fa.align[0], 0)}°)` : ''}. ${fa < 60 ? 'Well below 90°: the forward weights have aligned with the random feedback, so its updates are genuinely useful.' : 'Still near 90°: alignment takes some epochs to develop.'}</p>
      <p>Readout-only reaches ${(L.readout.acc * 100).toFixed(0)}% using random, fixed hidden features. The gap between it and the others is what learning in the hidden layer buys you.</p>`);
  };
  const loop = () => { if (!running || !document.body.contains(el('lrCurve'))) return; const eta = +el('lrEta').value; for (let s = 0; s < 4; s++) { rules.forEach(r => learnerEpoch(L[r], data, eta)); epoch++; } draw(); if (epoch >= 1500) { running = false; el('lrGo').textContent = 'Train'; return; } requestAnimationFrame(loop); };
  const toggle = on => { running = on; el('lrGo').textContent = on ? 'Pause' : 'Train'; if (on) requestAnimationFrame(loop); };
  window.__lr = { reset: (d, go) => { ds = d; data = makeData(ds, 200, 0.08, 11); document.querySelectorAll('[data-lrds]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lrds === d)); toggle(false); reset(); if (go) toggle(true); } };
  document.querySelectorAll('[data-lrds]').forEach(b => b.addEventListener('click', () => __lr.reset(b.dataset.lrds, false)));
  bind('lrH', v => v, () => { toggle(false); reset(); }); bind('lrEta', v => nf(v, 2));
  el('lrShow').addEventListener('change', draw);
  el('lrGo').addEventListener('click', () => toggle(!running));
  el('lrReset').addEventListener('click', () => { toggle(false); reset(); });
  document.querySelector('[data-lrds="circles"]').setAttribute('aria-pressed', 'true');
  reset(); redraw.fn = draw;
  attachCode(`import numpy as np
rng = np.random.default_rng(0)

# data: two concentric rings
n = 200; c = np.arange(n) % 2
r = np.where(c, 0.35 * np.sqrt(rng.random(n)), 0.6 + 0.3 * rng.random(n)); th = 2 * np.pi * rng.random(n)
X = np.c_[r * np.cos(th), r * np.sin(th)] + 0.08 * rng.standard_normal((n, 2)); y = c.astype(float)

def train(rule, H=16, lr=0.5, epochs=600, seed=4):
    g = np.random.default_rng(seed)
    W1, b1 = 1.2 * g.standard_normal((H, 2)), 0.5 * g.standard_normal(H)
    W2, b2 = g.standard_normal(H) / np.sqrt(H), 0.0
    B = np.random.default_rng(seed + 99).standard_normal(H) / np.sqrt(H)   # fixed random feedback
    for _ in range(epochs):
        A = np.tanh(X @ W1.T + b1)                       # (n, H)
        p = 1 / (1 + np.exp(-(A @ W2 + b2)))
        d = p - y                                        # dL/ds for sigmoid + cross-entropy
        back = W2 if rule == "bp" else B                 # <- the only difference
        D = np.outer(d, back) * (1 - A**2)               # hidden error signal
        W2 -= lr * A.T @ d / n; b2 -= lr * d.mean()
        W1 -= lr * D.T @ X / n; b1 -= lr * D.mean(0)
    return ((p > 0.5) == y).mean()

print("backprop accuracy:          ", train("bp"))
print("feedback alignment accuracy:", train("fa"))`);
};

/* ---------- overview + router ---------- */
const ML_GLOSS = [
  ['Activation', 'A node’s output value, φ(z). Analogue: firing rate.'], ['Activation function φ', 'Non-linear map from drive to output: sigmoid, tanh, ReLU. Analogue: f–I curve.'],
  ['Backpropagation', 'Computing every weight’s gradient with one backward sweep of the chain rule.'], ['BPTT', 'Backpropagation through time: backprop on an RNN unrolled over time steps.'],
  ['Bias', 'Constant added to a node’s input sum; shifts its threshold.'], ['Chain rule', 'd(f∘g)/dx = f′(g(x))·g′(x). The only calculus backprop needs.'],
  ['Computational graph', 'The network drawn as nodes (operations/values) and edges (dependencies).'], ['Connectivity matrix', 'W with W<sub>ij</sub> = weight from j to i. Encodes the whole graph.'],
  ['Dale’s principle', 'A neuron releases the same transmitter at all its synapses, so its outgoing weights share a sign.'], ['δ (delta)', 'Blame on a node’s drive: ∂L/∂z.'],
  ['Edge', 'Directed connection between two nodes, with a weight.'], ['Eigenvalue', 'A growth (or rotation) factor of a matrix along a special direction; decides stability.'],
  ['Epoch', 'One pass through the whole training set.'], ['Feedback alignment', 'Backprop with a fixed random feedback matrix in place of Wᵀ.'],
  ['Fixed point', 'A state where the dynamics stop changing: dx/dt = 0.'], ['Gradient', 'Vector of partial derivatives of the loss with respect to every parameter.'],
  ['Gradient descent', 'Repeatedly step parameters against the gradient: θ ← θ − η∇L.'], ['Hessian', 'Matrix of second derivatives: the curvature of the loss.'],
  ['Jacobian', 'Matrix of first derivatives of the dynamics; its eigenvalues decide local stability.'], ['Layer', 'A group of nodes updated together, computed as φ(Wx + b).'],
  ['Learning rate η', 'Step size of gradient descent; must stay below 2/λ<sub>max</sub>.'], ['Loss', 'A number measuring how wrong the network is; training minimizes it.'],
  ['Mean field', 'Replacing many interacting units by the average activity of populations.'], ['Momentum', 'Gradient descent with velocity, so consistent directions accelerate.'],
  ['Node (unit)', 'Holds an activation. A neuron, or a whole population in mean-field models.'], ['Node perturbation', 'Learn by correlating random changes in activity with changes in a global error.'],
  ['Overfitting', 'Fitting noise in the training data, so performance on new data drops.'], ['Recurrent network (RNN)', 'A network whose connections form loops, so activity evolves in time.'],
  ['Saddle point', 'Zero gradient, but curving up in some directions and down in others.'], ['SGD', 'Stochastic gradient descent: noisy gradients from random mini-batches.'],
  ['Three-factor rule', 'Plasticity from pre × post × a modulatory signal (e.g. dopamine).'], ['Vanishing gradient', 'Gradients shrinking as they pass back through many layers or time steps.'],
  ['Weight', 'Strength of an edge. Analogue: synaptic strength.'], ['Weight transport problem', 'Backprop needs forward weights reused backwards; synapses cannot do that directly.'],
];
function mlOverviewHTML() {
  return `<a class="breadcrumb" href="/">Home</a><div class="hero"><span class="pill">ML FOR NEUROSCIENCE · ${mlpages.length} INTERACTIVE PAGES</span><h1>Nodes, edges,<br>and the bridge to mean field.</h1><p class="lead">Machine learning and theoretical neuroscience share one object: a network of nodes joined by weighted edges, evolving under simple rules. Learn the ML vocabulary from the ground up, then follow it all the way to Wilson–Cowan.</p></div>
  <div class="box pink"><h2>The path through this section</h2><div class="ml-path">${mlpages.map((m, i) => `<a href="/ml/${m.slug}/"><span>${i + 1}</span>${m.title}</a>`).join('<i>→</i>')}</div>
  <p>Pages 1–3 build the machine-learning toolkit. Page 4 adds recurrence and time. Page 5 shows that a mean-field model <i>is</i> a small recurrent network. Page 6 asks whether brains could learn like this.</p></div>
  <div class="overview-cards">${mlpages.map((m, i) => `<a class="topic-card" href="/ml/${m.slug}/"><span class="eyebrow">0${i + 1} · ${m.level.toUpperCase()}</span><h2>${m.title}</h2><p>${m.blurb}</p><span class="card-link">Open →</span></a>`).join('')}</div>
  <section class="lesson-section"><p class="eyebrow">Big picture</p><h2>One equation, three readings</h2>${eqBox('\\[\\tau\\frac{d\\mathbf r}{dt}=-\\mathbf r+\\varphi\\big(W\\mathbf r+\\mathbf I\\big)\\]', 'Read as machine learning: a continuous-time RNN with weight matrix W. Read as neuroscience: a rate network of neurons with synaptic matrix W and f–I curve φ. Read as mean field: with two nodes (E, I), this is Wilson–Cowan.')}</section>
  <section class="lesson-section"><p class="eyebrow">Reference</p><h2>Glossary</h2><div class="ml-gloss">${ML_GLOSS.map(([t, d]) => `<div class="term"><b>${t}</b>${d}</div>`).join('')}</div></section>
  <section class="lesson-section"><p class="eyebrow">Further reading</p><h2>Key papers</h2><ul class="skill-tips">
    <li>Rumelhart, Hinton & Williams (1986). Learning representations by back-propagating errors. <i>Nature</i>.</li>
    <li>Wilson & Cowan (1972). Excitatory and inhibitory interactions in localized populations of model neurons. <i>Biophys J</i>.</li>
    <li>Sompolinsky, Crisanti & Sommers (1988). Chaos in random neural networks. <i>Phys Rev Lett</i>.</li>
    <li>Sussillo & Abbott (2009). Generating coherent patterns of activity from chaotic neural networks. <i>Neuron</i>.</li>
    <li>Sussillo & Barak (2013). Opening the black box: low-dimensional dynamics in high-dimensional RNNs. <i>Neural Comput</i>.</li>
    <li>Lillicrap, Cownden, Tweed & Akerman (2016). Random synaptic feedback weights support error backpropagation for deep learning. <i>Nat Commun</i>.</li>
    <li>Mastrogiuseppe & Ostojic (2018). Linking connectivity, dynamics, and computations in low-rank recurrent neural networks. <i>Neuron</i>.</li>
    <li>Richards et al. (2019). A deep learning framework for neuroscience. <i>Nat Neurosci</i>.</li>
    <li>Lillicrap, Santoro, Marris, Akerman & Hinton (2020). Backpropagation and the brain. <i>Nat Rev Neurosci</i>.</li>
    <li>Bittner, Milstein, Grienberger, Romani & Magee (2017). Behavioral time scale synaptic plasticity underlies CA1 place fields. <i>Science</i>.</li></ul></section>
  <footer><a class="secondary" href="/lab/neural-network/">← Train an MLP (model lab)</a><a class="primary" href="/ml/nodes-edges/">Start with nodes & edges →</a></footer>${smallPrint()}`;
}
window.renderML = function (slug) {
  const i = mlpages.findIndex(m => m.slug === slug);
  if (i < 0) { document.title = 'ML for neuroscience · Little Neural Guide'; el('lesson').innerHTML = mlOverviewHTML(); typeset(); return; }
  const m = mlpages[i]; document.title = m.title + ' · ML for neuroscience';
  el('lesson').innerHTML = mlShell(i, m, m.html());
  requestAnimationFrame(() => { m.init(); if (m.tour) mountTour(m.tour); typeset(); });
};

/* ---------- shared with the study hub: every quiz question and the ML glossary ---------- */
window.ML_GLOSS = ML_GLOSS;
window.ngQuizBank = () => [
  ...pages.map(p => ['/lab/' + p.slug + '/', p.title, p.xquiz]), ...xpages.map(p => ['/experiments/' + p.slug + '/', p.title, p.xquiz]),
  ...fpages.map(p => ['/fitting/' + p.slug + '/', p.title, p.quiz]), ...mlpages.map(p => ['/ml/' + p.slug + '/', p.title, p.quiz]),
].flatMap(([href, title, qs]) => (qs || []).map((q, i) => ({ id: href + '#' + i, href, page: title, q: q.q, a: q.o[q.a], why: q.why, o: q.o })));
