import Link from "next/link";
import type { ContentKind } from "@/lib/studio/context";
import { KINDS, kindLabel, listDrafts, type DraftStatus } from "@/lib/studio/repository";

type Props = { searchParams: Promise<{ kind?: string; status?: string }> };

const STATUSES: { value: DraftStatus | "active" | "all"; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "ready", label: "Ready" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

function dateLabel(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function StudioHome({ searchParams }: Props) {
  const sp = await searchParams;
  const kind = KINDS.find((k) => k.value === sp.kind)?.value;
  const status = STATUSES.find((s) => s.value === sp.status)?.value ?? "active";
  const drafts = await listDrafts({ kind, status });
  const href = (p: { kind?: ContentKind; status?: string }) => {
    const q = new URLSearchParams();
    const k = "kind" in p ? p.kind : kind;
    const s = "status" in p ? p.status : status;
    if (k) q.set("kind", k);
    if (s && s !== "active") q.set("status", s);
    return `/studio${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <div className="kind-cards">
        {KINDS.map((k) => (
          <Link key={k.value} href={`/studio/new?kind=${k.value}`} className="kind-card">
            <strong>+ {k.label}</strong>
            <span>{k.description}</span>
          </Link>
        ))}
      </div>

      <div className="filter-row">
        <div className="chips">
          <Link href={href({ kind: undefined })} className={`chip${!kind ? " active" : ""}`}>
            All types
          </Link>
          {KINDS.map((k) => (
            <Link key={k.value} href={href({ kind: k.value })} className={`chip${kind === k.value ? " active" : ""}`}>
              {k.label}
            </Link>
          ))}
        </div>
        <div className="chips">
          {STATUSES.map((s) => (
            <Link key={s.value} href={href({ status: s.value })} className={`chip${status === s.value ? " active" : ""}`}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {drafts.length ? (
        <ul className="draft-list">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link href={`/studio/drafts/${d.id}`} className="draft-row">
                <div className="draft-main">
                  <strong>{d.title}</strong>
                  <span className="faint">{d.body.replace(/\*\*|_/g, "").slice(0, 120)}</span>
                </div>
                <div className="draft-meta">
                  <span className="badge">{kindLabel(d.kind)}</span>
                  <span className="badge">{d.language.toUpperCase()}</span>
                  <span className={`badge status-${d.status}`}>{d.status === "ready" ? "Ready" : d.status === "archived" ? "Archived" : "Draft"}</span>
                  <span className="faint">
                    {dateLabel(d.updatedAt)}
                    {d.updatedByName ? ` · ${d.updatedByName}` : ""}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <h2>No drafts here yet</h2>
          <p>Create a movie card, description, weekly collection or facts post above.</p>
        </div>
      )}
    </>
  );
}
