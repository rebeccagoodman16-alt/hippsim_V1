/* hippsim page shell: header with tool tabs, the scientific panel (model card + baseline tracker)
   above every tool, and the first render. Loaded last, after the Guide engines and hs-cards.js. */
(function () {
  'use strict';
  const P = window.HS_PAGE, CARDS = (window.HS_CARDS || {}).cards || {}, REFS = (window.HS_CARDS || {}).refs || {};
  const LEVELS = (window.HS_CARDS || {}).levels || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------------- header: where am I, where can I go ---------------- */
  const ALL = P.all || [];                                   // [route, tool, pageSlug, pageTitle]
  const PAGES = [...new Map(ALL.map(a => [a[2], a[3]])).entries()];
  const header = document.querySelector('body > header');
  header.innerHTML = `
    <div class="hs-row1">
      <a class="brand" href="index.html" data-tip="hippsim home">hippsim</a>
      <nav class="hs-crumb" aria-label="Location">
        <a class="hs-up" href="simulator.html" data-tip="All workspaces">← Simulate</a>
        <b class="hs-wsname">${esc(P.title)}</b>
      </nav>
      <button type="button" class="hs-disp-btn" data-hs-display aria-haspopup="dialog" data-tip="Text size, theme, layout, explanations">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Display</span></button>
    </div>
    <nav class="hs-tabs" aria-label="${esc(P.title)} tools">${P.routes.map(([r, n], i) => `<a href="${ngHash(r)}" data-r="${r}"><span class="n">${i + 1}</span>${esc(n)}</a>`).join('')}</nav>`;
  window.hsOpenFinder = () => openFinder();

  /* ---------------- Lab / Learn mode ----------------
     Lab mode folds long background paragraphs into "Background" toggles so controls and results come first. */
  // set from the Display panel (hs-app.js): explanations "short" = Lab, "full" = Learn
  let lab = true;
  try { const v = localStorage.getItem('hs-mode'); if (v) lab = v === 'lab'; } catch (e) {}
  function setMode(v) {
    lab = v; try { localStorage.setItem('hs-mode', v ? 'lab' : 'learn'); } catch (e) {}
    document.body.classList.toggle('hs-labmode', v);
    const ex = document.querySelector('#lesson details.hs-extra'); if (ex && !v) ex.open = true;
  }
  window.hsSetMode = setMode;
  window.hsGetMode = () => lab;
  setMode(lab);
  const PROSE = 220;   // characters: a paragraph this long is background reading
  // Short mode: the intro keeps its first sentence; boxes left with nothing to show disappear
  function trimLead() {
    const L = document.getElementById('lesson');
    L.querySelectorAll('.hero .lead, .hero p').forEach(p => {
      if (p.dataset.hsLead || p.querySelector('input,select,button')) return; p.dataset.hsLead = '1';
      const t = p.innerHTML, m = t.match(/^(.*?[.!?])(\s+)(?=[A-Z(])/s);
      if (m && t.length > m[0].length + 20) p.innerHTML = m[1] + '<span class="hs-more-lead">' + m[2] + t.slice(m[0].length - 0) + '</span>';
    });
  }
  function hideEmpty() {
    const L = document.getElementById('lesson');
    L.querySelectorAll('.box, .lesson-section > div, section > div').forEach(b => {
      if (b.closest('#hs-panel, .hs-extra')) return;
      const live = [...b.children].some(c => !c.classList.contains('hs-bgtoggle') && !c.classList.contains('hs-prose') && getComputedStyle(c).display !== 'none');
      b.classList.toggle('hs-onlyprose', !live && b.querySelector('.hs-prose') !== null);
    });
  }
  function foldProse() {
    const L = document.getElementById('lesson');
    L.querySelectorAll('p').forEach(p => {
      if (p.dataset.hsProse || p.closest('#hs-panel, figure, figcaption, table, label, .hero') || p.querySelector('input,select,canvas,svg')) return;
      if (p.innerText.trim().length < PROSE) return;
      p.dataset.hsProse = '1'; p.classList.add('hs-prose');
      const prev = p.previousElementSibling;
      if (!(prev && (prev.classList.contains('hs-prose') || prev.classList.contains('hs-bgtoggle')))) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'hs-bgtoggle';
        btn.textContent = 'Background ▸'; btn.setAttribute('aria-expanded', 'false');
        btn.onclick = () => { const open = btn.getAttribute('aria-expanded') !== 'true'; btn.setAttribute('aria-expanded', String(open));
          btn.textContent = open ? 'Background ▾' : 'Background ▸';
          let n = btn.nextElementSibling; while (n && n.classList.contains('hs-prose')) { n.classList.toggle('hs-open', open); n = n.nextElementSibling; } };
        p.before(btn);
      }
    });
  }

  /* ---------------- tool finder ---------------- */
  const finder = document.createElement('div');
  finder.id = 'hs-finder'; finder.hidden = true;
  finder.innerHTML = `<div class="hs-finder-box" role="dialog" aria-modal="true" aria-label="Find a tool">
      <input type="search" id="hs-fq" placeholder="Search tools, questions, channels, cells…" aria-label="Search tools" autocomplete="off">
      <ul id="hs-fl" role="listbox"></ul>
      <p class="hs-finder-hint">↑ ↓ to move · Enter to open · Esc to close</p></div>`;
  document.body.appendChild(finder);
  const hashOf = r => '#' + r.split('/').filter(Boolean).join('.');
  const items = ALL.map(([r, n, slug, t]) => ({r, n, slug, t, c: CARDS[r] || {}}))
    .sort((a, b) => (a.c.level || 9) - (b.c.level || 9));
  let sel = 0, shown = [];
  function listTools() {
    const nz = x => String(x || '').toLowerCase().replace(/ₕ/g, 'h').replace(/_/g, '').replace(/⁺/g, '');
    const q = nz(document.getElementById('hs-fq').value).trim();
    shown = items.filter(i => !q || nz([i.n, i.t, i.c.question, i.c.model, i.c.biology].join(' ')).includes(q));
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    document.getElementById('hs-fl').innerHTML = shown.map((i, k) => `<li role="option" aria-selected="${k === sel}" data-k="${k}">
      <span class="hs-level l${i.c.level || 0}">L${i.c.level || '–'}</span><b>${esc(i.n)}</b><span class="hs-fq-q">${esc(i.c.question || '')}</span><span class="hs-fq-p">${esc(i.t)}</span></li>`).join('')
      || '<li class="hs-none">No tool matches. Try a channel (Ih, M current), a cell (CA1, granule) or a method (impedance, bAP).</li>';
  }
  function go(i) { if (!i) return; location.href = (i.slug === P.slug ? '' : `sim-${i.slug}.html`) + hashOf(i.r); closeFinder(); }
  function openFinder() { finder.hidden = false; const q = document.getElementById('hs-fq'); q.value = ''; sel = 0; listTools(); q.focus(); }
  function closeFinder() { finder.hidden = true; }
  finder.addEventListener('click', e => { if (e.target === finder) closeFinder(); const li = e.target.closest('li[data-k]'); if (li) go(shown[+li.dataset.k]); });
  document.getElementById('hs-fq').addEventListener('input', () => { sel = 0; listTools(); });
  document.addEventListener('keydown', e => {
    const typing = /INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '');
    if (e.key === '/' && !typing && finder.hidden) { e.preventDefault(); openFinder(); return; }
    if (finder.hidden) return;
    if (e.key === 'Escape') closeFinder();
    else if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); listTools(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); listTools(); e.preventDefault(); }
    else if (e.key === 'Enter') go(shown[sel]);
  });

  /* ---------------- scientific panel ---------------- */
  const lesson = document.getElementById('lesson');
  const panel = document.createElement('section');
  panel.id = 'hs-panel';
  panel.setAttribute('aria-label', 'Model card and baseline');
  lesson.parentNode.insertBefore(panel, lesson);

  const refHTML = id => {
    const r = REFS[id]; if (!r) return '';
    return `<li><span class="hs-ref-a">${esc(r.a)} (${r.y}).</span> ${esc(r.t)}. <i>${esc(r.j)}</i> ${esc(r.v)}.
      ${r.u ? `<a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.u.replace(/^https?:\/\//, ''))}</a>` : ''}
      ${r.w ? `<span class="hs-ref-w">${esc(r.w)}</span>` : ''}</li>`;
  };
  const citeText = (route, c) => (c.refs || []).map(id => { const r = REFS[id]; return r ? `${r.a} (${r.y}). ${r.t}. ${r.j} ${r.v}. ${r.u || ''}` : ''; }).filter(Boolean).join('\n');

  function nav(route) {
    const k = P.routes.findIndex(r => r[0] === route), a = P.routes[k - 1], b = P.routes[k + 1];
    return `<span class="hs-step">${a ? `<a class="hs-btn" href="${a[0]}" data-tip="Previous tool: ${esc(a[1])}">← ${esc(a[1])}</a>` : ''}${b ? `<a class="hs-btn" href="${b[0]}" data-tip="Next tool: ${esc(b[1])}">${esc(b[1])} →</a>` : ''}</span>`;
  }
  function renderPanel(route) {
    const c = CARDS[route];
    if (!c) { panel.innerHTML = ''; return; }
    const [lvName, lvWhat] = LEVELS[c.level] || ['', ''];
    panel.innerHTML = `
      <div class="hs-strip">
        <p class="hs-q">${esc(c.question)}</p>
        <ol class="hs-steps" aria-label="Steps">
          <li class="hs-step-i" data-s="1"><button type="button" class="hs-stepb" id="hs-card-btn" aria-expanded="false" aria-controls="hs-card"
              data-tip="What this model is and the parameter values it starts from"><span class="n">1</span>Baseline</button></li>
          <li class="hs-step-i" data-s="2"><button type="button" class="hs-stepb" id="hs-run-btn" data-tip="Jump to the simulation and run it at baseline"><span class="n">2</span>Run</button></li>
          <li class="hs-step-i" data-s="3"><button type="button" class="hs-stepb" id="hs-pert-btn" aria-expanded="false" aria-controls="hs-pert"
              data-tip="Change one thing: move a control in the tool, or apply a literature manipulation (drug, disease, genotype)"><span class="n">3</span>Change${(c.presets || []).length ? ' ▾' : ''}</button>
            <span class="hs-delta" id="hs-delta" aria-live="polite">At baseline</span>
            <button type="button" class="hs-linkbtn" id="hs-reset" disabled data-tip="Put every control back to its baseline value">Reset</button></li>
          <li class="hs-step-i" data-s="4"><button type="button" class="hs-stepb primary" id="hs-save" data-tip="Save this run as a results folder and add it to the lab run log"><span class="n">4</span>Save run</button></li>
        </ol>
        <button type="button" class="hs-btn hs-fullbtn" id="hs-full" hidden>⛶ Full screen</button>
      </div>
      <div class="hs-guide" id="hs-guide" role="region" aria-live="polite" aria-label="What to do now" hidden>
        <span class="hs-gnum" id="hs-gnum"></span><p class="hs-gtext" id="hs-gtext"></p><div class="hs-gact" id="hs-gact"></div></div>
      <p class="hs-hint" id="hs-hint" hidden><span>New here? Go left to right: <b>1</b> shows the starting values, <b>2</b> runs the model, <b>3</b> changes one thing, <b>4</b> saves the run.</span><button type="button" class="hs-linkbtn" id="hs-hint-x" aria-label="Hide this tip">Got it</button></p>
      <div class="hs-pert" id="hs-pert" hidden>${pertHTML(c)}</div>
      <div class="hs-applied" id="hs-applied" hidden></div>
      <p class="hs-note" id="hs-note" role="status" hidden></p>
      <nav class="hs-jumps" id="hs-jumps" aria-label="On this page" hidden></nav>
      <div class="hs-changes" id="hs-changes" hidden></div>
      <div class="hs-card" id="hs-card" hidden>
        <p class="hs-card-model">${esc(c.model)}</p>
        ${c.baseline.length ? `<div class="hs-tbl"><table><thead><tr><th>Starts at</th><th>Value</th><th>Unit</th></tr></thead><tbody>
          ${c.baseline.map(b => `<tr><td>${esc(b[0])}${b[3] ? `<span class="hs-muted"> · ${esc(b[3])}</span>` : ''}</td><td class="num">${esc(b[1])}</td><td>${esc(b[2])}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="hs-muted">This tool shows published data; there are no model parameters to set.</p>'}
        <details class="hs-card-more"><summary>About this model: biology, validation, references</summary>
          <div class="hs-cgrid">
            <div><h3>Biology</h3><p>${esc(c.biology)}</p>${c.units ? `<p class="hs-units"><b>Units</b> ${esc(c.units)}</p>` : ''}</div>
            <div><h3>How it was checked</h3><p>${esc(c.validation)}</p></div>
            <div class="wide"><h3>References <button type="button" class="hs-btn sm" id="hs-cite">Copy</button></h3>
              ${c.refs.length ? `<ol class="hs-refs">${c.refs.map(refHTML).join('')}</ol>` : '<p class="hs-muted">Data display only.</p>'}</div>
          </div></details>
      </div>`;
    applied = [];
    const pb = document.getElementById('hs-pert-btn'), pe = document.getElementById('hs-pert');
    if (!(c.presets || []).length) pe.innerHTML = '<p class="hs-muted">Change one control in the tool below. Each change is listed here against its baseline value; Reset undoes them all.</p>';
    pb.onclick = () => { pe.hidden = !pe.hidden; pb.setAttribute('aria-expanded', String(!pe.hidden)); if (!pe.hidden) step(3); };
    pe.querySelectorAll('[data-p]').forEach(b => b.onclick = () => applyPreset(c.presets[+b.dataset.p]));
    document.getElementById('hs-run-btn').onclick = () => { const t = runTarget(); if (t) { openTo(t); t.scrollIntoView({behavior: 'smooth', block: 'start'}); } step(2); };

    const btn = document.getElementById('hs-card-btn'), cardEl = document.getElementById('hs-card');
    btn.onclick = () => { cardEl.hidden = !cardEl.hidden; btn.setAttribute('aria-expanded', String(!cardEl.hidden)); step(1); };
    document.getElementById('hs-reset').onclick = resetBaseline;
    document.getElementById('hs-save').onclick = () => { step(4); window.hsRun ? hsRun.open() : copy(JSON.stringify(settings(route), null, 2), document.getElementById('hs-save')); };
    const cite = document.getElementById('hs-cite'); if (cite) cite.onclick = e => copy(citeText(route, c), e.currentTarget);
    const hint = document.getElementById('hs-hint'); let seen = true; try { seen = localStorage.getItem('hs-hint-done') === '1'; } catch (e) {}
    hint.hidden = seen;
    document.getElementById('hs-hint-x').onclick = () => { hint.hidden = true; try { localStorage.setItem('hs-hint-done', '1'); } catch (e) {} };
    step(1);
    setTimeout(watchStrip, 50);
    guide.start();
  }

  /* ---------------- the steps stay in reach ----------------
     Once the step row scrolls away, a slim bar under the header keeps the change count, Reset and Save run. */
  const mini = document.createElement('div');
  mini.id = 'hs-mini'; mini.hidden = true;
  mini.innerHTML = `<span class="hs-mini-t"></span><span class="hs-mini-d"></span>
    <button type="button" class="hs-linkbtn" data-mini="reset" hidden>Reset</button>
    <button type="button" class="hs-btn primary" data-mini="save">Save run</button>`;
  document.body.appendChild(mini);
  mini.addEventListener('click', e => { const b = e.target.closest('[data-mini]'); if (!b) return;
    if (b.dataset.mini === 'save') document.getElementById('hs-save').click(); else resetBaseline(); });
  const setHdr = () => document.documentElement.style.setProperty('--hs-hdr', header.offsetHeight + 'px');
  setHdr(); addEventListener('resize', setHdr);
  let stripObs = null;
  function watchStrip() {
    if (stripObs) stripObs.disconnect();
    const st = panel.querySelector('.hs-strip'); if (!st || !('IntersectionObserver' in window)) return;
    mini.querySelector('.hs-mini-t').textContent = (P.routes.find(r => r[0] === routeNow) || [, ''])[1];
    stripObs = new IntersectionObserver(([en]) => { setHdr(); mini.hidden = en.isIntersecting || en.boundingClientRect.top > 0; },
      {rootMargin: `-${header.offsetHeight}px 0px 0px 0px`});
    stripObs.observe(st);
  }
  function syncMini(n) {
    mini.querySelector('.hs-mini-d').textContent = n ? `${n} change${n > 1 ? 's' : ''} from baseline` : 'At baseline';
    mini.querySelector('[data-mini="reset"]').hidden = !n;
  }

  /* ---------------- stay on track ----------------
     Links that would leave this tool become plain text (the only way forward is Next →), and sections that are
     questions, background or code walk-throughs fold into one closed "Background & questions" block at the end. */
  const OFFTRACK = /question|check yourself|learning goals|discussion|what could you test|what this lets you test|experiments to try|framework, 20|where the paper|methods are ambiguous|under the hood|^limits|sources|papers and data|cells, papers and code|reproduce one row|on any reconstruction|measure impedance with a chirp|load a reconstruction into neuron|same idea in numpy|how each step is computed|save configurations|predict first|in five lines|ideas this page uses|key terms|what each rung adds/i;
  function keyControlsFirst() {
    lesson.querySelectorAll('.ux-pane').forEach(pane => {
      if (pane.dataset.hsGrouped || pane.querySelectorAll('input[type=range]').length <= 8) return;
      pane.dataset.hsGrouped = '1';
      const heads = [...pane.children].filter(c => c.tagName === 'H4');
      heads.slice(1).forEach(h => {
        const grp = []; let n = h.nextElementSibling;
        while (n && n.tagName !== 'H4' && !n.matches('.ux-acts, .ux-note')) { grp.push(n); n = n.nextElementSibling; }
        const k = grp.reduce((a, g) => a + g.querySelectorAll('input[type=range], select, input[type=checkbox]').length, 0); if (!k) return;
        const d = document.createElement('details'); d.className = 'hs-cgroup';
        d.innerHTML = `<summary>${esc(h.textContent.trim())} <span>${k} more control${k > 1 ? 's' : ''}</span></summary>`;
        h.before(d); h.remove(); grp.forEach(g => d.appendChild(g));
      });
    });
    if (lab) {    // panels built from several open <details> groups: keep the first open
      const groups = [...lesson.querySelectorAll('details')].filter(d => d.open && d.querySelector('input[type=range], select') && !d.closest('.hs-extra, #hs-panel') && !d.parentElement.closest('details'));
      const byParent = new Map(); groups.forEach(d => { const p = d.parentElement; byParent.set(p, [...(byParent.get(p) || []), d]); });
      byParent.forEach(ds => { if (ds.length >= 4) ds.slice(2).forEach(d => { d.open = false; }); });
    }
  }
  function tidy() {
    keyControlsFirst();
    lesson.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href'); if (a.closest('.hs-next, #hs-panel, .hs-extra-keep')) return;
      if (h.startsWith('/') || h.startsWith('#/') || /^#?(biology|topics|experiments|workbench)[./]/.test(h)) {
        const sp = document.createElement('span'); sp.className = 'hs-unlinked'; sp.textContent = a.textContent; a.replaceWith(sp);
      }
    });
    lesson.querySelectorAll('.breadcrumbs, .nst-more, .nst-splitbtn, .ng-foot, .section-foot, footer').forEach(x => x.hidden = true);
    const offDetails = [...lesson.querySelectorAll('details')].filter(d => !d.closest('.hs-extra') && !d.classList.contains('hs-extra') && d.querySelector('summary')
      && OFFTRACK.test(d.querySelector('summary').textContent.trim()) && !d.querySelector('canvas'));
    const off = [...lesson.querySelectorAll('h2')].filter(h => OFFTRACK.test(h.textContent.trim()) && !h.closest('.hs-extra'));
    if (!off.length && !offDetails.length) return;
    let box = lesson.querySelector('details.hs-extra');
    if (!box) { box = document.createElement('details'); box.className = 'hs-extra'; box.innerHTML = '<summary>Background &amp; questions</summary><div class="hs-extra-body"></div>'; lesson.appendChild(box); if (!lab) box.open = true; }
    const body = box.querySelector('.hs-extra-body');
    offDetails.forEach(d => body.appendChild(d));
    off.forEach(h => {
      const sec = h.closest('section, .lesson-section'); 
      if (sec && sec !== lesson && !sec.contains(runTarget() || document.body) && sec.querySelectorAll('h2').length === 1) { body.appendChild(sec); return; }
      // heading without its own section: move it and the siblings up to the next h2
      const grp = [h]; let n = h.nextElementSibling; while (n && n.tagName !== 'H2' && !n.querySelector('h2')) { grp.push(n); n = n.nextElementSibling; }
      if (grp.some(x => x.querySelector && x.querySelector('canvas'))) return;   // never hide a live simulation
      grp.forEach(x => body.appendChild(x));
    });
  }

  /* ---------------- one direction: 1 Baseline → 2 Run → 3 Change → 4 Save ----------------
     The step you are on is highlighted; steps behind you are ticked. Running the tool ticks 2, any change ticks 3. */
  let reached = 1;
  function step(n) {
    reached = Math.max(reached, n);
    document.querySelectorAll('.hs-step-i').forEach(li => {
      const k = +li.dataset.s; li.classList.toggle('done', k < reached || (k === reached && k === 4 && saved)); li.classList.toggle('now', k === reached);
    });
  }
  let saved = false;
  window.hsStepSaved = () => { saved = true; step(4); guide.saved(); try { localStorage.setItem('hs-hint-done', '1'); } catch (e) {} const h = document.getElementById('hs-hint'); if (h) h.hidden = true; };
  function runTarget() {   // the first part of the tool with a plot and a control: where the simulation is
    const secs = [...lesson.querySelectorAll('section, .lesson-section, .box')].filter(x => x.querySelector('canvas, svg') && x.querySelector('input, select, button'));
    return secs[0] || lesson.querySelector('canvas') || null;
  }
  function openTo(t) { for (let d = t.parentElement; d; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true; }
  lesson.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('#hs-panel')) step(2); }, true);
  function nextTool(route) {
    const k = ALL.findIndex(a => a[0] === route); return k >= 0 && k + 1 < ALL.length ? ALL[k + 1] : null;
  }

  /* ---------------- guided steps ----------------
     One step at a time, in order, with a specific instruction for each; later steps stay locked until the current one
     is done. 1 Baseline (read it, confirm) → 2 Run at baseline (controls locked) → 3 Change one thing, run again →
     4 Save → 5 what next. Display → Guided steps: Off unlocks everything. */
  const guide = (() => {
    const on = () => false;   // guided steps retired in 0.9 (users found the locks got in the way)
    // the button that runs each tool once; tools not listed run continuously on their own (step 2 = look, then continue)
    const RUNS = {'/biology/research-resonance/': /^run sweep/i, '/biology/network/': /^single burst/i, '/biology/real-circuit/': /^fire$/i,
                  '/biology/action-potential/': /^pulse$/i, '/biology/reflex/': /^tap the tendon/i};
    const GENERIC = /^(run|start|simulate|fire)\b/i;
    let s = 0, n = 0, ranAfter = false, autoT = 0;
    const $g = id => document.getElementById(id);
    function runButtons() {
      const re = RUNS[routeNow] || GENERIC, txt = b => b.textContent.replace(/\s+/g, ' ').replace(/^[^A-Za-z]+/, '').trim();
      return [...lesson.querySelectorAll('button')].filter(b => !b.closest('#hs-panel, .hs-morenav, .hs-aside, details.hs-extra:not([open])') && re.test(txt(b)) && b.offsetParent);
    }
    const label = b => b.textContent.replace(/\s+/g, ' ').replace(/^[^A-Za-z]+/, '').trim().slice(0, 40);
    function lock() {
      const b = document.body;
      ['hs-g1', 'hs-g2', 'hs-g3', 'hs-g4', 'hs-g5'].forEach(c => b.classList.toggle(c, on() && c === 'hs-g' + s));
      b.classList.toggle('hs-guided', on());
      const dis = (id, k) => { const e = $g(id); if (e) { e.disabled = on() && s < k; e.closest('.hs-step-i') && e.closest('.hs-step-i').classList.toggle('locked', on() && s < k); } };
      dis('hs-run-btn', 2); dis('hs-pert-btn', 3); dis('hs-save', 4);
      const ms = document.querySelector('#hs-mini [data-mini="save"]'); if (ms) ms.disabled = on() && s < 4;
      lesson.querySelectorAll('.hs-pulse').forEach(x => x.classList.remove('hs-pulse'));
      if (on() && (s === 2 || (s === 3 && n > 0 && !ranAfter))) runButtons().slice(0, 2).forEach(x => x.classList.add('hs-pulse'));
    }
    function say(num, html, actions = '') {
      const box = $g('hs-guide'); if (!box) return;
      box.hidden = !on(); $g('hs-gnum').textContent = num; $g('hs-gtext').innerHTML = html; $g('hs-gact').innerHTML = actions;
    }
    function go(k) {
      s = k; clearTimeout(autoT); lock();
      if (!on()) { const b = $g('hs-guide'); if (b) b.hidden = true; return; }
      const rb = runButtons(), card = $g('hs-card');
      if (k === 1) {
        if (card) { card.hidden = false; $g('hs-card-btn').setAttribute('aria-expanded', 'true'); }
        say('Simulator · step 1 of 4 · Baseline', 'Read the starting values below: which model this is and the parameters it starts from. The simulation is locked until you confirm.',
          '<button type="button" class="hs-btn primary" data-g="read">I’ve read the baseline →</button>');
      } else if (k === 2) {
        step(2);
        if (rb.length) say('Simulator · step 2 of 4 · Run at baseline', `Press <b>${esc(label(rb[0]))}</b> in the simulation (it is highlighted) and look at the result before changing anything. Controls unlock after the run.`,
          '<button type="button" class="hs-btn" data-g="show">Show me the button</button>');
        else { say('Simulator · step 2 of 4 · Watch it at baseline', 'This model is already running. Watch the plot below at baseline (note what it looks like); the controls unlock when you continue.',
          '<button type="button" class="hs-btn primary" data-g="seen" disabled>I’ve looked at it →</button>');
          autoT = setTimeout(() => { const b = document.querySelector('[data-g="seen"]'); if (b) b.disabled = false; }, 2500); }
        const t = rb[0] || runTarget(); if (t) { openTo(t); t.scrollIntoView({behavior: 'smooth', block: 'center'}); }
      } else if (k === 3) {
        step(3); ranAfter = false; n = changes().length; text3();
      } else if (k === 4) {
        say('Simulator · step 4 of 4 · Save', 'Save this run. Name it after what you changed (for example “XE991, M-current −50 %”) so you can find and compare it later.',
          '<button type="button" class="hs-btn primary" data-g="save">Save run…</button>');
      } else if (k === 5) {
        say('Done · saved', 'Your run is in <b>Runs</b> with every value and the plots. What next?',
          `<a class="hs-btn" href="runs.html">Open Runs</a><button type="button" class="hs-btn" data-g="again">Reset and try another change</button>${(() => { const nx = nextTool(routeNow); return nx ? `<a class="hs-btn primary" href="${esc(nx[0])}">Next tool: ${esc(nx[1])} →</a>` : ''; })()}`);
      }
    }
    function text3() {
      const rb = runButtons(), pres = (CARDS[routeNow] || {}).presets || [];
      if (!n) say('Simulator · step 3 of 4 · Change one thing', `Change a single thing: move <b>one</b> control in the simulation${pres.length ? ', or open <b>Change ▾</b> above and pick a published manipulation (drug, disease model, genotype)' : ''}. Changing one thing at a time is what makes the result interpretable.`,
        pres.length ? '<button type="button" class="hs-btn" data-g="pert">Show published manipulations</button>' : '');
      else if (rb.length && !ranAfter) say('Simulator · step 3 of 4 · Run again', `${n} change${n > 1 ? 's' : ''} from baseline (listed above). Now press <b>${esc(label(rb[0]))}</b> again to see the effect.${n > 1 ? ' Tip: one change at a time is easier to interpret; Reset undoes them.' : ''}`);
      else say('Simulator · step 3 of 4 · Compare', `${n} change${n > 1 ? 's' : ''} from baseline. Compare the result with what you saw at baseline, then continue.`,
        '<button type="button" class="hs-btn primary" data-g="cmp">I’ve compared it →</button>');
      lock();
    }
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-g]');
      if (b) { const a = b.dataset.g;
        if (a === 'read') go(2);
        else if (a === 'seen') go(3);
        else if (a === 'show') { const r = runButtons()[0]; if (r) { openTo(r); r.scrollIntoView({behavior: 'smooth', block: 'center'}); r.focus(); } }
        else if (a === 'pert') { const pb = $g('hs-pert-btn'); if (pb && $g('hs-pert').hidden) pb.click(); $g('hs-pert').scrollIntoView({behavior: 'smooth', block: 'nearest'}); }
        else if (a === 'cmp') go(4);
        else if (a === 'save') $g('hs-save').click();
        else if (a === 'again') { resetBaseline(); saved = false; go(3); }
        return; }
      if (!on()) return;
      const btn = e.target.closest('button'); if (!btn || !lesson.contains(btn) || btn.closest('#hs-panel')) return;
      if (!runButtons().includes(btn)) return;
      if (s === 2) setTimeout(() => go(3), 400);
      else if (s === 3 && n > 0) { ranAfter = true; text3(); }
    }, true);
    // locked controls really are locked: no keyboard or pointer changes before their step
    ['keydown', 'pointerdown', 'mousedown', 'touchstart', 'wheel'].forEach(ev => lesson.addEventListener(ev, e => {
      if (!on() || s >= 3 || !(s === 1 || e.target.closest('input, select, textarea, [contenteditable], canvas, button, label, [role="button"], [role="tab"]'))) return;
      if (s === 2 && runButtons().includes(e.target.closest('button'))) return;
      if (ev === 'keydown' && (e.key === 'Tab' || e.key === 'Shift')) return;
      e.preventDefault(); e.stopPropagation();
      const g = $g('hs-guide'); if (g) { g.classList.remove('hs-nudge'); void g.offsetWidth; g.classList.add('hs-nudge'); }
    }, {capture: true, passive: false}));
    return {
      start() { n = 0; ranAfter = false; setTimeout(() => go(1), 0); },
      changed(k) { n = k; if (s === 3) text3(); },
      saved() { if (on()) go(5); },
      refresh() { lock(); go(s || 1); },
      get step() { return s; }
    };
  })();
  window.hsGuide = guide;
  /* ---------------- the main point only ----------------
     Short mode shows the tool's main simulation (the first section with a plot and controls, plus the result
     plots just before it). Every other section is one tap away in "More in this tool" at the end. */
  const MAIN_EXTRA = {'/biology/cell-atlas/': 1};   // sections after the main one that belong to it
  const topSections = () => [...lesson.querySelectorAll('.lesson-section')]   // studio: only the panel(s) on screen, not mounted hidden ones
    .filter(x => !x.parentElement.closest('.lesson-section') && !x.closest('.hs-extra') && !(x.closest('.nst-pane') || {}).hidden);
  function focusMain(route) {
    lesson.querySelectorAll('.hs-morenav').forEach(n => n.remove());
    lesson.querySelectorAll('.hs-aside').forEach(x => x.classList.remove('hs-aside', 'hs-aside-open'));
    const secs = topSections(); if (secs.length < 2) return;
    const has = (x, q) => !!x.querySelector(q);
    let i = secs.findIndex(x => has(x, 'canvas, svg') && has(x, 'input, select')); if (i < 0) return;
    let a = i; while (a > 0 && has(secs[a - 1], 'canvas, svg') && !has(secs[a - 1], 'input, select')) a--;
    const z = Math.min(secs.length - 1, i + (MAIN_EXTRA[route] || 0));
    const aside = secs.filter((x, k) => k < a || k > z);
    aside.forEach(x => x.classList.add('hs-aside'));
    const items = aside.map(x => [x, (x.querySelector('h2') || {}).textContent]).filter(([, t]) => t && t.trim());
    const ex = lesson.querySelector('details.hs-extra');
    if (!items.length && !ex) return;
    const nav = document.createElement('nav'); nav.className = 'hs-morenav'; nav.setAttribute('aria-label', 'More in this tool');
    nav.innerHTML = '<span>More in this tool</span>' + items.map(([, t], k) => `<button type="button" data-k="${k}" aria-pressed="false">${esc(t.trim().slice(0, 60))}</button>`).join('')
      + (ex ? '<button type="button" data-k="bg" aria-pressed="false">Background &amp; questions</button>' : '');
    nav.addEventListener('click', e => {
      const b = e.target.closest('button[data-k]'); if (!b) return;
      const t = b.dataset.k === 'bg' ? ex : items[+b.dataset.k][0];
      const open = !t.classList.contains('hs-aside-open'); t.classList.toggle('hs-aside-open', open); b.setAttribute('aria-pressed', String(open));
      if (t.tagName === 'DETAILS') t.open = open;
      if (open) { dispatchEvent(new Event('resize')); t.scrollIntoView({behavior: 'smooth', block: 'start'}); }
    });
    const next = lesson.querySelector('.hs-next'); lesson.insertBefore(nav, next || null);
  }

  function addNext(route) {
    lesson.querySelectorAll('.hs-next').forEach(n => n.remove());
    const n = nextTool(route), here = ALL.find(a => a[0] === route);
    const box = document.createElement('nav'); box.className = 'hs-next'; box.setAttribute('aria-label', 'Next');
    box.innerHTML = n ? `<span>${n[2] === here[2] ? 'Next in ' + esc(here[3]) : 'Next workspace: ' + esc(n[3])}</span>
        <a class="hs-btn primary" href="${n[2] === P.slug ? n[0] : 'sim-' + n[2] + '.html' + hashOf(n[0])}">${esc(n[1])} →</a>`
      : `<span>Last tool.</span><a class="hs-btn primary" href="simulator.html">Back to Simulate</a>`;
    lesson.appendChild(box);
    const ex = lesson.querySelector('details.hs-extra'); if (ex) lesson.insertBefore(ex, box);
  }

  /* ---------------- full screen for the neuron selected in this tool ----------------
     The button names the cell, so it is clear which neuron opens; it follows the cell menu as it changes. */
  function currentCell() {
    const ok = id => id && window.ngAtlasMeta && ngAtlasMeta(id);
    const shared = document.getElementById('nstCell');                       // the studio's shared cell menu
    if (shared && ok(shared.value)) return shared.value;
    for (const s of lesson.querySelectorAll('select')) if (ok(s.value)) return s.value;
    const q = new URLSearchParams(location.hash.split('?')[1] || '').get('cell'); if (ok(q)) return q;
    try { const st = localStorage.getItem('ng-studio-cell'); if (ok(st) && document.body.classList.contains('hs-page-studio')) return st; } catch (e) {}
    return null;
  }
  function syncFull() {
    const b = document.getElementById('hs-full'); if (!b) return;
    const id = typeof window.ngOpenNeuronViewer === 'function' ? currentCell() : null;
    b.hidden = !id; document.body.classList.toggle('hs-hasfull', !!id); if (!id) return;
    const m = ngAtlasMeta(id) || {}, name = `${m.name || id}${m.code ? ' · ' + m.code : ''}`;
    b.textContent = `⛶ Full screen: ${name}`; b.dataset.cell = id;
    b.setAttribute('data-tip', `Open ${name} full screen: rotate, zoom, record a rotation video`);
  }
  document.addEventListener('click', e => { const b = e.target.closest('#hs-full'); if (b && b.dataset.cell) ngOpenNeuronViewer(b.dataset.cell); });
  lesson.addEventListener('change', e => { if (e.target.tagName === 'SELECT') setTimeout(syncFull, 50); }, true);
  window.addEventListener('hashchange', () => setTimeout(syncFull, 300));

  /* ---------------- perturbation presets ---------------- */
  const KINDS = {pharmacology: 'Pharmacology', disease: 'Disease', genetic: 'Genetic', physiology: 'Physiology', circuit: 'Circuit', model: 'Model structure'};
  let applied = [];
  function pertHTML(c) {
    const ps = c.presets || []; if (!ps.length) return '';
    const groups = [...new Set(ps.map(p => p.kind))];
    return groups.map(k => `<div class="hs-pgroup"><h4>${esc(KINDS[k] || k)}</h4>${ps.map((p, i) => p.kind !== k ? '' : `
      <div class="hs-preset" title="${esc((p.size ? 'Size: ' + p.size : '') + (p.refs.length ? ' · ' + p.refs.map(r => REFS[r] ? `${REFS[r].a.split(/[ ,]/)[0]} ${REFS[r].y}` : '').filter(Boolean).join('; ') : ''))}"><div><b>${esc(p.name)}</b><span>${esc(p.what)}</span>
        <small>Size: ${esc(p.size)}${p.refs.length ? ' · ' + p.refs.map(r => REFS[r] ? `${esc(REFS[r].a.split(/[ ,]/)[0])} ${REFS[r].y}` : '').filter(Boolean).join('; ') : ''}</small></div>
        <button type="button" class="hs-btn" data-p="${i}">Apply</button></div>`).join('')}</div>`).join('')
      + '<p class="hs-muted">Or change any control in the tool. Reset undoes everything.</p>';
  }
  function findCtl(sel) {
    if (sel.startsWith('#')) return [document.getElementById(sel.slice(1))].filter(Boolean);
    let type = null; if (sel.startsWith('range:')) { type = 'range'; sel = sel.slice(6); }
    const re = new RegExp(sel.slice(1), 'i');
    return [...lesson.querySelectorAll(SEL)].filter(el => (!type || el.type === type) && re.test(el.dataset.hsLabel || labelOf(el)));
  }
  function applyPreset(p) {
    ensureSnap();
    let n = 0;
    p.ops.forEach(([sel, v]) => findCtl(sel).forEach(el => {
      if (typeof v === 'boolean') el.checked = v; else el.value = String(v);
      el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); n++;
    }));
    if (!applied.includes(p.name)) applied.push(p.name);
    showApplied(n ? '' : 'No matching control is visible on this tool yet.');
    diff(); setTimeout(diff, 150);   // update now; again once the tool has reacted
  }
  function showApplied(warn) {
    const A = document.getElementById('hs-applied'); if (!A) return;
    A.hidden = !applied.length && !warn;
    A.innerHTML = (applied.length ? '<span>Applied</span>' + applied.map(a => `<b>${esc(a)}</b>`).join('') : '') + (warn ? `<em>${esc(warn)}</em>` : '');
  }

  async function copy(text, btn) {
    const old = btn.textContent;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); btn.textContent = 'Copied'; } catch (_) { btn.textContent = 'Select failed'; } ta.remove(); }
    setTimeout(() => btn.textContent = old, 1400);
  }

  /* ---------------- baseline tracker ----------------
     When a tool renders, every control it shows is recorded as the baseline. Changes are listed as
     "label: baseline → now"; Reset restores every value and lets the tool re-run. */
  let base = new Map(), routeNow = '';
  const SEL = 'input[type=range],input[type=number],input[type=checkbox],input[type=radio],select';
  const val = el => (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
  const show = (el, v) => el.tagName === 'SELECT' ? ((el.options[el.selectedIndex] || {}).text || v) : (typeof v === 'boolean' ? (v ? 'on' : 'off') : v);
  const CTL = 'input:not([type=hidden]),select,textarea';
  // text around one control inside a box that holds several ("From [1] to [20] Hz, step [1]" -> "From … Hz", "to … Hz", "step")
  function localText(el, box) {
    const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let pre = '', post = '', seen = false, n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 1) { if (n.matches(CTL)) { if (n === el) seen = true; else if (seen) break; else pre = ''; } if (n.tagName === 'OPTION') w.nextSibling(); continue; }
      if (n.parentElement && n.parentElement.closest('select,option')) continue;
      if (seen) post += n.textContent; else pre += n.textContent;
    }
    pre = pre.replace(/\s+/g, ' ').trim(); post = post.replace(/\s+/g, ' ').trim();
    const lead = pre.match(UNIT_LEAD); if (lead) pre = pre.slice(lead[0].length).trim();      // "Hz, step" -> "step": the unit belonged to the previous box
    const unit = (post.match(UNIT_HEAD) || [])[1] || '';
    return (pre + (unit ? ` (${unit})` : '')).trim();
  }
  const UNITS = 'mV|ms|s|Hz|kHz|µA/cm²|mA/cm²|mS/cm²|µS/cm²|nA|pA|µm|mm|°C|%|nS|mM|µM|MΩ|µF/cm²';
  const UNIT_HEAD = new RegExp('^(' + UNITS + ')(?![\\w/])'), UNIT_LEAD = new RegExp('^(' + UNITS + ')[,;]\\s*');
  const many = box => box && box.querySelectorAll(CTL).length > 1;
  function labelOf(el) {
    let t = '', box = null;
    if (el.id) box = lesson.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (!box) box = el.closest('label');
    if (box) t = many(box) ? localText(el, box) : box.innerText;
    if (!t && el.getAttribute('aria-label')) t = el.getAttribute('aria-label');
    if (!t && el.title) t = el.title;
    const tr = !t && el.closest('tr');
    if (tr) {                                     // parameter tables: first cell names the row, the unit cell (if any) follows
      const cells = [...tr.children].filter(c => !c.contains(el)).map(c => c.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
      t = cells[0] || ''; const u = cells.find((c, i) => i > 0 && /^[µmkMnpG]?[A-Za-zΩ°%²/·]{1,9}$/.test(c)); if (u) t += ` (${u})`;
    }
    if (!t) { const p = el.parentElement; if (p) t = many(p) ? localText(el, p) : p.innerText; }
    if (el.tagName === 'SELECT') [...el.options].forEach(o => { if (o.text.trim()) t = t.replace(o.text.trim(), ' '); });   // a menu's label, not its options
    t = (t || '').replace(/\s+/g, ' ').trim();
    if (t && el.value !== '' && el.type !== 'checkbox' && el.type !== 'radio') {          // drop a live read-out of the value ("Frequency 100")
      const v = String(el.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp('\\s+' + v + '(\\s*(' + UNITS + '))?$'), '$1').trim();
    }
    if (!t) { const ps = el.previousElementSibling; if (ps && !ps.matches(CTL) && ps.innerText && ps.innerText.trim().length < 40) t = ps.innerText.trim(); }
    t = t || el.name || el.id || el.type;
    return t.length > 60 ? t.slice(0, 57) + '…' : t;
  }
  const keyOf = (el, i) => el.id ? '#' + el.id : el.tagName + ':' + i;
  let snapped = false;
  // the baseline must be recorded before the first change, even if someone acts within the first moment
  const ensureSnap = () => { if (!snapped) { tidy(); snapshot(); } };
  lesson.addEventListener('pointerdown', ensureSnap, true);
  lesson.addEventListener('keydown', ensureSnap, true);
  function snapshot() {
    if (snapped) { diff(); return; }
    snapped = true;
    base = new Map();
    [...lesson.querySelectorAll(SEL)].forEach((el, i) => {
      if (el.closest('#hs-panel')) return;
      const label = labelOf(el), shownV = show(el, val(el));
      base.set(keyOf(el, i), {v: val(el), shown: shownV, label});
      el.dataset.hsLabel = label; el.dataset.hsBase = shownV;
      if (window.hsExplain && hsExplain.lookup(label)) {
        const lab = (el.id && lesson.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label');
        if (lab && !lab.contains(lesson.querySelector('canvas'))) { lab.classList.add('hs-explainable'); lab.dataset.hsLabel = label; }
      }
    });
    const n = document.getElementById('hs-live-n');
    if (n) n.textContent = base.size ? `Live baseline: all ${base.size} controls on this tool were recorded when it opened; changes are tracked against them.` : '';
    diff();
  }
  // a number box that sits next to a slider mirrors it: tracked and reset, but not listed twice
  const mirror = el => el.type === 'number' && [el.parentElement, el.parentElement && el.parentElement.parentElement]
    .some(p => p && p.querySelectorAll('input[type=range]').length === 1);
  function changes() {
    const out = [];
    [...lesson.querySelectorAll(SEL)].forEach((el, i) => {
      const b = base.get(keyOf(el, i)); if (!b || mirror(el)) return;
      const v = val(el);
      if (String(v) !== String(b.v)) out.push({el, label: b.label, from: b.shown, to: show(el, v)});
    });
    return out;
  }
  function diff() {
    const ch = changes(), d = document.getElementById('hs-delta'), box = document.getElementById('hs-changes'), rs = document.getElementById('hs-reset');
    if (!d) return;
    lesson.querySelectorAll('.hs-changed').forEach(e => e.classList.remove('hs-changed'));
    ch.forEach(c => c.el.classList.add('hs-changed'));
    d.textContent = ch.length ? `${ch.length} change${ch.length > 1 ? 's' : ''} from baseline` : 'At baseline';
    if (ch.length) step(3);
    syncMini(ch.length);
    guide.changed(ch.length);
    d.classList.toggle('on', ch.length > 0);
    rs.disabled = !ch.length;
    box.hidden = !ch.length;
    box.innerHTML = ch.map(c => `<span class="hs-chip"><b>${esc(c.label)}</b> ${esc(c.from)} → <em>${esc(c.to)}</em></span>`).join('');
  }
  function resetBaseline() {
    // sliders, menus and switches first, exact number boxes last (they carry the full-precision baseline)
    const els = [...lesson.querySelectorAll(SEL)].map((el, i) => [el, base.get(keyOf(el, i))]).filter(([el, b]) => b);
    [...els.filter(([el]) => el.type !== 'number'), ...els.filter(([el]) => el.type === 'number')].forEach(([el, b]) => {
      if (String(val(el)) === String(b.v)) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = b.v; else el.value = b.v;
      el.dispatchEvent(new Event('input', {bubbles: true}));
      el.dispatchEvent(new Event('change', {bubbles: true}));
    });
    applied = []; const A = document.getElementById('hs-applied'); if (A) { A.hidden = true; A.innerHTML = ''; }
    diff();
  }
  function settings(route) {
    return {tool: (CARDS[route] ? (P.routes.find(r => r[0] === route) || [, ''])[1] : route), route, page: P.title,
            level: CARDS[route] ? CARDS[route].level : null, recorded: new Date().toISOString(),
            baseline_controls: base.size, presets_applied: applied.slice(), changes: changes().map(c => ({parameter: c.label, baseline: c.from, value: c.to})),
            references: (CARDS[route] || {}).refs || []};
  }
  /* ---------------- API for hs-run.js (save / load runs) ---------------- */
  function controls() {
    return [...lesson.querySelectorAll(SEL)].map((el, i) => {
      const k = keyOf(el, i), b = base.get(k); if (!b) return null;
      const v = val(el), m = mirror(el);
      let label = b.label;
      if (m) { const r = [el.parentElement, el.parentElement.parentElement].map(p => p && p.querySelector('input[type=range]')).find(Boolean);
               if (r && r.dataset.hsLabel) label = `${r.dataset.hsLabel} (exact value, ${b.label})`; }
      return {key: k, label, type: el.type === 'select-one' ? 'menu' : el.type, baseline: b.v, value: v,
              baseline_shown: b.shown, value_shown: show(el, v), mirror: m, changed: !m && String(v) !== String(b.v),
              ...(el.type === 'range' || el.type === 'number' ? {min: el.min, max: el.max, step: el.step} : {}),
              ...(el.tagName === 'SELECT' ? {options: [...el.options].map(o => [o.value, o.text.trim()])} : {}),
              ...(m ? {mirrors: (([el.parentElement, el.parentElement.parentElement].map(p => p && p.querySelector('input[type=range]')).find(Boolean)) || {}).id || ''} : {})};
    }).filter(Boolean);
  }
  function applyValues(vals, presetNames) {
    const els = [...lesson.querySelectorAll(SEL)].map((el, i) => ({el, k: keyOf(el, i), l: el.dataset.hsLabel || labelOf(el)}));
    const hits = [];
    vals.forEach(([key, label, v]) => {
      const hit = els.find(e => e.k === key && (!label || e.l === label)) || els.find(e => e.l === label && e.el.type !== 'number') || els.find(e => e.k === key);
      if (hit) hits.push([hit.el, v]);
    });
    // menus, switches and sliders first; exact number boxes last (full precision wins)
    [...hits.filter(([el]) => el.type !== 'number'), ...hits.filter(([el]) => el.type === 'number')].forEach(([el, v]) => {
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = v === true || v === 'true'; else el.value = String(v);
      el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true}));
    });
    (presetNames || []).forEach(n => { if (!applied.includes(n)) applied.push(n); });
    showApplied('');
    setTimeout(diff, 150);
    return new Set(hits.map(h => h[0])).size;
  }
  function note(t) { const n = document.getElementById('hs-note'); if (!n) return; n.textContent = t; n.hidden = !t; }
  window.hsPage = {route: () => routeNow, routes: () => P.routes, card: () => CARDS[routeNow], refs: REFS,
                   controls, applyValues, applied: () => applied.slice(), note, settings: () => settings(routeNow)};

  // throttle, not debounce: running simulations redraw continuously
  let pending = false;
  const schedule = ms => { if (pending) return; pending = true; setTimeout(() => { pending = false; diff(); }, ms); };
  lesson.addEventListener('input', () => schedule(80), true);
  lesson.addEventListener('change', () => schedule(80), true);
  new MutationObserver(() => schedule(400)).observe(lesson, {childList: true, subtree: true});

  /* ---------------- routing ---------------- */
  const mark = () => { const p = ngPath(); header.querySelectorAll('[data-r]').forEach(a => { a.toggleAttribute('aria-current', a.dataset.r === p); if (a.dataset.r === p) a.scrollIntoView({block: 'nearest', inline: 'center'}); }); };
  function jumps() {
    const J = document.getElementById('hs-jumps'); if (!J) return;
    // the tool's own section links (short names) when it has them, else its headings; one row, not two
    const own = lesson.querySelector('nav.page-jumps');
    let items = own ? [...own.querySelectorAll('a')].map(a => [(a.getAttribute('href') || '').replace(/^.*#/, ''), a.textContent.trim()])
      .filter(([id]) => id && document.getElementById(id) && !document.getElementById(id).closest('.hs-extra')) : [];
    if (items.length >= 2) own.hidden = true;
    else {
      const hs = [...lesson.querySelectorAll('h2')].filter(h => h.textContent.trim() && !h.closest('.hs-extra')).slice(0, 12);
      hs.forEach((h, i) => { if (!h.id) h.id = 'hs-sec-' + i; });
      items = hs.map(h => [h.id, h.textContent.trim().slice(0, 48)]);
    }
    J.hidden = items.length < 2;
    J.innerHTML = '<span>On this page</span>' + items.map(([id, t]) => `<a href="#" data-to="${esc(id)}">${esc(t)}</a>`).join('');
    J.querySelectorAll('a').forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.dataset.to);
      for (let d = t.parentElement; d; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true;   // open folded sections on the way
      t.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); });
  }
  function after() {
    const p = ngPath();
    mark();
    if (p !== routeNow) { routeNow = p; renderPanel(p);
      try { const t = ALL.find(a => a[0] === p); if (t) localStorage.setItem('hs-last', JSON.stringify({href: `sim-${t[2]}.html${hashOf(p)}`, tool: t[1], ws: t[3]})); } catch (e) {} reached = 1; saved = false; snapped = false; setTimeout(() => { tidy(); snapshot(); foldProse(); trimLead(); hideEmpty(); syncFull(); addNext(p); focusMain(p); if (window.hsRun) hsRun.applyPending(); }, 700); }
  }
  const prev = window.ngAfterRender;
  window.ngAfterRender = function () { if (prev) prev.apply(this, arguments); after(); };

  // Route links ("/biology/x/") also get a real address, so open-in-new-tab, copy link and long-press work.
  const realHrefs = () => document.querySelectorAll('a[href^="/"]:not([href^="//"])').forEach(a => {
    const path = a.getAttribute('href').split('?')[0].replace(/\/?$/, '/');
    if (P.routes.some(r => r[0] === path)) { a.dataset.r = a.dataset.r || path; a.setAttribute('href', ngHash(a.getAttribute('href'))); }
    else if ((P.where || {})[path]) { a.dataset.r = a.dataset.r || path; a.setAttribute('href', P.where[path] + ngHash(a.getAttribute('href'))); }
  });
  const laterHrefs = () => [900, 2500, 6000].forEach(t => setTimeout(realHrefs, t));   // tools add links as they render
  window.addEventListener('hashchange', laterHrefs); laterHrefs();
  ['pointerdown', 'contextmenu', 'focusin'].forEach(ev => document.addEventListener(ev, e => { if (e.target.closest && e.target.closest('a[href^="/"]')) realHrefs(); }, true));

  // A link to a tool that lives on another simulator page opens that page; anything else stays here.
  window.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="/"]'); if (!a || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const path = a.getAttribute('href').split('?')[0].replace(/\/?$/, '/'), page = (P.where || {})[path];
    if (page && !P.routes.some(r => r[0] === path)) { e.preventDefault(); e.stopImmediatePropagation(); location.href = page + ngHash(path); }
  }, true);
  try { renderGuide(); } catch (e) { console.error(e); }
  try { ngAfterRender(); } catch (e) { console.error(e); }
})();
