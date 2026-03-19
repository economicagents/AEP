---
name: aep-key-management
description: AEP key hierarchy, kill switch, and operator/session key plans. Use when the user asks about key security, owner vs operator keys, emergency freeze, or key compromise mitigation. Triggers: hardware wallet, key compromise, emergency freeze, kill switch. Owner-only is implemented; operator/session keys are deferred.
compatibility: Conceptual. Use aep freeze for kill switch. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🔑"
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

# AEP Key Management

## When to Use

- User asks about key hierarchy, owner vs operator keys
- User needs emergency freeze (kill switch) on suspected compromise
- User asks about key security, hardware wallet, or session keys

## Key Hierarchy

| Tier | Key | Storage | Scope |
|------|-----|---------|-------|
| **Owner (cold)** | Master key | Hardware wallet or offline | Upgrades, policy changes, emergency freeze |
| **Operator (warm)** | Day-to-day key | Warm wallet | Adjust budget within owner-set bounds (deferred) |
| **Session (hot)** | Scoped, time-limited | Agent runtime memory | Execute transactions within policy bounds (deferred) |

## Current: Owner-Only

AEP implements owner-only control. The owner key:

- Controls account upgrades (UUPS)
- Adds/removes policy modules
- Sets frozen state (kill switch)
- Configures all policy parameters (budget caps, allow/block lists, min-reputation)

**Recommendation:** Store the owner key in a hardware wallet or secure enclave. Never expose it to the agent runtime.

## Deferred: Operator and Session Keys

- **Operator key:** Would adjust budget parameters within bounds set by the owner. Used for day-to-day management without exposing the owner key.
- **Session keys:** Would be scoped, time-limited keys held by the agent runtime. Can only execute transactions within policy bounds. If compromised, damage limited to remaining budget in the current window.

These map to ERC-4337 session key patterns and EIP-7702 delegation. Not yet implemented; see [BACKLOG](../../docs/BACKLOG.md).

## Kill Switch

On suspected key compromise, the owner should immediately call `setFrozen(true)` to block all execution (including owner-direct calls). This is the primary mitigation for key compromise.

```bash
aep freeze
```

## Links

- [Threat Model](../../docs/THREAT-MODEL.md) — Key compromise vectors and mitigations
- [Cookbook](../../docs/COOKBOOK.md)
- [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337)
- [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)
