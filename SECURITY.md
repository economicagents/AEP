# Security

## Reporting a Vulnerability

If you discover a security vulnerability in AEP, please report it privately.

**Do not** open a public GitHub issue for security vulnerabilities.

### How to Report

1. Open a [GitHub Security Advisory](https://github.com/economicagents/AEP/security/advisories/new) (private) with a description of the vulnerability and steps to reproduce. Alternatively, email the maintainers if you cannot use GitHub.
2. Allow reasonable time for a fix before disclosure.
3. We will acknowledge receipt and provide status updates.

### Security review artifact

The repository includes [`audit-report.md`](audit-report.md), an **AI-assisted** smart contract review with documented scope and limitations. It does **not** replace an independent third-party audit.

### Scope

- Smart contracts (AEPAccount, policy modules, relationship contracts)
- SDK, CLI, MCP server, REST API
- Deployment and configuration flows

### Out of Scope

- Issues in vendored dependencies (report upstream)
- Issues requiring physical access or social engineering
- Third-party services we do not control

### Recognition

We appreciate responsible disclosure. Contributors who report valid vulnerabilities may be acknowledged in release notes (with their consent).
