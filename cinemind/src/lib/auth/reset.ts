import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, query } from "@/lib/db";
import { ADMIN_RESET_TTL_MINUTES, looksLikeToken, RESET_TTL_MINUTES, resetProblem } from "./reset-token";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a one-time reset token for a user; any older unused tokens stop working. */
export async function createResetToken(userId: number, via: "email" | "admin") {
  const token = randomBytes(32).toString("base64url");
  const minutes = via === "admin" ? ADMIN_RESET_TTL_MINUTES : RESET_TTL_MINUTES;
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [userId]);
    await client.query(
      `INSERT INTO password_resets (user_id, token_hash, created_via, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
      [userId, hashToken(token), via, minutes],
    );
    // Housekeeping: old tokens are useless
    await client.query("DELETE FROM password_resets WHERE expires_at < now() - interval '7 days'");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return { token, minutes };
}

async function loadReset(token: string) {
  const { rows } = await query<{ id: number; user_id: number; name: string; expires_at: Date; used_at: Date | null; disabled: boolean }>(
    `SELECT r.id, r.user_id, u.name, r.expires_at, r.used_at, u.disabled_at IS NOT NULL AS disabled
       FROM password_resets r JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = $1`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

/** Returns the account a reset link belongs to, or the reason it can't be used. */
export async function checkResetToken(token: unknown) {
  if (!looksLikeToken(token)) return { ok: false as const, error: "This reset link is invalid." };
  const row = await loadReset(token);
  const problem = resetProblem(row && { expiresAt: row.expires_at, usedAt: row.used_at, userDisabled: row.disabled }, new Date());
  if (problem || !row) return { ok: false as const, error: problem ?? "This reset link is invalid." };
  return { ok: true as const, userId: row.user_id, name: row.name };
}

/**
 * Sets the new password and uses up the token in one transaction. Every existing session is
 * signed out. The token row is locked so the same link can't be used twice concurrently.
 */
export async function completeReset(token: string, password: string) {
  const hash = await bcrypt.hash(password, 12);
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number; user_id: number; expires_at: Date; used_at: Date | null; disabled: boolean }>(
      `SELECT r.id, r.user_id, r.expires_at, r.used_at, u.disabled_at IS NOT NULL AS disabled
         FROM password_resets r JOIN users u ON u.id = r.user_id
        WHERE r.token_hash = $1
        FOR UPDATE OF r`,
      [hashToken(token)],
    );
    const row = rows[0] ?? null;
    const problem = resetProblem(row && { expiresAt: row.expires_at, usedAt: row.used_at, userDisabled: row.disabled }, new Date());
    if (problem || !row) {
      await client.query("ROLLBACK");
      return { ok: false as const, error: problem ?? "This reset link is invalid." };
    }
    // Opening the reset link proves the user reads this inbox, so the address counts as confirmed
    await client.query(
      "UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1",
      [row.user_id, hash],
    );
    await client.query("UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [row.user_id]);
    await client.query("DELETE FROM sessions WHERE user_id = $1", [row.user_id]);
    await client.query("COMMIT");
    return { ok: true as const, userId: row.user_id };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
