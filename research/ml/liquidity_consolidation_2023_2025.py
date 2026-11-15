#!/usr/bin/env python3
"""Causal sweep/consolidation research on actual chart setups; no live orders."""
import contextlib,io,runpy,json
from collections import defaultdict
import numpy as np
from intraday_vwma_2023_2025 import sim
from execution_research_2023_2025 import dump_csv

def liquidity_features(time,high,low,close,atr,lookback=20,box_bars=12,box_limit=3.,recent_bars=4):
    """Sweeps at closed bars vs prior range; box uses preceding bars, not signal bar."""
    n=len(time);up=np.zeros(n,dtype=bool);down=np.zeros(n,dtype=bool)
    out=[]
    for i in range(n):
        if i>=lookback and time[i]-time[i-lookback]==lookback*900:
            oldlo=float(np.min(low[i-lookback:i]));oldhi=float(np.max(high[i-lookback:i]))
            up[i]=low[i]<oldlo and close[i]>oldlo
            down[i]=high[i]>oldhi and close[i]<oldhi
        ready=i>=lookback+recent_bars-1 and time[i]-time[i-(lookback+recent_bars-1)]==(lookback+recent_bars-1)*900
        boxready=i>=box_bars and time[i]-time[i-box_bars]==box_bars*900 and np.isfinite(atr[i]) and atr[i]>0
        if boxready:
            hi=float(np.max(high[i-box_bars:i]));lo=float(np.min(low[i-box_bars:i]));width=(hi-lo)/atr[i];compressed=width<=box_limit
        else:hi=lo=width=float('nan');compressed=None
        out.append({'liquidity_ready':bool(ready),'bull_sweep_recent':bool(np.any(up[i-recent_bars+1:i+1])) if ready else None,'bear_sweep_recent':bool(np.any(down[i-recent_bars+1:i+1])) if ready else None,'box_ready':bool(boxready),'box_width_atr':width if boxready else None,'box_high':hi if boxready else None,'box_low':lo if boxready else None,'compressed':compressed})
    return out

def enrich(g,feat):
    for x in g['candidates']:
        z=feat[x['index']];x.update(z);side=x['direction'];cl=g['c'][x['index']]
        x['same_sweep']=None if not z['liquidity_ready'] else (z['bull_sweep_recent'] if side==1 else z['bear_sweep_recent'])
        x['opposing_sweep']=None if not z['liquidity_ready'] else (z['bear_sweep_recent'] if side==1 else z['bull_sweep_recent'])
        x['box_state']='unavailable' if not z['box_ready'] else 'not_compressed' if not z['compressed'] else ('breakout_same' if side*(cl-(z['box_high'] if side==1 else z['box_low']))>0 else 'breakout_opposite' if side*(cl-(z['box_low'] if side==1 else z['box_high']))<0 else 'inside_box')

def allow(mode,x):
    # Unknown histories are never treated as 'no sweep' or 'not compressed'.
    if mode=='none':return None
    if mode in ('same_sweep','no_opposing','sweep_no_inside') and not x['liquidity_ready']:return 'sweep_history_missing'
    if mode in ('avoid_inside','same_breakout','sweep_no_inside','no_compression') and not x['box_ready']:return 'box_history_missing'
    if mode in ('same_sweep','sweep_no_inside') and not x['same_sweep']:return 'no_same_sweep'
    if mode=='no_opposing' and x['opposing_sweep']:return 'opposing_sweep'
    if mode in ('avoid_inside','sweep_no_inside') and x['box_state']=='inside_box':return 'inside_compressed_box'
    if mode=='same_breakout' and x['box_state']!='breakout_same':return 'no_compressed_breakout'
    if mode=='no_compression' and x['compressed']:return 'compressed_box'
    return None

def main():
    with contextlib.redirect_stdout(io.StringIO()):g=runpy.run_path('research/ml/structure_2023_2025.py')
    features=liquidity_features(g['tm'],g['h'],g['l'],g['c'],g['atr']);enrich(g,features)
    modes=('none','same_sweep','no_opposing','avoid_inside','same_breakout','no_compression','sweep_no_inside')
    results=[];records={};groups=defaultdict(list)
    for base in ('diagnostic','line_0_5'):
        for mode in modes:
            for year in (2023,2024,2025):
                s,rr=sim(g,year,base,candidate_filter=lambda x,m=mode:allow(m,x));row={'base':base,'filter':mode,**{k:v for k,v in s.items() if k not in ('variant','rejects')}};results.append(row);records[(base,mode,year)]=rr
                if mode!='none':continue
                for r in rr:
                    if r['pnl'] is None:continue
                    labels={'same_sweep':'unknown' if r['same_sweep'] is None else 'yes' if r['same_sweep'] else 'no','opposing_sweep':'unknown' if r['opposing_sweep'] is None else 'yes' if r['opposing_sweep'] else 'no','box_state':r['box_state']}
                    for f,z in labels.items():groups[(base,year,f,z)].append(r)
    gr=[]
    for (base,year,feature,group),rr in sorted(groups.items()):
        p=[r['pnl'] for r in rr];win=[x for x in p if x>0];los=[x for x in p if x<=0];gp=sum(win);gl=-sum(los)
        gr.append({'base':base,'year':year,'feature':feature,'group':group,'trades':len(p),'wins':len(win),'win_rate':round(100*len(win)/len(p),2),'net':round(sum(p),2),'profit_factor':round(gp/gl,3) if gl else None,'avg_net_r':round(float(np.mean([r['r_net'] for r in rr])),3)})
    # Historical qualification is a research screen, not an unseen validation.
    qualifiers=[]
    for base in ('diagnostic','line_0_5'):
        for mode in modes[1:]:
            rows=[next(x for x in results if x['base']==base and x['filter']==mode and x['year']==y) for y in (2023,2024)]
            if all(x['trades']>=75 and x['net']>0 and x['pf'] is not None and x['pf']>=1.05 and x['floating_dd_proxy_pct']<=25 and x['trades']/x['session_days']>=.5 for x in rows):qualifiers.append((base,mode))
    # Retrospective worst-year metric is diagnostic, even if it misses qualification.
    ranked=[]
    for base in ('diagnostic','line_0_5'):
        for mode in modes[1:]:
            rows=[next(x for x in results if x['base']==base and x['filter']==mode and x['year']==y) for y in (2023,2024)]
            ranked.append((min(x['net'] for x in rows),base,mode))
    _,b,m=max(ranked);stress=[]
    for base,mode in [('diagnostic','none'),('line_0_5','none'),(b,m)]:
        for year in (2023,2024,2025):
            s,rr=sim(g,year,base,slip=.30,commission=10.,stop_extra=.50,candidate_filter=lambda x,mm=mode:allow(mm,x));stress.append({'base':base,'filter':mode,'year':year,**{k:v for k,v in s.items() if k not in ('variant','year','rejects')}})
    sensitivity=[]
    for width in (2.5,3.0,3.5):
        enrich(g,liquidity_features(g['tm'],g['h'],g['l'],g['c'],g['atr'],box_limit=width))
        for year in (2023,2024,2025):
            s,_=sim(g,year,'line_0_5',candidate_filter=lambda x:allow('same_breakout',x))
            sensitivity.append({'box_width_limit_atr':width,**{k:v for k,v in s.items() if k not in ('variant','rejects')}})
    dump_csv('reports/vwma-liquidity-scenarios-2023-2025.csv',results,list(results[0]));dump_csv('reports/vwma-liquidity-trade-groups-2023-2025.csv',gr,list(gr[0]));dump_csv('reports/vwma-liquidity-stress-2023-2025.csv',stress,list(stress[0]));dump_csv('reports/vwma-liquidity-box-sensitivity.csv',sensitivity,list(sensitivity[0]))
    rows=[]
    for (base,mode,year),rr in records.items():
        for r in rr:rows.append({'base':base,'filter':mode,**r})
    dump_csv('reports/vwma-liquidity-trades-2023-2025.csv',rows,['base','filter','year','decision','exit_time','direction','trigger','session','result','entry','stop','target','exit','lots','planned_stop_usd','pnl','r_net','balance','same_sweep','opposing_sweep','box_state','box_width_atr','box_high','box_low','line_atr','stop_atr'])
    print(json.dumps({'qualifying_2023_2024':qualifiers,'retrospective_best_worst_year':{'base':b,'filter':m},'results':results,'groups':gr,'stress':stress},indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
if __name__=='__main__':main()
