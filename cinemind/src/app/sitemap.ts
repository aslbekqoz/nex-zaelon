import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/site";
import { sitemapEntries } from "@/lib/sitemap";

// Built per request from the live catalogue (and APP_URL, which belongs to the deployment)
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  // Sitemap URLs must be absolute; without a public address there is nothing correct to list
  if (!base) return [];
  const { movies, people } = await sitemapEntries();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, changeFrequency: "daily", priority: 0.6 },
    ...movies.map((m) => ({ url: `${base}/movies/${m.id}`, lastModified: m.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...people.map((p) => ({ url: `${base}/people/${p.id}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
