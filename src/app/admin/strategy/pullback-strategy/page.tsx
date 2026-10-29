"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Images,
  Info,
  Pencil,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  PullbackStepDiagram,
  type MarketDirection,
  type StepNumber,
} from "@/components/PullbackStepDiagram";
import { ChecklistReferenceGallery } from "@/components/ChecklistReferenceGallery";
import {
  fetchAllChecklistReferences,
  removeChecklistReference,
  uploadChecklistReference,
  validateReferenceFile,
  type ChecklistReferenceImage,
} from "@/lib/pullbackReferences";

interface AsymmetryBreakdownCard {
  sideLabel: string;
  ruleBadge: string;
  tone: "grab" | "break";
  description: string;
}

interface ChecklistStep {
  id: string;
  roman: string;
  stepNumber: StepNumber;
  title: string;
  explanation: string;
  asymmetryCards?: AsymmetryBreakdownCard[];
  validationTip: string;
}

interface MarketPullbackConfig {
  heading: string;
  abstract: string;
  checklistPrompt: string;
  steps: ChecklistStep[];
}

const PULLBACK_CONFIG: Record<MarketDirection, MarketPullbackConfig> = {
  bullish: {
    heading: "Valid Pullback in Bullish Market",
    abstract:
      "When price moves higher it is called a bullish market — so in a bullish market the bearish candles are the pullbacks.",
    checklistPrompt:
      "But to identify a valid pullback in a bullish market you have to check the following.",
    steps: [
      {
        id: "bull-1",
        roman: "(I)",
        stepNumber: 1,
        title:
          "Mark the highest bullish candlestick before the pullback candlestick.",
        explanation:
          "Scan the upward impulse move and locate the bullish candle that printed the highest peak (upper wick high) immediately prior to the retracement candles. Even if minor inside candles form beside it without breaking higher, this extreme bullish candle remains your structural anchor.",
        validationTip:
          "Focus on the true highest wick peak of the bullish impulse candle before bearish retracement begins.",
      },
      {
        id: "bull-2",
        roman: "(II)",
        stepNumber: 2,
        title: "Mark the low of that highest bullish candlestick.",
        explanation:
          "Project a horizontal reference level from the exact low (including the lower shadow/wick) of that highest bullish candlestick. This level defines the liquidity threshold that separates a genuine structural pullback from harmless inside-bar consolidation.",
        validationTip:
          "Always measure from the bottom tip of the lower wick — not just the candle body open.",
      },
      {
        id: "bull-3",
        roman: "(III)",
        stepNumber: 3,
        title:
          "Check if the low of that highest bullish candlestick is grabbed by the pullback candlesticks.",
        explanation:
          "Confirm that one or more subsequent pullback candlesticks trade below that marked low — a lower wick sweep alone is sufficient. Grabbing this low collects resting sell-side liquidity beneath the anchor candle and qualifies the retracement as a pullback candidate.",
        validationTip:
          "If pullback candles stay completely inside the anchor candle's range without sweeping its low, it is NOT a valid pullback yet.",
      },
      {
        id: "bull-4",
        roman: "(IV)",
        stepNumber: 4,
        title:
          "Check that after the low (of the highest bullish candlestick) is grabbed, the high (of the highest bullish candlestick) is broken.",
        explanation:
          "After the anchor candle's low has been grabbed, wait for bullish momentum to step back in and break above the high of that highest bullish candlestick with a candle close above it. Breaking that high confirms that the pullback has completed and the bullish impulse leg has resumed.",
        validationTip:
          "Wait for structure confirmation — the low grab happens first, followed by a confirmed break above the anchor high.",
      },
      {
        id: "bull-5",
        roman: "(V)",
        stepNumber: 5,
        title:
          "Wick Grab vs Closing Break — The Asymmetry Rule: verify a wick grab below the low AND a full candle close above the high.",
        explanation:
          "The asymmetric rule for a valid bullish pullback is what separates a real institutional retracement from a stop-hunt or fake-out.",
        asymmetryCards: [
          {
            sideLabel: "GRAB SIDE · Low of Highest Bullish Candle",
            ruleBadge: "Wick Is Enough ✓",
            tone: "grab",
            description:
              "In a bullish leg, smart money frequently sweeps below the marked low of the highest bullish candlestick with just a lower wick to trigger resting sell stops. That wick sweep alone qualifies as the grab — a candle body close below the low is NOT required.",
          },
          {
            sideLabel: "BREAK SIDE · High of Highest Bullish Candle",
            ruleBadge: "Candle Must Close Above ✓",
            tone: "break",
            description:
              "For the bullish continuation break, an upper wick poking above the marked high is NOT enough. The candle body must close above that high. A wick that pierces the high without closing above it is a stop-hunt against buyers, not a confirmed bullish continuation.",
          },
        ],
        validationTip:
          "This single asymmetry is why a valid bullish pullback works so well — it filters out stop-hunt pullbacks that sweep the low on the grab side yet have no institutional follow-through close above the high.",
      },
    ],
  },
  bearish: {
    heading: "Valid Pullback in Bearish Market",
    abstract:
      "When price moves lower it is called a bearish market — so in a bearish market the bullish candles are the pullbacks.",
    checklistPrompt:
      "But to identify a valid pullback in a bearish market you have to check the following.",
    steps: [
      {
        id: "bear-1",
        roman: "(I)",
        stepNumber: 1,
        title:
          "Mark the lowest bearish candlestick before the pullback candlestick.",
        explanation:
          "Examine the downward impulse leg and identify the bearish candle that reached the lowest point (lower wick low) right before bullish retracement candles appear. This most extreme bearish candle acts as your anchor reference candle.",
        validationTip:
          "Anchor to the bearish candle with the lowest wick extreme before price begins retracing upward.",
      },
      {
        id: "bear-2",
        roman: "(II)",
        stepNumber: 2,
        title: "Mark the high of that lowest bearish candlestick.",
        explanation:
          "Draw or note a horizontal level across the exact high (including the upper wick) of that lowest bearish candlestick. Price must reach above this threshold to turn minor consolidation into an actual pullback sweep.",
        validationTip:
          "Mark the very top of the upper wick of that lowest bearish candlestick.",
      },
      {
        id: "bear-3",
        roman: "(III)",
        stepNumber: 3,
        title:
          "Check if the high (of that lowest bearish candlestick) is grabbed by the pullback candlesticks.",
        explanation:
          "Verify that a subsequent pullback candlestick (or multi-candle retracement) trades above that marked high — an upper wick sweep alone is sufficient — to collect buy-side liquidity resting above the anchor bearish candle.",
        validationTip:
          "Any bullish candle that stays strictly below the marked high is an inside bar, not a valid pullback.",
      },
      {
        id: "bear-4",
        roman: "(IV)",
        stepNumber: 4,
        title:
          "Check that after the high (of that lowest bearish candlestick) is grabbed, the low (of that lowest bearish candlestick) is broken.",
        explanation:
          "Once the high of the lowest bearish candlestick has been grabbed, confirm that sellers regain control and push price down to break the low of that lowest bearish candlestick with a candle close below it. That break confirms the completed bearish pullback and trend continuation.",
        validationTip:
          "Sequence matters: first the high is grabbed by the pullback, then the low is broken on bearish continuation.",
      },
      {
        id: "bear-5",
        roman: "(V)",
        stepNumber: 5,
        title:
          "Wick Grab vs Closing Break — The Asymmetry Rule: verify a wick grab above the high AND a full candle close below the low.",
        explanation:
          "The asymmetric rule for a valid bearish pullback is what separates a real institutional retracement from a stop-hunt or fake-out.",
        asymmetryCards: [
          {
            sideLabel: "GRAB SIDE · High of Lowest Bearish Candle",
            ruleBadge: "Wick Is Enough ✓",
            tone: "grab",
            description:
              "In a bearish leg, smart money frequently sweeps above the marked high of the lowest bearish candlestick with just an upper wick to trigger resting buy stops. That wick sweep alone qualifies as the grab — a candle body close above the high is NOT required.",
          },
          {
            sideLabel: "BREAK SIDE · Low of Lowest Bearish Candle",
            ruleBadge: "Candle Must Close Below ✓",
            tone: "break",
            description:
              "For the bearish continuation break, a lower wick poking below the marked low is NOT enough. The candle body must close below that low. A wick that pierces the low without closing below it is a stop-hunt against sellers, not a confirmed bearish continuation.",
          },
        ],
        validationTip:
          "This single asymmetry is why a valid bearish pullback works so well — it filters out stop-hunt pullbacks that sweep the high on the grab side yet have no institutional follow-through close below the low.",
      },
    ],
  },
};

export default function PullbackStrategyPage() {
  const [market, setMarket] = useState<MarketDirection>("bullish");

  // Edit mode is OFF by default — users must click 'Edit' in the chosen pullback market header to upload
  const [isEditMode, setIsEditMode] = useState(false);

  // Track expanded ("unshrunk") state per item ID — collapsed by default
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Track checked pre-trade checklist marks per item ID
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  // Reference images per step ID (loaded from Supabase Storage 'pullback-references' or preview store)
  const [referencesByStep, setReferencesByStep] = useState<
    Record<string, ChecklistReferenceImage[]>
  >({});
  const [migrationHint, setMigrationHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllChecklistReferences()
      .then(({ byStep, migrationHint: hint }) => {
        if (cancelled) return;
        setReferencesByStep(byStep);
        if (hint) setMigrationHint(hint);
      })
      .catch(() => {
        // Silent initial load fallback
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeConfig = PULLBACK_CONFIG[market];
  const isBullish = market === "bullish";

  const checkedCount = activeConfig.steps.filter(
    (s) => checkedIds[s.id]
  ).length;
  const totalSteps = activeConfig.steps.length;
  const allChecked = checkedCount === totalSteps;
  const allExpanded = activeConfig.steps.every((s) => expandedIds[s.id]);

  function handleSelectMarket(nextMarket: MarketDirection) {
    setMarket(nextMarket);
    // Always return to read-only view mode by default when switching market
    setIsEditMode(false);
  }

  function handleToggleEditMode() {
    const enteringEdit = !isEditMode;
    setIsEditMode(enteringEdit);

    // When clicking 'Edit', automatically unshrink the active market's steps so the upload sections are immediately visible
    if (enteringEdit) {
      setExpandedIds((prev) => {
        const updated = { ...prev };
        activeConfig.steps.forEach((s) => {
          updated[s.id] = true;
        });
        return updated;
      });
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleExpandOrShrinkAll() {
    const nextValue = !allExpanded;
    setExpandedIds((prev) => {
      const updated = { ...prev };
      activeConfig.steps.forEach((s) => {
        updated[s.id] = nextValue;
      });
      return updated;
    });
  }

  function handleResetChecks() {
    setCheckedIds((prev) => {
      const updated = { ...prev };
      activeConfig.steps.forEach((s) => {
        updated[s.id] = false;
      });
      return updated;
    });
  }

  async function handleUploadStepFiles(stepId: string, files: File[]) {
    for (const file of files) {
      const validationError = validateReferenceFile(file);
      if (validationError) {
        throw new Error(validationError);
      }
    }

    const uploadedItems: ChecklistReferenceImage[] = [];
    for (const file of files) {
      const created = await uploadChecklistReference(market, stepId, file);
      uploadedItems.push(created);
    }

    setReferencesByStep((prev) => ({
      ...prev,
      [stepId]: [...(prev[stepId] ?? []), ...uploadedItems],
    }));
  }

  async function handleDeleteStepImage(
    stepId: string,
    image: ChecklistReferenceImage
  ) {
    await removeChecklistReference(image);
    setReferencesByStep((prev) => ({
      ...prev,
      [stepId]: (prev[stepId] ?? []).filter((item) => item.id !== image.id),
    }));
  }

  return (
    <div className="space-y-7">
      {/* Screen Header with Bullish / Bearish Market Selector */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
              Strategy
            </span>
            <span className="text-slate-700">/</span>
            <span className="font-mono text-xs text-slate-400">
              Pullback Strategy
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Pullback Strategy
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Select market direction and verify each structural condition before
            entering a trade.
          </p>
        </div>

        {/* Header Market Mode Options: Bullish vs Bearish Market */}
        <div
          role="tablist"
          aria-label="Market Direction"
          className="inline-grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-[#0B0F16] p-1.5 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isBullish}
            onClick={() => handleSelectMarket("bullish")}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              isBullish
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <TrendingUp
              className={`h-4 w-4 ${
                isBullish ? "text-emerald-400" : "text-slate-500"
              }`}
            />
            <span>Bullish Market</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={!isBullish}
            onClick={() => handleSelectMarket("bearish")}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              !isBullish
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/35 shadow-[0_0_20px_rgba(244,63,94,0.12)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <TrendingDown
              className={`h-4 w-4 ${
                !isBullish ? "text-rose-400" : "text-slate-500"
              }`}
            />
            <span>Bearish Market</span>
          </button>
        </div>
      </div>

      {/* Part 1 (Always Visible in Both Bullish & Bearish): Core Pullback Definition */}
      <section
        aria-labelledby="pullback-definition-heading"
        className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-[#090D13] text-emerald-400">
            <BookOpenCheck className="h-4 w-4" />
          </div>
          <div>
            <h2
              id="pullback-definition-heading"
              className="text-sm font-semibold uppercase tracking-wider text-slate-200"
            >
              What is a Pullback?
            </h2>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            Pullback in trading is a retracement of an impulse move, which can
            be a single candle or a number of candlesticks.
          </p>
          <p>
            Bearish candlesticks in a bullish move and bullish candlesticks in a
            bearish move are simply called pullbacks.
          </p>
          <p className="rounded-xl border border-slate-800/90 bg-[#090D13] px-4 py-3 text-slate-200">
            A valid pullback has a specific structure: the pullback candle has
            to grab the low (or high) of the most extreme opposite-color candle
            in the impulse, and the impulse leg has to then resume by breaking
            the high (or low) of that candle.
          </p>
        </div>
      </section>

      {/* Optional Migration Hint if Supabase is connected before running the storage migration */}
      {migrationHint && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>{migrationHint}</span>
        </div>
      )}

      {/* Part 2: Chosen Market Section (Header with 'Edit' button + Abstract + Collapsible Checklist) */}
      <section
        aria-labelledby="market-pullback-heading"
        className={`rounded-2xl border p-6 transition-colors ${
          isBullish
            ? "border-emerald-500/25 bg-[#0E131B]"
            : "border-rose-500/25 bg-[#0E131B]"
        }`}
      >
        {/* Chosen Pullback Market Header + 'Edit' Button */}
        <div className="border-b border-slate-800/80 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  isBullish ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <h2
                id="market-pullback-heading"
                className="text-xl font-bold text-white"
              >
                {activeConfig.heading}
              </h2>
            </div>

            {/* Right Actions: Checked Counter + Edit Toggle */}
            <div className="flex items-center gap-2.5">
              <span
                className={`rounded-full px-3 py-1 font-mono text-xs font-semibold border ${
                  isBullish
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {checkedCount} / {totalSteps} Checked
              </span>

              <button
                type="button"
                onClick={handleToggleEditMode}
                aria-pressed={isEditMode}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border ${
                  isEditMode
                    ? isBullish
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.28)]"
                      : "bg-rose-500 text-white border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.28)]"
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
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2 text-xs text-amber-200">
              <span>
                <strong>Edit Mode Active:</strong> Drop or browse local reference
                images (up to 10 MB per file) inside any checklist step below.
                Click <strong>Done</strong> when finished.
              </span>
            </div>
          )}

          {/* Abstract Box */}
          <div
            className={`mt-4 rounded-xl border px-4 py-3.5 text-sm leading-relaxed ${
              isBullish
                ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-100"
                : "border-rose-500/20 bg-rose-500/[0.06] text-rose-100"
            }`}
          >
            <span className="mr-2 font-mono text-[11px] font-semibold uppercase tracking-wider opacity-75">
              Abstract:
            </span>
            {activeConfig.abstract}
          </div>
        </div>

        {/* Checklist Intro & Controls */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-200">
            {activeConfig.checklistPrompt}
          </p>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExpandOrShrinkAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              {allExpanded ? (
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
                onClick={handleResetChecks}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible / Shrink-Unshrink Checklist Items */}
        <div className="mt-4 space-y-3">
          {activeConfig.steps.map((step) => {
            const isExpanded = Boolean(expandedIds[step.id]);
            const isChecked = Boolean(checkedIds[step.id]);
            const stepImages = referencesByStep[step.id] ?? [];

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-all ${
                  isChecked
                    ? isBullish
                      ? "border-emerald-500/40 bg-emerald-500/[0.05]"
                      : "border-rose-500/40 bg-rose-500/[0.05]"
                    : isExpanded
                    ? "border-slate-700 bg-[#0B1018]"
                    : "border-slate-800/90 bg-[#090D13] hover:border-slate-700/90"
                }`}
              >
                {/* Clickable Row Header — Unshrinks/Collapses Explanation & References */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpand(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(step.id);
                    }
                  }}
                  className="flex cursor-pointer items-start sm:items-center justify-between gap-3.5 px-4 py-3.5 select-none"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Pre-Trade Checkmark Toggle */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={`Mark ${step.roman} verified`}
                      onClick={(e) => toggleCheck(step.id, e)}
                      className={`mt-0.5 sm:mt-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        isChecked
                          ? isBullish
                            ? "border-emerald-400 bg-emerald-500 text-slate-950"
                            : "border-rose-400 bg-rose-500 text-white"
                          : "border-slate-600 bg-[#0E131B] hover:border-slate-400"
                      }`}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    {/* Roman Numeral Badge */}
                    <span
                      className={`mt-0.5 sm:mt-0 shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold border ${
                        isBullish
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/25 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {step.roman}
                    </span>

                    {/* Exact Checklist Rule Title */}
                    <span
                      className={`text-sm font-medium leading-snug transition-colors ${
                        isChecked ? "text-white" : "text-slate-200"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>

                  {/* Right Side: Saved Reference Count Pill + Collapse / Unshrink Indicator */}
                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    {stepImages.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-[#0E131B] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                        <Images className="h-3 w-3 text-emerald-400" />
                        {stepImages.length}
                      </span>
                    )}
                    <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
                      {isExpanded ? "Hide" : "Explain"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isExpanded
                          ? isBullish
                            ? "rotate-180 text-emerald-400"
                            : "rotate-180 text-rose-400"
                          : "text-slate-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Unshrunk (Expanded) Explanation + Candlestick Structure + Reference Images */}
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-slate-800/80 px-4 pb-4 pt-4 sm:pl-12">
                      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
                        <div className="lg:col-span-7 space-y-3">
                          <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                            {step.explanation}
                          </p>

                          {/* Optional Grab Side vs Break Side Breakdown Cards (Step V Asymmetry Rule) */}
                          {step.asymmetryCards && (
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              {step.asymmetryCards.map((card) => {
                                const isGrab = card.tone === "grab";
                                return (
                                  <div
                                    key={card.sideLabel}
                                    className={`rounded-xl border p-3 ${
                                      isGrab
                                        ? "border-amber-500/25 bg-amber-500/[0.05]"
                                        : isBullish
                                        ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                                        : "border-rose-500/25 bg-rose-500/[0.06]"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                        {card.sideLabel}
                                      </span>
                                      <span
                                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold border ${
                                          isGrab
                                            ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                                            : isBullish
                                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                                            : "border-rose-500/30 bg-rose-500/15 text-rose-300"
                                        }`}
                                      >
                                        {card.ruleBadge}
                                      </span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-300">
                                      {card.description}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="rounded-lg border border-slate-800 bg-[#080B10] px-3 py-2.5 text-xs leading-relaxed text-slate-400">
                            <strong className="font-semibold text-slate-200">
                              {step.asymmetryCards
                                ? "Why It Works: "
                                : "Chart Check: "}
                            </strong>
                            {step.validationTip}
                          </div>
                        </div>

                        <div className="lg:col-span-5">
                          <PullbackStepDiagram
                            market={market}
                            step={step.stepNumber}
                          />
                        </div>
                      </div>

                      {/* Reference Images Gallery (Read-only by default; Local Upload Dropzone enabled ONLY in Edit Mode) */}
                      <ChecklistReferenceGallery
                        market={market}
                        stepId={step.id}
                        stepRoman={step.roman}
                        isEditing={isEditMode}
                        images={stepImages}
                        onUploadFiles={handleUploadStepFiles}
                        onDeleteImage={handleDeleteStepImage}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All-Checked Validation Readiness Banner */}
        {allChecked && (
          <div
            role="status"
            className={`mt-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 ${
              isBullish
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              <CheckCircle2
                className={`h-5 w-5 shrink-0 ${
                  isBullish ? "text-emerald-400" : "text-rose-400"
                }`}
              />
              <span>
                Valid {isBullish ? "Bullish" : "Bearish"} Pullback Confirmed (
                {totalSteps}/{totalSteps} conditions verified). Setup satisfies
                Pullback Strategy structure &amp; Asymmetry Rule.
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
