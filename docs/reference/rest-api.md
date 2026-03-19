# REST API

Default port: 3847. Config: `~/.aep/config.json`. Override: `PORT`, `AEP_CONFIG_PATH`.

## Health

### GET /health

Returns service status.

**Response:** `{ "status": "ok" }`

---

## Intent Resolution

### POST /resolve

Resolve an intent to an execution plan. Standard tier ($0.005/resolve when x402 paywall enabled).

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

Premium tier intent resolution ($0.02/resolve when x402 paywall enabled).

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

Probe an x402 endpoint for health.

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
| AEP_TREASURY_ADDRESS | Enable x402 paywall |
| AEP_RESOLVE_PRICE | Standard resolve price |
| AEP_RESOLVE_PRICE_PREMIUM | Premium resolve price |
| AEP_FLEET_API_KEY | Fleet API auth |
| AEP_ANALYTICS_PRO_API_KEY | Pro analytics auth |
| PRIVATE_KEY | For set_budget_caps (MCP) |
