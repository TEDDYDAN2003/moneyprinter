import { formatStrategyLabel } from "@/lib/strategies";

const PLACEHOLDER_TOKENS = new Set([
  "",
  "your-telegram-bot-token",
  "replace-me",
]);

const PLACEHOLDER_CHATS = new Set([
  "",
  "your-telegram-chat-id",
  "replace-me",
]);

export function getTelegramConfig(overrideChatId?: string | null) {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const envChatId = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  const chatId = (overrideChatId ?? "").trim() || envChatId;

  const validToken = Boolean(botToken) && !PLACEHOLDER_TOKENS.has(botToken);
  const validChat = Boolean(chatId) && !PLACEHOLDER_CHATS.has(chatId);

  return {
    botToken,
    chatId,
    configured: validToken && validChat,
  };
}

export function isTelegramConfigured(): boolean {
  return getTelegramConfig().configured;
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
): Promise<{ sent: boolean; error?: string }> {
  const { botToken, chatId, configured } = getTelegramConfig(
    payload.chatIdOverride
  );
  if (!configured) {
    return {
      sent: false,
      error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured.",
    };
  }

  const rawChangePct =
    ((payload.triggeredPrice - payload.initialPrice) / payload.initialPrice) *
    100;
  const signedPctStr = `${rawChangePct >= 0 ? "+" : ""}${rawChangePct.toFixed(2)}%`;
  const directionArrow = payload.condition === "above" ? "▲ CROSSED ABOVE" : "▼ CROSSED BELOW";
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

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join("\n"),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return {
        sent: false,
        error:
          data?.description ||
          `Telegram API returned HTTP ${res.status}`,
      };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Telegram network error",
    };
  }
}

export async function sendTelegramTestNotification(options?: {
  botToken?: string;
  chatId?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const token = (
    options?.botToken?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN ||
    ""
  ).trim();
  const chat = (
    options?.chatId?.trim() ||
    process.env.TELEGRAM_CHAT_ID ||
    ""
  ).trim();

  if (
    !token ||
    PLACEHOLDER_TOKENS.has(token) ||
    !chat ||
    PLACEHOLDER_CHATS.has(chat)
  ) {
    return {
      sent: false,
      error:
        "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Add them to .env.local (or Vercel) or paste them in the test fields.",
    };
  }

  const text = [
    `🟢 <b>MoneyPrinter Telegram Bot Connected!</b>`,
    ``,
    `Your 24/7 Global Market Price Alert bridge is online.`,
    `• <b>Pair Monitor:</b> XAU/USD, Forex, US30, Crypto`,
    `• <b>Scheduler:</b> Ready for cron-job.org -&gt; <code>/api/alerts/check</code>`,
    `• <b>Desk Time:</b> <code>${escapeHtml(formatEatTimestamp())} EAT</code>`,
  ].join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return {
        sent: false,
        error: data?.description || `Telegram API HTTP ${res.status}`,
      };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Failed to reach Telegram API",
    };
  }
}
