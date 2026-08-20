import type { Metadata } from "next";
import { DocCard } from "@/components/docs/DocCard";
import { DitherVisual } from "@/components/DitherVisual";
import { githubBlobPath } from "@/lib/github";

const BASE_URL = "https://economicagents.org";

export const metadata: Metadata = {
  title: "Documentation — AEP",
  description:
    "AEP documentation: getting started, CLI, SDK, skills, packages, guides, and API reference.",
  alternates: { canonical: `${BASE_URL}/docs` },
  openGraph: {
    title: "Documentation — AEP",
    description:
      "AEP documentation: getting started, CLI, SDK, skills, packages, guides, and API reference.",
    url: `${BASE_URL}/docs`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation — AEP",
    description:
      "AEP documentation: getting started, CLI, SDK, skills, packages, guides, and API reference.",
  },
};

const sections = [
  {
    label: "Getting Started",
    href: "/docs/getting-started/overview",
    description: "Overview, quick start, supported chains",
  },
  {
    label: "CLI",
    href: "/docs/cli/installation",
    description: "Installation and commands reference",
  },
  {
    label: "SDK",
    href: "/docs/sdk/installation",
    description: "Installation, usage, and API reference",
  },
  {
    label: "Skills",
    href: "/docs/skills/overview",
    description: "Overview, installing, available skills",
  },
  {
    label: "Packages",
    href: "/docs/packages/api",
    description: "API server, indexer, graph, monitor, resolver",
  },
  {
    label: "Guides",
    href: "/docs/guides/deployment",
    description: "Deployment, integration, monetization",
  },
  {
    label: "Reference",
    href: "/docs/reference/rest-api",
    description: "REST API, MCP tools, intent schema, architecture, threat model",
  },
];

export default function DocsPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className="absolute right-0 top-0 opacity-[0.076]"
          style={{
            width: "clamp(92px, 12.75vw, 153px)",
            height: "clamp(92px, 12.75vw, 153px)",
            clipPath:
              "polygon(100% 100%, 100% 0%, 62% 0%, 88% 38%, 98% 72%, 100% 100%)",
          }}
        >
          <DitherVisual
            width={48}
            height={48}
            variant="warp"
            speed={0.35}
            cellShape="grid"
            className="h-full w-full"
          />
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-6">
      <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold tracking-tight">
        AEP Documentation
      </h1>
      <p
        className="max-w-xl text-sm leading-relaxed"
        style={{ opacity: 0.85 }}
      >
        The runtime layer for economic agents. Budget governance, intent-based procurement, and persistent economic relationships. All onchain.
      </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <DocCard
            key={section.href}
            href={section.href}
            label={section.label}
            description={section.description}
          />
        ))}
      </div>
      <div
        className="mt-6 border-t pt-4"
        style={{ borderColor: "var(--docs-border-subtle)" }}
      >
        <p className="text-xs mb-2" style={{ opacity: 0.8 }}>
          For contributors:{" "}
          <a
            href={githubBlobPath("docs/DOCUMENT-MAP.md")}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            Public doc map
          </a>
          {" · "}
          <a
            href={githubBlobPath("docs/BACKLOG.md")}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            Limitations
          </a>
          {" · "}
          <a
            href={githubBlobPath("docs/INCIDENT-RESPONSE-PLAYBOOK.md")}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            Incident Response
          </a>
          {" · "}
          <a
            href={githubBlobPath("docs/PUBLISHING.md")}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            Publishing
          </a>
        </p>
      </div>
      </div>
    </div>
  );
}
