"use client";

import type { ReactNode } from "react";
import { InViewReveal } from "@/components/InViewReveal";

type LandingSectionProps = {
  children: ReactNode;
  border?: boolean;
  /** Skip paint/layout for offscreen sections until near viewport */
  defer?: boolean;
  /** Scroll-triggered entrance (default: same as defer) */
  reveal?: boolean;
  className?: string;
  innerClassName?: string;
};

export function LandingSection({
  children,
  border = true,
  defer = false,
  reveal,
  className = "",
  innerClassName = "",
}: LandingSectionProps) {
  const shouldReveal = reveal ?? defer;

  const sectionClass = [
    border ? "border-divider" : "",
    defer ? "landing-section-defer" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClass || undefined}>
      <div className={`landing-section-inner section-padding-x ${innerClassName}`.trim()}>
        <InViewReveal enabled={shouldReveal}>{children}</InViewReveal>
      </div>
    </section>
  );
}

export function LandingSectionHeader({
  title,
  lead,
}: {
  title: string;
  lead?: string;
}) {
  return (
    <>
      <h2 className="landing-section-title">{title}</h2>
      {lead ? <p className="landing-section-lead">{lead}</p> : null}
    </>
  );
}

export function LandingBtnRow({ children }: { children: ReactNode }) {
  return <div className="landing-btn-row">{children}</div>;
}

export function LandingContentNarrow({ children }: { children: ReactNode }) {
  return <div className="landing-content-narrow">{children}</div>;
}
