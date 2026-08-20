"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { DocSidebar } from "@/components/docs/DocSidebar";

export function DocAsideShell() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const panelId = useId();

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="flex flex-col md:h-full md:min-h-0 md:shrink-0">
      <button
        type="button"
        className="doc-aside-toggle md:hidden flex w-full items-center justify-between gap-3 border-b border-divider px-4 py-3 text-left text-xs font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
        style={{ color: "var(--foreground)" }}
        aria-expanded={mobileOpen}
        aria-controls={panelId}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>Browse docs</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          aria-hidden="true"
          className={`doc-aside-toggle-chevron size-3 shrink-0${
            mobileOpen ? " doc-aside-toggle-chevron--open" : ""
          }`}
        >
          <polygon points="0,64 128,192 256,64" fill="currentColor" />
        </svg>
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="doc-aside-backdrop doc-aside-backdrop--open md:hidden fixed inset-0 z-40"
          aria-label="Close docs menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id={panelId}
        className={`doc-aside shrink-0 overflow-y-auto overscroll-y-contain min-h-0 h-full px-4 sm:px-5 py-4 md:py-6 border-divider md:border-r md:w-56 md:max-h-none md:relative md:translate-x-0 md:shadow-none ${
          mobileOpen
            ? "doc-aside--mobile-open fixed top-14 bottom-0 left-0 z-50 w-[min(100%,18rem)] max-h-none shadow-xl"
            : "hidden md:block md:max-h-none"
        }`}
        style={{
          backgroundColor: "var(--background)",
          paddingLeft: mobileOpen
            ? "max(1rem, env(safe-area-inset-left))"
            : undefined,
          paddingBottom: mobileOpen
            ? "max(1rem, env(safe-area-inset-bottom))"
            : undefined,
        }}
      >
        <nav className="doc-aside-meta-row" aria-label="Docs navigation">
          <Link href="/" className="doc-aside-meta">
            ← Homepage
          </Link>
          <span className="doc-aside-meta-sep" aria-hidden="true">
            ·
          </span>
          <Link href="/docs" className="doc-aside-meta">
            Documentation
          </Link>
        </nav>
        <DocSidebar />
      </aside>
    </div>
  );
}
