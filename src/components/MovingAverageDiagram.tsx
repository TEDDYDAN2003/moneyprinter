"use client";
import React from "react";

type Variant = "bullish" | "bearish" | "range" | "overload" | "noise";
/** Illustrative price action and MAs; not actual chart data. */
export function MovingAverageDiagram({ variant }: { variant: Variant }) {
  const isBear = variant === "bearish";
  const isRange = variant === "range" || variant === "noise";
  const close = isRange
    ? [110,94,114,91,109,95,116,93,108,94,112,98,114,92,109,95,110,96,112]
    : isBear
      ? [65,71,67,76,78,84,79,91,94,89,101,108,103,114,121,117,131,138,133]
      : [140,132,136,125,122,116,120,108,105,110,98,91,95,84,77,81,67,60,65];
  const fast = isRange ? "M30 104 C80 101 95 109 135 103 S190 100 225 105 S275 100 320 104 S365 101 400 104" : isBear ? "M30 76 C105 73 150 90 210 101 S315 117 400 131" : "M30 125 C105 128 150 111 210 100 S315 84 400 70";
  const slow = isRange ? "M30 105 C100 104 150 103 210 104 S320 105 400 104" : isBear ? "M30 86 C110 84 155 91 210 100 S320 109 400 119" : "M30 115 C110 117 155 110 210 101 S320 92 400 82";
  return <figure className="rounded-xl border border-slate-800 bg-[#080d14] p-3">
    <svg viewBox="0 0 430 175" role="img" aria-label={`Illustrative ${variant} moving-average chart with candlesticks`} className="w-full">
      <rect width="430" height="175" rx="10" fill="#0a1019" />
      {[48,84,120,156].map(y => <line key={y} x1="20" x2="410" y1={y} y2={y} stroke="#1d2938" strokeDasharray="3 5" />)}
      {close.map((v,i) => {const o=i===0?v+4:close[i-1]; const c=v; const up=c<o; const col=up?"#34d399":"#fb7185"; const x=30+i*20; return <g key={i}><line x1={x} x2={x} y1={Math.min(o,c)-5} y2={Math.max(o,c)+5} stroke={col}/><rect x={x-3} y={Math.min(o,c)} width="6" height={Math.max(3,Math.abs(c-o))} fill={col} rx="1"/></g>})}
      {variant === "overload" && <path d="M30 112 C110 116 180 111 245 104 S350 97 400 90" fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 4" />}
      <path d={slow} fill="none" stroke="#fbbf24" strokeWidth="2.5"/><path d={fast} fill="none" stroke="#38bdf8" strokeWidth="2.5"/>
      <text x="24" y="20" fill="#38bdf8" fontSize="10">━ 20 fast MA</text><text x="120" y="20" fill="#fbbf24" fontSize="10">━ 50 slow MA</text>
      {variant === "overload" && <text x="226" y="20" fill="#c4b5fd" fontSize="10">┄ extra slow MA</text>}
      <rect x="245" y="145" width="158" height="20" rx="6" fill="#172334"/><text x="254" y="159" fill="#cbd5e1" fontSize="10">{variant === "range" ? "Repeated false crosses" : variant === "overload" ? "More filters can delay" : variant === "noise" ? "Choppy price / noise" : isBear ? "20 crosses below 50 ↓" : "20 crosses above 50 ↑"}</text>
    </svg><figcaption className="mt-1 text-[10px] text-slate-500">Illustrative diagram · candlesticks and MA lines are not market data.</figcaption>
  </figure>;
}
