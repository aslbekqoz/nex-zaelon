"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { clientIp, recordAttempt, reviewBlocked } from "@/lib/auth/attempts";
import { getCurrentUser, needsEmailConfirmation, requireAdmin } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { deleteReview, setHelpfulVote, setReviewHidden, upsertReview } from "./repository";
import { normalizeReview, reviewError } from "./rules";

export type ReviewState = { error?: string; ok?: string; body?: string };

function id(form: FormData, key: string) {
  const n = Number(form.get(key));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export async function saveReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to write a review." };
  if (needsEmailConfirmation(user)) return { error: "Confirm your email address before writing reviews." };
  const movieId = id(form, "movieId");
  if (!movieId) return { error: "Unknown movie." };
  const raw = typeof form.get("body") === "string" ? (form.get("body") as string) : "";
  const body = normalizeReview(raw);
  const invalid = reviewError(body);
  if (invalid) return { error: invalid, body: raw };

  const blocked = await reviewBlocked(user.email);
  if (blocked) return { error: blocked, body: raw };
  const exists = await query("SELECT 1 FROM movies WHERE id = $1", [movieId]);
  if (!exists.rowCount) return { error: "Unknown movie." };
  await recordAttempt("review", user.email, await clientIp(), true);

  const created = await upsertReview(user.id, movieId, body, form.get("spoilers") === "on");
  await audit(user.id, created ? "review.create" : "review.update", { type: "movie", id: movieId }, { characters: [...body].length });
  revalidatePath(`/movies/${movieId}`);
  return { ok: created ? "Thanks — your review is published." : "Your review has been updated.", body };
}

export async function removeOwnReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  const movieId = id(form, "movieId");
  if (!movieId) return { error: "Unknown movie." };
  if (await deleteReview(user.id, movieId)) await audit(user.id, "review.delete", { type: "movie", id: movieId });
  revalidatePath(`/movies/${movieId}`);
  return { ok: "Your review has been deleted.", body: "" };
}

/** Marks someone else's review as helpful, or takes the vote back. */
export async function voteHelpful(form: FormData) {
  const user = await getCurrentUser();
  if (!user || needsEmailConfirmation(user)) return;
  const authorId = id(form, "authorId");
  const movieId = id(form, "movieId");
  if (!authorId || !movieId) return;
  await setHelpfulVote(user.id, authorId, movieId, form.get("helpful") === "1");
  revalidatePath(`/movies/${movieId}`);
}

/** Admin moderation: hide a review from everyone but its author, or show it again. */
export async function moderateReview(form: FormData) {
  const admin = await requireAdmin();
  const userId = id(form, "userId");
  const movieId = id(form, "movieId");
  if (!userId || !movieId) return;
  const hide = form.get("hide") === "1";
  if (await setReviewHidden(userId, movieId, hide, admin.id)) {
    await audit(admin.id, hide ? "review.hide" : "review.unhide", { type: "movie", id: movieId }, { author: userId });
  }
  revalidatePath("/admin/reviews");
  revalidatePath(`/movies/${movieId}`);
}
