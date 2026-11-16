import unittest
import numpy as np
import pandas as pd
from intraday_vwma_2023_2025 import CUTOFF
from train_zone_movement_2023_2025 import observe_path,make_classifier,make_time_model,portable_model

def fixture():
    start=int(pd.Timestamp('2024-03-05T12:00:00Z').timestamp());times=np.arange(6)*900+start
    g={'tm':times,'ao':np.full(6,100.),'bo':np.full(6,100.),'ah':np.full(6,100.5),'al':np.full(6,99.5),'bh':np.full(6,100.5),'bl':np.full(6,99.5)}
    x={'index':0,'direction':1,'year':2024};minutes=np.array([100,100,100,CUTOFF,100,100]);dates=np.array([pd.Timestamp('2024-03-05').date()]*6)
    return g,x,minutes,dates

class PathLabels(unittest.TestCase):
    def test_ambiguous_bar_is_not_invented_order(self):
        g,x,m,d=fixture();g['bh'][1]=102;g['bl'][1]=98
        r=observe_path(g,x,100,m,d)
        self.assertEqual(r['label_status'],'ambiguous_same_bar')
        self.assertEqual(r['label_recovery_after_adverse'],'not_applicable')

    def test_adverse_then_favorable_timing(self):
        g,x,m,d=fixture();g['bl'][1]=98;g['bh'][2]=102
        r=observe_path(g,x,100,m,d)
        self.assertEqual(r['label_status'],'adverse_first');self.assertEqual(r['label_recovery_after_adverse'],'yes')
        self.assertEqual(r['label_first_adverse_bars'],1);self.assertEqual(r['label_first_favorable_bars'],2);self.assertEqual(r['label_recovery_bars_after_adverse'],1)

    def test_gap_censors_no_hit(self):
        g,x,m,d=fixture();g['tm'][2:]+=900
        r=observe_path(g,x,100,m,d)
        self.assertEqual(r['label_status'],'censored_gap');self.assertTrue(r['label_path_censored_gap'])

    def test_no_next_open_is_unlabelled(self):
        g,x,m,d=fixture();g['tm'][1:]+=900
        self.assertEqual(observe_path(g,x,100,m,d),{'label_status':'next_open_missing'})

    def test_open_stop_then_recovery_same_bar_is_ordered(self):
        g,x,m,d=fixture();g['bo'][1]=98.;g['bl'][1]=97.;g['bh'][1]=102.
        r=observe_path(g,x,100,m,d)
        self.assertEqual(r['label_status'],'adverse_first');self.assertEqual(r['label_recovery_after_adverse'],'yes')
        self.assertEqual(r['label_recovery_bars_after_adverse'],0);self.assertTrue(r['label_recovery_same_bar_known'])

class ModelSerialization(unittest.TestCase):
    def test_classifier_export_matches_implementation(self):
        x=np.array([[0,1],[1,0],[0,2],[2,0],[1,1],[2,2],[3,1],[1,3],[3,3]],float);y=['a','b','c']*3
        m=make_classifier();m.fit(x,y);p=portable_model(m,['a','b'],'multiclass_logistic');v=(x-np.array(p['scale_mean']))/np.array(p['scale_std']);z=v@np.array(p['coefficients']).T+np.array(p['intercept']);z-=z.max(axis=1,keepdims=True);probs=np.exp(z)/np.exp(z).sum(axis=1,keepdims=True)
        np.testing.assert_allclose(probs,m.predict_proba(x),rtol=1e-10,atol=1e-10)

    def test_timing_export_matches_ridge_log_output(self):
        x=np.array([[0],[1],[2],[3],[4]],float);t=np.log1p([1,2,3,4,5]);m=make_time_model();m.fit(x,t);p=portable_model(m,['x'],'ridge_log1p');z=((x-np.array(p['scale_mean']))/np.array(p['scale_std']))@np.array(p['coefficients'])+p['intercept']
        np.testing.assert_allclose(z,m.predict(x),rtol=1e-10,atol=1e-10)

if __name__=='__main__':unittest.main()
