"use client";

import { Accordion } from "@/components/Accordion";
import { EthLogo, X402Logo } from "@/components/ProviderLogos";
import { DitherVisual } from "@/components/DitherVisual";

const standards = [
  {
    id: "erc4337",
    title: (
      <span className="inline-flex items-center gap-2">
        <EthLogo size={14} className="opacity-70 shrink-0" />
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
        <EthLogo size={14} className="opacity-70 shrink-0" />
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
        <X402Logo size={14} className="opacity-70 shrink-0" />
        x402
      </span>
    ),
    content:
      "HTTP-native payments with stablecoins. AEP intercepts and governs x402 payments before they execute.",
  },
];

export function StandardsSection() {
  return (
    <section className="border-divider">
      <div className="mx-auto w-full max-w-5xl section-padding-x py-8 sm:py-12 md:py-16">
        <h2
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-center"
          style={{ color: "var(--foreground)" }}
        >
          Built on open standards
        </h2>
        <p
          className="mt-4 max-w-xl mx-auto text-center text-sm leading-relaxed"
          style={{ color: "var(--foreground)", opacity: 0.6 }}
        >
          AEP sits on top of existing infrastructure; it doesn&apos;t replace
          it. The protocol builds on three standards and works with any
          agent framework or payment rail.
        </p>
        <div className="mt-6 sm:mt-8 max-w-xl mx-auto flex border-outline rounded-sm overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
          <div
            className="shrink-0 w-3 sm:w-4 self-stretch overflow-hidden opacity-40 min-h-[12rem]"
            aria-hidden
          >
            <DitherVisual
              width={16}
              height={192}
              variant="plasma"
              speed={0}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 px-4 sm:px-5 py-2">
            <Accordion
              items={standards.map((s) => ({
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
