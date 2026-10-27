import Link from "next/link";
import { Backdrop } from "@/components/Backdrop";
import { GenreChips } from "@/components/GenreChips";
import { MovieRow } from "@/components/MovieCard";
import { getCurrentUser } from "@/lib/auth/session";
import { listGenres, listMovies } from "@/lib/movies/repository";
import { displayTitle } from "@/lib/movies/types";
import { getRecommendations } from "@/lib/recommend/service";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [popular, topRated, scifi, drama, animation, genres, forYou] = await Promise.all([
    listMovies({ sort: "popular", limit: 16 }),
    listMovies({ sort: "rating", ratedOnly: true, limit: 16 }),
    listMovies({ genreSlug: "science-fiction", limit: 16 }),
    listMovies({ genreSlug: "drama", limit: 16 }),
    listMovies({ genreSlug: "animation", limit: 16 }),
    listGenres(),
    user ? getRecommendations({ userId: user.id, limit: 16 }) : null,
  ]);
  const personal = forYou?.personalised ? forYou.items : [];

  const featured = popular.find((m) => m.backdropUrl) ?? popular[0];

  return (
    <>
      <section className="hero">
        <Backdrop
          url={featured?.backdropUrl ?? null}
          fallbackStyle={{ background: "radial-gradient(1200px 500px at 70% 10%, #3a2a05, transparent), radial-gradient(900px 500px at 10% 90%, #2b0f2e, transparent), #0b0c10" }}
        />
        <div className="container">
          <div className="hero-content">
            <div className="eyebrow">{featured ? "Featured" : "CineMind AI"}</div>
            {featured ? (
              <>
                <h1>{displayTitle(featured)}</h1>
                <div className="meta-row" style={{ marginBottom: 14 }}>
                  {featured.rating ? <span className="rating">★ {featured.rating.toFixed(1)}</span> : null}
                  {featured.year ? <span>{featured.year}</span> : null}
                  {featured.genres.slice(0, 3).map((g) => (
                    <span key={g.id}>{g.name}</span>
                  ))}
                </div>
                <p>{featured.overview || featured.overviewUz}</p>
                <div className="hero-actions">
                  <Link href={`/movies/${featured.id}`} className="btn btn-primary btn-lg">
                    Details
                  </Link>
                  <Link href="/search" className="btn btn-lg">
                    Browse all movies
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1>The catalogue is empty</h1>
                <p>
                  Run <code>npm run db:setup</code> to add the starter movies.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {genres.length ? (
        <section className="section">
          <div className="container">
            <GenreChips genres={genres} />
          </div>
        </section>
      ) : null}

      <MovieRow
        title="Recommended for you"
        movies={personal.map((i) => i.movie)}
        notes={new Map(personal.map((i) => [i.movie.id, i.reasons.slice(0, 1)]))}
        href="/recommendations"
      />
      <MovieRow title="Popular" movies={popular} href="/search?sort=popular" />
      <MovieRow title="Top rated" movies={topRated} href="/search?sort=rating" />
      <MovieRow title="Science fiction" movies={scifi} href="/search?genre=science-fiction" />
      <MovieRow title="Drama" movies={drama} href="/search?genre=drama" />
      <MovieRow title="Animation" movies={animation} href="/search?genre=animation" />
    </>
  );
}
