/* hs-file.js: file.html?f=<path> shows any repository file (YAML, JSON, Markdown, CSV, code, BibTeX) inside the app,
   with Back, Copy, Download and a readable view. Baselines and perturbations (hippsim.baseline / hippsim.perturbation)
   get a card: name, what it does, its operations as a table and its references resolved from references.bib. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const path = (new URLSearchParams(location.search).get('f') || '').replace(/^\/+/, '').replace(/\.\.\//g, '');
  const ext = (path.match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
  const name = path.split('/').pop();
  const LABEL = {yaml: 'YAML', yml: 'YAML', json: 'JSON', md: 'Markdown', csv: 'Table (CSV)', py: 'Python', bib: 'BibTeX', cff: 'Citation (CFF)', txt: 'Text', js: 'JavaScript'};

  /* ---- a small YAML reader for the block-style files hippsim writes (maps, lists, folded plain scalars, | blocks) ---- */
  function yparse(src) {
    const L = src.split('\n').filter(l => l.trim() && !/^\s*#/.test(l));
    let i = 0;
    const ind = l => l.match(/^ */)[0].length;
    const isItem = (l, n) => ind(l) === n && /^-( |$)/.test(l.slice(n));
    function scalar(v) {
      v = v.trim();
      if (v === 'true') return true; if (v === 'false') return false;
      if (v === 'null' || v === '~' || v === '') return null;
      if (/^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(v)) return +v;
      if (/^'[\s\S]*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
      if (/^"[\s\S]*"$/.test(v)) { try { return JSON.parse(v); } catch (e) { return v.slice(1, -1); } }
      if (v === '[]') return []; if (v === '{}') return {};
      if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(scalar);
      return v;
    }
    const cont = (v, n) => { while (i < L.length && ind(L[i]) > n && !isItem(L[i], ind(L[i])) ) { v += ' ' + L[i].trim(); i++; } return v; };
    function block(n) {
      if (i >= L.length) return null;
      if (isItem(L[i], n)) {
        const arr = [];
        while (i < L.length && isItem(L[i], n)) {
          const rest = L[i].slice(n + 1).replace(/^ /, '');
          if (!rest) { i++; arr.push(i < L.length && ind(L[i]) > n ? block(ind(L[i])) : null); }
          else if (/^[^'"\s\[{][^:]*:( |$)/.test(rest)) { L[i] = ' '.repeat(n + 2) + rest; arr.push(block(n + 2)); }
          else { i++; arr.push(scalar(cont(rest, n + 1))); }
        }
        return arr;
      }
      const obj = {};
      while (i < L.length && ind(L[i]) === n && !isItem(L[i], n)) {
        const m = L[i].slice(n).match(/^([^:]+?):(?: (.*))?$/); i++;
        if (!m) continue;
        const k = m[1].trim().replace(/^['"]|['"]$/g, ''), v = m[2];
        if (v === undefined || v === '') obj[k] = i < L.length && (ind(L[i]) > n || isItem(L[i], n)) ? block(ind(L[i])) : null;
        else if (/^[|>][-+]?$/.test(v)) { const out = [], bi = i < L.length ? ind(L[i]) : 0; while (i < L.length && ind(L[i]) > n) { out.push(L[i].slice(bi)); i++; } obj[k] = out.join(v[0] === '|' ? '\n' : ' '); }
        else obj[k] = scalar(cont(v, n));
      }
      return obj;
    }
    return block(0);
  }

  /* ---- references.bib -> {key: "Author et al. (year) Title. Journal. doi"} ---- */
  let BIB = null;
  async function bib() {
    if (BIB) return BIB; BIB = {};
    for (const f of ['references.bib', 'morphologies/references.bib']) {
      try { const t = await (await fetch(f)).text();
        for (const m of t.matchAll(/@\w+\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\n\}/g)) {
          const F = {}, body = m[2]; let k = 0;
          while (k < body.length) {                            // field = {braced {nested}} | "quoted" | bare
            const h = body.slice(k).match(/^[\s,]*(\w+)\s*=\s*/); if (!h) break; k += h[0].length;
            let v = ''; if (body[k] === '{') { let d = 0; do { if (body[k] === '{') d++; else if (body[k] === '}') d--; v += body[k++]; } while (d > 0 && k < body.length); v = v.slice(1, -1); }
            else if (body[k] === '"') { k++; while (k < body.length && body[k] !== '"') v += body[k++]; k++; }
            else { while (k < body.length && body[k] !== ',' && body[k] !== '\n') v += body[k++]; }
            F[h[1].toLowerCase()] = v.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
          }
          if (BIB[m[1]]) continue; const au = (F.author || '').split(/\s+and\s+/); BIB[m[1]] = {au: au[0] ? au[0] + (au.length > 2 ? ' et al.' : au.length === 2 ? ' & ' + au[1] : '') : '', year: F.year, title: F.title, journal: F.journal || F.booktitle || F.publisher || '', doi: F.doi, url: F.url};
        } } catch (e) {}
    }
    return BIB;
  }
  const refHTML = (k, B) => { const r = B[k]; if (!r) return `<code>${esc(k)}</code> <span class="muted">(not in references.bib: unspecified)</span>`;
    const link = r.doi ? `https://doi.org/${r.doi}` : r.url;
    return `${esc(r.au)} (${esc(r.year || 'n.d.')}) ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}${r.journal ? `. <i>${esc(r.journal)}</i>` : ''} <code class="muted">${esc(k)}</code>`; };

  /* ---- generic readable view of a parsed object ---- */
  const isScalar = v => v == null || typeof v !== 'object';
  const fmtKey = k => k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  function fmtVal(v, k) {
    if (v === true) return '<span class="ok">yes</span>'; if (v === false) return '<span class="no">no</span>'; if (v == null) return '<span class="muted">–</span>';
    let s = String(v);
    if (k === 'control' && s.startsWith('~^')) return `${esc(s.slice(2))}… <span class="muted">(control whose label starts with this)</span>`;
    if (k === 'control' && s.startsWith('~')) return `${esc(s.slice(1))} <span class="muted">(control matching)</span>`;
    if (/^10\.\d{4,}\//.test(s)) return `<a href="https://doi.org/${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>`;
    if (/^https?:\/\//.test(s)) return `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>`;
    return esc(s);
  }
  function view(v, B, depth = 0, key = '') {
    if (isScalar(v)) return fmtVal(v, key);
    if (Array.isArray(v)) {
      if (!v.length) return '<span class="muted">none</span>';
      if (key === 'references' && v.every(x => typeof x === 'string')) return `<ul class="refs">${v.map(x => `<li>${refHTML(x, B)}</li>`).join('')}</ul>`;
      if (v.every(isScalar)) return v.length > 8 ? `<div class="chips">${v.map(x => `<span>${fmtVal(x, key)}</span>`).join('')}</div>` : `<ul>${v.map(x => `<li>${fmtVal(x, key)}</li>`).join('')}</ul>`;
      if (v.every(x => x && typeof x === 'object' && !Array.isArray(x)) && depth < 3) {
        const cols = [...new Set(v.flatMap(Object.keys))];
        return `<div class="tw"><table><thead><tr>${cols.map(c => `<th>${esc(fmtKey(c))}</th>`).join('')}</tr></thead><tbody>${v.map(x => `<tr>${cols.map(c => `<td>${view(x[c], B, depth + 1, c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
      return `<pre>${esc(JSON.stringify(v, null, 1))}</pre>`;
    }
    if (depth > 3) return `<pre>${esc(JSON.stringify(v, null, 1))}</pre>`;
    return `<dl class="kv">${Object.entries(v).map(([k, x]) => `<dt>${esc(fmtKey(k))}</dt><dd>${view(x, B, depth + 1, k)}</dd>`).join('')}</dl>`;
  }
  async function card(o) {
    const B = await bib(), sch = String(o.schema || '');
    const kind = /perturbation/.test(sch) ? 'Manipulation' : /baseline/.test(sch) ? 'Baseline' : /run/.test(sch) ? 'Saved run' : '';
    const title = o.name || o.title || name, what = o.what || o.question || o.description || '';
    const meta = ['tool', 'kind', 'origin', 'expected_size', 'level', 'schema'].filter(k => o[k] != null && o[k] !== '').map(k => `<span><b>${esc(fmtKey(k))}</b> ${esc(o[k])}</span>`).join('');
    const rest = Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'title', 'what', 'tool', 'kind', 'origin', 'expected_size', 'level', 'schema'].includes(k) && !(k === 'question' && what === o.question)));
    const ops = Array.isArray(o.ops) ? `<h2>What it changes</h2>` + view(o.ops, B, 0, 'ops') : '';
    const refs = Array.isArray(o.references) ? `<h2>References</h2>` + view(o.references, B, 0, 'references') : '';
    delete rest.ops; delete rest.references;
    return `${kind ? `<p class="kind">${kind}</p>` : ''}<h1>${esc(title)}</h1>${what ? `<p class="what">${esc(what)}</p>` : ''}${meta ? `<div class="meta">${meta}</div>` : ''}${ops}${refs}
      ${Object.keys(rest).length ? `<h2>${ops || refs ? 'Everything else in the file' : 'Contents'}</h2>${view(rest, B)}` : ''}`;
  }

  /* ---- Markdown (headings, lists, tables, code, links, emphasis) ---- */
  const inl = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${/^(https?:|#|mailto:)/.test(u) ? u : fileHref(new URL(u, new URL(path, location.href)).pathname.slice(new URL('.', location.href).pathname.length))}">${t}</a>`);
  function md(src) {
    const out = [], L = src.split('\n'); let i = 0;
    while (i < L.length) {
      const l = L[i];
      if (/^```/.test(l)) { const b = []; i++; while (i < L.length && !/^```/.test(L[i])) b.push(L[i++]); i++; out.push(`<pre>${esc(b.join('\n'))}</pre>`); continue; }
      let m = l.match(/^(#{1,4})\s+(.*)/); if (m) { out.push(`<h${m[1].length + 1}>${inl(m[2])}</h${m[1].length + 1}>`); i++; continue; }
      if (/^\|/.test(l) && L[i + 1] && /^\|[\s:-|]+\|$/.test(L[i + 1].trim())) {
        const row = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const h = row(l); i += 2; const rows = []; while (i < L.length && /^\|/.test(L[i])) rows.push(row(L[i++]));
        out.push(`<div class="tw"><table><thead><tr>${h.map(c => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
      }
      if (/^\s*[-*]\s+/.test(l)) { const it = []; while (i < L.length && /^\s*[-*]\s+/.test(L[i])) it.push(L[i++].replace(/^\s*[-*]\s+/, '')); out.push(`<ul>${it.map(x => `<li>${inl(x)}</li>`).join('')}</ul>`); continue; }
      if (/^\s*\d+\.\s+/.test(l)) { const it = []; while (i < L.length && /^\s*\d+\.\s+/.test(L[i])) it.push(L[i++].replace(/^\s*\d+\.\s+/, '')); out.push(`<ol>${it.map(x => `<li>${inl(x)}</li>`).join('')}</ol>`); continue; }
      if (!l.trim()) { i++; continue; }
      const p = []; while (i < L.length && L[i].trim() && !/^(#|```|\||\s*[-*]\s|\s*\d+\.\s)/.test(L[i])) p.push(L[i++]); out.push(`<p>${inl(p.join(' '))}</p>`);
    }
    return out.join('');
  }
  function csv(t) {
    const rows = []; let row = [], f = '', q = false;
    for (let k = 0; k < t.length; k++) { const c = t[k];
      if (q) { if (c === '"' && t[k + 1] === '"') { f += '"'; k++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c; }
    if (f || row.length) { row.push(f); rows.push(row); }
    const [h, ...b] = rows, n = Math.min(b.length, 500);
    return `<div class="tw"><table><thead><tr>${h.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.slice(0, n).map(r => `<tr>${r.map(c => `<td>${fmtVal(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${b.length > n ? `<p class="muted">First ${n} of ${b.length} rows.</p>` : ''}`;
  }
  /* raw view with light YAML / JSON colouring */
  function raw(t) {
    if (ext === 'yaml' || ext === 'yml') return t.split('\n').map(l => { const e = esc(l);
      if (/^\s*#/.test(l)) return `<span class="c">${e}</span>`;
      return e.replace(/^(\s*(?:-\s+)?)([^:\s][^:]*?)(:)(?=\s|$)/, '$1<span class="k">$2</span>$3'); }).join('\n');
    return esc(t);
  }
  function fileHref(p) { return 'file.html?f=' + encodeURIComponent(p); }
  window.hsFileHref = fileHref;

  async function main() {
    const box = $('fv');
    if (!path) { box.innerHTML = '<h1>No file</h1><p>Open a file from the Library or the Models page.</p>'; return; }
    document.title = `${name} · hippsim`;
    $('fpath').textContent = path; $('fkind').textContent = LABEL[ext] || ext.toUpperCase() || 'File';
    $('fdl').href = path; $('fdl').setAttribute('download', name);
    let t;
    try { const r = await fetch(path); if (!r.ok) throw new Error(r.status); t = await r.text(); }
    catch (e) { box.innerHTML = `<h1>${esc(name)}</h1><p>Could not load this file (${esc(e.message)}).</p>`; $('ftog').hidden = true; return; }
    $('fcpy').onclick = async () => { try { await navigator.clipboard.writeText(t); $('fcpy').textContent = 'Copied ✓'; } catch (e) { $('fcpy').textContent = 'Copy failed'; } setTimeout(() => $('fcpy').textContent = 'Copy', 1800); };
    let nice = null;
    try {
      if ((ext === 'yaml' || ext === 'yml') && t.length < 300000) { const o = yparse(t); if (o && typeof o === 'object' && !Array.isArray(o)) nice = await card(o); }
      else if (ext === 'json' && t.length < 300000) { const o = JSON.parse(t); nice = Array.isArray(o) ? view(o, await bib()) : await card(o); }
      else if (ext === 'md') nice = md(t);
      else if (ext === 'csv') nice = csv(t);
    } catch (e) { nice = null; console.warn('readable view failed', e); }
    const show = r => { box.innerHTML = r || !nice ? `<h1>${esc(name)}</h1><pre class="src">${raw(t)}</pre>` : nice; $('ftog').textContent = r ? 'Readable view' : 'Show the file as written';
      $('ftog').hidden = !nice; };
    let isRaw = false; show(false);
    $('ftog').onclick = () => { isRaw = !isRaw; show(isRaw); };
  }
  $('fback').onclick = () => { if (history.length > 1 && document.referrer && new URL(document.referrer).origin === location.origin) history.back(); else location.href = 'models.html'; };
  main();
})();
