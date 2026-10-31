"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  Layers,
  Lightbulb,
  Pencil,
  RotateCcw,
  Settings2,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  VolumeProfileDiagram,
  type VpDiagramKind,
  type VpTradeDirection,
} from "@/components/VolumeProfileDiagram";
import { ChecklistReferenceGallery } from "@/components/ChecklistReferenceGallery";
import { GlobalStrategyChecklist } from "@/components/GlobalStrategyChecklist";
import {
  fetchAllChecklistReferences,
  removeChecklistReference,
  uploadChecklistReference,
  validateReferenceFile,
  type ChecklistReferenceImage,
  type ReferenceMarketScope,
} from "@/lib/pullbackReferences";

type VpStrategyKey = "poc_bounce" | "value_area_reversal" | "breakout";

interface SetupRuleItem {
  id: string;
  num: string;
  title: string;
  detail: string;
}

interface VpChecklistStep {
  id: string;
  roman: string;
  title: string;
  explanation: string;
  bullishRule: string;
  bearishRule: string;
  validationTip: string;
  warningText?: string;
  diagramKind: VpDiagramKind;
}

interface VpStrategyConfig {
  key: VpStrategyKey;
  tabLabel: string;
  timestamp: string;
  badgeText: string;
  marketScope: ReferenceMarketScope;
  heading: string;
  regimeRequirement: string;
  abstract: string;
  defaultDirection: VpTradeDirection;
  steps: VpChecklistStep[];
  limitationNote: {
    title: string;
    body: string;
    nextStrategyKey?: VpStrategyKey;
    nextStrategyLabel?: string;
  };
}

const VIDEO_SOURCE_URL = "https://www.youtube.com/watch?v=Xa2fB097ajs";

const PRE_SESSION_SETUP_STEPS: SetupRuleItem[] = [
  {
    id: "vp-setup-1",
    num: "01",
    title: "Select an Intraday Timeframe (Below 1-Day)",
    detail:
      "Choose any intraday chart below the Daily timeframe — such as 5M, 10M, 15M (featured in the guide), 45M, or 1H.",
  },
  {
    id: "vp-setup-2",
    num: "02",
    title: "Set TradingView Chart Clock to Exchange Time",
    detail:
      "Click the timezone clock in the bottom-right corner of TradingView and switch it to Exchange time so every daily session opens and closes on the true institutional candle.",
  },
  {
    id: "vp-setup-3",
    num: "03",
    title: "Select Fixed Range Volume Profile & Enable POC, VAH, and VAL",
    detail:
      "Open Prediction & Measurement Tools → Fixed Range Volume Profile (FRVP). In Style settings, enable VAH, VAL, and POC — and set POC to a bright color like Red so it stands out clearly.",
  },
  {
    id: "vp-setup-4",
    num: "04",
    title: "Set Row Size = 60 and Value Area Volume = 70%",
    detail:
      "Open the Inputs tab of FRVP, change Row Size to 60, and keep Value Area Volume at 70% (capturing the price zone where 70% of total session volume traded).",
  },
  {
    id: "vp-setup-5",
    num: "05",
    title:
      "Anchor Across Yesterday's Completed Session (First → Last Candle) & Extend Levels",
    detail:
      "Never anchor FRVP on today's developing session (levels shift live and create false signals). Always anchor from the first candle to the last candle of the previous completed session and extend POC, VAH, and VAL across today's session.",
  },
];

const VP_STRATEGIES: Record<VpStrategyKey, VpStrategyConfig> = {
  poc_bounce: {
    key: "poc_bounce",
    tabLabel: "1. POC Bounce Strategy",
    timestamp: "10:22",
    badgeText: "Prior Close Outside VA",
    marketScope: "vp_poc",
    heading: "Strategy #1 — Point of Control (POC) Bounce",
    regimeRequirement:
      "MANDATORY FILTER: Previous day's session MUST have ended OUTSIDE of the Value Area (above VAH or below VAL).",
    abstract:
      "The Point of Control (POC) marks the single price level with the highest traded volume in yesterday's range — where institutions were most active. When yesterday closed outside the Value Area and today's price retraces back to that untouched POC, a high-probability bounce reaction frequently occurs.",
    defaultDirection: "bearish",
    steps: [
      {
        id: "vp-poc-1",
        roman: "(I)",
        title:
          "Verify the previous session ended with price OUTSIDE of the Value Area.",
        explanation:
          "Apply the Fixed Range Volume Profile across yesterday's completed session and inspect where yesterday's final candle closed relative to VAH and VAL. Price must have finished outside the 70% Value Area.",
        bullishRule:
          "Yesterday's session closed ABOVE Value Area High (VAH), positioning today's POC below price as high-volume support.",
        bearishRule:
          "Yesterday's session closed BELOW Value Area Low (VAL), positioning today's POC above price as high-volume resistance.",
        validationTip:
          "Check yesterday's closing candle first — this single filter determines whether POC Bounce is valid today.",
        warningText:
          "If the previous session ended INSIDE the Value Area, it is NOT a valid POC Bounce setup — switch immediately to Strategy #2 (Value Area Reversal).",
        diagramKind: "poc_step_1",
      },
      {
        id: "vp-poc-2",
        roman: "(II)",
        title:
          "Mark yesterday's Point of Control (POC) and wait for price to approach it.",
        explanation:
          "Extend the bright red POC line horizontally across the current trading session. Do not place blind limit orders — wait patiently for live price to travel back into the POC zone.",
        bullishRule:
          "Wait for price to pull back downward from above VAH into the extended POC support line.",
        bearishRule:
          "Wait for price to rally upward from below VAL into the extended POC resistance line.",
        validationTip:
          "Let price come all the way to the POC; premature entries in mid-air ruin your risk-to-reward.",
        diagramKind: "poc_step_2",
      },
      {
        id: "vp-poc-3",
        roman: "(III)",
        title:
          "Wait for clear Price Action Rejection Confirmation right at the POC.",
        explanation:
          "Never enter solely because price touched the POC. Wait for candlestick proof that buyers or sellers are defending the highest-volume level.",
        bullishRule:
          "Look for bullish rejection on the POC — such as a strong green Bullish Engulfing candle whose body completely covers the prior red candle's body.",
        bearishRule:
          "Look for bearish rejection on the POC — such as a long upper wick piercing through POC and reversing back below it, followed by multiple red candles showing seller control.",
        validationTip:
          "Wick rejection + engulfing / consecutive momentum candles confirm institutional defense of the POC.",
        diagramKind: "poc_step_3",
      },
      {
        id: "vp-poc-4",
        roman: "(IV)",
        title:
          "Enter on confirmation, place Stop Loss slightly beyond POC, and target 2R.",
        explanation:
          "Once all three prior conditions align (prior close outside VA + POC touch + price action confirmation), execute the bounce trade with strict mechanical risk management.",
        bullishRule:
          "Enter LONG on confirmation close → Place Stop Loss slightly below the POC / rejection low → Set Take Profit at 2R (1:2 Risk-to-Reward).",
        bearishRule:
          "Enter SHORT on confirmation close → Place Stop Loss slightly above the POC / rejection wick high → Set Take Profit at 2R (1:2 Risk-to-Reward).",
        validationTip:
          "Keep your Take Profit fixed at 2R so a single winner covers two full 1R stop-outs.",
        diagramKind: "poc_step_4",
      },
    ],
    limitationNote: {
      title: "When POC Bounce Does Not Apply",
      body: "POC Bounce works best ONLY when the previous session closed outside of the Value Area. Whenever yesterday's session closed INSIDE the Value Area instead, use Strategy #2: Value Area Reversal.",
      nextStrategyKey: "value_area_reversal",
      nextStrategyLabel: "Switch to 2. Value Area Reversal",
    },
  },

  value_area_reversal: {
    key: "value_area_reversal",
    tabLabel: "2. Value Area Reversal",
    timestamp: "14:15",
    badgeText: "Prior Close Inside VA",
    marketScope: "vp_reversal",
    heading: "Strategy #2 — Value Area Reversal (Mean Reversion)",
    regimeRequirement:
      "MANDATORY FILTER: Previous day's session MUST have ended INSIDE of the Value Area (between VAL and VAH).",
    abstract:
      "Because 70% of yesterday's volume took place inside the Value Area and the session closed balanced inside it, any move outside VAH (premium) or VAL (discount) during today's session is overextended and prone to snap back inside fair value. You can repeat this setup multiple times as long as the current session hasn't ended!",
    defaultDirection: "bullish",
    steps: [
      {
        id: "vp-var-1",
        roman: "(I)",
        title:
          "Confirm the previous session ended with price INSIDE of the Value Area.",
        explanation:
          "Anchor your Fixed Range Volume Profile on yesterday's full session and verify that yesterday's closing price finished inside the 70% Value Area (between VAL and VAH).",
        bullishRule:
          "Yesterday ended in balance inside VA — preparing you to buy overextended dips below VAL.",
        bearishRule:
          "Yesterday ended in balance inside VA — preparing you to fade overextended spikes above VAH.",
        validationTip:
          "Balanced prior-session closes signal an established fair-value magnet for mean reversion.",
        diagramKind: "var_step_1",
      },
      {
        id: "vp-var-2",
        roman: "(II)",
        title:
          "Extend VAH & VAL to today's session and wait for price to cross OUTSIDE the Value Area.",
        explanation:
          "Project yesterday's VAH and VAL lines across today's session and wait for price to push outside the Value Area into overextended territory. Do NOT enter as soon as it crosses out!",
        bullishRule:
          "Price crosses BELOW Value Area Low (VAL) into relative discount — put Bullish Reversal on alert.",
        bearishRule:
          "Price crosses ABOVE Value Area High (VAH) into relative premium — put Bearish Reversal on alert.",
        validationTip:
          "Crossing outside only alerts you that price is stretched; wait for the return back inside before acting.",
        diagramKind: "var_step_2",
      },
      {
        id: "vp-var-3",
        roman: "(III)",
        title:
          "Wait for a candle BODY to close back INSIDE the Value Area (No Wick-Only Fakeouts!).",
        explanation:
          "Wait for price to reverse and cross back inside the Value Area with a full candlestick body close inside VAH/VAL. A wick poking inside while closing outside is NOT valid confirmation.",
        bullishRule:
          "After trading below VAL, wait for a green candle to CLOSE its body back ABOVE VAL (inside the Value Area).",
        bearishRule:
          "After trading above VAH, wait for a red candle to CLOSE its body back BELOW VAH (inside the Value Area).",
        validationTip:
          "Strict Body-Close Rule: Make sure the candle actually closed inside the Value Area and didn't just wick into it!",
        warningText:
          "Wicking inside the Value Area while closing outside shows failed re-acceptance — wait for an unmistakable body close inside VA.",
        diagramKind: "var_step_3",
      },
      {
        id: "vp-var-4",
        roman: "(IV)",
        title:
          "Enter on the re-entry close, place Stop Loss near the outside swing extreme, and target 2R.",
        explanation:
          "Once the candle closes back inside the Value Area, execute the reversal immediately. As long as today's session is still active, you can keep taking fresh VAH/VAL reversals if price stretches outside again.",
        bullishRule:
          "Enter BUY on body close inside VAL → Place Stop Loss near the excursion swing lows below VAL → Set Take Profit at 2R.",
        bearishRule:
          "Enter SHORT on body close inside VAH → Place Stop Loss near the excursion swing highs above VAH → Set Take Profit at 2R.",
        validationTip:
          "Repeatable edge: If a VAL buy hits 2R and later price spikes above VAH and closes back inside, you can take the VAH short too!",
        diagramKind: "var_step_4",
      },
    ],
    limitationNote: {
      title: "When Price Refuses to Stay Inside Value Area",
      body: "Price cannot mean-revert into the same Value Area forever — eventually institutions break out to build new value areas. When price breaks out with momentum or stops out a reversal, pivot directly to Strategy #3: Breakout Strategy!",
      nextStrategyKey: "breakout",
      nextStrategyLabel: "Switch to 3. Breakout Strategy",
    },
  },

  breakout: {
    key: "breakout",
    tabLabel: "3. Breakout Strategy",
    timestamp: "17:27",
    badgeText: "Any Prior Close + BOS",
    marketScope: "vp_breakout",
    heading: "Strategy #3 — Value Area Breakout & Continuation",
    regimeRequirement:
      "UNIVERSAL REGIME: Works whether the previous session closed INSIDE or OUTSIDE of the Value Area!",
    abstract:
      "When price breaks significantly outside the Value Area, pulls back to hold near the VAH/VAL boundary without falling deep back inside, and confirms with a Break of Structure (BOS), it signals institutional acceptance of new prices and launches a powerful continuation leg.",
    defaultDirection: "bullish",
    steps: [
      {
        id: "vp-bo-1",
        roman: "(I)",
        title:
          "Wait for price to break SIGNIFICANTLY outside of the Value Area in the current session.",
        explanation:
          "Whether yesterday ended inside or outside the Value Area, look for strong momentum pushing decisively beyond VAH or VAL during today's session (not a tiny 1-tick poke).",
        bullishRule:
          "Price breaks significantly ABOVE Value Area High (VAH) with clear bullish displacement.",
        bearishRule:
          "Price breaks significantly BELOW Value Area Low (VAL) with clear bearish displacement.",
        validationTip:
          "Wait after the initial breakout — at this stage we still don't know if it will continue or reverse back inside.",
        diagramKind: "bo_step_1",
      },
      {
        id: "vp-bo-2",
        roman: "(II)",
        title:
          "Wait for a pullback toward VAH / VAL that HOLDS near the boundary (No Deep Re-Entry!).",
        explanation:
          "Let price retrace back toward the broken Value Area boundary and hold around that level. It does not need to hold to the exact pip, as long as the pullback does NOT slice deep back into the Value Area.",
        bullishRule:
          "Price pulls back toward VAH from above and holds near/shallowly around VAH as new support.",
        bearishRule:
          "Price pulls back toward VAL from below and holds near/shallowly around VAL as new resistance.",
        validationTip:
          "Broken VAH flips to support; broken VAL flips to resistance.",
        warningText:
          "INVALIDATION RULE: If the pullback fails to hold and breaks deep back inside the Value Area, cancel the setup immediately and wait for the next opportunity!",
        diagramKind: "bo_step_2",
      },
      {
        id: "vp-bo-3",
        roman: "(III)",
        title:
          "Confirm a Break of Structure (BOS) in the breakout direction.",
        explanation:
          "After holding near the Value Area edge, wait for price to break the initial breakout swing structure, proving buyers/sellers have resumed the impulsive trend.",
        bullishRule:
          "Wait for price to rally off VAH and form Higher Highs (HH) breaking above the initial breakout high.",
        bearishRule:
          "Wait for price to drop off VAL and form Lower Lows (LL) breaking below the initial breakdown low.",
        validationTip:
          "BOS confirms institutional continuation and filters out premature entries during chop.",
        diagramKind: "bo_step_3",
      },
      {
        id: "vp-bo-4",
        roman: "(IV)",
        title:
          "Enter on the Break of Structure, set Stop Loss beyond the BOS swing, and target 2R.",
        explanation:
          "Once all three conditions align (significant breakout + pullback hold near VA edge + BOS in breakout direction), execute the continuation position.",
        bullishRule:
          "Enter BUY on bullish BOS → Place Stop Loss slightly below the BOS pullback Higher Low → Set Take Profit at 2R.",
        bearishRule:
          "Enter SELL on bearish BOS → Place Stop Loss slightly above the BOS pullback Lower High → Set Take Profit at 2R.",
        validationTip:
          "Even if an earlier Value Area Reversal stopped out for -1R, catching the subsequent +2R Breakout leaves you +1R net profitable for the session!",
        diagramKind: "bo_step_4",
      },
    ],
    limitationNote: {
      title: "Part of One Unified System",
      body: "You never have to guess between Reversal and Breakout in advance — let price show its hand at VAH/VAL, and pivot seamlessly using the Unified System matrix below.",
    },
  },
};

export default function VolumeProfileStrategyPage() {
  const [activeStrategy, setActiveStrategy] =
    useState<VpStrategyKey>("poc_bounce");
  const [directionByStrategy, setDirectionByStrategy] = useState<
    Record<VpStrategyKey, VpTradeDirection>
  >({
    poc_bounce: "bearish",
    value_area_reversal: "bullish",
    breakout: "bullish",
  });

  // Pre-session setup panel collapse + checkmarks
  const [foundationOpen, setFoundationOpen] = useState(true);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>(
    {}
  );

  // Edit mode & reference image uploads (reuses 10 MB pullback-references bucket)
  const [isEditingRefs, setIsEditingRefs] = useState(false);
  const [referenceImagesByStep, setReferenceImagesByStep] = useState<
    Record<string, ChecklistReferenceImage[]>
  >({});
  const [storageHint, setStorageHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRefs() {
      try {
        const res = await fetchAllChecklistReferences();
        if (!cancelled) {
          setReferenceImagesByStep(res.byStep);
          setStorageHint(res.migrationHint ?? null);
        }
      } catch {
        // Non-blocking in preview mode
      }
    }
    loadRefs();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentConfig = VP_STRATEGIES[activeStrategy];
  const currentDirection = directionByStrategy[activeStrategy];

  function toggleStepChecked(id: string) {
    setCheckedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleStepCollapsed(id: string) {
    setCollapsedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setAllStrategyStepsCollapsed(shrink: boolean) {
    setCollapsedSteps((prev) => {
      const next = { ...prev };
      for (const s of currentConfig.steps) {
        next[s.id] = shrink;
      }
      return next;
    });
  }

  function resetCurrentStrategyChecks() {
    setCheckedSteps((prev) => {
      const next = { ...prev };
      for (const s of currentConfig.steps) {
        delete next[s.id];
      }
      return next;
    });
  }

  async function handleUploadStepFiles(
    scope: ReferenceMarketScope,
    stepId: string,
    files: File[]
  ) {
    for (const f of files) {
      const err = validateReferenceFile(f);
      if (err) throw new Error(err);
    }
    const uploaded: ChecklistReferenceImage[] = [];
    for (const f of files) {
      const item = await uploadChecklistReference(scope, stepId, f);
      uploaded.push(item);
    }
    setReferenceImagesByStep((prev) => ({
      ...prev,
      [stepId]: [...(prev[stepId] || []), ...uploaded],
    }));
  }

  async function handleDeleteStepImage(
    stepId: string,
    image: ChecklistReferenceImage
  ) {
    await removeChecklistReference(image);
    setReferenceImagesByStep((prev) => ({
      ...prev,
      [stepId]: (prev[stepId] || []).filter((img) => img.id !== image.id),
    }));
  }

  const completedSetupCount = PRE_SESSION_SETUP_STEPS.filter(
    (s) => checkedSteps[s.id]
  ).length;
  const completedStrategyCount = currentConfig.steps.filter(
    (s) => checkedSteps[s.id]
  ).length;
  const allCurrentCollapsed = currentConfig.steps.every(
    (s) => collapsedSteps[s.id]
  );

  return (
    <div className="space-y-8">
      {/* Page Header + 3 Strategy Switcher Tabs */}
      <div className="flex flex-col gap-5 border-b border-slate-800/80 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Admin
              </span>
              <span className="text-slate-700">/</span>
              <span className="font-mono text-xs text-slate-400">Strategy</span>
              <span className="text-slate-700">/</span>
              <span className="font-mono text-xs text-slate-300">
                Volume Profile
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Volume Profile Strategy Blueprint
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Complete institutional Fixed Range Volume Profile (`POC`, `VAH`,
              `VAL`) setup &amp; 3-strategy execution system.
            </p>
          </div>

          <a
            href={VIDEO_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0E131B] px-3.5 py-2 font-mono text-xs text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Source Guide · Data Trader</span>
            <ExternalLink className="h-3 w-3 opacity-75" />
          </a>
        </div>

        {/* THE 3 STRATEGIES IN THE HEADER (Defined per the Video) */}
        <div
          role="tablist"
          aria-label="Volume Profile 3 Strategies"
          className="grid gap-2.5 sm:grid-cols-3 rounded-2xl border border-slate-800/90 bg-[#0B0F16] p-2"
        >
          {(Object.values(VP_STRATEGIES) as VpStrategyConfig[]).map((strat) => {
            const active = activeStrategy === strat.key;
            return (
              <button
                key={strat.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveStrategy(strat.key)}
                className={`flex flex-col items-start justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  active
                    ? "border-emerald-500/45 bg-emerald-500/15 shadow-[inset_0_1px_0_rgba(16,185,129,0.2)]"
                    : "border-transparent bg-[#0E131B]/60 hover:border-slate-800 hover:bg-[#121924]"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      active ? "text-white" : "text-slate-300"
                    }`}
                  >
                    {strat.tabLabel}
                  </span>
                  <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    {strat.timestamp}
                  </span>
                </div>
                <span
                  className={`mt-1.5 inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    active
                      ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-800 bg-[#080B10] text-slate-400"
                  }`}
                >
                  {strat.badgeText}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Shared Top Section: Volume Profile Anatomy + Mandatory 5-Step Setup & Placement Rules */}
      <section className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]">
        <button
          type="button"
          onClick={() => setFoundationOpen((prev) => !prev)}
          aria-expanded={foundationOpen}
          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-[#111824]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Volume Profile Foundation &amp; Tool Placement Checklist
              </h2>
              <p className="text-xs text-slate-400">
                Volume across price (`POC`, `VAH`, `VAL`), TradingView settings
                (`Row Size: 60` · `VA: 70%`), and the Previous-Day Session Rule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-300">
              Setup {completedSetupCount}/{PRE_SESSION_SETUP_STEPS.length}
            </span>
            <ChevronDown
              className={`h-5 w-5 text-slate-400 transition-transform ${
                foundationOpen ? "rotate-180 text-cyan-400" : ""
              }`}
            />
          </div>
        </button>

        {foundationOpen && (
          <div className="border-t border-slate-800/80 p-6 space-y-6">
            {/* Core Concept Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-4">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Point of Control (POC)
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  The single price level with the{" "}
                  <strong className="text-white">highest traded volume</strong>{" "}
                  in the range (longest histogram bar). Acts like a major
                  institutional support/resistance magnet.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-4">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Value Area (VAH &amp; VAL · 70%)
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  Contains{" "}
                  <strong className="text-white">
                    70% of all traded volume
                  </strong>
                  . Above <strong className="text-rose-300">VAH</strong> =
                  overextended Premium; below{" "}
                  <strong className="text-emerald-300">VAL</strong> =
                  overextended Discount.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-4">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  HVN (Long Bars) vs LVN (Short Bars)
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  Price{" "}
                  <strong className="text-white">
                    slows &amp; consolidates
                  </strong>{" "}
                  at High Volume Nodes (two-sided interest) and{" "}
                  <strong className="text-white">travels rapidly</strong>{" "}
                  through Low Volume Nodes (one-sided dominance).
                </p>
              </div>
            </div>

            {/* Anatomy SVG Diagram */}
            <VolumeProfileDiagram kind="anatomy_profile" />

            {/* Mandatory 5-Step Tool Setup & Previous-Day Placement Checklist */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Mandatory Pre-Session Setup &amp; Placement Rules
                  </h3>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  Check before scanning for trades
                </span>
              </div>

              <VolumeProfileDiagram kind="previous_day_placement" />

              <div className="grid gap-2.5 pt-1">
                {PRE_SESSION_SETUP_STEPS.map((rule) => {
                  const checked = !!checkedSteps[rule.id];
                  return (
                    <div
                      key={rule.id}
                      onClick={() => toggleStepChecked(rule.id)}
                      role="checkbox"
                      aria-checked={checked}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          toggleStepChecked(rule.id);
                        }
                      }}
                      className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-3.5 transition ${
                        checked
                          ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                          : "border-slate-800/90 bg-[#090D13] hover:border-slate-700"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          checked
                            ? "border-emerald-400 bg-emerald-500 text-slate-950"
                            : "border-slate-600 bg-[#0E131B]"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-cyan-400">
                            STEP {rule.num}
                          </span>
                          <p
                            className={`text-xs sm:text-sm font-semibold ${
                              checked
                                ? "text-emerald-200 line-through decoration-emerald-500/50"
                                : "text-white"
                            }`}
                          >
                            {rule.title}
                          </p>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {rule.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {storageHint && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <strong className="font-semibold text-amber-300">
            Reference Storage Notice:{" "}
          </strong>
          {storageHint}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ACTIVE SELECTED STRATEGY SECTION (1 of the 3 Header Strategies)       */}
      {/* ===================================================================== */}
      <section className="space-y-5">
        {/* Strategy Intro & Controls Card */}
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.06] to-[#0E131B] p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-300">
                <BookOpenCheck className="h-3.5 w-3.5" />
                <span>Video Chapter {currentConfig.timestamp}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {currentConfig.heading}
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                {currentConfig.abstract}
              </p>
            </div>

            {/* Checklist Progress Counter */}
            <div className="rounded-xl border border-slate-800 bg-[#090D13] px-4 py-3 text-right">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Setup Confluence
              </span>
              <p className="mt-0.5 font-mono text-xl font-bold text-emerald-400 tabular-nums">
                {completedStrategyCount} / {currentConfig.steps.length}
              </p>
            </div>
          </div>

          {/* Mandatory Regime Requirement Banner */}
          <div className="flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-medium text-cyan-200">
            <Sparkles className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{currentConfig.regimeRequirement}</span>
          </div>

          {/* Toolbar: Example Direction Toggle (Bullish Long vs Bearish Short) + Shrink/Reset/Edit */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
            {/* Diagram Direction Toggle */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-slate-400">
                Diagram Example:
              </span>
              <div className="inline-flex rounded-xl border border-slate-800 bg-[#080B10] p-1">
                <button
                  type="button"
                  onClick={() =>
                    setDirectionByStrategy((prev) => ({
                      ...prev,
                      [activeStrategy]: "bullish",
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition ${
                    currentDirection === "bullish"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Bullish (Long)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDirectionByStrategy((prev) => ({
                      ...prev,
                      [activeStrategy]: "bearish",
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition ${
                    currentDirection === "bearish"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  Bearish (Short)
                </button>
              </div>
            </div>

            {/* Shrink All / Reset / Edit Reference Uploads */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setAllStrategyStepsCollapsed(!allCurrentCollapsed)
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#090D13] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                {allCurrentCollapsed ? (
                  <>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Unshrink All</span>
                  </>
                ) : (
                  <>
                    <ChevronsDownUp className="h-3.5 w-3.5 text-slate-400" />
                    <span>Shrink All</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetCurrentStrategyChecks}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#090D13] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingRefs((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  isEditingRefs
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                    : "border-slate-800 bg-[#090D13] text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>{isEditingRefs ? "Done Editing" : "Edit"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Markable & Collapsible Strategy Checklist Cards (I)–(IV) */}
        <div className="space-y-4">
          {currentConfig.steps.map((step) => {
            const isChecked = !!checkedSteps[step.id];
            const isCollapsed = !!collapsedSteps[step.id];
            const stepImages = referenceImagesByStep[step.id] || [];

            return (
              <article
                key={step.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isChecked
                    ? "border-emerald-500/45 bg-emerald-500/[0.04]"
                    : "border-slate-800/90 bg-[#0E131B]"
                }`}
              >
                {/* Step Header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleStepChecked(step.id)}
                      aria-label={`Mark ${step.roman} complete`}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                        isChecked
                          ? "border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.4)]"
                          : "border-slate-700 bg-[#090D13] text-transparent hover:border-emerald-500/50"
                      }`}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </button>

                    <div
                      onClick={() => toggleStepCollapsed(step.id)}
                      className="cursor-pointer select-none min-w-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">
                          {step.roman}
                        </span>
                        <h3
                          className={`text-sm sm:text-base font-bold ${
                            isChecked
                              ? "text-emerald-200 line-through decoration-emerald-500/50"
                              : "text-white"
                          }`}
                        >
                          {step.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleStepCollapsed(step.id)}
                    aria-label={isCollapsed ? "Expand step" : "Shrink step"}
                    className="rounded-lg border border-slate-800 bg-[#090D13] p-1.5 text-slate-400 hover:text-white"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isCollapsed ? "" : "rotate-180 text-emerald-400"
                      }`}
                    />
                  </button>
                </div>

                {/* Expanded Step Body */}
                {!isCollapsed && (
                  <div className="border-t border-slate-800/70 px-5 py-5 space-y-4">
                    <p className="text-sm leading-relaxed text-slate-300">
                      {step.explanation}
                    </p>

                    {/* Bullish vs Bearish Specific Rules */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div
                        className={`rounded-xl border p-3.5 ${
                          currentDirection === "bullish"
                            ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                            : "border-slate-800/90 bg-[#090D13]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-emerald-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>Bullish (Long) Setup</span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                          {step.bullishRule}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl border p-3.5 ${
                          currentDirection === "bearish"
                            ? "border-rose-500/40 bg-rose-500/[0.07]"
                            : "border-slate-800/90 bg-[#090D13]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-rose-400">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <span>Bearish (Short) Setup</span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
                          {step.bearishRule}
                        </p>
                      </div>
                    </div>

                    {/* Optional Warning Callout */}
                    {step.warningText && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs leading-relaxed text-rose-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        <span>{step.warningText}</span>
                      </div>
                    )}

                    {/* Custom SVG Diagram */}
                    <VolumeProfileDiagram
                      kind={step.diagramKind}
                      direction={currentDirection}
                    />

                    {/* Validation Tip */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-[#090D13] px-3.5 py-2.5 text-xs text-slate-300">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span>
                        <strong className="font-semibold text-white">
                          Execution Check:{" "}
                        </strong>
                        {step.validationTip}
                      </span>
                    </div>

                    {/* Local <= 10 MB Reference Charts Gallery (Edit-Gated) */}
                    <ChecklistReferenceGallery
                      market={currentConfig.marketScope}
                      stepId={step.id}
                      stepRoman={step.roman}
                      isEditing={isEditingRefs}
                      images={stepImages}
                      onUploadFiles={(sid, files) =>
                        handleUploadStepFiles(
                          currentConfig.marketScope,
                          sid,
                          files
                        )
                      }
                      onDeleteImage={handleDeleteStepImage}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Shared Global Pre-Entry Risk-Reduction Checklist (Single Shared File across All Strategies) */}
        <GlobalStrategyChecklist
          direction={currentDirection}
          strategyContext={`Volume Profile · ${currentConfig.tabLabel}`}
        />

        {/* Strategy Transition / Limitation Note */}
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-[#0E131B] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-300">
              {currentConfig.limitationNote.title}
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              {currentConfig.limitationNote.body}
            </p>
          </div>
          {currentConfig.limitationNote.nextStrategyKey && (
            <button
              type="button"
              onClick={() =>
                setActiveStrategy(
                  currentConfig.limitationNote.nextStrategyKey as VpStrategyKey
                )
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
            >
              <span>{currentConfig.limitationNote.nextStrategyLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* UNIFIED SYSTEM SYNTHESIS (20:47 - 23:49 Video Conclusion)             */}
      {/* ===================================================================== */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              How All 3 Strategies Work Together as One Complete System
            </h2>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-400">
              You never pick just one setup blindly — you adapt dynamically to
              where yesterday&apos;s session closed and how today&apos;s price
              behaves around `POC`, `VAH`, and `VAL`.
            </p>
          </div>
        </div>

        {/* Decision Matrix */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-[#090D13] font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">
                  Yesterday&apos;s Session Close
                </th>
                <th className="px-4 py-3 font-semibold">
                  Live Current-Session Behavior
                </th>
                <th className="px-4 py-3 font-semibold">Strategy to Deploy</th>
                <th className="px-4 py-3 font-semibold">Stop Loss &amp; TP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              <tr className="hover:bg-[#111722]">
                <td className="px-4 py-3 font-mono text-xs text-amber-300">
                  Closed OUTSIDE Value Area
                </td>
                <td className="px-4 py-3 text-slate-300">
                  Retraces to extended POC + prints wick/engulfing rejection
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-300">
                  1. POC Bounce Strategy
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-300">
                  SL slightly beyond POC · TP = 2R
                </td>
              </tr>
              <tr className="hover:bg-[#111722]">
                <td className="px-4 py-3 font-mono text-xs text-cyan-300">
                  Closed INSIDE Value Area
                </td>
                <td className="px-4 py-3 text-slate-300">
                  Crosses outside VAH/VAL, then candle BODY closes back inside
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-300">
                  2. Value Area Reversal
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-300">
                  SL near outside swing · TP = 2R
                </td>
              </tr>
              <tr className="hover:bg-[#111722]">
                <td className="px-4 py-3 font-mono text-xs text-purple-300">
                  Inside OR Outside VA
                </td>
                <td className="px-4 py-3 text-slate-300">
                  Breaks significantly outside VA → holds edge on pullback → BOS
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-300">
                  3. Breakout Strategy
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-300">
                  SL beyond BOS swing · TP = 2R
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Adaptive Recovery Diagram (-1R Reversal -> +2R Breakout = +1R Net) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              Adaptive Recovery Example (20:47 in Video): Stopped-Out Reversal
              (-1R) → Breakout Pivot (+2R) = +1R Net Session Gain
            </span>
          </div>
          <VolumeProfileDiagram kind="unified_system_pivot" />
        </div>
      </section>
    </div>
  );
}
