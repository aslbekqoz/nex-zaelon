import type { Metadata } from "next";
import Link from "next/link";
import { GenreChips } from "@/components/GenreChips";
import { MovieGrid } from "@/components/MovieCard";
import { listGenres, searchMovies } from "@/lib/movies/repository";
import { importFromSearch } from "@/lib/movies/sync";
import { tmdbEnabled } from "@/lib/movies/tmdb";
import type { SortKey } from "@/lib/movies/types";

export const metadata: Metadata = { title: "Filmlar" };

const SORTS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Mashhurligi" },
  { value: "rating", label: "Reytingi" },
  { value: "newest", label: "Eng yangilari" },
  { value: "title", label: "Nomi (A–Z)" },
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

  // TMDB ulangan bo'lsa, avval yangi topilgan filmlarni katalogga qo'shamiz
  if (q && page === 1) await importFromSearch(q);

  const [{ movies, total, pages }, genres] = await Promise.all([
    searchMovies({ q, genre, sort, page }),
    listGenres(),
  ]);
  const activeGenre = genres.find((g) => g.slug === genre);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (genre) params.set("genre", genre);
    if (sort !== "popular") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    return `/search?${params}`;
  };

  return (
    <div className="container">
      <div className="page-head">
        <h1>{q ? `“${q}” bo'yicha natijalar` : activeGenre ? activeGenre.nameUz : "Barcha filmlar"}</h1>
      </div>

      <form className="search-form" action="/search" role="search">
        <label className="sr-only" htmlFor="q">
          Film nomi
        </label>
        <input
          id="q"
          name="q"
          className="input"
          defaultValue={q}
          placeholder="Masalan: Yulduzlararo, Inception, Parazit…"
          autoComplete="off"
        />
        {genre ? <input type="hidden" name="genre" value={genre} /> : null}
        <label className="sr-only" htmlFor="sort">
          Saralash
        </label>
        <select id="sort" name="sort" className="select" defaultValue={sort}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Qidirish
        </button>
      </form>

      <GenreChips genres={genres} active={genre} q={q} />

      <p className="result-info">
        {total} ta film topildi
        {q && !tmdbEnabled() ? " · hozircha faqat mahalliy katalogdan qidirilmoqda" : ""}
      </p>

      {movies.length ? (
        <MovieGrid movies={movies} />
      ) : (
        <div className="empty">
          <h2>Hech narsa topilmadi</h2>
          <p>Boshqa nom bilan qidirib ko&apos;ring yoki janr filtrini olib tashlang.</p>
          <Link href="/search" className="btn" style={{ marginTop: 12 }}>
            Filtrlarni tozalash
          </Link>
        </div>
      )}

      {pages > 1 ? (
        <nav className="pagination" aria-label="Sahifalar">
          {page > 1 ? (
            <Link className="btn btn-sm" href={pageHref(page - 1)}>
              ← Oldingi
            </Link>
          ) : null}
          <span className="muted">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link className="btn btn-sm" href={pageHref(page + 1)}>
              Keyingi →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
