#!/usr/bin/env python3
"""Causal intraday complementary VWMA setups. Research-only; no orders."""
import contextlib,io,runpy,json
from collections import Counter,defaultdict
import numpy as np,pandas as pd
from intraday_vwma_2023_2025 import sim,NY
from execution_research_2023_2025 import dump_csv
from liquidity_consolidation_2023_2025 import liquidity_features,enrich

PRIORITY=('breakout','breakout_retest','trend_pullback','continuation','sweep_reversal')

def make_events(g):
    tm=g['tm'];n=len(tm);d=g['d'];line=g['line'];atr=g['atr'];c=g['c'];o=g['o'];h=g['h'];l=g['l'];fast=g['fast'];slow=g['slow'];ema=g['ema']
    f=liquidity_features(tm,h,l,c,atr);enrich(g,f)
    events=[];breaks={1:None,-1:None};sweeps={1:None,-1:None};ny_dates=pd.to_datetime(tm,unit='s',utc=True).tz_convert(NY).date
    prevdate=None
    originals={x['index']:x for x in g['candidates']}
    for i in range(220,n-1):
        if i and (tm[i]-tm[i-1]!=900 or ny_dates[i]!=prevdate):breaks={1:None,-1:None};sweeps={1:None,-1:None}
        prevdate=ny_dates[i];z=f[i]
        # Existing breakout is a previously selected candidate. Store only when fully causal.
        x=originals.get(i)
        if x is not None and x['h4_aligned'] and x['trigger']=='reaction' and x.get('box_state')=='breakout_same' and x['direction']*(c[i]-line[i-1])/atr[i]>=.5:
            events.append({**x,'setup':'breakout','setup_context':'previous 12-bar box; 0.5 ATR line displacement'})
        for side in (1,-1):
            br=breaks[side]
            if br and i-br['index']>12:breaks[side]=None;br=None
            sw=sweeps[side]
            if sw and i-sw['index']>3:sweeps[side]=None;sw=None
            swing=g['p3l'][i-1] if side==1 else g['p3h'][i-1]
            # Confirmed prior swing is known before this candle; sweep and reclaim at close.
            swept=np.isfinite(swing) and ((l[i]<swing and c[i]>swing) if side==1 else (h[i]>swing and c[i]<swing))
            if swept:sweeps[side]={'index':i,'level':float(swing)};sw=sweeps[side]
            valid=bool(g['session'][i]) and bool(d.contiguous.iloc[i]) and not g['shock'][i] and np.isfinite([atr[i],ema[i],fast[i],slow[i],line[i-1],g['p3h'][i],g['p3l'][i]]).all()
            if not valid:continue
            direction_ok=side*(fast[i]-slow[i])>0 and side*(c[i]-ema[i])>0 and side*(c[i]-line[i-1])>0
            body=side*(c[i]-o[i])>0
            if not (direction_ok and body):continue
            setups=[];touch_line=l[i]<=line[i-1]<=h[i]
            if touch_line:setups.append(('trend_pullback','directional close after touch of prior VWMA'))
            if br and 1<=i-br['index']<=8:
                edge=br['edge'];touch_edge=(l[i]<=edge+.1*atr[i] and h[i]>=edge-.1*atr[i]);hold=side*(c[i]-edge)>0
                if hold and (touch_edge or touch_line):setups.append(('breakout_retest','retest of breakout edge or prior VWMA'))
            if br and 5<=i-br['index']<=12:
                hi=float(np.max(h[i-4:i]));lo=float(np.min(l[i-4:i]));tight=(hi-lo)<=2*atr[i]
                if tight and side*(c[i]-(hi if side==1 else lo))>0:setups.append(('continuation','post-breakout 4-bar consolidation and directional close'))
            if sw and i-sw['index']<=3:
                setups.append(('sweep_reversal','prior confirmed swing swept and reclaimed, then VWMA aligned'))
            if not setups:continue
            dt=pd.Timestamp(tm[i]+900,unit='s',tz='UTC');r=d.iloc[i]
            item={'index':i,'year':dt.year,'date':dt.strftime('%Y-%m-%d'),'decision':dt.isoformat(),'direction':side,'trigger':'research','h4_aligned':True,'confirmed_body':True,'p2':g['p2l'][i] if side==1 else g['p2h'][i],'p3':g['p3l'][i] if side==1 else g['p3h'][i],'opposing':g['p3h'][i] if side==1 else g['p3l'][i],'atr':atr[i]}
            for label,context in setups:events.append({**item,'setup':label,'setup_context':context})
        # Box is from candles strictly before current close; update only after this bar's setups.
        if z['box_ready'] and z['compressed']:
            if c[i]>z['box_high']:breaks[1]={'index':i,'edge':z['box_high']}
            if c[i]<z['box_low']:breaks[-1]={'index':i,'edge':z['box_low']}
    return events

def deduplicate(events,types):
    selected=[x for x in events if x['setup'] in types];byindex=defaultdict(list)
    for x in selected:byindex[x['index']].append(x)
    merged=[];conflicts=0;overlap=0
    for i,items in sorted(byindex.items()):
        if len({x['direction'] for x in items})>1:conflicts+=1;continue
        items.sort(key=lambda x:PRIORITY.index(x['setup']));pick={**items[0]};pick['all_setups']='|'.join(sorted({x['setup'] for x in items},key=lambda z:PRIORITY.index(z)))
        if len(items)>1:overlap+=1
        merged.append(pick)
    return merged,{'conflicting_direction_bars_skipped':conflicts,'same_direction_overlap_bars':overlap}

def main():
    with contextlib.redirect_stdout(io.StringIO()):g=runpy.run_path('research/ml/structure_2023_2025.py')
    events=make_events(g);configs={name:(name,) for name in PRIORITY}
    configs.update({'breakout_plus_retest':('breakout','breakout_retest'),'breakout_plus_pullback':('breakout','trend_pullback'),'breakout_plus_continuation':('breakout','continuation'),'breakout_plus_sweep':('breakout','sweep_reversal'),'combined':PRIORITY})
    scenarios=[];trades=[];candidate_stats=[]
    for config,types in configs.items():
        candidates,overlap=deduplicate(events,types);local={**g,'candidates':candidates}
        for year in (2023,2024,2025):
            for stress in (False,True):
                kw={'slip':.30,'commission':10.,'stop_extra':.50} if stress else {}
                s,rr=sim(local,year,'baseline',**kw)
                row={'portfolio':config,'cost_case':'stress' if stress else 'base',**{k:v for k,v in s.items() if k not in ('variant','rejects')}};scenarios.append(row)
                if not stress:
                    candidate_stats.append({'portfolio':config,'year':year,'candidate_bars':sum(x['year']==year for x in candidates),'filled':len(rr),'conflicts_all_years':overlap['conflicting_direction_bars_skipped'],'overlap_all_years':overlap['same_direction_overlap_bars'],**{f'rejected_{k}':v for k,v in s['rejects'].items()}})
                    trades.extend([{'portfolio':config,**x} for x in rr])
    # CSV reject fields vary by portfolio: union the columns.
    fields=['portfolio','year','candidate_bars','filled','conflicts_all_years','overlap_all_years']+sorted({k for x in candidate_stats for k in x if k.startswith('rejected_')})
    dump_csv('reports/vwma-complementary-scenarios-2023-2025.csv',scenarios,list(scenarios[0]));dump_csv('reports/vwma-complementary-candidates-2023-2025.csv',candidate_stats,fields)
    dump_csv('reports/vwma-complementary-trades-2023-2025.csv',trades,['portfolio','setup','all_setups','setup_context','year','decision','exit_time','direction','session','result','entry','stop','target','exit','lots','planned_stop_usd','pnl','r_net','balance','line_atr','stop_atr','atr_ratio'])
    setup_group=[]
    for y in (2023,2024,2025):
        for setup in PRIORITY:
            rr=[x for x in trades if x['portfolio']=='combined' and x['year']==y and x['setup']==setup and x['pnl'] is not None];p=[x['pnl'] for x in rr];wins=sum(x>0 for x in p);gp=sum(x for x in p if x>0);gl=-sum(x for x in p if x<0)
            setup_group.append({'year':y,'setup':setup,'trades':len(p),'wins':wins,'win_rate':round(100*wins/len(p),2) if p else None,'net':round(sum(p),2),'pf':round(gp/gl,3) if gl else None})
    dump_csv('reports/vwma-complementary-combined-breakdown.csv',setup_group,list(setup_group[0]))
    print(json.dumps({'scenarios':scenarios,'candidate_counts':candidate_stats,'combined_setup_breakdown':setup_group},indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
if __name__=='__main__':main()
