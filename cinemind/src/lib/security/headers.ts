// Security headers for every page. Pure, unit tested; applied in src/proxy.ts.

export type PolicyOptions = { nonce: string; dev: boolean; https: boolean };

/**
 * Content-Security-Policy. Scripts only run with this request's nonce (Next.js adds it to its
 * own scripts); 'strict-dynamic' lets those load the chunks they need. Styles allow inline
 * because React's style={…} attributes can't carry a nonce, and CSS can't run code.
 */
export function contentSecurityPolicy({ nonce, dev, https }: PolicyOptions) {
  const directives = [
    "default-src 'self'",
    // React needs eval only for its development error overlay
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Posters and photos come from TMDB or any https URL an admin enters; blob: is the
    // profile picture preview before upload
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

/** Headers that don't change per request. */
export function staticSecurityHeaders({ https }: { https: boolean }): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    // Only over https: browsers ignore it on plain http, and it would pin localhost to https
    ...(https ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains" } : {}),
  };
}
