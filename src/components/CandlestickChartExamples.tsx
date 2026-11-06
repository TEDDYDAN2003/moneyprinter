"use client";
import React, { useState } from "react";
import { ExternalLink, Maximize2 } from "lucide-react";
import { JournalImageViewer } from "@/components/JournalImageViewer";

type Example = {url:string; alt:string};
function Chart({example, sourceUrl, onOpen}: {example:Example; sourceUrl:string; onOpen:()=>void}) {
  const [failed,setFailed] = useState(false);
  return <figure className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0e131b]">{failed ? <div className="p-6 text-sm text-amber-200">This externally hosted image could not load. <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">Open the source article</a> to view the example.</div> : <button type="button" onClick={onOpen} aria-label={`Expand chart: ${example.alt}`} className="relative block w-full bg-[#090d13] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={example.url} alt={example.alt} onError={()=>setFailed(true)} loading="lazy" referrerPolicy="no-referrer" className="mx-auto max-h-[600px] w-full object-contain" /><span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-black/80 px-2 py-1.5 text-xs text-white"><Maximize2 className="h-3.5 w-3.5" /> Expand</span></button>}<figcaption className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs leading-relaxed text-slate-400"><span>{example.alt}</span><a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">WR Trading <ExternalLink className="h-3 w-3" /></a></figcaption></figure>;
}
export function CandlestickChartExamples({ examples, sourceUrl }: {examples:Example[]; sourceUrl:string}) {
  const [open,setOpen] = useState<Example | null>(null);
  if (!examples.length) return <p className="rounded-xl border border-slate-800 bg-[#0e131b] p-4 text-sm text-slate-400">No matching historical chart for this direction was identified in the source section. <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">View the source section</a>.</p>;
  return <div className="space-y-4">{examples.map(example=><Chart key={example.url} example={example} sourceUrl={sourceUrl} onOpen={()=>setOpen(example)} />)}{open && <JournalImageViewer url={open.url} name={open.alt} onClose={()=>setOpen(null)} />}</div>;
}
