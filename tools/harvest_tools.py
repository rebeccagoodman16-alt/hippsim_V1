"""Harvest each simulator tool's content from the running Guide engines: title, lead, section headings,
every control with its default (the built-in baseline), and references (NG_REF_MAP + citations in text).
Writes tools/tool_harvest.json.   python tools/harvest_tools.py   (needs Chrome + playwright)"""
import json, re, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from build_simulator import PAGES
G = ROOT / "sources/raw/little_neural_guide"
refs_txt = (G / "refs-data.js").read_text()
def jsval(m):
    i = refs_txt.index(m) + len(m); return json.JSONDecoder().raw_decode(refs_txt[i:].lstrip())[0]
REFS, MAP = jsval("window.NG_REFS ="), jsval("window.NG_REF_MAP =") if "NG_REF_MAP =" in refs_txt else {}
JS = r"""() => {
 const L = document.getElementById('lesson');
 const lab = el => { let t = '';
   if (el.id) { const l = L.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) t = l.innerText; }
   if (!t) { const l = el.closest('label'); if (l) t = l.innerText; }
   if (!t) { const p = el.closest('.ctl,.sl,.row,.field,.param,div'); if (p) t = p.innerText; }
   return t.replace(/\s+/g,' ').trim().slice(0,90); };
 const ctrls = [...L.querySelectorAll('input[type=range],input[type=number],select,input[type=checkbox]')].map(el => ({
   id: el.id || '', type: el.type || el.tagName.toLowerCase(), label: lab(el),
   value: el.type === 'checkbox' ? el.checked : el.value, min: el.min || null, max: el.max || null, step: el.step || null,
   options: el.tagName === 'SELECT' ? [...el.options].slice(0,12).map(o => o.text) : null }));
 return { title: document.title, h1: (L.querySelector('h1')||{}).innerText || '',
   lead: (L.querySelector('.lead,.lede,p') || {}).innerText || '',
   heads: [...L.querySelectorAll('h2,h3')].map(h => h.innerText.trim()).filter(Boolean).slice(0,40),
   text: L.innerText, ctrls,
   links: [...L.querySelectorAll('a[href^="http"]')].map(a => [a.innerText.trim().slice(0,120), a.href]).slice(0,80) }; }"""
def match_refs(text):
    out = []
    for k, r in REFS.items():
        sur = re.split(r"[ ,]", r["a"])[0]
        if sur and re.search(rf"{re.escape(sur)}[^()\n]{{0,40}}\(?{r['y']}", text): out.append(k)
    return out
tmp = ROOT / "simtest"
subprocess.run(f"cp {ROOT}/site/sim-*.html {ROOT}/site/hs-* {tmp}/", shell=True)
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8768"], cwd=tmp, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1300, "height": 900})
        for slug, title, _, routes, _, _ in PAGES:
            pg.goto(f"http://localhost:8768/sim-{slug}.html", wait_until="load"); pg.wait_for_timeout(1500)
            for r, name in routes:
                pg.evaluate(f"location.hash='{'#' + '.'.join(x for x in r.split('/') if x)}'"); pg.wait_for_timeout(1500)
                d = pg.evaluate(JS)
                d["page"], d["name"] = slug, name
                d["refs_map"] = MAP.get(r, [])
                d["refs_text"] = match_refs(d["text"])
                d["text"] = d["text"][:20000]
                res[r] = d
        b.close()
finally:
    srv.terminate()
(ROOT / "tools/tool_harvest.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
for r, d in res.items():
    print(f"{r:36s} ctrls={len(d['ctrls']):3d} refs_map={len(d['refs_map']):2d} refs_text={len(d['refs_text']):2d} links={len(d['links']):2d} | {d['h1'][:50]}")
