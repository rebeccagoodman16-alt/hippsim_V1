"""Gating kinetics shared by the numpy engines and mirrored 1:1 in mechanisms/*.mod.

Units: V mV, τ ms, rates 1/ms.
"""
from __future__ import annotations

import numpy as np


def vtrap(x, y):
    """x / (exp(x/y) − 1) with the removable singularity at x = 0."""
    x = np.asarray(x, float)
    small = np.abs(x / y) < 1e-6
    with np.errstate(over="ignore", invalid="ignore", divide="ignore"):
        v = x / np.expm1(x / y)
    return np.where(small, y * (1 - x / y / 2), v)


# ---------------------------------------------------------------- I_h (hd.mod)
def h_inf(V, vhalf=-90.0, k=8.5):
    return 1.0 / (1.0 + np.exp((V - vhalf) / k))


def h_tau(V, kin="bell", tau_peak=40.0, vtau=-75.0, scale=1.0):
    """'bell': symmetric bell, peak τ at vtau.  'lowet2023': HHca2 τ(V) (Lowet et al. 2023)."""
    if kin == "lowet2023":
        t = 1.0 / (np.exp(-17.9 - 0.116 * V) + np.exp(-1.84 + 0.09 * V)) + 0.1
    elif kin == "bell":
        t = 2 * tau_peak / (np.exp((V - vtau) / 15) + np.exp(-(V - vtau) / 15))
    else:
        raise ValueError(f"unknown I_h kinetics {kin!r}")
    return scale * t


# ------------------------------------- Traub–Miles Na/Kdr (Pospischil 2008)
def na_rates(V, VT=-58.0):
    u = V - VT
    return (0.32 * vtrap(13 - u, 4), 0.28 * vtrap(u - 40, 5),
            0.128 * np.exp((17 - u) / 18), 4 / (1 + np.exp((40 - u) / 5)))


def kdr_rates(V, VT=-58.0):
    u = V - VT
    return 0.032 * vtrap(15 - u, 5), 0.5 * np.exp((10 - u) / 40)


# ---------------------------------------------- M-current (Pospischil 2008)
def m_inf(V):
    return 1.0 / (1.0 + np.exp(-(V + 35) / 10))


def m_tau(V, taumax=1000.0):
    return taumax / (3.3 * np.exp((V + 35) / 20) + np.exp(-(V + 35) / 20))
