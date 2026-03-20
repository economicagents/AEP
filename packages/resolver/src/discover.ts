/**
 * Discovery: hybrid search (BM25 + optional vector) when search index exists,
 * else capability expansion + keyword overlap on description/name.
 */

import type { IndexedProvider } from "@economicagents/indexer";
import {
  searchByCapability,
  searchIndexExists,
} from "@economicagents/indexer";
import { expandCapability } from "./capability-expansion.js";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function overlapScore(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const targetSet = new Set(targetTokens);
  let matches = 0;
  for (const t of queryTokens) {
    if (targetSet.has(t)) matches++;
  }
  return matches / queryTokens.length;
}

export interface DiscoverConfig {
  /** Minimum overlap score to include (default 0.3 when expansion used, 0 when not) */
  minScore?: number;
  /** Index path for hybrid search. When provided and search.db exists, uses BM25 + optional vector. */
  indexPath?: string;
}

/**
 * Legacy discovery: expanded tokens + overlap on description/name.
 */
function discoverByCapabilityLegacy(
  capability: string,
  providers: IndexedProvider[],
  minScore: number
): IndexedProvider[] {
  const queryTokens = expandCapability(capability);
  if (queryTokens.length === 0) return providers;

  const scored = providers
    .map((p) => {
      const descTokens = tokenize(p.description ?? "");
      const nameTokens = tokenize(p.name ?? "");
      const combined = [...descTokens, ...nameTokens];
      const score = overlapScore(queryTokens, combined);
      return { provider: p, score };
    })
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.provider);

  if (scored.length > 0) return scored;

  return providers;
}

/**
 * Match providers by capability. Uses hybrid search (BM25 + optional vector) when
 * indexPath is provided and search index exists; otherwise falls back to
 * synonym expansion + overlap scoring.
 */
export async function discoverByCapability(
  capability: string,
  providers: IndexedProvider[],
  config?: DiscoverConfig
): Promise<IndexedProvider[]> {
  const minScore = config?.minScore ?? 0.3;

  if (config?.indexPath && (await searchIndexExists(config.indexPath))) {
    const providerIds = new Set(providers.map((p) => p.agentId.toString()));
    const result = await searchByCapability(
      config.indexPath,
      capability,
      providerIds,
      50
    );

    if (result.agentIds.length > 0) {
      const byId = new Map(providers.map((p) => [p.agentId.toString(), p]));
      const ordered: IndexedProvider[] = [];
      for (const id of result.agentIds) {
        const p = byId.get(id);
        if (p) ordered.push(p);
      }
      if (ordered.length > 0) return ordered;
    }
  }

  return discoverByCapabilityLegacy(capability, providers, minScore);
}
