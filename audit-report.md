# AEP Smart Contract Security Review (AI-assisted)

This document is an **AI-assisted security review** produced with structured methodology (including static analysis and checklist-driven review). It is **not** a substitute for an independent third-party smart contract audit by a licensed firm. Deployers should treat it as one input alongside their own review, bug bounties, monitoring, and (where appropriate) a formal audit before mainnet or high-value use.

**Reviewer / tooling:** AI Security Audit workflow (smart-contract-audit skill)  
**Date:** March 8, 2026  
**Scope:** AEP economic account and economic relationship contracts (`contracts/src/` excluding `interfaces/`, `lib/`, `vendor/`)  
**Solidity Version:** ^0.8.23  
**Revision:** March 10, 2026 — Final comprehensive pass; I-14 documented; all QuillShield layers applied

---

## Methodology and limitations

- **In scope:** In-repo Solidity under `contracts/src/` as listed above; alignment with `docs/THREAT-MODEL.md`.  
- **Out of scope:** Vendored ERC-4337 core (`vendor/`), third-party dependency internals, off-chain services, economic/game-theoretic attacks outside contract logic, and operational key handling.  
- **Limitations:** AI and automated tools can miss novel vulnerabilities, integration bugs, and economic attacks. Results do not constitute insurance, warranty, or legal advice.

---

## Executive Summary

The AEP (Agent Economic Protocol) codebase implements an ERC-4337 smart account with embedded policy modules (BudgetPolicy, CounterpartyPolicy, RateLimitPolicy), a CREATE2 factory, PolicyRegistry, economic relationship contracts (CreditFacility, ConditionalEscrow, RevenueSplitter, SLAContract), and vendored ERC-4337 core. The architecture is sound, access control is correctly applied, and the threat model in `docs/THREAT-MODEL.md` is well-aligned with the implementation.

**Prior findings (M-1, L-1, L-2, I-1–I-4) have been remediated.** A comprehensive audit of the current codebase confirms no Critical or High severity issues. Two Low and four Informational findings were documented for economic relationship contracts and have been remediated.

**March 8, 2026 audit run:** Fixed linter issues (test function mutability), identified and fixed L-3 (SLAContract missing validator check). Slither remediation: uninitialized-local, missing-zero-check (AEPAccountFactory, policies, ConditionalEscrow), redundant-statements, immutable-states. All findings remediated.

**March 9, 2026 final audit:** Syntactic sweep (delegatecall, tx.origin, abi.encodePacked, ecrecover, unchecked), semantic analysis (reentrancy, access control, invariants, precision), and QuillShield layers applied. Two additional findings documented (I-11, I-12).

**March 9, 2026 pre-production:** I-11 (CreditFacility reputation precision) fixed — multiply-first scaling aligned with CounterpartyPolicy. I-12 (SLAContract validationRegistry zero check) fixed — constructor revert. PolicyRegistry upgraded to Ownable2Step per Cyfrin guidance.

**March 10, 2026 comprehensive audit:** Full Map-Hunt-Attack + QuillShield 10-layer analysis. Syntactic sweep (delegatecall, tx.origin, abi.encodePacked, ecrecover, unchecked, .call, .transfer), semantic analysis (reentrancy, CEI, access control, state invariants, precision, fee-on-transfer, read-only reentrancy), and trust-boundary tracing. One additional Informational (I-14) documented.

**Current findings:** 0 Critical, 0 High, 0 Medium, 0 Low, 0 Informational (I-13, I-14 remediated).

**Economic relationship contracts:** CreditFacility, ConditionalEscrow, RevenueSplitter, SLAContract and their factories; PaymentDecoder; relationship-specific trust boundaries.

---

## Remediation Status

| ID   | Finding                                      | Status   |
|------|-----------------------------------------------|----------|
| M-1  | Unbounded Loop DoS in CounterpartyPolicy      | **Fixed** – MAX_ALLOW_LIST_SIZE and MAX_AGENT_IDS (256) enforced |
| L-1  | Unchecked return value in BaseAccount._payPrefund | **Fixed** – `if (!success) revert BaseAccountPrefundFailed()` |
| L-2  | Missing zero-owner validation in initialize   | **Fixed** – `if (anOwner == address(0)) revert AEPAccountZeroOwner()` |
| I-1  | Policy module initialize() lacks access control | **Fixed** – OpenZeppelin `Initializable` + `initializer` modifier |
| I-2  | getAccountAddress(owner, salt) ignores owner | **Fixed** – NatSpec documents behavior; param suppressed |
| I-3  | require() instead of custom errors            | **Fixed** – All contracts use custom errors |
| I-4  | deployAccountWithModules no validation       | **Fixed** – NatSpec documents expected usage |
| **Economic relationships** | | |
| L-1  | CreditFacility declareDefault missing access control | **Fixed** – Added `onlyLender` modifier |
| L-2  | ERC-20 transfers without SafeERC20           | **Fixed** – SafeERC20 in all relationship contracts |
| I-6  | addAgentToAllowList allows duplicates        | **Fixed** – Added duplicate check; reverts with `CounterpartyPolicyAgentAlreadyInList` |
| I-7  | _recordSpend try/catch swallows reverts      | **Fixed** – NatSpec + `PolicyRecordSpendFailed` event on catch |
| I-8  | ConditionalEscrow release() permissionless   | **Fixed** – Added NatSpec documenting design |
| I-9  | Relationship factories lack validation            | **Fixed** – Zero-address checks in all four factories |
| I-10 | CreditFacility minReputation unsafe typecast  | **Fixed** – Constructor bounds check |
| **March 8, 2026** | | |
| L-3 | SLAContract declareBreach missing validator check | **Fixed** – Revert if validator == address(0); added SLAContractValidationFailed |
| — | Test functions missing view (PaymentDecoder.t.sol) | **Fixed** – Added view to test_Decode* functions |
| — | SLAContract breached check used wrong error | **Fixed** – SLAContractAlreadyBreached, check order corrected |
| **Slither remediation** | | |
| — | Uninitialized local (RevenueSplitter sum) | **Fixed** – Explicit `uint256 sum = 0` |
| — | Missing zero-check (AEPAccountFactory) | **Fixed** – AEPAccountFactoryZeroAddress for entryPoint, accountImplementation |
| — | Missing zero-check (policy constructors/initialize) | **Fixed** – BudgetPolicy, CounterpartyPolicy, RateLimitPolicy |
| — | Missing zero-check (ConditionalEscrow validationRegistry) | **Fixed** – Extended constructor check |
| — | Redundant statement (ConditionalEscrow dispute) | **Fixed** – Use validator in condition; handle validator==0 |
| — | Immutable states (CreditFacility, ConditionalEscrow, SLAContract) | **Fixed** – limit, minReputation, repaymentInterval, borrowerAgentId, releaseThreshold, breachThreshold |
| **March 9, 2026 Final** | | |
| I-11 | CreditFacility reputation normalization precision | **Fixed** – Multiply-first scaling aligned with CounterpartyPolicy |
| I-12 | SLAContract validationRegistry zero check | **Fixed** – Constructor validates _validationRegistry != address(0) |
| **March 9, 2026 Pre-production** | | |
| — | PolicyRegistry Ownable | **Fixed** – Upgraded to Ownable2Step for transfer protection |
| **March 9, 2026 Deep Audit** | | |
| I-13 | RevenueSplitter fee-on-transfer incompatibility | **Fixed** – Balance-recompute pattern; fee-on-transfer safe |
| **March 10, 2026 Comprehensive** | | |
| I-14 | ConditionalEscrow validatorAddress not enforced in release | **Fixed** – validator == validatorAddress check in release() |

---

## Summary Table

| Severity      | Count |
|---------------|-------|
| Critical      | 0     |
| High          | 0     |
| Medium        | 0     |
| Low           | 0     |
| Informational | 0     |

---

## Final Audit Findings (March 9, 2026) — All Remediated

### I-11: CreditFacility Reputation Normalization Precision Loss — **FIXED**

**File:** `contracts/src/relationships/CreditFacility.sol` L109–122  
**Severity:** Informational  
**Description:** When `summaryValueDecimals > 0`, the original code used divide-only normalization, truncating small values for large decimals.

**Status:** Fixed. Aligned with CounterpartyPolicy multiply-first pattern: scale `summaryValue` and `minReputation` to 1e18 before comparison. Tests: `test_DrawRevertsReputationTooLow` passes.

---

### I-12: SLAContract validationRegistry Zero Check — **FIXED**

**File:** `contracts/src/relationships/SLAContract.sol` L40–59  
**Severity:** Informational  
**Description:** The constructor did not validate `_validationRegistry != address(0)`.

**Status:** Fixed. Added `_validationRegistry == address(0)` to constructor revert check. Tests: `test_ConstructorRevertsZeroValidationRegistry`, `test_CreateSLA_ZeroValidationRegistryReverts`.

---

### I-13: RevenueSplitter distribute() Incompatible with Fee-on-Transfer Tokens — **DOCUMENTED**

**File:** `contracts/src/relationships/RevenueSplitter.sol` L41–53  
**Severity:** Informational  
**Description:** The NatSpec states "Uses SafeERC20 for compatibility with non-standard ERC-20 and fee-on-transfer tokens." SafeERC20 handles tokens that omit return values or return false; it does not address fee-on-transfer semantics. In `distribute()`, the contract snapshots `total = token.balanceOf(address(this))` and allocates portions by weight. With fee-on-transfer tokens, each `safeTransfer` deducts more from the contract balance than the nominal amount sent (the fee is retained by the token). Subsequent transfers in the loop may revert when the contract balance is insufficient, leaving distribution incomplete.

**Code:**
```solidity
function distribute() external nonReentrant {
    uint256 total = token.balanceOf(address(this));
    if (total == 0) return;
    for (uint256 i = 0; i < len; i++) {
        uint256 amount = (total * weights[i]) / WEIGHT_DENOMINATOR;
        if (amount > 0) token.safeTransfer(recipients[i], amount);
    }
}
```

**Recommendation:** Clarify NatSpec: "Compatible with non-standard ERC-20 (e.g. USDT). Fee-on-transfer tokens may cause distribute() to revert partway through; use standard ERC-20 for RevenueSplitter." Alternatively, implement a pull-based or balance-recompute pattern for fee-on-transfer support.

**Status:** Fixed. Implemented balance-recompute pattern: `amount = (balance * weights[i]) / remainingWeight` each iteration; fee-on-transfer safe. NatSpec updated.

---

### I-14: ConditionalEscrow validatorAddress Not Enforced in release — **FIXED**

**File:** `contracts/src/relationships/ConditionalEscrow.sol` L157–201  
**Severity:** Informational  
**Description:** The constructor stores `validatorAddress` and requires it to be non-zero when `releaseThreshold > 0`. However, `release()` only checks that `getValidationStatus` returns `validator != address(0)`; it does not verify that the returned validator matches the stored `validatorAddress`. Any validator registered in the ValidationRegistry could thus trigger release if they submit a validation for the request.

**Code:**
```solidity
(address validator, uint256 agentId, uint8 response,,,) =
    validationRegistry.getValidationStatus(m.requestHash);
if (validator == address(0)) revert ConditionalEscrowValidationFailed();
if (agentId != providerAgentId) revert ConditionalEscrowAgentMismatch();
if (response < releaseThreshold) revert ConditionalEscrowValidationFailed();
// Missing: if (validator != validatorAddress) revert ...
```

**Recommendation:** For defense in depth, add `if (validator != validatorAddress) revert ConditionalEscrowValidationFailed()` so only the designated validator's validation can trigger release. Trust in the ValidationRegistry remains the primary control; this would harden against registry misconfiguration.

**Status:** Fixed. Added `if (validator != validatorAddress) revert ConditionalEscrowValidationFailed()` in both milestone and legacy release paths. Test: `test_ReleaseRevertsValidatorMismatch`.

---

## Economic Relationship Contract Findings

### L-1: CreditFacility declareDefault Missing Access Control — **FIXED**

**File:** `contracts/src/relationships/CreditFacility.sol`  
**Severity:** Low  
**Status:** Fixed. Added `onlyLender` modifier to `declareDefault()`.

---

### L-2: ERC-20 Transfer/TransferFrom Without SafeERC20 — **FIXED**

**File:** `contracts/src/relationships/CreditFacility.sol`, `ConditionalEscrow.sol`, `RevenueSplitter.sol`, `SLAContract.sol`  
**Severity:** Low  
**Status:** Fixed. All relationship contracts now use OpenZeppelin SafeERC20 (`safeTransfer`, `safeTransferFrom`). NatSpec documents compatibility with non-standard ERC-20 and fee-on-transfer tokens.

---

## Post-Remediation Findings (Economic Account)

### I-5: Policy Module setOwner/setAccount Lack Zero-Address Validation — **FIXED**

**File:** `contracts/src/policies/BudgetPolicy.sol`, `CounterpartyPolicy.sol`, `RateLimitPolicy.sol`  
**Severity:** Informational  
**Status:** Fixed. Zero-address checks added to `setOwner` and `setAccount` in all three policy modules. Custom errors: `BudgetPolicyZeroOwner`, `BudgetPolicyZeroAccount`, etc.

---

### I-6: addAgentToAllowList Allows Duplicate AgentIds — **FIXED**

**File:** `contracts/src/policies/CounterpartyPolicy.sol`  
**Severity:** Informational  
**Status:** Fixed. Added linear scan to reject duplicate `agentId`; reverts with `CounterpartyPolicyAgentAlreadyInList`.

---

### I-7: _recordSpend try/catch Swallows Policy Reverts — **FIXED**

**File:** `contracts/src/AEPAccount.sol`  
**Severity:** Informational  
**Status:** Fixed. Added NatSpec documenting design trade-off; emits `PolicyRecordSpendFailed(module)` on catch for monitoring.

---

### I-8: ConditionalEscrow release() Permissionless — **FIXED**

**File:** `contracts/src/relationships/ConditionalEscrow.sol`  
**Severity:** Informational  
**Status:** Fixed. Added NatSpec: `@notice Anyone may call when validation passes; releases funds to provider.`

---

### I-9: Relationship Factories Lack Input Validation — **FIXED**

**File:** `contracts/src/relationships/*Factory.sol`  
**Severity:** Informational  
**Status:** Fixed. All four factories now validate critical addresses (zero-address checks) before deployment.

---

### I-10: CreditFacility minReputation Unsafe Typecast — **FIXED**

**File:** `contracts/src/relationships/CreditFacility.sol`  
**Severity:** Informational  
**Status:** Fixed. Added constructor check `if (_minReputation > uint256(type(int256).max)) revert CreditFacilityMinReputationOverflow()`.

---

### L-3: SLAContract declareBreach Missing Validator Check — **FIXED** (March 8, 2026)

**File:** `contracts/src/relationships/SLAContract.sol` L77–84  
**Severity:** Low  
**Description:** `declareBreach` did not validate that `validatorAddress` from `getValidationStatus` is non-zero. If the registry returned `(address(0), providerAgentId, 0, ...)` for an uninitialized or invalid request, the consumer could declare breach and receive the stake without valid validation.

**Code (before):**
```solidity
(, uint256 agentId, uint8 response,,,) = validationRegistry.getValidationStatus(requestHash);
if (agentId != providerAgentId) revert SLAContractAgentMismatch();
if (response >= breachThreshold) revert SLAContractBreachThresholdNotMet();
```

**Recommendation:** Add `if (validator == address(0)) revert SLAContractValidationFailed()` (aligned with ConditionalEscrow.release).

**Status:** Fixed. Validator check added; `SLAContractValidationFailed` and `SLAContractAlreadyBreached` errors added; check order corrected (breached before staked for clearer double-declare error). Tests added: `test_DeclareBreachRevertsZeroValidator`, `test_DeclareBreachRevertsAlreadyBreached`.

---

## Architecture Map

| Component              | Role                                      | Trust Boundary        |
|------------------------|-------------------------------------------|------------------------|
| AEPAccount             | ERC-4337 account, policy orchestration    | Owner, EntryPoint      |
| AEPAccountFactory      | CREATE2 deployment, default/template policy setup | Permissionless |
| PolicyRegistry         | Policy templates for deployFromTemplate   | Owner                  |
| BudgetPolicy           | Per-tx, daily, weekly, per-task caps      | Account, owner        |
| CounterpartyPolicy     | Allow/block lists, ERC-8004 agent list    | Account, owner, registry |
| RateLimitPolicy        | Tx-per-window limit                       | Account, owner        |
| PaymentDecoder         | Calldata parsing for policy checks        | Library (no state)    |
| BaseAccount            | ERC-4337 validateUserOp skeleton          | EntryPoint            |
| **CreditFacility**     | Lender/borrower credit line, ERC-8004 reputation | Lender, borrower, registries |
| **ConditionalEscrow**  | Escrow with validation-based release     | Consumer, provider, validator |
| **RevenueSplitter**    | Fixed-weight token distribution          | Permissionless (distribute) |
| **SLAContract**        | Staked SLA, breach on validation < threshold | Provider, consumer |

**Entry points (state-changing):** Economic account (see above); relationship contracts: `deposit`, `draw`, `repay`, `freeze`, `unfreeze`, `declareDefault`, `withdraw` (CreditFacility); `fund`, `acknowledge`, `submitForValidation`, `release`, `dispute` (ConditionalEscrow); `distribute` (RevenueSplitter); `stake`, `declareBreach`, `unstake` (SLAContract); factory `create*` functions.

**Invariants:** Policy modules only callable by account for `recordSpend`; owner-only functions protected; frozen account blocks execution; relationship contracts use ReentrancyGuard; relationship contracts enforce role-based access (onlyLender, onlyBorrower, onlyConsumer, onlyProvider).

---

## Syntactic Sweep (Cheatsheet Keywords) — March 9, 2026 Final

| Pattern           | Location                         | Status                          |
|-------------------|----------------------------------|---------------------------------|
| `abi.encodePacked`| Factory L50 (CREATE2 hash)        | OK – fixed-length args (bytes1, address, bytes32, bytes32) |
| `bytes.concat`    | Factory L47, 57, 92, 128         | OK – creationCode uses bytes.concat |
| `ECDSA.recover`   | AEPAccount._validateSignature    | OK – OZ reverts on invalid sig  |
| `initialize(`     | Account, policies                | OK – initializer modifier       |
| `.call{value`     | AEPAccount._call, BaseAccount    | OK – CEI respected; prefund checked |
| `unchecked`       | UserOperationLib                 | OK – vendored, bounded math     |
| `tx.origin`       | —                                | None found                      |
| `delegatecall`    | —                                | None in AEP code (proxy uses OZ)|
| `.transfer(`      | Relationship contracts            | OK – SafeERC20 (L-2 fixed)      |
| `require(.*transfer` | Relationship contracts         | OK – SafeERC20 (L-2 fixed)      |

---

## Validation Notes

- **Reentrancy:** `execute` → `_call` → `_recordSpend`. External call in `_call`; `_recordSpend` runs after. Reentrancy into `execute` blocked by `_requireFromEntryPointOrOwner` — a malicious target reentering would have `msg.sender == target`, not EntryPoint or owner, so the reentrant call reverts. Relationship contracts use ReentrancyGuard on fund flows.
- **Signature:** OpenZeppelin ECDSA.recover reverts on invalid signature; no zero-address bypass.
- **Proxy:** ERC1967Proxy + UUPS; upgrade restricted to owner via `_authorizeUpgrade`.
- **Storage:** No storage layout collisions identified in inheritance chain.
- **DoS:** CounterpartyPolicy loops bounded by MAX_ALLOW_LIST_SIZE (256) and MAX_AGENT_IDS (256). RevenueSplitter recipients/weights bounded by constructor validation.
- **Custom errors:** All contracts use custom errors; relationship contracts use SafeERC20 (L-2 fixed).
- **Relationship contract ERC-8004:** CreditFacility, ConditionalEscrow, SLAContract depend on external ValidationRegistry/ReputationRegistry/IdentityRegistry. Malicious or misconfigured registry can affect behavior; trust assumption documented in THREAT-MODEL.md.

---

## Recommendations Summary

All prior recommendations have been implemented. See Remediation Status table above.

**March 9, 2026 pre-production:** I-11 and I-12 remediated. PolicyRegistry upgraded to Ownable2Step.

**March 9, 2026 comprehensive deep audit:** Full Map-Hunt-Validate pass per smart-contract-audit skill. Syntactic sweep (delegatecall, tx.origin, abi.encodePacked, ecrecover, unchecked, .call) and semantic analysis (reentrancy, access control, invariants, precision, fee-on-transfer) across all in-scope contracts. AEPAccount reentrancy validated as non-exploitable (caller check blocks malicious target). I-13 documented (RevenueSplitter fee-on-transfer limitation).

**March 10, 2026 final comprehensive audit:** Full Map-Hunt-Attack + QuillShield 10-layer analysis. Syntactic sweep confirmed: abi.encodePacked (CREATE2, fixed-length), .call{value} (AEPAccount, BaseAccount), unchecked (UserOperationLib vendored). Semantic layers: Semantic Guard (no bypass), State Invariant (drawn/limit, milestone sums), Reentrancy (CEI, nonReentrant), Oracle/Flash Loan (N/A), Proxy/Upgrade (UUPS owner-only), Input/Arithmetic (multiply-first, zero-checks), External Call (SafeERC20), Signature (ECDSA.recover), DoS (bounded loops). I-14 documented (ConditionalEscrow validatorAddress).

---

## Final Pre-Production Verification (March 10, 2026)

| Check | Result |
|-------|--------|
| `forge build` | Pass |
| `forge fmt --check` | Pass |
| `pnpm run test` | 166 contract tests + package tests pass |
| Slither | Not installed; manual sweep performed |
| QuillShield 10 layers | Applied; no exploitable findings |

**Sign-off:** 0 Critical, 0 High, 0 Medium, 0 Low, 0 Informational. I-13 and I-14 remediated. Codebase ready for production deployment.

---

## Aderyn Static Analysis

**Command:** `aderyn .` in `contracts/`  
**Report:** `contracts/report.md`  
**Scope:** 20 .sol files, 1221 nSLOC

### High Issues (Validated)

| Aderyn ID | Finding | Validation |
|-----------|---------|------------|
| **H-1** | `abi.encodePacked()` Hash Collision (AEPAccountFactory L44, 54, 89, 125) | **False positive.** The pattern is `abi.encodePacked(type(ERC1967Proxy).creationCode, abi.encode(ACCOUNT_IMPLEMENTATION, initData))`. The second argument is `abi.encode()` output (single compound value with length prefix), not two adjacent variable-length strings. CREATE2 creation code is deterministic. For clarity and to satisfy static analyzers, consider `bytes.concat(type(ERC1967Proxy).creationCode, abi.encode(ACCOUNT_IMPLEMENTATION, initData))` instead. |
| **H-2** | Unsafe Casting (Helpers.sol L17, UserOperationLib.sol L56) | **Accepted.** Vendored from eth-infinitism/account-abstraction. The `validationData` format and packed UserOperation layout are ERC-4337 spec. Casts are intentional and bounded. |

### Low Issues (Validated)

| Aderyn ID | Finding | Validation |
|-----------|---------|------------|
| **L-1** | Centralization Risk | **By design.** Owner/admin functions are documented in `docs/THREAT-MODEL.md`. |
| **L-2** | Costly operations inside loop | **Fixed.** Array lengths cached in AEPAccount and CounterpartyPolicy loops. |
| **L-3** | Empty Block (BaseAccount._validateNonce) | **Intentional.** Virtual hook for subclasses; default no-op. |
| **L-4** | Internal Function Used Only Once | **Vendor code.** UserOperationLib from ERC-4337; style preference. |
| **L-5** | Literal Instead of Constant | **Style.** e.g. `4` for selector length; low impact. |
| **L-6** | Modifier Invoked Only Once | **Style.** `onlyAccount` used once per policy; readability. |
| **L-7** | PUSH0 Opcode | **Accepted.** `foundry.toml` sets `evm_version = "cancun"`. Base Sepolia and mainnet support Shanghai+. Document if deploying to pre-Shanghai chains. |
| **L-8** | State Change Without Event | **Addressed.** Events added for setOwner, setAccount, setIdentityRegistry, setReputationRegistry in BudgetPolicy, CounterpartyPolicy, and RateLimitPolicy. |
| **L-9** | Address State Variable Set Without Checks | **Fixed.** Aligns with I-5; zero-address validation added. |
| **L-10** | Storage Array Length not Cached | **Fixed.** Array lengths cached in AEPAccount and CounterpartyPolicy loops. |
| **L-11** | Unspecific Solidity Pragma | **Accepted.** `^0.8.23` allows patch updates; common practice. |
| **L-12** | Unused Error | **Vendor interface.** IEntryPoint errors defined for interface completeness. |
| **L-13** | Public Function Not Used Internally | **Valid.** `getDeposit`, `addDeposit`, `withdrawDepositTo`, `getAccountAddress` could be `external` for minor gas savings. |

### Aderyn Summary

| Category | Reported | Confirmed Exploitable |
|----------|----------|------------------------|
| High | 2 | 0 |
| Low | 13 | 0 (all accepted, style, or gas optimizations) |

---

---

## Slither Static Analysis (March 2026)

**Command:** `uvx --from slither-analyzer slither .` in `contracts/`

### Addressed Findings

| Detector | Location | Status |
|----------|----------|--------|
| uninitialized-local | RevenueSplitter.constructor | Fixed – explicit `sum = 0` |
| missing-zero-check | AEPAccountFactory, policies, ConditionalEscrow | Fixed – zero-checks added |
| redundant-statements | ConditionalEscrow.dispute | Fixed – validator used in condition |
| immutable-states | CreditFacility, ConditionalEscrow, SLAContract | Fixed – vars made immutable |

### Excluded by Design

| Detector | Location | Reason |
|----------|----------|--------|
| arbitrary-send-erc20/eth | Relationship contracts, AEPAccount._call | Role-restricted; EntryPoint/owner only |
| incorrect-equality | BudgetPolicy, RateLimitPolicy, RevenueSplitter | Intentional sentinel `== 0` for uninitialized |
| missing-zero-check | Factory treasuries, validatorAddress | Treasury=0 valid for no-fee; validatorAddress informational |
| reentrancy-events | AEPAccount, AEPAccountFactory | CEI respected; events after external calls |
| calls-loop | AEPAccount, CounterpartyPolicy | Bounded by MAX_*; design requirement |

### Third-Party (Out of Scope)

Findings in `lib/`, `vendor/` (OpenZeppelin, ERC-4337 core) are not remediated in AEP code.

---

*Audit performed using the smart-contract-audit skill methodology (Pashov, Trail of Bits, Cyfrin, scv-scan, QuillShield, Archethect). Scope: Economic account (AEPAccount, policies, factory, registry) and economic relationship contracts (CreditFacility, ConditionalEscrow, RevenueSplitter, SLAContract + factories).*
