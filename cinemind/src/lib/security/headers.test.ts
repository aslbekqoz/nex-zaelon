import assert from "node:assert/strict";
import { test } from "node:test";
import { contentSecurityPolicy, staticSecurityHeaders } from "./headers.ts";

test("scripts need the nonce; nothing else may run code or frame the site", () => {
  const csp = contentSecurityPolicy({ nonce: "abc123", dev: false, https: true });
  assert.match(csp, /script-src 'self' 'nonce-abc123' 'strict-dynamic'(;|$)/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  for (const d of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "frame-src https://www.youtube-nocookie.com", "upgrade-insecure-requests"]) {
    assert.ok(csp.includes(d), d);
  }
});

test("development allows eval; plain http doesn't upgrade or pin https", () => {
  const csp = contentSecurityPolicy({ nonce: "n", dev: true, https: false });
  assert.match(csp, /'strict-dynamic' 'unsafe-eval'/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
  assert.equal(staticSecurityHeaders({ https: false })["Strict-Transport-Security"], undefined);
  assert.match(staticSecurityHeaders({ https: true })["Strict-Transport-Security"], /max-age=63072000/);
  assert.equal(staticSecurityHeaders({ https: true })["X-Frame-Options"], "DENY");
});
