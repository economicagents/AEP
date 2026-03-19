# Formal verification handoff

Future work: encode and prove invariants for core policy and account logic.

1. Choose an FV toolchain (e.g. Halmos, Certora, or another suitable prover).
2. Set up the proving environment against the pinned Solidity compiler and build layout in `contracts/`.
3. Encode invariants for `AEPAccount`, `BudgetPolicy`, `CounterpartyPolicy`, and `RateLimitPolicy` (and any extensions you scope).
4. Run the prover and fix any counterexamples or spec gaps.
5. Add a CI job once the toolchain and specs are stable.

See [BACKLOG.md](BACKLOG.md) for status relative to other deferred work.
