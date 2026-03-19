# SDK Installation

Install the AEP TypeScript SDK for account deployment, policy management, x402 interception, and UserOp execution.

## Install

```bash
pnpm add @aep/sdk
```

From monorepo: use `file:../sdk` in other packages.

## Configuration

- **RPC:** `rpcUrl` or `RPC_URL` env
- **Chain:** `baseSepolia` (84532), `base` (8453); override via `AEP_CHAIN_ID`
- **Config file:** `~/.aep/config.json` (override: `AEP_CONFIG_PATH`)

## Dependencies

- `viem` — Ethereum RPC and encoding
- `@aep/graph` — Credit scoring, analytics (optional for graph features)
- `zod` — Intent schema validation

## Next Steps

- [Usage](sdk/usage) — Usage patterns and examples
- [API Reference](sdk/api) — Exported functions and types
