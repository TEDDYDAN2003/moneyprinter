#!/usr/bin/env python3
"""XAU M15 offline research. No orders. Decisions only at completed candle closes."""
import json, math, hashlib, csv, argparse, warnings
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.metrics import brier_score_loss

DATA=Path('research/data/oanda-xau-m15-2024-2026.json')
FEATURES=['direction','cross','ma_reaction','h4_trend_align','m15_trend_align','ema50_slope_align','dist_ema200_atr','dist_vwma_atr','sweep','fvg_retest','ifvg_flip','bos','mss_proxy','engulfing','rejection_wick','body_atr','close_position','atr_ratio','range_ratio','tick_volume_ratio','session_london','session_overlap','session_ny']

def make_features(rows):
 d=pd.DataFrame(rows).sort_values('time').reset_index(drop=True);d['dt']=pd.to_datetime(d.time,unit='s',utc=True);d=d.set_index('dt');
 for side in ['bid','ask']:
  q=pd.DataFrame(d[side].tolist(),index=d.index);q.columns=[f'{side}_{c}' for c in q.columns];d=pd.concat([d.drop(columns=side),q],axis=1)
 for name in ['open','high','low','close','volume']:
  d[name]=pd.to_numeric(d[name],errors='coerce')
 n=len(d);prev=d.close.shift();tr=pd.concat([d.high-d.low,(d.high-prev).abs(),(d.low-prev).abs()],axis=1).max(axis=1);d['atr']=tr.rolling(20,min_periods=20).mean().shift(1);d['range_ratio']=(d.high-d.low)/d.atr
 d['ema20']=d.close.ewm(span=20,adjust=False,min_periods=20).mean();d['ema50']=d.close.ewm(span=50,adjust=False,min_periods=50).mean();d['ema200']=d.close.ewm(span=200,adjust=False,min_periods=200).mean();vol=d.volume.where(d.volume>0);d['vwma']=(d.close*vol).rolling(14,min_periods=14).sum()/vol.rolling(14,min_periods=14).sum();d['volratio']=d.volume/vol.rolling(20,min_periods=20).mean().shift(1)
 # Four-hour UTC aligned buckets: incomplete groups omitted, value is available only at 4h close.
 grouped=d.resample('4h',label='left',closed='left').agg({'open':'first','high':'max','low':'min','close':'last','time':'count'});h=grouped[grouped.time==16].copy();h['fast']=h.close.ewm(span=50,adjust=False,min_periods=50).mean();h['slow']=h.close.ewm(span=200,adjust=False,min_periods=200).mean();h['available']=h.index+pd.Timedelta(hours=4);h=h[['available','fast','slow']].dropna().sort_values('available');
 left=pd.DataFrame({'decision':d.index+pd.Timedelta(minutes=15),'row':np.arange(n)});hm=pd.merge_asof(left,h.reset_index(drop=True),left_on='decision',right_on='available',direction='backward',tolerance=pd.Timedelta(hours=8));d['h4fast']=hm.fast.to_numpy();d['h4slow']=hm.slow.to_numpy();d['h4_available']=hm.available.to_numpy()
 # Confirmed pivots: a length-three pivot is available only after three right-hand bars.
 high=d.high.to_numpy();low=d.low.to_numpy();cl=d.close.to_numpy();op=d.open.to_numpy();tm=d.time.to_numpy();last_high=np.full(n,np.nan);last_low=np.full(n,np.nan);ph=pl=np.nan
 for i in range(n):
  k=i-3
  if k>=3 and np.all(np.diff(tm[k-3:i+1])==900):
   if high[k]>max(np.r_[high[k-3:k],high[k+1:i+1]]):ph=high[k]
   if low[k]<min(np.r_[low[k-3:k],low[k+1:i+1]]):pl=low[k]
  last_high[i]=ph;last_low[i]=pl
 d['swinghigh']=last_high;d['swinglow']=last_low
 # Previous completed FVGs only, first touch; inversion = close through prior opposite boundary.
 fvg_b=np.zeros(n);fvg_s=np.zeros(n);inv_b=np.zeros(n);inv_s=np.zeros(n);zones=[]
 for i in range(n):
  zones=[z for z in zones if i-z[0]<=40];active=[]
  for j,side,bottom,top in zones:
   touched=low[i]<=top and high[i]>=bottom
   invalid=(side==1 and cl[i]<bottom) or (side==-1 and cl[i]>top)
   if side==1 and cl[i]<bottom:inv_s[i]=1
   if side==-1 and cl[i]>top:inv_b[i]=1
   if touched:
    if side==1:fvg_b[i]=1
    else:fvg_s[i]=1
   elif not invalid:active.append((j,side,bottom,top))
  zones=active
  if i>=2 and tm[i]-tm[i-1]==900 and tm[i-1]-tm[i-2]==900:
   if low[i]>high[i-2]:zones.append((i,1,high[i-2],low[i]))
   if high[i]<low[i-2]:zones.append((i,-1,high[i],low[i-2]))
 d['fvg_b']=fvg_b;d['fvg_s']=fvg_s;d['inv_b']=inv_b;d['inv_s']=inv_s
 # No-wick engine is not used. Structure here is explicit prior confirmed-pivot/EMA proxy.
 prior_low=d.low.rolling(20,min_periods=20).min().shift(1);prior_high=d.high.rolling(20,min_periods=20).max().shift(1);bull_cross=(d.vwma.shift(1)<=d.ema20.shift(1))&(d.vwma>d.ema20);bear_cross=(d.vwma.shift(1)>=d.ema20.shift(1))&(d.vwma<d.ema20)
 bull_react=(d.low<=d.vwma)&(d.close>d.vwma)&(d.close>d.open);bear_react=(d.high>=d.vwma)&(d.close<d.vwma)&(d.close<d.open)
 bull=bull_cross|bull_react;bear=bear_cross|bear_react;direction=np.where(bull&~bear,1,np.where(bear&~bull,-1,0));d['direction']=direction;sg=pd.Series(direction,index=d.index)
 d['cross']=np.where(direction==1,bull_cross,bear_cross).astype(float);d['ma_reaction']=np.where(direction==1,bull_react,bear_react).astype(float)
 d['h4_trend_align']=sg*np.sign(d.h4fast-d.h4slow);d['m15_trend_align']=sg*np.sign(d.ema50-d.ema200);d['ema50_slope_align']=sg*(d.ema50-d.ema50.shift(5))/d.atr;d['dist_ema200_atr']=sg*(d.close-d.ema200)/d.atr;d['dist_vwma_atr']=sg*(d.close-d.vwma)/d.atr
 d['sweep']=np.where(direction==1,(d.low<prior_low)&(d.close>prior_low),(d.high>prior_high)&(d.close<prior_high)).astype(float);d['fvg_retest']=np.where(direction==1,d.fvg_b,d.fvg_s);d['ifvg_flip']=np.where(direction==1,d.inv_b,d.inv_s)
 bos_b=d.close>d.swinghigh.shift(1);bos_s=d.close<d.swinglow.shift(1);d['bos']=np.where(direction==1,bos_b,bos_s).astype(float);d['mss_proxy']=np.where(direction==1,bos_b&(d.ema50<d.ema200),bos_s&(d.ema50>d.ema200)).astype(float)
 engulf_b=(d.close>d.open)&(d.open<=d.close.shift())&(d.close>=d.open.shift())&(d.close.shift()<d.open.shift());engulf_s=(d.close<d.open)&(d.open>=d.close.shift())&(d.close<=d.open.shift())&(d.close.shift()>d.open.shift());d['engulfing']=np.where(direction==1,engulf_b,engulf_s).astype(float)
 range_=(d.high-d.low).replace(0,np.nan);lower=np.minimum(d.open,d.close)-d.low;upper=d.high-np.maximum(d.open,d.close);d['rejection_wick']=np.where(direction==1,lower/range_,upper/range_);d['body_atr']=sg*(d.close-d.open)/d.atr;d['close_position']=np.where(direction==1,(d.close-d.low)/range_,(d.high-d.close)/range_);d['atr_ratio']=d.atr/d.atr.rolling(96,min_periods=96).median().shift(1);d['tick_volume_ratio']=d.volratio
 # Fixed UTC sessions exactly as Triad; decision time = close, not open.
 decision=d.index+pd.Timedelta(minutes=15);mins=decision.hour*60+decision.minute;d['session_london']=((mins>=420)&(mins<600)).astype(int);d['session_overlap']=((mins>=720)&(mins<900)).astype(int);d['session_ny']=((mins>=900)&(mins<1020)).astype(int)
 d['contiguous']=(d.time.diff()==900)&(d.time.diff().shift(1)==900);d['decision_time']=decision;d['start_time']=d.time;return d

def event_for(d,i,horizon=48,slip=0.10,direction=None):
 """Known signal at bar i close. Enter next open on ask/bid, with per-side slippage in $/oz."""
 if i+1>=len(d):return None
 r=d.iloc[i];n=d.iloc[i+1];side=int(r.direction) if direction is None else int(direction)
 if int(n.time-r.time)!=900:return None
 entry=float(n.ask_open+slip if side==1 else n.bid_open-slip);raw=float(r.swinglow if side==1 else r.swinghigh);atr=float(r.atr)
 if not np.isfinite(raw) or not np.isfinite(atr):return None
 stop=raw-side*max(.20,.15*atr);risk=side*(entry-stop)
 if not (0.2*atr<=risk<=25):return None
 # Opposite confirmed swing is structural target if 1R–3R away, otherwise 1.5R fallback.
 opposing=float(r.swinghigh if side==1 else r.swinglow);dist=side*(opposing-entry);struct=np.isfinite(opposing) and 1.0*risk<=dist<=3.0*risk
 target=opposing if struct else entry+side*1.5*risk
 for k in range(i+1,min(len(d),i+1+horizon)):
  b=d.iloc[k]
  if k>i+1 and int(b.time-d.iloc[k-1].time)!=900:return {'result':'gap','entry_i':i+1,'exit_i':k,'entry':entry,'stop':stop,'target':target,'risk':risk,'target_type':'swing' if struct else 'fixed_R'}
  exit_open=float(b.bid_open if side==1 else b.ask_open);exhigh=float(b.bid_high if side==1 else b.ask_high);exlow=float(b.bid_low if side==1 else b.ask_low)
  gap_stop=exit_open<=stop if side==1 else exit_open>=stop;gap_tp=exit_open>=target if side==1 else exit_open<=target
  hit_stop=exlow<=stop if side==1 else exhigh>=stop;hit_tp=exhigh>=target if side==1 else exlow<=target
  ambiguous=hit_stop and hit_tp and not gap_stop and not gap_tp
  if gap_stop or gap_tp or hit_stop or hit_tp:
   price=exit_open if gap_stop else target if gap_tp else stop if hit_stop else target
   price-=side*slip
   net=side*(price-entry)
   return {'result':'ambiguous' if ambiguous else 'stop' if (gap_stop or (hit_stop and not gap_tp)) else 'target','entry_i':i+1,'exit_i':k,'entry':entry,'exit':price,'stop':stop,'target':target,'risk':risk,'net_price':net,'net_r':net/risk,'target_type':'swing' if struct else 'fixed_R'}
 if i+horizon>=len(d):return None
 b=d.iloc[i+horizon];price=float(b.bid_close if side==1 else b.ask_close)-side*slip;net=side*(price-entry)
 return {'result':'timeout','entry_i':i+1,'exit_i':i+horizon,'entry':entry,'exit':price,'stop':stop,'target':target,'risk':risk,'net_price':net,'net_r':net/risk,'target_type':'swing' if struct else 'fixed_R'}

def build_events(d,slip=.10):
 valid=(d.direction!=0)&(d.session_london+d.session_overlap+d.session_ny>0)&d.contiguous&d[FEATURES].replace([np.inf,-np.inf],np.nan).notna().all(axis=1)
 events=[]
 for i in np.flatnonzero(valid.to_numpy()):
  e=event_for(d,int(i),slip=slip)
  if e is None:continue
  r=d.iloc[i];e.update({'index':int(i),'decision_time':r.decision_time.isoformat(),'direction':int(r.direction),'date':str(r.decision_time.date()),'exit_time':(d.index[e['exit_i']]+pd.Timedelta(minutes=15)).isoformat(),'features':{k:float(r[k]) for k in FEATURES}});events.append(e)
 return events

def replay(events,select,initial=1000):
 balance=peak=initial;dd=0;last_exit=-1;count={};wins=losses=0;gains=loss=0;records=[];excluded=0
 for e in events:
  if not select(e) or e['index']<last_exit or count.get(e['date'],0)>=2:continue
  lots=min(.05,math.floor((balance*.02/(e['risk']*100))*100+1e-10)/100)
  if lots<.01:continue
  count[e['date']]=count.get(e['date'],0)+1;last_exit=e['exit_i'];
  if e['result']=='gap':excluded+=1;records.append({**e,'lots':lots,'pnl':None,'balance':balance});continue
  pnl=e['net_price']*lots*100;balance+=pnl;peak=max(peak,balance);dd=max(dd,(peak-balance)/peak*100 if peak>0 else 0);wins+=pnl>0;losses+=pnl<=0;gains+=max(0,pnl);loss+=max(0,-pnl);records.append({**e,'lots':lots,'pnl':pnl,'balance':balance})
 resolved=wins+losses;return {'trades':resolved,'wins':wins,'losses':losses,'win_rate':round(100*wins/resolved,2) if resolved else None,'net_usd':round(balance-initial,2),'return_pct':round(100*(balance-initial)/initial,2),'profit_factor':round(gains/loss,3) if loss else None,'max_closed_dd_pct':round(dd,2),'ambiguous_stop_assumed':sum(e['result']=='ambiguous' for e in records),'gaps_excluded':excluded,'trades_per_week':None,'avg_net_r':round(np.mean([r['net_r'] for r in records if r['result']!='gap']),4) if resolved else None,'records':records}

def main():
 raw=DATA.read_bytes();rows=json.loads(raw);d=make_features(rows);events=build_events(d);slip_stress=build_events(d,slip=.30);bounds={'train':('2024-01-01','2025-01-01'),'validation':('2025-01-01','2026-01-01'),'test':('2026-01-01','2026-07-01')}
 def partition(ev,key):
  a,b=bounds[key];return [e for e in ev if a<=e['decision_time'][:10]<b and e['exit_time'][:10]<b]
 train=partition(events,'train');val=partition(events,'validation');test=partition(events,'test');valid_label=lambda e:e['result'] not in ('ambiguous','gap');train_label=[e for e in train if valid_label(e)];
 X=lambda es:np.array([[e['features'][k] for k in FEATURES] for e in es]);y=lambda es:np.array([int(e['net_price']>0) for e in es]);
 if len(train_label)<100 or len(set(y(train_label)))<2:raise RuntimeError('Insufficient training data; no model fitted.')
 models={'logistic':make_pipeline(StandardScaler(),LogisticRegression(C=.25,max_iter=1500,random_state=42)),'tree':DecisionTreeClassifier(max_depth=3,min_samples_leaf=40,random_state=42)}
 for m in models.values():m.fit(X(train_label),y(train_label))
 for name,es in [('train',train),('validation',val),('test',test)]:
  if es:
   matrix=X(es)
   for key,m in models.items():
    for e,p in zip(es,m.predict_proba(matrix)[:,1]):e['p_'+key]=float(p)
 baseline=lambda e:e['features']['h4_trend_align']>0 and e['features']['m15_trend_align']>0
 valbase=replay(val,baseline);candidates=[]
 for name in models:
  for threshold in [.50,.55,.60]:
   r=replay(val,lambda e,n=name,t=threshold:e['p_'+n]>=t);candidates.append({'model':name,'threshold':threshold,'stats':r})
 eligible=[c for c in candidates if c['stats']['trades']>=30 and c['stats']['profit_factor'] is not None and c['stats']['profit_factor']>1 and c['stats']['net_usd']>0]
 eligible.sort(key=lambda c:c['stats']['net_usd'],reverse=True);chosen=eligible[0] if eligible else None
 testbase=replay(test,baseline);spec=chosen or {'model':'logistic','threshold':.55};testmodel=replay(test,lambda e:e['p_'+spec['model']]>=spec['threshold'])
 # Stress uses identical fitted models and decisions; entry/exit slippage alters outcomes, not features.
 st=partition(slip_stress,'test');sp=models[spec['model']].predict_proba(X(st))[:,1] if st else []
 for e,p in zip(st,sp):e['p_selected']=float(p)
 stressbase=replay(st,baseline);stressmodel=replay(st,lambda e:e['p_selected']>=spec['threshold'])
 briers={}
 for split,es in [('validation',val),('test',test)]:
  el=[e for e in es if valid_label(e)];briers[split]={name:round(brier_score_loss(y(el),[e['p_'+name] for e in el]),4) if el else None for name in models}
 # 2025-only group ablations: fit on 2024, fixed 0.50 threshold; exploratory, not causal.
 groups={'h4':['h4_trend_align'],'tick_volume':['tick_volume_ratio'],'structure':['sweep','fvg_retest','ifvg_flip','bos','mss_proxy'],'candles':['engulfing','rejection_wick','body_atr','close_position'],'session':['session_london','session_overlap','session_ny'],'volatility':['atr_ratio','range_ratio']};ablation={}
 for group,removed in groups.items():
  cols=[k for k in FEATURES if k not in removed];xx=lambda es:np.array([[e['features'][k] for k in cols] for e in es]);model=make_pipeline(StandardScaler(),LogisticRegression(C=.25,max_iter=1500,random_state=42));model.fit(xx(train_label),y(train_label));pred=model.predict_proba(xx(val))[:,1]
  for e,prediction in zip(val,pred):e['p_ablation']=float(prediction)
  summary=replay(val,lambda e:e['p_ablation']>=.50);vl=[e for e in val if valid_label(e)];brier=brier_score_loss(y(vl),[e['p_ablation'] for e in vl]) if vl else None
  ablation[group]={'removed':removed,'brier':round(float(brier),4) if brier is not None else None,'trades':summary['trades'],'net_usd':summary['net_usd'],'profit_factor':summary['profit_factor']}
 def calibration(es,name):
  usable=[e for e in es if valid_label(e)];result=[]
  for lo,hi in [(0,.4),(.4,.5),(.5,.6),(.6,1.001)]:
   group=[e for e in usable if lo<=e['p_'+name]<hi];result.append({'probability_bin':f'{lo:.1f}–{hi if hi<1 else 1:.1f}','count':len(group),'mean_score':round(float(np.mean([e['p_'+name] for e in group])),4) if group else None,'positive_net_rate':round(float(np.mean([e['net_price']>0 for e in group])),4) if group else None})
  return result
 calibration_summary={period:calibration(es,'logistic') for period,es in [('validation',val),('test',test)]}
 volatility={}
 for name,predicate in [('low',lambda x:x<.8),('middle',lambda x:.8<=x<=1.2),('high',lambda x:x>1.2)]:
  r=replay(val,lambda e,p=predicate:baseline(e) and p(e['features']['atr_ratio']));volatility[name]={k:r[k] for k in ('trades','wins','losses','win_rate','net_usd','profit_factor','max_closed_dd_pct')}
 prevalence=float(np.mean(y(train_label)));climatology={}
 for period,es in [('validation',val),('test',test)]:
  usable=[e for e in es if valid_label(e)];climatology[period]=round(float(brier_score_loss(y(usable),np.full(len(usable),prevalence))),4) if usable else None
 session_observed={}
 for label,feature in [('London','session_london'),('Overlap','session_overlap'),('NY','session_ny')]:
  rr=[x for x in testbase['records'] if x['result']!='gap' and x['features'][feature]>0];session_observed[label]={'trades':len(rr),'wins':sum(x['pnl']>0 for x in rr),'net_usd':round(sum(x['pnl'] for x in rr),2)}
 coefs=models['logistic'].named_steps['logisticregression'].coef_[0];coef=sorted(zip(FEATURES,[round(float(v),4) for v in coefs]),key=lambda x:-abs(x[1]));tree=export_text(models['tree'],feature_names=FEATURES)
 def compact(r):return {k:v for k,v in r.items() if k!='records'}
 output={'data_sha256':hashlib.sha256(raw).hexdigest(),'bars':len(d),'bounds':bounds,'feature_names':FEATURES,'counts':{k:{'events':len(e),'labelable':sum(valid_label(x) for x in e),'ambiguous':sum(x['result']=='ambiguous' for x in e),'gap':sum(x['result']=='gap' for x in e)} for k,e in [('train',train),('validation',val),('test',test)]},'validation_baseline':compact(valbase),'validation_candidates':[{'model':c['model'],'threshold':c['threshold'],'stats':compact(c['stats'])} for c in candidates],'selected':{'model':spec['model'],'threshold':spec['threshold'],'selection_criteria_met':bool(chosen)},'test_baseline':compact(testbase),'test_model':compact(testmodel),'stress_baseline':compact(stressbase),'stress_model':compact(stressmodel),'brier':briers,'training_positive_rate':prevalence,'constant_brier':climatology,'test_baseline_by_session':session_observed,'calibration':calibration_summary,'validation_ablation':ablation,'validation_volatility_descriptive':volatility,'logistic_coefficients':coef,'decision_tree':tree}
 Path('research/data/ml-xau-results.json').write_text(json.dumps(output,indent=2));Path('research/data/ml-xau-candidates.json').write_text(json.dumps({'train':train,'validation':val,'test':test},separators=(',',':')));Path('research/data/ml-xau-trades.json').write_text(json.dumps({'baseline':testbase['records'],'model':testmodel['records']},indent=2));print(json.dumps(output,indent=2))
if __name__=='__main__':main()
