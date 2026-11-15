"""Fetch completed M15 XAU/USD candles locally. Token only in environment, never logged."""
import os,json,urllib.request,urllib.parse,urllib.error,datetime,calendar,hashlib,time,sys
from pathlib import Path
TOKEN=os.environ.get('OANDA_API_TOKEN','').strip().strip("'\"")
if not TOKEN: raise SystemExit('Set OANDA_API_TOKEN in the terminal, never in source or chat.')
def next_month(y,m):return (y+1,1) if m==12 else (y,m+1)
def main():
 rows={};y,m=2023,12
 while (y,m)<(2026,7):
  ny,nm=next_month(y,m);f=f'{y:04d}-{m:02d}-01T00:00:00Z';t=f'{ny:04d}-{nm:02d}-01T00:00:00Z';params=urllib.parse.urlencode({'price':'MBA','granularity':'M15','from':f,'to':t});request=urllib.request.Request('https://api-fxpractice.oanda.com/v3/instruments/XAU_USD/candles?'+params,headers={'Authorization':'Bearer '+TOKEN,'Accept':'application/json'})
  for attempt in range(3):
   try:
    with urllib.request.urlopen(request,timeout=35) as r:payload=json.load(r)
    break
   except (urllib.error.URLError,TimeoutError) as e:
    if attempt==2: raise RuntimeError(f'Could not retrieve {y:04d}-{m:02d} ({type(e).__name__}); no partial output saved.') from None
    time.sleep(1+attempt)
  for c in payload.get('candles',[]):
   if not c.get('complete') or not all(c.get(k) for k in ('mid','bid','ask')):continue
   epoch=int(datetime.datetime.fromisoformat(c['time'].replace('Z','+00:00')).timestamp()); p=lambda k:{a:float(c[k][b]) for a,b in [('open','o'),('high','h'),('low','l'),('close','c')]}
   rows[epoch]={'time':epoch,**p('mid'),'bid':p('bid'),'ask':p('ask'),'volume':c.get('volume')}
  print(f'{y:04d}-{m:02d}: {len(payload.get("candles",[]))} candles',flush=True);y,m=ny,nm
 vals=[rows[k] for k in sorted(rows)];out=Path('research/data/oanda-xau-m15-2024-2026.json');out.parent.mkdir(exist_ok=True); raw=json.dumps(vals,separators=(',',':'));out.write_text(raw);print('Saved',len(vals),'candles; SHA-256',hashlib.sha256(raw.encode()).hexdigest())
if __name__=='__main__':main()
