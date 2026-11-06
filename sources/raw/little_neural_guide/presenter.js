/* presenter.js: teaching and presentation tools for the core text.
   1. Present mode: any textbook section (or a whole chapter) becomes full-screen 16:9 slides built from its content:
      title + objectives, every figure, every numbered equation (with the sentence that introduces it), worked examples,
      pitfalls, algorithms, the across-scales panel, key points, and exercises (question first, solution on the next click).
      Keys: → / space / click = next, ← = back, Home/End, B = black screen, W = white screen, F = full screen, N = notes,
      G = go to slide, Esc = exit. Every slide carries its source in the bottom-right corner.
   2. Slide files: the same slides as a PDF or a PowerPoint (.pptx, with speaker notes), rendered in the browser.
   3. Figure downloads: every textbook figure can be saved as a high-resolution PNG (for PowerPoint / Google Slides) or SVG.
   Files are offered through the artifact `downloads` capability, with a normal download as fallback. */
(function () {
  'use strict';
  const B = window.NG_BOOK; if (!B) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PATH = () => (window.ngPath ? ngPath() : '/');
  const SEC = new Map(); B.chapters.forEach(c => c.sections.forEach(s => SEC.set(s.route, { c, s })));
  const OVERVIEW = new Map(B.chapters.map(c => ['/pathways/' + pathSlugs[c.pathway] + '/', c]));
  const label = r => { try { const p = ngAllPages().find(x => x.href === r); if (p) return p.label; } catch (e) {} return r; };
  const plainTitle = h => { const d = document.createElement('div'); d.innerHTML = h; d.querySelectorAll('math').forEach(m => { const a = m.querySelector('annotation'); m.replaceWith(a ? a.textContent.replace(/\\(text|mathrm)\{([^}]*)\}/g, '$2').replace(/[\\{}]/g, '') : ''); }); return d.textContent.trim(); };

  /* sources for figure slides (bottom-right corner) */
  const FIG_SRC = {
    'morph-ca1-layers': 'Reconstruction mpg141209_A · Migliore et al. 2018, PLoS Comput Biol · ModelDB 244688',
    'morph-electrotonic': 'Reconstruction mpg141209_A · Migliore et al. 2018 · ModelDB 244688',
    'morph-rall': 'Reconstructions: Migliore et al. 2018 (ModelDB 244688); Jarsky et al. 2005 (ModelDB 116084)',
    'morph-dlambda': 'Reconstructions: Migliore et al. 2018; Jarsky et al. 2005; Migliore, Ferrante & Ascoli 2005 (ModelDB)',
    'morph-sholl': 'Reconstructions: Migliore et al. 2018; Jarsky et al. 2005 (ModelDB)',
    'morph-cell-types': 'Reconstructions: Beining et al. 2017; Hemond et al. 2008; Jarsky et al. 2005; Sekulic et al. 2015; Tukker et al. 2013 (ModelDB)',
    'morph-bap': 'NEURON: Migliore, Ferrante & Ascoli 2005 channels (ModelDB 55035) on Migliore et al. 2018 / Jarsky et al. 2005 cells',
    'ca1-gradients': 'Schematic after Magee 1998, J Neurosci; Hoffman et al. 1997, Nature',
    'shunt-mg': 'Mg²⁺ block: Jahr & Stevens 1990, J Neurosci · Little Neural Guide',
    'wilson-cowan': 'Parameters: Wilson & Cowan 1972, Biophys J (Fig. 11a) · Little Neural Guide',
    'hh-gates': 'Rate functions: Hodgkin & Huxley 1952, J Physiol · Little Neural Guide', 'hh-spike': 'Hodgkin & Huxley 1952, J Physiol · Little Neural Guide',
  };
  const srcFor = (key, s) => FIG_SRC[key] || `Computed from the equations of §${s.num} · Little Neural Guide`;

  /* ---------- slides from a section ---------- */
  function slidesFor(c, s, opts = {}) {
    const out = [], name = esc(label(s.route)), foot = `§${s.num} ${name}`, textSrc = `Little Neural Guide · Chapter ${c.n}, §${s.num}`;
    out.push({ kind: 'title', foot, src: textSrc, html: `<p class="ps-kicker">Chapter ${c.n} · ${c.title}</p><h1><span class="ps-num">${s.num}</span>${name}</h1><p class="ps-sub">After this section you can</p><ul class="ps-obj">${s.obj.map(o => `<li>${o}</li>`).join('')}</ul>` });
    const d = document.createElement('div'); d.innerHTML = s.body; let lastP = null;
    for (const el of [...d.children]) {
      if (el.matches('p')) { lastP = el; continue; }
      if (el.matches('h3')) continue;
      if (el.matches('figure.tb-fig')) {
        const img = el.querySelector('img'), cap = el.querySelector('figcaption'), key = (img.getAttribute('src') || '').split('/').pop().replace('.svg', '');
        const n = (cap.querySelector('b') || {}).textContent || ''; cap.querySelector('b') && cap.querySelector('b').remove();
        out.push({ kind: 'fig', foot, src: srcFor(key, s), key, html: `<p class="ps-label">${esc(n.replace(/\.$/, ''))}</p><div class="ps-figwrap"><img src="${img.getAttribute('src')}" alt="${esc(n)}"></div><p class="ps-cap">${cap.innerHTML}</p>`, notes: cap.innerHTML });
      } else if (el.matches('.tb-eq')) {
        const n = (el.querySelector('.tb-eq-num') || {}).textContent || '', body = el.querySelector('.tb-eq-body').innerHTML;
        let lead = lastP ? lastP.innerHTML : ''; const tmp = document.createElement('div'); tmp.innerHTML = lead; if (tmp.textContent.length > 260) { const sent = lead.split(/(?<=[.:])\s+(?=[A-Z])/); lead = sent[sent.length - 1]; }
        out.push({ kind: 'eq', foot, src: textSrc, html: `<p class="ps-label">Equation ${esc(n)}</p>${lead ? `<p class="ps-lead">${lead}</p>` : ''}<div class="ps-eq">${body}</div>`, notes: lastP ? lastP.innerHTML : '' });
      } else if (el.matches('.tb-example')) {
        out.push({ kind: 'ex', foot, src: textSrc, html: `<div class="ps-box ps-ex">${el.innerHTML}</div>` });
      } else if (el.matches('.tb-note.tb-pitfall, .tb-note.tb-biology')) {
        out.push({ kind: 'note', foot, src: textSrc, html: `<div class="ps-box ps-note ${el.classList.contains('tb-biology') ? 'ps-bio' : ''}">${el.innerHTML}</div>` });
      } else if (el.matches('.tb-algo')) {
        out.push({ kind: 'algo', foot, src: textSrc, html: `<div class="ps-algo">${el.outerHTML}</div>` });
      } else if (el.matches('.tb-scales')) {
        out.push({ kind: 'scales', foot, src: textSrc, html: `<p class="ps-label">Across scales · §${s.num}</p><div class="ps-scales">${el.querySelector('dl').outerHTML}</div>` });
      } else if (el.matches('.table-scroll')) {
        out.push({ kind: 'table', foot, src: textSrc, html: `<p class="ps-label">Table · §${s.num}</p><div class="ps-table">${el.innerHTML}</div>` });
      }
    }
    out.push({ kind: 'key', foot, src: textSrc, html: `<p class="ps-label">Key points · §${s.num}</p><ul class="ps-key">${s.summary.map(x => `<li>${x}</li>`).join('')}</ul>` });
    if (opts.exercises !== false) s.problems.forEach((p, k) => out.push({ kind: 'prob', foot, src: textSrc, steps: 2, html: `<p class="ps-label">Exercise ${s.num}.${k + 1} · ${{ calc: 'Calculate', concept: 'Explain', derive: 'Derive' }[p.kind] || ''}</p><div class="ps-q">${p.q}</div><div class="ps-a" data-step="1"><p class="ps-label">Solution</p>${p.a}</div>` }));
    return out;
  }
  function slidesForChapter(c, opts) {
    const first = { kind: 'title', foot: `Chapter ${c.n}`, src: `Little Neural Guide · Chapter ${c.n}`, html: `<p class="ps-kicker">Part ${c.part} · ${esc(B.parts[c.part])}</p><h1><span class="ps-num">Ch. ${c.n}</span>${c.title}</h1><ol class="ps-toc">${c.sections.map(s => `<li><b>${s.num}</b> ${esc(label(s.route))}</li>`).join('')}</ol>` };
    return [first, ...c.sections.flatMap(s => slidesFor(c, s, opts))];
  }

  /* shrink a slide's text until it fits its 1600×900 frame (measured in unscaled slide pixels) */
  function fitSlide(slideEl) {
    const body = slideEl.querySelector('.ps-body'); body.style.fontSize = ''; let f = 100;
    while (body.scrollHeight > body.clientHeight + 2 && f > 58) { f -= 6; body.style.fontSize = f + '%'; }
    const eq = body.querySelector('.ps-eq math');
    if (eq) { let ef = 62; eq.style.fontSize = ef + 'px'; while (eq.scrollWidth > 1420 && ef > 24) { ef -= 4; eq.style.fontSize = ef + 'px'; } }
  }
  /* ---------- the slide show ---------- */
  let show = null;
  function present(slides, title) {
    if (show) return; let i = 0, step = 0, notes = false;
    const ov = document.createElement('div'); ov.className = 'ps-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Presentation: ' + title);
    ov.innerHTML = `<div class="ps-stage"><div class="ps-slide" id="ps-slide"></div></div>
      <div class="ps-ctl"><button type="button" data-a="prev" aria-label="Previous slide">←</button><span id="ps-count"></span><button type="button" data-a="next" aria-label="Next slide">→</button>
      <button type="button" data-a="notes" title="Notes (N)">Notes</button><button type="button" data-a="fs" title="Full screen (F)">⛶</button><button type="button" data-a="help" title="Shortcuts (?)">?</button><button type="button" data-a="close" aria-label="Exit (Esc)">✕</button></div>
      <div class="ps-notes" id="ps-notes" hidden></div><div class="ps-blank" id="ps-blank" hidden></div>
      <div class="ps-help" id="ps-help" hidden><b>Keys</b> → space click: next · ←: back · Home/End · G: go to slide · B/W: black/white screen · F: full screen · N: notes · Esc: exit</div>`;
    document.body.appendChild(ov); document.documentElement.classList.add('ps-open');
    const slideEl = ov.querySelector('#ps-slide'), stage = ov.querySelector('.ps-stage');
    const fit = () => { const W = window.innerWidth, H = window.innerHeight, k = Math.min(W / 1600, H / 900); slideEl.style.transform = `translate(-50%,-50%) scale(${k})`; };
    const render = () => {
      const S = slides[i];
      slideEl.className = 'ps-slide psk-' + S.kind;
      slideEl.innerHTML = `<div class="ps-body">${S.html}</div><div class="ps-foot"><span>${S.foot}</span><span class="ps-src">${esc(S.src)}</span></div>`;
      slideEl.querySelectorAll('[data-step]').forEach(x => x.hidden = +x.dataset.step > step);
      ov.querySelector('#ps-count').textContent = `${i + 1} / ${slides.length}`;
      const nt = ov.querySelector('#ps-notes'); nt.innerHTML = S.notes ? `<b>Notes</b> ${S.notes}` : '<b>Notes</b> <span class="muted">none for this slide</span>'; nt.hidden = !notes;
      fitSlide(slideEl);
    };
    const next = () => { const S = slides[i]; if (S.steps && step < S.steps - 1) { step++; render(); return; } if (i < slides.length - 1) { i++; step = 0; render(); } };
    const prev = () => { if (step > 0) { step--; render(); return; } if (i > 0) { i--; const S = slides[i]; step = S.steps ? S.steps - 1 : 0; render(); } };
    const blank = col => { const b = ov.querySelector('#ps-blank'); if (!b.hidden && b.dataset.c === col) { b.hidden = true; return; } b.dataset.c = col; b.style.background = col; b.hidden = false; };
    const fs = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else ov.requestFullscreen().catch(() => {}); } catch (e) {} };
    const close = () => { document.removeEventListener('keydown', key); window.removeEventListener('resize', fit); try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {} ov.remove(); document.documentElement.classList.remove('ps-open'); show = null; };
    const key = e => {
      if (/INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
      else if (k === 'Home') { i = 0; step = 0; render(); } else if (k === 'End') { i = slides.length - 1; step = 0; render(); }
      else if (k === 'b' || k === 'B' || k === '.') blank('#000'); else if (k === 'w' || k === 'W' || k === ',') blank('#fff');
      else if (k === 'f' || k === 'F') fs(); else if (k === 'n' || k === 'N') { notes = !notes; render(); }
      else if (k === '?') ov.querySelector('#ps-help').hidden = !ov.querySelector('#ps-help').hidden;
      else if (k === 'g' || k === 'G') { const box = ov.querySelector('#ps-count'); box.contentEditable = 'true'; box.focus(); document.getSelection().selectAllChildren(box); box.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); const v = parseInt(box.textContent, 10); box.contentEditable = 'false'; if (v >= 1 && v <= slides.length) { i = v - 1; step = 0; } render(); } else if (ev.key === 'Escape') { box.contentEditable = 'false'; render(); } ev.stopPropagation(); }; }
      else if (k === 'Escape') { if (!ov.querySelector('#ps-blank').hidden) ov.querySelector('#ps-blank').hidden = true; else close(); }
    };
    ov.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (b) { const a = b.dataset.a; if (a === 'next') next(); else if (a === 'prev') prev(); else if (a === 'close') close(); else if (a === 'fs') fs(); else if (a === 'notes') { notes = !notes; render(); } else if (a === 'help') ov.querySelector('#ps-help').hidden = !ov.querySelector('#ps-help').hidden; return; }
      if (e.target.closest('#ps-blank')) { ov.querySelector('#ps-blank').hidden = true; return; }
      if (e.target.closest('.ps-stage') && !e.target.closest('a, summary, details, button')) { const x = e.clientX / window.innerWidth; x < 0.25 ? prev() : next(); }
    });
    let tx = null; ov.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true }); ov.addEventListener('touchend', e => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) dx < 0 ? next() : prev(); tx = null; });
    document.addEventListener('keydown', key); window.addEventListener('resize', fit);
    let idle = 0; const wake = () => { ov.classList.remove('ps-idle'); clearTimeout(idle); idle = setTimeout(() => ov.classList.add('ps-idle'), 2500); }; ov.addEventListener('mousemove', wake); wake();
    fit(); render(); show = { close };
  }

  /* ---------- slides as PDF / PowerPoint files (rendered in the browser; print is not available inside claude.ai) ---------- */
  const LIBS = { pdf: ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', () => window.jspdf && window.jspdf.jsPDF],
                 pptx: ['https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', () => window.PptxGenJS] };
  const loadLib = k => new Promise((res, rej) => { const [url, ok] = LIBS[k], src = (window.NG_LIB_BASE ? window.NG_LIB_BASE + url.split('/').pop() : url); if (ok()) return res(ok());
    const sc = document.createElement('script'); sc.src = src; sc.onload = () => ok() ? res(ok()) : rej(new Error('library')); sc.onerror = () => rej(new Error('library')); document.head.appendChild(sc); });
  let CSS_TEXT = null;
  function cssText() {
    if (CSS_TEXT) return CSS_TEXT; const parts = [];
    for (const sh of document.styleSheets) { try { const href = sh.href || ''; if (href && !/(styles|textbook|presenter)\.css/.test(href)) continue; for (const r of sh.cssRules) parts.push(r.cssText); } catch (e) {} }
    return (CSS_TEXT = parts.join('\n') + '\n.ps-slide{position:relative!important;left:0!important;top:0!important;transform:none!important;box-shadow:none!important}');
  }
  const dataURI = new Map();
  async function inlineImgs(node) {
    for (const im of node.querySelectorAll('img')) { const src = im.getAttribute('src'); if (!src || src.startsWith('data:')) continue;
      if (!dataURI.has(src)) { try { const t = await (await fetch(src)).text(); dataURI.set(src, 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(t)))); } catch (e) { dataURI.set(src, ''); } }
      im.setAttribute('src', dataURI.get(src)); im.removeAttribute('loading'); }
  }
  async function slideImage(el, scale = 1.25) {
    const clone = el.cloneNode(true); await inlineImgs(clone);
    const W = 1600, H = 900, xhtml = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px"><style>${cssText().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</style>${xhtml}</div></foreignObject></svg>`;
    const img = new Image(); img.decoding = 'sync';
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('render')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff9f2'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  }
  const plainNotes = h => { const d = document.createElement('div'); d.innerHTML = h || ''; d.querySelectorAll('math').forEach(m => { const a = m.querySelector('annotation'); m.replaceWith(a ? ' ' + a.textContent + ' ' : ' '); }); return d.textContent.replace(/\s+/g, ' ').trim(); };
  async function exportSlides(slides, title, fmt, btn) {
    const label0 = btn ? btn.textContent : ''; const say = t => { if (btn) btn.textContent = t; };
    say('Loading…'); let Lib; try { Lib = await loadLib(fmt); } catch (e) { say('Could not load the exporter'); setTimeout(() => say(label0), 3000); return; }
    const host = document.createElement('div'); host.className = 'ps-print'; host.setAttribute('aria-hidden', 'true');
    host.innerHTML = slides.map(S => `<section class="ps-slide psk-${S.kind} ps-page"><div class="ps-body">${S.html.replace(/data-step="1"/g, '')}</div><div class="ps-foot"><span>${S.foot}</span><span class="ps-src">${esc(S.src)}</span></div></section>`).join('');
    document.body.appendChild(host);
    const imgs = [...host.querySelectorAll('img')]; imgs.forEach(im => { im.loading = 'eager'; });
    await Promise.all(imgs.map(im => im.complete ? 1 : new Promise(r => { im.onload = im.onerror = r; })));
    const pages = [...host.querySelectorAll('.ps-page')]; pages.forEach(fitSlide);
    const shots = [];
    try { for (let k = 0; k < pages.length; k++) { say(`Rendering ${k + 1}/${pages.length}…`); shots.push(await slideImage(pages[k])); } }
    catch (e) { host.remove(); say('Rendering failed in this browser'); setTimeout(() => say(label0), 3500); return; }
    host.remove(); say('Packing…');
    const name = ('Little Neural Guide ' + title).replace(/[^\w§. -]+/g, '').replace(/§/g, 'Section ').trim();
    let blob, file;
    if (fmt === 'pdf') { const doc = new Lib({ orientation: 'landscape', unit: 'pt', format: [960, 540], compress: true });
      shots.forEach((d, k) => { if (k) doc.addPage([960, 540], 'landscape'); doc.addImage(d, 'JPEG', 0, 0, 960, 540, undefined, 'FAST'); });
      blob = doc.output('blob'); file = name + '.pdf'; }
    else { const pptx = new Lib(); pptx.layout = 'LAYOUT_WIDE'; pptx.title = title;
      shots.forEach((d, k) => { const sl = pptx.addSlide(); sl.addImage({ data: d, x: 0, y: 0, w: 13.333, h: 7.5 }); const n = plainNotes(slides[k].notes); sl.addNotes(`${n ? n + '\n\n' : ''}Source: ${slides[k].src}`); });
      blob = await pptx.write({ outputType: 'blob' }); file = name + '.pptx'; }
    const r = await offer(file, blob);
    say(r === 'saved' ? 'Saved ✓' : r === 'declined' ? 'Not saved' : 'Saving unavailable here'); setTimeout(() => say(label0), 3000);
  }

  /* ---------- figure downloads ---------- */
  let dl; const getDl = () => dl !== undefined ? Promise.resolve(dl) : (window.claude && claude.use ? claude.use('downloads').then(d => (dl = d)).catch(() => (dl = null)) : Promise.resolve(dl = null));
  async function offer(filename, blob) {
    const d = await getDl();
    if (d) { try { await d.save({ filename, data: blob }); return 'saved'; } catch (e) { return e && e.code === 'declined' ? 'declined' : 'failed'; } }
    try { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return 'saved'; } catch (e) { return 'failed'; }
  }
  async function figPNG(src, name, source, btn) {
    const txt = btn.textContent; btn.textContent = 'Preparing…'; btn.disabled = true;
    try {
      const svgText = await (await fetch(src)).text(), url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const w0 = img.naturalWidth || 800, h0 = img.naturalHeight || 400, k = Math.max(1, 2400 / w0), pad = 24, foot = 34;
      const c = document.createElement('canvas'); c.width = Math.round(w0 * k + 2 * pad); c.height = Math.round(h0 * k + 2 * pad + foot);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, pad, pad, w0 * k, h0 * k); URL.revokeObjectURL(url);
      ctx.fillStyle = '#7d6f6a'; ctx.font = '20px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('Source: ' + source, c.width - pad, c.height - 14, c.width * 0.9);
      const blob = await new Promise(r => c.toBlob(r, 'image/png')); const res = await offer(name + '.png', blob);
      btn.textContent = res === 'saved' ? 'Saved ✓' : res === 'declined' ? 'Not saved' : 'Unavailable';
    } catch (e) { btn.textContent = 'Could not render'; }
    setTimeout(() => { btn.textContent = txt; btn.disabled = false; }, 2200);
  }
  async function figSVG(src, name, btn) { const txt = btn.textContent; try { const t = await (await fetch(src)).text(); const r = await offer(name + '.svg', new Blob([t], { type: 'image/svg+xml' })); btn.textContent = r === 'saved' ? 'Saved ✓' : 'Not saved'; } catch (e) { btn.textContent = 'Unavailable'; } setTimeout(() => btn.textContent = txt, 2000); }

  /* ---------- buttons on pages ---------- */
  function decorate() {
    const L = document.getElementById('lesson'); if (!L) return; const p = PATH();
    const e = SEC.get(p);
    if (e && !L.querySelector('.ps-launch')) {
      const anchor = L.querySelector('.tb-objectives') || L.querySelector('.hero');
      anchor && anchor.insertAdjacentHTML('afterend', `<div class="ps-launch"><button type="button" class="primary" data-ps="sec">▶ Present this section</button><button type="button" class="secondary" data-ps="sec-pdf">⬇ Slides (PDF)</button><button type="button" class="secondary" data-ps="sec-pptx">⬇ PowerPoint</button><span class="muted">${slidesFor(e.c, e.s).length} slides · → next · B black screen · Esc exit</span></div>`);
    }
    const c = OVERVIEW.get(p) || (p.startsWith('/study/read/') ? B.chapters.find(x => x.n === +(p.split('/')[3] || 1)) : null);
    if (c && !L.querySelector('.ps-launch')) {
      const anchor = L.querySelector('.tb-opener') || L.querySelector('.hero');
      anchor && anchor.insertAdjacentHTML('afterend', `<div class="ps-launch" data-ch="${c.n}"><button type="button" class="primary" data-ps="ch">▶ Present Chapter ${c.n}</button><button type="button" class="secondary" data-ps="ch-pdf">⬇ Chapter PDF</button><button type="button" class="secondary" data-ps="ch-pptx">⬇ Chapter PowerPoint</button><label class="ps-opt"><input type="checkbox" id="ps-noex"> leave out exercises</label><span class="muted">${slidesForChapter(c).length} slides with exercises</span></div>`);
    }
    L.querySelectorAll('figure.tb-fig').forEach(fg => {
      if (fg.querySelector('.ps-figdl')) return; const img = fg.querySelector('img'); if (!img) return;
      const src = img.getAttribute('src'), key = src.split('/').pop().replace('.svg', ''), n = ((fg.querySelector('figcaption b') || {}).textContent || '').replace(/[^\d.]/g, '').replace(/\.$/, '');
      const sec = [...SEC.values()].find(v => v.s.body.includes('img/tb/' + key + '.svg'));
      fg.dataset.src = src; fg.dataset.name = `Figure_${n || key}_${key}`; fg.dataset.source = sec ? srcFor(key, sec.s) : 'Little Neural Guide';
      fg.querySelector('figcaption').insertAdjacentHTML('beforeend', `<span class="ps-figdl"><button type="button" data-fig="png">⬇ PNG for slides</button><button type="button" data-fig="svg">⬇ SVG</button></span>`);
    });
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ps]');
    if (b) {
      const p = PATH(), e = SEC.get(p), box = b.closest('.ps-launch'), noex = box && box.querySelector('#ps-noex') && box.querySelector('#ps-noex').checked;
      if (b.dataset.ps === 'sec' && e) present(slidesFor(e.c, e.s), `§${e.s.num}`);
      if ((b.dataset.ps === 'sec-pdf' || b.dataset.ps === 'sec-pptx') && e) exportSlides(slidesFor(e.c, e.s), `§${e.s.num} ${label(e.s.route)}`, b.dataset.ps.endsWith('pdf') ? 'pdf' : 'pptx', b);
      const c = box && box.dataset.ch ? B.chapters.find(x => x.n === +box.dataset.ch) : null;
      if (b.dataset.ps === 'ch' && c) present(slidesForChapter(c, { exercises: !noex }), `Chapter ${c.n}`);
      if ((b.dataset.ps === 'ch-pdf' || b.dataset.ps === 'ch-pptx') && c) exportSlides(slidesForChapter(c, { exercises: !noex }), `Chapter ${c.n}`, b.dataset.ps.endsWith('pdf') ? 'pdf' : 'pptx', b);
      return;
    }
    const f = ev.target.closest('[data-fig]');
    if (f) { const fg = f.closest('figure'); ev.preventDefault(); if (f.dataset.fig === 'png') figPNG(fg.dataset.src, fg.dataset.name, fg.dataset.source, f); else figSVG(fg.dataset.src, fg.dataset.name, f); }
  });
  window.ngPresentSection = route => { const e = SEC.get(route); if (e) present(slidesFor(e.c, e.s), e.s.num); };
  let q = 0; const later = () => { clearTimeout(q); q = setTimeout(decorate, 80); };
  const prev = window.ngAfterRender; window.ngAfterRender = function (...a) { if (typeof prev === 'function') prev.apply(this, a); if (show) show.close(); later(); };
  const L0 = document.getElementById('lesson'); if (L0 && 'MutationObserver' in window) new MutationObserver(later).observe(L0, { childList: true });
  later();
})();
