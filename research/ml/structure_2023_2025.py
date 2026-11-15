#!/usr/bin/env python3
"""Research-only bounded comparison of chart VWMA setups and confirmed swing stops."""
import json,hashlib,math
from pathlib import Path
import numpy as np,pandas as pd
from pipeline import make_features

DATA=Path('research/data/oanda-xau-m15-2023-2025.json');raw=DATA.read_bytes();rows=json.loads(raw);d=make_features(rows);v=json.loads(Path('research/data/chart-vwma-2023-2025.json').read_text());assert v['times']==d.time.tolist();assert all(pd.Timestamp('2023-01-01',tz='UTC').timestamp()<=x['time']<pd.Timestamp('2026-01-01',tz='UTC').timestamp() for x in rows)
N=len(d);tm=d.time.to_numpy();o=d.open.to_numpy();h=d.high.to_numpy();l=d.low.to_numpy();c=d.close.to_numpy();atr=d.atr.to_numpy();ema=d.ema200.to_numpy();fast=d.h4fast.to_numpy();slow=d.h4slow.to_numpy();line=np.array(v['vwma']);signals={s['bar']:s for s in v['signals']};ao=d.ask_open.to_numpy();ah=d.ask_high.to_numpy();al=d.ask_low.to_numpy();ac=d.ask_close.to_numpy();bo=d.bid_open.to_numpy();bh=d.bid_high.to_numpy();bl=d.bid_low.to_numpy();bc=d.bid_close.to_numpy()

def pivots(length):
 hs=np.full(N,np.nan);ls=np.full(N,np.nan);hi=lo=np.nan
 for i in range(N):
  k=i-length
  if k>=length and np.all(np.diff(tm[k-length:i+1])==900):
   if h[k]>max(np.r_[h[k-length:k],h[k+1:i+1]]):hi=h[k]
   if l[k]<min(np.r_[l[k-length:k],l[k+1:i+1]]):lo=l[k]
  hs[i]=hi;ls[i]=lo
 return hs,ls
p2h,p2l=pivots(2);p3h=d.swinghigh.to_numpy();p3l=d.swinglow.to_numpy();session=(d.session_london+d.session_overlap+d.session_ny).to_numpy();h4d=fast-slow;prev=d.close.shift().to_numpy();tr=np.maximum(h-l,np.maximum(abs(h-prev),abs(l-prev)));shock=np.zeros(N,dtype=bool);until=0
for i in range(N):
 if np.isfinite(atr[i]) and tr[i]>=2.5*atr[i]:until=max(until,tm[i]+900+1200)
 shock[i]=tm[i]+900<until
candidates=[];trading_days={y:set() for y in (2023,2024,2025)}
for i in range(220,N-50):
 if not session[i]:continue
 date=pd.Timestamp(tm[i]+900,unit='s',tz='UTC');year=date.year
 if year not in trading_days:continue
 trading_days[year].add(date.strftime('%Y-%m-%d'))
 if not d.contiguous.iloc[i] or not np.isfinite([atr[i],ema[i],fast[i],slow[i],line[i-1]]).all() or shock[i]:continue
 marker=signals.get(i);bull=l[i]<=line[i-1] and c[i]>line[i-1] and c[i]>o[i];bear=h[i]>=line[i-1] and c[i]<line[i-1] and c[i]<o[i];side=int(marker['dir']) if marker else (1 if bull and not bear else -1 if bear and not bull else 0)
 if not side or side*(c[i]-ema[i])<=0:continue
 rng=h[i]-l[i]
 if rng<=0:continue
 pos=(c[i]-l[i])/rng if side==1 else (h[i]-c[i])/rng;body=side*(c[i]-o[i])/atr[i]
 item={'index':i,'year':year,'date':date.strftime('%Y-%m-%d'),'decision':date.isoformat(),'direction':side,'trigger':'cross' if marker else 'reaction','h4_aligned':bool(side*h4d[i]>0),'confirmed_body':bool(pos>=.70 and body>=.25),'p2':p2l[i] if side==1 else p2h[i],'p3':p3l[i] if side==1 else p3h[i],'opposing':p3h[i] if side==1 else p3l[i],'atr':atr[i]};candidates.append(item)

def event(item,stoptype,targettype,slip):
 i=item['index'];side=item['direction'];j=i+1
 if tm[j]-tm[i]!=900:return None
 entry=(ao[j]+slip) if side==1 else (bo[j]-slip);pivot=item[stoptype]
 if not np.isfinite(pivot):return None
 stop=pivot-side*max(.20,.15*item['atr']);risk=side*(entry-stop)
 if not(.2*item['atr']<=risk<=25):return None
 if targettype=='structure':
  q=item['opposing'];dist=side*(q-entry);target=q if np.isfinite(q) and risk<=dist<=3*risk else entry+side*1.5*risk;target_kind='swing' if np.isfinite(q) and risk<=dist<=3*risk else '1.5R fallback'
 else:target=entry+side*float(targettype)*risk;target_kind=targettype+'R'
 year=item['year'];end_idx=min(N,i+49)
 for k in range(j,end_idx):
  if k>j and tm[k]-tm[k-1]!=900:return {'result':'gap','entry_i':j,'exit_i':k,'entry':entry,'stop':stop,'target':target,'risk':risk,'target_kind':target_kind}
  px=bo[k] if side==1 else ao[k];hi=bh[k] if side==1 else ah[k];low=bl[k] if side==1 else al[k]
  gs=px<=stop if side==1 else px>=stop;gt=px>=target if side==1 else px<=target;st=low<=stop if side==1 else hi>=stop;tp=hi>=target if side==1 else low<=target;amb=st and tp and not(gs or gt)
  if gs or gt or st or tp:
   exit=px if gs else target if gt else stop if st else target;exit-=side*slip;return {'result':'ambiguous' if amb else 'stop' if (gs or (st and not gt)) else 'target','entry_i':j,'exit_i':k,'entry':entry,'exit':exit,'stop':stop,'target':target,'risk':risk,'pnl_unit':side*(exit-entry),'target_kind':target_kind}
 if i+48>=N:return None
 k=i+48;exit=(bc[k] if side==1 else ac[k])-side*slip;return {'result':'timeout','entry_i':j,'exit_i':k,'entry':entry,'exit':exit,'stop':stop,'target':target,'risk':risk,'pnl_unit':side*(exit-entry),'target_kind':target_kind}

def evaluate(inputs,year,gate):
 balance=peak=1000.;dd=0.;last=-1;daily={};logs=[]
 for item,e in inputs:
  if item['year']!=year or not gate(item) or e is None or item['index']<last or daily.get(item['date'],0)>=2:continue
  # Close and label must be known within the same reporting year; crossing-boundary positions are purged.
  exit_time=pd.Timestamp(tm[e['exit_i']]+900,unit='s',tz='UTC')
  if exit_time.year!=year:continue
  lots=min(.05,math.floor((balance*.02/(e['risk']*100))*100+1e-10)/100)
  if lots<.01:continue
  daily[item['date']]=daily.get(item['date'],0)+1;last=e['exit_i'];pnl=None if e['result']=='gap' else e['pnl_unit']*lots*100
  if pnl is not None:balance+=pnl;peak=max(peak,balance);dd=max(dd,(peak-balance)/peak*100)
  logs.append({**item,**e,'lots':lots,'pnl':pnl,'balance':balance,'exit_known':exit_time.isoformat()})
 resolved=[x for x in logs if x['pnl'] is not None];wins=[x for x in resolved if x['pnl']>0];loss=[x for x in resolved if x['pnl']<=0];gp=sum(x['pnl'] for x in wins);gl=-sum(x['pnl'] for x in loss);days=len(trading_days[year]);active=len(daily)
 return {'trades':len(resolved),'wins':len(wins),'losses':len(loss),'win_rate':round(100*len(wins)/len(resolved),2) if resolved else None,'net_usd':round(balance-1000,2),'profit_factor':round(gp/gl,3) if gl else None,'max_closed_drawdown_pct':round(dd,2),'avg_net_r':round(np.mean([x['pnl_unit']/x['risk'] for x in resolved]),4) if resolved else None,'gaps_excluded':len(logs)-len(resolved),'ambiguous_stop_assumed':sum(x['result']=='ambiguous' for x in resolved),'active_days':active,'session_days':days,'active_day_pct':round(100*active/days,1) if days else None,'resolved_per_day':round(len(resolved)/days,3) if days else None,'log':logs}

gates={'base':lambda x:True,'h4':lambda x:x['h4_aligned'],'h4_confirm':lambda x:x['h4_aligned'] and x['confirmed_body'],'h4_reaction':lambda x:x['h4_aligned'] and x['trigger']=='reaction'}
combos=[(g,s,t) for g in gates for s in ('p2','p3') for t in ('1.0','1.5','structure')]
def run_years(years,slip=.10):
 results=[]
 for stop in ('p2','p3'):
  for target in ('1.0','1.5','structure'):
   inputs=[(x,event(x,stop,target,slip)) for x in candidates]
   for gate in gates:
    r={str(y):evaluate(inputs,y,gates[gate]) for y in years};results.append({'gate':gate,'stop':stop,'target':target,'years':r})
 return results
compact=lambda x:{k:v for k,v in x.items() if k!='log'}
train=run_years((2024,2025));qual=[]
for x in train:
 yrs=[x['years'][str(y)] for y in (2024,2025)]
 if all(z['trades']>=75 and z['net_usd']>0 and z['profit_factor'] is not None and z['profit_factor']>=1.05 and z['max_closed_drawdown_pct']<=25 and z['resolved_per_day']>=.5 for z in yrs):qual.append(x)
qual.sort(key=lambda x:min(x['years']['2024']['net_usd'],x['years']['2025']['net_usd']),reverse=True);best=qual[0] if qual else None
# Diagnostic only: retrospective strongest minimum-year P&L, not a qualified strategy.
diagnostic=max(train,key=lambda x:min(x['years']['2024']['net_usd'],x['years']['2025']['net_usd']))
review=best or diagnostic
baseline=next(x for x in train if (x['gate'],x['stop'],x['target'])==('base','p3','structure'))
# 2023 is a backward cross-regime check (later data were used for variant selection).
items=[]
for x in [baseline]+([review] if review is not baseline else []):
 inputs=[(t,event(t,x['stop'],x['target'],.10)) for t in candidates];items.append({'variant':(x['gate'],x['stop'],x['target']),'result':evaluate(inputs,2023,gates[x['gate']])})
stress=[]
for x in [baseline]+([review] if review is not baseline else []):
 inputs=[(t,event(t,x['stop'],x['target'],.30)) for t in candidates];stress.append({'variant':(x['gate'],x['stop'],x['target']),'years':{str(y):evaluate(inputs,y,gates[x['gate']]) for y in (2024,2025)}})
out={'data_sha256':hashlib.sha256(raw).hexdigest(),'bars':N,'candidate_count':len(candidates),'session_days':{str(y):len(v) for y,v in trading_days.items()},'variant_count':len(combos),'qualification':'both 2024 and 2025: >=75 closed trades, positive net, PF >=1.05, max closed DD <=25%, >=0.5 resolved trades per session day','selected':{'gate':best['gate'],'stop':best['stop'],'target':best['target']} if best else None,'diagnostic_posthoc':{'gate':diagnostic['gate'],'stop':diagnostic['stop'],'target':diagnostic['target']},'training':[{**{k:x[k] for k in ('gate','stop','target')},'years':{y:compact(v) for y,v in x['years'].items()}} for x in train],'cross_regime_2023':[{'variant':x['variant'],'result':compact(x['result'])} for x in items],'stress':[{'variant':x['variant'],'years':{y:compact(v) for y,v in x['years'].items()}} for x in stress]}
Path('research/data/structure-study-2023-2025.json').write_text(json.dumps(out,indent=2));Path('research/data/structure-study-logs.json').write_text(json.dumps({'baseline_2024':baseline['years']['2024']['log'],'baseline_2025':baseline['years']['2025']['log'],'diagnostic_2024':review['years']['2024']['log'],'diagnostic_2025':review['years']['2025']['log'],'baseline_2023':items[0]['result']['log'],'diagnostic_2023':items[-1]['result']['log']},indent=2));print(json.dumps({'bars':N,'candidates':len(candidates),'days':out['session_days'],'qualified':len(qual),'selected':out['selected'],'diagnostic_posthoc':out['diagnostic_posthoc'],'baseline':out['training'][next(i for i,x in enumerate(train) if x is baseline)],'2023':out['cross_regime_2023'],'stress':out['stress']},indent=2))
