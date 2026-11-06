/* Extracted from Little Neural Guide modellab.js [378517:394744] — section: M5. FROM NETWORKS TO MEAN FIELD */
/* ======================================================================
   M5. FROM NETWORKS TO MEAN FIELD
   ====================================================================== */
mlpages[4].lead = 'Wilson–Cowan describes two numbers, E and I. But they stand for the average activity of thousands of neurons. This page builds that network explicitly, averages it, and compares the result with the two-node model, so you can see exactly what the mean-field step assumes.';
mlpages[4].jumps = [['m5-idea', 'The reduction'], ['experiment', 'Network vs mean field'], ['m5-when', 'When it works'], ['m5-dict', 'ML ↔ mean field'], ['code', 'Python']];
mlpages[4].html = () => sec('m5-idea', '01 · The reduction', 'From N equations to 2',
  eqBox('\\[\\tau_a\\frac{dr_i}{dt}=-r_i+S_a\\Big(\\sum_j W_{ij}r_j+P_i\\Big)\\quad\\xrightarrow{\\ \\text{average over }i\\in a\\ }\\quad\\tau_a\\frac{dR_a}{dt}=-R_a+S_a\\big(w_{aE}R_E-w_{aI}R_I+P_a\\big)\\]',
    'Left: N rate units, 80% excitatory and 20% inhibitory. Each pair is connected with probability p, with weight w<sub>ab</sub>/(pN<sub>b</sub>), so the average total input from population b equals w<sub>ab</sub>R<sub>b</sub>. Right: Wilson–Cowan, using exactly the same gains S and couplings w as the lab page.')
  + steps([
    ['Step 1: averaging the input.', 'If every unit in population a receives many inputs, its total input is close to the population average w<sub>aE</sub>R<sub>E</sub> − w<sub>aI</sub>R<sub>I</sub> + P<sub>a</sub> (law of large numbers).'],
    ['Step 2: averaging the output.', 'The trouble is that the mean of S(h) is not S(mean h) when units receive different inputs. The naive mean field ignores this spread.'],
    ['The correction.', 'If inputs across units are roughly Gaussian with spread σ<sub>a</sub>, then R<sub>a</sub> relaxes toward the average of S over that Gaussian, ⟨S(μ<sub>a</sub> + σ<sub>a</sub>z)⟩<sub>z</sub>. The spread comes from heterogeneous drive and from random connectivity, σ² ≈ σ<sub>P</sub>² + Σ<sub>b</sub> w<sub>ab</sub>²(1 − p)R<sub>b</sub>²/(pN<sub>b</sub>). This is the logic of Amit & Brunel (1997) and Brunel (2000).'],
  ]))
  + mlBlock('Network vs mean field, side by side', `${ctl('mfN', 'Network size N', 1.6, 2.9, 0.05, 2.6, 'log scale; 80% E, 20% I.')}${ctl('mfP', 'Connection probability p', 0.03, 1, 0.01, 0.2)}${ctl('mfS', 'Input heterogeneity σ', 0, 1.5, 0.05, 0)}${ctl('mfDrive', 'External drive P to E', 0, 3, 0.05, 1.25)}
      <label class="compare-label"><input type="checkbox" id="mfCorr"> Use the corrected mean field (average over input spread)</label>
      <div class="lab-actions"><button class="primary" id="mfNew">New random network</button><button class="secondary" id="mfSweep">Error vs N sweep</button></div>`,
    fig('mfTr', 'ml-h240 wide', 'Population averages: network vs mean field', key([C.plum, 'network E mean'], [C.ink, 'network I mean'], [C.hot, 'mean-field E', 1], [C.muted, 'mean-field I', 1], ['#c9b8aa', '6 single E units']), 'solid lines average all units of the network; dashed lines are the two-node reduction. Thin lines are individual E units, showing the spread the averages hide.')
    + fig('mfW', 'ml-sq', 'Connectivity matrix (first 100 units)', key([C.plum, 'excitatory'], [C.brown, 'inhibitory']), 'rows are targets, columns are sources, sorted E then I. Each block corresponds to one coupling of Wilson–Cowan: the 2 × 2 model is this matrix averaged block by block.')
    + fig('mfErr', 'ml-sq', 'Reduction error vs network size', key([C.plum, 'naive mean field'], [C.hot, 'corrected']), 'root-mean-square difference between network and mean-field E(t). Press “Error vs N sweep”. Error shrinks with N roughly as 1/√(pN).'))
  + sec('m5-when', '02 · When the reduction works, and when it fails', 'Assumptions you should state in any mean-field paper',
    table(['Assumption', 'Holds when', 'Breaks when'], [
      ['Many inputs per unit (large K = pN)', 'Thousands of synapses per cell, as in cortex and CA1', 'Small or very sparse networks: finite-size fluctuations'],
      ['Weak correlations between inputs', 'Random, sparse connectivity', 'Strong shared input, synchrony, structured wiring'],
      ['Homogeneous populations', 'Cells within a population are similar', 'Broad heterogeneity; needs the corrected (spread-averaged) gain'],
      ['Rates suffice (no spike timing)', 'Slow, asynchronous dynamics', 'Fast oscillations and precise timing; use spiking mean field (Brunel 2000) or simulate spikes'],
    ])
    + '<p>Try it: with N ≈ 40 the network often sits at a fixed point while the mean field oscillates, because finite-size effects shift the dynamics. With N ≈ 800 and σ = 0 the curves nearly coincide. Add heterogeneity σ = 0.8 and the naive mean field drifts away while the corrected one stays closer.</p>')
  + sec('m5-dict', '03 · Dictionary: ML ↔ neural networks ↔ mean field', 'The same ideas under three names',
    table(['Machine learning', 'Rate network (this page)', 'Mean field'], [
      ['Node, unit', 'One neuron’s rate r<sub>i</sub>', 'A population rate R<sub>E</sub>, R<sub>I</sub>'],
      ['Weight matrix W', 'Sparse random W<sub>ij</sub> with E/I sign structure', '2 × 2 matrix of block averages w<sub>ab</sub>'],
      ['Activation φ', 'Single-neuron gain S<sub>a</sub>', 'Effective population gain ⟨S(μ + σz)⟩'],
      ['Recurrent layer', 'Recurrent excitation and inhibition', 'w<sub>EE</sub>, w<sub>II</sub> self-couplings'],
      ['Hidden state dynamics', 'τ dr/dt = −r + S(Wr + P)', 'τ dR/dt = −R + S(wR + P)'],
      ['Training (BPTT)', 'Plasticity, or fitting to data', 'Fitting w, P to recordings (see “Fit a population rhythm”)'],
      ['Low-rank weights', 'W = mnᵀ/N + random part', 'Dynamics confined to a few latent variables, solvable exactly (Mastrogiuseppe & Ostojic, 2018)'],
    ]) + '<p>This is the punchline of the section: <b>a mean-field model is a tiny recurrent neural network whose nodes are populations</b>. Wilson–Cowan is a 2-node RNN; a multi-area model is a larger one. Everything you learned about nodes, edges, eigenvalues and training applies.</p>')
  + codeBlock('An E/I rate network and its mean-field reduction in NumPy', 'numpy')
  + related([['/lab/wilson-cowan/', 'Wilson–Cowan lab'], ['/ml/rnn-dynamics/', 'RNN dynamics'], ['/topics/mean-field/population-activity/', 'From spikes to a population'], ['/lab/brunel/', 'Brunel network'], ['/fitting/oscillation/', 'Fit a population rhythm']]);
mlpages[4].pit = ['Treating a mean-field rate as the rate of a typical neuron. With heterogeneity, few neurons may fire at the mean rate.', 'Forgetting to scale weights with the number of inputs. Without the 1/(pN) scaling, the mean input grows with network size.', 'Using a mean-field model for small, synchronous or strongly structured circuits without checking against a network simulation.'];
mlpages[4].quiz = [
  { q: 'The naive mean field replaces the average of S(h<sub>i</sub>) with…', o: ['S of the average input', 'The maximum of S', 'A linear function'], a: 0, why: 'It assumes all units see the same input, so mean of S = S of mean, which fails when inputs are spread out.' },
  { q: 'Why does the network–mean-field mismatch shrink as N grows (fixed p)?', o: ['Weights get larger', 'Each unit averages more inputs, so its input fluctuates less around the population mean', 'Time constants change'], a: 1, why: 'With K = pN inputs, fluctuations from random connectivity scale like 1/√K.' },
  { q: 'Wilson–Cowan, seen as an RNN, has…', o: ['Two nodes and a 2 × 2 weight matrix', 'One node', 'No recurrence'], a: 0, why: 'E and I are the nodes; w<sub>EE</sub>, w<sub>EI</sub>, w<sub>IE</sub>, w<sub>II</sub> are the edges.' },
];
mlpages[4].tour = [
  { title: 'A big, homogeneous network', apply: () => { setSliders({ mfN: Math.log10(800), mfP: 0.2, mfS: 0, mfDrive: 1.25 }); el('mfCorr').checked = false; window.__mf && __mf.run(); }, text: 'With 800 units, 20% connectivity and identical drive, the network averages (solid) follow the two-node Wilson–Cowan oscillation (dashed) closely.', look: 'solid and dashed curves overlapping.' },
  { title: 'A small network', apply: () => { setSliders({ mfN: Math.log10(50) }); window.__mf && __mf.run(); }, text: 'With only 50 units each one has ~10 inputs, and the randomness of who connects to whom matters. The network may lose the rhythm entirely while the mean field keeps oscillating.', look: 'the gap between solid and dashed curves.' },
  { title: 'Heterogeneous neurons', apply: () => { setSliders({ mfN: Math.log10(800), mfS: 0.8 }); el('mfCorr').checked = false; window.__mf && __mf.run(); }, text: 'Give each unit a different drive (σ = 0.8). The thin single-unit lines spread out, and the naive mean field no longer matches the average.', look: 'the spread of thin lines and the mismatch.' },
  { title: 'Correcting for the spread', apply: () => { el('mfCorr').checked = true; window.__mf && __mf.run(); }, text: 'The corrected mean field averages the gain over the Gaussian spread of inputs. It tracks the network better, though not perfectly, because rates themselves also vary across units.', look: 'the dashed curves moving toward the solid ones.' },
  { title: 'Error vs size', apply: () => el('mfSweep').click(), text: 'The sweep builds networks from 40 to 800 units and measures the mismatch. Bigger networks are better described by mean field, which is why the approach suits large brain areas.', look: 'the error falling with N.' },
];
mlpages[4].init = () => {
  let seed = 4, cur = null;
  const prm = () => ({ N: Math.round(10 ** +el('mfN').value), p: +el('mfP').value, sigma: +el('mfS').value, P: +el('mfDrive').value, corrected: el('mfCorr').checked });
  const rmse = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);
  const run = () => {
    const p = prm(), net = makeEINet({ ...p, seed }), out = runEINet(net, { T: 40 }), mf = runMF({ ...p, T: 40 });
    cur = { p, net, out, mf, err: rmse(out.mE, mf.E) }; draw();
  };
  let sweep = null;
  const draw = () => {
    if (!cur) return; const { p, net, out, mf } = cur;
    let a = axes(el('mfTr'), { xlim: [0, 40], ylim: [0, 0.6], xlabel: 'time (τ)', ylabel: 'rate (fraction active)' });
    out.units.forEach(u => line(a, out.t, u, '#c9b8aa', 1));
    line(a, out.t, out.mE, C.plum, 2.6); line(a, out.t, out.mI, C.ink, 2.2); line(a, mf.t, mf.E, C.hot, 2.4, [7, 4]); line(a, mf.t, mf.I, C.muted, 2, [7, 4]); a.done();
    // connectivity matrix sample
    const { ctx, w, h } = prep(el('mfW')), nE = Math.min(80, net.NE), nI = Math.min(20, net.NI), idx = [...Array(nE).keys(), ...Array.from({ length: nI }, (_, k) => net.NE + k)], n = idx.length, cs = (Math.min(w, h) - 30) / n, ox = 22, oy = 8;
    ctx.fillStyle = C.paper; ctx.fillRect(ox, oy, n * cs, n * cs);
    idx.forEach((i, r) => { const row = net.rows[i], set = new Map(); row.pre.forEach((j, m) => set.set(j, row.w[m])); idx.forEach((j, c) => { if (set.has(j)) { ctx.fillStyle = set.get(j) > 0 ? C.plum : C.brown; ctx.fillRect(ox + c * cs, oy + r * cs, Math.max(1, cs), Math.max(1, cs)); } }); });
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, n * cs, n * cs); ctx.beginPath(); ctx.moveTo(ox + nE * cs, oy); ctx.lineTo(ox + nE * cs, oy + n * cs); ctx.moveTo(ox, oy + nE * cs); ctx.lineTo(ox + n * cs, oy + nE * cs); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('from E', ox + nE * cs / 2, oy + n * cs + 14); ctx.fillText('I', ox + (nE + nI / 2) * cs, oy + n * cs + 14);
    ctx.save(); ctx.translate(12, oy + nE * cs / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('to E', 0, 0); ctx.restore(); ctx.save(); ctx.translate(12, oy + (nE + nI / 2) * cs); ctx.rotate(-Math.PI / 2); ctx.fillText('I', 0, 0); ctx.restore();
    // sweep
    a = axes(el('mfErr'), { xlim: [1.5, 3], ylim: [0.003, 1], logy: true, xlabel: 'log₁₀ N  (1.5 ≈ 30, 2 = 100, 3 = 1000)', ylabel: 'rmse' });
    if (sweep) { const xs = sweep.map(s => Math.log10(s.N));
      line(a, xs, sweep.map(s => Math.max(s.naive, 0.003)), C.plum, 2.2); line(a, xs, sweep.map(s => Math.max(s.corr, 0.003)), C.hot, 2.2, [6, 4]);
      a.ctx.fillStyle = C.plum; sweep.forEach((s, k) => { a.ctx.beginPath(); a.ctx.arc(a.X(xs[k]), a.Y(Math.max(s.naive, 0.003)), 3, 0, 7); a.ctx.fill(); }); }
    else { a.ctx.fillStyle = C.muted; a.ctx.font = '12px system-ui'; a.ctx.textAlign = 'center'; a.ctx.fillText('Press “Error vs N sweep”', a.X(2.25), a.Y(0.06)); }
    a.done();
    const K = Math.round(p.p * p.N), osc = s => Math.max(...s.slice(50)) - Math.min(...s.slice(50)) > 0.05;
    el('ml-result').innerHTML = `N = <b>${p.N}</b> (${net.NE} E, ${net.NI} I) · ≈ <b>${K}</b> inputs per unit · rmse(network E, ${p.corrected ? 'corrected' : 'naive'} mean field) = <b>${nf(cur.err, 3)}</b> · network ${osc(out.mE) ? '<b>oscillates</b>' : '<b>settles</b>'}, mean field ${osc(mf.E) ? '<b>oscillates</b>' : '<b>settles</b>'}`;
    let ex = `<p>Each unit receives about <b>${K}</b> inputs. ${K < 30 ? 'That is few, so which units happen to connect matters, and the network’s average can depart from the mean field (finite-size effects).' : K < 150 ? 'Enough for the average to be meaningful, with some residual mismatch.' : 'Many inputs, so each unit’s drive is close to the population average and the reduction is accurate.'}</p>`;
    if (p.sigma > 0.2) ex += `<p>Drive varies across units (σ = ${nf(p.sigma, 2)}), so single units (thin lines) behave differently. ${p.corrected ? 'The corrected mean field averages the gain over this spread.' : 'The naive mean field assumes every unit gets the mean drive, which biases it. Tick the corrected mean field.'}</p>`;
    if (osc(out.mE) !== osc(mf.E)) ex += '<p><b>Qualitative mismatch:</b> one oscillates and the other does not. Finite size or heterogeneity has moved the network across the Hopf bifurcation that the mean field predicts. Conclusions drawn from the reduced model would be wrong here.</p>';
    explain(ex);
  };
  const runD = debounce(run, 120);
  bind('mfN', v => Math.round(10 ** v), runD); bind('mfP', v => nf(v, 2), runD); bind('mfS', v => nf(v, 2), runD); bind('mfDrive', v => nf(v, 2), runD);
  el('mfCorr').addEventListener('change', run);
  el('mfNew').addEventListener('click', () => { seed++; run(); });
  el('mfSweep').addEventListener('click', () => {
    const Ns = [40, 80, 160, 320, 640, 800], p = prm(); sweep = []; let k = 0; el('mfSweep').disabled = true;
    const one = () => { if (!document.body.contains(el('mfErr'))) return; const N = Ns[k], out = runEINet(makeEINet({ ...p, N, seed }), { T: 40 });
      sweep.push({ N, naive: rmse(out.mE, runMF({ ...p, N, corrected: false }).E), corr: rmse(out.mE, runMF({ ...p, N, corrected: true }).E) }); draw(); k++;
      if (k < Ns.length) setTimeout(one, 20); else el('mfSweep').disabled = false; };
    setTimeout(one, 20);
  });
  window.__mf = { run };
  run(); redraw.fn = draw;
  attachCode(`import numpy as np
S = lambda x, a, th: 1/(1+np.exp(-a*(x-th))) - 1/(1+np.exp(a*th))   # Wilson-Cowan gain
wEE, wEI, wIE, wII = 16, 12, 15, 3; aE, thE, aI, thI = 1.3, 4, 2, 3.7; P, Q = 1.25, 0.0

def network(N=800, p=0.2, sigma=0.0, T=40, dt=0.05, seed=4):
    rng = np.random.default_rng(seed)
    NE = int(0.8 * N); isE = np.arange(N) < NE
    C = rng.random((N, N)) < p                                   # who connects to whom
    J = np.where(isE[:, None], np.where(isE[None], wEE, -wEI), np.where(isE[None], wIE, -wII))
    W = C * J / (p * np.where(isE, NE, N - NE))[None, :]         # scale by expected inputs
    ext = np.where(isE, P, Q) + sigma * rng.standard_normal(N)
    r = np.where(isE, 0.1, 0.05); mE = []
    for _ in range(int(T / dt)):
        h = W @ r + ext
        r = r + dt * (-r + np.where(isE, S(h, aE, thE), S(h, aI, thI)))
        mE.append(r[isE].mean())
    return np.array(mE)

def mean_field(T=40, dt=0.05):
    E, I, out = 0.1, 0.05, []
    for _ in range(int(T / dt)):
        E, I = (E + dt * (-E + S(wEE*E - wEI*I + P, aE, thE)),
                I + dt * (-I + S(wIE*E - wII*I + Q, aI, thI)))
        out.append(E)
    return np.array(out)

mf = mean_field()
for N in [50, 200, 800]:
    print(N, "rmse:", np.sqrt(np.mean((network(N) - mf) ** 2)).round(3))`);
};

