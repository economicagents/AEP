import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/docs";

const BASE_URL = "https://economicagents.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const docSlugs = getAllSlugs();
  const docUrls = docSlugs.map((slug) => ({
    url: `${BASE_URL}/docs/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...docUrls,
  ];
}
