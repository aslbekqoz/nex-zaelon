import "server-only";
import { randomBytes } from "node:crypto";
import { query } from "@/lib/db";

/** Saves a processed avatar under a new random key (so old URLs stop resolving and caches refresh). */
export async function saveAvatar(userId: number, image: Buffer) {
  const key = randomBytes(16).toString("base64url");
  await query(
    `INSERT INTO user_avatars (user_id, key, image, content_type, updated_at)
     VALUES ($1, $2, $3, 'image/webp', now())
     ON CONFLICT (user_id) DO UPDATE SET key = EXCLUDED.key, image = EXCLUDED.image,
       content_type = EXCLUDED.content_type, updated_at = now()`,
    [userId, key, image],
  );
  return key;
}

export async function deleteAvatar(userId: number) {
  const { rowCount } = await query("DELETE FROM user_avatars WHERE user_id = $1", [userId]);
  return (rowCount ?? 0) > 0;
}

export async function getAvatarByKey(key: string) {
  const { rows } = await query<{ image: Buffer; content_type: string; updated_at: Date }>(
    "SELECT image, content_type, updated_at FROM user_avatars WHERE key = $1",
    [key],
  );
  return rows[0] ?? null;
}
