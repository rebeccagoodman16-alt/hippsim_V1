COMMENT
Traub-Miles delayed-rectifier K+ (Pospischil et al. 2008). Mirrors kinetics.kdr_rates.
ENDCOMMENT
NEURON {
    SUFFIX kdrtm
    USEION k READ ek WRITE ik
    RANGE gbar, VT
}
UNITS { (mA) = (milliamp) (mV) = (millivolt) (S) = (siemens) }
PARAMETER { gbar = 0.01 (S/cm2)  VT = -58 (mV) }
ASSIGNED { v (mV) ek (mV) ik (mA/cm2) an bn }
STATE { n }
BREAKPOINT { SOLVE states METHOD cnexp  ik = gbar*n*n*n*n*(v - ek) }
INITIAL { rates(v)  n = an/(an + bn) }
DERIVATIVE states { rates(v)  n' = an*(1 - n) - bn*n }
FUNCTION vtrap(x, y) {
    if (fabs(x/y) < 1e-6) { vtrap = y*(1 - x/y/2) } else { vtrap = x/(exp(x/y) - 1) }
}
PROCEDURE rates(v (mV)) { LOCAL u
    u = v - VT
    an = 0.032*vtrap(15 - u, 5)  bn = 0.5*exp((10 - u)/40)
}
