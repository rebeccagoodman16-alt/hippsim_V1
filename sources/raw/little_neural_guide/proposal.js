/* Original fictional training material. These are not real applicants, data or grant reviews. */
const proposalPages=[
['Project summary','Channel placement, dendritic geometry and CA1 frequency preference',[
'We propose that the placement of HCN-related conductance along CA1 dendrites is sufficient to determine theta-frequency preference. The project combines compartmental modeling, synthetic perturbation experiments and a small recurrent circuit to test this idea.',
'Our preliminary model reproduces a peak near 6 Hz in a somatic impedance curve. We therefore expect the proposed mechanism to explain the resonance seen in CA1 pyramidal cells across morphologies and operating conditions.',
'Three aims will connect channel placement to single-cell responses, population rhythms and frequency decoding. The central deliverable is an interpretable computational account that can motivate subsequent biological experiments.'
],'Matching a peak near 6 Hz establishes agreement for one feature, not sufficiency of the mechanism across conditions. What alternative parameter sets reproduce that feature?','Claim scope'],
['Specific aims','From a cell property to a circuit prediction',[
'Aim 1 will redistribute a fixed total HCN-like conductance among somatic, proximal and distal compartments. Aim 2 will combine these variants with reconstructed morphology alternatives. Aim 3 will ask whether a readout separates input frequencies from the resulting network responses.',
'We hypothesize that distal placement increases frequency preference and improves decoding. The three aims will be conducted in sequence, using the most resonant parameter set from each stage as the starting point for the next.',
'The project will be considered successful if at least one cell variant and one circuit show a stronger peak than the starting model.'
],'The success criterion permits selecting any improved variant. Specify the primary comparisons and whether later aims require the earlier direction to hold.','Aims and dependencies'],
['Significance','Why the measurement matters',[
'CA1 neurons receive spatially distributed inputs while their membrane currents filter signals over time. Understanding how geometry and currents interact could clarify which cellular properties a circuit model needs to retain.',
'The proposal will connect measured response features with a reduced population model. A clear link would help determine when an average-cell description is adequate and when cellular diversity must be retained.',
'We expect this work to improve interpretation of neuronal simulations. We do not yet specify a behavioral prediction that would distinguish the proposed mechanism from another model with similar impedance curves.'
],'The cellular-modeling significance is plausible. Ask for a specific downstream decision or prediction without requiring an unsupported behavioral claim.','Importance'],
['Alternative explanations','What else could produce the same curve?',[
'The reference model includes passive leak, sodium, potassium, HCN-like and M-like currents. Our first analysis changes HCN-like placement while holding all other parameters fixed.',
'Other changes, including passive resistance, channel kinetics and dendritic load, may also affect the somatic impedance curve. We will compare the proposed placement manipulation with the unmodified model.',
'A systematic alternative-model search is outside the initial scope because many mechanisms would increase computational cost. The main mechanistic inference will be based on whether the chosen placement manipulation shifts the response.'
],'A controlled manipulation tests that parameter’s effect within the model. It does not establish uniqueness. Request a bounded set of plausible alternatives and an observable that distinguishes them.','Alternatives'],
['Biological background','HCN-related and M-related contributions',[
'Published CA1 work motivates a voltage-dependent view of resonance. HCN-related activation is associated with hyperpolarized conditions, while M-related mechanisms can contribute under more depolarized conditions.',
'Our illustrative model will use activation targets and time constants from a documented parameter set. The model description will report the equations, reversal potentials, density conventions and initial-state procedure.',
'For brevity, the first figure will show only a single holding voltage. We will refer to that curve as representative of the model’s resonance property.'
],'The mechanistic background supports testing operating voltage, not calling one curve representative without a stated domain. Ask for the planned voltage range.','Operating conditions'],
['Pilot results','Synthetic preliminary examples',[
'In six simulation runs with different input-noise seeds, the same reconstructed cell and parameter set produced peak frequencies between 5.6 and 6.4 Hz. All runs used the same temperature setting and initial voltage.',
'These results demonstrate reproducibility under input variability for that model. We plan to describe the six runs as six independent samples when estimating variation across CA1 neurons.',
'No biological recordings or independently reconstructed cells were used to generate these pilot values. The plotted numbers are synthetic training data for this fictional proposal.'
],'Seeds probe variability conditional on one cell model. They are not six independent neurons. Ask how biological or morphology-level replication will be represented.','Experimental unit'],
['Holding voltage and temperature','Define the operating point',[
'Each simulation begins from a resting state found by running the model without a stimulus. The initial voltage is then shifted to the desired level with a constant applied current.',
'We will use one temperature setting and allow gates to settle before stimulation. The intended holding level and the actual mean voltage during the analysis window will both be recorded.',
'The settling interval will initially be 100 ms. If changing a slow time constant moves the response, the same settling interval will be retained for consistency.'
],'A fixed interval is not necessarily equivalent equilibration across kinetics. Request a convergence criterion or a demonstrated sufficient settling time.','Initial conditions'],
['Morphology selection','Which geometries are being compared?',[
'We will use three reconstructed morphologies with different dendritic extent. Reconstruction provenance, missing branches and any diameter corrections will be documented.',
'The same total conductance will be assigned to each morphology. Because their membrane areas differ, this convention changes conductance density. A separate matched-density comparison is not currently planned.',
'We will interpret any difference in impedance between the three cells as an effect of morphology. Reconstruction uncertainty will be discussed but not varied.'
],'The total-versus-density convention is a mechanistic confound if the claim is geometry alone. Suggest matched-density and matched-total comparisons with explicit scope.','Geometry and density'],
['Channel equations','A reproducible current model',[
'For every current, the model package will specify maximum conductance, reversal potential, voltage-dependent target functions and kinetic time constants. Gates will use consistent units and named initial states.',
'HCN-like density will be varied along a normalized path-distance coordinate. The placement function will be reported as code and as an equation; its integral over compartment area will be checked against the stated total.',
'The text uses h for one sodium-inactivation gate and Ih for the HCN-related current. These will be distinguished in figure labels and variable names.'
],'This is a strength: equations, units, state definitions and an area-weighted total enable reproduction. Check that the code and reported integral actually agree.','Reproducibility strength'],
['Spatial discretization','How many compartments are enough?',[
'The reconstructed dendrites will be divided into electrically coupled compartments. Local membrane current and axial current will be computed using documented geometry and intracellular resistivity.',
'The first simulations will use a fixed segment count in every branch. We will double the segment count for one baseline condition to assess numerical convergence.',
'If that baseline curve is unchanged, all channel-placement and high-frequency conditions will be assumed spatially converged as well.'
],'Convergence in one condition may not cover the most demanding cases. Ask for checks at extreme placement and frequency settings and a quantitative tolerance.','Spatial convergence'],
['Time integration','Continuous equations and discrete updates',[
'The default solver will use a fixed time step. A smaller step will be tested in the reference condition and on the parameter set with the largest voltage fluctuations.',
'We will compare voltage, gate traces and impedance estimates rather than only spike count. Discontinuities such as stimulus onset will be aligned with the integration procedure.',
'A new oscillation appearing only at the coarser step will be reported as an interesting model regime unless the smaller-step run also becomes oscillatory.'
],'A coarse-step-only oscillation is evidence of a numerical issue, not a biological regime. Request convergence before mechanistic interpretation.','Numerical artifacts'],
['Stimulus protocol','A chirp is a changing input',[
'An injected current chirp will sweep from 0.5 to 30 Hz over four seconds. The amplitude will be selected to keep the response subthreshold in the starting model.',
'The same current amplitude will then be applied to every variant. Actual voltage excursion, spike occurrence and departures from small-signal scaling will be recorded.',
'For the main frequency-response estimate, the voltage envelope at each moment will be divided by the instantaneous current amplitude and labeled steady-state impedance.'
],'A fast chirp envelope includes transients and sweep-rate effects. Suggest comparison with slower sweeps and steady sinusoids before using a steady-state interpretation.','Measurement validity'],
['Impedance estimator','Magnitude, phase and conventions',[
'The analysis will report the voltage/current amplitude ratio with both amplitudes measured using the same convention. Current and voltage units will be stated so that pA, nA and MΩ are not mixed.',
'Phase will be defined as voltage timing relative to current under an explicit sinusoidal convention. Transient segments and any spiking intervals will be excluded according to predeclared rules.',
'Raw traces and analysis code will accompany the summary curves, including the window lengths and frequency resolution used by the estimator.'
],'This is a strength: consistent amplitudes, explicit phase convention and trace-level access make the result easier to audit. Ask whether exclusion rules are fixed before comparisons.','Analysis strength'],
['Perturbation logic','What would support a channel mechanism?',[
'We will reduce the HCN-like current in the computational model, then restore it. The intervention will be repeated at several holding voltages and channel-placement patterns.',
'A later biological study could use a channel-modulating intervention. We will describe any disappearance of a peak under that intervention as direct proof that the same modeled placement mechanism operates in real CA1 cells.',
'Potential changes in baseline voltage, passive properties and other currents under an experimental intervention will be mentioned as secondary considerations.'
],'Within-model removal and rescue test model dependence. A biological intervention needs controls for operating state and specificity before establishing placement or uniqueness.','Causal inference'],
['Sampling design','Cells, morphologies and repeated trials',[
'Three morphology variants will each receive ten input-noise realizations under every intervention. The same seed set will be reused across interventions for paired comparisons.',
'We will display per-morphology effects as well as pooled summaries. However, the proposed statistical test treats all thirty realizations as independent cell-level observations.',
'Additional morphology variants may be included if the initial comparison does not reach the desired significance threshold.'
],'The hierarchy and optional expansion need a clearer plan. Ask which unit supports the inference, how paired seeds are used, and how sample expansion is decided independently of significance.','Sampling and optional stopping'],
['Precision planning','What uncertainty can the design resolve?',[
'Before the main runs, synthetic data will be used to estimate the precision of the primary contrast under several plausible between-morphology effect sizes. A smallest relevant change in peak frequency will be specified.',
'The planning analysis will retain the morphology/trial hierarchy and will show how interval width changes with the number of distinct morphologies rather than only the number of seeds.',
'If the anticipated precision is inadequate, the plan will prioritize a narrower claim or more morphology-level replication instead of promising a significant result.'
],'This is a strength: precision and a relevant effect size guide design. Ask how the plausible variability assumptions were chosen and what evidence could revise them.','Design strength'],
['Primary outcome','What exactly is being tested?',[
'The project will compute peak frequency, peak magnitude, low-frequency gain, bandwidth and phase. The first analysis will use all five features to understand changes in curve shape.',
'After plotting the results, the feature showing the strongest intervention difference will be designated the primary outcome in the final report. The other measures will be described as supporting analyses.',
'The direction and operating voltage of the primary comparison will also be selected after inspecting all variant curves.'
],'Exploration is useful, but a post-selected outcome should not be presented as pre-specified. Request a defined confirmatory contrast or transparent exploratory labeling and independent confirmation.','Outcome selection'],
['Statistical analysis','Multiplicity and effect interpretation',[
'For each planned contrast, the report will show an effect estimate and uncertainty interval alongside the distribution across morphologies. Analysis assumptions and repeated-measure structure will be documented.',
'The exploratory screen includes many channel settings and operating voltages. The text will highlight every unadjusted p-value below 0.05 without discussing how many comparisons were screened.',
'A statistically detectable shift will be described as biologically important even if its magnitude is below the precision or frequency range relevant to the stated question.'
],'Ask for a multiplicity strategy or exploratory framing, plus a biological relevance criterion. Statistical detectability and practical importance answer different questions.','Analysis interpretation'],
['Parameter fitting','Where does validation begin?',[
'Model parameters will be fit to a family of impedance curves. Parameter bounds, optimization settings, initial guesses and the loss function will be documented.',
'The same curves will be used to choose channel equations, tune parameters and demonstrate predictive accuracy. Multiple optimization starts will be reported to expose distinct solutions.',
'Because these curves are experimentally motivated, agreement with them will be described as independent validation of the resulting mechanism.'
],'Fitting targets are not independent validation data. Request a held-out protocol or observable that did not guide model selection and tuning.','Validation leakage'],
['Identifiability','Are parameters separately constrained?',[
'We will inspect whether different parameter combinations yield similar impedance curves. Sensitivity analyses will be conducted for both magnitude and phase at several operating voltages.',
'If capacitance and conductance can trade off, an additional absolute response or independent constraint will be proposed. The report will distinguish parameter uncertainty from stability of a particular prediction.',
'We will avoid claiming that one optimized parameter set is uniquely biological when the available observations do not separate alternatives.'
],'This is a strength. Ask which added protocol best separates the actual candidate mechanisms, rather than merely increasing the number of measurements.','Identifiability strength'],
['Independent tests','Can the model predict a new protocol?',[
'The final tuned model will be evaluated on a stimulus family not used to choose its equations or parameters. The split will be made before examining those responses.',
'The report will include successes and failures, including whether errors cluster by holding voltage, input site or morphology. A failed test will motivate a revised scope rather than quiet retuning on the same test.',
'Any revised model will receive a newly designated evaluation protocol, and the earlier failure will remain documented.'
],'This is a strength: the protocol split and failure handling preserve an interpretable predictive test. Ask whether the test targets the central claim’s domain.','Validation strength'],
['Circuit assumptions','A CA1-like network is a modeling choice',[
'A small excitatory/inhibitory recurrent network will receive the single-cell variants. Connectivity, delays, synaptic kinetics and external input statistics will be specified.',
'For convenience, all excitatory cells will share a dense recurrent wiring pattern. The model will be called a faithful CA1 circuit because each excitatory cell uses a CA1-derived membrane model.',
'Network oscillation frequency will be compared with isolated-cell resonance. A match in frequency will be taken to show that the cell property determines the network rhythm.'
],'Cell identity does not validate circuit wiring, and matched frequencies do not establish determination. Ask for anatomical justification and interventions separating cellular and network time scales.','Scale transition'],
['Readout task','What does successful decoding show?',[
'A readout will classify low versus high input frequency from response features. Training, feature scaling and hyperparameter selection will be documented.',
'Adjacent time windows from the same stimulus realization will be randomly divided between training and test sets. If accuracy exceeds chance, the model will be described as discovering the biological learning rule used by CA1.',
'We will also inspect whether input amplitude or trial identity predicts the labels, but those checks are not included in the primary evaluation plan.'
],'Split by an independent unit and check confounds. Decodability demonstrates available information under the analysis, not the biological learning rule.','Generalization and mechanism'],
['Robustness and negative controls','When should the effect disappear?',[
'We will compare the selected mechanism with a passive baseline and a matched-rate alternative. Inputs will include several amplitudes and recording sites.',
'A negative-control setting is chosen where the model predicts little change from the intervention. The manuscript will explain why this is a diagnostic control rather than an arbitrary null comparison.',
'If the effect persists in every negative control, we will recheck whether the measurement or intervention changes a more general property than intended.'
],'This is a strength: a predicted boundary of the effect makes the explanation more testable. Ask whether the control can distinguish the specific mechanism from the strongest alternative.','Falsifiability strength'],
['Expertise and resources','Can the team do the proposed work?',[
'The fictional team includes experience in compartmental modeling and signal analysis. A collaborator with morphology reconstruction expertise will review reconstruction and discretization conventions.',
'Compute estimates are based on timing a representative compartment count, and include a stated storage budget for raw traces. The current plan does not identify who will lead the hierarchical analysis or identifiability work.',
'We will address the missing expertise by documenting a collaboration or narrowing the corresponding aim before the main project begins.'
],'Evaluate expertise against the proposed work, not institutional prestige. Ask whether the analysis gap is resolved and whether the compute benchmark covers the largest planned runs.','Feasibility and expertise'],
['Timeline and contingencies','What happens when an aim fails?',[
'The first milestone is reproducing the baseline protocol with converged numerics and documented units. The second is completing the predeclared intervention comparison. Circuit expansion follows only after a review of what the single-cell results support.',
'If channel placement does not affect the primary feature, the project will report the null result and investigate whether an alternative observable is more informative, labeling that stage exploratory.',
'The fallback is to deliver a validated protocol comparison and a bounded mechanistic conclusion rather than require that every aim support the original hypothesis.'
],'This is a strength: milestones and bounded fallbacks make the plan informative even under an unexpected result. Ask whether resources remain sufficient for the alternative path.','Contingency strength'],
['Reproducibility','Can another person rerun the analysis?',[
'The project will retain model versions, parameter files, morphology provenance, random seeds and software versions. A minimal example will reproduce one main figure from raw output.',
'The public release will include failed parameter runs with machine-readable reasons for failure. Unit conventions and treatment of missing values will be included in the analysis description.',
'The release will distinguish source data, generated traces and derived summaries so that a reader can trace each numerical claim through the workflow.'
],'This is a strength: traceability supports technical review. Ask for an actual minimal rerun target and checks that figures are generated from the archived version.','Reproducibility strength'],
['Figure and caption audit','Can the reader interpret the axes?',[
'Figure 1 plots voltage amplitude in mV against current amplitude labeled simply I. The caption states impedance in MΩ but does not say whether current is in pA or nA or whether amplitudes are peak or peak-to-peak.',
'Figure 2 pools normalized curves from distinct morphologies. Its shaded region is generated from three parameter scenarios and is labeled a 95% confidence interval.',
'The main text uses the figures to compare absolute gain and parameter uncertainty across models.'
],'Request explicit units and amplitude conventions. Normalized curves cannot establish absolute gain, and an uncalibrated scenario envelope is not a 95% interval.','Scientific communication'],
['Interpretive scope','From a simulation to a larger claim',[
'The expected model results would identify conditions under which channel placement changes a measured response in specified simulated cells. A separate experimental program would be needed to test those interventions in tissue.',
'The impact paragraph nevertheless states that the project will prove how hippocampal memory is generated and provide a general explanation across species and developmental stages.',
'No behavior, species comparison or developmental experiment is included in the proposed work.'
],'Preserve the concrete modeling contribution while narrowing the unsupported behavioral and generalization claims. A narrower accurate claim can still be important.','Claim–evidence alignment'],
['Synthesis page','An applicant’s revised conclusion',[
'The proposed study tests how a defined channel-placement intervention affects small-signal responses across specified CA1 model variants. It will compare alternatives, numerical conventions and operating conditions.',
'Agreement with held-out protocols would support the model’s predictive scope for those measurements. Failure would reveal a boundary or motivate a revised mechanism. Neither outcome alone establishes a unique biological implementation.',
'The strongest review would weigh importance, the ability of the design to answer its question, and the expertise and resources required. It would identify a few consequential issues, recognize strengths and suggest interpretable next steps.'
],'Synthesize rather than repeat every margin note. Which two issues most affect the central inference, and which documented strengths make the project worth improving?','Overall judgment']
];
