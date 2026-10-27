import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/site";

// Read at request time: APP_URL belongs to the deployment, not the build
export const dynamic = "force-dynamic";

/** Private and per-user pages stay out of search results; everything else may be crawled. */
const PRIVATE = [
  "/account", "/admin", "/studio", "/watchlist", "/recommendations", "/onboarding",
  "/login", "/register", "/forgot-password", "/reset-password",
  "/confirm-email", "/verify-email", "/confirm-email-change", "/avatars/",
];

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
