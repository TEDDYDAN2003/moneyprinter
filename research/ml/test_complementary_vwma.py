import unittest
from complementary_vwma_2023_2025 import deduplicate

class CombinedSignalTests(unittest.TestCase):
    def test_overlap_deduplicates_with_fixed_priority(self):
        es=[{'index':10,'setup':'sweep_reversal','direction':1},{'index':10,'setup':'breakout_retest','direction':1},{'index':10,'setup':'trend_pullback','direction':1}]
        result,counts=deduplicate(es,('sweep_reversal','trend_pullback','breakout_retest'))
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]['setup'],'breakout_retest')
        self.assertEqual(result[0]['all_setups'],'breakout_retest|trend_pullback|sweep_reversal')
        self.assertEqual(counts['same_direction_overlap_bars'],1)

    def test_opposite_direction_conflicts_skipped(self):
        es=[{'index':7,'setup':'breakout','direction':1},{'index':7,'setup':'sweep_reversal','direction':-1}]
        result,counts=deduplicate(es,('breakout','sweep_reversal'))
        self.assertEqual(result,[])
        self.assertEqual(counts['conflicting_direction_bars_skipped'],1)

    def test_individual_run_does_not_include_others(self):
        es=[{'index':7,'setup':'breakout','direction':1},{'index':8,'setup':'sweep_reversal','direction':-1}]
        result,_=deduplicate(es,('sweep_reversal',))
        self.assertEqual([x['index'] for x in result],[8])

if __name__=='__main__':unittest.main()
