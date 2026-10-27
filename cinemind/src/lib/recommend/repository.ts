import "server-only";
import { query } from "@/lib/db";
import type { CandidateMovie, Signals } from "./engine";

// The engine scores in memory; the most popular CANDIDATE_LIMIT movies are plenty for a
// catalogue of this size. A larger catalogue would pre-filter by genre in SQL first.
const CANDIDATE_LIMIT = 3000;

type CandidateRow = {
  id: number;
  title: string;
  director: string | null;
  year: number | null;
  rating: number | null;
  vote_count: number | null;
  popularity: number;
  runtime: number | null;
  genre_ids: number[];
};

const candidateSelect = (extraColumns = "") => `
  SELECT ${extraColumns} m.id, m.title, m.director, extract(year FROM m.release_date)::int AS year,
         m.rating, m.vote_count, m.popularity, m.runtime,
         COALESCE(array_agg(mg.genre_id) FILTER (WHERE mg.genre_id IS NOT NULL), '{}') AS genre_ids
    FROM movies m
    LEFT JOIN movie_genres mg ON mg.movie_id = m.id`;

function toCandidate(r: CandidateRow): CandidateMovie {
  return {
    id: r.id,
    title: r.title,
    genreIds: r.genre_ids,
    director: r.director,
    year: r.year,
    rating: r.rating,
    voteCount: r.vote_count,
    popularity: r.popularity,
    runtime: r.runtime,
  };
}

export async function loadCandidates(): Promise<CandidateMovie[]> {
  const { rows } = await query<CandidateRow>(
    `${candidateSelect()} GROUP BY m.id ORDER BY m.popularity DESC LIMIT ${CANDIDATE_LIMIT}`,
  );
  return rows.map(toCandidate);
}

export async function loadSignals(userId: number): Promise<Signals> {
  const [genres, ratings, watchlist] = await Promise.all([
    query<{ genre_id: number }>("SELECT genre_id FROM user_favorite_genres WHERE user_id = $1", [userId]),
    query<CandidateRow & { user_rating: number }>(
      `${candidateSelect("ur.rating AS user_rating,")}
        JOIN user_ratings ur ON ur.movie_id = m.id AND ur.user_id = $1
       GROUP BY m.id, ur.rating`,
      [userId],
    ),
    query<CandidateRow & { watched: boolean }>(
      `${candidateSelect("w.watched,")}
        JOIN watchlist_items w ON w.movie_id = m.id AND w.user_id = $1
       GROUP BY m.id, w.watched`,
      [userId],
    ),
  ]);
  return {
    favoriteGenreIds: genres.rows.map((r) => r.genre_id),
    ratings: ratings.rows.map((r) => ({ movie: toCandidate(r), rating: r.user_rating })),
    watchlist: watchlist.rows.map((r) => ({ movie: toCandidate(r), watched: r.watched })),
  };
}
