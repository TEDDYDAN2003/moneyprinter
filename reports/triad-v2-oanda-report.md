# Institutional Triad v2 — real OANDA research test

## Important conclusion

The revised Triad is **experimental, not validated for live trading**. This is a very short, already-reviewed period and only five trades. Its result cannot establish an edge, and no comparison with the old simulator can establish an improvement because the old simulator missed entry-bar exits and changed sizes. The 15-minute ambiguous candle is assigned the stop for conservative accounting; its true order of events is unknown from OHLC.

## Results

| Timeframe | Trades | Wins | Losses | Both-hit ambiguous | Win rate as displayed* | Ending balance | Net return | Max closed-balance drawdown |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| M15 | 4 | 2 | 1 | 1 | 50.0% | $1,011.07 | +1.11% | 1.84% |
| M30 | 1 | 0 | 1 | 0 | 0.0% | $980.52 | -1.95% | 1.95% |

*Ambiguous is counted as a loss for this rate and P&L. Excluding it, M15 has 2 wins of 3 unambiguous outcomes (66.7%), but the account path still uses the conservative stop assumption. Neither rate is meaningful with these sample sizes. Profit factors: 1.35 and 0.00 respectively, also uninformative at this sample size. No open position at cutoff.

## Data and assumptions

OANDA practice XAU_USD completed 15- and 30-minute midpoint candles with OANDA tick volume; no synthetic data. Decision period: 20 October 00:00 through the end of 29 October 2026 EAT (UTC+3). This is an end-of-day cutoff, not necessarily the time of day the test was requested. Warmup: 544 M15 and 732 M30 candles; 736 and 368 in-period candles. M15 snapshot SHA-256 `06dbb6297077113e8324876a32727a7f97730a64d1290836116331913103d455`; M30 `edbe2f41f36666eff5b35c06b22aa7c5cfeb886f2ff56f681149590388da3268`.

Starting balance $1,000; maximum 0.05 standard lots (100 oz/lot), rounded down to 0.01 and reduced to at most 2% planned risk; skip if 0.01 is too large. Risk can exceed 2% after a price gap. Fixed $0.25/oz spread modeled as symmetric midpoint ± half-spread on entry and exit; no variable spread, commission, slippage, margin, financing or liquidity. OANDA may not match Exness; verify broker lot size, execution and costs. Win/loss and balance depend on these assumptions. Strict killzones are the program's fixed UTC windows 07:00–10:00 and 12:00–17:00; the decision at candle close must fall inside them. Maximum two entries per UTC day. The simulated next-open market entry can happen at the same timestamp as the prior candle's close; this is an idealization.

## Revised checklist

- At least 220 bars of warmup, completed-candle decisions, and 14 positive OANDA tick-volume readings. Missing volume blocks a new setup instead of inventing volume. OANDA tick volume is a count of quoted prices, not market-wide traded volume.
- Internal trend comes from the shared No-Wick protected-structure engine, internal swing length fixed at its default **3**; long only with bullish internal trend and close above the 200 EMA, short only with bearish trend and close below it. This fixed length does not automatically follow changes made in the chart indicator settings.
- A first retest of a valid recent FVG **or** a directional rejection through a 14-candle tick-volume weighted average or the 200 EMA, plus a direction-matching candle body. Formation itself cannot count as a retest; an earlier touch or gap in the formation/retest history disqualifies that zone. Recent FVG lookback is 20 candles. This is a simple tick VWMA and is **not** identical to the chart's custom smoothed VWMA crossover. No cross is claimed.
- Stop: last No-Wick protected low for long or protected high for short, buffered by max($0.20, 0.15 × previous 20-bar average true range); invalid or >$25 stop distance skipped. The 1.2R target is calculated from actual next-open estimated fill. This is a protected structural level, not a promise of the nearest human-selected swing.
- If a completed candle's true range is at least 2.5 times the mean of the preceding 20 true ranges, no new decisions until 20 minutes after that candle closes. **This is only an after-the-fact volatility guard, not a CPI/PPI detector or calendar.** It cannot warn before a release, and it can miss news. Positions already open are not automatically closed.

## Simulation changes and remaining limits

- Market entries use the next candle open; SL/TP are checked on the entry candle. A bar touching both exits is treated as a stop and marked ambiguous, not represented as a known outcome. If the open gaps past a stop, the stop is filled at the adverse open; a favorable target gap is conservatively filled at the target. Pending market setups spanning a missing bar are cancelled. Stops and targets use the estimated executable side based on the fixed spread.
- P&L is signed from estimated fill to estimated exit, including the fixed spread once through prices. Sizing is recalculated at fill against the 2% budget; if less than 0.01 lot is permitted, no fill. It can still lose more than planned on gaps. Original-risk R is tracked. The v2 does **not** trail stops or apply the old “guaranteed” profit lock. Limit execution is disabled for this profile because same-bar limit ordering needs separate handling.
- Drawdown is **closed-balance drawdown**, not mark-to-market equity drawdown, and the engine does not model broker margin closeout. Trade count and cash balance are path-dependent; conservative ambiguity can change later trades. Missing candles and estimated spread can materially distort execution. No deployment to live execution or order placement is included.
- This repair is scoped to **Institutional Triad**; the other sniper profiles retain the older simulator and are not validated by these tests. A complete per-candle passed/failed checklist for rejected setups is not yet implemented; recorded fills have their entry reason.

## Individual trades

Times are East Africa Time; exit time is the open of the exit candle, not the exact intrabar exit time. Entry is the estimated market-open fill; a candle may touch both levels in unknown order. Detailed reasons are in the companion CSV.

| TF min | Entry EAT | Exit bar EAT | Side | Lots | Fill | Stop | Target | Exit | Outcome | Net $ | Balance $ |
|---:|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|
| 15 | 2026-10-23 15:00 | 2026-10-23 16:15 | sell | 0.02 | 4024.48 | 4033.69 | 4013.428 | 4033.69 | loss | -18.42 | 981.58 |
| 15 | 2026-10-23 16:30 | 2026-10-23 17:00 | sell | 0.02 | 4025.635 | 4033.75 | 4015.897 | 4015.897 | win | 19.48 | 1001.06 |
| 15 | 2026-10-26 16:00 | 2026-10-26 16:45 | sell | 0.01 | 4015.705 | 4034.86 | 3992.719 | 3992.719 | win | 22.99 | 1024.04 |
| 15 | 2026-10-28 19:30 | 2026-10-28 21:30 | buy | 0.01 | 4040.38 | 4027.41 | 4055.944 | 4027.41 | ambiguous | -12.97 | 1011.07 |
| 30 | 2026-10-20 10:30 | 2026-10-20 17:00 | sell | 0.01 | 4131.34 | 4150.82 | 4107.964 | 4150.82 | loss | -19.48 | 980.52 |

All five entry reasons were VWMA/200 EMA reactions with direction alignment, rather than first-FVG-retest triggers. That is an observation, not evidence that reaction setups outperform FVG setups. The M15 28 October both-hit trade is the primary ambiguity to investigate using independently sourced finer-resolution bid/ask data, not by guessing the favorable outcome.

## Validation and next experiments

Automated deterministic tests cover market entry-bar TP/SL, both-hit ambiguity, signed profitable stop exits, gap-through stop, outlier detection, missing volume, causal prefix invariance, and FVG first-touch lifecycle. Shared No-Wick structure, FVG quick/group and Python bridge tests also pass. The separate pre-existing legacy replay test currently fails an expected stop-price assertion (100 versus 101); it was not modified and is not validation of that legacy replay. Browser smoke testing covered the settings, real-candle injection, launch, play and pause; this is not broker integration or exhaustive production validation.

Next, freeze these rules and test substantially longer periods across changing conditions, with a separate untouched chronological holdout. Compare swing-stop versus previous stop, VWMA reaction versus FVG triggers, and multiple costs, without repeatedly optimizing on the final test. Obtain actual bid/ask or lower-timeframe data for ambiguous cases; calculate equity drawdown, gap/slippage stress and broker margin. Add a verified calendar if pre-release CPI/PPI blocking is required. Do not infer causation or live profitability from one favorable week.

Reproduce from the repository root using `node research/run_triad_oanda.cjs` with the two private OANDA JSON snapshots under `research/data/` and dependencies installed. API credentials are not included in the code or report.
