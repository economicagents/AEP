# @economicagents/cli

Command-line interface for the Agent Economic Protocol (AEP).

## Install

```bash
pnpm add -g @economicagents/cli
```

From monorepo: `cd packages/cli && pnpm run build` then add `dist/cli.js` to PATH or run via `node dist/cli.js`.

## Configuration

Config: `~/.aep/config.json`. Override: `AEP_CONFIG_PATH`, `AEP_CHAIN_ID`.

Required keys: `factoryAddress`, `rpcUrl`, `account` (after deploy). Optional: `bundlerRpcUrl`, `indexPath`, `identityRegistryAddress`, `reputationRegistryAddress`, relationship factory addresses, `monitor`, `fleets`.

## Commands

| Command | Description |
|---------|-------------|
| `aep deploy` | Deploy a new AEP account |
| `aep address` | Get predicted account address |
| `aep config validate` | Validate ~/.aep/config.json |
| `aep balance` | Get account deposit (EntryPoint balance) |
| `aep check-policy` | Check if payment would pass policy (x402) |
| `aep freeze` | Freeze account (blocks all operations) |
| `aep unfreeze` | Unfreeze account |
| `aep modules` | List policy module addresses |
| `aep policy-get` | Get BudgetPolicy state (caps and spend) |
| `aep policy-set` | Set BudgetPolicy caps (owner only) |
| `aep rate-limit` | RateLimitPolicy configuration |
| `aep counterparty` | CounterpartyPolicy (allowlist, blocklist, min-reputation) |
| `aep execute` | Build, sign, submit UserOp via bundler |
| `aep resolve` | Resolve intent to execution plan |
| `aep graph sync` | Sync economic graph to SQLite |
| `aep analytics` | Account analytics |
| `aep credit-score` | Credit score for account |
| `aep recommendations` | Provider recommendations |
| `aep fleet list/summary/alerts/freeze` | Fleet management |
| `aep monitor` | On-chain event monitoring |
| `aep credit/escrow/splitter/sla` | Economic relationship commands |
| `aep provider probe` | Probe provider x402 endpoint |

## Usage

```bash
aep deploy --factory 0x...
aep policy-set -m <module> --max-per-tx 1000000 --max-daily 5000000
aep check-policy -a 500000 -t 0xRecipient
aep resolve '{"capability":"...","maxTotal":"1000000"}'
aep fleet list
aep monitor
```

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Cookbook](../../docs/COOKBOOK.md) — Quick reference, policies
- [Deployment](../../docs/guides/deployment.md) — Full deployment guide
