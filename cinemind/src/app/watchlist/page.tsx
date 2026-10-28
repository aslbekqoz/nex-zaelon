import type { Metadata } from "next";
import Link from "next/link";
import { Poster } from "@/components/Poster";
import { SubmitButton } from "@/components/SubmitButton";
import { requireVerifiedUser } from "@/lib/auth/session";
import { displayTitle } from "@/lib/movies/types";
import { setWatched, toggleWatchlist } from "@/lib/watchlist/actions";
import { getWatchlist } from "@/lib/watchlist/repository";
import { applyWatchlistView, countWatchlist, FILTERS, parseWatchlistParams, SORTS, type WatchlistFilter } from "@/lib/watchlist/view";

export const metadata: Metadata = { title: "My watchlist" };

type Props = { searchParams: Promise<{ show?: string; sort?: string }> };

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function WatchlistPage({ searchParams }: Props) {
  const user = await requireVerifiedUser("/watchlist");
  const all = await getWatchlist(user.id);
  const view = parseWatchlistParams(await searchParams);
  const items = applyWatchlistView(all, view);
  const counts = countWatchlist(all);
  const left = counts["to-watch"];
  const href = (show: WatchlistFilter) => {
    const params = new URLSearchParams({ ...(show !== "all" ? { show } : {}), ...(view.sort !== "added" ? { sort: view.sort } : {}) });
    return `/watchlist${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="container">
      <div className="page-head">
        <h1>My watchlist</h1>
        <p className="muted">
          {all.length
            ? `${all.length} ${all.length === 1 ? "movie" : "movies"} · ${left} not watched yet`
            : "Save the movies you want to watch here."}
          {all.length ? (
            <>
              {" · "}
              <Link href="/stats" className="link">
                My stats
              </Link>
            </>
          ) : null}
        </p>
      </div>

      {all.length ? (
        <div className="wl-toolbar">
          <nav className="chips" aria-label="Show">
            {(Object.keys(FILTERS) as WatchlistFilter[]).map((f) => (
              <Link key={f} href={href(f)} className={`chip${view.filter === f ? " active" : ""}`} aria-current={view.filter === f ? "page" : undefined}>
                {FILTERS[f]} <span className="chip-count">{counts[f]}</span>
              </Link>
            ))}
          </nav>
          <form className="wl-sort" action="/watchlist">
            {view.filter !== "all" ? <input type="hidden" name="show" value={view.filter} /> : null}
            <label htmlFor="wl-sort" className="faint">
              Sort
            </label>
            <select id="wl-sort" name="sort" className="select select-sm" defaultValue={view.sort}>
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="btn btn-sm">Apply</button>
            <a href="/watchlist/export" className="btn btn-sm btn-ghost" download>
              Export CSV
            </a>
          </form>
        </div>
      ) : null}

      {items.length ? (
        <div className="wl-list" style={{ marginTop: 16 }}>
          {items.map(({ movie, watched, addedAt, userRating }) => (
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
                <div className="card-sub">
                  Added {day(addedAt)}
                  {userRating ? (
                    <>
                      {" · "}
                      <span className="wl-mine">Your rating {userRating}/10</span>
                    </>
                  ) : null}
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
      ) : all.length ? (
        <div className="empty" style={{ marginTop: 16 }}>
          <h2>{view.filter === "watched" ? "Nothing marked as watched yet" : "You've watched everything on your list"}</h2>
          <p>
            <Link href={href("all")} className="link">
              Show all movies
            </Link>
          </p>
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
