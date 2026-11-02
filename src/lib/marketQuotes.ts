/**
 * Server-side Global Market Quote Resolver for MoneyPrinter Price Alerts.
 *
 * Resolution Chain:
 *  1. Twelve Data REST Batch API (`TWELVE_DATA_API_KEY` if configured — 800 free calls/day)
 *  2. Zero-key live institutional fallbacks (so quotes work immediately out-of-the-box
 *     and gracefully cover indices/metals restricted on free tiers):
 *       - Swissquote Public Institutional BBO Spot Feed (XAU/USD, XAG/USD, major & cross FX)
 *       - Coinbase Spot API (BTC/USD, ETH/USD, SOL/USD, etc. — US/global cloud friendly)
 *       - Yahoo Finance Live Chart Meta (US30 -> ^DJI, NAS100 -> ^NDX, SPX500 -> ^GSPC, Stocks, FX)
 */

import { getServerEnvVar } from "@/lib/serverEnv";

export interface LiveQuoteResult {
  symbol: string;
  normalizedSymbol: string;
  price: number;
  source: "twelvedata" | "swissquote" | "coinbase" | "yahoo";
  fetchedAt: string;
}

export function isTwelveDataConfigured(): boolean {
  return Boolean(getServerEnvVar("TWELVE_DATA_API_KEY"));
}

/**
 * Canonicalizes trader input like "xauusd", "XAU/USD", "us30", "EURUSD", "BTCUSDT"
 * into standard display/lookup format (e.g. "XAU/USD", "EUR/USD", "US30", "BTC/USD").
 */
export function normalizeMarketSymbol(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return "";

  const aliases: Record<string, string> = {
    XAUUSD: "XAU/USD",
    GOLD: "XAU/USD",
    XAGUSD: "XAG/USD",
    SILVER: "XAG/USD",
    EURUSD: "EUR/USD",
    GBPUSD: "GBP/USD",
    USDJPY: "USD/JPY",
    USDCAD: "USD/CAD",
    AUDUSD: "AUD/USD",
    NZDUSD: "NZD/USD",
    USDCHF: "USD/CHF",
    EURJPY: "EUR/JPY",
    GBPJPY: "GBP/JPY",
    EURGBP: "EUR/GBP",
    BTCUSD: "BTC/USD",
    BTCUSDT: "BTC/USD",
    ETHUSD: "ETH/USD",
    ETHUSDT: "ETH/USD",
    SOLUSD: "SOL/USD",
    SOLUSDT: "SOL/USD",
    DJI: "US30",
    DOW: "US30",
    DJ30: "US30",
    USTEC: "NAS100",
    NDX: "NAS100",
    US100: "NAS100",
    SPX: "SPX500",
    US500: "SPX500",
    WTI: "USOIL",
    WTIUSD: "USOIL",
  };

  if (aliases[cleaned]) {
    return aliases[cleaned];
  }

  // Standard 6-letter FX/Metal/Crypto pair without slash (e.g. CADJPY -> CAD/JPY)
  if (/^[A-Z]{6}$/.test(cleaned)) {
    const knownQuotes = ["USD", "JPY", "GBP", "CAD", "CHF", "AUD", "NZD", "EUR"];
    const quote = cleaned.slice(3, 6);
    if (knownQuotes.includes(quote)) {
      return `${cleaned.slice(0, 3)}/${quote}`;
    }
  }

  return cleaned;
}

const SWISSQUOTE_PAIRS = new Set([
  "XAU/USD",
  "XAG/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CAD",
  "AUD/USD",
  "NZD/USD",
  "USD/CHF",
  "EUR/JPY",
  "GBP/JPY",
  "EUR/GBP",
  "AUD/JPY",
  "CAD/JPY",
]);

const CRYPTO_BASES = new Set([
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "BNB",
  "ADA",
  "DOGE",
  "AVAX",
  "LINK",
]);

const YAHOO_SYMBOL_MAP: Record<string, string> = {
  US30: "^DJI",
  NAS100: "^NDX",
  SPX500: "^GSPC",
  DXY: "DX-Y.NYB",
  USOIL: "CL=F",
  UKOIL: "BZ=F",
  "XAU/USD": "GC=F",
  "XAG/USD": "SI=F",
  "BTC/USD": "BTC-USD",
  "ETH/USD": "ETH-USD",
  "SOL/USD": "SOL-USD",
};

const TWELVE_DATA_SYMBOL_MAP: Record<string, string> = {
  US30: "DJI",
  NAS100: "NDX",
  SPX500: "SPX",
  USOIL: "WTI/USD",
};

async function fetchWithTimeout(
  url: string,
  timeoutMs = 6500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 MoneyPrinterAlertEngine/1.0",
        Accept: "application/json",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTwelveDataBatch(
  normalizedSymbols: string[],
  apiKey: string
): Promise<Map<string, LiveQuoteResult>> {
  const results = new Map<string, LiveQuoteResult>();
  if (normalizedSymbols.length === 0) return results;

  const tdToNormalized = new Map<string, string[]>();
  const tdSymbols: string[] = [];

  for (const norm of normalizedSymbols) {
    const tdSym = TWELVE_DATA_SYMBOL_MAP[norm] ?? norm;
    const list = tdToNormalized.get(tdSym) ?? [];
    list.push(norm);
    tdToNormalized.set(tdSym, list);
    if (!tdSymbols.includes(tdSym)) {
      tdSymbols.push(tdSym);
    }
  }

  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
      tdSymbols.join(",")
    )}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, 7000);
    if (!res.ok) return results;

    const json = await res.json();
    const nowIso = new Date().toISOString();

    if (tdSymbols.length === 1) {
      const priceNum = Number(json?.price);
      if (Number.isFinite(priceNum) && priceNum > 0) {
        for (const norm of tdToNormalized.get(tdSymbols[0]) ?? []) {
          results.set(norm, {
            symbol: norm,
            normalizedSymbol: norm,
            price: priceNum,
            source: "twelvedata",
            fetchedAt: nowIso,
          });
        }
      }
    } else if (json && typeof json === "object") {
      for (const tdSym of tdSymbols) {
        const entry = json[tdSym];
        const priceNum = Number(entry?.price);
        if (Number.isFinite(priceNum) && priceNum > 0) {
          for (const norm of tdToNormalized.get(tdSym) ?? []) {
            results.set(norm, {
              symbol: norm,
              normalizedSymbol: norm,
              price: priceNum,
              source: "twelvedata",
              fetchedAt: nowIso,
            });
          }
        }
      }
    }
  } catch {
    // Fall back to Swissquote / Coinbase / Yahoo seamlessly
  }

  return results;
}

async function fetchSwissquoteSpot(
  normalizedSymbol: string
): Promise<LiveQuoteResult | null> {
  if (!normalizedSymbol.includes("/")) return null;
  const [base, quote] = normalizedSymbol.split("/");
  if (!base || !quote) return null;

  try {
    const url = `https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/${encodeURIComponent(
      base
    )}/${encodeURIComponent(quote)}`;
    const res = await fetchWithTimeout(url, 5500);
    if (!res.ok) return null;

    const json = await res.json();
    const quotes = Array.isArray(json) ? json : [];
    for (const venue of quotes) {
      const profile = venue?.spreadProfilePrices?.[0];
      const bid = Number(profile?.bid);
      const ask = Number(profile?.ask);
      if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0) {
        const mid = Number(((bid + ask) / 2).toFixed(base === "XAU" ? 2 : 5));
        return {
          symbol: normalizedSymbol,
          normalizedSymbol,
          price: mid,
          source: "swissquote",
          fetchedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchCoinbaseSpot(
  normalizedSymbol: string
): Promise<LiveQuoteResult | null> {
  if (!normalizedSymbol.includes("/")) return null;
  const [base, quote] = normalizedSymbol.split("/");
  if (!CRYPTO_BASES.has(base)) return null;

  try {
    const pair = `${base}-${quote === "USDT" ? "USD" : quote}`;
    const url = `https://api.coinbase.com/v2/prices/${encodeURIComponent(
      pair
    )}/spot`;
    const res = await fetchWithTimeout(url, 5500);
    if (!res.ok) return null;

    const json = await res.json();
    const amount = Number(json?.data?.amount);
    if (Number.isFinite(amount) && amount > 0) {
      return {
        symbol: normalizedSymbol,
        normalizedSymbol,
        price: amount,
        source: "coinbase",
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchYahooQuote(
  normalizedSymbol: string
): Promise<LiveQuoteResult | null> {
  let yahooTicker = YAHOO_SYMBOL_MAP[normalizedSymbol];
  if (!yahooTicker) {
    if (/^[A-Z]{3}\/[A-Z]{3}$/.test(normalizedSymbol)) {
      yahooTicker = `${normalizedSymbol.replace("/", "")}=X`;
    } else {
      yahooTicker = normalizedSymbol.replace("/", "-");
    }
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooTicker
    )}?interval=1m&range=1d`;
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return null;

    const json = await res.json();
    const price = Number(json?.chart?.result?.[0]?.meta?.regularMarketPrice);
    if (Number.isFinite(price) && price > 0) {
      return {
        symbol: normalizedSymbol,
        normalizedSymbol,
        price,
        source: "yahoo",
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchSingleFallbackQuote(
  normalizedSymbol: string
): Promise<LiveQuoteResult | null> {
  // 1. Spot Forex & Precious Metals (XAU/USD, EUR/USD, GBP/USD, etc.)
  if (SWISSQUOTE_PAIRS.has(normalizedSymbol)) {
    const sq = await fetchSwissquoteSpot(normalizedSymbol);
    if (sq) return sq;
  }

  // 2. Spot Crypto (BTC/USD, ETH/USD, SOL/USD)
  if (normalizedSymbol.includes("/")) {
    const [base] = normalizedSymbol.split("/");
    if (CRYPTO_BASES.has(base)) {
      const cb = await fetchCoinbaseSpot(normalizedSymbol);
      if (cb) return cb;
    }
  }

  // 3. Try Swissquote for any custom 3/3 FX pair before Yahoo
  if (/^[A-Z]{3}\/[A-Z]{3}$/.test(normalizedSymbol)) {
    const sqCustom = await fetchSwissquoteSpot(normalizedSymbol);
    if (sqCustom) return sqCustom;
  }

  // 4. Yahoo Finance for Indices (US30, NAS100, SPX500), Oil, Equities & fallback
  return await fetchYahooQuote(normalizedSymbol);
}

/**
 * Fetches live market quotes for a list of raw symbol strings.
 * Returns a Record keyed by the normalized symbol (e.g. "XAU/USD").
 */
export async function fetchLiveMarketQuotes(
  rawSymbols: string[]
): Promise<Record<string, LiveQuoteResult>> {
  const uniqueNormalized = Array.from(
    new Set(rawSymbols.map(normalizeMarketSymbol).filter(Boolean))
  );

  const resolved: Record<string, LiveQuoteResult> = {};
  if (uniqueNormalized.length === 0) return resolved;

  const apiKey = getServerEnvVar("TWELVE_DATA_API_KEY");
  if (apiKey) {
    const tdMap = await fetchTwelveDataBatch(uniqueNormalized, apiKey);
    tdMap.forEach((val, key) => {
      resolved[key] = val;
    });
  }

  const remaining = uniqueNormalized.filter((sym) => !resolved[sym]);
  if (remaining.length > 0) {
    const fallbackResults = await Promise.all(
      remaining.map((sym) => fetchSingleFallbackQuote(sym))
    );
    for (const item of fallbackResults) {
      if (item) {
        resolved[item.normalizedSymbol] = item;
      }
    }
  }

  return resolved;
}
