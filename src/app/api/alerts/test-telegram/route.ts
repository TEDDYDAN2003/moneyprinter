import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { sendTelegramTestNotification } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, supabaseConfigured } = await getAuthenticatedUser();
  const isLocalHost =
    request.nextUrl.hostname === "localhost" ||
    request.nextUrl.hostname === "127.0.0.1";
  const isPreview =
    !supabaseConfigured &&
    (Boolean(user) ||
      request.nextUrl.searchParams.get("preview") === "1" ||
      isLocalHost);

  if (!user && !isPreview) {
    return NextResponse.json(
      { ok: false, error: "Sign in to test Telegram notifications." },
      { status: 401 }
    );
  }

  let botToken: string | undefined;
  let chatId: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.botToken === "string") botToken = body.botToken;
    if (typeof body?.chatId === "string") chatId = body.chatId;
  } catch {
    // Use env credentials when body is omitted
  }

  const result = await sendTelegramTestNotification({ botToken, chatId });
  if (!result.sent) {
    // Return 200 with ok:false + structured Telegram diagnostics so the client
    // displays the exact cause inline without noisy console 400 errors.
    return NextResponse.json({
      ok: false,
      error: result.error ?? "Failed to send Telegram message.",
      hint: result.hint,
      botUsername: result.botUsername,
    });
  }

  return NextResponse.json({
    ok: true,
    botUsername: result.botUsername,
    usedChatId: result.usedChatId,
    autoDiscoveredChatId: result.autoDiscoveredChatId,
    hint: result.hint,
  });
}
