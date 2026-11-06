"""Google-account mode (hs-backend-firebase.js) against a Firebase test double: sign in, save a run, list, open, delete.

    python tools/test_accounts.py
"""
import shutil, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
T = ROOT / "simtest"
for f in list((ROOT / "site").glob("*.html")) + list((ROOT / "site").glob("hs-*.js")) + [ROOT / "site/hs-sim.css"]:
    shutil.copy(f, T / f.name)
FAKE = (ROOT / "tools/testdata/fake_firebase.js").read_text()
CONFIG = 'window.HS_APP = {sw: false, version: "test", backend: "firebase", firebase: {apiKey: "x", projectId: "x"}, allowedDomains: ["example.edu"]};'
PORT = 8797
B = f"http://localhost:{PORT}/"
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=T, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
res = []
def check(name, ok, info=""):
    res.append(ok); print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  ({info})"))
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = b.new_context(viewport={"width": 1300, "height": 900})
        ctx.add_init_script("localStorage.setItem('hs-display', JSON.stringify({guide: 'off'}))")
        ctx.route("**/hs-app-config.js", lambda r: r.fulfill(body=CONFIG, content_type="text/javascript"))
        ctx.route("https://cdn.jsdelivr.net/npm/firebase@*/firebase-*-compat.js", lambda r: r.fulfill(body="", content_type="text/javascript"))
        ctx.route("https://cdn.jsdelivr.net/npm/firebase@*/firebase-app-compat.js", lambda r: r.fulfill(body=FAKE, content_type="text/javascript"))   # last added wins
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(B + "simulator.html"); pg.wait_for_timeout(1500)
        check("signed-out header offers Google sign-in", "Sign in with Google" in pg.inner_text(".hs-acct"), pg.inner_text("body")[:100])
        pg.click(".hs-acct"); pg.wait_for_timeout(500)
        check("sign in shows the account", "Rebecca" in pg.inner_text(".hs-acct"), pg.inner_text(".hs-acct"))
        pg.goto(B + "sim-ca1-neuron.html#biology.ca1-bursting"); pg.wait_for_timeout(3000)
        pg.click("#hs-pert-btn"); pg.click('[data-p="0"]'); pg.wait_for_timeout(500)
        pg.click("#hs-save"); pg.fill("#hs-rd-label", "Account test"); pg.click("#hs-rd-zip"); pg.wait_for_timeout(1500)
        n = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('fakefs:runs/g_123/items/')).length")
        check("run stored under the Google account", n >= 2, n)
        pg.goto(B + "runs.html"); pg.wait_for_timeout(2500)
        check("Runs lists it with the person's name", "Account test" in pg.inner_text("#rows") and "You" in pg.inner_text("#rows"), pg.inner_text("#rows")[:200])
        pg.locator("#rows tr", has_text="Account test").locator("[data-m]").click(); pg.click("#pop [data-del]"); pg.click("#pop [data-y]"); pg.wait_for_timeout(800)
        left = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('fakefs:runs/g_123/items/')).length")
        check("delete removes the stored run", left == 0, left)
        pg.click(".hs-acct"); pg.wait_for_timeout(400)
        check("sign out", "Sign in with Google" in pg.inner_text(".hs-acct"))
        check("no page errors", not errs, errs[:2])
        b.close()
finally:
    srv.terminate()
print(f"{sum(res)}/{len(res)} account checks passed")
sys.exit(0 if all(res) else 1)
