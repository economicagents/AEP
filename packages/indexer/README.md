# @economicagents/indexer

Provider discovery index for AEP intent resolution. Crawls ERC-8004 registries, indexes capabilities and pricing. Enables BM25 and optional vector search.

## Install

```bash
pnpm add @economicagents/indexer
```

From monorepo: `cd packages/indexer && pnpm run build`.

## Usage

```bash
# Via CLI (when installed)
aep-index sync [--rpc <url>] [--probe-x402]
aep-index embed

# From monorepo
cd packages/indexer && node dist/cli.js sync [--probe-x402]
node dist/cli.js embed
```

Index stored at `~/.aep/index/` by default. Used by the resolver and CLI `aep resolve`.

## Configuration

- **RPC:** `--rpc <url>` or `RPC_URL` env
- **Chain:** `AEP_CHAIN_ID` (default: 84532 Base Sepolia)
- **Config:** `~/.aep/config.json` (`indexPath` for custom index location)

## Dependencies

Optional: `better-sqlite3` (v12+), `sqlite-vec`. Falls back to legacy keyword discovery if unavailable.

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Cookbook](../../docs/COOKBOOK.md) — Intent resolution setup
- [Deployment](../../docs/deployment.md) — Provider index post-deploy
