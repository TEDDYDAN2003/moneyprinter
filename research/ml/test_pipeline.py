import unittest
import numpy as np
import pandas as pd
from pipeline import make_features,event_for

def row(t,o=100,h=100.5,l=99.5,c=100):
 return {'time':t,'open':o,'high':h,'low':l,'close':c,'volume':100,'bid':{'open':o-.1,'high':h-.1,'low':l-.1,'close':c-.1},'ask':{'open':o+.1,'high':h+.1,'low':l+.1,'close':c+.1}}
class ResearchTests(unittest.TestCase):
 def test_completed_h4_and_prefix_invariance(self):
  bars=[row(i*900,100+i*.003,100.6+i*.003,99.5+i*.003,100.1+i*.003) for i in range(4000)]
  a=make_features(bars);b=make_features(bars[:3900]);cols=['ema20','ema50','ema200','vwma','h4fast','h4slow','swinghigh','swinglow','fvg_b','fvg_s','atr']
  np.testing.assert_allclose(a[cols].iloc[:3900],b[cols],equal_nan=True)
  known=a.h4_available.notna();self.assertGreater(known.sum(),0)
  self.assertTrue((pd.to_datetime(a.loc[known,'h4_available'],utc=True)<=a.loc[known,'decision_time']).all())
 def test_entry_bar_target_and_tie(self):
  d=pd.DataFrame([{'time':0,'direction':1,'swinglow':99,'swinghigh':104,'atr':2}, {'time':900,'ask_open':100.1,'bid_open':99.9,'bid_low':99.4,'bid_high':104.5,'bid_close':104,'ask_high':104.7,'ask_low':99.6,'ask_close':104.2}]);e=event_for(d,0);self.assertEqual(e['result'],'target');self.assertEqual(e['exit_i'],1);self.assertAlmostEqual(e['entry'],100.2);self.assertAlmostEqual(e['exit'],103.9)
  d.loc[1,'bid_low']=98; e=event_for(d,0);self.assertEqual(e['result'],'ambiguous');self.assertLess(e['net_price'],0)
 def test_gap_and_short_fill(self):
  d=pd.DataFrame([{'time':0,'direction':-1,'swinglow':96,'swinghigh':101,'atr':2},{'time':900,'bid_open':99.9,'ask_open':100.1,'ask_low':99.5,'ask_high':100.5,'ask_close':100,'bid_high':100.3,'bid_low':99.3,'bid_close':99.8},{'time':2700,'ask_open':100,'bid_open':99.8,'ask_low':98,'ask_high':102,'ask_close':100,'bid_high':101.8,'bid_low':97.8,'bid_close':99.8}]);e=event_for(d,0,direction=-1);self.assertEqual(e['result'],'gap');self.assertAlmostEqual(e['entry'],99.8)
if __name__=='__main__':unittest.main()
