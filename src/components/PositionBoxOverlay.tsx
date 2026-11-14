"use client";
import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, Logical } from "lightweight-charts";
import type { TradeSetup } from "./TradeProgressGauge";
import type { Plan } from "@/lib/replay";

type Bar = { time: number; open: number; high: number; low: number; close: number };

interface Props {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  node: HTMLDivElement;
  bars: Bar[];
  activeTrade: TradeSetup | null;
  plan: Plan | null;
}

export function PositionBoxOverlay({ chart, series, node, bars, activeTrade, plan }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (!activeTrade && !plan)) {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let rafId = 0;
    const timeScale = chart.timeScale();

    function render() {
      if (!canvas || !chart || !series || !node) return;
      const width = Math.max(1, node.clientWidth);
      const height = Math.max(1, node.clientHeight);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const x0 = timeScale.logicalToCoordinate(0 as Logical);
      const x1 = timeScale.logicalToCoordinate(1 as Logical);
      if (x0 === null || x1 === null) return;
      const step = x1 - x0;
      const X = (i: number) => x0 + step * i;
      const Y = (p: number) => series.priceToCoordinate(p);

      // 1. Draw Simulated Replay Plan (if present)
      if (plan) {
        const isLong = plan.direction === 1;
        const entryIdx = plan.filled !== null ? plan.filled : plan.signal;
        const exitIdx = Math.min(bars.length - 1, entryIdx + 20);

        const xStart = X(entryIdx);
        const xEnd = Math.max(xStart + 60, X(exitIdx) + step);
        const yEntry = Y(plan.entry);
        const yTP = Y(plan.target);
        const ySL = Y(plan.stop);

        if ([xStart, xEnd, yEntry, yTP, ySL].every(v => v !== null && Number.isFinite(v))) {
          drawBox(ctx, {
            isLong,
            xStart,
            xEnd,
            yEntry: yEntry!,
            yTP: yTP!,
            ySL: ySL!,
            entryPrice: plan.entry,
            tpPrice: plan.target,
            slPrice: plan.stop,
            title: `SIMULATOR ${isLong ? "LONG" : "SHORT"}`,
            status: plan.filled !== null ? "FILLED" : "PENDING LIMIT"
          });
        }
      }

      // 2. Draw Active Algorithm Trade Setup (if present and no active replay plan)
      if (activeTrade && !plan) {
        const isLong = activeTrade.direction === 1;
        const fromIdx = activeTrade.entry_idx;
        const toIdx = activeTrade.exit_idx !== null && activeTrade.exit_idx !== undefined ? activeTrade.exit_idx : Math.min(bars.length - 1, fromIdx + 25);

        const xStart = X(fromIdx);
        const xEnd = Math.max(xStart + 70, X(toIdx) + step);
        const yEntry = Y(activeTrade.entry);
        const yTP = Y(activeTrade.tp);
        const ySL = Y(activeTrade.sl);

        if ([xStart, xEnd, yEntry, yTP, ySL].every(v => v !== null && Number.isFinite(v))) {
          drawBox(ctx, {
            isLong,
            xStart,
            xEnd,
            yEntry: yEntry!,
            yTP: yTP!,
            ySL: ySL!,
            entryPrice: activeTrade.entry,
            tpPrice: activeTrade.tp,
            slPrice: activeTrade.sl,
            rr: activeTrade.rr,
            title: `ALGO ${isLong ? "LONG" : "SHORT"}`,
            status: activeTrade.outcome ? String(activeTrade.outcome).toUpperCase() : "ACTIVE"
          });
        }
      }
    }

    function schedule() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(render);
    }

    timeScale.subscribeVisibleLogicalRangeChange(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(node);
    schedule();

    return () => {
      cancelAnimationFrame(rafId);
      timeScale.unsubscribeVisibleLogicalRangeChange(schedule);
      ro.disconnect();
    };
  }, [chart, series, node, bars, activeTrade, plan]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  );
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  s: {
    isLong: boolean;
    xStart: number;
    xEnd: number;
    yEntry: number;
    yTP: number;
    ySL: number;
    entryPrice: number;
    tpPrice: number;
    slPrice: number;
    rr?: number;
    title: string;
    status: string;
  }
) {
  const boxW = Math.max(40, s.xEnd - s.xStart);
  ctx.save();

  // Target Box (Profit Zone - Green)
  const topTarget = Math.min(s.yEntry, s.yTP);
  const heightTarget = Math.abs(s.yTP - s.yEntry);
  ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
  ctx.fillRect(s.xStart, topTarget, boxW, heightTarget);
  ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(s.xStart, topTarget, boxW, heightTarget);

  // Stop Box (Loss Zone - Red)
  const topStop = Math.min(s.yEntry, s.ySL);
  const heightStop = Math.abs(s.ySL - s.yEntry);
  ctx.fillStyle = "rgba(244, 63, 94, 0.22)";
  ctx.fillRect(s.xStart, topStop, boxW, heightStop);
  ctx.strokeStyle = "rgba(244, 63, 94, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(s.xStart, topStop, boxW, heightStop);

  // Center Entry Line (Dashed White/Blue)
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(s.xStart, s.yEntry);
  ctx.lineTo(s.xEnd, s.yEntry);
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels
  ctx.font = "bold 10px monospace";

  // Target Label
  ctx.fillStyle = "#10b981";
  ctx.fillRect(s.xEnd - 90, s.yTP - 14, 90, 14);
  ctx.fillStyle = "#0f172a";
  ctx.fillText(`TP $${s.tpPrice.toFixed(2)}`, s.xEnd - 86, s.yTP - 3);

  // Stop Label
  ctx.fillStyle = "#f43f5e";
  ctx.fillRect(s.xEnd - 90, s.ySL - 14, 90, 14);
  ctx.fillStyle = "#fff";
  ctx.fillText(`SL $${s.slPrice.toFixed(2)}`, s.xEnd - 86, s.ySL - 3);

  // Entry Label
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(s.xStart + 4, s.yEntry - 7, 76, 14);
  ctx.fillStyle = "#fff";
  ctx.fillText(`ENTRY $${s.entryPrice.toFixed(2)}`, s.xStart + 6, s.yEntry + 4);

  // Summary Badge Stamp
  const tagText = `${s.title} · ${s.status}`;
  ctx.font = "bold 9px system-ui, sans-serif";
  const tagW = ctx.measureText(tagText).width + 10;
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(s.xStart + 6, topTarget + 4, tagW, 16);
  ctx.fillStyle = s.isLong ? "#34d399" : "#fb7185";
  ctx.fillText(tagText, s.xStart + 11, topTarget + 15);

  ctx.restore();
}
