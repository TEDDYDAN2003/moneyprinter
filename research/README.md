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
5. Use OANDA practice only after verifying your account's eligibility and token. The prototype retrieves the most recent 100–5000 completed midpoint candles in one request; it does not yet page multiple years or select a historical date range. It does not submit orders.

The bridge is disabled unless explicitly enabled, and rejects non-local Host and mismatched Origin. These header checks are not a substitute for binding the server to loopback; do not use npm run dev (which binds to all interfaces) for this feature. The OANDA token stays on the server process, not the browser. Use local development only; do not add this token to deployed environment variables. API credentials should be revoked immediately if exposed.

## What this prototype does

- Produces a zoomable candlestick chart for the latest completed M5, M15 or H1 bars. Click a candle to see the causal score. Active FVG boundaries at the selected candle are shown as dashed lines.
- Implements the existing three-candle strict FVG rule, with confirmed bars and no FVG through missing bars. This is a Python reimplementation, not execution of the Free Chart JavaScript.
- 8 adjustable weights (total 100), simple confirmed pivots, close-through BOS/CHoCH, swing reclaims, ATR body size, FVG presence/status, midpoint positioning, candle direction, and fixed UTC London/NY context. MTF/HTF are built from complete groups of 3/12 execution bars and compared using simple high/low logic. Only completed aggregates are used. It is NOT yet the complete specification: FVG displacement/alignment scoring, delayed reclaims, range options, timezone/DST, nuanced candles, liquidity magnitude and full MTF structure remain to be built.
- Requires a recent directional structure break or sweep alongside a directional candle for hypothetical entries. Simulated close entry, ATR stop, fixed R target, non-overlapping trades, flat round-trip price cost, excluding ties, missing-data gaps and timeouts. No accurate bid/ask fills, intrabar ordering, variable spread, commission model, margin, financing or market impact. Win rate counts target hits before costs; P&L subtracts cost. Take care: cost/round-trip assumptions can materially affect results.
- The displayed 60/20/20 chronological segments are exploratory. Because the UI shows all three results on each run, the Test segment is NOT a genuinely untouched final test after repeated tuning. Preserve a separate unseen period/data file and freeze model and settings before final evaluation. No automated tuning or ML exists here yet.
- Each run stores the downloaded candle snapshot, its SHA-256, configuration, per-candle scoring explanations, and backtest summary in `research/data/runs.sqlite3` on the local machine. Snapshots contain future candles, but per-candle score features do not intentionally use future data. Do not commit this local database. Loaded datasets and settings can be exported from the interface, but the SQLite history has no browser yet.
- Free Chart's custom `bv` runtime and arbitrary user-supplied script/JSON compiler are not implemented. Do not execute untrusted JS on the Moneyprinter server. Native FVG overlays are provided as a first step; compatibility requires a separately sandboxed runtime and a documented API.

## Tests
`python3 -m unittest discover -s research -p 'test_*.py'`. Tests include changing future candles and checking prior scores are unchanged. They are not proof of absence of every form of bias; validate with independent data before drawing conclusions.
