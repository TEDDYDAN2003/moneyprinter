#!/usr/bin/env python3
"""Local-only JSON bridge. Never returns credentials."""
import os,sys,json,random,urllib.request,urllib.error,urllib.parse,math,sqlite3,hashlib,uuid
from datetime import datetime,timezone
from engine import analyze,backtest

def sample(minutes,count):
    random.seed(42); start=1704067200; p=2050.; rows=[]
    for i in range(count):
        o=p; p=o+random.gauss(0,2.3)+.25*math.sin(i/20);high=max(o,p)+random.random()*2;low=min(o,p)-random.random()*2
        rows.append({'time':start+i*minutes*60,'open':round(o,3),'high':round(high,3),'low':round(low,3),'close':round(p,3)})
    return rows

def oanda(minutes,count):
    token=os.environ.get('OANDA_API_TOKEN','').strip().strip("'").strip('"')
    if not token:raise ValueError('Set OANDA_API_TOKEN in your local environment. Use a newly rotated token, not the one shared in chat.')
    gran={1:'M1',3:'M3',5:'M5',15:'M15',30:'M30',60:'H1',1440:'D',10080:'W'}[minutes]
    headers={'Authorization':'Bearer '+token,'User-Agent':'MoneyPrinter-Research/1.0','Accept':'application/json'}
    # Walk backward by the oldest returned candle. A page can include its
    # boundary, so deduplicate by timestamp and request one extra if needed.
    rows_by_time={};cursor=None;page_count=0
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
        before=len(rows_by_time);oldest=None;oldest_raw=None
        for c in page:
            if not c.get('time'):continue
            t=int(datetime.fromisoformat(c['time'].replace('Z','+00:00')).timestamp())
            if oldest is None or t<oldest:oldest,oldest_raw=t,c['time']
            if not c.get('complete') or not c.get('mid'):continue
            q=c['mid'];rows_by_time[t]={'time':t,'open':float(q['o']),'high':float(q['h']),'low':float(q['l']),'close':float(q['c'])}
        if oldest_raw is None or oldest_raw==cursor or len(rows_by_time)==before:break
        cursor=oldest_raw
    rows=sorted(rows_by_time.values(),key=lambda x:x['time'])[-count:]
    if not rows:raise ValueError('OANDA returned no completed candles.')
    return rows

def aggregate_45(bars):
    """Three uninterrupted, UTC-aligned completed M15 candles form one M45 bar."""
    buckets={}
    for c in bars:
        start=c['time']-(c['time']%2700);buckets.setdefault(start,[]).append(c)
    out=[]
    for start,group in sorted(buckets.items()):
        group.sort(key=lambda x:x['time'])
        if len(group)!=3 or [x['time'] for x in group]!=[start,start+900,start+1800]:continue
        out.append({'time':start,'open':group[0]['open'],'high':max(x['high'] for x in group),'low':min(x['low'] for x in group),'close':group[-1]['close']})
    return out

def unavailable_result(c):
    # Daily/weekly bars follow a market calendar and DST rather than the
    # fixed-duration intraday assumptions used by the scoring engine.
    return {'time':c['time'],'bull':None,'bear':None,'net':None,'classification':'Unavailable for this timeframe','ready':False,'htf':0,'mtf':0,'ltf':0,'break':'Unavailable','sweep':'Unavailable','atr':None,'equilibrium':None,'metrics':{},'zones':[],'conflict':False,'confirmation':False,'confirmation_direction':0}

def main():
    req=json.loads(sys.stdin.read() or '{}');source=req.get('source','sample'); minutes=int(req.get('minutes',5)); count=min(50000,max(100,int(req.get('count',1000))))
    if minutes not in (1,3,5,15,30,45,60,1440,10080) or source not in ('sample','oanda'):raise ValueError('Unsupported data source or timeframe.')
    if source=='sample':bars=sample(minutes,count)
    elif minutes==45:bars=aggregate_45(oanda(15,count*3+2))[-count:]
    else:bars=oanda(minutes,count)
    if not bars:raise ValueError('No complete candles available for this timeframe.')
    available=minutes not in (1440,10080)
    results=analyze(bars,minutes,req.get('weights')) if available else [unavailable_result(c) for c in bars]
    bt=backtest(bars,results,minutes,rr=max(.25,min(5,float(req.get('rr',1.5)))),stop_atr=max(.1,min(10,float(req.get('stopAtr',1)))),horizon=max(1,min(100,int(req.get('horizon',20)))),cost=max(0,min(100,float(req.get('cost',0)))),threshold=max(50,min(100,float(req.get('threshold',65))))) if available else {}
    note=('45m is derived from complete 15m candles aligned to UTC; incomplete groups are excluded. ' if minutes==45 and source=='oanda' else '')+('Daily/weekly: chart only; scores, backtesting and indicators are disabled until calendar-aware support is implemented. OANDA bars use New York 17:00 and Friday weekly alignment. ' if not available else '')
    # Persist the exact candle snapshot, parameters and every score locally.
    # No API token or full process environment enters the database.
    root=os.path.join(os.path.dirname(__file__),'data');os.makedirs(root,exist_ok=True)
    snapshot=json.dumps(bars,separators=(',',':'));digest=hashlib.sha256(snapshot.encode()).hexdigest();run_id=uuid.uuid4().hex
    with sqlite3.connect(os.path.join(root,'runs.sqlite3')) as db:
        db.execute('CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, created_utc TEXT, source TEXT, symbol TEXT, minutes INTEGER, data_sha256 TEXT, settings TEXT, candles TEXT, results TEXT, backtest TEXT)')
        db.execute('INSERT INTO runs VALUES (?,?,?,?,?,?,?,?,?,?)',(run_id,datetime.now(timezone.utc).isoformat(),source,'XAU_USD',minutes,digest,json.dumps(req),snapshot,json.dumps(results,separators=(',',':')),json.dumps(bt)))
    db.close()
    print(json.dumps({'runId':run_id,'dataHash':digest,'analysisAvailable':available,'source':source,'symbol':'XAU_USD','minutes':minutes,'candles':bars,'results':results,'backtest':bt,'warning':note+('Synthetic example data, not market prices.' if source=='sample' else ('OANDA midpoint candles; provider quotes may differ from Exness. Verify timestamps and completeness.'+(f' Only {len(bars)} of {count} requested candles were available.' if len(bars)<count else '')))},allow_nan=False))
if __name__=='__main__':
    try:main()
    except Exception as e:print(json.dumps({'error':str(e)}));sys.exit(1)
