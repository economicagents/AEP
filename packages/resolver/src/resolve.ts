/**
 * Resolve intent to execution plan: discover, filter, score, plan.
 * Supports multi-step decomposition and max_total budget enforcement.
 */

import type { Address } from "viem";
import { loadProviders } from "@aep/indexer";
import type { IndexedProvider } from "@aep/indexer";
import { getRecommendations } from "@aep/graph";
import { discoverByCapability } from "./discover.js";
import { scoreProviders } from "./score.js";
import { decomposeIntent } from "./decompose.js";
import type { ExecutionPlan, ExecutionPlanStep, ResolveConfig, ResolvedProvider } from "./types.js";
import type { Intent } from "@aep/sdk";

const USDC_DECIMALS = 6;

function parseUsdToSmallestUnit(usd: string): bigint {
  const n = parseFloat(usd);
  if (Number.isNaN(n) || n < 0) return 0n;
  return BigInt(Math.round(n * 10 ** USDC_DECIMALS));
}

function getHttpEndpoint(p: IndexedProvider): string | undefined {
  return p.services.find(
    (s) =>
      (s.name === "web" || s.name === "MCP" || s.name === "OASF") &&
      (s.endpoint.startsWith("http://") || s.endpoint.startsWith("https://"))
  )?.endpoint;
}

async function resolveSingleCapability(
  intent: Intent,
  providers: IndexedProvider[],
  config: ResolveConfig
): Promise<ResolvedProvider[]> {
  const constraints = intent.constraints;

  let filtered = providers.filter((p) => {
    if (!p.active) return false;
    if (!p.x402Support) return false;
    if (!getHttpEndpoint(p)) return false;
    if (p.paymentWallet == null || p.paymentWallet === "0x0000000000000000000000000000000000000000")
      return false;

    const minRep = intent.trust?.min_reputation;
    if (minRep != null && (p.reputationScore == null || p.reputationScore < minRep)) return false;

    const maxPerUnit = parseUsdToSmallestUnit(intent.budget.max_per_unit);
    if (maxPerUnit > 0n && p.lastProbePrice != null && p.lastProbePrice > maxPerUnit) return false;

    if (constraints?.latency_ms != null && p.lastProbeLatencyMs != null) {
      if (p.lastProbeLatencyMs > constraints.latency_ms) return false;
    }

    if (constraints?.accuracy != null && p.reputationScore != null) {
      if (p.reputationScore < constraints.accuracy) return false;
    }

    return true;
  });

  filtered = await discoverByCapability(intent.capability, filtered, {
    indexPath: config.indexPath,
  });

  let recommendationBoost: Map<string, number> | undefined;
  if (config.accountAddress && config.graphPath) {
    try {
      const recs = getRecommendations(
        config.graphPath,
        providers,
        config.accountAddress,
        intent.capability,
        20
      );
      recommendationBoost = new Map(
        recs.map((r) => [r.paymentWallet.toLowerCase(), r.score])
      );
    } catch {
      recommendationBoost = undefined;
    }
  }

  const weights = config.weights ?? {};
  const w = {
    price: weights.price ?? 0.4,
    reputation: weights.reputation ?? 0.3,
    latency: weights.latency ?? 0.2,
    validation: weights.validation ?? 0.1,
    uptime: weights.uptime ?? 0.1,
  };

  const scored = scoreProviders(filtered, intent, w, recommendationBoost);
  const maxProviders = config.maxProviders ?? 5;
  const top = scored.slice(0, maxProviders);

  const resolved: ResolvedProvider[] = top.map(({ provider: p }) => {
    const endpoint = getHttpEndpoint(p) ?? "";
    return {
      agentId: p.agentId,
      agentRegistry: p.agentRegistry,
      endpoint,
      paymentWallet: p.paymentWallet as Address,
      pricePerUnit: p.lastProbePrice ?? 0n,
      reputationScore: p.reputationScore ?? 0,
      latencyMs: p.lastProbeLatencyMs,
      supportedTrust: p.supportedTrust,
      name: p.name,
      description: p.description,
    };
  });

  const maxTotal = parseUsdToSmallestUnit(intent.budget.max_total);
  let truncated = resolved;
  if (maxTotal > 0n) {
    let running = 0n;
    const within: ResolvedProvider[] = [];
    for (const r of resolved) {
      if (running + r.pricePerUnit <= maxTotal) {
        within.push(r);
        running += r.pricePerUnit;
      } else break;
    }
    truncated = within.length > 0 ? within : resolved.slice(0, 1);
  }

  return truncated;
}

/**
 * Resolve an intent to an execution plan.
 */
export async function resolveIntent(
  intent: Intent,
  config: ResolveConfig
): Promise<ExecutionPlan> {
  const providers = loadProviders(config.indexPath);
  const subCapabilities = decomposeIntent(intent.capability);

  if (subCapabilities.length > 1) {
    const maxTotal = parseUsdToSmallestUnit(intent.budget.max_total);
    const budgetPerStep = maxTotal > 0n ? maxTotal / BigInt(subCapabilities.length) : 0n;

    const steps: ExecutionPlanStep[] = [];
    let totalCost = 0n;

    for (const cap of subCapabilities) {
      const subIntent: Intent = {
        ...intent,
        capability: cap,
        budget: {
          ...intent.budget,
          max_total:
            budgetPerStep > 0n
              ? (Number(budgetPerStep) / 10 ** USDC_DECIMALS).toFixed(6)
              : intent.budget.max_total,
        },
      };
      const stepProviders = await resolveSingleCapability(subIntent, providers, config);
      steps.push({ capability: cap, providers: stepProviders });
      if (stepProviders.length > 0 && stepProviders[0].pricePerUnit > 0n) {
        totalCost += stepProviders[0].pricePerUnit;
      }
    }

    const primaryProviders = steps[0]?.providers ?? [];
    const totalEstimatedCost =
      maxTotal > 0n
        ? Math.min(Number(totalCost) / 10 ** USDC_DECIMALS, Number(maxTotal) / 10 ** USDC_DECIMALS)
            .toFixed(6)
        : (Number(totalCost) / 10 ** USDC_DECIMALS).toFixed(6);

    return {
      providers: primaryProviders,
      totalEstimatedCost,
      steps,
    };
  }

  const resolved = await resolveSingleCapability(intent, providers, config);
  const maxTotal = parseUsdToSmallestUnit(intent.budget.max_total);
  let totalEstimatedCost = "0";
  if (resolved.length > 0 && resolved[0].pricePerUnit > 0n) {
    const cost = Number(resolved[0].pricePerUnit) / 1e6;
    totalEstimatedCost =
      maxTotal > 0n ? Math.min(cost, Number(maxTotal) / 1e6).toFixed(6) : cost.toFixed(6);
  }

  return {
    providers: resolved,
    totalEstimatedCost,
  };
}
