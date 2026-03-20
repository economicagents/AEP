"use client";

import { useCallback, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

interface DocCopyMarkdownProps {
  content: string;
}

export function DocCopyMarkdown({ content }: DocCopyMarkdownProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [content]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="doc-btn text-[11px] font-medium rounded px-2 py-1 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      style={{
        color: "var(--foreground)",
        opacity: 0.6,
      }}
      aria-label="Copy page as markdown"
    >
      <span className="inline-flex items-center gap-1.5">
        {copied ? (
          <>
            <CheckIcon className="size-3.5 shrink-0" />
            Copied page
          </>
        ) : (
          <>
            <CopyIcon className="size-3.5 shrink-0" />
            Copy page as Markdown
          </>
        )}
      </span>
    </button>
  );
}
