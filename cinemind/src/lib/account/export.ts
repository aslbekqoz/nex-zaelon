import "server-only";
import { query } from "@/lib/db";
import type { ExportSource } from "./export-format";

/** How many of the user's own activity-log entries are included, newest first. */
const ACTIVITY_LIMIT = 1000;

/** Everything stored about one user, read for the "Download my data" export. */
export async function loadExportSource(userId: number): Promise<ExportSource | null> {
  const users = await query<ExportSource["user"]>(
    `SELECT name, email, role, created_at AS "createdAt", email_verified_at AS "emailVerifiedAt", onboarded_at AS "onboardedAt"
       FROM users WHERE id = $1`,
    [userId],
  );
  if (!users.rows[0]) return null;
  const [genres, watchlist, ratings, pending, sessions, avatar, activity] = await Promise.all([
    query<{ name: string }>(
      `SELECT g.name_en AS name FROM user_favorite_genres f JOIN genres g ON g.id = f.genre_id
        WHERE f.user_id = $1 ORDER BY g.name_en`,
      [userId],
    ),
    query<ExportSource["watchlist"][number]>(
      `SELECT m.id AS "movieId", m.title, m.title_uz AS "titleUz", EXTRACT(YEAR FROM m.release_date)::int AS year,
              w.watched, w.added_at AS "addedAt"
         FROM watchlist_items w JOIN movies m ON m.id = w.movie_id
        WHERE w.user_id = $1 ORDER BY w.added_at DESC`,
      [userId],
    ),
    query<ExportSource["ratings"][number]>(
      `SELECT m.id AS "movieId", m.title, m.title_uz AS "titleUz", EXTRACT(YEAR FROM m.release_date)::int AS year,
              r.rating, r.rated_at AS "ratedAt"
         FROM user_ratings r JOIN movies m ON m.id = r.movie_id
        WHERE r.user_id = $1 ORDER BY r.rated_at DESC`,
      [userId],
    ),
    query<NonNullable<ExportSource["pendingEmailChange"]>>(
      `SELECT new_email AS "newEmail", created_at AS "createdAt", expires_at AS "expiresAt" FROM email_changes
        WHERE user_id = $1 AND used_at IS NULL AND cancelled_at IS NULL AND expires_at > now()
        ORDER BY id DESC LIMIT 1`,
      [userId],
    ),
    query<ExportSource["sessions"][number]>(
      `SELECT user_agent AS "userAgent", created_at AS "createdAt", last_seen_at AS "lastSeenAt", expires_at AS "expiresAt" FROM sessions
        WHERE user_id = $1 AND expires_at > now() ORDER BY created_at DESC`,
      [userId],
    ),
    query<{ contentType: string; updatedAt: Date; image: Buffer }>(
      `SELECT content_type AS "contentType", updated_at AS "updatedAt", image FROM user_avatars WHERE user_id = $1`,
      [userId],
    ),
    query<ExportSource["activity"][number]>(
      `SELECT action, created_at AS "createdAt", details FROM audit_log
        WHERE actor_id = $1 OR (target_type = 'user' AND target_id = $2 AND action LIKE 'auth.%')
        ORDER BY id DESC LIMIT ${ACTIVITY_LIMIT}`,
      [userId, String(userId)],
    ),
  ]);
  return {
    user: users.rows[0],
    favouriteGenres: genres.rows.map((g) => g.name),
    watchlist: watchlist.rows,
    ratings: ratings.rows,
    pendingEmailChange: pending.rows[0] ?? null,
    sessions: sessions.rows,
    avatar: avatar.rows[0] ?? null,
    activity: activity.rows,
  };
}
