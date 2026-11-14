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
