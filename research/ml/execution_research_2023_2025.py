#!/usr/bin/env python3
"""Research-only OANDA XAU M15 execution replay; no orders, 2023–25 only."""
import contextlib, io, json, math, runpy, csv
from collections import Counter, defaultdict
from pathlib import Path
import numpy as np
import pandas as pd

OUT=Path('research/data')

def lots_for(balance, distance, exit_slip=.10, commission_per_lot=7., maximum=.05):
    # 1 lot = 100 oz. Commission is round-turn, entry slip already in entry price.
    unit=distance+exit_slip+commission_per_lot/100
    if unit<=0 or balance<=0:return 0.
    return min(maximum, math.floor((balance*.02/(unit*100))*100+1e-10)/100)

def fill_bar(side, op, hi, lo, stop, target, slip, gap_extra=0., gap=False, stop_extra=0.):
    """Quote OHLC on executable closing side. Market stop; limit target; stop first."""
    gs=op<=stop if side==1 else op>=stop
    gt=op>=target if side==1 else op<=target
    st=lo<=stop if side==1 else hi>=stop
    tp=hi>=target if side==1 else lo<=target
    if gs:return 'gap_stop' if gap else 'open_stop',op-side*(slip+stop_extra+(gap_extra if gap else 0))
    if gt:return 'gap_target' if gap else 'open_target',target-side*slip
    if st:return 'ambiguous_stop' if tp else 'stop',stop-side*(slip+stop_extra)
    if tp:return 'target',target-side*slip
    return None

def stats(records, starting, ending, floating_dd, days, missing=0):
    p=[x['pnl'] for x in records]; win=sum(x>0 for x in p); gains=sum(x for x in p if x>0);loss=-sum(x for x in p if x<0)
    return {'trades':len(p),'wins':win,'win_rate':round(100*win/len(p),2) if p else None,'net':round(ending-starting,2),'pf':round(gains/loss,3) if loss else None,'floating_dd_stress_pct':round(floating_dd,2),'gap_crossed':sum(x['gaps_crossed']>0 for x in records),'gap_stop':sum(x['result']=='gap_stop' for x in records),'ambiguous_stop':sum(x['result']=='ambiguous_stop' for x in records),'active_days':len({x['date'] for x in records}),'session_days':days,'missing_next_open':missing}

def run(g,year,gate='h4_reaction',target_kind='structure',buffer_atr=.15,slip=.10,gap_extra=0.,commission=7.,collect_misses=False,stop_extra=0.):
    d=g['d']; tm=g['tm']; N=len(tm); signals=[x for x in g['candidates'] if x['year']==year]
    # Fixed annual liquidation is known in advance; separate account every year.
    indices=np.flatnonzero((tm>=pd.Timestamp(f'{year}-01-01',tz='UTC').timestamp()) & (tm<pd.Timestamp(f'{year+1}-01-01',tz='UTC').timestamp()))
    last_year=int(indices[-1]); balance=1000.;peak=1000.;maxdd=0.;last_exit=-1;daily=Counter();records=[];miss=[]
    def mark(value):
        nonlocal peak,maxdd
        peak=max(peak,value)
        if peak>0:maxdd=max(maxdd,(peak-value)/peak*100)
    for x in signals:
        i=x['index'];j=i+1;reason=None
        if gate=='h4_reaction' and (not x['h4_aligned'] or x['trigger']!='reaction'):reason='H4 not aligned' if not x['h4_aligned'] else 'crossover rather than reaction'
        elif gate=='h4' and not x['h4_aligned']:reason='H4 not aligned'
        elif i<last_exit:reason='position already open'
        elif daily[x['date']]>=2:reason='daily cap'
        elif j>last_year or j>=N:reason='end of year'
        elif tm[j]-tm[i]!=900:reason='next open missing'
        if reason:
            miss.append({**x,'reason':reason})
            continue
        side=x['direction'];entry=float((g['ao'][j]+slip) if side==1 else (g['bo'][j]-slip));pivot=x['p3']
        if not np.isfinite(pivot):reason='no confirmed swing'
        else:
            stop=pivot-side*max(.20,buffer_atr*x['atr']);risk=side*(entry-stop)
            if not (.2*x['atr']<=risk<=25):reason='invalid or oversized stop'
        if reason:
            miss.append({**x,'reason':reason})
            continue
        lots=lots_for(balance,risk,slip,commission)
        if lots<.01:
            miss.append({**x,'reason':'minimum lot exceeds risk budget'})
            continue
        q=x['opposing'];dist=side*(q-entry)
        if target_kind=='structure':target=q if np.isfinite(q) and risk<=dist<=3*risk else entry+side*1.5*risk
        else:target=entry+side*float(target_kind)*risk
        startbal=balance;daily[x['date']]+=1;gaps=0;result=None;exitprice=None
        # Mark equity at executable bid/ask, with round-turn commission and anticipated exit slip.
        # Pessimistic OHLC adverse excursion may occur after an unobservable exit in the same bar.
        def equity(px):return startbal+side*(px-entry)*lots*100-commission*lots
        for k in range(j,min(i+48,last_year)+1):
            gap=k>j and tm[k]-tm[k-1]!=900
            if gap:gaps+=1
            op=float(g['bo'][k] if side==1 else g['ao'][k]);hi=float(g['bh'][k] if side==1 else g['ah'][k]);lo=float(g['bl'][k] if side==1 else g['al'][k]);close=float(g['bc'][k] if side==1 else g['ac'][k]);adverse=lo if side==1 else hi
            mark(equity(op-side*slip));f=fill_bar(side,op,hi,lo,stop,target,slip,gap_extra,gap,stop_extra)
            if f and f[0] in ('gap_stop','gap_target','open_stop','open_target'):
                result,exitprice=f;mark(equity(exitprice));break
            mark(equity(adverse-side*slip))
            if f:
                result,exitprice=f;mark(equity(exitprice));break
            mark(equity(close-side*slip))
        if result is None:
            result='year_end' if k==last_year else 'timeout';exitprice=close-side*slip;mark(equity(exitprice))
        pnl=side*(exitprice-entry)*lots*100-commission*lots;balance+=pnl;mark(balance);last_exit=k
        # Attributes use known decision candle and previously available features.
        r=d.iloc[i];session='London' if r.session_london else ('Overlap' if r.session_overlap else 'NY')
        records.append({**x,'session':session,'distance_line_atr':side*(float(r.close)-float(g['line'][i-1]))/x['atr'], 'stop_atr':risk/x['atr'],'swing_range_atr':abs(float(g['p3h'][i])-float(g['p3l'][i]))/x['atr'] if np.isfinite([g['p3h'][i],g['p3l'][i]]).all() else None,'atr_ratio':float(r.atr_ratio) if np.isfinite(r.atr_ratio) else None,'lots':lots,'planned_stop_usd':lots*(risk*100+slip*100+commission),'entry':entry,'stop':stop,'target':float(target),'exit':exitprice,'exit_time':pd.Timestamp(tm[k]+900,unit='s',tz='UTC').isoformat(),'result':result,'gaps_crossed':gaps,'pnl':pnl,'balance':balance})
    return stats(records,1000,balance,maxdd,len(g['trading_days'][year]),sum(m['reason']=='next open missing' for m in miss)),records,miss

def dump_csv(path, rows, fields):
    with open(path,'w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore',lineterminator='\n');w.writeheader();w.writerows(rows)

def main():
    with contextlib.redirect_stdout(io.StringIO()):g=runpy.run_path('research/ml/structure_2023_2025.py')
    configs=[('baseline','base','structure',.15),('diagnostic','h4_reaction','structure',.15),('fixed_1R','h4_reaction','1.0',.15),('fixed_1_5R','h4_reaction','1.5',.15),('tight_buffer','h4_reaction','structure',.05),('wide_buffer','h4_reaction','structure',.40)]
    allstats=[];trades=[];misses=[]
    for name,gate,target,buf in configs:
        for year in (2023,2024,2025):
            s,rr,mm=run(g,year,gate,target,buf,collect_misses=(name=='diagnostic'));allstats.append({'scenario':name,'year':year,**s})
            trades += [{'scenario':name,'year':year,**x} for x in rr]
            if name=='diagnostic':misses += [{'year':year,**x} for x in mm]
    for extra in (.5,1.):
        for year in (2023,2024,2025):
            s,rr,_=run(g,year,gap_extra=extra);allstats.append({'scenario':f'gap_stop_extra_{extra}', 'year':year,**s})
    for extra in (.5,1.):
        for year in (2023,2024,2025):
            s,rr,_=run(g,year,stop_extra=extra);allstats.append({'scenario':f'all_stop_extra_{extra}', 'year':year,**s})
    for year in (2023,2024,2025):
        s,rr,_=run(g,year,slip=.30,gap_extra=1.,commission=10.,stop_extra=.5);allstats.append({'scenario':'combined_adverse', 'year':year,**s})
    groups=defaultdict(list)
    for r in trades:
        if r['scenario'] not in ('diagnostic','baseline') or r['year']!=2023:continue
        dist=r['distance_line_atr'];stop=r['stop_atr'];vol=r['atr_ratio'];swing=r['swing_range_atr']
        labels={'h4': 'aligned' if r['h4_aligned'] else 'not aligned','session':r['session'],'distance_from_line_atr': '<0.5' if dist<.5 else '0.5–1' if dist<1 else '>=1','confirmed_swing_range_atr':'unknown' if swing is None else '<3' if swing<3 else '3–5' if swing<5 else '>=5','stop_distance_atr':'<1' if stop<1 else '1–2' if stop<2 else '>=2','atr_ratio':'unknown' if vol is None else '<0.8' if vol<.8 else '0.8–1.2' if vol<=1.2 else '>1.2'}
        for k,v in labels.items():groups[r['scenario'],k,v].append(r)
    group_rows=[]
    for (scenario,kind,label),rr in sorted(groups.items()):
        p=[r['pnl'] for r in rr];gain=sum(x for x in p if x>0);loss=-sum(x for x in p if x<0)
        group_rows.append({'scenario':scenario,'feature':kind,'group':label,'trades':len(p),'wins':sum(x>0 for x in p),'win_rate':round(100*sum(x>0 for x in p)/len(p),1),'net':round(sum(p),2),'profit_factor':round(gain/loss,3) if loss else None})
    dump_csv('reports/vwma-execution-scenarios-2023-2025.csv',allstats,list(allstats[0]))
    dump_csv('reports/vwma-execution-trades-2023-2025.csv',trades,['scenario','year','decision','exit_time','direction','trigger','session','h4_aligned','entry','stop','target','exit','result','gaps_crossed','lots','planned_stop_usd','pnl','balance','distance_line_atr','stop_atr','swing_range_atr','atr_ratio'])
    dump_csv('reports/vwma-execution-near-misses-2023-2025.csv',misses,['year','decision','direction','trigger','h4_aligned','confirmed_body','reason'])
    dump_csv('reports/vwma-2023-loss-groups.csv',group_rows,['scenario','feature','group','trades','wins','win_rate','net','profit_factor'])
    print(json.dumps({'scenarios':allstats,'groups':group_rows,'misses':dict(Counter(x['reason'] for x in misses))},indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
if __name__=='__main__':main()
