# @economicagents/sdk

TypeScript SDK for the Agent Economic Protocol (AEP): deploy and operate smart accounts, policy modules, x402-safe payments, and UserOp execution.

## Install

```bash
pnpm add @economicagents/sdk
```

**From a local clone** of [economicagents/AEP](https://github.com/economicagents/AEP): this package is built with `pnpm run build` in `packages/sdk`; other workspace packages depend on it via `workspace:*`.

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

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [Cookbook](https://github.com/economicagents/AEP/blob/main/docs/COOKBOOK.md) — Policies, deployment, x402
- [Architecture](https://github.com/economicagents/AEP/blob/main/docs/ARCHITECTURE.md) — Contracts and `validateUserOp`
