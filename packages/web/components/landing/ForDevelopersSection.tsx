"use client";

import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import {
  BookOpenIcon,
  CookingPotIcon,
  CodeIcon,
  PlugIcon,
} from "@/components/icons";
import {
  LandingSection,
  LandingSectionHeader,
  LandingBtnRow,
  LandingContentNarrow,
} from "./LandingSection";
import { LandingStripCard } from "./LandingPanel";

const stack = [
  { label: "TypeScript SDK", note: "Deploy accounts, set policies, manage budgets" },
  { label: "CLI", note: "Full operations from the terminal" },
  { label: "15+ MCP tools", note: "Works with Claude, OpenClaw, and any MCP-enabled agent" },
  { label: "REST API", note: "Intent resolution, analytics, fleet management" },
  { label: "OpenClaw skills", note: "Pre-built skills for budget, counterparty, and payment management" },
  { label: "Onchain monitor", note: "Real-time alerts for freezes, defaults, and breaches" },
];

const ditherVariants = ["plasma", "wave", "warp", "plasma", "wave", "warp"] as const;

export function ForDevelopersSection() {
  return (
    <LandingSection defer>
      <LandingContentNarrow>
        <LandingSectionHeader
          title="For developers"
          lead="The protocol is open source. The SDK, CLI, and all MCP tools are free. Self-host if you want; the managed API is optional and has a larger provider index and faster resolution."
        />

        <div className="landing-install-snippet">
          <code>npm install @economicagents/sdk</code>
          <div className="landing-install-snippet-copy">
            <CopyButton text="npm install @economicagents/sdk" />
          </div>
        </div>

        <div className="landing-grid-stack">
          {stack.map((s, i) => (
            <LandingStripCard
              key={s.label}
              label={s.label}
              note={s.note}
              ditherVariant={ditherVariants[i % ditherVariants.length]}
            />
          ))}
        </div>

        <LandingBtnRow>
          <Link
            href="/docs/getting-started/quickstart"
            className="btn-landing btn-landing-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <BookOpenIcon className="size-4 shrink-0" />
            Quick start guide
          </Link>
          <Link
            href="/docs/reference/rest-api"
            className="btn-landing btn-landing-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <CodeIcon className="size-4 shrink-0" />
            API reference
          </Link>
          <Link
            href="/docs/guides/cookbook"
            className="btn-landing btn-landing-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <CookingPotIcon className="size-4 shrink-0" />
            Cookbook
          </Link>
          <Link
            href="/docs/reference/mcp"
            className="btn-landing btn-landing-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <PlugIcon className="size-4 shrink-0" />
            MCP tools
          </Link>
        </LandingBtnRow>
      </LandingContentNarrow>
    </LandingSection>
  );
}
