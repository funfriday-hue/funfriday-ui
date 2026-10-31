import type { MetadataRoute } from "next";
import { QUIZ_PAGES } from "@/lib/quiz-pages";

const siteUrl = "https://funfriday.co.in";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...QUIZ_PAGES.map((page) => ({
      url: `${siteUrl}/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ];
}
