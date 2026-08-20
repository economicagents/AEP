"use client";

import { Accordion } from "@/components/Accordion";
import { LandingSection, LandingSectionHeader } from "./LandingSection";
import { LandingPanel } from "./LandingPanel";

const howItWorksSteps = [
  {
    id: "deploy-account",
    title: "1. Deploy a smart account.",
    content:
      "One command creates an onchain wallet for your agent with configurable spending policies — daily budgets, per-transaction caps, and a list of approved counterparties.",
  },
  {
    id: "agent-pays",
    title: "2. Your autonomous agent pays for things through AEP.",
    content:
      "When the agent makes a payment, AEP checks it against the account's policies before it goes through. If it violates a rule — over budget, untrusted recipient, too many transactions — the payment is blocked and the agent is told why, so it can adapt.",
  },
  {
    id: "intent-resolution",
    title: "3. Use intent resolution instead of guessing.",
    content:
      'Instead of hard-coding which API to call, your agent describes what it needs — "image classification under two cents per image" — and AEP finds the best provider by price, reputation, and quality.',
  },
  {
    id: "economic-relationships",
    title: "4. Build economic relationships over time.",
    content:
      "Agents that transact reliably build credit scores. They can open credit lines with trusted partners, hold funds in escrow for multi-step work, and share revenue with collaborators — all enforced by smart contracts.",
  },
];

export function HowItWorksSection() {
  return (
    <LandingSection defer>
      <LandingSectionHeader title="How it works" />
      <div className="mx-auto mt-8 max-w-2xl">
        <LandingPanel
          ditherVariant="warp"
          ditherHeight={256}
          minHeightClass="min-h-[16rem]"
          contentClassName="landing-panel-content--accordion"
        >
          <Accordion
            items={howItWorksSteps.map((s) => ({
              id: s.id,
              title: s.title,
              content: s.content,
            }))}
          />
        </LandingPanel>
      </div>
    </LandingSection>
  );
}
