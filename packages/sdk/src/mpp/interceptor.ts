/**
 * MPP (Machine Payments Protocol) helpers for AEP policy pre-checks on Base.
 * Settlement may occur on Tempo; policy reads remain on the AEP account chain.
 */

import { Challenge } from "mppx";
import type { Address } from "viem";
import type { Chain } from "viem";
import { interceptPayment, type PolicyCheckResult } from "../x402/interceptor.js";

/** Minimal challenge shape for Tempo session policy extraction */
type MppChallengeLike = {
  method: string;
  intent: string;
  request: Record<string, unknown>;
};

export function headersIndicateMppPayment(headers: Headers): boolean {
  const v = headers.get("www-authenticate") ?? headers.get("WWW-Authenticate");
  if (!v) return false;
  return /\bPayment\b/i.test(v);
}

/** Classify a 402 (or preflight) response by classic x402 headers vs MPP `WWW-Authenticate: Payment`. */
export function classifyPaywallHeaders(headers: Headers): "mpp" | "x402" | "unknown" {
  if (headersIndicateMppPayment(headers)) return "mpp";
  const paymentAmount = headers.get("Payment-Amount") ?? headers.get("payment-amount");
  if (paymentAmount && /amount\s*=/i.test(paymentAmount)) return "x402";
  return "unknown";
}

export type TempoSessionPolicyInputs = {
  amount: bigint;
  recipient: Address;
  decimals: number;
};

/**
 * Extract USDC-style smallest-unit amount + recipient from a parsed tempo/session challenge.
 */
export function tempoSessionChallengeToPolicy(challenge: MppChallengeLike): TempoSessionPolicyInputs | null {
  if (challenge.method !== "tempo" || challenge.intent !== "session") return null;
  const req = challenge.request as Record<string, unknown>;
  const amountRaw = req.amount;
  if (typeof amountRaw !== "string") return null;
  const decimals = typeof req.decimals === "number" ? req.decimals : 6;
  const n = Number.parseFloat(amountRaw);
  if (!Number.isFinite(n)) return null;
  const amount = BigInt(Math.round(n * 10 ** decimals));
  const recipientStr = req.recipient;
  const recipient =
    typeof recipientStr === "string" && recipientStr.startsWith("0x") && recipientStr.length === 42
      ? (recipientStr as Address)
      : null;
  if (!recipient) return null;
  return { amount, recipient, decimals };
}

function firstTempoSessionChallenge(list: readonly MppChallengeLike[]): MppChallengeLike | null {
  const found = list.find((c) => c.method === "tempo" && c.intent === "session");
  return found ?? null;
}

/**
 * Read Tempo session pricing hints from response headers (402 probes).
 */
export function tempoSessionProbeFromHeaders(headers: Headers): TempoSessionPolicyInputs | null {
  try {
    const list = Challenge.fromHeadersList(headers);
    const ch = firstTempoSessionChallenge(list);
    if (!ch) return null;
    return tempoSessionChallengeToPolicy(ch);
  } catch {
    return null;
  }
}

/**
 * Policy gate for MPP 402 responses before the client signs vouchers or opens a channel.
 */
export async function interceptMpp402Response(
  accountAddress: Address,
  response: Response,
  config?: { rpcUrl: string; chain?: Chain }
): Promise<
  | { handled: false; reason: "not_402" | "no_tempo_session" | "missing_policy_inputs" | "parse_error" }
  | { handled: true; policyCheck: PolicyCheckResult; inputs: TempoSessionPolicyInputs }
> {
  if (response.status !== 402) return { handled: false, reason: "not_402" };

  let list: MppChallengeLike[];
  try {
    list = Challenge.fromResponseList(response);
  } catch {
    return { handled: false, reason: "parse_error" };
  }

  const ch = firstTempoSessionChallenge(list);
  if (!ch) return { handled: false, reason: "no_tempo_session" };

  const inputs = tempoSessionChallengeToPolicy(ch);
  if (!inputs) return { handled: false, reason: "missing_policy_inputs" };

  if (!config?.rpcUrl) {
    return {
      handled: true,
      inputs,
      policyCheck: { allowed: false, reason: "UNKNOWN" },
    };
  }

  const policyCheck = await interceptPayment(accountAddress, inputs.amount, inputs.recipient, config);
  return { handled: true, policyCheck, inputs };
}
