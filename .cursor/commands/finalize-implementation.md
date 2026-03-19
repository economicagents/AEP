# finalize-implementation

## 1. Verify Completeness

- Review every change on the current branch against the original requirements (spec, `docs/BACKLOG.md`, `docs/ARCHITECTURE.md`, optional local notes under `resources-internal/` if present, task description, or conversation context).
- Trace the full user-facing flow end-to-end: CLI/SDK input → config/validation → SDK/contract interaction → RPC/network → response/error → cleanup.
- Confirm nothing is left as a TODO, placeholder, hardcoded stub, or partial implementation.
- Check that all acceptance criteria are met — not just the happy path but error states, empty states, and edge cases.
- For config changes, verify types in `packages/sdk/src/types.ts` and that env overrides are applied where needed.
- For SDK/CLI changes, verify exports in `packages/sdk/src/index.ts` and CLI command wiring in `packages/cli/src/cli.ts`.
- For contract changes, verify policy module registration, factory wiring, and EntryPoint integration.

## 2. Lint, Format & Build

- Run lints on **every file modified or created** on this branch.
- Run `forge fmt --check` in `contracts/` — Solidity formatting must pass.
- If ESLint/Prettier are configured, run them on TypeScript files.
- **Resolve every error and warning** — do not suppress, ignore, or cast away type issues unless there is a documented, pre-existing exception.
- Run the full project build and confirm it **completes with zero errors**:

```bash
# Contracts
cd contracts
forge build
forge fmt --check

# SDK & CLI (from repo root)
pnpm install
pnpm run build
```

- If changes touch specific subsystems, run the relevant checks:

```bash
cd contracts
forge test --match-contract AEPAccount    # account-specific
forge test --match-contract BudgetPolicy  # policy-specific
forge test --match-contract CounterpartyPolicy
```

## 3. Testing

Add or update tests in proportion to the **risk and scope** of the changes:

- **Contract unit tests** — For new or modified Solidity functions, policy modules, and helpers. Cover normal inputs, boundary values, zero amounts, and expected reverts. Use `forge test` with `-vvv` for verbosity.
- **Contract integration tests** — For AEPAccount + policy modules, factory deployment, and EntryPoint flows. Verify policy checks, budget tracking, and counterparty filtering. Use `test/` fixtures and mocks (e.g. `MockERC8004.sol`).
- **SDK tests** — For new or modified SDK functions (account creation, policy checks, x402 interceptor). Cover success, RPC failures, and invalid inputs. Use Vitest or similar if configured.
- **Regression tests** — For shared code, policy modules, factory, or x402 interceptor that might be affected. Ensure existing behavior is unchanged.

All tests must **pass cleanly** before proceeding:

```bash
cd contracts
forge test -vvv
```

Fix any failures introduced by the changes — do not skip or disable tests.

## 4. Organize & Commit

- Review the full diff of the current branch (`git diff`, `git status`).
- Group changes into **logical, self-contained commits** based on what they accomplish — not by file type or timestamp. Good groupings:
  - Contract changes (account, policy modules, factory) + related tests
  - SDK changes (account, types, x402 interceptor) + related tests
  - CLI changes (commands, config) + related tests
  - Config types + env overrides
  - New or updated test files (group with implementation or as a separate commit if clearer)
  - Formatting or minor cleanup (separate from functional changes)
- Write a **concise, descriptive commit message** for each group following the project's conventions. Each message should make it clear *what* changed and *why* at a glance.
- Stage and commit each group. Do **not** push.

## 5. Self-Assessment

Before marking implementation complete:

- If I were a user relying on this in production, would I trust it?
- Is there anything I'm unsure about, skipped, or assumed works without verifying?
- Have I introduced any new compile warnings, type errors, or test failures?
- Does every change serve the original requirement, or did I add scope creep or unnecessary complexity?
- Does the change respect contract size limits and gas constraints (deployment cost, per-tx gas)?
- Does the implementation align with `docs/THREAT-MODEL.md` and the AEP roadmap spec?

If any answer raises doubt, **go back and address it**. Do not finalize until every concern is resolved. Remember to use the continual-learning skill after you finish and update all documentation appropriately to keep our source of truth accurate and up to date.