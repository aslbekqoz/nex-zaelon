import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { query } from "@/lib/db";
import { mustConfirmEmail, verificationMode } from "./verification";

const COOKIE_NAME = "cm_session";
const SESSION_DAYS = 30;

export type User = {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
  emailVerified: boolean;
  /** Key of the profile picture (/avatars/<key>), or null when there is none. */
  avatarKey: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Opens a new session and sets the cookie. Call only from a server action or route handler. */
export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    expiresAt,
  ]);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  // Opportunistically clean up this user's expired sessions
  await query("DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()", [userId]);
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  store.delete(COOKIE_NAME);
}

/** The current user; hits the database at most once per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const { rows } = await query<User>(
    `SELECT u.id, u.email, u.name, u.role, u.email_verified_at IS NOT NULL AS "emailVerified", a.key AS "avatarKey"
       FROM sessions s JOIN users u ON u.id = s.user_id
       LEFT JOIN user_avatars a ON a.user_id = u.id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.disabled_at IS NULL`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
});

export async function requireUser(nextPath = "/"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export function emailVerificationMode() {
  return verificationMode(process.env.EMAIL_VERIFICATION);
}

/** True when this user has to confirm their email before using account features. */
export function needsEmailConfirmation(user: User) {
  return mustConfirmEmail(user, emailVerificationMode());
}

/** A signed-in user whose email is confirmed (when confirmation is required); others are sent to confirm it. */
export async function requireVerifiedUser(nextPath = "/"): Promise<User> {
  const user = await requireUser(nextPath);
  if (needsEmailConfirmation(user)) redirect(`/confirm-email?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Editors only; everyone else gets a 404 so the studio isn't advertised. Today every admin is an editor. */
export async function requireEditor(nextPath = "/studio"): Promise<User> {
  const user = await requireUser(nextPath);
  // Role first, so non-editors get a 404 whether or not their email is confirmed
  if (user.role !== "admin") notFound();
  if (needsEmailConfirmation(user)) redirect(`/confirm-email?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Admin panel access; same rule as the studio for now, kept separate so roles can diverge later. */
export async function requireAdmin(nextPath = "/admin"): Promise<User> {
  const user = await requireUser(nextPath);
  if (user.role !== "admin") notFound();
  if (needsEmailConfirmation(user)) redirect(`/confirm-email?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Prevents open redirects: only same-site relative paths are allowed. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}
