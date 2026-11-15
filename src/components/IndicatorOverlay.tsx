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
  onStatus
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
  const requested = useRef(new Map<number, Geometry>());
  const syncRef = useRef<() => void>(() => {});
  callback.current = onStatus;

  useEffect(() => {
    function message(e: MessageEvent) {
      if (e.source !== frame.current?.contentWindow || e.data?.channel !== "mp-indicator-v1") return;
      if (e.data.type === "ready") {
        setFrameReady(true);
        return;
      }
      if (e.data.type === "frame" && e.data.bitmap instanceof ImageBitmap) {
        if (e.data.id === seq.current && surface.current) {
          const c = surface.current;
          c.width = e.data.width;
          c.height = e.data.height;
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

  useEffect(() => {
    if (!frameReady) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;
    let dragging = false;
    let lastRenderTime = 0;

    function geometry(): Geometry | null {
      const scale = chart.timeScale();
      const x0 = scale.logicalToCoordinate(0 as Logical);
      const x1 = scale.logicalToCoordinate(1 as Logical);
      const base = bars[bars.length - 1]?.close;
      const y0 = series.priceToCoordinate(base);
      const y1 = series.priceToCoordinate(base + 1);
      if (x0 === null || x1 === null || y0 === null || y1 === null) return null;
      return { x0, step: x1 - x0, y0, yStep: y1 - y0, yBase: base };
    }

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
        c.style.transform = `matrix(${sx},0,0,${sy},${tx},${ty})`;
      }
    }
    syncRef.current = sync;

    function render() {
      const g = geometry();
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!g || !range) {
        callback.current("Waiting for chart geometry…");
        return;
      }
      const width = Math.max(1, Math.round(node.clientWidth));
      const height = Math.max(1, Math.round(node.clientHeight));
      const paneWidth = Math.max(1, width - chart.priceScale("right").width());
      const paneHeight = Math.max(1, height - chart.timeScale().height());
      const id = ++seq.current;
      requested.current.clear();
      requested.current.set(id, g);
      lastRenderTime = performance.now();

      // Pass bars strictly to current replay cursor without future data
      frame.current?.contentWindow?.postMessage(
        {
          channel: "mp-indicator-v1",
          type: "render",
          id,
          payload: {
            script: program.script,
            inputs: program.inputs,
            bars,
            symbol: "XAU_USD",
            width,
            height,
            paneWidth,
            paneHeight,
            ...g,
            visible: { from: range.from, to: range.to }
          }
        },
        "*"
      );
    }

    // High responsiveness scheduler: immediate render on replay steps or program changes!
    function schedule(immediate = false) {
      if (!raf) raf = requestAnimationFrame(sync);
      clearTimeout(timer);
      const now = performance.now();
      if (immediate || now - lastRenderTime >= 35) {
        lastRenderTime = now;
        render();
      } else {
        timer = setTimeout(() => {
          lastRenderTime = performance.now();
          render();
        }, 20);
      }
    }

    function down() {
      dragging = true;
    }
    function move() {
      if (dragging) schedule(false);
    }
    function up() {
      if (dragging) {
        dragging = false;
        schedule(true);
      }
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => schedule(false));
    node.addEventListener("wheel", () => schedule(false), { passive: true });
    node.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    const ro = new ResizeObserver(() => schedule(true));
    ro.observe(node);

    // Initial render on mount / bar change is immediate
    schedule(true);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(() => schedule(false));
      node.removeEventListener("wheel", () => schedule(false));
      node.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
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
