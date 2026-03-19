# AEP Backlog

Unfinished work, deferred items, known limitations, and trust assumptions. See [COOKBOOK](COOKBOOK.md) for operational reference.

---

## Implementation Status (March 2026)

| Scope | Status |
|-------|--------|
| **Economic Account** | **Complete** |
| **Intent Resolution** | **Complete** |
| **Economic Relationships** | **Complete** |
| **Monetization** — Treasury, fees, x402 paywall | **Complete** |
| **Agent Economic Graph** | **Complete** |

### Completed

- **Smart contracts:** AEPAccount, BudgetPolicy, CounterpartyPolicy, RateLimitPolicy, AEPAccountFactory, PolicyRegistry, CreditFacility, ConditionalEscrow, RevenueSplitter, SLAContract
- **Off-chain:** Provider index, capability matching, resolver, benchmark harness
- **SDK & integrations:** TypeScript SDK, x402 interceptor, MCP (get_balance, get_policy_state, set_budget_caps, check_counterparty, resolve_intent, get_analytics, get_credit_score, get_recommendations, fleet_summary, fleet_accounts, fleet_alerts, credit_state, escrow_state, splitter_state, sla_state), CLI, OpenClaw skills, REST API (POST /resolve, GET /analytics/*, GET /analytics/pro/*, GET /fleet/*, POST /probe, POST /graphql)
- **Security:** Threat model, kill switch, AI-assisted contract review (post-remediation, see audit-report.md), FV in progress
- **Monetization:** Treasury, credit origination fee, escrow/SLA setup fees, API x402 paywall (Standard + Premium tiers), Fleet management ($500/mo), Analytics Pro ($50/mo)
- **x402 paywall verification:** paymentMiddleware uses `findMatchingRoute(routePatterns, c.req.path, method)`; keys `/resolve` and `/resolve/premium` match POST routes correctly

---

## Phase 4 Complete

### Agent Economic Graph

- **Economic Graph DB (SV-05):** Done — `packages/graph`, `aep graph sync`, SQLite graph.db
- **Credit Scoring Engine (SV-06):** Done — `computeCreditScore` in @economicagents/graph
- **Agent Analytics API (SV-07):** Done — REST + GraphQL in packages/api
- **Recommendation Engine:** Done — `getRecommendations`, integrated into resolver
- **Recommendation boost wired:** API, CLI, MCP pass accountAddress and graphPath to resolver for personalized provider ranking
- **SLA event indexing:** Staked, BreachDeclared, Unstaked events synced to graph.db; credit score includes slaBreachHistory factor
- **ConditionalEscrow milestones:** Multi-milestone escrow with partial release; `createEscrowWithMilestones`, `submitForValidation(requestHash, index)`, `release(index)`. CLI `aep escrow create --milestone-amounts "100,200,300"` for multi-milestone creation

Deferred: Financial products (agent insurance, lending, yield strategies)

---

---

## Completed (March 2026)

### Security & Operations

- **SEC-05 Monitoring & Alerting:** Done — `packages/monitor`, `aep monitor`, polls for Frozen, DefaultDeclared, BreachDeclared, PolicyRecordSpendFailed, UserOperationRevertReason; stdout + optional webhook
- **SEC-06 Incident Response Plan:** Done — [docs/INCIDENT-RESPONSE-PLAYBOOK.md](INCIDENT-RESPONSE-PLAYBOOK.md)

### Monetization

- **Fleet management (enterprise):** Done — $500/mo. Config `fleets` in ~/.aep/config.json. API GET /fleet/:id/summary, /accounts, /alerts (AEP_FLEET_API_KEY). CLI: aep fleet list, summary, alerts, freeze. MCP: fleet_summary, fleet_accounts, fleet_alerts. Alerts returns real on-chain events (Frozen, DefaultDeclared, BreachDeclared, etc.)
- **Analytics dashboard pro:** Done — $50/mo. API GET /analytics/pro/account, /credit-score, /export, /trends (AEP_ANALYTICS_PRO_API_KEY). Period filter (7d, 30d, 90d), CSV export
- **Provider health probe (on-demand):** Done — `aep provider probe <url>`, `aep provider probe --agent-id <id>`, POST /probe, POST /probe/batch
- **Premium resolve tier:** Done — POST /resolve/premium ($0.02); Standard POST /resolve ($0.005)

---

## Deferred

- **PostgreSQL + pgvector:** Index uses local JSON store + SQLite search.db
- **Python SDK (SDK-08):** TypeScript SDK is primary
- **Continuous provider health monitor (SV-04):** On-demand probe implemented (CLI + API); no 24/7 daemon
- **Operator/session keys (SC-11):** Owner-only implemented; operator and session key delegation documented but not implemented

---

## Known Limitations

- **IPolicyModule spec:** Original spec defines `lastRejectionReason()` on interface; implementation uses SDK `checkPolicyDetailed` / `PolicyCheckResult` for agent feedback. Behavior covered; interface differs.
- **CLI `aep resolve --api-url`:** Does not auto-complete x402 payment; 402 responses require manual payment or x402 client.
- **Indexer:** `better-sqlite3` (v12+) and `sqlite-vec` are optional dependencies. If unavailable, the resolver falls back to legacy keyword discovery.
- **CreditFacility declareDefault:** Lender-only (not permissionless). Only the lender can call `declareDefault` after repayment deadline.
- **npm publication:** On hold while repo is private.
- **Front-running / MEV:** Intent resolution reveals provider choice; no protocol-level mitigation. Private mempools or encrypted intents are out of scope.

---

## Trust Assumptions & Security Checklist

From [THREAT-MODEL](THREAT-MODEL.md):

- **Conditional Escrow:** Provider or consumer could collude with validator. Use trusted validators.
- **SLA Contract:** Provider could collude with validator to avoid breach. Validator must be honest.
- **Revenue Splitter:** Recipients must verify weights before funding; wrong address at deploy sends funds to wrong address.
- **Credit Facility:** Lender can freeze facility arbitrarily. Borrower chooses counterparties.
- **Security checklist:** See [THREAT-MODEL § Security Checklist](THREAT-MODEL.md#security-checklist) for the canonical list.

---

## Formal Verification Handoff

See [formal-verification.md](formal-verification.md) for the public handoff checklist (tooling, specs, CI).

Audit complete; FV in progress.
