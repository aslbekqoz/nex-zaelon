// Rules for deleting an account. Pure, unit tested.

export const DELETE_CONFIRMATION = "DELETE";

/** Null when the request may go ahead, otherwise the message to show. */
export function deleteAccountError(password: string, confirmation: string): string | null {
  if (!password) return "Enter your current password.";
  if (confirmation.trim().toUpperCase() !== DELETE_CONFIRMATION) return `Type ${DELETE_CONFIRMATION} to confirm.`;
  return null;
}
