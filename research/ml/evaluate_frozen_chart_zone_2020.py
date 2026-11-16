#!/usr/bin/env python3
"""Evaluate frozen chart suggestions on 2020, no tuning; not a sequential account."""
import json,hashlib,csv
from pathlib import Path
from collections import Counter
import numpy as np,pandas as pd
from train_zone_movement_2023_2025 import observe_path
from intraday_vwma_2023_2025 import NY
p=Path('research/data'); raw=(p/'oanda-xau-m15-2020.json').read_bytes();bars=json.loads(raw);z=json.loads((p/'research-zones-2020.json').read_text());m=json.loads(Path('research/models/chart-zone-score-2021-2025.json').read_text())
assert hashlib.sha256(Path('src/lib/indicators/vwma-crossover.ts').read_bytes()).hexdigest()=='3554c750a25c33251f288db4ec90d4ddffc4d9384d9604ec6c95da0bfd3bc834'
assert hashlib.sha256(Path('research/models/chart-zone-score-2021-2025.json').read_bytes()).hexdigest()=='e802cb90d19285b4a863b3c04c1cc34203261622ac3b4088a8c862c29ae0edad'
assert all(1577836800<=b['time']<1609459200 for b in bars);assert all(bars[i]['time']<bars[i+1]['time'] for i in range(len(bars)-1))
g={'tm':np.array([b['time'] for b in bars])}
for side in ['ask','bid']:
 for short,long in [('o','open'),('h','high'),('l','low')]:g[side[0]+short]=np.array([b[side][long] for b in bars])
dt=pd.to_datetime(g['tm']+900,unit='s',utc=True).tz_convert(NY);mins=dt.hour.to_numpy()*60+dt.minute.to_numpy();dates=pd.to_datetime(g['tm'],unit='s',utc=True).tz_convert(NY).date
rows=[]
for x in z:
 i=x['bar'];moment=pd.Timestamp(g['tm'][i]+900,unit='s',tz='UTC');r=observe_path(g,{'index':i,'direction':x['dir'],'year':2020},100,mins,dates);t=moment.hour*60+moment.minute;session='London' if 420<=t<600 else 'Overlap' if 720<=t<900 else 'New York';status=r['label_status'];outcome='win' if status=='favorable_first' else 'loss' if status in ('adverse_first','ambiguous_same_bar') else 'unresolved';net=.83 if outcome=='win' else -1.17 if outcome=='loss' else None
 score=1/(1+np.exp(-(np.dot((np.array(x['features'])-m['mean'])/m['scale'],m['coef'])+m['intercept'])));assert abs(score-x['score'])<1e-12;assert x['suggested']==(score>=m['threshold'])
 rows.append({'decision_utc':moment.isoformat(),'session':session,'direction':'BUY' if x['dir']==1 else 'SELL','zone_low':x['lower'],'zone_high':x['upper'],'score':x['score'],'suggested':x['suggested'],'status':status,'conservative_outcome':outcome,'hypothetical_net_usd_per_oz':net,'entry':r.get('label_entry_price'),'target':r.get('label_favorable_level'),'stop':r.get('label_adverse_level'),'recovery':r.get('label_recovery_after_adverse'),'recovery_bars':r.get('label_recovery_bars_after_adverse')})
def summary(rs):
 c=Counter(x['status'] for x in rs);win=sum(x['conservative_outcome']=='win' for x in rs);loss=sum(x['conservative_outcome']=='loss' for x in rs);resolved=win+loss;net=sum(x['hypothetical_net_usd_per_oz'] for x in rs if x['hypothetical_net_usd_per_oz'] is not None)
 return {'candidates':len(rs),'resolved':resolved,'wins':win,'losses_conservative':loss,'win_rate_pct':round(100*win/resolved,2) if resolved else None,'net_per_oz_resolved_only':round(net,2),'avg_net_per_oz_resolved_only':round(net/resolved,4) if resolved else None,'status_counts':dict(c),'adverse_recovery':dict(Counter(x['recovery'] for x in rs if x['status']=='adverse_first'))}
sel=[x for x in rows if x['suggested']];result={'data_sha256':hashlib.sha256(raw).hexdigest(),'bars':len(bars),'baseline':summary(rows),'selected':summary(sel),'by_session':{v:summary([x for x in sel if x['session']==v]) for v in ('London','Overlap','New York')},'by_direction':{v:summary([x for x in sel if x['direction']==v]) for v in ('BUY','SELL')}}
with open('reports/chart-zone-2020-events.csv','w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
(p/'chart-zone-2020-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
