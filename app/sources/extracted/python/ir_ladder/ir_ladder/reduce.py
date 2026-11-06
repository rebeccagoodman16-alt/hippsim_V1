"""Model reduction in the Pena–Rotstein framework.

Full linearisation:  around a subthreshold steady state y*, dy/dt ≈ J (y - y*) + e_0 I(t)/C, so the input
impedance at the soma is Z(w) = e_0^T (i w I - J)^{-1} e_0 / C (exact for small inputs; all 11 variables).

Derivative-conductance view (Pena, Ceballos, Lima & Roque 2018 PRE 97:042408): each gated current
I_x = g_x x (V - E_x) contributes a chord conductance g_x x* (instantaneous) and a derivative conductance
    G_x^Der = g_x (V* - E_x) dx_inf/dV |V*
that acts through a first-order filter 1/(1 + i w tau_x). The cell is resonant when slow, positive G^Der
(I_M, I_h) dominates; negative G^Der (I_NaP if slow) amplifies.

2-D reduction (Richardson et al. 2003; Pena & Rotstein 2022 Biol Cybern):
    C dv/dt = -g_L,eff v - g_1 w + I,   tau_1 dw/dt = v - w
with g_1 = G^Der of the slow resonant current, tau_1 its time constant, and g_L,eff = leak + chord
conductances + slope conductances of every fast/instantaneous gate (+ the dendritic branch at DC).
"""
from __future__ import annotations
import numpy as np
from .models import G, hh_init, hh_rhs, tau_hd


def steady_state(P, Iapp=None, T=8000.0, dt=0.05):
    Q = dict(P); Q['Iapp'] = P['Iapp'] if Iapp is None else Iapp
    y = hh_init(Q, 1); z = np.zeros(1)
    for _ in range(int(T / dt)):
        k1 = hh_rhs(Q, y, z, z); k2 = hh_rhs(Q, y + dt / 2 * k1, z, z); k3 = hh_rhs(Q, y + dt / 2 * k2, z, z); k4 = hh_rhs(Q, y + dt * k3, z, z)
        y = y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
    return Q, y[:, 0]


def jacobian(Q, ys, eps=1e-6):
    n = ys.size; J = np.zeros((n, n)); z = np.zeros(1)
    f0 = hh_rhs(Q, ys[:, None], z, z)[:, 0]
    for j in range(n):
        e = eps * max(1.0, abs(ys[j])); yy = ys.copy(); yy[j] += e
        J[:, j] = (hh_rhs(Q, yy[:, None], z, z)[:, 0] - f0) / e
    if not Q.get('dendrite', True):   # remove the frozen dendritic rows/cols
        keep = list(range(9)); J = J[np.ix_(keep, keep)]
    return J


def impedance_full(P, f, Iapp=None):
    """|Z| (kOhm cm^2 = mV per uA/cm^2) of the fully linearised model at the soma; also returns the state."""
    Q, ys = steady_state(P, Iapp); J = jacobian(Q, ys); n = J.shape[0]
    Z = np.array([np.linalg.solve(1j * 2 * np.pi * fk * 1e-3 * np.eye(n) - J, np.eye(n)[:, 0])[0] / Q['C'] for fk in np.atleast_1d(f)])
    return np.abs(Z), ys, J


def derivative_conductances(P, ys):
    """Chord and derivative conductances (mS/cm^2) of each gated current at the steady state ys."""
    Vs, Vd = ys[0], ys[9]; d = lambda fn, V, e=1e-4: (fn(V + e) - fn(V - e)) / (2 * e)
    out = {
        'NaP': (P['gNaP'] * G(Vs, P['thp'], P['sgp']), P['gNaP'] * (Vs - P['ENa']) * d(lambda v: G(v, P['thp'], P['sgp']), Vs), 0.0),
        'Kdr': (P['gKdr'] * ys[2] ** 4, P['gKdr'] * (Vs - P['EK']) * 4 * ys[2] ** 3 * d(lambda v: G(v, P['thn'], P['sgn']), Vs), 0.1 + 0.5 * G(Vs, P['thnt'], P['sgnt'])),
        'KA_b': (P['gKA'] * G(Vs, P['tha'], P['sga']) ** 3 * ys[3], P['gKA'] * G(Vs, P['tha'], P['sga']) ** 3 * (Vs - P['EK']) * d(lambda v: G(v, P['thb'], P['sgb']), Vs), P['taub']),
        'M': (P['gM'] * ys[4], P['gM'] * (Vs - P['EK']) * d(lambda v: G(v, P['thz'], P['sgz']), Vs), P['tauz']),
    }
    if P.get('dendrite', True):
        out['h (dendrite)'] = (P['gh'] * ys[10], P['gh'] * (Vd - P['Eh']) * d(lambda v: G(v, P['thhd'], -P['sghd']), Vd), float(tau_hd(P, np.array([Vd]))[0]))
    return out


def reduce_2d(P, ys, keep='M'):
    """Linear 2-D model (g_L,eff, g_1, tau_1) at the steady state, keeping one slow resonant gate.
    g_L,eff is the zero-frequency-limit-free part: slope of all currents with the kept gate frozen."""
    Q = dict(P); J = jacobian(Q, ys); C = Q['C']; n = J.shape[0]
    D = derivative_conductances(P, ys)
    g1, tau1 = (D['M'][1], D['M'][2]) if keep == 'M' else (D['h (dendrite)'][1], D['h (dendrite)'][2])
    # effective leak = soma admittance at a frequency where fast gates have equilibrated but the kept gate has not:
    # take the full linear model with the kept gate clamped (remove its row/col) and read its DC conductance.
    idx = 4 if keep == 'M' else 10
    keepi = [i for i in range(n) if i != idx]
    Jc = J[np.ix_(keepi, keepi)]
    Zdc = np.linalg.solve(-Jc, np.eye(len(keepi))[:, 0])[0] / C
    gLeff = 1.0 / Zdc
    if keep == 'h': g1 *= (Q['gac'] / (Q['gac'] + Q['gL'] + Q['gh'] * ys[10])) ** 2   # dendritic gate seen through the coupling
    return dict(C=C, gLeff=gLeff, g1=g1, tau1=tau1)


def impedance_2d(R, f):
    w = 2 * np.pi * np.asarray(f) * 1e-3
    return np.abs(1.0 / (1j * w * R['C'] + R['gLeff'] + R['g1'] / (1 + 1j * w * R['tau1'])))


def fres(f, Z):
    i = int(np.argmax(Z)); return float(f[i]) if 0 < i < len(f) - 1 else 0.0
