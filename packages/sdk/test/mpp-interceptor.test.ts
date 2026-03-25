import { describe, expect, it } from "vitest";
import { Challenge } from "mppx";
import {
  classifyPaywallHeaders,
  headersIndicateMppPayment,
  tempoSessionChallengeToPolicy,
} from "../src/mpp/interceptor.js";

describe("MPP header helpers", () => {
  it("detects MPP WWW-Authenticate", () => {
    const h = new Headers({
      "WWW-Authenticate": 'Payment realm="api", id="x"',
    });
    expect(headersIndicateMppPayment(h)).toBe(true);
    expect(classifyPaywallHeaders(h)).toBe("mpp");
  });

  it("classifies x402 Payment-Amount", () => {
    const h = new Headers({
      "Payment-Amount": "amount=0.01 currency=USD",
    });
    expect(classifyPaywallHeaders(h)).toBe("x402");
  });
});

describe("tempoSessionChallengeToPolicy", () => {
  it("parses tempo session request into policy inputs", () => {
    const ch = Challenge.from({
      id: "probe",
      realm: "localhost",
      method: "tempo",
      intent: "session",
      request: {
        amount: "0.005",
        currency: "0x20c0000000000000000000000000000000000000",
        decimals: 6,
        unitType: "request",
        recipient: "0x742d35Cc6634c0532925a3b844bC9e7595F8fE00",
      },
    });
    const p = tempoSessionChallengeToPolicy(ch);
    expect(p).not.toBeNull();
    expect(p!.amount).toBe(5000n);
    expect(p!.recipient).toBe("0x742d35Cc6634c0532925a3b844bC9e7595F8fE00");
    expect(p!.decimals).toBe(6);
  });

  it("returns null for non-session challenges", () => {
    const ch = Challenge.from({
      id: "c",
      realm: "localhost",
      method: "tempo",
      intent: "charge",
      request: { amount: "1", currency: "0x20c0000000000000000000000000000000000000" },
    });
    expect(tempoSessionChallengeToPolicy(ch)).toBeNull();
  });
});
