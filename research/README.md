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
5. Use OANDA practice only after verifying your account's eligibility and token. The prototype retrieves the most recent 100–50,000 completed midpoint candles, paging backwards through OANDA in requests of at most 5,000 each. Actual history depends on provider availability; the UI reports the returned date range and warns if fewer are returned. The app does not yet support an arbitrary date range or more than 50,000 candles per run. OANDA provides M1, M3, M5, M15, M30, H1, D and W natively. The 45-minute chart is built from three complete, consecutive M15 bars using UTC-aligned 45-minute buckets; incomplete groups are excluded, and boundaries may differ from other platforms. A 45m run needs approximately three times as many 15m candles and may take longer. Large downloads and local snapshots may take time and disk space. It does not submit orders.

The bridge is disabled unless explicitly enabled, and rejects non-local Host and mismatched Origin. These header checks are not a substitute for binding the server to loopback; do not use npm run dev (which binds to all interfaces) for this feature. The OANDA token stays on the server process, not the browser. Use local development only; do not add this token to deployed environment variables. API credentials should be revoked immediately if exposed.

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
