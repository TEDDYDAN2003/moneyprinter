"use client";

import React, { useState } from "react";
import { BarChart3, CheckCircle2, ChevronRight, Compass, Flame, Layers, Sparkles, TrendingUp, X, Zap } from "lucide-react";

export type CorrelationData = {
  global_correlations: Record<string, number>;
  regime_correlations: Record<string, Record<string, number>>;
  signal_accuracy: Record<string, Record<string, { accuracy: number; total: number; direction_matches: number }>>;
  best_combinations: Array<{
    indicators: string[];
    regime: string;
    accuracy: number;
    total_signals: number;
    avg_winner_return: number;
  }>;
};

interface CorrelationMatrixModalProps {
  open: boolean;
  loading: boolean;
  data: CorrelationData | null;
  onClose: () => void;
  onApplyCombination: (indicators: string[], regime?: string) => void;
}

export function CorrelationMatrixModal({
  open,
  loading,
  data,
  onClose,
  onApplyCombination
}: CorrelationMatrixModalProps) {
  const [activeTab, setActiveTab] = useState<"combos" | "correlations" | "regimes">("combos");
  const [selectedRegime, setSelectedRegime] = useState<string>("all");

  if (!open) return null;

  const indicatorLabels: Record<string, string> = {
    trend_200ema: "200 EMA Macro Trend",
    ltf_structure: "Market Structure (BOS/CHoCH)",
    sweep: "Liquidity Sweep & Reclaim",
    vwma_divergence: "VWMA × EMA Volume Divergence",
    vwma_crossover: "VWMA Momentum Crossover",
    ema_position: "Fast/Slow EMA Position",
    composite_net: "Composite Confluence Score",
    confirmation: "Causal Confirmation Trigger",
    pattern_dir: "Candlestick Reversal Pattern",
    swing_score: "Swing Pivot Hierarchy (HH/HL)",
    killzone: "ICT Killzone Session (London/NY)",
    ote: "0.705 Fibonacci OTE",
    order_block: "Order Block Retest",
    regime_numeric: "Wyckoff Phase Trend Bias",
    atr_compression: "ATR Volatility Compression"
  };

  const regimeColors: Record<string, string> = {
    all: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    accumulation: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    markup: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    distribution: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    markdown: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    consolidation: "text-slate-400 bg-slate-500/10 border-slate-500/30"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0d131d] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#101722] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-400 border border-cyan-500/30">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Statistical Confluence &amp; Regime Matrix</h2>
              <p className="text-xs text-slate-400">
                Data-driven correlation between indicators, Wyckoff phases, and future price expansion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close correlation modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#0e1624] px-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("combos")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition ${
              activeTab === "combos"
                ? "border-cyan-500 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles size={14} /> High-Accuracy Confluence Combos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("correlations")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition ${
              activeTab === "correlations"
                ? "border-cyan-500 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp size={14} /> Predictive Correlation Ranking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("regimes")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition ${
              activeTab === "regimes"
                ? "border-cyan-500 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass size={14} /> Wyckoff Regime Accuracy
          </button>
        </div>

        {/* Body Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-white">Computing Statistical Correlations…</p>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Measuring rolling forward return correlations and testing combinations across market regimes.
              </p>
            </div>
          ) : !data || !data.best_combinations || data.best_combinations.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Layers size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">Insufficient data for correlation analysis.</p>
              <p className="mt-1 text-xs text-slate-500">Ensure at least 500 completed candles are loaded to compute meaningful statistics.</p>
            </div>
          ) : activeTab === "combos" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>Top Multi-Indicator Combinations (Ranked by Out-of-Sample Directional Accuracy)</span>
                <span className="text-cyan-400 text-[11px]">Forward 20-Bar Return Target</span>
              </div>

              {data.best_combinations.map((c, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-[#121a27] p-4 hover:border-slate-700 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.indicators.map((ind) => (
                            <span
                              key={ind}
                              className="rounded-md bg-indigo-950/70 border border-indigo-500/40 px-2 py-0.5 text-[11px] font-semibold text-indigo-200"
                            >
                              {indicatorLabels[ind] || ind}
                            </span>
                          ))}
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${regimeColors[c.regime] || regimeColors.all}`}>
                            Regime: {c.regime}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {c.total_signals} clear signals evaluated · Avg winning expansion: +{c.avg_winner_return.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-bold font-mono text-emerald-400">
                          {c.accuracy.toFixed(1)}% Accuracy
                        </div>
                        <div className="text-[10px] text-slate-400">Directional Win Rate</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyCombination(c.indicators, c.regime);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition shadow-md"
                      >
                        <CheckCircle2 size={13} /> Apply Confluence
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "correlations" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-[#121a27] p-4 text-xs text-slate-300">
                <h4 className="font-bold text-white text-sm mb-1">Global Indicator Correlation with Future Returns</h4>
                <p className="text-slate-400 mb-4">
                  Positive Pearson correlation indicates buying when the indicator signals leads to upward price movement. Negative indicates inverse correlation.
                </p>

                <div className="space-y-2.5">
                  {Object.entries(data.global_correlations).map(([name, r]) => {
                    const isPositive = r >= 0;
                    const magnitude = Math.min(100, Math.round(Math.abs(r) * 200));
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <div className="w-48 text-xs font-semibold text-slate-300 truncate">
                          {indicatorLabels[name] || name}
                        </div>
                        <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden flex items-center">
                          <div
                            className={`h-full rounded-full ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`}
                            style={{ width: `${Math.max(5, magnitude)}%` }}
                          />
                        </div>
                        <div className={`w-16 text-right font-mono text-xs font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {isPositive ? `+${r.toFixed(3)}` : r.toFixed(3)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold text-slate-400">Select Market Regime:</span>
                {["all", "accumulation", "markup", "distribution", "markdown", "consolidation"].map((reg) => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setSelectedRegime(reg)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase transition ${
                      selectedRegime === reg
                        ? regimeColors[reg] || regimeColors.all
                        : "border-slate-800 bg-[#0c121d] text-slate-400 hover:text-white"
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(data.signal_accuracy).map(([name, regMap]) => {
                  const stat = regMap[selectedRegime] || regMap["all"];
                  if (!stat) return null;
                  return (
                    <div key={name} className="rounded-xl border border-slate-800 bg-[#121a27] p-3.5 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-white block">{indicatorLabels[name] || name}</span>
                          <span className="text-[11px] text-slate-400">{stat.total} occurrences in this phase</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-base font-bold font-mono ${stat.accuracy >= 60 ? "text-emerald-400" : stat.accuracy >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                            {stat.accuracy.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-500 block">accuracy</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#101722] px-6 py-3 text-xs text-slate-400">
          <span>Walk-forward 20-bar forward return validation across complete market cycles.</span>
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
