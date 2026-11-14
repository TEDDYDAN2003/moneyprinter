import unittest,copy
from engine import analyze,backtest
from run import sample
class EngineTests(unittest.TestCase):
 def test_no_lookahead(self):
  data=sample(5,400);a=analyze(data);edited=copy.deepcopy(data)
  for c in edited[250:]:
   for k in ('open','high','low','close'):c[k]+=500
  b=analyze(edited)
  self.assertEqual(a[:250],b[:250])
 def test_weights_and_gap(self):
  data=sample(5,350);r=analyze(data)
  self.assertTrue(all(0<=x['bull']<=100 and 0<=x['bear']<=100 for x in r))
  with self.assertRaises(ValueError):analyze(data,weights={'htf':200})
  altered=copy.deepcopy(data)
  for c in altered[270:]:c['time']+=300
  result=analyze(altered);self.assertEqual(len(result),len(data));self.assertTrue(set(backtest(altered,result))=={'Train','Validation','Test'})
 def test_not_ready_initial(self):
  self.assertFalse(analyze(sample(5,150))[0]['ready'])
if __name__=='__main__':unittest.main()
