"""Crawl every page and every tool tab of the built app in headless Chrome (web + phone widths).

Reports page errors, console errors, failed requests (4xx/5xx), broken internal links, horizontal overflow on phone
and empty tool panels.  python tools/audit_site.py  →  tools/audit_results.json
"""
import json, re, subprocess, sys, time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
PORT = 8781
BASE = f"http://localhost:{PORT}/"
MOCK = Path(sys.argv[1]).read_text() if len(sys.argv) > 1 else ""      # optional window.claude mock for cloud features

page_cfg = json.loads(re.search(r"HS_PAGE = (\{.*?\});", (ROOT / "site/sim-studio.html").read_text()).group(1))
TOOLS = [(slug, route) for route, _, slug, _ in page_cfg["all"]]
PAGES = ["index.html", "simulator.html", "runs.html", "models.html", "library.html", "about.html", "atlas.html", "docs.html"]
VIEWS = {"web": {"width": 1300, "height": 900}, "phone": {"width": 390, "height": 844}}

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
issues, links = [], {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        for view, vp in VIEWS.items():
            ctx = b.new_context(viewport=vp, is_mobile=view == "phone", has_touch=view == "phone")
            if MOCK: ctx.add_init_script(MOCK)
            targets = [(u, u) for u in PAGES] + [(f"sim-{s}.html#" + ".".join(x for x in r.split("/") if x), f"{s}:{r}") for s, r in TOOLS]
            for u, name in targets:
                pg = ctx.new_page(); errs = []
                pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)[:200]))
                pg.on("console", lambda m: m.type == "error" and errs.append("console: " + m.text[:200]))
                pg.on("response", lambda r: r.status >= 400 and r.url.startswith(BASE) and errs.append(f"HTTP {r.status}: {r.url[len(BASE):]}"))
                pg.goto(BASE + u); pg.wait_for_timeout(2500 if u.startswith("sim-") else 1200)
                info = pg.evaluate("""() => ({
                    over: document.documentElement.scrollWidth - innerWidth,
                    wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('.hs-tbl,pre,table,canvas,svg,[style*=overflow]') }).slice(0, 3).map(e => e.tagName + (e.id ? '#' + e.id : '') + '.' + [...e.classList].join('.')),
                    links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
                    lesson: (document.querySelector('#lesson') || {}).innerText ? document.querySelector('#lesson').innerText.trim().length : -1,
                    loading: !!document.querySelector('.hs-loading')
                })""")
                for l in info["links"]:
                    if l and not l.startswith(("http", "mailto:", "#", "javascript:", "data:", "blob:")): links.setdefault(urljoin(BASE + u, l.split("#")[0]), f"{view} {name}")
                if view == "phone" and info["over"] > 2: errs.append(f"horizontal overflow {info['over']}px {info['wide']}")
                if u.startswith("sim-") and (info["lesson"] < 200 or info["loading"]): errs.append(f"tool did not render (text {info['lesson']}, loading {info['loading']})")
                for e in dict.fromkeys(errs): issues.append({"view": view, "page": name, "issue": e})
                pg.close()
            ctx.close()
        b.close()
    import urllib.request
    for l in sorted(links):
        if urlparse(l).netloc != f"localhost:{PORT}": continue
        try: urllib.request.urlopen(l, timeout=5)
        except Exception as e: issues.append({"view": "-", "page": "link on " + links[l], "issue": f"broken link {l[len(BASE):]}: {e}"})
finally:
    srv.terminate()
(ROOT / "tools/audit_results.json").write_text(json.dumps(issues, indent=1))
print(f"{len(issues)} issues")
for i in issues: print(f"  [{i['view']}] {i['page']}: {i['issue']}")
