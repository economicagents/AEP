# @aep/graph

Economic graph for AEP: payments, credit events, credit scoring, and provider recommendations. Synced to SQLite (`graph.db`).

## Install

```bash
pnpm add @aep/graph
```

From monorepo: `cd packages/graph && pnpm run build`.

## Usage

```bash
# Via CLI (when installed)
aep-graph sync

# Via aep-cli (includes graph)
aep graph sync
aep analytics <address>
aep credit-score <address>
aep recommendations <address>
```

```typescript
import { computeCreditScore, getRecommendations } from "@aep/graph";

const score = computeCreditScore(graphPath, accountAddress);
const recs = getRecommendations(graphPath, providers, accountAddress, capability, limit);
```

Used by the resolver for recommendation boost (`accountAddress` + `graphPath`).

## Configuration

- **Graph path:** `~/.aep/graph.db` by default; override via `graphPath` in config
- **RPC:** Required for sync; `RPC_URL` or config `rpcUrl`
- **Config:** `~/.aep/config.json`

## Dependencies

Optional: `better-sqlite3` (v12+). Tests fall back to `sql.js` when native bindings unavailable.

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Cookbook](../../docs/COOKBOOK.md) — Fleet, analytics
- [Architecture](../../docs/ARCHITECTURE.md) — Graph schema
