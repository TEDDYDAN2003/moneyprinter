/** Run the exact Moneyprinter chart indicator calc on a private candle snapshot. No orders. */
const fs=require('fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpile(fs.readFileSync(f,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),f);
const {vwmaCrossoverScript}=require('../../src/lib/indicators/vwma-crossover.ts');
const data=JSON.parse(fs.readFileSync('research/data/oanda-xau-m15-2024-2026.json','utf8'));
const indicator=new Function(vwmaCrossoverScript)();
function calculate(bars){const obj={extendData:{inputs:{}}};indicator.calc(bars,obj);return obj._vwmaStudy;}
const all=calculate(data),n=5000,prefix=calculate(data.slice(0,n));
for(let i=0;i<n;i++){if(Math.abs(all.vwma[i]-prefix.vwma[i])>1e-9||Math.abs(all.ema[i]-prefix.ema[i])>1e-9)throw Error(`Prefix invariance failed on bar ${i}`);}
const fullSignals=all.signals.filter(s=>s.bar<n);if(JSON.stringify(fullSignals)!==JSON.stringify(prefix.signals))throw Error('Signal prefix invariance failed');
// Viewport renderer uses a finite lookback: sample full-history signal bars with 300 prior bars.
const eligible=all.signals.filter(s=>s.bar>=500);const stride=Math.max(1,Math.floor(eligible.length/400));const sample=eligible.filter((_,i)=>i%stride===0).slice(0,400);let missing=0,directionDiff=0,gradeDiff=0,trendDiff=0,sumDiff=0,maxDiff=0;
for(const s of sample){const from=s.bar-300,short=calculate(data.slice(from,s.bar+1));const last=short.signals.find(x=>x.bar===300);if(!last)missing++;else {if(last.dir!==s.dir)directionDiff++;if(last.grade!==s.grade)gradeDiff++;if(last.trendAligned!==s.trendAligned)trendDiff++;}const diff=Math.abs(short.vwma[300]-all.vwma[s.bar]);sumDiff+=diff;maxDiff=Math.max(maxDiff,diff);}
const viewportAudit={sample:sample.length,historyBars:300,fullSignalsAbsentInSlice:missing,directionDifferent:directionDiff,gradeDifferent:gradeDiff,trendAlignedDifferent:trendDiff,meanLineDifference:sumDiff/sample.length,maxLineDifference:maxDiff};
const out={settings:{length:14,minDivergence:.15,trendGate:true,showCounterTrend:true},viewportAudit,bars:data.length,times:data.map(b=>b.time),vwma:all.vwma,ema:all.ema,signals:all.signals};
fs.writeFileSync('research/data/oanda-chart-proxy-vwma.json',JSON.stringify(out));
console.log(`Ran original chart indicator over ${data.length} OANDA bars; ${all.signals.length} signals; prefix test passed.`);console.log('300 prior-bars audit',viewportAudit);
