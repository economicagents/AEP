---
name: aep-rate-limit
description: Configure AEP RateLimitPolicy to limit transactions per time window. Use when the user wants to prevent runaway agents from draining via high-frequency micro-payments, or needs to set max transactions per window.
compatibility: Requires aep CLI, PRIVATE_KEY. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "⏱"
    requires:
      bins: ["aep"]
      env: ["PRIVATE_KEY"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["aep-cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Rate Limit

## When to Use

- User wants to limit transactions per time window
- User needs to prevent runaway agents from high-frequency micro-payments
- User asks about RateLimitPolicy, tx rate limits, or transaction throttling

RateLimitPolicy limits transactions per time window. Prevents runaway agents from draining via high-frequency micro-payments.

## Configuration

1. Get the RateLimitPolicy address: `aep modules`
2. Set limits: `aep rate-limit set -m <module> --max-tx <n> --window-seconds <s>`

Example: `aep rate-limit set -m 0x... --max-tx 10 --window-seconds 3600` — max 10 transactions per hour.

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [Architecture](../../docs/ARCHITECTURE.md)
