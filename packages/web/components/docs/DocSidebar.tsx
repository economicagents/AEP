"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DocNavLink } from "@/components/docs/DocNavLink";
import { DOC_NAV } from "@/lib/docs-nav";
import {
  isGroupActive,
  isNavLinkActive,
  isSectionActive,
} from "@/components/docs/doc-nav-utils";

function NavChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      aria-hidden="true"
      className={`doc-nav-chevron shrink-0 size-3 ${open ? "doc-nav-chevron--open" : ""}`}
    >
      <polygon points="0,64 128,192 256,64" fill="currentColor" />
    </svg>
  );
}

function sectionId(label: string): string {
  return `doc-nav-section-${label.replace(/\s+/g, "-").toLowerCase()}`;
}

function groupId(key: string): string {
  return `doc-nav-group-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

function initialExpandedSections(pathname: string): Set<string> {
  const labels = new Set<string>();
  for (const section of DOC_NAV) {
    if (isSectionActive(section, pathname)) {
      labels.add(section.label);
    }
  }
  return labels;
}

function initialExpandedGroups(pathname: string): Set<string> {
  const keys = new Set<string>();
  for (const section of DOC_NAV) {
    for (const group of section.groups ?? []) {
      if (isGroupActive(section, group.label, pathname)) {
        keys.add(`${section.label}:${group.label}`);
      }
    }
  }
  return keys;
}

export function DocSidebar() {
  const pathname = usePathname() ?? "";
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() =>
    initialExpandedSections(pathname),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    initialExpandedGroups(pathname),
  );
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      for (const section of DOC_NAV) {
        if (isSectionActive(section, pathname)) {
          next.add(section.label);
        }
      }
      return next;
    });
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      for (const section of DOC_NAV) {
        for (const group of section.groups ?? []) {
          if (isGroupActive(section, group.label, pathname)) {
            next.add(`${section.label}:${group.label}`);
          }
        }
      }
      return next;
    });
  }

  useEffect(() => {
    const aside = activeRef.current?.closest(".doc-aside");
    const active = activeRef.current;
    if (!aside || !active) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    active.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [pathname, expandedSections, expandedGroups]);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleGroup = (sectionLabel: string, groupLabel: string) => {
    const key = `${sectionLabel}:${groupLabel}`;
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <nav className="doc-nav flex flex-col gap-0.5" aria-label="Documentation">
      {DOC_NAV.map((section) => {
        const sectionOpen = expandedSections.has(section.label);
        const sectionActive = isSectionActive(section, pathname);
        const sectionControlId = sectionId(section.label);

        return (
          <div key={section.label} className="doc-nav-section">
            <button
              type="button"
              aria-expanded={sectionOpen}
              aria-controls={sectionControlId}
              onClick={() => toggleSection(section.label)}
              className={`doc-nav-section-toggle${sectionActive ? " doc-nav-section-toggle--active" : ""}`}
            >
              <NavChevron open={sectionOpen} />
              <span className="min-w-0 flex-1">{section.label}</span>
            </button>

            {sectionOpen ? (
              <div id={sectionControlId} className="doc-nav-section-items">
                {section.items.map((item) => (
                  <DocNavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={isNavLinkActive(item.href, pathname)}
                    activeRef={activeRef}
                  />
                ))}

                {section.groups?.map((group) => {
                  const groupKey = `${section.label}:${group.label}`;
                  const groupOpen = expandedGroups.has(groupKey);
                  const groupActive = isGroupActive(section, group.label, pathname);
                  const groupControlId = groupId(groupKey);

                  return (
                    <div key={groupKey} className="doc-nav-group">
                      <button
                        type="button"
                        aria-expanded={groupOpen}
                        aria-controls={groupControlId}
                        onClick={() => toggleGroup(section.label, group.label)}
                        className={`doc-nav-group-toggle${groupActive ? " doc-nav-group-toggle--active" : ""}`}
                      >
                        <NavChevron open={groupOpen} />
                        <span className="min-w-0 flex-1">{group.label}</span>
                      </button>

                      {groupOpen ? (
                        <div id={groupControlId} className="doc-nav-group-items">
                          {group.items.map((item) => (
                            <DocNavLink
                              key={item.href}
                              href={item.href}
                              label={item.label}
                              active={isNavLinkActive(item.href, pathname)}
                              activeRef={activeRef}
                              nested
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
