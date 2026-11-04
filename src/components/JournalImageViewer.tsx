"use client";

import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

/** Shared preview for saved and staged screenshots. Does not mutate journal data. */
export function JournalImageViewer({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [fallback, setFallback] = useState(false);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    closeRef.current?.focus();
    const onChange = () => {
      const native = document.fullscreenElement === panelRef.current;
      setNativeFullscreen(native);
      if (!native) setExpanded(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab" && panel) {
        const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        if (buttons.length && event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
        else if (buttons.length && !event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
        return;
      }
      if (event.key !== "Escape") return;
      // Browsers normally consume Escape to leave native full screen first.
      if (document.fullscreenElement === panelRef.current) return;
      event.stopPropagation();
      if (expandedRef.current) { setExpanded(false); setFallback(false); } else onClose();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onKey);
      if (panel && document.fullscreenElement === panel) void document.exitFullscreen().catch(() => {});
      previous?.focus();
    };
  }, [onClose]);

  const toggleFullscreen = async () => {
    if (nativeFullscreen) {
      try { await document.exitFullscreen(); } catch { /* keep current view if browser rejects */ }
      return;
    }
    if (expanded) { setExpanded(false); setFallback(false); return; }
    try {
      if (!panelRef.current?.requestFullscreen) throw new Error("Fullscreen unsupported");
      await panelRef.current.requestFullscreen();
      setExpanded(true);
      setFallback(false);
    } catch {
      // iOS and sandboxed browsers may disallow the Fullscreen API.
      setExpanded(true);
      setFallback(true);
    }
  };
  return <div role="dialog" aria-modal="true" aria-label={`Screenshot preview: ${name}`} onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-5">
    <div ref={panelRef} onClick={e => e.stopPropagation()} className={`flex flex-col overflow-hidden border border-slate-700 bg-[#090d14] shadow-2xl ${expanded ? "h-full w-full rounded-none" : "max-h-[92vh] w-full max-w-6xl rounded-2xl"}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{name}</p>{fallback && <p className="text-xs text-amber-300">Browser full screen unavailable; using expanded view.</p>}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => void toggleFullscreen()} aria-label={expanded ? "Exit full screen" : "Maximise image"} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-700 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20">{expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}{expanded ? "Restore" : "Maximise"}</button><button ref={closeRef} type="button" onClick={onClose} aria-label="Close image preview" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:text-white"><X className="h-4 w-4" /></button></div></div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-2 sm:p-4">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt={name} className={`h-auto w-auto max-w-full object-contain ${expanded ? "max-h-full" : "max-h-[75vh]"}`} /></div>
    </div>
  </div>;
}
