"use client";

import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { DitherVisual } from "@/components/DitherVisual";
import {
  BookOpenIcon,
  CookingPotIcon,
  CodeIcon,
  PlugIcon,
} from "@/components/icons";

const stack = [
  { label: "TypeScript SDK", note: "Deploy accounts, set policies, manage budgets" },
  { label: "CLI", note: "Full operations from the terminal" },
  { label: "15+ MCP tools", note: "Works with Claude, OpenClaw, and any MCP-enabled agent" },
  { label: "REST API", note: "Intent resolution, analytics, fleet management" },
  { label: "OpenClaw skills", note: "Pre-built skills for budget, counterparty, and payment management" },
  { label: "Onchain monitor", note: "Real-time alerts for freezes, defaults, and breaches" },
];

export function ForDevelopersSection() {
  return (
    <section className="border-divider">
      <div className="mx-auto w-full max-w-5xl section-padding-x py-8 sm:py-12 md:py-16">
        <div className="section-layout-content-only mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-center"
            style={{ color: "var(--foreground)" }}
          >
            For developers
          </h2>
          <p
            className="mt-4 max-w-xl mx-auto text-center text-sm leading-relaxed"
            style={{ color: "var(--foreground)", opacity: 0.6 }}
          >
            The protocol is open source. The SDK, CLI, and all MCP tools
            are free. Self-host if you want; the managed API is optional
            and has a larger provider index and faster resolution.
          </p>

          <div
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-4 text-sm border-outline max-w-2xl w-full min-w-0 mx-auto"
            style={{
              color: "var(--foreground)",
              backgroundColor: "var(--background)",
            }}
          >
            <code className="break-all text-base sm:text-sm min-h-[44px] sm:min-h-0 flex items-center">npm install @aep/sdk</code>
            <div className="flex items-center min-h-[44px] sm:min-h-0 shrink-0 -order-1 sm:order-none self-end sm:self-auto">
              <CopyButton text="npm install @aep/sdk" />
            </div>
          </div>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0 max-w-4xl mx-auto">
            {stack.map((s, i) => {
              const variants = ["plasma", "wave", "warp", "plasma", "wave", "warp"] as const;
              const variant = variants[i % variants.length];
              return (
                <div
                  key={s.label}
                  className="landing-card-hover flex border-outline text-sm min-w-0 break-words"
                  style={{ backgroundColor: "var(--background)" }}
                >
                  <div
                    className="shrink-0 w-4 sm:w-5 self-stretch min-h-12 overflow-hidden opacity-40"
                    aria-hidden
                  >
                    <DitherVisual
                      width={20}
                      height={64}
                      variant={variant}
                      speed={0}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 p-4">
                    <span
                      className="font-medium"
                      style={{ color: "var(--foreground)", opacity: 0.85 }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="block mt-1"
                      style={{ color: "var(--foreground)", opacity: 0.4 }}
                    >
                      {s.note}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-4 text-sm">
            <Link
              href="/docs/getting-started/quickstart"
              className="btn-landing btn-landing-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <BookOpenIcon className="size-4 shrink-0" />
              Quick start guide
            </Link>
            <Link
              href="/docs/api"
              className="btn-landing btn-landing-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <CodeIcon className="size-4 shrink-0" />
              API reference
            </Link>
            <Link
              href="/docs/cookbook"
              className="btn-landing btn-landing-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <CookingPotIcon className="size-4 shrink-0" />
              Cookbook
            </Link>
            <Link
              href="/docs/mcp"
              className="btn-landing btn-landing-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <PlugIcon className="size-4 shrink-0" />
              MCP tools
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
