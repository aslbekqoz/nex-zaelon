import "server-only";
import { query } from "@/lib/db";
import type { Genre } from "@/lib/movies/types";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
  createdAt: string;
  disabledAt: string | null;
  emailVerifiedAt: string | null;
  lastSeenAt: string | null;
  ratings: number;
  watchlist: number;
};

export async function listUsers(filter: { q?: string; role?: string; status?: string } = {}) {
  const like = filter.q ? `%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const { rows } = await query<AdminUser>(
    `SELECT u.id, u.email, u.name, u.role, u.created_at AS "createdAt", u.disabled_at AS "disabledAt", u.email_verified_at AS "emailVerifiedAt",
            (SELECT max(created_at) FROM sessions s WHERE s.user_id = u.id) AS "lastSeenAt",
            (SELECT count(*)::int FROM user_ratings r WHERE r.user_id = u.id) AS ratings,
            (SELECT count(*)::int FROM watchlist_items w WHERE w.user_id = u.id) AS watchlist
       FROM users u
      WHERE ($1::text IS NULL OR u.email ILIKE $1 OR u.name ILIKE $1)
        AND ($2::text IS NULL OR u.role = $2)
        AND (CASE $3::text
               WHEN 'disabled' THEN u.disabled_at IS NOT NULL
               WHEN 'active' THEN u.disabled_at IS NULL
               WHEN 'unverified' THEN u.email_verified_at IS NULL
               ELSE true END)
      ORDER BY u.created_at DESC
      LIMIT 200`,
    [like, filter.role || null, filter.status || null],
  );
  return rows;
}

export async function dashboardStats() {
  const { rows } = await query<{
    users: number; users_7d: number; admins: number; disabled: number; unverified: number;
    movies: number; movies_tmdb: number; movies_manual: number; movies_locked: number;
    ratings: number; watchlist: number;
    drafts: number; drafts_ready: number; facts_pending: number;
    failed_logins_24h: number;
  }>(
    `SELECT
       (SELECT count(*)::int FROM users) AS users,
       (SELECT count(*)::int FROM users WHERE created_at > now() - interval '7 days') AS users_7d,
       (SELECT count(*)::int FROM users WHERE role = 'admin') AS admins,
       (SELECT count(*)::int FROM users WHERE disabled_at IS NOT NULL) AS disabled,
       (SELECT count(*)::int FROM users WHERE email_verified_at IS NULL AND disabled_at IS NULL) AS unverified,
       (SELECT count(*)::int FROM movies) AS movies,
       (SELECT count(*)::int FROM movies WHERE source = 'tmdb') AS movies_tmdb,
       (SELECT count(*)::int FROM movies WHERE source = 'manual') AS movies_manual,
       (SELECT count(*)::int FROM movies WHERE sync_locked) AS movies_locked,
       (SELECT count(*)::int FROM user_ratings) AS ratings,
       (SELECT count(*)::int FROM watchlist_items) AS watchlist,
       (SELECT count(*)::int FROM studio_drafts WHERE status <> 'archived') AS drafts,
       (SELECT count(*)::int FROM studio_drafts WHERE status = 'ready') AS drafts_ready,
       (SELECT count(*)::int FROM studio_facts WHERE status = 'unverified') AS facts_pending,
       (SELECT count(*)::int FROM auth_attempts WHERE kind = 'login' AND NOT success AND created_at > now() - interval '24 hours') AS failed_logins_24h`,
  );
  return rows[0];
}

export async function getMovieForEdit(id: number) {
  const { rows } = await query<{
    id: number; tmdb_id: number | null; title: string; title_uz: string | null; original_title: string | null;
    overview: string | null; overview_uz: string | null; director: string | null; release_date: string | null;
    runtime: number | null; original_language: string | null; poster_url: string | null; backdrop_url: string | null;
    trailer_youtube_key: string | null; source: string; sync_locked: boolean; genre_ids: number[];
  }>(
    `SELECT m.id, m.tmdb_id, m.title, m.title_uz, m.original_title, m.overview, m.overview_uz, m.director,
            m.release_date, m.runtime, m.original_language, m.poster_url, m.backdrop_url, m.trailer_youtube_key,
            m.source, m.sync_locked,
            COALESCE((SELECT array_agg(genre_id) FROM movie_genres WHERE movie_id = m.id), '{}') AS genre_ids
       FROM movies m WHERE m.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Every genre, including ones no movie uses yet (the public listGenres hides those). */
export async function allGenres() {
  const { rows } = await query<Genre>(`SELECT id, slug, name_en AS name, name_uz AS "nameUz" FROM genres ORDER BY name_en`);
  return rows;
}
