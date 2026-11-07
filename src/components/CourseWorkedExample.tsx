import React from "react";

type Candle = [number, number, number, number];
// Synthetic data. Values are arbitrary units; wick extremes include the open and close.
const continuation: Candle[] = [
 [76,81,74,80],[80,86,78,84],[84,90,82,87],[87,88,77,79],[79,81,70,72],
 [72,75,62,64],[64,67,54,56],[56,58,48,50],[50,53,46,52],[52,54,43,45],
 [45,47,34,36],[36,38,25,27],[27,29,20,22],[22,31,21,29],[29,42,27,40],
 [40,50,38,49],[49,51,34,36],[36,48,35,46],[46,58,44,56],[56,70,55,68],
 [68,69,60,62],[62,64,53,55],[55,57,47,49],[49,51,42,44],[44,53,43,51],
 [51,59,49,57],[57,62,55,60],[60,61,51,53],[53,55,43,45],[45,47,35,37],
 [37,39,27,29],[29,31,21,23],[23,25,18,20]
];
const counter: Candle[] = [
 [76,81,74,80],[80,86,78,84],[84,90,82,87],[87,88,77,79],[79,81,70,72],
 [72,75,62,64],[64,67,54,56],[56,58,48,50],[50,53,46,52],[52,54,43,45],
 [45,47,34,36],[36,38,25,27],[27,29,20,22],[22,31,21,29],[29,42,27,40],
 [40,50,38,49],[49,51,34,36],[36,48,35,46],[46,58,44,56],[56,70,55,68]
];
const x=(i:number)=>60+i*25;
const y=(v:number)=>430-v*4;
export function CourseWorkedExample({variant}:{variant:"continuation"|"counter"}) {
  const aligned=variant==="continuation", data=aligned?continuation:counter;
  const ext=[{n:"0.790",v:75.3},{n:"0.705",v:69.35},{n:"0.618",v:63.26},{n:"0.500",v:55}];
  const internal=[{n:"0.790",v:64.12},{n:"0.705",v:61.74},{n:"0.618",v:59.3},{n:"0.500",v:56}];
  return <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080e16]" tabIndex={0} aria-label="Scrollable illustrative chart">
    <svg viewBox="0 0 1020 475" role="img" aria-label={aligned?"Illustrative bearish external range and aligned internal sell setup with two order-block zones, Fibonacci levels, invalidation and target":"Illustrative bullish internal pullback within a larger bearish external range, showing a deeper retracement and nearby countertrend target"} className="h-auto min-w-[760px] w-full">
      <rect width="1020" height="475" fill="#080e16" rx="12"/>
      {[20,40,60,80].map(p=><line key={p} x1="35" x2="960" y1={y(p)} y2={y(p)} stroke="#1e293b" strokeDasharray="3 7"/>)}
      <rect x="88" y={y(92)} width="76" height={y(84)-y(92)} fill="#10b981" opacity=".14"/><text x="35" y="41" fill="#6ee7b7" fontSize="13">External anchor / supply</text>
      <line x1={x(2)} y1={y(90)} x2={x(12)} y2={y(20)} stroke="#f8fafc" strokeOpacity=".2" strokeWidth="1.5" strokeDasharray="5 6"/>
      {aligned && <><polyline points={`${x(12)},${y(20)} ${x(19)},${y(70)} ${x(23)},${y(42)} ${x(26)},${y(62)} ${x(32)},${y(18)}`} fill="none" stroke="#c084fc" strokeWidth="2" strokeOpacity=".8" strokeDasharray="6 5"/><rect x={x(18)-12} y={y(72)} width="116" height={y(67)-y(72)} fill="#fb7185" opacity=".25" stroke="#fb7185"/><text x="402" y={y(80)} fill="#fda4af" fontSize="13">External bearish OB</text><path d={`M 488 ${y(78)} L 535 ${y(71)}`} stroke="#fda4af" fill="none"/>
        {ext.map(f=><g key={f.n}><line x1={x(12)} x2={x(20)} y1={y(f.v)} y2={y(f.v)} stroke="#7dd3fc" strokeOpacity=".55" strokeDasharray="4 4"/><text x={x(12)+4} y={y(f.v)-4} fill="#7dd3fc" fontSize="11">ext {f.n}</text></g>)}
        <rect x={x(24)-6} y={y(64)} width="115" height={y(59)-y(64)} fill="#c084fc" opacity=".23" stroke="#c084fc"/><text x="690" y={y(72)} fill="#d8b4fe" fontSize="13">Internal bearish OB</text><path d={`M 760 ${y(70)} L 720 ${y(63)}`} stroke="#d8b4fe" fill="none"/>
        {internal.map(f=><g key={f.n}><line x1={x(23)} x2={x(29)} y1={y(f.v)} y2={y(f.v)} stroke="#c084fc" strokeOpacity=".7" strokeDasharray="3 4"/><text x={x(29)+5} y={y(f.v)+4} fill="#d8b4fe" fontSize="11">{f.n}</text></g>)}
        <line x1={x(20)} x2={x(24)} y1={y(53)} y2={y(53)} stroke="#fbbf24" strokeDasharray="4 4"/><text x="520" y={y(53)+16} fill="#fbbf24" fontSize="11">Prior internal low</text>
        <line x1={x(23)} x2="940" y1={y(20)} y2={y(20)} stroke="#34d399" strokeDasharray="6 4"/><text x="835" y={y(20)-9} fill="#6ee7b7" fontSize="12">External low / target</text>
        <line x1={x(19)} x2="925" y1={y(70)} y2={y(70)} stroke="#fb7185" strokeDasharray="3 5"/><text x="815" y={y(70)-8} fill="#fda4af" fontSize="12">Invalidation reference</text>
        <text x="548" y="465" fill="#c4b5fd" fontSize="12">Internal swing: 70 → 42; 0.705 ≈ 61.7</text></>}
      {!aligned && <><polyline points={`${x(12)},${y(20)} ${x(15)},${y(50)} ${x(16)},${y(34)} ${x(19)},${y(70)}`} fill="none" stroke="#7dd3fc" strokeWidth="2" strokeOpacity=".8" strokeDasharray="6 5"/><rect x={x(12)-20} y={y(25)} width="95" height={y(19)-y(25)} fill="#10b981" opacity=".2" stroke="#34d399"/><text x="300" y="378" fill="#6ee7b7" fontSize="12">External low / internal anchor</text>
        <line x1={x(13)} x2={x(19)} y1={y(42)} y2={y(42)} stroke="#fb7185" strokeDasharray="5 5"/><text x="490" y={y(42)-7} fill="#fda4af" fontSize="12">Prior internal high</text>
        <rect x={x(15)} y={y(37)} width="76" height={y(33)-y(37)} fill="#38bdf8" opacity=".25" stroke="#38bdf8"/><text x="480" y="325" fill="#7dd3fc" fontSize="12">Illustrative bullish OB / retracement</text>
        <line x1={x(15)} x2={x(19)+20} y1={y(35)} y2={y(35)} stroke="#fbbf24" strokeDasharray="4 4"/><text x="650" y={y(35)+4} fill="#fbbf24" fontSize="12">Internal 0.5 = 35</text>
        <text x="610" y="160" fill="#e2e8f0" fontSize="13">Nearby target: internal high 50</text><text x="610" y="184" fill="#94a3b8" fontSize="12">Further move into external supply is uncertain</text></>}
      {data.map(([o,h,l,c],i)=>{const color=c>=o?"#34d399":"#fb7185";return <g key={i}><line x1={x(i)} x2={x(i)} y1={y(h)} y2={y(l)} stroke={color} strokeWidth="2"/><rect x={x(i)-5} y={y(Math.max(o,c))} width="10" height={Math.max(3,y(Math.min(o,c))-y(Math.max(o,c)))} rx="1" fill={color}/></g>})}
      <circle cx={x(2)} cy={y(90)} r="9" fill="none" stroke="#e2e8f0"/><text x="55" y={y(90)-18} fill="#e2e8f0" fontSize="13">A · external high 90</text>
      <circle cx={x(12)} cy={y(20)} r="9" fill="none" stroke="#e2e8f0"/><text x="220" y="448" fill="#e2e8f0" fontSize="12">B · external low 20</text>
      {aligned && <><circle cx={x(19)} cy={y(70)} r="9" fill="none" stroke="#c084fc"/><circle cx={x(23)} cy={y(42)} r="9" fill="none" stroke="#c084fc"/><text x="545" y={y(42)+26} fill="#d8b4fe" fontSize="12">Internal low 42</text><text x="665" y={y(55)+38} fill="#f8fafc" fontSize="12">Potential entry area ≈ 62</text></>}
    </svg>
  </div>;
}
