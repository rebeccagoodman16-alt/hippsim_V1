"""Fit reduced spiking models (GLIF, AdEx) to the biophysical model, the way the Allen Institute fit GLIFs to
recordings (Teeter et al. 2018): passive/subthreshold parameters first (here from the linearisation in reduce.py),
then spiking parameters by optimisation against
  (1) the f–I curve (DC steps), and
  (2) single-spike and burst event rates under the paper's sinusoidal drive at a few frequencies.
"""
from __future__ import annotations
import numpy as np
from scipy.optimize import differential_evolution
from .run import run
from .analysis import classify
from .reduce import steady_state, reduce_2d

I_FI = np.arange(0.0, 6.01, 0.5)
F_RES = np.array([4.0, 8.0, 12.0, 16.0, 25.0, 40.0, 70.0])


def targets(P_hh, A=2.0, Iapp=1.0, site='both', T=3000.0):
    fi = run('hh2', P_hh, N=len(I_FI), T=T, Iapp=I_FI)
    rs = run('hh2', P_hh, N=len(F_RES), T=T, Iapp=Iapp, A1=A, f1=F_RES, site=site)
    C = [classify(s, 500, T) for s in rs['spikes']]
    return dict(fi=np.array([classify(s, 500, T)['rate'] for s in fi['spikes']]),
                ss=np.array([c['ss_rate'] for c in C]), bs=np.array([c['bs_rate'] for c in C]), A=A, Iapp=Iapp, T=T)


def features(model, P, tg, dt=0.05):
    T = tg['T']
    fi = run(model, P, N=len(I_FI), T=T, Iapp=I_FI, dt=dt)
    rs = run(model, P, N=len(F_RES), T=T, Iapp=tg['Iapp'], A1=tg['A'], f1=F_RES, site='soma', dt=dt)
    C = [classify(s, 500, T) for s in rs['spikes']]
    return dict(fi=np.array([classify(s, 500, T)['rate'] for s in fi['spikes']]),
                ss=np.array([c['ss_rate'] for c in C]), bs=np.array([c['bs_rate'] for c in C]))


def loss(f, tg):
    s = max(tg['fi'].max(), 1.0)
    return float(np.mean((f['fi'] - tg['fi']) ** 2) / s ** 2 + np.mean((f['ss'] - tg['ss']) ** 2 + (f['bs'] - tg['bs']) ** 2) / s ** 2)


def adex_base(P_hh, Iapp_hold=1.0):
    """Subthreshold AdEx parameters from the 2-D reduction (g_L, a, tau_w, E_L)."""
    Q, ys = steady_state(P_hh, Iapp_hold); R = reduce_2d(P_hh, ys, 'M')
    EL = ys[0] - Iapp_hold / (R['gLeff'] + R['g1'])
    return dict(C=1.0, gL=R['gLeff'], a=R['g1'], tauw=R['tau1'], EL=EL, DT=3.2, Vpeak=0.0, tref=0.5, gac=0.0, dendrite=0, gLd=0.04)


def fit_adex(P_hh, tg, maxiter=25, seed=0, free_sub=False):
    base = adex_base(P_hh, tg['Iapp'])
    names = ['VT', 'b', 'Vr', 'DT'] + (['gL', 'a'] if free_sub else [])
    bounds = [(base['EL'] + 2, base['EL'] + 25), (0.0, 1.0), (-70.0, -40.0), (0.5, 6.0)] + ([(0.005, 0.2), (0.0, 1.0)] if free_sub else [])
    def obj(x):
        P = dict(base); P.update(zip(names, x)); return loss(features('adex', P, tg, dt=0.05), tg)
    res = differential_evolution(obj, bounds, maxiter=maxiter, popsize=10, seed=seed, tol=1e-3, polish=False)
    P = dict(base); P.update(zip(names, res.x)); return P, res.fun


def fit_glif(P_hh, tg, maxiter=25, seed=0):
    """GLIF5-style: G, E_L from the reduction's effective leak at rest; fit threshold, reset and three after-spike currents."""
    Q, ys = steady_state(P_hh, 0.0); R = reduce_2d(P_hh, ys, 'M')
    base = dict(C=1.0, G=R['gLeff'] + R['g1'], EL=ys[0], fv=0.0, tref=2.0, k1=0.1, R1=1.0, k2=1 / 450, R2=1.0, k3=0.05, R3=0.0,
                bs=0.1, dTs=0.0, av=0.0, bv=0.1, gac=0.0, dendrite=0)
    names = ['Tinf', 'dV', 'A1', 'A2', 'A3', 'dTs']
    bounds = [(base['EL'] + 2, base['EL'] + 25), (-25.0, 15.0), (-3.0, 0.0), (-1.0, 0.0), (0.0, 3.0), (0.0, 6.0)]
    def obj(x):
        P = dict(base); P.update(zip(names, x)); return loss(features('glif', P, tg), tg)
    res = differential_evolution(obj, bounds, maxiter=maxiter, popsize=10, seed=seed, tol=1e-3, polish=False)
    P = dict(base); P.update(zip(names, res.x)); return P, res.fun
