import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AlertCondition = "above" | "below";
export type AlertStatus = "pending" | "triggered" | "paused";

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  /** The Current Price entered by the trader when creating the alert */
  initialPrice: number;
  /** Target price level where the alert triggers */
  targetPrice: number;
  /** Green positive (+%) reference percentage anchored on initialPrice */
  positivePct: number;
  /** Red negative (-%) reference percentage anchored on initialPrice to monitor moves going against the trader */
  negativePct: number;
  /** Latest market quote from the scheduler or manual refresh */
  latestPrice: number | null;
  lastCheckedAt: string | null;
  status: AlertStatus;
  triggeredPrice: number | null;
  triggeredAt: string | null;
  telegramNotified: boolean;
  telegramChatId?: string | null;
  strategy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  isLocalPreview?: boolean;
}

export interface PriceAlertInput {
  symbol: string;
  condition: AlertCondition;
  initialPrice: number;
  targetPrice: number;
  positivePct: number;
  negativePct: number;
  telegramChatId?: string | null;
  strategy?: string | null;
  notes?: string | null;
}

export interface ComputedAlertMove {
  /** Green (+%) price level above initialPrice: initialPrice * (1 + positivePct / 100) */
  positiveLevelPrice: number;
  /** Red (-%) price level below initialPrice: initialPrice * (1 - negativePct / 100) */
  negativeLevelPrice: number;
  /** Favorable price target vs adverse guardrail price for this alert's direction */
  favorableBandPrice: number;
  favorableBandPct: number;
  adverseBandPrice: number;
  adverseBandPct: number;
  /** Raw market % change from initialPrice to active comparison price */
  rawMarketMovePct: number | null;
  /** Raw price difference (latest - initial) */
  rawPriceDiff: number | null;
  /**
   * Directional % move relative to the alert bias:
   *  > 0 means moving IN FAVOR (toward targetPrice) -> GREEN POSITIVE
   *  < 0 means GOING AGAINST YOU (away from targetPrice) -> RED NEGATIVE
   */
  directionalMovePct: number | null;
  isMovingInFavor: boolean;
  isGoingAgainst: boolean;
  /** True if the move against the alert has reached or exceeded the configured negative/adverse % band */
  breachedAdverseBand: boolean;
  /** 0..100 progress toward targetPrice when moving in favor */
  favorableProgressRatio: number;
  /** 0..100 progress toward adverse guardrail when going against the alert */
  adverseProgressRatio: number;
}

export const ALERT_PRESET_SYMBOLS = [
  { symbol: "XAU/USD", label: "Gold Spot", category: "Metals" },
  { symbol: "EUR/USD", label: "Euro / US Dollar", category: "Forex" },
  { symbol: "GBP/USD", label: "Pound / US Dollar", category: "Forex" },
  { symbol: "USD/JPY", label: "US Dollar / Yen", category: "Forex" },
  { symbol: "USD/CAD", label: "US Dollar / Loonie", category: "Forex" },
  { symbol: "AUD/USD", label: "Aussie / US Dollar", category: "Forex" },
  { symbol: "US30", label: "Dow Jones 30", category: "Indices" },
  { symbol: "NAS100", label: "Nasdaq 100", category: "Indices" },
  { symbol: "BTC/USD", label: "Bitcoin / USD", category: "Crypto" },
  { symbol: "ETH/USD", label: "Ethereum / USD", category: "Crypto" },
] as const;

const LOCAL_STORAGE_ALERTS_KEY = "mp_price_alerts_v1";

export function getSymbolDecimals(symbol: string, referencePrice?: number): number {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return 3;
  if (
    s.includes("XAU") ||
    s.includes("XAG") ||
    s.includes("US30") ||
    s.includes("NAS") ||
    s.includes("SPX") ||
    s.includes("BTC") ||
    s.includes("ETH") ||
    s.includes("OIL")
  ) {
    return 2;
  }
  if (referencePrice !== undefined && referencePrice >= 100) return 2;
  return 5;
}

export function formatAlertPrice(
  price: number | null | undefined,
  symbol: string
): string {
  if (price === null || price === undefined || !Number.isFinite(price)) {
    return "—";
  }
  const decimals = getSymbolDecimals(symbol, price);
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return price.toFixed(decimals);
}

/**
 * Computes the Green Positive (+%) and Red Negative (-%) bands anchored on the
 * trader's entered Current Price (`initialPrice`), plus live directional progress
 * indicating whether the market is moving toward the alert or going against it.
 */
export function computeAlertMoveMetrics(alert: {
  condition: AlertCondition;
  initialPrice: number;
  targetPrice: number;
  positivePct: number;
  negativePct: number;
  latestPrice: number | null;
  status?: AlertStatus;
  triggeredPrice?: number | null;
}): ComputedAlertMove {
  const p0 = alert.initialPrice > 0 ? alert.initialPrice : 1;
  const posPct = Math.max(0, Number(alert.positivePct) || 0);
  const negPct = Math.max(0, Number(alert.negativePct) || 0);

  const positiveLevelPrice = p0 * (1 + posPct / 100);
  const negativeLevelPrice = Math.max(0.00000001, p0 * (1 - negPct / 100));

  // For 'above' alerts: rising (+%) is favorable, falling (-%) is going against you.
  // For 'below' alerts: falling (-% price / toward lower target) is favorable to trigger,
  // while rising (+% price away from target) is going against your alert.
  const favorableBandPct = alert.condition === "above" ? posPct : negPct;
  const favorableBandPrice =
    alert.condition === "above" ? positiveLevelPrice : negativeLevelPrice;
  const adverseBandPct = alert.condition === "above" ? negPct : posPct;
  const adverseBandPrice =
    alert.condition === "above" ? negativeLevelPrice : positiveLevelPrice;

  const activePrice =
    alert.status === "triggered" && alert.triggeredPrice
      ? alert.triggeredPrice
      : alert.latestPrice;

  if (activePrice === null || activePrice === undefined || activePrice <= 0) {
    return {
      positiveLevelPrice,
      negativeLevelPrice,
      favorableBandPrice,
      favorableBandPct,
      adverseBandPrice,
      adverseBandPct,
      rawMarketMovePct: null,
      rawPriceDiff: null,
      directionalMovePct: null,
      isMovingInFavor: false,
      isGoingAgainst: false,
      breachedAdverseBand: false,
      favorableProgressRatio: 0,
      adverseProgressRatio: 0,
    };
  }

  const rawPriceDiff = activePrice - p0;
  const rawMarketMovePct = (rawPriceDiff / p0) * 100;

  // Positive directionalMovePct = moving toward targetPrice (Green)
  // Negative directionalMovePct = moving away from targetPrice / going against alert (Red)
  const directionalMovePct =
    alert.condition === "above" ? rawMarketMovePct : -rawMarketMovePct;

  const isMovingInFavor = directionalMovePct > 0.0001;
  const isGoingAgainst = directionalMovePct < -0.0001;

  const targetDist = Math.abs(alert.targetPrice - p0);
  let favorableProgressRatio = 0;
  if (alert.status === "triggered") {
    favorableProgressRatio = 100;
  } else if (isMovingInFavor) {
    if (targetDist > 0) {
      favorableProgressRatio = Math.min(
        100,
        (Math.abs(rawPriceDiff) / targetDist) * 100
      );
    } else {
      favorableProgressRatio = 100;
    }
  }

  let adverseProgressRatio = 0;
  let breachedAdverseBand = false;
  if (isGoingAgainst) {
    const absAdversePct = Math.abs(directionalMovePct);
    const guardrail = adverseBandPct > 0 ? adverseBandPct : 0.5;
    adverseProgressRatio = Math.min(100, (absAdversePct / guardrail) * 100);
    breachedAdverseBand = absAdversePct >= guardrail;
  }

  return {
    positiveLevelPrice,
    negativeLevelPrice,
    favorableBandPrice,
    favorableBandPct,
    adverseBandPrice,
    adverseBandPct,
    rawMarketMovePct,
    rawPriceDiff,
    directionalMovePct,
    isMovingInFavor,
    isGoingAgainst,
    breachedAdverseBand,
    favorableProgressRatio,
    adverseProgressRatio,
  };
}

// ============================================================================
// Persistence Layer (Supabase `public.price_alerts` + Local Preview Fallback)
// ============================================================================

interface DbPriceAlertRow {
  id: string;
  user_id: string;
  symbol: string;
  condition: AlertCondition;
  initial_price: string | number;
  target_price: string | number;
  positive_pct: string | number;
  negative_pct: string | number;
  latest_price: string | number | null;
  last_checked_at: string | null;
  status: AlertStatus;
  triggered_price: string | number | null;
  triggered_at: string | null;
  telegram_notified: boolean;
  telegram_chat_id: string | null;
  strategy: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbRowToAlert(row: DbPriceAlertRow): PriceAlert {
  return {
    id: row.id,
    symbol: row.symbol,
    condition: row.condition,
    initialPrice: Number(row.initial_price),
    targetPrice: Number(row.target_price),
    positivePct: Number(row.positive_pct),
    negativePct: Number(row.negative_pct),
    latestPrice: row.latest_price !== null ? Number(row.latest_price) : null,
    lastCheckedAt: row.last_checked_at,
    status: row.status,
    triggeredPrice:
      row.triggered_price !== null ? Number(row.triggered_price) : null,
    triggeredAt: row.triggered_at,
    telegramNotified: Boolean(row.telegram_notified),
    telegramChatId: row.telegram_chat_id,
    strategy: row.strategy,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readLocalAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAlerts(alerts: PriceAlert[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_ALERTS_KEY,
      JSON.stringify(alerts)
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function saveLocalAlertsSnapshot(alerts: PriceAlert[]) {
  writeLocalAlerts(alerts);
}

export async function listPriceAlerts(): Promise<PriceAlert[]> {
  if (!isSupabaseConfigured()) {
    return readLocalAlerts().sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DbPriceAlertRow[]).map(mapDbRowToAlert);
}

export async function createPriceAlert(
  input: PriceAlertInput
): Promise<PriceAlert> {
  const normalizedSymbol = input.symbol.trim().toUpperCase();

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString();
    const created: PriceAlert = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      symbol: normalizedSymbol,
      condition: input.condition,
      initialPrice: input.initialPrice,
      targetPrice: input.targetPrice,
      positivePct: input.positivePct,
      negativePct: input.negativePct,
      latestPrice: input.initialPrice,
      lastCheckedAt: null,
      status: "pending",
      triggeredPrice: null,
      triggeredAt: null,
      telegramNotified: false,
      telegramChatId: input.telegramChatId?.trim() || null,
      strategy: input.strategy || null,
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
      isLocalPreview: true,
    };

    const existing = readLocalAlerts();
    writeLocalAlerts([created, ...existing]);
    return created;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to create price alerts.");
  }

  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: user.id,
      symbol: normalizedSymbol,
      condition: input.condition,
      initial_price: input.initialPrice,
      target_price: input.targetPrice,
      positive_pct: input.positivePct,
      negative_pct: input.negativePct,
      latest_price: input.initialPrice,
      status: "pending",
      telegram_chat_id: input.telegramChatId?.trim() || null,
      strategy: input.strategy || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create price alert.");
  }

  return mapDbRowToAlert(data as DbPriceAlertRow);
}

export async function updatePriceAlert(
  id: string,
  patch: Partial<
    PriceAlertInput & {
      status: AlertStatus;
      latestPrice: number | null;
      lastCheckedAt: string | null;
      triggeredPrice: number | null;
      triggeredAt: string | null;
      telegramNotified: boolean;
    }
  >
): Promise<PriceAlert> {
  if (!isSupabaseConfigured()) {
    const existing = readLocalAlerts();
    const idx = existing.findIndex((item) => item.id === id);
    if (idx === -1) throw new Error("Alert not found.");

    const updated: PriceAlert = {
      ...existing[idx],
      ...(patch.symbol !== undefined
        ? { symbol: patch.symbol.trim().toUpperCase() }
        : {}),
      ...(patch.condition !== undefined ? { condition: patch.condition } : {}),
      ...(patch.initialPrice !== undefined
        ? { initialPrice: patch.initialPrice }
        : {}),
      ...(patch.targetPrice !== undefined
        ? { targetPrice: patch.targetPrice }
        : {}),
      ...(patch.positivePct !== undefined
        ? { positivePct: patch.positivePct }
        : {}),
      ...(patch.negativePct !== undefined
        ? { negativePct: patch.negativePct }
        : {}),
      ...(patch.latestPrice !== undefined
        ? { latestPrice: patch.latestPrice }
        : {}),
      ...(patch.lastCheckedAt !== undefined
        ? { lastCheckedAt: patch.lastCheckedAt }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.triggeredPrice !== undefined
        ? { triggeredPrice: patch.triggeredPrice }
        : {}),
      ...(patch.triggeredAt !== undefined
        ? { triggeredAt: patch.triggeredAt }
        : {}),
      ...(patch.telegramNotified !== undefined
        ? { telegramNotified: patch.telegramNotified }
        : {}),
      ...(patch.telegramChatId !== undefined
        ? { telegramChatId: patch.telegramChatId?.trim() || null }
        : {}),
      ...(patch.strategy !== undefined
        ? { strategy: patch.strategy || null }
        : {}),
      ...(patch.notes !== undefined
        ? { notes: patch.notes?.trim() || null }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    existing[idx] = updated;
    writeLocalAlerts(existing);
    return updated;
  }

  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.symbol !== undefined)
    dbPatch.symbol = patch.symbol.trim().toUpperCase();
  if (patch.condition !== undefined) dbPatch.condition = patch.condition;
  if (patch.initialPrice !== undefined)
    dbPatch.initial_price = patch.initialPrice;
  if (patch.targetPrice !== undefined) dbPatch.target_price = patch.targetPrice;
  if (patch.positivePct !== undefined) dbPatch.positive_pct = patch.positivePct;
  if (patch.negativePct !== undefined) dbPatch.negative_pct = patch.negativePct;
  if (patch.latestPrice !== undefined) dbPatch.latest_price = patch.latestPrice;
  if (patch.lastCheckedAt !== undefined)
    dbPatch.last_checked_at = patch.lastCheckedAt;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.triggeredPrice !== undefined)
    dbPatch.triggered_price = patch.triggeredPrice;
  if (patch.triggeredAt !== undefined) dbPatch.triggered_at = patch.triggeredAt;
  if (patch.telegramNotified !== undefined)
    dbPatch.telegram_notified = patch.telegramNotified;
  if (patch.telegramChatId !== undefined)
    dbPatch.telegram_chat_id = patch.telegramChatId?.trim() || null;
  if (patch.strategy !== undefined) dbPatch.strategy = patch.strategy || null;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes?.trim() || null;

  const { data, error } = await supabase
    .from("price_alerts")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to update price alert.");
  }

  return mapDbRowToAlert(data as DbPriceAlertRow);
}

export async function deletePriceAlert(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const filtered = readLocalAlerts().filter((a) => a.id !== id);
    writeLocalAlerts(filtered);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase.from("price_alerts").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
