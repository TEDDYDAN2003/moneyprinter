#!/usr/bin/env python3
"""Research on exact chart indicator; only OANDA candles in 2024 and 2025."""
import json,math,hashlib
from pathlib import Path
import numpy as np,pandas as pd
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier,export_text
from sklearn.metrics import brier_score_loss
from pipeline import make_features,event_for,replay

cols=['direction','is_cross','macro_align','h4_align','m15_align','ema50_slope','line_distance_atr','ema200_distance_atr','swing_zone_distance_atr','near_swing_zone','sweep_reclaim','fvg_retest','ifvg_flip_proxy','bos_proxy','engulfing','rejection_wick','body_atr','close_position','atr_ratio','range_atr','tick_volume_ratio','session_london','session_overlap','session_ny']
raw=json.loads(Path('research/data/oanda-xau-m15-2024-2026.json').read_text());start=int(pd.Timestamp('2024-01-01',tz='UTC').timestamp());end=int(pd.Timestamp('2026-01-01',tz='UTC').timestamp());rows=[r for r in raw if start<=r['time']<end];data=make_features(rows);chart=json.loads(Path('research/data/own-vwma-2024-2025.json').read_text());assert chart['times']==data.time.tolist();sig={s['bar']:s for s in chart['signals']};line=np.array(chart['vwma']);close=data.close.to_numpy();o=data.open.to_numpy();h=data.high.to_numpy();l=data.low.to_numpy();n=len(data);mins=data.session_london+data.session_overlap+data.session_ny
prevhigh=data.high.rolling(20,min_periods=20).max().shift(1).to_numpy();prevlow=data.low.rolling(20,min_periods=20).min().shift(1).to_numpy();events=[];counts={'eligible_signals':0,'invalid_next_open_stop':0,'gap':0,'ambiguous':0}
for i in range(220,n-50):
 r=data.iloc[i]
 if not mins.iloc[i] or not r.contiguous or not np.isfinite([r.atr,r.ema50,r.ema200,r.h4fast,r.h4slow,r.atr_ratio,r.volratio,r.swinglow,r.swinghigh,line[i-1]]).all():continue
 marker=sig.get(i);bull=l[i]<=line[i-1] and close[i]>line[i-1] and close[i]>o[i];bear=h[i]>=line[i-1] and close[i]<line[i-1] and close[i]<o[i]
 side=int(marker['dir']) if marker else (1 if bull and not bear else -1 if bear and not bull else 0)
 if not side:continue
 counts['eligible_signals']+=1;e=event_for(data,i,direction=side,slip=.10)
 if not e:counts['invalid_next_open_stop']+=1;continue
 rng=max(h[i]-l[i],1e-12);body=abs(close[i]-o[i]);lower=min(close[i],o[i])-l[i];upper=h[i]-max(close[i],o[i]);opp=r.swinglow if side==1 else r.swinghigh
 engulf=(close[i]>o[i] and close[i-1]<o[i-1] and o[i]<=close[i-1] and close[i]>=o[i-1]) if side==1 else (close[i]<o[i] and close[i-1]>o[i-1] and o[i]>=close[i-1] and close[i]<=o[i-1])
 sweep=(l[i]<prevlow[i] and close[i]>prevlow[i]) if side==1 else (h[i]>prevhigh[i] and close[i]<prevhigh[i]);bos=close[i]>data.swinghigh.iloc[i-1] if side==1 else close[i]<data.swinglow.iloc[i-1]
 z={'direction':side,'is_cross':int(marker is not None),'macro_align':int(side*(close[i]-r.ema200)>0),'h4_align':int(side*(r.h4fast-r.h4slow)>0),'m15_align':int(side*(r.ema50-r.ema200)>0),'ema50_slope':side*(r.ema50-data.ema50.iloc[i-5])/r.atr,'line_distance_atr':side*(close[i]-line[i-1])/r.atr,'ema200_distance_atr':side*(close[i]-r.ema200)/r.atr,'swing_zone_distance_atr':side*(close[i]-opp)/r.atr,'near_swing_zone':int(abs(close[i]-opp)<=r.atr),'sweep_reclaim':int(sweep),'fvg_retest':int(r.fvg_b if side==1 else r.fvg_s),'ifvg_flip_proxy':int(r.inv_b if side==1 else r.inv_s),'bos_proxy':int(bos),'engulfing':int(engulf),'rejection_wick':(lower if side==1 else upper)/rng,'body_atr':side*(close[i]-o[i])/r.atr,'close_position':(close[i]-l[i])/rng if side==1 else (h[i]-close[i])/rng,'atr_ratio':r.atr_ratio,'range_atr':(h[i]-l[i])/r.atr,'tick_volume_ratio':r.volratio,'session_london':int(r.session_london),'session_overlap':int(r.session_overlap),'session_ny':int(r.session_ny)}
 if not all(np.isfinite(z[k]) for k in cols):continue
 counts['gap']+=e['result']=='gap';counts['ambiguous']+=e['result']=='ambiguous';e.update({'index':i,'decision_time':r.decision_time.isoformat(),'exit_time':(data.index[e['exit_i']]+pd.Timedelta(minutes=15)).isoformat(),'date':str(r.decision_time.date()),'direction':side,'features':z});events.append(e)
def subset(a,b):return [e for e in events if a<=e['decision_time'][:10]<b and e['exit_time'][:10]<b]
train=subset('2024-01-01','2024-10-01');dev=subset('2024-10-01','2025-01-01');later=subset('2025-01-01','2026-01-01');valid=lambda e:e['result'] not in ('gap','ambiguous');labeled=[x for x in train if valid(x)];xx=lambda xs:np.array([[x['features'][k] for k in cols] for x in xs]);yy=lambda xs:np.array([int(x['net_price']>0) for x in xs]);
if len(labeled)<100 or len(set(yy(labeled)))!=2:raise RuntimeError('Too few resolved training examples')
models={'logistic':make_pipeline(StandardScaler(),LogisticRegression(C=.25,max_iter=1500,random_state=42)),'tree':DecisionTreeClassifier(max_depth=3,min_samples_leaf=35,random_state=42)}
for model in models.values():model.fit(xx(labeled),yy(labeled))
for es in (train,dev,later):
 for name,model in models.items():
  for e,p in zip(es,model.predict_proba(xx(es))[:,1]):e['score_'+name]=float(p)
# Comparisons below are only development and previously seen 2025; no claim of final unseen performance.
base=lambda e:e['features']['macro_align']==1
candidates=[]
for name in models:
 for threshold in [.40,.45,.50,.55]:
  r=replay(dev,lambda e,n=name,t=threshold:base(e) and e['score_'+n]>=t);candidates.append({'model':name,'threshold':threshold,'stats':r})
eligible=[x for x in candidates if x['stats']['trades']>=25 and x['stats']['profit_factor'] is not None and x['stats']['profit_factor']>=1.05 and x['stats']['net_usd']>0 and x['stats']['max_closed_dd_pct']<=25];eligible.sort(key=lambda x:x['stats']['net_usd'],reverse=True);chosen=eligible[0] if eligible else None
baseline_dev=replay(dev,base);baseline_later=replay(later,base)
rule_gates={'4h_alignment':lambda e:e['features']['h4_align']==1,'strong_directional_close':lambda e:e['features']['close_position']>=.70 and e['features']['body_atr']>=.25,'sweep_reclaim':lambda e:e['features']['sweep_reclaim']==1,'near_confirmed_swing':lambda e:e['features']['near_swing_zone']==1,'fvg_context':lambda e:e['features']['fvg_retest']==1}
rules={name:{'development':replay(dev,lambda e,g=gate:base(e) and g(e)),'2025':replay(later,lambda e,g=gate:base(e) and g(e))} for name,gate in rule_gates.items()}
selected_later=replay(later,lambda e:base(e) and e['score_'+chosen['model']]>=chosen['threshold']) if chosen else None

# Retrospective descriptions of the exact executed 2025 baseline path, not new strategies.
observed={}
for name,check in {'chart_cross':lambda e:e['features']['is_cross']==1,'chart_line_reaction':lambda e:e['features']['is_cross']==0,'sweep_reclaim':lambda e:e['features']['sweep_reclaim']==1,'fvg_retest':lambda e:e['features']['fvg_retest']==1,'near_swing_zone':lambda e:e['features']['near_swing_zone']==1,'engulfing':lambda e:e['features']['engulfing']==1,'h4_aligned':lambda e:e['features']['h4_align']==1,'london':lambda e:e['features']['session_london']==1,'overlap':lambda e:e['features']['session_overlap']==1,'ny':lambda e:e['features']['session_ny']==1}.items():
 group=[e for e in baseline_later['records'] if e['result']!='gap' and check(e)];observed[name]={'trades':len(group),'wins':sum(x['pnl']>0 for x in group),'net_usd':round(sum(x['pnl'] for x in group),2)}
# Re-simulate exact 2025 baseline with higher per-side slippage; no retuning.
stress_events=[]
for e in later:
 refreshed=event_for(data,e['index'],direction=e['direction'],slip=.30)
 if refreshed:
  refreshed.update({k:e[k] for k in ('index','decision_time','date','direction','features')});refreshed['exit_time']=(data.index[refreshed['exit_i']]+pd.Timedelta(minutes=15)).isoformat()
  if refreshed['exit_time'][:10]<'2026-01-01':stress_events.append(refreshed)
stress_2025=replay(stress_events,base)
def brief(r):return {k:v for k,v in r.items() if k!='records'}
coefs=models['logistic'].named_steps['logisticregression'].coef_[0];prevalence=float(np.mean(yy(labeled)));scores={}
for label,es in [('q4_2024',dev),('2025_development',later)]:
 lab=[e for e in es if valid(e)];scores[label]={'labelable':len(lab),'constant_brier':round(float(brier_score_loss(yy(lab),np.full(len(lab),prevalence))),4),'logistic_brier':round(float(brier_score_loss(yy(lab),[e['score_logistic'] for e in lab])),4),'tree_brier':round(float(brier_score_loss(yy(lab),[e['score_tree'] for e in lab])),4)}
result={'data_period':'2024-01-01 to 2025-12-31 UTC only','settings':{'session':'07:00–10:00 and 12:00–17:00 UTC','risk_pct':2,'max_lots':.05,'slippage_per_side':.10},'counts':counts,'train':{'events':len(train),'labelable':len(labeled),'positive_rate':prevalence},'development_events':len(dev),'2025_events':len(later),'metrics':scores,'dev_baseline':brief(baseline_dev),'2025_baseline':brief(baseline_later),'dev_candidates':[{'model':c['model'],'threshold':c['threshold'],'stats':brief(c['stats'])} for c in candidates],'observed_2025_baseline_groups':observed,'stress_baseline_2025':brief(stress_2025),'selection':{'model':chosen['model'],'threshold':chosen['threshold'],'qualification':'2024 Q4 >=25 trades, positive net, PF >=1.05, closed-balance DD <=25%'} if chosen else None,'selected_2025':brief(selected_later) if selected_later else None,'exploratory_rules':{k:{p:brief(t) for p,t in v.items()} for k,v in rules.items()},'logistic_coefficients':sorted(zip(cols,[round(float(x),4) for x in coefs]),key=lambda x:-abs(x[1])),'tree':export_text(models['tree'],feature_names=cols)}
Path('research/data/own-vwma-confluence-study.json').write_text(json.dumps(result,indent=2));Path('research/data/own-vwma-confluence-trades.json').write_text(json.dumps({'baseline_2025':baseline_later['records'],'selected_2025':selected_later['records'] if selected_later else []},indent=2));Path('research/data/own-vwma-confluence-candidates.json').write_text(json.dumps({'train':train,'development':dev,'2025':later},separators=(',',':')));print(json.dumps(result,indent=2))
