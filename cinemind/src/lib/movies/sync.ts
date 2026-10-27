import "server-only";
import { db, query } from "@/lib/db";
import { getMovieSyncInfo } from "./repository";
import { KEY_JOBS, pickCredits, type CreditPick } from "./credits";
import {
  backdropUrl,
  pickTrailer,
  posterUrl,
  profileUrl,
  tmdbDetails,
  tmdbEnabled,
  tmdbList,
  tmdbPerson,
  tmdbSearch,
  type TmdbListKey,
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

/** Inserts or refreshes movies from TMDB summaries; returns how many were new. */
async function upsertSummaries(items: TmdbMovieSummary[]) {
  let added = 0;
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    for (const m of items) {
      const { rows } = await client.query<{ id: number; inserted: boolean }>(
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
         RETURNING id, (xmax = 0) AS inserted`,
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
      if (rows[0]?.inserted) added++;
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
  return { added };
}

/** Upserts people by TMDB id and returns tmdb id → local person id. */
async function upsertPeople(client: import("pg").PoolClient, picks: { tmdbPersonId: number; name: string; profilePath: string | null; knownFor: string | null; popularity: number }[]) {
  const ids = new Map<number, number>();
  for (const p of picks) {
    if (ids.has(p.tmdbPersonId)) continue;
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO people (tmdb_id, name, profile_url, known_for_department, popularity)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tmdb_id) DO UPDATE SET
         name = EXCLUDED.name,
         profile_url = COALESCE(EXCLUDED.profile_url, people.profile_url),
         known_for_department = COALESCE(EXCLUDED.known_for_department, people.known_for_department),
         popularity = GREATEST(people.popularity, EXCLUDED.popularity)
       RETURNING id`,
      [p.tmdbPersonId, p.name, profileUrl(p.profilePath), p.knownFor, p.popularity],
    );
    ids.set(p.tmdbPersonId, rows[0].id);
  }
  return ids;
}

/** Replaces a movie's stored cast and crew with the chosen credits. */
async function saveCredits(movieId: number, picks: CreditPick[]) {
  if (!picks.length) return;
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const ids = await upsertPeople(client, picks);
    await client.query("DELETE FROM movie_credits WHERE movie_id = $1", [movieId]);
    for (const p of picks) {
      await client.query(
        `INSERT INTO movie_credits (movie_id, person_id, kind, role, department, ord)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [movieId, ids.get(p.tmdbPersonId), p.kind, p.role, p.department, p.ord],
      );
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
    await saveCredits(movieId, pickCredits(d.credits));
  } catch (err) {
    console.error(`[tmdb] #${movieId} details:`, (err as Error).message);
  }
}

/** Imports one of TMDB's movie lists (trending, popular…) into the catalogue. */
export async function importTmdbList(list: TmdbListKey, pages: number) {
  if (!tmdbEnabled()) throw new Error("TMDB is not configured (TMDB_API_KEY).");
  const items: TmdbMovieSummary[] = [];
  for (let page = 1; page <= pages; page++) items.push(...(await tmdbList(list, page)));
  const unique = [...new Map(items.map((m) => [m.id, m])).values()];
  const { added } = await upsertSummaries(unique);
  return { fetched: unique.length, added };
}

const PERSON_FILMS = 24;

/** Fills a person's biography and adds their best-known films to the catalogue (every 30 days). */
export async function ensurePerson(personId: number) {
  if (!tmdbEnabled()) return;
  const { rows } = await query<{ tmdb_id: number | null; synced: boolean }>(
    `SELECT tmdb_id, (details_synced_at IS NOT NULL AND details_synced_at > now() - interval '30 days') AS synced
       FROM people WHERE id = $1`,
    [personId],
  );
  const info = rows[0];
  if (!info?.tmdb_id || info.synced) return;
  try {
    const p = await tmdbPerson(info.tmdb_id);
    await query(
      `UPDATE people SET name = $2, biography = NULLIF($3, ''), birthday = $4::date, deathday = $5::date,
              place_of_birth = $6, profile_url = COALESCE($7, profile_url), known_for_department = $8,
              popularity = $9, details_synced_at = now()
        WHERE id = $1`,
      [personId, p.name, p.biography, p.birthday || null, p.deathday || null, p.place_of_birth, profileUrl(p.profile_path),
       p.known_for_department, p.popularity],
    );
    // Their most popular films (acting or a key crew job) join the catalogue
    const credits = [
      ...(p.movie_credits?.cast ?? []).map((c) => ({ ...c, kind: "cast" as const, role: (c.character ?? "").trim() })),
      ...(p.movie_credits?.crew ?? []).filter((c) => KEY_JOBS.includes(c.job ?? "")).map((c) => ({ ...c, kind: "crew" as const, role: c.job ?? "" })),
    ].filter((c) => !c.adult && c.release_date);
    const top = [...new Map([...credits].sort((a, b) => b.popularity - a.popularity).map((c) => [c.id, c])).values()].slice(0, PERSON_FILMS);
    if (!top.length) return;
    await upsertSummaries(top);
    const ids = await query<{ id: number; tmdb_id: number }>("SELECT id, tmdb_id FROM movies WHERE tmdb_id = ANY($1::int[])", [top.map((m) => m.id)]);
    const movieIdByTmdb = new Map(ids.rows.map((r) => [r.tmdb_id, r.id]));
    for (const c of credits) {
      const movieId = movieIdByTmdb.get(c.id);
      if (!movieId) continue;
      // Movie-level credits (with billing order) win; these only fill gaps
      await query(
        `INSERT INTO movie_credits (movie_id, person_id, kind, role, department, ord)
         VALUES ($1, $2, $3, $4, $5, 900) ON CONFLICT DO NOTHING`,
        [movieId, personId, c.kind, c.role, c.kind === "cast" ? "Acting" : (c.department ?? null)],
      );
    }
  } catch (err) {
    console.error(`[tmdb] person #${personId}:`, (err as Error).message);
  }
}
