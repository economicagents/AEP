---
name: aep-fleet
description: AEP fleet management: manage multiple AEP accounts as a fleet. Use when configuring fleets, running fleet summary/alerts/freeze, or using fleet API.
compatibility: Requires aep CLI. Configure fleets in ~/.aep/config.json. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🚢"
    requires:
      bins: ["aep"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["aep-cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Fleet Management

## When to Use

- User wants to manage multiple AEP accounts as a fleet
- User needs fleet summary, alerts, or freeze-all
- User asks about fleet API or AEP_FLEET_API_KEY

## Config

`~/.aep/config.json`:

```json
{
  "fleets": {
    "fleet-1": {
      "accounts": ["0x...", "0x..."],
      "name": "Production Agents"
    }
  }
}
```

## CLI

```bash
aep fleet list
aep fleet summary <id>
aep fleet alerts <id>
aep fleet freeze <id>
```

## MCP Tools

- `fleet_summary` — Aggregate analytics for fleet
- `fleet_accounts` — List fleet accounts
- `fleet_alerts` — Alerts (Frozen, DefaultDeclared, BreachDeclared, etc.)

## API

- `GET /fleet/:id/summary` — Fleet summary
- `GET /fleet/:id/accounts` — Fleet accounts
- `GET /fleet/:id/alerts` — Fleet alerts

When `AEP_FLEET_API_KEY` is set, requires `Authorization: Bearer <key>` or `X-Fleet-API-Key`.

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-monetization](../aep-monetization/SKILL.md)
