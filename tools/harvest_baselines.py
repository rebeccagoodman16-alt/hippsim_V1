"""Record every simulator tool's controls exactly as the page shell sees them (same keys and labels that
saved runs use) -> tools/baseline_harvest.json. Run after build_simulator.py; read by export_baselines.py."""
import json, re, shutil, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
T = ROOT / "simtest"
for f in list((ROOT / "site").glob("*.html")) + list((ROOT / "site").glob("hs-*.js")) + [ROOT / "site/hs-sim.css"]:
    shutil.copy(f, T / f.name)
page = json.loads(re.search(r"HS_PAGE = (\{.*?\});", (ROOT / "site/sim-studio.html").read_text()).group(1))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8773"], cwd=T, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
out = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        for route, name, slug, _ in page["all"]:
            pg = b.new_page(viewport={"width": 1300, "height": 900})
            pg.goto(f"http://localhost:8773/sim-{slug}.html#" + ".".join(x for x in route.split("/") if x))
            pg.wait_for_timeout(3500)
            out[route] = pg.evaluate("window.hsPage && hsPage.route() === %s ? hsPage.controls() : null" % json.dumps(route))
            print(f"{route:40s} {len(out[route] or [])} controls")
            pg.close()
        b.close()
finally:
    srv.terminate()
(ROOT / "tools/baseline_harvest.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
