#!/usr/bin/env python3
"""Train-only movement and recovery models. No holdout replay or forward test."""
import contextlib,io,runpy,json,math,hashlib
from collections import Counter
from pathlib import Path
import numpy as np,pandas as pd,sklearn
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression,Ridge
from key_zone_features import candidate_signals,FEATURES,PIP,BASE_SLIP
from intraday_vwma_2023_2025 import NY,CUTOFF
from execution_research_2023_2025 import dump_csv

DISTANCES=(100,200,300)

def observe_path(g,x,pips,minutes,dates):
    """Observe both sides even after adverse hit; session/unknown-gap censoring explicit.

    15m OHLC cannot order a high and a low in the same bar except when the open
    already crosses one threshold. Recovery is counterfactual, not a held trade.
    """
    i=x['index'];j=i+1;tm=g['tm'];side=x['direction'];n=len(tm);d=pips*PIP
    if j>=n or tm[j]-tm[i]!=900:return {'label_status':'next_open_missing'}
    entry=float(g['ao'][j]+BASE_SLIP if side==1 else g['bo'][j]-BASE_SLIP);favorable=entry+side*d;adverse=entry-side*d
    last_idx=int(np.searchsorted(tm,pd.Timestamp(f"{x['year']+1}-01-01",tz='UTC').timestamp())-1);last=min(i+96,last_idx)
    if j>last:return {'label_status':'end_of_data'}
    fav_i=adv_i=None;first=None;initial_same_bar=False;gap=False;cutoff=False;end_of_data=False
    for k in range(j,last+1):
        if k>j and tm[k]-tm[k-1]!=900:gap=True;break
        op=float(g['bo'][k] if side==1 else g['ao'][k]);hi=float(g['bh'][k] if side==1 else g['ah'][k]);lo=float(g['bl'][k] if side==1 else g['al'][k])
        op_f=op>=favorable if side==1 else op<=favorable;op_a=op<=adverse if side==1 else op>=adverse
        hit_f=hi>=favorable if side==1 else lo<=favorable;hit_a=lo<=adverse if side==1 else hi>=adverse
        if hit_f and fav_i is None:fav_i=k
        if hit_a and adv_i is None:adv_i=k
        if first is None:
            if op_f:first='favorable_first'
            elif op_a:first='adverse_first';initial_same_bar=bool(hit_f)
            elif hit_f and hit_a:first='ambiguous_same_bar'
            elif hit_f:first='favorable_first'
            elif hit_a:first='adverse_first'
        if minutes[k]>=CUTOFF or dates[k]!=dates[j]:cutoff=True;break
    if not gap and not cutoff and k==last_idx:end_of_data=True
    if first is None:
        first='censored_gap' if gap else 'censored_end' if end_of_data else 'neither_before_cutoff'
    if first=='adverse_first':
        if fav_i is not None and (fav_i>adv_i or initial_same_bar):recovery='yes';rec_bars=fav_i-adv_i
        elif fav_i is not None and fav_i==adv_i:recovery='unknown_same_bar';rec_bars=None
        elif gap or end_of_data:recovery='censored';rec_bars=None
        else:recovery='no_before_cutoff';rec_bars=None
    else:recovery='not_applicable';rec_bars=None
    # Bar counts are intervals, not exact times; price may cross at any point within bar.
    return {'label_status':first,'label_entry_price':entry,'label_favorable_level':favorable,'label_adverse_level':adverse,'label_first_favorable_bars':fav_i-i if fav_i is not None else None,'label_first_adverse_bars':adv_i-i if adv_i is not None else None,'label_recovery_after_adverse':recovery,'label_recovery_bars_after_adverse':rec_bars,'label_recovery_same_bar_known':bool(initial_same_bar),'label_horizon_bar_count':max(0,(k-1 if gap else k)-i),'label_path_censored_gap':gap,'label_path_censored_end':end_of_data}

def portable_model(model,feature_names,kind,target=None):
    imp=model.named_steps['simpleimputer'];scale=model.named_steps['standardscaler'];est=model.steps[-1][1]
    output={'kind':kind,'feature_names':feature_names,'impute_median':[float(x) for x in imp.statistics_],'scale_mean':[float(x) for x in scale.mean_],'scale_std':[float(x) for x in scale.scale_],'coefficients':np.asarray(est.coef_).tolist(),'intercept':np.asarray(est.intercept_).tolist()}
    if hasattr(est,'classes_'):output['classes']=np.asarray(est.classes_).tolist();output['link']='sigmoid' if len(est.classes_)==2 else 'softmax'
    else:output['link']='expm1_clamped_zero';output['target']=target or 'log1p(first_favorable_bar_count), conditional on favorable hit observed'
    return output

def make_classifier():return make_pipeline(SimpleImputer(strategy='median'),StandardScaler(),LogisticRegression(C=.25,max_iter=2000,random_state=42))
def make_time_model():return make_pipeline(SimpleImputer(strategy='median'),StandardScaler(),Ridge(alpha=5.))

def fit_models(rows):
    result={};summary={};feature=lambda rs:np.asarray([[r['feat_'+k] for k in FEATURES] for r in rs],dtype=float)
    for pips in DISTANCES:
        rs=[r for r in rows if r['distance_pips']==pips];known=[r for r in rs if r['label_status'] in ('favorable_first','adverse_first','neither_before_cutoff')];recover=[r for r in rs if r['label_status']=='adverse_first' and r['label_recovery_after_adverse'] in ('yes','no_before_cutoff')];timed=[r for r in rs if r.get('label_first_favorable_bars') is not None]
        summary[str(pips)]={'training_rows':len(rs),'label_counts':dict(Counter(r['label_status'] for r in rs)),'recovery_label_counts':dict(Counter(r['label_recovery_after_adverse'] for r in rs)),'first_move_training_n':len(known),'recovery_training_n':len(recover),'conditional_timing_training_n':len(timed)}
        bundle={}
        if len(known)>=50 and len({r['label_status'] for r in known})>=2:
            m=make_classifier();m.fit(feature(known),[r['label_status'] for r in known]);bundle['first_move']=portable_model(m,FEATURES,'multiclass_logistic')
        if len(recover)>=30 and len({r['label_recovery_after_adverse'] for r in recover})>=2:
            m=make_classifier();m.fit(feature(recover),[r['label_recovery_after_adverse'] for r in recover]);bundle['recovery_given_adverse']=portable_model(m,FEATURES,'binary_logistic')
        if len(timed)>=30:
            m=make_time_model();m.fit(feature(timed),np.log1p([r['label_first_favorable_bars'] for r in timed]));bundle['time_to_favorable_given_observed_hit']=portable_model(m,FEATURES,'ridge_log1p')
        recovered=[r for r in recover if r['label_recovery_after_adverse']=='yes' and r['label_recovery_bars_after_adverse'] is not None]
        summary[str(pips)]['conditional_recovery_timing_training_n']=len(recovered)
        if len(recovered)>=30:
            m=make_time_model();m.fit(feature(recovered),np.log1p([r['label_recovery_bars_after_adverse'] for r in recovered]));bundle['time_after_adverse_given_observed_recovery']=portable_model(m,FEATURES,'ridge_log1p','log1p(bars after adverse), conditional on adverse first and observed recovery')
        result[str(pips)]=bundle
    return result,summary

def main():
    with contextlib.redirect_stdout(io.StringIO()):g=runpy.run_path('research/ml/structure_2023_2025.py')
    signals=candidate_signals(g);selected=[x for x in signals if x['matched_zone']];dt=pd.to_datetime(g['tm']+900,unit='s',utc=True).tz_convert(NY);minutes=dt.hour.to_numpy()*60+dt.minute.to_numpy();dates=pd.to_datetime(g['tm'],unit='s',utc=True).tz_convert(NY).date
    rows=[]
    for x in selected:
        for pips in DISTANCES:
            rows.append({'candidate_index':x['index'],'decision_utc':x['decision'],'year':x['year'],'direction':x['direction'],'distance_pips':pips,'zone_types':'|'.join(k.replace('zone_','') for k,v in x['flags'].items() if v),**{'feat_'+k:x['features'][k] for k in FEATURES},**observe_path(g,x,pips,minutes,dates)})
    models,counts=fit_models(rows)
    out={'schema_version':1,'purpose':'offline research only; unvalidated; no trade orders or display in live signals','created_from_years':[2023,2024,2025],'source_sha256':hashlib.sha256(g['raw']).hexdigest(),'feature_names':FEATURES,'pip_size_usd':PIP,'distances_pips':list(DISTANCES),'max_bars':96,'timeframe':'M15','training_sessions_utc':['07:00-10:00','12:00-17:00'],'flatten_by':'12:45 America/New_York (historical research assumption)','side_prices':'ask+0.10 long entry / bid-0.10 short entry; opposite quote OHLC for outcomes','training_candidate_count':len(selected),'training_rows':len(rows),'models':models,'training_sample_counts':counts,'sklearn_version':sklearn.__version__,'validation_status':'No unseen-data test has been run for these models; they are unvalidated and not approved for live trading.'}
    Path('research/models/key-zone-movement-2023-2025.json').write_text(json.dumps(out,indent=2,allow_nan=False)+'\n')
    fields=['candidate_index','decision_utc','year','direction','distance_pips','zone_types']+['feat_'+k for k in FEATURES]+['label_status','label_entry_price','label_favorable_level','label_adverse_level','label_first_favorable_bars','label_first_adverse_bars','label_recovery_after_adverse','label_recovery_bars_after_adverse','label_recovery_same_bar_known','label_horizon_bar_count','label_path_censored_gap','label_path_censored_end']
    dump_csv('reports/vwma-zone-movement-training-2023-2025.csv',rows,fields)
    print(json.dumps({'training_candidates':len(selected),'training_rows':len(rows),'training_sample_counts':counts,'model_components':{k:list(v.keys()) for k,v in models.items()},'data_sha256':out['source_sha256'],'model_sha256':hashlib.sha256(Path('research/models/key-zone-movement-2023-2025.json').read_bytes()).hexdigest(),'unseen_test_performed':False},indent=2))
if __name__=='__main__':main()
