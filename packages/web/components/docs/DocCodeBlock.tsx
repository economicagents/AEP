"use client";

import React, { useRef, useCallback, useState, useMemo } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

/** Collect plain text from React nodes without reading the DOM. */
function collectText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return collectText(props.children);
  }
  return "";
}

function trimCodeFences(text: string): string {
  let trimmed = text.trim();
  // Remove leading fence: ``` or ```lang (rest of line + newlines)
  trimmed = trimmed.replace(/^`{3,}[^\n\r]*[\r\n]*\s*/, "");
  // Remove trailing fence: newlines + ```
  trimmed = trimmed.replace(/\s*[\r\n]*`{3,}\s*$/, "");
  // Remove single backticks from prefix and suffix
  trimmed = trimmed.replace(/^`+/, "").replace(/`+$/, "");
  return trimmed.trim();
}

interface DocCodeBlockProps {
  children?: React.ReactNode;
}

export function DocCodeBlock({ children }: DocCodeBlockProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const isSingleLine = useMemo(() => {
    const text = trimCodeFences(collectText(children));
    if (!text) return false;
    return text.split(/\r?\n/).length <= 1;
  }, [children]);

  const handleCopy = useCallback(async () => {
    const code = wrapperRef.current?.querySelector("code") ?? wrapperRef.current?.querySelector("pre code");
    const raw = code?.textContent ?? "";
    const text = trimCodeFences(raw);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard API may be unavailable */
    }
  }, []);

  const copyBtn = (
    <button
      type="button"
      onClick={handleCopy}
      className="doc-btn doc-code-copy-btn flex shrink-0 items-center justify-center rounded p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      style={{
        color: "var(--foreground)",
        background: "var(--docs-bg-subtle, rgba(37, 39, 59, 0.08))",
        border: "1px solid var(--docs-border-light, rgba(37, 39, 59, 0.12))",
      }}
      aria-label="Copy to clipboard"
    >
      {copied ? <CheckIcon className="size-4 shrink-0" /> : <CopyIcon className="size-4 shrink-0" />}
    </button>
  );

  if (isSingleLine) {
    return (
      <div ref={wrapperRef} className="doc-code-block group flex items-center gap-2">
        <pre className="doc-code-block-single flex-1 min-w-0">{children}</pre>
        {copyBtn}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="doc-code-block group">
      <div className="flex items-center justify-end gap-2 rounded-t-lg border border-b-0 border-[var(--docs-border-light)] bg-[var(--docs-bg-subtle)] px-2 py-1.5">
        <button
          type="button"
          onClick={handleCopy}
          className="doc-btn doc-code-copy-btn flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          style={{
            color: "var(--foreground)",
            background: "var(--docs-bg-subtle, rgba(37, 39, 59, 0.08))",
            border: "1px solid var(--docs-border-light, rgba(37, 39, 59, 0.12))",
          }}
          aria-label="Copy to clipboard"
        >
          <span className="inline-flex items-center gap-1.5">
            {copied ? (
              <>
                <CheckIcon className="size-3.5 shrink-0" />
                copied
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5 shrink-0" />
                copy
              </>
            )}
          </span>
        </button>
      </div>
      <pre className="rounded-b-lg rounded-t-none">{children}</pre>
    </div>
  );
}
