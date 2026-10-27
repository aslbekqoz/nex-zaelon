// Email verification link rules. Pure, unit tested.

export const VERIFY_TTL_HOURS = 48;

export type VerificationRow = { expiresAt: Date; usedAt: Date | null; linkEmail: string; currentEmail: string };

export function verifyProblem(row: VerificationRow | null, now: Date) {
  if (!row) return "This confirmation link is invalid.";
  if (row.usedAt) return "This confirmation link has already been used or was replaced by a newer one.";
  if (row.expiresAt.getTime() <= now.getTime()) return "This confirmation link has expired.";
  // The account's address changed after the link was sent
  if (row.linkEmail.toLowerCase() !== row.currentEmail.toLowerCase()) return "This link was sent to a different email address.";
  return null;
}
