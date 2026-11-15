# VWMA structure, entries and exits — 2023–2025 OANDA research

## Result in plain language

The research tested **24 predefined combinations** of entry filters, confirmed-swing stops and targets on 2024 and 2025. **None satisfied all of the research qualification rules in both years.** The strongest retrospective comparison improved several displayed metrics in those two years relative to this study's baseline, but it still **lost money in 2024** and then lost more in the separate 2023 backward comparison. It is not a validated strategy or a reliable daily-trade system.

This is a research-only comparison. No No-Wick indicator was used, no orders were sent, and the chart indicator and production trading rules were not changed.

## Data and methodology

- 70,946 completed OANDA practice XAU_USD M15 candles from **2023, 2024 and 2025 only**: 23,563 / 23,736 / 23,647 bars respectively, with midpoint and bid/ask OHLC and OANDA tick volume. January–December 2023 was fetched with the supplied token; the existing 2024–25 OANDA data was reused, all 47,383 bars matching the prior snapshot. No synthetic data and no 2026 data were used. Snapshot SHA-256: `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`.
- The actual Moneyprinter chart VWMA calculation ran on the continuous 2023–25 history, using its default 14 period / 0.15 ATR threshold. Its volume curve is a **range/body price proxy**, not OANDA tick volume. Prefix checks passed. The chart uses viewport slices, so the displayed EMA trend grades can differ from this continuous-history calculation; earlier 300-prior-bar sampling found 19 of 400 signal grades differed. No chart change is implied.
- Candidates are the chart crossover arrows **or** a separate reaction proxy: touch the chart-line value known at the previous close, then close back across it with a direction-matching candle. If an arrow is present on the same candle, it takes precedence and that candidate is categorized as a crossover, not a reaction. Price must be on the direction's side of the 15m EMA200. FVG is not required. The 4h EMA50/EMA200 values used for optional direction filters come only from fully completed 16-candle UTC groups. This is not the full discretionary Moneyprinter Pullback Strategy, MSS, or an order-block model.
- Fixed UTC sessions are London 07:00–10:00 and overlap/NY 12:00–17:00. These do not adjust for daylight-saving time. An outlier pause blocks new entries until 20 minutes after a candle with true range ≥2.5× the previous ATR closes. This **cannot identify CPI/PPI or block before a news release**.

## Entries, stops, targets and costs

Entry filters: (1) baseline crossover/reaction, (2) baseline plus 4h EMA direction, (3) 4h plus directional-close/body confirmation, or (4) 4h plus reaction-only. Stops compare the most recently confirmed 2-left/2-right small pivot versus 3-left/3-right swing, plus max($0.20, 0.15× previous ATR) buffer. Target alternatives are fixed 1R, fixed 1.5R, or the last confirmed opposing 3-bar pivot when 1–3R away, otherwise 1.5R. Pivots are known only after their right-side confirmation; a next-open stop with invalid geometry or >$25/oz risk is rejected.

Each combination uses a separate $1,000 simulated account, at most 0.05 standard lots (100 oz/lot), 0.01 lot increments, a 2% planned risk cap, one active position and up to two entries per UTC day. Next-open entry uses the actual historical OANDA ask/bid side plus $0.10/oz slippage per side; a higher $0.30/oz-per-side stress is shown below. Holding horizon is 48 candles. Same-candle target/stop collisions are conservatively counted as stops. No commission, margin, financing or broker depth model; sizing does not include exit slippage or commissions, so even modeled stop losses can exceed 2%; actual stop losses may be larger still.

**Gaps are a major limitation:** when price history is missing before resolution the trade outcome is unknown and the simulator excludes it, leaving balance unchanged. The baseline excluded 40 positions in 2024 and 38 in 2025; the diagnostic excluded 50 and 32 respectively. These are not risk-free trades and their exclusion can bias returns and drawdowns. Max drawdown is **closed-balance**, not floating-equity drawdown. Period-boundary positions are purged, not carried forward; the purge uses the subsequently observed exit time, so this is a hindsight reporting convention, not a live-executable rule, and can affect which later entries are counted.

## Qualification and selection

For a qualifying candidate, the study required **both 2024 and 2025** to have at least 75 resolved trades, positive net dollars, profit factor at least 1.05, maximum closed-balance drawdown no more than 25%, and at least 0.5 resolved trades per available session day. These are arbitrary research thresholds, not a guarantee. No combination qualified.

For diagnostic purposes only, the table compares the baseline with the variant having the highest **minimum annual net P&L** across the two development years: 4h-aligned, line-reaction-only, 3-bar confirmed swing stop and structural/1.5R-fallback target. This was selected **after comparing 24 variants**, so its development results are selection-biased. It is not promoted or deployed.

| Year and method | Closed trades | Win rate | Net $ | PF | Avg net R | Max closed DD | Gap-excluded | Days with ≥1 simulated entry* |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2024 baseline | 350 | 33.71% | −617.57 | 0.751 | −0.1884 | 63.67% | 40 | 245/259 (94.6%) |
| 2024 diagnostic | 177 | 38.42% | −106.38 | 0.932 | −0.0564 | 17.57% | 50 | 164/259 (63.3%) |
| 2025 baseline | 326 | 43.56% | +202.41 | 1.071 | +0.0492 | 28.55% | 38 | 240/258 (93.0%) |
| 2025 diagnostic | 179 | 46.37% | +313.87 | 1.207 | +0.1026 | 25.75% | 32 | 159/258 (61.6%) |

*Active-day counts include simulated entries whose outcomes are later gap-excluded. In the diagnostic, only 137 of 259 session days in 2024 and 140 of 258 in 2025 had at least one **resolved** trade. It did not deliver one resolved trade every day. Session days are measured from available bars; 2023 includes initial indicator warmup. More trades and a higher win rate do not by themselves establish profitability.

## Backward 2023 check

The diagnostic was chosen with knowledge of 2024–25, then applied unchanged to **earlier** 2023. That is a backward cross-regime comparison, **not** a prospective unseen forward test. The 2023 start also lacks pre-2023 4h EMA warmup.

| 2023 method | Closed | Win rate | Net $ | PF | Avg net R | Max closed DD | Gap-excluded | Days with ≥1 simulated entry* |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 301 | 31.23% | −695.59 | 0.604 | −0.2771 | 70.19% | 38 | 204/255 (80.0%) |
| Diagnostic | 148 | 29.05% | −477.57 | 0.570 | −0.3402 | 47.76% | 30 | 126/255 (49.4%) |

The diagnostic lost less in total partly because it took fewer trades; **its 2023 average R and profit factor were worse**. It cannot be called a robust improvement across all three years.

## Execution sensitivity

At $0.30/oz slippage per side, the diagnostic returned −$300.84 in 2024 (PF 0.785, max closed DD 30.66%) and +$205.04 in 2025 (PF 1.142, max closed DD 25.13%). The baseline returned −$725.29 and −$387.97 respectively under this stress. Trade counts differ as risk sizing, outcomes and daily limits affect later entries. These are still modeled fills, with gaps excluded.

## What this means for the next iteration

The most promising **hypothesis**, not an approved rule, is to study trend-aligned reactions to the indicator line with a confirmed structural stop. It increased the 2025 displayed win rate and reduced the 2024 loss relative to the selected baseline, but it failed the positive-profit requirement in 2024, failed the 2023 check, traded on far fewer days, and is sensitive to costs. We should not force a trade daily to increase frequency.

Before further optimization: resolve gap and margin modeling, log the specific structure/MA/candle context for every near miss, and test independently defined entry/stop/target changes in a later genuinely unseen chronological period. Because 2023 precedes the selection years and 2024–25 were used to choose the diagnostic, **none of those three years is a final forward holdout**. You can choose a future unseen dataset when ready. A verified calendar is required to distinguish CPI/PPI from ordinary large swings.

## Audit files and reproduction

`vwma-structure-variants-2024-2025.csv` contains all 24 combinations and both development years. `vwma-structure-research-trades.csv` contains individual baseline and diagnostic trade records for all three years; blank P&L indicates an unresolved gap, not zero risk. The chart and strategy remain untouched.

After fetching the private 2023–25 snapshot with `research/ml/fetch_2023_2025.py` and an environment-only OANDA token, run `node research/ml/extract_chart_2023_2025.cjs` and `python research/ml/structure_2023_2025.py`. Node's chart calculation passed a 5,000-bar prefix test. Historical p3 stop/target execution was cross-checked against the prior simulator on 932 real events; p2 event logic was cross-checked on 313 sampled setups. These tests do not validate live fills, all market conditions or profitability. Credentials and raw private snapshots remain uncommitted.
