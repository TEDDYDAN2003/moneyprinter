// Macro Trend Ribbon (50 EMA & 200 EMA Institutional Trend Regime)
export const macroTrendInputs = [
  { id: 'fastLen', name: 'Fast EMA Length', type: 'int', defval: 50, min: 5, max: 200, step: 1 },
  { id: 'slowLen', name: 'Slow EMA Length (Institutional)', type: 'int', defval: 200, min: 20, max: 500, step: 1 },
  { id: 'showRibbon', name: 'Show Trend Fill Ribbon', type: 'bool', defval: true },
  { id: 'bullColor', name: 'Bullish Ribbon Colour', type: 'color', defval: '#10b981', tab: 'style' },
  { id: 'bearColor', name: 'Bearish Ribbon Colour', type: 'color', defval: '#ef4444', tab: 'style' },
  { id: 'slowColor', name: '200 EMA Line Colour', type: 'color', defval: '#38bdf8', tab: 'style' }
];

export const macroTrendScript = String.raw`
const defaults = {
  fastLen: 50,
  slowLen: 200,
  showRibbon: true,
  bullColor: '#10b981',
  bearColor: '#ef4444',
  slowColor: '#38bdf8'
};

function calcEMA(data, len) {
  const k = 2 / (len + 1);
  const ema = new Array(data.length);
  let sum = 0;
  for (let i = 0; i < len && i < data.length; i++) {
    sum += data[i].close;
  }
  ema[len - 1] = sum / len;
  for (let i = len; i < data.length; i++) {
    ema[i] = data[i].close * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (!n) { indicator._macroTrend = null; return rows; }

    const fastLen = Math.max(5, Math.min(200, Math.floor(Number(p.fastLen) || 50)));
    const slowLen = Math.max(20, Math.min(500, Math.floor(Number(p.slowLen) || 200)));

    const fastEMA = calcEMA(data, fastLen);
    const slowEMA = calcEMA(data, slowLen);

    indicator._macroTrend = {
      p,
      fastEMA,
      slowEMA
    };
    return rows;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const v = indicator._macroTrend;
    if (!v) return false;
    const p = v.p;
    const vis = bv.visible(args);
    const X = i => bv.xOfIndex(args, i);
    const Y = price => bv.yOfPrice(args, price);

    const from = Math.max(0, Math.floor(vis.from) - 2);
    const to = Math.min(v.fastEMA.length - 1, Math.ceil(vis.to) + 2);

    ctx.save();

    // 1. Draw ribbon fill between fast and slow EMA
    if (p.showRibbon) {
      for (let i = from; i < to; i++) {
        const f1 = v.fastEMA[i], s1 = v.slowEMA[i];
        const f2 = v.fastEMA[i + 1], s2 = v.slowEMA[i + 1];
        if (f1 === undefined || s1 === undefined || f2 === undefined || s2 === undefined) continue;

        const x1 = X(i), x2 = X(i + 1);
        const yF1 = Y(f1), yS1 = Y(s1);
        const yF2 = Y(f2), yS2 = Y(s2);

        if (![x1, x2, yF1, yS1, yF2, yS2].every(Number.isFinite)) continue;

        const isBull = f1 >= s1;
        ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
        ctx.beginPath();
        ctx.moveTo(x1, yF1);
        ctx.lineTo(x2, yF2);
        ctx.lineTo(x2, yS2);
        ctx.lineTo(x1, yS1);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 2. Draw Slow EMA line (200 EMA)
    ctx.strokeStyle = p.slowColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    let slowStarted = false;
    for (let i = from; i <= to; i++) {
      const val = v.slowEMA[i];
      if (val === undefined) continue;
      const x = X(i), y = Y(val);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (!slowStarted) { ctx.moveTo(x, y); slowStarted = true; }
      else { ctx.lineTo(x, y); }
    }
    ctx.stroke();

    // 3. Draw Fast EMA line (50 EMA)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    let fastStarted = false;
    for (let i = from; i <= to; i++) {
      const val = v.fastEMA[i];
      if (val === undefined) continue;
      const x = X(i), y = Y(val);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (!fastStarted) { ctx.moveTo(x, y); fastStarted = true; }
      else { ctx.lineTo(x, y); }
    }
    ctx.stroke();

    // Label latest EMA
    const lastIdx = to;
    if (v.slowEMA[lastIdx] !== undefined) {
      const lx = X(lastIdx);
      const ly = Y(v.slowEMA[lastIdx]);
      if (Number.isFinite(lx) && Number.isFinite(ly)) {
        ctx.fillStyle = p.slowColor;
        ctx.font = 'bold 10px monospace';
        ctx.fillText('200 EMA (' + v.slowEMA[lastIdx].toFixed(2) + ')', lx + 6, ly + 3);
      }
    }

    ctx.restore();
    return true;
  }
};
`;
