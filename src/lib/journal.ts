import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AccountType = "real" | "demo";
export type TradeType = "buy" | "sell";
export type TradeOutcome = "open" | "win" | "loss" | "breakeven";
export type CashflowType = "deposit" | "withdrawal";

export const JOURNAL_SCREENSHOTS_BUCKET = "journal-screenshots";
export const MAX_SCREENSHOT_SIZE_MB = 10;
export const MAX_SCREENSHOT_SIZE_BYTES = MAX_SCREENSHOT_SIZE_MB * 1024 * 1024; // 10,485,760 bytes

const ALLOWED_SCREENSHOT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export interface JournalEntry {
  id: string;
  accountType: AccountType;
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
  accountType: AccountType;
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

export interface CashflowTransaction {
  id: string;
  accountType: AccountType;
  txType: CashflowType;
  amount: number;
  note: string | null;
  transactedAt: string;
  createdAt: string;
  isLocalPreview?: boolean;
}

export interface CashflowTransactionInput {
  accountType: AccountType;
  txType: CashflowType;
  amount: number;
  note?: string | null;
  transactedAt: string;
}

export interface JournalScreenshot {
  id: string;
  journalEntryId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  url: string;
  caption?: string | null;
  createdAt: string;
  isLocalPreview?: boolean;
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

export interface AccountBalanceSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  netFloat: number;
  realizedPnl: number;
  currentBalance: number;
  returnOnFloatPct: number | null;
  openUsedMargin: number;
  freeMargin: number;
  depositCount: number;
  withdrawalCount: number;
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateJournalScreenshot(file: File): string | null {
  if (!file || file.size <= 0) {
    return `"${file?.name || "File"}" is empty.`;
  }
  if (file.size > MAX_SCREENSHOT_SIZE_BYTES) {
    return `"${file.name}" (${formatBytes(
      file.size
    )}) exceeds the maximum 10 MB limit.`;
  }
  if (!ALLOWED_SCREENSHOT_MIME_TYPES.has(file.type)) {
    return `"${file.name}" has an unsupported format (${
      file.type || "unknown"
    }). Please upload PNG, JPG, WEBP, GIF, or SVG.`;
  }
  return null;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
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
      contractSize: 100,
      pipSize: 0.1,
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
      contractSize: 1,
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
      return (signedDiff / 150) * spec.contractSize * lotSize;

    case "fx_cross":
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
  const safeLots =
    Number.isFinite(entry.lotSize) && entry.lotSize > 0 ? entry.lotSize : 0;
  const safeOpen =
    Number.isFinite(entry.openingPrice) && entry.openingPrice > 0
      ? entry.openingPrice
      : 0;
  const safeLev =
    Number.isFinite(entry.leverage) && entry.leverage >= 1
      ? entry.leverage
      : 500;

  const notionalUsd = calcNotionalUsd(spec, safeOpen, safeLots);
  const usedMarginUsd = safeLev > 0 ? notionalUsd / safeLev : 0;

  let plannedRiskUsd: number | null = null;
  let slMoveLabel: string | null = null;
  if (
    entry.stopLoss !== null &&
    entry.stopLoss > 0 &&
    safeOpen > 0 &&
    safeLots > 0
  ) {
    const pnlAtSl = calcUsdDelta(
      spec,
      safeOpen,
      entry.stopLoss,
      safeLots,
      entry.tradeType
    );
    plannedRiskUsd = -pnlAtSl;
    slMoveLabel = formatMoveDistance(spec, Math.abs(safeOpen - entry.stopLoss));
  }

  let plannedRewardUsd: number | null = null;
  let tpMoveLabel: string | null = null;
  if (
    entry.takeProfit !== null &&
    entry.takeProfit > 0 &&
    safeOpen > 0 &&
    safeLots > 0
  ) {
    const pnlAtTp = calcUsdDelta(
      spec,
      safeOpen,
      entry.takeProfit,
      safeLots,
      entry.tradeType
    );
    plannedRewardUsd = pnlAtTp;
    tpMoveLabel = formatMoveDistance(
      spec,
      Math.abs(entry.takeProfit - safeOpen)
    );
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

  if (
    entry.closingPrice !== null &&
    entry.closingPrice > 0 &&
    safeOpen > 0 &&
    safeLots > 0
  ) {
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

export function computeAccountBalanceSummary(
  entries: JournalEntry[],
  transactions: CashflowTransaction[],
  scope: AccountType
): AccountBalanceSummary {
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let depositCount = 0;
  let withdrawalCount = 0;

  for (const tx of transactions) {
    if (tx.accountType !== scope) continue;
    if (tx.txType === "deposit") {
      totalDeposits += tx.amount;
      depositCount++;
    } else {
      totalWithdrawals += tx.amount;
      withdrawalCount++;
    }
  }

  let realizedPnl = 0;
  let openUsedMargin = 0;

  for (const entry of entries) {
    if (entry.accountType !== scope) continue;
    const m = computeTradeMetrics(entry);
    if (m.outcome === "open") {
      openUsedMargin += m.usedMarginUsd;
    } else if (m.realizedPnlUsd !== null) {
      realizedPnl += m.realizedPnlUsd;
    }
  }

  const netFloat = totalDeposits - totalWithdrawals;
  const currentBalance = netFloat + realizedPnl;
  const returnOnFloatPct =
    totalDeposits > 0 ? (realizedPnl / totalDeposits) * 100 : null;
  const freeMargin = currentBalance - openUsedMargin;

  return {
    totalDeposits,
    totalWithdrawals,
    netFloat,
    realizedPnl,
    currentBalance,
    returnOnFloatPct,
    openUsedMargin,
    freeMargin,
    depositCount,
    withdrawalCount,
  };
}

export function formatPrice(price: number | null, symbol: string): string {
  if (price === null || !Number.isFinite(price)) return "—";
  const key = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (
    key === "XAUUSD" ||
    key === "US30" ||
    key === "NAS100" ||
    key.endsWith("JPY")
  ) {
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
// IndexedDB Preview & Offline Fallback Store (v2: entries + transactions + screenshots)
// ============================================================================

const JOURNAL_IDB_NAME = "moneyprinter_journal_v1";
const JOURNAL_IDB_VERSION = 2;
const STORE_ENTRIES = "entries";
const STORE_TRANSACTIONS = "transactions";
const STORE_SCREENSHOTS = "screenshots";

interface LocalStoredScreenshot {
  id: string;
  journalEntryId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  caption?: string | null;
  createdAt: string;
  blob: Blob;
}

function openJournalIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(JOURNAL_IDB_NAME, JOURNAL_IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const entryStore = db.createObjectStore(STORE_ENTRIES, {
          keyPath: "id",
        });
        entryStore.createIndex("by_traded_at", "tradedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        const txStore = db.createObjectStore(STORE_TRANSACTIONS, {
          keyPath: "id",
        });
        txStore.createIndex("by_transacted_at", "transactedAt", {
          unique: false,
        });
      }
      if (!db.objectStoreNames.contains(STORE_SCREENSHOTS)) {
        const shotStore = db.createObjectStore(STORE_SCREENSHOTS, {
          keyPath: "id",
        });
        shotStore.createIndex("by_entry", "journalEntryId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function makeUuid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// --- Local Entries ---
async function listLocalEntries(): Promise<JournalEntry[]> {
  if (typeof window === "undefined" || !window.indexedDB) return [];
  const db = await openJournalIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, "readonly");
    const store = tx.objectStore(STORE_ENTRIES);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = ((req.result as Partial<JournalEntry>[]) || [])
        .map(
          (r): JournalEntry => ({
            id: r.id || makeUuid(),
            accountType: r.accountType === "demo" ? "demo" : "real",
            symbol: r.symbol || "XAU/USD",
            tradeType: r.tradeType === "sell" ? "sell" : "buy",
            lotSize: Number(r.lotSize) || 0.01,
            openingPrice: Number(r.openingPrice) || 0,
            closingPrice:
              r.closingPrice !== undefined && r.closingPrice !== null
                ? Number(r.closingPrice)
                : null,
            stopLoss:
              r.stopLoss !== undefined && r.stopLoss !== null
                ? Number(r.stopLoss)
                : null,
            takeProfit:
              r.takeProfit !== undefined && r.takeProfit !== null
                ? Number(r.takeProfit)
                : null,
            leverage: Number(r.leverage) || 500,
            tradedAt: r.tradedAt || new Date().toISOString(),
            notes: r.notes ?? null,
            createdAt: r.createdAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
            isLocalPreview: true,
          })
        )
        .sort((a, b) => b.tradedAt.localeCompare(a.tradedAt));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveLocalEntry(entry: JournalEntry): Promise<JournalEntry> {
  const db = await openJournalIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    const store = tx.objectStore(STORE_ENTRIES);
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  return entry;
}

async function removeLocalEntry(id: string): Promise<void> {
  const db = await openJournalIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_ENTRIES, STORE_SCREENSHOTS], "readwrite");
    tx.objectStore(STORE_ENTRIES).delete(id);
    // Clean up local screenshots linked to this trade
    const shotStore = tx.objectStore(STORE_SCREENSHOTS);
    const idx = shotStore.index("by_entry");
    const cursorReq = idx.openCursor(IDBKeyRange.only(id));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Local Cashflow Transactions ---
async function listLocalTransactions(): Promise<CashflowTransaction[]> {
  if (typeof window === "undefined" || !window.indexedDB) return [];
  const db = await openJournalIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, "readonly");
    const store = tx.objectStore(STORE_TRANSACTIONS);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = ((req.result as CashflowTransaction[]) || []).sort((a, b) =>
        b.transactedAt.localeCompare(a.transactedAt)
      );
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveLocalTransaction(
  item: CashflowTransaction
): Promise<CashflowTransaction> {
  const db = await openJournalIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, "readwrite");
    const store = tx.objectStore(STORE_TRANSACTIONS);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  return item;
}

async function removeLocalTransaction(id: string): Promise<void> {
  const db = await openJournalIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTIONS, "readwrite");
    const store = tx.objectStore(STORE_TRANSACTIONS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// --- Local Screenshots ---
async function listLocalScreenshots(): Promise<
  Record<string, JournalScreenshot[]>
> {
  if (typeof window === "undefined" || !window.indexedDB) return {};
  const db = await openJournalIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCREENSHOTS, "readonly");
    const store = tx.objectStore(STORE_SCREENSHOTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = ((req.result as LocalStoredScreenshot[]) || []).sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt)
      );
      const byEntry: Record<string, JournalScreenshot[]> = {};
      for (const row of rows) {
        const item: JournalScreenshot = {
          id: row.id,
          journalEntryId: row.journalEntryId,
          fileName: row.fileName,
          mimeType: row.mimeType,
          fileSizeBytes: row.fileSizeBytes,
          storagePath: row.storagePath,
          url: URL.createObjectURL(row.blob),
          caption: row.caption ?? null,
          createdAt: row.createdAt,
          isLocalPreview: true,
        };
        if (!byEntry[row.journalEntryId]) byEntry[row.journalEntryId] = [];
        byEntry[row.journalEntryId].push(item);
      }
      resolve(byEntry);
    };
    req.onerror = () => reject(req.error);
  });
}

async function uploadLocalScreenshot(
  journalEntryId: string,
  file: File,
  caption?: string
): Promise<JournalScreenshot> {
  const db = await openJournalIdb();
  const id = makeUuid();
  const createdAt = new Date().toISOString();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `preview-user/${journalEntryId}/${Date.now()}-${safeName}`;

  const record: LocalStoredScreenshot = {
    id,
    journalEntryId,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
    storagePath,
    caption: caption?.trim() || null,
    createdAt,
    blob: file,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SCREENSHOTS, "readwrite");
    const store = tx.objectStore(STORE_SCREENSHOTS);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  return {
    id,
    journalEntryId,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
    storagePath,
    url: URL.createObjectURL(file),
    caption: caption?.trim() || null,
    createdAt,
    isLocalPreview: true,
  };
}

async function removeLocalScreenshot(id: string): Promise<void> {
  const db = await openJournalIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SCREENSHOTS, "readwrite");
    const store = tx.objectStore(STORE_SCREENSHOTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============================================================================
// Unified Journal Entries CRUD API (Supabase + Local Preview Fallback)
// ============================================================================

interface SupabaseJournalRow {
  id: string;
  user_id: string;
  account_type?: string;
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
    accountType: row.account_type === "demo" ? "demo" : "real",
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
          "Run supabase/migrations/20261030000002_trading_journal.sql and 20261030000003_journal_cashflow_and_screenshots.sql in your Supabase SQL Editor to sync journal trades, deposits/withdrawals, and screenshots to the cloud.",
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
    throw new Error(
      "Closing price must be greater than 0 (or leave blank if open)."
    );
  }
  if (!Number.isFinite(input.leverage) || input.leverage < 1) {
    throw new Error("Leverage must be at least 1:1.");
  }

  const nowIso = new Date().toISOString();

  const buildLocalRecord = (): JournalEntry => ({
    id: makeUuid(),
    accountType: input.accountType,
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
      account_type: input.accountType,
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
    if (
      error.code === "42P01" ||
      error.code === "42703" ||
      error.message?.includes("journal_entries") ||
      error.message?.includes("account_type")
    ) {
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
      accountType: input.accountType,
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
      account_type: input.accountType,
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
  entry: Pick<JournalEntry, "id" | "isLocalPreview">,
  associatedScreenshots: JournalScreenshot[] = []
): Promise<void> {
  if (!isSupabaseConfigured() || entry.isLocalPreview) {
    for (const shot of associatedScreenshots) {
      if (shot.url.startsWith("blob:")) {
        URL.revokeObjectURL(shot.url);
      }
    }
    await removeLocalEntry(entry.id);
    return;
  }

  const supabase = createClient();

  const remotePaths = associatedScreenshots
    .filter((s) => !s.isLocalPreview && s.storagePath)
    .map((s) => s.storagePath);

  if (remotePaths.length > 0) {
    await supabase.storage.from(JOURNAL_SCREENSHOTS_BUCKET).remove(remotePaths);
  }

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", entry.id);

  if (error) {
    throw new Error(error.message);
  }
}

// ============================================================================
// Unified Cashflow (Deposit / Withdrawal) CRUD API
// ============================================================================

interface SupabaseTxRow {
  id: string;
  user_id: string;
  account_type: AccountType;
  tx_type: CashflowType;
  amount: number | string;
  note: string | null;
  transacted_at: string;
  created_at: string;
}

function mapRowToTx(row: SupabaseTxRow): CashflowTransaction {
  return {
    id: row.id,
    accountType: row.account_type === "demo" ? "demo" : "real",
    txType: row.tx_type === "withdrawal" ? "withdrawal" : "deposit",
    amount: Number(row.amount),
    note: row.note,
    transactedAt: row.transacted_at,
    createdAt: row.created_at,
    isLocalPreview: false,
  };
}

export async function fetchCashflowTransactions(): Promise<{
  transactions: CashflowTransaction[];
  migrationHint?: string;
}> {
  if (!isSupabaseConfigured()) {
    const transactions = await listLocalTransactions();
    return { transactions };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const transactions = await listLocalTransactions();
    return { transactions };
  }

  const { data, error } = await supabase
    .from("journal_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transacted_at", { ascending: false });

  if (error) {
    if (
      error.code === "42P01" ||
      error.message?.includes("journal_transactions")
    ) {
      const transactions = await listLocalTransactions();
      return {
        transactions,
        migrationHint:
          "Run supabase/migrations/20261030000003_journal_cashflow_and_screenshots.sql in your Supabase SQL Editor to enable cloud sync for deposits, withdrawals, and journal screenshots.",
      };
    }
    throw new Error(error.message);
  }

  return {
    transactions: ((data as SupabaseTxRow[]) || []).map(mapRowToTx),
  };
}

export async function createCashflowTransaction(
  input: CashflowTransactionInput
): Promise<CashflowTransaction> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be greater than $0.00.");
  }

  const nowIso = new Date().toISOString();
  const buildLocalTx = (): CashflowTransaction => ({
    id: makeUuid(),
    accountType: input.accountType,
    txType: input.txType,
    amount: Number(input.amount.toFixed(2)),
    note: input.note?.trim() || null,
    transactedAt: input.transactedAt || nowIso,
    createdAt: nowIso,
    isLocalPreview: true,
  });

  if (!isSupabaseConfigured()) {
    return saveLocalTransaction(buildLocalTx());
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return saveLocalTransaction(buildLocalTx());
  }

  const { data, error } = await supabase
    .from("journal_transactions")
    .insert({
      user_id: user.id,
      account_type: input.accountType,
      tx_type: input.txType,
      amount: Number(input.amount.toFixed(2)),
      note: input.note?.trim() || null,
      transacted_at: input.transactedAt || nowIso,
    })
    .select("*")
    .single();

  if (error) {
    if (
      error.code === "42P01" ||
      error.message?.includes("journal_transactions")
    ) {
      return saveLocalTransaction(buildLocalTx());
    }
    throw new Error(error.message);
  }

  return mapRowToTx(data as SupabaseTxRow);
}

export async function deleteCashflowTransaction(
  tx: Pick<CashflowTransaction, "id" | "isLocalPreview">
): Promise<void> {
  if (!isSupabaseConfigured() || tx.isLocalPreview) {
    await removeLocalTransaction(tx.id);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("journal_transactions")
    .delete()
    .eq("id", tx.id);

  if (error) {
    throw new Error(error.message);
  }
}

// ============================================================================
// Unified Journal Study Screenshots API ('journal-screenshots' Bucket + IDB)
// ============================================================================

export async function fetchAllJournalScreenshots(): Promise<{
  byEntry: Record<string, JournalScreenshot[]>;
  migrationHint?: string;
}> {
  if (!isSupabaseConfigured()) {
    const byEntry = await listLocalScreenshots();
    return { byEntry };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const byEntry = await listLocalScreenshots();
    return { byEntry };
  }

  const { data: rows, error } = await supabase
    .from("journal_entry_screenshots")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    if (
      error.code === "42P01" ||
      error.message?.includes("journal_entry_screenshots")
    ) {
      const byEntry = await listLocalScreenshots();
      return {
        byEntry,
        migrationHint:
          "Run supabase/migrations/20261030000003_journal_cashflow_and_screenshots.sql in your Supabase SQL Editor to initialize the 'journal-screenshots' storage bucket.",
      };
    }
    throw new Error(error.message);
  }

  if (!rows || rows.length === 0) {
    // Also merge any local preview screenshots if present
    const localShots = await listLocalScreenshots();
    return { byEntry: localShots };
  }

  const paths = rows.map((r) => r.storage_path as string);
  const { data: signedData } = await supabase.storage
    .from(JOURNAL_SCREENSHOTS_BUCKET)
    .createSignedUrls(paths, 60 * 60 * 6); // 6 hours

  const signedMap = new Map<string, string>();
  signedData?.forEach((entry) => {
    if (entry.path && entry.signedUrl) {
      signedMap.set(entry.path, entry.signedUrl);
    }
  });

  const byEntry: Record<string, JournalScreenshot[]> = {};
  for (const row of rows) {
    const url = signedMap.get(row.storage_path) ?? "";
    if (!url) continue;

    const shot: JournalScreenshot = {
      id: row.id,
      journalEntryId: row.journal_entry_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSizeBytes: Number(row.file_size_bytes),
      storagePath: row.storage_path,
      url,
      caption: row.caption ?? null,
      createdAt: row.created_at,
      isLocalPreview: false,
    };

    if (!byEntry[shot.journalEntryId]) byEntry[shot.journalEntryId] = [];
    byEntry[shot.journalEntryId].push(shot);
  }

  return { byEntry };
}

export async function uploadJournalScreenshot(
  journalEntry: Pick<JournalEntry, "id" | "isLocalPreview">,
  file: File,
  caption?: string
): Promise<JournalScreenshot> {
  const validationError = validateJournalScreenshot(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (!isSupabaseConfigured() || journalEntry.isLocalPreview) {
    return uploadLocalScreenshot(journalEntry.id, file, caption);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return uploadLocalScreenshot(journalEntry.id, file, caption);
  }

  const safeName = sanitizeFileName(file.name);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = `${user.id}/${journalEntry.id}/${uniquePrefix}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(JOURNAL_SCREENSHOTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    if (
      uploadError.message?.toLowerCase().includes("bucket") ||
      uploadError.message?.toLowerCase().includes("not found")
    ) {
      return uploadLocalScreenshot(journalEntry.id, file, caption);
    }
    throw new Error(uploadError.message);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("journal_entry_screenshots")
    .insert({
      user_id: user.id,
      journal_entry_id: journalEntry.id,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      caption: caption?.trim() || null,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    await supabase.storage
      .from(JOURNAL_SCREENSHOTS_BUCKET)
      .remove([storagePath]);
    throw new Error(
      insertError?.message ?? "Failed to save journal screenshot metadata."
    );
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(JOURNAL_SCREENSHOTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 6);

  if (signedError || !signed?.signedUrl) {
    throw new Error(
      signedError?.message ?? "Failed to create signed screenshot URL."
    );
  }

  return {
    id: inserted.id,
    journalEntryId: inserted.journal_entry_id,
    fileName: inserted.file_name,
    mimeType: inserted.mime_type,
    fileSizeBytes: Number(inserted.file_size_bytes),
    storagePath: inserted.storage_path,
    url: signed.signedUrl,
    caption: inserted.caption ?? null,
    createdAt: inserted.created_at,
    isLocalPreview: false,
  };
}

export async function deleteJournalScreenshot(
  screenshot: JournalScreenshot
): Promise<void> {
  if (!isSupabaseConfigured() || screenshot.isLocalPreview) {
    if (screenshot.url.startsWith("blob:")) {
      URL.revokeObjectURL(screenshot.url);
    }
    await removeLocalScreenshot(screenshot.id);
    return;
  }

  const supabase = createClient();

  const { error: storageError } = await supabase.storage
    .from(JOURNAL_SCREENSHOTS_BUCKET)
    .remove([screenshot.storagePath]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error: dbError } = await supabase
    .from("journal_entry_screenshots")
    .delete()
    .eq("id", screenshot.id);

  if (dbError) {
    throw new Error(dbError.message);
  }
}
