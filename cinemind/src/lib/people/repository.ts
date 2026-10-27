import "server-only";
import { query } from "@/lib/db";
import { listMoviesByIds } from "@/lib/movies/repository";
import type { Movie } from "@/lib/movies/types";

export type Person = {
  id: number;
  tmdbId: number | null;
  name: string;
  profileUrl: string | null;
  knownFor: string | null;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
};

export async function getPerson(id: number) {
  const { rows } = await query<Person>(
    `SELECT id, tmdb_id AS "tmdbId", name, profile_url AS "profileUrl", known_for_department AS "knownFor",
            biography, birthday, deathday, place_of_birth AS "placeOfBirth"
       FROM people WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export type FilmographyEntry = { movie: Movie; roles: string[]; kinds: ("cast" | "crew")[] };

/** The person's films in the catalogue, newest first, with every role they had on each. */
export async function getFilmography(personId: number): Promise<FilmographyEntry[]> {
  const { rows } = await query<{ movie_id: number; kind: "cast" | "crew"; role: string; release_date: string | null }>(
    `SELECT c.movie_id, c.kind, c.role, m.release_date
       FROM movie_credits c JOIN movies m ON m.id = c.movie_id
      WHERE c.person_id = $1
      ORDER BY m.release_date DESC NULLS LAST, c.kind, c.ord`,
    [personId],
  );
  const order: number[] = [];
  const byMovie = new Map<number, { roles: string[]; kinds: Set<"cast" | "crew"> }>();
  for (const r of rows) {
    if (!byMovie.has(r.movie_id)) {
      byMovie.set(r.movie_id, { roles: [], kinds: new Set() });
      order.push(r.movie_id);
    }
    const e = byMovie.get(r.movie_id)!;
    e.kinds.add(r.kind);
    const label = r.kind === "cast" ? (r.role ? `as ${r.role}` : "Actor") : r.role;
    if (label && !e.roles.includes(label)) e.roles.push(label);
  }
  const movies = await listMoviesByIds(order);
  return movies.map((movie) => {
    const e = byMovie.get(movie.id)!;
    return { movie, roles: e.roles, kinds: [...e.kinds] };
  });
}
