import { describe, expect, it } from "vitest";
import { normalizeServices } from "../src/normalize-services.js";

describe("normalizeServices", () => {
  it("keeps valid arrays", () => {
    expect(
      normalizeServices([{ name: "web", endpoint: "https://a.example" }])
    ).toEqual([{ name: "web", endpoint: "https://a.example" }]);
  });

  it("coerces object map of service entries", () => {
    expect(
      normalizeServices({
        svc: { name: "web", endpoint: "https://b.example" },
      })
    ).toEqual([{ name: "web", endpoint: "https://b.example" }]);
  });

  it("returns [] for invalid or empty inputs", () => {
    expect(normalizeServices(undefined)).toEqual([]);
    expect(normalizeServices(null)).toEqual([]);
    expect(normalizeServices("nope")).toEqual([]);
    expect(normalizeServices([{ name: "x" }])).toEqual([]);
  });
});
