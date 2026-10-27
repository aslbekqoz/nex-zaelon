import Link from "next/link";
import type { Genre } from "@/lib/movies/types";

/** `keep` holds other search params (query, sort, filters) to carry over when switching genre. */
export function GenreChips({ genres, active, keep = {} }: { genres: Genre[]; active?: string; keep?: Record<string, string> }) {
  const href = (slug?: string) => {
    const p = new URLSearchParams(keep);
    if (slug) p.set("genre", slug);
    const s = p.toString();
    return s ? `/search?${s}` : "/search";
  };
  return (
    <nav className="chips" aria-label="Genres">
      <Link href={href()} className={`chip${!active ? " active" : ""}`}>
        All
      </Link>
      {genres.map((g) => (
        <Link key={g.id} href={href(g.slug)} className={`chip${active === g.slug ? " active" : ""}`}>
          {g.name}
        </Link>
      ))}
    </nav>
  );
}
