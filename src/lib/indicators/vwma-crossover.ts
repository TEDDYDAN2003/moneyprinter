// VWMA × EMA Crossover & Volume-Weighted Momentum Divergence
// Detects institutional volume flow shifts BEFORE price makes the major expansion move.
export const vwmaCrossoverInputs = [
  { id: 'length', name: 'Moving Average Period', type: 'int', defval: 20, min: 5, max: 100, step: 1 },
  { id: 'showVwma', name: 'Show VWMA line', type: 'bool', defval: true },
  { id: 'showEma', name: 'Show EMA line', type: 'bool', defval: true },
  { id: 'showSignals', name: 'Show Early Entry Crossover Signals', type: 'bool', defval: true },
  { id: 'showDivergence', name: 'Show Volume Divergence Clouds', type: 'bool', defval: true },
  { id: 'vwmaColor', name: 'VWMA Line Colour (Volume)', type: 'color', defval: '#38bdf8', tab: 'style' },
  { id: 'emaColor', name: 'EMA Line Colour (Price)', type: 'color', defval: '#fbbf24', tab: 'style' },
  { id: 'bullSignalColor', name: 'Bullish Crossover Signal', type: 'color', defval: '#10b981', tab: 'style' },
  { id: 'bearSignalColor', name: 'Bearish Crossover Signal', type: 'color', defval: '#f43f5e', tab: 'style' }
];

export const vwmaCrossoverScript = String.raw`
const defaults = {
  length: 20,
  showVwma: true,
  showEma: true,
  showSignals: true,
  showDivergence: true,
  vwmaColor: '#38bdf8',
  emaColor: '#fbbf24',
  bullSignalColor: '#10b981',
  bearSignalColor: '#f43f5e'
};

function calcEMA(data, len) {
  const k = 2 / (len + 1);
  const out = new Array(data.length);
  let sum = 0;
  for (let i = 0; i < len && i < data.length; i++) sum += data[i].close;
  out[len - 1] = sum / len;
  for (let i = len; i < data.length; i++) {
    out[i] = data[i].close * k + out[i - 1] * (1 - k);
  }
  return out;
}

function calcVWMA(data, len) {
  const n = data.length;
  const out = new Array(n);
  // Compute tick-volume proxy: range * (body_ratio + 0.5)
  const vols = new Array(n);
  for (let i = 0; i < n; i++) {
    const c = data[i];
    const rng = c.high - c.low;
    if (rng <= 0) { vols[i] = 0.001; continue; }
    const body = Math.abs(c.close - c.open);
    vols[i] = rng * ((body / rng) + 0.5);
  }

  for (let i = len - 1; i < n; i++) {
    let num = 0, den = 0;
    for (let j = i - len + 1; j <= i; j++) {
      num += data[j].close * vols[j];
      den += vols[j];
    }
    out[i] = den > 0 ? num / den : data[i].close;
  }
  return out;
}

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (n < 20) { indicator._vwmaStudy = null; return rows; }

    const len = Math.max(5, Math.min(100, Math.floor(Number(p.length) || 20)));
    const ema = calcEMA(data, len);
    const vwma = calcVWMA(data, len);

    const signals = [];
    for (let i = len; i < n; i++) {
      const v0 = vwma[i - 1], v1 = vwma[i];
      const e0 = ema[i - 1], e1 = ema[i];
      if (v0 === undefined || v1 === undefined || e0 === undefined || e1 === undefined) continue;

      const wasAbove = v0 >= e0;
      const isAbove = v1 >= e1;

      if (!wasAbove && isAbove) {
        // Bullish Cross: institutional volume surges into upside
        signals.push({ bar: i, price: data[i].low, dir: 1, text: 'VWMA ▲ CROSS' });
      } else if (wasAbove && !isAbove) {
        // Bearish Cross: institutional volume dumps to downside
        signals.push({ bar: i, price: data[i].high, dir: -1, text: 'VWMA ▼ CROSS' });
      }
    }

    indicator._vwmaStudy = {
      p,
      ema,
      vwma,
      signals: signals.slice(-50),
      n
    };
    return rows;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const v = indicator._vwmaStudy;
    if (!v) return false;
    const p = v.p;
    const vis = bv.visible(args);
    const from = Math.max(0, Math.floor(vis.from) - 2);
    const to = Math.min(v.n - 1, Math.ceil(vis.to) + 2);
    const X = i => bv.xOfIndex(args, i);
    const Y = price => bv.yOfPrice(args, price);

    ctx.save();

    // 1. Shaded divergence cloud between VWMA and EMA
    if (p.showDivergence) {
      for (let i = from; i < to; i++) {
        const v1 = v.vwma[i], e1 = v.ema[i];
        const v2 = v.vwma[i + 1], e2 = v.ema[i + 1];
        if (v1 === undefined || e1 === undefined || v2 === undefined || e2 === undefined) continue;

        const x1 = X(i), x2 = X(i + 1);
        const yV1 = Y(v1), yE1 = Y(e1);
        const yV2 = Y(v2), yE2 = Y(e2);
        if (![x1, x2, yV1, yE1, yV2, yE2].every(Number.isFinite)) continue;

        const isBull = v1 >= e1;
        ctx.fillStyle = isBull ? 'rgba(56, 189, 248, 0.14)' : 'rgba(244, 63, 94, 0.14)';
        ctx.beginPath();
        ctx.moveTo(x1, yV1);
        ctx.lineTo(x2, yV2);
        ctx.lineTo(x2, yE2);
        ctx.lineTo(x1, yE1);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 2. Draw EMA line (Price base)
    if (p.showEma) {
      ctx.strokeStyle = p.emaColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      let started = false;
      for (let i = from; i <= to; i++) {
        const val = v.ema[i];
        if (val === undefined) continue;
        const x = X(i), y = Y(val);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
    }

    // 3. Draw VWMA line (Volume weighted)
    if (p.showVwma) {
      ctx.strokeStyle = p.vwmaColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      let started = false;
      for (let i = from; i <= to; i++) {
        const val = v.vwma[i];
        if (val === undefined) continue;
        const x = X(i), y = Y(val);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
    }

    // 4. Draw Crossover signals
    if (p.showSignals) {
      for (const s of v.signals) {
        if (s.bar < from || s.bar > to) continue;
        const isBull = s.dir === 1;
        const color = isBull ? p.bullSignalColor : p.bearSignalColor;
        bv.label(args, {
          index: s.bar,
          price: s.price,
          text: s.text,
          color: '#fff',
          background: color,
          align: 'center',
          baseline: isBull ? 'top' : 'bottom',
          size: 9,
          padding: 2,
          offsetY: isBull ? 16 : -16
        });
      }
    }

    ctx.restore();
    return true;
  }
};
`;
