"""Parameter sets for the interleaved-resonance model ladder.

Source: Ceballos, Chadly, Lowet & Pena (2025) PLoS Comput Biol 21:e1013126, Table 1 / Methods
(doi:10.1371/journal.pcbi.1013126), and the lab's single-compartment code
(github.com/rodrigo-pena-lab/interleaved_resonance, class HHca = Golomb, Yue & Yaari 2006 kinetics).

Units: mV, ms, uF/cm^2, mS/cm^2, uA/cm^2.

Where Table 1 and the code disagree, `TABLE1_GATING` holds the printed values and `CODE_GATING`
holds the code's values; `hh_params(gating=...)` picks one. Every unresolved item is listed in
`AMBIGUITIES` so it can be checked with the authors.
"""
from __future__ import annotations
from copy import deepcopy

# ----------------------------------------------------------------------------- shared membrane
MEMBRANE = dict(C=1.0, gL=0.04, EL=-70.0, ENa=55.0, EK=-90.0, ECa=120.0, Iapp=1.0)

# ----------------------------------------------------------------------------- conductances (Table 1)
CONDUCTANCES = dict(gNa=35.0, gNaP=0.9, gKdr=5.8, gKA=2.8, gM=2.4, gHCa=0.17, gfKCa=9.05, gsKCa=2.8,
                    gh=8.46, gac=0.2)

# ----------------------------------------------------------------------------- gating, common to both readings
_COMMON = dict(thm=-30.0, sgm=9.5,                      # NaT activation (instantaneous)
               thh=-45.0, sgh=-7.0, thht=-40.5, sght=-6.0,   # NaT inactivation; tau_h = 0.1 + 0.75*G(V, thht, sght)
               thn=-35.0, sgn=10.0, thnt=-27.0, sgnt=-15.0,  # Kdr; tau_n = 0.1 + 0.5*G(V, thnt, sgnt)
               sgp=3.0,                                  # NaP slope
               tha=-50.0, sga=20.0, thb=-80.0, taub=15.0,   # KA
               thz=-39.0, sgz=5.0, tauz=75.0,               # KM
               thr=-20.0, taur=1.0,                         # HCa
               tauc=2.0, ac=6.0, aq=2.0, tauq=450.0,        # fKCa, sKCa
               nu=0.13, tauCa=13.0,                         # [Ca]i dynamics
               thhd=-84.0, sghd=10.2,                       # Ih steady state (deactivates with depolarisation)
               Eh=-32.9,                                    # Ih reversal: from the lab's 2-compartment code (HHca2, Lowet et al. 2023 repo)
               Iapp_d=0.0)                                  # DC current into the dendrite (HHca2 default 0.9; not stated in the 2025 paper)

HYBRID_GATING = dict(thp=-35.0, sgb=-6.0, sgr=10.0, thc=-30.0, sgc=7.0)
TABLE1_GATING = dict(thp=-35.0, sgb=15.0, sgr=19.0, thc=30.0, sgc=-7.0)
CODE_GATING = dict(thp=-47.0, sgb=-6.0, sgr=10.0, thc=-30.0, sgc=7.0)

AMBIGUITIES = {
    'thp': 'NaP half-activation: Table 1 -35 mV; lab code -47 mV (comment: varies -47 to -41).',
    'sgb': 'KA inactivation slope: Table 1 15 mV; Methods text and code -6 mV (a positive slope would make b an activation gate).',
    'sgr': 'HCa activation slope: Table 1 19 mV; code 10 mV.',
    'thc/sgc': 'fKCa voltage gate: Table 1 theta=+30, sigma=-7 (opens on hyperpolarisation as printed); code -30, +7.',
    'tau_hd': 'Ih time constant: Table 1 prints exp[-17.9+0.116V]; the lab code (HHca2) has exp(-17.9-0.116V). '
              'Both give ~3 s near rest (Ih acts as a nearly static conductance over a 4 s run). Default: code formula.',
    'Eh': 'Ih reversal: Table 1 prints "V - V_K"; the lab code uses Vh2 = -32.9 mV (default).',
    'gh': 'gh = 8.46 (2025 Table 1) vs Gh2 = 2 in the HHca2 code used for Lowet et al. 2023.',
    'site': 'Oscillatory input site: Fig 3 says dendrite, Fig 4 says soma and dendrite. Default: soma; switchable.',
    'defaults': 'gNaP 0.9 (Table 1) vs 0.93 (figures); gKdr 5.8 vs 5.86.',
    'D': 'Noise D = 9.6e-6 in Table 1 vs D = 0.1 default in the lab code (V += sqrt(2 D dt) xi).',
}


def hh_params(gating: str = 'code', tau_hd: str = 'code', tau_hd_ms: float = 40.0, dendrite: bool = True, **over) -> dict:
    """Full parameter dict for the biophysical two-compartment model.

    gating: 'code' (lab code / Golomb kinetics) or 'table1' (as printed).
    tau_hd: 'code' (HHca2 formula), 'printed' (Table 1 sign), or 'fixed' (constant tau_hd_ms).
    dendrite: False gives the single-compartment model of the lab notebook (gh, gac ignored).
    """
    P = {**MEMBRANE, **CONDUCTANCES, **_COMMON, **{'code': CODE_GATING, 'table1': TABLE1_GATING, 'hybrid': HYBRID_GATING}[gating]}
    P.update(tau_hd=tau_hd, tau_hd_ms=tau_hd_ms, dendrite=dendrite)
    P.update(over)
    return P


def golomb_zca() -> dict:
    """Golomb et al. 2006 Fig 6Da (zero Ca), used as a regression check of the soma equations."""
    return hh_params(gating='code', dendrite=False, gL=0.05, gNaP=0.3, gKdr=6.0, gKA=1.4, gM=1.0, gHCa=0.0,
                     gfKCa=0.0, gsKCa=0.0, Iapp=0.661914, EL=-70.0)


def lif_params(**over) -> dict:
    """Two-point (soma + dendrite) leaky integrate-and-fire with the same passive membrane and coupling."""
    P = dict(C=1.0, gL=0.04, EL=-70.0, gac=0.2, Iapp=1.0, Vth=-50.0, Vreset=-60.0, tref=2.0, dendrite=True)
    P.update(over)
    return P


def copy(P: dict) -> dict:
    return deepcopy(P)
