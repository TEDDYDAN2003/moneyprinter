// ICT Sessions & Killzones (Asia Range, London Open Killzone, New York Open Killzone)
export const killzonesInputs = [
  { id: 'showAsia', name: 'Show Asian Range (00:00 - 06:00 UTC)', type: 'bool', defval: true },
  { id: 'showLondon', name: 'Show London Open (07:00 - 10:00 UTC)', type: 'bool', defval: true },
  { id: 'showNy', name: 'Show NY Open (12:00 - 15:30 UTC)', type: 'bool', defval: true },
  { id: 'showFullColumn', name: 'Show Full-Height Vertical Tint', type: 'bool', defval: true },
  { id: 'showTopRuler', name: 'Show Top Canvas Session Ribbon', type: 'bool', defval: true },
  { id: 'asiaColor', name: 'Asian Range Colour', type: 'color', defval: '#94a3b8', tab: 'style' },
  { id: 'londonColor', name: 'London Killzone Colour', type: 'color', defval: '#38bdf8', tab: 'style' },
  { id: 'nyColor', name: 'NY Killzone Colour', type: 'color', defval: '#fbbf24', tab: 'style' }
];

export const killzonesScript = String.raw`
const defaults = {
  showAsia: true,
  showLondon: true,
  showNy: true,
  showFullColumn: true,
  showTopRuler: true,
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
      // NY Open: 12:00 - 15:30 UTC (720 to 930 mins)
      else if (p.showNy && timeMin >= 720 && timeMin <= 930) {
        sessType = 'ny';
        col = p.nyColor;
        label = 'NY OPEN KZ';
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

    // Keep all sessions across dataset so zooming / scrolling backwards works 100%
    indicator._killzones = { p, sessions, n };
    return rows;
  },

  draw(args) {
    const { ctx, indicator } = args;
    const v = indicator._killzones;
    if (!v || !v.sessions) return false;
    const p = v.p;
    const vis = bv.visible(args);
    const X = i => bv.xOfIndex(args, i);
    const Y = price => bv.yOfPrice(args, price);
    const chartHeight = ctx.canvas.height;

    ctx.save();

    for (let sIdx = 0; sIdx < v.sessions.length; sIdx++) {
      const s = v.sessions[sIdx];
      if (s.endIndex < vis.from || s.startIndex > vis.to) continue;

      const barWidth = typeof bv.step === 'function' ? bv.step(args) : (bv.halfBar ? bv.halfBar(args) * 2 : 12);
      const x1 = X(s.startIndex);
      const x2 = X(s.endIndex) + barWidth;
      if (!Number.isFinite(x1) || !Number.isFinite(x2)) continue;

      // 1. Full-Height Vertical Column Tint
      if (p.showFullColumn) {
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.05;
        ctx.fillRect(x1, 0, Math.max(2, x2 - x1), chartHeight);
      }

      // 2. High / Low Session Range Box
      const yHigh = Y(s.high);
      const yLow = Y(s.low);
      if (Number.isFinite(yHigh) && Number.isFinite(yLow)) {
        bv.box(args, {
          fromIndex: s.startIndex,
          toIndex: s.endIndex,
          top: s.high,
          bottom: s.low,
          color: s.color,
          fillOpacity: 0.08,
          borderOpacity: 0.35,
          under: true
        });
      }

      // 3. Top Canvas Ruler Ribbon Band
      if (p.showTopRuler) {
        const ribbonWidth = Math.max(50, x2 - x1);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = s.color;
        ctx.fillRect(x1, 0, ribbonWidth, 16);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillText(s.label, x1 + 4, 11);
      }
    }

    ctx.restore();
    return true;
  }
};
`;
