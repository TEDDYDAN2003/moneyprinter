# Liquidity sweeps and consolidation: VWMA research, 2023–2025

## Result in brief

A **compressed-range breakout combined with the previously studied VWMA reaction** produced positive modeled net P&L in all three observed years, but only **13, 20 and 26 trades**. It was chosen after comparing multiple filters, so these results are selection-biased and the samples are too small to establish an edge. It also fails the earlier minimum-frequency and sample-size screening rules. **It is a research hypothesis, not a live algorithm or a daily-trade solution.**

In the original diagnostic trade stream, the simple same-direction sweep definition was not consistently helpful. Trades whose signal closed inside a compressed range were weak in 2023 and 2024, but profitable in 2025. These are descriptive associations, not proof that sweeps or consolidation caused the outcomes.

## Data, strategy and trading-day constraint

The study uses the same 70,946 real OANDA practice XAU/USD M15 bid/ask/mid candles from **2023–2025 only**, SHA-256 `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`, and the actual Moneyprinter range/body-proxy VWMA chart line—not tick-volume VWMA or No-Wick. No orders were placed and the website indicator was not modified.

Each year starts with $1,000. The prior study's diagnostic entry is an EMA200-direction-aligned line reaction with H4 EMA alignment. A second base adds the prior research filter requiring the signal close to be at least 0.5 ATR on the trade side of the previous chart line. Both use a confirmed 3-bar swing stop and structural target, or 1.5R fallback; FVG is not required. This is a specific research proxy, not the full discretionary Moneyprinter strategy.

Positions are closed by **12:45 p.m. New York time** on the same weekday; that is an intentionally early cutoff selected after inspecting the historical data, not a verified forward broker schedule. No modeled trade in the 3,897 exported comparison records crossed a missing price interval. An unexpected gap is marked unknown in the simulator, not silently filled. In live markets, holiday schedules, outages and slippage can still prevent a timely exit.

Base costs: historical bid/ask, $0.10/oz slippage on entry and exit, and an **illustrative** $7 round-turn commission per standard lot. One position at a time, at most two entries per UTC day, max 0.05 lot and 0.01 lot steps. Planned risk is at most 2% of current balance including estimated exit slippage and commission; realized loss can exceed it. Target fills include a conservative slippage penalty; this is not literal guaranteed limit execution. No financing, margin liquidation, broker-specific contract or market-depth model.

## Exact definitions: causal features, not market-wide liquidity

**Sweep:** For each completed M15 candle, compare its high/low with the preceding 20 contiguous candles. A bullish sweep occurs when its low goes strictly below the prior low and the candle closes back above that low; a bearish sweep is a strict break above the prior high and a close back below. The study labels a sweep **same direction** or **opposing** relative to the trade if it occurred on the decision candle or one of the preceding three completed candles. A longer contiguous history is required; unavailable history is not treated as 'no sweep'. This detects a price-pattern proxy, not actual order-book liquidity or proof of institutional activity.

**Consolidation:** Before the signal candle, calculate the high-to-low span of the previous 12 contiguous M15 candles. A compressed box has width no more than **3 × the prior-only ATR**. If the signal close is beyond the relevant edge in the trade direction, label it a same-direction breakout; if still between the edges, label it inside the box. Otherwise it is not compressed or an opposite breakout. The signal candle is **not** included in drawing its own box; both its close and any sweep on it are known only after it finishes. Signal decisions occur at that close and entry is modeled at the next open, with slippage.

These fixed definitions cover only one kind of sweep and one kind of range. They do not establish that other liquidity zones, session highs/lows, equal highs/lows, or other consolidation methods have the same behavior. ATR windows and chart-history availability follow the prior replay.

## What happened in existing trades?

The following are subsets of the **original diagnostic trades**, not independent accounts with a filter applied. Totals use sequential position sizes and can be confounded by sessions, volatility and other features. They should not be interpreted as causal effects or added across categories.

| Original diagnostic subset | 2023 trades / win rate / net | 2024 trades / win rate / net | 2025 trades / win rate / net |
|---|---|---|---|
| Same-direction recent sweep | 34 / 14.71% / −$182.22 | 40 / 30.00% / −$94.67 | 38 / 42.11% / +$32.35 |
| No same-direction recent sweep | 147 / 38.78% / −$234.37 | 176 / 45.45% / −$25.69 | 174 / 52.30% / +$336.66 |
| Signal close inside compressed box | 60 / 28.33% / −$204.19 | 49 / 32.65% / −$138.19 | 59 / 52.54% / +$211.83 |
| Same-direction breakout of compressed box | 9 / 55.56% / +$27.74 | 12 / 41.67% / +$26.41 | 17 / 47.06% / +$8.74 |

The apparent weakness of same-direction sweeps differs by year and depends on this exact definition. Opposing-sweep groups also changed character: on the original diagnostic, they lost $165.56 in 2023 but gained $140.19 in 2024. **Do not interpret a sweep as automatic confirmation or automatic rejection.**

## Full sequential filter replays

These comparisons rerun the entire account, so filtering can change later eligible trades, lot sizes and balances. Each row is a separate $1,000 annual account.

| Base and filter | 2023: trades / net / PF | 2024: trades / net / PF | 2025: trades / net / PF |
|---|---|---|---|
| H4 diagnostic, no added filter | 181 / −$416.59 / 0.637 | 216 / −$120.35 / 0.918 | 212 / +$369.00 / 1.246 |
| Diagnostic + same-direction sweep required | 42 / −$215.99 / 0.251 | 50 / −$33.73 / 0.906 | 43 / +$4.88 / 1.015 |
| Diagnostic + avoid entries inside a compressed box | 143 / −$236.51 / 0.732 | 189 / +$31.20 / 1.024 | 166 / +$162.55 / 1.142 |
| Diagnostic + compressed-box breakout required | 16 / +$89.70 / 1.783 | 25 / −$30.42 / 0.856 | 32 / +$72.77 / 1.336 |
| 0.5 ATR line-filter base, no added filter | 110 / −$136.45 / 0.808 | 147 / +$85.15 / 1.078 | 137 / +$61.10 / 1.060 |
| Line-filter base + avoid entries inside a compressed box | 90 / −$59.07 / 0.895 | 123 / +$65.63 / 1.074 | 113 / +$38.62 / 1.046 |
| Line-filter base + compressed-box breakout required | 13 / +$123.58 / 2.704 | 20 / +$34.03 / 1.223 | 26 / +$83.19 / 1.488 |

Additional pre-specified replay filters—avoid recent opposing sweep, avoid any compressed box, and same-direction sweep plus not-inside-box—are in the scenario CSV. Across **12 added-filter/base combinations**, none passed the earlier screen in both 2023 and 2024: ≥75 trades, positive net, PF ≥1.05, floating-DD proxy ≤25%, and ≥0.5 resolved trades per available session day. The screen is a research convention, not a safety guarantee. It now uses a floating-DD proxy, whereas the older screen used closed-balance DD.

The line-filter + breakout variant was the **retrospectively best minimum annual net** across 2023 and 2024 among those 12 comparisons. Although positive, it fails the sample-size and frequency rules. It had 8/13 wins in 2023, 10/20 in 2024 and 14/26 in 2025. It traded on only **13/255, 20/259 and 26/258 available session days** respectively—242, 239 and 232 days without an entry. It cannot satisfy the desire for one trade each day.

## Cost and definition sensitivity

A combined adverse execution scenario assumes $0.30/oz slippage on both entry and exit, $10 round-turn commission per standard lot and an extra $0.50/oz adverse slippage on every stop. The line-filter + breakout replay produced +$75.65 / +$35.17 / +$85.89 for 2023 / 2024 / 2025, but on only 13 / 20 / 24 trades. Stress changes fills, sizes, valid setups and later account paths; the fact that some stressed annual results are higher does **not** mean higher costs improve execution.

To check sensitivity, changing the maximum box width from 3 ATR to 2.5 ATR produced only 3 / 10 / 10 trades and +$36.07 / +$11.22 / +$29.11. A 3.5 ATR width gave 21 / 34 / 34 trades and +$179.27 / +$38.15 / +$36.17. These are very small, already-inspected samples; neighboring-width results do not establish robustness.

The floating drawdown statistic uses adverse intrabar bid/ask OHLC and estimated costs relative to peaks from opens, closes and realized balances. The candle's adverse extreme may occur after an unknown exit, and favorable intrabar peaks are omitted. It is a stress proxy, not an exact maximum drawdown or a proven upper bound.

## Interpretation and next step

The information supports recording consolidation context and investigating the breakout hypothesis; it does **not** support requiring a liquidity sweep or automatically deploying the breakout filter. The prior research already inspected all three years; 2023–24 were used here to select a retrospective winner and 2025 was already seen in earlier research. **No year in this report is a genuinely untouched forward holdout.** Multiple comparisons and threshold choices increase the risk of overfitting.

A sensible next experiment is to freeze the definitions and execution rules, confirm the actual broker's contract, fees and holiday hours, and test on a later genuinely unseen chronological period or prospectively in demo—without forcing low-quality daily setups. The indicator and live execution remain unchanged.

## Files and validation

- `vwma-liquidity-scenarios-2023-2025.csv` — all 42 annual base/filter results.
- `vwma-liquidity-trade-groups-2023-2025.csv` — sweep and box context within the unfiltered trade streams.
- `vwma-liquidity-trades-2023-2025.csv` — all base-cost trades across filter variants, including known box and sweep context.
- `vwma-liquidity-stress-2023-2025.csv` and `vwma-liquidity-box-sensitivity.csv` — stress and box-width checks.
- Reproduce from the private OANDA and chart snapshots with `PYTHONPATH=research/ml python research/ml/liquidity_consolidation_2023_2025.py`. The shared candidate module rewrites ignored intermediate results.
- Twelve unit tests passed, including sweep reclaim, no-future-data, missing-history, DST and execution cases. The new features matched a 5,000-bar prefix against the full real-data calculation. A separate audit checked the 3,897 exported trade rows for cutoff, no unknown gaps, daily caps and planned-risk arithmetic. These checks do not establish profitability or live execution quality.
