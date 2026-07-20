import type { AccountInsights, PostingEvent, RawComment } from "@/src/domain/entities/account-insights";
import type { ProviderId, ProviderResult } from "@/src/domain/entities/provider-result";
import type { DiscoveredReel, DiscoveryOptions } from "@/src/domain/entities/reel";

/**
 * Capabilities a provider can declare. A provider only implements the
 * methods matching the capabilities it declares — the registry (see
 * provider-registry.ts) never calls a method a provider hasn't declared.
 *
 * "own-account-*" capabilities are, by design, only ever satisfiable by
 * Composio (see docs/PRD.md §7.1) — that boundary is enforced in the
 * registry's priority table, not by convention here.
 */
export type ProviderCapability =
  | "own-account-insights"
  | "own-account-comments"
  | "own-account-posting-history"
  | "niche-discovery"
  | "trend-history"
  | "publish"; // reserved, V2+

export interface ContentDiscoveryProvider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapability[];

  /** Whether this provider can currently serve requests (e.g. Composio needs a connected account). */
  isAvailable(): Promise<boolean>;

  getAccountInsights?(accountId: string): Promise<ProviderResult<AccountInsights>>;
  getAccountComments?(accountId: string, postExternalId: string): Promise<ProviderResult<RawComment[]>>;
  getPostingHistory?(accountId: string): Promise<ProviderResult<PostingEvent[]>>;
  discoverReelsByNiche?(niche: string, opts: DiscoveryOptions): Promise<ProviderResult<DiscoveredReel[]>>;
}
