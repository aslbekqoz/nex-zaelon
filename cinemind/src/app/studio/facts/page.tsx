import type { Metadata } from "next";
import Link from "next/link";
import { FactForm } from "@/components/studio/FactForm";
import { query } from "@/lib/db";
import { deleteFact, reviewFact } from "@/lib/studio/actions";
import { listFacts, type FactStatus } from "@/lib/studio/repository";

export const metadata: Metadata = { title: "Facts" };

type Props = { searchParams: Promise<{ status?: string; movie?: string }> };

const STATUSES: { value?: FactStatus; label: string }[] = [
  { label: "All" },
  { value: "unverified", label: "Needs review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

export default async function FactsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s.value && s.value === sp.status)?.value;
  const movieId = Number(sp.movie) || undefined;
  const [facts, movies] = await Promise.all([
    listFacts({ status, movieId }),
    query<{ id: number; title: string }>("SELECT id, title FROM movies ORDER BY title LIMIT 5000"),
  ]);
  const movieName = movieId ? movies.rows.find((m) => m.id === movieId)?.title : undefined;
  const href = (s?: FactStatus) => {
    const q = new URLSearchParams();
    if (s) q.set("status", s);
    if (movieId) q.set("movie", String(movieId));
    return `/studio/facts${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <p className="muted" style={{ maxWidth: 760 }}>
        Every fact needs a source link. New facts start as <b>unverified</b>; open the source, check it says what the fact
        says, then mark it <b>verified</b>. Only verified facts are used in generated posts.
      </p>

      <FactForm movies={movies.rows} movieId={movieId} />

      <div className="filter-row">
        <div className="chips">
          {STATUSES.map((s) => (
            <Link key={s.label} href={href(s.value)} className={`chip${status === s.value ? " active" : ""}`}>
              {s.label}
            </Link>
          ))}
        </div>
        {movieName ? (
          <Link href={status ? `/studio/facts?status=${status}` : "/studio/facts"} className="chip active">
            {movieName} ✕
          </Link>
        ) : null}
      </div>

      {facts.length ? (
        <ul className="fact-list">
          {facts.map((f) => (
            <li key={f.id} className={`fact fact-${f.status}`}>
              <div className="fact-head">
                <Link href={`/studio/facts?movie=${f.movieId}`} className="badge link">
                  {f.movieTitle}
                </Link>
                <span className="badge">{f.language.toUpperCase()}</span>
                <span className={`badge status-${f.status}`}>
                  {f.status === "verified" ? "✓ Verified" : f.status === "rejected" ? "✕ Rejected" : "Needs review"}
                </span>
                {f.reviewedByName ? <span className="faint">by {f.reviewedByName}</span> : null}
              </div>
              <p lang={f.language}>{f.text}</p>
              <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="source">
                {f.sourceTitle ? `${f.sourceTitle} — ` : ""}
                {f.sourceUrl}
              </a>
              {f.reviewNote ? <p className="faint">Note: {f.reviewNote}</p> : null}
              <div className="fact-actions">
                <form action={reviewFact} className="tool-row">
                  <input type="hidden" name="id" value={f.id} />
                  <input name="note" className="input input-sm" placeholder="Review note (optional)" maxLength={300} />
                  {f.status !== "verified" ? (
                    <button name="status" value="verified" className="btn btn-sm btn-primary">
                      Mark verified
                    </button>
                  ) : null}
                  {f.status !== "rejected" ? (
                    <button name="status" value="rejected" className="btn btn-sm">
                      Reject
                    </button>
                  ) : null}
                  {f.status !== "unverified" ? (
                    <button name="status" value="unverified" className="btn btn-sm btn-ghost">
                      Reset
                    </button>
                  ) : null}
                </form>
                <form action={deleteFact}>
                  <input type="hidden" name="id" value={f.id} />
                  <button className="btn btn-sm btn-ghost danger">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <h2>No facts here yet</h2>
          <p>Add one above, with the link where you found it.</p>
        </div>
      )}
    </>
  );
}
