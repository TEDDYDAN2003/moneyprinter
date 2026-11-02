"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudUpload, Loader2, RefreshCw, X } from "lucide-react";
import {
  inspectLocalJournalSyncState,
  syncLocalJournalToSupabase,
} from "@/lib/journal";
import {
  inspectLocalChecklistSyncCount,
  syncLocalChecklistReferencesToSupabase,
} from "@/lib/pullbackReferences";
import {
  inspectLocalAlertsSyncCount,
  syncLocalAlertsToSupabase,
} from "@/lib/alerts";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const CLOUD_SYNC_COMPLETE_EVENT = "mp-cloud-sync-complete";
export const TRIGGER_CLOUD_SYNC_EVENT = "mp-trigger-cloud-sync";

export function CloudDataSyncBanner() {
  const supabaseReady = isSupabaseConfigured();
  const [syncing, setSyncing] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    kind: "syncing" | "success" | "info" | "error";
    message: string;
    detail?: string;
  } | null>(null);

  const runningRef = useRef(false);

  const executeFullSync = useCallback(
    async (manual = false) => {
      if (!supabaseReady || runningRef.current) return;
      runningRef.current = true;

      try {
        const [journalInv, checklistCount, alertsCount] = await Promise.all([
          inspectLocalJournalSyncState(),
          inspectLocalChecklistSyncCount(),
          Promise.resolve(inspectLocalAlertsSyncCount()),
        ]);

        const totalPending =
          journalInv.totalCount + checklistCount + alertsCount;

        if (totalPending === 0) {
          if (manual) {
            const origin =
              typeof window !== "undefined" ? window.location.origin : "this URL";
            setStatusBanner({
              kind: "info",
              message: `No unsynced local IndexedDB records found on ${origin}.`,
              detail:
                "All records on this browser & port are synced with Supabase. (If you logged earlier trades on a different browser profile or port like 127.0.0.1 vs localhost, open that exact browser/URL once and it will auto-sync immediately.)",
            });
          }
          return;
        }

        setSyncing(true);
        setStatusBanner({
          kind: "syncing",
          message: `Syncing ${totalPending} local browser item${
            totalPending > 1 ? "s" : ""
          } (trades, balances & image files) to Supabase Cloud...`,
        });

        const [jRes, cRes, aRes] = await Promise.all([
          syncLocalJournalToSupabase(),
          syncLocalChecklistReferencesToSupabase(),
          syncLocalAlertsToSupabase(),
        ]);

        const parts: string[] = [];
        if (jRes.syncedEntries > 0)
          parts.push(
            `${jRes.syncedEntries} trade${jRes.syncedEntries > 1 ? "s" : ""}`
          );
        if (jRes.syncedTransactions > 0)
          parts.push(
            `${jRes.syncedTransactions} cashflow${
              jRes.syncedTransactions > 1 ? "s" : ""
            }`
          );
        if (jRes.syncedScreenshots > 0)
          parts.push(
            `${jRes.syncedScreenshots} journal screenshot${
              jRes.syncedScreenshots > 1 ? "s" : ""
            }`
          );
        if (cRes.syncedImages > 0)
          parts.push(
            `${cRes.syncedImages} strategy reference image${
              cRes.syncedImages > 1 ? "s" : ""
            }`
          );
        if (aRes.syncedAlerts > 0)
          parts.push(
            `${aRes.syncedAlerts} price alert${
              aRes.syncedAlerts > 1 ? "s" : ""
            }`
          );

        const allErrors = [...jRes.errors, ...cRes.errors, ...aRes.errors];

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(CLOUD_SYNC_COMPLETE_EVENT));
        }

        if (allErrors.length > 0 && parts.length === 0) {
          setStatusBanner({
            kind: "error",
            message: "Some local records could not be synced to Supabase.",
            detail: allErrors.slice(0, 2).join(" · "),
          });
        } else if (parts.length > 0) {
          setStatusBanner({
            kind: "success",
            message: `Recovered & synced ${parts.join(
              ", "
            )} into your Supabase tables and Storage buckets!`,
            detail:
              allErrors.length > 0
                ? `Note: ${allErrors[0]}`
                : undefined,
          });
        }
      } finally {
        setSyncing(false);
        runningRef.current = false;
      }
    },
    [supabaseReady]
  );

  // Auto-run on first admin mount
  useEffect(() => {
    void executeFullSync(false);
  }, [executeFullSync]);

  // Listen for manual trigger button clicks from /admin/journal
  useEffect(() => {
    function onManualSync() {
      void executeFullSync(true);
    }
    window.addEventListener(TRIGGER_CLOUD_SYNC_EVENT, onManualSync);
    return () => {
      window.removeEventListener(TRIGGER_CLOUD_SYNC_EVENT, onManualSync);
    };
  }, [executeFullSync]);

  if (!statusBanner) return null;

  return (
    <div
      className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-xs ${
        statusBanner.kind === "success"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
          : statusBanner.kind === "error"
          ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
          : statusBanner.kind === "syncing"
          ? "border-sky-500/35 bg-sky-500/10 text-sky-200"
          : "border-slate-700 bg-[#0E131B] text-slate-200"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {syncing ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-sky-400" />
        ) : statusBanner.kind === "success" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        ) : (
          <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        )}
        <div className="space-y-1">
          <p className="font-semibold leading-relaxed">{statusBanner.message}</p>
          {statusBanner.detail && (
            <p className="text-[11px] opacity-85 leading-relaxed">
              {statusBanner.detail}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {statusBanner.kind === "error" && !syncing && (
          <button
            type="button"
            onClick={() => void executeFullSync(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-100 hover:bg-rose-500/25"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
        {!syncing && (
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="rounded-lg p-1 text-current/70 hover:text-current"
            aria-label="Dismiss sync notice"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
