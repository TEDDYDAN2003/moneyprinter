# Online-informed VWMA entry and checklist research

## Result

I researched published technical-analysis ideas and tested a **bounded set of 15 explicitly defined configurations**, including the previously studied breakout reference, against real 2023–2025 OANDA XAU/USD M15 data. Each configuration was replayed in each year at base costs and under higher-cost stress: **90 annual replay results**. This is not an exhaustive test of every possible pattern.

**No new pullback or retest variant produced positive base-case net in all three years.** The existing breakout reference did, but had only 13, 20 and 26 trades and was already selected retrospectively. None of the new findings is strong enough to deploy as a live rule.

The clearest example of why a checklist should not simply add more confirmations: requiring ADX ≥25 improved the pullback replay relative to its baseline in each displayed year, but **still lost $251.49 in 2023**, and its 2024 profit disappeared under higher costs. A one-candle delayed confirmation reduced the 2023 loss but worsened the 2024 result.

## Online research: ideas, not guarantees

- Fidelity describes ADX as a trend-strength measure, not a direction indicator; 25 is a commonly used trend-strength threshold. The source's threshold is a convention, not proof of profitability in gold M15. [1](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/adx)
- Schwab describes trend-aligned pullbacks toward a moving average or prior support, with a move beyond a prior extreme as one possible sign of resumption. Its examples concern stocks, so applying them to XAU/USD M15 is a hypothesis, not validation. [2](https://workplace.schwab.com/content/how-to-pick-stocks-using-fundamental-and-technical-analysis)
- Fidelity discusses ATR as a volatility measure and a way to adapt stop or trigger distances to changing price ranges. [3](https://www.fidelity.com/products/atp/pdf/ATPChartingIndicators.pdf)
- Schwab notes that apparent breakouts and technical confirmations can still be false. [4](https://www.schwab.com/learn/story/real-rally-or-ruse-tips-to-avoid-bull-trap)
- Bailey and coauthors explain that comparing many backtests can produce impressive historical results by overfitting. This project has already tested many earlier combinations in addition to the 15 here. [5](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2308659)

The exact thresholds and candle definitions below are **research proxies chosen for this test**, not rules prescribed or endorsed by those sources.

## Data and account rules

The test uses the same 70,946 real OANDA practice XAU/USD M15 bid/ask/mid candles from **2023, 2024 and 2025 only**, SHA-256 `7a2d864e294e4207524128a6e031b55c4babc2f8077f3ae79dfb729b385187ad`. The actual Moneyprinter chart's range/body-proxy VWMA is used; OANDA tick volume is not substituted for it. No 2026 data, synthetic market-data outcomes, No-Wick indicator or live orders were used. 2023 lacks pre-2023 H4 warmup.

Each year has a separate $1,000 starting balance, one position at a time, at most two entries per UTC day, and a 0.05-lot maximum in 0.01-lot steps. Planned risk is capped at 2% of current balance including estimated exit slippage and commission; realized loss can exceed it. The base case uses actual historical bid/ask, $0.10/oz slippage on each side and an **illustrative** $7 round-turn commission per standard lot. Stops use the latest known confirmed 3-bar swing plus buffer; targets use a confirmed opposing swing at 1–3R or 1.5R fallback. Same-bar stop/target collisions count as stops. The adverse slippage penalty on targets is a conservative fill model, not a literal guarantee of a limit fill.

Trades are flattened at **12:45 p.m. New York time** on the same weekday—an early research cutoff selected after inspecting historical gaps, not a verified future broker schedule. All 4,326 exported base-case trades exited at or before that cutoff without encountering a missing interval. Actual holiday hours, outages, spreads, financing, margin liquidation and broker execution are not fully modeled.

The floating DD figure below uses adverse intrabar bid/ask OHLC relative to peaks from opens, closes and realized balances. Adverse extremes may occur after an unknown exit and favorable intrabar peaks are omitted. It is a stress proxy, not exact drawdown or a guaranteed upper bound.

## Definitions and hypotheses

All signals use the existing fixed-UTC session windows, completed H4 EMA50/EMA200 alignment, EMA200 price side, the previous chart VWMA line, and the prior large-candle pause. The large-candle pause is **not** a CPI/PPI calendar. Signals use the completed candle and model entry at the next open.

- **Breakout reference:** the previously selected H4-aligned reaction, 0.5 ATR displacement and confirmed breakout of a prior 12-bar compressed box. It is included for comparison, not a new out-of-sample discovery.
- **Pullback baseline:** H4-aligned directional candle touches the previous VWMA line and closes back on the trend side. No box or FVG requirement.
- **ADX ≥25:** retain only baseline pullbacks with 14-bar M15 ADX at least 25 at the completed signal candle. ADX is a Wilder-smoothed directional-index calculation with an initial 14-observation SMA. It runs over observed bars, includes true-range effects of breaks between observed candles, and does not imply an overnight position.
- **ADX ≥20 + DI aligned:** ADX at least 20 and +DI > −DI for a buy, or the reverse for a sell.
- **Close beyond prior extreme:** the signal close is above the previous candle's high for a buy, or below its low for a sell.
- **Strong body:** directional body ≥0.5 prior ATR and close in the best 25% of the signal's high-low range.
- **Engulfing:** the prior candle is opposite direction and the current real body fully engulfs its real body in the trade direction.
- **Normal ATR:** prior ATR / its trailing median is between 0.8 and 1.2 inclusive.
- **Same-direction FVG touch:** current candle touches a previously formed same-direction three-candle FVG under the existing first-touch proxy. FVG is a test, **not a required trade condition**.
- **ADX ≥25 + strong body** and **prior-extreme close + strong body:** two explicit combinations; the strong-body definition is unchanged.
- **Next-candle confirmation:** after a baseline pullback, wait one contiguous same-New-York-day M15 candle; it must close directionally beyond the pullback candle's high/low and still align with H4, EMA200 and prior VWMA. Enter at the following open with the newly available confirmed swing stop. This is a different entry time, not just a filter on the original fill.
- **Retest baseline / first / early:** use the prior compressed-box breakout-and-retest definition. First means the first qualifying retest **signal** for an identified breakout, even if it was not filled; early means a retest signal within three candles. A newer breakout can replace the tracked box. These are not necessarily the first or only retest a discretionary trader would draw.

## Annual base-cost results

Each cell is **trades / net / profit factor**. All are independent annual replays; filtering changes which later positions can be taken and their account sizes.

| Hypothesis | 2023 | 2024 | 2025 |
|---|---|---|---|
| Breakout reference | 13 / +$123.58 / 2.704 | 20 / +$34.03 / 1.223 | 26 / +$83.19 / 1.488 |
| Pullback baseline | 188 / −$427.63 / 0.641 | 233 / −$42.38 / 0.974 | 220 / +$264.22 / 1.164 |
| Pullback + ADX ≥25 | 85 / −$251.49 / 0.555 | 112 / +$33.96 / 1.044 | 101 / +$280.11 / 1.408 |
| Pullback + ADX ≥20 and DI aligned | 100 / −$246.21 / 0.664 | 127 / −$19.85 / 0.978 | 98 / +$125.29 / 1.196 |
| Pullback + close beyond prior extreme | 145 / −$250.13 / 0.736 | 181 / −$65.31 / 0.952 | 160 / +$71.66 / 1.066 |
| Pullback + strong body | 123 / −$312.56 / 0.621 | 165 / −$91.98 / 0.917 | 136 / −$10.50 / 0.989 |
| Pullback + engulfing | 47 / −$90.66 / 0.719 | 76 / −$119.80 / 0.780 | 66 / +$56.80 / 1.126 |
| Pullback + normal ATR | 124 / −$361.17 / 0.608 | 151 / −$102.73 / 0.908 | 160 / +$62.39 / 1.057 |
| Pullback + same-direction FVG touch | 19 / −$77.34 / 0.431 | 20 / +$42.98 / 1.441 | 16 / −$41.32 / 0.714 |
| Pullback + ADX ≥25 + strong body | 46 / −$119.34 / 0.646 | 68 / −$126.99 / 0.758 | 55 / +$157.71 / 1.438 |
| Pullback + prior-extreme close + strong body | 105 / −$153.39 / 0.789 | 138 / −$78.24 / 0.919 | 126 / +$32.85 / 1.039 |
| Pullback + next-candle confirmation | 93 / −$140.77 / 0.786 | 100 / −$159.96 / 0.765 | 99 / −$5.78 / 0.991 |
| Retest baseline | 54 / −$236.87 / 0.490 | 97 / +$45.19 / 1.062 | 69 / −$1.88 / 0.996 |
| Retest: first signal | 53 / −$233.21 / 0.493 | 97 / +$45.19 / 1.062 | 69 / −$1.88 / 0.996 |
| Retest: within three bars | 27 / −$195.01 / 0.221 | 69 / +$87.08 / 1.171 | 49 / −$50.19 / 0.861 |

The first-retest rule barely changed this particular replay; many tracked breakout contexts generated only one qualifying retest signal before a new box or expiry. The early-retest result varied sharply by year. The small FVG samples do not support adding FVG to the checklist as mandatory.

## Frequency, drawdown and cost sensitivity

| Comparison | 2023 / 2024 / 2025 entry days | 2023 / 2024 / 2025 floating DD proxy |
|---|---|---|
| Pullback baseline | 132/255 / 168/259 / 165/258 | 43.87% / 21.93% / 27.66% |
| Pullback + ADX ≥25 | 73/255 / 90/259 / 87/258 | 26.82% / 16.66% / 10.97% |
| Pullback + next-candle confirmation | 78/255 / 90/259 / 91/258 | 23.56% / 20.16% / 14.99% |
| Early retest | 27/255 / 65/259 / 48/258 | 22.46% / 13.78% / 14.18% |
| Breakout reference | 13/255 / 20/259 / 26/258 | 6.32% / 5.28% / 5.22% |

At the combined stress of $0.30/oz entry and exit slippage, $10 round-turn commission per standard lot and an additional $0.50/oz on stop fills:

| Hypothesis | 2023 net | 2024 net | 2025 net |
|---|---:|---:|---:|
| Pullback baseline | −$678.85 | −$409.57 | +$12.15 |
| Pullback + ADX ≥25 | −$404.19 | −$145.40 | +$163.84 |
| Pullback + next-candle confirmation | −$240.56 | −$252.34 | −$178.47 |
| Early retest | −$202.34 | −$23.55 | −$47.90 |

Costs can change entry eligibility, position size and which later signals are available. All 90 base/stress annual results, including trade counts and floating DD proxies, are in `vwma-entry-hypotheses-scenarios.csv`.

## Research-only checklist proposal

This is a **context and audit checklist**, not an approved trading rule or a promise that completing the boxes creates an edge:

1. **Session and exit:** Is the broker's actual instrument open? Is there enough time to exit before its verified daily, weekend or holiday break? The research's fixed 12:45 New York cutoff is a conservative historical proxy, not a broker schedule.
2. **Trend context:** Record completed H4 EMA direction, M15 EMA200 side, and the known prior chart-line value. If ADX is available, record its value and DI direction; **do not assume ≥25 guarantees a winner**.
3. **Setup state:** Identify whether this is the original breakout, a first/later retest, or a line pullback. Define the range and levels from candles that were complete before the signal; log retest age and whether a prior signal was actually filled.
4. **Confirmation:** Record the signal body, close position, previous-candle extreme and any engulfing pattern. If waiting for another candle, record the later confirmation time and new entry/stop, rather than crediting the earlier price.
5. **Liquidity and FVG:** Record the level, sweep/reclaim and whether an existing FVG was touched. These are optional context; the present data does not support making FVG or a generic sweep compulsory.
6. **Risk and execution:** Check stop geometry against the latest confirmed swing, target, actual spread, commission, slippage and lot constraints. Verify the broker's contract and margin. A planned 2% stop does not guarantee a 2% maximum loss.
7. **No trade / unknown:** Record an invalid stop, blocked position, missing bars or lack of a verified event calendar rather than assuming a fill or forcing one daily.

No website checklist or production execution rule was changed. The research checklist should be revised only after independent evidence and your approval.

## Validation limits and next step

All three years have been studied repeatedly, including earlier strategy selection and ML work. They are not untouched forward tests; many trials increase selection bias. The online articles provide educational ideas, mostly illustrated with stocks—not proven XAU/USD returns. The test did not retrain a new ML model; it evaluates explicit deterministic entry hypotheses and exports their observed context for future research.

The next defensible improvement is to freeze a small number of hypotheses—for example ADX as a **recorded context field**, not an automatic filter—and collect a prospective demo sample or use a genuinely untouched later dataset when authorized. Independently verify the broker's actual contract, costs and holiday schedule. Do not force additional entries simply to raise frequency.

## Files and checks

- `vwma-entry-hypotheses-scenarios.csv`: all 90 annual base/stress results.
- `vwma-entry-hypotheses-funnel.csv`: candidates, fills and first-reason rejections by hypothesis and year.
- `vwma-entry-hypotheses-trades.csv`: individual base-cost trades and entry features.
- `vwma-entry-hypotheses-candidates.csv`: known-at-close pattern context, including first/early retest and original-signal index for delayed confirmations. It contains **candidate signals**, not hypothetical outcome labels.
- Reproduce with `PYTHONPATH=research/ml python research/ml/entry_hypotheses_2023_2025.py` after preparing the private OANDA and chart snapshots. Shared candidate-generation imports regenerate ignored intermediate results.
- Twenty-three unit tests passed, including Wilder initialization, ADX prefix invariance, retest flags, split purging, causal feature, DST and execution tests. On the real data, ADX, setup metadata and delayed confirmations matched a 5,000-bar prefix against the full history. A separate audit checked all 4,326 exported base-case trade rows for same-weekday cutoff, no unknown gaps, planned-risk arithmetic and daily entry caps. These checks do not establish live fill quality or profitability.
