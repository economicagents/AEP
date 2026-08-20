"use client";

import type { ReactNode } from "react";
import { DitherVisual } from "@/components/DitherVisual";

type DitherVariant = "wave" | "plasma" | "warp";

type LandingPanelProps = {
  ditherVariant: DitherVariant;
  ditherHeight?: number;
  minHeightClass?: string;
  scrollX?: boolean;
  children: ReactNode;
  contentClassName?: string;
  /** Accessible name when panel scrolls horizontally */
  ariaLabel?: string;
};

export function LandingPanel({
  ditherVariant,
  ditherHeight = 192,
  minHeightClass = "min-h-[12rem]",
  scrollX = false,
  children,
  contentClassName = "",
  ariaLabel,
}: LandingPanelProps) {
  const outerClass = scrollX
    ? "landing-panel landing-panel-scroll"
    : "landing-panel";

  return (
    <div
      className={outerClass}
      {...(ariaLabel
        ? { role: "region" as const, "aria-label": ariaLabel }
        : {})}
    >
      <div className={`landing-dither-left ${minHeightClass}`} aria-hidden>
        <DitherVisual
          width={16}
          height={ditherHeight}
          variant={ditherVariant}
          speed={0}
          className="h-full w-full object-cover"
        />
      </div>
      <div className={`landing-panel-content ${contentClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}

type LandingCardProps = {
  title: string;
  children: ReactNode;
  ditherVariant: DitherVariant;
  titleAs?: "h3" | "span";
};

export function LandingCard({
  title,
  children,
  ditherVariant,
  titleAs = "h3",
}: LandingCardProps) {
  const TitleTag = titleAs;

  return (
    <article className="landing-card landing-card-hover">
      <div className="landing-dither-top" aria-hidden>
        <DitherVisual
          width={192}
          height={20}
          variant={ditherVariant}
          speed={0}
          cellShape="grid"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="landing-card-body">
        <TitleTag className="landing-card-title">{title}</TitleTag>
        {children}
      </div>
    </article>
  );
}

type LandingStripCardProps = {
  label: string;
  note: string;
  ditherVariant: DitherVariant;
};

export function LandingStripCard({
  label,
  note,
  ditherVariant,
}: LandingStripCardProps) {
  return (
    <div className="landing-strip-card landing-card-hover">
      <div className="landing-dither-strip-side" aria-hidden>
        <DitherVisual
          width={20}
          height={64}
          variant={ditherVariant}
          speed={0}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="landing-strip-card-body">
        <span className="landing-strip-card-label">{label}</span>
        <span className="landing-strip-card-note">{note}</span>
      </div>
    </div>
  );
}
