#!/usr/bin/env python3
"""Train chart-computable 100-pip zone score; strictly 2021-2025 only."""
import json,hashlib
from pathlib import Path
import numpy as np,pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from train_zone_movement_2023_2025 import observe_path
from intraday_vwma_2023_2025 import NY
P=Path('research/data'); raw=(P/'oanda-xau-m15-2021-2025.json').read_bytes(); bars=json.loads(raw);z=json.loads((P/'research-zones-2021-2025.json').read_text())
assert all(1609459200<=b['time']<1767225600 for b in bars)
g={'tm':np.array([b['time'] for b in bars])}
for side in ['ask','bid']:
 for short,long in [('o','open'),('h','high'),('l','low')]:g[side[0]+short]=np.array([b[side][long] for b in bars])
dt=pd.to_datetime(g['tm']+900,unit='s',utc=True).tz_convert(NY);minutes=dt.hour.to_numpy()*60+dt.minute.to_numpy();dates=pd.to_datetime(g['tm'],unit='s',utc=True).tz_convert(NY).date
rows=[]
for x in z:
 i=x['bar'];year=pd.Timestamp(g['tm'][i]+900,unit='s',tz='UTC').year;r=observe_path(g,{'index':i,'direction':x['dir'],'year':year},100,minutes,dates)
 status=r['label_status'];y=1 if status=='favorable_first' else 0 if status in ('adverse_first','ambiguous_same_bar') else None
 rows.append({**x,'time':int(g['tm'][i]),'year':year,'status':status,'y':y,'recovery':r.get('label_recovery_after_adverse'),'recovery_bars':r.get('label_recovery_bars_after_adverse')})
labeled=[r for r in rows if r['y'] is not None];X=np.array([r['features'] for r in labeled]);y=np.array([r['y'] for r in labeled]);years=np.array([r['year'] for r in labeled]);make=lambda:make_pipeline(StandardScaler(),LogisticRegression(C=.25,max_iter=2000,random_state=42))
model=make();model.fit(X[years<2025],y[years<2025]);v=model.predict_proba(X[years==2025])[:,1];vy=y[years==2025]
# Freeze a simple fixed list of gates on already-inspected 2025 development data.
# Each resolved target/stop earns +.83 / -1.17 dollars/oz, after illustrative exit slippage and commission.
choices=[]
for threshold in (.10,.15,.20,.25,.30,.35,.40,.45,.50):
 mask=v>=threshold;n=int(mask.sum()); wins=int(vy[mask].sum()); net=.83*wins-1.17*(n-wins)
 if n>=30: choices.append({'threshold':threshold,'n':n,'wins':wins,'net_per_oz':round(float(net),2),'avg_per_oz':float(net/n)})
selected=max(choices,key=lambda x:(x['avg_per_oz'],x['n'])) if choices else None
if not selected:raise RuntimeError('Insufficient development validation')
final=make();final.fit(X,y);scaler,est=final.steps[0][1],final.steps[1][1]
out={'purpose':'experimental research only, not validated','source_sha256':hashlib.sha256(raw).hexdigest(),'training_years':[2021,2022,2023,2024,2025],'features':['direction','quality','trend_aligned','separation_atr','body_atr','range_atr','confirmed_swing_touch','previous_utc_day_touch','london','overlap','ny','hours_to_cutoff'],'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist(),'coef':est.coef_[0].tolist(),'intercept':float(est.intercept_[0]),'threshold':selected['threshold'],'selection':'best average fixed-level net in 2025 development among predeclared thresholds, at least 30 resolved, using 2021-24 fit; refit all years','validation_choices':choices,'candidate_n':len(rows),'resolved_training_n':len(labeled),'training_outcomes':pd.Series([r['status'] for r in rows]).value_counts().to_dict(),'unseen_test_performed':False}
Path('research/models/chart-zone-score-2021-2025.json').write_text(json.dumps(out,indent=2)+'\n');(P/'chart-zone-training-candidates.json').write_text(json.dumps(rows));print(json.dumps(out,indent=2))
