"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BellPlus,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  ALERT_PRESET_SYMBOLS,
  computeAlertMoveMetrics,
  createPriceAlert,
  deletePriceAlert,
  formatAlertPrice,
  getSymbolDecimals,
  listPriceAlerts,
  saveLocalAlertsSnapshot,
  updatePriceAlert,
  type AlertCondition,
  type PriceAlert,
} from "@/lib/alerts";
import {
  STRATEGY_CATALOG,
  STRATEGY_FAMILIES,
  formatStrategyLabel,
  getStrategyById,
} from "@/lib/strategies";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AlertsTab = "pending" | "triggered" | "all" | "setup";
type AlertSortOrder =
  | "target_desc"
  | "target_asc"
  | "target_pct_desc"
  | "created_desc";

interface ServerConfigStatus {
  supabaseConfigured: boolean;
  serviceRoleConfigured: boolean;
  telegramConfigured: boolean;
  cronSecretConfigured: boolean;
  twelveDataConfigured: boolean;
}

const POLL_INTERVAL_OPTIONS = [
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
] as const;

const QUICK_PCT_PRESETS = [0.15, 0.25, 0.5, 1.0, 1.5] as const;

const DEFAULT_POLL_SECONDS = (() => {
  const envVal = Number(process.env.NEXT_PUBLIC_ALERT_POLL_SECONDS);
  return Number.isFinite(envVal) && envVal >= 30 ? envVal : 120;
})();

const POLL_STORAGE_KEY = "mp_alerts_poll_seconds_v1";

function formatEatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatCountdown(secondsLeft: number): string {
  const safe = Math.max(0, Math.floor(secondsLeft));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function GlobalPriceAlertsPage() {
  const searchParams = useSearchParams();
  const isPreviewParam = searchParams.get("preview") === "1";
  const supabaseReady = isSupabaseConfigured();

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AlertsTab>("pending");
  const [sortOrder, setSortOrder] = useState<AlertSortOrder>("target_desc");

  // Countdown & scheduler interval state
  const [pollSeconds, setPollSeconds] = useState<number>(DEFAULT_POLL_SECONDS);
  const [secondsLeft, setSecondsLeft] = useState<number>(DEFAULT_POLL_SECONDS);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  // Toast / banner notifications
  const [bannerMessage, setBannerMessage] = useState<{
    kind: "success" | "info" | "error";
    text: string;
  } | null>(null);

  // Server environment status
  const [configStatus, setConfigStatus] = useState<ServerConfigStatus>({
    supabaseConfigured: supabaseReady,
    serviceRoleConfigured: false,
    telegramConfigured: false,
    cronSecretConfigured: false,
    twelveDataConfigured: false,
  });

  // Modal state (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [savingAlert, setSavingAlert] = useState(false);
  const [fetchingSymbolQuote, setFetchingSymbolQuote] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal form fields
  const [symbolInput, setSymbolInput] = useState("XAU/USD");
  const [conditionInput, setConditionInput] = useState<AlertCondition>("above");
  const [initialPriceInput, setInitialPriceInput] = useState("");
  const [targetPriceInput, setTargetPriceInput] = useState("");
  const [positivePctInput, setPositivePctInput] = useState("0.50");
  const [negativePctInput, setNegativePctInput] = useState("0.50");
  const [mirrorNegativePct, setMirrorNegativePct] = useState(true);
  const [strategyInput, setStrategyInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [chatIdOverrideInput, setChatIdOverrideInput] = useState("");

  // Telegram quick test state (in Setup tab)
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testBotToken, setTestBotToken] = useState("");
  const [testChatId, setTestChatId] = useState("");
  const [telegramTestFeedback, setTelegramTestFeedback] = useState<{
    ok: boolean;
    message: string;
    hint?: string;
    autoDiscoveredChatId?: string;
  } | null>(null);
  const [copiedCronUrl, setCopiedCronUrl] = useState(false);

  const alertsRef = useRef<PriceAlert[]>([]);
  alertsRef.current = alerts;
  const refreshingRef = useRef(false);

  function withSessionQuery(href: string) {
    if (!supabaseReady && isPreviewParam) {
      return `${href}?preview=1`;
    }
    return href;
  }

  // Load persisted poll interval
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = Number(window.localStorage.getItem(POLL_STORAGE_KEY));
    if (Number.isFinite(saved) && saved >= 30 && saved <= 3600) {
      setPollSeconds(saved);
      setSecondsLeft(saved);
    }
  }, []);

  function handlePollIntervalChange(nextSeconds: number) {
    setPollSeconds(nextSeconds);
    setSecondsLeft(nextSeconds);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(POLL_STORAGE_KEY, String(nextSeconds));
    }
  }

  const loadAlerts = useCallback(async () => {
    try {
      const list = await listPriceAlerts();
      setAlerts(list);
      const newestCheck = list
        .map((a) => a.lastCheckedAt)
        .filter((v): v is string => Boolean(v))
        .sort()
        .pop();
      if (newestCheck) {
        setLastCheckedAt(newestCheck);
      }
      return list;
    } catch (err) {
      setBannerMessage({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Could not load price alerts.",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Executes a live market check against `/api/alerts/check`, updating latest prices
   * and auto-transitioning any crossed alerts from Pending -> Triggered.
   */
  const runLiveMarketCheck = useCallback(
    async (options?: { silent?: boolean; currentList?: PriceAlert[] }) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);

      try {
        const snapshot = options?.currentList ?? alertsRef.current;
        const query = !supabaseReady && isPreviewParam ? "?preview=1" : "";
        const res = await fetch(`/api/alerts/check${query}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientAlerts: supabaseReady ? undefined : snapshot,
          }),
        });

        const data = await res.json();
        if (data?.configStatus) {
          setConfigStatus(data.configStatus);
        }

        if (!res.ok || !data?.ok) {
          if (!options?.silent) {
            setBannerMessage({
              kind: "error",
              text: data?.error || "Market alert check failed.",
            });
          }
          return;
        }

        setLastCheckedAt(data.checkedAt || new Date().toISOString());

        if (!supabaseReady && Array.isArray(data.updatedAlerts)) {
          saveLocalAlertsSnapshot(data.updatedAlerts);
          setAlerts(data.updatedAlerts);
        } else {
          await loadAlerts();
        }

        const trigCount = Number(data.triggeredCount) || 0;
        if (trigCount > 0) {
          setBannerMessage({
            kind: "success",
            text: `🚨 ${trigCount} price alert${
              trigCount > 1 ? "s" : ""
            } just triggered! Moved automatically to Triggered records${
              data?.configStatus?.telegramConfigured
                ? " & dispatched to Telegram."
                : "."
            }`,
          });
        } else if (!options?.silent) {
          const checkedCount = Number(data.checkedCount) || 0;
          setBannerMessage({
            kind: "info",
            text:
              checkedCount > 0
                ? `Checked live global quotes for ${checkedCount} pending alert${
                    checkedCount > 1 ? "s" : ""
                  } — all levels updated.`
                : " Market feed synced — no pending alerts waiting right now.",
          });
        }
      } catch (err) {
        if (!options?.silent) {
          setBannerMessage({
            kind: "error",
            text:
              err instanceof Error
                ? err.message
                : "Network error checking market prices.",
          });
        }
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        setSecondsLeft(pollSeconds);
      }
    },
    [isPreviewParam, loadAlerts, pollSeconds, supabaseReady]
  );

  // Initial load + initial status/quote sync
  useEffect(() => {
    let mounted = true;
    (async () => {
      const initialList = await loadAlerts();
      if (mounted) {
        await runLiveMarketCheck({ silent: true, currentList: initialList });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadAlerts, runLiveMarketCheck]);

  // Subscribe to Supabase Realtime updates when cron-job.org updates rows in background
  useEffect(() => {
    if (!supabaseReady) return;
    const supabase = createClient();
    const channel = supabase
      .channel("price-alerts-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "price_alerts" },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAlerts, supabaseReady]);

  // 1-second Next Check Countdown ticker in Header
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          void runLiveMarketCheck({ silent: true });
          return pollSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pollSeconds, runLiveMarketCheck]);

  // =========================================================================
  // Modal Percentage & Price Synchronization Helpers
  // =========================================================================
  const parsedInitialPrice = Number(initialPriceInput);
  const parsedTargetPrice = Number(targetPriceInput);
  const parsedPosPct = Math.max(0, Number(positivePctInput) || 0);
  const parsedNegPct = Math.max(0, Number(negativePctInput) || 0);

  const validInitial =
    Number.isFinite(parsedInitialPrice) && parsedInitialPrice > 0;
  const symbolDecimals = getSymbolDecimals(
    symbolInput,
    validInitial ? parsedInitialPrice : undefined
  );

  const computedGreenPrice = validInitial
    ? parsedInitialPrice * (1 + parsedPosPct / 100)
    : null;
  const computedRedPrice = validInitial
    ? Math.max(0.00000001, parsedInitialPrice * (1 - parsedNegPct / 100))
    : null;

  function syncTargetFromPct(direction: AlertCondition, pct: number) {
    if (!validInitial) return;
    const nextPrice =
      direction === "above"
        ? parsedInitialPrice * (1 + pct / 100)
        : Math.max(0.00000001, parsedInitialPrice * (1 - pct / 100));
    setConditionInput(direction);
    setTargetPriceInput(nextPrice.toFixed(symbolDecimals));
  }

  function handleInitialPriceChange(val: string) {
    setInitialPriceInput(val);
    const p0 = Number(val);
    const tgt = Number(targetPriceInput);
    if (Number.isFinite(p0) && p0 > 0 && Number.isFinite(tgt) && tgt > 0) {
      const diffPct = Math.abs(((tgt - p0) / p0) * 100);
      const formattedPct = diffPct.toFixed(2);
      if (tgt >= p0) {
        setConditionInput("above");
        setPositivePctInput(formattedPct);
        if (mirrorNegativePct) setNegativePctInput(formattedPct);
      } else {
        setConditionInput("below");
        setNegativePctInput(formattedPct);
        if (mirrorNegativePct) setPositivePctInput(formattedPct);
      }
    }
  }

  function handleTargetPriceChange(val: string) {
    setTargetPriceInput(val);
    const tgt = Number(val);
    if (validInitial && Number.isFinite(tgt) && tgt > 0) {
      const diffPct = Math.abs(((tgt - parsedInitialPrice) / parsedInitialPrice) * 100);
      const formattedPct = diffPct.toFixed(2);
      if (tgt >= parsedInitialPrice) {
        setConditionInput("above");
        setPositivePctInput(formattedPct);
        if (mirrorNegativePct) setNegativePctInput(formattedPct);
      } else {
        setConditionInput("below");
        setNegativePctInput(formattedPct);
        if (mirrorNegativePct) setPositivePctInput(formattedPct);
      }
    }
  }

  function handlePositivePctChange(val: string, applyAsTarget = false) {
    setPositivePctInput(val);
    if (mirrorNegativePct) {
      setNegativePctInput(val);
    }
    const pct = Math.max(0, Number(val) || 0);
    if (validInitial && (applyAsTarget || conditionInput === "above")) {
      const nextTarget = parsedInitialPrice * (1 + pct / 100);
      setConditionInput("above");
      setTargetPriceInput(nextTarget.toFixed(symbolDecimals));
    }
  }

  function handleNegativePctChange(val: string, applyAsTarget = false) {
    setNegativePctInput(val);
    if (mirrorNegativePct) {
      setPositivePctInput(val);
    }
    const pct = Math.max(0, Number(val) || 0);
    if (validInitial && (applyAsTarget || conditionInput === "below")) {
      const nextTarget = Math.max(
        0.00000001,
        parsedInitialPrice * (1 - pct / 100)
      );
      setConditionInput("below");
      setTargetPriceInput(nextTarget.toFixed(symbolDecimals));
    }
  }

  async function fetchLivePriceIntoModal(symToFetch?: string) {
    const sym = (symToFetch ?? symbolInput).trim();
    if (!sym) return;
    setFetchingSymbolQuote(true);
    setFormError(null);
    try {
      const res = await fetch(
        `/api/alerts/quotes?symbols=${encodeURIComponent(sym)}`
      );
      const data = await res.json();
      const quotesObj = data?.quotes ?? {};
      const firstQuote = Object.values(quotesObj)[0] as
        | { price: number; normalizedSymbol: string }
        | undefined;
      if (firstQuote && Number.isFinite(firstQuote.price)) {
        const dec = getSymbolDecimals(
          firstQuote.normalizedSymbol,
          firstQuote.price
        );
        const formatted = firstQuote.price.toFixed(dec);
        setSymbolInput(firstQuote.normalizedSymbol);
        setInitialPriceInput(formatted);

        // Pre-populate target price using active % if target is blank
        const pos = Math.max(0.05, Number(positivePctInput) || 0.5);
        const neg = Math.max(0.05, Number(negativePctInput) || 0.5);
        const autoTarget =
          conditionInput === "above"
            ? firstQuote.price * (1 + pos / 100)
            : firstQuote.price * (1 - neg / 100);
        setTargetPriceInput(autoTarget.toFixed(dec));
      } else {
        setFormError(
          `Could not auto-fetch quote for "${sym}". Enter Current Price manually below.`
        );
      }
    } catch {
      setFormError(
        "Could not reach quote endpoint — enter Current Price manually."
      );
    } finally {
      setFetchingSymbolQuote(false);
    }
  }

  function openCreateModal() {
    setEditingAlert(null);
    setFormError(null);
    setSymbolInput("XAU/USD");
    setConditionInput("above");
    setInitialPriceInput("");
    setTargetPriceInput("");
    setPositivePctInput("0.50");
    setNegativePctInput("0.50");
    setMirrorNegativePct(true);
    setStrategyInput("");
    setNotesInput("");
    setChatIdOverrideInput("");
    setModalOpen(true);
    void fetchLivePriceIntoModal("XAU/USD");
  }

  function openEditModal(alert: PriceAlert) {
    setEditingAlert(alert);
    setFormError(null);
    const dec = getSymbolDecimals(alert.symbol, alert.initialPrice);
    setSymbolInput(alert.symbol);
    setConditionInput(alert.condition);
    setInitialPriceInput(alert.initialPrice.toFixed(dec));
    setTargetPriceInput(alert.targetPrice.toFixed(dec));
    setPositivePctInput(alert.positivePct.toFixed(2));
    setNegativePctInput(alert.negativePct.toFixed(2));
    setMirrorNegativePct(
      Math.abs(alert.positivePct - alert.negativePct) < 0.005
    );
    setStrategyInput(alert.strategy ?? "");
    setNotesInput(alert.notes ?? "");
    setChatIdOverrideInput(alert.telegramChatId ?? "");
    setModalOpen(true);
  }

  async function handleSaveAlert(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const sym = symbolInput.trim().toUpperCase();
    if (!sym) {
      setFormError("Please enter a valid Forex pair or market symbol.");
      return;
    }

    const p0 = Number(initialPriceInput);
    if (!Number.isFinite(p0) || p0 <= 0) {
      setFormError("Please enter the Current Price for this symbol.");
      return;
    }

    const tgt = Number(targetPriceInput);
    if (!Number.isFinite(tgt) || tgt <= 0) {
      setFormError("Please enter a valid Target Alert Price.");
      return;
    }

    const posPct = Math.max(0.01, Number(positivePctInput) || 0.5);
    const negPct = Math.max(0.01, Number(negativePctInput) || 0.5);

    setSavingAlert(true);
    try {
      if (editingAlert) {
        await updatePriceAlert(editingAlert.id, {
          symbol: sym,
          condition: conditionInput,
          initialPrice: p0,
          targetPrice: tgt,
          positivePct: posPct,
          negativePct: negPct,
          status: "pending",
          triggeredPrice: null,
          triggeredAt: null,
          telegramNotified: false,
          strategy: strategyInput || null,
          notes: notesInput || null,
          telegramChatId: chatIdOverrideInput || null,
        });
        setBannerMessage({
          kind: "success",
          text: `Updated ${sym} alert and armed as Pending.`,
        });
      } else {
        await createPriceAlert({
          symbol: sym,
          condition: conditionInput,
          initialPrice: p0,
          targetPrice: tgt,
          positivePct: posPct,
          negativePct: negPct,
          strategy: strategyInput || null,
          notes: notesInput || null,
          telegramChatId: chatIdOverrideInput || null,
        });
        setBannerMessage({
          kind: "success",
          text: `Created ${sym} pending alert (+${posPct.toFixed(
            2
          )}% / -${negPct.toFixed(2)}% move tracker active).`,
        });
      }

      setModalOpen(false);
      const refreshedList = await loadAlerts();
      if (activeTab === "triggered") setActiveTab("pending");
      void runLiveMarketCheck({ silent: true, currentList: refreshedList });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save price alert."
      );
    } finally {
      setSavingAlert(false);
    }
  }

  async function handleRearmAlert(alert: PriceAlert) {
    try {
      const nextBaseline = alert.latestPrice ?? alert.initialPrice;
      await updatePriceAlert(alert.id, {
        initialPrice: nextBaseline,
        status: "pending",
        triggeredPrice: null,
        triggeredAt: null,
        telegramNotified: false,
      });
      const next = await loadAlerts();
      setActiveTab("pending");
      setBannerMessage({
        kind: "info",
        text: `Re-armed ${alert.symbol} alert into Pending records.`,
      });
      void runLiveMarketCheck({ silent: true, currentList: next });
    } catch (err) {
      setBannerMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to re-arm alert.",
      });
    }
  }

  async function handleTogglePause(alert: PriceAlert) {
    try {
      const nextStatus = alert.status === "paused" ? "pending" : "paused";
      await updatePriceAlert(alert.id, { status: nextStatus });
      await loadAlerts();
    } catch (err) {
      setBannerMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not update status.",
      });
    }
  }

  async function handleDeleteAlert(alert: PriceAlert) {
    try {
      await deletePriceAlert(alert.id);
      await loadAlerts();
      setBannerMessage({
        kind: "info",
        text: `Removed ${alert.symbol} alert record.`,
      });
    } catch (err) {
      setBannerMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to delete alert.",
      });
    }
  }

  async function handleSendTelegramTest() {
    setTestingTelegram(true);
    setTelegramTestFeedback(null);
    try {
      const query = !supabaseReady && isPreviewParam ? "?preview=1" : "";
      const res = await fetch(`/api/alerts/test-telegram${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: testBotToken.trim() || undefined,
          chatId: testChatId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        const errText = data?.error || "Telegram test failed.";
        setTelegramTestFeedback({
          ok: false,
          message: errText,
          hint: data?.hint,
        });
        setBannerMessage({
          kind: "error",
          text: `${errText}${data?.hint ? ` — ${data.hint}` : ""}`,
        });
      } else {
        const successMsg = `✅ Test message delivered${
          data.botUsername ? ` via ${data.botUsername}` : ""
        }${data.usedChatId ? ` to Chat ID ${data.usedChatId}` : ""}!`;
        setTelegramTestFeedback({
          ok: true,
          message: successMsg,
          hint: data?.hint,
          autoDiscoveredChatId: data?.autoDiscoveredChatId,
        });
        setBannerMessage({
          kind: "success",
          text: successMsg,
        });
      }
    } catch {
      const netErr = "Network error while testing Telegram Bot.";
      setTelegramTestFeedback({
        ok: false,
        message: netErr,
      });
      setBannerMessage({
        kind: "error",
        text: netErr,
      });
    } finally {
      setTestingTelegram(false);
    }
  }

  // Computed lists & KPI metrics
  const pendingAlerts = useMemo(
    () => alerts.filter((a) => a.status === "pending" || a.status === "paused"),
    [alerts]
  );
  const triggeredAlerts = useMemo(
    () => alerts.filter((a) => a.status === "triggered"),
    [alerts]
  );

  const summaryStats = useMemo(() => {
    let inFavorCount = 0;
    let goingAgainstCount = 0;
    let breachedAdverseCount = 0;

    for (const a of pendingAlerts) {
      if (a.status !== "pending") continue;
      const m = computeAlertMoveMetrics(a);
      if (m.isMovingInFavor) inFavorCount++;
      if (m.isGoingAgainst) goingAgainstCount++;
      if (m.breachedAdverseBand) breachedAdverseCount++;
    }

    return {
      pendingCount: alerts.filter((a) => a.status === "pending").length,
      pausedCount: alerts.filter((a) => a.status === "paused").length,
      triggeredCount: triggeredAlerts.length,
      inFavorCount,
      goingAgainstCount,
      breachedAdverseCount,
    };
  }, [alerts, pendingAlerts, triggeredAlerts]);

  const displayedAlerts = useMemo(() => {
    const base =
      activeTab === "pending"
        ? pendingAlerts
        : activeTab === "triggered"
        ? triggeredAlerts
        : alerts;

    return [...base].sort((a, b) => {
      if (sortOrder === "target_desc") {
        return (
          b.targetPrice - a.targetPrice ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortOrder === "target_asc") {
        return (
          a.targetPrice - b.targetPrice ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortOrder === "target_pct_desc") {
        const aPct =
          a.initialPrice > 0
            ? Math.abs(((a.targetPrice - a.initialPrice) / a.initialPrice) * 100)
            : 0;
        const bPct =
          b.initialPrice > 0
            ? Math.abs(((b.targetPrice - b.initialPrice) / b.initialPrice) * 100)
            : 0;
        return bPct - aPct || b.targetPrice - a.targetPrice;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, alerts, pendingAlerts, sortOrder, triggeredAlerts]);

  const countdownProgressPct =
    pollSeconds > 0
      ? Math.max(0, Math.min(100, (secondsLeft / pollSeconds) * 100))
      : 100;

  const cronEndpointExample =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/alerts/check?secret=YOUR_CRON_SECRET`
      : "https://your-domain.vercel.app/api/alerts/check?secret=YOUR_CRON_SECRET";

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* Page Header with Next Check Countdown + Refresh + New Alert Button  */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-300">
                <BellRing className="h-3.5 w-3.5 text-emerald-400" />
                24/7 Global Market Monitor
              </span>
              <span className="rounded-full border border-slate-700/80 bg-slate-900/90 px-2.5 py-0.5 font-mono text-[11px] text-slate-400">
                Telegram Bot + cron-job.org
              </span>
              {configStatus.telegramConfigured ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[11px] text-sky-300">
                  <Send className="h-3 w-3" />
                  Telegram Ready
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("setup")}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <Settings2 className="h-3 w-3" />
                  Setup Guide →
                </button>
              )}
            </div>

            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Global Market Price Alerts
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
              Track Forex, Gold (<code className="text-slate-200">XAU/USD</code>
              ), Indices (<code className="text-slate-200">US30</code>,{" "}
              <code className="text-slate-200">NAS100</code>) &amp; Crypto with{" "}
              <span className="font-medium text-emerald-400">
                Green Positive (+%)
              </span>{" "}
              and{" "}
              <span className="font-medium text-rose-400">
                Red Negative (-%)
              </span>{" "}
              move gauges relative to your entered baseline price.
            </p>
          </div>

          {/* Right Header Controls: Next Check Countdown + Refresh + New Alert */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Next Check Countdown Card */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#090D13] px-3.5 py-2.5 min-w-[220px]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    Next Check
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-300 tabular-nums">
                  {refreshing ? "Checking..." : formatCountdown(secondsLeft)}
                </span>
              </div>

              {/* Countdown Progress Bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${countdownProgressPct}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                <span className="truncate font-mono">
                  Last: {lastCheckedAt ? formatEatDateTime(lastCheckedAt) : "Syncing"}
                </span>
                <div className="flex items-center gap-1">
                  {POLL_INTERVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.seconds}
                      type="button"
                      onClick={() => handlePollIntervalChange(opt.seconds)}
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition ${
                        pollSeconds === opt.seconds
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-900 text-slate-500 hover:text-slate-300"
                      }`}
                      title={`Set countdown cycle to ${opt.label}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void runLiveMarketCheck({ silent: false })}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/40 hover:bg-slate-800 hover:text-white disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 text-emerald-400 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                <span>{refreshing ? "Checking..." : "Refresh"}</span>
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
              >
                <BellPlus className="h-4 w-4" />
                <span>+ New Alert</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Notification Toast / Banner */}
      {bannerMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
            bannerMessage.kind === "success"
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
              : bannerMessage.kind === "error"
              ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
              : "border-sky-500/30 bg-sky-500/10 text-sky-200"
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="rounded p-1 text-current/70 hover:text-current"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4 Summary KPI Cards                                                 */}
      {/* =================================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              Pending Alerts
            </span>
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">
            {summaryStats.pendingCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Actively monitored every check cycle
            {summaryStats.pausedCount > 0
              ? ` · ${summaryStats.pausedCount} paused`
              : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/25 bg-[#0E131B] p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-400">
              Moving In Favor (+%)
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-300">
            {summaryStats.inFavorCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Pending alerts advancing toward target price
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 bg-[#0E131B] ${
            summaryStats.goingAgainstCount > 0
              ? "border-rose-500/35"
              : "border-slate-800/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-rose-400">
              Going Against Me (-%)
            </span>
            <TrendingDown className="h-4 w-4 text-rose-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-rose-300">
            {summaryStats.goingAgainstCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {summaryStats.breachedAdverseCount > 0
              ? `⚠️ ${summaryStats.breachedAdverseCount} past negative (-%) threshold`
              : "Drifting opposite to alert target bias"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-sky-400">
              Triggered History
            </span>
            <CheckCircle2 className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">
            {summaryStats.triggeredCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Auto-updated when target price is crossed
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* Navigation Tabs                                                     */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "pending"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white border border-transparent"
            }`}
          >
            <span>Pending Alerts</span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              {pendingAlerts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("triggered")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "triggered"
                ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white border border-transparent"
            }`}
          >
            <span>Triggered Alerts</span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-sky-400">
              {triggeredAlerts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "all"
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white border border-transparent"
            }`}
          >
            <span>All Records</span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-300">
              {alerts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("setup")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "setup"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white border border-transparent"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Telegram &amp; cron-job.org Setup</span>
          </button>
        </div>

        {activeTab !== "setup" && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
              Sort:
            </span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as AlertSortOrder)}
              aria-label="Sort price alerts"
              className="rounded-xl border border-slate-800 bg-[#090D13] px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="target_desc">Highest Target (High → Low)</option>
              <option value="target_asc">Lowest Target (Low → High)</option>
              <option value="target_pct_desc">Highest Target Move (%)</option>
              <option value="created_desc">Newest Created</option>
            </select>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* Setup & Manual Configuration Tab                                    */}
      {/* =================================================================== */}
      {activeTab === "setup" ? (
        <div className="space-y-6">
          {/* Status Matrix */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6">
            <h2 className="text-base font-semibold text-white">
              Live Infrastructure Wiring Status
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              All backend routes, SQL migrations, market feeds, and Telegram
              dispatchers are built. Here is your live environment checklist:
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  label: "Supabase Database (price_alerts)",
                  ok: configStatus.supabaseConfigured,
                  detail: configStatus.supabaseConfigured
                    ? "Connected via NEXT_PUBLIC_SUPABASE_URL"
                    : "Preview localStorage active until .env.local keys added",
                },
                {
                  label: "24/7 Service Role Key",
                  ok: configStatus.serviceRoleConfigured,
                  detail: configStatus.serviceRoleConfigured
                    ? "SUPABASE_SERVICE_ROLE_KEY ready for cron-job.org"
                    : "Add SUPABASE_SERVICE_ROLE_KEY so cron runs without cookies",
                },
                {
                  label: "Telegram Bot Bridge",
                  ok: configStatus.telegramConfigured,
                  detail: configStatus.telegramConfigured
                    ? "TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID active"
                    : "Add TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID",
                },
                {
                  label: "Cron Security Secret",
                  ok: configStatus.cronSecretConfigured,
                  detail: configStatus.cronSecretConfigured
                    ? "CRON_SECRET protecting /api/alerts/check"
                    : "Set CRON_SECRET to secure external cron pings",
                },
                {
                  label: "Global Market Data Feed",
                  ok: true,
                  detail: configStatus.twelveDataConfigured
                    ? "Twelve Data API primary + Institutional Spot fallback"
                    : "Live Swissquote / Coinbase / Yahoo feeds active (Twelve Data optional)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#090D13] p-3.5"
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      item.ok
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {item.ok ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Step Manual Setup Guide + Live Telegram Tester */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                Step-by-Step Manual Setup (5 Minutes, $0/month)
              </h3>

              <ol className="space-y-3.5 text-xs text-slate-300">
                <li className="rounded-xl border border-slate-800/80 bg-[#090D13] p-3.5">
                  <strong className="text-emerald-400">
                    1. Run SQL Migration in Supabase:
                  </strong>
                  <p className="mt-1 text-slate-400 leading-relaxed">
                    Open your Supabase SQL Editor and paste{" "}
                    <code className="text-slate-200">
                      supabase/migrations/20261102000007_price_alerts.sql
                    </code>{" "}
                    to create the <code className="text-slate-200">public.price_alerts</code>{" "}
                    table and RLS policies.
                  </p>
                </li>

                <li className="rounded-xl border border-slate-800/80 bg-[#090D13] p-3.5">
                  <strong className="text-emerald-400">
                    2. Create Your Free Telegram Bot:
                  </strong>
                  <p className="mt-1 text-slate-400 leading-relaxed">
                    In Telegram, message{" "}
                    <code className="text-slate-200">@BotFather</code> → send{" "}
                    <code className="text-slate-200">/newbot</code> → copy your{" "}
                    <code className="text-slate-200">TELEGRAM_BOT_TOKEN</code>.
                    Open your new bot and click <strong>Start</strong>, then
                    message <code className="text-slate-200">@userinfobot</code>{" "}
                    to copy your numeric{" "}
                    <code className="text-slate-200">TELEGRAM_CHAT_ID</code>.
                  </p>
                </li>

                <li className="rounded-xl border border-slate-800/80 bg-[#090D13] p-3.5">
                  <strong className="text-emerald-400">
                    3. Add Environment Variables (.env.local &amp; Vercel):
                  </strong>
                  <p className="mt-1 text-slate-400 leading-relaxed">
                    Add <code className="text-slate-200">SUPABASE_SERVICE_ROLE_KEY</code>,{" "}
                    <code className="text-slate-200">TELEGRAM_BOT_TOKEN</code>,{" "}
                    <code className="text-slate-200">TELEGRAM_CHAT_ID</code>,{" "}
                    <code className="text-slate-200">CRON_SECRET</code>, and
                    (optionally) <code className="text-slate-200">TWELVE_DATA_API_KEY</code>.
                  </p>
                </li>

                <li className="rounded-xl border border-slate-800/80 bg-[#090D13] p-3.5">
                  <strong className="text-emerald-400">
                    4. Schedule Free 24/7 Checks on cron-job.org:
                  </strong>
                  <p className="mt-1 text-slate-400 leading-relaxed">
                    Create a free account at{" "}
                    <a
                      href="https://cron-job.org"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 underline"
                    >
                      cron-job.org
                    </a>{" "}
                    → <strong>Create Cronjob</strong> → set interval to{" "}
                    <strong>Every 2 minutes</strong> and paste this URL:
                  </p>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-800 bg-[#06080C] p-2">
                    <code className="flex-1 truncate font-mono text-[11px] text-emerald-300">
                      {cronEndpointExample}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(cronEndpointExample);
                        setCopiedCronUrl(true);
                        setTimeout(() => setCopiedCronUrl(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                    >
                      {copiedCronUrl ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </li>
              </ol>
            </div>

            {/* Instant Telegram Test Card */}
            <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Test Your Telegram Bot Right Now
                  </h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Leave the fields blank to test the{" "}
                  <code className="text-slate-200">TELEGRAM_BOT_TOKEN</code>{" "}
                  and <code className="text-slate-200">TELEGRAM_CHAT_ID</code>{" "}
                  from your server environment, or paste temporary values below
                  to verify delivery immediately.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block font-mono text-[11px] uppercase text-slate-400">
                      Bot Token (Optional Override)
                    </label>
                    <input
                      type="password"
                      value={testBotToken}
                      onChange={(e) => setTestBotToken(e.target.value)}
                      placeholder="Uses TELEGRAM_BOT_TOKEN from env if empty"
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-[#090D13] px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] uppercase text-slate-400">
                      Chat ID (Optional Override)
                    </label>
                    <input
                      type="text"
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      placeholder="Uses TELEGRAM_CHAT_ID from env if empty (e.g. 123456789)"
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-[#090D13] px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {telegramTestFeedback && (
                <div
                  className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                    telegramTestFeedback.ok
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  }`}
                >
                  <p className="font-semibold leading-relaxed">
                    {telegramTestFeedback.message}
                  </p>
                  {telegramTestFeedback.hint && (
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      💡 {telegramTestFeedback.hint}
                    </p>
                  )}
                  {telegramTestFeedback.autoDiscoveredChatId && (
                    <div className="mt-2 rounded-lg border border-emerald-500/30 bg-[#060B09] px-2.5 py-1.5 font-mono text-[11px] text-emerald-300">
                      TELEGRAM_CHAT_ID=
                      {telegramTestFeedback.autoDiscoveredChatId}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleSendTelegramTest}
                disabled={testingTelegram}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
              >
                {testingTelegram ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Test Ping...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send Test Telegram Alert</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-800/90 bg-[#0E131B] py-16 text-xs text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-400" />
          Loading price alert records...
        </div>
      ) : displayedAlerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0E131B]/70 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
            <BellRing className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">
            {activeTab === "pending"
              ? "No Pending Price Alerts Armed"
              : activeTab === "triggered"
              ? "No Triggered Alerts Yet"
              : "No Price Alerts Recorded Yet"}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
            {activeTab === "triggered"
              ? "As soon as a pending alert reaches your target price during a cron-job.org check or manual Refresh, it automatically updates and appears here."
              : "Click '+ New Alert' to enter a symbol's current price, generate your Green (+%) and Red (-%) move bands, and start monitoring global markets."}
          </p>
          {activeTab !== "triggered" && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              <BellPlus className="h-4 w-4" />
              <span>Create First Price Alert</span>
            </button>
          )}
        </div>
      ) : (
        /* ================================================================= */
        /* Alert Cards List (Pending / Triggered / All)                      */
        /* ================================================================= */
        <div className="space-y-4">
          {displayedAlerts.map((alert) => {
            const metrics = computeAlertMoveMetrics(alert);
            const stratDef = getStrategyById(alert.strategy);
            const isTriggered = alert.status === "triggered";
            const isPaused = alert.status === "paused";

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border bg-[#0E131B] p-5 transition ${
                  isTriggered
                    ? "border-sky-500/35 shadow-[0_0_25px_-12px_rgba(56,189,248,0.3)]"
                    : metrics.breachedAdverseBand
                    ? "border-rose-500/45 shadow-[0_0_25px_-12px_rgba(244,63,94,0.28)]"
                    : metrics.isMovingInFavor
                    ? "border-emerald-500/30"
                    : "border-slate-800/90"
                }`}
              >
                {/* Top Row: Symbol, Condition, Status, Strategy Link, Actions */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-lg font-bold tracking-tight text-white">
                      {alert.symbol}
                    </span>

                    {/* Condition Pill */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${
                        alert.condition === "above"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {alert.condition === "above" ? (
                        <>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span>
                            Crosses Above{" "}
                            {formatAlertPrice(alert.targetPrice, alert.symbol)}
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          <span>
                            Crosses Below{" "}
                            {formatAlertPrice(alert.targetPrice, alert.symbol)}
                          </span>
                        </>
                      )}
                    </span>

                    {/* Status Badge */}
                    {isTriggered ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/35 bg-sky-500/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-sky-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Triggered
                      </span>
                    ) : isPaused ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-slate-400">
                        <Pause className="h-3 w-3" />
                        Paused
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Pending
                      </span>
                    )}

                    {/* Live Directional Move Status Pill */}
                    {!isTriggered && metrics.directionalMovePct !== null && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                          metrics.isMovingInFavor
                            ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                            : metrics.isGoingAgainst
                            ? "border-rose-500/35 bg-rose-500/15 text-rose-300"
                            : "border-slate-700 bg-slate-900 text-slate-400"
                        }`}
                      >
                        {metrics.isMovingInFavor ? (
                          <>
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>
                              +{metrics.directionalMovePct.toFixed(2)}% · Moving
                              Toward Alert
                            </span>
                          </>
                        ) : metrics.isGoingAgainst ? (
                          <>
                            <TrendingDown className="h-3.5 w-3.5" />
                            <span>
                              {metrics.directionalMovePct.toFixed(2)}% · Going
                              Against You
                            </span>
                          </>
                        ) : (
                          <span>0.00% · At Baseline</span>
                        )}
                      </span>
                    )}

                    {!isTriggered && metrics.breachedAdverseBand && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-200">
                        <AlertTriangle className="h-3 w-3 text-rose-300" />
                        Past -{metrics.adverseBandPct.toFixed(2)}% Band
                      </span>
                    )}

                    {stratDef && (
                      <Link
                        href={withSessionQuery(stratDef.href)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition"
                      >
                        <span>
                          {formatStrategyLabel(alert.strategy, true)}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2">
                    {isTriggered ? (
                      <button
                        type="button"
                        onClick={() => handleRearmAlert(alert)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Re-arm</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTogglePause(alert)}
                        title={isPaused ? "Resume monitoring" : "Pause alert"}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
                      >
                        {isPaused ? (
                          <>
                            <Play className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Resume</span>
                          </>
                        ) : (
                          <>
                            <Pause className="h-3.5 w-3.5 text-amber-400" />
                            <span>Pause</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(alert)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAlert(alert)}
                      title="Delete alert"
                      className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Middle Grid: Price Comparison + Green (+%) & Red (-%) Reference Levels */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-slate-800/80 bg-[#090D13] p-3">
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      Entered Baseline Price
                    </span>
                    <span className="mt-1 block font-mono text-sm font-semibold text-slate-200">
                      {formatAlertPrice(alert.initialPrice, alert.symbol)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-[#090D13] p-3">
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      {isTriggered ? "Triggered At Price" : "Latest Market Price"}
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-sm font-bold text-white">
                        {formatAlertPrice(
                          isTriggered
                            ? alert.triggeredPrice ?? alert.latestPrice
                            : alert.latestPrice,
                          alert.symbol
                        )}
                      </span>
                      {metrics.rawMarketMovePct !== null && (
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            metrics.rawMarketMovePct >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          ({metrics.rawMarketMovePct >= 0 ? "+" : ""}
                          {metrics.rawMarketMovePct.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-[#090D13] p-3">
                    <span className="block font-mono text-[10px] uppercase text-slate-500">
                      Target Trigger Price
                    </span>
                    <span className="mt-1 block font-mono text-sm font-bold text-amber-300">
                      {formatAlertPrice(alert.targetPrice, alert.symbol)}
                    </span>
                  </div>

                  {/* Green Positive (+%) Reference Box */}
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                    <span className="block font-mono text-[10px] uppercase text-emerald-400">
                      Green Positive (+{alert.positivePct.toFixed(2)}%)
                    </span>
                    <span className="mt-1 block font-mono text-sm font-semibold text-emerald-300">
                      {formatAlertPrice(
                        metrics.positiveLevelPrice,
                        alert.symbol
                      )}
                    </span>
                    <span className="text-[10px] text-emerald-400/75">
                      {alert.condition === "above"
                        ? "Favorable upside band"
                        : "Upside against-me band"}
                    </span>
                  </div>

                  {/* Red Negative (-%) Reference Box */}
                  <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
                    <span className="block font-mono text-[10px] uppercase text-rose-400">
                      Red Negative (-{alert.negativePct.toFixed(2)}%)
                    </span>
                    <span className="mt-1 block font-mono text-sm font-semibold text-rose-300">
                      {formatAlertPrice(
                        metrics.negativeLevelPrice,
                        alert.symbol
                      )}
                    </span>
                    <span className="text-[10px] text-rose-400/75">
                      {alert.condition === "below"
                        ? "Target downside band"
                        : "Downside against-me band"}
                    </span>
                  </div>
                </div>

                {/* Center-Zero Dual Tug-of-War Bar (Going Against Me -% vs Moving Toward Target +%) */}
                <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#090D13] px-3.5 py-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-rose-400">
                      ← Going Against Alert (-{metrics.adverseBandPct.toFixed(2)}
                      % @{" "}
                      {formatAlertPrice(metrics.adverseBandPrice, alert.symbol)})
                    </span>
                    <span className="text-slate-400">
                      Baseline:{" "}
                      {formatAlertPrice(alert.initialPrice, alert.symbol)} (0%)
                    </span>
                    <span className="text-emerald-400">
                      Toward Target (
                      {formatAlertPrice(alert.targetPrice, alert.symbol)}) →
                    </span>
                  </div>

                  <div className="mt-1.5 grid grid-cols-2 gap-0.5 h-2 rounded-full overflow-hidden bg-slate-800/90">
                    {/* Left Half: Red Adverse Move Going Against Alert */}
                    <div className="flex justify-end bg-slate-900/80">
                      <div
                        className="h-full bg-gradient-to-l from-rose-500 to-rose-400 transition-all duration-500"
                        style={{ width: `${metrics.adverseProgressRatio}%` }}
                      />
                    </div>
                    {/* Right Half: Green Favorable Progress Toward Target */}
                    <div className="flex justify-start bg-slate-900/80">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-500"
                        style={{ width: `${metrics.favorableProgressRatio}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Metadata & Notes */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex flex-wrap items-center gap-3 font-mono">
                    <span>Created: {formatEatDateTime(alert.createdAt)} EAT</span>
                    {alert.lastCheckedAt && (
                      <span>
                        Checked: {formatEatDateTime(alert.lastCheckedAt)} EAT
                      </span>
                    )}
                    {isTriggered && alert.triggeredAt && (
                      <span className="text-sky-300">
                        Triggered: {formatEatDateTime(alert.triggeredAt)} EAT
                        {alert.telegramNotified ? " · Telegram Sent ✓" : ""}
                      </span>
                    )}
                  </div>
                  {alert.notes && (
                    <p className="text-xs text-slate-300 italic">
                      “{alert.notes}”
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* Alert Creation & Edit Modal                                         */}
      {/* =================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0D121A] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-400">
                  {editingAlert ? "Update Price Alert" : "New Global Price Alert"}
                </span>
                <h2 className="mt-0.5 text-lg font-bold text-white">
                  {editingAlert
                    ? `Edit ${editingAlert.symbol} Alert`
                    : "Configure Symbol, Baseline Price & +/- % Move"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="mt-5 space-y-5 max-h-[78vh] overflow-y-auto pr-1">
              {formError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                  {formError}
                </div>
              )}

              {/* 1. Symbol / Forex Pair Picker */}
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  1. Symbol / Forex Pair
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ALERT_PRESET_SYMBOLS.map((item) => {
                    const selected =
                      symbolInput.trim().toUpperCase() === item.symbol;
                    return (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => {
                          setSymbolInput(item.symbol);
                          void fetchLivePriceIntoModal(item.symbol);
                        }}
                        className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-medium transition ${
                          selected
                            ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-300"
                            : "border-slate-800 bg-[#090D13] text-slate-400 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        {item.symbol}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                    placeholder="e.g. XAU/USD, EUR/USD, GBP/JPY, US30, BTC/USD"
                    className="flex-1 rounded-xl border border-slate-800 bg-[#090D13] px-3.5 py-2.5 font-mono text-sm font-semibold text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void fetchLivePriceIntoModal()}
                    disabled={fetchingSymbolQuote}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60 transition"
                  >
                    {fetchingSymbolQuote ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>Fetch Live Price</span>
                  </button>
                </div>
              </div>

              {/* 2. Current Baseline Price + Target Alert Price */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    2. Enter Current Price (Baseline)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={initialPriceInput}
                    onChange={(e) => handleInitialPriceChange(e.target.value)}
                    placeholder="e.g. 4008.50 or 1.08500"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#090D13] px-3.5 py-2.5 font-mono text-sm font-semibold text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Anchors your Green (+%) &amp; Red (-%) move percentages.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      3. Target Trigger Price
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setConditionInput("above");
                          syncTargetFromPct("above", parsedPosPct || 0.5);
                        }}
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition ${
                          conditionInput === "above"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-900 text-slate-500"
                        }`}
                      >
                        ▲ Above
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConditionInput("below");
                          syncTargetFromPct("below", parsedNegPct || 0.5);
                        }}
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition ${
                          conditionInput === "below"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-slate-900 text-slate-500"
                        }`}
                      >
                        ▼ Below
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={targetPriceInput}
                    onChange={(e) => handleTargetPriceChange(e.target.value)}
                    placeholder="Alert triggers when price hits this level"
                    className="mt-1.5 w-full rounded-xl border border-amber-500/40 bg-[#090D13] px-3.5 py-2.5 font-mono text-sm font-semibold text-amber-200 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Triggers on Telegram when live price crosses{" "}
                    <strong className="text-slate-300">{conditionInput}</strong>{" "}
                    this level.
                  </p>
                </div>
              </div>

              {/* 3. Dual Green Positive (+%) & Red Negative (-%) Move Generator */}
              <div className="rounded-2xl border border-slate-800 bg-[#090D13] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-white">
                      Positive (+%) &amp; Negative (-%) Move Bands From Current
                      Price
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Tracks live whether the market is moving toward your alert
                      or going against you.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mirrorNegativePct}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setMirrorNegativePct(checked);
                        if (checked) {
                          setNegativePctInput(positivePctInput);
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                    />
                    <span>Mirror +/- %</span>
                  </label>
                </div>

                {/* Quick % Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase text-slate-500 mr-1">
                    Quick Band:
                  </span>
                  {QUICK_PCT_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const s = pct.toFixed(2);
                        setPositivePctInput(s);
                        setNegativePctInput(s);
                        syncTargetFromPct(conditionInput, pct);
                      }}
                      className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition"
                    >
                      ±{pct.toFixed(2)}%
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* GREEN POSITIVE (+%) CARD */}
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-300">
                        <TrendingUp className="h-3.5 w-3.5" />
                        GREEN POSITIVE (+%)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          syncTargetFromPct("above", parsedPosPct || 0.5)
                        }
                        disabled={!validInitial}
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-40"
                      >
                        <Target className="h-3 w-3" />
                        Set as Target
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        +
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={positivePctInput}
                        onChange={(e) =>
                          handlePositivePctChange(e.target.value, false)
                        }
                        className="w-24 rounded-lg border border-emerald-500/40 bg-[#07110E] px-2.5 py-1.5 font-mono text-sm font-bold text-emerald-200 focus:outline-none"
                      />
                      <span className="font-mono text-xs text-emerald-300">
                        %
                      </span>
                    </div>

                    <div className="mt-2.5 border-t border-emerald-500/20 pt-2 font-mono text-xs text-emerald-200">
                      {computedGreenPrice !== null ? (
                        <>
                          <div>
                            Level:{" "}
                            <strong>
                              {formatAlertPrice(
                                computedGreenPrice,
                                symbolInput
                              )}
                            </strong>
                          </div>
                          <div className="text-[10px] text-emerald-300/80">
                            Move: +
                            {formatAlertPrice(
                              computedGreenPrice - parsedInitialPrice,
                              symbolInput
                            )}{" "}
                            {conditionInput === "above"
                              ? "(Toward Alert 🎯)"
                              : "(Against Below Alert ⚠️)"}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-emerald-300/60">
                          Enter Current Price to preview +level
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RED NEGATIVE (-%) CARD */}
                  <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-rose-300">
                        <TrendingDown className="h-3.5 w-3.5" />
                        RED NEGATIVE (-%)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          syncTargetFromPct("below", parsedNegPct || 0.5)
                        }
                        disabled={!validInitial}
                        className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-40"
                      >
                        <Target className="h-3 w-3" />
                        Set as Target
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-rose-400">
                        -
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={negativePctInput}
                        onChange={(e) => {
                          setMirrorNegativePct(false);
                          handleNegativePctChange(e.target.value, false);
                        }}
                        className="w-24 rounded-lg border border-rose-500/40 bg-[#14090C] px-2.5 py-1.5 font-mono text-sm font-bold text-rose-200 focus:outline-none"
                      />
                      <span className="font-mono text-xs text-rose-300">%</span>
                    </div>

                    <div className="mt-2.5 border-t border-rose-500/20 pt-2 font-mono text-xs text-rose-200">
                      {computedRedPrice !== null ? (
                        <>
                          <div>
                            Level:{" "}
                            <strong>
                              {formatAlertPrice(computedRedPrice, symbolInput)}
                            </strong>
                          </div>
                          <div className="text-[10px] text-rose-300/80">
                            Move: -
                            {formatAlertPrice(
                              parsedInitialPrice - computedRedPrice,
                              symbolInput
                            )}{" "}
                            {conditionInput === "above"
                              ? "(Going Against Alert ⚠️)"
                              : "(Toward Below Alert 🎯)"}
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-rose-300/60">
                          Enter Current Price to preview -level
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Linked Strategy & Notes */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Linked Strategy Blueprint (Optional)
                  </label>
                  <select
                    value={strategyInput}
                    onChange={(e) => setStrategyInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#090D13] px-3 py-2.5 text-xs text-white focus:border-emerald-500/50 focus:outline-none"
                  >
                    <option value="">— Any / General Price Level —</option>
                    {STRATEGY_FAMILIES.map((family) => (
                      <optgroup key={family} label={family}>
                        {STRATEGY_CATALOG.filter(
                          (s) => s.family === family
                        ).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.shortLabel}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Telegram Chat ID Override (Optional)
                  </label>
                  <input
                    type="text"
                    value={chatIdOverrideInput}
                    onChange={(e) => setChatIdOverrideInput(e.target.value)}
                    placeholder="Defaults to env TELEGRAM_CHAT_ID"
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#090D13] px-3 py-2.5 font-mono text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  Desk Notes / Confluence Reminder (Sent to Telegram)
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g. 4H Bearish FVG tap — check G-01 Trend & G-02 Candlestick Momentum before sell"
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-[#090D13] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAlert}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {savingAlert ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <BellPlus className="h-4 w-4" />
                      <span>
                        {editingAlert ? "Save & Arm Alert" : "Create Price Alert"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
