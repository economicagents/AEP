/**
 * x402 Interceptor
 *
 * Wraps HTTP 402 flow. Before signing PAYMENT-SIGNATURE, call checkPolicy
 * to validate the payment against on-chain policy.
 *
 * Reference: https://x402.gitbook.io/x402/core-concepts/http-402
 */

import type { Address } from "viem";
import { checkPolicyDetailed } from "../account.js";
import type { Chain } from "viem";

export type PolicyCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "BUDGET_EXCEEDED" | "COUNTERPARTY_BLOCKED" | "REPUTATION_TOO_LOW" | "RATE_LIMIT" | "UNKNOWN";
    };

/**
 * Parse Payment-Amount header. Format: "amount=X currency=USD" or similar.
 * Returns amount in smallest unit (e.g. 6 decimals for USDC).
 */
export function parsePaymentAmount(header: string | null, decimals = 6): bigint | null {
  if (!header) return null;
  const match = header.match(/amount\s*=\s*([\d.]+)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return BigInt(Math.round(value * 10 ** decimals));
}

/**
 * Pre-check payment against AEP account policy before signing.
 * Call this before including PAYMENT-SIGNATURE in the request.
 */
export async function interceptPayment(
  accountAddress: Address,
  amount: bigint,
  recipient: Address,
  config: {
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<PolicyCheckResult> {
  try {
    const { allowed, reason } = await checkPolicyDetailed(accountAddress, amount, recipient, config);
    if (allowed) return { allowed: true };
    return { allowed: false, reason: reason ?? "UNKNOWN" };
  } catch {
    return { allowed: false, reason: "UNKNOWN" };
  }
}

/**
 * Full interceptor: parse 402 response headers and check policy.
 * Returns structured result for the agent's reasoning loop.
 *
 * @param recipientOverride - If provided, use this; otherwise try Payment-To header.
 */
export async function intercept402Response(
  accountAddress: Address,
  responseHeaders: Headers,
  recipientOverride?: Address,
  config?: { rpcUrl: string; chain?: Chain }
): Promise<PolicyCheckResult> {
  const paymentAmount = responseHeaders.get("Payment-Amount") ?? responseHeaders.get("payment-amount");
  const amount = parsePaymentAmount(paymentAmount);
  if (amount === null) return { allowed: false, reason: "UNKNOWN" };

  let recipient: Address;
  if (recipientOverride) {
    recipient = recipientOverride;
  } else {
    const paymentTo = responseHeaders.get("Payment-To") ?? responseHeaders.get("payment-to");
    if (!paymentTo || !paymentTo.startsWith("0x")) return { allowed: false, reason: "UNKNOWN" };
    recipient = paymentTo.trim() as Address;
  }

  if (!config?.rpcUrl) return { allowed: false, reason: "UNKNOWN" };

  return interceptPayment(accountAddress, amount, recipient, config);
}
