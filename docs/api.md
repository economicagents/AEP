# API Reference

Reference for AEP interfaces: REST API, intent schema, MCP tools, and CLI commands.

---

## REST API

Default port: 3847. Config: `~/.aep/config.json`. Override: `PORT`, `AEP_CONFIG_PATH`.

### Health

#### GET /health

Returns service status.

**Response:** `{ "status": "ok" }`

---

### Intent Resolution

#### POST /resolve

Resolve an intent to an execution plan. Standard tier ($0.005/resolve when x402 paywall enabled).

**Request body:** Intent JSON (see [Intent Schema](#intent-schema))

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

#### POST /resolve/premium

Premium tier intent resolution ($0.02/resolve when x402 paywall enabled).

---

### Analytics

#### GET /analytics/account/:address

P&L, spend patterns, counterparty analysis for an account.

#### GET /analytics/credit-score/:address

Credit score for an account.

#### GET /analytics/recommendations/:address

Provider recommendations for an account (collaborative filtering).

#### GET /analytics/pro/account/:address

Pro analytics (requires `AEP_ANALYTICS_PRO_API_KEY`). Query: `?period=7d|30d|90d`.

#### GET /analytics/pro/credit-score/:address

Pro credit score with period filter.

#### GET /analytics/pro/export/:address

CSV export of payments (Pro).

#### GET /analytics/pro/trends/:address

Payment trends (Pro).

---

### Fleet

#### GET /fleet/:id/summary

Fleet summary (requires `AEP_FLEET_API_KEY`).

#### GET /fleet/:id/accounts

Fleet accounts.

#### GET /fleet/:id/alerts

Fleet alerts (Frozen, DefaultDeclared, BreachDeclared, etc.).

---

### Provider Probe

#### POST /probe

Probe an x402 endpoint for health.

**Body:** `{ "url": "https://..." }` or `{ "agentId": "0x..." }`

#### POST /probe/batch

Batch probe (max 50 URLs).

---

### GraphQL

#### POST /graphql

GraphQL API for analytics queries.

---

## Intent Schema

Intent JSON for POST /resolve and `aep resolve`:

```json
{
  "capability": "image-generation",
  "budget": {
    "max_per_unit": "0.01",
    "max_total": "1.00",
    "currency": "USDC"
  },
  "constraints": {
    "latency_ms": 5000,
    "accuracy": 0.9
  },
  "trust": {
    "min_reputation": 0.7,
    "required_validation": "any"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| capability | string | Yes | Capability to procure (e.g. image-generation, summarization) |
| budget.max_per_unit | string | Yes | Max price per unit (USD string) |
| budget.max_total | string | Yes | Max total spend (USD string) |
| budget.currency | string | No | Default: USDC |
| constraints.latency_ms | number | No | Max latency in ms |
| constraints.accuracy | number | No | Min accuracy 0–1 |
| trust.min_reputation | number | No | Min provider reputation 0–1 |
| trust.required_validation | string | No | optimistic, zk, tee, any |

---

## MCP Tools

Add the AEP MCP server to Cursor or compatible IDE. See [Cookbook](cookbook) for config.

| Tool | Description |
|------|-------------|
| get_balance | Account EntryPoint deposit |
| get_policy_state | BudgetPolicy caps and spend |
| set_budget_caps | Set BudgetPolicy caps (owner only) |
| resolve_intent | Resolve intent to execution plan |
| get_analytics | Account P&L, spend patterns |
| get_credit_score | Credit score for account |
| get_recommendations | Provider recommendations |
| fleet_summary | Fleet overview |
| fleet_accounts | Fleet account list |
| fleet_alerts | Fleet on-chain alerts |
| credit_state | CreditFacility state |
| escrow_state | ConditionalEscrow state |
| splitter_state | RevenueSplitter state |
| sla_state | SLAContract state |

---

## CLI Commands

See [Cookbook](cookbook) for full reference. Summary:

| Command | Description |
|---------|-------------|
| aep deploy | Deploy AEP account |
| aep address | Get predicted address |
| aep config validate | Validate config |
| aep balance | EntryPoint deposit |
| aep check-policy | Check payment against policy |
| aep freeze / unfreeze | Kill switch |
| aep modules | List policy modules |
| aep policy-get / policy-set | BudgetPolicy |
| aep rate-limit | RateLimitPolicy |
| aep counterparty | CounterpartyPolicy |
| aep execute | Submit UserOp via bundler |
| aep resolve | Resolve intent |
| aep graph sync | Sync economic graph |
| aep analytics / credit-score / recommendations | Analytics |
| aep fleet list / summary / alerts / freeze | Fleet |
| aep monitor | On-chain monitor |
| aep credit / escrow / splitter / sla | Economic relationships |
| aep provider probe | Probe provider |

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
| AEP_KEYSTORE_ACCOUNT | Treasury/signer (preferred; MCP set_budget_caps) |
| PRIVATE_KEY | Treasury/signer fallback (MCP set_budget_caps) |
