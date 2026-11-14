import json, unittest
from unittest.mock import patch
from urllib.parse import urlparse,parse_qs
from datetime import datetime,timezone
from run import oanda
class Reply:
 def __init__(self,items):self.items=items
 def __enter__(self):return self
 def __exit__(self,*_):pass
 def read(self):return json.dumps({'candles':self.items}).encode()
class PaginationTests(unittest.TestCase):
 def test_pages_including_boundary_and_live_bar(self):
  base=1704067200; all_data=[]
  for i in range(10100):
   ts=datetime.fromtimestamp(base+i*300,timezone.utc).isoformat().replace('+00:00','Z')
   all_data.append({'time':ts,'complete':i!=10099,'mid':{'o':'10','h':'11','l':'9','c':'10'}})
  requests=[]
  def mock(url,timeout):
   q=parse_qs(urlparse(url.full_url).query);requests.append(q);count=int(q['count'][0]);end=q.get('to',[None])[0];eligible=[x for x in all_data if end is None or x['time']<=end]
   return Reply(eligible[-count:])
  with patch.dict('os.environ',{'OANDA_API_TOKEN':'fake'}),patch('urllib.request.urlopen',mock):
   rows=oanda(5,10000)
  self.assertEqual(len(rows),10000);self.assertEqual(len(set(x['time'] for x in rows)),10000)
  self.assertTrue(all(rows[i]['time']-rows[i-1]['time']==300 for i in range(1,len(rows))))
  self.assertGreaterEqual(len(requests),3);self.assertTrue(all(int(x['count'][0])<=5000 for x in requests))
 def test_provider_exhaustion_short(self):
  def mock(req,timeout):return Reply([{'time':'2025-01-01T00:00:00Z','complete':True,'mid':{'o':'10','h':'11','l':'9','c':'10'}}])
  with patch.dict('os.environ',{'OANDA_API_TOKEN':'fake'}),patch('urllib.request.urlopen',mock):self.assertEqual(len(oanda(5,100)),1)
if __name__=='__main__':unittest.main()

class TimeframeTests(unittest.TestCase):
 def test_native_timeframe_parameters(self):
  received=[]
  def mock(req,timeout):
   q=parse_qs(urlparse(req.full_url).query);received.append(q)
   return Reply([{'time':'2025-01-01T00:00:00Z','complete':True,'mid':{'o':'10','h':'11','l':'9','c':'10'}}])
  with patch.dict('os.environ',{'OANDA_API_TOKEN':'fake'}),patch('urllib.request.urlopen',mock):
   for tf in (1,3,30,1440,10080):oanda(tf,1)
  self.assertEqual([q['granularity'][0] for q in received],['M1','M3','M30','D','W'])
  self.assertEqual(received[-1]['alignmentTimezone'],['America/New_York'])
  self.assertEqual(received[-1]['weeklyAlignment'],['Friday'])
 def test_45_minute_aggregation_and_gap(self):
  from run import aggregate_45
  start=1704067200 # divisible by 2700
  data=[{'time':start+900*i,'open':10+i,'high':12+i,'low':9+i,'close':11+i} for i in range(6)]
  result=aggregate_45(data)
  self.assertEqual(len(result),2);self.assertEqual(result[0],{'time':start,'open':10,'high':14,'low':9,'close':13})
  self.assertEqual(len(aggregate_45([c for i,c in enumerate(data) if i!=1])),1)
 def test_daily_weekly_scoring_unavailable(self):
  from run import unavailable_result
  for tf in (1440,10080):
   with patch('sys.stdin',__import__('io').StringIO(json.dumps({'source':'sample','minutes':tf,'count':100}))),patch('sys.stdout',new_callable=__import__('io').StringIO) as out,patch('sqlite3.connect') as db:
    from run import main
    main();result=json.loads(out.getvalue())
   self.assertFalse(result['analysisAvailable']);self.assertIsNone(result['results'][0]['bull']);self.assertEqual(result['backtest'],{})
 def test_45_fetches_15_min_and_uses_only_complete_groups(self):
  from run import main
  start=1704067200
  src=[{'time':start+900*i,'open':10+i,'high':12+i,'low':9+i,'close':11+i} for i in range(315)]
  src.pop(4)
  with patch('sys.stdin',__import__('io').StringIO(json.dumps({'source':'oanda','minutes':45,'count':100}))),patch('sys.stdout',new_callable=__import__('io').StringIO) as out,patch('sqlite3.connect'),patch('run.oanda',return_value=src) as fetch:
   main();result=json.loads(out.getvalue())
  fetch.assert_called_once_with(15,302)
  self.assertEqual(len(result['candles']),100)
  self.assertTrue(result['analysisAvailable'])
  self.assertIn('derived',result['warning'])
