import React from "react";
type Candle=[number,number,number,number]; // open, high, low, close
type Variant="bull-continuation"|"bear-continuation"|"bear-reversal"|"bull-reversal"|"indecision";
const data:Record<Variant,{prev:Candle;current:Candle;path:number[];title:string;zone?:[number,number];zoneLabel?:string}>={
 "bull-continuation":{prev:[40,70,35,65],current:[65,76,58,76],path:[65,58,67,74,76],title:"Bullish continuation profile"},
 "bear-continuation":{prev:[70,75,40,45],current:[45,50,33,33],path:[45,50,46,39,33],title:"Bearish continuation profile"},
 "bear-reversal":{prev:[40,70,35,65],current:[65,69,53,53],path:[65,69,66,60,53],title:"Potential bearish reversal",zone:[68,72],zoneLabel:"Illustrative supply"},
 "bull-reversal":{prev:[70,75,40,45],current:[45,58,41,58],path:[45,41,43,49,58],title:"Potential bullish reversal",zone:[39,42],zoneLabel:"Illustrative demand"},
 "indecision":{prev:[40,70,35,65],current:[65,67,62,64],path:[65,67,62,66,64],title:"Indecision / no clear break"},
};
const y=(p:number)=>360-p*3.4;
function Bar({v,x}:{v:Candle;x:number}){const [o,h,l,c]=v,col=c>=o?"#34d399":"#fb7185";return <g><line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={col} strokeWidth="3"/><rect x={x-19} y={y(Math.max(o,c))} width="38" height={Math.max(4,y(Math.min(o,c))-y(Math.max(o,c)))} rx="2" fill={col}/></g>}
export function CourseCandleDynamicsChart({variant}:{variant:Variant}) {
 const d=data[variant], [o,h,l,c]=d.prev, [no,nh,nl,nc]=d.current, points=d.path.map((p,i)=>`${425+i*90},${y(p)}`).join(" ");
 return <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080e16]" tabIndex={0} aria-label="Scrollable candle dynamics illustration"><svg viewBox="0 0 920 405" role="img" aria-label={`${d.title}. Previous candle open ${o}, high ${h}, low ${l}, close ${c}. Current candle open ${no}, high ${nh}, low ${nl}, close ${nc}. Illustrative intrabar path: ${d.path.join(" to ")}.`} className="h-auto w-full min-w-[760px]">
 <rect width="920" height="405" rx="12" fill="#080e16"/><text x="35" y="31" fill="#e2e8f0" fontWeight="700" fontSize="14">{d.title}</text><text x="45" y="58" fill="#94a3b8" fontSize="12">Higher timeframe candles</text><text x="425" y="58" fill="#94a3b8" fontSize="12">Illustrative lower-timeframe path → time</text><line x1="350" x2="350" y1="60" y2="350" stroke="#334155" strokeDasharray="3 7"/>
 {[h,l].map((p,i)=><g key={p}><line x1="36" x2="875" y1={y(p)} y2={y(p)} stroke={i===0?"#fb7185":"#34d399"} strokeDasharray="5 6" opacity=".65"/><text x="707" y={y(p)-7} fill={i===0?"#fda4af":"#6ee7b7"} fontSize="12">Previous {i===0?"high":"low"} {p}</text></g>)}
 <line x1="37" x2="875" y1={y(no)} y2={y(no)} stroke="#fbbf24" strokeDasharray="6 5"/><text x="45" y="395" fill="#fde68a" fontSize="11">Gold dashed line = current open {no}</text>
 {d.zone && <><rect x="425" y={y(d.zone[1])} width="440" height={y(d.zone[0])-y(d.zone[1])} fill="#a78bfa" opacity=".2" stroke="#a78bfa"/><text x="425" y={y(d.zone[1])-14} fill="#c4b5fd" fontSize="11">{d.zoneLabel}</text></>}
 <Bar x={110} v={d.prev}/><Bar x={240} v={d.current}/><text x="65" y="375" fill="#cbd5e1" fontSize="12">Previous candle</text><text x="196" y="375" fill="#cbd5e1" fontSize="12">Current candle</text>
 <polyline points={points} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{d.path.map((p,i)=><g key={i}><circle cx={425+i*90} cy={y(p)} r="5" fill={i===0?"#fbbf24":i===d.path.length-1?"#fff":"#60a5fa"}/><text x={425+i*90-4} y={y(p)+21} fill="#cbd5e1" fontSize="11">{i+1}</text></g>)}
 <text x="425" y="375" fill="#64748b" fontSize="12">Numbers show the sequence of the imagined intrabar path</text>
 </svg><div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-800 px-4 py-3 font-mono text-[11px] text-slate-400"><span>PREVIOUS · O {o} H {h} L {l} C {c}</span><span>CURRENT · O {no} H {nh} L {nl} C {nc}</span></div></div>;
}
