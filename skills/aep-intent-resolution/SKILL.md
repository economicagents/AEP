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
        packages: ["@economicagents/cli"]
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
# With @economicagents/indexer installed (aep-index on PATH):
aep-index sync --probe-x402
aep-index embed

# Or from a local clone: cd packages/indexer && pnpm run build && node dist/cli.js sync --probe-x402 && node dist/cli.js embed
```

Index at `~/.aep/index/` by default.

## CLI

```bash
aep resolve '{"capability":"price-feed","maxTotal":"1000000"}'
```

## MCP

Tool: `resolve_intent`. Uses local resolver; no paywall.

## REST API

On **your** or a provider’s HTTP server (`packages/api`): `POST /resolve` and `POST /resolve/premium` apply default x402 prices (**$0.005** / **$0.02**) when treasury and pricing env are configured; otherwise those routes behave like a self-hosted resolver without a paywall.

Use `aep resolve --api-url <url>` to send resolution to that server (402 flow if paywall is enabled there).

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-indexer](../aep-indexer/SKILL.md)
- [aep-graph](../aep-graph/SKILL.md)
- [API Reference](../../docs/api.md)
