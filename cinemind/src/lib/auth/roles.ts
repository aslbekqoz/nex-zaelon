// Who may do what. Pure, unit tested.

export const ROLES = ["user", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Editors and admins work in the Content Studio. */
export function canUseStudio(role: Role) {
  return role === "editor" || role === "admin";
}

/** Only admins manage users, movies and the activity log. */
export function canUseAdmin(role: Role) {
  return role === "admin";
}

export const ROLE_LABELS: Record<Role, string> = { user: "User", editor: "Editor", admin: "Admin" };
