"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { audit } from "@/lib/audit";
import { query } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { clientIp, loginBlocked, recordAttempt, registerBlocked, resetBlocked } from "./attempts";
import { passwordError } from "./password";
import { completeReset, createResetToken } from "./reset";
import { createSession, destroySession, getCurrentUser, safeNextPath } from "./session";

export type AuthState = { error?: string; ok?: string; email?: string; name?: string };

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
  const pwError = passwordError(password);
  if (pwError) return { error: pwError, email, name };

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

// ---------- Password reset ----------

const RESET_SENT =
  "If an account exists for that email, we've sent a link to reset the password. It expires in 60 minutes — check your spam folder too.";

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email").toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { error: "Please enter a valid email address.", email };

  const ip = await clientIp();
  const blocked = await resetBlocked(email, ip);
  if (blocked) return { error: blocked, email };
  await recordAttempt("reset", email, ip, true);

  const { rows } = await query<{ id: number; name: string }>(
    "SELECT id, name FROM users WHERE email = $1 AND disabled_at IS NULL",
    [email],
  );
  const user = rows[0];
  if (user) {
    const base = appUrl();
    if (!base) {
      console.error("[auth] APP_URL is not set; can't build a password reset link.");
    } else {
      const { token, minutes } = await createResetToken(user.id, "email");
      const message = passwordResetEmail({ name: user.name, link: `${base}/reset-password?token=${token}`, minutes });
      // Sent after the response, so the reply takes the same time whether or not the account exists
      after(() => sendEmail({ to: email, ...message }));
      await audit(user.id, "auth.reset_requested", { type: "user", id: user.id });
    }
  }
  // Same answer either way, so this form can't be used to find out who has an account
  return { ok: RESET_SENT };
}

export async function resetPassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const token = field(form, "token");
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const confirm = typeof form.get("confirm") === "string" ? (form.get("confirm") as string) : "";
  const pwError = passwordError(password, confirm);
  if (pwError) return { error: pwError };

  const result = await completeReset(token, password);
  if (!result.ok) return { error: result.error };

  const { rows } = await query<{ email: string }>("SELECT email FROM users WHERE id = $1", [result.userId]);
  // A successful reset clears any sign-in lockout for this address
  if (rows[0]) await recordAttempt("login", rows[0].email, await clientIp(), true);
  await audit(result.userId, "auth.password_reset", { type: "user", id: result.userId });
  await createSession(result.userId);
  redirect("/?password=reset");
}
