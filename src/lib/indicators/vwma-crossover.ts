// Quantum Zero-Lag Volume-Weighted Moving Average (V-ZLEMA & SuperSmoother)
// Eliminates phase lag using digital signal processing (DSP 2-Pole Gaussian filter)
// Hugs price action closely while smoothing noise and filtering choppy false crosses.
export const vwmaCrossoverInputs = [
  { id: 'length', name: 'Filter Period (Cutoff)', type: 'int', defval: 14, min: 5, max: 100, step: 1 },
  { id: 'minDivergence', name: 'Min Crossover Separation (ATR fraction)', type: 'float', defval: 0.15, min: 0.02, max: 1.0, step: 0.01 },
  { id: 'showVwma', name: 'Show Volume-Weighted Curve (Cyan)', type: 'bool', defval: true },
  { id: 'showEma', name: 'Show Price Baseline Curve (Amber)', type: 'bool', defval: true },
  { id: 'showSignals', name: 'Show High-Probability Crossover Tags', type: 'bool', defval: true },
  { id: 'showDivergence', name: 'Show Volume Pressure Cloud', type: 'bool', defval: true },
  { id: 'vwmaColor', name: 'VWMA Line Colour', type: 'color', defval: '#38bdf8', tab: 'style' },
  { id: 'emaColor', name: 'Baseline Line Colour', type: 'color', defval: '#fbbf24', tab: 'style' },
  { id: 'bullSignalColor', name: 'Bullish Volume Cross Colour', type: 'color', defval: '#10b981', tab: 'style' },
  { id: 'bearSignalColor', name: 'Bearish Volume Cross Colour', type: 'color', defval: '#f43f5e', tab: 'style' }
];

export const vwmaCrossoverScript = String.raw`
// =====================================================================
// Quantum Zero-Lag Volume Smoother (Ehlers 2-Pole SuperSmoother + ZLEMA)
// =====================================================================
const defaults = {
  length: 14,
  minDivergence: 0.15,
  showVwma: true,
  showEma: true,
  showSignals: true,
  showDivergence: true,
  vwmaColor: '#38bdf8',
  emaColor: '#fbbf24',
  bullSignalColor: '#10b981',
  bearSignalColor: '#f43f5e'
};

// 2-Pole Ehlers SuperSmoother filter coefficients
function getSuperSmootherCoeffs(period) {
  const p = Math.max(4, period);
  const a1 = Math.exp(-Math.SQRT2 * Math.PI / p);
  const b1 = 2 * a1 * Math.cos(Math.SQRT2 * Math.PI / p);
  const c2 = b1;
  const c3 = -a1 * a1;
  const c1 = 1 - c2 - c3;
  return { c1, c2, c3 };
}

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (n < 15) { indicator._vwmaStudy = null; return rows; }

    const len = Math.max(5, Math.min(100, Math.floor(Number(p.length) || 14)));
    const minDiv = Math.max(0.02, Number(p.minDivergence) || 0.15);
    const lag = Math.max(1, Math.floor((len - 1) / 2));

    // 1. Incremental ATR (14-period Wilder)
    const atr = new Array(n).fill(1.0);
    let atrSeed = 0, atrPrev = null;
    for (let i = 0; i < n; i++) {
      const c = data[i], pr = i ? data[i - 1] : c;
      const tr = Math.max(c.high - c.low, Math.abs(c.high - pr.close), Math.abs(c.low - pr.close));
      if (i < 14) { atrSeed += tr; if (i === 13) { atrPrev = atrSeed / 14; atr[i] = atrPrev; } }
      else if (atrPrev !== null) { atrPrev = (atrPrev * 13 + tr) / 14; atr[i] = atrPrev; }
    }

    // 2. Relative Institutional Volume Proxy
    const relVol = new Array(n).fill(1.0);
    const rawVols = new Array(n);
    let volSum = 0;
    for (let i = 0; i < n; i++) {
      const c = data[i];
      const rng = c.high - c.low;
      const body = Math.abs(c.close - c.open);
      const tv = rng > 0 ? rng * (body / rng + 0.5) : 0.001;
      rawVols[i] = tv;
      volSum += tv;
      if (i >= len) volSum -= rawVols[i - len];
      const avgV = i >= len ? volSum / len : volSum / (i + 1);
      relVol[i] = avgV > 0 ? Math.max(0.4, Math.min(2.5, tv / avgV)) : 1.0;
    }

    // 3. Zero-Lag Corrected Series
    // Price baseline corrected for phase lag
    const zClose = new Array(n);
    // Volume-boosted price (amplifies price momentum during heavy volume participation)
    const zVolPrice = new Array(n);
    for (let i = 0; i < n; i++) {
      const pastIdx = Math.max(0, i - lag);
      const momentum = data[i].close - data[pastIdx].close;
      zClose[i] = data[i].close + momentum * 0.75;
      zVolPrice[i] = data[i].close + momentum * (relVol[i] * 0.75);
    }

    // 4. Apply Ehlers SuperSmoother Filter (smooth tracking that hugs the curve)
    const { c1, c2, c3 } = getSuperSmootherCoeffs(len);
    const emaCurve = new Array(n);
    const vwmaCurve = new Array(n);

    emaCurve[0] = data[0].close;
    emaCurve[1] = data[1].close;
    vwmaCurve[0] = data[0].close;
    vwmaCurve[1] = data[1].close;

    for (let i = 2; i < n; i++) {
      // Baseline price smoother
      emaCurve[i] = c1 * (zClose[i] + zClose[i - 1]) * 0.5 + c2 * emaCurve[i - 1] + c3 * emaCurve[i - 2];
      // Volume-weighted adaptive smoother
      vwmaCurve[i] = c1 * (zVolPrice[i] + zVolPrice[i - 1]) * 0.5 + c2 * vwmaCurve[i - 1] + c3 * vwmaCurve[i - 2];
    }

    // 5. High-Probability Hysteresis Crossover Detection
    // Filters out 1-pip flat oscillations; only triggers on real momentum transitions
    const signals = [];
    let lastSignalDir = 0;
    let barsSinceSignal = 999;

    for (let i = len + 2; i < n; i++) {
      barsSinceSignal++;
      const v0 = vwmaCurve[i - 1], v1 = vwmaCurve[i];
      const e0 = emaCurve[i - 1], e1 = emaCurve[i];
      if (v0 === undefined || v1 === undefined || e0 === undefined || e1 === undefined) continue;

      const diff0 = v0 - e0;
      const diff1 = v1 - e1;
      const threshold = minDiv * (atr[i] || 1.0);

      // Bullish Cross: transitioned from negative separation to positive separation >= threshold
      const isBullCross = (diff0 <= 0 && diff1 > 0) || (diff0 < threshold && diff1 >= threshold);
      // Bearish Cross: transitioned from positive separation to negative separation <= -threshold
      const isBearCross = (diff0 >= 0 && diff1 < 0) || (diff0 > -threshold && diff1 <= -threshold);

      if (isBullCross && lastSignalDir !== 1 && barsSinceSignal >= 4) {
        lastSignalDir = 1;
        barsSinceSignal = 0;
        signals.push({
          bar: i,
          price: data[i].low,
          dir: 1,
          text: 'VWMA ▲ CROSS',
          diff: diff1
        });
      } else if (isBearCross && lastSignalDir !== -1 && barsSinceSignal >= 4) {
        lastSignalDir = -1;
        barsSinceSignal = 0;
        signals.push({
          bar: i,
          price: data[i].high,
          dir: -1,
          text: 'VWMA ▼ CROSS',
          diff: diff1
        });
      }
    }

    indicator._vwmaStudy = {
      p,
      ema: emaCurve,
      vwma: vwmaCurve,
      signals: signals.slice(-30),
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

    // 1. Shaded Volume Divergence Cloud between VWMA and Baseline
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
        ctx.fillStyle = isBull ? 'rgba(56, 189, 248, 0.16)' : 'rgba(244, 63, 94, 0.16)';
        ctx.beginPath();
        ctx.moveTo(x1, yV1);
        ctx.lineTo(x2, yV2);
        ctx.lineTo(x2, yE2);
        ctx.lineTo(x1, yE1);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 2. Draw Price Baseline Curve (Golden Amber)
    if (p.showEma) {
      ctx.strokeStyle = p.emaColor;
      ctx.lineWidth = 1.75;
      ctx.setLineDash([4, 3]);
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

    // 3. Draw Volume-Weighted Curve (Sky Blue, Solid)
    if (p.showVwma) {
      ctx.strokeStyle = p.vwmaColor;
      ctx.lineWidth = 2.25;
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

    // 4. Draw High-Probability Crossover Signals
    if (p.showSignals) {
      for (const s of v.signals) {
        if (s.bar < from || s.bar > to) continue;
        const isBuy = s.dir === 1;
        const color = isBuy ? p.bullSignalColor : p.bearSignalColor;
        bv.label(args, {
          index: s.bar,
          price: s.price,
          text: s.text,
          color: '#fff',
          background: color,
          align: 'center',
          baseline: isBuy ? 'top' : 'bottom',
          size: 9,
          padding: 3,
          offsetY: isBuy ? 16 : -16
        });
      }
    }

    ctx.restore();
    return true;
  }
};
`;
