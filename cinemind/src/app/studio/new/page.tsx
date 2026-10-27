import type { Metadata } from "next";
import Link from "next/link";
import { NewDraftForm } from "@/components/studio/NewDraftForm";
import { listMovies, searchMovies } from "@/lib/movies/repository";
import { MOODS } from "@/lib/recommend/moods";
import { KINDS, listTemplates } from "@/lib/studio/repository";

export const metadata: Metadata = { title: "New draft" };

type Props = { searchParams: Promise<{ kind?: string; q?: string }> };

export default async function NewDraftPage({ searchParams }: Props) {
  const sp = await searchParams;
  const kind = KINDS.find((k) => k.value === sp.kind);
  if (!kind) {
    return (
      <div className="kind-cards">
        {KINDS.map((k) => (
          <Link key={k.value} href={`/studio/new?kind=${k.value}`} className="kind-card">
            <strong>{k.label}</strong>
            <span>{k.description}</span>
          </Link>
        ))}
      </div>
    );
  }
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const [movies, templates] = await Promise.all([
    q ? searchMovies({ q }).then((r) => r.movies) : listMovies({ sort: "popular", limit: 24 }),
    listTemplates({ kind: kind.value }),
  ]);

  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}>
        <h2>New {kind.label.toLowerCase()}</h2>
        <Link href="/studio/new">Change type</Link>
      </div>
      <form action="/studio/new" className="search-form" role="search" style={{ gridTemplateColumns: "1fr auto" }}>
        <input type="hidden" name="kind" value={kind.value} />
        <label className="sr-only" htmlFor="q">
          Find a movie
        </label>
        <input id="q" name="q" className="input" defaultValue={q} placeholder="Find a movie by English or Uzbek title…" />
        <button className="btn">Search</button>
      </form>
      <NewDraftForm kind={kind.value} movies={movies} templates={templates} moods={MOODS} initialLanguage="uz" />
    </>
  );
}
