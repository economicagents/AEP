---
name: aep-graph
description: AEP economic graph: payments, credit events, credit score, analytics, recommendations. Use when syncing graph, getting analytics, credit score, or provider recommendations.
compatibility: Requires aep CLI. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "📊"
    requires:
      bins: ["aep"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["aep-cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Economic Graph

## When to Use

- User wants to sync the economic graph or view analytics
- User needs credit score or provider recommendations
- User asks about aep graph sync, analytics, credit-score, recommendations

The economic graph stores payments, credit events, SLA data. Powers credit scoring, analytics, and collaborative-filtering recommendations.

## CLI

```bash
aep graph sync
aep analytics <address>
aep credit-score <address>
aep recommendations <address>
```

## MCP Tools

- `get_analytics` — P&L, spend patterns, counterparty analysis
- `get_credit_score` — Credit score for account
- `get_recommendations` — Provider recommendations (collaborative filtering)

## API

- `GET /analytics/account/:address`
- `GET /analytics/credit-score/:address`
- `GET /analytics/recommendations/:address`
- `GET /analytics/pro/*` — Pro analytics (period, CSV export, trends) — requires `AEP_ANALYTICS_PRO_API_KEY`

## Resolver Integration

Resolver accepts `accountAddress` and `graphPath` for recommendation boost (personalized provider ranking).

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-intent-resolution](../aep-intent-resolution/SKILL.md)
- [API Reference](../../docs/api.md)
