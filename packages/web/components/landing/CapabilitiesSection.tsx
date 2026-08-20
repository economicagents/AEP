"use client";

import { LandingSection, LandingSectionHeader } from "./LandingSection";
import { LandingCard } from "./LandingPanel";

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

const ditherVariants = ["wave", "plasma", "warp", "plasma"] as const;

export function CapabilitiesSection() {
  return (
    <LandingSection defer>
      <LandingSectionHeader
        title="What AEP does"
        lead="AEP is the missing runtime layer between an economic agent and every payment it makes. It adds financial controls, cost optimization, and economic relationships to any agent framework—from autonomous AI to programmatic pipelines."
      />
      <div className="landing-grid">
        {capabilities.map((c, i) => (
          <LandingCard
            key={c.title}
            title={c.title}
            ditherVariant={ditherVariants[i % ditherVariants.length]}
          >
            <p className="landing-card-text">{c.detail}</p>
          </LandingCard>
        ))}
      </div>
    </LandingSection>
  );
}
