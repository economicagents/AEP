export type ServiceEntry = { name: string; endpoint: string; version?: string };

/** Registration JSON sometimes uses a map/object for `services`; normalize to an array. */
export function normalizeServices(raw: unknown): ServiceEntry[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter(
      (s): s is ServiceEntry =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as { name?: unknown }).name === "string" &&
        typeof (s as { endpoint?: unknown }).endpoint === "string"
    );
  }
  if (typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>).filter(
      (s): s is ServiceEntry =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as { name?: unknown }).name === "string" &&
        typeof (s as { endpoint?: unknown }).endpoint === "string"
    );
  }
  return [];
}
