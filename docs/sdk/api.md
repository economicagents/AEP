# SDK API Reference

Exported functions and types from `@economicagents/sdk`.

## Account

| Function | Description |
|----------|-------------|
| `createAccount` | Deploy AEP account via factory |
| `getAccountAddress` | Get predicted CREATE2 address |
| `getDeposit` | EntryPoint deposit balance |
| `setFrozen` | Freeze/unfreeze account |
| `getPolicyModules` | List policy module addresses |

## Policy

| Function | Description |
|----------|-------------|
| `checkPolicy` | Simple policy check (boolean) |
| `checkPolicyDetailed` | Policy check with reason (BUDGET_EXCEEDED, etc.) |
| `getBudgetPolicyState` | BudgetPolicy caps and spend |
| `setBudgetCaps` | Set BudgetPolicy caps |
| `setBudgetCapsFull` | Set full caps including per-task |
| `setRateLimits` | RateLimitPolicy config |
| `setReputationRegistry`, `setMinReputation` | CounterpartyPolicy |
| `setIdentityRegistry` | ERC-8004 identity |
| `setUseAllowList`, `addToAllowList`, `removeFromAllowList` | Address allowlist |
| `setUseAgentAllowList`, `addAgentToAllowList`, `clearAgentAllowList` | Agent allowlist |
| `addToBlockList`, `removeFromBlockList` | Blocklist |
| `addVerifiedAgent`, `removeVerifiedAgent` | Verified agents |
| `getReputationSummary` | Reputation summary for address |

## Execution

| Function | Description |
|----------|-------------|
| `execute` | Build, sign, submit UserOp via bundler |
| `createAEPAccount` | Create account client for execute |

## x402

| Function | Description |
|----------|-------------|
| `interceptPayment` | Check policy before x402 payment |
| `intercept402Response` | Parse Payment-* headers and check |
| `parsePaymentAmount` | Parse Payment-Amount header |
| `fetchWithPolicyCheck` | Fetch with policy check |

## Intent

| Function | Description |
|----------|-------------|
| `parseIntent` | Parse and validate intent JSON |
| `IntentSchema` | Zod schema for intent |

## Relationships

| Function | Description |
|----------|-------------|
| `createCreditFacility`, `getCreditFacilityState` | Credit facility |
| `creditDeposit`, `creditDraw`, `creditRepay`, `creditFreeze`, `creditUnfreeze`, `creditDeclareDefault`, `creditWithdraw` | Credit ops |
| `createEscrow`, `getEscrowState` | Escrow |
| `escrowFund`, `escrowAcknowledge`, `escrowSubmitForValidation`, `escrowRelease`, `escrowDispute` | Escrow ops |
| `createRevenueSplitter`, `getRevenueSplitterState`, `splitterDistribute` | Revenue splitter |
| `createSLA`, `getSLAState`, `slaStake`, `slaDeclareBreach`, `slaUnstake` | SLA |

## Graph (from @economicagents/graph)

| Function | Description |
|----------|-------------|
| `getAccountAnalytics` | P&L, spend patterns |
| `computeCreditScore` | Credit score |
| `getRecommendations` | Provider recommendations |
| `syncGraph` | Sync economic graph |
| `getFleetSummary`, `getFleetAlerts` | Fleet |

## Constants

| Export | Description |
|--------|-------------|
| `baseSepolia` | viem chain config |
| `ERC8004_BASE_SEPOLIA` | Identity, Reputation, Validation registries |
| `USDC_BASE_SEPOLIA` | USDC address |

## Types

| Type | Description |
|------|-------------|
| `BudgetPolicyState` | Caps and spend |
| `PolicyCheckReason` | BUDGET_EXCEEDED, COUNTERPARTY_BLOCKED, etc. |
| `PolicyCheckResult` | allowed, reason |
| `Intent`, `IntentBudget`, etc. | Intent schema types |
| `ExecuteConfig`, `ExecuteCall` | Execute options |
| `CreditFacilityState`, `EscrowState`, etc. | Relationship states |
