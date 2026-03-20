# @economicagents/api

HTTP server for AEP: intent resolution (`POST /resolve`), analytics, fleet, provider probe, and GraphQL. **Self-host** this package next to your stack; default port **3847**.

## Install

```bash
pnpm add @economicagents/api
```

**From a local clone** of [economicagents/AEP](https://github.com/economicagents/AEP): `cd packages/api && pnpm run build`.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /resolve | Intent resolution (default x402 **$0.005** when treasury + pricing env set) |
| POST /resolve/premium | Premium tier (default **$0.02** when paywall enabled) |
| GET /analytics/account/:address | P&L, spend patterns |
| GET /analytics/credit-score/:address | Credit score |
| GET /analytics/recommendations/:address | Provider recommendations |
| GET /analytics/pro/* | Pro analytics (`AEP_ANALYTICS_PRO_API_KEY`) |
| GET /fleet/:id/summary | Fleet overview |
| GET /fleet/:id/accounts | Fleet accounts |
| GET /fleet/:id/alerts | Fleet alerts |
| POST /probe | Probe provider x402 endpoint |
| POST /probe/batch | Batch probe |
| POST /graphql | GraphQL API |

Without `AEP_TREASURY_ADDRESS` / pricing configuration, `POST /resolve` behaves as a non-paywalled resolver for your own deployment.

## Usage

```bash
cd packages/api && pnpm run build && node dist/index.js
```

## Configuration

| Env | Description |
|-----|-------------|
| PORT | Server port (default: 3847) |
| AEP_TREASURY_ADDRESS | Enable x402 paywall on resolve routes |
| AEP_RESOLVE_PRICE | Resolve price (wei) |
| AEP_NETWORK | Chain config |
| AEP_FLEET_API_KEY | Fleet API auth |
| AEP_ANALYTICS_PRO_API_KEY | Pro analytics auth |

Config: `~/.aep/config.json` for RPC, index, and graph paths.

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [API reference (index)](https://github.com/economicagents/AEP/blob/main/docs/api.md)
- [REST API](https://github.com/economicagents/AEP/blob/main/docs/reference/rest-api.md)
- [Cookbook](https://github.com/economicagents/AEP/blob/main/docs/COOKBOOK.md)
- [Monetization](https://github.com/economicagents/AEP/blob/main/docs/guides/monetization.md)
