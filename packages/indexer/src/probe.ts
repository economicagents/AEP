/**
 * Optional x402 endpoint probe - fetches Payment-Amount and measures latency.
 * Tracks success/fail for uptime and error rate.
 */

import { parsePaymentAmount } from "@economicagents/sdk";

export interface ProbeResult {
  success: boolean;
  price?: bigint;
  latencyMs?: number;
  paymentTo?: string;
}

/**
 * Probe an x402 endpoint: GET request, expect 402, parse Payment-Amount and Payment-To.
 * Success = 402 response with parseable Payment-Amount; fail = timeout, error, or non-402.
 */
export async function probeX402Endpoint(url: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });

    const latencyMs = Date.now() - start;

    const paymentAmount = res.headers.get("Payment-Amount") ?? res.headers.get("payment-amount");
    const price = parsePaymentAmount(paymentAmount);
    const paymentTo = res.headers.get("Payment-To") ?? res.headers.get("payment-to");
    const paymentToTrimmed = paymentTo?.trim().startsWith("0x") ? paymentTo.trim() : undefined;

    const success = res.status === 402 && price != null;

    return {
      success,
      price: price ?? undefined,
      latencyMs,
      paymentTo: paymentToTrimmed,
    };
  } catch {
    return {
      success: false,
      latencyMs: Date.now() - start,
    };
  }
}
