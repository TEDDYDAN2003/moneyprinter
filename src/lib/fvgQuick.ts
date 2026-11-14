import {createStructureEngine} from './marketStructure';
/** Point-in-time FVG research. Every outcome is bounded by `asOf`. */
export type QuickBar={time:number;open:number;high:number;low:number;close:number};
export type StudyOptions={atrLength:number;zoneLife:number;minGapATR:number;requireMid:boolean;showBull:boolean;showBear:boolean};
export type QuickParams={rr:number;stop:'swing'|'fvg'|'atr';buffer:number;atrStop:number;swingLength:number;horizon:number;lookback:number;displacement:'all'|'low'|'medium'|'high';mss:'all'|'only'|'exclude';cost:number};
export type QuickOutcome='win'|'loss'|'ambiguous'|'gap'|'timeout'|'open'|'no-stop';
export type QuickZone={id:number;created:number;end:number;direction:1|-1;top:number;bottom:number;atr:number|null;displacement:number|null;displacementClass:'low'|'medium'|'high'|'unknown';mss:boolean;priorTrend:number;touch:number|null;event:'grab'|'sweep'|null;outcome:QuickOutcome|null;entry:number|null;stop:number|null;target:number|null;netR:number|null;shiftOutcome:'with'|'against'|'ambiguous'|'gap'|'open'|null;shiftEnd:number|null};
export const quickDefaults:QuickParams={rr:1.5,stop:'swing',buffer:0.1,atrStop:1,swingLength:3,horizon:30,lookback:5000,displacement:'all',mss:'all',cost:0};
export const defaultStudy:StudyOptions={atrLength:14,zoneLife:100,minGapATR:0,requireMid:true,showBull:true,showBear:true};
export function runFvgQuick(bars:QuickBar[],asOf:number,minutes:number,p:QuickParams,study:StudyOptions){
 const last=Math.min(asOf,bars.length-1);if(last<0)return {zones:[] as QuickZone[],first:0,last};
 const first=Math.max(0,last-p.lookback+1),n=last+1,atr=new Array<number|null>(n).fill(null),hi=new Array<number|null>(n).fill(null),lo=new Array<number|null>(n).fill(null),trend=new Int8Array(n),shift=new Int8Array(n),prevTrend=new Int8Array(n);let seed=0,a:number|null=null;
 const length=Math.max(1,Math.floor(study.atrLength)),len=Math.max(1,Math.floor(p.swingLength)),structure=createStructureEngine(bars,len);
 // Include all available prefix for ATR and confirmed pivots; never inspect a future bar.
 for(let i=0;i<=last;i++){
  const c=bars[i],prev=bars[i-1];const tr=prev?Math.max(c.high-c.low,Math.abs(c.high-prev.close),Math.abs(c.low-prev.close)):c.high-c.low;
  if(i<length){seed+=tr;if(i===length-1)a=seed/length;}else if(a!==null)a=(a*(length-1)+tr)/length;atr[i]=a;
  const event=structure.step(i),state=structure.state;prevTrend[i]=event.priorTrend;shift[i]=event.shift;trend[i]=state.trend;hi[i]=state.hi;lo[i]=state.lo;
 }
 const zones:QuickZone[]=[],active:QuickZone[]=[];const span=minutes*60;
 for(let i=Math.max(2,first);i<=last;i++){
  const c=bars[i],isGap=bars[i].time-bars[i-1].time!==span;
  if(isGap){for(const z of active)z.end=i-1;active.length=0;}
  for(let k=active.length-1;k>=0;k--){const z=active[k];z.end=i;if(i-z.created>study.zoneLife){z.end=i-1;active.splice(k,1);continue;}
   const touch=c.low<=z.top&&c.high>=z.bottom,beyond=z.direction===1?c.close<z.bottom:c.close>z.top;
   if(!touch&&beyond){z.end=i;active.splice(k,1);continue;}if(!touch)continue;
   z.touch=i;z.event=(z.direction===1?c.close<=z.top:c.close>=z.bottom)?'grab':'sweep';active.splice(k,1);
   const d=z.direction,entry=d===1?z.top:z.bottom,priorStop=d===1?lo[i-1]:hi[i-1],tatr=atr[i-1];z.entry=entry;
   const stop=p.stop==='swing'?(priorStop===null?null:priorStop-d*p.buffer):p.stop==='fvg'?(d===1?z.bottom:z.top)-d*p.buffer:(tatr===null?null:entry-d*(tatr*p.atrStop+p.buffer));
   if(stop===null||!Number.isFinite(stop)||d*(entry-stop)<=0){z.outcome='no-stop';continue;}z.stop=stop;const risk=d*(entry-stop),target=entry+d*risk*p.rr;z.target=target;
   if(d===1?c.open<entry:c.open>entry){z.outcome='gap';continue;}
   const entryStop=d===1?c.low<=stop:c.high>=stop,entryTarget=d===1?c.high>=target:c.low<=target;if(entryStop||entryTarget){z.outcome='ambiguous';continue;}
   z.outcome='open';for(let j=i+1;j<=Math.min(last,i+p.horizon);j++){
    const x=bars[j];if(x.time-bars[j-1].time!==span||x.open<=Math.min(stop,target)||x.open>=Math.max(stop,target)){z.outcome='gap';break;}
    const sl=d===1?x.low<=stop:x.high>=stop,tp=d===1?x.high>=target:x.low<=target;
    if(sl&&tp){z.outcome='ambiguous';break;}if(sl||tp){z.outcome=tp?'win':'loss';z.netR=(tp?p.rr:-1)-p.cost/risk;break;}if(j-i>=p.horizon)z.outcome='timeout';
   }
  }
  if(isGap||bars[i-1].time-bars[i-2].time!==span)continue;
  const old=bars[i-2],mid=bars[i-1];let dir:1|-1|0=0,top=0,bottom=0;
  if(c.low>old.high&&(!study.requireMid||mid.close>mid.open)){dir=1;top=c.low;bottom=old.high;}else if(c.high<old.low&&(!study.requireMid||mid.close<mid.open)){dir=-1;top=old.low;bottom=c.high;}
  if(!dir||study.minGapATR>0&&(atr[i]===null||top-bottom<study.minGapATR*(atr[i] as number)))continue;
  const m=atr[i-1],disp=m&&m>0?Math.abs(mid.close-mid.open)/m:null,category=disp===null?'unknown':disp<1?'low':disp<1.5?'medium':'high',mss=shift[i-1]===dir||shift[i]===dir;
  const z:QuickZone={id:c.time,created:i,end:i,direction:dir,top,bottom,atr:atr[i],displacement:disp,displacementClass:category,mss,priorTrend:mss?(shift[i-1]===dir?prevTrend[i-1]:prevTrend[i]):trend[i],touch:null,event:null,outcome:null,entry:null,stop:null,target:null,netR:null,shiftOutcome:null,shiftEnd:null};zones.push(z);active.push(z);
 }
 // Descriptive MSS follow-through: direction ±1 formation ATR, first hit over horizon.
 for(const z of zones){if(!z.mss||!z.atr||z.atr<=0)continue;const b=bars[z.created],d=z.direction,up=b.close+z.atr,down=b.close-z.atr;z.shiftOutcome='open';for(let j=z.created+1;j<=Math.min(last,z.created+p.horizon);j++){const c=bars[j];if(c.time-bars[j-1].time!==span){z.shiftOutcome='gap';z.shiftEnd=j;break;}const u=c.high>=up,l=c.low<=down;if(u&&l){z.shiftOutcome='ambiguous';z.shiftEnd=j;break;}if(u||l){z.shiftOutcome=(u&&d===1||l&&d===-1)?'with':'against';z.shiftEnd=j;break;}}}
 return {zones,first,last};
}
export function quickFiltered(zones:QuickZone[],p:QuickParams){return zones.filter(z=>(p.displacement==='all'||z.displacementClass===p.displacement)&&(p.mss==='all'||(p.mss==='only'?z.mss:!z.mss)));}
