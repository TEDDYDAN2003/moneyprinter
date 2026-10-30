"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Clock,
  DollarSign,
  Edit3,
  Layers,
  Percent,
  Plus,
  Search,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import {
  computeTradeMetrics,
  createJournalEntry,
  deleteJournalEntry,
  fetchJournalEntries,
  formatPrice,
  formatUsd,
  JournalEntry,
  JournalEntryInput,
  LEVERAGE_PRESETS,
  normalizeSymbol,
  POPULAR_SYMBOLS,
  TradeType,
  updateJournalEntry,
} from "@/lib/journal";

type LedgerFilter = "all" | "buy" | "sell" | "win" | "loss" | "open";

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function formatDisplayDateTime(iso: string): { date: string; time: string } {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { date: iso, time: "" };
  }
  return {
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(parsed),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(parsed),
  };
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationHint, setMigrationHint] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filters
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("XAU/USD");
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [lotSize, setLotSize] = useState("0.01");
  const [openingPrice, setOpeningPrice] = useState("");
  const [closingPrice, setClosingPrice] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const [leverage, setLeverage] = useState("2000");

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadJournal = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      const res = await fetchJournalEntries();
      setEntries(res.entries);
      setMigrationHint(res.migrationHint ?? null);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to load journal records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormError(null);
    setSymbol("XAU/USD");
    setTradeType("buy");
    setLotSize("0.01");
    setOpeningPrice("");
    setClosingPrice("");
    setTakeProfit("");
    setStopLoss("");
    setDateTimeLocal(toLocalDateTimeInputValue(new Date()));
    setLeverage("2000");
    setModalOpen(true);
  };

  const openEditModal = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormError(null);
    setSymbol(entry.symbol);
    setTradeType(entry.tradeType);
    setLotSize(String(entry.lotSize));
    setOpeningPrice(String(entry.openingPrice));
    setClosingPrice(
      entry.closingPrice !== null ? String(entry.closingPrice) : ""
    );
    setTakeProfit(entry.takeProfit !== null ? String(entry.takeProfit) : "");
    setStopLoss(entry.stopLoss !== null ? String(entry.stopLoss) : "");
    const parsedDate = new Date(entry.tradedAt);
    setDateTimeLocal(
      Number.isNaN(parsedDate.getTime())
        ? toLocalDateTimeInputValue(new Date())
        : toLocalDateTimeInputValue(parsedDate)
    );
    setLeverage(String(entry.leverage));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingEntry(null);
    setFormError(null);
  };

  // Live form metrics preview
  const liveFormMetrics = useMemo(() => {
    const parsedLots = parseFloat(lotSize);
    const parsedOpen = parseFloat(openingPrice);
    const parsedClose = closingPrice.trim() ? parseFloat(closingPrice) : null;
    const parsedTp = takeProfit.trim() ? parseFloat(takeProfit) : null;
    const parsedSl = stopLoss.trim() ? parseFloat(stopLoss) : null;
    const parsedLev = parseInt(leverage, 10);

    return computeTradeMetrics({
      symbol: symbol || "XAU/USD",
      tradeType,
      lotSize: Number.isFinite(parsedLots) ? parsedLots : 0,
      openingPrice: Number.isFinite(parsedOpen) ? parsedOpen : 0,
      closingPrice:
        parsedClose !== null && Number.isFinite(parsedClose) ? parsedClose : null,
      stopLoss: parsedSl !== null && Number.isFinite(parsedSl) ? parsedSl : null,
      takeProfit:
        parsedTp !== null && Number.isFinite(parsedTp) ? parsedTp : null,
      leverage: Number.isFinite(parsedLev) ? parsedLev : 500,
    });
  }, [
    symbol,
    tradeType,
    lotSize,
    openingPrice,
    closingPrice,
    takeProfit,
    stopLoss,
    leverage,
  ]);

  // Non-blocking geometry hint (e.g. if TP/SL look reversed for BUY/SELL)
  const geometryWarning = useMemo(() => {
    const open = parseFloat(openingPrice);
    const sl = stopLoss.trim() ? parseFloat(stopLoss) : null;
    const tp = takeProfit.trim() ? parseFloat(takeProfit) : null;
    if (!Number.isFinite(open) || open <= 0) return null;

    if (tradeType === "buy") {
      if (tp !== null && Number.isFinite(tp) && tp <= open) {
        return "Heads up: On a BUY trade, Take Profit (TP) is normally above Opening Price.";
      }
      if (sl !== null && Number.isFinite(sl) && sl > open) {
        return "Note: Stop Loss (SL) is above Opening Price (trailed stop in profit).";
      }
    } else {
      if (tp !== null && Number.isFinite(tp) && tp >= open) {
        return "Heads up: On a SELL trade, Take Profit (TP) is normally below Opening Price.";
      }
      if (sl !== null && Number.isFinite(sl) && sl < open) {
        return "Note: Stop Loss (SL) is below Opening Price (trailed stop in profit).";
      }
    }
    return null;
  }, [tradeType, openingPrice, stopLoss, takeProfit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedLots = parseFloat(lotSize);
    const parsedOpen = parseFloat(openingPrice);
    const parsedClose = closingPrice.trim() ? parseFloat(closingPrice) : null;
    const parsedTp = takeProfit.trim() ? parseFloat(takeProfit) : null;
    const parsedSl = stopLoss.trim() ? parseFloat(stopLoss) : null;
    const parsedLev = parseInt(leverage, 10);

    if (!normalizeSymbol(symbol)) {
      setFormError("Please enter a Symbol / Currency Pair (e.g. XAU/USD).");
      return;
    }
    if (!Number.isFinite(parsedLots) || parsedLots <= 0) {
      setFormError("Please enter a valid Volume / Lot Size (e.g. 0.01).");
      return;
    }
    if (!Number.isFinite(parsedOpen) || parsedOpen <= 0) {
      setFormError("Please enter a valid Opening Price.");
      return;
    }
    if (parsedClose !== null && (!Number.isFinite(parsedClose) || parsedClose <= 0)) {
      setFormError("Closing Price must be a positive number (or leave blank if still open).");
      return;
    }
    if (parsedTp !== null && (!Number.isFinite(parsedTp) || parsedTp <= 0)) {
      setFormError("Take Profit (TP) must be a positive price.");
      return;
    }
    if (parsedSl !== null && (!Number.isFinite(parsedSl) || parsedSl <= 0)) {
      setFormError("Stop Loss (SL) must be a positive price.");
      return;
    }
    if (!Number.isFinite(parsedLev) || parsedLev < 1) {
      setFormError("Leverage must be at least 1 (e.g. 500 for 1:500).");
      return;
    }

    const parsedDate = dateTimeLocal ? new Date(dateTimeLocal) : new Date();
    const tradedAtIso = Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    const payload: JournalEntryInput = {
      symbol,
      tradeType,
      lotSize: parsedLots,
      openingPrice: parsedOpen,
      closingPrice: parsedClose,
      takeProfit: parsedTp,
      stopLoss: parsedSl,
      leverage: parsedLev,
      tradedAt: tradedAtIso,
    };

    try {
      setSubmitting(true);
      if (editingEntry) {
        const updated = await updateJournalEntry(
          editingEntry.id,
          payload,
          editingEntry.isLocalPreview
        );
        setEntries((prev) =>
          prev
            .map((row) => (row.id === updated.id ? updated : row))
            .sort((a, b) => b.tradedAt.localeCompare(a.tradedAt))
        );
      } else {
        const created = await createJournalEntry(payload);
        setEntries((prev) =>
          [created, ...prev].sort((a, b) => b.tradedAt.localeCompare(a.tradedAt))
        );
      }
      setModalOpen(false);
      setEditingEntry(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save journal record."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entry: JournalEntry) => {
    try {
      await deleteJournalEntry(entry);
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      setConfirmDeleteId(null);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to delete journal record."
      );
    }
  };

  // Precompute metrics per entry + aggregate KPI summary
  const enrichedEntries = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      metrics: computeTradeMetrics(entry),
    }));
  }, [entries]);

  const kpis = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let openCount = 0;
    let netPnl = 0;
    let grossProfit = 0;
    let grossLossAbs = 0;
    let totalLots = 0;
    const rrList: number[] = [];
    const riskList: number[] = [];

    for (const { entry, metrics } of enrichedEntries) {
      totalLots += entry.lotSize;
      if (metrics.plannedRR !== null && metrics.plannedRR > 0) {
        rrList.push(metrics.plannedRR);
      }
      if (metrics.plannedRiskUsd !== null && metrics.plannedRiskUsd > 0) {
        riskList.push(metrics.plannedRiskUsd);
      }

      if (metrics.outcome === "open") {
        openCount++;
      } else if (metrics.outcome === "win") {
        wins++;
        const pnl = metrics.realizedPnlUsd ?? 0;
        netPnl += pnl;
        grossProfit += pnl;
      } else if (metrics.outcome === "loss") {
        losses++;
        const pnl = metrics.realizedPnlUsd ?? 0;
        netPnl += pnl;
        grossLossAbs += Math.abs(pnl);
      } else {
        breakevens++;
      }
    }

    const closedCount = wins + losses + breakevens;
    const decisiveCount = wins + losses;
    const winRate = decisiveCount > 0 ? (wins / decisiveCount) * 100 : null;
    const profitFactor =
      grossLossAbs > 0
        ? grossProfit / grossLossAbs
        : grossProfit > 0
        ? Infinity
        : null;
    const avgRR =
      rrList.length > 0
        ? rrList.reduce((acc, v) => acc + v, 0) / rrList.length
        : null;
    const avgRisk =
      riskList.length > 0
        ? riskList.reduce((acc, v) => acc + v, 0) / riskList.length
        : null;

    return {
      wins,
      losses,
      breakevens,
      openCount,
      closedCount,
      totalCount: enrichedEntries.length,
      totalLots,
      netPnl,
      winRate,
      profitFactor,
      avgRR,
      avgRisk,
    };
  }, [enrichedEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    return enrichedEntries.filter(({ entry, metrics }) => {
      if (q && !entry.symbol.toUpperCase().includes(q)) {
        return false;
      }
      if (filter === "buy") return entry.tradeType === "buy";
      if (filter === "sell") return entry.tradeType === "sell";
      if (filter === "win") return metrics.outcome === "win";
      if (filter === "loss") return metrics.outcome === "loss";
      if (filter === "open") return metrics.outcome === "open";
      return true;
    });
  }, [enrichedEntries, filter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header with Plus (+) Button */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
            Admin
          </span>
          <span className="text-slate-700">/</span>
          <span className="font-mono text-xs text-slate-400">Journal</span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Trading Journal
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Log trade executions with symbol, buy/sell direction, volume lot
              size, TP &amp; SL, opening &amp; closing prices, date/time, and
              leverage.
            </p>
          </div>

          {/* Primary Plus (+) Button in Header */}
          <button
            type="button"
            onClick={openCreateModal}
            aria-label="Add new journal record"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.28)] transition hover:bg-emerald-400 active:scale-[0.99]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-950/15">
              <Plus className="h-4 w-4 stroke-[2.6]" />
            </span>
            <span>New Record</span>
          </button>
        </div>
      </div>

      {/* Optional Error / Migration Notice */}
      {pageError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            {pageError}
          </span>
          <button
            type="button"
            onClick={() => setPageError(null)}
            className="text-rose-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {migrationHint && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <strong className="font-semibold text-amber-300">
            Local Storage Fallback Active:{" "}
          </strong>
          {migrationHint}
        </div>
      )}

      {/* Dynamic KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Win Rate */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Win Rate</span>
            <Percent className="h-4 w-4 text-emerald-400/80" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {kpis.winRate !== null ? `${kpis.winRate.toFixed(1)}%` : "—"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {kpis.closedCount > 0
              ? `${kpis.wins}W · ${kpis.losses}L · ${kpis.breakevens}BE`
              : "Calculated from closed records"}
          </p>
        </div>

        {/* Net Realized P&L */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Net Realized P&amp;L
            </span>
            <DollarSign className="h-4 w-4 text-emerald-400/80" />
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
              kpis.closedCount === 0
                ? "text-white"
                : kpis.netPnl > 0.004
                ? "text-emerald-400"
                : kpis.netPnl < -0.004
                ? "text-rose-400"
                : "text-slate-200"
            }`}
          >
            {kpis.closedCount > 0 ? formatUsd(kpis.netPnl, true) : "—"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {kpis.profitFactor !== null
              ? `Profit Factor: ${
                  kpis.profitFactor === Infinity
                    ? "∞"
                    : kpis.profitFactor.toFixed(2)
                }`
              : "Standard contract P&L"}
          </p>
        </div>

        {/* Planned Risk & R:R */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Avg Planned R:R &amp; Risk
            </span>
            <Shield className="h-4 w-4 text-emerald-400/80" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {kpis.avgRR !== null ? `1 : ${kpis.avgRR.toFixed(2)}` : "—"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {kpis.avgRisk !== null
              ? `Avg SL Risk: ${formatUsd(kpis.avgRisk)}`
              : "Derived from TP, SL & Lot Size"}
          </p>
        </div>

        {/* Logged Trades & Volume */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Logged Trades
            </span>
            <Layers className="h-4 w-4 text-emerald-400/80" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {kpis.totalCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {kpis.totalCount > 0
              ? `${kpis.closedCount} Closed · ${kpis.openCount} Open · ${kpis.totalLots.toFixed(
                  2
                )} Lots`
              : "Click + New Record to log"}
          </p>
        </div>
      </div>

      {/* Execution Ledger Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]">
        {/* Toolbar: Filter Tabs + Search */}
        <div className="flex flex-col gap-3 border-b border-slate-800/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: `All (${kpis.totalCount})` },
                { id: "buy", label: "Buy" },
                { id: "sell", label: "Sell" },
                { id: "win", label: `Wins (${kpis.wins})` },
                { id: "loss", label: `Losses (${kpis.losses})` },
                { id: "open", label: `Open (${kpis.openCount})` },
              ] as { id: LedgerFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-medium transition ${
                  filter === tab.id
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter symbol (e.g. XAU)..."
              className="w-full rounded-xl border border-slate-800 bg-[#090D13] py-1.5 pl-8 pr-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#090D13] font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Date &amp; Time
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Symbol
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Type
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Volume (Lots)
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Leverage / Margin
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Opening → Closing
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  SL &amp; TP
                </th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Result / P&amp;L
                </th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70 text-sm">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center font-mono text-xs text-slate-400"
                  >
                    Loading journal records...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center">
                    <div className="mx-auto max-w-md space-y-3">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">
                        {entries.length === 0
                          ? "No journal records yet"
                          : "No records match the current filter"}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-500">
                        {entries.length === 0
                          ? "Click the + New Record button in the top-right header to log your first trade with symbol, buy/sell type, lot size, TP/SL, opening/closing prices, date & time, and leverage."
                          : "Try clearing the symbol filter or switching tabs above."}
                      </p>
                      {entries.length === 0 && (
                        <button
                          type="button"
                          onClick={openCreateModal}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create First Record</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map(({ entry, metrics }) => {
                  const dt = formatDisplayDateTime(entry.tradedAt);
                  const isBuy = entry.tradeType === "buy";

                  return (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-[#111722]"
                    >
                      {/* Date & Time */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <p className="font-mono text-xs font-medium text-slate-200">
                          {dt.date}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {dt.time}
                        </p>
                      </td>

                      {/* Symbol */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <span className="rounded-lg border border-slate-700/80 bg-[#090D13] px-2.5 py-1 font-mono text-xs font-bold text-white">
                          {entry.symbol}
                        </span>
                      </td>

                      {/* Type (BUY / SELL) */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {isBuy ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-emerald-300">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            BUY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/35 bg-rose-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-rose-300">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            SELL
                          </span>
                        )}
                      </td>

                      {/* Volume Lot Size */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <p className="font-mono text-xs font-bold text-white tabular-nums">
                          {entry.lotSize.toFixed(2)}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                          {metrics.contractLabel}
                        </p>
                      </td>

                      {/* Leverage & Used Margin */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <p className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                          1:{entry.leverage}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                          Margin: {formatUsd(metrics.usedMarginUsd)}
                        </p>
                      </td>

                      {/* Opening -> Closing Price */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                          <span className="text-slate-200">
                            {formatPrice(entry.openingPrice, entry.symbol)}
                          </span>
                          <span className="text-slate-600">→</span>
                          {entry.closingPrice !== null ? (
                            <span className="font-semibold text-white">
                              {formatPrice(entry.closingPrice, entry.symbol)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditModal(entry)}
                              className="rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20"
                            >
                              OPEN · Set Close
                            </button>
                          )}
                        </div>
                        {metrics.realizedMoveLabel && (
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                            {metrics.realizedMoveLabel}
                          </p>
                        )}
                      </td>

                      {/* SL & TP */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="space-y-0.5 font-mono text-[11px] tabular-nums">
                          <p className="text-rose-300/90">
                            SL: {formatPrice(entry.stopLoss, entry.symbol)}
                            {metrics.plannedRiskUsd !== null &&
                            metrics.plannedRiskUsd > 0
                              ? ` (${formatUsd(-metrics.plannedRiskUsd)})`
                              : ""}
                          </p>
                          <p className="text-emerald-300/90">
                            TP: {formatPrice(entry.takeProfit, entry.symbol)}
                            {metrics.plannedRR !== null
                              ? ` · 1:${metrics.plannedRR.toFixed(1)}`
                              : ""}
                          </p>
                        </div>
                      </td>

                      {/* Result / Realized P&L */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {metrics.outcome === "open" ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
                            <Clock className="h-3 w-3" />
                            RUNNING
                          </span>
                        ) : metrics.outcome === "win" ? (
                          <div>
                            <p className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                              {formatUsd(metrics.realizedPnlUsd ?? 0, true)}
                            </p>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                              WIN
                            </span>
                          </div>
                        ) : metrics.outcome === "loss" ? (
                          <div>
                            <p className="font-mono text-xs font-bold text-rose-400 tabular-nums">
                              {formatUsd(metrics.realizedPnlUsd ?? 0, true)}
                            </p>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-500">
                              LOSS
                            </span>
                          </div>
                        ) : (
                          <div>
                            <p className="font-mono text-xs font-bold text-slate-300 tabular-nums">
                              $0.00
                            </p>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                              BREAKEVEN
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        {confirmDeleteId === entry.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDelete(entry)}
                              className="rounded-lg bg-rose-500 px-2 py-1 font-mono text-[11px] font-bold text-white hover:bg-rose-400"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-300 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(entry)}
                              title="Edit record"
                              className="rounded-lg border border-slate-800 bg-[#090D13] p-1.5 text-slate-400 transition hover:border-slate-600 hover:text-white"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(entry.id)}
                              title="Delete record"
                              className="rounded-lg border border-slate-800 bg-[#090D13] p-1.5 text-slate-400 transition hover:border-rose-500/40 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Journal Record Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-modal-title"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-[#0D121A] shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/90 px-6 py-4">
              <div>
                <h2
                  id="journal-modal-title"
                  className="text-lg font-bold text-white"
                >
                  {editingEntry ? "Edit Journal Record" : "New Journal Record"}
                </h2>
                <p className="text-xs text-slate-400">
                  Enter trade execution parameters below. Margin, R:R, and P&amp;L
                  compute automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(90vh-76px)] overflow-y-auto p-6 space-y-5"
            >
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Symbol + Trade Type (Buy / Sell) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="journal-symbol"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Symbol (Currency Pair)
                  </label>
                  <input
                    id="journal-symbol"
                    type="text"
                    required
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. XAU/USD, EUR/USD, US30"
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#080B10] px-3.5 py-2.5 font-mono text-sm font-bold text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  {/* Quick Symbol Pills */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {POPULAR_SYMBOLS.slice(0, 7).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setSymbol(sym)}
                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] transition ${
                          normalizeSymbol(symbol) === sym
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold"
                            : "border-slate-800 bg-[#090D13] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buy / Sell Toggle */}
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Type (Buy or Sell)
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTradeType("buy")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-mono text-sm font-bold transition ${
                        tradeType === "buy"
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[inset_0_1px_0_rgba(16,185,129,0.25)]"
                          : "border-slate-800 bg-[#080B10] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradeType("sell")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-mono text-sm font-bold transition ${
                        tradeType === "sell"
                          ? "border-rose-500 bg-rose-500/20 text-rose-300 shadow-[inset_0_1px_0_rgba(244,63,94,0.25)]"
                          : "border-slate-800 bg-[#080B10] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <ArrowDownRight className="h-4 w-4" />
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Volume Lot Size + Leverage */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="journal-lot-size"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Volume / Lot Size
                  </label>
                  <input
                    id="journal-lot-size"
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                    placeholder="0.01"
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#080B10] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["0.01", "0.02", "0.05", "0.10", "0.50", "1.00"].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setLotSize(preset)}
                          className={`rounded-md border px-2 py-0.5 font-mono text-[10px] transition ${
                            lotSize === preset
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold"
                              : "border-slate-800 bg-[#090D13] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="journal-leverage"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Leverage (1 : X)
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
                      1 :
                    </span>
                    <input
                      id="journal-leverage"
                      type="number"
                      min="1"
                      max="100000"
                      step="1"
                      required
                      value={leverage}
                      onChange={(e) => setLeverage(e.target.value)}
                      placeholder="2000"
                      className="w-full rounded-xl border border-slate-800 bg-[#080B10] py-2.5 pl-10 pr-3.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {LEVERAGE_PRESETS.map((lev) => (
                      <button
                        key={lev}
                        type="button"
                        onClick={() => setLeverage(String(lev))}
                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] transition ${
                          Number(leverage) === lev
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-semibold"
                            : "border-slate-800 bg-[#090D13] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        1:{lev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Opening Price & Closing Price */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="journal-open-price"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Opening Price
                  </label>
                  <input
                    id="journal-open-price"
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={openingPrice}
                    onChange={(e) => setOpeningPrice(e.target.value)}
                    placeholder="e.g. 4015.50"
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#080B10] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="journal-close-price"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                    >
                      Closing Price
                    </label>
                    <span className="font-mono text-[10px] text-slate-500">
                      Leave blank if still open
                    </span>
                  </div>
                  <input
                    id="journal-close-price"
                    type="number"
                    step="any"
                    min="0"
                    value={closingPrice}
                    onChange={(e) => setClosingPrice(e.target.value)}
                    placeholder="e.g. 3992.00"
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#080B10] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Stop Loss (SL) & Take Profit (TP) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="journal-sl"
                    className="block text-xs font-semibold uppercase tracking-wider text-rose-300"
                  >
                    Stop Loss (SL)
                  </label>
                  <input
                    id="journal-sl"
                    type="number"
                    step="any"
                    min="0"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="e.g. 4023.00"
                    className="mt-1.5 w-full rounded-xl border border-rose-500/25 bg-[#080B10] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="journal-tp"
                    className="block text-xs font-semibold uppercase tracking-wider text-emerald-300"
                  >
                    Take Profit (TP)
                  </label>
                  <input
                    id="journal-tp"
                    type="number"
                    step="any"
                    min="0"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="e.g. 3990.00"
                    className="mt-1.5 w-full rounded-xl border border-emerald-500/25 bg-[#080B10] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {geometryWarning && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 font-mono text-[11px] text-amber-200">
                  {geometryWarning}
                </div>
              )}

              {/* Row 5: Date & Time */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="journal-datetime"
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Date &amp; Time</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDateTimeLocal(toLocalDateTimeInputValue(new Date()))
                    }
                    className="font-mono text-[11px] text-emerald-400 hover:text-emerald-300"
                  >
                    Set to Now
                  </button>
                </div>
                <input
                  id="journal-datetime"
                  type="datetime-local"
                  required
                  value={dateTimeLocal}
                  onChange={(e) => setDateTimeLocal(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#080B10] px-3.5 py-2.5 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
                />
              </div>

              {/* Live Calculated Preview Telemetry */}
              <div className="rounded-xl border border-slate-800 bg-[#080B10] p-4">
                <p className="mb-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Live Position Telemetry ({liveFormMetrics.contractLabel})
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <span className="font-mono text-[10px] text-slate-500">
                      Used Margin
                    </span>
                    <p className="font-mono text-xs font-bold text-slate-200 tabular-nums">
                      {liveFormMetrics.usedMarginUsd > 0
                        ? formatUsd(liveFormMetrics.usedMarginUsd)
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] text-slate-500">
                      Planned SL Risk
                    </span>
                    <p className="font-mono text-xs font-bold text-rose-300 tabular-nums">
                      {liveFormMetrics.plannedRiskUsd !== null &&
                      liveFormMetrics.plannedRiskUsd > 0
                        ? formatUsd(-liveFormMetrics.plannedRiskUsd)
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] text-slate-500">
                      Planned TP / R:R
                    </span>
                    <p className="font-mono text-xs font-bold text-emerald-300 tabular-nums">
                      {liveFormMetrics.plannedRewardUsd !== null &&
                      liveFormMetrics.plannedRewardUsd > 0
                        ? `${formatUsd(liveFormMetrics.plannedRewardUsd, true)}${
                            liveFormMetrics.plannedRR !== null
                              ? ` (1:${liveFormMetrics.plannedRR.toFixed(1)})`
                              : ""
                          }`
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] text-slate-500">
                      Realized P&amp;L
                    </span>
                    <p
                      className={`font-mono text-xs font-bold tabular-nums ${
                        liveFormMetrics.realizedPnlUsd === null
                          ? "text-amber-300"
                          : liveFormMetrics.realizedPnlUsd > 0
                          ? "text-emerald-400"
                          : liveFormMetrics.realizedPnlUsd < 0
                          ? "text-rose-400"
                          : "text-slate-200"
                      }`}
                    >
                      {liveFormMetrics.realizedPnlUsd === null
                        ? "OPEN"
                        : formatUsd(liveFormMetrics.realizedPnlUsd, true)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-800 bg-[#090D13] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>
                    {submitting
                      ? "Saving..."
                      : editingEntry
                      ? "Save Changes"
                      : "Save Record"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
