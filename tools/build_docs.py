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
    TRY = "ca1-n123"                                       # a CA1 pyramidal cell: every model is offered on it
    try_url = lambda mid, tid=None: f'index.html#{TRY}?model={mid}' + (f'&test={tid}' if tid else '') + '&run=0'
    first_model = {t["id"]: next((m["id"] for m in M if t["name"] in m["tests"]), None) for t in T}
    parts = ['<p class="lead">Five models and eleven tests run in the Simulate panel (open any neuron, press Simulate). This page is generated from the code that runs them '
             '(<code>site/hs-models.js</code>), so the values below are exactly what the panel uses.</p>'
             '<p>Looking for the 21 tool models (lessons, circuits, other systems) with their baseline files and perturbations? They are in the <a href="models.html">Models tab</a>. How the 1- and 2-compartment CA1 models (Golomb 2006, Lowet 2023, Ceballos 2025) differ from these reconstructions: <a href="compartments.html">One, two, or thousands of compartments</a>.</p>',
             '<div class="tbl"><table><thead><tr><th>Scale</th><th>Model</th><th>Cells</th><th>Tests</th><th>Runs in</th></tr></thead><tbody>'
             + "".join(f'<tr><td>{scale[m["scale"]]}</td><td><a href="#model-{m["id"]}">{e(m["name"])}</a></td><td>{m["cell"]}</td><td>{len(m["tests"])}</td>'
                       f'<td>{", ".join(m["sims"])}{" (original: " + e(m["original"]) + ")" if m["original"] else ""}</td></tr>' for m in M)
             + "</tbody></table></div>",
             '<h2 id="model-tests">Tests</h2><p>A test is the experiment you run on a model: its stimulus, what is measured, and the plot. '
             'Each test has its own baseline; manipulations are compared with it.</p><div class="tbl"><table><thead><tr><th>Test</th><th>What it does</th><th>Stimulus you can change</th><th></th></tr></thead><tbody>'
             + "".join(f'<tr id="test-{t["id"]}"><td>{e(t["name"])}</td><td>{e(t["desc"])}</td><td>{"; ".join(e(q["label"] + " " + q["base"] + " (" + q["range"] + ")") for q in t["params"]) or "fixed"}</td>'
                       f'<td>{f"<a href=\"{try_url(first_model[t['id']], t['id'])}\">Try it →</a>" if first_model[t["id"]] else ""}</td></tr>' for t in T)
             + "</tbody></table></div>",
             '<h2 id="model-tools">Branch tools</h2><p>Pick a tool under <b>Manipulate the baseline</b>, then tap a branch on the cell. Blocks apply from that point outward. Marks are listed and can be removed one by one.</p>'
             '<div class="tbl"><table><thead><tr><th>Tool</th><th>Effect</th></tr></thead><tbody>' + "".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in TOOLS) + "</tbody></table></div>"]
    for m in M:
        parts.append(f'<h2 id="model-{m["id"]}">{e(m["name"])} <span class="tag">{scale[m["scale"]]}</span></h2><p>{e(m["desc"])}</p>'
                     f'<p><a class="try" href="{try_url(m["id"])}">Open it on a CA1 pyramidal cell →</a> <span class="muted">or pick any neuron, then Simulate.</span></p>'
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
    nn = lambda r: r["metrics"]["neuron"]["soma"]["spikes"]; hh = lambda r: r["metrics"]["hippsim"]["soma"]["spikes"]
    none = [k for k, r in c.items() if nn(r) != hh(r) and not any(x["run"].startswith("hippsim") and x["spikes"] == nn(r) for x in r.get("diagnostics", []))]
    rlow = sum(r["passive"]["hippsim"]["rin_MOhm"] < 0.99 * r["passive"]["neuron"]["rin_MOhm"] for r in c.values())
    both = sum(1 for r in c.values() if nn(r) != hh(r) and any("both NEURON conventions" in x["run"] and x["spikes"] == nn(r) for x in r.get("diagnostics", [])))
    rin_both = sorted(abs(x["rin_MOhm"] / r["passive"]["neuron"]["rin_MOhm"] - 1) * 100 for r in c.values() for x in r.get("diagnostics", []) if x["run"].startswith("hippsim with both NEURON conventions (") and x.get("rin_MOhm"))
    vals = {"CMP_BOTH": both, "CMP_RIN_BOTH": f"{rin_both[len(rin_both) // 2]:.1f}" if rin_both else "–", "CMP_RIN_BOTH_MAX": f"{rin_both[-1]:.1f}" if rin_both else "–",
            "CMP_W1": sum(abs(nn(r) - hh(r)) <= 1 for r in c.values()), "CMP_NONE": len(none), "CMP_NONE_IDS": ", ".join(none), "CMP_RLOW": rlow, "CMP_N": len(c), "CMP_SAME": same, "CMP_DIFF": len(c) - same, "CMP_JOIN": fixed_by("joined at the soma"), "CMP_GEOM": fixed_by("NEURON's geometry"),
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


def welcome_page(APP_HEAD: str, APP_TAIL: str, ver: str) -> str:
    """welcome.html: what hippsim is and how to use it, before the Neurons page (shown once on first visit)."""
    ic = {"pick": '<path d="M12 3v18M12 8l-5-4M12 8l5-4M12 15l-6 4M12 15l6 4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
          "run": '<path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
          "change": '<path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
          "check": '<path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'}
    svg = lambda k: f'<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">{ic[k]}</svg>'
    steps = [("pick", "Pick a neuron", "87 reconstructed cells, mostly hippocampal, from public archives. Rotate it in 3D, hover a branch to see what it is.", "docs.html#cells"),
             ("run", "Run a baseline", "Choose a model and a test (current step, F–I curve, Iₕ sag, back-propagation, resonance…). The baseline uses published values.", "docs.html#simulate"),
             ("change", "Manipulate it", "Drugs (TTX, ZD7288, XE991…), every channel and passive value, or tap a branch to block, cut, record or add a synapse.", "docs.html#simulate"),
             ("check", "Check and keep it", "See where every number comes from, compare with NEURON, save the run, download a NEURON or Brian2 script.", "docs.html#validation")]
    cats = [("Experimental morphology", "the reconstruction itself: who traced it, where it is archived"),
            ("Published model", "channel equations and densities, each with its paper; unknown sources say <i>unspecified</i>"),
            ("Adapted here", "how a model was applied to this cell, and what you changed"),
            ("Tested computationally", "the test, every value, the assumptions"),
            ("Validated", "what has been checked (NEURON, Brian2) and what has not (recordings)")]
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Welcome · hippsim</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
<style>
.wx{{max-width:980px;margin:0 auto;padding:36px 16px 96px}}
.wx .kick{{font:600 12px system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--hs-accent);margin:0 0 8px}}
.wx h1{{font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.2rem,6vw,3.4rem);line-height:1.05;margin:0 0 14px}}
.wx .lead{{font-size:clamp(1.05rem,2.4vw,1.25rem);line-height:1.55;max-width:720px;margin:0 0 22px}}
.wx .cta{{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 40px}}
.wx .cta a{{font:600 15px system-ui,sans-serif;padding:11px 20px;border-radius:999px;text-decoration:none;border:1px solid var(--hs-line);color:var(--hs-ink);background:var(--hs-card)}}
.wx .cta a.go{{background:var(--hs-accent);border-color:var(--hs-accent);color:#fff}}
.wx h2{{font-family:Georgia,"Times New Roman",serif;font-size:1.5rem;margin:36px 0 14px}}
.steps{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}}
.steps a{{display:flex;flex-direction:column;gap:6px;padding:16px;border:1px solid var(--hs-line);border-radius:14px;background:var(--hs-card);color:var(--hs-ink);text-decoration:none}}
.steps a:hover{{border-color:var(--hs-accent)}}
.steps .n{{display:flex;align-items:center;gap:8px;color:var(--hs-accent)}}
.steps .n svg{{width:26px !important;height:26px !important;flex:none}}
.steps .n b{{font:700 12px system-ui,sans-serif;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--hs-ink);color:var(--hs-card)}}
.steps h3{{margin:2px 0 0;font-size:16px}}.steps p{{margin:0;font-size:14px;line-height:1.5;color:var(--hs-muted)}}
.steps .more{{margin-top:auto;font-size:13px;color:var(--hs-accent)}}
.cats{{list-style:none;padding:0;margin:0;display:grid;gap:6px}}
.cats li{{display:grid;grid-template-columns:210px 1fr;gap:12px;padding:10px 14px;border:1px solid var(--hs-line);border-radius:10px;background:var(--hs-card);font-size:14.5px}}
.cats b{{font-weight:600}}
.where{{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}}
.where a{{padding:12px;border:1px solid var(--hs-line);border-radius:12px;text-decoration:none;color:var(--hs-ink);background:var(--hs-card);font-size:13.5px;line-height:1.4}}
.where a b{{display:block;font-size:15px;margin-bottom:2px}}
.wx .fine{{color:var(--hs-muted);font-size:13.5px;margin-top:36px}}
@media (max-width:820px){{.steps{{grid-template-columns:1fr 1fr}} .where{{grid-template-columns:1fr 1fr}} .cats li{{grid-template-columns:1fr;gap:2px}}}}
@media (max-width:480px){{.steps{{grid-template-columns:1fr}}}}
</style>
</head><body class="hs-hubpage">
<header></header>
<main class="wx">
  <p class="kick">hippsim {e(ver)} · lab simulator</p>
  <h1>Simulate real neurons, and know where every number comes from.</h1>
  <p class="lead">hippsim runs published neuron models on reconstructed cells, right in the browser. Pick a cell, run its baseline, change anything, and compare. Every value is tied to its source, and the solver is checked against NEURON and Brian2.</p>
  <div class="cta"><a class="go" href="index.html">Explore the neurons →</a><a href="index.html#qhome">Start from a biological question</a><a href="docs.html#quick-start">Quick start (2 min)</a><a href="docs.html">Read the documentation</a></div>
  <h2>How it works</h2>
  <div class="steps">{"".join(f'<a href="{h}"><span class="n"><b>{i + 1}</b>{svg(k)}</span><h3>{t}</h3><p>{d}</p><span class="more">Read more →</span></a>' for i, (k, t, d, h) in enumerate(steps))}</div>
  <h2>What is measured and what is modelled</h2>
  <p>Under every simulation, five rows keep these apart:</p>
  <ul class="cats">{"".join(f"<li><b>{t}</b><span>{d}</span></li>" for t, d in cats)}</ul>
  <h2>Where things are</h2>
  <div class="where">
    <a href="index.html"><b>Neurons</b>Every cell; open one to simulate it</a>
    <a href="runs.html"><b>Runs</b>Your saved runs</a>
    <a href="simulator.html"><b>Tools</b>The model library and lessons</a>
    <a href="models.html"><b>Models</b>Every model, its sources and checks</a>
    <a href="docs.html"><b>Docs</b>How everything works</a>
  </div>
  <p class="fine">This page is shown once. Find it again from the Neurons page (“How hippsim works”) or the footer. hippsim is a research and teaching tool; it is not validated against recordings for every cell type (see <a href="docs.html#limitations">Limitations</a>).</p>
</main>
<script>try {{ localStorage.setItem("hs-intro-seen", "1"); }} catch (e) {{}}</script>
{APP_TAIL}
</body></html>"""


def questions_page() -> str:
    """Start from a question: generated from site/hs-questions.js (the same data the Simulate panel uses)."""
    js = "global.window = global; require(process.argv[1]); process.stdout.write(JSON.stringify(HSQuestions.Q.map(({read, ...x}) => x)))"
    Q = json.loads(subprocess.run(["node", "-e", js, str(SITE / "hs-questions.js")], capture_output=True, text=True, check=True).stdout)
    out = ['<p class="lead">Coming from the wet lab? Start from what you want to know, not from a model. Each question picks the neuron and the model '
           'that show it best, says why, runs the experiment, and explains the result in biological terms.</p>'
           '<p>In the app: <b>Neurons</b> → <i>Start from a question</i>, or in any neuron press <b>Simulate</b> → <i>Start from a question</i>. '
           'After the baseline, one button applies the manipulation (the drug) and compares.</p>']
    for x in Q:
        out.append(f'<h2 id="q-{x["id"]}">{e(x["q"])} <span class="tag">{e(x["tag"])}</span></h2>'
                   f'<p><a class="try" href="index.html#{x["cell"]}?q={x["id"]}">Run this question →</a></p><dl class="base">'
                   + "".join(f"<dt>{k}</dt><dd>{e(v)}</dd>" for k, v in [("Why this neuron", x["whyCell"]), ("Why this model", x["whyModel"]), ("What we simulate", x["sim"]),
                                                                        ("In the lab", x["lab"]), ("What to expect", x["expect"]), ("What it means", x["meaning"]), ("Sources", ", ".join(x["refs"]))])
                   + "</dl>")
    return "".join(out)


def compartments_page(APP_HEAD: str, APP_TAIL: str) -> str:
    """compartments.html: 1-, 2- and multi-compartment CA1 models, the three papers, and which to use."""
    rows = [
        ("What one compartment is", "the whole neuron", "the soma, plus one box standing for “the dendrites”", "a short piece (≤ 20 µm here) of a traced branch"),
        ("Voltages computed", "1", "2", '<span data-ncomp>≈ 1 500</span> for this CA1 cell'),
        ("Where input arrives", "everywhere at once", "at the soma or at “the dendrite”", "at any point on any branch"),
        ("Signals shrinking along dendrites", "no", "one step, set by the coupling conductance", "yes, continuously along each branch"),
        ("Back-propagating and dendritic spikes", "no", "only as a soma–dendrite ping-pong", "yes, branch by branch"),
        ("Channel density changing with distance (e.g. Iₕ)", "no", "one value in the dendrite box", "yes, a gradient along the tree"),
        ("Cell shape (branching, length, layers)", "no", "no: the box is not a measured dendrite", "yes, from the reconstruction"),
        ("Speed", "very fast: sweeps, networks", "very fast", "seconds per run in the browser"),
        ("Parameters you must choose", "the channel conductances", "+ coupling g_c and soma : dendrite area ratio (fitted, not measured)", "+ R_m, R_a, C_m and where every channel sits"),
        ("Best for", "which currents make bursts vs single spikes; parameter sweeps", "how dendritic currents (NaP, Iₕ) shape soma firing and resonance", "where inputs land, attenuation, back-propagation, comparing cell shapes"),
    ]
    papers = [
        dict(id="golomb", y="2006", cite="Golomb D, Yue C, Yaari Y (2006) J Neurophysiol 96:1912–1926", doi="10.1152/jn.00205.2006", extra='ModelDB <a href="https://modeldb.science/66268" target="_blank" rel="noopener">66268</a>',
             comp="1 compartment", title="Persistent Na⁺ and M-type K⁺ currents and somatic bursting",
             q="Which currents let a CA1 pyramidal cell fire bursts instead of single spikes?",
             model="A one-compartment conductance-based CA1 pyramidal cell: transient and persistent Na⁺ (I_NaT, I_NaP), delayed-rectifier and A-type K⁺, and the M-current (I_M). Combined with recordings.",
             found=["Increasing I_NaP induces bursting and adds spikes per burst, but it is neither necessary nor sufficient for bursting.",
                    "I_M enables bursting: its slow activation switches the cell between silent and tonically firing (“square bursting”, with I_M as the slow variable).",
                    "Lowering extracellular Ca²⁺ is modelled as shifting I_NaP activation to more negative voltages.",
                    "Different parameter sets reproduce the range of firing patterns seen in the recordings."],
             pf="It has no dendrite and no space, so it says nothing about place fields directly. It gives the somatic currents (I_NaP, I_M) that the later models build on.",
             hs="The soma equations in hippsim’s Python ladder (ir_ladder) reproduce the spike times of Golomb 2006 Fig 6Da exactly (67 spikes; <code>validate.py</code>). The same currents sit at the soma and axon of the full-morphology research model.",
             try_=("Model ladder", "sim-lab-models.html#biology.interleaved-resonance")),
        dict(id="lowet", y="2023", cite="Lowet E, et al. (2023) Cell Reports 42:112906", doi="10.1016/j.celrep.2023.112906", extra='code: <a href="https://github.com/HanLabBU/Lowet-Cell-Reports-2023" target="_blank" rel="noopener">HanLabBU/Lowet-Cell-Reports-2023</a>',
             comp="2 compartments", title="Theta and gamma rhythmic coding through two spike output modes",
             q="Do CA1 cells send different messages with bursts and with single spikes during navigation?",
             model="Recordings: tetrodes in rats on a 180 cm track (147 cells), SomArchon voltage imaging in head-fixed mice (56 cells), Allen Neuropixels data (1 689 cells). Model: a minimal two-compartment cell: soma with Na⁺/K⁺, dendrite with persistent Na⁺ and a slow K⁺ current (Pinsky–Rinzel style), driven by dendritic θ + γ input.",
             found=["Bursts lock to θ; single spikes lock more to γ (strongest around mid-γ).",
                    "Bursts carry more spatial information, come earlier in the place field and precess more strongly with position; single spikes dominate as the animal leaves the field.",
                    "8 Hz optogenetic pulses increase bursts; 40 Hz stimulation selectively increases single spikes; steady depolarization increases single spikes, not bursts.",
                    "In the model, a ramping (place-field-like) input reproduces the early-field bursts and their stronger precession."],
             pf="The first of the three to connect the two spike codes to place fields: bursts mark entering the field, single spikes leaving it.",
             hs="The minimal model (<code>dXdT_HH_3.m</code> equations) is the default cell of the Place fields page. Its figures have not been re-run in hippsim for a numerical check.",
             try_=("Place fields", "sim-lab-models.html#biology.research-place-fields")),
        dict(id="ceballos", y="2025", cite="Ceballos CC, Chadly N, Lowet E, Pena RFO (2025) PLoS Comput Biol 21:e1013126", doi="10.1371/journal.pcbi.1013126", extra='code: <a href="https://github.com/rodrigo-pena-lab/interleaved_resonance" target="_blank" rel="noopener">rodrigo-pena-lab/interleaved_resonance</a>',
             comp="1 compartment, then 2 (soma + Iₕ dendrite)", title="Interleaved single and bursting spiking resonance",
             q="Do bursts and single spikes prefer different input rhythms, and which conductances decide?",
             model="A CA1 soma derived from Golomb 2006 and Lowet 2023 (NaT, NaP, K_dr, M, A-type, high-threshold Ca²⁺, two Ca²⁺-activated K⁺ currents), refitted to voltage imaging; later a dendritic compartment with Iₕ. Inputs: sinusoidal currents at θ (10 Hz) and γ (40 Hz). A burst is spikes < 14 ms apart.",
             found=["More g_NaP moves firing from single spikes to bursts, then to depolarization block; more g_Kdr moves it back to single spikes.",
                    "Single spikes and bursts each have a resonance, at different frequencies (“interleaved”); low g_NaP or high g_Kdr lock bursts to θ; g_h mainly affects γ.",
                    "Bursts follow long silences (> 100 ms); single spikes also follow short ones. With θ + γ together, the cell behaves as with θ alone.",
                    "Place fields are not simulated; the paper links its result to Lowet 2023 (bursts/θ entering a field, single spikes/γ leaving)."],
             pf="It explains <i>why</i> one cell can carry both codes at once: the same voltage trace has a θ-preferring burst resonance and a different single-spike resonance.",
             hs="Rebecca’s reproduction (Model ladder; Python <code>ir_ladder</code>): reproduced the interleaving (bursts 8–20 Hz, single spikes in γ), f_SS &gt; f_BS for every g_h, and bursting from g_NaP ≈ 0.35. Not reproduced: the sign reversals of Δf with g_NaP and g_Kdr, and ΔA &lt; 0. Uses the “hybrid” reading of the printed parameters (θ_p −35 mV).",
             try_=("Resonance analysis", "sim-lab-models.html#biology.research-resonance")),
    ]
    card = lambda p: f"""<article class="paper" id="p-{p['id']}"><p class="pk">{p['y']} · {p['comp']}</p><h3>{p['title']}</h3>
      <p class="cite">{p['cite']} · <a href="https://doi.org/{p['doi']}" target="_blank" rel="noopener">doi</a> · {p['extra']}</p>
      <dl><dt>Question</dt><dd>{p['q']}</dd><dt>Model and data</dt><dd>{p['model']}</dd><dt>What they found</dt><dd><ul>{''.join(f'<li>{x}</li>' for x in p['found'])}</ul></dd>
      <dt>For place fields</dt><dd>{p['pf']}</dd><dt>In hippsim</dt><dd>{p['hs']}</dd></dl>
      <p><a class="go" href="{p['try_'][1]}">Open: {p['try_'][0]} →</a></p></article>"""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Compartments · hippsim</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
<style>
.cx{{max-width:1000px;margin:0 auto;padding:30px 16px 96px;line-height:1.55}}
.cx .kick{{font:600 12px system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--hs-accent);margin:0 0 6px}}
.cx h1{{font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.9rem,5vw,2.9rem);line-height:1.1;margin:0 0 12px}}
.cx h2{{font-family:Georgia,"Times New Roman",serif;font-size:1.5rem;margin:40px 0 12px}}
.cx .lead{{font-size:1.12rem;max-width:760px}}
.cx .jump{{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 6px}}.cx .jump a{{font-size:13.5px;padding:5px 12px;border:1px solid var(--hs-line);border-radius:999px;text-decoration:none;color:var(--hs-ink);background:var(--hs-card)}}
.fig{{border:1px solid var(--hs-line);border-radius:14px;background:var(--hs-card);padding:10px}}
.fig canvas{{width:100%;height:420px;display:block}}
.seg3{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}}
.seg3 button{{font:600 13.5px system-ui,sans-serif;padding:7px 14px;border-radius:999px;border:1px solid var(--hs-line);background:var(--hs-card);color:var(--hs-ink);cursor:pointer}}
.seg3 button[aria-checked="true"]{{background:var(--hs-ink);color:var(--hs-card);border-color:var(--hs-ink)}}
.three{{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}}
.three div{{border:1px solid var(--hs-line);border-radius:12px;padding:12px;background:var(--hs-card);font-size:14px}}
.three b{{display:block;font-size:15px;margin-bottom:2px}}
.tw{{overflow-x:auto}}
table.ct{{border-collapse:collapse;width:100%;font-size:14px;min-width:720px}}
table.ct th,table.ct td{{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--hs-line)}}
table.ct th{{font-size:12.5px;color:var(--hs-muted)}}table.ct td:first-child{{font-weight:600;width:22%}}
.paper{{border:1px solid var(--hs-line);border-radius:14px;padding:16px 18px;background:var(--hs-card);margin:12px 0}}
.paper .pk{{margin:0;font:600 11.5px system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--hs-accent)}}
.paper h3{{margin:2px 0 4px;font-size:1.2rem}}.paper .cite{{margin:0 0 8px;font-size:13px;color:var(--hs-muted)}}
.paper dl{{display:grid;grid-template-columns:150px 1fr;gap:6px 14px;margin:0;font-size:14.5px}}.paper dt{{font-weight:600;color:var(--hs-muted)}}.paper dd{{margin:0}}.paper ul{{margin:0;padding-left:18px}}
.paper a.go,.cx a.go{{font-weight:600}}
.ladder{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;counter-reset:r}}
.ladder div{{border:1px solid var(--hs-line);border-radius:12px;padding:12px;background:var(--hs-card);font-size:14px}}
.ladder b{{display:block}}
.use{{display:grid;grid-template-columns:1fr 1fr;gap:10px}}.use div{{border:1px solid var(--hs-line);border-radius:12px;padding:12px 14px;background:var(--hs-card)}}
.note{{color:var(--hs-muted);font-size:13.5px}}
.trio{{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}}.trio>div{{border:1px solid var(--hs-line);border-radius:10px;padding:8px 10px;background:var(--hs-bg,transparent)}}
.trio>div>b{{display:block}}.trio canvas{{width:100%;height:150px;display:block;margin-top:6px}}
@media (max-width:760px){{.trio{{grid-template-columns:1fr}}}}
@media (max-width:760px){{.three,.ladder,.use{{grid-template-columns:1fr}} .paper dl{{grid-template-columns:1fr}} .fig canvas{{height:340px}}}}
</style>
</head><body class="hs-hubpage">
<header></header>
<main class="cx">
  <p class="kick">CA1 pyramidal cell models</p>
  <h1>One, two, or thousands of compartments</h1>
  <p class="lead">The CA1 models in Golomb 2006, Lowet 2023 and Ceballos 2025 are not simplified copies of a reconstructed neuron. They have one or two compartments: the soma, and sometimes one box that stands for “the dendrites”. The neurons on hippsim’s Neurons page are the traced cell itself, cut into hundreds or thousands of compartments. This page explains the difference, what each kind of model can tell you, and how the three papers lead to the full-morphology model.</p>
  <nav class="jump"><a href="#see">See it</a><a href="#try">Try it</a><a href="#compare">What each can show</a><a href="#papers">The three papers</a><a href="#ladder">From 1 compartment to the full cell</a><a href="#which">Which should I use?</a></nav>

  <h2 id="see">A compartment is one patch of membrane with one voltage</h2>
  <p>Inside one compartment the voltage is the same everywhere. Between compartments current flows through a resistance, so neighbouring compartments can have different voltages. The more compartments, the more places the cell can be “at different voltages at the same time”. Below is the same CA1 pyramidal cell (n123, <span data-npts>…</span> traced points) as each kind of model sees it.</p>
  <div class="fig"><div class="seg3" role="radiogroup" aria-label="How many compartments"><button data-view="one" aria-checked="false">1 compartment (Golomb 2006)</button><button data-view="two" aria-checked="false">2 compartments (Lowet 2023, Ceballos 2025)</button><button data-view="full" aria-checked="true">Reconstruction (Neurons page)</button></div>
    <canvas id="cmpcv" aria-label="The CA1 cell n123 drawn as 1, 2 or many compartments"></canvas></div>
  <div class="three">
    <div><b>1 compartment</b>The tree is ignored: the soma’s channels and the whole cell’s membrane act as one sphere. Input injected “into the cell” reaches every channel at once.</div>
    <div><b>2 compartments</b>A soma and one dendrite box joined by a coupling conductance g_c. The box has its own channels (NaP and slow K⁺ in Lowet; Iₕ in Ceballos). Its size and coupling are <i>fitted</i>, not measured from a tracing.</div>
    <div><b>Reconstruction</b>The traced branches are cut into <span data-ncomp>≈ 1 500</span> pieces of ≤ 20 µm, each with its own voltage and channels, joined by the cytoplasm’s resistance. This is what the Neurons page simulates.</div>
  </div>

  <h2 id="try">Try it: the same rhythm into 1, 2 and ~1 000 compartments</h2>
  <p>θ (10 Hz) + γ (40 Hz) current, as in Ceballos 2025, into three cells built on the same somatic currents (Golomb-type: NaP, M, K_dr…). Send it to the soma, then to the dendrites, and see what each model can say.</p>
  <div class="fig"><div class="seg3" role="radiogroup" aria-label="Where the input goes"><button data-site="soma" aria-checked="true">Input at the soma</button><button data-site="dend" aria-checked="false">Input in the dendrites</button><button class="go" id="trun" style="margin-left:auto">▶ Run all three</button></div>
    <div class="trio">
      <div><b>1 compartment</b><span class="note">Ceballos soma alone (no dendrite)</span><canvas id="tr1"></canvas><p id="tx1" class="note"></p></div>
      <div><b>2 compartments</b><span class="note">Ceballos 2025: soma + Iₕ dendrite</span><canvas id="tr2"></canvas><p id="tx2" class="note"></p></div>
      <div><b>Reconstruction</b><span class="note">Research model on CA1 n123</span><canvas id="tr3"></canvas><p id="tx3" class="note"></p></div>
    </div>
    <p class="note" id="tnote">Blue dots: single spikes; purple: bursts (spikes &lt; 14 ms apart). The 1- and 2-compartment cells use Ceballos’s input (DC 1, θ 1, γ 2 µA/cm²); the reconstruction has a real membrane area, so its input is in nA (the research model’s own θ + γ test). Compare patterns, not exact numbers.</p></div>

  <h2 id="compare">What each kind of model can and cannot show</h2>
  <div class="tw"><table class="ct"><thead><tr><th></th><th>1 compartment</th><th>2 compartments</th><th>Reconstruction</th></tr></thead><tbody>
    {''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in rows)}
  </tbody></table></div>
  <p class="note">Neither is “more correct”. A small model isolates a mechanism and can be explored completely; a reconstruction adds the cell’s real geometry, at the cost of many more parameters that each need a source.</p>

  <h2 id="papers">The three papers, in order</h2>
  <p>Each builds on the one before: Golomb gives the somatic burst currents, Lowet links bursts and single spikes to θ, γ and place fields with a two-compartment cell, Ceballos explains how one cell can carry both codes.</p>
  {''.join(card(p) for p in papers)}

  <h2 id="ladder">From 1 compartment to the full cell: the research ladder</h2>
  <div class="ladder">
    <div><b>1 · Golomb 2006</b>1 compartment. Somatic I_NaP + I_M make bursts. <a href="sim-lab-models.html#biology.interleaved-resonance">Model ladder</a></div>
    <div><b>2 · Lowet 2023</b>2 compartments. Dendritic NaP + slow K⁺; bursts at θ, single spikes at γ, place fields. <a href="sim-lab-models.html#biology.research-place-fields">Place fields</a></div>
    <div><b>3 · Ceballos 2025</b>Golomb-type soma + Iₕ dendrite. Interleaved burst / single-spike resonance. <a href="sim-lab-models.html#biology.research-resonance">Resonance analysis</a></div>
    <div><b>4 · Full morphology</b>The same somatic I_M and I_NaP at the soma and axon of a reconstructed CA1 cell, with Migliore-derived dendrites (Iₕ and A-type gradients). A lab model, not yet validated. <a href="index.html#ca1-n123?model=research&amp;test=thetagamma&amp;run=0">Open on n123</a></div>
  </div>
  <p class="note">Going up a rung changes more than detail: the reconstruction’s dendrites draw current from the soma (lower input resistance), so conductances that made bursts in one compartment may not on the full tree, and must be re-checked, not copied.</p>

  <h2 id="which">Which should I use?</h2>
  <div class="use">
    <div><b>Use 1 or 2 compartments when</b> the question is about <i>which currents</i> produce a firing pattern (bursts, resonance, phase locking), you need to sweep parameters, or you want many cells in a network.</div>
    <div><b>Use a reconstruction when</b> the question is about <i>where</i>: where a synapse sits, how input from entorhinal cortex vs CA3 reaches the soma, how far a spike back-propagates, or whether cell shape changes the answer.</div>
  </div>
  <p class="note">Coming from the wet lab: a whole-cell recording at the soma sees something close to the 1-compartment picture when the cell is compact; dendritic recordings, local drug puffs and input-specific stimulation are where the reconstruction matters.</p>
</main>
<script src="hs-cable.js"></script><script src="hs-ngc.js"></script><script src="hs-models.js"></script><script src="hs-ir.js"></script>
<script src="hs-compartments.js"></script>
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
    pages.insert(2, ("questions", "Start from a question", questions_page()))
    pages.insert(4, ("models", "Models", models_page()))
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
    (SITE / "welcome.html").write_text(welcome_page(APP_HEAD, APP_TAIL, ver))
    (SITE / "compartments.html").write_text(compartments_page(APP_HEAD, APP_TAIL))
    raw = (ROOT / "sources/raw/little_neural_guide/modellab.js").read_text()
    a, b = raw.index("const IR_GATE ="), raw.index("/* ---------- reduction: steady state")
    (SITE / "hs-ir.js").write_text("/* hs-ir.js: generated by tools/build_docs.py from sources/raw/little_neural_guide/modellab.js (unmodified):\n"
                                   "   the research ladder models (Golomb-type HH soma + Iₕ dendrite of Ceballos 2025, Lowet 2023 minimal model, LIF, GLIF, AdEx)\n"
                                   "   and irMake / irRun / irClassify. Do not edit; edit the source and rebuild. */\n" + raw[a:b])
    print(f"docs.html: {len(pages)} pages, {len(page) / 1e3:.0f} kB")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    main()
