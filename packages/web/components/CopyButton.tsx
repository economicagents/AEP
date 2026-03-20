"use client";

import { useState, useCallback } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard API may be unavailable in some contexts */
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="btn-landing btn-landing-secondary text-xs min-w-[44px] px-3 cursor-pointer"
      style={{ opacity: copied ? 0.9 : 0.7 }}
      onMouseEnter={(e) => {
        if (!copied) e.currentTarget.style.opacity = "0.7";
      }}
      onMouseLeave={(e) => {
        if (!copied) e.currentTarget.style.opacity = "0.4";
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
  );
}
