import Link from "next/link";
import { DitherVisual } from "@/components/DitherVisual";
import { GitHubLogo } from "@/components/ProviderLogos";
import { GITHUB_REPO } from "@/lib/github";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute right-0 top-0 opacity-[0.10]"
          style={{
            width: "clamp(250px, 33vw, 420px)",
            height: "clamp(250px, 33vw, 420px)",
            transform: "translate(28%, -28%)",
            clipPath:
              "polygon(0% 44%, 6% 28%, 0% 12%, 18% 0%, 38% 2%, 55% 0%, 72% 0%, 90% 0%, 100% 14%, 98% 34%, 100% 52%, 94% 68%, 100% 84%, 78% 100%, 56% 98%, 34% 100%, 14% 94%, 0% 78%, 2% 62%, 0% 48%)",
          }}
        >
          <DitherVisual
            width={96}
            height={96}
            variant="plasma"
            speed={0.4}
            className="h-full w-full"
          />
        </div>
        <div
          className="absolute bottom-0 left-0 opacity-[0.07]"
          style={{
            width: "clamp(215px, 28vw, 355px)",
            height: "clamp(215px, 28vw, 355px)",
            transform: "translate(-10%, 10%)",
            clipPath:
              "polygon(0% 52%, 4% 34%, 0% 16%, 14% 0%, 36% 0%, 58% 0%, 80% 0%, 100% 12%, 98% 36%, 100% 58%, 96% 78%, 100% 94%, 74% 100%, 50% 98%, 26% 100%, 0% 88%, 2% 70%, 0% 54%)",
          }}
        >
          <DitherVisual
            width={64}
            height={64}
            variant="warp"
            speed={0.3}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="landing-hero-inner section-padding-x">
        <h1 className="hero-title hero-entrance hero-entrance-delay-0">
          Economic agents that manage
          <br />
          their own money need
          <br />
          financial controls
        </h1>

        <p className="hero-lead hero-entrance hero-entrance-delay-1">
          AEP gives every economic agent a smart account with spending limits,
          automatic cost optimization, and economic relationships with other
          agents. All of it enforced onchain.
        </p>

        <div className="hero-cta-row hero-entrance hero-entrance-delay-2">
          <Link
            href="/docs/getting-started/quickstart"
            className="btn-landing btn-landing-primary"
          >
            Read the docs
          </Link>
          <Link
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-landing btn-landing-secondary inline-flex items-center gap-2"
          >
            <GitHubLogo size={16} />
            View on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}
