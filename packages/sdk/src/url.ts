/**
 * URL validation for probe endpoints.
 * Prevents SSRF when probing arbitrary URLs (reject non-http(s), optionally private IPs).
 */

/**
 * Returns true if the URL is valid for probing (http/https, optionally rejects private IPs).
 *
 * @param url - URL to validate
 * @param allowPrivate - If false, reject localhost and private IP ranges (default: true for self-hosted)
 * @returns true if URL is valid for probe
 */
export function isValidProbeUrl(url: string, allowPrivate = true): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (!allowPrivate) {
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return false;
      const ip = parsed.hostname.replace(/^\[|\]$/g, "");
      if (/^127\./.test(ip) || /^10\./.test(ip) || /^192\.168\./.test(ip) || /^169\.254\./.test(ip)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
