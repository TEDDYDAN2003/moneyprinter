import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/AdminWorkspace";
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
      <Suspense fallback={<div className="min-h-screen" />}>
        <AdminWorkspace user={effectiveUser} supabaseConfigured={supabaseConfigured}>
          {children}
        </AdminWorkspace>
      </Suspense>
    </div>
  );
}
