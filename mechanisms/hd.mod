COMMENT
I_h (HCN) with Boltzmann activation.  Mirrors hippsim/kinetics.py:h_inf, h_tau.
kin = 0: bell-shaped tau(V), peak taupeak at vtau (fast HCN1)
kin = 1: Lowet et al. (2023) HHca2 tau(V)
Author: Rebecca (CA1 Morphology Lab), hippsim.
ENDCOMMENT
NEURON {
    SUFFIX hd
    NONSPECIFIC_CURRENT i
    RANGE ghdbar, ehd, vhalfl, kl, taupeak, vtau, h_scale, kin, linf, taul
}
UNITS { (mA) = (milliamp) (mV) = (millivolt) (S) = (siemens) }
PARAMETER {
    ghdbar = 0.00005 (S/cm2)
    ehd = -30 (mV)
    vhalfl = -90 (mV)
    kl = 8.5 (mV)
    taupeak = 40 (ms)
    vtau = -75 (mV)
    h_scale = 1
    kin = 0
}
ASSIGNED { v (mV) i (mA/cm2) linf taul (ms) }
STATE { l }
BREAKPOINT { SOLVE states METHOD cnexp  i = ghdbar*l*(v - ehd) }
INITIAL { rates(v)  l = linf }
DERIVATIVE states { rates(v)  l' = (linf - l)/taul }
PROCEDURE rates(v (mV)) {
    linf = 1/(1 + exp((v - vhalfl)/kl))
    if (kin == 1) {
        taul = h_scale*(1/(exp(-17.9 - 0.116*v) + exp(-1.84 + 0.09*v)) + 0.1)
    } else {
        taul = h_scale*2*taupeak/(exp((v - vtau)/15) + exp(-(v - vtau)/15))
    }
}
