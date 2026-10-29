import { CheckSquare, Crosshair, ListChecks } from "lucide-react";

export default function PullbackStrategyPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
            Strategy
          </span>
          <span className="text-slate-700">/</span>
          <span className="font-mono text-xs text-slate-400">
            Pullback Strategy
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Pullback Strategy
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Pre-trade execution checklist to verify setup confluence before
              entering a live trade.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-300">
            <Crosshair className="h-3.5 w-3.5" />
            Checklist Module Ready
          </span>
        </div>
      </div>

      {/* Checklist Blueprint Container */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 sm:p-8">
        <div className="mx-auto max-w-xl text-center space-y-4 py-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
            <ListChecks className="h-6 w-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-white">
              Ready for your Pullback Strategy Checklist
            </h2>
            <p className="text-xs leading-relaxed text-slate-400">
              This route (<code className="text-slate-300">/admin/strategy/pullback-strategy</code>)
              is linked to the <strong className="text-slate-200">Strategy</strong>{" "}
              hover menu in the sidebar. Tell me the exact checklist items and
              entry criteria you want here, and we&apos;ll build the interactive
              pre-trade gate next.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-[#090D13] px-3 py-1">
              <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
              Markable Confluence Rules
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-[#090D13] px-3 py-1">
              <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
              Trade Readiness Gate
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-[#090D13] px-3 py-1">
              <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
              One-Click Send to Journal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
