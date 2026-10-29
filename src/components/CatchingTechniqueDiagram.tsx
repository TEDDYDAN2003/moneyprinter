import React from "react";

export type CatchingTechniqueVisual =
  | "break_retest"
  | "fibonacci"
  | "moving_averages"
  | "trendline"
  | "distribution"
  | "accumulation"
  | "fvg"
  | "breaker_block";

interface CatchingTechniqueDiagramProps {
  visual: CatchingTechniqueVisual;
}

export function CatchingTechniqueDiagram({
  visual,
}: CatchingTechniqueDiagramProps) {
  return (
    <div className="rounded-xl border border-slate-800/90 bg-[#080B10] p-3">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
        <span>
          {visual === "break_retest" && "S/R Flip · Break & Retest"}
          {visual === "fibonacci" && "50% – 61.8% Fib Golden Zone"}
          {visual === "moving_averages" && "20 SMA & 50 SMA Dynamic Band"}
          {visual === "trendline" && "Diagonal Trendline Bounce"}
          {visual === "distribution" && "Distribution Sweep & Retest"}
          {visual === "accumulation" && "Accumulation Sweep & Retest"}
          {visual === "fvg" && "3-Candle Unmitigated FVG"}
          {visual === "breaker_block" && "Failed OB → Breaker Flip"}
        </span>
        <span className="text-cyan-400">Blueprint</span>
      </div>

      {/* 1. Break & Retest */}
      {visual === "break_retest" && (
        <svg
          viewBox="0 0 310 148"
          className="h-36 w-full select-none"
          role="img"
          aria-label="Break and retest pullback diagram"
        >
          {/* Key Resistance -> Support Flip Zone */}
          <rect
            x="20"
            y="72"
            width="270"
            height="12"
            rx="2"
            fill="rgba(56, 189, 248, 0.12)"
            stroke="#38BDF8"
            strokeOpacity="0.45"
            strokeDasharray="4 2"
          />
          <text x="28" y="67" fill="#94A3B8" fontSize="8.5" fontFamily="monospace">
            Old Resistance
          </text>
          <text
            x="284"
            y="97"
            textAnchor="end"
            fill="#34D399"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            New Support (Entry)
          </text>

          <polyline
            points="24,128 76,76 102,98 158,34 206,76 276,18"
            fill="none"
            stroke="#10B981"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="76" cy="76" r="4" fill="#F59E0B" />
          <circle
            cx="206"
            cy="76"
            r="6"
            fill="rgba(16,185,129,0.25)"
            stroke="#34D399"
            strokeWidth="1.5"
          />
          <text
            x="206"
            y="108"
            textAnchor="middle"
            fill="#34D399"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            Retest ✓
          </text>
        </svg>
      )}

      {/* 2. Fibonacci 50% - 61.8% */}
      {visual === "fibonacci" && (
        <svg
          viewBox="0 0 310 148"
          className="h-36 w-full select-none"
          role="img"
          aria-label="Fibonacci 50 to 61.8 percent pullback diagram"
        >
          {/* Swing High (0%) & Swing Low (100%) */}
          <line
            x1="44"
            y1="26"
            x2="286"
            y2="26"
            stroke="#475569"
            strokeDasharray="2 3"
          />
          <text x="286" y="22" textAnchor="end" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            0.0% (Swing High)
          </text>

          {/* Golden Zone 50% (y=76) to 61.8% (y=89) */}
          <rect
            x="105"
            y="76"
            width="181"
            height="15"
            rx="2"
            fill="rgba(245, 158, 11, 0.16)"
            stroke="#F59E0B"
            strokeOpacity="0.55"
          />
          <text
            x="284"
            y="86"
            textAnchor="end"
            fill="#FBBF24"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            50% – 61.8% Zone
          </text>

          <line
            x1="34"
            y1="128"
            x2="286"
            y2="128"
            stroke="#475569"
            strokeDasharray="2 3"
          />
          <text x="286" y="140" textAnchor="end" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            100% (Swing Low)
          </text>

          <polyline
            points="36,128 118,26 184,84 264,16"
            fill="none"
            stroke="#10B981"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="184"
            cy="84"
            r="5.5"
            fill="rgba(245,158,11,0.25)"
            stroke="#FBBF24"
            strokeWidth="1.5"
          />
          <text
            x="184"
            y="108"
            textAnchor="middle"
            fill="#34D399"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            Fib Reject ✓
          </text>
        </svg>
      )}

      {/* 3. 20 & 50 SMA Dynamic Support/Resistance */}
      {visual === "moving_averages" && (
        <svg
          viewBox="0 0 310 148"
          className="h-36 w-full select-none"
          role="img"
          aria-label="20 and 50 simple moving average dynamic support diagram"
        >
          {/* 50 SMA (Amber Slower Curve) */}
          <path
            d="M 20 132 Q 145 102 290 54"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeDasharray="4 2"
          />
          {/* 20 SMA (Cyan Faster Curve) */}
          <path
            d="M 20 120 Q 145 86 290 36"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
          />

          {/* Price Action Bouncing off 20/50 SMA Band */}
          <polyline
            points="24,114 74,72 108,94 168,42 208,68 274,16"
            fill="none"
            stroke="#10B981"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="108" cy="94" r="4.5" fill="#38BDF8" />
          <circle cx="208" cy="68" r="5" fill="#34D399" />

          <text x="286" y="32" textAnchor="end" fill="#38BDF8" fontSize="8" fontWeight="700" fontFamily="monospace">
            20 SMA
          </text>
          <text x="286" y="66" textAnchor="end" fill="#FBBF24" fontSize="8" fontWeight="700" fontFamily="monospace">
            50 SMA
          </text>
          <text x="208" y="88" textAnchor="middle" fill="#34D399" fontSize="8.5" fontWeight="700" fontFamily="monospace">
            Dynamic Bounce ✓
          </text>
        </svg>
      )}

      {/* 4. Trendline Bounce */}
      {visual === "trendline" && (
        <svg
          viewBox="0 0 310 148"
          className="h-36 w-full select-none"
          role="img"
          aria-label="Ascending trendline pullback bounce diagram"
        >
          {/* Ascending Trendline */}
          <line
            x1="24"
            y1="132"
            x2="288"
            y2="48"
            stroke="#38BDF8"
            strokeWidth="1.8"
            strokeDasharray="5 3"
          />

          {/* Price Action Forming HH / HL Along Trendline */}
          <polyline
            points="32,129 76,82 114,103 168,48 212,72 276,18"
            fill="none"
            stroke="#10B981"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="129" r="3.5" fill="#38BDF8" />
          <circle cx="114" cy="103" r="4" fill="#38BDF8" />
          <circle
            cx="212"
            cy="72"
            r="5.5"
            fill="rgba(16,185,129,0.22)"
            stroke="#34D399"
            strokeWidth="1.5"
          />
          <text x="114" y="119" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            HL 2
          </text>
          <text
            x="218"
            y="92"
            textAnchor="middle"
            fill="#34D399"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            3rd Touch Entry ✓
          </text>
        </svg>
      )}

      {/* 5. Smart Money Distribution Breakdown & Retest */}
      {visual === "distribution" && (
        <svg
          viewBox="0 0 310 150"
          className="h-36 w-full select-none"
          role="img"
          aria-label="Distribution liquidity sweep breakdown and pullback retest diagram"
        >
          {/* Distribution Equilibrium Box */}
          <rect
            x="56"
            y="38"
            width="126"
            height="42"
            rx="3"
            fill="rgba(148, 163, 184, 0.08)"
            stroke="#64748B"
            strokeDasharray="3 2"
          />
          {/* Extended Range Support -> Resistance Retest Line */}
          <line
            x1="182"
            y1="80"
            x2="282"
            y2="80"
            stroke="#F43F5E"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Price Path: Uptrend -> Range -> Sweep High -> Breakdown -> Retest -> Drop */}
          <polyline
            points="18,124 56,46 78,76 102,42 124,74 148,18 168,76 196,112 228,80 282,136"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Liquidity Sweep Highlight */}
          <circle cx="148" cy="18" r="4.5" fill="#F59E0B" />
          <text
            x="148"
            y="11"
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="8"
            fontWeight="700"
            fontFamily="monospace"
          >
            Liquidity Sweep
          </text>

          {/* Retest Entry Highlight */}
          <circle
            cx="228"
            cy="80"
            r="5.5"
            fill="rgba(244,63,94,0.25)"
            stroke="#FB7185"
            strokeWidth="1.5"
          />
          <text
            x="244"
            y="71"
            textAnchor="middle"
            fill="#FB7185"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            Short Retest ✓
          </text>
        </svg>
      )}

      {/* 6. Smart Money Accumulation Breakout & Retest */}
      {visual === "accumulation" && (
        <svg
          viewBox="0 0 310 150"
          className="h-36 w-full select-none"
          role="img"
          aria-label="Accumulation liquidity sweep breakout and pullback retest diagram"
        >
          {/* Accumulation Balance Box */}
          <rect
            x="56"
            y="70"
            width="126"
            height="42"
            rx="3"
            fill="rgba(148, 163, 184, 0.08)"
            stroke="#64748B"
            strokeDasharray="3 2"
          />
          {/* Extended Range Top -> Support Retest Line */}
          <line
            x1="182"
            y1="70"
            x2="282"
            y2="70"
            stroke="#10B981"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Price Path: Downtrend -> Range -> Sweep Low -> Breakout -> Retest -> Rally */}
          <polyline
            points="18,24 56,104 78,74 102,108 124,76 148,132 168,74 196,38 228,70 282,16"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Liquidity Sweep Below Support */}
          <circle cx="148" cy="132" r="4.5" fill="#F59E0B" />
          <text
            x="148"
            y="145"
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="8"
            fontWeight="700"
            fontFamily="monospace"
          >
            Sweep Below Support
          </text>

          {/* Retest Entry */}
          <circle
            cx="228"
            cy="70"
            r="5.5"
            fill="rgba(16,185,129,0.25)"
            stroke="#34D399"
            strokeWidth="1.5"
          />
          <text
            x="244"
            y="86"
            textAnchor="middle"
            fill="#34D399"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            Long Retest ✓
          </text>
        </svg>
      )}

      {/* 7. Fair Value Gap (FVG) Magnet Pullback */}
      {visual === "fvg" && (
        <svg
          viewBox="0 0 310 148"
          className="h-36 w-full select-none"
          role="img"
          aria-label="Fair value gap 3 candle imbalance pullback diagram"
        >
          {/* Shaded Unmitigated FVG between C1 High (y=94) and C3 Low (y=66) */}
          <rect
            x="48"
            y="66"
            width="232"
            height="28"
            rx="3"
            fill="rgba(16, 185, 129, 0.14)"
            stroke="#10B981"
            strokeOpacity="0.5"
            strokeDasharray="4 2"
          />
          <text
            x="274"
            y="83"
            textAnchor="end"
            fill="#34D399"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            Unmitigated FVG
          </text>

          {/* 3 Displacement Candles */}
          {/* C1: High at y=94 */}
          <line x1="48" y1="94" x2="48" y2="132" stroke="#34D399" strokeWidth="1.8" />
          <rect x="41" y="100" width="14" height="24" rx="2" fill="#10B981" />
          {/* C2: Big Impulse Candle creating imbalance */}
          <line x1="78" y1="48" x2="78" y2="106" stroke="#34D399" strokeWidth="1.8" />
          <rect x="71" y="52" width="14" height="48" rx="2" fill="#10B981" />
          {/* C3: Low at y=66 (no overlap with C1 high y=94) */}
          <line x1="108" y1="26" x2="108" y2="66" stroke="#34D399" strokeWidth="1.8" />
          <rect x="101" y="32" width="14" height="24" rx="2" fill="#10B981" />

          {/* Pullback into FVG + Clean Rejection Continuation */}
          <polyline
            points="116,32 156,56 188,80 258,16"
            fill="none"
            stroke="#34D399"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="188" cy="80" r="5" fill="#FBBF24" />
          <text
            x="188"
            y="108"
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            1st Tap Reject ✓
          </text>
        </svg>
      )}

      {/* 8. Breaker Block Pullback (Failed Order Block Flip) */}
      {visual === "breaker_block" && (
        <svg
          viewBox="0 0 310 150"
          className="h-36 w-full select-none"
          role="img"
          aria-label="Breaker block failed order block pullback diagram"
        >
          {/* Bullish OB (left) -> Flips into Bearish Breaker Block (right) */}
          <rect
            x="64"
            y="74"
            width="92"
            height="22"
            rx="3"
            fill="rgba(16, 185, 129, 0.12)"
            stroke="#10B981"
            strokeOpacity="0.45"
          />
          <rect
            x="156"
            y="74"
            width="130"
            height="22"
            rx="3"
            fill="rgba(244, 63, 94, 0.15)"
            stroke="#F43F5E"
            strokeOpacity="0.55"
            strokeDasharray="4 2"
          />
          <text x="72" y="88" fill="#34D399" fontSize="7.5" fontFamily="monospace">
            Failed OB
          </text>
          <text
            x="280"
            y="88"
            textAnchor="end"
            fill="#FB7185"
            fontSize="8"
            fontWeight="700"
            fontFamily="monospace"
          >
            Breaker Block
          </text>

          {/* Price Path: Swing High (46) -> Swing Low OB (88) -> BSL Sweep HH (18) -> Sharp MSS Drop (122) -> Retest Breaker (84) -> Continuation Drop (138) */}
          <polyline
            points="22,66 48,44 76,88 124,18 168,120 212,84 274,138"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="124" cy="18" r="4" fill="#F59E0B" />
          <text x="124" y="11" textAnchor="middle" fill="#FBBF24" fontSize="8" fontFamily="monospace">
            BSL Sweep
          </text>

          <circle
            cx="212"
            cy="84"
            r="5.5"
            fill="rgba(244,63,94,0.28)"
            stroke="#FB7185"
            strokeWidth="1.5"
          />
          <text
            x="216"
            y="67"
            textAnchor="middle"
            fill="#FB7185"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            Breaker Retest ✓
          </text>
        </svg>
      )}
    </div>
  );
}
