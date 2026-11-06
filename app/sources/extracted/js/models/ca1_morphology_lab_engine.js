
/* CA1 Morphology Lab · engine.js
   The same model as ca1_morph.py, line for line, so the page and Python give the same numbers.
   Units: t ms · V mV · µm · C nF · g µS · I nA.   g(µS) = gbar(mS/cm²) × area(µm²) × 1e-5. */
var LAB = (function () {
  "use strict";

  function defaults() {
    return {
      Cm: 1.0, Rm: 30000, Ra: 150, E_L: -70, soma_diam: 20, spine_factor: 2.0, spine_start: 100, max_seg: 20,
      gh_soma: 0.05, gh_fold: 6, gh_dist: 350, E_h: -30, h_vhalf: -90, h_k: 8.5,
      h_kin: "bell", h_tau_peak: 40, h_vtau: -75, h_tau_scale: 1,
      spikes: false, g_na: 50, g_kdr: 10, g_na_dend: 0, VT: -58, E_Na: 50, E_K: -90,
      g_m_soma: 0, m_taumax: 1000, dt: 0.025
    };
  }

  /* ---------- 1. morphology -> compartments ---------- */
  function build(morph, p) {
    var soma = morph.soma, a2 = 0, ns = soma.length / 2;
    for (var i = 0; i < ns; i++) {          // shoelace area of the soma outline
      var j = (i + ns - 1) % ns;
      a2 += soma[2 * i] * soma[2 * j + 1] - soma[2 * i + 1] * soma[2 * j];
    }
    var rs = p.soma_diam > 0 ? p.soma_diam / 2 : Math.sqrt(Math.abs(a2) / 2 / Math.PI);   // outline area -> equivalent sphere
    var C = { parent: [-1], length: [2 * rs], diam: [2 * rs], area: [4 * Math.PI * rs * rs], dist: [0], kind: [1],
              x: [0], y: [0], draw: [], rs: rs };
    var secLast = [], secEnd = [];
    morph.sections.forEach(function (sec) {
      var typ = sec[0], par = sec[1], P = sec[2], R = sec[3], np_ = R.length;
      var s = [0];
      for (var k = 1; k < np_; k++) {
        var dx = P[3 * k] - P[3 * k - 3], dy = P[3 * k + 1] - P[3 * k - 2], dz = P[3 * k + 2] - P[3 * k - 1];
        s.push(s[k - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz));
      }
      var Ls = s[np_ - 1] > 0 ? s[np_ - 1] : 1e-3;
      var nseg = Math.max(1, Math.ceil(Ls / p.max_seg));
      var prev = par < 0 ? 0 : secLast[par], d0 = par < 0 ? 0 : secEnd[par], first = C.parent.length;
      for (var q = 0; q < nseg; q++) {
        var a = Ls * q / nseg, b = Ls * (q + 1) / nseg, rr = 0;
        for (var u = 0; u < 5; u++) rr += interp(a + (b - a) * u / 4, s, R);
        var dk = 2 * rr / 5, Lk = b - a, dd = d0 + (a + b) / 2, sf = dd > p.spine_start ? p.spine_factor : 1;
        C.parent.push(prev); C.length.push(Lk); C.diam.push(dk); C.area.push(Math.PI * dk * Lk * sf);
        C.dist.push(dd); C.kind.push(typ);
        C.x.push(interpXYZ((a + b) / 2, s, P, 0)); C.y.push(interpXYZ((a + b) / 2, s, P, 1));
        prev = C.parent.length - 1;
      }
      secLast.push(prev); secEnd.push(d0 + Ls);
      for (var k2 = 0; k2 < np_ - 1; k2++) {
        var sm = 0.5 * (s[k2] + s[k2 + 1]);
        var ci = first + Math.min(nseg - 1, Math.floor(sm / Ls * nseg));
        C.draw.push([P[3 * k2], P[3 * k2 + 1], P[3 * k2 + 3], P[3 * k2 + 4], ci, R[k2] + R[k2 + 1]]);
      }
    });
    var n = C.parent.length;
    C.n = n;
    C.gax = new Float64Array(n);
    function half(j) {
      if (j === 0) return 0;
      var Lcm = C.length[j] * 1e-4 / 2, rcm = C.diam[j] * 1e-4 / 2;
      return p.Ra * Lcm / (Math.PI * rcm * rcm);          // Ω
    }
    for (var i2 = 1; i2 < n; i2++) C.gax[i2] = 1e6 / (half(i2) + half(C.parent[i2]));   // µS
    C.axsum = new Float64Array(n);
    for (var i3 = 1; i3 < n; i3++) { C.axsum[i3] += C.gax[i3]; C.axsum[C.parent[i3]] += C.gax[i3]; }
    return C;
  }
  function interp(x, xs, ys) {
    if (x <= xs[0]) return ys[0];
    for (var i = 1; i < xs.length; i++) if (x <= xs[i]) { var t = (x - xs[i - 1]) / ((xs[i] - xs[i - 1]) || 1); return ys[i - 1] + t * (ys[i] - ys[i - 1]); }
    return ys[ys.length - 1];
  }
  function interpXYZ(x, xs, P, c) {
    var ys = []; for (var i = 0; i < xs.length; i++) ys.push(P[3 * i + c]);
    return interp(x, xs, ys);
  }

  /* ---------- 2. channel densities (µS per compartment) ---------- */
  function densities(C, p) {
    var n = C.n, D = { C: new Float64Array(n), gL: new Float64Array(n), gh: new Float64Array(n), gna: new Float64Array(n),
                        gk: new Float64Array(n), gm: new Float64Array(n), ghDensity: new Float64Array(n) };
    for (var i = 0; i < n; i++) {
      var A = C.area[i] * 1e-5, k = C.kind[i], d = C.dist[i];
      var frac = Math.min(Math.max(d / p.gh_dist, 0), 1);
      var gh = k === 4 ? p.gh_soma * (1 + (p.gh_fold - 1) * frac) : p.gh_soma;
      var near = k === 1 || (k === 4 && d < 50);
      D.C[i] = p.Cm * A; D.gL[i] = A / p.Rm * 1e3; D.gh[i] = gh * A; D.ghDensity[i] = gh;
      D.gna[i] = p.spikes ? (near ? p.g_na : k === 4 ? p.g_na_dend : 0) * A : 0;
      D.gk[i] = p.spikes ? (near ? p.g_kdr : k === 4 ? 0.4 * p.g_kdr : 0) * A : 0;
      D.gm[i] = k === 1 ? p.g_m_soma * A : 0;
    }
    return D;
  }

  /* ---------- 3. gates ---------- */
  function hInf(V, p) { return 1 / (1 + Math.exp((V - p.h_vhalf) / p.h_k)); }
  function tauH(V, p) {
    var t = p.h_kin === "lowet2023"
      ? 1 / (Math.exp(-17.9 - 0.116 * V) + Math.exp(-1.84 + 0.09 * V)) + 0.1
      : 2 * p.h_tau_peak / (Math.exp((V - p.h_vtau) / 15) + Math.exp(-(V - p.h_vtau) / 15));
    return p.h_tau_scale * t;
  }
  function vtrap(x, y) { return Math.abs(x / y) < 1e-6 ? y * (1 - x / y / 2) : x / (Math.exp(x / y) - 1); }
  function naRates(V, p) { var u = V - p.VT; return [0.32 * vtrap(13 - u, 4), 0.28 * vtrap(u - 40, 5), 0.128 * Math.exp((17 - u) / 18), 4 / (1 + Math.exp((40 - u) / 5))]; }
  function kRates(V, p) { var u = V - p.VT; return [0.032 * vtrap(15 - u, 5), 0.5 * Math.exp((10 - u) / 40)]; }
  function mInf(V) { return 1 / (1 + Math.exp(-(V + 35) / 10)); }
  function tauM(V, p) { return p.m_taumax / (3.3 * Math.exp((V + 35) / 20) + Math.exp(-(V + 35) / 20)); }

  /* ---------- 4. Hines solver (real) ----------
     Each row: d[i]·V[i] − gax[i]·V[parent] − Σchildren gax[c]·V[c] = b[i].  Parent index < child index. */
  function hines(par, gax, d, b, V) {
    var n = d.length;
    for (var i = n - 1; i > 0; i--) { var f = gax[i] / d[i], q = par[i]; d[q] -= f * gax[i]; b[q] += f * b[i]; }
    V[0] = b[0] / d[0];
    for (var i2 = 1; i2 < n; i2++) V[i2] = (b[i2] + gax[i2] * V[par[i2]]) / d[i2];
    return V;
  }
  /* complex version: separate real/imag arrays */
  function hinesC(par, gax, dr, di, br, bi, Vr, Vi) {
    var n = dr.length;
    for (var i = n - 1; i > 0; i--) {
      var q = par[i], den = dr[i] * dr[i] + di[i] * di[i];
      var fr = gax[i] * dr[i] / den, fi = -gax[i] * di[i] / den;          // f = gax / d
      dr[q] -= fr * gax[i]; di[q] -= fi * gax[i];
      br[q] += fr * br[i] - fi * bi[i]; bi[q] += fr * bi[i] + fi * br[i];
    }
    var d0 = dr[0] * dr[0] + di[0] * di[0];
    Vr[0] = (br[0] * dr[0] + bi[0] * di[0]) / d0; Vi[0] = (bi[0] * dr[0] - br[0] * di[0]) / d0;
    for (var j = 1; j < n; j++) {
      var nr = br[j] + gax[j] * Vr[par[j]], ni = bi[j] + gax[j] * Vi[par[j]], dd = dr[j] * dr[j] + di[j] * di[j];
      Vr[j] = (nr * dr[j] + ni * di[j]) / dd; Vi[j] = (ni * dr[j] - nr * di[j]) / dd;
    }
  }

  /* ---------- 5. exact resting state ---------- */
  function rest(C, p, D) {
    var n = C.n, V = new Float64Array(n).fill(p.E_L), Vn = new Float64Array(n), d = new Float64Array(n), b = new Float64Array(n);
    for (var it = 0; it < 80; it++) {
      for (var i = 0; i < n; i++) {
        var h = hInf(V[i], p), gm = D.gm[i] * mInf(V[i]);
        d[i] = D.gL[i] + D.gh[i] * h + gm + C.axsum[i];
        b[i] = D.gL[i] * p.E_L + D.gh[i] * h * p.E_h + gm * p.E_K;
      }
      hines(C.parent, C.gax, d, b, Vn);
      var err = 0;
      for (var k = 0; k < n; k++) { err = Math.max(err, Math.abs(Vn[k] - V[k])); V[k] = 0.5 * V[k] + 0.5 * Vn[k]; }
      if (err < 1e-7) break;
    }
    return V;
  }

  /* ---------- 6. time simulation (generator: runs in chunks so the page stays responsive) ---------- */
  function Sim(C, p, opts) {
    var D = densities(C, p), n = C.n, dt = p.dt;
    var V = rest(C, p, D), h = new Float64Array(n), m = new Float64Array(n), hn = new Float64Array(n), nk = new Float64Array(n), z = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      h[i] = hInf(V[i], p); var r = naRates(V[i], p), kr = kRates(V[i], p);
      m[i] = r[0] / (r[0] + r[1]); hn[i] = r[2] / (r[2] + r[3]); nk[i] = kr[0] / (kr[0] + kr[1]); z[i] = mInf(V[i]);
    }
    var d = new Float64Array(n), b = new Float64Array(n), Vn = new Float64Array(n);
    var step = 0, nsteps = Math.round(opts.T / dt), save = Math.max(1, Math.round((opts.every || 0.5) / dt));
    var out = { t: [], Vrec: opts.record.map(function () { return []; }), frames: [], spikes: [], V0: Float64Array.from(V) };
    this.out = out; this.D = D;
    this.run = function (budgetSteps) {
      var end = Math.min(nsteps, step + budgetSteps);
      for (; step <= end; step++) {
        var t = step * dt;
        if (step % save === 0) {
          out.t.push(t); opts.record.forEach(function (c, j) { out.Vrec[j].push(V[c]); });
          if (opts.frames) out.frames.push(Float32Array.from(V));
        }
        var Iinj = opts.I(t);
        for (var i = 0; i < n; i++) {
          var v = V[i];
          var hi = hInf(v, p); h[i] = hi + (h[i] - hi) * Math.exp(-dt / tauH(v, p));
          var G = D.gL[i] + D.gh[i] * h[i], E = D.gL[i] * p.E_L + D.gh[i] * h[i] * p.E_h;
          if (D.gna[i] > 0 || D.gk[i] > 0) {
            var r = naRates(v, p), kr = kRates(v, p), tm = 1 / (r[0] + r[1]), th = 1 / (r[2] + r[3]), tk = 1 / (kr[0] + kr[1]);
            m[i] = r[0] * tm + (m[i] - r[0] * tm) * Math.exp(-dt / tm);
            hn[i] = r[2] * th + (hn[i] - r[2] * th) * Math.exp(-dt / th);
            nk[i] = kr[0] * tk + (nk[i] - kr[0] * tk) * Math.exp(-dt / tk);
            var gna = D.gna[i] * m[i] * m[i] * m[i] * hn[i], gk = D.gk[i] * nk[i] * nk[i] * nk[i] * nk[i];
            G += gna + gk; E += gna * p.E_Na + gk * p.E_K;
          }
          if (D.gm[i] > 0) { var zi = mInf(v); z[i] = zi + (z[i] - zi) * Math.exp(-dt / tauM(v, p)); var gmm = D.gm[i] * z[i]; G += gmm; E += gmm * p.E_K; }
          d[i] = D.C[i] / dt + G + C.axsum[i];
          b[i] = D.C[i] / dt * v + E + (i === opts.site ? Iinj : 0) + (i === 0 ? (opts.hold || 0) : 0);
        }
        var v0 = V[0];
        hines(C.parent, C.gax, d, b, Vn);
        V.set(Vn);
        if (v0 < 0 && V[0] >= 0) out.spikes.push(t);
      }
      return step > nsteps;
    };
    this.progress = function () { return Math.min(1, step / nsteps); };
  }

  /* ---------- 7. impedance (quasi-active, complex Hines) ---------- */
  function admittance(C, p, D, V0, f, yr, yi) {
    var w = 2 * Math.PI * f / 1000;
    for (var i = 0; i < C.n; i++) {
      var v = V0[i], hi = hInf(v, p), dhi = -hi * (1 - hi) / p.h_k, th = tauH(v, p);
      var a = D.gh[i] * (v - p.E_h) * dhi, den = 1 + w * w * th * th;     // a / (1 + iωτ)
      yr[i] = D.gL[i] + D.gh[i] * hi + a / den + C.axsum[i];
      yi[i] = w * D.C[i] - a * w * th / den;
      if (D.gm[i] > 0) {
        var zi = mInf(v), dzi = zi * (1 - zi) / 10, tm = tauM(v, p), am = D.gm[i] * (v - p.E_K) * dzi, dm = 1 + w * w * tm * tm;
        yr[i] += D.gm[i] * zi + am / dm; yi[i] -= am * w * tm / dm;
      }
    }
  }
  /* Z from one site to every compartment, for each frequency: returns {abs:[f][n], phase:[f][n]} */
  function impedanceFrom(C, p, site, freqs, V0) {
    var D = densities(C, p); V0 = V0 || rest(C, p, D);
    var n = C.n, yr = new Float64Array(n), yi = new Float64Array(n), br = new Float64Array(n), bi = new Float64Array(n),
        Vr = new Float64Array(n), Vi = new Float64Array(n), abs = [], ph = [];
    freqs.forEach(function (f) {
      admittance(C, p, D, V0, f, yr, yi);
      br.fill(0); bi.fill(0); br[site] = 1;
      hinesC(C.parent, C.gax, Float64Array.from(yr), Float64Array.from(yi), br, bi, Vr, Vi);
      var a = new Float64Array(n), q = new Float64Array(n);
      for (var i = 0; i < n; i++) { a[i] = Math.hypot(Vr[i], Vi[i]); q[i] = Math.atan2(Vi[i], Vr[i]); }
      abs.push(a); ph.push(q);
    });
    return { abs: abs, phase: ph, V0: V0 };
  }
  /* local resonance at every compartment (N solves per frequency) */
  function resonanceMap(C, p, freqs, onProgress) {
    var D = densities(C, p), V0 = rest(C, p, D), n = C.n;
    var Z = freqs.map(function () { return new Float64Array(n); });
    var yr = new Float64Array(n), yi = new Float64Array(n), br = new Float64Array(n), bi = new Float64Array(n),
        Vr = new Float64Array(n), Vi = new Float64Array(n), dr = new Float64Array(n), di = new Float64Array(n);
    freqs.forEach(function (f, fi) {
      admittance(C, p, D, V0, f, yr, yi);
      for (var s = 0; s < n; s++) {
        dr.set(yr); di.set(yi); br.fill(0); bi.fill(0); br[s] = 1;
        hinesC(C.parent, C.gax, dr, di, br, bi, Vr, Vi);
        Z[fi][s] = Math.hypot(Vr[s], Vi[s]);
      }
    });
    var fres = new Float64Array(n), Q = new Float64Array(n);
    for (var s2 = 0; s2 < n; s2++) {
      var k = 0; for (var fi2 = 1; fi2 < freqs.length; fi2++) if (Z[fi2][s2] > Z[k][s2]) k = fi2;
      fres[s2] = freqs[k]; Q[s2] = Z[k][s2] / Z[0][s2];
    }
    return { fres: fres, Q: Q, Z: Z, V0: V0 };
  }

  return { defaults: defaults, build: build, densities: densities, rest: rest, Sim: Sim,
           impedanceFrom: impedanceFrom, resonanceMap: resonanceMap, hInf: hInf, tauH: tauH };
})();


