"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { getCurrentUser, needsEmailConfirmation } from "@/lib/auth/session";
import { addToList, createList, deleteList, listOrder, removeFromList, reorderList, updateList } from "./repository";
import {
  listDescriptionError,
  listTitleError,
  MAX_ITEMS_PER_LIST,
  MAX_LISTS_PER_USER,
  moveItem,
  normalizeListDescription,
  normalizeListTitle,
} from "./rules";

export type ListState = { error?: string; ok?: string };

function id(form: FormData, key: string) {
  const n = Number(form.get(key));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

const text = (form: FormData, key: string) => (typeof form.get(key) === "string" ? (form.get(key) as string) : "");

async function owner(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (needsEmailConfirmation(user)) redirect(`/confirm-email?next=${encodeURIComponent(next)}`);
  return user;
}

function fields(form: FormData) {
  const title = normalizeListTitle(text(form, "title"));
  const description = normalizeListDescription(text(form, "description"));
  return { title, description, isPublic: form.get("public") === "on", error: listTitleError(title) ?? listDescriptionError(description) };
}

export async function createListAction(_prev: ListState, form: FormData): Promise<ListState> {
  const user = await owner("/lists");
  const f = fields(form);
  if (f.error) return { error: f.error };
  const listId = await createList(user.id, f.title, f.description, f.isPublic);
  if (!listId) return { error: `You can have up to ${MAX_LISTS_PER_USER} lists.` };
  await audit(user.id, "list.create", { type: "list", id: listId }, { public: f.isPublic });
  // A movie page can create a list and add the movie to it in one go
  const movieId = id(form, "movieId");
  if (movieId) await addToList(user.id, listId, movieId);
  revalidatePath("/lists");
  redirect(`/lists/${listId}`);
}

export async function updateListAction(_prev: ListState, form: FormData): Promise<ListState> {
  const listId = id(form, "listId");
  const user = await owner(`/lists/${listId ?? ""}`);
  if (!listId) return { error: "Unknown list." };
  const f = fields(form);
  if (f.error) return { error: f.error };
  if (!(await updateList(user.id, listId, f.title, f.description, f.isPublic))) return { error: "Unknown list." };
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/lists");
  return { ok: "Saved." };
}

export async function deleteListAction(form: FormData) {
  const listId = id(form, "listId");
  const user = await owner("/lists");
  if (listId && (await deleteList(user.id, listId))) await audit(user.id, "list.delete", { type: "list", id: listId });
  revalidatePath("/lists");
  redirect("/lists");
}

export async function addToListAction(_prev: ListState, form: FormData): Promise<ListState> {
  const movieId = id(form, "movieId");
  const user = await owner(`/movies/${movieId ?? ""}`);
  const listId = id(form, "listId");
  if (!listId || !movieId) return { error: "Choose a list." };
  const result = await addToList(user.id, listId, movieId);
  if (result === "not_found") return { error: "Unknown list." };
  if (result === "full") return { error: `A list can hold up to ${MAX_ITEMS_PER_LIST} movies.` };
  revalidatePath(`/lists/${listId}`);
  revalidatePath(`/movies/${movieId}`);
  return { ok: result === "already" ? "It's already on that list." : "Added to the list." };
}

export async function removeFromListAction(form: FormData) {
  const listId = id(form, "listId");
  const movieId = id(form, "movieId");
  const user = await owner(`/lists/${listId ?? ""}`);
  if (listId && movieId) await removeFromList(user.id, listId, movieId);
  revalidatePath(`/lists/${listId}`);
}

export async function moveInListAction(form: FormData) {
  const listId = id(form, "listId");
  const movieId = id(form, "movieId");
  const user = await owner(`/lists/${listId ?? ""}`);
  const direction = form.get("direction") === "up" ? "up" : "down";
  if (!listId || !movieId) return;
  const next = moveItem(await listOrder(listId), movieId, direction);
  if (next) await reorderList(user.id, listId, next);
  revalidatePath(`/lists/${listId}`);
}
