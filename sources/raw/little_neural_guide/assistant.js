/* ===================== GUIDE ASSISTANT =====================
   A chat panel that answers questions about every lesson, model and citation in the guide.
   Retrieval: BM25 over GUIDE_CORPUS (built from the site's own pages), run in the browser.
   Generation: the hosted page's `sample` capability (Claude, on the viewer's account).
   Without `sample` (e.g. a local copy), it falls back to search results with links. */
(function () {
  'use strict';
  const C = GUIDE_CORPUS, el = id => document.getElementById(id);
  const STORE = 'nga-chat-v1', OPEN = 'nga-open-v1', TIER = 'nga-tier-v2';
  const SOURCES = new Set(C.sources.map(s => s.url).filter(Boolean));
  const ROUTES = new Set(C.pages.map(p => p.route));

  /* ---------- BM25 retrieval ---------- */
  const STOP = new Set('a an and are as at be but by can do does for from has have how i if in into is it its me my of on or our so than that the their them then there these they this to was we what when where which who why will with you your'.split(' '));
  const tok = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9αβγδθλμνστφχψωτ∞]+/g)?.filter(w => !STOP.has(w) && w.length > 1) || [];
  let index = null;
  function buildIndex() {
    const docs = C.chunks.map(c => { const head = tok(c.page + ' ' + c.heading); return tok(c.text).concat(head, head); });
    const df = new Map(); docs.forEach(d => new Set(d).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
    const avg = docs.reduce((s, d) => s + d.length, 0) / docs.length;
    const tf = docs.map(d => { const m = new Map(); d.forEach(w => m.set(w, (m.get(w) || 0) + 1)); return m; });
    index = { docs, df, avg, tf, N: docs.length };
  }
  /** Top-k chunks for a query; `route` boosts chunks from the page being viewed. */
  function search(q, k = 8, route = null) {
    if (!index) buildIndex();
    const qs = [...new Set(tok(q))]; if (!qs.length) return [];
    const { docs, df, avg, tf, N } = index, k1 = 1.4, b = 0.75;
    const scored = [];
    for (let i = 0; i < N; i++) {
      let s = 0; const len = docs[i].length;
      for (const w of qs) { const f = tf[i].get(w); if (!f) continue; const idf = Math.log(1 + (N - df.get(w) + .5) / (df.get(w) + .5)); s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * len / avg)); }
      if (s > 0) { if (route && C.chunks[i].route === route) s *= 1.35; scored.push([s, i]); }
    }
    scored.sort((a, b) => b[0] - a[0]);
    const out = [], perPage = {};
    for (const [s, i] of scored) { const c = C.chunks[i]; perPage[c.route] = (perPage[c.route] || 0) + 1; if (perPage[c.route] > 3) continue; out.push(c); if (out.length >= k) break; }
    return out;
  }
  const excerpt = c => `[${c.id}] ${c.page} — ${c.heading} (${c.route})\n${c.text.slice(0, 1500)}`;

  /* ---------- what the viewer is looking at right now ---------- */
  function pageState() {
    const L = el('lesson'); if (!L) return '';
    const h1 = L.querySelector('h1')?.textContent.trim() || document.title;
    const ctl = [...L.querySelectorAll('input[type=range]')].slice(0, 12).map(r => {
      const lab = L.querySelector(`label[for="${r.id}"]`) || r.closest('.control-row')?.querySelector('label');
      return `${(lab?.textContent || r.getAttribute('aria-label') || r.id).replace(/\s+/g, ' ').trim()} = ${r.value}`;
    });
    const res = [...L.querySelectorAll('#ml-result,.lab-result,#lab-result')].map(x => x.textContent.trim()).filter(Boolean).join(' | ');
    return `Route: ${ngPath()}\nTitle: ${h1}` + (ctl.length ? `\nControls: ${ctl.join('; ')}` : '') + (res ? `\nCurrent result readout: ${res.slice(0, 600)}` : '');
  }

  /* ---------- instructions + source list (sent every call; sample is memoryless) ---------- */
  const sourceList = () => C.sources.map((s, i) => `S${i + 1}. ${s.title}${s.note ? ' — ' + s.note : ''}${s.url ? ' <' + s.url + '>' : ' (no link)'} · used on ${s.pages.slice(0, 4).join(', ')}`).join('\n');
  const RULES = () => `You are the assistant built into "Little Neural Guide", a computational neuroscience learning site (ion channels, dynamics, synapses, networks, mean field, learning, morphology, CA1 resonance, validation, scientific judgment and communication, plus an interactive model lab: Hodgkin–Huxley, Brunel network, Wilson–Cowan, STDP, MLP). The reader is an undergraduate moving from wet-lab biology into modeling, focused on CA1/hippocampal models of Alzheimer's disease.

How to answer:
- Ground answers in the GUIDE EXCERPTS and tool results. Cite guide pages inline as markdown links using their route, e.g. [HH gates](/topics/channels/hh-gates/).
- Cite outside literature ONLY from the SOURCES list below, linking its URL when it has one. Never invent papers, DOIs, page numbers or quotes.
- If the guide does not cover something, say so briefly, then answer from general knowledge under a line starting "Beyond the guide:".
- For model questions give the governing equation, what each parameter means, what to change in the model lab to see it, and the biological caveat.
- Use CURRENT PAGE when the question refers to "this", "here", "my plot", or slider values.
- LENGTH: keep answers SHORT. Default to 60–150 words: a direct 1–2 sentence answer, then at most 4 bullets. One equation at most unless asked. No headers, no preamble, no recap, no closing offers. Only go longer if the reader explicitly asks for detail, a full explanation, a walkthrough or code; even then stay under 350 words.
- Do not narrate your searching or write anything before using tools; write only the final answer.
- Use a table only when comparing 3+ items. Write math in LaTeX with \\( \\) inline and \\[ \\] for display.
- Be honest about uncertainty and about the difference between what a model shows and what the brain does.
- The guide's proposal and panel scenarios are fictional teaching material.

SOURCES (the guide's citations):
${sourceList()}`;

  /* ---------- tools Claude may call (deeper retrieval) ---------- */
  const tools = progress => [
    { name: 'search_guide', description: 'Search all guide pages, model-lab pages and practice rooms. Returns up to 8 matching sections with ids, page, route and a short snippet.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      execute: ({ query }) => { progress(`Searching the guide for “${String(query).slice(0, 60)}”`); return search(String(query), 8).map(c => ({ id: c.id, page: c.page, heading: c.heading, route: c.route, snippet: c.text.slice(0, 220) })); } },
    { name: 'read_section', description: 'Read the full text of one guide section by id (from search_guide or the excerpts).',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      execute: ({ id }) => { const c = C.chunks.find(x => x.id === String(id)); if (!c) throw new Error('No section ' + id); progress(`Reading “${c.page} — ${c.heading}”`); return excerpt(c).slice(0, 4000); } },
    { name: 'read_page', description: 'List every section of one guide page by route (e.g. /lab/brunel/), with ids and first lines, to see its full structure.',
      inputSchema: { type: 'object', properties: { route: { type: 'string' } }, required: ['route'] },
      execute: ({ route }) => { const r = String(route); const cs = C.chunks.filter(c => c.route === r); if (!cs.length) throw new Error('Unknown route ' + r); progress(`Opening ${cs[0].page}`); return cs.map(c => ({ id: c.id, heading: c.heading, start: c.text.slice(0, 160) })); } },
  ];

  /* ---------- tiny, safe markdown renderer ---------- */
  const esc = s => s.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  function link(text, url) {
    const u = url.trim();
    if (u.startsWith('/')) { const r = u.endsWith('/') ? u : u + '/'; return ROUTES.has(r) ? `<a href="${esc(r)}">${text}</a>` : text; }
    if (/^https?:\/\//.test(u) && SOURCES.has(u)) return `<a href="${esc(u)}" target="_blank" rel="noopener">${text} ↗</a>`;
    return text;                                     // unknown external links are not rendered as links
  }
  function inline(s) {
    const math = []; s = s.replace(/\\\((.+?)\\\)/g, m => { math.push(m); return `\u0000${math.length - 1}\u0000`; });
    s = esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => link(t, u.replace(/&amp;/g, '&')));
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => esc(math[+i]));
  }
  function md(src) {
    const out = [], lines = src.replace(/\r/g, '').split('\n'); let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue; }
      if (/^\s*\\\[/.test(l)) { const buf = [l]; while (!/\\\]\s*$/.test(lines[i]) && i < lines.length - 1) buf.push(lines[++i]); i++; out.push(`<div class="nga-math">${esc(buf.join('\n'))}</div>`); continue; }
      if (/^\|.*\|\s*$/.test(l)) { const rows = []; while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]); const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
        const body = rows.filter(r => !/^\|[\s:|-]+\|$/.test(r)); out.push(`<div class="nga-table"><table><thead><tr>${cells(body[0]).map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
      if (/^#{1,4}\s/.test(l)) { out.push(`<h4>${inline(l.replace(/^#+\s/, ''))}</h4>`); i++; continue; }
      if (/^\s*([-*]|\d+\.)\s/.test(l)) { const ord = /^\s*\d+\./.test(l), buf = []; while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) buf.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s/, '')); out.push(`<${ord ? 'ol' : 'ul'}>${buf.map(x => `<li>${inline(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`); continue; }
      if (!l.trim()) { i++; continue; }
      const buf = [lines[i++]];                     // always consume at least one line (prevents an infinite loop)
      while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*([-*]|\d+\.)\s|\|)/.test(lines[i]) && !/^\s*\\\[/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
    return out.join('');
  }
  function typeset(node) {
    if (!/\\\(|\\\[/.test(node.textContent)) return;
    const go = () => window.MathJax?.typesetPromise?.([node]).catch(() => {});
    if (window.MathJax?.typesetPromise) return go();
    if (!document.getElementById('mathjax-src')) {
      window.MathJax = { tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] }, svg: { fontCache: 'global' }, startup: { typeset: false, pageReady: () => MathJax.startup.defaultPageReady().then(go) } };
      const s = document.createElement('script'); s.id = 'mathjax-src'; s.async = true; s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js'; document.head.appendChild(s);
    } else setTimeout(go, 1500);
  }

  /* ---------- state ---------- */
  let turns = []; try { turns = JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch (e) {}
  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-30))); } catch (e) {} };
  let samplePromise = null, ctl = null, busy = false;
  const getSample = () => samplePromise || (samplePromise = (window.claude?.use ? window.claude.use('sample') : Promise.resolve(null)).catch(() => null));

  /* ---------- UI ---------- */
  function suggestions() {
    const r = ngPath();
    const by = {
      '/lab/hh/': ['Why is the f–I curve discontinuous?', 'What does each gate (m, h, n) do during a spike?', 'How would I add I_h to this model for CA1?'],
      '/lab/brunel/': ['Explain the four Brunel regimes', 'What does the synchrony χ measure?', 'How does lowering g relate to AD hyperexcitability?'],
      '/lab/wilson-cowan/': ['Walk me through the Hopf bifurcation here', 'What do the eigenvalues in the readout mean?', 'How does Wilson–Cowan relate to the Brunel network?'],
      '/lab/stdp/': ['Why does depression need to beat potentiation?', 'How does STDP compare with backprop?', 'What would triplet STDP change?'],
      '/lab/neural-network/': ['Explain backprop step by step', 'Why does ReLU make the boundary piecewise linear?', 'What is the weight transport problem?'],
    };
    if (by[r]) return by[r];
    if (r.startsWith('/practice/')) return ['Give me a practice exercise for this room', 'Critique my claim: “our model proves interneuron loss causes AD”', 'What makes a review comment useful?'];
    if (r.startsWith('/topics/')) return ['Summarize this page in 5 bullets', 'Quiz me on this topic', 'Which papers does the guide cite for this?'];
    return ['What should I learn first for CA1 resonance modeling?', 'Which sources does the guide cite on resonance?', 'How do the model-lab levels connect?'];
  }
  function mount() {
    document.body.insertAdjacentHTML('beforeend', `
    <button class="nga-fab" id="nga-fab" aria-controls="nga-panel" aria-expanded="false" title="Ask the guide"><svg class="nga-brain" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 13c-4-5-13-5-16 1-6 0-10 6-8 12-4 3-4 10 1 13-1 6 4 11 10 10 3 5 10 6 13 1 3 5 10 4 13-1 6 1 11-4 10-10 5-3 5-10 1-13 2-6-2-12-8-12-3-6-12-6-16-1z" fill="#f6b3cc" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M19 22c4-1 7 2 7 5M45 22c-4-1-7 2-7 5M17 40c3-2 6-1 7 1M47 40c-3-2-6-1-7 1M32 15v6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="26.5" cy="33" r="2.4" fill="currentColor"/><circle cx="37.5" cy="33" r="2.4" fill="currentColor"/><path d="M28.5 39.5c2 2.2 5 2.2 7 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="22.5" cy="37.5" r="2" fill="#ee7aa5" opacity=".7"/><circle cx="41.5" cy="37.5" r="2" fill="#ee7aa5" opacity=".7"/></svg><span class="nga-fab-t">Ask the guide</span></button>
    <section class="nga-panel" id="nga-panel" aria-label="Guide assistant" hidden>
      <header class="nga-head"><div><p class="eyebrow">Guide assistant</p><p class="nga-sub">Knows every lesson, model and citation here</p></div>
        <div class="nga-head-actions"><select id="nga-tier" aria-label="Answer depth"><option value="quick">Short &amp; fast</option><option value="default">Thorough</option><option value="complex">Deep reasoning</option></select>
        <select id="nga-look" aria-label="How the Ask the guide button looks" title="Button style"><option value="label">Button: label</option><option value="brain">Button: brain</option><option value="hidden">Button: hidden</option></select><button class="nga-icon" id="nga-clear" title="Clear conversation" aria-label="Clear conversation">Clear</button><button class="nga-icon" id="nga-close" aria-label="Close assistant">✕</button></div></header>
      <div class="nga-log" id="nga-log" aria-live="polite"></div>
      <form class="nga-form" id="nga-form"><label for="nga-q" class="nga-sr">Your question</label><textarea id="nga-q" rows="2" placeholder="Ask about a lesson, model, equation or paper…"></textarea>
        <div class="nga-row"><span class="nga-note" id="nga-note">Answers use your Claude usage.</span><button type="button" class="secondary" id="nga-stop" hidden>Stop</button><button type="submit" class="primary" id="nga-send">Ask</button></div></form>
    </section>`);
    try { el('nga-tier').value = localStorage.getItem(TIER) || 'quick'; } catch (e) {}
    el('nga-tier').addEventListener('change', () => { try { localStorage.setItem(TIER, el('nga-tier').value); } catch (e) {} });
    el('nga-fab').addEventListener('click', () => toggle(true));
    el('nga-look').value = look(); el('nga-look').addEventListener('change', e => setLook(e.target.value));
    el('nga-close').addEventListener('click', () => toggle(false));
    el('nga-clear').addEventListener('click', () => { ctl?.abort(); turns = []; save(); render(); });
    el('nga-stop').addEventListener('click', () => ctl?.abort());
    el('nga-form').addEventListener('submit', e => { e.preventDefault(); ask(el('nga-q').value); });
    el('nga-q').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(el('nga-q').value); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el('nga-panel').hidden) toggle(false); });
    el('nga-log').addEventListener('click', e => { const b = e.target.closest('[data-suggest]'); if (b) ask(b.dataset.suggest); });
    setLook(look()); lookSwitch();
    let open = false; try { open = sessionStorage.getItem(OPEN) === '1'; } catch (e) {}
    if (open) toggle(true, true); render();
    getSample().then(s => { if (!s) el('nga-note').textContent = 'Search mode: open the hosted page in Claude for written answers.'; });
  }
  /* Button look: 'label' (Ask the guide), 'brain' (a small brain) or 'hidden'. Remembered in this browser; the Contents
     panel always has a switch, so a hidden assistant can be brought back. */
  const LOOK = 'nga-look-v1';
  function look() { try { const v = localStorage.getItem(LOOK); return v === 'brain' || v === 'hidden' ? v : 'label'; } catch (e) { return 'label'; } }
  function setLook(v) {
    try { localStorage.setItem(LOOK, v); } catch (e) {}
    ['label', 'brain', 'hidden'].forEach(k => document.body.classList.toggle('nga-look-' + k, k === v));
    document.querySelectorAll('#nga-look, #ng-look').forEach(x => { if (x.value !== v) x.value = v; });
    if (v === 'hidden' && el('nga-panel') && !el('nga-panel').hidden) toggle(false);
  }
  window.ngaSetLook = setLook; window.ngaLook = look; window.ngaOpen = () => toggle(true);
  function lookSwitch() {   // in the Contents panel, under the progress meter
    const a = document.querySelector('main>aside'); if (!a || document.getElementById('ng-look')) return;
    const box = document.createElement('div'); box.className = 'ng-look-box';
    box.innerHTML = '<label for="ng-look">Ask the guide</label><select id="ng-look" title="How the assistant button looks"><option value="label">Label</option><option value="brain">Brain</option><option value="hidden">Hidden</option></select><button type="button" id="ng-look-open">Open</button>';
    const head = a.querySelector('.ng-drawer-head'); if (head) head.after(box); else a.prepend(box);
    const sel = document.getElementById('ng-look'); sel.value = look(); sel.addEventListener('change', e => setLook(e.target.value));
    document.getElementById('ng-look-open').onclick = () => { if (window.ngDrawer) ngDrawer(false); toggle(true); };
  }
  function toggle(on, quiet) {
    el('nga-panel').hidden = !on; el('nga-fab').hidden = on; el('nga-fab').setAttribute('aria-expanded', on);
    document.body.classList.toggle('nga-open', on);
    try { sessionStorage.setItem(OPEN, on ? '1' : '0'); } catch (e) {}
    if (on && !quiet) el('nga-q').focus();
    if (on) { const log = el('nga-log'); log.scrollTop = log.scrollHeight; }
  }
  function bubble(t, i) {
    if (t.role === 'user') return `<div class="nga-msg nga-user"><p>${esc(t.content)}</p></div>`;
    const cls = t.status === 'error' ? ' nga-err' : '';
    let body; try { body = t.html || md(t.content || ''); } catch (err) { body = `<p>${esc(t.content || '')}</p>`; }
    return `<div class="nga-msg nga-bot${cls}" data-i="${i}">${body || '<p class="nga-think">Thinking…</p>'}${t.extra || ''}</div>`;
  }
  function render() {
    const log = el('nga-log');
    if (!turns.length) {
      log.innerHTML = `<div class="nga-empty"><p>Ask about any lesson, equation, model or source in the guide. On a model-lab page it can also read your current slider settings.</p><div class="nga-chips">${suggestions().map(s => `<button type="button" class="nga-chip" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
      return;
    }
    log.innerHTML = turns.map(bubble).join('') + (!busy && turns.at(-1)?.role === 'assistant' && turns.at(-1).content && !turns.at(-1).html ? `<div class="nga-follow">${['Explain in more depth', 'Give me an example', 'Show the Python', 'Quiz me on this'].map(s => `<button type="button" class="nga-chip nga-mini" data-suggest="${s}">${s}</button>`).join('')}</div>` : '');
    log.querySelectorAll('.nga-bot').forEach(typeset);
    log.scrollTop = log.scrollHeight;
  }
  function setBusy(on) { busy = on; el('nga-send').disabled = on; el('nga-stop').hidden = !on; }
  const ERR = { not_granted: 'The assistant needs permission to use Claude. Allow it in the prompt, or from this page’s permissions menu, then ask again.', sampling_disabled: 'Claude isn’t available for this account, so the assistant can only search.', rate_limited: 'Usage limit reached for now. Try again in a little while.', session_expired: 'Your session expired. Sign in to Claude again.', refused: 'Claude declined that question. Try rephrasing it.', prompt_too_large: 'That conversation got too long. Clear it and ask again.', empty_completion: 'No answer came back. Try rephrasing or simplifying the question.' };

  /** Offline / no-sample fallback: show the best-matching sections as links. */
  function searchAnswer(q) {
    const hits = search(q, 6, ngPath());
    if (!hits.length) return '<p>No matching sections. Try different words, such as a model name or term.</p>';
    return `<p>Best-matching sections in the guide:</p><ul class="nga-hits">${hits.map(c => `<li><a href="${c.route}">${esc(c.page)}</a> · ${esc(c.heading)}<br><small>${esc(c.text.slice(0, 160))}…</small></li>`).join('')}</ul>`;
  }

  async function ask(raw) {
    const q = String(raw || '').trim(); if (!q || busy) return;
    el('nga-q').value = ''; turns.push({ role: 'user', content: q }); const bot = { role: 'assistant', content: '' }; turns.push(bot); render(); setBusy(true);
    const node = () => el('nga-log').querySelector(`.nga-bot[data-i="${turns.indexOf(bot)}"]`);
    const sample = await getSample();
    if (!sample) { bot.html = searchAnswer(q); bot.content = '(search results)'; save(); render(); setBusy(false); return; }
    const route = ngPath(), hits = search(q + ' ' + (turns.filter(t => t.role === 'user').slice(-2, -1)[0]?.content || ''), 7, route);
    const history = turns.slice(0, -2).filter(t => t.content && t.status !== 'error' && t.content !== '(search results)').slice(-8).map(t => ({ role: t.role, content: t.content.slice(0, 3000) }));
    while (history.length && history[0].role !== 'user') history.shift();
    const last = `CURRENT PAGE\n${pageState()}\n\nGUIDE EXCERPTS (retrieved for this question)\n${hits.map(excerpt).join('\n\n') || '(none matched)'}\n\nQUESTION\n${q}`;
    const input = [{ role: 'user', content: RULES() }, ...history, { role: 'user', content: last }];
    const tier = el('nga-tier').value, opts = { modelTier: tier, cache: false, onText: ({ text }) => { bot.content = text; bot.extra = ''; paint(); } };
    let raf = 0; const paint = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const n = node(); if (!n) return; try { n.innerHTML = md(bot.content); } catch (err) { n.textContent = bot.content; } el('nga-log').scrollTop = el('nga-log').scrollHeight; }); };
    ctl = new AbortController(); opts.signal = ctl.signal;
    const progress = msg => { if (!bot.content) { const n = node(); if (n) n.innerHTML = `<p class="nga-think">${esc(msg)}…</p>`; } };
    if (tier !== 'quick') { const lim = await sample.limits().catch(() => null); if (lim?.tools) opts.tools = tools(progress); }   // deeper tiers may search further
    try {
      const r = await sample(input, opts);
      bot.content = r.text; if (r.truncated) bot.extra = '<p class="nga-note">Answer cut short. Ask a narrower follow-up.</p>';
    } catch (e) {
      if (e.code === 'cancelled') { bot.content = (e.text || '') + (e.text ? '\n\n*(stopped)*' : ''); if (!bot.content) turns.splice(turns.indexOf(bot), 1); }
      else { bot.content = e.text || ''; bot.status = e.text ? undefined : 'error'; bot.html = e.text ? '' : `<p>${ERR[e.code] || 'Something went wrong reaching Claude. Try again.'}</p>${searchAnswer(q)}`; if (e.text) bot.extra = '<p class="nga-note">Interrupted.</p>'; }
    } finally { ctl = null; setBusy(false); save(); render(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
