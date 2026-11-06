/* refs.js: one source format for the whole guide (data in refs-data.js, every entry checked against Crossref/PubMed).
   After each page renders:
   1. Citations already written on the page without a link (e.g. "Braak H, Braak E (1991). …") get a DOI link when they match a verified entry.
   2. The page's mapped papers that it does not already cite are listed in the same format as the lesson "Academic sources":
      inside the page's existing sources section if it has one, otherwise in a "Papers behind this page" section before the footer. */
(function () {
  'use strict';
  const R = window.NG_REFS || {}, MAP = window.NG_REF_MAP || {};
  const KIND = { P: 'Primary research', R: 'Review', D: 'Data resource', M: 'Method' };
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`´]/g, "'").toLowerCase();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** First author's surname: everything before the first block of initials ("van Vreeswijk C" -> "vreeswijk"). */
  const surname = r => { const m = r.a.split(',')[0].match(/^(.+?)\s+[A-Z][A-Z.-]*$/); return norm((m ? m[1] : r.a.split(',')[0]).split(' ').pop()); };
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /** Does normalised text t name this paper's first author (as a whole word) and its year? */
  const names = (t, r) => new RegExp('(^|[^a-z])' + reEsc(surname(r)) + '([^a-z]|$)').test(t) && t.includes(String(r.y));
  const linkKey = u => u.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/\/$/, '').toLowerCase();
  const SRC_SEL = '#reading, .reading, #sp-sources, #ad-refs, #at-sources, .rb-refs, .ng-refs';
  /** The page's own sources section, if any (an id we know, or a section whose heading names sources/references). */
  function sourcesSection(L) {
    const known = L.querySelector('#reading, #sp-sources, #ad-refs, #at-sources, section.reading');
    if (known) return known;
    return [...L.querySelectorAll('section')].find(s => { const h = s.querySelector('h2'); return h && /^(academic )?(sources|references|key references|further reading|reading)\b/i.test(h.textContent.trim()); }) || null;
  }
  function itemHTML(r) {
    return `<div class="reading-item ng-ref"><a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.a)} (${r.y}). ${esc(r.t)} ↗</a><small><i>${esc(r.j)}</i> ${esc(r.v)} · <span class="ng-ref-kind ng-k-${r.k}">${KIND[r.k]}</span> · ${esc(r.w)}</small></div>`;
  }
  function apply() {
    const L = document.getElementById('lesson'); if (!L || !window.ngPath) return;
    const route = ngPath(); if (L.querySelector('.ng-refs-added, a.ng-ref-link') && L.dataset.refsFor === route) return;   // already done for this page
    L.querySelectorAll('.ng-refs-added').forEach(e => e.remove()); L.dataset.refsFor = route;
    const ids = (MAP[route] || []).filter(id => R[id]);
    // 1. what the page already links to
    const linked = new Set([...L.querySelectorAll('a[href]')].map(a => linkKey(a.getAttribute('href'))));
    const present = new Set(ids.filter(id => linked.has(linkKey(R[id].u))));
    // 2. unlinked citations in reference-like elements: add a DOI link when author + year match a verified entry
    const cands = [...L.querySelectorAll(`${SRC_SEL} li, ${SRC_SEL} p, ${SRC_SEL} .reading-item, ul.rb-refs li`)].filter(e => !e.querySelector('a[href^="http"], li, p, div, ul, ol, section, details') && !e.closest('.ng-refs-added') && e.textContent.length < 600);
    cands.forEach(e => {
      const t = norm(e.textContent);
      const hit = Object.entries(R).find(([, r]) => names(t, r) && (t.includes(norm(r.v.split(':')[0]) + ':') || t.includes(norm(r.t).slice(0, 40))));
      if (!hit) return;
      const [id, r] = hit; present.add(id);
      e.insertAdjacentHTML('beforeend', ` <a class="ng-ref-link" href="${esc(r.u)}" target="_blank" rel="noopener" title="Verified link">${r.u.includes('doi.org') ? 'DOI' : 'PubMed'} ↗</a>`);
    });
    // 3. the rest of the mapped papers, unless the page already names them (surname + year anywhere in a sources section)
    const srcText = norm([...L.querySelectorAll(SRC_SEL)].map(s => s.textContent).join(' '));
    const todo = ids.filter(id => !present.has(id) && !names(srcText, R[id]));
    if (!todo.length) return;
    const list = todo.map(id => itemHTML(R[id])).join('');
    const own = sourcesSection(L);
    if (own) {
      own.insertAdjacentHTML('beforeend', `<div class="ng-refs-added ng-refs"><h3>Primary papers behind this page</h3>${list}<p class="muted">Each link was checked against Crossref or PubMed. Start with the first.</p></div>`);
    } else {
      const html = `<section class="lesson-section reading ng-refs-added ng-refs" id="ng-refs"><p class="eyebrow">Go to the evidence</p><h2>Papers behind this page</h2>${list}<p class="muted">Each link was checked against Crossref or PubMed. Start with the first; the note says what the paper showed and why it matters here.</p></section>`;
      const anchor = L.querySelector(':scope > .wb-related') || L.querySelector(':scope > .complete-row, :scope > footer, :scope > nav.sx-pn, :scope > .sp-footer, :scope > .small-print');
      if (anchor && anchor.classList.contains('wb-related')) anchor.insertAdjacentHTML('afterend', html);
      else if (anchor) anchor.insertAdjacentHTML('beforebegin', html);
      else L.insertAdjacentHTML('beforeend', html);
    }
  }
  window.ngApplyRefs = apply;
  let q = 0; const later = () => { clearTimeout(q); q = setTimeout(apply, 60); };
  const prev = window.ngAfterRender; window.ngAfterRender = function (...a) { if (typeof prev === 'function') prev.apply(this, a); later(); };
  const L0 = document.getElementById('lesson'); if (L0 && 'MutationObserver' in window) new MutationObserver(later).observe(L0, { childList: true });
  later();
})();
