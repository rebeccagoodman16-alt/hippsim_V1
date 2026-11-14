"""Small, documented changes hippsim makes to its built copy of Little Neural Guide files.

sources/raw/ stays byte-identical (sha256 in sources/MANIFEST.csv); the patches below are applied only to the copy
served by the app (tools/build_app.py) and to the build check (tools/build_simulator.py). Each patch is an exact
string replacement that must match once, so a change in the source is caught at build time.
"""
from pathlib import Path

PATCHES = {
    "modellab.js": [
        # Place fields: the cell menu follows the three papers; Golomb 2006 one-compartment cell (Fig 6Da parameter set,
        # the set ir_ladder/validate.py reproduces exactly) and the Ceballos 2025 soma without its Iₕ dendrite.
        ("const PF_CELLS = {   // drive calibrated so each cell is silent outside a field and fires 15–30 Hz inside one\n",
         "const PF_CELLS = {   // drive calibrated so each cell is silent outside a field and fires 15–30 Hz inside one\n"
         "  golomb: ['Golomb et al. 2006: 1 compartment (Fig 6Da set)', () => Object.assign({}, IR_HH, IR_GATE.code[1], { dend: 0, gL: 0.05, gNaP: 0.3, gKdr: 6.0, gKA: 1.4, gM: 1.0, gHCa: 0, gfKCa: 0, gsKCa: 0, EL: -70 }), { site: 'soma', I0: 0, gain: 1.5, Ath: 0.3 }],   // hippsim patch\n"),
        ("Object.assign({}, IR_HH, IR_GATE.hybrid[1]), { site: 'soma', I0: -1.5, gain: 5.5, Ath: 0.3 }] };",
         "Object.assign({}, IR_HH, IR_GATE.hybrid[1]), { site: 'soma', I0: -1.5, gain: 5.5, Ath: 0.3 }],\n"
         "  hhsoma: ['Ceballos 2025 soma only (no Iₕ dendrite)', () => Object.assign({}, IR_HH, IR_GATE.hybrid[1], { dend: 0 }), { site: 'soma', I0: -1.5, gain: 5.5, Ath: 0.3 }] };   // hippsim patch"),
        ("D.M = irMake(S.cell, D.P, D.S);",
         "D.M = irMake(S.cell === 'golomb' || S.cell === 'hhsoma' ? 'hh' : S.cell, D.P, D.S);   /* hippsim patch: these two are HH cells */"),
    ],
}


def apply(name: str, text: str) -> str:
    if "hippsim patch" in text:          # already patched (idempotent)
        return text
    for old, new in PATCHES.get(name, []):
        if text.count(old) != 1:
            raise SystemExit(f"guide_patches: {name}: expected exactly one match for {old[:70]!r}")
        text = text.replace(old, new)
    return text


def patch_dir(d: Path) -> None:
    for name in PATCHES:
        f = d / name
        if f.exists():
            f.write_text(apply(name, f.read_text()))
