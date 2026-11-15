"use client";
import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Award, 
  Crosshair, 
  DollarSign, 
  Percent, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Zap,
  Activity
} from "lucide-react";
import type { SniperState, SniperSettings } from "@/lib/sniperReplay";
import { computeSniperStats } from "@/lib/sniperReplay";

interface Props {
  state: SniperState;
  settings: SniperSettings;
  onClose?: () => void;
}

export function SniperDashboard({ state, settings, onClose }: Props) {
  const [showLog, setShowLog] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const stats = computeSniperStats(state.outcomes, settings.initialBalance, state.balance);
  const isProfit = stats.netDollars >= 0;
  const p = state.activePlan;

  return (
    <div 
      className="fixed bottom-6 right-6 z-40 w-96 rounded-2xl border border-emerald-500/40 bg-slate-950/95 p-4 text-xs text-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-200 select-none"
      style={{ boxShadow: "0 0 25px -5px rgba(16, 185, 129, 0.25)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
            <Crosshair size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold tracking-wide text-white">
              <span>SNIPER SIMULATOR</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                INSTITUTIONAL
              </span>
            </div>
            <p className="text-[10px] text-slate-400">3 Rules · 1-2 Trades/Day Max</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Real-time Balance & Net P&L Hero Card */}
          <div className="mt-3 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium text-slate-400">Account Equity</span>
              <span className={`flex items-center text-xs font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {isProfit ? <TrendingUp size={13} className="mr-1 inline" /> : <TrendingDown size={13} className="mr-1 inline" />}
                {isProfit ? "+" : ""}${stats.netDollars.toFixed(2)} ({isProfit ? "+" : ""}{stats.netReturnPct.toFixed(2)}%)
              </span>
            </div>
            <div className="mt-1 font-mono text-2xl font-extrabold tracking-tight text-white">
              ${state.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
              <span>Daily Quota: <b className="text-amber-400 font-mono">{state.todayTradesCount} / {settings.maxTradesPerDay}</b> trades</span>
              <span>Initial: <b className="text-slate-300 font-mono">${settings.initialBalance.toLocaleString()}</b></span>
            </div>
          </div>

          {/* Key Algorithmic Performance HUD Grid */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {/* Win Rate */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400">
                <Percent size={11} className="text-cyan-400" />
                <span>Win Rate</span>
              </div>
              <div className="mt-1 font-mono text-base font-bold text-white">
                {stats.totalTrades > 0 ? `${stats.winRate}%` : "—"}
              </div>
              <div className="text-[9px] text-slate-500">
                {stats.winCount}W · {stats.lossCount}L
              </div>
            </div>

            {/* Profit Factor */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400">
                <Award size={11} className="text-amber-400" />
                <span>Profit Factor</span>
              </div>
              <div className="mt-1 font-mono text-base font-bold text-amber-300">
                {stats.totalTrades > 0 ? stats.profitFactor.toFixed(2) : "—"}
              </div>
              <div className="text-[9px] text-slate-500">
                Target &gt; 2.0
              </div>
            </div>

            {/* Drawdown */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-400">
                <ShieldAlert size={11} className="text-rose-400" />
                <span>Max DD</span>
              </div>
              <div className="mt-1 font-mono text-base font-bold text-rose-300">
                {state.maxDrawdownPct > 0 ? `-${state.maxDrawdownPct.toFixed(1)}%` : "0.0%"}
              </div>
              <div className="text-[9px] text-slate-500">
                Curr: {state.currentDrawdownPct > 0 ? `-${state.currentDrawdownPct.toFixed(1)}%` : "0%"}
              </div>
            </div>
          </div>

          {/* Active Plan / Status Banner */}
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Live Status</span>
              {p ? (
                <div className="flex items-center gap-1">
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                    {p.setupType === 'EXPANSION_RUNNER' ? '🚀 RUNNER' : 'SCALP'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${p.direction === 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {p.filledIndex !== null ? "FILLED" : "LIMIT"}
                  </span>
                </div>
              ) : (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] text-slate-400">SCANNING</span>
              )}
            </div>

            {p ? (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-400">Order:</span>
                  <span className={p.direction === 1 ? "font-bold text-emerald-400" : "font-bold text-rose-400"}>
                    {p.direction === 1 ? "BUY" : "SELL"} @ ${p.entry.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  <div className="rounded bg-slate-950 px-2 py-1">
                    <span className="text-[9px] text-slate-500">TP Target:</span>
                    <div className="font-bold text-emerald-400">${p.target.toFixed(2)}</div>
                  </div>
                  <div className="rounded bg-slate-950 px-2 py-1">
                    <span className="text-[9px] text-slate-500">Stop Loss:</span>
                    <div className="font-bold text-rose-400">${p.stop.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Lots: <b className="text-white font-mono">{p.lots} lots</b> (100 oz/lot)</span>
                  <span>RR: <b className="text-emerald-400 font-mono">{p.rr}R</b></span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Session: <span className="text-amber-300 font-semibold">{p.session}</span> · Spread: <span className="text-slate-300 font-mono">${settings.spreadDollars}/oz</span>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                {state.status}
              </p>
            )}
          </div>

          {/* Outcome Log Collapsible */}
          <div className="mt-2.5">
            <button
              onClick={() => setShowLog(!showLog)}
              className="flex w-full items-center justify-between text-[10px] font-semibold text-slate-400 hover:text-white"
            >
              <span>Execution Log ({state.outcomes.length})</span>
              <span>{showLog ? "Hide ▲" : "Show ▼"}</span>
            </button>

            {showLog && (
              <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
                {state.outcomes.length === 0 ? (
                  <div className="py-2 text-center text-[10px] text-slate-500">No sniper executions yet.</div>
                ) : (
                  state.outcomes.slice().reverse().map((o, idx) => (
                    <div
                      key={o.id || idx}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 px-2 py-1 text-[10px]"
                    >
                      <div className="flex items-center gap-1.5">
                        {o.outcome === "win" ? (
                          <CheckCircle2 size={12} className="text-emerald-400" />
                        ) : (
                          <XCircle size={12} className="text-rose-400" />
                        )}
                        <span className="font-bold text-white">
                          {o.direction === 1 ? "BUY" : "SELL"}
                        </span>
                        <span className="text-[9px] text-slate-500 truncate max-w-[90px]">{o.session}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className={o.outcome === "win" ? "font-bold text-emerald-400" : "font-bold text-rose-400"}>
                          {o.outcome === "win" ? "+" : ""}{o.netR.toFixed(1)}R (${o.outcome === "win" ? "+" : ""}{o.netDollars.toFixed(0)})
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
