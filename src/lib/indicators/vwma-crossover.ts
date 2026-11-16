// Quantum Zero-Lag Volume-Weighted Moving Average (V-ZLEMA & SuperSmoother)
// Eliminates phase lag using digital signal processing (DSP 2-Pole Gaussian filter)
// Hugs price action closely while smoothing noise and filtering choppy false crosses.
// Now includes a 200 EMA Macro-Trend Gate to suppress counter-trend signals.
export const vwmaCrossoverInputs = [
  { id: 'length', name: 'Filter Period (Cutoff)', type: 'int', defval: 14, min: 5, max: 100, step: 1 },
  { id: 'minDivergence', name: 'Min Crossover Separation (ATR fraction)', type: 'float', defval: 0.15, min: 0.02, max: 1.0, step: 0.01 },
  { id: 'trendGate', name: 'Macro Trend Gate (suppress counter-trend signals)', type: 'bool', defval: true },
  { id: 'showCounterTrend', name: 'Show Counter-Trend Signals (dimmed)', type: 'bool', defval: true },
  { id: 'showVwma', name: 'Show Volume-Weighted Curve (Cyan)', type: 'bool', defval: true },
  { id: 'showEma', name: 'Show Price Baseline Curve (Amber)', type: 'bool', defval: true },
  { id: 'showSignals', name: 'Show Crossover Tags', type: 'bool', defval: true },
  { id: 'showResearchZones', name: 'Experimental XAU M15 model zones (unvalidated)', type: 'bool', defval: false },
  { id: 'showDivergence', name: 'Show Volume Pressure Cloud', type: 'bool', defval: true },
  { id: 'vwmaColor', name: 'VWMA Line Colour', type: 'color', defval: '#38bdf8', tab: 'style' },
  { id: 'emaColor', name: 'Baseline Line Colour', type: 'color', defval: '#fbbf24', tab: 'style' },
  { id: 'bullSignalColor', name: 'Bullish Volume Cross Colour', type: 'color', defval: '#10b981', tab: 'style' },
  { id: 'bearSignalColor', name: 'Bearish Volume Cross Colour', type: 'color', defval: '#f43f5e', tab: 'style' }
];

export const vwmaCrossoverScript = String.raw`
// =====================================================================
// Quantum Zero-Lag Volume Smoother (Ehlers 2-Pole SuperSmoother + ZLEMA)
// + 200 EMA Macro-Trend Gate & Multi-Factor Signal Quality Grading
// =====================================================================
const defaults = {
  length: 14,
  minDivergence: 0.15,
  trendGate: true,
  showCounterTrend: true,
  showVwma: true,
  showEma: true,
  showSignals: true,
  showResearchZones: false,
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

    // 2. 200 EMA for Macro-Trend Gate (same algorithm as macro-trend.ts)
    const ema200 = new Array(n);
    const ema50 = new Array(n);
    const k200 = 2.0 / 201;
    const k50 = 2.0 / 51;
    let sum200 = 0, sum50 = 0;
    for (let i = 0; i < n; i++) {
      const cl = data[i].close;
      if (i < 49) { sum50 += cl; }
      else if (i === 49) { sum50 += cl; ema50[i] = sum50 / 50; }
      else { ema50[i] = cl * k50 + ema50[i - 1] * (1 - k50); }

      if (i < 199) { sum200 += cl; }
      else if (i === 199) { sum200 += cl; ema200[i] = sum200 / 200; }
      else { ema200[i] = cl * k200 + ema200[i - 1] * (1 - k200); }
    }

    // 3. Relative Institutional Volume Proxy
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

    // 4. Zero-Lag Corrected Series
    const zClose = new Array(n);
    const zVolPrice = new Array(n);
    for (let i = 0; i < n; i++) {
      const pastIdx = Math.max(0, i - lag);
      const momentum = data[i].close - data[pastIdx].close;
      zClose[i] = data[i].close + momentum * 0.75;
      zVolPrice[i] = data[i].close + momentum * (relVol[i] * 0.75);
    }

    // 5. Apply Ehlers SuperSmoother Filter
    const { c1, c2, c3 } = getSuperSmootherCoeffs(len);
    const emaCurve = new Array(n);
    const vwmaCurve = new Array(n);

    emaCurve[0] = data[0].close;
    emaCurve[1] = data[1].close;
    vwmaCurve[0] = data[0].close;
    vwmaCurve[1] = data[1].close;

    for (let i = 2; i < n; i++) {
      emaCurve[i] = c1 * (zClose[i] + zClose[i - 1]) * 0.5 + c2 * emaCurve[i - 1] + c3 * emaCurve[i - 2];
      vwmaCurve[i] = c1 * (zVolPrice[i] + zVolPrice[i - 1]) * 0.5 + c2 * vwmaCurve[i - 1] + c3 * vwmaCurve[i - 2];
    }

    // 6. Multi-Factor Signal Quality Classification + Macro Trend Gate
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

      const isBullCross = (diff0 <= 0 && diff1 > 0) || (diff0 < threshold && diff1 >= threshold);
      const isBearCross = (diff0 >= 0 && diff1 < 0) || (diff0 > -threshold && diff1 <= -threshold);

      if (!isBullCross && !isBearCross) continue;
      if (isBullCross && lastSignalDir === 1) continue;
      if (isBearCross && lastSignalDir === -1) continue;
      if (barsSinceSignal < 4) continue;

      const dir = isBullCross ? 1 : -1;

      // ---- Signal Quality Grading ----
      let quality = 0; // 0 = counter-trend (suppress), 1 = weak, 2 = moderate, 3 = high
      const close = data[i].close;
      const e200 = ema200[i];
      const e50i = ema50[i];
      const atrVal = atr[i] || 1.0;

      // Factor 1: Macro trend alignment (close vs 200 EMA)
      const aboveMacro = e200 !== undefined && close > e200;
      const belowMacro = e200 !== undefined && close < e200;
      const trendAligned = (dir === 1 && aboveMacro) || (dir === -1 && belowMacro);
      const counterTrend = (dir === 1 && belowMacro) || (dir === -1 && aboveMacro);

      if (trendAligned) quality += 1;

      // Factor 2: 50 EMA slope agreement (momentum confirmation)
      if (e50i !== undefined && ema50[Math.max(0, i - 5)] !== undefined) {
        const slope50 = e50i - ema50[Math.max(0, i - 5)];
        if ((dir === 1 && slope50 > 0) || (dir === -1 && slope50 < 0)) quality += 1;
      }

      // Factor 3: Volume surge (relative volume > 1.3x average)
      if (relVol[i] > 1.3) quality += 1;

      // Classify
      let grade = 'LOW';
      if (quality >= 3) grade = 'HIGH';
      else if (quality >= 2) grade = 'MED';
      else if (counterTrend) grade = 'CTR';  // counter-trend

      lastSignalDir = dir;
      barsSinceSignal = 0;

      signals.push({
        bar: i,
        price: dir === 1 ? data[i].low : data[i].high,
        dir,
        grade,
        quality,
        counterTrend,
        trendAligned,
        diff: diff1
      });
    }

    // Research candidates use completed candles only. Pivot is confirmed before
    // the signal candle; prior UTC-day extremes are frozen at the day boundary.
    // UTC session windows and the New York 12:45 historical cutoff are fixed.
    const zoneModel = {"mean":[-0.11138310893512852,0.8714810281517748,0.32558139534883723,0.07359803443893077,0.30780953565072494,1.3518003229768654,0.6829865361077111,0.38555691554467564,0.37821297429620565,0.3488372093023256,0.2729498164014688,4.913708690330477],"scale":[0.9937775420303826,0.9462323070437969,0.4685916669676689,0.083367010406265,1.007039611868316,0.8608467586251334,0.46531272022512177,0.4867265971984171,0.48494115145059197,0.47660236120742094,0.4454752676949331,3.097021798107636],"coef":[0.052811547725947545,-0.03292154104863926,0.064610750805681,-0.027001917630220473,0.011868521374053096,-0.09599173941801208,0.02618048803735632,0.18556539260636395,-0.06537535823024565,-0.04909753679138778,0.12369531477255673,0.379442144151107],"intercept":-1.516493207969892,"threshold":0.2};
    const researchZones = [];
    if (p.showResearchZones && len === 14 && minDiv === 0.15 && n > 220) {
      let pivotHigh = null, pivotLow = null, day = null, dayHigh = null, dayLow = null, priorHigh = null, priorLow = null;
      const byBar = new Map(signals.map(s => [s.bar, s]));
      const nyClock = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
      for (let i = 0; i < n - 1; i++) {
        const t = Number(data[i].time), c = data[i];
        if (!Number.isFinite(t)) continue;
        const utcDay = Math.floor(t / 86400);
        if (utcDay !== day) { priorHigh = dayHigh; priorLow = dayLow; day = utcDay; dayHigh = c.high; dayLow = c.low; }
        else { dayHigh = Math.max(dayHigh, c.high); dayLow = Math.min(dayLow, c.low); }
        const s = byBar.get(i);
        if (s && i >= 220 && i > 1 && Number(data[i].time)-Number(data[i-1].time) === 900 && Number(data[i-1].time)-Number(data[i-2].time) === 900) {
          const decision = new Date((t + 900) * 1000), m = decision.getUTCHours()*60+decision.getUTCMinutes();
          const parts = nyClock.formatToParts(decision), h = Number(parts.find(x=>x.type==='hour').value), mm = Number(parts.find(x=>x.type==='minute').value), toCutoff = 765-h*60-mm;
          const session = (m >= 420 && m < 600) || (m >= 720 && m < 1020);
          const a = atr[i], level = s.dir === 1 ? pivotLow : pivotHigh, prior = s.dir === 1 ? priorLow : priorHigh;
          const touch = q => q !== null && c.low <= q + .2*a && c.high >= q - .2*a;
          const swing = touch(level), previousDay = touch(prior);
          if (session && toCutoff > 0 && Number.isFinite(a) && a > 0 && (swing || previousDay)) {
            const zone = swing ? level : prior;
            const features = [s.dir, s.quality, s.trendAligned ? 1 : 0, s.dir*s.diff/a, s.dir*(c.close-c.open)/a, (c.high-c.low)/a, swing?1:0, previousDay?1:0, m>=420&&m<600?1:0, m>=720&&m<900?1:0, m>=900&&m<1020?1:0, toCutoff/60];
            const logit = zoneModel.intercept + features.reduce((sum, x, j) => sum + (x-zoneModel.mean[j])/zoneModel.scale[j]*zoneModel.coef[j], 0);
            const score = 1/(1+Math.exp(-logit));
            researchZones.push({bar:i,dir:s.dir,level:zone,lower:zone-.2*a,upper:zone+.2*a,features,score,suggested:score>=zoneModel.threshold});
          }
        }
        // Confirmation becomes available only after bar i closes, for future bars.
        const k = i-3;
        if (k >= 3 && Number(data[i].time)-Number(data[k-3].time) === 5400 && Array.from({length:6},(_,j)=>Number(data[k-2+j].time)-Number(data[k-3+j].time)).every(x=>x===900)) {
          const neighbors = [k-3,k-2,k-1,k+1,k+2,k+3];
          if (neighbors.every(j=>data[k].high>data[j].high)) pivotHigh=data[k].high;
          if (neighbors.every(j=>data[k].low<data[j].low)) pivotLow=data[k].low;
        }
      }
    }

    indicator._vwmaStudy = {
      p,
      ema: emaCurve,
      vwma: vwmaCurve,
      signals,
      researchZones,
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

    // 4. Draw Crossover Signals with Quality Grading
    if (p.showSignals) {
      for (const s of v.signals) {
        if (s.bar < from || s.bar > to) continue;
        const isBuy = s.dir === 1;

        // Macro Trend Gate: suppress or dim counter-trend signals
        if (p.trendGate && s.counterTrend) {
          if (!p.showCounterTrend) continue; // completely hidden
          // Draw dimmed counter-trend signal
          const arrow = isBuy ? '\u25B2' : '\u25BC';
          bv.label(args, {
            index: s.bar,
            price: s.price,
            text: arrow + ' CTR',
            color: 'rgba(255,255,255,0.35)',
            background: 'rgba(100,116,139,0.4)',
            align: 'center',
            baseline: isBuy ? 'top' : 'bottom',
            size: 8,
            padding: 2,
            offsetY: isBuy ? 16 : -16
          });
          continue;
        }

        // Quality-graded with-trend signal
        const baseColor = isBuy ? p.bullSignalColor : p.bearSignalColor;
        let text = '';
        let bgColor = baseColor;
        let textSize = 9;

        if (s.grade === 'HIGH') {
          text = (isBuy ? '\u25B2 HIGH' : '\u25BC HIGH');
          textSize = 10;
        } else if (s.grade === 'MED') {
          text = (isBuy ? '\u25B2 MED' : '\u25BC MED');
        } else {
          text = (isBuy ? '\u25B2 LOW' : '\u25BC LOW');
          bgColor = 'rgba(100,116,139,0.6)';
        }

        bv.label(args, {
          index: s.bar,
          price: s.price,
          text,
          color: '#fff',
          background: bgColor,
          align: 'center',
          baseline: isBuy ? 'top' : 'bottom',
          size: textSize,
          padding: 3,
          offsetY: isBuy ? 16 : -16
        });
      }
    }

    if (p.showResearchZones) {
      for (const z of v.researchZones) {
        if (!z.suggested || z.bar < from || z.bar > to) continue;
        const x = X(z.bar), y1 = Y(z.lower), y2 = Y(z.upper), right = X(Math.min(z.bar + 4, to));
        if (![x,y1,y2,right].every(Number.isFinite)) continue;
        ctx.fillStyle = z.dir === 1 ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)';
        ctx.fillRect(Math.min(x,right),Math.min(y1,y2),Math.abs(right-x),Math.max(1,Math.abs(y2-y1)));
        bv.label(args,{index:z.bar,price:z.level,text:(z.dir===1?'TEST BUY ZONE':'TEST SELL ZONE')+' · score '+Math.round(z.score*100)+'%',color:'#fff',background:z.dir===1?'#065f46':'#9f1239',align:'center',baseline:z.dir===1?'top':'bottom',size:9,padding:3,offsetY:z.dir===1?15:-15});
      }
    }

    ctx.restore();
    return true;
  }
};
`;
