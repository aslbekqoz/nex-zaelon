import "server-only";
import { query } from "@/lib/db";
import { listMoviesByIds } from "@/lib/movies/repository";
import type { Movie } from "@/lib/movies/types";

export type WatchlistEntry = { movie: Movie; watched: boolean; addedAt: string };

export async function getWatchlist(userId: number): Promise<WatchlistEntry[]> {
  const { rows } = await query<{ movie_id: number; watched: boolean; added_at: Date }>(
    "SELECT movie_id, watched, added_at FROM watchlist_items WHERE user_id = $1 ORDER BY watched, added_at DESC",
    [userId],
  );
  const movies = await listMoviesByIds(rows.map((r) => r.movie_id));
  const byId = new Map(movies.map((m) => [m.id, m]));
  return rows.flatMap((r) => {
    const movie = byId.get(r.movie_id);
    return movie ? [{ movie, watched: r.watched, addedAt: r.added_at.toISOString() }] : [];
  });
}

export async function getWatchlistStatus(userId: number, movieId: number) {
  const { rows } = await query<{ watched: boolean }>(
    "SELECT watched FROM watchlist_items WHERE user_id = $1 AND movie_id = $2",
    [userId, movieId],
  );
  return rows[0] ? { saved: true, watched: rows[0].watched } : { saved: false, watched: false };
}
