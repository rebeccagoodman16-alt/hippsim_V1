/* Skill lessons for the Scientific judgment & Scientific communication rooms.
   Each room gets: principles → worked examples (weak vs strong) → tips → exercises with model answers.
   Rendered above the room's interactive activity by renderPractice(). */
const skillLessons = {

/* ======================= SCIENTIFIC JUDGMENT ======================= */
'question-lab': {
  lead: 'Good science starts by knowing exactly what a result does and does not show. This room teaches you to separate observation from inference, generate rival explanations, and ask questions whose answers would change your mind.',
  principles: [
    ['Three levels of statement', 'An <b>observation</b> is what was measured: “Mean firing rose from 8 to 14 Hz when g<sub>A</sub> was cut by 40%.” An <b>inference</b> is what that implies inside the system studied: “A-type K⁺ current restrains firing in this model.” An <b>interpretation</b> reaches beyond it: “Loss of Kv4.2 contributes to hyperexcitability in Alzheimer’s disease.” Each level needs more evidence than the one before. Most overclaiming happens when an observation is written in the language of an interpretation.'],
    ['The claim-strength ladder', 'Match the verb to the evidence. <i>Is associated with</i> needs a correlation. <i>Predicts</i> needs out-of-sample success. <i>Is necessary for</i> needs removal that abolishes the effect. <i>Is sufficient for</i> needs addition that creates it. <i>Causes, in the brain</i> needs convergent manipulations across methods, ideally with rescue. In a model you can establish necessity and sufficiency <i>within the model</i>; you still cannot transfer them to biology without data.'],
    ['Always list rival explanations', 'For every result write at least three alternatives before you believe your favourite: (1) a different mechanism, (2) a confound, where the manipulation also changed something else, (3) an artifact of method. In modeling, common confounds are a shifted resting potential (which changes how much I<sub>h</sub> or M-current is active), a changed input resistance, and parameter compensation. Common artifacts are too large a time step, an undiscarded transient, a single random seed, and a metric that is sensitive to amplitude rather than timing.'],
    ['Discriminating questions', 'A useful question has an answer that differs depending on which hypothesis is true. Template: <i>“If A rather than B, then when I do X, I expect P rather than Q.”</i> If both hypotheses predict the same outcome, the experiment cannot help you choose, however much work it takes.'],
    ['Built-in controls for simulations', 'Sweep parameters instead of reporting one point. Run 10 or more seeds and report the spread. Halve Δt and confirm nothing changes. Discard the initial transient. Check a known limit, for example that a passive cell relaxes with τ = R<sub>m</sub>C<sub>m</sub>. These are the modeling equivalents of vehicle controls and replicates.'],
  ],
  examples: [
    { label: 'A research question', weak: 'Does I<sub>h</sub> matter for resonance in my CA1 model?', strong: 'If I<sub>h</sub> generates the 4–7 Hz impedance peak, removing 90% of g<sub>h</sub> should abolish the peak when the cell is held near −75 mV. If M-current dominates, the peak should survive at −75 mV but disappear when held near −60 mV with M-current removed.', why: 'The strong version names the manipulation, the operating voltage and the result each hypothesis predicts. It also builds on Hu, Vervaeke &amp; Storm (2002), who found I<sub>h</sub>-dependent resonance at hyperpolarized potentials and M-current-dependent resonance at depolarized ones.' },
    { label: 'A results sentence', weak: 'Our model proves that amyloid-β causes hippocampal hyperexcitability by weakening inhibition.', strong: 'In the model, a 30% reduction in inhibitory synaptic weight was sufficient to double mean CA1 firing. This is consistent with, but does not establish, a role for interneuron dysfunction in amyloid-associated hyperactivity.', why: 'The weak version claims causation in the brain from a model that never contained amyloid. The strong version states what the model showed (sufficiency within the model) and labels the link to disease as consistency. The numbers here are illustrative.' },
  ],
  tips: [
    'Write the sentence you expect to report <b>before</b> running the simulation. Surprise is information only if you predicted something first.',
    'Ask “compared to what?” of every number. A rate of 14 Hz means nothing without the baseline and its variability.',
    'Name the cheapest experiment that could prove you wrong, and run it first.',
    'Keep “the model does X” and “the brain does X” in separate sentences.',
    'When a result surprises you, check units, Δt, seeds and the transient window before reaching for biology.',
    'Use the word “because” as a flag: every “because” is a causal claim that needs its own evidence.',
  ],
  exercises: [
    { title: 'Classify the statements', prompt: 'Label each as observation (O), inference (I) or interpretation (P).<br>(a) Reducing g<sub>EI</sub> from 12 to 8 moved the fixed point from stable to unstable focus.<br>(b) Weaker feedback inhibition lets this E–I loop oscillate.<br>(c) Interneuron loss explains theta abnormalities in AD patients.<br>(d) CV(ISI) was 0.97 at g = 5 and 0.04 at g = 3.', answer: '(a) O: a measured change in the model’s fixed point. (b) I: a mechanism inferred within the model. (c) P: a claim about patients that the model alone cannot support. (d) O.', check: ['Did you separate “in the model” from “in patients”?', 'Did you treat a number plus a comparison as an observation even when it sounds technical?'] },
    { title: 'Generate rival explanations', prompt: 'You add dendritic I<sub>h</sub> to a two-compartment CA1 model and theta–gamma phase–amplitude coupling at the soma increases. List three explanations other than “I<sub>h</sub> organizes theta–gamma coupling”, and one test for each.', answer: '1. Confound: added I<sub>h</sub> depolarized rest and lowered input resistance, changing gamma amplitude. Test: hold V<sub>rest</sub> with a compensating leak and repeat. 2. Metric artifact: the modulation index rises when gamma power rises even without better phase locking. Test: amplitude-match conditions or use a phase-locking measure. 3. Statistical artifact: one seed or short recordings. Test: 20 seeds and a surrogate (time-shifted) null distribution. 4. Different mechanism: altered dendro-somatic coupling changed which input dominates. Test: vary coupling conductance with I<sub>h</sub> fixed.', check: ['Does each alternative come with a test that could rule it out?', 'Did you include at least one methodological artifact?'] },
    { title: 'Make a question discriminating', prompt: 'Rewrite: “Is the Brunel network sensitive to inhibition?”', answer: 'Example: “If the transition from regular to irregular firing is set by the balance point g ≈ 4, then at η = 2 CV(ISI) should cross 0.5 between g = 3.5 and 4.5 for all network sizes; if it is set by delays, the crossing should move when D changes from 1.5 to 3 ms while g is fixed.” Try it in the Brunel page of the model lab.', check: ['Does your version predict different outcomes for different hypotheses?', 'Is it runnable this week?'] },
  ],
},

'confidence-notebook': {
  lead: 'Scientists are paid to be uncertain precisely. This room teaches calibration, estimation and the language that matches confidence to evidence.',
  principles: [
    ['Calibration', 'You are calibrated if the things you rate 80% likely turn out true about 80% of the time. Track it with the Brier score, BS = (1/N) Σ (p<sub>i</sub> − o<sub>i</sub>)², where p is your stated probability and o is 1 if true, 0 if false. Always saying 50% scores 0.25; a perfect forecaster scores 0. Lower is better.'],
    ['Five sources of model uncertainty', '<b>Parameter</b>: values not pinned by data. <b>Structural</b>: the equations leave out a mechanism. <b>Numerical</b>: Δt, solver, tolerance. <b>Stochastic</b>: seeds and noisy inputs. <b>Data</b>: the measurements you fit to are themselves noisy. When you report a prediction, say which of these you checked.'],
    ['Report spread, and say which spread', 'SD describes variability across runs. SEM = SD/√n describes how precisely the mean is known. A 95% confidence interval for a mean is roughly mean ± 1.96·SEM for large n (use the t-distribution for small n). Never show an error bar without saying which it is, and give n.'],
    ['Fermi estimation', 'Break an unknown into factors you can bound, estimate each to within a factor of ~3, and multiply. Errors partly cancel, so the product is often within a factor of 2–3 of the truth. It lets you sanity-check a simulation result in a minute.'],
    ['The hedging ladder', '<i>We show</i> (direct, replicated evidence) → <i>indicate</i> (strong but indirect) → <i>suggest</i> (consistent, alternatives open) → <i>are consistent with</i> (does not contradict) → <i>we speculate</i> (idea, no direct test). Choose one rung per claim, and do not stack hedges: “may possibly suggest” signals confusion, not caution.'],
  ],
  examples: [
    { label: 'A Fermi estimate', weak: '“A CA1 pyramidal cell gets lots of synapses, maybe a million?”', strong: 'Total dendritic length ≈ 10–15 mm; spine density ≈ 2–3 per µm. So 10,000 µm × 2 to 15,000 µm × 3 gives ~20,000–45,000 excitatory synapses. Anatomical counts (Megías et al., 2001) put it near 30,000 excitatory and under 2,000 inhibitory.', why: 'The strong version shows its factors and gives a range. Each factor can be checked separately, and the answer lands within the right order of magnitude.' },
    { label: 'Stating uncertainty', weak: 'The model predicts resonance at 5.2 Hz.', strong: 'Across 20 parameter sets sampled within the measured ranges of g<sub>h</sub> and g<sub>M</sub>, the impedance peak fell between 4.1 and 6.8 Hz (median 5.2 Hz). The peak frequency was most sensitive to g<sub>h</sub>.', why: 'A single number implies precision the model does not have. The strong version reports a range, says what generated it, and names the dominant source of uncertainty.' },
  ],
  tips: [
    'Write your confidence as a number before you look up the answer. Words like “probably” mean anything from 55% to 90% to different readers.',
    'Give a range, not a point: “40–60 Hz” is more honest and more useful than “50 Hz”.',
    'Distinguish “not tested” from “tested and not found”. They are different states of knowledge.',
    'Use the answer pattern: “I don’t know, but I’d find out by…”. It turns a gap into competence.',
    'Pick a claim from your own work each week and estimate how likely it is to survive the next experiment. Check later.',
  ],
  exercises: [
    { title: 'Fermi-check the model lab', prompt: 'The Brunel page simulates 1,000 neurons for 0.4 s. In the AI state the mean rate is about 45 Hz and each neuron projects to about 250 others (C<sub>E</sub> + C<sub>I</sub> in-degree, so out-degree is similar on average). Estimate how many synaptic events the browser computes.', answer: 'Spikes: 1,000 × 45 Hz × 0.4 s ≈ 18,000. Events: 18,000 × 250 ≈ 4.5 million. That is why the run takes a fraction of a second in JavaScript. A full Brunel network (12,500 cells, 1,250 connections each) at the same rate is ~(12.5 × 5) ≈ 60 times larger per second of simulated time.', check: ['Did you multiply cells × rate × time first, then fan-out?', 'Is your answer within a factor of 3?'] },
    { title: 'Calibrate yourself', prompt: 'Give each statement a probability of being true, then score yourself.<br>1. Hodgkin and Huxley fitted their model to the squid giant axon.<br>2. A neuron must oscillate spontaneously to show resonance.<br>3. In Brunel’s asynchronous irregular state, CV(ISI) is close to 1.<br>4. Wilson–Cowan variables E and I are membrane voltages.<br>5. In the classic STDP window, pre-before-post timing potentiates.', answer: 'True, False, True, False, True. Brier score = average of (p − o)². For example, answering 0.9, 0.2, 0.7, 0.3, 0.8 gives (0.01 + 0.04 + 0.09 + 0.09 + 0.04)/5 = 0.054.', check: ['Were your confident answers right more often than your hesitant ones?', 'Did you avoid 50% on everything?'] },
    { title: 'Climb down the ladder', prompt: 'Rewrite to match the evidence: “Our simulations demonstrate that M-current loss causes memory deficits.” The evidence: in a two-compartment model, removing g<sub>M</sub> abolished theta resonance at −60 mV.', answer: 'Example: “In a two-compartment model, removing M-current abolished theta-frequency resonance at depolarized potentials. Because resonance has been proposed to support theta-timed coding, we speculate that M-current loss could affect memory-related activity; this link was not tested here.”', check: ['Is the model result stated with “show” level confidence?', 'Is the memory link clearly marked as speculation?'] },
  ],
},

'review-desk': {
  lead: 'Reviewing is a learnable craft: find the few issues that decide whether the work can succeed, explain why they matter, and say what would fix them.',
  principles: [
    ['What reviewers judge', 'NIH’s simplified review framework (introduced in 2025 for most research grants) groups the questions into three factors: <b>Importance of the research</b> (significance and innovation), <b>Rigor and feasibility</b> (approach, controls, power, alternatives), and <b>Expertise and resources</b>. Scores run from 1 (exceptional) to 9 (poor). Whatever the agency, every review asks: does it matter, will it work, can this team do it?'],
    ['Anatomy of a useful weakness', 'Each comment should say <b>what</b> the problem is, <b>where</b> it appears (aim, page, figure), <b>why</b> it threatens the conclusions, and <b>what</b> would resolve it. Tag it <b>major</b> (could change the outcome or invalidate an aim) or <b>minor</b> (clarity, presentation, small gaps).'],
    ['Check aim independence', 'Ask: if Aim 1 fails, can Aims 2 and 3 still proceed? A proposal whose later aims all rest on one risky result is fragile, however exciting each aim is.'],
    ['A modeling-specific checklist', 'Where do parameters come from, and which are fitted? Are they identifiable from the planned data? Is there a sensitivity analysis? Which predictions are held out from fitting? Is numerical convergence checked? Will code and parameters be shared? What result would falsify the model?'],
    ['Review the argument, not the person', 'Critique claims, not competence. Replace “the authors clearly don’t understand” with a specific statement of the gap. Acknowledge real strengths first and specifically; generic praise reads as filler.'],
  ],
  examples: [
    { label: 'A weakness comment', weak: 'The modeling approach is weak and unconvincing.', strong: '<b>Major (Aim 2, p. 7).</b> The 14 channel parameters are fitted to a single somatic current-clamp dataset, but the predictions concern dendritic resonance. Dendritic g<sub>h</sub> density is not constrained by the planned data, so the predicted resonance shift may reflect an unconstrained parameter. A sensitivity analysis on dendritic g<sub>h</sub>, or dendritic recordings for validation, would address this.', why: 'The strong comment can be acted on. It names the location, the mechanism of the problem, the consequence, and a fix.' },
    { label: 'A strength comment', weak: 'This is an excellent, highly innovative proposal.', strong: 'Linking a CA1 two-compartment model to an existing in vitro dataset with matched holding potentials lets the team test resonance predictions quantitatively, which earlier models of this circuit did not do.', why: 'Specific strengths tell the panel what is genuinely new and help the applicant know what to keep.' },
  ],
  tips: [
    'Read the Specific Aims page twice: first to understand, then after the full proposal to see whether the approach delivers what was promised.',
    'Keep a running table of every claim and its supporting evidence. Gaps become obvious.',
    'Limit yourself to 2–4 major weaknesses. A list of 15 equal-weight issues hides the ones that matter.',
    'For each weakness ask: “Is this fatal or fixable?” Say which.',
    'Write your summary paragraph last, as if explaining the score to someone who has not read the proposal.',
  ],
  exercises: [
    { title: 'Review an excerpt', prompt: '<i>Fictional excerpt:</i> “Aim 1 will build a spiking CA1–CA3 network (5,000 neurons) and show that a 25% loss of PV interneurons reproduces the hyperactivity seen in APP/PS1 mice. Parameters will be taken from the literature. Aim 2 will use the validated network to predict which interneuron rescue restores normal sharp-wave ripples.” Write one strength and the two most important weaknesses.', answer: 'Strength: a concrete, testable perturbation (25% PV loss) tied to a known mouse model phenotype. Major 1: “reproduces hyperactivity” is not a validation criterion. Which statistics (rates, CV, power spectrum) will be compared, against which dataset, with what tolerance? Without it, Aim 2 inherits an unvalidated model. Major 2: parameters “from the literature” mix species, ages and preparations; no fitting, identifiability or sensitivity plan is given, so the rescue predictions may depend on arbitrary choices. Possible minor: no plan for seeds or network-size dependence.', check: ['Did you state why each weakness matters for the conclusions?', 'Did you propose a fix for each?'] },
    { title: 'Major or minor?', prompt: 'Sort: (a) Figure 3 axis lacks units. (b) No power analysis for the planned slice recordings. (c) Aim 3 depends entirely on Aim 2 succeeding. (d) Inconsistent abbreviation of interneuron types. (e) The model has never been compared with any data.', answer: 'Major: (b), (c), (e). Minor: (a), (d).', check: ['Did you ask whether each issue could change the study’s conclusions?'] },
    { title: 'Make it constructive', prompt: 'Rewrite: “This is a fishing expedition with no hypothesis.”', answer: 'Example: “Aim 3 is framed as exploratory. Stating a primary hypothesis (for example, which interneuron class is predicted to matter most and why) and a decision criterion would make the aim testable and help prioritize the experiments.”', check: ['Does your version name the issue without judging the person?', 'Does it propose a concrete improvement?'] },
  ],
},

'proposal-reader': {
  lead: 'A 30-page proposal is an argument spread across many sections. Reading it well means finding that argument, then testing each link.',
  principles: [
    ['Read in three passes', 'Adapted from Keshav’s “How to Read a Paper” (2007). <b>Pass 1 (10 min):</b> title, aims, section headings, figures and their legends; write one sentence on what is proposed. <b>Pass 2 (1 hour):</b> read the argument, marking claims and evidence, skipping derivations. <b>Pass 3 (as needed):</b> reconstruct the key steps yourself and check assumptions, numbers and feasibility.'],
    ['Map the argument', 'For each aim, write: <b>claim</b> (what will be shown) → <b>evidence</b> (preliminary data, citations) → <b>warrant</b> (why that evidence supports the claim). Most weaknesses are missing warrants: the evidence is real but does not connect to the claim.'],
    ['Use a fixed margin code', 'For example: <b>!</b> key claim, <b>E</b> evidence, <b>?</b> unclear, <b>×</b> contradiction, <b>A</b> hidden assumption, <b>→</b> dependency on another section. A consistent code turns annotation into data you can scan.'],
    ['Track the numbers', 'Copy every sample size, effect size, parameter value and timeline into a side table. Contradictions between sections (n = 12 in aims, n = 8 in methods) are common and easy to miss when reading linearly.'],
    ['Look for what is absent', 'Missing alternatives, missing controls, missing failure plans and missing validation are as important as what is written. Ask: what would I need to see to be convinced?'],
  ],
  examples: [
    { label: 'A margin note', weak: '?? not sure', strong: '<b>A</b> (p. 9): assumes interneuron loss is uniform across CA1 layers. If loss is concentrated in stratum oriens, the network wiring in Aim 2 should be layer-specific.', why: 'The strong note names the assumption, its location and its consequence, so you can turn it into a review comment later without rereading.' },
    { label: 'A one-sentence summary after pass 1', weak: 'This proposal is about Alzheimer’s and hippocampus modeling.', strong: 'Proposes that early PV-interneuron dysfunction drives CA1 hyperactivity, tested by fitting a spiking network to mouse slice data (Aim 1) and predicting rescue strategies (Aim 2).', why: 'A good pass-1 sentence names the hypothesis, the method and the structure. If you cannot write one, the proposal may be unclear, which is itself a finding.' },
  ],
  tips: [
    'Read figure legends before body text. Figures show what the applicants think is their strongest evidence.',
    'Write questions in the margin as questions, not judgments; decide later which are weaknesses.',
    'Stop after each aim and predict the risks before you read the “pitfalls” section. Then compare.',
    'Time-box each pass. Unlimited time encourages linear rereading instead of structured judgment.',
  ],
  exercises: [
    { title: 'Map one paragraph', prompt: '<i>Fictional:</i> “Our preliminary model shows theta power drops 40% after reducing h-current. Since theta is required for spatial memory, restoring h-current should rescue memory in AD mice.” Write the claim, evidence and warrant, then find the weak link.', answer: 'Claim: restoring I<sub>h</sub> rescues memory in AD mice. Evidence: model theta power drops 40% when I<sub>h</sub> is reduced. Warrant: theta is required for spatial memory, so restoring theta-related currents restores memory. Weak links: (1) a model reduction does not show that AD mice have reduced I<sub>h</sub>; (2) “theta is required” does not imply that increasing I<sub>h</sub> restores theta in AD tissue, or that theta is the bottleneck for their memory deficit.', check: ['Did you find a gap between model and animal?', 'Did you spot the necessity → sufficiency jump?'] },
    { title: 'Find the hidden assumption', prompt: '“We will use parameters from rat CA1 slices to model human CA1.” What is assumed?', answer: 'That channel densities, morphology and kinetics are similar across species. Human pyramidal cells are larger and differ in dendritic properties, including h-channel expression, so resonance and integration predictions may not transfer without human data or a sensitivity analysis.', check: ['Did you name a specific property that might differ?'] },
  ],
},

'paper-reading': {
  lead: 'Read modeling papers like a reviewer and an experimenter at once: what did they assume, what did they fit, and what did they actually predict?',
  principles: [
    ['Know the anatomy', 'The introduction states the gap; the methods define the model; the results show what the model does; the discussion argues what it means. Claims in the discussion are usually stronger than the results support. Read results and figures first if time is short.'],
    ['Fit versus prediction', 'The most important question in a modeling paper: which results were used to set parameters, and which were genuinely predicted afterward? A model that reproduces the data it was fitted to has shown flexibility, not truth. Look for held-out data, a different experimental condition, or a new experiment the model predicted before it was done.'],
    ['A modeling-paper checklist', 'Model class (biophysical, LIF, rate, ML)? Which mechanisms are included and which deliberately left out? Where do parameters come from? Is there a sensitivity or robustness analysis? What does the model fail to reproduce? Is code available? Would a simpler model explain the same results?'],
    ['Worked example: Hu, Vervaeke & Storm (2002)', 'This paper found two forms of theta-frequency resonance in rat CA1 pyramidal cells. Near −60 mV, resonance depended on M-current (blocked by XE991) and was amplified by persistent Na⁺ current; near −80 mV, it depended on h-current (blocked by ZD7288). The design lesson: the same property (resonance) had different mechanisms at different operating points, so holding voltage is a variable you must control and report.'],
  ],
  examples: [
    { label: 'A summary card', weak: 'Interesting paper about resonance in hippocampus with channels.', strong: '<b>Question:</b> what generates theta resonance in CA1 pyramidal cells? <b>Approach:</b> whole-cell recordings with ZAP current input and pharmacological block. <b>Finding:</b> M-current at depolarized and h-current at hyperpolarized potentials. <b>Limit:</b> somatic recordings in slices. <b>Use for me:</b> test my model at two holding voltages.', why: 'A five-field card is quick to write and makes papers comparable when you read twenty of them.' },
  ],
  tips: [
    'Before reading the results, look at Figure 1 and predict what Figure 2 will show.',
    'Write the one-sentence “take-home” in your own words; if you cannot, reread the abstract and the last results figure.',
    'Keep a citation log with the claim you would cite each paper for. Never cite a paper for something you have only seen in another paper’s summary.',
    'For each model paper, note one thing it cannot explain. That is where your project could start.',
  ],
  exercises: [
    { title: 'Fit or prediction?', prompt: 'A paper fits channel densities to somatic voltage traces under current steps, then shows the model reproduces those traces and also a dendritic attenuation profile that was not used in fitting. Which result is evidence of predictive power?', answer: 'The dendritic attenuation profile, because it was not used to set parameters. Reproducing the fitted somatic traces shows the model can be tuned, not that it is right.', check: ['Did you ask what data set the parameters?'] },
    { title: 'Write a summary card', prompt: 'Using the Brunel network page in the model lab and its citation (Brunel, 2000, J Comput Neurosci 8:183–208), write a five-field card: question, approach, finding, limit, use for me.', answer: 'Example: Question: what collective states can a sparse E–I network of LIF neurons show? Approach: mean-field (Fokker–Planck) analysis plus simulation. Finding: four regimes (SR, AI, SI fast, SI slow) set by relative inhibition g and external drive; balance near g ≈ 4. Limit: identical point neurons, delta synapses, random wiring. Use for me: a baseline for how E/I changes shift network state in my AD model.', check: ['Is your “limit” a real modeling assumption, not a generic caveat?'] },
  ],
},

/* ======================= SCIENTIFIC COMMUNICATION ======================= */
'panel-room': {
  lead: 'Spoken scientific exchange has a structure you can rehearse: answer first, give the evidence, state the limit, and say what comes next.',
  principles: [
    ['Answer–Evidence–Limit–Next', 'A strong spoken answer has four beats in 30–60 seconds: the <b>answer</b> in one sentence; the <b>evidence</b> behind it; the <b>limit</b> of that evidence; the <b>next</b> step that would address the limit. It is short, honest and shows you have thought beyond the question.'],
    ['Questions outside your expertise', 'Acknowledge the boundary, bridge to what you do know, and offer a route forward: “That’s outside what I’ve measured. What I can say is… The experiment that would answer it is…” Guessing confidently in someone else’s field costs more credibility than saying you don’t know.'],
    ['Critical or hostile questions', 'Restate the question neutrally, concede the valid part explicitly, then clarify scope or present evidence. Conceding a fair point early makes your defence of the rest more credible.'],
    ['Asking good questions as a reviewer or audience member', 'Open questions (“How did you choose…?”) invite explanation; closed ones (“Did you test…?”) pin down facts. Ask one question at a time, and make it about the work, not about showing your own knowledge.'],
  ],
  examples: [
    { label: '“Why a two-compartment model instead of full morphology?”', weak: 'Well, full morphology is really complicated and takes a long time to simulate, and we didn’t have reconstructions, so we thought two compartments would be fine, and actually lots of papers do this…', strong: '<b>Answer:</b> Two compartments are the simplest model that separates somatic and dendritic resonance. <b>Evidence:</b> it reproduces the somatic impedance peak and the dendro-somatic phase lag we are testing. <b>Limit:</b> it can’t capture location-dependent effects along the apical tree. <b>Next:</b> we’re moving the same channel set into a reconstructed CA1 morphology to check whether the conclusions hold.', why: 'The strong answer leads with the reason, not the excuse, and turns the limitation into a plan.' },
    { label: '“How does neuroinflammation fit into your model?”', weak: 'Inflammation is definitely important in Alzheimer’s, so it probably changes everything we found.', strong: 'Our model doesn’t represent glia or cytokines, so I can’t say directly. What it can do is test downstream consequences: if inflammatory signals reduce inhibitory synaptic strength, as some studies suggest, that maps onto lowering g in our network, which we’ve shown raises firing. Testing that would need data on which synapses change.', why: 'It is honest about the boundary and still useful: it translates the question into something the model can address.' },
  ],
  tips: [
    'Pause for two seconds before answering. It reads as thoughtful, not slow.',
    'Repeat or paraphrase the question. It confirms you understood and gives the audience context.',
    'Stop when you have answered. Over-answering invites follow-ups on your weakest point.',
    '“We didn’t test that” is a complete, respectable sentence. Follow it with how you would.',
    'Keep a “parking lot”: offer to follow up after the meeting on anything that needs detail.',
    'Rehearse the three questions you most fear, out loud, with a timer.',
  ],
  exercises: [
    { title: 'Answer in 45 seconds', prompt: '“How do you know your model parameters are right?” Draft an Answer–Evidence–Limit–Next response.', answer: 'Example: “We don’t know they’re right; we know they’re constrained. The passive and channel parameters are fitted to CA1 recordings, and the model then predicts the impedance peak, which wasn’t used in fitting, within the experimental range. Some dendritic densities aren’t well constrained, so we report results across a range of values. Dendritic recordings would pin those down, and that’s the next validation step.”', check: ['Did you avoid claiming certainty?', 'Did you mention something the model predicted rather than fitted?'] },
    { title: 'Handle a critical question', prompt: '“Your network has 1,000 neurons. Isn’t that far too small to say anything about the hippocampus?”', answer: 'Example: “That’s a fair concern for absolute numbers like rates and oscillation frequency, which can shift with size. What we use it for is the direction of change, how firing and synchrony move as inhibition weakens, and we’ve checked that this direction holds at 4,000 neurons. A full-scale model would be needed for quantitative predictions.”', check: ['Did you concede the valid part first?', 'Did you clarify what the claim actually is?'] },
  ],
},

'communication-studio': {
  lead: 'Clear scientific writing and talks rest on a few habits: one message, the right level for the audience, and structure that carries the reader.',
  principles: [
    ['Start with one sentence', 'Before writing anything, finish this: “The main thing I want them to remember is ___.” Every paragraph, figure and slide should serve that sentence. If something does not, cut it or move it to supplementary material.'],
    ['Write for a specific audience', 'For specialists, lead with the result and method details. For scientists in other fields, add one sentence of context and define each term once. For the public, start from a familiar question, use one analogy, and keep one number. Same evidence, different entry points.'],
    ['Paragraph structure', '<b>Topic sentence</b> (the claim) → <b>evidence</b> (data, with numbers and uncertainty) → <b>implication</b> (why it matters for the next step). A reader skimming only first sentences should still follow your argument.'],
    ['Abstract structure', 'Context (1 sentence) → gap (1) → approach (1–2) → key result with numbers (2) → implication (1). Five to seven sentences, every one doing a job.'],
    ['Assertion–evidence slides', 'Following Michael Alley’s assertion–evidence approach: the slide title is a full-sentence claim (“Weakening inhibition doubles CA1 firing”), and the body is visual evidence for it, not bullet points. One message per slide, about one minute per slide.'],
  ],
  examples: [
    { label: 'Slide title', weak: 'Results: Brunel network', strong: 'Inhibition-dominated networks fire irregularly and asynchronously', why: 'A topic title says what the slide is about; an assertion title says what the audience should conclude. If they only read titles, they still get your talk.' },
    { label: 'Same finding, three audiences', weak: 'The model’s Hopf bifurcation at P ≈ 1 implies E–I loop-mediated oscillatory emergence. (Used for everyone.)', strong: '<b>Specialist:</b> In the Wilson–Cowan model, a supercritical Hopf bifurcation at P ≈ 1 creates a stable limit cycle. <b>Other scientists:</b> When excitatory drive passes a threshold, the balance between excitation and delayed inhibition becomes unstable and the populations begin to oscillate. <b>Public:</b> Like a thermostat that reacts too slowly, inhibition arrives late and overshoots, so brain activity swings back and forth in a rhythm.', why: 'Each version keeps the same claim but changes vocabulary and entry point.' },
    { label: 'Reporting a number', weak: 'Firing increased significantly.', strong: 'Mean firing rose from 6.1 ± 0.8 to 12.4 ± 1.3 Hz (mean ± SD, 20 seeds).', why: 'Give the values, the units, the spread, which spread, and n. “Significantly” without a test is meaningless; with a test, report the test and effect size.' },
  ],
  tips: [
    'Write the “so what?” sentence for every figure before you make it.',
    'Remove stacked hedges (“may potentially suggest”). One calibrated verb is enough.',
    'Prefer active voice and concrete subjects: “We removed g<sub>h</sub>” beats “g<sub>h</sub> removal was performed”.',
    'Define an abbreviation once, and only if you will use it at least three times.',
    'Read your text aloud. Sentences you stumble on are sentences readers stumble on.',
    'End a talk on your one message, not on “Thank you, questions?”',
  ],
  exercises: [
    { title: 'Fix the slide title', prompt: 'Rewrite these as assertions: (a) “STDP simulation” (b) “Effect of τ<sub>I</sub>” (c) “Methods”.', answer: '(a) “Correlated inputs win the competition for synaptic strength under STDP.” (b) “Slower inhibition produces larger, slower oscillations.” (c) “A two-compartment model fitted to slice data lets us test resonance at two voltages.”', check: ['Is each title a full sentence with a verb?', 'Would someone reading only the title learn the point?'] },
    { title: 'Tighten an abstract sentence', prompt: 'Rewrite: “In this study, it was found that there may potentially be a possible role for h-current in the modulation of resonance properties in CA1 neurons.”', answer: 'Example: “Removing h-current abolished theta resonance in CA1 model neurons held near −75 mV.” (Then add the implication in the next sentence.)', check: ['Did you replace hedges with the actual result?', 'Did you cut more than half the words?'] },
    { title: 'Three audiences', prompt: 'Write the STDP lab’s main finding for a specialist, a non-neuroscience scientist and a high-school student.', answer: 'Specialist: “Additive STDP with A₋/A₊ = 1.2 selectively potentiated the correlated input group while depressing independent inputs.” Scientist: “A timing-based learning rule strengthened inputs that fire together and weakened the rest.” Student: “Connections that help make a neuron fire get stronger; ones that arrive at random fade away. ‘Fire together, wire together.’”', check: ['Did the core claim stay the same in all three?'] },
  ],
},

'figure-clinic': {
  lead: 'A figure is an argument in visual form. This room covers the choices that make figures honest and readable, from plot type to legend.',
  principles: [
    ['One message per figure', 'Decide the claim first, then choose the plot that makes the comparison obvious. Put the things to compare next to each other, on the same axis scale.'],
    ['Show the data, not just the mean', 'Bar charts hide distributions. With fewer than ~30 points per group, plot every point (dot or strip plot) with a summary marker. For larger samples, use box or violin plots. Always say what error bars mean: SD (spread), SEM (precision of the mean) or 95% CI.'],
    ['Axes, units and scale', 'Label every axis with the quantity and unit (“Firing rate (Hz)”). Start bar charts at zero. Use a log scale when values span orders of magnitude, and say so. Keep the same scale across panels you compare.'],
    ['Color with purpose', 'Use color for categories that matter, consistently across all figures (excitatory is always the same color). Choose color-blind-safe palettes and do not rely on red versus green. Use a sequential palette for magnitude and a diverging one for values around a meaningful zero.'],
    ['Neuroscience conventions', 'Pair a spike raster with a population-rate trace on a shared time axis. Show a phase portrait with its nullclines and a time series beside it. For impedance, show magnitude and phase against frequency, and state the holding voltage.'],
    ['Legends that stand alone', 'A legend should let a reader understand the figure without the main text: what is plotted, model or preparation, n, what error bars mean, key parameters and the statistical test.'],
  ],
  examples: [
    { label: 'A figure legend', weak: 'Figure 2. Firing rates in different conditions.', strong: 'Figure 2. <b>Weakening inhibition raises network firing.</b> Mean firing rate of excitatory neurons in the Brunel network for relative inhibition g = 3–6 (η = 2). Dots: individual seeds (n = 20 per g); line: mean; shading: 95% CI. Dashed line: balance point g = 4.', why: 'The strong legend starts with the take-home claim, then gives everything needed to read the plot.' },
  ],
  tips: [
    'Sketch the figure on paper before plotting. It forces you to decide the comparison.',
    'Make text in figures at least as large as the caption text when printed at final size.',
    'Remove gridlines, borders and 3-D effects that carry no information.',
    'Letter panels (A, B, C) and refer to them in the order they are discussed.',
    'Check the figure in grayscale and with a color-blindness simulator.',
  ],
  exercises: [
    { title: 'Critique a figure', prompt: 'A slide shows a red/green bar chart comparing “WT” and “AD” firing rates with SEM error bars, n not stated, y-axis starting at 5 Hz. List the problems and fixes.', answer: 'Red/green is not color-blind safe (use, e.g., dark grey and plum). The axis should start at 0 for bars, or switch to a dot plot. n is missing. SEM shrinks with n and can make differences look tight; show individual points and state the error bar type. Add units to the axis label and an assertion title.', check: ['Did you find at least four issues?'] },
    { title: 'Choose the plot', prompt: 'Which plot fits each? (a) Weights of 100 synapses after STDP training, by group. (b) Impedance versus frequency at two holding voltages. (c) Loss over 2,000 training epochs.', answer: '(a) Strip or dot plot by group (or a histogram per group) to show bimodality. (b) Two lines on shared axes, magnitude and phase in stacked panels, log frequency axis. (c) Line plot with log-scaled y-axis.', check: ['Did you pick plots that show distributions where shape matters?'] },
  ],
},
};

/* Extra rooms that are lesson-only (no interactive activity of their own). */
const extraPracticeRooms = [
  ['paper-reading', 'Reading a paper critically', 'Separate fit from prediction, check model assumptions and write summary cards you can reuse.', 'Scientific judgment'],
  ['figure-clinic', 'Figure clinic', 'Choose plot types, error bars, colors and legends that make an honest, readable argument.', 'Scientific communication'],
];

/** Lesson block inserted above a room's activity. */
function skillLessonHTML(slug) {
  const L = skillLessons[slug]; if (!L) return '';
  const ex = (e, i) => `<div class="box skill-ex"><p class="eyebrow">EXERCISE ${i + 1}</p><h3>${e.title}</h3><p>${e.prompt}</p>
    <label for="skill-${slug}-${i}">Your answer</label><textarea id="skill-${slug}-${i}" data-skill-draft="${slug}-${i}" rows="4" placeholder="Draft your answer before opening the model answer."></textarea>
    <details class="skill-answer"><summary>Show a model answer</summary><p>${e.answer}</p><p class="eyebrow">CHECK YOUR OWN ANSWER</p><ul>${e.check.map(c => `<li>${c}</li>`).join('')}</ul></details></div>`;
  return `<p class="lead skill-lead">${L.lead}</p>
  <nav class="page-jumps" aria-label="On this page"><a href="#skill-learn">Learn</a><a href="#skill-examples">Examples</a><a href="#skill-tips">Tips</a><a href="#skill-exercises">Exercises</a><a href="#skill-next">Apply it</a></nav>
  <section class="lesson-section" id="skill-learn"><p class="eyebrow">01 · Learn the skill</p><h2>What good looks like</h2>${L.principles.map(([h, b]) => `<div class="skill-principle"><h3>${h}</h3><p>${b}</p></div>`).join('')}</section>
  <section class="lesson-section" id="skill-examples"><p class="eyebrow">02 · Worked examples</p><h2>Weak versus strong</h2>${L.examples.map(e => `<div class="skill-compare"><h3>${e.label}</h3><div class="skill-pair"><div class="skill-weak"><span class="pill">WEAKER</span><p>${e.weak}</p></div><div class="skill-strong"><span class="pill">STRONGER</span><p>${e.strong}</p></div></div><p class="muted"><b>Why it works:</b> ${e.why}</p></div>`).join('')}</section>
  <section class="lesson-section" id="skill-tips"><p class="eyebrow">03 · Tips &amp; tricks</p><h2>Habits that help</h2><div class="box tan"><ul class="skill-tips">${L.tips.map(t => `<li>${t}</li>`).join('')}</ul></div></section>
  <section class="lesson-section" id="skill-exercises"><p class="eyebrow">04 · Exercises</p><h2>Practice, then compare</h2><p class="muted">Write your answer first. Drafts are saved in this browser.</p>${L.exercises.map(ex).join('')}</section>
  <section class="lesson-section" id="skill-next"><p class="eyebrow">05 · Keep practising</p><h2>Apply it</h2><div class="overview-cards">${skillHasActivity(slug) ? `<a class="topic-card" href="/practice/${slug}/room/"><span class="eyebrow">PRACTICE ROOM</span><h2>Use it on the fictional CA1 proposal</h2><p>The hands-on activity for this skill, on its own page.</p><span class="card-link">Open the practice room →</span></a>` : ''}<a class="topic-card" href="/practice/prompt-deck/"><span class="eyebrow">PROMPT DECK</span><h2>Timed practice cards</h2><p>Draw a prompt, answer against the clock, compare with a model answer and rate yourself.</p><span class="card-link">Open the prompt deck →</span></a></div></section>`;
}
function skillHasActivity(slug) { return !extraPracticeRooms.some(r => r[0] === slug); }

/* Drafts persist per browser (a convenience; never required). */
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.skillDraft; if (!k) return;
  try { localStorage.setItem('skill-draft-' + k, e.target.value); } catch (err) {}
});
function restoreSkillDrafts() {
  document.querySelectorAll('[data-skill-draft]').forEach(t => { try { t.value = localStorage.getItem('skill-draft-' + t.dataset.skillDraft) || ''; } catch (err) {} });
}

/* Register the lesson-only rooms with the practice index and sidebar. */
practiceModules.push(...extraPracticeRooms);

/* Header shown on a skill room's separate practice page. */
function roomIntroHTML(slug) {
  return `<div class="box tan room-intro"><p class="eyebrow">Practice room</p><p>This is the hands-on activity for <b>${practiceModules.find(m => m[0] === slug)[1]}</b>. Review the principles first if you have not.</p><div class="button-cloud"><a class="secondary" href="/practice/${slug}/">← Learn the skill</a><a class="secondary" href="/practice/prompt-deck/">Timed prompt deck</a></div></div>`;
}
