/* ngux.js: small usability layer applied to every interactive page.
   - Click a slider's value readout to type an exact number (clamped and snapped to the slider's range/step).
   - Double-click a slider to return it to its starting value.
   Works on any page by finding the readout next to each range input; pages keep their own handlers. */
(function () {
  const snap = (r, v) => { const mn = r.min === '' ? 0 : +r.min, mx = r.max === '' ? 100 : +r.max, st = r.step && r.step !== 'any' ? +r.step : 0; v = Math.max(mn, Math.min(mx, v)); if (st) v = mn + Math.round((v - mn) / st) * st; const dec = st ? Math.max(0, ((r.step.split('.')[1]) || '').length) : 6; return +v.toFixed(dec); };
  const fire = r => { r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); };
  const readoutOf = r => {
    if (r.id) { const o = document.querySelector(`output[for~="${CSS.escape(r.id)}"]`); if (o) return o; }
    const p = r.parentElement; if (!p) return null; if (p.querySelector('input[type=number]')) return null;
    if (p.querySelectorAll('input[type=range]').length !== 1) { const n = r.nextElementSibling; return n && /^(OUTPUT|SPAN|B)$/.test(n.tagName) && /-?\d/.test(n.textContent) ? n : null; }
    const o = p.querySelector('output') || [...p.querySelectorAll('span,b')].find(e => !e.children.length && /^\s*[−-]?\d[\d.,]*\s*[×%a-zµΩ/°·²³A-Z]*\s*$/.test(e.textContent));
    return o || null;
  };
  const edit = (r, o) => {
    if (r.disabled || o._ed) return; o._ed = true;
    const inp = document.createElement('input'); inp.type = 'number'; inp.className = 'ux-inline'; inp.value = r.value; ['min', 'max', 'step'].forEach(k => { if (r[k] !== '') inp[k] = r[k]; }); inp.setAttribute('aria-label', (r.getAttribute('aria-label') || 'value') + ' (type a number)');
    o.style.display = 'none'; o.after(inp); inp.focus(); inp.select();
    const done = ok => { if (!o._ed) return; o._ed = false; if (ok && inp.value !== '' && isFinite(+inp.value)) { r.value = snap(r, +inp.value); fire(r); } inp.remove(); o.style.display = ''; };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') done(false); });
    inp.addEventListener('blur', () => done(true));
  };
  const enhance = () => {
    const L = document.getElementById('lesson'); if (!L) return;
    L.querySelectorAll('input[type=range]:not([data-ux])').forEach(r => {
      r.dataset.ux = '1'; const dv = r.getAttribute('value');
      if (dv != null) { r.addEventListener('dblclick', () => { if (r.disabled || r.value === dv) return; r.value = dv; fire(r); }); if (!r.title) r.title = 'Double-click to reset'; }
      const o = readoutOf(r); if (!o || o.dataset.uxo) return; o.dataset.uxo = '1'; o.classList.add('ux-editable'); o.tabIndex = 0; o.title = 'Click to type an exact value';
      o.addEventListener('click', () => edit(r, o)); o.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edit(r, o); } });
    });
  };
  /* Stale-result marker for pages whose figures only update when you press Run:
     after a run, changing any setting in that section pulses the Run button and says so. */
  const RUNS = ['nlRun', 'gfmRun', 'escRun', 'cgRun', 'hpGo', 'apGo', 'rxRun', 'fi-run', 'z-run', 'iv-run', 'bat-run', 'sw-ratio'];
  const stale = () => RUNS.forEach(id => {
    const b = document.getElementById(id); if (!b || b.dataset.uxs) return; b.dataset.uxs = '1';
    const sec = b.closest('.lesson-section') || b.closest('.wb-layout') || b.parentElement; let ran = false;   // on workbenches any panel change makes a sweep stale
    const note = document.createElement('span'); note.className = 'ux-stale'; note.setAttribute('role', 'status'); note.hidden = true; note.innerHTML = '<span class="ux-dot"></span>Settings changed: run again to update';
    b.after(note);
    const clear = () => { ran = true; b.classList.remove('ux-pulse'); note.hidden = true; };
    b.addEventListener('click', clear);
    if ('MutationObserver' in window) { let was = b.disabled; new MutationObserver(() => { if (was && !b.disabled) clear(); was = b.disabled; }).observe(b, { attributes: true, attributeFilter: ['disabled'] }); }
    const mark = e => { const t = e.target; if (!ran || !t || !/^(INPUT|SELECT)$/.test(t.tagName) || t.closest('.nl-bar,.ux-bar,.nl-scrub,.ux-fig,.ux-figh,.wb-toggles,.wb-tabs') || t.id === 'ph-var' || t.id === 'sw-dtca' || t.type === 'file') return; b.classList.add('ux-pulse'); note.hidden = false; };
    sec.addEventListener('change', mark, true); sec.addEventListener('input', e => { if (e.target.type === 'range') mark(e); }, true);
  });
  let q = 0; const later = () => { if (q) return; q = setTimeout(() => { q = 0; enhance(); stale(); }, 120); };
  const prev = window.ngAfterRender; window.ngAfterRender = function (...a) { if (typeof prev === 'function') prev.apply(this, a); later(); };
  const L0 = document.getElementById('lesson'); if (L0 && 'MutationObserver' in window) new MutationObserver(later).observe(L0, { childList: true, subtree: true });
  later();
})();
