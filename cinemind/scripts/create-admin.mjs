// Foydalanuvchiga administrator huquqini beradi: npm run admin:create -- email@example.com
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Foydalanish: npm run admin:create -- email@example.com");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rowCount } = await client.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
  if (!rowCount) {
    console.error(`${email} topilmadi. Avval saytda ro'yxatdan o'ting.`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${email} endi administrator.`);
  }
} finally {
  await client.end();
}
