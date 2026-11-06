"""Stimuli and the paper's spike-train analysis (single spikes vs bursts, resonance curves)."""
from __future__ import annotations
import numpy as np

BURST_ISI = 14.0   # ms: spikes closer than this belong to one burst (Ceballos et al. 2025 Methods; Lowet et al. 2023 used 10 ms)


def sine_stim(freqs, amp=1.0, site='soma', phase=1.5 * np.pi):
    """One neuron per frequency: I(t) = amp*sin(2 pi f t + phase). Returns stim(t) -> (I_soma, I_dend)."""
    f = np.asarray(freqs, float) * 1e-3
    z = np.zeros_like(f)
    def stim(t):
        I = amp * np.sin(2 * np.pi * f * t + phase)
        return (I, z) if site == 'soma' else (z, I) if site == 'dend' else (I, I)
    return stim


def theta_gamma_stim(N, a_theta=1.0, a_gamma=2.0, f_theta=10.0, f_gamma=40.0, site='soma'):
    """Paper input: I_theta (10 Hz, 1 uA/cm^2) + I_gamma (40 Hz, 2 uA/cm^2)."""
    z = np.zeros(N)
    def stim(t):
        I = np.full(N, a_theta * np.sin(2 * np.pi * f_theta * 1e-3 * t) + a_gamma * np.sin(2 * np.pi * f_gamma * 1e-3 * t))
        return (I, z) if site == 'soma' else (z, I) if site == 'dend' else (I, I)
    return stim


def events(spk, isi=BURST_ISI):
    """Split a spike train into events. Returns list of arrays (each a single spike or a burst)."""
    spk = np.asarray(spk)
    if spk.size == 0: return []
    cuts = np.flatnonzero(np.diff(spk) >= isi) + 1
    return np.split(spk, cuts)


def classify(spk, t0, T, isi=BURST_ISI):
    """Rates (events/s, first spike of each event counted) of single spikes and bursts after t0, plus ISI CV."""
    spk = np.asarray(spk); spk = spk[spk >= t0]; dur = (T - t0) / 1000.0
    ev = events(spk, isi)
    ss = sum(1 for e in ev if e.size == 1); bs = sum(1 for e in ev if e.size > 1)
    isis = np.diff(spk)
    cv = float(np.std(isis) / np.mean(isis)) if isis.size > 1 else np.nan
    return dict(ss_rate=ss / dur, bs_rate=bs / dur, rate=spk.size / dur, cv=cv,
                spb=float(np.mean([e.size for e in ev if e.size > 1])) if bs else 0.0)


def resonance(freqs, results, t0, T):
    """Resonance summary for single spikes (SS) and bursts (BS): peak frequency and peak rate, and the
    paper's differences df = f_SS - f_BS, dA = A_SS - A_BS."""
    C = [classify(s, t0, T) for s in results['spikes']]
    ss = np.array([c['ss_rate'] for c in C]); bs = np.array([c['bs_rate'] for c in C])
    fss = freqs[int(np.argmax(ss))] if ss.max() > 0 else np.nan
    fbs = freqs[int(np.argmax(bs))] if bs.max() > 0 else np.nan
    return dict(ss=ss, bs=bs, cv=np.array([c['cv'] for c in C]), f_ss=fss, f_bs=fbs,
                A_ss=ss.max(), A_bs=bs.max(), df=fss - fbs, dA=ss.max() - bs.max())


def silence_burst_probability(spike_trains, t0, bins=(0, 20, 40, 60, 80, 100, 150, 250, 500, 1e9), isi=BURST_ISI):
    """Paper Fig 6–7 analysis: for every event, the silent interval before it (start of event minus last spike of
    the previous event). Returns bin edges, counts of SS and BS per bin and P(burst | silence bin)."""
    sil, kind = [], []
    for spk in spike_trains:
        spk = np.asarray(spk); spk = spk[spk >= t0]; ev = events(spk, isi)
        for a, b in zip(ev[:-1], ev[1:]):
            sil.append(b[0] - a[-1]); kind.append(b.size > 1)
    sil = np.array(sil); kind = np.array(kind, bool); edges = np.array(bins, float)
    ss = np.histogram(sil[~kind], edges)[0]; bs = np.histogram(sil[kind], edges)[0]
    with np.errstate(invalid='ignore', divide='ignore'):
        p = bs / (ss + bs)
    return dict(edges=edges, ss=ss, bs=bs, p_bs=p, n=int(sil.size))
