"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  ExternalLink,
  Images,
  Info,
  Layers,
  Lightbulb,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  LiquiditySweepDiagram,
  type LiquidityDiagramKind,
  type LiquidityDirection,
} from "@/components/LiquiditySweepDiagram";
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

interface LiquidityChecklistStep {
  id: string;
  roman: string;
  timestamp: string;
  title: string;
  subtitle: string;
  coreExplanation: string;
  directionalRule: string;
  warningText?: string;
  validationTip: string;
  diagramKind: LiquidityDiagramKind;
}

interface MarketLiquidityBlueprint {
  direction: LiquidityDirection;
  tabLabel: string;
  badgeText: string;
  scope: ReferenceMarketScope;
  heroSummary: string;
  steps: LiquidityChecklistStep[];
}

const LIQUIDITY_BLUEPRINTS: Record<LiquidityDirection, MarketLiquidityBlueprint> =
  {
    bullish: {
      direction: "bullish",
      tabLabel: "Bullish Market",
      badgeText: "Bullish Order Flow · SSL Sweep → Long",
      scope: "liq_bullish",
      heroSummary:
        "Trade WITH Bullish Order Flow toward Buy-Side Liquidity (BSL) using Bullish Fair Value Gaps (IRL) as fuel — or catch high-probability Bullish Reversals after a Sell-Side Liquidity (SSL) Sweep + 15M Silver Bullet FVG.",
      steps: [
        {
          id: "liq-bull-1",
          roman: "I",
          timestamp: "00:20 – 01:13",
          title:
            "Map Both Forms of Liquidity: External (ERL) vs Internal (IRL)",
          subtitle:
            "Identify resting unfilled orders & stop-losses at Swing Highs/Lows (ERL) and Fair Value Gaps inside the leg (IRL).",
          coreExplanation:
            "Liquidity is any price zone holding a large concentration of unfilled orders or stop-losses. External Range Liquidity (ERL) sits at previous Swing Highs (Buy-Side Liquidity / BSL) and previous Swing Lows (Sell-Side Liquidity / SSL). Internal Range Liquidity (IRL) refers to Fair Value Gaps (FVGs) inside a price swing — what the market uses as fuel to attack External Range Liquidity.",
          directionalRule:
            "In a Bullish Market setup, mark the previous Swing High as your Buy-Side Liquidity (BSL · upside target), the Swing Low as Sell-Side Liquidity (SSL), and highlight Bullish Fair Value Gaps (IRL) inside the bullish leg that price will tap as fuel to drive higher.",
          validationTip:
            "Always monitor how price interacts with BOTH forms of liquidity together — IRL fuels the move, while ERL decides continuation (Run) vs reversal (Sweep).",
          diagramKind: "forms_of_liquidity",
        },
        {
          id: "liq-bull-2",
          roman: "II",
          timestamp: "01:13 – 04:31",
          title:
            "Confirm Bullish Order Flow via Break of Structure (BOS) & CHoCH",
          subtitle:
            "Verify which liquidity pool was broken to create the current swing, and never trade against active order flow.",
          coreExplanation:
            "When a new swing forms, check which liquidity was ran through to create it. If Buy-Side Liquidity (BSL) was broken, the market is in Bullish Order Flow: the new Swing High (BSL) becomes your Break of Structure (BOS) level for trend continuation, while the Swing Low (SSL) becomes your Change of Character (CHoCH) warning level.",
          directionalRule:
            "For Bullish setups: either (A) trade inline with an active Bullish Order Flow (prior BSL broken = BOS), OR (B) if reversing from a prior downtrend, wait until an upward CHoCH is followed by a second upward break (New Bullish BOS) confirming the uptrend has truly begun.",
          warningText:
            "Do NOT flip your bias on a single CHoCH alone! A standalone CHoCH can easily be a liquidity sweep fake-out. Wait for price to pass the new Break of Structure (BOS) level (or complete the 3-part reversal sequence) before committing.",
          validationTip:
            "Golden Rule: Always trade in the direction of confirmed Order Flow — never step in front of active opposing BOS swings.",
          diagramKind: "order_flow_bos_choch",
        },
        {
          id: "liq-bull-3",
          roman: "III",
          timestamp: "04:32 – 06:28",
          title:
            "Track the Bullish IRL → ERL Fuel Cycle (Watch for IRL Disrespect)",
          subtitle:
            "Expect impulsive bullish legs to retrace into Bullish FVGs (IRL) as support fuel to break upper BSL (ERL).",
          coreExplanation:
            "After price pushes through a previous Swing High (BOS), it needs internal support to launch the next leg up. Price retraces into the previous swing's Bullish Fair Value Gap (IRL) and uses those unfilled buy orders as fuel to run through the upper Buy-Side External Range Liquidity (BSL), creating a brand-new swing and fresh IRL.",
          directionalRule:
            "Bullish Continuation Check: Confirm the retracement respects the Bullish FVG inside the prior impulse leg. Conversely, if you are stalking a reversal FROM a bearish leg into a bullish trade, your very first clue is seeing a Bearish FVG get completely disrespected upward!",
          warningText:
            "Early Warning Sign: Whenever a Bullish FVG (IRL) gets sliced straight through and disrespected, it is the #1 early signal that the market wants to attack the lower CHoCH (SSL) level and potentially reverse bearish.",
          validationTip:
            "Healthy uptrends repeat one rhythm: Impulsive BOS → Leave Bullish FVG (IRL) → Retrace & Respect IRL → Run Upper BSL (ERL).",
          diagramKind: "irl_to_erl_fuel_cycle",
        },
        {
          id: "liq-bull-4",
          roman: "IV",
          timestamp: "06:29 – 08:13",
          title:
            "Validate a Bullish Liquidity Run (Continuation Rule at BSL)",
          subtitle:
            "A candle close above Swing High (BSL) is only a breakout — confirm a Bullish FVG overlaps or forms ABOVE the breakout.",
          coreExplanation:
            "When price attacks External Range Liquidity (BSL), a simple candle close above the Swing High is NOT yet a Liquidity Run — it is only an unconfirmed breakout. To validate a true Bullish Liquidity Run, an additional bullish candle must create a Bullish Fair Value Gap (IRL) DURING (overlapping) or AFTER (above) the BSL breakout.",
          directionalRule:
            "Bullish Run Requirement: Verify that a fresh Bullish FVG either overlaps the broken BSL line or sits cleanly above it. Buyers will use that post-breakout IRL as support during the next pullback to continue the uptrend.",
          warningText:
            "Invalid Run Trap: If the last Bullish FVG was created BEFORE (underneath) the BSL breakout level, you CANNOT use it to validate a Liquidity Run — wait to see whether post-breakout IRL forms or if price sweeps and reverses.",
          validationTip:
            "Post-breakout FVG overlapping/above BSL = Proven buyer strength (Liquidity Run). Pre-breakout FVG below BSL = Vulnerable to sweep & reversal.",
          diagramKind: "liquidity_run_validation",
        },
        {
          id: "liq-bull-5",
          roman: "V",
          timestamp: "08:13 – 09:47",
          title:
            "Confirm a Bullish Liquidity Sweep Reversal (3-Signal SSL Sweep Protocol)",
          subtitle:
            "Never buy solely on a wick below SSL — wait for Bearish FVG Disrespect + Bullish CHoCH + Bullish FVG / BOS.",
          coreExplanation:
            "When price attacks a previous Swing Low (SSL) and fails to close below it (wick fake-out showing seller exhaustion) — or closes below SSL while its last Bearish FVG sat above SSL — a Bullish Liquidity Sweep is in play. However, never enter blindly on the initial wick reaction alone.",
          directionalRule:
            "Verify the 3-Signal Bullish Sweep Sequence: (1) Price rebounds and disrespects the prior Bearish FVG above SSL → (2) Price breaks above the prior Swing High to print a Bullish CHoCH → (3) That bullish leg creates a fresh Bullish FVG that holds as support and drives a Bullish BOS.",
          warningText:
            "Never enter a long trade solely because price wicked below a Swing Low! Wait for market structure (FVG disrespect + CHoCH + new Bullish FVG) to prove buyers have seized Order Flow.",
          validationTip:
            "Wick Sweep of SSL = Alert. Bearish FVG Disrespected = Signal #1. Bullish CHoCH = Signal #2. New Bullish FVG + BOS = Confirmed Bullish Order Flow.",
          diagramKind: "liquidity_sweep_reversal",
        },
        {
          id: "liq-bull-6",
          roman: "VI",
          timestamp: "09:48 – 12:21",
          title:
            "Execute Top-Down (1W / 4H → 15M) at the 'Silver Bullet' First FVG",
          subtitle:
            "Check Macro (1W/1D) context, wait for price to tap a 4H Bullish FVG, then enter on the 15M Reversal's FIRST Bullish FVG ('Silver Bullet').",
          coreExplanation:
            "Start on the largest timeframes (1W / 1D) so you never hold a 4H long blindly into a Weekly Bearish FVG. Next, on the 4H chart, confirm Bullish Order Flow (4H BOS above BSL) and mark the 4H Bullish FVG (IRL). When price pulls back into that 4H FVG, do NOT blind-buy — drop to the 15-Minute chart (which will initially be in a bearish pullback).",
          directionalRule:
            "15M Bullish Trigger: Inside the 4H Bullish FVG, wait for a 15M SSL Sweep → 15M Bearish FVG Disrespected → 15M Bullish CHoCH → 15M Bullish BOS. Enter LONG on the VERY FIRST Bullish FVG created after that reversal (the 'Silver Bullet' FVG), place SL below the 15M sweep low, and target the 4H Buy-Side Liquidity (4H BSL)!",
          warningText:
            "Macro Exit Guard: If you want to hold past the 4H BSL target, check the Weekly/Daily chart first — if price has just tapped a Weekly Bearish FVG, secure full profits at 4H BSL because macro sellers can reverse LTF structure.",
          validationTip:
            "The first Fair Value Gap formed immediately after the 15M reversal (the Silver Bullet) is the highest-probability entry zone the market offers.",
          diagramKind: "top_down_silver_bullet",
        },
      ],
    },

    bearish: {
      direction: "bearish",
      tabLabel: "Bearish Market",
      badgeText: "Bearish Order Flow · BSL Sweep → Short",
      scope: "liq_bearish",
      heroSummary:
        "Trade WITH Bearish Order Flow toward Sell-Side Liquidity (SSL) using Bearish Fair Value Gaps (IRL) as resistance fuel — or catch high-probability Bearish Reversals after a Buy-Side Liquidity (BSL) Sweep + 15M Silver Bullet FVG.",
      steps: [
        {
          id: "liq-bear-1",
          roman: "I",
          timestamp: "00:20 – 01:13",
          title:
            "Map Both Forms of Liquidity: External (ERL) vs Internal (IRL)",
          subtitle:
            "Identify resting unfilled orders & stop-losses at Swing Lows/Highs (ERL) and Bearish Fair Value Gaps inside the leg (IRL).",
          coreExplanation:
            "Liquidity represents areas packed with resting stop-losses and unfilled limit/stop orders. External Range Liquidity (ERL) sits at previous Swing Lows (Sell-Side Liquidity / SSL) and Swing Highs (Buy-Side Liquidity / BSL). Internal Range Liquidity (IRL) is the Fair Value Gap (FVG) inside the prior impulsive leg — the fuel price uses to attack External Range Liquidity.",
          directionalRule:
            "In a Bearish Market setup, mark the previous Swing Low as your Sell-Side Liquidity (SSL · downside target), the Swing High as Buy-Side Liquidity (BSL), and highlight Bearish Fair Value Gaps (IRL) inside the bearish impulse leg that sellers will use as fuel to drive lower.",
          validationTip:
            "Watch how price behaves at BOTH IRL and ERL — Bearish IRL fuels the drop, while SSL/BSL reactions reveal whether price will Run or Sweep.",
          diagramKind: "forms_of_liquidity",
        },
        {
          id: "liq-bear-2",
          roman: "II",
          timestamp: "01:13 – 04:31",
          title:
            "Confirm Bearish Order Flow via Break of Structure (BOS) & CHoCH",
          subtitle:
            "Verify Sell-Side Liquidity (SSL) was broken to form the swing, and never short into unaligned bullish order flow.",
          coreExplanation:
            "When a price swing forms after running through previous Sell-Side Liquidity (SSL), the chart is in Bearish Order Flow. In Bearish Order Flow, the Swing Low (SSL) is your Break of Structure (BOS) target to continue the downtrend, while the Swing High (BSL) is your Change of Character (CHoCH) warning level.",
          directionalRule:
            "For Bearish setups: either (A) trade inline with active Bearish Order Flow (prior SSL broken = Bearish BOS), OR (B) when reversing from a prior uptrend after a Lower Low (CHoCH), remember that Lower Low becomes the new BOS level — wait for price to confirm bearish continuation rather than flipping bias prematurely.",
          warningText:
            "Do NOT flip your bias to bearish on a standalone CHoCH alone! That initial drop below a swing low could simply be an SSL liquidity sweep inside an uptrend. Wait for confirmation through the new BOS / Bearish FVG sequence.",
          validationTip:
            "Bearish BOS = SSL broken (downtrend continues). Bullish CHoCH = BSL broken (early warning that bearish order flow may be ending).",
          diagramKind: "order_flow_bos_choch",
        },
        {
          id: "liq-bear-3",
          roman: "III",
          timestamp: "04:32 – 06:28",
          title:
            "Track the Bearish IRL → ERL Fuel Cycle (Watch for IRL Disrespect)",
          subtitle:
            "Expect impulsive bearish drops to retrace up into Bearish FVGs (IRL) as resistance fuel to break lower SSL (ERL).",
          coreExplanation:
            "During a downtrend, impulsive sell-offs leave behind Internal Range Liquidity in the form of Bearish Fair Value Gaps. Price retraces upward into that Bearish FVG, taps institutional sell orders as fuel, and drives down through Sell-Side External Range Liquidity (SSL) to print new Lower Lows.",
          directionalRule:
            "Bearish Continuation Check: Confirm pullbacks respect the Bearish FVG inside the previous bearish impulse leg. Conversely, if you are stalking a bearish reversal FROM an uptrend, your earliest signal is watching the last Bullish FVG get sliced straight through downward!",
          warningText:
            "Early Warning Sign: If your Bearish FVG (IRL) gets disrespected and closed straight above, it is the #1 early warning that buyers intend to attack the upper CHoCH (BSL) level for a potential bullish reversal.",
          validationTip:
            "Healthy downtrends repeat: Impulsive Bearish BOS → Leave Bearish FVG (IRL) → Retrace & Respect IRL → Run Lower SSL (ERL).",
          diagramKind: "irl_to_erl_fuel_cycle",
        },
        {
          id: "liq-bear-4",
          roman: "IV",
          timestamp: "07:56 – 08:13",
          title:
            "Validate a Bearish Liquidity Run (Continuation Rule at SSL)",
          subtitle:
            "A candle close below Swing Low (SSL) is only a breakdown — confirm a Bearish FVG overlaps or forms UNDERNEATH SSL.",
          coreExplanation:
            "Sell-side Liquidity Runs follow the exact same rules upside down. When price attacks a previous Swing Low (SSL) and closes below it, that alone is only a breakdown. To validate a true Bearish Liquidity Run, an additional bearish candle must create a Bearish Fair Value Gap either WITHIN (overlapping) the SSL breakdown or UNDERNEATH it.",
          directionalRule:
            "Bearish Run Requirement: Confirm a new Bearish FVG overlaps the broken SSL level or forms below it. Sellers will use that Bearish FVG as resistance on the next pullback to continue driving lower.",
          warningText:
            "Invalid Run Trap: Ignore Bearish Fair Value Gaps that formed ABOVE the SSL level before the breakdown — pre-breakdown FVGs cannot validate a sell-side Liquidity Run.",
          validationTip:
            "Bearish FVG overlapping/below SSL = Proven seller dominance (Liquidity Run). Pre-breakdown FVG above SSL = Unconfirmed breakdown.",
          diagramKind: "liquidity_run_validation",
        },
        {
          id: "liq-bear-5",
          roman: "V",
          timestamp: "08:14 – 09:47",
          title:
            "Confirm a Bearish Liquidity Sweep Reversal (3-Signal BSL Sweep Protocol)",
          subtitle:
            "Never short solely on a wick above BSL — wait for Bullish FVG Disrespect + Bearish CHoCH + Bearish FVG / BOS.",
          coreExplanation:
            "When price attacks a previous Swing High (BSL) and fails to close above it, it prints a classic fake-out showing massive buyer weakness — the clearest sign of a Liquidity Sweep. Even if a bullish candle DOES close above BSL, a sweep is still on the table if the last Bullish FVG formed BELOW that BSL level.",
          directionalRule:
            "Verify the 3-Signal Bearish Sweep Sequence (exact video walkthrough): (1) Price drops and completely disrespects the last Bullish FVG below BSL → (2) Price pushes below the previous Swing Low to create a Bearish CHoCH → (3) That bearish leg creates a Bearish FVG that holds as resistance and drives a new Bearish BOS!",
          warningText:
            "Do NOT short immediately at the Swing High wick reaction! Wait for all structural pieces (Bullish FVG disrespect + Bearish CHoCH + Bearish FVG / BOS) to confirm transition into Bearish Order Flow.",
          validationTip:
            "BSL Fake-Out = Alert. Bullish FVG Disrespected = Signal #1. Bearish CHoCH = Signal #2. Bearish FVG + BOS = Confirmed Bearish Order Flow.",
          diagramKind: "liquidity_sweep_reversal",
        },
        {
          id: "liq-bear-6",
          roman: "VI",
          timestamp: "09:48 – 12:21",
          title:
            "Execute Top-Down (1W / 4H → 15M) at the 'Silver Bullet' First FVG",
          subtitle:
            "Align with Macro (1W/1D) structure, wait for price to tap a 4H Bearish FVG, then short the 15M Reversal's FIRST Bearish FVG ('Silver Bullet').",
          coreExplanation:
            "Always inspect the largest timeframes (Weekly / Daily) first so you know the macro directional tide (for instance, price tapping a Weekly Bearish FVG primes high-probability downside reversals on lower timeframes). On the 4H chart, confirm Bearish Order Flow (4H BOS below SSL) and mark the 4H Bearish FVG (IRL). When price rallies into that 4H Bearish FVG, drop to the 15-Minute chart instead of blind-selling.",
          directionalRule:
            "15M Bearish Trigger: Inside the 4H Bearish FVG, wait for a 15M BSL Sweep → 15M Bullish FVG Disrespected → 15M Bearish CHoCH → 15M Bearish BOS. Enter SHORT on the VERY FIRST Bearish FVG formed after that reversal (the 'Silver Bullet' FVG), place SL above the 15M sweep high, and target the 4H Sell-Side Liquidity (4H SSL)!",
          warningText:
            "Macro Exit Guard: Before holding a 4H short runner past 4H SSL, check the Weekly/Daily chart — if price is entering a Weekly Bullish FVG, bank full profits at 4H SSL.",
          validationTip:
            "4H Bearish FVG = Where to look. 15M Sweep + CHoCH + BOS + Silver Bullet 1st Bearish FVG = Exact high-probability trigger.",
          diagramKind: "top_down_silver_bullet",
        },
      ],
    },
  };

export default function LiquiditySweepStrategyPage() {
  const [market, setMarket] = useState<LiquidityDirection>("bullish");
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [isEditingRefs, setIsEditingRefs] = useState(false);
  const [referencesByStep, setReferencesByStep] = useState<
    Record<string, ChecklistReferenceImage[]>
  >({});
  const [migrationHint, setMigrationHint] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchAllChecklistReferences()
      .then(({ byStep, migrationHint: hint }) => {
        if (!mounted) return;
        setReferencesByStep(byStep);
        if (hint) setMigrationHint(hint);
      })
      .catch(() => {
        // Fallback silently handled by IndexedDB preview layer
      });
    return () => {
      mounted = false;
    };
  }, []);

  const currentBlueprint = LIQUIDITY_BLUEPRINTS[market];
  const isBullish = market === "bullish";

  const completedStepsCount = currentBlueprint.steps.filter(
    (s) => checkedIds[s.id]
  ).length;
  const allStepsChecked =
    completedStepsCount === currentBlueprint.steps.length;
  const allExpanded = currentBlueprint.steps.every(
    (s) => !collapsedIds[s.id]
  );

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleExpandAll = () => {
    const shouldCollapse = allExpanded;
    setCollapsedIds((prev) => {
      const next = { ...prev };
      currentBlueprint.steps.forEach((s) => {
        next[s.id] = shouldCollapse;
      });
      return next;
    });
  };

  const handleResetChecks = () => {
    setCheckedIds((prev) => {
      const next = { ...prev };
      currentBlueprint.steps.forEach((s) => {
        next[s.id] = false;
      });
      return next;
    });
  };

  const handleUploadStepFiles = async (stepId: string, files: File[]) => {
    for (const file of files) {
      const err = validateReferenceFile(file);
      if (err) throw new Error(err);
    }
    const uploaded: ChecklistReferenceImage[] = [];
    for (const file of files) {
      const created = await uploadChecklistReference(
        currentBlueprint.scope,
        stepId,
        file
      );
      uploaded.push(created);
    }
    setReferencesByStep((prev) => ({
      ...prev,
      [stepId]: [...(prev[stepId] ?? []), ...uploaded],
    }));
  };

  const handleDeleteStepImage = async (
    stepId: string,
    image: ChecklistReferenceImage
  ) => {
    await removeChecklistReference(image);
    setReferencesByStep((prev) => ({
      ...prev,
      [stepId]: (prev[stepId] ?? []).filter((img) => img.id !== image.id),
    }));
  };

  return (
    <div className="space-y-7">
      {/* =================================================================== */}
      {/* HEADER + BULLISH / BEARISH MARKET SWITCHER                          */}
      {/* =================================================================== */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
              Strategy
            </span>
            <span className="text-slate-700">/</span>
            <span className="font-mono text-xs text-slate-400">
              Liquidity Sweep Strategy
            </span>
            <a
              href="https://vt.tiktok.com/ZSgwhauMF/"
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B0F16] px-2.5 py-0.5 font-mono text-[11px] text-cyan-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
            >
              <Crosshair className="h-3 w-3 text-cyan-400" />
              <span>Source Video · @cyforex2</span>
              <ExternalLink className="h-3 w-3 opacity-75" />
            </a>
          </div>

          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
            Liquidity Sweep &amp; Order Flow Strategy
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Master External vs Internal Range Liquidity (`BSL`/`SSL` vs `FVG`),
            `BOS` &amp; `CHoCH` Order Flow, Liquidity Runs vs Sweeps, and `4H →
            15M` Silver Bullet entries.
          </p>
        </div>

        {/* Header Bullish / Bearish Tabs */}
        <div
          role="tablist"
          aria-label="Liquidity Sweep Market Direction"
          className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0B0F16] p-1.5 self-start lg:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isBullish}
            onClick={() => setMarket("bullish")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              isBullish
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.14)]"
                : "border border-transparent text-slate-400 hover:text-slate-200"
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
            onClick={() => setMarket("bearish")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              !isBullish
                ? "border border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.14)]"
                : "border border-transparent text-slate-400 hover:text-slate-200"
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

      {migrationHint && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>{migrationHint}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* SHARED FOUNDATION: THE 2 CHALLENGES & 2 FORMS OF LIQUIDITY          */}
      {/* =================================================================== */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            <BookOpenCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Core Liquidity Foundation — Solving the 2 Liquidity Challenges
            </h2>
            <p className="text-xs text-slate-400">
              (1) Knowing <strong>which liquidity level</strong> is actually
              being targeted, and (2) predicting{" "}
              <strong>Continuation (Liquidity Run)</strong> vs{" "}
              <strong>Reversal (Liquidity Sweep)</strong>.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              External Range Liquidity (ERL)
            </span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Previous{" "}
              <strong className="text-white">
                Swing Highs (Buy-Side Liquidity · BSL)
              </strong>{" "}
              and{" "}
              <strong className="text-white">
                Swing Lows (Sell-Side Liquidity · SSL)
              </strong>{" "}
              holding clusters of stop-losses &amp; pending orders — where Runs
              or Sweeps occur.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Internal Range Liquidity (IRL)
            </span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              <strong className="text-white">Fair Value Gaps (FVGs)</strong>{" "}
              formed inside an impulsive leg. Price taps IRL as{" "}
              <strong className="text-cyan-300">fuel</strong> to attack External
              Range Liquidity (`BSL` or `SSL`).
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#090D13] p-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
              The Silver Bullet Trigger
            </span>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Inside a `4H` FVG, wait for a `15M` Sweep + FVG Disrespect +
              `CHoCH` + `BOS` — the{" "}
              <strong className="text-amber-300">
                1st FVG after reversal
              </strong>{" "}
              is the highest-probability Silver Bullet entry.
            </p>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* ACTIVE MARKET CHECKLIST (BULLISH OR BEARISH)                        */}
      {/* =================================================================== */}
      <section className="space-y-4">
        {/* Control Bar */}
        <div
          className={`rounded-2xl border p-5 ${
            isBullish
              ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.06] to-[#0E131B]"
              : "border-rose-500/30 bg-gradient-to-b from-rose-500/[0.06] to-[#0E131B]"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isBullish
                      ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                      : "border-rose-500/35 bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {currentBlueprint.badgeText}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {completedStepsCount}/{currentBlueprint.steps.length} Steps
                  Verified
                </span>
              </div>

              <h2 className="mt-1.5 text-lg sm:text-xl font-bold text-white">
                {isBullish
                  ? "Bullish Liquidity Sweep & Continuation Checklist"
                  : "Bearish Liquidity Sweep & Continuation Checklist"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-300">
                {currentBlueprint.heroSummary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#090D13] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                {allExpanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Shrink All</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Expand All</span>
                  </>
                )}
              </button>

              {completedStepsCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetChecks}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#090D13] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsEditingRefs((prev) => !prev)}
                aria-pressed={isEditingRefs}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  isEditingRefs
                    ? "border-emerald-300 bg-emerald-400 text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)]"
                    : "border-slate-700/90 bg-[#090D13] text-slate-200 hover:border-slate-500 hover:text-white"
                }`}
              >
                {isEditingRefs ? (
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

          {isEditingRefs && (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2 text-xs text-amber-200">
              <strong>Edit Mode Active:</strong> Upload local reference chart
              screenshots (max 10 MB per image) inside any step below. Click{" "}
              <strong>Done</strong> to return to clean read-only mode.
            </div>
          )}
        </div>

        {/* Checklist Step Cards */}
        <div className="space-y-4">
          {currentBlueprint.steps.map((step) => {
            const isChecked = Boolean(checkedIds[step.id]);
            const isCollapsed = Boolean(collapsedIds[step.id]);
            const stepImages = referencesByStep[step.id] ?? [];

            return (
              <article
                key={step.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isChecked
                    ? isBullish
                      ? "border-emerald-500/45 bg-emerald-500/[0.04]"
                      : "border-rose-500/45 bg-rose-500/[0.04]"
                    : "border-slate-800/90 bg-[#0E131B]"
                }`}
              >
                {/* Clickable Step Header */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleCollapse(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleCollapse(step.id);
                    }
                  }}
                  className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.02]"
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={(e) => toggleCheck(step.id, e)}
                      aria-label={`Mark step ${step.roman} completed`}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                        isChecked
                          ? isBullish
                            ? "border-emerald-400 bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                            : "border-rose-400 bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                          : "border-slate-700 bg-[#090D13] text-transparent hover:border-slate-500"
                      }`}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${
                            isBullish
                              ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/12 text-rose-300"
                          }`}
                        >
                          Step {step.roman}
                        </span>
                        <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          {step.timestamp}
                        </span>
                        {stepImages.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#090D13] px-2 py-0.5 font-mono text-[10px] text-slate-300">
                            <Images className="h-3 w-3 text-cyan-400" />
                            {stepImages.length}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 text-sm sm:text-base font-bold text-white">
                        {step.title}
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronDown
                    className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                      !isCollapsed
                        ? isBullish
                          ? "rotate-180 text-emerald-400"
                          : "rotate-180 text-rose-400"
                        : ""
                    }`}
                  />
                </div>

                {/* Expanded Step Body */}
                {!isCollapsed && (
                  <div className="border-t border-slate-800/80 px-5 py-5 space-y-4">
                    <p className="text-sm leading-relaxed text-slate-300">
                      {step.coreExplanation}
                    </p>

                    {/* Active Market Rule Highlight */}
                    <div
                      className={`rounded-xl border p-4 ${
                        isBullish
                          ? "border-emerald-500/35 bg-emerald-500/[0.07]"
                          : "border-rose-500/35 bg-rose-500/[0.07]"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase ${
                          isBullish ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {isBullish
                            ? "Bullish Market Execution Rule"
                            : "Bearish Market Execution Rule"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-200">
                        {step.directionalRule}
                      </p>
                    </div>

                    {/* Optional Warning */}
                    {step.warningText && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-4 py-3 text-xs leading-relaxed text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        <span>{step.warningText}</span>
                      </div>
                    )}

                    {/* Custom Bullish / Bearish SVG Diagram */}
                    <LiquiditySweepDiagram
                      kind={step.diagramKind}
                      direction={market}
                    />

                    {/* Key Takeaway Tip */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-[#090D13] px-3.5 py-2.5 text-xs text-slate-300">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span>
                        <strong className="font-semibold text-white">
                          Key Check:{" "}
                        </strong>
                        {step.validationTip}
                      </span>
                    </div>

                    {/* Edit-Gated <= 10 MB Reference Screenshots */}
                    <ChecklistReferenceGallery
                      market={currentBlueprint.scope}
                      stepId={step.id}
                      stepRoman={step.roman}
                      isEditing={isEditingRefs}
                      images={stepImages}
                      onUploadFiles={handleUploadStepFiles}
                      onDeleteImage={handleDeleteStepImage}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* All Strategy Steps Checked Banner */}
        {allStepsChecked && (
          <div
            role="status"
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-xs sm:text-sm font-medium ${
              isBullish
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200"
            }`}
          >
            <CheckCircle2
              className={`h-5 w-5 shrink-0 ${
                isBullish ? "text-emerald-400" : "text-rose-400"
              }`}
            />
            <span>
              All {currentBlueprint.steps.length}{" "}
              {isBullish ? "Bullish" : "Bearish"} Liquidity Strategy steps
              verified — now complete the Global Risk-Reduction Confirmation
              Checklist below before entering!
            </span>
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* SHARED GLOBAL CONFIRMATION CHECKLIST (SINGLE SHARED FILE + DIAGRAMS)*/}
      {/* =================================================================== */}
      <GlobalStrategyChecklist
        direction={market}
        strategyContext={`Liquidity Sweep Strategy · ${currentBlueprint.tabLabel}`}
      />

      {/* =================================================================== */}
      {/* QUICK COMPARISON MATRIX: LIQUIDITY RUN vs LIQUIDITY SWEEP           */}
      {/* =================================================================== */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Quick Decision Matrix — Liquidity Run vs Liquidity Sweep
            </h2>
            <p className="text-xs text-slate-400">
              How to know whether an External Range Liquidity (`BSL` / `SSL`)
              attack will continue or reverse.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-[#090D13] font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">Scenario</th>
                <th className="px-4 py-3 font-semibold">
                  Reaction at ERL (`BSL` / `SSL`)
                </th>
                <th className="px-4 py-3 font-semibold">
                  FVG (`IRL`) Requirement
                </th>
                <th className="px-4 py-3 font-semibold">
                  Execution Plan (`4H → 15M`)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              <tr className="hover:bg-[#111722]">
                <td className="px-4 py-3 font-semibold text-emerald-300">
                  Liquidity Run (Continuation)
                </td>
                <td className="px-4 py-3 text-slate-300">
                  Candle closes cleanly beyond `BSL` (Bullish) or `SSL`
                  (Bearish)
                </td>
                <td className="px-4 py-3 text-slate-300">
                  New aligned FVG forms <strong>overlapping or beyond</strong>{" "}
                  the broken `ERL` level (not before!)
                </td>
                <td className="px-4 py-3 text-slate-300">
                  Wait for pullback into post-breakout `FVG`, confirm on `15M`,
                  ride trend to next `ERL`
                </td>
              </tr>
              <tr className="hover:bg-[#111722]">
                <td className="px-4 py-3 font-semibold text-amber-300">
                  Liquidity Sweep (Reversal)
                </td>
                <td className="px-4 py-3 text-slate-300">
                  Fails to close beyond `ERL` (wick fake-out) OR closes beyond
                  with only a pre-breakout `FVG`
                </td>
                <td className="px-4 py-3 text-slate-300">
                  Prior `FVG` disrespected → `CHoCH` → Reversal leg prints{" "}
                  <strong>new opposing FVG + BOS</strong>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  Inside `4H FVG`, enter on{" "}
                  <strong>1st FVG after 15M reversal (Silver Bullet)</strong> →
                  target `4H ERL`
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
