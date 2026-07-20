import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "./provider-registry";
import type { ContentDiscoveryProvider } from "@/src/domain/ports/content-discovery-provider";

function fakeProvider(
  id: ContentDiscoveryProvider["id"],
  capabilities: ContentDiscoveryProvider["capabilities"],
  available = true
): ContentDiscoveryProvider {
  return { id, capabilities, isAvailable: async () => available };
}

describe("ProviderRegistry", () => {
  it("never resolves any provider other than composio for own-account capabilities", async () => {
    const registry = new ProviderRegistry([
      fakeProvider("composio", ["own-account-insights"]),
      fakeProvider("curated-library", ["niche-discovery"]),
      fakeProvider("user-imported", ["niche-discovery"]),
      fakeProvider("browser-automation", ["niche-discovery"]),
    ]);

    const resolved = await registry.resolve("own-account-insights");

    expect(resolved.map((p) => p.id)).toEqual(["composio"]);
  });

  it("returns niche-discovery providers in priority order, excluding unavailable ones", async () => {
    const registry = new ProviderRegistry([
      fakeProvider("composio", ["own-account-insights"]),
      fakeProvider("curated-library", ["niche-discovery"]),
      fakeProvider("user-imported", ["niche-discovery"]),
      fakeProvider("browser-automation", ["niche-discovery"], false), // opted out
    ]);

    const resolved = await registry.resolve("niche-discovery");

    expect(resolved.map((p) => p.id)).toEqual(["curated-library", "user-imported"]);
  });

  it("returns nothing for a capability no registered provider declares", async () => {
    const registry = new ProviderRegistry([fakeProvider("composio", ["own-account-insights"])]);

    const resolved = await registry.resolve("niche-discovery");

    expect(resolved).toEqual([]);
  });

  it("skips a provider that declares a capability but reports unavailable", async () => {
    const registry = new ProviderRegistry([
      fakeProvider("composio", ["own-account-insights"], false), // not connected
    ]);

    const resolved = await registry.resolve("own-account-insights");

    expect(resolved).toEqual([]);
  });
});
