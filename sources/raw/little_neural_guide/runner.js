/* ===================== RUN THE PYTHON EXAMPLES =====================
   Every Python code block in a lesson gets a toolbar:
     ▶ Run here      — runs in the browser with Pyodide (CPython compiled to WebAssembly) + numpy/scipy/matplotlib;
                       stdout and matplotlib figures appear under the block. Edit the code first if you like.
     Open in Colab   — copies the code (with any pip installs) and opens a new Colab notebook to paste into.
     Notebook (.zip) — a ready .ipynb (in a zip) for VS Code's Jupyter extension, JupyterLab or Colab → Upload.
   Pyodide is self-hosted next to the page (py/); if that folder is missing it falls back to the jsDelivr CDN. */

const PY_VER = '0.26.4';
const PY_NEEDS_INSTALL = { brian2: 'brian2', torch: 'torch', snntorch: 'snntorch', neuron: 'neuron', jaxley: 'jaxley', nest: 'nest-simulator', sbi: 'sbi', neurolib: 'neurolib' };
let pyReady = null;

/** Load Pyodide once (self-hosted first, CDN second). */
function pyLoad(status) {
  if (pyReady) return pyReady;
  pyReady = new Promise((resolve, reject) => {
    const tryBase = (bases) => {
      if (!bases.length) { reject(new Error('Could not load the Python runtime.')); return; }
      const base = bases[0], s = document.createElement('script');
      s.src = base + 'pyodide.js';
      s.onload = async () => {
        try {
          status('Starting Python (first run downloads about 10 MB, then it is cached)…');
          const py = await loadPyodide({ indexURL: base });
          resolve(py);
        } catch (e) { s.remove(); delete window.loadPyodide; tryBase(bases.slice(1)); }
      };
      s.onerror = () => { s.remove(); tryBase(bases.slice(1)); };
      document.head.appendChild(s);
    };
    tryBase([new URL('py/', location.href).href, `https://cdn.jsdelivr.net/pyodide/v${PY_VER}/full/`]);
  });
  pyReady.catch(() => { pyReady = null; });
  return pyReady;
}
const pyImports = code => [...code.matchAll(/^(?:import|from)\s+([A-Za-z_][\w]*)/gm)].map(m => m[1]);   // top-level only: guarded imports inside try: are optional
const pyNeeds = code => [...new Set(pyImports(code).filter(m => PY_NEEDS_INSTALL[m]))];
const pyIsPython = code => /(^|\n)\s*(import |from \w+ import|def |print\()/.test(code) && !/^\s*[<{]/.test(code);

/** Run code; returns {out, figs}. Matplotlib figures are captured as PNG data URLs. */
async function pyRun(code, status) {
  const py = await pyLoad(status);
  status('Loading packages…');
  await py.loadPackagesFromImports(code, { messageCallback: () => {} });
  let out = '';
  py.setStdout({ batched: s => { out += s + '\n'; } }); py.setStderr({ batched: s => { out += s + '\n'; } });
  status('Running…');
  await new Promise(r => setTimeout(r, 30));
  const usesMpl = /matplotlib/.test(code);
  if (usesMpl) await py.runPythonAsync("import matplotlib\nmatplotlib.use('agg')\nimport matplotlib.pyplot as plt\nplt.close('all')");
  let err = null;
  try { await py.runPythonAsync(code); } catch (e) { err = String(e.message || e).split('\n').slice(-6).join('\n'); }
  let figs = [];
  if (usesMpl) {
    const r = await py.runPythonAsync(`import io, base64, matplotlib.pyplot as plt
_figs = []
for _n in plt.get_fignums():
    _b = io.BytesIO(); plt.figure(_n).savefig(_b, format='png', dpi=110, bbox_inches='tight'); _figs.append(base64.b64encode(_b.getvalue()).decode())
plt.close('all')
_figs`);
    figs = r.toJs(); r.destroy && r.destroy();
  }
  return { out: out.trimEnd(), err, figs };
}

/* ---------- notebooks and a tiny zip writer (stored, no compression) ---------- */
function notebookJSON(code, title, route) {
  const needs = pyNeeds(code), cells = [
    { cell_type: 'markdown', metadata: {}, source: [`# ${title}\n`, `From the Little Neural Guide · page \`${route}\`.\n`, '\nRun the cells in order. In VS Code, open this file with the Jupyter extension; in Colab use File → Upload notebook.'] },
  ];
  if (needs.length) cells.push({ cell_type: 'code', metadata: {}, execution_count: null, outputs: [], source: [`%pip install -q ${needs.map(n => PY_NEEDS_INSTALL[n]).join(' ')}`] });
  cells.push({ cell_type: 'code', metadata: {}, execution_count: null, outputs: [], source: code.split('\n').map((l, i, a) => l + (i < a.length - 1 ? '\n' : '')) });
  return JSON.stringify({ cells, metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python' } }, nbformat: 4, nbformat_minor: 5 }, null, 1);
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function makeZip(files) {               // files: [{name, text}]
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  files.forEach(f => {
    const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name); off += 30 + name.length + data.length;
  });
  const csize = central.reduce((s, p) => s + p.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
/** Save a file: platform downloads capability when hosted, a plain download link otherwise. */
async function ngSaveFile(filename, data) {
  let dl = null; try { dl = window.claude && claude.use ? await claude.use('downloads') : null; } catch (e) {}
  if (dl) { try { await dl.save({ filename, data }); return 'saved'; } catch (e) { return e && e.code === 'declined' ? 'declined' : 'failed'; } }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); return 'saved'; } catch (e) { return 'failed'; }
}
window.ngSaveFile = ngSaveFile;
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'example';

/* ---------- toolbar on every Python block ---------- */
function ngEnhanceCode() {
  const L = document.getElementById('lesson'); if (!L) return;
  const title = (L.querySelector('h1') || {}).textContent || document.title;
  L.querySelectorAll('pre > code').forEach((codeEl, k) => {
    const pre = codeEl.parentElement; if (pre.dataset.py) return;
    const code0 = codeEl.textContent; if (!pyIsPython(code0) || code0.split('\n').length < 3) return;
    pre.dataset.py = '1';
    const needs = pyNeeds(code0), runnable = !needs.length;
    const bar = document.createElement('div'); bar.className = 'py-bar';
    bar.innerHTML = `<button class="primary py-run" ${runnable ? '' : 'disabled'} title="${runnable ? 'Run in your browser' : 'Needs ' + needs.join(', ') + ': use Colab'}">▶ Run here</button>
      <button class="secondary py-edit" aria-pressed="false">Edit code</button>
      <a class="secondary py-colab" href="https://colab.research.google.com/#create=true" target="_blank" rel="noopener">Open in Colab ↗</a>
      <button class="secondary py-nb">Notebook for VS Code / Colab (.zip)</button>
      <span class="py-note">${runnable ? 'numpy · scipy · matplotlib run in your browser · blocks on a page share variables, so run them top to bottom' : `needs <b>${needs.join(', ')}</b>: run it in Colab or VS Code`}</span>`;
    const out = document.createElement('div'); out.className = 'py-out'; out.hidden = true;
    pre.after(bar); bar.after(out);
    const status = t => { out.hidden = false; out.innerHTML = `<p class="py-status">${t}</p>`; };
    bar.querySelector('.py-run').onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true; const t0 = performance.now();
      try {
        const r = await pyRun(codeEl.textContent, status);
        out.hidden = false;
        out.innerHTML = `<p class="py-status">${r.err ? 'Stopped with an error' : 'Finished'} in ${((performance.now() - t0) / 1000).toFixed(1)} s</p>`
          + (r.out ? `<pre class="py-stdout"></pre>` : '') + (r.err ? '<pre class="py-err"></pre>' : '') + r.figs.map(b => `<img class="py-fig" alt="Figure produced by the code" src="data:image/png;base64,${b}">`).join('')
          + (!r.out && !r.err && !r.figs.length ? '<p class="muted">No output. Add print(...) or a plot to see results.</p>' : '');
        if (r.out) out.querySelector('.py-stdout').textContent = r.out;
        if (r.err) out.querySelector('.py-err').textContent = r.err;
      } catch (err) { out.hidden = false; out.innerHTML = `<p class="py-err">${String(err.message || err)} Try Open in Colab instead.</p>`; }
      btn.disabled = false;
    };
    bar.querySelector('.py-edit').onclick = e => {
      const on = codeEl.getAttribute('contenteditable') !== 'true'; codeEl.setAttribute('contenteditable', on ? 'true' : 'false'); codeEl.spellcheck = false;
      e.currentTarget.setAttribute('aria-pressed', on); e.currentTarget.textContent = on ? 'Done editing' : 'Edit code'; pre.classList.toggle('py-editing', on); if (on) codeEl.focus();
    };
    bar.querySelector('.py-colab').addEventListener('click', async () => {
      const c = codeEl.textContent, pre2 = needs.length ? `%pip install -q ${needs.map(n => PY_NEEDS_INSTALL[n]).join(' ')}\n\n` : '';
      try { await navigator.clipboard.writeText(pre2 + c); status('Code copied. In the new Colab notebook, click the first cell and paste (Ctrl/⌘ + V), then press Shift + Enter.'); }
      catch (e) { status('Colab is opening. Select the code above, copy it, and paste it into the first cell.'); }
    });
    bar.querySelector('.py-nb').onclick = async () => {
      const base = slugify(title) + (k ? '-' + (k + 1) : ''), nb = notebookJSON(codeEl.textContent, title, ngPath());
      const r = await ngSaveFile(base + '.zip', makeZip([{ name: base + '.ipynb', text: nb }]));
      status(r === 'saved' ? `Saved ${base}.zip. Unzip it, then open ${base}.ipynb in VS Code (Jupyter extension) or Colab → File → Upload notebook.` : r === 'declined' ? 'Download cancelled.' : 'Download is not available here; use Open in Colab.');
    };
  });
}
window.ngEnhanceCode = ngEnhanceCode;
(function hookRunner() {
  const prev = window.ngAfterRender;
  window.ngAfterRender = function () { if (prev) prev.apply(this, arguments); setTimeout(ngEnhanceCode, 400); setTimeout(ngEnhanceCode, 1500); };
})();
