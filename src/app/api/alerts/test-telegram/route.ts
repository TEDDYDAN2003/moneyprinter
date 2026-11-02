import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { sendTelegramTestNotification } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, supabaseConfigured } = await getAuthenticatedUser();
  const isPreview =
    !supabaseConfigured &&
    (Boolean(user) || request.nextUrl.searchParams.get("preview") === "1");

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
    return NextResponse.json(
      { ok: false, error: result.error ?? "Failed to send Telegram message." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
