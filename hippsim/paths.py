"""Repository paths. Override the results location with HIPPSIM_RESULTS (e.g. a mounted Google Drive folder)."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MORPH_DIR = ROOT / "morphologies"
MECH_DIR = ROOT / "mechanisms"
MODEL_DIR = ROOT / "models"
PERTURB_DIR = ROOT / "perturbations"
RESULTS_DIR = Path(os.environ.get("HIPPSIM_RESULTS", ROOT / "results"))
