"use client";

import React, { useState } from "react";
import { ArrowDownRight, ArrowUpRight, BookOpen, ExternalLink, Maximize2, Minus, Sparkles } from "lucide-react";
import { JournalImageViewer } from "@/components/JournalImageViewer";

type Category = "bullish" | "bearish" | "neutral";
// Open, close, high and low expressed as vertical drawing coordinates (smaller y = higher price).
type Candle = [number, number, number, number];
type Pattern = { name: string; category: Category; candles: Candle[]; lines?: [number,number,number,number][]; curve?: string; split?: boolean };
const C = (open: number, close: number, high: number, low: number): Candle => [open,close,high,low];
const prices = (values: number[]): Candle[] => values.slice(1).map((close,i) => C(values[i],close,Math.min(values[i],close)-3,Math.max(values[i],close)+3));

// Drawings are original schematic reconstructions of the user's reference poster.
const PATTERNS: Pattern[] = [
  {name:"Doji", category:"neutral", candles:[C(75,75,27,123)]},
  {name:"Dragonfly Doji", category:"bullish", candles:[C(32,31,30,125)]},
  {name:"Gravestone Doji", category:"bearish", candles:[C(118,119,27,120)]},
  {name:"Hammer", category:"bullish", candles:[C(55,32,30,125)]},
  {name:"Inverted Hammer", category:"bullish", candles:[C(120,97,27,122)]},
  {name:"Hanging Man", category:"bearish", candles:[C(32,55,30,125)]},
  {name:"Bullish Spinning Top", category:"bullish", candles:[C(88,65,32,122)]},
  {name:"Bearish Spinning Top", category:"bearish", candles:[C(65,88,32,122)]},
  {name:"Bullish Marubozu", category:"bullish", candles:[C(123,30,30,123)]},
  {name:"Bearish Marubozu", category:"bearish", candles:[C(30,123,30,123)]},
  {name:"Bullish Kicker", category:"bullish", candles:[C(65,109,54,117),C(55,30,22,57)]},
  {name:"Bearish Kicker", category:"bearish", candles:[C(68,24,16,76),C(82,105,79,119)]},
  {name:"Bullish Engulfing", category:"bullish", candles:[C(57,101,48,112),C(123,31,21,130)]},
  {name:"Bearish Engulfing", category:"bearish", candles:[C(101,57,48,112),C(31,123,21,130)]},
  {name:"Piercing Line", category:"bullish", candles:[C(32,105,21,116),C(118,57,45,126)]},
  {name:"Dark Cloud Cover", category:"bearish", candles:[C(118,45,34,127),C(31,92,23,104)]},
  {name:"Tweezer Bottom", category:"bullish", candles:[C(35,110,25,123),C(108,35,25,123)]},
  {name:"Tweezer Top", category:"bearish", candles:[C(112,38,27,123),C(38,112,27,123)]},
  {name:"Bullish Harami", category:"bullish", candles:[C(27,120,19,130),C(97,52,42,109)]},
  {name:"Bearish Harami", category:"bearish", candles:[C(120,27,19,130),C(52,97,42,109)]},
  {name:"Morning Star", category:"bullish", candles:[C(34,102,22,111),C(116,113,103,128),C(105,45,34,115)]},
  {name:"Bullish Abandoned Baby", category:"bullish", candles:[C(30,74,21,81),C(110,109,100,119),C(75,31,21,83)]},
  {name:"Bearish Abandoned Baby", category:"bearish", candles:[C(120,77,69,129),C(42,41,32,51),C(77,120,69,129)]},
  {name:"Three White Soldiers", category:"bullish", candles:[C(120,100,95,125),C(100,78,72,105),C(78,55,49,84)]},
  {name:"Three Black Crows", category:"bearish", candles:[C(35,57,29,62),C(57,79,52,84),C(79,102,74,108)]},
  {name:"Three Line Strike", category:"neutral", split:true, candles:[C(40,54,35,60),C(54,68,49,74),C(68,82,63,88),C(87,35,29,94),C(110,96,91,116),C(96,82,77,102),C(82,68,63,88),C(63,115,57,122)]},
  {name:"Cup and Handle", category:"bullish", candles:prices([35,45,53,67,79,89,96,103,105,103,97,89,76,58,41,33,41,50,48,39]), curve:"M35 42 C70 80 93 110 144 110 S201 67 219 39 M220 39 L244 52"},
  {name:"Double Top", category:"bearish", candles:prices([118,102,90,76,62,45,38,52,69,78,66,50,40,39,55,72,90,105,118]), lines:[[35,34,248,34]]},
  {name:"Double Bottom", category:"bullish", candles:prices([31,44,58,75,91,110,119,103,88,79,91,107,118,105,89,72,58,42,31]), lines:[[35,123,248,123]]},
  {name:"Wedge", category:"neutral", candles:prices([44,30,52,38,62,50,72,60,81,71,90,81,96,91,104]), lines:[[35,24,255,96],[35,110,255,124]]},
  {name:"Flag", category:"neutral", candles:prices([115,95,65,29,52,75,45,65,52,63,57,63,60]), lines:[[35,26,250,77],[35,126,250,77]]},
  {name:"Rising Window", category:"bullish", candles:[C(45,67,36,74),C(70,91,64,100),C(95,110,89,119),C(110,89,82,117),C(61,25,18,68)]},
  {name:"Falling Window", category:"bearish", candles:[C(118,97,90,125),C(97,76,69,104),C(76,55,48,83),C(55,77,48,84),C(101,128,94,135)]},
  {name:"Three Inside Up", category:"bullish", candles:[C(45,108,36,115),C(105,78,72,111),C(78,25,18,85)]},
  {name:"Three Inside Down", category:"bearish", candles:[C(108,45,36,115),C(48,75,40,81),C(75,128,69,135)]},
  {name:"Three Outside Up", category:"bullish", candles:[C(66,91,60,98),C(108,48,40,116),C(50,25,18,57)]},
  {name:"Three Outside Down", category:"bearish", candles:[C(89,64,57,96),C(47,107,39,115),C(105,130,98,138)]},
];

function PatternDrawing({ pattern }: { pattern: Pattern }) {
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

const TAB_CONFIG = {
  bullish: { label:"Bullish", color:"border-emerald-500/40 bg-emerald-500/10 text-emerald-300", hover:"hover:border-emerald-500/45", Icon:ArrowUpRight },
  bearish: { label:"Bearish", color:"border-rose-500/40 bg-rose-500/10 text-rose-300", hover:"hover:border-rose-500/45", Icon:ArrowDownRight },
  neutral: { label:"Neutral / Context", color:"border-amber-500/40 bg-amber-500/10 text-amber-300", hover:"hover:border-amber-500/45", Icon:Minus },
} as const;
const IMAGE = "/images/candlesticks/candlestick-patterns-overview.webp";

export default function CandlestickCheatsheetPage() {
  const [tab,setTab] = useState<Category>("bullish");
  const [showPoster,setShowPoster] = useState(false);
  const current = PATTERNS.filter(pattern => pattern.category === tab);
  const config = TAB_CONFIG[tab];
  return <div className="space-y-7">
    <header className="border-b border-slate-800/80 pb-6"><p className="font-mono text-xs uppercase tracking-widest text-emerald-400">Trading workspace / Visual reference</p><h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Candlestick Cheatsheet</h1><p className="mt-2 text-sm text-slate-400">A visual library of 37 patterns, arranged by directional context.</p><a href="https://www.wikihow.com/Candlestick-Patterns-Cheat-Sheet" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:underline"><BookOpen className="h-3.5 w-3.5" /> Source: wikiHow candlestick pattern cheat sheet <ExternalLink className="h-3 w-3" /></a></header>
    <section aria-labelledby="poster-title" className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0e131b]"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><h2 id="poster-title" className="text-base font-bold text-white">Candlestick Patterns Overview</h2><p className="text-xs text-slate-400">Your reference poster · select to enlarge</p></div><button type="button" onClick={()=>setShowPoster(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:border-emerald-500/50"><Maximize2 className="h-3.5 w-3.5 text-emerald-400" /> Expand poster</button></div><button type="button" onClick={()=>setShowPoster(true)} aria-label="Open candlestick patterns overview image" className="block w-full border-t border-slate-800 bg-[#080b10] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-400">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={IMAGE} alt="Candlestick pattern overview poster from wikiHow showing 37 named patterns" className="mx-auto max-h-[580px] w-full object-contain" /></button><p className="px-5 py-3 text-xs text-slate-500">Poster supplied by you · wikiHow. Individual cards below are schematic redrawings.</p></section>
    <section aria-labelledby="pattern-library"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="pattern-library" className="text-xl font-bold text-white">Pattern Library</h2><p className="mt-1 text-xs text-slate-400">Select a category to browse the visual cards.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-300"><Sparkles className="h-3.5 w-3.5" /> 37 patterns</span></div>
      <div role="group" aria-label="Pattern categories" className="mt-5 flex flex-wrap gap-2">{(["bullish","bearish","neutral"] as Category[]).map(key=>{const item=TAB_CONFIG[key];const Icon=item.Icon;return <button key={key} type="button" aria-pressed={tab===key} onClick={()=>setTab(key)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${tab===key ? item.color : "border-slate-800 bg-[#0e131b] text-slate-400 hover:border-slate-600 hover:text-white"}`}><Icon className="h-4 w-4" />{key === "neutral" ? "Neutral" : item.label}<span className="rounded-md bg-black/20 px-1.5 text-xs">{PATTERNS.filter(p=>p.category===key).length}</span></button>})}</div>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">Patterns depend on context and confirmation and do not guarantee an outcome. “Neutral” includes patterns whose direction depends on the trend; some larger examples are chart formations rather than single candlesticks.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{current.map((pattern,index)=><article key={pattern.name} className={`group overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B] transition ${config.hover}`}><div className="overflow-hidden border-b border-slate-800/80 bg-[#080B10]"><PatternDrawing pattern={pattern} /></div><div className="flex items-center justify-between gap-3 p-4"><h3 className="text-sm font-bold text-white sm:text-base">{pattern.name}</h3><span className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[10px] font-semibold uppercase ${config.color}`}>{tab === "neutral" && pattern.name === "Three Line Strike" ? "Context" : config.label}</span></div></article>)}</div>
    </section>
    {showPoster && <JournalImageViewer url={IMAGE} name="Candlestick Patterns Overview · wikiHow" onClose={()=>setShowPoster(false)} />}
  </div>;
}
