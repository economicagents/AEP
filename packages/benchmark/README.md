# @economicagents/benchmark

Optional harness to compare **AEP-guided** vs **naive** x402 procurement (cost, latency, quality). Useful for research and regression checks when you run a local index and resolver.

## Install

```bash
pnpm add @economicagents/benchmark
```

**From a local clone** of [economicagents/AEP](https://github.com/economicagents/AEP): `cd packages/benchmark && pnpm run build`.

## Usage

```bash
cd packages/benchmark && pnpm run benchmark
```

Or after build: `node dist/run.js`.

Requires a synced index (`aep-index sync` or `packages/indexer` CLI). See [@economicagents/indexer](https://github.com/economicagents/AEP/blob/main/packages/indexer/README.md) and [@economicagents/resolver](https://github.com/economicagents/AEP/blob/main/packages/resolver/README.md).

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [Cookbook](https://github.com/economicagents/AEP/blob/main/docs/COOKBOOK.md) — Intent resolution
