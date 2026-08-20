import type { NavSection } from "@/lib/docs-nav";
import { flattenSectionLinks } from "@/lib/docs-nav";

export function isNavLinkActive(href: string, pathname: string): boolean {
  if (href === "/docs") return pathname === "/docs" || pathname === "/docs/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function isSectionActive(section: NavSection, pathname: string): boolean {
  return flattenSectionLinks(section).some((item) => isNavLinkActive(item.href, pathname));
}

export function isGroupActive(section: NavSection, groupLabel: string, pathname: string): boolean {
  const group = section.groups?.find((entry) => entry.label === groupLabel);
  if (!group) return false;
  return group.items.some((item) => isNavLinkActive(item.href, pathname));
}
