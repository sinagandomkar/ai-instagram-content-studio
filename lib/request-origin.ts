import type { NextRequest } from "next/server";

/**
 * Behind a tunnel (localhost.run, cloudflared, etc.) or any reverse proxy,
 * `request.nextUrl.origin` resolves to the local address the proxy forwards to
 * (e.g. `http://localhost:3000`), not the public URL the browser is actually on.
 * Found live: a Composio OAuth callback built from `nextUrl.origin` sent the
 * browser to `https://localhost:3000/...`, which isn't serving TLS, right after
 * the Instagram connection had already succeeded on Composio's side — an
 * unreachable redirect masking a real success. Reverse proxies conventionally
 * set `x-forwarded-host`/`x-forwarded-proto` for exactly this; prefer those.
 */
export function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto ?? "https"}://${forwardedHost}`;
  return request.nextUrl.origin;
}
