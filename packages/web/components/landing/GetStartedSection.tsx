"use client";

import Link from "next/link";
import { GitHubLogo } from "@/components/ProviderLogos";
import { DitherVisual } from "@/components/DitherVisual";
import { BookOpenIcon } from "@/components/icons";
import { GITHUB_REPO } from "@/lib/github";
import { LandingBtnRow } from "./LandingSection";
import { InViewReveal } from "@/components/InViewReveal";

export function GetStartedSection() {
  return (
    <section className="border-divider relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute bottom-0 right-0 opacity-[0.06]"
          style={{
            width: "clamp(180px, 24vw, 280px)",
            height: "clamp(180px, 24vw, 280px)",
            transform: "translate(15%, 20%)",
            clipPath:
              "polygon(0% 60%, 8% 40%, 0% 20%, 20% 0%, 45% 4%, 70% 0%, 90% 0%, 100% 20%, 92% 45%, 100% 65%, 88% 88%, 100% 100%, 70% 96%, 45% 100%, 20% 92%, 0% 75%)",
          }}
        >
          <DitherVisual
            width={64}
            height={64}
            variant="wave"
            speed={0.4}
            className="h-full w-full"
          />
        </div>
      </div>
      <div className="landing-section-inner section-padding-x relative z-10">
        <InViewReveal>
          <div className="section-layout-cta-centered">
            <div className="cta-content">
              <h2 className="landing-section-title">Get started</h2>
              <p className="landing-section-lead mx-auto mt-3 max-w-lg">
                AEP is live on Base Sepolia and Base mainnet. Start with{" "}
                <code className="text-xs opacity-80">npx @economicagents/cli</code>
                , the SDK, and docs — no repo clone required. Self-host the REST
                API for intent resolution; the hosted reference at{" "}
                <code className="text-xs opacity-80">api.economicagents.org</code>{" "}
                is currently offline.
              </p>
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
                  Self-host API
                </Link>
                <Link
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-landing btn-landing-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <GitHubLogo size={16} />
                  GitHub
                </Link>
              </LandingBtnRow>
            </div>
          </div>
        </InViewReveal>
      </div>
    </section>
  );
}
