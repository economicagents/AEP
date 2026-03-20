# @economicagents/sdk

TypeScript SDK for the Agent Economic Protocol (AEP). Account deployment, policy management, x402 interception, and UserOp execution.

## Install

```bash
pnpm add @economicagents/sdk
```

From monorepo: used via `file:../sdk` in other packages.

## Usage

```typescript
import {
  createAccount,
  getBudgetPolicyState,
  setBudgetCaps,
  checkPolicyDetailed,
  interceptPayment,
  execute,
  baseSepolia,
  ERC8004_BASE_SEPOLIA,
} from "@economicagents/sdk";

// Deploy account
const { accountAddress } = await createAccount({ factoryAddress, owner, rpcUrl });

// Configure policies
await setBudgetCaps(accountAddress, moduleAddress, { maxPerTx, maxDaily, maxWeekly }, { rpcUrl });

// Check policy (x402 flow)
const result = await checkPolicyDetailed(accountAddress, amount, recipient, { rpcUrl });

// Execute UserOp via bundler
await execute({ accountAddress, calls, bundlerRpcUrl, ... });
```

## Configuration

- **RPC:** `rpcUrl` or `RPC_URL` env
- **Chain:** `baseSepolia` (84532), `base` (8453); override via `AEP_CHAIN_ID`
- **Config file:** `~/.aep/config.json` (override: `AEP_CONFIG_PATH`)

## Dependencies

- `viem` — Ethereum RPC and encoding
- `@economicagents/graph` — Credit scoring, analytics (optional for graph features)
- `zod` — Intent schema validation

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Cookbook](../../docs/COOKBOOK.md) — Policies, deployment, x402
- [Architecture](../../docs/ARCHITECTURE.md) — Contract hierarchy, validateUserOp flow
