"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Compass, Shield, Target, AlertTriangle, BookOpen, ExternalLink, CheckCircle, Zap, Activity } from "lucide-react";

interface KeyZoneSuggestionCardProps {
  candle: { time: number; open: number; high: number; low: number; close: number };
  result: {
    time: number;
    bull: number | null;
    bear: number | null;
    net: number | null;
    classification: string;
    ready: boolean;
    break: string;
    sweep: string;
    atr: number | null;
    pattern?: string;
    pattern_dir?: number;
    trend_regime?: number;
    in_killzone?: boolean;
    is_news_shock?: boolean;
    in_news_blackout?: boolean;
    touching_ob?: number;
    ote_confluence?: number;
    last_hi?: number | null;
    last_lo?: number | null;
    regime?: string;
    sub_phase?: string;
    regime_confidence?: number;
    vwma?: number | null;
    vwma_crossover?: number;
    vwma_divergence?: number;
    pre_reactive_signal?: {
      direction: number;
      action: string;
      setup: string;
      entry: number;
      sl: number;
      tp: number;
      rr: number;
      probability: number;
      confluences: string[];
    } | null;
    zones?: Array<{ from: number; created: number; top: number; bottom: number; direction: number; status: string }>;
  };
}

export function KeyZoneSuggestionCard({ candle, result }: KeyZoneSuggestionCardProps) {
  const c = candle;
  const r = result;

  // 1. Identify active key zones at this specific candle
  const activeFvgs = (r.zones || []).filter(
    (z) => c.low <= z.top && c.high >= z.bottom
  );
  const touchingBullOb = r.touching_ob === 1;
  const touchingBearOb = r.touching_ob === -1;
  const inOteBull = r.ote_confluence === 1;
  const inOteBear = r.ote_confluence === -1;
  const isSweep = r.sweep && r.sweep !== "None";
  const isMss = r.break && r.break.includes("MSS");

  const hasKeyZone = activeFvgs.length > 0 || touchingBullOb || touchingBearOb || inOteBull || inOteBear || isSweep || isMss;

  // Confluence Scoring
  let bullConfluences: string[] = [];
  let bearConfluences: string[] = [];

  if (activeFvgs.some((z) => z.direction === 1)) bullConfluences.push("Bullish FVG Imbalance");
  if (touchingBullOb) bullConfluences.push("Bullish Order Block Retest");
  if (inOteBull) bullConfluences.push("0.705 Fibonacci OTE Discount");
  if (r.sweep === "Sell-side reclaimed") bullConfluences.push("SSL Liquidity Sweep");
  if (r.break === "Bullish MSS") bullConfluences.push("Bullish Market Structure Shift");
  if (r.trend_regime === 1) bullConfluences.push("Macro Trend: Above 200 EMA");
  if (r.in_killzone) bullConfluences.push("ICT Killzone Session (London/NY)");
  if (r.pattern_dir === 1) bullConfluences.push(`Pattern: ${r.pattern}`);
  if (r.vwma_crossover === 1) bullConfluences.push("VWMA Bullish Momentum Cross");
  if (r.regime === "accumulation") bullConfluences.push("Wyckoff Accumulation Phase");
  if (r.regime === "markup") bullConfluences.push("Wyckoff Markup (Expansion)");

  if (activeFvgs.some((z) => z.direction === -1)) bearConfluences.push("Bearish FVG Imbalance");
  if (touchingBearOb) bearConfluences.push("Bearish Order Block Retest");
  if (inOteBear) bearConfluences.push("0.705 Fibonacci OTE Premium");
  if (r.sweep === "Buy-side reclaimed") bearConfluences.push("BSL Liquidity Sweep");
  if (r.break === "Bearish MSS") bearConfluences.push("Bearish Market Structure Shift");
  if (r.trend_regime === -1) bearConfluences.push("Macro Trend: Below 200 EMA");
  if (r.in_killzone) bearConfluences.push("ICT Killzone Session (London/NY)");
  if (r.pattern_dir === -1) bearConfluences.push(`Pattern: ${r.pattern}`);
  if (r.vwma_crossover === -1) bearConfluences.push("VWMA Bearish Momentum Cross");
  if (r.regime === "distribution") bearConfluences.push("Wyckoff Distribution Phase");
  if (r.regime === "markdown") bearConfluences.push("Wyckoff Markdown (Downtrend)");

  const isBullBias = bullConfluences.length > bearConfluences.length && bullConfluences.length >= 2;
  const isBearBias = bearConfluences.length > bullConfluences.length && bearConfluences.length >= 2;

  // Trade Plan Construction
  const atr = r.atr || 2.5;
  const entry = c.close;
  let sl = entry - 1.2 * atr;
  let tp = entry + 2.5 * atr;

  if (isBullBias) {
    const fvgLow = activeFvgs.find((z) => z.direction === 1)?.bottom;
    sl = fvgLow ? fvgLow - 0.2 * atr : entry - 1.2 * atr;
    tp = r.last_hi && r.last_hi > entry + 1.0 * atr ? r.last_hi : entry + Math.abs(entry - sl) * 2.2;
  } else if (isBearBias) {
    const fvgHigh = activeFvgs.find((z) => z.direction === -1)?.top;
    sl = fvgHigh ? fvgHigh + 0.2 * atr : entry + 1.2 * atr;
    tp = r.last_lo && r.last_lo < entry - 1.0 * atr ? r.last_lo : entry - Math.abs(entry - sl) * 2.2;
  }

  const risk = Math.max(0.1, Math.abs(entry - sl));
  const reward = Math.abs(tp - entry);
  const rr = (reward / risk).toFixed(2);

  const regimeColors: Record<string, string> = {
    accumulation: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    markup: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    distribution: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    markdown: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    consolidation: "bg-slate-700/30 text-slate-300 border-slate-600/40"
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0e1624] p-4 text-xs shadow-lg space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Compass size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Institutional Zone &amp; Regime Intelligence</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                {new Date(c.time * 1000).toISOString().replace("T", " ").slice(0, 16)} UTC
              </span>
              {r.regime && (
                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${regimeColors[r.regime] || regimeColors.consolidation}`}>
                  {r.regime} {r.sub_phase ? `(${r.sub_phase})` : ""}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Causal analysis of Wyckoff phase, VWMA volume divergence, and institutional key zones.
            </p>
          </div>
        </div>

        <a
          href="/admin/course/key-levels"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-white transition"
        >
          <BookOpen size={12} /> Course Key Levels <ExternalLink size={11} />
        </a>
      </div>

      {/* Pre-Reactive Signal Banner */}
      {r.pre_reactive_signal && (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
          r.pre_reactive_signal.direction === 1
            ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-200"
            : "border-rose-500/50 bg-rose-950/30 text-rose-200"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${
              r.pre_reactive_signal.direction === 1 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}>
              <Zap size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase">
                  {r.pre_reactive_signal.action}: {r.pre_reactive_signal.setup}
                </span>
                <span className="rounded bg-indigo-500/30 border border-indigo-400/40 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
                  {r.pre_reactive_signal.probability}% Probability
                </span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Pre-breakout positioning based on volume flow shift before price expands away from key zone.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div>Entry: <span className="font-bold text-white">${r.pre_reactive_signal.entry.toFixed(2)}</span></div>
            <div>SL: <span className="font-bold text-rose-400">${r.pre_reactive_signal.sl.toFixed(2)}</span></div>
            <div>TP: <span className="font-bold text-emerald-400">${r.pre_reactive_signal.tp.toFixed(2)}</span></div>
            <div className="font-bold text-cyan-300">{r.pre_reactive_signal.rr}R</div>
          </div>
        </div>
      )}

      {/* Warning if news shock */}
      {(r.is_news_shock || r.in_news_blackout) && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
          <AlertTriangle size={16} className="shrink-0 text-amber-400" />
          <span>
            <strong>CPI/PPI News Shock Blackout:</strong> High volatility spike detected. Invalidation risk is high; ICT rules recommend waiting 1 hour for liquidity to settle.
          </span>
        </div>
      )}

      {/* Zone Confluence Status */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Active Zones */}
        <div className="rounded-xl border border-slate-800 bg-[#090f17] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Active Key Zones &amp; Volume</span>
            {r.vwma && (
              <span className="text-[9px] font-mono text-cyan-400">
                VWMA: ${r.vwma.toFixed(2)}
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px]">
            {activeFvgs.length > 0 ? (
              <div className="text-purple-300 font-medium">
                🟣 {activeFvgs.length} FVG Imbalance ({activeFvgs.map((z) => `$${z.bottom.toFixed(2)}–$${z.top.toFixed(2)}`).join(", ")})
              </div>
            ) : null}
            {touchingBullOb && <div className="text-emerald-400 font-medium">🟢 Bullish Order Block Retest</div>}
            {touchingBearOb && <div className="text-rose-400 font-medium">🔴 Bearish Order Block Retest</div>}
            {inOteBull && <div className="text-cyan-400 font-medium">🎯 0.705 OTE Discount Retracement</div>}
            {inOteBear && <div className="text-cyan-400 font-medium">🎯 0.705 OTE Premium Retracement</div>}
            {isSweep && <div className="text-amber-300 font-medium">⚡ Liquidity Sweep: {r.sweep}</div>}
            {isMss && <div className="text-indigo-300 font-medium">📐 Structure Shift: {r.break}</div>}
            {r.vwma_crossover === 1 && <div className="text-emerald-400 font-medium">📊 VWMA Bullish Volume Crossover</div>}
            {r.vwma_crossover === -1 && <div className="text-rose-400 font-medium">📊 VWMA Bearish Volume Crossover</div>}
            {!hasKeyZone && <div className="text-slate-500">No major key level currently intersected. Price in discovery.</div>}
          </div>
        </div>

        {/* Direction & Confluence */}
        <div className="rounded-xl border border-slate-800 bg-[#090f17] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Institutional Setup Bias
          </div>
          {isBullBias ? (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                <ArrowUpRight size={16} /> HIGH PROBABILITY BUY (LONG)
              </div>
              <div className="mt-1 text-[11px] text-slate-300">
                {bullConfluences.length} Confluences Aligned:
              </div>
              <ul className="mt-1 space-y-0.5 text-[10px] text-emerald-300/80">
                {bullConfluences.map((c, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <CheckCircle size={10} /> {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : isBearBias ? (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-rose-400">
                <ArrowDownRight size={16} /> HIGH PROBABILITY SELL (SHORT)
              </div>
              <div className="mt-1 text-[11px] text-slate-300">
                {bearConfluences.length} Confluences Aligned:
              </div>
              <ul className="mt-1 space-y-0.5 text-[10px] text-rose-300/80">
                {bearConfluences.map((c, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <CheckCircle size={10} /> {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold text-slate-300">WAIT / PASS</div>
              <p className="mt-1 text-[11px] text-slate-400">
                Confluences are mixed or insufficient ({bullConfluences.length} Bull vs {bearConfluences.length} Bear). Minimum 2 institutional factors required.
              </p>
            </div>
          )}
        </div>

        {/* Trade Execution Plan */}
        <div className="rounded-xl border border-slate-800 bg-[#090f17] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Hypothetical Trade Parameters
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Suggested Entry:</span>
              <span className="font-mono font-bold text-white">${entry.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Invalidation (SL):</span>
              <span className="font-mono font-bold text-rose-400">${sl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target (TP):</span>
              <span className="font-mono font-bold text-emerald-400">${tp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1">
              <span className="text-slate-400 font-semibold">Reward-to-Risk:</span>
              <span className={`font-mono font-bold ${Number(rr) >= 2.0 ? "text-emerald-300" : "text-amber-300"}`}>
                {rr}R {Number(rr) >= 2.0 ? "✓ (Meets 2R rule)" : "⚠ (Below 2R)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
