"use client";

import React from "react";

export type VpDiagramKind =
  | "anatomy_profile"
  | "previous_day_placement"
  | "poc_step_1"
  | "poc_step_2"
  | "poc_step_3"
  | "poc_step_4"
  | "var_step_1"
  | "var_step_2"
  | "var_step_3"
  | "var_step_4"
  | "bo_step_1"
  | "bo_step_2"
  | "bo_step_3"
  | "bo_step_4"
  | "unified_system_pivot";

export type VpTradeDirection = "bullish" | "bearish";

interface VolumeProfileDiagramProps {
  kind: VpDiagramKind;
  direction?: VpTradeDirection;
}

/**
 * Helper to render a stylized horizontal Volume Profile histogram on the left of a chart panel.
 */
function ProfileHistogram({
  x = 34,
  topY = 48,
  rowHeight = 9,
  maxBarWidth = 108,
  vahRowIndex = 4,
  pocRowIndex = 9,
  valRowIndex = 14,
  widths = [
    18, 24, 15, 32, 58, 72, 66, 84, 94, 108, 90, 78, 69, 62, 54, 28, 16, 22, 14,
  ],
}: {
  x?: number;
  topY?: number;
  rowHeight?: number;
  maxBarWidth?: number;
  vahRowIndex?: number;
  pocRowIndex?: number;
  valRowIndex?: number;
  widths?: number[];
}) {
  return (
    <g>
      {widths.map((w, idx) => {
        const y = topY + idx * rowHeight;
        const inVa = idx >= vahRowIndex && idx <= valRowIndex;
        const isPoc = idx === pocRowIndex;
        const scaledW = Math.min(w, maxBarWidth);
        const upPart = Math.round(scaledW * 0.54);
        const downPart = scaledW - upPart;

        return (
          <g key={idx}>
            <rect
              x={x}
              y={y}
              width={upPart}
              height={rowHeight - 1.5}
              rx={1.5}
              fill={
                isPoc
                  ? "#ef4444"
                  : inVa
                  ? "rgba(56, 189, 248, 0.52)"
                  : "rgba(100, 116, 139, 0.28)"
              }
            />
            <rect
              x={x + upPart}
              y={y}
              width={downPart}
              height={rowHeight - 1.5}
              rx={1.5}
              fill={
                isPoc
                  ? "#f87171"
                  : inVa
                  ? "rgba(251, 191, 36, 0.48)"
                  : "rgba(71, 85, 105, 0.28)"
              }
            />
          </g>
        );
      })}
    </g>
  );
}

function Candle({
  x,
  openY,
  closeY,
  highY,
  lowY,
  width = 11,
  bullishColor = "#10b981",
  bearishColor = "#f43f5e",
}: {
  x: number;
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
  width?: number;
  bullishColor?: string;
  bearishColor?: string;
}) {
  const isBull = closeY <= openY;
  const color = isBull ? bullishColor : bearishColor;
  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.max(Math.abs(closeY - openY), 2.5);

  return (
    <g>
      <line
        x1={x}
        y1={highY}
        x2={x}
        y2={lowY}
        stroke={color}
        strokeWidth={1.6}
      />
      <rect
        x={x - width / 2}
        y={bodyTop}
        width={width}
        height={bodyHeight}
        rx={1.5}
        fill={color}
      />
    </g>
  );
}

export function VolumeProfileDiagram({
  kind,
  direction = "bullish",
}: VolumeProfileDiagramProps) {
  const vahY = 84;
  const pocY = 132;
  const valY = 180;

  // 1. ANATOMY OF VOLUME PROFILE
  if (kind === "anatomy_profile") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 760 280"
          className="h-auto w-full"
          role="img"
          aria-label="Volume Profile Anatomy showing POC, VAH, VAL, High Volume Nodes, and Low Volume Nodes"
        >
          {/* Subtle Grid */}
          {[52, 84, 132, 180, 218].map((gy) => (
            <line
              key={gy}
              x1={24}
              y1={gy}
              x2={736}
              y2={gy}
              stroke="#1e293b"
              strokeWidth={0.8}
              strokeDasharray="3 4"
            />
          ))}

          {/* Shaded 70% Value Area */}
          <rect
            x={34}
            y={vahY}
            width={690}
            height={valY - vahY}
            fill="rgba(56, 189, 248, 0.06)"
          />

          {/* Zone Labels on Right */}
          <rect
            x={555}
            y={46}
            width={168}
            height={26}
            rx={6}
            fill="rgba(244, 63, 94, 0.12)"
            stroke="rgba(244, 63, 94, 0.35)"
          />
          <text
            x={639}
            y={63}
            textAnchor="middle"
            fill="#fda4af"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ABOVE VAH = PREMIUM
          </text>

          <rect
            x={555}
            y={100}
            width={168}
            height={24}
            rx={6}
            fill="rgba(56, 189, 248, 0.12)"
            stroke="rgba(56, 189, 248, 0.35)"
          />
          <text
            x={639}
            y={116}
            textAnchor="middle"
            fill="#7dd3fc"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            70% VALUE AREA (FAIR)
          </text>

          <rect
            x={555}
            y={192}
            width={168}
            height={26}
            rx={6}
            fill="rgba(16, 185, 129, 0.12)"
            stroke="rgba(16, 185, 129, 0.35)"
          />
          <text
            x={639}
            y={209}
            textAnchor="middle"
            fill="#6ee7b7"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            BELOW VAL = DISCOUNT
          </text>

          {/* Horizontal Profile Histogram */}
          <ProfileHistogram x={34} topY={48} maxBarWidth={140} />

          {/* VAH, POC, VAL Lines */}
          <line
            x1={34}
            y1={vahY}
            x2={724}
            y2={vahY}
            stroke="#38bdf8"
            strokeWidth={1.6}
            strokeDasharray="6 4"
          />
          <text
            x={186}
            y={vahY - 6}
            fill="#38bdf8"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            VAH (Value Area High)
          </text>

          <line
            x1={34}
            y1={pocY}
            x2={724}
            y2={pocY}
            stroke="#ef4444"
            strokeWidth={2.2}
          />
          <text
            x={186}
            y={pocY - 6}
            fill="#f87171"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            POC (Point of Control — Highest Traded Volume)
          </text>

          <line
            x1={34}
            y1={valY}
            x2={724}
            y2={valY}
            stroke="#38bdf8"
            strokeWidth={1.6}
            strokeDasharray="6 4"
          />
          <text
            x={186}
            y={valY + 13}
            fill="#38bdf8"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            VAL (Value Area Low)
          </text>

          {/* Price Behavior Path Showing Fast LVN Travel vs Slow HVN Consolidation */}
          <path
            d="M 225 215 L 265 142 L 290 124 L 315 138 L 340 122 L 368 139 L 395 126 L 425 134 L 468 58 L 502 68"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Annotations for LVN Fast Move & HVN Consolidation */}
          <text
            x={215}
            y={234}
            fill="#94a3b8"
            fontSize="9.5"
            fontFamily="monospace"
          >
            LVN (Short Bars): Fast Slice
          </text>
          <rect
            x={282}
            y={145}
            width={150}
            height={20}
            rx={4}
            fill="#0f172a"
            stroke="#475569"
          />
          <text
            x={357}
            y={158}
            textAnchor="middle"
            fill="#fbbf24"
            fontSize="9.5"
            fontFamily="monospace"
          >
            HVN: Consolidates &amp; Reacts
          </text>

          {/* Bottom Traditional Time Volume Bar Comparison */}
          <line
            x1={34}
            y1={244}
            x2={724}
            y2={244}
            stroke="#1e293b"
            strokeWidth={1}
          />
          <text
            x={38}
            y={263}
            fill="#64748b"
            fontSize="9.5"
            fontFamily="monospace"
          >
            Volume Profile = Volume Across PRICE (Left) · Traditional Volume =
            Volume Across TIME · Settings: Row Size 60 | Value Area 70%
          </text>
        </svg>
      </div>
    );
  }

  // 2. PLACEMENT RULE: PREVIOUS DAY COMPLETED SESSION -> EXTEND TO TODAY
  if (kind === "previous_day_placement") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 760 265"
          className="h-auto w-full"
          role="img"
          aria-label="Fixed Range Volume Profile placed across Previous Day Session and extended into Current Session"
        >
          {/* Previous Day Session Box */}
          <rect
            x={32}
            y={34}
            width={325}
            height={194}
            rx={8}
            fill="rgba(56, 189, 248, 0.04)"
            stroke="#1e293b"
          />
          {/* Current Day Session Box */}
          <rect
            x={365}
            y={34}
            width={362}
            height={194}
            rx={8}
            fill="rgba(16, 185, 129, 0.03)"
            stroke="#1e293b"
          />

          {/* Session Headers */}
          <text
            x={46}
            y={24}
            fill="#38bdf8"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            PREVIOUS COMPLETED SESSION (e.g. July 27 · Anchor First → Last
            Candle)
          </text>
          <text
            x={380}
            y={24}
            fill="#34d399"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CURRENT LIVE SESSION (July 28 · Trade Extended Levels)
          </text>

          {/* Anchor Vertical Lines */}
          <line
            x1={46}
            y1={36}
            x2={46}
            y2={226}
            stroke="#38bdf8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <line
            x1={345}
            y1={36}
            x2={345}
            y2={226}
            stroke="#38bdf8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />

          {/* Value Area Shade Extended Across Both Sessions */}
          <rect
            x={46}
            y={82}
            width={670}
            height={94}
            fill="rgba(56, 189, 248, 0.06)"
          />

          <ProfileHistogram x={46} topY={46} maxBarWidth={92} />

          {/* Extended VAH, POC, VAL Lines */}
          <line
            x1={46}
            y1={82}
            x2={716}
            y2={82}
            stroke="#38bdf8"
            strokeWidth={1.6}
            strokeDasharray="6 4"
          />
          <text
            x={645}
            y={76}
            fill="#38bdf8"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Extended VAH
          </text>

          <line
            x1={46}
            y1={129}
            x2={716}
            y2={129}
            stroke="#ef4444"
            strokeWidth={2.2}
          />
          <text
            x={645}
            y={123}
            fill="#f87171"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Extended POC
          </text>

          <line
            x1={46}
            y1={176}
            x2={716}
            y2={176}
            stroke="#38bdf8"
            strokeWidth={1.6}
            strokeDasharray="6 4"
          />
          <text
            x={645}
            y={190}
            fill="#38bdf8"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Extended VAL
          </text>

          {/* Previous Day Candles */}
          <Candle x={165} openY={155} closeY={132} highY={125} lowY={164} />
          <Candle x={190} openY={132} closeY={110} highY={102} lowY={138} />
          <Candle x={215} openY={110} closeY={136} highY={105} lowY={144} />
          <Candle x={240} openY={136} closeY={120} highY={112} lowY={142} />
          <Candle x={265} openY={120} closeY={92} highY={84} lowY={126} />
          <Candle x={290} openY={92} closeY={128} highY={88} lowY={135} />
          <Candle x={315} openY={128} closeY={152} highY={122} lowY={162} />
          <Candle x={338} openY={152} closeY={194} highY={148} lowY={204} />

          {/* Current Day Candles reacting to Yesterday's POC */}
          <Candle x={395} openY={194} closeY={172} highY={168} lowY={200} />
          <Candle x={422} openY={172} closeY={146} highY={140} lowY={178} />
          <Candle x={450} openY={146} closeY={136} highY={118} lowY={150} />
          <Candle x={478} openY={136} closeY={158} highY={133} lowY={165} />
          <Candle x={506} openY={158} closeY={184} highY={154} lowY={192} />

          {/* Warning Note */}
          <rect
            x={386}
            y={198}
            width={326}
            height={22}
            rx={5}
            fill="rgba(245, 158, 11, 0.12)"
            stroke="rgba(245, 158, 11, 0.35)"
          />
          <text
            x={549}
            y={213}
            textAnchor="middle"
            fill="#fcd34d"
            fontSize="9.5"
            fontFamily="monospace"
          >
            Intraday TF (&lt;1D, e.g. 15M) + Chart Time = Exchange Time
          </text>

          <text
            x={38}
            y={249}
            fill="#94a3b8"
            fontSize="9.5"
            fontFamily="monospace"
          >
            Rule: Never place FRVP on today&apos;s developing session (levels
            shift live). Always anchor on yesterday&apos;s completed session!
          </text>
        </svg>
      </div>
    );
  }

  // ===========================================================================
  // STRATEGY 1: POC BOUNCE STRATEGY (poc_step_1 .. poc_step_4)
  // ===========================================================================
  if (kind.startsWith("poc_step_")) {
    const isBear = direction === "bearish";
    // Bearish POC Bounce: Yesterday closed BELOW VAL -> Price rallies UP to POC -> Rejects DOWN
    // Bullish POC Bounce: Yesterday closed ABOVE VAH -> Price pulls DOWN to POC -> Bounces UP
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 760 260"
          className="h-auto w-full"
          role="img"
          aria-label={`POC Bounce Strategy ${kind} (${direction})`}
        >
          {/* Session Divider */}
          <line
            x1={320}
            y1={28}
            x2={320}
            y2={230}
            stroke="#334155"
            strokeWidth={1.4}
            strokeDasharray="5 4"
          />
          <text
            x={42}
            y={22}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            PREVIOUS SESSION (FRVP Anchor)
          </text>
          <text
            x={338}
            y={22}
            fill="#e2e8f0"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CURRENT SESSION ({isBear ? "Bearish Short" : "Bullish Long"} POC
            Bounce)
          </text>

          {/* Value Area Shade */}
          <rect
            x={36}
            y={vahY}
            width={692}
            height={valY - vahY}
            fill="rgba(56, 189, 248, 0.05)"
          />

          <ProfileHistogram x={36} topY={48} maxBarWidth={86} />

          {/* VAH, POC, VAL */}
          <line
            x1={36}
            y1={vahY}
            x2={728}
            y2={vahY}
            stroke="#38bdf8"
            strokeWidth={1.3}
            strokeDasharray="5 4"
          />
          <text
            x={692}
            y={vahY - 5}
            fill="#38bdf8"
            fontSize="9.5"
            fontFamily="monospace"
          >
            VAH
          </text>

          <line
            x1={36}
            y1={pocY}
            x2={728}
            y2={pocY}
            stroke="#ef4444"
            strokeWidth={2.3}
          />
          <text
            x={692}
            y={pocY - 5}
            fill="#f87171"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            POC
          </text>

          <line
            x1={36}
            y1={valY}
            x2={728}
            y2={valY}
            stroke="#38bdf8"
            strokeWidth={1.3}
            strokeDasharray="5 4"
          />
          <text
            x={692}
            y={valY + 12}
            fill="#38bdf8"
            fontSize="9.5"
            fontFamily="monospace"
          >
            VAL
          </text>

          {/* Previous Day Candles Closing OUTSIDE Value Area */}
          {isBear ? (
            <>
              <Candle x={175} openY={118} closeY={138} highY={110} lowY={144} />
              <Candle x={205} openY={138} closeY={125} highY={120} lowY={146} />
              <Candle x={235} openY={125} closeY={156} highY={121} lowY={164} />
              <Candle x={265} openY={156} closeY={184} highY={152} lowY={190} />
              <Candle x={296} openY={184} closeY={210} highY={180} lowY={218} />
              <circle
                cx={296}
                cy={210}
                r={14}
                fill="none"
                stroke="#fbbf24"
                strokeWidth={1.8}
                strokeDasharray="3 2"
              />
              <text
                x={190}
                y={236}
                fill="#fcd34d"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ✓ Prior Close OUTSIDE VA (Below VAL)
              </text>
            </>
          ) : (
            <>
              <Candle x={175} openY={146} closeY={126} highY={120} lowY={152} />
              <Candle x={205} openY={126} closeY={138} highY={122} lowY={144} />
              <Candle x={235} openY={138} closeY={106} highY={100} lowY={142} />
              <Candle x={265} openY={106} closeY={80} highY={74} lowY={112} />
              <Candle x={296} openY={80} closeY={56} highY={48} lowY={84} />
              <circle
                cx={296}
                cy={56}
                r={14}
                fill="none"
                stroke="#fbbf24"
                strokeWidth={1.8}
                strokeDasharray="3 2"
              />
              <text
                x={190}
                y={42}
                fill="#fcd34d"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ✓ Prior Close OUTSIDE VA (Above VAH)
              </text>
            </>
          )}

          {/* Step 1 Invalid Callout */}
          {kind === "poc_step_1" && (
            <g>
              <rect
                x={365}
                y={102}
                width={315}
                height={58}
                rx={8}
                fill="rgba(244, 63, 94, 0.1)"
                stroke="rgba(244, 63, 94, 0.35)"
              />
              <text
                x={522}
                y={125}
                textAnchor="middle"
                fill="#fda4af"
                fontSize="10.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                MANDATORY CONDITION #1
              </text>
              <text
                x={522}
                y={144}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="9.5"
                fontFamily="monospace"
              >
                If yesterday ended INSIDE Value Area → Invalid Setup!
              </text>
            </g>
          )}

          {/* Step 2+: Price Moves Back Toward POC */}
          {(kind === "poc_step_2" ||
            kind === "poc_step_3" ||
            kind === "poc_step_4") &&
            (isBear ? (
              <>
                <Candle
                  x={355}
                  openY={208}
                  closeY={186}
                  highY={180}
                  lowY={214}
                />
                <Candle
                  x={385}
                  openY={186}
                  closeY={162}
                  highY={156}
                  lowY={190}
                />
                <Candle
                  x={415}
                  openY={162}
                  closeY={140}
                  highY={134}
                  lowY={166}
                />
              </>
            ) : (
              <>
                <Candle x={355} openY={58} closeY={80} highY={54} lowY={86} />
                <Candle x={385} openY={80} closeY={104} highY={76} lowY={110} />
                <Candle
                  x={415}
                  openY={104}
                  closeY={126}
                  highY={100}
                  lowY={131}
                />
              </>
            ))}

          {kind === "poc_step_2" && (
            <text
              x={445}
              y={pocY - 12}
              fill="#fbbf24"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ← Wait patiently for price to reach extended POC
            </text>
          )}

          {/* Step 3+: Confirmation Candles at POC */}
          {(kind === "poc_step_3" || kind === "poc_step_4") &&
            (isBear ? (
              <>
                {/* Long upper wick piercing POC + multiple red candles */}
                <Candle
                  x={446}
                  openY={140}
                  closeY={146}
                  highY={112}
                  lowY={150}
                />
                <Candle
                  x={476}
                  openY={146}
                  closeY={162}
                  highY={143}
                  lowY={167}
                />
                <Candle
                  x={506}
                  openY={162}
                  closeY={176}
                  highY={159}
                  lowY={180}
                />
                <text
                  x={452}
                  y={104}
                  fill="#fda4af"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Long Wick Rejection + Red Candles
                </text>
              </>
            ) : (
              <>
                {/* Red touch candle + Bullish Engulfing green candle */}
                <Candle
                  x={446}
                  openY={124}
                  closeY={135}
                  highY={121}
                  lowY={142}
                />
                <Candle
                  x={478}
                  openY={137}
                  closeY={110}
                  highY={105}
                  lowY={140}
                  width={13}
                />
                <text
                  x={452}
                  y={158}
                  fill="#6ee7b7"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Bullish Engulfing Rejection off POC
                </text>
              </>
            ))}

          {/* Step 4: Full 2R Trade Box */}
          {kind === "poc_step_4" &&
            (isBear ? (
              <>
                {/* Short SL Box (above POC/wick) & 2R TP Box */}
                <rect
                  x={518}
                  y={110}
                  width={158}
                  height={66}
                  fill="rgba(244, 63, 94, 0.16)"
                  stroke="#f43f5e"
                  strokeWidth={1}
                />
                <rect
                  x={518}
                  y={176}
                  width={158}
                  height={68}
                  fill="rgba(16, 185, 129, 0.16)"
                  stroke="#10b981"
                  strokeWidth={1}
                />
                <text
                  x={597}
                  y={126}
                  textAnchor="middle"
                  fill="#fda4af"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  SL Slightly Above POC (1R)
                </text>
                <text
                  x={597}
                  y={214}
                  textAnchor="middle"
                  fill="#6ee7b7"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  TAKE PROFIT = 2R TARGET ✓
                </text>
                <Candle
                  x={545}
                  openY={176}
                  closeY={198}
                  highY={172}
                  lowY={204}
                />
                <Candle
                  x={578}
                  openY={198}
                  closeY={222}
                  highY={195}
                  lowY={228}
                />
                <Candle
                  x={612}
                  openY={222}
                  closeY={244}
                  highY={218}
                  lowY={248}
                />
              </>
            ) : (
              <>
                {/* Long SL Box (below POC) & 2R TP Box */}
                <rect
                  x={495}
                  y={110}
                  width={175}
                  height={34}
                  fill="rgba(244, 63, 94, 0.16)"
                  stroke="#f43f5e"
                  strokeWidth={1}
                />
                <rect
                  x={495}
                  y={42}
                  width={175}
                  height={68}
                  fill="rgba(16, 185, 129, 0.16)"
                  stroke="#10b981"
                  strokeWidth={1}
                />
                <text
                  x={582}
                  y={131}
                  textAnchor="middle"
                  fill="#fda4af"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  SL Slightly Below POC (1R)
                </text>
                <text
                  x={582}
                  y={78}
                  textAnchor="middle"
                  fill="#6ee7b7"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  TAKE PROFIT = 2R TARGET ✓
                </text>
                <Candle x={528} openY={110} closeY={86} highY={80} lowY={114} />
                <Candle x={562} openY={86} closeY={64} highY={58} lowY={90} />
                <Candle x={596} openY={64} closeY={42} highY={38} lowY={68} />
              </>
            ))}
        </svg>
      </div>
    );
  }

  // ===========================================================================
  // STRATEGY 2: VALUE AREA REVERSAL (var_step_1 .. var_step_4)
  // ===========================================================================
  if (kind.startsWith("var_step_")) {
    const isBull = direction === "bullish";
    // Bullish Value Area Reversal: Yesterday closed INSIDE VA -> Crosses BELOW VAL -> Closes BACK INSIDE VA -> Buy 2R
    // Bearish Value Area Reversal: Yesterday closed INSIDE VA -> Crosses ABOVE VAH -> Closes BACK INSIDE VA -> Sell 2R
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 760 260"
          className="h-auto w-full"
          role="img"
          aria-label={`Value Area Reversal ${kind} (${direction})`}
        >
          <line
            x1={310}
            y1={28}
            x2={310}
            y2={232}
            stroke="#334155"
            strokeWidth={1.4}
            strokeDasharray="5 4"
          />
          <text
            x={40}
            y={22}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            PREVIOUS SESSION (Closed INSIDE VA)
          </text>
          <text
            x={328}
            y={22}
            fill="#e2e8f0"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CURRENT SESSION (
            {isBull
              ? "Bullish VAL Discount Reversal"
              : "Bearish VAH Premium Reversal"}
            )
          </text>

          <rect
            x={36}
            y={vahY}
            width={692}
            height={valY - vahY}
            fill="rgba(56, 189, 248, 0.06)"
          />
          <ProfileHistogram x={36} topY={48} maxBarWidth={84} />

          <line
            x1={36}
            y1={vahY}
            x2={728}
            y2={vahY}
            stroke="#38bdf8"
            strokeWidth={1.7}
            strokeDasharray="6 4"
          />
          <text
            x={692}
            y={vahY - 5}
            fill="#38bdf8"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            VAH
          </text>

          <line
            x1={36}
            y1={pocY}
            x2={728}
            y2={pocY}
            stroke="#ef4444"
            strokeWidth={1.5}
            opacity={0.65}
          />

          <line
            x1={36}
            y1={valY}
            x2={728}
            y2={valY}
            stroke="#38bdf8"
            strokeWidth={1.7}
            strokeDasharray="6 4"
          />
          <text
            x={692}
            y={valY + 13}
            fill="#38bdf8"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            VAL
          </text>

          {/* Previous Day Candles Ending INSIDE Value Area */}
          <Candle x={185} openY={156} closeY={126} highY={118} lowY={162} />
          <Candle x={215} openY={126} closeY={104} highY={96} lowY={132} />
          <Candle x={248} openY={104} closeY={142} highY={100} lowY={150} />
          <Candle x={282} openY={142} closeY={122} highY={114} lowY={148} />
          <circle
            cx={282}
            cy={122}
            r={14}
            fill="none"
            stroke="#34d399"
            strokeWidth={1.8}
            strokeDasharray="3 2"
          />
          <text
            x={168}
            y={202}
            fill="#6ee7b7"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ✓ Prior Session Closed INSIDE VA
          </text>

          {/* Step 2+: Price Crosses Outside VA (Overextended) */}
          {(kind === "var_step_2" ||
            kind === "var_step_3" ||
            kind === "var_step_4") &&
            (isBull ? (
              <>
                <Candle
                  x={345}
                  openY={135}
                  closeY={168}
                  highY={130}
                  lowY={174}
                />
                <Candle
                  x={376}
                  openY={168}
                  closeY={204}
                  highY={164}
                  lowY={212}
                />
                <Candle
                  x={408}
                  openY={204}
                  closeY={216}
                  highY={198}
                  lowY={226}
                />
                <text
                  x={338}
                  y={242}
                  fill="#38bdf8"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  Crosses Below VAL (Overextended Discount)
                </text>
              </>
            ) : (
              <>
                <Candle x={345} openY={128} closeY={96} highY={90} lowY={134} />
                <Candle x={376} openY={96} closeY={62} highY={54} lowY={102} />
                <Candle x={408} openY={62} closeY={48} highY={40} lowY={68} />
                <text
                  x={338}
                  y={36}
                  fill="#fda4af"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  Crosses Above VAH (Overextended Premium)
                </text>
              </>
            ))}

          {/* Step 3+: Wick Fakeout vs True Candle BODY Close Back Inside VA */}
          {(kind === "var_step_3" || kind === "var_step_4") &&
            (isBull ? (
              <>
                {/* Wick-only candle (invalid) */}
                <Candle
                  x={442}
                  openY={214}
                  closeY={192}
                  highY={168}
                  lowY={220}
                />
                {/* Full BODY close back inside VA (valid!) */}
                <Candle
                  x={478}
                  openY={192}
                  closeY={162}
                  highY={156}
                  lowY={196}
                  width={13}
                />
                {kind === "var_step_3" && (
                  <>
                    <text
                      x={435}
                      y={152}
                      fill="#fda4af"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      ✗ Wick Only
                    </text>
                    <text
                      x={495}
                      y={164}
                      fill="#6ee7b7"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ← ✓ Candle BODY Closes Inside VA!
                    </text>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Wick-only candle (invalid) */}
                <Candle x={442} openY={50} closeY={72} highY={44} lowY={96} />
                {/* Full BODY close back inside VA (valid!) */}
                <Candle
                  x={478}
                  openY={72}
                  closeY={102}
                  highY={68}
                  lowY={108}
                  width={13}
                />
                {kind === "var_step_3" && (
                  <>
                    <text
                      x={425}
                      y={110}
                      fill="#fda4af"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      ✗ Wick Only
                    </text>
                    <text
                      x={495}
                      y={104}
                      fill="#fda4af"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ← ✓ Candle BODY Closes Inside VA!
                    </text>
                  </>
                )}
              </>
            ))}

          {/* Step 4: Swing SL & 2R Target */}
          {kind === "var_step_4" &&
            (isBull ? (
              <>
                <rect
                  x={496}
                  y={162}
                  width={182}
                  height={64}
                  fill="rgba(244, 63, 94, 0.15)"
                  stroke="#f43f5e"
                />
                <rect
                  x={496}
                  y={66}
                  width={182}
                  height={96}
                  fill="rgba(16, 185, 129, 0.16)"
                  stroke="#10b981"
                />
                <text
                  x={587}
                  y={216}
                  textAnchor="middle"
                  fill="#fda4af"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  SL Near Swing Low (1R)
                </text>
                <text
                  x={587}
                  y={108}
                  textAnchor="middle"
                  fill="#6ee7b7"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  BUY → 2R TARGET ✓
                </text>
                <Candle
                  x={530}
                  openY={162}
                  closeY={132}
                  highY={126}
                  lowY={166}
                />
                <Candle
                  x={566}
                  openY={132}
                  closeY={98}
                  highY={92}
                  lowY={136}
                />
                <Candle x={602} openY={98} closeY={66} highY={60} lowY={102} />
              </>
            ) : (
              <>
                <rect
                  x={496}
                  y={40}
                  width={182}
                  height={62}
                  fill="rgba(244, 63, 94, 0.15)"
                  stroke="#f43f5e"
                />
                <rect
                  x={496}
                  y={102}
                  width={182}
                  height={98}
                  fill="rgba(16, 185, 129, 0.16)"
                  stroke="#10b981"
                />
                <text
                  x={587}
                  y={58}
                  textAnchor="middle"
                  fill="#fda4af"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  SL Near Swing High (1R)
                </text>
                <text
                  x={587}
                  y={156}
                  textAnchor="middle"
                  fill="#6ee7b7"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  SELL → 2R TARGET ✓
                </text>
                <Candle
                  x={530}
                  openY={102}
                  closeY={134}
                  highY={98}
                  lowY={140}
                />
                <Candle
                  x={566}
                  openY={134}
                  closeY={168}
                  highY={130}
                  lowY={174}
                />
                <Candle
                  x={602}
                  openY={168}
                  closeY={200}
                  highY={164}
                  lowY={206}
                />
              </>
            ))}
        </svg>
      </div>
    );
  }

  // ===========================================================================
  // STRATEGY 3: BREAKOUT STRATEGY (bo_step_1 .. bo_step_4)
  // ===========================================================================
  if (kind.startsWith("bo_step_")) {
    const isBull = direction === "bullish";
    const bVah = 116;
    const bPoc = 152;
    const bVal = 188;

    if (kind === "bo_step_2") {
      // Side-by-side comparison: Valid Hold near VAH/VAL vs Invalid Deep Pullback
      return (
        <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
          <svg
            viewBox="0 0 760 250"
            className="h-auto w-full"
            role="img"
            aria-label="Valid shallow pullback holding Value Area edge vs Invalid deep pullback into Value Area"
          >
            {/* Left Panel: VALID HOLD */}
            <rect
              x={22}
              y={22}
              width={346}
              height={208}
              rx={8}
              fill="rgba(16, 185, 129, 0.04)"
              stroke="rgba(16, 185, 129, 0.35)"
            />
            <text
              x={195}
              y={42}
              textAnchor="middle"
              fill="#6ee7b7"
              fontSize="10.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ✓ VALID: Pullback Holds Near VAH/VAL
            </text>
            <rect
              x={36}
              y={132}
              width={318}
              height={68}
              fill="rgba(56, 189, 248, 0.07)"
            />
            <line
              x1={36}
              y1={132}
              x2={354}
              y2={132}
              stroke="#38bdf8"
              strokeWidth={1.6}
              strokeDasharray="5 4"
            />
            <text
              x={44}
              y={126}
              fill="#38bdf8"
              fontSize="9.5"
              fontFamily="monospace"
            >
              VAH
            </text>
            <path
              d="M 65 170 L 135 76 L 195 136 L 265 62"
              fill="none"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={195} cy={136} r={6} fill="#fbbf24" />
            <text
              x={195}
              y={156}
              textAnchor="middle"
              fill="#fcd34d"
              fontSize="9.5"
              fontFamily="monospace"
            >
              Shallow dip holds near VAH!
            </text>

            {/* Right Panel: INVALID DEEP SLICE */}
            <rect
              x={392}
              y={22}
              width={346}
              height={208}
              rx={8}
              fill="rgba(244, 63, 94, 0.04)"
              stroke="rgba(244, 63, 94, 0.35)"
            />
            <text
              x={565}
              y={42}
              textAnchor="middle"
              fill="#fda4af"
              fontSize="10.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ✗ INVALID: Breaks Deep Inside Value Area
            </text>
            <rect
              x={406}
              y={132}
              width={318}
              height={68}
              fill="rgba(56, 189, 248, 0.07)"
            />
            <line
              x1={406}
              y1={132}
              x2={724}
              y2={132}
              stroke="#38bdf8"
              strokeWidth={1.6}
              strokeDasharray="5 4"
            />
            <text
              x={414}
              y={126}
              fill="#38bdf8"
              fontSize="9.5"
              fontFamily="monospace"
            >
              VAH
            </text>
            <path
              d="M 435 170 L 505 76 L 585 186 L 635 196"
              fill="none"
              stroke="#f43f5e"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={585} cy={186} r={6} fill="#f43f5e" />
            <text
              x={585}
              y={216}
              textAnchor="middle"
              fill="#fda4af"
              fontSize="9.5"
              fontFamily="monospace"
            >
              Failed to hold — Cancel &amp; Wait!
            </text>
          </svg>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 760 265"
          className="h-auto w-full"
          role="img"
          aria-label={`Volume Profile Breakout Strategy ${kind} (${direction})`}
        >
          <text
            x={38}
            y={22}
            fill="#e2e8f0"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "BULLISH VAH BREAKOUT → PULLBACK HOLD → BOS (HIGHER HIGH)"
              : "BEARISH VAL BREAKDOWN → PULLBACK HOLD → BOS (LOWER LOW)"}
          </text>
          <text
            x={510}
            y={22}
            fill="#94a3b8"
            fontSize="9.5"
            fontFamily="monospace"
          >
            Prior Close Inside OR Outside VA = Valid
          </text>

          <rect
            x={36}
            y={isBull ? bVah : 70}
            width={692}
            height={72}
            fill="rgba(56, 189, 248, 0.06)"
          />

          <ProfileHistogram
            x={36}
            topY={isBull ? 86 : 42}
            maxBarWidth={80}
          />

          {isBull ? (
            <>
              <line
                x1={36}
                y1={bVah}
                x2={728}
                y2={bVah}
                stroke="#38bdf8"
                strokeWidth={1.8}
                strokeDasharray="6 4"
              />
              <text
                x={692}
                y={bVah - 6}
                fill="#38bdf8"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                VAH
              </text>
              <line
                x1={36}
                y1={bPoc}
                x2={728}
                y2={bPoc}
                stroke="#ef4444"
                strokeWidth={1.4}
                opacity={0.6}
              />
              <line
                x1={36}
                y1={bVal}
                x2={728}
                y2={bVal}
                stroke="#38bdf8"
                strokeWidth={1.3}
                strokeDasharray="5 4"
              />

              {/* Step 1: Significant Breakout Above VAH */}
              <Candle x={240} openY={156} closeY={132} highY={126} lowY={162} />
              <Candle x={272} openY={132} closeY={96} highY={90} lowY={138} />
              <Candle x={304} openY={96} closeY={72} highY={66} lowY={102} />

              {kind === "bo_step_1" && (
                <text
                  x={325}
                  y={76}
                  fill="#6ee7b7"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ← Significant Breakout Above VAH!
                </text>
              )}

              {/* Step 3 & 4: Pullback Holds Near VAH + BOS (Higher High) */}
              {(kind === "bo_step_3" || kind === "bo_step_4") && (
                <>
                  <Candle
                    x={338}
                    openY={72}
                    closeY={98}
                    highY={68}
                    lowY={104}
                  />
                  <Candle
                    x={370}
                    openY={98}
                    closeY={118}
                    highY={94}
                    lowY={124}
                  />
                  <Candle
                    x={402}
                    openY={118}
                    closeY={92}
                    highY={86}
                    lowY={122}
                  />
                  <Candle
                    x={436}
                    openY={92}
                    closeY={58}
                    highY={52}
                    lowY={96}
                    width={13}
                  />

                  {/* BOS Line across initial breakout peak (y=66) */}
                  <line
                    x1={304}
                    y1={66}
                    x2={465}
                    y2={66}
                    stroke="#fbbf24"
                    strokeWidth={1.6}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={365}
                    y={60}
                    textAnchor="middle"
                    fill="#fcd34d"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    BOS (Higher High)
                  </text>
                </>
              )}

              {kind === "bo_step_4" && (
                <>
                  <rect
                    x={462}
                    y={58}
                    width={195}
                    height={68}
                    fill="rgba(244, 63, 94, 0.15)"
                    stroke="#f43f5e"
                  />
                  <rect
                    x={462}
                    y={24}
                    width={195}
                    height={34}
                    fill="rgba(16, 185, 129, 0.18)"
                    stroke="#10b981"
                  />
                  <text
                    x={560}
                    y={114}
                    textAnchor="middle"
                    fill="#fda4af"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    SL Below BOS Higher Low (1R)
                  </text>
                  <text
                    x={560}
                    y={45}
                    textAnchor="middle"
                    fill="#6ee7b7"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    BUY → 2R CONTINUATION ✓
                  </text>
                  <Candle
                    x={502}
                    openY={58}
                    closeY={40}
                    highY={35}
                    lowY={62}
                  />
                  <Candle
                    x={540}
                    openY={40}
                    closeY={25}
                    highY={21}
                    lowY={44}
                  />
                </>
              )}
            </>
          ) : (
            <>
              {/* Bearish Breakdown Below VAL */}
              <line
                x1={36}
                y1={70}
                x2={728}
                y2={70}
                stroke="#38bdf8"
                strokeWidth={1.3}
                strokeDasharray="5 4"
              />
              <line
                x1={36}
                y1={106}
                x2={728}
                y2={106}
                stroke="#ef4444"
                strokeWidth={1.4}
                opacity={0.6}
              />
              <line
                x1={36}
                y1={142}
                x2={728}
                y2={142}
                stroke="#38bdf8"
                strokeWidth={1.8}
                strokeDasharray="6 4"
              />
              <text
                x={692}
                y={156}
                fill="#38bdf8"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                VAL
              </text>

              <Candle x={240} openY={104} closeY={132} highY={98} lowY={138} />
              <Candle x={272} openY={132} closeY={168} highY={128} lowY={174} />
              <Candle x={304} openY={168} closeY={192} highY={162} lowY={198} />

              {kind === "bo_step_1" && (
                <text
                  x={325}
                  y={192}
                  fill="#fda4af"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ← Significant Breakdown Below VAL!
                </text>
              )}

              {(kind === "bo_step_3" || kind === "bo_step_4") && (
                <>
                  <Candle
                    x={338}
                    openY={192}
                    closeY={166}
                    highY={160}
                    lowY={196}
                  />
                  <Candle
                    x={370}
                    openY={166}
                    closeY={140}
                    highY={135}
                    lowY={170}
                  />
                  <Candle
                    x={402}
                    openY={140}
                    closeY={172}
                    highY={138}
                    lowY={178}
                  />
                  <Candle
                    x={436}
                    openY={172}
                    closeY={208}
                    highY={168}
                    lowY={214}
                    width={13}
                  />

                  <line
                    x1={304}
                    y1={198}
                    x2={465}
                    y2={198}
                    stroke="#fbbf24"
                    strokeWidth={1.6}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={365}
                    y={212}
                    textAnchor="middle"
                    fill="#fcd34d"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    BOS (Lower Low)
                  </text>
                </>
              )}

              {kind === "bo_step_4" && (
                <>
                  <rect
                    x={462}
                    y={136}
                    width={195}
                    height={72}
                    fill="rgba(244, 63, 94, 0.15)"
                    stroke="#f43f5e"
                  />
                  <rect
                    x={462}
                    y={208}
                    width={195}
                    height={44}
                    fill="rgba(16, 185, 129, 0.18)"
                    stroke="#10b981"
                  />
                  <text
                    x={560}
                    y={156}
                    textAnchor="middle"
                    fill="#fda4af"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    SL Above BOS Lower High (1R)
                  </text>
                  <text
                    x={560}
                    y={235}
                    textAnchor="middle"
                    fill="#6ee7b7"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    SELL → 2R CONTINUATION ✓
                  </text>
                  <Candle
                    x={502}
                    openY={208}
                    closeY={230}
                    highY={204}
                    lowY={234}
                  />
                  <Candle
                    x={540}
                    openY={230}
                    closeY={250}
                    highY={226}
                    lowY={254}
                  />
                </>
              )}
            </>
          )}
        </svg>
      </div>
    );
  }

  // ===========================================================================
  // 6. UNIFIED SYSTEM PIVOT DIAGRAM (-1R Reversal -> +2R Breakout = +1R Net)
  // ===========================================================================
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
      <svg
        viewBox="0 0 760 270"
        className="h-auto w-full"
        role="img"
        aria-label="Unified Volume Profile Trading System showing transition from stopped-out Value Area Reversal (-1R) into winning Breakout Short (+2R) for +1R net session profit"
      >
        <text
          x={36}
          y={22}
          fill="#fbbf24"
          fontSize="10.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          UNIFIED SYSTEM SEQUENCE: Reversal Long (-1R) → Bearish BOS → Breakout
          Short (+2R) = +1R Net Session Profit
        </text>

        {/* Value Area */}
        <rect
          x={36}
          y={52}
          width={692}
          height={76}
          fill="rgba(56, 189, 248, 0.06)"
        />
        <line
          x1={36}
          y1={52}
          x2={728}
          y2={52}
          stroke="#38bdf8"
          strokeWidth={1.3}
          strokeDasharray="5 4"
        />
        <text
          x={44}
          y={46}
          fill="#38bdf8"
          fontSize="9.5"
          fontFamily="monospace"
        >
          VAH
        </text>

        <line
          x1={36}
          y1={128}
          x2={728}
          y2={128}
          stroke="#38bdf8"
          strokeWidth={1.8}
          strokeDasharray="6 4"
        />
        <text
          x={44}
          y={142}
          fill="#38bdf8"
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          VAL
        </text>

        {/* Price Action Sequence */}
        <path
          d="M 85 92 L 155 156 L 210 112 L 285 182 L 350 132 L 430 206 L 545 246"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={2.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Setup 1: Reversal Long (-1R) */}
        <circle cx={210} cy={112} r={6} fill="#f43f5e" />
        <rect
          x={142}
          y={66}
          width={158}
          height={34}
          rx={6}
          fill="rgba(244, 63, 94, 0.14)"
          stroke="#f43f5e"
        />
        <text
          x={221}
          y={81}
          textAnchor="middle"
          fill="#fda4af"
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          1. VA Reversal Long
        </text>
        <text
          x={221}
          y={94}
          textAnchor="middle"
          fill="#fecdd3"
          fontSize="9"
          fontFamily="monospace"
        >
          Stopped Out = -1R Loss
        </text>

        {/* Pullback Hold at VAL + Bearish BOS */}
        <circle cx={350} cy={132} r={5.5} fill="#fbbf24" />
        <text
          x={350}
          y={118}
          textAnchor="middle"
          fill="#fcd34d"
          fontSize="9.5"
          fontFamily="monospace"
        >
          Holds VAL on Pullback
        </text>

        <line
          x1={285}
          y1={182}
          x2={430}
          y2={182}
          stroke="#fbbf24"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text
          x={358}
          y={196}
          textAnchor="middle"
          fill="#fcd34d"
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          Bearish BOS (LL)
        </text>

        {/* Setup 2: Breakout Short (+2R) */}
        <circle cx={430} cy={206} r={6} fill="#10b981" />
        <rect
          x={455}
          y={178}
          width={235}
          height={54}
          rx={8}
          fill="rgba(16, 185, 129, 0.16)"
          stroke="#10b981"
        />
        <text
          x={572}
          y={199}
          textAnchor="middle"
          fill="#6ee7b7"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          2. Pivot to Breakout Short (+2R)
        </text>
        <text
          x={572}
          y={218}
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize="9.5"
          fontFamily="monospace"
        >
          -1R + 2R = +1R Net Session Gain!
        </text>
      </svg>
    </div>
  );
}
