// ICT Sessions & Killzones (Asia Range, London Open Killzone, New York Open Killzone)
export const killzonesInputs = [
  { id: 'showAsia', name: 'Show Asian Range (00:00 - 06:00 UTC)', type: 'bool', defval: true },
  { id: 'showLondon', name: 'Show London Open (07:00 - 10:00 UTC)', type: 'bool', defval: true },
  { id: 'showNy', name: 'Show NY Open (12:30 - 15:30 UTC)', type: 'bool', defval: true },
  { id: 'asiaColor', name: 'Asian Range Colour', type: 'color', defval: '#94a3b8', tab: 'style' },
  { id: 'londonColor', name: 'London Killzone Colour', type: 'color', defval: '#38bdf8', tab: 'style' },
  { id: 'nyColor', name: 'NY Killzone Colour', type: 'color', defval: '#fbbf24', tab: 'style' }
];

export const killzonesScript = String.raw`
const defaults = {
  showAsia: true,
  showLondon: true,
  showNy: true,
  asiaColor: '#94a3b8',
  londonColor: '#38bdf8',
  nyColor: '#fbbf24'
};

return {
  figures: [],
  calc(data, indicator) {
    const p = Object.assign({}, defaults, indicator.extendData?.inputs || {});
    const n = data.length;
    const rows = data.map(() => ({}));
    if (!n) { indicator._killzones = null; return rows; }

    const sessions = [];
    let currentSession = null;

    for (let i = 0; i < n; i++) {
      const d = new Date(data[i].time * 1000);
      const utcH = d.getUTCHours();
      const utcM = d.getUTCMinutes();
      const timeMin = utcH * 60 + utcM;

      let sessType = null;
      let col = p.asiaColor;
      let label = 'ASIA';

      // Asia: 00:00 - 06:00 UTC (0 to 360 mins)
      if (p.showAsia && timeMin >= 0 && timeMin < 360) {
        sessType = 'asia';
        col = p.asiaColor;
        label = 'ASIA RANGE';
      }
      // London Open: 07:00 - 10:00 UTC (420 to 600 mins)
      else if (p.showLondon && timeMin >= 420 && timeMin <= 600) {
        sessType = 'london';
        col = p.londonColor;
        label = 'LONDON OPEN';
      }
      // NY Open: 12:30 - 15:30 UTC (750 to 930 mins)
      else if (p.showNy && timeMin >= 750 && timeMin <= 930) {
        sessType = 'ny';
        col = p.nyColor;
        label = 'NY OPEN';
      }

      if (sessType) {
        if (!currentSession || currentSession.type !== sessType) {
          if (currentSession) sessions.push(currentSession);
          currentSession = {
            type: sessType,
            label,
            color: col,
            startIndex: i,
            endIndex: i,
            high: data[i].high,
            low: data[i].low
          };
        } else {
          currentSession.endIndex = i;
          currentSession.high = Math.max(currentSession.high, data[i].high);
          currentSession.low = Math.min(currentSession.low, data[i].low);
        }
      } else {
        if (currentSession) {
          sessions.push(currentSession);
          currentSession = null;
        }
      }
    }
    if (currentSession) sessions.push(currentSession);

    indicator._killzones = { p, sessions: sessions.slice(-60) };
    return rows;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const v = indicator._killzones;
    if (!v) return false;
    const p = v.p;
    const vis = bv.visible(args);
    const X = i => bv.xOfIndex(args, i);
    const Y = price => bv.yOfPrice(args, price);

    ctx.save();

    for (const s of v.sessions) {
      if (s.endIndex < vis.from || s.startIndex > vis.to) continue;

      const barWidth = typeof bv.step === 'function' ? bv.step(args) : (bv.halfBar ? bv.halfBar(args) * 2 : 12);
      const x1 = X(s.startIndex);
      const x2 = X(s.endIndex) + barWidth;
      const yHigh = Y(s.high);
      const yLow = Y(s.low);

      if (![x1, x2, yHigh, yLow].every(Number.isFinite)) continue;

      // Draw session box
      bv.box(args, {
        fromIndex: s.startIndex,
        toIndex: s.endIndex,
        top: s.high,
        bottom: s.low,
        color: s.color,
        fillOpacity: 0.08,
        borderOpacity: 0.4,
        under: true
      });

      // Label session
      ctx.fillStyle = s.color;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(s.label, Math.max(10, x1 + 4), yHigh - 4);
    }

    ctx.restore();
    return true;
  }
};
`;
