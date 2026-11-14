"""Causal, exploratory FVG scoring. Scores are NOT calibrated probabilities."""
from datetime import datetime, timezone
import math

DEFAULT_WEIGHTS={'htf':20,'structure':15,'liquidity':15,'displacement':15,'fvg':15,'position':10,'candle':5,'session':5}

def analyze(candles,minutes=5,weights=None,pivot_len=3,atr_len=14,mtf_mult=3,htf_mult=12):
    weights={**DEFAULT_WEIGHTS,**(weights or {})}
    if any(not isinstance(w,(int,float)) or not 0<=w<=100 for w in weights.values()) or abs(sum(weights.values())-100)>1e-6: raise ValueError('Weights must be nonnegative and total 100.')
    span=minutes*60; results=[]; zones=[]; ranges=[]; atr=None; last_hi=last_lo=None; trend=0; last_break='None'; break_age=999; last_sweep=None; sweep_age=999; last_fvg={1:None,-1:None}; prior=None
    # Completed aggregates, not the currently forming higher-timeframe candle.
    aggregates={m:{'active':None,'done':[]} for m in (mtf_mult,htf_mult)}
    for i,c in enumerate(candles):
        t=int(c['time']); gap=prior is not None and t-prior['time']!=span
        if gap: zones=[]
        for mult,a in aggregates.items():
            bucket=t//(span*mult); prev=a['active']
            if prev and prev['bucket']!=bucket:
                if prev['count']==mult and prev['last']==(prev['bucket']+1)*span*mult-span: a['done'].append(prev)
                a['active']=None
            if not a['active']: a['active']={'bucket':bucket,'open':c['open'],'high':c['high'],'low':c['low'],'close':c['close'],'count':1,'last':t}
            else:
                x=a['active'];x['high']=max(x['high'],c['high']);x['low']=min(x['low'],c['low']);x['close']=c['close'];x['count']+=1;x['last']=t
            # At an execution close the last component of an aggregate becomes known.
            x=a['active']; available=a['done']+([x] if x['count']==mult and t==(bucket+1)*span*mult-span else [])
            a['available']=available[-5:]
        def bias(m):
            arr=aggregates[m]['available']
            if len(arr)<3:return 0
            x,y,z=arr[-3:]
            return 1 if z['high']>y['high'] and z['low']>y['low'] and y['close']>x['close'] else (-1 if z['high']<y['high'] and z['low']<y['low'] and y['close']<x['close'] else 0)
        mb,hb=bias(mtf_mult),bias(htf_mult)
        tr=max(c['high']-c['low'],abs(c['high']-prior['close']),abs(c['low']-prior['close'])) if prior else c['high']-c['low']
        ranges.append(tr)
        if i==atr_len-1: atr=sum(ranges[-atr_len:])/atr_len
        elif i>=atr_len and atr is not None: atr=(atr*(atr_len-1)+tr)/atr_len
        j=i-pivot_len
        if j>=pivot_len:
            win=candles[j-pivot_len:i+1]; p=candles[j]
            if all(p['high']>x['high'] for k,x in enumerate(win) if k!=pivot_len): last_hi=p['high']
            if all(p['low']<x['low'] for k,x in enumerate(win) if k!=pivot_len): last_lo=p['low']
        oldtrend=trend; event='None'; break_age+=1; sweep_age+=1
        if prior and last_hi is not None and prior['close']<=last_hi<c['close']:
            trend=1;event='Bullish CHoCH' if oldtrend==-1 else 'Bullish BOS';break_age=0;last_break=event
        elif prior and last_lo is not None and prior['close']>=last_lo>c['close']:
            trend=-1;event='Bearish CHoCH' if oldtrend==1 else 'Bearish BOS';break_age=0;last_break=event
        if last_lo is not None and c['low']<last_lo and c['close']>last_lo:last_sweep='Sell-side reclaimed';sweep_age=0
        elif last_hi is not None and c['high']>last_hi and c['close']<last_hi:last_sweep='Buy-side reclaimed';sweep_age=0
        # Existing Free Chart three-candle rule preserved: strict gap between 1 and 3.
        if i>=2 and not gap and candles[i-1]['time']-candles[i-2]['time']==span:
            a=candles[i-2]; direction=1 if c['low']>a['high'] else (-1 if c['high']<a['low'] else 0)
            if direction:
                z={'from':i-2,'created':i,'bottom':a['high'] if direction==1 else c['high'],'top':c['low'] if direction==1 else a['low'],'direction':direction,'status':'fresh'};zones.append(z);last_fvg[direction]=z
        for z in zones:
            if z['created']<i and c['low']<=z['top'] and c['high']>=z['bottom']:
                z['status']='rejected' if (z['direction']==1 and c['close']>z['top']) or (z['direction']==-1 and c['close']<z['bottom']) else 'mitigated'
        zones=[z for z in zones if i-z['created']<=100 and not (z['direction']==1 and c['close']<z['bottom'] or z['direction']==-1 and c['close']>z['top'])]
        body=abs(c['close']-c['open']); ratio=body/atr if atr else 0; cd=1 if c['close']>c['open'] else -1 if c['close']<c['open'] else 0
        eq=(last_hi+last_lo)/2 if last_hi is not None and last_lo is not None and last_hi>last_lo else None
        # Neutral contributes 0.5 to both directions, exactly as the specification.
        def directional(d):return (1,0) if d==1 else ((0,1) if d==-1 else (.5,.5))
        dval=min(1,ratio/1.5); db,ds=(dval,0) if cd==1 else ((0,dval) if cd==-1 else (.5,.5))
        ldir=(1 if last_sweep=='Sell-side reclaimed' else -1) if sweep_age<=8 and last_sweep else 0
        freshbull=next((z for z in reversed(zones) if z['direction']==1),None);freshbear=next((z for z in reversed(zones) if z['direction']==-1),None)
        def fv(z):return 0 if not z else .4+(.3 if z['status']=='fresh' else .2)+(.3 if z['status']=='rejected' else 0)
        pos=(.8,.2) if eq is not None and c['close']<eq else ((.2,.8) if eq is not None and c['close']>eq else (.5,.5))
        hour=datetime.fromtimestamp(t+span,tz=timezone.utc).hour; active=7<=hour<16 or 12<=hour<21
        metrics={'htf':(*directional(hb),f"Completed higher-timeframe bias: {['bearish','mixed','bullish'][hb+1]}"),'structure':(*directional(trend if break_age<=30 else 0),f'{last_break}; {break_age if break_age<999 else "no"} bars ago'), 'liquidity':(*directional(ldir),f'{last_sweep or "No recent reclaimed swing"}; age {sweep_age if sweep_age<999 else "—"}'), 'displacement':(db,ds,f'Body / ATR = {ratio:.2f}; direction {cd}'), 'fvg':(fv(freshbull),fv(freshbear),f'Active zones: {len(zones)}'), 'position':(*pos,'Equilibrium '+(f'{eq:.2f}' if eq else 'unavailable')), 'candle':(*directional(cd),f'Last closed candle direction: {cd}'), 'session':(.65 if active else .35,.65 if active else .35,'Fixed UTC London / New York session' if active else 'Outside configured UTC sessions')}
        bull=sum(weights[k]*x[0] for k,x in metrics.items()); bear=sum(weights[k]*x[1] for k,x in metrics.items()); net=bull-bear
        classification='Strong bullish' if bull>=80 and net>=25 else 'Bullish' if bull>=65 and net>=15 else 'Strong bearish' if bear>=80 and net<=-25 else 'Bearish' if bear>=65 and net<=-15 else 'Neutral'
        ready=atr is not None and len(aggregates[htf_mult]['available'])>=3 and last_hi is not None and last_lo is not None
        results.append({'time':t,'bull':round(bull,1),'bear':round(bear,1),'net':round(net,1),'classification':classification if ready else 'Insufficient data','ready':ready,'htf':hb,'mtf':mb,'ltf':trend,'break':last_break,'sweep':last_sweep or 'None','atr':round(atr,5) if atr else None,'equilibrium':eq,'metrics':{k:{'bull':round(v[0]*weights[k],2),'bear':round(v[1]*weights[k],2),'max':weights[k],'explanation':v[2]} for k,v in metrics.items()},'zones':[dict(z) for z in zones[-20:]],'conflict':bool(mb and hb and mb!=hb),'confirmation': bool(ready and cd and ((trend==cd and break_age<=8) or (ldir==cd and sweep_age<=8))),'confirmation_direction':cd})
        prior=c
    return results

def backtest(candles,results,minutes=5,rr=1.5,stop_atr=1,horizon=20,cost=0,threshold=65):
    # Chronological thirds with no trades crossing a split; no overlapping trades.
    n=len(candles); groups={'Train':[],'Validation':[],'Test':[]}; excluded={k:{'tie':0,'gap':0,'timeout':0} for k in groups}; i=0
    while i<n-1:
        r=results[i]; group='Train' if i<n*.6 else 'Validation' if i<n*.8 else 'Test'; end=int(n*.6) if group=='Train' else int(n*.8) if group=='Validation' else n
        d=1 if r['classification'] in ('Bullish','Strong bullish') and r['bull']>=threshold else -1 if r['classification'] in ('Bearish','Strong bearish') and r['bear']>=threshold else 0
        if not d or not r['atr'] or not r['confirmation'] or r['confirmation_direction']!=d or i+horizon>=end:i+=1;continue
        entry=candles[i]['close'];risk=r['atr']*stop_atr;sl=entry-d*risk;tp=entry+d*risk*rr;out=None
        for j in range(i+1,i+horizon+1):
            c=candles[j]
            if c['time']-candles[j-1]['time']!=minutes*60:out='gap';break
            hs=c['low']<=sl if d==1 else c['high']>=sl;ht=c['high']>=tp if d==1 else c['low']<=tp
            if hs and ht:out='tie';break
            if hs or ht:out='win' if ht else 'loss';break
        if out in ('win','loss'):
            value=(rr if out=='win' else -1)-cost/risk;groups[group].append({'outcome':out,'r':value,'direction':d})
        if out not in ('win','loss'): excluded[group][out or 'timeout']+=1
        i=(j+1 if out else i+horizon+1)
    result={}
    for k,trades in groups.items():
        wins=sum(t['outcome']=='win' for t in trades);r=sum(t['r'] for t in trades);equity=peak=dd=0
        for t in trades:equity+=t['r'];peak=max(peak,equity);dd=max(dd,peak-equity)
        result[k]={'trades':len(trades),'wins':wins,'winRate':round(100*wins/len(trades),1) if trades else None,'netR':round(r,2),'maxDrawdownR':round(dd,2),'expectancyR':round(r/len(trades),2) if trades else None,'excluded':excluded[k]}
    return result
