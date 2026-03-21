/**
 * Restrict markdown link hrefs in the docs assistant to safe targets (same-site paths,
 * http(s), mailto, in-page anchors). Blocks javascript:, data:, and protocol-relative URLs.
 */
export function safeMarkdownHref(href: string | undefined): string | undefined {
  if (href === undefined) return undefined;
  const h = href.trim();
  if (h === "") return undefined;
  const lower = h.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return undefined;
  }
  if (h.startsWith("#")) return h;
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (h.startsWith("mailto:")) {
    const path = h.slice(7).split("?")[0] ?? "";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(path)) return h;
    return undefined;
  }
  try {
    const u = new URL(h);
    if (u.protocol === "https:" || u.protocol === "http:") return h;
  } catch {
    return undefined;
  }
  return undefined;
}
