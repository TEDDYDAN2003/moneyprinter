import unittest
import numpy as np
from liquidity_consolidation_2023_2025 import liquidity_features,allow,enrich

class FeatureCausality(unittest.TestCase):
    def fixture(self,n=35):
        return np.arange(n)*900,np.full(n,101.),np.full(n,99.),np.full(n,100.),np.ones(n)

    def test_closed_bar_sweep_and_previous_box(self):
        t,h,l,c,a=self.fixture();l[25]=98.;c[25]=99.5;h[25]=103.
        f=liquidity_features(t,h,l,c,a)
        self.assertTrue(f[25]['bull_sweep_recent'])
        self.assertEqual(f[25]['box_high'],101.)
        self.assertEqual(f[25]['box_low'],99.)
        self.assertTrue(f[25]['compressed'])
        self.assertTrue(f[28]['bull_sweep_recent'])
        self.assertFalse(f[29]['bull_sweep_recent'])

    def test_future_changes_do_not_change_prior_features(self):
        t,h,l,c,a=self.fixture();before=liquidity_features(t,h,l,c,a)
        h[30:]=150;l[30:]=50;c[30:]=80
        after=liquidity_features(t,h,l,c,a)
        for i in range(29):self.assertEqual(before[i],after[i])
        self.assertEqual(before[29],after[29])

    def test_gap_marks_history_unknown_not_no_sweep(self):
        t,h,l,c,a=self.fixture();t[20:]+=900
        f=liquidity_features(t,h,l,c,a)
        self.assertFalse(f[25]['liquidity_ready'])
        self.assertFalse(f[25]['box_ready'])
        self.assertIsNone(f[25]['bull_sweep_recent'])
        self.assertEqual(allow('no_opposing',{'liquidity_ready':False}), 'sweep_history_missing')

    def test_breach_without_reclaim_not_a_sweep(self):
        t,h,l,c,a=self.fixture();l[25]=98;c[25]=98.5
        self.assertFalse(liquidity_features(t,h,l,c,a)[25]['bull_sweep_recent'])

if __name__=='__main__':unittest.main()
