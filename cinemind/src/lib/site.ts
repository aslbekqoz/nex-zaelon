/**
 * The site's public base URL, used for links in emails, canonical URLs, link previews and the
 * sitemap. It comes from APP_URL, never from the request's Host header (which an attacker
 * controls), so links can't be made to point to another site.
 */
export function appUrl(): string | null {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
}
