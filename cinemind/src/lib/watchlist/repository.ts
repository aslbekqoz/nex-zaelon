import "server-only";
import { query } from "@/lib/db";
import { listMoviesByIds } from "@/lib/movies/repository";
import type { WatchlistItem } from "./view";

export type WatchlistEntry = WatchlistItem;

/** The user's saved movies with their own rating of each; the page decides the order. */
export async function getWatchlist(userId: number): Promise<WatchlistEntry[]> {
  const { rows } = await query<{ movie_id: number; watched: boolean; added_at: Date; rating: number | null }>(
    `SELECT w.movie_id, w.watched, w.added_at, r.rating
       FROM watchlist_items w LEFT JOIN user_ratings r ON r.user_id = w.user_id AND r.movie_id = w.movie_id
      WHERE w.user_id = $1 ORDER BY w.watched, w.added_at DESC`,
    [userId],
  );
  const movies = await listMoviesByIds(rows.map((r) => r.movie_id));
  const byId = new Map(movies.map((m) => [m.id, m]));
  return rows.flatMap((r) => {
    const movie = byId.get(r.movie_id);
    return movie ? [{ movie, watched: r.watched, addedAt: r.added_at.toISOString(), userRating: r.rating }] : [];
  });
}

export async function getWatchlistStatus(userId: number, movieId: number) {
  const { rows } = await query<{ watched: boolean }>(
    "SELECT watched FROM watchlist_items WHERE user_id = $1 AND movie_id = $2",
    [userId, movieId],
  );
  return rows[0] ? { saved: true, watched: rows[0].watched } : { saved: false, watched: false };
}
