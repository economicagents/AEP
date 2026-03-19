/** Navigation structure for sidebar (client-safe, no Node.js deps) */
export interface NavSection {
  label: string;
  href?: string;
  items: Array<{ href: string; label: string }>;
}

const SKILL_NAMES = [
  "aep-budget",
  "aep-rate-limit",
  "aep-counterparty",
  "aep-x402",
  "aep-deploy",
  "aep-integration",
  "aep-indexer",
  "aep-intent-resolution",
  "aep-relationships",
  "aep-monitor",
  "aep-fleet",
  "aep-graph",
  "aep-monetization",
  "aep-key-management",
  "aep-formal-verification",
];

export const DOC_NAV: NavSection[] = [
  {
    label: "Getting Started",
    href: "/docs/getting-started/overview",
    items: [
      { href: "/docs/getting-started/overview", label: "Overview" },
      { href: "/docs/getting-started/quickstart", label: "Quick Start" },
      { href: "/docs/getting-started/supported-chains", label: "Supported Chains" },
    ],
  },
  {
    label: "CLI",
    href: "/docs/cli/installation",
    items: [
      { href: "/docs/cli/installation", label: "Installation" },
      { href: "/docs/cli/commands", label: "Commands Reference" },
    ],
  },
  {
    label: "SDK",
    href: "/docs/sdk/installation",
    items: [
      { href: "/docs/sdk/installation", label: "Installation" },
      { href: "/docs/sdk/usage", label: "Usage" },
      { href: "/docs/sdk/api", label: "API Reference" },
    ],
  },
  {
    label: "Skills",
    href: "/docs/skills/overview",
    items: [
      { href: "/docs/skills/overview", label: "Overview" },
      { href: "/docs/skills/installing", label: "Installing" },
      { href: "/docs/skills/available", label: "Available Skills" },
      ...SKILL_NAMES.map((n) => ({
        href: `/docs/skills/${n}`,
        label: n.replace("aep-", ""),
      })),
    ],
  },
  {
    label: "Packages",
    href: "/docs/packages/api",
    items: [
      { href: "/docs/packages/api", label: "API Server" },
      { href: "/docs/packages/indexer", label: "Indexer" },
      { href: "/docs/packages/graph", label: "Graph" },
      { href: "/docs/packages/monitor", label: "Monitor" },
      { href: "/docs/packages/resolver", label: "Resolver" },
    ],
  },
  {
    label: "Guides",
    href: "/docs/guides/deployment",
    items: [
      { href: "/docs/guides/deployment", label: "Deployment" },
      { href: "/docs/guides/integration", label: "Integration" },
      { href: "/docs/guides/monetization", label: "Monetization" },
    ],
  },
  {
    label: "Reference",
    href: "/docs/reference/rest-api",
    items: [
      { href: "/docs/reference/rest-api", label: "REST API" },
      { href: "/docs/reference/mcp", label: "MCP Tools" },
      { href: "/docs/reference/intent-schema", label: "Intent Schema" },
      { href: "/docs/reference/architecture", label: "Architecture" },
      { href: "/docs/reference/threat-model", label: "Threat Model" },
    ],
  },
];
