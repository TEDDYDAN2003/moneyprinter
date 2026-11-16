# XAU/USD zone-movement model — training only

## Status

A research prototype was fitted on real OANDA XAU/USD M15 data from 2023, 2024 and 2025. All three years have been inspected and are development/training data. **No unseen-data test has been run for this model.** It is not validated, integrated into the chart, or suitable for live trading. Do not interpret its output as trade advice or an accuracy claim.

## What it learned

The candidates use the existing chart's price-range/body-based VWMA crossover (not OANDA tick-volume VWMA), filtered for a qualifying causal key-zone proxy and historical session window. There are 846 candidate events, each labeled at 100, 200 and 300 pips (gold pip assumed $0.01). For each distance, the saved artifact includes logistic models for first movement and recovery given an adverse-first movement, and ridge models for time to a favorable hit and time from adverse hit to recovery. Timing models are conditional on an observed hit/recovery, not unconditional forecasts or guaranteed waiting times. Features are available at the crossover candle's close; labels observe the subsequent price path. Separate `feat_` and `label_` columns are in the training CSV.

| Threshold | Adverse first | Subsequently favorable | No recovery before cutoff | Median recovery time among recoveries |
|---|---:|---:|---:|---:|
| 100 pips | 465 | 325 | 140 | 3 bars (45 min) |
| 200 pips | 481 | 290 | 191 | 4 bars (60 min) |
| 300 pips | 467 | 247 | 220 | 5 bars (75 min) |

These are **in-sample descriptive counts**, not predictive performance. Bar counts are M15 intervals, not exact crossing times; same-bar recovery known from the open is zero bars. Recovery is a counterfactual observation: a position stopped at the adverse level would already have closed and would not earn the subsequent recovery. Labels use next-open bid/ask plus $0.10 entry slippage and opposite-side quote candles; they are movement labels, not net profitability after exits and commissions.

At 100/200/300 pips respectively, 232/85/37 first movements were ambiguous because both thresholds occurred within one candle without an identifiable order. They were excluded from first-movement and adverse-first recovery training; this can bias those models. The timing model may still use an observed favorable hit on such a bar, since it does not require first-hit ordering. A bar's exact path, spreads inside the bar and real fills cannot be reconstructed from M15 OHLC.

## Scope and limitations

Key zones are research approximations: confirmed swings, prior UTC-day extremes, existing FVGs, confirmed-pivot OTE and broken-swing retests. They do not implement subjective order blocks or a true volume-profile POC/VAL/VAH; BOS and MSS are not distinguished. Overlapping candidates and zones are not independent. Many approaches and years have already been explored, so selection/overfitting is a serious risk.

Candidate windows are 07:00–10:00 and 12:00–17:00 UTC, with a historical 12:45 America/New_York flattening cutoff. This truncates much of New York and is not a verified future broker/holiday calendar. Paths stop at the cutoff or an unexpected missing interval; no carry over a day or weekend is assumed. The cutoff was chosen after inspecting historical gaps, and cannot guarantee a real trade exits before an unexpected closure. The eventual unseen test must agree explicit London, New York and killzone boundaries, broker calendar and execution assumptions; do not use these training counts as a test.

## Reproduction and checks

With the private OANDA 2023–2025 dataset and exact-chart extraction prepared as described in `research/ml/README.md`, run `PYTHONPATH=research/ml python research/ml/train_zone_movement_2023_2025.py`. It writes `research/models/key-zone-movement-2023-2025.json` and `reports/vwma-zone-movement-training-2023-2025.csv`. Raw data SHA-256: `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`. No credentials or raw market data are included in the artifact. The model file contains training-fitted medians, standardization, coefficients and class order; it requires the identical feature pipeline to infer safely.

Synthetic *unit fixtures* check labeling of open ordering, same-bar ambiguity, recovery and missing gaps; they are not market-data results. Serialization unit tests compare exported multiclass logistic and ridge calculations with scikit-learn on fixtures. The existing chart-watch fixture and TypeScript/build checks also passed. These software checks do not establish forecast quality or real-world inference parity. The separate optional chart zone-watch is a rule-based visualization, not this trained model.
