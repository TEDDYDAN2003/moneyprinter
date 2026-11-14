// High-Impact Economic News Shock & Volatility Filter (CPI, PPI, NFP, FOMC Blackout Zones)
export const newsFilterInputs = [
  { id: 'atrMultiplier', name: 'Shock threshold (x ATR)', type: 'float', defval: 2.2, min: 1.2, max: 5.0, step: 0.1 },
  { id: 'blackoutBars', name: 'Blackout bars post-shock', type: 'int', defval: 4, min: 1, max: 12, step: 1 },
  { id: 'showTags', name: 'Show News Warning Tags', type: 'bool', defval: true },
  { id: 'shockColor', name: 'News Shock Marker Colour', type: 'color', defval: '#f59e0b', tab: 'style' }
];

export const newsFilterScript = String.raw`
const defaults = {
  atrMultiplier: 2.2,
  blackoutBars: 4,
  showTags: true,
  shockColor: '#f59e0b'
};

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (n < 20) { indicator._newsFilter = null; return rows; }

    const mult = Math.max(1.2, Math.min(5.0, Number(p.atrMultiplier) || 2.2));
    const blackout = Math.max(1, Math.min(12, Math.floor(Number(p.blackoutBars) || 4)));

    // Calculate rolling 14 ATR
    const tr = [data[0].high - data[0].low];
    for (let i = 1; i < n; i++) {
      const h = data[i].high, l = data[i].low, pc = data[i - 1].close;
      tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    const atr = new Array(n).fill(0);
    let trSum = 0;
    for (let i = 0; i < 14; i++) trSum += tr[i];
    atr[13] = trSum / 14;
    for (let i = 14; i < n; i++) atr[i] = (atr[i - 1] * 13 + tr[i]) / 14;

    const shocks = [];
    for (let i = 14; i < n; i++) {
      const d = new Date(data[i].time * 1000);
      const utcH = d.getUTCHours();
      const utcM = d.getUTCMinutes();
      const timeMin = utcH * 60 + utcM;

      // News release windows:
      // 12:30 UTC = 750 (CPI, PPI, NFP)
      // 13:30 UTC = 810 (US economic data during daylight savings)
      // 18:00 UTC = 1080 (FOMC Statement)
      const isNewsWindow = (Math.abs(timeMin - 750) <= 20) || (Math.abs(timeMin - 810) <= 20) || (Math.abs(timeMin - 1080) <= 30);
      const barRange = data[i].high - data[i].low;

      if (isNewsWindow && barRange >= mult * atr[i]) {
        let label = 'NEWS SHOCK';
        if (Math.abs(timeMin - 750) <= 20 || Math.abs(timeMin - 810) <= 20) label = 'CPI / PPI / NFP';
        else if (Math.abs(timeMin - 1080) <= 30) label = 'FOMC RATE DECISION';

        shocks.push({
          index: i,
          time: data[i].time,
          high: data[i].high,
          low: data[i].low,
          label,
          blackoutUntil: Math.min(n - 1, i + blackout)
        });
      }
    }

    indicator._newsFilter = { p, shocks: shocks.slice(-40) };
    return rows;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const v = indicator._newsFilter;
    if (!v) return false;
    const p = v.p;
    const vis = bv.visible(args);
    const X = i => bv.xOfIndex(args, i);
    const Y = price => bv.yOfPrice(args, price);

    ctx.save();

    for (const s of v.shocks) {
      if (s.blackoutUntil < vis.from || s.index > vis.to) continue;

      const x = X(s.index);
      const yHigh = Y(s.high);
      const yLow = Y(s.low);

      if (!Number.isFinite(x) || !Number.isFinite(yHigh)) continue;

      // Draw blackout shading band
      const xEnd = X(s.blackoutUntil);
      if (Number.isFinite(xEnd)) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
        ctx.fillRect(x, 0, Math.max(12, xEnd - x), bv.bounds(args).height);
      }

      // Draw warning badge
      if (p.showTags) {
        ctx.fillStyle = p.shockColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = 'bold 9px sans-serif';
        const tag = '⚠️ ' + s.label;
        const textWidth = ctx.measureText(tag).width;

        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.fillRect(x - textWidth / 2 - 4, yHigh - 22, textWidth + 8, 16);
        ctx.fillStyle = '#0f172a';
        ctx.fillText(tag, x - textWidth / 2, yHigh - 10);
      }
    }

    ctx.restore();
    return true;
  }
};
`;
