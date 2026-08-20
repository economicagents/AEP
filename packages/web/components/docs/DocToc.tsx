"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/docs";

interface DocTocProps {
  items: TocItem[];
  className?: string;
}

export function DocToc({ items, className = "" }: DocTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el != null);

    if (headings.length === 0) return;

    const syncActive = () => {
      const offset = 96;
      let current: string | null = headings[0]?.id ?? null;

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= offset) {
          current = heading.id;
        }
      }

      setActiveId(current);
    };

    syncActive();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        syncActive();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className={`doc-toc hidden lg:block shrink-0 w-48 ${className}`}
    >
      <div className="sticky top-6">
        <p className="doc-toc-label">On this page</p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <li
                key={item.id}
                className="doc-toc-item"
                style={{
                  paddingLeft:
                    item.depth > 2 ? `${(item.depth - 2) * 0.5}rem` : 0,
                }}
              >
                <Link
                  href={`#${item.id}`}
                  className={`doc-toc-link${isActive ? " doc-toc-link--active" : ""}`}
                  aria-current={isActive ? "location" : undefined}
                >
                  {item.text}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
