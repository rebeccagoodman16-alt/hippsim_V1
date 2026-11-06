/* Extracted from Little Neural Guide modellab.js [137515:182593] — section: B. PLACE CELLS */
/* ======================================================================
   B. PLACE CELLS DURING NAVIGATION
   ====================================================================== */
xpages[1].lead = 'In the 1970s, O’Keefe and Dostrovsky found hippocampal cells that fire only when a rat is in one place. Here a simulated rat explores in real time while 40 CA1 cells fire. It runs, stops and hugs the walls. Theta comes and goes with running, and sharp-wave ripples replay paths while it rests. The parameters are matched to published rat data, and the realism check below lists what still differs.';
xpages[1].jumps = [['xp-behav', 'Behavioral tests'], ['xp-rec', 'Recording'], ['experiment', 'Live session'], ['xp-model', 'The model'], ['xp-real', 'Realism check'], ['code', 'Python']];
xpages[1].html = () => sec('xp-behav', '01 · Behavioral testing', 'How spatial memory is measured',
  table(['Task', 'What the animal does', 'What is measured', 'What it tells you'], [
    ['Morris water maze', 'Swims to find a hidden platform using room cues, over several days', 'Escape latency and path length; time in the target quadrant in a probe trial without the platform', 'Hippocampus-dependent spatial learning and memory'],
    ['Linear track / open field', 'Runs for food rewards while neurons are recorded', 'Spikes, position and head direction', 'Place fields, their stability across sessions, theta coding'],
    ['Y-maze spontaneous alternation', 'Explores three arms freely', 'Percentage of alternations among arm entries', 'Spatial working memory'],
    ['Novel object location', 'Explores objects, one of which has moved', 'Extra exploration of the moved object', 'Memory for where things are'],
  ]) + '<p class="muted">Many AD mouse models (e.g. APP/PS1, Tg2576) show deficits in these tasks, and some show less precise or less stable place fields (e.g. Cacucci et al., 2008). The “AD-like degradation” control below is an illustrative model of such changes, not a fit to a specific dataset.</p>')
  + sec('xp-rec', '02 · Recording place cells', 'From electrodes to rate maps',
    steps([
      ['Implant.', 'Tetrodes (four twisted wires) or silicon probes are lowered into dorsal CA1. Each picks up spikes from several nearby neurons. Calcium imaging through a lens or window is an alternative that sees hundreds of cells at once.'],
      ['Track the animal.', 'A camera records position and head direction, typically at 30–50 frames per second.'],
      ['Spike sorting.', 'Spikes are assigned to individual neurons by their waveform shapes across the four wires.'],
      ['Speed filter.', 'Only periods when the animal moves faster than about 2–5 cm/s count toward rate maps. When it stops, the hippocampus switches state (sharp-wave ripples instead of theta) and spikes no longer simply mean “I am here”.'],
      ['Rate map.', 'Divide the arena into bins (e.g. 5 × 5 cm). For each cell, rate = spikes in a bin ÷ time spent in that bin, then smooth.'],
      ['Spatial information.', 'Skaggs’ measure, \\(I=\\sum_i p_i\\frac{\\lambda_i}{\\bar\\lambda}\\log_2\\frac{\\lambda_i}{\\bar\\lambda}\\) bits/spike, where \\(p_i\\) is occupancy probability and \\(\\lambda_i\\) the rate in bin i. Higher means each spike says more about location.'],
      ['Theta and phase.', 'The local field potential (LFP) oscillates at 6–10 Hz (theta) during running. As the rat crosses a field, the cell fires at progressively earlier theta phases: phase precession (O’Keefe & Recce, 1993).'],
    ]))
  + `<section class="lesson-section lab" id="experiment"><p class="eyebrow">03 · Live session</p><h2>Watch the rat, the cells and the decoder</h2>
    <div class="ml-tour" id="ml-tour"></div>
    <div class="lab-layout ml-layout"><div class="lab-controls"><h3>Session settings</h3>
      <div class="control-row"><label>Environment</label><div class="lab-actions ml-seg"><button class="secondary" data-env="open" aria-pressed="true">Open field</button><button class="secondary" data-env="track" aria-pressed="false">Linear track</button></div></div>
      ${ctl('pcSpeed', 'Playback speed', 0.25, 4, 0.25, 1, '1× is real time. Slow it down to see single theta cycles and replay.')}
      ${ctl('pcSigma', 'Place field size σ', 5, 20, 1, 10, 'cm. Field diameter is about 3σ, so 10 cm gives roughly 30 cm fields, typical for a 1 m box.')}
      ${ctl('pcAD', 'AD-like degradation', 0, 1, 0.05, 0, 'Broader, weaker, drifting fields, looser theta timing, fewer ripples (illustrative).')}
      ${ctl('pcCell', 'Highlighted cell', 1, 40, 1, 1)}
      <label class="compare-label"><input type="checkbox" id="pcAll"> Show spikes from all cells</label>
      <div class="lab-actions"><button class="primary" id="pcGo">Pause</button><button class="secondary" id="pcSkip">Skip ahead 60 s</button><button class="secondary" id="pcClear">Clear maps</button></div></div>
      <div class="ml-figs">
        ${fig('pcArena', 'ml-sq', 'Arena: path, spikes and decoded position', key([C.ink, 'path'], [C.plum, 'spike of highlighted cell'], [C.hot, 'decoded position / replay']), 'grey line is the recent path. Plum dots mark where the highlighted cell fired while running. The pink ring is the decoder’s estimate from spikes alone. After a ripple, a dashed pink arrow shows the path the replay decoded to.')}
        ${fig('pcMaps', 'ml-sq', 'Rate maps (first 9 cells)', key([C.plum, 'high rate'], [C.paper, 'zero']), 'each square is one cell’s firing rate across the arena, built only from running periods. Some cells stay silent in this environment, as in real recordings. Highlighted cell is outlined.')}
        ${fig('pcSpd', 'ml-h120 wide', 'Running speed and brain state (last 20 s)', key([C.ink, 'speed (cm/s)'], [C.tan, 'immobile'], [C.hot, 'sharp-wave ripple']), 'the rat alternates between running bouts and stops. Tan bands are immobility (below the 3 cm/s speed filter), pink ticks are ripples.')}
        ${fig('pcRaster', 'ml-h200', 'LFP and raster (last 1.5 s)', key([C.muted, 'LFP'], [C.ink, 'spikes, sorted by field'], [C.hot, 'ripple']), 'cells sorted by field position. While running, the LFP shows theta and short sequences sweep through each cycle. While still, theta fades and ripples carry fast compressed sequences: replay.')}
        ${fig('pcPhase', 'ml-h200', 'Phase precession of highlighted cell', key([C.plum, 'spike']), 'horizontal: progress through the field (entering → leaving). Vertical: theta phase, shown twice. A downward slope is phase precession. Clearest on the linear track.')}
      </div></div>
    <div class="lab-result" id="ml-result" role="status" aria-live="polite"></div>
    <div class="box pink ml-explain"><p class="eyebrow">What’s happening now</p><div id="ml-explain-body"></div></div></section>`
  + `<section class="lesson-section"><p class="nl-explain"><b>How do these fields form?</b> Here every cell already has a field. On the <a href="/biology/research-place-fields/">place field formation page</a> a mouse runs laps on a treadmill belt and a single dendritic plateau potential creates a field in a biophysical CA1 cell through behavioural-timescale plasticity (Bittner et al. 2017), with its spikes split into bursts and single spikes.</p></section>`
  + sec('xp-model', '04 · The model behind it', 'How the simulated rat, cells and decoder work',
    `<div class="math-scroll ml-math">\\[\\lambda_i(\\mathbf x,v,t)=\\underbrace{\\lambda^{max}_i\\,e^{-\\lVert\\mathbf x-\\mathbf c_i\\rVert^2/2\\sigma_i^2}}_{\\text{place field}}\\cdot\\underbrace{g(v)}_{\\text{speed}}\\cdot\\underbrace{\\frac{e^{\\kappa(\\cos(\\theta(t)-\\phi_i)-1)}}{e^{-\\kappa}I_0(\\kappa)}}_{\\text{theta phase}},\\quad \\phi_i=\\pi(1-d_i)\\]
    \\[f_\\theta=7+0.025\\,v\\ \\text{Hz},\\qquad P(\\mathbf x\\mid\\mathbf n)\\propto\\prod_i \\lambda_i(\\mathbf x)^{n_i}e^{-\\tau\\lambda_i(\\mathbf x)}\\]</div>`
    + steps([
      ['Behavior.', 'In the open field the rat alternates running bouts (median ≈ 16 cm/s, a few seconds long, speed fluctuating smoothly) with stops of 0.5–4 s. Near walls it turns to run along them (thigmotaxis), and in the centre it drifts back toward an edge. On the linear track it accelerates to 40–80 cm/s mid-track, slows near the ends and pauses 1.5–4 s to “eat” before turning around.'],
      ['Place fields.', 'Each cell has its own peak rate (log-normal, median 12 Hz, range ≈ 4–35 Hz) and field width (σ × 0.75–1.25). About 1 in 5 cells is silent in this environment and about 1 in 7 has two fields. On the track most fields are directional, firing on runs one way only.'],
      ['Speed and theta.', 'Rates rise with running speed, g(v) = min(1.5, 0.45 + v/30), and are low during stillness. Theta frequency and amplitude rise with speed. Firing locks to a preferred theta phase φ that moves earlier as the rat goes through the field (d from −1 entering to +1 leaving), which produces phase precession.'],
      ['Spikes.', 'Each millisecond, a cell spikes with probability λ·Δt, with a 2 ms refractory period (an inhomogeneous Poisson process with dead time).'],
      ['Sharp-wave ripples and replay.', 'During stops longer than 0.4 s, ripples occur at about 0.6 per second, each 80–140 ms long, with a 180 Hz oscillation in the LFP. In each one, cells whose fields lie along a path starting at the rat fire in order, compressed about 20×. Early in a stop the replay is labeled reverse (the run just finished), later forward (the next run), following Diba & Buzsáki (2007).'],
      ['Decoding.', 'While running, every 100 ms the decoder takes spike counts n<sub>i</sub> from the last 250 ms and finds the most likely position, given each cell’s field as measured at the start (Bayesian decoding with a flat prior; Zhang et al., 1998). After each ripple it decodes the ripple in 20 ms bins, which shows the replayed trajectory.'],
      ['Degradation.', 'The AD-like slider widens fields, lowers peak rates, adds out-of-field firing, weakens theta locking, makes field centres drift, lowers ripple rate and scrambles replay order. The decoder keeps the original fields, so drift shows up as decoding error: an unstable map.'],
    ]))
  + sec('xp-real', '05 · Realism check', 'How close is this rat to a real one?',
    '<p>Every number in the simulation was set to fall inside the range reported for rat dorsal CA1. The table compares them. Use it as a template: a model is only as believable as its checklist of matched and unmatched features.</p>'
    + table(['Feature', 'This model', 'Typical rat data', 'Source'], [
      ['Playback', '1× real time by default; spikes generated every 1 ms', '—', '—'],
      ['Open-field running speed', 'Bouts with median ≈ 16 cm/s (range 6–40), plus frequent stops', 'Roughly 10–30 cm/s while moving; a sizeable fraction of time slow or still', 'Typical open-field tracking data'],
      ['Linear-track speed', 'Peaks of 40–80 cm/s mid-track, slowing at the ends, 1.5–4 s reward pauses', 'Peak speeds of tens of cm/s, slowing near reward sites', 'Typical linear-track studies'],
      ['Wall-following', 'Steers parallel to walls; drifts back from the centre', 'Rodents prefer the periphery of an open field (thigmotaxis)', 'Standard open-field behavior'],
      ['Field size', 'σ ≈ 10 cm (diameter ≈ 30 cm), varies by cell', '≈ 20–50 cm across in a 1 m box; scales with the environment', 'Muller, Kubie & Ranck 1987; Wilson & McNaughton 1993'],
      ['Peak / out-of-field rate', 'Peak 4–35 Hz (median 12 Hz); 0.1 Hz outside', 'Peaks of ≈ 5–30 Hz; mean rates well below 1–2 Hz', 'O’Keefe 1976; Wilson & McNaughton 1993'],
      ['Active fraction', '≈ 80% of the 40 have fields; ≈ 15% have two', 'Only ≈ 30–50% of pyramidal cells have a field in any one environment, but silent cells rarely show up on tetrodes, so recorded samples look like this one; multiple fields are common in large spaces', 'Thompson & Best 1989; Wilson & McNaughton 1993'],
      ['Directionality', 'Most track fields fire in one running direction', 'Fields on linear tracks are usually directional; open-field fields are mostly not', 'McNaughton, Barnes & O’Keefe 1983; Muller et al. 1994'],
      ['Speed modulation', 'Rate gain rises with speed; little place firing when still', 'In-field rates increase with running speed', 'McNaughton, Barnes & O’Keefe 1983'],
      ['Theta', '7–8.5 Hz, rising with speed; absent when still', '6–10 Hz during movement; frequency and amplitude increase with speed', 'Vanderwolf 1969; Buzsáki 2002'],
      ['Phase precession', 'Up to 360° across a field', 'Up to ≈ 360°, earlier phases as the rat moves through', 'O’Keefe & Recce 1993; Skaggs et al. 1996'],
      ['Sharp-wave ripples', '180 Hz, 80–140 ms, ≈ 0.6/s during stops', '≈ 150–250 Hz, ≈ 50–150 ms, during immobility and slow-wave sleep', 'Buzsáki et al. 1992; Buzsáki 2015'],
      ['Replay', 'Sequences from the rat’s position, ≈ 20× compressed, reverse then forward', 'Forward and reverse sequences, ≈ 10–20× compressed', 'Foster & Wilson 2006; Diba & Buzsáki 2007'],
      ['Decoding error', 'About 5–8 cm on the track and 10–15 cm in the open field (40 cells, 250 ms windows)', 'Centimetre-scale accuracy with tens of simultaneously recorded cells', 'Wilson & McNaughton 1993; Zhang et al. 1998'],
    ])
    + '<h3>What this model still leaves out</h3>'
    + steps([
      ['Fields are given, not learned.', 'Real fields form within a few laps, shift backward with experience (Mehta et al., 1997) and remap in new environments. Here they are fixed Gaussians.'],
      ['No upstream circuit.', 'No grid, border or head-direction cells, and no CA3 or entorhinal input. The place code is put in by hand, not computed.'],
      ['No interneurons or gamma.', 'Theta phase locking is imposed. Real theta comes from medial septum and interneuron circuits, with nested gamma oscillations.'],
      ['Replay is a template.', 'Ripple sequences are built from the known fields, not produced by network dynamics. They show what replay looks like, not why it happens.'],
      ['Simplified spiking.', 'No complex-spike bursts, no adaptation, no cell-to-cell correlations beyond shared position and theta.'],
      ['Rat, not mouse.', 'Mouse place fields are smaller in absolute size and often less stable across days (Kentros et al., 2004). Most AD models are mice, so compare with care.'],
    ]))
  + `<section class="lesson-section" id="code"><p class="eyebrow">06 · Do it in Python</p><h2>Speed-filtered rate maps, spatial information and decoding with NumPy</h2><div class="code-toolbar"><span>Python 3 · numpy</span><button class="secondary" id="ml-copy">Copy Python</button></div><p id="ml-copy-status" class="muted" role="status"></p><pre><code id="ml-code"></code></pre></section>
  <section class="lesson-section" id="ml-related"><p class="eyebrow">07 · Connect to the guide</p><h2>Related lessons</h2><div class="button-cloud"><a class="secondary" href="/topics/learning/recurrence-attractors/">Recurrence & attractors</a><a class="secondary" href="/topics/learning/readouts-evaluation/">Readouts & evaluation</a><a class="secondary" href="/ml/rnn-dynamics/">RNNs as dynamical systems</a><a class="secondary" href="/topics/mean-field/population-activity/">From spikes to a population</a><a class="secondary" href="/experiments/ca1-circuit/">The CA1 circuit</a></div></section>`;
let pcCtl = null;
xpages[1].tour = [
  { title: 'One place cell, in real time', apply: () => pcCtl && pcCtl.set({ env: 'open', all: false, ad: 0, sigma: 10, cell: 1, speed: 1, clear: true }), text: 'This runs at real time. Watch the plum dots: the highlighted cell fires only when the rat runs through one region, its place field. Elsewhere it is nearly silent. Press <b>Skip ahead 60 s</b> if you want the maps to fill in faster.', look: 'plum dots clustering in one patch of the arena as the rat crosses it.' },
  { title: 'Running, stopping, hugging walls', apply: () => pcCtl && pcCtl.set({ all: false }), text: 'Real rats do not glide at constant speed. This one runs in bouts, stops to look around, and prefers the walls. The speed trace shows the bouts, and tan bands mark stillness, which the speed filter removes from the rate maps.', look: 'the speed trace and how often the path follows the walls.' },
  { title: 'Many cells tile the space', apply: () => pcCtl && pcCtl.set({ all: true }), text: 'Show all 40 cells. Most have a field somewhere, a few are silent in this box, and some have two fields. Together they cover the arena: at any moment, the set of active cells says where the rat is.', look: 'differently coloured dot clusters across the arena, and rate maps filling in.' },
  { title: 'Decoding position', apply: () => pcCtl && pcCtl.set({ all: false }), text: 'The pink ring is the decoder’s estimate, made only from spike counts in the last 250 ms of running. It usually follows the rat within 5–15 cm, better on the track than in the open field. This is how “the brain’s map” is read out in real experiments.', look: 'the pink ring tracking the rat, and the decoding error in the readout.' },
  { title: 'Theta and phase precession', apply: () => pcCtl && pcCtl.set({ env: 'track', clear: true, speed: 0.5 }), text: 'On the linear track the rat runs fast through fields, and theta is strong. As it crosses a field, the cell fires at earlier and earlier theta phases. At half speed you can see sequences sweep through each theta cycle in the raster.', look: 'the downward slope in the phase plot after a few laps.' },
  { title: 'Ripples and replay', apply: () => pcCtl && pcCtl.set({ env: 'track', speed: 0.25 }), text: 'When the rat stops at a reward site, theta fades and sharp-wave ripples appear (pink in the LFP). In each ripple, cells fire in the order of their fields, about 20× faster than the run: replay. The dashed arrow in the arena is the path decoded from that ripple.', look: 'pink ripple bands in the raster with a diagonal streak of spikes, and the dashed arrow after each one.' },
  { title: 'An AD-like degraded map', apply: () => pcCtl && pcCtl.set({ env: 'open', ad: 0.8, clear: true, speed: 1 }), text: 'Fields get broader and weaker, theta timing gets sloppier, field centres drift, and ripples become rarer and less ordered. Spatial information drops and decoding error rises. This mirrors, qualitatively, reports of less stable place cells and altered ripples in some AD mouse models.', look: 'decoding error and spatial information in the readout compared with before.' },
];
xpages[1].init = () => {
  const N = 40, B = 20, bin = 100 / B, rnd = mulberry(7), dt = 1;   // arena in cm, time in ms
  const V_RUN = 3;                                                     // cm/s speed filter, as in standard analyses
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));             // angle to (−π, π]
  const S = { env: 'open', x: 50, y: 50, hd: 0.3, v: 0, t: 0, acc: 0, running: true,
    state: 'run', left: 3000, vT: 16, dir: 1, vMax: 55, stillFor: 0, pauseLen: 1,
    theta: 0, amp: 1, path: [], spikes: [], recent: [], phase: [], dec: null, decErr: [], lastDec: 0,
    lfp: [], spd: [], swr: null, swrTimes: [], nSWR: 0, replay: null, runT: 0, stillT: 0, lastReplay: '' };

  /* ---- cells: per-cell peak rate and width, some silent, some with two fields, directional on the track ---- */
  const base = [];
  for (let i = 0; i < N; i++) {
    const silent = i > 0 && rnd() < 0.2;
    const f = [[8 + rnd() * 84, 8 + rnd() * 84]]; if (!silent && rnd() < 0.15) f.push([8 + rnd() * 84, 8 + rnd() * 84]);
    base.push({ f, tx: clamp(4 + (i + 0.5) / N * 92 + 2 * gauss(rnd), 4, 96), tdir: rnd() < 0.25 ? 0 : (rnd() < 0.5 ? 1 : -1),
      peak: silent ? 0 : clamp(12 * Math.exp(0.45 * gauss(rnd)), 4, 35), ss: 0.75 + 0.5 * rnd() });
  }
  base[0].tdir = 0;                                                    // highlighted cell fires both ways on the track
  const copy = b => ({ ...b, f: b.f.map(q => q.slice()), last: -10 });
  let cells = base.map(copy);
  const colors = Array.from({ length: N }, (_, i) => `hsl(${(i * 137.5) % 360} 55% 42%)`);
  const occ = new Float64Array(B * B), cnt = Array.from({ length: N }, () => new Float64Array(B * B));
  const prm = () => ({ sigma: +el('pcSigma').value, ad: +el('pcAD').value, speed: +el('pcSpeed').value, cell: +el('pcCell').value - 1, all: el('pcAll').checked });
  const snapshot = () => cells.forEach(c => { c.f0 = c.f.map(q => q.slice()); c.tx0 = c.tx; });
  snapshot();

  /** Place-field rate (Hz) without speed or theta, and the nearest field centre. stored=true uses fields as first measured. */
  const placeRate = (c, x, y, p, stored) => {
    const floor = 0.1 + 0.8 * p.ad;
    if (!c.peak) return { r: 0.05 + 0.3 * p.ad, cx: 50, cy: 50 };
    const s = p.sigma * c.ss * (1 + 0.7 * p.ad), F = S.env === 'track' ? [[stored ? c.tx0 : c.tx, 50]] : (stored ? c.f0 : c.f);
    let best = 0, cx = F[0][0], cy = F[0][1];
    for (const [fx, fy] of F) { const g = Math.exp(-((x - fx) ** 2 + (y - fy) ** 2) / (2 * s * s)); if (g > best) { best = g; cx = fx; cy = fy; } }
    const dirGain = S.env === 'track' && c.tdir && c.tdir !== S.dir ? 0.04 : 1;
    return { r: c.peak * (1 - 0.4 * p.ad) * best * dirGain + floor, cx, cy, s };
  };
  const clear = () => { occ.fill(0); cnt.forEach(a => a.fill(0)); S.spikes = []; S.phase = []; S.decErr = []; cells = base.map(copy); snapshot(); S.runT = S.stillT = 0; S.nSWR = 0; S.swrTimes = []; S.replay = null; };

  /* ---- behaviour ---- */
  const stepOpen = () => {
    S.left -= dt;
    if (S.left <= 0) {
      if (S.state === 'run') { S.state = 'pause'; S.pauseLen = S.left = 500 + 3500 * rnd() ** 1.6; }
      else { S.state = 'run'; S.left = 1500 - 3500 * Math.log(rnd() + 1e-9); S.vT = clamp(16 * Math.exp(0.4 * gauss(rnd)), 6, 40); }
    }
    const target = S.state === 'run' ? S.vT : 0;                       // Ornstein–Uhlenbeck speed around the bout's target
    S.vr = Math.max(0, (S.vr || 0) + (target - (S.vr || 0)) * dt / 350 + (S.state === 'run' ? 0.28 : 0.02) * gauss(rnd) * Math.sqrt(dt));
    S.v += (S.vr - S.v) * dt / 200;                                    // body inertia smooths the speed
    S.hd += (S.state === 'run' ? 0.035 : 0.06) * gauss(rnd);          // pauses: head scanning
    // thigmotaxis: steer along the nearest wall when close, drift toward a wall when in the open centre
    const dW = [S.x, 100 - S.x, S.y, 100 - S.y], k = dW.indexOf(Math.min(...dW)), dmin = dW[k];
    const outward = [Math.PI, 0, -Math.PI / 2, Math.PI / 2][k];
    if (dmin < 15) { const t1 = outward + Math.PI / 2, t2 = outward - Math.PI / 2, tg = Math.abs(wrap(t1 - S.hd)) < Math.abs(wrap(t2 - S.hd)) ? t1 : t2; S.hd += 0.004 * (1 - dmin / 15) * wrap(tg - S.hd); }
    else if (dmin > 25) S.hd += 0.0012 * wrap(outward - S.hd);
    const nx = S.x + Math.cos(S.hd) * S.v * dt / 1000, ny = S.y + Math.sin(S.hd) * S.v * dt / 1000;
    if (nx < 5 || nx > 95 || ny < 5 || ny > 95) S.hd += 0.15 * wrap(outward + Math.PI - S.hd) + 0.03 * gauss(rnd); else { S.x = nx; S.y = ny; }
  };
  const stepTrack = () => {
    S.y = 50;
    if (S.state === 'pause') { S.v = Math.max(0, S.v - 0.2); S.left -= dt; if (S.left <= 0) { S.state = 'run'; S.vMax = clamp(55 + 10 * gauss(rnd), 38, 80); } return; }
    const prog = S.dir > 0 ? (S.x - 4) / 92 : (96 - S.x) / 92;
    const vt = 6 + (S.vMax - 6) * Math.pow(Math.sin(Math.PI * clamp(prog, 0.03, 0.97)), 0.7);   // accelerate, cruise, slow for the reward
    S.v += (vt - S.v) * dt / 150; S.x += S.dir * S.v * dt / 1000; S.hd = S.dir > 0 ? 0 : Math.PI;
    if (S.x >= 96 || S.x <= 4) { S.x = clamp(S.x, 4, 96); S.dir = -S.dir; S.state = 'pause'; S.pauseLen = S.left = 1500 + 2500 * rnd(); }
  };

  /* ---- sharp-wave ripple: compressed sequence of cells whose fields lie along a path starting at the rat ---- */
  const startRipple = p => {
    const dur = 80 + 60 * rnd(), early = S.left > S.pauseLen / 2, seq = [];
    if (S.env === 'track') {                                            // sweep away from the rat along the track
      const order = cells.map((c, i) => [i, c]).filter(([, c]) => c.peak).sort((a, b) => Math.abs(a[1].tx - S.x) - Math.abs(b[1].tx - S.x));
      order.forEach(([i]) => seq.push(i));
    } else {                                                            // cells along the last few seconds of path, starting at the rat
      const pts = S.path.slice(-90).reverse(), seen = new Set();
      for (const [x, y] of pts) { let bi = -1, bv = 0; cells.forEach((c, i) => { const v = placeRate(c, x, y, p).r; if (c.peak && v > bv) { bv = v; bi = i; } }); if (bi >= 0 && bv > 3 && !seen.has(bi)) { seen.add(bi); seq.push(bi); } }
    }
    for (let k = 0; k < seq.length - 1; k++) if (rnd() < 0.5 * p.ad) { const t = seq[k]; seq[k] = seq[k + 1]; seq[k + 1] = t; }   // degraded order
    const L = Math.min(seq.length, 14), ev = [];
    for (let k = 0; k < L; k++) { const tk = S.t + 5 + (k + 0.5) / L * (dur - 10); const n = 1 + (rnd() < 0.5 ? 1 : 0); for (let m = 0; m < n; m++) ev.push([tk + 3 * gauss(rnd), seq[k]]); }
    ev.sort((a, b) => a[0] - b[0]);
    S.swr = { t0: S.t, t1: S.t + dur, ev, k: 0, kind: early ? 'reverse' : 'forward' }; S.nSWR++; S.swrTimes.push([S.t, S.t + dur]);
  };
  const endRipple = p => {                                              // decode the ripple in 20 ms bins
    const r = S.swr, pts = [];
    for (let t = r.t0; t < r.t1 - 5; t += 20) {
      const n = new Float64Array(N); r.ev.forEach(([te, i]) => { if (te >= t && te < t + 20) n[i]++; });
      if (n.reduce((a, b) => a + b) < 1) continue; pts.push(decodeCounts(n, 0.02, p, 2.5));
    }
    if (pts.length >= 2) S.replay = { pts, until: S.t + 2500, kind: r.kind };
    S.lastReplay = r.kind; S.swr = null;
  };

  /** Advance the behaving rat and its cells by ms milliseconds. */
  const advance = (ms, fast) => {
    const p = prm(), kappa = 1.5 * (1 - 0.6 * p.ad), norm = Math.exp(-kappa) * besselI0(kappa);
    for (let k = 0; k < ms; k++) {
      S.t += dt;
      S.env === 'open' ? stepOpen() : stepTrack();
      const moving = S.v > V_RUN;
      S.stillFor = moving ? 0 : S.stillFor + dt; moving ? S.runT += dt : S.stillT += dt;
      if (p.ad > 0 && S.t % 50 === 0) cells.forEach(c => { c.f.forEach(q => { q[0] = clamp(q[0] + 0.25 * p.ad * gauss(rnd), 5, 95); q[1] = clamp(q[1] + 0.25 * p.ad * gauss(rnd), 5, 95); }); c.tx = clamp(c.tx + 0.25 * p.ad * gauss(rnd), 4, 96); });
      // theta: frequency and amplitude grow with speed; fades when still
      const fth = 7 + 0.025 * Math.min(S.v, 60); S.theta += 2 * Math.PI * fth * dt / 1000;
      S.amp += ((moving ? Math.min(1, 0.4 + S.v / 30) : 0.12) - S.amp) * dt / 300;
      const th = S.theta % (2 * Math.PI);
      // ripples during stillness
      if (!S.swr && S.stillFor > 400 && rnd() < 0.6 * (1 - 0.5 * p.ad) * dt / 1000) startRipple(p);
      const bi = Math.min(B - 1, S.x / bin | 0) + B * Math.min(B - 1, S.y / bin | 0);
      if (moving) occ[bi] += dt / 1000;                                 // speed-filtered occupancy
      const hx = Math.cos(S.hd), hy = Math.sin(S.hd), gv = moving ? Math.min(1.5, 0.45 + S.v / 30) : 0.2;
      for (let i = 0; i < N; i++) {
        const c = cells[i]; if (S.t - c.last < 2) continue;              // 2 ms refractory period
        const pr = placeRate(c, S.x, S.y, p); let lam = pr.r * gv;
        if (moving) { const d = clamp(((S.x - pr.cx) * hx + (S.y - pr.cy) * hy) / (2.5 * pr.s || 1), -1, 1), phi = Math.PI * (1 - d); lam *= Math.exp(kappa * (Math.cos(th - phi) - 1)) / norm; c.d = d; } else c.d = null;
        if (rnd() < lam * dt / 1000) {
          c.last = S.t; S.recent.push([S.t, i]);
          if (moving) { cnt[i][bi]++; if (i === p.cell || p.all) S.spikes.push([S.x, S.y, i, S.t]); }
          if (i === p.cell && c.d !== null && Math.abs(c.d) < 1) S.phase.push([c.d, th]);
        }
      }
      if (S.swr) { const r = S.swr; while (r.k < r.ev.length && r.ev[r.k][0] <= S.t) { const i = r.ev[r.k][1]; S.recent.push([S.t, i]); cells[i].last = S.t; r.k++; } if (S.t >= r.t1) endRipple(p); }
      if (!fast) {
        const rip = S.swr ? Math.sin(Math.PI * (S.t - S.swr.t0) / (S.swr.t1 - S.swr.t0)) * 0.9 * Math.sin(2 * Math.PI * 180 * S.t / 1000) : 0;
        S.lfp.push([S.t, S.amp * Math.cos(th) + rip + 0.12 * gauss(rnd), !!S.swr]);
      }
      if (S.t % 40 === 0) S.path.push([S.x, S.y]);
      if (S.t % 50 === 0) S.spd.push([S.t, S.v, !moving]);
      if (moving && S.t - S.lastDec >= 100) { S.lastDec = S.t; decode(p); }
    }
    while (S.recent.length && S.recent[0][0] < S.t - 1500) S.recent.shift();
    while (S.lfp.length && S.lfp[0][0] < S.t - 1500) S.lfp.shift();
    while (S.spd.length && S.spd[0][0] < S.t - 20000) S.spd.shift();
    while (S.swrTimes.length && S.swrTimes[0][1] < S.t - 20000) S.swrTimes.shift();
    if (S.path.length > 150) S.path.splice(0, S.path.length - 150);
    if (S.spikes.length > 1500) S.spikes.splice(0, S.spikes.length - 1500);
    if (S.phase.length > 600) S.phase.splice(0, S.phase.length - 600);
    if (S.replay && S.t > S.replay.until) S.replay = null;
  };
  /** Most likely position for spike counts n in a window of tau seconds (flat prior), on a grid of `step` cm. */
  const decodeCounts = (n, tau, p, step) => {
    let best = -Infinity, bx = 0, by = 0; const ys = S.env === 'track' ? [50] : null;
    for (let x = step / 2; x < 100; x += step) for (const y of (ys || Array.from({ length: 100 / step }, (_, k) => step / 2 + k * step))) {
      let ll = 0; for (let i = 0; i < N; i++) { const l = placeRate(cells[i], x, y, p, true).r * 1.05; ll += n[i] * Math.log(l) - tau * l; }
      if (ll > best) { best = ll; bx = x; by = y; }
    }
    return [bx, by];
  };
  const decode = p => {
    const n = new Float64Array(N); for (const [t, i] of S.recent) if (t > S.t - 250) n[i]++;
    S.dec = decodeCounts(n, 0.25, p, 2.5); S.decErr.push(Math.hypot(S.dec[0] - S.x, S.dec[1] - S.y)); if (S.decErr.length > 100) S.decErr.shift();
  };
  const skaggs = i => { let T = 0, Sp = 0; for (let b = 0; b < B * B; b++) { T += occ[b]; Sp += cnt[i][b]; } if (!T || !Sp) return NaN; const mean = Sp / T; let I = 0; for (let b = 0; b < B * B; b++) { if (!occ[b] || !cnt[i][b]) continue; const r = cnt[i][b] / occ[b]; I += (occ[b] / T) * (r / mean) * Math.log2(r / mean); } return I; };

  function drawRat(ctx, X, Y, s) {
    const x = X(S.x), y = Y(S.y), a = -S.hd, L = s * 18;              // ≈ 18 cm head + body, drawn to scale
    const still = S.v < V_RUN, sway = still ? Math.sin(S.t / 260) * 0.25 : 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = '#b89a8c'; ctx.lineWidth = Math.max(1.2, s * 0.8); ctx.beginPath(); ctx.moveTo(-L * 0.45, 0);
    ctx.bezierCurveTo(-L * 0.9, L * 0.15, -L * 1.1, -L * 0.25, -L * 1.4, Math.sin(S.t / (still ? 500 : 180)) * L * 0.15); ctx.stroke();   // tail
    ctx.fillStyle = '#8c7664'; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.26, 0, 0, 7); ctx.fill();                                   // body
    ctx.rotate(sway); ctx.beginPath(); ctx.ellipse(L * 0.48, 0, L * 0.22, L * 0.15, 0, 0, 7); ctx.fill();                                    // head scans when still
    ctx.fillStyle = '#e7b8c4'; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(L * 0.38, k * L * 0.15, L * 0.08, 0, 7); ctx.fill(); });
    ctx.beginPath(); ctx.arc(L * 0.7, 0, L * 0.045, 0, 7); ctx.fill();
    ctx.fillStyle = C.ink; [-1, 1].forEach(k => { ctx.beginPath(); ctx.arc(L * 0.55, k * L * 0.07, L * 0.025, 0, 7); ctx.fill(); });
    ctx.restore();
  }
  const draw = () => {
    const p = prm();
    let { ctx, w, h } = prep(el('pcArena')); const pad = 10, sc = (Math.min(w, h) - 2 * pad) / 100, X = x => pad + x * sc, Y = y => pad + (100 - y) * sc;
    ctx.fillStyle = C.paper; ctx.fillRect(X(0), Y(100), 100 * sc, 100 * sc); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    if (S.env === 'track') { ctx.fillStyle = C.tan; ctx.fillRect(X(0), Y(56), 100 * sc, 12 * sc); ctx.strokeRect(X(0), Y(56), 100 * sc, 12 * sc); ctx.fillStyle = C.hot; [2, 98].forEach(x => { ctx.beginPath(); ctx.arc(X(x), Y(50), 3, 0, 7); ctx.fill(); }); }
    else ctx.strokeRect(X(0), Y(100), 100 * sc, 100 * sc);
    S.spikes.forEach(([x, y, i, t]) => { ctx.globalAlpha = Math.max(0.25, 1 - (S.t - t) / 120000); ctx.fillStyle = p.all ? colors[i] : C.plum; ctx.beginPath(); ctx.arc(X(x), Y(y), p.all ? 2 : 2.6, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.2; ctx.beginPath(); S.path.forEach(([x, y], k) => k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke();
    if (S.replay) {                                                     // decoded replay trajectory
      const P = S.replay.pts, yo = S.env === 'track' ? 13 : 0; ctx.strokeStyle = C.hot; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath();
      P.forEach(([x, y], k) => k ? ctx.lineTo(X(x), Y(y + yo)) : ctx.moveTo(X(x), Y(y + yo))); ctx.stroke(); ctx.setLineDash([]);
      const [x1, y1] = P[P.length - 1], [x0, y0] = P[P.length - 2], ang = Math.atan2(-(y1 - y0), x1 - x0);
      ctx.fillStyle = C.hot; ctx.save(); ctx.translate(X(x1), Y(y1 + yo)); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.fill(); ctx.restore();
      ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(S.replay.kind + ' replay', X(P[0][0]) + 6, Y(P[0][1] + yo) - 6);
    }
    drawRat(ctx, X, Y, sc);
    if (S.dec && S.v > V_RUN) { ctx.strokeStyle = C.hot; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(S.dec[0]), Y(S.dec[1]), 7, 0, 7); ctx.stroke(); }
    // rate maps (3x3)
    ({ ctx, w, h } = prep(el('pcMaps'))); const g = 3, cell = Math.min(w, h) / g, cs = (cell - 8) / B;
    for (let k = 0; k < 9; k++) {
      const ox = (k % g) * cell + 4, oy = (k / g | 0) * cell + 4; let mx = 0; const rm = new Float64Array(B * B);
      for (let b = 0; b < B * B; b++) { rm[b] = occ[b] > 0.05 ? cnt[k][b] / occ[b] : NaN; if (rm[b] > mx) mx = rm[b]; }
      for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) { const v = rm[bx + B * by]; if (S.env === 'track' && Math.abs(by * bin + bin / 2 - 50) > 6) continue;
        ctx.fillStyle = isNaN(v) ? '#efe6dc' : `rgba(166,41,98,${Math.min(1, v / Math.max(mx, 1))})`; ctx.fillRect(ox + bx * cs, oy + (B - 1 - by) * cs, cs + .5, cs + .5); }
      ctx.strokeStyle = k === p.cell ? C.ink : C.grid; ctx.lineWidth = k === p.cell ? 2.5 : 1; ctx.strokeRect(ox, oy, B * cs, B * cs);
      ctx.fillStyle = C.ink; ctx.font = '10px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`#${k + 1} · ${mx.toFixed(0)} Hz${cells[k].peak ? '' : ' · silent'}`, ox + 3, oy + 11);
    }
    // speed + state
    let a = axes(el('pcSpd'), { xlim: [-20, 0], ylim: [0, S.env === 'track' ? 90 : 45], xlabel: 'time (s)', ylabel: 'cm/s' });
    a.ctx.fillStyle = 'rgba(231,213,190,.75)'; let s0 = null;
    S.spd.forEach(([t, , still], k) => { if (still && s0 === null) s0 = t; if ((!still || k === S.spd.length - 1) && s0 !== null) { a.ctx.fillRect(a.X((s0 - S.t) / 1000), a.T, a.X((t - S.t) / 1000) - a.X((s0 - S.t) / 1000), a.h - a.T - a.B); s0 = null; } });
    line(a, S.spd.map(q => (q[0] - S.t) / 1000), S.spd.map(q => q[1]), C.ink, 1.6);
    a.ctx.strokeStyle = C.hot; a.ctx.lineWidth = 2.5; S.swrTimes.forEach(([t0]) => { const x = a.X((t0 - S.t) / 1000); a.ctx.beginPath(); a.ctx.moveTo(x, a.T); a.ctx.lineTo(x, a.T + 14); a.ctx.stroke(); });
    a.done();
    // raster with LFP
    const order = [...Array(N).keys()].sort((u, v) => S.env === 'track' ? cells[u].tx - cells[v].tx : cells[u].f[0][0] - cells[v].f[0][0]), rank = new Array(N); order.forEach((c, r) => rank[c] = r);
    a = axes(el('pcRaster'), { xlim: [-1500, 0], ylim: [0, N + 9], xlabel: 'time (ms)', ylabel: 'cell', yticks: [0, 20, 40] });
    a.ctx.fillStyle = 'rgba(237,131,176,.18)'; S.swrTimes.forEach(([t0, t1]) => { if (t1 > S.t - 1500) a.ctx.fillRect(a.X(t0 - S.t), a.T, a.X(Math.min(t1, S.t) - S.t) - a.X(t0 - S.t), a.h - a.T - a.B); });
    for (let k = 1; k < S.lfp.length; k++) { const [t0, v0] = S.lfp[k - 1], [t1, v1, r] = S.lfp[k]; a.ctx.strokeStyle = r ? C.hot : C.muted; a.ctx.lineWidth = 1.1; a.ctx.beginPath(); a.ctx.moveTo(a.X(t0 - S.t), a.Y(N + 4.5 + 3 * v0)); a.ctx.lineTo(a.X(t1 - S.t), a.Y(N + 4.5 + 3 * v1)); a.ctx.stroke(); }
    for (const [t, i] of S.recent) { a.ctx.fillStyle = i === p.cell ? C.plum : C.ink; a.ctx.fillRect(a.X(t - S.t) - .7, a.Y(rank[i] + 1), 1.6, Math.max(1.5, a.Y(rank[i]) - a.Y(rank[i] + 1) - .5)); }
    a.done();
    a = axes(el('pcPhase'), { xlim: [-1, 1], ylim: [0, 720], xlabel: 'progress through field (enter → leave)', ylabel: 'phase (°)', yticks: [0, 180, 360, 540, 720] });
    a.ctx.fillStyle = C.plum; S.phase.forEach(([d, ph]) => { const deg = ph * 180 / Math.PI; [deg, deg + 360].forEach(v => { a.ctx.beginPath(); a.ctx.arc(a.X(d), a.Y(v), 2, 0, 7); a.ctx.fill(); }); }); a.done();
  };
  let lastInfo = -1e9;
  const report = () => {
    const p = prm(), err = S.decErr.length ? S.decErr.reduce((x, y) => x + y) / S.decErr.length : NaN, info = skaggs(p.cell);
    const infos = []; for (let i = 0; i < N; i++) { const v = skaggs(i); if (isFinite(v) && cells[i].peak) infos.push(v); } const meanInfo = infos.length ? infos.reduce((x, y) => x + y) / infos.length : NaN;
    const time = S.t / 1000, still = S.stillT / Math.max(1, S.stillT + S.runT), moving = S.v > V_RUN;
    const runSp = S.spd.filter(q => !q[2]), mSp = runSp.length ? runSp.reduce((s, q) => s + q[1], 0) / runSp.length : NaN;
    el('ml-result').innerHTML = `Session <b>${time.toFixed(0)} s</b> · ${moving ? `running <b>${S.v.toFixed(0)} cm/s</b> · theta <b>${(7 + 0.025 * Math.min(S.v, 60)).toFixed(1)} Hz</b>` : '<b>still</b>'} · immobile <b>${(still * 100).toFixed(0)}%</b> of time · ripples <b>${S.nSWR}</b> · decoding error <b>${isNaN(err) ? '—' : err.toFixed(1) + ' cm'}</b> · spatial info: cell #${p.cell + 1} <b>${isNaN(info) ? '—' : info.toFixed(2)}</b>, mean <b>${isNaN(meanInfo) ? '—' : meanInfo.toFixed(2)}</b> bits/spike`;
    if (S.t - lastInfo < 1000) return; lastInfo = S.t;
    const parts = [];
    parts.push(`<p>${S.env === 'track' ? `On the linear track the rat accelerates to about ${S.vMax.toFixed(0)} cm/s mid-track, slows for the reward and pauses at each end. Most cells fire on runs in one direction only.` : `In the open field the rat runs in bouts (recent mean ${isNaN(mSp) ? '—' : mSp.toFixed(0)} cm/s while moving), stops to look around and tends to follow the walls, so the centre fills in more slowly.`} ${time < 60 ? 'Maps are still sparse. Press <b>Skip ahead 60 s</b> to fill them: rate = spikes ÷ running time in each bin.' : ''}</p>`);
    if (!moving) parts.push(`<p><b>Stopped.</b> Theta fades and the hippocampus switches to sharp-wave ripples. ${S.lastReplay ? `The last ripple carried a <b>${S.lastReplay}</b> replay (dashed arrow): cells fired in the order of their fields, about 20× faster than running.` : 'Watch for pink ripple bands in the LFP.'} These spikes are excluded from rate maps by the speed filter.</p>`);
    if (!isNaN(err)) parts.push(`<p>While running, the decoder is off by <b>${err.toFixed(1)} cm</b> on average. ${err < 10 ? 'Forty cells locate the rat to within about half a body length.' : err < 18 ? 'The estimate is noisy but still follows the rat.' : 'The map is unreliable: the decoder’s stored fields no longer match how cells fire.'}</p>`);
    if (p.ad > 0.05) parts.push(`<p><b>Degradation ${Math.round(p.ad * 100)}%.</b> Fields are ${Math.round(70 * p.ad)}% wider and drift, theta locking is ${Math.round(60 * p.ad)}% weaker, and ripples are ${Math.round(50 * p.ad)}% rarer with scrambled order. Spatial information falls and decoding worsens as fields drift away from where the decoder learned them.</p>`);
    else if (!isNaN(meanInfo)) parts.push(`<p>Mean spatial information is ${meanInfo.toFixed(2)} bits/spike. Smaller fields give more bits per spike, and short sessions overestimate it (limited-sampling bias), so compare conditions within one analysis rather than against a single benchmark.</p>`);
    if (S.env === 'track' && S.phase.length > 30) parts.push('<p>The phase plot should show spikes starting late in the theta cycle as the rat enters the field and moving earlier as it leaves: phase precession.</p>');
    explain(parts.join(''));
  };
  let lastFrame = performance.now();
  const loop = now => {
    if (!document.body.contains(el('pcArena'))) return;
    const wall = Math.min(50, Math.max(0, now - lastFrame)); lastFrame = now;
    if (S.running) { S.acc += wall * prm().speed; const ms = Math.floor(S.acc); S.acc -= ms; advance(ms); draw(); report(); }
    requestAnimationFrame(loop);
  };
  pcCtl = { set: o => {
    if (o.env && o.env !== S.env) { S.env = o.env; document.querySelectorAll('[data-env]').forEach(b => b.setAttribute('aria-pressed', b.dataset.env === o.env)); S.x = o.env === 'track' ? 10 : 50; S.y = 50; S.hd = 0; S.dir = 1; S.state = 'run'; S.left = 3000; S.path = []; S.swr = null; o.clear = true; }
    if (o.all !== undefined) el('pcAll').checked = o.all;
    if (o.ad !== undefined) setSlider('pcAD', o.ad); if (o.sigma !== undefined) setSlider('pcSigma', o.sigma); if (o.cell !== undefined) setSlider('pcCell', o.cell); if (o.speed !== undefined) setSlider('pcSpeed', o.speed);
    if (o.clear) clear(); S.running = true; el('pcGo').textContent = 'Pause'; lastInfo = -1e9;
  } };
  bind('pcSpeed', v => v + '×'); bind('pcSigma', v => v + ' cm'); bind('pcAD', v => Math.round(v * 100) + '%', () => { lastInfo = -1e9; }); bind('pcCell', v => '#' + v, () => { S.spikes = []; S.phase = []; });
  el('pcAll').addEventListener('change', () => { S.spikes = []; });
  document.querySelectorAll('[data-env]').forEach(b => b.addEventListener('click', () => pcCtl.set({ env: b.dataset.env })));
  el('pcGo').addEventListener('click', () => { S.running = !S.running; el('pcGo').textContent = S.running ? 'Pause' : 'Resume'; });
  el('pcSkip').addEventListener('click', () => { advance(60000, true); lastInfo = -1e9; draw(); report(); });
  el('pcClear').addEventListener('click', clear);
  advance(3000); draw(); report(); requestAnimationFrame(loop); redraw.fn = draw;
  window.__pcState = () => S;
  attachCode(`import numpy as np
rng = np.random.default_rng(0)

# --- behaviour: running bouts and stops in a 100 x 100 cm box (speeds in cm/s) ---
dt, T = 0.001, 600.0                                   # s
n = int(T / dt)
xy = np.empty((n, 2)); xy[0] = 50; hd, v = 0.0, 0.0
running, left, v_target = True, 3.0, 16.0
speed = np.empty(n)
for k in range(1, n):
    left -= dt
    if left <= 0:                                      # switch between run bouts and pauses
        running = not running
        left = rng.exponential(3.5) + 1.5 if running else rng.uniform(0.5, 4.0)
        v_target = np.clip(16 * np.exp(0.4 * rng.standard_normal()), 6, 40)
    target = v_target if running else 0.0
    v = max(0.0, v + (target - v) * dt / 0.35 + 9 * np.sqrt(dt) * rng.standard_normal() * running)
    hd += 0.035 * rng.standard_normal()
    nxt = xy[k-1] + v * dt * np.array([np.cos(hd), np.sin(hd)])
    if np.any(nxt < 5) or np.any(nxt > 95):
        hd += np.pi / 2; nxt = xy[k-1]
    xy[k], speed[k] = nxt, v
speed[0] = 0.0

# --- 40 cells: log-normal peak rates, rate rises with running speed ---
centres = rng.uniform(8, 92, size=(40, 2)); sigma = 10.0
peak = np.clip(12 * np.exp(0.45 * rng.standard_normal(40)), 4, 35)
def place_rates(pos):                                  # (n, 40) in Hz
    d2 = ((pos[:, None, :] - centres[None]) ** 2).sum(-1)
    return peak * np.exp(-d2 / (2 * sigma**2)) + 0.1
gain = np.where(speed > 3, np.minimum(1.5, 0.45 + speed / 30), 0.2)
spikes = rng.random((n, 40)) < place_rates(xy) * gain[:, None] * dt

# --- speed filter, then rate maps: spikes / occupancy in 5 cm bins ---
run = speed > 3                                        # cm/s, the standard threshold range is 2-5
bins = np.linspace(0, 100, 21)
occ, _, _ = np.histogram2d(xy[run, 0], xy[run, 1], bins=[bins, bins]); occ *= dt
maps = np.stack([np.histogram2d(xy[run & s, 0], xy[run & s, 1], bins=[bins, bins])[0]
                 for s in spikes.T]) / np.where(occ > 0, occ, np.nan)

# --- Skaggs spatial information (bits/spike) ---
p_occ = occ / occ.sum()
def skaggs(rm):
    lam = np.nansum(p_occ * rm); r = rm / lam
    ok = (r > 0) & np.isfinite(r)
    return np.sum(p_occ[ok] * r[ok] * np.log2(r[ok]))
print("fraction of time immobile:", 1 - run.mean())
print("spatial info, cell 0:", skaggs(maps[0]))

# --- Bayesian decoding from 250 ms windows, running periods only ---
grid = np.stack(np.meshgrid(bins[:-1] + 2.5, bins[:-1] + 2.5, indexing='ij'), -1).reshape(-1, 2)
lam = place_rates(grid)                                # (400, 40) expected rates per bin
win = int(0.25 / dt)
errors = []
for k in range(win, n, int(0.1 / dt)):
    if not run[k]:
        continue
    counts = spikes[k-win:k].sum(0)
    loglik = counts @ np.log(lam).T - 0.25 * lam.sum(1)
    errors.append(np.linalg.norm(grid[np.argmax(loglik)] - xy[k]))
print("median decoding error (cm):", np.median(errors))`);
};
function besselI0(x) { let s = 1, t = 1; for (let k = 1; k < 30; k++) { t *= (x / (2 * k)) ** 2; s += t; } return s; }

