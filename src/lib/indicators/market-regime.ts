// Market Regime Detector — Wyckoff Phase Overlay
// Identifies: Accumulation, Markup, Distribution, Markdown, Consolidation
export const marketRegimeInputs = [
  { id: 'regimeWindow', name: 'Regime detection window (bars)', type: 'int', defval: 40, min: 15, max: 100, step: 1 },
  { id: 'emaFast', name: 'Fast EMA for regime', type: 'int', defval: 20, min: 5, max: 100, step: 1 },
  { id: 'emaSlow', name: 'Slow EMA for regime', type: 'int', defval: 50, min: 10, max: 200, step: 1 },
  { id: 'showBackground', name: 'Show coloured phase background', type: 'bool', defval: true },
  { id: 'showLabel', name: 'Show phase label on chart', type: 'bool', defval: true },
  { id: 'accColor', name: 'Accumulation colour', type: 'color', defval: '#22d3ee', tab: 'style' },
  { id: 'markupColor', name: 'Markup colour', type: 'color', defval: '#10b981', tab: 'style' },
  { id: 'distColor', name: 'Distribution colour', type: 'color', defval: '#f97316', tab: 'style' },
  { id: 'markdownColor', name: 'Markdown colour', type: 'color', defval: '#ef4444', tab: 'style' },
  { id: 'consolColor', name: 'Consolidation colour', type: 'color', defval: '#64748b', tab: 'style' }
];

export const marketRegimeScript = String.raw`
const defaults = {
  regimeWindow: 40, emaFast: 20, emaSlow: 50,
  showBackground: true, showLabel: true,
  accColor: '#22d3ee', markupColor: '#10b981', distColor: '#f97316',
  markdownColor: '#ef4444', consolColor: '#64748b'
};

function calcEMA(data, len) {
  const k = 2 / (len + 1);
  const out = new Array(data.length);
  let sum = 0;
  for (let i = 0; i < len && i < data.length; i++) sum += data[i].close;
  out[len - 1] = sum / len;
  for (let i = len; i < data.length; i++) out[i] = data[i].close * k + out[i - 1] * (1 - k);
  return out;
}

function isSwingHigh(data, i, len) {
  if (i < len || i >= data.length - len) return false;
  for (let k = 1; k <= len; k++) {
    if (data[i - k].high >= data[i].high || data[i + k].high >= data[i].high) return false;
  }
  return true;
}
function isSwingLow(data, i, len) {
  if (i < len || i >= data.length - len) return false;
  for (let k = 1; k <= len; k++) {
    if (data[i - k].low <= data[i].low || data[i + k].low <= data[i].low) return false;
  }
  return true;
}

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (n < p.regimeWindow + 10) { indicator._regime = null; return rows; }

    const win  = Math.max(15, Math.min(100, Math.floor(Number(p.regimeWindow) || 40)));
    const ef   = calcEMA(data, Math.max(5, Math.floor(Number(p.emaFast) || 20)));
    const es   = calcEMA(data, Math.max(10, Math.floor(Number(p.emaSlow) || 50)));

    // ATR
    const atr = new Array(n).fill(null);
    let atrS = 0, atrP = null;
    for (let i = 0; i < n; i++) {
      const c = data[i];
      const pr = i ? data[i - 1] : c;
      const tr = Math.max(c.high - c.low, Math.abs(c.high - pr.close), Math.abs(c.low - pr.close));
      if (i < 14) { atrS += tr; if (i === 13) { atrP = atrS / 14; atr[i] = atrP; } }
      else if (atrP !== null) { atrP = (atrP * 13 + tr) / 14; atr[i] = atrP; }
    }

    // Swing structure
    const swLen = 5;
    let recentSH = [], recentSL = [];

    const phases = [];
    for (let i = 0; i < n; i++) {
      if (i < win) { phases.push({ regime: 'insufficient', color: p.consolColor, conf: 0 }); continue; }

      // Collect confirmed swings (causal)
      const conf = i - swLen;
      if (conf >= swLen && conf < n) {
        if (isSwingHigh(data, conf, swLen)) recentSH.push(data[conf].high);
        if (isSwingLow(data, conf, swLen))  recentSL.push(data[conf].low);
      }
      recentSH = recentSH.slice(-8);
      recentSL = recentSL.slice(-8);

      const av = atr[i] || 1;
      const c = data[i];

      // Window stats
      const wc = data.slice(Math.max(0, i - win + 1), i + 1);
      const wH = Math.max(...wc.map(x => x.high));
      const wL = Math.min(...wc.map(x => x.low));
      const wRange = wH - wL;
      const rangeRatio = wRange / (av * win);

      // ATR compression
      const lbAtrs = [];
      for (let k = Math.max(0, i - win); k <= i; k++) if (atr[k] !== null) lbAtrs.push(atr[k]);
      const avgAtr = lbAtrs.length ? lbAtrs.reduce((a, b) => a + b, 0) / lbAtrs.length : av;
      const compression = av / avgAtr;

      // EMA position
      const efN = ef[i], esN = es[i];
      let emaPos = 0, emaSlope = 0;
      if (efN && esN) {
        emaPos = c.close > efN && efN > esN ? 1 : (c.close < efN && efN < esN ? -1 : 0);
        const efP = ef[Math.max(0, i - 10)], esP = es[Math.max(0, i - 10)];
        if (efP && esP) emaSlope = efN > efP && esN > esP ? 1 : (efN < efP && esN < esP ? -1 : 0);
      }

      // Swing score
      let swScore = 0;
      if (recentSH.length >= 2 && recentSL.length >= 2) {
        const hh = recentSH[recentSH.length - 1] > recentSH[recentSH.length - 2];
        const hl = recentSL[recentSL.length - 1] > recentSL[recentSL.length - 2];
        const lh = recentSH[recentSH.length - 1] < recentSH[recentSH.length - 2];
        const ll = recentSL[recentSL.length - 1] < recentSL[recentSL.length - 2];
        if (hh && hl) swScore = 2;
        else if (hh || hl) swScore = 1;
        else if (lh && ll) swScore = -2;
        else if (lh || ll) swScore = -1;
      }

      // Body bias
      const bulls = wc.filter(x => x.close > x.open).length;
      const bears = wc.filter(x => x.close < x.open).length;
      const bodyBias = (bulls - bears) / wc.length;

      // Position in range
      const posInRange = wRange > 0 ? (c.close - wL) / wRange : 0.5;

      // Classify
      let regime = 'consolidation', color = p.consolColor, confidence = 0.5, sub = '';

      if (swScore >= 1 && emaPos >= 1 && emaSlope >= 1) {
        regime = 'markup'; color = p.markupColor;
        confidence = Math.min(0.95, 0.6 + 0.1 * swScore + 0.1 * compression);
        sub = swScore === 2 ? 'strong' : '';
      } else if (swScore <= -1 && emaPos <= -1 && emaSlope <= -1) {
        regime = 'markdown'; color = p.markdownColor;
        confidence = Math.min(0.95, 0.6 + 0.1 * Math.abs(swScore) + 0.1 * compression);
        sub = swScore === -2 ? 'strong' : '';
      } else if (compression < 0.85 && rangeRatio < 0.5 && posInRange < 0.4 && bodyBias > -0.1) {
        regime = 'accumulation'; color = p.accColor;
        confidence = Math.min(0.90, 0.55 + 0.2 * (1 - compression) + 0.15 * (1 - posInRange));
        sub = posInRange < 0.15 ? 'spring' : (bodyBias > 0.2 ? 'test' : 'cause');
      } else if (compression < 0.85 && rangeRatio < 0.5 && posInRange > 0.6 && bodyBias < 0.1) {
        regime = 'distribution'; color = p.distColor;
        confidence = Math.min(0.90, 0.55 + 0.2 * (1 - compression) + 0.15 * posInRange);
        sub = posInRange > 0.85 ? 'utad' : (bodyBias < -0.2 ? 'sow' : 'cause');
      } else {
        regime = 'consolidation'; color = p.consolColor; confidence = 0.5;
        sub = rangeRatio < 0.3 ? 'tight' : '';
      }

      phases.push({ regime, sub, color, conf: confidence });
    }

    indicator._regime = { p, phases };
    return rows;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const v = indicator._regime;
    if (!v) return false;
    const p = v.p;
    const vis = bv.visible(args);
    const from = Math.max(0, Math.floor(vis.from));
    const to   = Math.min(v.phases.length - 1, Math.ceil(vis.to));
    const X = i => bv.xOfIndex(args, i);
    const bnd = bv.bounds(args);

    ctx.save();

    if (p.showBackground) {
      // Draw regime background bands
      let runStart = from, runRegime = v.phases[from]?.regime || '';
      for (let i = from; i <= to + 1; i++) {
        const ph = i <= to ? v.phases[i] : null;
        const regime = ph?.regime || '';
        if (regime !== runRegime || i === to + 1) {
          if (runRegime && runRegime !== 'insufficient') {
            const color = v.phases[runStart]?.color || '#64748b';
            const x1 = X(runStart) - bv.halfBar(args);
            const x2 = X(Math.min(i - 1, to)) + bv.halfBar(args);
            ctx.fillStyle = bv.withAlpha(color, 0.06);
            ctx.fillRect(x1, bnd.top, x2 - x1, bnd.height);
          }
          runStart = i;
          runRegime = regime;
        }
      }
    }

    if (p.showLabel) {
      // Show regime label at regular intervals (every 30 bars)
      const step = Math.max(20, Math.floor((to - from) / 8));
      for (let i = from; i <= to; i += step) {
        const ph = v.phases[i];
        if (!ph || ph.regime === 'insufficient') continue;
        const label = ph.regime.toUpperCase() + (ph.sub ? ' (' + ph.sub + ')' : '');
        const conf  = Math.round(ph.conf * 100) + '%';
        const x = X(i);
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = bv.withAlpha(ph.color, 0.85);
        ctx.fillText(label, x, bnd.top + 6);
        ctx.font = '8px monospace';
        ctx.fillStyle = bv.withAlpha(ph.color, 0.55);
        ctx.fillText(conf, x, bnd.top + 18);
      }
    }

    ctx.restore();
    return true;
  }
};
`;
