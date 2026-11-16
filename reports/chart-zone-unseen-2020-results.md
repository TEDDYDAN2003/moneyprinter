# Experimental XAU/USD buy/sell zones: 2020 test

## Conclusion

The frozen, opt-in chart-zone model **did not demonstrate a profitable edge** on 2020. Its selected zones had a higher observed first-hit rate than the unfiltered candidates, but the sample was small and both groups lost under the specified fixed-distance, conservative execution assumptions. The indicator is **not suitable for live trading**. No tuning was performed on 2020 after this evaluation.

The chart now has an off-by-default setting named **Experimental XAU M15 model zones (unvalidated)** under VWMA × EMA Crossover. It draws TEST BUY ZONE / TEST SELL ZONE labels and a score for qualifying swing or prior-day zones. The score is an uncalibrated model output, not a guarantee, trading instruction or reliable probability of profit. It uses the same script to extract the research test candidates. Changing the crossover length or separation from the research defaults disables these experimental zones.

## Test results

Frozen after development on 2021–2025 and before fetching 2020, the script found 146 candidate zones in 23,684 real OANDA M15 candles. The model selected 40. A gold pip is assumed to be $0.01; the test asks whether the price reaches $1 favorably or adversely from the hypothetical next-open entry first.

| Group | Events | Favorable first | Conservative losses | Win rate | Illustrative net per oz, summed |
|---|---:|---:|---:|---:|---:|
| All candidate zones | 146 | 17 | 129 | 11.64% | −$136.82 |
| Model-selected zones | 40 | 8 | 32 | 20.00% | −$30.80 |

For selected events, the average was −$0.77 per oz per event; the all-candidate average was −$0.9371. This descriptive difference is **not proof of a durable improvement**. There were six selected same-candle cases where favorable and adverse thresholds were both touched and their order is unknowable; they are counted as losses above. Even if all six were instead wins, the selected fixed-hit total would still be −$18.80 per oz and the win rate 35%. No selected cases were unresolved or gap-censored in this sample.

| Selected direction | Events | Favorable first | Conservative win rate | Net per oz |
|---|---:|---:|---:|---:|
| Buy | 21 | 3 | 14.29% | −$18.57 |
| Sell | 19 | 5 | 26.32% | −$12.23 |

| Selected session | Events | Favorable first | Net per oz |
|---|---:|---:|---:|
| London, 07:00–10:00 UTC | 33 | 6 | −$26.61 |
| London/NY overlap, 12:00–15:00 UTC | 3 | 2 | +$0.49 |
| NY, 15:00–17:00 UTC | 4 | 0 | −$4.68 |

Overlap and NY counts are far too small to draw conclusions. The 12:45 New York cutoff truncates the later session, so this is **not a full New York-session or all-killzone test**. The windows are research conventions, not necessarily the user's exact preferred killzone boundaries.

## Wrong first, then right

Of 26 selected events whose adverse threshold was unambiguously reached first, 20 later reached the favorable threshold before the cutoff, and 6 did not. Among those 20, the median time after the adverse hit was three M15 bars, or 45 minutes; a bar count is not an exact elapsed time. This is a **counterfactual price path**: a position stopped at the adverse threshold would already be closed and would not capture that recovery. Same-bar ambiguous first hits are not included in these recovery counts.

## Method and important limitations

- The frozen indicator source, model hash and pre-test protocol are in `reports/chart-zone-frozen-protocol.md`. The 2020 candles' SHA-256 is `dc8ad13526539b041debd80498d5522208bdb086798cc49d070f8b05587664d5`. 2020 is an earlier historical cross-regime holdout, not a future forward test.
- Signal features come from completed candles. The model uses crossover direction/quality, price/ATR features, confirmed swing touches, prior UTC-day extremes and session/time-to-cutoff features. It does **not** implement all subjective course zones, actual volume profile, order blocks, FVGs or H4 trend. The prior 20-feature model remains offline; this is a separately trained, chart-computable model.
- The shaded zone is a contextual level around the confirmed swing or prior-day extreme. The test assumes entry at the **next contiguous candle open**, not a later limit fill when the shaded zone is touched. The drawing is not a fill or a confirmed entry price. On chart, changing the amount of loaded history can affect initialization and signals; the viewport no longer truncates history when experimental zones are enabled.
- Long entries use ask plus $0.10/oz and short entries bid minus $0.10/oz. Exit thresholds use the opposite quote; the simplified fixed-hit results deduct $0.10/oz exit slippage and $0.07/oz commission, yielding +$0.83 per oz on a target and −$1.17 per oz on a stop. Actual worse stop gaps or fills can produce greater losses, and M15 OHLC does not establish exact intrabar execution.
- Results sum hypothetical overlapping events per ounce; they are **not** a sequential portfolio, account balance, return on capital or guarantee of obtainable fills. No positions are held past the research cutoff or a missing interval. The cutoff was historically selected and is not a verified broker holiday schedule or protection from unexpected gaps.
- The 2025 development threshold screen was also negative. The model was fit on 2021–2025; no independent forward period has validated it. The experimental overlay defaults off.

`reports/chart-zone-2020-events.csv` contains individual candidate zones, scores and labels. The chart's 5,000-bar prefix and software fixture checks passed; the TypeScript check and production build passed with an existing Supabase Edge-runtime warning. These checks establish neither profitability nor live execution safety.
