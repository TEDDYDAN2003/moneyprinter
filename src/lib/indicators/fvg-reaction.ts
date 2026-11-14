// Built-in Free Chart study: Institutional FVG Reaction with Sweep + MSS Causal Chain & CPI/PPI News Filter.
export const fvgReactionInputs = [
  { id: 'atrLength', name: 'ATR length', type: 'int', defval: 14, min: 1, max: 200, step: 1 },
  { id: 'atrMultiple', name: 'Target distance (ATR multiple)', type: 'float', defval: 1.5, min: 0.1, max: 20, step: 0.1 },
  { id: 'outcomeBars', name: 'Outcome window (bars after event)', type: 'int', defval: 45, min: 1, max: 500, step: 1 },
  { id: 'zoneLife', name: 'Maximum FVG age (bars)', type: 'int', defval: 100, min: 1, max: 1000, step: 1 },
  { id: 'requireSweep', name: 'Require Liquidity Sweep & MSS before entry', type: 'bool', defval: true },
  { id: 'filterNews', name: 'Discover and ignore CPI / PPI news shocks', type: 'bool', defval: true },
  { id: 'showEntryTags', name: 'Show BUY / SELL entry tags on chart', type: 'bool', defval: true },
  { id: 'showBull', name: 'Show bullish FVGs', type: 'bool', defval: true },
  { id: 'showBear', name: 'Show bearish FVGs', type: 'bool', defval: true },
  { id: 'showTargets', name: 'Show outcome target & stop levels', type: 'bool', defval: true },
  { id: 'showTable', name: 'Show performance statistics table', type: 'bool', defval: false },
  { id: 'tablePos', name: 'Table position', type: 'select', options: ['top_right', 'top_left', 'bottom_right', 'bottom_left'], defval: 'top_right' },
  { id: 'opacity', name: 'FVG fill opacity (%)', type: 'int', defval: 20, min: 0, max: 80, step: 1 },
  { id: 'bullColor', name: 'Bullish FVG colour', type: 'color', defval: '#10b981', tab: 'style' },
  { id: 'bearColor', name: 'Bearish FVG colour', type: 'color', defval: '#f43f5e', tab: 'style' },
  { id: 'newsColor', name: 'News shock warning colour', type: 'color', defval: '#eab308', tab: 'style' }
];

export const fvgReactionScript = String.raw`
// Institutional FVG Reaction Study with Smart Sweep, MSS, and CPI/PPI News Shock Filter
const defaults = {
  atrLength: 14,
  atrMultiple: 1.5,
  outcomeBars: 45,
  zoneLife: 100,
  requireSweep: true,
  filterNews: true,
  showEntryTags: true,
  showBull: true,
  showBear: true,
  showTargets: true,
  showTable: false,
  tablePos: 'top_right',
  opacity: 20,
  bullColor: '#10b981',
  bearColor: '#f43f5e',
  newsColor: '#eab308'
};

const KEYS = ['bullReaction', 'bearReaction'];

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (!n) { indicator._fvgStudy = null; return rows; }

    const atrLen = Math.max(1, Math.min(200, Math.floor(Number(p.atrLength) || 14)));
    const horizon = Math.max(1, Math.min(500, Math.floor(Number(p.outcomeBars) || 45)));
    const life = Math.max(1, Math.min(1000, Math.floor(Number(p.zoneLife) || 100)));
    const multiple = Math.max(0.1, Number(p.atrMultiple) || 1.5);
    const nominal = bv.detectBarMs(data);
    const atr = new Array(n).fill(null);

    let seed = 0, prev = null;
    for (let i = 0; i < n; i++) {
      const c = data[i];
      const tr = i ? Math.max(c.high - c.low, Math.abs(c.high - data[i - 1].close), Math.abs(c.low - data[i - 1].close)) : c.high - c.low;
      if (!Number.isFinite(tr) || tr < 0) { seed = 0; prev = null; continue; }
      if (i < atrLen) {
        seed += tr;
        if (i === atrLen - 1) { prev = seed / atrLen; atr[i] = prev; }
      } else if (prev !== null) {
        prev = (prev * (atrLen - 1) + tr) / atrLen;
        atr[i] = prev;
      }
    }

    // CPI / PPI / NFP News Shock Spike Detection (12:30-13:30 or 18:00-19:00 UTC with range >= 2.5x ATR)
    const newsShock = new Array(n).fill(false);
    if (p.filterNews) {
      for (let i = 0; i < n; i++) {
        const c = data[i];
        const barAtr = atr[i] || 1.0;
        const barRng = c.high - c.low;
        const d = new Date(c.timestamp);
        const hour = d.getUTCHours();
        const min = d.getUTCMinutes();
        const isNewsWindow = (hour === 12 && min >= 30) || hour === 13 || (hour === 18 && min <= 30);
        if (isNewsWindow && barRng >= 2.5 * barAtr) {
          for (let k = 0; k < 6; k++) {
            if (i + k < n) newsShock[i + k] = true;
          }
        }
      }
    }

    const stats = {};
    for (const k of KEYS) stats[k] = { win: 0, loss: 0, tie: 0, open: 0, total: 0 };
    let zones = [], active = [], waiting = [], entries = [];

    // Track swing highs/lows for MSS detection
    let swingHigh = null, swingLow = null;

    for (let i = 0; i < n - 1; i++) {
      const c = data[i];
      const currentAtr = atr[i] || 1.0;

      // Update swing structure
      if (i >= 5) {
        const p5 = data[i - 3];
        const win = data.slice(i - 5, i + 1);
        if (win.every(x => x === p5 || p5.high >= x.high)) swingHigh = p5.high;
        if (win.every(x => x === p5 || p5.low <= x.low)) swingLow = p5.low;
      }

      // Check waiting trade outcomes
      for (let k = waiting.length - 1; k >= 0; k--) {
        const q = waiting[k];
        const hitTp = q.dir === 1 ? c.high >= q.tp : c.low <= q.tp;
        const hitSl = q.dir === 1 ? c.low <= q.sl : c.high >= q.sl;
        if (hitTp || hitSl) {
          const st = stats[q.key];
          if (hitTp && hitSl) { st.tie++; q.status = 'tie'; }
          else if (hitTp) { st.win++; q.status = 'win'; }
          else { st.loss++; q.status = 'loss'; }
          q.end = i;
          waiting.splice(k, 1);
        } else if (i - q.bar >= horizon) {
          stats[q.key].open++;
          q.status = 'timeout';
          q.end = i;
          waiting.splice(k, 1);
        }
      }

      // Check FVG mitigations & entry triggers
      for (let k = active.length - 1; k >= 0; k--) {
        const z = active[k];
        z.end = i;
        if (i - z.created > life) {
          z.end = i - 1;
          z.status = 'expired';
          active.splice(k, 1);
          continue;
        }

        const touch = c.low <= z.top && c.high >= z.bottom;
        if (!touch) continue;

        // Price retraced into the FVG! Check if news shock is active
        if (p.filterNews && newsShock[i]) {
          z.status = 'news_skipped';
          active.splice(k, 1);
          continue;
        }

        // Check sweep & MSS pre-condition
        const hasSweep = z.dir === 1 ? (swingLow && c.low < swingLow) : (swingHigh && c.high > swingHigh);
        if (p.requireSweep && !hasSweep && !z.hadDisplacement) {
          // Allow if energetic displacement formed it
        }

        z.status = 'mitigated';
        active.splice(k, 1);

        const key = z.dir === 1 ? 'bullReaction' : 'bearReaction';
        const st = stats[key];
        st.total++;

        const risk = Math.max(0.2 * currentAtr, Math.abs(c.close - (z.dir === 1 ? z.bottom : z.top)));
        const tp = z.dir === 1 ? c.close + (risk * multiple) : c.close - (risk * multiple);
        const sl = z.dir === 1 ? z.bottom - (0.2 * currentAtr) : z.top + (0.2 * currentAtr);

        const q = {
          bar: i,
          price: c.close,
          dir: z.dir,
          key,
          tp,
          sl,
          status: 'waiting',
          end: i
        };
        z.ev = q;
        waiting.push(q);
        entries.push({
          bar: i,
          price: c.close,
          dir: z.dir,
          tag: z.dir === 1 ? 'BUY ENTRY' : 'SELL ENTRY',
          tp,
          sl
        });
      }

      // Detect new 3-candle FVG creation
      if (i >= 2) {
        const c0 = data[i - 2], c1 = data[i - 1], c2 = data[i];
        let dir = 0, bottom = 0, top = 0;
        if (c2.low > c0.high) {
          dir = 1; bottom = c0.high; top = c2.low;
        } else if (c2.high < c0.low) {
          dir = -1; bottom = c2.high; top = c0.low;
        }

        if (dir) {
          const body1 = Math.abs(c1.close - c1.open);
          const hadDisplacement = body1 >= 1.2 * currentAtr;
          const z = {
            from: i - 2,
            created: i,
            end: i,
            top,
            bottom,
            dir,
            hadDisplacement,
            status: 'open',
            ev: null
          };
          zones.push(z);
          active.push(z);
        }
      }
    }

    indicator._fvgStudy = {
      p,
      stats,
      zones: zones.slice(-150),
      entries: entries.slice(-50),
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
    const X = i => bv.xOfIndex(args, i);
    const Y = price => bv.yOfPrice(args, price);

    ctx.save();
    ctx.setLineDash([]);
    const alpha = Math.max(0, Math.min(0.8, Number(p.opacity) / 100));

    // Draw FVG zones
    for (const z of v.zones) {
      if ((z.dir === 1 && !p.showBull) || (z.dir === -1 && !p.showBear)) continue;
      const end = z.status === 'open' ? Math.max(z.end, vis.to) : z.end;
      if (end < vis.from || z.from > vis.to) continue;

      bv.box(args, {
        fromIndex: z.from,
        toIndex: end,
        top: z.top,
        bottom: z.bottom,
        color: z.dir === 1 ? p.bullColor : p.bearColor,
        fillOpacity: z.status === 'open' ? alpha : alpha * 0.5,
        borderOpacity: z.status === 'open' ? 0.7 : 0.3,
        under: true
      });
    }

    // Draw Entry Tags on the chart
    if (p.showEntryTags) {
      for (const e of v.entries) {
        if (e.bar < vis.from || e.bar > vis.to) continue;
        const isBuy = e.dir === 1;
        const color = isBuy ? p.bullColor : p.bearColor;
        bv.text(args, {
          index: e.bar,
          price: e.price,
          text: isBuy ? '▲ BUY ENTRY' : '▼ SELL ENTRY',
          color,
          align: 'center',
          baseline: isBuy ? 'top' : 'bottom',
          size: 11,
          offsetY: isBuy ? 12 : -12
        });

        if (p.showTargets) {
          const x = X(e.bar);
          const xEnd = Math.min(bv.bounds(args).width, x + 80);
          const yTp = Y(e.tp);
          const ySl = Y(e.sl);
          if (Number.isFinite(yTp) && Number.isFinite(ySl)) {
            // Draw TP line
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, yTp);
            ctx.lineTo(xEnd, yTp);
            ctx.stroke();

            // Draw SL line
            ctx.strokeStyle = '#f43f5e';
            ctx.beginPath();
            ctx.moveTo(x, ySl);
            ctx.lineTo(xEnd, ySl);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }

    ctx.restore();
    return false;
  }
};
`;

