"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Compass,
  Download,
  Flame,
  Globe2,
  Maximize2,
  Sparkles,
  X,
} from "lucide-react";

interface SessionSpec {
  id: string;
  name: string;
  hubSubtitle: string;
  ianaZone: string;
  secondaryZone?: { label: string; iana: string };
  longitudeSpan: string;
  localActiveWindow: string;
  eatWindowDisplay: string;
  utcWindowDisplay: string;
  eatStartHour: number;
  eatEndHour: number;
  accentColor: "purple" | "emerald" | "cyan" | "amber";
  pairs: string[];
  pullbackBehavior: string;
}

interface PairCheatSheetCard {
  id: string;
  title: string;
  subtitle: string;
  imagePath: string;
  primeEat: string;
  microLotNote: string;
  accent: "amber" | "emerald" | "cyan" | "purple" | "rose";
  description: string;
  extraTip?: string;
}

const PAIR_CHEAT_SHEETS: PairCheatSheetCard[] = [
  {
    id: "xauusd",
    title: "XAU/USD (Gold)",
    subtitle: "Spot Gold · High-Volatility Liquidity Magnet",
    imagePath: "/images/pairs/xauusd.png",
    primeEat: "London Open (10:00 AM – 12:30 PM EAT) & NY AM (03:00 PM – 06:30 PM EAT)",
    microLotNote: "0.01 Lot = $1.00 per $1.00 Gold move",
    accent: "amber",
    description:
      "Best during London Open (10:00 AM – 12:30 PM EAT) and NY AM (03:00 PM – 06:30 PM EAT). Respects Liquidity Sweeps, FVGs, and 50%–61.8% Fib pullbacks extremely well during NY.",
    extraTip:
      "Wait for 08:30 AM NY economic releases to complete their initial stop-hunt before entering on a 5M/1M closing MSS.",
  },
  {
    id: "eurusd-gbpusd",
    title: "EUR/USD & GBP/USD",
    subtitle: "European & British Majors · Tightest Spreads",
    imagePath: "/images/pairs/eurusd-gbpusd.png",
    primeEat: "London Open (10:00 AM – 01:00 PM EAT) & Overlap (03:00 PM – 07:00 PM EAT)",
    microLotNote: "0.01 Lot = $0.10 / pip · Spreads 0.1–0.8 pips",
    accent: "emerald",
    description:
      "Cleanest structure, tightest spreads (0.1–0.8 pips), and most reliable Valid Pullback Asymmetry rules during London Open and London–NY Overlap.",
    extraTip:
      "Great starter pairs on smaller accounts because 1 micro lot (0.01) = $0.10/pip, giving much gentler risk than Gold!",
  },
  {
    id: "usdcad",
    title: "USD/CAD",
    subtitle: "North American Loonie · Oil-Correlated",
    imagePath: "/images/pairs/usdcad.png",
    primeEat: "New York AM (03:00 PM – 07:30 PM EAT)",
    microLotNote: "0.01 Lot ≈ $0.07–$0.10 / pip",
    accent: "cyan",
    description:
      "Moves sharpest during New York AM because both the US and Canadian banking sessions + oil markets open together.",
    extraTip:
      "Watch WTI Crude Oil momentum alongside 08:30 AM NY USD/CAD data drops for high-conviction Break & Retest setups.",
  },
  {
    id: "usdjpy-audusd",
    title: "USD/JPY & AUD/USD",
    subtitle: "Tokyo & Sydney Asia-Pacific Leaders",
    imagePath: "/images/pairs/usdjpy-audusd.png",
    primeEat: "Asian Morning Session (03:00 AM – 09:00 AM EAT)",
    microLotNote: "0.01 Lot ≈ $0.07–$0.10 / pip",
    accent: "purple",
    description:
      "Best choices if your schedule only allows trading morning/early hours (03:00 AM – 09:00 AM EAT).",
    extraTip:
      "Respects clean 20/50 SMA dynamic pullbacks and diagonal trendline bounces during Tokyo commercial bank flow.",
  },
  {
    id: "us30",
    title: "US30 (Dow Jones 30)",
    subtitle: "Wall Street Equity Index · NY Cash Open",
    imagePath: "/images/pairs/us30.png",
    primeEat: "NY Equity Open (04:30 PM – 06:30 PM EAT · 09:50 NY-AM Macro)",
    microLotNote: "High-Velocity Index · Wait for 09:30 NY Bell Sweep",
    accent: "rose",
    description:
      "Explosive algorithmic displacement right after the 09:30 AM NY Wall Street opening bell (04:30 PM / 05:30 PM EAT), peaking inside the 09:50 – 10:10 AM NY Macro Window.",
    extraTip:
      "Let the opening bell Judas liquidity sweep finish first, then target Breaker Block flips (#8) and unmitigated 5M/1M FVGs (#7).",
  },
];

function formatClock(date: Date, timeZone: string, withSeconds = true): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: true,
  }).format(date);
}

function getZoneShortName(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

function getDecimalHourInZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const s = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  return h + m / 60 + s / 3600;
}

function isForexWeekendClosed(date: Date): boolean {
  // Forex closes Friday 17:00 America/New_York and reopens Sunday 17:00 America/New_York
  const nyWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(date);
  const nyHour = getDecimalHourInZone(date, "America/New_York");

  if (nyWeekday === "Sat") return true;
  if (nyWeekday === "Fri" && nyHour >= 17) return true;
  if (nyWeekday === "Sun" && nyHour < 17) return true;
  return false;
}

function isHourWithinWindow(
  currentHour: number,
  startHour: number,
  endHour: number
): boolean {
  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  }
  // Wraps across midnight (e.g. 16:00 -> 01:00)
  return currentHour >= startHour || currentHour < endHour;
}

export default function TimezonesPage() {
  const [now, setNow] = useState<Date | null>(null);
  const [lightboxCard, setLightboxCard] = useState<PairCheatSheetCard | null>(
    null
  );

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentNow = now ?? new Date("2026-10-30T12:00:00Z");
  const eatDecimalHour = now
    ? getDecimalHourInZone(currentNow, "Africa/Nairobi")
    : 15;
  const weekendClosed = now ? isForexWeekendClosed(currentNow) : false;

  // Detect US & UK Daylight Saving offsets dynamically for exact EAT longitudinal mapping
  const nyTzShort = now ? getZoneShortName(currentNow, "America/New_York") : "EDT";
  const isNyDst = nyTzShort === "EDT";
  const lonTzShort = now ? getZoneShortName(currentNow, "Europe/London") : "GMT";
  const isLonBst = lonTzShort === "BST";

  const londonEatStart = isLonBst ? 10 : 11;
  const londonEatEnd = isLonBst ? 19 : 20;
  const nyEatStart = isNyDst ? 15 : 16;
  const nyEatEnd = isNyDst ? 24 : 1; // 12:00 AM or 01:00 AM EAT

  const sessions: SessionSpec[] = [
    {
      id: "asian",
      name: "Asian Session (Tokyo / Sydney)",
      hubSubtitle: "Asia-Pacific Liquidity Hub",
      ianaZone: "Asia/Tokyo",
      secondaryZone: { label: "Sydney", iana: "Australia/Sydney" },
      longitudeSpan: "139.69°E (Tokyo) ↔ 151.21°E (Sydney) · 8h Span",
      localActiveWindow: "09:00 AM – 05:00 PM JST",
      eatWindowDisplay: "03:00 AM – 11:00 AM EAT",
      utcWindowDisplay: "00:00 – 08:00 UTC",
      eatStartHour: 3,
      eatEndHour: 11,
      accentColor: "purple",
      pairs: ["USD/JPY", "AUD/USD", "NZD/USD", "EUR/JPY", "GBP/JPY"],
      pullbackBehavior:
        "Cleanest trends on JPY & AUD pairs. Builds tight Accumulation / Distribution ranges on EUR/USD & Gold that London later sweeps.",
    },
    {
      id: "london",
      name: "London Session (European)",
      hubSubtitle: "Primary Institutional FX Center",
      ianaZone: "Europe/London",
      longitudeSpan: "0.12°W (Prime Meridian) · 9h Span",
      localActiveWindow: `08:00 AM – 05:00 PM ${lonTzShort || "LON"}`,
      eatWindowDisplay: isLonBst
        ? "10:00 AM – 07:00 PM EAT (Prime: 10:00 AM – 01:00 PM)"
        : "11:00 AM – 08:00 PM EAT (Standard: 10:00 AM – 07:00 PM)",
      utcWindowDisplay: isLonBst ? "07:00 – 16:00 UTC" : "08:00 – 17:00 UTC",
      eatStartHour: londonEatStart,
      eatEndHour: londonEatEnd,
      accentColor: "emerald",
      pairs: ["GBP/USD", "EUR/USD", "EUR/GBP", "XAU/USD", "GBP/JPY"],
      pullbackBehavior:
        "High institutional volume. Frequently sweeps the Asian High/Low, prints a crisp 15M/5M MSS, and initiates the main daily trend leg.",
    },
    {
      id: "new_york",
      name: "New York Session (North American)",
      hubSubtitle: "Wall Street & Macro Data Catalyst",
      ianaZone: "America/New_York",
      longitudeSpan: "74.01°W (Manhattan) · 9h Span",
      localActiveWindow: `08:00 AM – 05:00 PM ${nyTzShort || "NY"}`,
      eatWindowDisplay: isNyDst
        ? "03:00 PM – 12:00 AM EAT"
        : "04:00 PM – 01:00 AM EAT (Winter EST)",
      utcWindowDisplay: isNyDst ? "12:00 – 21:00 UTC" : "13:00 – 22:00 UTC",
      eatStartHour: nyEatStart,
      eatEndHour: nyEatEnd === 24 ? 24 : nyEatEnd,
      accentColor: "cyan",
      pairs: ["XAU/USD", "USD/CAD", "EUR/USD", "GBP/USD", "US30", "NQ / ES"],
      pullbackBehavior:
        "Largest volatility spikes around 08:30 AM NY news & 09:30 AM Equity Open. Prime for Order Block / FVG continuation pullbacks or 09:50 Macro entries.",
    },
    {
      id: "overlap",
      name: "London–NY Overlap (Peak Volume)",
      hubSubtitle: "Dual Trans-Atlantic Bank Alignment",
      ianaZone: "America/New_York",
      secondaryZone: { label: "London", iana: "Europe/London" },
      longitudeSpan: `0.12°W ↔ 74.01°W · ${londonEatEnd - nyEatStart}h Peak Overlap`,
      localActiveWindow: `08:00 AM – 12:00 PM ${nyTzShort || "NY"} / 01:00 PM – 05:00 PM LON`,
      eatWindowDisplay: `${
        nyEatStart === 15 ? "03:00 PM" : "04:00 PM"
      } – ${londonEatEnd === 19 ? "07:00 PM" : "08:00 PM"} EAT`,
      utcWindowDisplay: `${nyEatStart - 3}:00 – ${londonEatEnd - 3}:00 UTC`,
      eatStartHour: nyEatStart,
      eatEndHour: londonEatEnd,
      accentColor: "amber",
      pairs: ["XAU/USD", "EUR/USD", "GBP/USD", "USD/CAD", "USD/CHF", "US30"],
      pullbackBehavior:
        "Highest liquidity of the entire 24-hour cycle. Tightest spreads and strongest institutional follow-through on Body-Close Breaks (Step V).",
    },
  ];

  // Check if currently inside Rollover Danger Window (23:45 - 01:15 EAT)
  const inRolloverDanger =
    !weekendClosed && (eatDecimalHour >= 23.75 || eatDecimalHour <= 1.25);

  return (
    <div className="space-y-8">
      {/* Page Header + Live EAT & UTC Clocks */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
              Admin
            </span>
            <span className="text-slate-700">/</span>
            <span className="font-mono text-xs text-slate-400">Timezones</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Global Trading Timezones &amp; Pair Sessions
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Live session clocks synchronized to{" "}
            <strong className="text-slate-200">
              East Africa Time (EAT · UTC+3)
            </strong>
            , active longitudinal windows, and pair-by-pair pullback cheat
            sheets.
          </p>
        </div>

        {/* Live Reference Clock Cards */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Your Time · EAT (UTC+3)</span>
            </div>
            <p className="mt-0.5 font-mono text-lg font-bold text-white tabular-nums">
              {now ? formatClock(currentNow, "Africa/Nairobi") : "--:--:--"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0E131B] px-4 py-2.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              UTC / GMT Reference
            </div>
            <p className="mt-0.5 font-mono text-lg font-bold text-slate-200 tabular-nums">
              {now ? formatClock(currentNow, "UTC") : "--:--:--"}
            </p>
          </div>
        </div>
      </div>

      {/* Live Weekend or Rollover Alert if Applicable */}
      {weekendClosed && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-[#0E131B] px-4 py-3 text-xs text-slate-300">
          <Clock className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong className="text-white">Weekend Market Closure:</strong>{" "}
            Institutional spot FX &amp; Metals desks are currently closed for
            the weekend (reopens Sunday 17:00 NY / Monday ~00:00–01:00 EAT).
            Clocks below remain live for session planning.
          </span>
        </div>
      )}

      {inRolloverDanger && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>
            <strong>Rollover Spread Warning Active (23:45 – 01:15 EAT):</strong>{" "}
            Daily bank settlement is underway — spreads widen 5×–10×. Avoid
            opening new pullback trades until spreads normalize.
          </span>
        </div>
      )}

      {/* Visual 24-Hour Longitudinal Timeline Bar (00:00 - 24:00 EAT) */}
      <section
        aria-labelledby="timeline-heading"
        className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-5 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-emerald-400" />
            <h2
              id="timeline-heading"
              className="text-sm font-bold uppercase tracking-wider text-slate-200"
            >
              24-Hour Longitudinal Session Map (EAT · UTC+3)
            </h2>
          </div>
          <span className="font-mono text-xs text-emerald-400">
            {now
              ? `Current Marker: ${formatClock(
                  currentNow,
                  "Africa/Nairobi",
                  false
                )} EAT`
              : "Synchronizing clock..."}
          </span>
        </div>

        <div className="relative space-y-2.5 pt-2 pb-6">
          {/* Live Vertical 'NOW' Cursor Line */}
          {now && (
            <div
              style={{ left: `${(eatDecimalHour / 24) * 100}%` }}
              className="pointer-events-none absolute top-0 bottom-4 z-20 -translate-x-1/2 flex flex-col items-center"
            >
              <span className="rounded bg-emerald-400 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-950 shadow">
                NOW
              </span>
              <div className="h-full w-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            </div>
          )}

          {/* Session Bars */}
          {[
            {
              label: "Asian (03:00–11:00)",
              start: 3,
              end: 11,
              cls: "bg-purple-500/30 border-purple-400/50 text-purple-200",
            },
            {
              label: `London (${londonEatStart}:00–${londonEatEnd}:00)`,
              start: londonEatStart,
              end: londonEatEnd,
              cls: "bg-emerald-500/30 border-emerald-400/50 text-emerald-200",
            },
            {
              label: `New York (${nyEatStart}:00–${
                nyEatEnd === 24 ? "24:00" : `0${nyEatEnd}:00`
              })`,
              start: nyEatStart,
              end: 24,
              cls: "bg-cyan-500/30 border-cyan-400/50 text-cyan-200",
            },
            {
              label: `Peak Overlap (${nyEatStart}:00–${londonEatEnd}:00)`,
              start: nyEatStart,
              end: londonEatEnd,
              cls: "bg-amber-500/35 border-amber-400/60 text-amber-100",
            },
          ].map((bar) => {
            const leftPct = (bar.start / 24) * 100;
            const widthPct = ((bar.end - bar.start) / 24) * 100;
            return (
              <div
                key={bar.label}
                className="relative h-7 w-full rounded-lg bg-[#080B10] border border-slate-800/80 overflow-hidden"
              >
                <div
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className={`absolute inset-y-0.5 rounded-md border px-2 flex items-center ${bar.cls}`}
                >
                  <span className="truncate font-mono text-[10px] font-semibold">
                    {bar.label}
                  </span>
                </div>
              </div>
            );
          })}

          {/* 00:00 -> 24:00 EAT Axis Ticks */}
          <div className="flex justify-between pt-1 font-mono text-[10px] text-slate-500">
            <span>00:00</span>
            <span>03:00</span>
            <span>06:00</span>
            <span>09:00</span>
            <span>12:00</span>
            <span>15:00</span>
            <span>18:00</span>
            <span>21:00</span>
            <span>24:00 EAT</span>
          </div>
        </div>
      </section>

      {/* 1. The 4 Major Timezones Live Table */}
      <section
        aria-labelledby="major-timezones-heading"
        className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Globe2 className="h-5 w-5 text-emerald-400" />
            <div>
              <h2
                id="major-timezones-heading"
                className="text-base sm:text-lg font-bold text-white"
              >
                The 4 Major Trading Timezones &amp; Live Clocks
              </h2>
              <p className="text-xs text-slate-400">
                Real-time local hub clocks paired with EAT, longitudinal active
                session spans, and top currency pairs.
              </p>
            </div>
          </div>
          <span className="rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1 font-mono text-[11px] text-slate-400">
            Auto-DST Enabled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#090D13] font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5 font-semibold">
                  Major Session &amp; Status
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  Time Right Now (Session + EAT)
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  Session Active Longitudinal Time
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  Associated Pairs &amp; Pullback Profile
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {sessions.map((s) => {
                const isOpenNow =
                  !weekendClosed &&
                  isHourWithinWindow(
                    eatDecimalHour,
                    s.eatStartHour,
                    s.eatEndHour
                  );

                const localTimeStr = now
                  ? formatClock(currentNow, s.ianaZone)
                  : "--:--:--";
                const localTzAbbr = now
                  ? getZoneShortName(currentNow, s.ianaZone)
                  : "";
                const secondaryTimeStr =
                  now && s.secondaryZone
                    ? formatClock(currentNow, s.secondaryZone.iana, false)
                    : null;
                const eatNowStr = now
                  ? formatClock(currentNow, "Africa/Nairobi")
                  : "--:--:--";

                const badgeTone =
                  s.accentColor === "purple"
                    ? "text-purple-300 border-purple-500/30 bg-purple-500/10"
                    : s.accentColor === "emerald"
                    ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                    : s.accentColor === "cyan"
                    ? "text-cyan-300 border-cyan-500/30 bg-cyan-500/10"
                    : "text-amber-300 border-amber-500/30 bg-amber-500/10";

                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      isOpenNow ? "bg-emerald-500/[0.03]" : "hover:bg-[#111722]"
                    }`}
                  >
                    {/* Column 1: Session Name & Live Open/Closed Badge */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">
                            {s.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{s.hubSubtitle}</p>
                        <div>
                          {isOpenNow ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE NOW
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#090D13] px-2.5 py-0.5 font-mono text-[10px] font-medium text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                              {weekendClosed ? "WEEKEND CLOSED" : "INACTIVE"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Time Right Now (Session Local + EAT) */}
                    <td className="px-5 py-4 align-top whitespace-nowrap">
                      <div className="space-y-1.5 rounded-xl border border-slate-800/90 bg-[#090D13] p-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase text-slate-400">
                            Session ({localTzAbbr || "Local"}):
                          </span>
                          <span className="font-mono text-sm font-bold text-white tabular-nums">
                            {localTimeStr}
                          </span>
                        </div>

                        {secondaryTimeStr && s.secondaryZone && (
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-mono text-[10px] uppercase text-slate-500">
                              {s.secondaryZone.label}:
                            </span>
                            <span className="font-mono text-xs text-slate-300 tabular-nums">
                              {secondaryTimeStr}
                            </span>
                          </div>
                        )}

                        <div className="flex items-baseline justify-between gap-3 border-t border-slate-800/80 pt-1.5">
                          <span className="font-mono text-[10px] font-semibold uppercase text-emerald-400">
                            EAT (UTC+3):
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-300 tabular-nums">
                            {eatNowStr}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Session Active Longitudinal Time */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1.5">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${badgeTone}`}
                        >
                          {s.eatWindowDisplay}
                        </span>
                        <p className="font-mono text-xs text-slate-300">
                          Local Hub: {s.localActiveWindow}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          UTC Window: {s.utcWindowDisplay}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          Longitude: {s.longitudeSpan}
                        </p>
                      </div>
                    </td>

                    {/* Column 4: Pairs & Pullback Behavior */}
                    <td className="px-5 py-4 align-top max-w-sm">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {s.pairs.map((pair) => (
                          <span
                            key={pair}
                            className="rounded-md border border-slate-700/80 bg-[#090D13] px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-200"
                          >
                            {pair}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400">
                        {s.pullbackBehavior}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Pair-by-Pair Quick Cheat Sheet + 5 Visual Infographics (Including US30) */}
      <section aria-labelledby="pair-cheat-sheet-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="pair-cheat-sheet-heading"
                className="text-xl font-bold text-white"
              >
                Pair-by-Pair Quick Cheat Sheet (Including US30)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Click any visual cheat sheet card to inspect full-screen or
                save the high-resolution reference poster.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />5 Visual Cheat Sheets
          </span>
        </div>

        {/* 5 Visual Pair Cheat Sheet Cards Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {PAIR_CHEAT_SHEETS.map((card, idx) => {
            const borderHover =
              card.accent === "amber"
                ? "hover:border-amber-500/45"
                : card.accent === "emerald"
                ? "hover:border-emerald-500/45"
                : card.accent === "cyan"
                ? "hover:border-cyan-500/45"
                : card.accent === "purple"
                ? "hover:border-purple-500/45"
                : "hover:border-rose-500/45";

            const pillCls =
              card.accent === "amber"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : card.accent === "emerald"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : card.accent === "cyan"
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                : card.accent === "purple"
                ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300";

            return (
              <article
                key={card.id}
                className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B] transition ${borderHover} ${
                  idx === 4 ? "lg:col-span-2" : ""
                }`}
              >
                <div>
                  {/* Generated Visual Cheat Sheet Poster */}
                  <div className="relative overflow-hidden border-b border-slate-800/80 bg-[#080B10]">
                    <button
                      type="button"
                      onClick={() => setLightboxCard(card)}
                      className="relative block w-full text-left focus:outline-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.imagePath}
                        alt={`${card.title} session pullback cheat sheet`}
                        className={`w-full object-cover transition duration-300 group-hover:scale-[1.01] ${
                          idx === 4 ? "max-h-[420px] object-contain bg-[#080B10]" : ""
                        }`}
                      />
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-black/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-xs transition group-hover:border-emerald-500/50 group-hover:text-white">
                        <Maximize2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Expand Poster</span>
                      </span>
                    </button>
                  </div>

                  {/* Card Text Cheat Sheet Details */}
                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-400">{card.subtitle}</p>
                      </div>

                      <a
                        href={card.imagePath}
                        download={`${card.id}-session-cheatsheet.png`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#090D13] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>PNG</span>
                      </a>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold ${pillCls}`}
                      >
                        {card.primeEat}
                      </span>
                      <span className="rounded-md border border-slate-800 bg-[#090D13] px-2.5 py-1 font-mono text-[11px] text-slate-300">
                        {card.microLotNote}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-200">
                      {card.description}
                    </p>

                    {card.extraTip && (
                      <p className="rounded-xl border border-slate-800/90 bg-[#090D13] px-3.5 py-2.5 text-xs leading-relaxed text-slate-400">
                        <strong className="font-semibold text-slate-200">
                          Execution Note:{" "}
                        </strong>
                        {card.extraTip}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. Worst Time Window (Rollover Avoidance Rule) */}
      <section className="rounded-2xl border border-rose-500/25 bg-[#0E131B] p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-white">
              Worst Time Window — Always Avoid Daily Rollover (11:45 PM – 01:15
              AM EAT)
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              Between{" "}
              <strong className="text-rose-300">
                11:45 PM and 01:15 AM EAT
              </strong>{" "}
              (16:45 – 18:15 NY), global banks reset daily settlement, liquidity
              thins out sharply, and broker spreads widen 5×–10× — which can
              trigger Stop-Losses or Margin Calls even when price barely moves.
              Never open fresh pullback setups inside this rollover window.
            </p>
          </div>
        </div>
      </section>

      {/* Lightbox Modal for Full-Resolution Cheat Sheet Inspection */}
      {lightboxCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${lightboxCard.title} Cheat Sheet`}
          onClick={() => setLightboxCard(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-[#0B0F16] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {lightboxCard.title} — Session &amp; Pullback Cheat Sheet
                </h3>
                <p className="font-mono text-[11px] text-slate-400">
                  {lightboxCard.primeEat}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={lightboxCard.imagePath}
                  download={`${lightboxCard.id}-session-cheatsheet.png`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PNG</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxCard(null)}
                  aria-label="Close preview"
                  className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex max-h-[calc(92vh-64px)] items-center justify-center overflow-auto bg-[#05070B] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxCard.imagePath}
                alt={lightboxCard.title}
                className="max-h-[80vh] w-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
