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
  { others: "1 contract and a roadmap", aep: "10+ audited smart contracts" },
  { others: "SDK announced, not shipped", aep: "Full TypeScript SDK and CLI on npm" },
  { others: "API gated beta", aep: "Live REST API" },
  {
    others: "Single feature",
    aep: "Accounts, resolution, relationships, credit scoring, analytics",
  },
  { others: "No agent tooling", aep: "15+ MCP tools ready for any agent framework" },
  {
    others: "Unaudited",
    aep: "AI-assisted security review with remediated findings (not a substitute for a firm audit)",
  },
];

export function NotARoadmapSection() {
  return (
    <LandingSection defer>
      <LandingContentNarrow>
        <LandingSectionHeader
          title="Not a roadmap"
          lead="Everything listed on this page is built, tested, and audited. The full protocol passed an independent security review with zero critical, high, or medium severity findings. What you see here is shipped, not a whitepaper."
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
