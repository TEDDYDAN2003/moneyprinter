import React from "react";
type Candle=[number,number,number,number];
type Variant="impulsive"|"corrective"|"choppy"|"rejection"|"sweep"|"acceptance"|"bull-acceptance"|"combined";
const data:Record<Variant,{candles:Candle[];zone:[number,number];title:string;prior?:number;highlight?:number;exit?:number;channel?:boolean;plan?:boolean}>= {
 impulsive:{title:"Fast move into demand, then reaction",zone:[40,50],candles:[[83,87,79,82],[82,83,70,72],[72,73,57,59],[59,60,42,54],[54,66,52,64],[64,74,62,72]],highlight:3},
 corrective:{title:"Corrective channel into demand",zone:[40,50],candles:[[80,82,73,74],[74,78,70,76],[76,77,66,68],[68,72,64,71],[71,72,61,63],[63,67,59,66],[66,67,54,56],[56,60,52,59],[59,60,43,47],[47,55,44,54],[54,64,53,62]],highlight:8,channel:true},
 choppy:{title:"Choppy approach followed by breakdown",zone:[40,50],candles:[[69,71,60,62],[62,65,56,58],[58,62,53,60],[60,62,55,56],[56,61,54,59],[59,60,52,54],[54,58,52,56],[56,57,50,52],[52,54,36,38],[38,44,34,36]],exit:8},
 rejection:{title:"Upper-wick rejection at supply",zone:[70,80],candles:[[44,52,43,50],[50,59,49,57],[57,66,56,64],[64,78,62,67],[67,76,65,72],[72,74,55,57]],highlight:3},
 sweep:{title:"Sweep of an internal high in supply",zone:[70,80],candles:[[44,52,43,50],[50,59,49,57],[57,67,56,65],[65,74,64,72],[72,73,65,67],[67,78,66,72],[72,73,64,66]],prior:74,highlight:5,exit:6},
 acceptance:{title:"Bearish exit from supply",zone:[70,80],candles:[[44,52,43,50],[50,59,49,57],[57,67,56,65],[65,74,64,72],[72,76,69,71],[71,72,62,64],[64,66,54,56]],exit:5},
 "bull-acceptance":{title:"Bullish exit from demand",zone:[40,50],candles:[[80,82,73,74],[74,76,65,67],[67,68,56,58],[58,59,45,47],[47,49,42,46],[46,57,45,56],[56,66,54,64]],exit:5},
 combined:{title:"Sweep + rejection + exit from demand",zone:[40,50],candles:[[82,90,78,80],[80,81,67,69],[69,70,55,57],[57,58,45,48],[48,49,42,47],[47,57,46,56],[56,68,54,66],[66,76,64,74]],prior:45,highlight:4,exit:5,plan:true},
};
const x=(i:number)=>150+i*52;const y=(p:number)=>425-p*4;
export function CoursePriceBehaviourChart({variant}:{variant:Variant}) {
 const d=data[variant], [bottom,top]=d.zone;
 return <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080e16]" tabIndex={0} aria-label="Scrollable price behaviour chart"><svg viewBox="0 0 960 465" role="img" aria-label={`${d.title}. A pre-marked price zone spans ${bottom} to ${top}; ${d.prior?`prior swing at ${d.prior}; `:""}candles and any subsequent response are hypothetical.`} className="h-auto w-full min-w-[760px]">
 <rect width="960" height="465" rx="12" fill="#080e16"/>{[20,40,60,80].map(p=><line key={p} x1="85" x2="895" y1={y(p)} y2={y(p)} stroke="#1e293b" strokeDasharray="3 7"/>)}<text x="35" y="34" fill="#e2e8f0" fontWeight="700" fontSize="14">{d.title}</text>
 <rect x="90" y={y(top)} width="710" height={y(bottom)-y(top)} fill="#a78bfa" fillOpacity=".13" stroke="#a78bfa" strokeOpacity=".6"/><text x="805" y={y(top)+15} fill="#c4b5fd" fontSize="12">{bottom===40?"Demand":"Supply"} {bottom}–{top}</text>
 {d.prior && <><line x1="260" x2="780" y1={y(d.prior)} y2={y(d.prior)} stroke="#fbbf24" strokeDasharray="5 5"/><text x="705" y={y(d.prior)-8} fill="#fde68a" fontSize="12">Prior {bottom===40?"low":"high"} {d.prior}</text></>}
 {d.channel && <><path d={`M ${x(0)-15} ${y(85)} L ${x(7)+15} ${y(61)} M ${x(0)-15} ${y(72)} L ${x(7)+15} ${y(48)}`} stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="6 5" fill="none"/><text x="250" y="72" fill="#93c5fd" fontSize="12">Illustrative corrective channel</text></>}
 {d.candles.map(([o,h,l,c],i)=>{const col=c>=o?"#34d399":"#fb7185";return <g key={i}><line x1={x(i)} x2={x(i)} y1={y(h)} y2={y(l)} stroke={col} strokeWidth="2"/><rect x={x(i)-8} y={y(Math.max(o,c))} width="16" height={Math.max(3,y(Math.min(o,c))-y(Math.max(o,c)))} rx="1" fill={col}/></g>})}
 {d.highlight!==undefined && <><circle cx={x(d.highlight)} cy={y(bottom===40?d.candles[d.highlight][2]:d.candles[d.highlight][1])} r="12" fill="none" stroke="#fbbf24" strokeWidth="2"/><text x={x(d.highlight)+18} y={y(bottom===40?d.candles[d.highlight][2]:d.candles[d.highlight][1])-10} fill="#fde68a" fontSize="12">{variant==="sweep"||variant==="combined"?"Sweep / wick":"Zone test / wick"}</text></>}
 {d.exit!==undefined && <><circle cx={x(d.exit)} cy={y(d.candles[d.exit][3])} r="10" fill="none" stroke="#22d3ee" strokeWidth="2"/><text x={x(d.exit)+14} y={y(d.candles[d.exit][3])+18} fill="#67e8f9" fontSize="12">{variant==="choppy"?"Close below zone":"Close out of zone"}</text></>}
 {d.plan && <><line x1={x(5)} x2="900" y1={y(39)} y2={y(39)} stroke="#fb7185" strokeDasharray="6 4"/><text x="790" y={y(39)+18} fill="#fda4af" fontSize="12">Stop 39</text><line x1={x(5)} x2="900" y1={y(90)} y2={y(90)} stroke="#34d399" strokeDasharray="6 4"/><text x="790" y={y(90)-8} fill="#6ee7b7" fontSize="12">Target 90</text><text x="670" y={y(56)-8} fill="#67e8f9" fontSize="12">Example entry 56</text></>}
 <text x="85" y="451" fill="#64748b" fontSize="12">Illustrative price units · past response shown in hindsight, not a prediction</text>
 </svg></div>;
}
