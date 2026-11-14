"use client";

import React, { useState } from "react";
import { Award, CheckCircle2, ChevronRight, Gauge, Layers, Sparkles, TrendingUp, X, Filter, Sliders, ShieldAlert } from "lucide-react";

export type OptimizationCandidate = {
  name: string;
  indicators?: string[];
  threshold: number;
  target_mode: string;
  stop_mode: string;
  min_rr: number;
  rr: number;
  stop_atr: number;
  require_pattern: boolean;
  filter_trend?: boolean;
  filter_killzone?: boolean;
  filter_news?: boolean;
  filter_ote?: boolean;
  filter_ob?: boolean;
  trainTrades: number;
  trainWinRate: number;
  trainNetR: number;
  trainExp: number;
  valTrades: number;
  valWinRate: number;
  valNetR: number;
  valExp: number;
  valProfitFactor: number | null;
};

interface OptimizationModalProps {
  open: boolean;
  loading: boolean;
  candidates: OptimizationCandidate[] | null;
  onClose: () => void;
  onApply: (candidate: OptimizationCandidate) => void;
  onRunCustomCombination?: (filters: {
    filter_trend: boolean;
    filter_killzone: boolean;
    filter_news: boolean;
    filter_ote: boolean;
    filter_ob: boolean;
    require_pattern: boolean;
  }) => void;
}

export function OptimizationModal({ open, loading, candidates, onClose, onApply, onRunCustomCombination }: OptimizationModalProps) {
  const [tab, setTab] = useState<"ranked" | "custom">("ranked");

  // Custom combination state
  const [useTrend, setUseTrend] = useState(true);
  const [useKillzones, setUseKillzones] = useState(true);
  const [useNewsFilter, setUseNewsFilter] = useState(true);
  const [useOte, setUseOte] = useState(false);
  const [useOb, setUseOb] = useState(false);
  const [usePattern, setUsePattern] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0d131d] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#101722] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400 border border-indigo-500/30">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Multi-Indicator Strategy Optimizer</h2>
              <p className="text-xs text-slate-400">
                Out-of-sample walk-forward validation across 50,000 candles to eliminate noisy FVG signals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close optimizer modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#0e1624] px-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("ranked")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition ${
              tab === "ranked"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Award size={14} /> Ranked Indicator Combinations
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition ${
              tab === "custom"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders size={14} /> Custom Combination Sandbox
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-white">Simulating Multi-Indicator Confluences…</p>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Benchmarking combinations of FVG, 200 EMA Macro Trend, ICT Killzones, CPI/PPI News Avoidance, and Key Levels across your dataset.
              </p>
            </div>
          ) : tab === "custom" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-[#121a27] p-4 text-xs text-slate-300">
                <h4 className="font-bold text-white text-sm mb-1">Build Your Confluence Model</h4>
                <p className="text-slate-400 mb-4">
                  Combine 2 or more indicators to filter false breakouts. When multiple institutional factors align, win rate and expectancy rise dramatically.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#0c121d] p-3 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={useTrend}
                      onChange={(e) => setUseTrend(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-white block">200 EMA Macro Trend Filter</span>
                      <span className="text-[11px] text-slate-400">Only buy in Bullish regime (price &gt; 200 EMA), only short in Bearish regime.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#0c121d] p-3 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={useKillzones}
                      onChange={(e) => setUseKillzones(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-white block">ICT Killzones (London &amp; NY Open)</span>
                      <span className="text-[11px] text-slate-400">Filter out low-volume Asian range noise and dead afternoon doldrums.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#0c121d] p-3 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={useNewsFilter}
                      onChange={(e) => setUseNewsFilter(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-white block">CPI / PPI / FOMC News Shock Blackout</span>
                      <span className="text-[11px] text-slate-400">Avoid taking trades on news candles with &ge; 2.2x ATR whipsaws and 1-hour post-drop.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#0c121d] p-3 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={useOte}
                      onChange={(e) => setUseOte(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-white block">0.705 Fibonacci OTE Retracement</span>
                      <span className="text-[11px] text-slate-400">Only long when price pulls back into Deep Discount (0.618 - 0.790 OTE zone).</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#0c121d] p-3 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={useOb}
                      onChange={(e) => setUseOb(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-white block">Order Block Retest Confluence</span>
                      <span className="text-[11px] text-slate-400">Requires entry candle to touch the unmitigated displacement Order Block.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#0c121d] p-3 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={usePattern}
                      onChange={(e) => setUsePattern(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-white block">Candlestick Reversal Confirmation</span>
                      <span className="text-[11px] text-slate-400">Requires Hammer, Engulfing, or Morning/Evening Star confirmation at entry.</span>
                    </div>
                  </label>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (onRunCustomCombination) {
                        onRunCustomCombination({
                          filter_trend: useTrend,
                          filter_killzone: useKillzones,
                          filter_news: useNewsFilter,
                          filter_ote: useOte,
                          filter_ob: useOb,
                          require_pattern: usePattern,
                        });
                      }
                      onClose();
                    }}
                    className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-400 shadow-md"
                  >
                    <CheckCircle2 size={14} /> Apply Custom Confluence to Backtest &amp; Chart
                  </button>
                </div>
              </div>
            </div>
          ) : !candidates || candidates.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Layers size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">No combination met the minimum trade count requirement.</p>
              <p className="mt-1 text-xs text-slate-500">Try loading a larger candle sample (e.g. 5,000+ bars) and run the optimizer again.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 pb-1">
                <span>Top Ranked Strategy Combinations (Sorted by Out-of-Sample Expectancy)</span>
                <span className="text-[11px] text-indigo-400">Validated on 20% Held-Out Data</span>
              </div>

              {candidates.map((c, idx) => {
                const isBest = idx === 0;
                return (
                  <div
                    key={c.name}
                    className={`rounded-xl border p-4 transition ${
                      isBest
                        ? "border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-950/40"
                        : "border-slate-800 bg-[#121a27] hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isBest ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{c.name}</h3>
                            {isBest && (
                              <span className="flex items-center gap-1 rounded bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                                <Award size={11} /> Top Edge
                              </span>
                            )}
                          </div>
                          
                          {/* Active Indicators in this Combination */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {(c.indicators || [c.name]).map((ind) => (
                              <span
                                key={ind}
                                className="inline-flex items-center rounded-md bg-indigo-950/70 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-medium text-indigo-200"
                              >
                                {ind}
                              </span>
                            ))}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span className="rounded bg-slate-800 px-1.5 py-0.5">
                              Target: {c.target_mode === "structural" ? "Structural BSL/SSL" : `${c.rr}R Fixed`}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5">
                              Stop: {c.stop_mode === "structural" ? "FVG & Swing Invalidation" : `${c.stop_atr} ATR`}
                            </span>
                            {c.require_pattern && (
                              <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 font-medium">
                                Pattern Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onApply(c);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-md"
                      >
                        <CheckCircle2 size={13} /> Apply Preset
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-3 sm:grid-cols-4 text-xs">
                      <div className="rounded-lg bg-slate-900/80 p-2">
                        <div className="text-[10px] uppercase text-slate-500 font-semibold">Val. Expectancy</div>
                        <div className={`mt-0.5 text-base font-bold font-mono ${c.valExp >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {c.valExp >= 0 ? `+${c.valExp.toFixed(2)}R` : `${c.valExp.toFixed(2)}R`}
                        </div>
                        <div className="text-[10px] text-slate-500">Train: {c.trainExp.toFixed(2)}R</div>
                      </div>

                      <div className="rounded-lg bg-slate-900/80 p-2">
                        <div className="text-[10px] uppercase text-slate-500 font-semibold">Val. Win Rate</div>
                        <div className="mt-0.5 text-base font-bold font-mono text-slate-200">
                          {c.valWinRate !== null ? `${c.valWinRate.toFixed(1)}%` : "—"}
                        </div>
                        <div className="text-[10px] text-slate-500">Train: {c.trainWinRate.toFixed(1)}%</div>
                      </div>

                      <div className="rounded-lg bg-slate-900/80 p-2">
                        <div className="text-[10px] uppercase text-slate-500 font-semibold">Val. Profit Factor</div>
                        <div className="mt-0.5 text-base font-bold font-mono text-emerald-300">
                          {c.valProfitFactor !== null ? `${c.valProfitFactor.toFixed(2)}` : "—"}
                        </div>
                        <div className="text-[10px] text-slate-500">Gross W / L</div>
                      </div>

                      <div className="rounded-lg bg-slate-900/80 p-2">
                        <div className="text-[10px] uppercase text-slate-500 font-semibold">Total Trades</div>
                        <div className="mt-0.5 text-base font-bold font-mono text-slate-200">
                          {c.trainTrades + c.valTrades}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {c.trainTrades} train · {c.valTrades} val
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#101722] px-6 py-3 text-xs text-slate-400">
          <span>Walk-forward validation avoids lookahead &amp; parameter over-tuning.</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
