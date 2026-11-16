#!/usr/bin/env python3
"""Bounded, causal entry/checklist hypotheses on 2023–25 OANDA history."""
import contextlib,io,runpy,json,math
from collections import defaultdict
import numpy as np,pandas as pd
from complementary_vwma_2023_2025 import make_events,deduplicate
from intraday_vwma_2023_2025 import sim,NY
from execution_research_2023_2025 import dump_csv

def wilder(values,n=14):
    """Wilder mean seeded with an n-value SMA; resets on non-finite inputs."""
    out=np.full(len(values),np.nan);run=[];state=None
    for i,v in enumerate(values):
        if not np.isfinite(v):run=[];state=None;continue
        if state is None:
            run.append(v)
            if len(run)==n:state=float(np.mean(run));out[i]=state
        else:state=(state*(n-1)+v)/n;out[i]=state
    return out

def directional_index(high,low,close,n=14):
    h=np.asarray(high);l=np.asarray(low);c=np.asarray(close);size=len(h)
    tr=np.full(size,np.nan);plus=np.full(size,np.nan);minus=np.full(size,np.nan)
    for i in range(1,size):
        up=h[i]-h[i-1];down=l[i-1]-l[i];plus[i]=up if up>down and up>0 else 0.;minus[i]=down if down>up and down>0 else 0.;tr[i]=max(h[i]-l[i],abs(h[i]-c[i-1]),abs(l[i]-c[i-1]))
    t=wilder(tr,n);p=wilder(plus,n);m=wilder(minus,n);pdi=np.full(size,np.nan);mdi=np.full(size,np.nan)
    valid=np.isfinite(t)&(t>0);pdi[valid]=100*p[valid]/t[valid];mdi[valid]=100*m[valid]/t[valid]
    denom=pdi+mdi;dx=np.full(size,np.nan);good=np.isfinite(denom)&(denom>0);dx[good]=100*np.abs(pdi[good]-mdi[good])/denom[good];dx[valid&(denom==0)]=0.
    return wilder(dx,n),pdi,mdi

def annotate(g,events,adx,pdi,mdi):
    # The first retest is the first qualifying signal, even if it never becomes a fill.
    counts=defaultdict(int)
    for x in sorted(events,key=lambda e:(e['index'],e['setup'])):
        i=x['index'];side=x['direction'];r=g['d'].iloc[i];atr=x['atr'];rng=g['h'][i]-g['l'][i]
        body=side*(g['c'][i]-g['o'][i])/atr;closepos=((g['c'][i]-g['l'][i])/rng if side==1 else (g['h'][i]-g['c'][i])/rng) if rng>0 else np.nan
        oldopen=g['o'][i-1];oldclose=g['c'][i-1];engulf=(side*(oldclose-oldopen)<0 and side*(g['c'][i]-oldopen)>=0 and side*(g['o'][i]-oldclose)<=0)
        previous=side*(g['c'][i]-(g['h'][i-1] if side==1 else g['l'][i-1]))>0
        x.update({'feature_adx':float(adx[i]) if np.isfinite(adx[i]) else None,'feature_di_aligned':bool(side*(pdi[i]-mdi[i])>0) if np.isfinite([pdi[i],mdi[i]]).all() else None,'feature_body_atr':float(body),'feature_close_position':float(closepos) if np.isfinite(closepos) else None,'feature_prev_extreme_close':bool(previous),'feature_engulfing':bool(engulf),'feature_atr_ratio':float(r.atr_ratio) if np.isfinite(r.atr_ratio) else None,'feature_fvg_touch':bool(r.fvg_b if side==1 else r.fvg_s)})
        if x['setup']=='breakout_retest' and x.get('breakout_index') is not None:
            key=(side,x['breakout_index']);counts[key]+=1;x['retest_number']=counts[key];x['retest_age']=i-x['breakout_index']

def delayed_confirmation(g,events):
    out=[];d=g['d'];tm=g['tm'];n=len(tm);dates=pd.to_datetime(tm,unit='s',utc=True).tz_convert(NY).date
    for original in events:
        if original['setup']!='trend_pullback':continue
        i=original['index'];j=i+1;side=original['direction']
        if j>=n-1 or tm[j]-tm[i]!=900 or dates[j]!=dates[i] or not g['session'][j] or not d.contiguous.iloc[j] or g['shock'][j]:continue
        atr=g['atr'][j];values=[atr,g['ema'][j],g['fast'][j],g['slow'][j],g['line'][j-1],g['p3h'][j],g['p3l'][j]]
        if not np.isfinite(values).all() or side*(g['c'][j]-(g['h'][i] if side==1 else g['l'][i]))<=0 or side*(g['c'][j]-g['o'][j])<=0:continue
        if side*(g['fast'][j]-g['slow'][j])<=0 or side*(g['c'][j]-g['ema'][j])<=0 or side*(g['c'][j]-g['line'][j-1])<=0:continue
        t=pd.Timestamp(tm[j]+900,unit='s',tz='UTC');out.append({'index':j,'year':t.year,'date':t.strftime('%Y-%m-%d'),'decision':t.isoformat(),'direction':side,'trigger':'research','h4_aligned':True,'confirmed_body':True,'p2':g['p2l'][j] if side==1 else g['p2h'][j],'p3':g['p3l'][j] if side==1 else g['p3h'][j],'opposing':g['p3h'][j] if side==1 else g['p3l'][j],'atr':atr,'setup':'trend_pullback','setup_context':'one-bar delayed prior-pullback confirmation','original_signal_index':i})
    return out

def checklist_filter(mode,x):
    adx=x['feature_adx'];body=x['feature_body_atr'];pos=x['feature_close_position'];ar=x['feature_atr_ratio'];strong=body>=.5 and pos is not None and pos>=.75;prior=x['feature_prev_extreme_close']
    passed={'none':True,'adx25':adx is not None and adx>=25,'adx20_di':adx is not None and adx>=20 and x['feature_di_aligned'],'close_previous_extreme':prior,'strong_body':strong,'engulfing':x['feature_engulfing'],'normal_volatility':ar is not None and .8<=ar<=1.2,'same_fvg':x['feature_fvg_touch'],'adx25_strong':adx is not None and adx>=25 and strong,'prior_extreme_strong':prior and strong,'first_retest':x.get('retest_number')==1,'early_retest':x.get('retest_age') is not None and x['retest_age']<=3}.get(mode)
    if passed is None:raise ValueError(mode)
    return None if passed else 'hypothesis_filter'

def main():
    with contextlib.redirect_stdout(io.StringIO()):g=runpy.run_path('research/ml/structure_2023_2025.py')
    adx,pdi,mdi=directional_index(g['h'],g['l'],g['c']);events=make_events(g);annotate(g,events,adx,pdi,mdi)
    delay=delayed_confirmation(g,events);annotate(g,delay,adx,pdi,mdi)
    # A small, fixed list of comparisons (not an exhaustive search of all possible strategies).
    configs=[('breakout_reference','breakout','none'),('pullback_baseline','trend_pullback','none'),('pullback_adx25','trend_pullback','adx25'),('pullback_adx20_di','trend_pullback','adx20_di'),('pullback_prev_extreme','trend_pullback','close_previous_extreme'),('pullback_strong_body','trend_pullback','strong_body'),('pullback_engulfing','trend_pullback','engulfing'),('pullback_normal_atr','trend_pullback','normal_volatility'),('pullback_fvg_touch','trend_pullback','same_fvg'),('pullback_adx25_strong','trend_pullback','adx25_strong'),('pullback_prev_extreme_strong','trend_pullback','prior_extreme_strong'),('pullback_next_confirm','delayed','none'),('retest_baseline','breakout_retest','none'),('retest_first','breakout_retest','first_retest'),('retest_early','breakout_retest','early_retest')]
    scenarios=[];trades=[];candidates=[]
    for name,setup,mode in configs:
        source=delay if setup=='delayed' else [x for x in events if x['setup']==setup]
        selected,_=deduplicate(source,('trend_pullback',) if setup=='delayed' else (setup,));local={**g,'candidates':selected}
        for year in (2023,2024,2025):
            for stress in (False,True):
                costs={'slip':.30,'commission':10.,'stop_extra':.50} if stress else {}
                s,rr=sim(local,year,'baseline',candidate_filter=lambda x,m=mode:checklist_filter(m,x),**costs)
                scenarios.append({'hypothesis':name,'cost_case':'stress' if stress else 'base',**{k:v for k,v in s.items() if k not in ('variant','rejects')}})
                if not stress:
                    candidates.append({'hypothesis':name,'year':year,'candidate_bars':sum(x['year']==year for x in selected),'fills':len(rr),**{f'rejected_{k}':v for k,v in s['rejects'].items()}})
                    trades.extend([{'hypothesis':name,**x} for x in rr])
    fields=['hypothesis','year','candidate_bars','fills']+sorted({k for x in candidates for k in x if k.startswith('rejected_')})
    dump_csv('reports/vwma-entry-hypotheses-scenarios.csv',scenarios,list(scenarios[0]));dump_csv('reports/vwma-entry-hypotheses-funnel.csv',candidates,fields)
    dump_csv('reports/vwma-entry-hypotheses-trades.csv',trades,['hypothesis','setup','decision','exit_time','direction','session','result','entry','stop','target','exit','lots','planned_stop_usd','pnl','r_net','balance','feature_adx','feature_di_aligned','feature_body_atr','feature_close_position','feature_prev_extreme_close','feature_engulfing','feature_atr_ratio','feature_fvg_touch','retest_number','retest_age','original_signal_index'])
    # Report also feature-rich close-time candidate context (does not include future outcomes).
    all_candidates=[]
    for x in events+delay:
        if x['setup'] in ('trend_pullback','breakout_retest'):
            all_candidates.append({**x,'signal_kind':'delayed' if 'original_signal_index' in x else x['setup']})
    dump_csv('reports/vwma-entry-hypotheses-candidates.csv',all_candidates,['signal_kind','decision','direction','feature_adx','feature_di_aligned','feature_body_atr','feature_close_position','feature_prev_extreme_close','feature_engulfing','feature_atr_ratio','feature_fvg_touch','breakout_index','retest_number','retest_age','original_signal_index'])
    print(json.dumps({'scenarios':scenarios,'candidate_funnels':candidates},indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
if __name__=='__main__':main()
