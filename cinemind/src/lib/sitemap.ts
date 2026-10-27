import "server-only";
import { query } from "@/lib/db";

// A sitemap file holds at most 50,000 URLs; these caps keep the whole site in one file
const MAX_MOVIES = 40_000;
const MAX_PEOPLE = 9_000;

/** Public movie and person pages for the sitemap, most important first. */
export async function sitemapEntries() {
  const [movies, people] = await Promise.all([
    query<{ id: number; updatedAt: Date }>(
      `SELECT id::int AS id, updated_at AS "updatedAt" FROM movies ORDER BY popularity DESC NULLS LAST, id LIMIT $1`,
      [MAX_MOVIES],
    ),
    // Only people who appear in some movie's credits have a page worth listing
    query<{ id: number; updatedAt: Date }>(
      `SELECT p.id::int AS id, COALESCE(p.details_synced_at, p.created_at) AS "updatedAt" FROM people p
        WHERE EXISTS (SELECT 1 FROM movie_credits c WHERE c.person_id = p.id)
        ORDER BY p.popularity DESC, p.id LIMIT $1`,
      [MAX_PEOPLE],
    ),
  ]);
  return { movies: movies.rows, people: people.rows };
}
