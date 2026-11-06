import sys, json, time; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__file__), '..'))
import numpy as np
from ir_ladder.params import hh_params
from ir_ladder.fit import targets, fit_adex, fit_glif, features
P=hh_params(gating='hybrid',gNaP=0.93,gKdr=5.86); t=time.time()
tg=targets(P); print('HH fi',tg['fi'].round(0).tolist(),'\n   ss',tg['ss'].round(1).tolist(),'\n   bs',tg['bs'].round(1).tolist(), round(time.time()-t,1),'s',flush=True)
out={'tg':{k:(v.tolist() if hasattr(v,'tolist') else v) for k,v in tg.items()}}
for name,fn in [('adex',fit_adex),('glif',fit_glif)]:
    t=time.time(); Pf,L=fn(P,tg); f=features(name,Pf,tg)
    print(name,'loss',round(L,4),round(time.time()-t),'s\n   fi',f['fi'].round(0).tolist(),'\n   ss',f['ss'].round(1).tolist(),'\n   bs',f['bs'].round(1).tolist(),'\n  ',{k:round(float(v),4) for k,v in Pf.items()},flush=True)
    out[name]=dict(P={k:float(v) for k,v in Pf.items()},loss=L,f={k:v.tolist() for k,v in f.items()})
json.dump(out,open('fit1_results.json','w'))
