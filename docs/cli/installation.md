# CLI Installation

Install and configure the AEP CLI for account deployment, policy management, and UserOp execution.

## Install (npm / npx)

**Registry version:** `@economicagents/cli` **0.2.0** on npm (August 2026). This repo's `main` is **0.3.0** — use `@0.2.0` for the current registry, or `@latest` after publish.

### Run without installing

```bash
npx @economicagents/cli@0.2.0 --help
npx @economicagents/cli@0.2.0 deploy --help
```

### Global install

```bash
npm install -g @economicagents/cli@0.2.0
# then: aep --help
```

### From monorepo (contributors)

```bash
cd packages/cli && pnpm run build
node dist/cli.js --help
```

## Quick start

See [Getting started — Quick start](getting-started/quickstart) — deploy against the published factory with `npx`, no Foundry clone required.

## Configuration

Config file: `~/.aep/config.json`. Override path: `AEP_CONFIG_PATH`. Chain override: `AEP_CHAIN_ID`.

### Required keys (after deploy)

| Key | Description |
|-----|-------------|
| `factoryAddress` | AEPAccountFactory address |
| `rpcUrl` | RPC URL (e.g. https://sepolia.base.org) |
| `account` | Deployed AEP account address |
| `owner` | Owner address (set on deploy) |

### Optional keys

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

### Validate config

```bash
npx @economicagents/cli@0.2.0 config validate
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `AEP_KEYSTORE_ACCOUNT` | Foundry keystore account (preferred; run `cast wallet import aep --interactive`) |
| `FOUNDRY_PASSWORD` | Keystore password (for non-interactive use) |
| `PRIVATE_KEY` | Private key fallback (insecure; emits warning) |
| `AEP_CONFIG_PATH` | Override config file path |
| `AEP_CHAIN_ID` | Chain ID (84532 Base Sepolia, 8453 Base) |
| `AEP_RPC_URL` | Override RPC URL |

## Next steps

- [Commands reference](cli/commands) — Full command list
- [Quick start](getting-started/quickstart) — Deploy your first account
