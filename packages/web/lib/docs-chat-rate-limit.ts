import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Pair = { minute: Ratelimit; hour: Ratelimit };
const cache = new Map<string, Pair>();

function getPair(url: string, token: string): Pair {
  const key = `${url}\0${token}`;
  let pair = cache.get(key);
  if (!pair) {
    const redis = new Redis({ url, token });
    pair = {
      minute: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "docs-chat-m",
      }),
      hour: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 h"),
        prefix: "docs-chat-h",
      }),
    };
    cache.set(key, pair);
  }
  return pair;
}

/**
 * Returns whether the request is allowed. If Upstash env is unset, always allows.
 */
export async function checkDocsChatRateLimit(
  url: string | undefined,
  token: string | undefined,
  clientKey: string
): Promise<{ allowed: boolean }> {
  if (!url?.trim() || !token?.trim()) {
    return { allowed: true };
  }
  try {
    const { minute, hour } = getPair(url.trim(), token.trim());
    const [m, h] = await Promise.all([minute.limit(clientKey), hour.limit(clientKey)]);
    return { allowed: m.success && h.success };
  } catch {
    // Fail open: do not block the assistant if Upstash is misconfigured or unreachable.
    return { allowed: true };
  }
}
