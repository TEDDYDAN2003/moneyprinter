export const DEMO_COOKIE_NAME = "mp_preview_session";

const PLACEHOLDER_URLS = new Set([
  "",
  "https://your-project-id.supabase.co",
  "http://your-project-id.supabase.co",
  "your-project-url",
]);

const PLACEHOLDER_KEYS = new Set([
  "",
  "your-supabase-anon-key",
  "your-anon-key",
]);

export function getSupabaseEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  ).trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return false;
  if (PLACEHOLDER_URLS.has(url) || PLACEHOLDER_KEYS.has(anonKey)) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  return true;
}
