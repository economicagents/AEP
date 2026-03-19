"use client";

import { Accordion } from "@/components/Accordion";
import { DitherVisual } from "@/components/DitherVisual";

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
      "Instead of hard-coding which API to call, your agent describes what it needs — \"image classification under two cents per image\" — and AEP finds the best provider by price, reputation, and quality.",
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
    <section className="border-divider">
      <div className="mx-auto w-full max-w-5xl section-padding-x py-8 sm:py-12 md:py-16">
        <h2
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-center"
          style={{ color: "var(--foreground)" }}
        >
          How it works
        </h2>
        <div className="mt-8 max-w-2xl mx-auto flex border-outline rounded-sm overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
          <div
            className="shrink-0 w-3 sm:w-4 self-stretch overflow-hidden opacity-40 min-h-[16rem]"
            aria-hidden
          >
            <DitherVisual
              width={16}
              height={256}
              variant="warp"
              speed={0}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 px-4 sm:px-5 py-2">
            <Accordion
            items={howItWorksSteps.map((s) => ({
              id: s.id,
              title: s.title,
              content: s.content,
            }))}
          />
          </div>
        </div>
      </div>
    </section>
  );
}
