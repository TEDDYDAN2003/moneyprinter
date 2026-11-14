import {createStructureEngine} from './marketStructure';
/** Point-in-time research. Historical group labels must not be used as pre-touch signals. */
export type QuickBar={time:number;open:number;high:number;low:number;close:number};
export type StudyOptions={atrLength:number;zoneLife:number;minGapATR:number;requireMid:boolean;showBull:boolean;showBear:boolean};
export type QuickParams={rr:number;stop:'swing'|'fvg'|'atr'|'protected'|'retest';buffer:number;atrStop:number;swingLength:number;externalLength:number;horizon:number;lookback:number;displacement:'all'|'low'|'medium'|'high';mss:'all'|'only'|'exclude';cost:number;spread:number;slippage:number;target:'rr'|'swing'};
export type QuickOutcome='win'|'loss'|'ambiguous'|'gap'|'timeout'|'open'|'no-stop'|'no-target'|'no-confirmation'|'waiting';
export type Scenario={mode:'touch'|'confirmation';outcome:QuickOutcome;entry:number|null;stop:number|null;target:number|null;rrTarget:number|null;obstacle:number|null;obstacleBeforeTarget:boolean;risk:number|null;rewardR:number|null;cost:number;netR:number|null;stopReason:string;entryIndex:number|null;stopOptions:{fvg:number|null;retest:number|null;protected:number|null;swing:number|null;atr:number|null}};
export type QuickZone={id:number;created:number;end:number;direction:1|-1;top:number;bottom:number;atr:number|null;gapAtr:number|null;displacement:number|null;displacementClass:'low'|'medium'|'high'|'unknown';mss:boolean;priorTrend:number;formationInternal:number;formationExternal:number;middleBreak:string;touch:number|null;event:'grab'|'sweep'|null;reaction:'inside'|'rejection'|'invalidation'|null;depth:number|null;closePosition:number|null;reactionBodyAtr:number|null;reactionUpperAtr:number|null;reactionLowerAtr:number|null;reactionCloseRange:number|null;retestInternal:number|null;retestExternal:number|null;protectedBreak:boolean;externalProtectedBreak:boolean;age:number;touchEpisodes:number;approachAtr:number|null;efficiency:number|null;rangeLow:number|null;rangeHigh:number|null;entry:number|null;stop:number|null;target:number|null;outcome:QuickOutcome|null;netR:number|null;touchScenario:Scenario|null;confirmationScenario:Scenario|null;preview:Scenario|null;shiftOutcome:'with'|'against'|'ambiguous'|'gap'|'open'|null;shiftEnd:number|null};
export const quickDefaults:QuickParams={rr:1.5,stop:'swing',buffer:.1,atrStop:1,swingLength:3,externalLength:10,horizon:30,lookback:5000,displacement:'all',mss:'all',cost:0,spread:0,slippage:0,target:'rr'};
export const defaultStudy:StudyOptions={atrLength:14,zoneLife:100,minGapATR:0,requireMid:true,showBull:true,showBear:true};
export function runFvgQuick(bars:QuickBar[],asOf:number,minutes:number,p:QuickParams,study:StudyOptions){
 const last=Math.min(asOf,bars.length-1);if(last<0)return {zones:[] as QuickZone[],first:0,last};
 const first=Math.max(0,last-p.lookback+1),n=last+1,atr=new Array<number|null>(n).fill(null),hi=new Array<number|null>(n).fill(null),lo=new Array<number|null>(n).fill(null),protectedLow=new Array<number|null>(n).fill(null),protectedHigh=new Array<number|null>(n).fill(null),trend=new Int8Array(n),extTrend=new Int8Array(n),shift=new Int8Array(n),extShift=new Int8Array(n),breakDir=new Int8Array(n),breakKind=new Array<string>(n).fill(''),prevTrend=new Int8Array(n);let seed=0,a:number|null=null;
 const length=Math.max(1,Math.floor(study.atrLength)),structure=createStructureEngine(bars,Math.max(1,Math.floor(p.swingLength))),external=createStructureEngine(bars,Math.max(2,Math.floor(p.externalLength||10))),span=minutes*60;
 for(let i=0;i<=last;i++){
  const c=bars[i],prev=bars[i-1],tr=prev?Math.max(c.high-c.low,Math.abs(c.high-prev.close),Math.abs(c.low-prev.close)):c.high-c.low;
  if(i<length){seed+=tr;if(i===length-1)a=seed/length;}else if(a!==null)a=(a*(length-1)+tr)/length;atr[i]=a;
  const event=structure.step(i),state=structure.state;const externalEvent=external.step(i);extShift[i]=externalEvent.shift;prevTrend[i]=event.priorTrend;shift[i]=event.shift;trend[i]=state.trend;extTrend[i]=external.state.trend;hi[i]=state.hi;lo[i]=state.lo;protectedLow[i]=state.PL;protectedHigh[i]=state.PH;breakKind[i]=event.kind;if(event.kind)breakDir[i]=state.trend;
 }
 const zones:QuickZone[]=[],active:QuickZone[]=[];
 function scenario(z:QuickZone,touch:number,mode:'touch'|'confirmation'):Scenario{
  const c=bars[touch],d=z.direction,entryIndex=mode==='touch'?touch:touch+1,known=mode==='touch'?touch-1:touch,cost=p.cost+p.spread+2*p.slippage;
  const v:Scenario={mode,outcome:'waiting',entry:null,stop:null,target:null,rrTarget:null,obstacle:null,obstacleBeforeTarget:false,risk:null,rewardR:null,cost,netR:null,stopReason:'',entryIndex:null,stopOptions:{fvg:null,retest:null,protected:null,swing:null,atr:null}};
  if(mode==='confirmation'){
   const mid=(z.top+z.bottom)/2,confirm=z.reaction!=='invalidation'&&(d===1?c.close>c.open&&c.close>=mid:c.close<c.open&&c.close<=mid);
   if(!confirm){v.outcome='no-confirmation';return v;}if(entryIndex>last)return v;
   if(bars[entryIndex].time-c.time!==span){v.outcome='gap';return v;}
  }
  const entry=mode==='touch'?(d===1?z.top:z.bottom):bars[entryIndex].open;v.entry=entry;v.entryIndex=entryIndex;
  const priorStop=d===1?lo[known]:hi[known],prot=d===1?protectedLow[known]:protectedHigh[known],tatr=atr[known];
  v.stopOptions={fvg:(d===1?z.bottom:z.top)-d*p.buffer,retest:mode==='confirmation'?(d===1?c.low:c.high)-d*p.buffer:null,protected:prot===null?null:prot-d*p.buffer,swing:priorStop===null?null:priorStop-d*p.buffer,atr:tatr===null?null:entry-d*(tatr*p.atrStop+p.buffer)};
  let stop:number|null=null;
  if(p.stop==='swing'){stop=priorStop===null?null:priorStop-d*p.buffer;v.stopReason='Previous confirmed swing ± buffer';}
  else if(p.stop==='protected'){stop=prot===null?null:prot-d*p.buffer;v.stopReason='Protected structure level ± buffer';}
  else if(p.stop==='retest'){stop=mode==='confirmation'?(d===1?c.low:c.high)-d*p.buffer:null;v.stopReason=mode==='confirmation'?'Retest extreme ± buffer':'Retest extreme is unknown at touch';}
  else if(p.stop==='fvg'){stop=(d===1?z.bottom:z.top)-d*p.buffer;v.stopReason='Far FVG edge ± buffer';}
  else {stop=tatr===null?null:entry-d*(tatr*p.atrStop+p.buffer);v.stopReason='ATR distance + buffer';}
  v.stop=stop;if(stop===null||!Number.isFinite(stop)||d*(entry-stop)<=0){v.outcome='no-stop';return v;}const risk=d*(entry-stop);v.risk=risk;v.rrTarget=entry+d*risk*p.rr;
  const obstacle=d===1?hi[known]:lo[known];v.obstacle=obstacle!==null&&d*(obstacle-entry)>0?obstacle:null;v.obstacleBeforeTarget=v.obstacle!==null&&d*(v.obstacle-v.rrTarget)<0;
  v.target=p.target==='swing'?v.obstacle:v.rrTarget;if(v.target===null){v.outcome='no-target';return v;}const target=v.target;v.rewardR=d*(target-entry)/risk;
  if(mode==='touch'&&(d===1?c.open<entry:c.open>entry)){v.outcome='gap';return v;}
  const first=bars[entryIndex],firstStop=d===1?first.low<=stop:first.high>=stop,firstTarget=d===1?first.high>=target:first.low<=target;
  if(firstStop||firstTarget){if(mode==='touch'||firstStop&&firstTarget)v.outcome='ambiguous';else{v.outcome=firstTarget?'win':'loss';v.netR=(firstTarget?v.rewardR:-1)-cost/risk;}return v;}
  v.outcome='open';for(let j=entryIndex+1;j<=Math.min(last,entryIndex+p.horizon);j++){
   const x=bars[j];if(x.time-bars[j-1].time!==span||x.open<=Math.min(stop,target)||x.open>=Math.max(stop,target)){v.outcome='gap';break;}
   const sl=d===1?x.low<=stop:x.high>=stop,tp=d===1?x.high>=target:x.low<=target;
   if(sl&&tp){v.outcome='ambiguous';break;}if(sl||tp){v.outcome=tp?'win':'loss';v.netR=(tp?v.rewardR:-1)-cost/risk;break;}if(j-entryIndex>=p.horizon)v.outcome='timeout';
  }return v;
 }
 for(let i=Math.max(2,first);i<=last;i++){
  const c=bars[i],isGap=bars[i].time-bars[i-1].time!==span;if(isGap){for(const z of active)z.end=i-1;active.length=0;}
  for(let k=active.length-1;k>=0;k--){const z=active[k];z.end=i;if(i-z.created>study.zoneLife){z.end=i-1;active.splice(k,1);continue;}
   const touch=c.low<=z.top&&c.high>=z.bottom,beyond=z.direction===1?c.close<z.bottom:c.close>z.top;
   if(!touch&&beyond){z.end=i;active.splice(k,1);continue;}if(!touch)continue;
   const d=z.direction,height=z.top-z.bottom,r=c.high-c.low,tatr=atr[i];z.touch=i;z.event=(d===1?c.close<=z.top:c.close>=z.bottom)?'grab':'sweep';
   z.reaction=d===1?(c.close<z.bottom?'invalidation':c.close>z.top?'rejection':'inside'):(c.close>z.top?'invalidation':c.close<z.bottom?'rejection':'inside');
   z.depth=Math.max(0,Math.min(1,d===1?(z.top-c.low)/height:(c.high-z.bottom)/height));z.closePosition=d===1?(z.top-c.close)/height:(c.close-z.bottom)/height;
   z.reactionBodyAtr=tatr&&tatr>0?Math.abs(c.close-c.open)/tatr:null;z.reactionUpperAtr=tatr&&tatr>0?(c.high-Math.max(c.open,c.close))/tatr:null;z.reactionLowerAtr=tatr&&tatr>0?(Math.min(c.open,c.close)-c.low)/tatr:null;z.reactionCloseRange=r>0?(c.close-c.low)/r:null;
   z.retestInternal=trend[i];z.retestExternal=extTrend[i];for(let x=z.created+1;x<=i;x++){if(shift[x])z.protectedBreak=true;if(extShift[x])z.externalProtectedBreak=true;}
   z.age=i-z.created;z.touchEpisodes=1;
   if(i>=5&&bars[i].time-bars[i-5].time===5*span&&atr[i-1]&&atr[i-1]!>0)z.approachAtr=d*(bars[i-5].close-bars[i-1].close)/atr[i-1]!;
   if(i>=20&&bars[i].time-bars[i-20].time===20*span){let path=0;for(let x=i-19;x<=i;x++)path+=Math.abs(bars[x].close-bars[x-1].close);z.efficiency=path>0?Math.abs(c.close-bars[i-20].close)/path:0;z.rangeLow=Math.min(...bars.slice(i-19,i+1).map(x=>x.low));z.rangeHigh=Math.max(...bars.slice(i-19,i+1).map(x=>x.high));}
   z.touchScenario=scenario(z,i,'touch');z.confirmationScenario=scenario(z,i,'confirmation');z.entry=z.touchScenario.entry;z.stop=z.touchScenario.stop;z.target=z.touchScenario.target;z.outcome=z.touchScenario.outcome;z.netR=z.touchScenario.netR;active.splice(k,1);
  }
  if(isGap||bars[i-1].time-bars[i-2].time!==span)continue;
  const old=bars[i-2],mid=bars[i-1];let dir:1|-1|0=0,top=0,bottom=0;
  if(c.low>old.high&&(!study.requireMid||mid.close>mid.open)){dir=1;top=c.low;bottom=old.high;}else if(c.high<old.low&&(!study.requireMid||mid.close<mid.open)){dir=-1;top=old.low;bottom=c.high;}
  if(!dir||study.minGapATR>0&&(atr[i]===null||top-bottom<study.minGapATR*(atr[i] as number)))continue;
  const m=atr[i-1],disp=m&&m>0?Math.abs(mid.close-mid.open)/m:null,category=disp===null?'unknown':disp<1?'low':disp<1.5?'medium':'high',mss=shift[i-1]===dir||shift[i]===dir;
  const z:QuickZone={id:c.time,created:i,end:i,direction:dir,top,bottom,atr:atr[i],gapAtr:atr[i]&&atr[i]!>0?(top-bottom)/atr[i]!:null,displacement:disp,displacementClass:category,mss,priorTrend:mss?(shift[i-1]===dir?prevTrend[i-1]:prevTrend[i]):trend[i],formationInternal:trend[i],formationExternal:extTrend[i],middleBreak:breakKind[i-1]?`${breakDir[i-1]===1?'Bullish':'Bearish'} ${breakKind[i-1].toUpperCase()}`:'None',touch:null,event:null,reaction:null,depth:null,closePosition:null,reactionBodyAtr:null,reactionUpperAtr:null,reactionLowerAtr:null,reactionCloseRange:null,retestInternal:null,retestExternal:null,protectedBreak:false,externalProtectedBreak:false,age:last-i,touchEpisodes:0,approachAtr:null,efficiency:null,rangeLow:null,rangeHigh:null,entry:null,stop:null,target:null,outcome:null,netR:null,touchScenario:null,confirmationScenario:null,preview:null,shiftOutcome:null,shiftEnd:null};zones.push(z);active.push(z);
 }
 // Provisional plan uses only levels known at the selected close; no fill or outcome is assumed.
 for(const z of active){const d=z.direction,entry=d===1?z.top:z.bottom,prior=d===1?lo[last]:hi[last],prot=d===1?protectedLow[last]:protectedHigh[last],tatr=atr[last],cost=p.cost+p.spread+2*p.slippage,opts={fvg:(d===1?z.bottom:z.top)-d*p.buffer,retest:null,protected:prot===null?null:prot-d*p.buffer,swing:prior===null?null:prior-d*p.buffer,atr:tatr===null?null:entry-d*(tatr*p.atrStop+p.buffer)};
  const stop=opts[p.stop],reason=p.stop==='retest'?'Retest extreme is unknown before touch':p.stop==='fvg'?'Far FVG edge ± buffer':p.stop==='swing'?'Previous confirmed swing ± buffer':p.stop==='protected'?'Protected structure level ± buffer':'ATR distance + buffer',risk=stop!==null&&d*(entry-stop)>0?d*(entry-stop):null,rrTarget=risk!==null?entry+d*risk*p.rr:null,ob=d===1?hi[last]:lo[last],obstacle=ob!==null&&d*(ob-entry)>0?ob:null,target=p.target==='swing'?obstacle:rrTarget;
  z.preview={mode:'touch',outcome:risk===null?'no-stop':target===null?'no-target':'waiting',entry,stop,target,rrTarget,obstacle,obstacleBeforeTarget:obstacle!==null&&rrTarget!==null&&d*(obstacle-rrTarget)<0,risk,rewardR:risk!==null&&target!==null?d*(target-entry)/risk:null,cost,netR:null,stopReason:reason,entryIndex:null,stopOptions:opts};
 }
 for(const z of zones){if(!z.mss||!z.atr||z.atr<=0)continue;const b=bars[z.created],d=z.direction,up=b.close+z.atr,down=b.close-z.atr;z.shiftOutcome='open';for(let j=z.created+1;j<=Math.min(last,z.created+p.horizon);j++){const c=bars[j];if(c.time-bars[j-1].time!==span){z.shiftOutcome='gap';z.shiftEnd=j;break;}const u=c.high>=up,l=c.low<=down;if(u&&l){z.shiftOutcome='ambiguous';z.shiftEnd=j;break;}if(u||l){z.shiftOutcome=(u&&d===1||l&&d===-1)?'with':'against';z.shiftEnd=j;break;}}}
 return {zones,first,last};
}
export function quickFiltered(zones:QuickZone[],p:QuickParams){return zones.filter(z=>(p.displacement==='all'||z.displacementClass===p.displacement)&&(p.mss==='all'||(p.mss==='only'?z.mss:!z.mss)));}
