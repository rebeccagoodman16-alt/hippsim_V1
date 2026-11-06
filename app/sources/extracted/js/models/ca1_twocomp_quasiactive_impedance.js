
// Quasi-active two-compartment CA1 model — JS port of ca1_reduced.impedance_matrix
// Units: ms, mV, nF, uS, nA, MOhm. Mirrors Params() defaults.
var CA1 = (function () {
  function hInf(V, p) { return 1 / (1 + Math.exp((V - p.Vh_half) / p.k_h)); }
  function dhInf(V, p) { var h = hInf(V, p); return -h * (1 - h) / p.k_h; }
  function tauH(V, p) {
    if (p.ih_kinetics === "lowet2023")
      return p.tau_h_scale * (1 / (Math.exp(-17.9 - 0.116 * V) + Math.exp(-1.84 + 0.09 * V)) + 0.1);
    return p.tau_h_scale * p.tau_h;
  }
  function zInf(V, p) { return 1 / (1 + Math.exp(-(V - p.theta_z) / p.sigma_z)); }
  function pInf(V, p) { return 1 / (1 + Math.exp(-(V - p.theta_p) / p.sigma_p)); }

  function defaults() {
    return { C_s: 1, C_d: 1, gL_s: 0.05, gL_d: 0.05, E_L: -70, g_ax: 0.25,
      ih_kinetics: "lowet2023", g_h: 0, E_h: -32.9, Vh_half: -84, k_h: 10.2, tau_h: 40,
      tau_h_scale: 1, freeze_h: false,
      g_M: 0, E_K: -90, theta_z: -39, sigma_z: 5, tau_z: 75,
      g_NaP: 0, E_Na: 55, theta_p: -47, sigma_p: 3 };
  }

  // dendrite steady state for a fixed soma voltage (monotone -> bisection)
  function vdOf(vs, p, Id0) {
    var lo = -150, hi = 50;
    for (var i = 0; i < 80; i++) {
      var mid = 0.5 * (lo + hi);
      var F = -p.gL_d * (mid - p.E_L) - p.g_h * hInf(mid, p) * (mid - p.E_h) - p.g_ax * (mid - vs) + Id0;
      if (F > 0) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }
  function Fs(vs, vd, p, Is0) {
    return -p.gL_s * (vs - p.E_L) - p.g_M * zInf(vs, p) * (vs - p.E_K)
      - p.g_NaP * pInf(vs, p) * (vs - p.E_Na) + p.g_ax * (vd - vs) + Is0;
  }
  // free rest (no holding current), same rule as Python: root closest to E_L
  function restFree(p) {
    var N = 1201, prevV = null, prevG = null, best = null;
    for (var i = 0; i < N; i++) {
      var v = -200 + 240 * i / (N - 1), g = Fs(v, vdOf(v, p, 0), p, 0);
      if (prevG !== null && (prevG > 0) !== (g > 0)) {
        var lo = prevV, hi = v, glo = prevG;
        for (var k = 0; k < 50; k++) {
          var mid = 0.5 * (lo + hi), gm = Fs(mid, vdOf(mid, p, 0), p, 0);
          if ((gm > 0) === (glo > 0)) { lo = mid; glo = gm; } else hi = mid;
        }
        var r = 0.5 * (lo + hi);
        if (best === null || Math.abs(r - p.E_L) < Math.abs(best - p.E_L)) best = r;
      }
      prevV = v; prevG = g;
    }
    if (best === null) return null;
    return { vs: best, vd: vdOf(best, p, 0) };
  }
  // soma held at Vs by a somatic current; returns the current too
  function restHeld(p, Vs) {
    var vd = vdOf(Vs, p, 0);
    return { vs: Vs, vd: vd, Ihold: -Fs(Vs, vd, p, 0) };
  }

  // complex helpers [re, im]
  function cadd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function cmul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
  function cdiv(a, b) { var d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
  function cabs(a) { return Math.hypot(a[0], a[1]); }

  function impedance(p, freqs, rest) {
    var vs = rest.vs, vd = rest.vd, h0 = hInf(vd, p), out = { Zss: [], Zsd: [], Zdd: [] };
    var th = tauH(vd, p), z0 = zInf(vs, p), p0 = pInf(vs, p);
    for (var i = 0; i < freqs.length; i++) {
      var w = 2 * Math.PI * freqs[i] / 1000;
      var yd = [p.gL_d, w * p.C_d], ys = [p.gL_s, w * p.C_s];
      if (p.g_h) {
        yd = cadd(yd, [p.g_h * h0, 0]);
        if (!p.freeze_h) yd = cadd(yd, cdiv([p.g_h * (vd - p.E_h) * dhInf(vd, p), 0], [1, w * th]));
      }
      if (p.g_M) {
        ys = cadd(ys, [p.g_M * z0, 0]);
        ys = cadd(ys, cdiv([p.g_M * (vs - p.E_K) * z0 * (1 - z0) / p.sigma_z, 0], [1, w * p.tau_z]));
      }
      if (p.g_NaP) ys = cadd(ys, [p.g_NaP * p0 + p.g_NaP * (vs - p.E_Na) * p0 * (1 - p0) / p.sigma_p, 0]);
      var g = [p.g_ax, 0];
      var det = cadd(cmul(cadd(ys, g), cadd(yd, g)), [-p.g_ax * p.g_ax, 0]);
      out.Zss.push(cabs(cdiv(cadd(yd, g), det)));
      out.Zdd.push(cabs(cdiv(cadd(ys, g), det)));
      out.Zsd.push(cabs(cdiv(g, det)));
    }
    return out;
  }
  function metrics(freqs, Z) {
    var k = 0; for (var i = 1; i < Z.length; i++) if (Z[i] > Z[k]) k = i;
    return { fres: freqs[k], Q: Z[k] / Z[0], k: k };
  }
  return { defaults: defaults, restFree: restFree, restHeld: restHeld, impedance: impedance,
           metrics: metrics, hInf: hInf, tauH: tauH, zInf: zInf, pInf: pInf };
})();


(function () {
  var SVGNS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------------- Neuron: channel glyphs ---------------- */
  var CH = {
    leak: { color: "var(--t-leak)", name: "Leak channels", gene: "K2P and other background channels",
      where: "Everywhere on the membrane.",
      does: "Always open. Pull the voltage toward −70 mV and set how fast the cell charges (τ<sub>m</sub> = C/g<sub>L</sub> = 20 ms).",
      model: ["ok", "In the model"], eq: "I<sub>L</sub> = g<sub>L</sub>(V − E<sub>L</sub>)", src: "Lowet HHca2 <code>Gl = 0.05</code>" },
    hcn: { color: "var(--t-h)", name: "HCN channels · I<sub>h</sub>", gene: "HCN1 (mainly) and HCN2",
      where: "Dendrites, rising more than sixfold from soma to distal tuft (Magee 1998). Drawn denser toward the tuft.",
      does: "Open when the membrane hyperpolarizes, let in a depolarizing mixed Na<sup>+</sup>/K<sup>+</sup> current, and close slowly when it depolarizes. This slow push-back can make a resonance peak.",
      model: ["ok", "In the model (dendrite)"], eq: "I<sub>h</sub> = ḡ<sub>h</sub> h (V − E<sub>h</sub>), E<sub>h</sub> = −32.9 mV", src: "Lowet HHca2 <code>Gh2</code>, <code>h2_inf</code>, <code>tauh2</code>" },
    kv7: { color: "var(--t-syn)", name: "Kv7 channels · I<sub>M</sub>", gene: "KCNQ2/3",
      where: "Soma and axon initial segment.",
      does: "Slow K<sup>+</sup> current (τ 75 ms) that opens above about −65 mV and pulls the voltage back down. Creates theta resonance near threshold and drives bursting (Hu 2002; Golomb 2006).",
      model: ["warn", "Optional in the model"], eq: "I<sub>M</sub> = g<sub>M</sub> z (V − E<sub>K</sub>)", src: "Golomb 2006; HHca <code>Gm</code>, <code>thetaz</code>, <code>tauz</code>" },
    nap: { color: "var(--t-ax)", name: "Persistent Na<sup>+</sup> · I<sub>NaP</sub>", gene: "Na<sub>V</sub>1.6 and others (non-inactivating fraction)",
      where: "Soma and axon initial segment.",
      does: "Opens instantly near −50 mV and adds inward current. Amplifies resonance and adds spikes to bursts.",
      model: ["warn", "Optional in the model"], eq: "I<sub>NaP</sub> = g<sub>NaP</sub> p<sub>∞</sub>(V)(V − E<sub>Na</sub>)", src: "Golomb 2006; HHca <code>Gnap</code>, <code>thetap</code>" },
    spike: { color: "var(--spike)", name: "Spike channels · I<sub>NaT</sub> + I<sub>Kdr</sub>", gene: "Na<sub>V</sub>1.6 / 1.2; Kv2.1",
      where: "Densest at the axon initial segment, where spikes start; also soma.",
      does: "Produce the action potential: fast Na<sup>+</sup> up, delayed K<sup>+</sup> down.",
      model: ["todo", "Replaced by LIF threshold/reset"], eq: "LIF: if V<sub>s</sub> ≥ −50 → spike, V<sub>s</sub> = −65", src: "Golomb 2006 for the full version" },
    ka: { color: "var(--t-in)", name: "A-type K<sup>+</sup> · I<sub>A</sub>", gene: "Kv4.2",
      where: "Dendrites, increasing with distance from the soma.",
      does: "Fast-inactivating K<sup>+</sup> current that limits back-propagating spikes and dendritic excitability.",
      model: ["todo", "Not in the model"], eq: "I<sub>A</sub> = g<sub>A</sub> a<sub>∞</sub><sup>3</sup> b (V − E<sub>K</sub>)", src: "Golomb 2006; HHca <code>Ga</code>" }
  };
  // glyph positions [x, y, angleDeg]
  var POS = {
    hcn: [[313,370,90],[327,340,-90],[313,300,90],[327,262,-90],[313,230,90],[327,205,-90],[313,186,90],[300,140,60],[288,124,60],[276,108,60],[262,90,60],[250,78,60],[312,120,80],[306,90,80],[302,62,80],[338,128,-70],[346,104,-70],[356,80,-70],[362,64,-70],[372,128,-50],[390,112,-50],[404,96,-50],[412,84,-50],[226,94,0],[386,58,-60],[248,212,40],[402,186,-40],[388,270,0]],
    kv7: [[296,420,-50],[344,420,50],[322,488,0],[322,500,0],[318,512,0]],
    nap: [[300,452,-30],[340,452,30],[325,494,0],[325,506,0]],
    spike: [[317,486,0],[317,498,0],[317,510,0],[327,482,0],[290,470,0],[352,470,0],[336,540,25]],
    ka: [[313,320,90],[327,240,-90],[296,154,60],[344,150,-60],[262,300,10],[372,282,-10],[388,140,-50]],
    leak: [[313,355,90],[327,280,-90],[278,452,-45],[362,452,45],[250,532,30],[296,560,10],[350,556,-10],[400,516,-30],[240,100,0],[296,50,90]]
  };
  var chG = document.getElementById("channels");
  function glyph(x, y, a, ch) {
    var g = el("g", { transform: "translate(" + x + " " + y + ") rotate(" + a + ")", "data-ch": ch, "class": "glyph" }, chG);
    var c = CH[ch].color;
    el("rect", { x: -6.5, y: -4.5, width: 5, height: 9, rx: 2.2, fill: c, stroke: "var(--surface)", "stroke-width": 0.8 }, g);
    el("rect", { x: 1.5, y: -4.5, width: 5, height: 9, rx: 2.2, fill: c, stroke: "var(--surface)", "stroke-width": 0.8 }, g);
    return g;
  }
  Object.keys(POS).forEach(function (ch) { POS[ch].forEach(function (q) { glyph(q[0], q[1], q[2], ch); }); });

  var info = document.getElementById("chinfo"), chips = document.querySelectorAll(".chipbtn"), current = null;
  function showCh(ch) {
    current = (current === ch) ? null : ch;
    chips.forEach(function (b) { b.classList.toggle("on", b.dataset.ch === current); });
    chG.querySelectorAll(".glyph").forEach(function (g) { g.classList.toggle("dim", current && g.getAttribute("data-ch") !== current); g.classList.toggle("lit", g.getAttribute("data-ch") === current); });
    if (!current) { info.innerHTML = '<p class="hint">Pick a channel to see where it sits, what it does, and whether the model includes it.</p>'; return; }
    var c = CH[current];
    info.innerHTML = '<h3>' + c.name + '</h3><p class="gene">' + c.gene + '</p>' +
      '<dl><dt>Where</dt><dd>' + c.where + '</dd><dt>What it does</dt><dd>' + c.does + '</dd>' +
      '<dt>Equation</dt><dd>' + c.eq + '</dd><dt>Source</dt><dd>' + c.src + '</dd></dl>' +
      '<span class="chip ' + c.model[0] + '">' + c.model[1] + '</span>';
  }
  chips.forEach(function (b) { b.addEventListener("click", function () { showCh(b.dataset.ch); }); });
  chG.addEventListener("click", function (e) { var g = e.target.closest(".glyph"); if (g) showCh(g.getAttribute("data-ch")); });
  current = "hcn"; showCh("hcn"); current = "hcn";

  var layers = { bio: document.getElementById("bioLayer"), comp: document.getElementById("compLayer"), circ: document.getElementById("circLayer") };
  document.querySelectorAll("[data-layer]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-layer]").forEach(function (x) { x.classList.toggle("on", x === b); });
      var L = b.dataset.layer;
      layers.comp.style.display = (L === "comp") ? "" : "none";
      layers.circ.style.display = (L === "circ") ? "" : "none";
      layers.bio.style.opacity = (L === "comp") ? "0.55" : "1";
    });
  });

  /* ---------------- Impedance explorer ---------------- */
  var state = { site: "d" };
  var $ = function (id) { return document.getElementById(id); };
  var S = { gh: $("s-gh"), ths: $("s-ths"), kin: $("s-kin"), freeze: $("s-freeze"), gax: $("s-gax"), gl: $("s-gl"),
            gm: $("s-gm"), gnap: $("s-gnap"), hold: $("s-hold"), vh: $("s-vh") };
  var PRESETS = {
    passive: { gh: 0, ths: 1, kin: "lowet2023", freeze: false, gax: 0.25, gl: 0.05, gm: 0, gnap: 0, hold: false, vh: -60, site: "d" },
    early:   { gh: 0.05, ths: 1, kin: "lowet2023", freeze: false, gax: 0.25, gl: 0.05, gm: 0, gnap: 0, hold: false, vh: -60, site: "d" },
    lowet:   { gh: 2, ths: 1, kin: "lowet2023", freeze: false, gax: 0.25, gl: 0.05, gm: 0, gnap: 0, hold: false, vh: -60, site: "d" },
    warm:    { gh: 2, ths: 1 / 3, kin: "lowet2023", freeze: false, gax: 0.25, gl: 0.05, gm: 0, gnap: 0, hold: false, vh: -60, site: "d" },
    ceb:     { gh: 8.46, ths: 1, kin: "lowet2023", freeze: false, gax: 0.2, gl: 0.04, gm: 0, gnap: 0, hold: false, vh: -60, site: "d" },
    mres:    { gh: 2, ths: 1, kin: "lowet2023", freeze: false, gax: 0.25, gl: 0.05, gm: 1, gnap: 0.3, hold: true, vh: -60, site: "s" }
  };
  function applyPreset(name) {
    var P = PRESETS[name];
    S.gh.value = P.gh; S.ths.value = Math.log(P.ths); S.kin.value = P.kin; S.freeze.checked = P.freeze;
    S.gax.value = P.gax; S.gl.value = P.gl; S.gm.value = P.gm; S.gnap.value = P.gnap; S.hold.checked = P.hold; S.vh.value = P.vh;
    setSite(P.site);
    document.querySelectorAll("[data-preset]").forEach(function (b) { b.classList.toggle("on", b.dataset.preset === name); });
    update();
  }
  function setSite(s) {
    state.site = s;
    document.querySelectorAll("[data-site]").forEach(function (b) { b.classList.toggle("on", b.dataset.site === s); });
  }
  document.querySelectorAll("[data-preset]").forEach(function (b) { b.addEventListener("click", function () { applyPreset(b.dataset.preset); }); });
  document.querySelectorAll("[data-site]").forEach(function (b) { b.addEventListener("click", function () { setSite(b.dataset.site); update(); }); });
  Object.keys(S).forEach(function (k) {
    S[k].addEventListener("input", function () { document.querySelectorAll("[data-preset]").forEach(function (b) { b.classList.remove("on"); }); update(); });
  });

  var NF = 220, FREQS = [];
  for (var i = 0; i < NF; i++) FREQS.push(Math.exp(Math.log(0.3) + (Math.log(80) - Math.log(0.3)) * i / (NF - 1)));

  function params() {
    var p = CA1.defaults();
    p.g_h = +S.gh.value; p.tau_h_scale = Math.exp(+S.ths.value); p.ih_kinetics = S.kin.value; p.freeze_h = S.freeze.checked;
    p.g_ax = +S.gax.value; p.gL_s = p.gL_d = +S.gl.value; p.g_M = +S.gm.value; p.g_NaP = +S.gnap.value;
    return p;
  }
  function fmt(x, d) { return (Math.abs(x) < 1e-9 ? 0 : x).toFixed(d); }

  var zsvg = $("zplot"), gsvg = $("gplot");
  var W = 640, H = 330, m = { l: 56, r: 16, t: 18, b: 42 };
  function xs(f) { return m.l + (Math.log(f) - Math.log(0.3)) / (Math.log(80) - Math.log(0.3)) * (W - m.l - m.r); }

  function drawZ(curves, rest, mt) {
    while (zsvg.firstChild) zsvg.removeChild(zsvg.firstChild);
    var ymax = 0; curves.forEach(function (c) { c.Z.forEach(function (z) { if (z > ymax) ymax = z; }); });
    ymax = niceMax(ymax * 1.08);
    function ys(z) { return H - m.b - z / ymax * (H - m.t - m.b); }
    el("rect", { x: xs(4), y: m.t, width: xs(12) - xs(4), height: H - m.t - m.b, fill: "var(--theta-bg)" }, zsvg);
    el("rect", { x: xs(30), y: m.t, width: xs(80) - xs(30), height: H - m.t - m.b, fill: "var(--gamma-bg)" }, zsvg);
    txt(xs(8), m.t + 14, "theta", "var(--theta)", "middle", 11);
    txt(xs(50), m.t + 14, "gamma", "var(--muted)", "middle", 11);
    [0.5, 1, 2, 5, 10, 20, 50].forEach(function (f) {
      el("line", { x1: xs(f), x2: xs(f), y1: m.t, y2: H - m.b, stroke: "var(--rule)", "stroke-width": 1 }, zsvg);
      txt(xs(f), H - m.b + 16, String(f), "var(--muted)", "middle", 11);
    });
    for (var k = 0; k <= 4; k++) {
      var v = ymax * k / 4, y = ys(v);
      el("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: "var(--rule)", "stroke-width": k === 0 ? 1.4 : 0.8 }, zsvg);
      txt(m.l - 8, y + 4, fmt(v, v < 10 ? 1 : 0), "var(--muted)", "end", 11);
    }
    txt((m.l + W - m.r) / 2, H - 6, "input frequency (Hz, log scale)", "var(--muted)", "middle", 11.5);
    var yl = el("text", { x: 14, y: (m.t + H - m.b) / 2, transform: "rotate(-90 14 " + ((m.t + H - m.b) / 2) + ")", "text-anchor": "middle", fill: "var(--muted)", "font-size": 11.5, "font-family": "IBM Plex Sans, sans-serif" }, zsvg);
    yl.textContent = "|Z| (MΩ)";
    curves.forEach(function (c) {
      var d = c.Z.map(function (z, i) { return (i ? "L" : "M") + xs(FREQS[i]).toFixed(1) + " " + ys(z).toFixed(1); }).join(" ");
      el("path", { d: d, fill: "none", stroke: c.color, "stroke-width": c.w || 2.4, "stroke-dasharray": c.dash || "", "stroke-linejoin": "round" }, zsvg);
    });
    var main = curves[0];
    var px = xs(FREQS[mt.k]), py = ys(main.Z[mt.k]);
    if (mt.Q > 1.005) {
      el("circle", { cx: px, cy: py, r: 5.5, fill: main.color, stroke: "var(--surface)", "stroke-width": 2 }, zsvg);
      txt(px + 9, py - 8, fmt(FREQS[mt.k], 1) + " Hz", main.color, "start", 12, 700);
    }
    // legend
    var lx = W - m.r - 190, ly = m.t + 30;
    curves.forEach(function (c, i) {
      el("line", { x1: lx, x2: lx + 22, y1: ly + i * 17, y2: ly + i * 17, stroke: c.color, "stroke-width": 2.4, "stroke-dasharray": c.dash || "" }, zsvg);
      txt(lx + 28, ly + i * 17 + 4, c.label, "var(--ink)", "start", 11.5);
    });
  }
  function niceMax(v) { var e = Math.pow(10, Math.floor(Math.log10(v))); var n = v / e; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * e; }
  function txt(x, y, s, fill, anchor, size, weight, svg) {
    var t = el("text", { x: x, y: y, fill: fill, "text-anchor": anchor || "start", "font-size": size || 11, "font-family": "IBM Plex Sans, sans-serif", "font-weight": weight || 400 }, svg || zsvg);
    t.textContent = s; return t;
  }

  function drawGates(p, rest) {
    while (gsvg.firstChild) gsvg.removeChild(gsvg.firstChild);
    var GW = 640, GH = 210, g = { l: 56, r: 16, t: 14, b: 36 };
    function gx(v) { return g.l + (v + 110) / 90 * (GW - g.l - g.r); }
    function gy(o) { return GH - g.b - o * (GH - g.t - g.b); }
    [-110, -90, -70, -50, -30].forEach(function (v) {
      el("line", { x1: gx(v), x2: gx(v), y1: g.t, y2: GH - g.b, stroke: "var(--rule)" }, gsvg);
      txt(gx(v), GH - g.b + 15, String(v), "var(--muted)", "middle", 11, 400, gsvg);
    });
    [0, 0.5, 1].forEach(function (o) { el("line", { x1: g.l, x2: GW - g.r, y1: gy(o), y2: gy(o), stroke: "var(--rule)" }, gsvg); txt(g.l - 8, gy(o) + 4, String(o), "var(--muted)", "end", 11, 400, gsvg); });
    txt((g.l + GW - g.r) / 2, GH - 4, "membrane voltage (mV)", "var(--muted)", "middle", 11.5, 400, gsvg);
    var yl = el("text", { x: 14, y: (g.t + GH - g.b) / 2, transform: "rotate(-90 14 " + ((g.t + GH - g.b) / 2) + ")", "text-anchor": "middle", fill: "var(--muted)", "font-size": 11.5, "font-family": "IBM Plex Sans, sans-serif" }, gsvg);
    yl.textContent = "open fraction";
    var gates = [
      { f: function (v) { return CA1.hInf(v, p); }, c: "var(--t-h)", lab: "h∞ (I_h)", at: rest.vd },
      { f: function (v) { return CA1.zInf(v, p); }, c: "var(--t-syn)", lab: "z∞ (I_M)", at: rest.vs },
      { f: function (v) { return CA1.pInf(v, p); }, c: "var(--t-ax)", lab: "p∞ (I_NaP)", at: rest.vs }
    ];
    gates.forEach(function (G, i) {
      var d = ""; for (var v = -110; v <= -20; v += 1) d += (v === -110 ? "M" : "L") + gx(v).toFixed(1) + " " + gy(G.f(v)).toFixed(1) + " ";
      el("path", { d: d, fill: "none", stroke: G.c, "stroke-width": 2.2 }, gsvg);
      el("circle", { cx: gx(G.at), cy: gy(G.f(G.at)), r: 5, fill: G.c, stroke: "var(--surface)", "stroke-width": 1.5 }, gsvg);
      txt(GW - g.r - 120, g.t + 14 + i * 16, G.lab, G.c, "start", 11.5, 600, gsvg);
    });
    el("line", { x1: gx(rest.vd), x2: gx(rest.vd), y1: g.t, y2: GH - g.b, stroke: "var(--dend)", "stroke-dasharray": "4 3" }, gsvg);
    el("line", { x1: gx(rest.vs), x2: gx(rest.vs), y1: g.t, y2: GH - g.b, stroke: "var(--soma)", "stroke-dasharray": "4 3" }, gsvg);
    txt(gx(rest.vd) + 4, g.t + 10, "V_d", "var(--dend)", "start", 11, 600, gsvg);
    txt(gx(rest.vs) - 4, g.t + 10, "V_s", "var(--soma)", "end", 11, 600, gsvg);
  }

  function update() {
    $("o-gh").textContent = fmt(+S.gh.value, 2) + " µS";
    $("o-ths").textContent = "× " + fmt(Math.exp(+S.ths.value), 2);
    $("o-gax").textContent = fmt(+S.gax.value, 2) + " µS";
    $("o-gl").textContent = fmt(+S.gl.value, 3) + " µS";
    $("o-gm").textContent = fmt(+S.gm.value, 2) + " µS";
    $("o-gnap").textContent = fmt(+S.gnap.value, 2) + " µS";
    $("o-vh").textContent = fmt(+S.vh.value, 1) + " mV";
    S.vh.disabled = !S.hold.checked;
    S.ths.disabled = false;

    var p = params();
    var rest = S.hold.checked ? CA1.restHeld(p, +S.vh.value) : CA1.restFree(p);
    var R = $("readout");
    if (!rest) { R.innerHTML = '<p class="warnline">No resting state: the cell would fire on its own. Turn on "Hold soma at" or lower g<sub>NaP</sub>.</p>'; return; }
    var Z = CA1.impedance(p, FREQS, rest);
    var pp = CA1.defaults(); pp.g_ax = p.g_ax; pp.gL_s = pp.gL_d = p.gL_s;
    var Zp = CA1.impedance(pp, FREQS, { vs: -70, vd: -70 });
    var local = state.site === "d" ? Z.Zdd : Z.Zss, transfer = Z.Zsd; // Zsd == Zds for this network
    var localP = state.site === "d" ? Zp.Zdd : Zp.Zss;
    var nameL = state.site === "d" ? "Z_dd · at dendrite" : "Z_ss · at soma";
    var nameT = state.site === "d" ? "Z_sd · at soma" : "Z_ds · at dendrite";
    var cL = state.site === "d" ? "var(--dend)" : "var(--soma)", cT = state.site === "d" ? "var(--soma)" : "var(--dend)";
    var mt = CA1.metrics(FREQS, local), mtT = CA1.metrics(FREQS, transfer);
    drawZ([{ Z: local, color: cL, label: nameL }, { Z: transfer, color: cT, label: nameT, w: 2 }, { Z: localP, color: "var(--muted)", label: "passive reference", dash: "5 4", w: 1.6 }], rest, mt);
    drawGates(p, rest);

    function at(Zarr, f) { var k = 0; for (var i = 1; i < FREQS.length; i++) if (Math.abs(FREQS[i] - f) < Math.abs(FREQS[k] - f)) k = i; return Zarr[k]; }
    var verdict, cls;
    if (mt.Q < 1.02) { verdict = "Low-pass filter"; cls = "todo"; }
    else if (mt.fres < 4) { verdict = "Resonant, below theta (" + fmt(mt.fres, 1) + " Hz)"; cls = "warn"; }
    else if (mt.fres <= 12) { verdict = "Theta resonance (" + fmt(mt.fres, 1) + " Hz)"; cls = "ok"; }
    else { verdict = "Resonant above theta (" + fmt(mt.fres, 1) + " Hz)"; cls = "warn"; }
    var near = (rest.vs > -52) ? '<p class="warnline">Soma rests above −52 mV: the LIF soma (threshold −50 mV) would be close to firing.</p>' : "";
    R.innerHTML =
      '<div class="tile"><b>' + fmt(rest.vs, 1) + '</b><span>V<sub>s</sub> at rest (mV)</span></div>' +
      '<div class="tile"><b>' + fmt(rest.vd, 1) + '</b><span>V<sub>d</sub> at rest (mV)</span></div>' +
      (S.hold.checked ? '<div class="tile"><b>' + fmt(rest.Ihold, 3) + '</b><span>holding current (nA)</span></div>' : '') +
      '<div class="tile"><b>' + (mt.Q < 1.005 ? "none" : fmt(mt.fres, 1) + " Hz") + '</b><span>peak, ' + (state.site === "d" ? "Z<sub>dd</sub>" : "Z<sub>ss</sub>") + '</span></div>' +
      '<div class="tile"><b>' + fmt(mt.Q, 2) + '</b><span>Q, ' + (state.site === "d" ? "Z<sub>dd</sub>" : "Z<sub>ss</sub>") + ' (transfer ' + fmt(mtT.Q, 2) + ')</span></div>' +
      '<div class="tile"><b>' + fmt(at(local, 8), 2) + ' / ' + fmt(at(local, 40), 2) + '</b><span>|Z| at 8 / 40 Hz (MΩ)</span></div>' +
      '<div class="tile"><b>' + fmt(CA1.tauH(rest.vd, p), 0) + ' ms</b><span>τ<sub>h</sub> at V<sub>d</sub></span></div>' +
      '<div class="verdict"><span class="chip ' + cls + '">' + verdict + '</span></div>' + near;
  }
  applyPreset("lowet");
})();

