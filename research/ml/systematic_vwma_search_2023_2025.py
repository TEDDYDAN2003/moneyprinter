#!/usr/bin/env python3
"""Bounded systematic robustness search. Research-only, no orders or deployment."""
import contextlib,io,runpy,json
import numpy as np,pandas as pd
from complementary_vwma_2023_2025 import make_events,deduplicate,PRIORITY
from entry_hypotheses_2023_2025 import directional_index,annotate,delayed_confirmation
from liquidity_consolidation_2023_2025 import liquidity_features
from intraday_vwma_2023_2025 import sim
from execution_research_2023_2025 import dump_csv

FILTERS=('none','line_0_5','adx25','adx20_di','strong_body','previous_extreme','atr_middle','no_same_sweep','avoid_inside_box','line_adx25','line_strong','line_avoid_inside','line_no_sweep','adx_strong','previous_strong','line_atr_middle')
STREAMS=('trend_pullback','breakout_retest','sweep_reversal','next_confirm','combined')

def enrich_search(g,events,z):
    for x in events:
        i=x['index'];side=x['direction'];box=z[i];sweep=box['bull_sweep_recent'] if side==1 else box['bear_sweep_recent']
        x['search_line_atr']=float(side*(g['c'][i]-g['line'][i-1])/x['atr'])
        x['search_same_sweep']=sweep
        x['search_box_ready']=box['box_ready']
        x['search_inside_box']=bool(box['compressed'] and box['box_low']<=g['c'][i]<=box['box_high']) if box['box_ready'] else None

def filter_ok(mode,x):
    line=x['search_line_atr']>=.5;adx=x['feature_adx'];di=x['feature_di_aligned'];body=x['feature_body_atr'];pos=x['feature_close_position'];vol=x['feature_atr_ratio']
    adx25=adx is not None and adx>=25;adx20di=adx is not None and adx>=20 and di is True;strong=body>=.5 and pos is not None and pos>=.75;previous=x['feature_prev_extreme_close'];normal=vol is not None and .8<=vol<=1.2
    nosweep=x['search_same_sweep'] is False;outside=x['search_box_ready'] and not x['search_inside_box']
    allowed={'none':True,'line_0_5':line,'adx25':adx25,'adx20_di':adx20di,'strong_body':strong,'previous_extreme':previous,'atr_middle':normal,'no_same_sweep':nosweep,'avoid_inside_box':outside,'line_adx25':line and adx25,'line_strong':line and strong,'line_avoid_inside':line and outside,'line_no_sweep':line and nosweep,'adx_strong':adx25 and strong,'previous_strong':previous and strong,'line_atr_middle':line and normal}
    return None if allowed[mode] else 'search_filter'

def qualifies(s):
    return s['trades']>=75 and s['trades']/s['session_days']>=.5 and s['net']>0 and s['pf'] is not None and s['pf']>=1.05 and s['floating_dd_proxy_pct']<=25 and s['unexpected_gap_unknown']==0

def main():
    with contextlib.redirect_stdout(io.StringIO()):g=runpy.run_path('research/ml/structure_2023_2025.py')
    adx,pdi,mdi=directional_index(g['h'],g['l'],g['c']);events=make_events(g);annotate(g,events,adx,pdi,mdi);delays=delayed_confirmation(g,events);annotate(g,delays,adx,pdi,mdi)
    z=liquidity_features(g['tm'],g['h'],g['l'],g['c'],g['atr']);enrich_search(g,events,z);enrich_search(g,delays,z)
    # Cache timezone arrays once in g, before making shallow per-replay copies.
    localtime=np.array([pd.Timestamp(t+900,unit='s',tz='UTC').tz_convert('America/New_York').hour*60+pd.Timestamp(t+900,unit='s',tz='UTC').tz_convert('America/New_York').minute for t in g['tm']]);g['_intraday_minutes']=localtime;g['_intraday_dates']=pd.to_datetime(g['tm'],unit='s',utc=True).tz_convert('America/New_York').date
    streams={}
    for stream in STREAMS:
        if stream=='combined':src=events;types=PRIORITY
        elif stream=='next_confirm':src=delays;types=('trend_pullback',)
        else:src=[x for x in events if x['setup']==stream];types=(stream,)
        streams[stream]=deduplicate(src,types)[0]
    streams['breakout_reference']=deduplicate([x for x in events if x['setup']=='breakout'],('breakout',))[0]
    configs=[(stream,filt) for stream in STREAMS for filt in FILTERS]+[('breakout_reference','none')]
    results=[];log={}
    for stream,mode in configs:
        local={**g,'candidates':streams[stream]}
        for year in (2023,2024,2025):
            for stress in (False,True):
                opts={'slip':.30,'commission':10.,'stop_extra':.50} if stress else {}
                s,rr=sim(local,year,'baseline',candidate_filter=lambda x,m=mode:filter_ok(m,x),**opts)
                results.append({'stream':stream,'filter':mode,'year':year,'cost_case':'stress' if stress else 'base',**{k:v for k,v in s.items() if k not in ('variant','rejects')}})
                if not stress:log[(stream,mode,year)]=rr
    index={(x['stream'],x['filter'],x['year'],x['cost_case']):x for x in results}
    shortlist=[]
    for stream,mode in configs:
        dev=[index[(stream,mode,y,'base')] for y in (2023,2024)];stress=[index[(stream,mode,y,'stress')] for y in (2023,2024)];follow=index[(stream,mode,2025,'base')]
        shortlist.append({'stream':stream,'filter':mode,'development_pass':all(qualifies(x) for x in dev),'development_and_stress_pass':all(qualifies(x) for x in dev+stress),'2025_pass':qualifies(follow),'min_development_net':min(x['net'] for x in dev),'dev_2023_trades':dev[0]['trades'],'dev_2024_trades':dev[1]['trades'],'dev_2023_net':dev[0]['net'],'dev_2024_net':dev[1]['net'],'2025_net':follow['net'],'2025_trades':follow['trades']})
    passes=[x for x in shortlist if x['development_pass']];eligible=[x for x in shortlist if x['dev_2023_trades']>=50 and x['dev_2024_trades']>=50]
    # Diagnostic chosen after comparison: highest minimum development-year net,
    # subject to >=50 trades in each development year; NOT a qualified model.
    chosen=max(passes or eligible,key=lambda x:x['min_development_net']) if passes or eligible else None
    best_any=max(shortlist,key=lambda x:x['min_development_net'])
    if chosen:
        for r in shortlist:r['selected_diagnostic']=bool(r['stream']==chosen['stream'] and r['filter']==chosen['filter'])
    else:
        for r in shortlist:r['selected_diagnostic']=False
    results.sort(key=lambda x:(x['stream'],x['filter'],x['year'],x['cost_case']))
    shortlist.sort(key=lambda x:(-x['min_development_net'],x['stream'],x['filter']))
    dump_csv('reports/vwma-systematic-search-results-2023-2025.csv',results,list(results[0]));dump_csv('reports/vwma-systematic-search-ranking.csv',shortlist,list(shortlist[0]))
    trades=[]
    selected=[('trend_pullback','none'),('combined','none'),('breakout_reference','none')]
    if chosen and (chosen['stream'],chosen['filter']) not in selected:selected.append((chosen['stream'],chosen['filter']))
    for stream,mode in selected:
        for year in (2023,2024,2025):
            for r in log[(stream,mode,year)]:trades.append({'stream':stream,'filter':mode,**r})
    dump_csv('reports/vwma-systematic-search-selected-trades.csv',trades,['stream','filter','year','setup','all_setups','decision','exit_time','direction','session','result','entry','stop','target','exit','lots','planned_stop_usd','pnl','r_net','balance','search_line_atr','search_same_sweep','search_inside_box','feature_adx','feature_body_atr','feature_prev_extreme_close'])
    monthly=[]
    for stream,mode in selected:
        for year in (2023,2024,2025):
            for month in range(1,13):
                prefix=f'{year}-{month:02d}'
                subset=[r for r in log[(stream,mode,year)] if r.get('pnl') is not None and r['exit_time'].startswith(prefix)]
                monthly.append({'stream':stream,'filter':mode,'year':year,'month':prefix,'resolved_trades':len(subset),'net_usd':round(sum(r['pnl'] for r in subset),2),'wins':sum(r['pnl']>0 for r in subset)})
    dump_csv('reports/vwma-systematic-search-monthly.csv',monthly,list(monthly[0]))
    print(json.dumps({'configurations':len(configs),'annual_replays':len(results),'development_qualifiers':len(passes),'stress_qualifiers':sum(x['development_and_stress_pass'] for x in shortlist),'2025_qualifiers':sum(x['2025_pass'] for x in shortlist),'chosen':chosen,'best_any':best_any,'top10':shortlist[:10],'selected_metrics':[x for x in results if chosen and x['stream']==chosen['stream'] and x['filter']==chosen['filter']]},indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
if __name__=='__main__':main()
