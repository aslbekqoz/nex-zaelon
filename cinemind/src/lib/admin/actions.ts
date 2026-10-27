"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { createResetToken } from "@/lib/auth/reset";
import { isRole, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { appUrl } from "@/lib/email/send";
import { db, query } from "@/lib/db";
import { importTmdbList } from "@/lib/movies/sync";
import { TMDB_LISTS, type TmdbListKey } from "@/lib/movies/tmdb";
import { parseMovieInput } from "./movie-input";

export type FormState = { error?: string; ok?: string; link?: string };

function targetId(form: FormData) {
  const n = Number(form.get("id"));
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid id");
  return n;
}

// ---------- Users ----------

/**
 * Runs a change to admin roles or account status in a transaction holding a lock, so two
 * admins acting at the same moment can't both pass the "at least one active admin" check.
 */
async function withAdminLock<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('cinemind:admin-roles'))");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function setUserRole(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = targetId(form);
  const role = form.get("role");
  if (!isRole(role)) return { error: "Invalid role." };
  if (userId === admin.id) return { error: "You can't change your own role." };
  const result = await withAdminLock(async (c) => {
    const { rows } = await c.query<{ role: Role }>("SELECT role FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const from = rows[0]?.role;
    if (!from) return { error: "User not found." } as const;
    if (from === role) return { error: "They already have that role." } as const;
    if (from === "admin") {
      const others = await c.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND disabled_at IS NULL AND id <> $1",
        [userId],
      );
      if (!others.rows[0].n) return { error: "There must always be at least one active admin." } as const;
    }
    await c.query("UPDATE users SET role = $2 WHERE id = $1", [userId, role]);
    return { from } as const;
  });
  if ("error" in result) return { error: result.error };
  await audit(admin.id, "user.role_changed", { type: "user", id: userId }, { from: result.from, to: role });
  revalidatePath("/admin/users");
  return { ok: `Role changed to ${ROLE_LABELS[role].toLowerCase()}.` };
}

export async function setUserDisabled(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = targetId(form);
  const disable = form.get("disabled") === "1";
  if (userId === admin.id) return { error: "You can't disable your own account." };
  const changed = await withAdminLock(async (c) => {
    const r = await c.query(
      `UPDATE users SET disabled_at = CASE WHEN $2 THEN COALESCE(disabled_at, now()) ELSE NULL END
        WHERE id = $1
          AND (NOT $2 OR role <> 'admin' OR (SELECT count(*) FROM users WHERE role = 'admin' AND disabled_at IS NULL) > 1)`,
      [userId, disable],
    );
    if (r.rowCount && disable) await c.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    return r;
  });
  if (!changed.rowCount) return { error: "There must always be at least one active admin." };
  await audit(admin.id, disable ? "user.disable" : "user.enable", { type: "user", id: userId });
  revalidatePath("/admin/users");
  return { ok: disable ? "Account disabled and signed out everywhere." : "Account enabled." };
}

export async function signOutEverywhere(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = targetId(form);
  const { rowCount } = await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  await audit(admin.id, "user.sessions_revoked", { type: "user", id: userId }, { sessions: rowCount });
  revalidatePath("/admin/users");
  if (userId === admin.id) redirect("/login");
  return { ok: `Signed out of ${rowCount} session${rowCount === 1 ? "" : "s"}.` };
}

/** A one-time reset link the admin sends by hand (for users without working email). */
export async function createResetLink(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = targetId(form);
  const base = appUrl();
  if (!base) return { error: "Set APP_URL so reset links point to your site." };
  const { rows } = await query<{ disabled: boolean }>("SELECT disabled_at IS NOT NULL AS disabled FROM users WHERE id = $1", [userId]);
  if (!rows[0]) return { error: "User not found." };
  if (rows[0].disabled) return { error: "Enable the account first; disabled accounts can't reset their password." };
  const { token } = await createResetToken(userId, "admin");
  await audit(admin.id, "user.reset_link", { type: "user", id: userId });
  return {
    ok: "One-time reset link created. It works once, expires in 24 hours, and replaces any earlier link. Send it to the user privately.",
    link: `${base}/reset-password?token=${token}`,
  };
}

/** For users who can't receive the confirmation email (e.g. confirmed by phone). */
export async function markEmailVerified(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = targetId(form);
  const { rowCount } = await query(
    "UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL",
    [userId],
  );
  if (rowCount) await audit(admin.id, "user.email_verified_by_admin", { type: "user", id: userId });
  revalidatePath("/admin/users");
  return { ok: rowCount ? "Email marked as confirmed." : "This email was already confirmed." };
}

// ---------- Movies ----------

function fieldsOf(form: FormData) {
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && k !== "genre") fields[k] = v;
  return fields;
}

export async function saveMovie(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const movieId = Number(form.get("id")) || null;
  const parsed = parseMovieInput(fieldsOf(form), form.getAll("genre").filter((v): v is string => typeof v === "string"));
  if (!parsed.ok) return { error: parsed.error };
  const m = parsed.value;

  const client = await db().connect();
  let id = movieId;
  try {
    await client.query("BEGIN");
    const values = [m.title, m.titleUz, m.originalTitle, m.overview, m.overviewUz, m.director, m.releaseDate, m.runtime,
      m.originalLanguage, m.posterUrl, m.backdropUrl, m.trailerKey];
    if (movieId) {
      const { rowCount } = await client.query(
        `UPDATE movies SET title = $2, title_uz = $3, original_title = $4, overview = $5, overview_uz = $6,
                director = $7, release_date = $8, runtime = $9, original_language = $10, poster_url = $11,
                backdrop_url = $12, trailer_youtube_key = $13,
                sync_locked = CASE WHEN tmdb_id IS NULL THEN false ELSE $14 END, updated_at = now()
          WHERE id = $1`,
        [movieId, ...values, m.syncLocked],
      );
      if (!rowCount) throw new Error("Movie not found");
    } else {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO movies (title, title_uz, original_title, overview, overview_uz, director, release_date, runtime,
                             original_language, poster_url, backdrop_url, trailer_youtube_key, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'manual') RETURNING id`,
        values,
      );
      id = rows[0].id;
    }
    await client.query("DELETE FROM movie_genres WHERE movie_id = $1", [id]);
    await client.query(
      "INSERT INTO movie_genres (movie_id, genre_id) SELECT $1, g.id FROM genres g WHERE g.id = ANY($2::int[])",
      [id, m.genreIds],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if ((err as Error).message === "Movie not found") return { error: "This movie no longer exists." };
    throw err;
  } finally {
    client.release();
  }
  await audit(admin.id, movieId ? "movie.update" : "movie.create", { type: "movie", id: id! }, { title: m.title });
  revalidatePath(`/movies/${id}`);
  revalidatePath("/admin/movies");
  if (!movieId) redirect(`/admin/movies/${id}?created=1`);
  return { ok: "Movie saved." };
}

export async function deleteMovie(form: FormData) {
  const admin = await requireAdmin();
  const movieId = targetId(form);
  const { rows } = await query<{ title: string }>("DELETE FROM movies WHERE id = $1 RETURNING title", [movieId]);
  if (rows[0]) await audit(admin.id, "movie.delete", { type: "movie", id: movieId }, { title: rows[0].title });
  revalidatePath("/admin/movies");
  redirect("/admin/movies");
}

// ---------- TMDB import ----------

export async function importFromTmdb(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const list = form.get("list");
  const pages = Number(form.get("pages"));
  if (typeof list !== "string" || !(list in TMDB_LISTS)) return { error: "Choose a list." };
  if (!Number.isInteger(pages) || pages < 1 || pages > 5) return { error: "Pages must be 1–5." };
  try {
    const { fetched, added } = await importTmdbList(list as TmdbListKey, pages);
    await audit(admin.id, "movie.import", { type: "tmdb_list", id: list }, { pages, fetched, added });
    revalidatePath("/admin/movies");
    revalidatePath("/");
    return { ok: `Imported “${TMDB_LISTS[list as TmdbListKey].label}”: ${fetched} movies fetched, ${added} new.` };
  } catch (err) {
    console.error("[admin] TMDB import failed:", err);
    return { error: `Import failed: ${(err as Error).message}` };
  }
}
