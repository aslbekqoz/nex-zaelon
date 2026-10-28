// Accessibility audit: runs axe-core (WCAG 2.1 A/AA + best practices) on the main pages of a
// running server and fails if anything is found.
//   npm run a11y                       (server on http://localhost:3000)
//   BASE_URL=http://localhost:3100 npm run a11y
// Signed-in pages are checked with a fresh account made admin through the database
// (DATABASE_URL), so point it at a development or CI database, never production.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const PUBLIC = ["/", "/search", "/search?q=the", "/movies/1", "/login", "/register", "/forgot-password"];
const SIGNED_IN = [
  "/account", "/watchlist", "/stats", "/recommendations", "/onboarding",
  "/admin", "/admin/users", "/admin/movies", "/admin/reviews", "/admin/audit",
  "/studio", "/studio/new", "/studio/templates", "/studio/facts", "/studio/settings",
];

async function audit(page, path) {
  const res = await page.goto(BASE + path);
  if (!res || res.status() >= 400) return [`HTTP ${res?.status()}`];
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate((tags) => window.axe.run(document, { runOnly: tags }), TAGS);
  return result.violations.map(
    (v) => `${v.impact} ${v.id} (${v.nodes.length}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

const browser = await chromium.launch();
// The site's Content-Security-Policy would (rightly) block injecting axe as an inline script
const context = await browser.newContext({ bypassCSP: true });
let failures = 0;
try {
  const report = async (page, paths) => {
    for (const path of paths) {
      const problems = await audit(page, path);
      failures += problems.length;
      console.log(`${problems.length ? "✗" : "✓"} ${path}`);
      for (const p of problems) console.log(`    ${p}`);
    }
  };

  await report(await context.newPage(), PUBLIC);

  const email = `a11y-${Date.now()}@example.com`;
  const page = await (await browser.newContext({ bypassCSP: true })).newPage();
  await page.goto(`${BASE}/register`);
  await page.fill("#name", "Accessibility Check");
  await page.fill("#email", email);
  await page.fill("#password", "a11y-password-123");
  await page.click("button[type=submit]");
  await page.waitForURL((url) => new URL(url).pathname !== "/register");
  execFileSync(process.execPath, ["scripts/create-admin.mjs", email], { stdio: "ignore" });
  await report(page, SIGNED_IN);
} finally {
  await browser.close();
}

if (failures) {
  console.error(`\n${failures} accessibility problem(s) found.`);
  process.exit(1);
}
console.log("\nNo accessibility problems found.");
