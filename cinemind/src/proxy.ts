import { type NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy, staticSecurityHeaders } from "@/lib/security/headers";

// Adds the Content-Security-Policy (with a fresh nonce per request, which Next.js puts on its
// own scripts) and the other security headers to every page.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const https = (process.env.APP_URL ?? "").startsWith("https://");
  const csp = contentSecurityPolicy({ nonce, dev: process.env.NODE_ENV === "development", https });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  for (const [name, value] of Object.entries(staticSecurityHeaders({ https }))) response.headers.set(name, value);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: API routes, avatars (they carry their own locked-down policy), build assets
      // and files such as robots.txt don't need it; neither do link prefetches
      source: "/((?!api/|avatars/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
