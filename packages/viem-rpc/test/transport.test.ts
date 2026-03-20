import { describe, expect, it } from "vitest";
import { createPublicClient } from "viem";
import { base } from "viem/chains";
import { transportFromRpcUrl } from "../src/index.js";

describe("transportFromRpcUrl", () => {
  it("creates a public client with https URL", () => {
    const client = createPublicClient({
      chain: base,
      transport: transportFromRpcUrl("https://base-mainnet.g.alchemy.com/v2/demo"),
    });
    expect(client.chain).toBe(base);
  });

  it("creates a public client with wss URL", () => {
    const client = createPublicClient({
      chain: base,
      transport: transportFromRpcUrl("wss://base-mainnet.g.alchemy.com/v2/demo"),
    });
    expect(client.chain).toBe(base);
  });

  it("trims whitespace in URL", () => {
    const client = createPublicClient({
      chain: base,
      transport: transportFromRpcUrl("  https://example.com  "),
    });
    expect(client.chain).toBe(base);
  });
});
