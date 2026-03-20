"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAV } from "@/lib/docs-nav";

function isActive(href: string, pathname: string): boolean {
  if (href === "/docs") return pathname === "/docs" || pathname === "/docs/";
  return pathname === href || pathname.startsWith(href + "/");
}

function isSectionActive(section: (typeof DOC_NAV)[0], pathname: string): boolean {
  return section.items.some((item) => isActive(item.href, pathname));
}

export function DocSidebar() {
  const pathname = usePathname();

  return (
    <nav
      className="doc-nav flex flex-col gap-1"
      aria-label="Documentation"
    >
      {DOC_NAV.map((section) => {
        const sectionActive = isSectionActive(section, pathname ?? "");
        return (
          <div key={section.label} className="flex flex-col gap-0.5">
            <Link
              href={section.href ?? section.items[0]?.href ?? "/docs"}
              className={`text-xs font-semibold py-2 px-2 -mx-2 rounded-sm transition-colors duration-150 hover:opacity-80 ${
                sectionActive ? "opacity-100" : "opacity-70"
              }`}
              style={{ color: "var(--foreground)" }}
            >
              {section.label}
            </Link>
            <div className="flex flex-col gap-0.5 pl-1 border-l border-transparent" style={{ borderColor: "var(--muted)" }}>
              {section.items.map((item) => {
                const active = isActive(item.href, pathname ?? "");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-xs py-1.5 px-2 -mx-2 rounded-sm min-h-[44px] md:min-h-0 flex items-center border-l-2 pl-2 -ml-px transition-colors duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                      active ? "border-[var(--accent)] font-medium doc-nav-active" : "border-transparent"
                    }`}
                    style={{ color: "var(--foreground)" }}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
