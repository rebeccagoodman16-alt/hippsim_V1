/* Extracted from Little Neural Guide modellab.js [308025:328915] — section: M1. NODES */
/* ======================================================================
   M1. NODES, EDGES & WEIGHTS
   ====================================================================== */
mlpages[0].lead = 'Every artificial network is a graph. Nodes hold numbers (activations), edges carry them, and each edge has a weight that scales what passes through. A node adds up its weighted inputs, adds a bias and passes the total through an activation function. That is the whole building block.';
mlpages[0].jumps = [['m1-vocab', 'Vocabulary'], ['m1-neuron', 'Neuron → node'], ['experiment', 'One node'], ['m1-graph', 'Graph builder'], ['m1-layers', 'Layers as matrices'], ['code', 'Python']];
mlpages[0].html = () => sec('m1-vocab', '01 · Vocabulary', 'The words, and what they mean in a brain',
  table(['Term', 'In machine learning', 'In a neural circuit', 'In a mean-field model'], [
    ['<b>Node</b> (unit)', 'Holds one number, its activation a', 'A neuron’s firing rate, or a small group of similar neurons', 'A whole population’s mean rate (E or I)'],
    ['<b>Edge</b> (connection)', 'Directed link from node j to node i', 'Axon → synapse → dendrite', 'Coupling between populations'],
    ['<b>Weight</b> w<sub>ij</sub>', 'Multiplies the signal on edge j → i; learned', 'Synaptic strength: receptor count, release probability, location', 'w<sub>EE</sub>, w<sub>EI</sub>, …: average strength × number of contacts'],
    ['<b>Sign</b> of w', 'Positive or negative, any edge', 'Excitatory (glutamate) or inhibitory (GABA); a neuron is usually one or the other (Dale’s principle)', 'E columns positive, I columns negative'],
    ['<b>Bias</b> b', 'Constant added to the input sum', 'Threshold or resting drive (rheobase, tonic input)', 'External drive P, Q or threshold θ'],
    ['<b>Activation</b> φ', 'Non-linear function of the summed input', 'The f–I curve: input current → firing rate', 'The population gain function S(x)'],
    ['<b>Layer</b>', 'A set of nodes updated together', 'A stage of processing: EC → DG → CA3 → CA1', '—'],
    ['<b>Forward pass</b>', 'Compute outputs from inputs, layer by layer', 'Activity propagating through a pathway', 'Integrating the rate equations'],
  ]))
  + sec('m1-neuron', '02 · From a neuron to a node', 'What gets kept, and what gets thrown away',
    eqBox('\\[a=\\varphi\\Big(\\sum_{j} w_{j}\\,x_{j}+b\\Big)=\\varphi(z)\\]', 'Read it as: multiply each input by its weight, add them up with the bias to get the drive z, then pass z through the activation φ to get the output a.')
    + steps([
      ['Spikes become rates.', 'A node outputs one continuous number, like a firing rate averaged over tens of milliseconds. Spike timing is gone (the STDP and Brunel pages keep it).'],
      ['Dendrites become a weighted sum.', 'All synaptic inputs add linearly. Real dendrites are not linear: CA1 oblique and tuft branches can generate local spikes, and h-channels filter inputs by location.'],
      ['Threshold becomes a bias.', 'A negative bias means the node needs strong input before it responds, like a cell far from rheobase.'],
      ['The f–I curve becomes φ.', 'The activation is the input–output curve. Sigmoids saturate like real neurons; ReLU is threshold-linear.'],
      ['Weights become the memory.', 'Everything the network has learned lives in its weights, just as long-term memory is thought to live largely in synaptic strengths.'],
    ]))
  + mlBlock('Build one node', `<h3>Inputs</h3>${ctl('nX1', 'x₁', -2, 2, 0.05, 1)}${ctl('nX2', 'x₂', -2, 2, 0.05, 0.5)}${ctl('nX3', 'x₃', -2, 2, 0.05, -1)}
      <h3>Weights and bias</h3>${ctl('nW1', 'w₁', -3, 3, 0.05, 1.5)}${ctl('nW2', 'w₂', -3, 3, 0.05, -1)}${ctl('nW3', 'w₃', -3, 3, 0.05, 0.5)}${ctl('nB', 'bias b', -3, 3, 0.05, -0.5)}
      <div class="control-row"><label for="nAct">Activation φ</label><select id="nAct" class="ml-select">${Object.entries(ACTS).map(([k, a]) => `<option value="${k}" ${k === 'sigmoid' ? 'selected' : ''}>${a.name}</option>`).join('')}</select></div>
      <h3>Logic gates (x₁, x₂ ∈ {0, 1})</h3>${btns('data-gate', [['and', 'AND'], ['or', 'OR'], ['nand', 'NAND'], ['xor', 'XOR?']])}`,
    fig('nnGraph', 'ml-h220 wide', 'The node as a graph', key([C.plum, 'positive weight'], [C.brown, 'negative weight']), 'edge thickness shows |w|. The middle node sums its weighted inputs plus the bias; the right node applies φ.')
    + fig('nnAct', 'ml-h200', 'Activation function', key([C.ink, 'φ(z)'], [C.hot, 'this node']), 'horizontal: total drive z. Vertical: output a. The pink dot is where this node sits now.')
    + fig('nnPlane', 'ml-sq', 'What the node computes over (x₁, x₂)', key([C.plum, 'high output'], [C.ink, 'boundary z = 0', 1]), 'colour is the output for every (x₁, x₂), with x₃ held fixed. A single node can only split this plane with a straight line.'))
  + sec('m1-graph', '03 · Graph builder', 'Draw a network as a connectivity matrix',
    '<p>Any network, artificial or biological, can be written as a <b>connectivity matrix</b> W, where W<sub>ij</sub> is the weight of the edge <b>from</b> node j <b>to</b> node i. Click cells to cycle 0 → +1 (excitatory) → −1 (inhibitory). The graph, its properties and its eigenvalues update instantly.</p>'
    + `<div class="lab-layout ml-layout"><div class="lab-controls"><h3>Matrix W (row = to, column = from)</h3><div id="gbM" class="ml-gbm"></div>
      <h3>Presets</h3>${btns('data-gb', [['ff', 'Feedforward chain'], ['ei', 'E–I pair (Wilson–Cowan)'], ['ring', 'Ring'], ['clear', 'Clear']])}</div>
      <div class="ml-figs">${fig('gbG', 'ml-sq', 'The graph', key([C.plum, 'excitatory'], [C.brown, 'inhibitory']))}${fig('gbE', 'ml-sq', 'Eigenvalues of W', key([C.plum, 'λ'], [C.muted, 'unit circle', 1]), 'eigenvalues outside the unit circle mean some activity pattern is amplified each time it goes around the loops. Feedforward networks have all eigenvalues at 0.')}</div></div>
      <div class="box tan" id="gbInfo"></div>`)
  + sec('m1-layers', '04 · Layers as matrices', 'Many nodes at once',
    eqBox('\\[\\mathbf h=\\varphi(W_1\\mathbf x+\\mathbf b_1),\\qquad \\hat y=\\varphi_{out}(W_2\\mathbf h+b_2)\\]', 'Stack the weights of every node in a layer as rows of a matrix. One matrix–vector product computes all the weighted sums at once. Deep networks repeat this: matrix, non-linearity, matrix, non-linearity.')
    + steps([
      ['Why the non-linearity matters.', 'Without φ, W<sub>2</sub>(W<sub>1</sub>x) = (W<sub>2</sub>W<sub>1</sub>)x is just one big linear map. Depth only adds power because each layer bends the space.'],
      ['Why XOR needs a hidden layer.', 'XOR’s two classes sit on opposite corners of a square, so no single line separates them (Minsky & Papert, 1969). Two hidden nodes each draw a line; the output combines them. The next page trains exactly that network.'],
      ['Recurrent layers.', 'If the matrix maps a layer back onto itself, h<sub>t+1</sub> = φ(Wh<sub>t</sub> + Ux<sub>t</sub>), activity can persist and evolve in time. That is a recurrent network, and it is the bridge to rate and mean-field models.'],
    ]))
  + codeBlock('A node, a layer and a connectivity matrix in NumPy', 'numpy')
  + related([['/lab/neural-network/', 'Train an MLP'], ['/ml/backprop/', 'Backprop step by step'], ['/lab/wilson-cowan/', 'Wilson–Cowan'], ['/experiments/ca1-circuit/', 'The CA1 circuit']]);
mlpages[0].pit = ['Reading W<sub>ij</sub> backwards. Conventions differ; here (as in most rate models) the first index is the target.', 'Assuming any network with negative weights obeys Dale’s principle. A unit with both positive and negative outgoing weights is not a biological neuron.', 'Forgetting the bias. Without it, every node’s boundary must pass through the origin.'];
mlpages[0].quiz = [
  { q: 'A node with inputs x = (1, 2), weights w = (0.5, −1) and bias b = 1 has drive z =', o: ['−0.5', '0.5', '2.5'], a: 0, why: 'z = 0.5·1 + (−1)·2 + 1 = −0.5.' },
  { q: 'Why can’t a single node compute XOR?', o: ['Its weights are too small', 'Its decision boundary is a single straight line, and XOR is not linearly separable', 'It has no bias'], a: 1, why: 'One node splits the input plane with one line (or hyperplane). XOR’s classes sit on opposite corners.' },
  { q: 'In a Wilson–Cowan model, the analogue of a node’s activation function is…', o: ['The time constant τ', 'The population gain function S(x)', 'The connectivity w<sub>EE</sub>'], a: 1, why: 'S maps total input to population rate, exactly as φ maps drive to activation.' },
];
let gbSet = null;
mlpages[0].tour = [
  { title: 'A weighted sum', apply: () => { setSliders({ nX1: 1, nX2: 0.5, nX3: -1, nW1: 1.5, nW2: -1, nW3: 0.5, nB: -0.5 }); el('nAct').value = 'linear'; el('nAct').dispatchEvent(new Event('change')); }, text: 'With a linear activation, the output is just z = Σ w<sub>j</sub>x<sub>j</sub> + b. Change one weight and watch its edge thicken and z change by w × x.', look: 'the numbers on the edges and the sum in the readout.' },
  { title: 'Add a non-linearity', apply: () => { el('nAct').value = 'sigmoid'; el('nAct').dispatchEvent(new Event('change')); }, text: 'A sigmoid squashes z into (0, 1), like a neuron’s firing rate between silence and its maximum. Large positive drive saturates; large negative drive silences.', look: 'the pink dot sliding along the S-shaped curve as you move x₁.' },
  { title: 'The boundary is a line', apply: () => setSliders({ nW3: 0 }), text: 'Over the (x₁, x₂) plane, a single node’s output changes across one straight line, where z = 0. The weights set its angle and the bias shifts it.', look: 'the dashed line in the plane plot moving as you change w₁, w₂ and b.' },
  { title: 'AND and OR', apply: () => document.querySelector('[data-gate="and"]').click(), text: 'With a step activation and the right weights, one node computes AND: only (1, 1) crosses threshold. Try OR and NAND too.', look: 'the four corner points: filled means target 1, and the colour beneath shows the node’s answer.' },
  { title: 'XOR is impossible', apply: () => document.querySelector('[data-gate="xor"]').click(), text: 'XOR wants (0, 1) and (1, 0) on, but (0, 0) and (1, 1) off. No single line can do that, whatever weights you try. You need a hidden layer, which the backprop page trains.', look: 'at least one corner point always on the wrong side.' },
];
mlpages[0].init = () => {
  const ids = ['nX1', 'nX2', 'nX3', 'nW1', 'nW2', 'nW3', 'nB'];
  let gate = null;
  const G = { and: [1, 1, -1.5, 'AND', p => p[0] && p[1]], or: [1, 1, -0.5, 'OR', p => p[0] || p[1]], nand: [-1, -1, 1.5, 'NAND', p => !(p[0] && p[1])], xor: [1, 1, -0.5, 'XOR', p => p[0] !== p[1]] };
  const draw = () => {
    const v = Object.fromEntries(ids.map(k => [k, +el(k).value])), A = ACTS[el('nAct').value];
    const x = [v.nX1, v.nX2, v.nX3], w = [v.nW1, v.nW2, v.nW3], z = w[0] * x[0] + w[1] * x[1] + w[2] * x[2] + v.nB, a = A.f(z);
    // graph
    let { ctx, w: W, h: H } = prep(el('nnGraph'));
    const nodes = [0, 1, 2].map(k => ({ x: W * 0.12, y: H * (0.2 + 0.3 * k), r: 22, label: 'x' + '₁₂₃'[k], sub: nf(x[k], 2), fill: C.tan }));
    nodes.push({ x: W * 0.55, y: H * 0.5, r: 30, label: 'Σ + b', sub: 'z = ' + nf(z, 2), fill: C.pink }, { x: W * 0.86, y: H * 0.5, r: 28, label: 'φ', sub: 'a = ' + nf(a, 2), fill: C.hot });
    nodes.push({ x: W * 0.55, y: H * 0.1, r: 15, label: 'b', fill: C.paper, sub: '' });
    drawGraph(ctx, nodes, [0, 1, 2].map(k => ({ a: k, b: 3, w: w[k], label: `w=${nf(w[k], 2)} → ${nf(w[k] * x[k], 2)}` })).concat([{ a: 3, b: 4, w: 1 }, { a: 5, b: 3, w: v.nB, label: nf(v.nB, 2) }]));
    // activation curve
    let ax = axes(el('nnAct'), { xlim: [-6, 6], ylim: el('nAct').value === 'linear' || el('nAct').value === 'relu' ? [-2, 6] : [-1.2, 1.2], xlabel: 'z', ylabel: 'φ(z)' });
    const zs = Array.from({ length: 241 }, (_, i) => -6 + i * 0.05); line(ax, zs, zs.map(A.f), C.ink, 2.2);
    ax.ctx.fillStyle = C.hot; ax.ctx.beginPath(); ax.ctx.arc(ax.X(Math.max(-6, Math.min(6, z))), ax.Y(a), 6, 0, 7); ax.ctx.fill(); ax.done();
    // plane
    const lim = gate ? [-0.5, 1.5] : [-2, 2]; ax = axes(el('nnPlane'), { xlim: lim, ylim: lim, xlabel: 'x₁', ylabel: 'x₂' });
    const n = 70, dx = (lim[1] - lim[0]) / n, x3 = gate ? 0 : x[2];
    let lo = Infinity, hi = -Infinity; const vals = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const o = A.f(w[0] * (lim[0] + (i + .5) * dx) + w[1] * (lim[0] + (j + .5) * dx) + w[2] * x3 + v.nB); vals.push(o); lo = Math.min(lo, o); hi = Math.max(hi, o); }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const t = (vals[j * n + i] - lo) / (hi - lo || 1); ax.ctx.fillStyle = `rgba(166,41,98,${0.08 + 0.75 * t})`; ax.ctx.fillRect(ax.X(lim[0] + i * dx), ax.Y(lim[0] + (j + 1) * dx), ax.X(lim[0] + dx) - ax.X(lim[0]) + .6, ax.Y(lim[0]) - ax.Y(lim[0] + dx) + .6); }
    if (Math.abs(w[1]) > 1e-6) { const yb = x1 => -(w[0] * x1 + w[2] * x3 + v.nB) / w[1]; line(ax, lim, lim.map(yb), C.ink, 2, [6, 4]); }
    else if (Math.abs(w[0]) > 1e-6) vline(ax, -(w[2] * x3 + v.nB) / w[0], C.ink, [6, 4]);
    let wrong = 0;
    if (gate) {
      [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(p => { const tgt = G[gate][4](p) ? 1 : 0, out = w[0] * p[0] + w[1] * p[1] + v.nB > 0 ? 1 : 0; if (out !== tgt) wrong++;
        ax.ctx.beginPath(); ax.ctx.arc(ax.X(p[0]), ax.Y(p[1]), 9, 0, 7); ax.ctx.lineWidth = 2.5; ax.ctx.strokeStyle = out === tgt ? C.ink : C.hot; ax.ctx.fillStyle = tgt ? C.ink : C.paper; ax.ctx.fill(); ax.ctx.stroke(); });
    } else { ax.ctx.fillStyle = C.hot; ax.ctx.beginPath(); ax.ctx.arc(ax.X(x[0]), ax.Y(x[1]), 6, 0, 7); ax.ctx.fill(); }
    ax.done();
    el('ml-result').innerHTML = `z = ${w.map((wk, k) => `(${nf(wk, 2)})(${nf(x[k], 2)})`).join(' + ')} + (${nf(v.nB, 2)}) = <b>${nf(z, 3)}</b> · a = ${A.name}(z) = <b>${nf(a, 3)}</b>${gate ? ` · ${G[gate][3]}: <b>${4 - wrong}/4</b> corners correct` : ''}`;
    let ex = `<p><b>${A.name} activation:</b> ${A.bio}.</p>`;
    ex += `<p>The largest contribution is from x<sub>${[0, 1, 2].reduce((b, k) => Math.abs(w[k] * x[k]) > Math.abs(w[b] * x[b]) ? k : b, 0) + 1}</sub>. ${z > 0 ? 'Total drive is positive: the node is above threshold.' : 'Total drive is negative: the node is below threshold.'} ${el('nAct').value === 'sigmoid' && Math.abs(z) > 4 ? 'It is saturated, so small changes to the inputs barely change the output. During learning this makes the gradient tiny (φ′ ≈ 0).' : ''}</p>`;
    if (gate === 'xor') ex += `<p><b>XOR cannot be solved by one node.</b> ${wrong} corner${wrong === 1 ? ' is' : 's are'} wrong. Try any weights: one straight boundary can never put (0,1) and (1,0) on one side and (0,0), (1,1) on the other. A hidden layer fixes this; see <a href="/ml/backprop/">Backprop, step by step</a>.</p>`;
    else if (gate) ex += `<p><b>${G[gate][3]} gate.</b> With a step activation the node outputs 1 only where z > 0. ${wrong ? 'Some corners are wrong: adjust the bias.' : 'All four corners are correct.'}</p>`;
    explain(ex);
  };
  ids.forEach(k => bind(k, v => nf(v, 2), draw));
  el('nAct').addEventListener('change', draw);
  document.querySelectorAll('[data-gate]').forEach(b => b.addEventListener('click', () => {
    gate = b.dataset.gate; const [w1, w2, bb] = G[gate]; el('nAct').value = 'step';
    setSliders({ nW1: w1, nW2: w2, nW3: 0, nB: bb, nX1: 1, nX2: 1, nX3: 0 }); draw();
  }));
  ['nX1', 'nX2', 'nX3', 'nAct'].forEach(k => el(k).addEventListener('pointerdown', () => { if (gate && k !== 'nAct') { gate = null; draw(); } }));

  /* ---- graph builder ---- */
  const N = 5, names = ['A', 'B', 'C', 'D', 'E'];
  let M = Array.from({ length: N }, () => new Array(N).fill(0));
  const presets = {
    ff: () => { M = M.map(r => r.fill(0)); M[1][0] = 1; M[2][1] = 1; M[3][2] = 1; M[4][3] = 1; },
    ei: () => { M = M.map(r => r.fill(0)); M[0][0] = 1; M[1][0] = 1; M[0][1] = -1; M[1][1] = -1; },
    ring: () => { M = M.map(r => r.fill(0)); for (let i = 0; i < N; i++) M[(i + 1) % N][i] = 1; },
    clear: () => { M = M.map(r => r.fill(0)); },
  };
  const renderM = () => {
    el('gbM').innerHTML = `<table class="ml-gbt"><tr><th></th>${names.map(n => `<th>${n}</th>`).join('')}</tr>${M.map((r, i) => `<tr><th>${names[i]}</th>${r.map((v, j) => `<td><button data-gi="${i}" data-gj="${j}" class="ml-gbc ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}" aria-label="weight from ${names[j]} to ${names[i]}: ${v}">${v > 0 ? '+1' : v < 0 ? '−1' : '0'}</button></td>`).join('')}</tr>`).join('')}</table>`;
  };
  const analyze = () => {
    const edges = []; M.forEach((r, i) => r.forEach((v, j) => { if (v) edges.push([j, i, v]); }));
    // cycle detection by DFS
    const color = new Array(N).fill(0); let cyc = null; const stack = [];
    const dfs = u => { color[u] = 1; stack.push(u); for (let v = 0; v < N; v++) if (M[v][u]) { if (color[v] === 1) { if (!cyc) cyc = stack.slice(stack.indexOf(v)).concat([v]); } else if (!color[v]) dfs(v); } stack.pop(); color[u] = 2; };
    for (let u = 0; u < N; u++) if (!color[u]) dfs(u);
    const dale = names.map((_, j) => { const s = new Set(M.map(r => Math.sign(r[j])).filter(Boolean)); return s.size <= 1; });
    const e = eigReal(Float64Array.from(M.flat()), N), rad = Math.max(...e.re.map((r, k) => Math.hypot(r, e.im[k])));
    return { edges, cyc, dale, e, rad };
  };
  const drawGB = () => {
    renderM(); const A = analyze();
    let { ctx, w, h } = prep(el('gbG')); const R = Math.min(w, h) * 0.34, cx = w / 2, cy = h / 2 + 6;
    const nodes = names.map((n, k) => ({ x: cx + R * Math.cos(-Math.PI / 2 + k * 2 * Math.PI / N), y: cy + R * Math.sin(-Math.PI / 2 + k * 2 * Math.PI / N), r: 18, label: n, fill: A.dale[k] ? C.paper : '#f6d6d6' }));
    drawGraph(ctx, nodes, A.edges.map(([j, i, v]) => ({ a: j, b: i, w: v * 2.2, inhibCap: true, curve: M[j][i] && i !== j ? 14 : 0 })), { maxW: 3 });
    const ax = axes(el('gbE'), { xlim: [-2.2, 2.2], ylim: [-2.2, 2.2], xlabel: 'Re λ', ylabel: 'Im λ' });
    const th = Array.from({ length: 121 }, (_, k) => k * Math.PI / 60); line(ax, th.map(Math.cos), th.map(Math.sin), C.muted, 1.4, [5, 4]);
    ax.ctx.fillStyle = C.plum; A.e.re.forEach((r, k) => { ax.ctx.beginPath(); ax.ctx.arc(ax.X(r), ax.Y(A.e.im[k]), 6, 0, 7); ax.ctx.fill(); }); ax.done();
    const bad = names.filter((_, k) => !A.dale[k]);
    el('gbInfo').innerHTML = `<p><b>${A.edges.length} edges.</b> ${A.cyc ? `<b>Recurrent:</b> contains the loop ${A.cyc.map(k => names[k]).join(' → ')}. Activity can circulate and persist.` : '<b>Feedforward (acyclic):</b> activity passes through once and dies out, so every eigenvalue is 0.'}</p>
      <p><b>Dale’s principle:</b> ${bad.length ? `node${bad.length > 1 ? 's' : ''} ${bad.join(', ')} (shaded) send both excitatory and inhibitory outputs, which a real neuron does not.` : 'every node is purely excitatory or purely inhibitory.'}</p>
      <p><b>Largest |λ| = ${nf(A.rad, 2)}.</b> ${A.rad > 1.001 ? 'Above 1: some pattern of activity grows each time it travels round the loops. In a rate network this is what makes runaway excitation, or with inhibition, oscillation.' : A.rad > 1e-6 ? 'At or below 1: patterns do not grow on their own.' : A.cyc ? 'All zero even though there are loops: excitation and inhibition cancel exactly around every loop, so activity dies out after a few steps. Make one weight different (for example remove I → I) to break the balance.' : 'All zero: no loops.'} ${A.e.im.some(v => Math.abs(v) > 1e-6) ? 'Complex eigenvalues mean activity rotates between nodes: the seed of oscillation, as in the E–I pair behind Wilson–Cowan rhythms.' : ''}</p>`;
  };
  el('gbM').addEventListener('click', e => { const b = e.target.closest('[data-gi]'); if (!b) return; const i = +b.dataset.gi, j = +b.dataset.gj; M[i][j] = M[i][j] === 0 ? 1 : M[i][j] > 0 ? -1 : 0; drawGB(); });
  document.querySelectorAll('[data-gb]').forEach(b => b.addEventListener('click', () => { presets[b.dataset.gb](); drawGB(); }));
  presets.ei(); M[2][0] = 1; M[3][2] = 1; drawGB();
  draw(); redraw.fn = () => { draw(); drawGB(); };
  attachCode(`import numpy as np

def node(x, w, b, phi=np.tanh):
    """One artificial neuron: weighted sum, bias, activation."""
    z = np.dot(w, x) + b
    return phi(z), z

a, z = node(x=np.array([1.0, 0.5, -1.0]), w=np.array([1.5, -1.0, 0.5]), b=-0.5,
            phi=lambda z: 1 / (1 + np.exp(-z)))
print(f"z = {z:.3f}, a = {a:.3f}")

# A layer is a matrix: row i holds the weights INTO node i
rng = np.random.default_rng(0)
W1, b1 = rng.normal(size=(4, 3)), np.zeros(4)
h = np.tanh(W1 @ np.array([1.0, 0.5, -1.0]) + b1)     # 4 hidden activations at once

# A connectivity matrix: W[i, j] = weight from j to i (E-I pair + a chain)
W = np.zeros((5, 5))
W[0, 0], W[1, 0], W[0, 1], W[1, 1] = 1, 1, -1, -1      # E->E, E->I, I->E, I->I
W[2, 0], W[3, 2] = 1, 1
dale_ok = [len(set(np.sign(W[:, j][W[:, j] != 0]))) <= 1 for j in range(5)]
print("obeys Dale's principle per node:", dale_ok)
print("eigenvalues:", np.round(np.linalg.eigvals(W), 3))`);
};

