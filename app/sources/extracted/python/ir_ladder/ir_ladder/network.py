"""A small CA1 circuit to test whether the single-cell split (bursts lock to theta, single spikes to gamma; Lowet et al.
2023) survives inside a network.

Cells (adaptive exponential IF, per-area units: uF/cm^2, mS/cm^2, uA/cm^2, mV, ms):
  PYR  pyramidal cells: the AdEx fitted to the biophysical model (fit.py; a, tau_w from the linearised I_M)
  PV   fast-spiking perisomatic interneurons (basket-like): no adaptation, brief refractoriness
  OLM  oriens–lacunosum-moleculare interneurons: slow resonant variable (Ih-like) and spike-frequency adaptation
Inputs (inhomogeneous Poisson, conductance-based AMPA):
  EC3  temporoammonic input, theta-modulated (to PYR)                       -> theta drive at the distal tuft
  CA3  Schaffer input, gamma-modulated with theta-nested amplitude (to PYR and PV)
Connectivity (random, conductance-based, exponential synapses):
  PYR->PV, PYR->OLM (AMPA); PV->PYR, PV->PV (GABA_A, fast); OLM->PYR (GABA_A, slow, dendritic-like)
This is a toy circuit for hypothesis testing, not a calibrated CA1 model; cell numbers and weights are illustrative.
"""
from __future__ import annotations
import math
import numpy as np
from numba import njit

PYR = dict(C=1.0, gL=0.0361, EL=-57.05, DT=4.39, VT=-51.80, a=0.5776, tauw=75.0, b=0.8805, Vr=-68.69, Vpk=0.0, tref=0.5)
PV = dict(C=1.0, gL=0.1, EL=-65.0, DT=1.0, VT=-52.0, a=0.0, tauw=10.0, b=0.0, Vr=-62.0, Vpk=0.0, tref=1.0)
OLM = dict(C=1.0, gL=0.05, EL=-64.0, DT=2.0, VT=-52.0, a=0.15, tauw=120.0, b=0.15, Vr=-56.0, Vpk=0.0, tref=1.0)

DEFAULT = dict(N_pyr=200, N_pv=40, N_olm=20, T=4000.0, dt=0.05, seed=1,
               f_theta=8.0, f_gamma=40.0,
               ec_rate=800.0, ec_mod=0.8, g_ec=0.0006,                # EC3 -> PYR: summed rate (Hz) per cell, modulation depth, conductance per event
               ca3_rate=800.0, ca3_mod=0.8, ca3_nest=0.6, g_ca3=0.0006, g_ca3_pv=0.002,
               p_ep=0.2, p_eo=0.2, p_pe=0.3, p_pp=0.3, p_oe=0.3,
               g_ep=0.01, g_eo=0.01, g_pe=0.012, g_pp=0.01, g_oe=0.006,
               tau_ampa=3.0, tau_gaba=8.0, tau_olm=20.0, E_e=0.0, E_i=-75.0, I_pyr=0.0, I_pv=0.0, I_olm=0.0,
               pyr_jitter=1.0)


def _cellvec(c):
    return np.array([c['C'], c['gL'], c['EL'], c['DT'], c['VT'], c['a'], c['tauw'], c['b'], c['Vr'], c['Vpk'], c['tref']])


@njit(cache=True)
def _net(cp, cv, co, n_e, n_p, n_o, W_ep, W_eo, W_pe, W_pp, W_oe, VTj, pr, T, dt, seed, maxspk):
    np.random.seed(seed)
    N = n_e + n_p + n_o; nst = int(T / dt)
    V = np.empty(N); w = np.zeros(N); ref = np.zeros(N)
    ge = np.zeros(N); gi = np.zeros(N); go = np.zeros(N)
    spk_t = np.empty(maxspk); spk_i = np.empty(maxspk, np.int64); ns = 0
    for i in range(N):
        V[i] = cp[2] if i < n_e else (cv[2] if i < n_e + n_p else co[2])
    (f_th, f_ga, ec_r, ec_m, g_ec, ca_r, ca_m, nest, g_ca, g_cap, t_a, t_g, t_o, Ee, Ei, I_e, I_p, I_o) = (pr[0], pr[1], pr[2], pr[3], pr[4], pr[5], pr[6], pr[7], pr[8], pr[9], pr[10], pr[11], pr[12], pr[13], pr[14], pr[15], pr[16], pr[17])
    da = math.exp(-dt / t_a); dg = math.exp(-dt / t_g); do_ = math.exp(-dt / t_o)
    fired = np.zeros(N, np.bool_)
    for k in range(nst):
        t = k * dt; th = math.cos(2 * math.pi * f_th * 1e-3 * t); gm = math.cos(2 * math.pi * f_ga * 1e-3 * t)
        r_ec = ec_r * (1 + ec_m * th) * 1e-3 * dt                                # expected EC events per step per PYR
        amp = 1 + nest * th
        r_ca = max(ca_r * (1 + ca_m * gm) * amp * 1e-3 * dt, 0.0)
        # external Poisson drive
        for i in range(n_e):
            ge[i] += g_ec * np.random.poisson(max(r_ec, 0.0)) + g_ca * np.random.poisson(r_ca)
        for i in range(n_e, n_e + n_p):
            ge[i] += g_cap * np.random.poisson(r_ca)
        # recurrent input from last step's spikes
        for j in range(N):
            if fired[j]:
                if j < n_e:
                    for i in range(n_p): ge[n_e + i] += W_ep[i, j]
                    for i in range(n_o): ge[n_e + n_p + i] += W_eo[i, j]
                elif j < n_e + n_p:
                    jj = j - n_e
                    for i in range(n_e): gi[i] += W_pe[i, jj]
                    for i in range(n_p): gi[n_e + i] += W_pp[i, jj]
                else:
                    jj = j - n_e - n_p
                    for i in range(n_e): go[i] += W_oe[i, jj]
        for i in range(N):
            c = cp if i < n_e else (cv if i < n_e + n_p else co)
            Ib = I_e if i < n_e else (I_p if i < n_e + n_p else I_o)
            VT = c[4] + (VTj[i] if i < n_e else 0.0)
            fired[i] = False
            dw = (c[5] * (V[i] - c[2]) - w[i]) / c[6]
            if ref[i] > 0:
                ref[i] -= dt
            else:
                Isyn = ge[i] * (Ee - V[i]) + gi[i] * (Ei - V[i]) + go[i] * (Ei - V[i])
                ex = c[1] * c[3] * math.exp(min((V[i] - VT) / c[3], 30.0))
                V[i] += dt * (-c[1] * (V[i] - c[2]) + ex - w[i] + Ib + Isyn) / c[0]
            w[i] += dt * dw
            if V[i] >= c[9]:
                V[i] = c[8]; w[i] += c[7]; ref[i] = c[10]; fired[i] = True
                if ns < maxspk: spk_t[ns] = t + dt; spk_i[ns] = i
                ns += 1
            ge[i] *= da; gi[i] *= dg; go[i] *= do_
    return spk_t[:min(ns, maxspk)], spk_i[:min(ns, maxspk)]


def simulate(**over):
    P = dict(DEFAULT); P.update(over); rng = np.random.default_rng(P['seed'])
    ne, npv, no = P['N_pyr'], P['N_pv'], P['N_olm']
    W = lambda n_post, n_pre, p, g: (rng.random((n_post, n_pre)) < p) * g / max(1.0, p * n_pre) * 10   # total ≈ 10 g per cell
    W_ep, W_eo = W(npv, ne, P['p_ep'], P['g_ep']), W(no, ne, P['p_eo'], P['g_eo'])
    W_pe, W_pp, W_oe = W(ne, npv, P['p_pe'], P['g_pe']), W(npv, npv, P['p_pp'], P['g_pp']), W(ne, no, P['p_oe'], P['g_oe'])
    VTj = np.zeros(ne + npv + no); VTj[:ne] = rng.normal(0, P['pyr_jitter'], ne)
    pr = np.array([P[k] for k in ['f_theta', 'f_gamma', 'ec_rate', 'ec_mod', 'g_ec', 'ca3_rate', 'ca3_mod', 'ca3_nest', 'g_ca3', 'g_ca3_pv',
                                   'tau_ampa', 'tau_gaba', 'tau_olm', 'E_e', 'E_i', 'I_pyr', 'I_pv', 'I_olm']], float)
    t, i = _net(_cellvec(PYR), _cellvec(PV), _cellvec(OLM), ne, npv, no, W_ep, W_eo, W_pe, W_pp, W_oe, VTj, pr, P['T'], P['dt'], P['seed'], 2_000_000)
    return dict(t=t, i=i, P=P)


def analyse(res, t0=500.0, isi=14.0):
    """Per-population rates; for PYR, single-spike vs burst events and their phase locking (vector strength and mean phase)
    to the theta and gamma input cycles, as in Lowet et al. 2023."""
    P = res['P']; ne, npv = P['N_pyr'], P['N_pv']; t, i = res['t'], res['i']; dur = (P['T'] - t0) / 1000
    m = t >= t0
    out = dict(rate_pyr=np.sum(m & (i < ne)) / ne / dur, rate_pv=np.sum(m & (i >= ne) & (i < ne + npv)) / npv / dur,
               rate_olm=np.sum(m & (i >= ne + npv)) / P['N_olm'] / dur)
    ss, bs = [], []
    for c in range(ne):
        s = np.sort(t[(i == c) & m])
        if s.size == 0: continue
        cuts = np.flatnonzero(np.diff(s) >= isi) + 1
        for e in np.split(s, cuts): (bs if e.size > 1 else ss).append(e[0])
    ss, bs = np.array(ss), np.array(bs)
    def lock(x, f):
        if x.size < 5: return (np.nan, np.nan)
        z = np.exp(1j * 2 * np.pi * f * 1e-3 * x); return (float(np.abs(z.mean())), float(np.degrees(np.angle(z.mean())) % 360))
    out.update(ss_rate=ss.size / ne / dur, bs_rate=bs.size / ne / dur, frac_burst_spikes=None,
               ss_theta=lock(ss, P['f_theta']), bs_theta=lock(bs, P['f_theta']), ss_gamma=lock(ss, P['f_gamma']), bs_gamma=lock(bs, P['f_gamma']))
    return out
