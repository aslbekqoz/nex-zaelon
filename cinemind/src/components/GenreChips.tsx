import Link from "next/link";
import type { Genre } from "@/lib/movies/types";

export function GenreChips({ genres, active, q }: { genres: Genre[]; active?: string; q?: string }) {
  const href = (slug?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
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
