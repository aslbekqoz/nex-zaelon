import Link from "next/link";
import { GenreChips } from "@/components/GenreChips";
import { MovieRow } from "@/components/MovieCard";
import { listGenres, listMovies } from "@/lib/movies/repository";
import { displayTitle } from "@/lib/movies/types";

export default async function HomePage() {
  const [popular, topRated, scifi, drama, animation, genres] = await Promise.all([
    listMovies({ sort: "popular", limit: 16 }),
    listMovies({ sort: "rating", ratedOnly: true, limit: 16 }),
    listMovies({ genreSlug: "ilmiy-fantastika", limit: 16 }),
    listMovies({ genreSlug: "drama", limit: 16 }),
    listMovies({ genreSlug: "animatsiya", limit: 16 }),
    listGenres(),
  ]);

  const featured = popular.find((m) => m.backdropUrl) ?? popular[0];

  return (
    <>
      <section className="hero">
        <div
          className="hero-bg"
          style={
            featured?.backdropUrl
              ? { backgroundImage: `url(${featured.backdropUrl})` }
              : { background: "radial-gradient(1200px 500px at 70% 10%, #3a2a05, transparent), radial-gradient(900px 500px at 10% 90%, #2b0f2e, transparent), #0b0c10" }
          }
        />
        <div className="container">
          <div className="hero-content">
            <div className="eyebrow">{featured ? "Tavsiya etamiz" : "CineMind AI"}</div>
            {featured ? (
              <>
                <h1>{displayTitle(featured)}</h1>
                <div className="meta-row" style={{ marginBottom: 14 }}>
                  {featured.rating ? <span className="rating">★ {featured.rating.toFixed(1)}</span> : null}
                  {featured.year ? <span>{featured.year}</span> : null}
                  {featured.genres.slice(0, 3).map((g) => (
                    <span key={g.id}>{g.nameUz}</span>
                  ))}
                </div>
                <p>{featured.overviewUz || featured.overview}</p>
                <div className="hero-actions">
                  <Link href={`/movies/${featured.id}`} className="btn btn-primary btn-lg">
                    Batafsil
                  </Link>
                  <Link href="/search" className="btn btn-lg">
                    Barcha filmlar
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1>Katalog hali bo&apos;sh</h1>
                <p>
                  <code>npm run db:setup</code> buyrug&apos;i bilan boshlang&apos;ich filmlarni qo&apos;shing.
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

      <MovieRow title="Mashhur filmlar" movies={popular} href="/search?sort=popular" />
      <MovieRow title="Eng yuqori baholangan" movies={topRated} href="/search?sort=rating" />
      <MovieRow title="Ilmiy fantastika" movies={scifi} href="/search?genre=ilmiy-fantastika" />
      <MovieRow title="Drama" movies={drama} href="/search?genre=drama" />
      <MovieRow title="Animatsiya" movies={animation} href="/search?genre=animatsiya" />
    </>
  );
}
