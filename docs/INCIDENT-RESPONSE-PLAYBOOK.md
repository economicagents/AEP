# AEP Incident Response Playbook

Step-by-step procedures for security and operational incidents. Use with [THREAT-MODEL](THREAT-MODEL.md) and [COOKBOOK](COOKBOOK.md).

---

## Overview

### When to Use This Playbook

- Suspected key compromise or unauthorized access
- Runaway agent spending beyond limits
- Policy bypass attempt or unexpected transaction
- Credit facility default or SLA breach
- Stale or malicious provider index affecting resolution
- Any unexpected on-chain event (e.g. `Frozen`, `DefaultDeclared`, `BreachDeclared`)

### Escalation Path

1. **Immediate:** Execute kill switch if funds or control are at risk
2. **Short-term:** Gather state (logs, policy config, on-chain data)
3. **Post-incident:** Document, review policies, update allow/block lists

---

## Incident Types

### 1. Key Compromise

**Indicators:** Unauthorized transactions, policy changes, or upgrade from unknown source.

**Steps:**

1. **Immediate — freeze account**
   ```bash
   aep freeze
   ```
   Or for specific account: `aep freeze --account 0x...` (requires owner key)

2. **Verify freeze**
   - Check account is frozen: `aep policy-get` or on-chain `frozen()`

3. **Rotate keys**
   - Generate new owner key (secure hardware wallet recommended)
   - Deploy new account or migrate via `setOwner` (requires current owner)
   - Document key rotation in audit trail

4. **Post-incident**
   - Review all policies for unauthorized changes
   - Update counterparty allow/block lists if suspect addresses were added
   - Re-run security checklist from [THREAT-MODEL](THREAT-MODEL.md)

**Reference:** [THREAT-MODEL § Key Compromise](THREAT-MODEL.md#3-key-compromise)

---

### 2. Runaway Agent

**Indicators:** Agent repeatedly spending, approaching or exceeding daily/weekly caps; unexpected high transaction volume.

**Steps:**

1. **Immediate — freeze account**
   ```bash
   aep freeze
   ```

2. **Review policy state**
   ```bash
   aep policy-get
   ```

3. **Adjust budget caps**
   - Reduce `maxPerTx`, `maxDaily`, `maxWeekly` if needed
   - Consider `aep policy-set -m <module> --max-per-tx 100000 --max-daily 5000000 --max-weekly 20000000`

4. **Unfreeze when ready**
   ```bash
   aep freeze --unfreeze
   ```

5. **Post-incident**
   - Review agent logic (prompt injection, loop bugs)
   - Ensure x402 interceptor returns structured rejection; agent should handle `BUDGET_EXCEEDED`
   - Consider RateLimitPolicy for max transactions per window

**Reference:** [THREAT-MODEL § Runaway Agent](THREAT-MODEL.md#4-runaway-agent)

---

### 3. Policy Bypass Attempt

**Indicators:** Transaction bypassed policy checks; unexpected recipient or amount.

**Steps:**

1. **Assess**
   - Owner-direct `execute` bypasses `validateUserOp` but not `frozen` check
   - If EntryPoint-originated: policy modules should have run; investigate calldata decoding

2. **Review**
   - Check `PaymentDecoder` patterns: only `execute`/`executeBatch` and `transfer`/`transferFrom` recognized
   - Unrecognized calldata yields 0 amount (passes budget) but may fail counterparty

3. **Mitigate**
   - Add suspect addresses to block list: `aep counterparty add-block 0x... -m <module>`
   - Switch to allow list mode if needed: `aep counterparty set-use-allow-list true -m <module>`

4. **Post-incident**
   - Document transaction hash and calldata for analysis
   - Consider stricter counterparty policy

**Reference:** [THREAT-MODEL § Policy Bypass](THREAT-MODEL.md#1-policy-bypass)

---

### 4. Credit Facility Default

**Indicators:** `DefaultDeclared` event; borrower missed repayment deadline.

**Steps:**

1. **Check state**
   ```bash
   aep credit state <facility-address>
   ```
   Or MCP: `credit_state` with facility address

2. **Lender actions**
   - Facility is defaulted; lender can withdraw remaining balance
   - Submit negative feedback to ERC-8004 reputation registry (off-chain process)

3. **Borrower**
   - Only the lender can call `declareDefault` after the repayment deadline
   - Lender submits negative feedback separately

4. **Post-incident**
   - Review counterparty allow/block lists if borrower should be blocked
   - Update min-reputation for future facilities

**Reference:** [THREAT-MODEL § Credit Facility](THREAT-MODEL.md#8-economic-relationship-contracts)

---

### 5. SLA Breach

**Indicators:** `BreachDeclared` event; consumer claims provider failed SLA.

**Steps:**

1. **Check state**
   ```bash
   aep sla state <sla-address>
   ```
   Or MCP: `sla_state`

2. **Verify**
   - Consumer must provide valid `requestHash` with response < threshold
   - Validator must be honest; trust assumption documented

3. **Provider**
   - Dispute flow if validator collusion suspected (documented trust assumption)
   - Stake may be slashed to consumer

4. **Post-incident**
   - Add suspect addresses to block list if needed
   - Review validator trust

**Reference:** [THREAT-MODEL § SLA Contract](THREAT-MODEL.md#8-economic-relationship-contracts)

---

### 6. Stale or Malicious Provider Index

**Indicators:** Resolution returns wrong provider; outdated prices; fake endpoints.

**Steps:**

1. **Re-sync index**
   ```bash
   aep-index sync --probe-x402
   ```
   Use `--probe-x402` to validate endpoint and record price

2. **Block malicious provider**
   ```bash
   aep counterparty add-block <payment-wallet-address> -m <module>
   ```

3. **On-demand probe**
   ```bash
   aep provider probe <url>
   ```
   Or `aep provider probe --agent-id <id>` (lookup from index)

4. **Post-incident**
   - Document sync frequency; run `aep-index sync` periodically (cron)
   - Review reputation and validation filters

**Reference:** [THREAT-MODEL § Stale or Malicious Provider Index](THREAT-MODEL.md#6-stale-or-malicious-provider-index)

---

## Checklists

### Pre-Incident (Operational Readiness)

See [THREAT-MODEL § Security Checklist](THREAT-MODEL.md#security-checklist) for the full list. Key items:

- [ ] Owner key stored in hardware wallet or secure enclave
- [ ] Kill switch tested and accessible (`aep freeze` works)
- [ ] Budget caps set appropriately for agent's task
- [ ] Counterparty allow/block lists and min-reputation (if used) reviewed
- [ ] Rate limit configured for expected transaction volume
- [ ] Provider index synced regularly (intent resolution)
- [ ] Economic graph synced regularly (`aep graph sync`) for Phase 4 analytics
- [ ] On-chain event monitor running (`aep monitor`) for alerts

### Post-Incident

- [ ] Document incident and timeline
- [ ] Audit trail: transaction hashes, policy state before/after
- [ ] Policy review: adjust caps, allow/block lists, min-reputation
- [ ] Key rotation if compromise suspected
- [ ] Update this playbook if new procedures identified

---

## References

- [THREAT-MODEL](THREAT-MODEL.md) — Attack surfaces and mitigations
- [COOKBOOK](COOKBOOK.md) — Quick reference, commands, config
- [BACKLOG](BACKLOG.md) — Unfinished work, limitations

### CLI Commands

| Command | Purpose |
|--------|---------|
| `aep freeze` | Emergency freeze (kill switch) |
| `aep freeze --unfreeze` | Unfreeze after incident resolution |
| `aep policy-get` | Get current policy state |
| `aep policy-set` | Set budget caps |
| `aep counterparty add-block 0x...` | Block address |
| `aep credit state <addr>` | Credit facility state |
| `aep sla state <addr>` | SLA contract state |
| `aep-index sync --probe-x402` | Re-sync provider index with probe |
| `aep provider probe <url>` | On-demand x402 endpoint probe |
| `aep monitor` | Run on-chain event monitor (alerts) |
