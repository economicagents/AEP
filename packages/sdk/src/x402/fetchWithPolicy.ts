/**
 * x402 fetch wrapper with policy check
 *
 * Wraps fetch to intercept 402 responses and check AEP policy before the agent
 * signs and retries. Use this when making requests to x402-protected endpoints.
 *
 * @example
 * ```ts
 * const result = await fetchWithPolicyCheck(accountAddress, url, { rpcUrl });
 * if (result.status === "ok") {
 *   const data = await result.response.json();
 *   // use data
 * } else if (result.status === "payment_required" && result.policyCheck.allowed) {
 *   // Policy allows: sign payment and retry with PAYMENT-SIGNATURE header
 *   const signed = await signPayment(result.amount, result.recipient, ...);
 *   const retry = await fetch(url, { headers: { "PAYMENT-SIGNATURE": signed } });
 * } else {
 *   // Policy denied: result.policyCheck.reason (BUDGET_EXCEEDED, etc.)
 *   console.error("Payment rejected:", result.policyCheck.reason);
 * }
 * ```
 */

import type { Address } from "viem";
import type { Chain } from "viem";
import { intercept402Response } from "./interceptor.js";
import type { PolicyCheckResult } from "./interceptor.js";

export type FetchWithPolicyResult =
  | { status: "ok"; response: Response }
  | {
      status: "payment_required";
      response: Response;
      policyCheck: PolicyCheckResult;
      amount: bigint;
      recipient: Address;
      headers: Headers;
    };

/**
 * Fetch with x402 policy check. Intercepts 402 responses and validates payment
 * against AEP account policy before the agent signs.
 *
 * @param accountAddress - AEP account address
 * @param input - URL or Request
 * @param init - Fetch init (headers, method, etc.)
 * @param config - RPC URL and optional chain for policy check
 * @param recipientOverride - If Payment-To header is missing, use this address
 */
export async function fetchWithPolicyCheck(
  accountAddress: Address,
  input: RequestInfo | URL,
  init?: RequestInit,
  config?: { rpcUrl: string; chain?: Chain },
  recipientOverride?: Address
): Promise<FetchWithPolicyResult> {
  const response = await fetch(input, init);

  if (response.status !== 402) {
    return { status: "ok", response };
  }

  if (!config?.rpcUrl) {
    return {
      status: "payment_required",
      response,
      policyCheck: { allowed: false, reason: "UNKNOWN" },
      amount: 0n,
      recipient: "0x0000000000000000000000000000000000000000" as Address,
      headers: response.headers,
    };
  }

  const policyCheck = await intercept402Response(
    accountAddress,
    response.headers,
    recipientOverride,
    config
  );

  const paymentAmount = response.headers.get("Payment-Amount") ?? response.headers.get("payment-amount");
  const amountMatch = paymentAmount?.match(/amount\s*=\s*([\d.]+)/i);
  const amount = amountMatch ? BigInt(Math.round(parseFloat(amountMatch[1]) * 1e6)) : 0n;

  const paymentTo = response.headers.get("Payment-To") ?? response.headers.get("payment-to");
  const recipient = (recipientOverride ??
    (paymentTo && paymentTo.trim().startsWith("0x") ? paymentTo.trim() : "0x0000000000000000000000000000000000000000")) as Address;

  return {
    status: "payment_required",
    response,
    policyCheck,
    amount,
    recipient,
    headers: response.headers,
  };
}
