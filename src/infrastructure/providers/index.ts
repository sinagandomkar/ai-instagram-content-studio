import { ProviderRegistry } from "@/src/domain/services/provider-registry";
import { ComposioProvider } from "./composio-provider";
import { CuratedLibraryProvider } from "./curated-library-provider";
import { UserImportedProvider } from "./user-imported-provider";
import { BrowserAutomationProvider } from "./browser-automation-provider";

export const composioProvider = new ComposioProvider();
export const curatedLibraryProvider = new CuratedLibraryProvider();
export const userImportedProvider = new UserImportedProvider();
export const browserAutomationProvider = new BrowserAutomationProvider();

/**
 * Every ContentDiscoveryProvider the app knows about. Commercial provider
 * (PRD §9, V2+) is intentionally absent until that integration ships — the
 * registry's priority table already accounts for its absence gracefully.
 */
export const providerRegistry = new ProviderRegistry([
  composioProvider,
  curatedLibraryProvider,
  userImportedProvider,
  browserAutomationProvider,
]);
