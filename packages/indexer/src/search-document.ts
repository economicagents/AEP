import type { IndexedProvider } from "./types.js";

/** Lexical + hybrid search document (name, description, service names). */
export function buildSearchDocument(p: IndexedProvider): string {
  const name = p.name ?? "";
  const description = p.description ?? "";
  const servicesText = p.services.map((s) => s.name).join(" ");
  return [name, description, servicesText].filter(Boolean).join("\n");
}
