# XAU/USD M15 zone model — 2021–2025 development progress

## Status

The requested development dataset has been assembled and a preliminary model fitted, but **the chart indicator has not yet been modified to use this model, and the 2020 unseen test has not been run**. This is a work-in-progress research artifact, not a completed indicator or evidence of an improvement. Reserve 2020 until the indicator implementation and its decision thresholds have been fixed using only 2021–2025.

## Data and training

The private snapshot contains 118,207 real OANDA XAU/USD M15 candles for 2021–2025; bid/ask OHLC are included. No 2020 or 2026 candles are included. Combined snapshot SHA-256: `13bcee8d60ecb60302ec98f0822fdd4c0edf417b5d047d1f18c58ba0d4b469b0`. The existing chart's price-range/body-based crossover calculation was run on the data; a 5,000-bar prefix check passed. Candidate generation yielded 1,388 matching-zone crossovers, generating 4,164 distance-specific rows. Longer warmup changes some 2023 candidates relative to the earlier 2023–2025-only run.

| Distance | Adverse first | Later reached favorable level | Did not recover by cutoff | Median bars after adverse, among recoveries |
|---|---:|---:|---:|---:|
| 100 pips | 775 | 507 | 268 | 3 |
| 200 pips | 788 | 435 | 353 | 4 |
| 300 pips | 741 | 347 | 394 | 6 |

One gold pip is assumed to be $0.01; one bar is 15 minutes. These are descriptive training-set counts, not prediction accuracy. A stopped-out trade does not profit from a later recovery; that path is counterfactual. First-hit ordering was ambiguous in 349, 109 and 44 cases respectively, and those cases are excluded from first-move and adverse-first recovery fitting. OHLC cannot resolve exact intrabar paths or execution. Timing models are conditional on observed hits and do not guarantee recovery.

The model uses historical zone proxies, crossover attributes and session/trend features. It is not a full representation of subjective course zones or actual volume profile. The current training windows are 07:00–10:00 and 12:00–17:00 UTC, subject to a historical 12:45 New York flattening cutoff; this truncates much of New York. The cutoff is not a future broker holiday calendar, and unexpected closures cannot be anticipated. Fixed thresholds, gap censoring and entry-side slippage are research assumptions.

## Outstanding work before the 2020 test

1. Implement the actual buy/sell zone suggestion logic and freeze its thresholds using only development data. The model is currently offline only.
2. Ensure chart features and model inference exactly match offline calculations, including completed-bar timing, the chart's limited lookback and four-hour trend state. Test causal prefix invariance and realistic gap/session behavior.
3. Freeze version and execution assumptions, then fetch and evaluate 2020, reporting all signals, ambiguity, costs, session breakdowns and failure cases. An earlier historical test is a cross-regime test, not a forward-time prospective validation.

## Reproduction

Keep OANDA credentials and data private. With the existing private 2023–2025 snapshot available, run `OANDA_API_TOKEN=... python research/ml/fetch_2021_2022.py`, `python research/ml/merge_zone_training_2021_2025.py`, `node research/ml/extract_chart_2021_2025.cjs` and `PYTHONPATH=research/ml python research/ml/train_zone_movement_2021_2025.py`. The labeled CSV and model file are saved under `reports/` and `research/models/`. The prior 34 Python unit tests passed; those software checks are not an unseen test or proof of accuracy.
