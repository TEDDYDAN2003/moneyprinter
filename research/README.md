# FVG Confluence Lab (local research prototype)

This runs the Next.js Moneyprinter UI locally with a Python 3 scoring process. No VPS, machine learning, automated orders, or broker account integration is needed. XAU/USD is the only live source. The prototype is not a trading system and scores are not calibrated probabilities.

## Run on your own computer

1. Install Node.js 20+ and Python 3.10+ (Python uses only its standard library). Open this repository in VS Code and run `npm install`.
2. Revoke the OANDA token previously shared in chat; create a new practice token. Do not paste it into the repository, browser, a notebook, logs or chat. Set it only in the terminal environment.
3. Enable the local bridge and start Next from the same terminal. In macOS/Linux:

```sh
export RESEARCH_LOCAL_ENABLED=1
export OANDA_API_TOKEN='YOUR_NEW_PRACTICE_TOKEN'
npx next dev --hostname 127.0.0.1 --port 3000
```

PowerShell:

```powershell
$env:RESEARCH_LOCAL_ENABLED='1'
$env:OANDA_API_TOKEN='YOUR_NEW_PRACTICE_TOKEN'
npx next dev --hostname 127.0.0.1 --port 3000
```

4. Open `http://localhost:3000/admin/research`. Do not expose or forward this development server to the internet. If Supabase auth is configured, sign in. Without OANDA, select synthetic demo data, which is visibly marked and is not gold.
5. Use OANDA practice only after verifying your account's eligibility and token. The prototype retrieves the most recent 100–50,000 completed midpoint candles, paging backwards through OANDA in requests of at most 5,000 each. Actual history depends on provider availability; the UI reports the returned date range and warns if fewer are returned. The app does not yet support an arbitrary date range or more than 50,000 candles per run. OANDA provides M1, M5, M15, M30, H1, D and W natively. The 3-minute chart is aggregated from three complete consecutive M1 bars in UTC-aligned buckets; OANDA does not provide M3 natively. The 45-minute chart is built from three complete, consecutive M15 bars using UTC-aligned 45-minute buckets; incomplete groups are excluded, and boundaries may differ from other platforms. A 45m run needs approximately three times as many 15m candles and may take longer. Large downloads and local snapshots may take time and disk space. It does not submit orders.

The bridge is disabled unless explicitly enabled, and rejects non-local Host and mismatched Origin. These header checks are not a substitute for binding the server to loopback; do not use npm run dev (which binds to all interfaces) for this feature. The OANDA token stays on the server process, not the browser. Use local development only; do not add this token to deployed environment variables. API credentials should be revoked immediately if exposed.

## Automatic older history

OANDA starts with 5,000 candles by default. As you pan near the left edge, the app requests up to 5,000 older completed candles at a time from the oldest candle in the existing local snapshot, deduplicates the boundary, and prepends them. It keeps the selected candle and viewport in place, recomputes the scoring and backtest using the stored settings from the original run, and stops when OANDA returns no more data or the 50,000-candle per-run cap is reached. A network error can be retried. The 45-minute chart is built from 15-minute source bars, so it can require three times as many requests. Automatic history is not enabled for synthetic demonstration data.

Adding history can change calculations at existing candles because they now have more prior context, and it moves the exploratory 60/20/20 split. Each expanded run is saved as another snapshot and uses local disk space. Neither its displayed test partition nor a manually tuned result should be treated as a genuinely untouched final test. Dataset expansion does not update the newest/live candles; use Load & analyse for a fresh snapshot.

## What this prototype does

- Produces a zoomable candlestick chart for the latest completed 1m, 3m, 5m, 15m, 30m, 45m, 1h, daily or weekly bars. Click a candle to see the causal score. Use **Maximize chart** (or Esc to exit) for browser fullscreen. Active FVG boundaries at the selected candle are shown as dashed lines.
- Implements the existing three-candle strict FVG rule, with confirmed bars and no FVG through missing bars. This is a Python reimplementation, not execution of the Free Chart JavaScript.
- Daily and weekly OANDA candles use its New York 17:00 alignment, with Friday weekly alignment. Because the current scorer and indicator gap handling assume fixed-duration, continuously aligned intraday candles, daily/weekly are chart-only: scores, backtests and custom indicators are disabled rather than displaying misleading values.
- 8 adjustable weights (total 100), simple confirmed pivots, close-through BOS/CHoCH, swing reclaims, ATR body size, FVG presence/status, midpoint positioning, candle direction, and fixed UTC London/NY context. MTF/HTF are built from complete groups of 3/12 execution bars and compared using simple high/low logic. Only completed aggregates are used. It is NOT yet the complete specification: FVG displacement/alignment scoring, delayed reclaims, range options, timezone/DST, nuanced candles, liquidity magnitude and full MTF structure remain to be built.
- Requires a recent directional structure break or sweep alongside a directional candle for hypothetical entries. Simulated close entry, ATR stop, fixed R target, non-overlapping trades, flat round-trip price cost, excluding ties, missing-data gaps and timeouts. No accurate bid/ask fills, intrabar ordering, variable spread, commission model, margin, financing or market impact. Win rate counts target hits before costs; P&L subtracts cost. Take care: cost/round-trip assumptions can materially affect results.
- The displayed 60/20/20 chronological segments are exploratory. Because the UI shows all three results on each run, the Test segment is NOT a genuinely untouched final test after repeated tuning. Preserve a separate unseen period/data file and freeze model and settings before final evaluation. No automated tuning or ML exists here yet.
- Each run stores the downloaded candle snapshot, its SHA-256, configuration, per-candle scoring explanations, and backtest summary in `research/data/runs.sqlite3` on the local machine. Snapshots contain future candles, but per-candle score features do not intentionally use future data. Do not commit this local database. Loaded datasets and settings can be exported from the interface, but the SQLite history has no browser yet.
## Custom indicator editor

Load candles and choose **FVG Reaction Study** from the chart’s Indicator selector to display the built-in study. Open **Custom indicator** to adjust its settings, or paste/upload another Free Chart inputs JSON array and JavaScript factory body. Press **Compile & show** and adjust the generated controls. Remove it with **Remove indicator**. Scripts run only in a disposable browser worker inside an opaque-origin sandboxed iframe with a restrictive network CSP and a 3-second timeout; they do not run in Python or on the server. This reduces risk, but browser sandboxing is not a security guarantee: use scripts you trust and keep your browser updated.

The built-in study uses the supplied definitions: a bullish grab closes in or below the FVG; a bullish sweep touches it but closes above it, with mirrored bearish rules. The study is visual only and does not change the separate Python scoring engine. Its normal-approximation confidence margin can be misleading for small or dependent samples (including zero-width intervals at 0% or 100%); 50% is not a validated market baseline.

This is a **compatibility subset**, not the full Free Chart runtime. Implemented: `calc`, `draw`, input defaults, `bool`, `int`, `float`, `color`, `select`, `session`, `string`, `time`, `source`, and `bv.bounds`, `visible`, `visibleBars`, `xOfIndex`, `yOfPrice`, `halfBar`, `precision`, `priceText`, `clamp`, `syminfo`, `parseClock`, `detectBarMs`, `withAlpha`, `text`, `label`, `line`, `box`, and `ma` (SMA/EMA/RMA/WMA). The worker supports raw `ctx` and simple axes. Under-candle compositing, advanced autoscaling, alerts, plotted figures, additional Free Chart helpers and perfect pixel parity are not implemented. Unsupported calls show an error.

Rendering is a separate transparent overlay and may look different from Free Chart, particularly backgrounds, text, chart margins and volume charts. The latest completed candle is still passed as the last bar; scripts that treat the last bar as live will lag one candle. Imported scripts see the entire loaded dataset even when you click a historical candle: they may repaint or use future candles. They **do not affect the Python scores or backtests**. Do not assume the imported indicator is causal. Script and settings remain in page memory and are not saved on reload.

## Tests
`python3 -m unittest discover -s research -p 'test_*.py'`. Tests include changing future candles and checking prior scores are unchanged. They are not proof of absence of every form of bias; validate with independent data before drawing conclusions.


## Replay and suggestion win-rate checker

Load an intraday chart, click **Backtest** in its header, click a past candle, and choose **Start at selected candle**. Play, pause, step and speed controls work in fullscreen. Only candles through the current replay cursor are supplied to the chart and indicator; analysis uses the causal scores calculated for that completed candle. Reset before picking another start or changing simulation parameters. Backward history loading is paused while the replay panel is open.

The prototype proposes one pending or open trade at a time when the existing heuristic score reaches the selected threshold and a matching, fresh three-candle FVG with a direction-matching middle candle lies beyond the close. Entry is the near FVG edge, the stop is beyond its far edge plus an ATR buffer, and the target is fixed R. A pending limit can fill by touch on a subsequent candle, expire or cancel on an opposing score. A position resolves on the first later stop/target touch. If entry and exit occur in one bar, both exits occur in one bar, a relevant gap occurs, or the hold limit expires, the outcome is excluded; OHLC data cannot determine the sequence or actual execution. The round-trip price cost reduces net R; it is not a spread/slippage execution model. Wins and losses are gross target/stop hits, not net-profit classification. Pending and open positions are not completed trades.

Recent same-direction outcomes in *this replay* are displayed only after 30 resolved trades (up to the latest 100); this is a descriptive sample, not a calibrated probability or learning algorithm. Parameters are fixed for the run. The suggestion win rate is **not** the FVG study's grab/sweep outcome rate. The selected FVG indicator has separate event statistics, and its adjustable study inputs do not control this prototype strategy. The scorer includes simplified structure/bias and liquidity-reclaim heuristics, not the requested exact no-wick script, independently confirmed order blocks, or a trained model. It does not consume live prices, place orders, learn automatically, or guarantee improvement. Test later periods separately and retain excluded counts when assessing results.


### Chart indicators and navigation

The indicator selector includes **No-Wick Structure**, based on the saved internal-structure Free Chart script; its settings are available from the chart, including fullscreen. For the XAU/USD chart its tick-size input defaults to 0.01 price units and can be changed or disabled (0). This is the saved internal-only version, not the previously pasted external/internal script, and it is visual only: no alert delivery or orders. Its trend ribbon can repaint retrospectively after a later confirmation, and its own simulated statistics use different assumptions from the replay checker (including counting same-bar TP/SL ties as losses). Do not treat those figures as validated backtest results. The indicator does not currently feed the suggestion scorer.

During replay, drag the chart to inspect prior candles; dragging turns off automatic following. Select **Follow latest** to recenter and resume following. While dragging or scaling, the existing indicator image is temporarily transformed to track chart movement and redrawn after movement stops. Depending on chart size and indicator complexity, newly exposed drawing areas or fixed indicator tables can briefly reposition until the redraw finishes.
