"""Fetch only 2023–2025 OANDA XAU/USD candles; token comes from environment."""
import os,json,urllib.parse,urllib.request,urllib.error,datetime,hashlib,time,argparse
from pathlib import Path

def main():
 token=os.environ.get('OANDA_API_TOKEN','').strip().strip("'\"")
 if not token:raise SystemExit('Set OANDA_API_TOKEN privately in the terminal.')
 parser=argparse.ArgumentParser();parser.add_argument('--reuse-2024-2025',action='store_true',help='Reuse the local OANDA snapshot for 2024–25; fetch 2023 only.')
 args=parser.parse_args();rows={}
 if args.reuse_2024_2025:
  old=Path('research/data/oanda-xau-m15-2024-2026.json');
  if not old.exists():raise SystemExit('Local 2024–25 OANDA snapshot missing.')
  for x in json.loads(old.read_text()):
   if 1704067200<=x['time']<1767225600:rows[x['time']]=x
 for year in ((2023,) if args.reuse_2024_2025 else (2023,2024,2025)):
  for month in range(1,13):
   ny,nm=(year+1,1) if month==12 else (year,month+1)
   params=urllib.parse.urlencode({'price':'MBA','granularity':'M15','from':f'{year:04}-{month:02}-01T00:00:00Z','to':f'{ny:04}-{nm:02}-01T00:00:00Z'})
   for attempt in range(6):
    # These alignment fields do not alter native intraday bars but vary the request URL between retries.
    query=params+'&'+urllib.parse.urlencode({'dailyAlignment':attempt,'alignmentTimezone':'UTC'})
    req=urllib.request.Request('https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles?'+query,headers={'Authorization':'Bearer '+token,'Accept':'application/json','Cache-Control':'no-cache'})
    try:
     with urllib.request.urlopen(req,timeout=40) as response: payload=json.load(response)
     break
    except (urllib.error.URLError,TimeoutError) as e:
     if attempt==5:raise RuntimeError(f'Cannot retrieve {year:04}-{month:02} ({type(e).__name__}); no partial snapshot saved.') from None
     time.sleep(min(3,attempt+1))
   for c in payload.get('candles',[]):
    if not c.get('complete') or not all(c.get(k) for k in ('mid','bid','ask')):continue
    ts=int(datetime.datetime.fromisoformat(c['time'].replace('Z','+00:00')).timestamp());p=lambda k:{a:float(c[k][b]) for a,b in [('open','o'),('high','h'),('low','l'),('close','c')]};rows[ts]={'time':ts,**p('mid'),'bid':p('bid'),'ask':p('ask'),'volume':c.get('volume')}
   print(f'{year:04}-{month:02}: {len(payload.get("candles",[]))} candles',flush=True)
 vals=[rows[k] for k in sorted(rows)];out=Path('research/data/oanda-xau-m15-2023-2025.json');out.parent.mkdir(exist_ok=True);raw=json.dumps(vals,separators=(',',':'));out.write_text(raw);print('Saved',len(vals),'candles, SHA-256',hashlib.sha256(raw.encode()).hexdigest())
if __name__=='__main__':main()
