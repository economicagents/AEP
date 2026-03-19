# Intent Schema

Intent JSON for POST /resolve and `aep resolve`:

```json
{
  "capability": "image-generation",
  "budget": {
    "max_per_unit": "0.01",
    "max_total": "1.00",
    "currency": "USDC"
  },
  "constraints": {
    "latency_ms": 5000,
    "accuracy": 0.9
  },
  "trust": {
    "min_reputation": 0.7,
    "required_validation": "any"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| capability | string | Yes | Capability to procure (e.g. image-generation, summarization) |
| budget.max_per_unit | string | Yes | Max price per unit (USD string) |
| budget.max_total | string | Yes | Max total spend (USD string) |
| budget.currency | string | No | Default: USDC |
| constraints.latency_ms | number | No | Max latency in ms |
| constraints.accuracy | number | No | Min accuracy 0–1 |
| trust.min_reputation | number | No | Min provider reputation 0–1 |
| trust.required_validation | string | No | optimistic, zk, tee, any |
