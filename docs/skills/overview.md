# Skills overview

**Optional:** Markdown skill packs for **OpenClaw**, **Cursor** (with MCP), and similar AI tooling. You do **not** need skills to integrate via the SDK, CLI, or contracts.

AEP skills bundle AEP-specific context and workflows for those environments.

## What Are Skills?

Each skill is a `SKILL.md` file with:

- **When to use** — Triggers and user intents
- **Quick start** — Commands and examples
- **References** — Links to detailed docs

Skills are designed for both human developers and AI agents. They follow a consistent structure so agents can reliably invoke the right workflows.

## Compatibility

| Platform | Support |
|----------|---------|
| **OpenClaw** | Copy or symlink skills to `~/.openclaw/skills/` |
| **Cursor** | MCP server provides tools; skills provide context |
| **Other agents** | SKILL.md is plain markdown; parse as needed |

## Available Skills

See [Available Skills](skills/available) for the full list of 15 skills.

## Next Steps

- [Installing Skills](skills/installing) — How to install for OpenClaw and Cursor
- [aep-budget](skills/aep-budget) — Budget caps and policy check
