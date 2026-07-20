import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Thin wrapper around an MCP client connected to the official Playwright MCP
 * server (`@playwright/mcp`, spawned as a local child process over stdio).
 * This is the literal MCP-first implementation of "Browser Automation" from
 * PRD §7.2/§7.1 — a real MCP client/server pair, not just the `playwright`
 * npm package imported directly.
 *
 * Used only by BrowserAutomationProvider, and only when the user has opted
 * into research mode (PRD §5) — never called unconditionally.
 */
let clientPromise: Promise<Client> | undefined;

export function getPlaywrightMcpClient(): Promise<Client> {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@playwright/mcp", "--headless", "--isolated"],
    });
    const client = new Client({ name: "ai-instagram-content-studio", version: "0.1.0" });
    await client.connect(transport);
    return client;
  })();

  return clientPromise;
}

/**
 * Minimal per-process token bucket so research-mode never fires more than
 * `RATE_LIMIT_PER_MINUTE` navigations/minute, regardless of how many
 * discovery requests come in — PRD §5's "low-volume, rate-limited" rule
 * enforced in code, not just in copy.
 */
const RATE_LIMIT_PER_MINUTE = 6;
let windowStart = Date.now();
let callsInWindow = 0;

export function assertWithinResearchModeRateLimit() {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    callsInWindow = 0;
  }
  if (callsInWindow >= RATE_LIMIT_PER_MINUTE) {
    throw new Error("Research-mode rate limit reached — try again in a minute.");
  }
  callsInWindow += 1;
}
