import Link from "next/link";
import type { Movie } from "@/lib/movies/types";
import { displayTitle } from "@/lib/movies/types";
import { Poster } from "./Poster";

export function MovieCard({ movie, notes }: { movie: Movie; notes?: string[] }) {
  const sub = [movie.year, movie.genres[0]?.name].filter(Boolean).join(" · ");
  return (
    <Link href={`/movies/${movie.id}`} className="card">
      <Poster movie={movie} />
      <div>
        <div className="card-title">{displayTitle(movie)}</div>
        {sub ? <div className="card-sub">{sub}</div> : null}
        {notes?.map((n) => (
          <div key={n} className="card-note">
            {n}
          </div>
        ))}
      </div>
    </Link>
  );
}

export function MovieRow({
  title,
  movies,
  href,
  notes,
}: {
  title: string;
  movies: Movie[];
  href?: string;
  notes?: Map<number, string[]>;
}) {
  if (!movies.length) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          {href ? <Link href={href}>See all →</Link> : null}
        </div>
        <div className="row">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} notes={notes?.get(m.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function MovieGrid({ movies, notes }: { movies: Movie[]; notes?: Map<number, string[]> }) {
  return (
    <div className="grid">
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} notes={notes?.get(m.id)} />
      ))}
    </div>
  );
}
