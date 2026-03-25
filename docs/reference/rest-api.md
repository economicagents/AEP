# REST API

HTTP interface for intent resolution, analytics, fleet, probe, and GraphQL — typically **self-hosted** from `packages/api`. Default port **3847**. Config: `~/.aep/config.json`. Override: `PORT`, `AEP_CONFIG_PATH`.

## Health

### GET /health

Returns service status.

**Response:** `{ "status": "ok" }`

---

## Intent Resolution

### POST /resolve

Resolve an intent to an execution plan. Standard tier ($0.005/resolve default when paywall enabled: x402 or MPP Tempo session per `AEP_PAYWALL_BACKEND`).

**Request body:** Intent JSON (see [Intent Schema](reference/intent-schema))

**Response:** Execution plan with providers, total cost, and call data

```json
{
  "providers": [
    {
      "agentId": "123",
      "endpoint": "https://...",
      "paymentWallet": "0x...",
      "pricePerUnit": "500000",
      "reputationScore": 0.85
    }
  ],
  "totalEstimatedCost": "0.50"
}
```

### POST /resolve/premium

Premium tier intent resolution ($0.02/resolve default when paywall enabled).

---

## Analytics

### GET /analytics/account/:address

P&L, spend patterns, counterparty analysis for an account.

### GET /analytics/credit-score/:address

Credit score for an account.

### GET /analytics/recommendations/:address

Provider recommendations for an account (collaborative filtering).

### GET /analytics/pro/account/:address

Pro analytics (requires `AEP_ANALYTICS_PRO_API_KEY`). Query: `?period=7d|30d|90d`.

### GET /analytics/pro/credit-score/:address

Pro credit score with period filter.

### GET /analytics/pro/export/:address

CSV export of payments (Pro).

### GET /analytics/pro/trends/:address

Payment trends (Pro).

---

## Fleet

### GET /fleet/:id/summary

Fleet summary (requires `AEP_FLEET_API_KEY`).

### GET /fleet/:id/accounts

Fleet accounts.

### GET /fleet/:id/alerts

Fleet alerts (Frozen, DefaultDeclared, BreachDeclared, etc.).

---

## Provider Probe

### POST /probe

Probe a **paid HTTP** endpoint for health (expects **402** with either classic **x402** headers or **MPP** `WWW-Authenticate: Payment`).

**Response** includes `paymentKind`: `"x402"`, `"mpp"`, or `"unknown"` when status is 402.

**Body:** `{ "url": "https://..." }` or `{ "agentId": "0x..." }`

### POST /probe/batch

Batch probe (max 50 URLs).

---

## GraphQL

### POST /graphql

GraphQL API for analytics queries.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | API port (default: 3847) |
| AEP_CONFIG_PATH | Config file path |
| AEP_CHAIN_ID | Chain ID (84532 Base Sepolia, 8453 Base) |
| AEP_TREASURY_ADDRESS | Enable paywall (treasury / payee) |
| AEP_PAYWALL_BACKEND | `x402` (default) or `mpp` (Tempo session via `mppx`) |
| MPP_SECRET_KEY / AEP_MPP_SECRET_KEY | Required for MPP backend; strong random |
| AEP_TEMPO_CHAIN_ID / AEP_TEMPO_RPC_URL / AEP_TEMPO_CURRENCY / AEP_TEMPO_ESCROW_CONTRACT | Tempo rail when `AEP_PAYWALL_BACKEND=mpp` (see [monetization](../guides/monetization)) |
| AEP_NETWORK | `base` or `base-sepolia` (x402-hono only) |
| AEP_RESOLVE_PRICE | Standard resolve price |
| AEP_RESOLVE_PRICE_PREMIUM | Premium resolve price |
| AEP_FLEET_API_KEY | Fleet API auth |
| AEP_ANALYTICS_PRO_API_KEY | Pro analytics auth |
| PRIVATE_KEY | For set_budget_caps (MCP) |
