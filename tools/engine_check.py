"""Baseline of every neuron in three engines: hippsim's browser engine (site/hs-cable.js, run in Node), NEURON and
Brian2, using the same scripts the atlas hands out (tools/script_templates). Writes tools/engine_baselines.json,
which the atlas shows under Simulate → Run it in.

    python tools/engine_check.py [--only id,id] [--skip-brian2]
Baseline: 0.5 nA, 300 ms step at the soma; spikes counted from 50 to 350 ms (soma crossing 0 mV)."""
import json, os, re, shutil, subprocess, sys, tempfile, time
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/engine_baselines.json"
TRACES = ROOT / "site/engine_traces.json"      # soma V every 0.5 ms per cell and engine (fetched by the atlas on demand)
TPL = {k: (ROOT / f"tools/script_templates/{k}_single.py").read_text() for k in ("neuron", "brian2")}
JS = """require(process.argv[1]); const fs = require('fs');
const P = [], idx = {};
fs.readFileSync(process.argv[2], 'utf8').split('\\n').forEach(l => { if (!l.trim() || l[0] === '#') return; const a = l.trim().split(/\\s+/).map(Number); if (a.length < 7) return; idx[a[0]] = P.length; P.push([a[2], a[3], a[4], a[5], a[1], a[6]]); });
P.forEach(p => p[5] = p[5] in idx ? idx[p[5]] : -1);
const R = HSCable.build(P).run({amp: 0.5}), sp = R.spikes.filter(t => t >= 50 && t < 350);
console.log(`RESULT engine=JS spikes=${sp.length} first_ms=${sp.length ? sp[0] - 50 : 'none'}`);"""


def fill(tpl, c, swc):
    return (tpl.replace("{SWC_FILE}", swc).replace("{NAME}", c["name"].replace('"', "'")).replace("{ID}", c["id"])
            .replace("{AMP_NA}", "0.5").replace("{NA_SCALE}", "1").replace("{K_SCALE}", "1").replace("{DEND_FRAC}", "0.02")
            .replace("{SITE_XYZ}", "None").replace("{SITE_LABEL}", "soma"))


def parse(out):
    m = re.search(r"RESULT engine=\S+ spikes=(\d+) first_ms=(\S+)", out)
    return {"spikes": int(m.group(1)), "first_ms": None if m.group(2) == "none" else round(float(m.group(2)), 2)} if m else None


def main():
    cat = yaml.safe_load((ROOT / "morphologies/catalog.yaml").read_text())["cells"]
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    res = json.loads(OUT.read_text()) if OUT.exists() else {}
    env = dict(os.environ, MPLBACKEND="Agg", HIPPSIM_TRACE="1")
    traces = json.loads(TRACES.read_text()) if TRACES.exists() else {}
    for cid, v in cat.items():
        if only and cid not in only: continue
        c = {"id": cid, "name": v.get("name", cid)}
        swc = ROOT / "morphologies" / v["file"]
        r = res.setdefault(cid, {})
        with tempfile.TemporaryDirectory() as d:
            shutil.copy(swc, Path(d) / swc.name)
            jobs = [("js", ["node", "-e", JS, str(ROOT / "site/hs-cable.js"), str(swc)])]
            for k in ("neuron", "brian2"):
                if k == "brian2" and "--skip-brian2" in sys.argv: continue
                (Path(d) / f"run_{k}.py").write_text(fill(TPL[k], c, swc.name)); jobs.append((k, [sys.executable, f"run_{k}.py"]))
            for k, cmd in jobs:
                t0 = time.time()
                try:
                    p = subprocess.run(cmd, cwd=d, env=env, capture_output=True, text=True, timeout=1200)
                    got = parse(p.stdout)
                    tm = re.search(r"^TRACE (\[.*\])$", p.stdout, re.M)
                    if tm and k != "js": traces.setdefault(cid, {})[k] = json.loads(tm.group(1))
                    r[k] = got | {"s": round(time.time() - t0, 1)} if got else {"error": (p.stderr or p.stdout)[-300:]}
                except subprocess.TimeoutExpired:
                    r[k] = {"error": "timeout (20 min)"}
        print(cid, {k: x.get("spikes", x.get("error", "")[-80:]) for k, x in r.items() if isinstance(x, dict)}, flush=True)
        r["date"] = time.strftime("%Y-%m-%d")
        OUT.write_text(json.dumps(res, indent=1))
        TRACES.write_text(json.dumps(traces, separators=(",", ":")))


if __name__ == "__main__":
    main()
