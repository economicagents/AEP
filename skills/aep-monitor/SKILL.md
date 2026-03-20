---
name: aep-monitor
description: AEP on-chain event monitoring. Use when watching for Frozen, DefaultDeclared, BreachDeclared, or other security-relevant events; setting up aep monitor or webhook alerts.
compatibility: Requires aep CLI. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🔔"
    requires:
      bins: ["aep"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["@economicagents/cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP On-Chain Monitor

## When to Use

- User wants to monitor security events (Frozen, DefaultDeclared, BreachDeclared)
- User needs webhook alerts for account or relationship events
- User asks about aep monitor or PolicyRecordSpendFailed, UserOperationRevertReason

## Usage

```bash
aep monitor
```

Emits JSON lines to stdout. Optional webhook POST when configured.

## Config

`~/.aep/config.json`:

```json
{
  "monitor": {
    "accounts": ["0x..."],
    "facilities": ["0x..."],
    "slas": ["0x..."],
    "webhookUrl": "https://...",
    "pollIntervalMs": 12000
  }
}
```

Uses `account` when `monitor.accounts` is empty.

## Events

- Frozen — Account frozen (kill switch)
- DefaultDeclared — Credit facility default
- BreachDeclared — SLA breach
- PolicyRecordSpendFailed — Policy module recordSpend reverted
- UserOperationRevertReason — UserOp execution failed

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [Incident Response](../../docs/INCIDENT-RESPONSE-PLAYBOOK.md)
