import "server-only";
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { evaluateLimit, evaluateVolume, retryMessage, type Attempt } from "./rate-limit";

const LOGIN_PER_EMAIL = { max: 5, windowMs: 15 * 60_000 };
const LOGIN_PER_IP = { max: 20, windowMs: 15 * 60_000 };
const REGISTER_PER_IP = { max: 5, windowMs: 60 * 60_000 };
const RESET_PER_EMAIL = { max: 3, windowMs: 60 * 60_000 };
const RESET_PER_IP = { max: 10, windowMs: 60 * 60_000 };
const VERIFY_PER_EMAIL = { max: 3, windowMs: 60 * 60_000 };
const EMAIL_CHANGE_PER_ACCOUNT = { max: 3, windowMs: 60 * 60_000 };
const AVATAR_PER_ACCOUNT = { max: 10, windowMs: 60 * 60_000 };
const REVIEW_PER_ACCOUNT = { max: 20, windowMs: 60 * 60_000 };

/**
 * Client IP, only when TRUST_PROXY_HEADERS=1 (i.e. behind a proxy that sets X-Forwarded-For).
 * Otherwise these headers could be forged by anyone, so IP-based limits are skipped and only
 * the per-email limit applies.
 */
export async function clientIp(): Promise<string | null> {
  if (process.env.TRUST_PROXY_HEADERS !== "1") return null;
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || null;
}

type Kind = "login" | "register" | "reset" | "verify" | "email_change" | "avatar" | "review";

async function recent(column: "email" | "ip", value: string, kind: Kind, windowMs: number) {
  const { rows } = await query<{ success: boolean; at: Date }>(
    `SELECT success, created_at AS at FROM auth_attempts
      WHERE ${column} = $1 AND kind = $2 AND created_at > now() - make_interval(secs => $3)
      ORDER BY created_at DESC LIMIT 200`,
    [value, kind, windowMs / 1000],
  );
  return rows as Attempt[];
}

/** Returns an error message when sign-in should be refused, otherwise null. */
export async function loginBlocked(email: string, ip: string | null) {
  const now = new Date();
  const byEmail = evaluateLimit(await recent("email", email, "login", LOGIN_PER_EMAIL.windowMs), now, LOGIN_PER_EMAIL);
  if (byEmail.blocked) return retryMessage(byEmail.retryAfterMs);
  if (ip) {
    const byIp = evaluateLimit(await recent("ip", ip, "login", LOGIN_PER_IP.windowMs), now, LOGIN_PER_IP);
    if (byIp.blocked) return retryMessage(byIp.retryAfterMs);
  }
  return null;
}

export async function registerBlocked(ip: string | null) {
  if (!ip) return null;
  const r = evaluateVolume(await recent("ip", ip, "register", REGISTER_PER_IP.windowMs), new Date(), REGISTER_PER_IP);
  return r.blocked ? retryMessage(r.retryAfterMs) : null;
}

/** Limits how often reset emails can be requested, per address and (behind a proxy) per IP. */
export async function resetBlocked(email: string, ip: string | null) {
  const now = new Date();
  const byEmail = evaluateVolume(await recent("email", email, "reset", RESET_PER_EMAIL.windowMs), now, RESET_PER_EMAIL);
  if (byEmail.blocked) return retryMessage(byEmail.retryAfterMs);
  if (ip) {
    const byIp = evaluateVolume(await recent("ip", ip, "reset", RESET_PER_IP.windowMs), now, RESET_PER_IP);
    if (byIp.blocked) return retryMessage(byIp.retryAfterMs);
  }
  return null;
}

/** Limits "resend confirmation email" per address. */
export async function verifyResendBlocked(email: string) {
  const r = evaluateVolume(await recent("email", email, "verify", VERIFY_PER_EMAIL.windowMs), new Date(), VERIFY_PER_EMAIL);
  return r.blocked ? retryMessage(r.retryAfterMs) : null;
}

/** Limits email change requests per account (keyed by the account's current address). */
export async function emailChangeBlocked(email: string) {
  const r = evaluateVolume(await recent("email", email, "email_change", EMAIL_CHANGE_PER_ACCOUNT.windowMs), new Date(), EMAIL_CHANGE_PER_ACCOUNT);
  return r.blocked ? retryMessage(r.retryAfterMs) : null;
}

/** Limits profile picture uploads per account; processing images is relatively expensive. */
export async function avatarUploadBlocked(email: string) {
  const r = evaluateVolume(await recent("email", email, "avatar", AVATAR_PER_ACCOUNT.windowMs), new Date(), AVATAR_PER_ACCOUNT);
  return r.blocked ? retryMessage(r.retryAfterMs) : null;
}

/** Writing and editing reviews, per account. */
export async function reviewBlocked(email: string) {
  const r = evaluateVolume(await recent("email", email, "review", REVIEW_PER_ACCOUNT.windowMs), new Date(), REVIEW_PER_ACCOUNT);
  return r.blocked ? retryMessage(r.retryAfterMs) : null;
}

export async function recordAttempt(kind: Kind, email: string | null, ip: string | null, success: boolean) {
  await query("INSERT INTO auth_attempts (kind, email, ip, success) VALUES ($1, $2, $3, $4)", [kind, email, ip, success]);
  // Keep the table small: attempts only matter for a short window
  if (Math.random() < 0.05) await query("DELETE FROM auth_attempts WHERE created_at < now() - interval '1 day'");
}
