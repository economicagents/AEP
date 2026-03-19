import GithubSlugger from "github-slugger";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { GITHUB_DOCS_TREE } from "./github";
import { DOC_CONTENT } from "./docs-content.generated";

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

function getHeadingText(node: { children?: Array<{ type: string; value?: string }> }): string {
  if (!node.children) return "";
  return node.children
    .filter((c): c is { type: "text"; value: string } => c.type === "text")
    .map((c) => c.value)
    .join("");
}

export function extractHeadings(markdown: string): TocItem[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown);
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  visit(tree, "heading", (node) => {
    const depth = node.depth;
    const text = getHeadingText(node);
    if (text) {
      items.push({ id: slugger.slug(text), text, depth });
    }
  });
  return items;
}

/** Slug (path) -> relative file path from docs/ or skills/ */
const SLUG_TO_FILE: Record<string, string> = {
  // Getting Started
  "getting-started/overview": "getting-started/overview.md",
  "getting-started/quickstart": "getting-started/quickstart.md",
  "getting-started/supported-chains": "getting-started/supported-chains.md",
  // CLI
  "cli/installation": "cli/installation.md",
  "cli/commands": "cli/commands.md",
  // SDK
  "sdk/installation": "sdk/installation.md",
  "sdk/usage": "sdk/usage.md",
  "sdk/api": "sdk/api.md",
  // Skills (overview pages)
  "skills/overview": "skills/overview.md",
  "skills/installing": "skills/installing.md",
  "skills/available": "skills/available.md",
  // Packages
  "packages/api": "packages/api.md",
  "packages/indexer": "packages/indexer.md",
  "packages/graph": "packages/graph.md",
  "packages/monitor": "packages/monitor.md",
  "packages/resolver": "packages/resolver.md",
  // Guides
  "guides/deployment": "guides/deployment.md",
  "guides/integration": "guides/integration.md",
  "guides/monetization": "guides/monetization.md",
  // Reference
  "reference/rest-api": "reference/rest-api.md",
  "reference/mcp": "reference/mcp.md",
  "reference/intent-schema": "reference/intent-schema.md",
  "reference/architecture": "reference/architecture.md",
  "reference/threat-model": "reference/threat-model.md",
};

export const SLUG_TO_TITLE: Record<string, string> = {
  "getting-started/overview": "Overview",
  "getting-started/quickstart": "Quick Start",
  "getting-started/supported-chains": "Supported Chains",
  "cli/installation": "Installation",
  "cli/commands": "Commands Reference",
  "sdk/installation": "Installation",
  "sdk/usage": "Usage",
  "sdk/api": "API Reference",
  "skills/overview": "Overview",
  "skills/installing": "Installing Skills",
  "skills/available": "Available Skills",
  "packages/api": "API Server",
  "packages/indexer": "Indexer",
  "packages/graph": "Graph",
  "packages/monitor": "Monitor",
  "packages/resolver": "Resolver",
  "guides/deployment": "Deployment",
  "guides/integration": "Integration",
  "guides/monetization": "Monetization",
  "reference/rest-api": "REST API",
  "reference/mcp": "MCP Tools",
  "reference/intent-schema": "Intent Schema",
  "reference/architecture": "Architecture",
  "reference/threat-model": "Threat Model",
  // Skills (dynamic)
  "skills/aep-budget": "Budget",
  "skills/aep-rate-limit": "Rate Limit",
  "skills/aep-counterparty": "Counterparty",
  "skills/aep-x402": "x402",
  "skills/aep-deploy": "Deploy",
  "skills/aep-integration": "Integration",
  "skills/aep-indexer": "Indexer",
  "skills/aep-intent-resolution": "Intent Resolution",
  "skills/aep-relationships": "Relationships",
  "skills/aep-monitor": "Monitor",
  "skills/aep-fleet": "Fleet",
  "skills/aep-graph": "Graph",
  "skills/aep-monetization": "Monetization",
  "skills/aep-key-management": "Key Management",
  "skills/aep-formal-verification": "Formal Verification",
};

/** Skill slugs: skills/<name> -> skills/<name>/SKILL.md */
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

/** Internal docs (repo-only, linked to GitHub when referenced from docs site) */
export const INTERNAL_DOCS: Record<string, string> = {
  backlog: "BACKLOG.md",
  "incident-response-playbook": "INCIDENT-RESPONSE-PLAYBOOK.md",
  publishing: "PUBLISHING.md",
  "testnet-deployment": "TESTNET-DEPLOYMENT.md",
  "mainnet-readiness": "MAINNET-READINESS.md",
};

function isSkillSlug(slug: string): boolean {
  return slug.startsWith("skills/") && SKILL_NAMES.includes(slug.replace("skills/", ""));
}

export function getDocBySlug(slug: string): string | null {
  return DOC_CONTENT[slug] ?? null;
}

export function getAllSlugs(): string[] {
  const docSlugs = Object.keys(SLUG_TO_FILE);
  const skillSlugs = SKILL_NAMES.map((n) => `skills/${n}`);
  return [...docSlugs, ...skillSlugs];
}

/** Resolve doc link: returns /docs/slug for user-facing, or GitHub URL for internal */
export function resolveDocHref(href: string): string {
  const [path, hash] = href.split("#");
  const base = path.replace(/\.md$/i, "").replace(/^\//, "").toLowerCase();
  const hashPart = hash ? `#${hash}` : "";

  // Map legacy flat slugs to new paths
  const legacyMap: Record<string, string> = {
    quickstart: "getting-started/quickstart",
    cookbook: "guides/integration",
    deployment: "guides/deployment",
    architecture: "reference/architecture",
    "threat-model": "reference/threat-model",
    api: "reference/rest-api",
  };
  const slug = legacyMap[base] ?? base;

  if (slug in SLUG_TO_FILE || isSkillSlug(slug)) {
    return `/docs/${slug}${hashPart}`;
  }
  const filename = INTERNAL_DOCS[slug];
  if (filename) return `${GITHUB_DOCS_TREE}/${filename}${hashPart}`;
  return `/docs/${slug}${hashPart}`;
}

/** Extract first ~155 chars for meta description, stripping markdown. */
export function extractDocDescription(content: string, maxLen = 155): string {
  const stripped = content
    .replace(/^#+\s.*$/gm, "")
    .replace(/^>\s?\[!.*\].*$/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/^---$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return "AEP documentation.";
  const first = stripped.slice(0, maxLen);
  return first.length < stripped.length ? `${first}…` : first;
}

