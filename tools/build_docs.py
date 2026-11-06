"""Build site/docs.html: hippsim's documentation, part of the app like any simulator's docs.

Sources
  docs/guide/NN-slug.md      hand-written pages (Markdown with a `title:` front matter); ```latex blocks = display maths
  site/hs-models.js          the Models page is generated from it (parameters, baselines, manipulations, sources),
                             so the reference cannot drift from what the Simulate panel runs
  tools/engine_baselines.json  numbers on the Validation page
  CHANGELOG.md               the Release notes page
    python tools/build_docs.py
"""
from __future__ import annotations

import html
import json
import re
import subprocess
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
GUIDE = ROOT / "docs/guide"
MATHJAX = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js"   # build_app.py swaps in the vendored copy
e = html.escape


def md(text: str) -> str:
    out = markdown.markdown(text, extensions=["tables", "fenced_code"])
    # ```latex → display maths for MathJax
    out = re.sub(r'<pre><code class="language-latex">(.*?)</code></pre>',
                 lambda m: f'<div class="math">\\[{html.unescape(m.group(1)).strip()}\\]</div>', out, flags=re.S)
    return out


def models_page() -> str:
    """Reference for every Simulate-panel model, read from site/hs-models.js itself."""
    js = """global.window = global; require(process.argv[1]);
const rng = q => q.type === 'toggle' ? 'on / off' : q.type === 'choice' ? q.options.map(o => o[1]).join(' · ') : `${q.f(q.min)} to ${q.f(q.max)}`;
const prm = q => ({group: q.g, label: q.label, base: q.f(q.base), range: rng(q)});
const out = {models: Object.entries(HSModels.MODELS).map(([id, m]) => { const p = {}; m.params.forEach(q => p[q.k] = q.base);
  return {id, scale: m.scale, name: m.name, desc: m.desc, sims: m.sims, original: m.original || '', tools: m.tools.map(k => HSModels.TOOLS[k][0]), tests: m.tests.map(k => HSModels.EXPERIMENTS[k].name),
    params: m.params.map(prm),
    presets: m.presets.map(x => ({label: x.label, title: x.title || '', set: Object.entries(x.set).map(([k, v]) => { const q = m.params.find(z => z.k === k); return `${q.label} → ${q.f(v)}`; }).join('; ')})),
    card: m.card({region: 'CA1', name: 'CA1 pyramidal cell', group: 'Pyramidal & principal cells', species: 'Rat'}),
    base: m.base(p).map(r => [r[0], r[1]]), cell: m.when.toString().includes('CA1') ? 'CA1 pyramidal cells' : 'any cell'}; }),
  tests: Object.entries(HSModels.EXPERIMENTS).map(([id, t]) => ({id, name: t.name, desc: t.desc, params: t.params.map(prm)})),
  tools: Object.values(HSModels.TOOLS)};
process.stdout.write(JSON.stringify(out));"""
    J = json.loads(subprocess.run(["node", "-e", js, str(SITE / "hs-models.js")], capture_output=True, text=True, check=True).stdout)
    M, T, TOOLS = J["models"], J["tests"], J["tools"]
    scale = {"cell": "Single cell", "circuit": "Circuit", "population": "Population"}
    parts = ['<p class="lead">Five models and eleven tests run in the Simulate panel. This page is generated from the code that runs them '
             '(<code>site/hs-models.js</code>), so the values below are exactly what the panel uses.</p>',
             '<div class="tbl"><table><thead><tr><th>Scale</th><th>Model</th><th>Cells</th><th>Tests</th><th>Runs in</th></tr></thead><tbody>'
             + "".join(f'<tr><td>{scale[m["scale"]]}</td><td><a href="#model-{m["id"]}">{e(m["name"])}</a></td><td>{m["cell"]}</td><td>{len(m["tests"])}</td>'
                       f'<td>{", ".join(m["sims"])}{" (original: " + e(m["original"]) + ")" if m["original"] else ""}</td></tr>' for m in M)
             + "</tbody></table></div>",
             '<h2 id="model-tests">Tests</h2><p>A test is the experiment you run on a model: its stimulus, what is measured, and the plot. '
             'Each test has its own baseline; manipulations are compared with it.</p><div class="tbl"><table><thead><tr><th>Test</th><th>What it does</th><th>Stimulus you can change</th></tr></thead><tbody>'
             + "".join(f'<tr><td>{e(t["name"])}</td><td>{e(t["desc"])}</td><td>{"; ".join(e(q["label"] + " " + q["base"] + " (" + q["range"] + ")") for q in t["params"]) or "fixed"}</td></tr>' for t in T)
             + "</tbody></table></div>",
             '<h2 id="model-tools">Branch tools</h2><p>Pick a tool under <b>Manipulate the baseline</b>, then tap a branch on the cell. Blocks apply from that point outward. Marks are listed and can be removed one by one.</p>'
             '<div class="tbl"><table><thead><tr><th>Tool</th><th>Effect</th></tr></thead><tbody>' + "".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in TOOLS) + "</tbody></table></div>"]
    for m in M:
        parts.append(f'<h2 id="model-{m["id"]}">{e(m["name"])} <span class="tag">{scale[m["scale"]]}</span></h2><p>{e(m["desc"])}</p>'
                     f'<p><b>Tests:</b> {e(", ".join(m["tests"]))}.' + (f' <b>Branch tools:</b> {e(", ".join(m["tools"]))}.' if m["tools"] else "") + "</p>")
        cd = m["card"]
        th = lambda *h: "<thead><tr>" + "".join(f"<th>{x}</th>" for x in h) + "</tr></thead>"
        un = lambda x: e(x).replace("unspecified", "<i>unspecified</i>")
        parts.append('<h3>Mechanisms and original references</h3><div class="tbl"><table>' + th("Mechanism", "Model source", "Reference") + "<tbody>"
                     + "".join(f"<tr><td>{e(r[0])}</td><td>{un(r[1])}</td><td>{un(r[2])}</td></tr>" for r in cd["channels"]) + "</tbody></table></div>")
        parts.append('<h3>Passive properties and sources</h3><div class="tbl"><table>' + th("", "Value", "Source") + "<tbody>"
                     + "".join(f"<tr><td>{e(r[0])}</td><td>{e(r[1])}</td><td>{un(r[2])}</td></tr>" for r in cd["passive"]) + "</tbody></table></div>")
        if cd.get("dist"):
            parts.append('<h3>Channel distribution by compartment</h3><div class="tbl"><table>' + th("", *cd["dist"]["cols"]) + "<tbody>"
                         + "".join("<tr>" + "".join(f"<td>{e(x)}</td>" for x in r) + "</tr>" for r in cd["dist"]["rows"]) + f'</tbody></table></div><p class="note">{un(cd["dist"]["source"])}</p>')
        parts.append('<h3>Assumptions</h3><div class="tbl"><table><tbody>' + "".join(f"<tr><td>{e(a)}</td><td>{un(b)}</td></tr>" for a, b in cd["assumptions"]) + "</tbody></table></div>"
                     + '<h3>Validated</h3><ul>' + "".join(f"<li>{e(x)}</li>" for x in cd["validated"]) + "</ul>"
                     + (f'<p class="note">On cells other than CA1 pyramidal cells this is a CA1-derived parameterization, not a validated model of that cell type; the Simulate panel says so on the model card.</p>' if m["id"] in ("migliore", "research", "circuit") else ""))
        parts.append('<h3>Baseline</h3><dl class="base">' + "".join(f"<dt>{e(k)}</dt><dd>{v}</dd>" for k, v in m["base"]) + "</dl>")
        parts.append('<h3>Parameters you can change</h3><div class="tbl"><table><thead><tr><th>Group</th><th>Parameter</th><th>Baseline</th><th>Range</th></tr></thead><tbody>'
                     + "".join(f'<tr><td>{e(q["group"])}</td><td>{e(q["label"])}</td><td>{e(q["base"])}</td><td>{e(q["range"])}</td></tr>' for q in m["params"])
                     + "</tbody></table></div>")
        parts.append('<h3>Manipulations</h3><div class="tbl"><table><thead><tr><th>Button</th><th>Sets</th><th>Source</th></tr></thead><tbody>'
                     + "".join(f'<tr><td>{e(x["label"])}</td><td>{e(x["set"])}</td><td>{e(x["title"])}</td></tr>' for x in m["presets"])
                     + "</tbody></table></div>")
    return "".join(parts)


def validation_numbers(text: str) -> str:
    d = json.loads((ROOT / "tools/engine_baselines.json").read_text())
    sp = lambda r, k: (r.get(k) or {}).get("spikes")
    def st(k):
        pr = [(sp(r, "js"), sp(r, k)) for r in d.values() if sp(r, "js") is not None and sp(r, k) is not None]
        return sum(a == b for a, b in pr), sum(abs(a - b) <= 1 for a, b in pr)
    (ns, n1), (bs, b1) = st("neuron"), st("brian2")
    for k, v in {"N_CELLS": len(d), "NEURON_SAME": ns, "NEURON_1": n1, "BRIAN_SAME": bs, "BRIAN_1": b1}.items():
        text = text.replace("{" + k + "}", str(v))
    # detailed hippsim vs NEURON comparison (tools/compare_engines.py -> site/compare/index.json)
    cf = SITE / "compare/index.json"
    c = json.loads(cf.read_text()) if cf.exists() else {}
    def fixed_by(tag):
        return sum(1 for r in c.values() if r["metrics"]["neuron"]["soma"]["spikes"] != r["metrics"]["hippsim"]["soma"]["spikes"]
                   and any(tag in x["run"] and x["spikes"] == r["metrics"]["neuron"]["soma"]["spikes"] for x in r.get("diagnostics", [])))
    same = sum(r["metrics"]["neuron"]["soma"]["spikes"] == r["metrics"]["hippsim"]["soma"]["spikes"] for r in c.values())
    rin = sorted(abs(r["passive"]["hippsim"]["rin_MOhm"] / r["passive"]["neuron"]["rin_MOhm"] - 1) * 100 for r in c.values() if r["passive"]["neuron"]["rin_MOhm"])
    vals = {"CMP_N": len(c), "CMP_SAME": same, "CMP_DIFF": len(c) - same, "CMP_JOIN": fixed_by("joined at the soma"), "CMP_GEOM": fixed_by("NEURON's geometry"),
            "CMP_FINE": fixed_by("compartments ≤ 5"), "CMP_RIN_MED": f"{rin[len(rin) // 2]:.1f}" if rin else "–", "CMP_RIN_MAX": f"{rin[-1]:.1f}" if rin else "–"}
    for k, v in vals.items():
        text = text.replace("{" + k + "}", str(v))
    return text



def file_page(APP_HEAD: str, APP_TAIL: str) -> str:
    """file.html?f=<path>: any repository file shown inside the app (site/hs-file.js)."""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>File · hippsim</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
<style>
.fx{{max-width:900px;margin:0 auto;padding:16px 16px 90px}}
.fbar{{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 0 14px;border-bottom:1px solid var(--hs-line);margin-bottom:18px}}
.fbar .fp{{flex:1 1 220px;min-width:0;font:12.5px ui-monospace,Menlo,monospace;color:var(--hs-muted);overflow-wrap:anywhere}}
.fbar .fk{{font:600 11px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--hs-muted)}}
.fbar button,.fbar a.b{{font:inherit;font-size:14px;padding:7px 14px;border:1px solid var(--hs-line);border-radius:999px;background:var(--hs-card);color:var(--hs-ink);cursor:pointer;text-decoration:none}}
.fbar #fback{{font-weight:600}}
#fv{{line-height:1.55;font-size:15px}}
#fv h1{{font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.5rem,4vw,2rem);margin:0 0 8px;overflow-wrap:anywhere}}
#fv h2{{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--hs-muted);margin:26px 0 8px}}
#fv h3,#fv h4,#fv h5{{margin:18px 0 6px}}
#fv .kind{{margin:0 0 4px;font:600 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--hs-accent)}}
#fv .what{{font-size:17px;margin:0 0 12px}}
#fv .meta{{display:flex;flex-wrap:wrap;gap:6px}}
#fv .meta span{{font-size:12.5px;padding:3px 10px;border:1px solid var(--hs-line);border-radius:999px;background:var(--hs-card)}}
#fv .meta b{{font-weight:600;color:var(--hs-muted);margin-right:4px}}
#fv .tw{{overflow-x:auto}}
#fv table{{border-collapse:collapse;width:100%;font-size:14px}}
#fv th,#fv td{{text-align:left;vertical-align:top;padding:7px 10px;border-bottom:1px solid var(--hs-line)}}
#fv th{{font-size:12.5px;color:var(--hs-muted);font-weight:600}}
#fv dl.kv{{display:grid;grid-template-columns:minmax(110px,max-content) 1fr;gap:6px 16px;margin:0}}
#fv dl.kv dt{{color:var(--hs-muted);font-size:13px}}
#fv dl.kv dd{{margin:0;min-width:0;overflow-wrap:anywhere}}
#fv .chips{{display:flex;flex-wrap:wrap;gap:4px}}#fv .chips span{{font-size:12.5px;padding:2px 8px;border:1px solid var(--hs-line);border-radius:6px}}
#fv ul{{margin:4px 0;padding-left:20px}}#fv .refs li{{margin-bottom:6px}}
#fv pre{{background:var(--hs-card);border:1px solid var(--hs-line);border-radius:10px;padding:12px 14px;overflow-x:auto;font-size:13px;line-height:1.5}}
#fv pre .k{{color:var(--hs-accent);font-weight:600}}#fv pre .c{{color:var(--hs-muted)}}
#fv code{{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em}}
#fv .muted{{color:var(--hs-muted)}}#fv .ok{{color:#2f7d5b;font-weight:600}}#fv .no{{color:var(--hs-accent);font-weight:600}}
@media (max-width:640px){{#fv dl.kv{{grid-template-columns:1fr}} #fv dl.kv dd{{margin-bottom:6px}}}}
</style>
</head><body class="hs-hubpage">
<header></header>
<main class="fx">
  <div class="fbar"><button type="button" id="fback">← Back</button><span class="fp"><span class="fk" id="fkind"></span><br><span id="fpath"></span></span>
    <button type="button" id="ftog" hidden></button><button type="button" id="fcpy">Copy</button><a class="b" id="fdl" href="#">Download</a></div>
  <article id="fv"><p class="muted">Loading…</p></article>
</main>
<script src="hs-file.js"></script>
{APP_TAIL}
</body></html>"""

def main() -> None:
    from build_simulator import APP_HEAD, APP_TAIL, changelog_html, version
    ver = version().split(" · ")[0]
    pages = []
    for f in sorted(GUIDE.glob("*.md")):
        src = f.read_text()
        m = re.match(r"---\ntitle: (.+?)\n---\n", src)
        title, body = (m.group(1), src[m.end():]) if m else (f.stem, src)
        body = body.replace("{VERSION}", ver)
        if "validation" in f.stem: body = validation_numbers(body)
        pages.append((f.stem.split("-", 1)[1], title, md(body)))
    pages.insert(3, ("models", "Models", models_page()))
    pages.append(("release-notes", "Release notes", changelog_html()))
    nav = "".join(f'<a href="#{s}" data-p="{s}">{e(t)}</a>' for s, t, _ in pages)
    arts = "".join(f'<article id="doc-{s}" data-p="{s}" data-title="{e(t)}" hidden><h1>{e(t)}</h1>{b}</article>' for s, t, b in pages)
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>hippsim Docs</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
<style>
.dx{{max-width:1180px;margin:0 auto;padding:24px 16px 72px;display:grid;grid-template-columns:230px minmax(0,1fr);gap:40px}}
.dx nav{{position:sticky;top:16px;align-self:start;display:flex;flex-direction:column;gap:2px;font-size:14px}}
.dx nav .ver{{font:12px ui-monospace,Menlo,monospace;color:var(--hs-muted);margin:0 0 10px}}
.dx nav input{{font:inherit;padding:8px 12px;border:1px solid var(--hs-line);border-radius:999px;background:var(--hs-card);color:var(--hs-ink);margin-bottom:10px}}
.dx nav a{{color:var(--hs-ink);text-decoration:none;padding:6px 10px;border-radius:8px}}
.dx nav a:hover{{background:var(--hs-card)}}
.dx nav a[aria-current="page"]{{background:var(--hs-ink);color:var(--hs-card)}}
.dx nav a.dim{{opacity:.35}}
.dx article{{max-width:760px;line-height:1.6;font-size:15.5px}}
.dx article h1{{font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.7rem,4vw,2.2rem);margin:0 0 14px}}
.dx article h2{{font-family:Georgia,"Times New Roman",serif;margin:30px 0 8px;font-size:1.3rem}}
.dx article h3{{margin:18px 0 6px;font-size:15px}}
.dx article .lead,.dx article > p:first-of-type{{font-size:17px}}
.dx table{{border-collapse:collapse;width:100%;font-size:14px;margin:10px 0}}
.dx th,.dx td{{text-align:left;vertical-align:top;padding:7px 10px;border-bottom:1px solid var(--hs-line)}}
.dx th{{font-size:12.5px;color:var(--hs-muted);font-weight:600}}
.dx .tbl{{overflow-x:auto}}
.dx pre{{background:var(--hs-card);border:1px solid var(--hs-line);border-radius:10px;padding:12px 14px;overflow-x:auto;font-size:13px}}
.dx code{{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em}}
.dx .math{{overflow-x:auto;margin:12px 0;padding:6px 0}}
.dx blockquote{{margin:12px 0;padding:10px 16px;border-left:3px solid var(--hs-accent);background:var(--hs-card);border-radius:0 10px 10px 0}}
.dx dl.base{{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:14px}}
.dx dl.base dt{{color:var(--hs-muted);font:12px ui-monospace,Menlo,monospace;padding-top:3px}}
.dx dl.base dd{{margin:0}}
.dx .tag{{font:600 11px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--hs-muted);margin-left:6px;vertical-align:middle}}
.dx .pn{{display:flex;justify-content:space-between;gap:12px;margin-top:40px;padding-top:16px;border-top:1px solid var(--hs-line)}}
.dx .pn a{{text-decoration:none}}
.dx mark{{background:color-mix(in srgb,var(--hs-accent) 25%,transparent);color:inherit}}
.dtoc{{display:none}}
@media (max-width:820px){{.dx{{grid-template-columns:1fr;gap:16px}} .dx nav{{position:static}} .dx nav .ver{{margin:0 0 6px}}
  .dtoc{{display:block;font:inherit;text-align:left;padding:10px 14px;border:1px solid var(--hs-line);border-radius:12px;background:var(--hs-card);color:var(--hs-ink);margin-bottom:8px}}
  .dx nav:not(.open) a,.dx nav:not(.open) input{{display:none}}}}
</style>
<script>window.MathJax = {{tex: {{inlineMath: [['\\\\(', '\\\\)']]}}, svg: {{fontCache: 'global'}}}};</script>
<script src="{MATHJAX}" async></script>
</head><body class="hs-hubpage">
<header></header>
<div class="dx">
<nav aria-label="Documentation"><p class="ver">hippsim {e(ver)} · documentation</p><button type="button" id="dtoc" class="dtoc">Contents · <b id="dcur"></b> ▾</button><input type="search" id="dq" placeholder="Search the docs" aria-label="Search the docs">{nav}</nav>
<main id="dmain">{arts}<div class="pn" id="dpn"></div></main>
</div>
<script>
(() => {{
  const nav = document.querySelector('.dx nav'), arts = [...document.querySelectorAll('#dmain article')], links = [...document.querySelectorAll('.dx nav a')];
  function show() {{
    const h = decodeURIComponent(location.hash.slice(1)) || arts[0].dataset.p;
    let a = document.getElementById('doc-' + h) || document.getElementById(h); if (a && a.tagName !== 'ARTICLE') a = a.closest('article'); if (!a) a = arts[0];
    arts.forEach(x => x.hidden = x !== a); links.forEach(l => {{ if (l.dataset.p === a.dataset.p) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); }});
    document.getElementById('dcur').textContent = a.dataset.title; nav.classList.remove('open');
    const i = arts.indexOf(a), p = arts[i - 1], n = arts[i + 1];
    document.getElementById('dpn').innerHTML = (p ? `<a href="#${{p.dataset.p}}">← ${{p.dataset.title}}</a>` : '<span></span>') + (n ? `<a href="#${{n.dataset.p}}">${{n.dataset.title}} →</a>` : '');
    document.title = a.dataset.title + ' · hippsim Docs';
    const t = document.getElementById(h); if (t && t !== a && a.contains(t)) t.scrollIntoView(); else window.scrollTo(0, 0);
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([a]).catch(() => {{}});
  }}
  addEventListener('hashchange', show); show();
  document.getElementById('dq').addEventListener('input', e => {{
    const q = e.target.value.trim().toLowerCase();
    links.forEach(l => {{ const a = document.getElementById('doc-' + l.dataset.p); l.classList.toggle('dim', !!q && !a.textContent.toLowerCase().includes(q)); }});
  }});
  document.getElementById('dq').addEventListener('keydown', e => {{ if (e.key !== 'Enter') return; const l = links.find(x => !x.classList.contains('dim')); if (l) location.hash = l.dataset.p; }});
  document.getElementById('dtoc').onclick = () => nav.classList.toggle('open');
}})();
</script>
{APP_TAIL}</body></html>
"""
    (SITE / "docs.html").write_text(page)
    (SITE / "file.html").write_text(file_page(APP_HEAD, APP_TAIL))
    print(f"docs.html: {len(pages)} pages, {len(page) / 1e3:.0f} kB")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    main()
