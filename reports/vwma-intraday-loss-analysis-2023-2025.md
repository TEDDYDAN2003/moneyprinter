# VWMA intraday loss analysis: 2023–2025

## Your no-overnight rule

This replay closes every modeled position **by 12:45 p.m. New York time**, and does not enter after that deadline. That is 16:45 UTC during New York daylight saving and 17:45 UTC in winter; in East Africa it is 19:45 or 20:45 respectively. All 4,289 recorded base-cost comparison trades exited on the same New York weekday as their entry, and **none encountered a missing interval while open**. No positions were intentionally held across daily breaks or weekends.

The cutoff is deliberately **much earlier** than the ordinary 5 p.m. New York close. It was chosen after examining these historical candles to precede the earliest observed early closing time; it is a conservative research convention, not a verified future broker schedule. It sacrifices late-session opportunities. Other holidays, outages or broker-specific hours could still cause an unexpected gap; the code labels such an outcome unknown, rather than pretending a scheduled exit was filled. A live implementation would require the actual broker's current holiday and product hours and an earlier execution buffer. A candle-close fill at exactly 12:45 is an assumption, not a guarantee.

## The result

The revised diagnostic still lost in both years you asked about. It made a profit in 2025, but 2025 has already been inspected and is **not** an unseen test. Dollar results start a fresh $1,000 account each year.

| Year | Trades | Wins | Win rate | Net | Profit factor | Floating DD proxy | Days with entry |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2023 | 181 | 62 | 34.25% | −$416.59 | 0.637 | 42.51% | 127/255 |
| 2024 | 216 | 92 | 42.59% | −$120.35 | 0.918 | 24.51% | 159/259 |
| 2025 | 212 | 107 | 50.47% | +$369.00 | 1.246 | 22.47% | 159/258 |

The baseline, which also permits chart crossovers and does not require H4 alignment, returned −$692.26, −$599.19 and +$315.91 respectively. These new numbers are not directly comparable to the prior hold-through-gap report because the exit rule and selected trades changed.

## Why were 2023 and 2024 losing?

We can describe the losing trades, but historical associations do not prove a single cause. In 2023 the diagnostic won only 62 of 181 trades. The average winner was $11.81 and the average loser was −$9.66; the greater average winner was not enough to offset the much larger number of losses. There were 100 stop/ambiguous-stop outcomes (including one open stop) versus 39 target outcomes; 42 were closed at the deadline. In 2024, 92 winners and 124 non-winners produced an average winner of $14.66 and an average loser of −$11.85. There were 102 stop/ambiguous-stop outcomes versus 55 target outcomes, with 59 deadline exits. Deadline exits can be winners or losers; result types and profit signs are different categories.

Patterns in the existing diagnostic trade stream:

| Group | 2023 | 2024 |
|---|---|---|
| Close **under 0.5 ATR** from the prior chart line | 103 trades, 29.1% wins, −$341.94, PF 0.520 | 105 trades, 42.9% wins, −$94.58, PF 0.866 |
| Close **0.5–1 ATR** from the prior chart line | 59 trades, 42.4% wins, −$24.11, PF 0.925 | 81 trades, 45.7% wins, +$19.48, PF 1.037 |
| Planned entry-to-stop distance **under 1 ATR** | 21 trades, 1 win, −$113.66, PF 0.057 | 22 trades, 9 wins, −$4.34, PF 0.963 |
| Planned entry-to-stop distance **at least 2 ATR** | 108 trades, 42.6% wins, −$75.32, PF 0.878 | 137 trades, 46.0% wins, −$32.11, PF 0.963 |

The line distance is direction-adjusted from the previous candle's known chart-line value, measured at the decision close and divided by the previously calculated ATR. The stop distance uses the next-open entry, so it is not known at the preceding candle close. The <1 ATR result is particularly weak in 2023 but has only 21 trades, and it did **not** repeat nearly as strongly in 2024.

London and overlap both lost in both years; NY was small (23 and 29 trades) and mixed. The diagnostic requires H4 alignment, so its aligned trades alone cannot establish that H4 alignment caused better results. A small 2023 wide-swing group performed well but contained only eight trades and did not repeat in 2024. Full breakdowns of session, H4, candle body, volatility, swing range, stop, and exit outcome are in the group CSV. Dollar group totals are affected by sequential sizing and should not be combined across overlapping groups.

## Tested improvements

Using hypotheses motivated by the earlier analysis, we ran the **full sequential replay again**, rather than merely deleting losing trades after the fact. The starting diagnostic already requires an H4-aligned reaction to the actual chart line, EMA200 direction and a confirmed swing stop; FVG is not required.

- **Line filter:** require the reaction close to be at least 0.5 ATR on the trade side of the *previous* chart-line value.
- **Stop filter:** require the initial entry-to-stop distance to be at least 1 ATR, checked at the next opening price before the simulated market order. The actual fill could move after this check.
- **Combined:** apply both filters. All other entry, exit, sizing and cutoff rules stay unchanged.

| Variant | 2023 net / PF / trades | 2024 net / PF / trades | 2025 net / PF / trades |
|---|---|---|---|
| Existing diagnostic | −$416.59 / 0.637 / 181 | −$120.35 / 0.918 / 216 | +$369.00 / 1.246 / 212 |
| Line ≥0.5 ATR | −$136.45 / 0.808 / 110 | +$85.15 / 1.078 / 147 | +$61.10 / 1.060 / 137 |
| Stop ≥1 ATR | −$354.08 / 0.679 / 165 | −$120.65 / 0.909 / 194 | +$362.19 / 1.276 / 191 |
| Both filters | −$110.35 / 0.838 / 103 | +$84.03 / 1.082 / 137 | +$130.36 / 1.145 / 126 |

**The line filter is the clearest research hypothesis**, not an approved trading rule. It reduced the displayed 2023 loss and turned the 2024 base-case result positive, but still lost in 2023, greatly reduced trade frequency, and reduced 2025 profits. The combined variant also fails to deliver profitability in 2023. On the line-only variant, entries occurred on 88/255, 125/259 and 117/258 available session days respectively—not every day. There is no basis to force additional trades.

### Sensitivity and costs

Changing the line threshold to **0.4 ATR** produced −$290.22 / +$96.58 / +$96.08 in 2023 / 2024 / 2025; **0.6 ATR** produced −$180.90 / +$125.32 / +$31.24. Both still lost in 2023. These neighboring thresholds are sensitivity checks, not a search for the best number.

In a combined stress using $0.30/oz entry and exit slippage, $10 round-turn per standard lot commission, and an additional $0.50/oz adverse slippage on every stop, the **line-only** variant returned −$401.70, −$127.82 and +$11.61; the **combined** variant returned −$310.28, −$112.93 and +$72.12. Counts and later position sizes can change when the account path changes. Neither improvement is robust enough for live use on this evidence.

## Assumptions and validation

- Data: the same 70,946 real OANDA practice XAU/USD M15 bid/ask/mid candles from 2023–2025, SHA-256 `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`. No 2026 data, synthetic market data or No-Wick indicator. The actual chart range/body proxy is used. 2023 has no earlier H4 warmup.
- Base costs are historical bid/ask plus $0.10/oz entry and exit slippage and an **illustrative** $7 round-turn commission per standard lot, not a confirmed broker quote. Sizing includes modeled exit slippage and commission in the 2% planned-risk budget, with max 0.05 lot and 0.01 increments. Unexpected fills can lose more than planned. No financing, margin liquidation, broker-specific contract, calendar or depth model.
- Stops are based on confirmed three-left/three-right pivots; target is the last confirmed opposing swing if 1–3R away, otherwise 1.5R. Same-bar stop/target collisions are counted as stops. A target is modeled with an adverse slippage penalty, which is conservative but is not literal limit-order execution. Deadline/time exits use the executable closing-side candle close minus slippage.
- Floating drawdown uses adverse intrabar executable-side OHLC relative to a peak built from opens, closes and realized balances, including modeled costs. The extreme may occur after an unknown intrabar exit, and intrabar positive peaks are not tracked. It is a stress proxy, not exact or an upper bound.
- All years have been previously inspected. The line and stop hypotheses were motivated by previous 2023 analysis; 2024 and 2025 were also already seen in prior research. None is a genuinely untouched forward test, so the apparent improvement may be overfit. The conservative cutoff itself was informed by the observed data and is not independently validated.

## Next research step

Do not change the live indicator yet. First confirm the actual broker instrument, lot specification, commission and holiday schedule; then freeze one candidate and evaluate it on a later truly unseen chronological sample. In parallel, examine individual losing trades in the provided CSV for structure and regime context rather than assuming an ATR threshold fixes the cause. A verified news calendar would be required to assess CPI/PPI effects.

## Files and reproducibility

- `vwma-intraday-scenarios-2023-2025.csv`: baseline, diagnostic, filter, sensitivity and stress results.
- `vwma-intraday-loss-groups-2023-2024.csv`: grouped winners, losses and outcomes.
- `vwma-intraday-trades-2023-2025.csv`: individual base-cost comparison trades, with decision, exit, result and features.
- Reproduce from the prepared private OANDA and chart snapshots with `PYTHONPATH=research/ml python research/ml/intraday_vwma_2023_2025.py`. The shared candidate module regenerates ignored intermediate results. Eight unit tests passed, including timezone daylight-saving handling and execution tests; a separate audit checked all 4,289 trade rows for same-weekday cutoff, no unknown gaps, daily cap and planned-risk arithmetic. These checks do not establish real-world profitability or fill quality.
