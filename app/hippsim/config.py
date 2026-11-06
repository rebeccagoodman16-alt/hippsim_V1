"""Baseline → perturbation overlays → overrides.

Baselines live in models/<literature|lab/<author>>/<model>/baseline.yaml and are
never edited by runs. Perturbations live in perturbations/<literature|lab/<author>>/<name>.yaml:

    name: ih_block
    applies_to: [ca1_morph_ih_gradient]      # optional guard
    ops:
      - {param: gh_soma, scale: 0.0}         # scale | set | add
      - {param: g_na_dend, set: 8}
"""
from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .paths import MODEL_DIR, PERTURB_DIR


@dataclass
class ModelConfig:
    name: str
    path: Path                      # folder holding baseline.yaml
    meta: dict                      # everything in baseline.yaml except params
    params: dict
    applied: list = field(default_factory=list)   # perturbation names, in order
    overrides: dict = field(default_factory=dict)

    def digest(self) -> str:
        blob = json.dumps({"model": self.name, "params": self.params}, sort_keys=True, default=str)
        return hashlib.sha1(blob.encode()).hexdigest()[:10]

    def to_dict(self) -> dict:
        return {"model": self.name, "baseline": str(self.path), "perturbations": self.applied,
                "overrides": self.overrides, "params": self.params, "digest": self.digest()}


def _find(root: Path, name: str, filename: str | None) -> Path:
    hits = [p for p in root.rglob(filename or f"{name}.yaml")
            if (p.parent.name == name if filename else True)]
    if not hits:
        raise FileNotFoundError(f"{name!r} not found under {root}")
    if len(hits) > 1:
        raise ValueError(f"{name!r} is ambiguous: {[str(h.relative_to(root)) for h in hits]}; use a path")
    return hits[0]


def list_models() -> list[str]:
    return sorted(str(p.parent.relative_to(MODEL_DIR)) for p in MODEL_DIR.rglob("baseline.yaml"))


def list_perturbations() -> list[str]:
    return sorted(str(p.relative_to(PERTURB_DIR).with_suffix("")) for p in PERTURB_DIR.rglob("*.yaml"))


def load_model(name: str, perturb: list[str] | None = None, override: dict | None = None) -> ModelConfig:
    """name: folder name ('ca1_morph_ih_gradient') or path relative to models/."""
    f = MODEL_DIR / name / "baseline.yaml"
    if not f.exists():
        f = _find(MODEL_DIR, Path(name).name, "baseline.yaml")
    raw = yaml.safe_load(f.read_text())
    params = copy.deepcopy(raw.pop("params"))
    cfg = ModelConfig(raw.get("model", f.parent.name), f.parent, raw, params)
    for p in perturb or []:
        apply_perturbation(cfg, p)
    for k, v in (override or {}).items():
        _check_key(cfg, k)
        cfg.params[k] = v
    cfg.overrides = dict(override or {})
    return cfg


def _check_key(cfg: ModelConfig, k: str) -> None:
    if k not in cfg.params:
        raise KeyError(f"{k!r} is not a parameter of {cfg.name}; known: {sorted(cfg.params)}")


def apply_perturbation(cfg: ModelConfig, name: str) -> None:
    f = PERTURB_DIR / f"{name}.yaml"
    if not f.exists():
        f = _find(PERTURB_DIR, Path(name).name, None)
    spec = yaml.safe_load(f.read_text())
    guard = spec.get("applies_to")
    if guard and cfg.name not in guard:
        raise ValueError(f"perturbation {spec['name']!r} applies to {guard}, not {cfg.name!r}")
    for op in spec["ops"]:
        k = op["param"]
        _check_key(cfg, k)
        if "set" in op:
            cfg.params[k] = op["set"]
        elif "scale" in op:
            cfg.params[k] = cfg.params[k] * op["scale"]
        elif "add" in op:
            cfg.params[k] = cfg.params[k] + op["add"]
        else:
            raise ValueError(f"op needs set|scale|add: {op}")
    cfg.applied.append(spec.get("name", f.stem))
