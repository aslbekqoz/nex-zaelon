import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { searchMovies } from "@/lib/movies/repository";

export const metadata: Metadata = { title: "Movies" };

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminMoviesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { movies, total, pages } = await searchMovies({ q, sort: q ? "popular" : "title", page });
  const { rows: meta } = await query<{ id: number; source: string; sync_locked: boolean; missing_uz: boolean }>(
    `SELECT id, source, sync_locked, (title_uz IS NULL OR overview_uz IS NULL) AS missing_uz
       FROM movies WHERE id = ANY($1::bigint[])`,
    [movies.map((m) => m.id)],
  );
  const info = new Map(meta.map((r) => [r.id, r]));
  const href = (p: number) => `/admin/movies?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}>
        <h2>Movies</h2>
        <Link href="/admin/movies/new" className="btn btn-sm btn-primary">
          + Add movie
        </Link>
      </div>
      <form className="search-form" action="/admin/movies" style={{ gridTemplateColumns: "1fr auto" }}>
        <label className="sr-only" htmlFor="q">
          Search movies
        </label>
        <input id="q" name="q" className="input" defaultValue={q} placeholder="Search by English, original or Uzbek title…" />
        <button className="btn">Search</button>
      </form>
      <p className="result-info">{total} movies</p>
      <ul className="draft-list">
        {movies.map((m) => {
          const i = info.get(m.id);
          return (
            <li key={m.id}>
              <Link href={`/admin/movies/${m.id}`} className="draft-row">
                <div className="draft-main">
                  <strong>
                    {m.title} {m.year ? <span className="faint">({m.year})</span> : null}
                  </strong>
                  <span className="faint">{[m.titleUz, m.director].filter(Boolean).join(" · ") || "—"}</span>
                </div>
                <div className="draft-meta">
                  <span className="badge">{i?.source === "tmdb" ? "TMDB" : i?.source === "seed" ? "Starter" : "Manual"}</span>
                  {i?.sync_locked ? <span className="badge">🔒 Edited</span> : null}
                  {i?.missing_uz ? <span className="badge status-unverified">Uzbek missing</span> : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {pages > 1 ? (
        <nav className="pagination" aria-label="Pagination">
          {page > 1 ? <Link className="btn btn-sm" href={href(page - 1)}>← Previous</Link> : null}
          <span className="muted">
            {page} / {pages}
          </span>
          {page < pages ? <Link className="btn btn-sm" href={href(page + 1)}>Next →</Link> : null}
        </nav>
      ) : null}
    </>
  );
}
