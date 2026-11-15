"use client";
import React, { useEffect, useRef, useState } from "react";
import { 
  GripHorizontal, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  X, 
  Crosshair, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  Flame,
  Coins,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  BarChart3,
  BookmarkPlus,
  ArrowRight,
  MousePointerClick,
  Zap
} from "lucide-react";
import { 
  initSniperSimulation, 
  stepSniperSimulation, 
  sniperDefaults, 
  getKillzoneSession,
  getSniperRadarStatus,
  computeSniperStats,
  saveSniperRun,
  loadSavedSniperRuns,
  getStrategyDisplayName,
  type SniperBar, 
  type SniperSettings, 
  type SniperState, 
  type SniperPlan,
  type LotSizeMode,
  type SniperStrategyMode,
  type SniperSessionFilter,
  type SniperExecutionType
} from "@/lib/sniperReplay";
import { SniperHistoryModal } from "./SniperHistoryModal";

interface Props {
  bars: SniperBar[];
  selected: number;
  onCursor: (i: number | null) => void;
  onSelectCandidate?: (i: number) => void;
  onClose: () => void;
  onPlan: (plan: SniperPlan | null) => void;
  onStateUpdate: (state: SniperState | null, settings: SniperSettings) => void;
}

export function SniperReplayPanel({
  bars,
  selected,
  onClose,
  onCursor,
  onSelectCandidate,
  onPlan,
  onStateUpdate
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointer: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // 2-Step Pre-Simulation Workflow: 'pick_candle' -> 'configure'
  const [setupStep, setSetupStep] = useState<'pick_candle' | 'configure'>('pick_candle');
  
  // Default to recent area if selected is 0 or unselected
  const initialIndex = selected > 14 && selected < bars.length - 2 
    ? selected 
    : Math.max(14, bars.length - 120);
  const [candidateIndex, setCandidateIndex] = useState<number>(initialIndex);

  // Settings & Simulation State
  const [settings, setSettings] = useState<SniperSettings>({ ...sniperDefaults, initialBalance: 1000, lotSizeMode: "fixed_lots", fixedLots: 0.05, riskPct: 2, contractType: "standard_contract", sessionFilter: "killzone_only" });
  const [state, setState] = useState<SniperState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");

  // Sync candidate index if user clicks chart directly in pick_candle mode
  useEffect(() => {
    if (!state && selected >= 14 && selected < bars.length) {
      setCandidateIndex(selected);
    }
  }, [selected, state]);

  function updateCandidate(newIdx: number) {
    const clamped = Math.max(14, Math.min(newIdx, bars.length - 2));
    setCandidateIndex(clamped);
    if (onSelectCandidate) {
      onSelectCandidate(clamped);
    }
  }

  function clamp(x: number, y: number) {
    const panel = panelRef.current;
    const parent = panel?.parentElement;
    if (!panel || !parent) return { x, y };
    const rect = parent.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const maxX = Math.max(0, rect.width - panelRect.width);
    const maxY = Math.max(0, rect.height - panelRect.height);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  }

  function dragStart(e: React.PointerEvent<HTMLButtonElement>) {
    const panel = panelRef.current;
    const parent = panel?.parentElement;
    if (!panel || !parent) return;
    const parentRect = parent.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const point = position || {
      x: panelRect.left - parentRect.left,
      y: panelRect.top - parentRect.top,
    };
    dragRef.current = { pointer: e.pointerId, startX: e.clientX, startY: e.clientY, x: point.x, y: point.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    e.preventDefault();
  }

  function dragMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d || d.pointer !== e.pointerId) return;
    setPosition(clamp(d.x + e.clientX - d.startX, d.y + e.clientY - d.startY));
  }

  function dragEnd(e: React.PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointer !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  // Auto-play loop
  useEffect(() => {
    if (!state || !playing) return;
    if (state.index >= bars.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setState(old => old ? stepSniperSimulation(old, bars, settings) : old);
    }, 1000 / speed);
    return () => clearTimeout(timer);
  }, [playing, state, speed, bars, settings]);

  // Synchronize with chart cursor & active plan
  useEffect(() => {
    if (state) {
      onCursor(state.index);
      onPlan(state.activePlan);
      onStateUpdate(state, settings);
    } else {
      onPlan(null);
      onStateUpdate(null, settings);
    }
  }, [state, onCursor, onPlan, onStateUpdate, settings]);

  function start() {
    setPlaying(false);
    const startIdx = Math.max(14, Math.min(candidateIndex, bars.length - 2));
    const init = initSniperSimulation(startIdx, bars, settings);
    setState(init);
  }

  function saveCurrentRun() {
    if (!state || state.outcomes.length === 0) return;
    const stats = computeSniperStats(state.outcomes, settings.initialBalance, state.balance);
    saveSniperRun({
      id: `run-${Date.now()}`,
      timestamp: Date.now(),
      strategyProfile: settings.strategyProfile,
      strategyName: getStrategyDisplayName(settings.strategyProfile),
      initialBalance: settings.initialBalance,
      finalBalance: state.balance,
      netDollars: stats.netDollars,
      netReturnPct: stats.netReturnPct,
      winRate: stats.winRate,
      profitFactor: stats.profitFactor,
      maxDrawdownPct: state.maxDrawdownPct,
      totalTrades: stats.totalTrades,
      winCount: stats.winCount,
      lossCount: stats.lossCount,
    });
    setSavedNotice("Saved to local storage!");
    setTimeout(() => setSavedNotice(""), 2500);
  }

  function downloadDecisionLog() {
    const rows = state?.decisionLog || [];
    const keys = ['session','daily_limit','volume','atr','outlier_guard','contiguous','internal_trend','ema_alignment','protected_swing','directional_close','entry_trigger','fvg_retest','ma_reaction','pullback_continuation','sweep_reclaim','stop_valid','lot_valid'];
    const csv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const data = [['decision_time_utc','candle_open_utc','status','direction','mode','blocked','close','entry','stop','target','lots',...keys], ...rows.map(r => [new Date(r.time*1000).toISOString(),new Date(r.candleTime*1000).toISOString(),r.status,r.direction,r.mode,r.blocked.join('; '),r.close,r.entry,r.stop,r.target,r.lots,...keys.map(k => r.checks[k] ?? '')])].map(row => row.map(csv).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='triad-decisions.csv';link.click();URL.revokeObjectURL(url);
  }

  function reset() {
    setPlaying(false);
    // Auto-save run if trades were completed
    if (state && state.outcomes.length > 0) {
      saveCurrentRun();
    }
    setState(null);
    setSetupStep('pick_candle');
    onCursor(null);
    onPlan(null);
    onStateUpdate(null, settings);
  }

  const currentIdx = state ? state.index : candidateIndex;
  const currentBar = bars[currentIdx];
  const radar = currentBar ? getSniperRadarStatus(bars, currentIdx) : null;
  const sessionInfo = radar ? radar.session : (currentBar ? getKillzoneSession(currentBar.time) : { inKillzone: false, name: "Off-Hours", priority: 0 });

  return (
    <>
      <div
        ref={panelRef}
        style={position ? { left: position.x, top: position.y, right: "auto" } : undefined}
        className="absolute top-4 left-4 z-40 w-[420px] rounded-2xl border border-slate-700 bg-[#0b1320]/95 p-4 text-xs text-slate-300 shadow-2xl backdrop-blur-md"
      >
        {/* Header bar with drag handle */}
        <div className="-mx-4 -mt-4 mb-3 flex items-center justify-between border-b border-slate-800 bg-[#080d16] px-4 py-3 rounded-t-2xl">
          <button
            type="button"
            onPointerDown={dragStart}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            className={`flex flex-1 items-center gap-2 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          >
            <GripHorizontal size={15} className="text-slate-500" />
            <div className="text-left">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <Crosshair size={14} className="text-emerald-400" />
                <span>Institutional Sniper Engine</span>
              </span>
              <span className="text-[10px] text-slate-400">Gold (XAU/USD) · Multi-Strategy Simulation</span>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1 rounded bg-slate-800/80 hover:bg-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 transition"
              title="Compare all saved strategy runs"
            >
              <BarChart3 size={12} className="text-cyan-400" />
              <span>Compare</span>
            </button>
            <button
              onClick={() => { setPlaying(false); onClose(); }}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {!state ? (
          setupStep === 'pick_candle' ? (
            /* STEP 1: INTERACTIVE START CANDLE SELECTOR */
            <div className="space-y-3">
              {/* Step indicator header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <MousePointerClick size={13} />
                  Step 1 of 2 · Pick Start Candle
                </span>
                <span className="text-[10px] text-slate-500">
                  Candle #{candidateIndex + 1} of {bars.length}
                </span>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5">
                <p className="text-[11px] font-medium text-emerald-200 flex items-center gap-1.5">
                  <MousePointerClick size={13} className="text-emerald-400" />
                  Drag the chart &amp; click any candle to start
                </p>
                <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                  The simulation runs forward candle-by-candle from your chosen bar with zero future look-ahead.
                </p>
              </div>

              {/* Selected Candle Inspector Card */}
              {currentBar && (
                <div className="rounded-xl border border-slate-800 bg-[#070c14] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Selected Date &amp; Time</span>
                      <span className="font-mono text-xs font-bold text-white">
                        {new Date(currentBar.time * 1000).toISOString().replace("T", " ").slice(0, 16)} UTC
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      sessionInfo.priority === 1
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                        : sessionInfo.inKillzone
                        ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-300"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}>
                      {sessionInfo.name}
                    </span>
                  </div>

                  {/* OHLC Stats */}
                  <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px] bg-slate-900/60 rounded-lg p-2 border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Open</span>
                      <span className="text-slate-300">${currentBar.open.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">High</span>
                      <span className="text-emerald-400">${currentBar.high.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Low</span>
                      <span className="text-rose-400">${currentBar.low.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Close</span>
                      <span className="text-white font-bold">${currentBar.close.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* 5-Rule Live Status Snapshot at Selected Candle */}
                  {radar && (
                    <div className="border-t border-slate-800/80 pt-2 space-y-1 text-[10px]">
                      <div className="flex justify-between text-slate-400">
                        <span>Macro 200 EMA Gate:</span>
                        <span className={radar.macroTrend.isBull ? "text-emerald-400 font-semibold" : radar.macroTrend.isBear ? "text-rose-400 font-semibold" : "text-slate-400"}>
                          {radar.macroTrend.label}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>VWMA Momentum:</span>
                        <span className={radar.vwma.isBullCross ? "text-emerald-400" : radar.vwma.isBearCross ? "text-rose-400" : "text-slate-400"}>
                          {radar.vwma.label}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>FVG Retest State:</span>
                        <span className={radar.fvg.retesting ? "text-amber-400 font-semibold" : "text-slate-500"}>
                          {radar.fvg.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scrub navigation slider & jump buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Timeline Scrubber</span>
                  <span className="font-mono">{Math.round((candidateIndex / Math.max(1, bars.length - 1)) * 100)}% through history</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={bars.length - 2}
                  value={candidateIndex}
                  onChange={e => updateCandidate(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />

                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => updateCandidate(candidateIndex - 100)}
                    className="rounded bg-slate-900 border border-slate-800 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                  >
                    -100 bars
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCandidate(candidateIndex - 10)}
                    className="rounded bg-slate-900 border border-slate-800 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                  >
                    -10 bars
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCandidate(candidateIndex + 10)}
                    className="rounded bg-slate-900 border border-slate-800 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                  >
                    +10 bars
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCandidate(candidateIndex + 100)}
                    className="rounded bg-slate-900 border border-slate-800 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                  >
                    +100 bars
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCandidate(bars.length - 120)}
                    className="rounded bg-indigo-950/60 border border-indigo-700/60 py-1 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-900"
                    title="Jump to recent 120 candles"
                  >
                    ⚡ Recent
                  </button>
                </div>
              </div>

              {/* Proceed to Step 2 Button */}
              <button
                type="button"
                onClick={() => setSetupStep('configure')}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2"
              >
                <span>Lock Candle &amp; Configure Risk ($)</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            /* STEP 2: CONFIGURATION & METADATA SCREEN */
            <div className="space-y-3">
              {/* Step indicator header & back button */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Step 2 of 2 · Deposit &amp; Risk Settings
                </span>
                <button
                  type="button"
                  onClick={() => setSetupStep('pick_candle')}
                  className="flex items-center gap-1 rounded bg-slate-800/80 hover:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-300 transition"
                >
                  <RotateCcw size={10} />
                  <span>Change Start Candle</span>
                </button>
              </div>

              {/* Locked Start Candle Summary Pill */}
              {currentBar && (
                <div className="rounded-lg border border-slate-800 bg-[#070c14] px-3 py-2 flex items-center justify-between text-[10px]">
                  <div>
                    <span className="text-slate-500">Starting at: </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {new Date(currentBar.time * 1000).toISOString().replace("T", " ").slice(0, 16)} UTC
                    </span>
                  </div>
                  <span className="font-mono text-slate-400">
                    Candle #{candidateIndex + 1}
                  </span>
                </div>
              )}

              {/* Strategy Combination Selector */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-2.5">
                <label className="text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
                  <Sparkles size={12} className="text-indigo-400" />
                  Strategy Combination Profile
                </label>
                <select
                  value={settings.strategyProfile}
                  onChange={e => setSettings({ ...settings, strategyProfile: e.target.value as SniperStrategyMode, ...(e.target.value === "institutional_triad" ? { executionType: "market", contractType: "standard_contract" } : {}) })}
                  className="mt-1 w-full rounded border border-indigo-500/40 bg-slate-950 px-2.5 py-1.5 font-sans text-xs text-white font-bold"
                >
                  <option value="institutional_triad">🎯 Institutional Triad (FVG Retest + 200 EMA + VWMA)</option>
                  <option value="vwma_crossover">⚡ VWMA × EMA Zero-Lag Crossover (Volume Momentum)</option>
                  <option value="fvg_displacement">📊 Pure ICT FVG Imbalance Retest (Smart Money Zones)</option>
                  <option value="rapid_internal_scalp">🏹 Rapid Internal Scalp (High-Probability 1.0R - 1.25R)</option>
                </select>
                <span className="text-[9px] text-slate-400 block mt-1 leading-snug">
                  {settings.strategyProfile === 'institutional_triad' && 'Experimental: No-Wick internal trend + 200 EMA alignment and tick-VWMA/200 EMA reaction with directional close and protected swing stop. FVG retest is logged but not required. No trade without tick volume. Outlier pause is not a CPI/PPI calendar.'}
                  {settings.strategyProfile === 'vwma_crossover' && 'Trades Digital Signal Processed zero-lag volume acceleration crossing the 50 EMA.'}
                  {settings.strategyProfile === 'fvg_displacement' && 'Focuses strictly on Fair Value Gap liquidity retests with impulse invalidation.'}
                  {settings.strategyProfile === 'rapid_internal_scalp' && 'Frequent internal reaction scalp research; outcomes are not guaranteed.'}
                </span>
              </div>

              {/* Session Filter & Execution Mode */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Clock size={11} className="text-cyan-400" />
                    Session Filter
                  </label>
                  <select
                    value={settings.sessionFilter}
                    onChange={e => setSettings({ ...settings, sessionFilter: e.target.value as SniperSessionFilter })}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
                  >
                    <option value="all_sessions">All Sessions (24/7)</option>
                    <option value="killzone_only">Strict Killzones</option>
                    <option value="overlap_only">Overlap Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Zap size={11} className="text-amber-400" />
                    Execution Type
                  </label>
                  <select
                    value={settings.executionType}
                    onChange={e => setSettings({ ...settings, executionType: e.target.value as SniperExecutionType })}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white font-semibold"
                  >
                    <option value="market">⚡ Market (next candle open)</option>
                    <option value="limit" disabled={settings.strategyProfile === "institutional_triad"}>🎯 Limit (Retest Touch)</option>
                  </select>
                </div>
              </div>

              {/* Deposit & Sizing Model */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <DollarSign size={11} className="text-emerald-400" />
                    Deposit Balance ($)
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    value={settings.initialBalance}
                    onChange={e => setSettings({ ...settings, initialBalance: Math.max(50, Number(e.target.value)) })}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white font-bold"
                  />
                  <span className="text-[9px] text-slate-500">e.g. $100, $500, $1,000</span>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Coins size={11} className="text-amber-400" />
                    Contract &amp; Sizing Mode
                  </label>
                  <select
                    value={settings.contractType}
                    onChange={e => setSettings({ ...settings, contractType: e.target.value as any })}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="micro_contract" disabled={settings.strategyProfile === "institutional_triad"}>Micro-Units (other profiles only)</option>
                    <option value="standard_contract">Standard (0.01 min lot)</option>
                  </select>
                  <span className="text-[9px] text-slate-500">
                    {settings.contractType === 'micro_contract' ? 'Perfect for small accounts <= $500' : 'Standard 100 oz broker lot'}
                  </span>
                </div>
              </div>

              {settings.strategyProfile === "institutional_triad" && <div className="text-[10px] text-slate-300">Maximum lots <input type="number" min="0.01" step="0.01" value={settings.fixedLots} onChange={e => setSettings({ ...settings, lotSizeMode: "fixed_lots", fixedLots: Math.max(0.01, Number(e.target.value)) })} className="ml-2 w-20 rounded bg-slate-950 p-1 text-white" /> <span className="text-slate-400">Reduced or skipped to respect the planned risk cap; standard 100 oz/lot assumed.</span></div>}

              {/* Risk % Input + Gold Spread */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-400">Risk Per Trade (%)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.1"
                    max="2.0"
                    value={settings.riskPct}
                    onChange={e => setSettings({ ...settings, riskPct: Math.min(2, Math.max(0.1, Number(e.target.value))) })}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-emerald-400 font-bold"
                  />
                  <span className="text-[9px] text-slate-400">
                    Planned cap ${(settings.initialBalance * (settings.riskPct / 100)).toFixed(2)} risk on ${settings.initialBalance}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-400">Gold Spread ($/oz)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="5.0"
                    value={settings.spreadDollars}
                    onChange={e => setSettings({ ...settings, spreadDollars: Number(e.target.value) })}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-white"
                  />
                  <span className="text-[9px] text-slate-500">Default $0.25 (2.5 pips)</span>
                </div>
              </div>

              {/* Focus on Small Wins Toggle */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <input
                  type="checkbox"
                  id="focusSmallWins"
                  checked={settings.focusSmallWins}
                  onChange={e => setSettings({ ...settings, focusSmallWins: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20"
                />
                <label htmlFor="focusSmallWins" className="text-[10px] text-slate-300 cursor-pointer">
                  <span className="font-semibold text-emerald-300">
                    Small target preference (not guaranteed)
                  </span>
                  <span className="block text-slate-500">Protects small accounts from reversals &amp; achieves rapid accumulation</span>
                </label>
              </div>

              {/* Launch Replay Button */}
              <button
                type="button"
                onClick={start}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.99] transition"
              >
                🚀 Launch Sniper Replay
              </button>
            </div>
          )
        ) : (
          /* Active Replay Controls & Rule Radar */
          <div className="space-y-2.5">
            {/* Top Control Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying(!playing)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 font-bold text-slate-950 hover:bg-emerald-400 transition"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
                <span>{playing ? "Pause" : "Play"}</span>
              </button>

              <button
                onClick={() => setState(old => old ? stepSniperSimulation(old, bars, settings) : old)}
                disabled={playing || state.index >= bars.length - 1}
                className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                title="Next Candle"
              >
                <SkipForward size={14} />
              </button>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500">Speed:</span>
                <select
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-white"
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                  <option value={5}>5×</option>
                  <option value={10}>10×</option>
                  <option value={15}>15×</option>
                  <option value={20}>20×</option>
                </select>
              </div>

              {state.outcomes.length > 0 && (
                <button
                  onClick={saveCurrentRun}
                  className="flex items-center gap-1 rounded bg-indigo-500/20 border border-indigo-500/30 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-500/30 transition"
                  title="Save current run results to browser history"
                >
                  <BookmarkPlus size={12} />
                  <span>Save</span>
                </button>
              )}

              <button
                onClick={reset}
                className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                title="Reset simulation and save results"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            {savedNotice && (
              <div className="text-center font-semibold text-[10px] text-emerald-400 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/30">
                {savedNotice}
              </div>
            )}

            {settings.strategyProfile === 'institutional_triad' && state.decisionLog && <details className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-[10px] text-slate-300">
              <summary className="cursor-pointer font-semibold text-cyan-300">Decision checklist &amp; near misses ({state.decisionLog.length})</summary>
              <p className="mt-1 text-slate-400">Latest completed candle, not a forecast. Unknown checks are not passes. Log retains the latest 5,000 decisions{state.decisionLogDropped ? `; ${state.decisionLogDropped} earlier rows omitted` : ''}.</p>
              {state.decisionLog.length > 0 && <div className="mt-1 space-y-1">{(() => {const d=state.decisionLog![state.decisionLog!.length-1];return <><div>{new Date(d.time*1000).toISOString().slice(0,16).replace('T',' ')} UTC · {d.status} · {d.direction===1?'bull':d.direction===-1?'bear':'neutral'}</div><div className="text-amber-300">{d.blocked.length ? `Blocked: ${d.blocked.join(', ')}` : 'Checklist passes'}</div><div className="grid grid-cols-2 gap-x-2">{Object.entries(d.checks).map(([name,value]) => <div key={name} className={value===null?'text-slate-500':value?'text-emerald-300':'text-rose-300'}>{name.replaceAll('_',' ')}: {value===null?'not evaluated':value?'yes':'no'}</div>)}</div></>;})()}</div>}
              <button type="button" onClick={downloadDecisionLog} className="mt-2 rounded border border-cyan-700 px-2 py-1 text-cyan-200">Download decision CSV</button>
            </details>}

            {/* Live Rules Radar Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
              <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Position:</span>
                  <span className="font-mono text-slate-200">
                    {currentBar ? new Date(currentBar.time * 1000).toISOString().replace("T", " ").slice(0, 16) : ""} UTC
                  </span>
                </div>
                <select
                  value={settings.strategyProfile}
                  disabled={!!state}
                  onChange={e => {
                    const updated = { ...settings, strategyProfile: e.target.value as SniperStrategyMode };
                    setSettings(updated);
                    onStateUpdate(state, updated);
                  }}
                  className="rounded border border-indigo-500/30 bg-slate-950 px-1.5 py-0.5 text-[9px] text-indigo-300 font-bold"
                >
                  <option value="institutional_triad">🎯 Triad Confluence</option>
                  <option value="vwma_crossover">⚡ VWMA × EMA Cross</option>
                  <option value="fvg_displacement">📊 ICT FVG Retest</option>
                  <option value="rapid_internal_scalp">🏹 Rapid Scalp</option>
                </select>
              </div>

              {/* Legacy radar does not represent the experimental Triad rules. */}
              {settings.strategyProfile === "institutional_triad" ? <p className="mt-2 text-[10px] text-amber-300">Experimental Triad: FVG is recorded but not a trade requirement. Outlier pause cannot anticipate CPI/PPI. No live-order execution.</p> : <div className="mt-2 space-y-1.5 text-[10px]">
                {/* Rule 1: Killzone */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock size={12} className={radar?.session.inKillzone ? "text-emerald-400" : (settings.sessionFilter === 'all_sessions' ? "text-cyan-400" : "text-slate-500")} />
                    Rule 1: Session Gate
                  </span>
                  <span className={`font-semibold ${radar?.session.inKillzone ? "text-emerald-400" : (settings.sessionFilter === 'all_sessions' ? "text-cyan-300" : "text-slate-500")}`}>
                    {radar?.session.name || "Off-Hours"} {settings.sessionFilter === 'all_sessions' && !radar?.session.inKillzone ? "(24/7 Mode)" : ""}
                  </span>
                </div>

                {/* Rule 2: Macro Trend Gate */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <TrendingUp size={12} className={radar?.macroTrend.isBull ? "text-emerald-400" : radar?.macroTrend.isBear ? "text-rose-400" : "text-slate-400"} />
                    Rule 2: Macro Trend Gate
                  </span>
                  <span className={`font-semibold text-right truncate max-w-[210px] ${radar?.macroTrend.isBull ? "text-emerald-400" : radar?.macroTrend.isBear ? "text-rose-400" : "text-slate-400"}`}>
                    {radar?.macroTrend.label || "Flat"}
                  </span>
                </div>

                {/* Rule 3: VWMA Momentum */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Activity size={12} className={radar?.vwma.isBullCross ? "text-emerald-400" : radar?.vwma.isBearCross ? "text-rose-400" : "text-slate-400"} />
                    Rule 3: VWMA Momentum
                  </span>
                  <span className={`font-semibold text-right truncate max-w-[210px] ${radar?.vwma.isBullCross ? "text-emerald-400" : radar?.vwma.isBearCross ? "text-rose-400" : "text-slate-400"}`}>
                    {radar?.vwma.label || "Neutral"}
                  </span>
                </div>

                {/* Rule 4: FVG Imbalance */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Layers size={12} className={radar?.fvg.retesting ? "text-amber-400" : "text-slate-400"} />
                    Rule 4: FVG Imbalance
                  </span>
                  <span className={`font-semibold text-right truncate max-w-[210px] ${radar?.fvg.retesting ? "text-amber-300 font-bold" : "text-slate-400"}`}>
                    {radar?.fvg.label || "Clear"}
                  </span>
                </div>

                {/* Rule 5: Daily Cap */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ShieldCheck size={12} className="text-amber-400" />
                    Rule 5: Daily Cap (Max {settings.maxTradesPerDay})
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {state.todayTradesCount} / {settings.maxTradesPerDay} (Zero Forced)
                  </span>
                </div>
              </div>}
            </div>
          </div>
        )}
      </div>

      {/* History Comparison Modal */}
      <SniperHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectStrategy={(profile) => {
          setSettings(s => ({ ...s, strategyProfile: profile }));
        }}
      />
    </>
  );
}
