import React from "react";

export type MarketDirection = "bullish" | "bearish";
export type StepNumber = 1 | 2 | 3 | 4;

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
  // C5: Continuation impulse breaking C2's high (34 -> breaks to 16)
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
  // C5: Continuation impulse breaking C2's low (116 -> breaks to 134)
  { x: 248, high: 52, low: 134, open: 58, close: 128, kind: "bear" },
];

export function PullbackStepDiagram({
  market,
  step,
}: PullbackStepDiagramProps) {
  const isBull = market === "bullish";
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
              {isBull ? "High Broken ✓" : "Low Broken ✓"}
            </text>
          </>
        )}

        {/* Render Candlesticks */}
        {candles.map((c, idx) => {
          // Dim future candles slightly on earlier steps so focus is unmistakable
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
