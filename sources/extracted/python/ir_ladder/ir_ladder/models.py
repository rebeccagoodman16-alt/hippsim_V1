"""Three rungs of the ladder, all vectorised over N independent neurons (one per stimulus condition).

Each `simulate_*` takes a parameter dict, a stimulus function stim(t) -> (I_soma[N], I_dend[N]) in uA/cm^2,
duration T (ms), step dt (ms), noise D, and returns a dict with spike times per neuron and (optionally) traces.

Integration: RK4 for the deterministic part, then additive noise V += sqrt(2 D dt) * xi (as in the lab code).
"""
from __future__ import annotations
import numpy as np

G = lambda v, th, sg: 1.0 / (1.0 + np.exp(-(v - th) / sg))


# ============================================================================ rung 1: two-point LIF
def simulate_lif2(P, stim, N, T, dt=0.05, D=0.0, rng=None, record=False):
    """Two-compartment LIF. Soma spikes at Vth, resets to Vreset, refractory tref; dendrite is passive."""
    rng = rng or np.random.default_rng(0)
    Vs = np.full(N, P['EL']); Vd = np.full(N, P['EL']); ref = np.zeros(N)
    spikes = [[] for _ in range(N)]; rec = [] if record else None
    gac = P['gac'] if P.get('dendrite', True) else 0.0
    for k in range(int(round(T / dt))):
        t = k * dt; Is, Id = stim(t)
        dVs = (-P['gL'] * (Vs - P['EL']) - gac * (Vs - Vd) + P['Iapp'] + Is) / P['C']
        dVd = (-P['gL'] * (Vd - P['EL']) - gac * (Vd - Vs) + Id) / P['C']
        Vd = Vd + dt * dVd                                  # linear: Euler is adequate at dt = 0.05 ms
        Vs = np.where(ref > 0, P['Vreset'], Vs + dt * dVs + (np.sqrt(2 * D * dt) * rng.standard_normal(N) if D else 0))
        ref = np.maximum(ref - dt, 0)
        fired = Vs >= P['Vth']
        for i in np.flatnonzero(fired): spikes[i].append(t + dt)
        Vs[fired] = P['Vreset']; ref[fired] = P['tref']
        if record: rec.append((t, Vs.copy(), Vd.copy()))
    return dict(spikes=[np.array(s) for s in spikes], rec=rec)


# ============================================================================ rung 2: GLIF-IR (2-D: V, w)
def simulate_glif_ir(P, stim, N, T, dt=0.05, D=0.0, rng=None, record=False):
    """Generalised integrate-and-fire with one resonant variable (Richardson, Brunel & Hakim 2003):
        C dV/dt = -gL_eff (V - V0) - g_w w + I(t)
        tau_w dw/dt = (V - V0) - w
    plus threshold/reset; optional spike-triggered jump of w (b_w, in mV) gives adaptation/bursting.
    Parameters normally come from `linearize.glif_from_hh`."""
    rng = rng or np.random.default_rng(0)
    V = np.full(N, P['V0']); w = np.zeros(N); ref = np.zeros(N)
    spikes = [[] for _ in range(N)]; rec = [] if record else None
    for k in range(int(round(T / dt))):
        t = k * dt; Is, Id = stim(t); I = Is + P.get('dend_gain', 1.0) * Id
        dV = (-P['gL_eff'] * (V - P['V0']) - P['g_w'] * w + P['Iapp_lin'] + I) / P['C']
        dw = ((V - P['V0']) - w) / P['tau_w']
        V = np.where(ref > 0, P['Vreset'], V + dt * dV + (np.sqrt(2 * D * dt) * rng.standard_normal(N) if D else 0))
        w = w + dt * dw; ref = np.maximum(ref - dt, 0)
        fired = V >= P['Vth']
        for i in np.flatnonzero(fired): spikes[i].append(t + dt)
        V[fired] = P['Vreset']; w[fired] += P.get('b_w', 0.0); ref[fired] = P['tref']
        if record: rec.append((t, V.copy(), w.copy()))
    return dict(spikes=[np.array(s) for s in spikes], rec=rec)


# ============================================================================ rung 3: biophysical 2-compartment HH
def tau_hd(P, V):
    if P['tau_hd'] == 'code':
        return 1.0 / (np.exp(-17.9 - 0.116 * V) + np.exp(-1.84 + 0.09 * V)) + 0.1
    if P['tau_hd'] == 'printed':
        return 1.0 / (np.exp(-17.9 + 0.116 * V) + np.exp(-1.84 + 0.09 * V)) + 0.1
    return np.full_like(V, P['tau_hd_ms'])


def hh_currents(P, y):
    """Somatic ionic currents (uA/cm^2) and dendritic Ih. y rows: Vs h n b z r c Ca q Vd hd."""
    Vs, h, n, b, z, r, c, Ca, q, Vd, hd = y
    ca = np.maximum(Ca, 1e-9)
    I = dict(L=P['gL'] * (Vs - P['EL']),
             NaT=P['gNa'] * G(Vs, P['thm'], P['sgm']) ** 3 * h * (Vs - P['ENa']),
             NaP=P['gNaP'] * G(Vs, P['thp'], P['sgp']) * (Vs - P['ENa']),
             Kdr=P['gKdr'] * n ** 4 * (Vs - P['EK']),
             KA=P['gKA'] * G(Vs, P['tha'], P['sga']) ** 3 * b * (Vs - P['EK']),
             M=P['gM'] * z * (Vs - P['EK']),
             HCa=P['gHCa'] * r ** 2 * (Vs - P['ECa']),
             fKCa=P['gfKCa'] * (1.0 / (1.0 + P['ac'] / ca)) * c * (Vs - P['EK']),
             sKCa=P['gsKCa'] * q * (Vs - P['EK']),
             h=P['gh'] * hd * (Vd - P['Eh']))
    return I


def hh_rhs(P, y, Is, Id):
    Vs, h, n, b, z, r, c, Ca, q, Vd, hd = y
    I = hh_currents(P, y); dend = P.get('dendrite', True); gac = P['gac'] if dend else 0.0
    ca = np.maximum(Ca, 1e-9)
    dy = np.empty_like(y)
    dy[0] = (-(I['L'] + I['NaT'] + I['NaP'] + I['Kdr'] + I['KA'] + I['M'] + I['HCa'] + I['fKCa'] + I['sKCa'])
             - gac * (Vs - Vd) + P['Iapp'] + Is) / P['C']
    dy[1] = (G(Vs, P['thh'], P['sgh']) - h) / (0.1 + 0.75 * G(Vs, P['thht'], P['sght']))
    dy[2] = (G(Vs, P['thn'], P['sgn']) - n) / (0.1 + 0.5 * G(Vs, P['thnt'], P['sgnt']))
    dy[3] = (G(Vs, P['thb'], P['sgb']) - b) / P['taub']
    dy[4] = (G(Vs, P['thz'], P['sgz']) - z) / P['tauz']
    dy[5] = (G(Vs, P['thr'], P['sgr']) - r) / P['taur']
    dy[6] = (G(Vs, P['thc'], P['sgc']) - c) / P['tauc']
    dy[7] = -P['nu'] * I['HCa'] - Ca / P['tauCa']
    dy[8] = (1.0 / (1.0 + (P['aq'] / ca) ** 4) - q) / P['tauq']
    if dend:
        dy[9] = (-P['gL'] * (Vd - P['EL']) - I['h'] - gac * (Vd - Vs) + Id) / P['C']
        dy[10] = (G(Vd, P['thhd'], -P['sghd']) - hd) / tau_hd(P, Vd)   # h_inf = 1/(1+exp((V-thhd)/sghd))
    else:
        dy[9] = 0.0; dy[10] = 0.0
    return dy


def hh_init(P, N, V0=-70.0):
    y = np.zeros((11, N))
    y[0] = V0; y[1] = G(V0, P['thh'], P['sgh']); y[2] = G(V0, P['thn'], P['sgn']); y[3] = G(V0, P['thb'], P['sgb'])
    y[4] = G(V0, P['thz'], P['sgz']); y[5] = G(V0, P['thr'], P['sgr']); y[6] = G(V0, P['thc'], P['sgc']); y[7] = 1e-4
    y[9] = V0; y[10] = G(V0, P['thhd'], -P['sghd'])
    return y


def simulate_hh2(P, stim, N, T, dt=0.02, D=0.0, rng=None, record=False, y0=None, vth=-20.0):
    """Biophysical soma (NaT, NaP, Kdr, KA, KM, HCa, fKCa, sKCa) + dendrite (leak, Ih), coupled by g_ac.
    Spike = Vs crosses vth upward after repolarising below vth - 20 mV."""
    rng = rng or np.random.default_rng(0)
    y = hh_init(P, N) if y0 is None else y0.copy()
    spikes = [[] for _ in range(N)]; armed = y[0] < vth - 20; rec = [] if record else None
    for k in range(int(round(T / dt))):
        t = k * dt
        Is0, Id0 = stim(t); Ish, Idh = stim(t + dt / 2); Is1, Id1 = stim(t + dt)
        k1 = hh_rhs(P, y, Is0, Id0); k2 = hh_rhs(P, y + dt / 2 * k1, Ish, Idh)
        k3 = hh_rhs(P, y + dt / 2 * k2, Ish, Idh); k4 = hh_rhs(P, y + dt * k3, Is1, Id1)
        y = y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        if D: y[0] += np.sqrt(2 * D * dt) * rng.standard_normal(N)
        up = armed & (y[0] >= vth)
        for i in np.flatnonzero(up): spikes[i].append(t + dt)
        armed = np.where(up, False, armed | (y[0] < vth - 20))
        if record: rec.append((t, y[0].copy(), y[9].copy(), y[4].copy(), y[10].copy()))
    return dict(spikes=[np.array(s) for s in spikes], rec=rec, y=y)
