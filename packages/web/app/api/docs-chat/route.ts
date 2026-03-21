import type { GatewayLanguageModelOptions } from "@ai-sdk/gateway";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createGateway, generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkDocsChatRateLimit } from "@/lib/docs-chat-rate-limit";
import { verifyTurnstileToken } from "@/lib/docs-chat-turnstile";
import {
  buildRetrievedContext,
  formatContextForPrompt,
} from "@/lib/docs-chat-retrieval";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 8000;
const MAX_OUTPUT_TOKENS = 1200;
/** Reject oversized JSON bodies when Content-Length is present (abuse / cost control). */
const MAX_BODY_BYTES = 512_000;
const UPSTREAM_TIMEOUT_MS = 60_000;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(MAX_MESSAGE_CHARS),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
  turnstileToken: z.string().max(5000).optional(),
});

function envStringFromProcess(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

async function resolveEnvString(key: string): Promise<string | undefined> {
  const fromProcess = envStringFromProcess(key);
  if (fromProcess) return fromProcess;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const v = env[key as keyof typeof env];
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch {
    // Not running on Cloudflare Worker (e.g. Node `next start`)
  }
  return undefined;
}

async function getGatewayApiKey(): Promise<string | undefined> {
  return resolveEnvString("AI_GATEWAY_API_KEY");
}

function isValidGatewayModelId(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 3 || t.length > 120) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(t);
}

async function getModel(): Promise<string> {
  const raw = await resolveEnvString("AEP_DOCS_CHAT_MODEL");
  if (!raw) return DEFAULT_MODEL;
  if (!isValidGatewayModelId(raw)) return DEFAULT_MODEL;
  return raw.trim();
}

function normalizeMessages(
  messages: z.infer<typeof BodySchema>["messages"]
): { role: "user" | "assistant"; content: string }[] | null {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    const content = m.content.trim();
    if (content.length === 0) return null;
    if (content.length > MAX_MESSAGE_CHARS) return null;
    out.push({ role: m.role, content });
  }
  return out;
}

function getClientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

async function hashClientKeyForGateway(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`aep-docs-chat:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 48);
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const upstashUrl = await resolveEnvString("UPSTASH_REDIS_REST_URL");
  const upstashToken = await resolveEnvString("UPSTASH_REDIS_REST_TOKEN");
  const rate = await checkDocsChatRateLimit(upstashUrl, upstashToken, clientIp);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many requests from this network. Wait a minute and try again.",
      },
      { status: 429 }
    );
  }

  const apiKey = await getGatewayApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The assistant isn’t configured for this deployment. Set AI_GATEWAY_API_KEY for the web app.",
      },
      { status: 503 }
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength)) {
    const n = parseInt(contentLength, 10);
    if (n > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      );
    }
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const turnstileSecret = await resolveEnvString("TURNSTILE_SECRET_KEY");
  if (turnstileSecret) {
    const token = parsed.data.turnstileToken?.trim();
    if (!token) {
      return NextResponse.json(
        {
          error:
            "Verification required. Complete the challenge in the chat panel and try again.",
        },
        { status: 400 }
      );
    }
    let turnstileOk = false;
    try {
      turnstileOk = await verifyTurnstileToken(turnstileSecret, token);
    } catch {
      return NextResponse.json(
        {
          error:
            "Verification service unavailable. Wait a moment and try again.",
        },
        { status: 502 }
      );
    }
    if (!turnstileOk) {
      return NextResponse.json(
        { error: "Verification failed. Refresh the page and try again." },
        { status: 400 }
      );
    }
  }

  const normalized = normalizeMessages(parsed.data.messages);
  if (!normalized) {
    return NextResponse.json(
      { error: "Each message must contain text after trimming whitespace." },
      { status: 400 }
    );
  }

  const messages = normalized;
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return NextResponse.json(
      { error: "The last message in the thread must be from the user." },
      { status: 400 }
    );
  }

  const retrieved = buildRetrievedContext(last.content);
  const contextBlock = formatContextForPrompt(retrieved);
  const sourceList =
    retrieved.sourcePaths.length > 0
      ? retrieved.sourcePaths.join(", ")
      : "See /docs";

  const system = `You are the Agent Economic Protocol (AEP) documentation assistant for visitors to economicagents.org.

Answer using only the excerpts below and the conversation so far. Do not invent contract addresses, CLI commands, API fields, environment variables, or behavior that are not clearly supported by those excerpts.

If the excerpts do not cover the question, say what is missing and point to the best-matching documentation using markdown links, e.g. [Architecture](/docs/reference/architecture).

Write clearly and concisely. Prefer short paragraphs or bullet lists for procedures. Preserve exact spelling of commands, package names, paths, and env vars as they appear in the excerpts.

Documentation excerpts:
---
${contextBlock}
---

Source paths (for your reference): ${sourceList}`;

  const coreMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const modelId = await getModel();
  const gateway = createGateway({ apiKey });
  const userHash = await hashClientKeyForGateway(clientIp);

  let text: string;
  try {
    const result = await generateText({
      model: gateway(modelId),
      system,
      messages: coreMessages,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      providerOptions: {
        gateway: {
          user: userHash,
        } satisfies GatewayLanguageModelOptions,
      },
    });
    text = result.text.trim();
  } catch (e: unknown) {
    const name = e instanceof Error ? e.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return NextResponse.json(
        {
          error:
            "The assistant took too long to respond. Try a shorter or simpler question.",
        },
        { status: 504 }
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    const lower = message.toLowerCase();
    if (
      lower.includes("429") ||
      lower.includes("rate limit") ||
      lower.includes("too many requests")
    ) {
      return NextResponse.json(
        {
          error:
            "The assistant provider rate limit was reached. Wait a moment and try again.",
        },
        { status: 429 }
      );
    }
    if (
      lower.includes("400") ||
      lower.includes("404") ||
      lower.includes("not found") ||
      lower.includes("invalid model")
    ) {
      return NextResponse.json(
        {
          error: "Assistant configuration error. Check the model id and API key.",
          detail:
            process.env.NODE_ENV === "development"
              ? message.slice(0, 500)
              : undefined,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        error: "The assistant request failed. Try again.",
        detail:
          process.env.NODE_ENV === "development" ? message.slice(0, 500) : undefined,
      },
      { status: 502 }
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: "The assistant returned an empty answer. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ reply: text });
}
