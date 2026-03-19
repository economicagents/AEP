# @aep/resolver

Intent resolution engine for AEP. Discovers providers (from index), filters by capability and reputation, scores, and plans execution. Supports multi-step decomposition and max_total enforcement.

## Install

```bash
pnpm add @aep/resolver
```

From monorepo: `cd packages/resolver && pnpm run build`.

## Usage

Used by CLI `aep resolve`, MCP `resolve_intent`, and REST API POST /resolve.

```typescript
import { resolveIntent } from "@aep/resolver";

const plan = await resolveIntent(intent, {
  indexPath,
  graphPath,
  accountAddress,
});
```

## Configuration

- **Index:** `indexPath` — path to provider index (`~/.aep/index/` default)
- **Graph:** `graphPath` — path to graph.db for recommendation boost
- **Account:** `accountAddress` — for personalized provider ranking

## Dependencies

- `@aep/graph` — Credit scoring, recommendations
- `@aep/indexer` — Provider index (searchByCapability)
- `@aep/sdk` — Intent schema, config

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Cookbook](../../docs/COOKBOOK.md) — Intent resolution
- [API Reference](../../docs/api.md) — REST endpoints
