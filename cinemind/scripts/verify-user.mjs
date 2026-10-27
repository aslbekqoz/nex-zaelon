// Marks a user's email as confirmed: npm run user:verify -- email@example.com
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run user:verify -- email@example.com");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    "UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE email = $1 RETURNING id",
    [email],
  );
  if (!rows[0]) {
    console.error(`${email} not found.`);
    process.exitCode = 1;
  } else {
    await client.query(
      "INSERT INTO audit_log (actor_id, action, target_type, target_id, details) VALUES (NULL, 'user.email_verified_cli', 'user', $1, '{}')",
      [String(rows[0].id)],
    );
    console.log(`✓ ${email} is now confirmed.`);
  }
} finally {
  await client.end();
}
