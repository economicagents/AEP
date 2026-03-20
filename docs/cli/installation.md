# CLI Installation

Install and configure the AEP CLI for account deployment, policy management, and operations.

## Install

```bash
pnpm add -g @economicagents/cli
```

From monorepo: `cd packages/cli && pnpm run build` then add `dist/cli.js` to PATH or run via `node dist/cli.js`.

## Configuration

Config file: `~/.aep/config.json`. Override path: `AEP_CONFIG_PATH`. Chain override: `AEP_CHAIN_ID`.

### Required Keys (after deploy)

| Key | Description |
|-----|-------------|
| `factoryAddress` | AEPAccountFactory address |
| `rpcUrl` | RPC URL (e.g. https://sepolia.base.org) |
| `account` | Deployed AEP account address |
| `owner` | Owner address (set on deploy) |

### Optional Keys

| Key | Description |
|-----|-------------|
| `bundlerRpcUrl` | For `aep execute` (UserOp submission) |
| `indexPath` | Provider index path (default: ~/.aep/index) |
| `identityRegistryAddress` | ERC-8004 IdentityRegistry |
| `reputationRegistryAddress` | ERC-8004 ReputationRegistry |
| `creditFacilityFactoryAddress` | Credit facility factory |
| `escrowFactoryAddress` | Conditional escrow factory |
| `revenueSplitterFactoryAddress` | Revenue splitter factory |
| `slaFactoryAddress` | SLA contract factory |
| `monitor` | On-chain monitor config |
| `fleets` | Fleet definitions |

### Validate Config

```bash
aep config validate
```

## Environment Variables

| Variable | Description |
|---------|-------------|
| `AEP_KEYSTORE_ACCOUNT` | Foundry keystore account (preferred; run `cast wallet import aep --interactive`) |
| `FOUNDRY_PASSWORD` | Keystore password (for non-interactive use) |
| `PRIVATE_KEY` | Private key fallback (insecure; emits warning) |
| `AEP_CONFIG_PATH` | Override config file path |
| `AEP_CHAIN_ID` | Chain ID (84532 Base Sepolia, 8453 Base) |
| `AEP_RPC_URL` | Override RPC URL |

## Next Steps

- [Commands Reference](cli/commands) — Full command list
- [Quick Start](getting-started/quickstart) — Deploy your first account
