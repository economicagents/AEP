---
name: aep-formal-verification
description: Formal verification of AEP contracts: validateUserOp flow, key invariants, and suggested FV approach (Halmos, Certora). Use when auditing AEP contracts, proving invariants, or setting up formal verification tooling. Triggers: Halmos, Certora, invariant spec, validateUserOp flow, BudgetPolicy invariant.
compatibility: Requires Foundry, Python for Halmos. Optional Certora.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🔬"
    requires:
      bins: ["forge"]
    install: []
---

# AEP Formal Verification

## When to Use

- User wants to formally verify AEP contracts
- User needs validateUserOp flow or invariant specs
- User asks about Halmos, Certora, or invariant testing

## validateUserOp Flow

```
EntryPoint.handleOps(userOps)
  for each userOp:
    account.validateUserOp(userOp, userOpHash, missingAccountFunds)
      → BaseAccount._validateSignature(userOp, userOpHash)
        → AEPAccount override:
          1. Recover signer from userOp.signature
          2. Require signer == owner
          3. Require !frozen
          4. For each policy module: module.check(userOp)
             - If any returns 1 (SIG_VALIDATION_FAILED): revert
          5. Return 0 (success)
      → execution
```

After successful execution, `AEPAccount._call` triggers `_recordSpend`, which calls `module.recordSpend(callData)` on each policy module.

## Key Invariants

### AEPAccount

1. **Policy enforcement:** A UserOp that would violate any policy module's `check(userOp)` cannot be validated successfully.
2. **Frozen block:** When `frozen == true`, `validateUserOp` reverts before any execution.
3. **recordSpend timing:** `recordSpend` is only called after successful execution (no revert in `_call`).
4. **Owner authority:** Only `owner` or `address(this)` can add/remove modules, set frozen, upgrade.

### BudgetPolicy

1. **Spent never exceeds caps:** After any sequence of `recordSpend` calls, `spentDaily <= maxDaily` (when maxDaily > 0), `spentWeekly <= maxWeekly`, `spentInTask <= maxPerTask`.
2. **Window reset:** When `block.timestamp >= windowStart + windowLength`, the corresponding spent is reset before the next check/recordSpend.
3. **Check consistency:** `check(userOp)` returns 0 iff the payment (decoded from userOp.callData) would not exceed any active cap.

### CounterpartyPolicy

1. **Block list precedence:** If recipient is in blockList, `_isAllowed` returns false regardless of allow list.
2. **Allow list bounds:** allowListAddresses.length <= MAX_ALLOW_LIST_SIZE (256); allowListAgentIds.length <= MAX_AGENT_IDS (256).

### RateLimitPolicy

1. **Tx count bound:** After any sequence of `recordSpend`, `txCountInWindow <= maxTxPerWindow` when limit is set.

## Suggested FV Approach

### Tools

- **Halmos:** Symbolic execution for Solidity. Can prove invariants over arbitrary sequences of calls.
- **Certora:** Deductive verification. Good for high-level protocol properties.
- **Foundry invariants:** Already used in `BudgetPolicy.inv.t.sol` for fuzz-based invariant testing.

### Spec Structure

1. **AEPAccount:** Spec that `validateUserOp` reverts when any policy module's `check` returns 1.
2. **BudgetPolicy:** Invariant `spentDaily <= maxDaily` (and analogous for weekly, task) after arbitrary `recordSpend` sequences.
3. **Integration:** End-to-end spec: UserOp with payment exceeding budget cannot be validated.

### Running FV

```bash
# Halmos
pip install halmos
halmos --contract BudgetPolicyTest
```

For Certora, a `.spec` file would define the desired properties and the prover would be run via the Certora CLI.

## Status

Audit complete (post-remediation). Formal verification in progress. Foundry invariants exist in `BudgetPolicy.inv.t.sol`.

## Handoff

Formal verification tooling requires environment setup (Halmos, Certora, or similar). A human should:

1. Choose the FV tool (Halmos, Certora, or other).
2. Set up the environment.
3. Encode the invariants above as specs.
4. Run the prover and address any failures.

## Links

- [Architecture](../../docs/ARCHITECTURE.md)
- [Threat Model](../../docs/THREAT-MODEL.md)
- [Limitations & deferred work](../../docs/BACKLOG.md) — includes FV pointer and other gaps
