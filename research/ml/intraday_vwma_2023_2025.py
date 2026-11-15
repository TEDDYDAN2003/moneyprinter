#!/usr/bin/env python3
"""Flat-before-close, exploratory causal VWMA replay. Research only, no orders."""
import contextlib, io, runpy, csv, json, math
from collections import Counter,defaultdict
from pathlib import Path
from zoneinfo import ZoneInfo
import numpy as np,pandas as pd
from execution_research_2023_2025 import lots_for,fill_bar,dump_csv

NY=ZoneInfo('America/New_York')
# Conservative fixed deadline, observed from this dataset, not an exchange holiday calendar.
CUTOFF=12*60+45

def local_minutes(timestamp):
    t=pd.Timestamp(timestamp,unit='s',tz='UTC').tz_convert(NY)
    return t.hour*60+t.minute

def sim(g,year,variant='diagnostic',cutoff=CUTOFF,slip=.1,commission=7.,stop_extra=0.,candidate_filter=None):
    d=g['d'];tm=g['tm'];N=len(tm)
    if '_intraday_minutes' not in g:
        g['_intraday_minutes']=np.array([local_minutes(t+900) for t in tm])
        g['_intraday_dates']=pd.to_datetime(tm,unit='s',utc=True).tz_convert(NY).date
    minute=g['_intraday_minutes'];dates=g['_intraday_dates']
    inds=np.flatnonzero((tm>=pd.Timestamp(f'{year}-01-01',tz='UTC').timestamp())&(tm<pd.Timestamp(f'{year+1}-01-01',tz='UTC').timestamp()));last_year=int(inds[-1])
    balance=peak=1000.;dd=0.;last=-1;daily=Counter();records=[];reject=Counter();unknown=0
    def mark(eq):
        nonlocal peak,dd
        peak=max(peak,eq)
        if peak>0:dd=max(dd,(peak-eq)/peak*100)
    for x in g['candidates']:
        if x['year']!=year:continue
        i=x['index'];j=i+1;side=x['direction'];reason=None
        if variant!='baseline' and (not x['h4_aligned'] or x['trigger']!='reaction'):reason='h4_or_trigger'
        elif i<last:reason='position_open'
        elif daily[x['date']]>=2:reason='daily_cap'
        elif j>last_year or tm[j]-tm[i]!=900:reason='next_open_missing'
        elif minute[i]>=cutoff:reason='past_flatten_cutoff'
        if reason:reject[reason]+=1;continue
        atr=x['atr'];entry=float(g['ao'][j]+slip if side==1 else g['bo'][j]-slip);pivot=x['p3'];stop=pivot-side*max(.20,.15*atr);risk=side*(entry-stop)
        if not np.isfinite(risk) or not .2*atr<=risk<=25:reject['invalid_stop']+=1;continue
        dist=side*(g['c'][i]-g['line'][i-1])/atr;stop_atr=risk/atr;vol=float(d.iloc[i].atr_ratio)
        # Hypotheses fixed from the preceding study, before this revised replay.
        threshold={'line_0_4':.4,'line_0_5':.5,'line_0_6':.6,'line_stop':.5}.get(variant)
        if threshold is not None and dist<threshold:reject['line_distance']+=1;continue
        if variant in ('stop_1','line_stop') and stop_atr<1.:reject['stop_distance']+=1;continue
        if variant=='low_vol' and (not np.isfinite(vol) or vol>1.2):reject['volatility']+=1;continue
        if candidate_filter is not None:
            reason=candidate_filter(x)
            if reason:
                reject[reason]+=1;continue
        lots=lots_for(balance,risk,slip,commission)
        if lots<.01:reject['risk_budget']+=1;continue
        q=x['opposing'];delta=side*(q-entry);target=float(q if np.isfinite(q) and risk<=delta<=3*risk else entry+side*1.5*risk)
        start=balance;daily[x['date']]+=1;res=None;exit_price=None
        def equity(price):return start+side*(price-entry)*lots*100-commission*lots
        for k in range(j,min(i+48,last_year)+1):
            # Do not use the future gap to flatten earlier. Unexpected missing bars remain unknown.
            if k>j and tm[k]-tm[k-1]!=900:
                res='unexpected_gap_unknown';unknown+=1;break
            op=float(g['bo'][k] if side==1 else g['ao'][k]);hi=float(g['bh'][k] if side==1 else g['ah'][k]);lo=float(g['bl'][k] if side==1 else g['al'][k]);cl=float(g['bc'][k] if side==1 else g['ac'][k]);bad=lo if side==1 else hi
            mark(equity(op-side*slip));f=fill_bar(side,op,hi,lo,stop,target,slip,stop_extra=stop_extra)
            if f and f[0] in ('open_stop','open_target'):
                res,exit_price=f;mark(equity(exit_price));break
            mark(equity(bad-side*slip))
            if f:res,exit_price=f;mark(equity(exit_price));break
            if minute[k]>=cutoff or dates[k]!=dates[j]:res='scheduled_flat';exit_price=cl-side*slip;mark(equity(exit_price));break
            mark(equity(cl-side*slip))
        if res=='unexpected_gap_unknown':
            last=k
            records.append({**x,'result':res,'entry':entry,'stop':stop,'target':target,'exit_time':pd.Timestamp(tm[k],unit='s',tz='UTC').isoformat(),'pnl':None,'balance':balance,'lots':lots,'line_atr':dist,'stop_atr':stop_atr,'atr_ratio':vol})
            continue
        if res is None:res='year_end' if k==last_year else 'timeout';exit_price=cl-side*slip;mark(equity(exit_price))
        pnl=side*(exit_price-entry)*lots*100-commission*lots;balance+=pnl;mark(balance);last=k
        row=d.iloc[i];session='London' if row.session_london else ('Overlap' if row.session_overlap else 'NY')
        records.append({**x,'session':session,'result':res,'entry':entry,'stop':stop,'target':target,'exit':exit_price,'exit_time':pd.Timestamp(tm[k]+900,unit='s',tz='UTC').isoformat(),'pnl':pnl,'r_net':pnl/(risk*lots*100+slip*lots*100+commission*lots),'balance':balance,'lots':lots,'line_atr':dist,'stop_atr':stop_atr,'atr_ratio':vol,'body_atr':side*(g['c'][i]-g['o'][i])/atr,'swing_atr':abs(g['p3h'][i]-g['p3l'][i])/atr,'planned_stop_usd':lots*(risk*100+slip*100+commission)})
    known=[x for x in records if x['pnl'] is not None];p=[x['pnl'] for x in known];win=[x for x in p if x>0];lose=[x for x in p if x<=0];gp=sum(win);gl=-sum(lose)
    stats={'variant':variant,'year':year,'trades':len(known),'wins':len(win),'win_rate':round(len(win)/len(p)*100,2) if p else None,'net':round(balance-1000,2),'pf':round(gp/gl,3) if gl else None,'avg_winner':round(sum(win)/len(win),2) if win else None,'avg_loser':round(sum(lose)/len(lose),2) if lose else None,'avg_net_r':round(float(np.mean([z['r_net'] for z in known])),3) if known else None,'floating_dd_proxy_pct':round(dd,2),'flat_at_cutoff':sum(x['result']=='scheduled_flat' for x in known),'unexpected_gap_unknown':unknown,'days_with_entry':len({x['date'] for x in records}),'session_days':len(g['trading_days'][year]),'rejects':dict(reject)}
    return stats,records

def main():
    with contextlib.redirect_stdout(io.StringIO()):g=runpy.run_path('research/ml/structure_2023_2025.py')
    outputs=[];trades=[];groups=defaultdict(list)
    for v in ('baseline','diagnostic','line_0_4','line_0_5','line_0_6','stop_1','line_stop','low_vol'):
        for y in (2023,2024,2025):
            s,rr=sim(g,y,v);outputs.append(s);trades.extend([{'variant':v,**x} for x in rr])
            if v not in ('baseline','diagnostic') or y not in (2023,2024):continue
            for x in rr:
                if x['pnl'] is None:continue
                line=x['line_atr'];stop=x['stop_atr'];vol=x['atr_ratio'];swing=x['swing_atr'];body=x['body_atr']
                labels={'session':x['session'],'h4':'aligned' if x['h4_aligned'] else 'not aligned','line_atr':'<0.5' if line<.5 else '0.5–1' if line<1 else '>=1','stop_atr':'<1' if stop<1 else '1–2' if stop<2 else '>=2','atr_ratio':'<0.8' if vol<.8 else '0.8–1.2' if vol<=1.2 else '>1.2','swing_range_atr':'<3' if swing<3 else '3–5' if swing<5 else '>=5','candle_body_atr':'<0.25' if body<.25 else '0.25–0.75' if body<.75 else '>=0.75','result':x['result']}
                for feature,label in labels.items():groups[(v,y,feature,label)].append(x)
    gr=[]
    for (v,y,f,label),rr in sorted(groups.items()):
        p=[x['pnl'] for x in rr];w=[x for x in p if x>0];l=[x for x in p if x<=0];gross=sum(w);loss=-sum(l)
        gr.append({'variant':v,'year':y,'feature':f,'group':label,'trades':len(p),'wins':len(w),'losses':len(l),'win_rate':round(len(w)/len(p)*100,1),'net':round(sum(p),2),'profit_factor':round(gross/loss,3) if loss else None,'avg_net_r':round(float(np.mean([z['r_net'] for z in rr])),3)})
    for v in ('diagnostic','line_0_5','line_stop'):
        for y in (2023,2024,2025):
            s,_=sim(g,y,v,slip=.30,commission=10.,stop_extra=.50);s['variant']=v+'_cost_stress';outputs.append(s)
    compact=[{k:v for k,v in s.items() if k!='rejects'} for s in outputs]
    dump_csv('reports/vwma-intraday-scenarios-2023-2025.csv',compact,list(compact[0]))
    dump_csv('reports/vwma-intraday-loss-groups-2023-2024.csv',gr,list(gr[0]))
    dump_csv('reports/vwma-intraday-trades-2023-2025.csv',trades,['variant','year','decision','exit_time','direction','trigger','session','h4_aligned','result','entry','stop','target','exit','lots','planned_stop_usd','pnl','r_net','balance','line_atr','stop_atr','atr_ratio','body_atr','swing_atr'])
    print(json.dumps({'scenarios':outputs,'groups':gr},indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
if __name__=='__main__':main()
