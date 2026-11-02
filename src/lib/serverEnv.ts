import fs from "fs";
import path from "path";

const KNOWN_PLACEHOLDERS = new Set([
  "",
  "your-telegram-bot-token",
  "your-telegram-chat-id",
  "replace-with-a-random-secret-string",
  "your-cron-secret",
  "your-supabase-service-role-key",
  "your-twelve-data-api-key",
  "replace-me",
]);

function stripWrappingQuotes(raw: string): string {
  let val = raw.trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    if (!fs.existsSync(filePath)) return out;
    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const normalized = line.startsWith("export ")
        ? line.slice(7).trim()
        : line;
      const eqIdx = normalized.indexOf("=");
      if (eqIdx <= 0) continue;

      const key = normalized.slice(0, eqIdx).trim();
      let val = normalized.slice(eqIdx + 1).trim();

      // Strip unquoted inline comments (e.g. KEY=value # comment)
      if (!val.startsWith('"') && !val.startsWith("'")) {
        const hashIdx = val.indexOf(" #");
        if (hashIdx !== -1) {
          val = val.slice(0, hashIdx).trim();
        }
      }

      out[key] = stripWrappingQuotes(val);
    }
  } catch {
    // Ignore filesystem read errors on edge/readonly runtimes
  }
  return out;
}

/**
 * Reads a server environment variable cleanly, falling back to live `.env.local`
 * and `.env` files on disk if `next dev` wasn't restarted or if one env file has
 * an empty placeholder while the other holds the real value.
 */
export function getServerEnvVar(
  keys: string | string[],
  extraPlaceholders?: string[]
): string {
  const keyList = Array.isArray(keys) ? keys : [keys];
  const placeholders = new Set(KNOWN_PLACEHOLDERS);
  if (extraPlaceholders) {
    for (const p of extraPlaceholders) placeholders.add(p);
  }

  // 1. Check process.env first
  for (const k of keyList) {
    const raw = process.env[k];
    if (typeof raw === "string") {
      const cleaned = stripWrappingQuotes(raw);
      if (cleaned && !placeholders.has(cleaned)) {
        return cleaned;
      }
    }
  }

  // 2. Fallback: read .env.local then .env directly from project root
  const cwd = process.cwd();
  const envFiles = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env.development.local"),
    path.join(cwd, ".env"),
  ];

  for (const file of envFiles) {
    const parsed = parseEnvFile(file);
    for (const k of keyList) {
      const candidate = parsed[k];
      if (candidate && !placeholders.has(candidate)) {
        return candidate;
      }
    }
  }

  return "";
}
