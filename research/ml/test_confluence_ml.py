import unittest
from confluence_ml_2023_2025 import FEATURES,split_periods,candidate_outcome

class ConfluenceMLTest(unittest.TestCase):
    def test_no_outcome_or_next_open_feature(self):
        self.assertEqual(len(FEATURES),len(set(FEATURES)))
        for key in FEATURES:
            self.assertFalse(any(x in key for x in ('outcome','target_hit','exit','next_open','pnl','lots','label')))

    def test_split_purges_unavailable_outcomes(self):
        def r(decision,exit,status='resolved'):
            return {'decision_utc':decision,'outcome_exit_known':exit,'label_status':status}
        a=r('2024-06-30T22:00:00+00:00','2024-06-30T22:15:00+00:00')
        leak=r('2024-06-30T23:45:00+00:00','2024-07-01T00:00:00+00:00')
        b=r('2024-07-01T00:00:00+00:00','2024-07-01T00:15:00+00:00')
        c=r('2025-01-01T00:00:00+00:00','2025-01-01T00:15:00+00:00')
        unknown=r('2024-06-01T00:00:00+00:00','','unexpected_gap')
        train,val,test=split_periods([a,leak,b,c,unknown])
        self.assertEqual(train,[a]);self.assertEqual(val,[b]);self.assertEqual(test,[c])

    def test_no_next_bar_has_no_label(self):
        g={'tm':[0]};x={'index':0,'direction':1,'year':2023}
        self.assertEqual(candidate_outcome(g,x,[],[]),{'label_status':'next_open_missing'})

if __name__=='__main__':unittest.main()
