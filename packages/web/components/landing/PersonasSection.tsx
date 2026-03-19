"use client";

import { DitherVisual } from "@/components/DitherVisual";

const personas = [
  {
    title: "Agent developers",
    description:
      "Building an agent that pays for APIs, compute, or data? AEP adds spending controls without custom budget logic. Install the SDK, deploy an account, and your agent has limits from minute one.",
  },
  {
    title: "Agent frameworks and platforms",
    description:
      "Running a framework like OpenClaw or an agent hosting platform? AEP integrates as the default smart wallet — every agent in your ecosystem gets economic controls without any extra work from your users.",
  },
  {
    title: "Teams operating fleets of agents",
    description:
      "Running tens or hundreds of agents? AEP provides fleet-wide spend limits, real-time alerts for unusual activity, and a single dashboard for budgets, counterparties, and audit trails across every agent you operate.",
  },
  {
    title: "Service providers accepting payments from agents",
    description:
      "Selling APIs or compute via x402? Register your service and AEP's intent resolution will route paying agents to you automatically — no marketplace listing, no gatekeepers.",
  },
];

export function PersonasSection() {
  return (
    <section className="border-divider">
      <div className="mx-auto w-full max-w-5xl section-padding-x py-8 sm:py-12 md:py-16">
        <h2
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-center"
          style={{ color: "var(--foreground)" }}
        >
          Who it&apos;s for
        </h2>
        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 min-w-0 max-w-4xl mx-auto">
          {personas.map((p, i) => {
            const variants = ["warp", "wave", "plasma", "warp"] as const;
            const variant = variants[i % variants.length];
            return (
              <div
                key={p.title}
                className="landing-card-hover flex flex-col border-outline min-w-0"
                style={{ backgroundColor: "var(--background)" }}
              >
                <div
                  className="shrink-0 w-full h-3 sm:h-4 overflow-hidden opacity-40"
                  aria-hidden
                >
                  <DitherVisual
                    width={192}
                    height={20}
                    variant={variant}
                    speed={0}
                    cellShape="grid"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 p-4 sm:p-5">
                  <span
                    className="font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {p.title}
                  </span>
                  <p
                    className="mt-1 leading-relaxed text-base sm:text-sm"
                    style={{ color: "var(--foreground)", opacity: 0.6 }}
                  >
                    {p.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
