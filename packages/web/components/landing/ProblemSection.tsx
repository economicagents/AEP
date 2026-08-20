"use client";

import {
  LandingSection,
  LandingSectionHeader,
  LandingContentNarrow,
} from "./LandingSection";
import { LandingPanel } from "./LandingPanel";

const problems = [
  {
    before: "Autonomous agents spend with no limits",
    after: "Budget caps enforced by the smart contract itself",
  },
  {
    before: "No way to compare providers or prices",
    after: "Intent resolution finds the best option automatically",
  },
  {
    before: "Every payment is a one-off transaction",
    after: "Credit lines, escrow, and revenue sharing between agents",
  },
  {
    before: "No track record or accountability",
    after: "Onchain credit scores, analytics, and audit trails",
  },
];

export function ProblemSection() {
  return (
    <LandingSection defer>
      <LandingContentNarrow>
        <LandingSectionHeader
          title="The problem"
          lead="Autonomous economic agents can now pay for APIs, compute, and data using stablecoins. But the ability to spend is not the same as the ability to spend wisely. The missing runtime layer for economic agents means no budgets, no way to compare prices, no credit history, and no accountability. They are economic actors with no economic intelligence."
        />
        <div className="mt-8 sm:mt-10">
          <LandingPanel
            ditherVariant="wave"
            ditherHeight={192}
            minHeightClass="min-h-[12rem]"
            scrollX
            contentClassName="landing-panel-content--table"
          >
            <table className="problems-table w-full min-w-[20rem] border-collapse text-sm sm:text-base table-fixed">
              <colgroup>
                <col style={{ width: "42%" }} />
                <col style={{ width: "2rem" }} />
                <col />
              </colgroup>
              <tbody>
                {problems.map((p) => (
                  <tr key={p.before}>
                    <td className="problems-table-before">{p.before}</td>
                    <td className="problems-table-arrow">→</td>
                    <td className="problems-table-after">{p.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LandingPanel>
        </div>
      </LandingContentNarrow>
    </LandingSection>
  );
}
