---
name: aep-counterparty
description: Configure AEP CounterpartyPolicy allow/block lists, min-reputation thresholds, and ERC-8004 integration. Use when the user wants to restrict which addresses or agents can receive payments, set reputation requirements, or manage counterparty trust rules.
compatibility: Requires aep CLI, PRIVATE_KEY. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🤝"
    requires:
      bins: ["aep"]
      env: ["PRIVATE_KEY"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["@economicagents/cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Counterparty

## When to Use

- User wants to block or allow specific addresses
- User needs to set minimum reputation for counterparties
- User wants to manage ERC-8004 agent allow lists or global min-reputation
- User asks about who can receive payments, allow lists, or block lists

Configure who can receive payments from an AEP agent wallet. Supports address allow/block lists, ERC-8004 agent allowlists, and minimum reputation thresholds.

## Modes

- **Default:** No allow list → all counterparties allowed (except block list)
- **Block list:** Deny specific addresses (always checked)
- **Address allow list:** `setUseAllowList(true)` → only addresses in allow list can receive
- **Agent allow list:** `setUseAgentAllowList(true)` + IdentityRegistry → only wallets of allowed agent IDs can receive. Optionally enforce min-reputation.
- **Global min-reputation:** `setUseGlobalMinReputation(true)` → only verified agents with reputation >= min can receive. Add agents via `addVerifiedAgent(agentId)`; unregistered or low-reputation denied.

## Quick Start

### Block an Address

```bash
aep counterparty add-block 0xBadActor -m <CounterpartyPolicy address>
```

### Enable Allow List (only these can receive)

```bash
aep counterparty set-use-allow-list true -m <module>
aep counterparty add-allow 0xTrustedProvider -m <module>
```

### ERC-8004 Agent Allow List + Min Reputation

```bash
# Set registries (Base Sepolia)
aep counterparty set-identity-registry -m <module> --registry 0x8004A818BFB912233c491871b3d84c89A494BD9e
aep counterparty set-reputation-registry -m <module> --registry 0x8004B663056A597Dffe9eCcC1965A193B7388713

# Enable agent allowlist
aep counterparty set-use-agent-allow-list true -m <module>
aep counterparty add-agent-allow 42 -m <module>

# Require min reputation (80 with 2 decimals = 0.80)
aep counterparty set-min-reputation -m <module> --min 80 --decimals 2
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `add-allow <address>` | Add to address allow list |
| `remove-allow <address>` | Remove from allow list |
| `add-block <address>` | Add to block list |
| `remove-block <address>` | Remove from block list |
| `add-agent-allow <id>` | Add agent ID to agent allow list |
| `clear-agent-allow` | Clear agent allow list |
| `set-use-allow-list <true\|false>` | Enable/disable address allow list |
| `set-use-agent-allow-list <true\|false>` | Enable/disable agent allow list |
| `set-use-global-min-reputation <true\|false>` | Enable global min-reputation (verified agents only) |
| `add-verified-agent <id>` | Add agent to verified set for global min-reputation |
| `remove-verified-agent <wallet>` | Remove wallet from verified set |
| `set-identity-registry` | Set ERC-8004 Identity Registry |
| `set-reputation-registry` | Set ERC-8004 Reputation Registry |
| `set-min-reputation` | Set min reputation (0 decimals = disabled) |
| `reputation-summary` | Get reputation summary for an agent |

## SDK Usage

```typescript
import {
  addToAllowList,
  removeFromAllowList,
  addToBlockList,
  removeFromBlockList,
  addAgentToAllowList,
  clearAgentAllowList,
  setUseAllowList,
  setUseAgentAllowList,
  setUseGlobalMinReputation,
  addVerifiedAgent,
  removeVerifiedAgent,
  setIdentityRegistry,
  setReputationRegistry,
  setMinReputation,
} from "@economicagents/sdk";

await addToAllowList(moduleAddress, "0x...", { privateKey, rpcUrl });
await setUseAllowList(moduleAddress, true, { privateKey, rpcUrl });
await setIdentityRegistry(moduleAddress, identityRegistryAddress, { privateKey, rpcUrl });
```

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
