// ICT Sessions & Killzones (Asia Range, London Open, London & NY Overlap, NY Close)
export const killzonesInputs = [
  { id: 'showAsia', name: 'Show Asian Range (00:00 - 06:00 UTC)', type: 'bool', defval: true },
  { id: 'showLondon', name: 'Show London Open (07:00 - 10:00 UTC)', type: 'bool', defval: true },
  { id: 'showOverlap', name: 'Show London & NY Overlap (12:00 - 15:00 UTC)', type: 'bool', defval: true },
  { id: 'showNy', name: 'Show NY Close (15:00 - 17:00 UTC)', type: 'bool', defval: true },
  { id: 'showFullColumn', name: 'Show Full-Height Vertical Tint', type: 'bool', defval: true },
  { id: 'showBottomRuler', name: 'Show Bottom Canvas Session Ribbon', type: 'bool', defval: true },
  { id: 'showTopRuler', name: 'Show Top Canvas Session Ribbon', type: 'bool', defval: true },
  { id: 'asiaColor', name: 'Asian Range Colour', type: 'color', defval: '#94a3b8', tab: 'style' },
  { id: 'londonColor', name: 'London Killzone Colour', type: 'color', defval: '#38bdf8', tab: 'style' },
  { id: 'overlapColor', name: 'London/NY Overlap Colour', type: 'color', defval: '#10b981', tab: 'style' },
  { id: 'nyColor', name: 'NY Close Colour', type: 'color', defval: '#fbbf24', tab: 'style' }
];

export const killzonesScript = String.raw`
const defaults = {
  showAsia: true,
  showLondon: true,
  showOverlap: true,
  showNy: true,
  showFullColumn: true,
  showBottomRuler: true,
  showTopRuler: true,
  asiaColor: '#94a3b8',
  londonColor: '#38bdf8',
  overlapColor: '#10b981',
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
      const rawT = data[i].timestamp || (data[i].time ? (data[i].time > 1e11 ? data[i].time : data[i].time * 1000) : 0);
      const d = new Date(rawT);
      const utcH = d.getUTCHours();
      const utcM = d.getUTCMinutes();
      const timeMin = utcH * 60 + utcM;

      let sessType = null;
      let col = p.asiaColor;
      let label = 'ASIA';

      // 1. Asia: 00:00 - 06:00 UTC (0 to 360 mins)
      if (p.showAsia && timeMin >= 0 && timeMin < 360) {
        sessType = 'asia';
        col = p.asiaColor;
        label = 'ASIA 00-06';
      }
      // 2. London Open: 07:00 - 10:00 UTC (420 to 600 mins)
      else if (p.showLondon && timeMin >= 420 && timeMin <= 600) {
        sessType = 'london';
        col = p.londonColor;
        label = 'LONDON 07-10';
      }
      // 3. London & NY Overlap: 12:00 - 15:00 UTC (720 to 900 mins)
      else if (p.showOverlap && timeMin >= 720 && timeMin < 900) {
        sessType = 'overlap';
        col = p.overlapColor;
        label = 'LON/NY OVERLAP 12-15';
      }
      // 4. NY Close: 15:00 - 17:00 UTC (900 to 1020 mins)
      else if (p.showNy && timeMin >= 900 && timeMin <= 1020) {
        sessType = 'ny';
        col = p.nyColor;
        label = 'NY CLOSE 15-17';
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

      const ribbonWidth = Math.max(40, x2 - x1);

      // 1. Full-Height Vertical Column Tint
      if (p.showFullColumn) {
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.06;
        ctx.fillRect(x1, 0, ribbonWidth, chartHeight);
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
          borderOpacity: 0.45,
          under: true
        });
      }

      // 3. Top Canvas Ruler Ribbon Band
      if (p.showTopRuler) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = s.color;
        ctx.fillRect(x1, 0, ribbonWidth, 16);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#0b111a';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillText(s.label, x1 + 4, 11);
      }

      // 4. Bottom Canvas Ruler Ribbon Band (Prominently visible at bottom)
      if (p.showBottomRuler) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = s.color;
        ctx.fillRect(x1, chartHeight - 16, ribbonWidth, 16);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#0b111a';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillText(s.label + ' UTC', x1 + 4, chartHeight - 5);
      }
    }

    ctx.restore();
    return true;
  }
};
`;
