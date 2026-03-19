# API Server

REST API for intent resolution, analytics, fleet, and provider probe.

## Run

```bash
cd packages/api && pnpm run build && node dist/index.js
```

Default port: 3847. Override: `PORT`, `AEP_CONFIG_PATH`.

## Config

Uses `~/.aep/config.json`. Key env vars:

| Variable | Description |
|----------|-------------|
| `AEP_TREASURY_ADDRESS` | Enable x402 paywall |

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
