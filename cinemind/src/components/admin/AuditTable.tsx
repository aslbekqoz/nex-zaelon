import Link from "next/link";
import { describeAction, targetHref, when } from "@/app/admin/describe";
import type { AuditEntry } from "@/lib/audit";

function summary(details: Record<string, unknown>) {
  const parts = Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  return parts.join(" · ");
}

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <p className="muted">Nothing recorded yet.</p>;
  return (
    <ul className="audit-list">
      {entries.map((e) => {
        const href = targetHref(e.targetType, e.targetId);
        return (
          <li key={e.id}>
            <span className="faint audit-time">{when(e.createdAt)}</span>
            <span>
              <strong>{e.actorName ?? (e.actorEmail ? e.actorEmail : "System")}</strong> {describeAction(e.action)}
              {e.targetType ? (
                <>
                  {" "}
                  {href ? <Link href={href} className="audit-target">{`${e.targetType} #${e.targetId}`}</Link> : <span className="audit-target">{`${e.targetType} #${e.targetId}`}</span>}
                </>
              ) : null}
              {Object.keys(e.details).length ? <span className="faint"> — {summary(e.details)}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
