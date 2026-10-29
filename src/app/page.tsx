import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CheckSquare,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthForm } from "@/components/AuthForm";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function LandingPage() {
  const { user, supabaseConfigured } = await getAuthenticatedUser();
  const adminHref =
    !supabaseConfigured && !user ? "/admin?preview=1" : "/admin";

  return (
    <div className="min-h-screen bg-[#080B10] bg-terminal-grid flex flex-col">
      {/* Minimal Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#080B10]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLogo subtitle="Backtested Trading OS" />

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                <span>Open Admin Desk</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
              >
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6 lg:py-16">
        <div className="grid w-full items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left: Concise Workspace Overview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Terminal className="h-3.5 w-3.5" />
              <span>Private Trading Journal &amp; Execution Gate</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.15]">
                Execute your backtested edge with{" "}
                <span className="text-emerald-400">zero guesswork.</span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                MoneyPrinter keeps your trading workflow strict: verify every
                pre-trade confluence rule before entry, then log risk, stake,
                and execution prices inside your private journal.
              </p>
            </div>

            {/* Core Workspace Modules Summary */}
            <div className="grid gap-3.5 sm:grid-cols-2 max-w-xl pt-1">
              <div className="rounded-xl border border-slate-800/90 bg-[#0E131B]/90 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-400">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Trading Journal
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  Track win rate, risk exposure, stake size, opening price, and
                  closing price across every position.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-[#0E131B]/90 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-400">
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Pullback Strategy
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  Hover-accessible sidebar strategy checklists to validate setup
                  confluence before entering any trade.
                </p>
              </div>
            </div>

            {/* Auth Architecture Footnote */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Next.js App Router + Supabase SSR Auth
              </span>
              {user && (
                <Link
                  href={adminHref}
                  className="font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
                >
                  Signed in as {user.email} → Go to Admin
                </Link>
              )}
            </div>
          </div>

          {/* Right: Supabase Auth Layer Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <AuthForm
              supabaseConfigured={supabaseConfigured}
              redirectTo="/admin"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
