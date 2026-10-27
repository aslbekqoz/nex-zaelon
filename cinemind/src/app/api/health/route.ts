import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 2000;

// For load balancers, container health checks and uptime monitors. Says only whether the app
// can reach its database; no versions or other details that would help an attacker.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await Promise.race([
      query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("database timeout")), DB_TIMEOUT_MS)),
    ]);
    return Response.json({ status: "ok", database: "ok" }, { headers });
  } catch (err) {
    console.error("[health] database check failed:", err);
    return Response.json({ status: "error", database: "unreachable" }, { status: 503, headers });
  }
}
