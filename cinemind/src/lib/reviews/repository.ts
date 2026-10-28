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
  /** How many people marked the review as helpful. */
  helpful: number;
  createdAt: Date;
  updatedAt: Date;
  hidden: boolean;
};

const REVIEW_SELECT = `
  SELECT r.user_id::int AS "userId", r.movie_id::int AS "movieId", u.name AS "authorName", a.key AS "avatarKey",
         r.body, r.spoilers, ur.rating, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
         r.hidden_at IS NOT NULL AS hidden,
         (SELECT count(*)::int FROM review_votes v WHERE v.author_id = r.user_id AND v.movie_id = r.movie_id) AS helpful
    FROM movie_reviews r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN user_avatars a ON a.user_id = r.user_id
    LEFT JOIN user_ratings ur ON ur.user_id = r.user_id AND ur.movie_id = r.movie_id`;

export type ReviewSort = "helpful" | "newest";

/**
 * Public reviews of a movie from accounts that aren't disabled: most helpful first (ties:
 * newest), or newest first. `votedFor` holds the authors whose review the viewer found helpful.
 */
export async function listMovieReviews(movieId: number, opts: { sort?: ReviewSort; viewerId?: number | null; limit?: number } = {}) {
  const order = opts.sort === "newest" ? "r.created_at DESC" : "helpful DESC, r.created_at DESC";
  const [list, count, votes] = await Promise.all([
    query<Review>(
      `${REVIEW_SELECT} WHERE r.movie_id = $1 AND r.hidden_at IS NULL AND u.disabled_at IS NULL
        ORDER BY ${order} LIMIT $2`,
      [movieId, opts.limit ?? 30],
    ),
    query<{ n: number }>(
      `SELECT count(*)::int AS n FROM movie_reviews r JOIN users u ON u.id = r.user_id
        WHERE r.movie_id = $1 AND r.hidden_at IS NULL AND u.disabled_at IS NULL`,
      [movieId],
    ),
    opts.viewerId
      ? query<{ author: number }>("SELECT author_id::int AS author FROM review_votes WHERE voter_id = $1 AND movie_id = $2", [opts.viewerId, movieId])
      : Promise.resolve({ rows: [] as { author: number }[] }),
  ]);
  return { reviews: list.rows, total: count.rows[0].n, votedFor: new Set(votes.rows.map((v) => v.author)) };
}

/** Adds or removes the viewer's "helpful" vote. Own, hidden and disabled authors' reviews can't get votes. */
export async function setHelpfulVote(voterId: number, authorId: number, movieId: number, helpful: boolean) {
  if (!helpful) {
    await query("DELETE FROM review_votes WHERE voter_id = $1 AND author_id = $2 AND movie_id = $3", [voterId, authorId, movieId]);
    return;
  }
  await query(
    `INSERT INTO review_votes (voter_id, author_id, movie_id)
     SELECT $1, r.user_id, r.movie_id FROM movie_reviews r JOIN users u ON u.id = r.user_id
      WHERE r.user_id = $2 AND r.movie_id = $3 AND r.user_id <> $1 AND r.hidden_at IS NULL AND u.disabled_at IS NULL
     ON CONFLICT DO NOTHING`,
    [voterId, authorId, movieId],
  );
}

export type LatestReview = Review & { movieTitle: string };

/** Newest public reviews across the site for the home page; spoiler reviews are left out. */
export async function listLatestReviews(limit = 6) {
  const { rows } = await query<LatestReview>(
    `SELECT x.*, m.title AS "movieTitle" FROM (${REVIEW_SELECT}
        WHERE r.hidden_at IS NULL AND NOT r.spoilers AND u.disabled_at IS NULL
        ORDER BY r.created_at DESC LIMIT $1) x
       JOIN movies m ON m.id = x."movieId"
      ORDER BY x."createdAt" DESC`,
    [limit],
  );
  return rows;
}

export type ReviewerProfile = { id: number; name: string; avatarKey: string | null; joinedAt: Date; reviews: number };

/**
 * A member's public profile. Only active accounts with a public review or a public list have
 * one, so profile URLs can't be used to list members.
 */
export async function getReviewerProfile(userId: number) {
  const { rows } = await query<ReviewerProfile>(
    `SELECT u.id::int AS id, u.name, a.key AS "avatarKey", u.created_at AS "joinedAt",
            (SELECT count(*)::int FROM movie_reviews r WHERE r.user_id = u.id AND r.hidden_at IS NULL) AS reviews
       FROM users u
       LEFT JOIN user_avatars a ON a.user_id = u.id
      WHERE u.id = $1 AND u.disabled_at IS NULL
        AND (EXISTS (SELECT 1 FROM movie_reviews r WHERE r.user_id = u.id AND r.hidden_at IS NULL)
             OR EXISTS (SELECT 1 FROM user_lists l WHERE l.user_id = u.id AND l.is_public))`,
    [userId],
  );
  return rows[0] ?? null;
}

export type ProfileReview = Review & { movieTitle: string; movieYear: number | null; posterUrl: string | null };

/** A reviewer's public reviews, newest first. */
export async function listUserReviews(userId: number, limit = 50) {
  const { rows } = await query<ProfileReview>(
    `SELECT x.*, m.title AS "movieTitle", EXTRACT(YEAR FROM m.release_date)::int AS "movieYear", m.poster_url AS "posterUrl"
       FROM (${REVIEW_SELECT} WHERE r.user_id = $1 AND r.hidden_at IS NULL AND u.disabled_at IS NULL
              ORDER BY r.created_at DESC LIMIT $2) x
       JOIN movies m ON m.id = x."movieId"
      ORDER BY x."createdAt" DESC`,
    [userId, limit],
  );
  return rows;
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
