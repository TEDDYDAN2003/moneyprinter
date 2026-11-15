#!/usr/bin/env python3
"""Research comparison: exact Moneyprinter chart calculations vs tick-VWMA crossover."""
import json,math
from pathlib import Path
import numpy as np,pandas as pd
from pipeline import make_features,event_for,replay
rows=json.loads(Path('research/data/oanda-xau-m15-2024-2026.json').read_text());chart=json.loads(Path('research/data/oanda-chart-proxy-vwma.json').read_text());tick_proxy=json.loads(Path('research/data/oanda-chart-tick-proxy.json').read_text());d=make_features(rows)
assert len(d)==len(chart['times']) and np.array_equal(d.time.to_numpy(),np.array(chart['times']))
chart_sigs={s['bar']:s for s in chart['signals']};tick_proxy_sigs={s['bar']:s for s in tick_proxy['signals']};assert tick_proxy['times']==chart['times'];v=np.array(chart['vwma']);cl=d.close.to_numpy();op=d.open.to_numpy();hi=d.high.to_numpy();lo=d.low.to_numpy();atr=d.atr.to_numpy();tm=d.time.to_numpy();vw=d.vwma.to_numpy();ema=d.ema20.to_numpy()
chart_ema200=np.full(len(d),np.nan);chart_ema200[199]=np.mean(cl[:200]);
for i in range(200,len(d)):chart_ema200[i]=cl[i]*(2/201)+chart_ema200[i-1]*(199/201)
periods={'2024':('2024-01-01','2025-01-01'),'2025':('2025-01-01','2026-01-01'),'2026_H1':('2026-01-01','2026-07-01')}
cache={};counts={}
def candidates(kind,slip=.10):
 key=(kind,slip)
 if key in cache:return cache[key]
 items=[];num={'raw':0,'invalid_nextopen_or_stop':0,'gaps':0}
 for i in range(220,len(d)-50):
  r=d.iloc[i]
  if not (r.session_london or r.session_overlap or r.session_ny) or not r.contiguous or not all(np.isfinite(z) for z in (atr[i],vw[i],ema[i],r.h4fast,r.h4slow)):continue
  meta=chart_sigs.get(i);side=0
  if kind=='chart_cross':side=int(meta['dir']) if meta else 0
  elif kind=='chart_tick_input':
   meta=tick_proxy_sigs.get(i);side=int(meta['dir']) if meta else 0
  elif kind=='tick_cross':
   meta=None
   bull=vw[i-1]<=ema[i-1] and vw[i]>ema[i];bear=vw[i-1]>=ema[i-1] and vw[i]<ema[i];side=1 if bull and not bear else -1 if bear and not bull else 0
  else:
   meta=None
   # Reaction to the *previous-close* chart line, observable before this candle forms.
   level=v[i-1];bull=lo[i]<=level and cl[i]>level and cl[i]>op[i];bear=hi[i]>=level and cl[i]<level and cl[i]<op[i];side=1 if bull and not bear else -1 if bear and not bull else 0
  if not side:continue
  num['raw']+=1;e=event_for(d,i,slip=slip,direction=side)
  if not e:num['invalid_nextopen_or_stop']+=1;continue
  e.update({'index':i,'decision_time':r.decision_time.isoformat(),'direction':side,'date':str(r.decision_time.date()),'exit_time':(d.index[e['exit_i']]+pd.Timedelta(minutes=15)).isoformat(),
    'features':{'macro_price_align':float(side*(r.close-chart_ema200[i])>0),'h4_align':float(side*(r.h4fast-r.h4slow)>0),'m15_align':float(side*(r.ema50-r.ema200)>0),'session_london':int(r.session_london),'session_overlap':int(r.session_overlap),'session_ny':int(r.session_ny),'chart_signal_grade':meta['grade'] if meta else None,'chart_trend_aligned':meta['trendAligned'] if meta else None}})
  num['gaps']+=e['result']=='gap';items.append(e)
 cache[key]=items;counts[str(key)]=num;return items

def partition(events,period):
 a,b=periods[period];return [e for e in events if a<=e['decision_time'][:10]<b and e['exit_time'][:10]<b]
def compact(r):return {k:v for k,v in r.items() if k!='records'}
summary={};logs={}
for kind in ['chart_cross','chart_tick_input','tick_cross','chart_reaction']:
 ev=candidates(kind);summary[kind]={};logs[kind]={}
 for p in periods:
  es=partition(ev,p);summary[kind][p]={}
  for filt in ['all','price_ema200','h4_and_ema200']:
   rule=lambda e,f=filt: f=='all' or (e['features']['macro_price_align'] and (f!='h4_and_ema200' or e['features']['h4_align']))
   result=replay(es,rule);summary[kind][p][filt]=compact(result)
   if p=='2026_H1' and filt=='price_ema200':logs[kind]=result['records']
# Wider slippage: chart and tick, predeclared same price/200 gate, 2026 is an already-viewed comparison.
stress={}
for kind in ['chart_cross','chart_tick_input','tick_cross','chart_reaction']:
 e=partition(candidates(kind,.30),'2026_H1');stress[kind]=compact(replay(e,lambda x:x['features']['macro_price_align']))
result={'settings':chart['settings'],'viewportAudit':chart.get('viewportAudit'),'candidate_counts':counts,'results':summary,'slippage_stress_2026':stress,'notes':['Exact chart calc is run from vwma-crossover.ts; chart indicator uses candle range/body proxy and no OANDA tick volume.','Chart tick-input comparator changes only the range/body proxy to actual OANDA tick volume; the rest of the chart code is unchanged. Tick-VWMA14/EMA20 is a different comparator.','Chart reaction uses the previous-close indicator line; it is a defined hypothesis, not the chart crossover signal.','2026 has been examined already; this is not a pristine final holdout.']}
Path('research/data/chart-crossover-study.json').write_text(json.dumps(result,indent=2));Path('research/data/chart-crossover-trades.json').write_text(json.dumps(logs,indent=2));print(json.dumps(result,indent=2))
