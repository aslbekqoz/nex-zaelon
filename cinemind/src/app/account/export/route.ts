import { audit } from "@/lib/audit";
import { buildAccountExport, exportFilename } from "@/lib/account/export-format";
import { loadExportSource } from "@/lib/account/export";
import { getCurrentUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/email/send";

// "Download my data". POST only: the session cookie is SameSite=Lax, so another site can't
// make a signed-in browser download (and log) an export, and nothing prefetches it.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.redirect(new URL("/login?next=/account", req.url), 303);
  const source = await loadExportSource(user.id);
  if (!source) return new Response("Not found", { status: 404 });
  const now = new Date();
  const body = JSON.stringify(buildAccountExport(source, { base: appUrl(), exportedAt: now }), null, 2);
  await audit(user.id, "auth.data_exported", { type: "user", id: user.id });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(now)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
