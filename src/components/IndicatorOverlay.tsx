"use client";
import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, Logical } from "lightweight-charts";
import type { IndicatorProgram } from "./IndicatorEditor";
import { indicatorSandboxHtml } from "@/lib/indicatorSandbox";

type Bar = { time: number; open: number; high: number; low: number; close: number };
type Geometry = {
  x0: number;
  step: number;
  y0: number;
  yStep: number;
  yBase: number;
  fromIdx: number;
  refLogical: number;
};

export function IndicatorOverlay({
  chart,
  series,
  node,
  bars,
  program,
  onStatus,
}: {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  node: HTMLDivElement;
  bars: Bar[];
  program: IndicatorProgram;
  onStatus: (s: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const seq = useRef(0);
  const callback = useRef(onStatus);
  const drawn = useRef<Geometry | null>(null);
  const requested = useRef<Map<number, Geometry>>(new Map());
  const syncRef = useRef<() => void>(() => {});
  callback.current = onStatus;

  // Handle messages from the isolated sandboxed iframe worker
  useEffect(() => {
    function message(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow || e.data?.channel !== "mp-indicator-v1") return;
      
      if (e.data.type === "ready") {
        setFrameReady(true);
        return;
      }

      if (e.data.type === "frame" && e.data.bitmap instanceof ImageBitmap) {
        // Accept the latest rendered frame
        if (e.data.id === seq.current && surface.current) {
          const c = surface.current;
          c.width = e.data.width;
          c.height = e.data.height;
          c.style.transform = ""; // Reset hardware matrix transform to exact alignment
          const ctx = c.getContext("2d");
          ctx?.clearRect(0, 0, c.width, c.height);
          ctx?.drawImage(e.data.bitmap, 0, 0);
          drawn.current = requested.current.get(e.data.id) || null;
          syncRef.current();
          callback.current("Rendered successfully");
          requested.current.clear();
        }
        e.data.bitmap.close();
      } else if (e.data.id === seq.current && e.data.type === "error") {
        const c = surface.current;
        c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
        drawn.current = null;
        callback.current(String(e.data.message || "Indicator error"));
      }
    }

    window.addEventListener("message", message);
    return () => window.removeEventListener("message", message);
  }, []);

  // Rendering & hardware transform synchronization
  useEffect(() => {
    if (!frameReady) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;
    let isDragging = false;

    // Hardware accelerated GPU CSS Matrix transform for 120 FPS dragging without worker delay
    function sync() {
      raf = 0;
      const old = drawn.current;
      const c = surface.current;
      if (!old || !c || !old.step || !old.yStep) return;

      const scale = chart.timeScale();
      const nowRefX = scale.logicalToCoordinate(old.refLogical as Logical);
      const nowRefNextX = scale.logicalToCoordinate((old.refLogical + 1) as Logical);
      if (nowRefX === null || nowRefNextX === null) return;
      const nowStep = nowRefNextX - nowRefX;
      const nowSliceX0 = nowRefX - nowStep * (old.refLogical - old.fromIdx);

      const nowY0 = series.priceToCoordinate(old.yBase);
      const nowY1 = series.priceToCoordinate(old.yBase + 1);
      if (nowY0 === null || nowY1 === null) return;
      const nowYStep = nowY1 - nowY0;

      const sx = nowStep / old.step;
      const sy = nowYStep / old.yStep;
      const tx = nowSliceX0 - sx * old.x0;
      const ty = nowY0 - sy * old.y0;

      if ([sx, sy, tx, ty].every(Number.isFinite)) {
        c.style.transform = `matrix(${sx}, 0, 0, ${sy}, ${tx}, ${ty})`;
      }
    }
    syncRef.current = sync;

    function render() {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range || bars.length === 0) return;

      const scale = chart.timeScale();
      const refLogical = Math.floor(range.from);
      const xRef = scale.logicalToCoordinate(refLogical as Logical);
      const xRefNext = scale.logicalToCoordinate((refLogical + 1) as Logical);
      if (xRef === null || xRefNext === null) return;

      const step = xRefNext - xRef;
      if (!step || !Number.isFinite(step)) return;

      const base = bars[bars.length - 1]?.close;
      if (base === undefined) return null;
      const y0 = series.priceToCoordinate(base);
      const y1 = series.priceToCoordinate(base + 1);
      if (y0 === null || y1 === null) return null;
      const yStep = y1 - y0;

      // Padded slice around visible range: 300 bars left lookback for EMA/ATR calculations
      const PAD = 300;
      const fromIdx = Math.max(0, Math.floor(range.from) - PAD);
      const toIdx = Math.min(bars.length - 1, Math.ceil(range.to) + 20);
      const slicedBars = bars.slice(fromIdx, toIdx + 1);

      // sliceX0 is the pixel X coordinate of slicedBars[0] (which is index fromIdx)
      const sliceX0 = xRef - step * (refLogical - fromIdx);
      const visibleFrom = range.from - fromIdx;
      const visibleTo = range.to - fromIdx;

      const width = Math.max(1, Math.round(node.clientWidth));
      const height = Math.max(1, Math.round(node.clientHeight));
      const paneWidth = Math.max(1, width - chart.priceScale("right").width());
      const paneHeight = Math.max(1, height - chart.timeScale().height());

      const id = ++seq.current;
      requested.current.clear();
      requested.current.set(id, {
        x0: sliceX0,
        step,
        y0,
        yStep,
        yBase: base,
        fromIdx,
        refLogical,
      });

      frame.current?.contentWindow?.postMessage(
        {
          channel: "mp-indicator-v1",
          type: "render",
          id,
          payload: {
            script: program.script,
            inputs: program.inputs,
            bars: slicedBars,
            symbol: "XAU_USD",
            width,
            height,
            paneWidth,
            paneHeight,
            x0: sliceX0,
            step,
            y0,
            yStep,
            yBase: base,
            visible: { from: visibleFrom, to: visibleTo },
          },
        },
        "*"
      );
    }

    // Request animation frame for smooth drag transform; debounce worker re-render
    function schedule() {
      if (!raf) raf = requestAnimationFrame(sync);
      clearTimeout(timer);
      if (!isDragging) {
        timer = setTimeout(render, 60);
      }
    }

    function onPointerDown() {
      isDragging = true;
    }

    function onPointerMove() {
      if (isDragging && !raf) {
        raf = requestAnimationFrame(sync);
      }
    }

    function onPointerUp() {
      if (isDragging) {
        isDragging = false;
        clearTimeout(timer);
        timer = setTimeout(render, 40); // Sharp render right after releasing
      }
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(schedule);
    node.addEventListener("wheel", schedule, { passive: true });
    node.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(render, 50);
    });
    ro.observe(node);

    // Debounced render when bars or program change to avoid choking replay ticks
    clearTimeout(timer);
    timer = setTimeout(render, 30);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(schedule);
      node.removeEventListener("wheel", schedule);
      node.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      ro.disconnect();
    };
  }, [frameReady, chart, series, node, bars, program]);

  return (
    <>
      <canvas
        ref={surface}
        aria-label="Indicator overlay"
        style={{ transformOrigin: "0 0" }}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />
      <iframe
        ref={frame}
        title="Isolated custom indicator renderer"
        sandbox="allow-scripts"
        srcDoc={indicatorSandboxHtml}
        className="hidden"
      />
    </>
  );
}
