#!/usr/bin/env python3
"""Research-only bounded comparison of chart VWMA setups and confirmed swing stops."""
import json,hashlib,math
from pathlib import Path
import numpy as np,pandas as pd
from pipeline import make_features

DATA=Path('research/data/oanda-xau-m15-2021-2025.json');raw=DATA.read_bytes();rows=json.loads(raw);d=make_features(rows);v=json.loads(Path('research/data/chart-vwma-2021-2025.json').read_text());assert v['times']==d.time.tolist();assert all(pd.Timestamp('2021-01-01',tz='UTC').timestamp()<=x['time']<pd.Timestamp('2026-01-01',tz='UTC').timestamp() for x in rows)
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
