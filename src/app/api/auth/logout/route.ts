import { NextResponse } from "next/server";
import { DEMO_COOKIE_NAME, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, isHttpsRequest } from "@/lib/supabase/server";

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  const secureHttps = isHttpsRequest();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    maxAge: 0,
    sameSite: secureHttps ? "none" : "lax",
    secure: secureHttps,
  });

  return response;
}
