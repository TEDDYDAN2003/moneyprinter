"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckSquare,
  ChevronRight,
  Crosshair,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import type { AppUser } from "@/lib/supabase/server";

interface AdminSidebarProps {
  user: AppUser;
  supabaseConfigured: boolean;
}

const STRATEGY_ITEMS = [
  {
    label: "Pullback Strategy",
    href: "/admin/strategy/pullback-strategy",
    badge: "Checklist",
  },
];

export function AdminSidebar({ user, supabaseConfigured }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreviewParam = searchParams.get("preview") === "1";

  const isStrategyRouteActive = pathname.startsWith("/admin/strategy");
  const [strategyHovered, setStrategyHovered] = useState(false);
  const [strategyPinnedOpen, setStrategyPinnedOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStrategySubmenu =
    strategyHovered || strategyPinnedOpen || isStrategyRouteActive;

  function withSessionQuery(href: string) {
    if (!supabaseConfigured && isPreviewParam) {
      return `${href}?preview=1`;
    }
    return href;
  }

  function handleStrategyMouseEnter() {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
    setStrategyHovered(true);
  }

  function handleStrategyMouseLeave() {
    hoverCloseTimer.current = setTimeout(() => {
      setStrategyHovered(false);
    }, 180);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0B0F16] border-r border-slate-800/80">
      {/* Top section */}
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <Link
            href={withSessionQuery("/admin")}
            onClick={() => setMobileOpen(false)}
          >
            <BrandLogo subtitle="Trading Workspace" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-5">
          <div className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Desk Navigation
          </div>

          <nav className="space-y-1" aria-label="Main Trading Navigation">
            {/* Overview */}
            <Link
              href={withSessionQuery("/admin")}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                pathname === "/admin"
                  ? "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25 shadow-[inset_0_1px_0_rgba(16,185,129,0.12)]"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
              }`}
            >
              <span className="flex items-center gap-3">
                <LayoutDashboard
                  className={`h-4 w-4 ${
                    pathname === "/admin"
                      ? "text-emerald-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span>Overview</span>
              </span>
            </Link>

            {/* Journal */}
            <Link
              href={withSessionQuery("/admin/journal")}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                pathname.startsWith("/admin/journal")
                  ? "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25 shadow-[inset_0_1px_0_rgba(16,185,129,0.12)]"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
              }`}
            >
              <span className="flex items-center gap-3">
                <BookOpen
                  className={`h-4 w-4 ${
                    pathname.startsWith("/admin/journal")
                      ? "text-emerald-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span>Journal</span>
              </span>
              <span className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                LOG
              </span>
            </Link>

            {/* Strategy — Reveals sub-items on hover in the sidebar */}
            <div
              onMouseEnter={handleStrategyMouseEnter}
              onMouseLeave={handleStrategyMouseLeave}
              className="relative"
            >
              <button
                type="button"
                onClick={() => setStrategyPinnedOpen((prev) => !prev)}
                aria-expanded={showStrategySubmenu}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isStrategyRouteActive || showStrategySubmenu
                    ? "bg-slate-800/75 text-white border border-slate-700/70"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Crosshair
                    className={`h-4 w-4 transition-colors ${
                      isStrategyRouteActive || showStrategySubmenu
                        ? "text-emerald-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>Strategy</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-slate-500">
                    {STRATEGY_ITEMS.length}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      showStrategySubmenu ? "rotate-90 text-emerald-400" : ""
                    }`}
                  />
                </span>
              </button>

              {/* Smooth Hover Submenu */}
              <div
                className={`grid transition-all duration-200 ease-out ${
                  showStrategySubmenu
                    ? "grid-rows-[1fr] opacity-100 mt-1"
                    : "grid-rows-[0fr] opacity-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-5 border-l border-slate-800 pl-3 py-1 space-y-1">
                    {STRATEGY_ITEMS.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={withSessionQuery(item.href)}
                          onClick={() => setMobileOpen(false)}
                          className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                            active
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                              : "text-slate-400 hover:bg-slate-800/70 hover:text-white border border-transparent"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <CheckSquare
                              className={`h-3.5 w-3.5 ${
                                active
                                  ? "text-emerald-400"
                                  : "text-slate-500 group-hover:text-emerald-400"
                              }`}
                            />
                            <span>{item.label}</span>
                          </span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400 border border-emerald-500/20">
                            {item.badge}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Subtle Hover Tip */}
          <div className="mt-6 rounded-xl border border-slate-800/80 bg-[#080B10]/80 p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
              {supabaseConfigured ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Supabase Session Active</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Preview Session Mode</span>
                </>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {supabaseConfigured
                ? "Authenticated via @supabase/ssr with server-verified JWT cookies."
                : "Set NEXT_PUBLIC_SUPABASE_URL & ANON_KEY in .env.local to activate live Supabase Auth."}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom User & Sign Out */}
      <div className="border-t border-slate-800/80 p-3">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#080B10] border border-slate-800/70 p-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {user.fullName || "Trader Desk"}
            </p>
            <p className="truncate font-mono text-[11px] text-slate-400">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Exit</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800/80 bg-[#0B0F16]/95 px-4 backdrop-blur lg:hidden">
        <BrandLogo />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
        {sidebarContent}
      </aside>
    </>
  );
}
