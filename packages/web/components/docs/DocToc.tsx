"use client";

import Link from "next/link";
import type { TocItem } from "@/lib/docs";

interface DocTocProps {
  items: TocItem[];
  className?: string;
}

export function DocToc({ items, className = "" }: DocTocProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className={`doc-toc hidden lg:block shrink-0 w-48 ${className}`}
    >
      <div className="sticky top-6">
        <p
          className="text-xs font-semibold mb-2"
          style={{ color: "var(--foreground)", opacity: 0.8 }}
        >
          On this page
        </p>
        <ul className="space-y-1.5 text-xs">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-l border-transparent pl-2 transition-colors duration-150 hover:border-[var(--foreground)]"
              style={{
                marginLeft: item.depth > 2 ? (item.depth - 2) * 0.5 : 0,
              }}
            >
              <Link
                href={`#${item.id}`}
                className="block py-0.5 transition-opacity duration-150 hover:opacity-80 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                style={{ color: "var(--foreground)", opacity: 0.85 }}
              >
                {item.text}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
