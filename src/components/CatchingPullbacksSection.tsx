"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Compass,
  Images,
  Layers,
  Pencil,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CatchingTechniqueDiagram,
  type CatchingTechniqueVisual,
} from "./CatchingTechniqueDiagram";
import { ChecklistReferenceGallery } from "./ChecklistReferenceGallery";
import type { ChecklistReferenceImage } from "@/lib/pullbackReferences";

type TechniqueCategory = "all" | "structure" | "dynamic" | "smart_money";

interface CatchingTechnique {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  category: Exclude<TechniqueCategory, "all">;
  categoryLabel: string;
  difficulty: "Core" | "Intermediate" | "Advanced SMC";
  visual: CatchingTechniqueVisual;
  concept: string;
  bullishPlaybook: string;
  bearishPlaybook: string;
  executionRules: string[];
  warning?: {
    title: string;
    detail: string;
  };
}

const CATCHING_TECHNIQUES: CatchingTechnique[] = [
  {
    id: "catch-1",
    number: 1,
    title: "Break & Retest (Support / Resistance Flip)",
    subtitle:
      "Wait for momentum to break a key horizontal level, then enter on the pullback retest where old resistance flips to support (or support flips to resistance).",
    category: "structure",
    categoryLabel: "Structure & Levels",
    difficulty: "Core",
    visual: "break_retest",
    concept:
      "Instead of chasing breakouts where retail traders frequently get trapped, wait for price to decisively clear a key horizontal reference zone and return to retest that exact level. That polarity flip marks where the pullback ends and the next impulsive leg begins.",
    bullishPlaybook:
      "In an uptrend (higher highs and higher lows), buyers are in control. Price approaches resistance, pulls back briefly, and breaks above resistance with momentum. Wait for price to pull back and retest that broken resistance — now acting as support — for your long entry.",
    bearishPlaybook:
      "In a downtrend (lower highs and lower lows), sellers are in control. Price approaches support, bounces briefly, and breaks cleanly through support. Wait for price to pull back up to retest that broken support — now acting as resistance — to catch the next bearish leg.",
    executionRules: [
      "Confirm clear trending market structure (HH/HL for longs, LH/LL for shorts) before marking your horizontal level.",
      "Require a momentum breakout candle through the level — never pre-empt a breakout before it happens.",
      "Enter on the retest rejection when broken resistance holds as support (or broken support holds as resistance).",
    ],
  },
  {
    id: "catch-2",
    number: 2,
    title: "Fibonacci Retracement (50% & 61.8% Golden Zone)",
    subtitle:
      "Measure a clean impulsive swing to pinpoint the institutional 50% – 61.8% equilibrium magnet where pullbacks commonly terminate.",
    category: "structure",
    categoryLabel: "Structure & Levels",
    difficulty: "Core",
    visual: "fibonacci",
    concept:
      "After a strong directional impulse move, institutional and algorithmic participants watch key retracement ratios — specifically the 50% and 61.8% levels — as discount/premium magnets to reload positions in line with the primary trend.",
    bullishPlaybook:
      "After a strong upward impulsive leg, anchor the Fibonacci tool from the Swing Low to the Swing High. Watch for price to pull back into the 50% – 61.8% support zone, print a clean rejection, and resume the uptrend.",
    bearishPlaybook:
      "After a clean bearish impulsive drop, anchor the Fibonacci tool from the Swing High down to the Swing Low. Watch for price to retrace up into the 50% – 61.8% resistance zone, reject the level, and continue lower.",
    executionRules: [
      "Anchor strictly from the true Swing Low to Swing High (uptrend) or Swing High to Swing Low (downtrend) of the clean impulse leg.",
      "Focus primarily on the 50% and 61.8% retracement pocket as your high-interest zone.",
      "Confluence Rule: Never trade Fibonacci levels in isolation — always stack them with horizontal structure, candlestick rejection patterns, or a trendline.",
    ],
  },
  {
    id: "catch-3",
    number: 3,
    title: "20 & 50 Simple Moving Averages (Dynamic S/R)",
    subtitle:
      "Use the 20 SMA and 50 SMA band as dynamic support in uptrends and dynamic resistance in downtrends.",
    category: "dynamic",
    categoryLabel: "Dynamic MAs",
    difficulty: "Intermediate",
    visual: "moving_averages",
    concept:
      "During healthy trending markets, the 20 and 50 Simple Moving Averages travel alongside price as a dynamic equilibrium band. Pullbacks into the 20/50 SMA pocket repeatedly reject and launch the next trend continuation leg.",
    bullishPlaybook:
      "When price is trending steadily upward above rising 20 and 50 SMAs, watch each pullback into the 20 SMA or 50 SMA dynamic support zone for a bullish rejection to join the next impulse higher.",
    bearishPlaybook:
      "When price is trending downward below falling 20 and 50 SMAs, watch each upward pullback into the 20 SMA or 50 SMA dynamic resistance band for a bearish rejection to ride the next drop.",
    executionRules: [
      "Always pair a 20/50 SMA touch with horizontal key levels, market structure, or candlestick rejection rather than blind touch entries.",
      "Verify both the 20 SMA and 50 SMA are sloped clearly in the direction of your trade.",
    ],
    warning: {
      title: "Dangerous in Ranging / Sideways Markets",
      detail:
        "Moving averages work ONLY in trending markets. In a sideways range, price crosses back and forth through the 20 and 50 SMAs constantly — relying on them in a range will chop you up and damage your account. Use Distribution (#5) or Accumulation (#6) in ranges instead.",
    },
  },
  {
    id: "catch-4",
    number: 4,
    title: "Diagonal Trendline Pullback Bounce",
    subtitle:
      "Connect structural swing lows (uptrend) or swing highs (downtrend) to project diagonal pullback termination zones.",
    category: "structure",
    categoryLabel: "Structure & Levels",
    difficulty: "Core",
    visual: "trendline",
    concept:
      "A clean trendline connects consecutive swing lows in an uptrend or consecutive swing highs in a downtrend, creating a visual diagonal reference line where buyers or sellers consistently defend the trend.",
    bullishPlaybook:
      "In an uptrend forming higher highs and higher lows, connect at least two swing lows to project an ascending trendline. When price pulls back to touch the trendline for a 3rd+ test and rejects, buyers are stepping back in for the next bullish leg.",
    bearishPlaybook:
      "In a downtrend forming lower highs and lower lows, connect the swing highs to draw a descending trendline. Each pullback up into the trendline that rejects signals sellers stepping back in to start the next bearish leg.",
    executionRules: [
      "Require at least two clean swing touches to anchor the trendline; look to trade the 3rd+ confluence touch.",
      "Confluence Multiplier: A trendline alone isn't enough — combine the diagonal touch with a horizontal S/R flip, a 50%–61.8% Fib level, or a clear rejection candlestick.",
    ],
  },
  {
    id: "catch-5",
    number: 5,
    title: "Smart Money Distribution Breakdown & Retest",
    subtitle:
      "Catch the bearish reversal pullback after institutions engineer a buy-side liquidity sweep at the top of an uptrend range.",
    category: "smart_money",
    categoryLabel: "Smart Money & ICT",
    difficulty: "Advanced SMC",
    visual: "distribution",
    concept:
      "When an uptrend reaches a high, institutions cannot sell their entire position at once without crashing the market. Instead, they slow price into a sideways Distribution Range (equilibrium), engineer a fake breakout above resistance to trap breakout buyers (liquidity sweep), break below range support, and offer a textbook pullback entry on the retest of the broken range floor.",
    bullishPlaybook:
      "N/A — Distribution is specifically a top-of-uptrend bearish reversal & breakdown pullback model (for the bullish mirror at market bottoms, use Strategy #6: Accumulation).",
    bearishPlaybook:
      "1) Identify sideways equilibrium range after a strong uptrend. 2) Spot the Liquidity Sweep (fake breakout above range resistance trapping buyers). 3) Wait for price to break below range support, then enter SHORT when price pulls back to retest the bottom of the distribution range (old support turned resistance).",
    executionRules: [
      "Step 1 — Identify Distribution Phase: Sideways range between clear support and resistance at an uptrend high.",
      "Step 2 — Spot Liquidity Sweep: Fake breakout above range resistance that quickly snaps back inside.",
      "Step 3 — Breakdown & Pullback Entry: Wait for breakdown below range support, then enter short on the pullback retest of that broken range floor.",
    ],
  },
  {
    id: "catch-6",
    number: 6,
    title: "Smart Money Accumulation Breakout & Retest",
    subtitle:
      "Catch the bullish reversal pullback after institutions sweep sell-side liquidity below a downtrend range and break out higher.",
    category: "smart_money",
    categoryLabel: "Smart Money & ICT",
    difficulty: "Advanced SMC",
    visual: "accumulation",
    concept:
      "At the bottom of a downtrend, smart money quietly accumulates long positions inside a sideways Accumulation Range so they don't spike price prematurely. Before launching the new uptrend, they sweep below range support (trapping breakout sellers and triggering early buyers' stops), reverse aggressively above range resistance, and offer a low-risk entry when price pulls back to retest the top of the accumulation zone.",
    bullishPlaybook:
      "1) Spot sideways Accumulation Range after a strong downtrend. 2) Watch for the Liquidity Sweep below range support (false breakdown). 3) Wait for breakout above range resistance — do NOT chase — and enter LONG when price pulls back to retest the top of the accumulation range (now acting as support).",
    bearishPlaybook:
      "N/A — Accumulation is specifically a bottom-of-downtrend bullish reversal & breakout pullback model (for the bearish mirror at market tops, use Strategy #5: Distribution).",
    executionRules: [
      "Step 1 — Spot Accumulation Range: Well-defined sideways support/resistance balance after a strong downtrend.",
      "Step 2 — Confirm Smart Money Sweep: False breakdown below range support followed by rapid bullish recovery.",
      "Step 3 — Breakout & Retest Entry: Wait for range resistance to break, then buy the pullback retest onto the top of the accumulation range.",
    ],
  },
  {
    id: "catch-7",
    number: 7,
    title: "Fair Value Gap (FVG) Magnet Pullback",
    subtitle:
      "Position inside unmitigated 3-candle institutional price imbalances where aggressive displacement left unfilled orders.",
    category: "smart_money",
    categoryLabel: "Smart Money & ICT",
    difficulty: "Advanced SMC",
    visual: "fvg",
    concept:
      "When price displaces aggressively in one direction, it creates a 3-candle Fair Value Gap where Candle 1's extreme and Candle 3's extreme do not overlap. Because price moved too fast to maintain balanced two-sided order flow, price frequently pulls back like a magnet into this gap before resuming the trend.",
    bullishPlaybook:
      "In a strong bullish push, mark the open space between Candle 1's upper wick high and Candle 3's lower wick low. Wait for price to pull back into this unmitigated Bullish FVG for the first time and print a momentum rejection higher.",
    bearishPlaybook:
      "In a sharp bearish drop, mark the open space between Candle 1's lower wick low and Candle 3's upper wick high. Wait for price to retrace up into this unmitigated Bearish FVG for the first time and reject sharply lower.",
    executionRules: [
      "Rule 1 — Unmitigated Only: The FVG must be fresh (never touched or filled previously). Tested FVGs lose reliability rapidly.",
      "Rule 2 — Prefer Larger Gaps: When multiple FVGs appear in one leg, prioritize larger gaps showing stronger imbalance.",
      "Rule 3 — Prefer Origin Gaps: Among similarly sized FVGs, choose the gap closest to the origin of the impulse move (discount in uptrends, premium in downtrends) where institutions initiated.",
    ],
    warning: {
      title: "Invalidation Red Flag — Deep Close Through FVG",
      detail:
        "Watch closely how price reacts inside the FVG. If candles close deep through the gap or close completely beyond the FVG boundary, treat it as a red flag — the setup is invalidated. Demand a crisp rejection with momentum.",
    },
  },
  {
    id: "catch-8",
    number: 8,
    title: "Breaker Block Pullback (Failed Order Block Flip)",
    subtitle:
      "Trade the retest of a failed Order Block that flipped polarity after a liquidity sweep and Market Structure Shift (MSS).",
    category: "smart_money",
    categoryLabel: "Smart Money & ICT",
    difficulty: "Advanced SMC",
    visual: "breaker_block",
    concept:
      "A Breaker Block is a failed Order Block that transforms into a high-probability continuation zone. When an Order Block is expected to hold after a liquidity sweep, but price smashes and closes right through it (confirming a Market Structure Shift), that exact Order Block flips polarity into a Breaker Block — acting as a magnet for the pullback retest.",
    bullishPlaybook:
      "Price forms a Swing Low → Swing High (Bearish OB) → drops to sweep sell-side liquidity below the Swing Low → then reverses aggressively, breaking and closing above that Bearish OB (bullish MSS). The failed Bearish OB flips into a Bullish Breaker Block: enter LONG when price pulls back to retest it and rejects higher.",
    bearishPlaybook:
      "Price forms a Swing High → Swing Low (Bullish OB) → pushes up to break/sweep buy-side liquidity above the Swing High → then reverses sharply, breaking and closing below the Bullish OB (bearish MSS). That failed Bullish OB flips into a Bearish Breaker Block: enter SHORT when price pulls back into the Breaker zone and rejects lower.",
    executionRules: [
      "Confirm a prior liquidity sweep (BSL sweep before a Bearish Breaker; SSL sweep before a Bullish Breaker).",
      "Require a decisive candle body close through the failed Order Block to confirm the Market Structure Shift (MSS).",
      "Wait for the pullback retest into the Breaker Block zone and enter on rejection momentum in the new direction.",
    ],
  },
];

interface CatchingPullbacksSectionProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  referencesByStep: Record<string, ChecklistReferenceImage[]>;
  onUploadFiles: (stepId: string, files: File[]) => Promise<void>;
  onDeleteImage: (stepId: string, image: ChecklistReferenceImage) => Promise<void>;
}

export function CatchingPullbacksSection({
  isEditMode,
  onToggleEditMode,
  referencesByStep,
  onUploadFiles,
  onDeleteImage,
}: CatchingPullbacksSectionProps) {
  const [category, setCategory] = useState<TechniqueCategory>("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    "catch-1": true,
  });
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  const visibleTechniques =
    category === "all"
      ? CATCHING_TECHNIQUES
      : CATCHING_TECHNIQUES.filter((t) => t.category === category);

  const allVisibleExpanded = visibleTechniques.every((t) => expandedIds[t.id]);
  const checkedCount = CATCHING_TECHNIQUES.filter((t) => checkedIds[t.id]).length;

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleExpandOrShrinkAll() {
    const nextVal = !allVisibleExpanded;
    setExpandedIds((prev) => {
      const updated = { ...prev };
      visibleTechniques.forEach((t) => {
        updated[t.id] = nextVal;
      });
      return updated;
    });
  }

  function handleToggleEditWithExpand() {
    const entering = !isEditMode;
    onToggleEditMode();
    if (entering) {
      setExpandedIds((prev) => {
        const updated = { ...prev };
        visibleTechniques.forEach((t) => {
          updated[t.id] = true;
        });
        return updated;
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Core Philosophy Card (Extracted from Video Intro) */}
      <section
        aria-labelledby="catching-intro-heading"
        className="rounded-2xl border border-cyan-500/25 bg-[#0E131B] p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="catching-intro-heading"
                className="text-base sm:text-lg font-bold text-white"
              >
                Why Smart Traders Catch Pullbacks — Not Breakouts
              </h2>
              <p className="text-xs text-slate-400">
                8 precision techniques across trending, ranging, and SMC
                reversal structures
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-cyan-300">
            <Sparkles className="h-3 w-3" />8 Pro Techniques
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-3.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Phase 1 · Impulsive Move
            </span>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Where smart money generates profits through strong directional
              displacement. Chasing late breakouts here exposes your stop.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-3.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Phase 2 · The Pullback
            </span>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Where impatient retail traders get trapped. Price retraces to
              rebalance liquidity, test key zones, or sweep stops.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-3.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Your Edge · Termination Point
            </span>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Use the 8 confluence techniques below to pinpoint the exact zone
              where the pullback ends and the next impulse begins.
            </p>
          </div>
        </div>
      </section>

      {/* Main 8 Techniques Playbook Section */}
      <section
        aria-labelledby="techniques-playbook-heading"
        className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6"
      >
        {/* Header + Edit Gate */}
        <div className="border-b border-slate-800/80 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Layers className="h-5 w-5 text-cyan-400" />
              <h2
                id="techniques-playbook-heading"
                className="text-xl font-bold text-white"
              >
                8 Techniques for Catching Pullbacks
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              {checkedCount > 0 && (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs font-semibold text-cyan-300">
                  {checkedCount} Confluences Active
                </span>
              )}

              <button
                type="button"
                onClick={handleToggleEditWithExpand}
                aria-pressed={isEditMode}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
                  isEditMode
                    ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.28)]"
                    : "bg-[#090D13] text-slate-200 border-slate-700/90 hover:border-slate-500 hover:text-white"
                }`}
              >
                {isEditMode ? (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isEditMode && (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2 text-xs text-amber-200">
              <strong>Edit Mode Active:</strong> Drop or browse local chart
              reference screenshots (up to 10 MB per file) inside any of the 8
              techniques below. Click <strong>Done</strong> when finished.
            </div>
          )}

          {/* Filter Pills + Expand/Shrink Controls */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All Techniques (8)" },
                  { id: "structure", label: "Structure & Fibs (3)" },
                  { id: "dynamic", label: "Dynamic MAs (1)" },
                  { id: "smart_money", label: "Smart Money / ICT (4)" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition border ${
                    category === tab.id
                      ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                      : "border-slate-800 bg-[#090D13] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleExpandOrShrinkAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                {allVisibleExpanded ? (
                  <>
                    <ChevronsDownUp className="h-3.5 w-3.5 text-slate-400" />
                    <span>Shrink All</span>
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
                    <span>Unshrink All</span>
                  </>
                )}
              </button>

              {checkedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setCheckedIds({})}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Technique Cards */}
        <div className="mt-4 space-y-3">
          {visibleTechniques.map((tech) => {
            const isExpanded = Boolean(expandedIds[tech.id]);
            const isChecked = Boolean(checkedIds[tech.id]);
            const stepImages = referencesByStep[tech.id] ?? [];

            return (
              <div
                key={tech.id}
                className={`rounded-xl border transition-all ${
                  isChecked
                    ? "border-cyan-500/45 bg-cyan-500/[0.05]"
                    : isExpanded
                    ? "border-slate-700 bg-[#0B1018]"
                    : "border-slate-800/90 bg-[#090D13] hover:border-slate-700/90"
                }`}
              >
                {/* Row Header */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpand(tech.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(tech.id);
                    }
                  }}
                  className="flex cursor-pointer items-start sm:items-center justify-between gap-3.5 px-4 py-3.5 select-none"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Confluence Checkbox */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={`Mark ${tech.title} present on chart`}
                      onClick={(e) => toggleCheck(tech.id, e)}
                      className={`mt-0.5 sm:mt-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        isChecked
                          ? "border-cyan-400 bg-cyan-400 text-slate-950"
                          : "border-slate-600 bg-[#0E131B] hover:border-slate-400"
                      }`}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    {/* Number Badge */}
                    <span className="mt-0.5 sm:mt-0 flex h-6 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 font-mono text-xs font-bold text-cyan-300">
                      #{tech.number}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">
                          {tech.title}
                        </h3>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium border ${
                            tech.difficulty === "Advanced SMC"
                              ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                              : tech.difficulty === "Intermediate"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          }`}
                        >
                          {tech.difficulty}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                        {tech.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right Indicators */}
                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    {tech.warning && (
                      <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        Caution
                      </span>
                    )}
                    {stepImages.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-[#0E131B] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                        <Images className="h-3 w-3 text-cyan-400" />
                        {stepImages.length}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-cyan-400" : "text-slate-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Unshrunk Strategy Playbook */}
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-slate-800/80 px-4 pb-5 pt-4 sm:pl-12 space-y-4">
                      {/* Concept + SVG Diagram */}
                      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
                        <div className="lg:col-span-7 space-y-3">
                          <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                            {tech.concept}
                          </p>

                          {/* Bullish & Bearish Execution Comparison */}
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3">
                              <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Bullish Application</span>
                              </div>
                              <p className="text-xs leading-relaxed text-slate-300">
                                {tech.bullishPlaybook}
                              </p>
                            </div>

                            <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-3">
                              <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300">
                                <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                                <span>Bearish Application</span>
                              </div>
                              <p className="text-xs leading-relaxed text-slate-300">
                                {tech.bearishPlaybook}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-5">
                          <CatchingTechniqueDiagram visual={tech.visual} />
                        </div>
                      </div>

                      {/* Key Rules List */}
                      <div className="rounded-xl border border-slate-800 bg-[#080B10] p-3.5">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                          Execution &amp; Confluence Rules
                        </span>
                        <ul className="mt-2 space-y-1.5 pl-4 list-disc marker:text-cyan-400 text-xs leading-relaxed text-slate-300">
                          {tech.executionRules.map((rule) => (
                            <li key={rule}>{rule}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Optional Warning Box (e.g. Ranging MAs & FVG Red Flag) */}
                      {tech.warning && (
                        <div
                          role="note"
                          className="rounded-xl border border-amber-500/35 bg-amber-500/[0.07] p-3.5 border-l-4 border-l-amber-400"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
                              Warning · {tech.warning.title}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-amber-100/95">
                            {tech.warning.detail}
                          </p>
                        </div>
                      )}

                      {/* Edit-Gated 10 MB Reference Image Gallery */}
                      <ChecklistReferenceGallery
                        market="catching"
                        stepId={tech.id}
                        stepRoman={`Technique #${tech.number}`}
                        isEditing={isEditMode}
                        images={stepImages}
                        onUploadFiles={onUploadFiles}
                        onDeleteImage={onDeleteImage}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
