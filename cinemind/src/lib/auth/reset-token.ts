// Password reset token rules. Pure, unit tested.

export const RESET_TTL_MINUTES = 60;
/** Links created by an admin to send by hand get a longer window. */
export const ADMIN_RESET_TTL_MINUTES = 24 * 60;

export type ResetRow = { expiresAt: Date; usedAt: Date | null; userDisabled: boolean };

export function resetProblem(row: ResetRow | null, now: Date) {
  if (!row) return "This reset link is invalid.";
  if (row.usedAt) return "This reset link has already been used or was replaced by a newer one.";
  if (row.expiresAt.getTime() <= now.getTime()) return "This reset link has expired.";
  if (row.userDisabled) return "This account has been disabled. Contact the site administrator.";
  return null;
}

/** Tokens are 32 random bytes in base64url (43 characters); anything else is rejected before a lookup. */
export function looksLikeToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}
