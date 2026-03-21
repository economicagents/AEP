"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { ChatBubbleIcon, CloseIcon } from "@/components/icons";
import { safeMarkdownHref } from "@/lib/docs-chat-safe-href";

const MAX_MESSAGE_CHARS = 8000;
const REMARK_PLUGINS = [remarkGfm];

const LOADING_HINTS = [
  "Searching the documentation…",
  "Finding relevant sections…",
  "Almost ready…",
] as const;

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

function isChatDisabledByEnv(): boolean {
  const v = process.env.NEXT_PUBLIC_AEP_DOCS_CHAT?.trim().toLowerCase();
  return v === "0" || v === "false";
}

function getTurnstileSiteKey(): string | undefined {
  const v = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return v || undefined;
}

function subscribeReducedMotion(callback: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  const safe = safeMarkdownHref(href);
  if (!safe) {
    return <span style={{ opacity: 0.7 }}>{children}</span>;
  }
  const external = safe.startsWith("http");
  return (
    <a
      href={safe}
      rel={external ? "noopener noreferrer" : undefined}
      target={external ? "_blank" : undefined}
      className="underline underline-offset-2"
    >
      {children}
    </a>
  );
}

const MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
} satisfies Components;

const AssistantMessageBubble = memo(function AssistantMessageBubble({
  content,
}: {
  content: string;
}) {
  return (
    <div className="docs-chat-md prose prose-sm max-w-none text-[var(--foreground)] [&_a]:text-[var(--accent)] [&_a]:underline [&_p]:my-1.5 [&_li]:my-0.5 [&_code]:text-[0.8125rem] [&_code]:break-words [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[var(--docs-bg-subtle)]">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

function newMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function DocsChatWidgetClient() {
  if (isChatDisabledByEnv()) {
    return null;
  }
  return <DocsChatWidgetInner />;
}

function DocsChatWidgetInner() {
  const panelId = useId();
  const inputId = useId();
  const turnstileSiteKey = getTurnstileSiteKey();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingHintIndex, setLoadingHintIndex] = useState(0);
  const [turnstileReady, setTurnstileReady] = useState(() => !getTurnstileSiteKey());

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileMountElRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileTokenRef = useRef<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  const prefersReducedMotion = usePrefersReducedMotion();

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    scrollToBottom();
  }, [messages, loading, open, scrollToBottom]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!loading || prefersReducedMotion) return;
    setLoadingHintIndex(0);
    const id = window.setInterval(() => {
      setLoadingHintIndex((i) => (i + 1) % LOADING_HINTS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [loading, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      fetchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) {
      setTurnstileReady(true);
      return;
    }
    if (!open) return;
    setTurnstileReady(false);
    turnstileTokenRef.current = null;
  }, [open, turnstileSiteKey]);

  useEffect(() => {
    if (!open || !turnstileSiteKey) return;

    let cancelled = false;
    const container = () => turnstileContainerRef.current;

    const mountWidget = () => {
      if (cancelled) return;
      const el = container();
      if (!el) return;
      turnstileMountElRef.current = el;
      const w = window as Window & {
        turnstile?: {
          render: (h: HTMLElement, opts: Record<string, unknown>) => string;
          remove: (id: string) => void;
          reset?: (id: string) => void;
        };
      };
      if (!w.turnstile) return;
      el.innerHTML = "";
      turnstileWidgetIdRef.current = w.turnstile.render(el, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => {
          turnstileTokenRef.current = token;
          setTurnstileReady(true);
        },
        "error-callback": () => {
          turnstileTokenRef.current = null;
          setTurnstileReady(false);
        },
        "expired-callback": () => {
          turnstileTokenRef.current = null;
          setTurnstileReady(false);
        },
      });
    };

    const MAX_MOUNT_ATTEMPTS = 90;

    const tryMount = (attempt: number) => {
      if (attempt > MAX_MOUNT_ATTEMPTS || cancelled) return;
      requestAnimationFrame(() => {
        if (cancelled) return;
        const el = container();
        if (!el) {
          tryMount(attempt + 1);
          return;
        }
        const w = window as Window & { turnstile?: unknown };
        if (w.turnstile) {
          mountWidget();
          return;
        }
        const existing = document.querySelector(
          'script[src*="challenges.cloudflare.com/turnstile"]'
        );
        if (existing) {
          existing.addEventListener("load", mountWidget, { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api";
        script.async = true;
        script.onload = mountWidget;
        document.body.appendChild(script);
      });
    };

    tryMount(0);

    return () => {
      cancelled = true;
      const id = turnstileWidgetIdRef.current;
      const w = window as Window & { turnstile?: { remove: (x: string) => void } };
      if (id && w.turnstile?.remove) {
        try {
          w.turnstile.remove(id);
        } catch {
          /* ignore */
        }
      }
      turnstileWidgetIdRef.current = null;
      turnstileTokenRef.current = null;
      const mountEl = turnstileMountElRef.current;
      turnstileMountElRef.current = null;
      if (mountEl) mountEl.innerHTML = "";
    };
  }, [open, turnstileSiteKey]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (turnstileSiteKey && !turnstileTokenRef.current) {
      setError("Complete the verification challenge, then try again.");
      return;
    }

    setError(null);
    const userMsg: ChatMessage = { id: newMessageId(), role: "user", content: text };
    const nextMessages: ChatMessage[] = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;
    const seq = ++requestSeqRef.current;

    let res: Response | null = null;
    try {
      res = await fetch("/api/docs-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          turnstileToken: turnstileTokenRef.current ?? undefined,
        }),
        signal: ac.signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }
      res = null;
    } finally {
      if (fetchAbortRef.current === ac) fetchAbortRef.current = null;
      if (mountedRef.current) setLoading(false);
    }

    if (seq !== requestSeqRef.current) return;

    if (!mountedRef.current) return;

    if (!res) {
      setError("We couldn’t reach the server. Check your connection and try again.");
      return;
    }

    const data = (await res.json().catch(() => ({}))) as {
      reply?: string;
      error?: string;
      detail?: string;
    };

    if (!res.ok) {
      const msg =
        data.error ??
        (res.status === 503
          ? "The assistant is not configured on the server (missing AI_GATEWAY_API_KEY for this deployment). Operators: set a runtime Worker secret or variable."
          : res.status === 429
            ? "Too many requests. Wait a moment and try again."
            : res.status === 413
              ? "That message is too long. Shorten it and try again."
              : res.status === 504
                ? "The request timed out. Try a shorter question."
                : "Something went wrong. Please try again.");
      setError(
        process.env.NODE_ENV === "development" && data.detail
          ? `${msg} ${data.detail}`
          : msg
      );
      return;
    }

    if (typeof data.reply !== "string" || !data.reply.trim()) {
      setError("No answer came back. Try again in a moment.");
      return;
    }

    const assistantMsg: ChatMessage = {
      id: newMessageId(),
      role: "assistant",
      content: data.reply.trim(),
    };
    setMessages([...nextMessages, assistantMsg]);

    if (turnstileSiteKey) {
      const wid = turnstileWidgetIdRef.current;
      const tw = window as Window & { turnstile?: { reset?: (id: string) => void } };
      if (wid && tw.turnstile?.reset) {
        try {
          tw.turnstile.reset(wid);
        } catch {
          /* ignore */
        }
      }
      turnstileTokenRef.current = null;
      setTurnstileReady(false);
    }
  }, [input, loading, messages, turnstileSiteKey]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void send();
    },
    [send]
  );

  const toggleOpen = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  const loadingLabel = prefersReducedMotion
    ? "Working on your question…"
    : LOADING_HINTS[loadingHintIndex] ?? LOADING_HINTS[0];

  return (
    <div
      className="fixed z-[100] flex flex-col items-end gap-3 pointer-events-none"
      style={{
        right: "max(var(--space-4), env(safe-area-inset-right))",
        bottom: "max(var(--space-4), env(safe-area-inset-bottom))",
      }}
    >
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label="AEP docs assistant"
          className="docs-chat-panel docs-chat-panel-enter pointer-events-auto flex w-[min(100vw-1.25rem,26rem)] sm:w-[min(100vw-2rem,28rem)] max-h-[min(32rem,75dvh)] flex-col overflow-hidden rounded-2xl"
          style={{
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          <div
            className="docs-chat-head flex shrink-0 items-start justify-between gap-3 px-4 py-3"
            style={{ backgroundColor: "var(--docs-bg-subtle)" }}
          >
            <div className="min-w-0 pt-0.5">
              <p
                className="font-semibold leading-tight tracking-tight"
                style={{ fontSize: "var(--text-sm)" }}
              >
                Docs assistant
              </p>
              <p
                className="mt-1 leading-snug"
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--foreground)",
                  opacity: 0.65,
                }}
              >
                Published docs only—not live chain or wallets.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="docs-chat-close -mr-1 -mt-1 flex shrink-0 items-center justify-center rounded-lg p-2 hover:opacity-90 min-h-[44px] min-w-[44px] touch-manipulation transition-opacity"
              style={{
                color: "var(--foreground)",
                backgroundColor: "transparent",
              }}
              aria-label="Close assistant"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {messages.length === 0 && !loading && (
              <p
                className="leading-relaxed"
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--foreground)",
                  opacity: 0.75,
                }}
              >
                Ask about setup, CLI, architecture, or deployment.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`text-sm leading-snug rounded-xl px-3 py-2.5 ${
                  m.role === "user" ? "ml-5 sm:ml-8 font-mono" : "mr-1"
                }`}
                style={
                  m.role === "user"
                    ? {
                        fontSize: "var(--text-sm)",
                        backgroundColor: "var(--docs-bg-subtle)",
                      }
                    : {
                        backgroundColor: "var(--docs-bg-subtle)",
                        fontSize: "var(--text-sm)",
                      }
                }
              >
                {m.role === "assistant" ? (
                  <AssistantMessageBubble content={m.content} />
                ) : (
                  m.content
                )}
              </div>
            ))}
            {loading && (
              <p
                className="docs-chat-loading animate-pulse motion-reduce:animate-none"
                style={{ fontSize: "var(--text-xs)", opacity: 0.7 }}
                aria-live="polite"
                aria-busy="true"
              >
                {loadingLabel}
              </p>
            )}
            {error ? (
              <p className="docs-chat-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={onSubmit}
            className="docs-chat-foot shrink-0 p-3 sm:p-4"
            aria-busy={loading}
          >
            <label htmlFor={inputId} className="sr-only">
              Your question
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              {turnstileSiteKey ? (
                <div
                  ref={turnstileContainerRef}
                  className="docs-chat-turnstile w-full min-h-[65px] flex items-center justify-center"
                  aria-hidden={false}
                />
              ) : null}
              <textarea
                ref={inputRef}
                id={inputId}
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. How do I configure the indexer on Base?"
                disabled={loading}
                className="docs-chat-input min-h-[88px] sm:min-h-[72px] flex-1 resize-y rounded-xl px-3 py-2.5 font-mono sm:text-sm"
                style={{
                  color: "var(--foreground)",
                  maxHeight: "10rem",
                }}
                maxLength={MAX_MESSAGE_CHARS}
              />
              <button
                type="submit"
                disabled={
                  loading ||
                  !input.trim() ||
                  (Boolean(turnstileSiteKey) && !turnstileReady)
                }
                className="docs-chat-send shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium min-h-[44px] w-full sm:w-auto sm:min-w-[5.5rem] touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed combo-1"
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggleOpen}
        className="docs-chat-fab pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full combo-1 touch-manipulation min-h-[56px] min-w-[56px]"
        aria-label={
          open ? "Close docs assistant" : "Open docs assistant"
        }
      >
        <ChatBubbleIcon className="h-6 w-6 docs-chat-fab-icon" />
      </button>
    </div>
  );
}
