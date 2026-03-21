# Indexer

Provider index for intent resolution. Crawls ERC-8004, probes x402 endpoints, and supports **SQLite FTS5** (default when no DB URL) or **PostgreSQL + pgvector** hybrid search when `AEP_INDEX_DATABASE_URL` (or `indexDatabaseUrl` in `~/.aep/config.json`) is set.

## Sync

```bash
cd packages/indexer && pnpm run build && node dist/cli.js sync --probe-x402
```

Or with `aep-index` installed: `aep-index sync --probe-x402`.

Index data is stored under `~/.aep/index/` (`providers.json` and optional local `search.db`) unless you use PostgreSQL for search rows (see below).

## PostgreSQL + pgvector (optional)

1. Run a pgvector-enabled Postgres (see [`packages/indexer/docker/docker-compose.yml`](https://github.com/economicagents/AEP/blob/main/packages/indexer/docker/docker-compose.yml)).
2. Set **`AEP_INDEX_DATABASE_URL`** or **`indexDatabaseUrl`** in `~/.aep/config.json`.
3. Run **`aep-index migrate`** once.
4. Run **`aep-index sync`**, then **`aep-index embed`**.
5. Set **`OPENAI_API_KEY`** for `embed` and for **hybrid** lexical + vector search at query time. Without the key, search uses **lexical** (`tsvector`) only.

Optional: **`AEP_EMBEDDING_MODEL`** (default `text-embedding-3-small`), **`AEP_INDEX_DATASET_ID`** (namespace for `provider_search` rows).

**Embedding dimension:** The schema fixes vectors at **1536** dimensions (`migrations/002_provider_search.sql`). Changing to a model with a different output dimension requires a **new migration** (or table change), not only an env update.

## Embed (SQLite path)

When **no** database URL is set, `aep-index embed` rebuilds the local SQLite FTS index (requires optional `better-sqlite3`). If SQLite is unavailable, resolver falls back to legacy keyword discovery.

## Config

- `indexPath` in `~/.aep/config.json` — index directory
- `AEP_INDEX_DATABASE_URL` or `indexDatabaseUrl` — PostgreSQL URL for hybrid search
- `OPENAI_API_KEY` — embeddings and query-time hybrid search (Postgres path)

## Usage

The resolver uses the index for `searchByCapability` when available. Run sync before `aep resolve` or `POST /resolve`. Long-running processes that import `@economicagents/indexer` and use Postgres should call **`closePgPool`** from the indexer package on shutdown when the process stays alive across many requests (CLI one-shot commands do not require this).
