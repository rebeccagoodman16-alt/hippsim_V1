COMMENT
Slow non-inactivating K+ M-current (Pospischil et al. 2008). Mirrors kinetics.m_inf, m_tau.
ENDCOMMENT
NEURON {
    SUFFIX kmp
    USEION k READ ek WRITE ik
    RANGE gbar, taumax
}
UNITS { (mA) = (milliamp) (mV) = (millivolt) (S) = (siemens) }
PARAMETER { gbar = 0 (S/cm2)  taumax = 1000 (ms) }
ASSIGNED { v (mV) ek (mV) ik (mA/cm2) zinf tauz (ms) }
STATE { z }
BREAKPOINT { SOLVE states METHOD cnexp  ik = gbar*z*(v - ek) }
INITIAL { rates(v)  z = zinf }
DERIVATIVE states { rates(v)  z' = (zinf - z)/tauz }
PROCEDURE rates(v (mV)) {
    zinf = 1/(1 + exp(-(v + 35)/10))
    tauz = taumax/(3.3*exp((v + 35)/20) + exp(-(v + 35)/20))
}
