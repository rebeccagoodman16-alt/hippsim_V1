"""Friendly wrappers around the numba kernels: one call = N neurons, one stimulus condition each."""
from __future__ import annotations
import numpy as np
from . import fast
from .models import hh_init

SITES = {'soma': 0, 'dend': 1, 'both': 2}


def _arr(x, N):
    a = np.asarray(x, float)
    return np.full(N, float(a)) if a.ndim == 0 else a.astype(float)


def _spikes(spk):
    return [row[~np.isnan(row)] for row in spk]


def stim_arrays(N, Iapp, A1=0.0, f1=0.0, A2=0.0, f2=0.0):
    return [_arr(v, N) for v in (Iapp, A1, f1, A2, f2)]


def run(model, P, N=1, T=2000.0, dt=None, D=0.0, seed=1, Iapp=None, A1=0.0, f1=0.0, A2=0.0, f2=0.0,
        site='soma', maxspk=4000, rec_every=0, y0=None, vth=-20.0):
    """model: 'lif2' | 'glif' | 'adex' | 'hh2'. P: parameter dict for that model.
    Returns dict(spikes=list of arrays, rec=array or None, dt=dt, T=T)."""
    Iapp = P.get('Iapp', 0.0) if Iapp is None else Iapp
    st = stim_arrays(N, Iapp, A1, f1, A2, f2); s = SITES[site]
    if model == 'lif2':
        dt = dt or 0.05
        p = np.array([P['C'], P['gL'], P['EL'], P['gac'], P['Vth'], P['Vreset'], P['tref'], float(P.get('dendrite', True))])
        spk, rec = fast.lif2_kernel(p, *st, s, T, dt, D, seed, maxspk, rec_every)
    elif model == 'glif':
        dt = dt or 0.05
        keys = ['C', 'G', 'EL', 'Tinf', 'fv', 'dV', 'tref', 'k1', 'A1', 'R1', 'k2', 'A2', 'R2', 'k3', 'A3', 'R3', 'bs', 'dTs', 'av', 'bv', 'gac', 'dendrite']
        p = np.array([float(P.get(k, 0.0)) for k in keys])
        spk, rec = fast.glif_kernel(p, *st, s, T, dt, D, seed, maxspk, rec_every)
    elif model == 'adex':
        dt = dt or 0.02
        keys = ['C', 'gL', 'EL', 'DT', 'VT', 'a', 'tauw', 'b', 'Vr', 'Vpeak', 'tref', 'gac', 'dendrite', 'gLd']
        p = np.array([float(P.get(k, 0.0)) for k in keys])
        spk, rec = fast.adex_kernel(p, *st, s, T, dt, D, seed, maxspk, rec_every)
    elif model == 'hh2':
        dt = dt or 0.02
        y0 = hh_init(P, 1)[:, 0] if y0 is None else np.asarray(y0, float)
        spk, rec, yend = fast.hh2_kernel(fast.hh_vec(P), *st, s, T, dt, D, seed, maxspk, rec_every, y0, vth)
        return dict(spikes=_spikes(spk), rec=rec[:, :-1] if rec_every else None, dt=dt, T=T, yend=yend)
    else:
        raise ValueError(model)
    return dict(spikes=_spikes(spk), rec=rec[:, :-1] if rec_every else None, dt=dt, T=T)
