# Systematic VWMA algorithm search: 2023–2025

## Bottom line

I expanded the research to **81 fixed configurations** and ran each for 2023, 2024 and 2025 under both base and stressed costs: **486 annual account replays**. No configuration met the research qualification screen in **both 2023 and 2024**. Consequently, none met the additional requirement of passing the same screen under stressed costs in those development years.

The old compressed-box breakout remained profitable in the base-case replay in each year, but had only **13, 20 and 26 trades**. It is a hypothesis worth **prospective testing**, not a validated or daily-trade system. The strongest higher-sample retrospective diagnostic nearly broke even in 2023–24, but **lost $334.50 in 2025** and was also negative under cost stress. It is not suitable for promotion.

No finite study can exhaust every possible trading rule. These results cover the explicitly listed search space, on the same already-inspected history and assumptions as previous work—not every conceivable pattern. No live algorithm, indicator or checklist was changed.

## Data and execution assumptions

The study uses the existing **2023–2025 only** OANDA practice XAU/USD M15 history: 70,946 completed bid/ask/mid candles, SHA-256 `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`. The actual Moneyprinter range/body-proxy VWMA calculation is used, not a tick-volume substitution or No-Wick. No orders were placed and no synthetic market-data outcomes or 2026 candles were used. H4 features in early 2023 lack pre-2023 warmup.

- Separate $1,000 account each year; one position at a time; maximum two entries per UTC day; 0.05 standard lot maximum in 0.01 lot increments.
- Planned stop risk ≤2% of current balance including estimated exit slippage and commission; actual loss can exceed planned risk. Base costs are historical bid/ask, $0.10/oz slippage per side, and an **illustrative** $7 round-turn commission per lot. Stops use a confirmed swing plus buffer, target a confirmed opposing swing if 1–3R away or 1.5R otherwise. Same-bar stop/target collisions count as stops.
- Stress assumes $0.30/oz slippage per side, $10 round-turn commission per lot, and an additional $0.50/oz adverse slippage on stop fills. Stress can change eligible fills, size and the subsequent account path.
- Positions are closed by **12:45 p.m. New York time** on the same weekday. This deliberately early cutoff was chosen after inspecting historical gaps; it is not a verified future broker/holiday schedule. It may remove opportunities before the normal end of trading. Unexpected gaps are unknown, not fabricated; real execution may fail to close before a break.
- Floating drawdown is an OHLC-based stress proxy using adverse intrabar bid/ask extremes, but not favorable intrabar peaks. An adverse extreme may occur after an unknowable intrabar exit. It is not exact maximum drawdown or a guaranteed upper bound. Margin liquidation, financing, depth, real broker fees, verified CPI/PPI and broker-specific schedule are not modeled.

## Search space

The fixed list comprises **five candidate streams × 16 filters, plus the earlier breakout reference**. Fixed UTC sessions, completed H4 trend alignment, prior chart-line values, confirmed swings and the existing large-candle pause are inherited from the prior intraday replay. The pause is not a news calendar.

**Streams:**
1. Trend-aligned reaction/pullback to the prior VWMA line.
2. Retest of a previously broken 12-bar compressed box edge or VWMA within eight candles.
3. Reclaim of a previously confirmed swing followed by VWMA/trend alignment.
4. One-candle-delayed confirmation after the trend pullback.
5. The prior five-setup combined candidate stream, deduplicated on the same candle with one-position and daily limits.

**Filters:** no additional filter; line displacement ≥0.5 ATR; ADX ≥25; ADX ≥20 plus directional-index alignment; strong directional body/close position; close beyond the prior candle extreme; ATR ratio 0.8–1.2; no recent same-direction 20-bar-range sweep; avoid closing inside a compressed prior box; and the seven explicitly coded two-condition combinations of line/ADX/body/box/sweep/ATR or prior-extreme/body. Missing sweep or box history is **not** treated as absence of a sweep or consolidation. Feature definitions, thresholds and logic are in `research/ml/systematic_vwma_search_2023_2025.py` and the preceding entry-hypothesis report. The study does not exhaust different targets, fills, higher-timeframe definitions, news rules or all combinations.

The reference breakout is the previously studied H4-aligned VWMA reaction, 0.5 ATR line displacement and close beyond a preceding compressed box; it was previously chosen retrospectively. It is not a fresh independent discovery.

## Qualification screen

For **each** of 2023 and 2024 at base costs, a candidate had to have at least 75 resolved trades, at least 0.5 resolved trades per available session day, positive net, PF ≥1.05, floating-DD proxy ≤25%, and no unknown gap outcomes. Metrics are screened at the rounded precision in the output CSV. A separate stricter count also required those criteria in both years under stressed costs. These are arbitrary research thresholds, not a guarantee.

| Screen | Result |
|---|---:|
| Configurations tested | 81 |
| Annual base/stress replays | 486 |
| Pass both 2023 and 2024 at base costs | **0** |
| Pass both years at base and stressed costs | **0** |
| Pass the same screen in 2025 alone | 3, but all failed the 2023–24 screen |

A 2025-only pass after comparing many variants is not evidence of a stable edge. All years have been examined repeatedly; **2025 is not an untouched holdout**. The 2023–24 screen and later 2025 comparison are chronological reporting conventions, not a truly blind forward experiment.

## Retrospective diagnostic—not a promoted strategy

For a useful high-sample comparison despite zero qualifiers, the script selects the configuration with the best minimum annual net across 2023 and 2024, **subject to at least 50 trades in each of those years**. Selection uses the two development-year results only, but the history and candidate definitions were previously inspected. The chosen diagnostic is:

> Confirmed-swing sweep/reclaim with H4/VWMA alignment, signal close ≥0.5 ATR beyond the prior VWMA line, and **no recent same-direction sweep of the previous 20-bar range**.

The last condition is not a logical contradiction: the entry sweep is of a previously confirmed pivot; the separate exclusion looks for a rolling-20-bar-range sweep. Both are price-pattern proxies, not observed institutional order-book liquidity.

| Year / cost | Trades | Win rate | Net | PF | Floating DD proxy | Entry days |
|---|---:|---:|---:|---:|---:|---:|
| 2023 base | 85 | 44.71% | −$10.75 | 0.980 | 20.94% | 74/255 |
| 2024 base | 90 | 44.44% | +$11.38 | 1.017 | 13.71% | 74/259 |
| 2025 base | 82 | 31.71% | −$334.50 | 0.525 | 35.88% | 68/258 |
| 2023 stress | 84 | 40.48% | −$298.85 | 0.547 | 33.51% | 74/255 |
| 2024 stress | 86 | 40.70% | −$137.32 | 0.800 | 16.66% | 72/259 |
| 2025 stress | 77 | 32.47% | −$384.23 | 0.415 | 39.99% | 64/258 |

It fails positive net and PF in 2023, PF in 2024, the required 0.5 trades/session-day in both years, and the stressed tests. It also deteriorates sharply in the already-observed 2025 comparison. **Do not deploy it.** Monthly grouping of its realized results was positive in 4 of 10 months with trades in 2023, 7 of 12 in 2024 and 1 of 12 in 2025; these are descriptive and ignore no-trade months.

## Earlier breakout reference and frequency

| Year | Trades | Net | PF | Floating DD proxy | Entry days |
|---|---:|---:|---:|---:|---:|
| 2023 | 13 | +$123.58 | 2.704 | 6.32% | 13/255 |
| 2024 | 20 | +$34.03 | 1.223 | 5.28% | 20/259 |
| 2025 | 26 | +$83.19 | 1.488 | 5.22% | 26/258 |

This reference has the highest minimum 2023/24 net **without** a sample-size restriction, but fails the minimum trade-count and frequency requirements. Stress results were +$75.65 / +$35.17 / +$85.89; because costs alter fills and later sizing, a higher stressed annual net does not mean worse costs improve execution. The samples remain small and selection-biased. This is the only pattern in this search that should be retained as a **hypothesis for observation**, not an automatic trade rule.

For context, the unfiltered combined stream took 227 / 266 / 246 trades and returned −$449.84 / −$303.84 / −$178.54. More entries did not mean more profitable trades. The higher-frequency 2025-only screen passers also lost in at least one development year. The ranking CSV includes all variants, not only favorable results.

## What would make further work meaningful?

1. **Verify the broker's actual XAU/USD contract, spread, commission, margin and holiday hours.** The conservative historical cutoff is a strong assumption, and a real close schedule could change the opportunity set. Do not assume a later close without verified data.
2. **Freeze a single research hypothesis**—for example the prior box breakout—and collect prospective demo observations or use a genuinely untouched later chronological dataset when authorized. Do not retune after seeing it and still call it unseen.
3. Record first/later retests, spread, stop distance, swing and volatility context at decision time, including rejected and overlapping signals. A verified event calendar is needed before drawing CPI/PPI conclusions.
4. Keep the live indicator and trading rules unchanged until sample size, costs, drawdown and genuinely independent performance justify a change. Do not force trades on no-signal days.

## Outputs and validation

- `vwma-systematic-search-results-2023-2025.csv`: all 486 annual base/stress results, including trade count, net, PF, drawdown and entry days.
- `vwma-systematic-search-ranking.csv`: all 81 configurations, development-year screen flags and 2025 comparison; `selected_diagnostic` is retrospective, not a deployment flag.
- `vwma-systematic-search-selected-trades.csv`: individual base-cost trades for the chosen diagnostic and three benchmark streams.
- `vwma-systematic-search-monthly.csv`: monthly realized P&L and trade counts for those same streams; zero trades is not a positive month.
- Reproduce with `PYTHONPATH=research/ml python research/ml/systematic_vwma_search_2023_2025.py` after preparing the private OANDA and chart snapshots. Shared candidate imports regenerate ignored intermediate data.
- Twenty-seven unit tests passed. The 16 filter decisions and delayed-confirmation signals matched between the full real-data calculation and a 5,000-bar prefix. A separate audit checked all 1,696 exported selected/benchmark trade rows for same-weekday cutoff, no unknown gaps, planned-risk arithmetic and daily caps. These checks do not prove live fill quality, absence of all implementation defects or profitability.
