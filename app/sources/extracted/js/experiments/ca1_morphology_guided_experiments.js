
/* CA1 Morphology Lab · lessons.js — guided experiments built on the lab's public hooks (window.LABUI). */
(function () {
  "use strict";
  var U = window.LABUI;
  var LESSONS = [
    {
      id: "passive", title: "Passive cable", time: "5 min",
      goal: "See how a signal shrinks and slows as it travels from the dendrite to the soma when there are no active channels.",
      bio: "A dendrite is a long, thin, leaky tube. Current injected far out leaks across the membrane as it flows toward the soma, and the membrane capacitance smooths it. Real CA1 cells receive CA3 input 100–350 µm from the soma, so this loss matters for every synapse.",
      predict: { q: "You inject a 0.2 nA step 300 µm up the apical dendrite. Compared with the voltage change at the injection site, the soma's change will be…",
        opts: ["About the same size", "Smaller, and it rises more slowly", "Larger, because the soma is bigger"], a: 1,
        why: "Current leaks out along the way and charges the membrane in between, so the soma sees a smaller, slower version." },
      setup: { params: { gh_soma: 0, spikes: false, g_m_soma: 0 }, site: { kind: 4, dist: 300 }, stim: { stype: "step", samp: 0.2, sdur: 500, shold: 0 }, color: "volt", prof: "atten" },
      steps: [["Run the step", "run"], ["Colour by attenuation to the soma", "color:atten"], ["Impedance at this site", "imp"]],
      look: ["Soma trace (black) is smaller than the site trace (magenta).", "Attenuation map: the soma keeps most of a proximal signal, very little of a distal tuft signal.", "Impedance: both curves fall with frequency. No hump means no resonance; a passive cable can only filter."],
      check: { q: "Why does the transfer impedance to the soma fall faster with frequency than the input impedance at the site?",
        opts: ["The axial resistance is frequency dependent", "Each stretch of membrane between site and soma filters again, so filtering compounds with distance", "The soma has more ion channels"], a: 1,
        why: "Every bit of membrane capacitance along the path acts as a low-pass filter, and they stack." },
      code: "imp"
    },
    {
      id: "ih", title: "I_h gradient", time: "6 min",
      goal: "Add HCN channels that increase toward the tuft, and see what they do to resting voltage, sag and EPSP shape.",
      bio: "CA1 dendrites have more than six times as many HCN channels distally as at the soma (Magee 1998). I_h is open at rest, carries inward current, and closes slowly when the membrane depolarizes.",
      predict: { q: "Turning I_h on (density rising 6× toward the tuft) will make the resting potential…",
        opts: ["More negative", "More positive, especially in the tuft", "Unchanged"], a: 1,
        why: "I_h reverses near −30 mV, so its open channels pull the membrane up; more channels distally means more depolarization there." },
      setup: { params: {}, site: { kind: 1 }, stim: { stype: "step", samp: -0.15, sdur: 800, shold: 0 }, color: "gh", prof: "rest" },
      steps: [["Run a hyperpolarizing step at the soma", "run"], ["Colour by resting voltage", "color:rest"], ["Remove I_h and compare", "set:gh_soma=0"], ["Restore I_h", "set:gh_soma=0.05"]],
      look: ["A sag: the voltage drops, then partly recovers during the step as I_h opens. The sag ratio tile reports it.", "Profile: resting voltage is higher in the distal tuft than at the soma.", "With I_h removed, rest returns to E_L and the sag disappears."],
      check: { q: "Why does the sag develop over tens to hundreds of milliseconds rather than instantly?",
        opts: ["Because τ_h, the time HCN channels take to open, is tens of ms or longer", "Because the axial resistance is high", "Because spikes are turned off"], a: 0,
        why: "The sag follows the gate: it grows as h moves toward its new, higher steady state with time constant τ_h." },
      code: "run"
    },
    {
      id: "res", title: "Impedance and resonance", time: "7 min",
      goal: "Measure the frequency response and find out what turns a filter into a resonator.",
      bio: "Hu et al. (2002) found CA1 cells respond best to 2–5 Hz inputs at 33 °C and ~7 Hz at body temperature. A preferred frequency needs a current that opposes slow changes: I_h does this.",
      predict: { q: "Which change moves the resonance peak to higher frequencies?",
        opts: ["Increasing ḡ_h", "Making τ_h faster (smaller)", "Increasing membrane capacitance"], a: 1,
        why: "τ_h sets the time scale of the push-back; a faster gate opposes faster inputs. ḡ_h mostly changes how strong the peak is." },
      setup: { params: {}, site: { kind: 1 }, stim: { stype: "zap", samp: 0.03, sdur: 2000, shold: 0 }, color: "Q", prof: "fres" },
      steps: [["Impedance at the soma", "imp"], ["Speed up τ_h × 0.33", "set:h_tau_scale=0.33"], ["Slow it down × 3", "set:h_tau_scale=3"], ["Back to × 1", "set:h_tau_scale=1"], ["Try Lowet's slow kinetics", "set:h_kin=lowet2023"], ["Back to bell kinetics", "set:h_kin=bell"], ["Run the ZAP chirp", "run"]],
      look: ["Input impedance (magenta) has a gentle hump around 5 Hz: that is resonance.", "τ_h × 0.33 moves the peak up; × 3 moves it down. Q changes much less.", "Lowet's kinetics (seconds) push the peak down to about 1–2 Hz.", "The ZAP trace waxes and wanes: largest where the input frequency is near the resonance."],
      check: { q: "A colleague says 'the soma responds more at 8 Hz than 40 Hz, so it resonates at theta'. What is missing?",
        opts: ["Nothing, that is the definition", "Evidence of a peak: a passive filter also responds more at 8 Hz than 40 Hz", "A spike count"], a: 1,
        why: "Resonance means a maximum at a non-zero frequency (Q > 1). Larger-at-low-frequency is just filtering." },
      code: "imp"
    },
    {
      id: "map", title: "Resonance along the dendrite", time: "6 min",
      goal: "Map the local resonance frequency everywhere on the cell and compare with recordings.",
      bio: "Narayanan & Johnston (2007) found resonance frequency changes more than 3-fold between soma and distal dendrites, set by h channels, and that LTP shifts it. Different parts of one cell can be tuned differently.",
      predict: { q: "Where will the local resonance frequency be highest?",
        opts: ["At the soma", "In the distal apical tuft, where I_h is densest", "In the basal dendrites"], a: 1,
        why: "More I_h relative to leak and capacitance means a stronger, faster restoring current, which raises the local resonance frequency." },
      setup: { params: {}, site: { kind: 4, dist: 450 }, stim: { stype: "step", samp: 0.1, sdur: 300, shold: 0 }, color: "fres", prof: "fres" },
      steps: [["Compute the resonance map", "map"], ["Plot Q instead", "prof:Q"], ["Make the gradient flat (fold 1)", "set:gh_fold=1"], ["Steeper gradient (fold 12)", "set:gh_fold=12"], ["Back to fold 6", "set:gh_fold=6"]],
      look: ["Profile: apical points (magenta) reach higher frequencies with distance, up to about 9 Hz in the tuft, with scatter from branch thickness; basal points (blue) stay near the soma value.", "A flat gradient flattens the profile. The gradient, not the morphology alone, makes the tuft resonate faster.", "Thin terminal branches have very high input resistance (log scale in 'local input resistance')."],
      check: { q: "If you fit a two-compartment model to this cell, why can a single 'dendrite' compartment not capture this map?",
        opts: ["It can, if g_ax is large", "One compartment has one resonance frequency, but the real cell has a range from about 4 to 9 Hz", "Because two compartments cannot have I_h"], a: 1,
        why: "Lumping the tree averages away the spatial gradient. Choose which site your reduced dendrite should represent." },
      code: "map"
    },
    {
      id: "spk", title: "Spikes, rhythm and I_M", time: "8 min",
      goal: "Drive the soma with theta and gamma rhythms of the same size, see which one makes spikes and where in the cycle they fall, then add somatic I_M.",
      bio: "Place cells fire at particular theta phases. Hu et al. (2002) found a second, depolarized resonance from I_M and I_NaP near threshold, and Lowet (2023) and Ceballos (2025) found bursts and single spikes prefer different rhythms.",
      predict: { q: "A 0.3 nA sine at 8 Hz makes the cell fire. The same 0.3 nA at 40 Hz will…",
        opts: ["Make about five times more spikes", "Make few or no spikes, because the membrane filters fast input", "Make the same number of spikes"], a: 1,
        why: "The membrane's RC filter shrinks a 40 Hz voltage swing several-fold, so the same current no longer reaches threshold." },
      setup: { params: { spikes: true, g_m_soma: 0 }, site: { kind: 1 }, stim: { stype: "sine", samp: 0.3, sfreq: 8, sdur: 1500, shold: 0 }, color: "volt", prof: "rest" },
      steps: [["Run 8 Hz", "run"], ["Switch to 40 Hz", "stim:sfreq=40"], ["Run 40 Hz", "run"], ["Back to 8 Hz", "stim:sfreq=8"], ["Add somatic I_M (ḡ 0.3)", "set:g_m_soma=0.3"], ["Run with I_M", "run"], ["Impedance at the soma (at rest)", "imp"]],
      look: ["8 Hz: a cluster of about five spikes on each cycle, always near the same phase (about 140° after the sine's upward zero crossing).", "40 Hz: no spikes. Same current, but filtered.", "With I_M the clusters tighten: phase locking rises from about 0.77 to 0.93 (vector strength).", "Impedance at rest barely changes with I_M, because I_M is closed below about −65 mV. Hu et al. saw M-resonance only at depolarized potentials.", "Spike shape here is simplified (no after-hyperpolarization). Use it for timing, not waveform."],
      check: { q: "The 8 Hz clusters look like bursts. Why can't you use this model to test Lowet's burst-vs-single-spike result yet?",
        opts: ["Because the clusters come only from the input's shape: there is no intrinsic burst mechanism that could compete with single spikes", "Because 8 Hz is too slow", "Because there are too many compartments"], a: 0,
        why: "Lowet's bursts come from the cell's own dynamics (Golomb's I_M/I_NaP soma, dendritic Ca²⁺). Here clusters simply follow the long suprathreshold part of each sine." },
      code: "run"
    }
  ];

  var host = document.getElementById("lessonbar"), panel = document.getElementById("lessonpanel"), tab = document.getElementById("t-lesson");
  var cur = -1;
  function chipList() {
    return LESSONS.map(function (L, i) {
      return '<button type="button" class="lchip" role="tab" aria-selected="' + (i === cur) + '" data-l="' + i + '" id="lchip-' + i + '"><span>' + (i + 1) + '</span><em class="lt">' + sub(L.title) + "</em></button>";
    }).join("") + '<button type="button" class="lchip free" data-l="-1" id="lchip-free" aria-selected="' + (cur < 0) + '">Free explore</button>';
  }
  function sub(s) { return s.replace(/I_h/g, "I<sub>h</sub>").replace(/I_M/g, "I<sub>M</sub>").replace(/I_NaP/g, "I<sub>NaP</sub>").replace(/τ_h/g, "τ<sub>h</sub>").replace(/ḡ_h/g, "ḡ<sub>h</sub>").replace(/g_ax/g, "g<sub>ax</sub>").replace(/E_L/g, "E<sub>L</sub>"); }
  function mcq(name, o) {
    return '<div class="mcq" data-a="' + o.a + '"><p>' + sub(o.q) + "</p>" + o.opts.map(function (t, i) { return '<button type="button" class="opt" data-i="' + i + '">' + sub(t) + "</button>"; }).join("") + '<p class="why" hidden>' + sub(o.why) + "</p></div>";
  }
  function render() {
    host.innerHTML = '<div class="lbar" role="tablist" aria-label="Lessons">' + chipList() + "</div>";
    if (cur < 0) {
      tab.hidden = true; panel.innerHTML = "";
      if (tab.getAttribute("aria-selected") === "true") document.getElementById("t-stim").click();
      return;
    }
    var L = LESSONS[cur];
    panel.innerHTML = '<div class="lcol"><span class="kicker">Lesson ' + (cur + 1) + " of " + LESSONS.length + " · " + L.time + "</span><h2>" + sub(L.title) + '</h2><p class="lgoal">' + sub(L.goal) + "</p>" +
      "<h3>Biology</h3><p>" + sub(L.bio) + "</p><h3>1 · Predict first</h3>" + mcq("p", L.predict) +
      '<h3>2 · Do</h3><ol class="lsteps"><li><button type="button" class="btn primary" data-act="setup">Set up this experiment</button></li>' +
      L.steps.map(function (s) { return '<li><button type="button" class="btn" data-act="' + s[1] + '">' + sub(s[0]) + "</button></li>"; }).join("") +
      '</ol><h3>3 · Look for</h3><ul class="llook">' + L.look.map(function (t) { return "<li>" + sub(t) + "</li>"; }).join("") + "</ul>" +
      "<h3>4 · Check yourself</h3>" + mcq("c", L.check) +
      '<p><button type="button" class="btn" data-act="code">See the Python for this lesson ↓</button></p>' +
      '<div class="lnav">' + (cur > 0 ? '<button type="button" class="btn" data-go="' + (cur - 1) + '">← Previous</button>' : "<span></span>") + (cur < LESSONS.length - 1 ? '<button type="button" class="btn" data-go="' + (cur + 1) + '">Next lesson →</button>' : "") + "</div></div>";
    tab.hidden = false; tab.click(); panel.scrollTop = 0;
  }
  function onClick(e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.l !== undefined) { cur = +b.dataset.l; render(); if (cur >= 0) setup(); return; }
    if (b.dataset.go !== undefined) { cur = +b.dataset.go; render(); setup(); return; }
    if (b.classList.contains("opt")) {
      var box = b.closest(".mcq"), a = +box.dataset.a;
      box.querySelectorAll(".opt").forEach(function (o) { o.classList.remove("right", "wrong"); });
      b.classList.add(+b.dataset.i === a ? "right" : "wrong");
      box.querySelector(".opt[data-i='" + a + "']").classList.add("right");
      box.querySelector(".why").hidden = false; return;
    }
    var act = b.dataset.act; if (!act) return;
    if (act === "setup") return setup();
    if (act === "run") return U.run();
    if (act === "imp") return U.impedance();
    if (act === "map") return U.map();
    if (act === "code") { U.code(LESSONS[cur].code); return; }
    var kv = act.split(":"), arg = kv[1];
    if (kv[0] === "color") return U.color(arg);
    if (kv[0] === "prof") return U.profile(arg);
    if (kv[0] === "set") { var p = arg.split("="), o = {}; o[p[0]] = isNaN(+p[1]) ? p[1] : +p[1]; U.setParams(o, false); return; }
    if (kv[0] === "stim") { var q = arg.split("="), s = {}; s[q[0]] = +q[1]; U.setStim(s); return; }
  }
  host.addEventListener("click", onClick); panel.addEventListener("click", onClick);
  function setup() { var L = LESSONS[cur]; U.setParams(L.setup.params, true); U.setSite(L.setup.site); U.setStim(L.setup.stim); U.color(L.setup.color); U.profile(L.setup.prof); }
  render();
})();

