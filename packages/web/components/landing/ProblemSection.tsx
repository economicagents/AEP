"use client";

import { DitherVisual } from "@/components/DitherVisual";

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
    <section className="border-divider">
      <div className="mx-auto w-full max-w-5xl section-padding-x py-8 sm:py-12 md:py-16">
        <div className="max-w-3xl min-w-0 mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-center"
            style={{ color: "var(--foreground)" }}
          >
            The problem
          </h2>
          <p
            className="mt-4 max-w-xl mx-auto text-center text-base leading-relaxed"
            style={{ color: "var(--foreground)", opacity: 0.65 }}
          >
            Autonomous economic agents can now pay for APIs, compute, and
            data using stablecoins. But the ability to spend is not the
            same as the ability to spend wisely. The missing runtime layer
            for economic agents means no budgets, no way to compare
            prices, no credit history, and no accountability. They are
            economic actors with no economic intelligence.
          </p>
          <div
            className="mt-8 sm:mt-10 flex border-outline overflow-x-auto overflow-y-hidden rounded-sm -webkit-overflow-scrolling-touch -mx-4 sm:mx-0"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div
              className="shrink-0 w-3 sm:w-4 self-stretch overflow-hidden opacity-40 min-h-[12rem]"
              aria-hidden
            >
              <DitherVisual
                width={16}
                height={192}
                variant="wave"
                speed={0}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 pl-4 pr-6 sm:pl-0 sm:pr-0 overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="problems-table w-full min-w-[20rem] text-sm sm:text-base border-collapse table-fixed">
              <colgroup>
                <col style={{ width: "42%" }} />
                <col style={{ width: "2rem" }} />
                <col />
              </colgroup>
              <tbody>
                {problems.map((p) => (
                  <tr
                    key={p.before}
                    className="border-b border-[rgba(37,39,59,0.1)] last:border-b-0"
                  >
                    <td
                      className="py-3.5 sm:py-3 px-4 align-baseline leading-relaxed"
                      style={{ color: "var(--foreground)", opacity: 0.35 }}
                    >
                      {p.before}
                    </td>
                    <td
                      className="py-3.5 sm:py-3 px-2 align-baseline text-center problems-table-arrow"
                      style={{ color: "var(--accent)", opacity: 0.9 }}
                    >
                      →
                    </td>
                    <td
                      className="py-3.5 sm:py-3 px-4 align-baseline leading-relaxed font-medium"
                      style={{ color: "var(--foreground)", opacity: 0.85 }}
                    >
                      {p.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
