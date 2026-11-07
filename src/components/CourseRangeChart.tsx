import React from "react";

type Candle = [number, number, number, number]; // open, high, low, close
const bullish: Candle[] = [
  [39,42,31,33],[33,36,24,27],[27,32,22,30], [30,40,28,37],[37,49,35,46],[46,57,44,54],
  [54,64,51,61],[61,64,55,58],[58,72,57,69],[69,81,67,79],[79,90,76,87],
  [87,89,78,80],[80,82,70,72],[72,75,61,63],[63,66,48,51],[51,62,49,60],[60,69,58,67],
];
const bearish: Candle[] = [
  [62,68,59,66],[66,76,64,73],[73,83,71,79],[79,80,69,71],[71,73,61,63],[63,65,53,55],
  [55,57,44,47],[47,51,44,49],[49,50,36,38],[38,40,25,27],[27,30,20,23],
  [23,32,21,30],[30,41,28,39],[39,52,37,50],[50,62,48,60],[60,61,50,52],[52,54,42,44],
];
const weak: Candle[] = [
  [30,35,27,33],[33,39,31,37],[37,44,35,42],[42,49,40,47],[47,55,44,52],[52,61,49,58],
  [58,64,55,61],[61,67,57,60],[60,66,56,62],[62,65,54,57],[57,64,54,61],[61,67,58,63],
  [63,66,57,59],[59,64,55,61],[61,65,53,56],[56,63,54,60],[60,64,55,58],
];
const Y=(p:number)=>280-p*2.25;
export function CourseRangeChart({ variant }: {variant:"bullish"|"bearish"|"weak"|"internal"}) {
  const data=variant==="bullish"||variant==="internal"?bullish:variant==="bearish"?bearish:weak;
  const isUp=variant==="bullish" || variant==="internal", isDown=variant==="bearish";
  const level=isUp?64:isDown?44:67;
  return <svg viewBox="0 0 700 310" role="img" aria-label={isUp?"Bullish range showing an anchored low, strong displacement above a prior high and a retracement into the range":""+(isDown?"Bearish range showing an anchored high, displacement below a prior low and a retracement into the range":"Weak range showing repeated failure to close above a prior high")} className="h-auto w-full rounded-xl border border-slate-800 bg-[#080e16]">
    <rect x="0" y="0" width="700" height="310" rx="12" fill="#080e16"/>
    {[20,40,60,80].map(p=><line key={p} x1="45" x2="650" y1={Y(p)} y2={Y(p)} stroke="#1e293b" strokeDasharray="3 6"/>)}
    {(isUp||isDown) && <><rect x="90" y={Y(isUp?32:84)} width="155" height={Y(isUp?20:71)-Y(isUp?32:84)} fill="#10b981" opacity=".12"/><text x="46" y={isUp?Y(17):Y(89)} fill="#6ee7b7" fontSize="12" fontWeight="600">Anchor / key zone</text><line x1="310" x2="635" y1={Y(isUp?56:51)} y2={Y(isUp?56:51)} stroke="#fbbf24" strokeDasharray="5 5"/><text x="510" y={Y(isUp?56:51)-7} fill="#fbbf24" fontSize="12">50% of swing</text><rect x="472" y={Y(isUp?48:70)} width="116" height={Y(isUp?36:59)-Y(isUp?48:70)} fill="#22d3ee" opacity=".11"/><text x="492" y={isUp?Y(33):Y(73)} fill="#67e8f9" fontSize="12">61.8–79% zone</text></>}
    <line x1="220" x2="645" y1={Y(level)} y2={Y(level)} stroke="#fb7185" strokeWidth="1.2" strokeDasharray="5 5"/><text x="480" y={Y(level)-8} fill="#fda4af" fontSize="12">{isDown?"Prior low":"Prior high"}</text>
    {data.map(([o,h,l,c],i)=>{const x=80+i*29, color=c>=o?"#34d399":"#fb7185";return <g key={i}><line x1={x} x2={x} y1={Y(h)} y2={Y(l)} stroke={color} strokeWidth="2"/><rect x={x-6} y={Y(Math.max(o,c))} width="12" height={Math.max(3,Y(Math.min(o,c))-Y(Math.max(o,c)))} rx="1" fill={color}/></g>})}
    {isUp && <><text x="88" y={Y(22)+25} fill="#e2e8f0" fontSize="12">A · swing low</text><text x="360" y={Y(90)-12} fill="#e2e8f0" fontSize="12">B · swing high</text><text x="380" y="28" fill="#34d399" fontSize="12" fontWeight="700">↑ displacement</text><text x="450" y="292" fill="#67e8f9" fontSize="12">← retracement</text></>}
    {isDown && <><text x="88" y={Y(83)-12} fill="#e2e8f0" fontSize="12">A · swing high</text><text x="360" y={Y(20)+22} fill="#e2e8f0" fontSize="12">B · swing low</text><text x="360" y="285" fill="#fb7185" fontSize="12" fontWeight="700">↓ displacement</text><text x="465" y="28" fill="#67e8f9" fontSize="12">← retracement</text></>}
    {variant==="internal" && <><rect x="190" y={Y(66)} width="120" height={Y(34)-Y(66)} rx="5" fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="5 4"/><path d="M 190 102 L 218 132" stroke="#c4b5fd" strokeWidth="1.5"/><text x="60" y="97" fill="#c4b5fd" fontSize="12" fontWeight="700">Internal swings</text></>}
    {variant==="weak" && <><text x="260" y="36" fill="#fda4af" fontSize="13" fontWeight="700">Wicks probe the high, but bodies fail to close above it</text><text x="80" y="270" fill="#94a3b8" fontSize="12">No clear displacement beyond the prior high</text></>}
  </svg>;
}
