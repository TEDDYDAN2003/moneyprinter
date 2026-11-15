"use client";
import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, Logical } from "lightweight-charts";
import type { IndicatorProgram } from "./IndicatorEditor";
import { indicatorSandboxHtml } from "@/lib/indicatorSandbox";

type Bar = { time: number; open: number; high: number; low: number; close: number };
type Geometry = { x0: number; step: number; y0: number; yStep: number; yBase: number };

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

    function geometry(): Geometry | null {
      const scale = chart.timeScale();
      const x0 = scale.logicalToCoordinate(0 as Logical);
      const x1 = scale.logicalToCoordinate(1 as Logical);
      const base = bars[bars.length - 1]?.close;
      if (base === undefined) return null;
      const y0 = series.priceToCoordinate(base);
      const y1 = series.priceToCoordinate(base + 1);
      if (x0 === null || x1 === null || y0 === null || y1 === null) return null;
      return { x0, step: x1 - x0, y0, yStep: y1 - y0, yBase: base };
    }

    // Hardware accelerated GPU CSS Matrix transform for 120 FPS dragging without worker delay
    function sync() {
      raf = 0;
      const old = drawn.current;
      const now = geometry();
      const c = surface.current;
      if (!old || !now || !c || !old.step || !old.yStep) return;
      const sx = now.step / old.step;
      const sy = now.yStep / old.yStep;
      const tx = now.x0 - sx * old.x0;
      const ty = now.y0 - sy * old.y0 + now.yStep * (old.yBase - now.yBase);
      if ([sx, sy, tx, ty].every(Number.isFinite)) {
        c.style.transform = `matrix(${sx}, 0, 0, ${sy}, ${tx}, ${ty})`;
      }
    }
    syncRef.current = sync;

    function render() {
      const g = geometry();
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!g || !range) return;

      const width = Math.max(1, Math.round(node.clientWidth));
      const height = Math.max(1, Math.round(node.clientHeight));
      const paneWidth = Math.max(1, width - chart.priceScale("right").width());
      const paneHeight = Math.max(1, height - chart.timeScale().height());
      const id = ++seq.current;
      requested.current.clear();
      requested.current.set(id, g);

      // ── OOM FIX: Never postMessage the full bars array (can be 50k+ candles).
      // The indicator sandbox only needs bars in a padded window around the
      // visible range so it can compute look-back indicators (EMA, ATR etc.).
      // We send at most 2,000 bars: the visible slice plus a 500-bar look-back
      // buffer to the left for warm-up. This keeps the clone payload tiny and
      // prevents the DataCloneError / out-of-memory crash.
      const PAD = 500;   // warm-up bars for indicators (EMA200 needs ~200)
      const fromIdx = Math.max(0, Math.floor(range.from) - PAD);
      const toIdx   = Math.min(bars.length - 1, Math.ceil(range.to) + 10);
      const slicedBars = bars.slice(fromIdx, toIdx + 1);
      // Adjust visible logical range so indices stay correct inside the sandbox
      const visibleFrom = range.from - fromIdx;
      const visibleTo   = range.to   - fromIdx;

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
            ...g,
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
        timer = setTimeout(render, 100);
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
        timer = setTimeout(render, 50); // Sharp render right after releasing
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

    // Initial render when bars or program change
    render();

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
