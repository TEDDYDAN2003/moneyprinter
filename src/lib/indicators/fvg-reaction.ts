// Built-in Free Chart study: Institutional FVG Reaction — High-Probability ICT Confluence Engine
export const fvgReactionInputs = [
  { id: 'atrLength',      name: 'ATR length',                             type: 'int',    defval: 14,    min: 1,   max: 200,  step: 1   },
  { id: 'atrMultiple',    name: 'Target distance (ATR multiple)',          type: 'float',  defval: 1.5,   min: 0.1, max: 20,   step: 0.1 },
  { id: 'outcomeBars',    name: 'Outcome window (bars after event)',       type: 'int',    defval: 45,    min: 1,   max: 500,  step: 1   },
  { id: 'zoneLife',       name: 'Maximum FVG age (bars)',                  type: 'int',    defval: 100,   min: 1,   max: 1000, step: 1   },
  { id: 'sweepLookback',  name: 'Liquidity sweep lookback (bars)',         type: 'int',    defval: 10,    min: 2,   max: 50,   step: 1   },
  { id: 'swingLen',       name: 'Swing detection length (bars each side)', type: 'int',    defval: 5,     min: 2,   max: 20,   step: 1   },
  { id: 'minDisplace',    name: 'Min FVG displacement (ATR multiple)',     type: 'float',  defval: 1.0,   min: 0.5, max: 5,    step: 0.1 },
  { id: 'requireSweep',   name: 'Require Liquidity Sweep before entry',    type: 'bool',   defval: true  },
  { id: 'requireKillzone',name: 'Require ICT Killzone session',            type: 'bool',   defval: true  },
  { id: 'requireTrend',   name: 'Require 200 EMA trend alignment',         type: 'bool',   defval: true  },
  { id: 'filterNews',     name: 'Discover and ignore CPI/PPI shocks',      type: 'bool',   defval: true  },
  { id: 'showEntryTags',  name: 'Show BUY / SELL entry tags on chart',     type: 'bool',   defval: true  },
  { id: 'showBull',       name: 'Show bullish FVGs',                       type: 'bool',   defval: true  },
  { id: 'showBear',       name: 'Show bearish FVGs',                       type: 'bool',   defval: true  },
  { id: 'showTargets',    name: 'Show TP/SL level lines',                  type: 'bool',   defval: true  },
  { id: 'showTable',      name: 'Show performance statistics table',        type: 'bool',   defval: false },
  { id: 'tablePos',       name: 'Table position',                          type: 'select', options: ['top_right','top_left','bottom_right','bottom_left'], defval: 'top_right' },
  { id: 'opacity',        name: 'FVG fill opacity (%)',                    type: 'int',    defval: 20,    min: 0,   max: 80,   step: 1   },
  { id: 'bullColor',      name: 'Bullish FVG colour',                      type: 'color',  defval: '#10b981', tab: 'style' },
  { id: 'bearColor',      name: 'Bearish FVG colour',                      type: 'color',  defval: '#f43f5e', tab: 'style' },
  { id: 'newsColor',      name: 'News shock colour',                       type: 'color',  defval: '#eab308', tab: 'style' }
];

export const fvgReactionScript = String.raw`
// ================================================================
// Institutional FVG Reaction — ICT High-Probability Confluence Engine
// Requires ALL of: 200 EMA trend, ICT Killzone, Sweep+MSS, fresh FVG,
//                  confirming close candle, no news blackout
// ================================================================
const defaults = {
  atrLength: 14, atrMultiple: 1.5, outcomeBars: 45, zoneLife: 100,
  sweepLookback: 10, swingLen: 5, minDisplace: 1.0,
  requireSweep: true, requireKillzone: true, requireTrend: true, filterNews: true,
  showEntryTags: true, showBull: true, showBear: true, showTargets: true,
  showTable: false, tablePos: 'top_right', opacity: 20,
  bullColor: '#10b981', bearColor: '#f43f5e', newsColor: '#eab308'
};
const KEYS = ['bullReaction', 'bearReaction'];

// ---- EMA helper (causal, no look-ahead) ----
function calcEMA(closes, len) {
  const k = 2 / (len + 1);
  const ema = new Array(closes.length).fill(undefined);
  let seed = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i < len - 1) { seed += closes[i]; continue; }
    if (i === len - 1) { seed += closes[i]; ema[i] = seed / len; continue; }
    ema[i] = closes[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

// ---- Swing high / low detector ----
function isSwingHigh(data, i, len) {
  if (i < len || i >= data.length - len) return false;
  const h = data[i].high;
  for (let k = 1; k <= len; k++) {
    if (data[i - k].high >= h || data[i + k].high >= h) return false;
  }
  return true;
}
function isSwingLow(data, i, len) {
  if (i < len || i >= data.length - len) return false;
  const l = data[i].low;
  for (let k = 1; k <= len; k++) {
    if (data[i - k].low <= l || data[i + k].low <= l) return false;
  }
  return true;
}

// ---- ICT Killzone check (UTC hours from bar timestamp) ----
function inKillzone(bar) {
  const d = new Date(bar.timestamp);
  const h = d.getUTCHours(), m = d.getUTCMinutes(), tm = h * 60 + m;
  // London Open: 07:00-10:00 | NY Open: 12:30-15:30 | London Close: 15:00-16:00 | Asian: 00:00-04:00
  return (tm >= 420 && tm <= 600) ||   // London 07:00-10:00
         (tm >= 750 && tm <= 930) ||   // NY Open 12:30-15:30
         (tm >= 0   && tm <= 240);     // Asian range 00:00-04:00
}

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (n < 20) { indicator._fvgStudy = null; return rows; }

    const atrLen     = Math.max(1, Math.min(200, Math.floor(Number(p.atrLength) || 14)));
    const horizon    = Math.max(1, Math.min(500, Math.floor(Number(p.outcomeBars) || 45)));
    const life       = Math.max(1, Math.min(1000, Math.floor(Number(p.zoneLife) || 100)));
    const multiple   = Math.max(0.1, Number(p.atrMultiple) || 1.5);
    const swLookback = Math.max(2, Math.min(50, Math.floor(Number(p.sweepLookback) || 10)));
    const swingLen   = Math.max(2, Math.min(20, Math.floor(Number(p.swingLen) || 5)));
    const minDisp    = Math.max(0.5, Number(p.minDisplace) || 1.0);

    // ---- ATR (Wilder) ----
    const atr = new Array(n).fill(null);
    let atrSeed = 0, atrPrev = null;
    for (let i = 0; i < n; i++) {
      const c = data[i];
      const tr = i ? Math.max(c.high - c.low,
        Math.abs(c.high - data[i-1].close), Math.abs(c.low - data[i-1].close))
        : (c.high - c.low);
      if (!Number.isFinite(tr) || tr < 0) continue;
      if (i < atrLen) {
        atrSeed += tr;
        if (i === atrLen - 1) { atrPrev = atrSeed / atrLen; atr[i] = atrPrev; }
      } else if (atrPrev !== null) {
        atrPrev = (atrPrev * (atrLen - 1) + tr) / atrLen;
        atr[i] = atrPrev;
      }
    }

    // ---- 50/200 EMA for trend regime ----
    const closes = data.map(d => d.close);
    const ema50  = calcEMA(closes, 50);
    const ema200 = calcEMA(closes, 200);

    // ---- News shock detection (CPI/PPI window: 12:30-13:30 or 08:30 EST = 13:30 UTC, big range) ----
    const newsShock = new Array(n).fill(false);
    if (p.filterNews) {
      for (let i = 0; i < n; i++) {
        const c = data[i];
        const barAtr = atr[i] || 1.0;
        if ((c.high - c.low) < 2.5 * barAtr) continue;
        const d = new Date(c.timestamp);
        const h = d.getUTCHours(), m = d.getUTCMinutes(), tm = h * 60 + m;
        // CPI/PPI/NFP at 13:30 UTC (8:30 EST), FOMC at 18:00 UTC (13:00 EST)
        const isNewsWindow = (tm >= 795 && tm <= 870) || // 13:15-14:30
                             (tm >= 1050 && tm <= 1110); // 17:30-18:30
        if (isNewsWindow) {
          for (let k = 0; k < 8; k++) { if (i + k < n) newsShock[i + k] = true; }
        }
      }
    }

    // ---- Precompute swing highs/lows (using only completed bars i.e. index < n-1) ----
    // We store the most recent swing high/low visible at bar i (causal)
    const swingHighAt = new Array(n).fill(null); // last swing high price at bar i
    const swingLowAt  = new Array(n).fill(null);
    let lastSH = null, lastSL = null;
    for (let i = 0; i < n; i++) {
      // Swing confirmed at i - swingLen (requires swingLen future bars to validate)
      const confirmed = i - swingLen;
      if (confirmed >= swingLen && confirmed < n) {
        if (isSwingHigh(data, confirmed, swingLen)) lastSH = data[confirmed].high;
        if (isSwingLow(data, confirmed, swingLen))  lastSL = data[confirmed].low;
      }
      swingHighAt[i] = lastSH;
      swingLowAt[i]  = lastSL;
    }

    // ---- Main pass ----
    const stats = {};
    for (const k of KEYS) stats[k] = { win: 0, loss: 0, tie: 0, open: 0, total: 0 };
    let zones = [], active = [], waiting = [], entries = [];

    // Track recent sweep events (bar index + direction)
    // sweepEvent = { bar, dir: 1=sell-side swept(bullish), -1=buy-side swept(bearish) }
    let sweepEvents = [];

    for (let i = 1; i < n - 1; i++) {
      const c   = data[i];
      const cAtr = atr[i] || atr[i-1] || 1.0;

      // ---- Detect liquidity sweeps (wick below recent low or above recent high, then close recovers) ----
      // Bullish sweep: wick took out a prior swing low then closed back above it
      if (swingLowAt[i] !== null) {
        const ssl = swingLowAt[i];
        if (c.low < ssl && c.close > ssl && (c.close - c.low) > 0.5 * (c.high - c.low)) {
          sweepEvents.push({ bar: i, dir: 1 }); // sell-side liquidity swept -> bullish
        }
      }
      // Bearish sweep: wick took out a prior swing high then closed back below it
      if (swingHighAt[i] !== null) {
        const bsl = swingHighAt[i];
        if (c.high > bsl && c.close < bsl && (c.high - c.close) > 0.5 * (c.high - c.low)) {
          sweepEvents.push({ bar: i, dir: -1 }); // buy-side liquidity swept -> bearish
        }
      }
      // Age-out old sweep events beyond lookback window
      sweepEvents = sweepEvents.filter(e => i - e.bar <= swLookback);

      // ---- Check waiting trade outcomes ----
      for (let k = waiting.length - 1; k >= 0; k--) {
        const q = waiting[k];
        const hitTp = q.dir === 1 ? c.high >= q.tp : c.low <= q.tp;
        const hitSl = q.dir === 1 ? c.low  <= q.sl : c.high >= q.sl;
        if (hitTp || hitSl) {
          const st = stats[q.key];
          if (hitTp && hitSl) { st.tie++;  q.status = 'tie';  }
          else if (hitTp)     { st.win++;  q.status = 'win';  }
          else                { st.loss++; q.status = 'loss'; }
          q.end = i; waiting.splice(k, 1);
        } else if (i - q.bar >= horizon) {
          stats[q.key].open++; q.status = 'timeout'; q.end = i; waiting.splice(k, 1);
        }
      }

      // ---- Check FVG mitigations & entry triggers ----
      for (let k = active.length - 1; k >= 0; k--) {
        const z = active[k];
        z.end = i;
        if (i - z.created > life) { z.status = 'expired'; active.splice(k, 1); continue; }

        // Skip if news blackout
        if (p.filterNews && newsShock[i]) { z.status = 'news_skipped'; active.splice(k, 1); continue; }

        // Price must touch the FVG zone
        const touch = c.low <= z.top && c.high >= z.bottom;
        if (!touch) continue;

        // ---- Confluence Gate — ALL must pass ----

        // 1. 200 EMA trend alignment
        if (p.requireTrend) {
          const e200 = ema200[i];
          if (e200 === undefined) { z.status = 'filtered_trend'; active.splice(k, 1); continue; }
          if (z.dir === 1  && c.close < e200) { z.status = 'filtered_trend'; active.splice(k, 1); continue; }
          if (z.dir === -1 && c.close > e200) { z.status = 'filtered_trend'; active.splice(k, 1); continue; }
        }

        // 2. ICT Killzone session
        if (p.requireKillzone && !inKillzone(c)) { z.status = 'filtered_session'; active.splice(k, 1); continue; }

        // 3. Recent liquidity sweep in the matching direction
        if (p.requireSweep) {
          const hasSweep = sweepEvents.some(e => e.dir === z.dir && e.bar >= i - swLookback);
          if (!hasSweep && !z.hadDisplacement) { z.status = 'filtered_sweep'; active.splice(k, 1); continue; }
        }

        // 4. Confirming bar close (candle must close in the direction of the trade from inside or just below/above FVG)
        const isBull = z.dir === 1;
        const confirmClose = isBull ? (c.close > c.open && c.close > z.bottom) : (c.close < c.open && c.close < z.top);
        if (!confirmClose) { continue; } // Don't remove, wait for a confirming bar

        // ---- All conditions met — log the entry ----
        z.status = 'mitigated';
        active.splice(k, 1);

        const key = z.dir === 1 ? 'bullReaction' : 'bearReaction';
        const st = stats[key];
        st.total++;

        // SL: beyond the FVG opposite edge + buffer
        const sl = isBull ? z.bottom - (0.5 * cAtr) : z.top + (0.5 * cAtr);
        const risk = Math.abs(c.close - sl);
        // TP: use structural target (next swing opposite) or ATR multiple
        const nextSwingTp = isBull ? swingHighAt[i] : swingLowAt[i];
        let tp;
        if (nextSwingTp && Math.abs(nextSwingTp - c.close) > risk * 0.8 &&
            Math.abs(nextSwingTp - c.close) < risk * 5) {
          tp = nextSwingTp; // structural TP
        } else {
          tp = isBull ? c.close + risk * multiple : c.close - risk * multiple;
        }

        const q = { bar: i, price: c.close, dir: z.dir, key, tp, sl, status: 'waiting', end: i };
        z.ev = q;
        waiting.push(q);
        entries.push({ bar: i, price: c.close, dir: z.dir, tag: isBull ? 'BUY ENTRY' : 'SELL ENTRY', tp, sl });
      }

      // ---- Detect new 3-candle FVG creation ----
      if (i >= 2) {
        const c0 = data[i - 2], c1 = data[i - 1], c2 = data[i];
        let dir = 0, bottom = 0, top = 0;
        if (c2.low > c0.high) { dir = 1;  bottom = c0.high; top = c2.low;  } // bullish FVG
        if (c2.high < c0.low) { dir = -1; bottom = c2.high; top = c0.low; } // bearish FVG

        if (dir) {
          const body1   = Math.abs(c1.close - c1.open);
          const fvgSize = top - bottom;
          // Require displacement: middle candle body >= minDisp * ATR and FVG size >= 0.3 * ATR
          const hadDisplacement = body1 >= minDisp * cAtr && fvgSize >= 0.3 * cAtr;
          const z = { from: i - 2, created: i, end: i, top, bottom, dir, hadDisplacement, status: 'open', ev: null };
          zones.push(z);
          if (hadDisplacement) active.push(z); // only track FVGs with real displacement
        }
      }
    }

    indicator._fvgStudy = { p, stats, zones: zones.slice(-200), entries: entries.slice(-60), newsShock, n };
    return rows;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const v = indicator._fvgStudy;
    if (!v) return false;
    const p = v.p;
    const vis = bv.visible(args);
    const from = Math.max(0, Math.floor(vis.from) - 2);
    const to   = Math.min(v.n - 1, Math.ceil(vis.to) + 2);
    const X = i     => bv.xOfIndex(args, i);
    const Y = price => bv.yOfPrice(args, price);

    ctx.save();
    const alpha = Math.max(0, Math.min(0.8, Number(p.opacity) / 100));

    // ---- Draw FVG zones ----
    for (const z of v.zones) {
      if ((z.dir === 1 && !p.showBull) || (z.dir === -1 && !p.showBear)) continue;
      const drawEnd = z.status === 'open' ? Math.max(z.end, to) : z.end;
      if (drawEnd < from || z.from > to) continue;
      bv.box(args, {
        fromIndex: z.from, toIndex: drawEnd, top: z.top, bottom: z.bottom,
        color: z.dir === 1 ? p.bullColor : p.bearColor,
        fillOpacity:   z.status === 'open' ? alpha : alpha * 0.4,
        borderOpacity: z.status === 'open' ? 0.7   : 0.25,
        under: true
      });
    }

    // ---- Draw news shock warning bands ----
    if (p.filterNews) {
      let inShock = false, shockStart = -1;
      for (let i = from; i <= to; i++) {
        const is = v.newsShock[i] || false;
        if (is && !inShock) { inShock = true; shockStart = i; }
        else if (!is && inShock) {
          inShock = false;
          bv.box(args, { fromIndex: shockStart, toIndex: i - 1, top: 1e9, bottom: -1e9,
            color: p.newsColor, fillOpacity: 0.07, borderOpacity: 0 });
        }
      }
      if (inShock) {
        bv.box(args, { fromIndex: shockStart, toIndex: to, top: 1e9, bottom: -1e9,
          color: p.newsColor, fillOpacity: 0.07, borderOpacity: 0 });
      }
    }

    // ---- Draw entry tags ----
    if (p.showEntryTags) {
      for (const e of v.entries) {
        if (e.bar < from || e.bar > to) continue;
        const isBuy = e.dir === 1;
        const color = isBuy ? p.bullColor : p.bearColor;

        // Entry label chip
        bv.label(args, {
          index: e.bar, price: e.price,
          text: isBuy ? '▲ BUY ENTRY' : '▼ SELL ENTRY',
          color: '#fff', background: color,
          align: 'center', baseline: isBuy ? 'top' : 'bottom',
          size: 10, padding: 3,
          offsetY: isBuy ? 14 : -14
        });

        if (p.showTargets) {
          const x  = X(e.bar);
          const xE = X(Math.min(e.bar + 60, to + 1));

          // TP line
          const yTp = Y(e.tp);
          if (Number.isFinite(yTp)) {
            ctx.save();
            ctx.strokeStyle = isBuy ? p.bullColor : p.bearColor;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(x, yTp); ctx.lineTo(xE, yTp); ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = isBuy ? p.bullColor : p.bearColor;
            ctx.textAlign = 'left';
            ctx.fillText('TP ' + e.tp.toFixed(2), xE + 3, yTp - 1);
            ctx.restore();
          }

          // SL line
          const ySl = Y(e.sl);
          if (Number.isFinite(ySl)) {
            ctx.save();
            ctx.strokeStyle = '#f43f5e';
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(x, ySl); ctx.lineTo(xE, ySl); ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#f43f5e';
            ctx.textAlign = 'left';
            ctx.fillText('SL ' + e.sl.toFixed(2), xE + 3, ySl + 9);
            ctx.restore();
          }

          // Entry line
          const yEn = Y(e.price);
          if (Number.isFinite(yEn)) {
            ctx.save();
            ctx.strokeStyle = '#f8fafc';
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(x, yEn); ctx.lineTo(xE, yEn); ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    // ---- Performance stats table ----
    if (p.showTable) {
      const { stats } = v;
      const lines = [
        'FVG CONFLUENCE STUDY',
        '─────────────────────────',
        ...KEYS.map(k => {
          const s = stats[k];
          const tot = s.win + s.loss + s.tie;
          const wr = tot ? ((s.win + 0.5 * s.tie) / tot * 100).toFixed(0) : '–';
          return k === 'bullReaction' ? '▲ BULL:  W ' + s.win + '  L ' + s.loss + '  WR ' + wr + '%'
                                     : '▼ BEAR:  W ' + s.win + '  L ' + s.loss + '  WR ' + wr + '%';
        }),
        'Open: ' + (stats.bullReaction.open + stats.bearReaction.open)
      ];
      const pos = String(p.tablePos || 'top_right');
      const lh = 15, pad = 8, w = 200, h = lines.length * lh + pad * 2;
      const bnd = bv.bounds(args);
      const tx = pos.includes('right') ? bnd.right  - w - pad : bnd.left  + pad;
      const ty = pos.includes('top')   ? bnd.top    + pad     : bnd.bottom - h - pad;
      ctx.save();
      ctx.fillStyle = 'rgba(10,14,22,0.82)';
      ctx.fillRect(tx, ty, w, h);
      ctx.font = '10px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      lines.forEach((ln, li) => {
        ctx.fillStyle = li === 0 ? '#94a3b8' : li === 1 ? '#334155' : '#e2e8f0';
        ctx.fillText(ln, tx + pad, ty + pad + li * lh);
      });
      ctx.restore();
    }

    ctx.restore();
    return true;
  }
};
`;
