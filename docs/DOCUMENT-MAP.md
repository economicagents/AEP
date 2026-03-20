# AEP document map (public)

Indexes **only** documentation that ships in the OSS repo under `docs/`. It does **not** include maintainer-only runbooks or GTM planning.

| Need | Canonical location |
|------|-------------------|
| **Chain deploy** — Sepolia & mainnet addresses, validation, smoke, sign-off | [guides/deployment.md](guides/deployment.md) |
| **Deferred work & known limitations** | [BACKLOG.md](BACKLOG.md) |
| **Incidents & security ops** | [INCIDENT-RESPONSE-PLAYBOOK.md](INCIDENT-RESPONSE-PLAYBOOK.md) |
| **Threat model** | [THREAT-MODEL.md](THREAT-MODEL.md) |
| **Day-to-day integration** | [COOKBOOK.md](COOKBOOK.md) |

**Maintainers:** Hosted deploy bundles, EC2 runbooks, AWS notes, and GTM/engineering routing live in the private repo [**economicagents/AEP-Internal**](https://github.com/economicagents/AEP-Internal) (org access required). Entry point there: **`DOCUMENT-MAP.md`** at repo root and **`deployment-hosted/docs/runbook.md`**. Keep chain truth and public architecture in this `docs/` tree; do not publish internal host inventory in OSS.
