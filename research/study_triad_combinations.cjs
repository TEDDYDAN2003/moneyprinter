/** Offline historical study; requires research/data/oanda-xau-m15-jul-oct2026.json. */
const fs=require('fs'),ts=require('typescript');require.extensions['.ts']=(m,f)=>m._compile(ts.transpile(fs.readFileSync(f,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),f);
const {initSniperSimulation,stepSniperSimulation,sniperDefaults,computeSniperStats,getKillzoneSession}=require('../src/lib/sniperReplay.ts');const {assessTriad}=require('../src/lib/triadResearch.ts');
const bars=JSON.parse(fs.readFileSync('research/data/oanda-xau-m15-jul-oct2026.json'));
const modes=['ma_or_fvg','ma','continuation','sweep','fvg','ma_and_sweep','ma_and_continuation','continuation_or_sweep'];
const base={...sniperDefaults,initialBalance:1000,lotSizeMode:'fixed_lots',fixedLots:.05,riskPct:2,contractType:'standard_contract',sessionFilter:'killzone_only',strategyProfile:'institutional_triad',executionType:'market',spreadDollars:.25};
const seconds=s=>Date.parse(s)/1000;
const train=[seconds('2026-07-31T21:00:00Z'),seconds('2026-10-11T21:00:00Z')],check=[seconds('2026-10-11T21:00:00Z'),seconds('2026-10-29T21:00:00Z')];
function run(mode,period){const s={...base,triadMode:mode};let first=bars.findIndex(b=>b.time>=period[0]),last=bars.findLastIndex(b=>b.time+900<=period[1]),st=initSniperSimulation(first,bars,s),decisions=[];
 for(let i=first;i<=last;i++){
  if(i>first)st=stepSniperSimulation(st,bars,s);
  let b=bars[i],row=st.decisionLog?.[st.decisionLog.length-1];if(row && row.candleTime===b.time && getKillzoneSession(row.time).inKillzone)decisions.push({...row,balance:st.balance});
 }
 const stats=computeSniperStats(st.outcomes,1000,st.balance),ambiguous=st.outcomes.filter(o=>o.outcome==='ambiguous').length;return {mode,stats,ambiguous,maxClosedBalanceDrawdownPct:st.maxDrawdownPct,open:!!st.activePlan,outcomes:st.outcomes,decisions};}
const training=modes.map(mode=>run(mode,train));
// Freeze selection from training: >=20 closed, positive net and profit factor >1; rank by net R/trade.
const eligible=training.filter(x=>x.stats.totalTrades>=20&&x.stats.netDollars>0&&x.stats.profitFactor>1).sort((a,b)=>b.stats.totalR/b.stats.totalTrades-a.stats.totalR/a.stats.totalTrades);
const selected=eligible[0]?.mode||null;const checking=[...new Set(['ma_or_fvg','ma',...(selected?[selected]:[])])].map(mode=>run(mode,check));
fs.writeFileSync('research/data/triad-combination-study.json',JSON.stringify({training,selected,checking,periods:{train,check},settings:base},null,2));
for(const [title,rs] of [['TRAIN',training],['CHECK',checking]]){console.log(title);for(const r of rs){console.log(r.mode,JSON.stringify({trades:r.stats.totalTrades,win:r.stats.winRate,net:r.stats.netDollars,pf:r.stats.profitFactor,r:r.stats.totalR,dd:Number(r.maxClosedBalanceDrawdownPct.toFixed(2)),ambiguous:r.ambiguous,open:r.open,signals:r.decisions.filter(x=>x.status==='signal').length}));}}console.log('training-selection',selected||'none');
