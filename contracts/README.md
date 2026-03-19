# AEP Contracts

Solidity contracts for the Agent Economic Protocol (AEP). Built with Foundry.

## Structure

```
src/
├── AEPAccount.sol         # ERC-4337 smart account + policy orchestration
├── AEPAccountFactory.sol  # CREATE2 deployment
├── policies/              # BudgetPolicy, CounterpartyPolicy, RateLimitPolicy
├── libraries/            # PaymentDecoder
├── interfaces/
└── vendor/               # Vendored ERC-4337 core (eth-infinitism v0.7)
```

## Install

From monorepo: `cd contracts`. Dependencies via `forge install` (ERC-4337 vendored, OpenZeppelin).

## Build

```bash
forge build
```

## Test

```bash
forge test -vvv
forge fmt --check
```

## Deploy

```bash
# Base Sepolia
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast

# Relationship contracts
forge script script/DeployRelationships.s.sol --rpc-url base_sepolia --broadcast
```

Requires `.env` with `PRIVATE_KEY` and RPC URL. Symlink: `ln -sf ../.env .env`.

## Key Contracts

| Contract | Description |
|----------|-------------|
| AEPAccount | ERC-4337 account, policy check in validateUserOp |
| AEPAccountFactory | CREATE2 deployment |
| BudgetPolicy | Per-tx, daily, weekly caps |
| CounterpartyPolicy | Allow/block list, min-reputation |
| RateLimitPolicy | Max tx per window |
| CreditFacility | Lender-borrower credit |
| ConditionalEscrow | Multi-milestone escrow |
| RevenueSplitter | Weighted revenue split |
| SLAContract | Stake, breach, validator |

## Docs

- [Architecture](../docs/ARCHITECTURE.md) — Contract hierarchy, validateUserOp flow
- [Deployment](../docs/deployment.md) — Full deployment scripts and addresses
- [Threat Model](../docs/THREAT-MODEL.md)
