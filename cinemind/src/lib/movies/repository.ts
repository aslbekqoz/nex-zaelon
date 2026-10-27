import "server-only";
import { query } from "@/lib/db";
import type { Genre, Movie, SearchParams, SortKey } from "./types";

export const PAGE_SIZE = 24;

type MovieRow = {
  id: number;
  tmdb_id: number | null;
  title: string;
  title_uz: string | null;
  original_title: string | null;
  overview: string | null;
  overview_uz: string | null;
  director: string | null;
  release_date: string | null;
  runtime: number | null;
  rating: number | null;
  vote_count: number | null;
  original_language: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_youtube_key: string | null;
  genres: Genre[] | null;
};

// Shared SELECT that attaches each movie's genres as a JSON array
const MOVIE_SELECT = `
  SELECT m.id, m.tmdb_id, m.title, m.title_uz, m.original_title, m.overview, m.overview_uz,
         m.director, m.release_date, m.runtime, m.rating, m.vote_count, m.original_language,
         m.poster_url, m.backdrop_url, m.trailer_youtube_key,
         COALESCE((
           SELECT json_agg(json_build_object('id', g.id, 'slug', g.slug, 'name', g.name_en, 'nameUz', g.name_uz) ORDER BY g.name_en)
             FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id
            WHERE mg.movie_id = m.id
         ), '[]') AS genres
    FROM movies m`;

function toMovie(r: MovieRow): Movie {
  return {
    id: r.id,
    tmdbId: r.tmdb_id,
    title: r.title,
    titleUz: r.title_uz,
    originalTitle: r.original_title,
    overview: r.overview,
    overviewUz: r.overview_uz,
    director: r.director,
    releaseDate: r.release_date,
    year: r.release_date ? Number.parseInt(r.release_date.slice(0, 4), 10) : null,
    runtime: r.runtime,
    rating: r.rating,
    voteCount: r.vote_count,
    originalLanguage: r.original_language,
    posterUrl: r.poster_url,
    backdropUrl: r.backdrop_url,
    trailerKey: r.trailer_youtube_key,
    genres: r.genres ?? [],
  };
}

const ORDER_BY: Record<SortKey, string> = {
  popular: "m.popularity DESC, m.id",
  rating: "m.rating DESC NULLS LAST, m.vote_count DESC NULLS LAST, m.id",
  newest: "m.release_date DESC NULLS LAST, m.id",
  title: "m.title, m.id",
};

export async function listGenres(): Promise<Genre[]> {
  const { rows } = await query<Genre>(
    `SELECT g.id, g.slug, g.name_en AS name, g.name_uz AS "nameUz"
       FROM genres g
      WHERE EXISTS (SELECT 1 FROM movie_genres mg WHERE mg.genre_id = g.id)
      ORDER BY g.name_en`,
  );
  return rows;
}

export async function searchMovies(params: SearchParams) {
  const q = params.q?.trim() || null;
  const page = Math.max(1, params.page ?? 1);
  const sort: SortKey = params.sort && params.sort in ORDER_BY ? params.sort : "popular";
  // Escape ILIKE wildcards
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;

  const where = `
    WHERE ($1::text IS NULL
           OR m.title ILIKE $2 OR m.title_uz ILIKE $2 OR m.original_title ILIKE $2
           OR similarity(m.title, $1) > 0.3 OR similarity(COALESCE(m.title_uz, ''), $1) > 0.3)
      AND ($3::text IS NULL OR EXISTS (
            SELECT 1 FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id
             WHERE mg.movie_id = m.id AND g.slug = $3))`;
  const args = [q, like, params.genre || null];

  // With a search term, the closest match comes first
  const order = q && sort === "popular"
    ? `GREATEST(similarity(m.title, $1), similarity(COALESCE(m.title_uz, ''), $1)) DESC, ${ORDER_BY.popular}`
    : ORDER_BY[sort];

  const [list, count] = await Promise.all([
    query<MovieRow>(`${MOVIE_SELECT} ${where} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET $4`, [
      ...args,
      (page - 1) * PAGE_SIZE,
    ]),
    query<{ total: number }>(`SELECT count(*)::int AS total FROM movies m ${where}`, args),
  ]);

  const total = count.rows[0]?.total ?? 0;
  return {
    movies: list.rows.map(toMovie),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getMovie(id: number): Promise<Movie | null> {
  const { rows } = await query<MovieRow>(`${MOVIE_SELECT} WHERE m.id = $1`, [id]);
  return rows[0] ? toMovie(rows[0]) : null;
}

export async function getMovieSyncInfo(id: number) {
  const { rows } = await query<{ tmdb_id: number | null; source: string; release_date: string | null; synced: boolean; sync_locked: boolean }>(
    `SELECT tmdb_id, source, release_date, sync_locked,
            (details_synced_at IS NOT NULL AND details_synced_at > now() - interval '14 days') AS synced
       FROM movies WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listMovies(opts: { sort?: SortKey; genreSlug?: string; limit?: number; ratedOnly?: boolean }) {
  const sort = opts.sort ?? "popular";
  const { rows } = await query<MovieRow>(
    `${MOVIE_SELECT}
      WHERE ($1::text IS NULL OR EXISTS (
              SELECT 1 FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id
               WHERE mg.movie_id = m.id AND g.slug = $1))
        AND (NOT $2 OR m.rating IS NOT NULL)
      ORDER BY ${ORDER_BY[sort]}
      LIMIT $3`,
    [opts.genreSlug ?? null, opts.ratedOnly ?? false, opts.limit ?? 12],
  );
  return rows.map(toMovie);
}

/** Similar movies: by number of shared genres, then rating and popularity. */
export async function getSimilarMovies(movieId: number, limit = 12) {
  const { rows } = await query<MovieRow>(
    `${MOVIE_SELECT}
       JOIN (
         SELECT mg2.movie_id, count(*) AS shared
           FROM movie_genres mg1
           JOIN movie_genres mg2 ON mg2.genre_id = mg1.genre_id AND mg2.movie_id <> mg1.movie_id
          WHERE mg1.movie_id = $1
          GROUP BY mg2.movie_id
       ) s ON s.movie_id = m.id
      ORDER BY s.shared DESC, m.rating DESC NULLS LAST, m.popularity DESC
      LIMIT $2`,
    [movieId, limit],
  );
  return rows.map(toMovie);
}

export async function listMoviesByIds(ids: number[]) {
  if (!ids.length) return [];
  const { rows } = await query<MovieRow>(`${MOVIE_SELECT} WHERE m.id = ANY($1::bigint[])`, [ids]);
  const byId = new Map(rows.map((r) => [r.id, toMovie(r)]));
  return ids.map((id) => byId.get(id)).filter((m): m is Movie => Boolean(m));
}
