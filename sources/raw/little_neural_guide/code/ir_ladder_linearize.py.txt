"""Derive the GLIF-IR (2-D) model from the biophysical model by linearising around a subthreshold rest.

For each gated current I_x = g_x * x * (V - E_x) with x relaxing to x_inf(V) with time constant tau_x, a small
perturbation around V* gives (Richardson, Brunel & Hakim 2003; Koch 1999 ch. 10):
    instantaneous part:   g_x x_inf(V*)                         -> adds to the leak
    gated part:           g_x (V* - E_x) x_inf'(V*) * w_x,  tau_x dw_x/dt = (V - V*) - w_x
If g_x (V* - E_x) x_inf' > 0 the gate opposes voltage changes after a delay: a *resonant* current (Ih, IM).
If < 0 it amplifies them (INaP, if it were slow).

The 2-D model keeps one resonant variable. Option 'h' keeps dendritic Ih only (the paper's added resonance),
'M' keeps somatic IM only, 'hM' lumps both with a conductance-weighted time constant. Fast gates (tau < 2 ms) and
instantaneous gates (m, p, a) go into the effective leak. The dendrite is folded into the soma through the
two-compartment input conductance at low frequency: with equal compartments, the dendritic branch seen from the
soma is g_ac*g_d/(g_ac+g_d).
"""
from __future__ import annotations
import numpy as np
from scipy.optimize import brentq
from .models import G, hh_init, hh_rhs, tau_hd


def _dG(V, th, sg, e=1e-4):
    return (G(V + e, th, sg) - G(V - e, th, sg)) / (2 * e)


def rest_state(P, Iapp=None, V_guess=-70.0):
    """Steady state of the full model with Iapp (default P['Iapp']) and no oscillatory input, by integrating
    to rest with spiking suppressed if needed. Returns V_soma, V_dend, and the state vector."""
    Q = dict(P); Q['Iapp'] = P['Iapp'] if Iapp is None else Iapp
    y = hh_init(Q, 1, V_guess); z = np.zeros(1); dt = 0.05
    for _ in range(int(3000 / dt)):
        y = y + dt * hh_rhs(Q, y, z, z)
    return float(y[0, 0]), float(y[9, 0]), y


def glif_from_hh(P, Iapp_hold=0.0, keep='h', Vth=-50.0, Vreset=-60.0, tref=2.0, b_w=0.0):
    """Return GLIF-IR parameters linearised from the HH model held at Iapp_hold (subthreshold).
    The GLIF model is then driven with Iapp_lin = P['Iapp'] - Iapp_hold so it sees the same DC step."""
    Vs, Vd, y = rest_state(P, Iapp_hold)
    sg = lambda k: P[k]
    # somatic instantaneous / fast conductances at rest (slope of the steady-state I-V without slow gates)
    m = G(Vs, P['thm'], P['sgm']); h = y[1, 0]; n = y[2, 0]; b = y[3, 0]; z = y[4, 0]
    dI = 1e-3
    def Iss_fast(V):   # fast/instantaneous currents with slow gates (b, z, q, Ca) frozen at rest
        hh_ = G(V, P['thh'], P['sgh']); nn = G(V, P['thn'], P['sgn'])
        return (P['gL'] * (V - P['EL']) + P['gNa'] * G(V, P['thm'], P['sgm']) ** 3 * hh_ * (V - P['ENa'])
                + P['gNaP'] * G(V, P['thp'], P['sgp']) * (V - P['ENa']) + P['gKdr'] * nn ** 4 * (V - P['EK'])
                + P['gKA'] * G(V, P['tha'], P['sga']) ** 3 * b * (V - P['EK']) + P['gM'] * z * (V - P['EK']))
    g_soma = (Iss_fast(Vs + dI) - Iss_fast(Vs - dI)) / (2 * dI)
    # dendrite: leak + instantaneous part of Ih
    hd = y[10, 0]; g_d = P['gL'] + P['gh'] * hd if P.get('dendrite', True) else 0.0
    g_branch = P['gac'] * g_d / (P['gac'] + g_d) if P.get('dendrite', True) else 0.0
    # resonant parts
    gw_h = gw_M = 0.0
    if P.get('dendrite', True):
        att = (P['gac'] / (P['gac'] + g_d)) ** 2     # dendritic conductance change seen at the soma (DC transfer, squared)
        gw_h = att * P['gh'] * (Vd - P['Eh']) * _dG(Vd, P['thhd'], -P['sghd'])
    gw_M = P['gM'] * (Vs - P['EK']) * _dG(Vs, P['thz'], P['sgz'])
    tau_h = float(tau_hd(P, np.array([Vd]))[0]); tau_M = P['tauz']
    if keep == 'h': g_w, tau_w = gw_h, tau_h
    elif keep == 'M': g_w, tau_w = gw_M, tau_M
    else: g_w = gw_h + gw_M; tau_w = (gw_h * tau_h + gw_M * tau_M) / max(g_w, 1e-12)
    return dict(C=P['C'], V0=Vs, gL_eff=g_soma + g_branch, g_w=g_w, tau_w=tau_w, Iapp_lin=P['Iapp'] - Iapp_hold,
                Vth=Vth, Vreset=Vreset, tref=tref, b_w=b_w, dend_gain=P['gac'] / (P['gac'] + g_d) if P.get('dendrite', True) else 0.0,
                _rest=dict(Vs=Vs, Vd=Vd, gw_h=gw_h, gw_M=gw_M, tau_h=tau_h, tau_M=tau_M, g_soma=g_soma, g_branch=g_branch))


def impedance_glif(G2, f):
    """Subthreshold impedance |Z(f)| (kOhm cm^2) of the linear GLIF-IR model."""
    w = 2 * np.pi * np.asarray(f) * 1e-3
    return np.abs(1.0 / (1j * w * G2['C'] + G2['gL_eff'] + G2['g_w'] / (1 + 1j * w * G2['tau_w'])))


def resonance_frequency(G2):
    """Analytic peak of |Z| for the 2-D linear model (Hz); NaN if no resonance."""
    f = np.linspace(0.1, 100, 4000); Z = impedance_glif(G2, f); i = int(np.argmax(Z))
    return float(f[i]) if 0 < i < len(f) - 1 else float('nan')
