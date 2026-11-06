const extraDiagrams=[
['Physical distance','Distance / length constant','Passive attenuation'],['Dendritic input','Axial current','Somatic response'],['Area × densities','Total C and g','Response speed and size'],['Local deflection','Spatial transfer','Somatic deflection'],
['Holding voltage','Channel activation','Available current pathway'],['Sinusoidal input','Complex impedance','Response phase'],['Frequency sweep','Model dynamics','Nonstationary response'],['Current and voltage','Consistent amplitudes','Impedance magnitude'],
['Two state variables','Motion in state space','Spiral or closed orbit'],['Control parameter','Derivative zero crossings','Fixed points and stability'],['Control parameter','Radius dynamics','Rest or stable cycle'],['Continuous equation','Discrete time steps','Numerical error'],
['Reference observations','Chosen loss','Parameter comparison'],['Small parameter change','Prediction change','Local sensitivity'],['Different parameter pairs','Same normalized observation','Ambiguity'],['Plausible parameter range','Scenario simulations','Prediction range']
];

const extraCodeNeedles=['voltage = source_voltage','axial_current =','deflection =','soma =','h_activation =','active_phase =','voltage_slope =','gain =','radius =','slope =','radius_slope =','voltage +=','voltage =','finite_difference =','time_constant =','lower_points.append'];
const extraProjectConnections=[
'Compare the same physical path length across morphologies only after accounting for electrical properties and boundary conditions.',
'Record both the stimulated dendrite and soma. Check that axial current enters one compartment and leaves the other with equal magnitude.',
'When resizing a CA1 morphology, decide whether conductance densities and total injected current or current density remain fixed.',
'Separate the input-site response from transfer to the soma before explaining a changed somatic resonance curve.',
'Compare Ih- and M-related mechanisms at matched holding voltages. Activation curves alone do not specify their effect on impedance.',
'For a CA1 sinusoidal protocol, report phase convention as well as impedance magnitude and recording site.',
'Compare several chirp sweep durations and discard or model initial transients before estimating an impedance curve.',
'Use the same amplitude convention for current and voltage, and state whether current units are pA or nA.',
'A reduced phase portrait can suggest mechanisms, but CA1 voltage and gate states require an explicit mapping to its coordinates.',
'To classify a CA1 transition, continue the original model in a parameter and analyze fixed points rather than matching a trace by eye.',
'If sustained oscillations appear in a reduced CA1 model, test whether the original equations support the same bifurcation mechanism.',
'Reduce the simulation step and compare with a suitably accurate solver before treating a new oscillation as biological.',
'Fit a specified CA1 observable under controlled input, then check a separate protocol before claiming predictive validity.',
'Perturb channel and morphology parameters around the same operating point and compare sensitivities of the same measured feature.',
'Use more than a normalized transient when trying to distinguish capacitance, leak and morphology-related effects.',
'Carry plausible channel or morphology parameter alternatives through to the exact observable your CA1 study will compare.'
];

for(let k=0;k<4;k++){
 const p=expansionPathways[k];
 lessons.push({tab:p[0],title:p[2],intro:p[3],idea:p[4],ca1:p[5],terms:[['Model scope','The live experiment isolates a mechanism. Its numeric settings are illustrative unless explicitly fitted.'],['Observation','Specify what is measured, where, and under which input conditions.']],read:[['Neuronal Dynamics: pathway background',book+p[6],'Gerstner, Kistler, Naud & Paninski (2014), Cambridge University Press.']]});
 examples.push({project:p[5]});
 const group=expansionTopics.slice(k*4,k*4+4);
 subtopics.push(group.map((t,j)=>[t.title,t.goal,extraProjectConnections[k*4+j],t.question,t.answers,t.correct,t.why]));
 for(let j=0;j<4;j++){
  const n=24+k*4+j,t=group[j];
  topicDetails.push({...t,source:t.source||p[6],sourceTitle:t.citation?t.title+': academic source':null,sourceCitation:t.citation,code:'',output:''});
  plotEquationBodies.push(t.equation);plotEquationNotes[n]=labs[n].assumptions;
  levelConnections.push([t.detail.split('. ')[0]+'.',t.legend,extraCodeNeedles[n-24],labs[n].explain]);
 }
}
Object.assign(biologicalParameters,{
length_constant:['How far a steady passive deflection spreads electrically.','The length constant summarizes cable geometry and passive material properties. It is not simply the physical branch length. This lab assumes a uniform semi-infinite cable; finite branches and active membranes need richer equations.'],
source_voltage:['The voltage deflection imposed at the cable’s source.','This is relative to rest and is used as a boundary condition in the spatial profile. It does not specify a synaptic conductance or a naturally generated source waveform.'],
axial_coupling:['The ease of current flow between neighboring compartments.','Axial coupling depends on intracellular resistivity and connecting geometry. Larger coupling moves more current for a given voltage difference. This control is an effective conductance rather than a full reconstructed dendrite.'],
dendritic_input:['Current entering the dendritic compartment.','The model injects total current locally. A conductance-based synapse would additionally depend on its reversal potential and local voltage.'],
area_scale:['A change in total membrane area at fixed membrane densities.','The toy scales total capacitance and leak together. Actual morphology changes can also alter axial geometry, channel distribution and synapse placement, which this area-only example omits.'],
total_current:['Total injected current, held independent of cell area.','Keeping total current fixed differs from keeping current per unit area fixed. State which convention you use before comparing morphologies.'],
dendritic_leak:['Passive escape pathways in the dendritic compartment.','This effective total leak affects the locally generated deflection and its somatic transfer. It does not identify a particular dendritic channel protein.'],
h_midpoint:['The illustrative voltage for half activation of an H-like gate.','HCN-related Ih tends to activate with hyperpolarization. This midpoint shifts an unfitted activation curve, not a measured CA1 channel curve. It is distinct from HH sodium-inactivation h.'],
m_midpoint:['The illustrative voltage for half activation of an M-like gate.','KCNQ-mediated M-current has voltage-dependent activation. This activation-only sigmoid omits kinetics, driving force and channel density, so it does not by itself predict resonance.'],
restorative_strength:['An effective delayed restorative influence on voltage.','A linearized slow current can resist slow voltage changes and shape frequency response. This toy parameter is not a direct fitted HCN or KCNQ density.'],
restorative_tau:['The time scale of delayed voltage restoration.','This effective kinetic parameter influences gain and phase. It is distinct from the passive charging time scale and from a complete channel gating model.'],
chirp_amplitude:['The size of the injected oscillating current.','A small current helps probe near-linear responses around an operating voltage. The lab is linear by construction; real neurons can recruit nonlinear channels or spike when amplitude increases.'],
final_frequency:['The frequency reached at the end of the input sweep.','This is a stimulus-design setting. Increasing the final frequency over the same duration makes the sweep faster and changes how much time the system spends in each frequency range.'],
test_frequency:['The repetition rate of a steady sinusoidal input.','Frequency is measured in cycles per second. Comparing voltage amplitude and timing across frequencies characterizes the small-signal electrical response under controlled conditions.'],
test_amplitude:['The current amplitude of a steady sinusoid.','This sets the stimulus size. In this linear synthetic example the voltage scales proportionally, leaving impedance unchanged; that need not hold for large inputs in a nonlinear neuron.'],
damping:['The decay rate of a deviation in a reduced state-space model.','Damping here describes the local geometry of dynamics. It is not a unique membrane conductance, and the abstract coordinates are not automatically measured voltage and channel state.'],
angular_speed:['How quickly the toy state rotates through phase space.','This model coefficient controls angular motion. Converting it into a biological rhythm requires specifying time units and validating the reduction.'],
initial_radius:['How far the initial state lies from the origin.','Radius summarizes a two-dimensional state. It is an initial condition, not a direct number of open channels or an oscillation amplitude measured in mV.'],
bifurcation_mu:['A mathematical control parameter in a normal form.','A normal form captures a local qualitative transition. Identifying which biological parameter corresponds to μ requires analyzing the original model rather than assigning a molecule by analogy.'],
hopf_mu:['A parameter controlling radial growth in the Hopf normal form.','Its sign changes whether small oscillation amplitudes decay or grow in this toy. It is not automatically an applied current or channel conductance in your CA1 equations.'],
integration_step:['The numerical interval between Euler updates.','This is a solver choice. Changing it should improve approximation to the same equations, not be interpreted as changing biological kinetics.'],
decay_time:['The true relaxation time in the underlying passive equation.','This belongs to the continuous model. It stays positive and stable even when the numerical approximation becomes unstable from coarse stepping.'],
fit_amplitude:['The model’s steady response size for this synthetic protocol.','This output parameter can summarize passive resistance times a known current. Fitting it here does not identify a specific channel or validate a full biophysical neuron.'],
fit_tau:['The response time being fitted to the synthetic transient.','A passive charging time constant combines capacitance and conductance. A good estimate of the ratio does not automatically identify both separately.'],
reference_leak:['The operating leak value used to calculate local sensitivity.','Sensitivity is evaluated around this value. A different input, voltage, time or model can change how informative the same parameter is.'],
relative_perturbation:['The fractional numerical change used for a finite difference.','This is a derivative-estimation choice, not a confidence interval or measured biological variability. Compare it with an analytic derivative when available.'],
parameter_scale:['A joint change in capacitance and conductance.','The same scaling leaves their ratio unchanged. Whether observations distinguish these pairs depends on what the experiment retains, such as absolute response amplitude.'],
mean_tau:['The central parameter scenario for a passive response.','This is selected for exploration rather than inferred from recordings. It should not be read as a posterior mean or a measured population average.'],
tau_span:['A chosen range of time-constant scenarios.','The span creates deterministic alternatives. It is not a confidence interval, credible interval or biological distribution unless a separate analysis establishes that interpretation.']
});

topicDetails[33].source='https://www.scholarpedia.org/article/Saddle-node_bifurcation';topicDetails[33].sourceTitle='Saddle-node bifurcation';topicDetails[33].sourceCitation='Kuznetsov (2006), Scholarpedia 1(10):1859.';
topicDetails[34].source='https://www.scholarpedia.org/article/Andronov-Hopf_bifurcation';topicDetails[34].sourceTitle='Andronov–Hopf bifurcation';topicDetails[34].sourceCitation='Kuznetsov (2006), Scholarpedia 1(10):1858.';
