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
import { interceptPayment, fetchWithPolicyCheck } from "@economicagents/sdk";

// Check before signing
const result = await interceptPayment(accountAddress, amount, recipient, { rpcUrl });

// Fetch with policy check (for x402 endpoints)
const { response, policyCheck } = await fetchWithPolicyCheck(url, { accountAddress, rpcUrl });
```
