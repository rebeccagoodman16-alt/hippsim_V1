/* ===================== SYNAPSE & PLASTICITY WORKBENCH · PAGE =====================
   Route /workbench/synapse/ (?preset=stp-dep&U=0.3 …). One synapse, any level of detail:
   choose receptors and how they are modeled, drive them with a spike pattern, and read the result as
   PSPs or clamp currents, the NMDA voltage dependence, short-term plasticity curves and STDP windows.
   Every setup can be pinned, shared as a link, and exported to Python. */
(function () {
  'use strict';
  const $ = WB.$, F = WB.fmt;
  /* Pfister & Gerstner (2006) Table 3, visual cortex (Sjöström et al. 2001), full model; amplitudes ×100 to read as %. */
  const TRIPLET = { all: { a2p: 5e-8, a3p: 0.62, a2m: 0.7, a3m: 0.023, taux: 101, tauy: 125 }, near: { a2p: 8.8e-9, a3p: 5.3, a2m: 0.66, a3m: 0.31, taux: 714, tauy: 40 } };
  let S = null, base = null, presetKey = 'ampa-psp', last = null, pins = [], runT = null, ratioRes = null;

  /* ---------- schema ---------- */
  function schema() {
    const kin = S.level === 'kin', anyInh = s => s.on_gabaa || s.on_gabab, P = p => s => s.proto === p;
    const recItems = SW.R_ORDER.map(k => {
      const r = SW.REC[k], on = s => s['on_' + k];
      const it = [{ k: 'on_' + k, type: 'check', about: true, label: `<b>${r.label}</b>`, help: `${r.bio} <i>${r.ref}.</i>` },
        { k: 'g_' + k, label: kin && r.gprot ? 'ḡ (maximal)' : 'Peak conductance ḡ', unit: 'nS', min: 0, max: k === 'gabab' ? 20 : 30, step: 0.05, show: on,
          help: kin && r.gprot ? 'In the G-protein model ḡ is the conductance with every K⁺ channel open; a single spike reaches a tiny fraction of it.' : '' },
        { k: 'E_' + k, label: 'Reversal E', unit: 'mV', min: -110, max: 20, step: 0.5, show: on }];
      if (r.mg) it.push({ k: 'mg', label: '[Mg²⁺]ₒ', unit: 'mM', min: 0, max: 4, step: 0.05, show: on, help: 'Typical ACSF 1–2 mM. 0 mM removes the block, as in “Mg-free” induction experiments.' });
      it.push({ k: 'tr_' + k, label: 'Rise τ', unit: 'ms', min: 0.05, max: 100, log: true, show: s => on(s) && (s.level === 'dual' || s.level === 'cur') },
        { k: 'td_' + k, label: 'Decay τ', unit: 'ms', min: 0.5, max: 1000, log: true, show: s => on(s) && s.level !== 'kin' });
      if (r.ka) it.push({ k: 'ka_' + k, label: 'Binding rate α', unit: '/mM/ms', min: 0.001, max: 20, log: true, show: s => on(s) && s.level === 'kin' },
        { k: 'kb_' + k, label: 'Unbinding rate β', unit: '/ms', min: 0.001, max: 2, log: true, show: s => on(s) && s.level === 'kin', help: 'After the transmitter pulse the conductance decays with τ = 1/β.' });
      return it;
    }).flat();
    return [
      { title: 'Model', items: [{ k: 'level', type: 'seg', label: 'Synapse model', rebuild: true, options: [['cur', 'Current'], ['exp', 'Exponential'], ['dual', 'Rise + decay'], ['kin', 'Kinetics']],
        help: '<b>Current</b>: a fixed current waveform, as if V stayed at rest (no driving-force change, no shunting). <b>Exponential</b>: a conductance that jumps and decays. <b>Rise + decay</b>: difference of exponentials. <b>Kinetics</b>: a transmitter pulse binds receptors (Destexhe et al. 1998); GABA_B goes through a G-protein.' }] },
      { title: 'Postsynaptic cell', items: [
        { k: 'mode', type: 'seg', label: 'Recording', options: [['cc', 'Passive'], ['lif', 'Spiking (LIF)'], ['vc', 'Voltage clamp']], help: 'Voltage clamp holds V and reports the synaptic current (inward negative).' },
        { k: 'C', label: 'Capacitance C', unit: 'pF', min: 10, max: 1000, step: 1, show: s => s.mode !== 'vc' },
        { k: 'gL', label: 'Leak g_L', unit: 'nS', min: 1, max: 100, step: 0.5, show: s => s.mode !== 'vc', help: 'Input resistance 1/g_L (10 nS → 100 MΩ); τ_m = C/g_L.' },
        { k: 'EL', label: 'Resting E_L', unit: 'mV', min: -90, max: -40, step: 0.5, show: s => s.mode !== 'vc' },
        { k: 'idc', label: 'Holding current', unit: 'pA', min: -200, max: 300, step: 1, show: s => s.mode !== 'vc', help: 'Depolarize to relieve the NMDA Mg²⁺ block or to bring the LIF close to threshold.' },
        { k: 'Vth', label: 'Threshold', unit: 'mV', min: -65, max: -30, step: 0.5, show: s => s.mode === 'lif' },
        { k: 'Vr', label: 'Reset', unit: 'mV', min: -80, max: -40, step: 0.5, show: s => s.mode === 'lif' },
        { k: 'tref', label: 'Refractory', unit: 'ms', min: 0, max: 20, step: 0.1, show: s => s.mode === 'lif' },
        { k: 'vhold', label: 'Holding voltage', unit: 'mV', min: -100, max: 60, step: 0.5, show: s => s.mode === 'vc' }] },
      { title: 'Receptors', badge: 'toggle & scale', items: recItems },
      { title: 'Transmitter & G-protein', open: false, show: s => s.level === 'kin', items: [
        { k: 'Tmax', label: 'Transmitter peak', unit: 'mM', min: 0.1, max: 5, step: 0.05 }, { k: 'Tdur', label: 'Pulse duration', unit: 'ms', min: 0.1, max: 5, step: 0.05 },
        { type: 'note', html: 'GABA_B: dr/dt = K₁T(1−r) − K₂r, ds/dt = K₃r − K₄s, g = ḡ sⁿ/(sⁿ + K_d) (Destexhe et al. 1998).' },
        { k: 'K1', label: 'K₁', unit: '/mM/ms', min: 0.001, max: 1, log: true }, { k: 'K2', label: 'K₂', unit: '/ms', min: 1e-4, max: 0.05, log: true },
        { k: 'K3', label: 'K₃', unit: '/ms', min: 0.01, max: 1, log: true }, { k: 'K4', label: 'K₄', unit: '/ms', min: 0.001, max: 0.5, log: true },
        { k: 'Kd', label: 'K_d', min: 1, max: 1000, log: true }, { k: 'nB', label: 'Cooperativity n', min: 1, max: 6, step: 1, help: 'Four G-protein subunits must bind a GIRK channel. With n = 1 the nonlinearity disappears.' }] },
      { title: 'Presynaptic spikes', items: [
        { k: 'proto', type: 'select', label: 'Pattern', options: [['single', 'Single spike'], ['pair', 'Paired pulse'], ['train', 'Regular train'], ['tbs', 'Theta burst'], ['poisson', 'Poisson']] },
        { k: 'delay', label: 'First spike at', unit: 'ms', min: 0, max: 500, step: 1 },
        { k: 'isi', label: 'Interval', unit: 'ms', min: 1, max: 500, step: 1, show: P('pair') },
        { k: 'nsp', label: 'Spikes', min: 1, max: 50, step: 1, show: P('train') }, { k: 'freq', label: 'Frequency', unit: 'Hz', min: 0.5, max: 200, step: 0.5, show: P('train') },
        { k: 'nb', label: 'Bursts', min: 1, max: 20, step: 1, show: P('tbs') }, { k: 'bsz', label: 'Spikes per burst', min: 1, max: 10, step: 1, show: P('tbs') },
        { k: 'bf', label: 'Within-burst frequency', unit: 'Hz', min: 10, max: 400, step: 1, show: P('tbs') }, { k: 'bif', label: 'Burst frequency', unit: 'Hz', min: 0.5, max: 20, step: 0.1, show: P('tbs'), help: '5 Hz = theta.' },
        { k: 'rate', label: 'Rate', unit: 'Hz', min: 0.5, max: 200, step: 0.5, show: P('poisson') }, { k: 'pdur', label: 'Duration', unit: 'ms', min: 10, max: 5000, step: 10, show: P('poisson') },
        { k: 'seed', label: 'Seed', min: 1, max: 999, step: 1, show: P('poisson') },
        { k: 'inh_on', type: 'check', label: 'Drive inhibitory receptors with the same spikes', show: anyInh },
        { k: 'inh_lag', label: 'Inhibitory delay', unit: 'ms', min: -20, max: 50, step: 0.5, show: s => anyInh(s) && s.inh_on, help: 'Feedforward inhibition in CA1 arrives ~2 ms after excitation (one extra synapse).' },
        { k: 'tstop', label: 'Simulated time', unit: 'ms', min: 20, max: 5000, step: 10 }] },
      { title: 'Short-term plasticity', open: S.stp, items: [
        { k: 'stp', type: 'check', label: 'Tsodyks–Markram dynamics', help: 'Applies to excitatory release. ḡ is the response to the first spike; later spikes are scaled by u·R/U.' },
        { k: 'U', label: 'Utilization U', min: 0.01, max: 0.95, step: 0.01, show: s => s.stp, help: 'Fraction of resources used by the first spike; release-probability-like.' },
        { k: 'tauD', label: 'Recovery τ_D', unit: 'ms', min: 1, max: 3000, log: true, show: s => s.stp, help: 'Depression: time to refill the vesicle pool.' },
        { k: 'tauF', label: 'Facilitation τ_F', unit: 'ms', min: 0, max: 2000, step: 1, show: s => s.stp, help: '0 = no facilitation. Residual Ca²⁺ raises u for this long.' }] },
      { title: 'Long-term plasticity (STDP)', open: S.rule !== 'pair' || presetKey.startsWith('stdp'), items: [
        { k: 'rule', type: 'seg', label: 'Rule', options: [['pair', 'Pair'], ['triplet', 'Triplet'], ['ca', 'Calcium']] },
        { k: 'nn', type: 'seg', label: 'Spike interactions', options: [['all', 'All-to-all'], ['near', 'Nearest']], show: s => s.rule !== 'ca', help: 'All-to-all: every earlier spike counts (traces add). Nearest: only the latest one (traces reset to 1). Pfister & Gerstner fitted each separately, so with untouched triplet values the switch also loads that fit (their Table 3).' },
        { k: 'Ap', label: 'A₊ (per pair)', unit: '%', min: 0, max: 5, step: 0.01, show: s => s.rule === 'pair' }, { k: 'Am', label: 'A₋ (per pair)', unit: '%', min: 0, max: 5, step: 0.01, show: s => s.rule === 'pair', help: 'A₋τ₋ > A₊τ₊ makes uncorrelated firing depress on average (Song et al. 2000).' },
        { k: 'taup', label: 'τ₊', unit: 'ms', min: 1, max: 100, step: 0.1, show: s => s.rule !== 'ca' }, { k: 'taum', label: 'τ₋', unit: 'ms', min: 1, max: 200, step: 0.1, show: s => s.rule !== 'ca' },
        { k: 'a2p', label: 'A₂⁺ (pair LTP)', unit: '%', min: 0, max: 2, step: 0.001, show: s => s.rule === 'triplet' }, { k: 'a3p', label: 'A₃⁺ (triplet LTP)', unit: '%', min: 0, max: 2, step: 0.001, show: s => s.rule === 'triplet' },
        { k: 'a2m', label: 'A₂⁻ (pair LTD)', unit: '%', min: 0, max: 2, step: 0.001, show: s => s.rule === 'triplet' }, { k: 'a3m', label: 'A₃⁻ (triplet LTD)', unit: '%', min: 0, max: 2, step: 0.001, show: s => s.rule === 'triplet' },
        { k: 'taux', label: 'τ_x (pre, slow)', unit: 'ms', min: 1, max: 1000, step: 1, show: s => s.rule === 'triplet' }, { k: 'tauy', label: 'τ_y (post, slow)', unit: 'ms', min: 1, max: 1000, step: 1, show: s => s.rule === 'triplet' },
        { k: 'tauca', label: 'Calcium τ_Ca', unit: 'ms', min: 1, max: 200, step: 0.1, show: s => s.rule === 'ca' },
        { k: 'cpre', label: 'C_pre (per pre spike)', min: 0, max: 3, step: 0.01, show: s => s.rule === 'ca' }, { k: 'cpost', label: 'C_post (per post spike)', min: 0, max: 3, step: 0.01, show: s => s.rule === 'ca' },
        { k: 'Dca', label: 'Pre calcium delay D', unit: 'ms', min: 0, max: 30, step: 0.1, show: s => s.rule === 'ca', help: 'NMDA-receptor calcium lags the presynaptic spike.' },
        { k: 'thd', label: 'Depression threshold θ_d', min: 0, max: 3, step: 0.01, show: s => s.rule === 'ca' }, { k: 'thp', label: 'Potentiation threshold θ_p', min: 0, max: 3, step: 0.01, show: s => s.rule === 'ca' },
        { k: 'gamd', label: 'γ_d', min: 0, max: 2000, step: 1, show: s => s.rule === 'ca' }, { k: 'gamp', label: 'γ_p', min: 0, max: 2000, step: 1, show: s => s.rule === 'ca' },
        { k: 'rho0', label: 'Initial efficacy ρ₀', min: 0, max: 1, step: 0.01, show: s => s.rule === 'ca', help: 'ρ = 0.5 is the unstable middle state between DOWN (0) and UP (1).' },
        { k: 'npair', label: 'Pairings', min: 1, max: 200, step: 1 }, { k: 'fpair', label: 'Pairing frequency', unit: 'Hz', min: 0.1, max: 50, step: 0.1 }] },
      { title: 'Numerics', open: false, items: [{ k: 'dt', label: 'Time step Δt', unit: 'ms', min: 0.005, max: 0.5, log: true, help: 'Exact exponential updates with conductances frozen over Δt. Halve it: if the result changes, it was not converged.' }] },
    ];
  }

  /* ---------- page ---------- */
  function presetPicker() {
    const groups = {}; Object.entries(SW.PRESETS).forEach(([k, p]) => (groups[p.group] = groups[p.group] || []).push([k, p]));
    return `<label class="wb-presetlab" for="sw-preset">Start from</label><select id="sw-preset">${Object.entries(groups).map(([g, l]) => `<optgroup label="${g}">${l.map(([k, p]) => `<option value="${k}" ${k === presetKey ? 'selected' : ''}>${p.label}</option>`).join('')}</optgroup>`).join('')}</select>`;
  }
  function html() {
    return `<nav class="breadcrumbs"><a href="/">Home</a> › <a href="/workbench/">Workbenches</a> › <span>Synapse & plasticity</span></nav>
    <div class="hero wb-hero"><span class="pill">WORKBENCH · FROM A WEIGHT TO A LEARNING RULE</span><h1>Synapse & plasticity workbench</h1>
    <p class="lead">One synapse onto one cell. Choose how it is modeled, from a fixed current to receptor kinetics with Mg²⁺ block and a G-protein cascade, drive it with a spike pattern, and watch what the membrane does with it. Then change the synapse itself: short-term depression and facilitation, and the STDP rules that turn spike timing into lasting weight changes.</p></div>
    <div class="wb-bar">${presetPicker()}<div class="wb-bar-actions"><button class="secondary" id="sw-reset">Reset preset</button><button class="secondary" id="sw-pin">Pin this run</button><button class="secondary" id="sw-unpin" hidden>Clear pins</button><button class="secondary" id="sw-link">Copy link to this setup</button></div></div>
    <p class="wb-presetnote" id="sw-note"></p>
    <div class="wb-layout">
      <div class="wb-panel" id="sw-panel" aria-label="Synapse controls"></div>
      <div class="wb-main">
        ${WB.tabs('sw-tabs', [['traces', 'Traces'], ['nmda', 'NMDA & Mg²⁺'], ['stp', 'Short-term plasticity'], ['stdp', 'STDP'], ['code', 'Python'], ['eq', 'Equations']])}
        <div data-pane-of="sw-tabs" data-pane="traces">
          <div class="wb-summary" id="sw-sum" aria-live="polite"></div>
          ${WB.figure('sw-v', 'Postsynaptic response', 260, 'markers along the top = presynaptic spikes (dark: excitatory, blue: inhibitory)')}
          ${WB.figure('sw-g', 'Synaptic conductances', 170)}
          <div class="wb-toggles"><label><input type="checkbox" id="sw-showcur"> Synaptic currents</label><label><input type="checkbox" id="sw-showeff"> Release efficacy per spike</label></div>
          <div id="sw-cur-wrap" hidden>${WB.figure('sw-cur', 'Synaptic currents (outward positive)', 170)}</div>
          <div id="sw-eff-wrap" hidden>${WB.figure('sw-eff', 'Response per spike, relative to the first', 170, 'dots = release (u·R/U), squares = measured response')}</div>
        </div>
        <div data-pane-of="sw-tabs" data-pane="nmda" hidden>
          <p class="wb-help">Mg²⁺ sits in the NMDA pore at negative voltages and is expelled by depolarization (Jahr & Stevens 1990): B(V) = 1/(1 + [Mg²⁺]·e^(−0.062V)/3.57). The I–V below uses each receptor’s peak conductance: the NMDA curve has a region of <i>negative slope</i> between about −70 and −30 mV, where more depolarization lets in more inward current. That regenerative region underlies NMDA spikes and plateau potentials in dendrites.</p>
          ${WB.figure('sw-mg', 'Fraction of NMDA conductance unblocked, B(V)', 200)}
          ${WB.figure('sw-ivn', 'Peak synaptic current vs holding voltage', 240)}
          <div class="wb-inline"><button class="primary" id="sw-ratio">Measure NMDA/AMPA ratio</button><span class="wb-prog" id="sw-ratio-prog"></span></div>
          <p class="wb-help">The slice protocol: peak EPSC at −70 mV (AMPA) and the current at +40 mV, 50 ms after the stimulus, when AMPA has decayed (NMDA). Uses the current ḡ, kinetics and [Mg²⁺], with both receptors on.</p>
          ${WB.figure('sw-ratio-cv', 'Voltage clamp at −70 and +40 mV', 220)}<div class="wb-summary" id="sw-ratio-sum"></div></div>
        <div data-pane-of="sw-tabs" data-pane="stp" hidden>
          <p class="wb-help">Tsodyks–Markram synapse with the current U, τ_D and τ_F. These curves are the <i>release</i>: what the presynaptic terminal delivers. The PSP ratio also depends on summation in the membrane; compare the squares in the Traces tab.</p>
          <div class="wb-summary" id="sw-stp-sum"></div>
          ${WB.figure('sw-ppr', 'Paired-pulse ratio A₂/A₁ vs interval', 230)}
          ${WB.figure('sw-ss', 'Steady state of a regular train', 230)}
          ${WB.figure('sw-rate', 'Steady-state response × frequency', 200, 'how much a train transmits per second')}</div>
        <div data-pane-of="sw-tabs" data-pane="stdp" hidden>
          <p class="wb-help">Pairings of one presynaptic and one postsynaptic spike, Δt = t_post − t_pre, repeated at the pairing frequency (settings in the panel). The weight change is the sum over the protocol; the cell’s own dynamics are not simulated here, so every spike happens exactly when the protocol says.</p>
          <div class="wb-summary" id="sw-stdp-sum"></div>
          ${WB.figure('sw-win', 'STDP window', 260)}
          ${WB.figure('sw-freq', 'Frequency dependence at Δt = ±10 ms', 230, 'Sjöström et al. (2001) protocol')}
          <div id="sw-ca-wrap">${WB.figure('sw-ca', 'Calcium during one pairing', 220)}<div class="wb-inline"><label>Δt for this plot <input type="number" id="sw-dtca" step="any" style="width:6em"> ms</label></div></div></div>
        <div data-pane-of="sw-tabs" data-pane="code" hidden>
          <p class="wb-help">A NumPy script that reproduces the Traces tab (same update scheme and units) and computes the STDP window for the selected rule. It updates as you change the controls. Press ▶ Run here, or take it to Colab or Jupyter.</p>
          ${WB.codeBlock('sw-code', '# loading…')}</div>
        <div data-pane-of="sw-tabs" data-pane="eq" hidden><div id="sw-eq"></div></div>
      </div>
    </div>
    ${WB.related([['/topics/synapses/chemical-electrical/', 'Chemical & electrical synapses'], ['/topics/synapses/synaptic-conductance/', 'Synaptic conductance'], ['/topics/synapses/timing-location/', 'Timing & location'], ['/topics/synapses/ei-feedback/', 'E/I feedback'], ['/topics/learning/plasticity-rules/', 'Plasticity rules'], ['/lab/stdp/', 'STDP model lab'], ['/biology/mechanisms/', 'Synapse mechanisms'], ['/workbench/neuron/', 'Neuron workbench']])}`;
  }

  /* ---------- run + draw ---------- */
  function run() {
    const t0 = performance.now();
    try { last = SW.simulate(S); } catch (e) { $('sw-sum').innerHTML = `<b>Model error:</b> ${WB.esc(e.message)}`; return; }
    last.ms = performance.now() - t0; last.amps = SW.eventAmps(last);
    draw(); WB.setCode('sw-code', SW.pythonCode(S)); WB.query.set({ preset: presetKey, ...S }, base, ['preset']);
    drawSTP(); drawNMDA(); drawSTDP(); drawEq();
  }
  const schedule = () => { clearTimeout(runT); runT = setTimeout(run, S.tstop / S.dt > 100000 ? 150 : 40); };
  function summary() {
    const r = last, a = r.amps, u = r.vc ? 'pA' : 'mV', parts = [];
    if (!r.recs.length) parts.push('<b class="wb-warn">No receptor is switched on.</b> Tick one under Receptors.');
    parts.push(`<b>${r.exc.length}</b> presynaptic spike${r.exc.length === 1 ? '' : 's'}`);
    if (a.length) parts.push(`first response <b>${F(a[0])} ${u}</b>${r.vc ? '' : ' from rest'}`);
    if (a.length > 1 && Math.abs(a[0]) > 1e-9) parts.push(`second/first <b>${F(a[1] / a[0], 3)}</b>`);
    if (a.length > 2 && Math.abs(a[0]) > 1e-9) parts.push(`last/first <b>${F(a.at(-1) / a[0], 3)}</b>`);
    if (!r.vc) { let mx = -Infinity; r.V.forEach(v => { if (v !== 20 && v > mx) mx = v; }); parts.push(`peak V <b>${F(mx)} mV</b>`); }
    if (r.vc) { let q = 0; const dt = r.t[1] - r.t[0]; r.I.forEach(v => q += v * dt); parts.push(`charge <b>${F(q / 1000)} pC</b>`); }
    if (S.mode === 'lif') parts.push(`<b>${r.spikes.length}</b> postsynaptic spike${r.spikes.length === 1 ? '' : 's'}`);
    if (S.mode !== 'vc') parts.push(`<span class="muted">τ_m ${F(S.C / S.gL)} ms · R_in ${F(1000 / S.gL)} MΩ</span>`);
    parts.push(`<span class="muted">${F(S.tstop)} ms in ${F(r.ms, 2)} ms</span>`);
    $('sw-sum').innerHTML = parts.join(' · ');
  }
  const tickSeries = (times, y, col) => ({ x: times, y: times.map(() => y), points: true, radius: 6, color: col, noLegend: true, noHover: true });
  function draw() {
    if (!last) return; summary(); const P = WB.pal(), r = last, y = r.vc ? r.I : r.V;
    const ylabel = r.vc ? 'I_syn (pA)' : 'V (mV)';
    let lo = Infinity, hi = -Infinity; y.forEach(v => { if (v === 20 && !r.vc) return; if (v < lo) lo = v; if (v > hi) hi = v; });
    pins.filter(p => p.vc === r.vc).forEach(p => p.y.forEach(v => { if (v === 20 && !p.vc) return; if (v < lo) lo = v; if (v > hi) hi = v; }));
    if (S.mode === 'lif') hi = Math.max(hi, 20);
    const pad = Math.max(0.5, (hi - lo) * 0.08), top = hi + pad * 2.2;
    const ser = [{ x: r.t, y, label: r.vc ? 'clamp current' : 'V', color: P.s[0] }, tickSeries(r.exc, top - pad * 0.6, P.ink)];
    if (r.inh.length && r.recs.some(k => !SW.REC[k].exc)) ser.push(tickSeries(r.inh, top - pad * 1.4, P.s[1]));
    pins.filter(p => p.vc === r.vc).forEach((p, i) => ser.unshift({ x: p.t, y: p.y, ghost: true, label: 'pin ' + (i + 1) + ': ' + p.name, width: 1.3 }));
    WB.plot($('sw-v'), { series: ser, xlabel: 'time (ms)', ylabel, yunit: r.vc ? 'pA' : 'mV', xlim: [0, S.tstop], ylim: [lo - pad, top],
      hlines: r.vc ? [{ y: 0 }] : S.mode === 'lif' ? [{ y: S.Vth, label: 'threshold', color: P.s[6] }] : [] });
    WB.plot($('sw-g'), { series: r.recs.map((k, i) => ({ x: r.t, y: r.g[k], label: SW.REC[k].label, color: P.s[(i + 1) % 8] })), xlabel: 'time (ms)', ylabel: 'g (nS)', yunit: 'nS', xlim: [0, S.tstop] });
    if ($('sw-showcur').checked) WB.plot($('sw-cur'), { series: r.recs.map((k, i) => ({ x: r.t, y: r.cur[k], label: SW.REC[k].label, color: P.s[(i + 1) % 8] })), xlabel: 'time (ms)', ylabel: 'pA', yunit: 'pA', xlim: [0, S.tstop], hlines: [{ y: 0 }] });
    if ($('sw-showeff').checked) {
      const a0 = r.amps[0] || 1, ser2 = [{ x: r.exc, y: r.eff, points: true, line: true, label: 'release u·R/U', color: P.s[2], radius: 6 }, { x: r.exc, y: r.amps.map(v => v / a0), points: true, label: 'measured response / first', color: P.s[0], radius: 5 }];
      WB.plot($('sw-eff'), { series: ser2, xlabel: 'spike time (ms)', ylabel: 'relative to spike 1', xlim: [0, S.tstop], hlines: [{ y: 1 }] });
    }
  }

  /* ---------- NMDA tab ---------- */
  function drawNMDA() {
    if (!$('sw-mg') || $('sw-mg').closest('[hidden]')) return;
    const P = WB.pal(), V = WB.linspace(-100, 60, 161), mgs = [[S.mg, P.s[0], `[Mg²⁺] = ${F(S.mg)} mM`], [0, P.s[3], '0 mM'], [2, P.s[2], '2 mM']].filter((m, i) => i === 0 || m[0] !== S.mg);
    WB.plot($('sw-mg'), { series: mgs.map(([m, c, l]) => ({ x: V, y: V.map(v => SW.mgB(v, m)), label: l, color: c, dash: m === S.mg ? [] : [5, 3] })), xlabel: 'V (mV)', ylabel: 'B(V)', ylim: [0, 1.02], vlines: [{ x: S.EL, label: 'rest' }] });
    const ga = S.g_ampa, gn = S.g_nmda;
    WB.plot($('sw-ivn'), { series: [{ x: V, y: V.map(v => ga * (v - S.E_ampa)), label: `AMPA (ḡ ${F(ga)} nS)`, color: P.s[1] }, { x: V, y: V.map(v => gn * SW.mgB(v, S.mg) * (v - S.E_nmda)), label: `NMDA (ḡ ${F(gn)} nS)`, color: P.s[0] },
      { x: V, y: V.map(v => gn * (v - S.E_nmda)), label: 'NMDA without Mg²⁺', color: P.s[0], dash: [4, 3], width: 1.2 }], xlabel: 'holding voltage (mV)', ylabel: 'peak current (pA)', yunit: 'pA', hlines: [{ y: 0 }] });
    drawRatio();
  }
  function runRatio() {
    $('sw-ratio').disabled = true; $('sw-ratio-prog').textContent = 'running…';
    setTimeout(() => {
      ratioRes = SW.nmdaAmpaRatio(S); $('sw-ratio').disabled = false; $('sw-ratio-prog').textContent = ''; drawRatio();
      $('sw-ratio-sum').innerHTML = `AMPA peak at −70 mV <b>${F(ratioRes.ampa)} pA</b> · NMDA at +40 mV, 50 ms <b>${F(ratioRes.nmda)} pA</b> · <b>NMDA/AMPA = ${F(ratioRes.ratio, 3)}</b> <span class="muted">(measured ratios vary widely with age, temperature, recording solution and how the NMDA component is read out; compare with the paper you are modeling)</span>`;
    }, 20);
  }
  function drawRatio() {
    if (!ratioRes || !$('sw-ratio-cv')) return; const P = WB.pal(), r = ratioRes;
    WB.plot($('sw-ratio-cv'), { series: [{ x: r.lo.t, y: r.lo.I, label: '−70 mV', color: P.s[1] }, { x: r.hi.t, y: r.hi.I, label: '+40 mV', color: P.s[0] }], xlabel: 'time (ms)', ylabel: 'I_syn (pA)', yunit: 'pA', hlines: [{ y: 0 }], vlines: [{ x: 70, label: '50 ms' }] });
  }

  /* ---------- STP tab ---------- */
  /** y-limits that always include the reference value 1 with room above it for the line label. */
  const padLim = ys => { let lo = Math.min(1, ...ys), hi = Math.max(1, ...ys); const r = hi - lo || 1; return [Math.max(0, lo - 0.06 * r), hi + 0.16 * r]; };
  function drawSTP() {
    if (!$('sw-ppr') || $('sw-ppr').closest('[hidden]')) return;
    const P = WB.pal(), D = WB.logspace(5, 3000, 120), f = WB.logspace(0.5, 100, 100), U = S.U, tD = S.tauD, tF = S.tauF;
    const pinsSTP = pins.filter(p => p.stp);
    WB.plot($('sw-ppr'), { series: [...pinsSTP.map(p => ({ x: D, y: D.map(d => SW.ppr(p.stp.U, p.stp.tauD, p.stp.tauF, d)), ghost: true, label: 'pin: ' + p.name })), { x: D, y: D.map(d => SW.ppr(U, tD, tF, d)), label: 'A₂/A₁', color: P.s[0] }],
      logx: true, ylim: padLim(D.map(d => SW.ppr(U, tD, tF, d))), xlabel: 'interval between the two spikes (ms)', ylabel: 'paired-pulse ratio', hlines: [{ y: 1, label: 'no change' }], vlines: S.proto === 'pair' ? [{ x: S.isi, label: 'current interval' }] : [] });
    const ss = f.map(x => SW.tmSteady(U, tD, tF, x));
    WB.plot($('sw-ss'), { series: [...pinsSTP.map(p => ({ x: f, y: f.map(x => SW.tmSteady(p.stp.U, p.stp.tauD, p.stp.tauF, x)), ghost: true, label: 'pin: ' + p.name })), { x: f, y: ss, label: 'steady-state response / first', color: P.s[0] }],
      logx: true, ylim: padLim(ss), xlabel: 'train frequency (Hz)', ylabel: 'A_∞ / A₁', hlines: [{ y: 1 }] });
    const lim = tF > 0 ? null : 1000 / (U * tD);
    WB.plot($('sw-rate'), { series: [{ x: f, y: ss.map((v, i) => v * f[i]), label: 'A_∞ × f (first-spike units per s)', color: P.s[1] }], logx: true, ylim: [0, Math.max(...ss.map((v, i) => v * f[i]), lim || 0) * 1.12], xlabel: 'train frequency (Hz)', ylabel: 'A_∞·f (Hz)',
      hlines: lim ? [{ y: lim, label: `limit 1/(U·τ_D) = ${F(lim)} Hz`, color: P.s[6] }] : [] });
    const p50 = SW.ppr(U, tD, tF, 50), s20 = SW.tmSteady(U, tD, tF, 20);
    $('sw-stp-sum').innerHTML = `${S.stp ? '' : '<span class="muted">STP is off in the Traces tab; these curves use the panel values anyway. </span>'}PPR at 50 ms <b>${F(p50, 3)}</b> (${p50 > 1.02 ? 'facilitating' : p50 < 0.98 ? 'depressing' : 'neutral'}) · steady state at 20 Hz <b>${F(s20, 3)}</b> × first${lim ? ` · a depressing synapse transmits at most ~<b>${F(lim)}</b> first-spike responses per second, whatever the input rate (Tsodyks & Markram 1997)` : ''}`;
  }

  /* ---------- STDP tab ---------- */
  function drawSTDP() {
    if (!$('sw-win') || $('sw-win').closest('[hidden]')) return;
    const P = WB.pal(), ca = S.rule === 'ca', yl = ca ? 'Δρ (efficacy)' : 'Δw (% of initial)';
    const win = SW.stdpWindow(S), fr = SW.stdpFreq(S, 10);
    const name = { pair: 'pair rule', triplet: 'triplet rule', ca: 'calcium rule' }[S.rule];
    WB.plot($('sw-win'), { series: [{ x: win.map(o => o.dt), y: win.map(o => o.dw), label: `${name}, ${S.npair} pairings at ${F(S.fpair)} Hz`, color: P.s[0], points: true, line: true, radius: 4 }],
      xlabel: 'Δt = t_post − t_pre (ms)', ylabel: yl, hlines: [{ y: 0 }], vlines: [{ x: 0 }] });
    WB.plot($('sw-freq'), { series: [{ x: fr.map(o => o.f), y: fr.map(o => o.plus), label: 'pre → post (+10 ms)', color: P.s[0], points: true, line: true, radius: 4 }, { x: fr.map(o => o.f), y: fr.map(o => o.minus), label: 'post → pre (−10 ms)', color: P.s[1], points: true, line: true, radius: 4 }],
      logx: true, xlabel: 'pairing frequency (Hz)', ylabel: yl, hlines: [{ y: 0 }] });
    const mx = win.reduce((a, o) => o.dw > a.dw ? o : a, win[0]), mn = win.reduce((a, o) => o.dw < a.dw ? o : a, win[0]), hiF = fr.at(-1);
    const parts = [`largest increase <b>${F(mx.dw, 3)}</b> at Δt = ${F(mx.dt)} ms`, `largest decrease <b>${F(mn.dw, 3)}</b> at Δt = ${F(mn.dt)} ms`, `at ${F(hiF.f)} Hz: +10 ms → <b>${F(hiF.plus, 3)}</b>, −10 ms → <b>${F(hiF.minus, 3)}</b>${hiF.plus > 0 && hiF.minus > 0 ? ' (both potentiate)' : ''}`];
    if (S.rule === 'pair') parts.push(`<span class="muted">A₋τ₋/A₊τ₊ = ${F(S.Am * S.taum / Math.max(1e-9, S.Ap * S.taup), 3)}</span>`);
    $('sw-stdp-sum').innerHTML = parts.join(' · ');
    $('sw-ca-wrap').hidden = !ca;
    if (ca) {
      if (document.activeElement !== $('sw-dtca')) $('sw-dtca').value = S.dtca;
      const tr = SW.caTrace(S, S.dtca);
      WB.plot($('sw-ca'), { series: [{ x: tr.t, y: tr.c, label: 'calcium c(t)', color: P.s[2] }], xlabel: 'time (ms)', ylabel: 'c (a.u.)', legend: false,
        hlines: [{ y: S.thp, label: 'θ_p (potentiation)', color: P.s[0] }, { y: S.thd, label: 'θ_d (depression)', color: P.s[1] }],
        vlines: [{ x: tr.pre, label: 'pre', color: P.ink }, { x: tr.post, label: 'post', color: P.s[0] }] });
      $('sw-stdp-sum').innerHTML += `<br>One pairing at Δt = ${F(S.dtca)} ms: calcium spends <b>${F(tr.one.ap)} ms</b> above θ_p and <b>${F(tr.one.ad)} ms</b> above θ_d. Net drive ∝ γ_p·t_p − γ_d·t_d = <b>${F(S.gamp * tr.one.ap - S.gamd * tr.one.ad)}</b> (${S.gamp * tr.one.ap > S.gamd * tr.one.ad ? 'potentiation' : 'depression'} near ρ = 0.5).`;
    }
  }

  /* ---------- equations ---------- */
  function eqHTML() {
    const on = SW.R_ORDER.filter(k => S['on_' + k]), lvl = S.level;
    let h = `<h3>Membrane</h3><p>\\[C\\frac{dV}{dt} = -g_L(V-E_L) - \\sum_{\\text{syn}} I_{\\text{syn}} + I_{DC}${S.mode === 'lif' ? ',\\qquad V \\ge V_{th} \\Rightarrow V \\leftarrow V_r' : ''}\\]</p>`;
    h += lvl === 'cur' ? `<p>\\[I_{\\text{syn}}(t) = g(t)\\,B(V_{\\text{rest}})\\,(V_{\\text{rest}} - E_{\\text{syn}})\\]</p><p>Current-based: the driving force is frozen at rest. The current does not shrink as V approaches E_syn, and a synapse with E_syn = E_rest has no effect at all. Fine for small inputs; wrong for large or shunting ones.</p>`
      : `<p>\\[I_{\\text{syn}} = g(t)\\,B(V)\\,(V - E_{\\text{syn}}),\\qquad B(V) = \\begin{cases}\\dfrac{1}{1 + [\\mathrm{Mg}^{2+}]_o\\,e^{-0.062V}/3.57} & \\text{NMDA}\\\\ 1 & \\text{otherwise}\\end{cases}\\]</p>`;
    h += '<h3>Conductance time course</h3>';
    if (lvl === 'exp') h += `<p>\\[g(t) = \\bar g \\sum_k A_k\\, e^{-(t-t_k)/\\tau_d}\\,\\Theta(t-t_k)\\]</p><p>Instantaneous rise: fine when the rise is much faster than the membrane.</p>`;
    else if (lvl === 'kin') h += `<p>\\[\\frac{dr}{dt} = \\alpha T(t)(1-r) - \\beta r,\\qquad g = \\bar g\\,\\frac{r}{r_{\\text{peak}}}\\]</p><p>T(t) is a square pulse of transmitter (${F(S.Tmax)} mM for ${F(S.Tdur)} ms) after each spike, scaled by the release efficacy A_k. Normalizing by the single-spike peak r_peak keeps ḡ = the peak conductance of an isolated spike, as in the other levels. Because r saturates, closely spaced spikes add sublinearly.</p>${on.includes('gabab') ? `<p>\\[\\frac{dr}{dt} = K_1 T(1-r) - K_2 r,\\quad \\frac{ds}{dt} = K_3 r - K_4 s,\\quad g_{\\text{GABA}_B} = \\bar g\\,\\frac{s^n}{s^n + K_d}\\]</p><p>GABA_B: receptor activation r produces G-protein s; n = ${S.nB} G-protein subunits gate each GIRK channel, so the conductance grows steeply with the number of spikes.</p>` : ''}`;
    else h += `<p>\\[g(t) = \\bar g\\, N \\sum_k A_k\\left(e^{-(t-t_k)/\\tau_d} - e^{-(t-t_k)/\\tau_r}\\right)\\Theta(t-t_k),\\qquad t_{\\text{peak}} = \\frac{\\tau_r\\tau_d}{\\tau_d-\\tau_r}\\ln\\frac{\\tau_d}{\\tau_r}\\]</p><p>N normalizes the peak of one spike’s waveform to 1, so ḡ is the peak conductance.</p>`;
    h += `<h3>Short-term plasticity (Tsodyks–Markram)</h3><p>Between spikes separated by Δ:</p><p>\\[u_{n+1} = U + u_n(1-U)\\,e^{-\\Delta/\\tau_F},\\qquad R_{n+1} = 1 + \\big(R_n(1-u_n) - 1\\big)e^{-\\Delta/\\tau_D},\\qquad A_n = \\frac{u_n R_n}{U}\\]</p><p>Paired-pulse ratio: \\(\\;A_2/A_1 = \\big(1 + (1-U)e^{-\\Delta/\\tau_F}\\big)\\big(1 - U e^{-\\Delta/\\tau_D}\\big)\\).</p>`;
    h += `<h3>STDP rule: ${{ pair: 'pair-based', triplet: 'triplet', ca: 'calcium-based' }[S.rule]}</h3>`;
    if (S.rule === 'pair') h += `<p>\\[\\Delta w = \\begin{cases} A_+\\,e^{-\\Delta t/\\tau_+} & \\Delta t > 0\\\\ -A_-\\,e^{\\Delta t/\\tau_-} & \\Delta t < 0\\end{cases}\\]</p><p>Implemented with traces: x jumps at each pre spike and decays with τ₊; y jumps at each post spike and decays with τ₋. Post spike: w += A₊x. Pre spike: w −= A₋y. ${S.nn === 'all' ? 'All-to-all: traces add.' : 'Nearest neighbour: traces reset to 1.'}</p>`;
    else if (S.rule === 'triplet') h += `<p>\\[\\text{post spike: } w \\mathrel{+}= r_1\\,(A_2^+ + A_3^+ o_2),\\qquad \\text{pre spike: } w \\mathrel{-}= o_1\\,(A_2^- + A_3^- r_2)\\]</p><p>r₁ (τ₊) and r₂ (τ_x) are presynaptic traces; o₁ (τ₋) and o₂ (τ_y) postsynaptic. o₂ and r₂ are read <i>before</i> their own spike’s increment. The A₃⁺ term makes LTP depend on recent postsynaptic firing, hence on frequency (Pfister & Gerstner 2006).</p>`;
    else h += `<p>\\[c(t) = \\sum_i C_{\\text{pre}}\\,e^{-(t-t_i-D)/\\tau_{Ca}} + \\sum_j C_{\\text{post}}\\,e^{-(t-t_j)/\\tau_{Ca}}\\]</p><p>\\[\\tau\\frac{d\\rho}{dt} = -\\rho(1-\\rho)(\\rho_\\star-\\rho) + \\gamma_p(1-\\rho)\\,\\Theta[c-\\theta_p] - \\gamma_d\\,\\rho\\,\\Theta[c-\\theta_d]\\]</p><p>Graupner & Brunel (2012), noise omitted. Between spikes c decays exponentially, so the time above each threshold is exact: \\(\\tau_{Ca}\\ln(c/\\theta)\\).</p>`;
    h += `<h3>Parameters and sources</h3><div class="table-scroll"><table class="wb-table"><thead><tr><th>Item</th><th>Default</th><th>Source</th></tr></thead><tbody>
      <tr><td>AMPA τ_r / τ_d</td><td>0.2 / 2 ms</td><td>Typical fast CA1 EPSC near body temperature</td></tr>
      <tr><td>NMDA τ_r / τ_d</td><td>2 / 80 ms</td><td>Within the 50–150 ms range of NMDA EPSC decays; Mg²⁺ block from Jahr & Stevens (1990)</td></tr>
      <tr><td>GABA_A τ_r / τ_d, E</td><td>0.5 / 8 ms, −70 mV</td><td>Fast perisomatic IPSCs; E_Cl near rest in adult CA1</td></tr>
      <tr><td>Kinetic rates (α, β), GABA_B cascade</td><td>see panel</td><td>Destexhe, Mainen & Sejnowski (1998), <i>Methods in Neuronal Modeling</i> ch. 1</td></tr>
      <tr><td>STP presets</td><td>see presets</td><td>Tsodyks & Markram (1997); Markram, Wang & Tsodyks (1998)</td></tr>
      <tr><td>Pair STDP τ₊ / τ₋</td><td>16.8 / 33.7 ms</td><td>Bi & Poo (2001) fit to hippocampal culture data</td></tr>
      <tr><td>Triplet STDP</td><td>visual cortex, all-to-all</td><td>Pfister & Gerstner (2006), J Neurosci 26:9673</td></tr>
      <tr><td>Calcium rule</td><td>cortical-slice fit</td><td>Graupner & Brunel (2012), PNAS 109:3991</td></tr></tbody></table></div>
      <p class="muted">Defaults are illustrative starting points. Check any value against the cited paper before using it in your own model.</p>`;
    return h;
  }
  function drawEq() { const e = $('sw-eq'); if (!e || e.closest('[hidden]')) return; e.innerHTML = eqHTML(); WB.typeset(e); }

  /* ---------- wiring ---------- */
  function loadPreset(k, over = {}) {
    presetKey = SW.PRESETS[k] ? k : 'ampa-psp'; base = { ...SW.DEF, ...SW.PRESETS[presetKey].s };
    S = { ...base, ...over }; delete S.preset;
    $('sw-note').innerHTML = `<b>${SW.PRESETS[presetKey].label}.</b> ${SW.PRESETS[presetKey].note}`;
    ratioRes = null; $('sw-ratio-sum').innerHTML = ''; const c = $('sw-ratio-cv'); if (c) { c._wb = null; c.getContext('2d').clearRect(0, 0, c.width, c.height); }
    buildPanel(); run();
  }
  function buildPanel() {
    WB.panel($('sw-panel'), schema(), S, (k, rebuild) => {
      if (k === 'nn' && S.rule === 'triplet') {
        const from = TRIPLET[S.nn === 'all' ? 'near' : 'all'], to = TRIPLET[S.nn];
        if (Object.keys(from).every(x => Math.abs(S[x] - from[x]) < 1e-12 * Math.max(1, Math.abs(from[x])))) { Object.assign(S, to); rebuild = true; }
      }
      if (rebuild) { const open = [...$('sw-panel').querySelectorAll('details')].map(d => d.open); buildPanel(); [...$('sw-panel').querySelectorAll('details')].forEach((d, i) => { if (open[i] !== undefined) d.open = open[i]; }); }
      schedule();
    });
  }
  window.renderSynapseWorkbench = function () {
    document.title = 'Synapse & plasticity workbench · Little Neural Guide';
    const q = WB.query.get(); const pk = SW.PRESETS[q.preset] ? q.preset : 'ampa-psp', tab = q.tab || SW.PRESETS[pk].tab; delete q.preset; delete q.tab; presetKey = pk;
    $('lesson').innerHTML = html(); document.body.classList.add('wb-wide');
    WB.bindTabs('sw-tabs', t => { if (t === 'eq') drawEq(); if (t === 'stp') drawSTP(); if (t === 'stdp') drawSTDP(); if (t === 'nmda') drawNMDA(); });
    $('sw-preset').addEventListener('change', e => { loadPreset(e.target.value); const t = SW.PRESETS[e.target.value].tab; if (t) WB.showTab('sw-tabs', t), drawSTDP(); });
    $('sw-reset').onclick = () => loadPreset(presetKey);
    $('sw-link').onclick = e => WB.copyLink(e.currentTarget);
    $('sw-pin').onclick = () => { if (!last) return; if (pins.length >= 4) pins.shift(); pins.push({ name: SW.PRESETS[presetKey].label.slice(0, 26) + (pins.length ? ' #' + (pins.length + 1) : ''), t: Array.from(last.t), y: Array.from(last.vc ? last.I : last.V), vc: last.vc, stp: S.stp ? { U: S.U, tauD: S.tauD, tauF: S.tauF } : null }); $('sw-unpin').hidden = false; draw(); drawSTP(); };
    $('sw-unpin').onclick = () => { pins = []; $('sw-unpin').hidden = true; draw(); drawSTP(); };
    ['sw-showcur', 'sw-showeff'].forEach(id => $(id).addEventListener('change', () => { $('sw-cur-wrap').hidden = !$('sw-showcur').checked; $('sw-eff-wrap').hidden = !$('sw-showeff').checked; requestAnimationFrame(draw); }));
    $('sw-ratio').onclick = runRatio;
    $('sw-dtca').addEventListener('change', e => { const v = +e.target.value; if (isFinite(v)) { S.dtca = Math.max(-150, Math.min(150, v)); drawSTDP(); WB.query.set({ preset: presetKey, ...S }, base, ['preset']); } });
    pins = []; loadPreset(pk, q);
    if (tab) { WB.showTab('sw-tabs', tab); requestAnimationFrame(() => { drawSTDP(); drawSTP(); drawNMDA(); drawEq(); }); }
  };
})();
