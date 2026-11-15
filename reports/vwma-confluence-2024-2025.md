# Your VWMA — 2024–2025 confluence and supervised-learning research

## Summary and decision

Your actual Moneyprinter chart crossover calculation was tested on **real OANDA 15-minute XAU/USD candles from 2024 and 2025 only**. I also tested a separate, explicitly defined reaction to the prior-close value of its curve and recorded candle, zone, trend and market-structure context.

**No supervised candidate met the predeclared development criteria.** I have not changed or deployed your displayed VWMA indicator, nor labeled any zone a proven entry. The 2025 baseline was positive under this particular simulation, but it had a substantial drawdown, many gap exclusions and poor results in the preceding 2024 development quarter. The 2025 data was previously inspected and is treated as **development evidence**, not the unseen test you plan to conduct yourself.

## Data and what was actually evaluated

- 47,383 completed OANDA M15 candles from 1 January 2024 through 31 December 2025 UTC; real midpoint and historical OANDA bid/ask OHLC plus tick-volume counts. The private snapshot also contains other dates, but this research filters those out **before feature computation and indicator calculation**. No 2026 data was used in this study. No No-Wick indicator or No-Wick engine was used. No orders were sent.
- Exact `vwmaCrossoverScript` from the Moneyprinter chart, using default settings (period 14, 0.15 ATR threshold) and indicator signals as written. It is a price-range/body volume **proxy**, not actual OANDA tick volume. The alternative `line reaction` is a test rule, not an original indicator arrow: the current candle touches the indicator value known at the **previous close**, closes back across it and has a directional body. If a crossover arrow is present on the candle, it takes precedence over the reaction candidate.
- Chart signals are calculated with continuous history beginning 1 January 2024. The real chart renderer uses a viewport slice with about 300 prior bars, so trend grades can differ from continuous history. Previous parity diagnostic: in 400 sampled historical crossover signals, all sampled arrow directions were retained, but 19 trend/quality labels differed. That limited check did not test all viewports or spurious slice-only arrows.
- Candidate time is candle close; a market entry is estimated at the next candle's open. Fixed UTC sessions: London 07:00–10:00, overlap 12:00–15:00 and NY 15:00–17:00. DST can change how these correspond to local sessions.

## Candle, zone and structure features

The supervised model can see completed-candle cross/reaction, direction, internal EMA50/EMA200 and 4h EMA50/EMA200 alignment, 50 EMA slope, distance to the VWMA and 200 EMA in ATR units, distance to the last confirmed opposing swing, near-swing-zone flag, prior-20-bar liquidity sweep/reclaim, first FVG retest, FVG inversion/flip proxy, confirmed-pivot close-break (BOS proxy), engulfing, rejection-wick proportion, body size, directional close position, relative ATR/range, OANDA tick-volume ratio and session. FVG retest is **not required**.

All 4h values come from completed 16-candle UTC buckets, and swings require three candles on each side before confirmation. These are measurable proxies, not a full Moneyprinter Pullback, IFVG, BOS/MSS, order-block or Volume Profile implementation. A past high or low is not proof of institutional liquidity. Features using a candle's close are known only after it closes; individual outcomes are recorded only after their resolution. Candidate eligibility and stop geometry are checked at the next open, so modeling is conditional on those executable candidates.

## Simulation and important limitations

Buy at OANDA ask / sell at bid on the next candle plus $0.10/oz slippage per side; exits use the opposite bid/ask side. Stop = last confirmed opposing swing plus max($0.20, 0.15× prior ATR) buffer. Target = last confirmed opposing swing if 1–3R away, else a 1.5R fallback. Exit after at most 48 M15 bars. $1,000 starting balance, 0.05 lots maximum, 0.01 increments, up to 2% planned risk and two entries per UTC day; one position at a time. Stop gaps and slippage can exceed planned risk. No broker margin, financing, commission or real execution depth.

Bars touching stop and target are marked ambiguous and conservatively scored as stops in the replay; ambiguous or gap outcomes are excluded from model training labels. Trades crossing missing-data gaps are excluded with balance unchanged—not an actual risk-free outcome. Across the complete candidate set, 877 gap events and 38 ambiguous events occurred; 2025 baseline replay had **38 gap-excluded entries**. This is material and can bias results. Max drawdown below is closed-balance drawdown, not floating-equity drawdown. Candidate outcomes must resolve within their reporting period; period-crossing events are purged, rather than carrying an open position across split boundaries.

## Supervised process

- Fit: January–September 2024; 1,314 eligible events, 941 labelable after excluding gap/ambiguous cases.
- Model/rule development: October–December 2024; 561 candidate events.
- 2025: later historical comparison only; this year had already been inspected in earlier research and is **not an untouched final holdout**. 1,922 candidate events.
- Logistic regression and a depth-3 decision tree estimate whether the eventual net result is positive; timeout results are included. Scores are **uncalibrated** and apply only to candidates passing next-open/stop eligibility. Signals and labels can overlap, so the examples are not independent.
- Each strategy needs price aligned with EMA200. I evaluated thresholds 0.40, 0.45, 0.50 and 0.55 in 2024 Q4. A candidate had to have ≥25 closed trades, positive net P&L, profit factor ≥1.05 and max closed-balance drawdown ≤25%. **None qualified**. These are illustrative research safeguards, not proof of adequacy.

### 2024 Q4 model candidates

| Model | Score cutoff | Trades | Win rate | Net $ | PF | Max closed DD |
|---|---:|---:|---:|---:|---:|---:|
| logistic | 0.40 | 46 | 28.26% | -232.29 | 0.473 | 23.81% |
| logistic | 0.45 | 36 | 22.22% | -239.93 | 0.353 | 24.58% |
| logistic | 0.50 | 22 | 13.64% | -185.00 | 0.245 | 19.08% |
| logistic | 0.55 | 10 | 0.00% | -125.24 | 0.000 | 12.52% |
| tree | 0.40 | 55 | 30.91% | -208.94 | 0.570 | 23.22% |
| tree | 0.45 | 55 | 30.91% | -208.94 | 0.570 | 23.22% |
| tree | 0.50 | 32 | 31.25% | -98.38 | 0.707 | 18.34% |
| tree | 0.55 | 32 | 31.25% | -98.38 | 0.707 | 18.34% |

For context, the plain price/200-EMA-aligned baseline had 93 resolved trades, 27.96% win rate, −$361.77 net, PF 0.570 and 36.18% max closed-balance drawdown in this quarter. None of the trained filters was selected. The historical outcomes are sensitive to the specific stop, target, cost and missing-data treatment.

### Probability quality

Brier score is lower-is-better, evaluated on all labelable candidate events rather than just executed trades:

| Period | Constant historical base rate | Logistic | Decision tree |
|---|---:|---:|---:|
| 2024 Q4 | 0.2283 | 0.2384 | 0.2331 |
| 2025 development | 0.2272 | 0.2367 | 0.2468 |

Both models scored worse than a constant rate in both comparisons. The exported scores should not be read as calibrated win probabilities or used as trade instructions.

## Baseline and stress comparison

The original chart-cross **or** prior-line-reaction candidates with the 200 EMA filter produced 340 resolved trades in 2025, 43.82% win rate, +$222.26 net, PF 1.074 and **29.18% max closed-balance drawdown** under base assumptions; 38 entries were gap-excluded. With $0.30/oz slippage per side, the same baseline produced 335 resolved trades, +$78.92 net, PF 1.027 and 32.16% max closed-balance drawdown; 32 gap entries excluded. The drawdown and exclusions make the positive number unsuitable as a claim of a reliable live strategy.

The 2025 sample was already examined and the account resets at each split. This is not a forward test of the 2025 result and should not be optimized again as though it were unseen.

### Tested fixed confluence rules

These are exploratory separate-account replays: every rule adds the listed condition to the EMA-aligned chart-cross/reaction baseline. They are **not** matched trade subsets, because position overlap, capital and daily limits change subsequent entries.

| Additional check | 2024 Q4 trades | 2024 Q4 net $ | 2025 trades | 2025 net $ | 2025 max closed DD |
|---|---:|---:|---:|---:|---:|
| 4h alignment | 43 | -239.78 | 224 | +237.63 | 31.95% |
| strong directional close | 73 | -310.93 | 257 | +152.55 | 24.10% |
| sweep reclaim | 13 | -65.85 | 29 | -44.87 | 10.42% |
| near confirmed swing | 49 | -197.62 | 130 | -305.93 | 37.84% |
| fvg context | 10 | -50.25 | 33 | -142.08 | 16.38% |

The historical numbers do not establish that a confluence is causal, that an FVG is harmful, or that a particular zone will continue working. We tested several rules against the same data; apparent winners may reflect selection and changing market conditions.

### Descriptive context on the 2025 baseline's actual simulated trades

These groups overlap. Their P&L is simply the sum of the selected baseline trade records; it is **not** a backtest of a standalone strategy or proof of a lucrative zone. Gap-excluded positions are not included.

| Context | Trades | Positive net trades | Net $ sum |
|---|---:|---:|---:|
| chart cross | 97 | 39 | -60.01 |
| chart line reaction | 243 | 110 | +282.27 |
| sweep reclaim | 22 | 10 | +20.86 |
| fvg retest | 14 | 2 | -153.80 |
| near swing zone | 70 | 24 | -138.31 |
| engulfing | 55 | 26 | +125.56 |
| h4 aligned | 209 | 96 | +326.25 |
| london | 210 | 85 | -203.47 |
| overlap | 110 | 57 | +473.73 |
| ny | 20 | 7 | -48.00 |

The line-reaction and crossover groups happen to partition those 340 closed baseline trades; other groups overlap. For example, 2025 had 55 simulated baseline trades with the simple engulfing flag, but that does not establish that engulfing predicts outcomes. Some earlier or later order sequences would change if the filter were actually traded.

## Next research iteration

1. Resolve missing bars and gap handling, add equity drawdown, margin and brokerage assumptions, and avoid using the current results as executable P&L.
2. Implement your full Pullback Strategy as a separately specified anchor → wick grab → closing break → later zone retest → lower-timeframe MSS process with completed higher-timeframe bars. This study only tests simplified context proxies, not that full strategy.
3. Freeze any candidate on historical development data and run it on a genuinely unseen, chronological dataset you choose. Do not refit the model, alter thresholds, or cherry-pick zones after seeing that final result. A model whose probabilities are worse than a constant reference should not be promoted solely because one trading subset looks profitable.
4. Use a verified economic calendar if excluding CPI/PPI is required. Candle range/ATR is only a volatility descriptor and cannot identify or anticipate a particular release.

## Files and reproducibility

`vwma-2025-candidates.csv` contains each 2025 eligible candidate's known-at-decision features and later outcome; the outcome columns are retrospective and must never be used as decision-time inputs. Gap outcome timing is only the next observed bar, not proof of what happened during the gap. `vwma-2025-baseline-trades.csv` contains the sequential baseline's closed and gap-excluded positions. Scores are uncalibrated research scores.

From repository root with Node and Python dependencies installed and the private OANDA snapshot under `research/data/`, run `node research/ml/extract_chart_2024_2025.cjs` and `python research/ml/vwma_confluence_research.py`. Neither script places orders or embeds credentials. This is an offline research experiment, not a live-ready indicator or financial guarantee.
