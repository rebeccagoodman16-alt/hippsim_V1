/* Hash router: the multi-page guide runs as one hosted page.
   Route "/lab/hh/" is stored as "#lab.hh" (dots keep links shareable).
   Navigation re-renders in place: no reload, no visible scrolling. Animation
   loops started by a page are tracked and stopped when you leave it. */
function ngPath() {
  const h = decodeURIComponent(location.hash.slice(1)).split('?')[0];
  if (!h) return '/';
  if (h.startsWith('/')) return h.endsWith('/') ? h : h + '/';
  return '/' + h.split('.').filter(Boolean).join('/') + '/';
}
function ngHash(path) {
  const [p, q] = path.split('?'), parts = p.split('/').filter(Boolean);
  return (parts.length ? '#' + parts.join('.') : '#') + (q ? '?' + q : '');   // a query (?preset=…) is kept for the workbenches
}
function ngGo(path) {
  const h = ngHash(path);
  if (h === location.hash || (h === '#' && !location.hash)) { ngTop(); return; }
  location.hash = h;
}
function ngTop() { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }

/* ---- track per-page animation frames and intervals so navigation can stop them ---- */
const NG_TRACK = { raf: new Set(), iv: new Set() };
(function () {
  const raf = window.requestAnimationFrame.bind(window), caf = window.cancelAnimationFrame.bind(window);
  const si = window.setInterval.bind(window), ci = window.clearInterval.bind(window);
  window.requestAnimationFrame = cb => { const id = raf(t => { NG_TRACK.raf.delete(id); cb(t); }); NG_TRACK.raf.add(id); return id; };
  window.cancelAnimationFrame = id => { NG_TRACK.raf.delete(id); caf(id); };
  window.setInterval = (f, ms, ...a) => { const id = si(f, ms, ...a); NG_TRACK.iv.add(id); return id; };
  window.clearInterval = id => { NG_TRACK.iv.delete(id); ci(id); };
  window.ngStopPage = () => {
    NG_TRACK.raf.forEach(caf); NG_TRACK.raf.clear(); NG_TRACK.iv.forEach(ci); NG_TRACK.iv.clear();
    try { if (practiceCleanup) { practiceCleanup(); practiceCleanup = null; } } catch (e) {}
  };
})();

/* Internal links ("/…") become hash routes; in-page anchors ("#code") scroll smoothly. */
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const a = e.target.closest('a[href]'); if (!a) return;
  const href = a.getAttribute('href');
  if (href.startsWith('/') && !href.startsWith('//')) { e.preventDefault(); ngGo(href); }
  else if (/^#[A-Za-z][\w-]*$/.test(href)) {
    const t = document.getElementById(href.slice(1));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  }
}, true);

window.addEventListener('hashchange', () => {
  ngStopPage();
  try { renderGuide(); } catch (err) { console.error(err); location.reload(); return; }
  ngTop();
  if (window.ngAfterRender) ngAfterRender();
  const L = document.getElementById('lesson');
  if (L) { L.classList.remove('ng-in'); void L.offsetWidth; L.classList.add('ng-in'); }
});
