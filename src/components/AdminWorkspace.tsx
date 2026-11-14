"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { CloudDataSyncBanner } from "@/components/CloudDataSyncBanner";
import type { AppUser } from "@/lib/supabase/server";

export function AdminWorkspace({user, supabaseConfigured, children}:{user:AppUser;supabaseConfigured:boolean;children:React.ReactNode}) {
  const pathname = usePathname();
  const isCourse = pathname.startsWith("/admin/course");
  const isResearch = pathname.startsWith("/admin/research");
  return <>
    <AdminSidebar user={user} supabaseConfigured={supabaseConfigured} courseFocus={isCourse}/>
    <div className={isCourse ? "" : "lg:pl-64"}>
      <main className={isCourse || isResearch ? "w-full px-2 py-4 sm:px-4 lg:px-5" : "mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9"}>
        <CloudDataSyncBanner/>{children}
      </main>
    </div>
  </>;
}
