/**
 * Optional paid-HTTP endpoint probe — x402 headers and/or MPP `WWW-Authenticate: Payment`.
 * Tracks success/fail for uptime and error rate.
 */

import {
  classifyPaywallHeaders,
  parsePaymentAmount,
  tempoSessionProbeFromHeaders,
} from "@economicagents/sdk";

export type ProbePaymentKind = "x402" | "mpp" | "unknown";

export interface ProbeResult {
  success: boolean;
  /** When status is 402, how the paywall advertises itself */
  paymentKind?: ProbePaymentKind;
  price?: bigint;
  latencyMs?: number;
  paymentTo?: string;
}

/**
 * Probe a paid HTTP endpoint (GET): expect 402 with x402 `Payment-Amount` or MPP Payment challenge.
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
    const priceX402 = parsePaymentAmount(paymentAmount);
    const paymentTo = res.headers.get("Payment-To") ?? res.headers.get("payment-to");
    const paymentToTrimmed = paymentTo?.trim().startsWith("0x") ? paymentTo.trim() : undefined;

    const mppHint = res.status === 402 ? tempoSessionProbeFromHeaders(res.headers) : null;
    const price = priceX402 ?? mppHint?.amount;
    const paymentKind: ProbePaymentKind =
      res.status === 402 ? classifyPaywallHeaders(res.headers) : "unknown";
    const paymentToMerged =
      paymentToTrimmed ??
      (mppHint?.recipient && mppHint.recipient.startsWith("0x") ? mppHint.recipient : undefined);

    const success = res.status === 402 && price != null;

    return {
      success,
      paymentKind: res.status === 402 ? paymentKind : undefined,
      price: price ?? undefined,
      latencyMs,
      paymentTo: paymentToMerged,
    };
  } catch {
    return {
      success: false,
      latencyMs: Date.now() - start,
    };
  }
}
