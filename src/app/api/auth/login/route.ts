import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, isHttpsRequest } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      return NextResponse.json({
        ok: true,
        mode: "supabase",
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
      user: {
        id: "preview-user-01",
        email,
      },
    });

    response.cookies.set(
      DEMO_COOKIE_NAME,
      encodeURIComponent(JSON.stringify({ email })),
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
      { error: "Unexpected error during sign in." },
      { status: 500 }
    );
  }
}
