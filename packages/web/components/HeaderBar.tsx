"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { GitHubLogo, DiscordLogo } from "./ProviderLogos";
import { GITHUB_REPO } from "@/lib/github";

export function HeaderBar() {
  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-sm header-bar"
      style={{
        backgroundColor: "color-mix(in srgb, var(--background) 85%, transparent)",
      }}
    >
        <nav className="mx-auto flex max-w-4xl items-center justify-between py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.25rem,env(safe-area-inset-left))] sm:pr-[max(1.25rem,env(safe-area-inset-right))] md:pl-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight min-h-[44px] sm:min-h-0 touch-manipulation [-webkit-tap-highlight-color:transparent]"
          style={{ color: "var(--foreground)" }}
        >
          <span className="logo-wrapper relative block h-5 w-5 shrink-0">
            <Image
              src="/logo.svg"
              alt=""
              width={20}
              height={20}
              className="logo-light absolute inset-0 h-5 w-5 object-contain"
              unoptimized
            />
            <Image
              src="/logo-dark.svg"
              alt=""
              width={20}
              height={20}
              className="logo-dark absolute inset-0 h-5 w-5 object-contain"
              unoptimized
            />
          </span>
          <span className="flex items-baseline gap-1.5">
            AEP
            <span className="text-sm font-normal opacity-60 hidden sm:inline">
              (Agent Economic Protocol)
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/docs"
            className="text-sm opacity-60 hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center touch-manipulation [-webkit-tap-highlight-color:transparent]"
            style={{ color: "var(--foreground)" }}
          >
            Docs
          </Link>
          <Link
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            aria-label="GitHub"
            className="cursor-pointer min-h-[44px] min-w-[44px] p-2 sm:p-0.5 sm:min-h-0 sm:min-w-0 opacity-70 hover:opacity-100 transition-opacity focus:outline-none inline-flex items-center justify-center touch-manipulation [-webkit-tap-highlight-color:transparent]"
            style={{ color: "var(--foreground)" }}
          >
            <GitHubLogo size={16} />
          </Link>
          <Link
            href={
              process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/aep"
            }
            target="_blank"
            rel="noopener noreferrer"
            title="Discord"
            aria-label="Discord"
            className="cursor-pointer min-h-[44px] min-w-[44px] p-2 sm:p-0.5 sm:min-h-0 sm:min-w-0 opacity-70 hover:opacity-100 transition-opacity focus:outline-none inline-flex items-center justify-center touch-manipulation [-webkit-tap-highlight-color:transparent]"
            style={{ color: "var(--foreground)" }}
          >
            <DiscordLogo size={16} />
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
