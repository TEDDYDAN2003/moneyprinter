"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Crosshair,
  ExternalLink,
  Globe2,
  Images,
  Info,
  Lightbulb,
  ListOrdered,
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
import {
  TradeFlowDiagram,
  type TradeFlowVisualKind,
} from "@/components/TradeFlowDiagram";
import { ChecklistReferenceGallery } from "@/components/ChecklistReferenceGallery";
import { CatchingPullbacksSection } from "@/components/CatchingPullbacksSection";
import { GlobalStrategyChecklist } from "@/components/GlobalStrategyChecklist";
import {
  fetchAllChecklistReferences,
  removeChecklistReference,
  uploadChecklistReference,
  validateReferenceFile,
  type ChecklistReferenceImage,
  type ReferenceMarketScope,
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

interface TradeFlowStepWarning {
  title: string;
  condition: string;
  rationale: string;
  betterApproach: string;
}

interface TradeFlowStep {
  id: string;
  number: number;
  headline: string;
  summary: string;
  detail: string;
  warning?: TradeFlowStepWarning;
  visual?: TradeFlowVisualKind;
  allowReferenceUpload?: boolean;
}

interface MarketPullbackConfig {
  heading: string;
  abstract: string;
  checklistPrompt: string;
  steps: ChecklistStep[];
  ictNote: {
    intro: string;
    inducementBullet: string;
    orderBlockBullet: string;
    orderFlowBullet: string;
    closing: string;
  };
  tradeFlowHeading: string;
  tradeFlowIntro: string;
  tradeFlowSteps: TradeFlowStep[];
}

const ICT_CONCEPT_LINKS = {
  bos: "https://innercircletrader.net/tutorials/break-of-structure-bos/",
  inducement:
    "https://innercircletrader.net/tutorials/what-is-inducement-in-forex/",
  orderBlock: "https://innercircletrader.net/tutorials/ict-order-block/",
  orderFlow:
    "https://innercircletrader.net/tutorials/ict-market-order-flow-explained/",
};

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
    ictNote: {
      intro: "Valid pullback is the building block of the rest of the framework.",
      inducementBullet:
        "The first valid pullback inside a bullish leg before a bullish BOS is the Inducement.",
      orderBlockBullet:
        "The last bullish/anchor candle before the displacement that produced the bullish BOS — that is, the candle whose upside closing break confirms the valid pullback — marks the candidate Bullish Order Block zone.",
      orderFlowBullet:
        "Every valid pullback inside the upward leg becomes a bullish ICT Order Flow re-entry zone.",
      closing:
        "So mastering valid pullback is the prerequisite for everything that follows.",
    },
    tradeFlowHeading: "Step-by-Step Valid Bullish Pullback Trade Flow",
    tradeFlowIntro:
      "This is the exact sequence to run when executing a long setup from a valid bullish pullback.",
    tradeFlowSteps: [
      {
        id: "bull-flow-1",
        number: 1,
        headline: "Read the higher-timeframe context.",
        summary: "1-day and 4-hour charts — confirm bullish structure.",
        detail:
          "Start on the 1D and 4H charts and verify higher-high / higher-low bullish structure delivering toward buy-side liquidity (avoid forcing longs inside neutral chop or bearish HTF order flow).",
        visual: "htf_bias",
        allowReferenceUpload: true,
      },
      {
        id: "bull-flow-2",
        number: 2,
        headline: "Identify the bullish impulse leg.",
        summary: "Locate a clean upward directional move on your analysis timeframe.",
        detail:
          "Drop to your analysis timeframe and isolate a clear, energetic bullish expansion leg pushing higher with decisive candle bodies.",
        allowReferenceUpload: true,
      },
      {
        id: "bull-flow-3",
        number: 3,
        headline: "Mark the highest bullish candle.",
        summary: "Bullish leg — pinpoint the highest bullish candlestick before retracement.",
        detail:
          "Find the bullish candle with the highest upper wick peak at the top of the impulse leg right before bearish pullback candles start forming.",
        visual: "impulse_anchor",
        allowReferenceUpload: true,
      },
      {
        id: "bull-flow-4",
        number: 4,
        headline: "Mark the bullish GRAB level.",
        summary: "Bullish — project the low of that highest bullish candle.",
        detail:
          "Draw a horizontal line from the exact bottom of the lower wick of that highest bullish candlestick. Price must sweep below this line to qualify as a valid pullback.",
        visual: "impulse_anchor",
        allowReferenceUpload: true,
      },
      {
        id: "bull-flow-5",
        number: 5,
        headline: "Wait for the pullback to grab the low.",
        summary: "A lower wick is enough — single candle or multi-candle cluster.",
        detail:
          "Let a single bearish candle or a cluster of retracement candles sweep below the marked low. By the Asymmetry Rule, a lower wick piercing the level is sufficient to collect resting sell stops.",
        visual: "grab_sweep",
        allowReferenceUpload: true,
      },
      {
        id: "bull-flow-6",
        number: 6,
        headline: "Wait for the closing BREAK higher.",
        summary: "Bullish — a candle closes its body above the high of the highest bullish candle.",
        detail:
          "Wait patiently for buyers to step in and close a full candle body above the marked high of the anchor bullish candle. Ignore upper wicks that fail to close above.",
        visual: "closing_break",
        allowReferenceUpload: true,
      },
      {
        id: "bull-flow-7",
        number: 7,
        headline: "Confirm the valid bullish pullback is now valid.",
        summary: "Both low-grab and high-close break conditions are satisfied.",
        detail:
          "Once both the downside wick grab and the upside closing break have occurred in sequence, the bullish pullback is structurally complete and locked in on the chart.",
        allowReferenceUpload: false,
      },
      {
        id: "bull-flow-8",
        number: 8,
        headline: "Use the valid pullback as Inducement / Order Flow / Bullish Order Block.",
        summary: "Wait for price to retrace back down into the valid bullish pullback zone.",
        detail:
          "Highlight the validated pullback leg / candidate Bullish Order Block zone as your institutional Order Flow demand area (or mark it as Inducement ahead of a deeper POI) and wait for price to pull back into discount.",
        warning: {
          title: "Aggressive Pullbacks Into Demand — Stand Aside",
          condition:
            "When there is an aggressive bearish retracement — often called an \"aggressive pullback\", characterized by large, long-bodied bearish candles dropping sharply into the demand / Bullish Order Block zone — do NOT enter long even if all prior valid pullback conditions were satisfied.",
          rationale:
            "If the market is rapidly and drastically moving downward with strong momentum candles into a demand zone without subsiding its momentum, there is a high probability that price will slice straight through and fail to react to that zone.",
          betterApproach:
            "Wait for a corrective pullback characterized by multiple overlapping candlestick patterns (slower, stair-stepping retracement candles showing subsiding selling momentum) approaching the demand zone.",
        },
        visual: "ob_retrace_zone",
        allowReferenceUpload: true,
      },
      {
        id: "bull-flow-9",
        number: 9,
        headline: "Enter long on lower-timeframe MSS confirmation.",
        summary: "At the valid bullish pullback zone, aligned with HTF bullish bias.",
        detail:
          "Once price taps into the valid bullish pullback / Order Block zone, drop to your execution timeframe (e.g. 15m / 5m / 1m) and enter long after a confirmed bullish Market Structure Shift (MSS).",
        visual: "ltf_mss_entry",
        allowReferenceUpload: true,
      },
      {
        id: "bull-flow-10",
        number: 10,
        headline: "Set the protective stop below the extreme.",
        summary: "Place stop below the valid bullish pullback low, with a small buffer.",
        detail:
          "Position your stop-loss safely beneath the lowest wick of the valid pullback swing low (or LTF sweep low) plus a small spread buffer so normal noise cannot prematurely tag you out.",
        visual: "ltf_mss_entry",
        allowReferenceUpload: false,
      },
      {
        id: "bull-flow-11",
        number: 11,
        headline: "Take profit at the next buy-side draw on liquidity.",
        summary: "Target an old high, relative equal highs (EQH), or higher-timeframe FVG.",
        detail:
          "Scale out or set your primary take-profit at the clearest overhead buy-side liquidity pool — such as an unmitigated swing high, engineered equal highs (EQH), or a 4H/1D Fair Value Gap.",
        visual: "ltf_mss_entry",
        allowReferenceUpload: true,
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
    ictNote: {
      intro: "Valid pullback is the building block of the rest of the framework.",
      inducementBullet:
        "The first valid pullback inside a bearish leg before a bearish BOS is the Inducement.",
      orderBlockBullet:
        "The last bearish/anchor candle before the displacement that produced the bearish BOS — that is, the candle whose downside closing break confirms the valid pullback — marks the candidate Bearish Order Block zone.",
      orderFlowBullet:
        "Every valid pullback inside the downward leg becomes a bearish ICT Order Flow re-entry zone.",
      closing:
        "So mastering valid pullback is the prerequisite for everything that follows.",
    },
    tradeFlowHeading: "Step-by-Step Valid Bearish Pullback Trade Flow",
    tradeFlowIntro:
      "This is the exact sequence to run when executing a short setup from a valid bearish pullback.",
    tradeFlowSteps: [
      {
        id: "bear-flow-1",
        number: 1,
        headline: "Read the higher-timeframe context.",
        summary: "1-day and 4-hour charts — confirm bearish structure.",
        detail:
          "Start on the 1D and 4H charts and verify lower-low / lower-high bearish structure delivering toward sell-side liquidity (avoid forcing shorts inside neutral consolidation or bullish HTF order flow).",
        visual: "htf_bias",
        allowReferenceUpload: true,
      },
      {
        id: "bear-flow-2",
        number: 2,
        headline: "Identify the bearish impulse leg.",
        summary: "Locate a clean downward directional move on your analysis timeframe.",
        detail:
          "Drop to your analysis timeframe and isolate a decisive bearish expansion leg pushing lower with clear displacement.",
        allowReferenceUpload: true,
      },
      {
        id: "bear-flow-3",
        number: 3,
        headline: "Mark the lowest bearish candle.",
        summary: "Bearish leg — pinpoint the lowest bearish candlestick before retracement.",
        detail:
          "Find the bearish candle with the lowest lower wick extreme at the bottom of the impulse leg right before bullish pullback candles begin forming.",
        visual: "impulse_anchor",
        allowReferenceUpload: true,
      },
      {
        id: "bear-flow-4",
        number: 4,
        headline: "Mark the bearish GRAB level.",
        summary: "Bearish — project the high of that lowest bearish candle.",
        detail:
          "Draw a horizontal line from the exact top of the upper wick of that lowest bearish candlestick. Price must sweep above this line to qualify as a valid bearish pullback.",
        visual: "impulse_anchor",
        allowReferenceUpload: true,
      },
      {
        id: "bear-flow-5",
        number: 5,
        headline: "Wait for the pullback to grab the high.",
        summary: "An upper wick is enough — single candle or multi-candle cluster.",
        detail:
          "Let a single bullish candle or a cluster of retracement candles sweep above the marked high. By the Asymmetry Rule, an upper wick piercing the level is sufficient to collect resting buy stops.",
        visual: "grab_sweep",
        allowReferenceUpload: true,
      },
      {
        id: "bear-flow-6",
        number: 6,
        headline: "Wait for the closing BREAK lower.",
        summary: "Bearish — a candle closes its body below the low of the lowest bearish candle.",
        detail:
          "Wait patiently for sellers to step back in and close a full candle body below the marked low of the anchor bearish candle. Ignore lower wicks that fail to close below.",
        visual: "closing_break",
        allowReferenceUpload: true,
      },
      {
        id: "bear-flow-7",
        number: 7,
        headline: "Confirm the valid bearish pullback is now valid.",
        summary: "Both high-grab and low-close break conditions are satisfied.",
        detail:
          "Once both the upside wick grab and the downside closing break have occurred in sequence, the bearish pullback is structurally complete and locked in on the chart.",
        allowReferenceUpload: false,
      },
      {
        id: "bear-flow-8",
        number: 8,
        headline: "Use the valid pullback as Inducement / Order Flow / Bearish Order Block.",
        summary: "Wait for price to retrace back up into the valid bearish pullback zone.",
        detail:
          "Highlight the validated pullback leg / candidate Bearish Order Block zone as your institutional Order Flow supply area (or mark it as Inducement ahead of a higher premium POI) and wait for price to retrace upward into premium.",
        warning: {
          title: "Aggressive Pullbacks Into Supply — Stand Aside",
          condition:
            "When there is an aggressive bullish retracement — often called an \"aggressive pullback\", characterized by large, long-bodied bullish candles surging sharply into the supply / Bearish Order Block zone — do NOT enter short even if all prior valid pullback conditions were satisfied.",
          rationale:
            "If the market is rapidly and drastically moving upward with strong momentum candles into a supply zone without subsiding its momentum, there is a high probability that price will blow straight through and fail to react to that zone.",
          betterApproach:
            "Wait for a corrective pullback characterized by multiple overlapping candlestick patterns (slower, stair-stepping retracement candles showing subsiding buying momentum) approaching the supply zone.",
        },
        visual: "ob_retrace_zone",
        allowReferenceUpload: true,
      },
      {
        id: "bear-flow-9",
        number: 9,
        headline: "Enter short on lower-timeframe MSS confirmation.",
        summary: "At the valid bearish pullback zone, aligned with HTF bearish bias.",
        detail:
          "Once price taps into the valid bearish pullback / Order Block zone, drop to your execution timeframe (e.g. 15m / 5m / 1m) and enter short after a confirmed bearish Market Structure Shift (MSS).",
        visual: "ltf_mss_entry",
        allowReferenceUpload: true,
      },
      {
        id: "bear-flow-10",
        number: 10,
        headline: "Set the protective stop above the extreme.",
        summary: "Place stop above the valid bearish pullback high, with a small buffer.",
        detail:
          "Position your stop-loss safely above the highest wick of the valid pullback swing high (or LTF sweep high) plus a small spread buffer to protect against minor liquidity pokes.",
        visual: "ltf_mss_entry",
        allowReferenceUpload: false,
      },
      {
        id: "bear-flow-11",
        number: 11,
        headline: "Take profit at the next sell-side draw on liquidity.",
        summary: "Target an old low, relative equal lows (EQL), or higher-timeframe FVG.",
        detail:
          "Scale out or set your primary take-profit at the clearest Resting Sell-Side Liquidity pool below — such as an old swing low, engineered equal lows (EQL), or an unmitigated 4H/1D Fair Value Gap.",
        visual: "ltf_mss_entry",
        allowReferenceUpload: true,
      },
    ],
  },
};

export default function PullbackStrategyPage() {
  const [activeTab, setActiveTab] = useState<ReferenceMarketScope>("bullish");
  const market: MarketDirection =
    activeTab === "bearish" ? "bearish" : "bullish";

  // Edit mode is OFF by default — users must click 'Edit' in the chosen pullback market header to upload
  const [isEditMode, setIsEditMode] = useState(false);

  // Track expanded ("unshrunk") state per item ID — collapsed by default
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Track checked pre-trade checklist marks per item ID (both identification & trade flow)
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

  // Identification Checklist metrics (I - V)
  const checkedCount = activeConfig.steps.filter(
    (s) => checkedIds[s.id]
  ).length;
  const totalSteps = activeConfig.steps.length;
  const allChecked = checkedCount === totalSteps;
  const allExpanded = activeConfig.steps.every((s) => expandedIds[s.id]);

  // Step-by-Step Trade Flow metrics (1 - 11)
  const flowCheckedCount = activeConfig.tradeFlowSteps.filter(
    (s) => checkedIds[s.id]
  ).length;
  const totalFlowSteps = activeConfig.tradeFlowSteps.length;
  const allFlowChecked = flowCheckedCount === totalFlowSteps;
  const allFlowExpanded = activeConfig.tradeFlowSteps.every(
    (s) => expandedIds[s.id]
  );

  function handleSelectTab(nextTab: ReferenceMarketScope) {
    setActiveTab(nextTab);
    setIsEditMode(false);
  }

  function handleToggleEditMode(targetSection: "checklist" | "flow" = "checklist") {
    const enteringEdit = !isEditMode;
    setIsEditMode(enteringEdit);

    if (enteringEdit) {
      setExpandedIds((prev) => {
        const updated = { ...prev };
        if (targetSection === "checklist") {
          activeConfig.steps.forEach((s) => {
            updated[s.id] = true;
          });
        } else {
          activeConfig.tradeFlowSteps.forEach((s) => {
            if (s.allowReferenceUpload) {
              updated[s.id] = true;
            }
          });
        }
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

  function handleExpandOrShrinkChecklist() {
    const nextValue = !allExpanded;
    setExpandedIds((prev) => {
      const updated = { ...prev };
      activeConfig.steps.forEach((s) => {
        updated[s.id] = nextValue;
      });
      return updated;
    });
  }

  function handleResetChecklistChecks() {
    setCheckedIds((prev) => {
      const updated = { ...prev };
      activeConfig.steps.forEach((s) => {
        updated[s.id] = false;
      });
      return updated;
    });
  }

  function handleExpandOrShrinkFlow() {
    const nextValue = !allFlowExpanded;
    setExpandedIds((prev) => {
      const updated = { ...prev };
      activeConfig.tradeFlowSteps.forEach((s) => {
        updated[s.id] = nextValue;
      });
      return updated;
    });
  }

  function handleResetFlowChecks() {
    setCheckedIds((prev) => {
      const updated = { ...prev };
      activeConfig.tradeFlowSteps.forEach((s) => {
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

    const storageScope: ReferenceMarketScope = stepId.startsWith("catch-")
      ? "catching"
      : market;

    const uploadedItems: ChecklistReferenceImage[] = [];
    for (const file of files) {
      const created = await uploadChecklistReference(
        storageScope,
        stepId,
        file
      );
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
      {/* Screen Header with 3 Tabs: Bullish Market, Bearish Market, Catching Pullbacks */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
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
            Verify valid pullback structure by market direction or study the 8
            confluence techniques for catching pullbacks.
          </p>
        </div>

        {/* Header 3-Tab Mode Selector */}
        <div
          role="tablist"
          aria-label="Pullback Strategy Views"
          className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0B0F16] p-1.5 self-start lg:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bullish"}
            onClick={() => handleSelectTab("bullish")}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "bullish"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <TrendingUp
              className={`h-4 w-4 ${
                activeTab === "bullish" ? "text-emerald-400" : "text-slate-500"
              }`}
            />
            <span>Bullish Market</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bearish"}
            onClick={() => handleSelectTab("bearish")}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "bearish"
                ? "bg-rose-500/15 text-rose-300 border border-rose-500/35 shadow-[0_0_20px_rgba(244,63,94,0.12)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <TrendingDown
              className={`h-4 w-4 ${
                activeTab === "bearish" ? "text-rose-400" : "text-slate-500"
              }`}
            />
            <span>Bearish Market</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "catching"}
            onClick={() => handleSelectTab("catching")}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "catching"
                ? "bg-cyan-500/15 text-cyan-200 border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.14)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Crosshair
              className={`h-4 w-4 ${
                activeTab === "catching" ? "text-cyan-400" : "text-slate-500"
              }`}
            />
            <span>Catching Pullbacks</span>
          </button>
        </div>
      </div>

      {activeTab === "catching" ? (
        <>
          {migrationHint && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{migrationHint}</span>
            </div>
          )}
          <CatchingPullbacksSection
            isEditMode={isEditMode}
            onToggleEditMode={() => setIsEditMode((prev) => !prev)}
            referencesByStep={referencesByStep}
            onUploadFiles={handleUploadStepFiles}
            onDeleteImage={handleDeleteStepImage}
          />

          <GlobalStrategyChecklist strategyContext="Pullback Strategy · Catching Pullbacks" />
        </>
      ) : (
        <>
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

      {/* Part 2: Chosen Market Identification Checklist + ICT Framework Note */}
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
                onClick={() => handleToggleEditMode("checklist")}
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
                images (up to 10 MB per file) inside any step below. Click{" "}
                <strong>Done</strong> when finished.
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
              onClick={handleExpandOrShrinkChecklist}
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
                onClick={handleResetChecklistChecks}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible / Shrink-Unshrink Identification Checklist Items (I - V) */}
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

                    <span
                      className={`mt-0.5 sm:mt-0 shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold border ${
                        isBullish
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/25 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {step.roman}
                    </span>

                    <span
                      className={`text-sm font-medium leading-snug transition-colors ${
                        isChecked ? "text-white" : "text-slate-200"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>

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

        {/* All-Checked Identification Readiness Banner */}
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
                {totalSteps}/{totalSteps} conditions verified). Proceed to the
                Step-by-Step Trade Flow below.
              </span>
            </div>
          </div>
        )}

        {/* Inline Note (NOT a standalone section): Why Valid Pullback Matters for Every Other ICT Concept */}
        <aside
          aria-label="Why Valid Pullback Matters for Every Other ICT Concept"
          className="mt-6 rounded-xl border border-amber-500/25 bg-[#090D13] p-4 sm:p-5 border-l-4 border-l-amber-400"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Lightbulb className="h-3 w-3" />
              Note
            </span>
            <p className="text-xs sm:text-sm font-semibold text-amber-100">
              Why Valid Pullback Matters for Every Other ICT Concept
            </p>
          </div>

          <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed text-slate-300">
            <p>{activeConfig.ictNote.intro}</p>
            <ul className="space-y-1.5 pl-4 list-disc marker:text-amber-400/80">
              <li>
                {activeConfig.ictNote.inducementBullet.split("BOS")[0]}
                <a
                  href={ICT_CONCEPT_LINKS.bos}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-semibold text-amber-300 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-200"
                >
                  BOS
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                {" is the "}
                <a
                  href={ICT_CONCEPT_LINKS.inducement}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-semibold text-amber-300 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-200"
                >
                  Inducement
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                .
              </li>
              <li>
                {isBullish
                  ? "The last bullish/anchor candle before the displacement that produced the bullish BOS — that is, the candle whose upside closing break confirms the valid pullback — is the candidate Bullish "
                  : "The last bearish/anchor candle before the displacement that produced the bearish BOS — that is, the candle whose downside closing break confirms the valid pullback — is the candidate Bearish "}
                <a
                  href={ICT_CONCEPT_LINKS.orderBlock}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-semibold text-amber-300 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-200"
                >
                  Order Block
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                .
              </li>
              <li>
                {isBullish
                  ? "Every valid pullback inside the upward leg becomes a bullish "
                  : "Every valid pullback inside the downward leg becomes a bearish "}
                <a
                  href={ICT_CONCEPT_LINKS.orderFlow}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-semibold text-amber-300 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-200"
                >
                  ICT Order Flow
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                {" re-entry zone."}
              </li>
            </ul>
            <p className="pt-0.5 font-medium text-slate-200">
              {activeConfig.ictNote.closing}
            </p>
          </div>
        </aside>
      </section>

      {/* Part 3: Step-by-Step Valid Pullback Trade Flow (Market-Specific 11-Step Playbook) */}
      <section
        aria-labelledby="trade-flow-heading"
        className={`rounded-2xl border p-6 transition-colors ${
          isBullish
            ? "border-emerald-500/25 bg-[#0E131B]"
            : "border-rose-500/25 bg-[#0E131B]"
        }`}
      >
        <div className="border-b border-slate-800/80 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                  isBullish
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                }`}
              >
                <ListOrdered className="h-4 w-4" />
              </div>
              <div>
                <h2
                  id="trade-flow-heading"
                  className="text-lg sm:text-xl font-bold text-white"
                >
                  {activeConfig.tradeFlowHeading}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
                  {activeConfig.tradeFlowIntro}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`rounded-full px-3 py-1 font-mono text-xs font-semibold border ${
                  isBullish
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {flowCheckedCount} / {totalFlowSteps} Steps
              </span>

              <button
                type="button"
                onClick={() => handleToggleEditMode("flow")}
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
              Click any step to unshrink structure diagrams &amp; reference charts
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExpandOrShrinkFlow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                {allFlowExpanded ? (
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

              {flowCheckedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFlowChecks}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 11-Step Execution Sequence */}
        <div className="mt-4 space-y-2.5">
          {activeConfig.tradeFlowSteps.map((flowStep) => {
            const isExpanded = Boolean(expandedIds[flowStep.id]);
            const isChecked = Boolean(checkedIds[flowStep.id]);
            const stepImages = referencesByStep[flowStep.id] ?? [];

            return (
              <div
                key={flowStep.id}
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
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpand(flowStep.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(flowStep.id);
                    }
                  }}
                  className="flex cursor-pointer items-start sm:items-center justify-between gap-3.5 px-4 py-3 select-none"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={`Mark trade flow step ${flowStep.number} completed`}
                      onClick={(e) => toggleCheck(flowStep.id, e)}
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

                    <span
                      className={`mt-0.5 sm:mt-0 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold border ${
                        isBullish
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/25 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {flowStep.number}
                    </span>

                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-white">
                        {flowStep.headline}{" "}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-400">
                        {flowStep.summary}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    {flowStep.warning && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        Warning
                      </span>
                    )}
                    {stepImages.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-[#0E131B] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                        <Images className="h-3 w-3 text-emerald-400" />
                        {stepImages.length}
                      </span>
                    )}
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

                <div
                  className={`grid transition-all duration-200 ease-out ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-slate-800/80 px-4 pb-4 pt-3.5 sm:pl-12">
                      {flowStep.visual ? (
                        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
                          <div className="lg:col-span-7 space-y-3">
                            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                              {flowStep.detail}
                            </p>

                            {flowStep.warning && (
                              <div
                                role="note"
                                className="rounded-xl border border-amber-500/35 bg-amber-500/[0.07] p-3.5 sm:p-4 border-l-4 border-l-amber-400 space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
                                    Warning · {flowStep.warning.title}
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed text-amber-100/95">
                                  {flowStep.warning.condition}
                                </p>
                                <p className="text-xs leading-relaxed text-slate-300">
                                  <strong className="font-semibold text-amber-200">
                                    Rationale:{" "}
                                  </strong>
                                  {flowStep.warning.rationale}
                                </p>
                                <div className="rounded-lg border border-emerald-500/25 bg-[#080B10]/90 px-3 py-2 text-xs leading-relaxed text-slate-200">
                                  <strong className="font-semibold text-emerald-400">
                                    Better Approach:{" "}
                                  </strong>
                                  {flowStep.warning.betterApproach}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="lg:col-span-5">
                            <TradeFlowDiagram
                              market={market}
                              visual={flowStep.visual}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                          {flowStep.detail}
                        </p>
                      )}

                      {flowStep.allowReferenceUpload && (
                        <ChecklistReferenceGallery
                          market={market}
                          stepId={flowStep.id}
                          stepRoman={`Step ${flowStep.number}`}
                          isEditing={isEditMode}
                          images={stepImages}
                          onUploadFiles={handleUploadStepFiles}
                          onDeleteImage={handleDeleteStepImage}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All 11 Trade Flow Steps Verified Banner */}
        {allFlowChecked && (
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
                All 11 {isBullish ? "Bullish (Long)" : "Bearish (Short)"} Trade
                Flow steps verified — Entry, Stop-Loss, and Liquidity Target
                confirmed!
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Shared Global Pre-Entry Risk-Reduction Checklist (Just Before Best Timeframe for Valid Pullback) */}
      <GlobalStrategyChecklist
        direction={market}
        strategyContext={`Pullback Strategy · ${
          isBullish ? "Bullish Market" : "Bearish Market"
        }`}
      />

      {/* Non-Checklist Reference Sections: Best Timeframe & Best Pairs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Timeframe for Valid Pullback */}
        <section
          aria-labelledby="best-timeframe-heading"
          className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 flex flex-col justify-between"
        >
          <div>
            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-[#090D13] text-emerald-400">
                <Clock className="h-4 w-4" />
              </div>
              <h2
                id="best-timeframe-heading"
                className="text-base sm:text-lg font-bold text-white"
              >
                Best Timeframe for Valid Pullback
              </h2>
            </div>

            <p className="text-sm leading-relaxed text-slate-300">
              Valid pullback works on every timeframe. For day trading, mark
              valid pullbacks on the 15-minute or 1-hour and use the 1-day and
              4-hour for the directional context. For swing trading, use the
              4-hour and daily for the pullback marking and the daily / weekly
              for the bias.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-3.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Day Trading
              </span>
              <p className="mt-1.5 text-xs text-slate-300">
                <strong className="text-white">Pullback:</strong> 15M / 1H
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                <strong className="text-slate-300">Context Bias:</strong> 1D / 4H
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-3.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Swing Trading
              </span>
              <p className="mt-1.5 text-xs text-slate-300">
                <strong className="text-white">Pullback:</strong> 4H / 1D
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                <strong className="text-slate-300">Context Bias:</strong> 1D / 1W
              </p>
            </div>
          </div>
        </section>

        {/* Best Pairs for Valid Pullback Analysis */}
        <section
          aria-labelledby="best-pairs-heading"
          className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-[#090D13] text-emerald-400">
                <Globe2 className="h-4 w-4" />
              </div>
              <h2
                id="best-pairs-heading"
                className="text-base sm:text-lg font-bold text-white"
              >
                Best Pairs for Valid Pullback Analysis
              </h2>
            </div>

            <p className="text-sm leading-relaxed text-slate-300">
              Valid pullback is timeframe-agnostic and instrument-agnostic — it
              works on every major pair (GBP/USD, EUR/USD, USD/CAD), metals
              (XAU/USD, XAG/USD) and indices.
            </p>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              <strong className="font-semibold text-white">
                For traders in the United States
              </strong>{" "}
              who follow the CFTC FIFO and no-hedge rules, the valid pullback
              framework maps cleanly onto NQ and ES futures (CME Group) plus
              regulated forex pairs through US-based brokers. The 09:50 NY-AM{" "}
              <a
                href="https://innercircletrader.net/tutorials/ict-macro-time-based-strategy/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-emerald-400 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-300"
              >
                macro window
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              is a particularly strong place to watch for valid pullbacks
              because the algorithmic delivery is most concentrated there.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
            {[
              "GBP/USD",
              "EUR/USD",
              "USD/CAD",
              "XAU/USD",
              "XAG/USD",
              "NQ Futures",
              "ES Futures",
              "09:50 NY-AM Macro",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1 font-mono text-[11px] text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Non-Checklist Reference Section: Common Mistakes Around Valid Pullback */}
      <section
        aria-labelledby="common-mistakes-heading"
        className="rounded-2xl border border-rose-500/20 bg-[#0E131B] p-6"
      >
        <div className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="common-mistakes-heading"
                className="text-base sm:text-lg font-bold text-white"
              >
                Common Mistakes Around Valid Pullback
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
                These are the recurring mistakes traders make when first
                identifying valid pullbacks.
              </p>
            </div>
          </div>
        </div>

        <ol className="mt-5 grid gap-3.5 md:grid-cols-2">
          {[
            {
              num: 1,
              title: "Treating every retracement as a valid pullback.",
              desc: "A retracement is just a counter-color candle. A valid pullback requires both the grab AND the break to occur in sequence.",
            },
            {
              num: 2,
              title: "Marking the wrong reference candle.",
              desc: "Use the MOST EXTREME opposite-color candle — the highest bullish candle in a bullish leg, the lowest bearish candle in a bearish leg. Not the most recent one.",
            },
            {
              num: 3,
              title: "Requiring a closing break for the grab.",
              desc: "The grab side accepts a wick. Requiring a closing break disqualifies real institutional sweeps.",
            },
            {
              num: 4,
              title: "Accepting a wick for the break.",
              desc: isBullish
                ? "The break side requires a close. A wick above the high (in a bullish leg) without a close is a stop hunt against the new direction — not a valid pullback confirmation."
                : "The break side requires a close. A wick below the low (in a bearish leg) — or above the high in a bullish leg — without a close is a stop hunt against the new direction — not a valid pullback confirmation.",
            },
            {
              num: 5,
              title: "Entering at the valid pullback before the break confirms.",
              desc: "The valid pullback is only valid AFTER the break candle closes. Entering at the grab and waiting for the break exposes you to the failed-pullback scenario.",
            },
            {
              num: 6,
              title: "Skipping the higher-timeframe bias.",
              desc: "Valid pullbacks work best in the direction of the higher-timeframe trend. Counter-trend valid pullbacks have a much lower hit rate.",
            },
          ].map((mistake) => (
            <li
              key={mistake.num}
              className="flex items-start gap-3.5 rounded-xl border border-slate-800/90 bg-[#090D13] p-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 font-mono text-xs font-bold text-rose-300">
                {mistake.num}
              </span>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  {mistake.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  {mistake.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
        </>
      )}
    </div>
  );
}
