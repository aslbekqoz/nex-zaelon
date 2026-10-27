import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { db, query } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/email/send";
import { emailChangeConfirmMessage, emailChangeNotice } from "@/lib/email/templates";
import { EMAIL_CHANGE_TTL_HOURS, emailChangeProblem, maskEmail } from "./email-change";
import { looksLikeToken } from "./reset-token";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type PendingChange = { newEmail: string; createdAt: string; expiresAt: string };

export async function getPendingChange(userId: number): Promise<PendingChange | null> {
  const { rows } = await query<PendingChange>(
    `SELECT new_email AS "newEmail", created_at AS "createdAt", expires_at AS "expiresAt"
       FROM email_changes
      WHERE user_id = $1 AND used_at IS NULL AND cancelled_at IS NULL AND expires_at > now()
      ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Starts a change: the confirmation link goes to the new address, a security notice to the
 * current one. The account keeps its address until the new one is confirmed.
 */
export async function startEmailChange(user: { id: number; name: string; email: string }, newEmail: string) {
  const base = appUrl();
  if (!base) throw new Error("APP_URL is not set");
  const token = randomBytes(32).toString("base64url");
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE email_changes SET cancelled_at = now() WHERE user_id = $1 AND used_at IS NULL AND cancelled_at IS NULL",
      [user.id],
    );
    await client.query(
      `INSERT INTO email_changes (user_id, old_email, new_email, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, now() + make_interval(hours => $5))`,
      [user.id, user.email, newEmail, hashToken(token), EMAIL_CHANGE_TTL_HOURS],
    );
    await client.query("DELETE FROM email_changes WHERE expires_at < now() - interval '30 days'");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const confirm = emailChangeConfirmMessage({
    name: user.name,
    newEmail,
    link: `${base}/confirm-email-change?token=${token}`,
    hours: EMAIL_CHANGE_TTL_HOURS,
  });
  const notice = emailChangeNotice({ name: user.name, maskedNewEmail: maskEmail(newEmail), stage: "requested", resetUrl: `${base}/forgot-password` });
  after(async () => {
    await sendEmail({ to: newEmail, ...confirm });
    await sendEmail({ to: user.email, ...notice });
  });
}

export async function cancelEmailChange(userId: number) {
  const { rowCount } = await query(
    "UPDATE email_changes SET cancelled_at = now() WHERE user_id = $1 AND used_at IS NULL AND cancelled_at IS NULL",
    [userId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Completes a change from the link sent to the new address. In one transaction: switch the
 * address (it counts as confirmed), retire the request and any other pending ones, and make
 * reset and confirmation links sent to the old address stop working.
 */
export async function confirmEmailChange(token: unknown) {
  if (!looksLikeToken(token)) return { ok: false as const, error: "This confirmation link is invalid." };
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: number; user_id: number; name: string; old_email: string; new_email: string; current_email: string;
      expires_at: Date; used_at: Date | null; cancelled_at: Date | null;
    }>(
      `SELECT c.id, c.user_id, u.name, c.old_email, c.new_email, u.email AS current_email,
              c.expires_at, c.used_at, c.cancelled_at
         FROM email_changes c JOIN users u ON u.id = c.user_id
        WHERE c.token_hash = $1
        FOR UPDATE OF c, u`,
      [hashToken(token)],
    );
    const row = rows[0] ?? null;
    // Opening the link again after it worked shouldn't look like an error
    if (row?.used_at && row.current_email === row.new_email) {
      await client.query("ROLLBACK");
      return { ok: true as const, userId: row.user_id, email: row.new_email, already: true };
    }
    const problem = emailChangeProblem(
      row && { expiresAt: row.expires_at, usedAt: row.used_at, cancelledAt: row.cancelled_at, oldEmail: row.old_email, currentEmail: row.current_email },
      new Date(),
    );
    if (problem || !row) {
      await client.query("ROLLBACK");
      return { ok: false as const, error: problem ?? "This confirmation link is invalid." };
    }
    const taken = await client.query("SELECT 1 FROM users WHERE email = $1 AND id <> $2", [row.new_email, row.user_id]);
    if (taken.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false as const, error: "That email address is now used by another account." };
    }
    await client.query("UPDATE users SET email = $2, email_verified_at = now() WHERE id = $1", [row.user_id, row.new_email]);
    await client.query("UPDATE email_changes SET used_at = now() WHERE id = $1", [row.id]);
    await client.query(
      "UPDATE email_changes SET cancelled_at = now() WHERE user_id = $1 AND id <> $2 AND used_at IS NULL AND cancelled_at IS NULL",
      [row.user_id, row.id],
    );
    await client.query("UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [row.user_id]);
    await client.query("UPDATE email_verifications SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [row.user_id]);
    await client.query("COMMIT");

    const base = appUrl();
    if (base) {
      const notice = emailChangeNotice({ name: row.name, maskedNewEmail: maskEmail(row.new_email), stage: "completed", resetUrl: `${base}/forgot-password` });
      after(() => sendEmail({ to: row.old_email, ...notice }));
    }
    return { ok: true as const, userId: row.user_id, email: row.new_email, already: false, oldEmail: row.old_email };
  } catch (err) {
    await client.query("ROLLBACK");
    // The unique index caught a race with another account taking the address
    if ((err as { code?: string }).code === "23505") return { ok: false as const, error: "That email address is now used by another account." };
    throw err;
  } finally {
    client.release();
  }
}
