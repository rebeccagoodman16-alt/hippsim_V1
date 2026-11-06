/* Extracted from Little Neural Guide wb-phase.js */
/* ===================== PHASE-PLANE WORKBENCH =====================
   Route /workbench/phase-plane/?sys=morris-lecar&I=40 …
   Any 2-D system dx/dt = f(x,y), dy/dt = g(x,y): built-in neuron and population models, normal forms,
   or equations you type. Shows the vector field, nullclines (marching squares), fixed points with
   Jacobian eigenvalues, saddle manifolds, click-to-launch trajectories (RK4 or Euler, with optional
   spike resets) and a one-parameter bifurcation diagram. Exports the same system as NumPy/SciPy code.
   One small expression language is translated to both JavaScript and Python. */
(function () {
  'use strict';
  const $ = WB.$, F = WB.fmt;

  /* ---------- systems ----------
     vars: [x, y] names; defs: helper expressions evaluated first; f, g: right-hand sides;
     params: { name: [value, min, max, step, unit, help] }; reset: optional spike rule. */
  const SYS = {
    'fhn': { label: 'FitzHugh–Nagumo', group: 'Neuron models', vars: ['v', 'w'], units: ['', ''],
      f: 'v - v^3/3 - w + I', g: '(v + a - b*w)/tau',
      params: { I: [0.5, -1, 2, 0.01, '', 'Applied current. Near I ≈ 0.33 the rest point loses stability (Hopf) and the cell fires repetitively.'], a: [0.7, -1, 2, 0.01, ''], b: [0.8, 0, 2, 0.01, ''], tau: [12.5, 0.5, 50, 0.1, '', 'Time-scale separation between the fast voltage and the slow recovery variable.'] },
      xlim: [-2.5, 2.5], ylim: [-1, 2.5], T: 200, dt: 0.05, ref: 'FitzHugh (1961); Nagumo et al. (1962)',
      note: 'The cubic v-nullcline and the straight w-nullcline. Excitability is the shape of the cubic: a small kick returns directly, a big one makes the long excursion around it (a spike).' },
    'morris-lecar': { label: 'Morris–Lecar (Hopf, class II)', group: 'Neuron models', vars: ['V', 'w'], units: ['mV', ''],
      defs: [['minf', '0.5*(1 + tanh((V - V1)/V2))'], ['winf', '0.5*(1 + tanh((V - V3)/V4))'], ['tauw', '1/cosh((V - V3)/(2*V4))']],
      f: '(I - gL*(V - EL) - gCa*minf*(V - ECa) - gK*w*(V - EK))/C', g: 'phi*(winf - w)/tauw',
      params: { I: [90, 0, 300, 0.5, 'µA/cm²', 'Sweep I in the Bifurcation tab: oscillations appear near I ≈ 89 at finite amplitude and frequency, while the rest point stays stable up to I ≈ 94. That bistable range is the mark of a subcritical Hopf.'], gCa: [4.4, 0, 10, 0.05, 'mS/cm²'], gK: [8, 0, 20, 0.1, 'mS/cm²'], gL: [2, 0, 5, 0.05, 'mS/cm²'],
        ECa: [120, 50, 150, 1, 'mV'], EK: [-84, -100, -60, 1, 'mV'], EL: [-60, -80, -40, 1, 'mV'], V1: [-1.2, -20, 20, 0.1, 'mV'], V2: [18, 5, 40, 0.1, 'mV'], V3: [2, -20, 30, 0.1, 'mV', 'w half-activation; raising it to 12 (with V4 = 17.4) gives the SNIC version.'], V4: [30, 5, 40, 0.1, 'mV'], phi: [0.04, 0.005, 0.5, 0.001, '1/ms'], C: [20, 1, 40, 0.5, 'µF/cm²'] },
      xlim: [-75, 50], ylim: [-0.05, 0.6], T: 600, dt: 0.1, ref: 'Morris & Lecar (1981); parameters from Rinzel & Ermentrout (1998)',
      note: 'A barnacle-muscle model with an instantaneous Ca²⁺ current and a slow K⁺ gate w. With these parameters the rest state loses stability through a Hopf bifurcation.' },
    'morris-lecar-snic': { label: 'Morris–Lecar (SNIC, class I)', group: 'Neuron models', vars: ['V', 'w'], units: ['mV', ''], same: 'morris-lecar',
      paramOverride: { I: 35, gCa: 4, V3: 12, V4: 17.4, phi: 0.0667 }, xlim: [-75, 50], ylim: [-0.05, 0.6], T: 800, dt: 0.1, ref: 'Rinzel & Ermentrout (1998), SNIC parameter set',
      note: 'At I = 35 there are three fixed points: a stable node (rest), a saddle (the threshold, with its separatrix dashed) and an unstable focus. Raise I past ≈ 40: the node and saddle collide on the limit cycle (saddle-node on invariant circle), so firing starts at arbitrarily low frequency.' },
    'hh-reduced': { label: 'Reduced Hodgkin–Huxley (V, n)', group: 'Neuron models', vars: ['V', 'n'], units: ['mV', ''],
      defs: [['am', '0.1*(V + 40)/(1 - exp(-(V + 40)/10))'], ['bm', '4*exp(-(V + 65)/18)'], ['minf', 'am/(am + bm)'], ['an', '0.01*(V + 55)/(1 - exp(-(V + 55)/10))'], ['bn', '0.125*exp(-(V + 65)/80)'], ['h', '0.89 - 1.1*n']],
      f: '(I - gNa*minf^3*h*(V - ENa) - gK*n^4*(V - EK) - gL*(V - EL))/C', g: 'phi*(an*(1 - n) - bn*n)',
      params: { I: [8, -5, 40, 0.1, 'µA/cm²'], gNa: [120, 0, 200, 1, 'mS/cm²'], gK: [36, 0, 80, 0.5, 'mS/cm²'], gL: [0.3, 0, 2, 0.01, 'mS/cm²'], ENa: [50, 20, 70, 0.5, 'mV'], EK: [-77, -100, -60, 0.5, 'mV'], EL: [-54.4, -80, -40, 0.1, 'mV'], C: [1, 0.5, 3, 0.05, 'µF/cm²'], phi: [1, 0.1, 5, 0.05, '', 'Temperature factor on n (3^((T−6.3)/10)).'] },
      xlim: [-85, 50], ylim: [0.25, 0.85], T: 100, dt: 0.01, ref: 'Rinzel (1985): m = m∞(V) and h ≈ 0.89 − 1.1n',
      note: 'HH reduced to two variables: m is set instantaneously, and h is slaved to n along the line h + 1.1n ≈ 0.89 that full HH trajectories follow.' },
    'izhikevich': { label: 'Izhikevich (v, u) with reset', group: 'Neuron models', vars: ['v', 'u'], units: ['mV', ''],
      f: '0.04*v^2 + 5*v + 140 - u + I', g: 'a*(b*v - u)', reset: { when: 'v >= 30', set: { v: 'c', u: 'u + d' } },
      params: { I: [10, -5, 40, 0.1, ''], a: [0.02, 0.001, 0.2, 0.001, ''], b: [0.2, -0.5, 0.5, 0.005, ''], c: [-65, -80, -40, 0.5, 'mV'], d: [8, -5, 15, 0.1, ''] },
      xlim: [-90, 35], ylim: [-20, 10], T: 300, dt: 0.05, ref: 'Izhikevich (2003) IEEE Trans Neural Netw 14:1569',
      note: 'The v-nullcline is a parabola, the u-nullcline a line. With reset rules the trajectory jumps from v = 30 to v = c (dashed jumps). Bursting comes from where the reset lands relative to the nullclines.' },
    'adex': { label: 'AdEx (V, w) with reset', group: 'Neuron models', vars: ['V', 'w'], units: ['mV', 'pA'],
      f: '(-gL*(V - EL) + gL*DT*exp((V - VT)/DT) - w + I)/C', g: '(a*(V - EL) - w)/tauw', reset: { when: 'V >= 0', set: { V: 'Vr', w: 'w + b' } },
      params: { I: [500, -200, 1000, 5, 'pA'], C: [200, 10, 500, 1, 'pF'], gL: [12, 1, 50, 0.5, 'nS'], EL: [-70, -90, -50, 0.5, 'mV'], VT: [-50, -65, -35, 0.5, 'mV'], DT: [2, 0.2, 6, 0.1, 'mV'], a: [2, -20, 60, 0.5, 'nS'], tauw: [300, 5, 800, 5, 'ms'], b: [60, 0, 300, 1, 'pA'], Vr: [-58, -80, -30, 0.5, 'mV'] },
      xlim: [-80, 0], ylim: [-50, 400], T: 500, dt: 0.05, ref: 'Brette & Gerstner (2005); Naud et al. (2008)',
      note: 'Each spike resets V and kicks w up by b. Where successive resets land relative to the V-nullcline decides tonic, adapting or bursting firing (Naud et al. 2008).' },
    'wilson-cowan': { label: 'Wilson–Cowan E–I populations', group: 'Population models', vars: ['E', 'I'], units: ['', ''],
      defs: [['SE', '1/(1 + exp(-aE*(wEE*E - wEI*I + P - thE))) - 1/(1 + exp(aE*thE))'], ['SI', '1/(1 + exp(-aI*(wIE*E - wII*I + Q - thI))) - 1/(1 + exp(aI*thI))']],
      f: '(-E + (kE - rE*E)*SE)/tauE', g: '(-I + (kI - rI*I)*SI)/tauI',
      params: { P: [1.25, -2, 4, 0.01, '', 'External drive to E. Sweep it to find the Hopf bifurcation to oscillation.'], Q: [0, -2, 4, 0.01, ''], wEE: [16, 0, 30, 0.1, ''], wEI: [12, 0, 30, 0.1, ''], wIE: [15, 0, 30, 0.1, ''], wII: [3, 0, 20, 0.1, ''],
        aE: [1.3, 0.1, 5, 0.01, ''], thE: [4, 0, 8, 0.05, ''], aI: [2, 0.1, 5, 0.01, ''], thI: [3.7, 0, 8, 0.05, ''], tauE: [1, 0.1, 10, 0.05, ''], tauI: [1, 0.1, 10, 0.05, ''], kE: [1, 0, 2, 0.01, '', 'Wilson & Cowan’s refractory factor (1 − rE) — set kE = 1, rE = 0 to remove it.'], rE: [0, 0, 2, 0.01, ''], kI: [1, 0, 2, 0.01, ''], rI: [0, 0, 2, 0.01, ''] },
      xlim: [-0.05, 0.55], ylim: [-0.05, 0.55], T: 100, dt: 0.02, ref: 'Wilson & Cowan (1972) Biophys J 12:1; parameters as in the model lab',
      note: 'Mean activity of an excitatory and an inhibitory population. With strong recurrent excitation the E-nullcline folds; where the I-nullcline crosses its middle branch the fixed point can be unstable and a limit cycle appears (a population rhythm).' },
    'saddle-node': { label: 'Saddle-node normal form', group: 'Normal forms', vars: ['x', 'y'], units: ['', ''],
      f: 'mu - x^2', g: '-y', params: { mu: [0.5, -1, 1, 0.01, '', 'μ > 0: a node and a saddle at x = ±√μ. μ = 0: they merge. μ < 0: no fixed points, the flow passes slowly through the “ghost”.'] },
      xlim: [-2, 2], ylim: [-1.5, 1.5], T: 10, dt: 0.01, ref: 'Strogatz, Nonlinear Dynamics and Chaos, ch. 3',
      note: 'The simplest way to create or destroy fixed points. Neuron models with class I excitability cross this bifurcation at their threshold current.' },
    'hopf': { label: 'Hopf normal form', group: 'Normal forms', vars: ['x', 'y'], units: ['', ''],
      defs: [['r2', 'x^2 + y^2']], f: 'mu*x - omega*y + x*(sigma*r2 - r2^2)', g: 'omega*x + mu*y + y*(sigma*r2 - r2^2)',
      params: { mu: [0.2, -1, 1, 0.01, '', 'Sign of μ decides whether the origin is stable.'], omega: [1, 0, 5, 0.05, '', 'Rotation speed: sets the oscillation frequency at onset.'], sigma: [-1, -1, 1, 1, '', 'σ = −1 supercritical (small stable cycle appears); σ = +1 subcritical (large cycle and bistability).'] },
      xlim: [-2, 2], ylim: [-2, 2], T: 60, dt: 0.01, ref: 'Kuznetsov, Scholarpedia 1(10):1858; Strogatz ch. 8',
      note: 'In polar form ṙ = μr + σr³ − r⁵. Supercritical: the oscillation amplitude grows like √μ from zero. Subcritical: the oscillation appears at finite amplitude and coexists with rest.' },
    'vdp': { label: 'Van der Pol oscillator', group: 'Normal forms', vars: ['x', 'y'], units: ['', ''],
      f: 'y', g: 'mu*(1 - x^2)*y - x', params: { mu: [1, 0, 8, 0.05, '', 'Large μ gives relaxation oscillations: slow drift then fast jumps.'] }, xlim: [-3, 3], ylim: [-5, 5], T: 50, dt: 0.01, ref: 'van der Pol (1926)', note: 'A single stable limit cycle. As μ grows, it becomes a relaxation oscillation like a spiking neuron.' },
    'linear': { label: 'Linear system (classify fixed points)', group: 'Normal forms', vars: ['x', 'y'], units: ['', ''],
      f: 'A11*x + A12*y', g: 'A21*x + A22*y', params: { A11: [-1, -3, 3, 0.05, ''], A12: [-2, -3, 3, 0.05, ''], A21: [1, -3, 3, 0.05, ''], A22: [-0.5, -3, 3, 0.05, ''] },
      xlim: [-3, 3], ylim: [-3, 3], T: 20, dt: 0.01, ref: 'Strogatz ch. 5', note: 'Trace τ and determinant Δ of the matrix decide everything: Δ < 0 saddle; τ² < 4Δ spiral; sign of τ decides stability. Every fixed point of a nonlinear system looks like this up close.' },
    'custom': { label: 'Your own equations', group: 'Custom', vars: ['x', 'y'], units: ['', ''], custom: true,
      f: 'x - x^3/3 - y + I', g: 'eps*(x + 0.7 - 0.8*y)', params: { I: [0.4, -2, 2, 0.01, ''], eps: [0.08, 0, 1, 0.005, ''] },
      xlim: [-3, 3], ylim: [-2, 3], T: 150, dt: 0.02, ref: 'You', note: 'Type any expressions in x and y (rename them if you like). Use ^ for powers and exp, log, sqrt, sin, cos, tanh, cosh, abs, min, max, heav. Parameters are “name = value” lines and become sliders.' },
  };
  // Morris–Lecar SNIC shares the equations of the Hopf set
  Object.entries(SYS).forEach(([k, s]) => { if (s.same) { const b = SYS[s.same]; Object.assign(s, { defs: b.defs, f: b.f, g: b.g, params: Object.fromEntries(Object.entries(b.params).map(([n, v]) => [n, [s.paramOverride[n] ?? v[0], ...v.slice(1)]])) }); } });

  /* ---------- expression language → JS / Python ---------- */
  const FUNCS = { exp: 1, log: 1, sqrt: 1, sin: 1, cos: 1, tan: 1, tanh: 1, cosh: 1, sinh: 1, abs: 1, min: 1, max: 1, pow: 1, atan: 1, heav: 1 };
  const MF = { exp: x => Math.exp(Math.min(x, 700)), log: Math.log, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, tanh: Math.tanh, cosh: x => Math.cosh(Math.max(-700, Math.min(x, 700))), sinh: Math.sinh, abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, atan: Math.atan, heav: x => x > 0 ? 1 : x < 0 ? 0 : 0.5 };
  const PYF = { exp: 'np.exp', log: 'np.log', sqrt: 'np.sqrt', sin: 'np.sin', cos: 'np.cos', tan: 'np.tan', tanh: 'np.tanh', cosh: 'np.cosh', sinh: 'np.sinh', abs: 'np.abs', min: 'np.minimum', max: 'np.maximum', pow: 'np.power', atan: 'np.arctan', heav: 'heav' };
  function translate(expr, known, py) {
    if (!/^[\w\s+\-*/^().,<>=!&|?:]*$/.test(expr)) throw new Error('Unexpected character in “' + expr + '”');
    return expr.replace(/\^/g, '**').replace(/[A-Za-z_]\w*/g, id => {
      if (FUNCS[id]) return py ? PYF[id] : '__M.' + id;
      if (id === 'pi') return py ? 'np.pi' : 'Math.PI';
      if (known.includes(id)) return id;
      throw new Error('Unknown name “' + id + '”. Define it as a parameter or helper.');
    });
  }
  function compile(sys, P) {
    const pn = Object.keys(P), known = [...sys.vars, ...pn, ...(sys.defs || []).map(d => d[0])];
    const defs = (sys.defs || []).map(([n, e]) => `const ${n} = ${translate(e, known)};`).join('\n');
    const body = `"use strict"; const {${pn.join(',')}} = __P;\n${defs}\nreturn [${translate(sys.f, known)}, ${translate(sys.g, known)}];`;
    const fn = new Function(sys.vars[0], sys.vars[1], '__P', '__M', body);
    let reset = null;
    if (sys.reset) {
      const cond = new Function(sys.vars[0], sys.vars[1], '__P', '__M', `"use strict"; const {${pn.join(',')}} = __P; return (${translate(sys.reset.when, known)});`);
      const sx = new Function(sys.vars[0], sys.vars[1], '__P', '__M', `"use strict"; const {${pn.join(',')}} = __P; return [${translate(sys.reset.set[sys.vars[0]] || sys.vars[0], known)}, ${translate(sys.reset.set[sys.vars[1]] || sys.vars[1], known)}];`);
      reset = { cond: (x, y) => cond(x, y, P, MF), apply: (x, y) => sx(x, y, P, MF) };
    }
    return { rhs: (x, y) => fn(x, y, P, MF), reset };
  }

  /* ---------- numerics ---------- */
  function step(rhs, x, y, h, method) {
    if (method === 'euler') { const k = rhs(x, y); return [x + h * k[0], y + h * k[1]]; }
    const k1 = rhs(x, y), k2 = rhs(x + h / 2 * k1[0], y + h / 2 * k1[1]), k3 = rhs(x + h / 2 * k2[0], y + h / 2 * k2[1]), k4 = rhs(x + h * k3[0], y + h * k3[1]);
    return [x + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
  }
  function integrate(sys, C, x0, y0, T, dt, method, maxPts = 20000) {
    const n = Math.round(Math.abs(T) / dt), h = Math.sign(T) * dt, every = Math.max(1, Math.ceil(n / maxPts));
    const xs = [x0], ys = [y0], ts = [0], jumps = []; let x = x0, y = y0;
    for (let k = 1; k <= n; k++) {
      [x, y] = step(C.rhs, x, y, h, method);
      if (C.reset && T > 0 && C.reset.cond(x, y)) { const [nx, ny] = C.reset.apply(x, y); jumps.push([x, y, nx, ny]); xs.push(x); ys.push(y); ts.push(k * dt); x = nx; y = ny; xs.push(NaN); ys.push(NaN); ts.push(k * dt); }
      if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e8 || Math.abs(y) > 1e8) break;
      if (k % every === 0) { xs.push(x); ys.push(y); ts.push(k * dt); }
    }
    return { x: xs, y: ys, t: ts, jumps };
  }
  function jac(rhs, x, y) {
    const hx = 1e-6 * Math.max(1, Math.abs(x)), hy = 1e-6 * Math.max(1, Math.abs(y));
    const a = rhs(x + hx, y), b = rhs(x - hx, y), c = rhs(x, y + hy), d = rhs(x, y - hy);
    return [[(a[0] - b[0]) / (2 * hx), (c[0] - d[0]) / (2 * hy)], [(a[1] - b[1]) / (2 * hx), (c[1] - d[1]) / (2 * hy)]];
  }
  function eig2(J) {
    const tr = J[0][0] + J[1][1], det = J[0][0] * J[1][1] - J[0][1] * J[1][0], disc = tr * tr - 4 * det;
    if (disc >= 0) { const s = Math.sqrt(disc); return { tr, det, re: [(tr - s) / 2, (tr + s) / 2], im: [0, 0] }; }
    return { tr, det, re: [tr / 2, tr / 2], im: [-Math.sqrt(-disc) / 2, Math.sqrt(-disc) / 2] };
  }
  function classify(e) {
    const tol = 1e-9 * (Math.abs(e.tr) + Math.abs(e.det) + 1);
    if (e.det < -tol) return { kind: 'saddle', stable: false };
    if (Math.abs(e.det) <= tol) return { kind: 'degenerate (det ≈ 0)', stable: false };
    if (e.im[1] !== 0) return Math.abs(e.tr) < tol ? { kind: 'center (linear)', stable: false } : { kind: e.tr < 0 ? 'stable focus (spiral)' : 'unstable focus (spiral)', stable: e.tr < 0 };
    return { kind: e.tr < 0 ? 'stable node' : 'unstable node', stable: e.tr < 0 };
  }
  /** Fixed points: Newton from a grid of seeds, deduplicated in scaled coordinates. */
  function fixedPoints(C, xl, yl, nSeed = 14) {
    const out = [], sx = xl[1] - xl[0], sy = yl[1] - yl[0];
    for (let i = 0; i < nSeed; i++) for (let j = 0; j < nSeed; j++) {
      let x = xl[0] + (i + 0.5) / nSeed * sx, y = yl[0] + (j + 0.5) / nSeed * sy, ok = false;
      for (let it = 0; it < 60; it++) {
        const f = C.rhs(x, y); if (!isFinite(f[0]) || !isFinite(f[1])) break;
        const J = jac(C.rhs, x, y), det = J[0][0] * J[1][1] - J[0][1] * J[1][0]; if (Math.abs(det) < 1e-14) break;
        let dx = (J[1][1] * f[0] - J[0][1] * f[1]) / det, dy = (-J[1][0] * f[0] + J[0][0] * f[1]) / det;
        const lim = 0.25; const sc = Math.max(Math.abs(dx) / (lim * sx), Math.abs(dy) / (lim * sy), 1); dx /= sc; dy /= sc;
        x -= dx; y -= dy;
        if (Math.abs(dx) < 1e-10 * sx && Math.abs(dy) < 1e-10 * sy) { ok = true; break; }
      }
      if (!ok) continue; const f = C.rhs(x, y); if (Math.abs(f[0]) + Math.abs(f[1]) > 1e-6) continue;
      if (x < xl[0] - 0.2 * sx || x > xl[1] + 0.2 * sx || y < yl[0] - 0.2 * sy || y > yl[1] + 0.2 * sy) continue;
      if (out.some(p => Math.abs(p.x - x) < 1e-4 * sx && Math.abs(p.y - y) < 1e-4 * sy)) continue;
      const J = jac(C.rhs, x, y), e = eig2(J); out.push({ x, y, J, e, ...classify(e) });
    }
    return out.sort((a, b) => a.x - b.x);
  }
  /** Marching squares for the zero set of h(x,y) on an n×n grid; returns line segments. */
  function contour0(h, xl, yl, n = 150) {
    const xs = WB.linspace(xl[0], xl[1], n + 1), ys = WB.linspace(yl[0], yl[1], n + 1), v = [];
    for (let j = 0; j <= n; j++) { const row = new Float64Array(n + 1); for (let i = 0; i <= n; i++) row[i] = h(xs[i], ys[j]); v.push(row); }
    const seg = [], lerp = (a, b, fa, fb) => a + (b - a) * fa / (fa - fb);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], d = v[j + 1][i];
      if (![a, b, c, d].every(isFinite)) continue;
      const pts = [];
      if ((a > 0) !== (b > 0)) pts.push([lerp(xs[i], xs[i + 1], a, b), ys[j]]);
      if ((b > 0) !== (c > 0)) pts.push([xs[i + 1], lerp(ys[j], ys[j + 1], b, c)]);
      if ((c > 0) !== (d > 0)) pts.push([lerp(xs[i], xs[i + 1], d, c), ys[j + 1]]);
      if ((d > 0) !== (a > 0)) pts.push([xs[i], lerp(ys[j], ys[j + 1], a, d)]);
      // reject sign changes caused by a pole (huge jump) rather than a zero
      const big = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)); if (big > 1e6) continue;
      if (pts.length === 2) seg.push(pts); else if (pts.length === 4) { seg.push([pts[0], pts[1]]); seg.push([pts[2], pts[3]]); }
    }
    return seg;
  }

  /* ---------- state ---------- */
  let key = 'fhn', sys = null, P = {}, C = null, view = null, trajs = [], fps = [], anim = null, bif = null, custom = null, opt = { field: true, nullc: true, fps: true, manif: true, method: 'rk4', dt: 0.05, T: 200, both: false };

  function currentSys() {
    if (key !== 'custom') return SYS[key];
    return custom;
  }
  function setSystem(k, over = {}) {
    key = SYS[k] ? k : 'fhn';
    if (key === 'custom' && !custom) custom = JSON.parse(JSON.stringify(SYS.custom));
    sys = currentSys();
    P = Object.fromEntries(Object.entries(sys.params).map(([n, v]) => [n, over[n] !== undefined ? +over[n] : v[0]]));
    view = { x0: over.x0 ?? sys.xlim[0], x1: over.x1 ?? sys.xlim[1], y0: over.y0 ?? sys.ylim[0], y1: over.y1 ?? sys.ylim[1] };
    opt.dt = over.dt ?? sys.dt; opt.T = over.T ?? sys.T; if (over.method) opt.method = over.method;
    trajs = []; bif = null; $('pp-bif-sum').innerHTML = ''; const bc = $('pp-bif'); if (bc) { bc._wb = null; bc.getContext('2d').clearRect(0, 0, bc.width, bc.height); }
    $('pp-note').innerHTML = `<b>${sys.label}.</b> ${sys.note} <span class="muted">${sys.ref}.</span>`;
    $('pp-custom').hidden = key !== 'custom'; if (key === 'custom') fillCustom();
    buildPanel(); recompile(); fillBifParams();
    // an initial trajectory so the page never opens empty
    if (over.ic0 !== undefined) launch(+over.ic0, +over.ic1); else { const fp = fps.find(p => p.stable) || fps[0]; if (fp) launch(fp.x + 0.08 * (view.x1 - view.x0), fp.y); else launch(view.x0 + 0.3 * (view.x1 - view.x0), view.y0 + 0.5 * (view.y1 - view.y0)); }
  }
  function recompile() {
    try { C = compile(sys, P); $('pp-err').textContent = ''; } catch (e) { $('pp-err').textContent = e.message; return false; }
    fps = fixedPoints(C, [view.x0, view.x1], [view.y0, view.y1]);
    trajs = trajs.map(t => ({ ...integrate(sys, C, t.x[0], t.y[0], opt.T, opt.dt, opt.method), back: t.back ? integrate(sys, C, t.x[0], t.y[0], -opt.T, opt.dt, opt.method) : null }));
    draw(); info(); WB.setCode('pp-code', python()); saveURL();
    return true;
  }
  function saveURL() {
    const st = { sys: key, ...P, dt: opt.dt, T: opt.T, method: opt.method, x0: view.x0, x1: view.x1, y0: view.y0, y1: view.y1 };
    const b = { ...Object.fromEntries(Object.entries(sys.params).map(([n, v]) => [n, v[0]])), dt: sys.dt, T: sys.T, method: 'rk4', x0: sys.xlim[0], x1: sys.xlim[1], y0: sys.ylim[0], y1: sys.ylim[1] };
    WB.query.set(st, b, ['sys']);
  }

  /* ---------- drawing ---------- */
  function draw() {
    const cv = $('pp-cv'); if (!cv || !C) return; const pal = WB.pal();
    const m = WB.plot(cv, { series: [], xlim: [view.x0, view.x1], ylim: [view.y0, view.y1], xlabel: sys.vars[0] + (sys.units[0] ? ` (${sys.units[0]})` : ''), ylabel: sys.vars[1] + (sys.units[1] ? ` (${sys.units[1]})` : ''), noHover: true, legend: false });
    cv._wb = null; cv._redraw = draw;
    const ctx = cv.getContext('2d'); ctx.save(); ctx.beginPath(); ctx.rect(m.L, m.T, m.w - m.L - m.R, m.h - m.T - m.B); ctx.clip();
    const X = m.X, Y = m.Y, sx = view.x1 - view.x0, sy = view.y1 - view.y0;
    if (opt.field) { // direction field: arrows of equal length, opacity by speed (in screen units)
      const nx = Math.max(10, Math.round((m.w - m.L) / 34)), ny = Math.max(8, Math.round((m.h - m.B) / 34)); let vmax = 0; const vals = [];
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const x = view.x0 + (i + 0.5) / nx * sx, y = view.y0 + (j + 0.5) / ny * sy, d = C.rhs(x, y); const px = d[0] / sx * (m.w - m.L - m.R), py = -d[1] / sy * (m.h - m.T - m.B), sp = Math.hypot(px, py); if (isFinite(sp)) { vals.push([x, y, px, py, sp]); vmax = Math.max(vmax, sp); } }
      ctx.strokeStyle = pal.muted; ctx.fillStyle = pal.muted; ctx.lineWidth = 1;
      vals.forEach(([x, y, px, py, sp]) => { if (!(sp > 0)) return; const L = 11, ux = px / sp * L, uy = py / sp * L, cx = X(x), cy = Y(y); ctx.globalAlpha = 0.25 + 0.6 * Math.pow(sp / vmax, 0.3);
        ctx.beginPath(); ctx.moveTo(cx - ux / 2, cy - uy / 2); ctx.lineTo(cx + ux / 2, cy + uy / 2); ctx.stroke();
        const a = Math.atan2(uy, ux); ctx.beginPath(); ctx.moveTo(cx + ux / 2, cy + uy / 2); ctx.lineTo(cx + ux / 2 - 4 * Math.cos(a - 0.45), cy + uy / 2 - 4 * Math.sin(a - 0.45)); ctx.lineTo(cx + ux / 2 - 4 * Math.cos(a + 0.45), cy + uy / 2 - 4 * Math.sin(a + 0.45)); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    if (opt.nullc) {
      [[0, pal.s[1]], [1, pal.s[4]]].forEach(([k, col]) => { const segs = contour0((x, y) => C.rhs(x, y)[k], [view.x0, view.x1], [view.y0, view.y1], 160);
        ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); segs.forEach(([a, b]) => { ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); }); ctx.stroke(); });
    }
    if (opt.manif) fps.filter(p => p.kind === 'saddle').forEach(p => { // stable manifolds (separatrices) by backward integration along the stable eigenvector
      const J = p.J, lam = p.e.re[0]; let vx = J[0][1], vy = lam - J[0][0]; if (Math.abs(vx) + Math.abs(vy) < 1e-12) { vx = lam - J[1][1]; vy = J[1][0]; }
      const nrm = Math.hypot(vx / sx, vy / sy) || 1; vx /= nrm; vy /= nrm;
      [1, -1].forEach(sgn => { const tr = integrate(sys, { rhs: C.rhs }, p.x + sgn * 1e-3 * vx, p.y + sgn * 1e-3 * vy, -opt.T, opt.dt, 'rk4', 4000);
        ctx.strokeStyle = pal.s[5]; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); let on = false; tr.x.forEach((x, i) => { const y = tr.y[i]; if (!isFinite(x) || x < view.x0 - sx || x > view.x1 + sx || y < view.y0 - sy || y > view.y1 + sy) { on = false; return; } on ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); on = true; }); ctx.stroke(); ctx.setLineDash([]); });
    });
    trajs.forEach((t, k) => {
      const col = pal.s[[0, 2, 3, 6, 7, 5][k % 6]];
      const drawT = (tr, dash) => { if (!tr) return; ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.setLineDash(dash || []); ctx.beginPath(); let on = false; const nShow = t.anim !== undefined ? Math.min(tr.x.length, t.anim) : tr.x.length;
        for (let i = 0; i < nShow; i++) { const x = tr.x[i], y = tr.y[i]; if (!isFinite(x) || !isFinite(y)) { on = false; continue; } on ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); on = true; } ctx.stroke(); ctx.setLineDash([]);
        tr.jumps && tr.jumps.forEach(jp => { ctx.strokeStyle = col; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(X(jp[0]), Y(jp[1])); ctx.lineTo(X(jp[2]), Y(jp[3])); ctx.stroke(); ctx.setLineDash([]); }); };
      drawT(t); drawT(t.back, [3, 3]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(t.x[0]), Y(t.y[0]), 4, 0, 7); ctx.fill();
      if (t.anim !== undefined && t.anim < t.x.length) { const i = Math.max(0, t.anim - 1); if (isFinite(t.x[i])) { ctx.beginPath(); ctx.arc(X(t.x[i]), Y(t.y[i]), 5.5, 0, 7); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); } }
    });
    if (opt.fps) fps.forEach(p => { const cx = X(p.x), cy = Y(p.y); ctx.lineWidth = 2.2; ctx.strokeStyle = pal.ink; ctx.fillStyle = p.stable ? pal.ink : pal.bg;
      ctx.beginPath(); if (p.kind === 'saddle') { ctx.rect(cx - 5.5, cy - 5.5, 11, 11); } else ctx.arc(cx, cy, 6, 0, 7); ctx.fill(); ctx.stroke(); });
    ctx.restore();
    // legend
    const items = [opt.nullc && [pal.s[1], sys.vars[0] + '-nullcline (d' + sys.vars[0] + '/dt = 0)'], opt.nullc && [pal.s[4], sys.vars[1] + '-nullcline'], opt.manif && fps.some(p => p.kind === 'saddle') && [pal.s[5], 'saddle separatrix', true]].filter(Boolean);
    ctx.font = '11px system-ui,sans-serif'; let lx = m.L + 8; const ly = m.T + 10; ctx.fillStyle = pal.bg; ctx.globalAlpha = 0.85; ctx.fillRect(m.L + 3, m.T + 3, items.reduce((s, it) => s + ctx.measureText(it[1]).width + 30, 0) + 6, 16); ctx.globalAlpha = 1;
    items.forEach(([col, lab, dash]) => { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.setLineDash(dash ? [6, 4] : []); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 16, ly); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = pal.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lab, lx + 20, ly); lx += ctx.measureText(lab).width + 30; });
    drawTime();
  }
  function drawTime() {
    const t = trajs[trajs.length - 1], pal = WB.pal(); if (!t || !$('pp-ts')) return;
    const n = t.anim !== undefined ? Math.min(t.anim, t.x.length) : t.x.length;
    WB.plot($('pp-ts'), { series: [{ x: t.t.slice(0, n), y: t.x.slice(0, n), label: sys.vars[0], color: pal.s[0] }], xlabel: 'time', ylabel: sys.vars[0], xlim: [0, opt.T], legend: false });
    WB.plot($('pp-ts2'), { series: [{ x: t.t.slice(0, n), y: t.y.slice(0, n), label: sys.vars[1], color: pal.s[2] }], xlabel: 'time', ylabel: sys.vars[1], xlim: [0, opt.T], legend: false });
  }
  function info() {
    const rows = fps.map((p, i) => { const ev = p.e.im[1] ? `${F(p.e.re[0], 3)} ± ${F(p.e.im[1], 3)}i` : `${F(p.e.re[0], 3)}, ${F(p.e.re[1], 3)}`;
      const z = (v, s) => Math.abs(v) < 1e-9 * s ? 0 : v;
      return `<tr><td>${i + 1}</td><td>(${F(z(p.x, view.x1 - view.x0), 4)}, ${F(z(p.y, view.y1 - view.y0), 4)})</td><td><b>${p.kind}</b></td><td>${ev}</td><td>${F(p.e.tr, 3)}</td><td>${F(p.e.det, 3)}</td>${p.e.im[1] ? `<td>${F(Math.abs(p.e.im[1]) / (2 * Math.PI), 3)}</td>` : '<td>—</td>'}</tr>`; }).join('');
    const t = trajs[trajs.length - 1]; let cyc = '';
    if (t && t.x.length > 50) { const half = Math.floor(t.x.length / 2), xs = t.x.slice(half).filter(isFinite); if (xs.length > 10) { const amp = Math.max(...xs) - Math.min(...xs); const settled = fps.some(p => p.stable && Math.hypot((t.x.at(-1) - p.x) / (view.x1 - view.x0), (t.y.at(-1) - p.y) / (view.y1 - view.y0)) < 0.01);
      cyc = settled ? 'The last trajectory settles onto a stable fixed point.' : amp > 0.05 * (view.x1 - view.x0) ? `The last trajectory keeps oscillating: amplitude in ${sys.vars[0]} ≈ ${F(amp, 3)} over the second half (a limit cycle or a slow transient). Its period is in the time plot below.` : ''; } }
    $('pp-info').innerHTML = (fps.length ? `<div class="table-scroll"><table class="wb-table"><thead><tr><th>#</th><th>(${sys.vars[0]}, ${sys.vars[1]})</th><th>type</th><th>eigenvalues λ</th><th>trace τ</th><th>det Δ</th><th>Im λ/2π</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p>No fixed points in view.</p>')
      + `<p class="muted">Filled circle stable, open circle unstable, square saddle. ${cyc}</p>`;
  }

  /* ---------- trajectories ---------- */
  function launch(x, y) {
    const tr = integrate(sys, C, x, y, opt.T, opt.dt, opt.method); tr.back = opt.both ? integrate(sys, C, x, y, -opt.T, opt.dt, opt.method) : null;
    if (trajs.length >= 8) trajs.shift(); trajs.push(tr);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { draw(); info(); return; }
    tr.anim = 1; cancelAnimationFrame(anim); const t0 = performance.now(), dur = 1400;
    const tick = () => { const f = Math.min(1, (performance.now() - t0) / dur); tr.anim = Math.max(2, Math.round(f * tr.x.length)); draw(); if (f < 1) anim = requestAnimationFrame(tick); else { delete tr.anim; draw(); info(); } };
    anim = requestAnimationFrame(tick);
  }

  /* ---------- bifurcation diagram ---------- */
  function fillBifParams() {
    const sel = $('pp-bp'); sel.innerHTML = Object.keys(sys.params).map(n => `<option value="${n}">${n}</option>`).join('');
    const first = Object.keys(sys.params)[0]; sel.value = first; setBifRange();
  }
  function setBifRange() { const n = $('pp-bp').value, d = sys.params[n]; if (!d) return; $('pp-ba').value = d[1]; $('pp-bb').value = d[2]; }
  function runBif() {
    const pn = $('pp-bp').value, a = +$('pp-ba').value, b = +$('pp-bb').value, N = Math.max(10, Math.min(150, +$('pp-bn').value | 0)), vals = WB.linspace(a, b, N), P0 = { ...P };
    $('pp-brun').disabled = true;
    WB.chunked(vals, v => {
      const Pv = { ...P0, [pn]: v }, Cv = compile(sys, Pv), f = fixedPoints(Cv, [view.x0, view.x1], [view.y0, view.y1], 10);
      // limit cycles: run from two starts, discard the transient, record the range of x
      const cyc = [], seeds = [[view.x0 + 0.85 * (view.x1 - view.x0), view.y0 + 0.5 * (view.y1 - view.y0)], f[0] ? [f[0].x + 0.03 * (view.x1 - view.x0), f[0].y] : [view.x0 + 0.2 * (view.x1 - view.x0), view.y0 + 0.2 * (view.y1 - view.y0)]];
      seeds.forEach(([x, y]) => { const tr = integrate(sys, Cv, x, y, opt.T * 2, opt.dt, 'rk4', 6000), xs = tr.x.slice(Math.floor(tr.x.length * 0.6)).filter(isFinite);
        if (xs.length < 10) return; const mx = Math.max(...xs), mn = Math.min(...xs); if (mx - mn > 0.02 * (view.x1 - view.x0)) cyc.push([mn, mx]); });
      return { v, f, cyc };
    }, p => $('pp-bprog').textContent = Math.round(p * 100) + '%', out => {
      $('pp-brun').disabled = false; $('pp-bprog').textContent = ''; bif = { pn, out }; drawBif();
      // detect changes in stability along the branch → candidate bifurcation points
      const ev = []; for (let i = 1; i < out.length; i++) { const s0 = out[i - 1].f.map(p => p.stable).join(), s1 = out[i].f.map(p => p.stable).join(); if (s0 !== s1 || out[i - 1].f.length !== out[i].f.length) ev.push(`${pn} ≈ ${F((out[i - 1].v + out[i].v) / 2, 3)} (${out[i - 1].f.length} → ${out[i].f.length} fixed points${out[i - 1].f.length === out[i].f.length ? ', stability changed' : ''})`); }
      const c0 = out.findIndex(o => o.cyc.length); $('pp-bif-sum').innerHTML = (ev.length ? `Changes along the branch: <b>${ev.join('; ')}</b>. ` : 'No change in the number or stability of fixed points over this range. ') + (c0 >= 0 ? `Sustained oscillations first seen at ${pn} ≈ <b>${F(out[c0].v, 3)}</b>.` : 'No sustained oscillations found from the test starts.');
    });
  }
  function drawBif() {
    if (!bif) return; const pal = WB.pal(), st = { x: [], y: [] }, un = { x: [], y: [] }, sa = { x: [], y: [] }, cmx = { x: [], y: [] }, cmn = { x: [], y: [] };
    bif.out.forEach(o => { o.f.forEach(p => { const t = p.kind === 'saddle' ? sa : p.stable ? st : un; t.x.push(o.v); t.y.push(p.x); }); o.cyc.forEach(c => { cmx.x.push(o.v); cmx.y.push(c[1]); cmn.x.push(o.v); cmn.y.push(c[0]); }); });
    WB.plot($('pp-bif'), { series: [{ ...st, points: true, radius: 4.5, color: pal.ink, label: 'stable fixed point' }, { ...un, points: true, radius: 3, color: pal.s[6], label: 'unstable fixed point' }, { ...sa, points: true, radius: 3, color: pal.s[5], label: 'saddle' },
      { ...cmx, points: true, radius: 3, color: pal.s[1], label: 'cycle max' }, { ...cmn, points: true, radius: 3, color: pal.s[7], label: 'cycle min' }],
      xlabel: bif.pn, ylabel: sys.vars[0], noHover: true, vlines: [{ x: P[bif.pn], label: 'current', color: pal.muted }] });
  }

  /* ---------- panel ---------- */
  function buildPanel() {
    const items = Object.entries(sys.params).map(([n, d]) => ({ k: n, label: n, unit: d[4] || '', min: d[1], max: d[2], step: d[3], help: d[5] || '' }));
    const state = { ...P, method: opt.method, dt: opt.dt, T: opt.T, both: opt.both, field: opt.field, nullc: opt.nullc, fps: opt.fps, manif: opt.manif, x0: view.x0, x1: view.x1, y0: view.y0, y1: view.y1 };
    const groups = [{ title: 'Parameters', items },
      { title: 'Show', items: [{ k: 'field', type: 'check', label: 'Direction field' }, { k: 'nullc', type: 'check', label: 'Nullclines' }, { k: 'fps', type: 'check', label: 'Fixed points' }, { k: 'manif', type: 'check', label: 'Saddle separatrices (stable manifolds)' }] },
      { title: 'Integration', items: [{ k: 'method', type: 'seg', label: 'Method', options: [['rk4', 'RK4'], ['euler', 'Forward Euler']] }, { k: 'dt', label: 'Step Δt', min: 1e-4, max: 1, log: true }, { k: 'T', label: 'Duration', min: 1, max: 5000, log: true }, { k: 'both', type: 'check', label: 'Also integrate backward in time' }] },
      { title: 'View', open: false, items: [{ k: 'x0', label: sys.vars[0] + ' min', min: -1000, max: 1000, step: 0.01 }, { k: 'x1', label: sys.vars[0] + ' max', min: -1000, max: 1000, step: 0.01 }, { k: 'y0', label: sys.vars[1] + ' min', min: -1000, max: 1000, step: 0.01 }, { k: 'y1', label: sys.vars[1] + ' max', min: -1000, max: 1000, step: 0.01 }] }];
    let t;
    WB.panel($('pp-panel'), groups, state, k => {
      if (k in P) P[k] = state[k]; else if (k in opt) opt[k] = state[k]; else if (k in view) view[k] = state[k];
      clearTimeout(t); t = setTimeout(recompile, 30);
    });
  }
  function fillCustom() {
    $('pp-cx').value = custom.vars[0]; $('pp-cy').value = custom.vars[1]; $('pp-cf').value = custom.f; $('pp-cg').value = custom.g;
    $('pp-cdefs').value = (custom.defs || []).map(d => d[0] + ' = ' + d[1]).join('\n');
    $('pp-cp').value = Object.entries(custom.params).map(([n, v]) => `${n} = ${v[0]}`).join('\n');
  }
  function applyCustom() {
    try {
      const vx = $('pp-cx').value.trim() || 'x', vy = $('pp-cy').value.trim() || 'y';
      if (!/^[A-Za-z_]\w*$/.test(vx) || !/^[A-Za-z_]\w*$/.test(vy) || vx === vy) throw new Error('Variable names must be two different identifiers.');
      const params = {}; $('pp-cp').value.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => { const m = l.match(/^([A-Za-z_]\w*)\s*=\s*([-+0-9.eE]+)$/); if (!m) throw new Error('Parameter lines look like “a = 0.7”: ' + l); const v = +m[2], r = Math.max(1, Math.abs(v) * 3); params[m[1]] = [v, v - r, v + r, r / 200, '']; });
      const defs = $('pp-cdefs').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/); if (!m) throw new Error('Helper lines look like “m = 1/(1+exp(-x))”: ' + l); return [m[1], m[2]]; });
      custom = { ...custom, vars: [vx, vy], f: $('pp-cf').value.trim(), g: $('pp-cg').value.trim(), params, defs };
      compile(custom, Object.fromEntries(Object.entries(params).map(([n, v]) => [n, v[0]])));   // validate
      sys = custom; P = Object.fromEntries(Object.entries(params).map(([n, v]) => [n, v[0]])); trajs = []; buildPanel(); fillBifParams(); if (recompile()) launch(view.x0 + 0.3 * (view.x1 - view.x0), view.y0 + 0.6 * (view.y1 - view.y0));
    } catch (e) { $('pp-err').textContent = e.message; }
  }

  /* ---------- Python ---------- */
  function python() {
    const pn = Object.keys(P), known = [...sys.vars, ...pn, ...(sys.defs || []).map(d => d[0])], [vx, vy] = sys.vars;
    let f, g, defs, rs = '';
    try { f = translate(sys.f, known, true); g = translate(sys.g, known, true); defs = (sys.defs || []).map(([n, e]) => `    ${n} = ${translate(e, known, true)}`).join('\n'); } catch (e) { return '# ' + e.message; }
    if (sys.reset) rs = `\ndef reset(${vx}, ${vy}):\n    """Spike rule: returns (fired, new state)."""\n    if ${translate(sys.reset.when, known, true)}:\n        return True, (${translate(sys.reset.set[vx] || vx, known, true)}, ${translate(sys.reset.set[vy] || vy, known, true)})\n    return False, (${vx}, ${vy})\n`;
    return `"""Phase plane of: ${sys.label}  (exported from the Little Neural Guide phase-plane workbench)."""
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import fsolve
np.seterr(all='ignore')   # exponentials overflow harmlessly far from the region of interest

${pn.map(n => `${n} = ${+P[n]}`).join('\n')}
def heav(z): return np.heaviside(z, 0.5)

def rhs(${vx}, ${vy}):
${defs ? defs + '\n' : ''}    return ${f}, ${g}
${rs}
def rk4(x, y, T=${opt.T}, dt=${opt.dt}):
    xs, ys = [x], [y]
    for _ in range(int(T / dt)):
        k1 = rhs(x, y); k2 = rhs(x + dt/2*k1[0], y + dt/2*k1[1])
        k3 = rhs(x + dt/2*k2[0], y + dt/2*k2[1]); k4 = rhs(x + dt*k3[0], y + dt*k3[1])
        x, y = x + dt/6*(k1[0] + 2*k2[0] + 2*k3[0] + k4[0]), y + dt/6*(k1[1] + 2*k2[1] + 2*k3[1] + k4[1])
${sys.reset ? '        fired, (x2, y2) = reset(x, y)\n        if fired: xs.append(x); ys.append(y); xs.append(np.nan); ys.append(np.nan); x, y = x2, y2\n' : ''}        xs.append(x); ys.append(y)
    return np.array(xs), np.array(ys)

# grid for the direction field and nullclines
X, Y = np.meshgrid(np.linspace(${view.x0}, ${view.x1}, 300), np.linspace(${view.y0}, ${view.y1}, 300))
with np.errstate(all='ignore'):
    U, V = rhs(X, Y)
U, V = np.broadcast_to(U, X.shape), np.broadcast_to(V, X.shape)

# fixed points: solve f = g = 0 from a grid of starting guesses, then classify by the Jacobian
def jacobian(x, y, h=1e-6):
    fx1, fx0 = np.array(rhs(x + h, y)), np.array(rhs(x - h, y)); fy1, fy0 = np.array(rhs(x, y + h)), np.array(rhs(x, y - h))
    return np.column_stack([(fx1 - fx0) / (2*h), (fy1 - fy0) / (2*h)])
fps = []
for x0 in np.linspace(${view.x0}, ${view.x1}, 12):
    for y0 in np.linspace(${view.y0}, ${view.y1}, 12):
        sol, info, ok, _ = fsolve(lambda z: rhs(*z), [x0, y0], full_output=True)
        if ok == 1 and not any(np.allclose(sol, p, atol=1e-5) for p in fps):
            fps.append(sol)
for p in fps:
    ev = np.linalg.eigvals(jacobian(*p))
    print(f"fixed point ({p[0]:.4g}, {p[1]:.4g}): eigenvalues {np.round(ev, 4)}")

fig, ax = plt.subplots(figsize=(7, 5.5))
ax.streamplot(X, Y, U, V, color='0.75', density=1.1, linewidth=0.7)
ax.contour(X, Y, U, levels=[0], colors='tab:blue', linewidths=2)      # ${vx}-nullcline
ax.contour(X, Y, V, levels=[0], colors='tab:orange', linewidths=2)    # ${vy}-nullcline
for p in fps:
    stable = np.all(np.linalg.eigvals(jacobian(*p)).real < 0)
    ax.plot(*p, 'o', mfc='k' if stable else 'w', mec='k', ms=8)
xs, ys = rk4(${F(trajs[0] ? trajs[0].x[0] : view.x0, 6).replace('−', '-')}, ${F(trajs[0] ? trajs[0].y[0] : view.y0, 6).replace('−', '-')})
ax.plot(xs, ys, color='tab:red', lw=1.5)
ax.set_xlim(${view.x0}, ${view.x1}); ax.set_ylim(${view.y0}, ${view.y1}); ax.set_xlabel('${vx}'); ax.set_ylabel('${vy}')
plt.tight_layout(); plt.show()`;
  }

  /* ---------- page ---------- */
  function html() {
    const groups = {}; Object.entries(SYS).forEach(([k, s]) => (groups[s.group] = groups[s.group] || []).push([k, s]));
    return `<nav class="breadcrumbs"><a href="/">Home</a> › <a href="/workbench/">Workbenches</a> › <span>Phase plane</span></nav>
    <div class="hero wb-hero"><span class="pill">WORKBENCH · ANY TWO-VARIABLE SYSTEM</span><h1>Phase-plane workbench</h1>
    <p class="lead">States, trajectories, nullclines, fixed points, stability, bifurcations and numerical accuracy, all on one canvas. Click anywhere to start a trajectory. Choose a neuron or population model, a normal form, or type your own equations.</p></div>
    <div class="wb-bar"><label class="wb-presetlab" for="pp-sys">System</label><select id="pp-sys">${Object.entries(groups).map(([g, l]) => `<optgroup label="${g}">${l.map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('')}</optgroup>`).join('')}</select>
      <div class="wb-bar-actions"><button class="secondary" id="pp-clear">Clear trajectories</button><button class="secondary" id="pp-reset">Reset system</button><button class="secondary" id="pp-link">Copy link to this setup</button></div></div>
    <p class="wb-presetnote" id="pp-note"></p>
    <div class="box wb-customed" id="pp-custom" hidden><div class="wb-cgrid">
      <label>First variable <input id="pp-cx"></label><label>Second variable <input id="pp-cy"></label>
      <label class="wide">d(first)/dt = <input id="pp-cf" spellcheck="false"></label><label class="wide">d(second)/dt = <input id="pp-cg" spellcheck="false"></label>
      <label>Helper definitions (optional)<textarea id="pp-cdefs" rows="3" spellcheck="false" placeholder="minf = 0.5*(1 + tanh((x + 1)/18))"></textarea></label><label>Parameters<textarea id="pp-cp" rows="3" spellcheck="false"></textarea></label></div>
      <button class="primary" id="pp-apply">Use these equations</button></div>
    <p class="wb-warn" id="pp-err" role="alert"></p>
    <div class="wb-layout"><div class="wb-panel" id="pp-panel"></div><div class="wb-main">
      ${WB.tabs('pp-tabs', [['plane', 'Phase plane'], ['bif', 'Bifurcation diagram'], ['code', 'Python']])}
      <div data-pane-of="pp-tabs" data-pane="plane"><figure class="wb-fig"><figcaption><b>State space</b> <span class="muted">click to launch a trajectory · up to 8 are kept</span></figcaption><div class="wb-cvwrap"><canvas class="wb-cv pp-canvas" id="pp-cv" style="height:min(560px,70vw)" role="img" aria-label="Phase plane with direction field, nullclines and trajectories"></canvas></div></figure>
        <div class="wb-two">${WB.figure('pp-ts', 'Last trajectory: first variable vs time', 170)}${WB.figure('pp-ts2', 'Second variable vs time', 170)}</div>
        <h3>Fixed points and their linearization</h3><div id="pp-info"></div></div>
      <div data-pane-of="pp-tabs" data-pane="bif" hidden><p class="wb-help">For each parameter value: every fixed point in view (with its stability), plus the range of any sustained oscillation found by simulating from two starting points. Where filled points turn open, a fixed point lost stability; where cycle points appear, a limit cycle was born. This is a brute-force diagram, not numerical continuation (use AUTO, XPPAUT or PyDSTool for unstable cycles).</p>
        <div class="wb-inline"><label>Parameter <select id="pp-bp"></select></label><label>from <input type="number" id="pp-ba" step="any"></label><label>to <input type="number" id="pp-bb" step="any"></label><label>points <input type="number" id="pp-bn" value="60" min="10" max="150"></label><button class="primary" id="pp-brun">Compute</button><span class="wb-prog" id="pp-bprog"></span></div>
        ${WB.figure('pp-bif', 'Bifurcation diagram', 340)}<div class="wb-summary" id="pp-bif-sum"></div></div>
      <div data-pane-of="pp-tabs" data-pane="code" hidden><p class="wb-help">The same system with NumPy and SciPy: streamlines, nullclines as zero contours, fixed points with eigenvalues, and one RK4 trajectory.</p>${WB.codeBlock('pp-code', '')}</div>
    </div></div>
    ${WB.related([['/topics/dynamics/states-trajectories/', 'States & trajectories'], ['/topics/dynamics/nullclines/', 'Nullclines & fixed points'], ['/topics/dynamics/stability-bifurcations/', 'Stability & bifurcations'], ['/topics/dynamics-toolkit/phase-portraits/', 'Phase portraits'], ['/topics/dynamics-toolkit/saddle-node/', 'Saddle-node bifurcation'], ['/topics/dynamics-toolkit/hopf-normal-form/', 'Hopf normal form'], ['/topics/dynamics-toolkit/numerical-time-step/', 'Numerical time steps'], ['/practice/phase-studio/', 'Animated phase studio'], ['/lab/wilson-cowan/', 'Wilson–Cowan lab']])}`;
  }
  window.renderPhaseWorkbench = function () {
    document.title = 'Phase-plane workbench · Little Neural Guide';
    $('lesson').innerHTML = html();
    const q = WB.query.get(), k = SYS[q.sys] ? q.sys : 'fhn', tab = q.tab; delete q.sys; delete q.tab; $('pp-sys').value = k;
    WB.bindTabs('pp-tabs', tab => { if (tab === 'bif') drawBif(); });
    $('pp-sys').addEventListener('change', e => setSystem(e.target.value));
    $('pp-reset').onclick = () => setSystem(key); $('pp-clear').onclick = () => { trajs = []; draw(); info(); };
    $('pp-link').onclick = e => WB.copyLink(e.currentTarget);
    $('pp-apply').onclick = applyCustom; $('pp-bp').addEventListener('change', setBifRange); $('pp-brun').onclick = runBif;
    const cv = $('pp-cv');
    cv.addEventListener('click', e => { const m = cv._map; if (!m) return; const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; if (px < m.L || px > m.w - m.R || py < m.T || py > m.h - m.B) return; launch(m.inv(px), m.invY(py)); });
    setSystem(k, q);
    if (tab === 'bif' || tab === 'code') { WB.showTab('pp-tabs', tab); if (tab === 'bif') requestAnimationFrame(drawBif); }   // ?tab= opens a tab, as on the other workbenches
  };
  window.PP = { SYS, compile, fixedPoints, integrate, translate };
})();
