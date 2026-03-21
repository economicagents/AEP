import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HeaderBar } from "@/components/HeaderBar";
import { DocsChatWidget } from "@/components/DocsChatWidget";
import { GITHUB_REPO } from "@/lib/github";

const BASE_URL = "https://economicagents.org";
const TITLE = "AEP — Agent Economic Protocol";
const DESCRIPTION =
  "The runtime layer for economic agents. Budget governance, intent-based procurement, and persistent economic relationships. All onchain.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(BASE_URL),
  keywords: [
    "agent economic protocol",
    "ERC-4337",
    "ERC-8004",
    "x402",
    "account abstraction",
    "economic agents",
    "autonomous agents",
    "budget governance",
    "intent resolution",
    "smart account",
    "Base",
  ],
  authors: [{ name: "AEP", url: BASE_URL }],
  creator: "AEP",
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/logo-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: BASE_URL,
    siteName: "AEP",
    locale: "en_US",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: TITLE }],
  },
};

const JSON_LD = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AEP",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.svg`,
    sameAs: [GITHUB_REPO],
  },
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: TITLE,
    url: BASE_URL,
    description: DESCRIPTION,
  },
  software: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: TITLE,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    description: DESCRIPTION,
    url: BASE_URL,
  },
};

const JSON_LD_SCRIPTS = [
  JSON_LD.organization,
  JSON_LD.website,
  JSON_LD.software,
];

const THEME_INIT_SCRIPT = `(function(){var p=localStorage.getItem("aep-theme");var t=p==="dark"?"dark":p==="light"?"light":(new Date().getHours()>=7&&new Date().getHours()<19)?"light":"dark";document.documentElement.setAttribute("data-theme",t);})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="antialiased">
        {JSON_LD_SCRIPTS.map((data) => (
          <script
            key={data["@type"] as string}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
          />
        ))}
        <ThemeProvider>
          <HeaderBar />
          {children}
          <DocsChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
