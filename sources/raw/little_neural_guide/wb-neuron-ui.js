/* ===================== NEURON WORKBENCH · PAGE =====================
   Route /workbench/neuron/ (?preset=ca1-res&g_h=0.1 …). One model, many levels of detail:
   pick a preset, change any parameter, and read the result as traces, an f–I curve, an impedance profile,
   a voltage-clamp I–V, a standard electrophysiology battery or a phase-plane trajectory.
   Every setup can be pinned for comparison, shared as a link, and exported to Python. */
(function () {
  'use strict';
  const $ = WB.$, F = WB.fmt;
  let S = null, base = null, presetKey = 'ca1', last = null, pins = [], panelCtl = null, runT = null, fiRes = null, zRes = null, ivRes = null;
  const MODEL_NAMES = { lif: 'Leaky integrate-and-fire', adex: 'Adaptive exponential IF', izh: 'Izhikevich', cond: 'Conductance-based' };

  /* ---------- schema ---------- */
  function schema() {
    const cond = S.model === 'cond', u = NW.unitOf(S);
    const ampR = u === 'nA' ? [-1, 2, 0.005] : u === 'a.u.' ? [-20, 40, 0.1] : [-20, 100, 0.05];
    const chans = NW.CH_ORDER.map(ch => {
      const c = NW.NCH[ch];
      return [{ k: 'on_' + ch, type: 'check', about: true, label: `<b>${c.label}</b>`, help: `${c.bio} <i>${c.ref}.</i>` },
        { k: 'g_' + ch, label: S.comp === 2 ? 'ḡ soma' : 'ḡ', unit: 'mS/cm²', min: 0, max: Math.max(c.g * 3, 1), step: c.g >= 10 ? 0.5 : 0.001, show: s => s['on_' + ch] },
        { k: 'gd_' + ch, label: 'ḡ dendrite', unit: 'mS/cm²', min: 0, max: Math.max(c.g * 3, 1), step: c.g >= 10 ? 0.5 : 0.001, show: s => s['on_' + ch] && s.comp === 2 }];
    }).flat();
    const kin = [
      { k: 'VT', label: 'V_T (Traub Na⁺/K⁺ shift)', unit: 'mV', min: -70, max: -40, step: 0.5, show: s => s.on_na || s.on_kdr, help: 'Shifts both Traub gates along the voltage axis; more negative = lower spike threshold.' },
      { k: 'km_taumax', label: 'M-current τ_max', unit: 'ms', min: 50, max: 3000, step: 10, show: s => s.on_km },
      { k: 'h_Vhalf', label: 'Ih half-activation', unit: 'mV', min: -110, max: -60, step: 0.5, show: s => s.on_h, help: 'Magee (1998) found more depolarized values distally in CA1 dendrites.' },
      { k: 'h_k', label: 'Ih slope factor', unit: 'mV', min: 3, max: 15, step: 0.1, show: s => s.on_h },
      { k: 'h_tau', label: 'Ih peak τ', unit: 'ms', min: 5, max: 500, step: 1, show: s => s.on_h, help: 'HCN1-rich CA1 dendrites are fast (tens of ms); HCN2/4 are much slower. τ sets the resonance frequency.' },
      { k: 'h_Vtau', label: 'Ih V at peak τ', unit: 'mV', min: -110, max: -50, step: 0.5, show: s => s.on_h },
      { k: 'cat_Vx', label: 'T-current shift V_x', unit: 'mV', min: -10, max: 10, step: 0.5, show: s => s.on_cat },
      { k: 'kahp_Kd', label: 'AHP half-activation [Ca]', unit: 'mM', min: 1e-5, max: 0.01, log: true, show: s => s.on_kahp },
      { k: 'kahp_tau', label: 'AHP gate τ', unit: 'ms', min: 5, max: 2000, step: 5, show: s => s.on_kahp },
    ];
    const protoOpts = [['step', 'Current step'], ['ramp', 'Current ramp'], ['pulses', 'Pulse train'], ['sine', 'Sinusoid'], ['chirp', 'ZAP / chirp'], ['ou', 'Noisy current (OU)']];
    if (S.model !== 'izh') protoOpts.push(['pc', 'Synaptic bombardment (point-conductance)']);
    if (cond) protoOpts.push(['vstep', 'Voltage-clamp step']);
    const P = p => s => s.proto === p, notV = s => s.proto !== 'vstep' && s.proto !== 'pc';
    const groups = [
      { title: 'Model', items: [{ k: 'model', type: 'seg', label: 'Level of detail', rebuild: true, options: [['lif', 'LIF'], ['adex', 'AdEx'], ['izh', 'Izhikevich'], ['cond', 'Channels']], help: 'From a threshold unit to explicit ion channels. Switching keeps the stimulus.' }] },
    ];
    if (cond) groups.push(
      { title: 'Membrane & morphology', items: [
        { k: 'comp', type: 'seg', label: 'Compartments', rebuild: true, options: [[1, 'Soma'], [2, 'Soma + dendrite']], help: 'Two compartments use Pinsky–Rinzel coupling: each sees the other through a coupling conductance g_c.' },
        { k: 'area', label: 'Total membrane area', unit: 'µm²', min: 20, max: 100000, log: true, help: 'Converts nA to current density, and sets channel numbers for noise. A 96 × 96 µm cylinder is ≈29 000 µm².' },
        { k: 'Cm', label: 'C_m', unit: 'µF/cm²', min: 0.5, max: 2, step: 0.01, help: 'Specific capacitance; ≈1 µF/cm² for most membranes, ~2 effective with spines folded in.' },
        { k: 'gL', label: 'g_leak (soma)', unit: 'mS/cm²', min: 0.001, max: 1, log: true },
        { k: 'gLd', label: 'g_leak (dendrite)', unit: 'mS/cm²', min: 0.001, max: 1, log: true, show: s => s.comp === 2 },
        { k: 'EL', label: 'E_leak', unit: 'mV', min: -95, max: -40, step: 0.1 },
        { k: 'p', label: 'Soma area fraction p', min: 0.05, max: 0.95, step: 0.01, show: s => s.comp === 2 },
        { k: 'gc', label: 'Coupling g_c', unit: 'mS/cm²', min: 0.01, max: 20, log: true, show: s => s.comp === 2, help: 'Low g_c = electrotonically distant dendrite.' },
        { k: 'site', type: 'seg', label: 'Inject / synapses at', options: [['s', 'Soma'], ['d', 'Dendrite']], show: s => s.comp === 2 },
        { k: 'iunit', type: 'seg', label: 'Current units', rebuild: true, options: [['nA', 'Total (nA)'], ['dens', 'Density (µA/cm²)']] },
      ] },
      { title: 'Ion channels', badge: 'toggle & scale', items: chans },
      { title: 'Reversal potentials', open: false, items: [
        { k: 'ENa', label: 'E_Na', unit: 'mV', min: 20, max: 80, step: 0.5 }, { k: 'EK', label: 'E_K', unit: 'mV', min: -110, max: -60, step: 0.5 },
        { k: 'Eh', label: 'E_h', unit: 'mV', min: -50, max: -10, step: 0.5, show: s => s.on_h },
        { k: 'camode', type: 'seg', label: 'E_Ca', options: [['fixed', 'Fixed'], ['nernst', 'Nernst from [Ca]ᵢ']], show: s => s.on_cal || s.on_cat },
        { k: 'ECa', label: 'E_Ca (fixed)', unit: 'mV', min: 50, max: 150, step: 1, show: s => (s.on_cal || s.on_cat) && s.camode === 'fixed' },
        { k: 'cao', label: '[Ca]ₒ', unit: 'mM', min: 0.5, max: 5, step: 0.1, show: s => (s.on_cal || s.on_cat) && s.camode === 'nernst' },
      ] },
      { title: 'Kinetics & temperature', open: false, items: [
        { k: 'temp', label: 'Temperature', unit: '°C', min: 0, max: 40, step: 0.1, help: 'Each channel’s τ is divided by φ = Q₁₀^((T − T_ref)/10). The HH squid kinetics are referenced to 6.3 °C, the Traub/Pospischil channels to 36 °C.' },
        ...kin] },
      { title: 'Calcium pool', open: false, show: s => s.on_cal || s.on_cat || s.on_kahp, items: [
        { k: 'ca_tau', label: 'Decay τ', unit: 'ms', min: 1, max: 500, step: 1 }, { k: 'ca_depth', label: 'Shell depth', unit: 'µm', min: 0.05, max: 5, step: 0.05 }, { k: 'ca_inf', label: 'Resting [Ca]ᵢ', unit: 'mM', min: 1e-5, max: 1e-3, log: true },
        { type: 'note', html: 'd[Ca]/dt = −k·I_Ca + ([Ca]_∞ − [Ca])/τ, with k = 10⁴/(2F·depth). From Destexhe’s cad.mod (Pospischil et al. 2008).' }] },
      { title: 'Channel noise', open: false, items: [
        { k: 'noise', type: 'check', label: 'Stochastic gating (Langevin)', help: 'Each gate gets noise of variance (α(1−x)+βx)/N per unit time, with N = ḡ·area/γ channels (Fox & Lu 1994). Accurate for large N; for tiny patches use Markov simulation (Goldwyn & Shea-Brown 2011).' },
        { k: 'nseed', label: 'Noise seed', min: 1, max: 99, step: 1, show: s => s.noise }] });
    if (S.model === 'lif') groups.push({ title: 'LIF parameters', items: [
      { k: 'lif_C', label: 'C', unit: 'pF', min: 10, max: 1000, step: 1 }, { k: 'lif_gL', label: 'g_L', unit: 'nS', min: 1, max: 100, step: 0.5 }, { k: 'lif_EL', label: 'E_L', unit: 'mV', min: -90, max: -40, step: 0.5 },
      { k: 'lif_Vth', label: 'Threshold', unit: 'mV', min: -65, max: -30, step: 0.5 }, { k: 'lif_Vr', label: 'Reset', unit: 'mV', min: -90, max: -40, step: 0.5 }, { k: 'lif_tref', label: 'Refractory', unit: 'ms', min: 0, max: 20, step: 0.1 },
      { k: 'lif_b', label: 'Spike-triggered adaptation b', unit: 'pA', min: 0, max: 200, step: 1 }, { k: 'lif_tauw', label: 'Adaptation τ_w', unit: 'ms', min: 5, max: 1000, step: 5, show: s => s.lif_b > 0 }] });
    if (S.model === 'adex') groups.push({ title: 'AdEx parameters', items: [
      { k: 'adex_C', label: 'C', unit: 'pF', min: 10, max: 1000, step: 1 }, { k: 'adex_gL', label: 'g_L', unit: 'nS', min: 1, max: 100, step: 0.5 }, { k: 'adex_EL', label: 'E_L', unit: 'mV', min: -90, max: -40, step: 0.5 },
      { k: 'adex_VT', label: 'V_T', unit: 'mV', min: -65, max: -30, step: 0.5 }, { k: 'adex_DT', label: 'Δ_T (spike sharpness)', unit: 'mV', min: 0.1, max: 10, step: 0.1 },
      { k: 'adex_a', label: 'Subthreshold adaptation a', unit: 'nS', min: -20, max: 60, step: 0.5, help: 'a > 0 behaves like a slow restoring current (Ih-like resonance, M-like adaptation); a < 0 is amplifying.' },
      { k: 'adex_tauw', label: 'τ_w', unit: 'ms', min: 5, max: 1000, step: 5 }, { k: 'adex_b', label: 'Spike-triggered b', unit: 'pA', min: 0, max: 300, step: 1 },
      { k: 'adex_Vr', label: 'Reset V_r', unit: 'mV', min: -80, max: -30, step: 0.5 }, { k: 'adex_Vpk', label: 'Spike cut-off', unit: 'mV', min: -30, max: 30, step: 1 }] });
    if (S.model === 'izh') groups.push({ title: 'Izhikevich parameters', items: [
      { k: 'izh_a', label: 'a (recovery rate)', min: 0.001, max: 0.2, step: 0.001 }, { k: 'izh_b', label: 'b (recovery sensitivity)', min: -0.5, max: 0.5, step: 0.005 },
      { k: 'izh_c', label: 'c (reset)', unit: 'mV', min: -80, max: -40, step: 0.5 }, { k: 'izh_d', label: 'd (reset jump of u)', min: -5, max: 15, step: 0.1 }] });
    groups.push({ title: 'Stimulus', items: [
      { k: 'proto', type: 'select', label: 'Protocol', options: protoOpts, rebuild: true },
      { k: 'amp', label: S.proto === 'ramp' ? 'Start amplitude' : S.proto === 'ou' ? 'Mean' : 'Amplitude', unit: u, min: ampR[0], max: ampR[1], step: ampR[2], show: notV },
      { k: 'ramp1', label: 'End amplitude', unit: u, min: ampR[0], max: ampR[1], step: ampR[2], show: P('ramp') },
      { k: 'dc', label: 'Holding (DC) current', unit: u, min: ampR[0] / 2, max: ampR[1] / 2, step: ampR[2], show: notV, help: 'Shifts the operating voltage, e.g. to test resonance at depolarized vs hyperpolarized potentials.' },
      { k: 'freq', label: 'Frequency', unit: 'Hz', min: 0.5, max: 200, step: 0.5, show: s => s.proto === 'sine' || s.proto === 'pulses' },
      { k: 'npulse', label: 'Number of pulses', min: 1, max: 50, step: 1, show: P('pulses') }, { k: 'pw', label: 'Pulse width', unit: 'ms', min: 0.1, max: 50, step: 0.1, show: P('pulses') },
      { k: 'f0', label: 'Start frequency', unit: 'Hz', min: 0.1, max: 10, step: 0.1, show: P('chirp') }, { k: 'f1', label: 'End frequency', unit: 'Hz', min: 2, max: 100, step: 0.5, show: P('chirp') },
      { k: 'sigma', label: 'Noise σ', unit: u, min: 0, max: Math.abs(ampR[1]) / 2, step: ampR[2], show: P('ou') }, { k: 'taun', label: 'Noise τ', unit: 'ms', min: 0.5, max: 100, step: 0.5, show: P('ou') },
      { k: 'pc_ge', label: 'Mean g_e', unit: 'µS', min: 0, max: 0.1, step: 0.0005, show: P('pc') }, { k: 'pc_gi', label: 'Mean g_i', unit: 'µS', min: 0, max: 0.2, step: 0.0005, show: P('pc') },
      { k: 'pc_se', label: 'σ_e', unit: 'µS', min: 0, max: 0.03, step: 0.0005, show: P('pc') }, { k: 'pc_si', label: 'σ_i', unit: 'µS', min: 0, max: 0.03, step: 0.0005, show: P('pc') },
      { k: 'vhold', label: 'Holding voltage', unit: 'mV', min: -120, max: -30, step: 0.5, show: P('vstep') }, { k: 'vcmd', label: 'Command voltage', unit: 'mV', min: -120, max: 60, step: 0.5, show: P('vstep') },
      { k: 'delay', label: 'Onset', unit: 'ms', min: 0, max: 2000, step: 1 }, { k: 'dur', label: 'Duration', unit: 'ms', min: 1, max: 20000, step: 1 }, { k: 'tstop', label: 'Simulated time', unit: 'ms', min: 10, max: 20000, step: 1 },
      { k: 'seed', label: 'Stimulus seed', min: 1, max: 999, step: 1, show: s => s.proto === 'ou' || s.proto === 'pc' }] });
    groups.push({ title: 'Numerics', open: false, items: [
      { k: 'method', type: 'seg', label: 'Integration', show: () => cond, options: [['rl', 'Exponential Euler'], ['euler', 'Forward Euler']], help: 'Exponential Euler treats each gate (Rush &amp; Larsen 1978) and the voltage as exact exponential relaxation with everything else frozen over Δt, and updates them in staggered order (gates half a step ahead of V), as NEURON does. That makes it second-order accurate: at the default Δt = 0.025 ms spike times in every preset agree with Δt/4 to within ~0.7 ms. Forward Euler is kept for comparison. The Python export uses the same scheme.' },
      { k: 'dt', label: 'Time step Δt', unit: 'ms', min: 0.001, max: 0.5, log: true, help: 'Halve it: if the result changes, it was not converged.' },
      { k: 'settle', label: 'Pre-run to rest', unit: 'ms', min: 0, max: 3000, step: 10, show: () => cond, help: 'Runs without input first so slow gates (M, Ih) start at their true resting values.' }] });
    return groups;
  }

  /* ---------- page ---------- */
  function presetPicker() {
    const groups = {}; Object.entries(NW.PRESETS).forEach(([k, p]) => (groups[p.group] = groups[p.group] || []).push([k, p]));
    return `<label class="wb-presetlab" for="nw-preset">Start from</label><select id="nw-preset">${Object.entries(groups).map(([g, l]) => `<optgroup label="${g}">${l.map(([k, p]) => `<option value="${k}" ${k === presetKey ? 'selected' : ''}>${p.label}</option>`).join('')}</optgroup>`).join('')}</select>`;
  }
  function html() {
    return `<nav class="breadcrumbs"><a href="/">Home</a> › <a href="/workbench/">Workbenches</a> › <span>Neuron</span></nav>
    <div class="hero wb-hero"><span class="pill">WORKBENCH · ONE NEURON, ANY LEVEL OF DETAIL</span><h1>Neuron workbench</h1>
    <p class="lead">Everything the separate HH, channel, resonance and patch-clamp pages did, in one model. Choose how much biology to include, from a leaky integrate-and-fire unit to a two-compartment CA1 cell with Ih, M, A-type and Ca²⁺ currents, then measure it the way an electrophysiologist would.</p></div>
    <div class="wb-bar">${presetPicker()}<div class="wb-bar-actions"><button class="secondary" id="nw-reset">Reset preset</button><button class="secondary" id="nw-pin">Pin this run</button><button class="secondary" id="nw-unpin" hidden>Clear pins</button><button class="secondary" id="nw-link">Copy link to this setup</button></div></div>
    <p class="wb-presetnote" id="nw-note"></p>
    <div class="wb-layout">
      <div class="wb-panel" id="nw-panel" aria-label="Model controls"></div>
      <div class="wb-main">
        ${WB.tabs('nw-tabs', [['traces', 'Traces'], ['fi', 'f–I curve'], ['z', 'Impedance'], ['iv', 'Voltage clamp I–V'], ['bat', 'Ephys battery'], ['phase', 'Phase plane'], ['code', 'Python'], ['eq', 'Equations']])}
        <div data-pane-of="nw-tabs" data-pane="traces">
          <div class="wb-summary" id="nw-sum" aria-live="polite"></div>
          ${WB.figure('nw-v', 'Membrane potential', 270)}
          ${WB.figure('nw-i', 'Input', 120)}
          <div class="wb-toggles"><label><input type="checkbox" id="nw-showcur"> Ionic currents</label><label><input type="checkbox" id="nw-showgate"> Gating variables</label><label><input type="checkbox" id="nw-showca"> [Ca²⁺]ᵢ</label></div>
          <div id="nw-cur-wrap" hidden>${WB.figure('nw-cur', 'Ionic currents (outward positive)', 220)}</div>
          <div id="nw-gate-wrap" hidden>${WB.figure('nw-gate', 'Gating variables', 200)}</div>
          <div id="nw-ca-wrap" hidden>${WB.figure('nw-ca', 'Submembrane [Ca²⁺]ᵢ', 150)}</div>
        </div>
        <div data-pane-of="nw-tabs" data-pane="fi" hidden>
          <p class="wb-help">Firing rate during a 1 s step at each amplitude. <b>Steady</b> counts every spike; <b>initial</b> is 1/(first ISI). A gap between them is adaptation. A curve that starts at a finite rate is class II excitability (HH); one that starts from zero is class I.</p>
          <div class="wb-inline"><label>From <input type="number" id="fi-a" step="any"></label><label>to <input type="number" id="fi-b" step="any"></label><label>points <input type="number" id="fi-n" value="16" min="3" max="60"></label><button class="primary" id="fi-run">Run f–I sweep</button><span class="wb-prog" id="fi-prog"></span></div>
          ${WB.figure('nw-fi', 'f–I curve', 280)}<div class="wb-summary" id="fi-sum"></div></div>
        <div data-pane-of="nw-tabs" data-pane="z" hidden>
          <p class="wb-help">A small chirp (0.2 → 20 Hz) is injected and Z(f) = V̂(f)/Î(f) is estimated from the spectra. The peak of |Z| is the resonance frequency f_R (interpolated between frequency bands); Q = |Z(f_R)|/|Z(0.5 Hz)| (Hu et al. 2002), with |Z(0.5 Hz)| measured by a separate steady 0.5 Hz sine because a short chirp gives too few slow cycles. With two compartments, f_R and Q describe the input impedance at the injection site. Checked against the exact impedance of the linear AdEx model: f_R within ~5%, Q within ~2%. Positive phase means the voltage <i>leads</i> the current, the signature of an inductive (Ih/M-like) current. Use the holding current (Stimulus) to move the operating voltage.</p>
          <div class="wb-inline"><button class="primary" id="z-run">Measure impedance</button><span class="wb-prog" id="z-prog"></span></div>
          ${WB.figure('nw-zm', 'Impedance amplitude |Z(f)|', 250)}${WB.figure('nw-zp', 'Impedance phase', 190)}<div class="wb-summary" id="z-sum"></div></div>
        <div data-pane-of="nw-tabs" data-pane="iv" hidden>
          <p class="wb-help">Ideal voltage clamp of the soma: hold, step to each command voltage, and record the clamp current (ionic, without the capacitive transient). Untick channels in the panel to isolate one current, as with TTX or TEA. In two compartments the dendrite is <i>not</i> clamped (space-clamp error).</p>
          <div class="wb-inline"><label>V from <input type="number" id="iv-a" value="-100" step="any"></label><label>to <input type="number" id="iv-b" value="40" step="any"></label><label>step <input type="number" id="iv-s" value="5" step="any"></label><button class="primary" id="iv-run">Run I–V</button><span class="wb-prog" id="iv-prog"></span></div>
          ${WB.figure('nw-iv', 'I–V relation', 280)}<div class="wb-summary" id="iv-sum"></div></div>
        <div data-pane-of="nw-tabs" data-pane="bat" hidden>
          <p class="wb-help">The standard features reported for a patch-clamped cell: input resistance and time constant from a small hyperpolarizing step, sag and rebound from a large one, rheobase by bisection, then firing and spike shape at 1.5 × rheobase. The right column gives published measurements from rat CA1 pyramidal cells in slices, with their source; rows without a checked reference say so.</p>
          <div class="wb-inline"><button class="primary" id="bat-run">Run the battery</button><span class="wb-prog" id="bat-prog"></span></div><div id="bat-out"></div></div>
        <div data-pane-of="nw-tabs" data-pane="phase" hidden>
          <p class="wb-help">The last run’s trajectory projected onto voltage and one slow variable. Spikes are loops; adaptation drifts the loops; resonance is a spiral. For nullclines and fixed points of reduced models, open the phase-plane workbench.</p>
          <div class="wb-inline"><label>Slow variable <select id="ph-var"></select></label><a class="secondary" id="ph-link" href="/workbench/phase-plane/">Open in phase-plane workbench →</a></div>
          ${WB.figure('nw-ph', 'Trajectory in state space', 340, 'green dot = start, red dot = end')}</div>
        <div data-pane-of="nw-tabs" data-pane="code" hidden>
          <p class="wb-help">This script reproduces the current model and stimulus with NumPy: the same rate expressions, integration scheme and units. It updates as you change the controls. Press ▶ Run here, or take it to Colab or Jupyter.</p>
          ${WB.codeBlock('nw-code', '# loading…')}</div>
        <div data-pane-of="nw-tabs" data-pane="eq" hidden><div id="nw-eq"></div></div>
      </div>
    </div>
    ${WB.related([['/topics/channels/membrane-circuit/', 'Membrane as a circuit'], ['/topics/channels/hh-gates/', 'HH gates'], ['/lab/hh/', 'HH model lab (guided tour)'], ['/topics/ca1-resonance/ih-and-m-current/', 'Ih & M-current'], ['/topics/ca1-resonance/chirp-input/', 'Chirp inputs'], ['/topics/dynamics/resonance-measurement/', 'Resonance & measurement'], ['/experiments/ephys/', 'Patch clamp → model'], ['/biology/neuron-lab/', 'Neuron lab: real morphologies'], ['/biology/dendritic-resonance/', 'Resonance in real dendrites']])}`;
  }

  /* ---------- run + draw ---------- */
  const unitLabel = () => last && last.vc ? last.Iunit : NW.unitOf(S);
  function run() {
    const t0 = performance.now();
    try { last = NW.simulate(S); } catch (e) { $('nw-sum').innerHTML = `<b>Model error:</b> ${WB.esc(e.message)}`; return; }
    last.ms = performance.now() - t0; draw(); WB.setCode('nw-code', NW.pythonCode(S)); WB.query.set({ preset: presetKey, ...S }, base, ['preset']);
    fillPhaseVars();
  }
  const schedule = () => { clearTimeout(runT); runT = setTimeout(run, S.tstop * (S.model === 'cond' ? S.comp : 0.2) > 6000 ? 160 : 40); };
  function summary() {
    const r = last, sp = r.spikes, inStim = sp.filter(t => t >= S.delay && t < S.delay + S.dur), d = S.dur / 1000;
    const i0 = Math.max(0, r.t.findIndex(t => t >= S.delay) - 1), vrest = r.V[i0];
    const parts = [];
    if (r.blowup) parts.push(`<b class="wb-warn">The simulation became unstable at ${F(r.blowup)} ms.</b> Reduce Δt or switch gates to exponential integration.`);
    if (r.vc) {
      let mn = Infinity, mx = -Infinity; r.I.forEach(v => { if (v < mn) mn = v; if (v > mx) mx = v; });
      parts.push(`Clamp ${F(S.vhold)} → ${F(S.vcmd)} mV. Peak inward <b>${F(Math.min(mn, 0))} ${r.Iunit}</b>, peak outward <b>${F(Math.max(mx, 0))} ${r.Iunit}</b>.`);
    } else {
      parts.push(`<b>${sp.length}</b> spike${sp.length === 1 ? '' : 's'}${inStim.length && d > 0 ? ` · <b>${F(inStim.length / d)} Hz</b> during the stimulus` : ''}`);
      parts.push(`V before stimulus <b>${F(vrest)} mV</b>`);
      if (inStim.length > 2) { const isi = inStim.slice(1).map((t, i) => t - inStim[i]); parts.push(`ISI ${F(isi[0])} → ${F(isi.at(-1))} ms${isi.at(-1) > 1.3 * isi[0] ? ' (adapting)' : ''}`); parts.push(`CV(ISI) ${(WB.std(isi) / WB.mean(isi)).toFixed(2)}`); }
      if (inStim.length) parts.push(`first-spike latency ${F(inStim[0] - S.delay)} ms`);
      if (r.Vd) parts.push(`dendritic spikes ${r.spikesD.length}`);
    }
    parts.push(`<span class="muted">${F(S.tstop)} ms simulated in ${F(r.ms, 2)} ms</span>`);
    $('nw-sum').innerHTML = parts.join(' · ');
  }
  function draw() {
    if (!last) return; summary(); const P = WB.pal(), r = last;
    const ser = [{ x: r.t, y: r.V, label: r.Vd ? 'soma' : 'V', color: P.s[0] }];
    if (r.Vd) ser.push({ x: r.t, y: r.Vd, label: 'dendrite', color: P.s[1] });
    pins.forEach((p, i) => ser.unshift({ x: p.t, y: p.V, ghost: true, label: 'pin ' + (i + 1) + ': ' + p.name, width: 1.3 }));
    WB.plot($('nw-v'), { series: ser, xlabel: 'time (ms)', ylabel: 'V (mV)', yunit: 'mV', xlim: [0, S.tstop] });
    const iser = [{ x: r.t, y: r.I, label: r.vc ? 'clamp current' : 'injected', color: P.ink, width: 1.4 }];
    WB.plot($('nw-i'), { series: iser, xlabel: 'time (ms)', ylabel: unitLabel(), xlim: [0, S.tstop], legend: false });
    if ($('nw-showcur').checked) { const ks = Object.keys(r.cur); WB.plot($('nw-cur'), { series: ks.map((k, i) => ({ x: r.t, y: r.cur[k], label: k === 'leak' ? 'leak' : NW.NCH[k].label.split(' (')[0], color: P.s[i % 8], width: 1.4 })), xlabel: 'time (ms)', ylabel: unitLabel(), xlim: [0, S.tstop] }); }
    if ($('nw-showgate').checked) { const ks = Object.keys(r.gates); WB.plot($('nw-gate'), { series: ks.map((k, i) => ({ x: r.t, y: r.gates[k], label: k.replace('.', ' · '), color: P.s[i % 8], width: 1.4 })).concat(r.w ? [{ x: r.t, y: r.w, label: 'w (pA)', color: P.s[0] }] : []), xlabel: 'time (ms)', ylabel: 'open fraction', xlim: [0, S.tstop], ylim: r.w ? undefined : [0, 1] }); }
    if ($('nw-showca').checked && r.Ca) WB.plot($('nw-ca'), { series: [{ x: r.t, y: Array.from(r.Ca, v => v * 1000), label: '[Ca]ᵢ', color: P.s[2] }], xlabel: 'time (ms)', ylabel: 'µM', xlim: [0, S.tstop], legend: false });
    drawPhase(); drawFI(); drawZ(); drawIV();
  }
  function fillPhaseVars() {
    const sel = $('ph-var'); if (!sel || !last) return; const cur = sel.value;
    const opts = S.model === 'cond' ? Object.keys(last.gates) : ['w'];
    sel.innerHTML = opts.map(k => `<option value="${k}">${k === 'w' ? (S.model === 'izh' ? 'u (recovery)' : 'w (adaptation, pA)') : k.replace('.', ' · ')}</option>`).join('');
    const pref = opts.includes(cur) ? cur : opts.find(k => /km\.p|h\.y|hh_k\.n|kdr\.n/.test(k)) || opts[0]; if (pref) sel.value = pref;
    const map = { izh: 'izhikevich', adex: 'adex' }, pp = map[S.model] || (S.on_hh_na ? 'hh-reduced' : 'morris-lecar');
    $('ph-link').href = '/workbench/phase-plane/?sys=' + pp;
  }
  function drawPhase() {
    const cv = $('nw-ph'), k = $('ph-var') && $('ph-var').value; if (!cv || !last || !k) return;
    const y = k === 'w' ? last.w : last.gates[k]; if (!y) return; const P = WB.pal();
    WB.plot(cv, { series: [{ x: Array.from(last.V), y: Array.from(y), color: P.s[0], width: 1.2, noHover: true }], xlabel: 'V (mV)', ylabel: k, noHover: true, legend: false,
      marks: [{ x: last.V[0], y: y[0], color: P.s[3] }, { x: last.V[last.V.length - 1], y: y[y.length - 1], color: P.s[6] }] });
  }
  /* f–I */
  function fiDefaults() { const u = NW.unitOf(S); const hi = u === 'nA' ? Math.max(1, Math.abs(S.amp) * 2) : u === 'a.u.' ? 20 : 20; $('fi-a').value = 0; $('fi-b').value = +hi.toPrecision(3); }
  function runFI() {
    const a = +$('fi-a').value, b = +$('fi-b').value, n = Math.max(3, Math.min(60, +$('fi-n').value | 0)), amps = WB.linspace(a, b, n);
    $('fi-run').disabled = true;
    WB.chunked(amps, x => NW.fiPoint(S, x), p => $('fi-prog').textContent = Math.round(p * 100) + '%', out => {
      fiRes = out; drawFI();
      const u = NW.unitOf(S), firing = out.filter(o => o.n > 0), gain = firing.length > 2 ? (firing.at(-1).rate - firing[0].rate) / (firing.at(-1).amp - firing[0].amp) : NaN;
      const done = txt => { $('fi-run').disabled = false; $('fi-prog').textContent = ''; $('fi-sum').innerHTML = txt + ` · gain <b>${F(gain)} Hz/${u}</b>`; };
      /* Excitability class is defined by the onset of REPETITIVE firing (Hodgkin 1948). A transient onset spike, such as HH
         gives just above its single-spike threshold, does not count: only spikes after the first 200 ms of the step do.
         The grid only brackets that onset; bisection then finds it, so the verdict does not depend on how many points were chosen. */
      const rep = amp => { const r = NW.simulate({ ...S, proto: 'step', amp, dc: 0, delay: 50, dur: 1000, tstop: 1050 }, { full: false, rec: 1e9 }), late = r.spikes.filter(t => t >= 250);
        return { amp, ok: late.length >= 2, rate: late.length >= 2 ? 1000 * (late.length - 1) / (late.at(-1) - late[0]) : 0, any: r.spikes.filter(t => t >= 50).length }; };
      let j = 0, prevAmp = null, onsetOnly = null; $('fi-prog').textContent = 'finding repetitive-firing onset…';
      const scan = () => {
        if (j >= out.length) return done('No sustained (repetitive) firing at any amplitude tested' + (onsetOnly ? `; only onset spikes, from ${F(onsetOnly)} ${u}` : '') + ': raise the upper end.');
        const r = rep(out[j].amp); if (!onsetOnly && r.any) onsetOnly = r.amp;
        if (!r.ok) { prevAmp = r.amp; j++; return setTimeout(scan, 0); }
        if (prevAmp === null) return done(`Fires repetitively at the lowest amplitude tested (${F(out[0].amp)} ${u}): lower <b>From</b> so the sweep brackets the onset.`);
        let lo = prevAmp, hi = r.amp, top = r, it = 0; $('fi-prog').textContent = 'refining onset…';
        const step = () => { const mid = (lo + hi) / 2, q = rep(mid); if (q.ok) { hi = mid; top = q; } else lo = mid;
          if (++it < 10 && hi - lo > 1e-4 * Math.max(1, Math.abs(hi))) return setTimeout(step, 0);
          const single = onsetOnly !== null && onsetOnly < lo ? ` Below the onset it fires only a transient spike at the start of the step (seen from ${F(onsetOnly, 3)} ${u}, the lowest tested amplitude that spiked).` : '';
          done(`Repetitive firing starts at <b>${F(hi, 4)} ${u}</b> (bisected to ±${F((hi - lo) / 2, 2)}) at <b>${F(top.rate)} Hz</b> ${top.rate > 10 ? '(jumps to a finite rate: class II-like)' : '(starts near zero: class I-like)'}.${single}<br><span class="muted">Rate from the mean interspike interval after the first 200 ms. Class is a property of the onset, not of the whole curve (Hodgkin 1948; Izhikevich 2007, ch. 1).</span>`); };
        setTimeout(step, 0);
      };
      setTimeout(scan, 0);
    });
  }
  function drawFI() {
    if (!fiRes || !$('nw-fi')) return; const P = WB.pal(), x = fiRes.map(o => o.amp);
    const ser = [{ x, y: fiRes.map(o => o.rate), label: 'steady (all spikes / 1 s)', color: P.s[0] }, { x, y: fiRes.map(o => o.init), label: 'initial (1 / first ISI)', color: P.s[1], dash: [5, 3] }, { x, y: fiRes.map(o => o.rate), points: true, color: P.s[0], radius: 5, noLegend: true }];
    pins.filter(p => p.fi).forEach((p, i) => ser.unshift({ x: p.fi.map(o => o.amp), y: p.fi.map(o => o.rate), ghost: true, label: 'pin: ' + p.name }));
    WB.plot($('nw-fi'), { series: ser, xlabel: `input (${NW.unitOf(S)})`, ylabel: 'rate (Hz)', yunit: 'Hz' });
  }
  /* impedance */
  function runZ() {
    $('z-run').disabled = true; $('z-prog').textContent = 'running…';
    setTimeout(() => {
      zRes = NW.impedance(S); $('z-run').disabled = false; $('z-prog').textContent = ''; drawZ();
      const two = zRes.comps === 2, w = zRes.spikes ? `<b class="wb-warn">The chirp evoked ${zRes.spikes} spikes; impedance assumes a subthreshold, near-linear response. Lower the amplitude or the holding current.</b> ` : '';
      $('z-sum').innerHTML = w + `Resonance frequency of the ${two ? (zRes.site === 'd' ? 'dendritic input' : 'somatic input') : 'input'} impedance <b>f_R = ${F(zRes.fR, 2)} Hz</b> · Q = <b>${F(zRes.Q, 3)}</b>${zRes.Q < 1.02 ? ' (no resonance: a low-pass filter)' : ''} · |Z|max <b>${F(zRes.zmax)} ${zRes.Zunit}</b> · chirp amplitude ${F(zRes.amp)} ${NW.unitOf(S)}${two ? ` · injected at the <b>${zRes.site === 'd' ? 'dendrite' : 'soma'}</b>` : ''}`;
    }, 20);
  }
  function drawZ() {
    if (!zRes || !$('nw-zm')) return; const P = WB.pal(), f = zRes.res.map(x => x.f), two = zRes.comps === 2, d = zRes.site === 'd';
    const loc = two ? (d ? 'magD' : 'mag') : 'mag', tr = d ? 'mag' : 'magD', locP = two ? (d ? 'phD' : 'ph') : 'ph', trP = d ? 'ph' : 'phD';
    const ser = [{ x: f, y: zRes.res.map(x => x[loc]), label: two ? 'input (local) impedance' : '|Z|', color: P.s[0] }];
    if (two) ser.push({ x: f, y: zRes.res.map(x => x[tr]), label: 'transfer impedance', color: P.s[1] });
    pins.filter(p => p.z).forEach(p => ser.unshift({ x: p.z.res.map(x => x.f), y: p.z.res.map(x => x.mag), ghost: true, label: 'pin: ' + p.name }));
    WB.plot($('nw-zm'), { series: ser, logx: true, xlabel: 'frequency (Hz)', ylabel: `|Z| (${zRes.Zunit})`, vlines: [{ x: zRes.fR, label: 'f_R', color: P.s[0] }] });
    const ps = [{ x: f, y: zRes.res.map(x => x[locP]), label: 'local', color: P.s[0] }]; if (two) ps.push({ x: f, y: zRes.res.map(x => x[trP]), label: 'transfer', color: P.s[1] });
    WB.plot($('nw-zp'), { series: ps, logx: true, xlabel: 'frequency (Hz)', ylabel: 'phase (°)', hlines: [{ y: 0 }] });
  }
  /* I–V */
  function runIV() {
    if (S.model !== 'cond') { $('iv-sum').innerHTML = 'Voltage clamp needs the conductance-based model: choose <b>Channels</b> under Model.'; return; }
    const a = +$('iv-a').value, b = +$('iv-b').value, st = Math.max(0.5, Math.abs(+$('iv-s').value)), vs = []; for (let v = a; v <= b + 1e-9; v += st) vs.push(+v.toFixed(3));
    $('iv-run').disabled = true;
    WB.chunked(vs, v => NW.ivCurve(S, [v])[0], p => $('iv-prog').textContent = Math.round(p * 100) + '%', out => {
      $('iv-run').disabled = false; $('iv-prog').textContent = ''; ivRes = out; drawIV();
      const pk = out.reduce((m, o) => o.peakIn < m.peakIn ? o : m, out[0]);
      $('iv-sum').innerHTML = `Largest inward current <b>${F(pk.peakIn)} ${last ? last.Iunit || '' : ''}</b> at <b>${F(pk.v)} mV</b>. Peak inward vs V is the classic Na⁺ (or Ca²⁺) I–V; steady-state current shows the non-inactivating K⁺ and leak.`;
    });
  }
  function drawIV() {
    if (!ivRes || !$('nw-iv')) return; const P = WB.pal(), x = ivRes.map(o => o.v);
    WB.plot($('nw-iv'), { series: [{ x, y: ivRes.map(o => o.peakIn), label: 'peak inward', color: P.s[0] }, { x, y: ivRes.map(o => o.peakOut), label: 'peak outward', color: P.s[1] }, { x, y: ivRes.map(o => o.ss), label: 'steady state', color: P.s[2], dash: [5, 3] }],
      xlabel: 'command voltage (mV)', ylabel: `current (${S.iunit === 'nA' ? 'nA' : 'µA/cm²'})`, hlines: [{ y: 0 }] });
  }
  /* battery */
  function runBat() {
    $('bat-run').disabled = true;
    NW.battery({ ...S }, p => $('bat-prog').textContent = Math.round(p * 100) + '%', R => {
      $('bat-run').disabled = false; $('bat-prog').textContent = '';
      const u = R.unit, rU = u === 'nA' ? 'MΩ' : u === 'a.u.' ? 'a.u.' : 'kΩ·cm²';
      /* Reference values: only numbers checked against the paper (mean ± SE as reported). Rows without one say so. */
      const SJ = '<a href="https://doi.org/10.1152/jn.1992.67.3.508" target="_blank" rel="noopener">Spruston &amp; Johnston 1992</a>', ST = '<a href="https://doi.org/10.1152/jn.2000.84.5.2398" target="_blank" rel="noopener">Staff et al. 2000</a>';
      const rows = [['Resting potential', R.Vrest, 'mV', `−64 ± 2 mV · ${SJ}`], ['Input resistance (−small step)', R.Rin, rU, `104 ± 10 MΩ · ${SJ}`], ['Membrane time constant (63%)', R.tau, 'ms', `28 ± 2 ms · ${SJ}`],
        ['Sag = (V<sub>ss</sub> − V<sub>min</sub>)/(V<sub>rest</sub> − V<sub>min</sub>), large hyperpolarizing step', R.sag, '', 'Papers define sag differently (some use V<sub>ss</sub>/V<sub>min</sub> deflections); convert before comparing'], ['Rebound depolarization', R.rebound, 'mV', ''], ['Rebound spikes', R.reboundSpikes, '', ''],
        ['Rheobase (1 s step)', R.rheo, u, `213 ± 21 pA · ${ST}`], ['Spikes at 1.5 × rheobase (1 s)', R.rate15, '', ''], ['First-spike latency', R.latency, 'ms', ''], ['Adaptation index', R.adapt, '', ''], ['CV of ISIs', R.cv, '', ''],
        ['AP threshold (dV/dt > 20 mV/ms)', R.thr, 'mV', `−46.3 ± 0.6 mV · ${ST}`], ['AP peak', R.peak, 'mV', ''], ['AP half-width', R.width, 'ms', `0.95 ± 0.03 ms · ${ST}`], ['Fast AHP depth (from threshold)', R.ahp, 'mV', '']];
      $('bat-out').innerHTML = `<div class="table-scroll"><table class="wb-table"><thead><tr><th>Feature</th><th>This model</th><th>Rat CA1 pyramidal cells, measured</th></tr></thead><tbody>${rows.filter(r => r[1] !== undefined).map(r => `<tr><td>${r[0]}</td><td><b>${F(r[1])}</b> ${r[2]}</td><td class="muted">${r[3] || '<i>no checked reference yet</i>'}</td></tr>`).join('')}</tbody></table></div><p class="muted">Mean ± SE as reported. Spruston &amp; Johnston used perforated-patch recordings, which avoid washout and impalement leak. Threshold and half-width depend on how they are detected, so check a paper's Methods before comparing with this table's dV/dt > 20 mV/ms rule. Values shift with age, temperature and solutions, so treat them as a check on the order of magnitude, not a fitting target. To fit, use features you measured under your own conditions (fitting studio).</p>`;
    });
  }
  /* equations */
  function eqHTML() {
    if (S.model === 'lif') return `<h3>Leaky integrate-and-fire</h3><p>\\[C\\frac{dV}{dt} = -g_L (V - E_L) + I(t) - w,\\qquad V \\ge V_{th} \\Rightarrow V \\leftarrow V_r,\\; w \\leftarrow w + b\\]\\[\\tau_w \\frac{dw}{dt} = -w\\]</p><p>No spike shape, no channels: the spike is an event. Spike-triggered adaptation (b > 0) adds a decaying outward current after each spike.</p>`;
    if (S.model === 'adex') return `<h3>Adaptive exponential integrate-and-fire</h3><p>\\[C\\frac{dV}{dt} = -g_L(V-E_L) + g_L\\Delta_T\\, e^{(V-V_T)/\\Delta_T} - w + I\\]\\[\\tau_w\\frac{dw}{dt} = a(V-E_L) - w,\\qquad V\\ge V_{peak}\\Rightarrow V\\leftarrow V_r,\\; w\\leftarrow w+b\\]</p><p>The exponential term is the spike-initiating Na⁺ current near threshold. Subthreshold adaptation <i>a</i> acts like a linearized slow K⁺ (M) or, with the right sign and τ_w, like Ih; <i>b</i> is spike-triggered adaptation (Ca²⁺-activated K⁺). Brette & Gerstner (2005); Naud et al. (2008).</p>`;
    if (S.model === 'izh') return `<h3>Izhikevich (2003)</h3><p>\\[\\frac{dv}{dt} = 0.04v^2 + 5v + 140 - u + I,\\qquad \\frac{du}{dt} = a(bv-u),\\qquad v\\ge30 \\Rightarrow v\\leftarrow c,\\; u\\leftarrow u+d\\]</p><p>The quadratic is the normal form of a saddle-node bifurcation, fitted so v reads in mV. Four numbers reproduce many firing patterns, but u has no direct channel identity.</p>`;
    const M = NW.buildCond(S), used = [...new Set(M.inst.flat().map(x => x.ch))];
    const curTerm = ch => { const c = NW.NCH[ch]; return `\\bar g_{\\mathrm{${ch.replace('_', '\\_')}}}\\,${c.gates.map(g => g.n + (g.p > 1 ? '^' + g.p : '')).join('')}\\,(V-${c.E.replace('E', 'E_{') + '}'})`; };
    let h = `<h3>Membrane equation${M.comps === 2 ? 's (two compartments)' : ''}</h3>`;
    h += M.comps === 2 ? `<p>\\[C_m\\frac{dV_s}{dt} = -I_{ion,s} + \\frac{g_c}{p}(V_d - V_s) + \\frac{I_s}{p},\\qquad C_m\\frac{dV_d}{dt} = -I_{ion,d} + \\frac{g_c}{1-p}(V_s - V_d) + \\frac{I_d}{1-p}\\]</p>` : `<p>\\[C_m \\frac{dV}{dt} = I_{inj}/A - g_L (V - E_L) - \\sum_k I_k\\]</p>`;
    h += `<p>\\[I_{ion} = g_L(V-E_L)${used.map(ch => ' + ' + curTerm(ch)).join('')}\\]</p><p>Each gate obeys \\(dx/dt = (x_\\infty(V) - x)\\,\\phi/\\tau_x(V)\\) with \\(x_\\infty = \\alpha/(\\alpha+\\beta)\\), \\(\\tau = 1/(\\alpha+\\beta)\\) when written as rates, and \\(\\phi = Q_{10}^{(T-T_{ref})/10}\\).</p>`;
    h += `<div class="table-scroll"><table class="wb-table"><thead><tr><th>Current</th><th>Gates (as computed; V in mV, rates in 1/ms)</th><th>φ at ${F(S.temp)} °C</th><th>Source</th></tr></thead><tbody>${used.map(ch => { const c = NW.NCH[ch];
      return `<tr><td><b>${c.label}</b><br><small>${c.bio}</small></td><td>${c.gates.map(g => `<code>${g.n}${g.p > 1 ? '^' + g.p : ''}</code>: ${g.a ? `α = <code>${g.a}</code>, β = <code>${g.b}</code>` : `x∞ = <code>${g.inf}</code>${g.tau ? `, τ = <code>${g.tau}</code>` : ' (instantaneous)'}`}`).join('<br>')}${c.consts ? `<br><small>constants: ${Object.keys(c.consts).map(k => `${k} = ${F(S[ch + '_' + k])}`).join(', ')}</small>` : ''}</td><td>${F(Math.pow(c.q10 || 1, (S.temp - (c.Tref ?? S.temp)) / 10), 3)}</td><td><small>${c.ref}</small></td></tr>`; }).join('')}</tbody></table></div>
      <p class="muted">vtrap(x, y) = x/(exp(x/y) − 1), with its limit y(1 − x/2y) near x = 0. These are the exact strings the simulator compiles and the Python export prints.</p>`;
    return h;
  }
  function drawEq() { const e = $('nw-eq'); if (!e) return; e.innerHTML = eqHTML(); WB.typeset(e); }

  /* ---------- wiring ---------- */
  function loadPreset(k, over = {}) {
    presetKey = NW.PRESETS[k] ? k : 'ca1'; base = { ...NW.DEF, ...NW.PRESETS[presetKey].s };
    S = { ...base, ...over }; delete S.preset;
    $('nw-note').innerHTML = `<b>${NW.PRESETS[presetKey].label}.</b> ${NW.PRESETS[presetKey].note}`;
    buildPanel(); fiRes = zRes = ivRes = null; ['fi-sum', 'z-sum', 'iv-sum', 'bat-out'].forEach(id => $(id).innerHTML = ''); fiDefaults();
    [['nw-fi'], ['nw-zm'], ['nw-zp'], ['nw-iv']].forEach(([id]) => { const c = $(id); if (c) { c._wb = null; c.getContext('2d').clearRect(0, 0, c.width, c.height); } });
    run(); drawEq();
  }
  function buildPanel() {
    panelCtl = WB.panel($('nw-panel'), schema(), S, (k, rebuild) => {
      if (k === 'model' || k === 'iunit') { adaptUnits(k); }
      if (rebuild) { const open = [...$('nw-panel').querySelectorAll('details')].map(d => d.open); buildPanel(); [...$('nw-panel').querySelectorAll('details')].forEach((d, i) => { if (open[i] !== undefined) d.open = open[i]; }); }
      if (k === 'model' || k.startsWith('on_') || k === 'comp' || k === 'temp') drawEq();
      schedule();
    });
  }
  /** When the unit system changes, rescale the stimulus so the cell stays in a sensible range. */
  function adaptUnits(k) {
    const u = NW.unitOf(S);
    if (k === 'model') {
      if (S.model === 'izh') { S.iunit = 'au'; if (Math.abs(S.amp) < 2) S.amp = 10; S.dc = 0; if (S.proto === 'vstep' || S.proto === 'pc') S.proto = 'step'; }
      else if (S.model !== 'cond') { S.iunit = 'nA'; if (Math.abs(S.amp) > 2) S.amp = 0.4; S.dc = 0; if (S.proto === 'vstep') S.proto = 'step'; }
      else if (S.iunit === 'au') { S.iunit = 'nA'; S.amp = 0.3; S.dc = 0; if (!NW.CH_ORDER.some(c => S['on_' + c])) Object.assign(S, NW.PRESETS.ca1.s); }
    }
    if (k === 'iunit' && S.model === 'cond') { const f = 1e5 / S.area; if (u === 'µA/cm²') { S.amp *= f; S.dc *= f; S.ramp1 *= f; S.sigma *= f; } else { S.amp /= f; S.dc /= f; S.ramp1 /= f; S.sigma /= f; } ['amp', 'dc', 'ramp1', 'sigma'].forEach(x => S[x] = +S[x].toPrecision(4)); }
  }
  window.renderNeuronWorkbench = function () {
    document.title = 'Neuron workbench · Little Neural Guide';
    const q = WB.query.get(); const pk = NW.PRESETS[q.preset] ? q.preset : 'ca1', tab = q.tab; delete q.preset; delete q.tab; presetKey = pk;
    $('lesson').innerHTML = html(); document.body.classList.add('wb-wide');
    WB.bindTabs('nw-tabs', tab => { if (tab === 'eq') drawEq(); if (tab === 'phase') drawPhase(); });
    $('nw-preset').addEventListener('change', e => loadPreset(e.target.value));
    $('nw-reset').onclick = () => loadPreset(presetKey);
    $('nw-link').onclick = e => WB.copyLink(e.currentTarget);
    $('nw-pin').onclick = () => { if (!last) return; if (pins.length >= 4) pins.shift(); pins.push({ name: NW.PRESETS[presetKey].label.split(':').pop().trim().slice(0, 24) + (pins.length ? ' #' + (pins.length + 1) : ''), t: Array.from(last.t), V: Array.from(last.V), fi: fiRes, z: zRes }); $('nw-unpin').hidden = false; draw(); };
    $('nw-unpin').onclick = () => { pins = []; $('nw-unpin').hidden = true; draw(); };
    ['nw-showcur', 'nw-showgate', 'nw-showca'].forEach(id => $(id).addEventListener('change', () => { $('nw-cur-wrap').hidden = !$('nw-showcur').checked; $('nw-gate-wrap').hidden = !$('nw-showgate').checked; $('nw-ca-wrap').hidden = !$('nw-showca').checked; requestAnimationFrame(draw); }));
    $('ph-var').addEventListener('change', drawPhase);
    $('fi-run').onclick = runFI; $('z-run').onclick = runZ; $('iv-run').onclick = runIV; $('bat-run').onclick = runBat;
    pins = []; loadPreset(pk, q);
    if (tab) WB.showTab('nw-tabs', tab);
  };
})();
