import { type NextRequest } from "next/server";

export function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    const proto = forwardedProto.split(",")[0].trim();
    return `${proto}://${host}`;
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader && !hostHeader.startsWith("0.0.0.0")) {
    const proto =
      request.nextUrl.protocol === "https:" ? "https" : "http";
    return `${proto}://${hostHeader}`;
  }

  return request.nextUrl.origin;
}

export function sanitizeNextPath(rawNext: string | null, fallback = "/admin"): string {
  if (!rawNext) return fallback;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return fallback;
  }
  return rawNext;
}
