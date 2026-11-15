# VWMA confluence CSV and machine-learning pattern study

## Result

The candidate CSV now includes the collected trend, setup, sweep, consolidation, candle, volatility and FVG context. Two supervised models were fitted on historical candidates and evaluated chronologically. **Neither model met the predeclared research screen**, and both had worse validation probability accuracy than a simple constant-rate baseline. No model has been deployed or recommended for live use.

A diagnostic model-filtered replay showed a small modeled profit in 2025, but it was selected retrospectively, traded less often, and lost under the cost stress. All three years had also been inspected in earlier research, so 2025 is **not a genuinely unseen final holdout**.

## Updated CSV

`vwma-ml-confluence-candidates-2023-2025.csv` contains **2,431 distinct decision candles** from the previously tested combined setup universe. The existing CSVs remain unchanged. Multiple setup types on one candle are retained in `all_setups`; opposite-direction conflicts would have been excluded.

- `feat_...` columns are the **31 input features** known at the signal close: setup membership and overlap, direction and fixed-UTC session, H4 EMA spread, M15 EMA200 and prior chart-line distances, body/range/close position, ATR, tick-volume ratio, recent same/opposing liquidity sweep, previous consolidation-box width/state/breakout, same/opposite FVG touch, and confirmed swing range. Missing feature values appear as `nan`; median imputation is fitted on training data only.
- The underlying VWMA is the actual Moneyprinter chart range/body proxy, not OANDA tick-volume VWMA. OANDA candle volume is a price-update count, not exchange-traded gold volume. FVG is an optional feature, never an entry requirement.
- `label_status` reports whether a standalone hypothetical entry could be modeled. **1,990** candidates resolved; 260 had invalid stop geometry, 132 exceeded the 0.01-lot risk budget at a fixed $1,000 balance, and 49 occurred after the research cutoff. Blank outcome fields are not zero-profit trades.
- `outcome_...` fields are **future labels**, including the time the outcome became known. They are not model inputs. Each resolved label simulates that candidate independently with a fixed $1,000 account; overlapping candidates can have overlapping outcomes and are **not** a sequential portfolio.
- `score_period` flags `training_in_sample`, `validation_2024_H2`, or `observed_2025`. Training-period scores were produced by a model fitted on that same training period, including later training observations; **they are not historical real-time predictions**. All scores are uncalibrated model outputs, not guaranteed probabilities.

Filtering out candidates whose next-open entry/stop or minimum lot is infeasible conditions the labels on subsequently observed execution feasibility. The model does not receive the next-open price as an input, but model training and candidate-level quality metrics are conditional on this feasibility filter. In the account replay, eligibility is checked at the modeled next open; achieving that same price after checking it is an execution assumption, not a guaranteed real-world fill.

## Time split and methods

The dataset uses only the same **2023–2025** real OANDA practice XAU/USD M15 bid/ask/mid history (70,946 candles; SHA-256 `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`). No 2026 data, synthetic market-data results, orders or No-Wick signals were used. The 2023 start has no pre-2023 H4 warmup.

| Stage | Dates | Resolved candidate labels | Use |
|---|---|---:|---|
| Training | 2023 through June 2024 | 925 | Fit imputation, scaling and model parameters |
| Validation | July–December 2024 | 380 | Compare models and eight fixed thresholds |
| Later observed check | 2025 | 685 | Apply the validation-selected diagnostic unchanged |

Outcomes must be known strictly before the next period boundary to be included in each split. This is a chronological model split, **not a pristine unseen strategy test**: the setup universe, earlier filters and 2025 data were already examined during previous work. Candidate labels overlap in time and cannot be treated as independent experiments.

The models are median-imputed, regularized logistic regression and a shallow decision tree (maximum depth 3, minimum 30 training examples per leaf). The target is whether each independently simulated candidate's net dollar outcome is positive after base costs, not the magnitude of the return. The input whitelist excludes outcome, future exit, next-open price, position size and account balance.

The validation screen required at least 30 trades and 0.5 resolved trades per available session day, positive net above the non-ML baseline, PF ≥1.05, floating-DD proxy ≤25%, and candidate-level Brier score better than a constant training-positive-rate forecast. Four fixed score thresholds (0.45, 0.50, 0.55, 0.60) were tested for each model. These thresholds and metrics are research conventions, not promises of performance.

## Did ML predict the labels?

Lower Brier is better; 0.5 AUC is roughly non-discriminating. Brier and AUC are **candidate-level**, not account returns.

| Period / model | Brier | Constant training-rate Brier | AUC |
|---|---:|---:|---:|
| 2024 H2 logistic | 0.2652 | 0.2545 | 0.5048 |
| 2024 H2 tree | 0.2649 | 0.2545 | 0.5189 |
| 2025 logistic | 0.2526 | 0.2451 | 0.5226 |
| 2025 tree | 0.2670 | 0.2451 | 0.4804 |

The training positive rate was 37.84%. Both models were worse than the constant-rate Brier benchmark in both checks, and their AUCs were close to 0.5. They did not demonstrate useful probability discrimination on this evidence.

## Sequential account replay

The simulator uses one position at a time, at most two entries per UTC day, a fresh $1,000 account for each reported period, 0.01 lot increments and maximum 0.05 lot. Entries use bid/ask plus $0.10/oz per-side slippage and an **illustrative** $7 round-turn commission per standard lot. Planned stop risk includes estimated exit costs and is capped at 2% of current balance, but realized loss may exceed it. Stops and targets use the previously confirmed swing/1.5R-fallback rules; same-candle stop/target ambiguity is counted as a stop.

Positions are closed by **12:45 p.m. New York time** on the same weekday. This deliberately early cutoff was chosen after inspecting historical data; it is not a verified future broker holiday schedule. Unexpected missing-bar outcomes remain unknown. None appeared in the replays shown below. Financing, margin liquidation, execution depth and broker-specific fees are not modeled. Floating DD is an intrabar OHLC-based stress proxy, not exact drawdown or a guaranteed upper bound.

No model/threshold passed the full screen. For illustration only, the highest-net validation candidate was **logistic score ≥0.45**; its validation PF and Brier failed the requirements, so it is **not qualified**.

| Replay | Trades | Win rate | Net | PF | Floating DD proxy | Entry days |
|---|---:|---:|---:|---:|---:|---:|
| 2024 H2 non-ML combined baseline | 138 | 38.41% | −$140.04 | 0.870 | 30.60% | 90/131 |
| 2024 H2 logistic diagnostic ≥0.45 | 66 | 50.00% | +$4.03 | 1.009 | 10.79% | 57/131 |
| 2025 non-ML combined baseline | 246 | 39.84% | −$178.54 | 0.899 | 38.67% | 167/258 |
| 2025 same logistic diagnostic | 89 | 46.07% | +$28.90 | 1.050 | 18.27% | 80/258 |

The diagnostic's 2025 result is a small, retrospective modeled profit, not proof that the model improved the strategy reliably. It also had no entry on **178 of 258** available session days. The model was not refitted on the validation period before the 2025 check.

At a combined stress of $0.30/oz slippage per side, $10 round-turn commission per lot and an extra $0.50/oz adverse slippage on every stop, the 2025 diagnostic returned **−$122.90**, PF **0.778**, floating DD proxy **25.77%**, across 77 trades. The non-ML baseline returned −$523.89 under the same stress. Different fills, sizes and subsequent eligibility can change the trade stream; a better stressed comparison than baseline does not make the model profitable.

## Patterns worth investigating—not rules

These examples use the independently labeled candidate universe, **not** one sequential account. Candidates can overlap; sample sizes, session mix and position sizes differ. Groups were inspected after the fact and do not prove causes.

| Candidate feature present | 2024 H2 candidates / positive rate / average net | 2025 candidates / positive rate / average net |
|---|---|---|
| Recent same-direction sweep | 77 / 51.95% / +$1.76 | 149 / 38.93% / −$0.46 |
| Close beyond a compressed box in trade direction | 28 / 42.86% / −$1.71 | 54 / 50.00% / +$0.67 |
| Same-direction FVG touch | 19 / 68.42% / +$1.24 | 26 / 23.08% / −$5.81 |
| Swing-sweep reversal setup membership | 157 / 48.41% / +$0.87 | 340 / 34.71% / −$2.35 |

The changing patterns and small FVG/box groups argue against making any one confluence mandatory. Other candidate groups, including feature-absent comparisons, are in `vwma-ml-confluence-groups.csv`. The training-only logistic coefficients and tree are descriptive of the fitted training sample; correlated features and the failed validation mean their signs are **not** evidence that a feature causes wins. `vwma-ml-training-coefficients.csv` records standardized coefficients for audit, not a trading checklist.

## Suggested next step

The CSV is now ready for further research, but adding more filters to these already-inspected years risks fitting noise. First improve the candidate and execution data: confirm real broker hours, fees and lot specifications; record prospective setups and whether a position would already be open; and obtain an independently verified news calendar if CPI/PPI context is desired. Freeze a small hypothesis and test it prospectively or on a genuinely untouched later period when authorized. Keep the live indicator and trading rules unchanged until there is stronger evidence.

## Files and checks

- `vwma-ml-confluence-candidates-2023-2025.csv`: features, label status, future hypothetical outcome and clearly marked score period.
- `vwma-ml-validation-thresholds.csv`: all eight model/threshold validation replays.
- `vwma-ml-confluence-groups.csv`: descriptive candidate groups for 2024 H2 and 2025.
- `vwma-ml-training-coefficients.csv`: training-only logistic coefficients.
- `vwma-ml-2025-replay-trades.csv`: base-cost non-ML, diagnostic model, and stressed diagnostic sequential trade records.
- Reproduce with `PYTHONPATH=research/ml python research/ml/confluence_ml_2023_2025.py` after preparing the private OANDA and chart snapshots. Prior candidate-generation imports regenerate ignored intermediate files.
- Eighteen unit tests passed, including outcome-boundary purging, the model feature whitelist, no-next-bar handling, causal features, overlapping setup deduplication, DST and execution rules. For 100 randomly sampled real candidates, standalone label status and P&L matched a single-candidate replay for all 88 resolved cases. These checks do not establish live fill quality or profitability.
