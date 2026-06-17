"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findNavMatch } from "@/lib/docs-nav";

function formatLabel(label: string): string {
  return label
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getBreadcrumbItems(pathname: string): Array<{ href: string; label: string; isCurrent: boolean }> {
  const items: Array<{ href: string; label: string; isCurrent: boolean }> = [
    { href: "/", label: "Home", isCurrent: false },
  ];

  if (!pathname || pathname === "/docs" || pathname === "/docs/") {
    items.push({ href: "/docs", label: "AEP Documentation", isCurrent: true });
    return items;
  }

  const path = pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  if (!path) {
    items.push({ href: "/docs", label: "AEP Documentation", isCurrent: true });
    return items;
  }

  const navMatch = findNavMatch(pathname);
  if (navMatch) {
    items.push({
      href: navMatch.section.href ?? navMatch.section.items[0]?.href ?? "/docs",
      label: navMatch.section.label,
      isCurrent: false,
    });
    items.push({
      href: navMatch.item.href,
      label: formatLabel(navMatch.item.label),
      isCurrent: true,
    });
    return items;
  }

  const parts = path.split("/");
  const lastPart = parts[parts.length - 1] ?? path;
  items.push({
    href: pathname,
    label: formatLabel(lastPart),
    isCurrent: true,
  });
  return items;
}

export function DocBreadcrumb() {
  const pathname = usePathname();
  const items = getBreadcrumbItems(pathname ?? "");

  return (
    <nav
      aria-label="Breadcrumb"
      className="doc-breadcrumb mb-4 flex items-center gap-1.5 text-xs sm:mb-5"
      style={{ color: "var(--foreground)", opacity: 0.85 }}
    >
      {items.map((item, i) => (
        <span key={item.href + i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span
              className="shrink-0 opacity-60"
              aria-hidden
            >
              ›
            </span>
          )}
          {item.isCurrent ? (
            <span className="doc-breadcrumb-current rounded-md px-2 py-0.5 font-medium">
              {item.label}
            </span>
          ) : item.href === "/" ? (
            <span
              className="flex items-center"
              aria-hidden
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:opacity-80 transition-opacity"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
