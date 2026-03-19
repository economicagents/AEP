# Resolver

Intent resolution engine. Converts intent JSON to execution plans with providers, prices, and call data.

## Flow

1. Parse intent (capability, budget, constraints, trust)
2. Discover providers (index or legacy synonym expansion)
3. Filter by reputation, constraints
4. Score and rank
5. Return execution plan with total cost

## Usage

- **CLI:** `aep resolve '{"capability":"...","budget":{"max_total":"1.00"}}'`
- **MCP:** `resolve_intent` tool
- **REST:** `POST /resolve`

## Index Integration

When index exists (`~/.aep/index/`), uses `searchByCapability` for hybrid discovery. Otherwise falls back to legacy synonym expansion + overlap.

## Config

- `indexPath` in `~/.aep/config.json` — provider index path
- `graphPath` — for recommendation boost (accountAddress + graphPath)
