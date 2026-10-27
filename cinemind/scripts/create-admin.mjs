// Grants admin rights to a user: npm run admin:create -- email@example.com
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:create -- email@example.com");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows, rowCount } = await client.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id", [email]);
  if (rowCount) {
    await client.query(
      "INSERT INTO audit_log (actor_id, action, target_type, target_id, details) VALUES ($1, 'user.promote_cli', 'user', $2, '{}')",
      [rows[0].id, String(rows[0].id)],
    );
  }
  if (!rowCount) {
    console.error(`${email} not found. Sign up on the site first.`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${email} is now an admin.`);
  }
} finally {
  await client.end();
}
