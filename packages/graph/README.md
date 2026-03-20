# @economicagents/graph

Economic graph for AEP: sync on-chain payments and credit events into SQLite (`graph.db`), compute credit scores, and provider recommendations.

## Install

```bash
pnpm add @economicagents/graph
```

**From a local clone** of [economicagents/AEP](https://github.com/economicagents/AEP): `cd packages/graph && pnpm run build`.

## Usage

```bash
# Standalone binary when installed
aep-graph sync

# Via CLI meta-package
aep graph sync
aep analytics <address>
aep credit-score <address>
aep recommendations <address>
```

```typescript
import { computeCreditScore, getRecommendations } from "@economicagents/graph";

const score = computeCreditScore(graphPath, accountAddress);
const recs = getRecommendations(graphPath, providers, accountAddress, capability, limit);
```

The resolver uses `graphPath` + `accountAddress` for recommendation boost.

## Configuration

- **Graph path:** default `~/.aep/graph.db`; override `graphPath` in `~/.aep/config.json`
- **RPC:** `RPC_URL` or config `rpcUrl` for `graph sync`

## Dependencies

Optional native `better-sqlite3` (v12+); tests fall back to `sql.js` when bindings are unavailable.

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [Cookbook](https://github.com/economicagents/AEP/blob/main/docs/COOKBOOK.md) — Fleet, analytics
- [Architecture](https://github.com/economicagents/AEP/blob/main/docs/ARCHITECTURE.md) — Graph role in the stack
