#!/usr/bin/env python3
"""Enrich candidate CSV and train chronological, research-only confluence models."""
import contextlib,io,runpy,json,math,hashlib
from collections import Counter
from pathlib import Path
import numpy as np,pandas as pd
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier,export_text
from sklearn.metrics import brier_score_loss,roc_auc_score
from complementary_vwma_2023_2025 import make_events,deduplicate,PRIORITY
from liquidity_consolidation_2023_2025 import liquidity_features
from execution_research_2023_2025 import fill_bar,lots_for,dump_csv
from intraday_vwma_2023_2025 import sim,NY,CUTOFF

FEATURES=['direction','setup_breakout','setup_breakout_retest','setup_trend_pullback','setup_continuation','setup_sweep_reversal','setup_overlap_count','session_london','session_overlap','session_ny','hour_utc_sin','hour_utc_cos','h4_spread_atr','ema200_distance_atr','line_distance_atr','close_stop_distance_atr','body_atr','bar_range_atr','close_position','atr_ratio','tick_volume_ratio','same_sweep','opposing_sweep','box_ready','box_width_atr','box_compressed','box_breakout_same','box_inside','fvg_same_touch','fvg_opposing_touch','swing_range_atr']

def known_features(g,x,z):
    i=x['index'];side=x['direction'];r=g['d'].iloc[i];atr=x['atr'];line=g['line'][i-1];rng=g['h'][i]-g['l'][i];minute=(int(g['tm'][i])+900)%86400/86400;members=x['all_setups'].split('|')
    same=z['bull_sweep_recent'] if side==1 else z['bear_sweep_recent'];opp=z['bear_sweep_recent'] if side==1 else z['bull_sweep_recent']
    if z['box_ready']:
        box_break=int(z['compressed'] and side*(g['c'][i]-(z['box_high'] if side==1 else z['box_low']))>0)
        inside=int(z['compressed'] and z['box_low']<=g['c'][i]<=z['box_high'])
    else:box_break=inside=np.nan
    f={'direction':side,**{'setup_'+k:int(k in members) for k in PRIORITY},'setup_overlap_count':len(members),'session_london':int(r.session_london),'session_overlap':int(r.session_overlap),'session_ny':int(r.session_ny),'hour_utc_sin':math.sin(2*math.pi*minute),'hour_utc_cos':math.cos(2*math.pi*minute),'h4_spread_atr':side*(g['fast'][i]-g['slow'][i])/atr,'ema200_distance_atr':side*(g['c'][i]-g['ema'][i])/atr,'line_distance_atr':side*(g['c'][i]-line)/atr,'close_stop_distance_atr':side*(g['c'][i]-x['p3'])/atr,'body_atr':side*(g['c'][i]-g['o'][i])/atr,'bar_range_atr':rng/atr,'close_position':((g['c'][i]-g['l'][i])/rng if side==1 else (g['h'][i]-g['c'][i])/rng) if rng>0 else np.nan,'atr_ratio':r.atr_ratio,'tick_volume_ratio':r.tick_volume_ratio,'same_sweep':int(same) if same is not None else np.nan,'opposing_sweep':int(opp) if opp is not None else np.nan,'box_ready':int(z['box_ready']),'box_width_atr':z['box_width_atr'] if z['box_ready'] else np.nan,'box_compressed':int(z['compressed']) if z['box_ready'] else np.nan,'box_breakout_same':box_break,'box_inside':inside,'fvg_same_touch':int(r.fvg_b if side==1 else r.fvg_s),'fvg_opposing_touch':int(r.fvg_s if side==1 else r.fvg_b),'swing_range_atr':abs(g['p3h'][i]-g['p3l'][i])/atr}
    assert set(f)==set(FEATURES)
    return {k:float(f[k]) if f[k] is not None and np.isfinite(f[k]) else np.nan for k in FEATURES}

def candidate_outcome(g,x,minute,dates):
    """Standalone hypothetical label, $1000 fixed capital; not a sequential replay."""
    i=x['index'];j=i+1;side=x['direction'];tm=g['tm'];n=len(tm);year=x['year'];slip=.1;commission=7.
    if j>=n or tm[j]-tm[i]!=900:return {'label_status':'next_open_missing'}
    if pd.Timestamp(tm[j],unit='s',tz='UTC').year!=year:return {'label_status':'year_end'}
    if minute[i]>=CUTOFF:return {'label_status':'past_cutoff'}
    entry=float(g['ao'][j]+slip if side==1 else g['bo'][j]-slip);stop=x['p3']-side*max(.20,.15*x['atr']);risk=side*(entry-stop)
    if not np.isfinite(risk) or not .2*x['atr']<=risk<=25:return {'label_status':'invalid_stop'}
    lots=lots_for(1000,risk,slip,commission)
    if lots<.01:return {'label_status':'risk_budget'}
    dist=side*(x['opposing']-entry);target=float(x['opposing'] if np.isfinite(dist) and risk<=dist<=3*risk else entry+side*1.5*risk)
    last_idx=np.searchsorted(tm,pd.Timestamp(f'{year+1}-01-01',tz='UTC').timestamp())-1
    end=min(i+48,last_idx);result=None;exitpx=None
    for k in range(j,end+1):
        if k>j and tm[k]-tm[k-1]!=900:return {'label_status':'unexpected_gap'}
        op=float(g['bo'][k] if side==1 else g['ao'][k]);hi=float(g['bh'][k] if side==1 else g['ah'][k]);lo=float(g['bl'][k] if side==1 else g['al'][k]);cl=float(g['bc'][k] if side==1 else g['ac'][k]);fill=fill_bar(side,op,hi,lo,stop,target,slip)
        if fill:result,exitpx=fill;break
        if minute[k]>=CUTOFF or dates[k]!=dates[j]:result='scheduled_flat';exitpx=cl-side*slip;break
    if result is None:result='year_end' if k==last_idx else 'timeout';exitpx=cl-side*slip
    pnl=side*(exitpx-entry)*lots*100-commission*lots
    return {'label_status':'resolved','outcome_exit_known':pd.Timestamp(tm[k]+900,unit='s',tz='UTC').isoformat(),'outcome_result':result,'outcome_net_usd_fixed_1000':pnl,'outcome_positive':int(pnl>0),'outcome_entry':entry,'outcome_stop':stop,'outcome_target':target,'outcome_exit':exitpx,'outcome_lots':lots}

def split_periods(rows):
    """Purge labels whose outcomes are not known strictly before the next period."""
    boundary='2024-07-01T00:00:00+00:00';end24='2025-01-01T00:00:00+00:00';end25='2026-01-01T00:00:00+00:00'
    resolved=[r for r in rows if r['label_status']=='resolved']
    train=[r for r in resolved if r['decision_utc']<boundary and r['outcome_exit_known']<boundary]
    validation=[r for r in resolved if boundary<=r['decision_utc']<end24 and r['outcome_exit_known']<end24]
    observed=[r for r in resolved if end24<=r['decision_utc']<end25 and r['outcome_exit_known']<end25]
    return train,validation,observed

def stats_class(rows,probs,train_rate):
    if not rows:return {}
    y=np.array([r['outcome_positive'] for r in rows]);p=np.array(probs);return {'n':len(y),'positive_rate':round(float(y.mean()),4),'brier':round(float(brier_score_loss(y,p)),4),'constant_training_rate_brier':round(float(brier_score_loss(y,np.full(len(y),train_rate))),4),'auc':round(float(roc_auc_score(y,p)),4) if len(set(y))==2 else None}

def main():
    with contextlib.redirect_stdout(io.StringIO()):g=runpy.run_path('research/ml/structure_2023_2025.py')
    events=make_events(g);events,overlap=deduplicate(events,PRIORITY);feat=liquidity_features(g['tm'],g['h'],g['l'],g['c'],g['atr']);minute=np.array([(pd.Timestamp(t+900,unit='s',tz='UTC').tz_convert(NY).hour*60+pd.Timestamp(t+900,unit='s',tz='UTC').tz_convert(NY).minute) for t in g['tm']]);dates=pd.to_datetime(g['tm'],unit='s',utc=True).tz_convert(NY).date
    rows=[]
    for x in events:
        row={'candidate_index':x['index'],'decision_utc':x['decision'],'year':x['year'],'priority_setup':x['setup'],'all_setups':x['all_setups'],**{'feat_'+k:v for k,v in known_features(g,x,feat[x['index']]).items()},**candidate_outcome(g,x,minute,dates)};rows.append(row)
    boundary='2024-07-01T00:00:00+00:00';end24='2025-01-01T00:00:00+00:00';end25='2026-01-01T00:00:00+00:00'
    train,val,test=split_periods(rows)
    matrix=lambda data:np.asarray([[r['feat_'+k] for k in FEATURES] for r in data],dtype=float); labels=lambda data:np.asarray([r['outcome_positive'] for r in data],dtype=int)
    if len(train)<100 or len(set(labels(train)))<2 or len(val)<50:raise RuntimeError('Insufficient chronological labelled examples')
    models={'logistic':make_pipeline(SimpleImputer(strategy='median',add_indicator=True),StandardScaler(),LogisticRegression(C=.25,max_iter=2000,random_state=42)),'tree':make_pipeline(SimpleImputer(strategy='median',add_indicator=True),DecisionTreeClassifier(max_depth=3,min_samples_leaf=30,random_state=42))}
    for model in models.values():model.fit(matrix(train),labels(train))
    # Scores for all candidate signals; model never sees outcome or next-open data.
    for name,model in models.items():
        probs=model.predict_proba(matrix(rows))[:,1]
        for r,p in zip(rows,probs):r['score_'+name]=float(p)
    for r in rows:
        r['score_period']='training_in_sample' if r['decision_utc']<boundary else 'validation_2024_H2' if r['decision_utc']<end24 else 'observed_2025'
    imp=models['logistic'].named_steps['simpleimputer'];names=imp.get_feature_names_out(FEATURES);coef=models['logistic'].named_steps['logisticregression'].coef_[0]
    coefficients=[{'feature':str(k),'standardized_coefficient':round(float(v),4)} for k,v in sorted(zip(names,coef),key=lambda z:-abs(z[1]))]
    ti=models['tree'].named_steps['simpleimputer'];tree_text=export_text(models['tree'].named_steps['decisiontreeclassifier'],feature_names=list(ti.get_feature_names_out(FEATURES)))
    rate=float(labels(train).mean());classification={}
    for name in models:
        classification[name]={'validation':stats_class(val,[r['score_'+name] for r in val],rate),'2025':stats_class(test,[r['score_'+name] for r in test],rate)}
    scores={r['candidate_index']:r for r in rows};validation_events=[x for x in events if boundary<=x['decision']<end24];test_events=[x for x in events if end24<=x['decision']<end25];days_val=sum(1 for d in g['trading_days'][2024] if d>='2024-07-01');days_test=len(g['trading_days'][2025]);cases=[]
    def replay(eventset,year,model=None,threshold=None,stress=False):
        local={**g,'candidates':eventset};kwargs={'slip':.30,'commission':10.,'stop_extra':.50} if stress else {}
        gate=None if model is None else lambda x:None if scores[x['index']]['score_'+model]>=threshold else 'below_model_threshold'
        s,rr=sim(local,year,'baseline',candidate_filter=gate,**kwargs);s['session_days']=days_val if year==2024 else days_test
        return s,rr
    valbase,_=replay(validation_events,2024);testbase,testbasetrades=replay(test_events,2025);stressbase,_=replay(test_events,2025,stress=True)
    for name in models:
        for threshold in (.45,.50,.55,.60):
            s,rr=replay(validation_events,2024,name,threshold);b=classification[name]['validation'];qual=s['trades']>=30 and s['trades']/days_val>=.5 and s['net']>0 and s['net']>valbase['net'] and s['pf'] is not None and s['pf']>=1.05 and s['floating_dd_proxy_pct']<=25 and b['brier']<b['constant_training_rate_brier']
            cases.append({'model':name,'threshold':threshold,'qualifies':qual,**{k:v for k,v in s.items() if k not in ('variant','rejects','year')}})
    qualified=[x for x in cases if x['qualifies']];selection=max(qualified,key=lambda x:x['net']) if qualified else None;diagnostic=max(cases,key=lambda x:x['net']);selected=selection or diagnostic
    s25,trade25=replay(test_events,2025,selected['model'],selected['threshold']);stress25,stress_trades=replay(test_events,2025,selected['model'],selected['threshold'],True)
    # Separately report a 2025 $0.30/side stress on non-ML baseline under identical replay logic.
    checks={'data_sha256':hashlib.sha256(g['raw']).hexdigest(),'feature_names':FEATURES,'status_counts':dict(Counter(r['label_status'] for r in rows)),'candidate_bars':len(rows),'overlap':overlap,'train':{'count':len(train),'positive_rate':rate,'decision_interval':'2023-01-01 through 2024-06-30, exits before July 1'},'validation':{'count':len(val),'session_days':days_val,'interval':'2024-07-01 through 2024-12-31'},'2025':{'count':len(test),'session_days':days_test},'classification':classification,'validation_baseline':{k:v for k,v in valbase.items() if k!='rejects'},'validation_candidates':cases,'qualified_selection':selection,'diagnostic_selection':diagnostic,'2025_baseline':{k:v for k,v in testbase.items() if k!='rejects'},'2025_baseline_stress':{k:v for k,v in stressbase.items() if k!='rejects'},'2025_diagnostic':{k:v for k,v in s25.items() if k!='rejects'},'2025_diagnostic_stress':{k:v for k,v in stress25.items() if k!='rejects'}}
    # Descriptive candidate groups, not a sequential account and not causal effects.
    group_rows=[]
    for period,subset in [('2024_H2',val),('2025',test)]:
        for feature in ('setup_breakout','setup_breakout_retest','setup_trend_pullback','setup_continuation','setup_sweep_reversal','same_sweep','opposing_sweep','box_compressed','box_breakout_same','box_inside','fvg_same_touch'):
            for value in (0.,1.):
                subset2=[r for r in subset if r['feat_'+feature]==value]
                if not subset2:continue
                pn=[r['outcome_net_usd_fixed_1000'] for r in subset2];gross=sum(p for p in pn if p>0);loss=-sum(p for p in pn if p<0)
                group_rows.append({'period':period,'feature':feature,'value':int(value),'labelled_candidates':len(pn),'positive_rate_pct':round(100*sum(p>0 for p in pn)/len(pn),2),'avg_pnl_fixed_1000':round(float(np.mean(pn)),2),'profit_factor_unsequenced':round(gross/loss,3) if loss else None})
    checks['training_coefficients']=coefficients;checks['training_tree']=tree_text
    # Explicitly retain identifiers and outcomes separately from feat_ inputs.
    rowfields=['candidate_index','decision_utc','year','priority_setup','all_setups','score_period']+['feat_'+k for k in FEATURES]+['label_status','outcome_exit_known','outcome_result','outcome_net_usd_fixed_1000','outcome_positive','outcome_entry','outcome_stop','outcome_target','outcome_exit','outcome_lots','score_logistic','score_tree']
    dump_csv('reports/vwma-ml-confluence-candidates-2023-2025.csv',rows,rowfields);dump_csv('reports/vwma-ml-validation-thresholds.csv',cases,list(cases[0]));dump_csv('reports/vwma-ml-confluence-groups.csv',group_rows,list(group_rows[0]));dump_csv('reports/vwma-ml-training-coefficients.csv',coefficients,['feature','standardized_coefficient'])
    outtrades=[]
    for name,rs in [('2025_baseline',testbasetrades),('2025_model_diagnostic',trade25),('2025_model_stress',stress_trades)]:
        for x in rs:outtrades.append({'replay':name,'model_score':scores[x['index']]['score_'+selected['model']],**x})
    dump_csv('reports/vwma-ml-2025-replay-trades.csv',outtrades,['replay','decision','exit_time','setup','all_setups','direction','model_score','result','entry','stop','target','exit','lots','planned_stop_usd','pnl','balance'])
    Path('research/data/confluence-ml-summary.json').write_text(json.dumps(checks,indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
    print(json.dumps(checks,indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))
if __name__=='__main__':main()
