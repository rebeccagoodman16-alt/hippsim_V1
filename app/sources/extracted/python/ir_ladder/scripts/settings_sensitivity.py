import sys, json; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__file__), '..'))
import numpy as np
from ir_ladder.params import hh_params
from ir_ladder.run import run
from ir_ladder.analysis import resonance
fr=np.array([2,3,4,5,6,7,8,9,10,11,12,14,16,18,20,25,30,35,40,45,50,60,70,80,90,100.])
cfgs={
 'A hybrid, dend input':dict(base=dict(gating='hybrid'),site='dend',I=1.0,A=2),
 'B hybrid, gh2 Id.9, both':dict(base=dict(gating='hybrid',gh=2.0,Iapp_d=0.9),site='both',I=1.0,A=2),
 'C code thp-47, gh2 Id.9, I=-1, both':dict(base=dict(gating='code',gh=2.0,Iapp_d=0.9),site='both',I=-1.0,A=2),
 'D code, gNaP scaled, I=0, both':dict(base=dict(gating='code'),site='both',I=0.0,A=2,scale=0.33),
}
res={}
for name,c in cfgs.items():
  res[name]={}
  for par,vals in [('gNaP',[0.5,0.7,0.93,1.05,1.2]),('gKdr',[4,5,5.86,7,9])]:
    row=[]
    for v in vals:
      P=hh_params(gNaP=0.93,gKdr=5.86,**c['base']); P[par]=v
      if c.get('scale') and par=='gNaP': P['gNaP']=v*c['scale']
      elif c.get('scale'): P['gNaP']=0.93*c['scale']
      r=run('hh2',P,N=len(fr),T=4000,Iapp=c['I'],A1=c['A'],f1=fr,site=c['site']); R=resonance(fr,r,500,4000)
      row.append((v,R['f_ss'],R['f_bs'],round(R['A_ss'],1),round(R['A_bs'],1)))
    res[name][par]=row
    print(name,par,' '.join(f"[{v}: SS {a} BS {b} | {x}/{y}]" for v,a,b,x,y in row),flush=True)
json.dump(res,open('sweep4_results.json','w'),default=float)
