"use client";

import Link from "next/link";
import type { RefObject } from "react";

interface DocNavLinkProps {
  href: string;
  label: string;
  active: boolean;
  activeRef?: RefObject<HTMLAnchorElement | null>;
  nested?: boolean;
}

export function DocNavLink({
  href,
  label,
  active,
  activeRef,
  nested = false,
}: DocNavLinkProps) {
  return (
    <Link
      ref={active ? activeRef : undefined}
      href={href}
      className={`doc-nav-link${nested ? " doc-nav-link--nested" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
