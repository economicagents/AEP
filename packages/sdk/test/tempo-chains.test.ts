import { describe, expect, it } from "vitest";
import { resolveTempoChainId, tempoChainId } from "../src/tempo-chains.js";

describe("resolveTempoChainId", () => {
  it("uses env when non-empty", () => {
    expect(
      resolveTempoChainId({ envChainId: "42431", fileChainId: tempoChainId.mainnet })
    ).toBe(42431);
  });

  it("treats empty env as unset and uses file", () => {
    expect(
      resolveTempoChainId({
        envChainId: "   ",
        fileChainId: tempoChainId.testnet,
      })
    ).toBe(tempoChainId.testnet);
  });

  it("falls back to mainnet when env empty and no file", () => {
    expect(resolveTempoChainId({ envChainId: "" })).toBe(tempoChainId.mainnet);
  });

  it("throws on invalid env number", () => {
    expect(() => resolveTempoChainId({ envChainId: "not-a-number" })).toThrow(
      /Invalid AEP_TEMPO_CHAIN_ID/
    );
  });

  it("throws on non-positive file id", () => {
    expect(() =>
      resolveTempoChainId({ envChainId: undefined, fileChainId: 0 })
    ).toThrow(/Invalid tempoChainId/);
  });
});
