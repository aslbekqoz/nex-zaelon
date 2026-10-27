// Rules for changing the account email. Pure, unit tested.

export const EMAIL_CHANGE_TTL_HOURS = 24;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function newEmailError(current: string, next: string) {
  if (!EMAIL_RE.test(next) || next.length > 254) return "Please enter a valid email address.";
  if (normalizeEmail(next) === normalizeEmail(current)) return "That's already your email address.";
  return null;
}

/** "nodira@example.com" → "n***@example.com", for notices sent to the old address. */
export function maskEmail(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

export type EmailChangeRow = {
  expiresAt: Date;
  usedAt: Date | null;
  cancelledAt: Date | null;
  oldEmail: string;
  currentEmail: string;
};

export function emailChangeProblem(row: EmailChangeRow | null, now: Date) {
  if (!row) return "This confirmation link is invalid.";
  if (row.usedAt) return "This email change has already been confirmed.";
  if (row.cancelledAt) return "This email change was cancelled or replaced by a newer request.";
  if (row.expiresAt.getTime() <= now.getTime()) return "This confirmation link has expired.";
  // The account's address changed some other way after this request was made
  if (normalizeEmail(row.oldEmail) !== normalizeEmail(row.currentEmail)) return "This request is out of date. Please start the change again.";
  return null;
}
