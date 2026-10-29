import React from "react";
import type { MarketDirection } from "./PullbackStepDiagram";

export type TradeFlowVisualKind =
  | "htf_bias"
  | "impulse_anchor"
  | "grab_sweep"
  | "closing_break"
  | "ob_retrace_zone"
  | "ltf_mss_entry";

interface TradeFlowDiagramProps {
  market: MarketDirection;
  visual: TradeFlowVisualKind;
}

export function TradeFlowDiagram({ market, visual }: TradeFlowDiagramProps) {
  const isBull = market === "bullish";
  const accentStroke = isBull ? "#10B981" : "#F43F5E";
  const accentText = isBull ? "#34D399" : "#FB7185";
  const accentFill = isBull
    ? "rgba(16, 185, 129, 0.12)"
    : "rgba(244, 63, 94, 0.12)";

  return (
    <div className="rounded-xl border border-slate-800/90 bg-[#080B10] p-3">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-500">
        <span>
          {visual === "htf_bias" && "1D / 4H Structure Context"}
          {visual === "impulse_anchor" && "Anchor Candle & Grab Level"}
          {visual === "grab_sweep" && "Pullback Liquidity Grab"}
          {visual === "closing_break" && "Body-Close BOS Confirmation"}
          {visual === "ob_retrace_zone" && "IDM / OB / Order Flow Retrace"}
          {visual === "ltf_mss_entry" && "LTF MSS · Stop · Liquidity TP"}
        </span>
        <span className={isBull ? "text-emerald-400" : "text-rose-400"}>
          {isBull ? "Bullish Flow" : "Bearish Flow"}
        </span>
      </div>

      {/* 1. Higher-Timeframe Structure Bias (1D / 4H) */}
      {visual === "htf_bias" && (
        <svg
          viewBox="0 0 310 145"
          className="h-36 w-full select-none"
          role="img"
          aria-label={`${market} higher timeframe structure diagram`}
        >
          {[32, 72, 112].map((y) => (
            <line
              key={y}
              x1="12"
              y1={y}
              x2="298"
              y2={y}
              stroke="#1E293B"
              strokeOpacity="0.45"
            />
          ))}

          {isBull ? (
            <>
              <polyline
                points="24,122 78,68 118,96 184,38 226,66 284,18"
                fill="none"
                stroke={accentStroke}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[
                { x: 78, y: 68, lbl: "HH" },
                { x: 118, y: 96, lbl: "HL" },
                { x: 184, y: 38, lbl: "HH" },
                { x: 226, y: 66, lbl: "HL" },
                { x: 284, y: 18, lbl: "BSL ↑" },
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="3.5" fill={accentText} />
                  <text
                    x={pt.x}
                    y={pt.lbl === "HL" ? pt.y + 15 : pt.y - 8}
                    textAnchor="middle"
                    fill={pt.lbl === "HL" ? "#94A3B8" : accentText}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {pt.lbl}
                  </text>
                </g>
              ))}
            </>
          ) : (
            <>
              <polyline
                points="24,22 78,76 118,48 184,106 226,78 284,126"
                fill="none"
                stroke={accentStroke}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[
                { x: 78, y: 76, lbl: "LL" },
                { x: 118, y: 48, lbl: "LH" },
                { x: 184, y: 106, lbl: "LL" },
                { x: 226, y: 78, lbl: "LH" },
                { x: 284, y: 126, lbl: "SSL ↓" },
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="3.5" fill={accentText} />
                  <text
                    x={pt.x}
                    y={pt.lbl === "LH" ? pt.y - 8 : pt.y + 15}
                    textAnchor="middle"
                    fill={pt.lbl === "LH" ? "#94A3B8" : accentText}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {pt.lbl}
                  </text>
                </g>
              ))}
            </>
          )}
        </svg>
      )}

      {/* 2. Impulse Leg + Extreme Candle + Grab Level */}
      {visual === "impulse_anchor" && (
        <svg
          viewBox="0 0 310 145"
          className="h-36 w-full select-none"
          role="img"
          aria-label={`${market} anchor candle and grab level diagram`}
        >
          {/* Impulse Candles */}
          {(isBull
            ? [
                { x: 52, h: 105, l: 134, o: 128, c: 110 },
                { x: 96, h: 74, l: 115, o: 110, c: 80 },
                { x: 140, h: 30, l: 92, o: 82, c: 40, anchor: true },
              ]
            : [
                { x: 52, h: 12, l: 42, o: 18, c: 36 },
                { x: 96, h: 30, l: 72, o: 36, c: 66 },
                { x: 140, h: 54, l: 116, o: 64, c: 106, anchor: true },
              ]
          ).map((c) => {
            const top = Math.min(c.o, c.c);
            const bh = Math.abs(c.c - c.o);
            return (
              <g key={c.x}>
                {c.anchor && (
                  <rect
                    x={c.x - 16}
                    y={isBull ? 24 : 48}
                    width="32"
                    height="74"
                    rx="5"
                    fill={accentFill}
                    stroke={accentStroke}
                    strokeWidth="1.2"
                  />
                )}
                <line
                  x1={c.x}
                  y1={c.h}
                  x2={c.x}
                  y2={c.l}
                  stroke={accentText}
                  strokeWidth="1.8"
                />
                <rect
                  x={c.x - 8}
                  y={top}
                  width="16"
                  height={bh}
                  rx="2"
                  fill={accentStroke}
                />
              </g>
            );
          })}

          {/* Grab Level Dashed Line */}
          <line
            x1="130"
            y1={isBull ? 92 : 54}
            x2="282"
            y2={isBull ? 92 : 54}
            stroke="#F59E0B"
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />
          <text
            x="215"
            y={isBull ? 106 : 45}
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
          >
            {isBull ? "GRAB LEVEL (Anchor Low)" : "GRAB LEVEL (Anchor High)"}
          </text>
          <text
            x="140"
            y={isBull ? 17 : 134}
            textAnchor="middle"
            fill={accentText}
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
          >
            {isBull ? "Highest Bullish" : "Lowest Bearish"}
          </text>
        </svg>
      )}

      {/* 3. Pullback Wick Grab (Single Candle or Cluster) */}
      {visual === "grab_sweep" && (
        <svg
          viewBox="0 0 310 145"
          className="h-36 w-full select-none"
          role="img"
          aria-label={`${market} pullback wick grab diagram`}
        >
          {/* Grab threshold */}
          <line
            x1="68"
            y1={isBull ? 94 : 52}
            x2="275"
            y2={isBull ? 94 : 52}
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          {/* Anchor + Cluster Grab */}
          {(isBull
            ? [
                { x: 78, h: 34, l: 94, o: 86, c: 44, bull: true },
                { x: 132, h: 44, l: 88, o: 50, c: 78, bull: false },
                { x: 184, h: 66, l: 118, o: 74, c: 90, bull: false },
              ]
            : [
                { x: 78, h: 52, l: 112, o: 60, c: 102, bull: false },
                { x: 132, h: 58, l: 102, o: 96, c: 68, bull: true },
                { x: 184, h: 28, l: 80, o: 72, c: 56, bull: true },
              ]
          ).map((c) => (
            <g key={c.x}>
              <line
                x1={c.x}
                y1={c.h}
                x2={c.x}
                y2={c.l}
                stroke={c.bull ? "#34D399" : "#FB7185"}
                strokeWidth="1.8"
              />
              <rect
                x={c.x - 8}
                y={Math.min(c.o, c.c)}
                width="16"
                height={Math.abs(c.c - c.o)}
                rx="2"
                fill={c.bull ? "#10B981" : "#F43F5E"}
              />
            </g>
          ))}
          <circle
            cx="184"
            cy={isBull ? 110 : 36}
            r="11"
            fill="rgba(245, 158, 11, 0.18)"
            stroke="#F59E0B"
            strokeWidth="1.3"
          />
          <text
            x="184"
            y={isBull ? 136 : 17}
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
          >
            Wick Sweep = Valid Grab ✓
          </text>
        </svg>
      )}

      {/* 4. Closing Break Confirmation (Valid Pullback Locked) */}
      {visual === "closing_break" && (
        <svg
          viewBox="0 0 310 145"
          className="h-36 w-full select-none"
          role="img"
          aria-label={`${market} closing break valid pullback confirmation diagram`}
        >
          {/* Grab & Break Lines */}
          <line
            x1="54"
            y1={isBull ? 98 : 48}
            x2="195"
            y2={isBull ? 98 : 48}
            stroke="#F59E0B"
            strokeWidth="1.3"
            strokeDasharray="3 3"
          />
          <line
            x1="64"
            y1={isBull ? 42 : 104}
            x2="280"
            y2={isBull ? 42 : 104}
            stroke={accentStroke}
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />

          {(isBull
            ? [
                { x: 64, h: 42, l: 98, o: 90, c: 50, bull: true },
                { x: 124, h: 64, l: 116, o: 70, c: 94, bull: false },
                { x: 184, h: 52, l: 102, o: 94, c: 58, bull: true },
                { x: 244, h: 16, l: 66, o: 60, c: 22, bull: true },
              ]
            : [
                { x: 64, h: 48, l: 104, o: 56, c: 96, bull: false },
                { x: 124, h: 30, l: 82, o: 76, c: 52, bull: true },
                { x: 184, h: 44, l: 94, o: 52, c: 88, bull: false },
                { x: 244, h: 80, l: 130, o: 86, c: 124, bull: false },
              ]
          ).map((c) => (
            <g key={c.x}>
              <line
                x1={c.x}
                y1={c.h}
                x2={c.x}
                y2={c.l}
                stroke={c.bull ? "#34D399" : "#FB7185"}
                strokeWidth="1.8"
              />
              <rect
                x={c.x - 8}
                y={Math.min(c.o, c.c)}
                width="16"
                height={Math.abs(c.c - c.o)}
                rx="2"
                fill={c.bull ? "#10B981" : "#F43F5E"}
              />
            </g>
          ))}

          <text
            x="244"
            y={isBull ? 11 : 141}
            textAnchor="middle"
            fill={accentText}
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
          >
            {isBull ? "Candle Closes Above ✓" : "Candle Closes Below ✓"}
          </text>
        </svg>
      )}

      {/* 5. Use Valid Pullback as Inducement / Order Block / Order Flow Zone */}
      {visual === "ob_retrace_zone" && (
        <svg
          viewBox="0 0 310 145"
          className="h-36 w-full select-none"
          role="img"
          aria-label={`${market} inducement order block retrace zone diagram`}
        >
          {/* Shaded OB / Valid Pullback Zone */}
          <rect
            x="76"
            y={isBull ? 84 : 32}
            width="214"
            height="28"
            rx="4"
            fill={accentFill}
            stroke={accentStroke}
            strokeOpacity="0.45"
            strokeDasharray="4 2"
          />
          <text
            x="284"
            y={isBull ? 101 : 49}
            textAnchor="end"
            fill={accentText}
            fontSize="8.5"
            fontWeight="700"
            fontFamily="monospace"
          >
            {isBull ? "Bullish OB / Order Flow Zone" : "Bearish OB / Order Flow Zone"}
          </text>

          {isBull ? (
            <>
              <polyline
                points="22,128 76,68 106,98 168,24 214,62 246,94"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* BOS Line */}
              <line
                x1="76"
                y1="68"
                x2="155"
                y2="68"
                stroke="#10B981"
                strokeDasharray="3 3"
              />
              <text
                x="118"
                y="62"
                textAnchor="middle"
                fill="#34D399"
                fontSize="8.5"
                fontFamily="monospace"
              >
                BOS
              </text>
              <circle cx="246" cy="94" r="5" fill="#10B981" />
              <text
                x="246"
                y="125"
                textAnchor="middle"
                fill="#34D399"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                Retrace Into Zone
              </text>
            </>
          ) : (
            <>
              <polyline
                points="22,18 76,78 106,48 168,122 214,84 246,52"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="76"
                y1="78"
                x2="155"
                y2="78"
                stroke="#F43F5E"
                strokeDasharray="3 3"
              />
              <text
                x="118"
                y="90"
                textAnchor="middle"
                fill="#FB7185"
                fontSize="8.5"
                fontFamily="monospace"
              >
                BOS
              </text>
              <circle cx="246" cy="52" r="5" fill="#F43F5E" />
              <text
                x="246"
                y="24"
                textAnchor="middle"
                fill="#FB7185"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                Retrace Into Zone
              </text>
            </>
          )}
        </svg>
      )}

      {/* 6. LTF MSS Entry + Stop Beyond Extreme + Draw on Liquidity TP */}
      {visual === "ltf_mss_entry" && (
        <svg
          viewBox="0 0 310 150"
          className="h-38 w-full select-none"
          role="img"
          aria-label={`${market} LTF MSS entry stop loss and take profit diagram`}
        >
          {isBull ? (
            <>
              {/* Reward Box (Entry y=88 up to TP y=22) */}
              <rect
                x="170"
                y="22"
                width="116"
                height="66"
                fill="rgba(16, 185, 129, 0.12)"
                stroke="#10B981"
                strokeOpacity="0.4"
              />
              {/* Risk Box (Entry y=88 down to SL y=126) */}
              <rect
                x="170"
                y="88"
                width="116"
                height="38"
                fill="rgba(244, 63, 94, 0.14)"
                stroke="#F43F5E"
                strokeOpacity="0.4"
              />

              {/* LTF Price Action tapping zone -> MSS -> Entry -> TP */}
              <polyline
                points="24,62 62,102 88,82 114,114 146,72 170,88 248,22"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* MSS Line */}
              <line
                x1="88"
                y1="82"
                x2="152"
                y2="82"
                stroke="#34D399"
                strokeDasharray="3 2"
              />
              <text
                x="120"
                y="76"
                textAnchor="middle"
                fill="#34D399"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                LTF MSS
              </text>

              {/* Labels: TP, ENTRY, STOP */}
              <text
                x="280"
                y="17"
                textAnchor="end"
                fill="#34D399"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                TP · Old High / EQH / FVG
              </text>
              <text
                x="280"
                y="85"
                textAnchor="end"
                fill="#F8FAFC"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                LONG ENTRY
              </text>
              <text
                x="280"
                y="139"
                textAnchor="end"
                fill="#FB7185"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                STOP (Below Extreme + Buffer)
              </text>
            </>
          ) : (
            <>
              {/* Risk Box (Entry y=62 up to SL y=24) */}
              <rect
                x="170"
                y="24"
                width="116"
                height="38"
                fill="rgba(244, 63, 94, 0.14)"
                stroke="#F43F5E"
                strokeOpacity="0.4"
              />
              {/* Reward Box (Entry y=62 down to TP y=128) */}
              <rect
                x="170"
                y="62"
                width="116"
                height="66"
                fill="rgba(16, 185, 129, 0.12)"
                stroke="#10B981"
                strokeOpacity="0.4"
              />

              {/* LTF Price Action tapping zone -> MSS -> Entry -> TP */}
              <polyline
                points="24,88 62,48 88,68 114,36 146,78 170,62 248,128"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* MSS Line */}
              <line
                x1="88"
                y1="68"
                x2="152"
                y2="68"
                stroke="#FB7185"
                strokeDasharray="3 2"
              />
              <text
                x="120"
                y="80"
                textAnchor="middle"
                fill="#FB7185"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                LTF MSS
              </text>

              {/* Labels: STOP, ENTRY, TP */}
              <text
                x="280"
                y="18"
                textAnchor="end"
                fill="#FB7185"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                STOP (Above Extreme + Buffer)
              </text>
              <text
                x="280"
                y="59"
                textAnchor="end"
                fill="#F8FAFC"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                SHORT ENTRY
              </text>
              <text
                x="280"
                y="141"
                textAnchor="end"
                fill="#34D399"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                TP · Old Low / EQL / FVG
              </text>
            </>
          )}
        </svg>
      )}
    </div>
  );
}
