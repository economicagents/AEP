# @economicagents/monitor

On-chain event monitoring for AEP. Polls for Frozen, DefaultDeclared, BreachDeclared, PolicyRecordSpendFailed, UserOperationRevertReason. Emits JSON lines to stdout; optional webhook POST.

## Install

```bash
pnpm add @economicagents/monitor
```

From monorepo: used via `aep monitor` (CLI) or `cd packages/monitor && pnpm run build`.

## Usage

```bash
aep monitor
```

Config: `~/.aep/config.json` under `monitor`:

```json
{
  "monitor": {
    "accounts": ["0x..."],
    "facilities": ["0x..."],
    "slas": ["0x..."],
    "webhookUrl": "https://...",
    "pollIntervalMs": 15000
  }
}
```

## Configuration

- **accounts** — AEP accounts to watch for Frozen, PolicyRecordSpendFailed, UserOperationRevertReason
- **facilities** — CreditFacility addresses for DefaultDeclared
- **slas** — SLAContract addresses for BreachDeclared
- **webhookUrl** — Optional POST endpoint for alerts
- **pollIntervalMs** — Poll interval (default: 15000)

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Cookbook](../../docs/COOKBOOK.md) — On-chain monitor
- [Incident Response](../../docs/INCIDENT-RESPONSE-PLAYBOOK.md)
