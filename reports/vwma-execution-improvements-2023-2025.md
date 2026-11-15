# VWMA execution improvements: OANDA XAU/USD, 2023–2025

## Bottom line

After carrying positions across observed trading breaks, including illustrative commissions in position sizing, and estimating floating drawdown, **the diagnostic still loses in 2023 and 2024 and profits in 2025**. None of the exit variations shown here fixes that inconsistency. This is not evidence that the method is ready for live use.

The positive 2025 result is higher than in the earlier report because this replay no longer discards trades that encounter a break. It also uses different commission, sizing and year-end rules, so the two reports are **not an apples-to-apples measurement of just the gap change**. The result depends on assumptions about what happened while prices were unobserved.

## Data and rules

Only the previously fetched, real OANDA practice XAU/USD M15 bid/ask/mid data for 2023–2025 was used: 70,946 candles, SHA-256 `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`. The existing Moneyprinter chart indicator is used, not tick-volume VWMA or No-Wick. No 2026 data, orders, or chart changes were used. The indicator runs continuously from the beginning of 2023; 2023 lacks earlier H4 warmup.

The same historical research candidates, fixed UTC sessions and EMA/pivot definitions as the preceding structure study are used. A baseline takes an EMA200-aligned crossover or indicator-line reaction. The diagnostic instead requires a line reaction and alignment with completed H4 EMA50/EMA200, a confirmed 3-bar swing stop plus buffer, and the opposing confirmed swing target if 1–3R away, otherwise 1.5R. The diagnostic was selected retrospectively using 2024–25 and is **not** independently validated. FVG is not compulsory. The large-candle pause is not a news calendar.

Each year starts a separate $1,000 simulation. The account holds one position at a time, with no more than two entries per UTC day, and uses a maximum 0.05 standard lot, in 0.01 increments. A standard lot is assumed to represent 100 oz. Each position times out after 48 observed M15 bars, not 12 elapsed hours; a break can extend the elapsed holding time. Any remaining position is liquidated at the last available candle close of its calendar year, an explicit year-end rule known in advance. This is not a continuous three-year compounded account. The last 50 candles in the full dataset are excluded from candidate generation by the shared prior-study code.

## Improved execution and its limits

- **Trading breaks:** a position remains open across missing bars. At the next executable bid/ask open, a crossed stop exits at the open with adverse slippage; a crossed target is credited at the target less the modeled slippage penalty, not a better opening price. If neither level is crossed at the open, the position continues. Gaps no longer automatically erase a trade's P&L.
- **Unknown prices:** not every missing interval is necessarily a true market closure. Stops or targets might have executed during an unobserved interval even if the next open is inside the range. OHLC cannot reveal this. Results are conditional on treating the interval as non-tradable; the adverse scenarios do not fully cover this uncertainty.
- **Costs:** the base case assumes $0.10/oz entry slippage and $0.10/oz exit slippage, plus an **illustrative**, not verified broker quote, $7 round-turn commission per standard lot. Target slippage is a conservative execution penalty; a real limit order should not fill worse than its limit, though it may fail to fill. No financing, margin liquidation, depth, spread expansion outside the historical bid/ask candles, tax or broker-specific rules are modeled.
- **Risk sizing:** entry price already includes entry slippage. The 2% planned stop budget includes stop distance, estimated exit slippage and estimated commission. A gap or worse execution can exceed the budget. In all 4,204 recorded base-cost comparison trades, the planned amount complied with 2% of the then-current balance; this is not a cap on realized loss.
- **Intrabar uncertainty:** if both stop and target are touched in one candle, the stop is assumed first. Floating-drawdown stress uses each bar's adverse executable-side high/low, plus estimated exit costs, relative to a peak built from opens, closes and realized balances. The adverse extreme can occur after an unknown intrabar exit, and profitable intrabar peaks are not used. It is a conservative **proxy**, not the exact maximum drawdown or a guaranteed upper bound; floating equity during missing periods is unknown.

## Corrected base-case replay

| Year | Method | Trades | Win rate | Net $ | Profit factor | Floating DD proxy | Trades crossing a break | Active session days |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 2023 | Baseline | 345 | 33.62% | −672.81 | 0.648 | 69.16% | 42 | 207/255 |
| 2023 | Diagnostic | 178 | 30.90% | −506.24 | 0.577 | 51.11% | 30 | 126/255 |
| 2024 | Baseline | 385 | 34.81% | −633.75 | 0.745 | 64.90% | 39 | 243/259 |
| 2024 | Diagnostic | 222 | 40.99% | −129.92 | 0.922 | 19.73% | 46 | 160/259 |
| 2025 | Baseline | 376 | 45.48% | +669.60 | 1.182 | 20.68% | 48 | 244/258 |
| 2025 | Diagnostic | 220 | 50.91% | +986.81 | 1.505 | 14.14% | 38 | 163/258 |

Active days are days with at least one simulated entry, not a promise of an opportunity every day. The diagnostic has no entry on 129/255, 99/259 and 95/258 available session days in 2023, 2024 and 2025, respectively. Session-day counts come from available bars and include warmup periods.

## Adverse stop and cost scenarios

These are separate replays of the diagnostic; trade counts and subsequent position sizes can change as balances and position occupancy change. Extra stop slippage is deliberately **not** included in the planned budget, to examine worse-than-planned losses.

| Scenario | 2023 net / floating DD | 2024 net / floating DD | 2025 net / floating DD |
|---|---:|---:|---:|
| Base: $0.10/oz each side, $7/lot commission | −$506.24 / 51.11% | −$129.92 / 19.73% | +$986.81 / 14.14% |
| Add $0.50/oz to every stop fill | −$618.63 / 61.92% | −$243.70 / 26.63% | +$686.47 / 15.71% |
| Add $1.00/oz to every stop fill | −$711.44 / 71.30% | −$435.38 / 44.55% | +$373.96 / 21.69% |
| Combined: $0.30/oz each side, $10/lot commission, extra $0.50/oz on every stop, and another $1/oz on a stop crossed at a reopening | −$700.97 / 70.26% | −$490.11 / 50.54% | +$275.89 / 22.28% |

Only one diagnostic trade stopped at a reopening in the base 2023 replay; none did in 2024 or 2025. Thus a stress affecting **only** reopening stops barely changes these particular runs and does not prove gaps are harmless. The scenario CSV includes extra $0.50 and $1.00 reopening-stop tests. Since sizing is recalculated sequentially, an adverse change can sometimes produce a slightly better final result by reducing later lot sizes; this is path dependence, not better execution.

## Exit alternatives: change one component at a time

The following use the same diagnostic entry, cost and sizing rules. Fixed targets are multiples of entry-to-stop distance before exit costs. Stop-buffer tests keep the structural target and use the same confirmed swing, changing only the buffer beyond it: `max($0.20, 0.05 × ATR)` or `max($0.20, 0.40 × ATR)` versus the base `max($0.20, 0.15 × ATR)`.

| Exit variant | 2023 net | 2024 net | 2025 net | 2023 / 2024 / 2025 floating DD proxy |
|---|---:|---:|---:|---:|
| Structural target / 1.5R fallback, base buffer | −$506.24 | −$129.92 | +$986.81 | 51.11% / 19.73% / 14.14% |
| Fixed 1R | −$463.30 | −$424.97 | +$124.47 | 46.41% / 43.41% / 23.49% |
| Fixed 1.5R | −$497.78 | −$117.97 | +$975.48 | 50.66% / 20.16% / 14.09% |
| Smaller swing buffer | −$472.37 | −$111.97 | +$856.81 | 48.10% / 25.86% / 15.40% |
| Larger swing buffer | −$477.95 | −$229.53 | +$589.56 | 49.05% / 29.36% / 18.35% |

These are descriptive in-sample comparisons, not a selection of a new rule. Changing an exit can change later eligible entries and the account path, so the net differences are not isolated trade-by-trade causal effects. The structural target frequently falls back to 1.5R; check the detailed records before interpreting a small difference.

## Why did 2023 lose? Exploratory groups

The diagnostic's 178 trades are grouped below by features known at the decision candle, except stop distance, which also depends on the subsequently observed next-open entry. Dollar totals reflect variable account size and overlapping groups; they must not be added across categories. Small groups and hindsight comparisons are unreliable as trading filters.

| 2023 diagnostic group | Trades | Wins | Win rate | Net $ | PF |
|---|---:|---:|---:|---:|---:|
| Close less than 0.5 ATR from previous chart line | 101 | 24 | 23.8% | −448.84 | 0.401 |
| Close 0.5–1 ATR from line | 59 | 25 | 42.4% | −34.57 | 0.899 |
| Stop distance less than 1 ATR | 21 | 1 | 4.8% | −113.66 | 0.057 |
| Stop distance at least 2 ATR | 105 | 40 | 38.1% | −112.78 | 0.820 |
| Latest confirmed high–low range below 3 ATR | 117 | 34 | 29.1% | −430.68 | 0.484 |
| Latest confirmed high–low range 3–5 ATR | 54 | 16 | 29.6% | −121.60 | 0.656 |
| Latest confirmed high–low range at least 5 ATR | 7 | 5 | 71.4% | +46.04 | 7.916 |
| London | 100 | 32 | 32.0% | −220.55 | 0.672 |
| London/NY overlap | 57 | 17 | 29.8% | −191.22 | 0.508 |
| NY | 21 | 6 | 28.6% | −94.47 | 0.303 |
| ATR ratio below 0.8 | 32 | 12 | 37.5% | −25.82 | 0.864 |
| ATR ratio above 1.2 | 42 | 13 | 31.0% | −165.74 | 0.426 |

Distance from the line is direction-adjusted relative to the prior candle's known chart-line value, divided by prior ATR. The swing-range proxy is the absolute distance between the latest independently confirmed swing high and low, divided by ATR; they are not necessarily consecutive or recent. The ≥5 ATR group has only seven trades and is not evidence of an edge. ATR ratio compares the current prior-only ATR with a preceding rolling median. All diagnostic trades are H4-aligned by definition, so that subset cannot establish whether H4 alignment helped. In the separate baseline, 177 aligned trades had PF 0.608 and 168 non-aligned had PF 0.692; those groups differ in other respects, and this is not a causal comparison. Full group data, including the middle volatility and stop-distance categories, is in `vwma-2023-loss-groups.csv`.

## Near misses and next steps

`vwma-execution-near-misses-2023-2025.csv` logs diagnostic candidate rejections: H4 not aligned (1,524), crossover rather than reaction (468), existing position (568), daily cap (104), invalid/oversized stop (168), and minimum lot above the risk budget (32). Counts cover all three years and list the first applicable rejection only; several conditions can apply to the same candidate. This log starts **after** the original candidate-generation filters, so it does not include every market candle, session rejection, large-candle pause or failed indicator setup. It does not simulate hypothetical outcomes for rejected trades and does not prove that relaxing a filter would help.

The next useful step is to audit the missing intervals against an independent complete feed or broker records, then predefine a small number of hypotheses—for example whether reactions very close to the line behave differently—and test them on a later genuinely unseen chronological period. The 2023 patterns and 2024–25 diagnostic have already been inspected. Avoid forcing a daily trade, and do not deploy an optimized rule based on these results alone.

## Files and tests

- `vwma-execution-scenarios-2023-2025.csv`: all base, gap and execution stress and exit comparisons.
- `vwma-execution-trades-2023-2025.csv`: individual base-cost trades, including size, planned risk, gap count, result and balance.
- `vwma-execution-near-misses-2023-2025.csv`: first-reason diagnostic rejection log.
- `vwma-2023-loss-groups.csv`: descriptive groups for the baseline and diagnostic.
- Reproduce with `PYTHONPATH=research/ml python research/ml/execution_research_2023_2025.py` after preparing the private OANDA and chart snapshots as described in `research/ml/README.md`. The script reuses the prior candidate-generation module, which also rewrites its ignored intermediate study outputs.
- Seven unit tests passed, including fill direction, stop-first collision, gap-stop and sizing cases. Synthetic prices in these unit tests are fixtures only, not market-data results. The 4,204 comparison trade records were also checked for annual boundaries, daily cap and planned-risk arithmetic. These checks do not establish live execution fidelity or profitability.
