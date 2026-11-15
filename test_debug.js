const fs = require('fs');
const ts = require('typescript');
const Module = require('module');

const bars = [];
let p = 2650;
const baseTime = 1731672000;
for (let i = 0; i < 100; i++) {
  if (i % 10 === 5) {
    bars.push({ time: baseTime + i * 900, open: p, high: p + 8, low: p, close: p + 8 });
    p += 8;
  } else if (i % 10 === 6) {
    bars.push({ time: baseTime + i * 900, open: p + 2, high: p + 10, low: p + 2, close: p + 9 });
    p += 9;
  } else {
    bars.push({ time: baseTime + i * 900, open: p, high: p + 2, low: p - 1, close: p + 0.5 });
    p += 0.5;
  }
}

// Invalidation stop logic for FVG retest:
function computeSmartSL(bar, fvgZone, direction, atr) {
  let stopPrice = 0;
  if (direction === 1) {
    // For Long: invalidation is below the FVG zone bottom or reaction candle low
    const refLow = fvgZone ? Math.max(fvgZone.bottom, bar.low - 0.5 * atr) : bar.low;
    stopPrice = refLow - 0.25 * atr;
  } else {
    // For Short: invalidation is above the FVG zone top or reaction candle high
    const refHigh = fvgZone ? Math.min(fvgZone.top, bar.high + 0.5 * atr) : bar.high;
    stopPrice = refHigh + 0.25 * atr;
  }
  const dist = Math.abs(bar.close - stopPrice);
  return { stopPrice: Number(stopPrice.toFixed(2)), dist: Number(dist.toFixed(2)) };
}

const fvgZone = { top: 2683.5, bottom: 2675 };
const sl = computeSmartSL(bars[16], fvgZone, 1, 3.5);
console.log('Smart SL:', sl);
const maxRisk = 1.0;
let lots = maxRisk / (sl.dist * 100);
lots = Math.max(0.001, Math.floor(lots * 10000) / 10000);
const risk = lots * 100 * sl.dist;
console.log('lots:', lots, 'risk $:', risk);
