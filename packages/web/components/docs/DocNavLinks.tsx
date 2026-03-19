"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const docLinks = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/getting-started/quickstart", label: "Quick Start" },
  { href: "/docs/cookbook", label: "Cookbook" },
  { href: "/docs/deployment", label: "Deployment" },
  { href: "/docs/architecture", label: "Architecture" },
  { href: "/docs/threat-model", label: "Threat Model" },
  { href: "/docs/api", label: "API Reference" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/docs") return pathname === "/docs" || pathname === "/docs/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DocNavLinks() {
  const pathname = usePathname();

  return (
    <>
      {docLinks.map((link) => {
        const active = isActive(link.href, pathname ?? "");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-xs py-2.5 md:py-1.5 px-2 -mx-2 shrink-0 rounded-sm min-h-[44px] md:min-h-0 flex items-center border-l-2 pl-2 -ml-px transition-colors duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
              active
                ? "border-[var(--accent)] font-medium doc-nav-active"
                : "border-transparent"
            }`}
            style={{ color: "var(--foreground)" }}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
