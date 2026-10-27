import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { query } from "@/lib/db";

const COOKIE_NAME = "cm_session";
const SESSION_DAYS = 30;

export type User = {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
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
    `SELECT u.id, u.email, u.name, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
});

export async function requireUser(nextPath = "/"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Editors (admins) only; everyone else gets a 404 so the studio isn't advertised. */
export async function requireEditor(nextPath = "/studio"): Promise<User> {
  const user = await requireUser(nextPath);
  if (user.role !== "admin") notFound();
  return user;
}

/** Prevents open redirects: only same-site relative paths are allowed. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}
