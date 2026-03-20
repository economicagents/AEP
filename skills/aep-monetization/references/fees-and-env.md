# AEP Monetization — Fees and Environment

## Revenue Streams

| Stream | Pricing | Status |
|--------|---------|--------|
| Managed intent resolution (Standard) | $0.005/resolve via x402 | Implemented |
| Managed intent resolution (Premium) | $0.02/resolve via x402 | Implemented |
| Credit facility origination | $5–50 per facility | Implemented |
| Escrow setup fee | $2–20 per escrow (0.1% of value) | Implemented |
| SLA contract setup | $5–25 per contract | Implemented |
| Fleet management (enterprise) | $500/mo per fleet | Implemented |
| Analytics dashboard pro | $50/mo per operator | Implemented |

## Environment Variables

### API Paywall

- `AEP_TREASURY_ADDRESS` — Receiving address (overrides config)
- `AEP_RESOLVE_PRICE` — Standard tier price, e.g. `0.005` (default)
- `AEP_RESOLVE_PRICE_PREMIUM` — Premium tier price, e.g. `0.02` (default)
- `AEP_NETWORK` — `base-sepolia` or `base` (default: base-sepolia)

### Fleet & Analytics Pro

- `AEP_FLEET_API_KEY` — For `GET /fleet/:id/summary`, `/accounts`, `/alerts`
- `AEP_ANALYTICS_PRO_API_KEY` — For `GET /analytics/pro/*`

## Relationship Contract Fees (Detail)

### CreditFacility

- **Origination fee:** Fixed amount in USDC (6 decimals). Lender pays at creation.
- **CLI:** `aep credit create ... --origination-fee <amount>`
- **SDK:** `createCreditFacility({ ..., originationFee: 5e6 })` ($5)
- **Factory:** Pass `originationFee` to `createFacility`. If > 0, lender must approve factory for token spend.
- **SDK:** When `originationFee > 0` and the signer is the lender, the SDK auto-approves the factory before calling `createFacility`. If a relayer signs, the lender must approve the factory for the fee amount beforehand.

### ConditionalEscrow

- **Setup fee:** Fixed amount in USDC (6 decimals). Caller (typically consumer) pays at creation.
- **CLI:** `aep escrow create ... --setup-fee <amount>`
- **SDK:** `createEscrow({ ..., setupFee: 2e6 })` ($2)

### SLAContract

- **Setup fee:** Fixed amount in stake token (6 decimals). Caller (typically provider) pays at creation.
- **CLI:** `aep sla create ... --setup-fee <amount>`
- **SDK:** `createSLA({ ..., setupFee: 5e6 })` ($5)
