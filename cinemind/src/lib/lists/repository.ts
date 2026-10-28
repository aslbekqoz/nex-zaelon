import "server-only";
import { db, query } from "@/lib/db";
import { listMoviesByIds } from "@/lib/movies/repository";
import type { Movie } from "@/lib/movies/types";
import { MAX_ITEMS_PER_LIST, MAX_LISTS_PER_USER } from "./rules";

export type ListSummary = {
  id: number;
  userId: number;
  title: string;
  description: string;
  isPublic: boolean;
  items: number;
  updatedAt: Date;
  /** Up to four posters for the cover. */
  posters: string[];
};

const SUMMARY_SELECT = `
  SELECT l.id::int AS id, l.user_id::int AS "userId", l.title, l.description, l.is_public AS "isPublic",
         l.updated_at AS "updatedAt",
         (SELECT count(*)::int FROM list_items i WHERE i.list_id = l.id) AS items,
         COALESCE((SELECT array_agg(p ORDER BY pos) FROM (
           SELECT m.poster_url AS p, i.position AS pos FROM list_items i JOIN movies m ON m.id = i.movie_id
            WHERE i.list_id = l.id AND m.poster_url IS NOT NULL ORDER BY i.position LIMIT 4) x), '{}') AS posters
    FROM user_lists l`;

export async function listsOfUser(userId: number, opts: { publicOnly?: boolean } = {}) {
  const { rows } = await query<ListSummary>(
    `${SUMMARY_SELECT} WHERE l.user_id = $1 AND ($2::boolean = false OR l.is_public) ORDER BY l.updated_at DESC`,
    [userId, opts.publicOnly ?? false],
  );
  return rows;
}

export type ListDetail = ListSummary & { ownerName: string; movies: Movie[] };

/** A list with its movies in order, if the viewer may see it: its owner, or anyone when it's public. */
export async function getListForViewer(listId: number, viewerId: number | null): Promise<ListDetail | null> {
  const { rows } = await query<ListSummary & { ownerName: string }>(
    `SELECT x.*, u.name AS "ownerName" FROM (${SUMMARY_SELECT} WHERE l.id = $1) x
       JOIN users u ON u.id = x."userId"
      WHERE (x."isPublic" AND u.disabled_at IS NULL) OR x."userId" = $2`,
    [listId, viewerId ?? 0],
  );
  if (!rows[0]) return null;
  const ids = await query<{ movie_id: number }>("SELECT movie_id FROM list_items WHERE list_id = $1 ORDER BY position, added_at", [listId]);
  const movies = await listMoviesByIds(ids.rows.map((r) => r.movie_id));
  const byId = new Map(movies.map((m) => [m.id, m]));
  return { ...rows[0], movies: ids.rows.flatMap((r) => byId.get(r.movie_id) ?? []) };
}

/** The viewer's lists for the "Add to list" menu, with whether each already has the movie. */
export async function listsForMovieMenu(userId: number, movieId: number) {
  const { rows } = await query<{ id: number; title: string; has: boolean }>(
    `SELECT l.id::int AS id, l.title, EXISTS (SELECT 1 FROM list_items i WHERE i.list_id = l.id AND i.movie_id = $2) AS has
       FROM user_lists l WHERE l.user_id = $1 ORDER BY l.updated_at DESC`,
    [userId, movieId],
  );
  return rows;
}

export async function createList(userId: number, title: string, description: string, isPublic: boolean) {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO user_lists (user_id, title, description, is_public)
     SELECT $1, $2, $3, $4 WHERE (SELECT count(*) FROM user_lists WHERE user_id = $1) < $5
     RETURNING id::int AS id`,
    [userId, title, description, isPublic, MAX_LISTS_PER_USER],
  );
  return rows[0]?.id ?? null;
}

/** Changes only lists the user owns; false when it isn't theirs. */
export async function updateList(userId: number, listId: number, title: string, description: string, isPublic: boolean) {
  const { rowCount } = await query(
    "UPDATE user_lists SET title = $3, description = $4, is_public = $5, updated_at = now() WHERE id = $2 AND user_id = $1",
    [userId, listId, title, description, isPublic],
  );
  return Boolean(rowCount);
}

export async function deleteList(userId: number, listId: number) {
  const { rowCount } = await query("DELETE FROM user_lists WHERE id = $2 AND user_id = $1", [userId, listId]);
  return Boolean(rowCount);
}

export type AddResult = "added" | "already" | "full" | "not_found";

export async function addToList(userId: number, listId: number, movieId: number): Promise<AddResult> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const owned = await client.query("SELECT 1 FROM user_lists WHERE id = $2 AND user_id = $1 FOR UPDATE", [userId, listId]);
    const movie = await client.query("SELECT 1 FROM movies WHERE id = $1", [movieId]);
    if (!owned.rowCount || !movie.rowCount) {
      await client.query("ROLLBACK");
      return "not_found";
    }
    const { rows } = await client.query<{ n: number; last: number | null; has: boolean }>(
      `SELECT count(*)::int AS n, max(position) AS last, bool_or(movie_id = $2) AS has FROM list_items WHERE list_id = $1`,
      [listId, movieId],
    );
    const { n, last, has } = rows[0];
    if (has) {
      await client.query("ROLLBACK");
      return "already";
    }
    if (n >= MAX_ITEMS_PER_LIST) {
      await client.query("ROLLBACK");
      return "full";
    }
    await client.query("INSERT INTO list_items (list_id, movie_id, position) VALUES ($1, $2, $3)", [listId, movieId, (last ?? 0) + 1]);
    await client.query("UPDATE user_lists SET updated_at = now() WHERE id = $1", [listId]);
    await client.query("COMMIT");
    return "added";
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function removeFromList(userId: number, listId: number, movieId: number) {
  const { rowCount } = await query(
    `DELETE FROM list_items i USING user_lists l
      WHERE i.list_id = l.id AND l.id = $2 AND l.user_id = $1 AND i.movie_id = $3`,
    [userId, listId, movieId],
  );
  if (rowCount) await query("UPDATE user_lists SET updated_at = now() WHERE id = $1", [listId]);
  return Boolean(rowCount);
}

/** Saves a new order (all of the list's movie ids, first to last). */
export async function reorderList(userId: number, listId: number, order: number[]) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const owned = await client.query("SELECT 1 FROM user_lists WHERE id = $2 AND user_id = $1 FOR UPDATE", [userId, listId]);
    if (!owned.rowCount) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE list_items i SET position = o.pos FROM unnest($2::bigint[]) WITH ORDINALITY AS o(movie_id, pos)
        WHERE i.list_id = $1 AND i.movie_id = o.movie_id`,
      [listId, order],
    );
    await client.query("UPDATE user_lists SET updated_at = now() WHERE id = $1", [listId]);
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listOrder(listId: number) {
  const { rows } = await query<{ movie_id: number }>("SELECT movie_id::int AS movie_id FROM list_items WHERE list_id = $1 ORDER BY position, added_at", [listId]);
  return rows.map((r) => r.movie_id);
}
