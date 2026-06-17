"use client";

import { Accordion } from "@/components/Accordion";
import { EthLogo, X402Logo } from "@/components/ProviderLogos";
import { LandingSection, LandingSectionHeader } from "./LandingSection";
import { LandingPanel } from "./LandingPanel";

const standards = [
  {
    id: "erc4337",
    title: (
      <span className="inline-flex items-center gap-2">
        <EthLogo size={14} className="shrink-0 opacity-70" />
        ERC-4337
      </span>
    ),
    content:
      "Account abstraction. AEP accounts are programmable smart contract wallets with custom validation logic.",
  },
  {
    id: "erc8004",
    title: (
      <span className="inline-flex items-center gap-2">
        <EthLogo size={14} className="shrink-0 opacity-70" />
        ERC-8004
      </span>
    ),
    content:
      "Trustless agent identity, reputation, and validation. AEP reads and writes to these registries for counterparty trust.",
  },
  {
    id: "x402",
    title: (
      <span className="inline-flex items-center gap-2">
        <X402Logo size={14} className="shrink-0 opacity-70" />
        x402
      </span>
    ),
    content:
      "HTTP-native payments with stablecoins. AEP intercepts and governs x402 payments before they execute.",
  },
];

export function StandardsSection() {
  return (
    <LandingSection defer>
      <LandingSectionHeader
        title="Built on open standards"
        lead="AEP sits on top of existing infrastructure; it doesn't replace it. The protocol builds on three standards and works with any agent framework or payment rail."
      />
      <div className="mx-auto mt-8 max-w-xl">
        <LandingPanel
          ditherVariant="plasma"
          ditherHeight={192}
          minHeightClass="min-h-[12rem]"
          contentClassName="landing-panel-content--accordion"
        >
          <Accordion
            items={standards.map((s) => ({
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
