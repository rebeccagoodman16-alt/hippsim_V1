/* Extracted from Little Neural Guide wb-neuron.js */
/* ===================== NEURON WORKBENCH · ENGINE =====================
   One single-neuron simulator with selectable biological detail:
     lif   leaky integrate-and-fire (+ optional spike-triggered adaptation)
     adex  adaptive exponential IF (Brette & Gerstner 2005; firing-pattern presets from Naud et al. 2008)
     izh   Izhikevich (2003) quadratic model
     cond  conductance-based: any mix of channels from the library below, 1 or 2 compartments
   The channel library is declarative (gate expressions as text). The same text is compiled to JavaScript
   for the live model and written out as Python for the export, so both always solve the same equations.
   Units (cond): V mV · t ms · g mS/cm² · I µA/cm² · C µF/cm² · [Ca] mM. Injected current in nA is converted
   with the membrane area: I(µA/cm²) = I(nA) · 1e5 / area(µm²). */
(function () {
  'use strict';

  /* ---------- channel library ----------
     gate: { n, p (power), a/b (rate expressions, 1/ms) | inf/tau (tau in ms; omit tau = instantaneous) }
     Expressions may use V, Ca, exp(), vtrap(x,y)=x/(exp(x/y)-1), ifelse(c,a,b), the channel's consts, and the global VT.
     Tref/q10: kinetic temperature scaling φ = q10^((T−Tref)/10) divides every τ. */
  const NCH = {
    hh_na: { label: 'Na⁺ (HH squid)', ion: 'Na', E: 'ENa', Tref: 6.3, q10: 3, g: 120, gamma: 20,
      gates: [{ n: 'm', p: 3, a: '0.1*vtrap(-(V+40),10)', b: '4*exp(-(V+65)/18)' }, { n: 'h', p: 1, a: '0.07*exp(-(V+65)/20)', b: '1/(1+exp(-(V+35)/10))' }],
      bio: 'The original Hodgkin–Huxley (1952) fast sodium current of the squid giant axon. m: activation (opens on depolarization, fast); h: inactivation (closes on depolarization, slower).', ref: 'Hodgkin & Huxley (1952) J Physiol 117:500' },
    hh_k: { label: 'K⁺ delayed rectifier (HH squid)', ion: 'K', E: 'EK', Tref: 6.3, q10: 3, g: 36, gamma: 20,
      gates: [{ n: 'n', p: 4, a: '0.01*vtrap(-(V+55),10)', b: '0.125*exp(-(V+65)/80)' }],
      bio: 'The HH delayed-rectifier potassium current: four independent n gates, slow to open, repolarizes the spike.', ref: 'Hodgkin & Huxley (1952)' },
    na: { label: 'Na⁺ transient (Traub)', ion: 'Na', E: 'ENa', Tref: 36, q10: 3, g: 50, gamma: 20,
      gates: [{ n: 'm', p: 3, a: '0.32*vtrap(13-(V-VT),4)', b: '0.28*vtrap((V-VT)-40,5)' }, { n: 'h', p: 1, a: '0.128*exp((17-(V-VT))/18)', b: '4/(1+exp((40-(V-VT))/5))' }],
      bio: 'Mammalian fast Na⁺ current in the Traub–Miles form used for cortical and hippocampal cells. VT shifts both gates together and sets spike threshold.', ref: 'Traub & Miles (1991); NEURON hh2.mod in Pospischil et al. (2008)' },
    kdr: { label: 'K⁺ delayed rectifier (Traub)', ion: 'K', E: 'EK', Tref: 36, q10: 3, g: 5, gamma: 20,
      gates: [{ n: 'n', p: 4, a: '0.032*vtrap(15-(V-VT),5)', b: '0.5*exp((10-(V-VT))/40)' }],
      bio: 'Spike-repolarizing K⁺ current. Larger g shortens the spike; interneurons have about twice the density of pyramidal cells.', ref: 'Traub & Miles (1991); Pospischil et al. (2008)' },
    km: { label: 'M-current (Kv7/KCNQ)', ion: 'K', E: 'EK', Tref: 36, q10: 2.3, g: 0.07, gamma: 10, consts: { taumax: 1000 },
      gates: [{ n: 'p', p: 1, inf: '1/(1+exp(-(V+35)/10))', tau: 'taumax/(3.3*exp((V+35)/20)+exp(-(V+35)/20))' }],
      bio: 'Slow, non-inactivating K⁺ current that activates near threshold. It causes spike-frequency adaptation, and its slow negative feedback contributes to theta-range resonance at depolarized potentials (Hu et al. 2002).', ref: 'Yamada, Koch & Adams (1989); IM_cortex.mod, Pospischil et al. (2008)' },
    ka: { label: 'A-type K⁺ (Kv4)', ion: 'K', E: 'EK', Tref: 23, q10: 3, g: 0, gamma: 10,
      gates: [{ n: 'a', p: 4, inf: '1/(1+exp(-(V+60)/8.5))', tau: '0.37+1/(exp((V+35.8)/19.7)+exp(-(V+79.7)/12.7))' }, { n: 'b', p: 1, inf: '1/(1+exp((V+78)/6))', tau: 'ifelse(V<-63,1/(exp((V+46)/5)+exp(-(V+238)/37.5)),19)' }],
      bio: 'Transient K⁺ current that activates and inactivates quickly below threshold. It delays the first spike and, in CA1 dendrites, limits back-propagating spikes (Hoffman et al. 1997).', ref: 'Huguenard & McCormick (1992) J Neurophysiol 68:1373' },
    h: { label: 'Ih (HCN)', ion: 'h', E: 'Eh', Tref: 34, q10: 3, g: 0, gamma: 1, consts: { Vhalf: -82, k: 9, tau: 40, Vtau: -75 },
      gates: [{ n: 'y', p: 1, inf: '1/(1+exp((V-Vhalf)/k))', tau: '2*tau/(exp((V-Vtau)/20)+exp(-(V-Vtau)/20))' }],
      bio: 'Hyperpolarization-activated mixed cation current. It opens below rest, pulls the voltage back up (sag and rebound), and its slow kinetics create a low-pass-opposing filter: the main source of CA1 dendritic theta resonance (Magee 1998; Narayanan & Johnston 2007).', ref: 'Phenomenological Boltzmann + bell-shaped τ; defaults loosely after Magee (1998) J Neurosci 18:7613' },
    cal: { label: 'Ca²⁺ high-threshold (L-type)', ion: 'Ca', E: 'ECa', Tref: 36, q10: 1, g: 0, gamma: 5,
      gates: [{ n: 'q', p: 2, a: '0.055*vtrap(-27-V,3.8)', b: '0.94*exp((-75-V)/17)' }, { n: 'r', p: 1, a: '0.000457*exp((-13-V)/50)', b: '0.0065/(exp((-15-V)/28)+1)' }],
      bio: 'High-voltage-activated Ca²⁺ current. It adds a depolarizing shoulder that can turn single spikes into bursts, and loads the Ca²⁺ pool that drives the AHP.', ref: 'Reuveni et al. (1993); IL_gutnick.mod, Pospischil et al. (2008)' },
    cat: { label: 'Ca²⁺ low-threshold (T-type)', ion: 'Ca', E: 'ECa', Tref: 24, q10: 3, g: 0, gamma: 5, consts: { Vx: 2 },
      gates: [{ n: 's', p: 2, inf: '1/(1+exp(-(V+Vx+57)/6.2))' }, { n: 'u', p: 1, inf: '1/(1+exp((V+Vx+81)/4))', tau: '30.8+(211.4+exp((V+Vx+113.2)/5))/(1+exp((V+Vx+84)/3.2))' }],
      bio: 'Low-threshold Ca²⁺ current, de-inactivated by hyperpolarization. Releasing a hyperpolarizing step produces a rebound Ca²⁺ spike crowned by a burst (LTS cells).', ref: 'Huguenard & McCormick (1992); Destexhe et al. (1998); Pospischil et al. (2008)' },
    kahp: { label: 'K⁺(Ca) slow AHP (SK-like)', ion: 'K', E: 'EK', Tref: 36, q10: 1, g: 0, gamma: 10, consts: { Kd: 0.0005, tau: 150 },
      gates: [{ n: 'c', p: 1, inf: 'Ca*Ca*Ca*Ca/(Ca*Ca*Ca*Ca+Kd*Kd*Kd*Kd)', tau: 'tau' }],
      bio: 'Ca²⁺-activated K⁺ current. Each spike lets Ca²⁺ in; the AHP gate integrates it, producing a slow after-hyperpolarization and adaptation independent of voltage.', ref: 'Phenomenological Hill gate (n = 4) on the submembrane Ca²⁺ pool' },
  };
  const CH_ORDER = ['hh_na', 'hh_k', 'na', 'kdr', 'km', 'ka', 'h', 'cal', 'cat', 'kahp'];
  const CA_CH = ['cal', 'cat'];

  /* ---------- default state (every key is a control or a URL parameter) ---------- */
  const DEF = {
    model: 'cond', comp: 1, iunit: 'nA', temp: 36, area: 29000, Cm: 1, gL: 0.1, EL: -70, ENa: 50, EK: -100, Eh: -30, ECa: 120, camode: 'fixed', cao: 2,
    VT: -55, p: 0.3, gc: 1, gLd: 0.1, site: 's', settle: 400,
    ca_tau: 5, ca_depth: 1, ca_inf: 2.4e-4,
    noise: false, nseed: 1,
    // point models
    lif_C: 200, lif_gL: 10, lif_EL: -70, lif_Vth: -50, lif_Vr: -60, lif_tref: 2, lif_b: 0, lif_tauw: 100,
    adex_C: 200, adex_gL: 10, adex_EL: -70, adex_VT: -50, adex_DT: 2, adex_a: 2, adex_tauw: 30, adex_b: 0, adex_Vr: -58, adex_Vpk: 0,
    izh_a: 0.02, izh_b: 0.2, izh_c: -65, izh_d: 8,
    // stimulus
    proto: 'step', amp: 0.75, dc: 0, delay: 100, dur: 500, tstop: 800, ramp1: 1, freq: 5, f0: 0.5, f1: 20, npulse: 5, pw: 2, sigma: 0.2, taun: 5, seed: 7,
    pc_ge: 0.012, pc_gi: 0.057, pc_se: 0.003, pc_si: 0.0066, pc_te: 2.7, pc_ti: 10.5, pc_Ee: 0, pc_Ei: -75,
    vhold: -70, vcmd: -10,
    method: 'rl', dt: 0.025,
  };
  CH_ORDER.forEach(c => { DEF['on_' + c] = false; DEF['g_' + c] = NCH[c].g; DEF['gd_' + c] = 0; Object.entries(NCH[c].consts || {}).forEach(([k, v]) => DEF[c + '_' + k] = v); });

  /* ---------- presets: each is a documented starting point, not a fitted cell ---------- */
  const CH0 = Object.fromEntries(CH_ORDER.map(c => ['on_' + c, false]));
  const PRESETS = {
    'hh-squid': { group: 'Classic', label: 'Hodgkin–Huxley squid axon', note: 'The 1952 model at 6.3 °C. Current is a density (µA/cm²). Try 2.3 vs 6.3 µA/cm² for threshold, and raise it until the cell enters depolarization block.',
      s: { ...CH0, on_hh_na: true, on_hh_k: true, temp: 6.3, gL: 0.3, EL: -54.387, ENa: 50, EK: -77, iunit: 'dens', amp: 10, delay: 20, dur: 150, tstop: 200, settle: 100 } },
    'hh-ttx': { group: 'Classic', label: 'HH with Na⁺ blocked (TTX)', note: 'g_Na = 0. The same stimulus now gives only a passive response plus a little K⁺ activation.',
      s: { ...CH0, on_hh_na: true, on_hh_k: true, g_hh_na: 0, temp: 6.3, gL: 0.3, EL: -54.387, ENa: 50, EK: -77, iunit: 'dens', amp: 10, delay: 20, dur: 150, tstop: 200, settle: 100 } },
    'hh-vclamp': { group: 'Classic', label: 'HH voltage clamp (I–V)', note: 'Step from −70 mV and watch the fast inward Na⁺ current, then the slow outward K⁺ current. The I–V tab sweeps the step.',
      s: { ...CH0, on_hh_na: true, on_hh_k: true, temp: 6.3, gL: 0.3, EL: -54.387, ENa: 50, EK: -77, iunit: 'dens', proto: 'vstep', vhold: -70, vcmd: 0, delay: 5, dur: 15, tstop: 25, settle: 100 } },
    'rs': { group: 'Cortex & hippocampus', label: 'Regular-spiking pyramidal (RS)', note: 'Pospischil et al. (2008) sPY cell: Traub Na⁺/K⁺ + M-current, 29 000 µm², at 36 °C. The M-current slows the firing during the step (adaptation).',
      s: { ...CH0, on_na: true, on_kdr: true, on_km: true, g_na: 50, g_kdr: 5, g_km: 0.07, km_taumax: 1000, gL: 0.1, EL: -70, EK: -100, VT: -55, area: 28953, amp: 0.75 } },
    'fs': { group: 'Cortex & hippocampus', label: 'Fast-spiking interneuron (FS)', note: 'Pospischil sIN cell: twice the K⁺ density, no M-current, 14 000 µm². Narrow spikes and little adaptation; compare the f–I curve with RS.',
      s: { ...CH0, on_na: true, on_kdr: true, g_na: 50, g_kdr: 10, gL: 0.15, EL: -70, EK: -100, VT: -55, area: 14103, amp: 0.5 } },
    'ib': { group: 'Cortex & hippocampus', label: 'Intrinsically bursting (IB)', note: 'Pospischil et al. (2008) IB demo (demo_PY_IB.hoc): L-type Ca²⁺ + M-current, low leak, E_Ca from the Nernst equation as in their code. An initial burst, then single spikes.',
      s: { ...CH0, on_na: true, on_kdr: true, on_km: true, on_cal: true, g_na: 50, g_kdr: 5, g_km: 0.03, g_cal: 0.17, gL: 0.01, EL: -85, EK: -100, VT: -55, area: 28953, camode: 'nernst', cao: 2, amp: 0.15, delay: 200, dur: 1200, tstop: 1600 } },
    'lts': { group: 'Cortex & hippocampus', label: 'Low-threshold spiking (LTS)', note: 'Pospischil et al. (2008) LTS demo (demo_PY_LTS.hoc): T-type Ca²⁺ (g_T = 0.4 mS/cm²), rest near −85 mV where I_T is de-inactivated, so a small depolarizing step starts with a low-threshold burst. E_Ca from the Nernst equation, as in their code.',
      s: { ...CH0, on_na: true, on_kdr: true, on_km: true, on_cat: true, g_na: 50, g_kdr: 5, g_km: 0.03, g_cat: 0.4, gL: 0.01, EL: -85, EK: -100, VT: -55, area: 28953, camode: 'nernst', cao: 2, amp: 0.15, delay: 200, dur: 400, tstop: 900 } },
    'ca1': { group: 'CA1', label: 'CA1-like pyramidal soma', note: 'Illustrative CA1-like mix (not fitted): Traub Na⁺/K⁺, M, A-type, Ih, L-type Ca²⁺ and a slow AHP. Hyperpolarize to see sag; depolarize to see adaptation. Compared with measured CA1 cells (Ephys battery tab) it is leakier and faster: input resistance ~57 vs 104 MΩ, time constant ~9 vs 28 ms, threshold ~−40 vs −46 mV. Fitting six published features moves those into range but breaks sag and the AHP, a live example of why one fit needs many features (Prinz et al. 2004; Druckmann et al. 2007).',
      s: { ...CH0, on_na: true, on_kdr: true, on_km: true, on_ka: true, on_h: true, on_cal: true, on_kahp: true, g_na: 50, g_kdr: 6, g_km: 0.05, g_ka: 0.3, g_h: 0.04, h_Vhalf: -80, g_cal: 0.05, g_kahp: 0.3, gL: 0.02, EL: -68, EK: -95, VT: -56, area: 20000, amp: 0.3, delay: 100, dur: 600, tstop: 900 } },
    'ca1-sag': { group: 'CA1', label: 'CA1: Ih sag & rebound', note: 'A −0.3 nA step. The early dip that relaxes back (sag) is Ih slowly turning on; the overshoot after the step is rebound depolarization.',
      s: { ...CH0, on_na: true, on_kdr: true, on_km: true, on_ka: true, on_h: true, g_na: 50, g_kdr: 6, g_km: 0.05, g_ka: 0.3, g_h: 0.04, h_Vhalf: -80, gL: 0.02, EL: -68, EK: -95, VT: -56, area: 20000, amp: -0.3, delay: 100, dur: 600, tstop: 1000 } },
    'ca1-res': { group: 'CA1', label: 'CA1: theta resonance (ZAP)', note: 'Subthreshold chirp, 0.2→20 Hz over 6 s. With Ih on, the voltage envelope peaks at a few Hz. Open the Impedance tab to measure f_R and Q, then switch Ih off.',
      s: { ...CH0, on_na: true, on_kdr: true, on_km: true, on_h: true, g_na: 50, g_kdr: 6, g_km: 0.05, g_h: 0.06, h_Vhalf: -80, gL: 0.02, EL: -68, EK: -95, VT: -56, area: 20000, proto: 'chirp', amp: 0.02, dc: 0, f0: 0.2, f1: 20, delay: 200, dur: 6000, tstop: 6400 } },
    'ca1-2c': { group: 'CA1', label: 'CA1: soma + dendrite with an Ih gradient', note: 'Two compartments (Pinsky–Rinzel coupling). The dendrite carries 6× the somatic Ih, as Magee (1998) measured distally. Inject at either site and compare local and transfer impedance.',
      s: { ...CH0, comp: 2, on_na: true, on_kdr: true, on_km: true, on_h: true, g_na: 50, g_kdr: 6, g_km: 0.06, g_h: 0.03, gd_h: 0.18, gd_na: 5, gd_kdr: 1, gL: 0.03, gLd: 0.03, EL: -68, EK: -95, VT: -56, area: 30000, p: 0.3, gc: 0.5, site: 'd', proto: 'chirp', amp: 0.02, f0: 0.2, f1: 20, delay: 200, dur: 6000, tstop: 6400 } },
    'ca1-noise': { group: 'CA1', label: 'In vivo-like synaptic bombardment', note: 'Point-conductance model (Destexhe et al. 2001): fluctuating excitatory and inhibitory conductances. Input resistance falls and firing becomes irregular.',
      s: { ...CH0, on_na: true, on_kdr: true, on_km: true, on_h: true, g_na: 50, g_kdr: 6, g_km: 0.06, g_h: 0.05, gL: 0.05, EL: -68, EK: -95, VT: -56, area: 38013, proto: 'pc', delay: 0, dur: 2000, tstop: 2000 } },
    'chan-noise': { group: 'Stochastic', label: 'Channel noise in a tiny patch', note: 'HH kinetics with Langevin channel noise in a 50 µm² patch (≈3 000 Na⁺ channels). Near threshold the patch fires spontaneously and irregularly; increase the area and the noise fades.',
      s: { ...CH0, on_hh_na: true, on_hh_k: true, temp: 6.3, gL: 0.3, EL: -54.387, ENa: 50, EK: -77, iunit: 'dens', area: 50, noise: true, amp: 5.5, delay: 20, dur: 480, tstop: 500, settle: 100 } },
    'lif': { group: 'Reduced', label: 'Leaky integrate-and-fire', note: 'One linear membrane plus a threshold and reset. The spike shape is not modeled at all: only its time.',
      s: { model: 'lif', amp: 0.3, iunit: 'nA', delay: 100, dur: 500, tstop: 700 } },
    'adex-tonic': { group: 'Reduced', label: 'AdEx: tonic', note: 'Naud et al. (2008) tonic parameters (C = 200 pF, g_L = 10 nS, a = 2 nS, τ_w = 30 ms, b = 0).', s: { model: 'adex', adex_C: 200, adex_gL: 10, adex_EL: -70, adex_VT: -50, adex_DT: 2, adex_a: 2, adex_tauw: 30, adex_b: 0, adex_Vr: -58, amp: 0.5, delay: 100, dur: 500, tstop: 700 } },
    'adex-adapt': { group: 'Reduced', label: 'AdEx: adapting', note: 'Naud et al. (2008) adapting: b = 60 pA and τ_w = 300 ms make each spike add lasting adaptation current.', s: { model: 'adex', adex_C: 200, adex_gL: 12, adex_EL: -70, adex_VT: -50, adex_DT: 2, adex_a: 2, adex_tauw: 300, adex_b: 60, adex_Vr: -58, amp: 0.5, delay: 100, dur: 500, tstop: 700 } },
    'adex-burst': { group: 'Reduced', label: 'AdEx: bursting', note: 'Naud et al. (2008) bursting: a high reset (−46 mV) close to threshold lets several spikes ride on each adaptation cycle.', s: { model: 'adex', adex_C: 200, adex_gL: 10, adex_EL: -58, adex_VT: -50, adex_DT: 2, adex_a: 2, adex_tauw: 120, adex_b: 100, adex_Vr: -46, amp: 0.21, delay: 100, dur: 800, tstop: 1000 } },
    'adex-res': { group: 'Reduced', label: 'AdEx: subthreshold resonance', note: 'With a > 0 the adaptation variable w acts like a slow restoring current, the reduced-model analogue of Ih/M. Open the Impedance tab.', s: { model: 'adex', adex_C: 200, adex_gL: 10, adex_EL: -70, adex_VT: -50, adex_DT: 2, adex_a: 30, adex_tauw: 100, adex_b: 0, adex_Vr: -58, proto: 'chirp', amp: 0.02, f0: 0.2, f1: 20, delay: 200, dur: 6000, tstop: 6400 } },
    'izh-rs': { group: 'Reduced', label: 'Izhikevich: regular spiking', note: 'a = 0.02, b = 0.2, c = −65, d = 8 (Izhikevich 2003). Current in the model’s own units.', s: { model: 'izh', izh_a: 0.02, izh_b: 0.2, izh_c: -65, izh_d: 8, iunit: 'au', amp: 10, delay: 50, dur: 400, tstop: 500 } },
    'izh-ib': { group: 'Reduced', label: 'Izhikevich: intrinsically bursting', note: 'c = −55, d = 4.', s: { model: 'izh', izh_a: 0.02, izh_b: 0.2, izh_c: -55, izh_d: 4, iunit: 'au', amp: 10, delay: 50, dur: 400, tstop: 500 } },
    'izh-ch': { group: 'Reduced', label: 'Izhikevich: chattering', note: 'c = −50, d = 2: fast rhythmic bursts.', s: { model: 'izh', izh_a: 0.02, izh_b: 0.2, izh_c: -50, izh_d: 2, iunit: 'au', amp: 10, delay: 50, dur: 400, tstop: 500 } },
    'izh-fs': { group: 'Reduced', label: 'Izhikevich: fast spiking', note: 'a = 0.1, d = 2.', s: { model: 'izh', izh_a: 0.1, izh_b: 0.2, izh_c: -65, izh_d: 2, iunit: 'au', amp: 10, delay: 50, dur: 400, tstop: 500 } },
    'izh-lts': { group: 'Reduced', label: 'Izhikevich: low-threshold spiking', note: 'b = 0.25, d = 2.', s: { model: 'izh', izh_a: 0.02, izh_b: 0.25, izh_c: -65, izh_d: 2, iunit: 'au', amp: 10, delay: 50, dur: 400, tstop: 500 } },
  };

  /* ---------- expression helpers (identical definitions are written into the Python export) ---------- */
  const EXP = x => x < -700 ? 0 : Math.exp(Math.min(x, 700));
  const VTRAP = (x, y) => Math.abs(x / y) < 1e-6 ? y * (1 - x / y / 2) : x / (EXP(x / y) - 1);
  const IFELSE = (c, a, b) => c ? a : b;
  /** Replace a channel's constant names (and VT) inside an expression. */
  function subst(expr, ch, S, py) {
    let e = expr;
    Object.keys(NCH[ch].consts || {}).forEach(k => { e = e.replace(new RegExp('\\b' + k + '\\b', 'g'), py ? (ch + '_' + k).toUpperCase() : '(' + (+S[ch + '_' + k]) + ')'); });
    e = e.replace(/\bVT\b/g, py ? 'VT' : '(' + (+S.VT) + ')');
    return e;
  }
  function compileGate(g, ch, S) {
    const body = g.a ? `const a=${subst(g.a, ch, S)}, b=${subst(g.b, ch, S)}; o[0]=a/(a+b); o[1]=1/(a+b);`
      : `o[0]=${subst(g.inf, ch, S)}; o[1]=${g.tau ? subst(g.tau, ch, S) : 0};`;
    return new Function('V', 'Ca', 'o', 'exp', 'vtrap', 'ifelse', '"use strict";' + body);
  }
  const phiOf = (ch, T) => (NCH[ch].q10 || 1) ** ((T - (NCH[ch].Tref ?? T)) / 10);
  const nernstCa = (T, cai, cao) => 1e3 * (8.314 * (T + 273.15)) / (2 * 96485.3) * Math.log(cao / Math.max(cai, 1e-9));

  /* ---------- stimulus ----------
     Returns next(t) → { I (model units: µA/cm² per compartment area, pA, or a.u.), gE, gI } and, in voltage clamp, vcmd(t). */
  function makeStim(S, rng) {
    const on = t => t >= S.delay && t < S.delay + S.dur, pr = S.proto;
    let ou = 0, ge = S.pc_ge, gi = S.pc_gi;
    return {
      I(t, dt) {
        let I = S.dc;
        if (pr === 'step') I += on(t) ? S.amp : 0;
        else if (pr === 'ramp') I += on(t) ? S.amp + (S.ramp1 - S.amp) * (t - S.delay) / S.dur : 0;
        else if (pr === 'pulses') { if (on(t)) { const per = 1000 / Math.max(S.freq, 1e-6), k = Math.floor((t - S.delay) / per); I += (k < S.npulse && (t - S.delay) - k * per < S.pw) ? S.amp : 0; } }
        else if (pr === 'sine') I += on(t) ? S.amp * Math.sin(2 * Math.PI * S.freq * (t - S.delay) / 1000) : 0;
        else if (pr === 'chirp') { if (on(t)) { const tt = (t - S.delay) / 1000, Tt = S.dur / 1000; I += S.amp * Math.sin(2 * Math.PI * (S.f0 * tt + (S.f1 - S.f0) * tt * tt / (2 * Tt))); } }
        else if (pr === 'ou') { ou += dt * (-ou / S.taun) + S.sigma * Math.sqrt(2 * dt / S.taun) * rng.normal(); I += on(t) ? S.amp + ou : 0; }
        return I;
      },
      /** Point-conductance OU processes (µS), exact update (Gillespie 1996), as in Destexhe et al. (2001). */
      G(t, dt) {
        if (pr !== 'pc') return null;
        const ee = Math.exp(-dt / S.pc_te), ei = Math.exp(-dt / S.pc_ti);
        ge = S.pc_ge + (ge - S.pc_ge) * ee + S.pc_se * Math.sqrt(1 - ee * ee) * rng.normal();
        gi = S.pc_gi + (gi - S.pc_gi) * ei + S.pc_si * Math.sqrt(1 - ei * ei) * rng.normal();
        return on(t) ? [Math.max(ge, 0), Math.max(gi, 0)] : [0, 0];
      },
      vcmd: t => on(t) ? S.vcmd : S.vhold,
    };
  }

  /* Lookup tables for voltage-only gates (as NEURON's TABLE): x∞, τ/φ and the Rush–Larsen factor exp(−dt·φ/τ)
     on a 0.02 mV grid, linearly interpolated. Gates that depend on [Ca] are evaluated directly. */
  const TV0 = -160, TV1 = 120, TDV = 0.02, TN = Math.round((TV1 - TV0) / TDV) + 1;
  function tabulate(f, phi, dt, inst) {
    const inf = new Float64Array(TN), tau = new Float64Array(TN), ef = new Float64Array(TN), o = [0, 0];
    for (let i = 0; i < TN; i++) { f(TV0 + i * TDV, 0, o, EXP, VTRAP, IFELSE); inf[i] = o[0]; const tt = inst || !(o[1] > 0) ? 0 : o[1] / phi; tau[i] = tt; ef[i] = tt > 0 ? Math.exp(-dt / tt) : 0; }
    return { inf, tau, ef };
  }
  /* ---------- conductance-based engine ---------- */
  function buildCond(S) {
    const comps = S.comp === 2 ? 2 : 1, frac = comps === 2 ? [S.p, 1 - S.p] : [1];
    const inst = [];
    for (let c = 0; c < comps; c++) {
      const list = [];
      CH_ORDER.forEach(ch => {
        if (!S['on_' + ch]) return;
        const g = c === 0 ? +S['g_' + ch] : +S['gd_' + ch]; if (!(g > 0)) return;
        const areaC = S.area * frac[c], nCh = g * areaC * 10 / (NCH[ch].gamma || 20);   // channels = g·area / γ
        const phi = phiOf(ch, S.temp);
        list.push({ ch, g, ion: NCH[ch].ion, E: NCH[ch].E, phi, nCh, gates: NCH[ch].gates.map(gt => { const f = compileGate(gt, ch, S), inst = !gt.a && !gt.tau, usesCa = /\bCa\b/.test((gt.inf || '') + (gt.tau || '') + (gt.a || '') + (gt.b || ''));
          return { n: gt.n, p: gt.p, f, inst, tab: usesCa ? null : tabulate(f, phi, S.dt, inst) }; }) });
      });
      inst.push(list);
    }
    const hasCa = inst.some(l => l.some(x => x.ion === 'Ca' || x.ch === 'kahp'));
    return { comps, frac, inst, hasCa };
  }
  function simCond(S, opt = {}) {
    const M = buildCond(S), dt = S.dt, rng = WB.rng(S.seed), nrng = WB.rng(S.nseed + 1000), st = makeStim(S, rng);
    const vc = S.proto === 'vstep', tstop = opt.tstop || S.tstop, nSteps = Math.round(tstop / dt);
    const rec = opt.rec || Math.max(1, Math.round(nSteps / 6000)), nRec = Math.floor(nSteps / rec) + 1;
    const scaleI = c => S.iunit === 'nA' ? 1e5 / (S.area * M.frac[c]) : 1;            // nA → µA/cm² for compartment c
    const toOut = c => S.iunit === 'nA' ? S.area * M.frac[c] * 1e-5 : 1;              // µA/cm² → output unit
    const o = [0, 0], V = new Float64Array(M.comps).fill(S.vhold && vc ? S.vhold : S.EL), Ca = new Float64Array(M.comps).fill(S.ca_inf);
    const gate = M.inst.map(l => l.map(x => x.gates.map(() => 0)));
    const initGates = () => M.inst.forEach((l, c) => l.forEach((x, i) => x.gates.forEach((g, j) => { g.f(V[c], Ca[c], o, EXP, VTRAP, IFELSE); gate[c][i][j] = o[0]; })));
    initGates();
    const kCa = 1e4 / (2 * 96485.3 * S.ca_depth) * 1e-3;     // (µA/cm²) → mM/ms for a shell of depth µm
    const out = { t: new Float64Array(nRec), V: new Float64Array(nRec), Vd: M.comps === 2 ? new Float64Array(nRec) : null, I: new Float64Array(nRec), Ca: M.hasCa ? new Float64Array(nRec) : null, cur: {}, gates: {}, spikes: [], spikesD: [], vc, M };
    if (opt.full !== false) M.inst[0].forEach(x => { out.cur[x.ch] = new Float64Array(nRec); x.gates.forEach(g => out.gates[x.ch + '.' + g.n] = new Float64Array(nRec)); });
    if (opt.full !== false) out.cur.leak = new Float64Array(nRec);
    const total = (opt.settle ?? S.settle) > 0 && !vc ? Math.round((opt.settle ?? S.settle) / dt) : 0;
    const Iion = new Float64Array(M.comps), ICa = new Float64Array(M.comps), Vold = new Float64Array(M.comps), Gtot = new Float64Array(M.comps);
    const euler = S.method === 'euler', injC = M.comps === 2 && S.site === 'd' ? 1 : 0, sI = [scaleI(0), M.comps === 2 ? scaleI(1) : 0], out0 = toOut(0);
    const flat = M.inst.map((l, c) => l.map((x, i) => ({ x, gs: gate[c][i], Ek: x.E, isCa: x.ion === 'Ca', np: x.gates.map(g => g.p) })));
    let r = 0;
    for (let k = -total; k <= nSteps; k++) {
      const t = k * dt, settling = k < 0;
      const Iinj = settling ? 0 : st.I(t, dt), G = settling ? null : st.G(t, dt);
      const recNow = !settling && k % rec === 0, full = opt.full !== false;
      /* gates first (staggered scheme, as in NEURON): advance every gate from t − dt/2 to t + dt/2 with V(t) held fixed,
         by Rush–Larsen exponential Euler (exact for frozen V) or forward Euler; optional Langevin channel noise.
         The voltage update below then uses these mid-step gates, which makes the scheme second-order accurate in dt. */
      for (let c = 0; c < M.comps; c++) {
        const v = V[c], L = flat[c], cc = Ca[c];
        for (let i = 0; i < L.length; i++) {
          const F = L[i], x = F.x, gs = F.gs;
          for (let j = 0; j < gs.length; j++) {
            const g = x.gates[j]; let inf, tau, ef;
            if (g.tab) {
              let u = (v - TV0) / TDV; if (u < 0) u = 0; else if (u > TN - 1.001) u = TN - 1.001; const i0 = u | 0, w = u - i0, T = g.tab;
              inf = T.inf[i0] + w * (T.inf[i0 + 1] - T.inf[i0]); tau = T.tau[i0] + w * (T.tau[i0 + 1] - T.tau[i0]); ef = T.ef[i0] + w * (T.ef[i0 + 1] - T.ef[i0]);
            } else { g.f(v, cc, o, EXP, VTRAP, IFELSE); inf = o[0]; tau = g.inst || !(o[1] > 0) ? 0 : o[1] / x.phi; ef = tau > 0 ? Math.exp(-dt / tau) : 0; }
            if (!(tau > 0)) { gs[j] = inf; continue; }
            let xn = euler ? gs[j] + dt * (inf - gs[j]) / tau : inf + (gs[j] - inf) * ef;
            if (S.noise && x.nCh < 1e8) { const a = inf / tau, b = (1 - inf) / tau, vv = (a * (1 - gs[j]) + b * gs[j]) / x.nCh; xn += Math.sqrt(Math.max(vv, 0) * dt) * nrng.normal(); }
            gs[j] = xn < 0 ? 0 : xn > 1 ? 1 : xn;
          }
        }
        if (M.hasCa) { const drive = Math.max(0, -kCa * ICa[c]); Ca[c] += dt * (drive + (S.ca_inf - Ca[c]) / S.ca_tau); if (Ca[c] < 1e-9) Ca[c] = 1e-9; }
      }
      for (let c = 0; c < M.comps; c++) {
        const v = V[c]; let I = (c === 0 ? S.gL : S.gLd) * (v - S.EL), ica = 0, Gt = c === 0 ? S.gL : S.gLd;
        const rc = recNow && c === 0 && full;
        if (rc) out.cur.leak[r] = I * out0;
        const ECa = S.camode === 'nernst' ? nernstCa(S.temp, Ca[c], S.cao) : S.ECa, L = flat[c];
        for (let i = 0; i < L.length; i++) {
          const F = L[i], gs = F.gs; let gp = F.x.g;
          for (let j = 0; j < gs.length; j++) { const xv = gs[j]; let pw = xv; for (let q = 1; q < F.np[j]; q++) pw *= xv; gp *= pw; }
          const cur = gp * (v - (F.Ek === 'ECa' ? ECa : S[F.Ek])); I += cur; Gt += gp; if (F.isCa) ica += cur;
          if (rc) { out.cur[F.x.ch][r] = cur * out0; for (let j = 0; j < gs.length; j++) out.gates[F.x.ch + '.' + F.x.gates[j].n][r] = gs[j]; }
        }
        if (G && c === injC) { const f = 1e5 / (S.area * M.frac[c]); I += G[0] * f * (v - S.pc_Ee) + G[1] * f * (v - S.pc_Ei); Gt += (G[0] + G[1]) * f; }
        Iion[c] = I; ICa[c] = ica; Gtot[c] = Gt;
      }
      if (recNow) {
        out.t[r] = t; out.V[r] = V[0]; if (out.Vd) out.Vd[r] = V[1]; if (out.Ca) out.Ca[r] = Ca[0];
        out.I[r] = vc ? (Iion[0] - (M.comps === 2 ? S.gc / M.frac[0] * (V[1] - V[0]) : 0)) * out0 : Iinj;
        r++;
      }
      /* voltage update. Exponential Euler (default): with every conductance, the other compartment and the input frozen over dt,
         C dV/dt = J(v) − G·(V − v) is linear, so V relaxes exactly toward V∞ = v + J/G with time constant C/G. Much more accurate
         than forward Euler on the stiff spike upstroke at the same dt. Forward Euler is kept for comparison. The clamp overrides the soma. */
      for (let c = 0; c < M.comps; c++) Vold[c] = V[c];
      for (let c = 0; c < M.comps; c++) {
        let J = -Iion[c], Gc = Gtot[c];
        if (M.comps === 2) { J += S.gc / M.frac[c] * (Vold[1 - c] - Vold[c]); Gc += S.gc / M.frac[c]; }
        if (c === injC && !vc) J += Iinj * sI[c];
        V[c] = euler || !(Gc > 0) ? Vold[c] + dt * J / S.Cm : Vold[c] + (J / Gc) * (1 - Math.exp(-dt * Gc / S.Cm));
      }
      if (vc) V[0] = settling ? S.vhold : st.vcmd(t + dt);
      // spike detection (not under voltage clamp)
      if (!settling && !vc && Vold[0] < 0 && V[0] >= 0) out.spikes.push(t);
      if (!settling && M.comps === 2 && Vold[1] < 0 && V[1] >= 0) out.spikesD.push(t);
      if (!isFinite(V[0])) { out.blowup = t; break; }
    }
    out.n = r; trim(out);
    out.Iunit = vc ? (S.iunit === 'nA' ? 'nA' : 'µA/cm²') : unitOf(S);
    return out;
  }
  function trim(out) { const n = out.n; ['t', 'V', 'Vd', 'I', 'Ca'].forEach(k => { if (out[k]) out[k] = out[k].subarray(0, n); }); Object.keys(out.cur).forEach(k => out.cur[k] = out.cur[k].subarray(0, n)); Object.keys(out.gates).forEach(k => out.gates[k] = out.gates[k].subarray(0, n)); }
  const unitOf = S => S.model === 'izh' ? 'a.u.' : S.model === 'cond' && S.iunit === 'dens' ? 'µA/cm²' : 'nA';

  /* ---------- point models ---------- */
  function simPoint(S, opt = {}) {
    const dt = S.dt, rng = WB.rng(S.seed), st = makeStim(S, rng), tstop = opt.tstop || S.tstop, nSteps = Math.round(tstop / dt);
    const rec = opt.rec || Math.max(1, Math.round(nSteps / 6000)), nRec = Math.floor(nSteps / rec) + 1;
    const m = S.model, out = { t: new Float64Array(nRec), V: new Float64Array(nRec), I: new Float64Array(nRec), w: new Float64Array(nRec), cur: {}, gates: {}, spikes: [] };
    let V, w = 0, ref = 0;
    if (m === 'lif') V = S.lif_EL; else if (m === 'adex') V = S.adex_EL; else { V = S.izh_c; w = S.izh_b * V; }
    let r = 0;
    for (let k = 0; k <= nSteps; k++) {
      const t = k * dt, I0 = st.I(t, dt), G = st.G(t, dt);
      if (k % rec === 0) { out.t[r] = t; out.V[r] = V; out.I[r] = I0; out.w[r] = w; r++; }
      /* Integration: LIF uses the exact exponential update for input frozen over dt; AdEx and Izhikevich use Heun's method
         (second order). A threshold crossing is timed by linear interpolation inside the step instead of at its start. */
      const cross = (v0, v1, th) => t + dt * Math.min(1, Math.max(0, (th - v0) / ((v1 - v0) || 1e-12)));
      if (m === 'izh') {
        const fv = (v, u) => 0.04 * v * v + 5 * v + 140 - u + I0, fu = (v, u) => S.izh_a * (S.izh_b * v - u);
        const k1v = fv(V, w), k1u = fu(V, w), vp = V + dt * k1v, up = w + dt * k1u;
        const vn = Math.min(V + dt / 2 * (k1v + fv(Math.min(vp, 30), up)), 1e3), un = w + dt / 2 * (k1u + fu(Math.min(vp, 30), up));
        if (vn >= 30) { if (k % rec !== 0 && r > 0) out.V[r - 1] = 30; out.spikes.push(cross(V, vn, 30)); V = S.izh_c; w = un + S.izh_d; }
        else { V = vn; w = un; }
        continue;
      }
      const C = m === 'lif' ? S.lif_C : S.adex_C, gL = m === 'lif' ? S.lif_gL : S.adex_gL, EL = m === 'lif' ? S.lif_EL : S.adex_EL;
      let Ip = I0 * 1000;                                     // nA → pA
      let gS = 0;
      if (G) { Ip -= G[0] * 1000 * (V - S.pc_Ee) + G[1] * 1000 * (V - S.pc_Ei); gS = (G[0] + G[1]) * 1000; }   // µS → nS; nS·mV = pA
      if (ref > 0) { ref -= dt; if (m === 'lif') { V = S.lif_Vr; w *= Math.exp(-dt / S.lif_tauw); } else { w += dt * (S.adex_a * (V - EL) - w) / S.adex_tauw; } continue; }
      if (m === 'lif') {
        const g = gL + gS, Vinf = (gL * EL + gS * V + Ip - w) / g, vn = Vinf + (V - Vinf) * Math.exp(-dt * g / C);   // exact for frozen input
        w *= Math.exp(-dt / S.lif_tauw);
        if (vn >= S.lif_Vth) { if (r > 0) out.V[r - 1] = Math.max(out.V[r - 1], 20); out.spikes.push(cross(V, vn, S.lif_Vth)); V = S.lif_Vr; w += S.lif_b; ref = S.lif_tref; }
        else V = vn;
      } else {
        const f = (v, ww) => (-gL * (v - EL) + gL * S.adex_DT * Math.exp(Math.min((v - S.adex_VT) / S.adex_DT, 30)) - ww + Ip) / C, fw = (v, ww) => (S.adex_a * (v - EL) - ww) / S.adex_tauw;
        const k1v = f(V, w), k1w = fw(V, w), vp = Math.min(V + dt * k1v, S.adex_Vpk), wp = w + dt * k1w;
        const vn = V + dt / 2 * (k1v + f(vp, wp)), wn = w + dt / 2 * (k1w + fw(vp, wp));
        if (vn >= S.adex_Vpk) { if (r > 0) out.V[r - 1] = S.adex_Vpk; out.spikes.push(cross(V, vn, S.adex_Vpk)); V = S.adex_Vr; w = wn + S.adex_b; }
        else { V = vn; w = wn; }
      }
    }
    out.n = r; ['t', 'V', 'I', 'w'].forEach(k => out[k] = out[k].subarray(0, r)); out.Iunit = unitOf(S);
    return out;
  }
  const simulate = (S, opt) => S.model === 'cond' ? simCond(S, opt) : simPoint(S, opt);

  /* ---------- analyses ---------- */
  /** f–I curve: rate over the whole step and the initial rate (1/first ISI). */
  function fiPoint(S, amp) {
    const s2 = { ...S, proto: 'step', amp, dc: 0, delay: 50, dur: 1000, tstop: 1050, noise: S.noise };
    const r = simulate(s2, { full: false, rec: 1e9 }), sp = r.spikes.filter(t => t >= 50);
    return { amp, rate: sp.length / 1.0, init: sp.length > 1 ? 1000 / (sp[1] - sp[0]) : 0, n: sp.length };
  }
  /** Impedance from a ZAP chirp. Exact DFT at the record's own frequency bins (no leakage), after removing a linear
      trend, then cross-spectral averaging inside log-spaced bands: Z = Σ V̂·Î* / Σ |Î|². Resonance frequency f_R is
      the peak of |Z|; Q = |Z(f_R)| / |Z(0.5 Hz)| as in Hu, Vervaeke & Storm (2002). */
  function impedance(S, site) {
    const u = unitOf(S), small = u === 'nA' ? 0.2 : u === 'a.u.' ? 2 : 2;
    const amp = S.proto === 'chirp' && S.amp && Math.abs(S.amp) <= small ? S.amp : (u === 'a.u.' ? 0.5 : u === 'nA' ? 0.02 : 0.3);
    const dur = Math.max(S.proto === 'chirp' ? S.dur : 0, 6000), f0 = Math.min(S.proto === 'chirp' ? S.f0 : 0.2, 0.2), f1 = S.proto === 'chirp' ? Math.max(S.f1, 5) : 20;
    const s2 = { ...S, proto: 'chirp', amp, f0, f1, delay: 300, dur, tstop: 300 + dur, site: site || S.site, noise: false };
    const r = simulate(s2, { full: false, rec: Math.max(1, Math.round(1 / S.dt)) });
    const i0 = r.t.findIndex(t => t >= s2.delay), dtr = r.t[1] - r.t[0];
    const detr = a => { const x = Array.from(a.subarray(i0)), n = x.length; let sx = 0, sy = 0, sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sx += i; sy += x[i]; sxy += i * x[i]; sxx += i * i; }
      const bb = (n * sxy - sx * sy) / (n * sxx - sx * sx), aa = (sy - bb * sx) / n; return x.map((v, i) => v - aa - bb * i); };
    const I = detr(r.I), Vs = detr(r.V), Vd = r.Vd ? detr(r.Vd) : null, N = I.length, Tsec = N * dtr / 1000;
    const dftAt = (x, f) => {   // phasor rotation instead of cos/sin per sample (renormalized every 1024 samples)
      const w = 2 * Math.PI * f * dtr / 1000, cw = Math.cos(w), sw = Math.sin(w); let c = 1, sn = 0, re = 0, im = 0;
      for (let k = 0; k < N; k++) { re += x[k] * c; im -= x[k] * sn; const c2 = c * cw - sn * sw; sn = sn * cw + c * sw; c = c2; if ((k & 1023) === 1023) { const m = Math.hypot(c, sn); c /= m; sn /= m; } }
      return [re, im]; };
    const fLo = Math.max(0.5, f0 * 2), fHi = Math.min(f1 * 0.92, 500 / dtr / 2), edges = WB.logspace(fLo, fHi, 37);
    const res = [];
    for (let b = 0; b < edges.length - 1; b++) {
      let pii = 0, cr = 0, ci = 0, dr = 0, di = 0, nb = 0;
      const k0 = Math.ceil(edges[b] * Tsec), k1 = Math.max(k0, Math.floor(edges[b + 1] * Tsec));
      for (let k = k0; k <= k1; k++) {
        const f = k / Tsec, A = dftAt(I, f), B = dftAt(Vs, f); pii += A[0] * A[0] + A[1] * A[1]; cr += B[0] * A[0] + B[1] * A[1]; ci += B[1] * A[0] - B[0] * A[1]; nb++;
        if (Vd) { const D = dftAt(Vd, f); dr += D[0] * A[0] + D[1] * A[1]; di += D[1] * A[0] - D[0] * A[1]; }
      }
      if (!nb || !(pii > 0)) continue;
      const fc = Math.sqrt(edges[b] * edges[b + 1]);
      res.push({ f: fc, mag: Math.hypot(cr, ci) / pii, ph: Math.atan2(ci, cr) * 180 / Math.PI, magD: Vd ? Math.hypot(dr, di) / pii : null, phD: Vd ? Math.atan2(di, dr) * 180 / Math.PI : null });
    }
    /* f_R and Q are reported for the INPUT (local) impedance at the injection site: soma voltage for somatic input,
       dendritic voltage for dendritic input. */
    const loc = Vd && s2.site === 'd' ? 'magD' : 'mag';
    let k = 0; res.forEach((x, i) => { if (x[loc] > res[k][loc]) k = i; });
    /* The bands are ~10% apart, so the band centre alone would quantize f_R. Fit a parabola through the peak band and its
       neighbours on a log-frequency axis (the bands are evenly spaced there) and take its vertex. */
    let fR = res[k].f, zmax = res[k][loc];
    if (k > 0 && k < res.length - 1) {
      const y0 = res[k - 1][loc], y1 = res[k][loc], y2 = res[k + 1][loc], den = y0 - 2 * y1 + y2;
      if (den < 0) { const d = Math.max(-0.5, Math.min(0.5, 0.5 * (y0 - y2) / den)), l0 = Math.log(res[k - 1].f), l1 = Math.log(res[k].f), l2 = Math.log(res[k + 1].f);
        fR = Math.exp(l1 + d * (d > 0 ? l2 - l1 : l1 - l0)); zmax = y1 - 0.25 * (y0 - y2) * d; }
    }
    /* |Z(0.5 Hz)|, the reference for Q (Hu et al. 2002). A 6 s chirp gives only a cycle or two near 0.5 Hz, which biases
       it upward, so measure it directly: a steady 0.5 Hz sine, one cycle discarded, the DFT taken over four whole cycles. */
    const s3 = { ...s2, proto: 'sine', freq: 0.5, delay: 300, dur: 10000, tstop: 10300 };
    const r3 = simulate(s3, { full: false, rec: Math.max(1, Math.round(1 / S.dt)) }), dt3 = r3.t[1] - r3.t[0];
    const a3 = r3.t.findIndex(t => t >= s3.delay + 2000), n3 = Math.round(8000 / dt3);
    const at05 = x => { let m = 0; for (let i = 0; i < n3; i++) m += x[a3 + i]; m /= n3; let re = 0, im = 0; const w = 2 * Math.PI * 0.5 * dt3 / 1000;
      for (let i = 0; i < n3; i++) { const v = x[a3 + i] - m; re += v * Math.cos(w * i); im -= v * Math.sin(w * i); } return Math.hypot(re, im); };
    const z05 = at05(loc === 'magD' ? r3.Vd : r3.V) / at05(r3.I);
    return { res, fR, Q: zmax / z05, zmax, z05, spikes: r.spikes.length + r3.spikes.length, amp, Zunit: u === 'a.u.' ? 'a.u.' : u === 'µA/cm²' ? 'kΩ·cm²' : 'MΩ', comps: r.Vd ? 2 : 1, site: s2.site };
  }
  /** Voltage-clamp I–V: peak inward/outward and steady-state current for each command step. */
  function ivCurve(S, vs) {
    return vs.map(v => {
      const r = simCond({ ...S, proto: 'vstep', vcmd: v, delay: 5, dur: Math.max(S.dur, 20), tstop: 5 + Math.max(S.dur, 20) + 2 }, { full: false, rec: 1 });
      const i0 = r.t.findIndex(t => t >= 5.1), i1 = r.t.findIndex(t => t >= 5 + Math.max(S.dur, 20) - 0.1);
      let mn = Infinity, mx = -Infinity; for (let i = i0; i < i1; i++) { if (r.I[i] < mn) mn = r.I[i]; if (r.I[i] > mx) mx = r.I[i]; }
      return { v, peakIn: Math.min(mn, 0), peakOut: Math.max(mx, 0), ss: r.I[i1 - 1] };
    });
  }
  /** Spike-shape features of a trace (threshold = first dV/dt > 20 mV/ms before each peak). */
  function spikeFeatures(r) {
    const t = r.t, V = r.V, dt = t[1] - t[0], f = [];
    r.spikes.slice(0, 50).forEach(ts => {
      const i = Math.round((ts - t[0]) / dt); let pk = i; while (pk + 1 < V.length && V[pk + 1] > V[pk]) pk++;
      let th = Math.min(i, pk); while (th > 1 && (V[th] - V[th - 1]) / dt > 20) th--;
      const half = (V[pk] + V[th]) / 2; let a = th; while (a < pk && V[a] < half) a++; let b = pk; while (b + 1 < V.length && V[b] > half) b++;
      let ahp = b; const lim = Math.min(V.length - 1, b + Math.round(50 / dt)); let mn = V[b]; for (let q = b; q < lim; q++) if (V[q] < mn) { mn = V[q]; ahp = q; }
      f.push({ t: ts, thr: V[th], peak: V[pk], width: (b - a) * dt, ahp: V[th] - mn });
    });
    return f;
  }
  /** A standard electrophysiology battery, as reported in patch-clamp papers and the Allen Cell Types database. */
  function battery(S, progress, done) {
    if (S.proto === 'vstep') S = { ...S, proto: 'step' };
    const u = unitOf(S), small = u === 'nA' ? -0.05 : u === 'a.u.' ? -2 : -0.5, big = u === 'nA' ? -0.3 : u === 'a.u.' ? -10 : -3;
    const base = { ...S, proto: 'step', dc: 0, delay: 100, dur: 800, tstop: 1100, noise: false };
    const steps = [];
    steps.push(() => { const r = simulate({ ...base, amp: small }, { full: false }); const i0 = r.t.findIndex(t => t >= 99), i1 = r.t.findIndex(t => t >= 895);
      const v0 = r.V[i0], v1 = r.V[i1], dv = v1 - v0, tgt = v0 + 0.632 * dv; let k = i0; while (k < i1 && (dv < 0 ? r.V[k] > tgt : r.V[k] < tgt)) k++;
      return { Vrest: v0, Rin: dv / small, tau: r.t[k] - 100 }; });
    steps.push(() => { const r = simulate({ ...base, amp: big }, { full: false }); const i0 = r.t.findIndex(t => t >= 99), i1 = r.t.findIndex(t => t >= 895);
      let mn = Infinity; for (let i = i0; i < i1; i++) mn = Math.min(mn, r.V[i]); const ss = r.V[i1], v0 = r.V[i0];
      const after = r.V.subarray(r.t.findIndex(t => t >= 900)); let mx = -Infinity; after.forEach(v => mx = Math.max(mx, v));
      return { sag: (ss - mn) / (v0 - mn || 1), rebound: mx - v0, reboundSpikes: r.spikes.filter(t => t > 900).length }; });
    steps.push(() => { // rheobase by bisection on a 1 s step
      let lo = 0, hi = u === 'nA' ? 0.05 : u === 'a.u.' ? 1 : 0.5, n = 0;
      const fires = a => simulate({ ...base, amp: a, dur: 1000, tstop: 1200 }, { full: false, rec: 1e9 }).spikes.length > 0;
      while (!fires(hi) && n < 12) { lo = hi; hi *= 2; n++; }
      if (n >= 12) return { rheo: NaN };
      for (let q = 0; q < 12; q++) { const m = (lo + hi) / 2; if (fires(m)) hi = m; else lo = m; }
      return { rheo: hi }; });
    WB.chunked(steps, f => f(), progress, parts => {
      const R = Object.assign({}, ...parts);
      if (isFinite(R.rheo)) {
        const r = simulate({ ...base, amp: R.rheo * 1.5, dur: 1000, tstop: 1200 }, { full: true, rec: 1 }), sp = r.spikes, isi = sp.slice(1).map((t, i) => t - sp[i]);
        R.rate15 = sp.length; R.latency = sp.length ? sp[0] - 100 : NaN;
        R.adapt = isi.length > 2 ? WB.mean(isi.slice(1).map((d, i) => (d - isi[i]) / (d + isi[i]))) : NaN;
        R.cv = isi.length > 2 ? WB.std(isi) / WB.mean(isi) : NaN;
        if (S.model === 'cond') { const f = spikeFeatures(r); if (f.length) { R.thr = f[0].thr; R.peak = f[0].peak; R.width = f[0].width; R.ahp = f[0].ahp; } }
      }
      R.unit = u; done(R);
    });
  }

  /* ---------- Python export ---------- */
  const pyNum = v => { const x = +v; return Number.isInteger(x) ? x.toFixed(1) : String(+x.toPrecision(8)); };
  function pyExpr(e) { return e.replace(/(\d)\.(?!\d)/g, '$1.0'); }
  function pyStim(S) {
    const lines = [`PROTOCOL = '${S.proto}'`, `AMP, DC, DELAY, DUR, TSTOP = ${pyNum(S.amp)}, ${pyNum(S.dc)}, ${pyNum(S.delay)}, ${pyNum(S.dur)}, ${pyNum(S.tstop)}   # ${unitOf(S)}, ms`];
    if (S.proto === 'ramp') lines.push(`RAMP_END = ${pyNum(S.ramp1)}`);
    if (S.proto === 'pulses') lines.push(`FREQ, NPULSE, PULSE_WIDTH = ${pyNum(S.freq)}, ${S.npulse}, ${pyNum(S.pw)}   # Hz, count, ms`);
    if (S.proto === 'sine') lines.push(`FREQ = ${pyNum(S.freq)}   # Hz`);
    if (S.proto === 'chirp') lines.push(`F0, F1 = ${pyNum(S.f0)}, ${pyNum(S.f1)}   # Hz, linear chirp (ZAP)`);
    if (S.proto === 'ou') lines.push(`SIGMA, TAU_NOISE = ${pyNum(S.sigma)}, ${pyNum(S.taun)}   # OU current noise`);
    if (S.proto === 'pc') lines.push(`GE0, GI0, SE, SI, TAU_E, TAU_I = ${[S.pc_ge, S.pc_gi, S.pc_se, S.pc_si, S.pc_te, S.pc_ti].map(pyNum).join(', ')}   # µS, ms (Destexhe et al. 2001)`, `E_E, E_I = ${pyNum(S.pc_Ee)}, ${pyNum(S.pc_Ei)}`);
    if (S.proto === 'vstep') lines.push(`V_HOLD, V_CMD = ${pyNum(S.vhold)}, ${pyNum(S.vcmd)}   # mV, ideal voltage clamp`);
    lines.push(`rng = np.random.default_rng(${S.seed})`, '', 'def stimulus(t, dt, s):', '    """Injected current at time t; s holds any noise state."""', '    on = DELAY <= t < DELAY + DUR', '    I = DC');
    const P = {
      step: '    if on: I += AMP', ramp: '    if on: I += AMP + (RAMP_END - AMP) * (t - DELAY) / DUR',
      pulses: '    if on:\n        per = 1000.0 / FREQ; k = int((t - DELAY) // per)\n        if k < NPULSE and (t - DELAY) - k * per < PULSE_WIDTH: I += AMP',
      sine: '    if on: I += AMP * np.sin(2 * np.pi * FREQ * (t - DELAY) / 1000)',
      chirp: '    if on:\n        tt, T = (t - DELAY) / 1000, DUR / 1000\n        I += AMP * np.sin(2 * np.pi * (F0 * tt + (F1 - F0) * tt * tt / (2 * T)))',
      ou: "    s['ou'] += dt * (-s['ou'] / TAU_NOISE) + SIGMA * np.sqrt(2 * dt / TAU_NOISE) * rng.standard_normal()\n    if on: I += AMP + s['ou']",
      pc: '', vstep: '',
    };
    if (P[S.proto]) lines.push(P[S.proto]);
    lines.push('    return I');
    if (S.proto === 'pc') lines.push('', 'def conductances(t, dt, s):', '    """Exact OU update of g_e, g_i (µS)."""', "    ee, ei = np.exp(-dt / TAU_E), np.exp(-dt / TAU_I)",
      "    s['ge'] = GE0 + (s['ge'] - GE0) * ee + SE * np.sqrt(1 - ee * ee) * rng.standard_normal()", "    s['gi'] = GI0 + (s['gi'] - GI0) * ei + SI * np.sqrt(1 - ei * ei) * rng.standard_normal()",
      "    on = DELAY <= t < DELAY + DUR", "    return (max(s['ge'], 0.0), max(s['gi'], 0.0)) if on else (0.0, 0.0)");
    return lines.join('\n');
  }
  function pythonCode(S) {
    const head = `"""Exported from the Little Neural Guide · Neuron workbench.
Re-runs the model and protocol you set up on the page. Pure NumPy, so it runs in the
browser (▶ Run here), Colab, or locally. ${S.noise || ['ou', 'pc'].includes(S.proto) ? '\nRandom numbers come from NumPy, so noisy traces differ in detail from the page.' : ''}"""
import math
import numpy as np
import matplotlib.pyplot as plt
`;
    if (S.model !== 'cond') return head + pythonPoint(S);
    const M = buildCond(S), used = [...new Set(M.inst.flat().map(x => x.ch))];
    const L = [head, '# ---------- membrane, reversal potentials, geometry ----------',
      `T_CELSIUS = ${pyNum(S.temp)}`, `CM = ${pyNum(S.Cm)}            # µF/cm²`, `G_LEAK, G_LEAK_D, E_LEAK = ${pyNum(S.gL)}, ${pyNum(S.gLd)}, ${pyNum(S.EL)}   # mS/cm², mV`,
      `E_NA, E_K, E_H, E_CA = ${pyNum(S.ENa)}, ${pyNum(S.EK)}, ${pyNum(S.Eh)}, ${pyNum(S.ECa)}   # mV${S.camode === 'nernst' ? ' (E_CA replaced by the Nernst value below)' : ''}`,
      `VT = ${pyNum(S.VT)}               # mV, Traub threshold shift`, `AREA = ${pyNum(S.area)}          # µm² (total)`,
      `N_COMP = ${M.comps}${M.comps === 2 ? `\nP_SOMA, G_C = ${pyNum(S.p)}, ${pyNum(S.gc)}   # soma area fraction, coupling mS/cm² (Pinsky & Rinzel 1994)\nINJECT_AT = ${S.site === 'd' ? 1 : 0}          # 0 soma, 1 dendrite` : ''}`,
      `I_UNIT = '${S.iunit === 'dens' ? 'density' : 'nA'}'`, `CA_TAU, CA_DEPTH, CA_INF, CA_OUT = ${pyNum(S.ca_tau)}, ${pyNum(S.ca_depth)}, ${pyNum(S.ca_inf)}, ${pyNum(S.cao)}   # ms, µm, mM, mM`,
      `NERNST_CA = ${S.camode === 'nernst' ? 'True' : 'False'}`, `CHANNEL_NOISE = ${S.noise ? 'True' : 'False'}`, `DT, METHOD = ${pyNum(S.dt)}, '${S.method}'`, `SETTLE = ${pyNum(S.settle)}   # ms run without input first, then discarded`, '',
      '# ---------- helper functions used inside the rate expressions ----------',
      'def exp(x): return 0.0 if x < -700 else math.exp(min(x, 700.0))',
      'def vtrap(x, y): return y * (1 - x / y / 2) if abs(x / y) < 1e-6 else x / (exp(x / y) - 1)',
      'def ifelse(c, a, b): return a if c else b', '', '# ---------- channel kinetics: each gate returns (x_inf, tau_ms) at 1x speed ----------'];
    used.forEach(ch => {
      Object.keys(NCH[ch].consts || {}).forEach(k => L.push(`${(ch + '_' + k).toUpperCase()} = ${pyNum(S[ch + '_' + k])}`));
      NCH[ch].gates.forEach(g => {
        L.push(`def ${ch}_${g.n}(V, Ca):   # ${NCH[ch].label}`);
        if (g.a) L.push(`    a = ${pyExpr(subst(g.a, ch, S, true))}`, `    b = ${pyExpr(subst(g.b, ch, S, true))}`, '    return a / (a + b), 1.0 / (a + b)');
        else L.push(`    return ${pyExpr(subst(g.inf, ch, S, true))}, ${g.tau ? pyExpr(subst(g.tau, ch, S, true)) : '0.0'}`);
      });
    });
    L.push('', '# (name, ion, reversal key, [(gate function, power)], temperature factor phi, gbar per compartment mS/cm², unitary conductance pS)', 'CHANNELS = [');
    used.forEach(ch => { const c = NCH[ch], gs = [S['g_' + ch] * (S['on_' + ch] ? 1 : 0), M.comps === 2 ? S['gd_' + ch] * (S['on_' + ch] ? 1 : 0) : 0];
      L.push(`    ('${ch}', '${c.ion}', '${c.E}', [${c.gates.map(g => `(${ch}_${g.n}, ${g.p})`).join(', ')}], ${pyNum(phiOf(ch, S.temp))}, [${gs.map(pyNum).join(', ')}], ${pyNum(c.gamma || 20)}),`); });
    L.push(']', '', pyStim(S), '', `def simulate():
    frac = [P_SOMA, 1 - P_SOMA] if N_COMP == 2 else [1.0]
    E = {'ENa': E_NA, 'EK': E_K, 'Eh': E_H, 'ECa': E_CA}
    V = [${S.proto === 'vstep' ? 'V_HOLD' : 'E_LEAK'}] * N_COMP
    Ca = [CA_INF] * N_COMP
    gates = [[[g(V[c], Ca[c])[0] for g, _ in ch[3]] for ch in CHANNELS] for c in range(N_COMP)]
    k_ca = 1e4 / (2 * 96485.3 * CA_DEPTH) * 1e-3          # µA/cm² -> mM/ms
    to_density = [1e5 / (AREA * f) if I_UNIT == 'nA' else 1.0 for f in frac]
    s = {'ou': 0.0, 'ge': ${S.proto === 'pc' ? 'GE0' : '0.0'}, 'gi': ${S.proto === 'pc' ? 'GI0' : '0.0'}}
    n_settle, n = int(round(SETTLE / DT)) if PROTOCOL != 'vstep' else 0, int(round(TSTOP / DT))
    t_rec, v_rec, vd_rec, i_rec, spikes = [], [], [], [], []
    I_ca = [0.0] * N_COMP
    for k in range(-n_settle, n + 1):
        t, settling = k * DT, k < 0
        I_inj = 0.0 if settling else stimulus(t, DT, s)
${S.proto === 'pc' ? '        ge, gi = (0.0, 0.0) if settling else conductances(t, DT, s)\n' : ''}        # gates first (staggered, as in NEURON): advance them half a step ahead using V(t), then V uses these mid-step gates
        for c in range(N_COMP):
            for ci, (name, ion, ek, gl, phi, gbar, gamma) in enumerate(CHANNELS):
                if gbar[c] <= 0: continue
                n_ch = gbar[c] * AREA * frac[c] * 10 / gamma          # number of channels
                for gi_, (fn, p) in enumerate(gl):
                    x = gates[c][ci][gi_]
                    inf, tau = fn(V[c], Ca[c])
                    if tau <= 0: gates[c][ci][gi_] = inf; continue
                    tau /= phi
                    x_new = x + DT * (inf - x) / tau if METHOD == 'euler' else inf + (x - inf) * math.exp(-DT / tau)
                    if CHANNEL_NOISE:                                  # Langevin (Fox & Lu 1994)
                        a, b = inf / tau, (1 - inf) / tau
                        x_new += math.sqrt(max((a * (1 - x) + b * x) / n_ch, 0) * DT) * rng.standard_normal()
                    gates[c][ci][gi_] = min(max(x_new, 0.0), 1.0)
            Ca[c] = max(Ca[c] + DT * (max(0.0, -k_ca * I_ca[c]) + (CA_INF - Ca[c]) / CA_TAU), 1e-9)
        I_ion, I_ca, G_tot = [0.0] * N_COMP, [0.0] * N_COMP, [0.0] * N_COMP
        for c in range(N_COMP):
            v = V[c]
            e_ca = 1e3 * 8.314 * (T_CELSIUS + 273.15) / (2 * 96485.3) * math.log(CA_OUT / Ca[c]) if NERNST_CA else E_CA
            I = (G_LEAK if c == 0 else G_LEAK_D) * (v - E_LEAK)
            G_tot[c] = G_LEAK if c == 0 else G_LEAK_D
            for ci, (name, ion, ek, gl, phi, gbar, gamma) in enumerate(CHANNELS):
                if gbar[c] <= 0: continue
                g = gbar[c]
                for (_, p), x in zip(gl, gates[c][ci]): g *= x ** p
                cur = g * (v - (e_ca if ek == 'ECa' else E[ek]))
                I += cur; G_tot[c] += g
                if ion == 'Ca': I_ca[c] += cur
${S.proto === 'pc' ? `            if c == ${S.site === 'd' && M.comps === 2 ? 1 : 0}:
                f = 1e5 / (AREA * frac[c])
                I += ge * f * (v - E_E) + gi * f * (v - E_I); G_tot[c] += (ge + gi) * f
` : ''}            I_ion[c] = I
        if not settling and k % 10 == 0:
            t_rec.append(t); v_rec.append(V[0]); vd_rec.append(V[-1])
            i_rec.append(${S.proto === 'vstep' ? "(I_ion[0] - (G_C / frac[0] * (V[1] - V[0]) if N_COMP == 2 else 0)) * (AREA * frac[0] * 1e-5 if I_UNIT == 'nA' else 1)" : 'I_inj'})
        V_old = list(V)
        for c in range(N_COMP):
            J, Gc = -I_ion[c], G_tot[c]
            if N_COMP == 2: J += G_C / frac[c] * (V_old[1 - c] - V_old[c]); Gc += G_C / frac[c]
            here = (N_COMP == 1) or (c == ${M.comps === 2 ? 'INJECT_AT' : '0'})
            if here and PROTOCOL != 'vstep': J += I_inj * to_density[c]
            # exponential Euler: exact for conductances frozen over DT (forward Euler if METHOD == 'euler')
            V[c] = V_old[c] + DT * J / CM if METHOD == 'euler' or Gc <= 0 else V_old[c] + J / Gc * (1 - math.exp(-DT * Gc / CM))
        if PROTOCOL == 'vstep': V[0] = V_HOLD if (settling or not (DELAY <= t + DT < DELAY + DUR)) else V_CMD
        if not settling and PROTOCOL != 'vstep' and V_old[0] < 0 <= V[0]: spikes.append(t)
    return np.array(t_rec), np.array(v_rec), np.array(vd_rec), np.array(i_rec), spikes

t, v, vd, i_trace, spikes = simulate()
print(f"{len(spikes)} spikes; first at {spikes[0]:.1f} ms" if spikes else "no spikes")
fig, ax = plt.subplots(2, 1, figsize=(8, 5), sharex=True, height_ratios=[3, 1])
ax[0].plot(t, v, lw=1, label='soma')
if N_COMP == 2: ax[0].plot(t, vd, lw=1, label='dendrite'); ax[0].legend()
ax[0].set_ylabel('V (mV)')
ax[1].plot(t, i_trace, lw=1, color='k'); ax[1].set_ylabel(${S.proto === 'vstep' ? "'clamp current'" : "'input'"}); ax[1].set_xlabel('time (ms)')
plt.tight_layout(); plt.show()`);
    return L.join('\n');
  }
  function pythonPoint(S) {
    const m = S.model;
    const par = m === 'lif' ? `C, G_L, E_L, V_TH, V_RESET, T_REF = ${[S.lif_C, S.lif_gL, S.lif_EL, S.lif_Vth, S.lif_Vr, S.lif_tref].map(pyNum).join(', ')}   # pF, nS, mV, mV, mV, ms\nB, TAU_W = ${pyNum(S.lif_b)}, ${pyNum(S.lif_tauw)}   # spike-triggered adaptation pA, ms`
      : m === 'adex' ? `C, G_L, E_L, V_T, DELTA_T = ${[S.adex_C, S.adex_gL, S.adex_EL, S.adex_VT, S.adex_DT].map(pyNum).join(', ')}   # pF, nS, mV, mV, mV\nA, TAU_W, B, V_RESET, V_PEAK = ${[S.adex_a, S.adex_tauw, S.adex_b, S.adex_Vr, S.adex_Vpk].map(pyNum).join(', ')}   # nS, ms, pA, mV, mV`
        : `A, B, C, D = ${[S.izh_a, S.izh_b, S.izh_c, S.izh_d].map(pyNum).join(', ')}   # Izhikevich (2003)`;
    const body = m === 'izh' ? `    v, u = C, B * C
    for k in range(n + 1):
        t = k * DT; I = stimulus(t, DT, s)
        t_rec.append(t); v_rec.append(v)
        fv = lambda v, u: 0.04 * v * v + 5 * v + 140 - u + I
        fu = lambda v, u: A * (B * v - u)
        k1v, k1u = fv(v, u), fu(v, u)                       # Heun's method (second order)
        vp, up = min(v + DT * k1v, 30), u + DT * k1u
        vn, un = min(v + DT / 2 * (k1v + fv(vp, up)), 1e3), u + DT / 2 * (k1u + fu(vp, up))
        if vn >= 30:
            v_rec[-1] = 30; spikes.append(t + DT * min(1, max(0, (30 - v) / (vn - v))))   # crossing time inside the step
            v, u = C, un + D
        else:
            v, u = vn, un`
      : `    v, w, ref = E_L, 0.0, 0.0
    for k in range(n + 1):
        t = k * DT; I = stimulus(t, DT, s) * 1000          # nA -> pA
        g_s = 0.0
${S.proto === 'pc' ? '        ge, gi = conductances(t, DT, s)\n        I -= ge * 1000 * (v - E_E) + gi * 1000 * (v - E_I)\n        g_s = (ge + gi) * 1000\n' : ''}        t_rec.append(t); v_rec.append(v)
        if ref > 0:
            ref -= DT; ${m === 'lif' ? 'v = V_RESET; w *= math.exp(-DT / TAU_W); ' : 'w += DT * (A * (v - E_L) - w) / TAU_W; '}continue
${m === 'lif' ? `        g = G_L + g_s                                        # exact exponential step for input frozen over DT
        v_inf = (G_L * E_L + g_s * v + I - w) / g
        vn = v_inf + (v - v_inf) * math.exp(-DT * g / C)
        w *= math.exp(-DT / TAU_W)
        if vn >= V_TH:
            v_rec[-1] = 20; spikes.append(t + DT * min(1, max(0, (V_TH - v) / (vn - v))))
            v, w, ref = V_RESET, w + B, T_REF
        else:
            v = vn`
        : `        f = lambda v, w: (-G_L * (v - E_L) + G_L * DELTA_T * math.exp(min((v - V_T) / DELTA_T, 30)) - w + I) / C
        fw = lambda v, w: (A * (v - E_L) - w) / TAU_W
        k1v, k1w = f(v, w), fw(v, w)                         # Heun's method (second order)
        vp, wp = min(v + DT * k1v, V_PEAK), w + DT * k1w
        vn, wn = v + DT / 2 * (k1v + f(vp, wp)), w + DT / 2 * (k1w + fw(vp, wp))
        if vn >= V_PEAK:
            v_rec[-1] = V_PEAK; spikes.append(t + DT * min(1, max(0, (V_PEAK - v) / (vn - v))))
            v, w = V_RESET, wn + B
        else:
            v, w = vn, wn`}`;
    return `${par}\nDT = ${pyNum(S.dt)}\n\n${pyStim(S)}\n\ndef simulate():
    s = {'ou': 0.0, 'ge': ${S.proto === 'pc' ? 'GE0' : '0.0'}, 'gi': ${S.proto === 'pc' ? 'GI0' : '0.0'}}
    n = int(round(TSTOP / DT)); t_rec, v_rec, spikes = [], [], []
${body}
    return np.array(t_rec), np.array(v_rec), spikes

t, v, spikes = simulate()
print(f"{len(spikes)} spikes" + (f", mean rate {len(spikes) / (DUR / 1000):.1f} Hz during the stimulus" if spikes else ""))
plt.figure(figsize=(8, 3)); plt.plot(t, v, lw=1); plt.xlabel('time (ms)'); plt.ylabel('V (mV)'); plt.tight_layout(); plt.show()`;
  }

  window.NW = { NCH, CH_ORDER, DEF, PRESETS, simulate, simCond, simPoint, fiPoint, impedance, ivCurve, battery, spikeFeatures, pythonCode, unitOf, buildCond };
})();
