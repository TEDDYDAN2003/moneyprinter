import unittest
from systematic_vwma_search_2023_2025 import filter_ok,qualifies,FILTERS,STREAMS

class SearchRuleTests(unittest.TestCase):
    def fixture(self):
        return {'search_line_atr':.6,'feature_adx':26.,'feature_di_aligned':True,'feature_body_atr':.6,'feature_close_position':.8,'feature_atr_ratio':1.,'feature_prev_extreme_close':True,'search_same_sweep':False,'search_box_ready':True,'search_inside_box':False}
    def test_fixed_search_universe(self):
        self.assertEqual(len(FILTERS)*len(STREAMS)+1,81)
        for mode in FILTERS:self.assertIsNone(filter_ok(mode,self.fixture()))
    def test_unknown_sweep_never_means_no_sweep(self):
        x=self.fixture();x['search_same_sweep']=None
        self.assertEqual(filter_ok('no_same_sweep',x),'search_filter')
        self.assertEqual(filter_ok('line_no_sweep',x),'search_filter')
    def test_unknown_box_never_means_outside(self):
        x=self.fixture();x['search_box_ready']=False;x['search_inside_box']=None
        self.assertEqual(filter_ok('avoid_inside_box',x),'search_filter')
    def test_qualification_requires_all_criteria(self):
        s={'trades':130,'session_days':260,'net':1.,'pf':1.05,'floating_dd_proxy_pct':25.,'unexpected_gap_unknown':0}
        self.assertTrue(qualifies(s))
        for k,v in [('trades',74),('net',0),('pf',1.04),('floating_dd_proxy_pct',25.01),('unexpected_gap_unknown',1)]:
            q={**s,k:v};self.assertFalse(qualifies(q),k)
        self.assertFalse(qualifies({**s,'trades':129}))

if __name__=='__main__':unittest.main()
