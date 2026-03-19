/**
 * Score and rank providers by price, reputation, latency, validation match.
 */

import type { IndexedProvider } from "@aep/indexer";
import type { Intent } from "@aep/sdk";

const USDC_DECIMALS = 6;

function parseUsdToSmallestUnit(usd: string): bigint {
  const n = parseFloat(usd);
  if (Number.isNaN(n) || n < 0) return 0n;
  return BigInt(Math.round(n * 10 ** USDC_DECIMALS));
}

const DEFAULT_WEIGHTS = {
  price: 0.35,
  reputation: 0.25,
  latency: 0.2,
  validation: 0.1,
  uptime: 0.1,
};

function normalizePrice(price: bigint | undefined, maxPerUnit: bigint): number {
  if (price == null || price === 0n) return 1;
  if (maxPerUnit === 0n) return 1;
  const ratio = Number(price) / Number(maxPerUnit);
  return Math.max(0, 1 - ratio);
}

function normalizeReputation(score: number | undefined): number {
  if (score == null) return 0.5;
  return Math.max(0, Math.min(1, score));
}

function normalizeLatency(latencyMs: number | undefined): number {
  if (latencyMs == null) return 0.5;
  if (latencyMs <= 0) return 1;
  if (latencyMs >= 5000) return 0;
  return 1 - latencyMs / 5000;
}

function normalizeUptime(uptimePercent: number | undefined): number {
  if (uptimePercent == null) return 0.5;
  return Math.max(0, Math.min(1, uptimePercent));
}

function normalizeErrorRate(errorRate: number | undefined): number {
  if (errorRate == null) return 0.5;
  return Math.max(0, 1 - errorRate);
}

function validationMatch(
  supportedTrust: string[],
  required: string
): number {
  if (required === "any") return 1;
  return supportedTrust.includes(required) ? 1 : 0;
}

export function scoreProviders(
  providers: IndexedProvider[],
  intent: Intent,
  weights = DEFAULT_WEIGHTS,
  recommendationBoost?: Map<string, number>
): Array<{ provider: IndexedProvider; score: number }> {
  const maxPerUnit = parseUsdToSmallestUnit(intent.budget.max_per_unit);
  const requiredValidation = intent.trust?.required_validation ?? "any";

  let w = { ...weights };
  if (intent.constraints?.latency_ms != null) {
    w = { ...w, latency: w.latency + 0.1, price: Math.max(0.1, w.price - 0.05) };
  }
  if (intent.constraints?.accuracy != null) {
    w = { ...w, reputation: w.reputation + 0.1, price: Math.max(0.1, w.price - 0.05) };
  }

  const uptimeWeight = w.uptime ?? 0.1;

  return providers
    .map((p) => {
      const priceNorm = normalizePrice(p.lastProbePrice, maxPerUnit);
      const repNorm = normalizeReputation(p.reputationScore);
      const latNorm = normalizeLatency(p.lastProbeLatencyMs);
      const valNorm = validationMatch(p.supportedTrust, requiredValidation);
      const uptimeNorm =
        normalizeUptime(p.uptimePercent) * 0.5 + normalizeErrorRate(p.errorRate) * 0.5;

      let score =
        w.price * priceNorm +
        w.reputation * repNorm +
        w.latency * latNorm +
        w.validation * valNorm +
        uptimeWeight * uptimeNorm;

      const recBoost = recommendationBoost?.get(p.paymentWallet?.toLowerCase() ?? "");
      if (recBoost != null && recBoost > 0) {
        score += Math.min(0.2, recBoost);
      }

      return { provider: p, score };
    })
    .sort((a, b) => b.score - a.score);
}
