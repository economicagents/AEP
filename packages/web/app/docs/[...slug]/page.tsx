import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarkdownAsync } from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import {
  getDocBySlug,
  getAllSlugs,
  extractHeadings,
  SLUG_TO_TITLE,
  extractDocDescription,
  resolveDocHref,
} from "@/lib/docs";
import { DocCodeBlock } from "@/components/docs/DocCodeBlock";
import { DocCopyMarkdown } from "@/components/docs/DocCopyMarkdown";
import { DocToc } from "@/components/docs/DocToc";
import Link from "next/link";
import { githubBlobPath } from "@/lib/github";

const BASE_URL = "https://economicagents.org";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

function getSlugFromParams(slug: string[] | undefined): string | null {
  if (!slug || slug.length === 0) return null;
  return slug.join("/");
}

const SECTION_LABELS: Record<string, string> = {
  "getting-started": "Getting Started",
  cli: "CLI",
  sdk: "SDK",
  skills: "Skills",
  packages: "Packages",
  guides: "Guides",
  reference: "Reference",
};

function buildBreadcrumbList(slugStr: string, pageTitle: string) {
  const parts = slugStr.split("/");
  const section = parts[0] ?? "";
  const sectionLabel = SECTION_LABELS[section] ?? section;
  const items = [
    { "@type": "ListItem" as const, position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem" as const, position: 2, name: "Docs", item: `${BASE_URL}/docs` },
    { "@type": "ListItem" as const, position: 3, name: sectionLabel, item: `${BASE_URL}/docs` },
    { "@type": "ListItem" as const, position: 4, name: pageTitle, item: `${BASE_URL}/docs/${slugStr}` },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugStr = getSlugFromParams(slug);
  if (!slugStr) return {};
  const content = getDocBySlug(slugStr);
  if (!content) return {};
  const title = SLUG_TO_TITLE[slugStr] ?? slugStr.split("/").pop() ?? slugStr;
  const description = extractDocDescription(content);
  const url = `${BASE_URL}/docs/${slugStr}`;
  return {
    title: `${title} — AEP`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} — AEP`,
      description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — AEP`,
      description,
    },
  };
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({
    slug: slug.split("/"),
  }));
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const slugStr = getSlugFromParams(slug);
  if (!slugStr) notFound();
  const content = getDocBySlug(slugStr);
  if (!content) notFound();
  const toc = extractHeadings(content);
  const pageTitle = SLUG_TO_TITLE[slugStr] ?? slugStr.split("/").pop() ?? slugStr;
  const breadcrumbList = buildBreadcrumbList(slugStr, pageTitle);

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:gap-8">
      {/* JSON-LD BreadcrumbList — safe: static data from slug/title, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
      />
      <div className="flex flex-1 min-w-0 max-w-2xl flex-col">
        <div className="flex justify-end">
          <DocCopyMarkdown content={content} />
        </div>
        <article className="prose max-w-none prose-headings:font-semibold">
          <MarkdownAsync
            remarkPlugins={[remarkGfm, remarkAlert]}
            rehypePlugins={[
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: "wrap" }],
            ]}
            components={{
              pre: ({ children }) => (
                <DocCodeBlock>{children}</DocCodeBlock>
              ),
              table: ({ children }) => (
                <div className="table-wrapper">
                  <table>{children}</table>
                </div>
              ),
              a: ({ href, children }) => {
                if (href?.startsWith("http")) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80"
                      style={{ color: "var(--foreground)" }}
                    >
                      {children}
                    </a>
                  );
                }
                if (href?.includes("../skills/") || href?.startsWith("skills/")) {
                  const path = href.replace(/^(\.\.\/)+/, "").replace(/\/SKILL\.md$/i, "");
                  const skillMatch = path.match(/skills\/([a-z0-9-]+)(?:\/|$)/);
                  if (skillMatch) {
                    return (
                      <Link
                        href={`/docs/skills/${skillMatch[1]}`}
                        className="underline hover:opacity-80"
                        style={{ color: "var(--foreground)" }}
                      >
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a
                      href={githubBlobPath(path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80"
                      style={{ color: "var(--foreground)" }}
                    >
                      {children}
                    </a>
                  );
                }
                if (href?.startsWith("references/") && slugStr?.startsWith("skills/")) {
                  const skillName = slugStr.replace("skills/", "");
                  return (
                    <a
                      href={githubBlobPath(`skills/${skillName}/${href}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80"
                      style={{ color: "var(--foreground)" }}
                    >
                      {children}
                    </a>
                  );
                }
                const docHref = href?.startsWith("/") ? href : resolveDocHref(href ?? "");
                const isExternal = docHref.startsWith("http");
                if (isExternal) {
                  return (
                    <a
                      href={docHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80"
                      style={{ color: "var(--foreground)" }}
                    >
                      {children}
                    </a>
                  );
                }
                return (
                  <Link
                    href={docHref}
                    className="underline hover:opacity-80"
                    style={{ color: "var(--foreground)" }}
                  >
                    {children}
                  </Link>
                );
              },
            }}
          >
            {content}
          </MarkdownAsync>
        </article>
      </div>
      <DocToc items={toc} />
    </div>
  );
}
