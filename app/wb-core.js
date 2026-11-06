/* ===================== WORKBENCH CORE =====================
   Shared pieces for the unified model workbenches (/workbench/…):
     WB.plot      — canvas line/scatter plots with hover readout, legends, log axes, pinned ghosts
     WB.panel     — control panel built from a schema (range + exact number entry, selects, toggles)
     WB.query     — read/write the page state in the URL (#workbench.neuron?model=cb&gNa=50) so any setup is a shareable link
     WB.codeBlock — a Python block that the runner (runner.js) turns into ▶ Run here / Colab / notebook
   Colors come from CSS custom properties so plots follow the light/dark theme. */
(function () {
  'use strict';
  const WB = window.WB = {};
  const $ = id => document.getElementById(id);
  WB.$ = $;

  /* ---------- theme-aware palette ---------- */
  WB.pal = function () {
    const cs = getComputedStyle(document.documentElement), v = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
    return {
      ink: v('--wb-ink', '#141111'), muted: v('--wb-muted', '#8c7664'), grid: v('--wb-grid', '#e6dacd'), bg: v('--wb-bg', '#fffdf9'),
      s: [v('--wb-s1', '#a62962'), v('--wb-s2', '#2f6f9f'), v('--wb-s3', '#6f4c27'), v('--wb-s4', '#2e8a57'), v('--wb-s5', '#d17a00'), v('--wb-s6', '#7a5cc7'), v('--wb-s7', '#c43c3c'), v('--wb-s8', '#3c9aa8')],
      ghost: v('--wb-ghost', '#b9a99a'),
    };
  };

  /* ---------- number formatting ---------- */
  WB.fmt = (v, d = 3) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(2).replace('e', '×10^').replace('^+', '^');
    return (+v.toPrecision(d)).toString().replace('-', '−');
  };
  function ticks(a, b, n) {
    if (!(b > a)) return [a];
    const step0 = (b - a) / Math.max(1, n), mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
    const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9 * step; v += step) out.push(+v.toFixed(12));
    return out;
  }
  const tickLabel = v => { const a = Math.abs(v); return a >= 1e4 ? (v / 1000) + 'k' : (+v.toPrecision(4)).toString().replace('-', '−'); };

  /* ---------- plotting ----------
     cfg = { series:[{x,y,color,width,dash,label,ghost,points,radius}], xlim, ylim, xlabel, ylabel, logx, logy,
             hlines:[{y,color,dash,label}], vlines:[{x,...}], bands:[{x0,x1,color}], legend:true, title, noHover, yfmt } */
  function prepCanvas(cv) {
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 600, h = cv.clientHeight || 260;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  function autoLim(series, key, log) {
    let lo = Infinity, hi = -Infinity;
    series.forEach(s => { const a = s[key]; if (!a) return; for (let i = 0; i < a.length; i++) { const v = a[i]; if (!isFinite(v) || (log && v <= 0)) continue; if (v < lo) lo = v; if (v > hi) hi = v; } });
    if (!isFinite(lo)) return log ? [1, 10] : [0, 1];
    if (log) return [lo, hi * 1.0001 > lo ? hi : lo * 10];
    if (hi - lo < 1e-12) { const d = Math.abs(hi) * 0.1 || 1; return [lo - d, hi + d]; }
    const pad = (hi - lo) * 0.06; return [lo - pad, hi + pad];
  }
  WB.plot = function (cv, cfg) {
    if (!cv) return null;
    cv._wb = cfg; const P = WB.pal(), { ctx, w, h } = prepCanvas(cv);
    const series = (cfg.series || []).filter(s => s && s.x && s.x.length);
    const xlim = cfg.xlim || autoLim(series, 'x', cfg.logx), ylim = cfg.ylim || autoLim(series, 'y', cfg.logy);
    const L = cfg.left || 54, R = 12, T = cfg.title ? 24 : 12, B = 36;
    const tx = v => cfg.logx ? Math.log10(v) : v, ty = v => cfg.logy ? Math.log10(v) : v;
    const x0 = tx(xlim[0]), x1 = tx(xlim[1]), y0 = ty(ylim[0]), y1 = ty(ylim[1]);
    const X = x => L + (tx(x) - x0) / (x1 - x0 || 1) * (w - L - R), Y = y => T + (1 - (ty(y) - y0) / (y1 - y0 || 1)) * (h - T - B);
    ctx.fillStyle = P.bg; ctx.fillRect(L, T, w - L - R, h - T - B);
    ctx.font = '11px system-ui,sans-serif'; ctx.lineWidth = 1;
    const xt = cfg.logx ? ticks(Math.floor(x0), Math.ceil(x1), Math.max(2, Math.ceil(x1) - Math.floor(x0))).filter(Number.isInteger).map(e => 10 ** e).filter(v => v >= xlim[0] * 0.999 && v <= xlim[1] * 1.001)
      : ticks(xlim[0], xlim[1], Math.max(3, Math.floor((w - L) / 80)));
    const yt = cfg.logy ? ticks(Math.floor(y0), Math.ceil(y1), Math.max(2, Math.ceil(y1) - Math.floor(y0))).filter(Number.isInteger).map(e => 10 ** e).filter(v => v >= ylim[0] * 0.999 && v <= ylim[1] * 1.001)
      : ticks(ylim[0], ylim[1], Math.max(3, Math.floor((h - T - B) / 42)));
    ctx.strokeStyle = P.grid; ctx.fillStyle = P.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    xt.forEach(v => { const x = X(v); if (x < L - 1 || x > w - R + 1) return; ctx.beginPath(); ctx.moveTo(x + .5, T); ctx.lineTo(x + .5, h - B); ctx.stroke(); ctx.fillText(tickLabel(v), x, h - B + 6); });
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    yt.forEach(v => { const y = Y(v); if (y < T - 1 || y > h - B + 1) return; ctx.beginPath(); ctx.moveTo(L, y + .5); ctx.lineTo(w - R, y + .5); ctx.stroke(); ctx.fillText(tickLabel(v), L - 6, y); });
    ctx.strokeStyle = P.muted; ctx.strokeRect(L + .5, T + .5, w - L - R - 1, h - T - B - 1);
    ctx.fillStyle = P.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    if (cfg.xlabel) ctx.fillText(cfg.xlabel, L + (w - L - R) / 2, h - 1);
    if (cfg.ylabel) { ctx.save(); ctx.translate(12, T + (h - T - B) / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(cfg.ylabel, 0, 0); ctx.restore(); }
    if (cfg.title) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '600 12px system-ui,sans-serif'; ctx.fillText(cfg.title, L, 4); ctx.font = '11px system-ui,sans-serif'; }
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, w - L - R, h - T - B); ctx.clip();
    (cfg.bands || []).forEach(b => { ctx.fillStyle = b.color || 'rgba(166,41,98,.08)'; ctx.fillRect(X(b.x0), T, X(b.x1) - X(b.x0), h - T - B); });
    const refLine = (r, vert) => { ctx.strokeStyle = r.color || P.muted; ctx.lineWidth = r.width || 1.2; ctx.setLineDash(r.dash || [5, 4]); ctx.beginPath();
      if (vert) { ctx.moveTo(X(r.x), T); ctx.lineTo(X(r.x), h - B); } else { ctx.moveTo(L, Y(r.y)); ctx.lineTo(w - R, Y(r.y)); } ctx.stroke(); ctx.setLineDash([]);
      if (r.label) { ctx.fillStyle = r.color || P.muted; ctx.textAlign = vert ? 'left' : 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(r.label, vert ? X(r.x) + 4 : w - R - 4, vert ? T + 14 : Y(r.y) - 2); } };
    (cfg.hlines || []).forEach(r => refLine(r, false)); (cfg.vlines || []).forEach(r => refLine(r, true));
    series.forEach((s, k) => {
      const col = s.ghost ? P.ghost : (s.color || P.s[k % P.s.length]);
      if (s.points) {
        ctx.fillStyle = col; const r = s.radius || 3;
        for (let i = 0; i < s.x.length; i++) { const yy = s.y[i]; if (!isFinite(yy) || (cfg.logy && yy <= 0)) continue; ctx.globalAlpha = s.alpha || 1; ctx.fillRect(X(s.x[i]) - r / 2, Y(yy) - r / 2, r, r); }
        ctx.globalAlpha = 1; if (!s.line) return;
      }
      ctx.strokeStyle = col; ctx.lineWidth = s.width || (s.ghost ? 1.4 : 1.8); ctx.lineJoin = 'round'; ctx.setLineDash(s.dash || (s.ghost ? [4, 3] : [])); ctx.globalAlpha = s.alpha || 1;
      ctx.beginPath(); let on = false;
      const n = s.x.length;
      if (s._mono === undefined) { let m = true; for (let i = 1; i < n; i++) if (s.x[i] < s.x[i - 1]) { m = false; break; } s._mono = m; }
      const stride = s._mono ? Math.max(1, Math.floor(n / ((w - L) * 2.5))) : 1;   // decimate long time series (min/max per pixel keeps spikes); never trajectories
      for (let i = 0; i < n; i += stride) {
        let yy = s.y[i];
        if (stride > 1) { let mx = -Infinity, mn = Infinity; for (let j = i; j < Math.min(n, i + stride); j++) { const q = s.y[j]; if (q > mx) mx = q; if (q < mn) mn = q; }
          if (isFinite(mx)) { const px = X(s.x[i]); if (!on) { ctx.moveTo(px, Y(mn)); on = true; } ctx.lineTo(px, Y(mn)); ctx.lineTo(px, Y(mx)); continue; } }
        if (!isFinite(yy) || (cfg.logy && yy <= 0) || (cfg.logx && s.x[i] <= 0)) { on = false; continue; }
        const px = X(s.x[i]), py = Y(yy); on ? ctx.lineTo(px, py) : ctx.moveTo(px, py); on = true;
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    (cfg.marks || []).forEach(m => { ctx.fillStyle = m.color || P.ink; ctx.beginPath(); ctx.arc(X(m.x), Y(m.y), m.r || 4, 0, 7); ctx.fill(); if (m.label) { ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(m.label, X(m.x) + 6, Y(m.y) - 4); } });
    ctx.restore();
    // legend
    const leg = series.filter(s => s.label && !s.noLegend);
    if (leg.length && cfg.legend !== false) {
      ctx.font = '11px system-ui,sans-serif'; let lx = L + 8, ly = T + 8; const rowH = 15;
      const widths = leg.map(s => ctx.measureText(s.label).width + 26), totalW = widths.reduce((a, b) => a + b, 0);
      if (totalW > w - L - R - 16) { /* wrap to rows */ }
      ctx.fillStyle = P.bg; ctx.globalAlpha = 0.85; ctx.fillRect(lx - 4, ly - 4, Math.min(totalW, w - L - R - 12) + 4, rowH * Math.ceil(totalW / (w - L - R - 16)) + 4); ctx.globalAlpha = 1;
      leg.forEach((s, k) => {
        if (lx + widths[k] > w - R - 8) { lx = L + 8; ly += rowH; }
        const col = s.ghost ? P.ghost : (s.color || P.s[series.indexOf(s) % P.s.length]);
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(s.dash || (s.ghost ? [4, 3] : [])); ctx.beginPath(); ctx.moveTo(lx, ly + 5); ctx.lineTo(lx + 16, ly + 5); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = P.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s.label, lx + 20, ly + 5); lx += widths[k];
      });
    }
    cv._map = { X, Y, L, R, T, B, w, h, xlim, ylim, inv: px => { const f = (px - L) / (w - L - R); const v = x0 + f * (x1 - x0); return cfg.logx ? 10 ** v : v; }, invY: py => { const f = 1 - (py - T) / (h - T - B); const v = y0 + f * (y1 - y0); return cfg.logy ? 10 ** v : v; } };
    if (!cv._hover && !cfg.noHover) attachHover(cv);
    return cv._map;
  };
  function nearestIndex(xs, x) {
    let lo = 0, hi = xs.length - 1; if (xs[hi] < xs[lo]) { let b = 0, bd = Infinity; for (let i = 0; i < xs.length; i++) { const d = Math.abs(xs[i] - x); if (d < bd) { bd = d; b = i; } } return b; }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] < x) lo = m; else hi = m; }
    return Math.abs(xs[lo] - x) < Math.abs(xs[hi] - x) ? lo : hi;
  }
  function attachHover(cv) {
    cv._hover = true;
    let tip = cv.parentElement && cv.parentElement.querySelector('.wb-tip');
    if (!tip && cv.parentElement) { tip = document.createElement('div'); tip.className = 'wb-tip'; tip.hidden = true; cv.parentElement.style.position = 'relative'; cv.parentElement.appendChild(tip); }
    const move = e => {
      const cfg = cv._wb, m = cv._map; if (!cfg || !m || cfg.noHover) return;
      const r = cv.getBoundingClientRect(), px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left, py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      if (px < m.L || px > m.w - m.R || py < m.T || py > m.h - m.B) { tip.hidden = true; WB.plot(cv, cfg); return; }
      const x = m.inv(px); WB.plot(cv, cfg);
      const ctx = cv.getContext('2d'), P = WB.pal(); ctx.strokeStyle = P.muted; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(px, m.T); ctx.lineTo(px, m.h - m.B); ctx.stroke(); ctx.setLineDash([]);
      const rows = [`<b>${cfg.xlabel ? cfg.xlabel.replace(/\s*\(.*\)/, '') : 'x'} = ${WB.fmt(x, 4)}</b>`];
      (cfg.series || []).filter(s => s && s.x && s.x.length && !s.points && !s.noHover).slice(0, 8).forEach((s, k) => {
        const i = nearestIndex(s.x, x), yv = s.y[i]; if (!isFinite(yv)) return;
        const col = s.ghost ? P.ghost : (s.color || P.s[k % P.s.length]);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(m.X(s.x[i]), m.Y(yv), 3.5, 0, 7); ctx.fill();
        rows.push(`<span><i style="background:${col}"></i>${s.label || 'series ' + (k + 1)}: ${WB.fmt(yv, 4)}${cfg.yunit ? ' ' + cfg.yunit : ''}</span>`);
      });
      if (rows.length < 2) { const yv = m.invY(py); rows.push(`<span>y = ${WB.fmt(yv, 4)}</span>`); }
      tip.innerHTML = rows.join(''); tip.hidden = false;
      const left = px + 14 + 190 > r.width ? px - 200 : px + 14; tip.style.left = Math.max(0, left) + 'px'; tip.style.top = Math.max(0, py - 10) + 'px';
    };
    cv.addEventListener('mousemove', move); cv.addEventListener('touchmove', move, { passive: true });
    cv.addEventListener('mouseleave', () => { if (tip) tip.hidden = true; if (cv._wb) WB.plot(cv, cv._wb); });
  }
  /* Redraw every workbench canvas on resize or theme change. */
  const redrawAll = () => document.querySelectorAll('canvas.wb-cv').forEach(cv => { if (cv._wb) WB.plot(cv, cv._wb); else if (cv._redraw) cv._redraw(); });
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(redrawAll, 120); });
  WB.redrawAll = redrawAll;

  /* ---------- control panel from a schema ----------
     groups: [{ title, open, items:[ {k,label,type:'range'|'select'|'check'|'note'|'buttons', min,max,step,unit,help,log,options,show:(s)=>bool, fmt} ] }]
     The panel writes into `state` and calls onChange(key). Ranges also get a number box for exact values. */
  WB.panel = function (host, groups, state, onChange) {
    const uid = 'wbc' + Math.random().toString(36).slice(2, 7);
    const row = it => {
      const id = uid + '-' + it.k, help = it.help ? `<small>${it.help}</small>` : '';
      if (it.type === 'note') return `<div class="wb-note" data-k="${it.k || ''}">${it.html}</div>`;
      if (it.type === 'select') return `<div class="wb-row" data-k="${it.k}"><label for="${id}">${it.label}</label><select id="${id}" data-k="${it.k}">${it.options.map(o => `<option value="${o[0]}" ${String(state[it.k]) === String(o[0]) ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>${help}</div>`;
      if (it.type === 'check') return `<div class="wb-row wb-check" data-k="${it.k}"><label><input type="checkbox" id="${id}" data-k="${it.k}" ${state[it.k] ? 'checked' : ''}> ${it.label}</label>${it.help ? (it.about ? `<details class="wb-about"><summary>about</summary><small>${it.help}</small></details>` : help) : ''}</div>`;
      if (it.type === 'seg') return `<div class="wb-row" data-k="${it.k}"><span class="wb-lab">${it.label}</span><div class="wb-seg" role="group" aria-label="${it.label}">${it.options.map(o => `<button type="button" data-k="${it.k}" data-v="${o[0]}" aria-pressed="${String(state[it.k]) === String(o[0])}">${o[1]}</button>`).join('')}</div>${help}</div>`;
      const v = state[it.k], sl = it.log ? Math.log10(Math.max(v, 1e-12)) : v;
      const smin = it.log ? Math.log10(it.min) : it.min, smax = it.log ? Math.log10(it.max) : it.max, sstep = it.log ? 0.01 : it.step;
      return `<div class="wb-row" data-k="${it.k}"><label for="${id}">${it.label}${it.unit ? ` <span class="wb-unit">${it.unit}</span>` : ''}</label><div class="wb-pair"><input type="range" id="${id}" data-k="${it.k}" min="${smin}" max="${smax}" step="${sstep}" value="${sl}" ${it.log ? 'data-log="1"' : ''}><input type="number" data-num="${it.k}" step="any" value="${+(+v).toPrecision(5)}" aria-label="${it.label} exact value"></div>${help}</div>`;
    };
    host.innerHTML = groups.map((g, gi) => `<details class="wb-group" ${g.open !== false ? 'open' : ''} data-g="${gi}"><summary>${g.title}${g.badge ? `<span class="wb-badge">${g.badge}</span>` : ''}</summary><div class="wb-gbody">${g.items.map(row).join('')}</div></details>`).join('');
    const items = groups.flatMap(g => g.items), byK = Object.fromEntries(items.filter(i => i.k).map(i => [i.k, i]));
    const refresh = () => {
      items.forEach(it => { if (!it.k || !it.show) return; const r = host.querySelector(`.wb-row[data-k="${it.k}"],.wb-note[data-k="${it.k}"]`); if (r) r.hidden = !it.show(state); });
      groups.forEach((g, gi) => { if (!g.show) return; const d = host.querySelector(`details[data-g="${gi}"]`); if (d) d.hidden = !g.show(state); });
    };
    host.addEventListener('input', e => {
      const t = e.target, k = t.dataset.k || t.dataset.num; if (!k || !byK[k]) return;
      const it = byK[k];
      if (t.type === 'range') {
        const v = t.dataset.log ? +(10 ** +t.value).toPrecision(3) : +t.value; state[k] = v;
        const nb = host.querySelector(`input[data-num="${k}"]`); if (nb) nb.value = +v.toPrecision(5);
      } else if (t.type === 'number') {
        const v = +t.value; if (!isFinite(v) || t.value === '') return; state[k] = v;
        const rg = host.querySelector(`input[type=range][data-k="${k}"]`); if (rg) rg.value = it.log ? Math.log10(Math.max(v, 1e-12)) : v;
      } else if (t.type === 'checkbox') state[k] = t.checked;
      else if (t.tagName === 'SELECT') state[k] = isNaN(+t.value) || t.value === '' ? t.value : +t.value;
      refresh(); onChange(k);
    });
    host.addEventListener('change', e => { const t = e.target; if (t.tagName === 'SELECT' && t.dataset.k && byK[t.dataset.k] && byK[t.dataset.k].rebuild) onChange(t.dataset.k, true); });
    host.addEventListener('click', e => {
      const b = e.target.closest('.wb-seg button'); if (!b) return; const k = b.dataset.k;
      state[k] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v;
      b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); refresh(); onChange(k, byK[k] && byK[k].rebuild);
    });
    refresh();
    return { refresh, set: (k, v) => { state[k] = v; const rg = host.querySelector(`[data-k="${k}"]`); if (rg) { if (rg.type === 'checkbox') rg.checked = !!v; else if (rg.type === 'range') rg.value = byK[k].log ? Math.log10(v) : v; else rg.value = v; } const nb = host.querySelector(`input[data-num="${k}"]`); if (nb) nb.value = +(+v).toPrecision(5); refresh(); } };
  };

  /* ---------- URL state ---------- */
  WB.query = {
    get() { const q = location.hash.split('?')[1] || ''; const o = {}; new URLSearchParams(q).forEach((v, k) => { o[k] = v === 'true' ? true : v === 'false' ? false : (v !== '' && !isNaN(+v) ? +v : v); }); return o; },
    /** Store only the keys that differ from `base`, so links stay short. */
    set(state, base, keep = []) {
      const q = new URLSearchParams();
      Object.keys(state).forEach(k => { const v = state[k]; if (typeof v === 'object') return; if (keep.includes(k) || base[k] === undefined || String(base[k]) !== String(v)) q.set(k, typeof v === 'number' ? +v.toPrecision(6) : v); });
      const h = location.hash.split('?')[0] + (q.toString() ? '?' + q.toString() : '');
      try { history.replaceState(null, '', h); } catch (e) {}
    },
  };
  WB.copyLink = async btn => { try { await navigator.clipboard.writeText(location.href); const t = btn.textContent; btn.textContent = 'Link copied ✓'; setTimeout(() => btn.textContent = t, 1600); } catch (e) { prompt('Copy this link', location.href); } };

  /* ---------- Python code block (made runnable by runner.js) ---------- */
  WB.codeBlock = (id, code) => `<pre class="wb-code"><code id="${id}" class="language-python">${WB.esc(code)}</code></pre>`;
  WB.setCode = (id, code) => { const c = $(id); if (c && c.getAttribute('contenteditable') !== 'true') c.textContent = code; };
  WB.esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* ---------- seeded RNG (shared by every workbench; the Python export uses numpy's own generator) ---------- */
  WB.rng = function (seed) {
    let s = (seed >>> 0) || 1; const u = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    let spare = null;
    u.normal = () => { if (spare !== null) { const v = spare; spare = null; return v; } let a, b, r; do { a = 2 * u() - 1; b = 2 * u() - 1; r = a * a + b * b; } while (r >= 1 || r === 0); const f = Math.sqrt(-2 * Math.log(r) / r); spare = b * f; return a * f; };
    u.poisson = lam => { if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * u.normal())); const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= u(); } while (p > L); return k - 1; };
    return u;
  };

  /* ---------- small numeric helpers ---------- */
  /** Discrete Fourier coefficient of x (uniform dt, ms) at frequency f (Hz), with a Hann window. */
  WB.dft = function (x, dtMs, f) {
    const n = x.length, w = 2 * Math.PI * f * dtMs / 1000; let re = 0, im = 0;
    for (let k = 0; k < n; k++) { const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * k / (n - 1)), a = w * k; re += x[k] * win * Math.cos(a); im -= x[k] * win * Math.sin(a); }
    return [re, im];
  };
  WB.logspace = (a, b, n) => Array.from({ length: n }, (_, i) => a * (b / a) ** (i / (n - 1)));
  WB.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / Math.max(1, n - 1));
  WB.mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  WB.std = a => { const m = WB.mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  /** Run fn over items without freezing the page; reports progress. */
  WB.chunked = function (items, fn, progress, done) {
    let i = 0; const out = []; const tick = () => { const t0 = performance.now(); while (i < items.length && performance.now() - t0 < 30) { out.push(fn(items[i], i)); i++; } progress && progress(i / items.length); if (i < items.length) setTimeout(tick, 0); else done(out); };
    setTimeout(tick, 0);
  };

  /* ---------- LaTeX via MathJax (same loader settings as the model lab) ---------- */
  WB.typeset = el => {
    const run = () => window.MathJax && MathJax.typesetPromise && MathJax.typesetPromise([el]).catch(() => {});
    if (window.MathJax && MathJax.typesetPromise) return run();
    if (!document.getElementById('mathjax-src')) {
      window.MathJax = { tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] }, svg: { fontCache: 'global' }, startup: { typeset: true } };
      const s = document.createElement('script'); s.id = 'mathjax-src'; s.async = true;
      s.src = 'vendor/mathjax/tex-svg.js'; document.head.appendChild(s);
    } else setTimeout(run, 800);
  };

  /* ---------- page chrome shared by workbenches ---------- */
  WB.figure = (id, title, h = 260, note = '') => `<figure class="wb-fig"><figcaption><b>${title}</b>${note ? ` <span class="muted">${note}</span>` : ''}</figcaption><div class="wb-cvwrap"><canvas class="wb-cv" id="${id}" style="height:${h}px" role="img" aria-label="${title}"></canvas></div></figure>`;
  WB.tabs = (id, tabs) => `<div class="wb-tabs" role="tablist" id="${id}">${tabs.map((t, i) => `<button role="tab" type="button" data-tab="${t[0]}" aria-selected="${i === 0}">${t[1]}</button>`).join('')}</div>`;
  WB.bindTabs = (id, onSwitch) => {
    const bar = $(id); if (!bar) return;
    bar.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; WB.showTab(id, b.dataset.tab); onSwitch && onSwitch(b.dataset.tab); });
  };
  WB.showTab = (id, tab) => {
    const bar = $(id); if (!bar) return;
    bar.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === tab));
    document.querySelectorAll(`[data-pane-of="${id}"]`).forEach(p => p.hidden = p.dataset.pane !== tab);
    requestAnimationFrame(redrawAll);
  };
  WB.related = links => `<div class="wb-related"><span class="eyebrow">The same idea elsewhere in the guide</span><div>${links.map(l => `<a href="${l[0]}">${l[1]}</a>`).join('')}</div></div>`;
})();
