// Built-in Free Chart study: Institutional FVG Reaction — Clean ICT Confluence Engine
export const fvgReactionInputs = [
  { id: 'atrLength',      name: 'ATR length',                             type: 'int',    defval: 14,    min: 1,   max: 200,  step: 1   },
  { id: 'atrMultiple',    name: 'Target distance (ATR multiple)',          type: 'float',  defval: 1.5,   min: 0.1, max: 20,   step: 0.1 },
  { id: 'outcomeBars',    name: 'Outcome window (bars after event)',       type: 'int',    defval: 45,    min: 1,   max: 500,  step: 1   },
  { id: 'zoneLife',       name: 'Maximum FVG age (bars)',                  type: 'int',    defval: 40,    min: 5,   max: 300,  step: 1   },
  { id: 'sweepLookback',  name: 'Liquidity sweep lookback (bars)',         type: 'int',    defval: 10,    min: 2,   max: 50,   step: 1   },
  { id: 'swingLen',       name: 'Swing detection length (bars each side)', type: 'int',    defval: 5,     min: 2,   max: 20,   step: 1   },
  { id: 'minDisplace',    name: 'Min displacement body (ATR multiple)',    type: 'float',  defval: 1.2,   min: 0.5, max: 5,    step: 0.1 },
  { id: 'minGapAtr',      name: 'Min FVG gap size (ATR multiple)',         type: 'float',  defval: 0.35,  min: 0.1, max: 3,    step: 0.05 },
  { id: 'maxVisibleZones',name: 'Max historical zones displayed',          type: 'int',    defval: 25,    min: 5,   max: 100,  step: 5   },
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
  { id: 'opacity',        name: 'FVG fill opacity (%)',                    type: 'int',    defval: 12,    min: 2,   max: 60,   step: 1   },
  { id: 'bullColor',      name: 'Bullish FVG colour',                      type: 'color',  defval: '#10b981', tab: 'style' },
  { id: 'bearColor',      name: 'Bearish FVG colour',                      type: 'color',  defval: '#f43f5e', tab: 'style' },
  { id: 'newsColor',      name: 'News shock colour',                       type: 'color',  defval: '#eab308', tab: 'style' }
];

export const fvgReactionScript = String.raw`
// ================================================================
// Clean Institutional FVG Reaction — Smart Money Concepts
// Only displays real displacement FVGs (avoids micro-gap clutter)
// Mitigates and ends zones once price touches/fills the imbalance
// ================================================================
const defaults = {
  atrLength: 14, atrMultiple: 1.5, outcomeBars: 45, zoneLife: 40,
  sweepLookback: 10, swingLen: 5, minDisplace: 1.2, minGapAtr: 0.35, maxVisibleZones: 25,
  requireSweep: true, requireKillzone: true, requireTrend: true, filterNews: true,
  showEntryTags: true, showBull: true, showBear: true, showTargets: true,
  showTable: false, tablePos: 'top_right', opacity: 12,
  bullColor: '#10b981', bearColor: '#f43f5e', newsColor: '#eab308'
};
const KEYS = ['bullReaction', 'bearReaction'];

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

function inKillzone(bar) {
  const d = new Date(bar.timestamp);
  const h = d.getUTCHours(), m = d.getUTCMinutes(), tm = h * 60 + m;
  return (tm >= 420 && tm <= 600) ||   // London 07:00-10:00
         (tm >= 750 && tm <= 930) ||   // NY Open 12:30-15:30
         (tm >= 0   && tm <= 240);     // Asian 00:00-04:00
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
    const life       = Math.max(5, Math.min(300, Math.floor(Number(p.zoneLife) || 40)));
    const multiple   = Math.max(0.1, Number(p.atrMultiple) || 1.5);
    const swLookback = Math.max(2, Math.min(50, Math.floor(Number(p.sweepLookback) || 10)));
    const swingLen   = Math.max(2, Math.min(20, Math.floor(Number(p.swingLen) || 5)));
    const minDisp    = Math.max(0.5, Number(p.minDisplace) || 1.2);
    const minGap     = Math.max(0.1, Number(p.minGapAtr) || 0.35);
    const maxZones   = Math.max(5, Math.min(100, Math.floor(Number(p.maxVisibleZones) || 25)));

    // ATR
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

    const closes = data.map(d => d.close);
    const ema200 = calcEMA(closes, 200);

    // News shock
    const newsShock = new Array(n).fill(false);
    if (p.filterNews) {
      for (let i = 0; i < n; i++) {
        const c = data[i];
        const barAtr = atr[i] || 1.0;
        if ((c.high - c.low) < 2.5 * barAtr) continue;
        const d = new Date(c.timestamp);
        const tm = d.getUTCHours() * 60 + d.getUTCMinutes();
        if ((tm >= 795 && tm <= 870) || (tm >= 1050 && tm <= 1110)) {
          for (let k = 0; k < 6; k++) { if (i + k < n) newsShock[i + k] = true; }
        }
      }
    }

    // Swings
    const swingHighAt = new Array(n).fill(null);
    const swingLowAt  = new Array(n).fill(null);
    let lastSH = null, lastSL = null;
    for (let i = 0; i < n; i++) {
      const confirmed = i - swingLen;
      if (confirmed >= swingLen && confirmed < n) {
        if (isSwingHigh(data, confirmed, swingLen)) lastSH = data[confirmed].high;
        if (isSwingLow(data, confirmed, swingLen))  lastSL = data[confirmed].low;
      }
      swingHighAt[i] = lastSH;
      swingLowAt[i]  = lastSL;
    }

    const stats = {};
    for (const k of KEYS) stats[k] = { win: 0, loss: 0, tie: 0, open: 0, total: 0 };
    let zones = [], active = [], waiting = [], entries = [];
    let sweepEvents = [];

    for (let i = 1; i < n - 1; i++) {
      const c = data[i];
      const cAtr = atr[i] || atr[i-1] || 1.0;

      // Sweeps
      if (swingLowAt[i] !== null) {
        const ssl = swingLowAt[i];
        if (c.low < ssl && c.close > ssl && (c.close - c.low) > 0.45 * (c.high - c.low)) {
          sweepEvents.push({ bar: i, dir: 1 });
        }
      }
      if (swingHighAt[i] !== null) {
        const bsl = swingHighAt[i];
        if (c.high > bsl && c.close < bsl && (c.high - c.close) > 0.45 * (c.high - c.low)) {
          sweepEvents.push({ bar: i, dir: -1 });
        }
      }
      sweepEvents = sweepEvents.filter(e => i - e.bar <= swLookback);

      // Outcomes
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

      // Mitigations
      for (let k = active.length - 1; k >= 0; k--) {
        const z = active[k];

        // Age expiration
        if (i - z.created >= life) {
          z.status = 'expired';
          z.end = i;
          active.splice(k, 1);
          continue;
        }

        const touch = c.low <= z.top && c.high >= z.bottom;
        if (!touch) continue;

        // When price touches/fills the FVG, it is MITIGATED and stops projecting!
        z.end = i;
        z.status = 'mitigated';
        active.splice(k, 1);

        if (p.filterNews && newsShock[i]) continue;

        // Confluence checks for entry signal tag
        if (p.requireTrend) {
          const e200 = ema200[i];
          if (e200 !== undefined) {
            if (z.dir === 1  && c.close < e200) continue;
            if (z.dir === -1 && c.close > e200) continue;
          }
        }
        if (p.requireKillzone && !inKillzone(c)) continue;
        if (p.requireSweep) {
          const hasSweep = sweepEvents.some(e => e.dir === z.dir && e.bar >= i - swLookback);
          if (!hasSweep && !z.hadDisplacement) continue;
        }

        const isBull = z.dir === 1;
        const confirmClose = isBull ? (c.close > c.open && c.close > z.bottom) : (c.close < c.open && c.close < z.top);
        if (!confirmClose) continue;

        const key = isBull ? 'bullReaction' : 'bearReaction';
        stats[key].total++;

        const sl = isBull ? z.bottom - (0.4 * cAtr) : z.top + (0.4 * cAtr);
        const risk = Math.max(0.1, Math.abs(c.close - sl));
        const nextSwingTp = isBull ? swingHighAt[i] : swingLowAt[i];
        let tp = (nextSwingTp && Math.abs(nextSwingTp - c.close) > risk * 0.8 && Math.abs(nextSwingTp - c.close) < risk * 4)
          ? nextSwingTp
          : (isBull ? c.close + risk * multiple : c.close - risk * multiple);

        const q = { bar: i, price: c.close, dir: z.dir, key, tp, sl, status: 'waiting', end: i };
        z.ev = q;
        waiting.push(q);
        entries.push({ bar: i, price: c.close, dir: z.dir, tag: isBull ? 'BUY ENTRY' : 'SELL ENTRY', tp, sl });
      }

      // New 3-candle FVG detection (STRICT: only displacement bodies with meaningful gap)
      if (i >= 2) {
        const c0 = data[i - 2], c1 = data[i - 1], c2 = data[i];
        let dir = 0, bottom = 0, top = 0;
        if (c2.low > c0.high) { dir = 1;  bottom = c0.high; top = c2.low;  }
        if (c2.high < c0.low) { dir = -1; bottom = c2.high; top = c0.low; }

        if (dir) {
          const body1   = Math.abs(c1.close - c1.open);
          const gapSize = top - bottom;
          // STRICT FILTER: only create FVG if middle candle had displacement AND gap is significant
          if (body1 >= minDisp * cAtr && gapSize >= minGap * cAtr) {
            const z = { from: i - 2, created: i, end: i + life, top, bottom, dir, hadDisplacement: true, status: 'open', ev: null };
            zones.push(z);
            active.push(z);
          }
        }
      }
    }

    indicator._fvgStudy = {
      p,
      stats,
      zones: zones.slice(-maxZones),
      entries: entries.slice(-30),
      newsShock,
      n
    };
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
    const alpha = Math.max(0.04, Math.min(0.5, Number(p.opacity) / 100));

    // Draw clean FVG boxes
    for (const z of v.zones) {
      if ((z.dir === 1 && !p.showBull) || (z.dir === -1 && !p.showBear)) continue;
      // Cap forward projection at zone life
      const maxAllowedEnd = z.created + p.zoneLife;
      const drawEnd = z.status === 'open' ? Math.min(to, maxAllowedEnd) : Math.min(z.end, maxAllowedEnd);
      if (drawEnd < from || z.from > to) continue;

      const isBull = z.dir === 1;
      const color = isBull ? p.bullColor : p.bearColor;

      bv.box(args, {
        fromIndex: z.from,
        toIndex: drawEnd,
        top: z.top,
        bottom: z.bottom,
        color,
        fillOpacity: z.status === 'open' ? alpha : alpha * 0.4,
        borderOpacity: z.status === 'open' ? 0.45 : 0.15,
        under: true
      });
    }

    // Draw entry tags
    if (p.showEntryTags) {
      for (const e of v.entries) {
        if (e.bar < from || e.bar > to) continue;
        const isBuy = e.dir === 1;
        const color = isBuy ? p.bullColor : p.bearColor;

        bv.label(args, {
          index: e.bar,
          price: e.price,
          text: isBuy ? '▲ BUY ENTRY' : '▼ SELL ENTRY',
          color: '#fff',
          background: color,
          align: 'center',
          baseline: isBuy ? 'top' : 'bottom',
          size: 10,
          padding: 3,
          offsetY: isBuy ? 14 : -14
        });

        if (p.showTargets) {
          const x  = X(e.bar);
          const xE = X(Math.min(e.bar + 40, to + 1));

          const yTp = Y(e.tp);
          if (Number.isFinite(yTp)) {
            ctx.save();
            ctx.strokeStyle = isBuy ? p.bullColor : p.bearColor;
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(x, yTp); ctx.lineTo(xE, yTp); ctx.stroke();
            ctx.globalAlpha = 0.85;
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = isBuy ? p.bullColor : p.bearColor;
            ctx.textAlign = 'left';
            ctx.fillText('TP ' + e.tp.toFixed(2), xE + 3, yTp - 1);
            ctx.restore();
          }

          const ySl = Y(e.sl);
          if (Number.isFinite(ySl)) {
            ctx.save();
            ctx.strokeStyle = '#f43f5e';
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(x, ySl); ctx.lineTo(xE, ySl); ctx.stroke();
            ctx.globalAlpha = 0.85;
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#f43f5e';
            ctx.textAlign = 'left';
            ctx.fillText('SL ' + e.sl.toFixed(2), xE + 3, ySl + 8);
            ctx.restore();
          }
        }
      }
    }

    ctx.restore();
    return true;
  }
};
`;
