# @aep/benchmark

Benchmark harness comparing AEP-resolved vs naive x402 procurement (cost, latency, quality).

## Install

```bash
pnpm add @aep/benchmark
```

From monorepo: `cd packages/benchmark && pnpm run build`.

## Usage

```bash
cd packages/benchmark && pnpm run benchmark
```

Or: `node dist/run.js` after build.

Requires synced index: `aep-index sync` or `cd packages/indexer && node dist/cli.js sync`. See [indexer README](../indexer/README.md) and [resolver README](../resolver/README.md).

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Cookbook](../../docs/COOKBOOK.md) — Intent resolution
- [Indexer](../indexer/README.md) — Provider index setup
