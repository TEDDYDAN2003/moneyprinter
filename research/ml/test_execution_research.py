import unittest
from execution_research_2023_2025 import lots_for, fill_bar

class ExecutionRules(unittest.TestCase):
    def test_risk_includes_commission_and_slip(self):
        lots=lots_for(1000,4,.10,7)
        self.assertEqual(lots,.04)
        self.assertLessEqual(lots*(4*100+10+7),20)
        self.assertEqual(lots_for(1000,25,.1,7),0)

    def test_gap_stop_uses_open_and_adverse_stress(self):
        self.assertEqual(fill_bar(1,95,98,94,98,110,.1,1,True),('gap_stop',93.9))
        self.assertEqual(fill_bar(-1,105,106,102,102,90,.1,1,True),('gap_stop',106.1))

    def test_gap_target_and_ambiguous_stop_first(self):
        self.assertEqual(fill_bar(1,112,113,109,98,110,.1,0,True),('gap_target',109.9))
        self.assertEqual(fill_bar(1,100,111,97,98,110,.1),('ambiguous_stop',97.9))
        self.assertEqual(fill_bar(-1,100,103,89,102,90,.1,stop_extra=.5),('ambiguous_stop',102.6))

    def test_market_gap_does_not_automatically_close_position(self):
        self.assertIsNone(fill_bar(1,100,105,99,98,110,.1,1,True))

if __name__=='__main__':unittest.main()
