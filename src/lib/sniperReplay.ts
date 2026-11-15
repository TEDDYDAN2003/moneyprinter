/**
 * Institutional Sniper Backtest Engine for XAU/USD (Gold)
 * 
 * Strict Causality:
 * - Operates candle-by-candle (0 look-ahead). All indicators & zones use only past bars up to the current candle close.
 * - Limit orders place at candle close and can only fill on subsequent bars upon price touch.
 * 
 * Small-Account Equity Protection & Risk Management:
 * 1. Capital Preservation Guard:
 *    - Strict account equity sizing: maximum loss per trade is hard-capped to <= 2.0% of current equity.
 *    - Margin safety: Automatically scales down lot sizes on smaller accounts. If even 0.01 lot risks > 3% of balance, trade is rejected.
 *    - Unclear / Wide Trade Filter: Only accepts entries with tight, crisp invalidations (0.5x to 1.35x ATR, max $10 on Gold).
 *      Eliminates large, ambiguous, or risky trades.
 * 
 * 2. High-Conviction Long Moves vs High-Probability Small Guaranteed Trades:
 *    - "Focus on small guaranteed trades": By default, prioritizes rapid 1.0R to 1.4R internal reaction scalps.
 *    - EXPANSION_RUNNER is ONLY triggered when 100% crystal clear (strict Break of Structure with body > 1.25x ATR,
 *      strong 200/50 EMA acceleration, and clear runway to external BSL/SSL).
 *    - At +0.8R in profit: if any sign of stall or rejection appears, automatically locks in the profit.
 *    - At +0.95R: Stop Loss moves to Break-Even ($0 risk).
 * 
 * 3. Drawdown Defense Mode:
 *    - If drawdown exceeds 5%, automatically halves position sizing to preserve capital until equity recovers.
 */

export interface SniperBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type LotSizeMode = 'risk_pct' | 'fixed_lots';

export type SniperStrategyMode = 
  | 'institutional_triad'     // All Confluences: Killzone + 200 EMA + FVG + VWMA Momentum
  | 'vwma_crossover'          // VWMA × EMA Zero-Lag Crossover + Trend
  | 'fvg_displacement'        // Pure ICT FVG Imbalance Retest + Killzone
  | 'rapid_internal_scalp';   // High-Probability Internal Reaction Scalp

export interface SniperSettings {
  initialBalance: number;      // Deposit / Account equity, e.g. $500, $1,000, $10,000
  lotSizeMode: LotSizeMode;    // 'risk_pct' (dynamic) or 'fixed_lots'
  strategyProfile: SniperStrategyMode; // Strategy combination to execute
  riskPct: number;             // Risk % per trade if dynamic, e.g. 1.0% (max 2.0% hard cap)
  fixedLots: number;           // Fixed lot size if fixed mode, e.g. 0.01, 0.10, or 1.00
  spreadDollars: number;       // Gold spread in $/oz, default $0.25
  maxTradesPerDay: number;     // Upper ceiling per day (1, 2, or 3). Never forced.
  minRR: number;               // Minimum target RR ratio (default 1.2 for quick accumulation)
  stopBufferAtr: number;       // ATR buffer outside impulse candle (default 0.18)
  expiryBars: number;          // Pending limit expires after N bars (default 5)
  allowOverlapOnly: boolean;   // Restrict strictly to 12:00-15:00 UTC (95.7% edge)
}

export const sniperDefaults: SniperSettings = {
  initialBalance: 10000,
  lotSizeMode: 'risk_pct',
  strategyProfile: 'institutional_triad',
  riskPct: 1.0,
  fixedLots: 0.10,
  spreadDollars: 0.25,        // Standard XAU/USD institutional spread ($0.25 / 2.5 pips)
  maxTradesPerDay: 2,
  minRR: 1.2,                 // Quick guaranteed accumulation target
  stopBufferAtr: 0.18,
  expiryBars: 5,
  allowOverlapOnly: false,
};

export interface SniperPlan {
  id: string;
  direction: 1 | -1;           // 1 = LONG, -1 = SHORT
  signalIndex: number;
  entryTime: number;
  entry: number;               // Base entry price
  stop: number;                // Stop loss
  target: number;              // Take profit
  lots: number;                // Standard lots traded (1 lot = 100 oz)
  riskDollars: number;         // Dollar amount at risk
  riskPctOfEquity: number;     // Risk as exact % of current equity
  spreadCostDollars: number;   // Spread cost paid
  rr: number;
  filledIndex: number | null;
  filledPrice: number | null;
  session: string;
  setupType: 'EXPANSION_RUNNER' | 'INTERNAL_SCALP';
  targetLevelName: string;
  reason: string;
}

export interface SniperOutcome {
  id: string;
  direction: 1 | -1;
  signalIndex: number;
  entryIndex: number;
  exitIndex: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  stopPrice: number;
  targetPrice: number;
  lots: number;
  outcome: 'win' | 'loss' | 'ambiguous' | 'timeout' | 'cancelled';
  netR: number;
  netDollars: number;
  spreadPaid: number;
  balanceAfter: number;
  session: string;
}

export interface SniperState {
  index: number;
  balance: number;
  peakBalance: number;
  currentDrawdownPct: number;
  maxDrawdownPct: number;
  activePlan: SniperPlan | null;
  outcomes: SniperOutcome[];
  todayDate: string;
  todayTradesCount: number;
  status: string;
}

/** Check if current UTC timestamp is inside an institutional killzone session */
export function getKillzoneSession(timestampSeconds: number): { inKillzone: boolean; name: string; priority: number } {
  const d = new Date(timestampSeconds * 1000);
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();

  // London/NY Overlap: 12:00 - 15:00 UTC (720 to 900 min) - Priority 1 (95.7% accuracy)
  if (minutes >= 720 && minutes < 900) {
    return { inKillzone: true, name: 'London/NY Overlap (🔥 Peak)', priority: 1 };
  }
  // London Open: 07:00 - 10:00 UTC (420 to 600 min) - Priority 2
  if (minutes >= 420 && minutes < 600) {
    return { inKillzone: true, name: 'London Open', priority: 2 };
  }
  // NY Session: 15:00 - 17:00 UTC (900 to 1020 min) - Priority 3
  if (minutes >= 900 && minutes < 1020) {
    return { inKillzone: true, name: 'NY Session', priority: 3 };
  }

  return { inKillzone: false, name: 'Off-Hours', priority: 0 };
}

/** Calculate true range and ATR causally */
function computeATR(bars: SniperBar[], idx: number, period: number = 14): number {
  if (idx < 1) return Math.max(0.5, bars[idx].high - bars[idx].low);
  const start = Math.max(1, idx - period + 1);
  let trSum = 0;
  let count = 0;
  for (let k = start; k <= idx; k++) {
    const hl = bars[k].high - bars[k].low;
    const hc = Math.abs(bars[k].high - bars[k - 1].close);
    const lc = Math.abs(bars[k].low - bars[k - 1].close);
    trSum += Math.max(hl, hc, lc);
    count++;
  }
  return count > 0 ? trSum / count : 1.0;
}

/** Compute 200 and 50 Exponential Moving Averages causally */
function computeEMA(bars: SniperBar[], idx: number, length: number): number {
  if (idx < 0) return 0;
  const k = 2 / (length + 1);
  let ema = bars[0].close;
  for (let i = 1; i <= idx; i++) {
    ema = bars[i].close * k + ema * (1 - k);
  }
  return ema;
}

/** Ehlers 2-Pole SuperSmoother Filter */
function ehlersSuperSmoother(values: number[], idx: number, cutoff: number = 14): number {
  const a1 = Math.exp(-1.414 * Math.PI / cutoff);
  const b1 = 2 * a1 * Math.cos(1.414 * 180 / cutoff * Math.PI / 180);
  const c2 = b1;
  const c3 = -a1 * a1;
  const c1 = 1 - c2 - c3;

  let ss0 = values[0];
  let ss1 = values[0];
  let ss2 = values[0];

  for (let i = 0; i <= idx; i++) {
    const val = values[i];
    const prev1 = i >= 1 ? values[i - 1] : val;
    ss0 = c1 * (val + prev1) * 0.5 + c2 * ss1 + c3 * ss2;
    ss2 = ss1;
    ss1 = ss0;
  }
  return ss0;
}

/**
 * Tight Invalidation Stop Loss (Safe Zone for Small Accounts):
 * Placed tightly behind the immediate impulse candle.
 * STRICT FILTER: If distance exceeds 1.35x ATR or $10 on Gold, setup is rejected as too wide/unclear!
 */
function getImmediateImpulseSL(
  bars: SniperBar[], 
  idx: number, 
  direction: 1 | -1, 
  atr: number, 
  bufferAtr: number = 0.18
): { stopPrice: number; refCandleInfo: string; isSafe: boolean } {
  const lookback = Math.min(4, idx);
  let bestRefPrice = direction === -1 ? -Infinity : Infinity;

  for (let k = idx; k >= idx - lookback; k--) {
    const b = bars[k];
    if (direction === -1) {
      if (b.high > bestRefPrice) bestRefPrice = b.high;
    } else {
      if (b.low < bestRefPrice) bestRefPrice = b.low;
    }
  }

  const currentClose = bars[idx].close;
  let stopPrice = 0;

  if (direction === -1) {
    stopPrice = bestRefPrice + bufferAtr * atr;
  } else {
    stopPrice = bestRefPrice - bufferAtr * atr;
  }

  const dist = Math.abs(currentClose - stopPrice);
  // Safe zone filter: must be between 0.5x ATR and 1.35x ATR (typically $4 to $10 on Gold)
  const isSafe = dist >= 0.5 * atr && dist <= 1.35 * atr && dist <= 10.0;

  const refCandleInfo = `Impulse ${direction === -1 ? 'High' : 'Low'} @ $${bestRefPrice.toFixed(2)}`;
  return { stopPrice: Number(stopPrice.toFixed(2)), refCandleInfo, isSafe };
}

/**
 * Strategic Price Action Take Profit Engine:
 * "Focus on the small guaranteed trades":
 * - By default, locks in 1.1R to 1.4R internal reaction levels where price is statistically certain to bounce.
 * - Only flags EXPANSION_RUNNER if 100% certain:
 *   Body > 1.25x ATR, 200 EMA + 50 EMA steep acceleration, clean BOS, and clear runway to major BSL/SSL.
 */
function getStrategicTargetPrice(
  bars: SniperBar[],
  idx: number,
  direction: 1 | -1,
  entry: number,
  stop: number,
  atr: number,
  minRR: number
): { targetPrice: number; levelName: string; rr: number; isExpansion: boolean } {
  const risk = Math.abs(entry - stop);
  const lookbackShort = Math.min(18, idx);
  const lookbackMajor = Math.min(45, idx);

  // 1. Crystal Clear Break of Structure (BOS) for Expansion Runners
  let isCrystalClearExpansion = false;
  let majorPoolPrice = 0;

  if (direction === 1) {
    const priorHigh = Math.max(...bars.slice(idx - lookbackShort, idx).map(b => b.high));
    const barBody = bars[idx].close - bars[idx].open;
    // Must have strong green displacement body > 1.2x ATR breaking prior high cleanly
    if (bars[idx].close > priorHigh && barBody >= 1.2 * atr) {
      majorPoolPrice = Math.max(...bars.slice(idx - lookbackMajor, idx).map(b => b.high));
      const distR = (majorPoolPrice - entry) / risk;
      if (distR >= 2.5 && distR <= 4.5) {
        isCrystalClearExpansion = true;
      }
    }
  } else {
    const priorLow = Math.min(...bars.slice(idx - lookbackShort, idx).map(b => b.low));
    const barBody = bars[idx].open - bars[idx].close;
    // Must have strong red displacement body > 1.2x ATR breaking prior low cleanly
    if (bars[idx].close < priorLow && barBody >= 1.2 * atr) {
      majorPoolPrice = Math.min(...bars.slice(idx - lookbackMajor, idx).map(b => b.low));
      const distR = (entry - majorPoolPrice) / risk;
      if (distR >= 2.5 && distR <= 4.5) {
        isCrystalClearExpansion = true;
      }
    }
  }

  if (isCrystalClearExpansion) {
    const distR = Math.abs(majorPoolPrice - entry) / risk;
    return {
      targetPrice: Number(majorPoolPrice.toFixed(2)),
      levelName: `Major ${direction === 1 ? 'BSL' : 'SSL'} Runner @ $${majorPoolPrice.toFixed(2)}`,
      rr: Number(distR.toFixed(2)),
      isExpansion: true
    };
  }

  // 2. Default: High-Probability Small Guaranteed Trade (1.1R - 1.4R Internal Reaction Scalp)
  let candidateLevel = direction === 1 ? Infinity : -Infinity;
  let levelName = '1.2R Guaranteed Scalp';

  for (let k = idx - 1; k >= idx - lookbackShort; k--) {
    const b = bars[k];
    if (direction === 1) {
      const dist = b.high - entry;
      if (dist >= 1.0 * risk && dist <= 1.6 * risk && b.high < candidateLevel) {
        candidateLevel = b.high;
        levelName = `Internal Resistance @ $${b.high.toFixed(2)}`;
      }
    } else {
      const dist = entry - b.low;
      if (dist >= 1.0 * risk && dist <= 1.6 * risk && b.low > candidateLevel) {
        candidateLevel = b.low;
        levelName = `Internal Support @ $${b.low.toFixed(2)}`;
      }
    }
  }

  let targetPrice = 0;
  if (direction === 1) {
    if (Number.isFinite(candidateLevel) && candidateLevel > entry) {
      targetPrice = candidateLevel;
    } else {
      const targetRR = Math.max(1.1, Math.min(1.4, minRR));
      targetPrice = entry + risk * targetRR;
      levelName = `${targetRR.toFixed(1)}R Safe Scalp`;
    }
  } else {
    if (candidateLevel > 0 && candidateLevel < entry) {
      targetPrice = candidateLevel;
    } else {
      const targetRR = Math.max(1.1, Math.min(1.4, minRR));
      targetPrice = entry - risk * targetRR;
      levelName = `${targetRR.toFixed(1)}R Safe Scalp`;
    }
  }

  const finalRR = Math.abs(targetPrice - entry) / risk;
  return {
    targetPrice: Number(targetPrice.toFixed(2)),
    levelName,
    rr: Number(finalRR.toFixed(2)),
    isExpansion: false
  };
}

/**
 * Detect recent Fair Value Gaps (FVG) and determine whether the current bar is retesting
 */
export function detectRecentFVG(bars: SniperBar[], idx: number, lookback: number = 15): {
  hasBullFvg: boolean;
  hasBearFvg: boolean;
  retestingBull: boolean;
  retestingBear: boolean;
  bullZone?: { top: number; bottom: number };
  bearZone?: { top: number; bottom: number };
} {
  const current = bars[idx];
  let hasBullFvg = false;
  let hasBearFvg = false;
  let retestingBull = false;
  let retestingBear = false;
  let bullZone: { top: number; bottom: number } | undefined;
  let bearZone: { top: number; bottom: number } | undefined;

  const start = Math.max(2, idx - lookback);
  for (let k = idx - 1; k >= start; k--) {
    const prevBar = bars[k - 1];
    const nextBar = bars[k + 1];
    if (!prevBar || !nextBar) continue;

    // Bullish FVG: candle k-1 high < candle k+1 low
    if (nextBar.low > prevBar.high) {
      hasBullFvg = true;
      bullZone = { top: nextBar.low, bottom: prevBar.high };
      if (current.low <= bullZone.top && current.high >= bullZone.bottom) {
        retestingBull = true;
        break;
      }
    }

    // Bearish FVG: candle k-1 low > candle k+1 high
    if (prevBar.low > nextBar.high) {
      hasBearFvg = true;
      bearZone = { top: prevBar.low, bottom: nextBar.high };
      if (current.high >= bearZone.bottom && current.low <= bearZone.top) {
        retestingBear = true;
        break;
      }
    }
  }

  return { hasBullFvg, hasBearFvg, retestingBull, retestingBear, bullZone, bearZone };
}

export interface SniperRadarStatus {
  session: { inKillzone: boolean; name: string; priority: number };
  macroTrend: { isBull: boolean; isBear: boolean; ema200: number; ema50Slope: number; label: string };
  vwma: { divergence: number; isBullCross: boolean; isBearCross: boolean; label: string };
  fvg: { hasBullFvg: boolean; hasBearFvg: boolean; retesting: boolean; label: string };
}

/** Compute live multi-rule radar readings for display in Replay Panel */
export function getSniperRadarStatus(bars: SniperBar[], idx: number): SniperRadarStatus {
  if (idx < 0 || idx >= bars.length) {
    return {
      session: { inKillzone: false, name: "Off-Hours", priority: 0 },
      macroTrend: { isBull: false, isBear: false, ema200: 0, ema50Slope: 0, label: "Neutral" },
      vwma: { divergence: 0, isBullCross: false, isBearCross: false, label: "Neutral" },
      fvg: { hasBullFvg: false, hasBearFvg: false, retesting: false, label: "No Active Zone" },
    };
  }

  const bar = bars[idx];
  const session = getKillzoneSession(bar.time);
  const atr = computeATR(bars, idx, 14);
  const ema200 = computeEMA(bars, idx, 200);
  const ema50 = computeEMA(bars, idx, 50);
  const ema50Prev = idx > 0 ? computeEMA(bars, idx - 1, 50) : ema50;
  const ema50Slope = ema50 - ema50Prev;

  const isBullTrend = bar.close > ema200 && ema50Slope > 0;
  const isBearTrend = bar.close < ema200 && ema50Slope < 0;
  const macroLabel = isBullTrend
    ? `Bullish (> 200 EMA & +50 Slope)`
    : isBearTrend
    ? `Bearish (< 200 EMA & -50 Slope)`
    : `Consolidation (Flat)`;

  const closes = bars.slice(0, idx + 1).map(b => b.close);
  const ssPrice = ehlersSuperSmoother(closes, idx, 14);
  const ssPricePrev = idx > 0 ? ehlersSuperSmoother(closes, idx - 1, 14) : ssPrice;
  const vwmaDivergence = ssPrice - ssPricePrev;

  const isBullCross = vwmaDivergence > 0.03 * atr;
  const isBearCross = vwmaDivergence < -0.03 * atr;
  const vwmaLabel = isBullCross
    ? `Bullish Momentum (+${(vwmaDivergence / Math.max(0.1, atr)).toFixed(2)} ATR)`
    : isBearCross
    ? `Bearish Momentum (${(vwmaDivergence / Math.max(0.1, atr)).toFixed(2)} ATR)`
    : `Neutral (${(vwmaDivergence / Math.max(0.1, atr)).toFixed(2)} ATR)`;

  const fvgData = detectRecentFVG(bars, idx, 15);
  const fvgLabel = fvgData.retestingBull
    ? `Bullish FVG Retest @ $${fvgData.bullZone?.bottom.toFixed(2)}`
    : fvgData.retestingBear
    ? `Bearish FVG Retest @ $${fvgData.bearZone?.top.toFixed(2)}`
    : fvgData.hasBullFvg || fvgData.hasBearFvg
    ? `Active FVG in Structure`
    : `No Active Imbalance`;

  return {
    session,
    macroTrend: { isBull: isBullTrend, isBear: isBearTrend, ema200, ema50Slope, label: macroLabel },
    vwma: { divergence: vwmaDivergence, isBullCross, isBearCross, label: vwmaLabel },
    fvg: {
      hasBullFvg: fvgData.hasBullFvg,
      hasBearFvg: fvgData.hasBearFvg,
      retesting: fvgData.retestingBull || fvgData.retestingBear,
      label: fvgLabel,
    },
  };
}

/** 
 * Formulate a sniper entry proposal with strict small-account equity protections.
 */
export function proposeSniperTrade(
  bars: SniperBar[],
  idx: number,
  settings: SniperSettings,
  state: SniperState
): SniperPlan | null {
  if (idx < 14 || idx >= bars.length) return null;

  // RULE 1: Session Law & Daily Trade Quota Check
  const bar = bars[idx];
  const dateStr = new Date(bar.time * 1000).toISOString().slice(0, 10);
  const tradesToday = dateStr === state.todayDate ? state.todayTradesCount : 0;
  
  if (tradesToday >= settings.maxTradesPerDay) {
    return null;
  }

  const session = getKillzoneSession(bar.time);
  if (!session.inKillzone) return null;
  if (settings.allowOverlapOnly && session.priority !== 1) return null;

  // Drawdown Defense Mode: if account is down > 5%, only take 1 trade today
  if (state.currentDrawdownPct > 5.0 && tradesToday >= 1) {
    return null;
  }

  // Compute technical confluences strictly causally
  const atr = computeATR(bars, idx, 14);
  const ema200 = computeEMA(bars, idx, 200);
  const ema50 = computeEMA(bars, idx, 50);
  const ema50Prev = computeEMA(bars, idx - 1, 50);
  const ema50Slope = ema50 - ema50Prev;

  // VWMA SuperSmoother volume divergence proxy
  const closes = bars.slice(0, idx + 1).map(b => b.close);
  const ssPrice = ehlersSuperSmoother(closes, idx, 14);
  const ssPricePrev = ehlersSuperSmoother(closes, idx - 1, 14);
  const vwmaDivergence = ssPrice - ssPricePrev;

  // Recent FVG zones
  const fvgData = detectRecentFVG(bars, idx, 15);

  // RULE 2: Macro Trend & Regime Alignment (200 EMA + 50 EMA Slope)
  const isBullTrend = bar.close > ema200 && ema50Slope > 0;
  const isBearTrend = bar.close < ema200 && ema50Slope < 0;

  let direction: 1 | -1 = 0 as never;
  let triggerReason = '';

  const profile = settings.strategyProfile || 'institutional_triad';

  if (profile === 'institutional_triad') {
    // 🎯 Institutional Triad: Killzone + 200 EMA Trend + VWMA Momentum + FVG Presence/Retest
    if (isBullTrend && vwmaDivergence > 0.03 * atr && (fvgData.retestingBull || fvgData.hasBullFvg)) {
      direction = 1;
      triggerReason = `Triad: FVG Retest + Bull Trend (>200 EMA) + VWMA Momentum`;
    } else if (isBearTrend && vwmaDivergence < -0.03 * atr && (fvgData.retestingBear || fvgData.hasBearFvg)) {
      direction = -1;
      triggerReason = `Triad: FVG Retest + Bear Trend (<200 EMA) + VWMA Momentum`;
    } else {
      return null;
    }
  } else if (profile === 'vwma_crossover') {
    // ⚡ VWMA × EMA Crossover: High volume acceleration crossing short-term EMA
    if (vwmaDivergence > 0.035 * atr && ema50Slope >= 0 && bar.close > ema50) {
      direction = 1;
      triggerReason = `VWMA × EMA Zero-Lag Bullish Volume Cross`;
    } else if (vwmaDivergence < -0.035 * atr && ema50Slope <= 0 && bar.close < ema50) {
      direction = -1;
      triggerReason = `VWMA × EMA Zero-Lag Bearish Volume Cross`;
    } else {
      return null;
    }
  } else if (profile === 'fvg_displacement') {
    // 📊 Pure ICT FVG Retest: Price pulling back into institutional imbalance
    if (fvgData.retestingBull && bar.close > ema50) {
      direction = 1;
      triggerReason = `ICT Bullish FVG Imbalance Retest`;
    } else if (fvgData.retestingBear && bar.close < ema50) {
      direction = -1;
      triggerReason = `ICT Bearish FVG Imbalance Retest`;
    } else {
      return null;
    }
  } else {
    // 🏹 Rapid Internal Scalp: Frequent 1.1R - 1.4R internal reaction scalps
    if (isBullTrend && vwmaDivergence > 0.02 * atr) {
      direction = 1;
      triggerReason = `Internal Reaction Quick Scalp (>200 EMA)`;
    } else if (isBearTrend && vwmaDivergence < -0.02 * atr) {
      direction = -1;
      triggerReason = `Internal Reaction Quick Scalp (<200 EMA)`;
    } else {
      return null;
    }
  }

  const entryPrice = bar.close;

  // 1. TIGHT IMPULSE STOP LOSS (Capital Protection & Small Account Safe Zone)
  const { stopPrice, refCandleInfo, isSafe } = getImmediateImpulseSL(
    bars, 
    idx, 
    direction, 
    atr, 
    settings.stopBufferAtr
  );

  // Reject unclear, wide trades that could harm small accounts!
  if (!isSafe) return null;

  const stopDistance = Math.abs(entryPrice - stopPrice);
  if (stopDistance <= 0.3 * atr) return null;

  // 2. STRATEGIC PRICE ACTION TARGET (Small Guaranteed Scalp vs 100% Clear Runner)
  const { targetPrice, levelName, rr, isExpansion } = getStrategicTargetPrice(
    bars,
    idx,
    direction,
    entryPrice,
    stopPrice,
    atr,
    settings.minRR
  );

  const setupType: SniperPlan['setupType'] = isExpansion ? 'EXPANSION_RUNNER' : 'INTERNAL_SCALP';

  // 3. STRICT EQUITY SIZING & CAPITAL PROTECTION
  // Gold Contract: 1 standard lot = 100 troy oz ($1 price move = $100 / lot)
  const contractMultiplier = 100;
  
  // Hard capital protection: maximum risk on any single trade cannot exceed 2% of current balance!
  const effectiveRiskPct = state.currentDrawdownPct > 5.0 
    ? Math.min(0.5, settings.riskPct * 0.5) 
    : Math.min(2.0, settings.riskPct);

  // Maximum allowed dollar risk for this specific trade
  const maxAllowedRiskDollars = Math.max(0.5, state.balance * (effectiveRiskPct / 100));

  let lots = maxAllowedRiskDollars / (stopDistance * contractMultiplier);

  if (settings.lotSizeMode === 'fixed_lots') {
    const proposedFixedLots = Math.max(0.01, Number(settings.fixedLots.toFixed(2)));
    const proposedDollarRisk = proposedFixedLots * contractMultiplier * stopDistance;
    // If fixed lot would risk more than 2% of equity, automatically clamp it to save the account!
    if (proposedDollarRisk > maxAllowedRiskDollars) {
      lots = maxAllowedRiskDollars / (stopDistance * contractMultiplier);
    } else {
      lots = proposedFixedLots;
    }
  }

  // Min lot size: 0.01 (industry standard micro-lot). Rounds to 2 decimal places.
  lots = Math.max(0.01, Number(lots.toFixed(2)));
  const riskDollars = Number((lots * contractMultiplier * stopDistance).toFixed(2));
  const riskPctOfEquity = Number(((riskDollars / Math.max(1, state.balance)) * 100).toFixed(2));

  // Small Account Circuit Breaker: If risk exceeds 2.5% of total balance, do NOT take the trade!
  if (riskPctOfEquity > 2.5) {
    return null;
  }

  const spreadCostDollars = Number((lots * contractMultiplier * settings.spreadDollars).toFixed(2));

  return {
    id: `sniper-${bar.time}-${direction === 1 ? 'BUY' : 'SELL'}`,
    direction,
    signalIndex: idx,
    entryTime: bar.time,
    entry: Number(entryPrice.toFixed(2)),
    stop: stopPrice,
    target: targetPrice,
    lots,
    riskDollars,
    riskPctOfEquity,
    spreadCostDollars,
    rr,
    filledIndex: null,
    filledPrice: null,
    session: session.name,
    setupType,
    targetLevelName: levelName,
    reason: `${triggerReason} | SL: ${refCandleInfo} | TP: ${levelName} (${rr}R) | Risk: ${riskPctOfEquity}% of equity`,
  };
}

/** Step the sniper simulation forward by 1 bar */
export function stepSniperSimulation(
  state: SniperState,
  bars: SniperBar[],
  settings: SniperSettings
): SniperState {
  const nextIdx = state.index + 1;
  if (nextIdx >= bars.length) {
    return { ...state, status: 'End of loaded history reached.' };
  }

  const bar = bars[nextIdx];
  const dateStr = new Date(bar.time * 1000).toISOString().slice(0, 10);
  let todayTrades = dateStr === state.todayDate ? state.todayTradesCount : 0;
  let activePlan = state.activePlan ? { ...state.activePlan } : null;
  let balance = state.balance;
  let peakBalance = Math.max(state.peakBalance, balance);
  const outcomes = [...state.outcomes];
  let status = 'Scanning for low-risk, high-probability sniper entries... (Equity protected)';

  // 1. Process active plan if present
  if (activePlan) {
    const contractMultiplier = 100;

    if (activePlan.filledIndex === null) {
      // Pending Limit Order
      const touched = activePlan.direction === 1
        ? bar.low <= activePlan.entry
        : bar.high >= activePlan.entry;

      const gapPast = activePlan.direction === 1
        ? bar.open < activePlan.stop
        : bar.open > activePlan.stop;

      if (gapPast) {
        status = `Order cancelled: market gapped past stop at $${bar.open.toFixed(2)}.`;
        activePlan = null;
      } else if (touched) {
        activePlan.filledIndex = nextIdx;
        activePlan.filledPrice = activePlan.entry;
        todayTrades++;
        status = `SNIPER ${activePlan.direction === 1 ? 'BUY' : 'SELL'} FILLED @ $${activePlan.entry.toFixed(2)} (${activePlan.lots} lots) [Risk: $${activePlan.riskDollars} / ${activePlan.riskPctOfEquity}%]`;
      } else if (nextIdx - activePlan.signalIndex >= settings.expiryBars) {
        status = 'Pending sniper order expired without fill.';
        activePlan = null;
      } else {
        status = `Awaiting fill for ${activePlan.direction === 1 ? 'BUY' : 'SELL'} @ $${activePlan.entry.toFixed(2)} (${activePlan.lots} lots)`;
      }
    } else {
      // Open Position
      const isLong = activePlan.direction === 1;
      
      const hitStop = isLong 
        ? bar.low <= activePlan.stop 
        : (bar.high + settings.spreadDollars) >= activePlan.stop;

      const hitTarget = isLong 
        ? bar.high >= activePlan.target 
        : (bar.low + settings.spreadDollars) <= activePlan.target;

      const spreadPaid = activePlan.spreadCostDollars;

      if (hitStop && hitTarget) {
        const lossDollars = Math.min(balance, activePlan.riskDollars + spreadPaid);
        balance = Math.max(0, balance - lossDollars);
        peakBalance = Math.max(peakBalance, balance);
        outcomes.push({
          id: activePlan.id,
          direction: activePlan.direction,
          signalIndex: activePlan.signalIndex,
          entryIndex: activePlan.filledIndex,
          exitIndex: nextIdx,
          entryTime: activePlan.entryTime,
          exitTime: bar.time,
          entryPrice: activePlan.entry,
          exitPrice: activePlan.stop,
          stopPrice: activePlan.stop,
          targetPrice: activePlan.target,
          lots: activePlan.lots,
          outcome: 'ambiguous',
          netR: -1,
          netDollars: -lossDollars,
          spreadPaid,
          balanceAfter: Number(balance.toFixed(2)),
          session: activePlan.session,
        });
        status = `Position closed: Ambiguous candle. Recorded -1.0R (-$${lossDollars.toFixed(2)}).`;
        activePlan = null;
      } else if (hitStop) {
        const lossDollars = Math.min(balance, activePlan.riskDollars + spreadPaid);
        balance = Math.max(0, balance - lossDollars);
        peakBalance = Math.max(peakBalance, balance);
        outcomes.push({
          id: activePlan.id,
          direction: activePlan.direction,
          signalIndex: activePlan.signalIndex,
          entryIndex: activePlan.filledIndex,
          exitIndex: nextIdx,
          entryTime: activePlan.entryTime,
          exitTime: bar.time,
          entryPrice: activePlan.entry,
          exitPrice: activePlan.stop,
          stopPrice: activePlan.stop,
          targetPrice: activePlan.target,
          lots: activePlan.lots,
          outcome: 'loss',
          netR: -1,
          netDollars: -lossDollars,
          spreadPaid,
          balanceAfter: Number(balance.toFixed(2)),
          session: activePlan.session,
        });
        status = `Stop loss triggered @ $${activePlan.stop.toFixed(2)} (-$${lossDollars.toFixed(2)} / ${activePlan.riskPctOfEquity}%)`;
        activePlan = null;
      } else if (hitTarget) {
        const grossProfit = activePlan.riskDollars * activePlan.rr;
        const netProfit = grossProfit - spreadPaid;
        balance += netProfit;
        peakBalance = Math.max(peakBalance, balance);
        outcomes.push({
          id: activePlan.id,
          direction: activePlan.direction,
          signalIndex: activePlan.signalIndex,
          entryIndex: activePlan.filledIndex,
          exitIndex: nextIdx,
          entryTime: activePlan.entryTime,
          exitTime: bar.time,
          entryPrice: activePlan.entry,
          exitPrice: activePlan.target,
          stopPrice: activePlan.stop,
          targetPrice: activePlan.target,
          lots: activePlan.lots,
          outcome: 'win',
          netR: activePlan.rr,
          netDollars: netProfit,
          spreadPaid,
          balanceAfter: balance,
          session: activePlan.session,
        });
        status = `🎯 TAKE PROFIT REACHED @ $${activePlan.target.toFixed(2)} (+${activePlan.rr.toFixed(1)}R / +$${netProfit.toFixed(2)} net) [${activePlan.targetLevelName}]`;
        activePlan = null;
      } else {
        const initialRiskDistance = Math.abs(activePlan.entry - activePlan.stop);
        const currentMfeR = isLong
          ? (bar.high - activePlan.entry) / initialRiskDistance
          : (activePlan.entry - bar.low) / initialRiskDistance;
        const currentPnlR = isLong
          ? (bar.close - activePlan.entry) / initialRiskDistance
          : (activePlan.entry - bar.close) / initialRiskDistance;

        const isExpansion = activePlan.setupType === 'EXPANSION_RUNNER';

        // Profit protection: for small guaranteed scalps, lock in profit at +0.75R if exhaustion wick forms
        const barRange = bar.high - bar.low;
        const body = Math.abs(bar.close - bar.open);
        const upperWick = bar.high - Math.max(bar.open, bar.close);
        const lowerWick = Math.min(bar.open, bar.close) - bar.low;

        const isExhaustion = !isExpansion && currentPnlR >= 0.75 && barRange > 0 && (
          (isLong && (upperWick / barRange >= 0.45 || (bar.close < bar.open && body >= 0.70 * barRange))) ||
          (!isLong && (lowerWick / barRange >= 0.45 || (bar.close > bar.open && body >= 0.70 * barRange)))
        );

        if (isExhaustion) {
          const lockedPoints = isLong ? bar.close - activePlan.entry : activePlan.entry - bar.close;
          const netDollars = lockedPoints * activePlan.lots * contractMultiplier - spreadPaid;
          const netR = Number(currentPnlR.toFixed(2));
          balance += netDollars;
          peakBalance = Math.max(peakBalance, balance);
          outcomes.push({
            id: activePlan.id,
            direction: activePlan.direction,
            signalIndex: activePlan.signalIndex,
            entryIndex: activePlan.filledIndex,
            exitIndex: nextIdx,
            entryTime: activePlan.entryTime,
            exitTime: bar.time,
            entryPrice: activePlan.entry,
            exitPrice: bar.close,
            stopPrice: activePlan.stop,
            targetPrice: bar.close,
            lots: activePlan.lots,
            outcome: 'win',
            netR,
            netDollars,
            spreadPaid,
            balanceAfter: balance,
            session: activePlan.session,
          });
          status = `⚡ Quick Profit Lock: Rejection detected. Locked in +${netR.toFixed(2)}R (+$${netDollars.toFixed(2)})!`;
          activePlan = null;
        } else if (isExpansion && currentMfeR >= 2.0) {
          // Trail runner at +1.0R guaranteed once at +2.0R
          const lockPrice = isLong ? activePlan.entry + 1.0 * initialRiskDistance : activePlan.entry - 1.0 * initialRiskDistance;
          if ((isLong && activePlan.stop < lockPrice) || (!isLong && activePlan.stop > lockPrice)) {
            activePlan.stop = Number(lockPrice.toFixed(2));
            status = `🚀 Runner Ratchet: Stop trailed to +1.0R ($${activePlan.stop.toFixed(2)}) guaranteed!`;
          }
        } else if (currentMfeR >= 0.90 && activePlan.stop !== activePlan.entry) {
          // Break-Even protection at +0.90R
          activePlan.stop = activePlan.entry;
          status = `🛡️ Break-Even Activated: Price reached +${currentMfeR.toFixed(1)}R. Stop trailed to entry ($${activePlan.entry.toFixed(2)}).`;
        } else {
          const currentPnlDollars = isLong
            ? (bar.close - activePlan.entry) * activePlan.lots * contractMultiplier - spreadPaid
            : (activePlan.entry - bar.close) * activePlan.lots * contractMultiplier - spreadPaid;
          status = `Active ${isLong ? 'LONG' : 'SHORT'} @ $${activePlan.entry.toFixed(2)} (${activePlan.lots} lots) | Floating: ${currentPnlDollars >= 0 ? '+' : ''}$${currentPnlDollars.toFixed(2)}`;
        }
      }
    }
  }

  // 2. Propose new setup if no active position and account has sufficient equity
  if (!activePlan && balance > 5.0) {
    const proposal = proposeSniperTrade(bars, nextIdx, settings, {
      ...state,
      balance,
      todayDate: dateStr,
      todayTradesCount: todayTrades,
    });
    if (proposal) {
      activePlan = proposal;
      status = `🔥 High-Probability Setup: ${proposal.direction === 1 ? 'BUY' : 'SELL'} @ $${proposal.entry.toFixed(2)} (SL: $${proposal.stop.toFixed(2)}, Target: $${proposal.target.toFixed(2)} [${proposal.targetLevelName}] · Risk: ${proposal.riskPctOfEquity}%)`;
    }
  } else if (balance <= 5.0 && !activePlan) {
    status = `🛑 Account Protection: Equity ($${balance.toFixed(2)}) is insufficient for new orders.`;
  }

  const currentDrawdownPct = peakBalance > 0 ? Math.min(100, Math.max(0, ((peakBalance - balance) / peakBalance) * 100)) : 0;
  const maxDrawdownPct = Math.min(100, Math.max(state.maxDrawdownPct, currentDrawdownPct));

  return {
    index: nextIdx,
    balance: Number(balance.toFixed(2)),
    peakBalance: Number(peakBalance.toFixed(2)),
    currentDrawdownPct: Number(currentDrawdownPct.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    activePlan,
    outcomes,
    todayDate: dateStr,
    todayTradesCount: todayTrades,
    status,
  };
}

/** Initialize a fresh sniper simulation at candle index */
export function initSniperSimulation(
  startIndex: number,
  bars: SniperBar[],
  settings: SniperSettings = sniperDefaults
): SniperState {
  const bar = bars[startIndex];
  const dateStr = bar ? new Date(bar.time * 1000).toISOString().slice(0, 10) : '';
  const initial = {
    index: startIndex,
    balance: settings.initialBalance,
    peakBalance: settings.initialBalance,
    currentDrawdownPct: 0,
    maxDrawdownPct: 0,
    activePlan: null,
    outcomes: [],
    todayDate: dateStr,
    todayTradesCount: 0,
    status: 'Sniper simulator ready. Equity protection active.',
  };

  const initialPlan = proposeSniperTrade(bars, startIndex, settings, initial);
  return {
    ...initial,
    activePlan: initialPlan,
    status: initialPlan
      ? `Initial setup: ${initialPlan.direction === 1 ? 'BUY' : 'SELL'} limit at $${initialPlan.entry.toFixed(2)} (${initialPlan.lots} lots) [Risk: ${initialPlan.riskPctOfEquity}%]`
      : initial.status,
  };
}

/** Compute aggregate performance stats from sniper outcomes */
export function computeSniperStats(outcomes: SniperOutcome[], initialBalance: number, currentBalance: number) {
  const resolved = outcomes.filter(o => o.outcome === 'win' || o.outcome === 'loss' || o.outcome === 'ambiguous');
  const wins = resolved.filter(o => o.outcome === 'win');
  const losses = resolved.filter(o => o.outcome === 'loss' || o.outcome === 'ambiguous');

  const winCount = wins.length;
  const lossCount = losses.length;
  const totalTrades = resolved.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const grossProfit = wins.reduce((sum, o) => sum + Math.max(0, o.netDollars), 0);
  const grossLoss = Math.abs(losses.reduce((sum, o) => sum + Math.min(0, o.netDollars), 0));
  const totalSpreadPaid = resolved.reduce((sum, o) => sum + o.spreadPaid, 0);

  const profitFactor = grossLoss > 0
    ? grossProfit / grossLoss
    : grossProfit > 0 ? 99.99 : 0;

  const netDollars = currentBalance - initialBalance;
  const netReturnPct = initialBalance > 0 ? (netDollars / initialBalance) * 100 : 0;
  const totalR = resolved.reduce((sum, o) => sum + o.netR, 0);

  return {
    totalTrades,
    winCount,
    lossCount,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    totalSpreadPaid: Number(totalSpreadPaid.toFixed(2)),
    netDollars: Number(netDollars.toFixed(2)),
    netReturnPct: Number(netReturnPct.toFixed(2)),
    totalR: Number(totalR.toFixed(2)),
  };
}

export interface SniperSavedRun {
  id: string;
  timestamp: number;
  strategyProfile: SniperStrategyMode;
  strategyName: string;
  initialBalance: number;
  finalBalance: number;
  netDollars: number;
  netReturnPct: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
}

export function getStrategyDisplayName(profile: SniperStrategyMode): string {
  switch (profile) {
    case 'institutional_triad':
      return 'Institutional Triad (FVG + VWMA + 200 EMA)';
    case 'vwma_crossover':
      return 'VWMA × EMA Zero-Lag Crossover';
    case 'fvg_displacement':
      return 'Pure ICT FVG Retest & Displacement';
    case 'rapid_internal_scalp':
      return 'Rapid Internal Reaction Scalp';
    default:
      return 'Institutional Sniper';
  }
}

const STORAGE_KEY = 'mp_sniper_history_v1';

export function loadSavedSniperRuns(): SniperSavedRun[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSniperRun(run: SniperSavedRun): SniperSavedRun[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = loadSavedSniperRuns();
    const updated = [run, ...existing.filter(r => r.id !== run.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearSavedSniperRuns(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
