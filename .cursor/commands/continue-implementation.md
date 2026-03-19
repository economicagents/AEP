# continue-implementation

## 1. Audit Current Progress

- Review everything implemented on this branch — every modified, created, and deleted file.
- Compare the current state to the **full scope** of the original requirements (Linear issue, spec, `docs/BACKLOG.md`, `docs/ARCHITECTURE.md`, optional local implementation notes under `resources-internal/` if present, conversation context, or task description).
- Identify what is **done**, **partially done**, and **missing**.
- List any TODOs, placeholder values, hardcoded stubs, commented-out code, or incomplete logic in the changes.

## 2. Check for Blind Spots

Walk through each of these and flag anything unaddressed:

- **Error handling** — Are contract reverts and custom errors used correctly? Do SDK/CLI functions propagate errors with `throw` or `Promise.reject`? Are RPC failures, network timeouts, and provider errors handled and surfaced? Does the x402 interceptor return structured `PolicyCheckResult` for all failure paths?
- **Edge cases** — Empty arrays, `null`/`undefined`, zero amounts, boundary values, very large inputs, duplicate submissions, missing addresses. For config: missing keys, invalid JSON, wrong chain IDs. For contracts: zero address, zero amount, overflow/underflow.
- **Data integrity** — Are contract state transitions correct? Could any scenario produce inconsistent state, orphaned records, or stale references? For ERC-4337: verify nonce handling, signature validation, and EntryPoint interaction. For policy modules: verify budget tracking, rate limits, and counterparty checks.
- **Resource management** — Are HTTP clients, connections, or streams closed or aborted when appropriate? No obvious leaks in long-running SDK usage. For contracts: no unbounded loops or storage that could cause out-of-gas.
- **Validation** — Is input validated in SDK functions (address format, amount bounds, chain)? Is CLI input validated before RPC calls? Can malformed or malicious input slip through? Are tool/API parameters checked before use?
- **Authorization & security** — Are permission checks correct for account ownership and policy updates? Can a user access or mutate data they shouldn’t? Are private keys and secrets never logged? Is HTTPS used for RPC URLs? Does the implementation align with `docs/THREAT-MODEL.md`?
- **Contract safety** — Reentrancy guards where needed? Access control on owner-only functions? Safe math (Solidity 0.8+)? No delegatecall to untrusted targets? UUPS upgrade path restricted to owner?
- **Config & env alignment** — Do SDK config types match actual usage? Are `RPC_URL`, `PRIVATE_KEY`, `FACTORY_ADDRESS` (or equivalent) env overrides applied correctly? Are new config keys wired through where needed?
- **Module & dependency direction** — Does the SDK depend only on viem and minimal deps? Does the CLI depend on the SDK (not the reverse)? No circular imports. Contracts vendor ERC-4337 core; no unexpected external deps.
- **Side effects on existing features** — Could any change break or degrade existing behavior? Trace shared code, policy modules, factory deployment, and x402 interceptor flows.

## 3. Fill the Gaps

- For every gap, blind spot, or incomplete area identified above, **implement the fix or addition now**.
- Do not defer, leave TODOs, or note things for later — resolve them in this step.
- After each fix, verify it fits with the rest of the implementation.
- If filling a gap needs a design or architectural decision that isn’t clear from the codebase or docs, consult **AGENTS.md** and **CLAUDE.md** (if present) and follow existing patterns. When in doubt, choose the approach most consistent with the project and the spec.

## 4. End-to-End Walkthrough

- Trace every user-facing flow affected by this implementation from start to finish.
- For each flow: CLI/gateway input → config/validation → SDK/contract interaction → RPC/network → response/error → cleanup.
- Confirm that **every step** works, handles failure, and produces correct results.
- Pay attention to transitions between steps — where things often break.

## 5. Validation

Before signaling completion:

```bash
# Contracts
cd contracts
forge build
forge test -vvv
forge fmt --check

# SDK & CLI (from repo root)
pnpm install
pnpm run build
pnpm exec aep --help
```

For changes touching security, policy modules, or core account logic:

```bash
cd contracts
forge test -vvv
forge test --match-contract  # e.g. AEPAccount, BudgetPolicy, CounterpartyPolicy
```

If TypeScript/ESLint/Prettier are configured at the repo root:

```bash
pnpm run lint
pnpm run format -- --check
```

## 6. Self-Assessment

Before marking implementation complete:

- If I were a user relying on this in production, would I trust it?
- Is there anything I’m unsure about, skipped, or assumed works without verifying?
- Have I introduced any new compile warnings, type errors, or test failures?
- Does every change serve the original requirement, or did I add scope creep or unnecessary complexity?
- Does the change respect binary size and gas constraints (e.g. contract size limits, deployment cost)?
- Does the implementation align with `docs/THREAT-MODEL.md` and the AEP roadmap spec?

If any answer raises doubt, **go back and address it**. Do not finalize until every concern is resolved. Remember to use the continual-learning skill as you progress.
