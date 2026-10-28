// Rules for user lists. Pure, unit tested.

export const LIST_TITLE_MIN = 2;
export const LIST_TITLE_MAX = 80;
export const LIST_DESCRIPTION_MAX = 500;
export const MAX_LISTS_PER_USER = 50;
export const MAX_ITEMS_PER_LIST = 100;

// Control and formatting characters (incl. bidi overrides), except line breaks in descriptions
// and the zero-width joiner emoji are built with
const INVISIBLE = /(?!‍)\p{Cf}|[^\P{Cc}\n]/u;

export function normalizeListTitle(title: string) {
  return title.replace(/\s+/g, " ").trim();
}

export function normalizeListDescription(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function listTitleError(title: string) {
  if (INVISIBLE.test(title) || title.includes("\n")) return "The title can't contain invisible or control characters.";
  const n = [...title].length;
  if (n < LIST_TITLE_MIN || n > LIST_TITLE_MAX) return `Give the list a title of ${LIST_TITLE_MIN}–${LIST_TITLE_MAX} characters.`;
  return null;
}

export function listDescriptionError(text: string) {
  if (INVISIBLE.test(text)) return "The description can't contain invisible or control characters.";
  if ([...text].length > LIST_DESCRIPTION_MAX) return `Keep the description under ${LIST_DESCRIPTION_MAX} characters.`;
  return null;
}

/**
 * New order after moving one movie up or down: returns the ids in their new order, or null
 * when the move isn't possible (unknown movie, already first or last).
 */
export function moveItem(order: number[], movieId: number, direction: "up" | "down") {
  const i = order.indexOf(movieId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= order.length) return null;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
