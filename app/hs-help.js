/* hippsim explanations: glossary for every control in the simulator + the tooltip engine.
   Kinds tell users whether a control changes the science or only the view:
   model · stimulus · perturbation · synapse · morphology · analysis · data · display */
window.HS_GLOSSARY = [
  // ---------------- display only (checked first so "speed", "labels" etc. never read as biology)
  [/slow[- ]?mo|(?<!running )speed|animation|rotate|repeat|\bloop\b|replay|compute first|frame|log axes|^labels|labels on the cell|show axon|show which input|overlay previous|compare with previous|^t = /i, 'display', 'Display setting',
   'Changes only how the result is shown (playback speed, labels, axes, rotation).', 'Does not change the model or its numbers.'],
  [/colou?r by|^show\b.*(voltage|density)|flip axis/i, 'display', 'Colour / view', 'Chooses which quantity is painted on the cell or plotted.', 'Display only; the simulation is unchanged.'],

  [/right panel|^x |^y |map live voltage|arrival time.*peak amplitude/i, 'display', 'Plot / panel choice', 'Chooses which panel, axis or quantity is shown.', 'Display only; the simulation is unchanged.'],
  [/choose a protocol|experiment —|back-propagating spike \(|tendon tap|step on a pin/i, 'stimulus', 'Protocol', 'Picks a standard experiment: stimulus type, site and recording.', 'Each protocol mirrors a slice or in-vivo experiment named in the tool.'],
  [/^(soma|axon|axons|basal dendrites|apical dendrites)$/i, 'model', 'Cell region', 'Selects a part of the cell for channel changes or display.', 'Soma, axon, basal (stratum oriens) and apical (radiatum / lacunosum-moleculare) dendrites differ in channel densities.'],
  [/distal apical|mid apical|^target/i, 'synapse', 'Synapse location', 'Where on the tree the inputs are placed.', 'EC inputs reach the distal tuft; CA3 Schaffer inputs reach mid (radiatum) dendrites.'],
  [/schaffer|trisynaptic|ca3 → ca1|dg → ca3/i, 'synapse', 'Pathway', 'Which hippocampal pathway carries the signal.', 'Trisynaptic: EC → DG → CA3 → CA1; direct: EC → CA1 (temporoammonic).'],
  [/^(an|in|dn)\w*\d+.*\(\d+\)|dnp\d/i, 'data', 'MANC partner neuron', 'A presynaptic neuron class from the MANC connectome; the number is its synapse count onto the GF.', 'Male adult nerve cord connectome v1.2.1 (neuPrint).'],
  [/block the muscle ap/i, 'perturbation', 'Block muscle AP', 'Stops the muscle action potential so the full end-plate potential is visible.', 'Like μ-conotoxin in NMJ recordings.'],
  [/save configuration|copy config|assume the reverse/i, 'analysis', 'Configuration', 'Saves, loads or copies a parameter set, or sets a modelling assumption.', 'Use with Copy settings to record a run.'],
  [/^from|^to\d|^to\b/i, 'data', 'Connection', 'Presynaptic (from) and postsynaptic (to) cell of a connection.', 'Pathways follow known hippocampal anatomy (Amaral & Witter 1989).'],
  // ---------------- data
  [/^cell\b|current cell|mpg1|jarsky|compare with|add a reconstruction|^from\b|^to\b|\(AA\d|projection neuron|granule cell \(AA|pyramidal cell \(AA|thalamocortical|layer .*pyramidal/i, 'data', 'Reconstruction',
   'Which traced neuron the model runs on.', 'Each cell is a published reconstruction (NeuroMorpho.Org, ModelDB, MouseLight, MANC); its source is in the model card.'],
  [/whole brain|hippocampal formation|dentate gyrus|subiculum|entorhinal|thalamus|isocortex|cerebellum|striatum|olfactory|medial septum|^CA[123]$/i, 'data', 'Brain region (Allen CCF)',
   'Shows or hides one Allen Mouse Brain Common Coordinate Framework v3 region.', 'Region outlines are CCFv3 (2017) structure meshes.'],

  // ---------------- stimuli
  [/θp|half-activation/i, 'model', 'NaP half-activation (θp)', 'Voltage at which half the persistent Na⁺ channels are open.', 'More negative = I_NaP turns on closer to rest. Ceballos 2025 Table 1 (−35 mV) and Golomb 2006 (−47 mV) differ.'],
  [/ec → pyr|ca3?→ pyr|ca3 → pyr|pv → pyr|olm → pyr|modulation depth/i, 'synapse', 'Pathway weight', 'Strength or rhythmicity of one input pathway onto pyramidal cells.', 'EC → distal tuft (theta), CA3 → Schaffer (gamma), PV → perisomatic, OLM → distal dendritic inhibition.'],
  [/also run each without|record at|simulate every trial|random seed|preset|start from/i, 'analysis', 'Run option', 'How the run is set up or repeated.', 'Seeds make stochastic runs reproducible.'],
  [/a-type rises with distance/i, 'model', 'A-type gradient', 'Makes A-type K⁺ density increase with distance from the soma.', 'Measured in CA1 apical dendrites (Hoffman et al. 1997).'],
  [/θ amplitude|theta amplitude|θ frequency|theta frequency|theta drive|^θ /i, 'stimulus', 'Theta input (θ)',
   'Sinusoidal drive in the theta band (4–12 Hz).', 'Stands for entorhinal layer III input via the temporoammonic path to distal CA1 dendrites; hippocampal theta is ~6–10 Hz in running rodents.'],
  [/γ amplitude|γ frequency|^γ /i, 'stimulus', 'Gamma input (γ)',
   'Sinusoidal or band-limited drive in the gamma band (25–100 Hz).', 'Stands for CA3 Schaffer-collateral input (slow gamma) and perisomatic PV-interneuron rhythms.'],
  [/dendritic dc/i, 'stimulus', 'Dendritic DC current', 'Constant current injected into the dendritic compartment.', 'Like a steady dendritic depolarisation from tonic synaptic input.'],
  [/\biapp\b|dc current|applied current|holding current|drive one spike/i, 'stimulus', 'Injected current (I_app)',
   'Constant current through the recording electrode (current clamp).', 'µA/cm² is per membrane area; nA is total current. Positive depolarises.'],
  [/white noise|noise d/i, 'stimulus', 'Noise D', 'Gaussian white-noise current; D sets its variance (mV²/ms).', 'Mimics irregular synaptic bombardment and channel noise in vivo.'],
  [/plateau current|plateau duration/i, 'stimulus', 'Dendritic plateau', 'A long depolarising current in the dendrite.', 'In vivo, dendritic Ca²⁺ plateau potentials (~300 ms) trigger behavioural-timescale plasticity (Bittner et al. 2017).'],
  [/^amplitude|pulse \(|^pulse|tap strength|stimulus \(|looming drive|^pulses|train pulses/i, 'stimulus', 'Stimulus amplitude', 'Size of the injected pulse or stimulus.', 'Larger stimuli recruit more channels or fibres.'],
  [/^start|first event|^duration|pulse length|pulse width|pair interval|^interval|^events|activation time/i, 'stimulus', 'Stimulus timing', 'When the stimulus starts, how long it lasts, or the gap between events.', 'Timing relative to refractoriness and slow currents changes the response.'],
  [/frequency \(hz\)|train frequency|stimulation frequency|nerve stimulation|^frequency \(/i, 'stimulus', 'Stimulation rate', 'Rate of repeated pulses.', 'High rates reveal short-term depression or facilitation and fatigue.'],
  [/^from .* to .*hz|step$|sweep/i, 'analysis', 'Frequency sweep', 'Range and step of the input frequencies tested.', 'Same protocol as slice resonance experiments (Hu et al. 2002).'],
  [/running speed/i, 'stimulus', 'Running speed', 'How fast the simulated mouse runs along the belt.', 'Sets how long each position stays in each input\'s preferred field.'],

  // ---------------- channels (model parameters)
  [/gnap|persistent na|inap/i, 'model', 'Persistent Na⁺ conductance (g_NaP)',
   'Maximal conductance of the non-inactivating Na⁺ current.', 'Nav1.6-rich at the soma and axon initial segment; amplifies depolarisation near threshold and promotes bursting (Golomb et al. 2006).'],
  [/gkdr|delayed[- ]rectifier|\bkdr\b/i, 'model', 'Delayed-rectifier K⁺ (g_Kdr)', 'Maximal conductance of the spike-repolarising K⁺ current.', 'Kv2/Kv3-type channels; sets spike width and how fast the cell recovers.'],
  [/τz|im time constant/i, 'model', 'M-current time constant (τz)', 'How slowly the M-current gate opens and closes.', 'Tens of ms; slow enough to integrate over several spikes, which is why it controls bursting.'],
  [/gkm|\bgm\b|m-type|\bim\b|kv7|im at soma|without i ?m/i, 'model', 'M-current (g_M)', 'Slow, non-inactivating K⁺ current.',
   'Kv7.2/7.3 (KCNQ2/3); closed by muscarinic acetylcholine; causes spike-frequency adaptation and resonance near threshold (Hu et al. 2002). The main burst switch (Golomb 2006).'],
  [/gka|\bga\b|a-type|kap|kad/i, 'model', 'A-type K⁺ (g_A)', 'Fast-activating, inactivating K⁺ current.', 'Kv4.2; density rises with distance along CA1 apical dendrites (Hoffman et al. 1997) and limits back-propagating spikes.'],
  [/ghca|ca²⁺ conductance|\bgca\b/i, 'model', 'High-threshold Ca²⁺ (g_Ca)', 'Voltage-gated Ca²⁺ current opened by spikes.', 'L/N-type channels; the Ca²⁺ that enters drives Ca²⁺-activated K⁺ currents.'],
  [/gfkca|fast ca²⁺-activated|\bgc\b/i, 'model', 'Fast Ca²⁺-activated K⁺ (g_C)', 'K⁺ current gated by voltage and internal Ca²⁺.', 'BK channels; fast afterhyperpolarisation after each spike.'],
  [/gskca|slow ahp|gahp/i, 'model', 'Slow AHP K⁺ (g_AHP)', 'Slow Ca²⁺-activated K⁺ current.', 'SK and slow-AHP channels; spike-frequency adaptation over hundreds of ms.'],
  [/iₕ reversal|\beh\b|ih reversal/i, 'model', 'I_h reversal (E_h)', 'Voltage at which I_h reverses.', 'HCN channels pass Na⁺ and K⁺, so E_h ≈ −30 to −40 mV (−32.9 mV in Lowet 2023 HHca2).'],
  [/iₕ time constant|ih time constant/i, 'model', 'I_h time constant', 'How fast HCN channels respond to voltage.', 'Tens to hundreds of ms; together with density it sets the resonance frequency.'],
  [/\bgh\b|dendritic gh|\bih\b|iₕ|\(hd\)|h-channel|ih ×|ih rises/i, 'model', 'I_h (HCN conductance)', 'Hyperpolarisation-activated cation current.',
   'HCN1 channels; density rises ~6-fold from soma to distal apical dendrite in CA1 (Magee 1998); causes sag, rebound and theta resonance near rest.'],
  [/na⁺ density|na⁺ \(na|na⁺ ×|\bnax\b/i, 'model', 'Transient Na⁺ (g_Na)', 'Fast inactivating Na⁺ current that generates spikes.', 'Nav1.x channels; "nax" is the axonal variant in Migliore models. Dendritic Na⁺ supports back-propagating spikes.'],
  [/soma[–-]dendrite coupling|\bgac\b/i, 'model', 'Soma–dendrite coupling (g_ac)', 'Axial conductance between the two compartments.', 'Lower values electrically separate the dendrite, as a long thin trunk would (Pinsky & Rinzel 1994).'],
  [/dendritic compartment/i, 'model', 'Dendritic compartment', 'Adds or removes the second (dendritic) compartment.', 'Without it the dendritic I_h and its resonance disappear.'],
  [/parameter reading/i, 'model', 'Parameter reading', 'Which source the gating parameters come from.', 'Table 1 of Ceballos 2025, the lab code, or the hybrid; they disagree in places (see the Reproduction tool).'],
  [/temperature/i, 'model', 'Temperature', 'Sets kinetics speed through Q10 scaling.', 'Channel gating speeds up ~3× per 10 °C; squid axon experiments ran at 6–18 °C.'],

  // ---------------- passive / morphology
  [/spine (factor|correction)/i, 'morphology', 'Spine correction', 'Multiplies membrane area beyond ~100 µm to include dendritic spines.', 'Spines roughly double membrane area in CA1 radiatum.'],
  [/\brm\b/i, 'morphology', 'Specific membrane resistance (R_m)', 'Leakiness of the membrane, Ω·cm².', 'Higher R_m = less leak, larger and slower responses; τ_m = R_m · C_m.'],
  [/\bra\b/i, 'morphology', 'Axial resistivity (R_a)', 'Resistance of the cytoplasm along the dendrite, Ω·cm.', 'Higher R_a = more voltage attenuation along the tree.'],
  [/\bcm\b/i, 'morphology', 'Specific capacitance (C_m)', 'Charge stored per membrane area, µF/cm².', '~1 µF/cm² for a lipid bilayer.'],
  [/length constant|λ/i, 'morphology', 'Length constant (λ)', 'Distance over which a steady voltage falls to 37% (1/e).', 'λ = √(d·R_m / 4R_a); larger for thick, non-leaky dendrites.'],
  [/compartment|max compartment length/i, 'morphology', 'Discretisation', 'How finely the tree is split into compartments.', 'Finer = more accurate and slower; NEURON\'s d-λ rule picks a safe size.'],
  [/resting v/i, 'morphology', 'Resting potential', 'Voltage with no input.', 'CA1 pyramidal cells rest near −65 to −70 mV.'],
  [/^frequency f|frequency f hz/i, 'analysis', 'Analysis frequency', 'Frequency at which impedance or attenuation is painted on the tree.', 'Low f shows DC attenuation; theta (4–12 Hz) shows resonance.'],
  [/diameter/i, 'morphology', 'Axon diameter', 'Thickness of the axon.', 'Conduction velocity scales ~√d in unmyelinated and ~d in myelinated axons.'],
  [/myelinated|demyelination/i, 'perturbation', 'Myelin', 'Adds or removes myelin (saltatory conduction).', 'Demyelination (MS, neuropathy) slows or blocks conduction.'],
  [/axon m\/s|axon length/i, 'morphology', 'Axon conduction', 'Conduction velocity and length of the presynaptic axon.', 'Sets the delay before the spike reaches the synapse.'],
  [/velocity|path length/i, 'morphology', 'Conduction path', 'Conduction velocity or length of the nerve.', 'Ia afferents ~80 m/s, α-motor ~70 m/s, Aδ ~15 m/s.'],

  // ---------------- synapses
  [/gaba-a|gaba_a|\[cl⁻\]|cl⁻ reversal|hco₃|gaba \(cl/i, 'synapse', 'GABA_A synapse', 'Chloride (and bicarbonate) channel opened by GABA.', '[Cl⁻]ᵢ is set by KCC2/NKCC1; loss of KCC2 (reported in AD and epilepsy) makes E_GABA less negative, even depolarising.'],
  [/release sites|release probability|quantal|stochastic release|sites sampled|trials/i, 'synapse', 'Quantal release', 'Binomial model: N sites, each releasing with probability p, each giving conductance q.', 'Standard quantal analysis of synaptic transmission (del Castillo & Katz).'],
  [/release fraction|facilitation|recovery τ|short-term plasticity/i, 'synapse', 'Short-term plasticity', 'Tsodyks–Markram model of synaptic depression and facilitation.', 'U = fraction of resources used per spike; τ_rec and τ_facil set recovery.'],
  [/conductance per|peak conductance|nS per|conductance per synapse|depolarisation per synapse/i, 'synapse', 'Synaptic strength', 'Peak conductance (or depolarisation) produced by one synapse.', 'Typical single excitatory synapses are ~0.1–1 nS.'],
  [/reversal potential/i, 'synapse', 'Synaptic reversal', 'Voltage at which the synaptic current reverses.', '~0 mV for AMPA/NMDA, ~−70 to −75 mV for GABA_A.'],
  [/^delay/i, 'synapse', 'Synaptic delay', 'Time from presynaptic spike to postsynaptic conductance.', 'Axonal conduction plus ~0.5–1 ms synaptic delay.'],
  [/contacts|synapses per/i, 'synapse', 'Contacts', 'Number of synaptic contacts per connection.', 'More contacts = stronger, more reliable connection.'],
  [/transmitter|receptor|ach \(|nachr|glutamate|glucl/i, 'synapse', 'Transmitter / receptor', 'Which neurotransmitter and receptor the synapse uses.', 'Sets sign and kinetics: ACh/nicotinic excites; GABA and GluCl (invertebrates) inhibit via Cl⁻.'],
  [/plasticity per plateau/i, 'synapse', 'BTSP strength', 'How far each plateau moves active synapses toward maximal weight.', 'Behavioural-timescale synaptic plasticity (Bittner et al. 2017).'],
  [/pv basket|axo-axonic cells|o-lm|feedforward inhibition|^inhibition/i, 'synapse', 'Interneurons', 'Turns an interneuron class or inhibition gain on/off.', 'PV basket: perisomatic, fast; axo-axonic: AIS; O-LM: distal dendrites, theta-paced (Klausberger & Somogyi 2008).'],
  [/input strength|mossy[- ]fibre/i, 'synapse', 'Pathway gain', 'Scales the strength of an excitatory pathway.', 'Mossy fibres (DG → CA3) are large "detonator" synapses.'],
  [/firing together/i, 'stimulus', 'Synchronous inputs', 'How many presynaptic cells fire at once.', 'Asks how many coincident inputs it takes to fire the next cell.'],
  [/shortcut/i, 'analysis', 'Attenuation method', 'Exact NEURON transfer kernels vs the e^(−d/λ) approximation.', 'The shortcut ignores branching and frequency dependence.'],

  // ---------------- perturbations
  [/ad-like/i, 'perturbation', 'AD-like change', 'Moves network parameters toward Alzheimer\'s-like hyperexcitability.', 'Based on reported PV-interneuron (Nav1.1) dysfunction and hyperactive neurons (Verret 2012; Busche 2008).'],
  [/ttx/i, 'perturbation', 'TTX', 'Tetrodotoxin: blocks voltage-gated Na⁺ channels.', 'Abolishes spikes; local TTX tests where spikes start.'],
  [/tea/i, 'perturbation', 'TEA', 'Tetraethylammonium: blocks K⁺ channels.', 'Broadens spikes and slows repolarisation.'],
  [/block (a-type|ih)|make passive|cut branch|local ttx|erase/i, 'perturbation', 'Local manipulation', 'Blocks a channel, removes all active channels, or cuts a branch at a chosen site.', 'In-silico equivalent of local drug puffs or dendrotomy.'],
  [/curare|nachr block/i, 'perturbation', 'Curare', 'Blocks muscle nicotinic ACh receptors.', 'Reduces the end-plate potential below threshold.'],
  [/neostigmine|ache/i, 'perturbation', 'Neostigmine', 'Inhibits acetylcholinesterase.', 'ACh lingers, prolonging the end-plate potential; used to treat myasthenia.'],
  [/botulinum/i, 'perturbation', 'Botulinum toxin', 'Cleaves SNAP-25, blocking vesicle release.', 'No ACh release → paralysis.'],
  [/myasthenia/i, 'perturbation', 'Myasthenia gravis', 'Antibodies reduce muscle nAChRs.', 'Decrementing response to repetitive stimulation.'],
  [/lambert/i, 'perturbation', 'Lambert–Eaton', 'Antibodies against presynaptic Ca_V2.1 channels.', 'Less release at first; facilitation with repetitive stimulation.'],
  [/dantrolene|ryr/i, 'perturbation', 'RyR1 / dantrolene', 'Changes Ca²⁺ release from the sarcoplasmic reticulum through RyR1.', 'Dantrolene blocks RyR1; malignant hyperthermia is a leaky RyR1.'],
  [/serca|thapsigargin/i, 'perturbation', 'SERCA block', 'Stops Ca²⁺ re-uptake into the sarcoplasmic reticulum.', 'Relaxation slows; Ca²⁺ stays high.'],
  [/no atp|rigor/i, 'perturbation', 'No ATP', 'Removes ATP from the cross-bridge cycle.', 'Myosin cannot detach: rigor.'],
  [/sarcomere|over-stretched|short start/i, 'perturbation', 'Sarcomere length', 'Changes filament overlap.', 'Force peaks near 2.0–2.2 µm (length–tension curve).'],
  [/strychnine/i, 'perturbation', 'Strychnine', 'Blocks glycine receptors.', 'Removes spinal inhibition: exaggerated reflexes.'],
  [/twitch/i, 'perturbation', 'Fibre type', 'Fast-twitch (type II) vs slow-twitch (type I) muscle.', 'Differ in myosin isoform, Ca²⁺ handling and fatigue.'],
  [/\[ca²⁺\]|\[mg²⁺\]|low ca²⁺/i, 'perturbation', 'Extracellular Ca²⁺ / Mg²⁺', 'Ion concentrations outside the cell.', 'Ca²⁺ triggers release; Mg²⁺ competes with it, lowering release.'],
  [/\[k⁺\]|\[na⁺\]/i, 'perturbation', 'Ion concentration', 'Inside or outside concentration of an ion (mM).', 'Sets the reversal potential through the Nernst equation.'],
  [/genotype|shakb/i, 'perturbation', 'Genotype', 'Control vs mutant flies.', 'shakB² lacks ShakB innexin gap junctions, removing the GF\'s electrical synapses.'],
  [/gap \(ns\)|gap junction|rectifying/i, 'synapse', 'Electrical synapse', 'Gap-junction conductance between two neurons.', 'ShakB innexins in Drosophila; rectifying junctions pass current mainly one way.'],
  [/chemical release|tnt|ach synthesis/i, 'perturbation', 'Chemical transmission', 'Turns chemical release on/off.', 'TNT (tetanus toxin light chain) blocks vesicle release; ChAT loss stops ACh synthesis.'],
  [/axc|axo-axonic inputs|inhibitory axo-axonic|axon synapses only|fraction of partner|timing jitter/i, 'synapse', 'GF axonal inputs', 'Inputs onto the giant fiber\'s axon from the MANC connectome.', 'Tests whether axo-axonic input can push the GF over threshold.'],
  [/lc4|lplc2|approach|direction \(azimuth|looming|wing raise|posture|long[- ]mode|gf active|gf →|gf-independent|left gf/i, 'model', 'Escape circuit', 'Visual looming inputs (LC4: angular velocity, LPLC2: angular size) and escape pathways.', 'GF triggers a short-mode escape; a GF-independent pathway gives the long mode (von Reyn et al. 2014).'],

  // ---------------- analysis
  [/burst = isi|burst/i, 'analysis', 'Burst criterion', 'Spikes closer than this interval count as one burst.', 'Lowet et al. 2023 used 10 ms; Ceballos et al. 2025 use 14 ms.'],
  [/normalis|auto-scale/i, 'analysis', 'Normalisation', 'Scales curves so their shapes can be compared.', 'Display of the analysis; does not change the simulation.'],
];

/* ---------------------------------------------------------------- tooltip engine */
(function () {
  'use strict';
  const KEY = 'hs-explain';
  let on = true;
  try { const v = localStorage.getItem(KEY); if (v !== null) on = v === '1'; } catch (e) {}
  const KIND = {model: 'Model parameter', stimulus: 'Stimulus', perturbation: 'Perturbation', synapse: 'Synapse', morphology: 'Cell / cable',
                analysis: 'Analysis', data: 'Data', display: 'Display only'};
  const tip = document.createElement('div');
  tip.id = 'hs-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.appendChild(tip);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  window.hsExplain = {
    get on() { return on; },
    set(v) { on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} document.body.classList.toggle('hs-explain-on', v); if (!v) hide(); },
    lookup(label) { const g = HS_GLOSSARY.find(([re]) => re.test(label)); return g ? {kind: g[1], term: g[2], what: g[3], bio: g[4]} : null; },
    show, hide,
  };
  document.body.classList.toggle('hs-explain-on', on);

  function place(target) {
    const r = target.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24);
    tip.style.maxWidth = w + 'px';
    tip.hidden = false;
    const th = tip.offsetHeight, tw = tip.offsetWidth;
    let top = r.bottom + 8, left = Math.min(Math.max(12, r.left), window.innerWidth - tw - 12);
    if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 8);
    tip.style.top = top + 'px'; tip.style.left = left + 'px';
  }
  function show(target, html) { tip.innerHTML = html; place(target); }
  function hide() { tip.hidden = true; }

  // explicit tips: any element with data-tip (always shown, explain on or off)
  // control tips: inputs/labels inside a tool (shown when Explain is on)
  function controlHTML(el) {
    const ctl = el.matches('input,select') ? el : (el.querySelector && el.querySelector('input,select')) || (el.htmlFor && document.getElementById(el.htmlFor));
    const label = (el.dataset.hsLabel || (ctl && ctl.dataset.hsLabel) || el.innerText || '').trim();
    const g = hsExplain.lookup(label);
    if (!g) return '';
    let base = '';
    if (ctl && ctl.dataset.hsBase !== undefined) {
      const range = ctl.min !== '' && ctl.max !== '' && ctl.type !== 'checkbox' ? ` · range ${ctl.min} to ${ctl.max}` : '';
      base = `<div class="hs-tip-b">Baseline: <b>${esc(ctl.dataset.hsBase)}</b>${range}</div>`;
    }
    return `<div class="hs-tip-k k-${g.kind}">${KIND[g.kind]}</div><div class="hs-tip-t">${esc(g.term)}</div><p>${esc(g.what)}</p><p class="hs-tip-bio">${esc(g.bio)}</p>${base}`;
  }
  function find(e) {
    const t = e.target.closest && e.target.closest('[data-tip], .hs-explainable, #lesson input, #lesson select');
    return t;
  }
  function onOver(e) {
    const t = find(e); if (!t) return;
    if (t.dataset.tip) return show(t, `<p>${esc(t.dataset.tip)}</p>`);
    if (!on) return;
    const h = controlHTML(t); if (h) show(t, h);
  }
  document.addEventListener('mouseover', onOver);
  document.addEventListener('focusin', onOver);
  document.addEventListener('mouseout', e => { const t = find(e); if (t && !t.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, {passive: true});
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  // touch: tap a label to see its explanation
  document.addEventListener('click', e => { if (!on) return; const t = e.target.closest && e.target.closest('.hs-explainable'); if (t && matchMedia('(hover: none)').matches) { const h = controlHTML(t); if (h) show(t, h); } });
})();
