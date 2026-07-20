export type ProviderId =
  | "composio"
  | "curated-library"
  | "user-imported"
  | "browser-automation"
  | "commercial-provider";

export type Confidence = "verified" | "estimated";

/**
 * Envelope every ContentDiscoveryProvider call returns.
 * `source` + `confidence` are what let the UI show a provenance badge
 * without ever having to guess where a number came from (PRD §5, §6.2).
 */
export interface ProviderResult<T> {
  data: T;
  source: ProviderId;
  fetchedAt: string; // ISO timestamp
  confidence: Confidence;
}
