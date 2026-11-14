/** Causal research replay. OHLC data cannot establish the order of intrabar touches. */
export type ReplayBar={time:number;open:number;high:number;low:number;close:number};
export type ReplayZone={created:number;top:number;bottom:number;direction:number;status:string};
export type ReplayResult={ready:boolean;bull:number|null;bear:number|null;net:number|null;atr:number|null;htf:number;mtf:number;ltf:number;break:string;sweep:string;zones:ReplayZone[]};
export type ReplaySettings={threshold:number;rr:number;stopAtr:number;expiry:number;hold:number;cost:number};
export type Plan={direction:1|-1;signal:number;zone:ReplayZone;entry:number;stop:number;target:number;risk:number;filled:number|null};
export type Outcome={direction:1|-1;signal:number;end:number;entry:number;stop:number;target:number;outcome:'win'|'loss'|'ambiguous'|'gap'|'timeout'|'cancelled';netR:number|null};
export type ReplayState={index:number;plan:Plan|null;outcomes:Outcome[];status:string};
export const replayDefaults:ReplaySettings={threshold:65,rr:1.5,stopAtr:.25,expiry:10,hold:30,cost:0};
export function initialReplay(index:number):ReplayState{return {index,plan:null,outcomes:[],status:'Replay ready. The first plan is evaluated at the chosen candle close.'};}
export function propose(bar:ReplayBar,r:ReplayResult,index:number,s:ReplaySettings,bars:ReplayBar[]):Plan|null{
 if(!r.ready||!r.atr||r.atr<=0||r.bull===null||r.bear===null||r.net===null)return null;
 const dir:1|-1=r.bull>=s.threshold&&r.net>=15?1:r.bear>=s.threshold&&r.net<=-15?-1:0 as never;if(!dir)return null;
 // Only intact, still-unfilled gaps; enter at the near edge on a subsequent touch.
 const zones=r.zones.filter(z=>z.direction===dir&&z.status==='fresh'&&z.created<=index&&z.created>=2&&(dir===1?bars[z.created-1].close>bars[z.created-1].open:bars[z.created-1].close<bars[z.created-1].open)&&(dir===1?bar.close>z.top:bar.close<z.bottom));
 const zone=zones.sort((a,b)=>Math.abs((dir===1?a.top:a.bottom)-bar.close)-Math.abs((dir===1?b.top:b.bottom)-bar.close))[0];if(!zone)return null;
 const entry=dir===1?zone.top:zone.bottom,stop=(dir===1?zone.bottom:zone.top)-dir*r.atr*s.stopAtr,risk=dir*(entry-stop);
 if(!Number.isFinite(risk)||risk<=0)return null;return {direction:dir,signal:index,zone:{...zone},entry,stop,target:entry+dir*risk*s.rr,risk,filled:null};
}
export function stepReplay(state:ReplayState,bars:ReplayBar[],results:ReplayResult[],minutes:number,s:ReplaySettings):ReplayState{
 const i=state.index+1;if(i>=bars.length)return state;
 const c=bars[i],prev=bars[i-1];let plan=state.plan,history=state.outcomes,status='No qualifying fresh FVG and directional confluence.';
 const finish=(outcome:Outcome['outcome'],netR:number|null)=>{if(!plan)return;history=[...history,{direction:plan.direction,signal:plan.signal,end:i,entry:plan.entry,stop:plan.stop,target:plan.target,outcome,netR}];plan=null;};
 if(plan){
  if(c.time-prev.time!==minutes*60){status='Excluded: missing bars / market gap while a plan was active.';finish('gap',null);}
  else if(plan.filled===null){
   const p=plan,invalid=results[i].net!==null&&p.direction*(results[i].net as number)<=-15;
   // A gap through a limit can execute at a different price; never assume an edge fill.
   const gapThrough=p.direction===1?c.open<p.entry:c.open>p.entry;
   const touched=p.direction===1?c.low<=p.entry:c.high>=p.entry;
   if(gapThrough){status='Excluded: candle opened beyond the entry; fill price is unknown.';finish('gap',null);}
   else if(touched){
    const stop=p.direction===1?c.low<=p.stop:c.high>=p.stop,target=p.direction===1?c.high>=p.target:c.low<=p.target;
    if(stop||target){status='Excluded: entry and exit touched on the same candle; sequence is unknown.';finish('ambiguous',null);}
    else{plan={...p,filled:i};status='Limit touched; simulated position is open.';}
   }else if(i-p.signal>=s.expiry||invalid){status=invalid?'Pending setup cancelled after an opposing score.':'Pending setup expired.';finish('cancelled',null);}else status='Waiting for the limit entry.';
  }else{
   const p=plan,stop=p.direction===1?c.low<=p.stop:c.high>=p.stop,target=p.direction===1?c.high>=p.target:c.low<=p.target;
   // Opens beyond exits do not have an observable executable price.
   if(c.open<=Math.min(p.stop,p.target)||c.open>=Math.max(p.stop,p.target)){status='Excluded: opened beyond an exit; execution price is unknown.';finish('gap',null);}
   else if(stop&&target){status='Excluded: stop and target both touched in one candle.';finish('ambiguous',null);}
   else if(stop||target){const won=target;status=won?'Target reached.':'Stop reached.';finish(won?'win':'loss',(won?s.rr:-1)-s.cost/p.risk);}
   else if(i-(p.filled as number)>=s.hold){status='Excluded: trade unresolved at the holding limit.';finish('timeout',null);}else status='Simulated position is open.';
  }
 }
 // Do not use a bar's high/low to fill a new plan made at the same bar's close.
 if(!plan){const next=propose(c,results[i],i,s,bars);if(next){plan=next;status+=' New limit setup created at this close.';}}
 return {index:i,plan,outcomes:history,status};
}
export function seedReplay(index:number,bars:ReplayBar[],results:ReplayResult[],settings:ReplaySettings):ReplayState{
 const state=initialReplay(index),plan=propose(bars[index],results[index],index,settings,bars);return {...state,plan,status:plan?'Initial limit setup created at the selected close.':state.status};
}
