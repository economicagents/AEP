"use client";

import { DitherVisual } from "@/components/DitherVisual";

const capabilities = [
  {
    title: "Smart accounts with economic policies",
    detail:
      "Every AEP account is an onchain smart contract that checks spending rules before any payment goes through. Set daily limits, block untrusted counterparties, cap transaction rates. The contract enforces these; your app doesn't have to.",
  },
  {
    title: "Automatic provider discovery and cost optimization",
    detail:
      "Tell AEP what your autonomous agent needs — image classification, market data, LLM inference — and it finds the best-priced, highest-reputation provider across all registered services. Agents using AEP usually spend less than those calling APIs directly.",
  },
  {
    title: "Persistent economic relationships",
    detail:
      "Agents can open credit lines with trusted counterparties, hold funds in escrow until work is validated, split revenue across collaborators, and stake service-level agreements. All onchain, all enforceable.",
  },
  {
    title: "Credit scores and economic intelligence",
    detail:
      "AEP tracks every agent's payment history, revenue consistency, and relationship reliability. That data feeds credit scoring, provider recommendations, and analytics. Agents and their operators can see spend, counterparties, and history — things raw payment rails don't expose.",
  },
];

export function CapabilitiesSection() {
  return (
    <section className="border-divider">
      <div className="mx-auto w-full max-w-5xl section-padding-x py-8 sm:py-12 md:py-16">
        <h2
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-center"
          style={{ color: "var(--foreground)" }}
        >
          What AEP does
        </h2>
        <p
          className="mt-4 max-w-xl mx-auto text-center text-base leading-relaxed"
          style={{ color: "var(--foreground)", opacity: 0.65 }}
        >
          AEP is the missing runtime layer between an economic agent and
          every payment it makes. It adds financial controls, cost
          optimization, and economic relationships to any agent
          framework—from autonomous AI to programmatic pipelines.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 max-w-4xl mx-auto">
          {capabilities.map((c, i) => {
            const variants = ["wave", "plasma", "warp", "plasma"] as const;
            const variant = variants[i % variants.length];
            return (
              <div
                key={c.title}
                className="landing-card-hover flex flex-col border-outline min-w-0"
                style={{ backgroundColor: "var(--background)" }}
              >
                <div
                  className="shrink-0 w-full h-3 sm:h-4 overflow-hidden opacity-40"
                  aria-hidden
                >
                  <DitherVisual
                    width={192}
                    height={20}
                    variant={variant}
                    speed={0}
                    cellShape="grid"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 p-4 sm:p-5">
                  <h3
                    className="text-base sm:text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {c.title}
                  </h3>
                  <p
                    className="mt-2 text-base sm:text-sm leading-relaxed"
                    style={{ color: "var(--foreground)", opacity: 0.6 }}
                  >
                    {c.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
