# Monetization

Treasury, fees, and API paywall.

## Treasury

Set `treasuryAddress` in `~/.aep/config.json` or `AEP_TREASURY_ADDRESS` env. Revenue flows to this address.

## API Paywall

When `AEP_TREASURY_ADDRESS` (or `treasuryAddress` in config) is set, `POST /resolve` is gated via x402.

| Path | Paywall | Use case |
|------|---------|----------|
| **REST** `POST /resolve` | Yes, when treasury set | Any API instance you or a provider runs with treasury configured |
| **MCP** (`resolve_intent`) | No | Local resolver in the MCP process |
| **CLI** (`aep resolve`) | No | Local resolver. `aep resolve --api-url <url>` hits a remote API (paywalled when that server enables it) |

## Resolution Prices

| Variable | Default | Description |
|----------|---------|-------------|
| `AEP_RESOLVE_PRICE` | $0.005 | Standard tier |
| `AEP_RESOLVE_PRICE_PREMIUM` | $0.02 | Premium tier |

## Relationship Fees

| Contract | Fee param | Payer |
|----------|-----------|-------|
| CreditFacility | `--origination-fee` | Lender |
| ConditionalEscrow | `--setup-fee` | Caller |
| SLAContract | `--setup-fee` | Caller |

Use 0 for no fee. Fee-free mode: deploy relationship factories with `AEP_TREASURY_ADDRESS` unset.

## Revenue Flow

```
x402 pay per resolve (POST /resolve)  ──→ AEP Treasury
Credit facility origination fee       ──→ AEP Treasury
Escrow setup fee                     ──→ AEP Treasury
SLA contract setup fee              ──→ AEP Treasury
```
