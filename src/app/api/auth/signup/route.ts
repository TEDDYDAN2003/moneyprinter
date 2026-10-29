import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, isHttpsRequest } from "@/lib/supabase/server";
import { getPublicOrigin } from "@/lib/supabase/url";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const fullName = String(body?.fullName ?? "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const origin = getPublicOrigin(request);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/admin`,
          data: fullName ? { full_name: fullName } : undefined,
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const requiresEmailConfirmation = !data.session;

      return NextResponse.json({
        ok: true,
        mode: "supabase",
        requiresEmailConfirmation,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      });
    }

    // Preview mode when Supabase credentials haven't been configured yet
    const secureHttps = isHttpsRequest();
    const response = NextResponse.json({
      ok: true,
      mode: "preview",
      requiresEmailConfirmation: false,
      user: {
        id: "preview-user-01",
        email,
        fullName,
      },
    });

    response.cookies.set(
      DEMO_COOKIE_NAME,
      encodeURIComponent(JSON.stringify({ email, fullName })),
      {
        path: "/",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: secureHttps ? "none" : "lax",
        secure: secureHttps,
      }
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unexpected error during registration." },
      { status: 500 }
    );
  }
}
