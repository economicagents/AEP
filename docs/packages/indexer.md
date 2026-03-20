# Indexer

Provider index for intent resolution. Crawls ERC-8004, probes x402 endpoints, and supports BM25/vector search.

## Sync

```bash
cd packages/indexer && pnpm run build && node dist/cli.js sync --probe-x402
```

Or with `aep-index` installed: `aep-index sync --probe-x402`.

Index stored at `~/.aep/index/` (or `indexPath` in config).

## Embed

For hybrid search (BM25 + vector):

```bash
node dist/cli.js embed
```

Requires `sqlite-vec` and `better-sqlite3`. If unavailable, resolver uses legacy synonym expansion.

## Config

- `indexPath` in `~/.aep/config.json` — override index path

## Usage

The resolver uses the index for `searchByCapability` when available. Run sync before `aep resolve` or `POST /resolve`.
