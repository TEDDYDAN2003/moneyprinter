import React from "react";
type Candle=[number,number,number,number];
type Kind="bos"|"mss"|"fvg"|"fib"|"ote"|"poc"|"val"|"vah"|"pullback"|"orderblock"|"swing";
const up:Candle[]=[[32,38,30,36],[36,45,35,43],[43,52,40,50],[50,51,43,45],[45,55,44,53],[53,64,52,62],[62,67,60,65],[65,66,57,58],[58,59,51,53],[53,61,52,58],[58,68,56,66],[66,76,64,74],[74,82,72,80]];
const down:Candle[]=[[45,50,43,48],[48,58,47,56],[56,67,55,65],[65,76,64,74],[74,86,72,83],[83,90,80,88],[88,89,73,75],[75,77,58,60],[60,62,49,51],[51,58,50,56],[56,57,48,51],[51,52,39,41],[41,42,28,30]];
const fvg:Candle[]=[[25,31,23,30],[30,36,29,34],[35,40,32,38],[38,66,37,64],[64,70,55,68],[68,71,62,64],[64,65,48,51],[51,59,49,58],[58,67,56,65],[65,76,63,74],[74,81,72,79]];
const fib:Candle[]=[[24,30,20,28],[28,37,26,35],[35,48,33,46],[46,59,44,57],[57,70,55,68],[68,82,66,80],[80,90,78,88],[88,89,76,78],[78,80,65,67],[67,69,53,55],[55,56,40,42],[42,48,41,47],[47,59,45,57],[57,72,55,70],[70,84,68,82],[82,92,80,90]];
const poc:Candle[]=[[49,54,47,52],[52,60,50,58],[58,67,56,65],[65,75,63,73],[73,74,67,69],[69,71,61,63],[63,65,58,59],[59,66,58,64],[64,70,62,68],[68,76,67,74]];
const val:Candle[]=[[57,62,55,60],[60,68,58,66],[66,74,64,72],[72,74,64,66],[66,68,56,58],[58,60,49,51],[51,52,44,46],[46,52,45,50],[50,56,49,55],[55,61,53,60]];
const vah:Candle[]=[[56,62,54,60],[60,68,58,66],[66,73,64,71],[71,76,69,74],[74,75,68,69],[69,70,63,65],[65,66,59,61],[61,62,55,57]];
const pull:Candle[]=[[25,32,23,30],[30,41,28,39],[39,52,37,50],[50,64,48,62],[62,75,60,73],[73,80,70,78],[78,79,72,74],[74,75,66,68],[68,69,62,64],[64,70,63,68],[68,74,66,72],[72,81,70,79]];
const datasets:Record<Kind,{data:Candle[];entryIdx:number;stop:number;target:number;zone:[number,number];zoneName:string;bias:"long"|"short";mode?:"profile"|"fib"|"fvg"}>={
 bos:{data:up,entryIdx:9,stop:47,target:67,zone:[50,54],zoneName:"Prior high / BOS retest",bias:"long"},
 mss:{data:down,entryIdx:10,stop:61,target:30,zone:[53,57],zoneName:"Broken swing low / MSS",bias:"short"},
 fvg:{data:fvg,entryIdx:7,stop:38,target:75,zone:[40,55],zoneName:"Bullish FVG · 40–55",bias:"long",mode:"fvg"},
 fib:{data:fib,entryIdx:11,stop:19,target:90,zone:[40,42],zoneName:"0.705 = 40.65",bias:"long",mode:"fib"},
 ote:{data:fib,entryIdx:11,stop:19,target:90,zone:[34.7,46.74],zoneName:"OTE · 0.618–0.790",bias:"long",mode:"fib"},
 poc:{data:poc,entryIdx:7,stop:54,target:75,zone:[58,62],zoneName:"POC · 60",bias:"long",mode:"profile"},
 val:{data:val,entryIdx:7,stop:40,target:60,zone:[43,47],zoneName:"VAL · 45",bias:"long",mode:"profile"},
 vah:{data:vah,entryIdx:4,stop:79,target:60,zone:[73,77],zoneName:"VAH · 75",bias:"short",mode:"profile"},
 pullback:{data:pull,entryIdx:9,stop:55,target:80,zone:[60,65],zoneName:"Prior pullback area",bias:"long"},
 orderblock:{data:up,entryIdx:9,stop:42,target:67,zone:[43,51],zoneName:"Bullish order block",bias:"long"},
 swing:{data:up,entryIdx:9,stop:47,target:67,zone:[50,54],zoneName:"Previous swing high",bias:"long"},
};
const Y=(n:number)=>430-n*4, X=(i:number)=>205+i*42;
export function CourseKeyLevelChart({kind}:{kind:Kind}){
 const d=datasets[kind], e=d.data[d.entryIdx][3], [low,high]=d.zone;
 const rr=d.bias === "long" ? (d.target-e)/(e-d.stop) : (e-d.target)/(d.stop-e);
 return <><div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080e16]" tabIndex={0} aria-label="Scrollable trade illustration"><svg viewBox="0 0 960 470" role="img" aria-label={`${d.zoneName}; illustrative ${d.bias} setup with entry ${e}, stop ${d.stop} and target ${d.target}.`} className="h-auto min-w-[760px] w-full">
 <rect width="960" height="470" rx="12" fill="#080e16"/>{[20,40,60,80].map(n=><line key={n} x1="175" x2="930" y1={Y(n)} y2={Y(n)} stroke="#1e293b" strokeDasharray="3 7"/>)}
 {d.mode==="profile" && <><text x="30" y="38" fill="#94a3b8" fontSize="12">Prior profile</text>{[[30,52],[35,52],[40,52],[45,72],[50,87],[55,105],[60,125],[65,96],[70,70],[75,53],[80,52],[85,53]].map(([p,w])=><rect key={p} x={158-w} y={Y(p)-8} width={w} height="14" rx="2" fill={p===60?"#fbbf24":"#42677b"} opacity=".9"/>)}{[[75,"VAH"],[60,"POC"],[45,"VAL"]].map(([p,label])=><g key={label}><line x1="165" x2="900" y1={Y(Number(p))} y2={Y(Number(p))} stroke="#5c8597" strokeDasharray="5 5" opacity=".7"/><text x="40" y={Y(Number(p))-10} fontSize="12" fill="#cbd5e1">{label} {p}</text></g>)}</>}
 <rect x={d.mode==="fvg"?X(2):kind==="orderblock"?X(3):X(4)} y={Y(high)} width={d.mode==="fvg"?X(8)-X(2):X(d.entryIdx+1)-(kind==="orderblock"?X(3):X(4))} height={Math.max(5,Y(low)-Y(high))} fill="#22d3ee" opacity=".15" stroke="#22d3ee"/><text x="182" y={Y(high)-9} fill="#67e8f9" fontSize="12" fontWeight="600">{d.zoneName}</text>
 {d.mode==="fib" && <>{[[46.74,"0.618"],[40.65,"0.705"],[34.7,"0.790"]].map(([p,label])=><g key={label}><line x1={X(6)} x2={X(12)} y1={Y(Number(p))} y2={Y(Number(p))} stroke="#a78bfa" strokeDasharray="4 5"/><text x={X(12)+5} y={Y(Number(p))+4} fill="#c4b5fd" fontSize="11">{label}</text></g>)}<text x={X(0)-10} y={Y(20)+25} fill="#e2e8f0" fontSize="12">Low 20</text><text x={X(6)-15} y={Y(90)-12} fill="#e2e8f0" fontSize="12">High 90</text></>}
 {d.mode==="fvg" && <><text x={X(2)-3} y={Y(40)-14} fill="#fbbf24" fontSize="12">1</text><text x={X(3)-3} y={Y(66)-14} fill="#fbbf24" fontSize="12">2</text><text x={X(4)-3} y={Y(70)-14} fill="#fbbf24" fontSize="12">3</text><text x="620" y="65" fill="#94a3b8" fontSize="12">C1 high 40 &lt; C3 low 55</text></>}
 <line x1={X(d.entryIdx)} x2="923" y1={Y(d.target)} y2={Y(d.target)} stroke="#34d399" strokeDasharray="6 4"/><text x="805" y={Y(d.target)-8} fill="#6ee7b7" fontSize="12">Target {d.target}</text>
 <line x1={X(d.entryIdx)} x2="923" y1={Y(d.stop)} y2={Y(d.stop)} stroke="#fb7185" strokeDasharray="6 4"/><text x="805" y={Y(d.stop)+18} fill="#fda4af" fontSize="12">Stop {d.stop}</text>
 {d.data.map(([o,h,l,c],i)=>{const col=c>=o?"#34d399":"#fb7185";return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth="2"/><rect x={X(i)-7} y={Y(Math.max(o,c))} width="14" height={Math.max(3,Y(Math.min(o,c))-Y(Math.max(o,c)))} rx="1" fill={col}/></g>})}
 <circle cx={X(d.entryIdx)} cy={Y(e)} r="11" fill="none" stroke="#fbbf24" strokeWidth="2"/><path d={`M ${X(d.entryIdx)+12} ${Y(e)} L 775 ${Y(e)}`} stroke="#fbbf24" strokeDasharray="4 4"/><text x="795" y={Y(e)+4} fill="#fde68a" fontSize="12">Example entry {e}</text>
 <text x="175" y="456" fill="#64748b" fontSize="12">Synthetic price units · plotted after the fact · not an order or prediction</text>
 </svg></div><p className="mt-2 text-xs leading-6 text-slate-400">Hypothetical {d.bias} · entry {e}, stop {d.stop}, target {d.target} · planned reward-to-risk ≈ {rr.toFixed(2)}R before costs. {rr < 2 ? "Below a 2R minimum: pass or reassess the plan; do not move the stop or target arbitrarily." : "A 2R threshold alone does not make the setup valid or profitable."} Price may not reach the target, and stops can slip.</p></>;
}
