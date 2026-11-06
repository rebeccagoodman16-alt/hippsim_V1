/* hippsim app shell, loaded on every page.
   - Bottom tab bar on phones and in the installed app: Home · Simulator · Find · Runs · Library.
   - Installed-app support when the site is served from its own address (GitHub Pages etc.):
     registers the service worker (offline), offers "Install app", and shows the iPhone "Add to Home Screen" hint.
   window.HS_APP (from hs-app-config.js) = {sw: bool, sharedLog: url of the claude.ai lab log or ""}. */
(function () {
  'use strict';
  const CFG = window.HS_APP || {sw: false, sharedLog: ''};
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('hs-standalone');

  const css = document.createElement('style');
  css.textContent = `
  .hs-tabbar{display:none}
  @media (max-width:640px){
    .hs-tabbar{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;z-index:50;
      background:rgba(255,249,242,.97);border-top:1px solid #d6c8bd;padding:4px max(6px,env(safe-area-inset-left,0px)) calc(4px + env(safe-area-inset-bottom,0px)) max(6px,env(safe-area-inset-right,0px));
      -webkit-backdrop-filter:saturate(1.4) blur(10px);backdrop-filter:saturate(1.4) blur(10px)}
    body{padding-bottom:calc(64px + env(safe-area-inset-bottom,0px)) !important}
  }
  html.hs-standalone .hs-tabbar{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;z-index:50;
      background:rgba(255,249,242,.97);border-top:1px solid #d6c8bd;padding:4px 6px calc(4px + env(safe-area-inset-bottom,0px))}
  html.hs-standalone body{padding-bottom:calc(64px + env(safe-area-inset-bottom,0px)) !important}
  .hs-tabbar a,.hs-tabbar button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border:0;background:none;
      font:600 10.5px/1.2 system-ui,sans-serif;color:#75665f;text-decoration:none;border-radius:10px;cursor:pointer;min-height:48px;justify-content:center}
  .hs-tabbar svg{width:22px;height:22px}
  .hs-tabbar [aria-current="page"]{color:var(--hs-accent,#a62962)}
  .hs-tabbar a:focus-visible,.hs-tabbar button:focus-visible{outline:2px solid var(--hs-accent,#a62962);outline-offset:-2px}
  .hs-install{position:fixed;left:12px;right:12px;bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:55;display:flex;gap:10px;align-items:center;
      background:#171313;color:#fff9f2;border-radius:14px;padding:12px 14px;box-shadow:0 12px 30px rgba(0,0,0,.25);font:14px/1.4 system-ui,sans-serif}
  .hs-install p{margin:0;flex:1}
  .hs-install button{font:600 13px system-ui,sans-serif;border-radius:9px;padding:9px 12px;border:1px solid rgba(255,255,255,.3);background:transparent;color:inherit;cursor:pointer}
  .hs-install button.go{background:var(--hs-accent,#a62962);border-color:var(--hs-accent,#a62962)}
  @media (min-width:641px){.hs-install{left:auto;right:20px;bottom:20px;max-width:380px}}`;
  document.head.appendChild(css);

  /* ---------- one top menu on every page: Simulate · Runs · Models · Cells & data ---------- */
  const SECTIONS = [['index.html', 'Neurons', /^(index\.html|atlas|library|)$/], ['runs.html', 'Runs', /^runs/],
                    ['simulator.html', 'Tools', /^(simulator|sim-)/], ['models.html', 'Models', /^(models|registry|validation)/], ['docs.html', 'Docs', /^(docs|about|welcome|file)/]];
  const navHTML = () => SECTIONS.map(([h, n, re]) => `<a href="${h}"${re.test(here) ? ' aria-current="page"' : ''}>${n}</a>`).join('');
  const header = document.querySelector('body > header');
  if (header && header.querySelector('.hs-gnav')) header.querySelector('.hs-gnav').innerHTML = navHTML();
  else if (header && !header.querySelector('.hs-tabs')) {   // tool pages keep their own header (← Simulate, workspace, numbered tools)                                                                                       // every other page
    const onHub = here === 'simulator.html';
    header.innerHTML = `<div class="hs-row1"><a class="brand" href="index.html">hippsim</a><nav class="hs-gnav" aria-label="Sections">${navHTML()}</nav>
      </div>`;
    header.classList.add('hs-gheader');
    const find = () => { const q = document.getElementById('hs-hq'); if (onHub && q) { q.scrollIntoView({block: 'center'}); q.focus(); } else location.href = 'simulator.html#find'; };
    if (!onHub) document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); find(); } });
  }

  /* ---------- Display: how each person likes things shown (saved on this device) ---------- */
  const DKEY = 'hs-display';
  const SWATCH = {"rose": ["#f8cddd", "#a62962", "#fff9f2"], "slate": ["#dbe5ef", "#1f5f99", "#f7f9fb"], "sage": ["#d9e7da", "#2d6a46", "#f8faf5"], "contrast": ["#ffffff", "#0050a0", "#000000"]};
  const DEFAULTS = {size: 'm', theme: 'light', palette: 'rose', explain: 'short', guide: 'off', layout: 'web', hover: 'on'};
  const OPTIONS = [
    ['size', 'Text size', '', [['m', 'Standard'], ['l', 'Large'], ['xl', 'Extra large']]],
    ['palette', 'Colours', 'High contrast also uses colour-blind-safe colours for cell parts.', [['rose', 'Rose'], ['slate', 'Slate'], ['sage', 'Sage'], ['contrast', 'High contrast']]],
    ['theme', 'Light or dark', '', [['light', 'Light'], ['dark', 'Dark']]],
    ['layout', 'View', 'Phone shows the app at phone size on a computer.', [['web', 'Web'], ['phone', 'Phone']]],
    ['hover', 'Show explanations on hover', 'Point at (or tap) a model, test, channel or part of the cell for what it is and does. Cards stay short either way; Details holds the full information.', [['on', 'On'], ['off', 'Off']]],
    ['explain', 'Explanations', 'Short shows controls and results; Full also shows the background text.', [['short', 'Short'], ['full', 'Full']]]];
  const D = (() => { let v = {}; try { v = JSON.parse(localStorage.getItem(DKEY) || '{}'); } catch (e) {}
    try { if (!v.explain) { const m = localStorage.getItem('hs-mode'); if (m) v.explain = m === 'learn' ? 'full' : 'short'; }
          if (!v.hover) { const h = localStorage.getItem('hs-explain'); if (h !== null) v.hover = h === '1' ? 'on' : 'off'; } } catch (e) {}
    const o = Object.assign({}, DEFAULTS, v); o.guide = 'off'; try { o.layout = window.hsLayout ? hsLayout.get() : 'web'; } catch (e) {} return o; })();
  function applyDisplay() {
    const r = document.documentElement;
    r.setAttribute('data-hs-size', D.size);
    const dark = D.theme === 'dark';
    r.setAttribute('data-hs-theme', dark ? 'dark' : 'light');
    if (D.palette && D.palette !== 'rose') r.setAttribute('data-hs-palette', D.palette); else r.removeAttribute('data-hs-palette');
    if (window.hsSetMode) hsSetMode(D.explain !== 'full');
    if (window.hsGuide) hsGuide.refresh();
    r.setAttribute('data-hs-hover', D.hover === 'off' ? 'off' : 'on');
    if (window.hsExplain) hsExplain.set(D.hover !== 'off');
  }
  applyDisplay();
  window.addEventListener('load', applyDisplay);
  function checkUpdate(msg) { if (window.hsCheckUpdate) hsCheckUpdate(msg); else msg.textContent = 'This copy runs inside claude.ai and is always the latest published version.'; }
  const sheet = document.createElement('div');
  sheet.id = 'hs-display'; sheet.hidden = true;
  sheet.innerHTML = `<div class="hs-dsheet" role="dialog" aria-modal="true" aria-labelledby="hs-dh">
    <div class="hs-dhead"><h2 id="hs-dh">Display</h2><button type="button" class="hs-dclose" aria-label="Close">✕</button></div>
    <p class="hs-dsub">Saved on this device.</p>
    <div class="hs-drow hs-dupd"><div><b>Version ${(window.HS_APP && HS_APP.version) || ''}</b><span class="hs-updmsg">The installed app updates itself when it is online; a banner offers a reload when a new version is ready.</span></div>
      <div class="hs-seg"><button type="button" class="hs-updchk">Check for updates</button></div></div>
    ${OPTIONS.map(([k, t, hint, opts]) => `<div class="hs-drow" role="radiogroup" aria-label="${t}"><div><b>${t}</b>${hint ? `<span>${hint}</span>` : ''}</div>
      <div class="hs-seg">${opts.map(([v, l]) => `<button type="button" role="radio" data-k="${k}" data-v="${v}">${k === 'palette' ? `<span class="hs-sw" aria-hidden="true">${SWATCH[v].map(c => `<i style="background:${c}"></i>`).join('')}</span>` : ''}${l}</button>`).join('')}</div></div>`).join('')}
    <div class="hs-dfoot"><button type="button" class="hs-dreset">Reset</button><button type="button" class="hs-ddone">Done</button></div></div>`;
  document.body.appendChild(sheet);
  const mark = () => sheet.querySelectorAll('[data-k]').forEach(b => { const on = D[b.dataset.k] === b.dataset.v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  const save = () => { try { localStorage.setItem(DKEY, JSON.stringify(D)); } catch (e) {} };
  sheet.addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (b && b.dataset.k === 'layout') { if (window.hsLayout && hsLayout.get() !== b.dataset.v) hsLayout.set(b.dataset.v); return; }
    if (b) { D[b.dataset.k] = b.dataset.v; save(); applyDisplay(); mark(); return; }
    if (e.target === sheet || e.target.closest('.hs-dclose, .hs-ddone')) closeDisplay();
    if (e.target.closest('.hs-updchk')) { checkUpdate(sheet.querySelector('.hs-updmsg')); return; }
    if (e.target.closest('.hs-dreset')) { Object.assign(D, DEFAULTS); save(); applyDisplay(); mark(); }
  });
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') return closeDisplay();
    const b = e.target.closest('[data-k]'); if (!b || !/Arrow(Left|Right|Up|Down)/.test(e.key)) return;
    const all = [...b.parentElement.children], i = all.indexOf(b) + (/Right|Down/.test(e.key) ? 1 : -1);
    const n = all[(i + all.length) % all.length]; n.click(); n.focus(); e.preventDefault();
  });
  let lastFocus = null;
  function openDisplay() { lastFocus = document.activeElement; mark(); sheet.hidden = false; const c = sheet.querySelector('[aria-checked="true"]'); if (c) c.focus(); }
  function closeDisplay() { sheet.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('click', e => { if (e.target.closest('[data-hs-display]')) { e.preventDefault(); openDisplay(); } });
  window.hsDisplay = {open: openDisplay, get: () => Object.assign({}, D)};
  const dispBtn = '<button type="button" class="hs-disp-btn" data-hs-display aria-haspopup="dialog"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Display</span></button>';
  if (header && header.classList.contains('hs-gheader')) header.querySelector('.hs-row1').insertAdjacentHTML('beforeend', dispBtn);

  /* ---------- account (only on a self-hosted copy with Google sign-in; see docs/ACCOUNTS.md) ---------- */
  if (window.HS_BACKEND && header) {
    const acc = document.createElement('button'); acc.type = 'button'; acc.className = 'hs-btn hs-acct';
    const show = u => { acc.textContent = u ? (u.displayName || u.email || 'Account').split(' ')[0] + ' · Sign out' : 'Sign in with Google';
      acc.title = u ? `Signed in as ${u.email || ''}. Saved runs are stored with this account.` : 'Sign in to save runs. Browsing and simulating need no account.'; };
    acc.addEventListener('click', async () => { const u = await HS_BACKEND.current(); try { if (u) await HS_BACKEND.signOut(); else await HS_BACKEND.signIn(); } catch (e) { acc.textContent = e.code === 'not_allowed' ? 'Account not allowed' : 'Sign-in failed'; acc.title = e.message; } });
    HS_BACKEND.onChange(show);
    const disp = header.querySelector('.hs-disp-btn'); if (disp) disp.before(acc); else (header.querySelector('.hs-row1') || header).appendChild(acc);
  }

  /* ---------- footer on every page: version, how to cite, about ---------- */
  if (!document.querySelector('.hs-foot')) {
    const f = document.createElement('footer'); f.className = 'hs-foot';
    const v = (window.HS_APP && HS_APP.version) || '';
    f.innerHTML = `<span>hippsim${v ? ' ' + v : ''}</span><a href="welcome.html">How hippsim works</a><a href="docs.html">Docs</a><a href="docs.html#citing">How to cite</a><a href="docs.html#release-notes">Release notes</a><a href="library.html#files">Data &amp; files</a>`;
    document.body.appendChild(f);
  }

  /* ---------- bottom tab bar ---------- */
  const I = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    sim: '<path d="M3 12h4l2-6 4 12 2-6h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    find: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    runs: '<path d="M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
    models: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    docs: '<path d="M6 3h9l4 4v14H6z M15 3v4h4 M9 11h7 M9 15h7 M9 19h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
    lib: '<path d="M12 21V11 M12 11c0-3-2-5-5-6 M12 11c0-3 2-5 5-6 M12 15c-2-1-4-1-6 0 M12 15c2-1 4-1 6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="19.5" r="1.8" fill="currentColor"/>'
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
  const cur = (...p) => p.includes(here) ? ' aria-current="page"' : '';
  const bar = document.createElement('nav');
  bar.className = 'hs-tabbar'; bar.setAttribute('aria-label', 'App');
  bar.innerHTML = `
    <a href="index.html"${cur('index.html', '', 'atlas.html', 'library.html')}>${svg('lib')}Neurons</a>
    <a href="runs.html"${cur('runs.html')}>${svg('runs')}Runs</a>
    <a href="simulator.html"${cur('simulator.html') || (here.startsWith('sim-') ? ' aria-current="page"' : '')}>${svg('sim')}Tools</a>
    <a href="models.html"${cur('models.html', 'registry.html', 'validation.html')}>${svg('models')}Models</a>
    <a href="docs.html"${cur('docs.html', 'about.html')}>${svg('docs')}Docs</a>`;
  document.body.appendChild(bar);
  if (location.hash === '#find' && here === 'simulator.html') setTimeout(() => { const q = document.getElementById('hs-hq'); if (q) q.focus(); }, 200);

  /* ---------- repository files (YAML, JSON, Markdown, CSV, code, BibTeX) open in file.html with Back, not as bare text ---------- */
  const FILE_RE = /\.(ya?ml|json|md|csv|py|bib|cff|txt|tsv)$/i;
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || a.hasAttribute('download')) return;
    let u; try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    const root = new URL('.', location.href);
    if (u.origin !== location.origin || !u.pathname.startsWith(root.pathname) || !FILE_RE.test(u.pathname)) return;
    e.preventDefault();
    location.href = 'file.html?f=' + encodeURIComponent(decodeURIComponent(u.pathname.slice(root.pathname.length)));
  }, true);

  /* ---------- installed app (own address only; claude.ai keeps its own sandbox) ---------- */
  if (!CFG.sw || !('serviceWorker' in navigator) || !isSecureContext) return;
  // updates: the browser fetches sw.js fresh (no HTTP cache); a new version installs in the background, takes over,
  // and a banner offers a reload (never automatic, so a running simulation is not lost)
  let swReg = null, hadCtl = !!navigator.serviceWorker.controller, shown = false;
  navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).then(r => { swReg = r; r.update().catch(() => {}); }).catch(() => {});
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && swReg) swReg.update().catch(() => {}); });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadCtl) { hadCtl = true; return; }                       // first install: nothing to reload
    if (shown) return; shown = true;
    const box = document.createElement('div'); box.className = 'hs-install'; box.setAttribute('role', 'status');
    box.innerHTML = '<p><b>hippsim has been updated.</b> Reload to use the new version.</p><button type="button" class="go">Reload</button><button type="button" class="x">Later</button>';
    document.body.appendChild(box);
    box.querySelector('.go').onclick = () => location.reload();
    box.querySelector('.x').onclick = () => box.remove();
  });
  window.hsCheckUpdate = async msg => {
    if (!swReg) { msg.textContent = 'Updates are checked when the app is opened from its own address.'; return; }
    msg.textContent = 'Checking…';
    try { await swReg.update(); } catch (e) { msg.textContent = 'Could not reach the server; try again when online.'; return; }
    msg.textContent = swReg.installing || swReg.waiting ? 'A new version is downloading; a Reload banner will appear.' : 'You have the latest version.';
  };
  let seen = false; try { seen = localStorage.getItem('hs-install-dismissed') === '1'; } catch (e) {}
  if (standalone || seen) return;
  function offer(text, onGo, goLabel) {
    const box = document.createElement('div'); box.className = 'hs-install'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Install hippsim');
    box.innerHTML = `<p>${text}</p>${onGo ? `<button type="button" class="go">${goLabel}</button>` : ''}<button type="button" class="x">Not now</button>`;
    document.body.appendChild(box);
    box.querySelector('.x').onclick = () => { box.remove(); try { localStorage.setItem('hs-install-dismissed', '1'); } catch (e) {} };
    if (onGo) box.querySelector('.go').onclick = () => { box.remove(); onGo(); };
  }
  window.addEventListener('beforeinstallprompt', e => {          // Android / desktop Chrome, Edge
    e.preventDefault();
    if (here === 'index.html' || here === '') offer('Install hippsim as an app: full screen, home-screen icon, works offline.', () => e.prompt(), 'Install');
  });
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS && (here === 'index.html' || here === '')) setTimeout(() => offer('Install on iPhone: tap <b>Share</b> <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="vertical-align:-3px"><path d="M12 15V3m0 0L8 7m4-4l4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> then <b>Add to Home Screen</b>.'), 1500);
})();
