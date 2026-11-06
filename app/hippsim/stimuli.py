"""Current waveforms on a uniform time grid. All return (t, I) with t in ms, I in the caller's units (nA for cells).

Every stimulus starts after `delay` (ms) so the cell sits at rest first.
"""
from __future__ import annotations

import numpy as np


def grid(T: float, dt: float) -> np.ndarray:
    return np.arange(0.0, T + dt / 2, dt)


def step(amp, dur, delay=100.0, post=100.0, dt=0.025, hold=0.0):
    t = grid(delay + dur + post, dt)
    return t, hold + np.where((t >= delay) & (t < delay + dur), amp, 0.0)


def ramp(amp_end, dur, delay=100.0, post=100.0, dt=0.025, hold=0.0):
    t = grid(delay + dur + post, dt)
    u = np.clip((t - delay) / dur, 0, 1)
    return t, hold + np.where(t < delay + dur, amp_end * u, 0.0)


def sine(amp, freq_hz, dur, delay=100.0, post=100.0, dt=0.025, hold=0.0):
    t = grid(delay + dur + post, dt)
    on = (t >= delay) & (t < delay + dur)
    return t, hold + np.where(on, amp * np.sin(2 * np.pi * freq_hz * (t - delay) / 1000), 0.0)


def zap(amp, f0=0.5, f1=20.0, dur=10000.0, delay=100.0, post=100.0, dt=0.025, hold=0.0):
    """Linear chirp f0→f1 Hz (Hutcheon & Yarom 2000)."""
    t = grid(delay + dur + post, dt)
    u = t - delay
    phase = 2 * np.pi * (f0 * u + (f1 - f0) * u ** 2 / (2 * dur)) / 1000
    return t, hold + np.where((u >= 0) & (u < dur), amp * np.sin(phase), 0.0)


def epsc_train(amp, freq_hz, dur, tau=2.0, delay=100.0, post=100.0, dt=0.025, hold=0.0):
    """Alpha-shaped EPSCs (peak = amp at t = tau) at a fixed rate."""
    t = grid(delay + dur + post, dt)
    I = np.zeros_like(t)
    for tk in np.arange(delay, delay + dur, 1000 / freq_hz):
        u = (t - tk) / tau
        m = (u >= 0) & (u < 15)
        I[m] += amp * u[m] * np.exp(1 - u[m])
    return t, hold + I


def theta_gamma(A_theta, f_theta, A_gamma, f_gamma, dur, delay=100.0, post=0.0, dt=0.025, hold=0.0):
    """Sum of theta and gamma sinusoids (Ceballos et al. 2025 drive)."""
    t = grid(delay + dur + post, dt)
    u = (t - delay) / 1000
    on = (t >= delay) & (t < delay + dur)
    return t, hold + np.where(on, A_theta * np.sin(2 * np.pi * f_theta * u) + A_gamma * np.sin(2 * np.pi * f_gamma * u), 0.0)


def ou_noise(mean, sigma, tau, dur, delay=0.0, dt=0.025, seed=0):
    """Ornstein–Uhlenbeck current (exact update)."""
    rng = np.random.default_rng(seed)
    t = grid(delay + dur, dt)
    a = np.exp(-dt / tau)
    x = np.empty_like(t)
    x[0] = mean
    z = rng.standard_normal(len(t))
    for k in range(1, len(t)):
        x[k] = mean + (x[k - 1] - mean) * a + sigma * np.sqrt(1 - a * a) * z[k]
    return t, np.where(t >= delay, x, 0.0)


REGISTRY = {"step": step, "ramp": ramp, "sine": sine, "zap": zap, "epsc_train": epsc_train,
            "theta_gamma": theta_gamma, "ou_noise": ou_noise}


def make(kind: str, **kw):
    return REGISTRY[kind](**kw)
