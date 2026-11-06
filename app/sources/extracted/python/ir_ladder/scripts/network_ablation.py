"""Toy CA1 circuit ablations (results on the 'The CA1 circuit' page)."""
import os, sys, json; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import ir_ladder.network as N
base = dict(g_ec=0.024, g_ca3=0.008, g_ca3_pv=0.006, I_olm=0.6, ec_rate=800, T=6000)
out = {}
for name, ov in [('intact', {}), ('no PV->PYR', dict(g_pe=0.0)), ('no OLM->PYR', dict(g_oe=0.0)), ('flat EC', dict(ec_mod=0.0)),
                 ('flat CA3', dict(ca3_mod=0.0, ca3_nest=0.0)), ('PYR without M current', 'noM')]:
    P = dict(base); old = dict(N.PYR)
    if ov == 'noM': N.PYR.update(a=0.0, b=0.0)
    else: P.update(ov)
    a = N.analyse(N.simulate(**P)); N.PYR.clear(); N.PYR.update(old)
    tot = a['ss_rate'] + a['bs_rate']
    out[name] = dict(pyr=a['rate_pyr'], pv=a['rate_pv'], olm=a['rate_olm'], burst_frac=a['bs_rate'] / tot if tot else 0,
                     theta_vs=(a['ss_theta'][0], a['bs_theta'][0]), gamma_vs=(a['ss_gamma'][0], a['bs_gamma'][0]))
    print(name, {k: (round(v, 2) if isinstance(v, float) else tuple(round(x, 2) for x in v)) for k, v in out[name].items()})
json.dump(out, open('network_ablation_results.json', 'w'), default=float)
