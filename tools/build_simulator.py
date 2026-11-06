"""Build the extracted simulator: one standalone page per tool family + a hub (site/simulator.html).

Each page loads only the Guide engine files it needs, in the Guide's own order, with hs-core.js in
place of the lesson router. `--resolve` loads every page headlessly and adds the Guide file that
defines any missing global until each route renders without errors; the result is saved to
tools/simulator_deps.json so later builds are deterministic.

  python tools/build_simulator.py --resolve     # discover dependencies (needs Chrome + playwright)
  python tools/build_simulator.py               # build pages from simulator_deps.json
"""
from __future__ import annotations

import html
import json
import re
import subprocess
import sys
import time
import yaml
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GUIDE = ROOT / "sources/raw/little_neural_guide"
SITE = ROOT / "site"
DEPS = ROOT / "tools/simulator_deps.json"

# Guide script order (from its index.html); guide.js is replaced by hs-core.js
ORDER = re.findall(r'<script src="([^"]+)"', (GUIDE / "index.html").read_text())
LESSON_ONLY = {"app.js", "topics.js", "examples.js", "demos.js", "nav.js", "links.js", "study.js", "guide.js",
               "corpus.js", "assistant.js", "ngsections.js", "textbook-data.js", "textbook.js", "presenter.js",
               "navigation-upgrade.js", "ngsearch.js", "lessonlinks.js", "tracks.js", "studyframe.js", "nbindex.js",
               "proposal.js", "judgment.js", "skills.js", "connections.js", "spatial.js", "refs.js", "runner.js"}

PAGES = [  # 5 workspaces, ordered by biological scale; each section is one Guide route. Levels come from the model cards.
    ("studio", "Cells & morphology", "Real reconstructed neurons: shapes, signals, channels and simple circuits.",
     [("/biology/cell-atlas/", "Cell & signals"), ("/workbench/morphology/", "Measure & signals"),
      ("/biology/neuron-lab/", "Channels & simulation"), ("/biology/circuit-builder/", "Circuit builder"),
      ("/biology/whole-brain/", "Whole-brain axons")],   # full screen is a button on the selected cell, not a tab
     ["modellab.js", "ngstudio.js", "neuronviewer.js", "realbio.js", "morph.js", "morph2.js"], ["neuronviewer.css"]),
    ("ca1-neuron", "CA1 neuron", "Published CA1 models: resonance, back-propagating spikes, AIS inhibition, bursting.",
     [("/biology/dendritic-resonance/", "Dendritic resonance"), ("/biology/active-dendrites/", "Back-propagating spikes"),
      ("/biology/axo-axonic/", "Axo-axonic inhibition"), ("/biology/ca1-bursting/", "Bursting (Golomb 2006)")],
     ["modellab.js", "realbio.js", "morph.js", "morph2.js"], ["neuronviewer.css"]),
    ("lab-models", "Lab research models", "The lab's CA1 models, from the Ceballos 2025 ladder to circuits and place fields.",
     [("/biology/interleaved-resonance/", "Model ladder"), ("/biology/research-resonance/", "Resonance analysis"),
      ("/biology/research-spiking/", "Spiking analysis"), ("/biology/research-morphology/", "Full morphology"),
      ("/biology/research-circuit/", "PYR / PV / OLM circuit"), ("/biology/research-place-fields/", "Place fields")],
     ["modellab.js", "realbio.js", "morph.js", "morph2.js"], ["neuronviewer.css"]),
    ("circuit", "Hippocampal circuit", "Signal flow EC → DG → CA3 → CA1, in a reduced and a real-cell network.",
     [("/biology/network/", "Reduced network"), ("/biology/real-circuit/", "Real cells, connected")],
     ["modellab.js", "realbio.js", "morph.js", "morph2.js"], ["neuronviewer.css"]),
    ("other-systems", "Other systems", "Beyond the hippocampus: action potential, reflex arc, muscle, fly escape circuit.",
     [("/biology/action-potential/", "Action potential"), ("/biology/reflex/", "Reflex arc"), ("/biology/mechanisms/", "NMJ & muscle"),
      ("/biology/giant-fiber/", "Drosophila giant fiber")], ["modellab.js", "realbio.js", "gfdata.js"], []),
]
# pages from the 8-workspace layout -> where their tools live now (old links, bookmarks and saved runs keep working)
MOVED = {"ca1-bursting": "ca1-neuron", "ladder": "lab-models", "ca1-research": "lab-models",
         "giant-fiber": "other-systems", "nerve-muscle": "other-systems"}


def page_html(slug, title, routes, scripts, css) -> str:
    ordered = [s for s in ORDER if s in scripts]
    tags = []
    for s in ORDER:                       # keep the Guide's load order; hs-core.js sits where guide.js was
        if s == "guide.js":
            tags.append('<script src="hs-core.js"></script>')
        elif s in ordered:
            tags.append(f'<script src="{s}"></script>')
            if s == "modellab.js" and (ROOT / "site/hs-morph-extra.js").exists():   # more reconstructions (tools/import_modeldb_morphologies.py)
                tags.append('<script src="hs-morph-extra.js"></script>')
    links = "".join(f'<link rel="stylesheet" href="{c}">' for c in ["styles.css", *css, "hs-sim.css"])
    where = {r: f"sim-{sl}.html" for sl, _, _, rs, _, _ in PAGES for r, _ in rs}
    allt = [[r, n, sl, tt] for sl, tt, _, rs, _, _ in PAGES for r, n in rs]
    data = json.dumps({"title": title, "slug": slug, "routes": routes, "where": where, "all": allt}, ensure_ascii=False)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>hippsim · {html.escape(title)}</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}img{{max-width:100%}}[hidden]:not([hidden=until-found i]){{display:none!important}}</style>
{links}
</head><body class="hs-page-{slug}">
<header></header>
<main><aside hidden><nav id="nav"></nav><div id="progress"></div><div id="completed"></div><button id="reset"></button></aside><article id="lesson" aria-label="{html.escape(title)}"><p class="hs-loading" role="status">Loading the simulation…</p></article></main>
<script>window.HS_PAGE = {data};</script>
{chr(10).join(tags)}
<script src="hs-cards.js"></script>
<script src="hs-registry.js"></script>
<script src="hs-help.js"></script>
<script src="hs-page.js"></script>
<script src="hs-run.js"></script>
{APP_TAIL}
</body></html>
"""


APP_HEAD = ('<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#f8cddd">'
            '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
            '<meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="hippsim">'
            '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><link rel="icon" href="icons/icon-192.png">'
            '<script src="hs-layout.js"></script>')   # Display settings before first paint + Web / Phone view
APP_TAIL = '<script src="hs-app-config.js"></script><script src="hs-backend-firebase.js"></script><script src="hs-app.js"></script>'


def norm(t: str) -> str:
    """Search text: lower case, subscripts and underscores flattened (Iₕ, I_h → ih)."""
    return t.lower().replace("ₕ", "h").replace("_", "").replace("⁺", "").replace("²", "2")


def hub_html() -> str:
    """Simulate: the 5 workspaces in order of biological scale; level is a badge and a filter."""
    sys.path.insert(0, str(ROOT / "tools"))
    from model_cards import C, LEVELS
    e = html.escape
    reg = json.loads((ROOT / "models/registry.json").read_text())["tools"]
    n = sum(len(p[3]) for p in PAGES)
    secs = []
    for i, (slug, title, blurb, routes, _, _) in enumerate(PAGES, 1):
        cards = ""
        for r, name in routes:
            c = C[r]; t = reg.get(r, {})
            own = t.get("origin") == "lab/rebecca"
            cards += (f'<a class="hs-card2{" own" if own else ""}" data-level="{c["level"]}" data-text="{e(norm(name + " " + title + " " + c["question"] + " " + c["model"] + " " + c["biology"]))}" '
                      f'href="sim-{slug}.html#{".".join(x for x in r.split("/") if x)}">'
                      f'<b>{e(name)}</b><span class="q">{e(c["question"])}</span></a>')
        secs.append(f'<section class="hs-ws" id="ws-{slug}"><div class="hs-ws-head"><span class="hs-ws-n">{i}</span><div><h2><a href="sim-{slug}.html">{e(title)}</a></h2>'
                    f'<p>{e(blurb)}</p></div></div><div class="hs-grid">{cards}</div></section>')
    lv = '<button type="button" data-l="" aria-pressed="true">All levels</button>' + "".join(
        f'<button type="button" data-l="{k}" aria-pressed="false" title="{e(w)}">L{k} · {e(nm)}</button>' for k, (nm, w) in LEVELS.items())
    toc = "".join(f'<a href="#ws-{slug}">{e(t)}</a>' for slug, t, *_ in PAGES)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>hippsim Simulate</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
</head><body class="hs-hubpage">
<header></header>
<main class="hs-hub"><h1>Simulate</h1>
<p class="hs-sub">Model tools by workspace. To simulate one reconstructed neuron, open it from <a href="index.html">Neurons</a> and press <b>Simulate</b>.</p>
<div class="hs-hubbar"><input type="search" id="hs-hq" placeholder="Search tools, channels, cells, drugs… (/)" aria-label="Search tools"></div>
{"".join(secs)}
<p class="hs-none" id="hs-none" hidden>No tool matches. Try a channel (Ih, M current), a cell (CA1, granule), a drug (XE991, TTX) or a method (impedance, bAP).</p>
</main>
<script>
let L = '';
function apply() {{
  const q = document.getElementById('hs-hq').value.toLowerCase().replace(/ₕ/g,'h').replace(/_/g,'').replace(/⁺/g,'').trim();
  let any = false;
  document.querySelectorAll('.hs-card2').forEach(c => {{ c.hidden = (!!L && c.dataset.level !== L) || (!!q && !c.dataset.text.includes(q)); any = any || !c.hidden; }});
  document.querySelectorAll('.hs-ws').forEach(s => s.hidden = ![...s.querySelectorAll('.hs-card2')].some(c => !c.hidden));
  document.getElementById('hs-none').hidden = any;
}}
document.querySelectorAll('.hs-filters button').forEach(b => b.addEventListener('click', () => {{
  document.querySelectorAll('.hs-filters button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  L = b.dataset.l; apply();
}}));
document.getElementById('hs-hq').addEventListener('input', apply);
document.addEventListener('keydown', e => {{ if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {{ e.preventDefault(); document.getElementById('hs-hq').focus(); }} }});
</script>
{APP_TAIL}
</body></html>
"""


def redirect_html(target: str) -> str:
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title>'
            f'<script>location.replace("{target}" + location.hash);</script></head>'
            f'<body><p>This page moved to <a href="{target}">{target}</a>.</p></body></html>')


def home_html() -> str:
    """Front door (the artifact's main page): the four sections, the five workspaces, and common starting points."""
    e = html.escape
    reg = json.loads((ROOT / "models/registry.json").read_text())["tools"]
    n = sum(len(p[3]) for p in PAGES)
    n_pert = sum(t["n_perturbations"] for t in reg.values())
    hsh = lambda r: ".".join(x for x in r.split("/") if x)
    ws = "".join(f'<li><a href="sim-{slug}.html"><span class="hs-ws-n">{i}</span><b>{e(t)}</b><span>{len(r)} tools</span></a></li>'
                 for i, (slug, t, _, r, _, _) in enumerate(PAGES, 1))
    return f"""<title>hippsim</title>
<meta name="claude:viewport-fit-sides" content="cover">
{APP_HEAD}
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
<header></header>
<main class="hs-hub hs-home">
<h1>hippsim</h1>
<p class="hs-sub">The lab's simulator. Five workspaces, from single cells to circuits; every tool runs the same four steps: baseline, run, change, save.</p>
<div class="hs-start">
  <a class="hs-btn primary hs-big" id="hs-go" href="sim-{PAGES[0][0]}.html">Start: {e(PAGES[0][1])} →</a>
  <p class="hs-muted" id="hs-cont" hidden></p>
</div>
<section class="hs-path"><h2>The path</h2><ol class="hs-wslist">{ws}</ol></section>
<nav class="hs-secondary" aria-label="Also"><a href="atlas.html">Neuron atlas</a><a href="runs.html">Runs</a><a href="models.html">Models</a><a href="library.html">Cells &amp; data</a><a href="about.html">About &amp; help</a></nav>
<script>
try {{ const L = JSON.parse(localStorage.getItem('hs-last') || 'null');
  if (L && L.href) {{ const g = document.getElementById('hs-go'); g.href = L.href; g.textContent = 'Continue: ' + L.tool + ' →';
    const c = document.getElementById('hs-cont'); c.hidden = false; c.innerHTML = 'in ' + L.ws.replace(/[<&]/g, '') + ' · or <a href="sim-{PAGES[0][0]}.html">start from the beginning</a>'; }} }} catch (e) {{}}
</script>
</main>
{APP_TAIL}
"""


def changelog_html() -> str:
    """CHANGELOG.md (headings + bullets) as HTML."""
    e = html.escape
    out, items = [], []
    def flush():
        if items: out.append("<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>"); items.clear()
    for line in (ROOT / "CHANGELOG.md").read_text().splitlines():
        if line.startswith("## "): flush(); out.append(f"<h3>{e(line[3:])}</h3>")
        elif line.startswith("- "): items.append(e(line[2:]))
        elif line.startswith("  ") and items: items[-1] += " " + e(line.strip())
    flush()
    md = lambda t: re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", re.sub(r"`(.+?)`", r"<code>\1</code>", t))
    return md("".join(out))


def version() -> str:
    m = re.search(r"^## ([\d.]+) · (.+)$", (ROOT / "CHANGELOG.md").read_text(), re.M)
    return f"{m.group(1)} · {m.group(2)}" if m else ""


def about_html() -> str:
    cat = yaml.safe_load((ROOT / "morphologies/catalog.yaml").read_text())["cells"]
    n_ref = (ROOT / "references.bib").read_text().count("\n@")
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>hippsim About</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
</head><body class="hs-hubpage">
<header></header>
<main class="hs-log-wrap hs-about"><h1>About &amp; help</h1>
<p class="hs-sub">hippsim runs real reconstructed neurons and published models in the browser, with every starting value, manipulation and source on record. Version {version()}. Full documentation: <a href="docs.html">Docs</a> (models, equations, validation, citing).</p>
<nav class="hs-jumps" aria-label="On this page"><span>On this page</span><a href="#use">How to use</a><a href="#legend">Legend</a><a href="#data">Data &amp; sources</a><a href="#cite">Cite</a><a href="#privacy">Your data</a><a href="#notes">Release notes</a></nav>
<section id="use"><h2>How to use</h2><ol class="hs-steps-list">
<li><b>Neurons</b> (home): pick a cell, rotate it, press <b>Simulate</b> to inject current and watch the voltage spread. Save the run or download the same model as a NEURON or Brian2 script.</li>
<li><b>Tools</b>: the model library (channels, synapses, circuits, plasticity), each with literature baselines and perturbations.</li>
<li>In a tool, <b>Baseline</b>: the starting values, the model they come from, and its references.</li>
<li><b>Run</b>, then <b>Change</b> one thing: move a control, or apply a published manipulation (drug, disease model, genotype), and run again. The bar shows how many values differ from baseline; <b>Reset</b> undoes them.</li>
<li><b>Save run</b>: stored online with every value and the plots. <a href="runs.html">Runs</a> reopens it exactly, sorts runs into folders, and downloads a citable zip.</li></ol></section>
<section id="legend"><h2>Legend</h2><dl class="hs-legend">
<dt><span class="hs-lg" style="background:var(--apical,#a62961)"></span>Apical dendrite</dt><dd>Dendrites on the apical side of the soma (toward stratum radiatum / lacunosum-moleculare in CA1–CA3).</dd>
<dt><span class="hs-lg" style="background:var(--basal,#3d5a8a)"></span>Basal dendrite</dt><dd>Basal dendrites, and all dendrites of cells without an apical tree (granule cells, interneurons).</dd>
<dt><span class="hs-lg" style="background:var(--axon,#9a6a33)"></span>Axon</dt><dd>Traced axon. Axons added by modellers are hidden and say so on the cell's page.</dd>
<dt><span class="hs-own">Lab</span></dt><dd>A model implemented and tested in the lab, as opposed to a published model re-implemented.</dd>
<dt>NEURON check</dt><dd>Passive cable model in NEURON (R<sub>m</sub> 20 kΩ·cm², R<sub>a</sub> 150 Ω·cm, C<sub>m</sub> 1 µF/cm²): soma input resistance and the length constant that best fits attenuation along the dendrites at 0 and 100 Hz.</dd>
<dt>Validated</dt><dd>Each tool's check against its source is on <a href="models.html#validation">Models → Validation</a>.</dd></dl></section>
<section id="data"><h2>Data &amp; sources</h2>
<p>{len(cat)} reconstructions from NeuroMorpho.Org, ModelDB, Janelia (MouseLight, hemibrain, MANC), FANC and the Allen Cell Types Database; each cell's page names its archive record and paper. Models follow {n_ref} papers; DOIs were checked against Crossref and OpenAlex. Corrections to inherited data: <a href="tools/doi_corrections.json">doi_corrections.json</a>. Follow each archive's citation policy when you reuse a cell.</p></section>
<section id="cite"><h2>Cite</h2><p>Cite the papers behind what you used (Baseline card, cell page, or the <code>references.bib</code> in a run's zip) and hippsim itself (<a href="CITATION.cff">CITATION.cff</a>). NeuroMorpho.Org cells: also Ascoli et al. (2007) J Neurosci 27:9247.</p></section>
<section id="privacy"><h2>Your data</h2><p>Saved runs are stored with your account and are visible to people the simulator is shared with; only you can change or delete yours. Display settings (size, colours, layout) stay on this device.</p></section>
<section id="notes"><h2>Release notes</h2>{changelog_html()}</section>
</main>
{APP_TAIL}
</body></html>"""


def defining_file(name: str) -> str | None:
    pat = re.compile(rf"(?:function\s+{name}\b|(?:const|let|var)\s+{name}\s*=|window\.{name}\s*=)")
    for s in ORDER:
        f = GUIDE / s
        if s not in ("guide.js",) and f.exists() and pat.search(f.read_text(errors="ignore")):
            return s
    return None


def build(deps: dict) -> None:
    for slug, title, _, routes, seed, css in PAGES:
        (SITE / f"sim-{slug}.html").write_text(page_html(slug, title, routes, set(deps.get(slug, seed)), css))
    (SITE / "simulator.html").write_text(hub_html())
    for old, new in MOVED.items():
        (SITE / f"sim-{old}.html").write_text(redirect_html(f"sim-{new}.html"))
    # index.html (home) is the neuron atlas, written by build_library_page.py
    (SITE / "runs.html").write_text((ROOT / "tools/runs_template.html").read_text()
                                    .replace("<title>hippsim Runs</title>", "<title>hippsim Runs</title>\n" + APP_HEAD)
                                    .replace("</body></html>", APP_TAIL + "\n</body></html>"))
    (SITE / "models.html").write_text(models_html())
    (SITE / "about.html").write_text(about_html())
    (SITE / "registry.html").write_text(redirect_html("models.html#baselines"))
    (SITE / "validation.html").write_text(redirect_html("models.html#validation"))


def _main_of(page: str) -> str:
    """Inner content of a generated page's <main>, without its <h1>."""
    m = re.search(r'<main class="hs-log-wrap">(.*)</main>', page, re.S).group(1)
    return re.sub(r"<h1>.*?</h1>", "", m, count=1, flags=re.S)


def models_html() -> str:
    """Models: baselines & perturbations, validation, code, cite, in one page with tabs."""
    sys.path.insert(0, str(ROOT / "tools"))
    from model_cards import C
    e = html.escape
    reg = json.loads((ROOT / "models/registry.json").read_text())
    refs = json.loads(subprocess.run(["node", "-e", "global.window={};" + (SITE / "hs-cards.js").read_text() + ";process.stdout.write(JSON.stringify(window.HS_CARDS.refs))"],
                                     capture_output=True, text=True, check=True).stdout)
    base = _main_of(registry_html()).replace('<a class="hs-btn sm" href="models/', '<a class="hs-btn sm" href="models/')
    val = _main_of(validation_html()).replace('<nav class="hs-jumps" aria-label="On this page">', '<nav class="hs-jumps" aria-label="On this tab">')
    val = re.sub(r'<section id="cite">.*?</section>', "", val, flags=re.S)
    n_lab = sum(t["origin"] == "lab/rebecca" for t in reg["tools"].values())
    code = f"""<p>Every simulator tool runs in the browser; the <code>hippsim</code> Python package runs the same CA1 cell in NEURON and in a numpy reference engine, for scripts, sweeps and figures.</p>
<div class="hs-two"><div><h3>Repository</h3><pre class="hs-tree">hippsim/
├── models/
│   ├── literature/&lt;tool&gt;/        baseline.yaml + perturbations/   ({len(reg["tools"]) - n_lab} tools)
│   ├── lab/rebecca/&lt;tool&gt;/       baseline.yaml + perturbations/   ({n_lab} tools)
│   └── registry.json, INDEX.md     every tool: origin, ModelDB, DOI
├── morphologies/                   60 SWC + catalog.yaml + provenance.csv
├── mechanisms/                     NMODL channels (I_h, Na, K_dr, M)
├── hippsim/                        Python: config, engines, cells, stimuli, results
├── site/  app/                     this simulator; the installable app
├── tools/                          build, export, validate, test
└── VALIDATION.md  CITATION.cff  references.bib</pre></div>
<div><h3>Run a model in Python</h3><pre class="hs-tree">from hippsim.config import load_model
from hippsim.cells.morph_cell import MorphCell

cfg  = load_model("ca1_morph_ih_gradient",
                  override={{"gh_fold": 1}})   # baseline → change
cell = MorphCell(cfg)
cell.ref.input_resistance(0)               # MΩ, reference engine
cell.clamp(t, I)                           # NEURON time domain</pre>
<p class="hs-muted">A saved run's <code>reproduce.py</code> checks it against the baseline file in the repository.</p></div></div>
<p><a class="hs-btn" href="library.html#files">Browse every file</a> <a class="hs-btn" href="README.md">README</a> <a class="hs-btn" href="models/INDEX.md">Model index</a></p>"""
    reflist = "".join(f'<li id="ref-{e(k)}"><span class="hs-ref-a">{e(r["a"])} ({r["y"]}).</span> {e(r["t"])}. <i>{e(r["j"])}</i> {e(r["v"])}. '
                      f'{f"<a href=\"{e(r["u"])}\" target=\"_blank\" rel=\"noopener\">{e(r["u"].replace("https://", ""))}</a>" if r.get("u") else ""}</li>'
                      for k, r in sorted(refs.items(), key=lambda x: (x[1]["a"], x[1]["y"])))
    cite = f"""<div class="hs-two"><div><h3>Cite hippsim</h3><p><a href="CITATION.cff">CITATION.cff</a> (GitHub shows it as “Cite this repository”).</p>
<h3>Cite what you used</h3><ul><li><a href="references.bib">references.bib</a>: the {len(refs)} papers behind the models and perturbations</li>
<li><a href="morphologies/references.bib">morphologies/references.bib</a>: sources of every reconstruction (NeuroMorpho.Org cells: cite the paper and Ascoli et al. 2007)</li>
<li>Every saved run folder carries its own <code>references.bib</code> and RO-Crate metadata.</li></ul></div>
<div><h3>Data sources</h3><ul><li><a href="https://modeldb.science" target="_blank" rel="noopener">ModelDB</a>: published model code (accessions on each tool)</li>
<li><a href="https://neuromorpho.org" target="_blank" rel="noopener">NeuroMorpho.Org</a>: reconstructions (IDs in <a href="library.html#morphologies">Cells &amp; data</a>)</li>
<li>Janelia MouseLight, hemibrain, FANC and MANC connectomes; Allen Cell Types</li></ul></div></div>
<h3>All references</h3><ol class="hs-refs">{reflist}</ol>"""
    tabs = [("baselines", "Baselines &amp; perturbations", base), ("validation", "Validation", val), ("code", "Code", code), ("cite", "Cite", cite)]
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>hippsim Models</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
</head><body class="hs-hubpage">
<header></header>
<main class="hs-log-wrap"><h1>Models</h1>
<p class="hs-sub">What each tool runs, what it starts from, how it was checked and how to cite it. {len(reg["tools"])} tools · {sum(t["n_perturbations"] for t in reg["tools"].values())} perturbations · {len(refs)} references.</p>
<nav class="hs-ptabs" role="tablist" aria-label="Models">{"".join(f'<a href="#{k}" role="tab" data-t="{k}">{n}</a>' for k, n, _ in tabs)}</nav>
{"".join(f'<section class="hs-ptab" id="{k}" role="tabpanel" aria-label="{n}">{body}</section>' for k, n, body in tabs)}
</main>
<script>
(function () {{
  const ids = {json.dumps([k for k, _, _ in tabs])};
  function show() {{
    let h = location.hash.slice(1); const inner = h && !ids.includes(h) ? document.getElementById(h) : null;
    const tab = inner ? (inner.closest('.hs-ptab') || {{}}).id : (ids.includes(h) ? h : ids[0]);
    document.querySelectorAll('.hs-ptab').forEach(s => s.hidden = s.id !== tab);
    document.querySelectorAll('.hs-ptabs a').forEach(a => a.setAttribute('aria-selected', String(a.dataset.t === tab)));
    if (inner) inner.scrollIntoView();
  }}
  addEventListener('hashchange', show); show();
}})();
</script>
{APP_TAIL}
</body></html>
"""


def engine_tables():
    """Every neuron's baseline in hippsim's browser engine, NEURON and Brian2 (tools/engine_check.py)."""
    f = ROOT / "tools/engine_baselines.json"
    if not f.exists(): return [], ""
    d, e = json.loads(f.read_text()), html.escape
    cat = yaml.safe_load((ROOT / "morphologies/catalog.yaml").read_text())["cells"]
    sp = lambda r, k: (r.get(k) or {}).get("spikes")
    def stats(k):
        pairs = [(sp(r, "js"), sp(r, k)) for r in d.values() if sp(r, "js") is not None and sp(r, k) is not None]
        return len(pairs), sum(a == b for a, b in pairs), sum(abs(a - b) <= 1 for a, b in pairs)
    (nn, en, wn), (nb, eb, wb) = stats("neuron"), stats("brian2")
    date = max((r.get("date", "") for r in d.values()), default="")
    summ = (f"Baseline (0.5 nA, 300 ms at the soma; spikes = soma crossing 0 mV) for every neuron in hippsim's browser engine "
            f"(`site/hs-cable.js`), NEURON 9 and Brian2 2.11, from the same scripts the app hands out. Same counts as hippsim: NEURON {en}/{nn} cells "
            f"(±1 spike: {wn}), Brian2 {eb}/{nb} (±1: {wb}). The engines discretize the tree differently (hippsim ≤ 20 µm compartments, "
            f"NEURON d_lambda 0.1, Brian2 one compartment per traced segment), which moves cells near the onset of depolarization block "
            f"by a few spikes. Run {date}.")
    fmt = lambda r, k: "–" if sp(r, k) is None else str(sp(r, k))
    rows = sorted(d.items(), key=lambda kv: (cat.get(kv[0], {}).get("region", ""), kv[0]))
    md = ["", "## Engines: hippsim vs NEURON vs Brian2, every neuron", "", summ, "",
          "| Cell | Region | hippsim | NEURON | Brian2 |", "|---|---|---|---|---|"]
    md += [f"| {k} | {cat.get(k, {}).get('region', '')} | {fmt(r, 'js')} | {fmt(r, 'neuron')} | {fmt(r, 'brian2')} |" for k, r in rows]
    tr = "".join(f"<tr><td>{e(cat.get(k, {}).get('name', k))} <span class=\"hs-muted\">{e(k)}</span></td><td>{e(cat.get(k, {}).get('region', ''))}</td>"
                 f"<td>{fmt(r, 'js')}</td><td>{fmt(r, 'neuron')}</td><td>{fmt(r, 'brian2')}</td></tr>" for k, r in rows)
    h = (f'<section id="engines"><h2>Engines: hippsim vs NEURON vs Brian2</h2><p>{e(summ).replace("`", "")}</p>'
         f'<div class="hs-tbl"><table><thead><tr><th>Cell</th><th>Region</th><th>hippsim</th><th>NEURON</th><th>Brian2</th></tr></thead><tbody>{tr}</tbody></table></div></section>')
    return md, h


def validation_html() -> str:
    """Validation & provenance: engine checks, browser tests, per-tool validation, morphology sources. Also writes VALIDATION.md."""
    sys.path.insert(0, str(ROOT / "tools"))
    from model_cards import C
    e = html.escape
    V = json.loads((ROOT / "tools/validation_results.json").read_text())
    T = json.loads((ROOT / "tools/site_test_results.json").read_text())
    reg = json.loads((ROOT / "models/registry.json").read_text())["tools"]
    prov = json.loads((ROOT / "morphologies/provenance.json").read_text())
    checks = list(V["checks"]) + [
        {"group": "Simulator", "name": "Perturbation presets change the tool; Reset returns to baseline", "target": f"{T['presets']['total']} / {T['presets']['total']}",
         "result": f"{T['presets']['passed']} / {T['presets']['total']}", "status": "pass" if T["presets"]["passed"] == T["presets"]["total"] else "fail"},
        {"group": "Simulator", "name": "Save run → Load run restores the value on every tool", "target": f"{T['runs']['total']} / {T['runs']['total']}",
         "result": f"{T['runs']['passed']} / {T['runs']['total']}", "status": "pass" if T["runs"]["passed"] == T["runs"]["total"] else "fail"}]
    n_pass = sum(c["status"] == "pass" for c in checks)
    rows = "".join(f'<tr><td><span class="hs-vst s-{e(c["status"].replace(" ", "-"))}">{e(c["status"])}</span></td><td>{e(c["group"])}</td><td><b>{e(c["name"])}</b>'
                   f'{"<br><span class=hs-muted>" + e(c["note"]) + "</span>" if c.get("note") else ""}</td><td>{e(c["target"])}</td><td>{e(c["result"])}</td></tr>' for c in checks)
    sp = "".join(f'<tr><td class="num">{r["amp_nA"]}</td><td>{e(r["layout"])}</td><td class="num">{r["neuron"]}</td><td class="num">{r["js"]}</td>'
                 f'<td class="num">{r["neuron_first"][0] if r["neuron_first"] else "–"} / {r["js_first"][0] if r["js_first"] else "–"}</td></tr>' for r in V["spiking"] if not r["layout"].startswith("legacy"))
    _bs = V.get("block_scan") or {}
    _on = lambda xs: next((a for a, n in zip(_bs.get("amps", []), xs) if n < 10), "–")
    blk = f'JS {_on(_bs.get("js", []))} nA vs NEURON {_on(_bs.get("neuron", []))} nA' if _bs else "see VALIDATION.md"
    where = {r: t for r, t in reg.items()}
    tools = "".join(f'<tr><td><span class="hs-level l{C[r]["level"]}">L{C[r]["level"]}</span></td><td><b>{e(t["tool"])}</b><br><span class="hs-muted">{e(t["origin"])}</span></td>'
                    f'<td>{e(C[r]["validation"])}</td><td>{", ".join(f"<a href=\"https://modeldb.science/{m}\" target=\"_blank\" rel=\"noopener\">{m}</a>" for m in t["modeldb"][:3]) or "–"}</td></tr>'
                    for r, t in sorted(where.items(), key=lambda x: (C[x[0]]["level"], x[1]["tool"])))
    arch = {}
    for p in prov:
        arch[p["archive"]] = arch.get(p["archive"], 0) + 1
    mrows = "".join(f'<tr><td>{e(p["name"])}<br><span class="hs-muted">{e(p["region"])} · {e(p["species"])}</span></td><td>{e(p["archive"])}</td>'
                    f'<td>{f"<a href=\"{e(p["neuromorpho_url"])}\" target=\"_blank\" rel=\"noopener\">{e(p["neuromorpho_id"])}</a>" if p["neuromorpho_id"] else "–"}</td>'
                    f'<td>{", ".join(f"<a href=\"https://modeldb.science/{m}\" target=\"_blank\" rel=\"noopener\">{m}</a>" for m in p["modeldb"].split(";") if m) or "–"}</td>'
                    f'<td>{"; ".join(f"<a href=\"https://doi.org/{d}\" target=\"_blank\" rel=\"noopener\">{e(d)}</a>" for d in p["doi"].split(";") if d) or (f"<a href=\"https://pmc.ncbi.nlm.nih.gov/articles/{p["pmcid"]}\" target=\"_blank\" rel=\"noopener\">{p["pmcid"]}</a>" if p["pmcid"] else "–")}</td></tr>'
                    for p in prov)
    md = [f"# Validation record ({V['date']})", "", "Generated by `tools/validate_models.py` and `tools/test_site.py`; rendered by `tools/build_simulator.py`.", "",
          "| Status | Group | Check | Target | Result |", "|---|---|---|---|---|"]
    md += [f"| {c['status']} | {c['group']} | {c['name']} | {c['target']} | {c['result']} |" for c in checks]
    md += ["", "## Spiking: NEURON vs the CA1 Morphology Lab JS engine (300 ms step at the soma)", "",
           "| I (nA) | Channel layout | NEURON spikes | JS spikes | first spike NEURON / JS (ms) |", "|---|---|---|---|---|"]
    md += [f"| {r['amp_nA']} | {r['layout']} | {r['neuron']} | {r['js']} | {(r['neuron_first'] or ['–'])[0]} / {(r['js_first'] or ['–'])[0]} |" for r in V["spiking"] if not r["layout"].startswith("legacy")]
    bs = V.get("block_scan")
    if bs:
        md += ["", "Depolarization-block scan (spikes in 300 ms): " + "; ".join(f"{a} nA JS {j} / NEURON {n}" for a, j, n in zip(bs["amps"], bs["js"], bs["neuron"])) + "."]
    md += ["", "Fixed 2026-11-04: the JS engine used to update K_dr only in compartments that also have Na⁺, so the distal apical K_dr "
           "(0.4 × g_kdr) was never applied. It now follows the documented layout and matches NEURON below depolarization block. "
           "`legacy_js_kdr: true` reproduces the old page behaviour.", ""]
    eng_md, eng_html = engine_tables()
    md += eng_md
    (ROOT / "VALIDATION.md").write_text("\n".join(md) + "\n")
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>hippsim Validation</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
</head><body class="hs-hubpage">
<header><a class="brand" href="simulator.html">hippsim</a><span class="hs-title">Validation &amp; provenance</span><a class="hs-back" href="index.html">Home</a></header>
<main class="hs-log-wrap"><h1>Validation &amp; provenance</h1>
<p class="hs-sub">What has been checked, against what, and where every model and cell comes from. {n_pass} of {len(checks)} checks pass; the rest are explained below. Record: <a href="VALIDATION.md">VALIDATION.md</a> ({e(V["date"])}).</p>
<nav class="hs-jumps" aria-label="On this page"><span>On this page</span><a href="#checks">Checks</a><a href="#spiking">Spiking</a><a href="#engines">Engines</a><a href="#tools">Per tool</a><a href="#cells">Morphologies</a><a href="#cite">Cite</a></nav>
<section id="checks"><h2>Checks</h2><div class="hs-tbl"><table><thead><tr><th>Status</th><th>Group</th><th>Check</th><th>Target</th><th>Result</th></tr></thead><tbody>{rows}</tbody></table></div></section>
<section id="spiking"><h2>Spiking: NEURON vs the lab page's JS engine</h2>
<p>Same CA1 cell (571 compartments), 300 ms current step at the soma. First spikes agree within 0.6 ms and spike counts match until the soma goes into depolarization block, which starts slightly earlier in the JS engine ({blk}). <b>Fixed 4 Nov 2026:</b> the JS engine used to skip the distal apical K<sub>dr</sub> in its own channel table. <code>legacy_js_kdr: true</code> in <code>models/lab/rebecca/ca1_morph_ih_gradient/baseline.yaml</code> reproduces the old behaviour.</p>
<div class="hs-tbl"><table><thead><tr><th>I (nA)</th><th>Channel layout</th><th>NEURON spikes</th><th>JS spikes</th><th>First spike NEURON / JS (ms)</th></tr></thead><tbody>{sp}</tbody></table></div></section>
{eng_html}
<section id="tools"><h2>Per tool</h2><p class="hs-muted">How each simulator tool was checked against its source paper or model.</p>
<div class="hs-tbl"><table><thead><tr><th>Level</th><th>Tool</th><th>Validation</th><th>ModelDB</th></tr></thead><tbody>{tools}</tbody></table></div></section>
<section id="cells"><h2>Morphologies</h2><p class="hs-muted">{len(prov)} reconstructions · {", ".join(f"{k} {v}" for k, v in sorted(arch.items(), key=lambda x: -x[1]))}. Every cell has a DOI or PubMed Central record. Table: <a href="morphologies/provenance.csv">provenance.csv</a> · BibTeX: <a href="morphologies/references.bib">morphologies/references.bib</a>. For NeuroMorpho.Org cells, cite the original paper and NeuroMorpho.Org (Ascoli et al. 2007).</p>
<div class="hs-tbl"><table><thead><tr><th>Cell</th><th>Archive</th><th>NeuroMorpho</th><th>ModelDB</th><th>Paper</th></tr></thead><tbody>{mrows}</tbody></table></div></section>
<section id="cite"><h2>Cite</h2><p>Cite hippsim with <a href="CITATION.cff">CITATION.cff</a>, plus the models and cells you used: <a href="references.bib">references.bib</a> (the models' {len(json.loads(subprocess.run(["node", "-e", "global.window={};" + (SITE / "hs-cards.js").read_text() + ";process.stdout.write(JSON.stringify(Object.keys(window.HS_CARDS.refs)))"], capture_output=True, text=True).stdout))} papers) and <a href="morphologies/references.bib">morphologies/references.bib</a>. Every saved run includes its own references.bib.</p></section>
</main>{APP_TAIL}</body></html>
"""


def registry_html() -> str:
    """Baselines & perturbations: every tool's baseline file, split by origin, with its parameters and presets."""
    import yaml
    reg = json.loads((ROOT / "models/registry.json").read_text())
    e = html.escape
    def tool(route, t):
        b = yaml.safe_load((ROOT / t["baseline"]).read_text())
        prm = "".join(f'<tr><td>{e(p["label"])}</td><td class="num">{e(str(p["value"]))}</td><td>{e(p.get("unit", ""))}</td>'
                      f'<td class="hs-muted">{e(" – ".join(str(p[k]) for k in ("min", "max") if k in p))}{(" · step " + e(str(p["step"]))) if "step" in p else ""}</td></tr>'
                      for p in b["parameters"] if p["type"] != "number" or True)
        pert = ""
        for f in b["perturbations"]:
            d = yaml.safe_load((ROOT / t["baseline"]).parent.joinpath(f).read_text())
            pert += f'<li><a href="{e(str(Path(t["baseline"]).parent / f))}"><b>{e(d["name"])}</b></a> <span class="hs-muted">{e(d["what"])}</span></li>'
        prov = " · ".join([f'<a href="https://modeldb.science/{m}" target="_blank" rel="noopener">ModelDB {m}</a>' for m in t["modeldb"][:4]]
                          + [f'<a href="https://doi.org/{d}" target="_blank" rel="noopener">doi:{e(d)}</a>' for d in t["doi"][:3]])
        hashr = ".".join(x for x in route.split("/") if x)
        return (f'<details class="hs-reg"><summary><span class="hs-level l{t["level"]}">L{t["level"]}</span><b>{e(t["tool"])}</b>'
                f'<span class="hs-muted">{e(t["title"])}</span><span class="hs-reg-n">{t["n_parameters"]} params · {t["n_perturbations"]} perturbations</span></summary>'
                f'<div class="hs-reg-body"><p>{e(b["model"])}</p><p class="hs-reg-links"><a class="hs-btn sm" href="{e(t["page"])}#{hashr}">Open tool</a>'
                f'<a class="hs-btn sm" href="{e(t["baseline"])}">baseline.yaml</a>{(" · " + prov) if prov else ""}'
                f'{(" · Python port <code>" + e(t["python_port"]) + "</code>") if t["python_port"] else ""}</p>'
                + (f'<div class="hs-tbl"><table><thead><tr><th>Parameter</th><th>Baseline</th><th>Unit</th><th>Range</th></tr></thead><tbody>{prm}</tbody></table></div>' if prm else '<p class="hs-muted">Data view: no model parameters.</p>')
                + (f'<h4>Perturbations</h4><ul>{pert}</ul>' if pert else "") + '</div></details>')
    groups = {"lab/rebecca": ("Lab models (implemented and tested in the lab)", "models/lab/rebecca/"),
              "literature": ("Literature models (published models re-implemented from the paper or ModelDB entry)", "models/literature/")}
    secs = ""
    for o, (title, path) in groups.items():
        items = sorted(((r, t) for r, t in reg["tools"].items() if t["origin"] == o), key=lambda x: (x[1]["level"], x[1]["tool"]))
        secs += f'<section><h2>{e(title)}</h2><p class="hs-muted"><code>{path}</code> · {len(items)} tools</p>{"".join(tool(r, t) for r, t in items)}</section>'
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>hippsim Baselines</title>
{APP_HEAD}
<style>:root{{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}</style>
<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="hs-sim.css">
</head><body class="hs-hubpage">
<header><a class="brand" href="simulator.html">hippsim</a><span class="hs-title">Baselines &amp; perturbations</span><a class="hs-back" href="index.html">Home</a></header>
<main class="hs-log-wrap"><h1>Baselines &amp; perturbations</h1>
<p class="hs-sub">Each tool opens at the baseline in its <code>baseline.yaml</code> (schema <code>hippsim.baseline/1.0</code>); each literature manipulation is a file in its <code>perturbations/</code> folder. Saved runs record the baseline file and engine build ({e(reg["build"]["sha"])}, {e(reg["build"]["date"])}) they were made with. Index: <a href="models/INDEX.md">models/INDEX.md</a> · <a href="models/registry.json">registry.json</a>.</p>
{secs}</main>{APP_TAIL}</body></html>
"""


def resolve() -> dict:
    from playwright.sync_api import sync_playwright
    tmp = ROOT / "simtest"
    subprocess.run(["rm", "-rf", str(tmp)]); tmp.mkdir()
    subprocess.run(f"cp -r {GUIDE}/* {tmp}/", shell=True, check=True)
    srv = subprocess.Popen([sys.executable, "-m", "http.server", "8766"], cwd=tmp, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    prior = json.loads(DEPS.read_text()) if DEPS.exists() else {}
    deps = {slug: prior.get(slug, list(seed)) for slug, _, _, _, seed, _ in PAGES}
    report = {}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
            for slug, title, _, routes, seed, css in PAGES:
                for _ in range(25):
                    build(deps)
                    subprocess.run(f"cp {SITE}/*.html {SITE}/hs-*.js {SITE}/hs-sim.css {tmp}/", shell=True, check=True)
                    pg = b.new_page(viewport={"width": 1300, "height": 900})
                    errs = []
                    pg.on("pageerror", lambda e: errs.append(str(e)))
                    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
                    pg.goto(f"http://localhost:8766/sim-{slug}.html", wait_until="load"); pg.wait_for_timeout(1200)
                    rows = []
                    for r, _ in routes:
                        h = "#" + ".".join(x for x in r.split("/") if x)
                        pg.evaluate(f"location.hash='{h}'"); pg.wait_for_timeout(900)
                        rows.append((r, pg.evaluate("document.getElementById('lesson').innerText.length"),
                                     pg.evaluate("document.querySelectorAll('#lesson canvas,#lesson svg').length")))
                    pg.close()
                    missing = sorted({m for e in errs for m in re.findall(r"(\w+) is not defined", e)})
                    added = False
                    for m in missing:
                        f = defining_file(m)
                        if f and f not in deps[slug]:
                            deps[slug].append(f); added = True
                    if not added:
                        report[slug] = {"routes": rows, "errors": sorted(set(e[:160] for e in errs))}
                        break
            b.close()
    finally:
        srv.terminate()
    DEPS.write_text(json.dumps(deps, indent=1))
    (ROOT / "tools/simulator_report.json").write_text(json.dumps(report, indent=1))
    return report


if __name__ == "__main__":
    if "--resolve" in sys.argv:
        rep = resolve()
        for slug, r in rep.items():
            print(f"{slug:18s} errors={len(r['errors'])}  " + " ".join(f"{t.split('/')[-2]}:{n}/{g}" for t, n, g in r["routes"]))
            for e in r["errors"][:4]:
                print("     ", e)
    deps = json.loads(DEPS.read_text()) if DEPS.exists() else {}
    build(deps)
    print("built", len(PAGES), "pages + hub")
