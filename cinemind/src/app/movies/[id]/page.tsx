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
  return h ? `${h} soat ${m ? `${m} daqiqa` : ""}`.trim() : `${m} daqiqa`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const movie = id ? await getMovie(id) : null;
  if (!movie) return { title: "Film topilmadi" };
  return {
    title: displayTitle(movie),
    description: (movie.overviewUz || movie.overview || "").slice(0, 160),
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
  const overview = movie.overviewUz || movie.overview;
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

            <div className="meta-row">
              {movie.rating ? (
                <span className="rating" title={movie.voteCount ? `${movie.voteCount} ta ovoz` : undefined}>
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
                  {g.nameUz}
                </Link>
              ))}
            </div>

            {overview ? <p className="overview">{overview}</p> : <p className="overview muted">Tavsif hali qo&apos;shilmagan.</p>}
            {!movie.overviewUz && movie.overview ? (
              <p className="faint" style={{ fontSize: 14, marginTop: -8 }}>
                O&apos;zbekcha tavsif hali tayyorlanmagan — asl manbadagi matn ko&apos;rsatildi.
              </p>
            ) : null}

            {movie.director ? (
              <dl className="facts">
                <dt>Rejissyor</dt>
                <dd>{movie.director}</dd>
              </dl>
            ) : null}

            <div className="actions">
              {movie.trailerKey ? (
                <a href="#treyler" className="btn btn-primary">
                  ▶ Treylerni ko&apos;rish
                </a>
              ) : (
                <a href={trailerSearch} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  ▶ Treylerni YouTube&apos;da izlash
                </a>
              )}
              {user ? (
                <>
                  <form action={toggleWatchlist}>
                    <input type="hidden" name="movieId" value={movie.id} />
                    <input type="hidden" name="path" value={path} />
                    <SubmitButton className="btn" pendingText="…">
                      {status.saved ? "✓ Ro'yxatda" : "+ Ro'yxatga qo'shish"}
                    </SubmitButton>
                  </form>
                  {status.saved ? (
                    <form action={setWatched}>
                      <input type="hidden" name="movieId" value={movie.id} />
                      <input type="hidden" name="watched" value={status.watched ? "0" : "1"} />
                      <SubmitButton className="btn btn-ghost" pendingText="…">
                        {status.watched ? "Ko'rildi ✓" : "Ko'rdim deb belgilash"}
                      </SubmitButton>
                    </form>
                  ) : null}
                </>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn">
                  + Ro&apos;yxatga qo&apos;shish
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {movie.trailerKey ? (
        <section className="section" id="treyler">
          <div className="container">
            <div className="section-head">
              <h2>Treyler</h2>
            </div>
            <div className="trailer">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(movie.trailerKey)}`}
                title={`${title} — treyler`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      ) : null}

      <MovieRow title="O'xshash filmlar" movies={similar} />
    </>
  );
}
