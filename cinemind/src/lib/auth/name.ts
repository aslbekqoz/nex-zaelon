// Display name rules shared by sign-up and the Account page. Pure, unit tested.

export const NAME_MIN = 2;
export const NAME_MAX = 60;

/** Trims and collapses runs of whitespace ("  Ada   Lovelace " → "Ada Lovelace"). */
export function normalizeName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

export function nameError(name: string) {
  // Invisible control and formatting characters (incl. bidi overrides) could disguise a name
  if (/[\p{Cc}\p{Cf}]/u.test(name)) return "Name can't contain invisible or control characters.";
  const length = [...name].length;
  if (length < NAME_MIN || length > NAME_MAX) return `Name must be ${NAME_MIN}–${NAME_MAX} characters.`;
  return null;
}
