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
      type="button"
      onClick={handleCopy}
      className={`copy-button btn-landing btn-landing-secondary text-xs min-w-[44px] px-3 cursor-pointer${
        copied ? " copy-button--copied" : ""
      }`}
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
    >
      <span className="inline-flex items-center gap-1.5" aria-live="polite">
        {copied ? (
          <>
            <CheckIcon className="size-3.5 shrink-0" />
            Copied
          </>
        ) : (
          <>
            <CopyIcon className="size-3.5 shrink-0" />
            Copy
          </>
        )}
      </span>
    </button>
  );
}
