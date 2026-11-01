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

export function LiquiditySweepDiagram({
  kind,
  direction = "bullish",
}: LiquiditySweepDiagramProps) {
  const isBull = direction === "bullish";

  // ==========================================================================
  // 1. STEP 1: EXTERNAL RANGE LIQUIDITY (ERL) vs INTERNAL RANGE LIQUIDITY (IRL)
  // ==========================================================================
  if (kind === "forms_of_liquidity") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 230"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 1 Diagram: External vs Internal Range Liquidity (${direction})`}
        >
          <rect
            x="10"
            y="10"
            width="720"
            height="210"
            rx="12"
            fill="#0B1018"
            stroke="#1e293b"
          />

          <text
            x="26"
            y="32"
            fill={isBull ? "#6ee7b7" : "#fda4af"}
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "BULLISH CONTEXT: IRL (BULLISH FVG FUEL) → ATTACKS UPPER ERL (BSL)"
              : "BEARISH CONTEXT: IRL (BEARISH FVG FUEL) → ATTACKS LOWER ERL (SSL)"}
          </text>

          {/* Upper ERL (BSL - Swing High) */}
          <line
            x1="50"
            y1="62"
            x2="690"
            y2="62"
            stroke="#10b981"
            strokeWidth="1.6"
            strokeDasharray="6 4"
          />
          <text
            x="54"
            y="54"
            fill="#34d399"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            $$$ EXTERNAL RANGE LIQUIDITY (ERL) · BUY-SIDE LIQUIDITY (BSL / SWING HIGH)
          </text>

          {/* Lower ERL (SSL - Swing Low) */}
          <line
            x1="50"
            y1="184"
            x2="690"
            y2="184"
            stroke="#f43f5e"
            strokeWidth="1.6"
            strokeDasharray="6 4"
          />
          <text
            x="54"
            y="200"
            fill="#fda4af"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            $$$ EXTERNAL RANGE LIQUIDITY (ERL) · SELL-SIDE LIQUIDITY (SSL / SWING LOW)
          </text>

          {isBull ? (
            <>
              {/* Bullish FVG (IRL = Fuel) Box inside impulse leg */}
              <rect
                x="205"
                y="116"
                width="310"
                height="26"
                rx="4"
                fill="#10b981"
                fillOpacity="0.16"
                stroke="#10b981"
                strokeOpacity="0.55"
              />
              <text
                x="218"
                y="133"
                fill="#6ee7b7"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                INTERNAL RANGE LIQUIDITY (IRL) = BULLISH FVG (&quot;FUEL&quot;)
              </text>

              {/* Price Path: Swing Low -> Swing High -> Taps IRL FVG -> Attacks BSL */}
              <polyline
                points="85,184 220,108 295,62 415,128 575,44"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="85" cy="184" r="5" fill="#f43f5e" />
              <circle cx="295" cy="62" r="5" fill="#10b981" />
              <circle cx="415" cy="128" r="6" fill="#fbbf24" />
              <circle cx="575" cy="44" r="5.5" fill="#10b981" />
              <text
                x="388"
                y="156"
                fill="#fcd34d"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Refuels in IRL (FVG)
              </text>
              <text
                x="586"
                y="48"
                fill="#6ee7b7"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                BSL Targeted!
              </text>
            </>
          ) : (
            <>
              {/* Bearish FVG (IRL = Fuel) Box inside bearish impulse leg */}
              <rect
                x="205"
                y="102"
                width="310"
                height="26"
                rx="4"
                fill="#f43f5e"
                fillOpacity="0.16"
                stroke="#f43f5e"
                strokeOpacity="0.55"
              />
              <text
                x="218"
                y="119"
                fill="#fda4af"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                INTERNAL RANGE LIQUIDITY (IRL) = BEARISH FVG (&quot;FUEL&quot;)
              </text>

              {/* Price Path: Swing High -> Swing Low -> Retraces to Bearish FVG -> Attacks SSL */}
              <polyline
                points="85,62 220,136 295,184 415,115 575,202"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="85" cy="62" r="5" fill="#10b981" />
              <circle cx="295" cy="184" r="5" fill="#f43f5e" />
              <circle cx="415" cy="115" r="6" fill="#fbbf24" />
              <circle cx="575" cy="202" r="5.5" fill="#f43f5e" />
              <text
                x="386"
                y="94"
                fill="#fcd34d"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Refuels in IRL (FVG)
              </text>
              <text
                x="586"
                y="206"
                fill="#fda4af"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                SSL Targeted!
              </text>
            </>
          )}
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 2. STEP 2: ORDER FLOW VIA BOS (CONTINUATION) & CHoCH (REVERSAL SIGNAL)
  // ==========================================================================
  if (kind === "order_flow_bos_choch") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 225"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 2 Diagram: Order Flow BOS and CHoCH (${direction})`}
        >
          {/* Left Panel: Continuation BOS vs CHoCH */}
          <rect
            x="10"
            y="10"
            width="352"
            height="205"
            rx="10"
            fill="#0B1018"
            stroke={isBull ? "#10b981" : "#f43f5e"}
            strokeOpacity="0.4"
          />
          <text
            x="24"
            y="31"
            fill={isBull ? "#6ee7b7" : "#fda4af"}
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "BULLISH ORDER FLOW (BSL = BOS · SSL = CHoCH)"
              : "BEARISH ORDER FLOW (SSL = BOS · BSL = CHoCH)"}
          </text>

          {isBull ? (
            <>
              <polyline
                points="32,168 96,104 142,138 222,68 270,114 338,46"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Prior BSL broken */}
              <line
                x1="96"
                y1="104"
                x2="205"
                y2="104"
                stroke="#10b981"
                strokeDasharray="4 3"
              />
              <text
                x="116"
                y="98"
                fill="#6ee7b7"
                fontSize="9"
                fontFamily="monospace"
              >
                BSL Run (BOS)
              </text>

              {/* Current BOS (Upper BSL) */}
              <line
                x1="222"
                y1="68"
                x2="342"
                y2="68"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="228"
                y="61"
                fill="#34d399"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                BSL = Next BOS
              </text>

              {/* Current CHoCH (Lower SSL) */}
              <line
                x1="142"
                y1="138"
                x2="318"
                y2="138"
                stroke="#f59e0b"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <text
                x="150"
                y="152"
                fill="#fcd34d"
                fontSize="9.5"
                fontFamily="monospace"
              >
                SSL = Current CHoCH Level
              </text>
              <text
                x="24"
                y="194"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Trade WITH Bullish Order Flow → Target BSL
              </text>
            </>
          ) : (
            <>
              <polyline
                points="32,54 96,118 142,84 222,154 270,108 338,176"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="96"
                y1="118"
                x2="205"
                y2="118"
                stroke="#f43f5e"
                strokeDasharray="4 3"
              />
              <text
                x="116"
                y="131"
                fill="#fda4af"
                fontSize="9"
                fontFamily="monospace"
              >
                SSL Run (BOS)
              </text>

              {/* Current BOS (Lower SSL) */}
              <line
                x1="222"
                y1="154"
                x2="342"
                y2="154"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="228"
                y="168"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                SSL = Next BOS
              </text>

              {/* Current CHoCH (Upper BSL) */}
              <line
                x1="142"
                y1="84"
                x2="318"
                y2="84"
                stroke="#f59e0b"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <text
                x="150"
                y="76"
                fill="#fcd34d"
                fontSize="9.5"
                fontFamily="monospace"
              >
                BSL = Current CHoCH Level
              </text>
              <text
                x="24"
                y="194"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Trade WITH Bearish Order Flow → Target SSL
              </text>
            </>
          )}

          {/* Right Panel: CHoCH Alone != Confirmed Reversal (Wait for New BOS) */}
          <rect
            x="378"
            y="10"
            width="352"
            height="205"
            rx="10"
            fill="#0B1018"
            stroke="#f59e0b"
            strokeOpacity="0.4"
          />
          <text
            x="392"
            y="31"
            fill="#fcd34d"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CHoCH ALONE ≠ BIAS FLIP (WAIT FOR NEW BOS!)
          </text>

          {isBull ? (
            <>
              {/* Prior Bearish -> CHoCH Up -> Pullback -> New Bullish BOS Confirms Uptrend */}
              <polyline
                points="398,62 448,132 486,98 530,156 588,76 632,116 704,50"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="486"
                y1="98"
                x2="588"
                y2="98"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <text
                x="492"
                y="91"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
              >
                1. CHoCH (1st Signal)
              </text>

              <line
                x1="588"
                y1="76"
                x2="704"
                y2="76"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x="592"
                y="69"
                fill="#6ee7b7"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                2. New BOS Confirms!
              </text>
              <text
                x="392"
                y="182"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                CHoCH alone could just be a BSL sweep.
              </text>
              <text
                x="392"
                y="196"
                fill="#6ee7b7"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Break of New BOS confirms Bullish Reversal!
              </text>
            </>
          ) : (
            <>
              {/* Prior Bullish -> CHoCH Down -> Pullback -> New Bearish BOS Confirms Downtrend */}
              <polyline
                points="398,154 448,88 486,118 530,62 588,142 632,102 704,168"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="486"
                y1="118"
                x2="588"
                y2="118"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <text
                x="492"
                y="131"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
              >
                1. CHoCH (1st Signal)
              </text>

              <line
                x1="588"
                y1="142"
                x2="704"
                y2="142"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x="592"
                y="156"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                2. New BOS Confirms!
              </text>
              <text
                x="392"
                y="182"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                CHoCH alone could just be an SSL sweep.
              </text>
              <text
                x="392"
                y="196"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Break of New BOS confirms Bearish Reversal!
              </text>
            </>
          )}
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 3. STEP 3: IRL -> ERL FUEL CYCLE vs IRL DISRESPECTED WARNING
  // ==========================================================================
  if (kind === "irl_to_erl_fuel_cycle") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 225"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 3 Diagram: IRL to ERL Fuel Cycle (${direction})`}
        >
          {/* Left Panel: Healthy IRL -> ERL Trend Continuation */}
          <rect
            x="10"
            y="10"
            width="352"
            height="205"
            rx="10"
            fill="#0B1018"
            stroke="#10b981"
            strokeOpacity="0.4"
          />
          <text
            x="24"
            y="31"
            fill="#6ee7b7"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "✓ BULLISH IRL (FVG) RESPECTED → RUNS BSL"
              : "✓ BEARISH IRL (FVG) RESPECTED → RUNS SSL"}
          </text>

          {isBull ? (
            <>
              <rect
                x="92"
                y="124"
                width="105"
                height="20"
                rx="3"
                fill="#10b981"
                fillOpacity="0.2"
                stroke="#10b981"
              />
              <rect
                x="212"
                y="84"
                width="112"
                height="20"
                rx="3"
                fill="#10b981"
                fillOpacity="0.2"
                stroke="#10b981"
              />
              <polyline
                points="32,175 124,98 164,132 252,58 292,92 340,42"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="96"
                y="138"
                fill="#6ee7b7"
                fontSize="8.5"
                fontFamily="monospace"
              >
                IRL #1 (FVG)
              </text>
              <text
                x="218"
                y="98"
                fill="#6ee7b7"
                fontSize="8.5"
                fontFamily="monospace"
              >
                IRL #2 (FVG)
              </text>
              <text
                x="24"
                y="196"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Each Bullish FVG fuels the next BSL break
              </text>
            </>
          ) : (
            <>
              <rect
                x="92"
                y="82"
                width="105"
                height="20"
                rx="3"
                fill="#f43f5e"
                fillOpacity="0.2"
                stroke="#f43f5e"
              />
              <rect
                x="212"
                y="122"
                width="112"
                height="20"
                rx="3"
                fill="#f43f5e"
                fillOpacity="0.2"
                stroke="#f43f5e"
              />
              <polyline
                points="32,48 124,126 164,92 252,166 292,132 340,182"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="96"
                y="95"
                fill="#fda4af"
                fontSize="8.5"
                fontFamily="monospace"
              >
                IRL #1 (FVG)
              </text>
              <text
                x="218"
                y="135"
                fill="#fda4af"
                fontSize="8.5"
                fontFamily="monospace"
              >
                IRL #2 (FVG)
              </text>
              <text
                x="24"
                y="196"
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Each Bearish FVG fuels the next SSL break
              </text>
            </>
          )}

          {/* Right Panel: IRL Disrespected = Early Warning of CHoCH Attack */}
          <rect
            x="378"
            y="10"
            width="352"
            height="205"
            rx="10"
            fill="#0B1018"
            stroke="#f59e0b"
            strokeOpacity="0.45"
          />
          <text
            x="392"
            y="31"
            fill="#fcd34d"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ⚠ IRL DISRESPECTED → TARGETS CHoCH LEVEL!
          </text>

          {isBull ? (
            <>
              <rect
                x="475"
                y="102"
                width="165"
                height="22"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.14"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <line
                x1="435"
                y1="158"
                x2="700"
                y2="158"
                stroke="#f43f5e"
                strokeDasharray="5 3"
              />
              <polyline
                points="400,148 455,158 552,58 612,115 676,174"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="485"
                y="117"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
              >
                Bullish FVG Sliced Through!
              </text>
              <text
                x="442"
                y="172"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Attacks CHoCH (SSL) → Reversal Risk
              </text>
            </>
          ) : (
            <>
              <rect
                x="475"
                y="100"
                width="165"
                height="22"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.14"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <line
                x1="435"
                y1="62"
                x2="700"
                y2="62"
                stroke="#10b981"
                strokeDasharray="5 3"
              />
              <polyline
                points="400,72 455,62 552,162 612,108 676,46"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="485"
                y="115"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
              >
                Bearish FVG Sliced Through!
              </text>
              <text
                x="442"
                y="54"
                fill="#6ee7b7"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Attacks CHoCH (BSL) → Reversal Risk
              </text>
            </>
          )}
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 4. STEP 4A: LIQUIDITY RUN VALIDATION (FVG OVERLAPPING / BEYOND vs BEFORE)
  // ==========================================================================
  if (kind === "liquidity_run_validation") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 235"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 4A Diagram: Valid Liquidity Run vs Unconfirmed Breakout (${direction})`}
        >
          {/* Left Panel: VALID LIQUIDITY RUN */}
          <rect
            x="10"
            y="10"
            width="352"
            height="215"
            rx="10"
            fill="#0B1018"
            stroke="#10b981"
            strokeOpacity="0.45"
          />
          <text
            x="24"
            y="31"
            fill="#6ee7b7"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "✓ VALID BULLISH RUN: FVG OVERLAPS / ABOVE BSL"
              : "✓ VALID BEARISH RUN: FVG OVERLAPS / BELOW SSL"}
          </text>

          {/* ERL Line */}
          <line
            x1="28"
            y1="118"
            x2="344"
            y2="118"
            stroke="#38bdf8"
            strokeWidth="1.6"
            strokeDasharray="6 3"
          />
          <text
            x="30"
            y="111"
            fill="#38bdf8"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull ? "Previous Swing High (BSL)" : "Previous Swing Low (SSL)"}
          </text>

          {isBull ? (
            <>
              {/* FVG Overlapping BSL */}
              <rect
                x="118"
                y="96"
                width="210"
                height="28"
                rx="3"
                fill="#10b981"
                fillOpacity="0.22"
                stroke="#10b981"
              />
              {/* 3 Candles forming Valid FVG across BSL */}
              <rect x="86" y="128" width="16" height="32" rx="2" fill="#10b981" />
              <line x1="94" y1="124" x2="94" y2="164" stroke="#10b981" strokeWidth="1.6" />

              <rect x="122" y="88" width="18" height="46" rx="2" fill="#10b981" />
              <line x1="131" y1="82" x2="131" y2="138" stroke="#10b981" strokeWidth="1.6" />

              <rect x="160" y="64" width="18" height="30" rx="2" fill="#10b981" />
              <line x1="169" y1="58" x2="169" y2="96" stroke="#10b981" strokeWidth="1.6" />

              {/* Retracement Bounce */}
              <polyline
                points="178,68 236,108 312,48"
                fill="none"
                stroke="#34d399"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="24"
                y="188"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                FVG created DURING or AFTER breakout
              </text>
              <text
                x="24"
                y="204"
                fill="#6ee7b7"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Acts as support fuel for next leg higher!
              </text>
            </>
          ) : (
            <>
              {/* Bearish FVG Overlapping SSL */}
              <rect
                x="118"
                y="112"
                width="210"
                height="28"
                rx="3"
                fill="#f43f5e"
                fillOpacity="0.22"
                stroke="#f43f5e"
              />
              <rect x="86" y="76" width="16" height="32" rx="2" fill="#f43f5e" />
              <line x1="94" y1="72" x2="94" y2="112" stroke="#f43f5e" strokeWidth="1.6" />

              <rect x="122" y="102" width="18" height="46" rx="2" fill="#f43f5e" />
              <line x1="131" y1="98" x2="131" y2="152" stroke="#f43f5e" strokeWidth="1.6" />

              <rect x="160" y="142" width="18" height="30" rx="2" fill="#f43f5e" />
              <line x1="169" y1="140" x2="169" y2="178" stroke="#f43f5e" strokeWidth="1.6" />

              <polyline
                points="178,168 236,126 312,182"
                fill="none"
                stroke="#fb7185"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="24"
                y="192"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                Bearish FVG created DURING or BELOW SSL
              </text>
              <text
                x="24"
                y="207"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Acts as resistance fuel for next leg lower!
              </text>
            </>
          )}

          {/* Right Panel: INVALID / NOT YET A RUN (FVG FORMED BEFORE ERL) */}
          <rect
            x="378"
            y="10"
            width="352"
            height="215"
            rx="10"
            fill="#0B1018"
            stroke="#f43f5e"
            strokeOpacity="0.4"
          />
          <text
            x="392"
            y="31"
            fill="#fda4af"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "✗ NOT A RUN: FVG FORMED BEFORE (BELOW) BSL"
              : "✗ NOT A RUN: FVG FORMED BEFORE (ABOVE) SSL"}
          </text>

          <line
            x1="396"
            y1="104"
            x2="712"
            y2="104"
            stroke="#38bdf8"
            strokeWidth="1.6"
            strokeDasharray="6 3"
          />

          {isBull ? (
            <>
              {/* FVG formed BELOW BSL before breakout */}
              <rect
                x="432"
                y="128"
                width="190"
                height="24"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.16"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <rect x="442" y="138" width="16" height="30" rx="2" fill="#10b981" />
              <rect x="478" y="108" width="18" height="36" rx="2" fill="#10b981" />
              <rect x="516" y="88" width="18" height="26" rx="2" fill="#10b981" />
              <text
                x="546"
                y="97"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
              >
                Only a close — NO post-break FVG
              </text>
              <text
                x="392"
                y="188"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                Pre-breakout FVG below BSL cannot validate Run
              </text>
              <text
                x="392"
                y="204"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
              >
                High risk of Sweep + FVG disrespect! Wait.
              </text>
            </>
          ) : (
            <>
              {/* Bearish FVG formed ABOVE SSL before breakdown */}
              <rect
                x="432"
                y="62"
                width="190"
                height="24"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.16"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <rect x="442" y="46" width="16" height="24" rx="2" fill="#f43f5e" />
              <rect x="478" y="68" width="18" height="34" rx="2" fill="#f43f5e" />
              <rect x="516" y="96" width="18" height="24" rx="2" fill="#f43f5e" />
              <text
                x="546"
                y="116"
                fill="#fcd34d"
                fontSize="9"
                fontFamily="monospace"
              >
                Only a close — NO post-break FVG
              </text>
              <text
                x="392"
                y="188"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
              >
                Pre-breakdown FVG above SSL cannot validate Run
              </text>
              <text
                x="392"
                y="204"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
              >
                High risk of Sweep + FVG disrespect! Wait.
              </text>
            </>
          )}
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 5. STEP 4B: LIQUIDITY SWEEP REVERSAL (SWEEP -> FVG DISRESPECT -> CHoCH -> FVG + BOS)
  // ==========================================================================
  if (kind === "liquidity_sweep_reversal") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
        <svg
          viewBox="0 0 740 245"
          className="h-auto w-full"
          role="img"
          aria-label={`Step 4B Diagram: Liquidity Sweep Reversal Sequence (${direction})`}
        >
          <rect
            x="10"
            y="10"
            width="720"
            height="225"
            rx="12"
            fill="#0B1018"
            stroke={isBull ? "#10b981" : "#f43f5e"}
            strokeOpacity="0.45"
          />

          <text
            x="26"
            y="32"
            fill={isBull ? "#6ee7b7" : "#fda4af"}
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {isBull
              ? "BULLISH LIQUIDITY SWEEP ANATOMY (SSL SWEEP → 3 REVERSAL SIGNALS → LONG)"
              : "BEARISH LIQUIDITY SWEEP ANATOMY (BSL SWEEP → 3 REVERSAL SIGNALS → SHORT)"}
          </text>

          {isBull ? (
            <>
              {/* SSL Swept Level */}
              <line
                x1="45"
                y1="182"
                x2="335"
                y2="182"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x="52"
                y="198"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Prior Swing Low (SSL · External Liquidity)
              </text>

              {/* Old Bearish FVG Getting Disrespected (Signal 1) */}
              <rect
                x="185"
                y="142"
                width="135"
                height="18"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.16"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <text
                x="192"
                y="154"
                fill="#fcd34d"
                fontSize="8.5"
                fontFamily="monospace"
              >
                1. Bearish FVG Disrespected
              </text>

              {/* CHoCH Line (Signal 2) */}
              <line
                x1="158"
                y1="112"
                x2="420"
                y2="112"
                stroke="#38bdf8"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <text
                x="320"
                y="105"
                fill="#38bdf8"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                2. CHoCH
              </text>

              {/* New Bullish FVG + BOS (Signal 3) */}
              <rect
                x="388"
                y="118"
                width="195"
                height="22"
                rx="4"
                fill="#10b981"
                fillOpacity="0.22"
                stroke="#10b981"
              />
              <text
                x="398"
                y="133"
                fill="#6ee7b7"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                3. Bullish FVG (Support Fuel)
              </text>

              <line
                x1="440"
                y1="78"
                x2="665"
                y2="78"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="560"
                y="71"
                fill="#34d399"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Bullish BOS Confirmed!
              </text>

              {/* Price Trajectory */}
              <polyline
                points="65,92 115,182 158,112 246,198 308,148 440,78 512,126 658,48"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="246" cy="198" r="5.5" fill="#f59e0b" />
              <text
                x="220"
                y="218"
                fill="#fcd34d"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                SSL Sweep (Fake-Out Wick)
              </text>
              <circle cx="512" cy="126" r="6" fill="#10b981" />
            </>
          ) : (
            <>
              {/* BSL Swept Level */}
              <line
                x1="45"
                y1="68"
                x2="335"
                y2="68"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <text
                x="52"
                y="60"
                fill="#6ee7b7"
                fontSize="9.5"
                fontFamily="monospace"
              >
                Prior Swing High (BSL · External Liquidity)
              </text>

              {/* Old Bullish FVG Getting Disrespected (Signal 1) */}
              <rect
                x="185"
                y="94"
                width="135"
                height="18"
                rx="3"
                fill="#f59e0b"
                fillOpacity="0.16"
                stroke="#f59e0b"
                strokeDasharray="4 3"
              />
              <text
                x="192"
                y="106"
                fill="#fcd34d"
                fontSize="8.5"
                fontFamily="monospace"
              >
                1. Bullish FVG Disrespected
              </text>

              {/* CHoCH Line (Signal 2) */}
              <line
                x1="158"
                y1="138"
                x2="420"
                y2="138"
                stroke="#38bdf8"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />
              <text
                x="320"
                y="151"
                fill="#38bdf8"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                2. CHoCH
              </text>

              {/* New Bearish FVG + BOS (Signal 3) */}
              <rect
                x="388"
                y="112"
                width="195"
                height="22"
                rx="4"
                fill="#f43f5e"
                fillOpacity="0.22"
                stroke="#f43f5e"
              />
              <text
                x="398"
                y="126"
                fill="#fda4af"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                3. Bearish FVG (Resistance Fuel)
              </text>

              <line
                x1="440"
                y1="172"
                x2="665"
                y2="172"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <text
                x="555"
                y="186"
                fill="#fda4af"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Bearish BOS Confirmed!
              </text>

              {/* Price Trajectory */}
              <polyline
                points="65,158 115,68 158,138 246,50 308,104 440,172 512,122 658,204"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="246" cy="50" r="5.5" fill="#f59e0b" />
              <text
                x="258"
                y="54"
                fill="#fcd34d"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                BSL Sweep (Fake-Out Wick)
              </text>
              <circle cx="512" cy="122" r="6" fill="#f43f5e" />
            </>
          )}
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // 6. STEP 5: TOP-DOWN (1W/4H -> 15M) + SILVER BULLET FVG EXECUTION
  // ==========================================================================
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#070A0F] p-3">
      <svg
        viewBox="0 0 740 245"
        className="h-auto w-full"
        role="img"
        aria-label={`Step 5 Diagram: 4H to 15M Top-Down Silver Bullet Execution (${direction})`}
      >
        {/* Left Panel: 4H Higher-Timeframe Order Flow & IRL POI */}
        <rect
          x="10"
          y="10"
          width="330"
          height="225"
          rx="10"
          fill="#0B1018"
          stroke="#38bdf8"
          strokeOpacity="0.4"
        />
        <text
          x="24"
          y="31"
          fill="#7dd3fc"
          fontSize="10.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          1. HTF (4H) ORDER FLOW + 4H FVG POI
        </text>

        {isBull ? (
          <>
            <line
              x1="34"
              y1="58"
              x2="316"
              y2="58"
              stroke="#10b981"
              strokeDasharray="5 3"
            />
            <text
              x="185"
              y="52"
              fill="#6ee7b7"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              4H BSL (Take Profit Target)
            </text>

            <rect
              x="110"
              y="132"
              width="195"
              height="30"
              rx="4"
              fill="#38bdf8"
              fillOpacity="0.16"
              stroke="#38bdf8"
            />
            <text
              x="120"
              y="150"
              fill="#7dd3fc"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              4H Bullish FVG (Drop to 15M!)
            </text>

            <polyline
              points="32,188 96,112 132,146 208,58 262,144 316,52"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="262" cy="144" r="6" fill="#38bdf8" />
            <text
              x="24"
              y="214"
              fill="#94a3b8"
              fontSize="9"
              fontFamily="monospace"
            >
              Check 1W Macro first · Do NOT blind-buy 4H!
            </text>
          </>
        ) : (
          <>
            <line
              x1="34"
              y1="186"
              x2="316"
              y2="186"
              stroke="#f43f5e"
              strokeDasharray="5 3"
            />
            <text
              x="185"
              y="200"
              fill="#fda4af"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              4H SSL (Take Profit Target)
            </text>

            <rect
              x="110"
              y="84"
              width="195"
              height="30"
              rx="4"
              fill="#38bdf8"
              fillOpacity="0.16"
              stroke="#38bdf8"
            />
            <text
              x="120"
              y="102"
              fill="#7dd3fc"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              4H Bearish FVG (Drop to 15M!)
            </text>

            <polyline
              points="32,56 96,132 132,98 208,186 262,98 316,194"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="262" cy="98" r="6" fill="#38bdf8" />
            <text
              x="24"
              y="218"
              fill="#94a3b8"
              fontSize="9"
              fontFamily="monospace"
            >
              Check 1W Macro first · Do NOT blind-sell 4H!
            </text>
          </>
        )}

        {/* Right Panel: 15M Reversal + "Silver Bullet" First FVG Entry */}
        <rect
          x="356"
          y="10"
          width="374"
          height="225"
          rx="10"
          fill="#0B1018"
          stroke={isBull ? "#10b981" : "#f43f5e"}
          strokeOpacity="0.45"
        />
        <text
          x="370"
          y="31"
          fill="#fcd34d"
          fontSize="10.5"
          fontFamily="monospace"
          fontWeight="bold"
        >
          2. LTF (15M) SWEEP + &quot;SILVER BULLET&quot; 1ST FVG ENTRY
        </text>

        {isBull ? (
          <>
            {/* Silver Bullet FVG Highlight */}
            <rect
              x="534"
              y="118"
              width="174"
              height="24"
              rx="4"
              fill="#fbbf24"
              fillOpacity="0.22"
              stroke="#fbbf24"
            />
            <text
              x="542"
              y="134"
              fill="#fde68a"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ★ SILVER BULLET (1st Bull FVG)
            </text>

            <polyline
              points="374,84 416,158 446,124 484,186 528,108 552,136 592,76 634,126 708,46"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="484" cy="186" r="5" fill="#f43f5e" />
            <circle cx="634" cy="126" r="6" fill="#fbbf24" />
            <text
              x="442"
              y="202"
              fill="#fda4af"
              fontSize="8.8"
              fontFamily="monospace"
            >
              15M SSL Sweep
            </text>
            <text
              x="536"
              y="70"
              fill="#6ee7b7"
              fontSize="9"
              fontFamily="monospace"
            >
              CHoCH + 15M BOS
            </text>
            <text
              x="370"
              y="218"
              fill="#6ee7b7"
              fontSize="9.2"
              fontFamily="monospace"
              fontWeight="bold"
            >
              Enter LONG at Silver Bullet FVG → Ride to 4H BSL!
            </text>
          </>
        ) : (
          <>
            {/* Silver Bullet Bearish FVG Highlight */}
            <rect
              x="534"
              y="102"
              width="174"
              height="24"
              rx="4"
              fill="#fbbf24"
              fillOpacity="0.22"
              stroke="#fbbf24"
            />
            <text
              x="542"
              y="118"
              fill="#fde68a"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ★ SILVER BULLET (1st Bear FVG)
            </text>

            <polyline
              points="374,160 416,86 446,120 484,56 528,136 552,108 592,168 634,114 708,196"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="484" cy="56" r="5" fill="#10b981" />
            <circle cx="634" cy="114" r="6" fill="#fbbf24" />
            <text
              x="442"
              y="49"
              fill="#6ee7b7"
              fontSize="8.8"
              fontFamily="monospace"
            >
              15M BSL Sweep
            </text>
            <text
              x="536"
              y="182"
              fill="#fda4af"
              fontSize="9"
              fontFamily="monospace"
            >
              CHoCH + 15M BOS
            </text>
            <text
              x="370"
              y="218"
              fill="#fda4af"
              fontSize="9.2"
              fontFamily="monospace"
              fontWeight="bold"
            >
              Enter SHORT at Silver Bullet FVG → Ride to 4H SSL!
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
