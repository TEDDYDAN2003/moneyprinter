import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type TradeType = "buy" | "sell";
export type TradeOutcome = "open" | "win" | "loss" | "breakeven";

export interface JournalEntry {
  id: string;
  symbol: string;
  tradeType: TradeType;
  lotSize: number;
  openingPrice: number;
  closingPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  leverage: number;
  tradedAt: string; // ISO 8601 string
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  isLocalPreview?: boolean;
}

export interface JournalEntryInput {
  symbol: string;
  tradeType: TradeType;
  lotSize: number;
  openingPrice: number;
  closingPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  leverage: number;
  tradedAt: string;
  notes?: string | null;
}

export interface ComputedTradeMetrics {
  contractLabel: string;
  notionalUsd: number;
  usedMarginUsd: number;
  plannedRiskUsd: number | null;
  plannedRewardUsd: number | null;
  plannedRR: number | null;
  slMoveLabel: string | null;
  tpMoveLabel: string | null;
  realizedPnlUsd: number | null;
  realizedMoveLabel: string | null;
  outcome: TradeOutcome;
}

export const POPULAR_SYMBOLS = [
  "XAU/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/CAD",
  "USD/JPY",
  "AUD/USD",
  "US30",
  "NAS100",
  "GBP/JPY",
  "NZD/USD",
  "USD/CHF",
  "BTC/USD",
] as const;

export const LEVERAGE_PRESETS = [50, 100, 200, 500, 1000, 2000, 3000] as const;

const KNOWN_SIX_CHAR_FX = new Set([
  "XAUUSD",
  "XAGUSD",
  "EURUSD",
  "GBPUSD",
  "AUDUSD",
  "NZDUSD",
  "USDCAD",
  "USDCHF",
  "USDJPY",
  "EURJPY",
  "GBPJPY",
  "AUDJPY",
  "CADJPY",
  "CHFJPY",
  "EURGBP",
  "EURAUD",
  "EURCAD",
  "GBPAUD",
  "GBPCAD",
  "BTCUSD",
  "ETHUSD",
]);

export function normalizeSymbol(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return "";
  const alphaNum = cleaned.replace(/[^A-Z0-9]/g, "");
  if (alphaNum.length === 6 && KNOWN_SIX_CHAR_FX.has(alphaNum)) {
    return `${alphaNum.slice(0, 3)}/${alphaNum.slice(3)}`;
  }
  return cleaned;
}

interface InstrumentSpec {
  kind:
    | "gold"
    | "silver"
    | "fx_usd_quote"
    | "fx_usd_base"
    | "fx_usd_jpy"
    | "fx_cross_jpy"
    | "fx_cross"
    | "index_or_crypto";
  contractSize: number;
  pipSize: number;
  unitName: "pips" | "pts";
  contractLabel: string;
}

function getInstrumentSpec(symbol: string): InstrumentSpec {
  const key = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (key === "XAUUSD" || key === "GOLD") {
    return {
      kind: "gold",
      contractSize: 100, // 1.00 lot = 100 troy oz (0.01 lot = 1 oz)
      pipSize: 0.1, // $0.10 = 1 pip on Gold ($1.00 = 10 pips)
      unitName: "pts",
      contractLabel: "100 oz / lot",
    };
  }

  if (key === "XAGUSD" || key === "SILVER") {
    return {
      kind: "silver",
      contractSize: 5000,
      pipSize: 0.01,
      unitName: "pts",
      contractLabel: "5,000 oz / lot",
    };
  }

  if (
    key === "US30" ||
    key === "DJ30" ||
    key === "NAS100" ||
    key === "US100" ||
    key === "USTEC" ||
    key === "SPX500" ||
    key === "US500" ||
    key === "GER40" ||
    key === "UK100" ||
    key.startsWith("BTC") ||
    key.startsWith("ETH") ||
    key.startsWith("SOL")
  ) {
    return {
      kind: "index_or_crypto",
      contractSize: 1, // Standard 1 contract per 1.00 CFD lot (0.01 lot = $0.01/pt)
      pipSize: 1,
      unitName: "pts",
      contractLabel: "1 unit / lot",
    };
  }

  if (key === "USDJPY") {
    return {
      kind: "fx_usd_jpy",
      contractSize: 100000,
      pipSize: 0.01,
      unitName: "pips",
      contractLabel: "100k USD / lot",
    };
  }

  if (key.length === 6 && key.endsWith("JPY")) {
    return {
      kind: "fx_cross_jpy",
      contractSize: 100000,
      pipSize: 0.01,
      unitName: "pips",
      contractLabel: "100k units / lot",
    };
  }

  if (key.length === 6 && key.endsWith("USD")) {
    return {
      kind: "fx_usd_quote",
      contractSize: 100000,
      pipSize: 0.0001,
      unitName: "pips",
      contractLabel: "100k units / lot",
    };
  }

  if (key.length === 6 && key.startsWith("USD")) {
    return {
      kind: "fx_usd_base",
      contractSize: 100000,
      pipSize: 0.0001,
      unitName: "pips",
      contractLabel: "100k USD / lot",
    };
  }

  if (key.length === 6) {
    return {
      kind: "fx_cross",
      contractSize: 100000,
      pipSize: 0.0001,
      unitName: "pips",
      contractLabel: "100k units / lot",
    };
  }

  // Fallback for custom CFDs / stocks / commodities
  return {
    kind: "index_or_crypto",
    contractSize: 1,
    pipSize: 1,
    unitName: "pts",
    contractLabel: "1 unit / lot",
  };
}

function calcUsdDelta(
  spec: InstrumentSpec,
  entryPrice: number,
  targetPrice: number,
  lotSize: number,
  tradeType: TradeType
): number {
  const signedDiff =
    tradeType === "buy" ? targetPrice - entryPrice : entryPrice - targetPrice;

  switch (spec.kind) {
    case "gold":
    case "silver":
    case "fx_usd_quote":
    case "index_or_crypto":
      return signedDiff * spec.contractSize * lotSize;

    case "fx_usd_base":
    case "fx_usd_jpy": {
      const refPrice = targetPrice > 0 ? targetPrice : entryPrice;
      return refPrice > 0
        ? (signedDiff / refPrice) * spec.contractSize * lotSize
        : 0;
    }

    case "fx_cross_jpy":
      // Standard JPY cross conversion (~150 USD/JPY reference)
      return (signedDiff / 150) * spec.contractSize * lotSize;

    case "fx_cross":
      // Standard FX cross approximation (~$10/pip per 1.00 lot)
      return signedDiff * spec.contractSize * lotSize;
  }
}

function calcNotionalUsd(
  spec: InstrumentSpec,
  openingPrice: number,
  lotSize: number
): number {
  switch (spec.kind) {
    case "fx_usd_base":
    case "fx_usd_jpy":
      return spec.contractSize * lotSize;
    case "fx_cross_jpy":
    case "fx_cross":
      return spec.contractSize * lotSize;
    default:
      return openingPrice * spec.contractSize * lotSize;
  }
}

function formatMoveDistance(
  spec: InstrumentSpec,
  priceDiff: number,
  withSign = false
): string {
  if (spec.kind === "gold") {
    // Show Gold move in $ points (e.g. +$11.50 / 115 pips)
    const sign = withSign && priceDiff > 0 ? "+" : "";
    return `${sign}${priceDiff.toFixed(2)} pts`;
  }

  const units = priceDiff / spec.pipSize;
  const sign = withSign && units > 0 ? "+" : "";
  return `${sign}${units.toFixed(1)} ${spec.unitName}`;
}

export function computeTradeMetrics(entry: {
  symbol: string;
  tradeType: TradeType;
  lotSize: number;
  openingPrice: number;
  closingPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  leverage: number;
}): ComputedTradeMetrics {
  const spec = getInstrumentSpec(entry.symbol);
  const safeLots = Number.isFinite(entry.lotSize) && entry.lotSize > 0 ? entry.lotSize : 0;
  const safeOpen =
    Number.isFinite(entry.openingPrice) && entry.openingPrice > 0
      ? entry.openingPrice
      : 0;
  const safeLev =
    Number.isFinite(entry.leverage) && entry.leverage >= 1 ? entry.leverage : 500;

  const notionalUsd = calcNotionalUsd(spec, safeOpen, safeLots);
  const usedMarginUsd = safeLev > 0 ? notionalUsd / safeLev : 0;

  let plannedRiskUsd: number | null = null;
  let slMoveLabel: string | null = null;
  if (entry.stopLoss !== null && entry.stopLoss > 0 && safeOpen > 0 && safeLots > 0) {
    const pnlAtSl = calcUsdDelta(
      spec,
      safeOpen,
      entry.stopLoss,
      safeLots,
      entry.tradeType
    );
    // Risk is positive when SL is on the loss side; negative if SL is trailed into profit
    plannedRiskUsd = -pnlAtSl;
    slMoveLabel = formatMoveDistance(spec, Math.abs(safeOpen - entry.stopLoss));
  }

  let plannedRewardUsd: number | null = null;
  let tpMoveLabel: string | null = null;
  if (entry.takeProfit !== null && entry.takeProfit > 0 && safeOpen > 0 && safeLots > 0) {
    const pnlAtTp = calcUsdDelta(
      spec,
      safeOpen,
      entry.takeProfit,
      safeLots,
      entry.tradeType
    );
    plannedRewardUsd = pnlAtTp;
    tpMoveLabel = formatMoveDistance(spec, Math.abs(entry.takeProfit - safeOpen));
  }

  let plannedRR: number | null = null;
  if (
    plannedRiskUsd !== null &&
    plannedRiskUsd > 0 &&
    plannedRewardUsd !== null &&
    plannedRewardUsd > 0
  ) {
    plannedRR = plannedRewardUsd / plannedRiskUsd;
  }

  let realizedPnlUsd: number | null = null;
  let realizedMoveLabel: string | null = null;
  let outcome: TradeOutcome = "open";

  if (entry.closingPrice !== null && entry.closingPrice > 0 && safeOpen > 0 && safeLots > 0) {
    realizedPnlUsd = calcUsdDelta(
      spec,
      safeOpen,
      entry.closingPrice,
      safeLots,
      entry.tradeType
    );
    const signedPriceMove =
      entry.tradeType === "buy"
        ? entry.closingPrice - safeOpen
        : safeOpen - entry.closingPrice;
    realizedMoveLabel = formatMoveDistance(spec, signedPriceMove, true);

    if (Math.abs(realizedPnlUsd) < 0.005) {
      outcome = "breakeven";
    } else if (realizedPnlUsd > 0) {
      outcome = "win";
    } else {
      outcome = "loss";
    }
  }

  return {
    contractLabel: spec.contractLabel,
    notionalUsd,
    usedMarginUsd,
    plannedRiskUsd,
    plannedRewardUsd,
    plannedRR,
    slMoveLabel,
    tpMoveLabel,
    realizedPnlUsd,
    realizedMoveLabel,
    outcome,
  };
}

export function formatPrice(price: number | null, symbol: string): string {
  if (price === null || !Number.isFinite(price)) return "—";
  const key = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (key === "XAUUSD" || key === "US30" || key === "NAS100" || key.endsWith("JPY")) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  }
  if (key.length === 6) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 5,
    });
  }
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

export function formatUsd(amount: number, showPlus = false): string {
  const absFormatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (amount < -0.004) return `-$${absFormatted}`;
  if (showPlus && amount > 0.004) return `+$${absFormatted}`;
  return `$${absFormatted}`;
}

// ============================================================================
// IndexedDB Preview & Offline Fallback Store
// ============================================================================

const JOURNAL_IDB_NAME = "moneyprinter_journal_v1";
const JOURNAL_IDB_STORE = "entries";

function openJournalIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(JOURNAL_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(JOURNAL_IDB_STORE)) {
        const store = db.createObjectStore(JOURNAL_IDB_STORE, { keyPath: "id" });
        store.createIndex("by_traded_at", "tradedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function listLocalEntries(): Promise<JournalEntry[]> {
  if (typeof window === "undefined" || !window.indexedDB) return [];
  const db = await openJournalIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JOURNAL_IDB_STORE, "readonly");
    const store = tx.objectStore(JOURNAL_IDB_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = ((req.result as JournalEntry[]) || []).sort((a, b) =>
        b.tradedAt.localeCompare(a.tradedAt)
      );
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveLocalEntry(entry: JournalEntry): Promise<JournalEntry> {
  const db = await openJournalIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(JOURNAL_IDB_STORE, "readwrite");
    const store = tx.objectStore(JOURNAL_IDB_STORE);
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  return entry;
}

async function removeLocalEntry(id: string): Promise<void> {
  const db = await openJournalIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(JOURNAL_IDB_STORE, "readwrite");
    const store = tx.objectStore(JOURNAL_IDB_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============================================================================
// Unified Journal CRUD API (Supabase + Local Preview Fallback)
// ============================================================================

interface SupabaseJournalRow {
  id: string;
  user_id: string;
  symbol: string;
  trade_type: TradeType;
  lot_size: number | string;
  opening_price: number | string;
  closing_price: number | string | null;
  stop_loss: number | string | null;
  take_profit: number | string | null;
  leverage: number | string;
  traded_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToEntry(row: SupabaseJournalRow): JournalEntry {
  return {
    id: row.id,
    symbol: row.symbol,
    tradeType: row.trade_type,
    lotSize: Number(row.lot_size),
    openingPrice: Number(row.opening_price),
    closingPrice: row.closing_price !== null ? Number(row.closing_price) : null,
    stopLoss: row.stop_loss !== null ? Number(row.stop_loss) : null,
    takeProfit: row.take_profit !== null ? Number(row.take_profit) : null,
    leverage: Number(row.leverage),
    tradedAt: row.traded_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isLocalPreview: false,
  };
}

export async function fetchJournalEntries(): Promise<{
  entries: JournalEntry[];
  migrationHint?: string;
}> {
  if (!isSupabaseConfigured()) {
    const entries = await listLocalEntries();
    return { entries };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const entries = await listLocalEntries();
    return { entries };
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("traded_at", { ascending: false });

  if (error) {
    if (error.code === "42P01" || error.message?.includes("journal_entries")) {
      const fallbackEntries = await listLocalEntries();
      return {
        entries: fallbackEntries,
        migrationHint:
          "Run supabase/migrations/20261030000002_trading_journal.sql in your Supabase SQL Editor to sync journal entries to the cloud (using local browser storage until applied).",
      };
    }
    throw new Error(error.message);
  }

  return {
    entries: ((data as SupabaseJournalRow[]) || []).map(mapRowToEntry),
  };
}

export async function createJournalEntry(
  input: JournalEntryInput
): Promise<JournalEntry> {
  const normalizedSymbol = normalizeSymbol(input.symbol);
  if (!normalizedSymbol) {
    throw new Error("Please enter a currency pair or symbol (e.g. XAU/USD).");
  }
  if (!Number.isFinite(input.lotSize) || input.lotSize <= 0) {
    throw new Error("Volume / lot size must be greater than 0.");
  }
  if (!Number.isFinite(input.openingPrice) || input.openingPrice <= 0) {
    throw new Error("Opening price must be greater than 0.");
  }
  if (
    input.closingPrice !== null &&
    (!Number.isFinite(input.closingPrice) || input.closingPrice <= 0)
  ) {
    throw new Error("Closing price must be greater than 0 (or leave blank if open).");
  }
  if (!Number.isFinite(input.leverage) || input.leverage < 1) {
    throw new Error("Leverage must be at least 1:1.");
  }

  const nowIso = new Date().toISOString();

  const buildLocalRecord = (): JournalEntry => ({
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    symbol: normalizedSymbol,
    tradeType: input.tradeType,
    lotSize: input.lotSize,
    openingPrice: input.openingPrice,
    closingPrice: input.closingPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    leverage: Math.round(input.leverage),
    tradedAt: input.tradedAt || nowIso,
    notes: input.notes?.trim() || null,
    createdAt: nowIso,
    updatedAt: nowIso,
    isLocalPreview: true,
  });

  if (!isSupabaseConfigured()) {
    return saveLocalEntry(buildLocalRecord());
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return saveLocalEntry(buildLocalRecord());
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      symbol: normalizedSymbol,
      trade_type: input.tradeType,
      lot_size: input.lotSize,
      opening_price: input.openingPrice,
      closing_price: input.closingPrice,
      stop_loss: input.stopLoss,
      take_profit: input.takeProfit,
      leverage: Math.round(input.leverage),
      traded_at: input.tradedAt || nowIso,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01" || error.message?.includes("journal_entries")) {
      return saveLocalEntry(buildLocalRecord());
    }
    throw new Error(error.message);
  }

  return mapRowToEntry(data as SupabaseJournalRow);
}

export async function updateJournalEntry(
  id: string,
  input: JournalEntryInput,
  isLocalPreview?: boolean
): Promise<JournalEntry> {
  const normalizedSymbol = normalizeSymbol(input.symbol);
  if (!normalizedSymbol) {
    throw new Error("Please enter a currency pair or symbol.");
  }
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured() || isLocalPreview) {
    const existing = await listLocalEntries();
    const prev = existing.find((e) => e.id === id);
    const updated: JournalEntry = {
      id,
      symbol: normalizedSymbol,
      tradeType: input.tradeType,
      lotSize: input.lotSize,
      openingPrice: input.openingPrice,
      closingPrice: input.closingPrice,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      leverage: Math.round(input.leverage),
      tradedAt: input.tradedAt || nowIso,
      notes: input.notes?.trim() || null,
      createdAt: prev?.createdAt || nowIso,
      updatedAt: nowIso,
      isLocalPreview: true,
    };
    return saveLocalEntry(updated);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .update({
      symbol: normalizedSymbol,
      trade_type: input.tradeType,
      lot_size: input.lotSize,
      opening_price: input.openingPrice,
      closing_price: input.closingPrice,
      stop_loss: input.stopLoss,
      take_profit: input.takeProfit,
      leverage: Math.round(input.leverage),
      traded_at: input.tradedAt || nowIso,
      notes: input.notes?.trim() || null,
      updated_at: nowIso,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToEntry(data as SupabaseJournalRow);
}

export async function deleteJournalEntry(
  entry: Pick<JournalEntry, "id" | "isLocalPreview">
): Promise<void> {
  if (!isSupabaseConfigured() || entry.isLocalPreview) {
    await removeLocalEntry(entry.id);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", entry.id);

  if (error) {
    throw new Error(error.message);
  }
}
