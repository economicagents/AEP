import { describe, it, expect } from "vitest";
import { mergeRrf, toRrfRanks, RRF_K } from "../src/rrf.js";

describe("rrf", () => {
  it("merges two ranked lists with reciprocal rank fusion", () => {
    const a = toRrfRanks(["x", "y", "z"]);
    const b = toRrfRanks(["y", "w"]);
    const merged = mergeRrf([a, b]);
    expect(merged[0]!.id).toBe("y");
    expect(merged[0]!.score).toBeCloseTo(1 / (RRF_K + 2) + 1 / (RRF_K + 1), 8);
  });

  it("handles a single list", () => {
    const merged = mergeRrf([toRrfRanks(["a", "b"])]);
    expect(merged).toHaveLength(2);
    expect(merged[0]!.score).toBeGreaterThan(merged[1]!.score);
  });
});
