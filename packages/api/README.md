# @aep/api

REST API for AEP: intent resolution, analytics, fleet, provider probe, GraphQL. Default port 3847.

## Install

```bash
pnpm add @aep/api
```

From monorepo: `cd packages/api && pnpm run build`.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /resolve | Intent resolution (Standard tier) |
| POST /resolve/premium | Intent resolution (Premium tier) |
| GET /analytics/account/:address | P&L, spend patterns |
| GET /analytics/credit-score/:address | Credit score |
| GET /analytics/recommendations/:address | Provider recommendations |
| GET /analytics/pro/* | Pro analytics (AEP_ANALYTICS_PRO_API_KEY) |
| GET /fleet/:id/summary | Fleet overview |
| GET /fleet/:id/accounts | Fleet accounts |
| GET /fleet/:id/alerts | Fleet alerts |
| POST /probe | Probe provider x402 endpoint |
| POST /probe/batch | Batch probe |
| POST /graphql | GraphQL API |

## Usage

```bash
cd packages/api && pnpm run build && node dist/index.js
```

## Configuration

| Env | Description |
|-----|-------------|
| PORT | Server port (default: 3847) |
| AEP_TREASURY_ADDRESS | Enable x402 paywall |
| AEP_RESOLVE_PRICE | Resolve price (wei) |
| AEP_NETWORK | Chain config |
| AEP_FLEET_API_KEY | Fleet API auth |
| AEP_ANALYTICS_PRO_API_KEY | Pro analytics auth |

Config: `~/.aep/config.json` for RPC, index, graph paths.

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [API Reference](../../docs/api.md)
- [Cookbook](../../docs/COOKBOOK.md)
