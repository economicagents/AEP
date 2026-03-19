/**
 * Integration tests for x402 interceptor and fetchWithPolicyCheck.
 * Uses mock fetch and mocked policy check to avoid real RPC.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Address } from "viem";

const mockCheckPolicyDetailed = vi.fn().mockResolvedValue({ allowed: true });

vi.mock("../src/account.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/account.js")>();
  return {
    ...actual,
    checkPolicyDetailed: (...args: unknown[]) => mockCheckPolicyDetailed(...args),
  };
});

// Import after mock
const { parsePaymentAmount, intercept402Response, fetchWithPolicyCheck } = await import(
  "../src/index.js"
);

describe("parsePaymentAmount", () => {
  it("parses amount from Payment-Amount header", () => {
    expect(parsePaymentAmount("amount=0.5 currency=USD")).toBe(500000n);
    expect(parsePaymentAmount("amount=1.0 currency=USD")).toBe(1000000n);
    expect(parsePaymentAmount("amount=0.02 currency=USD")).toBe(20000n);
  });

  it("handles case insensitivity", () => {
    expect(parsePaymentAmount("Amount=1.0")).toBe(1000000n);
  });

  it("returns null for missing or invalid header", () => {
    expect(parsePaymentAmount(null)).toBe(null);
    expect(parsePaymentAmount("")).toBe(null);
    expect(parsePaymentAmount("invalid")).toBe(null);
  });

  it("respects decimals parameter", () => {
    expect(parsePaymentAmount("amount=1.0", 18)).toBe(1000000000000000000n);
  });
});

describe("intercept402Response", () => {
  const accountAddress = "0x1234567890123456789012345678901234567890" as Address;
  const rpcConfig = { rpcUrl: "https://sepolia.base.org" };

  beforeEach(() => {
    mockCheckPolicyDetailed.mockResolvedValue({ allowed: true });
  });

  it("parses Payment-Amount and Payment-To from headers", async () => {
    const headers = new Headers();
    headers.set("Payment-Amount", "amount=0.5 currency=USD");
    headers.set("Payment-To", "0xabcdef1234567890abcdef1234567890abcdef12");

    const result = await intercept402Response(accountAddress, headers, undefined, rpcConfig);
    expect(result.allowed).toBe(true);
  });

  it("returns UNKNOWN when Payment-Amount is missing", async () => {
    const headers = new Headers();
    headers.set("Payment-To", "0xabcdef1234567890abcdef1234567890abcdef12");

    const result = await intercept402Response(accountAddress, headers, undefined, rpcConfig);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("UNKNOWN");
  });

  it("uses recipientOverride when provided", async () => {
    const headers = new Headers();
    headers.set("Payment-Amount", "amount=1.0 currency=USD");
    const override = "0x1111111111111111111111111111111111111111" as Address;

    const result = await intercept402Response(accountAddress, headers, override, rpcConfig);
    expect(result.allowed).toBe(true);
  });
});

describe("fetchWithPolicyCheck", () => {
  const accountAddress = "0x1234567890123456789012345678901234567890" as Address;
  const rpcConfig = { rpcUrl: "https://sepolia.base.org" };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("402")) {
          return Promise.resolve(
            new Response("Payment Required", {
              status: 402,
              headers: {
                "Payment-Amount": "amount=0.5 currency=USD",
                "Payment-To": "0xabcdef1234567890abcdef1234567890abcdef12",
              },
            })
          );
        }
        return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
      })
    );
    mockCheckPolicyDetailed.mockResolvedValue({ allowed: true });
  });

  it("returns ok when status is not 402", async () => {
    const result = await fetchWithPolicyCheck(
      accountAddress,
      "https://example.com/ok",
      undefined,
      rpcConfig
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.response.status).toBe(200);
    }
  });

  it("returns payment_required with policyCheck when status is 402", async () => {
    const result = await fetchWithPolicyCheck(
      accountAddress,
      "https://example.com/402",
      undefined,
      rpcConfig
    );
    expect(result.status).toBe("payment_required");
    if (result.status === "payment_required") {
      expect(result.policyCheck.allowed).toBe(true);
      expect(result.amount).toBe(500000n);
      expect(result.recipient).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
    }
  });

  it("returns policy denied when checkPolicyDetailed rejects", async () => {
    mockCheckPolicyDetailed.mockResolvedValue({ allowed: false, reason: "BUDGET_EXCEEDED" });

    const result = await fetchWithPolicyCheck(
      accountAddress,
      "https://example.com/402",
      undefined,
      rpcConfig
    );
    expect(result.status).toBe("payment_required");
    if (result.status === "payment_required") {
      expect(result.policyCheck.allowed).toBe(false);
      if (!result.policyCheck.allowed) {
        expect(result.policyCheck.reason).toBe("BUDGET_EXCEEDED");
      }
    }
  });
});
