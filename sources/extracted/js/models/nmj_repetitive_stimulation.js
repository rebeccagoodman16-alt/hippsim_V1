/* Extracted from Little Neural Guide modellab.js [1321785:1706387] — section: Mechanism atlas: the neuromuscular */
/* ===== Mechanism atlas: the neuromuscular junction (figure 4) and repetitive nerve stimulation (figure 5) ===== */

/** Draw the junction at the moment t. Geometry follows electron micrographs: active zones (dense bars) sit opposite the
 *  junctional folds; nAChRs pack the fold crests (≈ 10,000 /µm²), voltage-gated Na⁺ channels line the troughs; AChE sits in the basal lamina. */
function nmjDraw(x, W, H, R, i, o) {
  const tr = R.tr, t = tr.t[i], nar = W < 560, sc = Math.min(W / 760, H / 400), X = v => (W - 760 * sc) / 2 + v * sc, Y = v => v * sc, fs = Math.round(11 * Math.max(0.85, sc));
  const lab = (s, a, b, col, al) => { x.font = `${fs}px system-ui`; x.fillStyle = col || '#6f4c27'; const w = x.measureText(s).width; x.fillText(s, al === 'r' ? X(a) - w : X(a), Y(b)); };
  const Vp = tr.Vp[i], P = tr.P[i], caz = tr.caz[i], ach = tr.ach[i], O = tr.O[i], Vm = tr.Vm[i];
  // myelinated motor axon ends at a heminode; the terminal is capped by a terminal Schwann cell
  x.fillStyle = '#efe6d6'; x.fillRect(X(20), Y(40), 120 * sc, 46 * sc); x.fillStyle = nlVcol(Vp); x.fillRect(X(20), Y(52), 160 * sc, 22 * sc);
  lab('myelin', 30, 34, '#a08c78'); lab('motor axon', 30, 100, '#a62962');
  x.fillStyle = '#efe6d6'; x.beginPath(); x.ellipse(X(400), Y(78), 250 * sc, 62 * sc, 0, Math.PI, 2 * Math.PI); x.fill(); lab('terminal Schwann cell', 520, 26, '#a08c78');
  // presynaptic terminal (bouton), colour = membrane potential
  x.fillStyle = '#fbecec'; x.strokeStyle = nlVcol(Vp); x.lineWidth = 4 * sc; x.beginPath(); x.moveTo(X(170), Y(64)); x.bezierCurveTo(X(230), Y(30), X(600), Y(30), X(650), Y(90)); x.lineTo(X(660), Y(190)); x.lineTo(X(170), Y(190)); x.closePath(); x.fill(); x.stroke();
  lab(`nerve terminal ${Vp.toFixed(0)} mV`, 300, 60, '#a62962');
  // mitochondria
  [[260, 95], [470, 88], [590, 120]].forEach(([a, b]) => { x.fillStyle = '#f2d2b6'; x.strokeStyle = '#c99a72'; x.lineWidth = 1; x.beginPath(); x.ellipse(X(a), Y(b), 24 * sc, 10 * sc, 0.2, 0, 7); x.fill(); x.stroke(); });
  if (!nar) lab('mitochondrion', 560, 150, '#a08c78');
  // active zones above the folds; vesicles cluster there; Caᵥ2.1 channels flank each dense bar
  const az = [230, 330, 430, 530, 610], cleftTop = 190, cleftBot = 204, rel = R.events.filter(e => e <= t && e > t - 1.2).length;
  let s = 7; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  az.forEach((a, k) => {
    x.fillStyle = '#5b3a1a'; x.fillRect(X(a - 6), Y(cleftTop - 7), 12 * sc, 6 * sc);   // dense bar
    [-14, 14].forEach(dx => { x.fillStyle = P > 0.2 ? '#2f9e5b' : '#7a7a7a'; x.fillRect(X(a + dx - 2), Y(cleftTop - 4), 4 * sc, 8 * sc); });   // Caᵥ2.1
    if (P > 0.05) { x.fillStyle = `rgba(47,158,91,${Math.min(0.9, caz / 40)})`; x.beginPath(); x.arc(X(a), Y(cleftTop - 10), (6 + caz / 2.5) * sc, Math.PI, 2 * Math.PI); x.fill(); }   // Ca²⁺ nanodomain
    for (let v = 0; v < 9; v++) { const vx = a + (rnd() - 0.5) * 60, vy = cleftTop - 16 - rnd() * 60, fused = rel > 0 && v < Math.min(3, Math.ceil(rel / 12)) && k < Math.max(1, Math.round(rel / 6));
      x.strokeStyle = '#a62962'; x.lineWidth = 1.2; x.fillStyle = 'rgba(208,138,46,.55)';
      if (fused) { x.beginPath(); x.arc(X(a + (v - 1) * 9), Y(cleftTop - 4), 5 * sc, Math.PI * 0.1, Math.PI * 0.9, true); x.stroke(); }   // Ω-shaped fusion
      else { x.beginPath(); x.arc(X(vx), Y(vy), 5 * sc, 0, 7); x.fill(); x.stroke(); } } });
  if (!nar) { lab('synaptic vesicles (≈ 50 nm, ≈ 7,000 ACh each)', 180, 112, '#a62962'); lab('dark bars = active zones · green = Caᵥ2.1 Ca²⁺ channels', 180, 128, '#5b3a1a'); } else lab('vesicles · active zones · Ca²⁺ channels', 180, 128, '#5b3a1a');
  // cleft with basal lamina and AChE
  x.fillStyle = '#fffaf2'; x.fillRect(X(160), Y(cleftTop), 510 * sc, (cleftBot - cleftTop) * sc + 2);
  x.strokeStyle = '#d6c3a8'; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(X(160), Y(cleftTop + 7)); x.lineTo(X(670), Y(cleftTop + 7)); x.stroke(); x.setLineDash([]);
  for (let k = 0; k < 22; k++) { x.fillStyle = '#d08a2e'; x.beginPath(); x.arc(X(175 + k * 22), Y(cleftTop + 7), 1.8 * sc, 0, 7); x.fill(); }
  
  // ACh in the cleft and diffusing into the folds
  const nA = Math.min(160, Math.round(ach * 1.6)); for (let k = 0; k < nA; k++) { const ax = 170 + rnd() * 490, ay = cleftTop + 2 + rnd() * 40; x.fillStyle = '#2f7d5b'; x.beginPath(); x.arc(X(ax), Y(ay), 1.6 * sc, 0, 7); x.fill(); }
  // postsynaptic muscle membrane with junctional folds: nAChRs on the crests, Naᵥ1.4 in the troughs
  const top = cleftBot, depth = 90; x.fillStyle = '#f4dede'; x.strokeStyle = nlVcol(Vm); x.lineWidth = 3 * sc; x.beginPath(); x.moveTo(X(150), Y(top));
  az.forEach(a => { x.lineTo(X(a - 40), Y(top)); x.lineTo(X(a - 40 + 6), Y(top)); x.lineTo(X(a - 40 + 10), Y(top + depth)); x.lineTo(X(a - 40 + 22), Y(top + depth)); x.lineTo(X(a - 40 + 26), Y(top)); });
  x.lineTo(X(690), Y(top)); x.lineTo(X(690), Y(390)); x.lineTo(X(150), Y(390)); x.closePath(); x.fill(); x.stroke();
  az.forEach(a => { for (let k = -2; k <= 2; k++) { const rx = a + k * 12; x.fillStyle = O > 0.05 && Math.abs(k) <= Math.round(O * 6) ? '#c43c3c' : '#7a3fa6'; x.fillRect(X(rx - 3), Y(top - 1), 6 * sc, 6 * sc); }   // nAChRs on crests (open = red)
    x.fillStyle = Vm > -60 ? '#e8495f' : '#3d6a8c'; x.fillRect(X(a - 40 + 13), Y(top + depth - 8), 5 * sc, 6 * sc); });
  // Na⁺ entering through open nAChRs
  const nNa = Math.min(80, Math.round(O * 220)); for (let k = 0; k < nNa; k++) { const ax = az[k % 5] + (rnd() - 0.5) * 50, ay = top + 8 + rnd() * 60; x.fillStyle = '#e07b28'; x.beginPath(); x.arc(X(ax), Y(ay), 1.8 * sc, 0, 7); x.fill(); }
  if (!nar) { lab('cleft ≈ 50 nm with basal lamina and AChE (orange dots) · green dots = ACh', 160, top + depth + 22, '#8a5a1f'); lab('junctional folds: nAChRs on the crests (purple; red = open) · Naᵥ1.4 in the troughs (blue)', 160, top + depth + 38, '#7a3fa6'); } else { lab('green = ACh · orange = AChE / Na⁺', 160, top + depth + 22, '#8a5a1f'); lab('purple/red = nAChRs (closed/open)', 160, top + depth + 38, '#7a3fa6'); }
  lab(`muscle end plate ${Vm.toFixed(0)} mV${Vm > -20 ? ' · muscle action potential!' : ''}`, 170, 380, Vm > -60 ? '#c43c3c' : '#6f4c27');
  // counters
  const q = R.events.filter(e => e <= t).length; x.font = `bold ${fs + 1}px system-ui`; x.fillStyle = '#141111'; x.fillText(nar ? `t = ${t.toFixed(2)} ms · ${q} quanta` : `t = ${t.toFixed(2)} ms · quanta released ${q} · readily releasable pool ${Math.round(tr.rrp[i])} vesicles`, X(170), Y(top + depth + 62));
}

mxReg({
  id: 'nmj', group: 'Synapse', title: 'The neuromuscular junction: one impulse, about 70 quanta', h: 420,
  sub: 'A mammalian motor nerve terminal and the muscle end plate under it, magnified about 20,000×. One nerve impulse, about 20 ms.',
  steps: [[0, 1, 'Rest', 'Vesicles full of acetylcholine wait at active zones (dense bars) that line up with the junctional folds below. Each vesicle holds about 7,000 ACh molecules (one quantum).'],
    [1, 1.45, 'Impulse invades the terminal', 'The action potential spreads from the last node of Ranvier into the unmyelinated terminal and depolarises it.'],
    [1.3, 1.9, 'Ca²⁺ channels open', 'Caᵥ2.1 (P/Q-type) channels next to each active zone open. Most Ca²⁺ enters as the membrane repolarises (larger driving force), forming tiny nanodomains of tens of µM.'],
    [1.6, 2.4, 'Vesicles fuse', 'Ca²⁺ binds synaptotagmin; SNARE proteins zip and vesicles fuse (Ω shapes). Release rises with about the 4th power of [Ca²⁺]: here about 70 quanta in under a millisecond.'],
    [2.0, 3.2, 'ACh crosses the cleft', 'ACh diffuses across the 50 nm cleft in microseconds and binds nicotinic receptors packed on the fold crests (2 ACh per receptor). Acetylcholinesterase in the basal lamina already starts destroying it.'],
    [2.3, 6, 'End-plate potential → muscle AP', 'Open nAChRs let Na⁺ in (and some K⁺ out). The end plate depolarises by ≈ 37 mV, far beyond the ≈ 14 mV needed: the safety factor. Naᵥ1.4 channels in the fold troughs fire the muscle action potential.'],
    [6, 20, 'Clear-up and recycling', 'AChE hydrolyses ACh within about a millisecond, receptors close, and the end plate repolarises. Vesicle membrane is retrieved by endocytosis and refilled; the readily releasable pool refills over hundreds of milliseconds.']],
  toggles: [['ca', 'Low Ca²⁺ outside (1 mM)', 1], ['curare', 'Curare (nAChR block, 1 × K_d)', 1], ['neo', 'Neostigmine (AChE inhibitor)', true], ['botox', 'Botulinum toxin (cleaves SNAP-25)', true], ['lems', 'Lambert–Eaton (anti-Caᵥ2.1 antibodies)', true], ['mg_dis', 'Myasthenia gravis (anti-nAChR antibodies)', true], ['apOn', 'Block the muscle AP (see the full EPP)', false]],
  run: o => nmjRun({ ...o, tEnd: 20 }),
  draw: (x, W, H, R, i, o) => nmjDraw(x, W, H, R, i, o),
  graph: [['terminal mV', 'Vp', -80, 40, '#a62962'], ['Caᵥ2.1 open', 'P', 0, 1, '#2f9e5b'], ['active-zone Ca²⁺ µM', 'caz', 0, null, '#2f9e5b'], ['release rate (quanta/ms)', 'rel', 0, null, '#d08a2e'], ['cleft ACh', 'ach', 0, null, '#2f7d5b'], ['nAChR open', 'O', 0, null, '#c43c3c'], ['end plate mV', 'Vm', -95, 35, '#141111']],
  note: (o, R) => { const q = R.perAP[0], fired = R.musSp.length, epp = (R.Vmin + 90);
    if (o.botox) return `Botulinum toxin cleaves SNAP-25, so vesicles cannot fuse: ${q} quantum released, no muscle action potential: flaccid paralysis.`;
    if (o.neo) return `Neostigmine slows ACh breakdown: the end-plate current lasts much longer and the muscle fired ${fired} action potentials from one nerve impulse (repetitive firing). Used to reverse curare and to treat myasthenia.`;
    if (o.curare) return `Curare competes with ACh for nAChRs. ${q} quanta were released normally, but the end plate only depolarised ≈ ${(epp).toFixed(0)} mV: ${fired ? 'still enough' : 'below threshold, no muscle AP'}.`;
    if (o.lems) return `Lambert–Eaton: fewer presynaptic Ca²⁺ channels, so only ${q} quanta (normally ≈ 70) and ${fired ? 'a muscle AP just made it' : 'the EPP failed to reach threshold'}. See figure 5 for why high-frequency stimulation helps.`;
    if (o.mg_dis) return `Myasthenia gravis: release is normal (${q} quanta) but antibodies removed most receptors, so the EPP (≈ ${epp.toFixed(0)} mV) is close to threshold: ${fired ? 'fired this time' : 'failed'}. Any further drop (as in repeated stimulation) causes failures: fatigable weakness.`;
    if (o.ca === 1) return `At 1 mM Ca²⁺ release falls steeply (fourth-power law): ${q} quanta instead of ≈ 70.${fired ? '' : ' The EPP failed to trigger a muscle AP.'}`;
    if (o.apOn === false) return `With the muscle AP blocked you see the whole end-plate potential: ${epp.toFixed(1)} mV from ${q} quanta (≈ ${(epp / q).toFixed(2)} mV each, slightly less than one mEPP because the driving force falls). Threshold needs ≈ 14 mV: safety factor ≈ ${(epp / 14).toFixed(1)}.`;
    return `${q} quanta released; the muscle fired ${fired} action potential${fired === 1 ? '' : 's'}. Synaptic delay (nerve AP to end-plate current) ≈ ${(R.events[0] - 1).toFixed(2)} ms.`; },
  keys: [['Quantal content (mammal, 2 mM Ca²⁺)', '≈ 50–100 (human ≈ 20–50)', 'Wood & Slater 2001'], ['Miniature EPP', '≈ 0.5–1 mV', 'Fatt & Katz 1952'], ['ACh per vesicle', '≈ 6,000–10,000 molecules', 'Kuffler & Yoshikami 1975'], ['nAChR density on fold crests', '≈ 10,000 /µm²', 'Fertuck & Salpeter 1976'], ['Cleft width', '≈ 50 nm', 'electron microscopy'], ['Safety factor', 'rodent ≈ 3–5, human ≈ 2', 'Wood & Slater 2001'], ['Release vs [Ca²⁺]', '∝ [Ca²⁺]⁴ (Dodge–Rahamimoff)', 'Dodge & Rahamimoff 1967'], ['This model', '70 quanta, mEPP 0.9 mV, EPP 37 mV, EPC decay τ ≈ 1 ms', 'calibrated to the rows above']],
  miscon: 'The NMJ does not “barely” work: in health it releases several times more transmitter than needed (safety factor). Diseases such as myasthenia gravis and Lambert–Eaton show up when that margin is used up.',
  link: ['/biology/reflex/#rx-zoom', 'See the NMJ inside the knee-jerk']
});

mxReg({
  id: 'rns', group: 'Synapse', title: 'Repetitive nerve stimulation: how neurologists test the NMJ', h: 380, stepDur: 5,
  sub: 'Stimulate a motor nerve repeatedly and record the compound muscle action potential (CMAP): the summed response of all the muscle fibres. Here 24 model end plates with natural variation in size and quantal content.',
  steps: [[0, 1, 'Healthy, 3 Hz', 'Quantal content falls by about a fifth over the first four or five stimuli (the readily releasable pool depletes), but every fibre still reaches threshold: no CMAP decrement.', { d: 'normal', f: 3, n: 10 }],
    [0, 1, 'Myasthenia gravis, 3 Hz', 'The same fall in transmitter release now pushes fibres with the smallest end-plate potentials below threshold: the CMAP decrements. A decrement above 10 % is the diagnostic sign.', { d: 'mg', f: 3, n: 10 }],
    [0, 1, 'Lambert–Eaton, 3 Hz', 'Too few Ca²⁺ channels: the first CMAP is already small, and slow stimulation makes it smaller still.', { d: 'lems', f: 3, n: 10 }],
    [0, 1, 'Lambert–Eaton, 50 Hz', 'At high frequency residual Ca²⁺ builds up in the terminal and release facilitates: the CMAP grows several-fold (increment > 100 %), the hallmark of a presynaptic disorder.', { d: 'lems', f: 50, n: 15 }],
    [0, 1, 'Healthy, 50 Hz', 'Release settles at about half the first response, but the safety factor keeps every fibre firing.', { d: 'normal', f: 50, n: 15 }]],
  toggles: [],
  run: (o, so) => { const R = nmjRNS({ train: so.f, nAP: so.n, tEnd: (so.n - 1) * 1000 / so.f + 20, mg_dis: so.d === 'mg', lems: so.d === 'lems' }, 24), t = []; for (let k = 0; k <= 100; k++) t.push(k / 100);
    return { ...R, so, rec: 0.01, tr: { t, prog: t.map(v => v) }, tEnd: 1 }; },
  draw(x, W, H, R, i) { const f = R.tr.t[i], n = R.frac.length, show = Math.max(1, Math.ceil(f * n)), fs = 12;
    const L = 56, Rr = W - 16, bw = (Rr - L) / n, top = 30, hgt = H * 0.42;
    x.font = `${fs}px system-ui`; x.fillStyle = '#6f4c27'; x.fillText(`CMAP amplitude (% of fibres firing) · ${R.so.f} Hz`, L, 18);
    x.strokeStyle = '#efe4d8'; for (let g = 0; g <= 4; g++) { const y = top + hgt * g / 4; x.beginPath(); x.moveTo(L, y); x.lineTo(Rr, y); x.stroke(); x.fillStyle = '#8a7058'; x.fillText(100 - g * 25, 22, y + 4); }
    R.frac.forEach((v, k) => { const cx = L + bw * (k + 0.5), amp = hgt * v; x.strokeStyle = k < show ? '#141111' : '#e3d5c5'; x.lineWidth = 1.6; x.beginPath();   // stylised biphasic CMAP
      for (let u = -1; u <= 1.001; u += 0.05) { const px = cx + u * bw * 0.38, py = top + hgt - amp * Math.exp(-(((u + 0.25) / 0.22) ** 2)) + amp * 0.12 * Math.exp(-(((u - 0.35) / 0.3) ** 2)); u === -1 ? x.moveTo(px, top + hgt) : x.lineTo(px, py); } x.stroke();
      x.fillStyle = k < show ? '#141111' : '#c9b6a2'; x.fillText((100 * v).toFixed(0), cx - 8, top + hgt - amp - 6); });
    const first = R.frac[0] || 1e-9, last = R.frac[Math.min(show, n) - 1], ch = 100 * (last - first) / first;
    x.font = `bold ${fs + 1}px system-ui`; x.fillStyle = ch < -10 ? '#b3261e' : ch > 100 ? '#2f7d5b' : '#141111'; x.fillText(`${ch >= 0 ? 'increment' : 'decrement'} ${Math.abs(ch).toFixed(0)} % (response ${Math.min(show, n)} vs 1)`, L, top + hgt + 36);
    // quantal content per stimulus
    const t2 = top + hgt + 56, h2 = H - t2 - 22, qmax = Math.max(80, ...R.q); x.font = `${fs}px system-ui`; x.fillStyle = '#6f4c27'; x.fillText('mean quanta released per stimulus', L, t2 - 4);
    R.q.forEach((v, k) => { const bh = h2 * v / qmax; x.fillStyle = k < show ? 'rgba(208,138,46,.75)' : 'rgba(208,138,46,.2)'; x.fillRect(L + bw * k + bw * 0.25, t2 + h2 - bh, bw * 0.5, bh); x.fillStyle = '#8a5a1f'; x.fillText(v.toFixed(0), L + bw * k + bw * 0.25, t2 + h2 - bh - 3); });
    x.fillStyle = '#8a7058'; x.fillText('stimulus number →', Rr - 120, H - 6); },
  graph: [],
  note: (o, R, so) => { const first = R.frac[0], last = R.frac[R.frac.length - 1], ch = 100 * (last - first) / (first || 1e-9), qd = 100 * (R.q[R.q.length - 1] - R.q[0]) / R.q[0];
    const k4 = Math.min(3, R.frac.length - 1), d4 = 100 * (R.frac[k4] - first) / (first || 1e-9);
    return `${{ normal: 'Healthy', mg: 'Myasthenia gravis', lems: 'Lambert–Eaton' }[so.d]} at ${so.f} Hz: 4th vs 1st response ${d4 >= 0 ? '+' : ''}${d4.toFixed(0)} % (the clinical measure), last vs first ${ch >= 0 ? '+' : ''}${ch.toFixed(0)} %; transmitter release ${qd >= 0 ? '+' : ''}${qd.toFixed(0)} %. Clinically, a decrement > 10 % at 3 Hz points to a postsynaptic problem (myasthenia); an increment > 100 % after brief maximal exercise or 20–50 Hz stimulation points to Lambert–Eaton.`; },
  keys: [['Myasthenia gravis', 'antibodies to nAChRs (or MuSK); 3 Hz decrement > 10 %', 'AANEM guidelines'], ['Lambert–Eaton syndrome', 'antibodies to P/Q-type Ca²⁺ channels; low CMAP, increment > 100 % at high rate', 'Oh et al. 2005, Muscle Nerve'], ['Readily releasable pool (mammalian NMJ)', '≈ 300–1,000 vesicles', 'Ruiz et al. 2011'], ['Steady-state release at 50 Hz', '≈ 30–60 % of the first response', 'Wood & Slater 2001']],
  miscon: 'A smaller CMAP does not always mean a muscle or nerve problem: in Lambert–Eaton it grows dramatically with a burst of activity, because the defect is presynaptic and residual Ca²⁺ partly compensates.',
  link: ['/biology/reflex/', 'Try curare and myasthenia in the reflex lab']
});
// ============================================================================
// Histology (/biology/histology/): a virtual microscope over a 40 µm coronal section of rat dorsal hippocampus,
// from the alveus through CA1 to the dentate gyrus. Stains: Nissl, Golgi (real reconstructions from the guide),
// immunofluorescence (DAPI, NeuN, PV, SST, GFAP) and myelin, plus an Alzheimer's pathology overlay.
// Layer depths: approximate rat dorsal hippocampus. Cell counts from soma packing; see "Under the hood".
// ============================================================================
const HS_LAYERS = [   // [key, name, top µm, bottom µm, what is there]
  ['alv', 'Alveus', 0, 40, 'Myelinated axons of CA1 and subicular pyramidal cells leaving the hippocampus (toward the fimbria/fornix).'],
  ['so', 'Stratum oriens', 40, 190, 'Basal dendrites of CA1 pyramidal cells, O-LM and other interneuron somata, CA3 → CA1 Schaffer input to basal dendrites.'],
  ['sp', 'Stratum pyramidale', 190, 250, 'Tightly packed CA1 pyramidal cell bodies (3–5 deep) and PV basket / axo-axonic cell somata; dense perisomatic GABAergic boutons.'],
  ['sr', 'Stratum radiatum', 250, 600, 'Apical trunks and oblique dendrites of CA1 pyramidal cells; Schaffer collaterals from CA3 make most of their synapses here.'],
  ['slm', 'Stratum lacunosum-moleculare', 600, 760, 'The apical tuft. Temporoammonic input from entorhinal layer III, O-LM axons (SST+) and, in Alzheimer’s disease, many amyloid plaques.'],
  ['fis', 'Hippocampal fissure', 760, 772, 'The fused pial surfaces between CA1 and the dentate gyrus; blood vessels run along it.'],
  ['ml', 'Dentate molecular layer', 772, 1010, 'Granule-cell dendrites. Perforant-path input from entorhinal layer II: lateral EC to the outer third, medial EC to the middle third.'],
  ['gcl', 'Granule cell layer', 1010, 1085, 'Densely packed small granule cell bodies (≈ 10 µm), the most numerous neurons of the hippocampus.'],
  ['hil', 'Hilus', 1085, 1350, 'Mossy fibres (granule-cell axons), mossy cells, hilar interneurons (SST+ HIPP cells).']
];
const HS_W = 1400, HS_H = 1350, HS_T = 40;   // field (µm) and section thickness (µm)
const HS_LY = k => HS_LAYERS.find(l => l[0] === k);
const HS_STAINS = [['nissl', 'Nissl (cresyl violet)'], ['golgi', 'Golgi (silver chromate)'], ['if', 'Immunofluorescence'], ['myelin', 'Myelin (Black-Gold)']];
const HS_OBJ = [[4, 1400, 60], [10, 560, 8], [40, 140, 1.2]];   // magnification, field width µm, depth of field µm (approx.)
const HS_CH = [['dapi', 'DAPI (all nuclei)', '#5b8cff'], ['neun', 'NeuN (neurons)', '#3ddc84'], ['pv', 'Parvalbumin', '#ff4fa3'], ['sst', 'Somatostatin', '#ffd84a'], ['gfap', 'GFAP (astrocytes)', '#4ee6e6']];

/** Build one virtual section: somata, astrocytes, Golgi-impregnated cells and pathology (deterministic from seed). */
function hsBuild(seed, ad) {
  const R = mulberry(seed), U = (a, b) => a + (b - a) * R(), S = { cells: [], astro: [], plaques: [], golgi: [] };
  const fill = (lk, dens, kind, rr, extra) => { const L = HS_LY(lk), vol = HS_W * (L[3] - L[2]) * HS_T * 1e-9, n = Math.round(dens * vol);   // dens per mm³
    for (let i = 0; i < n; i++) S.cells.push(Object.assign({ x: U(0, HS_W), y: U(L[2] + rr, L[3] - rr), z: U(0, HS_T), r: rr * U(0.85, 1.15), kind, ang: U(-0.3, 0.3), lay: lk }, extra ? extra(R) : {})); };
  // principal cells: packing from soma size (pyramidal ≈ 15 µm, granule ≈ 10 µm), CA1 neuron loss in late AD
  const loss = ad >= 2 ? 0.4 : ad >= 1 ? 0.85 : 1;   // late AD: ~60 % of CA1 pyramidal cells lost (West et al. 1994 reported about two thirds)
  fill('sp', 2.0e5 * loss, 'pyr', 7.5);
  fill('gcl', 6.5e5, 'gc', 5);
  // interneurons (≈ 11 % of CA1 neurons; Bezaire & Soltesz 2013 proportions, simplified)
  fill('sp', 8e3, 'int', 8, () => ({ sub: R() < 0.55 ? 'pv' : 'cck' }));
  fill('so', 4e3, 'int', 7.5, () => ({ sub: R() < 0.45 ? 'sst' : R() < 0.5 ? 'pv' : 'other' }));
  fill('sr', 1e3, 'int', 7, () => ({ sub: 'other' }));
  fill('slm', 1.5e3, 'int', 7, () => ({ sub: 'other' }));
  fill('ml', 1e3, 'int', 7, () => ({ sub: 'other' }));
  fill('gcl', 6e3, 'int', 8, () => ({ sub: 'pv' }));
  fill('hil', 3e3, 'int', 8, () => ({ sub: R() < 0.5 ? 'sst' : 'other' }));
  fill('hil', 5e3, 'mossy', 10);   // mossy cells ≈ 3 % of granule-cell numbers
  // glial nuclei everywhere (oligodendrocytes, microglia, astrocyte nuclei)
  HS_LAYERS.forEach(L => fill(L[0], L[0] === 'alv' ? 1.2e5 : 4.5e4, 'glia', 3));
  // astrocytes: non-overlapping domains ≈ 45–60 µm apart (Bushong et al. 2002), Poisson-disc sampled
  for (let t = 0; t < 6000 && S.astro.length < 700; t++) { const a = { x: U(0, HS_W), y: U(10, HS_H - 10), z: U(0, HS_T) }; const L = HS_LAYERS.find(l => a.y >= l[2] && a.y < l[3]); if (L && (L[0] === 'sp' || L[0] === 'gcl') && R() < 0.8) continue;
    if (S.astro.every(b => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 > 46 * 46)) { a.arms = Array.from({ length: 6 + Math.floor(R() * 4) }, () => [U(0, 6.28), U(14, 26)]); S.astro.push(a); } }
  // Golgi: a few percent of cells, impregnated completely and at random
  const pyr = S.cells.filter(c => c.kind === 'pyr'), gc = S.cells.filter(c => c.kind === 'gc'), ints = S.cells.filter(c => c.kind === 'int');
  const pick = (arr, f) => arr.filter(() => R() < f);
  S.golgi = [...pick(pyr, 0.03).map(c => [c, 'pyr']), ...pick(gc, 0.006).map(c => [c, 'gc']), ...pick(ints, 0.04).map(c => [c, 'int'])].map(([c, k]) => ({ c, k, m: Math.floor(R() * 4), flip: R() < 0.5, rot: U(-0.12, 0.12) }));
  S.golgiAstro = S.astro.filter(() => R() < 0.05);
  // Alzheimer's pathology: plaques in slm and outer molecular layer (perforant-path terminal zones), tangles in CA1 pyramidal cells
  if (ad) { const nP = ad >= 2 ? 70 : 22, zone = [['slm', 0.42], ['ml', 0.33], ['sr', 0.13], ['so', 0.07], ['hil', 0.05]];
    for (let i = 0; i < nP; i++) { let u = R(), k = zone[0][0]; for (const [kk, w] of zone) { if (u < w) { k = kk; break; } u -= w; } const L = HS_LY(k), yy = k === 'ml' ? U(L[2], L[2] + (L[3] - L[2]) * 0.45) : U(L[2], L[3]);
      S.plaques.push({ x: U(0, HS_W), y: yy, z: U(0, HS_T), r: U(8, ad >= 2 ? 40 : 25), dense: R() < 0.5 }); }
    pyr.forEach(c => { if (R() < (ad >= 2 ? 0.35 : 0.08)) c.tangle = true; }); }
  return S;
}
/** Pick a reconstruction and orient it: pyramidal apical dendrites point toward the fissure (down), granule dendrites toward it (up). */
function hsMorph(k, i) {
  const ids = { pyr: ['ca1-a', 'ca1-b', 'ca1-jarsky', 'ca1-5038804'], gc: ['gc-3319201', 'gc-0306', 'gc-sh1', 'gc-sh6'], int: ['pvb-1', 'olm-starfish', 'ca1-i1', 'bcdg-1'] }[k];
  const m = ATLAS.find(a => a.id === ids[i % ids.length]); if (!m) return null; if (m._hs) return m._hs;
  const c = atlasCell(m); let sy = 0, n = 0;
  c.sections.forEach(s => { if (s[0] === 4 || (k !== 'pyr' && s[0] === 3)) for (let j = 1; j < s[2].length; j += 3) { sy += s[2][j]; n++; } });
  const want = k === 'gc' ? -1 : 1, flip = n && Math.sign(sy / n) !== want ? -1 : 1;   // screen y grows downward
  return (m._hs = { secs: c.sections.map(s => [s[0], s[2].map((v, j) => j % 3 === 1 ? v * flip : v), s[3]]), name: m.name, code: m.code });
}

function renderHistology() {
  document.title = 'Histology: a virtual microscope · Brain, body & behaviour';
  $('lesson').innerHTML = bioHead('Histology: a virtual microscope', 'REAL BIOLOGY · STAINS, LAYERS AND CELLS', 'A 40 µm section through rat dorsal hippocampus, from the alveus through CA1 to the dentate gyrus, under the four stains every neuroscience lab uses. Switch stains and objectives, focus through the section, impregnate cells with Golgi, light up cell types with antibodies and add Alzheimer’s pathology. The Golgi-stained neurons are the guide’s real reconstructions.')
    + `<nav class="page-jumps"><a href="#hs-scope">Microscope</a><a href="#hs-stains">What each stain shows</a><a href="#hs-quiz">Find the layer</a><a href="#hs-real">Real micrographs</a><a href="#hs-uth">How it is built</a></nav>
    <section class="lesson-section lab" id="hs-scope"><p class="eyebrow">01 · Look down the microscope</p><h2>One section, four stains</h2>
      <p class="ux-desc">Start at 4× with Nissl to see the layers, switch to Golgi to see whole neurons, then go to 40× and focus up and down: a 40 µm section is thicker than the depth of field of a high-power objective.</p>
      <div class="ux-wrap"><div class="ux-s1">
        <div class="ux-bar"><div class="ux-seg hs-seg" role="radiogroup" aria-label="Stain">${HS_STAINS.map(([k, l], i) => `<button role="radio" aria-checked="${i === 0}" data-hsst="${k}">${l.split(' (')[0]}</button>`).join('')}</div><span class="ux-sp"></span>
          <div class="ux-seg hs-seg hs-obj" role="radiogroup" aria-label="Objective">${HS_OBJ.map(([m], i) => `<button role="radio" aria-checked="${i === 0}" data-hsobj="${i}">${m}×</button>`).join('')}</div></div>
        <div class="hs-stage"><canvas id="hsCv" class="ux-cv" style="height:600px;touch-action:none" aria-label="Virtual microscope view of a stained hippocampal section"></canvas><div class="hs-tip" id="hsTip" hidden></div></div>
        <p class="ux-hint" id="hsHint">Hover (or tap) to identify a layer or cell · at 10× and 40× drag to move the slide</p>
      </div><div class="ux-s2"><div id="hsInfo" class="ux-fig hs-info"></div></div>
      <aside class="ux-panel" aria-label="Microscope settings">
        <div class="ux-pane">
          <h4 class="hs-h">Stain</h4><p class="ux-note" id="hsStainTxt"></p>
          <div id="hsIF" hidden><h4 class="hs-h">Antibody channels</h4>${HS_CH.map(([k, l, c]) => `<label class="nl-inl ux-chk"><input type="checkbox" data-hsch="${k}" ${['dapi', 'pv', 'sst'].includes(k) ? 'checked' : ''}><i class="hs-sw" style="background:${c}"></i>${l}</label>`).join('')}</div>
          <div id="hsGolgi" hidden><button class="secondary" id="hsRestain">Re-stain (new random cells)</button><p class="ux-note" id="hsGolgiTxt"></p></div>
          <h4 class="hs-h">Focus</h4>
          <div class="ux-sl"><label for="hsF">Focal plane (depth in the section)</label><span class="ux-val"><output id="hsFo">20</output><em>µm</em></span><input type="range" id="hsF" min="0" max="${HS_T}" step="1" value="20"></div>
          <p class="ux-note" id="hsDof"></p>
          <h4 class="hs-h">Pathology</h4>
          <div class="ux-seg" role="radiogroup" aria-label="Alzheimer's pathology">${['Healthy', 'Early AD', 'Late AD'].map((l, i) => `<button role="radio" aria-checked="${i === 0}" data-hsad="${i}">${l}</button>`).join('')}</div>
          <p class="ux-note" id="hsAdTxt">Healthy adult tissue.</p>
          <h4 class="hs-h">Labels</h4>
          <label class="nl-inl ux-chk"><input type="checkbox" id="hsLab" checked> Layer names</label>
          <label class="nl-inl ux-chk"><input type="checkbox" id="hsScale" checked> Scale bar</label>
          <button class="secondary" id="hsSnap" style="margin-top:8px">Snapshot</button>
        </div>
      </aside></div><div id="hsSnaps" class="ng-snaps"></div></section>
    <section class="lesson-section" id="hs-stains"><p class="eyebrow">02 · Read the stains</p><h2>What each stain reveals, and what it hides</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Stain</th><th>What binds what</th><th>You see</th><th>You miss</th></tr></thead><tbody>
        <tr><td><b>Nissl</b> (cresyl violet, thionin)</td><td>Basic dyes bind RNA in the rough ER (Nissl bodies) and DNA in nuclei</td><td>Every cell body, so layers, cell density and cell loss</td><td>Dendrites and axons</td></tr>
        <tr><td><b>Golgi</b> (silver chromate)</td><td>Potassium dichromate then silver nitrate: silver chromate crystallises inside a few percent of cells and fills them completely</td><td>Whole neurons with every branch and spine, one at a time on a clear background</td><td>Which cells: impregnation is sparse and its basis is still unknown</td></tr>
        <tr><td><b>Immunofluorescence</b></td><td>Antibodies against chosen proteins (NeuN, parvalbumin, somatostatin, GFAP) and DAPI on DNA</td><td>Cell types by their molecules, several at once in different colours</td><td>Anything without an antibody; shapes only where the protein is</td></tr>
        <tr><td><b>Myelin</b> (Black-Gold, Luxol fast blue)</td><td>Binds the lipids and proteins of myelin</td><td>Fibre tracts: alveus, myelinated input paths</td><td>Cell bodies and unmyelinated axons such as mossy fibres</td></tr>
        <tr><td><b>AD markers</b> (Thioflavin-S, 6E10, AT8)</td><td>Thioflavin-S binds β-sheet amyloid; 6E10 binds Aβ; AT8 binds tau phosphorylated at Ser202/Thr205</td><td>Plaques and neurofibrillary tangles</td><td>Soluble oligomers, which are thought to be the most synaptotoxic form</td></tr></tbody></table></div>
      <p class="nl-explain"><b>Why the Golgi stain changed neuroscience.</b> Because it fills only a few cells, each one stands out completely. Ramón y Cajal used it to argue that the nervous system is made of separate cells that touch at contacts (the neuron doctrine), against Golgi himself, who thought it was a continuous net. They shared the 1906 Nobel Prize; electron microscopy settled it for Cajal in the 1950s.</p></section>
    <section class="lesson-section" id="hs-quiz"><p class="eyebrow">03 · Check yourself</p><h2>Find the layer</h2><p>Click the layer named below on the microscope view (any stain, any objective). Nissl at 4× is the easiest place to start.</p>
      <div class="hs-quiz"><button id="hsQGo">Start</button><span id="hsQ" class="hs-q"></span><span id="hsQs" class="muted"></span></div></section>
    <section class="lesson-section" id="hs-real"><p class="eyebrow">04 · The real thing</p><h2>Real micrographs to compare with</h2><p>These are photographs of real tissue from the guide’s image collection. Compare the Nissl-like neuron micrograph, glia and the BrdU-labelled rat hippocampus with the virtual section above.</p>
      <div class="rb-gallery">${['neuron-micrograph', 'nervous-tissue', 'rat-hippocampus-brdu', 'glia-cns', 'alzheimers-brain'].map(id => typeof realFig === 'function' ? realFig(id) : '').join('')}</div></section>
    <section class="lesson-section"><details class="uth" id="hs-uth"><summary><span>Under the hood</span> layer depths, cell numbers, what is real and what is drawn</summary><div class="uth-grid">
      <section><h3>Geometry</h3><p>Layer depths are approximate for rat dorsal hippocampus: oriens ${190 - 40} µm, pyramidale 60 µm, radiatum 350 µm, lacunosum-moleculare 160 µm, dentate molecular layer ${1010 - 772} µm, granule cell layer 75 µm. Real sections vary with position along the hippocampus and with the cutting angle.</p>
        <p>Section thickness 40 µm, a common free-floating section. Depth of field per objective (approximate, dry objectives): 4× ≈ 60 µm, 10× ≈ 8 µm, 40× ≈ 1–2 µm.</p></section>
      <section><h3>Cells</h3><p>Cell numbers come from soma packing: pyramidal somata ≈ 15 µm in a 3–5-deep layer, granule somata ≈ 10 µm. Interneurons make up about 11 % of CA1 neurons, and their types follow Bezaire &amp; Soltesz (2013) in simplified form (PV basket and axo-axonic cells near the pyramidal layer, SST O-LM cells in oriens with axons in lacunosum-moleculare). Astrocytes tile with little overlap, about 45–60 µm apart (Bushong et al. 2002).</p>
        <p><b>Real:</b> every Golgi-stained neuron is one of the guide’s reconstructions (CA1 pyramidal, dentate granule and interneurons from the cell atlas), oriented as in the hippocampus. <b>Drawn:</b> somata, astrocyte outlines, boutons, myelin and pathology are drawn from the rules above, not photographed.</p></section>
      <section><h3>Alzheimer’s overlay</h3><p>Plaques are placed mostly in stratum lacunosum-moleculare and the outer dentate molecular layer, where the entorhinal (perforant-path) axons end, the terminal zones where amyloid accumulates. Tangles appear in CA1 pyramidal cells, which in Braak staging are affected after the entorhinal cortex. Late AD also removes about 60 % of the CA1 pyramidal cells here; stereological counts in Alzheimer’s disease found large CA1 losses, about two thirds of the neurons (West et al. 1994), far more than in normal ageing.</p></section>
    </div></details></section>` + smallPrint();
  typeset();
  hsInit();
}

function hsInit() {
  const cv = $('hsCv'), S = { stain: 'nissl', obj: 0, f: 20, ad: 0, seed: 11, cx: HS_W / 2, cy: 225, ch: { dapi: 1, neun: 0, pv: 1, sst: 1, gfap: 0 }, quiz: null };
  let slide = hsBuild(S.seed, 0), view = null;
  const TXT = { nissl: 'Cresyl violet stains every cell body. At 4× the layers jump out: the thin dark band of CA1 pyramidal cells and the C-shaped, even denser granule cell layer. Dendrite-rich layers look empty.',
    golgi: 'Silver chromate fills a few percent of cells completely and leaves the rest invisible. The black neurons are the guide’s real reconstructions placed in their layers.',
    if: 'Antibodies mark cell types. PV basket cells sit at the edge of the pyramidal layer and wrap pyramidal somata in boutons; SST O-LM cells sit in oriens and send their axons to lacunosum-moleculare.',
    myelin: 'Myelin stains show fibre tracts: the alveus (CA1 output) is darkest; radiatum and the mossy-fibre hilus are pale because those axons are thin or unmyelinated.' };
  const AD = ['Healthy adult tissue.', 'Early AD (about Braak III): scattered plaques in the perforant-path terminal zones, a few tangle-bearing CA1 pyramidal cells.', 'Late AD (Braak V–VI): many plaques, tangles in about a third of the remaining CA1 cells and about 60 % of CA1 pyramidal cells lost (watch the Nissl band thin).'];
  const fit = () => { const [mag, fw] = HS_OBJ[S.obj], w = cv.clientWidth, h = cv.clientHeight; const sc = mag === 4 ? Math.min(w / HS_W, h / HS_H) : w / fw;
    const hw = w / sc / 2, hh = h / sc / 2; S.cx = Math.max(hw, Math.min(HS_W - hw, S.cx)); S.cy = Math.max(Math.min(hh, HS_H / 2), Math.min(Math.max(HS_H - hh, HS_H / 2), S.cy)); if (mag === 4) { S.cx = HS_W / 2; S.cy = HS_H / 2; }
    return { sc, ox: w / 2 - S.cx * sc, oy: h / 2 - S.cy * sc, w, h }; };
  const blurOf = z => { const dof = HS_OBJ[S.obj][2], d = Math.max(0, Math.abs(z - S.f) - dof / 2); return Math.min(8, d * (S.obj === 2 ? 0.6 : S.obj === 1 ? 0.18 : 0)); };
  const draw = () => {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); const V = view = fit(), X = u => V.ox + u * V.sc, Y = v => V.oy + v * V.sc, sc = V.sc, fl = S.stain === 'if';
    const bg = { nissl: '#f6f0f4', golgi: '#e9c98a', if: '#05060a', myelin: '#f3ece2' }[S.stain]; x.fillStyle = bg; x.fillRect(0, 0, w, h);
    // tissue edge outside the section (above alveus / below hilus)
    x.fillStyle = fl ? '#000' : '#fbfaf8'; if (Y(0) > 0) x.fillRect(0, 0, w, Y(0)); if (Y(HS_H) < h) x.fillRect(0, Y(HS_H), w, h - Y(HS_H));
    const bins = [0, 1, 2, 3, 4].map(b => ({ z0: b * HS_T / 5, z1: (b + 1) * HS_T / 5 }));
    const inView = (u, v, m) => X(u) > -m && X(u) < w + m && Y(v) > -m && Y(v) < h + m;
    const withBlur = (zc, fn) => { const b = blurOf(zc); x.save(); if (b > 0.3) x.filter = `blur(${b.toFixed(1)}px)`; fn(); x.restore(); };
    const layerBand = (k, col) => { const L = HS_LY(k); x.fillStyle = col; x.fillRect(0, Y(L[2]), w, (L[3] - L[2]) * sc); };
    if (S.stain === 'nissl') {
      layerBand('alv', 'rgba(150,120,170,.10)'); layerBand('fis', 'rgba(120,60,90,.18)');
      bins.forEach(B => withBlur((B.z0 + B.z1) / 2, () => slide.cells.forEach(c => { if (c.z < B.z0 || c.z >= B.z1 || !inView(c.x, c.y, 20)) return;
        const r = Math.max(0.6, c.r * sc), col = c.kind === 'glia' ? 'rgba(70,40,110,.75)' : c.kind === 'gc' ? 'rgba(90,40,130,.82)' : 'rgba(110,50,150,.72)';
        x.fillStyle = col; x.beginPath(); if (c.kind === 'pyr' && r > 3) { x.save(); x.translate(X(c.x), Y(c.y)); x.rotate(c.ang); x.moveTo(0, -r * 1.5); x.quadraticCurveTo(r * 1.1, 0, 0, r); x.quadraticCurveTo(-r * 1.1, 0, 0, -r * 1.5); x.restore(); } else x.ellipse(X(c.x), Y(c.y), r, r * (c.kind === 'glia' ? 0.8 : 1), c.ang, 0, 7); x.fill();
        if (r > 4 && c.kind !== 'glia') { x.fillStyle = 'rgba(245,235,250,.55)'; x.beginPath(); x.arc(X(c.x), Y(c.y) + r * 0.1, r * 0.45, 0, 7); x.fill(); x.fillStyle = 'rgba(60,20,90,.9)'; x.beginPath(); x.arc(X(c.x), Y(c.y) + r * 0.1, Math.max(0.8, r * 0.13), 0, 7); x.fill(); }
        if (c.tangle && r > 2) { x.strokeStyle = 'rgba(40,10,40,.9)'; x.lineWidth = Math.max(0.6, r * 0.15); x.beginPath(); x.moveTo(X(c.x), Y(c.y) - r * 0.6); x.lineTo(X(c.x), Y(c.y) + r * 2.4); x.stroke(); } })));
    }
    if (S.stain === 'myelin') {
      const g = x.createLinearGradient(0, Y(0), 0, Y(HS_H)); const st = [[0, .9], [40, .85], [45, .35], [190, .25], [250, .12], [600, .1], [640, .3], [760, .35], [772, .2], [890, .28], [1010, .12], [1085, .08], [1350, .1]];
      st.forEach(([d, a]) => g.addColorStop(d / HS_H, `rgba(60,30,10,${a})`)); x.fillStyle = g; x.fillRect(0, Y(0), w, HS_H * sc);
      const R = mulberry(5); x.strokeStyle = 'rgba(40,20,5,.55)'; x.lineWidth = Math.max(0.5, 0.8 * sc);
      for (let i = 0; i < 260; i++) { const k = R() < 0.45 ? 'alv' : R() < 0.5 ? 'so' : R() < 0.6 ? 'slm' : 'ml', L = HS_LY(k), y0 = L[2] + R() * (L[3] - L[2]), x0 = R() * HS_W, len = 80 + R() * 220, a = k === 'alv' ? R() * 0.1 - 0.05 : R() * 0.6 - 0.3;
        if (!inView(x0, y0, len * sc)) continue; x.beginPath(); x.moveTo(X(x0), Y(y0)); x.quadraticCurveTo(X(x0 + len / 2), Y(y0 + Math.sin(a) * len / 2 + (R() - 0.5) * 20), X(x0 + len * Math.cos(a)), Y(y0 + len * Math.sin(a))); x.stroke(); }
    }
    if (S.stain === 'golgi') {
      x.fillStyle = 'rgba(120,80,20,.08)'; const R = mulberry(3); for (let i = 0; i < 900; i++) { const u = R() * HS_W, v = R() * HS_H; if (inView(u, v, 4)) x.fillRect(X(u), Y(v), 1.5, 1.5); }
      slide.golgiAstro.forEach(a => { if (!inView(a.x, a.y, 40 * sc)) return; withBlur(a.z, () => { x.strokeStyle = 'rgba(30,15,5,.85)'; x.lineWidth = Math.max(0.5, 1.2 * sc); a.arms.forEach(([t, l]) => { x.beginPath(); x.moveTo(X(a.x), Y(a.y)); x.lineTo(X(a.x + Math.cos(t) * l), Y(a.y + Math.sin(t) * l)); x.stroke(); }); x.fillStyle = '#1a0d04'; x.beginPath(); x.arc(X(a.x), Y(a.y), Math.max(1, 3 * sc), 0, 7); x.fill(); }); });
      slide.golgi.forEach(G => { const M = hsMorph(G.k, G.m); if (!M) return; const c = G.c, cr = Math.cos(G.rot), sr = Math.sin(G.rot), fx = G.flip ? -1 : 1;
        withBlur(c.z, () => { x.strokeStyle = 'rgba(15,8,2,.92)'; x.lineCap = 'round';
          M.secs.forEach(s => { if (s[0] === 2) return; const p = s[1]; x.lineWidth = Math.max(0.45, Math.min(3, (s[2][0] || 0.6) * sc * 1.6)); x.beginPath();
            for (let j = 0; j < p.length; j += 3) { const u = p[j] * fx, v = p[j + 1], uu = c.x + u * cr - v * sr, vv = c.y + u * sr + v * cr; j ? x.lineTo(X(uu), Y(vv)) : x.moveTo(X(uu), Y(vv)); } x.stroke(); });
          x.fillStyle = '#0d0601'; x.beginPath(); x.arc(X(c.x), Y(c.y), Math.max(1.2, c.r * sc), 0, 7); x.fill(); }); });
    }
    if (fl) {
      const on = S.ch, add = (col, a) => { x.fillStyle = col; x.globalAlpha = a; };
      x.globalCompositeOperation = 'lighter';
      if (on.sst) { add('#ffd84a', 0.10); const L = HS_LY('slm'); x.fillRect(0, Y(L[2] + 20), w, (L[3] - L[2] - 30) * sc); const M = HS_LY('ml'); x.globalAlpha = 0.07; x.fillRect(0, Y(M[2]), w, (M[3] - M[2]) * 0.33 * sc); }
      if (on.pv) { add('#ff4fa3', 0.13); const L = HS_LY('sp'); x.fillRect(0, Y(L[2] - 8), w, (L[3] - L[2] + 16) * sc); const G = HS_LY('gcl'); x.globalAlpha = 0.09; x.fillRect(0, Y(G[2] - 6), w, (G[3] - G[2] + 12) * sc); }
      x.globalAlpha = 1;
      bins.forEach(B => withBlur((B.z0 + B.z1) / 2, () => slide.cells.forEach(c => { if (c.z < B.z0 || c.z >= B.z1 || !inView(c.x, c.y, 20)) return; const r = Math.max(0.7, c.r * sc), neuron = c.kind !== 'glia';
        const dot = (col, rr, a) => { x.globalAlpha = a; x.fillStyle = col; x.beginPath(); x.arc(X(c.x), Y(c.y), rr, 0, 7); x.fill(); };
        if (on.dapi) dot('#5b8cff', Math.max(0.6, r * 0.55), 0.85);
        if (on.neun && neuron) dot('#3ddc84', r * 0.85, 0.55);
        if (on.pv && c.sub === 'pv') { dot('#ff4fa3', r * 1.05, 0.95); }
        if (on.sst && c.sub === 'sst') dot('#ffd84a', r * 1.05, 0.95);
        if (on.pv && c.kind === 'pyr' && r > 3) { x.globalAlpha = 0.7; x.fillStyle = '#ff4fa3'; for (let k = 0; k < 10; k++) { const t = k * 0.63 + c.ang * 3; x.fillRect(X(c.x) + Math.cos(t) * r * 1.15 - 0.8, Y(c.y) + Math.sin(t) * r * 1.15 - 0.8, 1.6, 1.6); } }
        x.globalAlpha = 1; })));
      if (on.gfap) { x.strokeStyle = '#4ee6e6'; slide.astro.forEach(a => { if (!inView(a.x, a.y, 30 * sc)) return; withBlur(a.z, () => { x.globalAlpha = 0.65; x.lineWidth = Math.max(0.5, 1.1 * sc); a.arms.forEach(([t, l]) => { x.beginPath(); x.moveTo(X(a.x), Y(a.y)); x.quadraticCurveTo(X(a.x + Math.cos(t + 0.3) * l * 0.5), Y(a.y + Math.sin(t + 0.3) * l * 0.5), X(a.x + Math.cos(t) * l), Y(a.y + Math.sin(t) * l)); x.stroke(); }); x.globalAlpha = 1; }); }); }
      x.globalCompositeOperation = 'source-over';
    }
    // Alzheimer's pathology: plaques (Thioflavin-S green in fluorescence, brown in brightfield); tangles fill the soma and proximal apical dendrite (flame shape), which points toward radiatum
    if (S.ad) {
      slide.plaques.forEach(p => { if (!inView(p.x, p.y, p.r * sc + 4)) return; withBlur(p.z, () => { const r = p.r * sc, g = x.createRadialGradient(X(p.x), Y(p.y), 0, X(p.x), Y(p.y), r);
        const c0 = fl ? 'rgba(170,255,120,' : 'rgba(110,60,20,'; g.addColorStop(0, c0 + (p.dense ? '.95)' : '.55)')); g.addColorStop(p.dense ? 0.35 : 0.6, c0 + '.45)'); g.addColorStop(1, c0 + '0)');
        x.fillStyle = g; x.beginPath(); x.arc(X(p.x), Y(p.y), r, 0, 7); x.fill(); }); });
      if (fl) slide.cells.forEach(c => { if (!c.tangle || !inView(c.x, c.y, 20)) return; withBlur(c.z, () => { const r = c.r * sc; x.strokeStyle = 'rgba(170,255,120,.9)'; x.lineWidth = Math.max(0.6, r * 0.2); x.beginPath(); x.moveTo(X(c.x), Y(c.y) - r * 0.5); x.lineTo(X(c.x), Y(c.y) + r * 2.2); x.stroke(); }); });
    }
    // labels and scale bar
    if ($('hsLab').checked) { x.font = `${S.obj ? 12 : 11}px system-ui`; x.textAlign = 'right';
      HS_LAYERS.forEach(L => { const yy = Y((L[2] + L[3]) / 2); if (yy < 8 || yy > h - 4 || (L[3] - L[2]) * sc < 9) return; const t = L[1].replace('Stratum', 'str.').replace('Hippocampal ', ''); const tw = x.measureText(t).width;
        x.fillStyle = fl ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.78)'; x.fillRect(w - tw - 14, yy - 9, tw + 10, 16); x.fillStyle = fl ? '#e8e8f0' : '#3a2a20'; x.fillText(t, w - 9, yy + 3); });
      x.strokeStyle = fl ? 'rgba(255,255,255,.15)' : 'rgba(60,40,30,.12)'; x.setLineDash([3, 5]); HS_LAYERS.forEach(L => { const yy = Y(L[2]); if (yy > 0 && yy < h) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); } }); x.setLineDash([]); x.textAlign = 'left'; }
    if ($('hsScale').checked) { const um = [200, 100, 20][S.obj], L = um * sc; x.fillStyle = fl ? '#fff' : '#141111'; x.fillRect(16, h - 22, L, 4); x.font = '12px system-ui'; x.fillText(`${um} µm`, 16, h - 28); }
    x.font = 'bold 12px system-ui'; x.fillStyle = fl ? '#fff' : '#141111'; x.fillText(`${HS_OBJ[S.obj][0]}× · ${HS_STAINS.find(s => s[0] === S.stain)[1]}${S.ad ? ' · ' + ['', 'early AD', 'late AD'][S.ad] : ''}`, 14, 20);
    info();
  };
  const info = () => {
    const n = k => slide.cells.filter(c => c.kind === k).length, dof = HS_OBJ[S.obj][2];
    $('hsStainTxt').textContent = TXT[S.stain]; $('hsIF').hidden = S.stain !== 'if'; $('hsGolgi').hidden = S.stain !== 'golgi';
    $('hsGolgiTxt').textContent = `${slide.golgi.length} neurons impregnated out of ${slide.cells.filter(c => c.kind !== 'glia').length} in this section (${(100 * slide.golgi.length / slide.cells.filter(c => c.kind !== 'glia').length).toFixed(1)} %), plus ${slide.golgiAstro.length} astrocytes.`;
    $('hsDof').textContent = S.obj === 0 ? 'At 4× the depth of field (≈ 60 µm) is larger than the section: everything is in focus.' : `Depth of field ≈ ${dof} µm in a ${HS_T} µm section: only cells near ${S.f} µm are sharp. Focus up and down to scan through it.`;
    $('hsInfo').innerHTML = `<div class="ux-figh"><b>In this section</b><span class="muted">${HS_W} × ${HS_H} µm field, ${HS_T} µm thick</span></div><div class="hs-counts"><span><b>${n('pyr')}</b> CA1 pyramidal somata</span><span><b>${n('gc')}</b> granule cells</span><span><b>${n('int')}</b> interneurons</span><span><b>${n('mossy')}</b> mossy cells</span><span><b>${n('glia')}</b> glial nuclei</span><span><b>${slide.astro.length}</b> astrocytes</span>${S.ad ? `<span><b>${slide.plaques.length}</b> plaques</span><span><b>${slide.cells.filter(c => c.tangle).length}</b> tangles</span>` : ''}</div>`;
  };
  const layerAt = (px, py) => { if (!view) return null; const u = (px - view.ox) / view.sc, v = (py - view.oy) / view.sc; return { u, v, L: HS_LAYERS.find(l => v >= l[2] && v < l[3]) }; };
  const near = (u, v) => { let best = null, bd = 1e9; slide.cells.forEach(c => { if (c.kind === 'glia') return; const d = (c.x - u) ** 2 + (c.y - v) ** 2; if (d < bd) { bd = d; best = c; } }); return bd < Math.max(100, (12 / view.sc) ** 2) ? best : null; };
  const CELLTXT = { pyr: 'CA1 pyramidal cell body', gc: 'Dentate granule cell', mossy: 'Hilar mossy cell', int: 'Interneuron' }, SUB = { pv: 'parvalbumin (PV) basket or axo-axonic cell', sst: 'somatostatin (SST) cell: O-LM in oriens, HIPP in the hilus', cck: 'CCK basket cell (PV-negative)', other: 'other interneuron type' };
  const showTip = e => { const r = cv.getBoundingClientRect(), A = layerAt(e.clientX - r.left, e.clientY - r.top), tip = $('hsTip'); if (!A || !A.L || (drag && drag[4])) { tip.hidden = true; return; }
    const c = S.obj ? near(A.u, A.v) : null; tip.hidden = false; tip.style.left = Math.min(r.width - 250, e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
    tip.innerHTML = `<b>${A.L[1]}</b><br>${A.L[4]}${c ? `<hr><b>${CELLTXT[c.kind]}</b>${c.sub ? `: ${SUB[c.sub]}` : ''}${c.tangle ? ' · <b>neurofibrillary tangle</b>' : ''}` : ''}`; };
  cv.addEventListener('mousemove', showTip);
  cv.addEventListener('mouseleave', () => { $('hsTip').hidden = true; });
  let drag = null; cv.onpointerdown = e => { if (S.obj === 0) return; drag = [e.clientX, e.clientY, S.cx, S.cy, false]; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!drag) return; const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; if (Math.abs(dx) + Math.abs(dy) > 4) drag[4] = true; S.cx = drag[2] - dx / view.sc; S.cy = drag[3] - dy / view.sc; draw(); };
  cv.onpointerup = e => { const moved = drag && drag[4]; drag = null; if (!moved && S.quiz && S.obj) quizClick(e); else if (!moved && e.pointerType !== 'mouse') showTip(e); };
  cv.addEventListener('click', e => { if (S.obj === 0 && S.quiz) quizClick(e); });
  // quiz
  const QL = HS_LAYERS.filter(l => l[0] !== 'fis');
  const quizNew = () => { const pool = QL.filter(l => !S.quiz || l[0] !== S.quiz.k); const L = pool[Math.floor(Math.random() * pool.length)]; S.quiz = Object.assign(S.quiz || { right: 0, n: 0 }, { k: L[0] }); $('hsQ').innerHTML = `Click: <b>${L[1]}</b>`; $('hsQs').textContent = `${S.quiz.right} of ${S.quiz.n} right`; };
  const quizClick = e => { const r = cv.getBoundingClientRect(), A = layerAt(e.clientX - r.left, e.clientY - r.top); if (!A || !A.L) return; S.quiz.n++; const ok = A.L[0] === S.quiz.k; if (ok) S.quiz.right++;
    $('hsQ').innerHTML = ok ? `<span class="ux-ok">Right:</span> that is ${A.L[1]}. ` : `<span class="ux-bad">Not quite:</span> you clicked ${A.L[1]}. `; setTimeout(quizNew, 1300); $('hsQs').textContent = `${S.quiz.right} of ${S.quiz.n} right`; };
  $('hsQGo').onclick = () => { S.quiz = null; quizNew(); $('hsQGo').textContent = 'Restart'; cv.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  // controls
  const seg = (attr, fn) => document.querySelectorAll(`[${attr}]`).forEach(b => b.onclick = () => { document.querySelectorAll(`[${attr}]`).forEach(o => o.setAttribute('aria-checked', o === b)); fn(b.getAttribute(attr)); draw(); });
  seg('data-hsst', v => { S.stain = v; });
  seg('data-hsobj', v => { const was = S.obj; S.obj = +v; if (S.obj && !was) { S.cx = HS_W / 2; S.cy = 225; } $('hsHint').textContent = S.obj ? 'Drag to move the slide · hover a cell to identify it' : 'Hover to identify a layer · choose 10× or 40× to see cells'; });
  seg('data-hsad', v => { S.ad = +v; slide = hsBuild(S.seed, S.ad); $('hsAdTxt').textContent = AD[S.ad]; });
  document.querySelectorAll('[data-hsch]').forEach(c => c.onchange = () => { S.ch[c.dataset.hsch] = c.checked ? 1 : 0; draw(); });
  $('hsF').oninput = () => { S.f = +$('hsF').value; $('hsFo').textContent = S.f; draw(); };
  $('hsRestain').onclick = () => { S.seed += 7; slide = hsBuild(S.seed, S.ad); draw(); };
  $('hsLab').onchange = $('hsScale').onchange = draw;
  $('hsSnap').onclick = () => ngSnap(['hsCv'], `${HS_OBJ[S.obj][0]}× ${HS_STAINS.find(s => s[0] === S.stain)[1]}${S.ad ? ' · AD' : ''}`, 'hsSnaps');
  window.addEventListener('resize', () => { if ($('hsCv') === cv) draw(); });
  draw();
}
window.renderHistology = renderHistology;
/* ngLive: shared real-time player for simulations. A page supplies step(ms) (advance the model by that much simulated
   time) and draw(); the player runs them on animation frames so 1× means 1 ms of model time per 1 ms of wall time.
   Speeds below 1× slow it down for watching spikes; "Max" runs as fast as the computer allows. Stops itself when the
   page's elements leave the DOM. */
const NG_SPEEDS = [[0.02, '0.02×'], [0.05, '0.05×'], [0.1, '0.1×'], [0.25, '¼×'], [0.5, '½×'], [1, '1× real time'], [4, '4×'], [Infinity, 'Max']];
function ngLiveBar(id, def = 1) {
  return `<div class="lv-bar" id="${id}"><button class="lv-play" data-lv="play" aria-label="Pause">❚❚</button><button class="secondary lv-rs" data-lv="restart">⟲ Restart</button>
    <label class="lv-sp">Speed <select data-lv="speed">${NG_SPEEDS.map(([v, l]) => `<option value="${v}" ${v === def ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <span class="lv-st" data-lv="st"></span></div>`;
}
function ngLive(o) {
  const bar = document.getElementById(o.bar), q = k => bar.querySelector(`[data-lv="${k}"]`);
  const L = { running: false, speed: +q('speed').value, t: 0, achieved: 0, frameDraw: 0 };
  let last = 0, raf = 0, simAcc = 0, wallAcc = 0;
  const label = () => { q('play').textContent = L.running ? '❚❚' : '▶'; q('play').setAttribute('aria-label', L.running ? 'Pause' : 'Play'); };
  function frame(now) {
    if (!document.body.contains(bar)) { L.running = false; return; }
    if (!L.running) return;
    const wall = Math.min(now - last, 60); last = now;
    let want = L.speed === Infinity ? 1e9 : wall * L.speed, done = 0; const t0 = performance.now(), budget = o.budget || 14;
    while (done < want && performance.now() - t0 < budget) { const h = Math.min(o.chunk || 0.5, want - done); o.step(h); done += h; L.t += h; if (o.stopAt && L.t >= o.stopAt) { L.running = false; break; } }
    simAcc += done; wallAcc += wall;
    if (wallAcc > 400) { L.achieved = simAcc / wallAcc; simAcc = 0; wallAcc = 0; }
    o.draw(); status();
    if (L.running) raf = requestAnimationFrame(frame); else label();
  }
  function status() {
    const st = q('st'); if (!st) return; const lim = L.speed !== Infinity && L.achieved && L.achieved < 0.85 * L.speed;
    st.innerHTML = `t = ${(L.t / 1000).toFixed(2)} s · ${L.achieved ? (L.achieved >= 10 ? L.achieved.toFixed(0) : L.achieved.toFixed(2)) + '× real time' : ''}${lim ? ' <span class="lv-lim">(computer limit)</span>' : ''}`;
  }
  L.play = () => { if (L.running) return; L.running = true; last = performance.now(); label(); raf = requestAnimationFrame(frame); };
  L.pause = () => { L.running = false; cancelAnimationFrame(raf); label(); status(); };
  L.restart = () => { L.t = 0; L.achieved = 0; if (o.reset) o.reset(); o.draw(); status(); L.play(); };
  q('play').onclick = () => L.running ? L.pause() : L.play();
  q('restart').onclick = L.restart;
  q('speed').onchange = e => { L.speed = +e.target.value; simAcc = wallAcc = 0; L.achieved = 0; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && L.running) { L.pause(); L._auto = true; } else if (!document.hidden && L._auto) { L._auto = false; L.play(); } });
  return L;
}
/* Circular buffer of samples for scrolling plots; arr(k) returns the samples oldest-first. */
function ngRing(cap, keys) {
  const R = { n: 0, head: 0, cap, keys }; keys.forEach(k => R['_' + k] = new Float64Array(cap));
  R.push = vals => { keys.forEach((k, j) => R['_' + k][R.head] = vals[j]); R.head = (R.head + 1) % cap; if (R.n < cap) R.n++; };
  R.clear = () => { R.n = 0; R.head = 0; };
  R.arr = k => { const src = R['_' + k], out = new Float64Array(R.n), st = (R.head - R.n + cap) % cap; for (let i = 0; i < R.n; i++) out[i] = src[(st + i) % cap]; return out; };
  return R;
}
Object.assign(window, { ngLive, ngLiveBar, ngRing, NG_SPEEDS });
/* Golomb, Yue & Yaari 2006 (J Neurophysiol 96:1912, doi:10.1152/jn.00205.2006): one-compartment CA1 pyramidal cell
   with I_NaT, I_NaP, I_Kdr, I_A, I_M (and, in normal [Ca²⁺]o, I_Ca, I_C (BK-like), I_AHP).
   Equations and parameter values follow the authors' XPPAUT files on ModelDB 66268 (zca.ode = Fig. 6Da, nca.ode = Fig. 8Aa).
   Units: mV, ms, mS/cm², µA/cm², µF/cm². Pure functions so the same code runs in the page and in the Node check. */
const GY_BASE = { Cm: 1, VNa: 55, VK: -90, VL: -70, VCa: 120, gNa: 35, gKdr: 6, gL: 0.05, gA: 1.4, gNaP: 0.3, gZ: 1, Iapp: 0.661914,
  thetam: -30, sigmam: 9.5, thetah: -45, sigmah: -7, thetan: -35, sigman: 10, thetap: -47, sigmap: 3, thetaa: -50, sigmaa: 20, thetab: -80, sigmab: -6, tauB: 15,
  thetaz: -39, sigmaz: 5, tauZ: 75, phi: 10, ca: 0, gCa: 0.08, gKCa: 10, gKAHP: 5, thetar: -20, sigmar: 10, tauR: 1, thetac: -30, sigmac: 7, tauKc: 2,
  aq: 2, ac: 6, tauq: 450, tauCa: 13, uuCa: 0.13 };
/* The two published parameter sets */
const GY_SETS = {
  zca: ['Zero [Ca²⁺]ₒ · Fig. 6Da', { ca: 0, gNaP: 0.3, thetap: -47, Iapp: 0.661914 }],
  nca: ['Normal [Ca²⁺]ₒ · Fig. 8Aa', { ca: 1, gNaP: 0.2, thetap: -41, Iapp: 1.0 }] };
const gyG = (v, th, s) => 1 / (1 + Math.exp(-(v - th) / s));
/* state y = [V, h, n, b, z, r, c, q, Ca] */
function gyCurrents(P, y) {
  const [V, h, n, b, z, r, c, q, Ca] = y, m = gyG(V, P.thetam, P.sigmam);
  const I = { NaT: P.gNa * m * m * m * h * (V - P.VNa), NaP: P.gNaP * gyG(V, P.thetap, P.sigmap) * (V - P.VNa), Kdr: P.gKdr * n ** 4 * (V - P.VK),
    A: P.gA * gyG(V, P.thetaa, P.sigmaa) ** 3 * b * (V - P.VK), M: P.gZ * z * (V - P.VK), L: P.gL * (V - P.VL), Ca: 0, C: 0, AHP: 0 };
  if (P.ca) { const ca = Math.max(Ca, 1e-9); I.Ca = P.gCa * r * r * (V - P.VCa); I.C = P.gKCa * (1 / (1 + P.ac / ca)) * c * (V - P.VK); I.AHP = P.gKAHP * q * (V - P.VK); }
  return I;
}
function gyDeriv(P, y, Iapp, out) {
  const [V, h, n, b, z, r, c, q, Ca] = y, I = gyCurrents(P, y);
  out[0] = (-I.L - I.NaT - I.NaP - I.Kdr - I.A - I.M - I.Ca - I.C - I.AHP + Iapp) / P.Cm;
  out[1] = P.phi * (gyG(V, P.thetah, P.sigmah) - h) / (1 + 7.5 * gyG(V, -40.5, -6));
  out[2] = P.phi * (gyG(V, P.thetan, P.sigman) - n) / (1 + 5 * gyG(V, -27, -15));
  out[3] = (gyG(V, P.thetab, P.sigmab) - b) / P.tauB;
  out[4] = P.frozenZ ? 0 : (gyG(V, P.thetaz, P.sigmaz) - z) / P.tauZ;
  if (P.ca) { const ca = Math.max(Ca, 1e-9);
    out[5] = (gyG(V, P.thetar, P.sigmar) - r) / P.tauR; out[6] = (gyG(V, P.thetac, P.sigmac) - c) / P.tauKc;
    out[7] = (1 / (1 + (P.aq / ca) ** 4) - q) / P.tauq; out[8] = -P.uuCa * I.Ca - Ca / P.tauCa; }
  else out[5] = out[6] = out[7] = out[8] = 0;
  return out;
}
/* Initial conditions as in the .ode files */
const gyInit = P => P.ca ? [-71.962, 0.979199, 0.0242166, 0.207565, 0.0013689, 0.005507, 0.002486, 0, 0.000787] : [-71.81327, 0.98786, 0.02457, 0.203517, 0.00141, 0, 0, 0, 0];
/* Fixed-step RK4 (the authors used RK with dt 0.05 ms). stim(t) returns the applied current in µA/cm². */
function gySim(P, T, dt = 0.025, stim = null, y0 = null, every = 4) {
  const y = (y0 || gyInit(P)).slice(), N = y.length, k1 = new Array(N), k2 = new Array(N), k3 = new Array(N), k4 = new Array(N), tmp = new Array(N);
  const steps = Math.round(T / dt), out = { t: [], V: [], z: [], q: [], Ca: [], spikes: [], y: null };
  let armed = y[0] < -30;
  for (let s = 0; s <= steps; s++) {
    const t = s * dt;
    if (s % every === 0) { out.t.push(t); out.V.push(y[0]); out.z.push(y[4]); out.q.push(y[7]); out.Ca.push(y[8]); }
    if (s === steps) break;
    const I0 = stim ? stim(t) : P.Iapp, Ih = stim ? stim(t + dt / 2) : I0, I1 = stim ? stim(t + dt) : I0;
    gyDeriv(P, y, I0, k1); for (let i = 0; i < N; i++) tmp[i] = y[i] + dt / 2 * k1[i];
    gyDeriv(P, tmp, Ih, k2); for (let i = 0; i < N; i++) tmp[i] = y[i] + dt / 2 * k2[i];
    gyDeriv(P, tmp, Ih, k3); for (let i = 0; i < N; i++) tmp[i] = y[i] + dt * k3[i];
    gyDeriv(P, tmp, I1, k4); for (let i = 0; i < N; i++) y[i] += dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    if (armed && y[0] >= -10) { out.spikes.push(t + dt); armed = false; } else if (!armed && y[0] < -30) armed = true;   // spike = crosses −10 mV after repolarising below −30 mV
  }
  out.y = y; return out;
}
/* Classify a spike train (after a transient): silent, tonic, or bursting; bursts split at ISIs > max(3× median ISI, 25 ms). */
function gyClassify(sp, t0, T) {
  const s = sp.filter(t => t >= t0), dur = (T - t0) / 1000;
  if (s.length < 2) return { kind: s.length ? 'single spike' : 'silent', n: s.length, rate: s.length / dur, bursts: [] };
  const isi = s.slice(1).map((t, i) => t - s[i]), med = isi.slice().sort((a, b) => a - b)[isi.length >> 1], cut = Math.max(3 * med, 25);
  const bursts = [[s[0]]]; isi.forEach((d, i) => d > cut ? bursts.push([s[i + 1]]) : bursts[bursts.length - 1].push(s[i + 1]));
  const multi = bursts.filter(b => b.length > 1), ibi = bursts.slice(1).map((b, i) => b[0] - bursts[i][0]);
  const isBurst = bursts.length >= 2 && multi.length >= bursts.length * 0.6 && isi.some(d => d > cut);
  const spb = bursts.reduce((a, b) => a + b.length, 0) / bursts.length;
  const intra = multi.length ? 1000 / (multi.flatMap(b => b.slice(1).map((t, i) => t - b[i])).reduce((a, b) => a + b, 0) / multi.reduce((a, b) => a + b.length - 1, 0)) : 0;
  return { kind: isBurst ? 'bursting' : 'tonic', n: s.length, rate: s.length / dur, bursts, spb, intra, ibi: ibi.length ? ibi.reduce((a, b) => a + b, 0) / ibi.length : 0 };
}
/* Fast subsystem with z frozen (fast–slow analysis, zero-Ca model): steady states. Setting every fast gate to its
   steady state, dV/dt = 0 gives z as an explicit function of V: z(V) = (I − I_L − I_NaT∞ − I_NaP − I_Kdr∞ − I_A∞) / (g_M (V − V_K)). */
function gyZofV(P, V, Iapp) {
  const m = gyG(V, P.thetam, P.sigmam), h = gyG(V, P.thetah, P.sigmah), n = gyG(V, P.thetan, P.sigman), b = gyG(V, P.thetab, P.sigmab), a = gyG(V, P.thetaa, P.sigmaa);
  const Iion = P.gL * (V - P.VL) + P.gNa * m ** 3 * h * (V - P.VNa) + P.gNaP * gyG(V, P.thetap, P.sigmap) * (V - P.VNa) + P.gKdr * n ** 4 * (V - P.VK) + P.gA * a ** 3 * b * (V - P.VK);
  return P.gZ > 0 ? (Iapp - Iion) / (P.gZ * (V - P.VK)) : NaN;
}
/* Stability of a fast-subsystem equilibrium: eigenvalues of the 4×4 Jacobian (V, h, n, b) by finite differences;
   returns the largest real part (characteristic polynomial roots via the companion matrix QR iteration would be overkill:
   we use the Routh–Hurwitz conditions for a quartic). */
function gyFastStable(P, V, z, Iapp) {
  const y = [V, gyG(V, P.thetah, P.sigmah), gyG(V, P.thetan, P.sigman), gyG(V, P.thetab, P.sigmab), z, 0, 0, 0, 0];
  const Q = Object.assign({}, P, { ca: 0, frozenZ: 1 }), f0 = gyDeriv(Q, y, Iapp, new Array(9)), J = [];
  for (let j = 0; j < 4; j++) { const e = j === 0 ? 1e-4 : 1e-6, yy = y.slice(); yy[j] += e; const f = gyDeriv(Q, yy, Iapp, new Array(9)); J.push([0, 1, 2, 3].map(i => (f[i] - f0[i]) / e)); }
  const A = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => J[j][i]));   // A[i][j] = ∂f_i/∂y_j
  // characteristic polynomial λ⁴ + c1λ³ + c2λ² + c3λ + c4 via Faddeev–LeVerrier
  const mul = (X, Y) => X.map((r, i) => Y[0].map((_, j) => r.reduce((s, _, k) => s + X[i][k] * Y[k][j], 0)));
  const I4 = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => +(i === j)));
  let M = I4, c = [1];
  for (let k = 1; k <= 4; k++) { const AM = mul(A, M), ck = -AM.reduce((s, r, i) => s + r[i], 0) / k; c.push(ck); M = AM.map((r, i) => r.map((v, j) => v + (i === j ? ck : 0))); }
  const [, a1, a2, a3, a4] = c;   // Routh–Hurwitz for a quartic
  return a1 > 0 && a3 > 0 && a4 > 0 && a1 * a2 * a3 > a3 * a3 + a1 * a1 * a4;
}
/* Fast subsystem with z frozen: the tonic-spiking branch (max/min V of the limit cycle) by simulation from a depolarised start. */
function gyFastCycle(P, z, Iapp) {
  const Q = Object.assign({}, P, { ca: 0, frozenZ: 1, Iapp }), y0 = [-50, 0.4, 0.3, 0.1, z, 0, 0, 0, 0];
  const r = gySim(Q, 400, 0.025, null, y0, 2);
  const tail = r.V.slice(r.V.length >> 1), sp = r.spikes.filter(t => t > 200);
  if (sp.length < 2) return null;
  return { max: Math.max(...tail), min: Math.min(...tail), f: 1000 * (sp.length - 1) / (sp[sp.length - 1] - sp[0]) };
}
/* Page: /biology/ca1-bursting/ — Golomb, Yue & Yaari 2006, I_NaP and I_M in CA1 somatic bursting (textbook layout). */
const GY_CTRL = [   // key, label, unit, min, max, step, which model ('all' | 'ca')
  ['Iapp', 'Applied current I<sub>app</sub>', 'µA/cm²', -1, 4, 0.01, 'all'],
  ['gNaP', 'Persistent Na⁺ g<sub>NaP</sub>', 'mS/cm²', 0, 0.8, 0.01, 'all'],
  ['gZ', 'M-type K⁺ g<sub>M</sub>', 'mS/cm²', 0, 3, 0.05, 'all'],
  ['thetap', 'I<sub>NaP</sub> half-activation θ<sub>p</sub>', 'mV', -55, -35, 0.5, 'all'],
  ['tauZ', 'I<sub>M</sub> time constant τ<sub>z</sub>', 'ms', 20, 200, 5, 'all'],
  ['gA', 'A-type K⁺ g<sub>A</sub>', 'mS/cm²', 0, 5, 0.1, 'all'],
  ['gKdr', 'Delayed-rectifier K⁺ g<sub>Kdr</sub>', 'mS/cm²', 2, 15, 0.5, 'all'],
  ['gKAHP', 'Slow AHP K⁺ g<sub>AHP</sub>', 'mS/cm²', 0, 10, 0.25, 'ca'],
  ['gKCa', 'Fast Ca²⁺-activated K⁺ g<sub>C</sub>', 'mS/cm²', 0, 20, 0.5, 'ca'],
  ['gCa', 'Ca²⁺ conductance g<sub>Ca</sub>', 'mS/cm²', 0, 0.3, 0.01, 'ca']];
const GY_EXP = [
  ['pub', 'Published set', 'The exact parameters of the figure, from the authors’ code.', P => P],
  ['halfM', 'Half-block I_M', 'Halving g_M (as a partial block by XE991 or linopirdine would) weakens the slow brake: bursts get longer and, in the zero-Ca²⁺ set, firing turns tonic.', P => Object.assign(P, { gZ: P.gZ * 0.5 })],
  ['xe991', 'Remove I_M', 'With g_M = 0 the model has no slow variable at all. Nothing terminates firing, so the zero-Ca²⁺ cell depolarises and stays stuck near −30 mV (depolarisation block); the normal-Ca²⁺ cell fires tonically faster.', P => Object.assign(P, { gZ: 0 })],
  ['riluzole', 'Reduce I_NaP (riluzole)', 'Low-dose riluzole or TTX reduces the persistent Na⁺ current more than the transient one. Bursts lose spikes or stop.', P => Object.assign(P, { gNaP: P.gNaP * 0.33 })],
  ['lowca', 'Lower [Ca²⁺]ₒ (θ_p → −47 mV)', 'Lowering extracellular Ca²⁺ reduces the screening of membrane surface charge, so Na⁺ channels activate at more negative voltages. The model represents this by shifting θ_p from −41 to −47 mV (the zero-Ca²⁺ value). The tonic cell starts firing doublets: low Ca²⁺ makes CA1 cells bursty, as in the slice experiments.', P => Object.assign(P, { thetap: -47 })],
  ['strongI', 'Stronger drive (I_app × 2)', 'More current: the silent phases shorten and, at high enough drive, firing becomes tonic.', P => Object.assign(P, { Iapp: P.Iapp * 2 })]];

function gyCanvas(cv) { const W = cv.clientWidth, H = cv.clientHeight, dpr = devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.font = '12px system-ui'; x.clearRect(0, 0, W, H); return [x, W, H]; }
/* axes: box {L,R,T,B}, ranges, tick lists, labels. Returns mappers. */
function gyAxes(x, W, H, o) {
  const L = o.L || 52, R = W - (o.R || 12), T = o.T || 12, B = H - (o.B || 34);
  const X = v => L + (R - L) * (v - o.x0) / (o.x1 - o.x0), Y = v => B - (B - T) * (v - o.y0) / (o.y1 - o.y0);
  x.strokeStyle = '#efe4d7'; x.lineWidth = 1; x.fillStyle = '#6f4c27'; x.textAlign = 'right';
  (o.yt || []).forEach(v => { x.beginPath(); x.moveTo(L, Y(v)); x.lineTo(R, Y(v)); x.stroke(); x.fillText(v, L - 6, Y(v) + 4); });
  x.textAlign = 'center'; (o.xt || []).forEach(v => { x.fillText(v, X(v), B + 15); });
  x.strokeStyle = '#6f4c27'; x.beginPath(); x.moveTo(L, T); x.lineTo(L, B); x.lineTo(R, B); x.stroke();
  x.fillStyle = '#3a2a1c'; if (o.xl) x.fillText(o.xl, (L + R) / 2, H - 4);
  if (o.yl) { x.save(); x.translate(12, (T + B) / 2); x.rotate(-Math.PI / 2); x.fillText(o.yl, 0, 0); x.restore(); }
  const zs = []; if (o.xl) { const w = x.measureText(o.xl).width; zs.push({ t: o.xl, x0: (L + R) / 2 - w / 2 - 4, x1: (L + R) / 2 + w / 2 + 4, y0: H - 18, y1: H }); }
  if (o.yl) { const w = x.measureText(o.yl).width; zs.push({ t: o.yl, x0: 0, x1: 22, y0: (T + B) / 2 - w / 2 - 4, y1: (T + B) / 2 + w / 2 + 4 }); }
  x.canvas._ngAx = (x.canvas._ngAxKeep || []).concat(zs);   // hover targets for the glossary (glossary.js)
  x.textAlign = 'left'; return { X, Y, L, R, T, B };
}
const gyTicks = (a, b, n = 5) => { const st = Math.pow(10, Math.floor(Math.log10((b - a) / n))), m = [1, 2, 2.5, 5, 10].find(k => (b - a) / (k * st) <= n) * st, out = []; for (let v = Math.ceil(a / m) * m; v <= b + 1e-9; v += m) out.push(+v.toFixed(6)); return out; };

function renderCA1Bursting() {
  document.title = 'CA1 bursting: persistent Na⁺ and M current · Dynamical systems';
  const S = { set: 'zca', exp: 'pub', P: null, T: 2000, last: null, prev: null, map: null };
  const fresh = () => { const P = Object.assign({}, GY_BASE, GY_SETS[S.set][1]); return GY_EXP.find(e => e[0] === S.exp)[3](P); };
  S.P = fresh();
  const sl = ([k, l, u, a, b, st, w]) => `<div class="ux-sl" data-gyw="${w}"><label for="gy-${k}">${l}</label><span class="ux-val"><input class="ux-num" type="number" id="gy-${k}n" min="${a}" max="${b}" step="${st}"><em>${u}</em></span><input type="range" id="gy-${k}" min="${a}" max="${b}" step="${st}"></div>`;
  $('lesson').innerHTML = bioHead('Bursting in CA1 pyramidal cells: persistent Na⁺ and M current', 'MODEL FROM A PAPER · GOLOMB, YUE & YAARI 2006 · ModelDB 66268',
    'CA1 pyramidal cells can fire single spikes or high-frequency bursts. Golomb, Yue and Yaari combined recordings with a one-compartment model to ask which currents make a burst. Their answer: the persistent Na⁺ current helps, but the slow M-type K⁺ current is what switches the cell between firing and silence. Run their model, block channels as in the experiments, and see the burst mechanism in the fast–slow phase plane.')
    + `<nav class="page-jumps"><a href="#gy-goals">Key terms</a><a href="#gy-sim">Simulate</a><a href="#gy-fs">Fast–slow analysis</a><a href="#gy-map">Pattern map</a><a href="#gy-eq">Equations</a><a href="#gy-check">Check yourself</a><a href="#gy-limits">Limits</a><a href="#gy-refs">References</a></nav>
    <section class="lesson-section" id="gy-goals"><p class="eyebrow">Key terms</p><h2>Four ideas this page uses</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Key term</th><th>Meaning here</th></tr></thead><tbody>
        <tr><td><b>I<sub>NaP</sub></b> (persistent Na⁺)</td><td>A small Na⁺ current that activates instantly near −50 mV and does not inactivate. It adds a steady inward push below spike threshold.</td></tr>
        <tr><td><b>I<sub>M</sub></b> (M-type K⁺, Kv7/KCNQ)</td><td>A slowly activating, non-inactivating K⁺ current (τ = 75 ms here). It builds up during firing and decays during silence: the model’s only slow variable, z.</td></tr>
        <tr><td><b>Fast–slow analysis</b></td><td>Freeze the slow variable, find what the fast system does at each value (rest or spike), then let the slow variable move.</td></tr>
        <tr><td><b>Square-wave burst</b></td><td>A burst that starts when rest disappears (a fold, or saddle-node) and ends when the spiking orbit collides with a saddle (homoclinic); rest and spiking coexist in between (bistability).</td></tr></tbody></table></div></section>

    <section class="lesson-section lab" id="gy-sim"><p class="eyebrow">01 · Simulate</p><h2>Run the published model</h2>
      <p class="ux-desc">The model runs live: change any slider or press an experiment button and the cell responds immediately. Slow it down (¼× or 0.05×) to watch each spike and the M-current gate build up during a burst. Start with <b>Zero [Ca²⁺]ₒ</b>, the published set: bursts of about six spikes every ~190 ms. Then press <b>Half-block I_M</b> and watch the bursts turn into regular firing. Switch to <b>Normal [Ca²⁺]ₒ</b> and the same cell fires regularly; press <b>Lower [Ca²⁺]ₒ</b> to make it bursty again.</p>
      <div class="ux-wrap"><div class="ux-s1">
        <div class="ux-bar"><div class="ux-seg" role="radiogroup" aria-label="Model">${Object.entries(GY_SETS).map(([k, [l]]) => `<button role="radio" aria-checked="${k === S.set}" data-gyset="${k}">${l}</button>`).join('')}</div></div>${ngLiveBar('gyLive', 1)}
        <div class="ux-fig"><div class="ux-figh"><b>Figure 1.</b><span id="gyRead" class="ux-status"></span></div>
          <canvas id="gyV" class="ux-cv" style="height:260px" aria-label="Membrane potential against time"></canvas>
          <canvas id="gyZ" class="ux-cv" style="height:120px;margin-top:6px" aria-label="M-current activation z against time"></canvas>
          <p class="ux-note"><b>Figure 1.</b> <b>Top:</b> somatic membrane potential. <b>Bottom:</b> the M-current activation z (the slow variable) and, in normal Ca²⁺, the slow AHP activation q. Each spike adds a little to z; when z is high enough the cell can no longer stay depolarised and the burst stops; z then decays during the silent phase until the cell fires again.</p></div>
      </div><div class="ux-s2"><div class="ux-fig" id="gyExpTxt"></div></div>
      <aside class="ux-panel" aria-label="Model settings"><div class="ux-pane">
        <h4 class="hs-h">Experiments</h4><div class="ux-acts" id="gyExps">${GY_EXP.map(([k, l]) => `<button class="${k === 'pub' ? '' : 'secondary'}" data-gyexp="${k}">${l}</button>`).join('')}</div>
        <h4 class="hs-h">Parameters</h4>${GY_CTRL.map(sl).join('')}
        <p class="ux-note">Click a value to type it; double-click a slider to reset it. Changes re-run the model automatically.</p>
      </div></aside></div></section>

    <section class="lesson-section" id="gy-fs"><p class="eyebrow">02 · Why it bursts</p><h2>The fast–slow phase plane</h2>
      <p>The M-current gate z is about 100× slower than every other variable. So treat z as a fixed parameter and ask what the other four variables (V, h, n, b) do for each value. The answer is the black curve below: for each z, the voltages where the cell can rest (solid where stable, dashed where unstable). Where rest is unstable or absent, the cell spikes: the purple band shows the highest and lowest voltage of that repetitive firing. Now release z. The red trajectory is the full model.</p>
      <div class="ux-fig"><canvas id="gyFS" class="ux-cv" style="height:360px" aria-label="Fast–slow bifurcation diagram: voltage against z"></canvas>
        <p class="ux-note" id="gyFSnote"><b>Figure 2.</b> Fast–slow analysis of the zero-Ca²⁺ model with the current parameters. Black: steady states of the fast subsystem with z frozen (solid stable, dashed unstable). Purple: maximum and minimum V of repetitive spiking with z frozen. Green: the z-nullcline z = z<sub>∞</sub>(V); above it z decays, below it z grows. Red: the full trajectory (last 1.5 s). <b>How a burst works:</b> during silence the cell sits on the lower stable branch and z decays (moves left) until that branch ends at a fold (knee); the cell jumps to spiking. Spiking keeps V mostly above the green curve so z grows (moves right) until the spiking branch ends, and the cell falls back to rest. Rest and spiking coexist over the middle range of z: that bistability is what makes the burst.</p></div>
      <p class="nl-explain"><b>Why weakening I<sub>M</sub> stops bursting in the model.</b> I<sub>M</sub> is the only slow variable: it builds up during firing and ends the burst. Weaken it and the spiking branch reaches further right than z can ever climb, so firing never stops (tonic); remove it and the cell can end up stuck depolarised. <b>Experiments are more nuanced:</b> in CA1 slices, partial M-channel block enhances the spike afterdepolarisation and can <i>promote</i> bursting (Yue &amp; Yaari 2004). A one-compartment model with one fixed parameter set captures one burst mechanism, not every condition. <b>Why I<sub>NaP</sub> is neither necessary nor sufficient</b> (the paper’s conclusion): more I<sub>NaP</sub> induces bursting and adds spikes per burst, but the pattern map below also shows bursts with g<sub>NaP</sub> = 0 at low g<sub>M</sub>, and tonic firing or silence at large g<sub>NaP</sub>. The paper adds that I<sub>M</sub>-driven bursting needs spike-generating kinetics that are fast, but not extremely fast: try φ in Under the hood.</p></section>

    <section class="lesson-section" id="gy-map"><p class="eyebrow">03 · Explore</p><h2>Pattern map: g<sub>NaP</sub> against g<sub>M</sub></h2>
      <p>Each square is a 1.5 s run with the other parameters as set above, classified after a 500 ms transient. Click a square to load those values into the simulator.</p>
      <div class="ux-bar"><button class="ux-run" id="gyMapGo">Compute map</button><span id="gyMapSt" class="ux-status"></span></div>
      <div class="ux-fig"><canvas id="gyMap" class="ux-cv" style="height:340px;cursor:crosshair" aria-label="Firing pattern for combinations of persistent Na and M conductances"></canvas>
        <p class="ux-note"><b>Figure 3.</b> Firing pattern for each pair (g<sub>NaP</sub>, g<sub>M</sub>). Grey: silent (including depolarisation block). Blue: tonic firing. Purple: bursting (darker = more spikes per burst). The ring marks the current values. Read it against the paper’s conclusions: bursting needs enough g<sub>M</sub>; more g<sub>NaP</sub> adds spikes per burst, yet bursting also occurs with g<sub>NaP</sub> = 0 and disappears when g<sub>NaP</sub> is large.</p></div></section>

    <section class="lesson-section" id="gy-eq"><p class="eyebrow">04 · Key equations</p><h2>The model in five lines</h2>
      <p>Current balance for one compartment (units: mV, ms, mS/cm², µA/cm²):</p>
      <p>\\[ C_m\\frac{dV}{dt} = -g_L(V-V_L) - I_{NaT} - I_{NaP} - I_{Kdr} - I_A - I_M\\;[-\\,I_{Ca} - I_C - I_{AHP}] + I_{app} \\]</p>
      <p>\\[ I_{NaT}=g_{Na}\\,m_\\infty^3(V)\\,h\\,(V-V_{Na}),\\quad I_{NaP}=g_{NaP}\\,p_\\infty(V)\\,(V-V_{Na}) \\]</p>
      <p>\\[ I_{Kdr}=g_{Kdr}\\,n^4(V-V_K),\\quad I_A=g_A\\,a_\\infty^3(V)\\,b\\,(V-V_K),\\quad I_M=g_M\\,z\\,(V-V_K) \\]</p>
      <p>\\[ \\frac{dz}{dt}=\\frac{z_\\infty(V)-z}{\\tau_z},\\qquad x_\\infty(V)=\\frac{1}{1+e^{-(V-\\theta_x)/\\sigma_x}} \\]</p>
      <p>Sodium activation and A-type activation are instantaneous; h and n relax with voltage-dependent time constants scaled by φ = 10. In normal Ca²⁺ the model adds a high-threshold Ca²⁺ current, a fast Ca²⁺- and voltage-activated K⁺ current (I<sub>C</sub>, BK-like) and a slow Ca²⁺-activated AHP current (τ<sub>q</sub> = 450 ms), with Ca²⁺ decaying with τ<sub>Ca</sub> = 13 ms.</p>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Gate</th><th>θ (mV)</th><th>σ (mV)</th><th>Time constant</th></tr></thead><tbody>
        <tr><td>m (NaT activation)</td><td>−30</td><td>9.5</td><td>instantaneous</td></tr><tr><td>h (NaT inactivation)</td><td>−45</td><td>−7</td><td>(1 + 7.5 Γ(V, −40.5, −6)) / φ</td></tr>
        <tr><td>p (NaP)</td><td>−47 (zero Ca) / −41 (normal)</td><td>3</td><td>instantaneous</td></tr><tr><td>n (Kdr)</td><td>−35</td><td>10</td><td>(1 + 5 Γ(V, −27, −15)) / φ</td></tr>
        <tr><td>a, b (A-type)</td><td>−50, −80</td><td>20, −6</td><td>instantaneous, 15 ms</td></tr><tr><td>z (M)</td><td>−39</td><td>5</td><td>75 ms</td></tr></tbody></table></div>
      <p class="nl-explain"><b>Worked example: the resting point.</b> With the zero-Ca²⁺ set and no applied current, every gate sits at its steady state and the currents balance near −71.8 mV (the authors’ initial condition). There, p<sub>∞</sub> = 1/(1 + e<sup>(71.8−47)/3</sup>) ≈ 2.6 × 10⁻⁴, so I<sub>NaP</sub> ≈ 0.3 × 2.6 × 10⁻⁴ × (−126.8) ≈ −0.01 µA/cm²: negligible at rest. At −55 mV p<sub>∞</sub> ≈ 0.065, giving about −2 µA/cm², larger than the 0.66 µA/cm² applied current. That steep rise between rest and threshold is what lets I<sub>NaP</sub> amplify depolarisation.</p></section>

    <section class="lesson-section" id="gy-check"><p class="eyebrow">05 · Check yourself</p><h2>Questions</h2>
      ${[['Which variable is slow enough to pace the bursts, and what sets its speed?', 'The M-current gate z, with τ<sub>z</sub> = 75 ms; every other gate is instantaneous or relaxes in a few ms. Try τ<sub>z</sub> = 150 ms: bursts get longer and so do the gaps.'],
        ['Predict, then test: halve g<sub>M</sub> in the zero-Ca²⁺ set. What happens, and why?', 'Firing becomes tonic (about 120 Hz). The weaker M current cannot build up enough during firing to push z past the end of the spiking branch, so the active phase never terminates. Remove it completely and the cell gets stuck depolarised instead.'],
        ['In Figure 2, where does a burst start and where does it end?', 'It starts at the knee (fold) where the lower stable branch of resting states ends: there is nowhere to rest, so the cell spikes. It ends where the spiking branch ends and the trajectory falls back to the lower branch.'],
        ['Why does the model represent low extracellular Ca²⁺ by shifting θ<sub>p</sub>?', 'Ca²⁺ screens negative surface charges on the membrane. Removing it changes the field the channel voltage sensors feel, which shifts Na⁺ activation to more negative voltages. Shifting θ<sub>p</sub> is the simplest way to put that into a one-compartment model.']]
        .map(([q, a], i) => `<details class="uth" style="margin:8px 0"><summary><span>Q${i + 1}</span> ${q}</summary><div style="padding:10px 16px">${a}</div></details>`).join('')}</section>

    <section class="lesson-section" id="gy-limits"><p class="eyebrow">06 · What the model leaves out</p><h2>Limits of a one-compartment model</h2><ul>
      <li><b>No dendrites.</b> Real CA1 bursts often involve dendritic Ca²⁺ spikes and back-propagation. The paper motivates a somatic model experimentally: in low Ca²⁺, bursting persisted after the apical dendrites were cut off. Bursting in intact cells with normal Ca²⁺ needs the dendrites too.</li>
      <li><b>Space-clamped axon.</b> Spikes start in the axon initial segment in real cells; here the spike and I<sub>NaP</sub> share one compartment.</li>
      <li><b>Generic kinetics.</b> Gates use simple sigmoids and the A-type and Na⁺ activations are instantaneous. Spike shapes and rates are qualitative, not fitted to one cell.</li>
      <li><b>Normalised drive.</b> Currents are per unit area (µA/cm²), so “0.66” has no direct pA equivalent without assuming a membrane area.</li>
      <li><b>No noise, no synapses.</b> In vivo, background synaptic input and channel noise change how sharply the cell switches between patterns.</li></ul>
      <p>For a CA1 cell with full morphology and dendritic channels, use the <a href="/biology/neuron-lab/">Neuron studio</a>.</p></section>

    <section class="lesson-section" id="gy-refs"><p class="eyebrow">References</p><h2>Sources</h2><ol class="refs" data-label="Papers">
      <li>Golomb D, Yue C, Yaari Y (2006). Contribution of persistent Na⁺ current and M-type K⁺ current to somatic bursting in CA1 pyramidal cells: combined experimental and modeling study. <i>J Neurophysiol</i> 96:1912–1926. <a href="https://doi.org/10.1152/jn.00205.2006" target="_blank" rel="noopener">doi:10.1152/jn.00205.2006</a></li>
      <li>Yue C, Yaari Y (2004). KCNQ/M channels control spike afterdepolarization and burst generation in hippocampal neurons. <i>J Neurosci</i> 24:4614–4624. <a href="https://doi.org/10.1523/JNEUROSCI.0765-04.2004" target="_blank" rel="noopener">doi:10.1523/JNEUROSCI.0765-04.2004</a></li>
      <li>Izhikevich EM (2000). Neural excitability, spiking and bursting. <i>Int J Bifurcat Chaos</i> 10:1171–1266. <a href="https://doi.org/10.1142/S0218127400000840" target="_blank" rel="noopener">doi:10.1142/S0218127400000840</a></li>
      <li>Rinzel J (1987). A formal classification of bursting mechanisms in excitable systems. In: <i>Mathematical Topics in Population Biology, Morphogenesis and Neurosciences</i>, Lecture Notes in Biomathematics 71:267–281.</li></ol><ol class="refs refs-code" data-label="Code &amp; data"><li>${RS_REPOS.mdb66268}</li><li>${RS_REPOS.lowet}</li></ol></section>

    <section class="lesson-section"><details class="uth" id="gy-uth"><summary><span>Under the hood</span> how this page was checked against the original code</summary><div class="uth-grid">
      <div><h4>Same equations, re-implemented</h4><p>The browser integrates the authors’ XPPAUT equations (zca.ode, nca.ode) with fourth-order Runge–Kutta at Δt = 0.025 ms. An independent Python version of the same equations, integrated with SciPy’s adaptive LSODA solver, gives the same spikes: all 67 spike times in 2 s (zero Ca²⁺) and all 21 (normal Ca²⁺) agree within 0.012 ms.</p></div>
      <div><h4>Matches the published figure</h4><p>Zero Ca²⁺ (Fig. 6Da): bursts of 6 spikes at about 240 Hz within the burst, every ~190 ms, first burst at 34 ms. Normal Ca²⁺ (Fig. 8Aa): a doublet at 32 and 60 ms, then regular firing near 10 Hz. Both match the screenshots that ship with the model.</p></div>
      <div><h4>Fast–slow curves</h4><p>Resting states come from setting every fast gate to steady state, which makes z an explicit function of V. Their stability uses the 4 × 4 Jacobian of (V, h, n, b) and the Routh–Hurwitz test. The spiking branch is found by simulating the fast subsystem for 400 ms at each frozen z.</p></div>
      <div><h4>Spike-kinetics scale φ</h4><div class="ux-sl"><label for="gy-phi">φ (h and n speed)</label><span class="ux-val"><input class="ux-num" type="number" id="gy-phin" min="2" max="30" step="0.5"><em>×</em></span><input type="range" id="gy-phi" min="2" max="30" step="0.5"></div><p class="ux-note">The paper reports that bursting needs spike kinetics that are fast, but not extremely fast. Change φ and re-run.</p></div>
    </div></details></section>`;

  const ctrls = [...GY_CTRL, ['phi', '', '', 2, 30, 0.5, 'all']];
  const syncUI = () => {
    ctrls.forEach(([k]) => { const v = S.P[k]; $('gy-' + k).value = v; $('gy-' + k + 'n').value = +(+v).toFixed(4); });
    document.querySelectorAll('[data-gyw="ca"]').forEach(e => e.hidden = !S.P.ca);
    document.querySelectorAll('[data-gyset]').forEach(b => b.setAttribute('aria-checked', b.dataset.gyset === S.set));
    document.querySelectorAll('[data-gyexp]').forEach(b => { b.className = b.dataset.gyexp === S.exp ? '' : 'secondary'; b.hidden = b.dataset.gyexp === 'lowca' && !S.P.ca; });
    const e = GY_EXP.find(q => q[0] === S.exp); $('gyExpTxt').innerHTML = `<b>${e[1]}.</b> ${e[2]}`;
  };
  let fsDirty = true, fsTimer = null; const later = () => { fsDirty = true; drawMap(); };
  ctrls.forEach(([k, , , a, b]) => {
    const r = $('gy-' + k), n = $('gy-' + k + 'n');
    r.oninput = () => { S.P[k] = +r.value; n.value = r.value; S.exp = 'custom'; markCustom(); later(); };
    n.onchange = () => { const v = Math.min(b, Math.max(a, +n.value)); S.P[k] = v; r.value = v; n.value = v; S.exp = 'custom'; markCustom(); later(); };
    r.ondblclick = () => { const d = Object.assign({}, GY_BASE, GY_SETS[S.set][1])[k]; S.P[k] = d; r.value = d; n.value = d; later(); };
  });
  const markCustom = () => { document.querySelectorAll('[data-gyexp]').forEach(b => b.className = 'secondary'); $('gyExpTxt').innerHTML = '<b>Custom parameters.</b> Press an experiment button to go back to a published or experimental condition.'; };
  document.querySelectorAll('[data-gyset]').forEach(b => b.onclick = () => { S.set = b.dataset.gyset; S.exp = 'pub'; S.P = fresh(); S.map = null; syncUI(); later(); LV.restart(); });
  document.querySelectorAll('[data-gyexp]').forEach(b => b.onclick = () => { S.exp = b.dataset.gyexp; S.P = fresh(); syncUI(); later(); });

  function drawV() {
    const r = S.last; if (!r || !$('gyV')) return;
    let [x, W, H] = gyCanvas($('gyV'));
    let ax = gyAxes(x, W, H, { x0: r.t0, x1: r.t0 + S.T, y0: -90, y1: 40, xt: gyTicks(r.t0, r.t0 + S.T), yt: [-80, -60, -40, -20, 0, 20], xl: 'time (ms)', yl: 'V (mV)' });
    const line = (t, v, col, w, dash) => { x.strokeStyle = col; x.lineWidth = w; x.setLineDash(dash || []); x.beginPath(); t.forEach((tt, i) => i ? x.lineTo(ax.X(tt), ax.Y(v[i])) : x.moveTo(ax.X(tt), ax.Y(v[i]))); x.stroke(); x.setLineDash([]); x.lineWidth = 1; };
    line(r.t, r.V, '#3a2a1c', 1.2);
    [x, W, H] = gyCanvas($('gyZ'));
    const zmax = Math.max(0.05, ...r.z, ...(S.P.ca ? r.q : [0])) * 1.15;
    ax = gyAxes(x, W, H, { x0: r.t0, x1: r.t0 + S.T, y0: 0, y1: zmax, xt: [], yt: gyTicks(0, zmax, 3), yl: 'gate', B: 10 });
    line(r.t, r.z, '#a62962', 1.6); x.fillStyle = '#a62962'; x.fillText('z (M current)', ax.L + 8, ax.T + 12);
    if (S.P.ca) { line(r.t, r.q, '#2f6f9f', 1.4); x.fillStyle = '#2f6f9f'; x.fillText('q (slow AHP)', ax.L + 110, ax.T + 12); }
  }
  function readout() {
    const c = S.last.cls, f = v => v.toFixed(v < 10 ? 1 : 0);
    $('gyRead').innerHTML = c.kind === 'bursting' ? `<b style="color:#a62962">Bursting</b> · ${f(c.spb)} spikes per burst · ${f(c.intra)} Hz within bursts · a burst every ${f(c.ibi)} ms`
      : c.kind === 'tonic' ? `<b style="color:#2f6f9f">Tonic firing</b> · ${f(c.rate)} Hz` : (S.last.vmean > -45 ? `<b>Depolarisation block</b> · no full spikes; V hovers near ${Math.round(S.last.vmean)} mV` : `<b>${c.kind === 'silent' ? 'Silent' : 'Single spike'}</b> in the last ${S.T / 1000} s`);
  }
  function drawFS() {
    const cv = $('gyFS'); if (!cv) return;
    if (S.P.ca) { const [x, W, H] = gyCanvas(cv); x.fillStyle = '#6f4c27'; x.textAlign = 'center'; x.fillText('The fast–slow diagram is drawn for the zero-Ca²⁺ model, which has a single slow variable (z).', W / 2, H / 2 - 8); x.fillText('In normal Ca²⁺, q and [Ca²⁺] are slow too. Switch the model to Zero [Ca²⁺]ₒ to see it.', W / 2, H / 2 + 12); return; }
    const P = S.P, I = P.Iapp, r = S.last; let i0 = r.t.findIndex(t => t >= 300); if (i0 < 0) i0 = r.t.length;
    if (fsDirty || !FS.zTop) { const zr = r.z.slice(i0); FS.zTop = Math.max(0.05, ...(zr.length ? zr : [0.05])) * 1.25; }
    const zTop = FS.zTop;
    const [x, W, H] = gyCanvas(cv), ax = gyAxes(x, W, H, { x0: 0, x1: zTop, y0: -85, y1: 30, xt: gyTicks(0, zTop), yt: [-80, -60, -40, -20, 0, 20], xl: 'z (M-current activation, frozen)', yl: 'V (mV)' });
    x.save(); x.beginPath(); x.rect(ax.L, ax.T, ax.R - ax.L, ax.B - ax.T); x.clip();
    // spiking branch
    if (P.gZ > 0) {
      if (fsDirty || !FS.pts) { FS.pts = []; for (let k = 0; k <= 26; k++) { const z = zTop * k / 26, c = gyFastCycle(P, z, I); if (c) FS.pts.push([z, c.max, c.min]); }
        FS.ss = []; for (let V = -85; V <= 0; V += 0.25) { const z = gyZofV(P, V, I); FS.ss.push([V, z, z >= 0 && gyFastStable(P, V, z, I)]); } fsDirty = false; }
      const pts = FS.pts;
      x.fillStyle = 'rgba(122,74,160,.12)'; x.strokeStyle = '#7a4aa0'; x.lineWidth = 1.6;
      if (pts.length) { x.beginPath(); pts.forEach(([z, mx], i) => i ? x.lineTo(ax.X(z), ax.Y(mx)) : x.moveTo(ax.X(z), ax.Y(mx))); for (let i = pts.length - 1; i >= 0; i--) x.lineTo(ax.X(pts[i][0]), ax.Y(pts[i][2])); x.closePath(); x.fill();
        [1, 2].forEach(j => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(ax.X(p[0]), ax.Y(p[j])) : x.moveTo(ax.X(p[0]), ax.Y(p[j]))); x.stroke(); }); }
      // steady states: z(V)
      let prev = null; x.lineWidth = 2;
      for (const [V, z, st] of FS.ss) {
        const pt = z >= -0.01 && z <= zTop * 1.05 ? [ax.X(z), ax.Y(V), st] : null;
        if (prev && pt) { x.strokeStyle = '#1d140d'; x.setLineDash(prev[2] && pt[2] ? [] : [5, 4]); x.beginPath(); x.moveTo(prev[0], prev[1]); x.lineTo(pt[0], pt[1]); x.stroke(); }
        prev = pt;
      }
      x.setLineDash([]);
      // z-nullcline
      x.strokeStyle = '#2f7d5b'; x.lineWidth = 1.4; x.beginPath(); let on = false;
      for (let V = -85; V <= 30; V += 0.5) { const z = gyG(V, P.thetaz, P.sigmaz); if (z <= zTop) { on ? x.lineTo(ax.X(z), ax.Y(V)) : x.moveTo(ax.X(z), ax.Y(V)); on = true; } } x.stroke();
    }
    // trajectory
    x.strokeStyle = 'rgba(176,65,62,.85)'; x.lineWidth = 1; x.beginPath(); for (let i = i0; i < r.t.length; i++) { const X = ax.X(r.z[i]), Y = ax.Y(r.V[i]); i === i0 ? x.moveTo(X, Y) : x.lineTo(X, Y); } x.stroke();
    if (r.t.length) { const j = r.t.length - 1; x.fillStyle = '#b0413e'; x.beginPath(); x.arc(ax.X(r.z[j]), ax.Y(r.V[j]), 5, 0, 7); x.fill(); }
    x.restore();
    x.font = '11.5px system-ui'; [['#1d140d', 'resting states (dashed: unstable)'], ['#7a4aa0', 'spiking: max/min V'], ['#2f7d5b', 'z-nullcline'], ['#b0413e', 'full model']].forEach(([c, l], i) => { x.fillStyle = c; x.fillRect(ax.R - 190, ax.T + 6 + i * 16, 12, 3); x.fillText(l, ax.R - 172, ax.T + 11 + i * 16); });
    if (P.gZ === 0) { x.fillStyle = '#6f4c27'; x.textAlign = 'center'; x.fillText('g_M = 0: there is no slow variable, so z plays no role and the cell cannot burst.', (ax.L + ax.R) / 2, ax.T + 80); }
  }
  function drawMap() {
    const cv = $('gyMap'); if (!cv) return; const [x, W, H] = gyCanvas(cv);
    const gx = [0, 0.8], gy = [0, 3], ax = gyAxes(x, W, H, { x0: gx[0], x1: gx[1], y0: gy[0], y1: gy[1], xt: gyTicks(gx[0], gx[1]), yt: gyTicks(gy[0], gy[1]), xl: 'g_NaP (mS/cm²)', yl: 'g_M (mS/cm²)' });
    if (S.map) { const M = S.map, nx = M.nx, ny = M.ny, dw = (ax.R - ax.L) / nx, dh = (ax.B - ax.T) / ny;
      M.cells.forEach(c => { if (!c) return; x.fillStyle = c.kind === 'bursting' ? `hsl(318,${45 + Math.min(40, c.spb * 5)}%,${Math.max(30, 72 - c.spb * 5)}%)` : c.kind === 'tonic' ? '#7fb0d8' : '#ddd4c9'; x.fillRect(ax.L + c.i * dw + 0.5, ax.B - (c.j + 1) * dh + 0.5, dw - 1, dh - 1); }); }
    else { x.fillStyle = '#8a7058'; x.textAlign = 'center'; x.fillText('Press “Compute map”', (ax.L + ax.R) / 2, (ax.T + ax.B) / 2); x.textAlign = 'left'; }
    x.strokeStyle = '#1d140d'; x.lineWidth = 2; x.beginPath(); x.arc(ax.X(Math.min(gx[1], S.P.gNaP)), ax.Y(Math.min(gy[1], S.P.gZ)), 7, 0, 7); x.stroke(); x.lineWidth = 1;
    S.mapAx = ax; S.mapG = [gx, gy];
  }
  let mapJob = 0;
  $('gyMapGo').onclick = () => {
    const job = ++mapJob, nx = 16, ny = 12, P0 = Object.assign({}, S.P), [gx, gy] = [[0, 0.8], [0, 3]];
    S.map = { nx, ny, cells: [] }; let k = 0;
    const step = () => {
      if (job !== mapJob || !$('gyMap')) return; const t0 = performance.now();
      while (k < nx * ny && performance.now() - t0 < 40) {
        const i = k % nx, j = Math.floor(k / nx), P = Object.assign({}, P0, { gNaP: gx[0] + (i + 0.5) * (gx[1] - gx[0]) / nx, gZ: gy[0] + (j + 0.5) * (gy[1] - gy[0]) / ny });
        const r = gySim(P, 1500, 0.05, null, null, 1000), c = gyClassify(r.spikes, 500, 1500); S.map.cells[k] = Object.assign(c, { i, j }); k++;
      }
      $('gyMapSt').textContent = k < nx * ny ? `Computing… ${Math.round(100 * k / (nx * ny))} %` : `Done: ${nx * ny} runs of 1.5 s.`;
      drawMap(); if (k < nx * ny) setTimeout(step, 0);
    }; step();
  };
  $('gyMap').onclick = e => { if (!S.mapAx) return; const b = $('gyMap').getBoundingClientRect(), ax = S.mapAx, [gx, gy] = S.mapG, px = e.clientX - b.left, py = e.clientY - b.top;
    if (px < ax.L || px > ax.R || py < ax.T || py > ax.B) return;
    S.P.gNaP = +(gx[0] + (px - ax.L) / (ax.R - ax.L) * (gx[1] - gx[0])).toFixed(2); S.P.gZ = +(gy[0] + (ax.B - py) / (ax.B - ax.T) * (gy[1] - gy[0])).toFixed(2); S.exp = 'custom';
    syncUI(); markCustom(); later(); document.getElementById('gy-sim').scrollIntoView({ behavior: 'smooth' }); };

  /* live simulation: RK4 at 0.025 ms, samples every 0.25 ms into a 2 s scrolling window */
  const FS = {}, D = { ring: ngRing(Math.round(S.T / 0.25), ['t', 'V', 'z', 'q']), y: null, t: 0, spikes: [], armed: true, k: 0 };
  const K = [0, 1, 2, 3].map(() => new Array(9)), tmp = new Array(9);
  function resetSim() { D.y = gyInit(S.P); D.t = 0; D.ring.clear(); D.spikes = []; D.armed = D.y[0] < -30; D.k = 0; fsDirty = true; FS.zTop = 0; }
  function stepSim(ms) {
    const dt = 0.025, n = Math.round(ms / dt), P = S.P, y = D.y, I = P.Iapp;
    for (let s = 0; s < n; s++) {
      gyDeriv(P, y, I, K[0]); for (let i = 0; i < 9; i++) tmp[i] = y[i] + dt / 2 * K[0][i];
      gyDeriv(P, tmp, I, K[1]); for (let i = 0; i < 9; i++) tmp[i] = y[i] + dt / 2 * K[1][i];
      gyDeriv(P, tmp, I, K[2]); for (let i = 0; i < 9; i++) tmp[i] = y[i] + dt * K[2][i];
      gyDeriv(P, tmp, I, K[3]); for (let i = 0; i < 9; i++) y[i] += dt / 6 * (K[0][i] + 2 * K[1][i] + 2 * K[2][i] + K[3][i]);
      D.t += dt;
      if (D.armed && y[0] >= -10) { D.spikes.push(D.t); D.armed = false; } else if (!D.armed && y[0] < -30) D.armed = true;
      if (++D.k % 10 === 0) D.ring.push([D.t, y[0], y[4], y[7]]);
    }
    while (D.spikes.length && D.spikes[0] < D.t - S.T - 50) D.spikes.shift();
  }
  let fcount = 0;
  function drawLive() {
    const t = D.ring.arr('t'), V = D.ring.arr('V'), t0 = Math.max(0, D.t - S.T), from = Math.max(300, t0);
    const r = { t, V, z: D.ring.arr('z'), q: D.ring.arr('q'), t0, spikes: D.spikes };
    r.cls = gyClassify(D.spikes, from, Math.max(D.t, from + 1)); let vm = 0, nv = 0; for (let i = V.length >> 1; i < V.length; i++) { vm += V[i]; nv++; } r.vmean = nv ? vm / nv : -65; S.last = r;
    drawV(); if (fcount++ % 6 === 0) { readout(); drawFS(); }
  }
  syncUI(); resetSim();
  const LV = ngLive({ bar: 'gyLive', step: stepSim, draw: drawLive, reset: resetSim, chunk: 1 });
  drawMap(); LV.play();
  window.addEventListener('resize', () => { if ($('gyV') && S.last) { drawV(); drawFS(); drawMap(); } });
  if (typeof mathTypeset === 'function') mathTypeset($('gy-eq'));
}
window.renderCA1Bursting = renderCA1Bursting;
/* Page: /research/interleaved-resonance/ — Rebecca's reproduction of Ceballos, Chadly, Lowet & Pena 2025
   (PLoS Comput Biol 21:e1013126) as a model ladder: two-point LIF → GLIF → 2-D AdEx → biophysical 2-compartment HH.
   The HH equations match ir_ladder/fast.py (Python, numba), which reproduces Golomb 2006 spike times exactly. */
const IR_GATE = {
  hybrid: ['Hybrid (θp from Table 1, the rest from the lab code)', { thp: -35, sgb: -6, sgr: 10, thc: -30, sgc: 7 }],
  code: ['Lab code gating (Golomb 2006 kinetics)', { thp: -47, sgb: -6, sgr: 10, thc: -30, sgc: 7 }],
  table1: ['Table 1 exactly as printed', { thp: -35, sgb: 15, sgr: 19, thc: 30, sgc: -7 }] };
const IR_HH = { C: 1, gL: 0.04, EL: -70, ENa: 55, EK: -90, ECa: 120, gNa: 35, gNaP: 0.9, gKdr: 5.8, gKA: 2.8, gM: 2.4, gHCa: 0.17, gfKCa: 9.05, gsKCa: 2.8, gh: 8.46, gac: 0.2,
  thm: -30, sgm: 9.5, thh: -45, sgh: -7, thht: -40.5, sght: -6, thn: -35, sgn: 10, thnt: -27, sgnt: -15, sgp: 3, tha: -50, sga: 20, thb: -80, taub: 15,
  thz: -39, sgz: 5, tauz: 75, thr: -20, taur: 1, tauc: 2, ac: 6, aq: 2, tauq: 450, nu: 0.13, tauCa: 13, thhd: -84, sghd: 10.2, Eh: -32.9, tauhd: 40, tauMode: 'code', Iappd: 0, dend: 1 };
const IR_LIF = { C: 1, gL: 0.04, EL: -70, gac: 0.2, Vth: -50, Vreset: -60, tref: 2, dend: 1 };
const IR_GLIF = { C: 1, G: 0.04, EL: -70, Tinf: -54, fv: 0, dV: -16, tref: 2, k1: 0.1, A1: -0.5, R1: 1, k2: 1 / 450, A2: -0.1, R2: 1, k3: 0.05, A3: 1, R3: 0, bs: 0.1, dTs: 1, av: 0.005, bv: 0.1, gac: 0.2, dend: 1, level: 5 };
const IR_ADEX = { C: 1, gL: 0.04, EL: -70, DT: 3.2, VT: -55, a: 0.02, tauw: 75, b: 0.1, Vr: -50, Vpeak: 0, tref: 0.5, gac: 0.2, dend: 1 };
/* Fitted to the biophysical model (ir_ladder/fit.py, differential evolution on the f–I curve and SS/BS rates at 4–70 Hz;
   subthreshold g_L, a, τ_w, E_L of the AdEx fixed from the linearisation) */
const IR_ADEX_FIT = { C: 1, gL: 0.0361, EL: -57.05, DT: 4.39, VT: -51.80, a: 0.5776, tauw: 75, b: 0.8805, Vr: -68.69, Vpeak: 0, tref: 0.5, gac: 0.2, dend: 0 };
const IR_GLIF_FIT = { C: 1, G: 0.482, EL: -57.26, Tinf: -55.26, fv: 0, dV: -2.83, tref: 2, k1: 0.1, A1: -1.780, R1: 1, k2: 1 / 450, A2: -0.195, R2: 1, k3: 0.05, A3: 1.070, R3: 0, bs: 0.1, dTs: 3.46, av: 0, bv: 0.1, gac: 0.2, dend: 0, level: 5 };
const IR_MODELS = { lif: 'Two-point LIF', glif: 'GLIF (1–5)', pr2d: '2-D NaP + Iₕ (Pena & Rotstein)', adex: '2-D AdEx', lowet: 'Minimal bursting (Lowet 2023)', hh: 'Biophysical HH (Ceballos 2025)' };
/* Pena & Rotstein 2022 (Biol Cybern) nonlinear 2-D model with threshold and reset; threshold/reset values chosen here */
const IR_PR = { C: 1, gL: 0.5, EL: -65, ENa: 55, Eh: -20, gp: 0.5, gh: 1.5, vp: -38, kp: 6.5, vr: -79.2, kr: 9.78, taur: 80, Ibias: -5, Vth: -45, Vreset: -62, tref: 2 };
/* Lowet et al. 2023 minimal two-compartment bursting model (dXdT_HH_3.m in their repository): soma Na/K (HH alpha–beta),
   dendrite NaP + slow K; Pinsky–Rinzel coupling gc/p and gc/(1−p). Paper values: gNa 45, gNaP 0.08, gKS 0.8. */
const IR_LW = { C: 1, gNa: 45, gK: 20, gL: 0.18, ENa: 55, EK: -90, EL: -65, gNaP: 0.08, gKS: 0.8, gc: 1, p: 0.15, Ibias: 4, Ibd: 2 };   // soma total I_app + 4 = 5 and dendritic DC 2, as in their Fig 7 script (ramp −0.2 → 4)
const irG = (v, th, s) => 1 / (1 + Math.exp(-(v - th) / s));
let irSeed = 1; const irRand = () => { irSeed = (irSeed * 16807) % 2147483647; return irSeed / 2147483647; };
const irGauss = () => { let u = 0, v = 0; while (!u) u = irRand(); v = irRand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
/* stimulus: I(t) = Iapp + Aθ sin(2π fθ t + 3π/2) + Aγ sin(2π fγ t + 3π/2) at soma/dendrite/both */
function irDrive(S, t) { const ph = 1.5 * Math.PI; return S.Ath * Math.sin(2 * Math.PI * S.fth * 1e-3 * t + ph) + S.Aga * Math.sin(2 * Math.PI * S.fga * 1e-3 * t + ph); }
function irSplit(S, t) { const I = irDrive(S, t) + (S.xs ? S.xs(t) : 0); /* S.xs: optional extra input (γ-band noise, Spiking page) */ return [S.Iapp + (S.site !== 'dend' ? I : 0), S.site !== 'soma' ? I : 0]; }

/* Iₕ time constant: 'code' = lab code (HHca2, Lowet 2023 repository), 'printed' = Table 1 sign, 'fixed' = constant */
const irTauH = (P, V) => P.tauMode === 'fixed' ? P.tauhd : 1 / (Math.exp(-17.9 + (P.tauMode === 'printed' ? 0.116 : -0.116) * V) + Math.exp(-1.84 + 0.09 * V)) + 0.1;
function irLWrhs(P, y, Is, Id, d) {
  const [v, m, n, h, v2, mm, kk] = y;
  const am = -0.1 * (v + 31) / (Math.exp(-0.1 * (v + 31)) - 1), bm = 4 * Math.exp(-(v + 56) / 18), ah = 0.07 * Math.exp(-(v + 47) / 20), bh = 1 / (Math.exp(-0.1 * (v + 17)) + 1);
  const an = -0.01 * (v + 34) / (Math.exp(-0.1 * (v + 34)) - 1), bn = 0.125 * Math.exp(-(v + 44) / 80);
  const mmi = 1 / (Math.exp(-(v2 + 57.7) / 7.7) + 1), kki = 1 / (1 + Math.exp(-(v2 + 35) / 6.5)), tk = 200 / (Math.exp(-(v2 + 55) / 30) + Math.exp((v2 + 55) / 30));
  d[0] = (-(m ** 3) * h * P.gNa * (v - P.ENa) - n ** 4 * P.gK * (v - P.EK) - P.gL * (v - P.EL) - P.gc / P.p * (v - v2) + Is) / P.C;
  d[1] = 10 * (am * (1 - m) - bm * m); d[2] = 3.3 * (an * (1 - n) - bn * n); d[3] = 3.3 * (ah * (1 - h) - bh * h);
  d[4] = (-(mm ** 3) * P.gNaP * (v2 - P.ENa) - kk * P.gKS * (v2 - P.EK) - P.gL * (v2 - P.EL) - P.gc / (1 - P.p) * (v2 - v) + Id) / P.C;
  d[5] = mmi - mm; d[6] = (kki - kk) / tk;
}
function irHHrhs(P, y, Is, Id, d) {
  const [Vs, h, n, b, z, r, c, Ca, q, Vd, hd] = y, ca = Math.max(Ca, 1e-9), gac = P.dend ? P.gac : 0, m = irG(Vs, P.thm, P.sgm), a = irG(Vs, P.tha, P.sga);
  const I = P.gL * (Vs - P.EL) + P.gNa * m * m * m * h * (Vs - P.ENa) + P.gNaP * irG(Vs, P.thp, P.sgp) * (Vs - P.ENa) + P.gKdr * n ** 4 * (Vs - P.EK) + P.gKA * a * a * a * b * (Vs - P.EK)
    + P.gM * z * (Vs - P.EK) + P.gHCa * r * r * (Vs - P.ECa) + P.gfKCa / (1 + P.ac / ca) * c * (Vs - P.EK) + P.gsKCa * q * (Vs - P.EK);
  d[0] = (-I - gac * (Vs - Vd) + Is) / P.C;
  d[1] = (irG(Vs, P.thh, P.sgh) - h) / (0.1 + 0.75 * irG(Vs, P.thht, P.sght)); d[2] = (irG(Vs, P.thn, P.sgn) - n) / (0.1 + 0.5 * irG(Vs, P.thnt, P.sgnt));
  d[3] = (irG(Vs, P.thb, P.sgb) - b) / P.taub; d[4] = (irG(Vs, P.thz, P.sgz) - z) / P.tauz; d[5] = (irG(Vs, P.thr, P.sgr) - r) / P.taur; d[6] = (irG(Vs, P.thc, P.sgc) - c) / P.tauc;
  d[7] = -P.nu * P.gHCa * r * r * (Vs - P.ECa) - Ca / P.tauCa; d[8] = (1 / (1 + (P.aq / ca) ** 4) - q) / P.tauq;
  if (P.dend) { const tau = irTauH(P, Vd);
    d[9] = (-P.gL * (Vd - P.EL) - P.gh * hd * (Vd - P.Eh) - gac * (Vd - Vs) + P.Iappd + Id) / P.C; d[10] = (irG(Vd, P.thhd, -P.sghd) - hd) / tau; } else { d[9] = 0; d[10] = 0; }
}
/* Generic runner: returns {t, Vs, Vd, x (third trace), spikes} */
/* Step-able model: irMake returns { t, spikes, step(ms, sink) }. P and S are read live on every step, so changing a
   parameter mid-run takes effect immediately. sink(t, Vs, Vd, x, thr) receives samples (every 0.2–0.5 ms). */
function irMake(model, P, S) {
  irSeed = S.seed || 1; const M = { t: 0, spikes: [] }, sq = () => Math.sqrt(2 * S.D);
  if (model === 'hh' || model === 'lowet') {
    const hh = model === 'hh', N = hh ? 11 : 7, dt = hh ? 0.02 : 0.01, every = hh ? 10 : 20, V0 = hh ? -70 : -65;
    const y = hh ? [V0, irG(V0, P.thh, P.sgh), irG(V0, P.thn, P.sgn), irG(V0, P.thb, P.sgb), irG(V0, P.thz, P.sgz), irG(V0, P.thr, P.sgr), irG(V0, P.thc, P.sgc), 1e-4, 0, V0, irG(V0, P.thhd, -P.sghd)] : [-65, 0.05, 0.3, 0.6, -65, 0.02, 0.1];
    const k1 = new Array(N), k2 = new Array(N), k3 = new Array(N), k4 = new Array(N), tp = new Array(N); let armed = true, k = 0;
    const f = (yy, a, b, out) => hh ? irHHrhs(P, yy, a, b, out) : irLWrhs(P, yy, a + P.Ibias, b + P.Ibd, out);
    M.step = (ms, sink) => { const n = Math.round(ms / dt);
      for (let s = 0; s < n; s++) { const t = M.t, [a0, b0] = irSplit(S, t), [ah, bh] = irSplit(S, t + dt / 2), [a1, b1] = irSplit(S, t + dt);
        f(y, a0, b0, k1); for (let j = 0; j < N; j++) tp[j] = y[j] + dt / 2 * k1[j]; f(tp, ah, bh, k2); for (let j = 0; j < N; j++) tp[j] = y[j] + dt / 2 * k2[j];
        f(tp, ah, bh, k3); for (let j = 0; j < N; j++) tp[j] = y[j] + dt * k3[j]; f(tp, a1, b1, k4); for (let j = 0; j < N; j++) y[j] += dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
        if (S.D) y[0] += sq() * Math.sqrt(dt) * irGauss();
        M.t += dt; if (armed && y[0] >= -20) { M.spikes.push(M.t); armed = false; } else if (!armed && y[0] < -40) armed = true;
        if (sink && ++k % every === 0) sink(M.t, y[0], hh ? y[9] : y[4], hh ? y[4] : y[6], NaN); } };
    return M;
  }
  if (model === 'pr2d') {
    const dt = 0.02; let V = P.EL, r = 1 / (1 + Math.exp((P.EL - P.vr) / P.kr)), ref = 0, pend = false, k = 0;
    M.step = (ms, sink) => { const n = Math.round(ms / dt);
      for (let s = 0; s < n; s++) { const [Is] = irSplit(S, M.t), pinf = 1 / (1 + Math.exp(-(V - P.vp) / P.kp)), rinf = 1 / (1 + Math.exp((V - P.vr) / P.kr));
        r += dt * (rinf - r) / P.taur;
        if (ref > 0) { ref -= dt; V = P.Vreset; } else V += dt * (-P.gL * (V - P.EL) - P.gp * pinf * (V - P.ENa) - P.gh * r * (V - P.Eh) + P.Ibias + Is) / P.C + (S.D ? sq() * Math.sqrt(dt) * irGauss() : 0);
        M.t += dt; if (V >= P.Vth) { M.spikes.push(M.t); pend = true; V = P.Vreset; ref = P.tref; }
        if (sink && ++k % 10 === 0) { sink(M.t, pend ? 20 : V, NaN, r, P.Vth); pend = false; } } };
    return M;
  }
  const dt = model === 'adex' ? 0.02 : 0.05, every = model === 'adex' ? 25 : 10; let pend = false, V = P.EL, Vd = P.EL, ref = 0, w = 0, I1 = 0, I2 = 0, I3 = 0, Ts = 0, Tv = 0, k = 0;
  M.step = (ms, sink) => { const n = Math.round(ms / dt), gac = P.dend ? P.gac : 0, L = P.level || 5;
    for (let s = 0; s < n; s++) {
      const [Is, Id] = irSplit(S, M.t), nz = S.D ? sq() * Math.sqrt(dt) * irGauss() : 0;
      const gLd = model === 'glif' ? P.G : P.gL; Vd += dt * (-gLd * (Vd - P.EL) - gac * (Vd - V) + Id) / P.C;
      let thr = 0, spk = false;
      if (model === 'lif') {
        if (ref > 0) { ref -= dt; V = P.Vreset; } else V += dt * (-P.gL * (V - P.EL) - gac * (V - Vd) + Is) / P.C + nz;
        thr = P.Vth; if (V >= P.Vth) { spk = true; V = P.Vreset; ref = P.tref; }
      } else if (model === 'glif') {
        const asc = L >= 3; I1 -= dt * P.k1 * I1; I2 -= dt * P.k2 * I2; I3 -= dt * P.k3 * I3; Ts -= dt * P.bs * Ts;
        if (ref > 0) ref -= dt; else { V += dt * (Is + (asc ? I1 + I2 + I3 : 0) - P.G * (V - P.EL) - gac * (V - Vd)) / P.C + nz; if (L >= 4) Tv += dt * (P.av * (V - P.EL) - P.bv * Tv); }
        thr = P.Tinf + (L === 2 || L >= 4 ? Ts : 0) + (L >= 4 ? Tv : 0);
        if (ref <= 0 && V >= thr) { spk = true; V = P.EL + (L === 2 || L >= 4 ? P.fv * (V - P.EL) : 0) - P.dV; if (asc) { I1 = P.R1 * I1 + P.A1; I2 = P.R2 * I2 + P.A2; I3 = P.R3 * I3 + P.A3; } Ts += P.dTs; ref = P.tref; }
      } else {
        const dw = (P.a * (V - P.EL) - w) / P.tauw;
        if (ref > 0) ref -= dt; else V += dt * (-P.gL * (V - P.EL) + P.gL * P.DT * Math.exp(Math.min((V - P.VT) / P.DT, 30)) - w + Is - gac * (V - Vd)) / P.C + nz;
        w += dt * dw; thr = P.VT; if (V >= P.Vpeak) { spk = true; V = P.Vr; w += P.b; ref = P.tref; }
      }
      M.t += dt; if (spk) { M.spikes.push(M.t); pend = true; }
      if (sink && ++k % every === 0) { sink(M.t, pend ? 20 : V, Vd, model === 'adex' ? w : model === 'glif' ? I1 + I2 + I3 : 0, thr); pend = false; }
    } };
  return M;
}
function irRun(model, P, S, T, rec = true) {
  const M = irMake(model, P, S), out = { t: [], Vs: [], Vd: [], x: [], thr: [], spikes: M.spikes };
  M.step(T, rec ? (t, a, b, c, d) => { out.t.push(t); out.Vs.push(a); out.Vd.push(b); out.x.push(c); if (!isNaN(d)) out.thr.push(d); } : null);
  return out;
}
/* Ceballos et al. 2025 analysis: events split at ISI < 14 ms; first spike of each event counted */
function irClassify(sp, t0, T) {
  const s = sp.filter(x => x >= t0), dur = (T - t0) / 1000, ev = [];
  s.forEach((x, i) => (i && x - s[i - 1] < 14) ? ev[ev.length - 1].push(x) : ev.push([x]));
  const isi = s.slice(1).map((x, i) => x - s[i]), mu = isi.reduce((a, b) => a + b, 0) / (isi.length || 1), sd = Math.sqrt(isi.reduce((a, b) => a + (b - mu) ** 2, 0) / (isi.length || 1));
  return { ss: ev.filter(e => e.length === 1).length / dur, bs: ev.filter(e => e.length > 1).length / dur, rate: s.length / dur, cv: isi.length > 1 ? sd / mu : NaN, ev };
}

/* ---------- reduction: steady state, Jacobian, impedance (complex Gaussian elimination) ---------- */
function irSteady(P, I0) {
  const S = { Iapp: I0, Ath: 0, fth: 0, Aga: 0, fga: 0, site: 'soma', D: 0 }, dt = 0.05, V0 = -65;
  const y = [V0, irG(V0, P.thh, P.sgh), irG(V0, P.thn, P.sgn), irG(V0, P.thb, P.sgb), irG(V0, P.thz, P.sgz), irG(V0, P.thr, P.sgr), irG(V0, P.thc, P.sgc), 1e-4, 0, V0, irG(V0, P.thhd, -P.sghd)];
  const k1 = new Array(11), k2 = new Array(11), k3 = new Array(11), k4 = new Array(11), tp = new Array(11);
  for (let k = 0; k < 8000 / dt; k++) {
    irHHrhs(P, y, I0, 0, k1); for (let j = 0; j < 11; j++) tp[j] = y[j] + dt / 2 * k1[j]; irHHrhs(P, tp, I0, 0, k2); for (let j = 0; j < 11; j++) tp[j] = y[j] + dt / 2 * k2[j];
    irHHrhs(P, tp, I0, 0, k3); for (let j = 0; j < 11; j++) tp[j] = y[j] + dt * k3[j]; irHHrhs(P, tp, I0, 0, k4); for (let j = 0; j < 11; j++) y[j] += dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
  }
  const f0 = new Array(11); irHHrhs(P, y, I0, 0, f0); const drift = Math.abs(f0[0]);
  return { y, drift };
}
function irJac(P, y, I0) {
  const n = P.dend ? 11 : 9, f0 = new Array(11), f1 = new Array(11), J = [...Array(n)].map(() => new Array(n).fill(0)); irHHrhs(P, y, I0, 0, f0);
  for (let j = 0; j < n; j++) { const e = 1e-6 * Math.max(1, Math.abs(y[j])), yy = y.slice(); yy[j] += e; irHHrhs(P, yy, I0, 0, f1); for (let i = 0; i < n; i++) J[i][j] = (f1[i] - f0[i]) / e; }
  return J;
}
/* solve (iωI − J) x = e0, return x[0] as [re, im] */
function irZ(J, w, C, drop = -1) {
  const idx = [...J.keys()].filter(i => i !== drop), n = idx.length, A = idx.map((i, r) => idx.map((j, c) => [-J[i][j], r === c ? w : 0])), b = idx.map((_, r) => [r === 0 ? 1 : 0, 0]);
  const mul = (a, c) => [a[0] * c[0] - a[1] * c[1], a[0] * c[1] + a[1] * c[0]], div = (a, c) => { const d = c[0] * c[0] + c[1] * c[1]; return [(a[0] * c[0] + a[1] * c[1]) / d, (a[1] * c[0] - a[0] * c[1]) / d]; };
  for (let k = 0; k < n; k++) {
    let pv = k; for (let i = k + 1; i < n; i++) if (Math.hypot(...A[i][k]) > Math.hypot(...A[pv][k])) pv = i;
    [A[k], A[pv]] = [A[pv], A[k]]; [b[k], b[pv]] = [b[pv], b[k]];
    for (let i = k + 1; i < n; i++) { const f = div(A[i][k], A[k][k]); for (let j = k; j < n; j++) { const t = mul(f, A[k][j]); A[i][j] = [A[i][j][0] - t[0], A[i][j][1] - t[1]]; } const t = mul(f, b[k]); b[i] = [b[i][0] - t[0], b[i][1] - t[1]]; }
  }
  const x = new Array(n); for (let i = n - 1; i >= 0; i--) { let sm = b[i].slice(); for (let j = i + 1; j < n; j++) { const t = mul(A[i][j], x[j]); sm = [sm[0] - t[0], sm[1] - t[1]]; } x[i] = div(sm, A[i][i]); }
  return [x[0][0] / C, x[0][1] / C];
}
function irDerCond(P, y) {
  const Vs = y[0], Vd = y[9], d = (fn, V) => (fn(V + 1e-4) - fn(V - 1e-4)) / 2e-4, a3 = irG(Vs, P.tha, P.sga) ** 3;
  const rows = [['I<sub>NaP</sub>', P.gNaP * irG(Vs, P.thp, P.sgp), P.gNaP * (Vs - P.ENa) * d(v => irG(v, P.thp, P.sgp), Vs), 'instant'],
    ['I<sub>Kdr</sub> (n⁴)', P.gKdr * y[2] ** 4, P.gKdr * (Vs - P.EK) * 4 * y[2] ** 3 * d(v => irG(v, P.thn, P.sgn), Vs), (0.1 + 0.5 * irG(Vs, P.thnt, P.sgnt)).toFixed(2)],
    ['I<sub>KA</sub> (b)', P.gKA * a3 * y[3], P.gKA * a3 * (Vs - P.EK) * d(v => irG(v, P.thb, P.sgb), Vs), P.taub],
    ['I<sub>M</sub> (z)', P.gM * y[4], P.gM * (Vs - P.EK) * d(v => irG(v, P.thz, P.sgz), Vs), P.tauz]];
  if (P.dend) rows.push(['Iₕ (dendrite)', P.gh * y[10], P.gh * (Vd - P.Eh) * d(v => irG(v, P.thhd, -P.sghd), Vd), irTauH(P, Vd).toFixed(0)]);
  return rows;
}
/* Python reproduction results (ir_ladder, numba): hybrid reading, I_app 1, sinusoid 2 µA/cm² to soma and dendrite, 4 s.
   rows: [value, f_SS, f_BS, A_SS, A_BS] */
const IR_REPRO = {"gNaP": [[0.5, 35.0, 16.0, 30.3, 16.0], [0.7, 35.0, 16.0, 33.4, 16.0], [0.8, 35.0, 16.0, 34.3, 16.0], [0.93, 35.0, 16.0, 35.1, 16.0], [1.05, 35.0, 16.0, 35.1, 16.0], [1.2, 35.0, 16.0, 35.1, 16.0]], "gKdr": [[3, 18.0, null, 9.1, 0.0], [4, 25.0, 16.0, 25.1, 16.0], [5, 35.0, 16.0, 31.1, 16.0], [5.86, 35.0, 16.0, 35.1, 16.0], [7, 35.0, 18.0, 35.1, 18.0], [9, 40.0, 18.0, 35.4, 18.0]], "gh": [[0, 11.0, 8.0, 11.1, 8.0], [2, 25.0, 12.0, 25.1, 12.0], [4, 30.0, 14.0, 30.0, 14.0], [8.46, 35.0, 16.0, 35.1, 16.0], [12, 35.0, 18.0, 35.1, 18.0], [16, 40.0, 18.0, 38.3, 18.0]]};
/* Silence before each event (paper Figs 6–7): hybrid reading, I_app 1, noise D 0.2, 10 × 20 s. bins (ms): 0,25,50,75,100,150,250,500,∞ ; [P(burst), n events] */
const IR_SIL = {"theta only": [[0.0, 0.0, 0.222, 0.447, null, null, null, null], [1091, 1, 9, 1931, 0, 0, 0, 0]], "gamma only": [[0.0, 0.0, 0.0, 0.0, null, null, null, null], [674, 4889, 157, 1, 0, 0, 0, 0]], "theta+gamma": [[0.002, 0.0, 0.982, 0.919, null, null, null, null], [1975, 2, 1866, 74, 0, 0, 0, 0]]};
function renderInterleavedResonance(view = 'sim') {
  document.title = 'Interleaved resonance: LIF → GLIF → AdEx → HH · Research in progress';
  const S = { model: 'hh', gate: 'hybrid', Iapp: 1, Ath: 1, fth: 10, Aga: 2, fga: 40, site: 'soma', D: 0, T: 2000, seed: 1, sweepA: 1, sweep: null, last: null, prev: null };
  const P = { hh: Object.assign({}, IR_HH, IR_GATE.hybrid[1]), lif: Object.assign({}, IR_LIF), glif: Object.assign({}, IR_GLIF), adex: Object.assign({}, IR_ADEX), pr2d: Object.assign({}, IR_PR), lowet: Object.assign({}, IR_LW) };
  const CTRL = {
    lif: [['gL', 'Leak g<sub>L</sub>', 'mS/cm²', 0.01, 0.2, 0.005], ['gac', 'Soma–dendrite coupling g<sub>ac</sub>', 'mS/cm²', 0, 1, 0.01], ['Vth', 'Threshold', 'mV', -60, -40, 0.5], ['Vreset', 'Reset', 'mV', -75, -45, 0.5], ['tref', 'Refractory', 'ms', 0, 10, 0.5]],
    glif: [['level', 'GLIF level (1 LIF · 2 reset+threshold · 3 after-spike currents · 4–5 voltage threshold)', '', 1, 5, 1], ['G', 'Conductance G', 'mS/cm²', 0.01, 0.2, 0.005], ['Tinf', 'Threshold Θ<sub>∞</sub>', 'mV', -60, -40, 0.5],
      ['A1', 'Fast after-spike current A₁ (τ 10 ms)', 'µA/cm²', -5, 2, 0.05], ['A2', 'Slow after-spike current A₂ (τ 450 ms)', 'µA/cm²', -2, 1, 0.05], ['A3', 'Depolarising after-spike A₃ (τ 20 ms)', 'µA/cm²', -2, 3, 0.05],
      ['dTs', 'Spike-induced threshold jump δΘ<sub>s</sub>', 'mV', 0, 10, 0.25], ['av', 'Voltage-induced threshold a<sub>v</sub>', '/ms', 0, 0.05, 0.001], ['dV', 'Reset offset δV (V ← E<sub>L</sub> + f<sub>v</sub>(V−E<sub>L</sub>) − δV)', 'mV', -20, 20, 0.5], ['gac', 'Soma–dendrite coupling g<sub>ac</sub>', 'mS/cm²', 0, 1, 0.01]],
    adex: [['gL', 'Leak g<sub>L</sub>', 'mS/cm²', 0.01, 0.2, 0.005], ['DT', 'Spike slope Δ<sub>T</sub>', 'mV', 0.5, 6, 0.1], ['VT', 'Soft threshold V<sub>T</sub>', 'mV', -60, -40, 0.5],
      ['a', 'Subthreshold coupling a (a > 0 with slow τ<sub>w</sub> → resonance)', 'mS/cm²', -0.1, 0.4, 0.005], ['tauw', 'τ<sub>w</sub>', 'ms', 5, 500, 5], ['b', 'Spike-triggered jump b', 'µA/cm²', 0, 2, 0.01], ['Vr', 'Reset V<sub>r</sub> (high → bursts)', 'mV', -75, -40, 0.5], ['gac', 'Soma–dendrite coupling g<sub>ac</sub>', 'mS/cm²', 0, 1, 0.01]],
    pr2d: [['Ibias', 'Bias current (model’s own; adds to I<sub>app</sub>)', 'µA/cm²', -6, 2, 0.05], ['gp', 'g<sub>p</sub> (persistent Na⁺)', 'mS/cm²', 0, 1.5, 0.01], ['gh', 'g<sub>h</sub>', 'mS/cm²', 0, 4, 0.05], ['taur', 'τ<sub>r</sub> (Iₕ)', 'ms', 10, 300, 5], ['gL', 'g<sub>L</sub>', 'mS/cm²', 0.05, 1, 0.01], ['Vth', 'Spike threshold (chosen)', 'mV', -55, -30, 0.5], ['Vreset', 'Reset', 'mV', -75, -45, 0.5]],
    lowet: [['Ibias', 'Somatic bias (adds to I<sub>app</sub>)', 'µA/cm²', -5, 8, 0.05], ['Ibd', 'Dendritic DC (their place-field ramp: −0.2 → 4)', 'µA/cm²', -1, 5, 0.05], ['gNaP', 'Dendritic g<sub>NaP</sub>', 'mS/cm²', 0, 0.3, 0.005], ['gKS', 'Dendritic slow K⁺ g<sub>KS</sub>', 'mS/cm²', 0, 3, 0.05], ['gc', 'Coupling g<sub>c</sub>', 'mS/cm²', 0, 3, 0.05], ['p', 'Soma area fraction p', '', 0.05, 0.9, 0.01], ['gNa', 'g<sub>Na</sub> (paper 45, code 55)', 'mS/cm²', 20, 80, 1]],
    hh: [['gNaP', 'g<sub>NaP</sub>', 'mS/cm²', 0, 2, 0.01], ['thp', 'θ<sub>p</sub> (NaP half-activation)', 'mV', -50, -30, 0.5], ['gKdr', 'g<sub>Kdr</sub>', 'mS/cm²', 0, 15, 0.1], ['gM', 'g<sub>KM</sub>', 'mS/cm²', 0, 5, 0.05], ['gKA', 'g<sub>KA</sub>', 'mS/cm²', 0, 6, 0.1],
      ['gHCa', 'g<sub>HCa</sub>', 'mS/cm²', 0, 0.5, 0.01], ['gfKCa', 'g<sub>fKCa</sub>', 'mS/cm²', 0, 20, 0.05], ['gsKCa', 'g<sub>sKCa</sub>', 'mS/cm²', 0, 6, 0.05], ['gh', 'Dendritic g<sub>h</sub>', 'mS/cm²', 0, 15, 0.01],
      ['tauhd', 'Iₕ time constant (fixed option)', 'ms', 5, 200, 1], ['Iappd', 'Dendritic DC current (code default 0.9)', 'µA/cm²', -2, 3, 0.05], ['Eh', 'Iₕ reversal E<sub>h</sub>', 'mV', -50, -20, 1], ['gac', 'Soma–dendrite coupling g<sub>ac</sub>', 'mS/cm²', 0, 1, 0.01]] };
  const STIM = [['Iapp', 'DC current I<sub>app</sub>', 'µA/cm²', -1, 6, 0.05], ['Ath', 'θ amplitude', 'µA/cm²', 0, 4, 0.05], ['fth', 'θ frequency', 'Hz', 1, 15, 0.5], ['Aga', 'γ amplitude', 'µA/cm²', 0, 6, 0.05], ['fga', 'γ frequency', 'Hz', 20, 100, 1], ['D', 'Noise D', 'mV²/ms', 0, 0.5, 0.005]];
  const slHTML = (pre, [k, l, u, a, b, st]) => `<div class="ux-sl"><label for="ir${pre}-${k}">${l}</label><span class="ux-val"><input class="ux-num" type="number" id="ir${pre}-${k}n" min="${a}" max="${b}" step="${st}"><em>${u}</em></span><input type="range" id="ir${pre}-${k}" min="${a}" max="${b}" step="${st}"></div>`;
  $('lesson').innerHTML = bioHead('Model ladder: one cell at six levels of realism', 'MY RESEARCH · MODEL · CEBALLOS, CHADLY, LOWET & PENA 2025',
    'CA1-like neurons can resonate twice: single spikes lock best to one input frequency and bursts to another, and the two preferences interleave across theta and gamma. This page rebuilds the paper’s model step by step: a two-point leaky integrate-and-fire cell, the Allen Institute’s generalized LIF (GLIF), a two-dimensional adaptive exponential model (AdEx), and finally the full biophysical two-compartment model with the paper’s conductances. Every rung gets the same θ + γ input and the same single-spike/burst analysis.')
    + `<nav class="page-jumps"><a href="#ir-sim">Simulate</a><a href="#ir-res">Resonance sweep</a><a href="#ir-repro">vs the paper</a><a href="#ir-red">Reduction</a><a href="#ir-frame">Background</a><a href="#ir-ladder">The ladder</a><a href="#ir-amb">Open questions</a><a href="#ir-refs">References</a></nav>
    <section class="lesson-section lab" id="ir-sim"><p class="eyebrow">01 · Simulate</p><h2>One cell, four levels of realism</h2>
      <p class="ux-desc">Everything runs live: switch rungs, move any slider and the cell responds as you watch; slow it to ¼× or 0.05× to follow individual spikes. Choose a rung, then drive it with the paper’s input: I<sub>app</sub> = 1 plus a 10 Hz θ (1 µA/cm²) and a 40 Hz γ (2 µA/cm²) sinusoid. Spikes are marked as <b style="color:#2f6f9f">single</b> or <b style="color:#a62962">burst</b> (spikes &lt; 14 ms apart), as in the paper.</p>
      <div class="ux-wrap"><div class="ux-s1">
        <div class="ux-bar"><div class="ux-seg" role="radiogroup" aria-label="Model">${Object.entries(IR_MODELS).map(([k, l]) => `<button role="radio" aria-checked="${k === S.model}" data-irm="${k}">${l}</button>`).join('')}</div></div>
        <div class="ux-bar"><div class="ux-seg" role="radiogroup" aria-label="Input site">${[['soma', 'Input to soma'], ['dend', 'to dendrite'], ['both', 'to both']].map(([k, l]) => `<button role="radio" aria-checked="${k === S.site}" data-irsite="${k}">${l}</button>`).join('')}</div></div>${ngLiveBar('irLive', 1)}
        <div class="ux-fig"><div class="ux-figh"><b>Figure 1.</b><span id="irRead" class="ux-status"></span></div>
          <canvas id="irV" class="ux-cv" style="height:250px" aria-label="Soma and dendrite voltage"></canvas>
          <canvas id="irX" class="ux-cv" style="height:110px;margin-top:6px" aria-label="Input current and slow variable"></canvas>
          <p class="ux-note"><b>Figure 1.</b> <b>Top:</b> soma (black) and dendrite (green) voltage; ticks above mark single spikes (blue) and burst spikes (purple). Integrate-and-fire spikes are drawn as vertical lines to +20 mV. <b>Bottom:</b> the injected θ + γ current (grey) and the model’s slow variable: K<sub>M</sub> gate z (HH), adaptation current w (AdEx) or summed after-spike currents (GLIF).</p></div>
      </div><div class="ux-s2"><div class="ux-fig" id="irModelTxt"></div></div>
      <aside class="ux-panel" aria-label="Settings"><div class="ux-pane">
        <h4 class="hs-h">Input</h4>${STIM.map(c => slHTML('s', c)).join('')}
        <h4 class="hs-h">Model parameters</h4><div id="irGateBox"><label class="ux-f"><span>Parameter reading (see Open questions)</span><select id="irGate">${Object.entries(IR_GATE).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
          <label class="nl-inl ux-chk"><input type="checkbox" id="irDend" checked> Dendritic compartment</label><label class="ux-f"><span>Iₕ time constant</span><select id="irTauM"><option value="code">Lab code formula (≈3 s near rest)</option><option value="printed">Table 1 sign as printed</option><option value="fixed">Fixed (slider)</option></select></label></div>
        <div id="irCtl"></div><div class="ux-acts"><button class="secondary" id="irReset">Reset this model</button><button class="secondary" id="irFit" hidden>Load fit to the HH model</button></div>
        <p class="ux-note">Click a value to type it. Changes re-run automatically.</p></div></aside></div></section>
    <section class="lesson-section" id="ir-res"><p class="eyebrow">02 · Measure</p><h2>Single-spike and burst resonance</h2>
      <p>The paper’s central measurement: drive the cell with one sinusoid at a time (on top of I<sub>app</sub>) and count, for each frequency, how many single-spike events and how many burst events occur per second (first spike of each event). The peak of each curve is that firing mode’s resonant frequency; the paper compares them with Δf = f<sub>SS</sub> − f<sub>BS</sub> and ΔA = A<sub>SS</sub> − A<sub>BS</sub>.</p>
      <div class="ux-bar"><label class="nl-inl">Amplitude <input class="ux-num" type="number" id="irSwA" value="1" step="0.25" min="0" max="6" style="width:80px"> µA/cm²</label><button class="ux-run" id="irSwGo">Run sweep (2–100 Hz)</button><span id="irSwSt" class="ux-status"></span></div>
      <div class="ux-fig"><canvas id="irSw" class="ux-cv" style="height:300px" aria-label="Single-spike and burst event rates against input frequency"></canvas>
        <p class="ux-note" id="irSwNote"><b>Figure 2.</b> Event rate against input frequency for the current rung and settings (4 s per frequency, first 500 ms discarded). Blue: single spikes. Purple: bursts.</p></div></section>
    <section class="lesson-section" id="ir-repro"><p class="eyebrow">01 · Check against the paper</p><h2>What reproduces, and what does not (yet)</h2>
      <p>Resonance sweeps of the biophysical model in the Python reproduction (hybrid reading, I<sub>app</sub> = 1, one 2 µA/cm² sinusoid into soma and dendrite, 4 s per frequency, 2–100 Hz). Each panel varies one conductance from the paper’s Fig 3 defaults (g<sub>NaP</sub> 0.93, g<sub>Kdr</sub> 5.86, gₕ 8.46).</p>
      <div class="ux-fig"><canvas id="irRepro" class="ux-cv" style="height:260px" aria-label="Resonant frequencies of single spikes and bursts against each conductance"></canvas>
        <p class="ux-note"><b>Figure 4.</b> Resonant frequency of single spikes (f<sub>SS</sub>, blue) and bursts (f<sub>BS</sub>, purple) against g<sub>NaP</sub>, g<sub>Kdr</sub> and gₕ. Bursts lock one per cycle in the 5–20 Hz band; single spikes win below ~5 Hz and in gamma.</p></div>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Paper finding</th><th>Reproduction</th></tr></thead><tbody>
        <tr><td>Single spikes and bursts resonate at different, interleaved frequencies</td><td class="ux-ok">Yes. Bursts: theta–beta (f<sub>BS</sub> 8–20 Hz); single spikes: gamma (f<sub>SS</sub> 25–45 Hz), plus a low-frequency single-spike band. Holds for the hybrid reading (g<sub>NaP</sub> 0.93) and for the lab-code reading at g<sub>NaP</sub> 0.3.</td></tr>
        <tr><td>f<sub>SS</sub> above f<sub>BS</sub> for all gₕ</td><td class="ux-ok">Yes. Both rise with gₕ (Δf 3 → 22 Hz from gₕ 0 to 16), because the slow Iₕ acts as a depolarising conductance.</td></tr>
        <tr><td>Δf reverses sign with g<sub>NaP</sub> (SS above BS at low, below at high)</td><td class="ux-bad">No. With θ<sub>p</sub> = −35 mV, I<sub>NaP</sub> is nearly closed between spikes, so g<sub>NaP</sub> barely moves either resonance. A sign that the authors’ exact θ<sub>p</sub> or drive differs.</td></tr>
        <tr><td>Δf reverses with g<sub>Kdr</sub> (SS below BS at low g<sub>Kdr</sub>)</td><td class="ux-bad">No: f<sub>SS</sub> stays above f<sub>BS</sub>; at g<sub>Kdr</sub> = 3 bursts disappear.</td></tr>
        <tr><td>Burst peak rate always above single-spike peak (ΔA &lt; 0)</td><td class="ux-bad">No: A<sub>SS</sub> &gt; A<sub>BS</sub> here, because bursts are capped at one per input cycle. The paper’s rate normalisation may differ.</td></tr>
        <tr><td>Bursting appears near g<sub>NaP</sub> ≈ 0.35 under DC (Fig 1, one compartment)</td><td class="ux-ok">Yes: single spikes up to 0.3, bursts from 0.35, CV &gt; 2 at 0.5.</td></tr>
        <tr><td>Bursts follow long silences; single spikes short ones (Figs 6–7)</td><td class="ux-ok">Yes, qualitatively (Figure 5): γ alone gives only single spikes after &lt; 50 ms silences; θ alone gives bursts only after ≥ 50–100 ms; θ + γ looks like θ alone. The absolute cut-off is lower than the paper’s 100 ms because a 10 Hz θ caps silences near 100 ms.</td></tr></tbody></table></div>
      <div class="ux-fig"><canvas id="irSil" class="ux-cv" style="height:230px" aria-label="Probability that an event is a burst against the silence before it"></canvas>
        <p class="ux-note"><b>Figure 5.</b> Probability that an event is a burst, against the silent interval before it (hybrid reading, I<sub>app</sub> 1, noise D = 0.2, 10 runs × 20 s, input to soma and dendrite). Bars of height ~0 mean events occurred but none were bursts; missing bars mean no events in that bin.</p></div>
      <p><b>Which settings matter.</b> Re-running Figure 4 under other readings: with input to the dendrite only, bursts nearly vanish; with the lab code’s Iₕ settings (gₕ 2, dendritic DC 0.9) the picture is unchanged. With the lab code’s θ<sub>p</sub> = −47 mV and g<sub>NaP</sub> scaled to ~0.3 (the Fig 1–2 regime), g<sub>NaP</sub> now moves both resonances (f<sub>BS</sub> 20 → 30 Hz, f<sub>SS</sub> 40 → 70 Hz) and at low g<sub>Kdr</sub> bursts outnumber single spikes (ΔA &lt; 0), closer to the paper. So the g<sub>NaP</sub> and g<sub>Kdr</sub> trends hinge on the θ<sub>p</sub> and g<sub>NaP</sub> pair: the first thing to confirm.</p>
      <p class="nl-explain"><b>Reading this honestly:</b> the qualitative result is robust across readings, but the parameter dependences on g<sub>NaP</sub> and g<sub>Kdr</sub> are not, which points at the open questions below (θ<sub>p</sub>, input site and DC level). Those are the things to confirm with the authors before treating any one reading as the model.</p></section>
    <section class="lesson-section" id="ir-red"><p class="eyebrow">01 · Reduce</p><h2>From 11 variables to 2: derivative conductances</h2>
      <p>The lab’s reduction method (Pena, Ceballos, Lima &amp; Roque 2018; Pena &amp; Rotstein 2022). Hold the biophysical cell at a subthreshold steady state V*. Each gated current I<sub>x</sub> = g<sub>x</sub>x(V − E<sub>x</sub>) then splits into a chord conductance g<sub>x</sub>x* that acts instantly and a <b>derivative conductance</b> that acts through the gate’s time constant τ<sub>x</sub>:</p>
      <p>\\[ G^{Der}_x = g_x\\,(V^*-E_x)\\,\\frac{dx_\\infty}{dV}\\Big|_{V^*}, \\qquad Z(\\omega)=\\Big[i\\omega C + g_{L,\\mathrm{eff}} + \\sum_x \\frac{G^{Der}_x}{1+i\\omega\\tau_x}\\Big]^{-1} \\]</p>
      <p>A positive, slow G<sup>Der</sup> (I<sub>M</sub>, Iₕ) opposes voltage changes after a delay: a band-pass, resonant current. A negative one (I<sub>NaP</sub>, KA inactivation) amplifies. Keeping only the dominant slow term gives the linear 2-D model C dv/dt = −g<sub>L,eff</sub>v − g₁w + I, τ₁ dw/dt = v − w, which is exactly the subthreshold part of the 2-D AdEx (a = g₁, τ<sub>w</sub> = τ₁).</p>
      <div class="ux-bar"><label class="nl-inl">Holding current <input class="ux-num" type="number" id="irRedI" value="1" step="0.1" min="-2" max="3" style="width:80px"> µA/cm²</label><button class="ux-run" id="irRedGo">Linearise the HH model</button><button class="secondary" id="irRedUse" disabled title="Sets g_L, a, τ_w and E_L so the AdEx has the same subthreshold impedance at this holding current; V_T is placed 4 mV above rest">Use as AdEx parameters</button><span id="irRedSt" class="ux-status"></span></div>
      <div class="ux-wrap" style="grid-template-areas:none;grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div class="ux-fig"><canvas id="irRedZ" class="ux-cv" style="height:280px" aria-label="Impedance of the full and reduced models"></canvas>
        <p class="ux-note"><b>Figure 3.</b> Input impedance at the soma. Black: full linearised biophysical model (all 11 variables, exact for small inputs). Purple dashed: 2-D reduction keeping only I<sub>M</sub>. It misses the amplifying KA term and the dendritic branch, so its peak is lower and sits slightly higher in frequency; adding them back one at a time (a 3-D or 4-D model) recovers the full curve. The Python version checks the black curve against simulations with a 0.02 µA/cm² sinusoid (agreement within 1.5 mV per µA/cm² at 2–40 Hz).</p></div>
        <div class="ux-fig" id="irRedTab"><p class="ux-note">Press “Linearise” to compute the steady state, the derivative conductances and the reduced model for the current HH settings.</p></div></div></section>
    <section class="lesson-section" id="ir-frame"><p class="eyebrow">05 · Where the model comes from</p><h2>The lab’s framework, 2018–2025</h2>
      <ol class="refs" data-keep-open>
        <li><b>Golomb, Yue &amp; Yaari 2006</b>: the somatic CA1 model (NaT, NaP, Kdr, KA, KM, Ca²⁺ and Ca²⁺-dependent K⁺). Every later model reuses its kinetics. <a href="/biology/ca1-bursting/">Page</a>.</li>
        <li><b>Pena, Ceballos, Lima &amp; Roque 2018</b> (Phys Rev E 97:042408): resonance is set by the <i>derivative</i> conductance and the gate’s activation time constant, not the chord conductance. Basis of the reduction above.</li>
        <li><b>Ceballos, Pena, Roque &amp; Leão 2018</b> (Channels): I<sub>NaP</sub> creates a zero slope conductance near threshold, giving non-decaying PSPs and delayed spikes; why g<sub>NaP</sub> and θ<sub>p</sub> matter so much here.</li>
        <li><b>Pena et al. 2019</b> (Chaos 29:103135): nonlinearities of activation curves and nullclines make the voltage envelope asymmetric at large inputs, so linear impedance misses part of the response.</li>
        <li><b>Pena &amp; Rotstein 2022</b> (Biol Cybern): linear and NaP + Iₕ 2-D models with threshold and reset; subthreshold resonance does not guarantee spiking resonance and can be lost with non-sinusoidal or noisy input. The 2-D NaP + Iₕ rung.</li>
        <li><b>Lowet, …, Pena, …, Han 2023</b> (Cell Reports): voltage imaging in mouse CA1 shows bursts lock to theta and single spikes to gamma, causally (8 vs 40 Hz optogenetics). Two models: the minimal four-current bursting model (rung above) and the Golomb + dendritic Iₕ model (HHca2) that the 2025 paper extends.</li>
        <li><b>Ceballos, Chadly, Lowet &amp; Pena 2025</b> (PLoS Comput Biol): single-spike and burst resonances are interleaved; their frequencies are set by NaP, Kdr, KM and Iₕ, and bursts follow long silences (&gt; 100 ms), confirmed in voltage-imaging data.</li>
        <li><b>Ceballos &amp; Pena 2025</b> (Biophys J): dendritic synaptic integration modes under in vivo-like states; the natural next step for the dendritic compartment.</li></ol>
      <p class="nl-explain"><b>What the 2025 paper suggests next</b> (its Discussion): find ways to vary one resonance while keeping the other fixed; study other currents; and test pharmacological targets of these channels. The reduction above is one tool for the first: G<sup>Der</sup> of each current tells you which resonance it moves.</p></section>
    <section class="lesson-section" id="ir-ladder"><p class="eyebrow">03 · The ladder</p><h2>What each rung adds</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Rung</th><th>State variables</th><th>What it can do</th><th>What it cannot</th></tr></thead><tbody>
        <tr><td><b>Two-point LIF</b></td><td>V<sub>soma</sub>, V<sub>dend</sub></td><td>Low-pass filtering, dendritic attenuation (g<sub>ac</sub>), firing-rate locking</td><td>No subthreshold resonance, no bursts: nothing slower than τ<sub>m</sub> = C/g<sub>L</sub> = 25 ms</td></tr>
        <tr><td><b>GLIF 1–5</b> (Teeter et al. 2018)</td><td>V, three after-spike currents, two threshold variables</td><td>Adaptation, rebound, bursting from a depolarising after-spike current, spike-shaped thresholds; fits recordings with few parameters</td><td>Currents are triggered by spikes only: no voltage-dependent subthreshold resonance</td></tr>
        <tr><td><b>2-D NaP + Iₕ</b> (Pena &amp; Rotstein 2022)</td><td>V, r</td><td>Biophysical subthreshold resonance from the two currents the lab studies; amplification by NaP</td><td>Spikes only via an added threshold/reset; no bursts</td></tr>
        <tr><td><b>2-D AdEx</b> (Brette &amp; Gerstner 2005)</td><td>V, w</td><td>Exponential spike onset: for I<sub>Na</sub> ∝ m<sub>∞</sub>³ the spike-initiation slope is Δ<sub>T</sub> ≈ σ<sub>m</sub>/3 = 9.5/3 ≈ 3.2 mV (Fourcaud-Trocmé et al. 2003); the f–I fit used here gives 4.4 mV because w and the other currents also bend the onset, subthreshold resonance when a &gt; 0 and τ<sub>w</sub> is slow (an I<sub>M</sub>/Iₕ stand-in), bursting with a high reset</td><td>One slow process stands in for K<sub>M</sub>, sK<sub>Ca</sub> and Iₕ together</td></tr>
        <tr><td><b>Minimal bursting</b> (Lowet et al. 2023)</td><td>7: V<sub>s</sub>, m, n, h, V<sub>d</sub>, NaP gate, K<sub>S</sub> gate</td><td>Dendritic bursts from NaP + slow K⁺; theta-locked bursts and gamma-locked single spikes as in the voltage imaging</td><td>No Ca²⁺ currents, no Iₕ</td></tr>
        <tr><td><b>Biophysical HH</b> (Ceballos et al. 2025)</td><td>11: V<sub>s</sub>, h, n, b, z, r, c, [Ca²⁺], q, V<sub>d</sub>, hₕ</td><td>Every current of the paper, Ca²⁺-dependent K⁺, dendritic Iₕ</td><td>Single dendrite, no morphology, parameters partly ambiguous (below)</td></tr></tbody></table></div>
      <p><b>Fitting the reduced models to the biophysical one</b> (as the Allen Institute fit GLIFs to recordings). Subthreshold parameters come from the linearisation (Reduce); spiking parameters are fitted by differential evolution to the HH model’s f–I curve (0–6 µA/cm²) and its single-spike and burst rates under a 2 µA/cm² sinusoid at 4, 8, 12, 16, 25, 40 and 70 Hz. Press <b>Load fit to the HH model</b> on the AdEx or GLIF rung.</p>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th></th><th>f–I (Hz) at 1.5 · 3 · 6 µA/cm²</th><th>Bursts/s at 8 · 12 · 16 Hz</th><th>Single spikes/s at 25 · 40 · 70 Hz</th><th>Fitted parameters</th></tr></thead><tbody>
        <tr><td><b>HH (target)</b></td><td>15 · 27 · 52</td><td>8 · 12 · 16</td><td>25 · 30 · 18</td><td>—</td></tr>
        <tr><td><b>AdEx fit</b></td><td>21 · 29 · 49</td><td>0 · 12 · 16</td><td>25 · 40 · 23</td><td>Δ<sub>T</sub> 4.4 mV, V<sub>T</sub> −51.8, b 0.88, V<sub>r</sub> −68.7 (a 0.578, τ<sub>w</sub> 75 ms from G<sup>Der</sup><sub>M</sub>)</td></tr>
        <tr><td><b>GLIF fit</b></td><td>7 · 25 · 55</td><td>8 · 6 · 0</td><td>24 · 22 · 19</td><td>Θ<sub>∞</sub> −55.3, A₁ −1.78, A₂ −0.20, A₃ +1.07, δΘ<sub>s</sub> 3.5 mV</td></tr></tbody></table></div>
      <p class="nl-explain">The AdEx, whose w is literally the linearised I<sub>M</sub>, captures the f–I curve and the burst band at 12–16 Hz but misses 8 Hz bursts. The GLIF, with no subthreshold resonance, reproduces the f–I curve less well near threshold and bursts only at the slowest frequencies: its after-spike currents are triggered by spikes, not by the input’s phase. A rung that keeps both a voltage-driven slow variable and spike-triggered currents is the natural next model.</p></section>
    <section class="lesson-section" id="ir-amb"><p class="eyebrow">02 · Open questions</p><h2>Where the paper’s Methods are ambiguous</h2>
      <p>Table 1, the Methods text and the lab’s single-compartment code (github.com/rodrigo-pena-lab/interleaved_resonance) disagree in places. Each choice changes the behaviour, so each is a switch here. Results on the right are from the Python reproduction (f–I curve, 0–6 µA/cm², two compartments).</p>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Item</th><th>Table 1</th><th>Text / code</th><th>Effect of the printed value</th></tr></thead><tbody>
        <tr><td>θ<sub>p</sub> (I<sub>NaP</sub>)</td><td>−35 mV</td><td>−47 mV (code; “varies −47 to −41”)</td><td>With −47 and g<sub>NaP</sub> 0.9 the cell sits depolarised (≈ −36 mV) and fires at I<sub>app</sub> = 0. With −35 it rests at −57 mV, is silent up to ~1 µA/cm² and fires tonically above (15 → 52 Hz). −47 is right for the single-compartment Figs 1–2 (g<sub>NaP</sub> 0.3: bursts appear at g<sub>NaP</sub> ≈ 0.35, as the paper reports); −35 is used in the default “hybrid” reading for g<sub>NaP</sub> 0.9.</td></tr>
        <tr><td>σ<sub>b</sub> (I<sub>KA</sub> inactivation)</td><td>15 mV</td><td>−6 mV</td><td>A positive slope turns b into an activation gate: the cell never fires (0–6 µA/cm²). Almost certainly a typo.</td></tr>
        <tr><td>θ<sub>c</sub>, σ<sub>c</sub> (I<sub>fKCa</sub>)</td><td>+30, −7 mV</td><td>−30, +7 mV</td><td>As printed, c is open at rest; bursts at every current, 16–29 Hz.</td></tr>
        <tr><td>σ<sub>r</sub> (I<sub>HCa</sub>)</td><td>19 mV</td><td>10 mV</td><td>Wider Ca²⁺ activation: bursting at all currents, 6–11 Hz.</td></tr>
        <tr><td>Iₕ time constant</td><td>{e<sup>−17.9+0.116V</sup> + e<sup>−1.84+0.09V</sup>}⁻¹ + 0.1</td><td>e<sup>−17.9−0.116V</sup> in the lab’s two-compartment code (HHca2, Lowet 2023 repository)</td><td>Resolved by the code (sign typo in the table). Either way τ ≈ 1.4–2.9 s between −60 and −84 mV, so Iₕ acts as a nearly static depolarising conductance; with these kinetics the ~12 Hz subthreshold resonance comes from I<sub>M</sub>, not Iₕ (see Reduce).</td></tr>
        <tr><td>Iₕ reversal</td><td>printed “V − V<sub>K</sub>”</td><td>V<sub>h</sub> = −32.9 mV in HHca2</td><td>Resolved by the code.</td></tr>
        <tr><td>g<sub>h</sub>, dendritic DC</td><td>g<sub>h</sub> 8.46</td><td>HHca2: G<sub>h</sub> 2, I<sub>app,dend</sub> 0.9</td><td>8.46 used; dendritic DC adjustable (default 0).</td></tr>
        <tr><td>Input site</td><td colspan="2">Fig. 3: dendrite; Fig. 4: soma and dendrite</td><td>Switchable above.</td></tr>
        <tr><td>Defaults</td><td>g<sub>NaP</sub> 0.9, g<sub>Kdr</sub> 5.8</td><td>0.93, 5.86 in figures</td><td>Small; table values used.</td></tr>
        <tr><td>Noise</td><td>D = 9.6 × 10⁻⁶</td><td>D = 0.1 (code default)</td><td>Default 0 here; adjustable.</td></tr></tbody></table></div></section>
    <section class="lesson-section" id="ir-refs"><p class="eyebrow">References</p><h2>Sources</h2><ol class="refs" data-label="Papers">
      <li>Ceballos CC, Chadly N, Lowet E, Pena RFO (2025). Interleaved single and bursting spiking resonance in neurons. <i>PLoS Comput Biol</i> 21:e1013126. <a href="https://doi.org/10.1371/journal.pcbi.1013126" target="_blank" rel="noopener">doi:10.1371/journal.pcbi.1013126</a></li>
      <li>Golomb D, Yue C, Yaari Y (2006). <i>J Neurophysiol</i> 96:1912–1926. <a href="https://doi.org/10.1152/jn.00205.2006" target="_blank" rel="noopener">doi:10.1152/jn.00205.2006</a> · see the <a href="/biology/ca1-bursting/">CA1 bursting page</a></li>
      <li>Teeter C, Iyer R, Menon V, et al. (2018). Generalized leaky integrate-and-fire models classify multiple neuron types. <i>Nat Commun</i> 9:709. <a href="https://doi.org/10.1038/s41467-017-02717-4" target="_blank" rel="noopener">doi:10.1038/s41467-017-02717-4</a></li>
      <li>Brette R, Gerstner W (2005). Adaptive exponential integrate-and-fire model as an effective description of neuronal activity. <i>J Neurophysiol</i> 94:3637–3642. <a href="https://doi.org/10.1152/jn.00686.2005" target="_blank" rel="noopener">doi:10.1152/jn.00686.2005</a></li>
      <li>Fourcaud-Trocmé N, Hansel D, van Vreeswijk C, Brunel N (2003). How spike generation mechanisms determine the neuronal response to fluctuating inputs. <i>J Neurosci</i> 23:11628–11640. <a href="https://doi.org/10.1523/JNEUROSCI.23-37-11628.2003" target="_blank" rel="noopener">doi:10.1523/JNEUROSCI.23-37-11628.2003</a></li>
      <li>Richardson MJE, Brunel N, Hakim V (2003). From subthreshold to firing-rate resonance. <i>J Neurophysiol</i> 89:2538–2554. <a href="https://doi.org/10.1152/jn.00955.2002" target="_blank" rel="noopener">doi:10.1152/jn.00955.2002</a></li></ol><ol class="refs refs-code" data-label="Code &amp; data">${['ir', 'lowet', 'mdb66268', 'allensdk', 'ladder'].map(k => `<li>${RS_REPOS[k]}</li>`).join('')}</ol></section>`;

  { const VIEWS = { sim: ['ir-sim', 'ir-res', 'ir-ladder', 'ir-refs'], repro: ['ir-repro', 'ir-amb', 'ir-refs'], reduce: ['ir-red', 'ir-refs'] }, keep = VIEWS[view] || VIEWS.sim;
    document.querySelectorAll('#lesson section.lesson-section[id^="ir-"]').forEach(sec => { if (!keep.includes(sec.id)) sec.hidden = true; });
    document.querySelectorAll('#lesson .page-jumps a').forEach(a => { const id = a.getAttribute('href').slice(1); if (!keep.includes(id)) a.remove(); });
    const TITLES = { repro: ['Reproduction vs the paper', 'MY RESEARCH · METHOD · CEBALLOS, CHADLY, LOWET & PENA 2025', 'What reproduces from the paper in the Python reproduction, what does not, how much depends on the ambiguous Table 1 values, and the open questions for the authors.'],
      reduce: ['Reduction: from 11 variables to 2', 'MY RESEARCH · METHOD · DERIVATIVE CONDUCTANCES', 'Linearise the biophysical model at a subthreshold operating point, read which currents create resonance, and reduce it to the 2-D model that underlies the AdEx rung.'] }[view];
    if (TITLES) { const h = document.querySelector('#lesson .hero'); if (h) { const t = h.querySelector('h1'), e = h.querySelector('.pill,.eyebrow'), l = h.querySelector('.lead,p'); if (t) t.textContent = TITLES[0]; if (e) e.textContent = TITLES[1]; if (l) l.textContent = TITLES[2]; } document.title = TITLES[0] + ' · My research'; }
    else document.title = 'Model ladder: LIF → GLIF → 2-D → HH · My research'; }
  const bind = (pre, key, obj, a, b, onch) => { const r = $(`ir${pre}-${key}`), n = $(`ir${pre}-${key}n`); r.value = obj[key]; n.value = +(+obj[key]).toFixed(4);
    r.oninput = () => { obj[key] = +r.value; n.value = r.value; onch(); }; n.onchange = () => { const v = Math.min(b, Math.max(a, +n.value)); obj[key] = v; r.value = v; n.value = v; onch(); }; };
  const later = () => {};   // live: parameters are read on every step
  STIM.forEach(([k, , , a, b]) => bind('s', k, S, a, b, later));
  const TXT = { lif: '<b>Two-point LIF.</b> Soma and a passive dendrite, each C dV/dt = −g<sub>L</sub>(V − E<sub>L</sub>) − g<sub>ac</sub>(V − V<sub>other</sub>) + I. The soma fires at V<sub>th</sub> and resets. The dendrite filters input given to it before it reaches the soma.',
    glif: '<b>GLIF (Teeter et al. 2018).</b> Level 1 is a LIF; 2 adds a reset rule and a spike-induced threshold; 3 adds after-spike currents (here: fast hyperpolarising ≈ fK<sub>Ca</sub>, slow ≈ sK<sub>Ca</sub>, and depolarising ≈ the I<sub>NaP</sub> afterdepolarisation that makes bursts); 4–5 add a voltage-dependent threshold. The dashed line in Figure 1 is the moving threshold.',
    adex: '<b>2-D AdEx.</b> C dV/dt = −g<sub>L</sub>(V−E<sub>L</sub>) + g<sub>L</sub>Δ<sub>T</sub>e<sup>(V−V<sub>T</sub>)/Δ<sub>T</sub></sup> − w + I; τ<sub>w</sub> dw/dt = a(V−E<sub>L</sub>) − w; at a spike V ← V<sub>r</sub>, w ← w + b. With a &gt; 0 and τ<sub>w</sub> = 75 ms (the K<sub>M</sub> time constant) w acts like a slow restoring current, giving subthreshold resonance; a high V<sub>r</sub> gives bursts.',
    pr2d: '<b>2-D NaP + Iₕ model (Pena &amp; Rotstein 2022).</b> C dV/dt = −g<sub>L</sub>(V−E<sub>L</sub>) − g<sub>p</sub>p<sub>∞</sub>(V)(V−E<sub>Na</sub>) − g<sub>h</sub>r(V−E<sub>h</sub>) + I; τ<sub>r</sub> dr/dt = r<sub>∞</sub>(V) − r. The lab’s own minimal resonant model: instantaneous NaP amplifies, slow Iₕ (τ<sub>r</sub> = 80 ms) restores, giving theta-range resonance. Parameters are the paper’s; the spike threshold and reset are added here (the paper gives no values).',
    lowet: '<b>Minimal bursting model (Lowet et al. 2023).</b> A Pinsky–Rinzel-style two-compartment cell: HH Na⁺/K⁺ spikes in the soma, persistent Na⁺ and slow K⁺ in the dendrite, coupling g<sub>c</sub>/p and g<sub>c</sub>/(1−p) with p = 0.15. Bursts come from the dendrite; it reproduces the paper’s finding that bursts lock to theta and single spikes to gamma. Equations from the authors’ MATLAB code (dXdT_HH_3.m). Try input “to dendrite”.',
    hh: '<b>Biophysical two-compartment model.</b> Soma: I<sub>NaT</sub>, I<sub>NaP</sub>, I<sub>Kdr</sub>, I<sub>KA</sub>, I<sub>KM</sub>, I<sub>HCa</sub>, I<sub>fKCa</sub>, I<sub>sKCa</sub> with [Ca²⁺] dynamics (Golomb 2006 kinetics, the paper’s conductances). Dendrite: leak and Iₕ, coupled by g<sub>ac</sub> = 0.2 mS/cm². RK4, Δt = 0.02 ms.' };
  function buildCtl() {
    const m = S.model; $('irCtl').innerHTML = CTRL[m].map(c => slHTML('p', c)).join(''); CTRL[m].forEach(([k, , , a, b]) => bind('p', k, P[m], a, b, later));
    $('irFit').hidden = !(m === 'adex' || m === 'glif'); $('irGateBox').hidden = m !== 'hh'; $('irModelTxt').innerHTML = TXT[m]; $('irDend').parentNode.hidden = !('dend' in P[m]);
    document.querySelectorAll('[data-irm]').forEach(b => b.setAttribute('aria-checked', b.dataset.irm === m));
    $('irDend').checked = !!P[m].dend; if (m === 'lowet' && S.site === 'soma') { S.site = 'dend'; document.querySelectorAll('[data-irsite]').forEach(o => o.setAttribute('aria-checked', o.dataset.irsite === 'dend')); }
  }
  document.querySelectorAll('[data-irm]').forEach(b => b.onclick = () => { S.model = b.dataset.irm; S.prev = null; buildCtl(); run(); });
  document.querySelectorAll('[data-irsite]').forEach(b => b.onclick = () => { S.site = b.dataset.irsite; document.querySelectorAll('[data-irsite]').forEach(o => o.setAttribute('aria-checked', o === b)); run(); });
  $('irGate').onchange = e => { S.gate = e.target.value; Object.assign(P.hh, IR_GATE[S.gate][1]); buildCtl(); };
  $('irDend').onchange = e => { P[S.model].dend = e.target.checked ? 1 : 0; };
  $('irTauM').onchange = e => { P.hh.tauMode = e.target.value; };
  $('irReset').onclick = () => { P[S.model] = Object.assign({}, { lif: IR_LIF, glif: IR_GLIF, adex: IR_ADEX, pr2d: IR_PR, lowet: IR_LW, hh: Object.assign({}, IR_HH, IR_GATE[S.gate][1]) }[S.model]); buildCtl(); run(); };
  $('irFit').onclick = () => { P[S.model] = Object.assign({}, S.model === 'adex' ? IR_ADEX_FIT : IR_GLIF_FIT); Object.assign(S, { Iapp: 1 }); buildCtl(); run(); };

  function draw() {
    const r = S.last; if (!r || !$('irV')) return;
    let [x, W, H] = gyCanvas($('irV')); let ax = gyAxes(x, W, H, { x0: r.t0, x1: r.t0 + S.T, y0: -90, y1: 40, xt: gyTicks(r.t0, r.t0 + S.T), yt: [-80, -60, -40, -20, 0, 20], xl: 'time (ms)', yl: 'V (mV)', T: 20 });
    const line = (t, v, col, wd, dash) => { x.strokeStyle = col; x.lineWidth = wd; x.setLineDash(dash || []); x.beginPath(); t.forEach((tt, i) => i ? x.lineTo(ax.X(tt), ax.Y(v[i])) : x.moveTo(ax.X(tt), ax.Y(v[i]))); x.stroke(); x.setLineDash([]); x.lineWidth = 1; };
    if (P[S.model].dend || S.model === 'lowet') line(r.t, r.Vd, '#2f7d5b', 1.1);
    if (r.hasThr) line(r.t, r.thr, '#b9a796', 1, [4, 3]);
    line(r.t, r.Vs, '#1d140d', 1.2);
    r.cls.ev.forEach(e => e.forEach(s => { x.fillStyle = e.length > 1 ? '#a62962' : '#2f6f9f'; x.fillRect(ax.X(s) - 1, 4, 2, 10); }));
    [x, W, H] = gyCanvas($('irX'));
    const It = r.t.map(t => irDrive(S, t)), ia = Math.max(1, ...It.map(Math.abs));
    ax = gyAxes(x, W, H, { x0: r.t0, x1: r.t0 + S.T, y0: -ia * 1.1, y1: ia * 1.1, xt: [], yt: [], B: 8, yl: 'input' });
    line(r.t, It, '#c9bcae', 1);
    const xs = r.x, xm = Math.max(...xs.map(Math.abs)) || 1; if (S.model !== 'lif') { line(r.t, xs.map(v => v / xm * ia), '#a62962', 1.5); x.fillStyle = '#a62962'; x.fillText({ hh: 'z (K_M gate)', adex: 'w (adaptation)', glif: 'Σ after-spike currents', pr2d: 'r (Iₕ gate)', lowet: 'slow K gate (dendrite)' }[S.model] + ' · scaled', ax.L + 8, ax.T + 12); }
  }
  /* live simulation: the current rung advances in real time; a 2 s window scrolls */
  const RING = ngRing(10000, ['t', 'Vs', 'Vd', 'x', 'thr']); let LM = null, LV = null, fc = 0;
  const newModel = () => { LM = irMake(S.model, P[S.model], S); RING.clear(); };
  const stepLive = ms => LM.step(ms, (t, a, b, c, d) => RING.push([t, a, b, c, d]));
  function drawLive() {
    if (!LM || !$('irV')) return; const t1 = LM.t, t0 = Math.max(0, t1 - S.T), from = Math.max(300, t0);
    while (LM.spikes.length && LM.spikes[0] < t1 - S.T - 50) LM.spikes.shift();
    const thr = RING.arr('thr'), r = { t: RING.arr('t'), Vs: RING.arr('Vs'), Vd: RING.arr('Vd'), x: RING.arr('x'), thr, hasThr: thr.length > 0 && !isNaN(thr[thr.length - 1]), t0 };
    r.cls = irClassify(LM.spikes, from, Math.max(t1, from + 1)); S.last = r; draw();
    if (fc++ % 8 === 0) { const c = r.cls, f = v => v.toFixed(1); $('irRead').innerHTML = `last ${((t1 - from) / 1000).toFixed(1)} s: ${f(c.rate)} spikes/s · <b style="color:#2f6f9f">${f(c.ss)}</b> single-spike events/s · <b style="color:#a62962">${f(c.bs)}</b> bursts/s · CV ${isNaN(c.cv) ? '–' : c.cv.toFixed(2)}`; }
  }
  function run() { if (LV) LV.restart(); else newModel(); }
  const FR = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 25, 30, 35, 40, 50, 60, 70, 80, 100];
  let job = 0;
  $('irSwGo').onclick = () => {
    const my = ++job, A = +$('irSwA').value, m = S.model, PP = Object.assign({}, P[m]), res = []; let k = 0;
    const step = () => { if (my !== job || !$('irSw')) return; const t0 = performance.now();
      while (k < FR.length && performance.now() - t0 < 60) { const SS = Object.assign({}, S, { Ath: A, fth: FR[k], Aga: 0 }); const r = irRun(m, PP, SS, 4000, false); res.push(Object.assign(irClassify(r.spikes, 500, 4000), { f: FR[k] })); k++; }
      S.sweep = { res, m, A }; drawSweep(); $('irSwSt').textContent = k < FR.length ? `Running… ${k}/${FR.length}` : 'Done';
      if (k < FR.length) setTimeout(step, 0); };
    step();
  };
  function drawSweep() {
    const cv = $('irSw'); if (!cv) return; const [x, W, H] = gyCanvas(cv);
    const R = S.sweep ? S.sweep.res : [], ym = Math.max(2, ...R.map(r => Math.max(r.ss, r.bs))) * 1.1;
    const lx = f => Math.log10(f), ax = gyAxes(x, W, H, { x0: lx(2), x1: lx(100), y0: 0, y1: ym, xt: [], yt: gyTicks(0, ym, 4), xl: 'input frequency (Hz, log scale)', yl: 'events / s' });
    x.fillStyle = '#6f4c27'; x.textAlign = 'center'; [2, 5, 10, 20, 50, 100].forEach(f => x.fillText(f, ax.X(lx(f)), ax.B + 15)); x.textAlign = 'left';
    x.fillStyle = 'rgba(47,111,159,.07)'; x.fillRect(ax.X(lx(3)), ax.T, ax.X(lx(12)) - ax.X(lx(3)), ax.B - ax.T); x.fillStyle = 'rgba(166,41,98,.06)'; x.fillRect(ax.X(lx(30)), ax.T, ax.X(lx(100)) - ax.X(lx(30)), ax.B - ax.T);
    x.fillStyle = '#8a7058'; x.fillText('θ band', ax.X(lx(3)) + 4, ax.T + 12); x.fillText('γ band', ax.X(lx(30)) + 4, ax.T + 12);
    if (!R.length) { x.textAlign = 'center'; x.fillText('Press “Run sweep”', (ax.L + ax.R) / 2, (ax.T + ax.B) / 2); return; }
    [['ss', '#2f6f9f', 'single spikes'], ['bs', '#a62962', 'bursts']].forEach(([k, col, lab], j) => { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2; x.beginPath(); R.forEach((r, i) => i ? x.lineTo(ax.X(lx(r.f)), ax.Y(r[k])) : x.moveTo(ax.X(lx(r.f)), ax.Y(r[k]))); x.stroke();
      R.forEach(r => { x.beginPath(); x.arc(ax.X(lx(r.f)), ax.Y(r[k]), 3, 0, 7); x.fill(); }); x.fillRect(ax.R - 120, ax.T + 6 + j * 16, 12, 3); x.fillText(lab, ax.R - 102, ax.T + 11 + j * 16); });
    x.lineWidth = 1;
    if (R.length === FR.length) { const pk = k => { const r = R.reduce((a, b) => b[k] > a[k] ? b : a); return r[k] > 0 ? r : null; }, s = pk('ss'), b = pk('bs');
      $('irSwNote').innerHTML = `<b>Figure 2.</b> ${IR_MODELS[S.sweep.m]}, amplitude ${S.sweep.A} µA/cm². Blue: single-spike events; purple: bursts (first spike of each event, 4 s per frequency, first 500 ms discarded). `
        + (s ? `f<sub>SS</sub> = ${s.f} Hz (A<sub>SS</sub> = ${s.ss.toFixed(1)}/s). ` : 'No single spikes. ') + (b ? `f<sub>BS</sub> = ${b.f} Hz (A<sub>BS</sub> = ${b.bs.toFixed(1)}/s). ` : 'No bursts. ')
        + (s && b ? `Δf = ${(s.f - b.f).toFixed(0)} Hz, ΔA = ${(s.ss - b.bs).toFixed(1)}/s.` : ''); }
  }
  let red = null;
  $('irRedGo').onclick = () => {
    const I0 = +$('irRedI').value, Q = P.hh; $('irRedSt').textContent = 'Computing…';
    setTimeout(() => {
      const st = irSteady(Q, I0), J = irJac(Q, st.y, I0), FZ = []; for (let lf = Math.log10(0.5); lf <= 2.0001; lf += 0.04) FZ.push(10 ** lf);
      const Zf = FZ.map(f => Math.hypot(...irZ(J, 2 * Math.PI * f * 1e-3, Q.C)));
      const rows = irDerCond(Q, st.y), gM = rows[3][2], gLeff = 1 / irZ(J, 0, Q.C, 4)[0];
      const Z2 = FZ.map(f => { const w = 2 * Math.PI * f * 1e-3, re = gLeff + gM / (1 + w * w * Q.tauz * Q.tauz), im = w * Q.C - gM * w * Q.tauz / (1 + w * w * Q.tauz * Q.tauz); return 1 / Math.hypot(re, im); });
      const pk = Z => { const i = Z.indexOf(Math.max(...Z)); return i > 0 && i < Z.length - 1 ? FZ[i] : 0; };
      red = { FZ, Zf, Z2, Vs: st.y[0], Vd: st.y[9], gM, gLeff, f1: pk(Zf), f2: pk(Z2), drift: st.drift };
      $('irRedTab').innerHTML = `<p class="ux-note"><b>Steady state</b> at I = ${I0}: V<sub>soma</sub>* = ${st.y[0].toFixed(2)} mV${Q.dend ? `, V<sub>dend</sub>* = ${st.y[9].toFixed(2)} mV` : ''}${st.drift > 1e-3 ? ' <b class="ux-bad">(not at rest: the cell is firing; lower the holding current)</b>' : ''}.</p>
        <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Current</th><th>chord g (mS/cm²)</th><th>G<sup>Der</sup> (mS/cm²)</th><th>τ (ms)</th></tr></thead><tbody>${rows.map(([l, gc, gd, tau]) => `<tr><td>${l}</td><td>${gc.toFixed(4)}</td><td style="color:${gd > 0 ? '#2f6f9f' : '#b0413e'}">${gd >= 0 ? '+' : ''}${gd.toFixed(4)}</td><td>${tau}</td></tr>`).join('')}</tbody></table></div>
        <p class="ux-note"><b>2-D reduction:</b> g<sub>L,eff</sub> = ${gLeff.toFixed(4)}, g₁ = G<sup>Der</sup><sub>M</sub> = ${gM.toFixed(4)} mS/cm², τ₁ = ${Q.tauz} ms. Resonance: full ${red.f1 ? red.f1.toFixed(1) + ' Hz' : 'none (low-pass)'}, reduced ${red.f2 ? red.f2.toFixed(1) + ' Hz' : 'none'}. Blue = restoring (resonant), red = amplifying.</p>`;
      $('irRedSt').textContent = 'Done'; $('irRedUse').disabled = st.drift > 1e-3; drawRed();
    }, 20);
  };
  $('irRedUse').onclick = () => { if (!red) return; const I0 = +$('irRedI').value;
    if ($('ir-sim').hidden) { try { sessionStorage.setItem('ir-adex', JSON.stringify({ gL: +red.gLeff.toFixed(4), a: +red.gM.toFixed(4), tauw: P.hh.tauz, EL: +(red.Vs - I0 / (red.gLeff + red.gM)).toFixed(2), b: 0.02, Vr: +(red.Vs - 2).toFixed(1), VT: +(red.Vs + 4).toFixed(1), DT: 3.2, dend: 0, I0 })); } catch (e) {} location.hash = '/biology/interleaved-resonance/'; return; } Object.assign(P.adex, { gL: +red.gLeff.toFixed(4), a: +red.gM.toFixed(4), tauw: P.hh.tauz, EL: +(red.Vs - I0 / (red.gLeff + red.gM)).toFixed(2), b: 0.02, Vr: +(red.Vs - 2).toFixed(1), VT: +(red.Vs + 4).toFixed(1), DT: 3.2, dend: 0 }); S.Iapp = I0; ['Iapp'].forEach(k => { $('irs-' + k).value = I0; $('irs-' + k + 'n').value = I0; }); S.model = 'adex'; buildCtl(); run(); document.getElementById('ir-sim').scrollIntoView({ behavior: 'smooth' }); };
  function drawRed() {
    const cv = $('irRedZ'); if (!cv) return; const [x, W, H] = gyCanvas(cv);
    if (!red) { x.fillStyle = '#8a7058'; x.textAlign = 'center'; x.fillText('Press “Linearise the HH model”', W / 2, H / 2); return; }
    const lx = Math.log10, zm = Math.max(...red.Zf, ...red.Z2) * 1.1, ax = gyAxes(x, W, H, { x0: lx(0.5), x1: 2, y0: 0, y1: zm, xt: [], yt: gyTicks(0, zm, 4), xl: 'frequency (Hz, log)', yl: '|Z| (kΩ·cm²)' });
    x.fillStyle = '#6f4c27'; x.textAlign = 'center'; [0.5, 1, 2, 5, 10, 20, 50, 100].forEach(f => x.fillText(f, ax.X(lx(f)), ax.B + 15)); x.textAlign = 'left';
    const ln = (Z, col, dash) => { x.strokeStyle = col; x.lineWidth = 2; x.setLineDash(dash || []); x.beginPath(); red.FZ.forEach((f, i) => i ? x.lineTo(ax.X(lx(f)), ax.Y(Z[i])) : x.moveTo(ax.X(lx(f)), ax.Y(Z[i]))); x.stroke(); x.setLineDash([]); x.lineWidth = 1; };
    ln(red.Zf, '#1d140d'); ln(red.Z2, '#a62962', [6, 4]);
    x.fillStyle = '#1d140d'; x.fillText('full linearised (11-D)', ax.R - 150, ax.T + 12); x.fillStyle = '#a62962'; x.fillText('2-D reduction (I_M only)', ax.R - 150, ax.T + 28);
  }
  function drawRepro() {
    const cv = $('irRepro'); if (!cv) return; const [x, W, H] = gyCanvas(cv), keys = [['gNaP', 'g_NaP (mS/cm²)'], ['gKdr', 'g_Kdr (mS/cm²)'], ['gh', 'g_h (mS/cm²)']], pw = W / 3;
    keys.forEach(([k, lab], j) => { const rows = IR_REPRO[k], xs = rows.map(r => r[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      x.save(); x.translate(j * pw, 0); const ax = gyAxes(x, pw, H, { x0, x1, y0: 0, y1: 50, xt: gyTicks(x0, x1, 4), yt: j ? [] : [0, 10, 20, 30, 40, 50], xl: lab, yl: j ? '' : 'resonant f (Hz)', L: j ? 20 : 50, R: 14 });
      [[1, '#2f6f9f'], [2, '#a62962']].forEach(([c, col]) => { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2; x.beginPath(); let st = false; rows.forEach(r => { if (r[c] == null) { st = false; return; } st ? x.lineTo(ax.X(r[0]), ax.Y(r[c])) : x.moveTo(ax.X(r[0]), ax.Y(r[c])); st = true; }); x.stroke(); rows.forEach(r => { if (r[c] != null) { x.beginPath(); x.arc(ax.X(r[0]), ax.Y(r[c]), 3.5, 0, 7); x.fill(); } }); });
      x.restore(); });
    x.fillStyle = '#2f6f9f'; x.fillText('f_SS single spikes', W - 260, 16); x.fillStyle = '#a62962'; x.fillText('f_BS bursts', W - 130, 16); x.lineWidth = 1;
  }
  function drawSil() {
    const cv = $('irSil'); if (!cv) return; const [x, W, H] = gyCanvas(cv), E = [0, 25, 50, 75, 100, 150], keys = [['gamma only', '#2f6f9f'], ['theta only', '#d08a2e'], ['theta+gamma', '#a62962']];
    const ax = gyAxes(x, W, H, { x0: 0, x1: 100, y0: 0, y1: 1, xt: E.slice(0, 5), yt: [0, 0.25, 0.5, 0.75, 1], xl: 'silence before the event (ms)', yl: 'P(burst)' });
    keys.forEach(([k, col], j) => { const [p, n] = IR_SIL[k]; for (let i = 0; i < 4; i++) { if (p[i] == null || n[i] < 5) continue; const x0 = ax.X(E[i]) + 3 + j * ((ax.X(E[i + 1]) - ax.X(E[i]) - 6) / 3), w = (ax.X(E[i + 1]) - ax.X(E[i]) - 6) / 3 - 2;
      x.fillStyle = col; x.fillRect(x0, Math.min(ax.Y(p[i]), ax.B - 3), w, Math.max(3, ax.B - ax.Y(p[i]))); } x.fillRect(ax.R - 130, ax.T + 4 + j * 16, 12, 8); x.fillStyle = '#3a2a1c'; x.fillText(k.replace('theta', 'θ').replace('gamma', 'γ'), ax.R - 112, ax.T + 12 + j * 16); });
  }
  if (view === 'sim') { try { const q = JSON.parse(sessionStorage.getItem('ir-adex') || 'null'); if (q) { sessionStorage.removeItem('ir-adex'); Object.assign(P.adex, q); S.model = 'adex'; S.Iapp = q.I0; $('irs-Iapp').value = $('irs-Iappn').value = q.I0; } } catch (e) {} }
  buildCtl(); newModel(); drawSweep(); drawRed(); drawRepro(); drawSil();
  if (view === 'sim') { LV = ngLive({ bar: 'irLive', step: stepLive, draw: drawLive, reset: newModel, chunk: 1 }); LV.play(); }
  if (typeof mathTypeset === 'function') mathTypeset($('ir-red'));
  window.addEventListener('resize', () => { if ($('irV')) { draw(); drawSweep(); drawRed(); drawRepro(); drawSil(); } });
}
window.renderInterleavedResonance = renderInterleavedResonance;
/* "My research" section: hub, CA1 pyramidal cell, CA1 circuit (with a toy network), Lowet et al. 2023, code.
   References are listed per page with DOIs or PubMed links. */
const RS_REF = {
  amaral89: 'Amaral DG, Witter MP (1989). The three-dimensional organization of the hippocampal formation: a review of anatomical data. <i>Neuroscience</i> 31:571–591. <a href="https://doi.org/10.1016/0306-4522(89)90424-7" target="_blank" rel="noopener">doi</a>',
  spruston08: 'Spruston N (2008). Pyramidal neurons: dendritic structure and synaptic integration. <i>Nat Rev Neurosci</i> 9:206–221. <a href="https://doi.org/10.1038/nrn2286" target="_blank" rel="noopener">doi</a>',
  magee98: 'Magee JC (1998). Dendritic hyperpolarization-activated currents modify the integrative properties of hippocampal CA1 pyramidal neurons. <i>J Neurosci</i> 18:7613–7624. <a href="https://doi.org/10.1523/JNEUROSCI.18-19-07613.1998" target="_blank" rel="noopener">doi</a>',
  hoffman97: 'Hoffman DA, Magee JC, Colbert CM, Johnston D (1997). K⁺ channel regulation of signal propagation in dendrites of hippocampal pyramidal neurons. <i>Nature</i> 387:869–875. <a href="https://doi.org/10.1038/43119" target="_blank" rel="noopener">doi</a>',
  hu02: 'Hu H, Vervaeke K, Storm JF (2002). Two forms of electrical resonance at theta frequencies, generated by M-current, h-current and persistent Na⁺ current in rat hippocampal pyramidal cells. <i>J Physiol</i> 545:783–805. <a href="https://doi.org/10.1113/jphysiol.2002.029249" target="_blank" rel="noopener">doi</a>',
  hu09: 'Hu H, Vervaeke K, Graham LJ, Storm JF (2009). Complementary theta resonance filtering by two spatially segregated mechanisms in CA1 hippocampal pyramidal neurons. <i>J Neurosci</i> 29:14472–14483. <a href="https://doi.org/10.1523/JNEUROSCI.0187-09.2009" target="_blank" rel="noopener">doi</a>',
  narayanan07: 'Narayanan R, Johnston D (2007). Long-term potentiation in rat hippocampal neurons is accompanied by spatially widespread changes in intrinsic oscillatory dynamics and excitability. <i>Neuron</i> 56:1061–1075. <a href="https://doi.org/10.1016/j.neuron.2007.10.033" target="_blank" rel="noopener">doi</a>',
  hutcheon00: 'Hutcheon B, Yarom Y (2000). Resonance, oscillation and the intrinsic frequency preferences of neurons. <i>Trends Neurosci</i> 23:216–222. <a href="https://doi.org/10.1016/S0166-2236(00)01547-2" target="_blank" rel="noopener">doi</a>',
  yue04: 'Yue C, Yaari Y (2004). KCNQ/M channels control spike afterdepolarization and burst generation in hippocampal neurons. <i>J Neurosci</i> 24:4614–4624. <a href="https://doi.org/10.1523/JNEUROSCI.0765-04.2004" target="_blank" rel="noopener">doi</a>',
  golomb06: 'Golomb D, Yue C, Yaari Y (2006). Contribution of persistent Na⁺ current and M-type K⁺ current to somatic bursting in CA1 pyramidal cells. <i>J Neurophysiol</i> 96:1912–1926. <a href="https://doi.org/10.1152/jn.00205.2006" target="_blank" rel="noopener">doi</a>',
  staff00: 'Staff NP, Jung HY, Thiagarajan T, Yao M, Spruston N (2000). Resting and active properties of pyramidal neurons in subiculum and CA1 of rat hippocampus. <i>J Neurophysiol</i> 84:2398–2408. <a href="https://doi.org/10.1152/jn.2000.84.5.2398" target="_blank" rel="noopener">doi</a>',
  golding02: 'Golding NL, Staff NP, Spruston N (2002). Dendritic spikes as a mechanism for cooperative long-term potentiation. <i>Nature</i> 418:326–331. <a href="https://doi.org/10.1038/nature00854" target="_blank" rel="noopener">doi</a>',
  grien14: 'Grienberger C, Chen X, Konnerth A (2014). NMDA receptor-dependent multidendrite Ca²⁺ spikes required for hippocampal burst firing in vivo. <i>Neuron</i> 81:1274–1281. <a href="https://doi.org/10.1016/j.neuron.2014.01.014" target="_blank" rel="noopener">doi</a>',
  bittner17: 'Bittner KC, Milstein AD, Grienberger C, Romani S, Magee JC (2017). Behavioral time scale synaptic plasticity underlies CA1 place fields. <i>Science</i> 357:1033–1036. <a href="https://doi.org/10.1126/science.aan3846" target="_blank" rel="noopener">doi</a>',
  harris01: 'Harris KD, Hirase H, Leinekugel X, Henze DA, Buzsáki G (2001). Temporal interaction between single spikes and complex spike bursts in hippocampal pyramidal cells. <i>Neuron</i> 32:141–149. <a href="https://doi.org/10.1016/S0896-6273(01)00447-0" target="_blank" rel="noopener">doi</a>',
  mizuseki12: 'Mizuseki K, Royer S, Diba K, Buzsáki G (2012). Activity dynamics and behavioral correlates of CA3 and CA1 hippocampal pyramidal neurons. <i>Hippocampus</i> 22:1659–1680. <a href="https://doi.org/10.1002/hipo.22002" target="_blank" rel="noopener">doi</a>',
  klaus08: 'Klausberger T, Somogyi P (2008). Neuronal diversity and temporal dynamics: the unity of hippocampal circuit operations. <i>Science</i> 321:53–57. <a href="https://doi.org/10.1126/science.1149381" target="_blank" rel="noopener">doi</a>',
  buzsaki02: 'Buzsáki G (2002). Theta oscillations in the hippocampus. <i>Neuron</i> 33:325–340. <a href="https://doi.org/10.1016/S0896-6273(02)00586-X" target="_blank" rel="noopener">doi</a>',
  colgin09: 'Colgin LL, Denninger T, Fyhn M, et al. (2009). Frequency of gamma oscillations routes flow of information in the hippocampus. <i>Nature</i> 462:353–357. <a href="https://doi.org/10.1038/nature08573" target="_blank" rel="noopener">doi</a>',
  bezaire13: 'Bezaire MJ, Soltesz I (2013). Quantitative assessment of CA1 local circuits: knowledge base for interneuron–pyramidal cell connectivity. <i>Hippocampus</i> 23:751–785. <a href="https://doi.org/10.1002/hipo.22141" target="_blank" rel="noopener">doi</a>',
  bezaire16: 'Bezaire MJ, Raikov I, Burk K, Vyas D, Soltesz I (2016). Interneuronal mechanisms of hippocampal theta oscillations in a full-scale model of the rodent CA1 circuit. <i>eLife</i> 5:e18566. <a href="https://doi.org/10.7554/eLife.18566" target="_blank" rel="noopener">doi</a>',
  pinsky94: 'Pinsky PF, Rinzel J (1994). Intrinsic and network rhythmogenesis in a reduced Traub model for CA3 neurons. <i>J Comput Neurosci</i> 1:39–60. <a href="https://doi.org/10.1007/BF00962717" target="_blank" rel="noopener">doi</a>',
  lowet23: 'Lowet E, Sheehan DJ, Chialva U, De Oliveira Pena R, …, Hasselmo ME, Rotstein HG, Han X (2023). Theta and gamma rhythmic coding through two spike output modes in the hippocampus during spatial navigation. <i>Cell Rep</i> 42:112906. <a href="https://doi.org/10.1016/j.celrep.2023.112906" target="_blank" rel="noopener">doi</a> · <a href="https://github.com/HanLabBU/Lowet-Cell-Reports-2023" target="_blank" rel="noopener">code</a>',
  ceballos25: 'Ceballos CC, Chadly N, Lowet E, Pena RFO (2025). Interleaved single and bursting spiking resonance in neurons. <i>PLoS Comput Biol</i> 21:e1013126. <a href="https://doi.org/10.1371/journal.pcbi.1013126" target="_blank" rel="noopener">doi</a> · <a href="https://github.com/rodrigo-pena-lab/interleaved_resonance" target="_blank" rel="noopener">code</a>',
  pena18: 'Pena RFO, Ceballos CC, Lima V, Roque AC (2018). Interplay of activation kinetics and the derivative conductance determines resonance properties of neurons. <i>Phys Rev E</i> 97:042408. <a href="https://doi.org/10.1103/PhysRevE.97.042408" target="_blank" rel="noopener">doi</a>',
  ceballos18: 'Ceballos CC, Pena RFO, Roque AC, Leão RM (2018). Non-decaying postsynaptic potentials and delayed spikes in hippocampal pyramidal neurons generated by a zero slope conductance created by the persistent Na⁺ current. <i>Channels</i> 12:81–88. <a href="https://pubmed.ncbi.nlm.nih.gov/29380651/" target="_blank" rel="noopener">PubMed 29380651</a>',
  pena19: 'Pena RFO, Lima V, Shimoura RO, Ceballos CC, Rotstein HG, Roque AC (2019). Asymmetrical voltage response in resonant neurons shaped by nonlinearities. <i>Chaos</i> 29:103135. <a href="https://doi.org/10.1063/1.5110033" target="_blank" rel="noopener">doi</a>',
  pena22: 'Pena RFO, Rotstein HG (2022). The voltage and spiking responses of subthreshold resonant neurons to structured and fluctuating inputs: persistence and loss of resonance and variability. <i>Biol Cybern</i> 116:163–190. <a href="https://doi.org/10.1007/s00422-021-00919-0" target="_blank" rel="noopener">doi</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/35038010/" target="_blank" rel="noopener">PubMed 35038010</a>',
  ceballos25b: 'Ceballos CC, Pena RFO (2025). Dendritic synaptic integration modes under in vivo-like states. <i>Biophys J</i> 124:1979–1994. <a href="https://doi.org/10.1016/j.bpj.2025.04.028" target="_blank" rel="noopener">doi</a>',
  busche12: 'Busche MA, Chen X, Henning HA, et al. (2012). Critical role of soluble amyloid-β for early hippocampal hyperactivity in a mouse model of Alzheimer’s disease. <i>PNAS</i> 109:8740–8745. <a href="https://doi.org/10.1073/pnas.1206171109" target="_blank" rel="noopener">doi</a>',
  verret12: 'Verret L, Mann EO, Hang GB, et al. (2012). Inhibitory interneuron deficit links altered network activity and cognitive dysfunction in Alzheimer model. <i>Cell</i> 149:708–721. <a href="https://doi.org/10.1016/j.cell.2012.02.046" target="_blank" rel="noopener">doi</a>',
  iacc16: 'Iaccarino HF, Singer AC, Martorell AJ, et al. (2016). Gamma frequency entrainment attenuates amyloid load and modifies microglia. <i>Nature</i> 540:230–235. <a href="https://doi.org/10.1038/nature20587" target="_blank" rel="noopener">doi</a>',
  brette05: 'Brette R, Gerstner W (2005). Adaptive exponential integrate-and-fire model as an effective description of neuronal activity. <i>J Neurophysiol</i> 94:3637–3642. <a href="https://doi.org/10.1152/jn.00686.2005" target="_blank" rel="noopener">doi</a>',
};
/* code and data behind the papers (each link checked against the repository or ModelDB page) */
const RS_REPOS = {
  ir: 'Ceballos et al. 2025 · single-compartment model (Python notebook). <a href="https://github.com/rodrigo-pena-lab/interleaved_resonance" target="_blank" rel="noopener">github.com/rodrigo-pena-lab/interleaved_resonance</a>',
  lowet: 'Lowet et al. 2023 · analysis scripts, minimal bursting model (MATLAB) and Golomb + dendritic Iₕ model (Python). <a href="https://github.com/HanLabBU/Lowet-Cell-Reports-2023" target="_blank" rel="noopener">github.com/HanLabBU/Lowet-Cell-Reports-2023</a>',
  mdb66268: 'Golomb, Yue &amp; Yaari 2006 · CA1 somatic bursting model (XPP). <a href="https://modeldb.science/66268" target="_blank" rel="noopener">ModelDB 66268</a> · <a href="https://github.com/ModelDBRepository/66268" target="_blank" rel="noopener">GitHub mirror</a>',
  mdb55035: 'Migliore, Ferrante &amp; Ascoli 2005 · signal propagation in CA1 oblique dendrites (NEURON). <a href="https://modeldb.science/55035" target="_blank" rel="noopener">ModelDB 55035</a> · <a href="https://github.com/ModelDBRepository/55035" target="_blank" rel="noopener">GitHub mirror</a>',
  mdb244688: 'Migliore R et al. 2018 · channel-density variability in data-driven CA1 cells (NEURON, BluePyOpt). <a href="https://modeldb.science/244688" target="_blank" rel="noopener">ModelDB 244688</a> · <a href="https://github.com/ModelDBRepository/244688" target="_blank" rel="noopener">GitHub mirror</a> · <a href="https://doi.org/10.1371/journal.pcbi.1006423" target="_blank" rel="noopener">paper</a>',
  mdb187604: 'Bezaire et al. 2016 · full-scale CA1 network with spontaneous theta and gamma (NEURON). <a href="https://modeldb.science/187604" target="_blank" rel="noopener">ModelDB 187604</a> · <a href="https://github.com/ModelDBRepository/187604" target="_blank" rel="noopener">GitHub mirror</a>',
  allensdk: 'Teeter et al. 2018 · GLIF models and fitting code in the Allen SDK. <a href="https://github.com/AllenInstitute/AllenSDK" target="_blank" rel="noopener">github.com/AllenInstitute/AllenSDK</a>',
  ladder: 'This site · ir_ladder Python package (LIF → GLIF → AdEx → HH, resonance and burst analysis). <a href="/biology/research-code/">Code page</a>'
};
const RS_PAPER_CODE = { ceballos25: 'ir', lowet23: 'lowet', golomb06: 'mdb66268', bezaire16: 'mdb187604', teeter18: 'allensdk' };
const rsRefs = (keys, extra = []) => { const code = [...new Set([...keys.map(k => RS_PAPER_CODE[k]).filter(Boolean), ...extra, 'ladder'])];
  return `<section class="lesson-section" id="rs-refs"><p class="eyebrow">References</p><h2>Sources</h2><ol class="refs" data-label="Papers">${keys.map(k => `<li>${RS_REF[k]}</li>`).join('')}</ol><ol class="refs refs-code" data-label="Code &amp; data">${code.map(k => `<li>${RS_REPOS[k]}</li>`).join('')}</ol></section>`; };
const RS_PAGES = [
  ['/biology/research/', 'Research overview', 'The question, how the pages connect, and where the work stands.'],
  ['/biology/research-ca1-cell/', 'The CA1 pyramidal neuron', 'Anatomy, the ion channels that set resonance and bursting, and two firing modes.'],
  ['/biology/research-circuit/', 'CA1 circuit: theta, gamma and two output modes', 'Inputs, interneurons, theta and gamma, and a toy circuit that tests the single-cell result.'],
  ['/biology/research-lowet-2023/', 'Lowet et al. 2023', 'Voltage imaging: bursts lock to theta, single spikes to gamma; the models behind it.'],
  ['/biology/interleaved-resonance/', 'Model ladder (simulator)', 'Two-point LIF → GLIF → 2-D models → minimal bursting → biophysical HH.'],
  ['/biology/research-place-fields/', 'Place field formation (BTSP)', 'A mouse on a treadmill belt; one plateau potential creates a place field; bursts vs single spikes in space.'],
  ['/biology/research-morphology/', 'Research model on a real CA1 cell', 'I_M and I_NaP on reconstructed CA1 cells: voltage on the tree, bursts, two theta resonances.'],
  ['/biology/research-resonance/', 'Resonance experiment', 'Z(f), fR and Q for seven models, subthreshold, checked against their own equations.'],
  ['/biology/research-spiking/', 'Spiking analysis', 'f–I curves, single spikes vs bursts, ISI statistics and θ/γ phase locking for every model; the Lowet et al. 2023 test.'],
  ['/biology/research-reproduction/', 'Reproduction vs the paper', 'What reproduces from Ceballos et al. 2025, what does not, and why.'],
  ['/biology/research-reduction/', 'Reduction', 'From 11 variables to 2 with derivative conductances.'],
  ['/biology/research-code/', 'Python code', 'The ir_ladder toolkit and scripts behind every number.']];
window.RS_PAGES = RS_PAGES;
const rsNext = () => '';   // the site’s section footer already gives previous / next within My research
window.rsNext = rsNext;

/* ---------------------------------------------------------------- hub */
function renderResearchHub() {
  document.title = 'Research overview · My research';
  $('lesson').innerHTML = bioHead('Two output modes of CA1 pyramidal neurons', 'MY RESEARCH · OVERVIEW',
    'CA1 pyramidal cells send information out in two ways: single spikes and short high-frequency bursts. In behaving mice the two modes follow different rhythms, bursts following theta and single spikes following gamma (Lowet et al. 2023), and in models each mode has its own preferred input frequency (Ceballos et al. 2025). These pages collect the biology, the models and the code I use to work on how ion channels set these two modes, and how that could change in Alzheimer’s disease.')
    + `<section class="lesson-section"><p class="eyebrow">Working question</p><h2>What sets the frequency preference of each output mode?</h2>
      <p>A neuron’s frequency preference comes from its slow currents: currents that oppose a voltage change after a delay create resonance (Hutcheon &amp; Yarom 2000). In CA1 pyramidal cells the M current, the h current and the persistent Na⁺ current produce two theta resonances, one near rest and one at depolarised potentials (Hu et al. 2002, 2009). The same currents decide whether a cell fires single spikes or bursts (Yue &amp; Yaari 2004; Golomb et al. 2006). So the question is how one set of channels gives the two modes <i>different</i> preferred frequencies, and which channel changes would shift one mode without the other, a direction the 2025 paper itself proposes.</p>
      <p class="nl-explain"><b>Why it matters for Alzheimer’s disease.</b> Early in mouse models, hippocampal neurons become hyperactive (Busche et al. 2012), PV interneurons that pace gamma are impaired (Verret et al. 2012), and driving gamma at 40 Hz changes amyloid load and microglia (Iaccarino et al. 2016). If single spikes carry the gamma-coupled code and bursts the theta-coupled code, these changes could affect the two modes differently.</p></section>
    <section class="lesson-section"><p class="eyebrow">Pages</p><h2>How the pages fit together</h2>
      <div class="overview-cards rb-cards">${RS_PAGES.slice(1).map(([h, t, d], i) => `<a class="topic-card" href="${h}"><span class="eyebrow">${['BIOLOGY', 'BIOLOGY', 'DATA', 'MODEL', 'BEHAVIOUR', 'MODEL', 'METHOD', 'METHOD', 'METHOD', 'METHOD', 'CODE'][i] || 'PAGE'}</span><h2>${t}</h2><p>${d}</p><span class="card-link">Open →</span></a>`).join('')}</div></section>
    <section class="lesson-section"><p class="eyebrow">Lineage</p><h2>Where the models come from</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Year</th><th>Work</th><th>What it contributes here</th></tr></thead><tbody>
        <tr><td>1994</td><td>Pinsky &amp; Rinzel</td><td>Two-compartment reduction of a pyramidal cell: soma for spikes, dendrite for slow currents. The template of every two-compartment model here.</td></tr>
        <tr><td>2002–2009</td><td>Hu, Vervaeke, Storm</td><td>Experimental CA1 resonance: M-resonance (depolarised, amplified by NaP) and h-resonance (near rest, dendritic).</td></tr>
        <tr><td>2004–2006</td><td>Yue &amp; Yaari; Golomb, Yue &amp; Yaari</td><td>M current controls the afterdepolarisation and bursting; the one-compartment model whose kinetics every later model reuses.</td></tr>
        <tr><td>2018</td><td>Pena, Ceballos, Lima &amp; Roque</td><td>Resonance is set by the derivative conductance and the gate time constant: the reduction method.</td></tr>
        <tr><td>2018</td><td>Ceballos, Pena, Roque &amp; Leão</td><td>I<sub>NaP</sub> creates a zero slope conductance near threshold.</td></tr>
        <tr><td>2019, 2022</td><td>Pena et al.; Pena &amp; Rotstein</td><td>Nonlinear and 2-D resonant models; subthreshold resonance need not become spiking resonance.</td></tr>
        <tr><td>2023</td><td>Lowet et al.</td><td>Voltage imaging and optogenetics: bursts follow theta, single spikes gamma; minimal bursting model and Golomb + dendritic Iₕ model.</td></tr>
        <tr><td>2025</td><td>Ceballos, Chadly, Lowet &amp; Pena</td><td>Interleaved single-spike and burst resonance; bursts follow long silences.</td></tr>
        <tr><td>2025</td><td>Ceballos &amp; Pena</td><td>Dendritic integration under in vivo-like states: the next step for the dendritic compartment.</td></tr></tbody></table></div></section>
    <section class="lesson-section"><p class="eyebrow">Status</p><h2>Where the work stands</h2><ul>
      <li><b>Reproduced:</b> the interleaving itself, single-spike resonance above burst resonance for all gₕ, the onset of bursting with g<sub>NaP</sub>, and bursts following long silences (θ) vs short ones (γ). See <a href="/biology/research-reproduction/">Reproduction</a>.</li>
      <li><b>Not yet:</b> the paper’s g<sub>NaP</sub> and g<sub>Kdr</sub> trends; they hinge on which θ<sub>p</sub> goes with which g<sub>NaP</sub>.</li>
      <li><b>Reduction:</b> at the default operating point the ~12 Hz subthreshold resonance is set by I<sub>M</sub>; with the lab-code kinetics Iₕ is too slow to resonate (consistent with Hu et al. 2002: M-resonance dominates at depolarised potentials).</li>
      <li><b>Circuit:</b> in a toy CA1 network, bursts stay theta-locked; single spikes become the better gamma followers only when theta drive is removed, and removing the M current erases the bursts’ theta preference.</li></ul></section>
    ${rsNext('/biology/research/')}${rsRefs(['hutcheon00', 'hu02', 'hu09', 'yue04', 'golomb06', 'pinsky94', 'pena18', 'ceballos18', 'pena19', 'pena22', 'lowet23', 'ceballos25', 'ceballos25b', 'busche12', 'verret12', 'iacc16'], ['mdb55035', 'mdb244688', 'mdb187604'])}`;
}

/* ---------------------------------------------------------------- CA1 pyramidal cell */
function renderResearchCell() {
  document.title = 'The CA1 pyramidal neuron · My research';
  $('lesson').innerHTML = bioHead('The CA1 pyramidal neuron', 'MY RESEARCH · BIOLOGY',
    'The cell whose two output modes the models describe: its shape, where its inputs land, the ion channels that create resonance and bursts, and what is known about single spikes and bursts in vivo.')
    + `<nav class="page-jumps"><a href="#c-anat">Anatomy</a><a href="#c-chan">Ion channels</a><a href="#c-res">Resonance</a><a href="#c-modes">Firing modes</a><a href="#c-models">In the models</a><a href="#rs-refs">References</a></nav>
    <section class="lesson-section" id="c-anat"><p class="eyebrow">01 · Anatomy</p><h2>One cell across four layers</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Layer</th><th>Part of the cell</th><th>Main excitatory input</th></tr></thead><tbody>
        <tr><td>Stratum oriens</td><td>Basal dendrites; axon leaves through the alveus</td><td>CA3 Schaffer collaterals (and commissural fibres)</td></tr>
        <tr><td>Stratum pyramidale</td><td>Soma and axon initial segment</td><td>Perisomatic inhibition (basket and axo-axonic cells)</td></tr>
        <tr><td>Stratum radiatum</td><td>Apical trunk and oblique branches</td><td>CA3 Schaffer collaterals</td></tr>
        <tr><td>Stratum lacunosum-moleculare</td><td>Apical tuft</td><td>Entorhinal cortex layer III (temporoammonic path); nucleus reuniens</td></tr></tbody></table></div>
      <p>The proximal (CA3) and distal (entorhinal) inputs arrive on electrotonically distant parts of the tree, so how they combine depends on dendritic channels (Amaral &amp; Witter 1989; Spruston 2008). See the cells themselves in the <a href="/biology/cell-atlas/">Neuron studio</a>.</p></section>
    <section class="lesson-section" id="c-chan"><p class="eyebrow">02 · Ion channels</p><h2>The currents that set resonance and bursting</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Current (channel)</th><th>Where</th><th>Kinetics</th><th>Role</th><th>Evidence</th></tr></thead><tbody>
        <tr><td>Iₕ (HCN1)</td><td>Density rises several-fold from soma to distal apical dendrites</td><td>Activated by hyperpolarisation; slow, non-inactivating</td><td>Shortens dendritic EPSPs, normalises their timing; theta resonance near rest</td><td>Magee 1998; Hu et al. 2002, 2009</td></tr>
        <tr><td>I<sub>M</sub> (Kv7/KCNQ)</td><td>Soma and axon initial segment</td><td>Activates above about −60 mV; slow (tens of ms), non-inactivating</td><td>Limits the afterdepolarisation and bursting; theta resonance at depolarised potentials</td><td>Yue &amp; Yaari 2004; Hu et al. 2002; Golomb et al. 2006</td></tr>
        <tr><td>I<sub>NaP</sub> (persistent Na⁺)</td><td>Soma and axon</td><td>Fast activation, little inactivation, near threshold</td><td>Amplifies depolarisation and M-resonance; creates a zero slope conductance near threshold</td><td>Hu et al. 2002; Ceballos et al. 2018</td></tr>
        <tr><td>I<sub>A</sub> (Kv4.2)</td><td>Density rises with distance along the apical dendrite</td><td>Fast activation, inactivates</td><td>Limits back-propagating spikes and dendritic excitability</td><td>Hoffman et al. 1997</td></tr>
        <tr><td>Dendritic Na⁺, Ca²⁺ and NMDA spikes</td><td>Apical dendrites</td><td>Regenerative events</td><td>Drive complex-spike bursts and plasticity</td><td>Golding et al. 2002; Grienberger et al. 2014</td></tr>
        <tr><td>Ca²⁺-activated K⁺ (BK, SK, sAHP)</td><td>Soma and dendrites</td><td>Fast (BK) to seconds (sAHP)</td><td>Spike repolarisation and afterhyperpolarisations; adaptation</td><td>Golomb et al. 2006 (model)</td></tr></tbody></table></div></section>
    <section class="lesson-section" id="c-res"><p class="eyebrow">03 · Resonance</p><h2>Two theta resonances in one cell</h2>
      <p>A neuron resonates when a slow current opposes voltage changes: fast inputs are filtered by the membrane capacitance, slow ones are cancelled by the slow current, and inputs in between are passed best (Hutcheon &amp; Yarom 2000). Hu et al. (2002) found two theta resonances in rat CA1 pyramidal cells: an <b>M-resonance</b> at depolarised potentials, amplified by I<sub>NaP</sub>, and an <b>h-resonance</b> at more hyperpolarised potentials. They later showed the two are spatially segregated, perisomatic M and dendritic h (Hu et al. 2009). Resonance is also plastic: LTP changes it across the dendritic tree (Narayanan &amp; Johnston 2007).</p>
      <p class="nl-explain"><b>Link to the models.</b> The <a href="/biology/research-reduction/">reduction</a> of the 2025 model at its operating point (−55 mV) finds a ~12 Hz resonance set almost entirely by I<sub>M</sub>, as Hu et al. would predict for a depolarised cell. With the lab-code Iₕ kinetics (seconds near rest), Iₕ cannot produce theta resonance there; a faster Iₕ, as measured in CA1, would add an h-resonance near rest.</p></section>
    <section class="lesson-section" id="c-modes"><p class="eyebrow">04 · Firing modes</p><h2>Single spikes and complex-spike bursts</h2><ul>
      <li>CA1 pyramidal cells fire both isolated spikes and complex-spike bursts of 2–6 spikes at short intervals; whether a burst occurs depends on the cell’s recent firing history (Harris et al. 2001; Mizuseki et al. 2012).</li>
      <li>In vivo, bursts need dendritic NMDA-dependent Ca²⁺ spikes in several branches (Grienberger et al. 2014), and plateau potentials can create a place field in one trial (Bittner et al. 2017).</li>
      <li>In slices, blocking M channels enhances the afterdepolarisation and promotes bursting (Yue &amp; Yaari 2004); in a one-compartment model I<sub>M</sub> is the slow variable that terminates each burst (Golomb et al. 2006; <a href="/biology/ca1-bursting/">page</a>).</li>
      <li>In behaving mice, about a quarter of spikes are in bursts, and bursts lock to theta while single spikes lock to gamma (Lowet et al. 2023; <a href="/biology/research-lowet-2023/">page</a>).</li></ul></section>
    <section class="lesson-section" id="c-models"><p class="eyebrow">05 · In the models</p><h2>What each model keeps of this cell</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Model</th><th>Soma</th><th>Dendrite</th><th>Missing</th></tr></thead><tbody>
        <tr><td>Golomb et al. 2006</td><td>NaT, NaP, Kdr, KA, KM, Ca, BK-like, sAHP</td><td>—</td><td>All dendritic channels</td></tr>
        <tr><td>Lowet et al. 2023, minimal</td><td>Na, K (HH)</td><td>NaP, slow K</td><td>Iₕ, Ca²⁺ currents</td></tr>
        <tr><td>Lowet 2023 HCN model / Ceballos et al. 2025</td><td>Golomb currents</td><td>Leak + Iₕ</td><td>Dendritic Na⁺, Ca²⁺, NMDA spikes; A-type gradient</td></tr>
        <tr><td>Neuron studio (this site)</td><td>Na, Kdr, KA, Iₕ (Migliore 2005)</td><td>Full reconstructed morphology with gradients</td><td>I<sub>M</sub>, I<sub>NaP</sub>, Ca²⁺ currents</td></tr></tbody></table></div>
      <p>The gap in the last two rows suggests a concrete next model: the 2025 currents on a reconstructed CA1 morphology, with Iₕ and I<sub>A</sub> gradients.</p></section>
    ${rsNext('/biology/research-ca1-cell/')}${rsRefs(['amaral89', 'spruston08', 'magee98', 'hoffman97', 'hu02', 'hu09', 'narayanan07', 'hutcheon00', 'yue04', 'golomb06', 'ceballos18', 'staff00', 'golding02', 'grien14', 'bittner17', 'harris01', 'mizuseki12', 'lowet23'], ['mdb55035', 'mdb244688'])}`;
}

/* ---------------------------------------------------------------- circuit (toy network, same equations as ir_ladder/network.py) */
const RS_NET_RESULTS = [   // Python, 200 PYR / 40 PV / 20 OLM, 6 s: [name, PYR Hz, PV Hz, OLM Hz, burst-event fraction, VS theta SS, BS, VS gamma SS, BS]
  ['Intact', 29.7, 17.5, 7.6, 0.27, 0.42, 0.76, 0.13, 0.26], ['No PV → PYR', 34.9, 19.5, 12.8, 0.44, 0.35, 0.76, 0.27, 0.30],
  ['No OLM → PYR', 33.0, 18.9, 9.7, 0.33, 0.37, 0.77, 0.07, 0.22], ['Flat EC (no theta drive)', 21.0, 12.1, 0.0, 0.03, 0.12, 0.42, 0.35, 0.15],
  ['Flat CA3 (no gamma drive)', 27.0, 10.0, 5.8, 0.22, 0.47, 0.79, 0.14, 0.05], ['PYR without M current', 79.7, 35.7, 15.5, 0.47, 0.65, 0.53, 0.19, 0.12]];
const RS_CELL = { pyr: [1, 0.0361, -57.05, 4.39, -51.80, 0.5776, 75, 0.8805, -68.69, 0, 0.5], pv: [1, 0.1, -65, 1, -52, 0, 10, 0, -62, 0, 1], olm: [1, 0.05, -64, 2, -52, 0.15, 120, 0.15, -56, 0, 1] };
function rsPoisson(l) { if (l <= 0) return 0; if (l > 30) return Math.max(0, Math.round(l + Math.sqrt(l) * irGauss())); let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= irRand(); } while (p > L); return k - 1; }
/* Step-able toy circuit: O is read live (input strengths, modulation, inhibition scale, M current on/off). */
function rsNetMake(o) {
  irSeed = o.seed; const ne = o.ne, np = o.np, no = o.no, N = ne + np + no, dt = 0.05;
  const rnd = () => irRand(), W = (a, b, p, g) => { const M = []; for (let i = 0; i < a; i++) { const r = new Float64Array(b); for (let j = 0; j < b; j++) if (rnd() < p) r[j] = g / Math.max(1, p * b) * 10; M.push(r); } return M; };
  const Wep = W(np, ne, 0.2, 0.01), Weo = W(no, ne, 0.2, 0.01), Wpe = W(ne, np, 0.3, 0.012), Wpp = W(np, np, 0.3, 0.01), Woe = W(ne, no, 0.3, 0.006);
  const VTj = new Float64Array(N); for (let i = 0; i < ne; i++) VTj[i] = irGauss();
  const pyrM = RS_CELL.pyr, pyr0 = RS_CELL.pyr.map((v, k) => k === 5 || k === 7 ? 0 : v);
  const V = new Float64Array(N), w = new Float64Array(N), ref = new Float64Array(N), ge = new Float64Array(N), gi = new Float64Array(N), go = new Float64Array(N), fired = new Uint8Array(N);
  for (let i = 0; i < N; i++) V[i] = (i < ne ? pyrM : i < ne + np ? RS_CELL.pv : RS_CELL.olm)[2];
  const da = Math.exp(-dt / 3), dg = Math.exp(-dt / 8), dO = Math.exp(-dt / 20), net = { t: 0, spk: [] };
  net.step = ms => { const nst = Math.round(ms / dt), pyr = o.noM ? pyr0 : pyrM, spe = o.gpe / 0.012, soe = o.goe / 0.006;
    for (let k = 0; k < nst; k++) {
      const t = net.t, th = Math.cos(2 * Math.PI * o.fth * 1e-3 * t), gm = Math.cos(2 * Math.PI * o.fga * 1e-3 * t);
      const rec = Math.max(800 * (1 + o.ecm * th) * 1e-3 * dt, 0), rca = Math.max(800 * (1 + o.cam * gm) * (1 + o.nest * th) * 1e-3 * dt, 0);
      for (let i = 0; i < ne; i++) ge[i] += o.gec * rsPoisson(rec) + o.gca * rsPoisson(rca);
      for (let i = ne; i < ne + np; i++) ge[i] += 0.006 * rsPoisson(rca);
      for (let j = 0; j < N; j++) if (fired[j]) {
        if (j < ne) { for (let i = 0; i < np; i++) ge[ne + i] += Wep[i][j]; for (let i = 0; i < no; i++) ge[ne + np + i] += Weo[i][j]; }
        else if (j < ne + np) { const jj = j - ne; for (let i = 0; i < ne; i++) gi[i] += Wpe[i][jj] * spe; for (let i = 0; i < np; i++) gi[ne + i] += Wpp[i][jj]; }
        else { const jj = j - ne - np; for (let i = 0; i < ne; i++) go[i] += Woe[i][jj] * soe; }
      }
      for (let i = 0; i < N; i++) {
        const c = i < ne ? pyr : i < ne + np ? RS_CELL.pv : RS_CELL.olm, Ib = i >= ne + np ? 0.6 : 0, VT = c[4] + (i < ne ? VTj[i] : 0); fired[i] = 0;
        const dw = (c[5] * (V[i] - c[2]) - w[i]) / c[6];
        if (ref[i] > 0) ref[i] -= dt; else { const Is = ge[i] * (0 - V[i]) + (gi[i] + go[i]) * (-75 - V[i]); V[i] += dt * (-c[1] * (V[i] - c[2]) + c[1] * c[3] * Math.exp(Math.min((V[i] - VT) / c[3], 30)) - w[i] + Ib + Is) / c[0]; }
        w[i] += dt * dw;
        if (V[i] >= c[9]) { V[i] = c[8]; w[i] += c[7]; ref[i] = c[10]; fired[i] = 1; net.spk.push([t + dt, i]); }
        ge[i] *= da; gi[i] *= dg; go[i] *= dO;
      }
      net.t += dt;
    }
    let cut = 0; while (cut < net.spk.length && net.spk[cut][0] < net.t - 2100) cut++; if (cut) net.spk.splice(0, cut); };
  return net;
}
function rsNet(o) { const n = rsNetMake(o); n.step(o.T); return n.spk; }
function rsNetAnalyse(spk, o, t0 = 300) {
  const ne = o.ne, dur = (o.T - t0) / 1000, per = [...Array(ne)].map(() => []); let npv = 0, nol = 0;
  spk.forEach(([t, i]) => { if (t < t0) return; if (i < ne) per[i].push(t); else if (i < ne + o.np) npv++; else nol++; });
  const ss = [], bs = []; per.forEach(s => s.forEach((t, k) => { if (k && t - s[k - 1] < 14) return; (s[k + 1] !== undefined && s[k + 1] - t < 14 ? bs : ss).push(t); }));
  const vs = (x, f) => { if (x.length < 5) return NaN; let c = 0, s = 0; x.forEach(t => { c += Math.cos(2 * Math.PI * f * 1e-3 * t); s += Math.sin(2 * Math.PI * f * 1e-3 * t); }); return Math.hypot(c, s) / x.length; };
  const nsp = per.reduce((a, s) => a + s.length, 0);
  return { pyr: nsp / ne / dur, pv: npv / o.np / dur, olm: nol / o.no / dur, bfrac: bs.length / Math.max(1, ss.length + bs.length), ssTh: vs(ss, o.fth), bsTh: vs(bs, o.fth), ssGa: vs(ss, o.fga), bsGa: vs(bs, o.fga), ss, bs };
}
function renderResearchCircuit() {
  document.title = 'CA1 circuit: theta, gamma and two output modes · My research';
  $('lesson').innerHTML = bioHead('CA1 circuit: theta, gamma and two output modes', 'MY RESEARCH · BIOLOGY AND A TOY NETWORK',
    'Where CA1 pyramidal cells get theta and gamma from, which interneurons shape their timing, and a small network model that asks whether the single-cell result (bursts follow theta, single spikes follow gamma) survives inside a circuit.')
    + `<nav class="page-jumps"><a href="#n-in">Inputs</a><a href="#n-int">Interneurons</a><a href="#n-rhy">Theta and gamma</a><a href="#n-sim">Toy circuit</a><a href="#n-res">Results</a><a href="#rs-refs">References</a></nav>
    <section class="lesson-section" id="n-in"><p class="eyebrow">01 · Inputs</p><h2>Two excitatory pathways, two rhythms</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Pathway</th><th>Lands on</th><th>Rhythm it carries</th></tr></thead><tbody>
        <tr><td>CA3 → CA1 (Schaffer collaterals)</td><td>Radiatum and oriens dendrites</td><td>Slow gamma (~25–50 Hz) coupled to CA3 (Colgin et al. 2009)</td></tr>
        <tr><td>Entorhinal cortex layer III → CA1 (temporoammonic)</td><td>Lacunosum-moleculare tuft</td><td>Fast gamma (~65–140 Hz) coupled to medial entorhinal cortex (Colgin et al. 2009); a major theta current generator (Buzsáki 2002)</td></tr>
        <tr><td>Medial septum (cholinergic and GABAergic)</td><td>Interneurons and pyramidal cells</td><td>Paces theta, largely through interneurons (Buzsáki 2002)</td></tr></tbody></table></div></section>
    <section class="lesson-section" id="n-int"><p class="eyebrow">02 · Interneurons</p><h2>Who inhibits which part of the cell, and when</h2>
      <p>Interneuron classes target different domains of the pyramidal cell and fire at characteristic phases of theta and gamma (Klausberger &amp; Somogyi 2008). Quantitative cell counts and connection probabilities for CA1 are compiled in Bezaire &amp; Soltesz (2013) and were used to build a full-scale CA1 network that generates theta from interneurons (Bezaire et al. 2016).</p>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Class</th><th>Target on the pyramidal cell</th><th>Role relevant here</th></tr></thead><tbody>
        <tr><td>PV basket cells</td><td>Soma and proximal dendrites</td><td>Gamma rhythm generation; timing of single spikes</td></tr>
        <tr><td>Axo-axonic (chandelier) cells</td><td>Axon initial segment</td><td>Control of spike initiation</td></tr>
        <tr><td>Bistratified cells</td><td>Oriens and radiatum dendrites, alongside CA3 input</td><td>Gating of Schaffer input</td></tr>
        <tr><td>OLM cells</td><td>Lacunosum-moleculare tuft, alongside EC input</td><td>Theta-rhythmic gating of entorhinal input; strong Iₕ</td></tr>
        <tr><td>CCK basket cells</td><td>Soma</td><td>Behaviour-dependent, cannabinoid-sensitive inhibition</td></tr></tbody></table></div></section>
    <section class="lesson-section" id="n-rhy"><p class="eyebrow">03 · Theta and gamma</p><h2>Rhythms and the two output modes</h2>
      <p>Theta (4–12 Hz) dominates the hippocampus during exploration (Buzsáki 2002); gamma is nested in it, with slow and fast gamma routing CA3 and entorhinal information at different theta phases (Colgin et al. 2009). Lowet et al. (2023) showed that in CA1 bursts phase-lock to theta and single spikes to gamma, and that 8 Hz versus 40 Hz optogenetic drive selectively increases bursts versus single spikes. The <a href="/biology/research-reproduction/">model work</a> shows each mode has its own preferred frequency within one cell; the toy circuit below asks what happens when the rhythms come from inputs and interneurons instead of an injected sinusoid.</p></section>
    <section class="lesson-section lab" id="n-sim"><p class="eyebrow">04 · Toy circuit</p><h2>Pyramidal cells, PV and OLM interneurons, EC theta and CA3 gamma</h2>
      <p class="ux-desc">The circuit runs live (default ¼× so you can follow the theta cycle); every slider acts immediately. Pyramidal cells are the AdEx fitted to the biophysical model (its slow variable is the linearised I<sub>M</sub>). EC input is theta-modulated; CA3 input is gamma-modulated with theta-nested amplitude and also drives PV cells; PV inhibits pyramidal somata, OLM cells give slow distal-like inhibition. This is a hypothesis-testing toy, not a calibrated CA1 model: rates correspond to in-field firing.</p>
      <div class="ux-wrap"><div class="ux-s1">
        ${ngLiveBar('nsLive', 0.25)}<span id="nsSt" class="ux-status" hidden></span>
        <div class="ux-fig"><canvas id="nsRas" class="ux-cv" style="height:300px" aria-label="Raster plot of the network"></canvas>
          <p class="ux-note"><b>Figure 1.</b> Raster: pyramidal cells (bottom; blue = single-spike events, purple = burst spikes), PV (orange) and OLM (green). Grey and pink bands at the top mark the theta and gamma input cycles.</p></div>
        <div class="ux-fig"><div class="ux-figh"><b>Figure 2.</b><span class="ux-status">live, same simulation as Figure 1</span></div>
          <canvas id="nsAna" class="ux-cv" style="height:340px" aria-label="Animated anatomical view of the CA1 circuit"></canvas>
          <p class="ux-note"><b>Figure 2.</b> The same run laid out by layer: OLM cells in oriens, pyramidal and PV cells in pyramidale, the Schaffer (CA3) input in radiatum and the temporoammonic (EC) input in lacunosum-moleculare. A cell lights up for 6 ms after each spike (pyramidal: blue single, purple burst). The bars on the left show the instantaneous EC theta and CA3 gamma drive.</p></div>
      </div><div class="ux-s2"><div class="ux-fig" id="nsOut"></div></div>
      <aside class="ux-panel" aria-label="Circuit settings"><div class="ux-pane">
        ${[['gec', 'EC → PYR strength', 0, 0.05, 0.001], ['gca', 'CA3 → PYR strength', 0, 0.03, 0.001], ['ecm', 'EC theta modulation depth', 0, 1, 0.05], ['cam', 'CA3 gamma modulation depth', 0, 1, 0.05], ['gpe', 'PV → PYR inhibition', 0, 0.03, 0.001], ['goe', 'OLM → PYR inhibition', 0, 0.02, 0.001]].map(([k, l, a, b, s]) => `<div class="ux-sl"><label for="ns-${k}">${l}</label><span class="ux-val"><input class="ux-num" type="number" id="ns-${k}n" min="${a}" max="${b}" step="${s}"></span><input type="range" id="ns-${k}" min="${a}" max="${b}" step="${s}"></div>`).join('')}
        <label class="nl-inl ux-chk"><input type="checkbox" id="nsNoM"> Pyramidal cells without I<sub>M</sub> (a = b = 0)</label>
        <p class="ux-note">80 pyramidal, 16 PV and 8 OLM cells here (the Python version uses 200 / 40 / 20 and 6 s).</p></div></aside></div></section>
    <section class="lesson-section" id="n-res"><p class="eyebrow">05 · Results</p><h2>What the circuit does (Python, 200 / 40 / 20 cells, 6 s)</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Condition</th><th>PYR · PV · OLM (Hz)</th><th>Burst events</th><th>Theta locking SS · BS</th><th>Gamma locking SS · BS</th></tr></thead><tbody>
        ${RS_NET_RESULTS.map(r => `<tr><td>${r[0]}</td><td>${r[1]} · ${r[2]} · ${r[3]}</td><td>${Math.round(r[4] * 100)} %</td><td>${r[5].toFixed(2)} · <b>${r[6].toFixed(2)}</b></td><td>${r[7].toFixed(2)} · ${r[8].toFixed(2)}</td></tr>`).join('')}</tbody></table></div>
      <p class="ux-note">Locking is the vector strength (0 = none, 1 = perfect) of event times relative to the input cycle.</p><ul>
      <li><b>Bursts are theta-locked</b> (vector strength 0.76 vs 0.42 for single spikes), as in Lowet et al. (2023). About a quarter of events are bursts, close to the ~28 % of spikes in bursts they report.</li>
      <li><b>Single spikes are not the better gamma followers in the intact circuit.</b> Bursts start at theta peaks, where theta-nested gamma is strongest, so they inherit gamma locking. With theta drive removed, single spikes lock to gamma (0.35) more than bursts (0.15). A testable prediction: the single-spike gamma preference should be clearest when theta input is weak.</li>
      <li><b>The M current gives bursts their theta preference.</b> Without it, rates triple and bursts lock to theta less than single spikes, consistent with I<sub>M</sub> as the slow variable that ends each burst (Golomb et al. 2006).</li>
      <li>Removing PV inhibition raises the burst fraction (27 → 44 %); in AD mouse models PV interneurons are impaired (Verret et al. 2012), so this is one route by which the balance of output modes could shift.</li></ul></section>
    ${rsNext('/biology/research-circuit/')}${rsRefs(['amaral89', 'buzsaki02', 'colgin09', 'klaus08', 'bezaire13', 'bezaire16', 'lowet23', 'golomb06', 'brette05', 'verret12'])}`;
  const O = { ne: 80, np: 16, no: 8, T: 2000, seed: 3, fth: 8, fga: 40, gec: 0.024, gca: 0.008, ecm: 0.8, cam: 0.8, nest: 0.6, gpe: 0.012, goe: 0.006, noM: false };
  const later = () => {};   // live: O is read on every step
  ['gec', 'gca', 'ecm', 'cam', 'gpe', 'goe'].forEach(k => { const r = $('ns-' + k), n = $('ns-' + k + 'n'); r.value = n.value = O[k]; r.oninput = () => { O[k] = +r.value; n.value = r.value; later(); }; n.onchange = () => { O[k] = +n.value; r.value = n.value; later(); }; });
  $('nsNoM').onchange = e => { O.noM = e.target.checked; };
  let last = null, NET = null, LV = null, fcn = 0;
  const newNet = () => { NET = rsNetMake(O); last = { spk: NET.spk, t0: 0 }; };
  function drawLive() {
    if (!NET || !$('nsRas')) return; const t1 = NET.t, t0 = Math.max(0, t1 - O.T); last = { spk: NET.spk, t0 }; fr = t1; draw(); drawAna();
    if (fcn++ % 15 === 0 && t1 > 400) { const win = NET.spk.filter(([t]) => t >= Math.max(300, t0)).map(([t, i]) => [t - Math.max(300, t0), i]), a = rsNetAnalyse(win, Object.assign({}, O, { T: t1 - Math.max(300, t0) }), 0);
      const f = v => isNaN(v) ? '–' : v.toFixed(2);
      $('nsOut').innerHTML = `<b>Last ${((t1 - Math.max(300, t0)) / 1000).toFixed(1)} s</b> · PYR ${a.pyr.toFixed(1)} · PV ${a.pv.toFixed(1)} · OLM ${a.olm.toFixed(1)} Hz · burst events ${Math.round(a.bfrac * 100)} %<br><b>Theta locking</b> single ${f(a.ssTh)} · burst ${f(a.bsTh)} &nbsp; <b>Gamma locking</b> single ${f(a.ssGa)} · burst ${f(a.bsGa)}<br><span class="ux-note">Phase locking needs a few seconds of data; the Python numbers below use 6 s and 200 cells.</span>`; }
  }
  function run() { if (LV) LV.restart(); }
  function draw() {
    const cv = $('nsRas'); if (!cv || !last) return; const T0 = last.t0, [x, W, H] = gyCanvas(cv), N = O.ne + O.np + O.no, L = 40, R = W - 10, T = 22, B = H - 26, X = t => L + (R - L) * (t - T0) / O.T, Y = i => B - (B - T) * (i + 0.5) / N;
    x.save(); x.beginPath(); x.rect(L, 0, R - L, H); x.clip();
    for (let t = Math.floor(T0 * O.fth / 1000) * 1000 / O.fth; t < T0 + O.T; t += 1000 / O.fth) { x.fillStyle = 'rgba(120,100,80,.10)'; x.fillRect(X(t), 2, X(t + 500 / O.fth) - X(t), 8); }
    for (let t = Math.floor(T0 * O.fga / 1000) * 1000 / O.fga; t < T0 + O.T; t += 1000 / O.fga) { x.fillStyle = 'rgba(166,41,98,.12)'; x.fillRect(X(t), 12, X(t + 500 / O.fga) - X(t), 6); }
    const bset = new Set(); const per = [...Array(O.ne)].map(() => []); last.spk.forEach(([t, i]) => { if (i < O.ne) per[i].push(t); });
    per.forEach((s, i) => s.forEach((t, k) => { if ((k && t - s[k - 1] < 14) || (s[k + 1] !== undefined && s[k + 1] - t < 14)) bset.add(i + ':' + t); }));
    last.spk.forEach(([t, i]) => { if (t < T0) return; x.fillStyle = i < O.ne ? (bset.has(i + ':' + t) ? '#a62962' : '#2f6f9f') : i < O.ne + O.np ? '#d08a2e' : '#2f7d5b'; x.fillRect(X(t), Y(i) - 1, 1.6, 2.4); });
    x.restore(); x.fillStyle = '#6f4c27'; x.font = '11px system-ui'; x.fillText('PYR', 4, Y(O.ne / 2)); x.fillText('PV', 4, Y(O.ne + O.np / 2)); x.fillText('OLM', 4, Y(N - O.no / 2)); x.textAlign = 'center';
    gyTicks(T0, T0 + O.T, 4).forEach(t => { if (X(t) > L + 20 && X(t) < R - 20) x.fillText(t + ' ms', X(t), H - 8); }); x.textAlign = 'left';
  }
  /* anatomical animation */
  let fr = 0, playing = false, lay = null;
  function layout() {
    const r = n => { const a = []; for (let i = 0; i < n; i++) a.push(irRand()); return a; }; irSeed = 77;
    lay = { pyr: r(O.ne).map((u, i) => [0.08 + 0.84 * (i + 0.5) / O.ne, 0.52 + 0.03 * (u - 0.5)]), pv: r(O.np).map((u, i) => [0.1 + 0.8 * (i + 0.5) / O.np, 0.58 + 0.02 * (u - 0.5)]), olm: r(O.no).map((u, i) => [0.12 + 0.76 * (i + 0.5) / O.no, 0.26 + 0.04 * (u - 0.5)]) };
  }
  function drawAna() {
    const cv = $('nsAna'); if (!cv || !last) return; if (!lay) layout(); const [x, W, H] = gyCanvas(cv), t = fr, L = 70, X = u => L + (W - L - 10) * u, Y = v => 10 + (H - 20) * v;
    const layers = [['alveus', 0, 0.06], ['stratum oriens', 0.06, 0.45], ['stratum pyramidale', 0.45, 0.62], ['stratum radiatum', 0.62, 0.86], ['lacunosum-moleculare', 0.86, 1]];
    layers.forEach(([n, a, b], j) => { x.fillStyle = j % 2 ? '#fbf6ef' : '#f4ece2'; x.fillRect(L, Y(a), W - L - 10, Y(b) - Y(a)); x.fillStyle = '#8a7058'; x.font = '10.5px system-ui'; x.fillText(n, L + 6, Y(a) + 12); });
    const th = Math.cos(2 * Math.PI * O.fth * 1e-3 * t), gm = Math.cos(2 * Math.PI * O.fga * 1e-3 * t), ec = Math.max(0, 1 + O.ecm * th) / 2, ca = Math.max(0, (1 + O.cam * gm) * (1 + O.nest * th)) / 4;
    x.fillStyle = 'rgba(208,138,46,.85)'; x.fillRect(14, Y(0.93) - 40 * ec, 16, 40 * ec); x.fillStyle = 'rgba(166,41,98,.85)'; x.fillRect(38, Y(0.74) - 40 * ca, 16, 40 * ca);
    x.fillStyle = '#3a2a1c'; x.font = '10px system-ui'; x.fillText('EC θ', 10, Y(0.93) + 12); x.fillText('CA3 γ', 34, Y(0.74) + 12);
    // apical dendrites
    x.strokeStyle = 'rgba(120,100,80,.18)'; lay.pyr.forEach(([u, v]) => { x.beginPath(); x.moveTo(X(u), Y(v)); x.lineTo(X(u), Y(0.97)); x.stroke(); x.beginPath(); x.moveTo(X(u), Y(v)); x.lineTo(X(u) - 4, Y(0.38)); x.moveTo(X(u), Y(v)); x.lineTo(X(u) + 4, Y(0.38)); x.stroke(); });
    const recent = new Map(); last.spk.forEach(([ts, i]) => { if (ts <= t && ts > t - 6) recent.set(i, ts); });
    const per = new Map(); last.spk.forEach(([ts, i]) => { if (i < O.ne && Math.abs(ts - t) < 30) (per.get(i) || per.set(i, []).get(i)).push(ts); });
    const isB = (i, ts) => (per.get(i) || []).some(o => o !== ts && Math.abs(o - ts) < 14);
    const dot = (u, v, r, col, on) => { x.fillStyle = on ? col : 'rgba(150,135,120,.35)'; x.beginPath(); x.arc(X(u), Y(v), on ? r + 2 : r, 0, 7); x.fill(); };
    lay.pyr.forEach(([u, v], i) => { const ts = recent.get(i); x.save(); if (ts !== undefined) { x.shadowColor = isB(i, ts) ? '#a62962' : '#2f6f9f'; x.shadowBlur = 8; } dot(u, v, 2.6, ts !== undefined && isB(i, ts) ? '#a62962' : '#2f6f9f', ts !== undefined); x.restore(); });
    lay.pv.forEach(([u, v], j) => dot(u, v, 3.2, '#d08a2e', recent.has(O.ne + j)));
    lay.olm.forEach(([u, v], j) => { const on = recent.has(O.ne + O.np + j); dot(u, v, 3.6, '#2f7d5b', on); if (on) { x.strokeStyle = 'rgba(47,125,91,.5)'; x.beginPath(); x.moveTo(X(u), Y(v)); x.lineTo(X(u), Y(0.92)); x.stroke(); } });
    x.fillStyle = '#3a2a1c'; x.font = '11px system-ui'; x.fillText(`t = ${t.toFixed(0)} ms · θ phase ${((Math.atan2(Math.sin(2 * Math.PI * O.fth * 1e-3 * t), th) * 180 / Math.PI + 360) % 360).toFixed(0)}°`, W - 190, H - 8);
  }
  newNet(); LV = ngLive({ bar: 'nsLive', step: ms => NET.step(ms), draw: drawLive, reset: newNet, chunk: 1 }); LV.play();
  window.addEventListener('resize', () => { if ($('nsRas')) { draw(); drawAna(); } });
}

/* ---------------------------------------------------------------- Lowet et al. 2023 */
function renderResearchLowet() {
  document.title = 'Lowet et al. 2023 · My research';
  $('lesson').innerHTML = bioHead('Theta and gamma coding through two spike output modes', 'MY RESEARCH · DATA · LOWET ET AL. 2023, CELL REPORTS',
    'The experimental study that motivates the models: membrane voltage imaging of CA1 pyramidal cells in behaving mice shows that bursts and single spikes follow different rhythms, and optogenetic rhythmic drive shows this is causal.')
    + `<nav class="page-jumps"><a href="#l-exp">Experiments</a><a href="#l-res">Findings</a><a href="#l-mod">Models</a><a href="#l-use">What the ladder takes</a><a href="#rs-refs">References</a></nav>
    <section class="lesson-section" id="l-exp"><p class="eyebrow">01 · Experiments</p><h2>Voltage imaging in awake mice</h2><ul>
      <li>Genetically encoded voltage indicator SomArchon in CA1 pyramidal cells of head-fixed mice running on a ball (56 neurons), giving subthreshold membrane potential and spikes in the same recording.</li>
      <li>Tetrode recordings in rats during spatial navigation for place-field coding.</li>
      <li>Optogenetic depolarisation (CoChR) at 8 Hz and 40 Hz, and sustained light, in the same cells.</li></ul></section>
    <section class="lesson-section" id="l-res"><p class="eyebrow">02 · Findings</p><h2>Bursts follow theta, single spikes follow gamma</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Measure</th><th>Result</th></tr></thead><tbody>
        <tr><td>Burst definition</td><td>Spikes with ISI &lt; 10 ms (thresholds of 6–15 ms and a surprise-based detector gave the same conclusions)</td></tr>
        <tr><td>Spikes in bursts</td><td>28.2 ± 17.1 % (median ± SD, n = 56 imaged neurons); 28.8 ± 13.9 % in rat tetrode data (n = 147)</td></tr>
        <tr><td>Intra-burst interval</td><td>8.4 ± 1.9 ms (mean ± SD)</td></tr>
        <tr><td>After-depolarisation</td><td>Larger after the first spike of a burst (28.1 % of spike peak) than after single spikes (5.6 %)</td></tr>
        <tr><td>Phase locking to membrane theta</td><td>Bursts &gt; single spikes</td></tr>
        <tr><td>Phase locking to membrane gamma (30–90 Hz)</td><td>Single spikes &gt; bursts</td></tr>
        <tr><td>Same comparisons against the LFP</td><td>Same direction for theta and gamma</td></tr>
        <tr><td>8 Hz optogenetic drive</td><td>Burst rate increases; single-spike rate does not</td></tr>
        <tr><td>40 Hz optogenetic drive</td><td>Single-spike rate increases and entrains; burst rate does not</td></tr>
        <tr><td>Trial-by-trial</td><td>Burst-rate change tracks membrane theta power; single-spike change tracks gamma power</td></tr>
        <tr><td>Place fields (rats)</td><td>Bursts carry more spatial information and show stronger theta phase precession</td></tr></tbody></table></div></section>
    <section class="lesson-section" id="l-mod"><p class="eyebrow">03 · Models</p><h2>Two models in the paper’s code</h2>
      <p><b>Minimal four-current model</b> (MATLAB, dXdT_HH_3.m): soma with HH Na⁺ and K⁺; dendrite with persistent Na⁺ and a slow K⁺ current; Pinsky–Rinzel coupling g<sub>c</sub>/p and g<sub>c</sub>/(1−p) with p = 0.15. With theta, gamma-band noise and white noise to the dendrite, bursts lock to theta and single spikes to gamma, and bursts carry more place information. It is the “Minimal bursting” rung of the <a href="/biology/interleaved-resonance/">ladder</a>.</p>
      <p><b>Golomb + dendritic Iₕ model</b> (Python, class HHca2 in ca1.ipynb): the Golomb et al. 2006 soma coupled (0.2 mS/cm²) to a dendrite with leak and Iₕ (reversal −32.9 mV). It reproduces the same pattern; adding NMDA raises burst probability. This is the model Ceballos et al. 2025 extend, and its code resolves several ambiguities in that paper’s Table 1 (<a href="/biology/research-reproduction/">Reproduction</a>).</p></section>
    <section class="lesson-section" id="l-use"><p class="eyebrow">04 · What the ladder takes from it</p><h2>From data to model to prediction</h2><ul>
      <li>The burst definition used in every analysis here is ISI &lt; 14 ms, taken from Ceballos et al. 2025 (Methods). Lowet et al. used &lt; 10 ms but showed 6–15 ms gives the same result; their ~8 ms intra-burst intervals fall inside both.</li>
      <li>The θ (8 Hz) versus γ (40 Hz) contrast for stimulation and sweeps.</li>
      <li>The target pattern for the <a href="/biology/research-circuit/">toy circuit</a>: bursts theta-locked, single spikes gamma-locked. The circuit reproduces the first; the second appears only when theta drive is weak.</li></ul></section>
    ${rsNext('/biology/research-lowet-2023/')}${rsRefs(['lowet23', 'ceballos25', 'golomb06', 'pinsky94', 'harris01', 'buzsaki02', 'colgin09'])}`;
}

/* ---------------------------------------------------------------- code */
const RS_CODE = [
  ['ir_ladder/params.py', 'Parameter readings (Table 1, lab code, hybrid) and the list of open questions'],
  ['ir_ladder/fast.py', 'numba kernels: two-point LIF, GLIF 1–5, AdEx, biophysical two-compartment HH (N neurons in parallel)'],
  ['ir_ladder/run.py', 'run(model, P, N, T, Iapp, A1, f1, A2, f2, site, D): one call, N stimulus conditions'],
  ['ir_ladder/analysis.py', 'Paper analysis: events at ISI < 14 ms (Ceballos et al. 2025), single-spike/burst resonance, Δf, ΔA, silence-before-burst'],
  ['ir_ladder/reduce.py', 'Steady state, Jacobian, exact linear impedance, derivative conductances, 2-D reduction'],
  ['ir_ladder/fit.py', 'Fits AdEx and GLIF to the HH model (f–I curve and burst/single-spike rates)'],
  ['ir_ladder/network.py', 'Toy CA1 circuit (PYR, PV, OLM; EC theta, CA3 gamma) and phase-locking analysis'],
  ['ir_ladder/models.py', 'Plain-numpy reference versions used to cross-check the kernels'],
  ['validate.py', 'All checks: Golomb spike times, Fig 1, readings, linearisation vs simulation'],
  ['scripts/paper_fig3_sweep.py', 'Resonant frequencies against g_NaP, g_Kdr, g_h'],
  ['scripts/settings_sensitivity.py', 'Fig 3 trends under other readings'],
  ['scripts/silence_before_burst.py', 'P(burst | preceding silence), θ only / γ only / θ+γ'],
  ['scripts/fit_reduced_models.py', 'AdEx and GLIF fits'],
  ['scripts/network_ablation.py', 'Circuit ablations (PV, OLM, EC theta, CA3 gamma, M current)']];
function renderResearchCode() {
  document.title = 'Python code · My research';
  $('lesson').innerHTML = bioHead('Python code: ir_ladder', 'MY RESEARCH · CODE',
    'Every number on these pages comes from this package. It needs numpy, scipy and numba; the kernels are about 600× faster than a pure-Python loop and simulate many stimulus conditions in parallel.')
    + `<section class="lesson-section"><p class="eyebrow">Download</p><h2>Get the package</h2>
      <p>Each file can be opened below as plain text (save it with the name in the left column). Together they form the ir_ladder package (keep the folder layout: <code>ir_ladder/</code> for the modules, <code>scripts/</code> for the scripts).</p>
      <pre class="code"><code>pip install numpy scipy numba
unzip ir_ladder.zip &amp;&amp; cd ir_ladder
python validate.py                      # ~3 min: every check behind the pages
python scripts/paper_fig3_sweep.py      # writes sweep2_results.json</code></pre></section>
    <section class="lesson-section"><p class="eyebrow">Contents</p><h2>Files</h2>
      <div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>File</th><th>What it does</th></tr></thead><tbody>${RS_CODE.map(([f, d]) => `<tr><td><a href="code/${f.replace(/\//g, '_')}.txt" target="_blank" rel="noopener"><code>${f}</code></a></td><td>${d}</td></tr>`).join('')}<tr><td><a href="code/README.md.txt" target="_blank" rel="noopener"><code>README.md</code></a></td><td>Overview, checks and reproduction status</td></tr></tbody></table></div></section>
    <section class="lesson-section"><p class="eyebrow">Example</p><h2>A resonance sweep in five lines</h2>
      <pre class="code"><code>import numpy as np
from ir_ladder.params import hh_params
from ir_ladder.run import run
from ir_ladder.analysis import resonance

f = np.array([2, 4, 6, 8, 10, 12, 16, 20, 30, 40, 60, 80, 100.])
P = hh_params(gating='hybrid')                       # θp −35 from Table 1, other gates from the lab code
r = run('hh2', P, N=len(f), T=4000, Iapp=1.0, A1=2.0, f1=f, site='both')
R = resonance(f, r, t0=500, T=4000)
print(R['f_ss'], R['f_bs'], R['df'], R['dA'])        # single-spike and burst resonant frequencies</code></pre></section>
    <section class="lesson-section"><p class="eyebrow">Checks</p><h2>How the code was validated</h2><ul>
      <li>Soma equations reproduce the spike times of Golomb et al. 2006 Fig 6Da exactly (67 spikes in 2 s), which also match the browser version and the authors’ XPPAUT screenshot.</li>
      <li>The numba kernel and the plain-numpy version give identical spike times.</li>
      <li>The linearised impedance matches simulations with a 0.02 µA/cm² sinusoid within 1.5 kΩ·cm² at 2–40 Hz.</li>
      <li>The browser’s reduction (Jacobian, impedance, derivative conductances) matches the Python values to four decimals.</li></ul></section>
    ${rsNext('/biology/research-code/')}${rsRefs(['ceballos25', 'lowet23', 'golomb06', 'pena18', 'brette05'], ['mdb55035', 'mdb244688', 'mdb187604', 'allensdk'])}`;
}
Object.assign(window, { renderResearchHub, renderResearchCell, renderResearchCircuit, renderResearchLowet, renderResearchCode });
/* Page: /biology/research-morphology/ — the research currents (Golomb I_M and I_NaP) on reconstructed CA1 pyramidal cells
   with the Migliore 2005 dendritic channels (Na, Kdr, A-type gradient, Iₕ gradient). Animated voltage on the tree,
   single-spike / burst classification, and a chirp impedance tool for the two theta resonances (Hu et al. 2002). */
const RM_CELLS = [['ca1-a', 'mpg141209_A (Migliore 2018 cell)'], ['ca1-b', 'mpg141208_B (Migliore 2018 cell)'], ['ca1-jarsky', 'Jarsky et al. 2005 cell'], ['ca1-5038804', 'Golding/Spruston cell 5038804']];
const RM_CH = [['gM', 'I<sub>M</sub> at soma + axon (Golomb kinetics)', 'mS/cm²', 0, 5, 0.05, 1e-3], ['gNaP', 'I<sub>NaP</sub> at soma + axon', 'mS/cm²', 0, 0.6, 0.01, 1e-3], ['thp', 'I<sub>NaP</sub> half-activation θ<sub>p</sub>', 'mV', -55, -35, 0.5, 1],
  ['hS', 'Iₕ density × (Migliore gradient)', '×', 0, 3, 0.05, 1], ['kaS', 'A-type density ×', '×', 0, 2, 0.05, 1], ['naS', 'Na⁺ density ×', '×', 0.3, 2, 0.05, 1]];
const RM_IN = [['Iapp', 'DC current at the soma', 'nA', -0.4, 1.2, 0.01], ['Ath', 'θ amplitude', 'nA', 0, 1, 0.01], ['fth', 'θ frequency', 'Hz', 2, 14, 0.5], ['Aga', 'γ amplitude', 'nA', 0, 1, 0.01], ['fga', 'γ frequency', 'Hz', 20, 100, 1]];
function rmBio(S) {
  const b = JSON.parse(JSON.stringify(NGC.DEFAULT_BIO));
  Object.assign(b, { gM: S.gM * 1e-3, gNaP: S.gNaP * 1e-3, thp: S.thp }); b.scale = { na: S.naS, kdr: 1, ka: S.kaS, h: S.hS }; b.gradients.h = S.hGrad; b.on.h = S.hS > 0; b.on.ka = S.kaS > 0;
  return b;
}
function renderResearchMorph() {
  document.title = 'Research model on a real CA1 cell · My research';
  const S = { cell: 'ca1-a', gM: 1, gNaP: 0.2, thp: -47, hS: 1, kaS: 1, naS: 1, hGrad: true, Iapp: 0.3, Ath: 0.2, fth: 8, Aga: 0.15, fga: 40, site: 'soma', T: 1000, frame: 0, playing: false, show: 'v', probe: -1, rec: null, zap: null, hold: 0 };
  const sl = (pre, [k, l, u, a, b, st]) => `<div class="ux-sl"><label for="rm${pre}-${k}">${l}</label><span class="ux-val"><input class="ux-num" type="number" id="rm${pre}-${k}n" min="${a}" max="${b}" step="${st}"><em>${u}</em></span><input type="range" id="rm${pre}-${k}" min="${a}" max="${b}" step="${st}"></div>`;
  $('lesson').innerHTML = bioHead('The research model on a real CA1 cell', 'MY RESEARCH · MODEL · MORPHOLOGY',
    'The currents behind the two output modes, placed on reconstructed CA1 pyramidal cells: Golomb’s M current and persistent Na⁺ current at the soma and axon, with the Migliore 2005 dendritic Na⁺, K⁺, A-type and Iₕ gradients. Watch θ and γ input spread through the tree, see which spikes become bursts, and measure the cell’s two theta resonances.')
    + `<nav class="page-jumps"><a href="#rm-sim">Simulate</a><a href="#rm-zap">Two resonances</a><a href="#rm-how">How it is built</a><a href="#rs-refs">References</a></nav>
    <section class="lesson-section lab" id="rm-sim"><p class="eyebrow">01 · Simulate</p><h2>Voltage across the whole tree</h2>
      <p class="ux-desc">The cell runs live: the colours show the voltage of every compartment right now. Change any slider and the channels change mid-run, without restarting. The default speed is ¼× so spikes are easy to follow; a full reconstruction may not reach 1× on every computer (the status says so). Click any branch to record there. Spikes at the soma are marked as <b style="color:#2f6f9f">single</b> or <b style="color:#a62962">burst</b> (&lt; 14 ms apart).</p>
      <div class="ux-wrap"><div class="ux-s1">
        <div class="ux-bar"><select id="rmCell" aria-label="Cell">${RM_CELLS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><select id="rmDet" aria-label="Detail"><option value="25">Fine (≤ 25 µm compartments)</option><option value="50">Fast (≤ 50 µm, about 2× quicker)</option></select>
          <div class="ux-seg" role="radiogroup" aria-label="Input site">${[['soma', 'θ+γ at soma'], ['rad', 'in radiatum (CA3-like)'], ['tuft', 'in tuft (EC-like)']].map(([k, l]) => `<button role="radio" aria-checked="${k === S.site}" data-rmsite="${k}">${l}</button>`).join('')}</div>
          </div>${ngLiveBar('rmLive', 0.25)}
        <div class="ux-fig"><div class="ux-figh"><b>Figure 1.</b><span id="rmSt" class="ux-status">Loading cells…</span></div>
          <div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:8px">
            <canvas id="rmTree" class="ux-cv" style="height:430px;cursor:crosshair" aria-label="Voltage on the morphology"></canvas>
            <div><canvas id="rmTr" class="ux-cv" style="height:300px" aria-label="Soma and probe voltage"></canvas>
              
              <div class="ux-seg" role="radiogroup" aria-label="Colour the tree by">${[['v', 'Voltage'], ['peak', 'Peak depolarisation'], ['h', 'Iₕ density'], ['ka', 'A-type density'], ['dist', 'Path distance']].map(([k, l]) => `<button role="radio" aria-checked="${k === S.show}" data-rmshow="${k}">${l}</button>`).join('')}</div>
              <p class="ux-note" id="rmRead"></p></div></div>
          <p class="ux-note"><b>Figure 1.</b> <b>Left:</b> the reconstruction coloured by the chosen quantity (voltage: blue −85 mV → grey −65 → orange −45 → red/yellow spike). <b>Right:</b> soma (black) and probe (green) voltage over the last second, scrolling. Click the tree to move the probe.</p></div>
      </div><div class="ux-s2"></div>
      <aside class="ux-panel" aria-label="Settings"><div class="ux-pane">
        <h4 class="hs-h">Input</h4>${RM_IN.map(c => sl('i', c)).join('')}
        <h4 class="hs-h">Channels</h4>${RM_CH.map(c => sl('c', c)).join('')}
        <label class="nl-inl ux-chk"><input type="checkbox" id="rmGrad" checked> Iₕ increases with distance (Magee 1998 gradient)</label>
        <div class="ux-acts"><button class="secondary" data-rmpre="golomb">Golomb-like soma (I<sub>M</sub> 1, I<sub>NaP</sub> 0.2)</button><button class="secondary" data-rmpre="nom">No I<sub>M</sub></button><button class="secondary" data-rmpre="noh">No Iₕ</button><button class="secondary" data-rmpre="mig">Migliore 2005 only</button></div>
        <p class="ux-note">Currents are in nA because this is a whole cell; ~0.3 nA DC brings these cells near threshold.</p></div></aside></div></section>
    <section class="lesson-section" id="rm-zap"><p class="eyebrow">02 · Measure</p><h2>Two theta resonances: M near threshold, h near rest</h2>
      <p>Hu et al. (2002) found that CA1 pyramidal cells resonate at theta twice: an <b>h-resonance</b> at hyperpolarised potentials and an <b>M-resonance</b> at depolarised potentials, amplified by I<sub>NaP</sub>. Here a small chirp current (0.5–20 Hz, 0.02 nA, 4 s) is injected at the soma at a chosen holding level and the impedance is measured for the full model, without Iₕ and without I<sub>M</sub>. Move the holding current to see which current carries the resonance.</p>
      <p class="nl-explain"><b>What to expect.</b> With the defaults, holding at −0.3 nA (≈ −73 mV) gives a resonance that disappears without Iₕ but not without I<sub>M</sub>; holding at +0.15 nA (≈ −61 mV) gives a much sharper resonance that collapses without I<sub>M</sub>. That is the voltage dependence Hu et al. (2002) reported. The peak frequencies here (15–20 Hz) are higher than the theta frequencies measured in slices, so the model captures which current resonates where, not the exact frequency.</p>
      <div class="ux-bar"><label class="nl-inl">Holding current <input class="ux-num" type="number" id="rmHold" value="0" step="0.05" min="-0.6" max="0.3" style="width:80px"> nA</label><button class="ux-run" id="rmZapGo">Measure impedance</button><span id="rmZapSt" class="ux-status"></span></div>
      <div class="ux-fig"><canvas id="rmZap" class="ux-cv" style="height:300px" aria-label="Impedance against frequency"></canvas>
        <p class="ux-note" id="rmZapNote"><b>Figure 2.</b> Input impedance |Z| at the soma from a chirp. Black: full model; blue: Iₕ removed; purple: I<sub>M</sub> removed. A peak above the low-frequency value is resonance; the frequency of the peak is the resonant frequency.</p></div></section>
    <section class="lesson-section" id="rm-how"><details class="uth"><summary><span>Under the hood</span> engine, channels, checks</summary><div class="uth-grid">
      <div><h4>Engine</h4><p>The guide’s compartmental engine (Hines solver, backward Euler, Δt 0.05 ms, compartments ≤ 25 µm; ≤ 30 µm and Δt 0.1 ms for the chirps) with the Migliore et al. 2005 channels, checked against NEURON on these cells (back-propagating spike profiles within a few mV).</p></div>
      <div><h4>Added currents</h4><p>I<sub>M</sub>: g z (V − E<sub>K</sub>), z<sub>∞</sub> = 1/(1 + e<sup>−(V+39)/5</sup>), τ 75 ms. I<sub>NaP</sub>: g p<sub>∞</sub>(V)(V − E<sub>Na</sub>), p<sub>∞</sub> = 1/(1 + e<sup>−(V−θp)/3</sup>), instantaneous. Both from Golomb et al. 2006, at the soma and axon. The leak reversal is set so −65 mV is the resting state with every current present.</p></div>
      <div><h4>Checked against NEURON</h4><p>Same mechanisms written as NEURON .mod files on cell mpg141209_A, 0.6 nA for 300 ms: adding I<sub>M</sub> (2 mS/cm²) removes 3 spikes in NEURON and 4 in the engine; adding I<sub>NaP</sub> (0.5 mS/cm²) adds 2 in both; the baseline spike trains differ by ~4 % in interspike interval.</p></div>
      <div><h4>Limits</h4><p>No Ca²⁺ channels or Ca²⁺-activated K⁺ currents, no NMDA spikes, so dendritic complex-spike bursts are missing; bursts here come from the somatic I<sub>NaP</sub>/I<sub>M</sub> interplay. Iₕ kinetics are Migliore’s (tens of ms), not the seconds-long kinetics of the lab’s two-compartment code.</p></div></div></details></section>
    ${rsRefs(['hu02', 'hu09', 'magee98', 'hoffman97', 'golomb06', 'yue04', 'spruston08', 'lowet23', 'ceballos25'], ['mdb55035', 'mdb244688'])}`;
  const bind = (pre, key, a, b, after) => { const r = $(`rm${pre}-${key}`), n = $(`rm${pre}-${key}n`); r.value = n.value = S[key]; r.oninput = () => { S[key] = +r.value; n.value = r.value; after(); }; n.onchange = () => { S[key] = Math.min(b, Math.max(a, +n.value)); r.value = n.value = S[key]; after(); }; };
  let tm; const later = () => { clearTimeout(tm); tm = setTimeout(() => newSim(true), 120); };
  RM_IN.forEach(([k, , , a, b]) => bind('i', k, a, b, later)); RM_CH.forEach(([k, , , a, b]) => bind('c', k, a, b, later));
  const sync = () => [...RM_IN, ...RM_CH].forEach(([k], j) => { const pre = j < RM_IN.length ? 'i' : 'c'; $(`rm${pre}-${k}`).value = $(`rm${pre}-${k}n`).value = S[k]; });
  $('rmGrad').onchange = e => { S.hGrad = e.target.checked; later(); };
  document.querySelectorAll('[data-rmpre]').forEach(b => b.onclick = () => { Object.assign(S, { golomb: { gM: 1, gNaP: 0.2, hS: 1 }, nom: { gM: 0 }, noh: { hS: 0 }, mig: { gM: 0, gNaP: 0, hS: 1, kaS: 1, naS: 1 } }[b.dataset.rmpre]); sync(); later(); });
  document.querySelectorAll('[data-rmsite]').forEach(b => b.onclick = () => { S.site = b.dataset.rmsite; document.querySelectorAll('[data-rmsite]').forEach(o => o.setAttribute('aria-checked', o === b)); drawTree(); });
  document.querySelectorAll('[data-rmshow]').forEach(b => b.onclick = () => { S.show = b.dataset.rmshow; document.querySelectorAll('[data-rmshow]').forEach(o => o.setAttribute('aria-checked', o === b)); drawTree(); });
  $('rmCell').onchange = e => { S.cell = e.target.value; S.probe = -1; prep(); run(); };
  $('rmDet').onchange = () => { S.probe = -1; prep(); run(); };
  let P = null;   // prepared cell
  function prep() {
    const m = ATLAS.find(a => a.id === S.cell); if (!m) return false;
    const B = nlBase(m), Pc = nlPrepare(B, [], +($('rmDet') ? $('rmDet').value : 25)), c = Pc.comp, cz = nlPrepare(B, [], 30).comp;
    let sy = 0, k = 0; for (let i = 0; i < c.n; i++) if (c.kind[i] === 4) { sy += c.y[i]; k++; } const flip = k && sy / k < 0 ? -1 : 1;
    const xs = c.x, ys = c.y.map(v => v * flip);
    const rad = [], tuft = []; for (let i = 0; i < c.n; i++) if (c.kind[i] === 4) { if (c.dist[i] >= 100 && c.dist[i] < 300) rad.push(i); if (c.dist[i] >= 350) tuft.push(i); }
    P = { m, c, cz, xs, ys, rad, tuft, bx: [Math.min(...xs), Math.max(...xs)], by: [Math.min(...ys), Math.max(...ys)] };
    if (S.probe < 0) { let best = 0, bd = 1e9; for (let i = 0; i < c.n; i++) if (c.kind[i] === 4 && Math.abs(c.dist[i] - 250) < bd) { bd = Math.abs(c.dist[i] - 250); best = i; } S.probe = best; }
    return true;
  }
  const drive = (t, A1, f1, A2, f2) => A1 * Math.sin(2 * Math.PI * f1 * 1e-3 * t) + A2 * Math.sin(2 * Math.PI * f2 * 1e-3 * t);
  function inject(rhs, t, Ivar, Idc) {
    rhs[0] += Idc;
    if (S.site === 'soma') rhs[0] += Ivar; else { const L = S.site === 'rad' ? P.rad : P.tuft; if (L.length) { const f = Ivar / L.length; for (const i of L) rhs[i] += f; } }
  }
  /* live engine: one persistent simulation; parameter changes rebuild the conductances and carry the state over */
  let SIM = null, LV = null, fc = 0; const RING = ngRing(4000, ['t', 'soma', 'pr']), SPK = []; let lastV = -65, kk = 0;
  function newSim(keep) {
    if (!P) return; const old = SIM; SIM = NGC.makeSim(P.c, rmBio(S)); SIM.init();
    if (keep && old) { for (const k of Object.keys(old.st)) SIM.st[k].set(old.st[k]); SIM.t = old.t; SIM.vmax.set(old.vmax); }
    else { RING.clear(); SPK.length = 0; lastV = -65; }
    S.hD = Float32Array.from({ length: P.c.n }, (_, i) => SIM.gH[i] / (SIM.A[i] * 1e6) * 1e3); S.kD = Float32Array.from({ length: P.c.n }, (_, i) => (SIM.gKap[i] + SIM.gKad[i]) / (SIM.A[i] * 1e6) * 1e3);
    S.rec = { live: true }; S.hMx = S.kMx = 0;
  }
  function stepLive(ms) {
    if (!SIM) return; const dt = 0.05, n = Math.round(ms / dt);
    for (let s2 = 0; s2 < n; s2++) {
      SIM.step(dt, (dg, rhs, VV, t) => inject(rhs, t, drive(t, S.Ath, S.fth, S.Aga, S.fga), S.Iapp));
      const vs = SIM.st.V[0]; if (lastV < 0 && vs >= 0) SPK.push(SIM.t); lastV = vs;
      if (++kk % 5 === 0) RING.push([SIM.t, vs, SIM.st.V[S.probe]]);
    }
    while (SPK.length && SPK[0] < SIM.t - 1100) SPK.shift();
  }
  function drawLive() {
    if (!SIM || !$('rmTree')) return; drawTree(); drawTr();
    if (fc++ % 10 === 0) { const from = Math.max(0, SIM.t - 1000), sp = SPK.filter(t => t >= from), ev = []; sp.forEach((t, i) => (i && t - sp[i - 1] < 14) ? ev[ev.length - 1].push(t) : ev.push([t]));
      const nss = ev.filter(e => e.length === 1).length, nbs = ev.filter(e => e.length > 1).length, c = P.c;
      $('rmRead').innerHTML = `last second: ${sp.length} spikes · <b style="color:#2f6f9f">${nss}</b> single · <b style="color:#a62962">${nbs}</b> bursts${nbs ? ` (${(ev.filter(e => e.length > 1).reduce((a, e) => a + e.length, 0) / nbs).toFixed(1)} spikes each)` : ''} · probe at ${Math.round(c.dist[S.probe])} µm (${{ 1: 'soma', 2: 'axon', 3: 'basal', 4: 'apical' }[c.kind[S.probe]] || 'dendrite'})`;
      $('rmSt').textContent = `${P.c.n} compartments`; }
  }
  function run() { if (LV) LV.restart(); }
  function scale() { const cv = $('rmTree'), W = cv.clientWidth, H = cv.clientHeight, pad = 14, sx = (W - 2 * pad) / (P.bx[1] - P.bx[0] || 1), sy = (H - 2 * pad) / (P.by[1] - P.by[0] || 1), s = Math.min(sx, sy);
    const ox = (W - s * (P.bx[1] - P.bx[0])) / 2, oy = (H - s * (P.by[1] - P.by[0])) / 2; return { X: x => ox + (x - P.bx[0]) * s, Y: y => H - oy - (y - P.by[0]) * s, s }; }
  function colour(i) {
    const R = S.rec; if (S.show === 'dist') { const d = P.c.dist[i] / 700; return `hsl(${280 - 260 * Math.min(1, d)},55%,${45 + 10 * Math.min(1, d)}%)`; }
    if (!SIM) return '#b9a796';
    if (S.show === 'v') return nlVcol(SIM.st.V[i]);
    if (S.show === 'peak') return nlVcol(SIM.vmax[i]);
    const D = S.show === 'h' ? S.hD : S.kD, mx = S.show === 'h' ? (S.hMx || (S.hMx = Math.max(1e-9, ...D))) : (S.kMx || (S.kMx = Math.max(1e-9, ...D))), q = D[i] / mx; return `rgb(${Math.round(240 - 200 * q)},${Math.round(230 - 150 * q)},${Math.round(220 - 40 * q)})`;
  }
  function drawTree() {
    const cv = $('rmTree'); if (!cv || !P) return; const [x] = gyCanvas(cv), sc = scale(), c = P.c; x.lineCap = 'round';
    for (let i = 1; i < c.n; i++) { const p = c.par[i]; x.strokeStyle = colour(i); x.lineWidth = Math.max(1.6, Math.min(6, c.d[i] * sc.s * 0.9)); x.beginPath(); x.moveTo(sc.X(P.xs[p]), sc.Y(P.ys[p])); x.lineTo(sc.X(P.xs[i]), sc.Y(P.ys[i])); x.stroke(); }
    x.fillStyle = colour(0); x.beginPath(); x.arc(sc.X(P.xs[0]), sc.Y(P.ys[0]), Math.max(4, c.d[0] * sc.s / 2), 0, 7); x.fill();
    x.strokeStyle = '#2f7d5b'; x.lineWidth = 2; x.beginPath(); x.arc(sc.X(P.xs[S.probe]), sc.Y(P.ys[S.probe]), 7, 0, 7); x.stroke();
    if (S.site !== 'soma') { x.fillStyle = 'rgba(166,41,98,.55)'; (S.site === 'rad' ? P.rad : P.tuft).forEach(i => { x.beginPath(); x.arc(sc.X(P.xs[i]), sc.Y(P.ys[i]), 1.6, 0, 7); x.fill(); }); }
    const bar = 100 * sc.s; x.strokeStyle = '#3a2a1c'; x.lineWidth = 2; x.beginPath(); x.moveTo(12, cv.clientHeight - 12); x.lineTo(12 + bar, cv.clientHeight - 12); x.stroke(); x.fillStyle = '#3a2a1c'; x.font = '11px system-ui'; x.fillText('100 µm', 12, cv.clientHeight - 18);
    if (SIM && S.show === 'v') { x.fillText(`t = ${SIM.t.toFixed(1)} ms`, cv.clientWidth - 90, 16); }
  }
  function drawTr() {
    const cv = $('rmTr'); if (!cv || !SIM) return; const t = RING.arr('t'), so = RING.arr('soma'), pr = RING.arr('pr'), t1 = SIM.t, t0 = Math.max(0, t1 - 1000);
    const [x, W, H] = gyCanvas(cv), ax = gyAxes(x, W, H, { x0: t0, x1: t0 + 1000, y0: -90, y1: 40, xt: gyTicks(t0, t0 + 1000, 4), yt: [-80, -40, 0, 40], xl: 'time (ms)', yl: 'V (mV)', T: 20 });
    const ln = (arr, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); let st = false; for (let f = 0; f < t.length; f++) { if (t[f] < t0) continue; const X = ax.X(t[f]), Y = ax.Y(arr[f]); st ? x.lineTo(X, Y) : x.moveTo(X, Y); st = true; } x.stroke(); x.lineWidth = 1; };
    ln(pr, '#2f7d5b', 1.1); ln(so, '#1d140d', 1.2);
    const sp = SPK.filter(v => v >= t0); sp.forEach((v, i) => { const b = (i && v - sp[i - 1] < 14) || (sp[i + 1] !== undefined && sp[i + 1] - v < 14); x.fillStyle = b ? '#a62962' : '#2f6f9f'; x.fillRect(ax.X(v) - 1, 4, 2, 10); });
  }
  $('rmTree').onclick = e => { if (!P) return; const b = $('rmTree').getBoundingClientRect(), sc = scale(), px = e.clientX - b.left, py = e.clientY - b.top; let best = 0, bd = 1e9;
    for (let i = 0; i < P.c.n; i++) { const d = Math.hypot(sc.X(P.xs[i]) - px, sc.Y(P.ys[i]) - py); if (d < bd) { bd = d; best = i; } } S.probe = best; RING.clear(); drawTree(); };
  /* chirp impedance: three conditions */
  $('rmZapGo').onclick = () => {
    if (!P) return; const hold = +$('rmHold').value, conds = [['full', {}, '#1d140d'], ['no Iₕ', { hS: 0 }, '#2f6f9f'], ['no I_M', { gM: 0 }, '#a62962']], res = [];
    const F = []; for (let lf = Math.log10(0.5); lf <= Math.log10(20) + 1e-9; lf += 0.05) F.push(10 ** lf);
    let j = 0; $('rmZapSt').textContent = 'Running…';
    const one = () => {
      if (!$('rmZap')) return; const [name, ov, col] = conds[j], SS = Object.assign({}, S, ov), sim = NGC.makeSim(P.cz, rmBio(SS)); sim.init();
      const dt = 0.1, Tz = 4000, pre = 1500, f0 = 0.5, f1 = 20, A = 0.02, N = Math.round(Tz / dt), V = new Float32Array(N), I = new Float32Array(N);
      while (sim.t < pre) sim.step(dt, (dg, rhs) => { rhs[0] += hold; });
      let vmin = 1e9, vmax = -1e9, spk = false;
      for (let k = 0; k < N; k++) { const t = k * dt, ph = 2 * Math.PI * (f0 * t + (f1 - f0) * t * t / (2 * Tz)) * 1e-3, i = A * Math.sin(ph); sim.step(dt, (dg, rhs) => { rhs[0] += hold + i; }); V[k] = sim.st.V[0]; I[k] = i; if (V[k] > -20) spk = true; }
      let mv = 0; for (let k = 0; k < N; k++) mv += V[k]; mv /= N;
      const Z = F.map(f => { let vr = 0, vi = 0, ir = 0, ii = 0; const w = 2 * Math.PI * f * 1e-3 * dt; for (let k = 0; k < N; k++) { const c = Math.cos(w * k), s = Math.sin(w * k); vr += (V[k] - mv) * c; vi += (V[k] - mv) * s; ir += I[k] * c; ii += I[k] * s; } return Math.hypot(vr, vi) / Math.max(1e-12, Math.hypot(ir, ii)); });
      res.push({ name, col, Z, spk, vrest: mv }); j++;
      if (j < conds.length) { $('rmZapSt').textContent = `Running… ${j}/3`; setTimeout(one, 10); } else { S.zap = { F, res, hold }; $('rmZapSt').textContent = 'Done'; drawZap(); if ($('rmZapSt').dataset.resume) { delete $('rmZapSt').dataset.resume; LV && LV.play(); } }
    };
    setTimeout(one, 20);
  };
  function drawZap() {
    const cv = $('rmZap'); if (!cv) return; const [x, W, H] = gyCanvas(cv);
    if (!S.zap) { x.fillStyle = '#8a7058'; x.textAlign = 'center'; x.fillText('Press “Measure impedance”', W / 2, H / 2); return; }
    const { F, res, hold } = S.zap, lx = Math.log10, zm = Math.max(...res.flatMap(r => r.Z)) * 1.1, ax = gyAxes(x, W, H, { x0: lx(0.5), x1: lx(20), y0: 0, y1: zm, xt: [], yt: gyTicks(0, zm, 4), xl: 'frequency (Hz, log)', yl: '|Z| (MΩ)' });
    x.fillStyle = '#6f4c27'; x.textAlign = 'center'; [0.5, 1, 2, 4, 8, 12, 20].forEach(f => x.fillText(f, ax.X(lx(f)), ax.B + 15)); x.textAlign = 'left';
    const pk = Z => { const i = Z.indexOf(Math.max(...Z)); return { f: F[i], q: Z[i] / Z[0] }; };
    res.forEach((r, j) => { x.strokeStyle = r.col; x.lineWidth = 2; x.beginPath(); F.forEach((f, i) => i ? x.lineTo(ax.X(lx(f)), ax.Y(r.Z[i])) : x.moveTo(ax.X(lx(f)), ax.Y(r.Z[i]))); x.stroke(); x.fillStyle = r.col; x.fillText(`${r.name}${r.spk ? ' (spiked)' : ''}`, ax.R - 120, ax.T + 12 + j * 16); });
    x.lineWidth = 1;
    $('rmZapNote').innerHTML = `<b>Figure 2.</b> Holding ${hold} nA (mean V ${res[0].vrest.toFixed(1)} mV). ` + res.map(r => { const p = pk(r.Z); return `<span style="color:${r.col}"><b>${r.name}</b>: ${p.q > 1.05 ? `resonance at ${p.f.toFixed(1)} Hz (Q = ${p.q.toFixed(2)})` : 'no resonance (low-pass)'}</span>`; }).join(' · ')
      + '. Resonance strength Q is the peak impedance divided by the impedance at 0.5 Hz. Compare a hyperpolarised holding current (Iₕ dominates) with a depolarised one (I<sub>M</sub> dominates).';
  }
  ngLoadAtlasData(() => { if (!$('rmTree')) return; if (prep()) { $('rmSt').textContent = 'Ready'; newSim(false); LV = ngLive({ bar: 'rmLive', step: stepLive, draw: drawLive, reset: () => { S.hMx = S.kMx = 0; newSim(false); }, chunk: 0.5, budget: 18 }); LV.play(); drawZap(); } else $('rmSt').textContent = 'Cell data not available.'; });
  window.addEventListener('resize', () => { if ($('rmTree')) { drawTree(); drawTr(); drawZap(); } });
  $('rmZapGo').addEventListener('click', () => { if (LV && LV.running) { LV.pause(); $('rmZapSt').dataset.resume = '1'; } }, true);
}
window.renderResearchMorph = renderResearchMorph;
/* Page: /biology/research-place-fields/ — place-field formation by behavioural-timescale synaptic plasticity (BTSP)
   in the research cell, with a mouse running laps on a treadmill belt. Live (ngLive). The cell is one of the ladder rungs
   (irMake): the AdEx fitted to the biophysical model, the biophysical HH itself, or the Lowet et al. 2023 minimal model. */
const PF = { L: 180, nIn: 60, sig: 9, tauB: 1300, tauA: 700, wmax: 1, w0: 0.05 };
const PF_CELLS = {   // drive calibrated so each cell is silent outside a field and fires 15–30 Hz inside one
  lowet: ['Lowet et al. 2023 minimal bursting model', () => Object.assign({}, IR_LW, { Ibias: 5, Ibd: -0.2 }), { site: 'dend', I0: 0, gain: 4.2, Ath: 0.3 }],
  adex: ['AdEx fitted to the HH model', () => Object.assign({}, IR_ADEX_FIT), { site: 'soma', I0: 0, gain: 3.2, Ath: 0.6 }],
  hh: ['Biophysical two-compartment HH (Ceballos 2025, hybrid reading)', () => Object.assign({}, IR_HH, IR_GATE.hybrid[1]), { site: 'soma', I0: -1.5, gain: 5.5, Ath: 0.3 }] };
/* the same rodent drawing style as the place-cell page (mouse-sized: ~9 cm head + body) */
function pfDrawMouse(x, X, Y, s, t, moving, dir = 1) {
  const L = s * 9; x.save(); x.translate(X, Y); x.scale(dir, 1);
  const sway = moving ? 0 : Math.sin(t / 260) * 0.25;
  x.strokeStyle = '#b89a8c'; x.lineWidth = Math.max(1.2, s * 0.6); x.beginPath(); x.moveTo(-L * 0.45, 0);
  x.bezierCurveTo(-L * 0.9, L * 0.15, -L * 1.1, -L * 0.25, -L * 1.4, Math.sin(t / (moving ? 180 : 500)) * L * 0.15); x.stroke();
  x.fillStyle = '#8c7664'; x.beginPath(); x.ellipse(0, 0, L * 0.5, L * 0.26, 0, 0, 7); x.fill();
  x.rotate(sway); x.beginPath(); x.ellipse(L * 0.48, 0, L * 0.22, L * 0.15, 0, 0, 7); x.fill();
  x.fillStyle = '#e7b8c4'; [-1, 1].forEach(k => { x.beginPath(); x.arc(L * 0.38, k * L * 0.16, L * 0.09, 0, 7); x.fill(); });
  x.beginPath(); x.arc(L * 0.7, 0, L * 0.045, 0, 7); x.fill();
  x.fillStyle = '#1d140d'; [-1, 1].forEach(k => { x.beginPath(); x.arc(L * 0.55, k * L * 0.07, L * 0.025, 0, 7); x.fill(); });
  x.restore();
}
function renderResearchPlace() {
  document.title = 'Place field formation (BTSP) · My research';
  const S = { cell: 'lowet', v0: 25, thetaOn: true, eta: 0.9, plAmp: 3.5, plDur: 300, auto: 3, plX: 110, fth: 8 };
  $('lesson').innerHTML = bioHead('Place field formation in the research cell', 'MY RESEARCH · MODEL · BEHAVIOUR',
    'A mouse runs laps on a treadmill belt. Its CA3 inputs each prefer one spot on the belt, the cell receives theta from entorhinal cortex, and at first it barely fires. Trigger a dendritic plateau potential at one location, as happens in vivo, and behavioural-timescale synaptic plasticity (BTSP) strengthens the inputs that were active in the seconds around it: a place field appears on the very next lap. Then watch which spikes are single and which are bursts, and how they precess against theta.')
    + `<nav class="page-jumps"><a href="#pf-sim">Live session</a><a href="#pf-read">Readouts</a><a href="#pf-bio">The biology</a><a href="#pf-how">How it is built</a><a href="#rs-refs">References</a></nav>
    <section class="lesson-section lab" id="pf-sim"><p class="eyebrow">01 · Live session</p><h2>One mouse, one cell, one plateau</h2>
      <p class="ux-desc">The session starts with weak, uniform CA3 weights. On lap ${S.auto} a plateau is triggered automatically at ${S.plX} cm (purple flag); you can also click the belt to place the next plateau anywhere, or press <b>Plateau now</b>. Slow down to ¼× to watch a single pass through the field.</p>
      ${ngLiveBar('pfLive', 1)}
      <div class="ux-wrap"><div class="ux-s1">
        <div class="ux-fig"><canvas id="pfTrack" class="ux-cv" style="height:150px;cursor:crosshair" aria-label="Mouse on the treadmill belt"></canvas>
          <canvas id="pfV" class="ux-cv" style="height:150px;margin-top:6px" aria-label="Somatic voltage"></canvas>
          <p class="ux-note"><b>Figure 1.</b> <b>Top:</b> the belt (180 cm, one lap wraps around), the mouse, spikes of the last 2 s at the positions where they occurred (blue single, purple burst) and the next plateau (flag). <b>Bottom:</b> somatic voltage, theta drive (grey) and plateaus (pink bands).</p></div>
      </div><div class="ux-s2"><div class="ux-fig" id="pfRead"></div></div>
      <aside class="ux-panel" aria-label="Settings"><div class="ux-pane">
        <label class="ux-f"><span>Cell model</span><select id="pfCell">${Object.entries(PF_CELLS).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
        <div class="ux-acts"><button id="pfNow">Plateau now</button><button class="secondary" id="pfWipe">Reset weights</button></div>
        ${[['v0', 'Running speed', 'cm/s', 5, 60, 1], ['eta', 'Plasticity per plateau (fraction toward max)', '', 0, 1, 0.05], ['plAmp', 'Plateau current', 'µA/cm²', 0, 8, 0.1], ['plDur', 'Plateau duration', 'ms', 50, 600, 10], ['fth', 'Theta frequency', 'Hz', 4, 12, 0.5]].map(([k, l, u, a, b, st]) => `<div class="ux-sl"><label for="pf-${k}">${l}</label><span class="ux-val"><input class="ux-num" type="number" id="pf-${k}n" min="${a}" max="${b}" step="${st}"><em>${u}</em></span><input type="range" id="pf-${k}" min="${a}" max="${b}" step="${st}"></div>`).join('')}
        <label class="nl-inl ux-chk"><input type="checkbox" id="pfTh" checked> Theta drive (entorhinal input)</label>
        <p class="ux-note">Click the belt to set where the next plateau happens.</p></div></aside></div></section>
    <section class="lesson-section" id="pf-read"><p class="eyebrow">02 · Readouts</p><h2>The field forms, and its spikes split into two codes</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px">
        <div class="ux-fig"><canvas id="pfLap" class="ux-cv" style="height:260px" aria-label="Spikes by lap and position"></canvas><p class="ux-note"><b>Figure 2.</b> Spikes on every lap (rows, newest at top) against position. The pink mark on a row is a plateau. A field appears on the lap after it.</p></div>
        <div class="ux-fig"><canvas id="pfW" class="ux-cv" style="height:260px" aria-label="Synaptic weights against position"></canvas><p class="ux-note"><b>Figure 3.</b> CA3 synaptic weights by the preferred position of each input (bars) and the resulting input ramp (line). BTSP makes the ramp asymmetric: it rises before the plateau site because inputs active seconds <i>before</i> the plateau are strengthened.</p></div>
        <div class="ux-fig"><canvas id="pfPh" class="ux-cv" style="height:260px" aria-label="Theta phase against position"></canvas><p class="ux-note"><b>Figure 4.</b> Theta phase of each event against position (laps after the first plateau). Phase 0° is the peak of the theta input current (drive = −A·cos ωt); shown twice (0–720°) so the precession band is not cut at 360°. Spikes move to earlier phases as the mouse crosses the field: phase precession. Blue single spikes, purple burst onsets.</p></div>
        <div class="ux-fig"><canvas id="pfRm" class="ux-cv" style="height:260px" aria-label="Rate maps of single spikes and bursts"></canvas><p class="ux-note" id="pfInfo"><b>Figure 5.</b> Rate maps of single-spike events and burst events after the first plateau.</p></div></div></section>
    <section class="lesson-section" id="pf-bio"><p class="eyebrow">03 · The biology</p><h2>How CA1 place fields form, and why the output modes matter</h2><ul>
      <li><b>Plateau potentials create fields in one trial.</b> In head-fixed mice on a treadmill belt, a single dendritic plateau potential, spontaneous or evoked, produced a place field at that location on the next lap (Bittner et al. 2015, 2017).</li>
      <li><b>BTSP works on a seconds-long window.</b> Inputs active several seconds before or after the plateau are potentiated, more strongly before, so the new field’s ramp of depolarisation is asymmetric and starts before the plateau site (Bittner et al. 2017). The weight change is bidirectional and depends on the starting weight (Milstein et al. 2021).</li>
      <li><b>Plateaus are dendritic Ca²⁺ events driving complex-spike bursts</b> that need entorhinal input to the tuft (Takahashi &amp; Magee 2009; Grienberger et al. 2014; Bittner et al. 2015).</li>
      <li><b>Phase precession</b> appears when a ramp of depolarisation combines with theta: the stronger the drive, the earlier in the cycle threshold is reached (Harvey et al. 2009; O’Keefe &amp; Recce 1993).</li>
      <li><b>Bursts carry more spatial information</b> than single spikes and precess more strongly (Lowet et al. 2023), consistent with bursts following theta-paced input in the field and single spikes following gamma.</li>
      <li><b>In Alzheimer’s models</b> CA1 place fields are less stable and spatial coding degrades (e.g. Cacucci et al. 2008); how much of this is a change in BTSP or in the balance of bursts and single spikes is an open question that this kind of model can frame.</li></ul></section>
    <section class="lesson-section" id="pf-how"><details class="uth"><summary><span>Under the hood</span> inputs, plasticity rule, cell models</summary><div class="uth-grid">
      <div><h4>Behaviour and inputs</h4><p>Belt 180 cm; speed fluctuates slowly around the set value and the mouse pauses 1–2 s at the reward (0 cm). 60 CA3 inputs with Gaussian fields (σ = 9 cm) tile the belt; the input current is gain × Σ w<sub>j</sub> φ<sub>j</sub>(x) / Σ φ<sub>j</sub>, halved while still. Theta (8 Hz) is scaled by running.</p></div>
      <div><h4>BTSP rule</h4><p>At a plateau at time t<sub>p</sub>, each input’s overlap with an asymmetric kernel is computed, K = e<sup>−(t<sub>p</sub>−t)/1.3 s</sup> before and e<sup>−(t−t<sub>p</sub>)/0.7 s</sup> after (the shape reported by Bittner et al. 2017: longer before than after), using the 4 s before and 3 s after the plateau. Weights move toward the maximum by η × overlap / (largest overlap). This normalisation is a modelling choice; Milstein et al. 2021 give a full bidirectional rule.</p></div>
      <div><h4>Cells</h4><p>The same equations as the <a href="/biology/interleaved-resonance/">model ladder</a>: the Lowet minimal model (default; ramp and theta to the dendrite, −0.2 → 4 µA/cm² as in their place-field simulation), the AdEx fitted to the HH model, or the biophysical two-compartment model. Drive is calibrated per cell so it is silent outside a field and fires 15–30 Hz inside one. The fitted AdEx does not burst at 8 Hz (it misses 8 Hz bursts in the fit), so use the Lowet or HH cell to compare bursts with single spikes. Spikes are split into single spikes and bursts at 14 ms.</p></div>
      <div><h4>Analysis</h4><p>Rate maps in 5 cm bins with occupancy normalisation (running only). Spatial information is Skaggs’ bits per event, computed separately for single-spike events and burst events.</p></div></div></details></section>
    ${rsRefs(['bittner17', 'grien14', 'lowet23', 'golomb06', 'brette05', 'harris01'])}`;
  // extra refs specific to this page
  $('rs-refs').querySelector('ol').insertAdjacentHTML('beforeend', [
    'Bittner KC, Grienberger C, Vaidya SP, et al. (2015). Conjunctive input processing drives feature selectivity in hippocampal CA1 neurons. <i>Nat Neurosci</i> 18:1133–1142. <a href="https://doi.org/10.1038/nn.4062" target="_blank" rel="noopener">doi</a>',
    'Milstein AD, Li Y, Bittner KC, et al. (2021). Bidirectional synaptic plasticity rapidly modifies hippocampal representations. <i>eLife</i> 10:e73046. <a href="https://doi.org/10.7554/eLife.73046" target="_blank" rel="noopener">doi</a>',
    'Takahashi H, Magee JC (2009). Pathway interactions and synaptic plasticity in the dendritic tuft regions of CA1 pyramidal neurons. <i>Neuron</i> 62:102–111. <a href="https://doi.org/10.1016/j.neuron.2009.03.007" target="_blank" rel="noopener">doi</a>',
    'Harvey CD, Collman F, Dombeck DA, Tank DW (2009). Intracellular dynamics of hippocampal place cells during virtual navigation. <i>Nature</i> 461:941–946. <a href="https://doi.org/10.1038/nature08499" target="_blank" rel="noopener">doi</a>',
    'O’Keefe J, Recce ML (1993). Phase relationship between hippocampal place units and the EEG theta rhythm. <i>Hippocampus</i> 3:317–330. <a href="https://doi.org/10.1002/hipo.450030307" target="_blank" rel="noopener">doi</a>',
    'Cacucci F, Yi M, Wills TJ, Chapman P, O’Keefe J (2008). Place cell firing correlates with memory deficits and amyloid plaque burden in Tg2576 Alzheimer mouse model. <i>PNAS</i> 105:7863–7868. <a href="https://doi.org/10.1073/pnas.0802908105" target="_blank" rel="noopener">doi</a>'].map(r => `<li>${r}</li>`).join(''));

  const C = PF.nIn, cen = Float64Array.from({ length: C }, (_, j) => (j + 0.5) * PF.L / C);
  const phi = (j, x) => { let d = Math.abs(x - cen[j]); d = Math.min(d, PF.L - d); return Math.exp(-d * d / (2 * PF.sig * PF.sig)); };
  const phiSum = (() => { let s = 0; for (let j = 0; j < C; j++) s += phi(j, 0); return s; })();
  const D = {};
  function reset() {
    const def = PF_CELLS[S.cell]; D.P = def[1](); D.cfg = def[2];
    D.S = { Iapp: def[2].I0, Ath: def[2].Ath, fth: S.fth, Aga: 0, fga: 40, site: def[2].site, D: 0, seed: 1 };
    D.M = irMake(S.cell, D.P, D.S); D.w = new Float64Array(C).fill(PF.w0); D.x = 5; D.lap = 1; D.v = S.v0; D.vn = 0; D.pause = 0; D.t = 0;
    D.hist = []; D.events = []; D.plateaus = []; D.post = []; D.plOn = 0; D.nextPl = { lap: S.auto, x: S.plX }; D.seen = 0;
    D.ring = ngRing(4000, ['t', 'V', 'th', 'pl']); D.occ = new Float64Array(PF.L / 5); D.firstPl = Infinity; D.k = 0;
  }
  const drive = () => { let s = 0; for (let j = 0; j < C; j++) s += D.w[j] * phi(j, D.x); return s / phiSum; };
  function plateau() {
    const tp = D.t; D.plateaus.push({ t: tp, lap: D.lap, x: D.x }); D.plOn = S.plDur; if (D.firstPl === Infinity) D.firstPl = tp;
    const raw = new Float64Array(C); D.hist.forEach(([t, x]) => { if (tp - t > 4000) return; const k = Math.exp(-(tp - t) / PF.tauB) * 10; for (let j = 0; j < C; j++) raw[j] += phi(j, x) * k; });
    D.post.push({ tp, raw, until: tp + 3000 });
  }
  function applyPost(force) {
    D.post = D.post.filter(p => { if (D.t < p.until && !force) return true;
      const mx = Math.max(...p.raw) || 1; for (let j = 0; j < C; j++) D.w[j] += S.eta * (PF.wmax - D.w[j]) * p.raw[j] / mx; return false; });
  }
  function step(ms) {
    const dt = 0.5, n = Math.round(ms / dt);
    for (let s = 0; s < n; s++) {
      // behaviour
      if (D.pause > 0) { D.pause -= dt; D.v = 0; } else { D.vn += (Math.random() - 0.5) * 0.02 * dt; D.vn *= 0.999; D.v = Math.max(3, S.v0 * (1 + 0.25 * Math.tanh(D.vn))); }
      const xo = D.x; D.x += D.v * dt / 1000; if (D.x >= PF.L) { D.x -= PF.L; D.lap++; D.pause = 1000 + 1000 * Math.random(); }
      const moving = D.v > 2; if (moving) D.occ[Math.min(D.occ.length - 1, D.x / 5 | 0)] += dt / 1000;
      // plateau scheduling
      if (D.nextPl && D.lap >= D.nextPl.lap && xo < D.nextPl.x && D.x >= D.nextPl.x) { plateau(); D.nextPl = null; }
      // inputs to the cell
      const run = moving ? Math.min(1, D.v / 20) : 0.3, sp = drive(), pl = D.plOn > 0 ? S.plAmp : 0; D.plOn = Math.max(0, D.plOn - dt);
      if (S.cell === 'lowet') { D.P.Ibd = -0.2 + D.cfg.gain * sp * (moving ? 1 : 0.5) + pl; D.S.Iapp = 0; }
      else D.S.Iapp = D.cfg.I0 + D.cfg.gain * sp * (moving ? 1 : 0.5) + pl;
      D.S.Ath = S.thetaOn ? D.cfg.Ath * run : 0; D.S.fth = S.fth;
      const before = D.M.spikes.length; D.M.step(dt, null); D.t += dt;
      for (let q = before; q < D.M.spikes.length; q++) { const ts = D.M.spikes[q]; D.events.push({ t: ts, x: D.x, lap: D.lap, ph: (((2 * Math.PI * S.fth * 1e-3 * ts + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) }); }
      if (++D.k % 20 === 0) D.hist.push([D.t, D.x]); while (D.hist.length && D.hist[0][0] < D.t - 4200) D.hist.shift();
      if (D.post.length) { D.post.forEach(p => { if (D.t <= p.until) { const k = Math.exp(-(D.t - p.tp) / PF.tauA) * dt / 50; for (let j = 0; j < C; j++) p.raw[j] += phi(j, D.x) * k; } }); applyPost(false); }
      if (D.k % 4 === 0) D.ring.push([D.t, D.vrec !== undefined ? D.vrec : 0, irDrive(D.S, D.t), pl > 0 ? 1 : 0]);
    }
    if (D.M.spikes.length > 4000) D.M.spikes.splice(0, 2000);
  }
  // voltage sampling: wrap the model step to capture V via its sink
  const origMake = () => { D.M0 = D.M; const st = D.M.step; D.M.step = (ms, _s) => st(ms, (t, Vs) => { D.vrec = Vs; }); };
  // classify events into single spikes / burst onsets and burst members
  function classify(list) { const out = list.map(e => Object.assign({}, e, { kind: 'ss' })); for (let i = 0; i < out.length; i++) { const p = out[i - 1], n = out[i + 1]; const inB = (p && out[i].t - p.t < 14) || (n && n.t - out[i].t < 14); if (inB) out[i].kind = (p && out[i].t - p.t < 14) ? 'bm' : 'bs'; } return out; }
  let fc = 0;
  function draw() {
    const ev = classify(D.events.slice(-3000));
    // track
    let cv = $('pfTrack'); if (!cv) return; let [x, W, H] = gyCanvas(cv); const L0 = 20, R0 = W - 20, X = p => L0 + (R0 - L0) * p / PF.L, yb = H * 0.62;
    x.fillStyle = '#e9dccb'; x.fillRect(L0, yb - 14, R0 - L0, 28);
    for (let p = 0; p < PF.L; p += 30) { x.fillStyle = ['#d8c7b1', '#cdb89e', '#e2d3c0'][(p / 30) % 3]; x.fillRect(X(p), yb - 14, X(p + 30) - X(p) - 1, 28); }   // belt cue zones
    x.fillStyle = '#2f7d5b'; x.fillRect(X(0), yb - 18, 4, 36); x.fillStyle = '#6f4c27'; x.font = '10.5px system-ui'; x.fillText('reward', X(0) + 6, yb + 26);
    gyTicks(0, PF.L, 6).forEach(p => { x.fillStyle = '#8a7058'; x.fillText(p + ' cm', X(p) - 10, H - 4); });
    if (D.nextPl) { x.strokeStyle = '#a62962'; x.lineWidth = 2; x.beginPath(); x.moveTo(X(D.nextPl.x), yb - 16); x.lineTo(X(D.nextPl.x), 14); x.stroke(); x.fillStyle = '#a62962'; x.fillRect(X(D.nextPl.x), 14, 16, 10); x.fillText(`plateau (lap ${D.nextPl.lap})`, X(D.nextPl.x) + 20, 22); x.lineWidth = 1; }
    ev.filter(e => e.t > D.t - 2000).forEach(e => { const a = 1 - (D.t - e.t) / 2000; x.fillStyle = e.kind === 'ss' ? `rgba(47,111,159,${a})` : `rgba(166,41,98,${a})`; x.beginPath(); x.arc(X(e.x), yb - 22 - (e.kind === 'bm' ? 6 : 0), 3, 0, 7); x.fill(); });
    pfDrawMouse(x, X(D.x), yb, (R0 - L0) / PF.L, D.t, D.v > 2);
    x.fillStyle = '#3a2a1c'; x.font = '12px system-ui'; x.fillText(`lap ${D.lap} · ${D.v.toFixed(0)} cm/s`, L0, 14);
    // voltage
    cv = $('pfV'); [x, W, H] = gyCanvas(cv); const t = D.ring.arr('t'), V = D.ring.arr('V'), th = D.ring.arr('th'), pl = D.ring.arr('pl'), t1 = D.t, t0 = Math.max(0, t1 - 2000);
    const ax = gyAxes(x, W, H, { x0: t0, x1: t0 + 2000, y0: -90, y1: 30, xt: [], yt: [-80, -40, 0], yl: 'V (mV)', B: 10, T: 6 });
    for (let i = 0; i < t.length; i++) if (pl[i] && t[i] >= t0) { x.fillStyle = 'rgba(166,41,98,.12)'; x.fillRect(ax.X(t[i]), ax.T, 2, ax.B - ax.T); }
    const ln = (a, col, f) => { x.strokeStyle = col; x.beginPath(); let st = false; for (let i = 0; i < t.length; i++) { if (t[i] < t0) continue; const Y = f(a[i]); st ? x.lineTo(ax.X(t[i]), Y) : x.moveTo(ax.X(t[i]), Y); st = true; } x.stroke(); };
    ln(th, '#cdbfae', v => ax.Y(-85 + 6 * v)); ln(V, '#1d140d', v => ax.Y(v));
    if (fc++ % 6) return;
    drawLap(ev); drawW(); drawPh(ev); drawRm(ev); readout(ev);
  }
  function drawLap(ev) {
    const cv = $('pfLap'); if (!cv) return; const [x, W, H] = gyCanvas(cv), nl = Math.max(8, D.lap), ax = gyAxes(x, W, H, { x0: 0, x1: PF.L, y0: 0.5, y1: nl + 0.5, xt: gyTicks(0, PF.L, 6), yt: gyTicks(1, nl, 5), xl: 'position (cm)', yl: 'lap' });
    ev.forEach(e => { x.fillStyle = e.kind === 'ss' ? '#2f6f9f' : '#a62962'; x.fillRect(ax.X(e.x) - 1, ax.Y(e.lap) - 2.5, 2, 5); });
    D.plateaus.forEach(p => { x.strokeStyle = '#d6337a'; x.lineWidth = 3; x.beginPath(); x.moveTo(ax.X(p.x) - 6, ax.Y(p.lap)); x.lineTo(ax.X(p.x) + 6, ax.Y(p.lap)); x.stroke(); x.lineWidth = 1; });
  }
  function drawW() {
    const cv = $('pfW'); if (!cv) return; const [x, W, H] = gyCanvas(cv), ax = gyAxes(x, W, H, { x0: 0, x1: PF.L, y0: 0, y1: 1.05, xt: gyTicks(0, PF.L, 6), yt: [0, 0.5, 1], xl: 'preferred position of the CA3 input (cm)', yl: 'weight' });
    for (let j = 0; j < C; j++) { x.fillStyle = 'rgba(166,41,98,.55)'; const bw = (ax.R - ax.L) / C; x.fillRect(ax.X(cen[j]) - bw / 2 + 1, ax.Y(D.w[j]), bw - 2, ax.B - ax.Y(D.w[j])); }
    x.strokeStyle = '#1d140d'; x.lineWidth = 2; x.beginPath(); for (let p = 0; p <= PF.L; p += 1) { let s = 0; for (let j = 0; j < C; j++) s += D.w[j] * phi(j, p); const Y = ax.Y(s / phiSum); p ? x.lineTo(ax.X(p), Y) : x.moveTo(ax.X(p), Y); } x.stroke(); x.lineWidth = 1;
    D.plateaus.forEach(p => { x.fillStyle = '#d6337a'; x.beginPath(); x.moveTo(ax.X(p.x), ax.T + 2); x.lineTo(ax.X(p.x) - 5, ax.T - 6); x.lineTo(ax.X(p.x) + 5, ax.T - 6); x.fill(); });
    x.fillStyle = '#3a2a1c'; x.fillText('input ramp Σwφ / Σφ', ax.L + 6, ax.T + 12);
  }
  function drawPh(ev) {
    const cv = $('pfPh'); if (!cv) return; const [x, W, H] = gyCanvas(cv), ax = gyAxes(x, W, H, { x0: 0, x1: PF.L, y0: 0, y1: 720, xt: gyTicks(0, PF.L, 6), yt: [0, 180, 360, 540, 720], xl: 'position (cm)', yl: 'theta phase (°)' });
    ev.filter(e => e.t > D.firstPl && e.kind !== 'bm').forEach(e => { const d = e.ph * 180 / Math.PI; x.fillStyle = e.kind === 'ss' ? 'rgba(47,111,159,.7)' : 'rgba(166,41,98,.8)'; [d, d + 360].forEach(y => { x.fillRect(ax.X(e.x) - 1.5, ax.Y(y) - 1.5, 3, 3); }); });
  }
  function maps(ev) {
    const nb = D.occ.length, ss = new Float64Array(nb), bs = new Float64Array(nb);
    ev.forEach(e => { if (e.t <= D.firstPl || e.kind === 'bm') return; const b = Math.min(nb - 1, e.x / 5 | 0); (e.kind === 'ss' ? ss : bs)[b]++; });
    const occ = D.occ, rate = a => Array.from(a, (c, i) => occ[i] > 0.05 ? c / occ[i] : 0);
    const info = a => { const r = rate(a), T = occ.reduce((p, q) => p + q, 0), mean = a.reduce((p, q) => p + q, 0) / (T || 1); if (!mean) return NaN; let I = 0; r.forEach((ri, i) => { if (ri > 0) I += (occ[i] / T) * (ri / mean) * Math.log2(ri / mean); }); return I; };
    return { ss: rate(ss), bs: rate(bs), iss: info(ss), ibs: info(bs), nss: ss.reduce((p, q) => p + q, 0), nbs: bs.reduce((p, q) => p + q, 0) };
  }
  function drawRm(ev) {
    const cv = $('pfRm'); if (!cv) return; const m = maps(ev), [x, W, H] = gyCanvas(cv), mx = Math.max(1, ...m.ss, ...m.bs) * 1.1, ax = gyAxes(x, W, H, { x0: 0, x1: PF.L, y0: 0, y1: mx, xt: gyTicks(0, PF.L, 6), yt: gyTicks(0, mx, 4), xl: 'position (cm)', yl: 'events / s' });
    [['ss', '#2f6f9f'], ['bs', '#a62962']].forEach(([k, col]) => { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); m[k].forEach((r, i) => { const X = ax.X(i * 5 + 2.5), Y = ax.Y(r); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke(); });
    x.lineWidth = 1; x.fillStyle = '#2f6f9f'; x.fillText('single spikes', ax.R - 110, ax.T + 12); x.fillStyle = '#a62962'; x.fillText('bursts', ax.R - 110, ax.T + 28);
    $('pfInfo').innerHTML = `<b>Figure 5.</b> Rate maps after the first plateau. Spatial information: <b style="color:#2f6f9f">single spikes ${isNaN(m.iss) ? '–' : m.iss.toFixed(2)} bits/event</b> (${m.nss} events), <b style="color:#a62962">bursts ${isNaN(m.ibs) ? '–' : m.ibs.toFixed(2)} bits/event</b> (${m.nbs} events). ${!isNaN(m.iss) && !isNaN(m.ibs) ? (m.ibs > m.iss ? 'Here bursts carry more, as Lowet et al. (2023) found in mice.' : 'Here single spikes carry more, the opposite of what Lowet et al. (2023) found in mice: in this cell bursts fire on every theta cycle across the whole ramp, while single spikes are confined to the field peak. Try the HH cell, a narrower plateau or weaker theta.') : ''}`;
  }
  function readout(ev) {
    const r = ev.filter(e => e.t > D.t - 10000), nss = r.filter(e => e.kind === 'ss').length, nbs = r.filter(e => e.kind === 'bs').length;
    $('pfRead').innerHTML = `<b>Session</b> lap ${D.lap} · ${(D.t / 1000).toFixed(0)} s · ${D.plateaus.length} plateau${D.plateaus.length === 1 ? '' : 's'}<br><b>Last 10 s</b> <span style="color:#2f6f9f">${nss} single</span> · <span style="color:#a62962">${nbs} bursts</span>${D.post.length ? '<br><span class="ux-dot"></span>BTSP window open: weights still changing' : ''}`;
  }
  // controls
  const bind = (k, a, b) => { const r = $('pf-' + k), n = $('pf-' + k + 'n'); r.value = n.value = S[k]; r.oninput = () => { S[k] = +r.value; n.value = r.value; }; n.onchange = () => { S[k] = Math.min(b, Math.max(a, +n.value)); r.value = n.value = S[k]; }; };
  [['v0', 5, 60], ['eta', 0, 1], ['plAmp', 0, 8], ['plDur', 50, 600], ['fth', 4, 12]].forEach(([k, a, b]) => bind(k, a, b));
  $('pfTh').onchange = e => { S.thetaOn = e.target.checked; };
  $('pfCell').onchange = e => { S.cell = e.target.value; LV.restart(); };
  $('pfNow').onclick = () => plateau();
  $('pfWipe').onclick = () => { D.w.fill(PF.w0); D.post = []; D.plateaus = []; D.events = []; D.firstPl = Infinity; D.occ.fill(0); D.lap = 1; D.nextPl = null; };
  $('pfTrack').onclick = e => { const b = $('pfTrack').getBoundingClientRect(), px = e.clientX - b.left, p = (px - 20) / (b.width - 40) * PF.L; if (p < 0 || p > PF.L) return; D.nextPl = { lap: D.x < p ? D.lap : D.lap + 1, x: p }; };
  const resetAll = () => { reset(); origMake(); };
  resetAll();
  const LV = ngLive({ bar: 'pfLive', step, draw, reset: resetAll, chunk: 2 }); LV.play();
  window.addEventListener('resize', () => { if ($('pfTrack')) { fc = 0; draw(); } });
}
window.renderResearchPlace = renderResearchPlace;
/* Page: /biology/research-resonance/ — Resonance experiment. Subthreshold impedance Z(f) by discrete sinusoid sweep,
   measured on the steady-state response after the transient, with fR and Q; every model's numerical result is compared
   with its own linearised equations (analytic or exact Jacobian), so implementation errors show up as a mismatch.
   Units: mV, ms, µF/cm², mS/cm², µA/cm²  ⇒  Z in kΩ·cm² (= mV per µA/cm²). */
const RX_PROV = { pub: ['published', '#2f7d5b'], cho: ['chosen here', '#d08a2e'], fit: ['fitted to HH', '#2f6f9f'] };
const rxG = (v, th, k) => 1 / (1 + Math.exp(-(v - th) / k));
/* each model: params [key, label, unit, min, max, step, provenance, source], rhs, steady state, linear admittance */
const RX_MODELS = {
  lif: { name: 'Passive two-point LIF', type: 'Passive membrane (no active currents); spikes disabled', expect: 'Non-resonant reference: low-pass only.',
    P: [['C', 'Capacitance C', 'µF/cm²', 0.5, 2, 0.05, 'pub', 'Ceballos et al. 2025 Table 1'], ['gL', 'Leak g<sub>L</sub>', 'mS/cm²', 0.01, 0.5, 0.005, 'pub', 'Ceballos et al. 2025'], ['EL', 'Leak reversal E<sub>L</sub>', 'mV', -90, -50, 0.5, 'pub', 'Ceballos et al. 2025'],
      ['gac', 'Soma–dendrite coupling g<sub>ac</sub>', 'mS/cm²', 0, 2, 0.01, 'pub', 'Ceballos et al. 2025'], ['I0', 'Holding current', 'µA/cm²', -2, 2, 0.05, 'cho', '']],
    D: { C: 1, gL: 0.04, EL: -70, gac: 0.2, I0: 0 }, n: 2,
    rhs: (p, y, Is, Id, d) => { d[0] = (-p.gL * (y[0] - p.EL) - p.gac * (y[0] - y[1]) + p.I0 + Is) / p.C; d[1] = (-p.gL * (y[1] - p.EL) - p.gac * (y[1] - y[0]) + Id) / p.C; },
    init: p => { const a = p.gL + p.gac, Vd = (p.gL * p.EL * a + p.gac * (p.gL * p.EL + p.I0)) / (a * a - p.gac * p.gac); const Vs = (p.gL * p.EL + p.I0 + p.gac * Vd) / a; return [Vs, Vd]; },
    lin: (p, y, w, site) => { const Ys = [p.gL, w * p.C], Yd = [p.gL, w * p.C], c = p.gac;
      if (site === 'soma') { const Yt = rxAdd(Ys, rxMul([c, 0], rxDiv(Yd, rxAdd(Yd, [c, 0])))); return rxDiv([1, 0], Yt); }
      const den = rxSub(rxMul(rxAdd(Ys, [c, 0]), rxAdd(Yd, [c, 0])), [c * c, 0]); return rxDiv([c, 0], den); } },
  glif: { name: 'GLIF (below threshold)', type: 'Spike-triggered currents and threshold disabled; below threshold GLIF is a passive membrane', expect: 'Identical to the passive LIF: GLIF’s extra mechanisms act only after spikes.',
    P: [['C', 'Capacitance C', 'µF/cm²', 0.5, 2, 0.05, 'pub', 'Ceballos et al. 2025'], ['G', 'Conductance G', 'mS/cm²', 0.01, 1, 0.005, 'fit', 'ir_ladder fit.py (effective conductance at rest)'], ['EL', 'Rest E<sub>L</sub>', 'mV', -80, -50, 0.5, 'fit', 'ir_ladder fit.py'], ['I0', 'Holding current', 'µA/cm²', -2, 2, 0.05, 'cho', '']],
    D: { C: 1, G: 0.482, EL: -57.26, I0: 0 }, n: 1,
    rhs: (p, y, Is, Id, d) => { d[0] = (-p.G * (y[0] - p.EL) + p.I0 + Is + Id) / p.C; },
    init: p => [p.EL + p.I0 / p.G], lin: (p, y, w) => rxDiv([1, 0], [p.G, w * p.C]) },
  nap: null, ih: null, napih: null,   // filled below (Pena & Rotstein variants)
  adex: { name: 'AdEx (subthreshold)', type: 'Exponential spike term kept, reset disabled; the adaptation variable w is a linear slow current', expect: 'Resonant when a > 0 and τ<sub>w</sub> is slow enough.',
    P: [['C', 'Capacitance C', 'µF/cm²', 0.5, 2, 0.05, 'pub', 'Ceballos et al. 2025'], ['gL', 'Leak g<sub>L</sub>', 'mS/cm²', 0.005, 0.3, 0.001, 'fit', 'linearisation of the HH model'], ['EL', 'E<sub>L</sub>', 'mV', -80, -45, 0.1, 'fit', 'linearisation of the HH model'],
      ['DT', 'Slope Δ<sub>T</sub>', 'mV', 0.5, 6, 0.1, 'fit', 'fit.py'], ['VT', 'Soft threshold V<sub>T</sub>', 'mV', -60, -40, 0.1, 'fit', 'fit.py'], ['a', 'Subthreshold coupling a', 'mS/cm²', 0, 1, 0.005, 'fit', 'G<sup>Der</sup> of I<sub>M</sub> in the HH model'],
      ['tauw', 'τ<sub>w</sub>', 'ms', 5, 500, 1, 'pub', 'I<sub>M</sub> time constant (Golomb et al. 2006)'], ['I0', 'Holding current', 'µA/cm²', -2, 2, 0.05, 'cho', '']],
    D: { C: 1, gL: 0.0361, EL: -57.05, DT: 4.39, VT: -51.8, a: 0.5776, tauw: 75, I0: 0 }, n: 2,
    rhs: (p, y, Is, Id, d) => { d[0] = (-p.gL * (y[0] - p.EL) + p.gL * p.DT * Math.exp(Math.min((y[0] - p.VT) / p.DT, 20)) - y[1] + p.I0 + Is + Id) / p.C; d[1] = (p.a * (y[0] - p.EL) - y[1]) / p.tauw; },
    init: p => { const F = V => -p.gL * (V - p.EL) + p.gL * p.DT * Math.exp((V - p.VT) / p.DT) - p.a * (V - p.EL) + p.I0; let lo = -120, hi = p.VT; const noRest = F(lo) < 0 || F(hi) > 0; /* F(V_T) > 0: holding current is past the fold, no resting state below V_T */ for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; F(m) > 0 ? lo = m : hi = m; } const V = (lo + hi) / 2, y = [V, p.a * (V - p.EL)]; y.noRest = noRest; return y; },
    lin: (p, y, w) => { const ge = p.gL - p.gL * Math.exp((y[0] - p.VT) / p.DT); return rxDiv([1, 0], rxAdd([ge, w * p.C], rxDiv([p.a, 0], [1, w * p.tauw]))); } },
  hh: { name: 'Biophysical HH (Ceballos 2025, hybrid reading)', type: 'Real action-potential currents; spikes cannot be switched off, so the input is kept weak and any spike invalidates the point', expect: 'Resonant near threshold, set mainly by I<sub>M</sub> (see Reduction).',
    P: [['gNaP', 'g<sub>NaP</sub>', 'mS/cm²', 0, 2, 0.01, 'pub', 'Table 1'], ['thp', 'θ<sub>p</sub>', 'mV', -50, -30, 0.5, 'cho', 'hybrid reading (Table 1 value −35; code −47)'], ['gKdr', 'g<sub>Kdr</sub>', 'mS/cm²', 0, 15, 0.1, 'pub', 'Table 1'], ['gM', 'g<sub>KM</sub>', 'mS/cm²', 0, 5, 0.05, 'pub', 'Table 1'],
      ['gKA', 'g<sub>KA</sub>', 'mS/cm²', 0, 6, 0.1, 'pub', 'Table 1'], ['gh', 'Dendritic g<sub>h</sub>', 'mS/cm²', 0, 15, 0.01, 'pub', 'Table 1'], ['gac', 'Coupling g<sub>ac</sub>', 'mS/cm²', 0, 1, 0.01, 'pub', 'Table 1'], ['gL', 'Leak g<sub>L</sub>', 'mS/cm²', 0.01, 0.2, 0.005, 'pub', 'Table 1'], ['I0', 'Holding current', 'µA/cm²', -3, 1.2, 0.05, 'cho', 'kept below the spike threshold (~1.5)']],
    D: null, n: 11 } };
/* complex helpers */
function rxAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function rxSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function rxMul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function rxDiv(a, b) { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
/* Pena & Rotstein 2022 NaP + Ih model and its one-current variants (published parameters) */
(function () {
  const P = [['C', 'Capacitance C', 'µF/cm²', 0.5, 2, 0.05, 'pub', 'Pena & Rotstein 2022'], ['gL', 'Leak g<sub>L</sub>', 'mS/cm²', 0.05, 2, 0.01, 'pub', 'Pena & Rotstein 2022'], ['EL', 'E<sub>L</sub>', 'mV', -80, -50, 0.5, 'pub', 'Pena & Rotstein 2022'],
    ['gp', 'g<sub>p</sub> (persistent Na⁺)', 'mS/cm²', 0, 2, 0.01, 'pub', 'Pena & Rotstein 2022'], ['vp', 'p half-activation', 'mV', -55, -25, 0.1, 'pub', 'Pena & Rotstein 2022'], ['kp', 'p slope', 'mV', 2, 12, 0.1, 'pub', 'Pena & Rotstein 2022'],
    ['gh', 'g<sub>h</sub>', 'mS/cm²', 0, 5, 0.01, 'pub', 'Pena & Rotstein 2022'], ['vr', 'r half-activation', 'mV', -95, -60, 0.1, 'pub', 'Pena & Rotstein 2022'], ['kr', 'r slope', 'mV', 4, 15, 0.01, 'pub', 'Pena & Rotstein 2022'], ['taur', 'τ<sub>r</sub>', 'ms', 10, 400, 1, 'pub', 'Pena & Rotstein 2022'],
    ['ENa', 'E<sub>Na</sub>', 'mV', 40, 70, 1, 'pub', 'Pena & Rotstein 2022'], ['Eh', 'E<sub>h</sub>', 'mV', -40, 0, 1, 'pub', 'Pena & Rotstein 2022'], ['I0', 'Holding current I<sub>app</sub>', 'µA/cm²', -8, 2, 0.05, 'pub', 'Pena & Rotstein 2022 (−2.5)']];
  const D = { C: 1, gL: 0.5, EL: -65, gp: 0.5, vp: -38, kp: 6.5, gh: 1.5, vr: -79.2, kr: 9.78, taur: 80, ENa: 55, Eh: -20, I0: -2.5 };
  const pinf = (p, v) => rxG(v, p.vp, p.kp), rinf = (p, v) => 1 / (1 + Math.exp((v - p.vr) / p.kr));
  const mk = (name, ov, expect) => ({ name, type: 'Conductance-based subthreshold model (Pena & Rotstein 2022); no spike mechanism', expect, P, D: Object.assign({}, D, ov), n: 2,
    rhs: (p, y, Is, Id, d) => { d[0] = (-p.gL * (y[0] - p.EL) - p.gp * pinf(p, y[0]) * (y[0] - p.ENa) - p.gh * y[1] * (y[0] - p.Eh) + p.I0 + Is + Id) / p.C; d[1] = (rinf(p, y[0]) - y[1]) / p.taur; },
    init: p => { const F = V => -p.gL * (V - p.EL) - p.gp * pinf(p, V) * (V - p.ENa) - p.gh * rinf(p, V) * (V - p.Eh) + p.I0; let best = null; for (let V = -110; V < -20; V += 0.5) if (F(V) > 0 && F(V + 0.5) <= 0) { let lo = V, hi = V + 0.5; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; F(m) > 0 ? lo = m : hi = m; } best = (lo + hi) / 2; break; } const noRest = best === null; best = best ?? -65; const y = [best, rinf(p, best)]; y.noRest = noRest; return y; },
    lin: (p, y, w) => { const V = y[0], e = 1e-4, dp = (pinf(p, V + e) - pinf(p, V - e)) / (2 * e), dr = (rinf(p, V + e) - rinf(p, V - e)) / (2 * e);
      const gi = p.gL + p.gp * pinf(p, V) + p.gp * (V - p.ENa) * dp + p.gh * rinf(p, V), gd = p.gh * (V - p.Eh) * dr; return rxDiv([1, 0], rxAdd([gi, w * p.C], rxDiv([gd, 0], [1, w * p.taur]))); } });
  RX_MODELS.napih = mk('NaP + Iₕ (Pena & Rotstein 2022)', {}, 'Resonant: Iₕ restores, I<sub>NaP</sub> amplifies the peak.');
  RX_MODELS.ih = mk('Iₕ only', { gp: 0 }, 'Resonant from Iₕ alone, with a lower peak than NaP + Iₕ.');
  RX_MODELS.nap = mk('NaP only', { gh: 0 }, 'Non-resonant: an instantaneous amplifying current raises the impedance at all frequencies but cannot create a peak.');
})();
RX_MODELS.hh.D = { gNaP: 0.9, thp: -35, gKdr: 5.8, gM: 2.4, gKA: 2.8, gh: 8.46, gac: 0.2, gL: 0.04, I0: 1.0 };
const RX_ORDER = ['lif', 'glif', 'nap', 'ih', 'napih', 'adex', 'hh'];
const RX_COL = { lif: '#8a7058', glif: '#b9a796', nap: '#d08a2e', ih: '#2f6f9f', napih: '#a62962', adex: '#2f7d5b', hh: '#1d140d' };
function rxHHparams(p) { return Object.assign({}, IR_HH, IR_GATE.hybrid[1], { gNaP: p.gNaP, thp: p.thp, gKdr: p.gKdr, gM: p.gM, gKA: p.gKA, gh: p.gh, gac: p.gac, gL: p.gL, dend: 1 }); }
/* one model instance for the sweep: steady state, simulate with a sinusoid, linear prediction */
function rxModel(key, p, site) {
  const M = RX_MODELS[key];
  if (key === 'hh') {
    const Q = rxHHparams(p), st = irSteady(Q, p.I0), J = irJac(Q, st.y, p.I0);
    return { n: 11, y0: st.y, drift: st.drift, dt: 0.025, rhs: (y, Is, Id, d) => irHHrhs(Q, y, p.I0 + Is, Id, d),
      lin: w => { if (site === 'soma') return irZ(J, w, Q.C); const n = J.length, J2 = J.map(r => r.slice()); // transfer dendrite → soma: solve (iω − J) x = e_d, read x0
        const A = J2.map((r, i) => r.map((v, j) => [-v, i === j ? w : 0])), b = J2.map((_, i) => [i === 9 ? 1 : 0, 0]); return rxSolve(A, b)[0].map(v => v / Q.C); },
      spikeV: -20 };
  }
  const y0 = M.init(p);
  return { n: M.n, y0, drift: y0.noRest ? 1 : 0, dt: 0.05, rhs: key === 'lif' ? (y, Is, Id, d) => M.rhs(p, y, Is, Id, d) : (y, Is, Id, d) => M.rhs(p, y, Is + Id, 0, d),
    lin: w => M.lin(p, y0, w, site), spikeV: key === 'adex' ? p.VT + 3 : Infinity, siteNote: key !== 'lif' && key !== 'hh' && site === 'dend' ? 'single compartment: input applied to the soma' : '' };
}
function rxSolve(A, b) {
  const n = A.length; for (let k = 0; k < n; k++) { let pv = k; for (let i = k + 1; i < n; i++) if (Math.hypot(...A[i][k]) > Math.hypot(...A[pv][k])) pv = i; [A[k], A[pv]] = [A[pv], A[k]]; [b[k], b[pv]] = [b[pv], b[k]];
    for (let i = k + 1; i < n; i++) { const f = rxDiv(A[i][k], A[k][k]); for (let j = k; j < n; j++) A[i][j] = rxSub(A[i][j], rxMul(f, A[k][j])); b[i] = rxSub(b[i], rxMul(f, b[k])); } }
  const x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s = rxSub(s, rxMul(A[i][j], x[j])); x[i] = rxDiv(s, A[i][i]); } return [x[0]];
}
/* RK4 with sinusoidal input; returns the measured complex impedance, response amplitude, spikes and a trace */
function rxMeasure(inst, f, A, site, keepTrace) {
  const n = inst.n, y = inst.y0.slice(), per0 = 1000 / f, dt = per0 / Math.max(1, Math.round(per0 / inst.dt)), k1 = new Array(n), k2 = new Array(n), k3 = new Array(n), k4 = new Array(n), tp = new Array(n);
  const per = per0, settle = Math.ceil(Math.max(1000, 3 * per) / per) * per, nc = Math.max(4, Math.ceil(1000 / per)), meas = nc * per, T = settle + meas, N = Math.round(T / dt), w = 2 * Math.PI * f * 1e-3;   // dt divides the period exactly; whole cycles
  let vmax = -1e9, vmin = 1e9, spk = false; const tr = keepTrace ? [] : null, TT = [], VV = [];
  const I = t => A * Math.sin(w * t);
  for (let k = 0; k < N; k++) {
    const t = k * dt, s0 = I(t), sh = I(t + dt / 2), s1 = I(t + dt), sI = site === 'soma', a0 = sI ? s0 : 0, b0 = sI ? 0 : s0, ah = sI ? sh : 0, bh = sI ? 0 : sh, a1 = sI ? s1 : 0, b1 = sI ? 0 : s1;
    inst.rhs(y, a0, b0, k1); for (let j = 0; j < n; j++) tp[j] = y[j] + dt / 2 * k1[j]; inst.rhs(tp, ah, bh, k2); for (let j = 0; j < n; j++) tp[j] = y[j] + dt / 2 * k2[j];
    inst.rhs(tp, ah, bh, k3); for (let j = 0; j < n; j++) tp[j] = y[j] + dt * k3[j]; inst.rhs(tp, a1, b1, k4); for (let j = 0; j < n; j++) y[j] += dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
    const tt = t + dt, v = y[0]; if (v > inst.spikeV) spk = true;
    if (tt > settle + 1e-9) { TT.push(tt); VV.push(v); if (v > vmax) vmax = v; if (v < vmin) vmin = v; }
    if (tr && k % Math.max(1, Math.round(N / 1500)) === 0) tr.push([tt, v, I(tt)]);
  }
  // least-squares fit V(t) = c0 + c1 t + a sin(wt) + b cos(wt) + a2 sin(2wt) + b2 cos(2wt) over the steady-state window:
  // the linear term absorbs slow drift (e.g. seconds-long Iₕ) without biasing the fundamental; input A sin(wt) ⇒ Z = (a + i b)/A
  const cnt = TT.length, t0w = TT[0], NB = 6, G = [...Array(NB)].map(() => new Float64Array(NB)), r = new Float64Array(NB), bf = new Float64Array(NB);
  for (let k = 0; k < cnt; k++) { const t = TT[k], u = (t - t0w) / 1000; bf[0] = 1; bf[1] = u; bf[2] = Math.sin(w * t); bf[3] = Math.cos(w * t); bf[4] = Math.sin(2 * w * t); bf[5] = Math.cos(2 * w * t);
    for (let p = 0; p < NB; p++) { r[p] += bf[p] * VV[k]; for (let q = p; q < NB; q++) G[p][q] += bf[p] * bf[q]; } }
  for (let p = 0; p < NB; p++) for (let q = 0; q < p; q++) G[p][q] = G[q][p];
  for (let c = 0; c < NB; c++) { let pv = c; for (let k = c + 1; k < NB; k++) if (Math.abs(G[k][c]) > Math.abs(G[pv][c])) pv = k; [G[c], G[pv]] = [G[pv], G[c]]; [r[c], r[pv]] = [r[pv], r[c]];
    for (let k = c + 1; k < NB; k++) { const fct = G[k][c] / G[c][c]; for (let q = c; q < NB; q++) G[k][q] -= fct * G[c][q]; r[k] -= fct * r[c]; } }
  const cf = new Float64Array(NB); for (let p = NB - 1; p >= 0; p--) { let sm = r[p]; for (let q = p + 1; q < NB; q++) sm -= G[p][q] * cf[q]; cf[p] = sm / G[p][p]; }
  const a = cf[2], b = cf[3], amp = Math.hypot(a, b), h2a = Math.hypot(cf[4], cf[5]), h2 = h2a > 0.01 ? h2a : 0, slope = cf[1] / 1000; let mean = 0; for (let k = 0; k < cnt; k++) mean += VV[k];
  return { f, Z: [a / A, b / A], mag: amp / A, ph: Math.atan2(b, a) * 180 / Math.PI, amp, h2: h2 / Math.max(amp, 1e-12), drift: slope * 1000, spk, vmean: mean / cnt, pp: vmax - vmin, settle, meas, tr };
}
function rxSummary(res) {
  const F = res.map(r => r.f), Zm = res.map(r => r.mag), i = Zm.indexOf(Math.max(...Zm)), z0 = Zm[0];
  const fR = i > 0 ? F[i] : 0, Q = Zm[i] / z0;
  // parabolic refinement of the peak on the frequency grid
  let fRr = fR; if (i > 0 && i < F.length - 1) { const y1 = Zm[i - 1], y2 = Zm[i], y3 = Zm[i + 1], d = (y1 - 2 * y2 + y3); if (d < 0) fRr = F[i] + 0.5 * (y1 - y3) / d * (F[i + 1] - F[i]); }
  return { fR: i > 0 && i < F.length - 1 ? fRr : (i === 0 ? 0 : F[i]), Q, Zmax: Zm[i], Z0: z0, edge: i === F.length - 1, phR: res[i].ph };
}
function renderResearchResonance() {
  document.title = 'Resonance experiment · My research';
  const S = { model: 'napih', site: 'soma', A: 0.05, f0: 1, f1: 20, df: 1, P: {}, cmp: {}, last: null, running: 0, view: null };
  RX_ORDER.forEach(k => S.P[k] = Object.assign({}, RX_MODELS[k].D));
  try { const sv = JSON.parse(localStorage.getItem('rx-configs') || '{}'); S.saved = sv; } catch (e) { S.saved = {}; }
  $('lesson').innerHTML = bioHead('Resonance experiment', 'MY RESEARCH · METHOD · SUBTHRESHOLD IMPEDANCE',
    'Measure each model’s frequency preference the way it is measured in slices: inject a weak sinusoidal current, wait for the transient to die away, and read the steady-state voltage amplitude and phase. The ratio is the impedance Z(f); its peak gives the resonant frequency f<sub>R</sub> and the resonance strength Q. Every measured curve is checked against the same model’s equations solved exactly, so a numerical error would show as a mismatch.')
    + `<nav class="page-jumps"><a href="#rx-run">Experiment</a><a href="#rx-cmp">Compare models</a><a href="#rx-par">Parameters</a><a href="#rx-repro">Save &amp; export</a><a href="#rx-how">Method</a><a href="#rs-refs">References</a></nav>
    <section class="lesson-section lab" id="rx-run"><p class="eyebrow">01 · Experiment</p><h2>Frequency sweep, 1–20 Hz, subthreshold</h2>
      <div class="ux-bar"><div class="ux-seg" role="radiogroup" aria-label="Model">${RX_ORDER.map(k => `<button role="radio" aria-checked="${k === S.model}" data-rxm="${k}">${RX_MODELS[k].name.split(' (')[0]}</button>`).join('')}</div></div>
      <div class="ux-bar"><div class="ux-seg" role="radiogroup" aria-label="Input site">${[['soma', 'Inject at soma'], ['dend', 'Inject at dendrite (measure at soma)']].map(([k, l]) => `<button role="radio" aria-checked="${k === S.site}" data-rxs="${k}">${l}</button>`).join('')}</div>
        <label class="nl-inl">Amplitude <input class="ux-num" type="number" id="rxA" value="${S.A}" step="0.01" min="0.001" max="2" style="width:80px"> µA/cm²</label><label class="nl-inl ux-chk" style="margin:0!important"><input type="checkbox" id="rxAuto" checked> Auto-scale so the largest response is ≈ 0.25 mV</label>
        <label class="nl-inl">From <input class="ux-num" type="number" id="rxF0" value="1" step="0.5" min="0.5" max="50" style="width:64px"> to <input class="ux-num" type="number" id="rxF1" value="20" step="1" min="1" max="100" style="width:64px"> Hz, step <input class="ux-num" type="number" id="rxDF" value="1" step="0.25" min="0.25" max="5" style="width:64px"></label>
        <span class="ux-sp"></span><button class="ux-run" id="rxGo">Run sweep</button><button class="secondary" id="rxStop">Stop</button></div>
      <p class="ux-note" id="rxType"></p>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px">
        <div class="ux-fig"><canvas id="rxTr" class="ux-cv" style="height:250px" aria-label="Voltage response at the current frequency"></canvas><p class="ux-note" id="rxTrNote"><b>Figure 1.</b> Voltage at the soma during the frequency being measured (black) and the injected current (grey, scaled). The shaded part is the steady-state window used for the measurement; the transient before it is discarded.</p></div>
        <div class="ux-fig"><canvas id="rxZ" class="ux-cv" style="height:250px" aria-label="Impedance against frequency"></canvas><p class="ux-note"><b>Figure 2.</b> |Z(f)|: dots are measured from simulation, the line is the same model’s linearised equations solved exactly. The ring marks f<sub>R</sub>.</p></div>
        <div class="ux-fig"><canvas id="rxPh" class="ux-cv" style="height:200px" aria-label="Phase against frequency"></canvas><p class="ux-note"><b>Figure 3.</b> Phase of the voltage relative to the current (negative = voltage lags). Resonant cells show a phase lead below f<sub>R</sub> and cross zero near it.</p></div>
        <div class="ux-fig" id="rxRes"><p class="ux-note">Press <b>Run sweep</b>.</p></div></div></section>
    <section class="lesson-section" id="rx-cmp"><p class="eyebrow">02 · Compare</p><h2>Which models resonate?</h2>
      <div class="ux-bar"><button class="ux-run" id="rxAll">Sweep all seven models</button><button class="secondary" id="rxAdd">Add current result</button><button class="secondary" id="rxClr">Clear</button><label class="nl-inl ux-chk" style="margin:0!important"><input type="checkbox" id="rxNorm" checked> Normalise to Z at the lowest frequency</label><span id="rxAllSt" class="ux-status"></span></div>
      <div class="ux-fig"><canvas id="rxC" class="ux-cv" style="height:300px" aria-label="Impedance curves of several models"></canvas><p class="ux-note"><b>Figure 4.</b> Impedance curves of every model added. The passive LIF and GLIF are the non-resonant references.</p></div>
      <div class="ml-tablewrap" id="rxTab"></div></section>
    <section class="lesson-section" id="rx-par"><p class="eyebrow">03 · Parameters</p><h2>Parameters of the selected model</h2>
      <p>Values are labelled <b style="color:#2f7d5b">published</b> (taken from the cited paper), <b style="color:#2f6f9f">fitted</b> (fitted here to the biophysical model) or <b style="color:#d08a2e">chosen here</b> (no published value: a modelling choice). Editing a value marks it as edited.</p>
      <div class="ux-bar"><button class="secondary" id="rxReset">Reset this model to its default values</button></div>
      <div class="ml-tablewrap"><table class="ml-table" id="rxPT"></table></div></section>
    <section class="lesson-section" id="rx-repro"><p class="eyebrow">04 · Reproducibility</p><h2>Save configurations and export results</h2>
      <div class="ux-bar"><input type="text" id="rxName" placeholder="name this configuration" style="max-width:240px;margin:0"><button class="secondary" id="rxSave">Save configuration</button><select id="rxLoad" style="max-width:240px;margin:0"><option value="">Load a saved configuration…</option></select><button class="secondary" id="rxCopyCfg">Copy configuration (JSON)</button><button class="secondary" id="rxPaste">Load from JSON below</button></div>
      <div class="ux-bar"><button class="secondary" id="rxCSV">Show CSV of the current comparison</button><button class="secondary" id="rxCopyCSV">Copy CSV</button></div>
      <textarea id="rxOut" rows="8" style="width:100%;font-family:ui-monospace,Menlo,monospace;font-size:12px" placeholder="CSV or JSON appears here; paste a configuration here to load it"></textarea>
      <p class="ux-note">Saved configurations stay in this browser. Copy the JSON to keep a configuration with your notes or share it.</p></section>
    <section class="lesson-section" id="rx-how"><details class="uth" open><summary><span>Method</span> how Z(f), f<sub>R</sub> and Q are measured, and checks</summary><div class="uth-grid">
      <div><h4>Protocol</h4><p>Each model is first brought to its steady state at the holding current (analytic or numerical; the HH model is integrated for 8 s). For each frequency f a sinusoid A sin(2πft) is injected from that state (by default A is scaled so the largest predicted response is ≈ 0.25 mV, keeping every model in its linear range); the time step is adjusted to divide the period exactly; the first max(1 s, 3 cycles) are discarded as transient and the next max(4 cycles, 1 s), an integer number of cycles, are analysed. The voltage is fitted by least squares with a constant, a linear drift and sine and cosine terms at f and 2f: Z = (a + ib)/A, |Z| = amplitude/A, phase = atan2(b, a). Integration is fourth-order Runge–Kutta (Δt 0.05 ms; 0.025 ms for HH).</p></div>
      <div><h4>f<sub>R</sub> and Q</h4><p>f<sub>R</sub> is the frequency of the largest |Z|, refined by a parabola through the three highest points; if the largest |Z| is at the lowest frequency the model is non-resonant (f<sub>R</sub> = 0). Q = |Z(f<sub>R</sub>)| / |Z(f<sub>min</sub>)|, the usual resonance strength with f<sub>min</sub> the lowest frequency swept. A peak at the highest frequency is flagged: extend the range.</p></div>
      <div><h4>Subthreshold checks</h4><p>Threshold and reset are disabled in the integrate-and-fire models. Each point reports the peak-to-peak response and the second-harmonic ratio; a point is flagged if a spike occurs (HH: V &gt; −20 mV; AdEx: V &gt; V<sub>T</sub> + 3 mV), if the response exceeds 5 mV peak-to-peak, or if the second harmonic exceeds 5 % of the fundamental and 0.01 mV (nonlinearity). A linear drift within the window (e.g. from seconds-long Iₕ) is fitted jointly so it does not bias the result. Lower the amplitude if flags appear.</p></div>
      <div><h4>Implementation check</h4><p>The line in Figure 2 is the model’s own linearisation: analytic admittances for the LIF, GLIF, NaP/Iₕ and AdEx models, and the exact Jacobian of all 11 variables for HH. Agreement within ~1 % at small amplitude confirms that the simulated equations, units and the measurement agree. The table reports the largest deviation.</p></div></div></details></section>
    ${rsRefs(['hutcheon00', 'hu02', 'pena18', 'pena22', 'ceballos25', 'golomb06', 'brette05'])}`;
  $('rs-refs').querySelector('ol').insertAdjacentHTML('beforeend', '<li>Teeter C, Iyer R, Menon V, et al. (2018). Generalized leaky integrate-and-fire models classify multiple neuron types. <i>Nat Commun</i> 9:709. <a href="https://doi.org/10.1038/s41467-017-02717-4" target="_blank" rel="noopener">doi</a></li>');
  const M = () => RX_MODELS[S.model], P = () => S.P[S.model];
  function paramTable() {
    const m = M(), p = P(), d = m.D;
    $('rxPT').innerHTML = `<thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Range</th><th>Provenance</th><th>Source</th></tr></thead><tbody>${m.P.map(([k, l, u, a, b, st, pv, src]) => { const ed = Math.abs(p[k] - d[k]) > 1e-12;
      return `<tr><td>${l}</td><td><input class="ux-num" type="number" data-rxp="${k}" value="${p[k]}" min="${a}" max="${b}" step="${st}" style="width:100px"></td><td>${u}</td><td>${a} – ${b}</td><td><b style="color:${ed ? '#b0413e' : RX_PROV[pv][1]}">${ed ? 'edited' : RX_PROV[pv][0]}</b></td><td class="ux-note">${src}${ed ? ` (default ${d[k]})` : ''}</td></tr>`; }).join('')}</tbody>`;
    document.querySelectorAll('[data-rxp]').forEach(inp => inp.onchange = () => { const [k, , , a, b] = m.P.find(r => r[0] === inp.dataset.rxp); p[k] = Math.min(b, Math.max(a, +inp.value)); paramTable(); });
    $('rxType').innerHTML = `<b>${m.name}.</b> ${m.type}. <b>Expected:</b> ${m.expect}`;
  }
  document.querySelectorAll('[data-rxm]').forEach(b => b.onclick = () => { S.model = b.dataset.rxm; document.querySelectorAll('[data-rxm]').forEach(o => o.setAttribute('aria-checked', o === b)); paramTable(); });
  document.querySelectorAll('[data-rxs]').forEach(b => b.onclick = () => { S.site = b.dataset.rxs; document.querySelectorAll('[data-rxs]').forEach(o => o.setAttribute('aria-checked', o === b)); });
  $('rxReset').onclick = () => { S.P[S.model] = Object.assign({}, M().D); paramTable(); };
  const freqs = () => { const a = +$('rxF0').value, b = +$('rxF1').value, d = Math.max(0.1, +$('rxDF').value), F = []; for (let f = a; f <= b + 1e-9; f += d) F.push(+f.toFixed(4)); return F; };
  function sweep(key, onDone, onPoint) {
    const job = ++S.running, p = Object.assign({}, S.P[key]), site = S.site, F = freqs(), inst = rxModel(key, p, site), res = [];
    let i = 0; const lin = F.map(f => { const z = inst.lin(2 * Math.PI * f * 1e-3); return { f, Z: z, mag: Math.hypot(z[0], z[1]), ph: Math.atan2(z[1], z[0]) * 180 / Math.PI }; });
    const A = $('rxAuto').checked ? Math.min(+$('rxA').value, 0.25 / Math.max(...lin.map(l => l.mag))) : +$('rxA').value;
    const go = () => { if (job !== S.running || !$('rxZ')) return; const t0 = performance.now();
      while (i < F.length && performance.now() - t0 < 30) { res.push(rxMeasure(inst, F[i], A, site, true)); i++; }
      onPoint && onPoint({ key, res, lin, inst, p, A, site, F });
      if (i < F.length) setTimeout(go, 0); else onDone && onDone({ key, res, lin, inst, p, A, site, F }); };
    setTimeout(go, 10);
  }
  function analyse(R) {
    const s = rxSummary(R.res), sl = rxSummary(R.lin.map(l => ({ f: l.f, mag: l.mag, ph: l.ph }))), dev = Math.max(...R.res.map((r, i) => Math.abs(r.mag - R.lin[i].mag) / R.lin[i].mag)) * 100;
    const flags = []; if (R.res.some(r => r.spk)) flags.push('spike during measurement'); if (R.res.some(r => r.pp > 5)) flags.push('response > 5 mV peak-to-peak'); if (R.res.some(r => r.h2 > 0.05)) flags.push('second harmonic > 5 %'); if (s.edge) flags.push('peak at the top of the range'); if (R.inst.drift > 1e-3) flags.push(R.key === 'hh' ? 'not at rest at the holding current (cell is firing)' : 'no stable resting state at this holding current');
    return Object.assign(R, { s, sl, dev, flags, V: R.inst.y0[0] });
  }
  function drawRun(R, live) {
    if (!R) return; const last = R.res[R.res.length - 1];
    let [x, W, H] = gyCanvas($('rxTr'));
    if (last && last.tr) { const t = last.tr.map(q => q[0]), v = last.tr.map(q => q[1]), I = last.tr.map(q => q[2]), vmn = Math.min(...v), vmx = Math.max(...v), pad = Math.max(0.2, (vmx - vmn) * 0.15);
      const ax = gyAxes(x, W, H, { x0: 0, x1: t[t.length - 1], y0: vmn - pad, y1: vmx + pad, xt: gyTicks(0, t[t.length - 1], 4), yt: gyTicks(vmn - pad, vmx + pad, 4), xl: `time (ms) · ${last.f} Hz`, yl: 'V (mV)' });
      x.fillStyle = 'rgba(166,41,98,.07)'; x.fillRect(ax.X(last.settle), ax.T, ax.R - ax.X(last.settle), ax.B - ax.T);
      const ia = Math.max(...I.map(Math.abs)) || 1, mid = (vmx + vmn) / 2, sc = (vmx - vmn) / 2 / ia;
      x.strokeStyle = '#cdbfae'; x.beginPath(); t.forEach((tt, i) => i ? x.lineTo(ax.X(tt), ax.Y(mid + I[i] * sc)) : x.moveTo(ax.X(tt), ax.Y(mid + I[i] * sc))); x.stroke();
      x.strokeStyle = '#1d140d'; x.lineWidth = 1.3; x.beginPath(); t.forEach((tt, i) => i ? x.lineTo(ax.X(tt), ax.Y(v[i])) : x.moveTo(ax.X(tt), ax.Y(v[i]))); x.stroke(); x.lineWidth = 1;
      $('rxTrNote').innerHTML = `<b>Figure 1.</b> ${last.f} Hz: steady-state amplitude ${last.amp.toFixed(3)} mV (peak-to-peak ${last.pp.toFixed(2)} mV), mean ${last.vmean.toFixed(2)} mV, second harmonic ${(last.h2 * 100).toFixed(1)} %${last.spk ? ' · <b class="ux-bad">spiked</b>' : ''}. Shaded: the steady-state window (after ${Math.round(last.settle)} ms of transient).`; }
    const F = R.F, zm = Math.max(...R.lin.map(l => l.mag), ...R.res.map(r => r.mag)) * 1.12;
    [x, W, H] = gyCanvas($('rxZ')); let ax = gyAxes(x, W, H, { x0: F[0], x1: F[F.length - 1], y0: 0, y1: zm, xt: gyTicks(F[0], F[F.length - 1], 5), yt: gyTicks(0, zm, 4), xl: 'frequency (Hz)', yl: '|Z| (kΩ·cm²)' });
    x.strokeStyle = RX_COL[R.key]; x.lineWidth = 2; x.beginPath(); R.lin.forEach((l, i) => i ? x.lineTo(ax.X(l.f), ax.Y(l.mag)) : x.moveTo(ax.X(l.f), ax.Y(l.mag))); x.stroke(); x.lineWidth = 1;
    R.res.forEach(r => { x.fillStyle = r.spk || r.pp > 5 || r.h2 > 0.05 ? '#b0413e' : '#1d140d'; x.beginPath(); x.arc(ax.X(r.f), ax.Y(r.mag), 3.5, 0, 7); x.fill(); });
    if (!live && R.s && R.s.fR) { x.strokeStyle = '#a62962'; x.lineWidth = 2; const zz = R.res.reduce((a, b) => b.mag > a.mag ? b : a); x.beginPath(); x.arc(ax.X(R.s.fR), ax.Y(zz.mag), 8, 0, 7); x.stroke(); x.lineWidth = 1; }
    x.fillStyle = '#1d140d'; x.fillText('● simulated   — linearised equations', ax.L + 8, ax.T + 12);
    const pm = R.lin.map(l => l.ph).concat(R.res.map(r => r.ph)), p0 = Math.min(-10, ...pm) - 5, p1 = Math.max(10, ...pm) + 5;
    [x, W, H] = gyCanvas($('rxPh')); ax = gyAxes(x, W, H, { x0: F[0], x1: F[F.length - 1], y0: p0, y1: p1, xt: gyTicks(F[0], F[F.length - 1], 5), yt: gyTicks(p0, p1, 4), xl: 'frequency (Hz)', yl: 'phase (°)' });
    x.strokeStyle = '#b9a796'; x.beginPath(); x.moveTo(ax.L, ax.Y(0)); x.lineTo(ax.R, ax.Y(0)); x.stroke();
    x.strokeStyle = RX_COL[R.key]; x.lineWidth = 2; x.beginPath(); R.lin.forEach((l, i) => i ? x.lineTo(ax.X(l.f), ax.Y(l.ph)) : x.moveTo(ax.X(l.f), ax.Y(l.ph))); x.stroke(); x.lineWidth = 1;
    R.res.forEach(r => { x.fillStyle = '#1d140d'; x.beginPath(); x.arc(ax.X(r.f), ax.Y(r.ph), 3, 0, 7); x.fill(); });
    if (!live) {
      const s = R.s; $('rxRes').innerHTML = `<h4 style="margin:4px 0">${RX_MODELS[R.key].name}</h4><div class="ml-tablewrap"><table class="ml-table"><tbody>
        <tr><td>Holding V*</td><td>${R.V.toFixed(2)} mV at ${R.p.I0} µA/cm²</td></tr><tr><td>Input amplitude</td><td>${R.A.toPrecision(3)} µA/cm²${$('rxAuto').checked ? ' (auto-scaled)' : ''}</td></tr>
        <tr><td>Resonant frequency f<sub>R</sub></td><td><b>${s.fR ? s.fR.toFixed(2) + ' Hz' : 'none (low-pass)'}</b> (equations: ${R.sl.fR ? R.sl.fR.toFixed(2) + ' Hz' : 'none'})</td></tr>
        <tr><td>Resonance strength Q</td><td><b>${s.Q.toFixed(3)}</b> (equations: ${R.sl.Q.toFixed(3)})</td></tr>
        <tr><td>|Z| at ${R.F[0]} Hz · peak</td><td>${s.Z0.toFixed(2)} · ${s.Zmax.toFixed(2)} kΩ·cm²</td></tr>
        <tr><td>Phase at f<sub>R</sub></td><td>${s.phR.toFixed(1)}°</td></tr>
        <tr><td>Simulation vs equations</td><td>largest |Z| difference ${R.dev.toFixed(2)} %</td></tr>
        <tr><td>Checks</td><td>${R.flags.length ? '<b class="ux-bad">' + R.flags.join('; ') + '</b>' : '<b class="ux-ok">subthreshold, linear, no spikes</b>'}${R.inst.siteNote ? '<br>' + R.inst.siteNote : ''}</td></tr></tbody></table></div>`;
    }
  }
  $('rxGo').onclick = () => { $('rxRes').innerHTML = '<p class="ux-note">Measuring…</p>'; sweep(S.model, R => { S.last = analyse(R); drawRun(S.last, false); }, R => drawRun(R, true)); };
  $('rxStop').onclick = () => { S.running++; };
  /* comparison */
  function addCmp(R) { S.cmp[R.key + (R.site === 'dend' ? ' (dend)' : '')] = R; drawCmp(); }
  $('rxAdd').onclick = () => { if (S.last) addCmp(S.last); };
  $('rxClr').onclick = () => { S.cmp = {}; drawCmp(); };
  $('rxNorm').onchange = drawCmp;
  $('rxAll').onclick = () => { S.cmp = {}; let j = 0; const next = () => { if (j >= RX_ORDER.length || !$('rxC')) { $('rxAllSt').textContent = 'Done'; return; } const k = RX_ORDER[j++]; $('rxAllSt').textContent = `Sweeping ${RX_MODELS[k].name}… (${j}/${RX_ORDER.length})`; sweep(k, R => { addCmp(analyse(R)); next(); }); }; next(); };
  function drawCmp() {
    const cv = $('rxC'); if (!cv) return; const [x, W, H] = gyCanvas(cv), L = Object.entries(S.cmp), norm = $('rxNorm').checked;
    if (!L.length) { x.fillStyle = '#8a7058'; x.textAlign = 'center'; x.fillText('Press “Sweep all seven models” or add the current result', W / 2, H / 2); $('rxTab').innerHTML = ''; return; }
    const F = L[0][1].F, val = (R, r) => norm ? r.mag / R.res[0].mag : r.mag, ym = Math.max(...L.flatMap(([, R]) => R.res.map(r => val(R, r)))) * 1.1;
    const ax = gyAxes(x, W, H, { x0: F[0], x1: F[F.length - 1], y0: 0, y1: ym, xt: gyTicks(F[0], F[F.length - 1], 5), yt: gyTicks(0, ym, 4), xl: 'frequency (Hz)', yl: norm ? '|Z| / |Z(fmin)|' : '|Z| (kΩ·cm²)' });
    if (norm) { x.strokeStyle = '#b9a796'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(ax.L, ax.Y(1)); x.lineTo(ax.R, ax.Y(1)); x.stroke(); x.setLineDash([]); }
    L.forEach(([k, R], j) => { const col = RX_COL[R.key]; x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); R.res.forEach((r, i) => i ? x.lineTo(ax.X(r.f), ax.Y(val(R, r))) : x.moveTo(ax.X(r.f), ax.Y(val(R, r)))); x.stroke(); x.lineWidth = 1; x.fillStyle = col; x.fillText(RX_MODELS[R.key].name.split(' (')[0] + (R.site === 'dend' ? ' (dend)' : ''), ax.R - 170, ax.T + 12 + j * 15); });
    $('rxTab').innerHTML = `<table class="ml-table"><thead><tr><th>Model</th><th>Spikes</th><th>V*</th><th>f<sub>R</sub> (Hz)</th><th>Q</th><th>|Z| peak</th><th>Sim vs eq.</th><th>Checks</th></tr></thead><tbody>${L.map(([k, R]) => `<tr><td><b style="color:${RX_COL[R.key]}">${RX_MODELS[R.key].name}</b>${R.site === 'dend' ? ' · dendritic input' : ''}</td><td>${R.key === 'hh' ? 'action potentials (disabled by weak input)' : R.key.match(/lif|glif|adex/) ? 'integrate-and-fire events (disabled)' : 'none (no spike mechanism)'}</td><td>${R.V.toFixed(1)}</td><td>${R.s.fR ? R.s.fR.toFixed(2) : '— (low-pass)'}</td><td>${R.s.Q.toFixed(2)}</td><td>${R.s.Zmax.toFixed(1)}</td><td>${R.dev.toFixed(2)} %</td><td>${R.flags.length ? '<span class="ux-bad">' + R.flags.join('; ') + '</span>' : '<span class="ux-ok">ok</span>'}</td></tr>`).join('')}</tbody></table>`;
  }
  /* save / export */
  const fillLoad = () => { $('rxLoad').innerHTML = '<option value="">Load a saved configuration…</option>' + Object.keys(S.saved).map(n => `<option>${n.replace(/</g, '&lt;')}</option>`).join(''); };
  const cfg = () => ({ model: S.model, site: S.site, amplitude: +$('rxA').value, f0: +$('rxF0').value, f1: +$('rxF1').value, df: +$('rxDF').value, params: S.P, saved: new Date().toISOString() });
  const apply = c => { if (!c || !c.params) return; RX_ORDER.forEach(k => { if (c.params[k]) S.P[k] = Object.assign({}, RX_MODELS[k].D, c.params[k]); }); S.model = c.model || S.model; S.site = c.site || S.site; $('rxA').value = c.amplitude ?? 0.05; $('rxF0').value = c.f0 ?? 1; $('rxF1').value = c.f1 ?? 20; $('rxDF').value = c.df ?? 1;
    document.querySelectorAll('[data-rxm]').forEach(o => o.setAttribute('aria-checked', o.dataset.rxm === S.model)); document.querySelectorAll('[data-rxs]').forEach(o => o.setAttribute('aria-checked', o.dataset.rxs === S.site)); paramTable(); };
  $('rxSave').onclick = () => { const n = $('rxName').value.trim() || `config ${Object.keys(S.saved).length + 1}`; S.saved[n] = cfg(); try { localStorage.setItem('rx-configs', JSON.stringify(S.saved)); } catch (e) {} fillLoad(); };
  $('rxLoad').onchange = e => { const c = S.saved[e.target.value]; if (c) apply(c); };
  $('rxCopyCfg').onclick = () => { $('rxOut').value = JSON.stringify(cfg(), null, 1); try { navigator.clipboard.writeText($('rxOut').value).catch(() => {}); } catch (e) {} };
  $('rxPaste').onclick = () => { try { apply(JSON.parse($('rxOut').value)); } catch (e) { $('rxOut').value = 'Could not read that JSON: ' + e.message; } };
  const csv = () => { const L = Object.values(S.cmp).length ? Object.values(S.cmp) : (S.last ? [S.last] : []); const rows = ['model,site,amplitude_uA_cm2,holding_uA_cm2,V_star_mV,f_Hz,Z_sim_kOhm_cm2,phase_sim_deg,Z_eq_kOhm_cm2,phase_eq_deg,pp_mV,second_harmonic,spike'];
    L.forEach(R => R.res.forEach((r, i) => rows.push([R.key, R.site, R.A, R.p.I0, R.V.toFixed(3), r.f, r.mag.toFixed(5), r.ph.toFixed(3), R.lin[i].mag.toFixed(5), R.lin[i].ph.toFixed(3), r.pp.toFixed(4), r.h2.toFixed(4), r.spk ? 1 : 0].join(','))));
    rows.push(''); rows.push('model,fR_Hz,Q,Zmax_kOhm_cm2,fR_eq_Hz,Q_eq,max_dev_percent,flags'); L.forEach(R => rows.push([R.key, R.s.fR.toFixed(3), R.s.Q.toFixed(4), R.s.Zmax.toFixed(4), R.sl.fR.toFixed(3), R.sl.Q.toFixed(4), R.dev.toFixed(3), '"' + R.flags.join('; ') + '"'].join(',')));
    return rows.join('\n'); };
  $('rxCSV').onclick = () => { $('rxOut').value = csv(); };
  $('rxCopyCSV').onclick = () => { $('rxOut').value = csv(); try { navigator.clipboard.writeText($('rxOut').value).catch(() => {}); } catch (e) {} };
  fillLoad(); paramTable(); drawCmp();
  ['rxZ', 'rxTr', 'rxPh'].forEach(id => { const [x, W, H] = gyCanvas($(id)); x.fillStyle = '#8a7058'; x.textAlign = 'center'; x.fillText('Press “Run sweep”', W / 2, H / 2); });
  window.addEventListener('resize', () => { if ($('rxZ')) { if (S.last) drawRun(S.last, false); drawCmp(); } });
}
window.renderResearchResonance = renderResearchResonance;
/* Page: /biology/research-spiking/ — Spiking analysis. The suprathreshold partner of the Resonance experiment:
   f–I curves, single spikes vs bursts, ISI statistics and phase locking to θ and γ input, for every rung of the
   model ladder (same equations as irMake in irpage.js). Spike type is always stated: real action potentials
   (HH, Lowet minimal) are detected as upward crossings of −20 mV; integrate-and-fire models emit an event when V
   reaches threshold (V_th, Θ or V_peak) and are reset, so their "spikes" have no shape. */
const SP_ORDER = ['lif', 'glif', 'pr2d', 'adex', 'lowet', 'hh'];
const SP_MODELS = {
  lif: { short: 'LIF', name: 'Two-point LIF', kind: 'if', P: () => Object.assign({}, IR_LIF), I: [0, 4, 0.2], op: { Iapp: 1.5, site: 'soma' },
    how: 'Threshold-and-reset event at V<sub>th</sub> = −50 mV, reset −60 mV, 2 ms refractory (values chosen here). No spike shape and no burst mechanism.' },
  glif: { short: 'GLIF₅', name: 'GLIF₅ (fitted)', kind: 'if', P: () => Object.assign({}, IR_GLIF_FIT), I: [0, 6, 0.25], op: { Iapp: 1.6, site: 'soma' },
    how: 'Event when V reaches the adaptive threshold Θ (Teeter et al. 2018 level 5); after-spike currents and threshold jump fitted here to the HH model’s f–I curve.' },
  pr2d: { short: 'NaP + Iₕ', name: 'NaP + Iₕ 2-D', kind: 'if', P: () => Object.assign({}, IR_PR), I: [0, 5, 0.2], op: { Iapp: 1.5, site: 'soma' },
    how: 'Subthreshold dynamics published (Pena &amp; Rotstein 2022); threshold −45 mV and reset −62 mV chosen here. The model’s own bias (−5 µA/cm²) is added to I<sub>app</sub>.' },
  adex: { short: 'AdEx', name: 'AdEx (fitted)', kind: 'if', P: () => Object.assign({}, IR_ADEX_FIT), I: [0, 6, 0.25], op: { Iapp: 2.2, site: 'soma' },
    how: 'Exponential spike onset is part of the dynamics; the event is V reaching V<sub>peak</sub> = 0 mV, then reset to V<sub>r</sub> and w += b (fitted here to the HH model).' },
  lowet: { short: 'Lowet minimal', name: 'Minimal bursting (Lowet 2023)', kind: 'ap', P: () => Object.assign({}, IR_LW), I: [-8, 2, 0.5], op: { Iapp: -4, site: 'dend' },
    how: 'Real action potentials (Hodgkin–Huxley Na⁺/K⁺ at the soma), detected as upward crossings of −20 mV. Somatic bias 4 and dendritic DC 2 µA/cm² from the authors’ script are added.' },
  hh: { short: 'Biophysical HH', name: 'Biophysical HH (Ceballos 2025)', kind: 'ap', P: () => Object.assign({}, IR_HH, IR_GATE.hybrid[1]), I: [0, 6, 0.25], op: { Iapp: 1, site: 'soma' },
    how: 'Real action potentials from all Golomb 2006 currents (hybrid reading of Table 1), detected as upward crossings of −20 mV and re-armed below −40 mV.' } };
const SP_COL = { lif: '#8a7058', glif: '#b9a796', pr2d: '#2f6f9f', adex: '#2f7d5b', lowet: '#d08a2e', hh: '#1d140d' }, SP_B = '#a62962', SP_S = '#2f6f9f';

/* γ-band input: K sinusoids with random frequencies in [f0, f1] Hz and random phases, scaled so its RMS equals that of a
   sinusoid of amplitude A (A/√2). g(t) is the input, h(t) its exact Hilbert transform, so the instantaneous phase
   atan2(h, g) is 0 at every input peak — the same convention as for the θ sinusoid. */
function spBand(seed, A, f0 = 30, f1 = 90, K = 40) {
  let s = (seed * 7919) % 2147483647 || 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const w = [], ph = [], a = A / Math.sqrt(K);
  for (let k = 0; k < K; k++) { w.push(2 * Math.PI * (f0 + (f1 - f0) * r()) * 1e-3); ph.push(2 * Math.PI * r()); }
  return { g: t => { let v = 0; for (let k = 0; k < K; k++) v += Math.sin(w[k] * t + ph[k]); return a * v; },
    h: t => { let v = 0; for (let k = 0; k < K; k++) v -= Math.cos(w[k] * t + ph[k]); return a * v; } };
}
/* phase of a spike relative to the input, 0 = input peak (radians, 0..2π) */
const spWrap = x => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const spPhDrive = (t, f) => spWrap(2 * Math.PI * f * 1e-3 * t - Math.PI);   // sinusoidal drive A sin(ωt + 3π/2) = −A cos ωt: peak at ωt = π
/* split a spike train into events: spikes closer than thr ms belong to one burst */
function spEvents(sp, thr) { const ev = []; sp.forEach((x, i) => (i && x - sp[i - 1] < thr) ? ev[ev.length - 1].push(x) : ev.push([x])); return ev; }
/* mean resultant length R, preferred phase (deg), n, Rayleigh p (Zar 1999, eq. 27.4) */
function spCirc(ph) {
  const n = ph.length; if (!n) return { R: NaN, mu: NaN, n: 0, p: NaN };
  let c = 0, s = 0; ph.forEach(p => { c += Math.cos(p); s += Math.sin(p); });
  const Rn = Math.hypot(c, s), R = Rn / n, p = Math.min(1, Math.exp(Math.sqrt(1 + 4 * n + 4 * (n * n - Rn * Rn)) - (1 + 2 * n)));
  return { R, mu: spWrap(Math.atan2(s, c)) * 180 / Math.PI, n, p };
}
/* full spike-train statistics over [t0, t1] ms */
function spStats(spikes, t0, t1, thr) {
  const sp = spikes.filter(t => t >= t0 && t < t1), dur = (t1 - t0) / 1000, ev = spEvents(sp, thr), B = ev.filter(e => e.length > 1), S1 = ev.filter(e => e.length === 1);
  const isi = sp.slice(1).map((x, i) => x - sp[i]), mean = a => a.reduce((p, q) => p + q, 0) / (a.length || 1);
  const mu = mean(isi), sd = Math.sqrt(mean(isi.map(v => (v - mu) ** 2))), intra = B.flatMap(e => e.slice(1).map((x, i) => x - e[i]));
  const cv2 = isi.length > 1 ? mean(isi.slice(1).map((v, i) => 2 * Math.abs(v - isi[i]) / (v + isi[i]))) : NaN;
  return { n: sp.length, rate: sp.length / dur, ssRate: S1.length / dur, bsRate: B.length / dur, fracB: sp.length ? B.reduce((a, e) => a + e.length, 0) / sp.length : NaN,
    perBurst: B.length ? mean(B.map(e => e.length)) : NaN, intra: intra.length ? mean(intra) : NaN, cv: isi.length > 1 ? sd / mu : NaN, cv2, isi, ev, B, S1,
    tonicWarn: isi.length > 3 && mu < thr };   // a regular train faster than 1/thr is counted entirely as "bursts"
}
/* Lowet et al. 2023 signature: bursts lock more strongly to θ than single spikes; single spikes more strongly to γ */
function spVerdict(r) {
  if (r.nB < 10 || r.nS < 10) return ['few', `too few ${r.nB < 10 ? 'bursts' : 'single spikes'} (n &lt; 10)`];
  const a = r.thB.R > r.thS.R, b = r.gaS.R > r.gaB.R;
  return a && b ? ['ok', 'matches Lowet et al.: bursts θ-locked, single spikes γ-locked'] : [a || b ? 'part' : 'no', `${a ? '' : 'bursts not more θ-locked; '}${b ? '' : 'single spikes not more γ-locked'}`.replace(/; $/, '')];
}
/* run one model for T ms at stimulus S (θ sinusoid + γ band or sinusoid + noise), chunked; returns phase results */
function spPhaseRun(key, P, S, T, thr, onDone, alive) {
  const bd = spBand(S.seed + 101, 1), S2 = Object.assign({}, S, { Aga: S.gmode === 'sin' ? S.Aga : 0, xs: S.gmode === 'band' ? t => S.Aga * bd.g(t) : null });
  const M = irMake(key, P, S2); let t = 0;
  const go = () => { if (alive && !alive()) return; const t0 = performance.now(); while (t < T && performance.now() - t0 < 25) { M.step(20, null); t += 20; }
    if (t < T) { setTimeout(go, 0); return; }
    const st = spStats(M.spikes, 500, T, thr), on = st.B.map(e => e[0]), ss = st.S1.map(e => e[0]);
    const gph = S.gmode === 'band' ? (x => spWrap(Math.atan2(bd.h(x), bd.g(x)))) : (x => spPhDrive(x, S.fga));
    const r = { key, st, nB: on.length, nS: ss.length, phB: on.map(x => [spPhDrive(x, S.fth), gph(x)]), phS: ss.map(x => [spPhDrive(x, S.fth), gph(x)]) };
    r.thB = spCirc(r.phB.map(v => v[0])); r.thS = spCirc(r.phS.map(v => v[0])); r.gaB = spCirc(r.phB.map(v => v[1])); r.gaS = spCirc(r.phS.map(v => v[1]));
    r.verdict = spVerdict(r); onDone(r); };
  setTimeout(go, 0);
}
function renderResearchSpiking() {
  document.title = 'Spiking analysis · My research';
  const S = { model: 'hh', Iapp: 1, Ath: 1, fth: 8, Aga: 2, fga: 40, gmode: 'band', D: 0.1, site: 'soma', seed: 1, thr: 14, Tph: 10000, P: {}, fi: {}, ph: {}, job: 0 };
  SP_ORDER.forEach(k => S.P[k] = SP_MODELS[k].P());
  const STIM = [['Iapp', 'DC current I<sub>app</sub> (adds to the model’s own bias)', 'µA/cm²', -8, 8, 0.05], ['Ath', 'θ amplitude', 'µA/cm²', 0, 4, 0.05], ['fth', 'θ frequency', 'Hz', 2, 14, 0.5],
    ['Aga', 'γ amplitude (band: same RMS as a sinusoid of this amplitude)', 'µA/cm²', 0, 6, 0.05], ['fga', 'γ frequency (sinusoid mode)', 'Hz', 20, 100, 1], ['D', 'White noise D', 'mV²/ms', 0, 0.5, 0.005]];
  const sl = ([k, l, u, a, b, st]) => `<div class="ux-sl"><label for="sp-${k}">${l}</label><span class="ux-val"><input class="ux-num" type="number" id="sp-${k}n" min="${a}" max="${b}" step="${st}"><em>${u}</em></span><input type="range" id="sp-${k}" min="${a}" max="${b}" step="${st}"></div>`;
  const seg = (lab, attr, opts, cur) => `<div class="ux-seg" role="radiogroup" aria-label="${lab}">${opts.map(([k, l]) => `<button role="radio" aria-checked="${k === cur}" data-${attr}="${k}">${l}</button>`).join('')}</div>`;
  $('lesson').innerHTML = bioHead('Spiking analysis', 'MY RESEARCH · METHOD · SUPRATHRESHOLD OUTPUT',
    'The partner of the Resonance experiment: what each model does once it fires. f–I curves, single spikes versus bursts, interval statistics and phase locking to θ and γ input, for every rung of the model ladder, with the same burst definition and the same test Lowet et al. 2023 applied to voltage-imaging data.')
    + `<nav class="page-jumps"><a href="#sp-live">Live</a><a href="#sp-fi">f–I curves</a><a href="#sp-ph">Phase locking</a><a href="#sp-exp">Export</a><a href="#sp-how">Method</a><a href="#rs-refs">References</a></nav>
    <section class="lesson-section lab" id="sp-live"><p class="eyebrow">01 · Live</p><h2>Watch the spike train</h2>
      <div class="ux-bar">${seg('Model', 'spm', SP_ORDER.map(k => [k, SP_MODELS[k].short]), S.model)}</div>
      <p class="ux-note" id="spKind"></p>
      <div class="ux-bar">${seg('Input site', 'sps', [['soma', 'Input at soma'], ['dend', 'at dendrite'], ['both', 'both']], S.site)}${seg('γ input', 'spg', [['band', 'γ = band noise 30–90 Hz'], ['sin', 'γ = sinusoid']], S.gmode)}
        <label class="nl-inl">Burst = ISI &lt; <select id="spThr" style="width:auto;margin:0"><option value="10">10 ms (Lowet 2023)</option><option value="14" selected>14 ms (Ceballos 2025)</option><option value="6">6 ms</option><option value="20">20 ms</option></select></label></div>
      ${ngLiveBar('spBar', 1)}
      <div class="sp-grid sp-grid-live">
        <div><div class="ux-fig"><canvas id="spTr" class="ux-cv" style="height:310px" aria-label="Somatic voltage, last 2 seconds"></canvas><p class="ux-note"><b>Figure 1.</b> Somatic voltage over the last 2 s. Ticks mark detected spikes: <b style="color:${SP_B}">burst</b> or <b style="color:${SP_S}">single</b>. Below: the θ input (grey) and γ input (light). Integrate-and-fire events are drawn as a vertical line to 20 mV; they are not action potentials.</p></div>
          <div class="ux-fig"><canvas id="spIsi" class="ux-cv" style="height:200px" aria-label="Inter-spike interval histogram"></canvas><p class="ux-note"><b>Figure 2.</b> Inter-spike intervals since the last restart (log scale). The dashed line is the burst threshold; intervals left of it join spikes into one burst.</p></div></div>
        <div><div class="ux-fig" id="spLive" data-nogloss></div>${STIM.map(sl).join('')}</div></div></section>
    <section class="lesson-section" id="sp-fi"><p class="eyebrow">02 · f–I curves</p><h2>Firing rate against DC current</h2>
      <p>Each point is a fresh 1.5 s run at constant current (the first 300 ms discarded), with no θ or γ input and no noise, so the curve is deterministic. Rate is counted three ways: all spikes, single-spike events and burst events (one per burst).</p>
      <div class="ux-bar"><button class="ux-run" id="spFiGo">Run f–I for this model</button><button class="secondary" id="spFiAll">Run all six models</button><button class="secondary" id="spFiStop">Stop</button><span class="ux-status" id="spFiSt"></span></div>
      <div class="sp-grid">
        <div class="ux-fig"><canvas id="spFi" class="ux-cv" style="height:260px" aria-label="f–I curve of the selected model"></canvas><p class="ux-note"><b>Figure 3.</b> Selected model: all spikes (black), <b style="color:${SP_S}">single-spike events</b>, <b style="color:${SP_B}">burst events</b>. The ring marks the rheobase.</p></div>
        <div class="ux-fig"><canvas id="spFiC" class="ux-cv" style="height:260px" aria-label="f–I curves of all models"></canvas><p class="ux-note"><b>Figure 4.</b> All models that have been run, against current above each one’s rheobase (I − I<sub>rh</sub>), so models with different biases line up.</p></div></div>
      <div class="ml-tablewrap" id="spFiTab"></div></section>
    <section class="lesson-section" id="sp-ph"><p class="eyebrow">03 · Phase locking</p><h2>Do bursts follow θ and single spikes follow γ?</h2>
      <p>Lowet et al. 2023 found that in CA1 pyramidal cells bursts lock to membrane θ more strongly than single spikes, and single spikes lock to γ more strongly than bursts. Here the same test is run on the models with the stimulus set above (θ sinusoid plus γ input plus noise). Phase is measured relative to the input: 0° is the peak of the θ input, and for γ the peak of the γ input (instantaneous phase of the band signal from its exact Hilbert transform). A burst is represented by its first spike.</p>
      <div class="ux-bar"><label class="nl-inl">Duration <select id="spT" style="width:auto;margin:0"><option value="5000">5 s</option><option value="10000" selected>10 s</option><option value="20000">20 s</option><option value="40000">40 s</option></select></label>
        <button class="ux-run" id="spPhGo">Run this model</button><button class="secondary" id="spPhAll">Run all six at their default currents</button><label class="nl-inl ux-chk" style="margin:0!important"><input type="checkbox" id="spCtl"> Also run each without rhythmic input (burst-mechanism control)</label><span class="ux-status" id="spPhSt"></span></div>
      <div class="sp-grid">
        <div class="ux-fig"><canvas id="spRoseT" class="ux-cv" style="height:280px" aria-label="Theta phase distribution"></canvas><p class="ux-note"><b>Figure 5.</b> θ phase of <b style="color:${SP_B}">burst onsets</b> and <b style="color:${SP_S}">single spikes</b> (fraction of events per 20° bin). Arrows: mean phase, length = R.</p></div>
        <div class="ux-fig"><canvas id="spRoseG" class="ux-cv" style="height:280px" aria-label="Gamma phase distribution"></canvas><p class="ux-note"><b>Figure 6.</b> The same events against γ phase.</p></div></div>
      <div class="ml-tablewrap" id="spPhTab"></div><div class="ml-tablewrap" id="spPhAllTab"></div>
      <div class="ux-note" style="margin-top:12px"><b>Reading the test.</b> Passing it does not by itself show an intrinsic burst mechanism. With these inputs even the LIF passes: at the θ peak the drive is strong enough for intervals under the burst threshold, so its “bursts” are high-rate moments that sit on the θ peak, while lone spikes in the θ trough are paced by γ. Tick the control to rerun without θ and γ: only models that still burst on DC and noise alone (the Lowet minimal model) have an intrinsic mechanism, an after-depolarisation from dendritic NaP and slow K⁺. The biophysical HH model fires few bursts at 1 µA/cm²; raise θ or I<sub>app</sub>, or use the burst-promoting settings on the <a href="/biology/interleaved-resonance/">ladder</a>.</div></section>
    <section class="lesson-section" id="sp-exp"><p class="eyebrow">04 · Export</p><h2>Results and settings</h2>
      <div class="ux-bar"><button class="secondary" id="spCsvFi">f–I results as CSV</button><button class="secondary" id="spCsvPh">Phase-locking results as CSV</button><button class="secondary" id="spCfg">Settings as JSON</button><button class="secondary" id="spCopy">Copy</button></div>
      <textarea id="spOut" rows="8" style="width:100%;font-family:ui-monospace,Menlo,monospace;font-size:12px" readonly></textarea></section>
    <section class="lesson-section" id="sp-how"><details class="uth" open><summary><span>Method</span> spike detection, bursts, phase and statistics</summary><div class="uth-grid">
      <div><h4>Two kinds of spike</h4><p><b>Action potentials</b> (HH, Lowet minimal): the membrane equations generate the spike; it is detected when the somatic voltage crosses −20 mV upward and re-armed below −40 mV. <b>Integrate-and-fire events</b> (LIF, GLIF, NaP + Iₕ, AdEx): the model has no spike current; an event is recorded when V reaches threshold (V<sub>th</sub>, Θ or V<sub>peak</sub>) and V is reset. Their timing is meaningful; their shape and width are not. Each table row states which kind it is.</p></div>
      <div><h4>Bursts</h4><p>Spikes closer than the threshold interval form one event; an event with ≥ 2 spikes is a burst. Ceballos et al. 2025 use 14 ms; Lowet et al. 2023 use 10 ms and report the same conclusions for 6–15 ms. A regular train faster than 1/threshold is counted entirely as bursts; this is flagged. Burst fraction = spikes in bursts / all spikes (the measure Lowet et al. report, 28 % in imaged CA1 cells).</p></div>
      <div><h4>Phase locking</h4><p>For n events with phases φ<sub>k</sub>, R = |Σ e<sup>iφ<sub>k</sub></sup>| / n (0 = no locking, 1 = perfect) and the mean phase is its argument. The Rayleigh test p-value uses Zar’s approximation p = exp(√(1 + 4n + 4(n² − (nR)²)) − (1 + 2n)). The γ band is 40 sinusoids at random frequencies in 30–90 Hz scaled to the RMS of a sinusoid of amplitude A<sub>γ</sub>; its Hilbert transform is computed exactly from the same sum.</p></div>
      <div><h4>Interval statistics</h4><p>CV = SD(ISI) / mean(ISI) (1 for a Poisson train, 0 for a clock). CV₂ = mean of 2|ISI<sub>k+1</sub> − ISI<sub>k</sub>| / (ISI<sub>k+1</sub> + ISI<sub>k</sub>) measures irregularity between neighbouring intervals and is insensitive to slow rate changes (Holt et al. 1996). Rheobase: the lowest current on the grid with a nonzero rate; gain: rate increase over the next 1 µA/cm².</p></div>
      <div><h4>Burst-mechanism control</h4><p>With rhythmic input removed (only DC and noise) a model with an intrinsic burst mechanism still fires bursts; a model whose “bursts” are just high-rate moments at the θ peak does not. This separates the Lowet signature from simple rate modulation.</p></div></div></details></section>
    ${rsRefs(['lowet23', 'ceballos25', 'harris01', 'mizuseki12', 'golomb06', 'brette05', 'pena22'])}`;
  $('rs-refs').querySelector('ol').insertAdjacentHTML('beforeend', '<li>Teeter C, Iyer R, Menon V, et al. (2018). Generalized leaky integrate-and-fire models classify multiple neuron types. <i>Nat Commun</i> 9:709. <a href="https://doi.org/10.1038/s41467-017-02717-4" target="_blank" rel="noopener">doi</a></li><li>Holt GR, Softky WR, Koch C, Douglas RJ (1996). Comparison of discharge variability in vitro and in vivo in cat visual cortex neurons. <i>J Neurophysiol</i> 75:1806–1814. <a href="https://doi.org/10.1152/jn.1996.75.5.1806" target="_blank" rel="noopener">doi</a></li><li>Zar JH (1999). <i>Biostatistical Analysis</i>, 4th ed., ch. 27 (circular statistics, Rayleigh test). Prentice Hall.</li>');
  const fmt = (v, d = 1) => (v === undefined || isNaN(v)) ? '—' : (+v).toFixed(d), M = () => SP_MODELS[S.model], kindTxt = k => SP_MODELS[k].kind === 'ap' ? 'action potentials' : 'I&amp;F events';
  const pfmt = p => isNaN(p) ? '—' : p < 1e-4 ? '&lt; 10⁻⁴' : p.toFixed(p < 0.01 ? 4 : 2);

  /* ---------- live ---------- */
  const R = ngRing(12000, ['t', 'v', 'th', 'ga']); let L = null, sim = null, band = spBand(S.seed + 101, 1), S2 = {};
  const sync = () => { Object.assign(S2, { Iapp: S.Iapp, Ath: S.Ath, fth: S.fth, fga: S.fga, D: S.D, site: S.site, seed: S.seed, Aga: S.gmode === 'sin' ? S.Aga : 0, xs: S.gmode === 'band' ? (t => S.Aga * band.g(t)) : null }); };
  const newSim = () => { sync(); R.clear(); sim = irMake(S.model, S.P[S.model], S2);
    sim.sinkF = (t, v) => { const th = -S.Ath * Math.cos(2 * Math.PI * S.fth * 1e-3 * t), ga = S.gmode === 'band' ? S.Aga * band.g(t) : -S.Aga * Math.cos(2 * Math.PI * S.fga * 1e-3 * t); R.push([t, v, th, ga]); }; };
  function drawLive() {
    const cv = $('spTr'); if (!cv || !sim) return; const [x, W, H] = gyCanvas(cv), t1 = sim.t, t0 = Math.max(0, t1 - 2000), split = H * 0.6;
    const ax = gyAxes(x, W, split + 30, { x0: t0, x1: Math.max(t0 + 2000, t1), y0: -90, y1: 40, xt: [], yt: [-80, -40, 0, 40], yl: 'V (mV)', B: 30 });
    const T = R.arr('t'), V = R.arr('v'), TH = R.arr('th'), GA = R.arr('ga'), X = ax.X;
    x.strokeStyle = '#1d140d'; x.lineWidth = 1.1; x.beginPath(); let st = false;
    for (let i = 0; i < T.length; i++) { if (T[i] < t0) continue; const px = X(T[i]), py = ax.Y(Math.max(-90, Math.min(40, V[i]))); st ? x.lineTo(px, py) : x.moveTo(px, py); st = true; } x.stroke();
    const sp = sim.spikes.filter(t => t >= t0 - 40), ev = spEvents(sp, S.thr);
    ev.forEach(e => e.forEach(t => { if (t < t0) return; x.strokeStyle = e.length > 1 ? SP_B : SP_S; x.lineWidth = 2; x.beginPath(); x.moveTo(X(t), ax.T); x.lineTo(X(t), ax.T + 9); x.stroke();
      if (M().kind === 'if') { x.lineWidth = 1; x.beginPath(); x.moveTo(X(t), ax.Y(-40)); x.lineTo(X(t), ax.Y(20)); x.stroke(); } }));
    const y0 = split + 50, hh = (H - y0 - 4) / 2, amax = Math.max(0.5, S.Ath, S.Aga * 1.8);
    [[TH, '#8a7058', 'θ'], [GA, '#c9b8a6', 'γ']].forEach(([A, c, lb], j) => { const yc = y0 + hh * (j + 0.5); x.strokeStyle = c; x.lineWidth = 1; x.beginPath(); let s2 = false;
      for (let i = 0; i < T.length; i++) { if (T[i] < t0) continue; const px = X(T[i]), py = yc - A[i] / amax * hh * 0.5; s2 ? x.lineTo(px, py) : x.moveTo(px, py); s2 = true; } x.stroke(); x.fillStyle = '#6f4c27'; x.fillText(lb + ' input', 4, yc - hh * 0.3); });
    x.fillStyle = '#6f4c27'; x.textAlign = 'right'; x.fillText(`t = ${(t1 / 1000).toFixed(2)} s · window 2 s`, W - 6, split + 44); x.textAlign = 'left';
    const w0 = Math.max(300, t1 - 5000), stt = spStats(sim.spikes, w0, Math.max(w0 + 1, t1), S.thr);
    $('spLive').innerHTML = `<table class="ml-table" style="min-width:0"><tbody>
      <tr><td>Window</td><td>last ${((t1 - w0) / 1000).toFixed(1)} s</td></tr><tr><td>Spike type</td><td>${kindTxt(S.model)}</td></tr>
      <tr><td>Rate</td><td><b>${fmt(stt.rate)}</b> Hz</td></tr><tr><td>Single-spike events</td><td>${fmt(stt.ssRate)} /s</td></tr><tr><td>Burst events</td><td>${fmt(stt.bsRate)} /s</td></tr>
      <tr><td>Spikes in bursts</td><td>${isNaN(stt.fracB) ? '—' : fmt(100 * stt.fracB, 0) + ' %'} <span class="ux-note">(CA1 imaging: 28 %)</span></td></tr>
      <tr><td>Spikes per burst</td><td>${fmt(stt.perBurst)}</td></tr><tr><td>Intra-burst ISI</td><td>${fmt(stt.intra)} ms <span class="ux-note">(CA1: 8.4 ms)</span></td></tr>
      <tr><td>CV · CV₂</td><td>${fmt(stt.cv, 2)} · ${fmt(stt.cv2, 2)}</td></tr></tbody></table>${stt.tonicWarn ? '<p class="ux-note ux-bad">Mean ISI is below the burst threshold: this is fast regular firing, and every spike is being counted as part of a burst.</p>' : ''}`;
    drawIsi();
  }
  function drawIsi() {
    const cv = $('spIsi'); if (!cv || !sim) return; const [x, W, H] = gyCanvas(cv), sp = sim.spikes.filter(t => t > 300), isi = sp.slice(1).map((v, i) => v - sp[i]);
    const lo = 0, hi = 3, nb = 45, cnt = new Array(nb).fill(0); isi.forEach(v => { const b = Math.floor((Math.log10(Math.max(1, v)) - lo) / (hi - lo) * nb); if (b >= 0 && b < nb) cnt[b]++; });
    const ym = Math.max(1, ...cnt), ax = gyAxes(x, W, H, { x0: lo, x1: hi, y0: 0, y1: ym * 1.1, xt: [], yt: gyTicks(0, ym * 1.1, 3), xl: 'inter-spike interval (ms, log scale)', yl: 'count' });
    [1, 3, 10, 30, 100, 300, 1000].forEach(v => { x.fillStyle = '#6f4c27'; x.textAlign = 'center'; x.fillText(v, ax.X(Math.log10(v)), ax.B + 15); });
    const bw = (ax.R - ax.L) / nb; cnt.forEach((c, i) => { const mid = Math.pow(10, lo + (i + 0.5) * (hi - lo) / nb); x.fillStyle = mid < S.thr ? SP_B : SP_S; x.globalAlpha = 0.8; x.fillRect(ax.L + i * bw + 0.5, ax.Y(c), bw - 1, ax.B - ax.Y(c)); }); x.globalAlpha = 1;
    x.setLineDash([4, 3]); x.strokeStyle = '#3a2a1c'; x.beginPath(); x.moveTo(ax.X(Math.log10(S.thr)), ax.T); x.lineTo(ax.X(Math.log10(S.thr)), ax.B); x.stroke(); x.setLineDash([]);
    x.textAlign = 'left'; x.fillStyle = '#3a2a1c'; x.fillText(`${isi.length} intervals`, ax.L + 6, ax.T + 12);
  }
  const live = () => { L = ngLive({ bar: 'spBar', step: ms => sim.step(ms, sim.sinkF), draw: drawLive, reset: newSim, chunk: 1, budget: 14 }); };

  /* ---------- f–I ---------- */
  function fiRun(keys) {
    const my = ++S.job, todo = keys.slice(); $('spFiSt').textContent = '';
    const nextModel = () => { if (my !== S.job || !$('spFi')) return; const key = todo.shift(); if (!key) { $('spFiSt').textContent = 'done'; return; }
      const [a, b, d] = SP_MODELS[key].I, grid = []; for (let I = a; I <= b + 1e-9; I += d) grid.push(+I.toFixed(3));
      const res = []; let i = 0; S.fi[key] = { grid, res, P: Object.assign({}, S.P[key]) };
      const go = () => { if (my !== S.job || !$('spFi')) return; const t0 = performance.now();
        while (i < grid.length && performance.now() - t0 < 30) { const SS = { Iapp: grid[i], Ath: 0, fth: 8, Aga: 0, fga: 40, D: 0, site: SP_MODELS[key].op.site, seed: 1 };
          const m = irMake(key, S.P[key], SS); m.step(1500, null); const st = spStats(m.spikes, 300, 1500, S.thr); res.push({ I: grid[i], rate: st.rate, ss: st.ssRate, bs: st.bsRate, fracB: st.fracB, cv: st.cv, tonic: st.tonicWarn }); i++; }
        $('spFiSt').textContent = `${SP_MODELS[key].name}: ${i}/${grid.length}`; drawFi(); fiTable();
        if (i < grid.length) setTimeout(go, 0); else nextModel(); };
      go(); };
    nextModel();
  }
  const fiSum = key => { const F = S.fi[key]; if (!F) return null; const r = F.res, k = r.findIndex(o => o.rate > 0); if (k < 0) return { rh: NaN };
    const rh = r[k].I, j = r.findIndex(o => o.I >= rh + 1 - 1e-9), gain = j > 0 ? (r[j].rate - r[k].rate) / (r[j].I - rh) : NaN;
    return { rh, gain, rmax: Math.max(...r.map(o => o.rate)), fbMax: Math.max(0, ...r.filter(o => o.rate > 0 && !o.tonic).map(o => o.fracB || 0)), tonicFrom: (r.find(o => o.tonic) || {}).I }; };
  function drawFi() {
    const cv = $('spFi'); if (!cv) return; const [x, W, H] = gyCanvas(cv), F = S.fi[S.model];
    if (!F || !F.res.length) { x.fillStyle = '#6f4c27'; x.fillText('Press “Run f–I for this model”.', 60, H / 2); } else {
      const [a, b] = SP_MODELS[S.model].I, ym = Math.max(5, ...F.res.map(o => o.rate)) * 1.1, ax = gyAxes(x, W, H, { x0: a, x1: b, y0: 0, y1: ym, xt: gyTicks(a, b, 6), yt: gyTicks(0, ym, 4), xl: 'I_app (µA/cm²)', yl: 'rate (Hz)' });
      [['rate', '#1d140d'], ['ss', SP_S], ['bs', SP_B]].forEach(([k, c]) => { x.strokeStyle = c; x.lineWidth = 2; x.beginPath(); F.res.forEach((o, i) => { const px = ax.X(o.I), py = ax.Y(o[k]); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
        x.fillStyle = c; F.res.forEach(o => { x.beginPath(); x.arc(ax.X(o.I), ax.Y(o[k]), 2.5, 0, 7); x.fill(); }); });
      const s = fiSum(S.model); if (s && !isNaN(s.rh)) { x.strokeStyle = '#a62962'; x.lineWidth = 1.5; x.beginPath(); x.arc(ax.X(s.rh), ax.Y(0), 6, 0, 7); x.stroke(); }
      if (s && s.tonicFrom !== undefined) { x.fillStyle = 'rgba(166,41,98,0.08)'; x.fillRect(ax.X(s.tonicFrom), ax.T, ax.R - ax.X(s.tonicFrom), ax.B - ax.T); x.fillStyle = '#a62962'; x.fillText('mean ISI < burst threshold', ax.X(s.tonicFrom) + 4, ax.T + 12); } }
    const c2 = $('spFiC'); const [y, W2, H2] = gyCanvas(c2), keys = SP_ORDER.filter(k => S.fi[k] && S.fi[k].res.length);
    if (!keys.length) { y.fillStyle = '#6f4c27'; y.fillText('Run one or more models.', 60, H2 / 2); return; }
    const ym2 = Math.max(5, ...keys.flatMap(k => S.fi[k].res.map(o => o.rate))) * 1.1, bx = gyAxes(y, W2, H2, { x0: -1, x1: 5, y0: 0, y1: ym2, xt: gyTicks(-1, 5, 6), yt: gyTicks(0, ym2, 4), xl: 'I − I_rh (µA/cm²)', yl: 'rate (Hz)' });
    keys.forEach((k, j) => { const s = fiSum(k); if (!s || isNaN(s.rh)) return; y.strokeStyle = SP_COL[k]; y.lineWidth = 2; y.setLineDash(SP_MODELS[k].kind === 'if' ? [5, 3] : []); y.beginPath(); let st = false;
      S.fi[k].res.forEach(o => { const u = o.I - s.rh; if (u < -1 || u > 5) return; const px = bx.X(u), py = bx.Y(o.rate); st ? y.lineTo(px, py) : y.moveTo(px, py); st = true; }); y.stroke(); y.setLineDash([]);
      y.fillStyle = SP_COL[k]; y.textAlign = 'right'; y.fillText(SP_MODELS[k].short, bx.R - 6, bx.T + 12 + 13 * j); y.textAlign = 'left'; });
    y.fillStyle = '#6f4c27'; y.textAlign = 'right'; y.fillText('dashed = I&F events · solid = action potentials', bx.R - 6, bx.T + 12 + 13 * keys.length + 4); y.textAlign = 'left';
  }
  function fiTable() {
    const keys = SP_ORDER.filter(k => S.fi[k] && S.fi[k].res.length); if (!keys.length) { $('spFiTab').innerHTML = ''; return; }
    $('spFiTab').innerHTML = `<table class="ml-table"><thead><tr><th>Model</th><th>Spikes</th><th>Rheobase (<span style="text-transform:none">µA/cm²</span>)</th><th>Gain (<span style="text-transform:none">Hz per µA/cm²</span>)</th><th>Max rate in range (Hz)</th><th>Max burst fraction (DC only)</th><th>Note</th></tr></thead><tbody>${keys.map(k => { const s = fiSum(k);
      return `<tr><td><b style="color:${SP_COL[k]}">●</b> ${SP_MODELS[k].name}</td><td>${kindTxt(k)}</td><td>${isNaN(s.rh) ? 'no spikes in range' : fmt(s.rh, 2)}</td><td>${fmt(s.gain)}</td><td>${fmt(s.rmax)}</td><td>${isNaN(s.rh) ? '—' : fmt(100 * s.fbMax, 0) + ' %'}</td><td class="ux-note">${s.tonicFrom !== undefined ? `regular firing faster than 1/${S.thr} ms from ${s.tonicFrom} µA/cm² (excluded from burst fraction)` : ''}${k === 'pr2d' || k === 'lowet' ? ' I<sub>app</sub> adds to the model’s own bias.' : ''}</td></tr>`; }).join('')}</tbody></table>`;
  }

  /* ---------- phase locking ---------- */
  function rose(id, which) {
    const cv = $(id); if (!cv) return; const [x, W, H] = gyCanvas(cv), r = S.ph[S.model]; const cx = W / 2, cy = H / 2 + 6, rad = Math.min(W, H) / 2 - 26;
    x.strokeStyle = '#efe4d7'; [0.33, 0.66, 1].forEach(f => { x.beginPath(); x.arc(cx, cy, rad * f, 0, 7); x.stroke(); });
    x.fillStyle = '#6f4c27'; x.textAlign = 'center'; [['0° peak', 0], ['90°', 90], ['180° trough', 180], ['270°', 270]].forEach(([l, d]) => { const a = d * Math.PI / 180; x.fillText(l, cx + Math.cos(a) * (rad + 14), cy - Math.sin(a) * (rad + 14) + 4); });
    x.textAlign = 'left'; x.fillStyle = '#3a2a1c'; x.fillText(which === 0 ? 'θ phase' : 'γ phase', 6, 14);
    if (!r) { x.fillStyle = '#6f4c27'; x.fillText('Press “Run this model”.', 6, 30); return; }
    const nb = 18, hist = ph => { const h = new Array(nb).fill(0); ph.forEach(p => h[Math.floor(p[which] / (2 * Math.PI) * nb) % nb]++); return h.map(c => c / (ph.length || 1)); };
    const hb = hist(r.phB), hs = hist(r.phS), mx = Math.max(0.05, ...hb, ...hs);
    [[hs, SP_S], [hb, SP_B]].forEach(([h, c]) => { x.fillStyle = c; x.globalAlpha = 0.45; h.forEach((v, i) => { const a0 = i * 2 * Math.PI / nb, a1 = (i + 1) * 2 * Math.PI / nb; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, rad * v / mx, -a1, -a0); x.closePath(); x.fill(); }); }); x.globalAlpha = 1;
    [[which ? r.gaS : r.thS, SP_S], [which ? r.gaB : r.thB, SP_B]].forEach(([c, col]) => { if (isNaN(c.R)) return; const a = c.mu * Math.PI / 180, ex = cx + Math.cos(a) * rad * c.R, ey = cy - Math.sin(a) * rad * c.R;
      x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(ex, ey); x.stroke(); x.beginPath(); x.arc(ex, ey, 4, 0, 7); x.fillStyle = col; x.fill(); });
    x.fillStyle = '#6f4c27'; x.fillText(`outer ring = ${(100 * mx).toFixed(0)} % of events`, 6, H - 6);
  }
  const phRow = r => { const v = r.verdict; return `<tr><td><b style="color:${SP_COL[r.key]}">●</b> ${SP_MODELS[r.key].name}</td><td>${kindTxt(r.key)}</td><td>${fmt(r.st.rate)}</td><td>${fmt(100 * r.st.fracB, 0)} %</td><td>${r.nB} / ${r.nS}</td>
    <td>${fmt(r.thB.R, 2)} @ ${fmt(r.thB.mu, 0)}° <span class="ux-note">p ${pfmt(r.thB.p)}</span></td><td>${fmt(r.thS.R, 2)} @ ${fmt(r.thS.mu, 0)}° <span class="ux-note">p ${pfmt(r.thS.p)}</span></td>
    <td>${fmt(r.gaB.R, 2)} @ ${fmt(r.gaB.mu, 0)}° <span class="ux-note">p ${pfmt(r.gaB.p)}</span></td><td>${fmt(r.gaS.R, 2)} @ ${fmt(r.gaS.mu, 0)}° <span class="ux-note">p ${pfmt(r.gaS.p)}</span></td>
    <td><b class="${v[0] === 'ok' ? 'ux-ok' : v[0] === 'few' ? '' : 'ux-bad'}">${v[1]}</b>${r.ctl ? `<br><span class="ux-note">without rhythmic input: ${r.ctl.rate < 0.5 ? 'silent, so the control cannot tell' : `${fmt(100 * r.ctl.fracB, 0)} % of spikes in bursts at ${fmt(r.ctl.rate)} Hz → ${r.ctl.fracB < 0.02 ? 'the “bursts” come from the input, not an intrinsic mechanism' : r.ctl.tonicWarn ? 'fast regular firing, not bursting' : 'intrinsic bursting'}`}</span>` : ''}</td></tr>`; };
  const phHead = '<thead><tr><th>Model</th><th>Spikes</th><th>Rate (Hz)</th><th>In bursts</th><th>Bursts / singles</th><th><span style="text-transform:none">θ</span>: bursts R @ <span style="text-transform:none">φ</span></th><th><span style="text-transform:none">θ</span>: singles</th><th><span style="text-transform:none">γ</span>: bursts</th><th><span style="text-transform:none">γ</span>: singles</th><th>Lowet et al. 2023 test</th></tr></thead>';
  function phShow() { rose('spRoseT', 0); rose('spRoseG', 1); const r = S.ph[S.model]; $('spPhTab').innerHTML = r ? `<table class="ml-table">${phHead}<tbody>${phRow(r)}</tbody></table>` : ''; }
  function phRun(keys, useOp) {
    const my = ++S.job, todo = keys.slice(), T = +$('spT').value, ctl = $('spCtl').checked, out = [];
    const next = () => { if (my !== S.job || !$('spPhTab')) return; const key = todo.shift(); if (!key) { $('spPhSt').textContent = 'done'; if (keys.length > 1) $('spPhAllTab').innerHTML = `<p class="ux-note">All models at the stimulus above, each at its default DC current (${SP_ORDER.map(k => SP_MODELS[k].name.split(' (')[0] + ' ' + SP_MODELS[k].op.Iapp).join(', ')} µA/cm²).</p><table class="ml-table">${phHead}<tbody>${out.map(phRow).join('')}</tbody></table>`; return; }
      const St = Object.assign({}, S, useOp ? { Iapp: SP_MODELS[key].op.Iapp, site: key === 'lowet' && S.site === 'soma' ? 'dend' : S.site } : {});
      $('spPhSt').textContent = `${SP_MODELS[key].name}: simulating ${T / 1000} s…`;
      spPhaseRun(key, S.P[key], St, T, S.thr, r => { r.St = St; const fin = () => { S.ph[key] = r; out.push(r); if (key === S.model) phShow(); next(); };
        if (!ctl) return fin(); spPhaseRun(key, S.P[key], Object.assign({}, St, { Ath: 0, Aga: 0 }), T, S.thr, c => { r.ctl = c.st; fin(); }, () => my === S.job); }, () => my === S.job && !!$('spPhTab')); };
    next();
  }

  /* ---------- controls ---------- */
  function setModel(k) {
    S.model = k; document.querySelectorAll('[data-spm]').forEach(b => b.setAttribute('aria-checked', b.dataset.spm === k));
    if (k === 'lowet' && S.site === 'soma') setSite('dend');
    S.Iapp = SP_MODELS[k].op.Iapp; const r = $('sp-Iapp'), n = $('sp-Iappn'); r.value = n.value = S.Iapp;
    $('spKind').innerHTML = `<b>${SP_MODELS[k].kind === 'ap' ? 'Action potentials.' : 'Integrate-and-fire events.'}</b> ${SP_MODELS[k].how}`;
    newSim(); drawFi(); phShow(); if (L && !L.running) L.play();
  }
  function setSite(k) { S.site = k; document.querySelectorAll('[data-sps]').forEach(b => b.setAttribute('aria-checked', b.dataset.sps === k)); sync(); }
  document.querySelectorAll('[data-spm]').forEach(b => b.onclick = () => setModel(b.dataset.spm));
  document.querySelectorAll('[data-sps]').forEach(b => b.onclick = () => setSite(b.dataset.sps));
  document.querySelectorAll('[data-spg]').forEach(b => b.onclick = () => { S.gmode = b.dataset.spg; document.querySelectorAll('[data-spg]').forEach(o => o.setAttribute('aria-checked', o.dataset.spg === S.gmode)); sync(); });
  STIM.forEach(([k, , , a, b]) => { const r = $('sp-' + k), n = $('sp-' + k + 'n'); r.value = n.value = S[k];
    r.oninput = () => { S[k] = +r.value; n.value = r.value; sync(); }; n.onchange = () => { S[k] = Math.min(b, Math.max(a, +n.value)); r.value = n.value = S[k]; sync(); }; });
  $('spThr').onchange = e => { S.thr = +e.target.value; drawIsi(); fiTable(); drawFi(); };
  $('spFiGo').onclick = () => fiRun([S.model]); $('spFiAll').onclick = () => fiRun(SP_ORDER); $('spFiStop').onclick = () => { S.job++; $('spFiSt').textContent = 'stopped'; $('spPhSt').textContent = ''; };
  $('spPhGo').onclick = () => phRun([S.model], false); $('spPhAll').onclick = () => phRun(SP_ORDER, true);
  const csvFi = () => ['model,spike_type,I_app_uA_cm2,rate_Hz,single_events_per_s,burst_events_per_s,frac_spikes_in_bursts,cv,burst_isi_ms'].concat(SP_ORDER.filter(k => S.fi[k]).flatMap(k => S.fi[k].res.map(o => [k, SP_MODELS[k].kind, o.I, o.rate.toFixed(3), o.ss.toFixed(3), o.bs.toFixed(3), isNaN(o.fracB) ? '' : o.fracB.toFixed(4), isNaN(o.cv) ? '' : o.cv.toFixed(4), S.thr].join(',')))).join('\n');
  const csvPh = () => ['model,spike_type,I_app,A_theta,f_theta,A_gamma,gamma_mode,D,site,T_ms,burst_isi_ms,rate_Hz,frac_in_bursts,n_bursts,n_singles,R_theta_bursts,phi_theta_bursts,p_theta_bursts,R_theta_singles,phi_theta_singles,p_theta_singles,R_gamma_bursts,phi_gamma_bursts,R_gamma_singles,phi_gamma_singles,lowet_test'].concat(SP_ORDER.filter(k => S.ph[k]).map(k => { const r = S.ph[k], St = r.St;
    return [k, SP_MODELS[k].kind, St.Iapp, St.Ath, St.fth, St.Aga, St.gmode, St.D, St.site, +$('spT').value, S.thr, r.st.rate.toFixed(3), fmt(r.st.fracB, 4), r.nB, r.nS, fmt(r.thB.R, 4), fmt(r.thB.mu, 1), r.thB.p, fmt(r.thS.R, 4), fmt(r.thS.mu, 1), r.thS.p, fmt(r.gaB.R, 4), fmt(r.gaB.mu, 1), fmt(r.gaS.R, 4), fmt(r.gaS.mu, 1), r.verdict[0]].join(','); })).join('\n');
  $('spCsvFi').onclick = () => { $('spOut').value = csvFi(); }; $('spCsvPh').onclick = () => { $('spOut').value = csvPh(); };
  $('spCfg').onclick = () => { $('spOut').value = JSON.stringify({ page: 'research-spiking', model: S.model, stimulus: { Iapp: S.Iapp, Ath: S.Ath, fth: S.fth, Aga: S.Aga, fga: S.fga, gmode: S.gmode, D: S.D, site: S.site, seed: S.seed }, burstISI_ms: S.thr, params: S.P[S.model] }, null, 1); };
  $('spCopy').onclick = () => { const t = $('spOut').value; if (navigator.clipboard && t) navigator.clipboard.writeText(t).catch(() => {}); };
  live(); setModel(S.model); drawFi(); fiTable();
}
window.renderResearchSpiking = renderResearchSpiking;

/* Collapsible source lists, site-wide.
   Any reference list rendered on any page is wrapped in a closed <details> with a count, so long
   bibliographies no longer fill the page. Lists are found by markup, not by page, so pages added later
   are covered automatically:
     ol.refs / ol.gf-refs / ul.rb-refs      → one dropdown per list (label from data-label, default "Sources")
     #reading .reading-item (topic pages)   → one dropdown for the group
     #sp-sources > p (spatial pages)        → one dropdown for the group
   A link or URL hash pointing at the section (e.g. #rs-refs) opens its dropdowns. */
const NG_REFS_SEL = 'ol.refs, ol.gf-refs, ul.rb-refs';
function ngRefsWrap(nodes, label) {
  if (!nodes.length || nodes[0].closest('details.ng-refs')) return;
  const n = nodes.reduce((a, el) => a + (el.matches('ol,ul') ? el.querySelectorAll(':scope > li').length : 1), 0);
  const d = document.createElement('details'); d.className = 'ng-refs';
  const s = document.createElement('summary'); s.innerHTML = `<span>${label}</span><em>${n}</em>`; d.appendChild(s);
  nodes[0].parentNode.insertBefore(d, nodes[0]); nodes.forEach(el => d.appendChild(el));
}
function ngRefsScan(root) {
  root = root || document;
  root.querySelectorAll(NG_REFS_SEL).forEach(el => el.hasAttribute('data-keep-open') || ngRefsWrap([el], el.dataset.label || 'Sources'));
  root.querySelectorAll('#reading').forEach(sec => ngRefsWrap([...sec.querySelectorAll(':scope > .reading-item')], 'Sources'));
  root.querySelectorAll('#sp-sources').forEach(sec => ngRefsWrap([...sec.querySelectorAll(':scope > p')], 'Sources'));
  ngRefsOpenHash();
}
function ngRefsOpenHash() {
  const id = decodeURIComponent((location.hash || '').slice(1)); if (!id) return;
  const t = document.getElementById(id); if (t) t.querySelectorAll('details.ng-refs').forEach(d => { d.open = true; });
}
(function () {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  let queued = false;
  const run = () => { queued = false; try { ngRefsScan(document); } catch (e) { /* never break a page over a dropdown */ } };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } }).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('hashchange', ngRefsOpenHash);
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    const t = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); if (t) t.querySelectorAll('details.ng-refs').forEach(d => { d.open = true; }); });
  if (document.readyState !== 'loading') run(); else addEventListener('DOMContentLoaded', run);
})();
/* Hover glossary, site-wide. Every symbol or variable that appears in a control label, table, caption or plot axis
   gets a dotted underline; hovering (or tapping, or focusing with Tab) shows a small card next to it with what the
   variable is, its unit, what changing it does and, for gating variables, a mini plot of its steady-state curve.
   The card floats over the page — nothing scrolls or moves, so the figure stays in view.
   Matching is by the symbol itself (e.g. g<sub>NaP</sub>, τ<sub>w</sub>, Δ<sub>T</sub>), by the slider's parameter key
   for labels written in words, and by axis-label text for canvas plots drawn with gyAxes. */
const NG_GL = {
  /* ---- membrane basics ---- */
  V: { s: 'V', n: 'Membrane potential', u: 'mV', d: 'Voltage inside the cell relative to outside. Rest is about −65 to −70 mV in CA1 pyramidal cells; an action potential peaks near +30 mV.', e: 'Everything else in the model is a function of V: channels open or close as V changes.' },
  Vd: { s: 'V<sub>d</sub>', n: 'Dendritic potential', u: 'mV', d: 'Voltage of the dendritic compartment in a two-compartment model.', e: 'Differs from the soma when coupling is weak or dendritic currents are strong.' },
  C: { s: 'C', n: 'Membrane capacitance', u: 'µF/cm²', d: 'Charge stored per unit voltage across the lipid bilayer, about 1 µF/cm² for all neurons. Sets how fast V moves for a given current: dV/dt = I / C.', e: 'Larger C → slower voltage changes, lower firing rate, lower resonance frequency.' },
  gL: { s: 'g<sub>L</sub>', n: 'Leak conductance', u: 'mS/cm²', d: 'Always-open channels that pull V toward E<sub>L</sub>. 1/g<sub>L</sub> is the specific membrane resistance; C/g<sub>L</sub> is the membrane time constant.', e: 'Larger g<sub>L</sub> → leakier cell: smaller responses, shorter time constant, higher rheobase.' },
  EL: { s: 'E<sub>L</sub>', n: 'Leak reversal potential', u: 'mV', d: 'The voltage the leak current pushes toward; close to the resting potential.', e: 'Raising E<sub>L</sub> depolarises rest and brings the cell closer to threshold.' },
  ENa: { s: 'E<sub>Na</sub>', n: 'Sodium reversal potential', u: 'mV', d: 'Voltage at which Na⁺ current is zero (Nernst potential, about +55 mV). Na⁺ currents depolarise because V is far below it.', e: 'Sets the driving force V − E<sub>Na</sub> of every Na⁺ current.' },
  EK: { s: 'E<sub>K</sub>', n: 'Potassium reversal potential', u: 'mV', d: 'Nernst potential for K⁺, about −90 mV. K⁺ currents repolarise and hyperpolarise.', e: 'More negative → stronger after-hyperpolarisations.' },
  ECa: { s: 'E<sub>Ca</sub>', n: 'Calcium reversal potential', u: 'mV', d: 'About +120 mV; Ca²⁺ entry depolarises and raises internal [Ca²⁺], which opens Ca²⁺-activated K⁺ channels.', e: '' },
  Eh: { s: 'E<sub>h</sub>', n: 'Iₕ reversal potential', u: 'mV', d: 'HCN channels pass both Na⁺ and K⁺, so Iₕ reverses between them (about −30 to −45 mV). Ceballos et al. 2025’s code uses −32.9 mV.', e: 'Less negative → Iₕ depolarises more at rest.' },
  Iapp: { s: 'I<sub>app</sub>', n: 'Applied current', u: 'µA/cm² (or nA)', d: 'Current injected by the experimenter through an electrode (or its model equivalent). Positive = depolarising.', e: 'Raising it moves the cell from rest to firing; the f–I curve is rate against I<sub>app</sub>.' },
  I0: { s: 'I<sub>0</sub>', n: 'Holding current', u: 'µA/cm²', d: 'Constant current that sets the operating point before a small test input (e.g. the resonance sweep) is added.', e: 'Changes the resting voltage and therefore which channels are active.' },
  Ibias: { s: 'I<sub>bias</sub>', n: 'Model’s own bias current', u: 'µA/cm²', d: 'A constant current built into the published model; I<sub>app</sub> is added on top.', e: '' },
  Ibd: { s: 'I<sub>d</sub>', n: 'Dendritic DC current', u: 'µA/cm²', d: 'Constant current into the dendrite. In Lowet et al.’s place-field script it ramps from −0.2 to 4 to mimic a place-field input.', e: 'Strong dendritic drive favours bursts in the minimal model.' },
  Iappd: { s: 'I<sub>app,d</sub>', n: 'Dendritic DC current', u: 'µA/cm²', d: 'Constant current into the dendritic compartment of the biophysical model.', e: '' },
  D: { s: 'D', n: 'Noise intensity', u: 'mV²/ms', d: 'Strength of white-noise input: V receives √(2D·dt)·ξ each step (ξ standard normal). Stands in for many random synaptic inputs.', e: 'More noise → irregular firing, spikes below the deterministic threshold, weaker phase locking.' },
  /* ---- currents and conductances ---- */
  gNa: { s: 'g<sub>Na</sub>', n: 'Transient Na⁺ conductance', u: 'mS/cm²', d: 'Maximal conductance of the fast, inactivating Na⁺ current that makes the upstroke of the action potential: I = g<sub>Na</sub> m³h (V − E<sub>Na</sub>).', e: 'Too low → no spikes; higher → taller, faster spikes.' },
  INa: { s: 'I<sub>Na</sub>', n: 'Transient Na⁺ current', u: 'µA/cm²', d: 'The spike-generating current: activates in ~0.1 ms (m), inactivates in ~1 ms (h).', e: '' },
  gNaP: { s: 'g<sub>NaP</sub>', n: 'Persistent Na⁺ conductance', u: 'mS/cm²', d: 'Na⁺ current that activates near −50 mV and does not inactivate. Amplifies depolarisations below threshold and creates the after-depolarisation that turns a spike into a burst (Golomb et al. 2006).', e: 'Raising it → lower threshold, larger after-depolarisation, bursting; amplifies resonance peaks.', curve: { th: 'thp', sg: 'sgp', def: [-47, 3], lab: 'p∞(V)' } },
  INaP: { s: 'I<sub>NaP</sub>', n: 'Persistent Na⁺ current', u: 'µA/cm²', d: 'Non-inactivating Na⁺ current, instantaneous in these models: I = g<sub>NaP</sub> p∞(V)(V − E<sub>Na</sub>). Amplifying: it pushes V further the way it is already going.', e: '', curve: { th: 'thp', sg: 'sgp', def: [-47, 3], lab: 'p∞(V)' } },
  gKdr: { s: 'g<sub>Kdr</sub>', n: 'Delayed-rectifier K⁺ conductance', u: 'mS/cm²', d: 'K⁺ current that activates during the spike (n⁴) and repolarises it.', e: 'Higher → narrower spikes, deeper after-hyperpolarisation, fewer bursts.', curve: { th: 'thn', sg: 'sgn', def: [-35, 10], lab: 'n∞(V)' } },
  gKA: { s: 'g<sub>KA</sub>', n: 'A-type K⁺ conductance', u: 'mS/cm²', d: 'Fast-activating, inactivating K⁺ current (a³b). Delays the first spike and, in dendrites, limits back-propagation (Hoffman et al. 1997).', e: 'Higher → longer latency, lower excitability.', curve: { th: 'tha', sg: 'sga', def: [-50, 20], lab: 'a∞(V)' } },
  gA: { s: 'g<sub>A</sub>', n: 'A-type K⁺ conductance', u: 'mS/cm²', d: 'Fast-activating, inactivating K⁺ current. Delays the first spike and damps dendritic excitability.', e: 'Higher → longer latency, lower excitability.' },
  gM: { s: 'g<sub>M</sub>', n: 'M-current (Kv7/KCNQ) conductance', u: 'mS/cm²', d: 'Slow (τ ≈ 75 ms), non-inactivating K⁺ current that opens near threshold. It builds up during firing and ends bursts; near rest it is the restoring current behind the 12–15 Hz somatic resonance (Hu et al. 2002).', e: 'Higher → adaptation, shorter bursts, stronger perisomatic resonance; blocking it (XE991) makes CA1 cells burst (Yue & Yaari 2004).', curve: { th: 'thz', sg: 'sgz', def: [-39, 5], lab: 'z∞(V)' } },
  gZ: { s: 'g<sub>M</sub>', n: 'M-current conductance (g<sub>Z</sub> in the code)', u: 'mS/cm²', d: 'Slow non-inactivating K⁺ current; its gate is called z in Golomb et al. 2006. It accumulates over a burst and terminates it.', e: 'Higher → shorter bursts or tonic firing; lower → longer bursts.', curve: { th: 'thz', sg: 'sgz', def: [-39, 5], lab: 'z∞(V)' } },
  IM: { s: 'I<sub>M</sub>', n: 'M-current', u: 'µA/cm²', d: 'Slow K⁺ current through Kv7/KCNQ channels: I = g<sub>M</sub> z (V − E<sub>K</sub>), z relaxing with τ ≈ 75 ms.', e: '', curve: { th: 'thz', sg: 'sgz', def: [-39, 5], lab: 'z∞(V)' } },
  gh: { s: 'g<sub>h</sub>', n: 'Iₕ (HCN) conductance', u: 'mS/cm²', d: 'Hyperpolarisation-activated cation conductance, dense in distal dendrites (Magee 1998). Opens when V goes down and depolarises back: a slow restoring current behind dendritic theta resonance.', e: 'Higher → lower input resistance, dendritic resonance at 4–8 Hz, faster EPSP decay.', curve: { th: 'thhd', sg: 'sghdn', def: [-84, -10.2], lab: 'h∞(V)' } },
  Ih: { s: 'Iₕ', n: 'Hyperpolarisation-activated current', u: 'µA/cm²', d: 'Mixed Na⁺/K⁺ current through HCN channels. Activated by hyperpolarisation, slow (tens to hundreds of ms), reverses near −30 mV.', e: '', curve: { th: 'thhd', sg: 'sghdn', def: [-84, -10.2], lab: 'h∞(V)' } },
  gHCa: { s: 'g<sub>HCa</sub>', n: 'High-threshold Ca²⁺ conductance', u: 'mS/cm²', d: 'Ca²⁺ current activated by spikes (r²). Its Ca²⁺ influx drives the Ca²⁺-activated K⁺ currents.', e: 'Higher → more Ca²⁺ per spike, stronger slow after-hyperpolarisation.' },
  gCa: { s: 'g<sub>Ca</sub>', n: 'Ca²⁺ conductance', u: 'mS/cm²', d: 'High-threshold Ca²⁺ current opened by spikes; raises internal [Ca²⁺].', e: 'Couples firing to Ca²⁺-activated K⁺ currents.' },
  gfKCa: { s: 'g<sub>fKCa</sub>', n: 'Fast Ca²⁺-activated K⁺ (BK-like)', u: 'mS/cm²', d: 'K⁺ current gated by both voltage and internal Ca²⁺; speeds spike repolarisation.', e: '' },
  gKCa: { s: 'g<sub>C</sub>', n: 'Fast Ca²⁺-activated K⁺ (BK-like)', u: 'mS/cm²', d: 'K⁺ current gated by voltage and Ca²⁺; repolarises spikes in normal Ca²⁺.', e: '' },
  gsKCa: { s: 'g<sub>sKCa</sub>', n: 'Slow Ca²⁺-activated K⁺ (sAHP)', u: 'mS/cm²', d: 'K⁺ current that builds with Ca²⁺ over many spikes (τ ≈ 450 ms) and causes spike-frequency adaptation.', e: 'Higher → stronger adaptation, longer pauses.' },
  gKAHP: { s: 'g<sub>AHP</sub>', n: 'Slow after-hyperpolarisation K⁺', u: 'mS/cm²', d: 'Ca²⁺-activated K⁺ current responsible for the slow AHP and adaptation.', e: 'Higher → stronger adaptation.' },
  gKS: { s: 'g<sub>KS</sub>', n: 'Dendritic slow K⁺ conductance', u: 'mS/cm²', d: 'Slow K⁺ current in the dendrite of Lowet et al.’s minimal model; with NaP it sets the burst rhythm.', e: 'Higher → fewer, shorter bursts.' },
  gp: { s: 'g<sub>p</sub>', n: 'Persistent Na⁺ conductance (Pena & Rotstein)', u: 'mS/cm²', d: 'The amplifying current of the 2-D NaP + Iₕ model.', e: 'Higher → sharper resonance peak, closer to instability.', curve: { th: 'vp', sg: 'kp', def: [-38, 6.5], lab: 'p∞(V)' } },
  gac: { s: 'g<sub>ac</sub>', n: 'Soma–dendrite coupling', u: 'mS/cm²', d: 'Conductance of the axial path between the two compartments (current = g<sub>ac</sub>(V<sub>d</sub> − V<sub>s</sub>)). Lumps the cable between soma and dendrite into one resistor.', e: 'Strong → the two compartments act as one; weak → the dendrite can do its own thing (dendritic spikes, separate resonance).' },
  gc: { s: 'g<sub>c</sub>', n: 'Compartment coupling (Pinsky–Rinzel)', u: 'mS/cm²', d: 'Coupling between soma and dendrite, divided by the area fractions p and 1 − p.', e: 'Strong coupling suppresses bursting; intermediate coupling lets the dendrite feed the soma an after-depolarisation.' },
  p: { s: 'p', n: 'Somatic area fraction', u: '', d: 'Fraction of membrane area in the soma compartment (Pinsky & Rinzel 1994). Lowet et al. use 0.15.', e: '' },
  /* ---- gates ---- */
  m: { s: 'm', n: 'Na⁺ activation gate', u: '0–1', d: 'Fraction of Na⁺ activation gates open; instantaneous in these models.', e: '', curve: { th: 'thm', sg: 'sgm', def: [-30, 9.5], lab: 'm∞(V)' } },
  h: { s: 'h', n: 'Na⁺ inactivation gate', u: '0–1', d: 'Closes during depolarisation and must recover before the next spike.', e: '', curve: { th: 'thh', sg: 'sgh', def: [-45, -7], lab: 'h∞(V)' } },
  n: { s: 'n', n: 'K⁺ activation gate', u: '0–1', d: 'Delayed-rectifier activation; I<sub>Kdr</sub> ∝ n⁴.', e: '', curve: { th: 'thn', sg: 'sgn', def: [-35, 10], lab: 'n∞(V)' } },
  z: { s: 'z', n: 'M-current activation', u: '0–1', d: 'The slow variable of CA1 bursting: it rises during a burst and falls in the silence. In a fast–slow analysis z is frozen and the fast system is studied at each z.', e: '', curve: { th: 'thz', sg: 'sgz', def: [-39, 5], lab: 'z∞(V)' } },
  w: { s: 'w', n: 'Adaptation current (AdEx)', u: 'µA/cm²', d: 'One slow variable standing in for I<sub>M</sub>, sAHP and Iₕ: τ<sub>w</sub> dw/dt = a(V − E<sub>L</sub>) − w, and w jumps by b at each spike.', e: '' },
  r: { s: 'r', n: 'Iₕ gate (Pena & Rotstein)', u: '0–1', d: 'Iₕ activation; opens with hyperpolarisation and relaxes with τ<sub>r</sub>.', e: '', curve: { th: 'vr', sg: 'krn', def: [-79.2, -9.78], lab: 'r∞(V)' } },
  /* ---- kinetics ---- */
  thp: { s: 'θ<sub>p</sub>', n: 'NaP half-activation voltage', u: 'mV', d: 'Voltage at which half of the persistent Na⁺ channels are open. Values used on this site: −47 mV (Golomb kinetics, as in the lab code) and −35 mV (as printed in Ceballos et al. 2025 Table 1).', e: 'More negative → NaP active closer to rest → lower threshold and more bursting.', curve: { th: 'thp', sg: 'sgp', def: [-47, 3], lab: 'p∞(V)' } },
  thetap: { s: 'θ<sub>p</sub>', n: 'NaP half-activation voltage', u: 'mV', d: 'Voltage at which half of the persistent Na⁺ channels are open (Golomb et al. 2006).', e: 'More negative → NaP active closer to rest → more bursting.', curve: { th: 'thetap', sg: 'sgp', def: [-47, 3], lab: 'p∞(V)' } },
  sgp: { s: 'σ<sub>p</sub>', n: 'NaP activation slope', u: 'mV', d: 'Steepness of p∞(V) = 1/(1 + exp(−(V − θ<sub>p</sub>)/σ<sub>p</sub>)). Smaller σ → sharper switch.', e: '' },
  vp: { s: 'v<sub>p</sub>', n: 'p half-activation', u: 'mV', d: 'Half-activation voltage of the persistent Na⁺ gate in the Pena & Rotstein model.', e: '', curve: { th: 'vp', sg: 'kp', def: [-38, 6.5], lab: 'p∞(V)' } },
  kp: { s: 'k<sub>p</sub>', n: 'p slope', u: 'mV', d: 'Steepness of the persistent Na⁺ activation curve.', e: '', curve: { th: 'vp', sg: 'kp', def: [-38, 6.5], lab: 'p∞(V)' } },
  vr: { s: 'v<sub>r</sub>', n: 'r half-activation', u: 'mV', d: 'Half-activation voltage of the Iₕ gate (activates below it).', e: '', curve: { th: 'vr', sg: 'krn', def: [-79.2, -9.78], lab: 'r∞(V)' } },
  kr: { s: 'k<sub>r</sub>', n: 'r slope', u: 'mV', d: 'Steepness of the Iₕ activation curve.', e: '' },
  tauz: { s: 'τ<sub>z</sub>', n: 'M-current time constant', u: 'ms', d: 'How fast the M-current gate follows voltage (75 ms in Golomb et al. 2006).', e: 'Slower → longer bursts and a lower resonance frequency.' },
  tauZ: { s: 'τ<sub>z</sub>', n: 'M-current time constant', u: 'ms', d: 'How fast the M-current gate follows voltage (75 ms in Golomb et al. 2006).', e: 'Slower → longer bursts and a lower resonance frequency.' },
  taur: { s: 'τ<sub>r</sub>', n: 'Iₕ time constant', u: 'ms', d: 'How fast Iₕ follows voltage.', e: 'Resonance needs a restoring current that is slow compared with the membrane time constant; changing τ<sub>r</sub> moves the peak frequency.' },
  tauhd: { s: 'τ<sub>h</sub>', n: 'Iₕ time constant', u: 'ms', d: 'Time constant of the dendritic Iₕ gate. With the code formula it is ~3 s near rest, so Iₕ acts almost as a static conductance.', e: '' },
  tauw: { s: 'τ<sub>w</sub>', n: 'Adaptation time constant (AdEx)', u: 'ms', d: 'How slowly w follows voltage. Set to 75 ms here, the M-current time constant.', e: 'With a &gt; 0, a slow τ<sub>w</sub> gives subthreshold resonance; it also sets how long adaptation lasts.' },
  /* ---- integrate-and-fire ---- */
  Vth: { s: 'V<sub>th</sub>', n: 'Spike threshold', u: 'mV', d: 'In an integrate-and-fire model a “spike” is recorded when V reaches this value; V is then reset. There is no action potential shape.', e: 'Higher → higher rheobase, lower rate.' },
  Vreset: { s: 'V<sub>reset</sub>', n: 'Reset voltage', u: 'mV', d: 'Where V is put after an integrate-and-fire spike.', e: 'Higher reset → shorter interval to the next spike; close to threshold it produces bursts.' },
  Vr: { s: 'V<sub>r</sub>', n: 'Reset voltage (AdEx)', u: 'mV', d: 'Where V goes after each spike.', e: 'High V<sub>r</sub> (above V<sub>T</sub>) with small b → bursting (Naud et al. 2008).' },
  tref: { s: 't<sub>ref</sub>', n: 'Refractory period', u: 'ms', d: 'Time after a spike during which V is held and no spike can occur.', e: 'Caps the maximum rate at 1/t<sub>ref</sub>.' },
  VT: { s: 'V<sub>T</sub>', n: 'Soft threshold (AdEx)', u: 'mV', d: 'Voltage where the exponential term takes over and the spike becomes self-sustaining. Not a hard threshold: the cell can cross V<sub>T</sub> briefly without firing.', e: 'Lower → more excitable.' },
  DT: { s: 'Δ<sub>T</sub>', n: 'Spike slope factor (AdEx)', u: 'mV', d: 'Sharpness of spike initiation in the term g<sub>L</sub>Δ<sub>T</sub> exp((V − V<sub>T</sub>)/Δ<sub>T</sub>). For I<sub>Na</sub> ∝ m∞³ it is about σ<sub>m</sub>/3 (Fourcaud-Trocmé et al. 2003).', e: 'Small → sharp, LIF-like threshold; large → gradual onset and a wider range where V can hover.' },
  a: { s: 'a', n: 'Subthreshold adaptation (AdEx)', u: 'mS/cm²', d: 'How strongly w follows V below threshold. In the reduction it equals the derivative conductance of I<sub>M</sub>.', e: 'a &gt; 0 with slow τ<sub>w</sub> → resonance; a &lt; 0 → amplifying.' },
  b: { s: 'b', n: 'Spike-triggered adaptation (AdEx)', u: 'µA/cm²', d: 'Jump in w at each spike: the after-spike K⁺ current in one number.', e: 'Larger b → stronger adaptation; small b with high V<sub>r</sub> → bursting.' },
  G: { s: 'G', n: 'Membrane conductance (GLIF)', u: 'mS/cm²', d: 'Total resting conductance of the GLIF model (its leak).', e: '' },
  Tinf: { s: 'Θ<sub>∞</sub>', n: 'Baseline threshold (GLIF)', u: 'mV', d: 'The threshold the GLIF model relaxes back to between spikes (Teeter et al. 2018).', e: 'Higher → higher rheobase.' },
  dTs: { s: 'δΘ<sub>s</sub>', n: 'Spike-induced threshold jump (GLIF)', u: 'mV', d: 'Threshold rises by this much after each spike and decays back.', e: 'Larger → stronger adaptation by threshold.' },
  av: { s: 'a<sub>v</sub>', n: 'Voltage-dependent threshold (GLIF level 4–5)', u: '1/ms', d: 'Threshold follows the subthreshold voltage at this rate, so slow depolarisations raise it (accommodation).', e: '' },
  dV: { s: 'δV', n: 'Reset offset (GLIF)', u: 'mV', d: 'After a spike V ← E<sub>L</sub> + f<sub>v</sub>(V − E<sub>L</sub>) − δV.', e: 'Negative δV resets above rest → faster second spike.' },
  A1: { s: 'A₁', n: 'Fast after-spike current (GLIF)', u: 'µA/cm²', d: 'Current added at each spike that decays with τ ≈ 10 ms. Negative = hyperpolarising (AHP).', e: '' },
  A2: { s: 'A₂', n: 'Slow after-spike current (GLIF)', u: 'µA/cm²', d: 'Current added at each spike that decays with τ ≈ 450 ms: slow adaptation.', e: '' },
  A3: { s: 'A₃', n: 'Depolarising after-spike current (GLIF)', u: 'µA/cm²', d: 'Positive current after each spike (τ ≈ 20 ms): an after-depolarisation, the integrate-and-fire stand-in for NaP-driven bursts.', e: 'Larger → second spikes come sooner → bursts.' },
  level: { s: 'GLIF level', n: 'GLIF model level', u: '1–5', d: '1 LIF; 2 + reset rules and spike-induced threshold; 3 + after-spike currents; 4–5 + voltage-dependent threshold (Teeter et al. 2018).', e: '' },
  /* ---- stimulus ---- */
  Ath: { s: 'A<sub>θ</sub>', n: 'Theta input amplitude', u: 'µA/cm²', d: 'Amplitude of the sinusoidal theta (4–12 Hz) input, standing in for rhythmic entorhinal/septal drive.', e: 'Larger → stronger theta modulation of firing; bursts gather at the input peak.' },
  fth: { s: 'f<sub>θ</sub>', n: 'Theta frequency', u: 'Hz', d: 'Frequency of the theta input. Hippocampal theta in running rodents is ~6–10 Hz (Buzsáki 2002).', e: '' },
  Aga: { s: 'A<sub>γ</sub>', n: 'Gamma input amplitude', u: 'µA/cm²', d: 'Amplitude of the gamma (30–90 Hz) input, standing in for perisomatic interneuron and CA3 drive.', e: 'Larger → single spikes lock to gamma.' },
  fga: { s: 'f<sub>γ</sub>', n: 'Gamma frequency', u: 'Hz', d: 'Frequency of the sinusoidal gamma input. Slow gamma ~30–50 Hz, fast gamma ~60–100 Hz (Colgin et al. 2009).', e: '' },
  /* ---- resonance & analysis ---- */
  Z: { s: '|Z|', n: 'Impedance magnitude', u: 'kΩ·cm² or MΩ', d: 'Voltage amplitude divided by current amplitude for a sinusoidal input at frequency f: how strongly the cell responds at that frequency.', e: 'A peak above 0 Hz means the cell is resonant.' },
  fR: { s: 'f<sub>R</sub>', n: 'Resonance frequency', u: 'Hz', d: 'Frequency of the impedance peak. CA1: ~3–5 Hz from Iₕ in dendrites and at hyperpolarised potentials, ~5–7 Hz from I<sub>M</sub> near threshold (Hu et al. 2002, 2009).', e: '' },
  Q: { s: 'Q', n: 'Resonance strength', u: 'ratio', d: '|Z(f<sub>R</sub>)| / |Z(0)|, here with Z at the lowest frequency swept. Q = 1 means no resonance.', e: '' },
  GDer: { s: 'G<sup>Der</sup>', n: 'Derivative conductance', u: 'mS/cm²', d: 'How much a current changes per mV through its gate, at the operating point: g·(V − E)·dx∞/dV. Positive = restoring (resonance), negative = amplifying (Pena et al. 2018).', e: '' },
  fSS: { s: 'f<sub>SS</sub>', n: 'Single-spike resonance frequency', u: 'Hz', d: 'Input frequency that evokes the most single-spike events (Ceballos et al. 2025).', e: '' },
  fBS: { s: 'f<sub>BS</sub>', n: 'Burst resonance frequency', u: 'Hz', d: 'Input frequency that evokes the most bursts.', e: '' },
  df: { s: 'Δf', n: 'Interleaving gap', u: 'Hz', d: 'f<sub>SS</sub> − f<sub>BS</sub>: positive when single spikes prefer faster input than bursts.', e: '' },
  dA: { s: 'ΔA', n: 'Amplitude difference', u: 'events/s', d: 'A<sub>SS</sub> − A<sub>BS</sub>: single-spike minus burst event rate at their peaks.', e: '' },
  ISI: { s: 'ISI', n: 'Inter-spike interval', u: 'ms', d: 'Time between consecutive spikes. Spikes closer than the burst threshold (10 ms Lowet; 14 ms Ceballos) form one burst.', e: '' },
  CV: { s: 'CV', n: 'Coefficient of variation of ISIs', u: '', d: 'SD/mean of the inter-spike intervals: 0 = clock-like, 1 = Poisson-like.', e: '' },
  CV2: { s: 'CV₂', n: 'Local irregularity', u: '', d: 'Mean of 2|ISI<sub>k+1</sub> − ISI<sub>k</sub>|/(ISI<sub>k+1</sub> + ISI<sub>k</sub>); insensitive to slow rate changes (Holt et al. 1996).', e: '' },
  R: { s: 'R', n: 'Phase-locking strength', u: '0–1', d: 'Mean resultant length of spike phases: 0 = no preferred phase, 1 = every spike at the same phase.', e: '' },
  rate: { s: 'rate', n: 'Firing rate', u: 'Hz', d: 'Spikes per second over the analysis window.', e: '' },
  rheo: { s: 'I<sub>rh</sub>', n: 'Rheobase', u: 'µA/cm²', d: 'The smallest constant current that makes the cell fire repetitively.', e: '' },
  phase: { s: 'phase', n: 'Phase', u: '°', d: 'Position within a cycle of the rhythm. On these pages 0° is the peak of the input current and 180° its trough.', e: '' },
  freq: { s: 'f', n: 'Input frequency', u: 'Hz', d: 'Frequency of the sinusoidal test input.', e: '' },
  t: { s: 't', n: 'Time', u: 'ms', d: 'Simulated time.', e: '' },
  /* ---- place fields / morphology ---- */
  v0: { s: 'v', n: 'Running speed', u: 'cm/s', d: 'Mean speed of the simulated mouse on the belt.', e: 'Faster → shorter time in the field, fewer spikes per pass.' },
  eta: { s: 'η', n: 'Plasticity per plateau', u: 'fraction', d: 'How far each plateau potential moves the CA3→CA1 weights toward their maximum (behavioural-timescale plasticity, Bittner et al. 2017).', e: 'Larger → a place field forms in one lap.' },
  plAmp: { s: 'I<sub>plateau</sub>', n: 'Plateau current', u: 'µA/cm²', d: 'Size of the dendritic plateau potential that triggers BTSP.', e: '' },
  plDur: { s: 'T<sub>plateau</sub>', n: 'Plateau duration', u: 'ms', d: 'Length of the plateau; real plateaus last ~300 ms (Bittner et al. 2015).', e: '' },
  hS: { s: 'Iₕ ×', n: 'Iₕ density scale', u: '×', d: 'Multiplies the Iₕ density everywhere, keeping its increase with distance from the soma (Magee 1998; Migliore 2005 model).', e: '' },
  kaS: { s: 'I<sub>A</sub> ×', n: 'A-type density scale', u: '×', d: 'Multiplies the dendritic A-type K⁺ density, which rises with distance (Hoffman et al. 1997).', e: '' },
  naS: { s: 'Na⁺ ×', n: 'Na⁺ density scale', u: '×', d: 'Multiplies the Na⁺ channel density on the whole tree.', e: '' }
};
/* concepts: tagged once per section, whole word */
const NG_GLC = [
  [/\bnullclines?\b/i, 'Nullcline', 'The curve where one variable stops changing (dx/dt = 0). Fixed points sit where nullclines cross; trajectories cross a nullcline vertically or horizontally.'],
  [/\bfixed points?\b|\bequilibri(a|um)\b|\bsteady states?\b/i, 'Fixed point', 'A state where every variable has stopped changing. Stable: nearby trajectories return to it (rest). Unstable: they leave it.'],
  [/\blimit cycles?\b/i, 'Limit cycle', 'A closed trajectory that nearby states spiral onto: repetitive firing in the phase plane.'],
  [/\bsaddle[- ]node\b|\bfold\b/i, 'Saddle-node (fold)', 'Two fixed points (a stable and a saddle) meet and vanish as a parameter changes. In CA1 bursting the burst starts when rest disappears this way.'],
  [/\bHopf\b/i, 'Hopf bifurcation', 'A fixed point loses stability and an oscillation is born with a definite frequency; typical of resonators.'],
  [/\bhomoclinic\b/i, 'Homoclinic bifurcation', 'A limit cycle collides with a saddle and disappears; ends square-wave bursts.'],
  [/\bphase plane\b/i, 'Phase plane', 'A plot of one variable against another (e.g. V against a gate). Each point is a state; the flow shows where the state goes next.'],
  [/\bfast[–-]slow\b/i, 'Fast–slow analysis', 'Freeze the slow variable, find what the fast system does at each value, then let the slow variable move along those states.'],
  [/\bbifurcations?\b/i, 'Bifurcation', 'A qualitative change in behaviour (rest ↔ firing ↔ bursting) as a parameter crosses a critical value.'],
  [/\brheobase\b/i, 'Rheobase', 'The smallest constant current that makes the cell fire.'],
  [/\bimpedance\b/i, 'Impedance', 'Voltage response per unit current at a given input frequency.'],
  [/\bresonan(ce|t)\b/i, 'Resonance', 'A preference for inputs at a particular frequency: the impedance peaks above 0 Hz. Needs a slow current that opposes voltage changes (Iₕ, I<sub>M</sub>).'],
  [/\bafter-?depolari[sz]ation\b|\bADP\b/, 'After-depolarisation', 'A depolarising hump after a spike; when large enough it triggers a second spike, making a burst.'],
  [/\bphase precession\b/i, 'Phase precession', 'As an animal crosses a place field, spikes occur at progressively earlier theta phases (O’Keefe & Recce 1993).'],
  [/\bplateau potentials?\b/i, 'Plateau potential', 'A long (~300 ms) dendritic Ca²⁺/NMDA depolarisation that drives bursts and triggers BTSP.'],
  [/\bBTSP\b/, 'BTSP', 'Behavioural-timescale synaptic plasticity: one plateau strengthens inputs active seconds before or after it, creating a place field in one lap (Bittner et al. 2017).'],
  [/\bback-?propagat\w*/i, 'Back-propagation', 'Action potentials travelling from the soma into the dendrites; attenuated by A-type K⁺ channels.'],
  [/\bderivative conductances?\b/i, 'Derivative conductance', 'The change in a current per mV through its gate at an operating point; sign tells restoring (+) from amplifying (−).'],
  [/\blinearis\w*|\blineariz\w*/i, 'Linearisation', 'Replacing a nonlinear model by its straight-line approximation around an operating point; exact for small inputs.']
];
/* symbol HTML → key (longest first) */
const NG_GLS = [
  [/g<sub>NaP<\/sub>/g, 'gNaP'], [/g<sub>Na<\/sub>/g, 'gNa'], [/g<sub>Kdr<\/sub>/g, 'gKdr'], [/g<sub>KA<\/sub>/g, 'gKA'], [/g<sub>KM<\/sub>|g<sub>M<\/sub>|g_M\b/g, 'gM'], [/g<sub>h<\/sub>|gₕ/g, 'gh'],
  [/g<sub>L<\/sub>/g, 'gL'], [/g<sub>ac<\/sub>/g, 'gac'], [/g<sub>c<\/sub>/g, 'gc'], [/g<sub>HCa<\/sub>/g, 'gHCa'], [/g<sub>fKCa<\/sub>/g, 'gfKCa'], [/g<sub>sKCa<\/sub>/g, 'gsKCa'], [/g<sub>KS<\/sub>/g, 'gKS'],
  [/g<sub>A<\/sub>/g, 'gA'], [/g<sub>Ca<\/sub>/g, 'gCa'], [/g<sub>AHP<\/sub>/g, 'gKAHP'], [/g<sub>C<\/sub>/g, 'gKCa'], [/g<sub>p<\/sub>/g, 'gp'], [/g_NaP\b/g, 'gNaP'],
  [/I<sub>NaP<\/sub>/g, 'INaP'], [/I<sub>Na<\/sub>/g, 'INa'], [/I<sub>M<\/sub>/g, 'IM'], [/I<sub>app<\/sub>|I_app\b/g, 'Iapp'], [/I<sub>h<\/sub>|Iₕ/g, 'Ih'], [/I<sub>rh<\/sub>|I_rh\b/g, 'rheo'],
  [/E<sub>Na<\/sub>/g, 'ENa'], [/E<sub>K<\/sub>/g, 'EK'], [/E<sub>Ca<\/sub>/g, 'ECa'], [/E<sub>h<\/sub>/g, 'Eh'], [/E<sub>L<\/sub>/g, 'EL'],
  [/τ<sub>w<\/sub>/g, 'tauw'], [/τ<sub>r<\/sub>/g, 'taur'], [/τ<sub>z<\/sub>/g, 'tauz'], [/θ<sub>p<\/sub>/g, 'thp'], [/σ<sub>p<\/sub>/g, 'sgp'],
  [/Δ<sub>T<\/sub>/g, 'DT'], [/V<sub>T<\/sub>/g, 'VT'], [/V<sub>r<\/sub>/g, 'Vr'], [/V<sub>th<\/sub>/g, 'Vth'], [/V<sub>reset<\/sub>/g, 'Vreset'], [/V<sub>d<\/sub>/g, 'Vd'],
  [/Θ<sub>∞<\/sub>/g, 'Tinf'], [/δΘ<sub>s<\/sub>/g, 'dTs'], [/a<sub>v<\/sub>/g, 'av'], [/A₁/g, 'A1'], [/A₂/g, 'A2'], [/A₃/g, 'A3'],
  [/f<sub>R<\/sub>/g, 'fR'], [/f<sub>SS<\/sub>/g, 'fSS'], [/f<sub>BS<\/sub>/g, 'fBS'], [/G<sup>Der<\/sup>/g, 'GDer'], [/Δf\b/g, 'df'], [/ΔA\b/g, 'dA'], [/CV₂/g, 'CV2'], [/\bCV\b(?!₂)/g, 'CV'], [/\bISI\b/g, 'ISI']
];
/* slider-key fallbacks (labels written in words) and key aliases */
const NG_GLK = { Iapp: 'Iapp', I0: 'I0', Ibias: 'Ibias', Ibd: 'Ibd', Iappd: 'Iappd', D: 'D', Ath: 'Ath', fth: 'fth', Aga: 'Aga', fga: 'fga', C: 'C', G: 'G', a: 'a', b: 'b', p: 'p', kp: 'kp', kr: 'kr', vp: 'vp', vr: 'vr',
  Vth: 'Vth', Vreset: 'Vreset', tref: 'tref', v0: 'v0', eta: 'eta', plAmp: 'plAmp', plDur: 'plDur', hS: 'hS', kaS: 'kaS', naS: 'naS', level: 'level', dV: 'dV', thetap: 'thetap', tauZ: 'tauZ', tauhd: 'tauhd', gZ: 'gZ', gKCa: 'gKCa', gKAHP: 'gKAHP', gCa: 'gCa', gA: 'gA', thp: 'thp' };
/* canvas axis label text → key */
const NG_GLA = [[/^\|Z\|/, 'Z'], [/^V\b|voltage/i, 'V'], [/^rate|events \/ s/i, 'rate'], [/I − I_rh/, 'rheo'], [/^I_app/, 'Iapp'], [/phase/i, 'phase'], [/inter-spike|ISI/i, 'ISI'], [/^z\b/, 'z'], [/^g_M/, 'gM'], [/^g_NaP/, 'gNaP'], [/frequency/i, 'freq'], [/^time/i, 't'], [/^w\b/, 'w']];
const NG_GL_SKIP = 'A,BUTTON,SELECT,OPTION,TEXTAREA,INPUT,SCRIPT,STYLE,CANVAS,SVG,SUMMARY,CODE,PRE,H1,H2';
const NG_GL_FMT = new Set(['SUB', 'SUP', 'I', 'B', 'EM', 'SMALL', 'BR', 'STRONG']);
function ngGlTag(html) {
  // protect existing tags/entities from symbol matches inside attributes: we only run on formatting-only elements
  let out = html, hit = false;
  NG_GLS.forEach(([re, k]) => { out = out.replace(re, m => { hit = true; return `\u0001${k}\u0002${m}\u0003`; }); });
  const L1 = new Set(['V', 'm', 'h', 'n', 'z', 'w']);   // single-letter state variables, only in unambiguous contexts
  out = out.replace(/\(((?:[A-Za-z], )+[A-Za-z])\)/g, (m, list) => { const parts = list.split(', '); if (!parts.some(c => L1.has(c))) return m; hit = true; return '(' + parts.map(c => L1.has(c) ? `\u0001${c}\u0002${c}\u0003` : c).join(', ') + ')'; });
  out = out.replace(/\b(gate|variable) ([mhnzw])\b/g, (m, w, c) => { hit = true; return `${w} \u0001${c}\u0002${c}\u0003`; });
  if (!hit) return null;
  return out.replace(/\u0001(\w+)\u0002([\s\S]*?)\u0003/g, (m, k, s) => `<span class="ng-g" data-g="${k}" tabindex="0">${s}</span>`);
}
function ngGlScan(root) {
  const scope = root || document.getElementById('lesson') || document.body; if (!scope) return;
  // 1. symbols in formatting-only elements
  scope.querySelectorAll('label,td,th,li,p,span,em,b,h3,h4,dt,dd,figcaption,small').forEach(el => {
    if (el._ngh === el.innerHTML || el.closest('.ng-g,.ng-tip,[data-nogloss],.lv-bar,.ux-status,' + NG_GL_SKIP.toLowerCase())) return;
    if ([...el.children].some(c => !NG_GL_FMT.has(c.tagName))) { el._ngh = el.innerHTML; return; }
    const t = ngGlTag(el.innerHTML); if (t) el.innerHTML = t; el._ngh = el.innerHTML;
  });
  // 2. slider labels written in words → tag the whole label by parameter key
  scope.querySelectorAll('.ux-sl > label').forEach(lab => {
    if (lab.dataset.nggk || lab.querySelector('.ng-g')) return; lab.dataset.nggk = '1';
    const id = (lab.getAttribute('for') || '').replace(/n$/, ''), key = id.split('-').pop(); const g = NG_GLK[key] || (NG_GL[key] ? key : null);
    if (g) { lab.classList.add('ng-g'); lab.dataset.g = g; lab.tabIndex = -1; }
  });
  // 3. parameter-table rows on the resonance page (data-rxp inputs)
  scope.querySelectorAll('input[data-rxp]').forEach(inp => { const td = inp.closest('tr') && inp.closest('tr').firstElementChild; if (!td || td.dataset.nggk || td.querySelector('.ng-g')) return; td.dataset.nggk = '1'; const k = inp.dataset.rxp; if (NG_GL[k]) { td.classList.add('ng-g'); td.dataset.g = k; } });
  // 4. concepts: first occurrence per section, plain text paragraphs only
  scope.querySelectorAll('section.lesson-section, .wb-panel').forEach(sec => {
    if (sec.dataset.nggc) return; sec.dataset.nggc = '1'; const used = new Set();
    sec.querySelectorAll('p, li').forEach(el => {
      if (el.closest('.ng-tip,[data-nogloss],details.ng-refs,.ux-fig')) return;
      [...el.childNodes].forEach(nd => { if (nd.nodeType !== 3) return; for (let i = 0; i < NG_GLC.length; i++) { if (used.has(i)) continue; const [re, name] = NG_GLC[i], m = nd.nodeValue.match(re); if (!m) continue;
        used.add(i); const sp = document.createElement('span'); sp.className = 'ng-g ng-gc'; sp.dataset.gc = i; sp.tabIndex = 0; sp.textContent = m[0];
        const after = nd.splitText(m.index); after.nodeValue = after.nodeValue.slice(m[0].length); nd.parentNode.insertBefore(sp, after); break; } });
    });
  });
}
/* ---------- the card ---------- */
let ngTip = null, ngTipFor = null, ngTipPin = false, ngTipTimer = 0;
function ngGlLive(key) {  // current value of a parameter on this page, if there is a control for it
  const inp = document.querySelector(`input[type=range][id$="-${key}"], input[data-rxp="${key}"]`); return inp ? +inp.value : null;
}
function ngGlCurve(c) {
  let th = ngGlLive(c.th); if (th === null && c.th === 'thp') th = ngGlLive('thetap'); const live = th !== null; let sg = c.sg.endsWith('n') ? null : ngGlLive(c.sg); th = th === null ? c.def[0] : th; sg = sg === null ? c.def[1] : (c.def[1] < 0 ? -Math.abs(sg) : sg);
  const W = 260, H = 92, x0 = -110, x1 = 20, X = v => 30 + (W - 38) * (v - x0) / (x1 - x0), Y = v => H - 18 - (H - 30) * v;
  let d = ''; for (let v = x0; v <= x1; v += 1) d += (v === x0 ? 'M' : 'L') + X(v).toFixed(1) + ' ' + Y(1 / (1 + Math.exp(-(v - th) / sg))).toFixed(1);
  return `<svg class="ng-tip-fig" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${c.lab} steady-state curve"><path d="M30 ${Y(0)}H${W - 8}M30 ${Y(0)}V${Y(1)}" class="ax"/><path d="M${X(th)} ${Y(0)}V${Y(1)}" class="hl"/><path d="${d}" class="cv"/>
    <text x="34" y="${Y(1) + 4}">1</text><text x="20" y="${Y(0) + 4}">0</text><text x="${X(-100)}" y="${H - 4}">−100</text><text x="${X(-50)}" y="${H - 4}">−50</text><text x="${X(0)}" y="${H - 4}">0 mV</text><text x="${X(th) + 4}" y="${Y(0.5) - 4}" class="lb">${c.lab}, half at ${th} mV${live ? '' : ' (default)'}</text></svg>`;
}
function ngGlCard(el) {
  let h;
  if (el.dataset.gc !== undefined) { const [, name, d] = NG_GLC[+el.dataset.gc]; h = `<div class="ng-tip-h"><b>${name}</b></div><p>${d}</p>`; }
  else { const g = NG_GL[el.dataset.g]; if (!g) return null; const key = el.dataset.g, inp = el.tagName === 'LABEL' ? document.getElementById((el.getAttribute('for') || '').replace(/n$/, '')) || document.getElementById(el.getAttribute('for')) : null;
    const lab = el.closest ? el.closest('.ux-sl > label') : null, linp = lab ? document.getElementById((lab.getAttribute('for') || '').replace(/n$/, '')) : inp, now = linp && linp.value !== '' ? linp.value : null;
    h = `<div class="ng-tip-h"><span class="ng-tip-s">${g.s}</span><b>${g.n}</b>${g.u ? `<em>${g.u}</em>` : ''}</div><p>${g.d}</p>${g.e ? `<p class="ng-tip-e"><b>Change it:</b> ${g.e}</p>` : ''}${now !== null ? `<p class="ng-tip-now">Now on this page: <b>${now}</b> ${g.u || ''}</p>` : ''}${g.curve ? ngGlCurve(g.curve) : ''}`; }
  return h;
}
function ngGlShow(el, x, y) {
  const h = ngGlCard(el); if (!h) return;
  if (!ngTip) { ngTip = document.createElement('div'); ngTip.className = 'ng-tip'; ngTip.setAttribute('role', 'tooltip'); ngTip.id = 'ng-tip'; document.body.appendChild(ngTip);
    ngTip.addEventListener('pointerenter', () => clearTimeout(ngTipTimer)); ngTip.addEventListener('pointerleave', () => { if (!ngTipPin) ngGlHide(); }); }
  ngTip.innerHTML = h + (ngTipPin ? '<button class="ng-tip-x" aria-label="Close">×</button>' : ''); ngTip.hidden = false; ngTipFor = el;
  const bx = ngTip.querySelector('.ng-tip-x'); if (bx) bx.onclick = () => { ngTipPin = false; ngGlHide(); };
  if (el.setAttribute) el.setAttribute('aria-describedby', 'ng-tip');
  const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: x, right: x, top: y, bottom: y }, tw = Math.min(320, innerWidth - 16); ngTip.style.width = tw + 'px';
  const th = ngTip.offsetHeight; let left = Math.min(Math.max(8, (x !== undefined ? x : r.left) - 20), innerWidth - tw - 8), top = r.bottom + 8;
  if (top + th > innerHeight - 8) top = Math.max(8, r.top - th - 8);
  ngTip.style.left = left + 'px'; ngTip.style.top = top + 'px';
}
function ngGlHide() { if (ngTip) ngTip.hidden = true; if (ngTipFor && ngTipFor.removeAttribute) ngTipFor.removeAttribute('aria-describedby'); ngTipFor = null; }
/* canvas axis labels drawn by gyAxes register hit boxes on the canvas (see gyAxes) */
function ngGlAxisHit(cv, ex, ey) {
  const L = cv._ngAx; if (!L) return null; const r = cv.getBoundingClientRect(), x = ex - r.left, y = ey - r.top;
  for (const z of L) if (x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) { const m = NG_GLA.find(([re]) => re.test(z.t)); if (m) return m[1]; }
  return null;
}
(function () {
  if (typeof document === 'undefined') return;
  const fine = matchMedia('(hover: hover)').matches;
  document.addEventListener('pointerover', e => { if (!fine || ngTipPin) return; const el = e.target.closest && e.target.closest('.ng-g'); if (!el) return; clearTimeout(ngTipTimer); ngTipTimer = setTimeout(() => ngGlShow(el), 120); });
  document.addEventListener('pointerout', e => { if (!fine || ngTipPin) return; const el = e.target.closest && e.target.closest('.ng-g'); if (!el) return; clearTimeout(ngTipTimer); ngTipTimer = setTimeout(() => { if (ngTip && ngTip.matches(':hover')) return; ngGlHide(); }, 180); });
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('.ng-g');
    if (el && !el.matches('label')) { e.preventDefault(); ngTipPin = !(ngTipPin && ngTipFor === el); if (ngTipPin) ngGlShow(el); else ngGlHide(); return; }
    if (el && el.matches('label') && !fine) { ngTipPin = true; ngGlShow(el); return; }
    if (ngTip && !ngTip.hidden && !(e.target.closest && e.target.closest('.ng-tip'))) { ngTipPin = false; ngGlHide(); }
  }, true);
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('span.ng-g'); if (el) ngGlShow(el); });
  document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('span.ng-g') && !ngTipPin) ngGlHide(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ngTip && !ngTip.hidden) { ngTipPin = false; ngGlHide(); } });
  // refresh "now" value and curve while a slider moves under an open card
  document.addEventListener('input', () => { if (ngTip && !ngTip.hidden && ngTipFor && ngTipFor.isConnected) { const h = ngGlCard(ngTipFor); if (h) { const keep = ngTip.querySelector('.ng-tip-x'); ngTip.innerHTML = h + (keep ? '<button class="ng-tip-x" aria-label="Close">×</button>' : ''); const bx = ngTip.querySelector('.ng-tip-x'); if (bx) bx.onclick = () => { ngTipPin = false; ngGlHide(); }; } } });
  // canvas axes
  let axEl = null;
  document.addEventListener('pointermove', e => { const cv = e.target; if (!cv || cv.tagName !== 'CANVAS' || !cv._ngAx) { if (axEl) { axEl = null; if (!ngTipPin) ngGlHide(); } return; }
    const k = ngGlAxisHit(cv, e.clientX, e.clientY); cv.style.cursor = k ? 'help' : '';
    if (k && (!axEl || axEl.dataset.g !== k)) { axEl = { dataset: { g: k }, getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY - 10, bottom: e.clientY + 10 }) }; if (!ngTipPin) ngGlShow(axEl, e.clientX, e.clientY); }
    else if (!k && axEl) { axEl = null; if (!ngTipPin) ngGlHide(); } });
  let q = false; const run = () => { q = false; try { ngGlScan(); } catch (err) { /* never break a page */ } };
  new MutationObserver(() => { if (!q) { q = true; setTimeout(run, 400); } }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== 'loading') run(); else addEventListener('DOMContentLoaded', run);
})();
})();
