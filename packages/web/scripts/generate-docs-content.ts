/**
 * Pre-bundles all doc content at build time for Cloudflare Workers deployment.
 * Workers have no Node.js fs API; this script runs in Node and outputs a module
 * that lib/docs.ts imports at runtime.
 */
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const SLUG_TO_FILE: Record<string, string> = {
  "getting-started/overview": "getting-started/overview.md",
  "getting-started/quickstart": "getting-started/quickstart.md",
  "getting-started/supported-chains": "getting-started/supported-chains.md",
  "cli/installation": "cli/installation.md",
  "cli/commands": "cli/commands.md",
  "sdk/installation": "sdk/installation.md",
  "sdk/usage": "sdk/usage.md",
  "sdk/api": "sdk/api.md",
  "skills/overview": "skills/overview.md",
  "skills/installing": "skills/installing.md",
  "skills/available": "skills/available.md",
  "packages/api": "packages/api.md",
  "packages/indexer": "packages/indexer.md",
  "packages/graph": "packages/graph.md",
  "packages/monitor": "packages/monitor.md",
  "packages/resolver": "packages/resolver.md",
  "guides/deployment": "guides/deployment.md",
  "guides/integration": "guides/integration.md",
  "guides/monetization": "guides/monetization.md",
  "reference/rest-api": "reference/rest-api.md",
  "reference/mcp": "reference/mcp.md",
  "reference/intent-schema": "reference/intent-schema.md",
  "reference/architecture": "ARCHITECTURE.md",
  "reference/threat-model": "THREAT-MODEL.md",
};

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

function getRepoRoot(): string {
  const candidates = [join(process.cwd(), "..", ".."), process.cwd()];
  for (const dir of candidates) {
    if (existsSync(join(dir, "docs", "COOKBOOK.md"))) return dir;
  }
  return process.cwd();
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return match ? content.slice(match[0].length) : content;
}

const repoRoot = getRepoRoot();
const docsDir = join(repoRoot, "docs");
const skillsDir = join(repoRoot, "skills");

const content: Record<string, string> = {};

for (const [slug, filename] of Object.entries(SLUG_TO_FILE)) {
  const filepath = join(docsDir, filename);
  if (existsSync(filepath)) {
    content[slug] = stripFrontmatter(readFileSync(filepath, "utf-8"));
  }
}

for (const name of SKILL_NAMES) {
  const slug = `skills/${name}`;
  const filepath = join(skillsDir, name, "SKILL.md");
  if (existsSync(filepath)) {
    content[slug] = stripFrontmatter(readFileSync(filepath, "utf-8"));
  }
}

const outPath = join(process.cwd(), "lib", "docs-content.generated.ts");
const entries = Object.entries(content)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  .join(",\n");

writeFileSync(
  outPath,
  `/** Auto-generated at build time. Do not edit. */\nexport const DOC_CONTENT: Record<string, string> = {\n${entries}\n};\n`,
  "utf-8"
);

console.log(`Generated docs-content.generated.ts with ${Object.keys(content).length} docs`);
