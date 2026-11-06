"""Neuron atlas (home page): search opens the 3D viewer, hover names the compartment, parts toggle, screenshot,
Simulate runs in place (trace, spikes, voltage on the cell, electrode move), save to Runs and reopen. Web and phone.
    python tools/test_atlas.py [mockclaude.js]   (serves app/)"""
import subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MOCK = Path(sys.argv[1]).read_text() if len(sys.argv) > 1 else None
PORT = 8801
B = f"http://localhost:{PORT}/"
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=ROOT / "app", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
res = []
def check(name, ok, info=""):
    res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  ({info})"))
TUFT = "(()=>{const i=G.part.indexOf('tuft');const d=devicePixelRatio;const R=document.getElementById('cv').getBoundingClientRect();return [R.left+proj.X[i]/d,R.top+proj.Y[i]/d]})()"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        for name, vp in [("web", {"width": 1366, "height": 860}), ("phone", {"width": 390, "height": 844})]:
            ctx = b.new_context(viewport=vp, accept_downloads=True)
            if MOCK: ctx.add_init_script(MOCK)
            pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(B + "index.html"); pg.wait_for_timeout(1200)
            n = pg.locator(".cell").count(); check(f"{name}: home lists every neuron", n >= 87, n)
            check(f"{name}: no guided-step scaffolding", pg.locator("#gbar, #tasks, #sim, .hs-guide").count() == 0)
            pg.fill("#q", "c62563"); pg.keyboard.press("Enter"); pg.wait_for_timeout(1500)
            check(f"{name}: search opens the viewer", pg.is_visible("#viewer") and "c62563" in pg.inner_text("#vsub"))
            xy = pg.evaluate(TUFT); pg.mouse.move(*xy); pg.wait_for_timeout(200)
            if name == "phone": pg.mouse.click(*xy); pg.wait_for_timeout(200)
            check(f"{name}: hover/tap names the compartment", "Apical tuft" in pg.inner_text("#tip"), pg.inner_text("#tip"))
            check(f"{name}: Simulate available straight away", pg.is_enabled("#vsim"))
            pg.click('.part[data-p="basal"]'); check(f"{name}: toggle a compartment", pg.evaluate("on.basal === false"))
            pg.click('.part[data-p="basal"]')
            if MOCK:
                pg.evaluate("window.__saved = []"); pg.click("#vshot"); pg.wait_for_timeout(800)
                fn = pg.evaluate("(window.__saved || []).map(x => x.filename).join()")
            else:
                with pg.expect_download() as d: pg.click("#vshot")
                fn = d.value.suggested_filename
            check(f"{name}: screenshot", fn.endswith(".png"), fn)
            # simulate: choose scale, model and simulator first, then the baseline
            DONE = "() => typeof RB !== 'undefined' && RB && !busy"
            pg.click("#vsim")
            check(f"{name}: Simulate opens the setup in the same view", pg.is_visible("#ssetup") and pg.is_visible("#cv") and not pg.is_visible("#sout") and "index.html" in pg.url)
            check(f"{name}: three scales, models for this cell, 8 tests, simulator choice for HH",
                  pg.locator("#sscale [data-s]").count() == 3 and pg.locator("#smodels [data-m]").count() == 2 and pg.locator("#stests [data-t]").count() == 8 and pg.locator("#ssims [data-sim]").count() == 3,
                  pg.locator("#stests [data-t]").count())
            pg.click("#sgo"); pg.wait_for_function(DONE, timeout=60000)
            txt = pg.inner_text("#sres")
            check(f"{name}: HH baseline gives NEURON's spike count (18 at 0.5 nA)", "18 spikes" in txt, txt)
            check(f"{name}: baseline values and sources shown, setup folded, controls hidden", "Hodgkin" in pg.text_content("#sbase") and not pg.is_visible("#ssetup") and pg.is_visible("#schosen") and not pg.is_visible("#sp-amp"))
            pg.wait_for_timeout(4300)
            check(f"{name}: voltage plays on the cell, with legend", pg.evaluate("vf === R.frames.length - 1 && colorBy === 'volt'") and pg.is_visible("#vleg"))
            check(f"{name}: parts and colour modes stay available", pg.is_visible("#parts") and pg.locator('[data-c="volt"]').count() == 1)
            xy = pg.evaluate(TUFT); pg.mouse.move(*xy); pg.wait_for_timeout(150)
            if name == "phone": pg.mouse.click(*xy); pg.wait_for_timeout(150)
            check(f"{name}: hover shows the voltage there", "mV at" in pg.inner_text("#tip"), pg.inner_text("#tip"))
            # manipulate
            pg.click("#smanip")
            check(f"{name}: Manipulate shows grouped controls, presets and branch tools", pg.is_visible("#sp-amp") and pg.is_visible("#spre") and pg.locator("#sctl details.pg").count() >= 4 and pg.locator("#stools [data-tool]").count() >= 5)
            pg.click('[data-pre="ttx"]'); pg.click("#srun"); pg.wait_for_function("R !== RB && !busy", timeout=30000)
            txt = pg.inner_text("#sres")
            check(f"{name}: TTX abolishes spikes, compared with baseline", "No spikes" in txt and "baseline 18" in txt and "1 change" in pg.inner_text("#snch"), txt)
            pg.click('[data-pre="ttx"]')
            pg.click('#stools [data-tool="electrode"]'); xy = pg.evaluate(TUFT); pg.mouse.click(*xy); pg.wait_for_timeout(200)
            check(f"{name}: electrode moves to a tapped branch", "tuft" in pg.inner_text("#smarks").lower() and pg.evaluate("marks.some(m => m.kind === 'electrode')"), pg.inner_text("#smarks"))
            pg.evaluate("document.getElementById('sp-amp').value = 1; document.getElementById('sp-amp').dispatchEvent(new Event('input'))")
            pg.click("#srun"); pg.wait_for_function("R !== RB && !busy && R.series.some(s => s.role === 'site')", timeout=30000)
            check(f"{name}: dendritic run records both sites", pg.evaluate("(() => { const s = R.series.find(x => x.role === 'site'); return s.v.some((v, k) => Math.abs(v - R.vSoma[k]) > 1); })()"))
            if MOCK:
                pg.click("#ssave"); pg.wait_for_function("/Saved|Not/.test(document.getElementById('ssave').textContent)", timeout=10000)
                check(f"{name}: Save run stores it online", "Saved" in pg.inner_text("#ssave"), pg.get_attribute("#ssave", "title"))
            if name == "web":
                # other models, other scales, other simulators: same panel, same cell
                for scale, mk, tst, want in [("cell", "migliore", "step", "spike"), ("cell", "migliore", "bap", "at the soma"), ("cell", "migliore", "sag", "MΩ"), ("cell", "hh", "fi", "nA"),
                                             ("circuit", "circuit", "circuit", "spike"), ("population", "population", "network", "Mean rate")]:
                    pg.click("#schange"); pg.click(f'[data-s="{scale}"]'); pg.click(f'[data-m="{mk}"]'); pg.click(f'[data-t="{tst}"]'); pg.click("#sgo"); pg.wait_for_function(DONE, timeout=120000)
                    txt = pg.inner_text("#sres")
                    check(f"{name}: {mk} · {tst} runs on this cell in the panel", want in txt and pg.is_visible("#cv") and pg.evaluate("C.id") == "ca3-c62563" and pg.locator("#sread tr").count() >= 1, txt)
                # manipulate with a preset + a branch tool, compare with baseline (Migliore, sag)
                pg.click("#schange"); pg.click('[data-s="cell"]'); pg.click('[data-m="migliore"]'); pg.click('[data-t="sag"]'); pg.click("#sgo"); pg.wait_for_function(DONE, timeout=60000)
                pg.click("#smanip"); pg.click('[data-pre="zd"]'); pg.click('#stools [data-tool="cut"]'); xy = pg.evaluate(TUFT); pg.mouse.click(*xy); pg.wait_for_timeout(200)
                pg.click("#srun"); pg.wait_for_function("R !== RB && !busy", timeout=60000)
                check(f"{name}: ZD7288 + cut branch: sag gone, readout compared with baseline", "sag ratio 0 " in pg.inner_text("#sres") + " " and pg.locator("#sread td.b").count() >= 3 and pg.evaluate("R.nodeOf.some(x => x < 0)"), pg.inner_text("#sres"))
                pg.click("#schange"); pg.click('[data-s="cell"]'); pg.click('[data-m="hh"]'); pg.click('[data-t="step"]'); pg.click('[data-sim="NEURON"]'); pg.click("#sgo"); pg.wait_for_function(DONE + " && X", timeout=60000)
                txt = pg.inner_text("#sres")
                check(f"{name}: NEURON baseline shown next to hippsim's", txt.startswith("NEURON:") and "hippsim: 18" in txt, txt)
            if MOCK:
                pg.goto(B + "runs.html"); pg.wait_for_timeout(1500)
                check(f"{name}: run appears in Runs", "c62563" in pg.inner_text("#rows"))
                pg.locator("#rows tr", has_text="2 change").first.locator("[data-i]").click()
                pg.wait_for_function("typeof R !== 'undefined' && R && R !== RB && !busy", timeout=60000)
                check(f"{name}: Open from Runs restores cell, model, current and electrode",
                      pg.evaluate("C.id") == "ca3-c62563" and pg.evaluate("cfg.model") == "hh" and pg.input_value("#sp-amp") == "1" and pg.evaluate("marks.some(m => m.kind === 'electrode')"))
            pg.goto(B + "atlas.html#ca3-c62563"); pg.wait_for_timeout(1500)
            check(f"{name}: old atlas address redirects home", "index.html#ca3-c62563" in pg.url and pg.is_visible("#viewer"), pg.url)
            check(f"{name}: no page errors", not errs, errs[:2])
            ctx.close()
        # documentation is part of the app
        pg = b.new_page(viewport={"width": 1366, "height": 860}); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(B + "docs.html"); pg.wait_for_timeout(1500)
        check("docs: every page in the sidebar, menu links to Docs", pg.locator(".dx nav a").count() >= 14 and pg.locator('header a[href="docs.html"]').count() >= 1)
        pg.goto(B + "docs.html#models"); pg.wait_for_timeout(800)
        check("docs: Models page generated from the panel's models", pg.locator("#doc-models h2[id^=model-]:not(#model-tests):not(#model-tools)").count() == len(__import__("re").findall(r"scale: '(?:cell|circuit|population)'", (ROOT / "site/hs-models.js").read_text())))
        pg.goto(B + "docs.html#equations"); pg.wait_for_timeout(2500)
        check("docs: equations render (offline MathJax)", pg.locator("#doc-equations mjx-container").count() >= 3, pg.locator("#doc-equations mjx-container").count())
        pg.fill("#dq", "Brunel"); check("docs: search narrows the pages", 0 < pg.locator(".dx nav a:not(.dim)").count() < 14)
        check("docs: no page errors", not errs, errs[:2])
        b.close()
finally:
    srv.terminate()
print(f"{sum(res)}/{len(res)} atlas checks passed")
sys.exit(0 if all(res) else 1)
