"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { query } from "@/lib/db";
import { clientIp, loginBlocked, recordAttempt, registerBlocked } from "./attempts";
import { createSession, destroySession, getCurrentUser, safeNextPath } from "./session";

export type AuthState = { error?: string; email?: string; name?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so response time doesn't reveal whether an account exists
const DUMMY_HASH = bcrypt.hashSync("cinemind-timing-equaliser", 12);

function field(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  const name = field(form, "name");
  const email = field(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const next = safeNextPath(form.get("next"));

  if (name.length < 2 || name.length > 60) return { error: "Name must be 2–60 characters.", email, name };
  if (!EMAIL_RE.test(email) || email.length > 254) return { error: "Please enter a valid email address.", email, name };
  if (password.length < 8) return { error: "Password must be at least 8 characters.", email, name };
  if (password.length > 72) return { error: "Password must be at most 72 characters.", email, name };

  const ip = await clientIp();
  const blocked = await registerBlocked(ip);
  if (blocked) return { error: blocked, email, name };

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query<{ id: number }>(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [email, name, hash],
  );
  await recordAttempt("register", email, ip, Boolean(rows[0]));
  if (!rows[0]) return { error: "An account with this email already exists.", email, name };

  await createSession(rows[0].id);
  // New accounts start with taste onboarding unless they were heading somewhere specific
  redirect(next === "/" ? "/onboarding" : next);
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const next = safeNextPath(form.get("next"));

  const ip = await clientIp();
  const blocked = await loginBlocked(email, ip);
  if (blocked) return { error: blocked, email };

  const { rows } = await query<{ id: number; password_hash: string; disabled: boolean }>(
    "SELECT id, password_hash, disabled_at IS NOT NULL AS disabled FROM users WHERE email = $1",
    [email],
  );
  const ok = await bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY_HASH);
  await recordAttempt("login", email, ip, Boolean(rows[0] && ok));
  if (!rows[0] || !ok) return { error: "Incorrect email or password.", email };
  // Only revealed after a correct password, so it can't be used to probe accounts
  if (rows[0].disabled) return { error: "This account has been disabled. Contact the site administrator.", email };

  await createSession(rows[0].id);
  redirect(next);
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "auth.logout");
  await destroySession();
  redirect("/");
}
