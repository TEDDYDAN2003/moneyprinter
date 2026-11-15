# Institutional Triad — 15-minute confluence and pullback research

## Main finding

The requested tests do **not** justify claiming an improved, live-ready strategy. Eight defined entry combinations produced only 1–17 closed trades each in the development period. No candidate met the predeclared minimum of 20 closed trades plus positive net P&L and profit factor above 1; consequently none was automatically selected as an outperformer. More filters often reduced samples, but these results do not establish that combinations generally reduce win rate.

At your request, the app's default Triad now uses a **MA reaction trigger** and records the FVG-retest check without requiring an FVG touch or fill. The trend, session, risk and shock rules remain in force. This is a user-directed design choice, not a statistically validated improvement. Alternative combinations here are research-only and are not silently promoted to production.

## Pullback Strategy review

Your Moneyprinter page defines a bullish pullback by identifying the highest bullish anchor candle, a subsequent wick grab below its low, and then a **close** above its high; the bearish version mirrors that. Its 11-step execution flow adds 1D/4H context, a return to the validated zone, a caution against aggressive approach, lower-timeframe MSS, a swing stop, and a liquidity target. The catching-pullbacks section separately describes MA, Fibonacci, break/retest, sweep and FVG ideas.

This study does **not** claim to automate that complete strategy: it uses a deliberately narrow 15-minute continuation proxy (a preceding opposite-direction candle followed by a close past that candle's high/low in the internal-trend direction). It does not identify your highest/lowest anchor, grab-then-close sequence, 1D/4H bias, later zone retest, LTF MSS, order blocks or liquidity-based target. Those require explicit causal definitions and, for LTF confirmation, reliable lower-timeframe data. The proxy is a hypothesis, not proof that your full Pullback Strategy wins or loses.

## Data, split and assumptions

Real OANDA practice XAU_USD completed 15-minute midpoint candles and OANDA tick volume, July 15–October 29, 2026; 7,066 candles, snapshot SHA-256 `e342ef85ee57e514a0ec764d279c3b8316bcdfd803e02d42a88edb71faa2ed1a`. Warmup precedes the development window. Development: August 1 through October 11 EAT; later chronological check: October 12 through October 29 EAT (end-of-day). October 20–29 was previously inspected in earlier work, so **the later check is not a genuinely untouched final holdout**. Period-end open positions remain open and are excluded from closed P&L.

Each mode is a separate $1,000 simulated account. Strict fixed-UTC killzones 07:00–10:00 and 12:00–17:00, max two fills/day, next-open market entry, 0.05 maximum standard lots, 0.01 increment, reduced/skipped to 2% planned risk, 1.2R target, No-Wick internal structure length 3, 200 EMA direction, protected swing stop, 2.5× prior ATR shock guard and 20-minute pause. Fixed $0.25/oz symmetric midpoint spread; no commissions, actual bid/ask fills, slippage, margin or financing. A gap can exceed planned risk. Same-bar SL/TP collisions are marked ambiguous and conservatively counted as losses. Drawdown is closed balance only, not floating equity.

Every comparison retains common filters: session, No-Wick internal trend, EMA alignment, tick-volume availability, directional close, outlier guard, stop, sizing and one active position. Thus “independent” refers to **entry triggers under those shared rules**, not unconditioned evidence about each confluence in isolation.

- `ma`: current candle touches and closes back across simple 14-bar tick-VWMA or 200 EMA, in trend.
- `continuation`: prior candle opposite trend and current close beyond its high/low, in trend; not the full Pullback Strategy.
- `sweep`: current wick exceeds the prior 10-bar low/high and closes back across that level, in trend.
- `fvg`: first retest of a previously formed FVG, in trend. This is a research comparator, not a required rule in the default app.
- `ma_or_fvg`: old v2 baseline. `ma_and_sweep` and `ma_and_continuation` require both listed triggers on the same candle; `continuation_or_sweep` requires either.

## Development results

| Trigger | Closed | Wins / losses* | Win rate* | Net $ | Profit factor | Max closed DD | Ambiguous | Open at end |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| ma_or_fvg | 15 | 7 / 8 | 46.7% | +16.01 | 1.14 | 4.65% | 1 | yes |
| ma | 15 | 7 / 8 | 46.7% | +11.52 | 1.10 | 6.56% | 1 | yes |
| continuation | 8 | 4 / 4 | 50.0% | +4.89 | 1.07 | 3.25% | 0 | no |
| sweep | 11 | 1 / 10 | 9.1% | -135.16 | 0.14 | 13.77% | 0 | no |
| fvg | 1 | 0 / 1 | 0.0% | -15.76 | 0.00 | 1.58% | 0 | no |
| ma_and_sweep | 5 | 1 / 4 | 20.0% | -37.25 | 0.38 | 5.86% | 0 | no |
| ma_and_continuation | 3 | 1 / 2 | 33.3% | -15.09 | 0.50 | 2.99% | 0 | no |
| continuation_or_sweep | 17 | 5 / 12 | 29.4% | -97.72 | 0.49 | 10.04% | 0 | no |

*Losses include ambiguous outcomes assumed to hit the stop. All sample sizes are small. Open trades were neither forced closed nor counted in net results; because each run has a different trade path, trigger results are not matched independent observations. More combinations were examined, so choosing the best-looking result afterward would introduce selection bias.

## Later chronological check

| Trigger | Closed | Wins / losses* | Win rate* | Net $ | Profit factor | Max closed DD | Ambiguous | Open at end |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| ma_or_fvg | 7 | 3 / 4 | 42.9% | -0.14 | 1.00 | 3.39% | 1 | no |
| ma | 7 | 3 / 4 | 42.9% | -0.14 | 1.00 | 3.39% | 1 | no |

No combination met the training-selection threshold. The old baseline and MA-only default are shown here because the latter was directly requested, not because it passed selection. They happened to generate the same seven closed trades in this check; that does not mean FVG is irrelevant in general. Since part of this period had already been inspected, these figures are a chronological comparison, not an untouched final validation.

## Decision checklist and near misses

The chart's **Sniper Simulator → Decision checklist & near misses** displays the most recent completed candle's checks: session, daily limit, volume, ATR, shock guard, data continuity, internal trend, EMA alignment, protected swing, directional close, selected trigger, FVG, MA, continuation proxy, sweep, stop and lot validity. `not evaluated` is not a pass. A position/order already active is separately marked. The **Download decision CSV** button records each visited candle's decision-time checks and status; it retains at most the latest 5,000 rows and reports how many earlier rows were dropped. Signals are plans, not necessarily fills. The companion `triad-combination-decisions.csv` includes the MA-mode killzone decisions for these runs; `triad-combination-trades.csv` includes the simulated closed trade log for all tested modes.

## Next steps

1. Obtain a substantially longer data sample and preserve a genuinely unseen final period; use rolling chronological walk-forward evaluation rather than repeated tuning on October.
2. Define and validate your **actual** anchor/grab/closing-break sequence with explicit timing, then separately define 1D/4H context and LTF MSS. Avoid calling the simple proxy the full strategy.
3. Study why the protected stop or MA trigger rejects each near miss; test entry timing, spread and swing-stop alternatives as separate hypotheses with costs and slippage stress. Do not force a daily quota or tighten invalidation just to increase frequency.
4. Add actual executable bid/ask, commission, mark-to-market equity drawdown, margin and finer data for ambiguous bars. The current volatility shock pause detects outliers only **after** their candle closes and cannot identify or anticipate CPI/PPI.

This is research software, not a verified live-trading system; it does not guarantee predictions, protection from news, or profitability. An older unrelated replay test has an existing stop-price assertion failure, so the legacy replay and other sniper profiles should not be treated as validated by these Triad-specific tests.

Reproduce using `node research/study_triad_combinations.cjs` from the repository root with dependencies installed and the private OANDA snapshot at `research/data/oanda-xau-m15-jul-oct2026.json`. No API credentials are included in this report or the study script.
