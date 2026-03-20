"use client";

import Link from "next/link";
import { DitherVisual } from "@/components/DitherVisual";

interface DocCardProps {
  href: string;
  label: string;
  description: string;
}

const ACCENT_W = 24;
const ACCENT_H = 80;

export function DocCard({ href, label, description }: DocCardProps) {
  return (
    <Link
      href={href}
      className="group flex border-outline transition-all duration-200 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] min-h-[72px] sm:min-h-0"
    >
      <div
        className="shrink-0 w-5 sm:w-6 self-stretch min-h-14 overflow-hidden opacity-60 group-hover:opacity-80 transition-opacity"
        aria-hidden
      >
        <DitherVisual
          width={ACCENT_W}
          height={ACCENT_H}
          variant="plasma"
          speed={0}
          inverted={false}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-center">
        <h2 className="text-sm sm:text-base font-medium mb-0.5 sm:mb-1 group-hover:underline">
          {label}
        </h2>
        <p className="text-xs sm:text-sm leading-snug line-clamp-2" style={{ opacity: 0.8 }}>
          {description}
        </p>
      </div>
    </Link>
  );
}
