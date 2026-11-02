import { NextResponse, type NextRequest } from "next/server";
import {
  fetchLiveMarketQuotes,
  isTwelveDataConfigured,
  normalizeMarketSymbol,
} from "@/lib/marketQuotes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const rawList = symbolsParam
    .split(",")
    .map((s) => normalizeMarketSymbol(s))
    .filter(Boolean);

  if (rawList.length === 0) {
    return NextResponse.json(
      { error: "Pass at least one symbol via ?symbols=XAU/USD" },
      { status: 400 }
    );
  }

  const quotes = await fetchLiveMarketQuotes(rawList.slice(0, 25));
  return NextResponse.json({
    ok: true,
    twelveDataConfigured: isTwelveDataConfigured(),
    quotes,
    fetchedAt: new Date().toISOString(),
  });
}
