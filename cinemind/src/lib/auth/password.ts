// Password rules shared by sign-up and password reset. Pure, unit tested.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt ignores anything past 72 bytes

export function passwordError(password: string, confirm?: string) {
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (confirm !== undefined && confirm !== password) return "The two passwords don't match.";
  return null;
}

/** Rules for changing a password while signed in (the current one is checked separately). */
export function passwordChangeError(current: string, next: string, confirm: string) {
  if (!current) return "Enter your current password.";
  const error = passwordError(next, confirm);
  if (error) return error;
  if (next === current) return "Choose a password that's different from your current one.";
  return null;
}
