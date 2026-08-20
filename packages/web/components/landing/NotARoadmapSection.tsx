"use client";

import Link from "next/link";
import { githubBlobPath } from "@/lib/github";
import {
  LandingSection,
  LandingSectionHeader,
  LandingBtnRow,
  LandingContentNarrow,
} from "./LandingSection";
import { LandingPanel } from "./LandingPanel";

const comparison = [
  { others: "1 contract and a roadmap", aep: "10+ shipped smart contracts" },
  { others: "SDK announced, not shipped", aep: "TypeScript SDK and CLI on npm" },
  {
    others: "API gated beta",
    aep: "Self-hostable REST API (hosted reference offline)",
  },
  {
    others: "Single feature",
    aep: "Accounts, resolution, relationships, credit scoring, analytics",
  },
  { others: "No agent tooling", aep: "15+ MCP tools via npx @economicagents/mcp" },
  {
    others: "Unaudited",
    aep: "AI-assisted internal review; remediations in 0.3.0 (not a firm audit)",
  },
];

export function NotARoadmapSection() {
  return (
    <LandingSection defer>
      <LandingContentNarrow>
        <LandingSectionHeader
          title="Not a roadmap"
          lead="Everything listed on this page is built and tested in this repository — shipped code, not a whitepaper. Smart contracts had an AI-assisted internal security review (August 2026) with remediations in v0.3.0; that is not a substitute for a third-party firm audit before high-value mainnet use."
        />

        <div className="mt-8 sm:mt-10">
          <LandingPanel
            ditherVariant="plasma"
            ditherHeight={224}
            minHeightClass="min-h-[14rem]"
            scrollX
            contentClassName="landing-panel-content--table"
            ariaLabel="Comparison table"
          >
            <table className="landing-comparison-table w-full min-w-[20rem] border-collapse text-sm sm:min-w-[28rem] sm:text-base">
              <thead>
                <tr>
                  <th className="landing-comparison-th">Typical launch</th>
                  <th className="landing-comparison-th">AEP</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.others}>
                    <td className="landing-comparison-others">{row.others}</td>
                    <td className="landing-comparison-aep">{row.aep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LandingPanel>
        </div>

        <LandingBtnRow>
          <Link
            href={githubBlobPath("audit-report.md")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-landing btn-landing-secondary w-full min-w-0 max-w-full sm:w-auto"
          >
            Read the security review
          </Link>
        </LandingBtnRow>
      </LandingContentNarrow>
    </LandingSection>
  );
}
