import type { Metadata } from "next";
import Link from "next/link";
import { GenreChips } from "@/components/GenreChips";
import { MovieGrid } from "@/components/MovieCard";
import { filterParams, hasFilters, languageName, parseFilters, RATING_STEPS } from "@/lib/movies/filters";
import { listGenres, listLanguages, searchMovies } from "@/lib/movies/repository";
import { importFromSearch } from "@/lib/movies/sync";
import { tmdbEnabled } from "@/lib/movies/tmdb";
import type { SortKey } from "@/lib/movies/types";

export const metadata: Metadata = { title: "Movies" };

const SORTS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title (A–Z)" },
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = one(sp.q)?.slice(0, 100);
  const genre = one(sp.genre);
  const sort = (SORTS.find((s) => s.value === one(sp.sort))?.value ?? "popular") as SortKey;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const filters = parseFilters(sp);

  // When TMDB is connected, first add newly found movies to the catalogue
  if (q && page === 1) await importFromSearch(q);

  const [{ movies, total, pages }, genres, languages] = await Promise.all([
    searchMovies({ q, genre, sort, page, ...filters }),
    listGenres(),
    listLanguages(),
  ]);
  // Params every link on this page carries over
  const keep: Record<string, string> = { ...(q ? { q } : {}), ...(sort !== "popular" ? { sort } : {}), ...filterParams(filters) };
  const filtersOn = hasFilters(filters);
  const activeGenre = genres.find((g) => g.slug === genre);

  const pageHref = (p: number) => {
    const params = new URLSearchParams(keep);
    if (genre) params.set("genre", genre);
    if (p > 1) params.set("page", String(p));
    return `/search?${params}`;
  };
  const clearParams = new URLSearchParams({ ...(q ? { q } : {}), ...(genre ? { genre } : {}), ...(sort !== "popular" ? { sort } : {}) });
  const clearFiltersHref = clearParams.size ? `/search?${clearParams}` : "/search";
  const thisYear = new Date().getFullYear();

  return (
    <div className="container">
      <div className="page-head">
        <h1>{q ? `Results for “${q}”` : activeGenre ? activeGenre.name : "All movies"}</h1>
      </div>

      <form className="search-form" action="/search" role="search">
        <label className="sr-only" htmlFor="q">
          Movie title
        </label>
        <input
          id="q"
          name="q"
          className="input"
          defaultValue={q}
          placeholder="e.g. Interstellar, Inception, Yulduzlararo…"
          autoComplete="off"
        />
        {genre ? <input type="hidden" name="genre" value={genre} /> : null}
        <label className="sr-only" htmlFor="sort">
          Sort by
        </label>
        <select id="sort" name="sort" className="select" defaultValue={sort}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        <details className="filters" open={filtersOn}>
          <summary>
            Filters{filtersOn ? <span className="filter-count"> · on</span> : null}
          </summary>
          <div className="filter-grid">
            <div className="field">
              <label htmlFor="from">From year</label>
              <input id="from" name="from" type="number" inputMode="numeric" min={1874} max={thisYear + 5} className="input" defaultValue={filters.yearFrom} placeholder="e.g. 1990" />
            </div>
            <div className="field">
              <label htmlFor="to">To year</label>
              <input id="to" name="to" type="number" inputMode="numeric" min={1874} max={thisYear + 5} className="input" defaultValue={filters.yearTo} placeholder={String(thisYear)} />
            </div>
            <div className="field">
              <label htmlFor="lang">Original language</label>
              <select id="lang" name="lang" className="select" defaultValue={filters.language ?? ""}>
                <option value="">Any language</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {languageName(l.code)} ({l.n})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rating">Minimum rating</label>
              <select id="rating" name="rating" className="select" defaultValue={filters.minRating ?? ""}>
                <option value="">Any rating</option>
                {RATING_STEPS.map((r) => (
                  <option key={r} value={r}>
                    ★ {r}+
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="tool-row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-sm btn-primary">
              Apply filters
            </button>
            {filtersOn ? (
              <Link href={clearFiltersHref} className="btn btn-sm btn-ghost">
                Clear filters
              </Link>
            ) : null}
          </div>
        </details>
      </form>

      <GenreChips genres={genres} active={genre} keep={keep} />

      <p className="result-info">
        {total} {total === 1 ? "movie" : "movies"} found
        {q && !tmdbEnabled() ? " · searching the local catalogue only" : ""}
        {filters.minRating ? " · movies without a rating are hidden by the rating filter" : ""}
      </p>

      {movies.length ? (
        <MovieGrid movies={movies} />
      ) : (
        <div className="empty">
          <h2>Nothing found</h2>
          <p>Try a different title, or remove a genre or filter.</p>
          <Link href="/search" className="btn" style={{ marginTop: 12 }}>
            Clear filters
          </Link>
        </div>
      )}

      {pages > 1 ? (
        <nav className="pagination" aria-label="Pagination">
          {page > 1 ? (
            <Link className="btn btn-sm" href={pageHref(page - 1)}>
              ← Previous
            </Link>
          ) : null}
          <span className="muted">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link className="btn btn-sm" href={pageHref(page + 1)}>
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
