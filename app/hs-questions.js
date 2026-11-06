/* hs-questions.js: start from a biological question instead of a model.
   Each question says which neuron and model to use and why, what is simulated (and its wet-lab equivalent), what to
   expect (qualitatively, from the cited papers; never a number the model was tuned to), and after each run reads the
   actual readout and says what it means. Expectations were checked against hippsim's own runs on the recommended
   cell (tools/test_atlas.py runs one question end to end). References are keys in references.bib unless written out. */
(function (root) {
  'use strict';
  const num = v => { const m = String(v ?? '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
  const rd = R => Object.fromEntries((R && R.readout || []).map(([k, v]) => [k, String(v).replace(/\s*\((?:0 = none|0–1|last \/ first ISI)\)$/, '')]));
  const Q = [
    {
      id: 'excite', tag: 'Excitability', q: 'How does a neuron turn a steady input into spikes?',
      cell: 'ca1-n123', model: 'hh', test: 'step', manip: 'ttx',
      whyCell: 'A fully reconstructed CA1 pyramidal cell: real dendrites load the soma the way they do in a slice.',
      whyModel: 'Hodgkin–Huxley: only fast Na⁺ and delayed-rectifier K⁺. The simplest model that makes action potentials, so you see the core mechanism without anything else.',
      sim: 'Inject a 0.5 nA current step into the soma for 300 ms, then repeat with Na⁺ channels blocked.',
      lab: 'Whole-cell current clamp, depolarizing step; then bath-apply TTX.',
      expect: 'A train of action potentials during the step. With TTX (Na⁺ channels blocked) the membrane only charges up passively: no spikes.',
      meaning: 'Neurons report how strongly they are driven as a number and rate of spikes. Voltage-gated Na⁺ channels are what turns depolarization into an all-or-none spike.',
      refs: ['hodgkin1952'],
      read: (R, B) => { const r = rd(R); if (!B) return `The cell fired ${r.Spikes} spikes (${r.Rate || 'no rate'}), the first ${r['First spike'] || '–'} after the step began.`;
        const b = rd(B); return num(r.Spikes) === 0 ? `With TTX: no spikes (baseline ${b.Spikes}). The step still depolarizes the cell, but without Na⁺ channels nothing regenerative happens.` : `With TTX: ${r.Spikes} spikes vs ${b.Spikes} at baseline.`; }
    },
    {
      id: 'ih', tag: 'Dendrites', q: 'What does Iₕ (HCN channels) do to a CA1 pyramidal cell?',
      cell: 'ca1-n123', model: 'migliore', test: 'sag', manip: 'zd',
      whyCell: 'A CA1 pyramidal cell, the cell type the Iₕ measurements come from.',
      whyModel: 'Migliore-derived CA1 model: Iₕ density rises with distance from the soma, as measured in CA1 dendrites.',
      sim: 'A small hyperpolarizing step (−0.3 nA, 120 ms), then the same with Iₕ blocked.',
      lab: 'Current clamp, hyperpolarizing step; then bath-apply ZD7288 (HCN blocker).',
      expect: 'The voltage drops, then partly recovers during the step (sag) and overshoots when the step ends (rebound). Blocking Iₕ removes sag and rebound and raises the input resistance.',
      meaning: 'Iₕ is open at rest: it makes the cell leakier and pulls the voltage back toward rest. It shortens the time window over which inputs add up, so the cell responds more to timing than to slow summation.',
      refs: ['magee1998'],
      read: (R, B) => { const r = rd(R); if (!B) return `Sag ratio ${r['Sag ratio']}, rebound ${r.Rebound}, input resistance ${r['Input resistance']}.`;
        const b = rd(B); return `With ZD7288: sag ratio ${r['Sag ratio']} (baseline ${b['Sag ratio']}), input resistance ${r['Input resistance']} (baseline ${b['Input resistance']}). ${num(r['Input resistance']) > num(b['Input resistance']) ? 'The cell got less leaky: Iₕ was a large part of its resting conductance.' : ''}`; }
    },
    {
      id: 'resonance', tag: 'Rhythms', q: 'Why do CA1 neurons respond best to rhythmic input?',
      cell: 'ca1-n123', model: 'migliore', test: 'zap', manip: 'zd',
      whyCell: 'A CA1 pyramidal cell: hippocampal theta rhythm drives these cells in behaving animals.',
      whyModel: 'Migliore-derived CA1 model: it has Iₕ, the current that produces resonance in these cells.',
      sim: 'A small current that sweeps from 1 to 20 Hz; the impedance (voltage response per current) at each frequency. Then again with Iₕ blocked.',
      lab: 'Current clamp, ZAP / chirp current; impedance profile; ZD7288.',
      expect: 'Recorded CA1 cells show a peak (resonance) in the theta range, and blocking Iₕ abolishes it. Watch the frequency: this model may not peak where real cells do.',
      meaning: 'Resonance makes a neuron a band-pass filter: inputs at its preferred frequency move the voltage most. That is one way single cells take part in network rhythms like theta.',
      refs: ['hu2002', 'narayanan2007'],
      read: (R, B) => { const r = rd(R), f = num(r['Resonance frequency']); if (!B) return isNaN(f) ? 'No resonance in this run (low-pass).' : `Resonance at ${r['Resonance frequency']} (Q ${r['Q (peak / at 1 Hz)']}). ${f > 10 ? 'That is above the theta range reported for recorded CA1 cells: a mismatch between this model and the biology worth keeping in mind.' : 'In the theta range, as in recorded cells.'}`;
        const b = rd(B); return `With ZD7288: ${r['Resonance frequency']} (baseline ${b['Resonance frequency']}). ${isNaN(num(r['Resonance frequency'])) ? 'Resonance is gone: in this model it depends on Iₕ, as in the recordings.' : ''}`; }
    },
    {
      id: 'bap', tag: 'Dendrites', q: 'How far does an action potential travel back into the dendrites?',
      cell: 'ca1-n123', model: 'migliore', test: 'bap', manip: 'ap4',
      whyCell: 'A CA1 pyramidal cell with a long apical dendrite, so you can see the spike change with distance.',
      whyModel: 'Migliore-derived CA1 model: A-type K⁺ channels get denser with distance, as measured in CA1 dendrites.',
      sim: 'A brief strong pulse at the soma to make one spike; the peak voltage everywhere in the tree. Then with A-type K⁺ blocked.',
      lab: 'Dual soma–dendrite patch recording of a back-propagating spike; then 4-AP.',
      expect: 'The spike shrinks as it travels out into the dendrites. Blocking A-type K⁺ channels lets it invade much further.',
      meaning: 'A back-propagating spike tells the synapses “this neuron just fired”, which matters for plasticity. A-type K⁺ channels decide how far that message reaches.',
      refs: ['stuart1994', 'hoffman1997'],
      read: (R, B) => { const r = rd(R); if (!B) return `${r['At soma']} at the soma, ${r['At 250–350 µm']} at 250–350 µm; half amplitude by ${r['Falls to half by']}.`;
        const b = rd(B); return `With 4-AP: ${r['At 250–350 µm']} at 250–350 µm (baseline ${b['At 250–350 µm']}); half amplitude by ${r['Falls to half by']} (baseline ${b['Falls to half by']}). Blocking A-type K⁺ lets the spike invade the dendrites.`; }
    },
    {
      id: 'distal', tag: 'Dendrites', q: 'How much of a distal (entorhinal) input reaches the soma?',
      cell: 'ca1-n123', model: 'migliore', test: 'tuft', manip: 'ap4',
      whyCell: 'A CA1 pyramidal cell: entorhinal input lands on the far tuft, hundreds of µm from the soma.',
      whyModel: 'Migliore-derived CA1 model, with the dendritic channels that filter distal input.',
      sim: 'Synapses (AMPA + NMDA) activated together on the distal tuft; voltage at the first synapse and at the soma. Then with A-type K⁺ blocked.',
      lab: 'Stimulate the perforant / temporoammonic path, record at the soma (and dendrite); then 4-AP.',
      expect: 'A large local response in the tuft but only a small one at the soma. With A-type K⁺ channels blocked, dendritic spikes can carry the input to the soma.',
      meaning: 'Where a synapse is matters: distal inputs are filtered on the way to the soma, and dendritic channels (and dendritic spikes) decide whether they make the cell fire.',
      refs: ['golding2002', 'magee2000'],
      read: (R, B) => { const r = rd(R); if (!B) return `Dendrite ${r['Dendrite peak (first synapse)']}, soma ${r['Soma peak']}, ${r['Soma spikes']} soma spike(s). Most of the response stays in the tuft.`;
        const b = rd(B); return `With 4-AP: soma ${r['Soma peak']} and ${r['Soma spikes']} spike(s) (baseline ${b['Soma peak']}, ${b['Soma spikes']}).`; }
    },
    {
      id: 'ad-ka', tag: 'Disease', q: 'Could Alzheimer’s-like loss of A-type K⁺ make dendrites hyperexcitable?',
      cell: 'ca1-n123', model: 'migliore', test: 'bap', manip: 'abeta',
      whyCell: 'A CA1 pyramidal cell: CA1 is affected early in Alzheimer’s disease.',
      whyModel: 'Migliore-derived CA1 model: its A-type K⁺ gradient can be reduced the way Aβ was reported to reduce it.',
      sim: 'The back-propagating spike, at baseline and with A-type K⁺ halved (Aβ-like).',
      lab: 'Dendritic recording of back-propagating spikes in slices treated with Aβ.',
      expect: 'Less A-type K⁺ should let spikes invade the dendrites more strongly. This is a model what-if built from one reported effect of Aβ (Chen 2005, Neurobiol Dis 18:671), not a model of Alzheimer’s disease.',
      meaning: 'If dendrites are more excitable, they let in more Ca²⁺ and may change plasticity: one proposed route from Aβ to network hyperexcitability.',
      refs: ['hoffman1997', 'palop2007'],
      read: (R, B) => { const r = rd(R); if (!B) return `Baseline: ${r['At 250–350 µm']} at 250–350 µm; half amplitude by ${r['Falls to half by']}. Now apply “Aβ-like”.`;
        const b = rd(B); return `Aβ-like: ${r['At 250–350 µm']} at 250–350 µm (baseline ${b['At 250–350 µm']}), half amplitude by ${r['Falls to half by']} (baseline ${b['Falls to half by']}). ${num(r['At 250–350 µm']) > num(b['At 250–350 µm']) ? 'The dendrites are more excitable.' : ''}`; }
    },
    {
      id: 'burst', tag: 'Excitability', q: 'Why do some CA1 cells fire bursts instead of single spikes?',
      cell: 'ca1-n123', model: 'research', test: 'thetagamma', manip: 'nom',
      whyCell: 'A CA1 pyramidal cell; the research model is built for this cell type.',
      whyModel: 'The lab research model: Golomb 2006 somatic M-current (Kv7) and persistent Na⁺ current, the two currents that set bursting in CA1.',
      sim: 'Theta + gamma current drive for 1 s; count single spikes and bursts. Then with the M-current removed.',
      lab: 'Current clamp with oscillatory drive; then XE991 (Kv7 blocker).',
      expect: 'At baseline mostly single spikes. Removing the M-current lets the persistent Na⁺ current win after each spike, producing bursts.',
      meaning: 'Bursts and single spikes carry different messages to downstream cells. A slow K⁺ current (I_M) is a brake on bursting, and it is modulated by acetylcholine.',
      refs: ['golomb2006'],
      read: (R, B) => { const r = rd(R); if (!B) return `${r['Single spikes']} single spikes, ${r.Bursts} bursts.`;
        const b = rd(B); return `Without I_M: ${r.Bursts} bursts and ${r['Single spikes']} single spikes (baseline ${b.Bursts} bursts). ${num(r.Bursts) > num(b.Bursts) ? 'The M-current was keeping the cell from bursting.' : ''}`; }
    },
    {
      id: 'ffi', tag: 'Circuits', q: 'How does inhibition shape what a neuron passes on?',
      cell: 'ca1-n123', model: 'circuit', test: 'circuit', manip: 'bic',
      whyCell: 'A CA1 pyramidal cell receiving excitatory input on its dendrites and inhibition near the soma.',
      whyModel: 'Excitatory input + feedforward inhibition on the Migliore-derived cell, both θ-modulated.',
      sim: '1 s of θ-modulated excitatory and inhibitory synaptic input; firing rate and how tightly spikes lock to the θ cycle. Then with GABA-A blocked.',
      lab: 'Stimulate afferents with recording at the soma; then bicuculline.',
      expect: 'Inhibition keeps firing sparse and precisely timed. Blocking it should raise the rate and loosen the timing.',
      meaning: 'Inhibition is not just “less firing”: it sets when a neuron is allowed to fire, which is how circuits keep spike timing precise.',
      refs: ['pouille2001'],
      read: (R, B) => { const r = rd(R); if (!B) return `${r.Rate}, phase locking ${r['Phase locking']}.`;
        const b = rd(B); return `Without GABA-A: ${r.Rate} (baseline ${b.Rate}), phase locking ${r['Phase locking']} (baseline ${b['Phase locking']}). ${num(r['Phase locking']) < num(b['Phase locking']) ? 'More spikes, less precise timing.' : ''}`; }
    }
  ];
  root.HSQuestions = {Q, byId: id => Q.find(x => x.id === id)};
})(typeof window !== 'undefined' ? window : globalThis);
