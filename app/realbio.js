/* ===================== REAL BIOLOGY & TECHNIQUES =====================
   Real images (OpenStax textbooks, CC BY 4.0, with the original credits) and real CA1 neuron
   reconstructions (Migliore et al. 2018, via ModelDB 244688), used in:
   /biology/              gallery
   /biology/neurons/      3D viewer for reconstructed CA1 neurons
   /biology/techniques/   how the data are collected
   /biology/alzheimers/   the disease biology the models address
   plus "Real biology" figure strips injected into related lab, experiment and lesson pages. */

const OSA = 'OpenStax <i>Anatomy & Physiology 2e</i>, CC BY 4.0', OSB = 'OpenStax <i>Biology 2e</i>, CC BY 4.0', OSP = 'OpenStax <i>Psychology 2e</i>, CC BY 4.0';
const FIGS = {
  'neuron-micrograph': { cat: 'Cells & tissue', t: 'A neuron under the light microscope', c: 'A stained neuron at ×1,600: the soma with its nucleus, dendrites that receive input, and the axon that carries action potentials away.', cr: 'Micrograph provided by the Regents of University of Michigan Medical School © 2012; ' + OSA },
  'nervous-tissue': { cat: 'Cells & tissue', t: 'Nervous tissue: neurons and glia', c: 'Stained nervous tissue at ×872. Large neuron cell bodies sit among many smaller glial cells.', cr: 'Micrograph provided by the Regents of University of Michigan Medical School © 2012; ' + OSA },
  'neuron-types': { cat: 'Cells & tissue', t: 'Neurons come in many shapes', c: 'A cortical pyramidal cell, a cerebellar Purkinje cell and olfactory neurons. Shape determines how inputs are collected and integrated.', cr: OSB },
  'rat-hippocampus-brdu': { cat: 'Cells & tissue', t: 'Fluorescent labelling in rat hippocampus', c: 'Dividing cells are labelled red (BrdU); astrocytes express GFAP and are green. Cells labelled both are dividing astrocytes; red-only cells are new neurons.', cr: 'Modification of work by Dr. Maryam Faiz et al., University of Barcelona; scale bar from Matt Russell; ' + OSB },
  'astrocyte-oligodendrocyte': { cat: 'Cells & tissue', t: 'Glia: an astrocyte and an oligodendrocyte', c: 'Fluorescence images of (a) astrocytes and (b) an oligodendrocyte, the CNS cells that regulate the neuronal environment and make myelin.', cr: 'a: Uniformed Services University; b: Jurjen Broeke; scale bars from Matt Russell; ' + OSB },
  'glia-cns': { cat: 'Cells & tissue', t: 'Glial cells of the central nervous system', c: 'Astrocytes, oligodendrocytes, microglia and ependymal cells support neurons. Microglia and astrocytes drive neuroinflammation in Alzheimer’s disease.', cr: OSA },
  'recording-electrode': { cat: 'Electrophysiology', t: 'Measuring membrane potential', c: 'A recording microelectrode inside the cell and a reference electrode outside. The voltage between them is the membrane potential, conventionally inside relative to outside.', cr: OSA },
  'action-potential': { cat: 'Electrophysiology', t: 'Stages of an action potential', c: '(1) Rest near −70 mV, (2) stimulus, (3) rapid rise toward +30 mV, (4) fall, (5) after-hyperpolarization, (6) return to rest. The Hodgkin–Huxley model reproduces each stage.', cr: OSA },
  'electrochemical-gradient': { cat: 'Electrophysiology', t: 'Electrochemical gradients', c: 'Na⁺ is concentrated outside and K⁺ inside the cell. Concentration and electrical forces together set the driving force on each ion, (V − E) in the models.', cr: '“Synaptitude”/Wikimedia Commons; ' + OSB },
  'eeg-cap': { cat: 'Electrophysiology', t: 'Recording brain rhythms with EEG', c: 'Scalp electrodes record the summed activity of large populations with millisecond timing but centimetre-scale spatial resolution, the scale that mean-field models describe.', cr: 'SMI Eye Tracking; ' + OSP },
  'chemical-synapse': { cat: 'Synapses & plasticity', t: 'The chemical synapse', c: 'Ca²⁺ entry triggers vesicle fusion; neurotransmitter crosses the cleft and binds receptors; it is cleared by enzymes, reuptake or glia.', cr: OSA },
  'receptor-types': { cat: 'Synapses & plasticity', t: 'Ionotropic and metabotropic receptors', c: 'Ionotropic receptors are channels that open on binding (fast, e.g. AMPA, GABA-A). Metabotropic receptors signal through G proteins and second messengers (slower, modulatory).', cr: OSA },
  'sem-vesicles': { cat: 'Synapses & plasticity', t: 'Synaptic vesicles, by electron microscopy', c: 'A pseudocoloured scanning electron micrograph of an axon terminal broken open to show the vesicles (blue and orange) that hold neurotransmitter.', cr: 'Modification of work by Tina Carvalho, NIH-NIGMS; scale bar from Matt Russell; ' + OSB },
  'psp-summation': { cat: 'Synapses & plasticity', t: 'Summation of postsynaptic potentials', c: 'Excitatory (green) and inhibitory (pink) potentials add up at the axon hillock; only when the sum reaches threshold does the neuron fire.', cr: OSA },
  'ltp-ltd': { cat: 'Synapses & plasticity', t: 'LTP and LTD through NMDA receptors', c: 'Strong, repeated activation lets Ca²⁺ in through NMDA receptors and inserts more AMPA receptors (LTP). Weak activation triggers a different cascade that removes them (LTD).', cr: OSB },
  'limbic-lobe': { cat: 'Brain & memory', t: 'Where the hippocampus sits', c: 'The limbic lobe, around the edge of the cerebrum, includes the hippocampus, amygdala and cingulate gyrus.', cr: OSA },
  'memory-brain': { cat: 'Brain & memory', t: 'Brain regions in memory', c: 'The hippocampus supports declarative, episodic and spatial memory; the amygdala fear memory; the cerebellum procedural memory; prefrontal cortex semantic tasks.', cr: OSP },
  'alzheimers-brain': { cat: 'Disease', t: 'A healthy brain and a brain with Alzheimer’s disease', c: 'Coronal sections: the Alzheimer’s brain (right) shows shrinkage of the cortex and hippocampus and enlarged ventricles.', cr: 'Modification of work by “Garrando”/Wikimedia Commons, based on images by ADEAR, National Institute on Aging; ' + OSB },
  'rat-maze': { cat: 'Behavior', t: 'Rats and cognitive maps', c: 'Tolman’s maze experiments suggested rats learn a map of space rather than a fixed route, an idea later linked to hippocampal place cells.', cr: 'Modification of work by “FutUndBeidl”/Flickr; ' + OSP },
  'latent-learning': { cat: 'Behavior', t: 'Latent learning: real maze data', c: 'Errors per day for rats rewarded from day 1, day 3 or day 7. Rats rewarded late improved almost immediately: they had learned the maze without reward. Redrawn after Blodgett (1929).', cr: OSB },
};
const FIG_CATS = ['Cells & tissue', 'Electrophysiology', 'Synapses & plasticity', 'Brain & memory', 'Disease', 'Behavior'];
/** One figure card; clicking opens the lightbox. */
function realFig(id, size = '') {
  const f = FIGS[id]; if (!f) return '';
  return `<figure class="rb-fig ${size}"><button class="rb-img" data-rbfig="${id}" aria-label="Enlarge: ${f.t}"><img src="img/${id}.jpg" alt="${f.t}. ${f.c}" loading="lazy"></button><figcaption><b>${f.t}.</b> ${f.c}<span class="rb-credit">Credit: ${f.cr}</span></figcaption></figure>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rbfig]'); if (!b) return;
  const f = FIGS[b.dataset.rbfig]; let box = document.getElementById('rb-light');
  if (!box) { document.body.insertAdjacentHTML('beforeend', '<div class="rb-light" id="rb-light" role="dialog" aria-modal="true" hidden><button class="rb-close" aria-label="Close">✕</button><figure><img alt=""><figcaption></figcaption></figure></div>'); box = document.getElementById('rb-light'); box.addEventListener('click', ev => { if (ev.target === box || ev.target.closest('.rb-close')) box.hidden = true; }); document.addEventListener('keydown', ev => { if (ev.key === 'Escape') box.hidden = true; }); }
  box.querySelector('img').src = 'img/' + b.dataset.rbfig + '.jpg'; box.querySelector('img').alt = f.t;
  box.querySelector('figcaption').innerHTML = `<b>${f.t}.</b> ${f.c}<span class="rb-credit">Credit: ${f.cr}</span>`; box.hidden = false; box.querySelector('.rb-close').focus();
});

/* Figures shown on existing pages, by route. */
const FIG_ROUTES = {
  '/lab/hh/': ['action-potential', 'electrochemical-gradient', 'recording-electrode'],
  '/lab/brunel/': ['psp-summation', 'nervous-tissue'],
  '/lab/wilson-cowan/': ['eeg-cap', 'limbic-lobe'],
  '/lab/stdp/': ['ltp-ltd', 'sem-vesicles'],
  '/lab/neural-network/': ['neuron-types', 'psp-summation'],
  '/experiments/ephys/': ['recording-electrode', 'neuron-micrograph', 'action-potential'],
  '/experiments/place-cells/': ['rat-maze', 'latent-learning', 'memory-brain'],
  '/experiments/ca1-circuit/': ['rat-hippocampus-brdu', 'limbic-lobe', 'glia-cns'],
  '/topics/channels/membrane-circuit/': ['recording-electrode'], '/topics/channels/driving-force/': ['electrochemical-gradient'],
  '/topics/channels/hh-gates/': ['action-potential'], '/topics/channels/hh-to-ca1/': ['neuron-types'],
  '/topics/synapses/chemical-electrical/': ['chemical-synapse', 'sem-vesicles'], '/topics/synapses/synaptic-conductance/': ['receptor-types'],
  '/topics/synapses/timing-location/': ['psp-summation'], '/topics/synapses/ei-feedback/': ['psp-summation'],
  '/topics/learning/plasticity-rules/': ['ltp-ltd'], '/topics/networks/spiking-neurons/': ['nervous-tissue'],
  '/topics/dynamics/resonance-measurement/': ['recording-electrode'], '/topics/morphology/local-versus-soma/': ['neuron-micrograph'],
  '/topics/morphology/coupled-compartments/': ['neuron-types'], '/topics/mean-field/population-activity/': ['eeg-cap'],
};
window.ngInjectFigures = function () {
  const ids = FIG_ROUTES[ngPath()], L = document.getElementById('lesson'); if (!ids || !L || L.querySelector('#real-bio')) return;
  const html = `<section class="lesson-section rb-strip" id="real-bio"><p class="eyebrow">Real biology</p><h2>What this looks like in real tissue and recordings</h2><div class="rb-grid rb-n${ids.length}">${ids.map(id => realFig(id)).join('')}</div><p class="muted"><a href="/biology/">See all images and techniques →</a></p></section>`;
  const anchor = L.querySelector('.page-jumps') || L.querySelector('.hero') || L.querySelector('.breadcrumbs');
  anchor ? anchor.insertAdjacentHTML('afterend', html) : L.insertAdjacentHTML('afterbegin', html);
};

/* ---------- pages ---------- */
/** Card text for the Real biology home, keyed by route (so adding a page never shifts the descriptions). */
const BIO_CARDS = {
  '/biology/interleaved-resonance/': ['RESEARCH IN PROGRESS · CEBALLOS ET AL. 2025', 'Single-spike and burst resonance from LIF to GLIF, AdEx and a biophysical two-compartment model.'],
  '/biology/ca1-bursting/': ['MODEL FROM A PAPER · GOLOMB 2006', 'Persistent Na⁺ and M current in CA1 bursting: run the published model, block channels, and read the fast–slow phase plane.'],
  '/biology/histology/': ['VIRTUAL MICROSCOPE · STAINS & LAYERS', 'Nissl, Golgi, immunofluorescence and myelin on a section of rat hippocampus, with focus, objectives, a layer quiz and Alzheimer’s pathology.'],
  '/biology/spatial/': ['PLACE CELLS · GRID CELLS · NAVIGATION', 'How the hippocampal formation maps space: the pathway, place fields, grid and other spatial signals, theta phase and sequences, and how to read a navigation paper.'],
  '/biology/mechanisms/': ['TEACHING · ANIMATED TEXTBOOK FIGURES', 'Sarcomere and cross-bridge cycle, excitation–contraction coupling, summation and tetanus, the neuromuscular junction and repetitive nerve stimulation (myasthenia vs Lambert–Eaton): each figure loops through numbered steps, with “what if” toggles and a live graph from a calibrated model.'],
  '/biology/action-potential/': ['TEACHING · CHANNELS → SPIKE → CONDUCTION', 'One square micrometre of membrane, live: watch 60 Na⁺ and 18 K⁺ channels flicker, ions cross and the voltage swing; then follow the spike along squid, myelinated and C-fibre axons.'],
  '/biology/reflex/': ['TEACHING · NEURON → MUSCLE → BEHAVIOUR', 'Tap a tendon and follow the knee-jerk: saltatory conduction, a spinal synapse, the neuromuscular junction, Ca²⁺ release, cross-bridges, relaxation and the kick, with drugs and diseases to try.'],
  '/biology/cell-atlas/': ['3D · HIPPOCAMPUS → WHOLE BRAIN · 50 CELLS', 'Every real neuron in the guide in one place: hippocampal cells used by the models plus Allen, Janelia (MouseLight, FlyEM), SEU–Allen and lab reconstructions from cortex, thalamus, cerebellum, striatum, bulb, spinal cord, retina and fly.'],
  '/biology/whole-brain/': ['ALLEN CCF · JANELIA MOUSELIGHT', 'Complete single-neuron axons placed in the Allen mouse brain atlas: the perforant path, mossy fibres and thalamocortical projections, with an automatic check of where each axon goes.'],
  '/biology/active-dendrites/': ['NEURON · BACK-PROPAGATING SPIKES', 'The same published channel model on five real CA1 cells: bAP maps, a strong/weak switch that depends on morphology, and validation against the authors’ code.'],
  '/biology/axo-axonic/': ['NEURON · CHANDELIER → AIS', 'GABA at the axon initial segment of a real CA1 cell: when it vetoes a spike and when it speeds one up. Links the chandelier cells to the fly giant-fibre axo-axonic inputs.'],
  '/biology/dendritic-resonance/': ['NEURON · CHIRP IMPEDANCE · YOUR PROJECT', 'A published, data-tuned h-channel gradient, validated, then ported to five real CA1 cells: how much of theta resonance comes from morphology.'],
  '/biology/neuron-lab/': ['LIVE SIMULATION · TOGGLE ANY CHANNEL OR BRANCH', 'Simulate any of 59 reconstructions live: switch channels by type, region or branch, cut branches, place synapses and probes, check against published data and export a NEURON script.'],
  '/biology/circuit-builder/': ['LIVE SIMULATION · CONNECT ANY CELLS', 'Wire real neurons with a pathway library (Schaffer, mossy fibre, perforant path, basket, O-LM, chandelier) including short-term plasticity, gap junctions and drives.'],
  '/biology/real-circuit/': ['REAL CELLS WIRED', 'The reconstructed granule, CA3, CA1 and basket cells connected: follow a spike across synapses and through dendrites.'],
  '/biology/network/': ['LIVE NETWORK', 'A spiking model of EC → DG → CA3 → CA1 with interneurons: watch a burst propagate along the real pathways.'],
  '/biology/techniques/': ['METHODS', 'Patch clamp, extracellular probes, imaging, histology, electron microscopy and behavior: what each measures and its limits.'],
  '/biology/alzheimers/': ['DISEASE', 'Plaques, tangles, synapse loss, glia and hyperexcitability, and which model in this guide addresses each.'],
  '/biology/giant-fiber/': ['FLY CONNECTOME · YOUR MANC DATA', 'The escape circuit: mixed electrical–chemical synapses, your MANC axo-axonic inputs, E–I balance, a threshold model and a live mechanistic circuit calibrated to physiology.']
};

const BIO_PAGES = [['/biology/', 'Image gallery'], ['/biology/histology/', 'Histology: a virtual microscope'], ['/biology/spatial/', 'Spatial navigation & place cells'], ['/biology/mechanisms/', 'Mechanism atlas: textbook figures that move'], ['/biology/reflex/', 'From tap to kick: reflex, NMJ & muscle'], ['/biology/action-potential/', 'Action potential up close: channels, ions & conduction'], ['/biology/cell-atlas/', 'Neuron atlas (3D): hippocampus & beyond'], ['/biology/whole-brain/', 'Whole-brain projections (Allen CCF)'], ['/biology/active-dendrites/', 'Active dendrites in real cells (NEURON)'], ['/biology/axo-axonic/', 'Axo-axonic synapses at the AIS (NEURON)'], ['/biology/dendritic-resonance/', 'Theta resonance in real dendrites (NEURON)'], ['/biology/neuron-lab/', 'Neuron lab: simulate any real cell'], ['/biology/circuit-builder/', 'Circuit builder: wire real cells'], ['/biology/real-circuit/', 'Real cells, connected'], ['/biology/network/', 'Signal flow through the network'], ['/biology/techniques/', 'How the data are collected'], ['/biology/alzheimers/', 'Alzheimer’s disease biology'], ['/biology/giant-fiber/', 'Drosophila giant fiber (connectome)']];
window.bioNavPages = () => BIO_PAGES;
const bioHead = (title, pill, lead) => `<div class="breadcrumbs"><a href="/">Home</a><span>›</span><a href="/biology/">Real biology</a><span>›</span><span>${title}</span></div><div class="hero"><span class="pill">${pill}</span><h1>${title}</h1><p class="lead">${lead}</p></div>`;
window.renderBiology = function (slug) {
  const L = $('lesson');
  if (slug === 'neurons') return renderCellAtlas('CA1');   // merged into the neuron atlas
  if (slug === 'cell-atlas') return renderCellAtlas();
  if (slug === 'network') return renderNetworkFlow();
  if (slug === 'real-circuit') return renderRealCircuit();
  if (slug === 'giant-fiber') return renderGiantFiber();
  if (slug === 'whole-brain') return renderWholeBrain();
  if (slug === 'active-dendrites') return renderActiveDendrites();
  if (slug === 'axo-axonic') return renderAxoAxonic();
  if (slug === 'dendritic-resonance') return renderDendriticResonance();
  if (slug === 'neuron-lab') return renderNeuronLab();
  if (slug === 'reflex') return renderReflex();
  if (slug === 'action-potential') return renderAP();
  if (slug === 'mechanisms') return renderMechanisms();
  if (slug === 'circuit-builder') return renderCircuitBuilder();
  if (slug === 'histology') return renderHistology();
  if (slug === 'ca1-bursting') return renderCA1Bursting();
  if (slug === 'interleaved-resonance') return renderInterleavedResonance('sim');
  if (slug === 'research-reproduction') return renderInterleavedResonance('repro');
  if (slug === 'research-reduction') return renderInterleavedResonance('reduce');
  if (slug === 'research') return renderResearchHub();
  if (slug === 'research-ca1-cell') return renderResearchCell();
  if (slug === 'research-circuit') return renderResearchCircuit();
  if (slug === 'research-lowet-2023') return renderResearchLowet();
  if (slug === 'research-code') return renderResearchCode();
  if (slug === 'research-morphology') return renderResearchMorph();
  if (slug === 'research-place-fields') return renderResearchPlace();
  if (slug === 'research-resonance') return renderResearchResonance();
  if (slug === 'research-spiking') return renderResearchSpiking();
  if (slug === 'techniques') { document.title = 'Techniques · Real biology'; L.innerHTML = techniquesHTML(); return; }
  if (slug === 'alzheimers') { document.title = 'Alzheimer’s disease biology · Real biology'; L.innerHTML = adHTML(); adInit(); return; }
  document.title = 'Real biology · Little Neural Guide';
  L.innerHTML = bioHead('Real biology & images', `REAL BIOLOGY · ${Object.keys(FIGS).length} IMAGES · 59 RECONSTRUCTED NEURONS`, 'Micrographs, recordings, diagrams and real behavioral data that show the biology behind each model. Click any image to enlarge it.')
    + `<div class="overview-cards rb-cards">${BIO_PAGES.slice(1).map(([h, t]) => { const c = BIO_CARDS[h] || ['', '']; return `<a class="topic-card" href="${h}"><span class="eyebrow">${c[0]}</span><h2>${t}</h2><p>${c[1]}</p><span class="card-link">Open →</span></a>`; }).join('')}</div>
    <section class="lesson-section" id="rb-hub"><p class="eyebrow">Interactive modules</p><h2>What you can manipulate where</h2>
      <p>Each module answers a different kind of question. Start with the single-cell <b>Neuron lab</b> to learn what each channel and branch does, wire cells in the <b>Circuit builder</b>, then use the NEURON-computed pages to check results at full resolution.</p>
      <div class="ml-tablewrap"><table class="ml-table hub-tab"><thead><tr><th>Module</th><th>Real morphology</th><th>Channels on/off</th><th>Single branches</th><th>Synapses</th><th>Network</th><th>Computed by</th><th>Data export</th></tr></thead><tbody>
      ${[['/biology/mechanisms/', 'Mechanism atlas', 'step-by-step figures', 'drugs & diseases', '', '', '', 'live models, looping', ''],
        ['/biology/action-potential/', 'Action potential up close', 'patch + axon', 'TTX / TEA, ions', 'myelin, diameter', '', '', 'live HH + stochastic channels', ''],
        ['/biology/reflex/', 'From tap to kick', 'whole pathway', 'drugs & diseases', 'myelin', '● NMJ quantal release', 'reflex arc', 'live stage models', ''],
        ['/biology/neuron-lab/', 'Neuron lab', '59 cells', '●', '● cut / block', '● click to place', '', 'live engine (NEURON-checked)', '● + NEURON script'],
        ['/biology/circuit-builder/', 'Circuit builder', 'up to 8', 'profiles', '', '● pathway library + plasticity', '●', 'live engine', '●'],
        ['/biology/giant-fiber/#gf-mech', 'Giant fiber circuit', 'connectome synapses', '● gap / ACh / TNT', '', '● 800 MANC inputs', '●', 'live engine, calibrated to physiology', '●'],
        ['/biology/active-dendrites/', 'Active dendrites', '5 CA1 cells', 'A-type scale', '', '', '', 'NEURON (precomputed)', ''],
        ['/biology/axo-axonic/', 'Axo-axonic synapses', 'CA1 cells', 'GABA sign', 'AIS', 'timing maps', '', 'NEURON (precomputed)', ''],
        ['/biology/dendritic-resonance/', 'Theta resonance', 'CA1 cells', 'Ih gradient rules', '', '', '', 'NEURON chirp (precomputed)', ''],
        ['/biology/cell-atlas/', 'Neuron atlas', '59 cells', '', 'signal spread', 'place a synapse', '', 'NEURON passive checks', ''],
        ['/biology/real-circuit/', 'Real cells, connected', 'CA1 circuit', '', '', 'NEURON kernels', '●', 'NEURON kernels', ''],
        ['/biology/network/', 'Signal flow', '', '', '', '', '● live', 'rate / spiking model', '']].map(r => `<tr><td><a href="${r[0]}">${r[1]}</a></td>${r.slice(2).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="muted">● = available. Every live module flags parameters that leave published ranges, offers guided predict → run → explain experiments, and lists the papers and databases behind each cell, channel and synapse.</p></section>
    <div class="deck-cats" role="group" aria-label="Filter images"><button class="secondary" data-rbcat="all" aria-pressed="true">All</button>${FIG_CATS.map(c => `<button class="secondary" data-rbcat="${c}" aria-pressed="false">${c}</button>`).join('')}</div>
    <div class="rb-gallery" id="rb-gallery">${Object.keys(FIGS).map(id => `<div class="rb-item" data-cat="${FIGS[id].cat}">${realFig(id)}<p class="rb-used">${Object.entries(FIG_ROUTES).filter(([, v]) => v.includes(id)).slice(0, 3).map(([r]) => `<a href="${r}">${ngAllPages().find(p => p.href === r)?.label || r}</a>`).join(' · ')}</p></div>`).join('')}</div>
    <p class="muted">Images are from OpenStax textbooks (openly licensed under CC BY 4.0), with each original credit shown. Neuron reconstructions are from Migliore et al. (2018), distributed through ModelDB.</p>${smallPrint()}`;
  document.querySelectorAll('[data-rbcat]').forEach(b => b.onclick = () => { document.querySelectorAll('[data-rbcat]').forEach(x => x.setAttribute('aria-pressed', x === b)); document.querySelectorAll('.rb-item').forEach(it => it.hidden = b.dataset.rbcat !== 'all' && it.dataset.cat !== b.dataset.rbcat); });
};

/* ---------- techniques ---------- */
const SVG_PATCH = `<svg viewBox="0 0 520 230" class="rb-svg" role="img" aria-label="Patch-clamp configurations"><g font-family="system-ui" font-size="12" fill="#141111">
${[['Cell-attached', 'gigaseal; membrane intact'], ['Whole-cell', 'patch ruptured; pipette ↔ cytoplasm'], ['Outside-out', 'patch pulled away; single channels']].map(([t, s], i) => { const x = 20 + i * 170; return `<g transform="translate(${x},0)"><path d="M60 20 L60 95 L72 120 L88 120 L100 95 L100 20" fill="#f3e7db" stroke="#141111" stroke-width="2"/><text x="80" y="14" text-anchor="middle" font-weight="700">${t}</text>${i < 2 ? `<ellipse cx="80" cy="168" rx="70" ry="44" fill="#f8cddd" stroke="#141111" stroke-width="2"/>${i === 1 ? '<path d="M72 120 Q80 130 88 120" fill="#f8cddd" stroke="none"/><rect x="73" y="118" width="14" height="10" fill="#f8cddd"/>' : '<path d="M72 120 Q80 126 88 120" fill="none" stroke="#a62962" stroke-width="2.5"/>'}` : '<path d="M72 120 Q80 138 88 120" fill="#f8cddd" stroke="#a62962" stroke-width="2.5"/><circle cx="80" cy="128" r="3" fill="#a62962"/>'}<text x="80" y="226" text-anchor="middle" font-size="11" fill="#6f4c27">${s}</text></g>`; }).join('')}</g></svg>`;
const SVG_PROBE = `<svg viewBox="0 0 520 240" class="rb-svg" role="img" aria-label="Silicon probe recording sites near neurons"><g font-family="system-ui" font-size="12">
<path d="M240 0 L280 0 L280 200 L260 236 L240 200 Z" fill="#e7d5be" stroke="#141111" stroke-width="2"/>${Array.from({ length: 12 }, (_, k) => `<rect x="${k % 2 ? 264 : 248}" y="${20 + k * 15}" width="8" height="8" fill="#141111"/>`).join('')}
${[[170, 60], [345, 95], [190, 150], [330, 175], [150, 205]].map(([x, y], k) => `<g><path d="M${x} ${y} l-10 18 l20 0 z" fill="${k % 2 ? '#a62962' : '#6f4c27'}"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y - 22}" stroke="${k % 2 ? '#a62962' : '#6f4c27'}" stroke-width="2"/></g>`).join('')}
<g transform="translate(380,40)"><text x="0" y="0" font-weight="700">Spike waveforms</text>${[0, 1].map(k => `<path d="M0 ${30 + k * 50} l20 0 l6 ${k ? 22 : 30} l8 -${k ? 34 : 44} l10 14 l30 0" fill="none" stroke="${k ? '#a62962' : '#6f4c27'}" stroke-width="2.4"/><text x="0" y="${58 + k * 50}" font-size="11" fill="#6f4c27">unit ${k + 1}: shape across sites identifies it</text>`).join('')}</g>
<text x="20" y="20" font-weight="700">Silicon probe / tetrode</text><text x="20" y="38" font-size="11" fill="#6f4c27">Many sites pick up spikes from nearby cells</text></g></svg>`;
function techniquesHTML() {
  const T = (id, title, body, fig, rows, links) => `<section class="lesson-section" id="${id}"><h2>${title}</h2><div class="rb-tech"><div>${body}<dl class="rb-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${links ? `<div class="button-cloud">${links.map(([h, t]) => `<a class="secondary" href="${h}">${t}</a>`).join('')}</div>` : ''}</div><div>${fig}</div></div></section>`;
  return bioHead('How the data are collected', 'REAL BIOLOGY · METHODS', 'Every model parameter and validation target comes from a measurement. Knowing how each technique works, and what it cannot see, tells you how much to trust the numbers you fit.')
    + `<nav class="page-jumps"><a href="#t-patch">Patch clamp</a><a href="#t-extra">Extracellular</a><a href="#t-imaging">Calcium imaging</a><a href="#t-eeg">EEG & LFP</a><a href="#t-histo">Histology</a><a href="#t-em">Electron microscopy</a><a href="#t-recon">Reconstruction</a><a href="#t-behav">Behavior</a><a href="#t-compare">Compare</a></nav>`
    + T('t-patch', 'Intracellular and patch-clamp recording', '<p>A glass pipette seals onto the membrane. In <b>whole-cell</b> mode it connects to the cytoplasm, so you can inject current and record voltage (current clamp) or hold voltage and record current (voltage clamp). Excised patches isolate single channels.</p>', SVG_PATCH + realFig('recording-electrode', 'rb-small'), [['Measures', 'Membrane voltage or current of one cell, including subthreshold events'], ['Resolution', 'One cell; sub-millisecond'], ['Constrains', 'C<sub>m</sub>, input resistance, channel kinetics, f–I curves, resonance'], ['Watch for', 'Series resistance, liquid-junction potential, dialysis of the cell by the pipette solution']], [['/experiments/ephys/', 'Fit a model to patch-clamp data'], ['/lab/hh/', 'Hodgkin–Huxley model']])
    + T('t-extra', 'Extracellular recording: tetrodes and silicon probes', '<p>Electrodes outside cells pick up the fast voltage deflections that nearby neurons’ spikes produce. With several closely spaced sites (a tetrode has 4; a Neuropixels 1.0 probe has 960 sites, 384 recorded at once), each neuron’s spike has a distinctive shape across sites, which is how spikes are sorted into units.</p>', SVG_PROBE, [['Measures', 'Spike times of tens to hundreds of neurons, plus the local field potential'], ['Resolution', 'Single units; sub-millisecond'], ['Constrains', 'Firing rates, place fields, theta phase, network synchrony'], ['Watch for', 'Sorting errors, bias toward active and large cells, no subthreshold information']], [['/experiments/place-cells/', 'Place cells & decoding'], ['/lab/brunel/', 'Network firing statistics']])
    + T('t-imaging', 'Calcium imaging', '<p>Neurons express a fluorescent calcium indicator (e.g. GCaMP). Spikes raise intracellular calcium, so fluorescence rises quickly and decays over hundreds of milliseconds. One- and two-photon microscopes or head-mounted miniscopes image hundreds of identified cells over days.</p>', `<canvas class="rb-canvas" id="rb-ca"></canvas><p class="muted rb-capnote">Simulated: spikes (ticks) and the slower fluorescence signal they produce. Bursts are visible; single spikes in quick succession blur together.</p>`, [['Measures', 'Fluorescence, an indirect and slow proxy for spiking'], ['Resolution', 'Cellular; ~10–100 ms'], ['Constrains', 'Population activity, place-field stability across days'], ['Watch for', 'Indicator kinetics and saturation, motion, inferring spikes from fluorescence']], [['/fitting/place-field/', 'Fit a place field']])
    + T('t-eeg', 'EEG and local field potentials', '<p>EEG electrodes on the scalp and LFP electrodes in tissue record the summed synaptic currents of many thousands of neurons. They are ideal for rhythms (theta, gamma) and their coupling, and are the natural target for mean-field models.</p>', realFig('eeg-cap', 'rb-small'), [['Measures', 'Population synaptic activity'], ['Resolution', 'EEG: centimetres; LFP: hundreds of µm; both milliseconds'], ['Constrains', 'Oscillation frequency, power, cross-frequency coupling'], ['Watch for', 'Volume conduction, reference choice, mixing of sources']], [['/lab/wilson-cowan/', 'Wilson–Cowan rhythms'], ['/fitting/oscillation/', 'Fit a population rhythm']])
    + T('t-histo', 'Histology and immunostaining', '<p>Fixed tissue is sliced and stained. Classic dyes show cell bodies and layers; antibodies or genetic labels mark specific cell types (e.g. GFAP for astrocytes, parvalbumin for PV interneurons) or markers such as BrdU for dividing cells.</p>', `<div class="rb-grid rb-n2">${realFig('nervous-tissue')}${realFig('rat-hippocampus-brdu')}</div>`, [['Measures', 'Cell types, densities, layers, protein localization'], ['Resolution', 'Sub-micrometre; one time point'], ['Constrains', 'Cell counts, connectivity ratios, channel locations'], ['Watch for', 'Antibody specificity, tissue shrinkage, sampling']], [['/biology/histology/', 'Try it: virtual microscope'], ['/experiments/ca1-circuit/', 'The CA1 circuit']])
    + T('t-em', 'Electron microscopy', '<p>Electrons resolve structures far smaller than light can: vesicles, synaptic clefts, spines. Serial-section EM can reconstruct every synapse in a small volume (connectomics).</p>', realFig('sem-vesicles', 'rb-small'), [['Measures', 'Ultrastructure: synapses, vesicles, spines'], ['Resolution', 'Nanometres; fixed tissue'], ['Constrains', 'Synapse counts and sizes, wiring diagrams'], ['Watch for', 'Tiny volumes, no activity, enormous annotation effort']], [['/topics/synapses/chemical-electrical/', 'Chemical vs electrical synapses']])
    + T('t-recon', 'Neuron reconstruction', '<p>A filled or stained neuron is traced in 3D under the microscope (e.g. with Neurolucida), producing a file of branch points, coordinates and diameters. These files (SWC or ASC) are what compartmental models are built on.</p>', `<a class="topic-card" href="/biology/cell-atlas/"><span class="eyebrow">REAL DATA</span><h2>Explore 40 reconstructed neurons in 3D</h2><p>Rotate them, measure path distances and see how layers line up with dendrites.</p><span class="card-link">Open the 3D viewer →</span></a>`, [['Measures', 'Morphology: lengths, diameters, branching, layer positions'], ['Resolution', '~1 µm'], ['Constrains', 'Compartmental geometry, electrotonic distances'], ['Watch for', 'Shrinkage, cut branches at slice surfaces, diameter errors near the light limit']], [['/morphology/reconstructions/', 'From SWC to a model'], ['/biology/neurons/', 'Real CA1 neurons']])
    + T('t-behav', 'Behavioral testing', '<p>Behavior is the final readout. Mazes and arenas quantify spatial learning and memory; combined with recordings, they link neural codes to what the animal does.</p>', `<div class="rb-grid rb-n2">${realFig('rat-maze')}${realFig('latent-learning')}</div>`, [['Measures', 'Latency, errors, paths, preference'], ['Resolution', 'Whole animal; seconds to days'], ['Constrains', 'What a model of memory must ultimately explain'], ['Watch for', 'Motivation, stress, motor confounds, strategy differences']], [['/experiments/place-cells/', 'Place cells & behavior']])
    + `<section class="lesson-section" id="t-compare"><h2>Side by side</h2><div class="ml-tablewrap"><table class="ml-table"><thead><tr><th>Technique</th><th>Sees</th><th>Space</th><th>Time</th><th>Living?</th></tr></thead><tbody>
      <tr><td>Patch clamp</td><td>One cell’s voltage or current</td><td>1 cell</td><td>&lt;1 ms</td><td>Yes (slice or in vivo)</td></tr><tr><td>Tetrode / silicon probe</td><td>Spikes of many cells, LFP</td><td>~10–1,000 cells</td><td>&lt;1 ms</td><td>Yes</td></tr><tr><td>Calcium imaging</td><td>Fluorescence proxy of spiking</td><td>~100–1,000 cells</td><td>~10–100 ms</td><td>Yes</td></tr><tr><td>EEG / LFP</td><td>Population synaptic currents</td><td>mm–cm</td><td>ms</td><td>Yes</td></tr><tr><td>Histology</td><td>Cells, proteins, layers</td><td>&lt;1 µm</td><td>One time point</td><td>No</td></tr><tr><td>Electron microscopy</td><td>Synapses, vesicles</td><td>nm</td><td>One time point</td><td>No</td></tr></tbody></table></div></section>${smallPrint()}`;
}
/* calcium-imaging demo canvas, drawn after the techniques page renders */
window.drawCalciumDemo = function () {
  const cv = document.getElementById('rb-ca'); if (!cv) return;
  const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const spikes = [300, 900, 960, 1010, 1060, 1800, 2500, 2540, 3300, 3330, 3360, 3390, 3420], T = 4000, X = t => 10 + t / T * (w - 20);
  ctx.strokeStyle = '#141111'; spikes.forEach(t => { ctx.beginPath(); ctx.moveTo(X(t), h - 30); ctx.lineTo(X(t), h - 12); ctx.stroke(); });
  ctx.strokeStyle = '#a62962'; ctx.lineWidth = 2.2; ctx.beginPath(); let F = 0;
  for (let t = 0; t <= T; t += 10) { F *= Math.exp(-10 / 600); if (spikes.some(s => s > t - 10 && s <= t)) F += 1; const y = h - 40 - Math.min(F, 4.5) / 4.5 * (h - 60); t ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
  ctx.stroke(); ctx.fillStyle = '#6f4c27'; ctx.font = '11px system-ui'; ctx.fillText('ΔF/F (fluorescence)', 12, 14); ctx.fillText('spikes', 12, h - 34); ctx.fillText('4 s', w - 30, h - 2);
};

/* ---------- Alzheimer's disease biology ---------- */
const AD_STAGES = [
  ['Amyloid-β', 'Molecular', 'Aβ peptides aggregate into soluble oligomers and extracellular plaques. In mouse models, soluble Aβ is linked to early hippocampal hyperactivity (Busche et al., 2012).', 'Aβ is not in any model here. Its proposed effects (weaker inhibition, altered K⁺ currents) are.', [['/lab/brunel/', 'Lower g in the Brunel network'], ['/lab/hh/', 'Reduce K⁺ conductance']]],
  ['Tau tangles', 'Molecular → cellular', 'Hyperphosphorylated tau forms intracellular tangles. Tangles first appear in entorhinal regions and spread in a stereotyped sequence (Braak & Braak, 1991).', 'Entorhinal input to CA1 arrives in stratum lacunosum-moleculare: the temporoammonic path.', [['/experiments/ca1-circuit/', 'Entorhinal input in the CA1 circuit']]],
  ['Synapse loss', 'Synaptic', 'Synapses are lost and LTP is impaired; synapse loss correlates with cognitive decline.', 'Change synaptic weights or plasticity rules.', [['/lab/stdp/', 'STDP balance and competition'], ['/topics/learning/plasticity-rules/', 'Plasticity rules']]],
  ['Glia & inflammation', 'Cellular', 'Microglia and astrocytes become reactive around plaques, releasing cytokines and altering synapse pruning and glutamate handling.', 'Rarely modelled explicitly; a modeling frontier where wet-lab glia expertise matters.', [['/biology/', 'Glia images']]],
  ['Interneuron dysfunction', 'Circuit', 'In mouse models, impaired PV interneurons (e.g. reduced Nav1.1) disturb gamma rhythms and contribute to network hyperexcitability (Verret et al., 2012; Palop et al., 2007).', 'Weaken perisomatic inhibition and watch firing and rhythms change.', [['/lab/brunel/', 'Inhibition (g) in a spiking network'], ['/lab/wilson-cowan/', 'E–I rhythms'], ['/experiments/ca1-circuit/', 'PV inhibition in CA1']]],
  ['Spatial coding & memory', 'Network → behavior', 'Place cells become less precise and less stable in some AD mouse models, alongside spatial memory deficits.', 'Degrade place fields and measure decoding and spatial information.', [['/experiments/place-cells/', 'AD-like place-cell degradation']]],
];
function adHTML() {
  return bioHead('Alzheimer’s disease biology', 'REAL BIOLOGY · DISEASE', 'Alzheimer’s disease unfolds across scales, from molecules to memory. Models help connect those scales by asking which changes are sufficient to produce the circuit and behavioral symptoms.')
    + `<section class="lesson-section" id="ad-brain"><h2>What the disease does to the brain</h2>${realFig('alzheimers-brain', 'rb-wide')}<p class="nl-explain"><b>See it under the microscope:</b> the <a href="/biology/histology/">virtual histology page</a> adds plaques, tangles and CA1 cell loss to a section of hippocampus, under Nissl, Golgi and immunofluorescence.</p></section>
    <section class="lesson-section" id="ad-cascade"><h2>From molecules to memory</h2><p>Click a stage to see the biology, how a model can represent it, and where to try it in this guide.</p>
      <div class="ad-steps" role="tablist">${AD_STAGES.map((s, i) => `<button class="ad-step" role="tab" data-ad="${i}" aria-selected="${i === 0}"><small>${s[1]}</small>${s[0]}</button>`).join('<span class="ad-arrow" aria-hidden="true">→</span>')}</div>
      <div class="box pink ad-detail" id="ad-detail" role="tabpanel"></div></section>
    <section class="lesson-section" id="ad-caveats"><h2>Keep in mind</h2><ul class="skill-tips"><li>Most mechanistic evidence comes from mouse models that overexpress human mutant genes; they model parts of the disease, not all of it.</li><li>Hyperexcitability is an early feature in several models and in some patients, but its causal role is still debated.</li><li>Models can show that a change is <i>sufficient</i> to produce an effect in the model, not that it causes the disease.</li></ul></section>
    <section class="lesson-section" id="ad-refs"><h2>Key references</h2><ul class="rb-refs"><li>Braak H, Braak E (1991). Neuropathological stageing of Alzheimer-related changes. <i>Acta Neuropathol</i> 82:239–259.</li><li>Palop JJ et al. (2007). Aberrant excitatory neuronal activity and compensatory remodeling of inhibitory hippocampal circuits in mouse models of Alzheimer’s disease. <i>Neuron</i> 55:697–711.</li><li>Busche MA et al. (2012). Critical role of soluble amyloid-β for early hippocampal hyperactivity in a mouse model of Alzheimer’s disease. <i>PNAS</i> 109:8740–8745.</li><li>Verret L et al. (2012). Inhibitory interneuron deficit links altered network activity and cognitive dysfunction in Alzheimer model. <i>Cell</i> 149:708–721.</li><li>Jack CR et al. (2010). Hypothetical model of dynamic biomarkers of the Alzheimer’s pathological cascade. <i>Lancet Neurol</i> 9:119–128.</li></ul></section>${smallPrint()}`;
}
function adInit() {
  const show = i => { const s = AD_STAGES[i]; document.querySelectorAll('[data-ad]').forEach(b => b.setAttribute('aria-selected', +b.dataset.ad === i));
    $('ad-detail').innerHTML = `<p class="eyebrow">${s[1]}</p><h3>${s[0]}</h3><p>${s[2]}</p><p><b>In a model:</b> ${s[3]}</p><div class="button-cloud">${s[4].map(([h, t]) => `<a class="secondary" href="${h}">${t}</a>`).join('')}</div>`; };
  document.querySelectorAll('[data-ad]').forEach(b => b.onclick = () => show(+b.dataset.ad)); show(0);
}

/* ---------- real neuron 3D viewer ---------- */
function renderNeuronViewer() {
  document.title = 'Real CA1 neurons · Real biology';
  $('lesson').innerHTML = bioHead('Real CA1 neurons', 'REAL BIOLOGY · RECONSTRUCTED MORPHOLOGIES', 'These are tracings of real rat CA1 neurons, made under the microscope and shared with a published model. Rotate them, switch on the traced layer boundaries, and click a dendrite to measure how far it is from the soma.')
    + `<section class="lesson-section lab" id="nv"><h2>Explore a reconstruction</h2>
      <div class="nv-wrap"><canvas id="nvCanvas" class="nv-canvas" aria-label="3D view of a reconstructed neuron. Drag to rotate."></canvas>
      <div class="lab-controls nv-controls">
        <div class="control-row"><label for="nvCell">Neuron</label><select id="nvCell">${CA1_MORPH.map((c, i) => `<option value="${i}">${c.label}</option>`).join('')}</select></div>
        <div class="control-row"><label>Colour by</label><div class="lab-actions ml-seg"><button class="secondary" data-nvc="type" aria-pressed="true">Compartment</button><button class="secondary" data-nvc="dist" aria-pressed="false">Distance from soma</button></div></div>
        <label class="compare-label"><input type="checkbox" id="nvAxon"> Show axon</label>
        <label class="compare-label"><input type="checkbox" id="nvLayers" checked> Show traced layer boundaries</label>
        <label class="compare-label"><input type="checkbox" id="nvSpin"> Rotate slowly</label>
        <div class="control-row"><label for="nvLam">Length constant λ for the estimate <output id="nvLam-o" class="ml-out"></output></label><input id="nvLam" type="range" min="150" max="900" step="10" value="400"></div>
        <p class="muted">Drag on the neuron to rotate. Click a branch to measure it.</p>
        <div id="nvPick" class="ml-fp"></div></div></div>
      <div class="lab-result" id="nvStats"></div></section>
    <section class="lesson-section" id="nv-about"><h2>Where these come from</h2><p>The pyramidal cells (mpg141208_B, mpg141209_A) and interneurons (060314AM2, 011023HP2) were filled, imaged and traced in rat hippocampal slices, then used to build data-driven compartmental models in Migliore et al. (2018), <i>PLoS Computational Biology</i> 14:e1006423. The files are distributed through ModelDB (accession 244688). Pyramidal cells were traced together with the boundaries between layers, so you can see which dendrites live in which layer.</p>
      <ul class="skill-tips"><li><b>Path distance</b> along the dendrite, not straight-line distance, sets how much a synaptic signal attenuates.</li><li>Real apical dendrites reach roughly 500 µm from the soma, matching the layer proportions used in the CA1 circuit page, which now draws these same cells.</li><li>Slicing cuts some branches, and diameters near 1 µm are hard to measure: both affect compartmental models built from tracings.</li></ul></section>
    <section class="lesson-section" id="code"><p class="eyebrow">Do it in Python</p><h2>Load and measure a reconstruction</h2><div class="code-toolbar"><span>Python 3 · morphio, neurom</span><button class="secondary" id="nv-copy">Copy Python</button></div><pre><code id="nv-code">import morphio, numpy as np
# Download from ModelDB 244688 (github.com/ModelDBRepository/244688, folder morphologies/)
m = morphio.Morphology("mpg141209_A_idA.asc")

def length(sec):
    p = sec.points
    return np.linalg.norm(np.diff(p, axis=0), axis=1).sum()

for t in (morphio.SectionType.apical_dendrite, morphio.SectionType.basal_dendrite, morphio.SectionType.axon):
    secs = [s for s in m.sections if s.type == t]
    print(t, len(secs), "sections,", round(sum(length(s) for s in secs)), "µm total")

# Path distance from soma to the end of every apical section
def path_to_soma(sec):
    d = 0.0
    while sec is not None:
        d += length(sec)
        sec = None if sec.is_root else sec.parent
    return d
ends = [path_to_soma(s) for s in m.sections if s.type == morphio.SectionType.apical_dendrite and not s.children]
print("max apical path distance:", round(max(ends)), "µm")

# For simulation: NEURON can load .asc via Import3d; NeuroM/BluePyOpt build models from it.</code></pre></section>${smallPrint()}`;
  $('nv-copy').onclick = async () => { try { await navigator.clipboard.writeText($('nv-code').textContent); $('nv-copy').textContent = 'Copied ✓'; } catch (e) { const r = document.createRange(); r.selectNodeContents($('nv-code')); getSelection().removeAllRanges(); getSelection().addRange(r); } };
  nvInit();
}
function nvInit() {
  const cv = $('nvCanvas'), S = { cell: 0, yaw: 0.0, pitch: 0, mode: 'type', pick: null, drag: null, spin: false };
  let geo = null;
  const build = () => {   // flatten sections to segments with path distance
    const c = CA1_MORPH[S.cell], segs = [], ends = new Array(c.sections.length); const len = { 2: 0, 3: 0, 4: 0 }; let maxD = 0, tips = 0, branches = 0; const kids = new Array(c.sections.length).fill(0);
    c.sections.forEach(s => { if (s[1] >= 0) kids[s[1]]++; });
    c.sections.forEach((s, i) => {
      const [t, par, xyz, r] = s, n = xyz.length / 3; let d = par >= 0 ? ends[par] : 0;
      let px = xyz[0], py = xyz[1], pz = xyz[2];
      if (par >= 0) { const pp = c.sections[par][2], m = pp.length; px = pp[m - 3]; py = pp[m - 2]; pz = pp[m - 1]; }
      for (let k = 0; k < n; k++) { const x = xyz[3 * k], y = xyz[3 * k + 1], z = xyz[3 * k + 2], L = Math.hypot(x - px, y - py, z - pz); if (k || par >= 0) { segs.push({ x1: px, y1: py, z1: pz, x2: x, y2: y, z2: z, r: r[k], t, d0: d, d1: d + L, sec: i }); d += L; len[t] += L; } px = x; py = y; pz = z; }
      ends[i] = d; if (t !== 2) { maxD = Math.max(maxD, d); if (!kids[i]) tips++; if (kids[i] > 1) branches++; }
    });
    geo = { c, segs, len, maxD, tips, branches };
    const apic = c.sections.some(s => s[0] === 4);
    $('nvStats').innerHTML = `<b>${c.label}</b> · ${apic ? `apical dendrite <b>${(len[4] / 1000).toFixed(2)} mm</b> · ` : ''}basal dendrites <b>${(len[3] / 1000).toFixed(2)} mm</b> · axon traced <b>${(len[2] / 1000).toFixed(2)} mm</b> · <b>${branches}</b> dendritic branch points · <b>${tips}</b> dendritic tips · farthest dendrite <b>${Math.round(maxD)} µm</b> path distance`;
    $('nvLayers').disabled = !Object.keys(c.contours).length;
  };
  const proj = () => { const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch); return (x, y, z) => { const X = x * cy + z * sy, Z = -x * sy + z * cy, Y = y * cp - Z * sp; return [X, Y, y * sp + Z * cp]; }; };
  const draw = () => {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const P = proj(), showAx = $('nvAxon').checked, all = geo.segs.filter(s => showAx || s.t !== 2);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; all.forEach(s => { const a = P(s.x1, s.y1, s.z1); x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); y0 = Math.min(y0, a[1]); y1 = Math.max(y1, a[1]); });
    if (geo.c.contours && $('nvLayers').checked) Object.values(geo.c.contours).forEach(v => v.forEach(seg => { for (let k = 0; k < seg.length; k += 2) { const a = P(seg[k], seg[k + 1], 0); y0 = Math.min(y0, a[1]); y1 = Math.max(y1, a[1]); } }));
    const sc = Math.min((w - 40) / (x1 - x0 || 1), (h - 40) / (y1 - y0 || 1)), ox = w / 2 - sc * (x0 + x1) / 2, oy = h / 2 - sc * (y0 + y1) / 2, X = v => ox + v * sc, Y = v => oy + v * sc;
    S.view = { P, X, Y, sc };
    if (geo.c.contours && $('nvLayers').checked && Math.abs(S.yaw) < 0.6) {           // traced layer boundaries (2D, so shown near the original view)
      ctx.font = '600 11px system-ui'; Object.entries(geo.c.contours).forEach(([k, v]) => { ctx.strokeStyle = 'rgba(140,118,100,.75)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
        v.forEach(seg => { ctx.beginPath(); for (let i = 0; i < seg.length; i += 2) { const a = P(seg[i], seg[i + 1], 0); i ? ctx.lineTo(X(a[0]), Y(a[1])) : ctx.moveTo(X(a[0]), Y(a[1])); } ctx.stroke(); const a = P(seg[0], seg[1], 0); ctx.setLineDash([]); ctx.fillStyle = '#6f4c27'; ctx.fillText(k, Math.min(w - 70, Math.max(6, X(a[0]))), Y(a[1]) - 4); }); });
      ctx.setLineDash([]);
    }
    const col = s => S.mode === 'dist' ? `hsl(${330 - Math.min(1, s.d1 / Math.max(geo.maxD, 1)) * 300} 60% ${s.t === 2 ? 70 : 38}%)` : s.t === 4 ? '#a62962' : s.t === 3 ? '#6f4c27' : 'rgba(20,17,17,.35)';
    const sorted = all.map(s => ({ s, a: P(s.x1, s.y1, s.z1), b: P(s.x2, s.y2, s.z2) })).sort((p, q) => (p.a[2] + p.b[2]) - (q.a[2] + q.b[2]));
    ctx.lineCap = 'round';
    sorted.forEach(({ s, a, b }) => { ctx.strokeStyle = col(s); ctx.lineWidth = Math.max(s.t === 2 ? .5 : .9, s.r * 2 * sc * (s.t === 2 ? .6 : 1)); ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke(); });
    const so = geo.c.soma; if (so.length > 2) { ctx.fillStyle = '#141111'; ctx.beginPath(); for (let i = 0; i < so.length; i += 2) { const a = P(so[i], so[i + 1], 0); i ? ctx.lineTo(X(a[0]), Y(a[1])) : ctx.moveTo(X(a[0]), Y(a[1])); } ctx.closePath(); ctx.fill(); }
    if (S.pick) { const p = S.pick, a = P(p.x2, p.y2, p.z2); ctx.strokeStyle = '#ed83b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(a[0]), Y(a[1]), 8, 0, 7); ctx.stroke(); }
    // scale bar
    const bar = 100 * sc; ctx.fillStyle = '#141111'; ctx.fillRect(w - 20 - bar, h - 18, bar, 3); ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.fillText('100 µm', w - 20, h - 24); ctx.textAlign = 'left';
  };
  const pickInfo = () => {
    const p = S.pick; if (!p) { $('nvPick').innerHTML = '<b>Click a branch</b><p class="muted">to see its path distance from the soma.</p>'; return; }
    const lam = +$('nvLam').value, d = (p.d0 + p.d1) / 2, att = Math.exp(-d / lam), kind = p.t === 4 ? 'apical dendrite' : p.t === 3 ? 'basal dendrite' : 'axon';
    $('nvPick').innerHTML = `<b>${kind}</b><p>Path distance to soma: <b>${Math.round(d)} µm</b> · local diameter ${(p.r * 2).toFixed(2)} µm</p>${p.t !== 2 ? `<p>Passive steady-state estimate with λ = ${lam} µm: about <b>${Math.round(att * 100)}%</b> of a local depolarization would reach the soma (e<sup>−${Math.round(d)}/${lam}</sup>). Fast synaptic events attenuate more.</p>` : '<p>Axons carry spikes away from the soma; they are not passive integrators like dendrites.</p>'}`;
  };
  cv.addEventListener('pointerdown', e => { S.drag = { x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!S.drag) return; const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) S.drag.moved = true; S.yaw = S.drag.yaw + dx * 0.01; S.pitch = Math.max(-1.2, Math.min(1.2, S.drag.pitch + dy * 0.01)); draw(); });
  cv.addEventListener('pointerup', e => {
    const was = S.drag; S.drag = null; if (was && was.moved) return;
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, { P, X, Y } = S.view; let best = 14, hit = null;
    geo.segs.forEach(s => { if (s.t === 2 && !$('nvAxon').checked) return; const a = P(s.x2, s.y2, s.z2), dd = Math.hypot(X(a[0]) - mx, Y(a[1]) - my); if (dd < best) { best = dd; hit = s; } });
    S.pick = hit; pickInfo(); draw();
  });
  const spin = () => { if (!$('nvSpin') || !$('nvSpin').checked) return; S.yaw += 0.01; draw(); requestAnimationFrame(spin); };
  $('nvCell').onchange = () => { S.cell = +$('nvCell').value; S.pick = null; S.yaw = 0; S.pitch = 0; build(); pickInfo(); draw(); };
  document.querySelectorAll('[data-nvc]').forEach(b => b.onclick = () => { S.mode = b.dataset.nvc; document.querySelectorAll('[data-nvc]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
  ['nvAxon', 'nvLayers'].forEach(id => $(id).onchange = draw);
  $('nvSpin').onchange = () => { if ($('nvSpin').checked) requestAnimationFrame(spin); };
  const lam = $('nvLam'); const lo = () => { $('nvLam-o').textContent = lam.value + ' µm'; }; lam.oninput = () => { lo(); pickInfo(); }; lo();
  build(); pickInfo(); draw();
  window.addEventListener('resize', () => { if (document.body.contains(cv)) draw(); });
}
