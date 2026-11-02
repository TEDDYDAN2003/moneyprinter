import { formatStrategyLabel } from "@/lib/strategies";
import { getServerEnvVar } from "@/lib/serverEnv";

const PLACEHOLDER_TOKENS = [
  "your-telegram-bot-token",
  "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ",
  "replace-me",
];

const PLACEHOLDER_CHATS = [
  "your-telegram-chat-id",
  "123456789",
  "replace-me",
];

/**
 * Sanitizes a Telegram Bot Token:
 * - Trims whitespace & accidental quotes
 * - Strips accidental leading "bot" prefix (e.g. "bot712345:AAF..." -> "712345:AAF...")
 * - Strips accidental full URL prefix if pasted
 */
function normalizeBotToken(raw: string): string {
  let cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  cleaned = cleaned.replace(/^https?:\/\/api\.telegram\.org\/bot/i, "");
  cleaned = cleaned.replace(/\/sendMessage.*$/i, "");
  if (/^bot\d+:/i.test(cleaned)) {
    cleaned = cleaned.slice(3);
  }
  return cleaned.trim();
}

function normalizeChatId(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

export function getTelegramConfig(overrideChatId?: string | null) {
  const rawToken = getServerEnvVar(
    [
      "TELEGRAM_BOT_TOKEN",
      "NEXT_PUBLIC_TELEGRAM_BOT_TOKEN",
      "TELEGRAM_TOKEN",
      "BOT_TOKEN",
    ],
    PLACEHOLDER_TOKENS
  );

  const rawEnvChat = getServerEnvVar(
    [
      "TELEGRAM_CHAT_ID",
      "NEXT_PUBLIC_TELEGRAM_CHAT_ID",
      "TELEGRAM_USER_ID",
      "CHAT_ID",
    ],
    PLACEHOLDER_CHATS
  );

  const botToken = normalizeBotToken(rawToken);
  const chatId = normalizeChatId(overrideChatId || "") || normalizeChatId(rawEnvChat);

  const validToken = Boolean(botToken) && !PLACEHOLDER_TOKENS.includes(botToken);
  const validChat = Boolean(chatId) && !PLACEHOLDER_CHATS.includes(chatId);

  return {
    botToken,
    chatId,
    validToken,
    validChat,
    configured: validToken && validChat,
  };
}

export function isTelegramConfigured(): boolean {
  return getTelegramConfig().configured;
}

interface TelegramBotIdentity {
  ok: boolean;
  id?: number;
  username?: string;
  firstName?: string;
  error?: string;
}

async function verifyTelegramBotToken(
  botToken: string
): Promise<TelegramBotIdentity> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.result) {
      return {
        ok: false,
        error:
          data?.description ||
          `Invalid TELEGRAM_BOT_TOKEN (HTTP ${res.status} from Telegram /getMe).`,
      };
    }
    return {
      ok: true,
      id: data.result.id,
      username: data.result.username,
      firstName: data.result.first_name,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not connect to api.telegram.org: ${err.message}`
          : "Network error reaching api.telegram.org",
    };
  }
}

/**
 * Queries `/getUpdates` on the bot to auto-discover the user's numeric `chat.id`
 * if they have pressed Start / sent `/start` to the bot!
 */
async function discoverLatestChatIdFromUpdates(
  botToken: string
): Promise<{ chatId: string; chatTitle: string } | null> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates?limit=25`,
      {
        method: "GET",
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !Array.isArray(data.result)) {
      return null;
    }

    for (let i = data.result.length - 1; i >= 0; i--) {
      const update = data.result[i];
      const chat =
        update?.message?.chat ??
        update?.edited_message?.chat ??
        update?.channel_post?.chat ??
        update?.my_chat_member?.chat;

      if (chat && (typeof chat.id === "number" || typeof chat.id === "string")) {
        const label =
          chat.username
            ? `@${chat.username}`
            : [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
              chat.title ||
              String(chat.id);
        return {
          chatId: String(chat.id),
          chatTitle: label,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function postTelegramMessage(
  botToken: string,
  chatId: string,
  htmlText: string
): Promise<{ ok: boolean; description?: string; status?: number }> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    return {
      ok: false,
      description: data?.description || `Telegram HTTP ${res.status}`,
      status: res.status,
    };
  }
  return { ok: true };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPriceSmart(price: number, symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.includes("JPY")) return price.toFixed(3);
  if (
    upper.includes("XAU") ||
    upper.includes("US30") ||
    upper.includes("NAS") ||
    upper.includes("SPX") ||
    upper.includes("BTC") ||
    upper.includes("ETH") ||
    price >= 100
  ) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toFixed(5);
}

function formatEatTimestamp(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(d);
}

export interface TelegramAlertPayload {
  symbol: string;
  condition: "above" | "below";
  initialPrice: number;
  targetPrice: number;
  triggeredPrice: number;
  positivePct: number;
  negativePct: number;
  strategy?: string | null;
  notes?: string | null;
  chatIdOverride?: string | null;
  priceSource?: string;
}

export async function sendTelegramAlertNotification(
  payload: TelegramAlertPayload
): Promise<{ sent: boolean; error?: string; resolvedChatId?: string }> {
  const { botToken, chatId, validToken } = getTelegramConfig(
    payload.chatIdOverride
  );
  if (!validToken) {
    return {
      sent: false,
      error: "TELEGRAM_BOT_TOKEN is not configured.",
    };
  }

  const rawChangePct =
    ((payload.triggeredPrice - payload.initialPrice) / payload.initialPrice) *
    100;
  const signedPctStr = `${rawChangePct >= 0 ? "+" : ""}${rawChangePct.toFixed(2)}%`;
  const directionArrow =
    payload.condition === "above" ? "▲ CROSSED ABOVE" : "▼ CROSSED BELOW";
  const strategyText = payload.strategy
    ? formatStrategyLabel(payload.strategy, false)
    : null;

  const lines = [
    `🚨 <b>MONEYPRINTER ALERT TRIGGERED</b>`,
    ``,
    `<b>Pair / Symbol:</b> <code>${escapeHtml(payload.symbol)}</code>`,
    `<b>Condition:</b> ${directionArrow} <code>${formatPriceSmart(payload.targetPrice, payload.symbol)}</code>`,
    `<b>Live Price:</b> <code>${formatPriceSmart(payload.triggeredPrice, payload.symbol)}</code> (${signedPctStr} vs baseline)`,
    `<b>Entered Baseline:</b> <code>${formatPriceSmart(payload.initialPrice, payload.symbol)}</code> (+${payload.positivePct.toFixed(2)}% / -${payload.negativePct.toFixed(2)}%)`,
  ];

  if (strategyText) {
    lines.push(`<b>Strategy Setup:</b> ${escapeHtml(strategyText)}`);
  }
  if (payload.notes?.trim()) {
    lines.push(`<b>Desk Notes:</b> ${escapeHtml(payload.notes.trim())}`);
  }
  lines.push(``);
  lines.push(
    `✅ <i>Confirm Global Gate: G-01 (Market Trend) &amp; G-02 (Candlestick Momentum) before executing.</i>`
  );
  lines.push(
    `🕒 <code>${escapeHtml(formatEatTimestamp())} EAT (UTC+3)</code>${
      payload.priceSource ? ` · Feed: ${escapeHtml(payload.priceSource)}` : ""
    }`
  );

  const html = lines.join("\n");

  try {
    if (chatId) {
      const attempt = await postTelegramMessage(botToken, chatId, html);
      if (attempt.ok) {
        return { sent: true, resolvedChatId: chatId };
      }
    }

    // Fallback: try auto-discovering numeric chat_id via /getUpdates
    const discovered = await discoverLatestChatIdFromUpdates(botToken);
    if (discovered) {
      const retry = await postTelegramMessage(
        botToken,
        discovered.chatId,
        html
      );
      if (retry.ok) {
        return { sent: true, resolvedChatId: discovered.chatId };
      }
    }

    return {
      sent: false,
      error: "Failed to deliver Telegram message — verify TELEGRAM_CHAT_ID and press Start on your bot.",
    };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Telegram network error",
    };
  }
}

export interface TelegramTestResult {
  sent: boolean;
  error?: string;
  botUsername?: string;
  usedChatId?: string;
  autoDiscoveredChatId?: string;
  hint?: string;
}

export async function sendTelegramTestNotification(options?: {
  botToken?: string;
  chatId?: string;
}): Promise<TelegramTestResult> {
  const cfg = getTelegramConfig();
  const token = normalizeBotToken(options?.botToken || "") || cfg.botToken;
  const configuredChat =
    normalizeChatId(options?.chatId || "") || cfg.chatId;

  if (!token || PLACEHOLDER_TOKENS.includes(token)) {
    return {
      sent: false,
      error:
        "TELEGRAM_BOT_TOKEN was not found (or is still a placeholder). Check .env.local / .env and ensure TELEGRAM_BOT_TOKEN=your_botfather_token is saved.",
    };
  }

  // Step 1: Verify Bot Token with Telegram /getMe
  const botIdentity = await verifyTelegramBotToken(token);
  if (!botIdentity.ok) {
    return {
      sent: false,
      error: `Telegram rejected TELEGRAM_BOT_TOKEN: ${botIdentity.error}`,
      hint: "Open @BotFather in Telegram, run /token, and paste the exact token (e.g. 7123456789:AAF...) without 'bot' in front.",
    };
  }

  const botHandle = botIdentity.username
    ? `@${botIdentity.username}`
    : botIdentity.firstName || "your bot";

  const text = [
    `🟢 <b>MoneyPrinter Telegram Bot Connected!</b>`,
    ``,
    `Your 24/7 Global Market Price Alert bridge (${escapeHtml(botHandle)}) is online.`,
    `• <b>Pair Monitor:</b> XAU/USD, Forex, US30, Crypto`,
    `• <b>Scheduler:</b> Ready for cron-job.org -&gt; <code>/api/alerts/check</code>`,
    `• <b>Desk Time:</b> <code>${escapeHtml(formatEatTimestamp())} EAT</code>`,
  ].join("\n");

  // Guard: Check if user accidentally set TELEGRAM_CHAT_ID equal to the bot's own numeric ID
  const isChatIdActuallyBotId =
    configuredChat &&
    botIdentity.id !== undefined &&
    configuredChat === String(botIdentity.id);

  // Step 2: Try sending to configured TELEGRAM_CHAT_ID first (unless it's the bot's own ID)
  let firstError = "";
  if (
    configuredChat &&
    !PLACEHOLDER_CHATS.includes(configuredChat) &&
    !isChatIdActuallyBotId
  ) {
    const attempt = await postTelegramMessage(token, configuredChat, text);
    if (attempt.ok) {
      return {
        sent: true,
        botUsername: botHandle,
        usedChatId: configuredChat,
      };
    }
    firstError = attempt.description || "Telegram sendMessage failed.";
  }

  // Step 3: Auto-discover user's real numeric chat_id via /getUpdates!
  const discovered = await discoverLatestChatIdFromUpdates(token);
  if (discovered) {
    const retry = await postTelegramMessage(token, discovered.chatId, text);
    if (retry.ok) {
      return {
        sent: true,
        botUsername: botHandle,
        usedChatId: discovered.chatId,
        autoDiscoveredChatId: discovered.chatId,
        hint:
          configuredChat !== discovered.chatId
            ? `Delivered via auto-detected chat (${discovered.chatTitle}). Update TELEGRAM_CHAT_ID=${discovered.chatId} in your .env.local so it matches!`
            : undefined,
      };
    }
  }

  // Step 4: Provide crystal-clear actionable diagnosis
  if (isChatIdActuallyBotId) {
    return {
      sent: false,
      botUsername: botHandle,
      error: `TELEGRAM_CHAT_ID (${configuredChat}) is your Bot's own ID — bots cannot message themselves!`,
      hint: `Open ${botHandle} in Telegram, tap START (send /start), then click 'Send Test Telegram Alert' again — MoneyPrinter will auto-detect your personal Chat ID!`,
    };
  }

  if (configuredChat.startsWith("@")) {
    return {
      sent: false,
      botUsername: botHandle,
      error: `Telegram rejected TELEGRAM_CHAT_ID="${configuredChat}" (${firstError || "chat not found"}). Personal Telegram DMs require your numeric Chat ID, not your @username.`,
      hint: `Open ${botHandle} in Telegram, send /start, then click 'Send Test Telegram Alert' again to auto-detect your numeric Chat ID!`,
    };
  }

  if (!configuredChat || PLACEHOLDER_CHATS.includes(configuredChat)) {
    return {
      sent: false,
      botUsername: botHandle,
      error: `Bot token for ${botHandle} is valid, but TELEGRAM_CHAT_ID is missing or still set to placeholder '${configuredChat || "empty"}'.`,
      hint: `Open ${botHandle} in Telegram, send /start, and click 'Send Test Telegram Alert' again — we will auto-find your Chat ID!`,
    };
  }

  return {
    sent: false,
    botUsername: botHandle,
    error: `Telegram API error for Chat ID "${configuredChat}": ${firstError || "chat not found"}`,
    hint: `Make sure you opened ${botHandle} in Telegram and pressed START (/start) at least once! Bots cannot message you until you message ${botHandle} first.`,
  };
}
