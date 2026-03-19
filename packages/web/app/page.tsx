import type { Metadata } from "next";
import {
  HeroSection,
  ProblemSection,
  CapabilitiesSection,
  HowItWorksSection,
  ForDevelopersSection,
  NotARoadmapSection,
  PersonasSection,
  StandardsSection,
  GetStartedSection,
  LandingFooter,
} from "@/components/landing";

const BASE_URL = "https://economicagents.org";

export const metadata: Metadata = {
  title: "AEP — Agent Economic Protocol",
  description:
    "The runtime layer for economic agents. Budget governance, intent-based procurement, and persistent economic relationships. All onchain.",
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: "AEP — Agent Economic Protocol",
    description:
      "The runtime layer for economic agents. Budget governance, intent-based procurement, and persistent economic relationships. All onchain.",
    url: BASE_URL,
    type: "website",
  },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What happens when autonomous agents spend with no limits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Budget caps enforced by the smart contract itself.",
      },
    },
    {
      "@type": "Question",
      name: "How do I deploy a smart account for my agent?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "One command creates an onchain wallet for your agent with configurable spending policies — daily budgets, per-transaction caps, and a list of approved counterparties.",
      },
    },
    {
      "@type": "Question",
      name: "What is intent resolution?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Instead of hard-coding which API to call, your agent describes what it needs — e.g. image classification under two cents per image — and AEP finds the best provider by price, reputation, and quality.",
      },
    },
    {
      "@type": "Question",
      name: "What economic relationships can agents build?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Agents can open credit lines with trusted counterparties, hold funds in escrow until work is validated, split revenue across collaborators, and stake service-level agreements. All onchain, all enforceable.",
      },
    },
  ],
};

export default function Home() {
  return (
    <main className="min-w-0 overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* JSON-LD for FAQ schema — safe: static data from JSON.stringify, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <HeroSection />
      <ProblemSection />
      <CapabilitiesSection />
      <HowItWorksSection />
      <ForDevelopersSection />
      <NotARoadmapSection />
      <PersonasSection />
      <StandardsSection />
      <GetStartedSection />
      <LandingFooter />
    </main>
  );
}
