import React from "react";
import type { Pattern } from "@/lib/candlestickPatterns";

export function PatternDrawing({ pattern }: { pattern: Pattern }) {
  const count = pattern.candles.length;
  const chart = count > 8;
  const step = chart ? 220 / Math.max(1,count-1) : count > 4 ? 26 : 44;
  const left = 145 - (count-1)*step/2;
  const width = chart ? 6 : count > 4 ? 14 : 25;
  return <svg viewBox="0 0 290 155" className="block h-40 w-full sm:h-44" role="img" aria-label={`${pattern.name} candlestick diagram`}>
    <rect width="290" height="155" fill="#f5f1e6" />
    {[30,60,90,120].map(y => <line key={y} x1="0" x2="290" y1={y} y2={y} stroke="#d7d0c3" strokeWidth="0.7" />)}
    {[36,72,108,144,180,216,252].map(x => <line key={x} x1={x} x2={x} y1="0" y2="155" stroke="#d7d0c3" strokeWidth="0.7" />)}
    {pattern.curve && <path d={pattern.curve} fill="none" stroke="#29312e" strokeWidth="1.7" />}
    {pattern.lines?.map((line,i)=><line key={i} x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke="#29312e" strokeWidth="1.7" />)}
    {pattern.split && <line x1="145" x2="145" y1="22" y2="132" stroke="#8e877c" strokeDasharray="3 4" />}
    {pattern.candles.map(([open,close,high,low],i)=>{const x=left+i*step;const top=Math.min(open,close), bottom=Math.max(open,close);const color=close < open ? "#0b9e4a" : close > open ? "#ed3341" : "#202a2a";return <g key={i}><line x1={x} x2={x} y1={high} y2={low} stroke="#161f1b" strokeWidth={chart ? 1 : 1.7} /><rect x={x-width/2} y={top} width={width} height={Math.max(2.5,bottom-top)} fill={color} /></g>})}
  </svg>;
}

