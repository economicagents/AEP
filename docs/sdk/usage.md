# SDK Usage

Common usage patterns for the AEP SDK.

## Deploy Account

```typescript
import { createAccount, baseSepolia } from "@economicagents/sdk";

const { accountAddress, txHash } = await createAccount({
  owner: "0x...",
  privateKey: "0x...",
  factoryAddress: "0x...",
  rpcUrl: "https://sepolia.base.org",
  chain: baseSepolia,
});
```

## Configure Policies

```typescript
import { setBudgetCaps, getBudgetPolicyState } from "@economicagents/sdk";

// Get current state
const state = await getBudgetPolicyState(accountAddress, moduleAddress, { rpcUrl });

// Set caps
await setBudgetCaps(
  accountAddress,
  moduleAddress,
  { maxPerTx: 1000000n, maxDaily: 5000000n, maxWeekly: 20000000n },
  { rpcUrl, privateKey }
);
```

## Check Policy (x402 Flow)

```typescript
import { checkPolicyDetailed } from "@economicagents/sdk";

const result = await checkPolicyDetailed(
  accountAddress,
  500000n,
  "0xRecipient",
  { rpcUrl }
);

if (result.allowed) {
  // Proceed with payment
} else {
  // result.reason: BUDGET_EXCEEDED, COUNTERPARTY_BLOCKED, etc.
}
```

## Execute UserOp

```typescript
import { execute } from "@economicagents/sdk";

await execute({
  accountAddress,
  calls: [{ to: "0x...", value: 1000000n, data: "0x" }],
  bundlerRpcUrl: "https://...",
  privateKey: "0x...",
});
```

## Economic Relationships

```typescript
import {
  createCreditFacility,
  getCreditFacilityState,
  createEscrow,
  getEscrowState,
} from "@economicagents/sdk";

// Credit facility
const facility = await createCreditFacility({ lender, borrower, limit, ... }, { rpcUrl, privateKey });
const state = await getCreditFacilityState(facilityAddress, { rpcUrl });

// Escrow
const escrow = await createEscrow({ provider, consumer, amount, ... }, { rpcUrl, privateKey });
const escrowState = await getEscrowState(escrowAddress, { rpcUrl });
```

## Intent Parsing

```typescript
import { parseIntent, IntentSchema } from "@economicagents/sdk";

const intent = parseIntent({
  capability: "image-generation",
  budget: { max_per_unit: "0.01", max_total: "1.00" },
});
```

## x402 Interceptor

```typescript
import { interceptPayment, intercept402Response, fetchWithPolicyCheck } from "@economicagents/sdk";

const ok = await interceptPayment(accountAddress, amount, recipient, { rpcUrl, chain });

const res = await fetch(url, init);
if (res.status === 402) {
  const policy = await intercept402Response(accountAddress, res.headers, undefined, { rpcUrl, chain });
}

const outcome = await fetchWithPolicyCheck(accountAddress, url, init, { rpcUrl, chain });
```

## MPP (Tempo session) policy pre-check

Use before paying with an [`mppx`](https://mpp.dev/sdk/typescript) client on MPP/Tempo endpoints. Policy is evaluated on **Base** against the AEP account; payment settles on **Tempo**.

```typescript
import { interceptMpp402Response, fetchWithMppPolicyCheck } from "@economicagents/sdk";

const res = await fetch(url, init);
if (res.status === 402) {
  const gate = await interceptMpp402Response(accountAddress, res, { rpcUrl, chain });
  if (gate.handled && !gate.policyCheck.allowed) {
    console.error(gate.policyCheck.reason);
  }
}

const pre = await fetchWithMppPolicyCheck(accountAddress, url, init, { rpcUrl, chain });
if (pre.status === "payment_required" && pre.policyCheck.allowed) {
  /* use mppx client fetch to complete payment and retry */
}
```
