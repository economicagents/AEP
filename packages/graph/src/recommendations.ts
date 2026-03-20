/**
 * Recommendation engine: collaborative filtering for agent services.
 * "Agents like yours also used provider X for task Y."
 * Providers are passed in to avoid graph depending on indexer (breaks cycle).
 */

import { getDatabase } from "./store.js";

export interface ProviderInfo {
  agentId: bigint;
  paymentWallet?: string;
  x402Support: boolean;
  services: Array<{ name?: string }>;
  name?: string;
  description?: string;
}

export interface ProviderRecommendation {
  agentId: bigint;
  paymentWallet: string;
  name?: string;
  description?: string;
  score: number;
  paymentCount: number;
}

/**
 * Get provider recommendations for an account based on collaborative filtering.
 * Finds agents that paid similar providers, then recommends providers those agents used.
 * @param providers - Provider list (e.g. from loadProviders(indexPath))
 */
export function getRecommendations(
  graphPath: string,
  providers: ProviderInfo[],
  accountAddress: string,
  capability?: string,
  limit = 5
): ProviderRecommendation[] {
  const db = getDatabase(graphPath);
  const addr = accountAddress.toLowerCase();

  const paymentWalletToProvider = new Map<string, ProviderInfo>();
  for (const p of providers) {
    if (p.paymentWallet && p.x402Support) {
      paymentWalletToProvider.set(p.paymentWallet.toLowerCase(), p);
    }
  }

  const paidByAccount = db
    .prepare("SELECT toAddr FROM payments WHERE fromAddr = ?")
    .all(addr) as { toAddr: string }[];
  const accountPaidTo = new Set(paidByAccount.map((r) => r.toAddr));

  const similarAgents = new Map<string, number>();
  for (const payee of accountPaidTo) {
    const payers = db
      .prepare("SELECT fromAddr FROM payments WHERE toAddr = ? AND fromAddr != ?")
      .all(payee, addr) as { fromAddr: string }[];
    for (const r of payers) {
      similarAgents.set(
        r.fromAddr,
        (similarAgents.get(r.fromAddr) ?? 0) + 1
      );
    }
  }

  const providerScores = new Map<string, { count: number; agents: Set<string> }>();
  for (const [agent, _weight] of similarAgents) {
    const paidTo = db
      .prepare("SELECT toAddr FROM payments WHERE fromAddr = ?")
      .all(agent) as { toAddr: string }[];
    for (const r of paidTo) {
      if (!accountPaidTo.has(r.toAddr)) {
        const key = r.toAddr;
        const existing = providerScores.get(key) ?? {
          count: 0,
          agents: new Set<string>(),
        };
        existing.count += similarAgents.get(agent) ?? 1;
        existing.agents.add(agent);
        providerScores.set(key, existing);
      }
    }
  }

  const results: ProviderRecommendation[] = [];
  for (const [paymentWallet, { count, agents }] of providerScores) {
    const provider = paymentWalletToProvider.get(paymentWallet);
    if (!provider) continue;
    if (capability && !provider.services.some((s) => s.name?.toLowerCase().includes(capability.toLowerCase()))) {
      continue;
    }
    results.push({
      agentId: provider.agentId,
      paymentWallet,
      name: provider.name,
      description: provider.description,
      score: count / (agents.size + 1),
      paymentCount: count,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
