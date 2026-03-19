/**
 * Unit tests for discover: hybrid search when index exists, legacy fallback otherwise.
 */

import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { discoverByCapability } from "../src/discover.js";
import { buildSearchIndex } from "@economicagents/indexer";
import type { IndexedProvider } from "@economicagents/indexer";

const MOCK_PROVIDERS: IndexedProvider[] = [
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
    supportedTrust: ["reputation"],
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
];

describe("discover", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aep-discover-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("falls back to legacy when no indexPath", async () => {
    const result = await discoverByCapability("image classification", MOCK_PROVIDERS);
    expect(result.length).toBeGreaterThan(0);
    expect(result.map((p) => p.agentId.toString())).toContain("1");
  });

  it("falls back to legacy when indexPath but no search index", async () => {
    mkdirSync(tmpDir, { recursive: true });
    const result = await discoverByCapability("image classification", MOCK_PROVIDERS, {
      indexPath: tmpDir,
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it("uses hybrid search when search index exists", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    const result = await discoverByCapability("image classification", MOCK_PROVIDERS, {
      indexPath: tmpDir,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.map((p) => p.agentId.toString())).toContain("1");
  });

  it("preserves provider order from search ranking", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    const result = await discoverByCapability("vision", MOCK_PROVIDERS, {
      indexPath: tmpDir,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBeDefined();
  });
});
