"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { audit } from "@/lib/audit";
import { AvatarError, processAvatar } from "@/lib/avatars/process";
import { deleteAvatar, saveAvatar } from "@/lib/avatars/repository";
import { db, query } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/email/send";
import { accountDeletedNotice, passwordChangedNotice, passwordResetEmail } from "@/lib/email/templates";
import { avatarUploadBlocked, clientIp, emailChangeBlocked, loginBlocked, recordAttempt, registerBlocked, resetBlocked, verifyResendBlocked } from "./attempts";
import { deleteAccount as deleteUserAccount } from "./account";
import { cancelEmailChange, startEmailChange } from "./change-email";
import { deleteAccountError } from "./delete-account";
import { newEmailError, normalizeEmail } from "./email-change";
import { nameError, normalizeName } from "./name";
import { passwordChangeError, passwordError } from "./password";
import { completeReset, createResetToken } from "./reset";
import { sendVerificationEmail } from "./verify";
import { createSession, destroySession, emailVerificationMode, getCurrentUser, needsEmailConfirmation, revokeSessions, safeNextPath } from "./session";

export type AuthState = { error?: string; ok?: string; email?: string; name?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so response time doesn't reveal whether an account exists
const DUMMY_HASH = bcrypt.hashSync("cinemind-timing-equaliser", 12);

function field(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  const name = normalizeName(field(form, "name"));
  const email = field(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const next = safeNextPath(form.get("next"));

  const badName = nameError(name);
  if (badName) return { error: badName, email, name };
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
  await sendVerificationEmail({ id: rows[0].id, name, email });
  // New accounts start with taste onboarding unless they were heading somewhere specific
  const destination = next === "/" ? "/onboarding" : next;
  // When confirmation is required, they first confirm their email, then continue there
  redirect(emailVerificationMode() === "required" ? `/confirm-email?next=${encodeURIComponent(destination)}` : destination);
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

// ---------- Email verification ----------

export async function resendVerification(_prev: AuthState): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  if (user.emailVerified) return { ok: "Your email is already confirmed." };
  const blocked = await verifyResendBlocked(user.email);
  if (blocked) return { error: blocked };
  await recordAttempt("verify", user.email, await clientIp(), true);
  const sent = await sendVerificationEmail(user);
  if (!sent) return { error: "Email isn't set up on this site yet. Please contact the administrator." };
  await audit(user.id, "auth.verify_resent", { type: "user", id: user.id });
  return { ok: `We've sent a new confirmation link to ${user.email}. It expires in 48 hours.` };
}

// ---------- Changing the account email ----------

export async function requestEmailChange(_prev: AuthState, form: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  const newEmail = normalizeEmail(field(form, "email"));
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const invalid = newEmailError(user.email, newEmail);
  if (invalid) return { error: invalid, email: newEmail };

  // The password check shares the sign-in lockout, so this form can't be used to guess passwords
  const ip = await clientIp();
  const locked = await loginBlocked(user.email, ip);
  if (locked) return { error: locked, email: newEmail };
  const { rows } = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  const ok = Boolean(rows[0]) && (await bcrypt.compare(password, rows[0].password_hash));
  await recordAttempt("login", user.email, ip, ok);
  if (!ok) return { error: "Your current password is incorrect.", email: newEmail };

  const blocked = await emailChangeBlocked(user.email);
  if (blocked) return { error: blocked, email: newEmail };
  const taken = await query("SELECT 1 FROM users WHERE email = $1", [newEmail]);
  if (taken.rowCount) return { error: "That email address is already used by another account.", email: newEmail };
  if (!appUrl()) return { error: "Email isn't set up on this site yet. Please contact the administrator.", email: newEmail };

  await recordAttempt("email_change", user.email, ip, true);
  await startEmailChange(user, newEmail);
  await audit(user.id, "auth.email_change_requested", { type: "user", id: user.id }, { to: newEmail });
  return { ok: `We've sent a confirmation link to ${newEmail}. Your address changes once you open it (within 24 hours).` };
}

export async function cancelPendingEmailChange() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Faccount");
  if (await cancelEmailChange(user.id)) await audit(user.id, "auth.email_change_cancelled", { type: "user", id: user.id });
  redirect("/account");
}

// ---------- Changing the password while signed in ----------

export async function changePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  const str = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  const current = str("current");
  const next = str("password");
  const invalid = passwordChangeError(current, next, str("confirm"));
  if (invalid) return { error: invalid };

  // Wrong current passwords share the sign-in lockout, so this form can't be used to guess
  const ip = await clientIp();
  const locked = await loginBlocked(user.email, ip);
  if (locked) return { error: locked };
  const { rows } = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  const ok = Boolean(rows[0]) && (await bcrypt.compare(current, rows[0].password_hash));
  await recordAttempt("login", user.email, ip, ok);
  if (!ok) return { error: "Your current password is incorrect." };

  const hash = await bcrypt.hash(next, 12);
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, hash]);
    // Sign out every session (this one is replaced below) and retire unused reset links
    await client.query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
    await client.query("UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [user.id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  await createSession(user.id);
  await audit(user.id, "auth.password_changed", { type: "user", id: user.id });

  const base = appUrl();
  if (base) {
    const notice = passwordChangedNotice({ name: user.name, resetUrl: `${base}/forgot-password` });
    after(() => sendEmail({ to: user.email, ...notice }));
  }
  return { ok: "Your password has been changed. Other devices were signed out." };
}

// ---------- Changing the display name ----------

export async function changeName(_prev: AuthState, form: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  const name = normalizeName(field(form, "name"));
  const invalid = nameError(name);
  if (invalid) return { error: invalid, name };
  if (name === user.name) return { error: "That's already your name.", name };
  await query("UPDATE users SET name = $2 WHERE id = $1", [user.id, name]);
  await audit(user.id, "auth.name_changed", { type: "user", id: user.id }, { from: user.name, to: name });
  // The name appears in the header on every page
  revalidatePath("/", "layout");
  return { ok: "Your name has been updated.", name };
}

// ---------- Signed-in devices ----------

export async function signOutDevice(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const id = Number(form.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return;
  if (await revokeSessions(user.id, { id })) await audit(user.id, "auth.session_revoked", { type: "user", id: user.id });
  revalidatePath("/account");
}

export async function signOutOtherDevices() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const ended = await revokeSessions(user.id, "others");
  if (ended) await audit(user.id, "auth.other_sessions_revoked", { type: "user", id: user.id }, { sessions: ended });
  revalidatePath("/account");
}

// ---------- Deleting the account ----------

export async function deleteAccount(_prev: AuthState, form: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const invalid = deleteAccountError(password, field(form, "confirm"));
  if (invalid) return { error: invalid };

  // Wrong passwords share the sign-in lockout, so this form can't be used to guess
  const ip = await clientIp();
  const locked = await loginBlocked(user.email, ip);
  if (locked) return { error: locked };
  const { rows } = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  const ok = Boolean(rows[0]) && (await bcrypt.compare(password, rows[0].password_hash));
  await recordAttempt("login", user.email, ip, ok);
  if (!ok) return { error: "Your current password is incorrect." };

  const result = await deleteUserAccount(user.id, user.email);
  if (result === "last_admin") {
    return { error: "You're the only admin. Make someone else an admin before deleting your account." };
  }
  await destroySession();
  const notice = accountDeletedNotice({ name: user.name });
  after(() => sendEmail({ to: user.email, ...notice }));
  revalidatePath("/", "layout");
  redirect("/account/deleted");
}

// ---------- Profile picture ----------

export async function uploadAvatar(_prev: AuthState, form: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  if (needsEmailConfirmation(user)) return { error: "Confirm your email address before adding a picture." };
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a picture to upload." };
  const blocked = await avatarUploadBlocked(user.email);
  if (blocked) return { error: blocked };
  await recordAttempt("avatar", user.email, await clientIp(), true);

  let image: Buffer;
  try {
    image = await processAvatar(new Uint8Array(await file.arrayBuffer()));
  } catch (err) {
    if (err instanceof AvatarError) return { error: err.message };
    console.error("[avatar] processing failed:", err);
    return { error: "We couldn't process that picture. Try a different one." };
  }
  await saveAvatar(user.id, image);
  await audit(user.id, "auth.avatar_changed", { type: "user", id: user.id }, { bytes: image.byteLength });
  revalidatePath("/", "layout");
  return { ok: "Your profile picture has been updated." };
}

export async function removeAvatar(_prev: AuthState): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  if (await deleteAvatar(user.id)) await audit(user.id, "auth.avatar_removed", { type: "user", id: user.id });
  revalidatePath("/", "layout");
  return { ok: "Your profile picture has been removed." };
}
