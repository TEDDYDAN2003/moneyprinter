import React from "react";
type Candle = [number,number,number,number];
const trending: Candle[] = [
 [35,40,32,38],[38,45,36,43],[43,52,40,50],[50,51,34,36],[36,48,35,46],
 [46,60,44,58],[58,64,55,62],[62,63,51,54],[54,62,53,60],[60,70,59,68],
 [68,80,66,78],[78,90,77,88]
];
const trap:Candle[]=[...trending,[88,89,47,49],[49,64,48,62],[62,78,60,76],[76,91,74,89],[89,96,86,94]];
const twoBreaks:Candle[]=[...trending,[88,89,70,72],[72,74,55,57],[57,59,45,47],[47,49,30,32],[32,34,20,23],[23,36,22,34],[34,54,32,52],[52,70,50,68],[68,69,55,57],[57,59,42,44],[44,45,18,20]];
const respect:Candle[]=[[35,44,34,42],[42,50,40,48],[48,54,46,51],[51,63,50,61],[61,66,58,64],[64,65,54,56],[56,66,55,64],[64,70,63,68],[68,69,54,57],[57,65,56,63],[63,64,51,52],[52,53,46,48],[48,54,46,52],[52,53,40,41],[41,43,34,36]];
const X=(i:number)=>55+i*37;
const Y=(v:number)=>400-v*3.55;
const mirror=(c:Candle):Candle=>[100-c[0],100-c[2],100-c[1],100-c[3]];
export function CourseBosChart({variant}:{variant:"trap"|"two-breaks"|"respect"|"mirror"}){
 const isTrap=variant==="trap",isTwo=variant==="two-breaks",isMirror=variant==="mirror";
 const candles=isTrap?trap:isTwo?twoBreaks:isMirror?respect.map(mirror):respect;
 const flip=(v:number)=>isMirror?100-v:v;
 const label=isTrap?"A single break of a higher low in an uptrend followed by a new high, illustrating a possible false market structure shift":isTwo?"A bearish market structure shift at higher timeframe supply: displacement closes below two significant lows, followed by a retracement":"A significant level breaks, is retested and respected, then fails; the mirrored example shows the same method in the opposite direction";
 return <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080e16]" tabIndex={0} aria-label="Scrollable candlestick illustration"><svg viewBox="0 0 960 445" role="img" aria-label={label} className="h-auto min-w-[720px] w-full">
 <rect width="960" height="445" fill="#080e16" rx="12"/>{[20,40,60,80].map(v=><line key={v} x1="30" x2="920" y1={Y(v)} y2={Y(v)} stroke="#1e293b" strokeDasharray="3 7"/>)}
 {(isTwo || variant==="respect" || isMirror) && <><rect x={isTwo?"320":"270"} y={Y(isMirror?34:isTwo?94:72)} width={isTwo?"245":"140"} height={isMirror?Y(28)-Y(34):isTwo?Y(85)-Y(94):Y(66)-Y(72)} fill="#fb7185" opacity=".13"/><text x={isTwo?"430":"400"} y={isMirror?Y(22):isTwo?Y(97):Y(76)} fill="#fda4af" fontSize="13">HTF {isMirror?"demand":"supply"} / context</text></>}
 {isTrap && <><rect x="65" y={Y(40)} width="590" height={Y(30)-Y(40)} fill="#34d399" opacity=".1"/><text x="64" y={Y(28)} fill="#6ee7b7" fontSize="13">Larger-range support / key level below</text><line x1={X(7)} x2={X(13)+14} y1={Y(51)} y2={Y(51)} stroke="#fbbf24" strokeDasharray="5 5"/><text x="340" y={Y(51)-9} fill="#fbbf24" fontSize="13">Single low broken</text><text x="610" y="45" fill="#e2e8f0" fontSize="13">Later new high</text><path d={`M 610 52 L ${X(16)} ${Y(94)-4}`} stroke="#e2e8f0" fill="none"/></>}
 {isTwo && <><line x1={X(7)} x2="880" y1={Y(51)} y2={Y(51)} stroke="#fbbf24" strokeDasharray="5 5"/><text x="185" y={Y(51)-9} fill="#fbbf24" fontSize="13">L2 = 51</text><line x1={X(3)} x2="880" y1={Y(34)} y2={Y(34)} stroke="#c084fc" strokeDasharray="5 5"/><text x="100" y={Y(34)-9} fill="#d8b4fe" fontSize="13">L1 = 34</text><rect x={X(18)-10} y={Y(73)} width="118" height={Y(66)-Y(73)} fill="#fb7185" opacity=".25" stroke="#fb7185"/><text x="660" y="102" fill="#fda4af" fontSize="12">Illustrative key zone</text><text x="650" y="120" fill="#94a3b8" fontSize="12">0.705 of 90 → 20 ≈ 69.35</text><circle cx={X(3)} cy={Y(34)} r="8" fill="none" stroke="#c084fc"/><circle cx={X(7)} cy={Y(51)} r="8" fill="none" stroke="#fbbf24"/><circle cx={X(14)} cy={Y(47)} r="8" fill="none" stroke="#fbbf24"/><circle cx={X(15)} cy={Y(32)} r="8" fill="none" stroke="#c084fc"/></>}
 {(variant==="respect" || isMirror) && <><line x1={X(2)-12} x2="850" y1={Y(flip(54))} y2={Y(flip(54))} stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6 5"/><text x="650" y={Y(flip(54))-10} fill="#fbbf24" fontSize="13">Key level {isMirror?46:54}</text><circle cx={X(5)} cy={Y(flip(54))} r="9" fill="none" stroke="#34d399"/><circle cx={X(8)} cy={Y(flip(54))} r="9" fill="none" stroke="#34d399"/><circle cx={X(10)} cy={Y(flip(52))} r="9" fill="none" stroke="#fb7185"/><text x="100" y="425" fill="#94a3b8" fontSize="13">1 · break → 2 · respect → 3 · close through → 4 · retest</text></>}
 {candles.map(([o,h,l,c],i)=>{const color=c>=o?"#34d399":"#fb7185";return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={color} strokeWidth="2"/><rect x={X(i)-7} y={Y(Math.max(o,c))} width="14" height={Math.max(3,Y(Math.min(o,c))-Y(Math.max(o,c)))} rx="1" fill={color}/></g>})}
 {isTwo && <><text x="600" y={Y(47)+25} fill="#fbbf24" fontSize="12">1st close</text><text x="620" y={Y(32)+23} fill="#d8b4fe" fontSize="12">2nd close</text><text x="640" y="426" fill="#94a3b8" fontSize="12">Example only · not a trade signal</text></>}
 </svg></div>
}
