import Link from "next/link";
import Image from "next/image";
import { GITHUB_REPO, githubBlobPath } from "@/lib/github";

export function LandingFooter() {
  return (
    <footer className="border-divider">
      <div className="mx-auto w-full max-w-5xl section-padding-x py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 sm:gap-6 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 min-h-[44px] sm:min-h-0 shrink-0 min-w-0 text-xs font-medium tracking-tight opacity-60 hover:opacity-100 transition-opacity touch-manipulation [-webkit-tap-highlight-color:transparent]"
          style={{ color: "var(--foreground)" }}
        >
          <span className="logo-wrapper relative block h-4 w-4 shrink-0">
            <Image
              src="/logo.svg"
              alt=""
              width={16}
              height={16}
              className="logo-light absolute inset-0 h-4 w-4 object-contain"
              unoptimized
            />
            <Image
              src="/logo-dark.svg"
              alt=""
              width={16}
              height={16}
              className="logo-dark absolute inset-0 h-4 w-4 object-contain"
              unoptimized
            />
          </span>
          AEP — Agent Economic Protocol
        </Link>
        <nav className="landing-footer-nav flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-3 sm:gap-4 text-xs">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 py-2 sm:py-0 px-2 sm:px-0 opacity-50 hover:opacity-100 transition-opacity touch-manipulation [-webkit-tap-highlight-color:transparent]"
            style={{ color: "var(--foreground)" }}
          >
            Docs
          </Link>
          <Link
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 py-2 sm:py-0 px-2 sm:px-0 opacity-50 hover:opacity-100 transition-opacity touch-manipulation [-webkit-tap-highlight-color:transparent]"
            style={{ color: "var(--foreground)" }}
          >
            GitHub
          </Link>
          <Link
            href={
              process.env.NEXT_PUBLIC_DISCORD_URL ??
              "https://discord.gg/aep"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 py-2 sm:py-0 px-2 sm:px-0 opacity-50 hover:opacity-100 transition-opacity touch-manipulation [-webkit-tap-highlight-color:transparent]"
            style={{ color: "var(--foreground)" }}
          >
            Discord
          </Link>
          <Link
            href={githubBlobPath("audit-report.md")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 py-2 sm:py-0 px-2 sm:px-0 opacity-50 hover:opacity-100 transition-opacity touch-manipulation [-webkit-tap-highlight-color:transparent]"
            style={{ color: "var(--foreground)" }}
          >
            Security review
          </Link>
        </nav>
      </div>
    </footer>
  );
}
