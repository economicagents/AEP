---
name: aep-x402
description: x402 payment interception with AEP policy check. Use when making requests to x402-protected HTTP endpoints—check policy before signing the payment. Returns structured rejection reasons (BUDGET_EXCEEDED, COUNTERPARTY_BLOCKED, etc.) so the agent can adapt. Do NOT use for non-x402 HTTP requests.
compatibility: Requires aep CLI. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "💳"
    requires:
      bins: ["aep"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["aep-cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP x402

## When to Use

- User is making requests to x402-protected HTTP endpoints
- User needs to check policy before signing a payment
- User receives 402 Payment Required and needs to validate against AEP
- User asks about x402 flow, payment interception, or rejection reasons

Intercept x402 "Payment Required" responses and validate payments against AEP account policy before signing. Prevents agents from signing payments that would fail on-chain.

## x402 Flow

1. Client requests resource → server returns 402 with `Payment-Amount` and `Payment-To`
2. **AEP intercept:** Check policy before signing
3. If allowed → sign payment, retry with `PAYMENT-SIGNATURE` header
4. If denied → return reason to agent (find alternative, request human approval)

## Quick Start

### Option A: Manual Intercept

```typescript
import { intercept402Response } from "@aep/sdk";

const response = await fetch("https://api.example.com/paid-endpoint");
if (response.status === 402) {
  const result = await intercept402Response(
    accountAddress,
    response.headers,
    undefined,
    { rpcUrl }
  );
  if (!result.allowed) {
    console.error("Rejected:", result.reason); // BUDGET_EXCEEDED, COUNTERPARTY_BLOCKED, etc.
    return;
  }
  // Sign and retry
}
```

### Option B: fetchWithPolicyCheck Wrapper

```typescript
import { fetchWithPolicyCheck } from "@aep/sdk";

const result = await fetchWithPolicyCheck(
  accountAddress,
  "https://api.example.com/paid-endpoint",
  undefined,
  { rpcUrl }
);

if (result.status === "payment_required") {
  if (result.policyCheck.allowed) {
    // Sign payment, retry with PAYMENT-SIGNATURE
  } else {
    console.error("Rejected:", result.policyCheck.reason);
  }
} else {
  const data = await result.response.json();
  // Use data
}
```

## Rejection Reasons

| Reason | Meaning |
|--------|---------|
| BUDGET_EXCEEDED | Would exceed per-tx, daily, weekly, or per-task cap |
| COUNTERPARTY_BLOCKED | Recipient on block list or not on allow list |
| REPUTATION_TOO_LOW | Recipient's ERC-8004 reputation below minimum |
| RATE_LIMIT | Would exceed transaction rate limit |
| UNKNOWN | Policy check failed for other reason |

## Troubleshooting

**Policy check returns BUDGET_EXCEEDED**

Cause: Payment amount would exceed one of the budget caps (per-tx, daily, weekly, or per-task).

Solution: Increase caps via `aep policy-set` (owner only), or reduce payment amount. Check current spend with `aep policy-get -m <module>`.

**Policy check returns COUNTERPARTY_BLOCKED**

Cause: Recipient is on block list, or allow list is enabled and recipient is not on it.

Solution: Remove from block list (`aep counterparty remove-block`) or add to allow list (`aep counterparty add-allow`). See [aep-counterparty](../aep-counterparty/SKILL.md).

**Policy check returns REPUTATION_TOO_LOW**

Cause: Recipient's ERC-8004 reputation is below the account's minimum threshold.

Solution: Lower min-reputation via `aep counterparty set-min-reputation`, or add recipient to verified agents. Ensure IdentityRegistry and ReputationRegistry are set.

**402 response but no Payment-Amount header**

Cause: Server returned 402 without x402-compliant headers.

Solution: Endpoint may not support x402. Use standard fetch for non-x402 endpoints. Verify server returns `Payment-Amount` and `Payment-To` headers.

## Links

- [x402 Protocol](https://x402.gitbook.io/x402/core-concepts/http-402)
- [Cookbook](../../docs/COOKBOOK.md)
