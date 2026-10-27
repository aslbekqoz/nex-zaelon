"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUser, safeNextPath } from "@/lib/auth/session";

function movieIdFrom(form: FormData) {
  const id = Number(form.get("movieId"));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid movie id");
  return id;
}

async function userOrLogin(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNextPath(form.get("path")))}`);
  return user;
}

export async function toggleWatchlist(form: FormData) {
  const user = await userOrLogin(form);
  const movieId = movieIdFrom(form);
  const { rowCount } = await query("DELETE FROM watchlist_items WHERE user_id = $1 AND movie_id = $2", [
    user.id,
    movieId,
  ]);
  if (!rowCount) {
    await query(
      `INSERT INTO watchlist_items (user_id, movie_id)
       SELECT $1, id FROM movies WHERE id = $2 ON CONFLICT DO NOTHING`,
      [user.id, movieId],
    );
  }
  revalidatePath(`/movies/${movieId}`);
  revalidatePath("/watchlist");
}

export async function setWatched(form: FormData) {
  const user = await userOrLogin(form);
  const movieId = movieIdFrom(form);
  const watched = form.get("watched") === "1";
  await query("UPDATE watchlist_items SET watched = $3 WHERE user_id = $1 AND movie_id = $2", [
    user.id,
    movieId,
    watched,
  ]);
  revalidatePath("/watchlist");
  revalidatePath(`/movies/${movieId}`);
}
