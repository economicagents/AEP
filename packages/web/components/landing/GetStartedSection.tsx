"use client";

import Link from "next/link";
import { WaitlistFlow } from "@/components/WaitlistFlow";
import { GitHubLogo, DiscordLogo } from "@/components/ProviderLogos";
import { DitherVisual } from "@/components/DitherVisual";
import { BookOpenIcon } from "@/components/icons";
import { GITHUB_REPO } from "@/lib/github";

export function GetStartedSection() {
  return (
    <section className="border-divider relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute right-0 bottom-0 opacity-[0.06]"
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
      <div className="relative z-10 mx-auto w-full max-w-5xl section-padding-x py-8 sm:py-12 md:py-16">
        <div className="section-layout-cta-centered">
          <div className="cta-content">
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              Get started
            </h2>
            <p
              className="mt-3 max-w-lg text-sm leading-relaxed mx-auto"
              style={{ color: "var(--foreground)", opacity: 0.6 }}
            >
              The protocol is live on testnet. Join the waitlist for mainnet
              access, or start building now with the SDK and documentation.
            </p>
            <div className="mt-6">
              <WaitlistFlow inline />
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-4 text-sm">
              <Link
                href="/docs/getting-started/quickstart"
                className="btn-landing btn-landing-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <BookOpenIcon className="size-4 shrink-0" />
                Quick start guide
              </Link>
              <Link
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-landing btn-landing-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <GitHubLogo size={16} />
                GitHub
              </Link>
              <span
                role="button"
                aria-label="Discord"
                title="Coming soon"
                onClick={(e) => e.preventDefault()}
                className="btn-landing btn-landing-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
              >
                <DiscordLogo size={16} />
                Discord
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
