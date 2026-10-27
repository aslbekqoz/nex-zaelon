// Review text rules. Pure, unit tested.

export const REVIEW_MIN = 20;
export const REVIEW_MAX = 4000;

/**
 * Tidies a review: unifies line breaks, trims each line's trailing spaces and the whole text,
 * and keeps at most one blank line between paragraphs.
 */
export function normalizeReview(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function reviewError(text: string) {
  // Control and formatting characters (incl. bidi overrides) could hide or reorder text. Line
  // breaks are fine, and so is the zero-width joiner that emoji such as 👨‍💻 are built with.
  if (/(?!\u200D)\p{Cf}|[^\P{Cc}\n]/u.test(text)) return "The review can't contain invisible or control characters.";
  const length = [...text].length;
  if (length < REVIEW_MIN) return `Write at least ${REVIEW_MIN} characters.`;
  if (length > REVIEW_MAX) return `Keep it under ${REVIEW_MAX} characters (now ${length}).`;
  return null;
}
