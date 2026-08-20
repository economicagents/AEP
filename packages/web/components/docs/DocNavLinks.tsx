"use client";

import { usePathname } from "next/navigation";
import { DocNavLink } from "@/components/docs/DocNavLink";
import { isNavLinkActive } from "@/components/docs/doc-nav-utils";

const docLinks = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/getting-started/quickstart", label: "Quick Start" },
  { href: "/docs/cookbook", label: "Cookbook" },
  { href: "/docs/guides/deployment", label: "Deployment" },
  { href: "/docs/architecture", label: "Architecture" },
  { href: "/docs/threat-model", label: "Threat Model" },
  { href: "/docs/api", label: "API Reference" },
];

export function DocNavLinks() {
  const pathname = usePathname() ?? "";

  return (
    <>
      {docLinks.map((link) => (
        <DocNavLink
          key={link.href}
          href={link.href}
          label={link.label}
          active={isNavLinkActive(link.href, pathname)}
        />
      ))}
    </>
  );
}
