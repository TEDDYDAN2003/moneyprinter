"use client";

import React, { useMemo, useState } from "react";
import { BarChart2, CheckCircle2, Filter, PieChart, Plus } from "lucide-react";
import {
  computeStrategyProbabilityStats,
  formatUsd,
  type JournalEntry,
  type StrategyProbabilityStat,
} from "@/lib/journal";

interface PieSliceSpec {
  id: "win" | "loss" | "breakeven";
  label: string;
  count: number;
  pct: number;
  color: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describePieWedge(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.001) return "";
  // Full 360° circle fallback using two 180° arcs
  if (sweep >= 359.99) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy + r}`,
      `A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
      "Z",
    ].join(" ");
  }

  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

export function WinLossPieSvg({
  wins,
  losses,
  breakevens,
  winRatePct,
  size = 152,
}: {
  wins: number;
  losses: number;
  breakevens: number;
  winRatePct: number | null;
  size?: number;
}) {
  const [hoveredSlice, setHoveredSlice] = useState<PieSliceSpec | null>(null);
  const totalClosed = wins + losses + breakevens;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44;
  const innerHoleR = size * 0.25;

  const slices: PieSliceSpec[] = useMemo(() => {
    if (totalClosed === 0) return [];
    const items: PieSliceSpec[] = [
      {
        id: "win",
        label: "Win",
        count: wins,
        pct: (wins / totalClosed) * 100,
        color: "#10b981",
      },
      {
        id: "loss",
        label: "Loss",
        count: losses,
        pct: (losses / totalClosed) * 100,
        color: "#f43f5e",
      },
      {
        id: "breakeven",
        label: "BE",
        count: breakevens,
        pct: (breakevens / totalClosed) * 100,
        color: "#64748b",
      },
    ];
    return items.filter((s) => s.count > 0);
  }, [wins, losses, breakevens, totalClosed]);

  let runningAngle = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          winRatePct !== null
            ? `Win probability pie chart: ${winRatePct.toFixed(1)}% win rate`
            : "Pending closed backtest setups"
        }
      >
        {totalClosed === 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="#1e293b"
            stroke="#334155"
            strokeWidth={1.5}
          />
        ) : (
          slices.map((slice) => {
            const sweep = (slice.count / totalClosed) * 360;
            const startAngle = runningAngle;
            const endAngle = runningAngle + sweep;
            runningAngle = endAngle;
            const d = describePieWedge(
              cx,
              cy,
              hoveredSlice?.id === slice.id ? outerR + 3 : outerR,
              startAngle,
              endAngle
            );

            return (
              <path
                key={slice.id}
                d={d}
                fill={slice.color}
                stroke="#0B0F16"
                strokeWidth={slices.length > 1 ? 1.8 : 0}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredSlice(slice)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })
        )}

        {/* Inner Donut Readout */}
        <circle
          cx={cx}
          cy={cy}
          r={innerHoleR}
          fill="#0B0F16"
          stroke="#1e293b"
          strokeWidth={1.2}
        />

        {hoveredSlice ? (
          <>
            <text
              x={cx}
              y={cy - 3}
              textAnchor="middle"
              fill="#f8fafc"
              fontSize={size * 0.1}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {hoveredSlice.pct.toFixed(0)}%
            </text>
            <text
              x={cx}
              y={cy + size * 0.085}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={size * 0.068}
              fontFamily="monospace"
            >
              {hoveredSlice.count} {hoveredSlice.label}
            </text>
          </>
        ) : winRatePct !== null ? (
          <>
            <text
              x={cx}
              y={cy - 2}
              textAnchor="middle"
              fill={winRatePct >= 50 ? "#34d399" : "#fda4af"}
              fontSize={size * 0.1}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {winRatePct.toFixed(0)}%
            </text>
            <text
              x={cx}
              y={cy + size * 0.085}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={size * 0.065}
              fontFamily="monospace"
            >
              WIN PROB
            </text>
          </>
        ) : (
          <text
            x={cx}
            y={cy + 3}
            textAnchor="middle"
            fill="#64748b"
            fontSize={size * 0.07}
            fontFamily="monospace"
          >
            OPEN
          </text>
        )}
      </svg>
    </div>
  );
}

interface BacktestStrategyPiePanelProps {
  backtestEntries: JournalEntry[];
  selectedStrategyFilter: string | null;
  onSelectStrategyFilter: (strategyId: string | null) => void;
  onOpenNewBacktest: () => void;
}

export function BacktestStrategyPiePanel({
  backtestEntries,
  selectedStrategyFilter,
  onSelectStrategyFilter,
  onOpenNewBacktest,
}: BacktestStrategyPiePanelProps) {
  const [groupMode, setGroupMode] = useState<"setup" | "family">("setup");

  const strategyStats: StrategyProbabilityStat[] = useMemo(
    () => computeStrategyProbabilityStats(backtestEntries, groupMode),
    [backtestEntries, groupMode]
  );

  // Aggregate overall totals across all backtested setups
  const overall = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let openCount = 0;
    let netPnl = 0;

    for (const s of strategyStats) {
      wins += s.wins;
      losses += s.losses;
      breakevens += s.breakevens;
      openCount += s.openCount;
      netPnl += s.netPnlUsd;
    }

    const decisive = wins + losses;
    const winRatePct = decisive > 0 ? (wins / decisive) * 100 : null;
    const lossRatePct = decisive > 0 ? (losses / decisive) * 100 : null;

    return {
      total: backtestEntries.length,
      wins,
      losses,
      breakevens,
      openCount,
      winRatePct,
      lossRatePct,
      netPnl,
    };
  }, [strategyStats, backtestEntries.length]);

  return (
    <section
      aria-labelledby="backtest-pie-heading"
      className="rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/[0.05] to-[#0E131B] p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <PieChart className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="backtest-pie-heading"
              className="text-base sm:text-lg font-bold text-white"
            >
              Strategy Win / Loss Probability Pie Charts
            </h2>
            <p className="text-xs text-slate-400">
              Visual win rate vs loss rate breakdown for every strategy you have
              backtested so far.
            </p>
          </div>
        </div>

        {/* Grouping Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedStrategyFilter && (
            <button
              type="button"
              onClick={() => onSelectStrategyFilter(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              <Filter className="h-3 w-3" />
              <span>Clear Strategy Filter</span>
            </button>
          )}

          <div className="inline-flex rounded-xl border border-slate-800 bg-[#090D13] p-1">
            <button
              type="button"
              onClick={() => {
                setGroupMode("setup");
                onSelectStrategyFilter(null);
              }}
              className={`rounded-lg px-3 py-1 font-mono text-[11px] font-semibold transition ${
                groupMode === "setup"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/35"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              By Strategy Setup
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupMode("family");
                onSelectStrategyFilter(null);
              }}
              className={`rounded-lg px-3 py-1 font-mono text-[11px] font-semibold transition ${
                groupMode === "family"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/35"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              By Main Strategy
            </button>
          </div>
        </div>
      </div>

      {/* Empty State if 0 Backtests Recorded Yet */}
      {backtestEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#090D13]/80 px-6 py-12 text-center">
          <BarChart2 className="h-9 w-9 text-cyan-400/70 mb-3" />
          <p className="text-sm font-semibold text-slate-200">
            No backtested setups recorded yet
          </p>
          <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-500">
            Click the <strong>+ New Backtest</strong> button in the header to
            log historical setups, attach chart screenshots, and pick a strategy
            — each strategy&apos;s Win vs Loss Probability Pie Chart will appear
            here automatically.
          </p>
          <button
            type="button"
            onClick={onOpenNewBacktest}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Record First Backtest Setup</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Overall Portfolio Summary Bar + Legend */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800/90 bg-[#090D13] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <WinLossPieSvg
                wins={overall.wins}
                losses={overall.losses}
                breakevens={overall.breakevens}
                winRatePct={overall.winRatePct}
                size={96}
              />
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Combined Backtest Sample ({overall.total} Setups ·{" "}
                  {strategyStats.length}{" "}
                  {strategyStats.length === 1 ? "Strategy" : "Strategies"}{" "}
                  Tested)
                </span>
                <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                  {overall.winRatePct !== null
                    ? `${overall.winRatePct.toFixed(
                        1
                      )}% Win · ${overall.lossRatePct?.toFixed(1)}% Loss`
                    : "Awaiting closed setups"}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                  {overall.wins} Wins · {overall.losses} Losses ·{" "}
                  {overall.breakevens} BE · Sim Net:{" "}
                  <span
                    className={
                      overall.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    {formatUsd(overall.netPnl, true)}
                  </span>
                </p>
              </div>
            </div>

            {/* Slice Color Legend */}
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <span className="h-3 w-3 rounded-xs bg-emerald-500" />
                Win Rate (%)
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-300">
                <span className="h-3 w-3 rounded-xs bg-rose-500" />
                Loss Rate (%)
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <span className="h-3 w-3 rounded-xs bg-slate-500" />
                Breakeven
              </span>
            </div>
          </div>

          {/* Individual Strategy Win/Loss Probability Pie Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {strategyStats.map((stat) => {
              const isSelected = selectedStrategyFilter === stat.key;
              return (
                <article
                  key={stat.key}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                    isSelected
                      ? "border-cyan-400/60 bg-cyan-500/[0.08]"
                      : "border-slate-800/90 bg-[#090D13] hover:border-slate-700"
                  }`}
                >
                  <div>
                    {/* Strategy Title + Family Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-block rounded bg-slate-800/90 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                          {stat.family}
                        </span>
                        <h3
                          title={stat.label}
                          className="mt-1.5 text-sm font-bold text-white leading-snug"
                        >
                          {stat.label}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-md border border-slate-800 bg-[#0E131B] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                        n={stat.totalTrades}
                      </span>
                    </div>

                    {/* Pie Chart + Win/Loss Probability Breakdown */}
                    <div className="mt-4 flex items-center gap-4">
                      <WinLossPieSvg
                        wins={stat.wins}
                        losses={stat.losses}
                        breakevens={stat.breakevens}
                        winRatePct={stat.winRatePct}
                        size={134}
                      />

                      <div className="flex-1 space-y-2 font-mono text-xs tabular-nums">
                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5">
                          <div className="flex items-center justify-between text-emerald-300">
                            <span className="text-[10px] uppercase">
                              Win Rate
                            </span>
                            <span className="font-bold">
                              {stat.winRatePct !== null
                                ? `${stat.winRatePct.toFixed(1)}%`
                                : "—"}
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-400/80">
                            {stat.wins} {stat.wins === 1 ? "Win" : "Wins"}
                          </p>
                        </div>

                        <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5">
                          <div className="flex items-center justify-between text-rose-300">
                            <span className="text-[10px] uppercase">
                              Loss Rate
                            </span>
                            <span className="font-bold">
                              {stat.lossRatePct !== null
                                ? `${stat.lossRatePct.toFixed(1)}%`
                                : "—"}
                            </span>
                          </div>
                          <p className="text-[10px] text-rose-400/80">
                            {stat.losses} {stat.losses === 1 ? "Loss" : "Losses"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Telemetry + Filter Trigger */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 font-mono text-[11px]">
                    <div className="text-slate-400 tabular-nums">
                      <span>
                        PF:{" "}
                        <strong className="text-slate-200">
                          {stat.profitFactor === null
                            ? "—"
                            : stat.profitFactor === Infinity
                            ? "∞"
                            : stat.profitFactor.toFixed(2)}
                        </strong>
                      </span>
                      {stat.avgRR !== null && (
                        <span className="ml-2.5">
                          Avg R:R{" "}
                          <strong className="text-slate-200">
                            1:{stat.avgRR.toFixed(1)}
                          </strong>
                        </span>
                      )}
                    </div>

                    {groupMode === "setup" && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectStrategyFilter(isSelected ? null : stat.key)
                        }
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                          isSelected
                            ? "bg-cyan-500 text-slate-950"
                            : "border border-slate-800 bg-[#0E131B] text-cyan-300 hover:border-cyan-500/40"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Filtered</span>
                          </>
                        ) : (
                          <span>Filter Setups</span>
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
