"use client";
import React from "react";

type Approach = "crossover" | "support" | "filter" | "range" | "overload" | "noise";
type Direction = "bullish" | "bearish";

const GUIDES: Record<"crossover" | "support" | "filter", string[][]> = {
  crossover: [
    ["READ THE MARKET", "Check whether price is trending, not repeatedly reversing in a range."],
    ["PLOT THE AVERAGES", "Blue = fast 20; amber = slow 50. Their lines respond at different speeds."],
    ["REVIEW THE HISTORY", "Compare earlier signals and what price did afterwards. Do not cherry-pick."],
    ["FIND THE CROSS", "The circle highlights where the fast line crosses the slow line."],
    ["PLAN THE ENTRY", "A cross is a setup, not a guaranteed entry. Define trigger, stop and size."],
    ["PLAN THE EXIT", "Test an ATR trailing stop and its settings; fills can slip."],
  ],
  support: [
    ["READ THE TREND", "Identify a directional market before evaluating a pullback to the average."],
    ["SET UP THE CHART", "The blue MA is the dynamic level. Stochastic is shown below as an illustration."],
    ["WATCH THE PULLBACK", "Price approaches the moving average; it can bounce, pierce, or break it."],
    ["CHECK BOTH SIGNALS", "At the MA area, compare price response with the Stochastic extreme."],
    ["PLAN THE ENTRY", "Specify confirmation, invalidation and size before placing an order."],
    ["PLAN THE EXIT", "Choose and test an exit rule. This diagram does not imply a guaranteed target."],
  ],
  filter: [
    ["FIND THE TREND FILTER", "The amber line represents the 200 EMA; compare price to that line."],
    ["SET UP THE INDICATOR", "Combine the 200 EMA with an indicator such as Supertrend; define its settings."],
    ["CHECK THE PRICE SIDE", "Above the 200 EMA: consider buys. Below it: consider sells."],
    ["WAIT FOR ALIGNMENT", "The example signal marker and the price side must point in the same direction."],
    ["PLAN THE ENTRY", "Specify your trigger and protective stop; the arrow is an illustrative signal only."],
    ["PLAN THE EXIT", "Define exit, invalidation and costs. An indicator signal does not guarantee an outcome."],
  ],
};

function ema(values: number[], length: number) {
  const k = 2 / (length + 1); let prev = values[0];
  return values.map(v => { prev = prev + k * (v - prev); return prev; });
}

export function MovingAverageChart({ approach, direction = "bullish", step = 3 }: { approach: Approach; direction?: Direction; step?: number }) {
  const special = approach === "range" || approach === "noise" || approach === "overload";
  const mode = approach === "overload" ? "crossover" : special ? "range" : approach;
  const bullish = direction === "bullish";
  // Deterministic synthetic candles. Curves are actually computed from their closes.
  const closes = Array.from({length: 270}, (_, i) => {
    if (mode === "range") return 100 + 2.6 * Math.sin(i * 0.31) + 1.1 * Math.sin(i * 0.91);
    if (mode === "crossover") {
      const trend = i < 222 ? 105 - (i - 200) * 0.22 : 100.16 + (i - 222) * 0.9;
      const v = trend + 1.9 * Math.sin(i * 0.31) + 0.65 * Math.sin(i * 0.83);
      return bullish ? v : 200-v;
    }
    const v = 85 + i * 0.15 + 3.2 * Math.sin(i * 0.21) + 0.8 * Math.sin(i * 0.77);
    return bullish ? v : 200-v;
  });
  const fast = ema(closes,20), slow = ema(closes,50), long = ema(closes,200);
  const start = 210, count = 60, visible = closes.slice(start);
  const allLines = mode === "crossover" ? [...fast.slice(start), ...slow.slice(start)] : mode === "range" ? [...fast.slice(start),...slow.slice(start)] : mode === "filter" ? long.slice(start) : fast.slice(start);
  if (approach === "overload") allLines.push(...long.slice(start));
  const min = Math.min(...visible, ...allLines) - 2.8, max = Math.max(...visible, ...allLines) + 2.8;
  const x = (i: number) => 35 + (i-start) * 12.7;
  const y = (v: number) => 256 - (v-min) / (max-min) * 200;
  const points = (values: number[]) => values.slice(start).map((v,i) => `${x(i+start).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  let event = 245;
  if (mode === "crossover") {
    for (let i=start+1;i<270;i++) if ((bullish && fast[i-1] <= slow[i-1] && fast[i] > slow[i]) || (!bullish && fast[i-1] >= slow[i-1] && fast[i] < slow[i])) { event=i; break; }
  } else if (mode === "support") {
    let best=Infinity; for (let i=230;i<258;i++) { const d=Math.abs(closes[i]-fast[i]); if(d<best){ best=d; event=i; } }
  }
  const eventValue = mode === "crossover" ? fast[event] : mode === "support" ? fast[event] : closes[event];
  const guide = special ? approach === "range" ? ["WHIPSAWS IN A RANGE", "Fast and slow lines can cross repeatedly while price moves sideways."] : approach === "noise" ? ["LOW-TIMEFRAME NOISE", "Frequent fluctuations can trigger signals that quickly reverse."] : ["TOO MANY FILTERS", "Waiting for another slower average can delay confirmation; extra lines are not automatically better."] : GUIDES[approach as "crossover" | "support" | "filter"][Math.min(5,Math.max(0,step))];
  const eventLabel = mode === "crossover" ? "MA cross" : mode === "support" ? (bullish ? "Support area" : "Resistance area") : mode === "filter" ? (bullish ? "Buy signal example" : "Sell signal example") : "Repeated crosses";
  const ex=x(event), ey=y(eventValue);
  return <figure className="overflow-hidden rounded-xl border border-slate-700 bg-[#0b101a]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3"><div><p className="text-xs font-bold tracking-wide text-white">{guide[0]}</p><p className="mt-1 text-xs leading-relaxed text-slate-300">{guide[1]}</p></div><span className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-300">ILLUSTRATIVE CHART</span></div>
    <div className="overflow-x-auto"><svg viewBox="0 0 820 340" role="img" aria-label={`${guide[0]}: ${guide[1]} Synthetic candlestick chart.`} className="block w-full min-w-[640px]">
      <rect width="820" height="340" fill="#101522" />
      {[55,95,135,175,215,255].map(v => <line key={v} x1="20" x2="800" y1={v} y2={v} stroke="#253043" strokeWidth="0.8" />)}
      {[130,257,384,511,638,765].map(v => <line key={v} x1={v} x2={v} y1="40" y2="275" stroke="#202b3b" strokeWidth="0.6" />)}
      <text x="28" y="23" fill="#cbd5e1" fontSize="13" fontWeight="600">SYNTHETIC PRICE · {bullish ? "BULLISH" : "BEARISH"} EXAMPLE</text>
      {visible.map((close,j) => { const i=j+start, open=closes[i-1], top=Math.max(open,close)+0.4+0.2*(i%3), bottom=Math.min(open,close)-0.4-0.12*(i%4), color=close>=open?"#48c998":"#f15b6c"; return <g key={i}><line x1={x(i)} x2={x(i)} y1={y(top)} y2={y(bottom)} stroke={color} strokeWidth="1.3"/><rect x={x(i)-4} y={Math.min(y(open),y(close))} width="8" height={Math.max(2,Math.abs(y(open)-y(close)))} fill={color} rx="0.7" /></g>; })}
      {(mode === "crossover" || mode === "range" || mode === "support") && <polyline points={points(fast)} fill="none" stroke="#56baff" strokeWidth="3" />}
      {(mode === "crossover" || mode === "range") && <polyline points={points(slow)} fill="none" stroke="#f6bf5c" strokeWidth="3" />}
      {(mode === "filter" || approach === "overload") && <polyline points={points(long)} fill="none" stroke={approach === "overload" ? "#c084fc" : "#f6bf5c"} strokeWidth="3" />}
      {mode !== "range" && <g><circle cx={ex} cy={ey} r="12" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3"/><path d={`M${ex} ${ey-13} L${ex} ${Math.max(45,ey-40)} L${Math.min(685,ex+30)} ${Math.max(45,ey-40)}`} fill="none" stroke="#e2e8f0" strokeWidth="1.4"/><rect x={Math.min(680,ex+28)} y={Math.max(31,ey-53)} width="122" height="24" rx="5" fill="#26364a"/><text x={Math.min(688,ex+36)} y={Math.max(47,ey-37)} fill="#fff" fontSize="11" fontWeight="600">{eventLabel}</text></g>}
      {mode === "filter" && <g><path d={bullish ? `M${ex} ${ey+27} l-8 12 h16 z` : `M${ex} ${ey-27} l-8 -12 h16 z`} fill={bullish ? "#34d399" : "#fb7185"}/><text x="30" y="305" fill="#cbd5e1" fontSize="12">▲ / ▼ = example indicator signal (not an actual Supertrend calculation)</text></g>}
      {mode === "support" && <g><line x1="20" x2="800" y1="280" y2="280" stroke="#475569"/><text x="28" y="300" fill="#cbd5e1" fontSize="12">STOCHASTIC · schematic extreme at MA area</text><path d={bullish ? `M310 299 Q${ex-40} 295 ${ex} 317 T780 298` : `M310 310 Q${ex-40} 314 ${ex} 292 T780 311`} fill="none" stroke="#c084fc" strokeWidth="2.5"/><text x={Math.max(320, Math.min(675, ex-35))} y={bullish ? 336 : 292} fill="#e9d5ff" fontSize="11">{bullish?"Oversold example":"Overbought example"}</text></g>}
      {mode !== "support" && mode !== "filter" && <g><text x="28" y="307" fill="#56baff" fontSize="12">━━ Fast 20</text><text x="145" y="307" fill="#f6bf5c" fontSize="12">━━ Slow 50</text>{approach === "overload" && <text x="270" y="307" fill="#c084fc" fontSize="12">━━ Extra 200</text>}</g>}
      {mode === "filter" && <text x="665" y="23" fill="#f6bf5c" fontSize="12">━━ 200 EMA</text>}
      {mode === "support" && <text x="652" y="23" fill="#56baff" fontSize="12">━━ example MA</text>}
    </svg></div>
    <figcaption className="border-t border-slate-800 px-4 py-2 text-xs leading-relaxed text-slate-400">Synthetic OHLC illustration, not a video frame or a trading signal. Lines are example EMAs calculated from simulated closes—not verified video settings; oscillator and indicator markers are schematic. Scroll the chart horizontally on a small screen.</figcaption>
  </figure>;
}
