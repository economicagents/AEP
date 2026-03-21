# @economicagents/indexer

Provider discovery for AEP intent resolution: crawl ERC-8004 registries, index capabilities and pricing, optional **SQLite FTS5** or **PostgreSQL + pgvector** hybrid search.

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
aep-index migrate   # when using PostgreSQL (see below)

# From packages/indexer after build
node dist/cli.js sync [--probe-x402]
node dist/cli.js embed
node dist/cli.js migrate
```

Default index path: `~/.aep/index/`. Consumed by `@economicagents/resolver`, REST `POST /resolve`, MCP `resolve_intent`, and `aep resolve`.

## PostgreSQL + pgvector (optional)

For hosted or high-scale search, run Postgres with the **pgvector** extension (see `docker/docker-compose.yml`).

1. Set **`AEP_INDEX_DATABASE_URL`** (or **`indexDatabaseUrl`** in `~/.aep/config.json`).
2. Run **`aep-index migrate`** once to apply SQL migrations from `migrations/`.
3. Run **`aep-index sync`** then **`aep-index embed`**.
4. Set **`OPENAI_API_KEY`** for embeddings (`embed`) and for **hybrid** lexical + vector search at query time. Without the key, search uses **lexical** (`tsvector`) only.

Optional: **`AEP_EMBEDDING_MODEL`** (default `text-embedding-3-small`), **`AEP_INDEX_DATASET_ID`** (override dataset namespace).

## Operations

- **Embedding dimension:** `migrations/002_provider_search.sql` defines `vector(1536)` to match `text-embedding-3-small` (see `EMBEDDING_DIMENSIONS` in `src/embeddings.ts`). Switching to a model with a different output width requires a **new SQL migration** (or schema change), not only `AEP_EMBEDDING_MODEL`.
- **Connection pool:** The CLI exits after each command, so the `pg` pool is released with the process. Long-lived services that import this package and set `AEP_INDEX_DATABASE_URL` should call **`closePgPool()`** when shutting down (e.g. graceful shutdown) to avoid holding connections open indefinitely.
- **Stale rows:** Each `sync` rebuilds `provider_search` for the current provider set and **deletes** rows for that dataset whose `agent_id` is no longer present, so removed agents do not linger in Postgres.

## Configuration

- **RPC:** `--rpc <url>` or config / `AEP_RPC_URL`
- **Chain:** `AEP_CHAIN_ID` (default: 84532 Base Sepolia)
- **Config:** `~/.aep/config.json` (`indexPath` overrides default index directory)
- **DB:** `AEP_INDEX_DATABASE_URL` or `indexDatabaseUrl` in config

## Dependencies

- **PostgreSQL:** runtime dependency `pg` when using the DB URL (migrations ship in the published package under `migrations/`).
- **SQLite path:** optional `better-sqlite3` (v12+), `sqlite-vec`. Without them when no DB URL is set, discovery falls back to legacy keyword search.

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [Cookbook](https://github.com/economicagents/AEP/blob/main/docs/COOKBOOK.md) — Intent resolution setup
- [Deployment](https://github.com/economicagents/AEP/blob/main/docs/guides/deployment.md) — Index after deploy
