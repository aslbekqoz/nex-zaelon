import type { Metadata } from "next";
import Link from "next/link";
import { requireVerifiedUser } from "@/lib/auth/session";
import { average, favouriteDecade, formatHours, ratingDistribution, topGenres } from "@/lib/stats/compute";
import { loadStatsSource } from "@/lib/stats/repository";

export const metadata: Metadata = { title: "My stats" };

export default async function StatsPage() {
  const user = await requireVerifiedUser("/stats");
  const { rated, watchlist, reviews } = await loadStatsSource(user.id);
  const ratings = rated.map((m) => m.rating);
  const avg = average(ratings);
  const distribution = ratingDistribution(ratings);
  const peak = Math.max(1, ...distribution.map((b) => b.count));
  const genres = topGenres(rated, { limit: 6 });
  const decade = favouriteDecade(rated);
  const hours = formatHours(watchlist.minutes);

  const cards = [
    { label: "Rated", value: ratings.length, sub: avg !== null ? `average ${avg.toFixed(1)}/10` : "no ratings yet" },
    { label: "Watched", value: watchlist.watched, sub: hours ? `about ${hours} of film` : `${watchlist.saved - watchlist.watched} still to watch` },
    { label: "On your watchlist", value: watchlist.saved, sub: `${watchlist.saved - watchlist.watched} not watched yet` },
    { label: "Reviews", value: reviews.reviews, sub: `${reviews.helpful} helpful vote${reviews.helpful === 1 ? "" : "s"} received` },
  ];

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <div className="page-head">
        <h1>My stats</h1>
        <p className="muted">How you watch and rate, from your ratings, watchlist and reviews.</p>
      </div>

      <div className="stat-grid stats-cards">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <span className="stat-label">{c.label}</span>
            <span className="stat-value">{c.value.toLocaleString("en-US")}</span>
            <span className="faint stat-sub">{c.sub}</span>
          </div>
        ))}
      </div>

      {ratings.length ? (
        <div className="stats-columns">
          <section className="card-panel">
            <h2>Your ratings</h2>
            <ol className="histogram" aria-label="How many movies you gave each rating">
              {[...distribution].reverse().map((b) => (
                <li key={b.rating}>
                  <span className="histogram-label">{b.rating}</span>
                  <span className="histogram-track" aria-hidden="true">
                    <span className="histogram-bar" style={{ width: `${(b.count / peak) * 100}%` }} />
                  </span>
                  <span className="histogram-count">
                    {b.count} <span className="sr-only">{b.count === 1 ? "movie" : "movies"} rated {b.rating}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="card-panel">
            <h2>Favourite genres</h2>
            <ul className="plain-list genre-stats">
              {genres.map((g) => (
                <li key={g.genre}>
                  <strong>{g.genre}</strong>
                  <span className="faint">
                    {g.count} rated · average {g.average.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
            {decade ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                You rate films from the <strong>{decade}</strong> most.
              </p>
            ) : null}
          </section>
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 16 }}>
          <h2>Rate a few movies to see your stats</h2>
          <p>Your ratings shape the charts here and your recommendations.</p>
          <Link href="/search" className="btn btn-primary" style={{ marginTop: 12 }}>
            Find movies to rate
          </Link>
        </div>
      )}
    </div>
  );
}
