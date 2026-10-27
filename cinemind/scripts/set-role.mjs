// Sets a user's role: npm run user:role -- email@example.com editor   (user | editor | admin)
import pg from "pg";

const ROLES = ["user", "editor", "admin"];
const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3]?.trim().toLowerCase();
if (!email || !ROLES.includes(role)) {
  console.error("Usage: npm run user:role -- email@example.com user|editor|admin");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  // Same lock as the admin panel, so the "at least one active admin" rule holds
  await client.query("SELECT pg_advisory_xact_lock(hashtext('cinemind:admin-roles'))");
  const { rows } = await client.query("SELECT id, role FROM users WHERE email = $1 FOR UPDATE", [email]);
  const user = rows[0];
  if (!user) {
    console.error(`${email} not found. Sign up on the site first.`);
    process.exitCode = 1;
  } else if (user.role === "admin" && role !== "admin") {
    const others = await client.query("SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND disabled_at IS NULL AND id <> $1", [user.id]);
    if (!others.rows[0].n) {
      console.error(`${email} is the only active admin; make someone else an admin first.`);
      process.exitCode = 1;
    }
  }
  if (user && !process.exitCode) {
    // Staff need a confirmed address to open the studio or admin panel, so confirm it like admin:create does
    await client.query(
      `UPDATE users SET role = $2, email_verified_at = CASE WHEN $2 = 'user' THEN email_verified_at ELSE COALESCE(email_verified_at, now()) END
        WHERE id = $1`,
      [user.id, role],
    );
    await client.query(
      "INSERT INTO audit_log (actor_id, action, target_type, target_id, details) VALUES ($1, 'user.role_changed_cli', 'user', $2, $3)",
      [user.id, String(user.id), JSON.stringify({ from: user.role, to: role })],
    );
    console.log(`✓ ${email} is now ${role === "admin" ? "an admin" : role === "editor" ? "an editor" : "a regular user"} (was ${user.role}).`);
  }
  await client.query(process.exitCode ? "ROLLBACK" : "COMMIT");
} finally {
  await client.end();
}
