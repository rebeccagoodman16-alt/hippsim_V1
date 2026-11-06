/* hippsim runs: save a run as a self-describing results folder, load it back, and log it for the lab.

   Save run  -> <date>_<tool>_<label>.zip, an RO-Crate 1.1 research object:
                  ro-crate-metadata.json   RO-Crate (JSON-LD, schema.org): what, who, when, which model, which papers
                  run.json                 hippsim.run/1.0: every control (baseline + value), perturbations, provenance
                  parameters.csv           parameter, unit, baseline, value, changed
                  references.bib           BibTeX for the model and every perturbation
                  figures/*.png|svg        the tool's plots as shown when saved
                  reproduce.py             checks the run against models/<origin>/<tool>/baseline.yaml; runs the Python port if there is one
                  README.md                how to file and re-open the run
   Load run  -> run.json or the .zip: opens the tool and sets every control to the saved value.
   Lab log   -> one shared record per person (db runs/<user>), listed on runs.html.
   Requires hs-page.js (window.hsPage) and hs-registry.js (window.HS_REG). */
(function () {
  'use strict';
  const RUN_SCHEMA = 'hippsim.run/1.0';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const REG = (window.HS_REG || {}).tools || {}, BUILD = (window.HS_REG || {}).build || {};
  const cap = name => window.HS_BACKEND ? window.HS_BACKEND.use(name).catch(() => null)   // self-hosted copy with Google sign-in (hs-backend-firebase.js)
    : (window.claude && typeof window.claude.use === 'function') ? window.claude.use(name).catch(() => null) : Promise.resolve(null);

  /* ---------- zip (store only, no compression: every reader opens it) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {                       // files: [{name, data: Uint8Array}]
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
          date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, n, 4], [22, n, 4], [26, name.length, 2], [28, 0, 2]]
        .forEach(([o, v, s]) => s === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, n, 4], [24, n, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, off, 4]]
        .forEach(([o, v, s]) => s === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true));
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + n;
    }
    const csize = central.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2], [10, files.length, 2], [12, csize, 4], [16, off, 4], [20, 0, 2]]
      .forEach(([o, v, s]) => s === 4 ? e.setUint32(o, v, true) : e.setUint16(o, v, true));
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], {type: 'application/zip'});
  }
  function unzipEntry(buf, want) {             // read one stored (uncompressed) entry from our own zips
    const v = new DataView(buf), dec = new TextDecoder(); let p = 0;
    while (p + 30 <= buf.byteLength && v.getUint32(p, true) === 0x04034b50) {
      const method = v.getUint16(p + 8, true), size = v.getUint32(p + 18, true), nl = v.getUint16(p + 26, true), xl = v.getUint16(p + 28, true);
      const name = dec.decode(new Uint8Array(buf, p + 30, nl)), start = p + 30 + nl + xl;
      if (name.endsWith(want)) { if (method !== 0) throw new Error('compressed zip: open it and load run.json instead'); return dec.decode(new Uint8Array(buf, start, size)); }
      p = start + size;
    }
    return null;
  }

  /* ---------- run record ---------- */
  const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');      // ISO 8601 basic, UTC: 20261103T013011Z
  const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'run';
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  const doi = u => (u || '').includes('doi.org/') ? u.split('doi.org/')[1] : '';

  function record(label, note) {
    const H = window.hsPage, route = H.route(), c = H.card() || {}, reg = REG[route] || {}, now = new Date();
    const controls = H.controls();
    const presets = H.applied().map(n => (c.presets || []).find(p => p.name === n)).filter(Boolean);
    const refKeys = [...new Set([...(c.refs || []), ...presets.flatMap(p => p.refs || [])])];
    return {
      schema: RUN_SCHEMA, id: uuid(), created: now.toISOString(), label: label || reg.tool || route, note: note || '',
      tool: {id: reg.id, route, name: reg.tool, title: reg.title, page: reg.page, level: c.level, origin: reg.origin, kind: reg.kind, model: c.model},
      baseline_file: reg.baseline || null,
      engine: {name: 'hippsim browser engine', build: BUILD.sha || 'dev', build_date: BUILD.date || '', url: location.href.split('#')[0]},
      provenance: {modeldb: reg.modeldb || [], doi: reg.doi || [], code: reg.code || []},
      n_controls: controls.length, n_changed: controls.filter(x => x.changed).length,
      changes: controls.filter(x => x.changed).map(x => ({key: x.key, parameter: x.label, baseline: x.baseline_shown, value: x.value_shown})),
      perturbations: presets.map(p => ({name: p.name, kind: p.kind, what: p.what, expected_size: p.size, references: p.refs, ops: p.ops})),
      controls: controls.map(x => ({key: x.key, label: x.label, type: x.type, baseline: x.baseline, value: x.value, shown: x.value_shown, changed: x.changed})),
      references: refKeys.map(k => ({key: k, ...(H.refs[k] || {})})).map(r => ({key: r.key, authors: r.a, year: r.y, title: r.t, journal: r.j, volume_pages: r.v, doi: doi(r.u), url: r.u || ''})),
      environment: {user_agent: navigator.userAgent, viewport: `${innerWidth}x${innerHeight}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone}
    };
  }

  const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function csv(run) {
    const rows = [['key', 'parameter', 'type', 'baseline', 'value', 'changed']];
    run.controls.forEach(c => rows.push([c.key, c.label, c.type, c.baseline, c.value, c.changed ? 1 : 0]));
    return rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n';
  }
  function bibtex(run) {
    return run.references.map(r => {
      const pp = (r.volume_pages || '').split(':');
      const f = {author: (r.authors || '').split(/,\s*/).join(' and '), title: `{${r.title || ''}}`, journal: r.journal, year: r.year,
                 volume: pp[0] || '', pages: (pp[1] || '').replace('–', '--'), doi: r.doi, url: r.doi ? '' : r.url};
      return `@article{${r.key},\n` + Object.entries(f).filter(([, v]) => v).map(([k, v]) => `  ${k} = {${v}}`).join(',\n') + '\n}';
    }).join('\n\n') + '\n';
  }
  function crate(run, files) {
    const ctx = 'https://w3id.org/ro/crate/1.1/context', refs = run.references.map(r => ({
      '@id': r.doi ? 'https://doi.org/' + r.doi : '#ref-' + r.key, '@type': 'ScholarlyArticle', name: r.title, author: r.authors,
      datePublished: String(r.year || ''), isPartOf: r.journal, identifier: r.doi || r.url}));
    const model = {'@id': '#model', '@type': 'SoftwareSourceCode', name: run.tool.title, description: run.tool.model || ((window.hsPage && window.hsPage.card()) || {}).model,
      codeRepository: run.provenance.code[0] || undefined, identifier: run.provenance.modeldb.map(n => `https://modeldb.science/${n}`),
      citation: refs.map(r => ({'@id': r['@id']}))};
    return {'@context': ctx, '@graph': [
      {'@id': 'ro-crate-metadata.json', '@type': 'CreativeWork', conformsTo: {'@id': 'https://w3id.org/ro/crate/1.1'}, about: {'@id': './'}},
      {'@id': './', '@type': 'Dataset', name: `hippsim run · ${run.label}`, description: run.note || `${run.tool.name}: ${run.n_changed} change(s) from baseline`,
       datePublished: run.created, identifier: run.id, license: {'@id': 'https://creativecommons.org/licenses/by/4.0/'},
       mentions: {'@id': '#run'}, hasPart: files.map(f => ({'@id': f}))},
      {'@id': '#run', '@type': 'CreateAction', name: `Simulation: ${run.tool.name}`, startTime: run.created, instrument: [{'@id': '#engine'}, {'@id': '#model'}],
       object: run.baseline_file ? [{'@id': '#baseline'}] : [], result: files.map(f => ({'@id': f}))},
      {'@id': '#engine', '@type': 'SoftwareApplication', name: 'hippsim', version: run.engine.build, url: run.engine.url},
      model,
      ...(run.baseline_file ? [{'@id': '#baseline', '@type': 'CreativeWork', name: 'Tool baseline', identifier: run.baseline_file, encodingFormat: 'application/yaml'}] : []),
      ...files.map(f => ({'@id': f, '@type': 'File', name: f, encodingFormat: {json: 'application/json', csv: 'text/csv', bib: 'application/x-bibtex', png: 'image/png', svg: 'image/svg+xml', py: 'text/x-python', md: 'text/markdown'}[f.split('.').pop()] || 'application/octet-stream'})),
      ...refs]};
  }
  const reproducePy = run => `#!/usr/bin/env python3
"""Reproduce hippsim run ${run.id} (${run.tool.name}).

Usage (from the hippsim repository root, or anywhere with --repo):
    python reproduce.py [--repo PATH]

1. Checks that every control's baseline in run.json still matches ${run.baseline_file || 'the tool baseline'}
   (detects model drift between the run and the current code).
2. Prints the manipulation: changes from baseline and perturbations applied.
3. If the tool has a Python port (${(REG[run.tool.route] || {}).python_port || 'none for this tool'}), builds it with hippsim and reports rest / R_in.
   Browser-only tools are re-run by opening ${run.tool.page || 'the simulator'} and using "Load run" with run.json.
"""
import argparse, json, pathlib, sys

here = pathlib.Path(__file__).resolve().parent
run = json.loads((here / "run.json").read_text())
ap = argparse.ArgumentParser(); ap.add_argument("--repo", default=".")
repo = pathlib.Path(ap.parse_args().repo).resolve()

print(f"run {run['id']}  {run['created']}  tool={run['tool']['id']}  engine build {run['engine']['build']}")
print(f"{run['n_changed']} of {run['n_controls']} controls changed; perturbations: {[p['name'] for p in run['perturbations']] or 'none'}")
for c in run["changes"]:
    print(f"  {c['parameter']:<44} {c['baseline']:>10} -> {c['value']}")

base = repo / (run.get("baseline_file") or "")
if run.get("baseline_file") and base.exists():
    import yaml
    b = yaml.safe_load(base.read_text())
    ctl = {c["key"]: c for c in run["controls"]}
    drift = []
    for p in b.get("parameters", []):
        if not isinstance(p.get("value"), (int, float)) or isinstance(p.get("value"), bool):
            continue
        c = ctl.get(p.get("exact_key", "")) or ctl.get(p.get("key", "#" + p["id"]))     # exact number box first, then the control
        if c and abs(float(c["baseline"]) - float(p["value"])) > 1e-9 * max(1, abs(p["value"])):
            drift.append((p["label"], p["value"], c["baseline"]))
    print("baseline check:", "OK, matches " + str(base.relative_to(repo)) if not drift else f"{len(drift)} parameter(s) drifted: {drift}")
else:
    print("baseline check: skipped (run from the hippsim repo root, or pass --repo)")

port = ${JSON.stringify((REG[run.tool.route] || {}).python_port || null).replace('null', 'None')}
if port:
    sys.path.insert(0, str(repo))
    try:
        from hippsim.config import load_model
        from hippsim.cells.morph_cell import MorphCell
    except ImportError as e:
        sys.exit(f"Python port {port}: install hippsim first (pip install -e .): {e}")
    cell = MorphCell(load_model(port))                     # numpy reference cable engine (no NEURON needed)
    print(f"Python port {port} at its own baseline: rest {cell.ref.rest()[0]:.2f} mV, "
          f"R_in {cell.ref.input_resistance(0):.2f} MOhm (models/lab/rebecca/{port}/baseline.yaml)")
    print("Browser-only controls above are not mapped onto the Python model; compare them in the browser.")
`;
  const readme = (run, files) => `# hippsim run · ${run.label}

| | |
|---|---|
| Run id | \`${run.id}\` |
| Saved | ${run.created} |
| Tool | ${run.tool.name} (${run.tool.route}, Level ${run.tool.level}, ${run.tool.origin}) |
| Baseline | \`${run.baseline_file || '–'}\` |
| Engine build | ${run.engine.build} (${run.engine.build_date}) |
| Changes from baseline | ${run.n_changed} of ${run.n_controls} controls |
| Perturbations | ${run.perturbations.map(p => p.name).join('; ') || 'none'} |
| ModelDB | ${run.provenance.modeldb.join(', ') || '–'} |

${run.note ? '## Note\n\n' + run.note + '\n\n' : ''}## Changes

${run.changes.length ? '| Parameter | Baseline | Value |\n|---|---|---|\n' + run.changes.map(c => `| ${c.parameter} | ${c.baseline} | ${c.value} |`).join('\n') : 'None: this is the baseline run.'}

## Files

${files.map(f => '- `' + f + '`').join('\n')}

## Filing

Put this folder in the lab results drive under \`results/${run.tool.origin}/${run.tool.id}/\`. The folder name
(date, tool, label) sorts runs in time order. \`ro-crate-metadata.json\` makes it a standard RO-Crate research object.

## Re-opening

Open the simulator, go to ${run.tool.name}, choose **Load run** and pick \`run.json\` (or this .zip).
Or run \`python reproduce.py --repo <hippsim>\` to check it against the current baseline.
`;

  async function figures() {
    const L = document.getElementById('lesson'), out = [];
    const cv = [...L.querySelectorAll('canvas')].filter(c => c.width >= 120 && c.height >= 80 && c.offsetParent);
    for (const [i, c] of cv.slice(0, 12).entries()) {
      try { const b = await new Promise(r => c.toBlob(r, 'image/png')); if (b) out.push({name: `figures/plot-${String(i + 1).padStart(2, '0')}.png`, data: new Uint8Array(await b.arrayBuffer())}); } catch (e) {}
    }
    const sv = [...L.querySelectorAll('svg')].filter(s => { const r = s.getBoundingClientRect(); return r.width >= 160 && r.height >= 100 && !s.closest('button'); });
    sv.slice(0, 12).forEach((s, i) => {
      const k = s.cloneNode(true); k.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const cs = getComputedStyle(document.body);
      k.setAttribute('style', `background:${cs.backgroundColor};color:${cs.color};font-family:${cs.fontFamily}`);
      out.push({name: `figures/figure-${String(i + 1).padStart(2, '0')}.svg`, data: new TextEncoder().encode(k.outerHTML)});
    });
    return out;
  }

  /* ---------- saving ---------- */
  async function save(filename, data) {
    const dl = await cap('downloads');
    if (dl) { try { await dl.save({filename, data}); return 'saved'; } catch (e) { if (e && e.code === 'declined') return 'declined'; if (e && !/unavailable|not_granted|capability/.test(e.code || '')) throw e; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return 'saved';
  }
  async function bundle(run, withFigs, given) {
    const enc = s => new TextEncoder().encode(s), figs = given || (withFigs ? await figures() : []);
    run.figures = figs.map(f => f.name);
    const base = [
      {name: 'run.json', data: enc(JSON.stringify(run, null, 2))},
      {name: 'parameters.csv', data: enc(csv(run))},
      {name: 'references.bib', data: enc(bibtex(run))},
      {name: 'reproduce.py', data: enc(reproducePy(run))}, ...figs];
    const names = ['README.md', ...base.map(f => f.name)];
    const all = [{name: 'README.md', data: enc(readme(run, names))}, ...base];
    all.push({name: 'ro-crate-metadata.json', data: enc(JSON.stringify(crate(run, names), null, 1))});
    const dir = `${stamp(new Date(run.created))}_${run.tool.id || 'tool'}_${slug(run.label)}`;
    return {dir, blob: zip(all.map(f => ({name: dir + '/' + f.name, data: f.data})))};
  }

  /* ---------- lab run log (db: one document per person, runs/<user id>) ---------- */
  const LOG_MAX = 300;
  /* ---------- my runs: one record per person (runs/<user>) with {entries, folders}; this browser if offline ---------- */
  async function mine() {
    const [db, user] = await Promise.all([cap('db'), cap('user')]);
    const uid = db && user ? await user.id() : null;
    if (uid) {
      const ref = db.doc('runs/' + uid);
      return {kind: 'lab', db, uid,
        async read() { const s = await ref.get(), d = s.exists ? s.data() : {}; return {entries: [...(d.entries || [])], folders: [...(d.folders || [])]}; },
        async write(v) { await ref.set({entries: v.entries.slice(0, LOG_MAX), folders: v.folders, updated: new Date().toISOString()}); }};
    }
    return {kind: 'local',
      async read() { let e = [], f = []; try { e = JSON.parse(localStorage.getItem('hs-runlog') || '[]'); f = JSON.parse(localStorage.getItem('hs-runfolders') || '[]'); } catch (x) {} return {entries: e, folders: f}; },
      async write(v) { localStorage.setItem('hs-runlog', JSON.stringify(v.entries.slice(0, LOG_MAX))); localStorage.setItem('hs-runfolders', JSON.stringify(v.folders)); }};
  }
  async function change(fn) { const m = await mine(), v = await m.read(); fn(v); await m.write(v); return m.kind; }
  const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const folders = {
    async list() { return (await (await mine()).read()).folders; },
    add: name => change(v => { name = cleanName(name); if (name && !v.folders.includes(name)) v.folders.push(name); v.folders.sort((a, b) => a.localeCompare(b)); }),
    rename: (from, to) => change(v => { to = cleanName(to); if (!to) return; v.folders = [...new Set(v.folders.map(f => f === from ? to : f))].sort((a, b) => a.localeCompare(b));
      v.entries.forEach(e => { if (e.folder === from) e.folder = to; }); }),
    remove: name => change(v => { v.folders = v.folders.filter(f => f !== name); v.entries.forEach(e => { if (e.folder === name) e.folder = ''; }); }),
    move: (id, name) => change(v => { name = cleanName(name); if (name && !v.folders.includes(name)) v.folders.push(name); v.entries.forEach(e => { if (e.id === id) e.folder = name; }); })
  };
  async function deleteRun(id) {
    const m = await mine(), v = await m.read(), e = v.entries.find(x => x.id === id);
    v.entries = v.entries.filter(x => x.id !== id); await m.write(v);
    if (m.kind === 'lab' && e && e.stored) {          // the stored record and its plots go too
      const item = m.db.doc(`runs/${m.uid}/items/${id}`);
      for (let k = 0; k < (e.n_figs || 8); k++) { try { await item.collection('figs').doc(String(k)).delete(); } catch (x) {} }
      try { await item.delete(); } catch (x) {}
    }
    return m.kind;
  }
  async function logRun(run, stored) {
    const entry = {id: run.id, created: run.created, label: run.label, note: run.note.slice(0, 600), tool: run.tool.id, route: run.tool.route,
      tool_name: run.tool.name, page: run.tool.page, origin: run.tool.origin, level: run.tool.level, build: run.engine.build,
      perturbations: run.perturbations.map(p => p.name), n_changed: run.n_changed, folder: cleanName(run.folder),
      changes: run.changes.slice(0, 40), values: run.controls.filter(c => c.changed).slice(0, 60).map(c => [c.key, c.label, c.value]),
      stored: !!stored, n_figs: (run.figures || []).length};
    try {
      return await change(v => { v.entries = [entry, ...v.entries.filter(e => e.id !== entry.id)]; if (entry.folder && !v.folders.includes(entry.folder)) v.folders.push(entry.folder); });
    } catch (e) { return 'none'; }
  }
  window.hsRunLog = {cap, LOG_MAX};

  /* ---------- save in hippsim (no download) ----------
     The full record goes to runs/<user>/items/<run id>; each plot to .../figs/<n> (as an image data URL,
     shrunk to stay under the per-document limit); a short entry joins the person's run log. */
  const FIG_MAX = 180000;                       // characters per stored plot
  async function shrink(c) {
    let url = c.toDataURL('image/png'); if (url.length <= FIG_MAX) return url;
    for (const [w, q] of [[1400, .85], [1000, .8], [760, .75], [560, .7]]) {
      const k = Math.min(1, w / c.width), t = document.createElement('canvas');
      t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
      const g = t.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, t.width, t.height); g.drawImage(c, 0, 0, t.width, t.height);
      url = t.toDataURL('image/jpeg', q); if (url.length <= FIG_MAX) return url;
    }
    return null;
  }
  async function cloud() {
    const [db, user] = await Promise.all([cap('db'), cap('user')]);
    const uid = db && user ? await user.id() : null;
    return uid ? {db, uid} : null;
  }
  async function saveCloud(run) {
    const C = await cloud(); if (!C) return null;
    const L = document.getElementById('lesson'), figs = [];
    const cv = [...L.querySelectorAll('canvas')].filter(c => c.width >= 120 && c.height >= 80 && c.offsetParent).slice(0, 8);
    for (const [i, c] of cv.entries()) { try { const u = await shrink(c); if (u) figs.push({name: `figures/plot-${String(i + 1).padStart(2, '0')}.${u.startsWith('data:image/png') ? 'png' : 'jpg'}`, data: u}); } catch (e) {} }
    run.figures = figs.map(f => f.name);
    const item = C.db.doc(`runs/${C.uid}/items/${run.id}`);
    await item.set({run: JSON.parse(JSON.stringify(run)), figures: run.figures, saved: run.created});
    for (const [k, f] of figs.entries()) await item.collection('figs').doc(String(k)).set(f);
    await logRun(run, true);
    return 'lab';
  }
  // a stored run back as a folder (.zip), built on request
  async function downloadStored(uid, id) {
    const db = await cap('db'); if (!db) throw new Error('not available here');
    const item = db.doc(`runs/${uid}/items/${id}`), snap = await item.get();
    if (!snap.exists) throw new Error('this run has no stored copy');
    const d = snap.data(), figs = [];
    for (let k = 0; k < (d.figures || []).length; k++) {
      const f = await item.collection('figs').doc(String(k)).get(); if (!f.exists) continue;
      const v = f.data(), bin = atob(v.data.split(',')[1]), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      figs.push({name: v.name, data: u8});
    }
    const run = JSON.parse(JSON.stringify(d.run)), b = await bundle(run, false, figs);
    return save(b.dir + '.zip', b.blob);
  }

  /* ---------- loading ---------- */
  async function readRunFile(file) {
    const buf = await file.arrayBuffer(), head = new Uint8Array(buf, 0, 2);
    const text = head[0] === 0x50 && head[1] === 0x4b ? unzipEntry(buf, 'run.json') : new TextDecoder().decode(buf);
    if (!text) throw new Error('No run.json in this file');
    const run = JSON.parse(text);
    if (!String(run.schema || '').startsWith('hippsim.run/')) throw new Error('Not a hippsim run file');
    return run;
  }
  function openRun(run) {
    const H = window.hsPage, route = run.tool && run.tool.route;
    if (route && route !== H.route()) {
      try { sessionStorage.setItem('hs-pending-run', JSON.stringify(run)); } catch (e) {}
      const page = (REG[route] || {}).page, hash = '#' + route.split('/').filter(Boolean).join('.');
      location.href = (page && !H.routes().some(r => r[0] === route) ? page : '') + hash;
      if (!page || H.routes().some(r => r[0] === route)) setTimeout(() => applyPending(), 50);
      return;
    }
    const vals = (run.controls || []).filter(c => c.changed).map(c => [c.key, c.label, c.value]).concat(run.values || []);
    const n = H.applyValues(vals, (run.perturbations || []).map(p => p.name || p));
    H.note(`Loaded run “${run.label}” (${new Date(run.created).toLocaleString()}): ${n} control${n === 1 ? '' : 's'} set.` +
      (run.engine && BUILD.sha && run.engine.build !== BUILD.sha ? ` Saved with build ${run.engine.build}; this is ${BUILD.sha}. Check the values.` : ''));
  }
  function applyPending() {
    let run = null; try { run = JSON.parse(sessionStorage.getItem('hs-pending-run') || 'null'); } catch (e) {}
    if (!run || !window.hsPage || run.tool.route !== window.hsPage.route()) return false;
    try { sessionStorage.removeItem('hs-pending-run'); } catch (e) {}
    openRun(run); return true;
  }

  /* ---------- dialog ---------- */
  const dlg = document.createElement('div');
  dlg.id = 'hs-rundlg'; dlg.hidden = true;
  dlg.innerHTML = `<div class="hs-dlg" role="dialog" aria-modal="true" aria-labelledby="hs-rd-h">
    <h2 id="hs-rd-h">Save run</h2>
    <p class="hs-muted" id="hs-rd-sum"></p>
    <label class="hs-field"><span>Label</span><input id="hs-rd-label" maxlength="80" placeholder="e.g. XE991 at 0.66 µA/cm²"></label>
    <label class="hs-field"><span>Folder <small>(optional)</small></span><select id="hs-rd-folder"></select></label>
    <label class="hs-field" id="hs-rd-newf" hidden><span>New folder name</span><input id="hs-rd-newname" maxlength="40" placeholder="e.g. AD project"></label>
    <label class="hs-field"><span>Note <small>(optional)</small></span><textarea id="hs-rd-note" rows="2" maxlength="600"></textarea></label>
    <p class="hs-muted hs-rd-what">Saved in hippsim with every parameter and the plots; nothing is downloaded. Open or download it later from Runs.</p>
    <div class="hs-dlg-act">
      <button type="button" class="hs-btn primary" id="hs-rd-zip">Save run</button>
      <button type="button" class="hs-btn" id="hs-rd-x">Cancel</button></div>
    <p class="hs-rd-msg" id="hs-rd-msg" aria-live="polite"></p></div>`;
  document.body.appendChild(dlg);
  const $ = id => document.getElementById(id), msg = t => { $('hs-rd-msg').textContent = t; };
  function openDlg() {
    const H = window.hsPage, c = H.controls(), n = c.filter(x => x.changed).length, ap = H.applied();
    $('hs-rd-sum').textContent = `${(REG[H.route()] || {}).tool || ''}: ${n} of ${c.length} controls changed from baseline` + (ap.length ? ` · ${ap.join(', ')}` : '') + '.';
    $('hs-rd-label').value = ap.length ? ap.join(' + ') : (n ? '' : 'baseline');
    msg(''); dlg.hidden = false; $('hs-rd-label').focus();
    let last = ''; try { last = localStorage.getItem('hs-last-folder') || ''; } catch (e) {}
    folders.list().then(fs => {
      $('hs-rd-folder').innerHTML = '<option value="">No folder</option>' + fs.map(f => `<option${f === last ? ' selected' : ''}>${esc(f)}</option>`).join('') + '<option value="__new">New folder…</option>';
      $('hs-rd-newf').hidden = true;
    }).catch(() => { $('hs-rd-folder').innerHTML = '<option value="">No folder</option><option value="__new">New folder…</option>'; });
  }
  const closeDlg = () => { dlg.hidden = true; };
  dlg.addEventListener('click', e => { if (e.target === dlg) closeDlg(); });
  document.addEventListener('keydown', e => { if (!dlg.hidden && e.key === 'Escape') closeDlg(); });
  $('hs-rd-x').onclick = closeDlg;
  $('hs-rd-folder').onchange = () => { const nf = $('hs-rd-folder').value === '__new'; $('hs-rd-newf').hidden = !nf; if (nf) $('hs-rd-newname').focus(); };
  async function go() {
    const run = record($('hs-rd-label').value.trim(), $('hs-rd-note').value.trim());
    const fv = $('hs-rd-folder').value; run.folder = fv === '__new' ? cleanName($('hs-rd-newname').value) : fv;
    try { localStorage.setItem('hs-last-folder', run.folder || ''); } catch (e) {}
    const btn = $('hs-rd-zip'); btn.disabled = true;
    try {
      msg('Saving…');
      if (await saveCloud(run)) {
        msg(`Saved in hippsim${run.folder ? ` in “${run.folder}”` : ''}. Find it under Runs; open it there to come back to these settings.`);
        if (window.hsStepSaved) hsStepSaved();
        setTimeout(closeDlg, 1600);
      } else {          // outside claude.ai (the installed app): keep a copy as a file
        const b = await bundle(run, true), st = await save(b.dir + '.zip', b.blob);
        if (st === 'declined') { msg('Not saved.'); return; }
        await logRun(run).catch(() => {});
        msg('Saved as a folder on this device (online saving works in hippsim on claude.ai).');
        if (window.hsStepSaved) hsStepSaved();
      }
    } catch (e) { msg('Could not save: ' + (e.message || e.code || e)); }
    finally { btn.disabled = false; }
  }
  $('hs-rd-zip').onclick = () => go('zip');

  const picker = document.createElement('input');
  picker.type = 'file'; picker.accept = '.json,.zip,application/json,application/zip'; picker.hidden = true;
  document.body.appendChild(picker);
  picker.onchange = async () => {
    const f = picker.files[0]; picker.value = ''; if (!f) return;
    try { openRun(await readRunFile(f)); } catch (e) { window.hsPage.note('Could not load: ' + e.message); }
  };
  window.hsRun = {open: openDlg, load: () => picker.click(), openRun, applyPending, record, bibtex, readRunFile, logRun, downloadStored, folders, deleteRun, mine};
})();
