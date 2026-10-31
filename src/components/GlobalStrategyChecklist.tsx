"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Flame,
  Maximize2,
  Minimize2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export type GlobalChecklistDiagramKind = "market_trend" | "candlestick_momentum";

export interface GlobalChecklistItem {
  id: string;
  number: number;
  code: string;
  title: string;
  subtitle: string;
  rationale: string;
  buyCheck: string;
  sellCheck: string;
  redFlagWarning: string;
  diagramKind: GlobalChecklistDiagramKind;
}

/**
 * SINGLE SOURCE OF TRUTH — GLOBAL PRE-ENTRY CONFIRMATION CHECKLIST
 * Add future global risk-reduction items (#3, #4, ...) directly to this array;
 * every strategy importing <GlobalStrategyChecklist /> updates automatically.
 */
export const GLOBAL_CHECKLIST_ITEMS: GlobalChecklistItem[] = [
  {
    id: "global-check-1-current-trend",
    number: 1,
    code: "G-01",
    title: "Confirm Current Market Trend Alignment",
    subtitle:
      "Ensure your trade direction does not contradict the prevailing market trend before pulling the trigger.",
    rationale:
      "Even when every rule of your specific strategy (POC Bounce, Value Area Reversal, Breakout, or Pullback POI) aligns and tells you to enter, taking a trade directly against the dominant trend dramatically increases stop-out risk.",
    buyCheck:
      "Before executing a BUY: confirm the current market structure/trend supports upside (Higher Highs & Higher Lows or confirmed bullish shift) — do NOT buy into an intact, cascading downtrend that contradicts your long bias.",
    sellCheck:
      "Before executing a SELL: confirm the current market structure/trend supports downside (Lower Highs & Lower Lows or confirmed bearish shift) — do NOT short into a strong, intact uptrend that contradicts your short bias.",
    redFlagWarning:
      "If your strategy setup flashes BUY at a level while the broader/current trend is aggressively bearish (or flashes SELL in a strong bullish trend), stand down — never fight an unaligned trend.",
    diagramKind: "market_trend",
  },
  {
    id: "global-check-2-candlestick-pattern",
    number: 2,
    code: "G-02",
    title: "Inspect Candlestick Pattern & Opposing Momentum",
    subtitle:
      "Verify that incoming candles are not aggressively stacked against you (confirm real buyers/sellers are present).",
    rationale:
      "A level can be technically valid on paper, yet price may slam into it with consecutive, oversized opposing impulse candles. Heavy one-sided momentum means the counter-party (buyers for a long, sellers for a short) has stepped aside — stepping in front of that momentum risks immediate slippage through your Stop Loss.",
    buyCheck:
      "Before executing a BUY: check the candles approaching your entry. If there are too many aggressive, full-bodied bearish candles closing on their lows, there are effectively NO buyers in the market yet — wait for bearish deceleration, rejection lower wicks, and a clear bullish confirmation candle.",
    sellCheck:
      "Before executing a SELL: check the candles approaching your entry. If price surges into your zone on consecutive, aggressive full-bodied bullish candles, sellers are absent — wait for bullish exhaustion, upper-wick rejection, and a decisive bearish confirmation candle.",
    redFlagWarning:
      "Never blindly catch a falling knife of consecutive aggressive bearish marubozu candles on a BUY (or step in front of consecutive aggressive bullish impulse candles on a SELL), even if every prior strategy step checked out.",
    diagramKind: "candlestick_momentum",
  },
];

function GlobalChecklistSvg({
  kind,
  direction = "bullish",
}: {
  kind: GlobalChecklistDiagramKind;
  direction?: "bullish" | "bearish";
}) {
  const isBuyExample = direction !== "bearish";

  if (kind === "market_trend") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 680 190"
          className="h-auto w-full"
          role="img"
          aria-label="Global Check 1: Contradicting vs Aligned Current Market Trend"
        >
          {/* Left Panel: Contradicting Current Trend (High Risk) */}
          <rect
            x="10"
            y="10"
            width="320"
            height="170"
            rx="10"
            fill="#0D121A"
            stroke="#f43f5e"
            strokeOpacity="0.35"
          />
          <text
            x="24"
            y="30"
            fill="#fda4af"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ✗ CONTRADICTS TREND (SKIP / HIGH RISK)
          </text>

          {isBuyExample ? (
            <>
              {/* Heavy Downtrend Structure (LH -> LL) */}
              <polyline
                points="32,50 82,92 118,70 175,126 212,102 262,155 298,162"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Local Strategy Buy Level getting sliced */}
              <line
                x1="155"
                y1="126"
                x2="310"
                y2="126"
                stroke="#38bdf8"
                strokeWidth="1.3"
                strokeDasharray="4 3"
              />
              <circle cx="236" cy="126" r="5" fill="#f59e0b" />
              <text
                x="24"
                y="150"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Dominant LH → LL Downtrend
              </text>
              <text
                x="24"
                y="165"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Strategy says BUY, but Trend = BEARISH
              </text>
            </>
          ) : (
            <>
              {/* Heavy Uptrend Structure (HL -> HH) */}
              <polyline
                points="32,148 82,106 118,124 175,74 212,94 262,46 298,38"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="155"
                y1="74"
                x2="310"
                y2="74"
                stroke="#38bdf8"
                strokeWidth="1.3"
                strokeDasharray="4 3"
              />
              <circle cx="236" cy="74" r="5" fill="#f59e0b" />
              <text
                x="24"
                y="150"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Dominant HL → HH Uptrend
              </text>
              <text
                x="24"
                y="165"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Strategy says SELL, but Trend = BULLISH
              </text>
            </>
          )}

          {/* Right Panel: Aligned With Current Trend (Reduced Risk) */}
          <rect
            x="350"
            y="10"
            width="320"
            height="170"
            rx="10"
            fill="#0D121A"
            stroke="#10b981"
            strokeOpacity="0.4"
          />
          <text
            x="364"
            y="30"
            fill="#6ee7b7"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ✓ ALIGNED WITH TREND (LOW-RISK GATE)
          </text>

          {isBuyExample ? (
            <>
              <polyline
                points="372,142 430,90 468,114 534,62 576,92 644,44"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="418"
                y1="92"
                x2="650"
                y2="92"
                stroke="#10b981"
                strokeWidth="1.3"
                strokeDasharray="4 3"
              />
              <circle cx="576" cy="92" r="5.5" fill="#10b981" />
              <text
                x="364"
                y="150"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Prevailing HH → HL Bullish Trend
              </text>
              <text
                x="364"
                y="165"
                fill="#6ee7b7"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Strategy BUY + Bullish Trend = ALIGNED
              </text>
            </>
          ) : (
            <>
              <polyline
                points="372,48 430,98 468,74 534,126 576,96 644,146"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="418"
                y1="96"
                x2="650"
                y2="96"
                stroke="#f43f5e"
                strokeWidth="1.3"
                strokeDasharray="4 3"
              />
              <circle cx="576" cy="96" r="5.5" fill="#10b981" />
              <text
                x="364"
                y="150"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Prevailing LH → LL Bearish Trend
              </text>
              <text
                x="364"
                y="165"
                fill="#6ee7b7"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Strategy SELL + Bearish Trend = ALIGNED
              </text>
            </>
          )}
        </svg>
      </div>
    );
  }

  // Diagram 2: Candlestick Pattern & Aggressive Opposing Momentum
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
      <svg
        viewBox="0 0 680 195"
        className="h-auto w-full"
        role="img"
        aria-label="Global Check 2: Aggressive Opposing Candles vs Confirmed Candlestick Rejection"
      >
        {/* Left Panel: Aggressive Opposing Candles (No Buyers / Sellers) */}
        <rect
          x="10"
          y="10"
          width="320"
          height="175"
          rx="10"
          fill="#0D121A"
          stroke="#f43f5e"
          strokeOpacity="0.35"
        />
        <text
          x="24"
          y="30"
          fill="#fda4af"
          fontSize="10.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {isBuyExample
            ? "✗ AGGRESSIVE BEARISH CANDLES (NO BUYERS)"
            : "✗ AGGRESSIVE BULLISH CANDLES (NO SELLERS)"}
        </text>

        {/* Key Strategy Level */}
        <line
          x1="24"
          y1={isBuyExample ? "132" : "66"}
          x2="312"
          y2={isBuyExample ? "132" : "66"}
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />
        <text
          x="232"
          y={isBuyExample ? "126" : "60"}
          fill="#38bdf8"
          fontSize="9"
          fontFamily="monospace"
        >
          Strategy POI
        </text>

        {isBuyExample ? (
          <>
            {/* 3 Huge Full-Bodied Bearish Marubozu Candles Slamming Into Level */}
            {[
              { x: 74, top: 44, h: 28 },
              { x: 122, top: 70, h: 32 },
              { x: 170, top: 98, h: 38 },
            ].map((c, idx) => (
              <g key={idx}>
                <line
                  x1={c.x + 9}
                  y1={c.top - 3}
                  x2={c.x + 9}
                  y2={c.top + c.h + 2}
                  stroke="#f43f5e"
                  strokeWidth="1.6"
                />
                <rect
                  x={c.x}
                  y={c.top}
                  width="18"
                  height={c.h}
                  rx="2"
                  fill="#f43f5e"
                />
              </g>
            ))}
            <text
              x="24"
              y="154"
              fill="#94a3b8"
              fontSize="9.5"
              fontFamily="monospace"
            >
              Heavy Marubozu Closes · Zero Buyer Wicks
            </text>
            <text
              x="24"
              y="169"
              fill="#fda4af"
              fontSize="9.5"
              fontFamily="monospace"
            >
              DO NOT BUY YET — High Stop-Out Risk
            </text>
          </>
        ) : (
          <>
            {/* 3 Huge Full-Bodied Bullish Candles Slamming Into Short Level */}
            {[
              { x: 74, top: 112, h: 28 },
              { x: 122, top: 84, h: 30 },
              { x: 170, top: 54, h: 34 },
            ].map((c, idx) => (
              <g key={idx}>
                <line
                  x1={c.x + 9}
                  y1={c.top - 2}
                  x2={c.x + 9}
                  y2={c.top + c.h + 3}
                  stroke="#10b981"
                  strokeWidth="1.6"
                />
                <rect
                  x={c.x}
                  y={c.top}
                  width="18"
                  height={c.h}
                  rx="2"
                  fill="#10b981"
                />
              </g>
            ))}
            <text
              x="24"
              y="154"
              fill="#94a3b8"
              fontSize="9.5"
              fontFamily="monospace"
            >
              Heavy Impulse Closes · Zero Seller Wicks
            </text>
            <text
              x="24"
              y="169"
              fill="#fda4af"
              fontSize="9.5"
              fontFamily="monospace"
            >
              DO NOT SELL YET — High Stop-Out Risk
            </text>
          </>
        )}

        {/* Right Panel: Momentum Exhaustion + Candlestick Confirmation */}
        <rect
          x="350"
          y="10"
          width="320"
          height="175"
          rx="10"
          fill="#0D121A"
          stroke="#10b981"
          strokeOpacity="0.4"
        />
        <text
          x="364"
          y="30"
          fill="#6ee7b7"
          fontSize="10.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          ✓ REJECTION + CONFIRMATION CANDLE
        </text>

        <line
          x1="364"
          y1={isBuyExample ? "132" : "66"}
          x2="652"
          y2={isBuyExample ? "132" : "66"}
          stroke="#10b981"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />

        {isBuyExample ? (
          <>
            {/* Shrinking Bearish Body -> Long Lower Rejection Wick -> Bullish Engulfing */}
            <g>
              <line
                x1="418"
                y1="76"
                x2="418"
                y2="108"
                stroke="#f43f5e"
                strokeWidth="1.5"
              />
              <rect x="410" y="80" width="16" height="22" rx="2" fill="#f43f5e" />
            </g>
            {/* Pin-bar / Wick Rejection at Level */}
            <g>
              <line
                x1="464"
                y1="100"
                x2="464"
                y2="140"
                stroke="#94a3b8"
                strokeWidth="1.8"
              />
              <rect x="456" y="103" width="16" height="10" rx="2" fill="#f43f5e" />
            </g>
            {/* Strong Bullish Engulfing Confirmation */}
            <g>
              <line
                x1="512"
                y1="82"
                x2="512"
                y2="122"
                stroke="#10b981"
                strokeWidth="1.8"
              />
              <rect x="503" y="86" width="18" height="28" rx="2" fill="#10b981" />
            </g>
            <text
              x="364"
              y="154"
              fill="#94a3b8"
              fontSize="9.5"
              fontFamily="monospace"
            >
              Sellers Exhausted · Buyers Step In Strong
            </text>
            <text
              x="364"
              y="169"
              fill="#6ee7b7"
              fontSize="9.5"
              fontFamily="monospace"
            >
              CLEARED TO EXECUTE BUY ENTRY
            </text>
          </>
        ) : (
          <>
            {/* Shrinking Bullish Body -> Long Upper Rejection Wick -> Bearish Engulfing */}
            <g>
              <line
                x1="418"
                y1="90"
                x2="418"
                y2="122"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              <rect x="410" y="96" width="16" height="22" rx="2" fill="#10b981" />
            </g>
            {/* Upper Wick Rejection at Level */}
            <g>
              <line
                x1="464"
                y1="56"
                x2="464"
                y2="96"
                stroke="#94a3b8"
                strokeWidth="1.8"
              />
              <rect x="456" y="84" width="16" height="10" rx="2" fill="#10b981" />
            </g>
            {/* Strong Bearish Engulfing Confirmation */}
            <g>
              <line
                x1="512"
                y1="78"
                x2="512"
                y2="118"
                stroke="#f43f5e"
                strokeWidth="1.8"
              />
              <rect x="503" y="84" width="18" height="28" rx="2" fill="#f43f5e" />
            </g>
            <text
              x="364"
              y="154"
              fill="#94a3b8"
              fontSize="9.5"
              fontFamily="monospace"
            >
              Buyers Exhausted · Sellers Step In Strong
            </text>
            <text
              x="364"
              y="169"
              fill="#6ee7b7"
              fontSize="9.5"
              fontFamily="monospace"
            >
              CLEARED TO EXECUTE SELL ENTRY
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export interface GlobalStrategyChecklistProps {
  /** Optional directional highlight matching the strategy's current Bullish/Bearish view */
  direction?: "bullish" | "bearish";
  /** Optional subtitle context showing which strategy is invoking this global gate */
  strategyContext?: string;
}

export function GlobalStrategyChecklist({
  direction = "bullish",
  strategyContext,
}: GlobalStrategyChecklistProps) {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

  const completedCount = GLOBAL_CHECKLIST_ITEMS.filter(
    (item) => checkedIds[item.id]
  ).length;
  const allConfirmed = completedCount === GLOBAL_CHECKLIST_ITEMS.length;
  const allExpanded = GLOBAL_CHECKLIST_ITEMS.every(
    (item) => !collapsedIds[item.id]
  );

  const toggleChecked = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleExpandAll = () => {
    const collapseTarget = allExpanded;
    const next: Record<string, boolean> = {};
    GLOBAL_CHECKLIST_ITEMS.forEach((item) => {
      next[item.id] = collapseTarget;
    });
    setCollapsedIds(next);
  };

  const handleReset = () => {
    setCheckedIds({});
  };

  return (
    <section
      aria-labelledby="global-confirmation-checklist-heading"
      className="rounded-2xl border border-amber-500/35 bg-gradient-to-b from-amber-500/[0.06] to-[#0E131B] p-5 sm:p-6 space-y-5"
    >
      {/* Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-300">
            {allConfirmed ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Global Pre-Entry Gate
              </span>
              {strategyContext && (
                <span className="font-mono text-[11px] text-slate-400">
                  {strategyContext}
                </span>
              )}
            </div>
            <h2
              id="global-confirmation-checklist-heading"
              className="mt-1 text-base sm:text-lg font-bold text-white"
            >
              Global Risk-Reduction Confirmation Checklist
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm leading-relaxed text-slate-300">
              Even after all strategy rules align, verify every global filter
              below <strong className="text-white">before executing the final trade entry</strong>{" "}
              to avoid counter-trend traps and opposing candle momentum.
            </p>
          </div>
        </div>

        {/* Status Pill + Expand/Shrink + Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold ${
              allConfirmed
                ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-300"
                : "border-amber-500/35 bg-[#090D13] text-amber-300"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              Global Gate: {completedCount}/{GLOBAL_CHECKLIST_ITEMS.length}
            </span>
          </span>

          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#090D13] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            {allExpanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Shrink</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Expand</span>
              </>
            )}
          </button>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#090D13] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Checklist Cards */}
      <div className="space-y-3.5">
        {GLOBAL_CHECKLIST_ITEMS.map((item) => {
          const isChecked = Boolean(checkedIds[item.id]);
          const isCollapsed = Boolean(collapsedIds[item.id]);

          return (
            <article
              key={item.id}
              className={`overflow-hidden rounded-2xl border transition-all ${
                isChecked
                  ? "border-emerald-500/45 bg-emerald-500/[0.05]"
                  : "border-slate-800/90 bg-[#090D13]"
              }`}
            >
              {/* Clickable Card Header */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={!isCollapsed}
                onClick={() => toggleCollapsed(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapsed(item.id);
                  }
                }}
                className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.02]"
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={(e) => toggleChecked(item.id, e)}
                    aria-label={`Confirm global rule ${item.number}: ${item.title}`}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                      isChecked
                        ? "border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                        : "border-amber-500/45 bg-[#0E131B] text-transparent hover:border-amber-400"
                    }`}
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                        {item.code}
                      </span>
                      <h3
                        className={`text-sm sm:text-base font-bold ${
                          isChecked ? "text-emerald-200" : "text-white"
                        }`}
                      >
                        {item.number}. {item.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-slate-400">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-slate-800 bg-[#0E131B] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                    <Flame className="h-3 w-3 text-amber-400" />
                    Risk Filter
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      !isCollapsed ? "rotate-180 text-amber-400" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Expanded Card Body */}
              {!isCollapsed && (
                <div className="border-t border-slate-800/80 px-5 py-4 space-y-4">
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                    {item.rationale}
                  </p>

                  {/* Buy vs Sell Specific Verification Boxes */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className={`rounded-xl border p-3.5 ${
                        direction === "bullish"
                          ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                          : "border-slate-800/90 bg-[#0E131B]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-emerald-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>If Strategy Signals BUY (Long)</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                        {item.buyCheck}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl border p-3.5 ${
                        direction === "bearish"
                          ? "border-rose-500/40 bg-rose-500/[0.07]"
                          : "border-slate-800/90 bg-[#0E131B]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-rose-400">
                        <TrendingDown className="h-3.5 w-3.5" />
                        <span>If Strategy Signals SELL (Short)</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                        {item.sellCheck}
                      </p>
                    </div>
                  </div>

                  {/* Visual Comparison SVG */}
                  <GlobalChecklistSvg
                    kind={item.diagramKind}
                    direction={direction}
                  />

                  {/* Red-Flag Stand-Down Warning */}
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-xs leading-relaxed text-amber-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      <strong className="font-semibold text-amber-300">
                        Risk-Reduction Rule:{" "}
                      </strong>
                      {item.redFlagWarning}
                    </span>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* All Global Filters Confirmed Banner */}
      {allConfirmed && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-emerald-500/45 bg-emerald-500/12 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-200"
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>
            Global Confirmation Gate Passed ({completedCount}/
            {GLOBAL_CHECKLIST_ITEMS.length}) — Current Market Trend &amp;
            Candlestick Momentum are aligned with your entry. Cleared to execute!
          </span>
        </div>
      )}
    </section>
  );
}
