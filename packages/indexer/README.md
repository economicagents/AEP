# @economicagents/indexer

Provider discovery for AEP intent resolution: crawl ERC-8004 registries, index capabilities and pricing, optional BM25 / vector search.

## Install

```bash
pnpm add @economicagents/indexer
```

The **`aep-index`** CLI is available when installed globally or via `pnpm exec`.

**From a local clone** of [economicagents/AEP](https://github.com/economicagents/AEP): `cd packages/indexer && pnpm run build`.

## Usage

```bash
# When package is on PATH
aep-index sync [--rpc <url>] [--probe-x402]
aep-index embed

# From packages/indexer after build
node dist/cli.js sync [--probe-x402]
node dist/cli.js embed
```

Default index path: `~/.aep/index/`. Consumed by `@economicagents/resolver`, REST `POST /resolve`, MCP `resolve_intent`, and `aep resolve`.

## Configuration

- **RPC:** `--rpc <url>` or `RPC_URL` env
- **Chain:** `AEP_CHAIN_ID` (default: 84532 Base Sepolia)
- **Config:** `~/.aep/config.json` (`indexPath` overrides default location)

## Dependencies

Optional: `better-sqlite3` (v12+), `sqlite-vec`. Without them, discovery falls back to legacy keyword search.

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [Cookbook](https://github.com/economicagents/AEP/blob/main/docs/COOKBOOK.md) — Intent resolution setup
- [Deployment](https://github.com/economicagents/AEP/blob/main/docs/guides/deployment.md) — Index after deploy
