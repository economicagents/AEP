/**
 * Integration tests for Postgres search (requires AEP_INDEX_DATABASE_URL + running pgvector).
 */
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import {
  buildSearchIndex,
  searchByCapability,
  searchIndexExists,
  hasVectorIndex,
} from "../src/search-store.js";
import { closePgPool } from "../src/pg/pool.js";
import { getIndexDatabaseUrl } from "../src/pg-config.js";
import type { IndexedProvider } from "../src/types.js";

const pgUrl = process.env.AEP_INDEX_DATABASE_URL;
const describePg = pgUrl ? describe : describe.skip;

const MOCK_PROVIDERS: IndexedProvider[] = [
  {
    agentId: 101n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "VisionAPI",
    description: "Image classification and computer vision",
    services: [{ name: "web", endpoint: "https://v.example.com" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    lastUpdated: Date.now(),
  },
];

const MOCK_PROVIDERS_TWO: IndexedProvider[] = [
  ...MOCK_PROVIDERS,
  {
    agentId: 202n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "TextAPI",
    description: "Summarization and NLP",
    services: [{ name: "web", endpoint: "https://t.example.com" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    lastUpdated: Date.now(),
  },
];

describePg("search-store-pg", () => {
  let tmpDir: string;

  beforeAll(() => {
    if (!getIndexDatabaseUrl()) {
      throw new Error("AEP_INDEX_DATABASE_URL required for this suite");
    }
  });

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aep-pg-search-"));
    process.env.AEP_INDEX_DATASET_ID = `vitest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  afterEach(async () => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    delete process.env.AEP_INDEX_DATASET_ID;
  });

  afterAll(async () => {
    await closePgPool();
  });

  it("indexes and finds providers by lexical search", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    expect(await searchIndexExists(tmpDir)).toBe(true);
    const result = await searchByCapability(tmpDir, "computer vision", undefined, 10);
    expect(result.agentIds).toContain("101");
    expect(await hasVectorIndex(tmpDir)).toBe(false);
  });

  it("removes Postgres rows for providers no longer in the sync set", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS_TWO);
    const withTwo = await searchByCapability(tmpDir, "summarization NLP", undefined, 10);
    expect(withTwo.agentIds).toContain("202");

    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    const afterNlp = await searchByCapability(tmpDir, "summarization NLP", undefined, 10);
    expect(afterNlp.agentIds).not.toContain("202");
    const vision = await searchByCapability(tmpDir, "computer vision", undefined, 10);
    expect(vision.agentIds).toContain("101");
  });

  it("clears all Postgres rows for the dataset when the provider list is empty", async () => {
    await buildSearchIndex(tmpDir, MOCK_PROVIDERS);
    expect(await searchIndexExists(tmpDir)).toBe(true);
    await buildSearchIndex(tmpDir, []);
    expect(await searchIndexExists(tmpDir)).toBe(false);
  });
});
