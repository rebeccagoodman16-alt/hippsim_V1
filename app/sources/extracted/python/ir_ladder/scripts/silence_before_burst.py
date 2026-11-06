import sys, json; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__file__), '..'))
import numpy as np
from ir_ladder.params import hh_params
from ir_ladder.run import run
from ir_ladder.analysis import silence_burst_probability, classify
P=hh_params(gating='hybrid',gNaP=0.93,gKdr=5.86); out={}
for name,kw in [('theta only',dict(A1=1,f1=10,A2=0,f2=0)),('gamma only',dict(A1=0,f1=0,A2=2,f2=40)),('theta+gamma',dict(A1=1,f1=10,A2=2,f2=40))]:
  for I in [0.5,1.0]:
    tr=[]
    for sd in range(10): tr+=run('hh2',P,N=1,T=20000,Iapp=I,site='both',D=0.2,seed=sd+1,**kw)['spikes']
    S=silence_burst_probability(tr,500,bins=(0,25,50,75,100,150,250,500,1e9)); c=classify(np.concatenate(tr),0,1)
    key=f'{name} I={I}'; out[key]={k:(v.tolist() if hasattr(v,'tolist') else v) for k,v in S.items()}
    print(key,'n',S['n'],' '.join(f"{e:.0f}+:{p:.2f}({s+b})" for e,p,s,b in zip(S['edges'][:-1],np.nan_to_num(S['p_bs'],nan=-1),S['ss'],S['bs'])),flush=True)
json.dump(out,open('silence2_results.json','w'))
