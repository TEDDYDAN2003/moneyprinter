import React from "react";

export type MarketDirection = "bullish" | "bearish";
export type StepNumber = 1 | 2 | 3 | 4 | 5;

interface PullbackStepDiagramProps {
  market: MarketDirection;
  step: StepNumber;
}

interface CandleSpec {
  x: number;
  high: number;
  low: number;
  open: number;
  close: number;
  kind: "bull" | "bear";
  muted?: boolean;
}

const BULLISH_CANDLES: CandleSpec[] = [
  // C1: Impulse start
  { x: 42, high: 88, low: 130, open: 122, close: 96, kind: "bull" },
  // C2: Highest bullish candlestick before pullback
  { x: 92, high: 34, low: 102, open: 92, close: 44, kind: "bull" },
  // C3: Initial bearish retracement candle (inside)
  { x: 142, high: 42, low: 95, open: 48, close: 84, kind: "bear" },
  // C4: Pullback candle grabbing C2's low (102 -> sweeps to 118)
  { x: 192, high: 76, low: 118, open: 82, close: 106, kind: "bear" },
  // C5: Continuation impulse breaking C2's high with full body close (34 -> closes at 22)
  { x: 248, high: 16, low: 98, open: 92, close: 22, kind: "bull" },
];

const BEARISH_CANDLES: CandleSpec[] = [
  // C1: Bearish impulse start
  { x: 42, high: 20, low: 62, open: 28, close: 54, kind: "bear" },
  // C2: Lowest bearish candlestick before pullback
  { x: 92, high: 48, low: 116, open: 58, close: 106, kind: "bear" },
  // C3: Initial bullish retracement candle (inside)
  { x: 142, high: 55, low: 108, open: 102, close: 66, kind: "bull" },
  // C4: Pullback candle grabbing C2's high (48 -> sweeps to 32)
  { x: 192, high: 32, low: 74, open: 68, close: 44, kind: "bull" },
  // C5: Continuation impulse breaking C2's low with full body close (116 -> closes at 128)
  { x: 248, high: 52, low: 134, open: 58, close: 128, kind: "bear" },
];

const BULLISH_ASYMMETRY_CANDLES: CandleSpec[] = [
  // Anchor Highest Bullish Candle (High = 46, Low = 104)
  { x: 48, high: 46, low: 104, open: 96, close: 54, kind: "bull" },
  // Grab Side: Body stays inside (68..92), lower wick sweeps below 104 to 122 (VALID GRAB)
  { x: 112, high: 62, low: 122, open: 68, close: 92, kind: "bear" },
  // Fake-out Break: Upper wick pokes above 46 to 24, but body closes below 46 at 56 (INVALID / STOP HUNT)
  { x: 182, high: 24, low: 82, open: 76, close: 56, kind: "bull", muted: true },
  // Confirmed Break: Full candle body closes decisively above 46 at 24 (VALID BREAK)
  { x: 252, high: 16, low: 68, open: 62, close: 24, kind: "bull" },
];

const BEARISH_ASYMMETRY_CANDLES: CandleSpec[] = [
  // Anchor Lowest Bearish Candle (High = 46, Low = 104)
  { x: 48, high: 46, low: 104, open: 54, close: 96, kind: "bear" },
  // Grab Side: Body stays inside (58..82), upper wick sweeps above 46 to 28 (VALID GRAB)
  { x: 112, high: 28, low: 88, open: 82, close: 58, kind: "bull" },
  // Fake-out Break: Lower wick pokes below 104 to 126, but body closes above 104 at 94 (INVALID / STOP HUNT)
  { x: 182, high: 68, low: 126, open: 74, close: 94, kind: "bear", muted: true },
  // Confirmed Break: Full candle body closes decisively below 104 at 126 (VALID BREAK)
  { x: 252, high: 82, low: 134, open: 88, close: 126, kind: "bear" },
];

export function PullbackStepDiagram({
  market,
  step,
}: PullbackStepDiagramProps) {
  const isBull = market === "bullish";

  // Dedicated Step V Diagram: Wick Grab vs Closing Break Asymmetry
  if (step === 5) {
    const asymCandles = isBull
      ? BULLISH_ASYMMETRY_CANDLES
      : BEARISH_ASYMMETRY_CANDLES;

    return (
      <div className="rounded-xl border border-slate-800/90 bg-[#080B10] p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <span>Asymmetry Rule · Step V</span>
          <span className={isBull ? "text-emerald-400" : "text-rose-400"}>
            {isBull ? "Wick Low · Close High" : "Wick High · Close Low"}
          </span>
        </div>

        <svg
          viewBox="0 0 310 155"
          className="w-full h-40 select-none"
          role="img"
          aria-label={`${market} asymmetry rule wick grab vs body close break diagram`}
        >
          {/* Anchor High Reference Line (y = 46) */}
          <line
            x1="34"
            y1="46"
            x2="286"
            y2="46"
            stroke={isBull ? "#10B981" : "#F59E0B"}
            strokeWidth="1.4"
            strokeDasharray="4 3"
          />
          {/* Anchor Low Reference Line (y = 104) */}
          <line
            x1="34"
            y1="104"
            x2="286"
            y2="104"
            stroke={isBull ? "#F59E0B" : "#F43F5E"}
            strokeWidth="1.4"
            strokeDasharray="4 3"
          />

          {/* Anchor Box */}
          <rect
            x="32"
            y="40"
            width="32"
            height="70"
            rx="5"
            fill="rgba(148, 163, 184, 0.06)"
            stroke="#475569"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <text
            x="48"
            y={isBull ? 33 : 124}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="8.5"
            fontFamily="monospace"
          >
            Anchor
          </text>

          {/* Grab Wick Circle (x = 112) */}
          <circle
            cx="112"
            cy={isBull ? 115 : 35}
            r="10"
            fill="rgba(245, 158, 11, 0.16)"
            stroke="#F59E0B"
            strokeWidth="1.2"
          />
          <text
            x="112"
            y={isBull ? 140 : 16}
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            Wick Grab ✓
          </text>

          {/* Fake-out Wick Only Marker (x = 182) */}
          <circle
            cx="182"
            cy={isBull ? 32 : 118}
            r="10"
            fill="rgba(244, 63, 94, 0.12)"
            stroke="#94A3B8"
            strokeDasharray="2 2"
            strokeWidth="1.2"
          />
          <text
            x="182"
            y={isBull ? 15 : 142}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="monospace"
          >
            Wick Only ✗
          </text>

          {/* Confirmed Body Close Break Marker (x = 252) */}
          <circle
            cx="252"
            cy={isBull ? 32 : 118}
            r="12"
            fill={
              isBull ? "rgba(16, 185, 129, 0.18)" : "rgba(244, 63, 94, 0.18)"
            }
            stroke={isBull ? "#34D399" : "#FB7185"}
            strokeWidth="1.3"
          />
          <text
            x="252"
            y={isBull ? 12 : 146}
            textAnchor="middle"
            fill={isBull ? "#34D399" : "#FB7185"}
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            Body Close ✓
          </text>

          {/* Candlesticks */}
          {asymCandles.map((c) => {
            const bodyTop = Math.min(c.open, c.close);
            const bodyHeight = Math.max(Math.abs(c.close - c.open), 4);
            const fill = c.muted
              ? "#475569"
              : c.kind === "bull"
              ? "#10B981"
              : "#F43F5E";
            const stroke = c.muted
              ? "#94A3B8"
              : c.kind === "bull"
              ? "#34D399"
              : "#FB7185";

            return (
              <g key={c.x} opacity={c.muted ? 0.65 : 1}>
                <line
                  x1={c.x}
                  y1={c.high}
                  x2={c.x}
                  y2={c.low}
                  stroke={stroke}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <rect
                  x={c.x - 8}
                  y={bodyTop}
                  width="16"
                  height={bodyHeight}
                  rx="2"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const candles = isBull ? BULLISH_CANDLES : BEARISH_CANDLES;

  return (
    <div className="rounded-xl border border-slate-800/90 bg-[#080B10] p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
        <span>Structure Diagram · Step {["I", "II", "III", "IV"][step - 1]}</span>
        <span className={isBull ? "text-emerald-400" : "text-rose-400"}>
          {isBull ? "Bullish Leg" : "Bearish Leg"}
        </span>
      </div>

      <svg
        viewBox="0 0 310 150"
        className="w-full h-36 select-none"
        role="img"
        aria-label={`${market} pullback step ${step} candlestick diagram`}
      >
        {/* Subtle horizontal grid */}
        {[35, 75, 115].map((y) => (
          <line
            key={y}
            x1="12"
            y1={y}
            x2="298"
            y2={y}
            stroke="#1E293B"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
        ))}

        {/* Anchor Candle Highlight Box (Candle index 1 = x:92) */}
        <rect
          x="74"
          y={isBull ? 26 : 40}
          width="36"
          height={84}
          rx="6"
          fill={isBull ? "rgba(16, 185, 129, 0.08)" : "rgba(244, 63, 94, 0.08)"}
          stroke={isBull ? "#10B981" : "#F43F5E"}
          strokeOpacity={step === 1 ? "0.8" : "0.3"}
          strokeDasharray={step === 1 ? undefined : "3 3"}
          strokeWidth="1.2"
        />

        {/* Step II, III, IV: Marked Liquidity Level (Low of highest bull = 102, High of lowest bear = 48) */}
        {step >= 2 && (
          <>
            <line
              x1="84"
              y1={isBull ? 102 : 48}
              x2="225"
              y2={isBull ? 102 : 48}
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x="229"
              y={isBull ? 105 : 51}
              fill="#FBBF24"
              fontSize="9"
              fontFamily="monospace"
            >
              {isBull ? "Marked Low" : "Marked High"}
            </text>
          </>
        )}

        {/* Step III & IV: Grab / Liquidity Sweep Highlight on Candle 4 (x: 192) */}
        {step >= 3 && (
          <>
            <circle
              cx="192"
              cy={isBull ? 114 : 36}
              r="11"
              fill="rgba(245, 158, 11, 0.16)"
              stroke="#F59E0B"
              strokeWidth="1.2"
            />
            <text
              x="192"
              y={isBull ? 138 : 20}
              textAnchor="middle"
              fill="#FBBF24"
              fontSize="9"
              fontWeight="600"
              fontFamily="monospace"
            >
              {isBull ? "Low Grabbed" : "High Grabbed"}
            </text>
          </>
        )}

        {/* Step IV: Break of Extreme High (Bullish y=34) or Extreme Low (Bearish y=116) */}
        {step === 4 && (
          <>
            <line
              x1="92"
              y1={isBull ? 34 : 116}
              x2="275"
              y2={isBull ? 34 : 116}
              stroke={isBull ? "#10B981" : "#F43F5E"}
              strokeWidth="1.6"
              strokeDasharray="4 3"
            />
            <circle
              cx="248"
              cy={isBull ? 26 : 124}
              r="11"
              fill={
                isBull
                  ? "rgba(16, 185, 129, 0.18)"
                  : "rgba(244, 63, 94, 0.18)"
              }
              stroke={isBull ? "#34D399" : "#FB7185"}
              strokeWidth="1.3"
            />
            <text
              x="248"
              y={isBull ? 11 : 146}
              textAnchor="middle"
              fill={isBull ? "#34D399" : "#FB7185"}
              fontSize="9"
              fontWeight="700"
              fontFamily="monospace"
            >
              {isBull ? "High Closed ✓" : "Low Closed ✓"}
            </text>
          </>
        )}

        {/* Render Candlesticks */}
        {candles.map((c, idx) => {
          const isFuture =
            (step <= 2 && idx >= 3) || (step === 3 && idx === 4);
          const bodyTop = Math.min(c.open, c.close);
          const bodyHeight = Math.max(Math.abs(c.close - c.open), 4);
          const fill = c.kind === "bull" ? "#10B981" : "#F43F5E";
          const stroke = c.kind === "bull" ? "#34D399" : "#FB7185";

          return (
            <g key={c.x} opacity={isFuture ? 0.25 : 1}>
              {/* Wick */}
              <line
                x1={c.x}
                y1={c.high}
                x2={c.x}
                y2={c.low}
                stroke={stroke}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {/* Body */}
              <rect
                x={c.x - 8}
                y={bodyTop}
                width="16"
                height={bodyHeight}
                rx="2"
                fill={fill}
                stroke={stroke}
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* Step I Callout Label */}
        {step === 1 && (
          <text
            x="92"
            y={isBull ? 18 : 138}
            textAnchor="middle"
            fill={isBull ? "#34D399" : "#FB7185"}
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
          >
            {isBull ? "Highest Bullish" : "Lowest Bearish"}
          </text>
        )}
      </svg>
    </div>
  );
}
