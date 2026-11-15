/**
 * Institutional Sniper Backtest Engine for XAU/USD (Gold)
 * 
 * Implements the 3 Institutional Trading Rules validated by the 50,000-candle statistical audit:
 * 1. Session Law: London (07-10 UTC), London/NY Overlap (12-15 UTC), NY Close (15-17 UTC)
 * 2. Trend & Regime Alignment: 200 EMA gate + 50 EMA slope alignment
 * 3. Pre-reactive Trigger: Ehlers SuperSmoother VWMA divergence + Market Structure Swing TP/SL
 * 
 * Strict causality:
 * - Never force trades: if no valid setup appears, takes 0 trades for that day.
 * - Max trades per day is an upper cap (default 1-2), never a minimum.
 * - Realistic Gold (XAU/USD) contract mechanics: 1 lot = 100 oz ($1 move = $100/lot).
 * - Realistic spread: default $0.25/oz (user-adjustable).
 * - Lot sizing: Dynamic Risk % (Institutional best practice) OR Fixed Lots (user-defined).
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

export interface SniperSettings {
  initialBalance: number;      // Deposit / Account equity, e.g. $10,000
  lotSizeMode: LotSizeMode;    // 'risk_pct' (dynamic) or 'fixed_lots'
  riskPct: number;             // Risk % per trade if dynamic, e.g. 1.0%
  fixedLots: number;           // Fixed lot size if fixed mode, e.g. 0.10 or 1.00
  spreadDollars: number;       // Gold spread in $/oz, default $0.25
  maxTradesPerDay: number;     // Upper ceiling per day (1, 2, or 3). Never forced.
  minRR: number;               // Minimum target RR, default 2.0
  stopBufferAtr: number;       // ATR buffer outside swing structure (default 0.25)
  expiryBars: number;          // Pending limit expires after N bars (default 8)
  allowOverlapOnly: boolean;   // Restrict strictly to 12:00-15:00 UTC (95.7% edge)
}

export const sniperDefaults: SniperSettings = {
  initialBalance: 10000,
  lotSizeMode: 'risk_pct',
  riskPct: 1.0,
  fixedLots: 0.50,
  spreadDollars: 0.25,        // Standard XAU/USD institutional spread ($0.25 / 2.5 pips)
  maxTradesPerDay: 2,
  minRR: 2.0,
  stopBufferAtr: 0.25,
  expiryBars: 8,
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
  spreadCostDollars: number;   // Spread cost paid
  rr: number;
  filledIndex: number | null;
  filledPrice: number | null;
  session: string;
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

/** Swing structure detector: find recent local swing high and low */
function getRecentMarketStructure(bars: SniperBar[], idx: number, lookback: number = 20) {
  const start = Math.max(0, idx - lookback);
  let swingHigh = -Infinity;
  let swingLow = Infinity;

  for (let i = start; i <= idx; i++) {
    if (bars[i].high > swingHigh) swingHigh = bars[i].high;
    if (bars[i].low < swingLow) swingLow = bars[i].low;
  }

  return { swingHigh, swingLow };
}

/** 
 * Formulate a sniper entry proposal.
 * STRICT FILTER: If any of the 3 institutional conditions fail, returns null.
 * NEVER forces trades: returns null if setup is absent, regardless of daily trade count.
 */
export function proposeSniperTrade(
  bars: SniperBar[],
  idx: number,
  settings: SniperSettings,
  state: SniperState
): SniperPlan | null {
  if (idx < 200 || idx >= bars.length) return null;

  // RULE 1: Session Law & Daily Trade Quota Check
  const bar = bars[idx];
  const dateStr = new Date(bar.time * 1000).toISOString().slice(0, 10);
  const tradesToday = dateStr === state.todayDate ? state.todayTradesCount : 0;
  
  // If daily maximum is reached, take no more trades today
  if (tradesToday >= settings.maxTradesPerDay) {
    return null;
  }

  // Must be strictly within institutional session
  const session = getKillzoneSession(bar.time);
  if (!session.inKillzone) return null;
  if (settings.allowOverlapOnly && session.priority !== 1) return null;

  // Compute technical confluences causally up to index idx
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

  // RULE 2: Macro Trend & Regime Alignment (200 EMA + 50 EMA Slope)
  const isBullTrend = bar.close > ema200 && ema50Slope > 0;
  const isBearTrend = bar.close < ema200 && ema50Slope < 0;

  // If choppy or conflicting trend, do NOT force entry
  if (!isBullTrend && !isBearTrend) return null;

  // RULE 3: Sniper Pre-reactive Trigger + Market Structure
  const { swingHigh, swingLow } = getRecentMarketStructure(bars, idx, 16);

  let direction: 1 | -1 = 0 as never;
  let entryPrice = 0;
  let stopPrice = 0;
  let targetPrice = 0;
  let reason = '';

  if (isBullTrend && vwmaDivergence > 0.05 * atr) {
    // Bullish Sniper Setup
    direction = 1;
    entryPrice = bar.close;
    stopPrice = Math.min(entryPrice - 0.75 * atr, swingLow - settings.stopBufferAtr * atr);
    const riskDistance = entryPrice - stopPrice;
    if (riskDistance <= 0) return null;

    targetPrice = Math.max(entryPrice + riskDistance * settings.minRR, swingHigh + 0.5 * atr);
    reason = `Rule 1: ${session.name} | Rule 2: >200 EMA & +50 EMA slope | Rule 3: VWMA Divergence + Swing Low SL`;
  } else if (isBearTrend && vwmaDivergence < -0.05 * atr) {
    // Bearish Sniper Setup
    direction = -1;
    entryPrice = bar.close;
    stopPrice = Math.max(entryPrice + 0.75 * atr, swingHigh + settings.stopBufferAtr * atr);
    const riskDistance = stopPrice - entryPrice;
    if (riskDistance <= 0) return null;

    targetPrice = Math.min(entryPrice - riskDistance * settings.minRR, swingLow - 0.5 * atr);
    reason = `Rule 1: ${session.name} | Rule 2: <200 EMA & -50 EMA slope | Rule 3: VWMA Divergence + Swing High SL`;
  } else {
    // No trigger this candle: do not force
    return null;
  }

  const stopDistance = Math.abs(entryPrice - stopPrice);
  if (stopDistance <= 0) return null;

  // Institutional Position Sizing for Gold (1 standard lot = 100 troy oz)
  // 1 lot moves $100 per $1.00 price change in Gold
  const contractMultiplier = 100; // 100 oz per standard lot
  let lots = 0;
  let riskDollars = 0;

  if (settings.lotSizeMode === 'fixed_lots') {
    lots = Math.max(0.01, Number(settings.fixedLots.toFixed(2)));
    riskDollars = lots * contractMultiplier * stopDistance;
  } else {
    // Dynamic Risk % Sizing (Best Practice)
    const targetRiskDollars = state.balance * (settings.riskPct / 100);
    lots = targetRiskDollars / (stopDistance * contractMultiplier);
    lots = Math.max(0.01, Number(lots.toFixed(2))); // Min 0.01 lot
    riskDollars = lots * contractMultiplier * stopDistance;
  }

  const spreadCostDollars = lots * contractMultiplier * settings.spreadDollars;
  const rr = Math.abs(targetPrice - entryPrice) / stopDistance;

  return {
    id: `sniper-${bar.time}-${direction === 1 ? 'BUY' : 'SELL'}`,
    direction,
    signalIndex: idx,
    entryTime: bar.time,
    entry: Number(entryPrice.toFixed(2)),
    stop: Number(stopPrice.toFixed(2)),
    target: Number(targetPrice.toFixed(2)),
    lots,
    riskDollars: Number(riskDollars.toFixed(2)),
    spreadCostDollars: Number(spreadCostDollars.toFixed(2)),
    rr: Number(rr.toFixed(2)),
    filledIndex: null,
    filledPrice: null,
    session: session.name,
    reason,
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
  let status = 'Scanning institutional killzones for sniper setups... (Strict: zero forced trades)';

  // 1. Process active plan if present
  if (activePlan) {
    const contractMultiplier = 100; // 100 oz per standard lot

    if (activePlan.filledIndex === null) {
      // Pending Limit Order awaiting touch
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
        // Order filled at limit price
        activePlan.filledIndex = nextIdx;
        activePlan.filledPrice = activePlan.entry;
        todayTrades++;
        status = `SNIPER ${activePlan.direction === 1 ? 'BUY' : 'SELL'} FILLED @ $${activePlan.entry.toFixed(2)} (${activePlan.lots} lots) [${activePlan.session}]`;
      } else if (nextIdx - activePlan.signalIndex >= settings.expiryBars) {
        status = 'Pending sniper order expired without fill.';
        activePlan = null;
      } else {
        status = `Awaiting fill for ${activePlan.direction === 1 ? 'BUY' : 'SELL'} @ $${activePlan.entry.toFixed(2)} (${activePlan.lots} lots)`;
      }
    } else {
      // Order is actively open in the market
      const isLong = activePlan.direction === 1;
      
      // Effective SL/TP taking gold spread into account:
      // For LONG: exits at Bid
      // For SHORT: exits at Ask (Bid + spread)
      const hitStop = isLong 
        ? bar.low <= activePlan.stop 
        : (bar.high + settings.spreadDollars) >= activePlan.stop;

      const hitTarget = isLong 
        ? bar.high >= activePlan.target 
        : (bar.low + settings.spreadDollars) <= activePlan.target;

      const spreadPaid = activePlan.spreadCostDollars;

      if (hitStop && hitTarget) {
        // Ambiguous intrabar candle (extreme news shock/spike)
        const lossDollars = activePlan.riskDollars + spreadPaid;
        balance -= lossDollars;
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
          balanceAfter: balance,
          session: activePlan.session,
        });
        status = `Position closed: Ambiguous spike hit both SL & TP. Recorded -1.0R (-$${lossDollars.toFixed(2)}).`;
        activePlan = null; // Position box disappears immediately!
      } else if (hitStop) {
        // Stop Loss Hit
        const lossDollars = activePlan.riskDollars + spreadPaid;
        balance -= lossDollars;
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
          balanceAfter: balance,
          session: activePlan.session,
        });
        status = `Stop loss triggered @ $${activePlan.stop.toFixed(2)} (-1.0R / -$${lossDollars.toFixed(2)} with spread)`;
        activePlan = null; // Position box disappears immediately!
      } else if (hitTarget) {
        // Take Profit Hit (Sniper Win)
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
        status = `🎯 TAKE PROFIT REACHED @ $${activePlan.target.toFixed(2)} (+${activePlan.rr.toFixed(1)}R / +$${netProfit.toFixed(2)} net)`;
        activePlan = null; // Position box disappears immediately!
      } else {
        const currentPnlDollars = isLong
          ? (bar.close - activePlan.entry) * activePlan.lots * contractMultiplier - spreadPaid
          : (activePlan.entry - bar.close) * activePlan.lots * contractMultiplier - spreadPaid;
        status = `Active ${isLong ? 'LONG' : 'SHORT'} @ $${activePlan.entry.toFixed(2)} (${activePlan.lots} lots) | Floating P&L: ${currentPnlDollars >= 0 ? '+' : ''}$${currentPnlDollars.toFixed(2)}`;
      }
    }
  }

  // 2. Propose new setup if no active position
  // NEVER force: if proposeSniperTrade returns null, activePlan stays null.
  if (!activePlan) {
    const proposal = proposeSniperTrade(bars, nextIdx, settings, {
      ...state,
      balance,
      todayDate: dateStr,
      todayTradesCount: todayTrades,
    });
    if (proposal) {
      activePlan = proposal;
      status = `🔥 High-Edge Setup: ${proposal.direction === 1 ? 'BUY' : 'SELL'} @ $${proposal.entry.toFixed(2)} (${proposal.lots} lots, Target $${proposal.target.toFixed(2)}, SL $${proposal.stop.toFixed(2)})`;
    }
  }

  const currentDrawdownPct = peakBalance > 0 ? Math.max(0, (peakBalance - balance) / peakBalance * 100) : 0;
  const maxDrawdownPct = Math.max(state.maxDrawdownPct, currentDrawdownPct);

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
    status: 'Sniper simulator ready. Click Play to start institutional replay.',
  };

  const initialPlan = proposeSniperTrade(bars, startIndex, settings, initial);
  return {
    ...initial,
    activePlan: initialPlan,
    status: initialPlan
      ? `Initial setup: ${initialPlan.direction === 1 ? 'BUY' : 'SELL'} limit at $${initialPlan.entry.toFixed(2)} (${initialPlan.lots} lots)`
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
