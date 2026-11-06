"""End-to-end flows with a mock of the claude.ai runtime (cloud saving, folders, delete, display, Web/Phone switch).

    python tools/test_flows.py path/to/mockclaude.js
"""
import json, re, shutil, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
T = ROOT / "simtest"
for f in list((ROOT / "site").glob("*.html")) + list((ROOT / "site").glob("hs-*.js")) + [ROOT / "site/hs-sim.css"]:
    shutil.copy(f, T / f.name)
MOCK = Path(sys.argv[1]).read_text()
PORT = 8785
B = f"http://localhost:{PORT}/"
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=T, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
res, errs = [], []


def check(name, ok, info=""):
    res.append((name, bool(ok), info)); print(("PASS " if ok else "FAIL ") + name + (f"  ({info})" if info and not ok else ""))


def save_run(pg, label, folder=None, new_folder=None):
    pg.click("#hs-save"); pg.fill("#hs-rd-label", label)
    if new_folder:
        pg.select_option("#hs-rd-folder", label="New folder…"); pg.fill("#hs-rd-newname", new_folder)
    else:
        pg.select_option("#hs-rd-folder", label=folder or "No folder")
    pg.click("#hs-rd-zip"); pg.wait_for_timeout(1500)


try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = b.new_context(viewport={"width": 1300, "height": 900}, accept_downloads=True)
        ctx.add_init_script("try{const d=JSON.parse(localStorage.getItem('hs-display')||'{}'); if(!d.guide){d.guide='off'; localStorage.setItem('hs-display', JSON.stringify(d));}}catch(e){}")
        ctx.add_init_script(MOCK)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        dl = []; pg.on("download", lambda d: dl.append(d.suggested_filename))

        # 1. save two runs to the cloud, one into a new folder
        pg.goto(B + "sim-ca1-neuron.html#biology.ca1-bursting"); pg.wait_for_timeout(3000)
        pg.click("#hs-pert-btn"); pg.click('[data-p="0"]'); pg.wait_for_timeout(600)
        want = pg.evaluate("hsPage.controls().filter(c => !c.mirror).map(c => [c.key, c.value])")
        save_run(pg, "Test A", new_folder="Project X")
        save_run(pg, "Test B")
        check("save does not download a file", not dl, str(dl))
        entries = pg.evaluate("hsRun.mine().then(m => m.read()).then(v => v.entries)")
        check("two runs stored in the cloud", len(entries) == 2, str(entries)[:200])
        check("first run is in the new folder", any(e.get("folder") == "Project X" for e in entries), str(entries)[:200])

        # 2. Runs page: folders, move, rename, open, delete
        pg.goto(B + "runs.html"); pg.wait_for_timeout(1500)
        rows = pg.locator("#rows tr").count()
        check("Runs page lists both runs", rows >= 2, f"{rows} rows")
        pg.click('#folders [data-f="Project X"]'); pg.wait_for_timeout(300)
        check("folder filter shows one run", pg.locator("#rows tr").count() == 1, f'{pg.locator("#rows tr").count()}')
        pg.click('#factions [data-fa="rename"]'); pg.fill("#pop input", "Project Y"); pg.click("#pop .primary"); pg.wait_for_timeout(800)
        check("rename folder", pg.locator('#folders [data-f="Project Y"]').count() == 1)
        pg.click('#folders [data-f="*"]')
        pg.wait_for_timeout(300)
        pg.locator("#rows [data-m]").first.click(); pg.wait_for_timeout(200)
        check("run menu opens", pg.is_visible("#pop .hs-pmenu"))
        pg.evaluate("window.__saved = []"); pg.click("#pop [data-dl]"); pg.wait_for_timeout(1500)
        sv = pg.evaluate("(window.__saved || []).map(x => x.filename)")
        check("download a stored run (.zip)", sv and sv[0].endswith(".zip"), str(sv))
        pg.wait_for_timeout(300)
        # open run B and check the values come back
        pg.locator("#rows tr", has_text="Test A").locator("[data-i]").click(); pg.wait_for_timeout(4500)
        got = pg.evaluate("hsPage.controls().filter(c => !c.mirror).map(c => [c.key, c.value])")
        check("Open restores every value", got == want, f"{sum(1 for a, b2 in zip(got, want) if a != b2)} differ")
        pg.goto(B + "runs.html"); pg.wait_for_timeout(1500)
        n0 = pg.locator("#rows tr").count()
        pg.locator("#rows tr", has_text="Test B").locator("[data-m]").click(); pg.click("#pop [data-del]"); pg.click("#pop [data-y]"); pg.wait_for_timeout(1000)
        check("delete run", pg.locator("#rows tr").count() == n0 - 1, f'{n0} -> {pg.locator("#rows tr").count()}')
        pg.click('#folders [data-f="Project Y"]'); pg.click('#factions [data-fa="delete"]'); pg.click("#pop [data-y]"); pg.wait_for_timeout(1000)
        check("delete folder keeps its runs", pg.locator('#folders [data-f="Project Y"]').count() == 0 and "Test A" in pg.inner_text("#rows"))
        left = pg.evaluate("hsRun.mine().then(m => m.read()).then(v => v.entries)")
        items = pg.evaluate("Object.keys(localStorage).filter(k => /items/.test(k) && localStorage.getItem(k).includes('Test B')).length")
        check("deleted run is gone from storage (entry, data, figures)", all(e["label"] != "Test B" for e in left) and items == 0, f"{len(left)} entries, {items} items")

        # 3. Display settings persist across pages
        pg.goto(B + "simulator.html"); pg.wait_for_timeout(800)
        pg.click("[data-hs-display]"); pg.click('[data-k="theme"][data-v="dark"]'); pg.click('[data-k="size"][data-v="l"]'); pg.keyboard.press("Escape")
        pg.goto(B + "sim-studio.html"); pg.wait_for_timeout(1500)
        check("display settings carry to tool pages", pg.evaluate("document.documentElement.dataset.hsTheme === 'dark' && document.documentElement.dataset.hsSize === 'l'"))
        pg.evaluate("localStorage.setItem('hs-display', '{}')")

        # 4. Web / Phone switch, both directions, keeps the page
        pg.goto(B + "sim-ca1-neuron.html#biology.axo-axonic"); pg.wait_for_timeout(2000)
        pg.click("[data-hs-display]"); pg.click('[data-k="layout"][data-v="phone"]'); pg.wait_for_timeout(3500)
        f = pg.frame_locator("#hs-devframe")
        check("Phone view frames the same tool", pg.locator("#hs-devframe").count() == 1 and "axo-axonic" in (pg.locator("#hs-devframe").get_attribute("src") or ""))
        check("Phone frame is 390 px wide", abs(pg.evaluate("document.getElementById('hs-devframe').clientWidth") - 390) < 2)
        pg.click('#hs-devbar [data-m="web"]'); pg.wait_for_timeout(3000)
        check("back to Web view", pg.locator("#hs-devframe").count() == 0 and "axo-axonic" in pg.url, pg.url)

        # 5. tab links have real addresses (open in new tab works)
        hrefs = pg.evaluate("[...document.querySelectorAll('.hs-tabs a')].map(a => a.getAttribute('href'))")
        check("tab links are real addresses", hrefs and all(h.startswith("#") for h in hrefs), str(hrefs[:2]))
        pg2 = ctx.new_page(); pg2.goto(B + "sim-ca1-neuron.html" + hrefs[-1]); pg2.wait_for_timeout(2500)
        check("a tab opened in a new tab shows that tool", pg2.evaluate("ngPath()") == "/biology/ca1-bursting/", pg2.evaluate("ngPath()"))
        check("no page errors", not errs, "; ".join(errs[:2]))
        b.close()
finally:
    srv.terminate()
n = sum(ok for _, ok, _ in res)
print(f"{n}/{len(res)} flow checks passed")
r = ROOT / "tools/site_test_results.json"
d = json.loads(r.read_text()) if r.exists() else {}
import datetime
d["flows"] = {"date": datetime.date.today().isoformat(), "passed": n, "total": len(res), "fails": [f"{a}: {c}" for a, ok, c in res if not ok]}
r.write_text(json.dumps(d, indent=1))
sys.exit(0 if n == len(res) else 1)
