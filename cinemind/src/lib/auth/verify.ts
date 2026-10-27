import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { db, query } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/email/send";
import { verifyEmailMessage } from "@/lib/email/templates";
import { looksLikeToken } from "./reset-token";
import { VERIFY_TTL_HOURS, verifyProblem } from "./verification";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a one-time confirmation link for the user's current address and emails it after the
 * response. Older unused links stop working. Returns false when APP_URL isn't configured.
 */
export async function sendVerificationEmail(user: { id: number; name: string; email: string }) {
  const base = appUrl();
  if (!base) {
    console.error("[auth] APP_URL is not set; can't build an email confirmation link.");
    return false;
  }
  const token = randomBytes(32).toString("base64url");
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE email_verifications SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [user.id]);
    await client.query(
      `INSERT INTO email_verifications (user_id, email, token_hash, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(hours => $4))`,
      [user.id, user.email, hashToken(token), VERIFY_TTL_HOURS],
    );
    await client.query("DELETE FROM email_verifications WHERE expires_at < now() - interval '7 days'");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const message = verifyEmailMessage({ name: user.name, link: `${base}/verify-email?token=${token}`, hours: VERIFY_TTL_HOURS });
  after(() => sendEmail({ to: user.email, ...message }));
  return true;
}

/** Confirms the address a link was sent to. Works without being signed in. */
export async function confirmEmail(token: unknown) {
  if (!looksLikeToken(token)) return { ok: false as const, error: "This confirmation link is invalid." };
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number; user_id: number; email: string; current_email: string; expires_at: Date; used_at: Date | null; verified: boolean }>(
      `SELECT v.id, v.user_id, v.email, u.email AS current_email, v.expires_at, v.used_at,
              u.email_verified_at IS NOT NULL AS verified
         FROM email_verifications v JOIN users u ON u.id = v.user_id
        WHERE v.token_hash = $1
        FOR UPDATE OF v`,
      [hashToken(token)],
    );
    const row = rows[0] ?? null;
    // Opening the link again after it worked shouldn't look like an error
    if (row?.used_at && row.verified && row.email.toLowerCase() === row.current_email.toLowerCase()) {
      await client.query("ROLLBACK");
      return { ok: true as const, userId: row.user_id, email: row.current_email, already: true };
    }
    const problem = verifyProblem(
      row && { expiresAt: row.expires_at, usedAt: row.used_at, linkEmail: row.email, currentEmail: row.current_email },
      new Date(),
    );
    if (problem || !row) {
      await client.query("ROLLBACK");
      return { ok: false as const, error: problem ?? "This confirmation link is invalid." };
    }
    await client.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1", [row.user_id]);
    await client.query("UPDATE email_verifications SET used_at = now() WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    return { ok: true as const, userId: row.user_id, email: row.current_email, already: false };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function isEmailVerified(userId: number) {
  const { rows } = await query<{ verified: boolean }>("SELECT email_verified_at IS NOT NULL AS verified FROM users WHERE id = $1", [userId]);
  return rows[0]?.verified ?? false;
}
