"""Morphology I/O: SWC read/write and the Little Neural Guide section format.

Conventions
-----------
* Units: µm.  Coordinates soma-centred.
* SWC type codes (Cannon et al. 1998 / NeuroMorpho std 1.21):
  1 soma · 2 axon · 3 basal dendrite · 4 apical dendrite.
* Soma written as the NeuroMorpho 3-point cylinder (equal-area sphere).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

SOMA, AXON, BASAL, APICAL = 1, 2, 3, 4
TYPE_NAMES = {SOMA: "soma", AXON: "axon", BASAL: "basal", APICAL: "apical"}


@dataclass
class Morphology:
    """Tree of SWC samples.

    Attributes
    ----------
    ids, types, parents : int arrays (SWC columns 1, 2, 7)
    xyz : (N, 3) float array, µm
    r   : (N,) radius, µm
    meta : free-form provenance (source, citation, ModelDB id …)
    """
    ids: np.ndarray
    types: np.ndarray
    xyz: np.ndarray
    r: np.ndarray
    parents: np.ndarray
    name: str = ""
    meta: dict = field(default_factory=dict)

    # ---------------------------------------------------------------- basics
    @property
    def n(self) -> int:
        return len(self.ids)

    def index(self) -> dict[int, int]:
        """SWC id → row index."""
        return {int(i): k for k, i in enumerate(self.ids)}

    def parent_rows(self) -> np.ndarray:
        """Row index of each sample's parent (−1 for root)."""
        idx = self.index()
        return np.array([idx.get(int(p), -1) for p in self.parents])

    def soma_radius(self) -> float:
        s = self.types == SOMA
        return float(self.r[s].max()) if s.any() else 0.0

    def subset(self, swc_type: int) -> np.ndarray:
        return self.types == swc_type


# -------------------------------------------------------------------- SWC
def read_swc(path: str | Path, name: str | None = None) -> Morphology:
    rows = []
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            rows.append([float(v) for v in line.split()[:7]])
    a = np.asarray(rows)
    return Morphology(ids=a[:, 0].astype(int), types=a[:, 1].astype(int),
                      xyz=a[:, 2:5], r=a[:, 5], parents=a[:, 6].astype(int),
                      name=name or Path(path).stem)


def write_swc(m: Morphology, path: str | Path, header: list[str] | None = None) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as fh:
        for h in header or []:
            fh.write(f"# {h}\n")
        fh.write("# id type x y z radius parent\n")
        for i, t, (x, y, z), r, p in zip(m.ids, m.types, m.xyz, m.r, m.parents):
            fh.write(f"{i} {t} {x:.3f} {y:.3f} {z:.3f} {r:.4f} {p}\n")


# ------------------------------------------------- Guide section format
def outline_radius(outline: list[float]) -> float:
    """Equal-area radius of a closed 2-D soma outline [x0,y0,x1,y1,…] (shoelace)."""
    p = np.asarray(outline, float).reshape(-1, 2)
    x, y = p[:, 0], p[:, 1]
    area = 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))
    return float(np.sqrt(area / np.pi))


def from_guide(cell: dict, name: str | None = None) -> Morphology:
    """Convert a Guide record {soma: outline, sections: [[type, parent, xyz, r], …]}.

    The first point of a child section sits on its parent's last point but
    carries the child's own starting radius; it is kept (zero-length step) so
    the branch-point taper is preserved exactly. NEURON's Import3d and
    `compartments.sections` both handle this convention.
    """
    rs = outline_radius(cell["soma"])
    ids, types, xyz, r, par = [1, 2, 3], [SOMA] * 3, [[0, 0, 0], [0, -rs, 0], [0, rs, 0]], [rs] * 3, [-1, 1, 1]
    sec_last: list[int] = []
    for typ, parent, P, R in cell["sections"]:
        P = np.asarray(P, float).reshape(-1, 3)
        prev = 1 if parent < 0 else sec_last[parent]
        for k in range(len(R)):
            nid = len(ids) + 1
            ids.append(nid); types.append(int(typ)); xyz.append(P[k].tolist())
            r.append(float(R[k])); par.append(prev); prev = nid
        sec_last.append(prev)
    return Morphology(np.array(ids), np.array(types), np.array(xyz, float),
                      np.array(r, float), np.array(par), name=name or cell.get("id", ""))
