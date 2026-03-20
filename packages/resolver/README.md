# @economicagents/resolver

Intent resolution for AEP: discover providers from the index, filter by capability and reputation, score, plan execution (including multi-step decomposition and `max_total`).

## Install

```bash
pnpm add @economicagents/resolver
```

**From a local clone** of [economicagents/AEP](https://github.com/economicagents/AEP): `cd packages/resolver && pnpm run build`.

## Usage

Used by `aep resolve`, MCP `resolve_intent`, and REST `POST /resolve` when those entrypoints run locally.

```typescript
import { resolveIntent } from "@economicagents/resolver";

const plan = await resolveIntent(intent, {
  indexPath,
  graphPath,
  accountAddress,
});
```

## Configuration

- **Index:** `indexPath` — provider index directory (default `~/.aep/index/`)
- **Graph:** `graphPath` — `graph.db` for recommendation boost
- **Account:** `accountAddress` — personalized ranking when set

## Dependencies

- `@economicagents/graph` — Credit scoring, recommendations
- `@economicagents/indexer` — Index search APIs
- `@economicagents/sdk` — Intent schema, config helpers

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [Cookbook](https://github.com/economicagents/AEP/blob/main/docs/COOKBOOK.md) — Intent resolution
- [API reference](https://github.com/economicagents/AEP/blob/main/docs/api.md)
