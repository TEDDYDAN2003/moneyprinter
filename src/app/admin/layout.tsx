import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { getAuthenticatedUser, type AppUser } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, supabaseConfigured } = await getAuthenticatedUser();

  if (supabaseConfigured && !user) {
    redirect("/login");
  }

  const effectiveUser: AppUser = user ?? {
    id: "preview-user-01",
    email: "trader@moneyprinter.app",
    fullName: "Preview Trader",
    isPreview: true,
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100">
      <Suspense
        fallback={
          <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 border-r border-slate-800/80 bg-[#0B0F16]" />
        }
      >
        <AdminSidebar
          user={effectiveUser}
          supabaseConfigured={supabaseConfigured}
        />
      </Suspense>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
