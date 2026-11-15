# More VWMA opportunities: four complementary setup tests

## Result

The additional definitions did generate more modeled entries, but **they did not produce a reliable improvement**. Combining all five setup types increased the number of entry days substantially, yet the combined account lost money in **all three** observed years. The original compressed-range breakout was the only standalone setup with positive base-case net in all three years, and it remained too infrequent to establish a robust edge.

This is not a finding that all possible retests, pullbacks, continuations or sweeps fail; it is the result for the explicit definitions and execution assumptions below. No live trading algorithm or displayed chart indicator was changed.

## Data, execution and account

- **Only 2023–2025:** the same 70,946 real OANDA practice XAU/USD M15 midpoint, bid and ask candles, SHA-256 `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`. The actual Moneyprinter range/body-proxy VWMA chart line was used, not tick-volume VWMA or No-Wick. No synthetic market data or 2026 data was used.
- Each year is a separately reset $1,000 account. One position at a time, at most two entries per UTC day, maximum 0.05 standard lot, 0.01 lot steps. Planned stop risk is ≤2% of current balance including assumed exit slippage and commission; actual losses may exceed it.
- Base costs: historical bid/ask, $0.10/oz slippage per side, plus an **illustrative**, unverified $7 round-turn commission per standard lot. Target fills include an adverse penalty and do not literally represent limit-order mechanics. No financing, margin liquidation, depth or broker-specific lot or fee verification.
- Base signals must occur in the existing fixed-UTC London/overlap/NY windows, with completed H4 EMA50/EMA200 direction and the M15 EMA200 side aligned, and pass the prior large-candle pause. That pause is not an economic calendar.
- All recorded base-case trades exited on the same New York weekday by **12:45 p.m. New York time**; none encountered a missing interval. This cutoff was deliberately chosen after inspecting historical gaps and is considerably earlier than ordinary market close. It is not a verified future broker/holiday schedule. Unexpected gaps are marked unknown, not fabricated; an actual order may fail to fill before a break.
- Stops use the most recent confirmed 3-left/3-right swing known at the signal close, buffered by max($0.20, 0.15 ATR); the opposing confirmed swing is the target if 1–3R away, otherwise 1.5R. A new setup recalculates the currently confirmed swing stop, but the swing itself need not have formed after the first breakout. A next-open fill with invalid stop geometry or risk above $25/oz is rejected. Both-hit candles use the stop first.
- Floating DD is an OHLC-based stress proxy: it uses adverse intrabar bid/ask extremes but not favorable intrabar peaks, and the adverse extreme may have occurred after an unknowable exit. It is neither exact maximum drawdown nor a guaranteed upper bound.

## Setup definitions

These are objective proxies, not the complete discretionary Moneyprinter Pullback or Liquidity Sweep strategies. Inputs use only information available at the decision candle close.

1. **Existing breakout reference:** H4-aligned VWMA reaction plus at least 0.5 ATR displacement from the prior chart line; the preceding 12 contiguous candles form a box no wider than 3 ATR, and the decision candle closes beyond the box in the trade direction.
2. **Breakout and retest:** After a close breaks a preceding 12-candle compressed box, watch up to eight subsequent M15 candles, stopping at a date change, missing bar or expiry. Require a later directional candle to touch the old box edge within 0.1 ATR **or** the previous VWMA line, close back on the breakout side of the edge, and finish on the trend side of the VWMA and EMA200 with H4 direction aligned. This does not require a fill on the original breakout.
3. **Trend pullback:** A directional M15 candle touches the previous VWMA line and closes on the trend side of it, with EMA200 and completed H4 EMA50/EMA200 alignment. A compressed box is not required. This resembles the prior diagnostic reaction proxy, with small differences in candidate classification.
4. **Consolidation continuation:** Within 5–12 candles after an identified compressed-box breakout, the preceding four post-breakout candles must span ≤2 ATR; the current directional candle closes past their extreme in the original breakout direction, with VWMA, EMA200 and H4 alignment. This is a **later continuation opportunity**, not proof that an earlier breakout trade was entered or exited. It recalculates the known structural stop at the new signal.
5. **Liquidity-sweep reversal:** A candle breaches the previous confirmed swing high/low and closes back through it; on that candle or one of the next three contiguous same-New-York-day candles, a directional close must confirm on the appropriate VWMA and EMA200 side with H4 trend alignment. The swing is the level confirmed before the sweep candle. This is an observable price-pattern proxy, not verified order-book liquidity. It does not test session-high/session-low sweeps.

Events are discarded if the required history is missing. Breakout and sweep timers reset at a missing bar or New York date change. The prior chart line, ATR and confirmed pivots are available before the signal; the signal candle itself must complete before an entry at the next open. Stops, targets, and position sizing are evaluated with the same simulator for every setup.

## Individual strategies: base costs

Each cell is **trades / net / profit factor / floating-DD proxy**. Entry-day counts follow in the next table.

| Standalone setup | 2023 | 2024 | 2025 |
|---|---|---|---|
| Existing breakout reference | 13 / +$123.58 / 2.704 / 6.32% | 20 / +$34.03 / 1.223 / 5.28% | 26 / +$83.19 / 1.488 / 5.22% |
| Breakout and retest | 54 / −$236.87 / 0.490 / 29.78% | 97 / +$45.19 / 1.062 / 15.28% | 69 / −$1.88 / 0.996 / 15.28% |
| Trend pullback | 188 / −$427.63 / 0.641 / 43.87% | 233 / −$42.38 / 0.974 / 21.93% | 220 / +$264.22 / 1.164 / 27.66% |
| Consolidation continuation | 23 / −$16.14 / 0.906 / 7.18% | 26 / −$70.68 / 0.638 / 9.49% | 21 / +$10.93 / 1.084 / 8.40% |
| Swing-sweep reversal | 144 / −$296.71 / 0.679 / 35.04% | 168 / −$353.66 / 0.692 / 39.86% | 155 / −$468.28 / 0.605 / 49.33% |

More signals did not translate into reliably profitable trades. In particular, this swing-sweep reversal proxy lost in all three years; that does not invalidate other sweep definitions. The continuation sample is small and negative in two years.

| Setup | 2023 entry days / 255 | 2024 entry days / 259 | 2025 entry days / 258 |
|---|---:|---:|---:|
| Existing breakout | 13 | 20 | 26 |
| Breakout and retest | 49 | 85 | 67 |
| Trend pullback | 132 | 168 | 165 |
| Consolidation continuation | 22 | 26 | 20 |
| Swing-sweep reversal | 104 | 119 | 108 |
| All five combined | 146 | 178 | 167 |

A session day is based on available fixed-window bars; counts include indicator warmup. Entry days do not mean a consistent once-per-day opportunity. These are simulated entries, not actual fills.

## Combined replay and overlap

The combined account processes all five setup types in chronological order. If several agree on the same candle, they are one candidate, not multiple trades; deterministic priority for the CSV label is breakout, breakout-retest, trend-pullback, continuation, then swing-sweep. Opposite-direction simultaneous conflicts would be skipped. Multiple labels on the same signal are listed in `all_setups`. Each accepted trade still blocks other entries while open, and the daily cap applies. The priority label is **not causal attribution**: one trade can match multiple definitions.

| Combined result | 2023 | 2024 | 2025 |
|---|---:|---:|---:|
| Candidate bars before execution/account filters | 641 | 816 | 974 |
| Executed trades | 227 | 266 | 246 |
| Win rate | 36.12% | 39.47% | 39.84% |
| Net | −$449.84 | −$303.84 | −$178.54 |
| Profit factor | 0.672 | 0.831 | 0.899 |
| Floating DD proxy | 48.48% | 34.02% | 38.67% |
| Days without any entry | 109/255 | 81/259 | 91/258 |

There were 755 same-direction overlapping signal bars across the entire three-year combined candidate stream. Candidate counts are not tradable-order counts: many were blocked by an existing position, the daily cap, invalid stop geometry or minimum-lot risk. The candidate CSV records first applicable rejection counts; an event may have more than one reason. Combining all the setups materially worsened the 2025 net versus the standalone breakout. The low-frequency breakout itself was partly crowded out by existing positions.

## Smaller combinations and cost stress

| Base-cost combination | 2023 trades / net | 2024 trades / net | 2025 trades / net |
|---|---|---|---|
| Breakout + retest | 56 / −$179.24 | 99 / +$62.77 | 76 / +$75.46 |
| Breakout + trend pullback | 188 / −$427.63 | 233 / −$42.38 | 220 / +$264.22 |
| Breakout + continuation | 31 / +$101.41 | 43 / −$10.33 | 40 / +$34.51 |
| Breakout + swing sweep | 151 / −$214.55 | 176 / −$208.17 | 161 / −$437.20 |

The breakout + continuation combination produced more trades than breakout alone, but it lost in 2024 and had only 31–43 trades per year. It is not evidence of a durable improvement. The breakout + trend-pullback results are identical to trend pullback alone in this sample because their accepted signals overlap under this priority and execution sequence.

Stress uses $0.30/oz entry and exit slippage, $10 per lot round-turn commission and an additional $0.50/oz adverse slippage on every stop. The combined portfolio's 2023 / 2024 / 2025 results become **−$766.95 / −$663.62 / −$523.89**. Breakout + retest becomes −$242.99 / −$90.98 / +$54.82; breakout + continuation becomes +$12.90 / −$37.27 / +$22.56. Costs alter valid stop geometry, sizing and account paths, so stress does not necessarily keep the same trades.

## What to do next

Do not merge these additional filters into live execution just to increase frequency. Retain the sparse original breakout as an **unvalidated research hypothesis**, and investigate why the individual retests and pullbacks lose in 2023 before loosening them. Potential directions include separating first versus repeated retests, measuring the time since breakout, and comparing session-specific behavior—but those would be new hypotheses, not established improvements.

All three years were already inspected before this study; breakout itself was previously chosen retrospectively. No 2023–2025 split can now be called a genuinely untouched final test. Freeze a candidate before prospective/demo testing or use a later genuinely unseen chronological sample when appropriate. Confirm broker-specific hours, margin, spread, commissions and lot size before drawing operational conclusions.

## Files and checks

- `vwma-complementary-scenarios-2023-2025.csv`: standalone and combined annual base/stress metrics, including entry days and floating-DD proxy.
- `vwma-complementary-candidates-2023-2025.csv`: candidate counts and first-reason execution rejections.
- `vwma-complementary-trades-2023-2025.csv`: all base-case sequential trade rows with setup labels, overlaps and account values.
- `vwma-complementary-combined-breakdown.csv`: descriptive priority-label breakdown for the all-five portfolio; overlap means it is not causal attribution.
- Reproduce with `PYTHONPATH=research/ml python research/ml/complementary_vwma_2023_2025.py` after preparing the private OANDA and chart snapshots. Shared research imports rewrite ignored intermediate results.
- Fifteen unit tests passed, including signal deduplication, conflicting directions, feature causality, gap execution and DST. The setup generator produced the same 54 events in the first 4,999 bars when run on a real 5,000-bar prefix versus the full history. A separate audit checked all 3,670 exported base-case rows for same-weekday cutoff, no unknown gaps, planned-risk arithmetic and the two-entry daily cap. Such tests do not prove live fill quality or profitability.
