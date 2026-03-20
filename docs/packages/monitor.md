# Monitor

On-chain event monitoring for security-relevant events.

## Run

```bash
aep monitor
```

Uses `config.account` when `monitor.accounts` is empty.

## Config

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

## Events

- Frozen
- DefaultDeclared
- BreachDeclared
- PolicyRecordSpendFailed
- UserOperationRevertReason

Alerts emitted as JSON lines to stdout; optional webhook POST.
