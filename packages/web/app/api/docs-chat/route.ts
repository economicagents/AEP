import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildRetrievedContext,
  formatContextForPrompt,
} from "@/lib/docs-chat-retrieval";

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-3-5-haiku-20241022";

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
});

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

interface AnthropicMessageResponse {
  content: AnthropicTextBlock[];
  stop_reason?: string;
}

function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

function getModel(): string {
  const raw = process.env.AEP_DOCS_CHAT_MODEL?.trim();
  if (!raw) return DEFAULT_MODEL;
  if (!/^[a-zA-Z0-9._-]+$/.test(raw)) return DEFAULT_MODEL;
  return raw;
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

export async function POST(request: Request) {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The assistant isn’t configured for this deployment. Set ANTHROPIC_API_KEY for the web app.",
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

  const anthropicMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages: anthropicMessages,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
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
    return NextResponse.json(
      { error: "Could not reach the assistant service. Try again shortly." },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    const status = response.status;
    if (status === 429) {
      return NextResponse.json(
        {
          error:
            "The assistant provider rate limit was reached. Wait a moment and try again.",
        },
        { status: 429 }
      );
    }
    if (status === 400 || status === 404) {
      return NextResponse.json(
        {
          error: "Assistant configuration error. Check the model id and API key.",
          detail:
            process.env.NODE_ENV === "development"
              ? errText.slice(0, 500)
              : undefined,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        error: "The assistant request failed. Try again.",
        detail:
          process.env.NODE_ENV === "development"
            ? errText.slice(0, 500)
            : undefined,
      },
      { status: 502 }
    );
  }

  let data: AnthropicMessageResponse;
  try {
    data = (await response.json()) as AnthropicMessageResponse;
  } catch {
    return NextResponse.json(
      { error: "The assistant returned an invalid response. Try again." },
      { status: 502 }
    );
  }

  const text = data.content
    .filter((b): b is AnthropicTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) {
    return NextResponse.json(
      { error: "The assistant returned an empty answer. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ reply: text });
}
