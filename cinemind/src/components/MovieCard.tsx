import Link from "next/link";
import type { Movie } from "@/lib/movies/types";
import { displayTitle } from "@/lib/movies/types";
import { Poster } from "./Poster";

export function MovieCard({ movie }: { movie: Movie }) {
  const sub = [movie.year, movie.genres[0]?.nameUz].filter(Boolean).join(" · ");
  return (
    <Link href={`/movies/${movie.id}`} className="card">
      <Poster movie={movie} />
      <div>
        <div className="card-title">{displayTitle(movie)}</div>
        {sub ? <div className="card-sub">{sub}</div> : null}
      </div>
    </Link>
  );
}

export function MovieRow({ title, movies, href }: { title: string; movies: Movie[]; href?: string }) {
  if (!movies.length) return null;
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          {href ? <Link href={href}>Hammasi →</Link> : null}
        </div>
        <div className="row">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid">
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} />
      ))}
    </div>
  );
}
