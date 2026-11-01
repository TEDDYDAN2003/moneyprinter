"use client";

import React from "react";

export type LiquidityDirection = "bullish" | "bearish";

export type LiquidityDiagramKind =
  | "forms_of_liquidity"
  | "order_flow_bos_choch"
  | "irl_to_erl_fuel_cycle"
  | "liquidity_run_validation"
  | "liquidity_sweep_reversal"
  | "top_down_silver_bullet";

interface LiquiditySweepDiagramProps {
  kind: LiquidityDiagramKind;
  direction?: LiquidityDirection;
}

interface CandleSpec {
  x: number; // Center X of candle
  open: number; // SVG Y (smaller Y = higher price)
  close: number; // SVG Y
  high: number; // SVG Y (upper wick tip)
  low: number; // SVG Y (lower wick tip)
  width?: number;
  highlight?: boolean;
}

function OhlcCandles({
  candles,
  defaultWidth = 9,
}: {
  candles: CandleSpec[];
  defaultWidth?: number;
}) {
  return (
    <g>
      {candles.map((c, idx) => {
        const w = c.width ?? defaultWidth;
        // Smaller Y in SVG = higher price -> bullish candle
        const isBull = c.close <= c.open;
        const bodyTop = Math.min(c.open, c.close);
        const bodyBottom = Math.max(c.open, c.close);
        const bodyHeight = Math.max(2.5, bodyBottom - bodyTop);
        const wickTop = Math.min(c.high, bodyTop);
        const wickBottom = Math.max(c.low, bodyBottom);

        const fill = isBull ? "#10b981" : "#f43f5e";
        const stroke = c.highlight
          ? "#fbbf24"
          : isBull
          ? "#34d399"
          : "#fb7185";

        return (
          <g key={idx}>
            {/* Upper & Lower Wick */}
            <line
              x1={c.x}
              y1={wickTop}
              x2={c.x}
              y2={wickBottom}
              stroke={stroke}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Candle Body */}
            <rect
              x={c.x - w / 2}
              y={bodyTop}
              width={w}
              height={bodyHeight}
              rx={1.5}
              fill={fill}
              stroke={c.highlight ? "#fbbf24" : stroke}
              strokeWidth={c.highlight ? 1.4 : 0.6}
            />
          </g>
        );
      })}
    </g>
  );
}

export function LiquiditySweepDiagram({
  kind,
  direction = "bullish",
}: LiquiditySweepDiagramProps) {
  const isBull = direction === "bullish";

  // ==========================================================================
  // 1. STEP 1: EXTERNAL RANGE LIQUIDITY (ERL) vs INTERNAL RANGE LIQUIDITY (IRL)
  // ==========================================================================
  if (kind === "forms_of_liquidity") {
    const bullCandles: CandleSpec[] = [
      // Swing Low (SSL @ y=190) -> Impulse Up creating 3-candle Bullish FVG (y=124..146) -> Swing High (BSL @ y=68)
      { x: 68, open: 162, close: 182, high: 158, low: 190 },
      { x: 94, open: 182, close: 154, high: 146, low: 186 }, // FVG C1 (high=146)
      { x: 122, open: 154, close: 108, high: 104, low: 156, width: 11 }, // FVG C2 (displacement)
      { x: 150, open: 108, close: 84, high: 78, low: 124 }, // FVG C3 (low=124 -> Gap 124..146!)
      { x: 178, open: 84, close: 72, high: 68, low: 88 }, // Swing High BSL (high=68)
      // Pullback into IRL (Bullish FVG 124..146)
      { x: 210, open: 72, close: 96, high: 70, low: 102 },
      { x: 240, open: 96, close: 118, high: 93, low: 123 },
      { x: 270, open: 118, close: 132, high: 115, low: 142, highlight: true }, // Taps FVG + rejection wick!
      { x: 300, open: 132, close: 106, high: 101, low: 138 },
      // Expansion fueled by IRL attacking BSL (y=68)
      { x: 332, open: 106, close: 82, high: 78, low: 110 },
      { x: 364, open: 82, close: 56, high: 48, low: 85, width: 11 }, // Breaks BSL!
      { x: 396, open: 56, close: 44, high: 40, low: 60 },
    ];

    const bearCandles: CandleSpec[] = [
      // Swing High (BSL @ y=62) -> Bearish Impulse creating 3-candle Bearish FVG (y=106..128) -> Swing Low (SSL @ y=184)
      { x: 68, open: 88, close: 68, high: 62, low: 92 },
      { x: 94, open: 68, close: 98, high: 65, low: 106 }, // FVG C1 (low=106)
      { x: 122, open: 98, close: 144, high: 95, low: 148, width: 11 }, // FVG C2 (bearish displacement)
      { x: 150, open: 144, close: 168, high: 128, low: 174 }, // FVG C3 (high=128 -> Gap 106..128!)
      { x: 178, open: 168, close: 178, high: 164, low: 184 }, // Swing Low SSL (low=184)
      // Pullback up into Bearish IRL (FVG 106..128)
      { x: 210, open: 178, close: 154, high: 149, low: 180 },
      { x: 240, open: 154, close: 134, high: 130, low: 158 },
      { x: 270, open: 134, close: 120, high: 110, low: 136, highlight: true }, // Taps Bearish FVG + upper wick!
      { x: 300, open: 120, close: 146, high: 116, low: 150 },
      // Expansion fueled by IRL attacking SSL (y=184)
      { x: 332, open: 146, close: 172, high: 143, low: 176 },
      { x: 364, open: 172, close: 196, high: 168, low: 204, width: 11 }, // Breaks SSL!
      { x: 396, open: 196, close: 206, high: 192, low: 212 },
    ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 240"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 1 Candlestick Diagram: External vs Internal Range Liquidity (${direction})`}
        >
          <rect
            x="10"
            y="10"
            width="720"
            height="220"
            rx="12"
            fill="#0B1018"
            stroke="#1e293b"
          />

          <text
            x="26"
            y="31"
            fill={isBull ? "#6ee7b7" : "#fda4af"}
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "BULLISH CANDLESTICK ANATOMY: IRL (3-CANDLE BULLISH FVG) FUELS ATTACK ON BSL"
              : "BEARISH CANDLESTICK ANATOMY: IRL (3-CANDLE BEARISH FVG) FUELS ATTACK ON SSL"}
          </text>

          {isBull ? (
            <>
              {/* BSL Line at Swing High y=68 */}
              <line
                x1="178"
                y1="68"
                x2="430"
                y2="68"
                stroke="#10b981"
                strokeWidth="1.6"
                strokeDasharray="6 4"
              />
              <text
                x="184"
                y="60"
                fill="#34d399"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                $$$ BSL · External Range Liquidity (Swing High)
              </text>

              {/* SSL Line at Swing Low y=190 */}
              <line
                x1="54"
                y1="190"
                x2="340"
                y2="190"
                stroke="#f43f5e"
                strokeWidth="1.4"
                strokeDasharray="5 4"
              />
              <text
                x="56"
                y="206"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
              >
                $$$ SSL · External Range Liquidity (Swing Low)
              </text>

              {/* Exact 3-Candle Bullish FVG Shaded Zone (y=124..146) */}
              <rect
                x="94"
                y="124"
                width="260"
                height="22"
                rx="3"
                fill="#10b981"
                fillOpacity="0.18"
                stroke="#10b981"
                strokeOpacity="0.6"
              />
              <text
                x="284"
                y="138"
                fill="#6ee7b7"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                IRL (Bullish FVG)
              </text>

              <OhlcCandles candles={bullCandles} defaultWidth={10} />
            </>
          ) : (
            <>
              {/* BSL Line at Swing High y=62 */}
              <line
                x1="54"
                y1="62"
                x2="340"
                y2="62"
                stroke="#10b981"
                strokeWidth="1.4"
                strokeDasharray="5 4"
              />
              <text
                x="56"
                y="54"
                fill="#6ee7b7"
                fontSize="9.5"
                fontFamily="monospace"
              >
                $$$ BSL · External Range Liquidity (Swing High)
              </text>

              {/* SSL Line at Swing Low y=184 */}
              <line
                x1="178"
                y1="184"
                x2="430"
                y2="184"
                stroke="#f43f5e"
                strokeWidth="1.6"
                strokeDasharray="6 4"
              />
              <text
                x="184"
                y="198"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                $$$ SSL · External Range Liquidity (Swing Low)
              </text>

              {/* Exact 3-Candle Bearish FVG Shaded Zone (y=106..128) */}
              <rect
                x="94"
                y="106"
                width="260"
                height="22"
                rx="3"
                fill="#f43f5e"
                fillOpacity="0.18"
                stroke="#f43f5e"
                strokeOpacity="0.6"
              />
              <text
                x="284"
                y="120"
                fill="#fda4af"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                IRL (Bearish FVG)
              </text>

              <OhlcCandles candles={bearCandles} defaultWidth={10} />
            </>
          )}

          {/* Right Legend / Callout Card inside SVG */}
          <rect
            x="456"
            y="46"
            width="256"
            height="168"
            rx="10"
            fill="#080C12"
            stroke="#1e293b"
          />
          <text
            x="472"
            y="70"
            fill="#f8fafc"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            HOW CANDLES REVEAL LIQUIDITY:
          </text>
          <text
            x="472"
            y="94"
            fill="#6ee7b7"
            fontSize="9.5"
            fontFamily="monospace"
          >
            1. ERL (Swing High / Swing Low):
          </text>
          <text
            x="472"
            y="110"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            Stop-losses + unfilled breakout
          </text>
          <text
            x="472"
            y="123"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            orders resting beyond wicks.
          </text>
          <text
            x="472"
            y="148"
            fill="#38bdf8"
            fontSize="9.5"
            fontFamily="monospace"
          >
            2. IRL (3-Candle FVG Gap):
          </text>
          <text
            x="472"
            y="164"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            Unmitigated gap between C1 &amp; C3
          </text>
          <text
            x="472"
            y="177"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            wicks — acts as FUEL to attack
          </text>
          <text
            x="472"
            y="190"
            fill="#fcd34d"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull ? "upper BSL (Swing High)!" : "lower SSL (Swing Low)!"}
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 2. STEP 2: ORDER FLOW VIA BOS (CONTINUATION) & CHoCH (REVERSAL SIGNAL)
  // ==========================================================================
  if (kind === "order_flow_bos_choch") {
    // Left Panel Candlesticks: Active Order Flow
    const leftCandles: CandleSpec[] = isBull
      ? [
          { x: 34, open: 172, close: 146, high: 142, low: 176 },
          { x: 56, open: 146, close: 112, high: 106, low: 150 }, // Swing High 1 @ 106
          { x: 78, open: 112, close: 132, high: 110, low: 138 },
          { x: 100, open: 132, close: 144, high: 129, low: 148 }, // Swing Low (SSL/CHoCH @ 148)
          { x: 122, open: 144, close: 116, high: 112, low: 146 },
          { x: 144, open: 116, close: 88, high: 84, low: 120 }, // Breaks 106 -> BOS #1!
          { x: 166, open: 88, close: 74, high: 68, low: 92 }, // Swing High 2 (BSL/BOS @ 68)
          { x: 188, open: 74, close: 96, high: 72, low: 100 },
          { x: 210, open: 96, close: 114, high: 94, low: 118 }, // Higher Low (New CHoCH @ 118)
          { x: 232, open: 114, close: 90, high: 86, low: 116 },
          { x: 254, open: 90, close: 62, high: 56, low: 94, highlight: true }, // Breaks 68 -> BOS #2!
          { x: 276, open: 62, close: 48, high: 44, low: 66 },
        ]
      : [
          { x: 34, open: 54, close: 80, high: 50, low: 84 },
          { x: 56, open: 80, close: 114, high: 76, low: 120 }, // Swing Low 1 @ 120
          { x: 78, open: 114, close: 94, high: 90, low: 116 },
          { x: 100, open: 94, close: 82, high: 78, low: 97 }, // Swing High (BSL/CHoCH @ 78)
          { x: 122, open: 82, close: 110, high: 80, low: 114 },
          { x: 144, open: 110, close: 138, high: 106, low: 142 }, // Breaks 120 -> BOS #1!
          { x: 166, open: 138, close: 152, high: 134, low: 158 }, // Swing Low 2 (SSL/BOS @ 158)
          { x: 188, open: 152, close: 130, high: 126, low: 154 },
          { x: 210, open: 130, close: 112, high: 108, low: 132 }, // Lower High (New CHoCH @ 108)
          { x: 232, open: 112, close: 136, high: 110, low: 140 },
          { x: 254, open: 136, close: 164, high: 132, low: 170, highlight: true }, // Breaks 158 -> BOS #2!
          { x: 276, open: 164, close: 178, high: 160, low: 182 },
        ];

    // Right Panel Candlesticks: CHoCH + New BOS Confirmation
    const rightCandles: CandleSpec[] = isBull
      ? [
          { x: 404, open: 68, close: 108, high: 64, low: 114 },
          { x: 428, open: 108, close: 134, high: 104, low: 138 },
          { x: 452, open: 134, close: 104, high: 98, low: 136 }, // Prior LH @ 98
          { x: 476, open: 104, close: 148, high: 102, low: 154 },
          { x: 500, open: 148, close: 162, high: 144, low: 168 }, // LL
          { x: 524, open: 162, close: 124, high: 120, low: 164 },
          { x: 548, open: 124, close: 84, high: 78, low: 128, highlight: true }, // Breaks 98 -> 1. CHoCH! (High @ 78)
          { x: 572, open: 84, close: 108, high: 82, low: 112 },
          { x: 596, open: 108, close: 120, high: 105, low: 124 }, // Pullback HL
          { x: 620, open: 120, close: 92, high: 88, low: 122 },
          { x: 644, open: 92, close: 64, high: 58, low: 95, highlight: true }, // Breaks 78 -> 2. New BOS Confirms!
          { x: 668, open: 64, close: 50, high: 46, low: 68 },
        ]
      : [
          { x: 404, open: 156, close: 118, high: 112, low: 160 },
          { x: 428, open: 118, close: 92, high: 88, low: 122 },
          { x: 452, open: 92, close: 122, high: 90, low: 128 }, // Prior HL @ 128
          { x: 476, open: 122, close: 78, high: 72, low: 124 },
          { x: 500, open: 78, close: 64, high: 58, low: 82 }, // HH
          { x: 524, open: 64, close: 102, high: 62, low: 106 },
          { x: 548, open: 102, close: 142, high: 100, low: 148, highlight: true }, // Breaks 128 -> 1. CHoCH! (Low @ 148)
          { x: 572, open: 142, close: 118, high: 114, low: 144 },
          { x: 596, open: 118, close: 106, high: 102, low: 120 }, // Pullback LH
          { x: 620, open: 106, close: 134, high: 104, low: 138 },
          { x: 644, open: 134, close: 162, high: 130, low: 168, highlight: true }, // Breaks 148 -> 2. New BOS Confirms!
          { x: 668, open: 162, close: 176, high: 158, low: 180 },
        ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 235"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 2 Candlestick Diagram: Order Flow BOS and CHoCH (${direction})`}
        >
          {/* Left Panel */}
          <rect
            x="10"
            y="10"
            width="352"
            height="215"
            rx="10"
            fill="#0B1018"
            stroke={isBull ? "#10b981" : "#f43f5e"}
            strokeOpacity="0.4"
          />
          <text
            x="22"
            y="30"
            fill={isBull ? "#6ee7b7" : "#fda4af"}
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "BULLISH ORDER FLOW (BSL = BOS · SSL = CHoCH)"
              : "BEARISH ORDER FLOW (SSL = BOS · BSL = CHoCH)"}
          </text>

          {isBull ? (
            <>
              <line
                x1="56"
                y1="106"
                x2="152"
                y2="106"
                stroke="#10b981"
                strokeDasharray="4 3"
              />
              <line
                x1="166"
                y1="68"
                x2="340"
                y2="68"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="278"
                y="62"
                fill="#34d399"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                BSL (BOS)
              </text>
              <line
                x1="210"
                y1="118"
                x2="340"
                y2="118"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <text
                x="266"
                y="130"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
              >
                SSL (CHoCH)
              </text>
            </>
          ) : (
            <>
              <line
                x1="56"
                y1="120"
                x2="152"
                y2="120"
                stroke="#f43f5e"
                strokeDasharray="4 3"
              />
              <line
                x1="166"
                y1="158"
                x2="340"
                y2="158"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="278"
                y="170"
                fill="#fda4af"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                SSL (BOS)
              </text>
              <line
                x1="210"
                y1="108"
                x2="340"
                y2="108"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <text
                x="266"
                y="101"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
              >
                BSL (CHoCH)
              </text>
            </>
          )}

          <OhlcCandles candles={leftCandles} defaultWidth={8.5} />

          <text
            x="22"
            y="206"
            fill="#94a3b8"
            fontSize="9.2"
            fontFamily="monospace"
          >
            {isBull
              ? "Candles closing above BSL confirm Bullish BOS"
              : "Candles closing below SSL confirm Bearish BOS"}
          </text>

          {/* Right Panel */}
          <rect
            x="378"
            y="10"
            width="352"
            height="215"
            rx="10"
            fill="#0B1018"
            stroke="#f59e0b"
            strokeOpacity="0.4"
          />
          <text
            x="390"
            y="30"
            fill="#fcd34d"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CHoCH ALONE ≠ FLIP — WAIT FOR NEW BOS CLOSE!
          </text>

          {isBull ? (
            <>
              <line
                x1="452"
                y1="98"
                x2="560"
                y2="98"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <text
                x="456"
                y="91"
                fill="#fcd34d"
                fontSize="8.5"
                fontFamily="monospace"
              >
                1. CHoCH
              </text>
              <line
                x1="548"
                y1="78"
                x2="710"
                y2="78"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="652"
                y="72"
                fill="#6ee7b7"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                2. New BOS!
              </text>
            </>
          ) : (
            <>
              <line
                x1="452"
                y1="128"
                x2="560"
                y2="128"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <text
                x="456"
                y="140"
                fill="#fcd34d"
                fontSize="8.5"
                fontFamily="monospace"
              >
                1. CHoCH
              </text>
              <line
                x1="548"
                y1="148"
                x2="710"
                y2="148"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="652"
                y="160"
                fill="#fda4af"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                2. New BOS!
              </text>
            </>
          )}

          <OhlcCandles candles={rightCandles} defaultWidth={8.5} />

          <text
            x="390"
            y="206"
            fill="#94a3b8"
            fontSize="9.2"
            fontFamily="monospace"
          >
            Wait for candle close past New BOS to flip bias!
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 3. STEP 3: IRL -> ERL FUEL CYCLE vs IRL DISRESPECTED WARNING
  // ==========================================================================
  if (kind === "irl_to_erl_fuel_cycle") {
    const healthyCandles: CandleSpec[] = isBull
      ? [
          { x: 36, open: 174, close: 152, high: 144, low: 178 }, // C1 (high=144)
          { x: 62, open: 152, close: 112, high: 108, low: 155, width: 10 }, // C2
          { x: 88, open: 112, close: 94, high: 88, low: 126 }, // C3 (low=126 -> FVG #1 126..144)
          { x: 114, open: 94, close: 116, high: 92, low: 120 },
          { x: 140, open: 116, close: 130, high: 114, low: 138, highlight: true }, // Wick taps FVG #1!
          { x: 166, open: 130, close: 106, high: 100, low: 134 }, // C1 (high=100)
          { x: 192, open: 106, close: 72, high: 68, low: 108, width: 10 }, // Breaks 88 BSL + C2
          { x: 218, open: 72, close: 58, high: 52, low: 84 }, // C3 (low=84 -> FVG #2 84..100)
          { x: 244, open: 58, close: 78, high: 56, low: 82 },
          { x: 270, open: 78, close: 88, high: 76, low: 96, highlight: true }, // Wick taps FVG #2!
          { x: 296, open: 88, close: 62, high: 56, low: 90 },
          { x: 322, open: 62, close: 42, high: 38, low: 66, width: 10 }, // Breaks 52 BSL!
        ]
      : [
          { x: 36, open: 50, close: 72, high: 46, low: 80 }, // C1 (low=80)
          { x: 62, open: 72, close: 112, high: 69, low: 116, width: 10 }, // C2
          { x: 88, open: 112, close: 130, high: 98, low: 136 }, // C3 (high=98 -> Bear FVG #1 80..98)
          { x: 114, open: 130, close: 108, high: 104, low: 132 },
          { x: 140, open: 108, close: 94, high: 86, low: 110, highlight: true }, // Wick taps FVG #1!
          { x: 166, open: 94, close: 118, high: 90, low: 124 }, // C1 (low=124)
          { x: 192, open: 118, close: 152, high: 116, low: 156, width: 10 }, // Breaks 136 SSL + C2
          { x: 218, open: 152, close: 166, high: 140, low: 172 }, // C3 (high=140 -> Bear FVG #2 124..140)
          { x: 244, open: 166, close: 146, high: 142, low: 168 },
          { x: 270, open: 146, close: 136, high: 128, low: 148, highlight: true }, // Wick taps FVG #2!
          { x: 296, open: 136, close: 162, high: 134, low: 168 },
          { x: 322, open: 162, close: 182, high: 158, low: 186, width: 10 }, // Breaks 172 SSL!
        ];

    const disrespectedCandles: CandleSpec[] = isBull
      ? [
          { x: 404, open: 162, close: 142, high: 136, low: 166 }, // Swing low @ 166 (CHoCH) & C1 (high=136)
          { x: 434, open: 142, close: 96, high: 92, low: 145, width: 11 }, // C2
          { x: 464, open: 96, close: 74, high: 66, low: 114 }, // C3 (low=114 -> Bull FVG 114..136)
          { x: 494, open: 74, close: 98, high: 70, low: 104 },
          { x: 524, open: 98, close: 124, high: 95, low: 128 },
          { x: 554, open: 124, close: 152, high: 120, low: 156, width: 11, highlight: true }, // Slices & closes BELOW Bull FVG!
          { x: 584, open: 152, close: 140, high: 136, low: 154 },
          { x: 614, open: 140, close: 168, high: 138, low: 174 }, // Attacks CHoCH @ 166!
          { x: 644, open: 168, close: 182, high: 164, low: 186 },
        ]
      : [
          { x: 404, open: 62, close: 82, high: 58, low: 88 }, // Swing high @ 58 (CHoCH) & C1 (low=88)
          { x: 434, open: 82, close: 128, high: 79, low: 132, width: 11 }, // C2
          { x: 464, open: 128, close: 150, high: 110, low: 158 }, // C3 (high=110 -> Bear FVG 88..110)
          { x: 494, open: 150, close: 126, high: 120, low: 154 },
          { x: 524, open: 126, close: 100, high: 96, low: 128 },
          { x: 554, open: 100, close: 72, high: 68, low: 104, width: 11, highlight: true }, // Slices & closes ABOVE Bear FVG!
          { x: 584, open: 72, close: 84, high: 70, low: 88 },
          { x: 614, open: 84, close: 56, high: 50, low: 86 }, // Attacks CHoCH @ 58!
          { x: 644, open: 56, close: 44, high: 40, low: 60 },
        ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 235"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 3 Candlestick Diagram: IRL to ERL Fuel Cycle (${direction})`}
        >
          {/* Left Panel: Healthy IRL -> ERL Cycle */}
          <rect
            x="10"
            y="10"
            width="352"
            height="215"
            rx="10"
            fill="#0B1018"
            stroke="#10b981"
            strokeOpacity="0.4"
          />
          <text
            x="22"
            y="30"
            fill="#6ee7b7"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "✓ BULLISH FVG RESPECTED → RUNS BSL"
              : "✓ BEARISH FVG RESPECTED → RUNS SSL"}
          </text>

          {isBull ? (
            <>
              <rect
                x="36"
                y="126"
                width="120"
                height="18"
                rx="3"
                fill="#10b981"
                fillOpacity="0.18"
                stroke="#10b981"
              />
              <rect
                x="166"
                y="84"
                width="120"
                height="16"
                rx="3"
                fill="#10b981"
                fillOpacity="0.18"
                stroke="#10b981"
              />
            </>
          ) : (
            <>
              <rect
                x="36"
                y="80"
                width="120"
                height="18"
                rx="3"
                fill="#f43f5e"
                fillOpacity="0.18"
                stroke="#f43f5e"
              />
              <rect
                x="166"
                y="124"
                width="120"
                height="16"
                rx="3"
                fill="#f43f5e"
                fillOpacity="0.18"
                stroke="#f43f5e"
              />
            </>
          )}

          <OhlcCandles candles={healthyCandles} defaultWidth={8.5} />
          <text
            x="22"
            y="208"
            fill="#94a3b8"
            fontSize="9.2"
            fontFamily="monospace"
          >
            Wicks respect IRL (FVG) → Candles expand through ERL
          </text>

          {/* Right Panel: IRL Disrespected */}
          <rect
            x="378"
            y="10"
            width="352"
            height="215"
            rx="10"
            fill="#0B1018"
            stroke="#f59e0b"
            strokeOpacity="0.45"
          />
          <text
            x="390"
            y="30"
            fill="#fcd34d"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ⚠ FVG DISRESPECTED → CANDLES ATTACK CHoCH!
          </text>

          {isBull ? (
            <>
              <rect
                x="404"
                y="114"
                width="180"
                height="22"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.16"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <line
                x1="404"
                y1="166"
                x2="700"
                y2="166"
                stroke="#f43f5e"
                strokeDasharray="5 3"
              />
              <text
                x="604"
                y="160"
                fill="#fda4af"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                CHoCH Broken!
              </text>
            </>
          ) : (
            <>
              <rect
                x="404"
                y="88"
                width="180"
                height="22"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.16"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <line
                x1="404"
                y1="58"
                x2="700"
                y2="58"
                stroke="#10b981"
                strokeDasharray="5 3"
              />
              <text
                x="604"
                y="52"
                fill="#6ee7b7"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                CHoCH Broken!
              </text>
            </>
          )}

          <OhlcCandles candles={disrespectedCandles} defaultWidth={9.5} />
          <text
            x="390"
            y="208"
            fill="#fcd34d"
            fontSize="9.2"
            fontFamily="monospace"
          >
            Full body slices FVG = 1st sign of CHoCH reversal!
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 4. STEP 4A: LIQUIDITY RUN VALIDATION (ALL OHLC CANDLESTICKS)
  // ==========================================================================
  if (kind === "liquidity_run_validation") {
    const validRunCandles: CandleSpec[] = isBull
      ? [
          // Prior Swing High @ y=118 (BSL) -> Breakout + Follow-through creating FVG OVERLAPPING BSL (y=98..122) -> Retracement & Continuation
          { x: 44, open: 146, close: 122, high: 118, low: 150 }, // Prior BSL High @ 118
          { x: 70, open: 122, close: 152, high: 120, low: 158 },
          { x: 96, open: 152, close: 130, high: 122, low: 155 }, // FVG C1 (high=122)
          { x: 126, open: 130, close: 88, high: 84, low: 134, width: 11, highlight: true }, // FVG C2 closes ABOVE BSL 118!
          { x: 156, open: 88, close: 66, high: 60, low: 98, width: 10 }, // FVG C3 (low=98 -> Gap 98..122 overlaps BSL 118!)
          { x: 186, open: 66, close: 84, high: 64, low: 88 },
          { x: 216, open: 84, close: 102, high: 82, low: 110 }, // Retraces into overlapping FVG
          { x: 246, open: 102, close: 82, high: 78, low: 108 }, // Bounces off FVG support!
          { x: 276, open: 82, close: 56, high: 50, low: 86, width: 10 },
          { x: 306, open: 56, close: 44, high: 40, low: 60 },
        ]
      : [
          // Prior Swing Low @ y=118 (SSL) -> Breakdown + Follow-through creating Bearish FVG OVERLAPPING SSL (y=114..138)
          { x: 44, open: 90, close: 114, high: 86, low: 118 }, // Prior SSL Low @ 118
          { x: 70, open: 114, close: 84, high: 78, low: 116 },
          { x: 96, open: 84, close: 106, high: 80, low: 114 }, // FVG C1 (low=114)
          { x: 126, open: 106, close: 148, high: 102, low: 152, width: 11, highlight: true }, // FVG C2 closes BELOW SSL 118!
          { x: 156, open: 148, close: 170, high: 138, low: 176, width: 10 }, // FVG C3 (high=138 -> Gap 114..138 overlaps SSL 118!)
          { x: 186, open: 170, close: 152, high: 148, low: 172 },
          { x: 216, open: 152, close: 134, high: 126, low: 154 }, // Retraces up into Bearish FVG
          { x: 246, open: 134, close: 154, high: 128, low: 158 }, // Rejects Bearish FVG!
          { x: 276, open: 154, close: 180, high: 150, low: 186, width: 10 },
          { x: 306, open: 180, close: 192, high: 176, low: 196 },
        ];

    const invalidRunCandles: CandleSpec[] = isBull
      ? [
          // FVG formed BEFORE (below) BSL y=104; breakout candle closes above 104 WITHOUT creating post-breakout FVG -> gets rejected!
          { x: 412, open: 136, close: 108, high: 104, low: 140 }, // Prior BSL @ 104
          { x: 440, open: 108, close: 166, high: 106, low: 172 },
          { x: 468, open: 166, close: 152, high: 148, low: 170 }, // Pre-breakout FVG C1 (high=148)
          { x: 498, open: 152, close: 118, high: 114, low: 155, width: 11 }, // C2
          { x: 528, open: 118, close: 94, high: 90, low: 128, highlight: true }, // Closes above 104, BUT FVG (128..148) is BELOW 104!
          { x: 558, open: 94, close: 108, high: 91, low: 114 }, // No post-breakout FVG formed!
          { x: 588, open: 108, close: 138, high: 105, low: 142 },
          { x: 618, open: 138, close: 162, high: 134, low: 168 }, // Slices straight through pre-breakout FVG!
        ]
      : [
          // Bearish FVG formed ABOVE SSL y=132; breakdown candle closes below 132 WITHOUT post-breakdown FVG
          { x: 412, open: 100, close: 128, high: 96, low: 132 }, // Prior SSL @ 132
          { x: 440, open: 128, close: 70, high: 64, low: 130 },
          { x: 468, open: 70, close: 84, high: 66, low: 88 }, // Pre-breakdown FVG C1 (low=88)
          { x: 498, open: 84, close: 118, high: 81, low: 122, width: 11 }, // C2
          { x: 528, open: 118, close: 142, high: 108, low: 146, highlight: true }, // Closes below 132, BUT FVG (88..108) is ABOVE 132!
          { x: 558, open: 142, close: 128, high: 122, low: 145 },
          { x: 588, open: 128, close: 98, high: 94, low: 131 },
          { x: 618, open: 98, close: 74, high: 68, low: 102 }, // Slices straight through pre-breakdown FVG!
        ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 240"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 4A Candlestick Diagram: Valid Liquidity Run vs Unconfirmed Breakout (${direction})`}
        >
          {/* Left Panel: Valid Liquidity Run */}
          <rect
            x="10"
            y="10"
            width="352"
            height="220"
            rx="10"
            fill="#0B1018"
            stroke="#10b981"
            strokeOpacity="0.45"
          />
          <text
            x="22"
            y="30"
            fill="#6ee7b7"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "✓ VALID RUN: FVG OVERLAPS / ABOVE BSL"
              : "✓ VALID RUN: FVG OVERLAPS / BELOW SSL"}
          </text>

          <line
            x1="34"
            y1="118"
            x2="342"
            y2="118"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <rect
            x="96"
            y={isBull ? 98 : 114}
            width="178"
            height="24"
            rx="3"
            fill={isBull ? "#10b981" : "#f43f5e"}
            fillOpacity="0.22"
            stroke={isBull ? "#10b981" : "#f43f5e"}
          />

          <OhlcCandles candles={validRunCandles} defaultWidth={9} />

          <text
            x="22"
            y="212"
            fill="#6ee7b7"
            fontSize="9.2"
            fontFamily="monospace"
          >
            {isBull
              ? "3-candle FVG created DURING/ABOVE BSL holds pullback!"
              : "3-candle FVG created DURING/BELOW SSL holds pullback!"}
          </text>

          {/* Right Panel: Invalid Run (Pre-breakout FVG) */}
          <rect
            x="378"
            y="10"
            width="352"
            height="220"
            rx="10"
            fill="#0B1018"
            stroke="#f43f5e"
            strokeOpacity="0.4"
          />
          <text
            x="390"
            y="30"
            fill="#fda4af"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "✗ NOT A RUN: FVG FORMED BELOW BSL"
              : "✗ NOT A RUN: FVG FORMED ABOVE SSL"}
          </text>

          <line
            x1="402"
            y1={isBull ? 104 : 132}
            x2="710"
            y2={isBull ? 104 : 132}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <rect
            x="468"
            y={isBull ? 128 : 88}
            width="175"
            height="20"
            rx="3"
            fill="#f59e0b"
            fillOpacity="0.16"
            stroke="#f59e0b"
            strokeDasharray="4 3"
          />

          <OhlcCandles candles={invalidRunCandles} defaultWidth={9.5} />

          <text
            x="390"
            y="212"
            fill="#fda4af"
            fontSize="9.2"
            fontFamily="monospace"
          >
            Pre-breakout FVG fails &amp; turns into a Sweep!
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 5. STEP 4B: LIQUIDITY SWEEP REVERSAL (FULL CANDLESTICK ANATOMY)
  // ==========================================================================
  if (kind === "liquidity_sweep_reversal") {
    const bullSweepCandles: CandleSpec[] = [
      // Prior Swing Low SSL @ y=178 -> Bounce to Swing High CHoCH @ y=114 -> Drop leaving Bearish FVG (138..154) -> WICK SWEEP of 178 (low=202, close=172!) -> Disrespects Bearish FVG -> Breaks CHoCH 114 (High @ 84) -> Leaves Bullish FVG (108..126) -> Taps Bullish FVG -> Breaks 84 (BOS!)
      { x: 52, open: 132, close: 170, high: 128, low: 178 }, // Prior Swing Low SSL @ 178
      { x: 82, open: 170, close: 138, high: 134, low: 173 },
      { x: 112, open: 138, close: 120, high: 114, low: 142 }, // Prior Swing High (CHoCH @ 114) & Bear FVG C1 (low=138)
      { x: 142, open: 120, close: 160, high: 118, low: 164, width: 11 }, // Bear FVG C2
      { x: 172, open: 160, close: 172, high: 154, low: 202, width: 11, highlight: true }, // SSL SWEEP CANDLE: Wick raids 202, closes at 172 (above 178)!
      { x: 204, open: 172, close: 130, high: 126, low: 175, width: 11 }, // Signal 1: Slices Bearish FVG (138..154)!
      { x: 236, open: 130, close: 98, high: 94, low: 134, width: 11 }, // Signal 2: Closes above CHoCH 114!
      { x: 268, open: 98, close: 128, high: 96, low: 132 }, // Pullback & Bull FVG C1 (high=126)
      { x: 300, open: 128, close: 90, high: 84, low: 130, width: 11 }, // Bull FVG C2 (Swing High @ 84)
      { x: 332, open: 90, close: 78, high: 74, low: 108 }, // Bull FVG C3 (low=108 -> Bull FVG 108..126)
      { x: 364, open: 78, close: 98, high: 76, low: 104 },
      { x: 396, open: 98, close: 114, high: 95, low: 122, highlight: true }, // Retests Bullish FVG (108..126)!
      { x: 428, open: 114, close: 82, high: 78, low: 118, width: 11 },
      { x: 460, open: 82, close: 54, high: 48, low: 85, width: 11 }, // Signal 3: Bullish BOS above 74!
      { x: 492, open: 54, close: 42, high: 38, low: 58 },
    ];

    const bearSweepCandles: CandleSpec[] = [
      // Prior Swing High BSL @ y=72 -> Drop to Swing Low CHoCH @ y=136 -> Rally leaving Bullish FVG (96..112) -> WICK SWEEP of 72 (high=46, close=78!) -> Disrespects Bullish FVG -> Breaks CHoCH 136 -> Leaves Bearish FVG (124..142) -> Retests Bearish FVG -> Bearish BOS!
      { x: 52, open: 118, close: 80, high: 72, low: 122 }, // Prior Swing High BSL @ 72
      { x: 82, open: 80, close: 112, high: 77, low: 116 },
      { x: 112, open: 112, close: 130, high: 112, low: 136 }, // Prior Swing Low (CHoCH @ 136) & Bull FVG C1 (high=112)
      { x: 142, open: 130, close: 90, high: 86, low: 132, width: 11 }, // Bull FVG C2
      { x: 172, open: 90, close: 78, high: 46, low: 96, width: 11, highlight: true }, // BSL SWEEP CANDLE: Wick raids 46, fails to close above 72!
      { x: 204, open: 78, close: 120, high: 75, low: 124, width: 11 }, // Signal 1: Slices Bullish FVG (96..112)!
      { x: 236, open: 120, close: 152, high: 116, low: 156, width: 11 }, // Signal 2: Closes below CHoCH 136!
      { x: 268, open: 152, close: 122, high: 118, low: 154 }, // Pullback & Bear FVG C1 (low=124)
      { x: 300, open: 122, close: 160, high: 120, low: 166, width: 11 }, // Bear FVG C2
      { x: 332, open: 160, close: 172, high: 142, low: 176 }, // Bear FVG C3 (high=142 -> Bear FVG 124..142)
      { x: 364, open: 172, close: 152, high: 146, low: 174 },
      { x: 396, open: 152, close: 136, high: 128, low: 155, highlight: true }, // Retests Bearish FVG (124..142)!
      { x: 428, open: 136, close: 168, high: 132, low: 172, width: 11 },
      { x: 460, open: 168, close: 196, high: 165, low: 202, width: 11 }, // Signal 3: Bearish BOS below 176!
      { x: 492, open: 196, close: 208, high: 192, low: 212 },
    ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 250"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 4B Candlestick Diagram: Liquidity Sweep Reversal (${direction})`}
        >
          <rect
            x="10"
            y="10"
            width="720"
            height="230"
            rx="12"
            fill="#0B1018"
            stroke={isBull ? "#10b981" : "#f43f5e"}
            strokeOpacity="0.45"
          />

          <text
            x="24"
            y="31"
            fill={isBull ? "#6ee7b7" : "#fda4af"}
            fontSize="10.8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "BULLISH SWEEP CANDLESTICKS: SSL WICK FAKE-OUT → FVG SLICED → CHoCH → BULL FVG + BOS"
              : "BEARISH SWEEP CANDLESTICKS: BSL WICK FAKE-OUT → FVG SLICED → CHoCH → BEAR FVG + BOS"}
          </text>

          {isBull ? (
            <>
              {/* SSL Swept Line */}
              <line
                x1="40"
                y1="178"
                x2="215"
                y2="178"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x="44"
                y="218"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                SSL Sweep Wick (Failed Close Below!)
              </text>

              {/* Old Bearish FVG Sliced */}
              <rect
                x="112"
                y="138"
                width="110"
                height="16"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.16"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />

              {/* CHoCH Line */}
              <line
                x1="112"
                y1="114"
                x2="255"
                y2="114"
                stroke="#38bdf8"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <text
                x="156"
                y="108"
                fill="#38bdf8"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                2. CHoCH
              </text>

              {/* New Bullish FVG */}
              <rect
                x="268"
                y="108"
                width="155"
                height="18"
                rx="3"
                fill="#10b981"
                fillOpacity="0.22"
                stroke="#10b981"
              />

              {/* Bullish BOS Line */}
              <line
                x1="332"
                y1="74"
                x2="510"
                y2="74"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="355"
                y="67"
                fill="#34d399"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                3. Bullish BOS!
              </text>

              <OhlcCandles candles={bullSweepCandles} defaultWidth={9.5} />
            </>
          ) : (
            <>
              {/* BSL Swept Line */}
              <line
                x1="40"
                y1="72"
                x2="215"
                y2="72"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x="182"
                y="50"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                BSL Sweep Wick!
              </text>

              {/* Old Bullish FVG Sliced */}
              <rect
                x="112"
                y="96"
                width="110"
                height="16"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.16"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />

              {/* CHoCH Line */}
              <line
                x1="112"
                y1="136"
                x2="255"
                y2="136"
                stroke="#38bdf8"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <text
                x="156"
                y="149"
                fill="#38bdf8"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                2. CHoCH
              </text>

              {/* New Bearish FVG */}
              <rect
                x="268"
                y="124"
                width="155"
                height="18"
                rx="3"
                fill="#f43f5e"
                fillOpacity="0.22"
                stroke="#f43f5e"
              />

              {/* Bearish BOS Line */}
              <line
                x1="332"
                y1="176"
                x2="510"
                y2="176"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="355"
                y="190"
                fill="#fda4af"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                3. Bearish BOS!
              </text>

              <OhlcCandles candles={bearSweepCandles} defaultWidth={9.5} />
            </>
          )}

          {/* 3-Step Summary Box on Right */}
          <rect
            x="524"
            y="48"
            width="192"
            height="176"
            rx="10"
            fill="#080C12"
            stroke="#1e293b"
          />
          <text
            x="536"
            y="70"
            fill="#f8fafc"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            3 REVERSAL SIGNALS:
          </text>
          <text
            x="536"
            y="95"
            fill="#fcd34d"
            fontSize="9"
            fontFamily="monospace"
          >
            #1 Prior FVG Sliced
          </text>
          <text
            x="536"
            y="109"
            fill="#94a3b8"
            fontSize="8.5"
            fontFamily="monospace"
          >
            Opposing IRL fails to hold
          </text>
          <text
            x="536"
            y="134"
            fill="#38bdf8"
            fontSize="9"
            fontFamily="monospace"
          >
            #2 Candle Closes CHoCH
          </text>
          <text
            x="536"
            y="148"
            fill="#94a3b8"
            fontSize="8.5"
            fontFamily="monospace"
          >
            Breaks prior swing extreme
          </text>
          <text
            x="536"
            y="173"
            fill={isBull ? "#6ee7b7" : "#fda4af"}
            fontSize="9"
            fontFamily="monospace"
          >
            #3 New FVG + BOS
          </text>
          <text
            x="536"
            y="187"
            fill="#94a3b8"
            fontSize="8.5"
            fontFamily="monospace"
          >
            Confirms full Order Flow
          </text>
          <text
            x="536"
            y="201"
            fill="#94a3b8"
            fontSize="8.5"
            fontFamily="monospace"
          >
            transition!
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 6. STEP 5: TOP-DOWN (4H CANDLES + 15M SILVER BULLET CANDLES)
  // ==========================================================================
  const htfCandles: CandleSpec[] = isBull
    ? [
        { x: 42, open: 186, close: 158, high: 150, low: 192 }, // C1 (high=150)
        { x: 76, open: 158, close: 108, high: 102, low: 162, width: 13 }, // 4H BOS C2
        { x: 110, open: 108, close: 72, high: 64, low: 128, width: 13 }, // C3 (low=128 -> 4H FVG 128..150) & 4H BSL @ 64
        { x: 146, open: 72, close: 104, high: 68, low: 110, width: 12 },
        { x: 182, open: 104, close: 136, high: 100, low: 146, width: 12, highlight: true }, // Taps 4H Bullish FVG!
        { x: 218, open: 136, close: 96, high: 90, low: 140, width: 12 },
        { x: 254, open: 96, close: 58, high: 50, low: 100, width: 13 }, // Rides to 4H BSL!
      ]
    : [
        { x: 42, open: 58, close: 86, high: 52, low: 94 }, // C1 (low=94)
        { x: 76, open: 86, close: 136, high: 82, low: 142, width: 13 }, // 4H BOS C2
        { x: 110, open: 136, close: 172, high: 116, low: 180, width: 13 }, // C3 (high=116 -> 4H Bear FVG 94..116) & 4H SSL @ 180
        { x: 146, open: 172, close: 140, high: 134, low: 176, width: 12 },
        { x: 182, open: 140, close: 108, high: 98, low: 144, width: 12, highlight: true }, // Taps 4H Bearish FVG!
        { x: 218, open: 108, close: 148, high: 104, low: 154, width: 12 },
        { x: 254, open: 148, close: 186, high: 144, low: 194, width: 13 }, // Rides to 4H SSL!
      ];

  const ltfSilverBulletCandles: CandleSpec[] = isBull
    ? [
        // 15M Bearish Pullback -> 15M SSL Sweep -> CHoCH + BOS -> 1st Bullish FVG ("Silver Bullet" y=118..136) -> Entry Tap -> Rally!
        { x: 368, open: 96, close: 130, high: 92, low: 136 },
        { x: 394, open: 130, close: 162, high: 126, low: 168 }, // Prior 15M SSL @ 168
        { x: 420, open: 162, close: 136, high: 130, low: 165 }, // Prior 15M LH @ 130 (CHoCH)
        { x: 446, open: 136, close: 164, high: 134, low: 192, highlight: true }, // 15M SSL Sweep Wick (low=192, close=164)!
        { x: 472, open: 164, close: 138, high: 136, low: 168 }, // Silver Bullet C1 (high=136)
        { x: 500, open: 138, close: 98, high: 92, low: 142, width: 11 }, // Silver Bullet C2 (breaks CHoCH 130!)
        { x: 528, open: 98, close: 80, high: 74, low: 118 }, // Silver Bullet C3 (low=118 -> 1st FVG 118..136!) + 15M BOS
        { x: 556, open: 80, close: 106, high: 78, low: 112 },
        { x: 584, open: 106, close: 122, high: 102, low: 132, highlight: true }, // LONG ENTRY TAP in Silver Bullet FVG!
        { x: 612, open: 122, close: 90, high: 84, low: 126, width: 10 },
        { x: 640, open: 90, close: 62, high: 56, low: 94, width: 11 },
        { x: 668, open: 62, close: 46, high: 42, low: 66 },
      ]
    : [
        // 15M Bullish Pullback -> 15M BSL Sweep -> CHoCH + BOS -> 1st Bearish FVG ("Silver Bullet" y=108..126) -> Short Entry Tap -> Drop!
        { x: 368, open: 148, close: 114, high: 108, low: 152 },
        { x: 394, open: 114, close: 82, high: 76, low: 118 }, // Prior 15M BSL @ 76
        { x: 420, open: 82, close: 108, high: 80, low: 114 }, // Prior 15M HL @ 114 (CHoCH)
        { x: 446, open: 108, close: 80, high: 52, low: 110, highlight: true }, // 15M BSL Sweep Wick (high=52, close=80)!
        { x: 472, open: 80, close: 106, high: 76, low: 108 }, // Silver Bullet C1 (low=108)
        { x: 500, open: 106, close: 146, high: 102, low: 152, width: 11 }, // Silver Bullet C2 (breaks CHoCH 114!)
        { x: 528, open: 146, close: 164, high: 126, low: 170 }, // Silver Bullet C3 (high=126 -> 1st Bear FVG 108..126!) + 15M BOS
        { x: 556, open: 164, close: 138, high: 132, low: 166 },
        { x: 584, open: 138, close: 122, high: 112, low: 142, highlight: true }, // SHORT ENTRY TAP in Silver Bullet FVG!
        { x: 612, open: 122, close: 154, high: 118, low: 160, width: 10 },
        { x: 640, open: 154, close: 182, high: 150, low: 188, width: 11 },
        { x: 668, open: 182, close: 198, high: 178, low: 202 },
      ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
      <svg
        viewBox="0 0 740 250"
        className="h-auto w-full"
        role="img"
        aria-label={`Step 5 Candlestick Diagram: 4H to 15M Silver Bullet Execution (${direction})`}
      >
        {/* Left Panel: 4H Candles */}
        <rect
          x="10"
          y="10"
          width="320"
          height="230"
          rx="10"
          fill="#0B1018"
          stroke="#38bdf8"
          strokeOpacity="0.4"
        />
        <text
          x="22"
          y="30"
          fill="#7dd3fc"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          1. HTF (4H) CANDLES + 4H FVG POI
        </text>

        {isBull ? (
          <>
            <line
              x1="110"
              y1="64"
              x2="305"
              y2="64"
              stroke="#10b981"
              strokeDasharray="5 3"
            />
            <text
              x="170"
              y="56"
              fill="#6ee7b7"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              4H BSL Target
            </text>
            <rect
              x="42"
              y="128"
              width="255"
              height="22"
              rx="4"
              fill="#38bdf8"
              fillOpacity="0.18"
              stroke="#38bdf8"
            />
            <text
              x="196"
              y="143"
              fill="#7dd3fc"
              fontSize="8.8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              4H Bull FVG
            </text>
          </>
        ) : (
          <>
            <line
              x1="110"
              y1="180"
              x2="305"
              y2="180"
              stroke="#f43f5e"
              strokeDasharray="5 3"
            />
            <text
              x="170"
              y="194"
              fill="#fda4af"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              4H SSL Target
            </text>
            <rect
              x="42"
              y="94"
              width="255"
              height="22"
              rx="4"
              fill="#38bdf8"
              fillOpacity="0.18"
              stroke="#38bdf8"
            />
            <text
              x="196"
              y="109"
              fill="#7dd3fc"
              fontSize="8.8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              4H Bear FVG
            </text>
          </>
        )}

        <OhlcCandles candles={htfCandles} defaultWidth={11} />
        <text
          x="22"
          y="222"
          fill="#94a3b8"
          fontSize="8.8"
          fontFamily="monospace"
        >
          Check 1W Macro first · Drop to 15M on tap!
        </text>

        {/* Right Panel: 15M Silver Bullet Candles */}
        <rect
          x="344"
          y="10"
          width="386"
          height="230"
          rx="10"
          fill="#0B1018"
          stroke="#fbbf24"
          strokeOpacity="0.45"
        />
        <text
          x="358"
          y="30"
          fill="#fde68a"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          2. 15M CANDLES: SWEEP → &quot;SILVER BULLET&quot; 1ST FVG
        </text>

        {isBull ? (
          <>
            <line
              x1="394"
              y1="168"
              x2="462"
              y2="168"
              stroke="#f43f5e"
              strokeDasharray="4 3"
            />
            <line
              x1="420"
              y1="130"
              x2="515"
              y2="130"
              stroke="#38bdf8"
              strokeDasharray="4 3"
            />
            <rect
              x="472"
              y="118"
              width="238"
              height="18"
              rx="3"
              fill="#fbbf24"
              fillOpacity="0.22"
              stroke="#fbbf24"
            />
            <text
              x="604"
              y="130"
              fill="#fde68a"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ★ SILVER BULLET
            </text>
          </>
        ) : (
          <>
            <line
              x1="394"
              y1="76"
              x2="462"
              y2="76"
              stroke="#10b981"
              strokeDasharray="4 3"
            />
            <line
              x1="420"
              y1="114"
              x2="515"
              y2="114"
              stroke="#38bdf8"
              strokeDasharray="4 3"
            />
            <rect
              x="472"
              y="108"
              width="238"
              height="18"
              rx="3"
              fill="#fbbf24"
              fillOpacity="0.22"
              stroke="#fbbf24"
            />
            <text
              x="604"
              y="120"
              fill="#fde68a"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ★ SILVER BULLET
            </text>
          </>
        )}

        <OhlcCandles candles={ltfSilverBulletCandles} defaultWidth={9} />
        <text
          x="358"
          y="222"
          fill={isBull ? "#6ee7b7" : "#fda4af"}
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {isBull
            ? "1st Bullish FVG after 15M Sweep + Reversal = LONG Entry!"
            : "1st Bearish FVG after 15M Sweep + Reversal = SHORT Entry!"}
        </text>
      </svg>
    </div>
  );
}
