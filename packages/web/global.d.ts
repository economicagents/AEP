/// <reference types="@cloudflare/workers-types" />

// Global Cloudflare Workers types
// This ensures Cloudflare types are available throughout the project

declare global {
  interface CloudflareEnv {
    AI_GATEWAY_API_KEY?: string;
    AEP_DOCS_CHAT_MODEL?: string;
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    TURNSTILE_SECRET_KEY?: string;
  }
}

export {};
