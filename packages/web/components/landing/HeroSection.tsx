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
          className="absolute left-0 bottom-0 opacity-[0.07]"
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

      <div className="relative z-10 mx-auto max-w-4xl pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-12 pb-10 sm:pl-[max(1.25rem,env(safe-area-inset-left))] sm:pr-[max(1.25rem,env(safe-area-inset-right))] sm:pt-20 sm:pb-16 md:pl-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))] md:pt-24 md:pb-20 text-center">
        <h1
          className="hero-entrance hero-entrance-delay-0 text-[clamp(1.75rem,5vw,2.75rem)] sm:text-4xl md:text-[2.75rem] font-semibold tracking-tight leading-[1.15]"
          style={{ color: "var(--foreground)" }}
        >
          Economic agents that manage
          <br />
          their own money need
          <br />
          financial controls
        </h1>

        <div className="hero-entrance hero-entrance-delay-1 mt-5 max-w-lg mx-auto">
          <p
            className="text-[clamp(1rem,2.5vw,1.125rem)] leading-relaxed"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            AEP gives every economic agent a smart account with spending
            limits, automatic cost optimization, and economic relationships
            with other agents. All of it enforced onchain.
          </p>
        </div>

        <div className="hero-entrance hero-entrance-delay-2 mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
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
