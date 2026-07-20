import type {
  ContentDiscoveryProvider,
  ProviderCapability,
} from "@/src/domain/ports/content-discovery-provider";
import type { ProviderId } from "@/src/domain/entities/provider-result";

/**
 * Fixed priority order per capability. This is the enforcement point for the
 * "hard capability boundary" from PRD §7.1: own-account-* capabilities have
 * exactly one candidate (Composio), so no other provider can ever be asked
 * for a user's private account data, by construction rather than convention.
 *
 * "commercial-provider" is listed for niche-discovery/trend-history ahead of
 * the others because, once configured (V2+), it is the most reliable source —
 * but it's absent from the actual provider list until that integration ships,
 * so it never wins by default in V1.
 */
const PRIORITY_BY_CAPABILITY: Record<ProviderCapability, ProviderId[]> = {
  "own-account-insights": ["composio"],
  "own-account-comments": ["composio"],
  "own-account-posting-history": ["composio"],
  "niche-discovery": [
    "commercial-provider",
    "curated-library",
    "user-imported",
    "browser-automation",
  ],
  "trend-history": ["commercial-provider", "curated-library"],
  publish: ["composio"],
};

export class ProviderRegistry {
  constructor(private readonly providers: ContentDiscoveryProvider[]) {}

  /**
   * Returns providers that declare the capability and are currently
   * available, in priority order. Callers try them in order and stop at the
   * first one that returns a non-empty result (see Architecture §4.1).
   */
  async resolve(capability: ProviderCapability): Promise<ContentDiscoveryProvider[]> {
    const priority = PRIORITY_BY_CAPABILITY[capability];
    const declared = priority
      .map((id) => this.providers.find((p) => p.id === id))
      .filter((p): p is ContentDiscoveryProvider => !!p && p.capabilities.includes(capability));

    const available: ContentDiscoveryProvider[] = [];
    for (const provider of declared) {
      if (await provider.isAvailable()) available.push(provider);
    }
    return available;
  }
}
