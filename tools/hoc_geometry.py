"""Read the geometry in a NEURON morphology .hoc file as text, without running it.

Supports the geometry-only subset these ModelDB files use:
  create a[n], b                      section arrays (no index = [0])
  connect child(x), parent(y)         also "for i = a, b connect a[i](0), b[i-1](1)"
  {parent connect child(x), y}        NeuroMorpho CNG style
  name[i] { pt3dclear() pt3dadd(x, y, z, d) ... }   or   {access name[i]} {pt3dadd(...)}
Anything else (procs, parameters, comments) is ignored; nothing in the file is executed.

    read_hoc(path) -> [{"name", "parent", "pts": [[x, y, z, d], ...]}, ...]   (parent = index or -1)
"""
from __future__ import annotations

import re
from pathlib import Path

NUM = r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?"
REF = r"([A-Za-z_]\w*)\s*(?:\[\s*([^\]]+?)\s*\])?"
CREATE = re.compile(r"\bcreate\s+([^\n}]+)")
CONNECT = re.compile(rf"(?:for\s+i\s*=\s*(\d+)\s*,\s*(\d+)\s+)?connect\s+{REF}\s*\(\s*({NUM})\s*\)\s*,\s*{REF}\s*\(\s*({NUM})\s*\)")
CNG_CONNECT = re.compile(rf"\{{\s*{REF}\s+connect\s+{REF}\s*\(\s*({NUM})\s*\)\s*,\s*({NUM})\s*\}}")
OPEN = re.compile(rf"^\s*\{{?\s*(?:access\s+)?{REF}\s*(\{{|\}})?")
PT = re.compile(rf"pt3dadd\(\s*({NUM})\s*,\s*({NUM})\s*,\s*({NUM})\s*,\s*({NUM})\s*\)")


def _idx(expr: str | None, i: int | None = None) -> int:
    if expr is None:
        return 0
    e = re.sub(r"(\d)\.(?!\d)", r"\1", expr.replace(" ", ""))   # "0." -> 0
    if i is not None:
        e = re.sub(r"\bi\b", str(i), e)
    if not re.fullmatch(r"\d+([+-]\d+)*", e):
        raise ValueError(f"unsupported index {expr!r}")
    return sum(int(t) for t in re.findall(r"[+-]?\d+", e))


def read_hoc(path: str | Path) -> list[dict]:
    text = re.sub(r"//[^\n]*", "", Path(path).read_text(errors="ignore"))
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    names: dict[str, int] = {}
    order: list[str] = []
    for m in CREATE.finditer(text):
        for part in m.group(1).split(","):
            r = re.fullmatch(r"\s*([A-Za-z_]\w*)\s*(?:\[\s*(\w+)\.?\s*\])?\s*", part)
            if not r:
                continue
            n = r.group(2)
            if n and not n.isdigit():                       # create section[n_sections]
                v = re.search(rf"\b{n}\s*=\s*(\d+)", text)
                n = v.group(1) if v else None
            names[r.group(1)] = int(n) if n else 1
    for base, n in names.items():
        order += [f"{base}[{k}]" for k in range(n)]
    pos = {s: k for k, s in enumerate(order)}
    pts: dict[str, list] = {s: [] for s in order}
    parent: dict[str, str] = {}

    def key(base, ix, i=None):
        k = f"{base}[{_idx(ix, i)}]"
        if k not in pos:
            raise KeyError(k)
        return k

    for m in CONNECT.finditer(text):
        a, b = (int(m.group(1)), int(m.group(2))) if m.group(1) else (None, None)
        for i in (range(a, b + 1) if a is not None else [None]):
            parent[key(m.group(3), m.group(4), i)] = key(m.group(6), m.group(7), i)
    for m in CNG_CONNECT.finditer(text):
        parent[key(m.group(3), m.group(4))] = key(m.group(1), m.group(2))

    cur = None
    for line in text.splitlines():
        if "pt3dadd" not in line and "pt3dclear" not in line:
            o = OPEN.match(line)
            if o and o.group(1) in names and ("access" in line or o.group(3) == "{"):
                cur = key(o.group(1), o.group(2))
            continue
        o = OPEN.match(line)
        if o and o.group(1) in names:                       # "soma {pt3dclear()" on one line
            cur = key(o.group(1), o.group(2))
        if "pt3dclear" in line and cur:
            pts[cur] = []
        for p in PT.finditer(line):
            if cur:
                pts[cur].append([float(v) for v in p.groups()])
    return [{"name": s, "parent": pos[parent[s]] if s in parent else -1, "pts": pts[s]} for s in order]
