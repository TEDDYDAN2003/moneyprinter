/** Experimental, close-confirmed Institutional Triad. No orders are placed. */
import {createStructureEngine} from './marketStructure';
import {getKillzoneSession} from './sniperReplay';
import type {SniperBar, SniperPlan, SniperSettings, SniperState, SniperOutcome} from './sniperReplay';

type Feature = {trend:number; protectedLow:number|null; protectedHigh:number|null; ema:number; vwma:number|null; atr:number; shockUntil:number; duration:number};
const cache = new WeakMap<SniperBar[], Feature[]>();
export function triadFeatures(bars:SniperBar[]):Feature[] {
 const found=cache.get(bars); if(found && found.length===bars.length)return found;
 const engine=createStructureEngine(bars,3),out:Feature[]=[]; let ema=bars[0]?.close||0,shockUntil=0;
 for(let i=0;i<bars.length;i++){
  const b=bars[i], duration=i>0&&b.time-bars[i-1].time<=3600?b.time-bars[i-1].time:(i+1<bars.length?Math.min(3600,bars[i+1].time-b.time):900);
  engine.step(i); ema=i?b.close*(2/201)+ema*(199/201):b.close;
  const trs:number[]=[]; for(let j=Math.max(1,i-20);j<i;j++){const x=bars[j],p=bars[j-1];trs.push(Math.max(x.high-x.low,Math.abs(x.high-p.close),Math.abs(x.low-p.close)));}
  const atr=trs.length?trs.reduce((a,v)=>a+v,0)/trs.length:0;
  const tr=i?Math.max(b.high-b.low,Math.abs(b.high-bars[i-1].close),Math.abs(b.low-bars[i-1].close)):b.high-b.low;
  if(trs.length>=20&&atr>0&&tr>=2.5*atr)shockUntil=Math.max(shockUntil,b.time+duration+1200);
  const window=bars.slice(Math.max(0,i-13),i+1), volumeOk=window.length===14&&window.every(x=>typeof x.volume==='number'&&Number.isFinite(x.volume)&&x.volume>0);
  const vol=volumeOk?window.reduce((a,x)=>a+x.volume!,0):0;
  const vwma=vol?window.reduce((a,x)=>a+x.close*x.volume!,0)/vol:null;
  out.push({trend:engine.state.trend,protectedLow:engine.state.PL,protectedHigh:engine.state.PH,ema,vwma,atr,shockUntil,duration});
 }
 cache.set(bars,out);return out;
}
/** A zone is eligible only after its formation candle and before its first touch/invalidation. */
export function firstRetest(bars:SniperBar[],idx:number,dir:1|-1):boolean {
 const b=bars[idx];for(let k=idx-1;k>=Math.max(2,idx-20);k--){
  const a=bars[k-2],c=bars[k];const step=bars[idx].time-bars[idx-1].time;if(bars[k-1].time-a.time!==step||c.time-bars[k-1].time!==step)continue;const low=dir===1?a.high:c.high,high=dir===1?c.low:a.low;
  if(!(high>low))continue;
  let valid=true;for(let j=k+1;j<idx;j++){const x=bars[j];if(x.time-bars[j-1].time!==step||(x.low<=high&&x.high>=low)||(dir===1?x.close<low:x.close>high)){valid=false;break;}}
  if(valid&&b.low<=high&&b.high>=low&&(dir===1?b.close>=low:b.close<=high))return true;
 }return false;
}
export function proposeTriad(bars:SniperBar[],idx:number,s:SniperSettings,state:SniperState):SniperPlan|null {
 if(idx<220||idx>=bars.length||s.executionType==='limit')return null;
 const b=bars[idx],f=triadFeatures(bars)[idx],date=new Date((b.time+f.duration)*1000).toISOString().slice(0,10);
 if(date===state.todayDate&&state.todayTradesCount>=s.maxTradesPerDay)return null;
 const session=getKillzoneSession(b.time+f.duration);if(s.sessionFilter==='killzone_only'&&!session.inKillzone)return null;if(s.sessionFilter==='overlap_only'&&session.priority!==1)return null;
 if(b.time+f.duration<f.shockUntil||f.vwma===null||f.atr<=0)return null;
 // Prevent a gap from being treated as a continuous 3-candle structure.
 if(idx>=2&&(b.time-bars[idx-1].time!==f.duration||bars[idx-1].time-bars[idx-2].time!==f.duration))return null;
 const dir:1|-1=f.trend===1?1:-1;if(!f.trend||(dir===1?b.close<=f.ema:b.close>=f.ema))return null;
 const swing=dir===1?f.protectedLow:f.protectedHigh;if(swing===null)return null;
 const retest=firstRetest(bars,idx,dir);
 const maReaction=dir===1?((b.low<=f.vwma&&b.close>f.vwma)||(b.low<=f.ema&&b.close>f.ema)):((b.high>=f.vwma&&b.close<f.vwma)||(b.high>=f.ema&&b.close<f.ema));
 if(!(retest||maReaction)||(dir===1?b.close<=b.open:b.close>=b.open))return null;
 const stop=Number((swing-dir*Math.max(.20,s.stopBufferAtr*f.atr)).toFixed(2));
 const ref=b.close+dir*s.spreadDollars/2,dist=dir*(ref-stop); if(dist<=0||dist>25)return null;
 const maxRisk=state.balance*Math.min(2,Math.max(.1,s.riskPct))/100;
 const requested=s.lotSizeMode==='fixed_lots'?s.fixedLots:Infinity;
 const lots=Math.floor(Math.min(requested,maxRisk/(dist*100))*100+1e-8)/100;
 if(lots<.01)return null;
 const target=Number((ref+dir*dist*Math.max(1,s.minRR)).toFixed(2));
 return {id:`triad-v2-${b.time}-${dir}`,direction:dir,signalIndex:idx,entryTime:b.time+f.duration,entry:Number(ref.toFixed(3)),stop,target,lots,riskDollars:Number((dist*lots*100).toFixed(2)),riskPctOfEquity:Number((100*dist*lots*100/state.balance).toFixed(2)),spreadCostDollars:Number((lots*100*s.spreadDollars).toFixed(2)),rr:Math.max(1,s.minRR),filledIndex:null,filledPrice:null,session:session.name,setupType:'INTERNAL_SCALP',targetLevelName:`${Math.max(1,s.minRR)}R research target`,reason:`Triad v2: ${dir===1?'bull':'bear'} No-Wick internal trend; 200 EMA aligned; ${retest?'first FVG retest':'VWMA/200 EMA reaction'}; directional close; protected swing stop; tick VWMA ${f.vwma.toFixed(2)}; EMA ${f.ema.toFixed(2)}; outlier guard clear`};
}
export function stepTriad(state:SniperState,bars:SniperBar[],s:SniperSettings):SniperState {
 const i=state.index+1;if(i>=bars.length)return {...state,status:'End of loaded history reached.'};
 const b=bars[i],f=triadFeatures(bars)[i],date=new Date(b.time*1000).toISOString().slice(0,10);let count=date===state.todayDate?state.todayTradesCount:0;
 let plan=state.activePlan?{...state.activePlan}:null,balance=state.balance,peak=state.peakBalance,outcomes=[...state.outcomes],status='Scanning: experimental Triad; outlier guard is not a CPI/PPI calendar.';
 if(plan){
  const dir=plan.direction,half=s.spreadDollars/2;
  if(plan.filledIndex===null){
   // No assumed executions across gaps: a missing bar cancels an unfilled setup.
   if(b.time!==bars[i-1].time+f.duration){status='Pending market order cancelled across a data gap.';plan=null;}
   else {
    const fill=b.open+dir*half,dist=dir*(fill-plan.stop),cap=balance*Math.min(2,Math.max(.1,s.riskPct))/100;
    const qty=dist>0?Math.floor(Math.min(plan.lots,cap/(dist*100))*100+1e-8)/100:0;
    if(qty<.01||dist>25){status='Order cancelled: stop or risk invalid at next open.';plan=null;}
    else {plan.entry=fill;plan.filledPrice=fill;plan.filledIndex=i;plan.lots=qty;plan.riskDollars=dist*qty*100;plan.riskPctOfEquity=100*plan.riskDollars/balance;plan.spreadCostDollars=qty*100*s.spreadDollars;plan.target=Number((fill+dir*dist*plan.rr).toFixed(3));count++;status='Market entry at next open; SL/TP checked on entry candle.';}
   }
  }
  if(plan&&plan.filledIndex!==null){
   const d=plan.direction,open=b.open-d*half,low=b.low-d*half,high=b.high-d*half;
   const stopHit=d===1?low<=plan.stop:high>=plan.stop,targetHit=d===1?high>=plan.target:low<=plan.target;
   const gapStop=d===1?open<=plan.stop:open>=plan.stop,gapTarget=d===1?open>=plan.target:open<=plan.target;
   if(stopHit||targetHit){
    const ambiguous=stopHit&&targetHit&&!gapStop&&!gapTarget;
    const exit=gapStop?open:gapTarget?plan.target:(stopHit?plan.stop:plan.target);
    const dollars=d*(exit-plan.entry)*plan.lots*100;balance+=dollars;peak=Math.max(peak,balance);
    const o:SniperOutcome={id:plan.id,direction:d,signalIndex:plan.signalIndex,entryIndex:plan.filledIndex,exitIndex:i,entryTime:plan.entryTime,exitTime:b.time,entryPrice:plan.entry,exitPrice:exit,stopPrice:plan.stop,targetPrice:plan.target,lots:plan.lots,outcome:ambiguous?'ambiguous':dollars>0?'win':'loss',netR:plan.riskDollars?dollars/plan.riskDollars:0,netDollars:dollars,spreadPaid:plan.spreadCostDollars,balanceAfter:balance,session:plan.session,reason:plan.reason};
    outcomes.push(o);status=ambiguous?'Ambiguous SL/TP bar: conservative stop assumed.':`Exit ${dollars>=0?'profit':'loss'} $${dollars.toFixed(2)} (estimated bid/ask).`;plan=null;
   }
  }
 }
 const dd=peak>0?Math.max(0,(peak-balance)/peak*100):0;
 const interim:SniperState={index:i,balance,peakBalance:peak,currentDrawdownPct:dd,maxDrawdownPct:Math.max(state.maxDrawdownPct,dd),activePlan:plan,outcomes,todayDate:date,todayTradesCount:count,status};
 if(!plan&&balance>0){const p=proposeTriad(bars,i,s,interim);if(p){interim.activePlan=p;interim.status=p.reason;}}
 return interim;
}
