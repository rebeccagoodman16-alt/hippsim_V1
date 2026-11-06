"""Model cards for the 24 real-biology simulator tools → site/hs-cards.js.

Every value here was read from the running tool (tools/tool_harvest.json) or its own source text;
references are ids in the Guide's verified bibliography (refs-data.js, Crossref/PubMed-checked).
Levels: 1 Explore · 2 Measure · 3 Manipulate · 4 Research.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVELS = {1: ("Explore", "See the biology: real cells, pathways and mechanisms, with defaults that just run"),
          2: ("Measure", "Standard electrophysiology protocols on real reconstructions: impedance, bAPs, f–I"),
          3: ("Manipulate", "Perturb channels, synapses, connectivity or genotype and compare against the baseline"),
          4: ("Research", "The lab's CA1 model line: reproduction, reduction, morphology, circuit and place fields")}

C = {}
def card(route, level, question, model, biology, baseline, manipulate, validation, refs, code=()):
    C[route] = dict(level=level, question=question, model=model, biology=biology, baseline=baseline,
                    manipulate=manipulate, validation=validation, refs=list(refs), code=list(code))

# ---------------------------------------------------------------- Neuron studio
card("/biology/cell-atlas/", 1, "How do real neuron shapes differ across regions and species?",
     "59 traced reconstructions rendered in 3D; morphometrics (length, tips, branch points, Sholl) computed from the traces; NEURON passive cross-check of the e^(−d/λ) shortcut.",
     "Each cell is a published tracing (ModelDB packages, NeuroMorpho.Org, Allen Cell Types, Janelia MouseLight, FlyEM/MANC) with its layer and region labels.",
     [["Cells", "59", "", "hippocampal formation + 8 other systems + Drosophila"], ["Dendritic λ", "190", "µm", "propagation display"]],
     ["Choose any cell or load your own .swc", "Compare two cells' morphometrics", "Toggle axon, labels, input map"],
     "Morphometrics recomputed from the traces; passive attenuation checked against NEURON for 51 cells.",
     ["ascoli2007", "gouwens2019", "winnubst2019", "scheffer2020"], ["NeuroMorpho.Org", "ModelDB"])
card("/workbench/morphology/", 2, "How does a real dendritic tree filter and attenuate signals?",
     "Passive multicompartment cable on the selected reconstruction (Hines-ordered tree): attenuation, transfer impedance at f, EPSP maps, bAP maps, quantal analysis.",
     "Membrane resistance, axial resistance and capacitance stand for the lipid membrane and cytoplasm; the spine factor folds spine membrane into dendritic area beyond 100 µm.",
     [["Rm", "28 000", "Ω·cm²", "passive membrane"], ["Ra", "150", "Ω·cm", "cytoplasm"], ["Cm", "1", "µF/cm²", "lipid bilayer"],
      ["Spine factor", "2 (off by default)", "×", "beyond 100 µm"], ["Frequency", "≈0.9", "Hz", "transfer impedance display"]],
     ["Rm, Ra, Cm, spine correction", "Colour the tree by attenuation, impedance or EPSP", "Compare two cells"],
     "Cable solver follows NEURON's discretization (Hines 1997); passive results cross-checked in NEURON.",
     ["rall1959", "zador1995", "magee2000", "narayanan2007", "hines1997"])
card("/biology/neuron-lab/", 3, "What happens when I change channels, cut branches or move inputs on a real cell?",
     "Active multicompartment model on the selected reconstruction: Migliore et al. 2005 CA1 channels (ModelDB 55035) with the cable equation per compartment.",
     "Na⁺, delayed-rectifier K⁺, A-type K⁺ (rising with distance) and Iₕ (HCN, rising with distance) placed as in Migliore 2005; synapses and probes at chosen branches.",
     [["Channel set", "Migliore et al. 2005", "", "ModelDB 55035"], ["Rm / Ra / Cm", "28 000 / 150 / 1", "Ω·cm² / Ω·cm / µF/cm²", "shared with Measure"]],
     ["Add synapse, add probe", "Cut branch, local TTX", "Block A-type, block Iₕ, make passive", "Run protocols, keep a run as reference"],
     "Engine validated against NEURON (see the tool's “Engine & validation” section).",
     ["mainen1996", "spruston2008", "hines1997", "ascoli2007"], ["ModelDB 55035"])
card("/biology/circuit-builder/", 3, "How do real cells interact when wired by their actual pathways?",
     "Several reconstructed cells connected by synapses; each cell runs the studio's cable model.",
     "Pathway-specific connections (e.g. feedforward inhibition through basket cells) on real dendritic locations.",
     [["Cells", "from the atlas", "", "shared current cell"]],
     ["Add cells to the circuit", "Choose connections and synapse sites", "Stimulate and record"],
     "Same engine as Channels & simulation.",
     ["klausberger2008", "pouille2001", "hines1997"])
card("/biology/neuron-viewer/", 1, "What does this neuron look like in full 3D?",
     "Full-screen renderer of any atlas reconstruction with rotation and video capture.",
     "Unmodified traced geometry.", [], ["Rotate, zoom, record a full turn as video"], "Displays the traced data as published.", [])

# ---------------------------------------------------------------- CA1 cells
card("/biology/interleaved-resonance/", 4, "Why do single spikes lock to gamma and bursts to theta in CA1-like cells?",
     "Model ladder from Ceballos, Chadly, Lowet & Pena 2025: two-point LIF → GLIF (Teeter 2018) → AdEx → biophysical two-compartment HH. Soma: INaT, INaP, IKdr, IKA, IKM, IHCa, IfKCa, IsKCa with [Ca²⁺] (Golomb 2006 kinetics); dendrite: leak + Iₕ; RK4, Δt = 0.02 ms.",
     "Persistent Na⁺ (Nav) and M current (Kv7) at the soma set burst propensity; dendritic HCN (Iₕ) adds resonance; theta (EC) and gamma (CA3) drive arrive as sinusoidal currents.",
     [["Iapp", "1", "µA/cm²", ""], ["θ amplitude / frequency", "1 / 10", "µA/cm² / Hz", "EC-like drive"], ["γ amplitude / frequency", "2 / 40", "µA/cm² / Hz", "CA3-like drive"],
      ["Noise D", "0", "mV²/ms", ""], ["gNaP", "0.9", "mS/cm²", "Table 1"], ["θp (NaP half-activation)", "−35", "mV", "Table 1"],
      ["gKdr", "5.8", "mS/cm²", ""], ["gac", "0.2", "mS/cm²", "soma–dendrite coupling"], ["Parameter reading", "hybrid", "", "see open questions"], ["Iₕ τ", "lab code formula", "", ""]],
     ["Switch rung (LIF, GLIF, AdEx, HH)", "Parameter reading: Table 1 / lab code / hybrid", "Dendrite on/off, input site", "Any conductance, θ/γ drive, noise"],
     "Reproduced: interleaving, f_SS > f_BS, burst onset near gNaP ≈ 0.35. Not reproduced: Δf sign reversals with gNaP/gKdr, ΔA < 0.",
     ["ceballos2025", "golomb2006", "teeter2018", "brette2005", "lowet2023", "fourcaud2003"], ["github.com/rodrigo-pena-lab/interleaved_resonance", "ir_ladder (this repo)"])
card("/biology/dendritic-resonance/", 2, "Does theta resonance rise with distance along real CA1 dendrites?",
     "Published, data-tuned h-channel gradient (Narayanan & Johnston 2007) run in NEURON on five reconstructed CA1 cells; impedance measured with a chirp.",
     "HCN channel density increases with distance from the soma, raising the local resonance frequency in the apical trunk.",
     [["h-channel model", "Narayanan & Johnston 2007", "", "authors' tuned gradient"], ["Cells", "5 reconstructed CA1 pyramidal cells", "", ""]],
     ["Choose the cell"],
     "Pipeline re-runs the published model and checks it against the authors' own output before applying it to new cells.",
     ["narayanan2007", "hu2009", "magee1998", "hu2002"])
card("/biology/active-dendrites/", 2, "How far does a back-propagating spike reach, and is it shape or channels?",
     "Same active channel model run in NEURON on five real CA1 cells; bAP amplitude vs distance; distal bAP vs A-type density switch.",
     "Dendritic Na⁺ supports back-propagation; A-type K⁺ (Kv4) density rising with distance limits it; morphology changes the load.",
     [["Channels", "Migliore et al. 2005", "", "same on every cell"], ["Validation bins", "0–400", "µm", "vs original hoc"]],
     ["Choose the cell"],
     "Re-runs the original model's Fig. 2A; bAP amplitudes compared with the original hoc in 100 µm bins.",
     ["stuart1994", "hoffman1997", "magee1997", "golding2002", "larkum1999"], ["ModelDB 55035"])
card("/biology/ca1-bursting/", 3, "Which currents switch a CA1 cell between single spikes and bursts?",
     "One-compartment Golomb, Yue & Yaari 2006 model (ModelDB 66268): INaT, INaP, IKdr, IKA, IM, IAHP, IC, ICa with [Ca²⁺]; fast–slow phase plane and gNaP × gM pattern map.",
     "Persistent Na⁺ promotes bursting; the slow M-type K⁺ current (Kv7/KCNQ) is the main switch between tonic and burst firing.",
     [["Iapp", "0.66", "µA/cm²", ""], ["gNaP", "0.3", "mS/cm²", ""], ["gM", "1", "mS/cm²", ""], ["θp", "−47", "mV", ""], ["τz (M)", "75", "ms", ""],
      ["gA", "1.4", "mS/cm²", ""], ["gKdr", "6", "mS/cm²", ""], ["gAHP", "5", "mS/cm²", ""], ["gC", "10", "mS/cm²", ""], ["gCa", "0.08", "mS/cm²", ""]],
     ["Every conductance and Iapp", "Pattern map over gNaP × gM"],
     "Published one-compartment model; soma equations reproduce Golomb 2006 Fig 6Da spike times (67 spikes) in ir_ladder.",
     ["golomb2006"], ["ModelDB 66268"])
card("/biology/axo-axonic/", 3, "Does a chandelier synapse on the AIS veto or trigger the spike?",
     "Real CA1 pyramidal cell in NEURON with GABA_A synapses on the axon initial segment; sweeps of strength, timing and chloride gradient.",
     "Chandelier (axo-axonic) cells target the AIS; whether GABA_A hyperpolarizes or depolarizes depends on E_GABA (chloride gradient).",
     [["GABA_A peak conductance", "3", "nS", ""], ["E_GABA", "−75 (hyperpolarizing) / −55 (depolarizing)", "mV", "two conditions"]],
     ["Synaptic strength", "Timing relative to the spike", "E_GABA"],
     "NEURON simulation on a reconstructed cell; one row of the map reproducible from the tool's code.",
     ["somogyi1977", "kole2012"])
card("/biology/research-resonance/", 2, "Which rung of the model ladder resonates, and at what frequency?",
     "Weak sinusoidal current 1–20 Hz, steady-state amplitude and phase → Z(f), f_R and resonance strength, for every ladder rung.",
     "Measured the way it is done in slices (Hu et al. 2002); resonance from Iₕ near rest and IM near threshold.",
     [["Amplitude", "0.05", "µA/cm²", "subthreshold"], ["Sweep", "1–20, step 1", "Hz", ""], ["Normalization", "Z at lowest f", "", ""]],
     ["Model rung and its parameters", "Sweep range", "Save / load configurations, export results"],
     "Full linear impedance matches small-signal simulation (ir_ladder validate).",
     ["ceballos2025", "hu2002", "richardson2003"])
card("/biology/research-spiking/", 2, "Do bursts follow theta and single spikes follow gamma, in each model?",
     "f–I curves, spike/burst classification, ISI statistics and phase locking to θ and γ for every ladder rung.",
     "Same burst definition and locking test Lowet et al. 2023 applied to voltage-imaged CA1 neurons.",
     [["Burst ISI", "14 (Ceballos 2025) or 10 (Lowet 2023)", "ms", ""], ["Iapp", "1", "µA/cm²", "added to model bias"], ["θ", "1 at 8", "µA/cm² at Hz", ""],
      ["γ", "2 at 40", "µA/cm² at Hz", ""], ["Noise D", "0.1", "mV²/ms", ""], ["Duration", "10", "s", ""]],
     ["Burst criterion", "Drive amplitudes and frequencies", "Run without rhythmic input"],
     "Analysis matches the published definitions.", ["lowet2023", "ceballos2025", "golomb2006"])
card("/biology/research-reduction/", 4, "Which currents create resonance, and what 2-D model captures them?",
     "Linearization at a subthreshold operating point (Jacobian → impedance), derivative conductances, reduction from 11 variables to 2 (AdEx-like).",
     "Separates resonant currents (Iₕ, IM) from amplifying ones (INaP) at the chosen voltage.",
     [["Operating point", "subthreshold, Iapp hold", "", ""], ["Reading", "hybrid", "", ""]],
     ["Operating point and conductances", "Which slow variable to keep (h, M, both)"],
     "Reduced impedance compared against the full linearization.", ["richardson2003", "brette2005"])
card("/biology/research-reproduction/", 4, "What reproduces from Ceballos et al. 2025, and what depends on ambiguous values?",
     "Python reproduction (ir_ladder) compared figure by figure, with Table 1 vs lab-code vs hybrid readings.",
     "Documents each ambiguity: θp, Iₕ reversal (−32.9 mV in HHca2), gₕ and dendritic DC, input site.",
     [["gNaP / gKdr", "0.9 / 5.8", "mS/cm²", "figures use 0.93 / 5.86"], ["gₕ", "8.46", "mS/cm²", ""], ["Iₕ reversal", "−32.9", "mV", "HHca2"]],
     ["Parameter reading", "Input site", "Dendritic DC"],
     "Reproduced: interleaving, f_SS > f_BS, burst onset. Open: Δf sign reversals, ΔA < 0.",
     ["ceballos2025", "golomb2006", "lowet2023"], ["github.com/HanLabBU/Lowet-Cell-Reports-2023"])
card("/biology/research-morphology/", 4, "Do the two output modes survive on a real CA1 morphology?",
     "Golomb IM and INaP at soma and axon plus Migliore 2005 dendritic Na⁺, K⁺, A-type and Iₕ gradients, on reconstructed CA1 cells; θ and γ input spread through the tree.",
     "Two theta resonances: M current near threshold, h current near rest.",
     [["Cell", "mpg141209_A (Migliore 2018)", "", ""], ["DC at soma", "0.3", "nA", ""], ["θ", "0.2 at 8", "nA at Hz", ""], ["γ", "0.15 at 40", "nA at Hz", ""],
      ["IM (soma + axon)", "1", "mS/cm²", "Golomb kinetics"], ["INaP (soma + axon)", "0.2", "mS/cm²", ""]],
     ["Cell, drive, IM and INaP densities"],
     "Channel layout follows the cited models; voltage across the whole tree displayed.", ["magee1998", "hu2009", "hu2002", "hines1997"])
card("/biology/research-circuit/", 4, "Does 'bursts follow theta, single spikes follow gamma' survive in a circuit?",
     "PYR / PV / OLM network (200 / 40 / 20 cells, 6 s), EC theta and CA3 gamma inputs; ablations.",
     "EC → distal tuft (theta), CA3 → Schaffer (gamma); PV basket cells perisomatic, OLM distal dendritic inhibition.",
     [["EC → PYR", "0.024", "", ""], ["CA3 → PYR", "0.008", "", ""], ["θ / γ modulation depth", "0.8 / 0.8", "", ""],
      ["PV → PYR", "0.012", "", ""], ["OLM → PYR", "0.006", "", ""]],
     ["Pathway strengths, modulation depths", "Remove IM from pyramidal cells"],
     "Toy circuit; behavior compared with the single-cell result.",
     ["lowet2023", "colgin2009", "klausberger2008", "buzsaki2002", "amaral1989", "verret2012"], ["ModelDB 187604", "ModelDB 66268"])
card("/biology/research-place-fields/", 4, "Does a single plateau create a place field, and which code do its spikes use?",
     "Treadmill laps, CA3 inputs with preferred positions, EC theta; behavioural-timescale synaptic plasticity (BTSP) triggered by a dendritic plateau.",
     "BTSP strengthens inputs active in the seconds around a plateau (Bittner et al. 2017); spikes then split into burst and single-spike codes.",
     [["Cell model", "Lowet et al. 2023 minimal bursting", "", ""], ["Running speed", "25", "cm/s", ""], ["Plasticity per plateau", "0.9", "fraction", ""],
      ["Plateau", "3.5 for 300", "µA/cm² for ms", ""], ["Theta", "8", "Hz", "EC drive on"]],
     ["Cell model, speed, plasticity, plateau, theta"],
     "Rule follows the published BTSP description.", ["bittner2017", "okeefe1993", "lowet2023", "ceballos2025"])

# ---------------------------------------------------------------- Circuits & whole brain
card("/biology/network/", 1, "How does a burst of entorhinal input travel through DG → CA3 → CA1?",
     "Izhikevich neurons on a transverse slice; exponential synapses (excitatory τ 3 ms, inhibitory τ 7 ms) with pathway delays.",
     "Trisynaptic loop plus direct EC → CA1, with PV basket, axo-axonic and O-LM interneurons.",
     [["Input strength", "1×", "", ""], ["Mossy-fibre strength", "1×", "", ""], ["Inhibition", "1×", "", ""], ["AD-like change", "0", "%", ""]],
     ["Input, mossy fibre and inhibition strength", "Switch interneuron classes", "AD-like change"],
     "Simplified network; every parameter listed in the tool.", ["amaral1989", "klausberger2008", "colgin2009"])
card("/biology/real-circuit/", 3, "How many inputs does it take to fire the next real cell?",
     "Reconstructed granule, CA3, CA1 and basket cells connected by their pathways; somatic EPSPs from per-section NEURON kernels.",
     "Each synapse's somatic effect depends on its dendritic location (NEURON transfer kernels).",
     [["Presynaptic cells firing", "60", "", ""], ["Granule cells firing", "4", "", ""], ["Dendritic λ", "350", "µm", "shortcut mode"], ["Feedforward PV inhibition", "on", "", ""]],
     ["Number of active inputs", "Feedforward inhibition", "NEURON kernels vs e^(−d/λ) shortcut"],
     "Kernels computed in NEURON on the same cells.", ["amaral1989", "klausberger2008", "pouille2001"])
card("/biology/whole-brain/", 1, "Where does each hippocampal neuron's axon actually go?",
     "Janelia MouseLight whole-brain single-neuron reconstructions in the Allen CCFv3; region membership by annotation lookup.",
     "Full axonal projections of CA1, DG, subiculum, entorhinal, thalamic and M1 neurons.",
     [["Neurons", "6 MouseLight cells", "", ""], ["Atlas", "Allen CCFv3 (2017)", "", ""]],
     ["Toggle neurons and brain regions"], "Quantitative region check of each axon's points.", ["winnubst2019", "wang2020"])

# ---------------------------------------------------------------- Other systems
card("/biology/giant-fiber/", 3, "How does the fly escape circuit work, and can axo-axonic input push the GF over threshold?",
     "Drosophila giant fiber circuit with mixed electrical (ShakB) and chemical synapses; MANC v1.2.1 connectome inputs (1,549 synapses from 192 partners onto GF body 10000) from your neuPrint pipeline.",
     "Gap junctions (ShakB) and cholinergic release onto TTMn and PSI; axo-axonic inputs on the GF axon.",
     [["Genotype", "control", "", "vs shakB²"], ["Stimulation", "100", "Hz", ""], ["GF → TTMn gap", "60", "nS", ""], ["GF → PSI gap", "40", "nS", ""], ["Synapses per Axc onto GF", "35", "", ""]],
     ["Genotype (shakB², TNT)", "Gap junction and chemical release toggles", "Active axo-axonic inputs"],
     "Synapse model parameters fitted as described in the tool.", ["allen2006", "vonreyn2014"], ["neuPrint MANC v1.2.1"])
card("/biology/reflex/", 1, "What happens, millisecond by millisecond, from tendon tap to kick?",
     "Stretch receptor → myelinated Ia afferent → motor neuron → NMJ → muscle fibre → Ca²⁺ release → cross-bridges, each stage computed.",
     "Conduction velocities, synaptic delay, ACh release and EC coupling at physiological values.",
     [["Ia velocity", "80", "m/s", ""], ["α-motor velocity", "70", "m/s", ""], ["Aδ velocity", "15", "m/s", ""], ["Path length", "0.55", "m", "each way"],
      ["[Ca²⁺]o / [Mg²⁺]o", "2 / 1", "mM", ""], ["Tap strength", "0.6", "", ""]],
     ["Demyelination", "Ca²⁺ / Mg²⁺", "Curare, neostigmine", "Stimulus type"], "Every stage's equation and numbers listed in the tool.", ["huxley1949"])
card("/biology/action-potential/", 1, "What do single channels and ions do during one spike, and along different axons?",
     "Hodgkin–Huxley membrane with stochastic channels on 1 µm²; propagation along squid, myelinated human motor and thin pain fibres.",
     "Real concentrations, channel densities and temperatures per axon type.",
     [["Axon", "squid giant axon, 476 µm, 6.5–18.5 °C", "", ""], ["[K⁺] o / i", "20 / 400", "mM", "squid"], ["[Na⁺] o / i", "440 / 50", "mM", "squid"],
      ["Pulse", "20 for 0.5", "µA/cm² for ms", ""]],
     ["Concentrations, temperature", "TTX, TEA block", "Axon type, diameter, myelination"], "Hodgkin–Huxley 1952 equations.", ["hodgkin1952", "bean2007", "kole2012"])
card("/biology/mechanisms/", 1, "How do the sarcomere, EC coupling and the NMJ work, step by step?",
     "Model-driven figures: cross-bridge cycle, EC coupling, twitch/tetanus, NMJ (~70 quanta per impulse), repetitive nerve stimulation.",
     "Mammalian NMJ at 37 °C; RyR1, SERCA and ATP dependence of contraction.",
     [["NMJ quantal content", "≈70", "quanta", "per impulse"]],
     ["Dantrolene, malignant hyperthermia, thapsigargin", "No ATP", "Sarcomere length"], "Textbook-scale models; values cited in the tool.", ["heuser1979", "sudhof2013"])

UNITS = {
    "point": "V mV · t ms · I µA/cm² · g mS/cm² (all per membrane area)",
    "morph": "V mV · t ms · I nA (total) · channel densities mS/cm² · distance µm",
    "net":   "V mV (Izhikevich scale) · t ms · weights relative to baseline",
    "real":  "V mV · t ms · synaptic currents pA · kernels from NEURON",
    "gf":    "V mV · t ms · gap/chemical conductances nS · currents nA",
    "nm":    "V mV · t ms · I µA/cm² · concentrations mM · velocity m/s",
    "data":  "coordinates µm (CCFv3 or soma-centred)",
}
for r, u in {"/biology/cell-atlas/": "data", "/biology/whole-brain/": "data", "/biology/neuron-viewer/": "data",
             "/workbench/morphology/": "morph", "/biology/neuron-lab/": "morph", "/biology/circuit-builder/": "morph",
             "/biology/dendritic-resonance/": "morph", "/biology/active-dendrites/": "morph", "/biology/axo-axonic/": "morph",
             "/biology/research-morphology/": "morph", "/biology/interleaved-resonance/": "point", "/biology/research-resonance/": "point",
             "/biology/research-spiking/": "point", "/biology/research-reduction/": "point", "/biology/research-reproduction/": "point",
             "/biology/ca1-bursting/": "point", "/biology/research-place-fields/": "point", "/biology/research-circuit/": "point",
             "/biology/network/": "net", "/biology/real-circuit/": "real", "/biology/giant-fiber/": "gf",
             "/biology/reflex/": "nm", "/biology/action-potential/": "nm", "/biology/mechanisms/": "nm"}.items():
    C[r]["units"] = UNITS[u]
C["/biology/interleaved-resonance/"]["refs"] += ["richardson2003"]
C["/biology/interleaved-resonance/"]["manipulate"] += ["Sections on this page: Simulate · Resonance · Reduction (11 → 2 variables) · Reproduction status · Open questions"]

# ---------------------------------------------------------------- perturbation presets
# op: [selector, value]  selector "#id" or "~regex" (matched against the control's label; optional "range:" prefix
# restricts to sliders). value: number → set, true/false → checkbox. Magnitudes marked "illustrative" are not
# taken from a paper; the reference supports the direction of the change, not its size.
def preset(name, kind, what, ops, refs=(), size="complete block in the model"):
    return dict(name=name, kind=kind, what=what, ops=ops, refs=list(refs), size=size)
P = {
 "/biology/ca1-bursting/": [
   preset("XE991: M-current block", "pharmacology", "Kv7/M channels blocked; Golomb et al. test this by setting g_M = 0.", [["#gy-gZ", 0]], ["golomb2006"]),
   preset("Carbachol: muscarinic M suppression", "pharmacology", "Muscarinic activation closes Kv7 channels; partial suppression.", [["#gy-gZ", 0.3]], ["golomb2006"], "70% reduction, illustrative"),
   preset("Riluzole: reduce I_NaP", "pharmacology", "Riluzole preferentially reduces persistent Na⁺ current.", [["#gy-gNaP", 0.15]], ["golomb2006"], "50% reduction, illustrative"),
   preset("4-AP: A-type block", "pharmacology", "Low-dose 4-aminopyridine blocks A-type (Kv4/Kv1) K⁺ current.", [["#gy-gA", 0]], ["hoffman1997"]),
   preset("Apamin: slow AHP block", "pharmacology", "SK / slow-AHP K⁺ current removed.", [["#gy-gKAHP", 0]]),
   preset("Iberiotoxin: BK block", "pharmacology", "Fast Ca²⁺-activated K⁺ (BK) current removed.", [["#gy-gKCa", 0]]),
   preset("Cd²⁺: Ca²⁺ channel block", "pharmacology", "High-voltage Ca²⁺ current removed (and with it Ca²⁺-activated K⁺ drive).", [["#gy-gCa", 0]])],
 "/biology/interleaved-resonance/": [
   preset("ZD7288: I_h block", "pharmacology", "HCN channels blocked: dendritic g_h = 0.", [["#irp-gh", 0]], ["magee1998"]),
   preset("XE991: M-current block", "pharmacology", "Kv7/M channels blocked: g_KM = 0.", [["#irp-gM", 0]], ["golomb2006"]),
   preset("Riluzole: reduce I_NaP", "pharmacology", "Persistent Na⁺ reduced.", [["#irp-gNaP", 0.45]], ["golomb2006"], "50% reduction, illustrative"),
   preset("4-AP: A-type block", "pharmacology", "A-type K⁺ removed.", [["#irp-gKA", 0]], ["hoffman1997"]),
   preset("Apamin: slow AHP block", "pharmacology", "Slow Ca²⁺-activated K⁺ removed.", [["#irp-gsKCa", 0]]),
   preset("Iberiotoxin: BK block", "pharmacology", "Fast Ca²⁺-activated K⁺ removed.", [["#irp-gfKCa", 0]]),
   preset("Cd²⁺: Ca²⁺ channel block", "pharmacology", "High-threshold Ca²⁺ removed.", [["#irp-gHCa", 0]]),
   preset("Soma only (no dendrite)", "model", "Removes the dendritic compartment and its I_h.", [["#irDend", False]], ["ceballos2025"], "structural change")],
 "/biology/research-morphology/": [
   preset("ZD7288: I_h block", "pharmacology", "HCN density × 0 everywhere on the tree.", [["#rmc-hS", 0]], ["magee1998"]),
   preset("XE991: M-current block", "pharmacology", "Somatic/axonal I_M removed.", [["#rmc-gM", 0]], ["golomb2006"]),
   preset("4-AP: A-type block", "pharmacology", "A-type density × 0.", [["#rmc-kaS", 0]], ["hoffman1997"]),
   preset("Partial TTX", "pharmacology", "Na⁺ density reduced to the slider minimum (× 0.3).", [["#rmc-naS", 0.3]], [], "70% reduction"),
   preset("Flat I_h (no gradient)", "model", "Removes the Magee 1998 increase of I_h with distance.", [["#rmGrad", False]], ["magee1998"], "structural change")],
 "/biology/neuron-lab/": [
   preset("TTX: Na⁺ block", "pharmacology", "Na⁺ channels × 0 on the whole cell.", [["range:~^Na⁺ \\(na3", 0]]),
   preset("TEA: delayed-rectifier block", "pharmacology", "Kdr × 0.", [["range:~^K⁺ delayed rectifier", 0]]),
   preset("4-AP: A-type block", "pharmacology", "A-type K⁺ × 0.", [["range:~^A-type K⁺ \\(kap", 0]], ["hoffman1997"]),
   preset("ZD7288: I_h block", "pharmacology", "HCN × 0.", [["range:~^Ih \\(hd\\)", 0]], ["magee1998"]),
   preset("Uniform channels (no gradients)", "model", "A-type and I_h no longer rise with distance.", [["~^A-type rises with distance", False], ["~^Ih rises with distance", False]], ["hoffman1997", "magee1998"], "structural change")],
 "/biology/research-circuit/": [
   preset("AD · PV interneuron dysfunction", "disease", "Reduced Nav1.1 in PV cells weakens perisomatic inhibition (Verret et al. 2012).", [["#ns-gpe", 0.006]], ["verret2012"], "PV → PYR halved, illustrative"),
   preset("AD · PV loss + no M current", "disease", "PV dysfunction combined with M-current loss in pyramidal cells.", [["#ns-gpe", 0.006], ["#nsNoM", True]], ["verret2012"], "illustrative"),
   preset("XE991 in pyramidal cells", "pharmacology", "Pyramidal cells without I_M.", [["#nsNoM", True]], ["golomb2006"]),
   preset("O-LM silenced", "circuit", "Distal dendritic inhibition removed.", [["#ns-goe", 0]], ["klausberger2008"])],
 "/biology/network/": [
   preset("AD-like network", "disease", "Hyperactive neurons and network hypersynchrony as in APP mouse models (Busche 2008; Palop 2007).", [["#nfAD", 0.5]], ["busche2008", "palop2007"], "50% on the tool's AD scale"),
   preset("AD · PV basket cells silenced", "disease", "Extreme case of PV dysfunction (Verret et al. 2012).", [["#nfPV", False]], ["verret2012"], "complete silencing, illustrative"),
   preset("GABA_A block (bicuculline-like)", "pharmacology", "Inhibition reduced to 30%.", [["#nfInh", 0.3]], [], "70% reduction")],
 "/biology/action-potential/": [
   preset("TTX 50%", "pharmacology", "Half the Na⁺ channels blocked, patch and axon.", [["#apTTX", 50], ["#apATTX", 50]], ["hodgkin1952"], "50%"),
   preset("TEA 50%", "pharmacology", "Half the K⁺ channels blocked.", [["#apTEA", 50]], ["hodgkin1952"], "50%"),
   preset("Raised external K⁺", "physiology", "[K⁺]o raised: depolarises rest and inactivates Na⁺ channels.", [["#apKo", 60]], ["hodgkin1952"], "3× squid value, illustrative")],
 "/biology/reflex/": [
   preset("Curare", "pharmacology", "nAChR block at the neuromuscular junction.", [["#rxCur", 3]], [], "3 × K_d"),
   preset("Neostigmine", "pharmacology", "Acetylcholinesterase blocked.", [["#rxNeo", True]]),
   preset("Botulinum toxin", "pharmacology", "No ACh release.", [["#rxBot", True]], ["sudhof2013"]),
   preset("Myasthenia gravis", "disease", "Fewer acetylcholine receptors.", [["#rxMG", True]]),
   preset("Demyelination", "disease", "Slowed conduction, as in MS or neuropathy.", [["#rxDemy", True]]),
   preset("High Mg²⁺", "physiology", "Mg²⁺ competes with Ca²⁺ and lowers release.", [["#rxMg", 6]], [], "6 mM, illustrative"),
   preset("Strychnine", "pharmacology", "Glycine receptors blocked: no spinal inhibition.", [["#rxStr", True]])],
 "/biology/giant-fiber/": [
   preset("shakB² (no gap junctions)", "genetic", "Removes ShakB electrical synapses from the GF.", [["#gfmGap", False], ["#escGap", False]], ["allen2006"]),
   preset("TNT (no chemical release)", "genetic", "Tetanus toxin light chain blocks GF chemical release.", [["#gfmChem", False]], ["allen2006"]),
   preset("GF silenced (Kir2.1-like)", "genetic", "GF cannot fire; only the GF-independent long-mode escape remains.", [["#escGF", False]], ["vonreyn2014"])],
}
for r, ps in P.items():
    C[r]["presets"] = ps

refs_txt = (ROOT / "sources/raw/little_neural_guide/refs-data.js").read_text()
i = refs_txt.index("window.NG_REFS =") + len("window.NG_REFS =")
REFS = json.JSONDecoder().raw_decode(refs_txt[i:].lstrip())[0]
# DOIs added after checking OpenAlex / Crossref (Nov 2026); the Guide listed these two by PubMed link only
REFS["hu2002"]["u"] = "https://doi.org/10.1113/jphysiol.2002.029249"
REFS["wang2020"]["u"] = "https://doi.org/10.1016/j.cell.2020.04.007"
used = sorted({r for c in C.values() for r in c["refs"] + [x for ps in c.get("presets", []) for x in ps["refs"]]})
missing = [r for r in used if r not in REFS]
out = {"levels": LEVELS, "cards": C, "refs": {k: REFS[k] for k in used if k in REFS}}
(ROOT / "site/hs-cards.js").write_text("window.HS_CARDS = " + json.dumps(out, ensure_ascii=False) + ";\n")
print(len(C), "cards ·", len(out["refs"]), "references · missing:", missing)
