# AEP Threat Model

## Overview

This document describes the attack surfaces and mitigations for the Agent Economic Protocol (AEP) account, intent resolution, and economic relationship contracts.

## Trust Assumptions Summary

- **Conditional Escrow / SLA Contract:** Validator must be honest. Provider or consumer could collude with validator; use trusted validators.
- **Revenue Splitter:** Recipients must verify weights before funding; wrong address at deploy sends funds to wrong address.
- **Credit Facility:** Lender can freeze facility arbitrarily; borrower chooses counterparties.
- **ERC-8004 registries:** IdentityRegistry, ReputationRegistry, ValidationRegistry must be correctly configured and integrity-assured.

## Attack Surfaces

### 1. Policy Bypass

**Description:** An attacker attempts to execute transactions that violate economic policy (budget, counterparty, rate limit).

**Vectors:**
- Calling `execute` directly as owner bypasses `validateUserOp` but not `_requireFromEntryPointOrOwner` which checks `frozen`. Policy modules are only invoked when the EntryPoint calls `validateUserOp`. Owner-direct calls are intentionally allowed for admin operations.
- Malicious UserOp construction that tricks calldata decoding (e.g. nested calls that extract wrong amount).

**PaymentDecoder patterns:** Recognized calldata: `execute`/`executeBatch` with inner `transfer`/`transferFrom`; direct `transfer`/`transferFrom`. Unrecognized patterns yield `totalAmount = 0` (passes BudgetPolicy) but remain subject to CounterpartyPolicy. Nested contract calls that perform transfers via callbacks are not decoded; use recognized patterns for budget-critical flows.

**Mitigations:**
- Policy enforcement in `validateUserOp` is mandatory for all EntryPoint-originated transactions.
- `PaymentDecoder` only recognizes `execute`/`executeBatch` and `transfer`/`transferFrom` patterns. Unrecognized calldata yields 0 amount (passes budget) but may fail counterparty if recipient is blocked.
- Owner key compromise allows full bypass; see Key Management.

### 2. ERC-8004 Reputation Manipulation

**Description:** Attacker inflates or deflates reputation to influence CounterpartyPolicy decisions.

**Vectors:**
- Sybil feedback: many fake identities submit positive feedback for a malicious agent.
- Collusion: agent and "client" coordinate to game reputation.

**Mitigations:**
- CounterpartyPolicy uses allow/block lists, optional agentId allowlist, and optional `minReputation` (ERC-8004). When `minReputation` is set, agent wallet must have sufficient reputation from the configured registry.
- When reputation is used, `getSummary` requires `clientAddresses[]` for Sybil resistance; trusted reviewer lists should be maintained off-chain.

### 3. Key Compromise

> [!WARNING]
> Owner key compromise grants full account control. Use `aep freeze` immediately if compromise is suspected.

**Description:** Owner, operator, or session key is stolen.

**Vectors:**
- Owner key: full control, can drain funds, change policies, upgrade account.
- Session key (future): scoped to policy bounds; damage limited to remaining budget in window.

**Mitigations:**
- **Kill switch:** `setFrozen(true)` stops all execution (including owner-direct). Owner should call this immediately on suspected compromise.
- **Key hierarchy (documented):** See [COOKBOOK](COOKBOOK.md) and skills/aep-key-management. Owner (cold), operator (warm), session keys (hot). AEP implements owner-only; operator/session keys are deferred.
- Recommend hardware wallet for owner key.

**Treasury and multisig (hosted API vs on-chain factories):** A **Gnosis Safe** (or other multisig) on Base **8453** is the recommended destination for **hot fee flows** and for aligning **hosted** x402 paywall config (`AEP_TREASURY_ADDRESS` / `treasuryAddress`) with operations policy — see [guides/deployment.md](guides/deployment.md). That env/config change **does not** retroactively move fees already bound to **relationship factories** deployed earlier: factory contracts take **`treasury()` at deploy time**, so origination/setup fees may keep paying **the old treasury** until **new factories** are deployed with the new recipient (or until you accept the legacy fee sink). Treat multisig migration as **governance + optional new deploys**, not a single-key env flip for all economic flows.

### 4. Runaway Agent

**Description:** Agent logic bug or prompt injection causes unbounded spending.

**Vectors:**
- Agent repeatedly calls x402 endpoints, each payment within per-tx cap but exceeding daily cap over time.
- Agent ignores `checkPolicy` rejection and retries.

**Mitigations:**
- **BudgetPolicy:** Per-tx, daily, weekly caps. `recordSpend` updates state after execution.
- **RateLimitPolicy:** Max transactions per window.
- **Kill switch:** Owner can freeze account.
- x402 interceptor returns structured rejection; agent loop should handle "BUDGET_EXCEEDED" by seeking alternatives or escalating.

### 5. Front-Running and MEV

**Description:** Attacker observes pending UserOps or intent resolution and front-runs.

**Vectors:**
- Bundler or block builder reorders UserOps for profit.
- Intent resolution reveals provider choice; attacker could temporarily boost own reputation or undercut price.

**Mitigations:**
- Standard ERC-4337 bundler behavior applies.
- Intent resolution reveals provider choice; no protocol-level mitigation. Document as known limitation. Private mempools or encrypted intents are out of scope.

### 6. Stale or Malicious Provider Index

**Description:** Resolution quality depends on index freshness; agents could advertise false capability or price.

**Vectors:**
- Stale index: providers removed or updated on-chain but index not synced.
- Malicious registration files: agent advertises false capability, wrong price, or fake endpoints.

**Mitigations:**
- Document sync frequency; run `aep-index sync` periodically.
- Reputation and validation filters reduce impact of malicious providers.
- Optional x402 probe validates endpoint exists and records price.

### 7. Upgrade and Governance

**Description:** Malicious upgrade replaces account implementation.

**Mitigations:**
- UUPS: only owner can call `upgradeTo`. Owner key security is critical.
- No proxy admin; implementation is upgraded by owner only.

### 8. Economic Relationship Contracts

**Credit Facility:**
- **Lender griefing:** Lender can freeze facility arbitrarily. Documented; borrower chooses counterparties.
- **Borrower draw front-run:** If reputation drops between intent and execution, draw reverts. Acceptable.
- **Reputation manipulation:** Same as account (Sybil, collusion). Min-reputation and client list provide baseline.
- **Default declaration:** Only the lender can call `declareDefault` after the repayment deadline. Lender should submit negative feedback separately.

**Conditional Escrow:**
- **Validator collusion:** Provider or consumer could collude with validator. Use trusted validators; document as trust assumption.
- **Consumer/provider dispute abuse:** Dispute checks validation; if validation passed, dispute reverts. Timeout allows dispute when no validation submitted.
- **Validation timeout:** Provider can delay indefinitely; consumer can dispute from FUNDED or IN_PROGRESS to cancel.

**Revenue Splitter:**
- **Weight manipulation:** Weights fixed at deploy. Recipients must verify before funding.
- **Recipient typo:** Wrong address at deploy; funds sent to wrong address. Require deployer verification.

**SLA Contract:**
- **False breach claims:** Consumer must provide valid requestHash with response < threshold. Validator must be honest.
- **Validator collusion:** Provider could collude with validator to avoid breach. Document as trust assumption.

### 9. Economic Graph

**Description:** Off-chain graph DB and analytics; path and data integrity.

**Vectors:**
- Path traversal: Malicious query params (graphPath, indexPath) with `..` could read/write outside intended directory.
- Stale graph: Analytics and credit scores based on outdated sync; run `aep graph sync` periodically.
- Recommendation gaming: Agents could coordinate payments to inflate collaborative-filtering scores.

**Mitigations:**
- API rejects graphPath/indexPath containing `..` or null bytes.
- Document sync frequency; graph is best-effort for analytics.
- Recommendation boost is additive (max +0.2); cannot override price/reputation filters.

## Validator Selection

For Conditional Escrow and SLA Contract: use reputable validators. Consider multi-sig or DAO for high-value escrows/SLAs. When validator collusion is suspected, see [INCIDENT-RESPONSE-PLAYBOOK § SLA Breach](INCIDENT-RESPONSE-PLAYBOOK.md#5-sla-breach) for dispute flow.

## Security Checklist

- [ ] Owner key stored in hardware wallet or secure enclave
- [ ] Kill switch tested and accessible
- [ ] Budget caps set appropriately for agent's task
- [ ] Counterparty allow/block lists and min-reputation (if used) reviewed
- [ ] Rate limit configured for expected transaction volume
- [ ] Provider index synced regularly (intent resolution)
- [ ] Path configs (indexPath, graphPath, statePath) use safe paths; no `..` or null bytes
- [ ] Credit facility reputation and identity registries configured
- [ ] Escrow validator address trusted
- [ ] Revenue splitter weights verified before deploy
- [ ] Economic graph synced regularly (`aep graph sync`) for analytics
- [ ] On-chain event monitor running (`aep monitor`) for security alerts
