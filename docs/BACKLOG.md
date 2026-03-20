# Limitations & deferred work

What is **not** implemented yet, and **known gaps** in behavior — for integrators and auditors. This is not a marketing status page; for a concise **shipped** overview use the repository **README** at repo root (section **Implementation Progress**).

**Also:** [DOCUMENT-MAP.md](DOCUMENT-MAP.md) · [guides/deployment.md](guides/deployment.md) · [THREAT-MODEL.md](THREAT-MODEL.md) (trust assumptions & mitigations) · [COOKBOOK.md](COOKBOOK.md) (operations).

---

## Deferred

- **PostgreSQL + pgvector:** Index uses local JSON store + SQLite `search.db`.
- **Python SDK:** TypeScript SDK is the supported path.
- **Continuous provider health monitor:** On-demand probe only (CLI + API); no 24/7 daemon.
- **Operator / session keys:** Owner-only path implemented; broader delegation [documented](THREAT-MODEL.md) but not built.
- **Formal verification:** Handoff & tooling — [formal-verification.md](formal-verification.md). (AI-assisted [audit report](../audit-report.md) is not a substitute for a third-party audit.)

**Out of scope (not planned here):** Advanced financial products (e.g. agent insurance, generic lending, yield strategies).

---

## Known limitations

- **Policy module interface:** Spec-style `lastRejectionReason()` on `IPolicyModule` differs from shipped feedback via SDK `checkPolicyDetailed` / `PolicyCheckResult`. Behavior is covered; the interface shape differs.
- **`aep resolve --api-url`:** Does not auto-complete x402 payment; HTTP 402 requires a payment flow or x402-aware client.
- **Indexer:** `better-sqlite3` (v12+) and `sqlite-vec` are optional. If missing, resolver falls back to legacy keyword discovery.
- **CreditFacility `declareDefault`:** Lender-only; not permissionless after the deadline.
- **Intent resolution & MEV:** Choosing a provider is visible; no protocol-level private-order-flow or encrypted intents.

---

## Security & trust

Full assumptions, attack surfaces, and checklist: **[THREAT-MODEL.md](THREAT-MODEL.md)**.
