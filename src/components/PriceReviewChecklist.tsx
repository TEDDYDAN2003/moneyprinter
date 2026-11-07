"use client";
import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ClipboardCheck, RotateCcw, Tag, X } from "lucide-react";

type Answer = "yes" | "no";
type Question = { id: string; section: string; text: string; guidance?: string; tip?: string; tipLabel?: string };
const QUESTIONS: Question[] = [
  {id:"strategy", section:"Reasons for entry", text:"Is the price movement in line with our trading strategy?"},
  {id:"order-block", section:"Reasons for entry", text:"At the point of entry, are we forecasting an impulsive or corrective move from a valid order block?"},
  {id:"trend", section:"Reasons for entry", text:"Is the prediction in line with the current trending movement?"},
  {id:"candlestick", section:"Reasons for entry", text:"Is there a candlestick pattern at the order-block zone that supports our forecast?"},
  {id:"fvg", section:"Reasons for entry", text:"Is there an FVG in the direction of our forecast that price may fill?", guidance:"An FVG is not guaranteed to attract price or be filled."},
  {id:"news", section:"Reasons for entry", text:"Is there any high-impact (red-marked) market news that might affect the trade between entry and closure?", guidance:"Yes indicates an event to investigate, not a favourable condition."},
  {id:"stop", section:"Reasons for stop loss", text:"Is the planned stop-loss risk within 3% of our overall float?", guidance:"This is a manual check, not an automatic calculation. Spread, commissions, gaps and slippage can increase losses beyond the planned amount."},
  {id:"target", section:"Reasons for take profit", text:"Is the first take-profit at a key level, such as support or resistance?", tipLabel:"Smart tip", tip:"Consider splitting the position into two trades: set the first TP at a key level where you expect a reaction, and the second TP at your forecast target. No reaction or target is guaranteed; keep the combined exposure within your risk plan."},
  {id:"trail", section:"During the trade", text:"Are we adjusting the stop loss as price moves in our favour to reduce risk?", guidance:"Use your written plan; moving a stop can also close a trade early and does not guarantee a loss limit."},
  {id:"inefficiency", section:"During the trade", text:"Are we watching aggressive price patterns and inefficiencies such as FVGs, and checking candlestick confirmation before closing?", guidance:"Inefficiencies can be useful context, but a retracement is not guaranteed.", tipLabel:"Trade management", tip:"Be ready to close the trade at any signal of a retracement, checking candlestick confirmation before closing. Signals can be false."},
];
const START = "[PRICE REVIEW CHECKLIST]";
const END = "[/PRICE REVIEW CHECKLIST]";

export function formatChecklistAnswer(question: string, answer: Answer | undefined, note: string | undefined) {
  const text = note?.trim();
  return `${question}\nAnswer: ${answer?.toUpperCase() ?? "UNANSWERED"}${text ? `\nNotes: ${text}` : ""}`;
}

export function PriceReviewChecklist({ open, onOpenChange, recordOpen, canSave, hideTag, onSave }: {open:boolean; onOpenChange:(open:boolean)=>void; recordOpen:boolean; canSave:boolean; hideTag:boolean; onSave:(block:string)=>void}) {
  const [answers,setAnswers] = useState<Record<string, Answer>>({});
  const [notes,setNotes] = useState<Record<string,string>>({});
  const [saved,setSaved] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previouslyOpen = useRef(false);
  const answered = QUESTIONS.filter(q => answers[q.id]);
  const completed = answered.length === QUESTIONS.length;
  const yes = QUESTIONS.filter(q => answers[q.id] === "yes").length;
  const percentage = yes / QUESTIONS.length * 100;
  const entryQuestions = QUESTIONS.filter(q => q.section !== "During the trade");
  const entryDone = entryQuestions.every(q => answers[q.id]);
  const entryYes = entryQuestions.filter(q => answers[q.id] === "yes").length;
  const flaggedNews = answers.news === "yes";
  useEffect(() => {
    if (open) { previouslyOpen.current = true; closeButton.current?.focus(); }
    else if (previouslyOpen.current) { openButton.current?.focus(); previouslyOpen.current = false; }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (hideTag) return; // A higher-level screenshot or other modal has keyboard priority.
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onOpenChange(false); return; }
      // When both panels are open, keyboard users must be able to move between them.
      if (event.key === "Tab" && !recordOpen && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), a[href]'));
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) {event.preventDefault(); items[items.length-1].focus();}
        else if (!event.shiftKey && document.activeElement === items[items.length-1]) {event.preventDefault(); items[0].focus();}
      }
    };
    document.addEventListener("keydown",keydown);
    return () => document.removeEventListener("keydown",keydown);
  },[open,recordOpen,hideTag,onOpenChange]);
  const save = () => {
    const rows = QUESTIONS.map((q,i) => `${i === 0 || QUESTIONS[i-1].section !== q.section ? `\n${q.section.toUpperCase()}\n` : ""}${i+1}. ${formatChecklistAnswer(q.text, answers[q.id], notes[q.id])}`);
    const score = completed ? `Readiness score (YES count): ${yes}/${QUESTIONS.length} (${percentage.toFixed(1)}%). This is not a probability of profit.` : `Readiness score: incomplete (${answered.length}/${QUESTIONS.length} answered).`;
    onSave(`${START}\n${score}\n${flaggedNews ? "WARNING: High-impact news marked YES.\n" : ""}\n${rows.join("\n\n")}\n${END}`);
    setSaved(true);
  };
  const reset = () => { if (answered.length || Object.values(notes).some(Boolean)) { if (!window.confirm("Clear all checklist answers and notes? This will not remove anything already copied into the journal form.")) return; } setAnswers({});setNotes({});setSaved(false); };
  return <>
    {!open && !hideTag && <button ref={openButton} type="button" onClick={()=>onOpenChange(true)} aria-label="Open price review checklist" aria-haspopup="dialog" className="fixed right-0 top-[42%] z-[65] flex items-center gap-2 rounded-l-xl border border-r-0 border-emerald-400/50 bg-emerald-500 px-3 py-3 text-slate-950 shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-white"><Tag className="h-4 w-4"/><span className="text-xs font-bold">Price Review</span></button>}
    {open && <>
      {!recordOpen && <div aria-hidden="true" onClick={()=>onOpenChange(false)} className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-xs" />}
      <aside ref={panelRef} role="dialog" aria-modal={!recordOpen} aria-labelledby="price-review-title" className={`fixed right-0 z-[60] flex w-full flex-col border-l border-slate-700 bg-[#0b1018] shadow-2xl ${recordOpen ? "bottom-0 h-[50dvh] md:inset-y-0 md:h-full md:w-[45%] lg:w-[min(40vw,32rem)]" : "inset-y-0 h-full max-w-xl"}`}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">Trading journal / checklist</p><h2 id="price-review-title" className="mt-1 flex items-center gap-2 text-lg font-bold text-white"><ClipboardCheck className="h-5 w-5 text-emerald-400"/>Price Review</h2><p className="mt-1 text-xs text-slate-400">{answered.length} of {QUESTIONS.length} answered · answers remain in this page until reset or reload.</p></div><div className="flex gap-2"><button type="button" onClick={reset} aria-label="Reset checklist" title="Reset checklist" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:text-white"><RotateCcw className="h-4 w-4" /></button><button ref={closeButton} type="button" onClick={()=>onOpenChange(false)} aria-label="Close price review checklist" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:text-white"><X className="h-4 w-4" /></button></div></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-300">Choose Yes or No for each question, then add optional notes. During-trade questions are separate from entry review but are included in the final Yes count.</p>
          {QUESTIONS.map((q,i)=><React.Fragment key={q.id}>{(i===0 || QUESTIONS[i-1].section!==q.section) && <h3 className="pt-1 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">{q.section}</h3>}<fieldset className="rounded-xl border border-slate-800 bg-[#111823] p-3.5"><legend className="sr-only">{q.text}</legend><p className="text-sm font-medium leading-relaxed text-slate-200">{q.text}</p>{q.guidance && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{q.guidance}</p>}{q.tip && <div className="mt-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3 text-xs leading-relaxed text-slate-300"><span className="mr-1.5 font-bold uppercase tracking-wide text-cyan-300">{q.tipLabel}:</span>{q.tip}</div>}<div className="mt-3 flex gap-2">{(["yes","no"] as Answer[]).map(value=><button key={value} type="button" aria-pressed={answers[q.id]===value} onClick={()=>{setAnswers(prev=>({...prev,[q.id]:value}));setSaved(false);}} className={`rounded-lg border px-4 py-1.5 text-xs font-bold uppercase transition ${answers[q.id]===value ? value==="yes" ? "border-emerald-500 bg-emerald-500/20 text-emerald-300" : "border-rose-500 bg-rose-500/20 text-rose-300" : "border-slate-700 bg-slate-950/40 text-slate-400 hover:border-slate-500"}`}>{value}</button>)}</div>{answers[q.id] && <label className="mt-3 block text-xs text-slate-400">Notes <span className="text-slate-600">(optional)</span><textarea rows={2} value={notes[q.id] || ""} onChange={event=>{setNotes(prev=>({...prev,[q.id]:event.target.value}));setSaved(false);}} placeholder="Add your observations…" className="mt-1 block w-full rounded-lg border border-slate-700 bg-[#090d14] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" /></label>}</fieldset></React.Fragment>)}
          {flaggedNews && <div role="alert" className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0"/><span>High-impact news was marked Yes. Review its timing and risk; a Yes here is counted in the percentage but is not a positive confirmation.</span></div>}
          <section aria-live="polite" className="rounded-xl border border-slate-700 bg-[#080d14] p-4"><h3 className="text-sm font-bold text-white">Readiness score</h3>{completed ? <><p className="mt-2 text-2xl font-bold text-emerald-300">{percentage.toFixed(1)}%</p><p className="mt-1 text-xs text-slate-300">{yes} Yes out of {QUESTIONS.length} answers · {percentage > 75 ? "Above the 75% checklist threshold" : "Not above the 75% checklist threshold"}.</p></> : <p className="mt-2 text-xs text-slate-400">Answer all {QUESTIONS.length} questions to see the overall Yes percentage. {entryDone && `Entry and risk review: ${entryYes}/${entryQuestions.length} Yes (${(entryYes / entryQuestions.length * 100).toFixed(1)}%); the during-trade questions remain separate.`}</p>}<p className="mt-2 text-xs leading-relaxed text-slate-500">This is a simple count of Yes answers—not a probability of profit or a recommendation to trade. The news question is counted even though Yes may indicate risk.</p></section>
        </div>
        <div className="shrink-0 border-t border-slate-800 bg-[#0b1018] px-4 py-3"><button type="button" disabled={!canSave} onClick={save} className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">Copy checklist to journal notes</button><p role="status" className="mt-2 text-xs leading-relaxed text-slate-400">{!recordOpen ? "Open a New or Edit journal record to copy the checklist into its notes." : !canSave ? "This record is read-only; detach it before editing its notes." : saved ? "Copied to the form’s Study / Backtest Notes. Save the journal record to persist it." : "Your existing notes are kept. Save the journal record after copying; the checklist itself has no separate storage."}</p></div>
      </aside>
    </>}
  </>;
}
