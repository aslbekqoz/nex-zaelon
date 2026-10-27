import "server-only";
import { query } from "@/lib/db";

export async function getUserRating(userId: number, movieId: number) {
  const { rows } = await query<{ rating: number }>(
    "SELECT rating FROM user_ratings WHERE user_id = $1 AND movie_id = $2",
    [userId, movieId],
  );
  return rows[0]?.rating ?? null;
}
