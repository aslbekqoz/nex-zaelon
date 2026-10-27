import "server-only";
import { query } from "@/lib/db";

export async function getPreferences(userId: number) {
  const [genres, user] = await Promise.all([
    query<{ genre_id: number }>("SELECT genre_id FROM user_favorite_genres WHERE user_id = $1", [userId]),
    query<{ onboarded_at: Date | null }>("SELECT onboarded_at FROM users WHERE id = $1", [userId]),
  ]);
  return {
    favoriteGenreIds: genres.rows.map((r) => r.genre_id),
    onboarded: Boolean(user.rows[0]?.onboarded_at),
  };
}
