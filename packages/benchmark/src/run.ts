/**
 * Benchmark: AEP-resolved vs naive x402 procurement.
 * Uses mock index, no live RPC.
 */

import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { resolveIntent } from "@economicagents/resolver";
import { loadProviders } from "@economicagents/indexer";
import { parseIntent } from "@economicagents/sdk";
import { writeMockIndex } from "./mocks.js";

const INTENT_CAPABILITY = "image classification";
const INTENT_BUDGET = { max_per_unit: "0.10", max_total: "1.00", currency: "USDC" as const };

function naiveResolve(indexPath: string): {
  providerId: bigint;
  price: bigint;
  latencyMs?: number;
  reputationScore?: number;
} | null {
  const providers = loadProviders(indexPath);
  const cap = INTENT_CAPABILITY.toLowerCase();
  const filtered = providers.filter(
    (p) =>
      p.active &&
      p.x402Support &&
      p.paymentWallet &&
      p.paymentWallet !== "0x0000000000000000000000000000000000000000" &&
      ((p.description ?? "").toLowerCase().includes(cap) || (p.name ?? "").toLowerCase().includes(cap))
  );
  const first = filtered[0];
  if (!first) return null;
  return {
    providerId: first.agentId,
    price: first.lastProbePrice ?? 0n,
    latencyMs: first.lastProbeLatencyMs,
    reputationScore: first.reputationScore,
  };
}

async function main() {
  const tmpDir = mkdtempSync(join(tmpdir(), "aep-benchmark-"));
  await writeMockIndex(tmpDir);

  const intent = parseIntent({
    capability: INTENT_CAPABILITY,
    budget: INTENT_BUDGET,
  });

  const naiveResult = naiveResolve(tmpDir);
  const resolvedPlan = await resolveIntent(intent, { indexPath: tmpDir, maxProviders: 5 });

  rmSync(tmpDir, { recursive: true });

  const naivePrice = naiveResult?.price ?? 0n;
  const resolvedPrice = resolvedPlan.providers[0]?.pricePerUnit ?? 0n;
  const naiveLatency = naiveResult?.latencyMs ?? 0;
  const resolvedLatency = resolvedPlan.providers[0]?.latencyMs ?? 0;
  const naiveRep = naiveResult?.reputationScore ?? 0;
  const resolvedRep = resolvedPlan.providers[0]?.reputationScore ?? 0;

  const naiveCostUsd = Number(naivePrice) / 1e6;
  const resolvedCostUsd = Number(resolvedPrice) / 1e6;

  const costSavings =
    naiveCostUsd > 0 ? ((naiveCostUsd - resolvedCostUsd) / naiveCostUsd) * 100 : 0;
  const latencyImprovement =
    naiveLatency > 0 ? ((naiveLatency - resolvedLatency) / naiveLatency) * 100 : 0;
  const qualityImprovement =
    resolvedRep > naiveRep ? ((resolvedRep - naiveRep) / (1 - naiveRep || 0.01)) * 100 : 0;

  const report = `
# AEP Benchmark: Resolved vs Naive

## Intent
- Capability: ${INTENT_CAPABILITY}
- Budget: max_per_unit $${INTENT_BUDGET.max_per_unit}, max_total $${INTENT_BUDGET.max_total}

## Results

| Strategy    | Provider ID | Cost (USDC) | Latency (ms) | Quality (rep) |
|-------------|-------------|-------------|--------------|---------------|
| Naive       | ${naiveResult?.providerId ?? "N/A"} | ${naiveCostUsd.toFixed(6)} | ${naiveLatency} | ${naiveRep.toFixed(2)} |
| AEP-Resolved| ${resolvedPlan.providers[0]?.agentId ?? "N/A"} | ${resolvedCostUsd.toFixed(6)} | ${resolvedLatency} | ${resolvedRep.toFixed(2)} |

## Improvements
- Cost: ${costSavings >= 0 ? `${costSavings.toFixed(1)}% reduction` : "Naive cheaper"}
- Latency: ${latencyImprovement >= 0 ? `${latencyImprovement.toFixed(1)}% faster` : "Naive faster"}
- Quality: ${qualityImprovement > 0 ? `${qualityImprovement.toFixed(1)}% higher reputation` : "Same or lower"}

## Top 3 AEP-Resolved Providers
${resolvedPlan.providers
  .slice(0, 3)
  .map(
    (p, i) =>
      `${i + 1}. Agent ${p.agentId} - $${(Number(p.pricePerUnit) / 1e6).toFixed(6)}/unit, ${p.latencyMs ?? "?"}ms, rep ${p.reputationScore}`
  )
  .join("\n")}
`;

  console.log(report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
