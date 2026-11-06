"""Browser regression test for the built simulator (headless Chrome).

Checks, on every tool: page renders without errors, the panel records a baseline, every literature preset
changes at least one control and Reset returns to baseline, and Save run -> Load run restores the values.
    python tools/test_site.py            # all checks
    python tools/test_site.py presets    # presets only
"""
import json, os, re, shutil, subprocess, sys, tempfile, time, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
T = ROOT / "simtest"
for f in list((ROOT / "site").glob("*.html")) + list((ROOT / "site").glob("hs-*.js")) + [ROOT / "site/hs-sim.css"]:
    shutil.copy(f, T / f.name)
page = json.loads(re.search(r"HS_PAGE = (\{.*?\});", (ROOT / "site/sim-studio.html").read_text()).group(1))
cards = json.loads(subprocess.run(["node", "-e", "global.window={};" + (ROOT / "site/hs-cards.js").read_text() + ";process.stdout.write(JSON.stringify(window.HS_CARDS.cards))"],
                                  capture_output=True, text=True, check=True).stdout)
only = sys.argv[1] if len(sys.argv) > 1 else "all"
PORT = 8774
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=T, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
fails, n = [], 0
url = lambda slug, route: f"http://localhost:{PORT}/sim-{slug}.html#" + ".".join(x for x in route.split("/") if x)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = b.new_context(accept_downloads=True, viewport={"width": 1300, "height": 900})
        ctx.add_init_script("try{const d=JSON.parse(localStorage.getItem('hs-display')||'{}'); if(!d.guide){d.guide='off'; localStorage.setItem('hs-display', JSON.stringify(d));}}catch(e){}")
        for route, name, slug, _ in page["all"]:
            presets = cards.get(route, {}).get("presets", [])
            for i in range(len(presets) if only in ("all", "presets") else 0):
                pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
                pg.goto(url(slug, route)); pg.wait_for_timeout(2600)
                pg.click("#hs-pert-btn"); pg.click(f'[data-p="{i}"]'); pg.wait_for_timeout(700)
                d = pg.inner_text("#hs-delta"); pg.click("#hs-reset"); pg.wait_for_timeout(500); r = pg.inner_text("#hs-delta")
                n += 1
                if "change" not in d or r != "At baseline" or errs:
                    fails.append(f"preset {route} {presets[i]['name']}: {d} / reset {r} {errs[:1]}")
                pg.close()
            if only not in ("all", "runs"):
                continue
            pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(url(slug, route)); pg.wait_for_timeout(3000)
            ctl = pg.evaluate("hsPage.controls().filter(c => !c.mirror && (c.type === 'range' || c.type === 'number') && c.max !== '' && c.min !== '' && !/time|replay|speed|zoom|rotat/i.test(c.label) && !document.querySelector(c.key.startsWith('#') ? c.key : 'x-none')?.disabled)")
            n += 1
            if not ctl:
                if errs: fails.append(f"render {route}: {errs[:1]}")
                pg.close(); continue
            c = ctl[0]; lo, hi = float(c["min"]), float(c["max"])
            target = lo + (hi - lo) * 0.25 if abs(float(c["value"]) - (lo + (hi - lo) * 0.25)) > 1e-9 else lo + (hi - lo) * 0.75
            sel = f'[data-hs-label="{c["label"]}"]' if not c["key"].startswith("#") else c["key"]
            pg.evaluate("([k, v]) => hsPage.applyValues([[k, null, v]], [])", [c["key"], str(target)]); pg.wait_for_timeout(600)
            want = pg.evaluate("k => (hsPage.controls().find(x => x.key === k) || {}).value", c["key"])
            pg.click("#hs-save")
            with pg.expect_download() as dl: pg.click("#hs-rd-zip")
            path = Path(tempfile.mkdtemp()) / dl.value.suggested_filename; dl.value.save_as(path)
            with zipfile.ZipFile(path) as z:
                names = z.namelist(); run = json.loads(z.read(next(x for x in names if x.endswith("run.json"))))
            pg.close()
            pg = ctx.new_page(); pg.goto(f"http://localhost:{PORT}/runs.html"); pg.wait_for_timeout(800)   # Runs → Open a saved run
            with pg.expect_file_chooser() as fc: pg.click("#open")
            fc.value.set_files(str(path)); pg.wait_for_timeout(4500)
            got = pg.evaluate("([k, l]) => (hsPage.controls().find(x => x.key === k && x.label === l) || hsPage.controls().find(x => x.label === l) || {}).value", [c["key"], c["label"]])
            ok = got == want and run["n_changed"] >= 1 and any(x.endswith("ro-crate-metadata.json") for x in names)
            if not ok or errs:
                fails.append(f"run {route}: set {c['label']}={want}, loaded {got}, n_changed {run['n_changed']} {errs[:1]}")
            pg.close()
        b.close()
finally:
    srv.terminate()
print(f"{n - len(fails)}/{n} checks passed")
import datetime
res_path = ROOT / "tools/site_test_results.json"
res = json.loads(res_path.read_text()) if res_path.exists() else {}
res[only] = {"date": datetime.date.today().isoformat(), "passed": n - len(fails), "total": n, "fails": fails}
res_path.write_text(json.dumps(res, indent=1))
for f in fails:
    print("  FAIL", f)
sys.exit(1 if fails else 0)
