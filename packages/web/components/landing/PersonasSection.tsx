"use client";

import { LandingSection, LandingSectionHeader } from "./LandingSection";
import { LandingCard } from "./LandingPanel";

const personas = [
  {
    title: "Agent developers",
    description:
      "Building an agent that pays for APIs, compute, or data? AEP adds spending controls without custom budget logic. Install the SDK, deploy an account, and your agent has limits from minute one.",
  },
  {
    title: "Agent frameworks and platforms",
    description:
      "Running a framework like OpenClaw or an agent hosting platform? AEP integrates as the default smart wallet — every agent in your ecosystem gets economic controls without any extra work from your users.",
  },
  {
    title: "Teams operating fleets of agents",
    description:
      "Running tens or hundreds of agents? AEP provides fleet-wide spend limits, real-time alerts for unusual activity, and a single dashboard for budgets, counterparties, and audit trails across every agent you operate.",
  },
  {
    title: "Service providers accepting payments from agents",
    description:
      "Selling APIs or compute via x402? Register your service and AEP's intent resolution will route paying agents to you automatically — no marketplace listing, no gatekeepers.",
  },
];

const ditherVariants = ["warp", "wave", "plasma", "warp"] as const;

export function PersonasSection() {
  return (
    <LandingSection defer>
      <LandingSectionHeader title="Who it's for" />
      <div className="landing-grid">
        {personas.map((p, i) => (
          <LandingCard
            key={p.title}
            title={p.title}
            ditherVariant={ditherVariants[i % ditherVariants.length]}
          >
            <p className="landing-card-text">{p.description}</p>
          </LandingCard>
        ))}
      </div>
    </LandingSection>
  );
}
