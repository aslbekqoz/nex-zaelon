import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MovieRow } from "@/components/MovieCard";
import { Backdrop } from "@/components/Backdrop";
import { PersonCard } from "@/components/PersonCard";
import { Poster } from "@/components/Poster";
import { RatingWidget } from "@/components/RatingWidget";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth/session";
import { getMovie, getMovieCredits, getSimilarMovies } from "@/lib/movies/repository";
import type { Credit } from "@/lib/movies/types";
import { ensureDetails } from "@/lib/movies/sync";
import { getUserRating } from "@/lib/ratings/repository";
import { displayTitle } from "@/lib/movies/types";
import { setWatched, toggleWatchlist } from "@/lib/watchlist/actions";
import { getWatchlistStatus } from "@/lib/watchlist/repository";

type Props = { params: Promise<{ id: string }> };

const JOB_LABELS: Record<string, string> = {
  "Original Music Composer": "Music",
  "Director of Photography": "Cinematography",
  Novel: "Based on the novel by",
  Story: "Story",
};

/** Crew grouped by job, in the order chosen at sync time (Director first). */
function groupCrew(crew: Credit[]) {
  const groups = new Map<string, Credit[]>();
  for (const c of crew) {
    const list = groups.get(c.role) ?? [];
    if (!list.some((p) => p.personId === c.personId)) list.push(c);
    groups.set(c.role, list);
  }
  return [...groups.entries()];
}

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
  const [movie, similar, user, credits] = await Promise.all([
    getMovie(id),
    getSimilarMovies(id),
    getCurrentUser(),
    getMovieCredits(id),
  ]);
  if (!movie) notFound();
  const [status, userRating] = user
    ? await Promise.all([getWatchlistStatus(user.id, movie.id), getUserRating(user.id, movie.id)])
    : [{ saved: false, watched: false }, null];

  const title = displayTitle(movie);
  const crewByJob = groupCrew(credits.crew);
  const overview = movie.overview;
  const showOriginal = movie.originalTitle && movie.originalTitle !== title;
  const path = `/movies/${movie.id}`;
  const trailerSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${movie.originalTitle || movie.title} ${movie.year ?? ""} trailer`,
  )}`;

  return (
    <>
      <section className="detail-hero">
        <Backdrop url={movie.backdropUrl} fallbackStyle={{ background: "#11131a" }} />
        <div className="container detail-layout">
          <Poster movie={movie} showRating={false} eager variant="detail" />
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

            {crewByJob.length ? (
              <dl className="facts">
                {crewByJob.map(([job, people]) => (
                  <div key={job} style={{ display: "contents" }}>
                    <dt>{JOB_LABELS[job] ?? job}</dt>
                    <dd>
                      {people.map((p, i) => (
                        <span key={p.personId}>
                          {i ? ", " : ""}
                          <Link href={`/people/${p.personId}`} className="link">
                            {p.name}
                          </Link>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : movie.director ? (
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
            {user ? <RatingWidget movieId={movie.id} rating={userRating} /> : null}
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

      {credits.cast.length ? (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Cast</h2>
            </div>
            <div className="row people-row">
              {credits.cast.map((c) => (
                <PersonCard key={`${c.personId}-${c.role}`} id={c.personId} name={c.name} profileUrl={c.profileUrl} role={c.role} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <MovieRow title="More like this" movies={similar} />
    </>
  );
}
