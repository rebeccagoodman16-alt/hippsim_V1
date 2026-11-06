import sys, json; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__file__), '..'))
import numpy as np
from ir_ladder.params import hh_params
from ir_ladder.run import run
from ir_ladder.analysis import resonance
fr=np.array([2,3,4,5,6,7,8,9,10,11,12,14,16,18,20,25,30,35,40,45,50,60,70,80,90,100.])
out={}
for name,vals in [('gNaP',[0.5,0.7,0.8,0.93,1.05,1.2]),('gKdr',[3,4,5,5.86,7,9]),('gh',[0,2,4,8.46,12,16])]:
  out[name]=[]
  for v in vals:
    P=hh_params(gating='hybrid',gNaP=0.93,gKdr=5.86); P[name]=v
    r=run('hh2',P,N=len(fr),T=4000,Iapp=1.0,A1=2,f1=fr,site='both'); R=resonance(fr,r,500,4000)
    out[name].append(dict(v=v,ss=R['ss'].tolist(),bs=R['bs'].tolist(),fss=R['f_ss'],fbs=R['f_bs'],Ass=R['A_ss'],Abs=R['A_bs']))
    print(f"{name}={v}: fSS {R['f_ss']} fBS {R['f_bs']} df {R['df']} ASS {R['A_ss']:.1f} ABS {R['A_bs']:.1f}",flush=True)
json.dump(dict(fr=fr.tolist(),out=out),open('sweep2_results.json','w'))
