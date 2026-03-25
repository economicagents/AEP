/**
 * MPP fetch wrapper with AEP policy pre-check (Base RPC).
 *
 * Performs an initial fetch; on MPP 402 with a Tempo session challenge, evaluates
 * policy before the caller uses `mppx` client `fetch` to pay and retry.
 */

import type { Address } from "viem";
import type { Chain } from "viem";
import type { PolicyCheckResult } from "../x402/interceptor.js";
import type { TempoSessionPolicyInputs } from "./interceptor.js";
import { interceptMpp402Response } from "./interceptor.js";

export type FetchWithMppPolicyResult =
  | { status: "ok"; response: Response }
  | {
      status: "payment_required";
      response: Response;
      policyCheck: PolicyCheckResult;
      mpp: TempoSessionPolicyInputs;
      headers: Headers;
    };

/**
 * Fetch once and, if MPP Tempo session 402, run `checkPolicy`-equivalent pre-flight.
 */
export async function fetchWithMppPolicyCheck(
  accountAddress: Address,
  input: RequestInfo | URL,
  init?: RequestInit,
  config?: { rpcUrl: string; chain?: Chain }
): Promise<FetchWithMppPolicyResult> {
  const response = await fetch(input, init);

  if (response.status !== 402) {
    return { status: "ok", response };
  }

  const intercepted = await interceptMpp402Response(accountAddress, response, config);

  if (!intercepted.handled) {
    return {
      status: "payment_required",
      response,
      policyCheck: { allowed: false, reason: "UNKNOWN" },
      mpp: {
        amount: 0n,
        recipient: "0x0000000000000000000000000000000000000000" as Address,
        decimals: 6,
      },
      headers: response.headers,
    };
  }

  return {
    status: "payment_required",
    response,
    policyCheck: intercepted.policyCheck,
    mpp: intercepted.inputs,
    headers: response.headers,
  };
}
