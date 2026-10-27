// Password rules shared by sign-up and password reset. Pure, unit tested.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt ignores anything past 72 bytes

export function passwordError(password: string, confirm?: string) {
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (confirm !== undefined && confirm !== password) return "The two passwords don't match.";
  return null;
}
