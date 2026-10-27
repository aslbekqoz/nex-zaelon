import "server-only";
import { query } from "@/lib/db";

export type Review = {
  userId: number;
  movieId: number;
  authorName: string;
  avatarKey: string | null;
  body: string;
  spoilers: boolean;
  /** The author's own 1–10 rating of the movie, if they gave one. */
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
  hidden: boolean;
};

const REVIEW_SELECT = `
  SELECT r.user_id::int AS "userId", r.movie_id::int AS "movieId", u.name AS "authorName", a.key AS "avatarKey",
         r.body, r.spoilers, ur.rating, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
         r.hidden_at IS NOT NULL AS hidden
    FROM movie_reviews r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN user_avatars a ON a.user_id = r.user_id
    LEFT JOIN user_ratings ur ON ur.user_id = r.user_id AND ur.movie_id = r.movie_id`;

/** Public reviews of a movie, newest first, from accounts that aren't disabled. */
export async function listMovieReviews(movieId: number, limit = 30) {
  const [list, count] = await Promise.all([
    query<Review>(
      `${REVIEW_SELECT} WHERE r.movie_id = $1 AND r.hidden_at IS NULL AND u.disabled_at IS NULL
        ORDER BY r.created_at DESC LIMIT $2`,
      [movieId, limit],
    ),
    query<{ n: number }>(
      `SELECT count(*)::int AS n FROM movie_reviews r JOIN users u ON u.id = r.user_id
        WHERE r.movie_id = $1 AND r.hidden_at IS NULL AND u.disabled_at IS NULL`,
      [movieId],
    ),
  ]);
  return { reviews: list.rows, total: count.rows[0].n };
}

/** The user's own review of a movie, hidden or not. */
export async function getOwnReview(userId: number, movieId: number) {
  const { rows } = await query<Review>(`${REVIEW_SELECT} WHERE r.user_id = $1 AND r.movie_id = $2`, [userId, movieId]);
  return rows[0] ?? null;
}

/** Creates or replaces the user's review. Editing a hidden review keeps it hidden. */
export async function upsertReview(userId: number, movieId: number, body: string, spoilers: boolean) {
  const { rows } = await query<{ created: boolean }>(
    `INSERT INTO movie_reviews (user_id, movie_id, body, spoilers) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, movie_id) DO UPDATE SET body = EXCLUDED.body, spoilers = EXCLUDED.spoilers, updated_at = now()
     RETURNING (xmax = 0) AS created`,
    [userId, movieId, body, spoilers],
  );
  return rows[0].created;
}

export async function deleteReview(userId: number, movieId: number) {
  const { rowCount } = await query("DELETE FROM movie_reviews WHERE user_id = $1 AND movie_id = $2", [userId, movieId]);
  return Boolean(rowCount);
}

export type AdminReview = Review & { movieTitle: string; authorEmail: string };

/** Newest reviews for moderation, optionally only hidden ones. */
export async function listReviewsForModeration(filter: { hidden?: boolean; limit?: number } = {}) {
  const { rows } = await query<AdminReview>(
    `SELECT x.*, m.title AS "movieTitle", u.email AS "authorEmail" FROM (${REVIEW_SELECT}
        WHERE ($1::boolean IS NULL OR (r.hidden_at IS NOT NULL) = $1)
        ORDER BY r.created_at DESC LIMIT $2) x
       JOIN movies m ON m.id = x."movieId" JOIN users u ON u.id = x."userId"
      ORDER BY x."createdAt" DESC`,
    [filter.hidden ?? null, filter.limit ?? 100],
  );
  return rows;
}

export async function setReviewHidden(userId: number, movieId: number, hidden: boolean, adminId: number) {
  const { rowCount } = await query(
    `UPDATE movie_reviews SET hidden_at = CASE WHEN $3 THEN COALESCE(hidden_at, now()) END,
            hidden_by = CASE WHEN $3 THEN $4::bigint END
      WHERE user_id = $1 AND movie_id = $2`,
    [userId, movieId, hidden, adminId],
  );
  return Boolean(rowCount);
}
