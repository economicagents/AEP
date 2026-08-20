"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type InViewRevealProps = {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
};

export function InViewReveal({
  children,
  className = "",
  enabled = true,
}: InViewRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  const mergedClass = [
    enabled ? "in-view-reveal" : "",
    visible ? "in-view-reveal--visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={mergedClass || undefined}>
      {children}
    </div>
  );
}
