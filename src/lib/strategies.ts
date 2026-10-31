export type StrategyFamily = "Pullback Strategy" | "Volume Profile Strategy";

export interface StrategyDefinition {
  id: string;
  family: StrategyFamily;
  label: string;
  shortLabel: string;
  href: string;
  accentHex: string;
}

/**
 * Single source of truth for all strategies currently configured in MoneyPrinter.
 * Used across the Backtesting / Journal strategy selector and Win Probability Pie Charts.
 */
export const STRATEGY_CATALOG: StrategyDefinition[] = [
  // 1. Pullback Strategy (/admin/strategy/pullback-strategy)
  {
    id: "pullback-bullish",
    family: "Pullback Strategy",
    label: "Pullback Strategy — Bullish Market (11-Step Flow)",
    shortLabel: "Pullback · Bullish",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#10b981",
  },
  {
    id: "pullback-bearish",
    family: "Pullback Strategy",
    label: "Pullback Strategy — Bearish Market (11-Step Flow)",
    shortLabel: "Pullback · Bearish",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#34d399",
  },
  {
    id: "pullback-break-retest",
    family: "Pullback Strategy",
    label: "Catching Pullbacks #1 — Break & Retest",
    shortLabel: "Pullback · Break & Retest",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#2dd4bf",
  },
  {
    id: "pullback-fibonacci",
    family: "Pullback Strategy",
    label: "Catching Pullbacks #2 — Fibonacci (50%–61.8%)",
    shortLabel: "Pullback · Fib 50–61.8%",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#f59e0b",
  },
  {
    id: "pullback-sma",
    family: "Pullback Strategy",
    label: "Catching Pullbacks #3 — 20 & 50 SMA Dynamic S/R",
    shortLabel: "Pullback · 20/50 SMA",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#60a5fa",
  },
  {
    id: "pullback-trendline",
    family: "Pullback Strategy",
    label: "Catching Pullbacks #4 — Simple Trendline Bounce",
    shortLabel: "Pullback · Trendline",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#818cf8",
  },
  {
    id: "pullback-distribution",
    family: "Pullback Strategy",
    label: "Catching Pullbacks #5 — Smart Money Distribution",
    shortLabel: "Pullback · Distribution",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#f43f5e",
  },
  {
    id: "pullback-accumulation",
    family: "Pullback Strategy",
    label: "Catching Pullbacks #6 — Smart Money Accumulation",
    shortLabel: "Pullback · Accumulation",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#22c55e",
  },
  {
    id: "pullback-fvg",
    family: "Pullback Strategy",
    label: "Catching Pullbacks #7 — Fair Value Gap (FVG)",
    shortLabel: "Pullback · FVG",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#06b6d4",
  },
  {
    id: "pullback-breaker",
    family: "Pullback Strategy",
    label: "Catching Pullbacks #8 — Breaker Block",
    shortLabel: "Pullback · Breaker Block",
    href: "/admin/strategy/pullback-strategy",
    accentHex: "#a855f7",
  },

  // 2. Volume Profile Strategy (/admin/strategy/volume-profile-strategy)
  {
    id: "vp-poc-bounce",
    family: "Volume Profile Strategy",
    label: "Volume Profile #1 — POC Bounce Strategy",
    shortLabel: "VP · POC Bounce",
    href: "/admin/strategy/volume-profile-strategy",
    accentHex: "#ef4444",
  },
  {
    id: "vp-va-reversal",
    family: "Volume Profile Strategy",
    label: "Volume Profile #2 — Value Area Reversal",
    shortLabel: "VP · VA Reversal",
    href: "/admin/strategy/volume-profile-strategy",
    accentHex: "#38bdf8",
  },
  {
    id: "vp-breakout",
    family: "Volume Profile Strategy",
    label: "Volume Profile #3 — Breakout Strategy",
    shortLabel: "VP · Breakout",
    href: "/admin/strategy/volume-profile-strategy",
    accentHex: "#fbbf24",
  },
];

export const STRATEGY_FAMILIES: StrategyFamily[] = [
  "Pullback Strategy",
  "Volume Profile Strategy",
];

export const BACKTEST_TIMEFRAMES = [
  "1M",
  "3M",
  "5M",
  "15M",
  "30M",
  "45M",
  "1H",
  "4H",
  "1D",
] as const;

export const BACKTEST_SESSIONS = [
  "Asian (Tokyo/Sydney)",
  "London Session",
  "New York Session",
  "London–NY Overlap",
] as const;

export function getStrategyById(id: string | null | undefined): StrategyDefinition | null {
  if (!id) return null;
  return STRATEGY_CATALOG.find((s) => s.id === id) ?? null;
}

export function formatStrategyLabel(
  id: string | null | undefined,
  short = false
): string {
  if (!id) return "Unspecified Strategy";
  const found = getStrategyById(id);
  if (found) return short ? found.shortLabel : found.label;
  return id;
}
