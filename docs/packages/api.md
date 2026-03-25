# API Server

REST API for intent resolution, analytics, fleet, and provider probe.

## Run

```bash
cd packages/api && pnpm run build && node dist/index.js
```

Default port: 3847. Override: `PORT`, `AEP_CONFIG_PATH`.

## Config

Uses `~/.aep/config.json` (including optional Tempo fields when MPP is enabled — see [monetization](../guides/monetization)). Key env vars:

| Variable | Description |
|----------|-------------|
| `AEP_TREASURY_ADDRESS` | Enable paywall (treasury / payee) |
| `AEP_PAYWALL_BACKEND` | `x402` (default) or `mpp` (Tempo session) |
| `MPP_SECRET_KEY` / `AEP_MPP_SECRET_KEY` | Required for MPP |
| `AEP_TEMPO_*` | Tempo RPC, chain, currency, escrow — see [monetization](../guides/monetization) |

## Endpoints

See [REST API](reference/rest-api) for full endpoint reference.

| Area | Endpoints |
|------|-----------|
| Health | `GET /health` |
| Intent | `POST /resolve`, `POST /resolve/premium` |
| Analytics | `GET /analytics/account/:address`, etc. |
| Fleet | `GET /fleet/:id/summary`, `/accounts`, `/alerts` |
| Probe | `POST /probe`, `POST /probe/batch` |
| GraphQL | `POST /graphql` |
