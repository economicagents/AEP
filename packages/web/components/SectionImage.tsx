"use client";

import { useState } from "react";
import Image from "next/image";
import { DitherVisual } from "@/components/DitherVisual";

type DitherVariant = "wave" | "plasma" | "warp";

type SectionImageLayout =
  | "default"
  | "banner"
  | "strip"
  | "square"
  | "accent";

interface SectionImageProps {
  slug: string;
  ditherVariant?: DitherVariant;
  layout?: SectionImageLayout;
  className?: string;
}

const ASPECT_MAP: Record<SectionImageLayout, string> = {
  default: "4/3",
  banner: "16/9",
  strip: "3/4",
  square: "1/1",
  accent: "1/1",
};

export function SectionImage({
  slug,
  ditherVariant = "plasma",
  layout = "default",
  className = "",
}: SectionImageProps) {
  const [useFallback, setUseFallback] = useState(false);

  const handleError = () => {
    setUseFallback(true);
  };

  const aspect = ASPECT_MAP[layout];
  const isAccent = layout === "accent";

  const baseClasses = [
    "section-image-wrapper relative overflow-hidden opacity-[0.12] rounded-sm",
    layout === "banner" ? "section-image-banner" : "",
    layout === "accent" ? "section-image-accent" : "",
    layout === "strip" ? "section-image-strip" : "",
    layout === "square" ? "section-image-square" : "",
    layout === "default" ? "section-image-default" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (useFallback) {
    return (
      <div
        className={`${baseClasses} ${className}`}
        style={{ aspectRatio: aspect }}
      >
        <DitherVisual
          width={96}
          height={96}
          variant={ditherVariant}
          speed={0}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{ aspectRatio: aspect }}
    >
      <Image
        src={`/images/landing/${slug}-light.png`}
        alt=""
        fill
        className="section-image-light object-contain"
        style={{ imageRendering: "pixelated" }}
        onError={handleError}
        sizes={isAccent ? "160px" : "(max-width: 768px) 100vw, 400px"}
      />
      <Image
        src={`/images/landing/${slug}-dark.png`}
        alt=""
        fill
        className="section-image-dark object-contain"
        style={{ imageRendering: "pixelated" }}
        onError={handleError}
        sizes={isAccent ? "160px" : "(max-width: 768px) 100vw, 400px"}
      />
    </div>
  );
}
