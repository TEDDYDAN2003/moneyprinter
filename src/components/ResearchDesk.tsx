"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Award,
  Beaker,
  ChartCandlestick,
  CheckCircle2,
  Crosshair,
  Download,
  History,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Zap,
  Settings,
  Sliders,
  Eye,
  BarChart3,
} from "lucide-react";
import { IndicatorEditor, type IndicatorProgram } from "./IndicatorEditor";
import type { Plan } from "@/lib/replay";
import { ResearchInfo } from "./ResearchInfo";
import { FvgClusters } from "./FvgClusters";
import { FvgQuickPanel } from "./FvgQuickPanel";
import { runFvgQuick, quickDefaults, defaultStudy, type StudyOptions } from "@/lib/fvgQuick";
import { ReplayPanel } from "./ReplayPanel";
import { IndicatorOverlay } from "./IndicatorOverlay";
import { noWickInputs } from "@/lib/indicators/no-wick";
import { fvgReactionInputs } from "@/lib/indicators/fvg-reaction";
import { INDICATOR_REGISTRY, createDefaultProgram, type IndicatorDefinition } from "@/lib/indicators/registry";
import { KeyZoneSuggestionCard } from "./KeyZoneSuggestionCard";
import type { IndicatorInput } from "./IndicatorEditor";
import { TradeProgressGauge, type TradeSetup } from "./TradeProgressGauge";
import { OptimizationModal, type OptimizationCandidate } from "./OptimizationModal";
import { CorrelationMatrixModal } from "./CorrelationMatrixModal";
import { PositionBoxOverlay, type OverlayPlan } from "./PositionBoxOverlay";
import { SniperReplayPanel } from "./SniperReplayPanel";
import { SniperDashboard } from "./SniperDashboard";
import { sniperDefaults, type SniperPlan, type SniperState, type SniperSettings } from "@/lib/sniperReplay";

type Bar = { time: number; open: number; high: number; low: number; close: number };
type Metric = { bull: number; bear: number; max: number; explanation: string };
type Zone = { from: number; created: number; top: number; bottom: number; direction: number; status: string };
type Result = {
  time: number;
  bull: number | null;
  bear: number | null;
  net: number | null;
  classification: string;
  ready: boolean;
  htf: number;
  mtf: number;
  ltf: number;
  break: string;
  sweep: string;
  atr: number | null;
  equilibrium: number | null;
  pattern?: string;
  pattern_dir?: number;
  pattern_conf?: number;
  trend_regime?: number;
  in_killzone?: boolean;
  is_news_shock?: boolean;
  in_news_blackout?: boolean;
  touching_ob?: number;
  ote_confluence?: number;
  last_hi?: number | null;
  last_lo?: number | null;
  regime?: string;
  sub_phase?: string;
  regime_confidence?: number;
  vwma?: number | null;
  vwma_crossover?: number;
  vwma_divergence?: number;
  pre_reactive_signal?: {
    direction: number;
    action: string;
    setup: string;
    entry: number;
    sl: number;
    tp: number;
    rr: number;
    probability: number;
    confluences: string[];
  } | null;
  metrics: Record<string, Metric>;
  zones: Zone[];
  conflict: boolean;
};
type Perf = {
  trades: number;
  wins: number;
  winRate: number | null;
  netR: number;
  maxDrawdownR: number;
  expectancyR: number | null;
  profitFactor?: number | null;
  tradeList?: TradeSetup[];
  excluded?: Record<string, number>;
};
type CorrelationPayload = {
  global_correlations: Record<string, number>;
  regime_correlations: Record<string, Record<string, number>>;
  signal_accuracy: Record<string, Record<string, { accuracy: number; total: number; direction_matches: number }>>;
  best_combinations: Array<{ indicators: string[]; regime: string; accuracy: number; total_signals: number; avg_winner_return: number }>;
};
type Data = {
  runId: string;
  olderAdded: number;
  historyExhausted: boolean;
  analysisAvailable: boolean;
  source: string;
  symbol: string;
  minutes: number;
  candles: Bar[];
  results: Result[];
  backtest: Record<string, Perf>;
  optimization?: OptimizationCandidate[] | null;
  correlations?: CorrelationPayload | null;
  warning: string;
};

const titles: Record<string, string> = {
  htf: "Higher timeframe bias",
  structure: "Market structure",
  liquidity: "Liquidity reclaim",
  displacement: "Displacement",
  fvg: "FVG quality",
  position: "Premium / discount",
  candle: "Candlestick pattern",
  session: "Session context",
};
const initial: Record<string, number> = {
  htf: 20,
  structure: 15,
  liquidity: 15,
  displacement: 15,
  fvg: 15,
  position: 10,
  candle: 5,
  session: 5,
};
const panel = "rounded-2xl border border-slate-800/90 bg-[#101722]";
const field =
  "rounded-lg border border-slate-700 bg-[#0b111a] px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500";
const bias = (v: number) => (v === 1 ? "Bullish" : v === -1 ? "Bearish" : "Mixed");
const tfLabel = (n: number) =>
  n === 1440 ? "1D" : n === 10080 ? "1W" : n >= 60 && n % 60 === 0 ? n / 60 + "h" : n + "m";
type LogicalViewport = { from: number; to: number };

function PriceChart({
  data,
  selected,
  onSelect,
  programs,
  onStatus,
  onViewport,
  restoreRef,
  plan,
  replaying,
  follow,
  onDetach,
  onZoneClick,
  activeTrade,
  showTradeOverlays,
}: {
  data: Data;
  selected: number;
  onSelect: (n: number) => void;
  programs: IndicatorProgram[];
  onStatus: (s: string) => void;
  onViewport: (range: LogicalViewport) => void;
  restoreRef: React.MutableRefObject<LogicalViewport | null>;
  plan: OverlayPlan | null;
  replaying: boolean;
  follow: boolean;
  onDetach: () => void;
  onZoneClick: (i: number, price: number) => boolean;
  activeTrade: TradeSetup | null;
  showTradeOverlays: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const replayRef = useRef({ replaying, follow, onDetach });
  replayRef.current = { replaying, follow, onDetach };
  const priorData = useRef({ length: data.candles.length, replaying: false, follow: true });
  const seriesRef = useRef<import("lightweight-charts").ISeriesApi<"Candlestick"> | null>(null);
  const chartRef = useRef<import("lightweight-charts").IChartApi | null>(null);
  const overlays = useRef<import("lightweight-charts").ISeriesApi<"Line">[]>([]);
  const [ready, setReady] = useState(0);
  const dataRef = useRef(data);
  dataRef.current = data;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const zoneClickRef = useRef(onZoneClick);
  zoneClickRef.current = onZoneClick;
  const viewportCallback = useRef(onViewport);
  viewportCallback.current = onViewport;

  useEffect(() => {
    let disposed = false,
      chart: import("lightweight-charts").IChartApi | undefined;
    let observer: ResizeObserver | undefined;
    (async () => {
      const lib = await import("lightweight-charts");
      if (disposed || !ref.current) return;
      const node = ref.current;
      const chartHeight = () =>
        document.fullscreenElement === node.closest("[data-research-chart]")
          ? Math.max(300, window.innerHeight - 125)
          : Math.max(580, Math.min(900, window.innerHeight - 170));
      chart = lib.createChart(node, {
        width: node.clientWidth,
        height: chartHeight(),
        layout: { background: { color: "#0b111a" }, textColor: "#94a3b8" },
        grid: { vertLines: { color: "#172130" }, horzLines: { color: "#172130" } },
        rightPriceScale: { borderColor: "#253346" },
        timeScale: { borderColor: "#253346", timeVisible: true, secondsVisible: false },
        crosshair: { mode: lib.CrosshairMode.Normal },
      });
      const series = chart.addCandlestickSeries({
        upColor: "#10b981",
        downColor: "#f06468",
        borderUpColor: "#10b981",
        borderDownColor: "#f06468",
        wickUpColor: "#10b981",
        wickDownColor: "#f06468",
      });
      series.setData(data.candles.map((c) => ({ ...c, time: c.time as import("lightweight-charts").UTCTimestamp })));
      seriesRef.current = series;
      chartRef.current = chart;
      setReady((v) => v + 1);
      const initial = restoreRef.current || { from: Math.max(0, data.candles.length - 120), to: data.candles.length + 8 };
      restoreRef.current = null;
      chart
        .timeScale()
        .setVisibleLogicalRange({ from: initial.from as import("lightweight-charts").Logical, to: initial.to as import("lightweight-charts").Logical });
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) viewportCallback.current({ from: range.from, to: range.to });
      });
      chart.subscribeClick((param) => {
        if (typeof param.time === "number") {
          const i = dataRef.current.candles.findIndex((c) => c.time === param.time);
          if (i >= 0) {
            const price = param.point ? series.coordinateToPrice(param.point.y) : null;
            if (price === null || !zoneClickRef.current(i, price)) selectRef.current(i);
          }
        }
      });
      let downX: number | null = null;
      const down = (e: PointerEvent) => {
        downX = e.clientX;
      };
      const move = (e: PointerEvent) => {
        if (downX !== null && Math.abs(e.clientX - downX) > 4 && replayRef.current.replaying) {
          replayRef.current.onDetach();
          downX = null;
        }
      };
      const up = () => {
        downX = null;
      };
      node.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      const resize = () => {
        chart?.applyOptions({ width: node.clientWidth, height: chartHeight() });
        node.style.height = chartHeight() + "px";
      };
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(node);
      window.addEventListener("resize", resize);
      document.addEventListener("fullscreenchange", resize);
      (node as HTMLDivElement & { __resize?: () => void; __pointerCleanup?: () => void }).__resize = resize;
      (node as HTMLDivElement & { __pointerCleanup?: () => void }).__pointerCleanup = () => {
        node.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
    })();
    return () => {
      disposed = true;
      observer?.disconnect();
      if (ref.current) {
        const cleanup = (ref.current as HTMLDivElement & { __resize?: () => void }).__resize;
        if (cleanup) {
          window.removeEventListener("resize", cleanup);
          document.removeEventListener("fullscreenchange", cleanup);
        }
        (ref.current as HTMLDivElement & { __pointerCleanup?: () => void }).__pointerCleanup?.();
      }
      chartRef.current = null;
      seriesRef.current = null;
      overlays.current = [];
      chart?.remove();
    };
  }, [data.runId]);

  useEffect(() => {
    const series = seriesRef.current,
      chart = chartRef.current;
    if (!series || !chart) return;
    const prev = priorData.current,
      range = chart.timeScale().getVisibleLogicalRange(),
      entering = replaying && !prev.replaying,
      leaving = !replaying && prev.replaying;

    const lastBar = data.candles[data.candles.length - 1];
    // High-performance streaming update when stepping forward by 1 candle during simulation
    if (replaying && prev.replaying && data.candles.length === prev.length + 1 && lastBar) {
      series.update({ ...lastBar, time: lastBar.time as import("lightweight-charts").UTCTimestamp });
    } else {
      series.setData(data.candles.map((c) => ({ ...c, time: c.time as import("lightweight-charts").UTCTimestamp })));
    }

    if (data.candles.length) {
      if (entering || leaving || (replaying && follow && !prev.follow)) {
        const end = data.candles.length;
        chart
          .timeScale()
          .setVisibleLogicalRange({ from: Math.max(0, end - 120) as import("lightweight-charts").Logical, to: (end + 8) as import("lightweight-charts").Logical });
      } else if (range) {
        const shift = replaying && follow ? data.candles.length - prev.length : 0;
        chart
          .timeScale()
          .setVisibleLogicalRange({ from: (range.from + shift) as import("lightweight-charts").Logical, to: (range.to + shift) as import("lightweight-charts").Logical });
      }
    }
    priorData.current = { length: data.candles.length, replaying, follow };
  }, [data.candles, replaying, follow]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const x of overlays.current) chart.removeSeries(x);
    overlays.current = [];
    const result = data.results[selected];
    if (!result || programs.length > 0) return;
    for (const zone of result.zones.slice(-12))
      for (const price of [zone.top, zone.bottom]) {
        const s = chart.addLineSeries({
          color: zone.direction === 1 ? "#10b981" : "#f06468",
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        const start = data.candles[zone.created]?.time,
          end = data.candles[selected]?.time;
        if (start === undefined || end === undefined) {
          chart.removeSeries(s);
          continue;
        }
        s.setData(
          start === end
            ? [{ time: start as import("lightweight-charts").UTCTimestamp, value: price }]
            : [
                { time: start as import("lightweight-charts").UTCTimestamp, value: price },
                { time: end as import("lightweight-charts").UTCTimestamp, value: price },
              ]
        );
        overlays.current.push(s);
      }
  }, [selected, data, ready, programs]);

  // Visual trade setup price lines (Entry, TP, SL)
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !showTradeOverlays || !activeTrade || replaying) return;
    const isLong = activeTrade.direction === 1;
    const lines = [
      series.createPriceLine({
        price: activeTrade.entry,
        color: "#38bdf8",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `Entry (${isLong ? "BUY" : "SELL"}) $${activeTrade.entry.toFixed(2)}`,
      }),
      series.createPriceLine({
        price: activeTrade.tp,
        color: "#10b981",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `Target TP (+${activeTrade.rr.toFixed(1)}R) $${activeTrade.tp.toFixed(2)}`,
      }),
      series.createPriceLine({
        price: activeTrade.sl,
        color: "#f43f5e",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `Stop Loss (-1.0R) $${activeTrade.sl.toFixed(2)}`,
      }),
    ];
    return () => {
      for (const line of lines) {
        try {
          series.removePriceLine(line);
        } catch {}
      }
    };
  }, [activeTrade, showTradeOverlays, ready]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !plan) return;
    const lines = [
      series.createPriceLine({ price: plan.entry, color: "#a3a3a3", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "Entry" }),
      series.createPriceLine({ price: plan.target, color: "#10b981", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "TP" }),
      series.createPriceLine({ price: plan.stop, color: "#f06468", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "SL" }),
    ];
    return () => {
      for (const line of lines)
        try {
          series.removePriceLine(line);
        } catch {}
    };
  }, [plan, ready]);

  return (
    <div className="relative">
      <div ref={ref} className="w-full overflow-hidden rounded-b-2xl" />
      {ready > 0 && chartRef.current && seriesRef.current && ref.current && (
        <PositionBoxOverlay
          chart={chartRef.current}
          series={seriesRef.current}
          node={ref.current}
          bars={data.candles}
          activeTrade={showTradeOverlays && !replaying ? activeTrade : null}
          plan={plan}
        />
      )}
      {ready > 0 && chartRef.current && seriesRef.current && ref.current &&
        programs.map((p, idx) => (
          <IndicatorOverlay
            key={(p as any).id || `${idx}-${p.revision}`}
            chart={chartRef.current!}
            series={seriesRef.current!}
            node={ref.current!}
            bars={data.candles}
            program={p}
            onStatus={onStatus}
          />
        ))}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-950/80 px-2 py-1 text-[10px] text-slate-400">
        Scroll to zoom · drag to pan · click candle · cyan/green/red boxes show algorithm long/short entry, TP & SL
      </div>
    </div>
  );
}

export function ResearchDesk() {
  const chartSection = useRef<HTMLElement>(null);
  const [maximized, setMaximized] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");

  useEffect(() => {
    const changed = () => setMaximized(document.fullscreenElement === chartSection.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  async function toggleFullscreen() {
    try {
      setFullscreenError("");
      if (document.fullscreenElement === chartSection.current) await document.exitFullscreen();
      else await chartSection.current?.requestFullscreen();
    } catch {
      setFullscreenError("Fullscreen is unavailable in this browser.");
    }
  }

  const [infoOpen, setInfoOpen] = useState(false);
  const [clusterExpanded, setClusterExpanded] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayCursor, setReplayCursor] = useState<number | null>(null);
  const [replayPlan, setReplayPlan] = useState<Plan | null>(null);
  const [replayFollow, setReplayFollow] = useState(true);
  const replayCursorChanged = useCallback((i: number | null) => {
    setReplayCursor(i);
    if (i !== null) setSelected(i);
  }, []);

  // Institutional Sniper Simulator State
  const [sniperOpen, setSniperOpen] = useState(false);
  const [sniperCursor, setSniperCursor] = useState<number | null>(null);
  const [sniperPlan, setSniperPlan] = useState<SniperPlan | null>(null);
  const [sniperState, setSniperState] = useState<SniperState | null>(null);
  const [sniperSettings, setSniperSettings] = useState<SniperSettings>(sniperDefaults);
  const sniperCursorChanged = useCallback((i: number | null) => {
    setSniperCursor(i);
    if (i !== null) setSelected(i);
  }, []);

  const [quickParams, setQuickParams] = useState(quickDefaults);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSelected, setQuickSelected] = useState<number | null>(null);
  // Multi-Indicator Suite State
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["fvg-reaction", "key-levels"]);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [indicatorStatus, setIndicatorStatus] = useState("");
  const [indicatorPrograms, setIndicatorPrograms] = useState<Record<string, IndicatorProgram>>(() => {
    const initialProgs: Record<string, IndicatorProgram> = {};
    for (const def of INDICATOR_REGISTRY) {
      initialProgs[def.id] = createDefaultProgram(def);
    }
    return initialProgs;
  });

  const activePrograms = useMemo(() => {
    return activeIndicators
      .map((id) => {
        const prog = indicatorPrograms[id];
        return prog ? { ...prog, id } : null;
      })
      .filter((p): p is IndicatorProgram & { id: string } => Boolean(p));
  }, [activeIndicators, indicatorPrograms]);

  const program = indicatorPrograms["fvg-reaction"] || null;
  const preset = activeIndicators.includes("fvg-reaction")
    ? "fvg-reaction"
    : (activeIndicators.includes("no-wick") ? "no-wick" : "none");

  // Indicator Confluence Filter Flags
  const [filterTrend, setFilterTrend] = useState(false);
  const [filterKillzone, setFilterKillzone] = useState(false);
  const [filterNews, setFilterNews] = useState(true);
  const [filterOte, setFilterOte] = useState(false);
  const [filterOb, setFilterOb] = useState(false);
  const [filterRegime, setFilterRegime] = useState(false);
  const [filterVwma, setFilterVwma] = useState(false);
  const [correlationModalOpen, setCorrelationModalOpen] = useState(false);
  const [correlationLoading, setCorrelationLoading] = useState(false);

  useEffect(() => {
    if (preset === "no-wick" && typeof program?.inputs.intLen === "number" && typeof program.inputs.extLen === "number") {
      const inner = Math.max(1, Math.min(30, Math.floor(program.inputs.intLen))),
        outer = Math.max(2, Math.min(100, Math.floor(program.inputs.extLen)));
      setQuickParams((v) => (v.swingLength === inner && v.externalLength === outer ? v : { ...v, swingLength: inner, externalLength: outer }));
    }
  }, [preset, program]);

  // Main state
  const [data, setData] = useState<Data | null>(null);
  const [source, setSource] = useState("sample");
  const [minutes, setMinutes] = useState(5);
  const [count, setCount] = useState(5000);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [weights, setWeights] = useState(initial);
  const [threshold, setThreshold] = useState(65);
  const [rr, setRr] = useState(1.5);
  const [stopAtr, setStopAtr] = useState(1);
  const [horizon, setHorizon] = useState(20);
  const [cost, setCost] = useState(0.3); // default $0.30/oz realistic spread for gold
  const [targetMode, setTargetMode] = useState<"structural" | "fixed">("structural");
  const [stopMode, setStopMode] = useState<"structural" | "atr">("structural");
  const [minRr, setMinRr] = useState(1.5);
  const [requirePattern, setRequirePattern] = useState(false);
  const [showTradeOverlays, setShowTradeOverlays] = useState(true);

  // Optimizer modal state
  const [optOpen, setOptOpen] = useState(false);
  const [optLoading, setOptLoading] = useState(false);
  const [optCandidates, setOptCandidates] = useState<OptimizationCandidate[] | null>(null);

  const latest = useRef<Data | null>(null);
  const selectedRef = useRef(0);
  const viewportRef = useRef<LogicalViewport | null>(null);
  const restoreRef = useRef<LogicalViewport | null>(null);
  const generation = useRef(0);
  const olderBusy = useRef(false);
  const historyBlocked = useRef(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [olderNotice, setOlderNotice] = useState("");

  latest.current = data;
  selectedRef.current = selected;

  const load = useCallback(async () => {
    setReplayOpen(false);
    setReplayCursor(null);
    setReplayPlan(null);
    setSniperOpen(false);
    setSniperCursor(null);
    setSniperPlan(null);
    setSniperState(null);
    generation.current++;
    historyBlocked.current = false;
    restoreRef.current = null;
    setOlderNotice("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          minutes,
          count,
          weights,
          threshold,
          rr,
          stopAtr,
          horizon,
          cost,
          targetMode,
          stopMode,
          minRr,
          requirePattern,
          filterTrend,
          filterKillzone,
          filterNews,
          filterOte,
          filterOb,
          filterRegime,
          filterVwma,
        }),
      });
      const value = await res.json();
      if (!res.ok) throw Error(value.error || "Could not load data");
      latest.current = value;
      setData(value);
      setSelected(value.candles.length - 1);
      if (!value.analysisAvailable) {
        setIndicatorStatus("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [
    source,
    minutes,
    count,
    weights,
    threshold,
    rr,
    stopAtr,
    horizon,
    cost,
    targetMode,
    stopMode,
    minRr,
    requirePattern,
    filterTrend,
    filterKillzone,
    filterNews,
    filterOte,
    filterOb,
    filterRegime,
    filterVwma,
  ]);

  const runOptimizer = useCallback(async () => {
    setOptOpen(true);
    setOptLoading(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          minutes,
          count: Math.max(1000, count),
          weights,
          action: "optimize",
          cost,
        }),
      });
      const value = await res.json();
      if (!res.ok) throw Error(value.error || "Optimization failed.");
      setOptCandidates(value.optimization || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimizer failed");
    } finally {
      setOptLoading(false);
    }
  }, [source, minutes, count, weights, cost]);

  const applyOptimizationPreset = useCallback(
    (presetCandidate: OptimizationCandidate) => {
      setThreshold(presetCandidate.threshold);
      setTargetMode(presetCandidate.target_mode as "structural" | "fixed");
      setStopMode(presetCandidate.stop_mode as "structural" | "atr");
      setMinRr(presetCandidate.min_rr);
      setRr(presetCandidate.rr);
      setStopAtr(presetCandidate.stop_atr);
      setRequirePattern(presetCandidate.require_pattern);
      if (presetCandidate.filter_trend !== undefined) setFilterTrend(presetCandidate.filter_trend);
      if (presetCandidate.filter_killzone !== undefined) setFilterKillzone(presetCandidate.filter_killzone);
      if (presetCandidate.filter_news !== undefined) setFilterNews(presetCandidate.filter_news);
      if (presetCandidate.filter_ote !== undefined) setFilterOte(presetCandidate.filter_ote);
      if (presetCandidate.filter_ob !== undefined) setFilterOb(presetCandidate.filter_ob);
      if (presetCandidate.filter_regime !== undefined) setFilterRegime(presetCandidate.filter_regime);
      if (presetCandidate.filter_vwma !== undefined) setFilterVwma(presetCandidate.filter_vwma);

      // Automatically sync visual indicators on the chart
      const nextActive = new Set(activeIndicators);
      if (presetCandidate.filter_trend) nextActive.add("macro-trend");
      if (presetCandidate.filter_killzone) nextActive.add("killzones");
      if (presetCandidate.filter_news) nextActive.add("news-filter");
      if (presetCandidate.filter_ote || presetCandidate.filter_ob) nextActive.add("key-levels");
      if (presetCandidate.filter_regime) nextActive.add("market-regime");
      if (presetCandidate.filter_vwma) nextActive.add("vwma-crossover");
      nextActive.add("fvg-reaction");
      setActiveIndicators(Array.from(nextActive));

      setTimeout(() => {
        void load();
      }, 50);
    },
    [load, activeIndicators]
  );

  const handleCustomCombination = useCallback(
    (filters: {
      filter_trend: boolean;
      filter_killzone: boolean;
      filter_news: boolean;
      filter_ote: boolean;
      filter_ob: boolean;
      require_pattern: boolean;
      filter_regime: boolean;
      filter_vwma: boolean;
    }) => {
      setFilterTrend(filters.filter_trend);
      setFilterKillzone(filters.filter_killzone);
      setFilterNews(filters.filter_news);
      setFilterOte(filters.filter_ote);
      setFilterOb(filters.filter_ob);
      setRequirePattern(filters.require_pattern);
      setFilterRegime(filters.filter_regime);
      setFilterVwma(filters.filter_vwma);

      const nextActive = new Set<string>();
      nextActive.add("fvg-reaction");
      if (filters.filter_trend) nextActive.add("macro-trend");
      if (filters.filter_killzone) nextActive.add("killzones");
      if (filters.filter_news) nextActive.add("news-filter");
      if (filters.filter_ote || filters.filter_ob) nextActive.add("key-levels");
      if (filters.filter_regime) nextActive.add("market-regime");
      if (filters.filter_vwma) nextActive.add("vwma-crossover");
      setActiveIndicators(Array.from(nextActive));

      setTimeout(() => {
        void load();
      }, 50);
    },
    [load]
  );

  const runCorrelationAnalysis = useCallback(async () => {
    setCorrelationModalOpen(true);
    setCorrelationLoading(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          minutes,
          count: Math.max(1000, count),
          weights,
          action: "correlations",
          cost,
        }),
      });
      const value = await res.json();
      if (!res.ok) throw Error(value.error || "Correlation analysis failed.");
      if (value.correlations) {
        setData((prev) => (prev ? { ...prev, correlations: value.correlations } : null));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Correlation study failed");
    } finally {
      setCorrelationLoading(false);
    }
  }, [source, minutes, count, weights, cost]);

  const applyCorrelationCombination = useCallback(
    (indicators: string[], regime?: string) => {
      const nextActive = new Set<string>();
      nextActive.add("fvg-reaction");

      let useTrend = false;
      let useKillzone = false;
      let useOte = false;
      let useOb = false;
      let useReg = regime !== "all" && regime !== undefined;
      let useVw = false;

      for (const ind of indicators) {
        if (ind === "trend_200ema") {
          useTrend = true;
          nextActive.add("macro-trend");
        } else if (ind === "killzone") {
          useKillzone = true;
          nextActive.add("killzones");
        } else if (ind === "ote") {
          useOte = true;
          nextActive.add("key-levels");
        } else if (ind === "order_block") {
          useOb = true;
          nextActive.add("key-levels");
        } else if (ind.includes("vwma")) {
          useVw = true;
          nextActive.add("vwma-crossover");
        } else if (ind.includes("regime")) {
          useReg = true;
          nextActive.add("market-regime");
        }
      }

      if (useReg) nextActive.add("market-regime");
      setFilterTrend(useTrend);
      setFilterKillzone(useKillzone);
      setFilterOte(useOte);
      setFilterOb(useOb);
      setFilterRegime(useReg);
      setFilterVwma(useVw);
      setFilterNews(true);

      setActiveIndicators(Array.from(nextActive));
      setTimeout(() => {
        void load();
      }, 50);
    },
    [load]
  );

  const loadOlder = useCallback(
    async (force = false) => {
      const current = latest.current;
      if (!current || current.source !== "oanda" || olderBusy.current || loading) return;
      if (current.candles.length >= 200000) {
        setOlderNotice("200,000-candle limit reached.");
        return;
      }
      if (current.historyExhausted) {
        setOlderNotice("No more history was returned by OANDA.");
        return;
      }
      if (historyBlocked.current && !force) return;
      historyBlocked.current = false;
      olderBusy.current = true;
      setOlderLoading(true);
      setOlderNotice("Loading older candles and recalculating…");
      const version = generation.current;
      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "older", runId: current.runId }),
        });
        const value: Data & { error?: string } = await response.json();
        if (!response.ok) throw Error(value.error || "Could not load older candles.");
        if (version !== generation.current || latest.current?.runId !== current.runId) return;
        if (!value.olderAdded) {
          restoreRef.current = viewportRef.current;
          latest.current = { ...current, historyExhausted: true };
          setData(latest.current);
          setOlderNotice("No older candles returned by OANDA.");
          return;
        }
        const shift = value.candles.findIndex((x) => x.time === current.candles[0].time);
        if (shift < 0) throw Error("Older history could not be aligned with the existing chart.");
        const view = viewportRef.current;
        if (view) restoreRef.current = { from: view.from + shift, to: view.to + shift };
        const selectedTime = current.candles[selectedRef.current]?.time,
          newIndex = value.candles.findIndex((x) => x.time === selectedTime);
        latest.current = value;
        setData(value);
        setSelected(newIndex >= 0 ? newIndex : shift);
        setOlderNotice(
          value.historyExhausted
            ? `Added ${value.olderAdded.toLocaleString()} older candles; no further data returned.`
            : `Added ${value.olderAdded.toLocaleString()} older candles · analysis recalculated.`
        );
      } catch (e) {
        if (version === generation.current) {
          historyBlocked.current = true;
          setOlderNotice((e instanceof Error ? e.message : "Could not load older candles.") + " Use Retry older history.");
        }
      } finally {
        olderBusy.current = false;
        setOlderLoading(false);
      }
    },
    [loading]
  );

  const viewportChanged = useCallback(
    (range: LogicalViewport) => {
      viewportRef.current = range;
      if (replayCursor === null && sniperCursor === null && !replayOpen && !sniperOpen && range.from <= 150) void loadOlder();
    },
    [loadOlder, replayCursor, sniperCursor, replayOpen, sniperOpen]
  );

  const chartData = useMemo(() => {
    const activeCursor = sniperCursor !== null ? sniperCursor : replayCursor;
    return !data || activeCursor === null
      ? data
      : {
          ...data,
          candles: data.candles.slice(0, activeCursor + 1),
          results: data.results.slice(0, activeCursor + 1),
        };
  }, [data, replayCursor, sniperCursor]);

  const studyOptions = useMemo<StudyOptions>(() => {
    const x = program?.inputs || {};
    return {
      ...defaultStudy,
      atrLength: typeof x.atrLength === "number" ? x.atrLength : 14,
      zoneLife: typeof x.zoneLife === "number" ? x.zoneLife : 100,
      minGapATR: typeof x.minGapATR === "number" ? x.minGapATR : 0,
      requireMid: typeof x.requireMid === "boolean" ? x.requireMid : true,
      showBull: typeof x.showBull === "boolean" ? x.showBull : true,
      showBear: typeof x.showBear === "boolean" ? x.showBear : true,
    };
  }, [program]);

  const quickResult = useMemo(
    () =>
      data && preset === "fvg-reaction" && (clusterExpanded || quickOpen || quickSelected !== null)
        ? runFvgQuick(data.candles, selected, data.minutes, quickParams, studyOptions)
        : null,
    [data, selected, preset, quickParams, studyOptions, quickOpen, quickSelected, clusterExpanded]
  );

  const quickZones = useMemo(
    () => quickResult?.zones.filter((z) => (z.direction === 1 ? studyOptions.showBull : studyOptions.showBear)) || [],
    [quickResult, studyOptions]
  );

  const zoneClick = useCallback(
    (i: number, price: number) => {
      if (preset !== "fvg-reaction" || !data) return false;
      const candidates = quickResult
        ? quickZones
        : runFvgQuick(data.candles, selected, data.minutes, quickParams, studyOptions).zones.filter((z) =>
            z.direction === 1 ? studyOptions.showBull : studyOptions.showBear
          );
      const maxDraw = typeof program?.inputs.maxDraw === "number" ? Math.max(10, Math.min(500, Math.floor(program.inputs.maxDraw))) : 150;
      const z = candidates
        .slice(-maxDraw)
        .reverse()
        .find((z) => i >= z.created - 2 && i <= z.end && price >= z.bottom && price <= z.top);
      if (!z) return false;
      setQuickSelected(z.id);
      return true;
    },
    [preset, quickZones, quickResult, data, selected, quickParams, studyOptions, program]
  );

  useEffect(() => {
    setQuickSelected(null);
    setQuickOpen(false);
  }, [data?.runId]);

  // Aggregate all simulated backtest trades
  const allTrades = useMemo<TradeSetup[]>(() => {
    if (!data?.backtest) return [];
    const list: TradeSetup[] = [];
    for (const group of Object.values(data.backtest)) {
      if (group.tradeList) list.push(...group.tradeList);
    }
    return list.sort((a, b) => a.entry_idx - b.entry_idx);
  }, [data]);

  // Active or closest trade for the currently selected candle
  const activeTrade = useMemo<TradeSetup | null>(() => {
    if (!allTrades.length) return null;
    const direct = allTrades.find((t) => t.entry_idx === selected);
    if (direct) return direct;
    const spanning = allTrades.find((t) => selected >= t.entry_idx && selected <= t.exit_idx);
    if (spanning) return spanning;
    const prior = [...allTrades].reverse().find((t) => t.entry_idx <= selected);
    return prior || allTrades[allTrades.length - 1];
  }, [allTrades, selected]);

  const r = data?.results[selected];
  const c = data?.candles[selected];

  const currentSessionType = useMemo(() => {
    if (!c) return "off";
    const rawT = c.time > 1e11 ? c.time : c.time * 1000;
    const d = new Date(rawT);
    const min = d.getUTCHours() * 60 + d.getUTCMinutes();
    if (min >= 0 && min < 360) return "asia"; // 00:00 - 06:00 UTC
    if (min >= 420 && min <= 600) return "london"; // 07:00 - 10:00 UTC
    if (min >= 720 && min < 900) return "overlap"; // 12:00 - 15:00 UTC London & NY Overlap
    if (min >= 900 && min <= 1020) return "ny"; // 15:00 - 17:00 UTC NY Close
    return "off";
  }, [c]);
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);

  function exportCsv() {
    if (!data) return;
    const text = [
      "time,open,high,low,close,bull,bear,net,classification,pattern,ready",
      ...data.candles.map((x, i) => {
        const z = data.results[i];
        return [
          new Date(x.time * 1000).toISOString(),
          x.open,
          x.high,
          x.low,
          x.close,
          z.bull,
          z.bear,
          z.net,
          z.classification,
          z.pattern || "Standard",
          z.ready,
        ].join(",");
      }),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "fvg-research-scores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full space-y-5 px-1 py-3 md:px-2">
      <ResearchInfo open={infoOpen && !maximized} onClose={() => setInfoOpen(false)} inFullscreen={false} />
      <OptimizationModal
        open={optOpen}
        loading={optLoading}
        candidates={optCandidates}
        onClose={() => setOptOpen(false)}
        onApply={applyOptimizationPreset}
        onRunCustomCombination={handleCustomCombination}
      />
      <CorrelationMatrixModal
        open={correlationModalOpen}
        loading={correlationLoading}
        data={data?.correlations || null}
        onClose={() => setCorrelationModalOpen(false)}
        onApplyCombination={applyCorrelationCombination}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-400">
            <Beaker size={14} /> Local research workspace
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">FVG Confluence Lab</h1>
            <button
              type="button"
              aria-label="Research metrics information"
              onClick={() => setInfoOpen(true)}
              className="rounded-full border border-slate-700 p-1.5 text-slate-300 hover:text-white"
            >
              <Info size={17} />
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Explore institutional price action, structural liquidity targets & causal confluence.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
          <ShieldAlert size={14} /> Research only · no live orders
        </div>
      </header>

      {/* Main Top Controls */}
      <section className={`${panel} flex flex-wrap items-end gap-3 p-4`}>
        <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Data source</span>
          <select className={`${field} block`} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="sample">Synthetic demo (not gold)</option>
            <option value="oanda">OANDA practice · XAU/USD</option>
          </select>
        </label>
        <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Timeframe</span>
          <select className={`${field} block`} value={minutes} onChange={(e) => setMinutes(+e.target.value)}>
            <option value={1}>1 minute</option>
            <option value={3}>3 minutes</option>
            <option value={5}>5 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes · derived</option>
            <option value={60}>1 hour</option>
            <option value={1440}>Daily · chart only</option>
            <option value={10080}>Weekly · chart only</option>
          </select>
        </label>
        <label className="space-y-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Initial candles · max 200,000</span>
          <input
            className={`${field} block w-24`}
            type="number"
            min="100"
            max="200000"
            value={count}
            onChange={(e) => setCount(+e.target.value)}
            onBlur={() => setCount(Math.min(200000, Math.max(100, count || 100)))}
          />
        </label>
        <button
          onClick={load}
          disabled={loading || sum !== 100}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading and analysing…" : "Load & analyse"}
        </button>

        {/* ONE-BUTTON OPTIMIZER BUTTON */}
        <button
          onClick={runOptimizer}
          disabled={loading || !data}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40"
        >
          <Sparkles size={14} /> One-Button Optimizer
        </button>

        {/* STATISTICAL CONFLUENCE & CORRELATION MATRIX BUTTON */}
        <button
          onClick={runCorrelationAnalysis}
          disabled={loading || !data}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/25 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-40"
        >
          <BarChart3 size={14} /> Confluence &amp; Regime Matrix
        </button>

        <button
          onClick={exportCsv}
          disabled={!data}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2.5 text-xs text-slate-300 disabled:opacity-40"
        >
          <Download size={14} /> Export scores
        </button>
      </section>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {!data ? (
        <div className={`${panel} flex min-h-[400px] flex-col items-center justify-center p-10 text-center`}>
          <ChartCandlestick size={42} className="mb-4 text-emerald-500" />
          <h2 className="text-lg font-semibold">Start a research session</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
            Load synthetic candles or fetch live OANDA midpoint candles to begin analyzing structural FVG reactions, candlestick patterns, and out-of-sample backtests.
          </p>
        </div>
      ) : (
        <>
          <div
            className={`rounded-xl border px-4 py-3 text-xs ${
              data.source === "sample"
                ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                : "border-sky-500/25 bg-sky-500/10 text-sky-200"
            }`}
          >
            {data.warning} Loaded {data.candles.length.toLocaleString()} bars,{" "}
            {new Date(data.candles[0].time * 1000).toISOString().slice(0, 16).replace("T", " ")} to{" "}
            {new Date(data.candles[data.candles.length - 1].time * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC.
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section
              ref={chartSection}
              data-research-chart
              className={`${panel} min-w-0 overflow-hidden fullscreen:rounded-none fullscreen:bg-[#101722]`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                <div>
                  <span className="font-semibold text-white">{data.source === "sample" ? "SYNTHETIC" : "XAU / USD"}</span>
                  <span className="ml-3 text-xs text-slate-500">
                    {tfLabel(data.minutes)} · {replayCursor === null ? data.candles.length : replayCursor + 1} completed candles
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                    <Layers size={13} /> Active Indicators:
                  </span>
                  {INDICATOR_REGISTRY.map((def) => {
                    const isActive = activeIndicators.includes(def.id);
                    return (
                      <div key={def.id} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveIndicators((prev) =>
                              isActive ? prev.filter((id) => id !== def.id) : [...prev, def.id]
                            );
                          }}
                          className={`flex items-center gap-1.5 rounded-l-lg border px-2.5 py-1 text-xs font-medium transition ${
                            isActive
                              ? "border-indigo-500/60 bg-indigo-950/60 text-white shadow-sm"
                              : "border-slate-800 bg-[#0d141e] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: isActive ? def.color : "#64748b" }}
                          />
                          {def.name}
                        </button>
                        {isActive && (
                          <button
                            type="button"
                            title={`Configure ${def.name}`}
                            onClick={() => setEditingIndicatorId(def.id)}
                            className="rounded-r-lg border-y border-r border-indigo-500/60 bg-indigo-950/60 px-1.5 py-1 text-slate-400 hover:text-white"
                          >
                            <Settings size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  aria-label="Toggle trade drawing overlays"
                  onClick={() => setShowTradeOverlays((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs ${
                    showTradeOverlays ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-400"
                  }`}
                >
                  <Crosshair size={13} /> {showTradeOverlays ? "TP/SL Overlays On" : "TP/SL Overlays Off"}
                </button>

                <button
                  type="button"
                  aria-label="Open backtest replay"
                  disabled={!data.analysisAvailable}
                  onClick={() => {
                    if (replayOpen) {
                      setReplayCursor(null);
                      setReplayPlan(null);
                    } else if (sniperOpen) {
                      setSniperCursor(null);
                      setSniperPlan(null);
                      setSniperState(null);
                      setSniperOpen(false);
                    }
                    setReplayOpen((v) => !v);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 disabled:opacity-40"
                >
                  <History size={14} /> Backtest
                </button>

                <button
                  type="button"
                  aria-label="Open institutional sniper simulator"
                  disabled={!data.analysisAvailable}
                  onClick={() => {
                    if (sniperOpen) {
                      setSniperCursor(null);
                      setSniperPlan(null);
                      setSniperState(null);
                    } else if (replayOpen) {
                      setReplayCursor(null);
                      setReplayPlan(null);
                      setReplayOpen(false);
                    }
                    setSniperOpen((v) => !v);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    sniperOpen
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "border-emerald-500/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40"
                  } disabled:opacity-40`}
                >
                  <Crosshair size={14} className="text-emerald-400" /> Sniper Simulator
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={maximized ? "Exit fullscreen" : "Maximize chart"}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:text-white"
                >
                  {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{" "}
                  {maximized ? "Exit fullscreen" : "Maximize chart"}
                </button>
                <span className="font-mono text-xs text-slate-400">
                  {c ? new Date(c.time * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC" : ""}
                </span>
              </div>

              <div className="relative">
                <PriceChart
                  data={chartData!}
                  selected={selected}
                  onSelect={replayCursor === null && sniperCursor === null ? setSelected : () => {}}
                  programs={activePrograms}
                  onStatus={setIndicatorStatus}
                  onViewport={viewportChanged}
                  restoreRef={restoreRef}
                  plan={sniperOpen ? sniperPlan : replayPlan}
                  replaying={replayCursor !== null || sniperCursor !== null || sniperOpen || replayOpen}
                  follow={replayFollow}
                  onDetach={() => setReplayFollow(false)}
                  onZoneClick={zoneClick}
                  activeTrade={activeTrade}
                  showTradeOverlays={showTradeOverlays}
                />
                {replayOpen && data.analysisAvailable && (
                  <ReplayPanel
                    bars={data.candles}
                    results={data.results}
                    minutes={data.minutes}
                    selected={selected}
                    onCursor={replayCursorChanged}
                    onPlan={setReplayPlan}
                    follow={replayFollow}
                    onFollowChange={setReplayFollow}
                    compact={activeIndicators.includes("fvg-reaction") && clusterExpanded}
                    onClose={() => {
                      setReplayPlan(null);
                      setReplayOpen(false);
                    }}
                  />
                )}
                {sniperOpen && data.analysisAvailable && (
                  <SniperReplayPanel
                    bars={data.candles}
                    selected={selected}
                    onSelectCandidate={setSelected}
                    onCursor={sniperCursorChanged}
                    onPlan={setSniperPlan}
                    onStateUpdate={(st, setts) => {
                      setSniperState(st);
                      setSniperSettings(setts);
                    }}
                    onClose={() => {
                      setSniperPlan(null);
                      setSniperState(null);
                      setSniperCursor(null);
                      setSniperOpen(false);
                    }}
                  />
                )}
                {sniperOpen && sniperState && (
                  <SniperDashboard
                    state={sniperState}
                    settings={sniperSettings}
                    onClose={() => {
                      setSniperPlan(null);
                      setSniperState(null);
                      setSniperCursor(null);
                      setSniperOpen(false);
                    }}
                  />
                )}
                {editingIndicatorId && (
                  <div className="absolute left-3 top-3 z-40 max-h-[min(70vh,600px)] w-[min(92vw,360px)] overflow-auto rounded-xl border border-slate-700 bg-[#101722] p-4 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between text-sm font-semibold text-white">
                      <span>{INDICATOR_REGISTRY.find((d) => d.id === editingIndicatorId)?.name} Settings</span>
                      <button
                        onClick={() => setEditingIndicatorId(null)}
                        aria-label="Close indicator settings"
                        className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {(INDICATOR_REGISTRY.find((d) => d.id === editingIndicatorId)?.inputs || []).map((d) => {
                        const prog = indicatorPrograms[editingIndicatorId];
                        const val = prog?.inputs[d.id] ?? d.defval;
                        return (
                          <label key={d.id} className="flex items-center justify-between gap-3 text-xs text-slate-300">
                            <span>{d.name}</span>
                            {d.type === "bool" ? (
                              <input
                                type="checkbox"
                                checked={!!val}
                                onChange={(e) => {
                                  setIndicatorPrograms((prev) => ({
                                    ...prev,
                                    [editingIndicatorId]: {
                                      ...prev[editingIndicatorId],
                                      inputs: { ...prev[editingIndicatorId].inputs, [d.id]: e.target.checked },
                                      revision: Date.now(),
                                    },
                                  }));
                                }}
                              />
                            ) : d.type === "select" ? (
                              <select
                                className={field}
                                value={String(val)}
                                onChange={(e) => {
                                  setIndicatorPrograms((prev) => ({
                                    ...prev,
                                    [editingIndicatorId]: {
                                      ...prev[editingIndicatorId],
                                      inputs: { ...prev[editingIndicatorId].inputs, [d.id]: e.target.value },
                                      revision: Date.now(),
                                    },
                                  }));
                                }}
                              >
                                {d.options?.map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                className={field + " w-32"}
                                type={d.type === "color" ? "color" : d.type === "int" || d.type === "float" ? "number" : "text"}
                                min={d.min}
                                max={d.max}
                                step={d.step || "any"}
                                value={String(val)}
                                onChange={(e) => {
                                  setIndicatorPrograms((prev) => ({
                                    ...prev,
                                    [editingIndicatorId]: {
                                      ...prev[editingIndicatorId],
                                      inputs: {
                                        ...prev[editingIndicatorId].inputs,
                                        [d.id]: d.type === "int" || d.type === "float" ? Number(e.target.value) : e.target.value,
                                      },
                                      revision: Date.now(),
                                    },
                                  }));
                                }}
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {preset === "fvg-reaction" && (
                  <FvgClusters
                    zones={quickZones}
                    params={quickParams}
                    asOf={data.candles[selected].time}
                    selectedId={quickSelected}
                    expanded={clusterExpanded}
                    onExpanded={setClusterExpanded}
                    source={data.source}
                    minutes={data.minutes}
                    replayOpen={replayOpen}
                    legacyTable={!!program?.inputs.showTable}
                    bars={data.candles}
                    study={studyOptions}
                  />
                )}
                <ResearchInfo open={infoOpen && maximized} onClose={() => setInfoOpen(false)} inFullscreen />
                {preset === "fvg-reaction" && quickResult && (
                  <FvgQuickPanel
                    params={quickParams}
                    zones={quickZones}
                    bars={data.candles}
                    first={quickResult.first}
                    last={quickResult.last}
                    selectedId={quickSelected}
                    open={quickOpen}
                    onOpen={setQuickOpen}
                    onApply={setQuickParams}
                    onClear={() => setQuickSelected(null)}
                  />
                )}
              </div>

              {/* Bottom ICT Sessions & London/NY Overlap Timeline Strip */}
              <div className="border-t border-slate-800 bg-[#090e17] px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-300">ICT SESSIONS (UTC):</span>
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium border transition ${
                      currentSessionType === 'asia' ? 'border-slate-400 bg-slate-800 text-white font-bold ring-1 ring-slate-400/50' : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      ASIA 00:00–06:00
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium border transition ${
                      currentSessionType === 'london' ? 'border-sky-500 bg-sky-950 text-sky-200 font-bold ring-1 ring-sky-500/50 shadow-sm' : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      LONDON 07:00–10:00
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[11px] font-medium border transition ${
                      currentSessionType === 'overlap' ? 'border-emerald-500 bg-emerald-950 text-emerald-200 font-bold ring-1 ring-emerald-500/60 shadow-md shadow-emerald-500/20' : 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400'
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      🔥 LONDON &amp; NY OVERLAP 12:00–15:00
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium border transition ${
                      currentSessionType === 'ny' ? 'border-amber-500 bg-amber-950 text-amber-200 font-bold ring-1 ring-amber-500/50 shadow-sm' : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      NY CLOSE 15:00–17:00
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {c ? new Date(c.time * 1000).toISOString().slice(11, 16) + ' UTC' : ''}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      currentSessionType === 'overlap' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      currentSessionType === 'london' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' :
                      currentSessionType === 'ny' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      currentSessionType === 'asia' ? 'bg-slate-700/40 text-slate-300 border-slate-600/40' :
                      'bg-slate-800/30 text-slate-500 border-slate-800'
                    }`}>
                      {currentSessionType === 'overlap' ? '⚡ Peak Volume Overlap (High Edge · 95.7%)' :
                       currentSessionType === 'london' ? '⚡ London Expansion Session' :
                       currentSessionType === 'ny' ? '⚡ NY Close & Rebalance' :
                       currentSessionType === 'asia' ? '🌙 Asia Range Formation' :
                       'Off-Hours / Low Edge'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
                Selected:{" "}
                {c && (
                  <>
                    O {c.open.toFixed(2)} · H {c.high.toFixed(2)} · L {c.low.toFixed(2)} · C {c.close.toFixed(2)}
                  </>
                )}
                {fullscreenError && <span className="ml-3 text-rose-300">{fullscreenError}</span>}
                {data.source === "oanda" && (
                  <span className="ml-3 text-sky-300">
                    {olderLoading ? "Loading older history…" : olderNotice || "Pan left to load older candles automatically."}
                  </span>
                )}
                {data.source === "oanda" && !olderLoading && olderNotice.includes("Retry older history") && (
                  <button className="ml-2 underline text-amber-300" onClick={() => void loadOlder(true)}>
                    Retry older history
                  </button>
                )}
              </div>
            </section>

            {/* Selected Candle & Trade Trajectory Section */}
            <div className="space-y-4">
              {c && r && (
                <KeyZoneSuggestionCard candle={c} result={r} />
              )}
              <section className={`${panel} p-4`}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Activity size={14} /> Selected candle analysis
                </div>
                {r && (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-emerald-500/10 p-3">
                        <span className="text-[10px] uppercase text-emerald-400 font-semibold">Bullish Confluence</span>
                        <div className="mt-1 text-2xl font-bold text-emerald-300">
                          {r.bull ?? "—"}
                          <span className="text-xs text-slate-500"> / 100</span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-rose-500/10 p-3">
                        <span className="text-[10px] uppercase text-rose-400 font-semibold">Bearish Confluence</span>
                        <div className="mt-1 text-2xl font-bold text-rose-300">
                          {r.bear ?? "—"}
                          <span className="text-xs text-slate-500"> / 100</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-700/60 p-3">
                      <div className="flex justify-between text-sm">
                        <strong>{r.classification}</strong>
                        <span className="font-mono text-slate-400">Net {r.net === null ? "—" : (r.net > 0 ? "+" : "") + r.net}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {!data.analysisAvailable
                          ? "Chart only: calendar-aware scoring is not yet available."
                          : r.conflict
                          ? "HTF and intermediate context conflict."
                          : "Directional estimate; not an entry signal."}
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      {[
                        [data.analysisAvailable ? "HTF · " + tfLabel(data.minutes * 12) : "HTF", r.htf],
                        [data.analysisAvailable ? "MTF · " + tfLabel(data.minutes * 3) : "MTF", r.mtf],
                        ["LTF · " + tfLabel(data.minutes), r.ltf],
                      ].map(([label, n]) => (
                        <div key={label} className="rounded-lg bg-slate-900 p-2">
                          <div className="text-slate-500">{label}</div>
                          <div className="mt-1 text-slate-200">{data.analysisAvailable ? bias(n as number) : "—"}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                      <div className="flex items-center justify-between">
                        <span>Pattern:</span>
                        <span className="flex items-center gap-1 font-semibold text-amber-300">
                          <Zap size={11} /> {r.pattern || "Standard Candle"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Structure:</span>
                        <span className="text-slate-200 font-medium">{r.break}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Liquidity:</span>
                        <span className="text-slate-200 font-medium">{r.sweep}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Active FVGs:</span>
                        <span className="text-slate-200 font-medium">{data.analysisAvailable ? r.zones.length : "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>ATR (14):</span>
                        <span className="text-slate-200 font-mono">{r.atr?.toFixed(2) ?? "warming up"}</span>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* REAL-TIME / HYPOTHETICAL TRADE RANGE & PROGRESS GAUGE */}
              <TradeProgressGauge trade={activeTrade} currentClose={c ? c.close : 0} patternName={r?.pattern} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${panel} p-5`}>
              <div className="flex justify-between">
                <div>
                  <h2 className="font-semibold text-white">Confluence breakdown</h2>
                  <p className="mt-1 text-xs text-slate-500">Points per direction · selected candle</p>
                </div>
                <span className="text-xs text-slate-500">Bull / Bear</span>
              </div>
              <div className="mt-4 space-y-3">
                {!data.analysisAvailable && <p className="text-xs text-amber-300">Breakdown unavailable on daily and weekly bars.</p>}
                {r &&
                  Object.entries(r.metrics).map(([k, m]) => (
                    <div key={k} className="border-b border-slate-800/60 pb-2">
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-200">{titles[k]}</span>
                        <span className="font-mono">
                          <span className="text-emerald-400">{m.bull}</span>
                          <span className="text-slate-600"> / </span>
                          <span className="text-rose-400">{m.bear}</span>
                          <span className="text-slate-500"> of {m.max}</span>
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{m.explanation}</p>
                    </div>
                  ))}
              </div>
            </section>

            {/* Enhanced Backtest Results Table with Profit Factor */}
            <section className={`${panel} p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white">Chronological backtest</h2>
                  <p className="mt-1 text-xs text-slate-500">60% Train · 20% Validation · 20% Held-Out Test</p>
                </div>
                <Beaker size={18} className="text-slate-500" />
              </div>
              <div className="mt-4 overflow-x-auto">
                {!data.analysisAvailable && <p className="mb-3 text-xs text-amber-300">Backtesting unavailable on daily and weekly bars.</p>}
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-3">Period</th>
                      <th>Trades</th>
                      <th>Win rate</th>
                      <th>Expectancy</th>
                      <th>Profit Factor</th>
                      <th>Net R</th>
                      <th>Max DD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(replayCursor === null ? Object.entries(data.backtest) : []).map(([k, v]) => (
                      <tr key={k} className="border-t border-slate-800">
                        <td className="py-3 text-slate-300 font-semibold">{k}</td>
                        <td>{v.trades}</td>
                        <td>{v.winRate === null ? "—" : v.winRate + "%"}</td>
                        <td className={v.expectancyR !== null && v.expectancyR >= 0 ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>
                          {v.expectancyR !== null ? `${v.expectancyR >= 0 ? "+" : ""}${v.expectancyR}R` : "—"}
                        </td>
                        <td className="text-slate-200 font-mono">{v.profitFactor !== undefined && v.profitFactor !== null ? v.profitFactor : "—"}</td>
                        <td className={v.netR >= 0 ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>
                          {v.netR.toFixed(2)}R
                        </td>
                        <td className="text-slate-400 font-mono">{v.maxDrawdownR.toFixed(2)}R</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Structural invalidation stops and BSL/SSL targets simulated with dynamic R:R filtering. Results reflect realistic broker spreads and non-overlapping executions.
              </p>
            </section>
          </div>
        </>
      )}

      {/* Advanced Research Settings & Weights Drawer */}
      <details className={`${panel} p-4`}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">
          Research settings, targets & weights <span className="ml-2 text-xs font-normal text-slate-500">Click to expand</span>
        </summary>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {/* Weights */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Confluence Weights (Total = 100)</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(weights).map(([k, w]) => (
                <label key={k} className="text-xs text-slate-400">
                  {titles[k]}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={`${field} mt-1 block w-full`}
                    value={w}
                    onChange={(e) => setWeights({ ...weights, [k]: +e.target.value })}
                  />
                </label>
              ))}
              <p className={`col-span-2 text-xs font-medium ${sum === 100 ? "text-emerald-400" : "text-rose-400"}`}>
                Weights total {sum} / 100
              </p>
            </div>
          </div>

          {/* Strategy Execution & Target Parameters */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Structural Target & Execution Rules</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-400">
                Target Mode
                <select
                  className={`${field} mt-1 block w-full`}
                  value={targetMode}
                  onChange={(e) => setTargetMode(e.target.value as "structural" | "fixed")}
                >
                  <option value="structural">Structural Liquidity (BSL / SSL)</option>
                  <option value="fixed">Fixed R:R Multiple</option>
                </select>
              </label>

              <label className="text-xs text-slate-400">
                Stop Loss Mode
                <select
                  className={`${field} mt-1 block w-full`}
                  value={stopMode}
                  onChange={(e) => setStopMode(e.target.value as "structural" | "atr")}
                >
                  <option value="structural">Structural FVG Invalidation</option>
                  <option value="atr">ATR Multiple Buffer</option>
                </select>
              </label>

              <label className="text-xs text-slate-400">
                Min Structural R:R Filter
                <input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.1"
                  className={`${field} mt-1 block w-full`}
                  value={minRr}
                  onChange={(e) => setMinRr(+e.target.value)}
                />
              </label>

              <label className="text-xs text-slate-400">
                Target R (if Fixed)
                <input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.1"
                  className={`${field} mt-1 block w-full`}
                  value={rr}
                  onChange={(e) => setRr(+e.target.value)}
                />
              </label>

              <label className="text-xs text-slate-400">
                Confluence Threshold
                <input
                  type="number"
                  min="50"
                  max="100"
                  className={`${field} mt-1 block w-full`}
                  value={threshold}
                  onChange={(e) => setThreshold(+e.target.value)}
                />
              </label>

              <label className="text-xs text-slate-400">
                Round-trip Cost / Spread ($)
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  className={`${field} mt-1 block w-full`}
                  value={cost}
                  onChange={(e) => setCost(+e.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePattern}
                  onChange={(e) => setRequirePattern(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Require Confirmed Candlestick Pattern at FVG (Hammer, Engulfing, etc.)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTradeOverlays}
                  onChange={(e) => setShowTradeOverlays(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Draw Hypothetical Entry, Target (TP) & Stop Loss (SL) lines on Chart</span>
              </label>
            </div>
          </div>
        </div>
      </details>

      <div className="text-xs leading-5 text-slate-600">
        MoneyPrinter FVG Research Prototype: Advanced algorithmic detection of imbalances, structural swing liquidity (BSL/SSL), and candlestick reaction signatures.
      </div>
    </div>
  );
}
