"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function rateMovie(form: FormData) {
  const movieId = Number(form.get("movieId"));
  const rating = Number(form.get("rating"));
  if (!Number.isSafeInteger(movieId) || movieId <= 0) throw new Error("Invalid movie id");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/movies/${movieId}`)}`);

  if (rating === 0) {
    await query("DELETE FROM user_ratings WHERE user_id = $1 AND movie_id = $2", [user.id, movieId]);
  } else {
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw new Error("Rating must be 1–10");
    await query(
      `INSERT INTO user_ratings (user_id, movie_id, rating)
       SELECT $1, id, $3 FROM movies WHERE id = $2
       ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating, rated_at = now()`,
      [user.id, movieId, rating],
    );
  }
  revalidatePath(`/movies/${movieId}`);
  revalidatePath("/recommendations");
}
