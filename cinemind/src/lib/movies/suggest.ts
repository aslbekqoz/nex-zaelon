import "server-only";
import { query } from "@/lib/db";

export type Suggestion =
  | { kind: "movie"; id: number; title: string; titleUz: string | null; year: number | null; posterUrl: string | null }
  | { kind: "person"; id: number; name: string; knownFor: string | null; profileUrl: string | null };

/** Shortest and longest search text that gets suggestions. */
export const SUGGEST_MIN = 2;
export const SUGGEST_MAX = 80;

/**
 * Type-ahead suggestions from the local catalogue: a few movies (English, Uzbek or original
 * title) and people. Titles that start with the text rank first, then closer matches, then
 * popularity. TMDB is not queried here; the full search page does that.
 */
export async function suggest(text: string, limits = { movies: 6, people: 3 }): Promise<Suggestion[]> {
  const q = text.trim().slice(0, SUGGEST_MAX);
  if (q.length < SUGGEST_MIN) return [];
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const [movies, people] = await Promise.all([
    query<{ id: number; title: string; titleUz: string | null; year: number | null; posterUrl: string | null }>(
      `SELECT m.id::int AS id, m.title, m.title_uz AS "titleUz", EXTRACT(YEAR FROM m.release_date)::int AS year, m.poster_url AS "posterUrl"
         FROM movies m
        WHERE m.title ILIKE $2 OR m.title_uz ILIKE $2 OR m.original_title ILIKE $2
           OR similarity(m.title, $1) > 0.3 OR similarity(COALESCE(m.title_uz, ''), $1) > 0.3
        ORDER BY (m.title ILIKE $3 OR m.title_uz ILIKE $3 OR m.original_title ILIKE $3) DESC,
                 GREATEST(similarity(m.title, $1), similarity(COALESCE(m.title_uz, ''), $1)) DESC,
                 m.popularity DESC
        LIMIT $4`,
      [q, `%${escaped}%`, `${escaped}%`, limits.movies],
    ),
    query<{ id: number; name: string; knownFor: string | null; profileUrl: string | null }>(
      `SELECT p.id::int AS id, p.name, p.known_for_department AS "knownFor", p.profile_url AS "profileUrl"
         FROM people p
        WHERE (p.name ILIKE $2 OR similarity(p.name, $1) > 0.4)
          AND EXISTS (SELECT 1 FROM movie_credits c WHERE c.person_id = p.id)
        ORDER BY (p.name ILIKE $3 OR p.name ILIKE $4) DESC, similarity(p.name, $1) DESC, p.popularity DESC
        LIMIT $5`,
      [q, `%${escaped}%`, `${escaped}%`, `% ${escaped}%`, limits.people],
    ),
  ]);
  return [
    ...movies.rows.map((m) => ({ kind: "movie" as const, ...m })),
    ...people.rows.map((p) => ({ kind: "person" as const, ...p })),
  ];
}
