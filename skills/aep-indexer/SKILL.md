---
name: aep-indexer
description: AEP provider index: sync ERC-8004 providers, BM25 and vector search for intent resolution. Use when setting up intent resolution, syncing index, provider crawl, capability search, running aep-index sync/embed, or probing provider x402 endpoints.
compatibility: Requires Node.js. Run from packages/indexer or install @economicagents/indexer. Optional SQLite (better-sqlite3) or PostgreSQL + pgvector via AEP_INDEX_DATABASE_URL / indexDatabaseUrl; OpenAI key for hybrid embeddings.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "📇"
    requires:
      bins: ["aep-index"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["@economicagents/indexer"]
        bins: ["aep-index"]
        label: "Install AEP indexer (pnpm)"
---

# AEP Provider Index

## When to Use

- User needs to sync the ERC-8004 provider index for intent resolution
- User asks about aep-index sync, embed, or search index
- User wants BM25 or vector capability search
- User needs to probe provider x402 endpoint health (`aep provider probe`, POST /probe)

The indexer crawls ERC-8004 registries, indexes provider capabilities and pricing. Required for `aep resolve` and MCP `resolve_intent`.

## Sync

```bash
cd packages/indexer && pnpm run build
node dist/cli.js sync [--rpc <url>] [--index-path <path>] [--probe-x402]
```

Index stored at `~/.aep/index/` by default.

## Migrate (PostgreSQL only)

```bash
node dist/cli.js migrate
```

Requires `AEP_INDEX_DATABASE_URL` or `indexDatabaseUrl` in `~/.aep/config.json`. Run once before sync when using Postgres + pgvector.

## Embed (vectors + FTS)

```bash
node dist/cli.js embed [--index-path <path>]
```

With **PostgreSQL**: fills `OPENAI_API_KEY` embeddings for hybrid lexical + vector search. With **SQLite only**: rebuilds FTS5 (`search.db`).

## Provider Probe

On-demand probe of provider x402 endpoints. Validates endpoint, measures latency, records price. Use when checking provider health before or after indexing.

**CLI (aep):**
```bash
aep provider probe https://api.example.com/x402
aep provider probe --agent-id 42   # Lookup URL from index
```

**API:** `POST /probe` (single URL), `POST /probe/batch` (max 50 URLs). See packages/api.

Index sync with `--probe-x402` probes providers during crawl and updates uptime/error tracking.

## Dependencies

- **Default:** optional `better-sqlite3` (v12+). Without DB URL and without SQLite, legacy keyword discovery.
- **Postgres path:** `pg` (bundled), pgvector-enabled server, `OPENAI_API_KEY` for hybrid search.

## Install note

- **npm:** `pnpm add -g @economicagents/indexer` exposes the **`aep-index`** binary.
- **Local clone:** `packages/indexer` → `pnpm run build`, then `node dist/cli.js sync …`.
- **Provider probe:** `aep provider probe` lives in **`@economicagents/cli`**, not the indexer package.

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-intent-resolution](../aep-intent-resolution/SKILL.md)
