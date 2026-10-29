import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { DEMO_COOKIE_NAME, getSupabaseEnv, isSupabaseConfigured } from "./config";

export interface AppUser {
  id: string;
  email: string;
  fullName?: string;
  isPreview?: boolean;
}

export function isHttpsRequest(): boolean {
  try {
    const hdrs = headers();
    const proto = hdrs.get("x-forwarded-proto");
    if (proto) {
      return proto.split(",")[0].trim() === "https";
    }
  } catch {
    // Ignore outside request context
  }
  return process.env.NODE_ENV === "production";
}

export function createClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseEnv();
  const secureHttps = isHttpsRequest();

  return createServerClient(url, anonKey, {
    cookieOptions: secureHttps
      ? {
          sameSite: "none",
          secure: true,
        }
      : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const mergedOptions = secureHttps
              ? { ...options, sameSite: "none" as const, secure: true }
              : options;
            cookieStore.set(name, value, mergedOptions);
          });
        } catch {
          // Called from a Server Component — middleware handles session refresh.
        }
      },
    },
  });
}

export async function getAuthenticatedUser(): Promise<{
  user: AppUser | null;
  supabaseConfigured: boolean;
}> {
  const configured = isSupabaseConfigured();

  if (configured) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, supabaseConfigured: true };
    }

    return {
      user: {
        id: user.id,
        email: user.email ?? "trader@moneyprinter.app",
        fullName:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : undefined,
        isPreview: false,
      },
      supabaseConfigured: true,
    };
  }

  // Preview fallback mode when Supabase env vars are not set yet
  const cookieStore = cookies();
  const rawPreview = cookieStore.get(DEMO_COOKIE_NAME)?.value;
  if (!rawPreview) {
    return { user: null, supabaseConfigured: false };
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawPreview)) as {
      email?: string;
      fullName?: string;
    };
    if (parsed?.email) {
      return {
        user: {
          id: "preview-user-01",
          email: parsed.email,
          fullName: parsed.fullName,
          isPreview: true,
        },
        supabaseConfigured: false,
      };
    }
  } catch {
    // Ignore malformed preview cookie
  }

  return { user: null, supabaseConfigured: false };
}
