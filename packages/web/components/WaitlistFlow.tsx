"use client";

import { useState } from "react";

interface WaitlistFlowProps {
  onClose?: () => void;
  inline?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistFlow({ onClose, inline }: WaitlistFlowProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBaseStyle = {
    backgroundColor: "transparent",
    color: "var(--foreground)",
    border: "none",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = email.trim();
    if (!trimmed) return;

    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    setError(null);
    setLoading(true);

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    }).catch(() => {
      setError("Something went wrong");
      setLoading(false);
      return null;
    });

    if (!res) return;

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (inline) {
    return (
      <div className="w-full">
        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto"
          >
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-base sm:text-sm font-mono min-h-[44px] border-outline"
                style={inputBaseStyle}
                placeholder="you@example.com"
                aria-label="Email address"
              />
              {error && (
                <p
                  className="text-xs mt-1.5"
                  style={{ color: "var(--foreground)", opacity: 0.8 }}
                >
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="btn-landing btn-landing-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Joining..." : "Join waitlist"}
            </button>
          </form>
        ) : (
          <p
            className="waitlist-success-enter text-sm"
            style={{ color: "var(--foreground)", opacity: 0.9 }}
          >
            Thanks! We&apos;ll be in touch.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col items-center w-full pb-12 px-4 mt-8"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {!submitted ? (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[280px] mx-auto space-y-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <p
            className="text-sm mb-3 text-center"
            style={{ color: "var(--foreground)", opacity: 0.85 }}
          >
            Get notified when AEP launches
          </p>
          {error && (
            <p
              className="text-xs text-center mb-2"
              style={{ color: "var(--foreground)", opacity: 0.9 }}
            >
              {error}
            </p>
          )}
          <div>
            <label
              htmlFor="waitlist-email"
              className="block text-sm mb-1.5"
              style={{ color: "var(--foreground)", opacity: 0.85 }}
            >
              Email *
            </label>
            <input
              id="waitlist-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-base font-mono focus:ring-1 min-h-[44px] border-outline"
              style={inputBaseStyle}
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            className="btn-landing btn-landing-primary w-full min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Joining..." : "Join waitlist"}
          </button>
        </form>
      ) : (
        <p
          className="waitlist-success-enter text-sm sm:text-base text-center px-4"
          style={{ color: "var(--foreground)", opacity: 0.9 }}
        >
          Thanks! We&apos;ll be in touch.
        </p>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="absolute bottom-2 left-4 text-sm font-normal transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer min-h-[36px] min-w-[64px] flex items-center justify-center"
          style={{ color: "var(--foreground)", opacity: 0.5 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.7";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.5";
          }}
          aria-label="Close waitlist"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
