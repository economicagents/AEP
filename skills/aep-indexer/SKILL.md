---
name: aep-indexer
description: AEP provider index: sync ERC-8004 providers, BM25 and vector search for intent resolution. Use when setting up intent resolution, syncing index, provider crawl, capability search, running aep-index sync/embed, or probing provider x402 endpoints.
compatibility: Requires Node.js. Run from packages/indexer or install @economicagents/indexer. Optional better-sqlite3, sqlite-vec for vector search.
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

## Embed (vector search)

```bash
node dist/cli.js embed [--index-path <path>]
```

Adds vector embeddings for hybrid BM25 + vector search.

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

Optional: `better-sqlite3` (v12+), `sqlite-vec`. Falls back to legacy keyword discovery if unavailable.

## Install Note

From monorepo: run `node dist/cli.js` from packages/indexer. With `pnpm add -g @economicagents/indexer`, the `aep-index` bin is available. The `aep provider probe` command comes from `@economicagents/cli` (separate package).

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-intent-resolution](../aep-intent-resolution/SKILL.md)
