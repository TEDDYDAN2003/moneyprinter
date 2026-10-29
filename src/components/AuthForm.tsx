"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

interface AuthFormProps {
  supabaseConfigured: boolean;
  redirectTo?: string;
  initialError?: string;
}

export function AuthForm({
  supabaseConfigured,
  redirectTo = "/admin",
  initialError,
}: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName: mode === "signup" ? fullName : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.error ?? "Authentication failed. Please try again.");
        setLoading(false);
        return;
      }

      if (result?.requiresEmailConfirmation) {
        setSuccessMessage(
          "Account created! Check your inbox for the Supabase confirmation link to activate your session."
        );
        setLoading(false);
        return;
      }

      const target =
        !supabaseConfigured && !redirectTo.includes("preview=")
          ? `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}preview=1`
          : redirectTo;

      router.push(target);
      router.refresh();
    } catch {
      setError("Network error while communicating with auth server.");
      setLoading(false);
    }
  }

  async function handlePreviewQuickAccess() {
    setError(null);
    setLoading(true);
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "trader@moneyprinter.app",
          password: "preview-session-pass",
        }),
      });
      const target = `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}preview=1`;
      router.push(target);
      router.refresh();
    } catch {
      router.push("/admin?preview=1");
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800/90 bg-[#0E131B]/95 p-6 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur">
      {/* Auth Mode Status Pill */}
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {supabaseConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Auth Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
              <KeyRound className="h-3 w-3" />
              Preview Auth · Env Keys Pending
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-slate-500">SSR v2</span>
      </div>

      {/* Mode Switcher */}
      <div className="mb-6 grid grid-cols-2 rounded-xl border border-slate-800 bg-[#090D13] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccessMessage(null);
          }}
          className={`rounded-lg py-2 text-xs font-semibold transition-all ${
            mode === "login"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setSuccessMessage(null);
          }}
          className={`rounded-lg py-2 text-xs font-semibold transition-all ${
            mode === "signup"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Heading */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">
          {mode === "login"
            ? "Access your trading desk"
            : "Initialize trader account"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {mode === "login"
            ? "Sign in to review your strategy checklist and record journal entries."
            : "Create your MoneyPrinter credentials backed by Supabase Auth."}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-xs text-emerald-200"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label
              htmlFor="auth-fullname"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Trader Name <span className="text-slate-500">(optional)</span>
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="auth-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Mercer"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-800 bg-[#090D13] py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="auth-email"
            className="mb-1.5 block text-xs font-medium text-slate-300"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@moneyprinter.app"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-800 bg-[#090D13] py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="mb-1.5 block text-xs font-medium text-slate-300"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="w-full rounded-xl border border-slate-800 bg-[#090D13] py-2.5 pl-9 pr-10 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              {mode === "login" ? "Sign In to Desk" : "Create Trader Account"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {!supabaseConfigured && (
        <div className="mt-5 rounded-xl border border-slate-800/80 bg-[#090D13]/90 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-slate-300">
                Inspecting before adding Supabase keys?
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Add <code className="text-slate-300">.env.local</code> anytime
                to switch on live Supabase JWT sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePreviewQuickAccess}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Preview Admin
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80" />
        <span>Protected by @supabase/ssr cookie session middleware</span>
      </div>
    </div>
  );
}
