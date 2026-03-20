# @economicagents/monitor

On-chain monitoring for AEP accounts and relationships: poll for `Frozen`, `DefaultDeclared`, `BreachDeclared`, policy failures, and UserOp revert reasons. Logs JSON lines to stdout; optional webhook POST.

## Install

```bash
pnpm add @economicagents/monitor
```

**From a local clone** of [economicagents/AEP](https://github.com/economicagents/AEP): use `aep monitor` from `@economicagents/cli`, or `cd packages/monitor && pnpm run build` and run `node dist/cli.js`.

## Usage

```bash
aep monitor
```

Config in `~/.aep/config.json` under `monitor`:

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

- **accounts** — Smart accounts to watch
- **facilities** — CreditFacility addresses (`DefaultDeclared`)
- **slas** — SLAContract addresses (`BreachDeclared`)
- **webhookUrl** — Optional alert POST URL
- **pollIntervalMs** — Poll interval (default 15000)

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [Cookbook](https://github.com/economicagents/AEP/blob/main/docs/COOKBOOK.md) — Monitor setup
- [Incident response](https://github.com/economicagents/AEP/blob/main/docs/INCIDENT-RESPONSE-PLAYBOOK.md) — When alerts indicate compromise or policy issues
