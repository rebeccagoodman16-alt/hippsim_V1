COMMENT
Traub-Miles transient Na+ (Pospischil et al. 2008 Biol Cybern 99:427).
Mirrors hippsim/kinetics.py:na_rates.  No temperature scaling.
ENDCOMMENT
NEURON {
    SUFFIX natm
    USEION na READ ena WRITE ina
    RANGE gbar, VT
}
UNITS { (mA) = (milliamp) (mV) = (millivolt) (S) = (siemens) }
PARAMETER { gbar = 0.05 (S/cm2)  VT = -58 (mV) }
ASSIGNED { v (mV) ena (mV) ina (mA/cm2) am bm ah bh }
STATE { m h }
BREAKPOINT { SOLVE states METHOD cnexp  ina = gbar*m*m*m*h*(v - ena) }
INITIAL { rates(v)  m = am/(am + bm)  h = ah/(ah + bh) }
DERIVATIVE states { rates(v)  m' = am*(1 - m) - bm*m  h' = ah*(1 - h) - bh*h }
FUNCTION vtrap(x, y) {
    if (fabs(x/y) < 1e-6) { vtrap = y*(1 - x/y/2) } else { vtrap = x/(exp(x/y) - 1) }
}
PROCEDURE rates(v (mV)) { LOCAL u
    u = v - VT
    am = 0.32*vtrap(13 - u, 4)   bm = 0.28*vtrap(u - 40, 5)
    ah = 0.128*exp((17 - u)/18)  bh = 4/(1 + exp((40 - u)/5))
}
