"""Run folders: <RESULTS>/<model>/<condition>/<YYYY-MM-DD_HHMMSS>_<digest>/

    config.yaml       merged parameters (baseline + perturbations + overrides) + protocol
    data.npz          arrays
    summary.json      scalar results
    provenance.json   time, author, git commit, package versions, seed
    figures/          optional

Set HIPPSIM_RESULTS to a shared Google Drive folder; set HIPPSIM_AUTHOR to your name.
"""
from __future__ import annotations

import datetime as _dt
import json
import os
import platform
import subprocess
from importlib import metadata
from pathlib import Path

import numpy as np
import yaml

from ..paths import RESULTS_DIR, ROOT


def _git_commit() -> str | None:
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True,
                              check=True).stdout.strip()
    except Exception:
        return None


def _versions() -> dict:
    out = {"python": platform.python_version()}
    for pkg in ("numpy", "scipy", "neuron", "brian2", "pynwb", "hippsim"):
        try:
            out[pkg] = metadata.version(pkg)
        except metadata.PackageNotFoundError:
            pass
    return out


def _jsonable(x):
    if isinstance(x, (np.floating, np.integer)):
        return x.item()
    if isinstance(x, np.ndarray):
        return x.tolist()
    if isinstance(x, Path):
        return str(x)
    return x


class RunDir:
    def __init__(self, cfg, protocol: str, protocol_args: dict | None = None, seed: int | None = None,
                 root: Path | None = None, tag: str | None = None):
        condition = "+".join(cfg.applied) or "baseline"
        if cfg.overrides:
            condition += "__" + "_".join(f"{k}-{v}" for k, v in sorted(cfg.overrides.items()))
        stamp = _dt.datetime.now().strftime("%Y-%m-%d_%H%M%S")
        name = f"{stamp}_{protocol}_{cfg.digest()}" + (f"_{tag}" if tag else "")
        self.path = Path(root or RESULTS_DIR) / cfg.name / condition / name
        (self.path / "figures").mkdir(parents=True, exist_ok=True)
        with open(self.path / "config.yaml", "w") as fh:
            yaml.safe_dump({**cfg.to_dict(), "protocol": protocol,
                            "protocol_args": {k: _jsonable(v) for k, v in (protocol_args or {}).items()}},
                           fh, sort_keys=False)
        prov = {"created": _dt.datetime.now().isoformat(timespec="seconds"),
                "author": os.environ.get("HIPPSIM_AUTHOR", "unknown"),
                "git_commit": _git_commit(), "versions": _versions(), "seed": seed,
                "host": platform.node()}
        (self.path / "provenance.json").write_text(json.dumps(prov, indent=2))

    def save(self, arrays: dict | None = None, summary: dict | None = None) -> Path:
        if arrays:
            np.savez_compressed(self.path / "data.npz", **{k: np.asarray(v) for k, v in arrays.items()})
        if summary:
            (self.path / "summary.json").write_text(json.dumps({k: _jsonable(v) for k, v in summary.items()},
                                                               indent=2))
        return self.path

    def figure(self, fig, name: str) -> Path:
        p = self.path / "figures" / f"{name}.png"
        fig.savefig(p, dpi=150, bbox_inches="tight")
        return p
