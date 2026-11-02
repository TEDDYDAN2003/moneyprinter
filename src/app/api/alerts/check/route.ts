import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createClient as createServerUserClient,
  getAuthenticatedUser,
} from "@/lib/supabase/server";
import {
  fetchLiveMarketQuotes,
  isTwelveDataConfigured,
  normalizeMarketSymbol,
} from "@/lib/marketQuotes";
import {
  isTelegramConfigured,
  sendTelegramAlertNotification,
} from "@/lib/telegram";
import { getServerEnvVar } from "@/lib/serverEnv";
import type { PriceAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

function isServiceRoleConfigured(): boolean {
  return Boolean(getServerEnvVar("SUPABASE_SERVICE_ROLE_KEY"));
}

function isCronSecretConfigured(): boolean {
  return Boolean(
    getServerEnvVar("CRON_SECRET", ["choose-any-strong-secret-here"])
  );
}

function hasValidCronSecret(request: NextRequest): boolean {
  const configuredSecret = getServerEnvVar("CRON_SECRET", [
    "choose-any-strong-secret-here",
  ]);
  if (!configuredSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerSecret = (request.headers.get("x-cron-secret") ?? "").trim();
  const querySecret = (request.nextUrl.searchParams.get("secret") ?? "").trim();

  return (
    bearerToken === configuredSecret ||
    headerSecret === configuredSecret ||
    querySecret === configuredSecret
  );
}

function buildConfigStatus() {
  return {
    supabaseConfigured: isSupabaseConfigured(),
    serviceRoleConfigured: isServiceRoleConfigured(),
    telegramConfigured: isTelegramConfigured(),
    cronSecretConfigured: isCronSecretConfigured(),
    twelveDataConfigured: isTwelveDataConfigured(),
  };
}

interface DbPendingAlert {
  id: string;
  user_id: string;
  symbol: string;
  condition: "above" | "below";
  initial_price: string | number;
  target_price: string | number;
  positive_pct: string | number;
  negative_pct: string | number;
  latest_price: string | number | null;
  status: "pending" | "triggered" | "paused";
  telegram_chat_id: string | null;
  strategy: string | null;
  notes: string | null;
}

async function runAlertEvaluation(
  request: NextRequest,
  clientAlerts?: PriceAlert[]
) {
  const cronAuthorized = hasValidCronSecret(request);
  const { user, supabaseConfigured } = await getAuthenticatedUser();
  const isManualPreview =
    !supabaseConfigured &&
    (Boolean(user) || request.nextUrl.searchParams.get("preview") === "1");

  // If CRON_SECRET is set, require either valid CRON_SECRET OR an active user/preview session
  if (
    isCronSecretConfigured() &&
    !cronAuthorized &&
    !user &&
    !isManualPreview
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unauthorized. Provide Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.",
      },
      { status: 401 }
    );
  }

  const checkedAt = new Date().toISOString();
  const configStatus = buildConfigStatus();

  // =========================================================================
  // Mode A: Preview / Local Client-Assisted Evaluation (!supabaseConfigured)
  // =========================================================================
  if (!supabaseConfigured) {
    const incoming = Array.isArray(clientAlerts) ? clientAlerts : [];
    const pendingList = incoming.filter((a) => a.status === "pending");

    if (pendingList.length === 0) {
      return NextResponse.json({
        ok: true,
        mode: "preview",
        checkedAt,
        checkedCount: 0,
        triggeredCount: 0,
        triggeredIds: [],
        quotes: {},
        updatedAlerts: incoming,
        configStatus,
      });
    }

    const quotes = await fetchLiveMarketQuotes(
      pendingList.map((a) => a.symbol)
    );

    const triggeredIds: string[] = [];
    const updatedAlerts: PriceAlert[] = await Promise.all(
      incoming.map(async (alert) => {
        if (alert.status !== "pending") return alert;

        const normSym = normalizeMarketSymbol(alert.symbol);
        const quote = quotes[normSym];
        if (!quote) {
          return { ...alert, lastCheckedAt: checkedAt };
        }

        const livePrice = quote.price;
        const isHit =
          alert.condition === "above"
            ? livePrice >= alert.targetPrice
            : livePrice <= alert.targetPrice;

        if (!isHit) {
          return {
            ...alert,
            latestPrice: livePrice,
            lastCheckedAt: checkedAt,
            updatedAt: checkedAt,
          };
        }

        triggeredIds.push(alert.id);
        const tgResult = await sendTelegramAlertNotification({
          symbol: normSym,
          condition: alert.condition,
          initialPrice: alert.initialPrice,
          targetPrice: alert.targetPrice,
          triggeredPrice: livePrice,
          positivePct: alert.positivePct,
          negativePct: alert.negativePct,
          strategy: alert.strategy,
          notes: alert.notes,
          chatIdOverride: alert.telegramChatId,
          priceSource: quote.source,
        });

        return {
          ...alert,
          latestPrice: livePrice,
          lastCheckedAt: checkedAt,
          status: "triggered" as const,
          triggeredPrice: livePrice,
          triggeredAt: checkedAt,
          telegramNotified: tgResult.sent,
          updatedAt: checkedAt,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      mode: "preview",
      checkedAt,
      checkedCount: pendingList.length,
      triggeredCount: triggeredIds.length,
      triggeredIds,
      quotes,
      updatedAlerts,
      configStatus,
    });
  }

  // =========================================================================
  // Mode B: Live Supabase Database Evaluation (24/7 cron-job.org + Refresh)
  // =========================================================================
  const { url: supabaseUrl } = getSupabaseEnv();
  const serviceRoleKey = getServerEnvVar("SUPABASE_SERVICE_ROLE_KEY");

  const db = isServiceRoleConfigured()
    ? createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : createServerUserClient();

  const { data: rows, error: fetchError } = await db
    .from("price_alerts")
    .select(
      "id, user_id, symbol, condition, initial_price, target_price, positive_pct, negative_pct, latest_price, status, telegram_chat_id, strategy, notes"
    )
    .eq("status", "pending");

  if (fetchError) {
    return NextResponse.json(
      {
        ok: false,
        error: fetchError.message,
        configStatus,
      },
      { status: 500 }
    );
  }

  const pendingRows = (rows ?? []) as DbPendingAlert[];
  if (pendingRows.length === 0) {
    return NextResponse.json({
      ok: true,
      mode: isServiceRoleConfigured() ? "supabase-service" : "supabase-session",
      checkedAt,
      checkedCount: 0,
      triggeredCount: 0,
      triggeredIds: [],
      quotes: {},
      configStatus,
    });
  }

  const quotes = await fetchLiveMarketQuotes(
    pendingRows.map((r) => r.symbol)
  );

  const triggeredIds: string[] = [];

  await Promise.all(
    pendingRows.map(async (row) => {
      const normSym = normalizeMarketSymbol(row.symbol);
      const quote = quotes[normSym];
      if (!quote) {
        await db
          .from("price_alerts")
          .update({ last_checked_at: checkedAt })
          .eq("id", row.id);
        return;
      }

      const livePrice = quote.price;
      const targetPrice = Number(row.target_price);
      const initialPrice = Number(row.initial_price);
      const positivePct = Number(row.positive_pct);
      const negativePct = Number(row.negative_pct);

      const isHit =
        row.condition === "above"
          ? livePrice >= targetPrice
          : livePrice <= targetPrice;

      if (!isHit) {
        await db
          .from("price_alerts")
          .update({
            latest_price: livePrice,
            last_checked_at: checkedAt,
            updated_at: checkedAt,
          })
          .eq("id", row.id);
        return;
      }

      triggeredIds.push(row.id);

      const tgResult = await sendTelegramAlertNotification({
        symbol: normSym,
        condition: row.condition,
        initialPrice,
        targetPrice,
        triggeredPrice: livePrice,
        positivePct,
        negativePct,
        strategy: row.strategy,
        notes: row.notes,
        chatIdOverride: row.telegram_chat_id,
        priceSource: quote.source,
      });

      await db
        .from("price_alerts")
        .update({
          latest_price: livePrice,
          last_checked_at: checkedAt,
          status: "triggered",
          triggered_price: livePrice,
          triggered_at: checkedAt,
          telegram_notified: tgResult.sent,
          updated_at: checkedAt,
        })
        .eq("id", row.id)
        .eq("status", "pending");
    })
  );

  return NextResponse.json({
    ok: true,
    mode: isServiceRoleConfigured() ? "supabase-service" : "supabase-session",
    checkedAt,
    checkedCount: pendingRows.length,
    triggeredCount: triggeredIds.length,
    triggeredIds,
    quotes,
    configStatus,
  });
}

/**
 * GET /api/alerts/check
 * Ideal for cron-job.org scheduled HTTP GET pings (`?secret=...` or `Authorization: Bearer ...`)
 */
export async function GET(request: NextRequest) {
  return runAlertEvaluation(request);
}

/**
 * POST /api/alerts/check
 * Supports both cron-job.org POST webhooks AND in-app manual/countdown Refresh
 */
export async function POST(request: NextRequest) {
  let clientAlerts: PriceAlert[] | undefined;
  try {
    const body = await request.json();
    if (Array.isArray(body?.clientAlerts)) {
      clientAlerts = body.clientAlerts;
    }
  } catch {
    // Empty body is valid for cron POST calls
  }
  return runAlertEvaluation(request, clientAlerts);
}
