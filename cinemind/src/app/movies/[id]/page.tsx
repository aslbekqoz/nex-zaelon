import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MovieRow } from "@/components/MovieCard";
import { Poster } from "@/components/Poster";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth/session";
import { getMovie, getSimilarMovies } from "@/lib/movies/repository";
import { ensureDetails } from "@/lib/movies/sync";
import { displayTitle } from "@/lib/movies/types";
import { setWatched, toggleWatchlist } from "@/lib/watchlist/actions";
import { getWatchlistStatus } from "@/lib/watchlist/repository";

type Props = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function formatRuntime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const movie = id ? await getMovie(id) : null;
  if (!movie) return { title: "Movie not found" };
  return {
    title: displayTitle(movie),
    description: (movie.overview || movie.overviewUz || "").slice(0, 160),
  };
}

export default async function MoviePage({ params }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();

  await ensureDetails(id);
  const [movie, similar, user] = await Promise.all([getMovie(id), getSimilarMovies(id), getCurrentUser()]);
  if (!movie) notFound();
  const status = user ? await getWatchlistStatus(user.id, movie.id) : { saved: false, watched: false };

  const title = displayTitle(movie);
  const overview = movie.overview;
  const showOriginal = movie.originalTitle && movie.originalTitle !== title;
  const path = `/movies/${movie.id}`;
  const trailerSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${movie.originalTitle || movie.title} ${movie.year ?? ""} trailer`,
  )}`;

  return (
    <>
      <section className="detail-hero">
        <div
          className="hero-bg"
          style={movie.backdropUrl ? { backgroundImage: `url(${movie.backdropUrl})` } : { background: "#11131a" }}
        />
        <div className="container detail-layout">
          <Poster movie={movie} showRating={false} eager />
          <div className="detail-info">
            <h1>{title}</h1>
            {showOriginal ? <div className="original">{movie.originalTitle}</div> : null}
            {movie.titleUz && movie.titleUz !== title ? (
              <div className="original">
                <span className="faint">Uzbek title:</span> <span lang="uz">{movie.titleUz}</span>
              </div>
            ) : null}

            <div className="meta-row">
              {movie.rating ? (
                <span className="rating" title={movie.voteCount ? `${movie.voteCount} votes` : undefined}>
                  ★ {movie.rating.toFixed(1)}
                </span>
              ) : null}
              {movie.year ? <span>{movie.year}</span> : null}
              {movie.runtime ? <span>{formatRuntime(movie.runtime)}</span> : null}
              {movie.originalLanguage ? <span>{movie.originalLanguage.toUpperCase()}</span> : null}
            </div>

            <div className="chips">
              {movie.genres.map((g) => (
                <Link key={g.id} href={`/search?genre=${g.slug}`} className="chip">
                  {g.name}
                </Link>
              ))}
            </div>

            {overview ? <p className="overview">{overview}</p> : null}
            {movie.overviewUz ? (
              <div className="overview-uz">
                <div className="eyebrow">In Uzbek</div>
                <p lang="uz">{movie.overviewUz}</p>
              </div>
            ) : null}
            {!overview && !movie.overviewUz ? <p className="overview muted">No synopsis yet.</p> : null}

            {movie.director ? (
              <dl className="facts">
                <dt>Director</dt>
                <dd>{movie.director}</dd>
              </dl>
            ) : null}

            <div className="actions">
              {movie.trailerKey ? (
                <a href="#trailer" className="btn btn-primary">
                  ▶ Watch trailer
                </a>
              ) : (
                <a href={trailerSearch} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  ▶ Find trailer on YouTube
                </a>
              )}
              {user ? (
                <>
                  <form action={toggleWatchlist}>
                    <input type="hidden" name="movieId" value={movie.id} />
                    <input type="hidden" name="path" value={path} />
                    <SubmitButton className="btn" pendingText="…">
                      {status.saved ? "✓ In watchlist" : "+ Add to watchlist"}
                    </SubmitButton>
                  </form>
                  {status.saved ? (
                    <form action={setWatched}>
                      <input type="hidden" name="movieId" value={movie.id} />
                      <input type="hidden" name="watched" value={status.watched ? "0" : "1"} />
                      <SubmitButton className="btn btn-ghost" pendingText="…">
                        {status.watched ? "Watched ✓" : "Mark as watched"}
                      </SubmitButton>
                    </form>
                  ) : null}
                </>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn">
                  + Add to watchlist
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {movie.trailerKey ? (
        <section className="section" id="trailer">
          <div className="container">
            <div className="section-head">
              <h2>Trailer</h2>
            </div>
            <div className="trailer">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(movie.trailerKey)}`}
                title={`${title} — trailer`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      ) : null}

      <MovieRow title="More like this" movies={similar} />
    </>
  );
}
