import unittest
import numpy as np
from entry_hypotheses_2023_2025 import wilder,directional_index,checklist_filter

class EntryHypothesesTest(unittest.TestCase):
    def test_wilder_sma_seed_and_recursion(self):
        x=wilder(np.array([1.,2.,3.,4.,5.]),3)
        self.assertTrue(np.isnan(x[0]));self.assertTrue(np.isnan(x[1]));self.assertAlmostEqual(x[2],2.)
        self.assertAlmostEqual(x[3],8/3);self.assertAlmostEqual(x[4],31/9)

    def test_wilder_restarts_after_missing(self):
        x=wilder(np.array([1.,2.,3.,np.nan,4.,5.,6.]),3)
        self.assertTrue(np.isnan(x[5]));self.assertAlmostEqual(x[6],5.)

    def test_directional_index_rising_and_flat(self):
        p=np.arange(60,dtype=float);a,up,dn=directional_index(p+1,p-1,p)
        self.assertAlmostEqual(a[-1],100.);self.assertGreater(up[-1],dn[-1])
        a,up,dn=directional_index(np.ones(60),np.ones(60),np.ones(60))
        self.assertTrue(np.isnan(a[-1])) # zero true range, undefined not artificially strong

    def test_prefix_invariance(self):
        p=np.sin(np.arange(200)/5)+np.arange(200)/100
        full=directional_index(p+.4,p-.4,p);short=directional_index((p+.4)[:120],(p-.4)[:120],p[:120])
        for a,b in zip(full,short):np.testing.assert_allclose(a[:120],b,equal_nan=True)

    def test_first_and_early_retest(self):
        x={'feature_adx':30,'feature_body_atr':1,'feature_close_position':.9,'feature_atr_ratio':1,'feature_prev_extreme_close':True,'feature_engulfing':False,'feature_di_aligned':True,'feature_fvg_touch':False,'retest_number':2,'retest_age':2}
        self.assertEqual(checklist_filter('first_retest',x),'hypothesis_filter')
        self.assertIsNone(checklist_filter('early_retest',x))
        self.assertIsNone(checklist_filter('adx25_strong',x))

if __name__=='__main__':unittest.main()
