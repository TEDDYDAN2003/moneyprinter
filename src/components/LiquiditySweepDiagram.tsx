"use client";

import React, { useId } from "react";

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

function SvgArrowMarkers({ prefix }: { prefix: string }) {
  const colors: Array<{ id: string; hex: string }> = [
    { id: "emerald", hex: "#34d399" },
    { id: "rose", hex: "#fb7185" },
    { id: "cyan", hex: "#38bdf8" },
    { id: "amber", hex: "#fbbf24" },
  ];

  return (
    <defs>
      {colors.map((c) => (
        <marker
          key={c.id}
          id={`${prefix}-arrow-${c.id}`}
          viewBox="0 0 10 10"
          refX="7.5"
          refY="5"
          markerWidth="6.5"
          markerHeight="6.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 L 2.2 5 z" fill={c.hex} />
        </marker>
      ))}
    </defs>
  );
}

function SwingFlowArrow({
  points,
  color = "emerald",
  prefix,
  dashed = false,
}: {
  points: Array<[number, number]>;
  color?: "emerald" | "rose" | "cyan" | "amber";
  prefix: string;
  dashed?: boolean;
}) {
  const strokeMap = {
    emerald: "#34d399",
    rose: "#fb7185",
    cyan: "#38bdf8",
    amber: "#fbbf24",
  };
  const ptString = points.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <g pointerEvents="none">
      {/* Subtle dark halo under arrow line so both candles AND arrows stay crisp */}
      <polyline
        points={ptString}
        fill="none"
        stroke="#070A0F"
        strokeOpacity={0.7}
        strokeWidth={4.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={ptString}
        fill="none"
        stroke={strokeMap[color]}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "5 3" : undefined}
        markerEnd={`url(#${prefix}-arrow-${color})`}
      />
      {/* Swing pivot nodes (excluding final arrowhead tip) */}
      {points.slice(0, -1).map(([px, py], i) => (
        <circle
          key={i}
          cx={px}
          cy={py}
          r={2.8}
          fill="#0B1018"
          stroke={strokeMap[color]}
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
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
            <line
              x1={c.x}
              y1={wickTop}
              x2={c.x}
              y2={wickBottom}
              stroke={stroke}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
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
  const uid = useId().replace(/:/g, "");
  const isBull = direction === "bullish";

  // ==========================================================================
  // 1. STEP 1: EXTERNAL RANGE LIQUIDITY (ERL) vs INTERNAL RANGE LIQUIDITY (IRL)
  // ==========================================================================
  if (kind === "forms_of_liquidity") {
    const bullCandles: CandleSpec[] = [
      { x: 68, open: 162, close: 182, high: 158, low: 190 },
      { x: 94, open: 182, close: 154, high: 146, low: 186 },
      { x: 122, open: 154, close: 108, high: 104, low: 156, width: 11 },
      { x: 150, open: 108, close: 84, high: 78, low: 124 },
      { x: 178, open: 84, close: 72, high: 68, low: 88 },
      { x: 210, open: 72, close: 96, high: 70, low: 102 },
      { x: 240, open: 96, close: 118, high: 93, low: 123 },
      { x: 270, open: 118, close: 132, high: 115, low: 142, highlight: true },
      { x: 300, open: 132, close: 106, high: 101, low: 138 },
      { x: 332, open: 106, close: 82, high: 78, low: 110 },
      { x: 364, open: 82, close: 56, high: 48, low: 85, width: 11 },
      { x: 396, open: 56, close: 44, high: 40, low: 60 },
    ];

    const bearCandles: CandleSpec[] = [
      { x: 68, open: 88, close: 68, high: 62, low: 92 },
      { x: 94, open: 68, close: 98, high: 65, low: 106 },
      { x: 122, open: 98, close: 144, high: 95, low: 148, width: 11 },
      { x: 150, open: 144, close: 168, high: 128, low: 174 },
      { x: 178, open: 168, close: 178, high: 164, low: 184 },
      { x: 210, open: 178, close: 154, high: 149, low: 180 },
      { x: 240, open: 154, close: 134, high: 130, low: 158 },
      { x: 270, open: 134, close: 120, high: 110, low: 136, highlight: true },
      { x: 300, open: 120, close: 146, high: 116, low: 150 },
      { x: 332, open: 146, close: 172, high: 143, low: 176 },
      { x: 364, open: 172, close: 196, high: 168, low: 204, width: 11 },
      { x: 396, open: 196, close: 206, high: 192, low: 212 },
    ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 240"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 1 Candlestick + Arrow Diagram: External vs Internal Range Liquidity (${direction})`}
        >
          <SvgArrowMarkers prefix={uid} />
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
              ? "BULLISH CANDLES + FLOW ARROWS: IRL (BULLISH FVG) FUELS ATTACK ON BSL"
              : "BEARISH CANDLES + FLOW ARROWS: IRL (BEARISH FVG) FUELS ATTACK ON SSL"}
          </text>

          {isBull ? (
            <>
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
              <SwingFlowArrow
                prefix={uid}
                color="cyan"
                points={[
                  [68, 190],
                  [178, 68],
                  [270, 140],
                  [408, 38],
                ]}
              />
            </>
          ) : (
            <>
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
              <SwingFlowArrow
                prefix={uid}
                color="rose"
                points={[
                  [68, 62],
                  [178, 184],
                  [270, 112],
                  [408, 214],
                ]}
              />
            </>
          )}

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
            CANDLES + FLOW ARROWS:
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
            wicks — arrow shows refuel &amp;
          </text>
          <text
            x="472"
            y="190"
            fill="#fcd34d"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "expansion into upper BSL!"
              : "expansion into lower SSL!"}
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 2. STEP 2: ORDER FLOW VIA BOS (CONTINUATION) & CHoCH (REVERSAL SIGNAL)
  // ==========================================================================
  if (kind === "order_flow_bos_choch") {
    const leftCandles: CandleSpec[] = isBull
      ? [
          { x: 34, open: 172, close: 146, high: 142, low: 176 },
          { x: 56, open: 146, close: 112, high: 106, low: 150 },
          { x: 78, open: 112, close: 132, high: 110, low: 138 },
          { x: 100, open: 132, close: 144, high: 129, low: 148 },
          { x: 122, open: 144, close: 116, high: 112, low: 146 },
          { x: 144, open: 116, close: 88, high: 84, low: 120 },
          { x: 166, open: 88, close: 74, high: 68, low: 92 },
          { x: 188, open: 74, close: 96, high: 72, low: 100 },
          { x: 210, open: 96, close: 114, high: 94, low: 118 },
          { x: 232, open: 114, close: 90, high: 86, low: 116 },
          { x: 254, open: 90, close: 62, high: 56, low: 94, highlight: true },
          { x: 276, open: 62, close: 48, high: 44, low: 66 },
        ]
      : [
          { x: 34, open: 54, close: 80, high: 50, low: 84 },
          { x: 56, open: 80, close: 114, high: 76, low: 120 },
          { x: 78, open: 114, close: 94, high: 90, low: 116 },
          { x: 100, open: 94, close: 82, high: 78, low: 97 },
          { x: 122, open: 82, close: 110, high: 80, low: 114 },
          { x: 144, open: 110, close: 138, high: 106, low: 142 },
          { x: 166, open: 138, close: 152, high: 134, low: 158 },
          { x: 188, open: 152, close: 130, high: 126, low: 154 },
          { x: 210, open: 130, close: 112, high: 108, low: 132 },
          { x: 232, open: 112, close: 136, high: 110, low: 140 },
          { x: 254, open: 136, close: 164, high: 132, low: 170, highlight: true },
          { x: 276, open: 164, close: 178, high: 160, low: 182 },
        ];

    const rightCandles: CandleSpec[] = isBull
      ? [
          { x: 404, open: 68, close: 108, high: 64, low: 114 },
          { x: 428, open: 108, close: 134, high: 104, low: 138 },
          { x: 452, open: 134, close: 104, high: 98, low: 136 },
          { x: 476, open: 104, close: 148, high: 102, low: 154 },
          { x: 500, open: 148, close: 162, high: 144, low: 168 },
          { x: 524, open: 162, close: 124, high: 120, low: 164 },
          { x: 548, open: 124, close: 84, high: 78, low: 128, highlight: true },
          { x: 572, open: 84, close: 108, high: 82, low: 112 },
          { x: 596, open: 108, close: 120, high: 105, low: 124 },
          { x: 620, open: 120, close: 92, high: 88, low: 122 },
          { x: 644, open: 92, close: 64, high: 58, low: 95, highlight: true },
          { x: 668, open: 64, close: 50, high: 46, low: 68 },
        ]
      : [
          { x: 404, open: 156, close: 118, high: 112, low: 160 },
          { x: 428, open: 118, close: 92, high: 88, low: 122 },
          { x: 452, open: 92, close: 122, high: 90, low: 128 },
          { x: 476, open: 122, close: 78, high: 72, low: 124 },
          { x: 500, open: 78, close: 64, high: 58, low: 82 },
          { x: 524, open: 64, close: 102, high: 62, low: 106 },
          { x: 548, open: 102, close: 142, high: 100, low: 148, highlight: true },
          { x: 572, open: 142, close: 118, high: 114, low: 144 },
          { x: 596, open: 118, close: 106, high: 102, low: 120 },
          { x: 620, open: 106, close: 134, high: 104, low: 138 },
          { x: 644, open: 134, close: 162, high: 130, low: 168, highlight: true },
          { x: 668, open: 162, close: 176, high: 158, low: 180 },
        ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 235"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 2 Candlestick + Arrow Diagram: Order Flow BOS and CHoCH (${direction})`}
        >
          <SvgArrowMarkers prefix={uid} />

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
          <SwingFlowArrow
            prefix={uid}
            color={isBull ? "emerald" : "rose"}
            points={
              isBull
                ? [
                    [34, 176],
                    [56, 106],
                    [100, 148],
                    [166, 68],
                    [210, 118],
                    [286, 40],
                  ]
                : [
                    [34, 50],
                    [56, 120],
                    [100, 78],
                    [166, 158],
                    [210, 108],
                    [286, 186],
                  ]
            }
          />

          <text
            x="22"
            y="206"
            fill="#94a3b8"
            fontSize="9.2"
            fontFamily="monospace"
          >
            {isBull
              ? "Candles + Arrows: Bullish BOS continues uptrend"
              : "Candles + Arrows: Bearish BOS continues downtrend"}
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
          <SwingFlowArrow
            prefix={uid}
            color="cyan"
            points={
              isBull
                ? [
                    [404, 64],
                    [428, 138],
                    [452, 98],
                    [500, 168],
                    [548, 78],
                    [596, 124],
                    [678, 42],
                  ]
                : [
                    [404, 160],
                    [428, 88],
                    [452, 128],
                    [500, 58],
                    [548, 148],
                    [596, 102],
                    [678, 184],
                  ]
            }
          />

          <text
            x="390"
            y="206"
            fill="#94a3b8"
            fontSize="9.2"
            fontFamily="monospace"
          >
            Wait for candle + arrow through New BOS to flip bias!
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
          { x: 36, open: 174, close: 152, high: 144, low: 178 },
          { x: 62, open: 152, close: 112, high: 108, low: 155, width: 10 },
          { x: 88, open: 112, close: 94, high: 88, low: 126 },
          { x: 114, open: 94, close: 116, high: 92, low: 120 },
          { x: 140, open: 116, close: 130, high: 114, low: 138, highlight: true },
          { x: 166, open: 130, close: 106, high: 100, low: 134 },
          { x: 192, open: 106, close: 72, high: 68, low: 108, width: 10 },
          { x: 218, open: 72, close: 58, high: 52, low: 84 },
          { x: 244, open: 58, close: 78, high: 56, low: 82 },
          { x: 270, open: 78, close: 88, high: 76, low: 96, highlight: true },
          { x: 296, open: 88, close: 62, high: 56, low: 90 },
          { x: 322, open: 62, close: 42, high: 38, low: 66, width: 10 },
        ]
      : [
          { x: 36, open: 50, close: 72, high: 46, low: 80 },
          { x: 62, open: 72, close: 112, high: 69, low: 116, width: 10 },
          { x: 88, open: 112, close: 130, high: 98, low: 136 },
          { x: 114, open: 130, close: 108, high: 104, low: 132 },
          { x: 140, open: 108, close: 94, high: 86, low: 110, highlight: true },
          { x: 166, open: 94, close: 118, high: 90, low: 124 },
          { x: 192, open: 118, close: 152, high: 116, low: 156, width: 10 },
          { x: 218, open: 152, close: 166, high: 140, low: 172 },
          { x: 244, open: 166, close: 146, high: 142, low: 168 },
          { x: 270, open: 146, close: 136, high: 128, low: 148, highlight: true },
          { x: 296, open: 136, close: 162, high: 134, low: 168 },
          { x: 322, open: 162, close: 182, high: 158, low: 186, width: 10 },
        ];

    const disrespectedCandles: CandleSpec[] = isBull
      ? [
          { x: 404, open: 162, close: 142, high: 136, low: 166 },
          { x: 434, open: 142, close: 96, high: 92, low: 145, width: 11 },
          { x: 464, open: 96, close: 74, high: 66, low: 114 },
          { x: 494, open: 74, close: 98, high: 70, low: 104 },
          { x: 524, open: 98, close: 124, high: 95, low: 128 },
          {
            x: 554,
            open: 124,
            close: 152,
            high: 120,
            low: 156,
            width: 11,
            highlight: true,
          },
          { x: 584, open: 152, close: 140, high: 136, low: 154 },
          { x: 614, open: 140, close: 168, high: 138, low: 174 },
          { x: 644, open: 168, close: 182, high: 164, low: 186 },
        ]
      : [
          { x: 404, open: 62, close: 82, high: 58, low: 88 },
          { x: 434, open: 82, close: 128, high: 79, low: 132, width: 11 },
          { x: 464, open: 128, close: 150, high: 110, low: 158 },
          { x: 494, open: 150, close: 126, high: 120, low: 154 },
          { x: 524, open: 126, close: 100, high: 96, low: 128 },
          {
            x: 554,
            open: 100,
            close: 72,
            high: 68,
            low: 104,
            width: 11,
            highlight: true,
          },
          { x: 584, open: 72, close: 84, high: 70, low: 88 },
          { x: 614, open: 84, close: 56, high: 50, low: 86 },
          { x: 644, open: 56, close: 44, high: 40, low: 60 },
        ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 235"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 3 Candlestick + Arrow Diagram: IRL to ERL Fuel Cycle (${direction})`}
        >
          <SvgArrowMarkers prefix={uid} />

          {/* Left Panel */}
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
          <SwingFlowArrow
            prefix={uid}
            color={isBull ? "emerald" : "rose"}
            points={
              isBull
                ? [
                    [36, 178],
                    [88, 88],
                    [140, 138],
                    [218, 52],
                    [270, 96],
                    [334, 36],
                  ]
                : [
                    [36, 46],
                    [88, 136],
                    [140, 86],
                    [218, 172],
                    [270, 128],
                    [334, 190],
                  ]
            }
          />
          <text
            x="22"
            y="208"
            fill="#94a3b8"
            fontSize="9.2"
            fontFamily="monospace"
          >
            Candles + Arrows: IRL refuels each leg past ERL
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
            ⚠ FVG DISRESPECTED → ARROW TARGETS CHoCH!
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
          <SwingFlowArrow
            prefix={uid}
            color="amber"
            points={
              isBull
                ? [
                    [404, 166],
                    [464, 66],
                    [554, 156],
                    [584, 136],
                    [656, 188],
                  ]
                : [
                    [404, 58],
                    [464, 158],
                    [554, 68],
                    [584, 88],
                    [656, 38],
                  ]
            }
          />
          <text
            x="390"
            y="208"
            fill="#fcd34d"
            fontSize="9.2"
            fontFamily="monospace"
          >
            Full body slices FVG → Arrow drives through CHoCH!
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 4. STEP 4A: LIQUIDITY RUN VALIDATION (CANDLES + SWING ARROWS)
  // ==========================================================================
  if (kind === "liquidity_run_validation") {
    const validRunCandles: CandleSpec[] = isBull
      ? [
          { x: 44, open: 146, close: 122, high: 118, low: 150 },
          { x: 70, open: 122, close: 152, high: 120, low: 158 },
          { x: 96, open: 152, close: 130, high: 122, low: 155 },
          {
            x: 126,
            open: 130,
            close: 88,
            high: 84,
            low: 134,
            width: 11,
            highlight: true,
          },
          { x: 156, open: 88, close: 66, high: 60, low: 98, width: 10 },
          { x: 186, open: 66, close: 84, high: 64, low: 88 },
          { x: 216, open: 84, close: 102, high: 82, low: 110 },
          { x: 246, open: 102, close: 82, high: 78, low: 108 },
          { x: 276, open: 82, close: 56, high: 50, low: 86, width: 10 },
          { x: 306, open: 56, close: 44, high: 40, low: 60 },
        ]
      : [
          { x: 44, open: 90, close: 114, high: 86, low: 118 },
          { x: 70, open: 114, close: 84, high: 78, low: 116 },
          { x: 96, open: 84, close: 106, high: 80, low: 114 },
          {
            x: 126,
            open: 106,
            close: 148,
            high: 102,
            low: 152,
            width: 11,
            highlight: true,
          },
          { x: 156, open: 148, close: 170, high: 138, low: 176, width: 10 },
          { x: 186, open: 170, close: 152, high: 148, low: 172 },
          { x: 216, open: 152, close: 134, high: 126, low: 154 },
          { x: 246, open: 134, close: 154, high: 128, low: 158 },
          { x: 276, open: 154, close: 180, high: 150, low: 186, width: 10 },
          { x: 306, open: 180, close: 192, high: 176, low: 196 },
        ];

    const invalidRunCandles: CandleSpec[] = isBull
      ? [
          { x: 412, open: 136, close: 108, high: 104, low: 140 },
          { x: 440, open: 108, close: 166, high: 106, low: 172 },
          { x: 468, open: 166, close: 152, high: 148, low: 170 },
          { x: 498, open: 152, close: 118, high: 114, low: 155, width: 11 },
          { x: 528, open: 118, close: 94, high: 90, low: 128, highlight: true },
          { x: 558, open: 94, close: 108, high: 91, low: 114 },
          { x: 588, open: 108, close: 138, high: 105, low: 142 },
          { x: 618, open: 138, close: 162, high: 134, low: 168 },
        ]
      : [
          { x: 412, open: 100, close: 128, high: 96, low: 132 },
          { x: 440, open: 128, close: 70, high: 64, low: 130 },
          { x: 468, open: 70, close: 84, high: 66, low: 88 },
          { x: 498, open: 84, close: 118, high: 81, low: 122, width: 11 },
          { x: 528, open: 118, close: 142, high: 108, low: 146, highlight: true },
          { x: 558, open: 142, close: 128, high: 122, low: 145 },
          { x: 588, open: 128, close: 98, high: 94, low: 131 },
          { x: 618, open: 98, close: 74, high: 68, low: 102 },
        ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 240"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 4A Candlestick + Arrow Diagram: Valid Liquidity Run vs Unconfirmed Breakout (${direction})`}
        >
          <SvgArrowMarkers prefix={uid} />

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
          <SwingFlowArrow
            prefix={uid}
            color={isBull ? "emerald" : "rose"}
            points={
              isBull
                ? [
                    [44, 118],
                    [70, 158],
                    [156, 60],
                    [216, 110],
                    [318, 38],
                  ]
                : [
                    [44, 118],
                    [70, 78],
                    [156, 176],
                    [216, 126],
                    [318, 198],
                  ]
            }
          />

          <text
            x="22"
            y="212"
            fill="#6ee7b7"
            fontSize="9.2"
            fontFamily="monospace"
          >
            {isBull
              ? "Post-breakout FVG holds pullback → Arrow continues up!"
              : "Post-breakdown FVG holds pullback → Arrow continues down!"}
          </text>

          {/* Right Panel: Invalid Run */}
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
          <SwingFlowArrow
            prefix={uid}
            color="amber"
            points={
              isBull
                ? [
                    [412, 104],
                    [440, 172],
                    [528, 90],
                    [632, 172],
                  ]
                : [
                    [412, 132],
                    [440, 64],
                    [528, 146],
                    [632, 64],
                  ]
            }
          />

          <text
            x="390"
            y="212"
            fill="#fda4af"
            fontSize="9.2"
            fontFamily="monospace"
          >
            Pre-breakout FVG fails → Arrow reverses into Sweep!
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 5. STEP 4B: LIQUIDITY SWEEP REVERSAL (CANDLES + SWING FLOW ARROWS)
  // ==========================================================================
  if (kind === "liquidity_sweep_reversal") {
    const bullSweepCandles: CandleSpec[] = [
      { x: 52, open: 132, close: 170, high: 128, low: 178 },
      { x: 82, open: 170, close: 138, high: 134, low: 173 },
      { x: 112, open: 138, close: 120, high: 114, low: 142 },
      { x: 142, open: 120, close: 160, high: 118, low: 164, width: 11 },
      {
        x: 172,
        open: 160,
        close: 172,
        high: 154,
        low: 202,
        width: 11,
        highlight: true,
      },
      { x: 204, open: 172, close: 130, high: 126, low: 175, width: 11 },
      { x: 236, open: 130, close: 98, high: 94, low: 134, width: 11 },
      { x: 268, open: 98, close: 128, high: 96, low: 132 },
      { x: 300, open: 128, close: 90, high: 84, low: 130, width: 11 },
      { x: 332, open: 90, close: 78, high: 74, low: 108 },
      { x: 364, open: 78, close: 98, high: 76, low: 104 },
      { x: 396, open: 98, close: 114, high: 95, low: 122, highlight: true },
      { x: 428, open: 114, close: 82, high: 78, low: 118, width: 11 },
      { x: 460, open: 82, close: 54, high: 48, low: 85, width: 11 },
      { x: 492, open: 54, close: 42, high: 38, low: 58 },
    ];

    const bearSweepCandles: CandleSpec[] = [
      { x: 52, open: 118, close: 80, high: 72, low: 122 },
      { x: 82, open: 80, close: 112, high: 77, low: 116 },
      { x: 112, open: 112, close: 130, high: 112, low: 136 },
      { x: 142, open: 130, close: 90, high: 86, low: 132, width: 11 },
      {
        x: 172,
        open: 90,
        close: 78,
        high: 46,
        low: 96,
        width: 11,
        highlight: true,
      },
      { x: 204, open: 78, close: 120, high: 75, low: 124, width: 11 },
      { x: 236, open: 120, close: 152, high: 116, low: 156, width: 11 },
      { x: 268, open: 152, close: 122, high: 118, low: 154 },
      { x: 300, open: 122, close: 160, high: 120, low: 166, width: 11 },
      { x: 332, open: 160, close: 172, high: 142, low: 176 },
      { x: 364, open: 172, close: 152, high: 146, low: 174 },
      { x: 396, open: 152, close: 136, high: 128, low: 155, highlight: true },
      { x: 428, open: 136, close: 168, high: 132, low: 172, width: 11 },
      { x: 460, open: 168, close: 196, high: 165, low: 202, width: 11 },
      { x: 492, open: 196, close: 208, high: 192, low: 212 },
    ];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 250"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 4B Candlestick + Arrow Diagram: Liquidity Sweep Reversal (${direction})`}
        >
          <SvgArrowMarkers prefix={uid} />

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
              ? "BULLISH SWEEP (CANDLES + ARROWS): SSL SWEEP → FVG SLICED → CHoCH → BULL FVG + BOS"
              : "BEARISH SWEEP (CANDLES + ARROWS): BSL SWEEP → FVG SLICED → CHoCH → BEAR FVG + BOS"}
          </text>

          {isBull ? (
            <>
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
              <SwingFlowArrow
                prefix={uid}
                color="emerald"
                points={[
                  [52, 178],
                  [112, 114],
                  [172, 202],
                  [236, 94],
                  [268, 132],
                  [332, 74],
                  [396, 122],
                  [504, 36],
                ]}
              />
            </>
          ) : (
            <>
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
              <SwingFlowArrow
                prefix={uid}
                color="rose"
                points={[
                  [52, 72],
                  [112, 136],
                  [172, 46],
                  [236, 156],
                  [268, 118],
                  [332, 176],
                  [396, 128],
                  [504, 214],
                ]}
              />
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
            #3 New FVG + BOS Arrow
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
  // 6. STEP 5: TOP-DOWN (4H CANDLES + ARROWS & 15M SILVER BULLET + ARROWS)
  // ==========================================================================
  const htfCandles: CandleSpec[] = isBull
    ? [
        { x: 42, open: 186, close: 158, high: 150, low: 192 },
        { x: 76, open: 158, close: 108, high: 102, low: 162, width: 13 },
        { x: 110, open: 108, close: 72, high: 64, low: 128, width: 13 },
        { x: 146, open: 72, close: 104, high: 68, low: 110, width: 12 },
        {
          x: 182,
          open: 104,
          close: 136,
          high: 100,
          low: 146,
          width: 12,
          highlight: true,
        },
        { x: 218, open: 136, close: 96, high: 90, low: 140, width: 12 },
        { x: 254, open: 96, close: 58, high: 50, low: 100, width: 13 },
      ]
    : [
        { x: 42, open: 58, close: 86, high: 52, low: 94 },
        { x: 76, open: 86, close: 136, high: 82, low: 142, width: 13 },
        { x: 110, open: 136, close: 172, high: 116, low: 180, width: 13 },
        { x: 146, open: 172, close: 140, high: 134, low: 176, width: 12 },
        {
          x: 182,
          open: 140,
          close: 108,
          high: 98,
          low: 144,
          width: 12,
          highlight: true,
        },
        { x: 218, open: 108, close: 148, high: 104, low: 154, width: 12 },
        { x: 254, open: 148, close: 186, high: 144, low: 194, width: 13 },
      ];

  const ltfSilverBulletCandles: CandleSpec[] = isBull
    ? [
        { x: 368, open: 96, close: 130, high: 92, low: 136 },
        { x: 394, open: 130, close: 162, high: 126, low: 168 },
        { x: 420, open: 162, close: 136, high: 130, low: 165 },
        { x: 446, open: 136, close: 164, high: 134, low: 192, highlight: true },
        { x: 472, open: 164, close: 138, high: 136, low: 168 },
        { x: 500, open: 138, close: 98, high: 92, low: 142, width: 11 },
        { x: 528, open: 98, close: 80, high: 74, low: 118 },
        { x: 556, open: 80, close: 106, high: 78, low: 112 },
        { x: 584, open: 106, close: 122, high: 102, low: 132, highlight: true },
        { x: 612, open: 122, close: 90, high: 84, low: 126, width: 10 },
        { x: 640, open: 90, close: 62, high: 56, low: 94, width: 11 },
        { x: 668, open: 62, close: 46, high: 42, low: 66 },
      ]
    : [
        { x: 368, open: 148, close: 114, high: 108, low: 152 },
        { x: 394, open: 114, close: 82, high: 76, low: 118 },
        { x: 420, open: 82, close: 108, high: 80, low: 114 },
        { x: 446, open: 108, close: 80, high: 52, low: 110, highlight: true },
        { x: 472, open: 80, close: 106, high: 76, low: 108 },
        { x: 500, open: 106, close: 146, high: 102, low: 152, width: 11 },
        { x: 528, open: 146, close: 164, high: 126, low: 170 },
        { x: 556, open: 164, close: 138, high: 132, low: 166 },
        { x: 584, open: 138, close: 122, high: 112, low: 142, highlight: true },
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
        aria-label={`Step 5 Candlestick + Arrow Diagram: 4H to 15M Silver Bullet Execution (${direction})`}
      >
        <SvgArrowMarkers prefix={uid} />

        {/* Left Panel: 4H Candles + Flow Arrow */}
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
          1. HTF (4H) CANDLES + FLOW ARROWS
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
        <SwingFlowArrow
          prefix={uid}
          color="cyan"
          points={
            isBull
              ? [
                  [42, 192],
                  [110, 64],
                  [182, 146],
                  [268, 44],
                ]
              : [
                  [42, 52],
                  [110, 180],
                  [182, 98],
                  [268, 200],
                ]
          }
        />
        <text
          x="22"
          y="222"
          fill="#94a3b8"
          fontSize="8.8"
          fontFamily="monospace"
        >
          Check 1W Macro first · Drop to 15M on tap!
        </text>

        {/* Right Panel: 15M Silver Bullet Candles + Flow Arrow */}
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
          2. 15M CANDLES + ARROWS: &quot;SILVER BULLET&quot; FVG
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
        <SwingFlowArrow
          prefix={uid}
          color={isBull ? "emerald" : "rose"}
          points={
            isBull
              ? [
                  [368, 92],
                  [394, 168],
                  [420, 130],
                  [446, 192],
                  [528, 74],
                  [584, 132],
                  [682, 38],
                ]
              : [
                  [368, 152],
                  [394, 76],
                  [420, 114],
                  [446, 52],
                  [528, 170],
                  [584, 112],
                  [682, 206],
                ]
          }
        />
        <text
          x="358"
          y="222"
          fill={isBull ? "#6ee7b7" : "#fda4af"}
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {isBull
            ? "1st Bullish FVG after 15M Sweep + Arrow = LONG Entry!"
            : "1st Bearish FVG after 15M Sweep + Arrow = SHORT Entry!"}
        </text>
      </svg>
    </div>
  );
}
