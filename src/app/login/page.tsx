import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthForm } from "@/components/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sanitizeNextPath } from "@/lib/supabase/url";

interface LoginPageProps {
  searchParams?: {
    next?: string;
    error?: string;
  };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const supabaseConfigured = isSupabaseConfigured();
  const redirectTo = sanitizeNextPath(searchParams?.next ?? null, "/admin");
  const initialError = searchParams?.error;

  return (
    <div className="min-h-screen bg-[#080B10] bg-terminal-grid flex flex-col justify-between px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/">
          <BrandLogo subtitle="Authentication Gate" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Landing</span>
        </Link>
      </div>

      <main className="mx-auto my-8 flex w-full max-w-md flex-col items-center justify-center">
        <AuthForm
          supabaseConfigured={supabaseConfigured}
          redirectTo={redirectTo}
          initialError={initialError}
        />
      </main>

      <footer className="text-center font-mono text-[11px] text-slate-600">
        MONEYPRINTER · PRIVATE TRADING DESK
      </footer>
    </div>
  );
}
