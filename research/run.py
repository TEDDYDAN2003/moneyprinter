#!/usr/bin/env python3
"""Local-only JSON bridge. Never returns credentials."""
import os,sys,json,random,urllib.request,urllib.error,urllib.parse,math,sqlite3,hashlib,uuid,re
from datetime import datetime,timezone
from engine import analyze,backtest,optimize,run_correlation_study

def sample(minutes,count):
    random.seed(42); start=1704067200; p=2050.; rows=[]
    for i in range(count):
        o=p; p=o+random.gauss(0,2.3)+.25*math.sin(i/20);high=max(o,p)+random.random()*2;low=min(o,p)-random.random()*2
        rows.append({'time':start+i*minutes*60,'open':round(o,3),'high':round(high,3),'low':round(low,3),'close':round(p,3)})
    return rows

def oanda(minutes,count,before=None,allow_empty=False):
    token=os.environ.get('OANDA_API_TOKEN','').strip().strip("'").strip('"')
    if not token:raise ValueError('Set OANDA_API_TOKEN in your local environment. Use a newly rotated token, not the one shared in chat.')
    gran={1:'M1',5:'M5',15:'M15',30:'M30',60:'H1',1440:'D',10080:'W'}[minutes]
    headers={'Authorization':'Bearer '+token,'User-Agent':'MoneyPrinter-Research/1.0','Accept':'application/json'}
    # Walk backward by the oldest returned candle. A page can include its
    # boundary, so deduplicate by timestamp and request one extra if needed.
    rows_by_time={};cursor=datetime.fromtimestamp(before,timezone.utc).isoformat().replace('+00:00','Z') if before is not None else None;page_count=0
    while len(rows_by_time)<count:
        requested=min(5000,count-len(rows_by_time)+1)
        params={'price':'M','granularity':gran,'count':requested}
        if minutes in (1440,10080):params.update({'dailyAlignment':17,'alignmentTimezone':'America/New_York','weeklyAlignment':'Friday'})
        if cursor:params['to']=cursor
        url='https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles?'+urllib.parse.urlencode(params)
        payload=None
        for attempt in range(2):
            try:
                with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as res:
                    raw=res.read()
                    payload=json.loads(raw if isinstance(raw,str) else raw.decode('utf-8'))
                    break
            except urllib.error.HTTPError as e:
                if attempt==0 and e.code in (401,429,500,502,503,504):
                    import time; time.sleep(1)
                    continue
                raise ValueError(f'OANDA request failed on page {page_count+1} (HTTP {e.code}); no partial run was saved.')
            except Exception:
                if attempt==0:
                    import time; time.sleep(1)
                    continue
                raise ValueError(f'Could not reach OANDA on page {page_count+1}; no partial run was saved.')
        if not payload:break
        page=payload.get('candles',[]);page_count+=1
        if not page:break
        previous_count=len(rows_by_time);oldest=None;oldest_raw=None
        for c in page:
            if not c.get('time'):continue
            t=int(datetime.fromisoformat(c['time'].replace('Z','+00:00')).timestamp())
            if oldest is None or t<oldest:oldest,oldest_raw=t,c['time']
            if not c.get('complete') or not c.get('mid') or (before is not None and t>=before):continue
            q=c['mid'];rows_by_time[t]={'time':t,'open':float(q['o']),'high':float(q['h']),'low':float(q['l']),'close':float(q['c'])}
        if oldest_raw is None or oldest_raw==cursor or len(rows_by_time)==previous_count:break
        cursor=oldest_raw
    rows=sorted(rows_by_time.values(),key=lambda x:x['time'])[-count:]
    if not rows and not allow_empty:raise ValueError('OANDA returned no completed candles.')
    return rows

def aggregate_bars(bars, source_minutes):
    """Three uninterrupted UTC-aligned source candles per aggregate."""
    step=source_minutes*60; duration=step*3
    buckets={}
    for c in bars:
        start=c['time']-(c['time']%duration);buckets.setdefault(start,[]).append(c)
    out=[]
    for start,group in sorted(buckets.items()):
        group.sort(key=lambda x:x['time'])
        if len(group)!=3 or [x['time'] for x in group]!=[start,start+step,start+2*step]:continue
        out.append({'time':start,'open':group[0]['open'],'high':max(x['high'] for x in group),'low':min(x['low'] for x in group),'close':group[-1]['close']})
    return out

def aggregate_45(bars):
    return aggregate_bars(bars,15)

def unavailable_result(c):
    # Daily/weekly bars follow a market calendar and DST rather than the
    # fixed-duration intraday assumptions used by the scoring engine.
    return {'time':c['time'],'bull':None,'bear':None,'net':None,'classification':'Unavailable for this timeframe','ready':False,'htf':0,'mtf':0,'ltf':0,'break':'Unavailable','sweep':'Unavailable','atr':None,'equilibrium':None,'metrics':{},'zones':[],'conflict':False,'confirmation':False,'confirmation_direction':0}

def main():
    request=json.loads(sys.stdin.read() or '{}'); mode=request.get('mode','initial');
    root=os.path.join(os.path.dirname(__file__),'data');os.makedirs(root,exist_ok=True)
    older_count=0; history_exhausted=False
    if mode=='older':
        run_id=request.get('runId','')
        if not isinstance(run_id,str) or not re.fullmatch(r'[a-f0-9]{32}',run_id):raise ValueError('Invalid research run ID.')
        with sqlite3.connect(os.path.join(root,'runs.sqlite3')) as db:
            row=db.execute('SELECT source, minutes, settings, candles FROM runs WHERE id=?',(run_id,)).fetchone()
        db.close()
        if not row:raise ValueError('The local data snapshot was not found. Reload the chart.')
        source,minutes,settings,old_snapshot=row;req=json.loads(settings);old=json.loads(old_snapshot)
        if source!='oanda' or not old:raise ValueError('Automatic older history is only available for OANDA data.')
        count=min(5000,max(0,50000-len(old)))
        if not count:raise ValueError('The 50,000 candle limit has been reached.')
        cutoff=old[0]['time']
        if minutes in (3,45):
            base_minutes=1 if minutes==3 else 15
            base=oanda(base_minutes,count*3+2,before=cutoff,allow_empty=True);older=aggregate_bars(base,base_minutes)[-count:];history_exhausted=len(base)<count*3+2
        else:
            older=oanda(minutes,count,before=cutoff,allow_empty=True);history_exhausted=len(older)<count
        older=[c for c in older if c['time']<cutoff]
        older_count=len(older)
        bars=older+old
    elif mode=='initial':
        req=request;source=req.get('source','sample');minutes=int(req.get('minutes',5));count=min(50000,max(100,int(req.get('count',5000))))
        if minutes not in (1,3,5,15,30,45,60,1440,10080) or source not in ('sample','oanda'):raise ValueError('Unsupported data source or timeframe.')
        if source=='sample':bars=sample(minutes,count)
        elif minutes in (3,45):
            base_minutes=1 if minutes==3 else 15
            base=oanda(base_minutes,count*3+2);bars=aggregate_bars(base,base_minutes)[-count:]
        else:bars=oanda(minutes,count)
        history_exhausted=source=='oanda' and (len(base)<count*3+2 if minutes in (3,45) else len(bars)<count)
    else:raise ValueError('Unsupported research operation.')
    if not bars:raise ValueError('No complete candles available for this timeframe.')
    available=minutes not in (1440,10080)
    results=analyze(bars,minutes,req.get('weights')) if available else [unavailable_result(c) for c in bars]
    target_mode=req.get('targetMode','structural')
    stop_mode=req.get('stopMode','structural')
    min_rr=max(0.5,min(10.0,float(req.get('minRr',1.5))))
    require_pattern=bool(req.get('requirePattern',False))
    cost_val=max(0,min(100,float(req.get('cost',0))))
    filter_trend=bool(req.get('filterTrend',False))
    filter_killzone=bool(req.get('filterKillzone',False))
    filter_news=bool(req.get('filterNews',True))
    filter_ote=bool(req.get('filterOte',False))
    filter_ob=bool(req.get('filterOb',False))
    filter_regime=bool(req.get('filterRegime',False))
    filter_vwma=bool(req.get('filterVwma',False))
    bt=backtest(bars,results,minutes,rr=max(.25,min(5,float(req.get('rr',1.5)))),stop_atr=max(.1,min(10,float(req.get('stopAtr',1)))),horizon=max(1,min(100,int(req.get('horizon',20)))),cost=cost_val,threshold=max(50,min(100,float(req.get('threshold',65)))),target_mode=target_mode,stop_mode=stop_mode,min_rr=min_rr,require_pattern=require_pattern,filter_trend=filter_trend,filter_killzone=filter_killzone,filter_news=filter_news,filter_ote=filter_ote,filter_ob=filter_ob,filter_regime=filter_regime,filter_vwma=filter_vwma) if available else {}
    opt=optimize(bars,results,minutes=minutes,cost=cost_val) if (available and (req.get('action')=='optimize' or req.get('optimize') is True)) else None
    corr=run_correlation_study(bars,results) if (available and (req.get('action') in ('correlations','optimize') or req.get('correlations') is True)) else None
    note=(f'{minutes}m is derived from complete {base_minutes}m candles aligned to UTC; incomplete groups are excluded. ' if minutes in (3,45) and source=='oanda' else '')+('Daily/weekly: chart only; scores, backtesting and indicators are disabled until calendar-aware support is implemented. OANDA bars use New York 17:00 and Friday weekly alignment. ' if not available else '')
    # Persist the exact candle snapshot, parameters and every score locally.
    # No API token or full process environment enters the database.
    root=os.path.join(os.path.dirname(__file__),'data');os.makedirs(root,exist_ok=True)
    snapshot=json.dumps(bars,separators=(',',':'));digest=hashlib.sha256(snapshot.encode()).hexdigest();run_id=uuid.uuid4().hex
    with sqlite3.connect(os.path.join(root,'runs.sqlite3')) as db:
        db.execute('CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, created_utc TEXT, source TEXT, symbol TEXT, minutes INTEGER, data_sha256 TEXT, settings TEXT, candles TEXT, results TEXT, backtest TEXT)')
        db.execute('INSERT INTO runs VALUES (?,?,?,?,?,?,?,?,?,?)',(run_id,datetime.now(timezone.utc).isoformat(),source,'XAU_USD',minutes,digest,json.dumps(req),snapshot,json.dumps(results,separators=(',',':')),json.dumps(bt)))
    db.close()
    print(json.dumps({'runId':run_id,'dataHash':digest,'olderAdded':older_count,'historyExhausted':history_exhausted,'analysisAvailable':available,'source':source,'symbol':'XAU_USD','minutes':minutes,'candles':bars,'results':results,'backtest':bt,'optimization':opt,'correlations':corr,'warning':note+('Synthetic example data, not market prices.' if source=='sample' else ('OANDA midpoint candles; provider quotes may differ from Exness. Verify timestamps and completeness.'+(f' Only {len(bars)} of {count} requested candles were available.' if mode=='initial' and len(bars)<count else '')))},allow_nan=False))
if __name__=='__main__':
    try:main()
    except Exception as e:print(json.dumps({'error':str(e)}));sys.exit(1)
