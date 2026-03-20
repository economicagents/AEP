"use client";

import Link from "next/link";
import { DitherVisual } from "@/components/DitherVisual";
import { githubBlobPath } from "@/lib/github";

const comparison = [
  { others: "1 contract and a roadmap", aep: "10+ audited smart contracts" },
  { others: "SDK announced, not shipped", aep: "Full TypeScript SDK and CLI on npm" },
  { others: "API waitlist", aep: "Live REST API" },
  { others: "Single feature", aep: "Accounts, resolution, relationships, credit scoring, analytics" },
  { others: "No agent tooling", aep: "15+ MCP tools ready for any agent framework" },
  { others: "Unaudited", aep: "AI-assisted security review with remediated findings (not a substitute for a firm audit)" },
];

export function NotARoadmapSection() {
  return (
    <section className="border-divider">
      <div className="mx-auto w-full max-w-5xl section-padding-x py-8 sm:py-12 md:py-16">
        <div className="max-w-3xl min-w-0 mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-center"
            style={{ color: "var(--foreground)" }}
          >
            Not a roadmap
          </h2>
          <p
            className="mt-4 max-w-xl mx-auto text-center text-base leading-relaxed"
            style={{ color: "var(--foreground)", opacity: 0.65 }}
          >
            Everything listed on this page is built, tested, and audited.
            The full protocol passed an independent security review with
            zero critical, high, or medium severity findings. What you
            see here is shipped, not a whitepaper.
          </p>

          <div
            className="mt-8 sm:mt-10 flex border-outline overflow-x-auto overflow-y-hidden rounded-sm -webkit-overflow-scrolling-touch -mx-4 sm:mx-0"
            style={{ backgroundColor: "var(--background)" }}
            role="region"
            aria-label="Comparison table"
          >
            <div
              className="shrink-0 w-3 sm:w-4 self-stretch overflow-hidden opacity-40 min-h-[14rem]"
              aria-hidden
            >
              <DitherVisual
                width={16}
                height={224}
                variant="plasma"
                speed={0}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 pl-4 pr-6 sm:pl-5 sm:pr-5 py-4 overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="landing-comparison-table w-full min-w-[20rem] sm:min-w-[28rem] text-sm sm:text-base border-collapse">
              <thead>
                <tr>
                  <th
                    className="text-left py-3.5 sm:py-3 pr-4 font-semibold tracking-widest uppercase text-xs"
                    style={{ color: "var(--foreground)", opacity: 0.5 }}
                  >
                    Typical launch
                  </th>
                  <th
                    className="text-left py-3.5 sm:py-3 pl-4 font-semibold tracking-widest uppercase text-xs"
                    style={{ color: "var(--foreground)", opacity: 0.5 }}
                  >
                    AEP
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.others}>
                    <td
                      className="py-3.5 sm:py-3 pr-4 leading-relaxed"
                      style={{ color: "var(--foreground)", opacity: 0.55 }}
                    >
                      {row.others}
                    </td>
                    <td
                      className="py-3.5 sm:py-3 pl-4 leading-relaxed font-medium"
                      style={{ color: "var(--foreground)", opacity: 0.9 }}
                    >
                      {row.aep}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href={githubBlobPath("audit-report.md")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-landing btn-landing-secondary w-full sm:w-auto min-w-0 max-w-full"
            >
              Read the security review
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
