import "server-only";
import { db, query } from "@/lib/db";
import { getMovieSyncInfo } from "./repository";
import {
  backdropUrl,
  pickTrailer,
  posterUrl,
  tmdbDetails,
  tmdbEnabled,
  tmdbSearch,
  type TmdbMovieSummary,
} from "./tmdb";

// TMDB synchronisation. Errors are only logged: if the external API is down,
// the site keeps working from the local catalogue.

function yearOf(date?: string | null) {
  return date ? Number.parseInt(date.slice(0, 4), 10) : null;
}

/** Checks by release year that a local (seed) movie and a TMDB record are the same film. */
function sameRelease(localDate: string | null, remoteDate?: string | null) {
  const a = yearOf(localDate);
  const b = yearOf(remoteDate);
  return a === null || b === null || Math.abs(a - b) <= 1;
}

async function upsertSummaries(items: TmdbMovieSummary[]) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    for (const m of items) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO movies (tmdb_id, title, original_title, overview, release_date, rating, vote_count,
                             popularity, original_language, poster_url, backdrop_url, source)
         VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, '')::date, $6, $7, $8, $9, $10, $11, 'tmdb')
         ON CONFLICT (tmdb_id) DO UPDATE SET
           title = EXCLUDED.title,
           original_title = EXCLUDED.original_title,
           overview = COALESCE(EXCLUDED.overview, movies.overview),
           release_date = COALESCE(EXCLUDED.release_date, movies.release_date),
           rating = EXCLUDED.rating,
           vote_count = EXCLUDED.vote_count,
           popularity = EXCLUDED.popularity,
           poster_url = COALESCE(EXCLUDED.poster_url, movies.poster_url),
           backdrop_url = COALESCE(EXCLUDED.backdrop_url, movies.backdrop_url),
           updated_at = now()
         WHERE NOT movies.sync_locked
           AND (movies.release_date IS NULL OR EXCLUDED.release_date IS NULL
            OR abs(extract(year FROM movies.release_date) - extract(year FROM EXCLUDED.release_date)) <= 1)
         RETURNING id`,
        [
          m.id,
          m.title,
          m.original_title,
          m.overview,
          m.release_date ?? "",
          m.vote_count > 0 ? Math.round(m.vote_average * 10) / 10 : null,
          m.vote_count,
          m.popularity,
          m.original_language,
          posterUrl(m.poster_path),
          backdropUrl(m.backdrop_path),
        ],
      );
      if (rows[0] && m.genre_ids?.length) {
        await client.query(
          `INSERT INTO movie_genres (movie_id, genre_id)
           SELECT $1, g.id FROM genres g WHERE g.id = ANY($2::int[])
           ON CONFLICT DO NOTHING`,
          [rows[0].id, m.genre_ids],
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Query TMDB at most once per hour for the same search term
const recentSearches = new Map<string, number>();
const SEARCH_TTL_MS = 60 * 60 * 1000;

/** Adds movies found on TMDB for a search term to the catalogue. */
export async function importFromSearch(q: string) {
  const key = q.trim().toLowerCase();
  if (!tmdbEnabled() || key.length < 2) return { imported: 0 };
  const last = recentSearches.get(key);
  if (last && Date.now() - last < SEARCH_TTL_MS) return { imported: 0 };
  recentSearches.set(key, Date.now());
  if (recentSearches.size > 500) recentSearches.delete(recentSearches.keys().next().value!);
  try {
    const results = (await tmdbSearch(key)).slice(0, 20);
    await upsertSummaries(results);
    return { imported: results.length };
  } catch (err) {
    console.error("[tmdb] search import:", (err as Error).message);
    return { imported: 0, error: true };
  }
}

/** Fills in runtime, director, trailer and genres for the detail page (at most every 14 days). */
export async function ensureDetails(movieId: number) {
  if (!tmdbEnabled()) return;
  const info = await getMovieSyncInfo(movieId);
  // Locked movies were edited by an admin; their data is not refreshed from TMDB
  if (!info?.tmdb_id || info.synced || info.sync_locked) return;

  try {
    const d = await tmdbDetails(info.tmdb_id);
    if (!sameRelease(info.release_date, d.release_date)) {
      console.warn(`[tmdb] #${movieId}: tmdb_id ${info.tmdb_id} belongs to a different film, skipped`);
      await query("UPDATE movies SET details_synced_at = now() WHERE id = $1", [movieId]);
      return;
    }
    const director = (d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name).join(", ");
    await query(
      `UPDATE movies SET
         title = $2, original_title = $3,
         overview = COALESCE(NULLIF($4, ''), overview),
         release_date = COALESCE(NULLIF($5, '')::date, release_date),
         runtime = COALESCE($6, runtime),
         rating = $7, vote_count = $8, popularity = $9,
         poster_url = COALESCE($10, poster_url),
         backdrop_url = COALESCE($11, backdrop_url),
         trailer_youtube_key = COALESCE($12, trailer_youtube_key),
         director = COALESCE(NULLIF($13, ''), director),
         details_synced_at = now(), updated_at = now()
       WHERE id = $1`,
      [
        movieId,
        d.title,
        d.original_title,
        d.overview,
        d.release_date ?? "",
        d.runtime || null,
        d.vote_count > 0 ? Math.round(d.vote_average * 10) / 10 : null,
        d.vote_count,
        d.popularity,
        posterUrl(d.poster_path),
        backdropUrl(d.backdrop_path),
        pickTrailer(d),
        director,
      ],
    );
    if (d.genres.length) {
      await query(
        `INSERT INTO movie_genres (movie_id, genre_id)
         SELECT $1, g.id FROM genres g WHERE g.id = ANY($2::int[])
         ON CONFLICT DO NOTHING`,
        [movieId, d.genres.map((g) => g.id)],
      );
    }
  } catch (err) {
    console.error(`[tmdb] #${movieId} details:`, (err as Error).message);
  }
}
