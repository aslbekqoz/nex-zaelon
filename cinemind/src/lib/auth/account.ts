import "server-only";
import { db } from "@/lib/db";

/**
 * Deletes a user and everything that belongs to them (sessions, watchlist, ratings, preferences,
 * picture, pending links — all ON DELETE CASCADE). Studio content they made stays, unattributed.
 * Personal details in audit entries about them are cleared; the entries themselves are kept.
 */
export async function deleteAccount(userId: number, email: string): Promise<"deleted" | "last_admin" | "missing"> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // Same lock as admin role changes, so the "at least one active admin" rule holds
    await client.query("SELECT pg_advisory_xact_lock(hashtext('cinemind:admin-roles'))");
    const { rows } = await client.query<{ role: string }>("SELECT role FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return "missing";
    }
    if (rows[0].role === "admin") {
      const others = await client.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND disabled_at IS NULL AND id <> $1",
        [userId],
      );
      if (others.rows[0].n === 0) {
        await client.query("ROLLBACK");
        return "last_admin";
      }
    }
    // Old names and addresses live in the details of these entries
    await client.query(
      "UPDATE audit_log SET details = '{}' WHERE target_type = 'user' AND target_id = $1 AND action LIKE 'auth.%'",
      [String(userId)],
    );
    await client.query("UPDATE audit_log SET actor_deleted = true WHERE actor_id = $1", [userId]);
    await client.query("DELETE FROM auth_attempts WHERE email = $1", [email]);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query(
      `INSERT INTO audit_log (actor_id, actor_deleted, action, target_type, target_id)
       VALUES (NULL, true, 'auth.account_deleted', 'user', $1)`,
      [String(userId)],
    );
    await client.query("COMMIT");
    return "deleted";
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
