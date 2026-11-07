"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { CloudDataSyncBanner } from "@/components/CloudDataSyncBanner";
import type { AppUser } from "@/lib/supabase/server";

export function AdminWorkspace({user, supabaseConfigured, children}:{user:AppUser;supabaseConfigured:boolean;children:React.ReactNode}) {
  const isCourse = usePathname().startsWith("/admin/course");
  return <>
    <AdminSidebar user={user} supabaseConfigured={supabaseConfigured} courseFocus={isCourse}/>
    <div className={isCourse ? "" : "lg:pl-64"}>
      <main className={isCourse ? "w-full px-4 py-5 sm:px-6 lg:px-8" : "mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9"}>
        <CloudDataSyncBanner/>{children}
      </main>
    </div>
  </>;
}
