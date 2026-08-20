/** Navigation structure for sidebar (client-safe, no Node.js deps) */

export interface NavLink {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

export interface NavSection {
  label: string;
  href?: string;
  items: NavLink[];
  /** Optional nested group (e.g. individual skill pages under Skills). */
  groups?: NavGroup[];
}

const SKILL_NAMES = [
  "aep-budget",
  "aep-rate-limit",
  "aep-counterparty",
  "aep-x402",
  "aep-mpp",
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
] as const;

const SKILL_LINKS: NavLink[] = SKILL_NAMES.map((name) => ({
  href: `/docs/skills/${name}`,
  label: name.replace("aep-", ""),
}));

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
    ],
    groups: [
      {
        label: "Skill Reference",
        items: SKILL_LINKS,
      },
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
      { href: "/docs/guides/cookbook", label: "Cookbook" },
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
      { href: "/docs/reference/document-map", label: "Document Map" },
      { href: "/docs/reference/backlog", label: "Backlog" },
    ],
  },
];

/** Flatten section items and optional groups for lookup (breadcrumbs, etc.). */
export function flattenSectionLinks(section: NavSection): NavLink[] {
  const grouped = section.groups?.flatMap((group) => group.items) ?? [];
  return [...section.items, ...grouped];
}

export function findNavMatch(pathname: string): { section: NavSection; item: NavLink } | null {
  const path = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  if (!path) return null;

  for (const section of DOC_NAV) {
    for (const item of flattenSectionLinks(section)) {
      const itemPath = item.href.replace(/^\/docs\/?/, "").replace(/\/$/, "");
      if (path === itemPath || path.startsWith(itemPath + "/")) {
        return { section, item };
      }
    }
  }
  return null;
}
