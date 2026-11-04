"use client";
import React from "react";

/** Conceptual trend + MA touch and oscillator; not recorded chart data. */
export function MovingAverageSupportDiagram({ direction }: { direction: "bullish" | "bearish" }) {
  const bullish = direction === "bullish";
  // Mirror the entire price diagram vertically to preserve the pullback geometry.
  const mirror = (y: number) => bullish ? y : 190 - y;
  const candles = [
    [145,134],[134,125],[125,114],[114,104],[104,94],[94,98],
    [98,105],[105,112],[112,118],[118,111],[111,99],[99,89],[89,79],
  ];
  const ma = [[25,157],[60,149],[95,140],[130,131],[165,122],[200,116],[235,110],[270,105],[305,99],[340,91],[375,82],[410,73]];
  const pricePoints = ma.map(([x,y]) => `${x},${mirror(y)}`).join(" ");
  return <figure className="rounded-xl border border-slate-800 bg-[#080d14] p-3">
    <svg viewBox="0 0 440 280" role="img" aria-label={bullish ? "Illustration of price pulling back to a rising moving average and an oversold stochastic reading" : "Illustration of price rallying to a falling moving average and an overbought stochastic reading"} className="w-full">
      <rect width="440" height="280" rx="10" fill="#0a1019" />
      {[45,85,125,165,205,245].map(y => <line key={y} x1="20" x2="420" y1={y} y2={y} stroke="#1d2938" strokeDasharray="3 5" />)}
      <text x="20" y="20" fill="#cbd5e1" fontSize="10">PRICE · illustrative candles</text><text x="275" y="20" fill="#38bdf8" fontSize="10">━ dynamic MA</text>
      <polyline points={pricePoints} fill="none" stroke="#38bdf8" strokeWidth="3" />
      {candles.map(([o,c], i) => { const x=35+i*29; const open=mirror(o), close=mirror(c); const top=Math.min(open,close), bottom=Math.max(open,close), color=close<open?"#34d399":"#fb7185"; return <g key={i}><line x1={x} x2={x} y1={top-6} y2={bottom+6} stroke={color}/><rect x={x-4} y={top} width="8" height={Math.max(3,bottom-top)} rx="1" fill={color}/></g>; })}
      <circle cx="267" cy={mirror(110)} r="11" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" />
      <text x="280" y={mirror(110)+(bullish?18:-15)} fill="#fbbf24" fontSize="10">{bullish?"Support area":"Resistance area"}</text>
      <line x1="20" x2="420" y1="190" y2="190" stroke="#334155" />
      <text x="20" y="205" fill="#cbd5e1" fontSize="10">STOCHASTIC · schematic</text>
      <line x1="25" x2="410" y1="215" y2="215" stroke="#64748b" strokeDasharray="4 4"/><line x1="25" x2="410" y1="258" y2="258" stroke="#64748b" strokeDasharray="4 4"/>
      <text x="375" y="212" fill="#94a3b8" fontSize="9">80*</text><text x="375" y="270" fill="#94a3b8" fontSize="9">20*</text>
      <path d={bullish ? "M30 225 C75 218 120 226 160 238 S220 263 260 265 S340 244 400 230" : "M30 250 C75 257 120 249 160 237 S220 212 260 209 S340 229 400 243"} stroke="#c084fc" strokeWidth="2.5" fill="none" />
      <text x="230" y={bullish ? 257 : 220} fill="#fbbf24" fontSize="9">{bullish?"oversold":"overbought"}</text>
    </svg>
    <figcaption className="mt-1 text-[10px] text-slate-500">Illustrative only. *20/80 are example thresholds, not verified video settings; MA and oscillator lines are schematic, not calculated data.</figcaption>
  </figure>;
}
