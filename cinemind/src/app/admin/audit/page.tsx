import type { Metadata } from "next";
import Link from "next/link";
import { AuditTable } from "@/components/admin/AuditTable";
import { listAudit } from "@/lib/audit";

export const metadata: Metadata = { title: "Audit log" };

const GROUPS = [
  { value: "", label: "Everything" },
  { value: "user.", label: "Users" },
  { value: "movie.", label: "Movies" },
  { value: "draft.", label: "Drafts" },
  { value: "template.", label: "Templates" },
  { value: "fact.", label: "Facts" },
  { value: "brand.", label: "Brand" },
  { value: "auth.", label: "Sign-ins" },
];
const PAGE = 100;

type Props = { searchParams: Promise<{ action?: string; before?: string }> };

export default async function AuditPage({ searchParams }: Props) {
  const sp = await searchParams;
  const group = GROUPS.find((g) => g.value && g.value === sp.action)?.value ?? "";
  const before = Number(sp.before) || undefined;
  const entries = await listAudit({ action: group || undefined, before, limit: PAGE });
  const href = (p: { action?: string; before?: number }) => {
    const q = new URLSearchParams();
    const a = "action" in p ? p.action : group;
    if (a) q.set("action", a);
    if (p.before) q.set("before", String(p.before));
    return `/admin/audit${q.size ? `?${q}` : ""}`;
  };
  return (
    <>
      <div className="chips" style={{ margin: "8px 0 18px" }}>
        {GROUPS.map((g) => (
          <Link key={g.label} href={href({ action: g.value })} className={`chip${group === g.value ? " active" : ""}`}>
            {g.label}
          </Link>
        ))}
      </div>
      <section className="card-panel">
        <AuditTable entries={entries} />
      </section>
      <nav className="pagination" aria-label="Pagination">
        {before ? <Link className="btn btn-sm" href={href({})}>Newest</Link> : null}
        {entries.length === PAGE ? (
          <Link className="btn btn-sm" href={href({ before: entries.at(-1)!.id })}>
            Older →
          </Link>
        ) : null}
      </nav>
    </>
  );
}
