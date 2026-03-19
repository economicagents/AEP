/**
 * Unit tests for search-store: buildSearchIndex, searchByCapability, searchIndexExists.
 * When better-sqlite3 is unavailable (optional dep), search is no-op and legacy discovery is used.
 */

import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildSearchIndex,
  searchByCapability,
  searchIndexExists,
  hasVectorIndex,
  isSqliteAvailable,
} from "../src/search-store.js";
import type { IndexedProvider } from "../src/types.js";

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
];

describe("search-store", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aep-search-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("buildSearchIndex creates search.db with FTS5 when sqlite available", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    const exists = await searchIndexExists(tmpDir);
    if (isSqliteAvailable()) {
      expect(exists).toBe(true);
    }
    expect(hasVectorIndex(tmpDir)).toBe(false);
  });

  it("searchByCapability returns BM25 results when sqlite available", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    const result = await searchByCapability(tmpDir, "image classification", undefined, 10);
    if (isSqliteAvailable()) {
      expect(result.agentIds.length).toBeGreaterThan(0);
      expect(result.scores.length).toBe(result.agentIds.length);
      expect(result.agentIds).toContain("1");
      expect(result.agentIds).toContain("2");
    } else {
      expect(result.agentIds).toEqual([]);
    }
  });

  it("searchByCapability returns empty when no index", async () => {
    const result = await searchByCapability(tmpDir, "image classification");
    expect(result.agentIds).toEqual([]);
    expect(result.scores).toEqual([]);
  });

  it("searchByCapability filters by providerIds when provided", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    const providerIds = new Set(["1", "3"]);
    const result = await searchByCapability(tmpDir, "image classification", providerIds, 10);
    if (isSqliteAvailable() && result.agentIds.length > 0) {
      expect(result.agentIds.every((id) => providerIds.has(id))).toBe(true);
    }
  });

  it("searchByCapability matches summarization when sqlite available", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    const result = await searchByCapability(tmpDir, "summarization");
    if (isSqliteAvailable()) {
      expect(result.agentIds.length).toBeGreaterThan(0);
      expect(result.agentIds).toContain("3");
    } else {
      expect(result.agentIds).toEqual([]);
    }
  });
});
