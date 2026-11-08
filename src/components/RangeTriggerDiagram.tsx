import React from "react";

type Candle = [number, number, number, number]; // open, high, low, close
type Direction = "bullish" | "bearish";

// The first seven bars make the earlier range visible. The last three are
// the consecutive FVG candles; all pivots are confirmed before the BOS.
const htf: Candle[] = [
  [70,72,64,65], [65,67,60,61], [61,64,55,58], [58,65,57,63],
  [63,71,61,69], [69,76,68,73], [73,75,59,60],
  [60,65,58,64], [64,74,63,72], [72,84,71,82],
];
const ltf: Candle[] = [
  [82,83,72,74], [74,75,69,70], [70,72,67,69], [69,73,68,72],
  [72,73,68,69], [69,70,66,68], [68,75,67,74], [74,84,73,83],
];
const mirror = ([o,h,l,c]: Candle): Candle => [140-o,140-l,140-h,140-c];
const y = (price: number) => 350 - (price - 50) * 7;
const colors = { bull: "#34d399", bear: "#fb7185", zone: "#a78bfa", open: "#22d3ee", swing: "#fbbf24", muted: "#94a3b8" };

function CandleGlyph({bar, x, width=25}:{bar:Candle;x:number;width?:number}) {
  const [o,h,l,c] = bar, color = c >= o ? colors.bull : colors.bear;
  return <g><line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={color} strokeWidth="2.5" strokeLinecap="round"/><rect x={x-width/2} y={y(Math.max(o,c))} width={width} height={Math.max(3,y(Math.min(o,c))-y(Math.max(o,c)))} rx="2" fill={color}/></g>;
}
function Dot({x, price, color}:{x:number;price:number;color:string}) { return <circle cx={x} cy={y(price)} r="7" fill="#080e16" stroke={color} strokeWidth="2.5"/>; }
function LegendRow({y:rowY,color,title,detail}:{y:number;color:string;title:string;detail:string}) { return <g><circle cx="826" cy={rowY-4} r="4" fill={color}/><text x="839" y={rowY} fill="#e2e8f0" fontSize="13" fontWeight="700">{title}</text><text x="839" y={rowY+18} fill="#94a3b8" fontSize="11">{detail}</text></g>; }

export function RangeTriggerDiagram({stage,direction}:{stage:"context"|"entry";direction:Direction}) {
  const bull = direction === "bullish", V = (n:number) => bull ? n : 140-n;
  const bars = (stage === "context" ? htf : ltf).map(bar => bull ? bar : mirror(bar));
  const lo = Math.min(V(65),V(71)), hi = Math.max(V(65),V(71));
  const title = stage === "context" ? "01 / 4H · From range structure to breakout" : "02 / 15M · From zone retest to confirmation";
  const label = stage === "context"
    ? `${bull?"Bullish":"Bearish"} four-hour example with a confirmed range base at ${V(55)}, prior swing at ${V(76)}, breakout close at ${V(82)} and fair value gap from ${lo} to ${hi}.`
    : `${bull?"Long":"Short"} fifteen-minute example. Confirmed pivot ${V(67)}, sweep ${V(66)}, signal close ${V(83)}, assumed next open entry ${V(83)}, stop ${V(64)}. Target ${V(125)} is outside this chart.`;
  return <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-[#080e16]" tabIndex={0} aria-label="Scrollable strategy chart">
    <svg viewBox="0 0 1080 430" role="img" aria-label={label} className="h-auto w-full min-w-[820px]">
      <rect width="1080" height="430" rx="16" fill="#080e16"/>
      <text x="28" y="32" fill="#f1f5f9" fontSize="15" fontWeight="700">{title}</text>
      <text x="28" y="52" fill="#94a3b8" fontSize="11">Synthetic price units · candles move left to right · {bull?"long":"short"} example</text>
      <rect x="65" y="67" width="730" height="290" rx="8" fill="#0b1420"/>
      {[55,60,65,70,75,80,85,90].map(p=><g key={p}><line x1="65" x2="795" y1={y(p)} y2={y(p)} stroke="#263445" strokeDasharray="3 7"/><text x="54" y={y(p)+4} textAnchor="end" fill="#718096" fontSize="11">{p}</text></g>)}
      <line x1="805" x2="805" y1="70" y2="358" stroke="#29394b"/>
      {stage === "context" ? <>
        {/* The FVG is shaded only after candle 3 has closed. */}
        <rect x="714" y={y(hi)} width="81" height={y(lo)-y(hi)} fill={colors.zone} fillOpacity=".2" stroke={colors.zone} strokeWidth="1.5"/>
        <line x1="90" x2="795" y1={y(V(76))} y2={y(V(76))} stroke={colors.swing} strokeWidth="1.5" strokeDasharray="7 5"/>
        <line x1="90" x2="795" y1={y(V(55))} y2={y(V(55))} stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 5"/>
        {bars.map((bar,i)=><CandleGlyph key={i} bar={bar} x={120+i*60}/>)}
        <Dot x={240} price={V(55)} color="#cbd5e1"/><Dot x={420} price={V(76)} color={colors.swing}/><Dot x={660} price={V(82)} color={colors.open}/>
        <text x="120" y="376" fill="#718096" fontSize="11">Earlier structure</text>
        <text x="540" y="376" fill="#c4b5fd" fontSize="11" textAnchor="middle">1</text><text x="600" y="376" fill="#c4b5fd" fontSize="11" textAnchor="middle">2</text><text x="660" y="376" fill="#c4b5fd" fontSize="11" textAnchor="middle">3</text>
        <text x="539" y="398" fill="#94a3b8" fontSize="11">Three FVG candles</text>
        <text x="823" y="86" fill="#64748b" fontSize="10" fontWeight="700" letterSpacing="1.2">READ THE CHART</text>
        <LegendRow y={115} color="#cbd5e1" title={`Range base · ${V(55)}`} detail="Confirmed before breakout"/>
        <LegendRow y={161} color={colors.swing} title={`Prior swing · ${V(76)}`} detail="Confirmed before breakout"/>
        <LegendRow y={207} color={colors.open} title={`BOS close · ${V(82)}`} detail={bull?"Candle 3 closes above swing":"Candle 3 closes below swing"}/>
        <LegendRow y={253} color={colors.zone} title={`4H FVG · ${lo}–${hi}`} detail="Available after candle 3 closes"/>
        <text x="823" y="314" fill="#94a3b8" fontSize="11">Range midpoint · {bull?"69.5":"70.5"}</text>
      </> : <>
        <rect x="65" y={y(hi)} width="730" height={y(lo)-y(hi)} fill={colors.zone} fillOpacity=".16" stroke={colors.zone} strokeWidth="1.5"/>
        <line x1="65" x2="795" y1={y(V(82))} y2={y(V(82))} stroke={colors.open} strokeWidth="1.5" strokeDasharray="7 5"/>
        <line x1="280" x2="795" y1={y(V(67))} y2={y(V(67))} stroke={colors.swing} strokeWidth="1.5" strokeDasharray="6 5"/>
        <line x1="65" x2="795" y1={y(V(64))} y2={y(V(64))} stroke={colors.bear} strokeWidth="1.5" strokeDasharray="5 5"/>
        {bars.map((bar,i)=><g key={i}><CandleGlyph bar={bar} x={125+i*82}/><text x={125+i*82} y="376" textAnchor="middle" fill="#94a3b8" fontSize="11">{i+1}</text></g>)}
        <Dot x={289} price={V(67)} color={colors.swing}/><Dot x={535} price={V(66)} color={colors.swing}/><Dot x={699} price={V(83)} color={colors.open}/>
        <path d={`M 722 ${y(V(83))} L 778 ${y(V(83))}`} stroke={colors.open} strokeWidth="2" strokeDasharray="3 4"/>
        <text x="823" y="86" fill="#64748b" fontSize="10" fontWeight="700" letterSpacing="1.2">READ THE CHART</text>
        <LegendRow y={115} color={colors.zone} title={`4H FVG · ${lo}–${hi}`} detail="Price retraces into the zone"/>
        <LegendRow y={161} color={colors.swing} title={`Pivot ${V(67)} → sweep ${V(66)}`} detail="Bar 3 confirmed; bar 6 sweeps"/>
        <LegendRow y={207} color={colors.open} title={`4H open · ${V(82)}`} detail={`Bar 8 closes at ${V(83)}`}/>
        <LegendRow y={253} color={colors.bear} title={`Stop · ${V(64)}`} detail="One illustrative tick outside zone"/>
        <text x="823" y="310" fill="#6ee7b7" fontSize="12" fontWeight="700">Target {V(125)} · off chart</text>
        <text x="823" y="328" fill="#94a3b8" fontSize="11">Not reached in this example</text>
        <text x="125" y="399" fill="#94a3b8" fontSize="11">Bar 3 pivot → confirmed after bar 5 → bar 6 sweep → bar 8 signal → next open entry {V(83)}</text>
      </>}
    </svg>
  </div>;
}
