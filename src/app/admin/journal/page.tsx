"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Camera,
  Clock,
  Crosshair,
  DollarSign,
  Download,
  Edit3,
  FlaskConical,
  ImagePlus,
  Layers,
  Percent,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import {
  AccountType,
  CashflowTransaction,
  CashflowType,
  computeAccountBalanceSummary,
  computeTradeMetrics,
  createCashflowTransaction,
  createJournalEntry,
  deleteCashflowTransaction,
  deleteJournalEntry,
  deleteJournalScreenshot,
  fetchAllJournalScreenshots,
  fetchCashflowTransactions,
  fetchJournalEntries,
  formatBytes,
  formatPrice,
  formatUsd,
  JOURNAL_SCREENSHOTS_BUCKET,
  JournalEntry,
  JournalEntryInput,
  JournalScreenshot,
  LEVERAGE_PRESETS,
  MAX_SCREENSHOT_SIZE_MB,
  normalizeSymbol,
  POPULAR_SYMBOLS,
  TradeType,
  updateJournalEntry,
  uploadJournalScreenshot,
  validateJournalScreenshot,
} from "@/lib/journal";
import {
  BACKTEST_SESSIONS,
  BACKTEST_TIMEFRAMES,
  formatStrategyLabel,
  STRATEGY_CATALOG,
  STRATEGY_FAMILIES,
} from "@/lib/strategies";
import { BacktestStrategyPiePanel } from "@/components/StrategyWinPieChart";

type LedgerFilter = "all" | "buy" | "sell" | "win" | "loss" | "open";
type ActiveSectionTab = "trades" | "cashflow";

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
  // Core Data State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [transactions, setTransactions] = useState<CashflowTransaction[]>([]);
  const [screenshotsByEntry, setScreenshotsByEntry] = useState<
    Record<string, JournalScreenshot[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [migrationHint, setMigrationHint] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Account Scope ('real' | 'demo' | 'backtest') & Active View ('trades' | 'cashflow')
  const [activeAccount, setActiveAccount] = useState<AccountType>("real");
  const [showAllAccountsInTable, setShowAllAccountsInTable] = useState(false);
  const [sectionTab, setSectionTab] = useState<ActiveSectionTab>("trades");

  // Trade & Strategy Filters
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrategyFilter, setSelectedStrategyFilter] = useState<
    string | null
  >(null);

  // Trade / Backtest Record Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formAccountType, setFormAccountType] = useState<AccountType>("real");
  const [strategyId, setStrategyId] = useState<string>(STRATEGY_CATALOG[0].id);
  const [timeframe, setTimeframe] = useState<string>("15M");
  const [sessionName, setSessionName] = useState<string>("New York Session");
  const [symbol, setSymbol] = useState("XAU/USD");
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [lotSize, setLotSize] = useState("0.01");
  const [openingPrice, setOpeningPrice] = useState("");
  const [closingPrice, setClosingPrice] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const [leverage, setLeverage] = useState("2000");
  const [notes, setNotes] = useState("");

  // Staged screenshot files inside New/Edit Modal
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Cashflow (Deposit / Withdrawal) Modal State
  const [cashflowModalOpen, setCashflowModalOpen] = useState(false);
  const [cashflowType, setCashflowType] = useState<CashflowType>("deposit");
  const [cashflowAccount, setCashflowAccount] = useState<AccountType>("real");
  const [cashflowAmount, setCashflowAmount] = useState("");
  const [cashflowNote, setCashflowNote] = useState("");
  const [cashflowDateTime, setCashflowDateTime] = useState("");
  const [cashflowSubmitting, setCashflowSubmitting] = useState(false);
  const [cashflowError, setCashflowError] = useState<string | null>(null);

  // Trade Study / Screenshots Viewer Modal State
  const [studyEntryId, setStudyEntryId] = useState<string | null>(null);
  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const [uploadingStudyShot, setUploadingStudyShot] = useState(false);
  const [studyShotError, setStudyShotError] = useState<string | null>(null);
  const studyFileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete confirmation states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(
    null
  );

  const loadAllJournalData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      const [entriesRes, txRes, shotsRes] = await Promise.all([
        fetchJournalEntries(),
        fetchCashflowTransactions(),
        fetchAllJournalScreenshots(),
      ]);
      setEntries(entriesRes.entries);
      setTransactions(txRes.transactions);
      setScreenshotsByEntry(shotsRes.byEntry);
      setMigrationHint(
        entriesRes.migrationHint ||
          txRes.migrationHint ||
          shotsRes.migrationHint ||
          null
      );
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to load journal data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllJournalData();
  }, [loadAllJournalData]);

  // Separate Balance Summaries for Real, Demo, and Backtesting
  const realBalanceSummary = useMemo(
    () => computeAccountBalanceSummary(entries, transactions, "real"),
    [entries, transactions]
  );

  const demoBalanceSummary = useMemo(
    () => computeAccountBalanceSummary(entries, transactions, "demo"),
    [entries, transactions]
  );

  const backtestBalanceSummary = useMemo(
    () => computeAccountBalanceSummary(entries, transactions, "backtest"),
    [entries, transactions]
  );

  const backtestEntries = useMemo(
    () => entries.filter((e) => e.accountType === "backtest"),
    [entries]
  );

  const activeBalance =
    activeAccount === "real"
      ? realBalanceSummary
      : activeAccount === "demo"
      ? demoBalanceSummary
      : backtestBalanceSummary;

  const isBacktestMode = activeAccount === "backtest";

  // --- Open Modals ---
  const openCreateModal = (overrideAccount?: AccountType) => {
    const targetMode = overrideAccount ?? activeAccount;
    setEditingEntry(null);
    setFormError(null);
    setFormAccountType(targetMode);
    setStrategyId(
      selectedStrategyFilter && selectedStrategyFilter !== "unspecified"
        ? selectedStrategyFilter
        : STRATEGY_CATALOG[0].id
    );
    setTimeframe("15M");
    setSessionName("New York Session");
    setSymbol("XAU/USD");
    setTradeType("buy");
    setLotSize("0.01");
    setOpeningPrice("");
    setClosingPrice("");
    setTakeProfit("");
    setStopLoss("");
    setDateTimeLocal(toLocalDateTimeInputValue(new Date()));
    setLeverage("2000");
    setNotes("");
    setStagedFiles([]);
    setModalOpen(true);
  };

  const openEditModal = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormError(null);
    setFormAccountType(entry.accountType);
    setStrategyId(entry.strategy || STRATEGY_CATALOG[0].id);
    setTimeframe(entry.timeframe || "15M");
    setSessionName(entry.sessionName || "");
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
    setNotes(entry.notes ?? "");
    setStagedFiles([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingEntry(null);
    setStagedFiles([]);
    setFormError(null);
  };

  const openCashflowModal = (type: CashflowType) => {
    setCashflowType(type);
    setCashflowAccount(activeAccount);
    setCashflowAmount("");
    setCashflowNote("");
    setCashflowDateTime(toLocalDateTimeInputValue(new Date()));
    setCashflowError(null);
    setCashflowModalOpen(true);
  };

  const closeCashflowModal = () => {
    if (cashflowSubmitting) return;
    setCashflowModalOpen(false);
    setCashflowError(null);
  };

  // --- Staged Screenshot Selection Inside Trade/Backtest Modal ---
  const handleStageFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFormError(null);
    const next: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const err = validateJournalScreenshot(f);
      if (err) {
        setFormError(err);
        return;
      }
      next.push(f);
    }
    setStagedFiles((prev) => [...prev, ...next]);
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = "";
    }
  };

  const removeStagedFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- Live Form Metrics Preview ---
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
        parsedClose !== null && Number.isFinite(parsedClose)
          ? parsedClose
          : null,
      stopLoss:
        parsedSl !== null && Number.isFinite(parsedSl) ? parsedSl : null,
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

  // --- Submit Trade / Backtest Record (+ Upload Staged Screenshots) ---
  const handleSubmitTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedLots = parseFloat(lotSize);
    const parsedOpen = parseFloat(openingPrice);
    const parsedClose = closingPrice.trim() ? parseFloat(closingPrice) : null;
    const parsedTp = takeProfit.trim() ? parseFloat(takeProfit) : null;
    const parsedSl = stopLoss.trim() ? parseFloat(stopLoss) : null;
    const parsedLev = parseInt(leverage, 10);

    if (formAccountType === "backtest" && !strategyId.trim()) {
      setFormError("Please select the Backtested Strategy from the list.");
      return;
    }
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
    if (
      parsedClose !== null &&
      (!Number.isFinite(parsedClose) || parsedClose <= 0)
    ) {
      setFormError(
        "Closing Price must be a positive number (or leave blank if still open)."
      );
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
      accountType: formAccountType,
      strategy: strategyId || null,
      timeframe: timeframe || null,
      sessionName: sessionName || null,
      symbol,
      tradeType,
      lotSize: parsedLots,
      openingPrice: parsedOpen,
      closingPrice: parsedClose,
      takeProfit: parsedTp,
      stopLoss: parsedSl,
      leverage: parsedLev,
      tradedAt: tradedAtIso,
      notes,
    };

    try {
      setSubmitting(true);
      let savedRecord: JournalEntry;

      if (editingEntry) {
        savedRecord = await updateJournalEntry(
          editingEntry.id,
          payload,
          editingEntry.isLocalPreview
        );
        setEntries((prev) =>
          prev
            .map((row) => (row.id === savedRecord.id ? savedRecord : row))
            .sort((a, b) => b.tradedAt.localeCompare(a.tradedAt))
        );
      } else {
        savedRecord = await createJournalEntry(payload);
        setEntries((prev) =>
          [savedRecord, ...prev].sort((a, b) =>
            b.tradedAt.localeCompare(a.tradedAt)
          )
        );
      }

      // Upload staged study screenshots
      if (stagedFiles.length > 0) {
        const uploadedShots: JournalScreenshot[] = [];
        for (const file of stagedFiles) {
          const shot = await uploadJournalScreenshot(savedRecord, file);
          uploadedShots.push(shot);
        }
        setScreenshotsByEntry((prev) => ({
          ...prev,
          [savedRecord.id]: [
            ...(prev[savedRecord.id] || []),
            ...uploadedShots,
          ],
        }));
      }

      setActiveAccount(formAccountType);
      setModalOpen(false);
      setEditingEntry(null);
      setStagedFiles([]);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save journal record."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --- Submit Deposit / Withdrawal ---
  const handleSubmitCashflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashflowError(null);

    const parsedAmt = parseFloat(cashflowAmount);
    if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      setCashflowError("Please enter a valid dollar amount greater than $0.00.");
      return;
    }

    const parsedDate = cashflowDateTime
      ? new Date(cashflowDateTime)
      : new Date();
    const transactedAtIso = Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    try {
      setCashflowSubmitting(true);
      const created = await createCashflowTransaction({
        accountType: cashflowAccount,
        txType: cashflowType,
        amount: parsedAmt,
        note: cashflowNote,
        transactedAt: transactedAtIso,
      });

      setTransactions((prev) =>
        [created, ...prev].sort((a, b) =>
          b.transactedAt.localeCompare(a.transactedAt)
        )
      );
      setActiveAccount(cashflowAccount);
      setCashflowModalOpen(false);
    } catch (err) {
      setCashflowError(
        err instanceof Error
          ? err.message
          : "Unable to record deposit/withdrawal."
      );
    } finally {
      setCashflowSubmitting(false);
    }
  };

  // --- Delete Trade Record ---
  const handleDeleteEntry = async (entry: JournalEntry) => {
    try {
      const associated = screenshotsByEntry[entry.id] || [];
      await deleteJournalEntry(entry, associated);
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      setScreenshotsByEntry((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
      setConfirmDeleteId(null);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to delete journal record."
      );
    }
  };

  // --- Delete Cashflow Transaction ---
  const handleDeleteCashflow = async (tx: CashflowTransaction) => {
    try {
      await deleteCashflowTransaction(tx);
      setTransactions((prev) => prev.filter((item) => item.id !== tx.id));
      setConfirmDeleteTxId(null);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to delete transaction."
      );
    }
  };

  // --- Upload / Delete Screenshots inside Study Modal ---
  const studyEntry = useMemo(
    () => entries.find((e) => e.id === studyEntryId) || null,
    [entries, studyEntryId]
  );

  const studyEntryScreenshots = useMemo(
    () => (studyEntry ? screenshotsByEntry[studyEntry.id] || [] : []),
    [studyEntry, screenshotsByEntry]
  );

  const handleUploadInStudyModal = async (files: FileList | null) => {
    if (!studyEntry || !files || files.length === 0) return;
    setStudyShotError(null);
    try {
      setUploadingStudyShot(true);
      const added: JournalScreenshot[] = [];
      for (let i = 0; i < files.length; i++) {
        const shot = await uploadJournalScreenshot(studyEntry, files[i]);
        added.push(shot);
      }
      setScreenshotsByEntry((prev) => {
        const updatedList = [...(prev[studyEntry.id] || []), ...added];
        setActiveShotIndex(updatedList.length - 1);
        return {
          ...prev,
          [studyEntry.id]: updatedList,
        };
      });
    } catch (err) {
      setStudyShotError(
        err instanceof Error ? err.message : "Screenshot upload failed."
      );
    } finally {
      setUploadingStudyShot(false);
      if (studyFileInputRef.current) {
        studyFileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteScreenshot = async (shot: JournalScreenshot) => {
    try {
      await deleteJournalScreenshot(shot);
      setScreenshotsByEntry((prev) => {
        const list = (prev[shot.journalEntryId] || []).filter(
          (s) => s.id !== shot.id
        );
        return {
          ...prev,
          [shot.journalEntryId]: list,
        };
      });
      setActiveShotIndex(0);
    } catch (err) {
      setStudyShotError(
        err instanceof Error ? err.message : "Failed to delete screenshot."
      );
    }
  };

  // --- Scoped Performance KPIs ---
  const enrichedAllEntries = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      metrics: computeTradeMetrics(entry),
    }));
  }, [entries]);

  const scopedEntriesForKpis = useMemo(() => {
    return enrichedAllEntries.filter(
      ({ entry }) => entry.accountType === activeAccount
    );
  }, [enrichedAllEntries, activeAccount]);

  const kpis = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let openCount = 0;
    let grossProfit = 0;
    let grossLossAbs = 0;
    let totalLots = 0;
    const rrList: number[] = [];
    const riskList: number[] = [];
    const distinctStrategies = new Set<string>();

    for (const { entry, metrics } of scopedEntriesForKpis) {
      totalLots += entry.lotSize;
      if (entry.strategy) distinctStrategies.add(entry.strategy);

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
        grossProfit += metrics.realizedPnlUsd ?? 0;
      } else if (metrics.outcome === "loss") {
        losses++;
        grossLossAbs += Math.abs(metrics.realizedPnlUsd ?? 0);
      } else {
        breakevens++;
      }
    }

    const closedCount = wins + losses + breakevens;
    const decisiveCount = wins + losses;
    const winRate = decisiveCount > 0 ? (wins / decisiveCount) * 100 : null;
    const lossRate = decisiveCount > 0 ? (losses / decisiveCount) * 100 : null;
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
      totalCount: scopedEntriesForKpis.length,
      totalLots,
      winRate,
      lossRate,
      profitFactor,
      avgRR,
      avgRisk,
      strategyCount: distinctStrategies.size,
    };
  }, [scopedEntriesForKpis]);

  // --- Filtered Entries & Transactions ---
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    return enrichedAllEntries.filter(({ entry, metrics }) => {
      if (!showAllAccountsInTable && entry.accountType !== activeAccount) {
        return false;
      }
      if (selectedStrategyFilter) {
        const entryStratKey = entry.strategy || "unspecified";
        if (entryStratKey !== selectedStrategyFilter) return false;
      }
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
  }, [
    enrichedAllEntries,
    showAllAccountsInTable,
    activeAccount,
    selectedStrategyFilter,
    filter,
    searchQuery,
  ]);

  const filteredTransactions = useMemo(() => {
    if (showAllAccountsInTable) return transactions;
    return transactions.filter((t) => t.accountType === activeAccount);
  }, [transactions, showAllAccountsInTable, activeAccount]);

  return (
    <div className="space-y-6">
      {/* Header with Deposit, Withdraw, and + (New Record / New Backtest) Button */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
            Admin
          </span>
          <span className="text-slate-700">/</span>
          <span className="font-mono text-xs text-slate-400">Journal</span>
          {isBacktestMode && (
            <>
              <span className="text-slate-700">/</span>
              <span className="font-mono text-xs text-cyan-400">
                Backtesting
              </span>
            </>
          )}
        </div>

        <div className="mt-1.5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isBacktestMode
                ? "Strategy Backtesting & Probability Lab"
                : "Trading Journal & Account Ledger"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isBacktestMode
                ? "Record historical backtested setups, attach chart screenshots, tag strategies, and analyze Win vs Loss probability pie charts."
                : "Track Real & Demo float, deposits/withdrawals, live account balance, trade executions, and study chart screenshots."}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isBacktestMode && (
              <>
                <button
                  type="button"
                  onClick={() => openCashflowModal("deposit")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                  <span>Deposit</span>
                </button>

                <button
                  type="button"
                  onClick={() => openCashflowModal("withdrawal")}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
                >
                  <ArrowUpRight className="h-4 w-4 text-amber-400" />
                  <span>Withdraw</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => openCreateModal()}
              aria-label={
                isBacktestMode
                  ? "Add new backtest record"
                  : "Add new journal record"
              }
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 transition active:scale-[0.99] ${
                isBacktestMode
                  ? "bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.28)] hover:bg-cyan-300"
                  : "bg-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.28)] hover:bg-emerald-400"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-950/15">
                <Plus className="h-4 w-4 stroke-[2.6]" />
              </span>
              <span>{isBacktestMode ? "New Backtest" : "New Record"}</span>
            </button>
          </div>
        </div>

        {/* Account & Backtesting Tab Switcher: Real Account | Demo Account | Backtesting */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Journal Account and Backtesting Modes"
            className="inline-flex flex-wrap rounded-xl border border-slate-800 bg-[#0B0F15] p-1 gap-1"
          >
            {/* 1. Real Account */}
            <button
              type="button"
              role="tab"
              aria-selected={activeAccount === "real"}
              onClick={() => {
                setActiveAccount("real");
                setSelectedStrategyFilter(null);
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeAccount === "real"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Real Account</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-white tabular-nums">
                {formatUsd(realBalanceSummary.currentBalance)}
              </span>
            </button>

            {/* 2. Demo Account */}
            <button
              type="button"
              role="tab"
              aria-selected={activeAccount === "demo"}
              onClick={() => {
                setActiveAccount("demo");
                setSelectedStrategyFilter(null);
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeAccount === "demo"
                  ? "bg-purple-500/15 text-purple-300 border border-purple-500/35"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <span>Demo Account</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-white tabular-nums">
                {formatUsd(demoBalanceSummary.currentBalance)}
              </span>
            </button>

            {/* 3. Backtesting Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeAccount === "backtest"}
              onClick={() => {
                setActiveAccount("backtest");
                setSectionTab("trades");
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeAccount === "backtest"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/35"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5 text-cyan-400" />
              <span>Backtesting</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200 tabular-nums">
                {backtestEntries.length}{" "}
                {backtestEntries.length === 1 ? "Setup" : "Setups"}
              </span>
            </button>
          </div>

          {!isBacktestMode && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-400 select-none">
              <input
                type="checkbox"
                checked={showAllAccountsInTable}
                onChange={(e) => setShowAllAccountsInTable(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <span>Show all rows in table</span>
            </label>
          )}
        </div>
      </div>

      {/* Notices */}
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
            Local Persistence Active:{" "}
          </strong>
          {migrationHint}
        </div>
      )}

      {/* KPI Strip: Adapts cleanly between Real/Demo Balance vs Backtesting Lab */}
      {isBacktestMode ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Overall Win Probability */}
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/[0.07] to-[#0E131B] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Overall Win Probability
              </span>
              <Percent className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {kpis.winRate !== null ? `${kpis.winRate.toFixed(1)}%` : "—"}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
              {kpis.closedCount > 0
                ? `${kpis.wins}W · ${kpis.losses}L (${kpis.lossRate?.toFixed(
                    1
                  )}% Loss)`
                : "Log closed setups to compute"}
            </p>
          </div>

          {/* 2. Strategies Tested */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Strategies Backtested
              </span>
              <Crosshair className="h-4 w-4 text-cyan-400/80" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {kpis.strategyCount}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
              Across {kpis.totalCount} total backtested setups
            </p>
          </div>

          {/* 3. Simulated Net P&L & Profit Factor */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Simulated Net P&amp;L
              </span>
              <DollarSign className="h-4 w-4 text-emerald-400/80" />
            </div>
            <p
              className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
                kpis.closedCount === 0
                  ? "text-white"
                  : activeBalance.realizedPnl > 0.004
                  ? "text-emerald-400"
                  : activeBalance.realizedPnl < -0.004
                  ? "text-rose-400"
                  : "text-slate-200"
              }`}
            >
              {kpis.closedCount > 0
                ? formatUsd(activeBalance.realizedPnl, true)
                : "$0.00"}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
              {kpis.profitFactor !== null
                ? `Profit Factor: ${
                    kpis.profitFactor === Infinity
                      ? "∞"
                      : kpis.profitFactor.toFixed(2)
                  }`
                : "Standard contract sizing"}
            </p>
          </div>

          {/* 4. Avg Planned R:R */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Avg Planned R:R
              </span>
              <Layers className="h-4 w-4 text-emerald-400/80" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {kpis.avgRR !== null ? `1 : ${kpis.avgRR.toFixed(2)}` : "—"}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
              {kpis.avgRisk !== null
                ? `Avg Sim Risk: ${formatUsd(kpis.avgRisk)}`
                : "Derived from SL & TP"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Current Balance (Float + P&L) */}
          <div
            className={`rounded-2xl border p-4 ${
              activeAccount === "real"
                ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.07] to-[#0E131B]"
                : "border-purple-500/30 bg-gradient-to-b from-purple-500/[0.07] to-[#0E131B]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Current Balance ({activeAccount === "real" ? "REAL" : "DEMO"})
              </span>
              <Wallet
                className={`h-4 w-4 ${
                  activeAccount === "real"
                    ? "text-emerald-400"
                    : "text-purple-400"
                }`}
              />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {formatUsd(activeBalance.currentBalance)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
              {activeBalance.openUsedMargin > 0
                ? `Free Margin: ${formatUsd(
                    activeBalance.freeMargin
                  )} (Locked: ${formatUsd(activeBalance.openUsedMargin)})`
                : "Float + Realized Profits/Losses"}
            </p>
          </div>

          {/* 2. Net Float */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Net Float (Capital)
              </span>
              <ShieldCheck className="h-4 w-4 text-cyan-400/80" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {formatUsd(activeBalance.netFloat)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
              In: {formatUsd(activeBalance.totalDeposits)} · Out:{" "}
              {formatUsd(activeBalance.totalWithdrawals)}
            </p>
          </div>

          {/* 3. Realized P&L vs Float */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Realized Net P&amp;L
              </span>
              <DollarSign className="h-4 w-4 text-emerald-400/80" />
            </div>
            <p
              className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
                kpis.closedCount === 0
                  ? "text-white"
                  : activeBalance.realizedPnl > 0.004
                  ? "text-emerald-400"
                  : activeBalance.realizedPnl < -0.004
                  ? "text-rose-400"
                  : "text-slate-200"
              }`}
            >
              {kpis.closedCount > 0
                ? formatUsd(activeBalance.realizedPnl, true)
                : "$0.00"}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
              {activeBalance.returnOnFloatPct !== null
                ? `ROI vs Deposits: ${
                    activeBalance.returnOnFloatPct >= 0 ? "+" : ""
                  }${activeBalance.returnOnFloatPct.toFixed(1)}%`
                : kpis.profitFactor !== null
                ? `Profit Factor: ${
                    kpis.profitFactor === Infinity
                      ? "∞"
                      : kpis.profitFactor.toFixed(2)
                  }`
                : "Deposit float to track ROI %"}
            </p>
          </div>

          {/* 4. Win Rate & Avg R:R */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Win Rate &amp; Avg R:R
              </span>
              <Percent className="h-4 w-4 text-emerald-400/80" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {kpis.winRate !== null ? `${kpis.winRate.toFixed(1)}%` : "—"}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
              {kpis.closedCount > 0
                ? `${kpis.wins}W · ${kpis.losses}L${
                    kpis.avgRR !== null ? ` · Avg 1:${kpis.avgRR.toFixed(1)}` : ""
                  }`
                : `${kpis.totalCount} trades (${kpis.openCount} open)`}
            </p>
          </div>
        </div>
      )}

      {/* BACKTESTING WIN PROBABILITY PIE CHARTS PANEL */}
      {isBacktestMode && (
        <BacktestStrategyPiePanel
          backtestEntries={backtestEntries}
          selectedStrategyFilter={selectedStrategyFilter}
          onSelectStrategyFilter={setSelectedStrategyFilter}
          onOpenNewBacktest={() => openCreateModal("backtest")}
        />
      )}

      {/* Section Switcher (shown on Real/Demo; Backtesting goes straight to Backtest Setups) */}
      {!isBacktestMode && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-slate-800 bg-[#0E131B] p-1">
            <button
              type="button"
              onClick={() => setSectionTab("trades")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                sectionTab === "trades"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Trade Records ({filteredEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setSectionTab("cashflow")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                sectionTab === "cashflow"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Deposits &amp; Withdrawals ({filteredTransactions.length})
            </button>
          </div>

          <span className="font-mono text-[11px] text-slate-500">
            Screenshot Storage Bucket:{" "}
            <code className="text-emerald-400">
              {JOURNAL_SCREENSHOTS_BUCKET}
            </code>{" "}
            (Max {MAX_SCREENSHOT_SIZE_MB} MB / image)
          </span>
        </div>
      )}

      {/* SECTION A: TRADE / BACKTEST RECORDS LEDGER */}
      {sectionTab === "trades" || isBacktestMode ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]">
          {/* Toolbar: Outcome Filters + Strategy Dropdown + Symbol Search */}
          <div className="flex flex-col gap-3 border-b border-slate-800/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "buy", label: "Buy" },
                  { id: "sell", label: "Sell" },
                  { id: "win", label: "Wins" },
                  { id: "loss", label: "Losses" },
                  { id: "open", label: "Open" },
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

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedStrategyFilter ?? ""}
                onChange={(e) =>
                  setSelectedStrategyFilter(e.target.value || null)
                }
                aria-label="Filter by strategy"
                className="rounded-xl border border-slate-800 bg-[#090D13] px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none"
              >
                <option value="">All Strategies</option>
                {STRATEGY_FAMILIES.map((fam) => (
                  <optgroup key={fam} label={fam}>
                    {STRATEGY_CATALOG.filter((s) => s.family === fam).map(
                      (s) => (
                        <option key={s.id} value={s.id}>
                          {s.shortLabel}
                        </option>
                      )
                    )}
                  </optgroup>
                ))}
              </select>

              <div className="relative w-full sm:w-52">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter symbol..."
                  className="w-full rounded-xl border border-slate-800 bg-[#090D13] py-1.5 pl-8 pr-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
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
                    Mode
                  </th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">
                    Symbol &amp; Strategy
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
                  <th className="px-4 py-3 font-medium whitespace-nowrap">
                    Screenshots
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
                      colSpan={11}
                      className="px-6 py-12 text-center font-mono text-xs text-slate-400"
                    >
                      Loading records...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-14 text-center">
                      <div className="mx-auto max-w-md space-y-3">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                          {isBacktestMode ? (
                            <FlaskConical className="h-5 w-5 text-cyan-400" />
                          ) : (
                            <BookOpen className="h-5 w-5" />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-200">
                          {isBacktestMode
                            ? "No backtest records match the current filter"
                            : `No ${
                                activeAccount === "real" ? "Real" : "Demo"
                              } trade records found`}
                        </p>
                        <p className="text-xs leading-relaxed text-slate-500">
                          {isBacktestMode
                            ? "Click + New Backtest in the header to log a setup, choose its strategy from your strategy list, and attach chart images."
                            : "Use Deposit to record your starting float, and click + New Record in the header to log trades and attach study screenshots."}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          {!isBacktestMode && (
                            <button
                              type="button"
                              onClick={() => openCashflowModal("deposit")}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#090D13] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500/40"
                            >
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Record Deposit</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openCreateModal()}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>
                              {isBacktestMode
                                ? "New Backtest Setup"
                                : "New Trade Record"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(({ entry, metrics }) => {
                    const dt = formatDisplayDateTime(entry.tradedAt);
                    const isBuy = entry.tradeType === "buy";
                    const entryShots = screenshotsByEntry[entry.id] || [];

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

                        {/* Mode Badge (REAL / DEMO / BACKTEST) */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          {entry.accountType === "real" ? (
                            <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                              REAL
                            </span>
                          ) : entry.accountType === "demo" ? (
                            <span className="inline-flex items-center rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300">
                              DEMO
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                              BACKTEST
                            </span>
                          )}
                        </td>

                        {/* Symbol + Tagged Strategy + TF/Session */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-lg border border-slate-700/80 bg-[#090D13] px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                              {entry.symbol}
                            </span>
                            {entry.timeframe && (
                              <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                                {entry.timeframe}
                              </span>
                            )}
                          </div>
                          {entry.strategy && (
                            <p
                              title={formatStrategyLabel(entry.strategy, false)}
                              className="mt-1 font-mono text-[11px] text-cyan-300/90"
                            >
                              {formatStrategyLabel(entry.strategy, true)}
                            </p>
                          )}
                          {entry.sessionName && (
                            <p className="font-mono text-[10px] text-slate-500">
                              {entry.sessionName}
                            </p>
                          )}
                        </td>

                        {/* Type */}
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

                        {/* Leverage / Margin */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <p className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                            1:{entry.leverage}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                            Margin: {formatUsd(metrics.usedMarginUsd)}
                          </p>
                        </td>

                        {/* Opening -> Closing */}
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

                        {/* Study Screenshots */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setStudyEntryId(entry.id);
                              setActiveShotIndex(0);
                              setStudyShotError(null);
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-medium transition ${
                              entryShots.length > 0
                                ? "border-cyan-500/35 bg-cyan-500/12 text-cyan-300 hover:bg-cyan-500/20"
                                : "border-slate-800 bg-[#090D13] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                            }`}
                          >
                            {entryShots.length > 0 ? (
                              <>
                                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                                <span>
                                  {entryShots.length}{" "}
                                  {entryShots.length === 1 ? "Chart" : "Charts"}
                                </span>
                              </>
                            ) : (
                              <>
                                <ImagePlus className="h-3.5 w-3.5" />
                                <span>+ Study</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                          {confirmDeleteId === entry.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(entry)}
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
      ) : (
        /* SECTION B: DEPOSITS & WITHDRAWALS LEDGER */
        <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-white">
                Deposits &amp; Withdrawals Float History
              </h2>
              <p className="text-xs text-slate-400">
                Every deposit increases your float and current balance; every
                withdrawal reduces it.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCashflowModal("deposit")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
              >
                <ArrowDownLeft className="h-3.5 w-3.5" />
                <span>+ Deposit</span>
              </button>
              <button
                type="button"
                onClick={() => openCashflowModal("withdrawal")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>− Withdraw</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800/80 bg-[#090D13] font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3 font-medium">Date &amp; Time</th>
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Transaction Type</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Note / Reference</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-slate-200">
                        No deposits or withdrawals recorded yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Record your initial account deposit to start tracking
                        your live current balance relative to float.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const dt = formatDisplayDateTime(tx.transactedAt);
                    const isDeposit = tx.txType === "deposit";

                    return (
                      <tr
                        key={tx.id}
                        className="transition-colors hover:bg-[#111722]"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-200">
                            {dt.date}
                          </span>
                          <span className="ml-2 font-mono text-[11px] text-slate-500">
                            {dt.time}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {tx.accountType === "real" ? (
                            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-300">
                              REAL
                            </span>
                          ) : tx.accountType === "demo" ? (
                            <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-purple-300">
                              DEMO
                            </span>
                          ) : (
                            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-cyan-300">
                              BACKTEST
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isDeposit ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-emerald-300">
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                              DEPOSIT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase text-amber-300">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              WITHDRAWAL
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-sm font-bold tabular-nums">
                          <span
                            className={
                              isDeposit ? "text-emerald-400" : "text-amber-300"
                            }
                          >
                            {isDeposit
                              ? `+${formatUsd(tx.amount)}`
                              : `-${formatUsd(tx.amount)}`}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-xs text-slate-300">
                          {tx.note || <span className="text-slate-600">—</span>}
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          {confirmDeleteTxId === tx.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteCashflow(tx)}
                                className="rounded-lg bg-rose-500 px-2 py-1 font-mono text-[11px] font-bold text-white hover:bg-rose-400"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTxId(null)}
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTxId(tx.id)}
                              title="Delete transaction"
                              className="rounded-lg border border-slate-800 bg-[#090D13] p-1.5 text-slate-400 transition hover:border-rose-500/40 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: NEW / EDIT RECORD OR BACKTEST (+ STRATEGY + SCREENSHOTS)     */}
      {/* ===================================================================== */}
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
            <div className="flex items-center justify-between border-b border-slate-800/90 px-6 py-4">
              <div>
                <h2
                  id="journal-modal-title"
                  className="text-lg font-bold text-white"
                >
                  {editingEntry
                    ? formAccountType === "backtest"
                      ? "Edit Backtested Setup"
                      : "Edit Journal Record"
                    : formAccountType === "backtest"
                    ? "New Backtest Setup"
                    : "New Journal Record"}
                </h2>
                <p className="text-xs text-slate-400">
                  {formAccountType === "backtest"
                    ? "Select the strategy being backtested, enter setup metadata, and attach chart images."
                    : "Log Real or Demo execution details, strategy metadata, and study screenshots."}
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
              onSubmit={handleSubmitTrade}
              className="max-h-[calc(90vh-76px)] overflow-y-auto p-6 space-y-5"
            >
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 0: Record Mode (Real | Demo | Backtesting) */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Record Mode (Real, Demo, or Backtesting)
                </span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAccountType("real")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-mono text-xs font-bold uppercase transition ${
                      formAccountType === "real"
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                        : "border-slate-800 bg-[#080B10] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    REAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAccountType("demo")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-mono text-xs font-bold uppercase transition ${
                      formAccountType === "demo"
                        ? "border-purple-500 bg-purple-500/15 text-purple-300"
                        : "border-slate-800 bg-[#080B10] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-400" />
                    DEMO
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAccountType("backtest")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-mono text-xs font-bold uppercase transition ${
                      formAccountType === "backtest"
                        ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                        : "border-slate-800 bg-[#080B10] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <FlaskConical className="h-3.5 w-3.5 text-cyan-400" />
                    BACKTEST
                  </button>
                </div>
              </div>

              {/* Row 0.5: Strategy Selection + Timeframe & Session Metadata */}
              <div className="space-y-3.5 rounded-xl border border-cyan-500/25 bg-[#080B10] p-4">
                <div>
                  <label
                    htmlFor="journal-strategy"
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300"
                  >
                    <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                    <span>
                      {formAccountType === "backtest"
                        ? "Backtested Strategy (Required)"
                        : "Strategy Used"}
                    </span>
                  </label>
                  <select
                    id="journal-strategy"
                    required={formAccountType === "backtest"}
                    value={strategyId}
                    onChange={(e) => setStrategyId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#0D121A] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {formAccountType !== "backtest" && (
                      <option value="">— Optional / Unspecified —</option>
                    )}
                    {STRATEGY_FAMILIES.map((family) => (
                      <optgroup key={family} label={family}>
                        {STRATEGY_CATALOG.filter(
                          (item) => item.family === family
                        ).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Timeframe & Session Metadata */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Chart Timeframe
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {BACKTEST_TIMEFRAMES.map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setTimeframe(tf)}
                          className={`rounded-md border px-2 py-1 font-mono text-[10px] transition ${
                            timeframe === tf
                              ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-bold"
                              : "border-slate-800 bg-[#0D121A] text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="journal-session"
                      className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Trading Session
                    </label>
                    <select
                      id="journal-session"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#0D121A] px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">— Optional —</option>
                      {BACKTEST_SESSIONS.map((sess) => (
                        <option key={sess} value={sess}>
                          {sess}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

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
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
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
                          ? "border-rose-500 bg-rose-500/20 text-rose-300"
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
                      {formAccountType === "backtest"
                        ? "Exit price (TP or SL hit)"
                        : "Leave blank if still open"}
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

              {/* Row 4: Stop Loss & Take Profit */}
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
                    <span>
                      {formAccountType === "backtest"
                        ? "Historical Setup Date & Time"
                        : "Date & Time"}
                    </span>
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

              {/* Row 6: Study Notes & Chart Screenshots Uploader */}
              <div className="space-y-3 rounded-xl border border-slate-800/90 bg-[#090D13] p-4">
                <div>
                  <label
                    htmlFor="journal-notes"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Study / Backtest Notes (Optional)
                  </label>
                  <textarea
                    id="journal-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Confluences observed (e.g. Prior session closed outside VA + 15M POC wick rejection → clean 2R hit)..."
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#080B10] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      <Camera className="h-3.5 w-3.5 text-cyan-400" />
                      <span>
                        Attach Setup Images ({JOURNAL_SCREENSHOTS_BUCKET})
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      Max {MAX_SCREENSHOT_SIZE_MB} MB / image
                    </span>
                  </div>

                  {editingEntry &&
                    (screenshotsByEntry[editingEntry.id] || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(screenshotsByEntry[editingEntry.id] || []).map(
                          (shot) => (
                            <div
                              key={shot.id}
                              className="group relative h-16 w-24 overflow-hidden rounded-lg border border-slate-700 bg-black"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={shot.url}
                                alt={shot.fileName}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteScreenshot(shot)}
                                title="Remove screenshot"
                                className="absolute right-1 top-1 rounded bg-black/80 p-0.5 text-rose-400 hover:bg-rose-500 hover:text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {stagedFiles.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {stagedFiles.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200"
                        >
                          <span className="truncate font-mono">
                            {file.name} ({formatBytes(file.size)})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeStagedFile(i)}
                            className="ml-2 text-cyan-300 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    multiple
                    onChange={(e) => handleStageFiles(e.target.files)}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-[#080B10] px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
                  >
                    <Upload className="h-3.5 w-3.5 text-cyan-400" />
                    <span>
                      Select Chart Screenshot(s) from Device (Before / After)
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Calculated Telemetry */}
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
                      Outcome / P&amp;L
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

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-800 bg-[#090D13] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-slate-950 transition disabled:opacity-60 ${
                    formAccountType === "backtest"
                      ? "bg-cyan-400 hover:bg-cyan-300"
                      : "bg-emerald-500 hover:bg-emerald-400"
                  }`}
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>
                    {submitting
                      ? "Saving..."
                      : editingEntry
                      ? "Save Changes"
                      : formAccountType === "backtest"
                      ? "Save Backtest Setup"
                      : "Save Record"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: DEPOSIT / WITHDRAWAL MODAL                                   */}
      {/* ===================================================================== */}
      {cashflowModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cashflow-modal-title"
          onClick={closeCashflowModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-[#0D121A] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800/90 px-6 py-4">
              <div>
                <h2
                  id="cashflow-modal-title"
                  className="text-lg font-bold text-white"
                >
                  {cashflowType === "deposit"
                    ? "Record Account Deposit"
                    : "Record Account Withdrawal"}
                </h2>
                <p className="text-xs text-slate-400">
                  Updates your float and recalculates live account balance.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCashflowModal}
                className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCashflow} className="p-6 space-y-4">
              {cashflowError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{cashflowError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCashflowType("deposit")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-mono text-xs font-bold uppercase transition ${
                    cashflowType === "deposit"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-800 bg-[#080B10] text-slate-400"
                  }`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setCashflowType("withdrawal")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 font-mono text-xs font-bold uppercase transition ${
                    cashflowType === "withdrawal"
                      ? "border-amber-500 bg-amber-500/15 text-amber-300"
                      : "border-slate-800 bg-[#080B10] text-slate-400"
                  }`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Withdrawal
                </button>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Target Account
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashflowAccount("real")}
                    className={`rounded-xl border py-2 font-mono text-xs font-bold transition ${
                      cashflowAccount === "real"
                        ? "border-emerald-500/60 bg-emerald-500/12 text-emerald-300"
                        : "border-slate-800 bg-[#080B10] text-slate-400"
                    }`}
                  >
                    REAL ({formatUsd(realBalanceSummary.currentBalance)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashflowAccount("demo")}
                    className={`rounded-xl border py-2 font-mono text-xs font-bold transition ${
                      cashflowAccount === "demo"
                        ? "border-purple-500/60 bg-purple-500/12 text-purple-300"
                        : "border-slate-800 bg-[#080B10] text-slate-400"
                    }`}
                  >
                    DEMO ({formatUsd(demoBalanceSummary.currentBalance)})
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="cashflow-amount"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Amount (USD)
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
                    $
                  </span>
                  <input
                    id="cashflow-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={cashflowAmount}
                    onChange={(e) => setCashflowAmount(e.target.value)}
                    placeholder="50.00"
                    className="w-full rounded-xl border border-slate-800 bg-[#080B10] py-2.5 pl-8 pr-3.5 font-mono text-sm font-bold text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cashflow-datetime"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Date &amp; Time
                </label>
                <input
                  id="cashflow-datetime"
                  type="datetime-local"
                  required
                  value={cashflowDateTime}
                  onChange={(e) => setCashflowDateTime(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#080B10] px-3.5 py-2.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
                />
              </div>

              <div>
                <label
                  htmlFor="cashflow-note"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Note / Method (Optional)
                </label>
                <input
                  id="cashflow-note"
                  type="text"
                  value={cashflowNote}
                  onChange={(e) => setCashflowNote(e.target.value)}
                  placeholder={
                    cashflowType === "deposit"
                      ? "e.g. Initial float / M-Pesa / USDT top-up"
                      : "e.g. Weekly profit withdrawal"
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#080B10] px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
                <button
                  type="button"
                  onClick={closeCashflowModal}
                  className="rounded-xl border border-slate-800 bg-[#090D13] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cashflowSubmitting}
                  className={`rounded-xl px-5 py-2 text-xs font-bold text-slate-950 transition disabled:opacity-60 ${
                    cashflowType === "deposit"
                      ? "bg-emerald-500 hover:bg-emerald-400"
                      : "bg-amber-400 hover:bg-amber-300"
                  }`}
                >
                  {cashflowSubmitting
                    ? "Saving..."
                    : cashflowType === "deposit"
                    ? "Confirm Deposit"
                    : "Confirm Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: TRADE / BACKTEST STUDY & SCREENSHOTS GALLERY LIGHTBOX        */}
      {/* ===================================================================== */}
      {studyEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Study screenshots for ${studyEntry.symbol}`}
          onClick={() => setStudyEntryId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0B0F16] shadow-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      studyEntry.accountType === "real"
                        ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-300"
                        : studyEntry.accountType === "demo"
                        ? "border-purple-500/35 bg-purple-500/12 text-purple-300"
                        : "border-cyan-500/35 bg-cyan-500/12 text-cyan-300"
                    }`}
                  >
                    {studyEntry.accountType}
                  </span>
                  <h3 className="font-mono text-base font-bold text-white">
                    {studyEntry.symbol} · {studyEntry.tradeType.toUpperCase()} (
                    {studyEntry.lotSize} Lots @ 1:{studyEntry.leverage})
                  </h3>
                  <span className="font-mono text-xs text-slate-400">
                    {formatPrice(studyEntry.openingPrice, studyEntry.symbol)} →{" "}
                    {studyEntry.closingPrice !== null
                      ? formatPrice(studyEntry.closingPrice, studyEntry.symbol)
                      : "OPEN"}
                  </span>
                </div>

                {(studyEntry.strategy ||
                  studyEntry.timeframe ||
                  studyEntry.sessionName) && (
                  <p className="font-mono text-xs text-cyan-300">
                    {studyEntry.strategy
                      ? formatStrategyLabel(studyEntry.strategy, false)
                      : "Unspecified Strategy"}
                    {studyEntry.timeframe ? ` · ${studyEntry.timeframe}` : ""}
                    {studyEntry.sessionName
                      ? ` · ${studyEntry.sessionName}`
                      : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={studyFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  multiple
                  onChange={(e) => handleUploadInStudyModal(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingStudyShot}
                  onClick={() => studyFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/12 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-60"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    {uploadingStudyShot ? "Uploading..." : "Add Screenshot"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudyEntryId(null)}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {studyShotError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
                  {studyShotError}
                </div>
              )}

              {studyEntry.notes && (
                <div className="rounded-xl border border-slate-800 bg-[#090D13] px-4 py-3 text-xs leading-relaxed text-slate-300">
                  <strong className="font-semibold text-white">
                    Study Notes:{" "}
                  </strong>
                  {studyEntry.notes}
                </div>
              )}

              {studyEntryScreenshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#080B10] py-16 text-center px-4">
                  <Camera className="h-8 w-8 text-slate-500 mb-3" />
                  <p className="text-sm font-semibold text-slate-200">
                    No study screenshots attached to this setup yet
                  </p>
                  <p className="mt-1 max-w-md text-xs text-slate-500">
                    Upload your TradingView entry/exit screenshots (up to{" "}
                    {MAX_SCREENSHOT_SIZE_MB} MB each) to build a visual playbook
                    for future review.
                  </p>
                  <button
                    type="button"
                    onClick={() => studyFileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload First Screenshot</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {studyEntryScreenshots[activeShotIndex] && (
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#05070B]">
                      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5 text-xs">
                        <span className="truncate font-mono text-slate-300">
                          {studyEntryScreenshots[activeShotIndex].fileName} (
                          {formatBytes(
                            studyEntryScreenshots[activeShotIndex].fileSizeBytes
                          )}
                          )
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={studyEntryScreenshots[activeShotIndex].url}
                            download={
                              studyEntryScreenshots[activeShotIndex].fileName
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                          >
                            <Download className="h-3 w-3" />
                            <span>Save</span>
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteScreenshot(
                                studyEntryScreenshots[activeShotIndex]
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex max-h-[60vh] items-center justify-center overflow-auto p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={studyEntryScreenshots[activeShotIndex].url}
                          alt={studyEntryScreenshots[activeShotIndex].fileName}
                          className="max-h-[56vh] w-auto rounded-lg object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {studyEntryScreenshots.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {studyEntryScreenshots.map((shot, idx) => (
                        <button
                          key={shot.id}
                          type="button"
                          onClick={() => setActiveShotIndex(idx)}
                          className={`h-16 w-24 overflow-hidden rounded-lg border-2 transition ${
                            idx === activeShotIndex
                              ? "border-cyan-400"
                              : "border-slate-800 opacity-65 hover:opacity-100"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shot.url}
                            alt={shot.fileName}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
