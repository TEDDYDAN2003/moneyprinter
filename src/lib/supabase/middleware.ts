import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME, getSupabaseEnv, isSupabaseConfigured } from "./config";

function isRequestHttps(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) {
    return proto.split(",")[0].trim() === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export async function updateSession(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isProtectedAdmin = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login";

  if (!isSupabaseConfigured()) {
    // Preview auth guard before Supabase credentials are added
    const hasPreviewCookie = Boolean(request.cookies.get(DEMO_COOKIE_NAME)?.value);
    const hasPreviewQuery = searchParams.get("preview") === "1";

    if (isProtectedAdmin && !hasPreviewCookie && !hasPreviewQuery) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isLoginRoute && hasPreviewCookie) {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return NextResponse.redirect(adminUrl);
    }

    return NextResponse.next({ request });
  }

  // Real Supabase SSR session refresh & route guard
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabaseEnv();
  const secureHttps = isRequestHttps(request);

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: secureHttps
      ? {
          sameSite: "none",
          secure: true,
        }
      : undefined,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          const mergedOptions = secureHttps
            ? { ...options, sameSite: "none" as const, secure: true }
            : options;
          supabaseResponse.cookies.set(name, value, mergedOptions);
        });
      },
    },
  });

  // Always call getUser() to verify token authenticity with Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedAdmin && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && user) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }

  return supabaseResponse;
}
