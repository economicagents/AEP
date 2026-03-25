# Monetization

Treasury, fees, and API paywall.

## Treasury

Set `treasuryAddress` in `~/.aep/config.json` or `AEP_TREASURY_ADDRESS` env. Revenue flows to this address.

## API Paywall

When `AEP_TREASURY_ADDRESS` (or `treasuryAddress` in config) is set, `POST /resolve` and `POST /resolve/premium` are paywalled.

| `AEP_PAYWALL_BACKEND` | Behavior |
|-----------------------|----------|
| `x402` or **unset** (default) | [x402-hono](https://www.npmjs.com/package/x402-hono) on Base (`AEP_NETWORK`: `base` / `base-sepolia`) |
| `mpp` | [Machine Payments Protocol](https://mpp.dev) — **Tempo session** via [`mppx`](https://www.npmjs.com/package/mppx) (`mppx/hono`). Single channel + per-request voucher increments; settlement on Tempo. |

Only one backend is active at a time. MPP requires a strong server secret and Tempo configuration (see below).

| Path | Paywall | Use case |
|------|---------|----------|
| **REST** `POST /resolve` | Yes, when treasury set | Any API instance you or a provider runs with treasury configured |
| **MCP** (`resolve_intent`) | No | Local resolver in the MCP process |
| **CLI** (`aep resolve`) | No | Local resolver. `aep resolve --api-url <url>` hits a remote API (x402 or MPP, depending on server and `AEP_PAYWALL_BACKEND` / response headers) |

### MPP / Tempo (API server)

| Variable | Description |
|----------|-------------|
| `MPP_SECRET_KEY` or `AEP_MPP_SECRET_KEY` | Required when `AEP_PAYWALL_BACKEND=mpp`; use a long random value (e.g. `openssl rand -hex 32`) |
| `AEP_TEMPO_CHAIN_ID` | `4217` mainnet (default), `42431` Moderato testnet |
| `AEP_TEMPO_RPC_URL` | Tempo JSON-RPC (overrides default public RPC for the chosen chain) |
| `AEP_TEMPO_CURRENCY` | TIP-20 token address (defaults: mainnet USDC, testnet pathUSD per `mppx` defaults) |
| `AEP_TEMPO_ESCROW_CONTRACT` | `TempoStreamChannel` address (defaults documented for 4217 / 42431 on [mpp.dev](https://mpp.dev/payment-methods/tempo/session)) |
| `AEP_TEMPO_SUGGESTED_DEPOSIT` | Human-readable suggested channel deposit for sessions (default `5`) |
| `AEP_TEMPO_FEE_PAYER_URL` or `AEP_TEMPO_FEE_PAYER_PRIVATE_KEY` | Optional server-side fee sponsorship (API process only; never log keys) |

**Optional `~/.aep/config.json` (non-secret defaults):** `tempoRpcUrl`, `tempoChainId`, `tempoCurrency`, `tempoEscrowContract`. When the same knob is set in env (`AEP_TEMPO_*`), **env wins**. The hosted API reads these at startup; **`aep resolve --api-url`** uses `tempoRpcUrl` / `tempoChainId` when opening the MPP client if env is unset.

AEP policy checks (`checkPolicy` / BudgetPolicy) still run against your **Base** AEP account when you use the SDK or CLI hooks; they do not observe Tempo settlement automatically (same limitation as x402).

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
x402 or MPP (Tempo session) per resolve (POST /resolve)  ──→ AEP Treasury
Credit facility origination fee                          ──→ AEP Treasury
Escrow setup fee                                         ──→ AEP Treasury
SLA contract setup fee                                   ──→ AEP Treasury
```
