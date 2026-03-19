# Graph

Economic graph for credit scoring, analytics, and recommendations.

## Sync

```bash
aep graph sync
```

Stores graph at `~/.aep/graph` (or `graphPath` in config).

## CLI

| Command | Description |
|---------|-------------|
| `aep graph sync` | Sync economic graph |
| `aep analytics` | Account P&L, spend patterns |
| `aep credit-score` | Credit score |
| `aep recommendations` | Provider recommendations |

## Config

- `graphPath` in `~/.aep/config.json` — override graph path
- `aepAccountFactoryAddress` or `factoryAddress` — for account lookup

## Dependencies

- `better-sqlite3` (v12+). Tests fall back to `sql.js` when native bindings unavailable.
