"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type OnboardingState = { error?: string };

// Films picked during onboarding are recorded as 8/10 ("liked"); the UI says so and the
// rating can be changed on the movie page.
const LIKED_RATING = 8;

function ids(form: FormData, key: string) {
  return [...new Set(form.getAll(key).map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))];
}

export async function saveOnboarding(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const user = await requireUser("/onboarding");
  const genreIds = ids(form, "genre");
  const movieIds = ids(form, "movie").slice(0, 50);
  if (!genreIds.length) return { error: "Pick at least one genre you enjoy." };

  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM user_favorite_genres WHERE user_id = $1", [user.id]);
    await client.query(
      `INSERT INTO user_favorite_genres (user_id, genre_id)
       SELECT $1, id FROM genres WHERE id = ANY($2::int[])`,
      [user.id, genreIds],
    );
    // Never overwrite a rating the user already gave
    await client.query(
      `INSERT INTO user_ratings (user_id, movie_id, rating)
       SELECT $1, id, $3 FROM movies WHERE id = ANY($2::bigint[])
       ON CONFLICT DO NOTHING`,
      [user.id, movieIds, LIKED_RATING],
    );
    await client.query("UPDATE users SET onboarded_at = COALESCE(onboarded_at, now()) WHERE id = $1", [user.id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  revalidatePath("/", "layout");
  redirect("/recommendations");
}
