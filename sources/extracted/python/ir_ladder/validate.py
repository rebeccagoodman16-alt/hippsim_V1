"""Run every check behind the claims on the website page. ~1 min with numba."""
import numpy as np
from ir_ladder.params import golomb_zca, hh_params, AMBIGUITIES
from ir_ladder.run import run
from ir_ladder.analysis import classify
from ir_ladder.reduce import impedance_full, derivative_conductances, reduce_2d, impedance_2d, fres

print('1) Soma equations vs Golomb 2006 Fig 6Da (XPPAUT screenshot / browser): 67 spikes, first 34.2 37.2 40.1 ...')
y0 = np.array([-71.81327, 0.98786, 0.02457, 0.203517, 0.00141, 0, 0, 1e-9, 0, -70, 0])
r = run('hh2', golomb_zca(), T=2000, dt=0.01, y0=y0); print('   got', len(r['spikes'][0]), np.round(r['spikes'][0][:7], 1))

print('\n2) Paper Fig 1 (single compartment, gKdr 6, code gating, I=1): SS -> bursts from gNaP ~0.35')
for g in [0.2, 0.3, 0.35, 0.45, 0.5]:
    c = classify(run('hh2', hh_params(gating='code', dendrite=False, gKdr=6.0, gNaP=g), T=3000, Iapp=1.0)['spikes'][0], 1000, 3000)
    print(f'   gNaP {g}: {c["rate"]:.0f} Hz, bursts/s {c["bs_rate"]:.1f}, CV {c["cv"]:.2f}')

print('\n3) Effect of each Table-1 reading on the f-I curve (two compartments, I = 0..6)')
I = np.arange(0, 6.01, 1.0)
for lab, ov in [('code', dict(gating='code')), ('hybrid', dict(gating='hybrid')), ('table1', dict(gating='table1')),
                ('code + sgb 15', dict(sgb=15)), ('code + thc 30/sgc -7', dict(thc=30, sgc=-7)), ('code + sgr 19', dict(sgr=19))]:
    rr = run('hh2', hh_params(**ov), N=len(I), T=3000, Iapp=I)
    print(f'   {lab:22s}', ' '.join(f"{classify(s, 1000, 3000)['rate']:.0f}" for s in rr['spikes']))

print('\n4) Linearisation vs simulation (hybrid, I = 1), |Z| in kOhm cm^2')
P = hh_params(gating='hybrid'); fn = np.array([2, 5, 10, 12, 15, 20, 40.]); Z, ys, J = impedance_full(P, fn, 1.0)
rr = run('hh2', P, N=len(fn), T=4000, Iapp=1.0, A1=0.02, f1=fn, rec_every=50, y0=ys); V = rr['rec'][:, -1500:, 0]
print('   simulated', np.round((V.max(1) - V.min(1)) / 2 / 0.02, 1)); print('   linear   ', np.round(Z, 1))
for k, (gc, gd, tau) in derivative_conductances(P, ys).items(): print(f'   {k:14s} chord {gc:.4f}  G_der {gd:+.4f}  tau {tau:.0f} ms')
f = np.logspace(np.log10(0.5), 2, 200); R = reduce_2d(P, ys, 'M')
print(f"   resonance: full {fres(f, impedance_full(P, f, 1.0)[0]):.1f} Hz, 2-D (I_M only) {fres(f, impedance_2d(R, f)):.1f} Hz; 2-D params {R}")

print('\nOpen questions for the authors:'); [print(f'   {k}: {v}') for k, v in AMBIGUITIES.items()]
