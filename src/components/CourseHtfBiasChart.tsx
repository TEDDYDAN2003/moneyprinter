import React from "react";
type Candle=[number,number,number,number];
type Variant="bullish"|"bearish"|"reversal"|"unclear";
const bullish:Candle[]=[[52,53,48,50],[50,58,49,56],[56,64,54,62],[62,64,58,60],[60,71,59,69],[69,78,67,74]];
const mirror=([o,h,l,c]:Candle):Candle=>[100-o,100-l,100-h,100-c];
const data:Record<Variant,{title:string;prev:Candle;lower:Candle[];reference:number;refLabel:string;note:string}>={
 bullish:{title:"Bullish continuation snapshot",prev:[60,68,45,52],lower:bullish,reference:68,refLabel:"Previous 4H high · 68",note:"Bullish close above prior high"},
 bearish:{title:"Bearish continuation snapshot",prev:mirror([60,68,45,52]),lower:bullish.map(mirror),reference:32,refLabel:"Previous 4H low · 32",note:"Bearish close below prior low"},
 reversal:{title:"Potential bullish reversal snapshot",prev:[70,75,40,45],lower:[[45,46,37,40],[40,47,39,46],[46,55,45,54],[54,63,52,59]],reference:40,refLabel:"Previous 4H low · 40",note:"Sweep and return above open"},
 unclear:{title:"Indecision snapshot",prev:[70,75,40,45],lower:[[45,47,42,44],[44,48,43,46],[46,49,42,43],[43,47,41,45]],reference:40,refLabel:"Previous 4H low · 40",note:"No clear directional follow-through"},
};
const y=(v:number)=>350-v*3;
export function CourseHtfBiasChart({variant}:{variant:Variant}){
 const d=data[variant];const first=d.lower[0][0], last=d.lower[d.lower.length-1][3];const current:Candle=[first,Math.max(...d.lower.map(c=>c[1])),Math.min(...d.lower.map(c=>c[2])),last];
 function draw([o,h,l,c]:Candle,x:number,width:number){const color=c>o?"#34d399":c<o?"#fb7185":"#cbd5e1";return <g><line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={color} strokeWidth="2"/><rect x={x-width/2} y={y(Math.max(o,c))} width={width} height={Math.max(3,y(Math.min(o,c))-y(Math.max(o,c)))} rx="2" fill={color}/></g>}
 return <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080e16]" tabIndex={0} aria-label="Scrollable higher and lower timeframe chart"><svg viewBox="0 0 960 400" role="img" aria-label={`${d.title}. The current four-hour candle is still open. Its lower-timeframe candles aggregate to open ${first}, high ${current[1]}, low ${current[2]} and current price ${last}.`} className="h-auto w-full min-w-[760px]">
 <rect width="960" height="400" rx="12" fill="#080e16"/><text x="25" y="27" fill="#e2e8f0" fontSize="14" fontWeight="700">{d.title}</text><text x="85" y="52" fill="#94a3b8" fontSize="12">4H candles</text><text x="475" y="52" fill="#94a3b8" fontSize="12">15-minute candles inside the current 4H period</text><line x1="425" x2="425" y1="62" y2="335" stroke="#334155" strokeDasharray="4 5"/>
 {[20,40,60,80].map(v=><line key={v} x1="70" x2="925" y1={y(v)} y2={y(v)} stroke="#1e293b" strokeDasharray="3 7"/>)}
 <line x1="70" x2="925" y1={y(first)} y2={y(first)} stroke="#22d3ee" strokeDasharray="6 5"/><text x="475" y={y(first)-7} fontSize="11" fill="#67e8f9">Current 4H open · {first}</text>
 <line x1="70" x2="925" y1={y(d.reference)} y2={y(d.reference)} stroke="#fbbf24" strokeDasharray="5 5"/><text x="475" y={y(d.reference)-7} fontSize="11" fill="#fde68a">{d.refLabel}</text>
 {draw(d.prev,180,38)}{draw(current,320,38)}{d.lower.map((c,i)=><React.Fragment key={i}>{draw(c,510+i*60,19)}</React.Fragment>)}
 <text x="147" y="366" fill="#94a3b8" fontSize="12">Previous</text><text x="282" y="366" fill="#e2e8f0" fontSize="12">Current*</text><text x="490" y="366" fill="#cbd5e1" fontSize="12">{d.note}</text><text x="25" y="389" fill="#64748b" fontSize="11">* Still forming at this snapshot · synthetic values · price can change before 4H close</text>
 </svg></div>;
}
