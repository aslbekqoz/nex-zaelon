import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { query } from "@/lib/db";
import { MAX_USER_AGENT } from "./device";
import { canUseAdmin, canUseStudio, type Role } from "./roles";
import { mustConfirmEmail, verificationMode } from "./verification";

const COOKIE_NAME = "cm_session";
const SESSION_DAYS = 30;
// "Last active" is refreshed at most this often, so page views don't each write to the database
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
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
  const userAgent = (await headers()).get("user-agent")?.slice(0, MAX_USER_AGENT) || null;
  await query("INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES ($1, $2, $3, $4)", [
    hashToken(token),
    userId,
    expiresAt,
    userAgent,
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
  const tokenHash = hashToken(token);
  const { rows } = await query<User & { lastSeenAt: Date }>(
    `SELECT u.id, u.email, u.name, u.role, u.email_verified_at IS NOT NULL AS "emailVerified", a.key AS "avatarKey",
            s.last_seen_at AS "lastSeenAt"
       FROM sessions s JOIN users u ON u.id = s.user_id
       LEFT JOIN user_avatars a ON a.user_id = u.id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.disabled_at IS NULL`,
    [tokenHash],
  );
  if (!rows[0]) return null;
  const { lastSeenAt, ...user } = rows[0];
  if (Date.now() - lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await query("UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1", [tokenHash]);
  }
  return user;
});

export type DeviceSession = {
  id: number;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  /** The session this request is using. */
  current: boolean;
};

/** The user's active sessions, most recently used first. */
export async function listSessions(userId: number): Promise<DeviceSession[]> {
  const token = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  const { rows } = await query<DeviceSession>(
    `SELECT id::int AS id, user_agent AS "userAgent", created_at AS "createdAt", last_seen_at AS "lastSeenAt",
            token_hash = $2 AS current
       FROM sessions WHERE user_id = $1 AND expires_at > now()
      ORDER BY (token_hash = $2) DESC, last_seen_at DESC`,
    [userId, token ? hashToken(token) : ""],
  );
  return rows;
}

/** Signs out one of the user's other sessions; the current one is left alone. Returns how many ended. */
export async function revokeSessions(userId: number, which: { id: number } | "others"): Promise<number> {
  const token = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  const current = token ? hashToken(token) : "";
  const { rowCount } =
    which === "others"
      ? await query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [userId, current])
      : await query("DELETE FROM sessions WHERE user_id = $1 AND id = $2 AND token_hash <> $3", [userId, which.id, current]);
  return rowCount ?? 0;
}

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

/** Content Studio access (editors and admins); everyone else gets a 404 so the studio isn't advertised. */
export async function requireEditor(nextPath = "/studio"): Promise<User> {
  const user = await requireUser(nextPath);
  // Role first, so others get a 404 whether or not their email is confirmed
  if (!canUseStudio(user.role)) notFound();
  if (needsEmailConfirmation(user)) redirect(`/confirm-email?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Admin panel access: admins only. */
export async function requireAdmin(nextPath = "/admin"): Promise<User> {
  const user = await requireUser(nextPath);
  if (!canUseAdmin(user.role)) notFound();
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
