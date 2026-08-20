# x402 → policy check → UserOp

End-to-end flow using **published npm packages** — no repo clone required for the policy-check demo.

## Flow

1. **x402** — HTTP 402 response includes `Payment-Amount` and `Payment-To` headers (or probe with `aep provider probe <url>`).
2. **Policy check** — Before signing, call `aep check-policy` against your AEP smart account.
3. **UserOp** — If allowed, sign the payment and submit via `aep execute` through a bundler.

## Prerequisites

- **Node.js** 18+
- For **read-only demo:** nothing else (uses a public Base Sepolia account)
- For **execute:** funded owner key, deployed account in `~/.aep/config.json`, and a bundler URL

## Run (policy check only)

```bash
cd examples/x402-policy-userop
node run.mjs
```

Uses `npx @economicagents/cli@0.2.0` (current npm registry version). The demo account is the canonical first account on Base Sepolia; the default recipient is intentionally denied so you see a real policy rejection.

Try an allowed recipient after you deploy and configure your own account:

```bash
export AEP_ACCOUNT=0xYourSmartAccount
export RECIPIENT=0xAllowedRecipient
export AMOUNT_WEI=1000000
node run.mjs
```

## Run (full UserOp)

```bash
export PRIVATE_KEY=0x...          # never commit
export BUNDLER_RPC_URL=https://...
export AEP_ACCOUNT=0xYourSmartAccount   # optional if in ~/.aep/config.json
node run.mjs --execute
```

Deploy first if needed:

```bash
export PRIVATE_KEY=0x...
npx @economicagents/cli@0.2.0 deploy \
  --factory 0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546 \
  --rpc https://sepolia.base.org
```

## SDK alternative

For application code, use `@economicagents/sdk` helpers (`intercept402Response`, `fetchWithPolicyCheck`) — see [aep-x402 skill](../../skills/aep-x402/SKILL.md) and [Quick start](../../docs/getting-started/quickstart.md).

## References

- [CLI check-policy](../../docs/cli/commands.md)
- [x402 skill](../../skills/aep-x402/SKILL.md)
- [Deployment addresses](../../docs/guides/deployment.md)
