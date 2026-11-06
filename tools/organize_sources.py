"""Organize the raw artifact snapshots in sources/raw/ into sources/extracted/ + MANIFEST.csv.

Nothing in sources/raw/ is modified. Every raw file gets one MANIFEST row:
  status = extracted   → content moved into sources/extracted/<dest>
           reference   → kept in raw/ only (results/figures/notes worth consulting)
           excluded    → teaching UI, lesson prose, site plumbing (kept in raw/ for the record)

Run from repo root:  python tools/organize_sources.py
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW, OUT = ROOT / "sources/raw", ROOT / "sources/extracted"

ARTIFACTS = {  # folder → (title, claude.ai url, version pulled 2026-11-02)
    "little_neural_guide": ("Little Neural Guide", "https://claude.ai/code/artifact/7ae0a3a2-ada9-498e-ac86-153e3433b4b9", "1793081032-c073"),
    "ca1_morphology_lab": ("CA1 Morphology Lab", "https://claude.ai/code/artifact/8ae0cb34-efe9-4e10-9feb-80f1580086ea", "1793594558-2a1e"),
    "ca1_resonance_home": ("CA1 Resonance · Home", "https://claude.ai/code/artifact/13a674b8-2706-4f01-89ec-f4dae206ae49", "1793596784-7133"),
    "ca1_resonance_lab": ("CA1 Resonance Lab", "https://claude.ai/code/artifact/407619f1-d86a-4bef-9144-b2a8f125e5b6", "1792189231-90d2"),
    "neurodynamics_lab": ("Neurodynamics Lab", "https://claude.ai/code/artifact/ac1a37e5-6a98-4a14-875c-6bf5a1c0990f", "1792203635-28d6"),
    "neuron_morphology_atlas": ("Neuron Morphology Atlas", "https://claude.ai/code/artifact/1c0c34ac-9aaf-44c4-ae5f-d62dfb9bbb50", "1793080833-c130"),
    "giant_fiber_axon_inputs": ("Giant Fiber Axon Inputs", "https://claude.ai/code/artifact/2bca807c-7a1d-4333-a822-2693339031d9", "1788118776-6dfe"),
    "ca1_graphical_abstract": ("CA1 Graphical Abstract", "https://claude.ai/code/artifact/a0fb3661-9b3f-4acf-90fa-224ab13ef18b", "1792178230-f70d"),
}

rows: list[dict] = []


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def record(src: Path, status: str, category: str, dest: str = "", note: str = "") -> None:
    art = src.relative_to(RAW).parts[0]
    rows.append({"artifact": ARTIFACTS[art][0], "file": str(src.relative_to(RAW)), "bytes": src.stat().st_size,
                 "sha256": sha(src), "status": status, "category": category, "destination": dest, "note": note})


def write(rel: str, text: str) -> str:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    return rel


def js_value(text: str, marker: str):
    """Parse the JSON literal after `marker` (e.g. 'const GF_DATA='). Returns None if not JSON."""
    i = text.find(marker)
    if i < 0:
        return None
    try:
        return json.JSONDecoder().raw_decode(text[i + len(marker):].lstrip())[0]
    except json.JSONDecodeError:
        return None


def header(text: str) -> str:
    m = re.match(r"\s*/\*(.*?)\*/", text, re.S)
    return " ".join(m.group(1).split())[:300] if m else ""


# ------------------------------------------------------------------ Python
def python_sources() -> None:
    d = RAW / "little_neural_guide/code"
    pkg_files = {"ir_ladder_" + k: k for k in
                 ["params", "models", "fast", "run", "analysis", "reduce", "linearize", "fit", "network"]}
    for f in sorted(d.glob("*.txt")):
        stem = f.name.removesuffix(".py.txt").removesuffix(".md.txt")
        if stem in pkg_files:
            dest = f"python/ir_ladder/ir_ladder/{pkg_files[stem]}.py"
        elif stem.startswith("scripts_"):
            dest = f"python/ir_ladder/scripts/{stem.removeprefix('scripts_')}.py"
        elif stem == "validate":
            dest = "python/ir_ladder/validate.py"
        else:
            dest = "python/ir_ladder/README.md"
        write(dest, f.read_text())
        record(f, "extracted", "model-code/python", dest, "Ceballos et al. 2025 reproduction toolkit (Rebecca)")
    write("python/ir_ladder/ir_ladder/__init__.py", '"""ir_ladder: Ceballos, Chadly, Lowet & Pena (2025) reproduction toolkit."""\n')


# ------------------------------------------------------- Guide data blobs
DATA = {  # file → (marker, dest, category, note)
    "morph.js": ("CA1_MORPH=", "data/morphologies/guide_ca1_migliore2018.json", "morphology", "4 CA1 cells, Migliore 2018, ModelDB 244688, with layer bounds"),
    "morph2.js": ("HIPPO_MORPH=", "data/morphologies/guide_hippocampal_modeldb.json", "morphology", "15 hippocampal cells from ModelDB packages"),
    "atlasdata.js": ("NM_MORPH=", "data/morphologies/guide_neuromorpho_atlas.json", "morphology", "NeuroMorpho/Allen/MouseLight/SEU atlas cells (thinned ≥4 µm)"),
    "gfdata.js": ("GF_DATA=", "data/connectomes/giant_fiber_manc_synapses.json", "connectome", "Drosophila GF (DNp01, MANC v1.2.1) synapses, Rebecca's gf_axo-axonic pipeline"),
    "celegans.js": ("CE_NET=", "data/connectomes/celegans_cook2019.json", "connectome", "C. elegans chemical + electrical (Cook 2019), OpenWorm classes, Varshney layout"),
    "bapdata.js": ("BAP_DATA=", "data/results/bap_neuron_migliore2005.json", "simulation-results", "NEURON bAP results on real CA1 cells (Migliore 2005 channels)"),
    "verify.js": ("NRN_CHECK=", "data/results/neuron_passive_check_atlas.json", "simulation-results", "NEURON passive cross-check of every atlas cell (attenuation, transfer Z)"),
    "ccfdata.js": ("CCF_DATA=", "data/atlas/allen_ccf_v3_meshes_mouselight.json", "atlas", "Allen CCFv3 meshes + MouseLight whole-brain neurons"),
    "refs-data.js": ("window.NG_REFS =", "references/bibliography.json", "references", "Verified bibliography (Crossref/PubMed, 2026-10-25)"),
}


def guide_data() -> set[str]:
    done = set()
    g = RAW / "little_neural_guide"
    for fname, (marker, dest, cat, note) in DATA.items():
        f = g / fname
        text = f.read_text()
        val = js_value(text, marker)
        if fname == "atlasdata.js":
            val = {"NM_MORPH": val, "NM_ATLAS": js_value(text, "NM_ATLAS=")}
        if val is None:
            dest = dest.replace(".json", ".js")
            write(dest, text)
            note += " (JS literal, not strict JSON: copied verbatim)"
        else:
            write(dest, json.dumps({"_source": header(text), "data": val}, separators=(",", ":")))
        record(f, "extracted", cat, dest, note)
        done.add(fname)
    t = (g / "nbindex.js").read_text()
    nb = {"repo": re.search(r'repo: "([^"]+)"', t).group(1), "map": js_value(t, "map: "), "extras": js_value(t, "extras: ")}
    if nb["map"]:
        write("references/notebook_index.json", json.dumps(nb, indent=1))
        record(g / "nbindex.js", "extracted", "references", "references/notebook_index.json",
               "Map of Guide page → Colab notebook in rebeccagoodman16-alt/neural-guide-notebooks")
        done.add("nbindex.js")
    return done


# ------------------------------------------------------- Guide JS engines
MODELLAB_SECTIONS = [  # (header text fragment, dest, category)
    ("SIMULATION CORE (pure functions)", "js/models/core_hh_brunel_wilsoncowan_stdp_mlp.js", "model-code/js"),
    ("ML FOR NEUROSCIENCE: pure simulation code", "js/models/ml_core.js", "model-code/js"),
    ("MODEL LAB: pages, plotting", None, "ui"),
    ("A. PATCH CLAMP", "js/experiments/patch_clamp_fit_validate.js", "experiment"),
    ("B. PLACE CELLS", "js/experiments/place_cells_navigation.js", "experiment"),
    ("C. THE CA1 CIRCUIT", "js/experiments/ca1_circuit_layers_pathways.js", "experiment"),
    ("MODEL FITTING STUDIO", None, "ui"),
    ("F1. LOSS LANDSCAPES", "js/fitting/f1_loss_landscape_identifiability.js", "fitting"),
    ("F2. FIT AN f–I CURVE", "js/fitting/f2_fi_curve_lif_bootstrap.js", "fitting"),
    ("F3. MODEL COMPARISON", "js/fitting/f3_model_comparison.js", "fitting"),
    ("F4. FIT A PLACE FIELD", "js/fitting/f4_place_field_poisson_ml.js", "fitting"),
    ("F5. FIT A POPULATION RHYTHM", "js/fitting/f5_wilson_cowan_features.js", "fitting"),
    ("ML FOR NEUROSCIENCE: concept pages", None, "ui"),
    ("M1. NODES", "js/ml/m1_nodes_edges_weights.js", "ml"),
    ("M2. BACKPROPAGATION", "js/ml/m2_backprop.js", "ml"),
    ("M3. GRADIENT DESCENT", "js/ml/m3_gradient_descent.js", "ml"),
    ("M4. RECURRENT NETWORKS", "js/ml/m4_rnn_dynamics.js", "ml"),
    ("M5. FROM NETWORKS TO MEAN FIELD", "js/ml/m5_mean_field_bridge.js", "ml"),
    ("M6. BACKPROP VS BIOLOGICAL", "js/ml/m6_learning_rules.js", "ml"),
    ("the connectome as a graph", "js/ml/connectome_graph.js", "ml"),
    ("network sandbox", "js/ml/network_sandbox.js", "ml"),
    ("memory and decoding in the hippocampus", "js/ml/hippocampal_memory_decoding.js", "ml"),
    ("Reduced spiking model of the hippocampal loop", "js/models/hippocampal_loop_reduced_spiking.js", "model-code/js"),
    ("HIPPOCAMPAL CELL ATLAS (3D)", "js/models/atlas_signal_flow.js", "model-code/js"),
    ("ATLAS PAGE", None, "ui"),
    ("NETWORK PAGE", "js/models/atlas_network_page.js", "model-code/js"),
    ("ANATOMICAL REGIONS", None, "ui"),
    ("LOAD YOUR OWN .SWC", "js/models/swc_loader.js", "model-code/js"),
    ("REAL CELLS, CONNECTED", "js/models/real_cells_connected.js", "model-code/js"),
    ("UNDER THE HOOD: verification", "js/models/verification_helpers.js", "validation"),
    ("Action potential up close", "js/models/ap_stochastic_patch_and_cable.js", "model-code/js"),
    ("Shared muscle model", "js/models/muscle_sarcomere_ec_coupling.js", "model-code/js"),
    ("Neuromuscular junction model", "js/models/nmj_mammalian_37C.js", "model-code/js"),
    ("Mechanism atlas: the neuromuscular", "js/models/nmj_repetitive_stimulation.js", "model-code/js"),
]


def modellab() -> None:
    f = RAW / "little_neural_guide/modellab.js"
    s = f.read_text()
    starts = []
    for frag, dest, cat in MODELLAB_SECTIONS:
        i = s.find(frag)
        if i < 0:
            raise RuntimeError(f"section not found: {frag}")
        starts.append((s.rfind("/*", 0, i), dest, cat, frag))
    starts.sort()
    kept = []
    for k, (a, dest, cat, frag) in enumerate(starts):
        b = starts[k + 1][0] if k + 1 < len(starts) else len(s)
        if dest:
            write(dest, f"/* Extracted from Little Neural Guide modellab.js [{a}:{b}] — section: {frag} */\n" + s[a:b])
            kept.append(dest)
    record(f, "extracted", "model-code/js", "; ".join(kept), "split into sections; page/UI sections dropped")


GUIDE_JS = {  # file → (status, category, dest, note)
    "wb-neuron.js": ("extracted", "model-code/js", "js/models/workbench_neuron_engine.js", "channel library (10 channels) + LIF/AdEx/Izh/conductance cell + 21 presets"),
    "wb-synapse.js": ("extracted", "model-code/js", "js/models/workbench_synapse_engine.js", "AMPA/NMDA/GABA_A/GABA_B, STP, plasticity"),
    "wb-phase.js": ("extracted", "model-code/js", "js/models/workbench_phase_plane.js", "2-D systems: Morris-Lecar, FHN, normal forms, nullclines"),
    "labs.js": ("extracted", "model-code/js", "js/teaching_models/numerical_labs.js", "24 small validated models (Python + JS pairs)"),
    "expansion-labs.js": ("extracted", "model-code/js", "js/teaching_models/expansion_labs.js", "cable/morphology/synapse labs (Python + JS pairs)"),
    "morphology.js": ("extracted", "model-code/js", "js/teaching_models/synthetic_passive_tree.js", "synthetic passive multicompartment tree"),
    "examples.js": ("extracted", "model-code/python", "js/teaching_models/python_examples.js", "Python code examples embedded in lessons"),
    "hands-on.js": ("extracted", "model-code/js", "js/teaching_models/ca1_virtual_workspace.js", "CA1 virtual workspace (node-graph cable demo)"),
    "biology.js": ("extracted", "parameters", "js/parameters/biological_parameter_notes.js", "parameter meanings/ranges"),
    "spatial.js": ("reference", "lesson", "", "spatial navigation lessons (prose + refs)"),
    "realbio.js": ("reference", "lesson", "", "real biology & techniques pages; uses morph.js cells"),
    "textbook-data.js": ("reference", "lesson", "", "textbook chapters/equations/glossary (prose)"),
    "lab-equations.js": ("reference", "lesson", "", "MathML equations for teaching labs"),
}


def guide_js(done: set[str]) -> None:
    g = RAW / "little_neural_guide"
    for f in sorted(g.rglob("*")):
        if f.is_dir():
            continue
        rel = str(f.relative_to(g))
        if rel.startswith("code/") or rel in done or rel == "modellab.js":
            continue
        if rel in GUIDE_JS:
            status, cat, dest, note = GUIDE_JS[rel]
            if status == "extracted":
                write(dest, f"/* Extracted from Little Neural Guide {rel} */\n" + f.read_text())
            record(f, status, cat, dest, note)
        elif rel.startswith("img/"):
            record(f, "excluded", "figure", "", "teaching figure (OpenStax / generated)")
        else:
            record(f, "excluded", "ui/lesson", "", header(f.read_text(errors="ignore"))[:120] or "site UI / lesson / study tooling")


# ------------------------------------------------------- standalone pages
def scripts(html: str) -> list[str]:
    return [m.group(1) for m in re.finditer(r"<script[^>]*>(.*?)</script>", html, re.S)]


def pages() -> None:
    # CA1 Morphology Lab: engine + morphology
    f = RAW / "ca1_morphology_lab/index.html"
    sc = scripts(f.read_text())
    eng = next(s for s in sc if "CA1 Morphology Lab · engine.js" in s)
    write("js/models/ca1_morphology_lab_engine.js", eng)
    record(f, "extracted", "model-code/js", "js/models/ca1_morphology_lab_engine.js; data/morphologies/ca1_jarsky_lab.json",
           "Hines solver, I_h gradient, quasi-active impedance (Rebecca)")
    m = next(s for s in sc if s.lstrip().startswith("window.CA1_MORPH="))
    write("data/morphologies/ca1_jarsky_lab.json", json.dumps(js_value(m, "window.CA1_MORPH=")))

    # CA1 Resonance Home
    d = RAW / "ca1_resonance_home"
    learn = (d / "learn.html").read_text()
    port = next(s for s in scripts(learn) if "Quasi-active two-compartment CA1 model" in s)
    write("js/models/ca1_twocomp_quasiactive_impedance.js", port)
    record(d / "learn.html", "extracted", "model-code/js", "js/models/ca1_twocomp_quasiactive_impedance.js", "JS port of ca1_reduced.impedance")
    lab = (d / "lab.html").read_text()
    les = next((s for s in scripts(lab) if "lessons.js" in s[:200]), None)
    if les:
        write("js/experiments/ca1_morphology_guided_experiments.js", les)
    record(d / "lab.html", "extracted", "experiment", "js/experiments/ca1_morphology_guided_experiments.js",
           "copy of Morphology Lab + guided experiment protocols")
    for p, note in [("index.html", "project overview: aim, findings, stage status, parameter tables"),
                    ("paper.html", "paper notes: Ceballos 2025 equations/tables"),
                    ("reproduce.html", "reproduction protocols + results"),
                    ("log.html", "research log")]:
        record(d / p, "reference", "project-notes", "", note)
    for fig in sorted((d / "fig").glob("*.png")):
        dest = f"figures/ca1_resonance/{fig.name}"
        (OUT / dest).parent.mkdir(parents=True, exist_ok=True)
        (OUT / dest).write_bytes(fig.read_bytes())
        record(fig, "extracted", "figure", dest, "CA1 resonance project figure")

    # Neurodynamics Lab
    f = RAW / "neurodynamics_lab/index.html"
    core = next(s for s in scripts(f.read_text()) if "SIMULATION CORE" in s[:200])
    write("js/models/neurodynamics_lab_core.js", core)
    record(f, "extracted", "model-code/js", "js/models/neurodynamics_lab_core.js", "HH, Brunel, Wilson-Cowan, STDP, MLP")

    # Neuron Morphology Atlas: 59 cells
    f = RAW / "neuron_morphology_atlas/cells.js"
    write("data/morphologies/atlas_59_cells.json",
          json.dumps({"_source": header(f.read_text()), "data": js_value(f.read_text(), "window.CELLS=")},
                     separators=(",", ":")))
    record(f, "extracted", "morphology", "data/morphologies/atlas_59_cells.json",
           "59 reconstructions (ModelDB, NeuroMorpho, MouseLight, FlyEM/FANC/MANC) + morphometrics")
    record(RAW / "neuron_morphology_atlas/index.html", "excluded", "ui", "", "atlas viewer UI")

    # Giant fiber page
    f = RAW / "giant_fiber_axon_inputs/index.html"
    gf = next(s for s in scripts(f.read_text()) if "var COMP" in s)
    write("js/models/giant_fiber_axon_inputs.js", gf)
    record(f, "extracted", "model-code/js", "js/models/giant_fiber_axon_inputs.js", "GF compartments + axonal input data")

    record(RAW / "ca1_resonance_lab/index.html", "reference", "project-notes", "",
           "earlier CA1 resonance lab: inline SVG results (g_h sweeps, minimal vs as-printed readings)")
    record(RAW / "ca1_graphical_abstract/index.html", "excluded", "design", "", "graphical abstract (design)")


def main() -> None:
    if OUT.exists():
        import shutil
        shutil.rmtree(OUT)
    python_sources()
    done = guide_data()
    modellab()
    guide_js(done)
    pages()
    with open(ROOT / "sources/MANIFEST.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(sorted(rows, key=lambda r: (r["status"], r["category"], r["file"])))
    meta = {k: {"title": t, "url": u, "version": v, "pulled": "2026-11-02"} for k, (t, u, v) in ARTIFACTS.items()}
    (ROOT / "sources/artifacts.json").write_text(json.dumps(meta, indent=2))
    from collections import Counter
    print(Counter(r["status"] for r in rows), len(rows))


if __name__ == "__main__":
    main()
