import React from "react";
type Candle=[number,number,number,number];
const candles:Candle[]=[[55,57,48,50],[50,52,45,47],[47,51,40,50],[50,64,49,62],[62,75,60,73],[73,90,72,88],[88,89,78,80],[80,84,74,82],[82,83,66,68],[68,70,60,63],[63,70,62,69],[69,76,67,74]];
const mirror=([o,h,l,c]:Candle):Candle=>[130-o,130-l,130-h,130-c];
const y=(p:number)=>385-(p-30)*4;
export function RangeTriggerBigPictureChart({direction}:{direction:"bullish"|"bearish"}){
 const bull=direction==="bullish", V=(p:number)=>bull?p:130-p, data=bull?candles:candles.map(mirror),low=Math.min(V(60),V(65)),high=Math.max(V(60),V(65));
 return <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-[#080e16]" tabIndex={0} aria-label="Scrollable external and internal structure chart"><svg viewBox="0 0 1080 470" role="img" aria-label={`Hypothetical ${bull?"bullish":"bearish"} external swing ${V(40)} to ${V(90)}, midpoint 65, and internal pullback to ${V(60)} at a key zone. The subsequent reaction does not establish a trade outcome.`} className="h-auto w-full min-w-[820px]">
 <rect width="1080" height="470" rx="16" fill="#080e16"/><text x="28" y="30" fill="#f1f5f9" fontSize="15" fontWeight="700">Bigger picture · external structure + internal retracement</text><text x="28" y="50" fill="#94a3b8" fontSize="11">Illustrative 4H candles · left to right · {bull?"bullish":"bearish"} external swing</text><rect x="65" y="65" width="730" height="325" rx="8" fill="#0b1420"/>
 {[40,50,60,70,80,90,100].map(p=><g key={p}><line x1="65" x2="795" y1={y(p)} y2={y(p)} stroke="#263445" strokeDasharray="3 7"/><text x="52" y={y(p)+4} textAnchor="end" fontSize="11" fill="#718096">{p}</text></g>)}
 <rect x="558" y={y(high)} width="237" height={y(low)-y(high)} fill="#a78bfa" fillOpacity=".18" stroke="#a78bfa" strokeWidth="1.4"/>
 <line x1="65" x2="795" y1={y(V(40))} y2={y(V(40))} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth="1.3"/><line x1="65" x2="795" y1={y(65)} y2={y(65)} stroke="#fbbf24" strokeDasharray="6 5" strokeWidth="1.5"/><line x1="65" x2="795" y1={y(V(90))} y2={y(V(90))} stroke="#34d399" strokeDasharray="6 5" strokeWidth="1.3"/>
 {data.map(([o,h,l,c],i)=>{const x=105+i*57,col=c>=o?"#34d399":"#fb7185";return <g key={i}><line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={col} strokeWidth="2.2"/><rect x={x-11} y={y(Math.max(o,c))} width="22" height={Math.max(3,y(Math.min(o,c))-y(Math.max(o,c)))} rx="2" fill={col}/></g>})}
 <circle cx="219" cy={y(V(40))} r="7" fill="#080e16" stroke="#cbd5e1" strokeWidth="2"/><circle cx="390" cy={y(V(90))} r="7" fill="#080e16" stroke="#34d399" strokeWidth="2"/><circle cx="618" cy={y(V(60))} r="7" fill="#080e16" stroke="#fbbf24" strokeWidth="2"/>
 <line x1="805" x2="805" y1="70" y2="390" stroke="#29394b"/><text x="823" y="84" fill="#64748b" fontSize="10" fontWeight="700" letterSpacing="1.2">READ THE CHART</text>
 <circle cx="826" cy="111" r="4" fill="#cbd5e1"/><text x="839" y="115" fill="#e2e8f0" fontSize="13" fontWeight="700">External base · {V(40)}</text><text x="839" y="133" fill="#94a3b8" fontSize="11">Assumed pre-marked key level</text>
 <circle cx="826" cy="159" r="4" fill="#34d399"/><text x="839" y="163" fill="#e2e8f0" fontSize="13" fontWeight="700">Swing extreme · {V(90)}</text><text x="839" y="181" fill="#94a3b8" fontSize="11">Following decisive displacement</text>
 <circle cx="826" cy="207" r="4" fill="#fbbf24"/><text x="839" y="211" fill="#e2e8f0" fontSize="13" fontWeight="700">50% midpoint · 65</text><text x="839" y="229" fill="#94a3b8" fontSize="11">Retracement reaches beyond it</text>
 <circle cx="826" cy="255" r="4" fill="#a78bfa"/><text x="839" y="259" fill="#e2e8f0" fontSize="13" fontWeight="700">Key zone · {low}–{high}</text><text x="839" y="277" fill="#94a3b8" fontSize="11">Internal retracement touches zone</text>
 <text x="823" y="326" fill="#94a3b8" fontSize="11">Current reaction is conditional.</text><text x="823" y="344" fill="#94a3b8" fontSize="11">A level can hold or fail.</text>
 <text x="105" y="413" fill="#94a3b8" fontSize="11">External swing: {V(40)} → {V(90)}    ·    Internal counter-move: {V(90)} → {V(60)}    ·    then reaction</text><text x="105" y="434" fill="#64748b" fontSize="11">Generic illustration; not the exact numerical v1 execution example below.</text>
 </svg></div>;
}
