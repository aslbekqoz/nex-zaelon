// Personal statistics from a user's ratings and watchlist. Pure, unit tested.

export type RatedMovie = { rating: number; year: number | null; runtime: number | null; genres: string[] };

export type GenreStat = { genre: string; count: number; average: number };

export function ratingDistribution(ratings: number[]) {
  const counts = Array.from({ length: 10 }, (_, i) => ({ rating: i + 1, count: 0 }));
  for (const r of ratings) if (r >= 1 && r <= 10) counts[Math.round(r) - 1].count++;
  return counts;
}

export function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Genres the user rated most, at least `min` films each, with their average rating. */
export function topGenres(movies: RatedMovie[], { limit = 5, min = 1 } = {}): GenreStat[] {
  const by = new Map<string, number[]>();
  for (const m of movies) for (const g of m.genres) by.set(g, [...(by.get(g) ?? []), m.rating]);
  return [...by.entries()]
    .filter(([, r]) => r.length >= min)
    .map(([genre, r]) => ({ genre, count: r.length, average: average(r)! }))
    .sort((a, b) => b.count - a.count || b.average - a.average || a.genre.localeCompare(b.genre))
    .slice(0, limit);
}

/** The decade with the most rated films, e.g. "1990s". */
export function favouriteDecade(movies: RatedMovie[]) {
  const by = new Map<number, number>();
  for (const m of movies) if (m.year) by.set(Math.floor(m.year / 10) * 10, (by.get(Math.floor(m.year / 10) * 10) ?? 0) + 1);
  const best = [...by.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  return best ? `${best[0]}s` : null;
}

/** Total runtime as "12 h 30 min" (null when unknown). */
export function formatHours(minutes: number) {
  if (minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}
