import "server-only";
import { query } from "@/lib/db";
import type { RatedMovie } from "./compute";

/** What "My stats" is computed from: the user's ratings, watchlist and reviews. */
export async function loadStatsSource(userId: number) {
  const [rated, watchlist, reviews] = await Promise.all([
    query<RatedMovie>(
      `SELECT r.rating, EXTRACT(YEAR FROM m.release_date)::int AS year, m.runtime,
              COALESCE((SELECT array_agg(g.name_en ORDER BY g.name_en) FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id
                         WHERE mg.movie_id = m.id), '{}') AS genres
         FROM user_ratings r JOIN movies m ON m.id = r.movie_id
        WHERE r.user_id = $1`,
      [userId],
    ),
    query<{ saved: number; watched: number; minutes: number }>(
      `SELECT count(*)::int AS saved, count(*) FILTER (WHERE w.watched)::int AS watched,
              COALESCE(sum(m.runtime) FILTER (WHERE w.watched), 0)::int AS minutes
         FROM watchlist_items w JOIN movies m ON m.id = w.movie_id WHERE w.user_id = $1`,
      [userId],
    ),
    query<{ reviews: number; helpful: number }>(
      `SELECT count(*)::int AS reviews,
              COALESCE((SELECT count(*)::int FROM review_votes v WHERE v.author_id = $1), 0) AS helpful
         FROM movie_reviews WHERE user_id = $1`,
      [userId],
    ),
  ]);
  return { rated: rated.rows, watchlist: watchlist.rows[0], reviews: reviews.rows[0] };
}
