# Moneyprinter chart VWMA crossover versus OANDA tick-VWMA — 15m research

## Key finding

I ran the **actual Moneyprinter chart indicator calculation**, not the tick-volume substitute, on real OANDA XAU/USD 15-minute candles. With the specified structural stop, target, costs and 200 EMA filter, the chart crossover lost money in each of the 2024, 2025 and first-half 2026 periods tested. A controlled variant using the same chart smoothing but OANDA tick volume, and a separate simple tick-VWMA comparator, also lost in those periods under the same filter. That does **not** mean your indicator cannot help identify reactions; it means this particular rule for converting it into trades has not demonstrated a robust edge under these assumptions.

Your observation about price reacting to the curve is a separate hypothesis from whether **crossover arrows** make profitable trades. I tested a defined line-reaction proxy separately below. It earned a positive simulated result in 2025 under the 200 EMA filter but lost in 2024 and in early 2026, with substantial drawdowns and gap exclusions. It is not enough evidence for live trading.

## Exactly what was tested

- `Your chart crossover`: `vwmaCrossoverScript` from `src/lib/indicators/vwma-crossover.ts`, executed directly by `research/ml/extract_chart_proxy.cjs` on the OANDA candles with default 14 period and 0.15 ATR separation, including its same-direction suppression and minimum bar spacing. Its so-called volume curve uses a **candle range/body proxy** and the smoothing algorithm; it does **not** use the OANDA tick volume field. OANDA provides its OHLC prices, so the proxy is calculated from real OANDA candles.
- `Same chart formula, tick-volume input`: a controlled research clone of the original script, with **only** its range/body proxy replaced by OANDA tick volume. The smoothing, thresholds and signal logic remain unchanged. It is not a change to your displayed indicator.
- `OANDA tick-VWMA crossover`: 14-bar actual OANDA tick-volume weighted close crossing EMA20. OANDA volume here is its count of price updates, not market-wide traded gold. It is a different indicator with different signals, not a matched trade-by-trade experiment; its performance does not prove that one curve is inherently better.
- `Chart-line reaction proxy`: the candle touches the chart curve value known at the **previous close**, then closes back across it with a matching candle body. This is an explicit causal rule devised for the test; it is not the indicator's original crossover signal and does not establish that visual touches alone are tradable.

The tables use the same trade rules: trade only when price is on the direction's side of the chart-style 200 EMA at signal close; a second table adds completed 4-hour 50/200 EMA direction alignment. These gates are research assumptions. The chart's default display can draw counter-trend arrows dimmed rather than suppressing them, so the filtered trade set is not the same as every arrow you see. All computations use prior completed bars, with the next-open entry.

## Data, sessions and realistic limits

OANDA practice XAU_USD completed 15m midpoint and bid/ask OHLC plus tick volume: December 2023 warmup through June 2026, 60,865 candles, SHA-256 `ccd16272077e0065f766354a0573f0bcde78f8afdb8479842800e2083e5add66`. Sessions are the application's fixed UTC London 07:00–10:00, overlap 12:00–15:00 and NY 15:00–17:00. Fixed UTC may differ from DST-adjusted sessions.

Separate $1,000 simulated account for each period and method, at most two fills/day, one position at a time, 0.05 lots maximum, 0.01 lot increment and 2% planned risk, with 100 oz/lot assumption. Entries use next-open OANDA ask/bid plus $0.10/oz slippage; exits use bid/ask less $0.10/oz slippage. A stop uses the last confirmed 3-left/3-right swing with ATR buffer; target is the last confirmed opposing swing if 1–3R away, otherwise 1.5R. Positions time out after 48 M15 bars. These are **simulation rules**, not an intrinsic property of your chart indicator. No commission, financing, live execution, broker margin or variable execution-depth model. Gap losses can exceed planned risk.

Same-candle SL/TP collisions count as conservative stops; gaps before resolution are excluded and cash is unchanged. The gap counts in the tables are material and can bias results. Max drawdown is **closed-balance only**, excluding open equity; it is not a margin-risk estimate. Entry gates and gaps produce different trade paths and numbers of trades, so rankings are not matched comparisons. January–June 2026 was already evaluated in the ML study before this follow-up and the analysis has now been inspected; it is **not an untouched final holdout**.

## Same price-versus-200 EMA gate

### 2024

| Method | Closed | Win rate | Net $ | PF | Avg net R | Max closed DD | Gaps excluded |
|---|---:|---:|---:|---:|---:|---:|---:|
| Your chart crossover | 190 | 37.37% | -274.14 | 0.830 | -0.1166 | 31.63% | 44 |
| Same chart formula, tick-volume input | 174 | 32.76% | -445.64 | 0.694 | -0.2270 | 47.65% | 43 |
| OANDA tick-VWMA crossover | 106 | 38.68% | -53.95 | 0.941 | -0.0643 | 20.39% | 38 |
| Chart-line reaction proxy | 315 | 33.97% | -481.58 | 0.795 | -0.1741 | 50.55% | 46 |

### 2025

| Method | Closed | Win rate | Net $ | PF | Avg net R | Max closed DD | Gaps excluded |
|---|---:|---:|---:|---:|---:|---:|---:|
| Your chart crossover | 162 | 35.19% | -310.51 | 0.778 | -0.1418 | 31.05% | 31 |
| Same chart formula, tick-volume input | 168 | 40.48% | -51.53 | 0.964 | 0.0005 | 17.91% | 30 |
| OANDA tick-VWMA crossover | 94 | 38.30% | -103.19 | 0.877 | -0.0671 | 20.77% | 16 |
| Chart-line reaction proxy | 303 | 43.23% | +180.93 | 1.068 | 0.0424 | 34.23% | 46 |

### January–June 2026

| Method | Closed | Win rate | Net $ | PF | Avg net R | Max closed DD | Gaps excluded |
|---|---:|---:|---:|---:|---:|---:|---:|
| Your chart crossover | 41 | 39.02% | -54.94 | 0.858 | -0.0641 | 13.38% | 2 |
| Same chart formula, tick-volume input | 30 | 33.33% | -64.70 | 0.798 | -0.1445 | 9.42% | 1 |
| OANDA tick-VWMA crossover | 24 | 33.33% | -53.85 | 0.780 | -0.1529 | 10.59% | 1 |
| Chart-line reaction proxy | 96 | 34.38% | -208.60 | 0.759 | -0.1539 | 28.94% | 2 |

For the 2026 crossover comparison, your chart proxy generated 41 resolved trades versus 24 for the tick-VWMA comparator. The chart crossover's 39.02% simulated win rate and −$54.94 net cannot establish superiority to the different tick-VWMA comparator's 33.33% and −$53.85; the controlled same-formula tick-input variant produced 30 trades, 33.33% and −$64.70: they enter on different candles, the test has gaps, and both are losing under the assumed execution.

## Adding completed 4h EMA direction

| Method | Closed | Win rate | Net $ | PF | Avg net R | Max closed DD | Gaps excluded |
|---|---:|---:|---:|---:|---:|---:|---:|
| Your chart crossover | 27 | 40.74% | -33.75 | 0.870 | -0.0205 | 12.58% | 1 |
| Same chart formula, tick-volume input | 23 | 26.09% | -110.46 | 0.592 | -0.3205 | 13.97% | 1 |
| OANDA tick-VWMA crossover | 13 | 30.77% | -45.08 | 0.670 | -0.2428 | 7.02% | 1 |
| Chart-line reaction proxy | 77 | 38.96% | -56.97 | 0.918 | -0.0463 | 16.11% | 2 |

This gate reduced the number of trades. It does not prove the additional filter is beneficial out of sample; it also produces a different sequence of entries. For example, the chart-line reaction plus 4h gate showed +$128.21 in 2024 and +$196.42 in 2025, but −$56.97 in the already-inspected first half of 2026. These samples and multiple comparisons are insufficient to select an optimized rule.

## Slippage stress

With $0.30/oz slippage **per side** and the same 200 EMA gate in January–June 2026, chart cross: 41 trades, −$57.68, PF 0.853; same-formula tick-input variant: 30 trades, −$86.23, PF 0.737; tick cross: 25 trades, −$76.55, PF 0.713; chart-line reaction: 97 trades, −$219.58, PF 0.746. Changed position sizing and the resulting trade path can change the count. Real spreads, slippage and fills may differ considerably from these assumptions.

## Chart-rendering parity caution

The main test runs the original chart formula on the **continuous loaded history**, starting in December 2023. In the Moneyprinter chart, `IndicatorOverlay` sends a viewport slice with about 300 earlier bars; the EMA initialization and trend labels can therefore differ from full history. A diagnostic sampled 400 full-history signal bars using slices with exactly 300 prior bars: the same cross and direction appeared in all 400, and the curve values matched in that sample, but **19/400** had a different trend-alignment/quality grade. This is a limited sample of existing full-history signals; it does not check every viewport, false-positive slice signal, or user-specific settings. Thus the report does not claim exact one-for-one parity with every displayed arrow or filter.

## Relationship to the ML pipeline

The separate `ml-2024-2026-report.md` contains the initial interpretable-model study. It used the tick-VWMA crossover/reaction as a candidate generator, not this chart proxy; its scores were worse than a constant reference on Brier score and no model met the validation threshold. Neither analysis used No-Wick. The experiments do not cover the entire Pullback Strategy, Volume Profile or all your strategy checklists. A future test should freeze chart settings and viewport calculation, reproduce the chart's EMA initialization, log every candidate and its reason, evaluate realistic costs/ambiguous bars, and reserve an actually unseen period. A CPI/PPI calendar is necessary to tell whether large moves were news-related; this test cannot do that.

## Reproduce

Install Python requirements in `research/ml/requirements.txt` and Node dependencies. From repository root, obtain the ignored OANDA snapshot with `research/ml/fetch_oanda.py` using a privately set `OANDA_API_TOKEN`, then run `node research/ml/extract_chart_proxy.cjs`, `node research/ml/extract_tick_proxy.cjs` and `python research/ml/chart_crossover_study.py`. The companion CSV contains 2026 closed and gap-excluded trades under the price/200 EMA gate; signal timestamps are candle-close decision times and exits are known by the end of the reported exit candle. Private raw data and credentials are not committed. Research only—no orders placed.
