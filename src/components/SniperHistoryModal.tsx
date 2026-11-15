"use client";

import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Trash2, 
  X, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Percent, 
  Award, 
  Sparkles,
  BarChart3,
  Layers
} from "lucide-react";
import { 
  type SniperSavedRun, 
  loadSavedSniperRuns, 
  clearSavedSniperRuns 
} from "@/lib/sniperReplay";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectStrategy?: (profile: SniperSavedRun['strategyProfile']) => void;
}

export function SniperHistoryModal({ open, onClose, onSelectStrategy }: Props) {
  const [runs, setRuns] = useState<SniperSavedRun[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (open) {
      setRuns(loadSavedSniperRuns());
      setConfirmClear(false);
    }
  }, [open]);

  if (!open) return null;

  function handleClear() {
    clearSavedSniperRuns();
    setRuns([]);
    setConfirmClear(false);
  }

  const bestByPF = runs.length > 0
    ? [...runs].sort((a, b) => b.profitFactor - a.profitFactor)[0]
    : null;

  const bestByWinRate = runs.length > 0
    ? [...runs].sort((a, b) => b.winRate - a.winRate)[0]
    : null;

  function getStrategyBadge(profile: SniperSavedRun['strategyProfile']) {
    switch (profile) {
      case 'institutional_triad':
        return <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">🎯 Triad Confluence</span>;
      case 'vwma_crossover':
        return <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">⚡ VWMA × EMA Cross</span>;
      case 'fvg_displacement':
        return <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">📊 ICT FVG Retest</span>;
      case 'rapid_internal_scalp':
        return <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/30">🏹 Rapid Scalp</span>;
      default:
        return <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Sniper</span>;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-[#0c1421] p-5 text-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ boxShadow: "0 0 35px -5px rgba(16, 185, 129, 0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Simulation Strategy Comparison Matrix</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  {runs.length} Saved {runs.length === 1 ? 'Run' : 'Runs'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Local browser records for each tested combination. Compare win rates, profit factors, and drawdowns side-by-side.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {runs.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-600/50 rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-rose-300 text-[10px]">Confirm clear?</span>
                  <button
                    onClick={handleClear}
                    className="font-bold text-rose-400 hover:text-white text-[10px] underline ml-1"
                  >
                    Yes, Clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-slate-400 hover:text-white text-[10px] ml-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-400 hover:border-rose-500/50 hover:bg-rose-950/30 hover:text-rose-300 transition"
                  title="Clear all saved simulation runs"
                >
                  <Trash2 size={13} />
                  <span>Clear History</span>
                </button>
              )
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Top KPI Cards (if runs exist) */}
        {runs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 my-3">
            {/* Top Profit Factor */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Trophy size={13} />
                  Highest Profit Factor
                </span>
                <span className="font-mono text-base font-extrabold text-amber-300">
                  {bestByPF ? bestByPF.profitFactor.toFixed(2) : "—"}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 truncate">
                {bestByPF ? bestByPF.strategyName : "—"}
              </div>
            </div>

            {/* Top Win Rate */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Percent size={13} />
                  Highest Win Rate
                </span>
                <span className="font-mono text-base font-extrabold text-emerald-300">
                  {bestByWinRate ? `${bestByWinRate.winRate}%` : "—"}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 truncate">
                {bestByWinRate ? `${bestByWinRate.winCount}W - ${bestByWinRate.lossCount}L (${bestByWinRate.strategyName})` : "—"}
              </div>
            </div>

            {/* Total Tested Combinations */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Layers size={13} className="text-cyan-400" />
                  Total Simulation Runs
                </span>
                <span className="font-mono text-base font-extrabold text-white">
                  {runs.length}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Stored locally in browser (no server upload)
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="flex-1 overflow-y-auto mt-1 rounded-xl border border-slate-800 bg-slate-950/60">
          {runs.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles size={28} className="mx-auto text-slate-600 mb-2 animate-pulse" />
              <div className="text-sm font-semibold text-slate-300">No simulation runs saved yet</div>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Play the sniper simulator with any strategy combination. When you pause, complete trades, or click &quot;Reset&quot;, your results are saved here for instant comparison.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Strategy Combination</th>
                  <th className="py-2.5 px-3 text-center">Deposit</th>
                  <th className="py-2.5 px-3 text-center">Trades</th>
                  <th className="py-2.5 px-3 text-center">Win Rate</th>
                  <th className="py-2.5 px-3 text-center">Profit Factor</th>
                  <th className="py-2.5 px-3 text-center">Max DD</th>
                  <th className="py-2.5 px-3 text-right">Net P&amp;L ($ / %)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {runs.map((r, i) => {
                  const isProfit = r.netDollars >= 0;
                  return (
                    <tr 
                      key={r.id || i}
                      className="hover:bg-slate-900/40 transition"
                    >
                      <td className="py-2 px-3 text-slate-400 text-[10px]">
                        {new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <div className="flex items-center gap-1.5">
                          {getStrategyBadge(r.strategyProfile)}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-300">
                        ${r.initialBalance.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-300 font-sans text-xs">
                        <b>{r.totalTrades}</b> <span className="text-[10px] text-slate-500">({r.winCount}W-{r.lossCount}L)</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-bold ${r.winRate >= 65 ? "text-emerald-400" : r.winRate >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                          {r.winRate}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-bold ${r.profitFactor >= 2.0 ? "text-amber-300" : r.profitFactor >= 1.0 ? "text-slate-200" : "text-rose-400"}`}>
                          {r.profitFactor >= 99 ? '∞' : r.profitFactor.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-rose-300 font-bold">
                        -{r.maxDrawdownPct.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                          {isProfit ? "+" : ""}${r.netDollars.toFixed(2)}
                          <span className="block text-[9px] opacity-80">
                            {isProfit ? "+" : ""}{r.netReturnPct.toFixed(1)}%
                          </span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {onSelectStrategy && (
                          <button
                            onClick={() => {
                              onSelectStrategy(r.strategyProfile);
                              onClose();
                            }}
                            className="rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2 py-1 text-[10px] font-sans font-semibold border border-indigo-500/40 transition"
                          >
                            Load Setup
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3">
          <span>Results stored in browser storage (<code className="text-slate-300 font-mono">localStorage</code>). Persists across page refreshes.</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-semibold text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
