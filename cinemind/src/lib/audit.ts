import "server-only";
import { query } from "@/lib/db";

export type AuditEntry = {
  id: number;
  actorName: string | null;
  actorEmail: string | null;
  /** True when the actor's account has since been deleted. */
  actorDeleted: boolean;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

/** Records who did what. Never pass passwords, tokens or full text bodies in details. */
export async function audit(
  actorId: number | null,
  action: string,
  target?: { type: string; id: string | number },
  details: Record<string, unknown> = {},
) {
  try {
    await query(
      "INSERT INTO audit_log (actor_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)",
      [actorId, action, target?.type ?? null, target ? String(target.id) : null, JSON.stringify(details)],
    );
  } catch (err) {
    // Auditing must never break the action itself
    console.error("[audit] failed to record", action, err);
  }
}

export async function listAudit(filter: { action?: string; actorId?: number; before?: number; limit?: number } = {}) {
  const { rows } = await query<AuditEntry>(
    `SELECT a.id, u.name AS "actorName", u.email AS "actorEmail", a.actor_deleted AS "actorDeleted", a.action, a.target_type AS "targetType",
            a.target_id AS "targetId", a.details, a.created_at AS "createdAt"
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
      WHERE ($1::text IS NULL OR a.action LIKE $1 || '%')
        AND ($2::bigint IS NULL OR a.actor_id = $2)
        AND ($3::bigint IS NULL OR a.id < $3)
      ORDER BY a.id DESC
      LIMIT $4`,
    [filter.action ?? null, filter.actorId ?? null, filter.before ?? null, filter.limit ?? 100],
  );
  return rows;
}
