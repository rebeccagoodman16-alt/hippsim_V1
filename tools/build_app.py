"""Build app/: hippsim as an installable phone/desktop app (Progressive Web App).

app/ is a static folder for any HTTPS host (GitHub Pages via .github/workflows/pages.yml, Netlify, a lab server).
Opened on a phone it installs to the home screen, runs full screen and works offline.

  python tools/build_app.py            # needs Chrome + playwright (records which files each tool loads)

What it does
  1. copies the built simulator (site/) and the Little Neural Guide engine files every tool loads at runtime,
     found by opening every page headlessly and recording its requests;
  2. writes manifest.webmanifest, icons, hs-app-config.js (service worker on) and sw.js, whose precache list is
     exactly those files, versioned by a hash of their contents;
  3. copies the repository files the Library links to (models, morphologies, code), cached when first opened.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]
SITE, GUIDE, APP, T = ROOT / "site", ROOT / "sources/raw/little_neural_guide", ROOT / "app", ROOT / "simtest"
ARTIFACT = "https://claude.ai/artifact/QfyqcKHUe3xzrTHZKFuFDc"
PORT = 8776


def harvest() -> set[str]:
    """Every same-origin file the pages request while each tool renders."""
    from playwright.sync_api import sync_playwright
    for f in list(SITE.glob("*.html")) + list(SITE.glob("hs-*.js")) + [SITE / "hs-sim.css"]:
        shutil.copy(f, T / f.name)
    shutil.copytree(SITE / "icons", T / "icons", dirs_exist_ok=True)
    page = json.loads(re.search(r"HS_PAGE = (\{.*?\});", (SITE / "sim-studio.html").read_text()).group(1))
    urls = ["index.html", "simulator.html", "runs.html", "models.html", "library.html", "about.html", "atlas.html", "docs.html", "validation.html", "file.html"] + \
           [f"sim-{slug}.html#" + ".".join(x for x in r.split("/") if x) for r, _, slug, _ in page["all"]]
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=T, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    got: set[str] = set()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
            for u in urls:
                pg = b.new_page(viewport={"width": 1300, "height": 900})
                pg.on("request", lambda r: got.add(unquote(urlparse(r.url).path.lstrip("/"))) if f":{PORT}/" in r.url else None)
                pg.goto(f"http://localhost:{PORT}/{u}"); pg.wait_for_timeout(3500)
                pg.close()
            b.close()
    finally:
        srv.terminate()
    return {g for g in got if g and (T / g).is_file()}


def main() -> None:
    files = harvest()
    if APP.exists():
        shutil.rmtree(APP)
    APP.mkdir()
    for f in sorted(files):
        src = SITE / f if (SITE / f).exists() else T / f
        (APP / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, APP / f)
    shutil.copytree(SITE / "icons", APP / "icons", dirs_exist_ok=True)
    for f in ["hs-app-config.js", "hs-app.js"]:
        shutil.copy(SITE / f, APP / f)
    if (SITE / "engine_traces.json").exists():            # NEURON / Brian2 baseline traces, fetched on demand by the Neurons viewer
        shutil.copy(SITE / "engine_traces.json", APP / "engine_traces.json")
    if (SITE / "compare").exists():                       # hippsim vs NEURON comparison (tools/compare_engines.py), fetched on demand
        shutil.copytree(SITE / "compare", APP / "compare", dirs_exist_ok=True)

    # the claude.ai main page is a fragment; the app needs a full document
    frag = (SITE / "index.html").read_text()
    (APP / "index.html").write_text('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}</style>'
        + frag.split("<header>")[0].replace('<meta name="claude:viewport-fit-sides" content="cover">', "")
        + "</head><body class=\"hs-hubpage\"><header>" + frag.split("<header>", 1)[1] + "</body></html>")
    ver = re.search(r"^## ([\d.]+) ·", (ROOT / "CHANGELOG.md").read_text(), re.M)
    (ROOT / "site/hs-app-config.js").write_text(f'window.HS_APP = {{sw: false, sharedLog: "", version: "{ver.group(1) if ver else ""}"}};   // claude.ai build: no service worker (the artifact has its own sandbox)\n')
    (APP / "hs-app-config.js").write_text(f'window.HS_APP = {{sw: true, sharedLog: "{ARTIFACT}", version: "{ver.group(1) if ver else ""}"}};\n')

    # MathJax for equations, served from the app so they render offline (Apache-2.0, vendor/mathjax/LICENSE)
    CDN = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js"
    (APP / "vendor/mathjax").mkdir(parents=True, exist_ok=True)
    for f in ("tex-svg.js", "LICENSE"):
        shutil.copy(ROOT / "vendor/mathjax" / f, APP / "vendor/mathjax" / f)
    for f in [*APP.glob("*.js"), *APP.glob("*.html")]:
        t = f.read_text(errors="ignore")
        if CDN in t:
            f.write_text(t.replace(CDN, "vendor/mathjax/tex-svg.js"))
    files = set(files) | {"vendor/mathjax/tex-svg.js"}

    # repository files the Library links to: available, cached on first open (not precached)
    for f in json.loads((SITE / "files.json").read_text()):
        (APP / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT / f, APP / f)

    manifest = {
        "name": "hippsim · lab simulator", "short_name": "hippsim", "id": "./", "start_url": "./index.html", "scope": "./",
        "display": "standalone", "orientation": "any", "background_color": "#fff9f2", "theme_color": "#f8cddd",
        "description": "Simulations of real neurons and circuits with documented baselines, literature perturbations and saved runs.",
        "categories": ["education", "science", "medical"],
        "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
                  {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
        "shortcuts": [{"name": "Simulator", "url": "./simulator.html"}, {"name": "Lab run log", "url": "./runs.html"},
                      {"name": "Lab research models", "url": "./sim-lab-models.html"}]}
    (APP / "manifest.webmanifest").write_text(json.dumps(manifest, indent=1))

    shell = sorted({*files, "index.html", "hs-app-config.js", "hs-app.js", "manifest.webmanifest",
                    *[f"icons/{p.name}" for p in (APP / "icons").iterdir()]})
    h = hashlib.sha256()
    for f in shell:
        h.update(f.encode()); h.update((APP / f).read_bytes())
    version = h.hexdigest()[:10]
    sw = (ROOT / "tools/sw_template.js").read_text().replace("__VERSION__", version).replace("__SHELL__", json.dumps(shell, indent=0))
    (APP / "sw.js").write_text(sw)
    (APP / ".nojekyll").write_text("")          # GitHub Pages: serve files as they are
    size = sum((APP / f).stat().st_size for f in shell) / 1e6
    total = sum(p.stat().st_size for p in APP.rglob("*") if p.is_file()) / 1e6
    print(f"app/: {len(shell)} files precached ({size:.1f} MB, version {version}); {total:.1f} MB in total")


if __name__ == "__main__":
    main()
