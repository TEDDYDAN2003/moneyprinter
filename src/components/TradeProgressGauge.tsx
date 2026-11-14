"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, Crosshair, ShieldCheck, Target, Zap } from "lucide-react";

export type TradeSetup = {
  entry_idx: number;
  entry_time: number;
  exit_idx: number;
  exit_time: number;
  direction: number;
  entry: number;
  sl: number;
  tp: number;
  risk: number;
  rr: number;
  outcome?: string;
  r?: number;
  pattern?: string;
};

interface TradeProgressGaugeProps {
  trade: TradeSetup | null;
  currentClose: number;
  patternName?: string;
}

export function TradeProgressGauge({ trade, currentClose, patternName }: TradeProgressGaugeProps) {
  if (!trade) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0d131d] p-3 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Crosshair size={13} className="text-slate-500" /> Trade Range & Trajectory
          </span>
          <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">Idle / Monitoring</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Click a candle with a confirmed signal or run a backtest to inspect live trade trajectory, structural TP, and invalidation SL.
        </p>
      </div>
    );
  }

  const isLong = trade.direction === 1;
  const entry = trade.entry;
  const sl = trade.sl;
  const tp = trade.tp;
  const risk = Math.max(0.01, Math.abs(entry - sl));
  const reward = Math.max(0.01, Math.abs(tp - entry));

  // Current distance in R multiples
  const diffFromEntry = isLong ? currentClose - entry : entry - currentClose;
  const currentR = diffFromEntry / risk;
  
  // Progress towards TP (0% at entry, 100% at TP, -100% at SL)
  let progressPct = 0;
  if (diffFromEntry >= 0) {
    progressPct = Math.min(100, (diffFromEntry / reward) * 100);
  } else {
    progressPct = Math.max(-100, (diffFromEntry / risk) * 100);
  }

  // Calculate position percentage across the full SL-to-TP spectrum (0% = SL, entry = 50%, 100% = TP)
  const totalRange = Math.abs(tp - sl);
  let gaugePos = 50;
  if (totalRange > 0) {
    if (isLong) {
      gaugePos = Math.max(0, Math.min(100, ((currentClose - sl) / totalRange) * 100));
    } else {
      gaugePos = Math.max(0, Math.min(100, ((sl - currentClose) / totalRange) * 100));
    }
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#0d131d] p-3.5 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
              isLong ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            }`}
          >
            {isLong ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {isLong ? "Hypothetical Long" : "Hypothetical Short"}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {trade.rr.toFixed(2)}R Target
          </span>
        </div>
        <div className="flex items-center gap-2">
          {trade.pattern && trade.pattern !== "Standard" && (
            <span className="flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
              <Zap size={10} /> {trade.pattern}
            </span>
          )}
          {trade.outcome && (
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                trade.outcome === "win" ? "bg-emerald-500/30 text-emerald-300" : trade.outcome === "loss" ? "bg-rose-500/30 text-rose-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {trade.outcome} ({trade.r !== undefined && trade.r > 0 ? `+${trade.r.toFixed(2)}R` : `${trade.r?.toFixed(2)}R`})
            </span>
          )}
        </div>
      </div>

      {/* Numerical Levels Overview */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-rose-950/30 border border-rose-900/40 p-2">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-rose-400 font-semibold">
            <ShieldCheck size={11} /> Stop Loss
          </div>
          <div className="mt-0.5 font-mono text-sm font-bold text-rose-300">${sl.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 font-mono">Risk: ${risk.toFixed(2)}</div>
        </div>

        <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-slate-400 font-semibold">
            <Crosshair size={11} /> Entry
          </div>
          <div className="mt-0.5 font-mono text-sm font-bold text-slate-200">${entry.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500">Signal Close</div>
        </div>

        <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/40 p-2">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-emerald-400 font-semibold">
            <Target size={11} /> Target (TP)
          </div>
          <div className="mt-0.5 font-mono text-sm font-bold text-emerald-300">${tp.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 font-mono">Gain: ${reward.toFixed(2)}</div>
        </div>
      </div>

      {/* Dynamic Range / Trajectory Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            Trajectory:{" "}
            <strong className={currentR >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {currentR >= 0 ? `+${currentR.toFixed(2)}R` : `${currentR.toFixed(2)}R`}
            </strong>
          </span>
          <span className="font-mono text-slate-300">
            {diffFromEntry >= 0
              ? `${progressPct.toFixed(0)}% towards TP`
              : `${Math.abs(progressPct).toFixed(0)}% in Drawdown`}
          </span>
        </div>

        {/* Visual Dual-sided Progress Bar */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
          {/* Middle mark for entry */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600 z-10" />

          {/* Left side (SL drawdown zone) */}
          <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-rose-900/60 to-rose-950/20" />
          
          {/* Right side (TP profit zone) */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-emerald-950/20 to-emerald-900/60" />

          {/* Floating cursor representing current price */}
          <div
            className="absolute top-0 bottom-0 w-2.5 -ml-1.25 rounded-full z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300"
            style={{
              left: `${gaugePos}%`,
              backgroundColor: currentR >= 0 ? "#10b981" : "#f43f5e",
            }}
          />
        </div>

        <div className="flex justify-between text-[9px] uppercase tracking-wider text-slate-500">
          <span className="text-rose-400">SL -1.0R</span>
          <span className="text-slate-400 font-semibold">Entry 0.0R</span>
          <span className="text-emerald-400">TP +{trade.rr.toFixed(1)}R</span>
        </div>
      </div>
    </div>
  );
}
