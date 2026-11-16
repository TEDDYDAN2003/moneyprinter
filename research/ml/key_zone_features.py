#!/usr/bin/env python3
"""Causal chart cross and key-zone features for offline training; no orders."""
import numpy as np,pandas as pd
from intraday_vwma_2023_2025 import NY,CUTOFF

PIP=.01;BASE_SLIP=.10;COMMISSION=7.
FEATURES=['direction','quality','trend_aligned','h4_directional_spread_atr','ema200_distance_atr','line_distance_atr','crossover_separation_atr','signal_body_atr','signal_range_atr','atr_ratio','session_london','session_overlap','session_ny','minutes_to_cutoff','zone_swing','zone_prior_day','zone_fvg','zone_fib_ote','zone_structure_retest','zone_count']
ZONES=('swing','prior_day','fvg','fib_ote','structure_retest')

def candidate_signals(g):
    n=len(g['tm']);d=g['d'];tm=g['tm'];markers=g['signals'];pivots=[];latest={1:None,-1:None};prev_utc=None;dayhi=daylo=None;prevhi=prevlo=None;out=[]
    for i in range(n-1):
        date=pd.Timestamp(tm[i],unit='s',tz='UTC').date()
        if date!=prev_utc:
            if prev_utc is not None:prevhi,prevlo=dayhi,daylo
            dayhi,daylo=g['h'][i],g['l'][i];prev_utc=date
        else:dayhi=max(dayhi,g['h'][i]);daylo=min(daylo,g['l'][i])
        marker=markers.get(i)
        atr=g['atr'][i];session=bool(g['session'][i]);local=pd.Timestamp(tm[i]+900,unit='s',tz='UTC').tz_convert(NY);minutes=local.hour*60+local.minute
        if marker and i>=220 and session and minutes<CUTOFF and bool(d.contiguous.iloc[i]) and not g['shock'][i] and np.isfinite([atr,g['ema'][i],g['fast'][i],g['slow'][i],g['line'][i-1]]).all():
            side=int(marker['dir']);close=g['c'][i];hi=g['h'][i];lo=g['l'][i];buffer=.2*atr;r=d.iloc[i]
            prevswing=g['p3l'][i-1] if side==1 else g['p3h'][i-1]
            touch=lambda q: q is not None and np.isfinite(q) and lo<=q+buffer and hi>=q-buffer
            swing=bool(touch(prevswing));prior_day=bool(touch(prevlo if side==1 else prevhi));fvg=bool(r.fvg_b if side==1 else r.fvg_s)
            fib=False;fib_lo=fib_hi=None
            if len(pivots)>=2:
                a,b=pivots[-2],pivots[-1]
                if a['type']==-side and b['type']==side:
                    origin=a['price'];end=b['price'];p618=end-(end-origin)*.618;p790=end-(end-origin)*.790;fib_lo=min(p618,p790);fib_hi=max(p618,p790);fib=bool(lo<=fib_hi and hi>=fib_lo)
            structure=latest[side];retest=bool(structure and 1<=i-structure['index']<=40 and touch(structure['level']) and side*(close-structure['level'])>0)
            flags={'zone_swing':swing,'zone_prior_day':prior_day,'zone_fvg':fvg,'zone_fib_ote':fib,'zone_structure_retest':retest};zones=sum(flags.values());features={'direction':side,'quality':int(marker.get('quality',0)),'trend_aligned':int(bool(marker.get('trendAligned'))),'h4_directional_spread_atr':side*(g['fast'][i]-g['slow'][i])/atr,'ema200_distance_atr':side*(close-g['ema'][i])/atr,'line_distance_atr':side*(close-g['line'][i-1])/atr,'crossover_separation_atr':side*float(marker['diff'])/atr,'signal_body_atr':side*(close-g['o'][i])/atr,'signal_range_atr':(hi-lo)/atr,'atr_ratio':float(r.atr_ratio) if np.isfinite(r.atr_ratio) else np.nan,'session_london':int(r.session_london),'session_overlap':int(r.session_overlap),'session_ny':int(r.session_ny),'minutes_to_cutoff':CUTOFF-minutes,**{k:int(v) for k,v in flags.items()},'zone_count':zones}
            dt=pd.Timestamp(tm[i]+900,unit='s',tz='UTC');out.append({'index':i,'decision':dt.isoformat(),'date':dt.strftime('%Y-%m-%d'),'year':dt.year,'direction':side,'matched_zone':zones>0,'flags':flags,'features':features,'swing_level':float(prevswing) if np.isfinite(prevswing) else None,'prior_day_level':float(prevlo if side==1 else prevhi) if (prevlo if side==1 else prevhi) is not None else None,'fib_low':fib_lo,'fib_high':fib_hi,'structure_level':float(structure['level']) if structure else None,'zone_buffer':buffer})
        # Events below become available only after this bar completes; not used by the same signal.
        if i>=1:
            ph=g['p3h'][i-1];pl=g['p3l'][i-1]
            if np.isfinite(ph) and g['c'][i-1]<=ph and g['c'][i]>ph:latest[1]={'index':i,'level':float(ph)}
            if np.isfinite(pl) and g['c'][i-1]>=pl and g['c'][i]<pl:latest[-1]={'index':i,'level':float(pl)}
        k=i-3
        if k>=3 and np.all(np.diff(tm[k-3:i+1])==900):
            ishi=g['h'][k]>max(np.r_[g['h'][k-3:k],g['h'][k+1:i+1]]);islo=g['l'][k]<min(np.r_[g['l'][k-3:k],g['l'][k+1:i+1]])
            # A bar can be both extremes; ignore it rather than invent their chronological order.
            if ishi != islo:
                typ=1 if ishi else -1;val=float(g['h'][k] if ishi else g['l'][k]);item={'type':typ,'price':val,'index':k}
                if pivots and pivots[-1]['type']==typ:
                    if typ*(val-pivots[-1]['price'])>0:pivots[-1]=item
                else:pivots.append(item)
                pivots=pivots[-2:]
    return out
