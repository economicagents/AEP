/**
 * Postgres hybrid search: mocks OpenAI query embedding so CI does not call the API.
 */
import { vi } from "vitest";

function queryVectorAlignedWithFirstAgent(): number[] {
  const v = new Array(1536).fill(0);
  v[0] = 1;
  return v;
}

vi.mock("../src/embeddings.js", () => ({
  EMBEDDING_DIMENSIONS: 1536,
  embeddingModel: () => "text-embedding-3-small",
  embedTextsBatch: async () => {
    throw new Error("embedTextsBatch should not run in this suite");
  },
  embedQueryText: vi.fn(async () => queryVectorAlignedWithFirstAgent()),
}));

import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import {
  buildSearchIndex,
  searchByCapability,
  writeEmbeddings,
} from "../src/search-store.js";
import { closePgPool } from "../src/pg/pool.js";
import { getIndexDatabaseUrl } from "../src/pg-config.js";
import type { IndexedProvider } from "../src/types.js";
import { embedQueryText } from "../src/embeddings.js";

const pgUrl = process.env.AEP_INDEX_DATABASE_URL;
const describePgHybrid = pgUrl ? describe : describe.skip;

const PAIR: IndexedProvider[] = [
  {
    agentId: 101n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "AlphaSvc",
    description: "Alpha unique doc token axq111",
    services: [{ name: "web", endpoint: "https://a.example.com" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    lastUpdated: Date.now(),
  },
  {
    agentId: 202n,
    agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    chainId: 84532,
    name: "BetaSvc",
    description: "Beta unique doc token bxq222",
    services: [{ name: "web", endpoint: "https://b.example.com" }],
    x402Support: true,
    active: true,
    paymentWallet: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    lastUpdated: Date.now(),
  },
];

function unitVector(dim: number): Float32Array {
  const v = new Float32Array(1536);
  v[dim] = 1;
  return v;
}

describePgHybrid("search-store-pg hybrid (mocked embeddings)", () => {
  let tmpDir: string;
  let prevKey: string | undefined;

  beforeAll(() => {
    if (!getIndexDatabaseUrl()) {
      throw new Error("AEP_INDEX_DATABASE_URL required for this suite");
    }
  });

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aep-pg-hybrid-"));
    process.env.AEP_INDEX_DATASET_ID = `vitest-hybrid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    prevKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key-for-hybrid-suite";
  });

  afterEach(async () => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    delete process.env.AEP_INDEX_DATASET_ID;
    if (prevKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = prevKey;
    }
    vi.mocked(embedQueryText).mockClear();
  });

  afterAll(async () => {
    await closePgPool();
  });

  it("ranks by vector similarity when query text matches no lexical hit", async () => {
    await buildSearchIndex(tmpDir, PAIR);
    const emb = new Map<string, Float32Array>();
    emb.set("101", unitVector(0));
    emb.set("202", unitVector(1));
    await writeEmbeddings(tmpDir, emb);

    const q = "zzz_no_lexical_match_expected_9f2c";
    const result = await searchByCapability(tmpDir, q, undefined, 10);

    expect(vi.mocked(embedQueryText)).toHaveBeenCalled();
    expect(result.agentIds.length).toBeGreaterThan(0);
    expect(result.agentIds[0]).toBe("101");
  });
});
