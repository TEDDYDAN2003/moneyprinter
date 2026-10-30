import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Clock,
  Crosshair,
  Database,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { getAuthenticatedUser } from "@/lib/supabase/server";

interface AdminOverviewProps {
  searchParams?: {
    preview?: string;
  };
}

export default async function AdminOverviewPage({
  searchParams,
}: AdminOverviewProps) {
  const { user, supabaseConfigured } = await getAuthenticatedUser();
  const suffix =
    !supabaseConfigured && searchParams?.preview === "1" ? "?preview=1" : "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
              Admin Workspace
            </span>
            <span className="text-slate-700">/</span>
            <span className="font-mono text-xs text-slate-400">Overview</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Welcome back, {user?.fullName || user?.email || "Trader"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Your authentication layer and workspace shell are online. Select a
            module from the sidebar to review or configure it.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {supabaseConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Supabase Auth Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              Preview Mode · Ready for Supabase Keys
            </span>
          )}
        </div>
      </div>

      {/* Core Modules Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Journal Module Card */}
        <Link
          href={`/admin/journal${suffix}`}
          className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 transition hover:border-emerald-500/40 hover:bg-[#111823]"
        >
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                Sidebar → Journal
              </span>
            </div>

            <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Trading Journal
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Log new executions with the header + button: symbol, buy/sell
              type, lot size, TP &amp; SL, opening/closing prices, date/time,
              and leverage.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs font-medium text-emerald-400">
            <span>Open Trading Journal</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Strategy Module Card */}
        <Link
          href={`/admin/strategy/pullback-strategy${suffix}`}
          className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 transition hover:border-emerald-500/40 hover:bg-[#111823]"
        >
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <Crosshair className="h-5 w-5" />
              </div>
              <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                Hover Strategy → Pullback Strategy
              </span>
            </div>

            <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Pullback Strategy Checklist
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Hover over <strong className="text-slate-200">Strategy</strong> in
              the left sidebar to reveal sub-strategies. Marks pre-trade
              confluence conditions before entering a setup.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs font-medium text-emerald-400">
            <span>Open Pullback Strategy</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Timezones Module Card */}
        <Link
          href={`/admin/timezones${suffix}`}
          className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6 transition hover:border-emerald-500/40 hover:bg-[#111823]"
        >
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <Clock className="h-5 w-5" />
              </div>
              <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                Sidebar → Timezones
              </span>
            </div>

            <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Timezones &amp; Pair Cheat Sheet
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Live 4-session global clocks synced to EAT (UTC+3), longitudinal
              session spans, and 5 visual cheat sheets including XAU/USD &amp;
              US30.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs font-medium text-emerald-400">
            <span>Open Live Clocks</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Supabase Auth & Project Wiring Status */}
      <div className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-6">
        <div className="flex items-center gap-2.5">
          <Database className="h-5 w-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">
            Supabase Auth Layer Architecture
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          All Next.js App Router authentication files are wired and ready for
          your Supabase project credentials.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              file: "src/lib/supabase/client.ts",
              desc: "Browser Supabase client (@supabase/ssr)",
            },
            {
              file: "src/lib/supabase/server.ts",
              desc: "Server Component & Route Handler client",
            },
            {
              file: "src/middleware.ts",
              desc: "Session refresh & /admin route protection",
            },
            {
              file: "src/app/api/auth/*",
              desc: "Login, Signup, and Logout endpoints",
            },
            {
              file: "src/app/auth/callback/route.ts",
              desc: "PKCE auth code exchange handler",
            },
            {
              file: "supabase/migrations/*_storage.sql",
              desc: "10 MB private 'pullback-references' bucket & RLS policies",
            },
            {
              file: "supabase/migrations/*_trading_journal.sql",
              desc: "Journal entries table & user-scoped RLS policies",
            },
          ].map((item) => (
            <div
              key={item.file}
              className="flex items-start gap-2.5 rounded-xl border border-slate-800/80 bg-[#090D13] p-3.5"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-medium text-slate-200">
                  {item.file}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {!supabaseConfigured && (
          <div className="mt-5 rounded-xl border border-slate-800 bg-[#080B10] p-4">
            <p className="text-xs font-semibold text-slate-200">
              Connect your Supabase project in 1 step:
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Create <code className="text-emerald-300">.env.local</code> in the
              workspace root (or connect the Supabase app) with:
            </p>
            <pre className="mt-2.5 overflow-x-auto rounded-lg border border-slate-800/90 bg-[#0D1117] p-3 font-mono text-xs text-slate-300">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key`}
            </pre>
          </div>
        )}
      </div>

      {/* Ready status footer */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-slate-300">
        <CheckSquare className="h-4 w-4 shrink-0 text-emerald-400" />
        <span>
          All core modules active:{" "}
          <strong className="text-white">Trading Journal</strong>,{" "}
          <strong className="text-white">Pullback Strategy</strong>, and{" "}
          <strong className="text-white">Live Global Timezones (EAT)</strong>.
        </span>
      </div>
    </div>
  );
}
