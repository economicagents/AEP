---
name: aep-intent-resolution
description: AEP intent resolution: match intents to providers via index, resolver, MCP, CLI, REST API. Use when resolving agent intents to execution plans, syncing provider index, or using aep resolve. Do NOT use for deploying or configuring indexer (use aep-indexer skill instead).
compatibility: Requires synced provider index at ~/.aep/index/. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🎯"
    requires:
      bins: ["aep"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["aep-cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Intent Resolution

## When to Use

- User wants to resolve an intent to an execution plan
- User needs to sync the provider index
- User asks about aep resolve, resolve_intent, or POST /resolve

Intent resolution discovers providers from the ERC-8004 index, filters by capability and reputation, scores, and plans execution.

## Prerequisites

Sync the provider index before using:

```bash
cd packages/indexer && pnpm run build && node dist/cli.js sync --probe-x402
node dist/cli.js embed
```

Index at `~/.aep/index/` by default.

## CLI

```bash
aep resolve '{"capability":"price-feed","maxTotal":"1000000"}'
```

## MCP

Tool: `resolve_intent`. Uses local resolver; no paywall.

## REST API

- `POST /resolve` — Standard tier ($0.005 when x402 paywall enabled)
- `POST /resolve/premium` — Premium tier ($0.02)

Use `aep resolve --api-url <url>` to call managed API.

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-indexer](../aep-indexer/SKILL.md)
- [aep-graph](../aep-graph/SKILL.md)
- [API Reference](../../docs/api.md)
