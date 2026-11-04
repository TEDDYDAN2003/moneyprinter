"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  X,
} from "lucide-react";
import {
  computeTradeMetrics,
  formatUsd,
  type AccountType,
  type JournalEntry,
} from "@/lib/journal";

interface JournalPnlCalendarProps {
  entries: JournalEntry[];
  activeAccount: AccountType;
  showAllAccounts: boolean;
  selectedDateFilter: string | null;
  onSelectDateFilter: (dateKey: string | null) => void;
}

type CalendarViewScope = "month" | "week";
type CellMetricMode = "avg" | "total";

interface DayPnlBucket {
  dateKey: string; // YYYY-MM-DD in local time
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  totalNetPnl: number;
  avgPnlPerTrade: number;
}

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseEntryDateKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalDateKey(d);
}

/**
 * Formats cell dollar figure cleanly like the reference calendar:
 * - >= $100: compact whole dollar `$2,311` / `-$2,557`
 * - < $100: `$96` if near whole integer, otherwise `$24.50`
 */
function formatCellDollar(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < -0.004 ? "-" : "";
  if (abs >= 100 || Math.abs(abs - Math.round(abs)) < 0.05) {
    return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  }
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function JournalPnlCalendar({
  entries,
  activeAccount,
  showAllAccounts,
  selectedDateFilter,
  onSelectDateFilter,
}: JournalPnlCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toLocalDateKey(today), [today]);

  const [cursorDate, setCursorDate] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [selectedDayKey, setSelectedDayKey] = useState<string>(todayKey);
  const [viewScope, setViewScope] = useState<CalendarViewScope>("month");
  const [metricMode, setMetricMode] = useState<CellMetricMode>("avg");
  const [collapsed, setCollapsed] = useState(true);
  const [hasAutoAlignedMonth, setHasAutoAlignedMonth] = useState(false);

  // Filter entries to current account tab (or all accounts if toggled)
  const scopedEntries = useMemo(() => {
    if (showAllAccounts) return entries;
    return entries.filter((e) => e.accountType === activeAccount);
  }, [entries, activeAccount, showAllAccounts]);

  // Group trades by local calendar date YYYY-MM-DD and compute Daily Avg & Daily Total P&L
  const bucketsByDate = useMemo(() => {
    const map = new Map<string, DayPnlBucket>();

    for (const entry of scopedEntries) {
      const dateKey = parseEntryDateKey(entry.tradedAt);
      if (!dateKey) continue;

      const metrics = computeTradeMetrics(entry);
      let bucket = map.get(dateKey);
      if (!bucket) {
        bucket = {
          dateKey,
          totalTrades: 0,
          closedTrades: 0,
          openTrades: 0,
          wins: 0,
          losses: 0,
          breakevens: 0,
          totalNetPnl: 0,
          avgPnlPerTrade: 0,
        };
        map.set(dateKey, bucket);
      }

      bucket.totalTrades += 1;
      if (metrics.outcome === "open" || metrics.realizedPnlUsd === null) {
        bucket.openTrades += 1;
      } else {
        bucket.closedTrades += 1;
        bucket.totalNetPnl += metrics.realizedPnlUsd;
        if (metrics.outcome === "win") bucket.wins += 1;
        else if (metrics.outcome === "loss") bucket.losses += 1;
        else bucket.breakevens += 1;
      }
    }

    map.forEach((b) => {
      b.avgPnlPerTrade =
        b.closedTrades > 0 ? b.totalNetPnl / b.closedTrades : 0;
    });

    return map;
  }, [scopedEntries]);

  // If current month has 0 trades when records first load, align to the latest traded month
  useEffect(() => {
    if (hasAutoAlignedMonth || scopedEntries.length === 0) return;
    const currentMonthPrefix = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;
    const hasCurrentMonthTrade = Array.from(bucketsByDate.keys()).some((k) =>
      k.startsWith(currentMonthPrefix)
    );
    if (!hasCurrentMonthTrade) {
      const latestKey = Array.from(bucketsByDate.keys()).sort().pop();
      if (latestKey) {
        const [yy, mm, dd] = latestKey.split("-").map(Number);
        if (yy && mm && dd) {
          setCursorDate(new Date(yy, mm - 1, dd));
          setSelectedDayKey(latestKey);
        }
      }
    }
    setHasAutoAlignedMonth(true);
  }, [bucketsByDate, hasAutoAlignedMonth, scopedEntries.length, today]);

  const activeYear = cursorDate.getFullYear();
  const activeMonth = cursorDate.getMonth(); // 0..11

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(activeYear, activeMonth, 1)),
    [activeMonth, activeYear]
  );

  // Build 42-cell (6 weeks x 7 days) calendar matrix for the active month,
  // or 7-cell row when in 'week' mode
  const calendarDays = useMemo(() => {
    if (viewScope === "week") {
      const base = new Date(
        cursorDate.getFullYear(),
        cursorDate.getMonth(),
        cursorDate.getDate()
      );
      const dayOfWeek = base.getDay(); // 0 (Sun) .. 6 (Sat)
      const startOfWeek = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate() - dayOfWeek
      );

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(
          startOfWeek.getFullYear(),
          startOfWeek.getMonth(),
          startOfWeek.getDate() + i
        );
        return {
          date: d,
          dateKey: toLocalDateKey(d),
          dayNumber: d.getDate(),
          inCurrentMonth: d.getMonth() === activeMonth,
        };
      });
    }

    const firstOfMonth = new Date(activeYear, activeMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 (Sun) .. 6 (Sat)
    const gridStart = new Date(activeYear, activeMonth, 1 - startWeekday);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i
      );
      return {
        date: d,
        dateKey: toLocalDateKey(d),
        dayNumber: d.getDate(),
        inCurrentMonth: d.getMonth() === activeMonth,
      };
    });
  }, [activeMonth, activeYear, cursorDate, viewScope]);

  // Monthly aggregated stats for the displayed month
  const monthlySummary = useMemo(() => {
    const monthPrefix = `${activeYear}-${String(activeMonth + 1).padStart(
      2,
      "0"
    )}`;
    let monthlyNetPnl = 0;
    let monthlyClosedTrades = 0;
    let activeTradingDays = 0;
    let sumOfDailyAverages = 0;
    let greenDays = 0;
    let redDays = 0;

    bucketsByDate.forEach((b, key) => {
      if (!key.startsWith(monthPrefix)) return;
      if (b.closedTrades > 0) {
        monthlyNetPnl += b.totalNetPnl;
        monthlyClosedTrades += b.closedTrades;
        activeTradingDays += 1;
        sumOfDailyAverages += b.avgPnlPerTrade;
        if (b.avgPnlPerTrade > 0.004) greenDays += 1;
        else if (b.avgPnlPerTrade < -0.004) redDays += 1;
      }
    });

    const avgDailyPnl =
      activeTradingDays > 0 ? sumOfDailyAverages / activeTradingDays : 0;

    return {
      monthlyNetPnl,
      monthlyClosedTrades,
      activeTradingDays,
      avgDailyPnl,
      greenDays,
      redDays,
    };
  }, [activeMonth, activeYear, bucketsByDate]);

  function handlePrev() {
    if (viewScope === "week") {
      setCursorDate(
        (prev) =>
          new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7)
      );
    } else {
      setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  }

  function handleNext() {
    if (viewScope === "week") {
      setCursorDate(
        (prev) =>
          new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7)
      );
    } else {
      setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  }

  function handleJumpToday() {
    const now = new Date();
    setCursorDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    setSelectedDayKey(toLocalDateKey(now));
  }

  function handleCellClick(dateKey: string, cellDate: Date) {
    setSelectedDayKey(dateKey);
    if (cellDate.getMonth() !== activeMonth) {
      setCursorDate(
        new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate())
      );
    }
  }

  const selectedBucket = bucketsByDate.get(selectedDayKey) ?? null;
  const formattedSelectedDate = useMemo(() => {
    const [yy, mm, dd] = selectedDayKey.split("-").map(Number);
    if (!yy || !mm || !dd) return selectedDayKey;
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(yy, mm - 1, dd));
  }, [selectedDayKey]);

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0B0E14] p-4 sm:p-6 shadow-xl">
      {/* ================================================================= */}
      {/* Row 1: Month Title + Monthly P&L / Daily Avg Pill                 */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {monthTitle}
          </h2>

          {/* Monthly Summary Pill (click toggles Daily Avg vs Daily Net Total) */}
          <button
            type="button"
            onClick={() =>
              setMetricMode((prev) => (prev === "avg" ? "total" : "avg"))
            }
            title="Click to switch calendar cells between Daily Avg P&L per trade and Daily Total Net P&L"
            className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#141923] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-[#19202D]"
          >
            <span className="text-slate-400">
              {metricMode === "avg" ? "Monthly P&L (Daily Avg Mode):" : "Monthly Net P&L:"}
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                monthlySummary.monthlyNetPnl > 0.004
                  ? "text-emerald-400"
                  : monthlySummary.monthlyNetPnl < -0.004
                  ? "text-rose-400"
                  : "text-slate-200"
              }`}
            >
              {formatUsd(monthlySummary.monthlyNetPnl, true)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {monthlySummary.activeTradingDays > 0 && (
            <span className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-800/90 bg-[#0F141D] px-3 py-1 font-mono text-[11px] text-slate-400">
              <span>
                Avg Day:{" "}
                <strong
                  className={
                    monthlySummary.avgDailyPnl >= 0
                      ? "text-emerald-300"
                      : "text-rose-300"
                  }
                >
                  {formatUsd(monthlySummary.avgDailyPnl, true)}
                </strong>
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-emerald-400">
                {monthlySummary.greenDays}G
              </span>
              <span>/</span>
              <span className="text-rose-400">{monthlySummary.redDays}R</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-[#111620] px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white"
        >
          <CalendarIcon className="h-3.5 w-3.5 text-emerald-400" />
          <span>{collapsed ? "Show Calendar" : "Hide"}</span>
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* =============================================================== */}
          {/* Row 2: Week / Month Switcher + Avg/Total Toggle + < > Today     */}
          {/* =============================================================== */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-800 bg-[#111620] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewScope("week")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    viewScope === "week"
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope("month")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    viewScope === "month"
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Month
                </button>
              </div>

              {/* Explicit Metric Mode Selector: Daily Avg P&L vs Daily Net P&L */}
              <div className="inline-flex rounded-xl border border-slate-800 bg-[#111620] p-0.5">
                <button
                  type="button"
                  onClick={() => setMetricMode("avg")}
                  className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold transition ${
                    metricMode === "avg"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  Daily Avg P&amp;L
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode("total")}
                  className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold transition ${
                    metricMode === "total"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  Daily Net Total
                </button>
              </div>
            </div>

            {/* Navigation Controls (< > Today) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous period"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#111620] text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next period"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#111620] text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleJumpToday}
                className="rounded-lg border border-slate-800 bg-[#111620] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                Today
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* Calendar 7-Column Grid                                          */}
          {/* =============================================================== */}
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800/90 bg-[#12161E]">
            {/* Weekday Header Row (S M T W T F S) */}
            <div className="grid grid-cols-7 border-b border-slate-800/90 bg-[#151A24]">
              {WEEKDAY_HEADERS.map((dayLabel, idx) => (
                <div
                  key={idx}
                  className="border-r border-slate-800/80 last:border-r-0 py-2.5 text-center font-mono text-xs font-semibold text-slate-400"
                >
                  {dayLabel}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((cell) => {
                const bucket = bucketsByDate.get(cell.dateKey);
                const hasClosed = Boolean(bucket && bucket.closedTrades > 0);
                const hasOpenOnly = Boolean(
                  bucket && bucket.closedTrades === 0 && bucket.openTrades > 0
                );

                const displayValue = bucket
                  ? metricMode === "avg"
                    ? bucket.avgPnlPerTrade
                    : bucket.totalNetPnl
                  : 0;

                const isPositive = hasClosed && displayValue > 0.004;
                const isNegative = hasClosed && displayValue < -0.004;
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDayKey;
                const isFilteredDay = cell.dateKey === selectedDateFilter;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => handleCellClick(cell.dateKey, cell.date)}
                    className={`group relative flex min-h-[78px] sm:min-h-[94px] flex-col items-center justify-between border-b border-r border-slate-800/80 p-1.5 sm:p-2.5 text-center transition focus:outline-none ${
                      isPositive
                        ? "bg-emerald-950/55 hover:bg-emerald-900/50"
                        : isNegative
                        ? "bg-rose-950/55 hover:bg-rose-900/50"
                        : hasOpenOnly
                        ? "bg-sky-950/30 hover:bg-sky-900/30"
                        : cell.inCurrentMonth
                        ? "bg-[#11151D] hover:bg-[#171D28]"
                        : "bg-[#0C0F15] hover:bg-[#121720]"
                    } ${
                      isSelected || isFilteredDay
                        ? "ring-2 ring-inset ring-slate-200/80 z-10"
                        : ""
                    }`}
                  >
                    {/* Date Number (White circle when Today or Selected, matching screenshot) */}
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm font-medium tabular-nums ${
                        isToday || isSelected
                          ? "bg-white font-bold text-slate-950 shadow"
                          : cell.inCurrentMonth
                          ? "text-slate-200"
                          : "text-slate-600"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Middle Dollar P&L & Bottom Trade Count */}
                    {hasClosed && bucket ? (
                      <div className="mt-1 flex flex-col items-center leading-tight">
                        <span
                          className={`font-mono text-xs sm:text-base font-bold tracking-tight tabular-nums ${
                            isPositive
                              ? "text-emerald-400"
                              : isNegative
                              ? "text-rose-400"
                              : "text-slate-200"
                          }`}
                        >
                          {formatCellDollar(displayValue)}
                        </span>
                        <span className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                          {bucket.closedTrades}{" "}
                          {bucket.closedTrades === 1 ? "trade" : "trades"}
                        </span>
                      </div>
                    ) : hasOpenOnly && bucket ? (
                      <div className="mt-1 flex flex-col items-center leading-tight">
                        <span className="font-mono text-[11px] font-semibold text-sky-400">
                          OPEN
                        </span>
                        <span className="mt-0.5 text-[10px] text-slate-400">
                          {bucket.openTrades}{" "}
                          {bucket.openTrades === 1 ? "trade" : "trades"}
                        </span>
                      </div>
                    ) : (
                      <span className="h-5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* =============================================================== */}
          {/* Selected Day Breakdown & Quick Table Date Filter Footer         */}
          {/* =============================================================== */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#0F141D] px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-white">
                {formattedSelectedDate}
              </span>
              {selectedBucket ? (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300">
                    Daily Avg:{" "}
                    <strong
                      className={
                        selectedBucket.avgPnlPerTrade > 0.004
                          ? "text-emerald-400"
                          : selectedBucket.avgPnlPerTrade < -0.004
                          ? "text-rose-400"
                          : "text-slate-200"
                      }
                    >
                      {formatUsd(selectedBucket.avgPnlPerTrade, true)}
                    </strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300">
                    Day Net:{" "}
                    <strong
                      className={
                        selectedBucket.totalNetPnl > 0.004
                          ? "text-emerald-400"
                          : selectedBucket.totalNetPnl < -0.004
                          ? "text-rose-400"
                          : "text-slate-200"
                      }
                    >
                      {formatUsd(selectedBucket.totalNetPnl, true)}
                    </strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-400">
                    {selectedBucket.wins}W / {selectedBucket.losses}L
                    {selectedBucket.openTrades > 0
                      ? ` (${selectedBucket.openTrades} open)`
                      : ""}
                  </span>
                </>
              ) : (
                <span className="text-slate-500">
                  No trades recorded on this date.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedDateFilter === selectedDayKey ? (
                <button
                  type="button"
                  onClick={() => onSelectDateFilter(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <X className="h-3 w-3" />
                  <span>Clear Date Filter</span>
                </button>
              ) : (
                selectedBucket && (
                  <button
                    type="button"
                    onClick={() => onSelectDateFilter(selectedDayKey)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
                  >
                    <Filter className="h-3 w-3" />
                    <span>Filter Table to Day</span>
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
