"""Numba kernels for all rungs. Every kernel simulates N neurons in parallel; neuron i receives
    I_i(t) = Iapp_i + A1_i sin(2 pi f1_i t + ph) + A2_i sin(2 pi f2_i t + ph) + noise
at the soma (site=0), dendrite (site=1) or both (site=2). Spike times are returned as a padded array
(N, maxspk) filled with NaN.

Kernels:
  lif2_kernel   two-point LIF (soma + passive dendrite)
  glif_kernel   GLIF1-5 (Teeter et al. 2018 Nat Commun 9:709), optional passive dendrite
  adex_kernel   2-D adaptive exponential IF (Brette & Gerstner 2005), optional passive dendrite
  hh2_kernel    biophysical soma + Ih dendrite (Ceballos et al. 2025 / Golomb et al. 2006 kinetics)
"""
from __future__ import annotations
import math
import numpy as np
from numba import njit

PH = 1.5 * math.pi


@njit(cache=True)
def _G(v, th, sg):
    return 1.0 / (1.0 + math.exp(-(v - th) / sg))


@njit(cache=True)
def _drive(t, A1, f1, A2, f2):
    return A1 * math.sin(2 * math.pi * f1 * 1e-3 * t + PH) + A2 * math.sin(2 * math.pi * f2 * 1e-3 * t + PH)


# ------------------------------------------------------------------------------------------- LIF
@njit(cache=True)
def lif2_kernel(p, Iapp, A1, f1, A2, f2, site, T, dt, D, seed, maxspk, rec_every):
    """p = [C, gL, EL, gac, Vth, Vreset, tref, dend]"""
    np.random.seed(seed)
    C, gL, EL, gac, Vth, Vr, tref, dend = p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]
    if dend == 0: gac = 0.0
    N = Iapp.size; nst = int(T / dt); spk = np.full((N, maxspk), np.nan); ns = np.zeros(N, np.int64)
    nrec = nst // rec_every + 1 if rec_every > 0 else 1; rec = np.zeros((N, nrec, 2))
    sq = math.sqrt(2 * D * dt)
    for i in range(N):
        Vs = EL; Vd = EL; ref = 0.0
        for k in range(nst):
            t = k * dt; I = _drive(t, A1[i], f1[i], A2[i], f2[i])
            Is = Iapp[i] + (I if site != 1 else 0.0); Id = I if site != 0 else 0.0
            dVd = (-gL * (Vd - EL) - gac * (Vd - Vs) + Id) / C
            if ref > 0:
                ref -= dt; Vs = Vr
            else:
                Vs += dt * (-gL * (Vs - EL) - gac * (Vs - Vd) + Is) / C + sq * np.random.randn()
            Vd += dt * dVd
            if Vs >= Vth:
                if ns[i] < maxspk: spk[i, ns[i]] = t + dt
                ns[i] += 1; Vs = Vr; ref = tref
            if rec_every > 0 and k % rec_every == 0: rec[i, k // rec_every, 0] = Vs; rec[i, k // rec_every, 1] = Vd
    return spk, rec


# ------------------------------------------------------------------------------------------- GLIF 1-5
@njit(cache=True)
def glif_kernel(p, Iapp, A1, f1, A2, f2, site, T, dt, D, seed, maxspk, rec_every):
    """Teeter et al. 2018 GLIF, all mechanisms (switch off by zeroing):
       C dV/dt = I + I1 + I2 + I3 - G (V - EL) - gac (V - Vd)
       dIj/dt = -kj Ij ; on spike Ij <- Rj Ij + Aj                         (after-spike currents, GLIF3)
       Theta = Theta_inf + Ts + Tv
       dTs/dt = -bs Ts ; on spike Ts += dTs                                 (spike-induced threshold, GLIF2)
       dTv/dt = av (V - EL) - bv Tv                                         (voltage-induced threshold, GLIF4/5)
       on spike V <- EL + fv (V - EL) - dV                                  (reset rule, GLIF2)
       p = [C, G, EL, Tinf, fv, dV, tref, k1, A1, R1, k2, A2, R2, k3, A3, R3, bs, dTs, av, bv, gac, dend]"""
    np.random.seed(seed)
    C, Gm, EL, Tinf, fv, dVr, tref = p[0], p[1], p[2], p[3], p[4], p[5], p[6]
    k1, a1, r1, k2, a2, r2, k3, a3, r3 = p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15]
    bs, dTs, av, bv, gac, dend = p[16], p[17], p[18], p[19], p[20], p[21]
    if dend == 0: gac = 0.0
    N = Iapp.size; nst = int(T / dt); spk = np.full((N, maxspk), np.nan); ns = np.zeros(N, np.int64)
    nrec = nst // rec_every + 1 if rec_every > 0 else 1; rec = np.zeros((N, nrec, 3))
    sq = math.sqrt(2 * D * dt)
    for i in range(N):
        V = EL; Vd = EL; I1 = 0.0; I2 = 0.0; I3 = 0.0; Ts = 0.0; Tv = 0.0; ref = 0.0
        for k in range(nst):
            t = k * dt; I = _drive(t, A1[i], f1[i], A2[i], f2[i])
            Is = Iapp[i] + (I if site != 1 else 0.0); Id = I if site != 0 else 0.0
            dVd = (-Gm * (Vd - EL) - gac * (Vd - V) + Id) / C
            I1 -= dt * k1 * I1; I2 -= dt * k2 * I2; I3 -= dt * k3 * I3
            Ts -= dt * bs * Ts
            if ref > 0:
                ref -= dt
            else:
                V += dt * (Is + I1 + I2 + I3 - Gm * (V - EL) - gac * (V - Vd)) / C + sq * np.random.randn()
                Tv += dt * (av * (V - EL) - bv * Tv)
            Vd += dt * dVd
            if ref <= 0 and V >= Tinf + Ts + Tv:
                if ns[i] < maxspk: spk[i, ns[i]] = t + dt
                ns[i] += 1
                V = EL + fv * (V - EL) - dVr
                I1 = r1 * I1 + a1; I2 = r2 * I2 + a2; I3 = r3 * I3 + a3; Ts += dTs; ref = tref
            if rec_every > 0 and k % rec_every == 0:
                j = k // rec_every; rec[i, j, 0] = V; rec[i, j, 1] = Tinf + Ts + Tv; rec[i, j, 2] = Vd
    return spk, rec


# ------------------------------------------------------------------------------------------- AdEx (2-D)
@njit(cache=True)
def adex_kernel(p, Iapp, A1, f1, A2, f2, site, T, dt, D, seed, maxspk, rec_every):
    """C dV/dt = -gL (V-EL) + gL DT exp((V-VT)/DT) - w + I - gac (V - Vd)
       tau_w dw/dt = a (V-EL) - w ; spike at V >= Vpeak: V <- Vr, w += b
       p = [C, gL, EL, DT, VT, a, tauw, b, Vr, Vpeak, tref, gac, dend, gLd]"""
    np.random.seed(seed)
    C, gL, EL, DT, VT, a, tw, b, Vr, Vpk, tref, gac, dend, gLd = p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13]
    if dend == 0: gac = 0.0
    N = Iapp.size; nst = int(T / dt); spk = np.full((N, maxspk), np.nan); ns = np.zeros(N, np.int64)
    nrec = nst // rec_every + 1 if rec_every > 0 else 1; rec = np.zeros((N, nrec, 3))
    sq = math.sqrt(2 * D * dt)
    for i in range(N):
        V = EL; w = 0.0; Vd = EL; ref = 0.0
        for k in range(nst):
            t = k * dt; I = _drive(t, A1[i], f1[i], A2[i], f2[i])
            Is = Iapp[i] + (I if site != 1 else 0.0); Id = I if site != 0 else 0.0
            dVd = (-gLd * (Vd - EL) - gac * (Vd - V) + Id) / C
            dw = (a * (V - EL) - w) / tw
            if ref > 0:
                ref -= dt
            else:
                ex = gL * DT * math.exp(min((V - VT) / DT, 30.0))
                V += dt * (-gL * (V - EL) + ex - w + Is - gac * (V - Vd)) / C + sq * np.random.randn()
            w += dt * dw; Vd += dt * dVd
            if V >= Vpk:
                if ns[i] < maxspk: spk[i, ns[i]] = t + dt
                ns[i] += 1; V = Vr; w += b; ref = tref
            if rec_every > 0 and k % rec_every == 0:
                j = k // rec_every; rec[i, j, 0] = V; rec[i, j, 1] = w; rec[i, j, 2] = Vd
    return spk, rec


# ------------------------------------------------------------------------------------------- biophysical HH, 2 compartments
HH_KEYS = ['C', 'gL', 'EL', 'ENa', 'EK', 'ECa', 'gNa', 'gNaP', 'gKdr', 'gKA', 'gM', 'gHCa', 'gfKCa', 'gsKCa', 'gh', 'gac',
           'thm', 'sgm', 'thh', 'sgh', 'thht', 'sght', 'thn', 'sgn', 'thnt', 'sgnt', 'thp', 'sgp', 'tha', 'sga', 'thb', 'sgb', 'taub',
           'thz', 'sgz', 'tauz', 'thr', 'sgr', 'taur', 'thc', 'sgc', 'tauc', 'ac', 'aq', 'tauq', 'nu', 'tauCa', 'thhd', 'sghd', 'Eh',
           'tau_hd_mode', 'tau_hd_ms', 'dendrite', 'Iapp_d']


def hh_vec(P):
    Q = dict(P); Q['tau_hd_mode'] = {'fixed': 0.0, 'printed': 1.0, 'code': 2.0}[P['tau_hd']]; Q.setdefault('Iapp_d', 0.0); Q['dendrite'] = 1.0 if P.get('dendrite', True) else 0.0
    return np.array([float(Q[k]) for k in HH_KEYS])


@njit(cache=True)
def _hh_rhs(p, y, Is, Id, dy):
    Vs, h, n, b, z, r, c, Ca, q, Vd, hd = y[0], y[1], y[2], y[3], y[4], y[5], y[6], y[7], y[8], y[9], y[10]
    C, gL, EL, ENa, EK, ECa = p[0], p[1], p[2], p[3], p[4], p[5]
    ca = max(Ca, 1e-9); dend = p[52]; gac = p[15] if dend > 0 else 0.0
    m = _G(Vs, p[16], p[17])
    INaT = p[6] * m * m * m * h * (Vs - ENa)
    INaP = p[7] * _G(Vs, p[26], p[27]) * (Vs - ENa)
    IKdr = p[8] * n ** 4 * (Vs - EK)
    aa = _G(Vs, p[28], p[29]); IKA = p[9] * aa * aa * aa * b * (Vs - EK)
    IM = p[10] * z * (Vs - EK)
    IHCa = p[11] * r * r * (Vs - ECa)
    IfK = p[12] * (1.0 / (1.0 + p[42] / ca)) * c * (Vs - EK)
    IsK = p[13] * q * (Vs - EK)
    dy[0] = (-(gL * (Vs - EL) + INaT + INaP + IKdr + IKA + IM + IHCa + IfK + IsK) - gac * (Vs - Vd) + Is) / C
    dy[1] = (_G(Vs, p[18], p[19]) - h) / (0.1 + 0.75 * _G(Vs, p[20], p[21]))
    dy[2] = (_G(Vs, p[22], p[23]) - n) / (0.1 + 0.5 * _G(Vs, p[24], p[25]))
    dy[3] = (_G(Vs, p[30], p[31]) - b) / p[32]
    dy[4] = (_G(Vs, p[33], p[34]) - z) / p[35]
    dy[5] = (_G(Vs, p[36], p[37]) - r) / p[38]
    dy[6] = (_G(Vs, p[39], p[40]) - c) / p[41]
    dy[7] = -p[45] * IHCa - Ca / p[46]
    dy[8] = (1.0 / (1.0 + (p[43] / ca) ** 4) - q) / p[44]
    if dend > 0:
        Ih = p[14] * hd * (Vd - p[49])
        dy[9] = (-gL * (Vd - EL) - Ih - gac * (Vd - Vs) + p[53] + Id) / C
        if p[50] > 1.5: tau = 1.0 / (math.exp(-17.9 - 0.116 * Vd) + math.exp(-1.84 + 0.09 * Vd)) + 0.1
        elif p[50] > 0.5: tau = 1.0 / (math.exp(-17.9 + 0.116 * Vd) + math.exp(-1.84 + 0.09 * Vd)) + 0.1
        else: tau = p[51]
        dy[10] = (_G(Vd, p[47], -p[48]) - hd) / tau
    else:
        dy[9] = 0.0; dy[10] = 0.0


@njit(cache=True)
def hh2_kernel(p, Iapp, A1, f1, A2, f2, site, T, dt, D, seed, maxspk, rec_every, y0, vth):
    np.random.seed(seed)
    N = Iapp.size; nst = int(T / dt); spk = np.full((N, maxspk), np.nan); ns = np.zeros(N, np.int64)
    nrec = nst // rec_every + 1 if rec_every > 0 else 1; rec = np.zeros((N, nrec, 4)); yend = np.zeros((N, 11))
    sq = math.sqrt(2 * D * dt)
    k1 = np.zeros(11); k2 = np.zeros(11); k3 = np.zeros(11); k4 = np.zeros(11); tmp = np.zeros(11)
    for i in range(N):
        y = y0.copy(); armed = y[0] < vth - 20
        for k in range(nst):
            t = k * dt
            I0 = _drive(t, A1[i], f1[i], A2[i], f2[i]); Ih_ = _drive(t + dt / 2, A1[i], f1[i], A2[i], f2[i]); I1 = _drive(t + dt, A1[i], f1[i], A2[i], f2[i])
            s0 = 1.0 if site != 1 else 0.0; d0 = 1.0 if site != 0 else 0.0
            _hh_rhs(p, y, Iapp[i] + s0 * I0, d0 * I0, k1)
            for j in range(11): tmp[j] = y[j] + dt / 2 * k1[j]
            _hh_rhs(p, tmp, Iapp[i] + s0 * Ih_, d0 * Ih_, k2)
            for j in range(11): tmp[j] = y[j] + dt / 2 * k2[j]
            _hh_rhs(p, tmp, Iapp[i] + s0 * Ih_, d0 * Ih_, k3)
            for j in range(11): tmp[j] = y[j] + dt * k3[j]
            _hh_rhs(p, tmp, Iapp[i] + s0 * I1, d0 * I1, k4)
            for j in range(11): y[j] += dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
            if D > 0: y[0] += sq * np.random.randn()
            if armed and y[0] >= vth:
                if ns[i] < maxspk: spk[i, ns[i]] = t + dt
                ns[i] += 1; armed = False
            elif (not armed) and y[0] < vth - 20:
                armed = True
            if rec_every > 0 and k % rec_every == 0:
                jj = k // rec_every; rec[i, jj, 0] = y[0]; rec[i, jj, 1] = y[9]; rec[i, jj, 2] = y[4]; rec[i, jj, 3] = y[10]
        yend[i] = y
    return spk, rec, yend
