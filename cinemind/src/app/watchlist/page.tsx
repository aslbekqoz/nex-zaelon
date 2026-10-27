import type { Metadata } from "next";
import Link from "next/link";
import { Poster } from "@/components/Poster";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth/session";
import { displayTitle } from "@/lib/movies/types";
import { setWatched, toggleWatchlist } from "@/lib/watchlist/actions";
import { getWatchlist } from "@/lib/watchlist/repository";

export const metadata: Metadata = { title: "My watchlist" };

export default async function WatchlistPage() {
  const user = await requireUser("/watchlist");
  const items = await getWatchlist(user.id);
  const left = items.filter((i) => !i.watched).length;

  return (
    <div className="container">
      <div className="page-head">
        <h1>My watchlist</h1>
        <p className="muted">
          {items.length
            ? `${items.length} ${items.length === 1 ? "movie" : "movies"} · ${left} not watched yet`
            : "Save the movies you want to watch here."}
        </p>
      </div>

      {items.length ? (
        <div className="wl-list" style={{ marginTop: 16 }}>
          {items.map(({ movie, watched }) => (
            <div key={movie.id} className={`wl-item${watched ? " watched" : ""}`}>
              <Link href={`/movies/${movie.id}`}>
                <Poster movie={movie} showRating={false} />
              </Link>
              <div style={{ minWidth: 0 }}>
                <Link href={`/movies/${movie.id}`} className="card-title">
                  {displayTitle(movie)}
                </Link>
                <div className="card-sub">
                  {[movie.year, movie.genres.map((g) => g.name).slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="wl-actions">
                <form action={setWatched}>
                  <input type="hidden" name="movieId" value={movie.id} />
                  <input type="hidden" name="watched" value={watched ? "0" : "1"} />
                  <SubmitButton className="btn btn-sm" pendingText="…">
                    {watched ? "Mark as unwatched" : "Mark as watched ✓"}
                  </SubmitButton>
                </form>
                <form action={toggleWatchlist}>
                  <input type="hidden" name="movieId" value={movie.id} />
                  <input type="hidden" name="path" value="/watchlist" />
                  <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                    Remove
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 16 }}>
          <h2>Your watchlist is empty</h2>
          <p>Use the “Add to watchlist” button on any movie page.</p>
          <Link href="/search" className="btn btn-primary" style={{ marginTop: 12 }}>
            Browse movies
          </Link>
        </div>
      )}
    </div>
  );
}
