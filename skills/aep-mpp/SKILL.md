---
name: aep-mpp
description: MPP (Machine Payments Protocol) / Tempo session payments with AEP policy pre-check on Base. Use for HTTP 402 responses that advertise Payment authentication (Tempo session), before completing payment with mppx client. Complements aep-x402; settlement is on Tempo while policy reads stay on Base.
compatibility: Requires @economicagents/sdk; Tempo RPC and wallet for actual payment via mppx client or aep CLI --api-url.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "⚡"
    requires:
      bins: ["aep"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["@economicagents/sdk", "mppx"]
        label: "Install SDK + mppx (pnpm)"
---

# AEP MPP / Tempo

## When to Use

- Server returns **402** with **`WWW-Authenticate: Payment`** (MPP), often **Tempo session** intent
- You need the same **budget / counterparty / rate-limit** pre-flight as x402, but against **Tempo** settlement
- User mentions **MPP**, **Tempo**, **session vouchers**, or **mppx**

## Flow

1. `fetch` the resource → **402** with MPP challenge(s).
2. **AEP:** `interceptMpp402Response(account, response, { rpcUrl, chain })` or `fetchWithMppPolicyCheck` (Base RPC for policy modules).
3. If denied → surface `BUDGET_EXCEEDED`, `COUNTERPARTY_BLOCKED`, etc.
4. If allowed → complete payment with **`mppx` client** `fetch` (opens channel / vouchers as needed).

CLI: `aep resolve --api-url https://...` follows MPP when `AEP_PAYWALL_BACKEND=mpp` or when the 402 is classified as MPP.

## Quick Start

```typescript
import {
  interceptMpp402Response,
  fetchWithMppPolicyCheck,
  baseSepolia,
} from "@economicagents/sdk";

const rpcUrl = "https://sepolia.base.org";
const res = await fetch("https://api.example.com/resolve", { method: "POST", body: "..." });
if (res.status === 402) {
  const gate = await interceptMpp402Response("0xYourAepAccount" as const, res, { rpcUrl, chain: baseSepolia });
  if (gate.handled && !gate.policyCheck.allowed) {
    console.error(gate.policyCheck.reason);
    return;
  }
}
// Then: Mppx.create({ methods: [tempo({ account, getClient: ... })] }).fetch(url, init)
```

## Links

- [MPP](https://mpp.dev)
- [Tempo payment method](https://mpp.dev/payment-methods/tempo)
- [Sessions](https://mpp.dev/payment-methods/tempo/session)
- [aep-x402](../aep-x402/SKILL.md) — classic x402 headers on Base
