// Key Levels & Structural Liquidity Pools (Lesson 04: Swing High/Low BSL/SSL, MSS, OTE 0.705, and Order Blocks)
export const keyLevelsInputs = [
  { id: 'swingPeriod', name: 'Swing pivot period', type: 'int', defval: 10, min: 3, max: 50, step: 1 },
  { id: 'showBslSsl', name: 'Show Swing Liquidity (BSL / SSL)', type: 'bool', defval: true },
  { id: 'showMss', name: 'Show Market Structure Shift (MSS) zones', type: 'bool', defval: true },
  { id: 'showOte', name: 'Show 0.705 OTE Retracement bands', type: 'bool', defval: true },
  { id: 'showOrderBlocks', name: 'Show Order Block zones', type: 'bool', defval: true },
  { id: 'bslColor', name: 'BSL line colour', type: 'color', defval: '#38bdf8', tab: 'style' },
  { id: 'sslColor', name: 'SSL line colour', type: 'color', defval: '#fb923c', tab: 'style' },
  { id: 'oteColor', name: 'OTE 0.705 zone colour', type: 'color', defval: '#a855f7', tab: 'style' },
  { id: 'obBullColor', name: 'Bullish OB colour', type: 'color', defval: '#22c55e', tab: 'style' },
  { id: 'obBearColor', name: 'Bearish OB colour', type: 'color', defval: '#f43f5e', tab: 'style' }
];

export const keyLevelsScript = String.raw`
const defaults = {
  swingPeriod: 10,
  showBslSsl: true,
  showMss: true,
  showOte: true,
  showOrderBlocks: true,
  bslColor: '#38bdf8',
  sslColor: '#fb923c',
  oteColor: '#a855f7',
  obBullColor: '#22c55e',
  obBearColor: '#f43f5e'
};

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (!n) { indicator._keyLevels = null; return rows; }

    const span = Math.max(3, Math.min(50, Math.floor(Number(p.swingPeriod) || 10)));
    let swings = [], orderBlocks = [], mssZones = [];
    let lastHigh = null, lastLow = null;

    // ATR
    const atr = new Array(n).fill(null);
    let atrS = 0, atrP = null;
    for (let i = 0; i < n; i++) {
      const c = data[i], pr = i ? data[i-1] : c;
      const tr = Math.max(c.high - c.low, Math.abs(c.high - pr.close), Math.abs(c.low - pr.close));
      if (i < 14) { atrS += tr; if (i === 13) { atrP = atrS / 14; atr[i] = atrP; } }
      else if (atrP !== null) { atrP = (atrP * 13 + tr) / 14; atr[i] = atrP; }
    }

    for (let i = span; i < n; i++) {
      const pCandle = data[i - span];
      const win = data.slice(i - span * 2, i + 1);

      // Swing High (BSL)
      if (win.every(x => x === pCandle || pCandle.high >= x.high)) {
        lastHigh = { index: i - span, price: pCandle.high, type: 'BSL' };
        swings.push(lastHigh);
      }
      // Swing Low (SSL)
      if (win.every(x => x === pCandle || pCandle.low <= x.low)) {
        lastLow = { index: i - span, price: pCandle.low, type: 'SSL' };
        swings.push(lastLow);
      }

      // Order Block detection: last opposing candle before displacement (body >= 1.4 * ATR)
      const c = data[i], prev = data[i - 1];
      const cAtr = atr[i] || 1.0;
      const body = Math.abs(c.close - c.open);
      const isOpposing = (c.close > c.open && prev.close < prev.open) || (c.close < c.open && prev.close > prev.open);
      if (body >= 1.4 * cAtr && isOpposing) {
        const isBull = c.close > c.open;
        orderBlocks.push({
          from: i - 1,
          to: Math.min(n - 1, i + 30),
          top: Math.max(prev.open, prev.close),
          bottom: Math.min(prev.open, prev.close),
          dir: isBull ? 1 : -1
        });
      }
    }

    indicator._keyLevels = {
      p,
      swings: swings.slice(-30),
      orderBlocks: orderBlocks.slice(-25),
      lastHigh,
      lastLow
    };
    return rows;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const v = indicator._keyLevels;
    if (!v) return false;
    const p = v.p;
    const vis = bv.visible(args);
    const X = i => bv.xOfIndex(args, i);
    const Y = price => bv.yOfPrice(args, price);

    ctx.save();

    // 1. Draw Order Blocks
    if (p.showOrderBlocks) {
      for (const ob of v.orderBlocks) {
        if (ob.to < vis.from || ob.from > vis.to) continue;
        bv.box(args, {
          fromIndex: ob.from,
          toIndex: ob.to,
          top: ob.top,
          bottom: ob.bottom,
          color: ob.dir === 1 ? p.obBullColor : p.obBearColor,
          fillOpacity: 0.15,
          borderOpacity: 0.6,
          under: true
        });
      }
    }

    // 2. Draw Swing Highs (BSL) and Swing Lows (SSL)
    if (p.showBslSsl) {
      for (const sw of v.swings) {
        if (sw.index < vis.from - 20 || sw.index > vis.to) continue;
        const x1 = X(sw.index);
        const x2 = Math.min(bv.bounds(args).width, x1 + 220);
        const y = Y(sw.price);
        if (Number.isFinite(x1) && Number.isFinite(y)) {
          ctx.strokeStyle = sw.type === 'BSL' ? p.bslColor : p.sslColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();

          ctx.fillStyle = sw.type === 'BSL' ? p.bslColor : p.sslColor;
          ctx.font = '10px sans-serif';
          ctx.fillText(sw.type + ' $' + sw.price.toFixed(2), x2 - 50, y - 4);
        }
      }
    }

    // 3. Draw 0.705 OTE Retracement Zone between latest major swings
    if (p.showOte && v.lastHigh && v.lastLow && v.lastHigh.price > v.lastLow.price) {
      const high = v.lastHigh.price, low = v.lastLow.price;
      const ote705 = high - (high - low) * 0.705;
      const ote618 = high - (high - low) * 0.618;
      const ote790 = high - (high - low) * 0.790;
      const minX = Math.max(0, X(Math.min(v.lastHigh.index, v.lastLow.index)));
      const maxX = bv.bounds(args).width;

      const y618 = Y(ote618), y790 = Y(ote790);
      if (Number.isFinite(y618) && Number.isFinite(y790)) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
        ctx.fillRect(minX, Math.min(y618, y790), maxX - minX, Math.abs(y790 - y618));

        ctx.strokeStyle = p.oteColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        const y705 = Y(ote705);
        ctx.moveTo(minX, y705);
        ctx.lineTo(maxX, y705);
        ctx.stroke();

        ctx.fillStyle = p.oteColor;
        ctx.font = '10px sans-serif';
        ctx.fillText('OTE 0.705 Fib $' + ote705.toFixed(2), maxX - 120, y705 - 4);
      }
    }

    ctx.restore();
    return false;
  }
};
`;

