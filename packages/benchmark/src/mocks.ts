/**
 * Mock provider index for benchmarking.
 * 5-10 fake agents with varied price, reputation, latency.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { buildSearchIndex, type IndexedProvider } from "@economicagents/indexer";

export const MOCK_PROVIDERS: IndexedProvider[] = [
  {
    agentId: 1n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "ExpensiveVision",
    description: "Image classification and computer vision API with high accuracy",
    services: [{ name: "web", endpoint: "https://expensive.example.com/vision" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    reputationScore: 0.95,
    reputationCount: 100n,
    lastProbeLatencyMs: 50,
    lastProbePrice: 50_000n,
    supportedTrust: ["reputation", "crypto-economic"],
    lastUpdated: Date.now(),
  },
  {
    agentId: 2n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "CheapClassifier",
    description: "Image classification API, budget option",
    services: [{ name: "web", endpoint: "https://cheap.example.com/classify" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    reputationScore: 0.7,
    reputationCount: 20n,
    lastProbeLatencyMs: 200,
    lastProbePrice: 5_000n,
    supportedTrust: ["reputation"],
    lastUpdated: Date.now(),
  },
  {
    agentId: 3n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "MidRangeVision",
    description: "Image classification and object detection",
    services: [{ name: "web", endpoint: "https://mid.example.com/vision" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x3333333333333333333333333333333333333333" as `0x${string}`,
    reputationScore: 0.85,
    reputationCount: 50n,
    lastProbeLatencyMs: 100,
    lastProbePrice: 15_000n,
    supportedTrust: ["reputation", "tee-attestation"],
    lastUpdated: Date.now(),
  },
  {
    agentId: 4n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "SummarizerPro",
    description: "Text summarization and NLP API",
    services: [{ name: "web", endpoint: "https://summarizer.example.com" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x4444444444444444444444444444444444444444" as `0x${string}`,
    reputationScore: 0.9,
    reputationCount: 80n,
    lastProbeLatencyMs: 80,
    lastProbePrice: 10_000n,
    supportedTrust: ["reputation"],
    lastUpdated: Date.now(),
  },
  {
    agentId: 5n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "BudgetVision",
    description: "Image classification with labels, low cost",
    services: [{ name: "web", endpoint: "https://budget.example.com/vision" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x5555555555555555555555555555555555555555" as `0x${string}`,
    reputationScore: 0.6,
    reputationCount: 10n,
    lastProbeLatencyMs: 300,
    lastProbePrice: 2_000n,
    supportedTrust: ["reputation"],
    lastUpdated: Date.now(),
  },
];

export async function writeMockIndex(dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const serializable = MOCK_PROVIDERS.map((p) => ({
    ...p,
    agentId: p.agentId.toString(),
    reputationCount: p.reputationCount?.toString(),
    lastProbePrice: p.lastProbePrice?.toString(),
  }));
  writeFileSync(join(dir, "providers.json"), JSON.stringify(serializable, null, 2));
  writeFileSync(
    join(dir, "state.json"),
    JSON.stringify(
      {
        lastBlock: 0,
        chainId: 84532,
        identityRegistryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        updatedAt: Date.now(),
      },
      null,
      2
    )
  );
  await buildSearchIndex(dir, MOCK_PROVIDERS);
}
